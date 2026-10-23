const loader = document.getElementById("loader");
const playIntro = loader?.classList.contains("walking-loader") &&
  !document.documentElement.classList.contains("is-nav-load");
if (!playIntro) {
  document.body.classList.add("is-loaded");
  loader?.remove();
} else {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = loader.querySelector(".intro-count");
  const progress = loader.querySelector(".intro-progress");
  const walker = loader.querySelector(".intro-walker");
  const fill = loader.querySelector(".intro-fill");
  const skip = loader.querySelector(".intro-skip");
  const start = performance.now();
  const behindIntro = [...document.querySelectorAll("body > header, body > main, body > footer")]
    .map(element => ({ element, inert: element.inert }));
  behindIntro.forEach(({ element }) => { element.inert = true; });
  let value = 0;
  let target = 12;
  let ready = false;
  let finished = false;
  let raf = 0;
  let completionTimer = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    clearTimeout(deadline);
    clearTimeout(completionTimer);
    window.removeEventListener("avatar-progress", onProgress);
    document.body.classList.add("is-loaded");
    behindIntro.forEach(({ element, inert }) => { element.inert = inert; });
    loader.classList.add("is-hidden");
    if (loader.contains(document.activeElement)) {
      const heading = document.querySelector(".hero-name");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
    setTimeout(() => loader.remove(), reduced ? 0 : 550);
  };
  const onProgress = (event) => {
    target = Math.max(target, event.detail.progress);
    if (event.detail.ready) ready = true;
  };
  window.addEventListener("avatar-progress", onProgress);
  document.fonts.ready.then(() => { target = Math.max(target, 25); });
  const deadline = setTimeout(finish, 6000);
  skip.addEventListener("click", finish);
  const tick = (now) => {
    const elapsed = now - start;
    // These are loading-stage percentages, not a total byte measurement.
    const goal = ready && elapsed >= (reduced ? 0 : 1800) ? 100 : Math.min(94, target);
    value = Math.min(goal, value + Math.max(0.35, (goal - value) * 0.055));
    const shown = Math.floor(value);
    count.textContent = shown;
    progress.setAttribute("aria-valuenow", shown);
    walker.style.left = reduced ? "50%" : `${value}%`;
    fill.style.transform = `scaleX(${value / 100})`;
    if (value >= 100) completionTimer = setTimeout(finish, reduced ? 0 : 300);
    else raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

// Draw the desktop cursor only when the pointer moves.
const dot = document.getElementById("cursorDot");
if (dot && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.body.classList.add("has-custom-cursor");
  let cursorFrame = 0;
  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    mouseX = event.clientX;
    mouseY = event.clientY;
    dot.classList.add("is-visible");
    if (!cursorFrame) cursorFrame = requestAnimationFrame(() => {
      cursorFrame = 0;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });
  }, { passive: true });
  document.addEventListener("mouseleave", () => dot.classList.remove("is-visible"));
  document.addEventListener("pointerover", (event) => {
    dot.classList.toggle("is-active", Boolean(event.target.closest("a, button")));
  });
}
