export function renderSettings() {
  return `
    <header class="page-header"><div><p class="eyebrow">CÁ NHÂN HÓA</p><h1>Cài đặt</h1></div></header>
    <section class="settings-card">
      <div class="section-heading"><div><p class="eyebrow">MỤC TIÊU HỌC TẬP</p><h2>Số từ cần học mỗi ngày</h2></div></div>
      <form class="daily-goal-form" data-daily-goal-form>
        <label for="daily-word-goal">Mục tiêu từ cần học mỗi ngày</label>
        <div class="daily-goal-controls"><input id="daily-word-goal" name="dailyWordGoal" data-daily-word-goal type="number" min="1" max="999" step="1" required><button class="primary-button save-button" type="submit" aria-label="Lưu mục tiêu" title="Lưu mục tiêu"><img src="image/lưu.png" alt=""></button></div>
      </form>
    </section>
    <section class="settings-card" data-sync-panel>
      <div class="section-heading"><div><p class="eyebrow">ĐỒNG BỘ THIẾT BỊ</p><h2>Dữ liệu chung</h2></div><span class="status-pill" data-sync-status>Đang kết nối</span></div>
      <p class="form-help">Dữ liệu đồng bộ là bộ dữ liệu chung, mọi người dùng ứng dụng có thể xem và thay đổi.</p>
      <div class="backup-actions" data-sync-account>
        <button class="secondary-button" data-sync-action="sync" type="button">Đồng bộ ngay</button>
      </div>
      <p class="notice" data-sync-message role="status" aria-live="polite" hidden></p>
    </section>
    <section class="settings-card speech-settings-card">
      <div class="section-heading"><div><p class="eyebrow">PHÁT ÂM</p><h2>Giọng đọc mặc định</h2></div></div>
      <div class="speech-preferences">
        <label>Giọng đọc<select data-speech-voice><option value="">Giọng mặc định</option></select></label>
        <div class="speech-rate-row">
          <label>Tốc độ đọc <output data-speech-rate-value>1.0x</output><input data-speech-rate type="range" min="0.5" max="2" step="0.1" value="1"></label>
          <button class="secondary-button speech-preview-button speech-image-button" data-speech-action="preview" type="button" aria-label="Nghe thử"><img src="image/logo trên sidebar2.png" alt=""></button>
        </div>
      </div>
    </section>
    <section class="settings-card" data-backup-panel>
      <div class="section-heading"><div><p class="eyebrow">DỮ LIỆU</p><h2>Sao lưu và khôi phục</h2></div></div>
      <div class="backup-actions"><button class="primary-button" data-backup-action="export-json" type="button">Xuất toàn bộ JSON</button><button class="secondary-button" data-backup-action="export-csv" type="button">Xuất từ vựng CSV</button><button class="danger-button" data-backup-action="clear-notes" type="button">Xóa tất cả ghi chú</button></div>
      <fieldset class="backup-scope"><legend>Phạm vi JSON tùy chọn</legend><label><input data-backup-scope value="vocabulary" type="checkbox" checked> Từ vựng</label><label><input data-backup-scope value="sentences" type="checkbox" checked> Câu giao tiếp</label><label><input data-backup-scope value="wordSets" type="checkbox" checked> Bộ từ</label><label><input data-backup-scope value="studySessions" type="checkbox" checked> Lịch sử học</label><label><input data-backup-scope value="settings" type="checkbox" checked> Cài đặt</label></fieldset>
      <div class="backup-import"><label class="file-picker">Chọn tệp JSON<input data-backup-file type="file" accept=".json,application/json"></label><div class="backup-preview" data-backup-preview></div><div class="backup-actions"><button class="secondary-button" data-backup-action="import-merge" type="button" disabled>Gộp dữ liệu</button><button class="danger-button" data-backup-action="import-replace" type="button" disabled>Thay thế dữ liệu</button></div></div>
    </section>
    <section class="settings-card">
      <div class="section-heading"><div><p class="eyebrow">ỨNG DỤNG CÁ NHÂN</p><h2>Lưu nội bộ trên thiết bị</h2></div><span class="status-pill">Ngoại tuyến</span></div>
    </section>
  `;
}