import {
  STORES,
  addRecord,
  clearStore,
  getAllRecords,
  updateRecord,
} from './db.js';

export const BACKUP_VERSION = 1;
export const BACKUP_STORES = [
  STORES.vocabulary,
  STORES.sentences,
  STORES.wordSets,
  STORES.studySessions,
  STORES.settings,
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function collectBackup(stores = BACKUP_STORES) {
  const data = {};
  for (const storeName of stores) data[storeName] = await getAllRecords(storeName);
  return {
    format: 'personal-language-app-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    stores: data,
    exclusions: ['recordings'],
  };
}

export async function exportJson(stores = BACKUP_STORES) {
  const backup = await collectBackup(stores);
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `personal-language-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
  return backup;
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export async function exportVocabularyCsv() {
  const records = await getAllRecords(STORES.vocabulary);
  const fields = ['id', 'word', 'meaning', 'pronunciation', 'example', 'notes', 'topic', 'favorite', 'difficult', 'memorized'];
  const csv = [fields.join(','), ...records.map((record) => fields.map((field) => csvValue(record[field])).join(','))].join('\r\n');
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `vocabulary-${new Date().toISOString().slice(0, 10)}.csv`);
  return records.length;
}

export function validateBackup(input) {
  if (!input || input.format !== 'personal-language-app-backup' || input.version !== BACKUP_VERSION) {
    throw new Error('Tệp không đúng định dạng hoặc không tương thích với phiên bản ứng dụng này.');
  }
  if (!input.stores || typeof input.stores !== 'object') {
    throw new Error('Tệp sao lưu không có phần dữ liệu hợp lệ.');
  }
  for (const storeName of BACKUP_STORES) {
    if (input.stores[storeName] !== undefined && !Array.isArray(input.stores[storeName])) {
      throw new Error(`Dữ liệu kho "${storeName}" không hợp lệ.`);
    }
  }
  return input;
}

export function backupSummary(backup) {
  return BACKUP_STORES
    .map((storeName) => `${storeName}: ${(backup.stores[storeName] || []).length}`)
    .join(', ');
}

export async function importBackup(input, mode = 'merge') {
  const backup = validateBackup(input);
  if (!['merge', 'replace'].includes(mode)) throw new Error('Chế độ nhập dữ liệu không hợp lệ.');
  const stores = Object.entries(backup.stores).filter(([name, records]) => BACKUP_STORES.includes(name) && Array.isArray(records));
  for (const [storeName, records] of stores) {
    const ids = new Set();
    for (const record of records) {
      if (!record?.id) throw new Error(`Bản ghi trong kho "${storeName}" thiếu ID.`);
      if (ids.has(record.id)) throw new Error(`Tệp sao lưu có ID trùng trong kho "${storeName}".`);
      ids.add(record.id);
    }
  }
  const rollback = await collectBackup(stores.map(([storeName]) => storeName));
  try {
    if (mode === 'replace') {
      for (const [storeName] of stores) await clearStore(storeName);
    }
    let imported = 0;
    for (const [storeName, records] of stores) {
      const existing = new Set((await getAllRecords(storeName)).map((record) => record.id));
      for (const record of records) {
        if (mode === 'merge' && existing.has(record.id)) await updateRecord(storeName, record);
        else await addRecord(storeName, record);
        imported += 1;
      }
    }
    return { imported, summary: backupSummary(backup) };
  } catch (error) {
    for (const [storeName] of stores) {
      await clearStore(storeName);
      for (const record of rollback.stores[storeName] || []) await addRecord(storeName, record);
    }
    throw new Error(`Nhập dữ liệu thất bại và đã khôi phục dữ liệu trước đó: ${error.message}`);
  }
}

export function readBackupFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.json')) {
    return Promise.reject(new Error('Hãy chọn tệp JSON sao lưu hợp lệ.'));
  }
  return file.text().then((text) => validateBackup(JSON.parse(text)));
}
