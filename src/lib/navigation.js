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
    meta.media = ((theme === 'dark') === (meta.content === '#111214')) ? 'all' : 'not all';
  }
  try { localStorage.setItem('stock-predictor.theme', theme); } catch {}
  updateAppearanceButton();
});
updateAppearanceButton();
systemAppearance.addEventListener('change', updateAppearanceButton);
for (const trigger of document.querySelectorAll('[data-dialog]')) {
  trigger.addEventListener('click', () => {
    trigger.closest('[popover]')?.hidePopover();
    document.getElementById(trigger.dataset.dialog).showModal();
  });
}
for (const dialog of document.querySelectorAll('.info-dialog')) {
  dialog.addEventListener('close', () => document.querySelector('[popovertarget="help-menu"]').focus());
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
}
