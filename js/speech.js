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

function getVoiceScore(voice) {
  const name = voice.name;
  if (/microsoft.*(aria|jenny|sara|guy|ryan)/i.test(name)) return 4;
  if (/google.*(us english|uk english|english)/i.test(name)) return 3;
  if (/samantha|ava|karen|daniel/i.test(name)) return 2;
  if (/natural|enhanced|premium/i.test(name)) return 1;
  return 0;
}

function getPreferredVoice(voices, lang) {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  return [...englishVoices].sort((first, second) => getVoiceScore(second) - getVoiceScore(first))[0];
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
  const selectedVoiceName = String(voiceName || '').trim() || preferences.voiceName;
  const selectedRate = rate === undefined ? preferences.rate : rate;
  utterance.rate = Math.min(2, Math.max(0.5, Number(selectedRate) || defaultRate));
  const voices = getVoices();
  const voice = voices.find((item) => item.name === selectedVoiceName) || (!selectedVoiceName ? getPreferredVoice(voices, lang) : null);
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
    .sort((first, second) => getVoiceScore(second) - getVoiceScore(first))
    .forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      select.append(option);
    });
  select.value = selected;
}