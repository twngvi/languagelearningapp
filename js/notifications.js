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
  iconImage = '',
  destructive = false,
  compactActions = false,
  confirmIconImage = '',
}) {
  if (activeDialog) closeDialog(false);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `
      <section class="app-dialog${selectOptions.length ? ' has-select' : ''}" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">
        <div class="app-dialog-icon ${type}${iconImage ? ' has-image' : ''}" aria-hidden="true">${iconImage ? `<img src="${iconImage}" alt="">` : type === 'error' ? '!' : type === 'warning' ? '!' : '✓'}</div>
        <div class="app-dialog-content">
          <h2 id="app-dialog-title">${title}</h2>
          <p class="app-dialog-message"></p>
          ${input ? '<input class="app-dialog-input" type="text" autocomplete="off">' : ''}
          ${selectOptions.length ? `
            <div class="custom-select app-dialog-select">
              <button class="custom-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="app-dialog-select-menu">${escapeDialogText(selectOptions[0].label)}</button>
              <div class="custom-select-menu app-dialog-select-menu" id="app-dialog-select-menu" role="listbox" hidden>
                ${selectOptions.map(({ value, label }, index) => `<button class="custom-select-option app-dialog-select-option${index === 0 ? ' is-selected' : ''}" type="button" role="option" aria-selected="${index === 0}" tabindex="-1" data-value="${escapeDialogText(value)}">${escapeDialogText(label)}</button>`).join('')}
              </div>
              <input class="app-dialog-select-value" type="hidden" value="${escapeDialogText(selectOptions[0].value)}">
            </div>` : ''}
        </div>
        <div class="app-dialog-actions${destructive || compactActions ? ' is-compact' : ''}">
          ${cancelLabel ? `<button class="secondary-button app-dialog-cancel" type="button">${cancelLabel}</button>` : ''}
          <button class="primary-button app-dialog-confirm" type="button">${destructive || confirmIconImage ? `<img class="app-dialog-confirm-icon" src="${confirmIconImage || 'image/nút xóa.png'}" alt="">` : ''}${confirmLabel}</button>
        </div>
      </section>`;

    const dialog = overlay.querySelector('.app-dialog');
    const messageElement = overlay.querySelector('.app-dialog-message');
    const inputElement = overlay.querySelector('.app-dialog-input');
    const selectWrapperElement = overlay.querySelector('.app-dialog-select');
    const selectTriggerElement = selectWrapperElement?.querySelector('.custom-select-trigger');
    const selectMenuElement = selectWrapperElement?.querySelector('.app-dialog-select-menu');
    const selectValueElement = selectWrapperElement?.querySelector('.app-dialog-select-value');
    messageElement.textContent = message;
    if (inputElement) inputElement.value = '';

    const selectOptionsElements = selectMenuElement
      ? [...selectMenuElement.querySelectorAll('.app-dialog-select-option')]
      : [];
    const closeSelectMenu = () => {
      if (!selectMenuElement) return;
      selectMenuElement.hidden = true;
      selectMenuElement.classList.remove('opens-up');
      selectMenuElement.style.maxHeight = '';
      selectTriggerElement.setAttribute('aria-expanded', 'false');
    };
    const openSelectMenu = () => {
      selectMenuElement.hidden = false;
      selectTriggerElement.setAttribute('aria-expanded', 'true');
      const triggerRect = selectTriggerElement.getBoundingClientRect();
      const desiredHeight = Math.min(selectMenuElement.scrollHeight, 220, window.innerHeight * 0.4);
      const availableAbove = Math.max(0, triggerRect.top - 16);
      const availableBelow = Math.max(0, window.innerHeight - triggerRect.bottom - 16);
      const opensUp = availableAbove >= desiredHeight || availableAbove > availableBelow;
      selectMenuElement.classList.toggle('opens-up', opensUp);
      selectMenuElement.style.maxHeight = `${Math.min(desiredHeight, opensUp ? availableAbove : availableBelow)}px`;
      (selectOptionsElements.find((option) => option.dataset.value === selectValueElement.value)
        || selectOptionsElements[0])?.focus();
    };

    selectTriggerElement?.addEventListener('click', () => {
      if (selectMenuElement.hidden) openSelectMenu();
      else {
        closeSelectMenu();
        selectTriggerElement.focus();
      }
    });
    selectTriggerElement?.addEventListener('keydown', (event) => {
      if (selectMenuElement.hidden && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openSelectMenu();
      }
    });
    selectMenuElement?.addEventListener('click', (event) => {
      const option = event.target.closest('.app-dialog-select-option');
      if (!option) return;
      selectValueElement.value = option.dataset.value;
      selectTriggerElement.textContent = option.textContent.trim();
      selectOptionsElements.forEach((item) => {
        const selected = item === option;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));
      });
      closeSelectMenu();
      selectTriggerElement.focus();
    });
    selectMenuElement?.addEventListener('keydown', (event) => {
      const currentIndex = selectOptionsElements.indexOf(document.activeElement);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, selectOptionsElements.length - 1);
      else if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = selectOptionsElements.length - 1;
      else return;
      event.preventDefault();
      selectOptionsElements[nextIndex]?.focus();
    });
    selectWrapperElement?.addEventListener('focusout', (event) => {
      if (!selectWrapperElement.contains(event.relatedTarget)) closeSelectMenu();
    });

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        if (selectMenuElement && !selectMenuElement.hidden) {
          closeSelectMenu();
          selectTriggerElement.focus();
          event.preventDefault();
          return;
        }
        closeDialog(false);
      }
      if (event.key === 'Enter' && (inputElement || selectTriggerElement)
        && document.activeElement === (inputElement || selectTriggerElement)) {
        closeDialog(inputElement ? inputElement.value.trim() : selectValueElement.value);
      }
    };

    activeDialog = { resolve, overlay, onKeydown };
    getDialogRoot().append(overlay);
    document.addEventListener('keydown', onKeydown);
    overlay.querySelector('.app-dialog-confirm').addEventListener('click', () => {
      closeDialog(inputElement ? inputElement.value.trim() : selectValueElement ? selectValueElement.value : true);
    });
    overlay.querySelector('.app-dialog-cancel')?.addEventListener('click', () => closeDialog(false));
    overlay.addEventListener('click', (event) => {
      if (selectMenuElement && !selectMenuElement.hidden
        && !selectWrapperElement.contains(event.target)) closeSelectMenu();
      if (event.target === overlay && cancelLabel) closeDialog(false);
    });
    (inputElement || selectTriggerElement || overlay.querySelector('.app-dialog-confirm')).focus();
    dialog.classList.add('is-visible');
  });
}

export function showAlert(message, { title = 'Có một chút trục trặc', type = 'error' } = {}) {
  return showDialog({ title, message, type, confirmLabel: 'Đã hiểu' });
}

export function showConfirm(message, {
  title = 'Bạn muốn tiếp tục?',
  confirmLabel = 'Tiếp tục',
  iconImage = '',
  destructive = false,
} = {}) {
  return showDialog({
    title,
    message,
    type: 'warning',
    confirmLabel,
    cancelLabel: 'Hủy',
    iconImage,
    destructive,
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
  compactActions = false,
  confirmIconImage = '',
} = {}) {
  return showDialog({
    title,
    message,
    type: 'info',
    confirmLabel,
    cancelLabel: 'Hủy',
    selectOptions: options,
    compactActions,
    confirmIconImage,
  });
}
