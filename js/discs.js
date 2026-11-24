/* ------------------------------------------------------------------ */
/* Plastic colours. deep = body, mid = colour of the glow, hi = glint. */
/* ------------------------------------------------------------------ */
export const CASES = {
  clear:  { deep: [0.035, 0.045, 0.065], mid: [0.60, 0.66, 0.76], hi: [1.0, 1.0, 1.0], panel: [0.64, 0.68, 0.72], css: "#c9d2e0" },
  ember:  { deep: [0.150, 0.022, 0.004], mid: [1.00, 0.25, 0.07], hi: [1.0, 0.88, 0.78], panel: [1.00, 0.42, 0.24], css: "#ff4a1c" },
  violet: { deep: [0.060, 0.014, 0.170], mid: [0.48, 0.22, 1.00], hi: [0.95, 0.90, 1.0], panel: [0.55, 0.38, 0.98], css: "#7b3dff" },
  aqua:   { deep: [0.000, 0.075, 0.100], mid: [0.02, 0.70, 0.82], hi: [0.86, 1.0, 1.0], panel: [0.22, 0.74, 0.82], css: "#12c4d8" },
  amber:  { deep: [0.095, 0.060, 0.012], mid: [0.95, 0.62, 0.16], hi: [1.0, 0.96, 0.84], panel: [0.95, 0.70, 0.30], css: "#f0a22c" },
  lime:   { deep: [0.035, 0.085, 0.000], mid: [0.56, 0.95, 0.06], hi: [0.96, 1.0, 0.84], panel: [0.60, 0.88, 0.20], css: "#9cf01a" },
};
/* The discs. Same case, different look. `track` gets an mp3 later on. */
export const DISCS = [
  { name: "Oil Slick", mode: 0, seed: 2.3, shell: "clear", track: null },
  { name: "Prism", mode: 5, seed: 3.2, shell: "ember", track: null },
  { name: "Ultraviolet", mode: 1, seed: 7.9, shell: "violet", track: null },
  { name: "Cell Pour", mode: 2, seed: 4.1, shell: "aqua", track: null },
  { name: "Engraved", mode: 3, seed: 1.0, shell: "amber", track: null },
  { name: "Side A", mode: 4, seed: 5.5, shell: "lime", track: null },
];
