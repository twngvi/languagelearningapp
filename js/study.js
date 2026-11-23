import { STORES, addRecord, getAllRecords, getRecord, updateRecord } from './db.js';
import { countSavedVocabularyInSet, listWordSets } from './word-sets.js';
import { renderStudyCard, renderChooseQuestion, renderTypeQuestion, renderBlankQuestion } from '../pages/study-page.js';
import { cancelSpeech, speakText, toggleSpeech } from './speech.js';
import { scheduleReview } from './review.js';
import { showConfirm } from './notifications.js';

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

export async function saveCardStudyState(cardId, { memorized, difficult, dueForReview }) {
  const record = await getRecord(STORES.vocabulary, cardId);
  if (!record) throw new Error('Không tìm thấy từ đang học.');
  const updated = await updateRecord(STORES.vocabulary, {
    ...record,
    ...(typeof memorized === 'boolean' ? { memorized } : {}),
    ...(typeof difficult === 'boolean' ? { difficult } : {}),
    ...(typeof dueForReview === 'boolean' ? { dueForReview } : {}),
  });
  return updated;
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
  const cardViewStates = new Map();
  const noticeTimers = new Map();
  let autoPlayEnabled = true;

  try {
    autoPlayEnabled = localStorage.getItem('shin-study-autoplay') !== 'false';
  } catch (error) {
    console.warn('Không thể đọc cài đặt tự động phát âm:', error);
  }

  try {
    ({ records, sets } = await getStudyOptions());
    const setSelect = view.querySelector('[data-study-set]');
    const vocabularyIds = new Set(records.map((record) => record.id));
    sets.forEach((set) => {
      const option = document.createElement('option');
      option.value = set.id;
      option.textContent = `${set.name} (${countSavedVocabularyInSet(set, vocabularyIds)} từ)`;
      setSelect.append(option);
    });
  } catch (error) {
    message.textContent = `Không thể tải dữ liệu học: ${error.message}`;
    return;
  }

  const showCard = () => {
    const card = cards[index];
    const state = cardViewStates.get(card.id);
    flipped = state ? state.flipped : false;
    difficult = Boolean(card.difficult);
    sessionView.innerHTML = renderStudyCard(card, direction, index, cards.length, flipped, difficult, autoPlayEnabled);
  };

  const updateCardControls = () => {
    const card = cards[index];
    const unlearnedButton = sessionView.querySelector('[data-study-action="unlearned"]');
    const learnedButton = sessionView.querySelector('[data-study-action="learned"]');
    const difficultButton = sessionView.querySelector('[data-study-action="difficult"]');
    unlearnedButton?.classList.toggle('is-selected', card.studyRating === 'forgotten');
    unlearnedButton?.setAttribute('aria-pressed', String(card.studyRating === 'forgotten'));
    learnedButton?.classList.toggle('is-selected', card.studyRating === 'good');
    learnedButton?.setAttribute('aria-pressed', String(card.studyRating === 'good'));
    difficultButton?.classList.toggle('is-selected', Boolean(card.difficult));
    difficultButton?.setAttribute('aria-label', card.difficult ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó');
  };

  let cardTransitioning = false;
  let cardActionPending = false;
  const runCardAnimation = (card, className, animationName, fallbackMs) => new Promise((resolve) => {
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      window.clearTimeout(fallback);
      card.removeEventListener('animationend', handleAnimationEnd);
      resolve();
    };
    const handleAnimationEnd = (event) => {
      if (event.target === card && event.animationName === animationName) complete();
    };
    const fallback = window.setTimeout(complete, fallbackMs);
    card.addEventListener('animationend', handleAnimationEnd);
    card.classList.add(className);
  });

  const showStatusNotice = (side, text, type) => {
    const notice = sessionView.querySelector(`[data-status-notice="${side}"]`);
    if (!notice) return;
    window.clearTimeout(noticeTimers.get(side));
    notice.hidden = false;
    notice.textContent = text;
    notice.className = `flashcard-status-notice is-${type}`;
    void notice.offsetWidth;
    notice.classList.add('is-visible');
    noticeTimers.set(side, window.setTimeout(() => {
      notice.hidden = true;
      notice.classList.remove('is-visible');
    }, 850));
  };

  const speakCurrentCard = () => {
    if (!autoPlayEnabled || mode !== 'flashcard') return;
    try {
      speakText(cards[index].word, { lang: 'en-US' });
    } catch (error) {
      console.error('Không thể tự động phát âm từ:', error);
      message.textContent = `Không thể phát âm từ: ${error.message}`;
    }
  };

  const transitionToCard = async (targetIndex, directionOfMotion) => {
    if (cardTransitioning || targetIndex < 0 || targetIndex >= cards.length) return;
    const stage = sessionView.querySelector('.flashcard-stage');
    const currentCard = stage?.querySelector('.flashcard');
    if (!stage || !currentCard) {
      index = targetIndex;
      flipped = false;
      difficult = Boolean(cards[index].difficult);
      showCard();
      speakCurrentCard();
      return;
    }

    cardTransitioning = true;
    cancelSpeech();
    try {
      const targetCard = cards[targetIndex];
      const targetState = cardViewStates.get(targetCard.id);
      const targetContainer = document.createElement('div');
      targetContainer.innerHTML = renderStudyCard(
        targetCard,
        direction,
        targetIndex,
        cards.length,
        targetState ? targetState.flipped : false,
        Boolean(targetCard.difficult),
        autoPlayEnabled,
      );
      const incomingCard = targetContainer.querySelector('.flashcard');
      if (!incomingCard) throw new Error('Không thể hiển thị thẻ tiếp theo.');

      const incomingDirection = directionOfMotion === 'left' ? 'right' : 'left';
      await runCardAnimation(
        currentCard,
        `is-flying-out-${directionOfMotion}`,
        `flashcard-fly-out-${directionOfMotion}`,
        320,
      );
      if (sessionView.hidden || !stage.isConnected) return;
      stage.replaceChildren(incomingCard);
      void incomingCard.offsetWidth;
      await runCardAnimation(
        incomingCard,
        `is-flying-in-${incomingDirection}`,
        `flashcard-fly-in-${incomingDirection}`,
        360,
      );
      if (sessionView.hidden) return;

      index = targetIndex;
      flipped = targetState ? targetState.flipped : false;
      difficult = Boolean(cards[index].difficult);
      sessionView.querySelector('.study-progress').textContent = `Thẻ ${index + 1} / ${cards.length}`;
      updateCardControls();
      speakCurrentCard();
    } finally {
      cardTransitioning = false;
    }
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
    cancelSpeech();
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
        <button class="primary-button study-restart-button" data-study-action="restart" type="button">Học lại</button>
      </section>`;
  };

  view.addEventListener('click', async (event) => {
    const actionElement = event.target.closest('[data-study-action], [data-study-rating], [data-quiz-answer]');
    if (!actionElement) return;
    const action = actionElement.dataset.studyAction;
    if ((cardTransitioning || cardActionPending) && action !== 'exit') return;
    const isPersistentCardAction = ['difficult', 'unlearned', 'learned'].includes(action);
    if (isPersistentCardAction) cardActionPending = true;
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
        difficult = Boolean(cards[index]?.difficult);
        ratings = [];
        answers = [];
        sessionStartedAt = Date.now();
        setup.hidden = true;
        sessionView.hidden = false;
        if (mode === 'flashcard') {
          showCard();
          speakCurrentCard();
        }
        else showQuizCard();
      }
      if (action === 'mode') {
        view.querySelectorAll('[data-study-mode]').forEach((button) => button.classList.toggle('is-selected', button === actionElement));
      }
      if (action === 'flip') {
        flipped = !flipped;
        cardViewStates.set(cards[index].id, { flipped });
        actionElement.classList.toggle('is-flipped', flipped);
        actionElement.setAttribute('aria-label', flipped ? 'Lật về mặt gợi nhớ' : 'Lật để xem đáp án');
      }
      if (action === 'autoplay') {
        autoPlayEnabled = !autoPlayEnabled;
        actionElement.classList.toggle('is-enabled', autoPlayEnabled);
        actionElement.setAttribute('aria-pressed', String(autoPlayEnabled));
        actionElement.setAttribute('aria-label', `Tự động phát âm: ${autoPlayEnabled ? 'bật' : 'tắt'}`);
        actionElement.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 9v6h4l5 4V5L7 9H3z"></path>${autoPlayEnabled ? '<path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"></path>' : '<path d="m16 9 5 6m0-6-5 6"></path>'}</svg>`;
        try {
          localStorage.setItem('shin-study-autoplay', String(autoPlayEnabled));
        } catch (error) {
          console.error('Không thể lưu cài đặt tự động phát âm:', error);
          message.textContent = `Không thể lưu cài đặt tự động phát âm: ${error.message}`;
        }
        if (!autoPlayEnabled) cancelSpeech();
      }
      if (action === 'speak') {
        toggleSpeech(actionElement, cards[index].word);
      }
      if (action === 'difficult') {
        difficult = !difficult;
        await saveCardStudyState(cards[index].id, { difficult });
        cards[index].difficult = difficult;
        cardViewStates.set(cards[index].id, { flipped, difficult });
        actionElement.classList.toggle('is-selected', difficult);
        actionElement.setAttribute('aria-label', difficult ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó');
        if (difficult) showStatusNotice('right', 'Từ khó', 'difficult');
      }
      if (action === 'previous') {
        if (index > 0) await transitionToCard(index - 1, 'left');
      }
      if (action === 'unlearned') {
        await saveCardRating(cards[index].id, 'forgotten', difficult);
        cards[index].studyRating = 'forgotten';
        cards[index].memorized = false;
        cards[index].dueForReview = true;
        ratings.push('forgotten');
        showStatusNotice('left', 'Chưa thuộc', 'forgotten');
        if (index === cards.length - 1) await finish();
        else await transitionToCard(index + 1, 'left');
      }
      if (action === 'learned') {
        await saveCardRating(cards[index].id, 'good', difficult);
        cards[index].studyRating = 'good';
        cards[index].memorized = true;
        cards[index].dueForReview = false;
        ratings.push('good');
        showStatusNotice('right', 'Thuộc', 'learned');
        if (index === cards.length - 1) await finish();
        else await transitionToCard(index + 1, 'right');
      }
      if (action === 'next') {
        if (index === cards.length - 1) await finish();
        else await transitionToCard(index + 1, 'right');
      }
      if (action === 'speak-sentence') toggleSpeech(actionElement, cards[index].example);
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
      if (action === 'restart') {
        sessionView.hidden = true;
        setup.hidden = false;
        message.textContent = '';
      }
      if (action === 'exit') {
        const confirmed = await showConfirm('Bạn có chắc muốn thoát khỏi buổi học này?', {
          title: 'Thoát buổi học?',
          confirmLabel: 'Thoát',
          iconImage: 'image/nút xóa.png',
        });
        if (confirmed) {
          cancelSpeech();
          sessionView.hidden = true;
          setup.hidden = false;
          message.textContent = '';
        }
      }
    } catch (error) {
      console.error('Không thể xử lý phiên học:', error);
      message.textContent = `Không thể tiếp tục phiên học: ${error.message}`;
    } finally {
      if (isPersistentCardAction) cardActionPending = false;
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
    sessionView.innerHTML = `<div class="study-session-header"><button class="secondary-button study-exit-button" data-study-action="exit" type="button">Thoát</button></div><div class="quiz-result ${correct ? 'is-correct' : 'is-incorrect'}"><h2>${correct ? 'Chính xác!' : 'Chưa đúng'}</h2><p>Đáp án đúng: <strong>${escapeForDisplay(expected)}</strong></p><p>Nghĩa: ${escapeForDisplay(card.meaning)}</p><button class="primary-button" data-study-action="next-question" type="button">${index === cards.length - 1 ? 'Xem tổng kết' : 'Câu tiếp theo'}</button></div>`;
  });

  view.addEventListener('click', async (event) => {
    if (event.target.matches('[data-study-action="next-question"]')) await advance();
  });
}