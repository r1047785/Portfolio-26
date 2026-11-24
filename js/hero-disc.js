import { DISCS } from "./discs.js";
import { wordmark, wordmarkReady } from "./wordmark.js";

const root = document.documentElement, hero = document.querySelector("#hero");
const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const text = {
  en: { group: "Disc player", prev: "Previous disc", next: "Next disc", play: "Play", pause: "Pause" },
  nl: { group: "Discspeler", prev: "Vorige disc", next: "Volgende disc", play: "Afspelen", pause: "Pauzeren" },
};
const tell = (progress, ready = false) =>
  window.dispatchEvent(new CustomEvent("avatar-progress", { detail: { progress, ready } })); // the intro listens to this

/* ---------- measurements: hero, scroll and the spot in the about section ---------- */
const destination = document.querySelector("#aboutAvatarDestination");
const view = { heroH: innerHeight, scroll: scrollY, t: 0, dest: { x: 0, y: 0, size: 300 }, finish: 1 };
const clamp = (v) => Math.min(1, Math.max(0, v));
function readScroll() {
  view.scroll = Math.max(0, scrollY);
  const p = clamp(view.scroll / view.finish);
  view.t = reduced ? Number(p >= 0.5) : p * p * (3 - 2 * p);
}
function measure() {
  view.heroH = hero.offsetHeight;
  if (destination) {
    const r = destination.getBoundingClientRect(), top = r.top + scrollY;
    view.dest = { x: r.left + r.width / 2, y: top + r.height / 2, size: Math.min(r.width, r.height) * 0.86 };
    view.finish = Math.max(1, top + r.height / 2 - innerHeight * 0.52);
  }
  readScroll();
  disc?.wake();
}

/* ---------- the stage: a still image first, the live 3D takes over when it is ready ---------- */
const wrap = document.createElement("div");
wrap.className = "disc-stage";
document.body.append(wrap);
const still = document.querySelector(".disc-poster");
let disc = null;
tell(60);
const picture = new Image();
picture.onload = picture.onerror = () => tell(100, true);
picture.src = `assets/disc-${root.dataset.theme === "dark" ? "dark" : "light"}.webp`;
import("./minidisc.js")
  .then(({ createDiscStage }) => createDiscStage(wrap, {
    getView: () => view,
    onChange: update,
    onReady: () => { wrap.classList.add("is-ready"); still?.classList.add("is-done"); },
  }))
  .then((stage) => { disc = stage; syncTheme(); measure(); labels(); })
  .catch((error) => {                                      // the still image stays
    console.error("Could not start the 3D disc.", error);
    $("discPlayer").hidden = true;
  })
  .finally(() => tell(100, true));

/* ---------- player ---------- */
const PLAY = "M7 4v16l14-8z", PAUSE = "M7 4.5h3.6v15H7zM13.4 4.5H17v15h-3.6z";
let lettering = false;
function update(i) {
  const name = DISCS[i].name;
  $("discName").textContent = name;
  if (lettering) $("discMark").innerHTML = wordmark(name);
}
wordmarkReady().then(() => {
  lettering = true;
  $("navLogo").innerHTML = wordmark("YV");
  update(disc ? disc.index : 0);
});
function labels() {
  const l = text[root.lang.startsWith("nl") ? "nl" : "en"];
  $("discPlayer").setAttribute("aria-label", l.group);
  $("discPrev").setAttribute("aria-label", l.prev);
  $("discNext").setAttribute("aria-label", l.next);
  $("discPlay").setAttribute("aria-label", disc?.playing ? l.pause : l.play);
}
function toggle() {
  if (!disc) return;
  disc.setPlaying(!disc.playing);
  $("discPlay").querySelector("path").setAttribute("d", disc.playing ? PAUSE : PLAY);
  labels();
}
update(0);
labels();
$("discPrev").addEventListener("click", () => disc?.go(-1));
$("discNext").addEventListener("click", () => disc?.go(1));
$("discPlay").addEventListener("click", toggle);

/* ---------- theme + language follow the site ---------- */
const syncTheme = () => disc?.setTheme(root.dataset.theme === "dark");
syncTheme();
new MutationObserver((list) => {
  if (list.some((m) => m.attributeName === "data-theme")) syncTheme();
  labels();
}).observe(root, { attributes: true, attributeFilter: ["data-theme", "lang"] });

/* ---------- drag through the cases, click one to bring it forward, click the middle one to play ---------- */
let grab = null;
hero.addEventListener("pointerdown", (e) => {
  if (e.button || e.target.closest("a, button, dl, .disc-title")) return;
  grab = { x: e.clientX, y: e.clientY, last: e.clientX, time: e.timeStamp, v: 0, moved: false };
});
window.addEventListener("pointermove", (e) => {
  if (!grab || !disc) return;
  const dx = e.clientX - grab.x;
  if (!grab.moved && Math.abs(dx) < 7) return;
  grab.moved = true;
  const dt = Math.max(1, e.timeStamp - grab.time);
  grab.v = grab.v * 0.6 + ((e.clientX - grab.last) / dt) * 0.4;
  grab.last = e.clientX; grab.time = e.timeStamp;
  disc.dragBy(dx);
});
window.addEventListener("pointerup", (e) => {
  if (!grab || !disc) { grab = null; return; }
  const g = grab; grab = null;
  if (g.moved) { disc.dragEnd(Math.max(-0.6, Math.min(0.6, g.v * 0.45))); return; }
  const i = disc.hit(e.clientX, e.clientY);
  if (i < 0) return;
  if (i === disc.index) toggle(); else disc.goTo(i);
});
window.addEventListener("pointercancel", () => { if (grab?.moved) disc?.dragEnd(0); grab = null; });

measure();
window.addEventListener("resize", measure, { passive: true });
window.addEventListener("load", measure, { once: true });
document.fonts.ready.then(measure);
window.addEventListener("pageshow", measure);
window.addEventListener("scroll", () => { readScroll(); disc?.wake(); }, { passive: true });
