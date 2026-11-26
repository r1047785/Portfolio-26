/* Turns a 3D scan (.ply or .glb, mesh or point cloud) into assets/portrait.bin: the dots of the homepage portrait.
   node tools/make-portrait.cjs scan.ply [--keep 1] [--turn 0] [--tilt 0] [--count 45000] [--out assets/portrait.bin]
   --keep  part of the model to keep, measured from the top (0.35 = head and shoulders of a full body)
   --turn  degrees around the vertical axis, so the face looks at you
   --tilt  degrees around the side axis, when the scan leans forward or back
   File: "DUST" + uint32 count, then per dot: int16 x y z (-1..1 of the half height), int8 normal xyz, uint8 brightness. */
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const file = args[0], keep = +opt("keep", 1), turn = +opt("turn", 0) * Math.PI / 180, tilt = +opt("tilt", 0) * Math.PI / 180;
const count = +opt("count", 45000), out = opt("out", path.join(__dirname, "..", "assets", "portrait.bin"));
if (!file) { console.log("usage: node tools/make-portrait.cjs scan.ply|scan.glb [--keep 1] [--turn 0] [--tilt 0]"); process.exit(1); }

/* ---------- read: gives positions, optional normals, optional colours (0..1), optional triangles ---------- */
function readPly(buf) {
  const end = buf.indexOf("end_header") + "end_header".length, head = buf.slice(0, end).toString("latin1");
  let body = end; while (buf[body] === 10 || buf[body] === 13) body++;
  const format = head.match(/format (\w+)/)[1], elements = [];
  for (const line of head.split(/\r?\n/)) {
    const w = line.trim().split(/\s+/);
    if (w[0] === "element") elements.push({ name: w[1], n: +w[2], props: [] });
    else if (w[0] === "property") elements.at(-1).props.push(w[1] === "list" ? { list: true, count: w[2], type: w[3], name: w[4] } : { type: w[1], name: w[2] });
  }
  const size = { char: 1, uchar: 1, int8: 1, uint8: 1, short: 2, ushort: 2, int16: 2, uint16: 2, int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 };
  const be = format === "binary_big_endian", get = (t, o) => {
    switch (size[t] === 1 ? (/u/.test(t) ? "u1" : "i1") : t) {
      case "u1": return buf.readUInt8(o); case "i1": return buf.readInt8(o);
      case "short": case "int16": return be ? buf.readInt16BE(o) : buf.readInt16LE(o);
      case "ushort": case "uint16": return be ? buf.readUInt16BE(o) : buf.readUInt16LE(o);
      case "int": case "int32": return be ? buf.readInt32BE(o) : buf.readInt32LE(o);
      case "uint": case "uint32": return be ? buf.readUInt32BE(o) : buf.readUInt32LE(o);
      case "float": case "float32": return be ? buf.readFloatBE(o) : buf.readFloatLE(o);
      default: return be ? buf.readDoubleBE(o) : buf.readDoubleLE(o);
    }
  };
  const P = [], N = [], C = [], T = [];
  let o = body, words = format === "ascii" ? buf.slice(body).toString("latin1").split(/\s+/).filter(Boolean) : null, wi = 0;
  const next = (t) => { if (words) return +words[wi++]; const v = get(t, o); o += size[t]; return v; };
  for (const el of elements) for (let i = 0; i < el.n; i++) {
    const v = {};
    for (const p of el.props) {
      if (p.list) { const k = next(p.count), l = []; for (let j = 0; j < k; j++) l.push(next(p.type)); v[p.name] = l; }
      else v[p.name] = next(p.type);
    }
    if (el.name === "vertex") {
      P.push(v.x, v.y, v.z);
      if ("nx" in v) N.push(v.nx, v.ny, v.nz);
      const r = v.red ?? v.r ?? v.diffuse_red, g = v.green ?? v.g ?? v.diffuse_green, b = v.blue ?? v.b ?? v.diffuse_blue;
      if (r !== undefined) { const s = r > 1 || g > 1 || b > 1 ? 255 : 1; C.push(r / s, g / s, b / s); }
      else if ("f_dc_0" in v) { const k = 0.2820948; C.push(0.5 + k * v.f_dc_0, 0.5 + k * v.f_dc_1, 0.5 + k * v.f_dc_2); } // gaussian splats
    } else if (el.name === "face") {
      const f = v.vertex_indices || v.vertex_index || Object.values(v)[0];
      for (let j = 1; j + 1 < f.length; j++) T.push(f[0], f[j], f[j + 1]);
    }
  }
  return { P, N: N.length ? N : null, C: C.length ? C : null, T: T.length ? T : null };
}
function readGlb(buf) {
  const jl = buf.readUInt32LE(12), json = JSON.parse(buf.slice(20, 20 + jl).toString()), bin = buf.slice(28 + jl);
  if (json.extensionsUsed?.includes("KHR_draco_mesh_compression")) throw new Error("Draco .glb: export it again without compression");
  const acc = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    const stride = v.byteStride || n * C.BYTES_PER_ELEMENT, out = [], off = (v.byteOffset || 0) + (a.byteOffset || 0);
    for (let k = 0; k < a.count; k++) for (let j = 0; j < n; j++) out.push(new C(bin.buffer.slice(bin.byteOffset + off + k * stride + j * C.BYTES_PER_ELEMENT, bin.byteOffset + off + k * stride + (j + 1) * C.BYTES_PER_ELEMENT))[0] / (a.normalized ? (C === Uint8Array ? 255 : 65535) : 1));
    return out;
  };
  const mul = (a, b) => { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return r; };
  const local = (n) => {
    if (n.matrix) return n.matrix;
    const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
    return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
  };
  const image = (i) => {                                  // decode with ffmpeg (needs ffmpeg on the PATH)
    const v = json.bufferViews[json.images[i].bufferView], tmp = path.join(os.tmpdir(), "portrait-tex-" + i);
    fs.writeFileSync(tmp, bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));
    const size = 512, raw = execFileSync("ffmpeg", ["-v", "error", "-i", tmp, "-vf", `scale=${size}:${size}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 26 });
    fs.unlinkSync(tmp);
    return { at: (u, w) => { const x = Math.min(size - 1, Math.max(0, (((u % 1) + 1) % 1) * size | 0)), y = Math.min(size - 1, Math.max(0, (((w % 1) + 1) % 1) * size | 0)), o = (y * size + x) * 3; return [raw[o] / 255, raw[o + 1] / 255, raw[o + 2] / 255]; } };
  };
  const P = [], N = [], C = [], T = [];
  const walk = (ni, m) => {
    const node = json.nodes[ni], w = mul(m, local(node));
    if (node.mesh !== undefined) for (const prim of json.meshes[node.mesh].primitives) {
      const base = P.length / 3, pos = acc(prim.attributes.POSITION), nor = prim.attributes.NORMAL !== undefined ? acc(prim.attributes.NORMAL) : null;
      const col = prim.attributes.COLOR_0 !== undefined ? acc(prim.attributes.COLOR_0) : null, cn = col ? col.length / (pos.length / 3) : 0;
      const pbr = json.materials?.[prim.material]?.pbrMetallicRoughness || {}, mat = pbr.baseColorFactor || [0.8, 0.8, 0.8, 1];
      const tex = !col && pbr.baseColorTexture && prim.attributes.TEXCOORD_0 !== undefined ? image(json.textures[pbr.baseColorTexture.index].source) : null;
      const uv = tex ? acc(prim.attributes.TEXCOORD_0) : null;
      for (let i = 0; i < pos.length; i += 3) {
        const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]];
        P.push(w[0] * x + w[4] * y + w[8] * z + w[12], w[1] * x + w[5] * y + w[9] * z + w[13], w[2] * x + w[6] * y + w[10] * z + w[14]);
        if (nor) { const [a, b, c] = [nor[i], nor[i + 1], nor[i + 2]]; N.push(w[0] * a + w[4] * b + w[8] * c, w[1] * a + w[5] * b + w[9] * c, w[2] * a + w[6] * b + w[10] * c); }
        const k = i / 3;
        if (tex) { const c = tex.at(uv[k * 2], uv[k * 2 + 1]); C.push(c[0], c[1], c[2]); }
        else C.push(col ? col[k * cn] : mat[0], col ? col[k * cn + 1] : mat[1], col ? col[k * cn + 2] : mat[2]);
      }
      const idx = prim.indices !== undefined ? acc(prim.indices) : [...Array(pos.length / 3).keys()];
      for (const i of idx) T.push(base + i);
    }
    for (const c of node.children || []) walk(c, w);
  };
  for (const r of json.scenes[json.scene || 0].nodes) walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { P, N: N.length === P.length ? N : null, C, T: T.length ? T : null };
}

const buf = fs.readFileSync(file), m = /\.glb$/i.test(file) ? readGlb(buf) : readPly(buf);
console.log(`read ${m.P.length / 3} points, ${m.T ? m.T.length / 3 + " triangles" : "no triangles"}, ${m.N ? "normals" : "no normals"}, ${m.C ? "colours" : "no colours"}`);

/* ---------- brightness from detail, not from colour: dark hair should not vanish, curls and features should show ---------- */
if (m.T && m.C) {
  const nv = m.P.length / 3, L = new Float64Array(nv), nb = Array.from({ length: nv }, () => new Set());
  for (let i = 0; i < nv; i++) L[i] = 0.299 * m.C[i * 3] + 0.587 * m.C[i * 3 + 1] + 0.114 * m.C[i * 3 + 2];
  for (let t = 0; t < m.T.length; t += 3) { const [i, j, k] = [m.T[t], m.T[t + 1], m.T[t + 2]]; nb[i].add(j).add(k); nb[j].add(i).add(k); nb[k].add(i).add(j); }
  let S = Float64Array.from(L);
  for (let pass = 0; pass < 4; pass++) { const n = new Float64Array(nv); for (let i = 0; i < nv; i++) { let s2 = S[i], c = 1; for (const j of nb[i]) { s2 += S[j]; c++; } n[i] = s2 / c; } S = n; }
  for (let i = 0; i < nv; i++) { const g = Math.max(0, Math.min(1, 0.5 + 2.4 * (L[i] - S[i]))); m.C[i * 3] = m.C[i * 3 + 1] = m.C[i * 3 + 2] = g; }
}

/* ---------- smooth normals for a mesh without them, pointing outwards ---------- */
if (m.T && !m.N) {
  const N = new Float64Array(m.P.length);
  for (let t = 0; t < m.T.length; t += 3) {
    const [i, j, k] = [m.T[t], m.T[t + 1], m.T[t + 2]], a = [m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]];
    const e1 = [m.P[j * 3] - a[0], m.P[j * 3 + 1] - a[1], m.P[j * 3 + 2] - a[2]], e2 = [m.P[k * 3] - a[0], m.P[k * 3 + 1] - a[1], m.P[k * 3 + 2] - a[2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [i, j, k]) { N[v * 3] += c[0]; N[v * 3 + 1] += c[1]; N[v * 3 + 2] += c[2]; }
  }
  // the winding of a scan can be either way: if most normals point inwards, turn them all around
  let mx = 0, my = 0, mz = 0; const nv = m.P.length / 3; for (let i = 0; i < nv; i++) { mx += m.P[i * 3]; my += m.P[i * 3 + 1]; mz += m.P[i * 3 + 2]; } mx /= nv; my /= nv; mz /= nv;
  let out = 0; for (let i = 0; i < nv; i++) out += Math.sign(N[i * 3] * (m.P[i * 3] - mx) + N[i * 3 + 1] * (m.P[i * 3 + 1] - my) + N[i * 3 + 2] * (m.P[i * 3 + 2] - mz));
  if (out < 0) for (let i = 0; i < N.length; i++) N[i] = -N[i];
  m.N = Array.from(N);
  console.log(out < 0 ? "normals made, turned outwards" : "normals made");
}

/* ---------- sample the surface (or the cloud) evenly ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vec = (A, i) => [A[i * 3], A[i * 3 + 1], A[i * 3 + 2]], unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
let dots = [];
if (m.T) {
  const area = [], tri = m.T.length / 3; let sum = 0;
  for (let t = 0; t < tri; t++) { const a = vec(m.P, m.T[t * 3]), b = vec(m.P, m.T[t * 3 + 1]), c = vec(m.P, m.T[t * 3 + 2]); sum += Math.hypot(...cross(sub(b, a), sub(c, a))) / 2; area.push(sum); }
  const raw = count * 3;                                   // more than needed: the crop throws some away
  for (let i = 0; i < raw; i++) {
    const r = Math.random() * sum; let lo = 0, hi = tri - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (area[mid] < r) lo = mid + 1; else hi = mid; }
    const [ia, ib, ic] = [m.T[lo * 3], m.T[lo * 3 + 1], m.T[lo * 3 + 2]];
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
    const mix = (A) => { const a = vec(A, ia), b = vec(A, ib), c = vec(A, ic); return [a[0] * w + b[0] * u + c[0] * v, a[1] * w + b[1] * u + c[1] * v, a[2] * w + b[2] * u + c[2] * v]; };
    const n = m.N ? unit(mix(m.N)) : unit(cross(sub(vec(m.P, ib), vec(m.P, ia)), sub(vec(m.P, ic), vec(m.P, ia))));
    dots.push({ p: mix(m.P), n, b: m.C ? lum(mix(m.C)) : 0.7 });
  }
} else {
  for (let i = 0; i < m.P.length / 3; i++) dots.push({ p: vec(m.P, i), n: m.N ? unit(vec(m.N, i)) : null, b: m.C ? lum(vec(m.C, i)) : 0.7 });
}

/* ---------- turn, crop from the top, centre, scale ---------- */
const ct = Math.cos(turn), st = Math.sin(turn), cl = Math.cos(tilt), sl = Math.sin(tilt);
const rot = (v) => { let [x, y, z] = v; [x, z] = [ct * x + st * z, -st * x + ct * z]; [y, z] = [cl * y - sl * z, sl * y + cl * z]; return [x, y, z]; };
for (const d of dots) { d.p = rot(d.p); if (d.n) d.n = rot(d.n); }
let top = -Infinity, low = Infinity; for (const d of dots) { top = Math.max(top, d.p[1]); low = Math.min(low, d.p[1]); }
const cut = top - (top - low) * keep; dots = dots.filter((d) => d.p[1] >= cut);
// without normals (a bare point cloud), point them away from the middle of the body at that height
// centre on the head (the top 40%), not on the shoulders, which are often scanned unevenly
const headLine = top - (top - cut) * 0.4, heads = dots.filter((d) => d.p[1] > headLine);
let cx = 0, cz = 0; for (const d of heads) { cx += d.p[0]; cz += d.p[2]; } cx /= heads.length; cz /= heads.length;
for (const d of dots) if (!d.n) d.n = unit([d.p[0] - cx, 0.15, d.p[2] - cz]);
const half = (top - cut) / 2, cy = (top + cut) / 2;
// more dots on the head, fewer on the shoulders
const neck = top - (top - cut) * 0.62; dots = dots.filter((d) => d.p[1] > neck || Math.random() < 0.42);
for (let i = dots.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [dots[i], dots[j]] = [dots[j], dots[i]]; }  // shuffled: phones can read just the first part
dots = dots.slice(0, count);
// brightness: spread it over the full range, so the scan's light stays visible without one flat grey
const bs = dots.map((d) => d.b).sort((a, b) => a - b), b0 = bs[(bs.length * 0.02) | 0], b1 = bs[(bs.length * 0.98) | 0] || 1;

const outBuf = Buffer.alloc(8 + dots.length * 10);
outBuf.write("DUST", 0, "latin1"); outBuf.writeUInt32LE(dots.length, 4);
const q = (v) => Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
dots.forEach((d, i) => {
  const o = 8 + i * 10;
  outBuf.writeInt16LE(q((d.p[0] - cx) / half / 2), o); outBuf.writeInt16LE(q((d.p[1] - cy) / half / 2), o + 2); outBuf.writeInt16LE(q((d.p[2] - cz) / half / 2), o + 4);
  outBuf.writeInt8(Math.round(d.n[0] * 127), o + 6); outBuf.writeInt8(Math.round(d.n[1] * 127), o + 7); outBuf.writeInt8(Math.round(d.n[2] * 127), o + 8);
  outBuf.writeUInt8(Math.round(Math.max(0, Math.min(1, b1 - b0 > 0.02 ? (d.b - b0) / (b1 - b0) : 0.7)) * 255), o + 9);
});
fs.writeFileSync(out, outBuf);
console.log(`wrote ${dots.length} dots to ${out} (${(outBuf.length / 1024).toFixed(0)} KB)`);
