import { getCurrentUser, supabase } from './supabase.js';

const SYNC_TABLE = 'app_records';
let syncTimer;

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
  }, { onConflict: 'user_id,store_name,record_id' });
  if (error) throw error;
  return true;
}

export async function removeRemoteRecord(storeName, recordId) {
  const user = await getCurrentUser();
  if (!user || !navigator.onLine) return false;

  const { error } = await supabase.from(SYNC_TABLE)
    .delete()
    .eq('user_id', user.id)
    .eq('store_name', storeName)
    .eq('record_id', recordId);
  if (error) throw error;
  return true;
}

export function queueRecordSync(action, storeName, value) {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(async () => {
    try {
      notify('syncing');
      if (action === 'delete') await removeRemoteRecord(storeName, value);
      else await upsertRemoteRecord(storeName, value);
      notify('synced');
    } catch (error) {
      notify('error', error.message);
      console.error('Không thể đồng bộ dữ liệu lên Supabase:', error);
    }
  }, 100);
}

export async function syncAllLocalData() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Hãy đăng nhập trước khi đồng bộ.');
  if (!navigator.onLine) throw new Error('Thiết bị đang ngoại tuyến.');

  const { getAllRecords, STORES, updateRecord, addRecord } = await import('./db.js');
  const localByKey = new Map();
  for (const storeName of Object.values(STORES)) {
    for (const record of await getAllRecords(storeName)) {
      localByKey.set(`${storeName}:${record.id}`, { storeName, record });
    }
  }

  const { data, error } = await supabase.from(SYNC_TABLE).select('store_name,record_id,record,updated_at');
  if (error) throw error;

  for (const remote of data || []) {
    const key = `${remote.store_name}:${remote.record_id}`;
    const local = localByKey.get(key);
    const remoteRecord = remote.record;
    if (!local) {
      await addRecord(remote.store_name, remoteRecord);
      continue;
    }
    const localTime = Date.parse(local.record.updatedAt || local.record.createdAt || 0);
    const remoteTime = Date.parse(remote.updated_at || remoteRecord.updatedAt || 0);
    if (remoteTime > localTime) await updateRecord(remote.store_name, remoteRecord);
  }

  for (const { storeName, record } of localByKey.values()) await upsertRemoteRecord(storeName, record);
  notify('synced');
}
