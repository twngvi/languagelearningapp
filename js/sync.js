import { getCurrentUser, supabase } from './supabase.js';

const SYNC_TABLE = 'app_records';
let syncTimer;
let fullSync;
const pendingSyncs = new Map();

function notify(status, detail = '') {
  document.dispatchEvent(new CustomEvent('app:sync-status', { detail: { status, detail } }));
}

export async function upsertRemoteRecord(storeName, record) {
  const user = await getCurrentUser();
  if (!user || !navigator.onLine) return false;

  const { error } = await supabase.from(SYNC_TABLE).upsert({
    user_id: user.id,
    store_name: storeName,
    record_id: record.id,
    record,
    updated_at: record.updatedAt || new Date().toISOString(),
    deleted_at: null,
  }, { onConflict: 'user_id,store_name,record_id' });
  if (error) throw error;
  return true;
}

export async function removeRemoteRecord(storeName, recordId) {
  const user = await getCurrentUser();
  if (!user || !navigator.onLine) return false;

  const { error } = await supabase.from(SYNC_TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('store_name', storeName)
    .eq('record_id', recordId);
  if (error) throw error;
  return true;
}

export function queueRecordSync(action, storeName, value) {
  const recordId = action === 'delete' ? value : value.id;
  pendingSyncs.set(`${storeName}:${recordId}`, { action, storeName, value });
  if (syncTimer) return;

  syncTimer = window.setTimeout(async () => {
    syncTimer = undefined;
    const operations = [...pendingSyncs.values()];
    pendingSyncs.clear();
    let hasErrors = false;
    notify('syncing');
    for (const operation of operations) {
      try {
        if (operation.action === 'delete') {
          await removeRemoteRecord(operation.storeName, operation.value);
        } else {
          await upsertRemoteRecord(operation.storeName, operation.value);
        }
      } catch (error) {
        hasErrors = true;
        notify('error', error.message);
        console.error('Không thể đồng bộ dữ liệu lên Supabase:', error);
      }
    }
    if (!hasErrors) notify('synced');
  }, 100);
}

export async function syncAllLocalData() {
  if (fullSync) return fullSync;
  fullSync = performFullSync().finally(() => {
    fullSync = undefined;
  });
  return fullSync;
}

function recordTime(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function performFullSync() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Hãy đăng nhập trước khi đồng bộ.');
  if (!navigator.onLine) throw new Error('Thiết bị đang ngoại tuyến.');

  const { getAllRecords, STORES, saveSyncedRecord, deleteSyncedRecord } = await import('./db.js');
  const localByKey = new Map();
  const syncStores = Object.values(STORES).filter((storeName) => storeName !== STORES.recordings);
  for (const storeName of syncStores) {
    for (const record of await getAllRecords(storeName)) {
      localByKey.set(`${storeName}:${record.id}`, { storeName, record });
    }
  }

  const { data, error } = await supabase.from(SYNC_TABLE)
    .select('store_name,record_id,record,updated_at,deleted_at');
  if (error) throw error;

  const remoteByKey = new Map();
  for (const remote of data || []) {
    const key = `${remote.store_name}:${remote.record_id}`;
    remoteByKey.set(key, remote);
    const local = localByKey.get(key);
    if (remote.deleted_at) {
      const localTime = recordTime(local?.record.updatedAt || local?.record.createdAt);
      if (local && localTime > recordTime(remote.deleted_at)) {
        await upsertRemoteRecord(local.storeName, local.record);
      } else if (local) {
        await deleteSyncedRecord(remote.store_name, remote.record_id);
      }
      continue;
    }

    const remoteRecord = {
      ...remote.record,
      updatedAt: remote.record.updatedAt || remote.updated_at,
    };
    if (!local) {
      await saveSyncedRecord(remote.store_name, remoteRecord);
      continue;
    }

    const localTime = recordTime(local.record.updatedAt || local.record.createdAt);
    const remoteTime = recordTime(remote.updated_at || remoteRecord.updatedAt);
    if (remoteTime > localTime) {
      await saveSyncedRecord(remote.store_name, remoteRecord);
    } else if (localTime > remoteTime) {
      await upsertRemoteRecord(local.storeName, local.record);
    }
  }

  for (const [key, { storeName, record }] of localByKey) {
    if (!remoteByKey.has(key)) await upsertRemoteRecord(storeName, record);
  }
  notify('synced');
}
