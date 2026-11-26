/* The homepage portrait: a 3D scan turned into dust (assets/portrait.bin, made by tools/make-portrait.cjs).
   Every dot lives on the GPU: the intro, the breathing, the pointer and the turn are all in the vertex shader. */
export const CONFIG = {
  count: 60000,          // dots on a desktop
  countPhone: 22000,     // dots on a phone
  size: [1.2, 2.6],        // smallest and largest dot, in CSS pixels
  opacity: [0.35, 1],
  jitter: 0.004,         // a little randomness on every place, so it looks grainy instead of scanned
  noise: 0.006,          // how far the dots breathe around their place
  radius: 0.2,           // the pointer lights up dots within this part of the screen height
  glow: 1.8,             // and this much brighter at its centre
  turn: [5, 3],          // most the bust turns with the pointer, in degrees (left-right, up-down)
  intro: 2,              // seconds for the dust to fly in
  fade: 0.32,            // the lowest part of the bust that fades away
  orbs: 12,              // most visitors drawn as a light; more are counted, not drawn
  orbLight: 1.6,         // how much one light brightens the dots near it
};

const VERT = `
attribute vec3 aPos, aNor; attribute vec4 aRnd; attribute float aBright;
uniform vec2 uRes, uMouse; uniform vec4 uBox; uniform float uTime, uIntro, uPush, uDpr, uNoise, uRadius, uGlow, uMotion;
uniform vec2 uTurn, uSize, uOpacity; uniform float uFade, uLift; uniform vec4 uOrb[12];
varying float vA;
// simplex noise (Ashima Arts, MIT)
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  vec3 ns=.142857142857*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
mat3 turn(float y, float x){ float cy=cos(y), sy=sin(y), cx=cos(x), sx=sin(x); return mat3(cy,0.,-sy, 0.,1.,0., sy,0.,cy)*mat3(1.,0.,0., 0.,cx,sx, 0.,-sx,cx); }
void main(){
  vec3 p = aPos;
  // breathing: every dot drifts in a slow noise field around its place
  float t = uTime*.18;
  p += uNoise*uMotion*vec3(snoise(p*3.+vec3(t,0.,0.)), snoise(p*3.+vec3(0.,t+17.,0.)), snoise(p*3.+vec3(0.,0.,t+31.)));
  mat3 R = turn(uTurn.x, uTurn.y);
  vec3 q = R*p, n = R*aNor;
  float persp = 3.2/(3.2-q.z);
  vec2 at = uBox.xy + vec2(q.x, -q.y)*uBox.z*persp;
  // the pointer is a small lamp: the dots under it light up, most where the surface faces it
  vec2 d = at-uMouse; float l = length(d), w = uRadius*uRes.y;
  float near = exp(-l*l/(w*w));
  vec3 lamp = normalize(vec3(-d.x, d.y, w*1.2));
  float shine = uPush*near*(.35+.65*max(0., dot(n, lamp)));
  // the intro: from a loose cloud to the face, easeOutExpo
  float k = clamp((uIntro - aRnd.y*.25)/.75, 0., 1.); k = k >= 1. ? 1. : 1.-pow(2., -10.*k);
  vec2 cloud = uBox.xy + (vec2(aRnd.z, aRnd.x)-.5)*uRes*vec2(1.3,1.2) + vec2(0., -uRes.y*.05);
  at = mix(cloud, at, k);
  // every visitor is a small light circling the head: dots close to one, and facing it, light up
  float lit = 0.;
  for (int i = 0; i < 12; i++) {
    vec3 L = uOrb[i].xyz - p; float d2 = dot(L, L) + .004;
    lit += uOrb[i].w * (.25 + .75*max(0., dot(aNor, L*inversesqrt(d2)))) * .022/d2;
  }
  // light: the scan's own brightness, a soft rim where the surface turns away, and fading towards the bottom
  float rim = pow(1.-abs(n.z), 2.), facing = smoothstep(-.5, .2, n.z), key = max(0., dot(n, normalize(vec3(-.45,.55,.7))));
  float fade = smoothstep(-.5, -.5+uFade, aPos.y);
  vA = mix(uOpacity.x, uOpacity.y, aBright) * (.6+.4*aRnd.w) * (.5+.75*key) * (.85+.4*rim) * mix(.06, 1., facing) * fade * (.25+.75*k) * (1.+uGlow*shine) * (1.+lit) * uLift;
  gl_Position = vec4(at.x/uRes.x*2.-1., 1.-at.y/uRes.y*2., 0., 1.);
  gl_PointSize = uDpr*mix(uSize.x, uSize.y, aRnd.y*.6+aBright*.4)*persp*(1.+.35*shine+.3*min(lit, 1.));
}`;
const FRAG = `
precision mediump float; varying float vA; uniform vec3 uInk;
void main(){ float r = length(gl_PointCoord-.5); float a = clamp(vA,0.,1.)*smoothstep(.5,.15,r); gl_FragColor = vec4(uInk*a,a); }`;

/* the lights themselves: a bright core in a soft halo */
const ORB_VERT = `attribute vec2 aAt; attribute float aSize, aAlpha; uniform vec2 uRes; varying float vA;
void main(){ vA = aAlpha; gl_Position = vec4(aAt.x/uRes.x*2.-1., 1.-aAt.y/uRes.y*2., 0., 1.); gl_PointSize = aSize; }`;
const ORB_FRAG = `precision mediump float; varying float vA; uniform vec3 uInk;
void main(){ float r = length(gl_PointCoord-.5)*2.; float a = vA*(exp(-r*r*6.)*.45 + exp(-r*r*40.)*.9); gl_FragColor = vec4(uInk*a, a); }`;
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; };

async function load(src, count) {
  const buf = await (await fetch(src)).arrayBuffer(), v = new DataView(buf);
  if (String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3)) !== "DUST") throw new Error("not a portrait file");
  const n = Math.min(count, v.getUint32(4, true)), out = new Float32Array(n * 11), j = CONFIG.jitter;
  for (let i = 0; i < n; i++) {
    const o = 8 + i * 10, r = () => (Math.random() - 0.5) * 2 * j;
    out.set([v.getInt16(o, true) / 32767 + r(), v.getInt16(o + 2, true) / 32767 + r(), v.getInt16(o + 4, true) / 32767 + r(),
      v.getInt8(o + 6) / 127, v.getInt8(o + 7) / 127, v.getInt8(o + 8) / 127,
      Math.random(), Math.random(), Math.random(), Math.random(), v.getUint8(o + 9) / 255], i * 11);
  }
  // where the head is: the middle of the top part, and how wide it is
  let hx = 0, hy = 0, hz = 0, k = 0, hr = 0;
  for (let i = 0; i < n; i++) if (out[i * 11 + 1] > 0.18) { hx += out[i * 11]; hy += out[i * 11 + 1]; hz += out[i * 11 + 2]; k++; }
  hx /= k; hy /= k; hz /= k;
  for (let i = 0; i < n; i++) if (out[i * 11 + 1] > 0.18) hr = Math.max(hr, Math.abs(out[i * 11] - hx));
  return { data: out, count: n, head: [hx, hy, hz], hr };
}

export function createPortrait(canvas, hero, src = "assets/portrait.bin") {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  const done = () => hero.classList.add("is-ready");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) hero.classList.add("is-intro");   // the words wait for the dust
  if (!gl) { done(); return null; }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches, phone = matchMedia("(pointer: coarse)").matches;
  const shader = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error("Portrait:", gl.getProgramInfoLog(prog)); done(); return null; }
  gl.useProgram(prog);
  const U = Object.fromEntries(["uRes", "uMouse", "uBox", "uTime", "uIntro", "uPush", "uDpr", "uNoise", "uRadius", "uGlow", "uMotion", "uTurn", "uSize", "uOpacity", "uFade", "uInk", "uLift"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  U.uOrb = gl.getUniformLocation(prog, "uOrb[0]");
  gl.enable(gl.BLEND);
  const orbProg = gl.createProgram();
  gl.attachShader(orbProg, shader(gl.VERTEX_SHADER, ORB_VERT));
  gl.attachShader(orbProg, shader(gl.FRAGMENT_SHADER, ORB_FRAG));
  gl.linkProgram(orbProg);
  const OU = { uRes: gl.getUniformLocation(orbProg, "uRes"), uInk: gl.getUniformLocation(orbProg, "uInk") };
  const OA = { aAt: gl.getAttribLocation(orbProg, "aAt"), aSize: gl.getAttribLocation(orbProg, "aSize"), aAlpha: gl.getAttribLocation(orbProg, "aAlpha") };
  const orbBuf = gl.createBuffer(), dustBuf = gl.createBuffer(), orbData = new Float32Array(CONFIG.orbs * 4), orbU = new Float32Array(12 * 4);
  const orbs = new Map();   // id -> a light on its own orbit
  let head = [0, 0.2, 0], hr = 0.18, ink3 = [1, 1, 1];

  let count = 0, W = 1, H = 1, dpr = 1, box = [0, 0, 1], dark = true;
  let intro = reduced ? 1 : 0, time = 0, push = 0, yaw = 0, pitch = 0;
  let mouse = { x: -9999, y: -9999, on: false }, soft = { x: -9999, y: -9999 }, visible = true, raf = 0, last = 0;

  function resize() {
    W = hero.clientWidth; H = hero.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // the bust is one unit high: the top of the hair just under the top, the shoulders cut off by the bottom edge
    const narrow = W < 700, scale = Math.min(H * (narrow ? 0.78 : 0.96), W * (narrow ? 1.35 : 1.1));
    box = [W / 2, H * 1.03 - 0.5 * scale, scale];
    wake();
  }
  function ink() {
    const c = getComputedStyle(hero).color.match(/[\d.]+/g) || [255, 255, 255];
    ink3 = [c[0] / 255, c[1] / 255, c[2] / 255];
    gl.useProgram(orbProg); gl.uniform3f(OU.uInk, ...ink3); gl.useProgram(prog);
    gl.uniform3f(U.uInk, ...ink3);
    dark = (+c[0] + +c[1] + +c[2]) / 3 > 128;
    if (dark) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // light dust adds up, dark dust covers
  }
  function wake() { if (!raf && visible && !document.hidden && count) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, now - last) / 1000), e = (k) => 1 - Math.exp(-k * dt);
    last = now;
    if (!reduced) {
      time += dt;
      if (intro < 1) { intro = Math.min(1, intro + dt / CONFIG.intro); if (intro > 0.7) done(); }
      push += ((mouse.on ? 1 : 0) - push) * e(mouse.on ? 4 : 2);   // the lamp fades in and out
      soft.x += (mouse.x - soft.x) * e(10); soft.y += (mouse.y - soft.y) * e(10);
      const lx = mouse.on ? (mouse.x / W - 0.5) * 2 : 0, ly = mouse.on ? (mouse.y / H - 0.5) * 2 : 0, deg = Math.PI / 180;
      yaw += (lx * CONFIG.turn[0] * deg - yaw) * e(3); pitch += (ly * CONFIG.turn[1] * deg - pitch) * e(3);
    }
    // the lights: they fly in on a wide spiral, circle the head, and fade away when someone leaves
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    const view = (v) => { const y1 = cx * v[1] - sx * v[2], z1 = sx * v[1] + cx * v[2]; return [cy * v[0] + sy * z1, y1, -sy * v[0] + cy * z1]; };
    const ch = view(head);
    orbU.fill(0); let k = 0;
    for (const [id, o] of orbs) {
      o.life += ((o.gone ? 0 : 1) - o.life) * e(o.gone ? 2.2 : 1.4);
      if (o.gone && o.life < 0.01) { orbs.delete(id); continue; }
      if (k >= CONFIG.orbs) continue;
      const a = o.phase + time * o.speed, far = 1 + 2.2 * (1 - o.life) ** 2, r = hr * o.reach * far;
      const c = Math.cos(a + (1 - o.life) * 3), s = Math.sin(a + (1 - o.life) * 3);
      const pos = [head[0] + r * (c * o.u[0] + s * o.v[0]), head[1] + r * (c * o.u[1] + s * o.v[1]) + 0.012 * Math.sin(time * 1.7 + o.phase), head[2] + r * (c * o.u[2] + s * o.v[2])];
      orbU.set([pos[0], pos[1], pos[2], o.life * CONFIG.orbLight * (o.me ? 1.25 : 1)], k * 4);
      const q = view(pos), persp = 3.2 / (3.2 - q[2]), px = box[0] + q[0] * box[2] * persp, py = box[1] - q[1] * box[2] * persp;
      const behind = q[2] < ch[2] && Math.hypot(px - (box[0] + ch[0] * box[2]), py - (box[1] - ch[1] * box[2])) < hr * box[2] * 1.05;
      orbData.set([px, py, dpr * (o.me ? 74 : 60) * persp * (0.4 + 0.6 * o.life), o.life * (behind ? 0.12 : 0.95)], k * 4);
      k++;
    }
    gl.uniform4fv(U.uOrb, orbU);
    gl.uniform1f(U.uLift, 1 + 0.08 * Math.min(8, Math.max(0, orbs.size - 1)));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uMouse, soft.x, soft.y); gl.uniform4f(U.uBox, box[0], box[1], box[2], 0);
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uIntro, intro); gl.uniform1f(U.uPush, push); gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uNoise, CONFIG.noise); gl.uniform1f(U.uRadius, CONFIG.radius); gl.uniform1f(U.uGlow, CONFIG.glow); gl.uniform1f(U.uMotion, reduced ? 0 : 1);
    gl.uniform2f(U.uTurn, yaw, pitch); gl.uniform2f(U.uSize, CONFIG.size[0], CONFIG.size[1]); gl.uniform2f(U.uOpacity, CONFIG.opacity[0] * (dark ? 1 : 1.25), CONFIG.opacity[1]); gl.uniform1f(U.uFade, CONFIG.fade);
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf); dustAttribs(true);
    gl.drawArrays(gl.POINTS, 0, count);
    if (k) {
      dustAttribs(false);
      gl.useProgram(orbProg); gl.uniform2f(OU.uRes, W, H);
      gl.bindBuffer(gl.ARRAY_BUFFER, orbBuf); gl.bufferData(gl.ARRAY_BUFFER, orbData.subarray(0, k * 4), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(OA.aAt); gl.vertexAttribPointer(OA.aAt, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(OA.aSize); gl.vertexAttribPointer(OA.aSize, 1, gl.FLOAT, false, 16, 8);
      gl.enableVertexAttribArray(OA.aAlpha); gl.vertexAttribPointer(OA.aAlpha, 1, gl.FLOAT, false, 16, 12);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, k);
      for (const l of Object.values(OA)) gl.disableVertexAttribArray(l);
      gl.useProgram(prog);
    }
    if (!reduced && visible && !document.hidden && (count || orbs.size)) raf = requestAnimationFrame(tick);
  }
  const at = (e) => {
    const r = hero.getBoundingClientRect(), nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (!mouse.on) { soft.x = nx; soft.y = ny; }
    mouse = { x: nx, y: ny, on: true };
    wake();
  };
  const off = () => { mouse.on = false; };
  hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" || mouse.on) at(e); }, { passive: true });
  hero.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") at(e); }, { passive: true });
  for (const n of ["pointerup", "pointercancel"]) addEventListener(n, (e) => { if (e.pointerType !== "mouse") off(); });
  hero.addEventListener("pointerleave", off);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; wake(); }).observe(hero);
  new MutationObserver(() => requestAnimationFrame(() => { ink(); wake(); })).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", wake);
  resize();
  ink();
  if (reduced) done();

  const DUST = [["aPos", 3, 0], ["aNor", 3, 12], ["aRnd", 4, 24], ["aBright", 1, 40]].map(([name, size, off]) => [gl.getAttribLocation(prog, name), size, off]);
  function dustAttribs(on) { for (const [l, size, off] of DUST) { if (on) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 44, off); } else gl.disableVertexAttribArray(l); } }
  load(src, phone ? CONFIG.countPhone : CONFIG.count).then((d) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    gl.bufferData(gl.ARRAY_BUFFER, d.data, gl.STATIC_DRAW);
    head = d.head; hr = d.hr;
    count = d.count; last = performance.now(); wake();
  }).catch((err) => { console.error("Portrait:", err); done(); });
  return {
    config: CONFIG,
    // the people on the page right now; each gets a light with its own orbit, the same one every time it is drawn
    visitors(ids, meId) {
      const now = new Set(ids);
      for (const [id, o] of orbs) if (!now.has(id)) o.gone = true;
      for (const id of ids) {
        const o = orbs.get(id);
        if (o) { o.gone = false; continue; }
        const r = hash(id), tilt = (r() - 0.5) * 1.3, spin = r() * Math.PI;
        const axis = [Math.sin(tilt) * Math.cos(spin), Math.cos(tilt), Math.sin(tilt) * Math.sin(spin)];
        const u0 = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
        const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
        const u = nm(cr(axis, u0)), v = cr(axis, u);
        orbs.set(id, { me: id === meId, life: reduced ? 1 : 0, gone: false, phase: r() * 6.283, speed: (0.25 + r() * 0.3) * (r() < 0.5 ? -1 : 1), reach: 0.98 + r() * 0.3, u, v });
      }
      wake();
    },
  };
}
