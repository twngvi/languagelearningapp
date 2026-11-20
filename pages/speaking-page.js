export function renderSpeaking() {
  return `
    <header class="page-header">
      <div><p class="eyebrow">KHO CÂU GIAO TIẾP</p><h1>Luyện nói</h1></div>
      <div class="header-actions speaking-header-actions">
        <button class="secondary-button" data-sentence-action="resume" type="button" hidden>Tiếp tục luyện</button>
        <button class="primary-button vocabulary-action-button" data-sentence-action="new" type="button" aria-label="Thêm câu" title="Thêm câu"><img src="image/nút them từ.png" alt=""></button>
        <button class="secondary-button vocabulary-action-button" data-sentence-action="bulk" type="button" aria-label="Nhập hàng loạt" title="Nhập hàng loạt"><img src="image/nút nhap hang loat.png" alt=""></button>
      </div>
    </header>
    <section class="speaking-setup" data-speaking-setup aria-label="Thiết lập buổi luyện nói">
      <div><p class="eyebrow">LUYỆN THEO DANH SÁCH</p><h2>Luyện nói theo câu mẫu</h2></div>
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
        <div class="translation-pair translation-pair-sentence">
          <div class="translation-field"><label><span data-english-label>Câu tiếng Anh *</span><textarea name="english" rows="2" required></textarea></label></div>
          <div class="translation-field"><label><span data-vietnamese-label>Bản dịch tiếng Việt *</span><textarea name="vietnamese" rows="2" required></textarea></label></div>
        </div>
        <label>Chủ đề<input name="topic" list="sentence-topics" placeholder="Ví dụ: Du lịch"></label>
        <input type="hidden" name="notes">
      </div>
      <div class="lookup-result" data-sentence-translation-result role="status" aria-live="polite"></div>
      <datalist id="sentence-topics"><option value="Giao tiếp hằng ngày"><option value="Giới thiệu bản thân"><option value="Du lịch"><option value="Mua sắm"><option value="Công việc"><option value="Học tập"></datalist>
      <div class="speech-controls sentence-speech-controls"><button class="language-swap-button" data-sentence-action="swap-language" type="button" aria-label="Đổi chiều dịch" title="Đổi chiều dịch"><img src="image/2.png" alt=""></button><button class="secondary-button speech-image-button" data-sentence-action="speak-form" type="button" aria-label="Phát âm"><img src="image/logo trên sidebar2.png" alt=""></button><label class="sentence-rate-control"><select name="rate" aria-label="Tốc độ phát âm"><option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label><div class="form-checks sentence-form-checks"><label class="sentence-favorite-toggle" title="Yêu thích"><input name="favorite" type="checkbox" aria-label="Yêu thích"><span aria-hidden="true"></span></label></div><div class="form-actions sentence-form-actions"><button class="secondary-button" data-sentence-action="cancel" type="button">Hủy</button><button class="primary-button" type="submit">Lưu câu</button></div></div>
    </form>
    <form class="vocabulary-form" data-sentence-bulk-form hidden>
      <div class="section-heading"><h2>Nhập hàng loạt câu</h2><button class="close-button" data-sentence-action="cancel-bulk" type="button" aria-label="Đóng biểu mẫu">×</button></div>
      <textarea name="bulkText" rows="7" placeholder="How are you today? - Hôm nay bạn khỏe không?&#10;Could you help me, please? - Bạn có thể giúp tôi không?" required></textarea>
      <div class="form-actions sentence-bulk-form-actions"><button class="secondary-button" data-sentence-action="cancel-bulk" type="button">Hủy</button><button class="primary-button" type="submit">Xem trước và lưu</button></div>
    </form>
    <section class="vocabulary-list-section"><div class="section-heading"><h2>Danh sách câu <span class="record-count" data-sentence-count>0</span></h2></div><div class="sentence-list" data-sentence-list><p class="empty-state">Đang tải dữ liệu...</p></div></section>
    </section>
  `;
}
