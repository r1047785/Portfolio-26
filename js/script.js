// Reveal page content immediately; do not wait for every asset to download.
const loader = document.getElementById("loader");
document.body.classList.add("is-loaded");
if (loader) loader.remove();

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
