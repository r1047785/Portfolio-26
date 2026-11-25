/* The words on the homepage behave like source code: they decode, they log what really happens, and you can type back. */
const root = document.documentElement, $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEXT = {
  en: {
    roles: ["web designer", "3D maker", "UI/UX designer", "student", "curious"],
    ask: "Who is here?", you: "You", one: "and 1 other", more: (n) => `and ${n} others`, alone: "Only you",
    in: "fell out of the orb", out: "went back inside", hop: "jumped", landed: "landed", lost: "connection lost", back: "connection found",
    hint: "type something", help: "about toolkit work contact jump light dark nl", what: (s) => `${s}? never heard of it`, meName: "you",
    live: (n) => (n === 1 ? "You are the only visitor right now" : `${n} visitors are here right now`),
  },
  nl: {
    roles: ["webdesigner", "3D-maker", "UI/UX-designer", "student", "nieuwsgierig"],
    ask: "Wie is hier?", you: "Jij", one: "en 1 ander", more: (n) => `en ${n} anderen`, alone: "Alleen jij",
    in: "viel uit de bol", out: "kroop terug naar binnen", hop: "sprong", landed: "geland", lost: "verbinding kwijt", back: "verbinding gevonden",
    hint: "typ iets", help: "over tools werk contact spring licht donker en", what: (s) => `${s}? nooit van gehoord`, meName: "jij",
    live: (n) => (n === 1 ? "Je bent hier nu de enige bezoeker" : `Er zijn hier nu ${n} bezoekers`),
  },
};
/* only these words and moves can be shared with other visitors; the server has the same list */
export const WORDS = "hi hello hey hoi hallo yo bye doei lol haha nice cool wow love thanks merci yes no ja nee".split(" ");
export const ACTS = ["wave", "dance", "sit", "sleep"];
const EXTRA = {
  en: {
    say: (w) => `says ${w}`, wave: "waves", dance: "dances", me: { say: (w) => `say ${w}`, wave: "wave", dance: "dance" }, sit: "sat down", sleep: "fell asleep",
    help: ["go: about toolkit work contact", "say: hi lol nice wow bye", "do: jump wave dance sit sleep", "ask: who school where stack hobby stage cv mail"],
    who: "I'm Yente. I make websites, interfaces and 3D.", school: "Student Digital Experience Design.", where: "Mechelen, Belgium.",
    stack: "HTML, CSS, JavaScript, Three.js, Figma, Blender.", hobby: "The gym and motorcycle rides.",
    projects: "tennis, next and busleyden. Type one.", stage: "Looking for a student designer? Type mail.", cv: "No CV here yet. Type mail and ask me.",
    why: "Experimenting is how I learn.", mail: "yentevanhoudt@icloud.com", opening: (s) => `opening ${s}`,
  },
  nl: {
    say: (w) => `zegt ${w}`, wave: "zwaait", dance: "danst", sit: "ging zitten", sleep: "viel in slaap",
    help: ["ga: over tools werk contact", "zeg: hoi lol nice wow doei", "doe: spring zwaai dans zit slaap", "vraag: wie school waar stack hobby stage cv mail"],
    who: "Ik ben Yente. Ik maak websites, interfaces en 3D.", school: "Student Digital Experience Design.", where: "Mechelen, België.",
    stack: "HTML, CSS, JavaScript, Three.js, Figma, Blender.", hobby: "Gymmen en motorrijden.",
    projects: "tennis, next en busleyden. Typ er een.", stage: "Op zoek naar een student designer? Typ mail.", cv: "Hier staat nog geen cv. Typ mail en vraag het me.",
    why: "Door te experimenteren leer ik bij.", mail: "yentevanhoudt@icloud.com", opening: (s) => `${s} openen`,
  },
};
for (const l of ["en", "nl"]) Object.assign(TEXT[l], EXTRA[l]);
const t = () => TEXT[root.lang.startsWith("nl") ? "nl" : "en"];

/* ---------- decoding ---------- */
const NOISE = "#/\\<>_+*01XK%=[]{}";
const running = new WeakMap();
export function decode(el, text, speed = 26, whole = false) {   // whole: keep the full length while it changes
  clearInterval(running.get(el));
  if (reduced) { el.textContent = text; return; }
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const done = Math.max(0, step - 5);
    if (done >= text.length) { clearInterval(timer); el.textContent = text; return; }
    let out = text.slice(0, done);
    for (let i = done; i < (whole ? text.length : Math.min(text.length, step)); i++) out += text[i] === " " ? " " : NOISE[Math.floor(Math.random() * NOISE.length)];
    el.textContent = out;
  }, speed);
  running.set(el, timer);
}

/* ---------- what happens, line by line ---------- */
const MOST = matchMedia("(max-width: 620px)").matches ? 4 : 8;
let lastKey = "", times = 1;
function write(text, key = "") {
  const log = $("log");
  if (key && key === lastKey && log.lastChild) {           // the same thing again: count it
    times++;
    clearInterval(running.get(log.lastChild));
    log.lastChild.textContent = `${text} x${times}`;
    return;
  }
  lastKey = key; times = 1;
  const li = document.createElement("li");
  log.append(li);
  while (log.children.length > MOST) log.firstChild.remove();
  decode(li, text, 18);
}
const clock = () => new Date().toTimeString().slice(0, 5);
export function note(what, id, word) {
  const who = id === "me" ? t().meName : id ? id.slice(0, 4) : "", does = (id === "me" && t().me?.[what]) || t()[what];
  write([clock(), who, typeof does === "function" ? does(word) : does].filter(Boolean).join(" "), `${what}${id || ""}${word || ""}`);
}

/* ---------- who is here ---------- */
let shown = "";
export function showCount(n, online) {
  $("who").hidden = !online;
  const key = `${n}${online}${root.lang}`;
  if (key === shown || !online) { shown = key; return; }
  shown = key;
  decode($("whoAsk"), t().ask);
  decode($("whoYou"), n === 1 ? t().alone : t().you);
  decode($("whoRest"), n === 1 ? "" : n === 2 ? t().one : t().more(n - 1));
  $("whoLive").textContent = t().live(n);
}

/* ---------- roles, menu and prompt ---------- */
/* an answer from the site: shown in the log and read out by screen readers */
function answer(...lines) {
  for (const l of lines) write(`> ${l}`);
  $("reply").textContent = lines.join(". ");
}
export function startTerminal({ hop, say, act, pulse }) {
  let role = -1;
  const next = () => { role = (role + 1) % t().roles.length; decode($("role"), t().roles[role], 34); };
  next();
  if (!reduced) setInterval(() => { if (!document.hidden) next(); }, 3600);

  const links = [...document.querySelectorAll(".code-nav a")];
  for (const a of links) {
    const word = a.querySelector("span");
    const again = () => { const real = a.getAttribute("aria-label") || word.textContent; a.setAttribute("aria-label", real); if (!a.style.minWidth) a.style.minWidth = `${a.offsetWidth}px`; decode(word, real, 24, true); pulse(0.16); };
    a.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") again(); });
    a.addEventListener("focus", again);
  }

  const name = $("name");
  name.parentElement.addEventListener("pointerenter", () => decode(name, "Yente Vanhoudt", 24, true));

  const typed = $("typed"), theme = (dark) => { if ((root.dataset.theme === "dark") !== dark) document.querySelector(".theme-toggle")?.click(); };
  const open = (i) => { hop(); links[i].click(); };
  const language = (l) => document.querySelector(`[data-lang="${l}"]`)?.click();
  const DO = {
    about: () => open(0), over: () => open(0), "over mij": () => open(0),
    toolkit: () => open(1), tools: () => open(1), services: () => open(1),
    work: () => open(2), werk: () => open(2),
    contact: () => open(3),
    jump: hop, spring: hop, hop,
    light: () => theme(false), licht: () => theme(false), dark: () => theme(true), donker: () => theme(true),
    nl: () => language("nl"), en: () => language("en"),
    boom: () => pulse(1.1),
    help: () => answer(...t().help), "?": () => answer(...t().help),
    clear: () => { $("log").textContent = ""; lastKey = ""; },
  };
  const alias = (names, f) => { for (const n of names.split(" ")) DO[n] = f; };
  for (const w of WORDS) DO[w] = () => say(w);
  alias("wave zwaai zwaaien", () => act("wave")); alias("dance dans dansen", () => act("dance"));
  alias("sit zit zitten", () => act("sit")); alias("sleep slaap slapen", () => act("sleep"));
  for (const [names, key] of [["who wie yente", "who"], ["school studie study", "school"], ["where waar", "where"], ["stack tech skills", "stack"], ["hobby hobbys free", "hobby"], ["projects projecten", "projects"], ["stage internship intern hire job", "stage"], ["cv resume", "cv"], ["why waarom", "why"]]) alias(names, () => answer(t()[key]));
  const visit = (name, url) => { answer(t().opening(name)); window.open(url, "_blank", "noopener"); };
  alias("linkedin", () => visit("LinkedIn", "https://www.linkedin.com/in/yente-vh-72956a2ab/"));
  alias("instagram insta", () => visit("Instagram", "https://www.instagram.com/yentevh/"));
  alias("mail email", () => { answer(t().mail); location.href = "mailto:yentevanhoudt@icloud.com"; });
  for (const [names, page] of [["tennis", "work-tennis"], ["next", "work-next"], ["busleyden app ba", "work-ba-app"]]) alias(names, () => { const a = document.querySelector(`a[href*="${page}"]`); if (a) a.click(); else location.href = `${page}.html`; });

  let buffer = "";
  const field = $("field");
  const show = () => { typed.textContent = buffer || t().hint; typed.classList.toggle("is-hint", !buffer); if (field.value !== buffer) field.value = buffer; };
  const run = () => {
    const said = buffer.trim().toLowerCase().replace(/[!.]+$/, "");
    buffer = "";
    if (Object.hasOwn(DO, said)) DO[said](); else if (said) answer(t().what(said));
    show();
  };
  field.addEventListener("input", () => { buffer = field.value.slice(0, 22); show(); });
  field.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); run(); } else if (e.key === "Escape") { buffer = ""; show(); field.blur(); } });
  show();
  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing || scrollY > innerHeight * 0.5 || e.target.closest?.("input, textarea, select, button, a, dialog[open], [contenteditable]") || document.querySelector("dialog[open]")) return;
    if (e.key === "Enter" && buffer) return run();
    if (e.key === "Backspace" && buffer) buffer = buffer.slice(0, -1);
    else if (e.key === "Escape") buffer = "";
    else if (/^[a-z0-9?]$/i.test(e.key) && buffer.length < 22) buffer += e.key.toLowerCase();
    else if (e.key === " " && buffer) { buffer += " "; e.preventDefault(); }   // an empty prompt leaves the space bar to the page
    else return;
    show();
  });
}
