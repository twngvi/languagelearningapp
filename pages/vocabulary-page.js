function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

export function renderVocabulary() {
  return `
    <header class="page-header">
      <div><p class="eyebrow">KHO TỪ VỰNG</p><h1>Từ vựng</h1></div>
      <div class="header-actions"><button class="secondary-button" data-vocabulary-action="bulk" type="button">Nhập hàng loạt</button><button class="secondary-button" data-vocabulary-action="sets" type="button">Quản lý bộ từ</button><button class="primary-button" data-vocabulary-action="new" type="button">+ Thêm từ</button></div>
    </header>
    <section class="vocabulary-toolbar" aria-label="Tìm kiếm và lọc từ vựng">
      <label class="search-field"><span aria-hidden="true">⌕</span><input data-vocabulary-search type="search" placeholder="Tìm từ, nghĩa hoặc ghi chú..." aria-label="Tìm kiếm từ vựng"></label>
      <select data-vocabulary-filter="wordSet" aria-label="Lọc theo bộ từ"><option value="">Tất cả bộ từ</option></select>
      <select data-vocabulary-filter="topic" aria-label="Lọc theo chủ đề"><option value="">Tất cả chủ đề</option></select>
      <label class="check-filter"><input data-vocabulary-filter="favorite" type="checkbox"> Yêu thích</label>
      <label class="check-filter"><input data-vocabulary-filter="difficult" type="checkbox"> Từ khó</label>
      <label class="check-filter"><input data-vocabulary-filter="due" type="checkbox"> Cần ôn</label>
    </section>
    <form class="vocabulary-form" data-vocabulary-form hidden>
      <div class="section-heading"><h2 data-vocabulary-form-title>Thêm từ mới</h2><button class="close-button" data-vocabulary-action="cancel" type="button" aria-label="Đóng biểu mẫu">×</button></div>
      <input type="hidden" name="id">
      <div class="form-grid">
        <label>Từ tiếng Anh *<input name="word" required></label>
        <label>Nghĩa tiếng Việt *<input name="meaning" required></label>
        <label>Phiên âm<input name="pronunciation" placeholder="/.../"></label>
        <label>Bộ từ<input name="wordSet"></label>
        <label>Chủ đề<input name="topic"></label>
        <label>Ví dụ<input name="example"></label>
        <label class="wide-field">Ghi chú<input name="notes"></label>
      </div>
      <div class="lookup-result" data-lookup-result role="status" aria-live="polite"></div>
      <div class="speech-controls"><button class="secondary-button" data-vocabulary-action="lookup" type="button">Tra cứu English</button><button class="secondary-button" data-vocabulary-action="speak-form" type="button">🔊 Phát âm</button><label>Giọng đọc<select name="voice"><option value="">Giọng mặc định</option></select></label><label>Tốc độ<input name="rate" type="range" min="0.5" max="2" step="0.1" value="1"></label></div>
      <div class="form-checks"><label><input name="favorite" type="checkbox"> Yêu thích</label><label><input name="difficult" type="checkbox"> Từ khó</label><label><input name="dueForReview" type="checkbox"> Cần ôn</label></div>
      <div class="form-actions"><button class="secondary-button" data-vocabulary-action="cancel" type="button">Hủy</button><button class="primary-button" type="submit">Lưu từ</button></div>
    </form>
    <form class="vocabulary-form" data-bulk-form hidden><div class="section-heading"><h2>Nhập hàng loạt</h2><button class="close-button" data-vocabulary-action="cancel-bulk" type="button">×</button></div><p class="form-help">Mỗi dòng dùng dạng <code>word - nghĩa</code>. Dấu gạch ngang trong nội dung vẫn được giữ nguyên nếu không có khoảng trắng hai bên.</p><textarea name="bulkText" rows="6" placeholder="achieve - đạt được&#10;improve - cải thiện" required></textarea><div class="form-actions"><button class="primary-button" type="submit">Xem trước và lưu</button></div></form>
    <form class="vocabulary-form" data-set-form hidden><div class="section-heading"><h2>Bộ từ</h2><button class="close-button" data-vocabulary-action="cancel-set" type="button">×</button></div><input type="hidden" name="id"><div class="form-grid"><label>Tên bộ từ *<input name="name" required></label><label>Mô tả<input name="description"></label></div><div class="form-actions"><button class="primary-button" type="submit">Lưu bộ từ</button></div></form>
    <section class="word-sets-section"><div class="section-heading"><h2>Bộ từ</h2></div><div class="word-set-list" data-set-list></div></section>
    <section class="vocabulary-list-section"><div class="section-heading"><h2>Danh sách từ <span class="record-count" data-vocabulary-count>0</span></h2></div><div class="vocabulary-list" data-vocabulary-list><p class="empty-state">Đang tải dữ liệu...</p></div></section>
  `;
}

export function vocabularyRow(record) {
  return `
    <article class="vocabulary-row" data-vocabulary-id="${escapeHtml(record.id)}">
      <div class="word-main"><button class="favorite-button ${record.favorite ? 'is-favorite' : ''}" data-vocabulary-action="favorite" type="button" aria-label="${record.favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">${record.favorite ? '★' : '☆'}</button><div><h3>${escapeHtml(record.word)}</h3><p>${escapeHtml(record.pronunciation || 'Chưa có phiên âm')} · ${escapeHtml(record.meaning)}</p>${record.example ? `<small>“${escapeHtml(record.example)}”</small>` : ''}</div></div>
    <div class="word-meta">${record.memorized ? '<span class="word-status memorized">Đã nhớ</span>' : '<span class="word-status">Đang học</span>'}${record.difficult ? '<span class="word-status difficult">Từ khó</span>' : ''}${record.dueForReview ? '<span class="word-status review">Cần ôn</span>' : ''}</div>
    <div class="row-actions"><button class="secondary-button" data-vocabulary-action="speak" type="button">🔊 Nghe</button><button class="icon-action" data-vocabulary-action="edit" type="button" aria-label="Sửa từ">✎</button><button class="icon-action danger" data-vocabulary-action="delete" type="button" aria-label="Xóa từ">×</button></div>
    </article>`;
}