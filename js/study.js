import { STORES, addRecord, getAllRecords, getRecord, updateRecord } from './db.js';
import { listWordSets } from './word-sets.js';
import { renderStudyCard, renderChooseQuestion, renderTypeQuestion, renderBlankQuestion } from '../pages/study-page.js';
import { speakText } from './speech.js';
import { scheduleReview, listDueVocabulary } from './review.js';

export async function getStudyOptions() {
  const [records, sets] = await Promise.all([
    getAllRecords(STORES.vocabulary),
    listWordSets(),
  ]);
  return { records, sets };
}

export function getCardsForStudy(records, sets, { setId = '', amount = 10 } = {}) {
  const set = sets.find((item) => item.id === setId);
  const selected = set
    ? set.vocabularyIds.map((id) => records.find((record) => record.id === id)).filter(Boolean)
    : records;
  return selected.slice(0, Math.max(1, Number(amount) || 1));
}

export async function saveStudySession(session) {
  return addRecord(STORES.studySessions, {
    ...session,
    completedAt: new Date().toISOString(),
  });
}

export async function saveCardRating(cardId, rating, difficult) {
  const record = await getRecord(STORES.vocabulary, cardId);
  if (!record) throw new Error('Không tìm thấy từ đang học.');
  const level = ['forgotten', 'hard', 'good', 'easy'].includes(rating)
    ? rating
    : rating === 'known' ? 'good' : 'forgotten';
  const updated = await updateRecord(STORES.vocabulary, {
    ...record,
    difficult: Boolean(difficult),
    memorized: level === 'good' || level === 'easy',
    dueForReview: level === 'forgotten',
  });
  return scheduleReview(updated.id, level);
}

export function normalizeQuizAnswer(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function isQuizAnswerCorrect(answer, expected) {
  return normalizeQuizAnswer(answer) === normalizeQuizAnswer(expected);
}

export function getBlankCards(records, amount = 10) {
  return records.filter((record) => String(record.example || '').toLocaleLowerCase().includes(String(record.word || '').toLocaleLowerCase()))
    .slice(0, Math.max(1, Number(amount) || 1));
}

function escapeForDisplay(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

export async function initializeStudyPage() {
  const view = document.querySelector('#app-view');
  const setup = view.querySelector('[data-study-setup]');
  const sessionView = view.querySelector('[data-study-session]');
  const message = view.querySelector('[data-study-message]');
  let records = [];
  let sets = [];
  let cards = [];
  let index = 0;
  let flipped = false;
  let difficult = false;
  let direction = 'en-vi';
  let ratings = [];
  let mode = 'flashcard';
  let answers = [];
  let sessionStartedAt = 0;

  try {
    ({ records, sets } = await getStudyOptions());
    const setSelect = view.querySelector('[data-study-set]');
    sets.forEach((set) => {
      const option = document.createElement('option');
      option.value = set.id;
      option.textContent = `${set.name} (${set.vocabularyIds.length} từ)`;
      setSelect.append(option);
    });
    const dueCount = (await listDueVocabulary()).length;
    view.querySelector('[data-due-count]').textContent = `${dueCount} từ cần ôn hôm nay`;
  } catch (error) {
    message.textContent = `Không thể tải dữ liệu học: ${error.message}`;
    return;
  }

  const showCard = () => {
    const card = cards[index];
    sessionView.innerHTML = renderStudyCard(card, direction, index, cards.length, flipped, difficult);
  };

  const showQuizCard = () => {
    const card = cards[index];
    if (mode === 'choose') {
      const distractors = records.filter((record) => record.id !== card.id && record.meaning).slice(0, 3);
      const options = [card, ...distractors].sort(() => Math.random() - 0.5);
      sessionView.innerHTML = renderChooseQuestion(card, options, index, cards.length);
    } else if (mode === 'type') {
      sessionView.innerHTML = renderTypeQuestion(card, index, cards.length);
    } else {
      sessionView.innerHTML = renderBlankQuestion(card, index, cards.length);
    }
  };

  const finish = async () => {
    await saveStudySession({
      mode,
      direction,
      totalCards: cards.length,
      ratings,
      answers,
      durationSeconds: Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000)),
      cardIds: cards.map((card) => card.id),
    });
    sessionView.innerHTML = `
      <section class="study-summary">
        <span class="placeholder-icon">✓</span>
        <p class="eyebrow">HOÀN THÀNH PHIÊN HỌC</p>
        <h2>Bạn đã hoàn thành ${cards.length} câu</h2>
        <p>${ratings.filter((rating) => ['good', 'easy', 'known'].includes(rating)).length} từ nhớ tốt · ${ratings.filter((rating) => ['forgotten', 'hard', 'again'].includes(rating)).length} từ cần ưu tiên ôn</p>
        <button class="primary-button" data-study-action="restart" type="button">Học lại</button>
      </section>`;
  };

  view.addEventListener('click', async (event) => {
    const actionElement = event.target.closest('[data-study-action], [data-study-rating], [data-quiz-answer]');
    if (!actionElement) return;
    const action = actionElement.dataset.studyAction;
    try {
      if (action === 'start') {
        const setId = view.querySelector('[data-study-set]').value;
        direction = view.querySelector('[data-study-direction]').value;
        mode = view.querySelector('[data-study-mode].is-selected')?.dataset.studyMode || 'flashcard';
        cards = mode === 'blank'
          ? getBlankCards(records, view.querySelector('[data-study-amount]').value)
          : getCardsForStudy(records, sets, {
          setId,
          amount: view.querySelector('[data-study-amount]').value,
        });
        if (!cards.length) {
          message.textContent = mode === 'blank'
            ? 'Chưa có từ nào có câu ví dụ phù hợp cho chế độ này.'
            : 'Chưa có từ phù hợp để học. Hãy thêm từ hoặc chọn bộ từ khác.';
          return;
        }
        if (mode === 'choose' && records.filter((record) => record.meaning).length < 2) {
          message.textContent = 'Listen and Choose cần ít nhất hai từ có nghĩa để tạo đáp án phù hợp.';
          return;
        }
        index = 0;
        flipped = false;
        difficult = false;
        ratings = [];
        answers = [];
        sessionStartedAt = Date.now();
        setup.hidden = true;
        sessionView.hidden = false;
        if (mode === 'flashcard') showCard();
        else showQuizCard();
      }
      if (action === 'start-review') {
        cards = await listDueVocabulary();
        if (!cards.length) {
          message.textContent = 'Hôm nay chưa có từ nào đến lịch ôn.';
          return;
        }
        mode = 'flashcard';
        direction = 'en-vi';
        index = 0;
        flipped = false;
        difficult = false;
        ratings = [];
        answers = [];
        sessionStartedAt = Date.now();
        setup.hidden = true;
        sessionView.hidden = false;
        showCard();
      }
      if (action === 'mode') {
        view.querySelectorAll('[data-study-mode]').forEach((button) => button.classList.toggle('is-selected', button === actionElement));
      }
      if (action === 'flip') {
        flipped = !flipped;
        showCard();
      }
      if (action === 'speak') {
        speakText(cards[index].word);
      }
      if (action === 'difficult') {
        difficult = !difficult;
        showCard();
      }
      if (action === 'speak-sentence') speakText(cards[index].example);
      if (actionElement.dataset.quizAnswer) {
        const selected = records.find((record) => record.id === actionElement.dataset.quizAnswer);
        const correct = selected?.id === cards[index].id;
        answers.push({ cardId: cards[index].id, answer: selected?.meaning || '', expected: cards[index].meaning, correct });
        ratings.push(correct ? 'good' : 'forgotten');
        await saveCardRating(cards[index].id, correct ? 'known' : 'again', false);
        sessionView.querySelectorAll('[data-quiz-answer]').forEach((button) => {
          button.disabled = true;
          if (button.dataset.quizAnswer === cards[index].id) button.classList.add('correct');
          else if (button === actionElement && !correct) button.classList.add('incorrect');
        });
        window.setTimeout(() => advance(), 500);
      }
      if (actionElement.dataset.studyRating) {
        const rating = actionElement.dataset.studyRating;
        ratings.push(rating);
        await saveCardRating(cards[index].id, rating, difficult);
        if (index === cards.length - 1) await finish();
        else {
          index += 1;
          flipped = false;
          difficult = false;
          showCard();
        }
      }
      if (action === 'restart') {
        sessionView.hidden = true;
        setup.hidden = false;
        message.textContent = '';
      }
    } catch (error) {
      console.error('Không thể xử lý phiên học:', error);
      message.textContent = `Không thể tiếp tục phiên học: ${error.message}`;
    }
  });

  const advance = async () => {
    if (index === cards.length - 1) await finish();
    else {
      index += 1;
      flipped = false;
      difficult = false;
      if (mode === 'flashcard') showCard();
      else showQuizCard();
    }
  };

  view.addEventListener('submit', async (event) => {
    if (!event.target.matches('[data-quiz-form]')) return;
    event.preventDefault();
    const answer = event.target.querySelector('[data-quiz-input]').value;
    const card = cards[index];
    const expected = mode === 'blank' ? card.word : card.word;
    const correct = isQuizAnswerCorrect(answer, expected);
    answers.push({ cardId: card.id, answer, expected, correct });
    ratings.push(correct ? 'good' : 'forgotten');
    await saveCardRating(card.id, correct ? 'good' : 'forgotten', false);
    sessionView.innerHTML = `<div class="quiz-result ${correct ? 'is-correct' : 'is-incorrect'}"><h2>${correct ? 'Chính xác!' : 'Chưa đúng'}</h2><p>Đáp án đúng: <strong>${escapeForDisplay(expected)}</strong></p><p>Nghĩa: ${escapeForDisplay(card.meaning)}</p><button class="primary-button" data-study-action="next-question" type="button">${index === cards.length - 1 ? 'Xem tổng kết' : 'Câu tiếp theo'}</button></div>`;
  });

  view.addEventListener('click', async (event) => {
    if (event.target.matches('[data-study-action="next-question"]')) await advance();
  });
}