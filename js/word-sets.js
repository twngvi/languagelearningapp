import {
  STORES,
  addRecord,
  deleteRecord,
  getAllRecords,
  updateRecord,
} from './db.js';

export async function listWordSets() {
  return getAllRecords(STORES.wordSets);
}

export function createWordSet(input) {
  const name = String(input.name || '').trim();
  if (!name) throw new TypeError('Tên bộ từ là bắt buộc.');
  return {
    name,
    description: String(input.description || '').trim(),
    vocabularyIds: Array.isArray(input.vocabularyIds) ? [...new Set(input.vocabularyIds)] : [],
  };
}

export const saveWordSet = (input) => addRecord(STORES.wordSets, createWordSet(input));
export const editWordSet = (record) => updateRecord(STORES.wordSets, {
  ...record,
  ...createWordSet(record),
});

export async function removeWordSet(id) {
  const wordSet = await listWordSets().then((sets) => sets.find((set) => set.id === id));
  if (!wordSet) throw new Error('Không tìm thấy bộ từ cần xóa.');
  return deleteRecord(STORES.wordSets, id);
}

export async function addVocabularyToSet(setId, vocabularyId) {
  const sets = await listWordSets();
  const set = sets.find((item) => item.id === setId);
  if (!set) throw new Error('Không tìm thấy bộ từ.');
  return editWordSet({ ...set, vocabularyIds: [...new Set([...set.vocabularyIds, vocabularyId])] });
}

export async function removeVocabularyFromSet(setId, vocabularyId) {
  const sets = await listWordSets();
  const set = sets.find((item) => item.id === setId);
  if (!set) throw new Error('Không tìm thấy bộ từ.');
  return editWordSet({ ...set, vocabularyIds: set.vocabularyIds.filter((id) => id !== vocabularyId) });
}

export function parseBulkVocabulary(text) {
  return String(text || '').split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => text)
    .map(({ line, text }) => {
      const separator = text.match(/\s+-\s+/) || text.match(/\t+/);
      if (!separator) return { line, error: 'Thiếu dấu phân cách “ - ” hoặc tab.' };
      const separatorIndex = separator.index;
      const word = text.slice(0, separatorIndex).trim();
      const meaning = text.slice(separatorIndex + separator[0].length).trim();
      if (!word || !meaning) return { line, error: 'Từ và nghĩa không được để trống.' };
      return { line, data: { word, meaning } };
    });
}