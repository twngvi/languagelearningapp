let dialogRoot;
let activeDialog;

function escapeDialogText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

function getDialogRoot() {
  if (dialogRoot) return dialogRoot;

  dialogRoot = document.createElement('div');
  dialogRoot.className = 'app-dialog-root';
  dialogRoot.setAttribute('aria-live', 'assertive');
  document.body.append(dialogRoot);
  return dialogRoot;
}

function closeDialog(result) {
  if (!activeDialog) return;
  const { resolve, overlay, onKeydown } = activeDialog;
  document.removeEventListener('keydown', onKeydown);
  overlay.remove();
  activeDialog = null;
  resolve(result);
}

function showDialog({
  title,
  message,
  type = 'info',
  confirmLabel = 'Đồng ý',
  cancelLabel = '',
  input = false,
  selectOptions = [],
}) {
  if (activeDialog) closeDialog(false);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `
      <section class="app-dialog" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">
        <div class="app-dialog-icon ${type}" aria-hidden="true">${type === 'error' ? '!' : type === 'warning' ? '!' : '✓'}</div>
        <div class="app-dialog-content">
          <h2 id="app-dialog-title">${title}</h2>
          <p class="app-dialog-message"></p>
          ${input ? '<input class="app-dialog-input" type="text" autocomplete="off">' : ''}
          ${selectOptions.length ? `<select class="app-dialog-select">${selectOptions.map(({ value, label }) => `<option value="${escapeDialogText(value)}">${escapeDialogText(label)}</option>`).join('')}</select>` : ''}
        </div>
        <div class="app-dialog-actions">
          ${cancelLabel ? `<button class="secondary-button app-dialog-cancel" type="button">${cancelLabel}</button>` : ''}
          <button class="primary-button app-dialog-confirm" type="button">${confirmLabel}</button>
        </div>
      </section>`;

    const dialog = overlay.querySelector('.app-dialog');
    const messageElement = overlay.querySelector('.app-dialog-message');
    const inputElement = overlay.querySelector('.app-dialog-input');
    const selectElement = overlay.querySelector('.app-dialog-select');
    messageElement.textContent = message;
    if (inputElement) inputElement.value = '';

    const onKeydown = (event) => {
      if (event.key === 'Escape') closeDialog(false);
      if (event.key === 'Enter' && (inputElement || selectElement)
        && document.activeElement === (inputElement || selectElement)) {
        closeDialog(inputElement ? inputElement.value.trim() : selectElement.value);
      }
    };

    activeDialog = { resolve, overlay, onKeydown };
    getDialogRoot().append(overlay);
    document.addEventListener('keydown', onKeydown);
    overlay.querySelector('.app-dialog-confirm').addEventListener('click', () => {
      closeDialog(inputElement ? inputElement.value.trim() : selectElement ? selectElement.value : true);
    });
    overlay.querySelector('.app-dialog-cancel')?.addEventListener('click', () => closeDialog(false));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && cancelLabel) closeDialog(false);
    });
    (inputElement || selectElement || overlay.querySelector('.app-dialog-confirm')).focus();
    dialog.classList.add('is-visible');
  });
}

export function showAlert(message, { title = 'Có một chút trục trặc', type = 'error' } = {}) {
  return showDialog({ title, message, type, confirmLabel: 'Đã hiểu' });
}

export function showConfirm(message, { title = 'Bạn muốn tiếp tục?', confirmLabel = 'Tiếp tục' } = {}) {
  return showDialog({
    title,
    message,
    type: 'warning',
    confirmLabel,
    cancelLabel: 'Hủy',
  });
}

export function showPrompt(message, { title = 'Thêm vào bộ từ', confirmLabel = 'Thêm' } = {}) {
  return showDialog({
    title,
    message,
    type: 'info',
    confirmLabel,
    cancelLabel: 'Hủy',
    input: true,
  });
}

export function showSelectPrompt(message, {
  title = 'Chọn bộ từ',
  confirmLabel = 'Di chuyển',
  options = [],
} = {}) {
  return showDialog({
    title,
    message,
    type: 'info',
    confirmLabel,
    cancelLabel: 'Hủy',
    selectOptions: options,
  });
}
