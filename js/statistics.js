import { STORES, getAllRecords } from './db.js';
import { listDueVocabulary } from './review.js';

export async function getLearningStatistics() {
  const [vocabulary, sessions, sentences, due] = await Promise.all([
    getAllRecords(STORES.vocabulary),
    getAllRecords(STORES.studySessions),
    getAllRecords(STORES.sentences),
    listDueVocabulary(),
  ]);

  const learnedIds = new Set(sessions.flatMap((session) => session.cardIds || []));
  const answers = sessions.flatMap((session) => session.answers || []);
  const correctAnswers = answers.filter((answer) => answer.correct).length;
  const difficultWords = vocabulary
    .filter((record) => record.difficult || record.reviewLevel === 'forgotten' || record.reviewLevel === 'hard')
    .sort((first, second) => Number(second.reviewPriority || 0) - Number(first.reviewPriority || 0));
  const recentSessions = [...sessions]
    .sort((first, second) => new Date(second.completedAt || second.createdAt) - new Date(first.completedAt || first.createdAt))
    .slice(0, 5);

  return {
    vocabularyCount: vocabulary.length,
    learnedCount: learnedIds.size || vocabulary.filter((record) => record.reviewCount > 0).length,
    reviewedCount: vocabulary.reduce((total, record) => total + Number(record.reviewCount || 0), 0),
    correctRate: answers.length ? Math.round((correctAnswers / answers.length) * 100) : 0,
    answerCount: answers.length,
    sentenceCount: sentences.length,
    studyMinutes: Math.round(sessions.reduce((total, session) => total + Number(session.durationSeconds || 0), 0) / 60),
    dueCount: due.length,
    difficultWords,
    recentSessions,
    vocabulary,
  };
}