/* Y2K wordmarks: every letter is stretched, slanted and pushed into the next one, with a sparkle.
   Letter: [character, width, height, slant in degrees, overlap with the previous letter, shift down, weight] */
const FONT = '"Bodoni Moda"';
const MARKS = {
  "Oil Slick": { star: [0, 0.5, 0.5, 0.36], l: [["O", 2.1, 1.02, -24, 0, 2, 600], ["i", 1.3, 1.0, 0, 26, 0], ["l", 1.3, 1.3, 0, 5, 0], ["S", 1.75, 1.6, -8, 0, 14], ["l", 1.3, 1.2, 0, 14, 0], ["i", 1.3, 0.95, 0, 5, 0], ["c", 1.9, 1.15, -16, 8, 2, 760], ["k", 2.1, 1.3, 0, 16, 0]] },
  "Prism": { spark: [0.655, -0.02, 19], l: [["P", 2.0, 1.35, 0, 0, 14], ["r", 1.6, 1.05, 0, 14, 0], ["i", 1.4, 1.1, 0, 8, 0], ["s", 2.1, 1.6, -12, 10, 10], ["m", 1.95, 1.05, 0, 14, 0]] },
  "Ultraviolet": { star: [7, 0.5, 0.5, 0.31], l: [["U", 1.5, 1.4, 0, 0, 10], ["l", 1.15, 1.15, 0, 13, 0], ["t", 1.25, 1.05, 0, 6, 0], ["r", 1.25, 0.95, 0, 6, 0], ["a", 1.25, 1.0, 0, 8, 0], ["v", 1.5, 1.3, 0, 13, 10], ["i", 1.15, 0.95, 0, 17, 0], ["o", 2.5, 1.5, -26, 10, 4, 600], ["l", 1.15, 1.3, 0, 22, 0], ["e", 1.5, 1.05, -14, 10, 0, 800], ["t", 1.6, 1.35, 0, 10, 4]] },
  "Cell Pour": { star: [5, 0.5, 0.5, 0.31], l: [["C", 2.0, 1.4, -20, 0, 8, 760], ["e", 1.55, 1.05, -14, 24, 0, 800], ["l", 1.25, 1.1, 0, 8, 0], ["l", 1.25, 1.35, 0, 5, 8], ["P", 1.7, 1.2, 0, 2, 0], ["o", 2.6, 1.55, -26, 22, 6, 600], ["u", 1.5, 1.0, 0, 24, 0], ["r", 1.9, 1.25, 0, 10, 0]] },
  "Engraved": { spark: [0.665, 0.03, 15], l: [["E", 1.8, 1.45, 0, 0, 12], ["n", 1.4, 1.0, 0, 14, 0], ["g", 1.5, 1.15, 0, 9, 0], ["r", 1.4, 0.95, 0, 9, 0], ["a", 1.4, 1.0, 0, 8, 0], ["v", 1.9, 1.5, 0, 16, 12], ["e", 1.9, 1.15, -20, 24, 2, 760], ["d", 1.8, 1.3, 0, 14, 0]] },
  "Side A": { spark: [0.665, 0.13, 17], l: [["S", 2.1, 1.5, -12, 0, 12], ["i", 1.4, 1.0, 0, 12, 0], ["d", 1.75, 1.2, 0, 7, 0], ["e", 2.1, 1.25, -22, 15, 2, 760], ["A", 2.2, 1.5, 0, 16, 10]] },
  "YV": { l: [["Y", 1.7, 1.15, 0, 0, 0], ["V", 1.7, 1.15, 0, 22, 22]] },
};
let ctx = null;
function ink(ch, weight) {
  ctx ||= document.createElement("canvas").getContext("2d");
  ctx.font = `${weight} 100px ${FONT}, "Bodoni MT", Didot, serif`;
  const m = ctx.measureText(ch);
  return { l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent };
}
const f = (n) => Math.round(n * 100) / 100;
/* four-pointed sparkle */
const sparkle = (x, y, r, s = 1) => { const k = r * 0.1; return `M${f(x)} ${f(y - r * s)}C${f(x + k)} ${f(y - k * 2)} ${f(x + k * 2)} ${f(y - k)} ${f(x + r)} ${f(y)}C${f(x + k * 2)} ${f(y + k)} ${f(x + k)} ${f(y + k * 2)} ${f(x)} ${f(y + r * s)}C${f(x - k)} ${f(y + k * 2)} ${f(x - k * 2)} ${f(y + k)} ${f(x - r)} ${f(y)}C${f(x - k * 2)} ${f(y - k)} ${f(x - k)} ${f(y - k * 2)} ${f(x)} ${f(y - r * s)}Z`; };

export function wordmark(name, own) {
  const mark = own || MARKS[name] || { l: [...name].filter((c) => c !== " ").map((c, i) => [c, 1.4, i ? 1.05 : 1.2, 0, 6, 0]) };
  let x = 0, out = "", box = { l: 1e9, r: -1e9, t: 1e9, b: -1e9 };
  const cells = [];
  mark.l.forEach(([ch, sx, sy, slant, overlap, dy = 0, weight = 900], i) => {
    const m = ink(ch, weight), k = Math.tan((slant * Math.PI) / 180), mid = ((m.t + m.b) / 2) * sy;
    const lean = -k * mid;                                   // keep slanted letters centred on their place
    const tx = x - m.l * sx - (i ? overlap : 0) + 0;
    out += `<text transform="matrix(${f(sx)} 0 ${f(k * sy)} ${f(sy)} ${f(tx + lean)} ${f(dy)})"${weight < 900 ? ` style="font-weight:${weight}"` : ""}>${ch}</text>`;
    const c = { l: tx + m.l * sx, r: tx + m.r * sx, t: m.t * sy + dy, b: m.b * sy + dy };
    cells.push(c);
    const over = Math.abs(k) * (c.b - c.t) / 2;
    box = { l: Math.min(box.l, c.l - over), r: Math.max(box.r, c.r + over), t: Math.min(box.t, c.t), b: Math.max(box.b, c.b) };
    x = c.r;
  });
  let stars = "";
  if (mark.star && mark.star[3]) { const [i, u, v, r] = mark.star, c = cells[i]; stars += sparkle(c.l + (c.r - c.l) * u, c.t + (c.b - c.t) * v, (c.b - c.t) * r, 1); }
  if (mark.spark) { const [u, v, r] = mark.spark; stars += sparkle(box.l + (box.r - box.l) * u, box.t + (box.b - box.t) * v, r, 1.25); box.t = Math.min(box.t, box.t + (box.b - box.t) * v - r * 1.25); }
  const p = 2;
  return `<svg class="wordmark" viewBox="${f(box.l - p)} ${f(box.t - p)} ${f(box.r - box.l + 2 * p)} ${f(box.b - box.t + 2 * p)}" aria-hidden="true" focusable="false"><g>${out}<path d="${stars || "M0 0"}"/></g></svg>`;
}
export const wordmarkReady = () => (document.fonts ? Promise.all([600, 760, 800, 900].map((w) => document.fonts.load(`${w} 100px ${FONT}`, "OilPrsm"))).catch(() => {}) : Promise.resolve());
export const WORDS = Object.keys(MARKS);
