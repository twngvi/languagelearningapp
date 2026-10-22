import { backupSummary, exportJson, exportVocabularyCsv, importBackup, readBackupFile } from './backup.js';
import { showConfirm } from './notifications.js';

export function initializeBackupPage() {
  const view = document.querySelector('#app-view');
  const fileInput = view.querySelector('[data-backup-file]');
  const preview = view.querySelector('[data-backup-preview]');
  const message = view.querySelector('[data-backup-message]');
  const mergeButton = view.querySelector('[data-backup-action="import-merge"]');
  const replaceButton = view.querySelector('[data-backup-action="import-replace"]');
  let backup = null;

  const showMessage = (text, type = 'success') => {
    message.textContent = text;
    message.className = `notice ${type}`;
  };

  fileInput.addEventListener('change', async () => {
    backup = null;
    mergeButton.disabled = true;
    replaceButton.disabled = true;
    preview.textContent = '';
    if (!fileInput.files[0]) return;
    try {
      backup = await readBackupFile(fileInput.files[0]);
      preview.textContent = `Tệp hợp lệ · ${backupSummary(backup)} · Bản xuất lúc ${new Date(backup.exportedAt).toLocaleString('vi-VN')}`;
      mergeButton.disabled = false;
      replaceButton.disabled = false;
    } catch (error) {
      showMessage(error.message, 'error');
    }
  });

  view.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-backup-action]')?.dataset.backupAction;
    try {
      if (action === 'export-json') {
        const stores = [...view.querySelectorAll('[data-backup-scope]:checked')].map((input) => input.value);
        if (!stores.length) throw new Error('Hãy chọn ít nhất một kho dữ liệu để xuất.');
        const backupResult = await exportJson(stores);
        showMessage(`Đã xuất ${backupSummary(backupResult)}.`);
      }
      if (action === 'export-csv') showMessage(`Đã xuất ${await exportVocabularyCsv()} từ vựng.`);
      if (action === 'import-merge' || action === 'import-replace') {
        if (!backup) throw new Error('Hãy chọn tệp sao lưu trước.');
        const mode = action === 'import-replace' ? 'replace' : 'merge';
        const warning = mode === 'replace'
          ? 'Thay thế sẽ xóa dữ liệu hiện tại trong các kho có trong tệp. Bạn đã có bản sao lưu chưa?'
          : 'Các bản ghi trùng ID sẽ được cập nhật. Tiếp tục nhập?';
        if (!await showConfirm(warning, {
          title: mode === 'replace' ? 'Thay thế dữ liệu hiện tại?' : 'Nhập dữ liệu sao lưu?',
          confirmLabel: mode === 'replace' ? 'Thay thế dữ liệu' : 'Tiếp tục nhập',
        })) return;
        const result = await importBackup(backup, mode);
        showMessage(`Đã nhập ${result.imported} bản ghi.`);
        fileInput.value = '';
        preview.textContent = '';
        backup = null;
        mergeButton.disabled = true;
        replaceButton.disabled = true;
      }
    } catch (error) {
      console.error('Không thể xử lý sao lưu:', error);
      showMessage(error.message, 'error');
    }
  });
}
