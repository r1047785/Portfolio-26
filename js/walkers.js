/* The homepage is a floor. Everybody who has it open right now stands on it, live.
   Your walker follows your mouse (or your tap, or the arrow keys), the others see that.
   Without the live server you simply walk around on your own. */
import { note, showCount, startTerminal, WORDS, ACTS } from "./terminal.js";
import { createOrb } from "./orb.js";

const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const LIVE = local ? "ws://localhost:8787" : "wss://live-walkers.r1047785.workers.dev";
const MOST = 40;                                 // more people than this are counted, not drawn

const root = document.documentElement, hero = document.querySelector("#hero"), floor = document.querySelector("#walkers");
const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BODY = `<svg viewBox="0 0 100 150" fill="currentColor" aria-hidden="true"><g class="walker-body"><g class="walker-arm walker-arm-back"><path d="M48 47Q35 47 33 61L30 91Q31 100 38 98L43 70 56 59Z"/></g><g class="walker-leg walker-leg-back"><path d="M43 86Q36 93 40 108L44 134Q39 142 43 146L64 146Q68 140 56 134L56 108 59 89Z"/></g><path d="M39 43Q31 53 35 73L40 94Q49 102 62 92L62 66Q65 48 55 43Z"/><path d="M43 36L35 34 40 27 33 21 42 19 40 10 48 14 53 5 57 15 66 12 63 22 71 27 62 31 64 38 56 37 55 44 46 44Z"/><g class="walker-leg walker-leg-front"><path d="M43 87Q39 98 44 112L45 134Q40 141 45 146L65 146Q71 140 57 133L58 109 61 88Z"/></g><g class="walker-arm walker-arm-front"><path d="M54 46Q62 44 65 55L69 76 78 90Q80 98 73 99L61 84Q58 80 56 70L48 56Z"/></g></g></svg>`;

const orb = floor && createOrb($("orb"), hero);   // the door: people jump out of it and back in
const people = new Map(); // id -> person, "me" is you
let width = 0, height = 96, raf = 0, last = 0, online = false;
let socket = null, tries = 0, retry = 0, beat = 0, lost = false;
let sendAt = 0, sendSoon = 0, sent = -1, hopped = 0, talked = 0;

/* ---------- places: 0 is the left end of the floor, 1 the right end ---------- */
const edge = () => height * 0.35;
const toPx = (f) => edge() + f * (width - 2 * edge());
const toFraction = (px) => clamp((px - edge()) / Math.max(1, width - 2 * edge()), 0, 1);
function measure() {
  width = floor.clientWidth;
  height = floor.clientHeight;
  for (const p of people.values()) if (p.x !== null && !p.leaving) { p.target = toPx(p.f); if (!p.moving) { p.x = p.target; draw(p); } }
  wake();
}

/* ---------- people ---------- */
function add(id, f) {
  const el = document.createElement("div");
  el.className = id === "me" ? "walker is-me" : "walker";
  el.innerHTML = `<div class="walker-hop"><div class="walker-turn">${BODY}</div></div>`;
  const p = { id, el, hop: el.firstChild, turn: el.firstChild.firstChild, f, x: null, y: 0, vx: 0, vy: 0, size: 1, air: "", target: 0, gait: "", moving: false, leaving: false, pose: "", poseEnd: 0, poseAt: null, bubble: null };
  people.set(id, p);
  return p;
}
function enter(p, from) {
  if (p.x !== null) return;
  if (p.id !== "me" && floor.querySelectorAll(".walker").length >= MOST) return;
  const door = from === undefined && orb && !reduced;
  p.x = reduced ? toPx(p.f) : door ? doorX() : from ?? (p.f < 0.5 ? -height : width + height);
  floor.append(p.el);
  p.target = toPx(p.f);
  if (door) popOut(p);
  draw(p);
  wake();
}
/* the orb, measured from the floor */
const doorX = () => orb.x - (floor.offsetLeft || 0);
const doorY = () => Math.max(height, floor.offsetTop + height - orb.y);
function popOut(p) {
  const fall = doorY() - height * 0.3, up = height * 3.1, gravity = height * 19;
  const time = up / gravity + Math.sqrt((2 * (fall + (up * up) / (2 * gravity))) / gravity);
  p.y = -fall; p.vy = -up; p.size = 0.12; p.air = "out";
  p.vx = clamp(p.target - p.x, -height * 2.2, height * 2.2) / time;
  p.turn.style.transform = p.vx < 0 ? "scaleX(-1)" : "";
  orb.pulse(0.95);
}
function jumpIn(p) { p.air = "in"; p.vy = 0; p.from = { x: p.x, t: 0 }; }
function fly(p, dt) {
  const gravity = height * 19;
  if (p.air === "out") {
    p.size = Math.min(1, p.size + dt * 3.4);
    for (let left = dt; left > 0; left -= 1 / 120) { const h = Math.min(left, 1 / 120); p.vy += gravity * h; p.y += p.vy * h; p.x += p.vx * h; }
    if (p.y >= 0) {
      p.y = 0; p.size = 1; p.air = "";
      if (p.id === "me") note("landed", "me");
      p.hop.animate([{ transform: "scale(1.22,.74)" }, { transform: "scale(.94,1.07)" }, { transform: "none" }], { duration: 340, easing: "ease-out" });
    }
  } else {
    const t = (p.from.t = Math.min(1, p.from.t + dt / 0.62)), k = t * t * (3 - 2 * t);
    p.y = -k * (doorY() - height * 0.3); p.x = p.from.x + (doorX() - p.from.x) * k; p.size = 1 - 0.88 * Math.pow(t, 3);
    if (t >= 1) { orb.pulse(0.55); p.el.remove(); people.delete(p.id); }
  }
}
function walkTo(p, f) {
  if (f !== p.f) pose(p, "");
  p.f = f;
  if (p.x === null) return;
  p.target = toPx(f);
  if (reduced) { p.x = p.target; draw(p); }
  wake();
}
function leave(id) {
  const p = people.get(id);
  if (!p || id === "me") return;
  if (p.x === null || reduced) { p.el.remove(); people.delete(id); }
  else if (!p.leaving) { p.leaving = true; p.target = orb ? doorX() : p.x < width / 2 ? -height : width + height; wake(); }
  count();
}
function jump(p) {
  pose(p, "");
  if (p.x === null || reduced || p.air) return;
  p.hop.animate([{ transform: "none", easing: "cubic-bezier(0,.5,.5,1)" }, { transform: `translateY(${-height * 0.34}px)`, easing: "cubic-bezier(.5,0,1,.5)" }, { transform: "none" }], { duration: 460 });
}
/* wave and dance stop by themselves, sitting and sleeping last until you move */
function pose(p, name) {
  clearTimeout(p.poseEnd);
  p.poseAt = null;
  if (p.pose) p.el.classList.remove(`pose-${p.pose}`);
  p.pose = name;
  if (!name) return;
  p.el.classList.add(`pose-${name}`);
  if (name === "wave" || name === "dance") p.poseEnd = setTimeout(() => pose(p, ""), name === "wave" ? 2600 : 6000);
}
function speak(p, word) {
  if (p.x === null) return;
  p.bubble?.remove();
  const b = p.bubble = document.createElement("span");
  b.className = "walker-say";
  b.textContent = word;
  p.el.append(b);
  setTimeout(() => b.remove(), 3400);
}
function draw(p) { p.el.style.transform = `translate3d(${p.x - height / 3}px,${p.y}px,0) scale(${p.size})`; }
function gait(p, name) {
  if (p.gait === name) return;
  p.gait = name;
  p.el.classList.toggle("is-walking", name === "walk" || name === "run");
  p.el.classList.toggle("is-running", name === "run");
  p.el.classList.toggle("is-air", name === "air");
}

/* ---------- moving ---------- */
function wake() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
function tick(now) {
  raf = 0;
  const dt = Math.min(2, Math.max(0, now - last) / 1000), unit = height / 96;
  last = now;
  let busy = false;
  for (const p of [...people.values()]) {
    if (p.x === null) continue;
    if (p.air) { busy = p.moving = true; gait(p, "air"); fly(p, dt); if (!p.air) gait(p, ""); draw(p); continue; }
    const d = p.target - p.x, far = Math.abs(d);
    if (p.leaving && orb && far < height * 0.9) { busy = true; jumpIn(p); continue; }
    if (far < 1) {
      p.moving = false;
      if (p.leaving) { p.el.remove(); people.delete(p.id); } else gait(p, "");
      continue;
    }
    busy = p.moving = true;
    const speed = clamp(far * 1.9, 95 * unit, 470 * unit);
    p.x += Math.sign(d) * Math.min(far, speed * dt);
    if (far > 3) p.turn.style.transform = d < 0 ? "scaleX(-1)" : "";
    gait(p, speed > 250 * unit ? "run" : "walk");
    draw(p);
  }
  if (busy) raf = requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange", wake);

/* ---------- you ---------- */
function steer(px) {
  const me = people.get("me");
  if (!me) return;
  if (me.pose) {                                     // a small nudge of the mouse does not wake you up
    if (me.poseAt === null) me.poseAt = px;
    if (Math.abs(px - me.poseAt) < height * 0.9) return;
  }
  const f = toFraction(px);
  if (Math.abs(toPx(f) - toPx(me.f)) < 2) return;
  walkTo(me, f);
  clearTimeout(sendSoon);
  const go = () => { sendAt = performance.now(); const x = Math.round(me.f * 1000) / 1000; if (x !== sent) { sent = x; send({ x }); } };
  const pause = 150 - (performance.now() - sendAt);
  if (pause <= 0) go(); else sendSoon = setTimeout(go, pause);   // the last spot always gets through
}
function hop() {
  if (performance.now() - hopped < 450 || !people.get("me") || people.get("me").x === null) return;
  hopped = performance.now();
  jump(people.get("me"));
  note("hop", "me");
  send({ hop: 1 });
}
const canTalk = () => { const me = people.get("me"), now = performance.now(); if (!me || me.x === null || me.air || now - talked < 700) return null; talked = now; return me; };
function say(word) {
  const me = canTalk();
  if (!me) return;
  speak(me, word); note("say", "me", word); send({ say: word });
}
function act(name) {
  const me = canTalk();
  if (!me) return;
  walkTo(me, toFraction(me.x));                      // stop where you are
  pose(me, name); note(name, "me");
  const x = Math.round(me.f * 1000) / 1000;
  clearTimeout(sendSoon);
  if (x !== sent) { sent = x; send({ x }); }
  send({ act: name });
}
const floorX = (e) => e.clientX - floor.getBoundingClientRect().left;
function controls() {
  hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") steer(floorX(e)); }, { passive: true });
  let down = null;
  hero.addEventListener("pointerdown", (e) => { down = e.button ? null : { x: e.clientX, y: e.clientY }; });
  hero.addEventListener("pointerup", (e) => {
    const d = down; down = null;
    if (!d || e.target.closest("a, button, input, label") || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
    const x = floorX(e), box = hero.getBoundingClientRect();
    if (orb?.has(e.clientX - box.left, e.clientY - box.top)) orb.pulse(0.8);
    if (e.pointerType === "mouse" || Math.abs(x - people.get("me").x) < height * 0.45) hop(); else steer(x);
  });
  let held = 0, step = 0;
  const walk = () => { const me = people.get("me"); if (held && me.x !== null) steer(me.x + held * height * 1.3); };
  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || scrollY > innerHeight * 0.6 || e.target.closest?.("input, textarea, select, dialog")) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    held = e.key === "ArrowLeft" ? -1 : 1;
    walk();
    clearInterval(step); step = setInterval(walk, 120);
  });
  const stop = () => { held = 0; clearInterval(step); };
  addEventListener("keyup", (e) => { if (e.key.startsWith("Arrow")) stop(); });
  addEventListener("blur", stop);

}

/* ---------- you step out of the loading screen onto the floor ---------- */
function arrive() {
  const me = add("me", 0.3 + Math.random() * 0.4);
  const start = () => {
    measure();
    enter(me);
    const you = document.createElement("span");
    you.className = "walker-you";
    const say = () => { you.textContent = root.lang.startsWith("nl") ? "jij" : "you"; };
    say();
    new MutationObserver(say).observe(root, { attributes: true, attributeFilter: ["lang"] });
    me.el.append(you);
    controls();
    if (LIVE) connect();
  };
  if (orb) orb.ready.then(start); else start();
}
function count() {
  const n = [...people.values()].filter((p) => !p.leaving).length;
  showCount(n, online);
  orb?.people(n);
}

/* ---------- live connection ---------- */
function send(message) { if (socket?.readyState === 1) socket.send(JSON.stringify(message)); }
function connect() {
  clearTimeout(retry);
  if (socket) return;
  const me = people.get("me"), ws = socket = new WebSocket(`${LIVE}/?x=${me.f.toFixed(3)}`);
  sent = -1;
  ws.onopen = () => { beat = setInterval(() => { if (ws.readyState === 1) ws.send("ping"); }, 30000); };
  ws.onmessage = ({ data }) => {
    if (data === "pong") return;
    let m;
    try { m = JSON.parse(data); } catch { return; }
    const p = people.get(m.id);
    if (m.t === "hi") { if (lost) note("back"); lost = false; tries = 0; online = true; for (const o of m.all) if (!people.has(o.id)) { const q = add(o.id, o.x); enter(q, toPx(o.x)); if (q.x !== null && ACTS.includes(o.act)) pose(q, o.act); } }
    else if (m.t === "in" && !p) { enter(add(m.id, m.x)); note("in", m.id); }
    else if (m.t === "out") { if (p && !p.leaving) note("out", m.id); leave(m.id); }
    else if (m.t === "x" && p && !p.leaving) walkTo(p, m.x);
    else if (m.t === "hop" && p) { jump(p); note("hop", m.id); }
    else if (m.t === "say" && p && WORDS.includes(m.say)) { speak(p, m.say); note("say", m.id, m.say); }
    else if (m.t === "act" && p && !p.leaving && ACTS.includes(m.act)) { pose(p, m.act); note(m.act, m.id); }
    count();
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    if (online) { lost = true; note("lost"); }
    socket = null; gone();
    retry = setTimeout(connect, Math.min(60000, 2000 * 2 ** tries++) * (0.8 + Math.random() * 0.4));
  };
}
function gone() {                                    // we no longer know who is there
  clearInterval(beat);
  online = false;
  for (const id of [...people.keys()]) leave(id);
  count();
}
addEventListener("pagehide", () => { clearTimeout(retry); const ws = socket; socket = null; gone(); ws?.close(); });
addEventListener("pageshow", (e) => { if (e.persisted && LIVE && people.get("me")) connect(); });

/* ---------- start ---------- */
if (floor) {
  startTerminal({ hop, say, act, pulse: (v) => orb?.pulse(v) });
  arrive();
  new ResizeObserver(measure).observe(floor);
}
