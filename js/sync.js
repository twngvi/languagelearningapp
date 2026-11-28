import { supabase } from './supabase.js';

const SYNC_TABLE = 'app_records';
let syncTimer;
let fullSync;
const pendingSyncs = new Map();

function notify(status, detail = '') {
  document.dispatchEvent(new CustomEvent('app:sync-status', { detail: { status, detail } }));
}

export async function upsertRemoteRecord(storeName, record) {
  if (!navigator.onLine) return false;

  const { error } = await supabase.from(SYNC_TABLE).upsert({
    store_name: storeName,
    record_id: record.id,
    record,
    updated_at: record.updatedAt || new Date().toISOString(),
    deleted_at: null,
  }, { onConflict: 'store_name,record_id' });
  if (error) throw error;
  return true;
}

export async function removeRemoteRecord(storeName, recordId) {
  if (!navigator.onLine) return false;

  const { error } = await supabase.from(SYNC_TABLE)
    .update({ deleted_at: new Date().toISOString() })
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

async function reconcileSettingsKeyConflicts(localByKey, remoteRecords, settingsStore, deleteSyncedRecord) {
  const recordsBySettingKey = new Map();
  const addCandidate = (settingKey, candidate) => {
    if (!recordsBySettingKey.has(settingKey)) recordsBySettingKey.set(settingKey, []);
    recordsBySettingKey.get(settingKey).push(candidate);
  };

  for (const { storeName, record } of localByKey.values()) {
    if (storeName === settingsStore && record.key !== undefined && record.key !== null) {
      addCandidate(record.key, {
        id: record.id,
        source: 'local',
        updatedAt: recordTime(record.updatedAt || record.createdAt),
      });
    }
  }
  for (const remote of remoteRecords) {
    if (remote.store_name === settingsStore
      && !remote.deleted_at
      && remote.record?.key !== undefined
      && remote.record?.key !== null) {
      addCandidate(remote.record.key, {
        id: remote.record_id,
        source: 'remote',
        updatedAt: recordTime(remote.updated_at || remote.record.updatedAt || remote.record.createdAt),
      });
    }
  }

  const winningIds = new Map();
  for (const [settingKey, candidates] of recordsBySettingKey) {
    const distinctIds = new Set(candidates.map((candidate) => candidate.id));
    if (distinctIds.size < 2) continue;

    const winner = [...candidates].sort((first, second) =>
      second.updatedAt - first.updatedAt || first.id.localeCompare(second.id))[0];
    winningIds.set(settingKey, winner.id);

    for (const candidate of candidates) {
      if (candidate.id === winner.id) continue;
      if (candidate.source === 'local') {
        await deleteSyncedRecord(settingsStore, candidate.id);
        localByKey.delete(`${settingsStore}:${candidate.id}`);
      } else {
        await removeRemoteRecord(settingsStore, candidate.id);
      }
    }
  }

  return remoteRecords.filter((remote) => {
    if (remote.store_name !== settingsStore
      || remote.deleted_at
      || remote.record?.key === undefined
      || remote.record?.key === null) return true;
    const winningId = winningIds.get(remote.record.key);
    return winningId === undefined || remote.record_id === winningId;
  });
}

async function performFullSync() {
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

  const remoteRecords = await reconcileSettingsKeyConflicts(
    localByKey,
    data || [],
    STORES.settings,
    deleteSyncedRecord,
  );
  const remoteByKey = new Map();
  for (const remote of remoteRecords) {
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
  document.dispatchEvent(new CustomEvent('app:data-synced'));
}
