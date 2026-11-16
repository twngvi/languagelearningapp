import { STORES, addRecord, findRecords, updateRecord } from './db.js';

const dailyWordGoalKey = 'daily-word-goal';
const DEFAULT_DAILY_WORD_GOAL = 10;

export async function getDailyWordGoal() {
  const records = await findRecords(STORES.settings, (record) => record.key === dailyWordGoalKey);
  const goal = records[0]?.value ?? DEFAULT_DAILY_WORD_GOAL;
  if (!Number.isInteger(goal) || goal < 1 || goal > 999) {
    throw new TypeError('Mục tiêu đã lưu không hợp lệ.');
  }
  return goal;
}

export async function saveDailyWordGoal(input) {
  const goal = Number(input);
  if (!Number.isInteger(goal) || goal < 1 || goal > 999) {
    throw new TypeError('Mục tiêu cần là số nguyên từ 1 đến 999.');
  }

  const records = await findRecords(STORES.settings, (record) => record.key === dailyWordGoalKey);
  const record = { id: records[0]?.id, key: dailyWordGoalKey, value: goal };
  return records.length
    ? updateRecord(STORES.settings, record)
    : addRecord(STORES.settings, record);
}