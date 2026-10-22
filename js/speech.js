const defaultRate = 1;

export function isSpeechSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function getVoices() {
  return isSpeechSupported() ? window.speechSynthesis.getVoices() : [];
}

export function speakText(text, { voiceName = '', rate = defaultRate, lang = 'en-US' } = {}) {
  if (!isSpeechSupported()) {
    throw new Error('Trình duyệt này không hỗ trợ phát âm.');
  }
  const content = String(text || '').trim();
  if (!content) throw new TypeError('Không có nội dung để phát âm.');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = lang;
  utterance.rate = Math.min(2, Math.max(0.5, Number(rate) || defaultRate));
  const voice = getVoices().find((item) => item.name === voiceName);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function cancelSpeech() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

export function speakTextAndWait(text, options = {}) {
  const utterance = speakText(text, options);
  return new Promise((resolve, reject) => {
    utterance.onend = resolve;
    utterance.onerror = (event) => reject(new Error(`Không thể phát âm: ${event.error || 'unknown error'}.`));
  });
}

export function populateVoiceSelect(select) {
  if (!select || !isSpeechSupported()) return;
  const selected = select.value;
  select.innerHTML = '<option value="">Giọng mặc định</option>';
  getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      select.append(option);
    });
  select.value = selected;
}