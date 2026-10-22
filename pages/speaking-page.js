export function renderSpeaking() {
  return `
    <header class="page-header">
      <div><p class="eyebrow">KHO CÂU GIAO TIẾP</p><h1>Luyện nói</h1><p class="header-subtitle">Lưu, tìm kiếm và luyện nghe những câu tiếng Anh của riêng bạn.</p></div>
      <div class="header-actions"><button class="secondary-button" data-sentence-action="resume" type="button" hidden>Tiếp tục luyện</button><button class="secondary-button" data-sentence-action="bulk" type="button">Nhập hàng loạt</button><button class="primary-button" data-sentence-action="new" type="button">+ Thêm câu</button></div>
    </header>
    <div class="notice" data-sentence-message role="status" aria-live="polite"></div>
    <section class="speaking-setup" data-speaking-setup aria-label="Thiết lập buổi luyện nói">
      <div><p class="eyebrow">LUYỆN THEO DANH SÁCH</p><h2>Luyện nói theo câu mẫu</h2><p class="header-subtitle">Nghe câu mẫu, nói theo và tự đánh dấu tiến độ.</p></div>
      <div class="form-grid">
        <label>Chủ đề<select data-speaking-topic><option value="">Tất cả chủ đề</option></select></label>
        <label>Số câu<select data-speaking-amount><option value="5">5 câu</option><option value="10" selected>10 câu</option><option value="20">20 câu</option><option value="all">Tất cả</option></select></label>
        <label>Chế độ luyện<select data-speaking-mode><option value="repeat">Listen and Repeat</option><option value="shadowing">Shadowing</option><option value="recall">Recall the Sentence</option></select></label>
      </div>
      <button class="primary-button" data-sentence-action="start-speaking" type="button">Bắt đầu luyện nói</button>
    </section>
    <section class="speaking-practice" data-speaking-practice hidden></section>
    <section data-speaking-library>
    <section class="vocabulary-toolbar" aria-label="Tìm kiếm và lọc câu">
      <label class="search-field"><span aria-hidden="true">⌕</span><input data-sentence-search type="search" placeholder="Tìm câu, bản dịch hoặc ghi chú..." aria-label="Tìm kiếm câu"></label>
      <select data-sentence-filter="topic" aria-label="Lọc theo chủ đề"><option value="">Tất cả chủ đề</option></select>
      <label class="check-filter"><input data-sentence-filter="favorite" type="checkbox"> Yêu thích</label>
      <label class="check-filter"><input data-sentence-filter="unpracticed" type="checkbox"> Chưa luyện</label>
      <label class="check-filter"><input data-sentence-filter="due" type="checkbox"> Cần luyện lại</label>
    </section>
    <form class="vocabulary-form" data-sentence-form hidden>
      <div class="section-heading"><h2 data-sentence-form-title>Thêm câu mới</h2><button class="close-button" data-sentence-action="cancel" type="button" aria-label="Đóng biểu mẫu">×</button></div>
      <div class="form-grid">
        <label class="wide-field">Câu tiếng Anh *<textarea name="english" rows="2" required></textarea></label>
        <label class="wide-field">Bản dịch tiếng Việt *<textarea name="vietnamese" rows="2" required></textarea></label>
        <label>Chủ đề<input name="topic" list="sentence-topics" placeholder="Ví dụ: Du lịch"></label>
        <label class="wide-field">Ghi chú<input name="notes"></label>
      </div>
      <datalist id="sentence-topics"><option value="Giao tiếp hằng ngày"><option value="Giới thiệu bản thân"><option value="Du lịch"><option value="Mua sắm"><option value="Công việc"><option value="Học tập"></datalist>
      <div class="speech-controls"><button class="secondary-button" data-sentence-action="speak-form" type="button">🔊 Phát âm</button><label>Giọng đọc<select name="voice"><option value="">Giọng mặc định</option></select></label><label>Tốc độ<input name="rate" type="range" min="0.5" max="2" step="0.1" value="1"></label></div>
      <div class="form-checks"><label><input name="favorite" type="checkbox"> Yêu thích</label></div>
      <div class="form-actions"><button class="secondary-button" data-sentence-action="cancel" type="button">Hủy</button><button class="primary-button" type="submit">Lưu câu</button></div>
    </form>
    <form class="vocabulary-form" data-sentence-bulk-form hidden>
      <div class="section-heading"><h2>Nhập hàng loạt câu</h2><button class="close-button" data-sentence-action="cancel-bulk" type="button" aria-label="Đóng biểu mẫu">×</button></div>
      <p class="form-help">Mỗi dòng dùng dạng <code>câu tiếng Anh - bản dịch tiếng Việt</code>. Có thể dùng dấu gạch ngang trong nội dung nếu không có khoảng trắng hai bên.</p>
      <textarea name="bulkText" rows="7" placeholder="How are you today? - Hôm nay bạn khỏe không?&#10;Could you help me, please? - Bạn có thể giúp tôi không?" required></textarea>
      <div class="form-actions"><button class="secondary-button" data-sentence-action="cancel-bulk" type="button">Hủy</button><button class="primary-button" type="submit">Xem trước và lưu</button></div>
    </form>
    <section class="vocabulary-list-section"><div class="section-heading"><h2>Danh sách câu <span class="record-count" data-sentence-count>0</span></h2></div><div class="sentence-list" data-sentence-list><p class="empty-state">Đang tải dữ liệu...</p></div></section>
    </section>
  `;
}
