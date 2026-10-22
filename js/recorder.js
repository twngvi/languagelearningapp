export function isRecorderSupported() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia
      && globalThis.MediaRecorder,
  );
}

function chooseMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    .find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

export class VoiceRecorder {
  constructor({ onStateChange = () => {}, onError = () => {} } = {}) {
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.blob = null;
    this.url = '';
    this.discardRequested = false;
  }

  get state() {
    return this.mediaRecorder?.state || 'inactive';
  }

  async start() {
    if (!isRecorderSupported()) {
      throw new Error('Trình duyệt hoặc môi trường hiện tại không hỗ trợ ghi âm. Hãy dùng HTTPS hoặc localhost.');
    }
    if (this.state === 'recording') return;
    this.release();
    this.discardRequested = false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = chooseMimeType();
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);
      this.chunks = [];
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size) this.chunks.push(event.data);
      });
      this.mediaRecorder.addEventListener('stop', () => {
        if (this.discardRequested) {
          this.releaseStream();
          this.mediaRecorder = null;
          this.chunks = [];
          this.discardRequested = false;
          this.onStateChange('inactive');
          return;
        }
        const type = this.mediaRecorder.mimeType || 'audio/webm';
        this.blob = new Blob(this.chunks, { type });
        this.url = URL.createObjectURL(this.blob);
        this.releaseStream();
        this.onStateChange('ready');
      }, { once: true });
      this.mediaRecorder.start();
      this.onStateChange('recording');
    } catch (error) {
      this.release();
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        throw new Error('Bạn đã từ chối quyền micro hoặc trang hiện tại không được phép truy cập micro.');
      }
      throw new Error(`Không thể bắt đầu ghi âm: ${error.message}`);
    }
  }

  stop() {
    if (this.state !== 'recording') return;
    this.mediaRecorder.stop();
    this.onStateChange('processing');
  }

  discard() {
    this.discardRequested = true;
    this.release();
    this.blob = null;
    this.chunks = [];
    this.onStateChange('inactive');
  }

  release() {
    if (this.state === 'recording') this.mediaRecorder.stop();
    this.releaseStream();
    if (this.url) URL.revokeObjectURL(this.url);
    this.mediaRecorder = null;
    this.url = '';
  }

  releaseStream() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
