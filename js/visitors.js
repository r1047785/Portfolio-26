/* Who has the homepage open right now. The live server (Cloudflare) only knows a random number per open page:
   no names, no cookies, nothing stored. Without the server you are simply alone. */
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const LIVE = local ? "ws://localhost:8787" : "wss://live-walkers.r1047785.workers.dev";

export function watchVisitors(onChange) {
  let socket = null, me = null, tries = 0, retry = 0, beat = 0;
  const others = new Set();
  const tell = () => onChange({ me, others: [...others], online: !!me });
  function connect() {
    clearTimeout(retry);
    if (socket) return;
    const ws = (socket = new WebSocket(`${LIVE}/?x=0.5`));
    ws.onopen = () => { beat = setInterval(() => { if (ws.readyState === 1) ws.send("ping"); }, 30000); };
    ws.onmessage = ({ data }) => {
      if (data === "pong") return;
      let m;
      try { m = JSON.parse(data); } catch { return; }
      if (m.t === "hi") { me = m.id; tries = 0; others.clear(); for (const o of m.all) others.add(o.id); }
      else if (m.t === "in") others.add(m.id);
      else if (m.t === "out") others.delete(m.id);
      else return;
      tell();
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      clearInterval(beat);
      socket = null; me = null; others.clear(); tell();
      retry = setTimeout(connect, Math.min(60000, 2000 * 2 ** tries++) * (0.8 + Math.random() * 0.4));
    };
  }
  addEventListener("pagehide", () => { clearTimeout(retry); clearInterval(beat); const ws = socket; socket = null; ws?.close(); });
  addEventListener("pageshow", (e) => { if (e.persisted) connect(); });
  tell();
  connect();
}
