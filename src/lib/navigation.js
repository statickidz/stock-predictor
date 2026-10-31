const themeSelect = document.getElementById('theme-select');
themeSelect.value = ['system','light','dark'].includes(document.documentElement.dataset.appearance) ? document.documentElement.dataset.appearance : 'system';
themeSelect.addEventListener('change', () => {
  const theme = themeSelect.value;
  document.getElementById('dark-styles').media = theme === 'dark' ? 'all' : theme === 'light' ? 'not all' : '(prefers-color-scheme: dark)';
  document.documentElement.dataset.appearance = theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const dark = meta.content === '#171b19';
    meta.media = theme === 'system' ? (dark ? '(prefers-color-scheme: dark)' : '(prefers-color-scheme: light)') : ((theme === 'dark') === dark ? 'all' : 'not all');
  }
  try { localStorage.setItem('stock-predictor.theme', theme); } catch {}
});
for (const trigger of document.querySelectorAll('[data-dialog]')) {
  trigger.addEventListener('click', () => document.getElementById(trigger.dataset.dialog).showModal());
}
for (const dialog of document.querySelectorAll('.info-dialog')) {
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
}
