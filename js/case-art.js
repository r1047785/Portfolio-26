/* Paints the clear plastic case as light maps. Everything is drawn in code, in a 736 x 736 space.
   red = light caught by the plastic, green = darker refraction, blue = body of the plastic. */
export const ART = 736;
export const CENTER = { x: 363, y: 364 }; // middle of the disc inside the case

/* outline of the case: recessed in the middle of the top and bottom edge, open at the tab */
export function outline() {
  const p = [], arc = (cx, cy, r, a0, a1, n = 8) => { for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  const q = Math.PI / 2;
  p.push([204, 46], [209, 55], [517, 55], [522, 46]);
  arc(661, 72, 26, -q, 0); arc(661, 660, 26, 0, q);
  p.push([522, 686], [517, 678], [209, 678], [204, 686]);
  arc(75, 650, 36, q, 2 * q); p.push([39, 416], [46, 415]);
  arc(47, 407, 7, q, 0, 4); arc(47, 309, 7, 0, -q, 4); p.push([46, 301], [39, 300]);
  arc(75, 82, 36, 2 * q, 3 * q);
  return p;
}

export function paintCase(size) {
  let seed = 20260;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const make = () => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const c = cv.getContext("2d");
    c.fillStyle = "#000";
    c.fillRect(0, 0, size, size);
    c.scale(size / ART, size / ART);
    c.globalCompositeOperation = "lighter";
    return { cv, c };
  };
  const R = (a) => `rgba(255,0,0,${Math.max(0, Math.min(1, a))})`;
  const G = (a) => `rgba(0,255,0,${Math.max(0, Math.min(1, a))})`;
  const B = (a) => `rgba(0,0,255,${Math.max(0, Math.min(1, a))})`;
  const at = (stops, t) => {
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [t0, v0] = stops[i - 1], [t1, v1] = stops[i];
      return v0 + (v1 - v0) * ((t - t0) / Math.max(1e-4, t1 - t0));
    }
    return stops[stops.length - 1][1];
  };

  const front = make(), mid = make();
  let c = front.c;

  /* a moulded rail: many thin lines, each with its own uneven brightness along the length */
  function rail(vertical, a0, a1, b0, b1, profile, gain = 1) {
    const step = 0.55;
    for (let a = a0; a <= a1; a += step) {
      const v = at(profile, (a - a0) / (a1 - a0)) * gain * (0.72 + 0.5 * rnd());
      const g = vertical ? c.createLinearGradient(0, b0, 0, b1) : c.createLinearGradient(b0, 0, b1, 0);
      const n = 7, ph = rnd() * 6;
      for (let i = 0; i <= n; i++) g.addColorStop(i / n, R(v * (0.62 + 0.38 * Math.sin(ph + i * 1.7)) * (0.8 + 0.3 * rnd())));
      c.fillStyle = g;
      if (vertical) c.fillRect(a, b0, step * 1.05, b1 - b0); else c.fillRect(b0, a, b1 - b0, step * 1.05);
    }
    for (let k = 0; k < (a1 - a0) / 3.2; k++) {
      const a = a0 + rnd() * (a1 - a0), w = 1.5 + rnd() * 4, v = at(profile, (a - a0) / (a1 - a0)) * gain * (0.12 + 0.32 * rnd()), m0 = rnd() * 0.5, m1 = 0.5 + rnd() * 0.5;
      const g = vertical ? c.createLinearGradient(0, b0, 0, b1) : c.createLinearGradient(b0, 0, b1, 0);
      g.addColorStop(0, R(v * rnd())); g.addColorStop(m0, R(v)); g.addColorStop(m1, R(v * rnd())); g.addColorStop(1, R(v * 0.6));
      c.fillStyle = g; if (vertical) c.fillRect(a - w / 2, b0, w, b1 - b0); else c.fillRect(b0, a - w / 2, b1 - b0, w);
    }
    c.fillStyle = G(0.17);
    if (vertical) c.fillRect(a0, b0, a1 - a0, b1 - b0); else c.fillRect(b0, a0, b1 - b0, a1 - a0);
  }
  const V = (x0, x1, y0, y1, p, g) => rail(true, x0, x1, y0, y1, p, g);
  const H = (y0, y1, x0, x1, p, g) => rail(false, y0, y1, x0, x1, p, g);
  /* a single glint with a soft halo and a dark refraction line next to it */
  function line(pts, w, a, halo = 1) {
    const trace = (dx = 0, dy = 0) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy))); };
    c.lineCap = "round"; c.lineJoin = "round";
    trace(1.3, 1.1); c.strokeStyle = G(a * 0.5); c.lineWidth = w + 0.8; c.stroke();
    if (halo) { trace(); c.strokeStyle = R(a * 0.07 * halo); c.lineWidth = w + 7; c.stroke(); c.strokeStyle = R(a * 0.13 * halo); c.lineWidth = w + 2.6; c.stroke(); }
    trace(); c.strokeStyle = R(a); c.lineWidth = w; c.stroke();
  }
  function rbox(x0, y0, x1, y1, r) {
    c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x1, y0, x1, y1, r); c.arcTo(x1, y1, x0, y1, r); c.arcTo(x0, y1, x0, y0, r); c.arcTo(x0, y0, x1, y0, r); c.closePath();
  }
  function blob(x, y, rx, ry, a, col = R) {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, col(a)); g.addColorStop(0.5, col(a * 0.45)); g.addColorStop(1, col(0));
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
  }
  function corner(cx, cy, quarter, radii) {
    for (const [r, w, a] of radii) {
      for (let i = 0; i < 14; i++) {
        const t0 = quarter + (i / 14) * (Math.PI / 2), t1 = quarter + ((i + 1) / 14) * (Math.PI / 2) + 0.01;
        c.beginPath(); c.arc(cx, cy, r, t0, t1); c.lineCap = "butt";
        c.strokeStyle = R(a * (0.6 + 0.4 * Math.sin(i * 0.5 + r)) * (0.85 + 0.2 * rnd())); c.lineWidth = w; c.stroke();
      }
      c.beginPath(); c.arc(cx, cy, r - 1.2, quarter, quarter + Math.PI / 2); c.strokeStyle = G(a * 0.35); c.lineWidth = w; c.stroke();
    }
  }

  /* ================= FRONT: lid, hinge, clips, tab and latch ================= */
  const edge = () => { c.beginPath(); outline().forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  edge(); c.fillStyle = B(0.55); c.fill();
  c.save(); edge(); c.clip();
  c.fillStyle = B(0.2); c.fillRect(39, 78, 48, 576); c.fillRect(656, 78, 31, 576); c.fillRect(70, 46, 596, 34); c.fillRect(70, 652, 596, 34);
  // soft shade where the walls meet the panel
  for (const [x, y, rx, ry, a] of [[95, 366, 46, 290, 0.3], [366, 88, 290, 30, 0.22], [366, 646, 290, 26, 0.3], [640, 366, 26, 290, 0.26]]) blob(x, y, rx, ry, a, G);
  blob(150, 92, 90, 14, 0.2); blob(118, 182, 60, 12, 0.14); blob(126, 590, 22, 70, 0.2); blob(112, 590, 10, 80, 0.16); blob(624, 190, 12, 110, 0.12); blob(626, 570, 10, 90, 0.16); blob(150, 640, 90, 9, 0.22);

  // left hinge
  const hinge = [[0, 0.35], [0.05, 0.95], [0.12, 0.8], [0.18, 0.18], [0.32, 0.07], [0.46, 0.12], [0.5, 0.75], [0.55, 0.3], [0.6, 0.9], [0.66, 0.2], [0.78, 0.4], [0.82, 0.75], [0.87, 0.1], [0.95, 0.25], [1, 0.8]];
  V(40, 73, 82, 254, hinge, 0.95); V(40, 73, 462, 652, hinge, 0.92);
  V(53, 72, 300, 416, [[0, 0.3], [0.1, 0.5], [0.3, 0.15], [0.6, 0.35], [1, 0.2]], 0.75);
  V(73, 84, 80, 184, [[0, 0.1], [0.4, 0.06], [0.75, 0.22], [1, 0.1]], 0.8);
  line([[84.2, 78], [84.2, 182]], 1.1, 0.75); line([[87.6, 74], [87.6, 183]], 1, 0.6);
  line([[40, 178], [62, 178]], 1, 0.5); line([[40, 186], [59, 186], [59, 188]], 1.3, 0.85); line([[62, 181], [78, 184], [82, 187]], 1.5, 0.95);
  line([[58, 176], [58, 188]], 2.4, 0.8); line([[73, 186], [73, 255]], 1.6, 0.9);
  line([[40, 546], [62, 546], [62, 550], [40, 550]], 1.3, 0.8); line([[62, 543], [70, 543], [70, 556], [82, 552]], 1.5, 0.85); line([[73, 462], [73, 548]], 1.2, 0.75);
  c.fillStyle = R(0.98); rbox(62.5, 558, 75, 645, 1.5); c.fill(); c.fillStyle = R(0.12); rbox(58, 553, 80, 650, 5); c.fill();
  line([[84, 553], [84, 648]], 0.9, 0.4); line([[88.6, 552], [88.6, 640]], 2.2, 0.9); 
  V(76, 84, 556, 644, [[0, 0.1], [0.5, 0.3], [1, 0.12]], 0.7);
  for (const y0 of [72, 648]) { H(y0, y0 + 14, 44, 84, [[0, 0.3], [0.2, 0.7], [0.35, 0.15], [0.6, 0.4], [0.75, 0.75], [1, 0.2]], 0.75); blob(62, y0 + 7, 22, 9, 0.3); line([[44, y0 + 13], [84, y0 + 11]], 1, 0.45); }

  // top edge: left block, recessed middle, right block
  const topL = [[0, 0.75], [0.05, 0.95], [0.1, 0.35], [0.14, 0.04], [0.4, 0.03], [0.45, 0.85], [0.5, 0.35], [0.56, 0.12], [0.6, 0.7], [0.66, 0.15], [0.74, 0.1], [0.78, 0.85], [0.83, 0.15], [0.94, 0.08], [0.97, 0.55], [1, 0]];
  const topM = [[0, 0], [0.22, 0], [0.26, 0.42], [0.31, 0.12], [0.5, 0.06], [0.58, 0.5], [0.63, 0.14], [0.74, 0.1], [0.79, 0.75], [0.84, 0.18], [0.95, 0.4], [1, 0]];
  const rev = (p) => p.map(([t, v]) => [1 - t, v]).reverse();
  H(46, 80, 76, 204, topL, 0.95); H(46, 80, 204, 522, topM, 0.85); H(46, 78, 522, 660, topL.map(([t, v]) => [t, v * (t < 0.2 ? 0.9 : 0.6)]), 0.9);
  H(652, 686, 76, 204, rev(topL), 0.95); H(652, 686, 204, 522, rev(topM), 0.9); H(654, 686, 522, 660, rev(topL).map(([t, v]) => [t, v * 0.75]), 0.9);
  const block = (x0, x1, y0, y1, n, a) => { c.fillStyle = R(a * 0.22); c.fillRect(x0, y0, x1 - x0, y1 - y0); for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * i) / (n - 1); line([[x, y0], [x, y1]], i === 0 || i === n - 1 ? 1.5 : 0.8, a * (0.6 + 0.4 * rnd()), 0.6); } line([[x0, y1], [x1, y1]], 1.2, a * 0.8, 0.5); };
  block(137, 151, 48, 65, 4, 0.95); block(192, 203, 48, 64, 3, 0.95); line([[203, 46], [204, 58], [206, 66], [214, 72], [222, 72]], 1.8, 0.95); line([[190, 62], [198, 72], [210, 74]], 1.4, 0.8);
  line([[522, 46], [522, 71]], 1.8, 0.95); line([[531, 48], [531, 70]], 1.2, 0.75); line([[522, 70], [531, 70]], 1.4, 0.8); line([[526, 48], [526, 70]], 0.8, 0.4);
  for (const x of [121, 170]) { line([[x, 62], [x, 72]], 1.3, 0.75, 0.5); line([[x, 661], [x, 670]], 1.3, 0.75, 0.5); }
  block(136, 152, 668, 684, 5, 0.9); line([[192, 660], [196, 664], [196, 684]], 1.8, 0.95); line([[204, 686], [206, 668], [212, 660], [222, 658]], 1.8, 0.9); line([[200, 664], [200, 684]], 1, 0.5);
  line([[522, 658], [522, 684]], 1.6, 0.9); line([[532, 660], [532, 682]], 1.4, 0.85); line([[522, 682], [532, 682]], 1.2, 0.7); line([[520, 659], [538, 659]], 2, 0.9);
  for (const y of [64, 70, 657, 662]) for (const x of [555, 559, 563, 568, 575]) if (rnd() > 0.3) line([[x, y], [x + 2.6, y]], 1.6, 0.85, 0.3);
  line([[222, 66], [520, 66.6]], 0.7, 0.35, 0.4); line([[90, 80], [648, 77]], 0.9, 0.5, 0.5); line([[90, 651], [650, 651]], 1.1, 0.6, 0.5);
  line([[110, 652], [160, 651]], 2.6, 0.8); line([[380, 50], [382, 50]], 1.2, 0.8, 0.3); line([[300, 56], [300, 62]], 0.8, 0.5, 0.2); line([[424, 672], [424, 681]], 0.8, 0.5, 0.2);

  // corners
  corner(75, 82, Math.PI, [[36, 1.6, 0.85], [33.5, 1, 0.5], [31, 1.4, 0.9], [27, 0.9, 0.4], [24, 2.4, 0.5], [19, 1.2, 0.75], [14, 2.6, 0.35], [10, 1.2, 0.6]]);
  corner(75, 650, Math.PI / 2, [[36, 1.6, 0.8], [33, 1, 0.6], [30, 2, 0.8], [26, 1, 0.45], [21, 1.4, 0.7], [16, 2.2, 0.35], [11, 1.1, 0.6]]);
  corner(661, 72, -Math.PI / 2, [[26, 1.6, 0.9], [23, 2.6, 0.55], [19, 1, 0.6], [14, 2.4, 0.22]]);
  corner(661, 660, 0, [[26, 1.6, 0.9], [23, 2.6, 0.5], [19, 1, 0.65], [14, 2, 0.22]]);
  for (const y0 of [47, 655]) { c.fillStyle = R(0.32); c.fillRect(656, y0, 7, 28); line([[656, y0], [656, y0 + 28]], 1.6, 0.9); line([[663, y0], [663, y0 + 27]], 1.2, 0.8); line([[648, y0 + 2], [648, y0 + 25]], 1.2, 0.75); c.fillStyle = R(0.28); c.fillRect(70, y0, 14, 24); line([[84, y0], [84, y0 + 26]], 1.4, 0.8); line([[80, y0 + 2], [80, y0 + 24]], 1, 0.6); }
  blob(660, 62, 9, 14, 0.5); blob(76, 60, 12, 10, 0.5); blob(74, 676, 14, 8, 0.5); blob(658, 672, 8, 12, 0.45);

  // right latch
  V(650, 657, 76, 248, [[0, 0.25], [0.2, 0.85], [0.45, 0.25], [0.7, 0.7], [1, 0.3]], 0.95);
  V(650, 656, 489, 648, [[0, 0.35], [0.3, 0.95], [0.6, 0.55], [1, 0.3]], 1);
  V(657, 683, 84, 170, [[0, 0.35], [0.1, 0.6], [0.2, 0.08], [0.4, 0.16], [0.55, 0.05], [0.7, 0.75], [0.76, 0.12], [0.9, 0.12], [0.96, 0.7], [1, 0.2]], 0.85);
  V(656, 672, 187, 546, [[0, 0.85], [0.1, 0.3], [0.2, 0.95], [0.3, 0.35], [0.42, 1], [0.5, 0.5], [0.62, 0.95], [0.72, 0.25], [0.84, 0.75], [1, 0.15]], 0.95);
  V(672, 683, 187, 546, [[0, 0.1], [0.5, 0.02], [1, 0.14]], 0.8);
  V(683, 687.5, 186, 547, [[0, 0.2], [0.4, 0.95], [1, 0.75]], 1);
  V(657, 683, 562, 652, [[0, 0.9], [0.14, 0.95], [0.26, 0.8], [0.3, 0.1], [0.5, 0.06], [0.66, 0.5], [0.72, 0.1], [0.94, 0.5], [1, 0.2]], 0.9);
  line([[656, 248], [656, 489]], 1, 0.6); line([[674, 72], [674, 140]], 1.6, 0.8); line([[682, 80], [682, 140], [679, 144], [684, 150], [676, 152], [678, 168]], 1.6, 0.9); line([[684, 141], [680, 150]], 1.4, 0.8);
  line([[661, 170], [682, 170], [682, 176], [662, 176], [662, 182], [657, 186], [687, 186]], 1.7, 0.98); line([[667, 170], [667, 186]], 1.3, 0.8); line([[675, 168], [675, 188]], 1.8, 0.9);
  line([[657, 546], [687, 546], [687, 549]], 1.8, 0.98); line([[662, 552], [662, 560], [682, 560], [682, 548]], 1.7, 0.95); line([[670, 547], [670, 561]], 1.3, 0.8); line([[677, 546], [677, 578], [684, 588]], 1.8, 0.9); line([[676, 580], [683, 584]], 1.5, 0.8);
  line([[666, 655], [678, 650]], 1.6, 0.8);
  for (const [x0, y0, x1, y1, a] of [[661, 170, 682, 177, 0.42], [657, 182, 687, 188, 0.35], [657, 545, 687, 550, 0.4], [662, 556, 682, 562, 0.42], [674, 140, 684, 152, 0.3], [670, 176, 678, 184, 0.3], [674, 578, 684, 590, 0.3], [522, 46, 532, 72, 0.2], [522, 658, 532, 684, 0.22], [196, 662, 206, 686, 0.28], [40, 176, 62, 188, 0.22], [40, 544, 62, 552, 0.3], [62, 543, 73, 556, 0.35]]) { c.fillStyle = R(a); c.fillRect(x0, y0, x1 - x0, y1 - y0); blob((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 1.1, (y1 - y0) * 1.6, a * 0.5); }
  blob(60, 120, 16, 60, 0.3); blob(58, 230, 14, 40, 0.28); blob(60, 520, 16, 50, 0.3); blob(664, 366, 9, 150, 0.35); blob(664, 600, 10, 50, 0.3); blob(140, 60, 60, 12, 0.25); blob(150, 672, 60, 12, 0.3); blob(600, 60, 60, 10, 0.16); blob(600, 672, 60, 10, 0.16);

  // tab: erase what lies under the notch, then draw the C
  c.globalCompositeOperation = "source-over"; c.fillStyle = "#000";
  c.beginPath(); c.moveTo(30, 304); c.lineTo(66, 304); c.arcTo(90, 304, 90, 330, 22); c.lineTo(90, 386); c.arcTo(90, 412, 66, 412, 22); c.lineTo(30, 412); c.closePath(); c.fill();
  c.globalCompositeOperation = "lighter";
  V(54, 72, 306, 410, [[0, 0.45], [0.08, 0.6], [0.2, 0.16], [0.4, 0.22], [0.55, 0.5], [0.7, 0.2], [1, 0.3]], 0.75); c.fillStyle = B(0.5); c.fillRect(54, 304, 36, 108);
  const tab = () => { c.beginPath(); c.moveTo(40, 256); c.lineTo(122, 256); c.arcTo(131, 256, 131, 266, 9); c.lineTo(131, 450); c.arcTo(131, 460, 122, 460, 9); c.lineTo(40, 460); c.lineTo(40, 414); c.lineTo(66, 414); c.arcTo(92, 414, 92, 388, 22); c.lineTo(92, 328); c.arcTo(92, 302, 66, 302, 22); c.lineTo(40, 302); c.closePath(); };
  tab(); c.fillStyle = B(0.2); c.fill(); c.fillStyle = R(0.035); c.fill(); c.fillStyle = G(0.2); c.fill();
  c.save(); tab(); c.clip();
  blob(116, 282, 22, 30, 0.35); blob(122, 332, 13, 20, 0.42); blob(120, 428, 22, 34, 0.5); blob(104, 450, 26, 12, 0.4); blob(60, 262, 30, 8, 0.6); blob(60, 455, 30, 8, 0.55);
  V(41, 62, 257, 302, [[0, 0.5], [0.2, 0.85], [0.35, 0.2], [0.7, 0.45], [1, 0.1]], 0.85); V(41, 62, 414, 459, [[0, 0.5], [0.2, 0.8], [0.35, 0.2], [0.7, 0.5], [1, 0.1]], 0.85);
  c.restore();
  tab(); c.lineJoin = "round"; c.strokeStyle = R(0.1); c.lineWidth = 8; c.stroke(); c.strokeStyle = R(0.22); c.lineWidth = 3.8; c.stroke(); c.strokeStyle = R(0.8); c.lineWidth = 1.5; c.stroke();
  line([[131, 268], [131, 448]], 2.2, 0.85); line([[44, 257], [124, 257]], 1.4, 0.6); line([[66, 452], [88, 448], [94, 458], [124, 460]], 1.3, 0.7);
  // frosted lip around the notch
  const lip = (o) => { c.beginPath(); c.moveTo(42, 302 + o); c.lineTo(66, 302 + o); c.arcTo(92 - o, 302 + o, 92 - o, 328, 22 - o * 0.5); c.lineTo(92 - o, 388); c.arcTo(92 - o, 414 - o, 66, 414 - o, 22 - o * 0.5); c.lineTo(42, 414 - o); };
  c.lineCap = "butt";
  for (const [o, w, a] of [[9, 18, 0.2], [8, 14, 0.12], [7, 10, 0.14], [11, 5, 0.14], [4, 4, 0.22], [1, 1.5, 0.75], [17, 1.1, 0.45]]) { lip(o); c.strokeStyle = R(a); c.lineWidth = w; c.stroke(); }
  blob(80, 360, 10, 46, 0.35); blob(60, 408, 24, 8, 0.5); blob(62, 307, 22, 6, 0.4);
  c.fillStyle = R(0.62); rbox(92, 343, 119, 351, 2); c.fill(); rbox(92, 366, 111, 374, 2); c.fill(); c.fillStyle = R(0.55); rbox(70, 343, 93, 374, 2); c.fill();
  line([[119, 343], [119, 374]], 2, 0.75); line([[92, 343], [118, 343]], 1, 0.5); blob(106, 358, 12, 7, 0.18);
  c.fillStyle = R(0.5); for (const y of [350, 356, 363, 368]) c.fillRect(54, y, 3, 3);

  c.restore();
  edge(); c.lineJoin = "round"; c.strokeStyle = R(0.05); c.lineWidth = 7; c.stroke(); c.strokeStyle = R(0.14); c.lineWidth = 2.6; c.stroke(); c.strokeStyle = R(0.34); c.lineWidth = 1; c.stroke();
  // dust and hairline scratches on the panel
  for (let i = 0; i < 520; i++) { const x = 92 + rnd() * 555, y = 84 + rnd() * 562, s = rnd(); c.fillStyle = R(0.08 + s * s * s * 0.5); c.beginPath(); c.arc(x, y, 0.22 + s * s * 0.65, 0, 7); c.fill(); }
  for (let i = 0; i < 34; i++) { const x = 96 + rnd() * 540, y = 90 + rnd() * 550, a = rnd() * 6.3, l = 2 + rnd() * 9, k = (rnd() - 0.5) * 8; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + k, y + Math.sin(a) * l * 0.5 + k, x + Math.cos(a) * l, y + Math.sin(a) * l); c.strokeStyle = R(0.1 + rnd() * 0.3); c.lineWidth = 0.5; c.stroke(); }

  /* ================= MID: tray rings, hub and groove light ================= */
  c = mid.c;
  const { x: cx, y: cy } = CENTER;
  function ring(r, w, a, spread = 0.6, f = 2, from = 0, to = Math.PI * 2) {
    const n = Math.max(24, Math.round(((to - from) * r) / 5)), p1 = rnd() * 6, p2 = rnd() * 6, open = to - from < 6;
    c.lineCap = "butt";
    for (let i = 0; i < n; i++) {
      const t0 = from + ((to - from) * i) / n, t1 = from + ((to - from) * (i + 1)) / n;
      const m = 1 - spread + spread * (0.5 + 0.32 * Math.sin(t0 * f + p1) + 0.18 * Math.sin(t0 * (f * 2 + 1) + p2));
      const ends = open ? Math.pow(Math.sin(Math.PI * (i + 0.5) / n), 1.3) : 1;
      c.beginPath(); c.arc(cx, cy, r, t0, t1); c.strokeStyle = R(a * ends * Math.max(0, m)); c.lineWidth = w; c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r - w * 0.5 - 0.7, from, to); c.strokeStyle = G(a * 0.32); c.lineWidth = 1.1; c.stroke();
  }
  const shadeRing = (r, w, a) => { c.beginPath(); c.arc(cx, cy, r, 0, 7); c.strokeStyle = G(a); c.lineWidth = w; c.stroke(); };
  shadeRing(280, 18, 0.22);
  for (const [r, w, a, s] of [[291, 1.5, 0.75, 0.55], [288.6, 0.8, 0.35, 0.6], [285, 1.8, 0.35, 0.8], [282, 0.8, 0.5, 0.7], [276.5, 1, 0.32, 0.8], [272, 1.6, 0.75, 0.6], [269.5, 0.8, 0.45, 0.6], [266, 2.4, 0.16, 0.8]]) ring(r, w, a, s, 2);
  ring(289, 4.5, 0.55, 0.3, 1, 2.2, 2.95); ring(286, 3, 0.6, 0.3, 1, -0.55, 0.35); ring(271, 3, 0.5, 0.4, 1, 2.3, 3); ring(290, 3, 0.4, 0.4, 1, 0.5, 1.1);
  for (let i = 0; i < 58; i++) { const t = 1.02 + i * 0.0165; if (i % 11 > 8) continue; c.fillStyle = R(0.55); c.beginPath(); c.arc(cx + Math.cos(t) * 279, cy + Math.sin(t) * 279, 0.62, 0, 7); c.fill(); }
  // hub
  shadeRing(109, 48, 0.2); shadeRing(95, 6, 0.4); shadeRing(114.5, 5, 0.28);
  for (const [r, w, a, s] of [[85.4, 1.7, 0.95, 0.3], [89, 3.4, 0.14, 0.9], [93, 1, 0.28, 0.7], [99.5, 4.4, 0.2, 0.8], [104, 1.7, 0.85, 0.45], [107.5, 1, 0.45, 0.7], [110.5, 2.2, 0.35, 0.9], [117.5, 1.6, 0.62, 0.55], [120.5, 3, 0.3, 0.95], [124, 1.3, 0.8, 0.5], [127.5, 1, 0.4, 0.8], [131.5, 1.6, 0.8, 0.6], [134.5, 0.8, 0.3, 0.8]]) ring(r, w, a, s, 2);
  ring(114, 13, 0.26, 0.2, 1, -0.75, 0.42); ring(121, 8, 0.36, 0.2, 1, 2.2, 3.7); ring(109, 5, 0.5, 0.3, 1, -0.4, 0.45); ring(118, 4, 0.55, 0.3, 1, 2.5, 3.25); ring(98, 5, 0.3, 0.4, 1, 0.8, 1.9);
  for (const [r, a0, a1] of [[140, -2.5, -2.2], [143, -0.5, 0.3], [146, 2.9, 3.6], [139, 0.5, 1.2], [148, 1.0, 1.5], [143, -1.0, -0.7], [137, -1.9, -1.1], [151, 0.35, 0.8], [154, 3.4, 3.7]]) ring(r, 1.1, 0.5, 0.5, 3, a0, a1);
  for (const [t, r0, r1, w, a] of [[-2.36, 88, 116, 1.5, 0.55], [-2.33, 120, 134, 0.8, 0.35], [2.28, 102, 124, 1.5, 0.55], [0.6, 90, 116, 1.4, 0.55], [0.72, 87, 97, 1.1, 0.5], [-1.28, 94, 99, 1.4, 0.45], [3.3, 108, 116, 1, 0.35]]) line([[cx + Math.cos(t) * r0, cy + Math.sin(t) * r0], [cx + Math.cos(t) * r1, cy + Math.sin(t) * r1]], w, a, 0.5);
  for (const q of [0, 1, 2, 3]) { const t = q * (Math.PI / 2) + Math.PI / 4; c.beginPath(); c.arc(cx + Math.cos(t) * 55, cy + Math.sin(t) * 55, 10, 0, 7); c.strokeStyle = R(0.38); c.lineWidth = 1; c.stroke(); }
  c.beginPath(); c.arc(cx, cy, 40.5, 0, 7); c.strokeStyle = R(0.8); c.lineWidth = 1.5; c.stroke();
  // light raking over the grooves: strong on the right, softer on the lower left
  function groove(center, width, r0, r1, gain, gap) {
    for (let r = r0; r < r1; r += 0.85) {
      const g = gain * (0.25 + 0.75 * rnd()) * (gap(r) ? 0.08 : 1), half = width * (0.5 + 0.75 * rnd()), off = (rnd() - 0.5) * 0.05;
      const n = 12; c.lineCap = "butt";
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * 2 - 1; c.beginPath(); c.arc(cx, cy, r, center + off + half * (u - 1 / n), center + off + half * (u + 1 / n)); c.strokeStyle = R(g * Math.pow(1 - u * u, 2)); c.lineWidth = 0.95; c.stroke(); }
    }
  }
  groove(0.03, 0.27, 152, 260, 0.46, (r) => (r > 186 && r < 190) || (r > 216 && r < 221));
  groove(0.02, 0.6, 152, 252, 0.13, (r) => r % 17 < 4);
  groove(2.66, 0.42, 158, 258, 0.22, (r) => r % 21 < 5);
  groove(2.95, 0.2, 170, 240, 0.16, () => false);
  groove(-2.2, 0.3, 150, 182, 0.12, (r) => r % 9 < 4);
  return { front: front.cv, mid: mid.cv };
}
