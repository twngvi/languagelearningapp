import { backupSummary, exportJson, exportVocabularyCsv, importBackup, readBackupFile } from './backup.js';
import { getDatabaseHealth } from './db.js';
import { showConfirm } from './notifications.js';

export function initializeBackupPage() {
  const view = document.querySelector('#app-view');
  const fileInput = view.querySelector('[data-backup-file]');
  const preview = view.querySelector('[data-backup-preview]');
  const message = view.querySelector('[data-backup-message]');
  const mergeButton = view.querySelector('[data-backup-action="import-merge"]');
  const replaceButton = view.querySelector('[data-backup-action="import-replace"]');
  const databaseStatus = view.querySelector('[data-database-status]');
  const loginForm = view.querySelector('[data-sync-login-form]');
  const syncStatus = view.querySelector('[data-sync-status]');
  const syncMessage = view.querySelector('[data-sync-message]');
  const accountActions = view.querySelector('[data-sync-account]');
  let backup = null;
  let cloud;

  const loadCloud = async () => {
    if (cloud) return cloud;
    cloud = {
      ...(await import('./supabase.js')),
      ...(await import('./sync.js')),
    };
    return cloud;
  };

  const showSyncMessage = (text, type = 'success') => {
    syncMessage.textContent = text;
    syncMessage.className = `notice ${type}`;
  };

  const renderAccount = async () => {
    const { getCurrentUser, syncAllLocalData } = await loadCloud();
    const user = await getCurrentUser();
    loginForm.hidden = Boolean(user);
    accountActions.hidden = !user;
    loginForm.style.display = user ? 'none' : '';
    accountActions.style.display = user ? 'flex' : 'none';
    syncStatus.textContent = user ? `Đã đăng nhập: ${user.email}` : 'Chưa đăng nhập';
    if (user) {
      try {
        await syncAllLocalData();
        showSyncMessage('Đã đồng bộ dữ liệu với Supabase.');
      } catch (error) {
        showSyncMessage(error.message, 'error');
      }
    }
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const { requestMagicLink } = await loadCloud();
      await requestMagicLink(new FormData(loginForm).get('email'));
      showSyncMessage('Đã gửi link đăng nhập. Hãy mở email để xác nhận.');
    } catch (error) {
      showSyncMessage(error.message, 'error');
    }
  });
  renderAccount().catch((error) => {
    console.error('Không thể khởi tạo đồng bộ Supabase:', error);
    showSyncMessage('Chưa thể kết nối Supabase. Bạn vẫn có thể dùng database nội bộ.', 'error');
  });

  getDatabaseHealth()
    .then(({ version, counts }) => {
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      databaseStatus.textContent = `Database nội bộ đang hoạt động · phiên bản ${version} · ${total} bản ghi trên thiết bị này.`;
      databaseStatus.className = 'notice success';
    })
    .catch((error) => {
      console.error('Không thể kiểm tra database nội bộ:', error);
      databaseStatus.textContent = `Không thể kiểm tra database nội bộ: ${error.message}`;
      databaseStatus.className = 'notice error';
    });

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
      if (action === 'sync') {
        const { syncAllLocalData } = await loadCloud();
        await syncAllLocalData();
        showSyncMessage('Đã đồng bộ dữ liệu với Supabase.');
      }
      if (action === 'sign-out') {
        const { signOut } = await loadCloud();
        await signOut();
        await renderAccount();
        showSyncMessage('Đã đăng xuất khỏi thiết bị này.');
      }
    } catch (error) {
      console.error('Không thể xử lý sao lưu:', error);
      showMessage(error.message, 'error');
    }
  });
}
