export function renderHome() {
  return `
    <header class="page-header">
      <div>
        <p class="eyebrow">KHÔNG GIAN HỌC TẬP</p>
        <h1>Xin chào, bạn!</h1>
        <p class="header-subtitle">Sẵn sàng học thêm một chút tiếng Anh hôm nay?</p>
      </div>
      <button class="icon-button" type="button" aria-label="Mở thông báo">♢</button>
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