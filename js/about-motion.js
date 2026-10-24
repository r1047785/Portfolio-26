(() => {
  const page = document.querySelector('.about-page');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!page || reducedMotion.matches || !('IntersectionObserver' in window) ||
      !Element.prototype.animate) return;

  const elements = page.querySelectorAll([
    '.about-story > .about-preview-eyebrow', '#about-title',
    '.about-story-note', '.about-story-text > p',
    '.about-offline > div', '.library-header > *',
    '.library-project-grid > a'
  ].join(','));
  const active = new Map();
  const observer = new IntersectionObserver((entries) => {
    let order = 0;
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      observer.unobserve(target);
      target.classList.remove('about-scroll-pending');
      if (reducedMotion.matches || target.contains(document.activeElement)) return;
      const animation = target.animate([
        { opacity: 0, translate: '0 48px' },
        { opacity: 1, translate: '0 0' }
      ], {
        duration: 1000,
        delay: Math.min(order++ * 130, 390),
        easing: 'cubic-bezier(.16, .7, .3, 1)',
        fill: 'backwards'
      });
      active.set(target, animation);
      animation.onfinish = () => active.delete(target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -64px 0px' });

  elements.forEach((element) => {
    element.classList.add('about-scroll-pending');
    observer.observe(element);
  });

  // Keyboard navigation must never land on an invisible link.
  page.addEventListener('focusin', (event) => {
    elements.forEach((element) => {
      if (!element.contains(event.target)) return;
      element.classList.remove('about-scroll-pending');
      observer.unobserve(element);
      active.get(element)?.cancel();
      active.delete(element);
    });
  });

  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    observer.disconnect();
    elements.forEach((element) => element.classList.remove('about-scroll-pending'));
    active.forEach((animation) => animation.cancel());
    active.clear();
  });
})();
