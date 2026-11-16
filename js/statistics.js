import { STORES, getAllRecords } from './db.js';
import { listDueVocabulary } from './review.js';
import { getDailyWordGoal } from './settings.js';

export async function getLearningStatistics() {
  const [vocabulary, sessions, sentences, due, dailyWordGoal] = await Promise.all([
    getAllRecords(STORES.vocabulary),
    getAllRecords(STORES.studySessions),
    getAllRecords(STORES.sentences),
    listDueVocabulary(),
    getDailyWordGoal(),
  ]);

  const learnedIds = new Set(sessions.flatMap((session) => session.cardIds || []));
  const currentVocabularyIds = new Set(vocabulary.map((record) => record.id));
  const now = new Date();
  const learnedTodayIds = new Set(sessions
    .filter((session) => {
      const completedAt = new Date(session.completedAt || session.createdAt);
      return !Number.isNaN(completedAt.getTime())
        && completedAt.getFullYear() === now.getFullYear()
        && completedAt.getMonth() === now.getMonth()
        && completedAt.getDate() === now.getDate();
    })
    .flatMap((session) => session.cardIds || [])
    .filter((id) => currentVocabularyIds.has(id)));
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
    learnedCount: vocabulary.filter((record) => (
      learnedIds.size ? learnedIds.has(record.id) : record.reviewCount > 0
    )).length,
    reviewedCount: vocabulary.reduce((total, record) => total + Number(record.reviewCount || 0), 0),
    correctRate: answers.length ? Math.round((correctAnswers / answers.length) * 100) : 0,
    answerCount: answers.length,
    sentenceCount: sentences.length,
    studyMinutes: Math.round(sessions.reduce((total, session) => total + Number(session.durationSeconds || 0), 0) / 60),
    dueCount: due.length,
    dailyWordGoal,
    dailyWordGoalRemaining: Math.max(0, dailyWordGoal - learnedTodayIds.size),
    difficultWords,
    recentSessions,
    vocabulary,
  };
}