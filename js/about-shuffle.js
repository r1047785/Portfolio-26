(() => {
  const button = document.querySelector('.photo-shuffle');
  if (!button) return;
  const img = button.querySelector('img');
  const count = button.querySelector('.photo-shuffle-count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const photos = [
    ['uno', 'Yente on a city trip at night', 'Yente tijdens een stedentrip bij nacht'],
    ['duo', 'Yente standing on a snowy rock', 'Yente op een besneeuwde rots'],
    ['trio', 'A motorcycle with a helmet on its tank', 'Een motor met een helm op de tank'],
    ['cuatro', 'A group of motorcyclists out for a ride', 'Een groep motorrijders tijdens een rit'],
    ['vijvo', 'Yente overlooking a wooded valley', 'Yente bij een uitzicht over een beboste vallei']
  ];
  let index = 0;
  let hovering = false;
  let timer;
  let busy = false;
  let generation = 0;
  let animation;
  const updateAlt = () => {
    img.alt = photos[index][document.documentElement.lang.startsWith('nl') ? 2 : 1];
  };
  const stop = () => {
    hovering = false;
    generation++;
    clearTimeout(timer);
  };
  async function next() {
    if (busy) return;
    busy = true;
    const request = generation;
    const nextIndex = (index + 1) % photos.length;
    const preload = new Image();
    preload.src = `assets/about/shuffel-${photos[nextIndex][0]}.webp`;
    try {
      await preload.decode();
      if (request !== generation) return;
      index = nextIndex;
      img.src = preload.src;
      updateAlt();
      count.textContent = `${String(index + 1).padStart(2, '0')} / 05`;
      animation?.cancel();
      if (!reduced.matches && button.animate) {
        animation = button.querySelector('.photo-shuffle-frame').animate([
          { transform: 'translate(10px, -5px) rotate(3deg)', opacity: .65 },
          { transform: 'translate(0, 0) rotate(0)', opacity: 1 }
        ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    } catch {
      // Keep the current photo visible if the next image cannot be loaded.
    } finally {
      busy = false;
      if (hovering && !reduced.matches) timer = setTimeout(next, 1100);
    }
  }
  button.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    hovering = true;
    clearTimeout(timer);
    next();
  });
  button.addEventListener('pointerleave', stop);
  button.addEventListener('click', () => { clearTimeout(timer); next(); });
  button.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  reduced.addEventListener('change', () => { stop(); animation?.cancel(); });
  new MutationObserver(updateAlt).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  updateAlt();
})();
