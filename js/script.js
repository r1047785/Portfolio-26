// Loading intro: full name reveal on the very first page of a session,
// a quick spinner on every page after that. Hold briefly, then fade out
// while the hero reveals.
const loader = document.getElementById("loader");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNavLoad = document.documentElement.classList.contains("is-nav-load");

const revealSite = () => {
  loader.classList.add("is-hidden");
  document.body.classList.add("is-loaded");
  loader.addEventListener("transitionend", () => loader.remove(), { once: true });
};

if (prefersReducedMotion) {
  revealSite();
} else {
  const holdTime = isNavLoad ? 350 : 900;
  window.addEventListener("load", () => setTimeout(revealSite, holdTime));
}

// Custom glowing dot cursor — desktop / mouse devices only.
if (window.matchMedia("(pointer: fine)").matches) {
  const dot = document.getElementById("cursorDot");
  document.body.classList.add("has-custom-cursor");

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let dotX = mouseX;
  let dotY = mouseY;

  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    dot.classList.add("is-visible");
  });

  document.addEventListener("mouseleave", () => dot.classList.remove("is-visible"));

  const hoverTargets = "a, button, .work-item";
  document.addEventListener("mouseover", (event) => {
    if (event.target.closest(hoverTargets)) dot.classList.add("is-active");
  });
  document.addEventListener("mouseout", (event) => {
    if (event.target.closest(hoverTargets)) dot.classList.remove("is-active");
  });

  const followCursor = () => {
    dotX += (mouseX - dotX) * 0.2;
    dotY += (mouseY - dotY) * 0.2;
    dot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
    requestAnimationFrame(followCursor);
  };
  followCursor();
}
