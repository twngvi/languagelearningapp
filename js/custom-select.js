function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function renderOptions(select, menu, button) {
  const options = [...select.options];
  const selected = select.selectedOptions[0];
  button.textContent = selected?.textContent || '';
  menu.innerHTML = options.map((option) => `
    <button class="custom-select-option${option.selected ? ' is-selected' : ''}" type="button" data-value="${escapeHtml(option.value)}">
      ${escapeHtml(option.textContent)}
    </button>`).join('');
}

function enhanceSelect(select) {
  if (select.dataset.customSelect) return;
  select.dataset.customSelect = 'true';

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  const button = document.createElement('button');
  button.className = 'custom-select-trigger';
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');

  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(button, menu, select);
  select.hidden = true;
  renderOptions(select, menu, button);

  const close = () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', () => {
    const isOpen = !menu.hidden;
    document.querySelectorAll('.custom-select-menu:not([hidden])').forEach((item) => { item.hidden = true; });
    document.querySelectorAll('.custom-select-trigger[aria-expanded="true"]').forEach((item) => item.setAttribute('aria-expanded', 'false'));
    menu.hidden = isOpen;
    button.setAttribute('aria-expanded', String(!isOpen));
  });
  menu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-value]');
    if (!option) return;
    select.value = option.dataset.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    renderOptions(select, menu, button);
    close();
  });
  select.addEventListener('change', () => renderOptions(select, menu, button));
  new MutationObserver(() => renderOptions(select, menu, button)).observe(select, { childList: true });
  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) close();
  });
}

export function enhanceCustomSelects(root) {
  root.querySelectorAll('select').forEach(enhanceSelect);
}
