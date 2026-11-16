export function renderStudySessionDetail(sessionId) {
  const safeSessionId = String(sessionId).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));

  return `
    <header class="page-header">
      <div><p class="eyebrow">LỊCH SỬ HỌC</p><h1>Chi tiết buổi học</h1></div>
      <a class="text-link" href="#progress">Quay lại tiến độ</a>
    </header>
    <section class="review-list" data-study-session-detail="${safeSessionId}">
      <p class="empty-state">Đang tải chi tiết buổi học...</p>
    </section>
  `;
}
