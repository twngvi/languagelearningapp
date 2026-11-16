import { STORES, getAllRecords, getRecord } from './db.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

const sessionModeLabels = {
  flashcard: 'Flashcard',
  choose: 'Listen and Choose',
  type: 'Listen and Type',
  blank: 'Fill in the Blank',
};

export async function initializeStudySessionDetail() {
  const content = document.querySelector('[data-study-session-detail]');
  try {
    const [session, vocabulary] = await Promise.all([
      getRecord(STORES.studySessions, content.dataset.studySessionDetail),
      getAllRecords(STORES.vocabulary),
    ]);
    if (!session) throw new Error('Không tìm thấy buổi học này.');

    const wordsById = new Map(vocabulary.map((record) => [record.id, record]));
    const cardRows = (session.cardIds || []).map((id) => {
      const word = wordsById.get(id);
      return `<article class="review-item"><div><strong>${escapeHtml(word?.word || 'Từ đã xóa')}</strong><span>${escapeHtml(word?.meaning || 'Từ vựng không còn trong danh sách.')}</span></div></article>`;
    }).join('');
    const completedAt = new Date(session.completedAt || session.createdAt);
    const completedDate = Number.isNaN(completedAt.getTime())
      ? 'Không rõ thời gian'
      : completedAt.toLocaleString('vi-VN');

    content.innerHTML = `
      <div class="study-session-detail-summary">
        <h2>${escapeHtml(sessionModeLabels[session.mode] || session.mode || 'Buổi học')}</h2>
        <p>${Number(session.totalCards) || 0} thẻ · ${Number(session.durationSeconds) || 0} giây</p>
        <p>${completedDate}</p>
      </div>
      <h2>Từ trong buổi học</h2>
      ${cardRows || '<p class="empty-state">Buổi học này không có danh sách từ.</p>'}`;
  } catch (error) {
    console.error('Không thể tải chi tiết buổi học:', error);
    content.innerHTML = `<p class="empty-state">Không thể tải chi tiết buổi học: ${escapeHtml(error.message)}</p>`;
  }
}
