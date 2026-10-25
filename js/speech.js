const defaultRate = 1;
const SPEECH_PREFERENCES_KEY = 'shin-speech-preferences';

export function getSpeechPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(SPEECH_PREFERENCES_KEY) || '{}');
    return {
      voiceName: typeof saved.voiceName === 'string' ? saved.voiceName : '',
      rate: Math.min(2, Math.max(0.5, Number(saved.rate) || defaultRate)),
    };
  } catch (error) {
    console.warn('Không thể đọc cài đặt giọng đọc:', error);
    return { voiceName: '', rate: defaultRate };
  }
}

export function saveSpeechPreferences(preferences) {
  const value = {
    voiceName: String(preferences.voiceName || ''),
    rate: Math.min(2, Math.max(0.5, Number(preferences.rate) || defaultRate)),
  };
  localStorage.setItem(SPEECH_PREFERENCES_KEY, JSON.stringify(value));
  return value;
}

export function isSpeechSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function getVoices() {
  return isSpeechSupported() ? window.speechSynthesis.getVoices() : [];
}

export function speakText(text, { voiceName, rate, lang = 'en-US' } = {}) {
  if (!isSpeechSupported()) {
    throw new Error('Trình duyệt này không hỗ trợ phát âm.');
  }
  const content = String(text || '').trim();
  if (!content) throw new TypeError('Không có nội dung để phát âm.');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = lang;
  const preferences = getSpeechPreferences();
  const selectedVoiceName = voiceName === undefined ? preferences.voiceName : voiceName;
  const selectedRate = rate === undefined ? preferences.rate : rate;
  utterance.rate = Math.min(2, Math.max(0.5, Number(selectedRate) || defaultRate));
  const voice = getVoices().find((item) => item.name === selectedVoiceName);
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