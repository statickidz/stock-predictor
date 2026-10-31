const appearanceButton = document.querySelector('.appearance-trigger');
const systemAppearance = matchMedia('(prefers-color-scheme: dark)');
function isDark() {
  const theme = document.documentElement.dataset.appearance;
  return theme === 'dark' || (theme === 'system' && systemAppearance.matches);
}
function updateAppearanceButton() {
  const dark = isDark();
  appearanceButton.dataset.dark = String(dark);
  appearanceButton.setAttribute('aria-pressed', String(dark));
  appearanceButton.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
}
appearanceButton.addEventListener('click', () => {
  const theme = isDark() ? 'light' : 'dark';
  document.getElementById('dark-styles').media = theme === 'dark' ? 'all' : 'not all';
  document.documentElement.dataset.appearance = theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.media = theme === meta.dataset.theme ? 'all' : 'not all';
  }
  try { localStorage.setItem('stock-predictor.theme', theme); } catch {}
  updateAppearanceButton();
});
updateAppearanceButton();
systemAppearance.addEventListener('change', updateAppearanceButton);
const dialogOpeners = new WeakMap();
for (const trigger of document.querySelectorAll('[data-dialog]')) {
  trigger.addEventListener('click', () => {
    const menu = trigger.closest('[popover]');
    const dialog = document.getElementById(trigger.dataset.dialog);
    const opener = menu ? document.querySelector(`[popovertarget="${menu.id}"]`) : trigger;
    dialogOpeners.set(dialog, opener || trigger);
    menu?.hidePopover();
    dialog.showModal();
  });
}
for (const dialog of document.querySelectorAll('.info-dialog')) {
  dialog.addEventListener('close', () => dialogOpeners.get(dialog)?.focus());
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
}
