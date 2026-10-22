import { STORES, getAllRecords, getRecord, updateRecord } from './db.js';

export const REVIEW_LEVELS = Object.freeze({
  forgotten: { label: 'Quên', days: 0 },
  hard: { label: 'Khó', days: 1 },
  good: { label: 'Tốt', days: 3 },
  easy: { label: 'Dễ', days: 7 },
});

export function calculateNextReview(level, now = new Date()) {
  const schedule = REVIEW_LEVELS[level];
  if (!schedule) throw new Error(`Mức ôn tập không hợp lệ: ${level}`);
  const next = new Date(now);
  if (schedule.days === 0) next.setMinutes(next.getMinutes() + 10);
  else next.setDate(next.getDate() + schedule.days);
  return next.toISOString();
}

export function isDueForReview(record, now = new Date()) {
  return !record.nextReviewAt || new Date(record.nextReviewAt) <= now;
}

export async function listDueVocabulary(now = new Date()) {
  const records = await getAllRecords(STORES.vocabulary);
  return records
    .filter((record) => isDueForReview(record, now))
    .sort((first, second) => Number(second.reviewPriority || 0) - Number(first.reviewPriority || 0));
}

export async function getDueCount(now = new Date()) {
  return (await listDueVocabulary(now)).length;
}

export async function scheduleReview(cardId, level, now = new Date()) {
  const record = await getRecord(STORES.vocabulary, cardId);
  if (!record) throw new Error('Không tìm thấy từ cần lên lịch ôn.');
  const nextReviewAt = calculateNextReview(level, now);
  const reviewCount = Number(record.reviewCount || 0) + 1;
  return updateRecord(STORES.vocabulary, {
    ...record,
    reviewLevel: level,
    lastReviewedAt: now.toISOString(),
    nextReviewAt,
    reviewCount,
    reviewPriority: level === 'forgotten' ? 4 : level === 'hard' ? 3 : level === 'good' ? 2 : 1,
    dueForReview: new Date(nextReviewAt) <= now,
    memorized: level === 'good' || level === 'easy',
  });
}

export async function markVocabularyDue(cardId) {
  return scheduleReview(cardId, 'forgotten');
}