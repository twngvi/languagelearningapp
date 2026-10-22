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

export function filterVocabulary(records, { query = '', wordSet = '', topic = '', favorite = false, difficult = false, due = false } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const searchable = vocabularyFields
      .map((field) => String(record[field] || '').toLocaleLowerCase())
      .join(' ');
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (!wordSet || (record.wordSetIds || []).includes(wordSet) || record.wordSet === wordSet)
      && (!topic || record.topic === topic)
      && (!favorite || record.favorite === true)
      && (!difficult || record.difficult === true)
      && (!due || record.dueForReview === true);
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
  if (response.status === 404) throw new Error('Không tìm thấy kết quả. Bạn vẫn có thể nhập nghĩa tiếng Việt thủ công.');
  if (!response.ok) throw new Error(`Nguồn tra cứu trả về lỗi HTTP ${response.status}.`);
  const entries = await response.json();
  const entry = entries[0];
  const definitions = (entry.meanings || []).flatMap((meaning) => (meaning.definitions || [])
    .slice(0, 2).map((definition) => `${meaning.partOfSpeech}: ${definition.definition}`));
  return {
    word: entry.word || normalizedWord,
    pronunciation: entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || '',
    definitions,
    example: entry.meanings?.flatMap((meaning) => meaning.definitions || []).find((item) => item.example)?.example || '',
    source: url,
  };
}

function populateFilter(select, values) {
  const currentValue = select.value;
  select.innerHTML = `<option value="">${select.dataset.vocabularyFilter === 'wordSet' ? 'Tất cả bộ từ' : 'Tất cả chủ đề'}</option>`;
  values.filter(Boolean).sort().forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = currentValue;
}

export async function initializeVocabularyPage() {
  const view = document.querySelector('#app-view');
  let records = [];
  let editingId = null;

  const list = view.querySelector('[data-vocabulary-list]');
  const form = view.querySelector('[data-vocabulary-form]');
  const bulkForm = view.querySelector('[data-bulk-form]');
  const setForm = view.querySelector('[data-set-form]');
  const setList = view.querySelector('[data-set-list]');
  let lookupController;
  const renderList = () => {
    if (!view.querySelector('[data-vocabulary-search]')) return;
    const filters = {
      query: view.querySelector('[data-vocabulary-search]').value,
      wordSet: view.querySelector('[data-vocabulary-filter="wordSet"]').value,
      topic: view.querySelector('[data-vocabulary-filter="topic"]').value,
      favorite: view.querySelector('[data-vocabulary-filter="favorite"]').checked,
      difficult: view.querySelector('[data-vocabulary-filter="difficult"]').checked,
      due: view.querySelector('[data-vocabulary-filter="due"]').checked,
    };
    const visibleRecords = filterVocabulary(records, filters);
    view.querySelector('[data-vocabulary-count]').textContent = visibleRecords.length;
    list.innerHTML = visibleRecords.length
      ? visibleRecords.map(vocabularyRow).join('')
      : '<p class="empty-state">Chưa có từ phù hợp. Hãy thêm một từ mới để bắt đầu.</p>';
  };

  const load = async () => {
    records = await listVocabulary();
    const sets = await listWordSets();
    populateFilter(view.querySelector('[data-vocabulary-filter="wordSet"]'), sets.map((set) => set.id));
    [...view.querySelector('[data-vocabulary-filter="wordSet"]').options].forEach((option) => {
      const set = sets.find((item) => item.id === option.value);
      if (set) option.textContent = set.name;
    });
    populateFilter(view.querySelector('[data-vocabulary-filter="topic"]'), [...new Set(records.map((record) => record.topic))]);
    setList.innerHTML = sets.length ? sets.map((set) => `
      <article class="word-set-card" data-set-id="${set.id}">
        <div><h3>${set.name}</h3><p>${set.description || 'Chưa có mô tả'} · ${set.vocabularyIds.length} từ</p><div class="set-members">${set.vocabularyIds.map((id) => { const member = records.find((item) => item.id === id); return member ? `<span>${member.word}<button data-set-action="remove-word" data-vocabulary-id="${id}" type="button" aria-label="Xóa ${member.word} khỏi bộ">×</button></span>` : ''; }).join('')}</div></div>
        <div class="row-actions"><button class="secondary-button" data-set-action="manage" type="button">Quản lý từ</button><button class="icon-action" data-set-action="edit" type="button">✎</button><button class="icon-action danger" data-set-action="delete" type="button">×</button></div>
      </article>`).join('') : '<p class="empty-state">Chưa có bộ từ nào.</p>';
    renderList();
  };

  const showForm = (record) => {
    editingId = record?.id || null;
    form.hidden = false;
    form.querySelector('[data-vocabulary-form-title]').textContent = editingId ? 'Chỉnh sửa từ' : 'Thêm từ mới';
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      if (element.type === 'checkbox') element.checked = Boolean(record?.[element.name]);
      else element.value = record?.[element.name] || '';
    });
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
    form.reset();
    form.hidden = true;
  };

  view.addEventListener('input', renderList);
  view.addEventListener('change', renderList);
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
        speakText(record.word, { rate: 1 });
      }
      if (action === 'lookup') {
        lookupController?.abort();
        lookupController = new AbortController();
        const result = await lookupEnglishWord(form.querySelector('[name="word"]').value, lookupController.signal);
        form.querySelector('[name="pronunciation"]').value = result.pronunciation;
        form.querySelector('[name="example"]').value ||= result.example;
        view.querySelector('[data-lookup-result]').innerHTML = `<strong>Kết quả tham khảo (English)</strong><p>${result.definitions.map((item) => item.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]))).join('<br>') || 'Không có định nghĩa hiển thị.'}</p><a href="${result.source}" target="_blank" rel="noreferrer">Xem nguồn từ điển ↗</a>`;
      }
      if (action === 'speak-form') {
        speakText(form.querySelector('[name="word"]').value, {
          voiceName: form.querySelector('[name="voice"]').value,
          rate: form.querySelector('[name="rate"]').value,
        });
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
        if (actionElement.dataset.setAction === 'remove-word') {
          await removeVocabularyFromSet(set.id, actionElement.dataset.vocabularyId);
          await load();
        }
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
    try {
      const duplicate = await findDuplicateVocabulary(input.word, editingId);
      if (duplicate && !await showConfirm(`Từ "${duplicate.word}" có thể đã tồn tại. Vẫn lưu bản ghi này?`, {
        title: 'Từ có thể bị trùng',
        confirmLabel: 'Vẫn lưu',
      })) return;
      if (editingId) await editVocabulary({ ...input, id: editingId });
      else await saveVocabulary(input);
      hideForm();
      await load();
    } catch (error) {
      console.error('Không thể lưu từ vựng:', error);
      await showAlert(`Không thể lưu từ vựng: ${error.message}`);
    }
  });

  await load();
}