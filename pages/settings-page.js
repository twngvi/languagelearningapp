export function renderSettings() {
  return `
    <header class="page-header"><div><p class="eyebrow">CÁ NHÂN HÓA</p><h1>Cài đặt</h1><p class="header-subtitle">Điều chỉnh ứng dụng theo cách bạn muốn học.</p></div></header>
    <section class="settings-card">
      <div class="section-heading"><div><p class="eyebrow">ỨNG DỤNG CÁ NHÂN</p><h2>Lưu nội bộ trên thiết bị</h2><p class="header-subtitle">Dữ liệu của bạn được lưu trong trình duyệt, không cần tài khoản và không gửi lên máy chủ.</p></div><span class="status-pill">Ngoại tuyến</span></div>
      <p class="form-help">Bạn có thể cài Shin như một ứng dụng từ menu của Chrome hoặc Edge. Khi dùng trên thiết bị khác, hãy xuất tệp JSON ở bên dưới rồi nhập lại trên thiết bị đó.</p>
      <p class="notice" data-database-status role="status" aria-live="polite">Đang kiểm tra bộ nhớ nội bộ...</p>
    </section>
    <section class="settings-card" data-sync-panel>
      <div class="section-heading"><div><p class="eyebrow">ĐỒNG BỘ THIẾT BỊ</p><h2>Supabase</h2><p class="header-subtitle">Đăng nhập bằng email để dùng chung dữ liệu trên máy tính và điện thoại.</p></div><span class="status-pill" data-sync-status>Chưa đăng nhập</span></div>
      <form data-sync-login-form class="sync-login-form">
        <label class="sync-email-field" for="sync-email"><span>Email dùng chung</span><input id="sync-email" name="email" type="email" autocomplete="email" placeholder="ban@example.com" required></label>
        <button class="primary-button" type="submit">Gửi link đăng nhập</button>
      </form>
      <div class="backup-actions" data-sync-account hidden>
        <button class="secondary-button" data-sync-action="sync" type="button">Đồng bộ ngay</button>
        <button class="danger-button" data-sync-action="sign-out" type="button">Đăng xuất</button>
      </div>
      <p class="notice" data-sync-message role="status" aria-live="polite"></p>
    </section>
    <section class="settings-card" data-backup-panel>
      <div class="section-heading"><div><p class="eyebrow">DỮ LIỆU</p><h2>Sao lưu và khôi phục</h2><p class="header-subtitle">Chuyển dữ liệu học tập giữa các thiết bị bằng tệp JSON.</p></div></div>
      <div class="backup-actions"><button class="primary-button" data-backup-action="export-json" type="button">Xuất toàn bộ JSON</button><button class="secondary-button" data-backup-action="export-csv" type="button">Xuất từ vựng CSV</button></div>
      <fieldset class="backup-scope"><legend>Phạm vi JSON tùy chọn</legend><label><input data-backup-scope value="vocabulary" type="checkbox" checked> Từ vựng</label><label><input data-backup-scope value="sentences" type="checkbox" checked> Câu giao tiếp</label><label><input data-backup-scope value="wordSets" type="checkbox" checked> Bộ từ</label><label><input data-backup-scope value="studySessions" type="checkbox" checked> Lịch sử học</label><label><input data-backup-scope value="settings" type="checkbox" checked> Cài đặt</label></fieldset>
      <p class="form-help">Bản sao lưu JSON gồm từ vựng, câu giao tiếp, bộ từ, lịch sử học và cài đặt. Bản ghi âm không được đưa vào tệp văn bản; chúng chỉ lưu cục bộ trên thiết bị này.</p>
      <div class="backup-import"><label class="file-picker">Chọn tệp JSON<input data-backup-file type="file" accept=".json,application/json"></label><div class="backup-preview" data-backup-preview></div><div class="backup-actions"><button class="secondary-button" data-backup-action="import-merge" type="button" disabled>Gộp dữ liệu</button><button class="danger-button" data-backup-action="import-replace" type="button" disabled>Thay thế dữ liệu</button></div></div>
      <p class="notice" data-backup-message role="status" aria-live="polite"></p>
    </section>
  `;
}