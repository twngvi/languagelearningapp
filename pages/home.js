export function renderHome() {
  return `
    <header class="page-header">
      <div>
        <p class="eyebrow">KHÔNG GIAN HỌC TẬP</p>
        <h1>Xin chào, bạn!</h1>
      </div>
      <button class="icon-button" type="button" aria-label="Mở thông báo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg><span class="icon-button-dot" aria-hidden="true"></span></button>
    </header>
    <section class="home-dashboard" data-home-content>
      <p class="empty-state">Đang tải dữ liệu học tập...</p>
    </section>
    <section class="notice" aria-label="Thông báo">
      <span class="notice-icon" aria-hidden="true">i</span>
      <div>
        <strong>Chào mừng đến với không gian học của bạn</strong>
        <p>Các chức năng học tập sẽ được bổ sung trong những bước tiếp theo.</p>
      </div>
      <button class="close-button" type="button" aria-label="Đóng thông báo">×</button>
    </section>
  `;
}