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

// A quiet, mouse-reactive star field gives the home hero a little depth.
const hero = document.querySelector(".hero");
const starCanvas = document.querySelector(".hero-stars");

if (hero && starCanvas) {
  const context = starCanvas.getContext("2d");
  const motionIsReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stars = [];
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: false };
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastPointerMove = -Infinity;

  const resizeStars = () => {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    starCanvas.width = Math.round(width * pixelRatio);
    starCanvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const count = Math.max(48, Math.min(160, Math.round((width * height) / 10500)));
    stars.length = 0;
    for (let index = 0; index < count; index += 1) {
      const depth = 0.15 + Math.random() * 0.85;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        radius: 0.35 + depth * 1.15,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.55 + Math.random() * 0.45,
        flare: Math.random() > 0.94,
      });
    }
  };

  const drawStars = (time = 0) => {
    if (!motionIsReduced) {
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;
    }
    context.clearRect(0, 0, width, height);
    const parallaxX = (pointer.x - 0.5) * 24;
    const parallaxY = (pointer.y - 0.5) * 18;

    for (const star of stars) {
      let x = star.x + parallaxX * star.depth;
      let y = star.y + parallaxY * star.depth;
      let proximity = 0;

      if (!motionIsReduced && pointer.active) {
        const dx = x - pointer.x * width;
        const dy = y - pointer.y * height;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / 115) * star.depth;
        proximity = influence;
        if (distance > 0) {
          x += (dx / distance) * influence * 13;
          y += (dy / distance) * influence * 13;
        }
      }

      const shimmer = motionIsReduced ? 0.88 : 0.68 + Math.sin(time * 0.0012 + star.phase) * 0.22;
      const alpha = Math.min(1, (0.24 + shimmer * star.twinkle + proximity * 0.45) * star.depth);
      const radius = star.radius + proximity * 1.4;
      context.beginPath();
      context.fillStyle = `rgba(224, 231, 218, ${alpha})`;
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();

      if (star.flare || proximity > 0.35) {
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 7);
        glow.addColorStop(0, `rgba(203, 220, 196, ${alpha * (0.35 + proximity * 0.3)})`);
        glow.addColorStop(1, "rgba(203, 220, 196, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, radius * 7, 0, Math.PI * 2);
        context.fill();
      }

      if (star.flare && star.depth > 0.65) {
        context.strokeStyle = `rgba(224, 231, 218, ${alpha * 0.35})`;
        context.lineWidth = 0.5;
        context.beginPath();
        context.moveTo(x - radius * 3, y);
        context.lineTo(x + radius * 3, y);
        context.moveTo(x, y - radius * 3);
        context.lineTo(x, y + radius * 3);
        context.stroke();
      }
    }

    if (!motionIsReduced && pointer.active) {
      const pulse = Math.max(0, 1 - (time - lastPointerMove) / 800);
      if (pulse > 0) {
        const x = pointer.x * width;
        const y = pointer.y * height;
        context.strokeStyle = `rgba(196, 214, 190, ${pulse * 0.14})`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(x, y, 14 + (1 - pulse) * 34, 0, Math.PI * 2);
        context.stroke();
      }
    }

    if (!motionIsReduced) requestAnimationFrame(drawStars);
  };

  hero.addEventListener("pointermove", (event) => {
    if (motionIsReduced || event.pointerType !== "mouse") return;
    const bounds = hero.getBoundingClientRect();
    pointer.targetX = (event.clientX - bounds.left) / bounds.width;
    pointer.targetY = (event.clientY - bounds.top) / bounds.height;
    pointer.x += (pointer.targetX - pointer.x) * 0.24;
    pointer.y += (pointer.targetY - pointer.y) * 0.24;
    pointer.active = true;
    lastPointerMove = performance.now();
  });

  hero.addEventListener("pointerleave", () => {
    pointer.active = false;
    pointer.x = 0.5;
    pointer.y = 0.5;
  });

  resizeStars();
  window.addEventListener("resize", () => {
    resizeStars();
    if (motionIsReduced) drawStars();
  }, { passive: true });
  if (motionIsReduced) drawStars();
  else requestAnimationFrame(drawStars);
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

  const hoverTargets = "a, button";
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
