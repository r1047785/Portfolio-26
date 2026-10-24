(() => {
  const root = document.documentElement;
  const key = 'portfolio-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem(key); } catch {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  let button;
  const updateLabel = () => {
    if (!button) return;
    const dark = root.dataset.theme === 'dark';
    const nl = root.lang.startsWith('nl');
    const label = dark ? (nl ? 'Schakel naar light mode' : 'Switch to light mode') :
      (nl ? 'Schakel naar dark mode' : 'Switch to dark mode');
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-pressed', String(dark));
  };
  const apply = () => {
    root.dataset.theme = preference || (system.matches ? 'dark' : 'light');
    updateLabel();
  };
  // Runs in the head, before the page paints, to avoid a light flash.
  apply();
  system.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const controls = document.querySelector('.lang-switch');
    if (!controls) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.innerHTML = '<svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
    controls.prepend(button);
    updateLabel();
    new MutationObserver(updateLabel).observe(root, { attributes: true, attributeFilter: ['lang'] });
  });
})();
