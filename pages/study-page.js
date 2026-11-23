function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function renderStudyExit() {
  return '<div class="study-session-header"><button class="secondary-button study-exit-button" data-study-action="exit" type="button" aria-label="Thoát buổi học" title="Thoát buổi học"><span aria-hidden="true">←</span></button></div>';
}

export function renderStudy() {
  return `
    <header class="page-header"><div><p class="eyebrow">LUYỆN TẬP</p><h1>Kiểm tra từ vựng</h1></div></header>
    <section class="study-setup" data-study-setup>
      <div class="section-heading"><div><p class="eyebrow">BẮT ĐẦU PHIÊN HỌC</p><h2>Chọn cách học</h2></div></div>
      <div class="study-modes" role="tablist" aria-label="Chế độ luyện tập">
        <button class="study-mode is-selected" data-study-action="mode" data-study-mode="flashcard" type="button">Flashcard<small>Nhớ nghĩa trước khi lật thẻ</small></button>
        <button class="study-mode" data-study-action="mode" data-study-mode="choose" type="button">Listen and Choose<small>Nghe và chọn nghĩa</small></button>
        <button class="study-mode" data-study-action="mode" data-study-mode="type" type="button">Listen and Type<small>Nghe và gõ từ</small></button>
        <button class="study-mode" data-study-action="mode" data-study-mode="blank" type="button">Fill in the Blank<small>Điền từ vào câu</small></button>
      </div>
      <div class="form-grid">
        <label>Bộ từ<select data-study-set><option value="">Tất cả từ vựng</option></select></label>
        <div class="study-preferences-row">
          <label>Số lượng thẻ<select data-study-amount><option value="5">5 thẻ</option><option value="10" selected>10 thẻ</option><option value="20">20 thẻ</option></select></label>
          <label>Chiều học<select data-study-direction><option value="en-vi">English → Tiếng Việt</option><option value="vi-en">Tiếng Việt → English</option></select></label>
        </div>
      </div>
      <p class="study-message" data-study-message></p>
      <div class="study-start-row"><button class="primary-button study-start-button" data-study-action="start" type="button"><img class="study-start-character" src="image/nútbatdauhoc.png" alt=""><span>Bắt đầu học</span></button></div>
    </section>
    <section class="study-session" data-study-session hidden></section>
  `;
}

export function renderStudyCard(card, direction, index, total, flipped = false, difficult = false, autoPlayEnabled = true) {
  const front = direction === 'en-vi' ? card.word : card.meaning;
  const answer = direction === 'en-vi' ? card.meaning : card.word;
  return `
    ${renderStudyExit()}
    <div class="study-progress">Thẻ ${index + 1} / ${total}</div>
    <div class="flashcard-scene">
      <div class="flashcard-status-notice" data-status-notice="left" aria-live="polite" hidden></div>
      <div class="flashcard-status-notice" data-status-notice="right" aria-live="polite" hidden></div>
      <div class="flashcard-stage">
        <button class="flashcard ${flipped ? 'is-flipped' : ''}" data-study-action="flip" type="button" aria-label="${flipped ? 'Lật về mặt gợi nhớ' : 'Lật để xem đáp án'}">
          <span class="flashcard-inner">
            <span class="flashcard-face flashcard-front"><small>Gợi nhớ</small><strong>${escapeHtml(front)}</strong><em>Nhấn để xem đáp án</em></span>
            <span class="flashcard-face flashcard-back"><small>Đáp án</small><strong>${escapeHtml(answer)}</strong><span>${escapeHtml(card.pronunciation || 'Chưa có phiên âm')}</span>${card.example ? `<em>“${escapeHtml(card.example)}”</em>` : ''}</span>
          </span>
        </button>
      </div>
      <button class="flashcard-autoplay ${autoPlayEnabled ? 'is-enabled' : ''}" data-study-action="autoplay" type="button" aria-label="Tự động phát âm: ${autoPlayEnabled ? 'bật' : 'tắt'}" aria-pressed="${autoPlayEnabled}" title="Bật/tắt tự động phát âm">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 9v6h4l5 4V5L7 9H3z"></path>
          ${autoPlayEnabled ? '<path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"></path>' : '<path d="m16 9 5 6m0-6-5 6"></path>'}
        </svg>
      </button>
    </div>
    <div class="study-actions flashcard-controls">
      <button class="flashcard-control" data-study-action="previous" type="button" aria-label="Từ trước">&lt;&lt;</button>
      <button class="flashcard-control ${card.studyRating === 'forgotten' ? 'is-selected' : ''}" data-study-action="unlearned" type="button" aria-label="Chưa học" aria-pressed="${card.studyRating === 'forgotten'}">&lt;</button>
      <button class="flashcard-control flashcard-speak speech-image-button" data-study-action="speak" type="button" aria-label="Phát âm từ"><img src="image/logo trên sidebar2.png" alt=""></button>
      <button class="flashcard-control ${card.studyRating === 'good' ? 'is-selected' : ''}" data-study-action="learned" type="button" aria-label="Đã học" aria-pressed="${card.studyRating === 'good'}">&gt;</button>
      <button class="flashcard-control" data-study-action="next" type="button" aria-label="Từ tiếp theo">&gt;&gt;</button>
      <button class="flashcard-control flashcard-difficult ${difficult ? 'is-selected' : ''}" data-study-action="difficult" type="button" aria-label="${difficult ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó'}">🚩</button>
    </div>
  `;
}

export function renderChooseQuestion(card, options, index, total) {
  return `${renderStudyExit()}<div class="study-progress">Câu ${index + 1} / ${total}</div><div class="quiz-prompt"><small>NGHE VÀ CHỌN NGHĨA</small><h2>Nghe từ rồi chọn đáp án</h2><button class="primary-button speech-image-button" data-study-action="speak" type="button" aria-label="Phát âm từ"><img src="image/logo trên sidebar2.png" alt=""></button></div><div class="answer-options">${options.map((option) => `<button class="answer-option" data-quiz-answer="${escapeHtml(option.id)}" type="button">${escapeHtml(option.meaning)}</button>`).join('')}</div>`;
}

export function renderTypeQuestion(card, index, total) {
  return `${renderStudyExit()}<div class="study-progress">Câu ${index + 1} / ${total}</div><div class="quiz-prompt"><small>NGHE VÀ GÕ TỪ</small><h2>Nghe và nhập từ tiếng Anh</h2><button class="primary-button speech-image-button" data-study-action="speak" type="button" aria-label="Phát âm từ"><img src="image/logo trên sidebar2.png" alt=""></button></div><form class="quiz-form" data-quiz-form><input data-quiz-input autocomplete="off" aria-label="Câu trả lời" placeholder="Nhập từ bạn nghe được" required><button class="primary-button" type="submit">Kiểm tra</button></form>`;
}

export function renderBlankQuestion(card, index, total) {
  const sentence = card.example.replace(new RegExp(card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____');
  return `${renderStudyExit()}<div class="study-progress">Câu ${index + 1} / ${total}</div><div class="quiz-prompt"><small>FILL IN THE BLANK</small><h2>Điền từ còn thiếu</h2><p class="sentence-prompt">${escapeHtml(sentence)}</p><p class="meaning-hint">${escapeHtml(card.meaning)}</p></div><form class="quiz-form" data-quiz-form><input data-quiz-input autocomplete="off" aria-label="Từ còn thiếu" placeholder="Nhập từ còn thiếu" required><button class="primary-button" type="submit">Kiểm tra</button></form><button class="secondary-button speech-image-button" data-study-action="speak-sentence" type="button" aria-label="Phát âm cả câu"><img src="image/logo trên sidebar2.png" alt=""></button>`;
}