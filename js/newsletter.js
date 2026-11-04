(() => {
  const dialog = document.querySelector('#newsletter-dialog');
  if (!dialog || !dialog.showModal) return;
  const key = 'portfolio-newsletter';
  const form = dialog.querySelector('form');
  const submit = form.querySelector('.primary');
  const error = dialog.querySelector('.newsletter-error');
  let scriptPromise, previousFocus, timer, check;
  const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const save = value => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const suppressed = () => { const state = read(); return state.subscribed || state.until > Date.now(); };
  const clearAuto = () => { clearTimeout(timer); clearInterval(check); };
  function loadForm() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://groot.mailerlite.com/js/w/webforms.min.js?v83147fa8ce2d95cb73ece7f28b469519';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error('MailerLite unavailable')); };
      document.head.append(script);
    });
    return scriptPromise;
  }
  async function open() {
    if (dialog.open) return;
    clearAuto();
    previousFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('newsletter-open');
    error.hidden = true;
    submit.disabled = true;
    try { await loadForm(); submit.disabled = false; }
    catch { error.hidden = false; }
  }
  window.ml_webform_success_48074188 = () => {
    dialog.querySelector('.row-form').style.display = 'none';
    const success = dialog.querySelector('.row-success');
    success.style.display = 'block';
    success.focus();
    save({ subscribed: true });
  };
  form.addEventListener('submit', event => {
    if (submit.disabled || !form.checkValidity()) event.preventDefault();
  });
  document.querySelector('[data-newsletter-open]')?.addEventListener('click', open);
  dialog.querySelector('[data-newsletter-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('newsletter-open');
    if (!read().subscribed) save({ until: Date.now() + 7 * 86400000 });
    previousFocus?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  // Do not interrupt loading, cookie choices, other dialogs or a hidden tab.
  const available = () => !document.hidden && document.body.classList.contains('is-loaded') &&
    !document.querySelector('.cookie-banner:not([hidden]), dialog[open]');
  if (!suppressed()) {
    check = setInterval(() => {
      if (suppressed()) { clearAuto(); return; }
      if (!available()) { clearTimeout(timer); timer = null; return; }
      if (!timer) timer = setTimeout(() => { if (available() && !suppressed()) open(); }, 20000);
    }, 1000);
  }
  window.addEventListener('pagehide', () => { clearAuto(); if (dialog.open) dialog.close(); });
})();
