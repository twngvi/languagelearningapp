function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

export function renderVocabulary() {
  return `
    <header class="page-header">
      <div><p class="eyebrow">KHO TỪ VỰNG</p><h1>Từ vựng</h1></div>
    </header>
    <form class="vocabulary-form" data-vocabulary-form hidden>
      <div class="section-heading"><h2 data-vocabulary-form-title>Thêm từ mới</h2><button class="close-button" data-vocabulary-action="cancel" type="button" aria-label="Đóng biểu mẫu">×</button></div>
      <input type="hidden" name="id">
      <div class="form-grid">
        <div class="translation-pair">
          <div class="translation-field"><label><span data-word-label>Từ tiếng Anh *</span><input name="word" required></label></div>
          <button class="language-swap-button" data-vocabulary-action="swap-language" type="button" aria-label="Đổi chiều dịch" title="Đổi chiều dịch"><span aria-hidden="true">↔</span><small>Đổi chiều</small></button>
          <div class="translation-field"><label><span data-meaning-label>Nghĩa tiếng Việt *</span><input name="meaning" required></label></div>
        </div>
        <label>Phiên âm<input name="pronunciation" placeholder="/.../"></label>
        <div class="word-set-picker" data-word-set-picker>
          <span class="field-label">Bộ từ</span>
          <button class="word-set-picker-trigger" data-word-set-toggle type="button">Chọn bộ từ</button>
          <div class="word-set-picker-menu" data-word-set-menu hidden>
            <input data-word-set-search type="search" placeholder="Tìm bộ từ..." aria-label="Tìm bộ từ">
            <div class="word-set-picker-options" data-word-set-options></div>
            <div class="word-set-create"><input data-word-set-new placeholder="Tên bộ mới"><button class="secondary-button" data-word-set-create type="button">+ Tạo bộ</button></div>
          </div>
          <input name="wordSet" type="hidden">
          <input name="wordSetIds" type="hidden">
        </div>
        <label>Chủ đề<input name="topic"></label>
        <label>Ví dụ<input name="example"></label>
        <label class="wide-field">Ghi chú<input name="notes"></label>
      </div>
      <div class="lookup-result" data-lookup-result role="status" aria-live="polite"></div>
      <div class="speech-controls"><button class="secondary-button" data-vocabulary-action="lookup" type="button">Tra cứu English</button><button class="secondary-button speech-image-button" data-vocabulary-action="speak-form" type="button" aria-label="Phát âm"><img src="image/logo trên sidebar2.png" alt=""></button><label>Giọng đọc<select name="voice"><option value="">Giọng mặc định</option></select></label><label>Tốc độ<input name="rate" type="range" min="0.5" max="2" step="0.1" value="1"></label></div>
      <div class="form-checks"><label><input name="favorite" type="checkbox"> Yêu thích</label><label><input name="difficult" type="checkbox"> Từ khó</label><label><input name="dueForReview" type="checkbox"> Cần ôn</label></div>
      <div class="form-actions"><button class="secondary-button" data-vocabulary-action="cancel" type="button">Hủy</button><button class="primary-button" type="submit">Lưu từ</button></div>
    </form>
    <form class="vocabulary-form" data-bulk-form hidden><div class="section-heading"><h2>Nhập hàng loạt</h2><button class="close-button" data-vocabulary-action="cancel-bulk" type="button">×</button></div><p class="form-help">Mỗi dòng dùng dạng <code>word - nghĩa</code>. Dấu gạch ngang trong nội dung vẫn được giữ nguyên nếu không có khoảng trắng hai bên.</p><textarea name="bulkText" rows="6" placeholder="achieve - đạt được&#10;improve - cải thiện" required></textarea><div class="form-actions"><button class="primary-button" type="submit">Xem trước và lưu</button></div></form>
    <form class="vocabulary-form word-set-form" data-set-form hidden><div class="section-heading"><h2>Bộ từ</h2><button class="close-button" data-vocabulary-action="cancel-set" type="button">×</button></div><input type="hidden" name="id"><div class="form-grid"><label>Tên bộ từ *<input name="name" required></label><label>Mô tả<input name="description"></label><fieldset class="color-field"><legend>Màu thẻ</legend><input type="hidden" name="color" value="#f6c1d1"><div class="color-palette" role="radiogroup" aria-label="Chọn màu cho bộ từ">${['#f6c1d1', '#f8d7b5', '#f9edb8', '#d9efc2', '#bfe8d5', '#bde7ee', '#c5ddf6', '#c9d0f4', '#d9c9f3', '#e7c8ee', '#f2c8dc', '#f7d0c4', '#e8d5bd', '#d4dfca', '#c7d9d8', '#e3d3cc'].map((color, index) => `<button class="color-swatch${index === 0 ? ' is-selected' : ''}" type="button" data-set-color="${color}" style="--swatch-color: ${color}" aria-label="Màu ${index + 1}" aria-pressed="${index === 0}"></button>`).join('')}</div></fieldset></div><div class="form-actions"><button class="primary-button" type="submit">Lưu bộ từ</button></div></form>
    <section class="word-sets-section"><div class="section-heading"><h2>Bộ từ</h2><button class="primary-button" data-vocabulary-action="sets" type="button">+ Thêm bộ từ</button></div><div class="word-set-list" data-set-list></div></section>
  `;
}

export function renderVocabularySet(setId) {
  return `
    <header class="page-header">
      <div><p class="eyebrow">BỘ TỪ</p><h1 data-vocabulary-set-title tabindex="0" title="Bấm để sửa tên">Đang tải bộ từ... <span class="record-count" data-vocabulary-set-count>0</span></h1></div>
      <div class="header-actions vocabulary-actions">
        <button class="primary-button vocabulary-action-button vocabulary-action-new" data-set-detail-action="new-word" type="button">+ Thêm từ</button>
        <button class="secondary-button vocabulary-action-button vocabulary-action-bulk" data-set-detail-action="bulk" type="button">Nhập hàng loạt</button>
        <button class="icon-action edit-image-button" data-set-detail-action="edit" type="button" aria-label="Chỉnh sửa bộ từ"><img src="image/Shinam.png" alt=""></button>
        <button class="icon-action delete-image-button" data-set-detail-action="delete" type="button" aria-label="Xóa bộ từ"><img src="image/nút xóa.png" alt=""></button>
        <a class="secondary-button" href="#vocabulary">← Quay lại</a>
      </div>
    </header>
    <section class="vocabulary-list-section vocabulary-set-page">
      <div class="vocabulary-search-row">
        <label class="search-field vocabulary-set-search"><input data-vocabulary-set-search type="search" placeholder="Tìm từ, nghĩa hoặc ghi chú..." aria-label="Tìm kiếm trong bộ từ"><span class="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg></span></label>
        <button class="sort-alpha-button" data-set-detail-action="sort-alpha" type="button" aria-label="Sắp xếp A đến Z" title="Sắp xếp A đến Z"><span aria-hidden="true">↑</span></button>
        <div class="vocabulary-selection-toolbar" data-vocabulary-selection-toolbar hidden>
        <span data-vocabulary-selected-count>0 từ</span>
        <button class="selection-icon-button" data-set-detail-action="select-all" type="button" aria-label="Chọn tất cả" title="Chọn tất cả">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 12l3 3 6-6"/></svg>
        </button>
        <button class="selection-icon-button" data-set-detail-action="move-selected" type="button" aria-label="Di chuyển từ đã chọn" title="Di chuyển từ đã chọn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
        <button class="selection-icon-button is-delete" data-set-detail-action="delete-selected" type="button" aria-label="Xóa từ đã chọn" title="Xóa từ đã chọn">
          <img src="image/nút xóa.png" alt="">
        </button>
        </div>
      </div>
      <div class="detail-entry-panel">
      <form class="detail-vocabulary-form vocabulary-row" data-detail-vocabulary-form hidden>
        <input type="hidden" name="id">
        <div class="word-main">
          <span class="favorite-button" aria-hidden="true">☆</span>
          <div class="word-info detail-word-info">
            <input name="word" required placeholder="Từ tiếng Anh" aria-label="Từ tiếng Anh">
            <input name="pronunciation" placeholder="/.../" aria-label="Phiên âm">
          </div>
          <input class="word-meaning detail-meaning-field" name="meaning" required placeholder="Nghĩa tiếng Việt" aria-label="Nghĩa tiếng Việt">
        </div>
        <div class="row-actions detail-row-actions"><button class="primary-button" type="submit">Lưu</button><button class="close-button" data-set-detail-action="cancel-new-word" type="button" aria-label="Đóng biểu mẫu">×</button></div>
      </form>
      <form class="vocabulary-form detail-bulk-form" data-detail-bulk-form hidden>
        <div class="section-heading"><h2>Nhập hàng loạt vào bộ này</h2><button class="close-button" data-set-detail-action="cancel-bulk" type="button" aria-label="Đóng biểu mẫu">×</button></div>
        <p class="form-help">Mỗi dòng dùng dạng <code>word - nghĩa</code>.</p>
        <textarea name="bulkText" rows="6" placeholder="achieve - đạt được&#10;improve - cải thiện" required></textarea>
        <div class="form-actions"><button class="primary-button" type="submit">Lưu dữ liệu</button></div>
      </form>
      <form class="vocabulary-form word-set-form detail-edit-form" data-set-detail-form hidden>
        <div class="section-heading"><h2>Chỉnh sửa bộ từ</h2><button class="close-button" data-set-detail-action="cancel-edit" type="button" aria-label="Đóng chỉnh sửa">×</button></div>
        <input type="hidden" name="id">
        <div class="form-grid">
          <label>Tên bộ từ *<input name="name" required></label>
          <label>Mô tả<input name="description"></label>
          <fieldset class="color-field"><legend>Màu thẻ</legend><input type="hidden" name="color" value="#f6c1d1"><div class="color-palette" role="radiogroup" aria-label="Chọn màu cho bộ từ">${['#f6c1d1', '#f8d7b5', '#f9edb8', '#d9efc2', '#bfe8d5', '#bde7ee', '#c5ddf6', '#c9d0f4', '#d9c9f3', '#e7c8ee', '#f2c8dc', '#f7d0c4', '#e8d5bd', '#d4dfca', '#c7d9d8', '#e3d3cc'].map((color, index) => `<button class="color-swatch${index === 0 ? ' is-selected' : ''}" type="button" data-detail-set-color="${color}" style="--swatch-color: ${color}" aria-label="Màu ${index + 1}" aria-pressed="${index === 0}"></button>`).join('')}</div></fieldset>
        </div>
        <div class="form-actions"><button class="primary-button" type="submit"><img src="image/Shinam.png" alt=""> Lưu thay đổi</button></div>
      </form>
      </div>
      <div class="vocabulary-list" data-vocabulary-set-list data-set-id="${escapeHtml(setId)}"><p class="empty-state">Đang tải dữ liệu...</p></div>
    </section>
  `;
}

export function vocabularyRow(record, { selectable = false } = {}) {
  return `
    <article class="vocabulary-row" data-vocabulary-id="${escapeHtml(record.id)}">
      <div class="word-main">${selectable ? `<label class="vocabulary-select-checkbox"><input type="checkbox" data-vocabulary-select="${escapeHtml(record.id)}" aria-label="Chọn ${escapeHtml(record.word)}"></label>` : ''}<button class="favorite-button ${record.favorite ? 'is-favorite' : ''}" data-vocabulary-action="favorite" type="button" aria-label="${record.favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">${record.favorite ? '★' : '☆'}</button><div class="word-info"><h3>${escapeHtml(record.word)}</h3><p>${escapeHtml(record.pronunciation || 'Chưa có phiên âm')}</p>${record.example ? `<small>“${escapeHtml(record.example)}”</small>` : ''}</div><strong class="word-meaning">${escapeHtml(record.meaning)}</strong></div>
    <div class="word-meta">${record.memorized ? '<span class="word-status memorized">Đã nhớ</span>' : '<span class="word-status">Đang học</span>'}${record.difficult ? '<span class="word-status difficult">Từ khó</span>' : ''}${record.dueForReview ? '<span class="word-status review">Cần ôn</span>' : ''}</div>
    <div class="row-actions"><button class="secondary-button speech-image-button" data-vocabulary-action="speak" type="button" aria-label="Phát âm"><img src="image/logo trên sidebar2.png" alt=""></button><button class="icon-action edit-image-button" data-vocabulary-action="edit" type="button" aria-label="Sửa từ"><img src="image/Shinam.png" alt=""></button><button class="icon-action delete-image-button" data-vocabulary-action="delete" type="button" aria-label="Xóa từ"><img src="image/nút xóa.png" alt=""></button></div>
    </article>`;
}