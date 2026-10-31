import {
  STORES,
  addRecord,
  deleteRecord,
  getAllRecords,
  updateRecord,
} from './db.js';
import { vocabularyRow } from '../pages/vocabulary-page.js';
import { addVocabularyToSet, listWordSets, parseBulkVocabulary, removeVocabularyFromSet, removeWordSet, saveWordSet, editWordSet } from './word-sets.js';
import { populateVoiceSelect, speakText } from './speech.js';
import { showAlert, showConfirm, showPrompt } from './notifications.js';

export const vocabularyFields = ['word', 'meaning', 'pronunciation', 'example', 'notes'];

export async function listVocabulary() {
  const records = await getAllRecords(STORES.vocabulary);
  return records.sort((first, second) => first.word.localeCompare(second.word));
}

export async function initializeVocabularySetPage() {
  const view = document.querySelector('#app-view');
  const list = view.querySelector('[data-vocabulary-set-list]');
  const setId = list?.dataset.setId;
  if (!setId) throw new Error('Không xác định được bộ từ cần mở.');

  const [records, wordSets] = await Promise.all([listVocabulary(), listWordSets()]);
  const wordSet = wordSets.find((set) => set.id === setId);
  if (!wordSet) {
    view.querySelector('[data-vocabulary-set-title]').textContent = 'Không tìm thấy bộ từ';
    list.innerHTML = '<p class="empty-state">Bộ từ này không còn tồn tại.</p>';
    return;
  }

  const recordsById = new Map(records.map((record) => [record.id, record]));
  const setRecords = wordSet.vocabularyIds.map((id) => recordsById.get(id)).filter(Boolean);
  view.querySelector('[data-vocabulary-set-title]').textContent = wordSet.name;
  const actions = view.querySelector('[data-vocabulary-set-actions]');
  actions.hidden = false;
  const search = view.querySelector('[data-vocabulary-set-search]');
  const renderSetList = () => {
    const visibleRecords = filterVocabulary(setRecords, { query: search.value });
    view.querySelector('[data-vocabulary-set-count]').textContent = visibleRecords.length;
    list.innerHTML = visibleRecords.length
      ? visibleRecords.map(vocabularyRow).join('')
      : `<p class="empty-state">${setRecords.length ? 'Không tìm thấy từ phù hợp.' : 'Bộ từ này chưa có từ nào.'}</p>`;
  };
  search.addEventListener('input', renderSetList);
  renderSetList();

  view.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-set-detail-action]')?.dataset.setDetailAction;
    if (!action) return;
    try {
      if (action === 'bulk' || action === 'manage-sets' || action === 'new-word') {
        sessionStorage.setItem('vocabulary-action', action === 'bulk' ? 'bulk' : action === 'manage-sets' ? 'sets' : 'new');
        if (action === 'new-word') sessionStorage.setItem('vocabulary-action-set-id', wordSet.id);
        window.location.hash = '#vocabulary';
        return;
      }
      if (action === 'add-word' || action === 'manage') {
        const selected = await showPrompt(`Nhập ID từ muốn thêm vào "${wordSet.name}".`);
        if (selected) {
          const vocabulary = records.find((record) => record.id === selected.trim());
          if (!vocabulary) throw new Error('Không tìm thấy ID từ vựng này.');
          await addVocabularyToSet(wordSet.id, vocabulary.id);
          window.location.reload();
        }
      }
      if (action === 'edit') {
        const name = await showPrompt('Tên bộ từ mới:', { defaultValue: wordSet.name });
        if (!name) return;
        const description = await showPrompt('Mô tả bộ từ:', { defaultValue: wordSet.description || '' });
        await editWordSet({ ...wordSet, name, description: description || '' });
        window.location.reload();
      }
      if (action === 'delete' && await showConfirm(`Xóa bộ từ "${wordSet.name}"? Từ vựng sẽ vẫn được giữ lại.`, {
        title: 'Xóa bộ từ?',
        confirmLabel: 'Xóa bộ từ',
      })) {
        await removeWordSet(wordSet.id);
        window.location.hash = '#vocabulary';
      }
    } catch (error) {
      console.error('Không thể cập nhật bộ từ:', error);
      await showAlert(`Không thể cập nhật bộ từ: ${error.message}`);
    }
  });
}

export function filterVocabulary(records, { query = '' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const searchable = vocabularyFields
      .map((field) => String(record[field] || '').toLocaleLowerCase())
      .join(' ');
    return !normalizedQuery || searchable.includes(normalizedQuery);
  });
}

export function createVocabularyRecord(input) {
  const word = String(input.word || '').trim();
  const meaning = String(input.meaning || '').trim();
  if (!word || !meaning) {
    throw new TypeError('Từ tiếng Anh và nghĩa tiếng Việt là bắt buộc.');
  }

  return {
    word,
    meaning,
    pronunciation: String(input.pronunciation || '').trim(),
    example: String(input.example || '').trim(),
    notes: String(input.notes || '').trim(),
    wordSet: String(input.wordSet || '').trim(),
    wordSetIds: Array.isArray(input.wordSetIds) ? [...new Set(input.wordSetIds)] : [],
    topic: String(input.topic || '').trim(),
    favorite: Boolean(input.favorite),
    difficult: Boolean(input.difficult),
    dueForReview: Boolean(input.dueForReview),
    memorized: Boolean(input.memorized),
  };
}

export const saveVocabulary = (input) => addRecord(STORES.vocabulary, createVocabularyRecord(input));
export const editVocabulary = (record) => updateRecord(STORES.vocabulary, {
  ...record,
  ...createVocabularyRecord(record),
});
export const removeVocabulary = (id) => deleteRecord(STORES.vocabulary, id);

export async function findDuplicateVocabulary(word, excludeId = '') {
  const normalizedWord = String(word || '').trim().toLocaleLowerCase();
  if (!normalizedWord) return undefined;
  const records = await listVocabulary();
  return records.find((record) => record.id !== excludeId
    && record.word.trim().toLocaleLowerCase() === normalizedWord);
}

export async function lookupEnglishWord(word, signal) {
  const normalizedWord = String(word || '').trim();
  if (!normalizedWord) throw new TypeError('Hãy nhập từ tiếng Anh trước khi tra cứu.');
  if (!/^[a-zA-Z][a-zA-Z\s'-]*$/.test(normalizedWord)) {
    throw new Error('Nguồn tra cứu này chỉ hỗ trợ từ hoặc cụm từ tiếng Anh.');
  }
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (response.status === 404) {
    const pronunciation = await lookupFallbackPronunciation(normalizedWord, signal);
    if (pronunciation) return { word: normalizedWord, pronunciation, definitions: [], example: '', source: url };
    throw new Error('Không tìm thấy kết quả. Bạn vẫn có thể nhập nghĩa tiếng Việt thủ công.');
  }
  if (!response.ok) throw new Error(`Nguồn tra cứu trả về lỗi HTTP ${response.status}.`);
  const entries = await response.json();
  const entry = entries[0];
  const definitions = (entry.meanings || []).flatMap((meaning) => (meaning.definitions || [])
    .slice(0, 2).map((definition) => `${meaning.partOfSpeech}: ${definition.definition}`));
  const pronunciation = entry.phonetic
    || entry.phonetics?.find((item) => item.text)?.text
    || entry.meanings?.flatMap((meaning) => meaning.definitions || []).find((item) => item.phonetic)?.phonetic
    || await lookupFallbackPronunciation(normalizedWord, signal);
  return {
    word: entry.word || normalizedWord,
    pronunciation,
    definitions,
    example: entry.meanings?.flatMap((meaning) => meaning.definitions || []).find((item) => item.example)?.example || '',
    source: url,
  };
}

const phonemeMap = {
  AA: 'ɑ', AE: 'æ', AH: 'ə', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', EH: 'ɛ', ER: 'ər', EY: 'eɪ',
  F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'iː', JH: 'dʒ', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p',
  R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', UH: 'ʊ', UW: 'uː',
  V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

function arpabetToIpa(value) {
  const tokens = String(value || '').trim().split(/\s+/);
  let pronunciation = '';
  tokens.forEach((token) => {
    const stress = token.slice(-1);
    const phoneme = token.replace(/[012]$/, '');
    if (stress === '1') pronunciation += 'ˈ';
    pronunciation += phonemeMap[phoneme] || '';
  });
  return pronunciation ? `/${pronunciation}/` : '';
}

async function lookupFallbackPronunciation(word, signal) {
  const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=r&max=1`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return '';
  const result = await response.json();
  const pronunciationTag = result[0]?.tags?.find((tag) => tag.startsWith('pron:'));
  return arpabetToIpa(pronunciationTag?.slice(5));
}

export async function translateEnglishWord(word, signal) {
  return translateText(word, 'en|vi', signal);
}

export async function translateVietnameseWord(text, signal) {
  return translateText(text, 'vi|en', signal);
}

async function translateText(text, languagePair, signal) {
  const normalizedText = String(text || '')
    .trim()
    .replace(/^[.,!?;:]+|[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ');
  if (!normalizedText) throw new TypeError('Hãy nhập nội dung trước khi dịch.');
  if (languagePair === 'en|vi' && !/^[a-zA-Z][a-zA-Z0-9\s'’.,!?;:()\-/"“”‘’]*$/.test(normalizedText)) {
    throw new Error('Chỉ hỗ trợ từ hoặc câu tiếng Anh.');
  }
  const [sourceLanguage, targetLanguage] = languagePair.split('|');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(normalizedText)}`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Nguồn dịch trả về lỗi HTTP ${response.status}.`);
  const result = await response.json();
  const translation = Array.isArray(result[0])
    ? result[0].map((part) => part?.[0] || '').join('').trim()
    : '';
  if (!translation) throw new Error('Không tìm thấy bản dịch phù hợp.');
  return translation.replace(/^[.,!?;:]+|[.,!?;:]+$/g, '').trim();
}

export async function initializeVocabularyPage() {
  const view = document.querySelector('#app-view');
  let records = [];
  let wordSets = [];
  let editingId = null;

  const form = view.querySelector('[data-vocabulary-form]');
  const bulkForm = view.querySelector('[data-bulk-form]');
  const setForm = view.querySelector('[data-set-form]');
  const setList = view.querySelector('[data-set-list]');
  let lookupController;
  let translationController;
  let translationTimer;
  let pronunciationController;
  let pronunciationTimer;
  let lastAutoMeaning = '';
  let lastAutoPronunciation = '';
  let translationDirection = 'en-vi';
  let selectedWordSetIds = [];
  const load = async () => {
    records = await listVocabulary();
    wordSets = await listWordSets();
    renderWordSetPicker();
    setList.innerHTML = wordSets.length ? wordSets.map((set) => `
      <article class="word-set-card" data-set-id="${set.id}">
        <div class="word-set-card-content" data-set-open><h3>${set.name}</h3><p>${set.description || 'Chưa có mô tả'} · ${set.vocabularyIds.length} từ</p><div class="set-members">${set.vocabularyIds.map((id) => { const member = records.find((item) => item.id === id); return member ? `<span>${member.word}<button class="delete-image-button" data-set-action="remove-word" data-vocabulary-id="${id}" type="button" aria-label="Xóa ${member.word} khỏi bộ"><img src="image/nút xóa.png" alt=""></button></span>` : ''; }).join('')}</div></div>
        <div class="row-actions"><button class="secondary-button" data-set-action="add-word" type="button">+ Thêm từ</button><button class="secondary-button" data-set-action="manage" type="button">Quản lý từ</button><button class="icon-action edit-image-button" data-set-action="edit" type="button" aria-label="Chỉnh sửa bộ từ"><img src="image/Shinam.png" alt=""></button><button class="icon-action delete-image-button" data-set-action="delete" type="button" aria-label="Xóa bộ từ"><img src="image/nút xóa.png" alt=""></button></div>
      </article>`).join('') : '<p class="empty-state">Chưa có bộ từ nào.</p>';
  };

  const renderWordSetPicker = () => {
    const picker = form.querySelector('[data-word-set-picker]');
    const options = picker.querySelector('[data-word-set-options]');
    const query = picker.querySelector('[data-word-set-search]').value.trim().toLocaleLowerCase();
    const selectedSets = wordSets.filter((set) => selectedWordSetIds.includes(set.id));
    const visibleSets = wordSets
      .filter((set) => !query || set.name.toLocaleLowerCase().includes(query))
      .sort((first, second) => first.name.localeCompare(second.name));
    options.innerHTML = visibleSets.length
      ? visibleSets.map((set) => `<label class="word-set-option"><span>${set.name}</span><input type="checkbox" data-word-set-option="${set.id}" ${selectedWordSetIds.includes(set.id) ? 'checked' : ''}></label>`).join('')
      : '<p class="word-set-picker-empty">Không tìm thấy bộ từ.</p>';
    picker.querySelector('[data-word-set-toggle]').textContent = selectedSets.length
      ? selectedSets.map((set) => set.name).join(', ')
      : 'Chọn bộ từ';
    form.querySelector('[name="wordSet"]').value = selectedSets[0]?.name || '';
    form.querySelector('[name="wordSetIds"]').value = selectedWordSetIds.join(',');
  };

  const ensureWordSet = async (name) => {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) return null;
    const existing = wordSets.find((set) => set.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
    if (existing) return existing;
    const created = await saveWordSet({ name: normalizedName });
    wordSets = [...wordSets, created];
    return created;
  };

  const showForm = (record) => {
    editingId = record?.id || null;
    translationDirection = 'en-vi';
    lastAutoMeaning = '';
    lastAutoPronunciation = record?.pronunciation || '';
    form.hidden = false;
    form.querySelector('[data-word-label]').textContent = 'Từ tiếng Anh *';
    form.querySelector('[data-meaning-label]').textContent = 'Nghĩa tiếng Việt *';
    form.querySelector('[data-vocabulary-form-title]').textContent = editingId ? 'Chỉnh sửa từ' : 'Thêm từ mới';
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      if (element.type === 'checkbox') element.checked = Boolean(record?.[element.name]);
      else element.value = record?.[element.name] || '';
    });
    selectedWordSetIds = record?.wordSetIds?.length
      ? [...record.wordSetIds]
      : wordSets.filter((set) => set.name === record?.wordSet).map((set) => set.id);
    renderWordSetPicker();
    form.querySelector('[name="word"]').focus();
    populateVoiceSelect(form.querySelector('[name="voice"]'));
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        populateVoiceSelect(form.querySelector('[name="voice"]'));
      }, { once: true });
    }
  };

  const hideForm = () => {
    editingId = null;
    translationDirection = 'en-vi';
    translationController?.abort();
    pronunciationController?.abort();
    clearTimeout(translationTimer);
    clearTimeout(pronunciationTimer);
    lastAutoMeaning = '';
    lastAutoPronunciation = '';
    selectedWordSetIds = [];
    form.reset();
    form.querySelector('[data-word-label]').textContent = 'Từ tiếng Anh *';
    form.querySelector('[data-meaning-label]').textContent = 'Nghĩa tiếng Việt *';
    form.hidden = true;
  };

  form.querySelector('[data-vocabulary-action="swap-language"]').addEventListener('click', () => {
    const wordInput = form.querySelector('[name="word"]');
    const meaningInput = form.querySelector('[name="meaning"]');
    [wordInput.value, meaningInput.value] = [meaningInput.value, ''];
    translationDirection = translationDirection === 'en-vi' ? 'vi-en' : 'en-vi';
    lastAutoMeaning = '';
    lastAutoPronunciation = '';
    form.querySelector('[data-word-label]').textContent = translationDirection === 'en-vi' ? 'Từ tiếng Anh *' : 'Từ tiếng Việt *';
    form.querySelector('[data-meaning-label]').textContent = translationDirection === 'en-vi' ? 'Nghĩa tiếng Việt *' : 'Từ tiếng Anh *';
    wordInput.placeholder = translationDirection === 'en-vi' ? '' : 'Ví dụ: xin chào';
    meaningInput.placeholder = translationDirection === 'en-vi' ? '' : 'Ví dụ: hello';
    wordInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const wordSetPicker = form.querySelector('[data-word-set-picker]');
  wordSetPicker.querySelector('[data-word-set-toggle]').addEventListener('click', () => {
    const menu = wordSetPicker.querySelector('[data-word-set-menu]');
    menu.hidden = !menu.hidden;
    if (!menu.hidden) wordSetPicker.querySelector('[data-word-set-search]').focus();
  });
  wordSetPicker.querySelector('[data-word-set-search]').addEventListener('input', renderWordSetPicker);
  wordSetPicker.addEventListener('change', (event) => {
    const option = event.target.closest('[data-word-set-option]');
    if (!option) return;
    selectedWordSetIds = [...wordSetPicker.querySelectorAll('[data-word-set-option]:checked')].map((input) => input.dataset.wordSetOption);
    renderWordSetPicker();
  });
  wordSetPicker.querySelector('[data-word-set-create]').addEventListener('click', async () => {
    const input = wordSetPicker.querySelector('[data-word-set-new]');
    if (!input.value.trim()) return;
    try {
      const set = await ensureWordSet(input.value);
      selectedWordSetIds = [...new Set([...selectedWordSetIds, set.id])];
      input.value = '';
      renderWordSetPicker();
    } catch (error) {
      console.error('Không thể tạo bộ từ mới:', error);
      await showAlert(`Không thể tạo bộ từ mới: ${error.message}`);
    }
  });
  form.querySelector('[name="word"]').addEventListener('input', () => {
    const wordInput = form.querySelector('[name="word"]');
    const meaningInput = form.querySelector('[name="meaning"]');
    const lookupResult = view.querySelector('[data-lookup-result]');
    const word = wordInput.value.trim();
    updatePronunciation();

    clearTimeout(translationTimer);
    translationController?.abort();
    if (!word) {
      if (meaningInput.value === lastAutoMeaning) meaningInput.value = '';
      lastAutoMeaning = '';
      if (lookupResult.dataset.lookupType === 'translation') lookupResult.textContent = '';
      return;
    }
    if (meaningInput.value && meaningInput.value !== lastAutoMeaning) return;

    translationTimer = setTimeout(async () => {
      translationController = new AbortController();
      lookupResult.dataset.lookupType = 'translation';
      lookupResult.className = 'lookup-result is-loading';
      lookupResult.textContent = 'Đang gợi ý nghĩa tiếng Việt...';
      try {
        const translation = translationDirection === 'en-vi'
          ? await translateEnglishWord(word, translationController.signal)
          : await translateVietnameseWord(word, translationController.signal);
        if (wordInput.value.trim() !== word) return;
        const canApplyTranslation = !meaningInput.value || meaningInput.value === lastAutoMeaning;
        if (canApplyTranslation) {
          meaningInput.value = translation;
          lastAutoMeaning = translation;
          if (translationDirection === 'vi-en') updatePronunciation();
        }
        lookupResult.className = 'lookup-result is-success';
        lookupResult.textContent = canApplyTranslation
          ? `Đã tự động điền nghĩa: ${translation}`
          : `Gợi ý tham khảo: ${translation}`;
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Không thể tự động dịch từ vựng:', error);
        lookupResult.className = 'lookup-result is-error';
        lookupResult.textContent = `Chưa thể tự động gợi ý nghĩa: ${error.message}`;
      }
    }, 500);
  });
  form.querySelector('[name="meaning"]').addEventListener('input', (event) => {
    if (event.target.value !== lastAutoMeaning) lastAutoMeaning = '';
    if (translationDirection === 'vi-en') updatePronunciation();
  });
  const updatePronunciation = () => {
    const wordInput = form.querySelector('[name="word"]');
    const meaningInput = form.querySelector('[name="meaning"]');
    const pronunciationInput = form.querySelector('[name="pronunciation"]');
    const englishInput = translationDirection === 'en-vi' ? wordInput : meaningInput;
    const englishText = englishInput.value.trim().replace(/[.,!?;:]+$/g, '').trim();

    clearTimeout(pronunciationTimer);
    pronunciationController?.abort();
    if (!englishText) {
      if (pronunciationInput.value === lastAutoPronunciation) pronunciationInput.value = '';
      lastAutoPronunciation = '';
      return;
    }
    if (pronunciationInput.value && pronunciationInput.value !== lastAutoPronunciation) return;

    pronunciationTimer = setTimeout(async () => {
      pronunciationController = new AbortController();
      try {
        const result = await lookupEnglishWord(englishText, pronunciationController.signal);
        const currentEnglishText = englishInput.value.trim().replace(/[.,!?;:]+$/g, '').trim();
        if (currentEnglishText !== englishText || !result.pronunciation) return;
        const canApplyPronunciation = !pronunciationInput.value
          || pronunciationInput.value === lastAutoPronunciation;
        if (canApplyPronunciation) {
          pronunciationInput.value = result.pronunciation;
          lastAutoPronunciation = result.pronunciation;
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.info('Chưa thể tự động điền phiên âm:', error.message);
        }
      }
    }, 650);
  };
  form.querySelector('[name="word"]').addEventListener('input', updatePronunciation);
  form.querySelector('[name="meaning"]').addEventListener('input', updatePronunciation);
  form.querySelector('[name="pronunciation"]').addEventListener('input', (event) => {
    if (event.target.value !== lastAutoPronunciation) lastAutoPronunciation = '';
  });
  view.addEventListener('click', async (event) => {
    const actionElement = event.target.closest('[data-vocabulary-action]');
    if (!actionElement) return;
    const action = actionElement.dataset.vocabularyAction;
    const row = actionElement.closest('[data-vocabulary-id]');
    const record = row ? records.find((item) => item.id === row.dataset.vocabularyId) : null;

    try {
      if (action === 'new') showForm();
      if (action === 'cancel') hideForm();
      if (action === 'edit' && record) showForm(record);
      if (action === 'favorite' && record) {
        await editVocabulary({ ...record, favorite: !record.favorite });
        await load();
      }
      if (action === 'delete' && record) {
        const confirmed = await showConfirm(`Xóa từ "${record.word}"? Dữ liệu học liên quan có thể không được khôi phục.`, {
          title: 'Xóa từ vựng?',
          confirmLabel: 'Xóa từ',
        });
        if (confirmed) {
          await removeVocabulary(record.id);
          await load();
        }
      }
      if (action === 'speak' && record && 'speechSynthesis' in window) {
        speakText(record.word);
      }
      if (action === 'lookup') {
        const lookupResult = view.querySelector('[data-lookup-result]');
        try {
          lookupController?.abort();
          lookupController = new AbortController();
          const lookupWord = translationDirection === 'en-vi'
            ? form.querySelector('[name="word"]').value
            : form.querySelector('[name="meaning"]').value;
          const result = await lookupEnglishWord(lookupWord, lookupController.signal);
          form.querySelector('[name="pronunciation"]').value = result.pronunciation;
          form.querySelector('[name="example"]').value ||= result.example;
          lookupResult.className = 'lookup-result is-success';
          lookupResult.innerHTML = `<strong>Kết quả tham khảo (English)</strong><p>${result.definitions.map((item) => item.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]))).join('<br>') || 'Không có định nghĩa hiển thị.'}</p>`;
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.error('Không thể tra cứu từ vựng:', error);
          lookupResult.className = 'lookup-result is-error';
          lookupResult.textContent = `Chưa tra được nghĩa lúc này: ${error.message}`;
        }
        return;
      }
      if (action === 'speak-form') {
        try {
          const speechText = translationDirection === 'en-vi'
            ? form.querySelector('[name="word"]').value
            : form.querySelector('[name="meaning"]').value;
          speakText(speechText, {
            voiceName: form.querySelector('[name="voice"]').value,
            rate: form.querySelector('[name="rate"]').value,
          });
        } catch (error) {
          console.error('Không thể phát âm từ vựng:', error);
          const lookupResult = view.querySelector('[data-lookup-result]');
          lookupResult.className = 'lookup-result is-error';
          lookupResult.textContent = `Chưa thể phát âm: ${error.message}`;
        }
        return;
      }
      if (action === 'bulk') bulkForm.hidden = false;
      if (action === 'sets') setForm.hidden = false;
      if (action === 'cancel-bulk') bulkForm.hidden = true;
      if (action === 'cancel-set') {
        setForm.reset();
        setForm.hidden = true;
      }
    } catch (error) {
      console.error('Không thể cập nhật kho từ vựng:', error);
      await showAlert(`Không thể cập nhật từ vựng: ${error.message}`);
    }
  });

  view.addEventListener('click', async (event) => {
    const setOpenTarget = event.target.closest('[data-set-open]');
    if (setOpenTarget && !event.target.closest('[data-set-action]')) {
      window.location.hash = `#vocabulary-set/${setOpenTarget.closest('[data-set-id]').dataset.setId}`;
      return;
    }
    const actionElement = event.target.closest('[data-set-action]');
    if (!actionElement) return;
    const setCard = actionElement.closest('[data-set-id]');
    const sets = await listWordSets();
    const set = sets.find((item) => item.id === setCard.dataset.setId);
    try {
      if (actionElement.dataset.setAction === 'edit') {
        setForm.hidden = false;
        setForm.querySelector('[name="id"]').value = set.id;
        setForm.querySelector('[name="name"]').value = set.name;
        setForm.querySelector('[name="description"]').value = set.description;
      }
      if (actionElement.dataset.setAction === 'delete' && await showConfirm(`Xóa bộ từ "${set.name}"? Từ vựng sẽ vẫn được giữ lại.`, {
        title: 'Xóa bộ từ?',
        confirmLabel: 'Xóa bộ từ',
      })) {
        await removeWordSet(set.id);
        await load();
      }
      if (actionElement.dataset.setAction === 'manage') {
        const selected = await showPrompt(`Nhập ID từ muốn thêm vào "${set.name}". Bạn có thể dùng cùng một ID cho nhiều bộ.`);
        if (selected) {
          const vocabulary = records.find((record) => record.id === selected.trim());
          if (!vocabulary) throw new Error('Không tìm thấy ID từ vựng này.');
          await addVocabularyToSet(set.id, vocabulary.id);
          await load();
        }
      }
      if (actionElement.dataset.setAction === 'add-word') {
        showForm();
        selectedWordSetIds = [set.id];
        renderWordSetPicker();
      }
      if (actionElement.dataset.setAction === 'remove-word') {
        await removeVocabularyFromSet(set.id, actionElement.dataset.vocabularyId);
        await load();
      }
    } catch (error) {
      console.error('Không thể cập nhật bộ từ:', error);
      await showAlert(`Không thể cập nhật bộ từ: ${error.message}`);
    }
  });

  bulkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const preview = parseBulkVocabulary(new FormData(bulkForm).get('bulkText'));
    const valid = preview.filter((item) => item.data);
    const invalid = preview.filter((item) => item.error);
    const duplicates = valid.filter((item) => records.some((record) => record.word.toLocaleLowerCase() === item.data.word.toLocaleLowerCase()));
    if (invalid.length) return showAlert(`Dòng không hợp lệ: ${invalid.map((item) => item.line).join(', ')}`, {
      title: 'Chưa thể nhập dữ liệu',
    });
    const previewText = valid.map((item) => `${item.data.word} - ${item.data.meaning}`).join('\n');
    if (!await showConfirm(`Xem trước ${valid.length} từ:\n\n${previewText}${duplicates.length ? `\n\nCảnh báo: ${duplicates.length} từ có thể đã tồn tại.` : ''}\n\nLưu các từ này?`, {
      title: 'Xác nhận nhập từ vựng',
      confirmLabel: 'Lưu dữ liệu',
    })) return;
    for (const item of valid) await saveVocabulary(item.data);
    bulkForm.reset();
    bulkForm.hidden = true;
    await load();
  });

  setForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(setForm).entries());
    if (input.id) await editWordSet({ ...input, id: input.id });
    else await saveWordSet(input);
    setForm.reset();
    setForm.hidden = true;
    await load();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = Object.fromEntries([...form.elements]
      .filter((element) => element.name)
      .map((element) => [element.name, element.type === 'checkbox' ? element.checked : element.value]));
    if (translationDirection === 'vi-en') {
    [input.word, input.meaning] = [input.meaning, input.word];
    }
    try {
      input.wordSetIds = input.wordSetIds
        ? input.wordSetIds.split(',').filter(Boolean)
        : [];
      input.wordSet = wordSets.find((set) => set.id === input.wordSetIds[0])?.name || '';
      const duplicate = await findDuplicateVocabulary(input.word, editingId);
      if (duplicate && !await showConfirm(`Từ "${duplicate.word}" có thể đã tồn tại. Vẫn lưu bản ghi này?`, {
        title: 'Từ có thể bị trùng',
        confirmLabel: 'Vẫn lưu',
      })) return;
      const savedRecord = editingId
        ? await editVocabulary({ ...input, id: editingId })
        : await saveVocabulary(input);
      const selectedSetIds = input.wordSetIds;
      const sets = await listWordSets();
      for (const set of sets) {
        if ((set.vocabularyIds || []).includes(savedRecord.id) && !selectedSetIds.includes(set.id)) {
          await removeVocabularyFromSet(set.id, savedRecord.id);
        }
      }
      for (const setId of selectedSetIds) await addVocabularyToSet(setId, savedRecord.id);
      hideForm();
      await load();
    } catch (error) {
      console.error('Không thể lưu từ vựng:', error);
      await showAlert(`Không thể lưu từ vựng: ${error.message}`);
    }
  });

  await load();

  const pendingAction = sessionStorage.getItem('vocabulary-action');
  if (pendingAction) {
    sessionStorage.removeItem('vocabulary-action');
    if (pendingAction === 'bulk') bulkForm.hidden = false;
    if (pendingAction === 'sets') setForm.hidden = false;
    if (pendingAction === 'new') {
      const setId = sessionStorage.getItem('vocabulary-action-set-id');
      sessionStorage.removeItem('vocabulary-action-set-id');
      showForm();
      if (setId && wordSets.some((set) => set.id === setId)) {
        selectedWordSetIds = [setId];
        renderWordSetPicker();
      }
    }
  }
}