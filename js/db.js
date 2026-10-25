export const DB_NAME = 'personal-language-app';
export const DB_VERSION = 1;

export const STORES = Object.freeze({
  vocabulary: 'vocabulary',
  sentences: 'sentences',
  wordSets: 'wordSets',
  studySessions: 'studySessions',
  recordings: 'recordings',
  settings: 'settings',
});

let queueRecordSync;
import('./sync.js').then((module) => {
  queueRecordSync = module.queueRecordSync;
}).catch((error) => {
  console.error('Không thể tải bộ đồng bộ Supabase:', error);
});

const storeNames = new Set(Object.values(STORES));
let databasePromise;

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateStoreName(storeName) {
  if (!storeNames.has(storeName)) {
    throw new Error(`Unknown IndexedDB store: ${storeName}`);
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionResult(transaction, request) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
  });
}

function databaseError(error, operation, storeName) {
  const message = `IndexedDB ${operation} failed for "${storeName}".`;
  const wrappedError = new Error(message, { cause: error });
  wrappedError.name = 'DatabaseError';
  return wrappedError;
}

export function openDatabase() {
  if (databasePromise) {
    return databasePromise;
  }

  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('IndexedDB is not supported by this browser.'));
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      Object.values(STORES).forEach((storeName) => {
        if (database.objectStoreNames.contains(storeName)) {
          return;
        }

        const store = database.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });

        if (storeName === STORES.vocabulary || storeName === STORES.sentences) {
          store.createIndex('word', 'word', { unique: false });
        }
        if (storeName === STORES.wordSets) {
          store.createIndex('name', 'name', { unique: false });
        }
        if (storeName === STORES.settings) {
          store.createIndex('key', 'key', { unique: true });
        }
      });
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(databaseError(request.error, 'open', DB_NAME));
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another open tab.'));
  });

  return databasePromise;
}

export async function getDatabaseHealth() {
  const database = await openDatabase();
  const counts = {};

  for (const storeName of Object.values(STORES)) {
    if (!database.objectStoreNames.contains(storeName)) {
      throw new Error(`IndexedDB is missing the "${storeName}" store.`);
    }

    const request = database.transaction(storeName, 'readonly').objectStore(storeName).count();
    counts[storeName] = await requestResult(request);
  }

  return {
    name: database.name,
    version: database.version,
    counts,
  };
}

export async function protectDatabaseStorage() {
  if (!navigator.storage) {
    return { supported: false, persisted: false };
  }

  const persisted = await navigator.storage.persisted();
  if (persisted) {
    return { supported: true, persisted: true };
  }

  if (typeof navigator.storage.persist !== 'function') {
    return { supported: true, persisted: false };
  }

  return {
    supported: true,
    persisted: await navigator.storage.persist(),
  };
}

export async function addRecord(storeName, record) {
  validateStoreName(storeName);
  if (!record || typeof record !== 'object') {
    throw new TypeError('A record object is required.');
  }

  const value = {
    ...record,
    id: record.id || createId(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).add(value);
    await transactionResult(transaction, request);
    queueRecordSync?.('upsert', storeName, value);
    return value;
  } catch (error) {
    throw databaseError(error, 'add', storeName);
  }
}

export async function getRecord(storeName, id) {
  validateStoreName(storeName);
  if (!id) {
    throw new TypeError('A record id is required.');
  }

  try {
    const database = await openDatabase();
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(id);
    return requestResult(request);
  } catch (error) {
    throw databaseError(error, 'read', storeName);
  }
}

export async function getAllRecords(storeName) {
  validateStoreName(storeName);

  try {
    const database = await openDatabase();
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    return requestResult(request);
  } catch (error) {
    throw databaseError(error, 'read all', storeName);
  }
}

export async function updateRecord(storeName, record) {
  validateStoreName(storeName);
  if (!record?.id) {
    throw new TypeError('An existing record with an id is required.');
  }

  const value = { ...record, updatedAt: new Date().toISOString() };

  try {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).put(value);
    await transactionResult(transaction, request);
    queueRecordSync?.('upsert', storeName, value);
    return value;
  } catch (error) {
    throw databaseError(error, 'update', storeName);
  }
}

export async function deleteRecord(storeName, id) {
  validateStoreName(storeName);
  if (!id) {
    throw new TypeError('A record id is required.');
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).delete(id);
    const result = await transactionResult(transaction, request);
    queueRecordSync?.('delete', storeName, id);
    return result;
  } catch (error) {
    throw databaseError(error, 'delete', storeName);
  }
}

export async function findRecords(storeName, predicate) {
  if (typeof predicate !== 'function') {
    throw new TypeError('A predicate function is required.');
  }

  const records = await getAllRecords(storeName);
  return records.filter(predicate);
}

export async function searchRecords(storeName, query, fields = []) {
  validateStoreName(storeName);
  const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return getAllRecords(storeName);
  }

  const records = await getAllRecords(storeName);
  return records.filter((record) => {
    const values = fields.length
      ? fields.map((field) => record[field])
      : Object.values(record);
    return values.some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedQuery));
  });
}

export async function clearStore(storeName) {
  validateStoreName(storeName);

  try {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).clear();
    return transactionResult(transaction, request);
  } catch (error) {
    throw databaseError(error, 'clear', storeName);
  }
}