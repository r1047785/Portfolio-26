/* A breathing sphere of dots, the door of the site. Everything moves in the vertex shader, no library needed. */
const VERT = `
attribute vec3 aDir; attribute vec3 aRnd;
uniform vec2 uRes, uCenter, uMouse; uniform float uR, uTime, uForm, uHover, uPush, uBurst, uDpr, uSpin; uniform vec2 uLean;
varying float vA;
void main(){
  vec3 p = aDir;
  float c = cos(uSpin), s = sin(uSpin); p.xz = mat2(c,-s,s,c)*p.xz;
  float cx = cos(.38+uLean.y), sx = sin(.38+uLean.y); p.yz = mat2(cx,-sx,sx,cx)*p.yz;
  float cz = cos(uLean.x), sz = sin(uLean.x); p.xz = mat2(cz,-sz,sz,cz)*p.xz;
  // breathing: the whole sphere, and slow folds over its skin
  float fold = sin(3.1*aDir.x+uTime*.9)*sin(2.7*aDir.y-uTime*.7)*sin(3.3*aDir.z+uTime*.6);
  float k = 1. + .035*sin(uTime*1.15) + (.10+.10*uHover)*fold;
  k += uHover*(.05+.20*aRnd.x*aRnd.x) + uBurst*(.16+.75*aRnd.y*aRnd.y);
  vec3 q = p*k*uR;
  float persp = 1./(1.-q.z/(uR*5.2));
  vec2 at = uCenter + q.xy*persp;
  // dots make room for the pointer
  vec2 d = at-uMouse; float l = max(length(d),.001), w = uR*.46;
  at += d/l*uPush*uR*.42*exp(-l*l/(2.*w*w))*(.6+.8*aRnd.z);
  // the first seconds: from everywhere to the sphere
  float f = clamp(uForm*1.7-aRnd.x*.7,0.,1.); f = f*f*(3.-2.*f);
  vec2 far = uCenter + (aRnd.yz-.5)*uRes*1.5 ;
  float turn = (1.-f)*2.2; vec2 v = mix(far,at,f)-uCenter; float ct=cos(turn), st=sin(turn);
  at = uCenter + mat2(ct,st,-st,ct)*v;
  float front = clamp(q.z/uR*.5+.5,0.,1.);
  vA = (.16+.84*front*front)*smoothstep(0.,.25,f)*(1.-.35*uBurst*aRnd.y);
  gl_Position = vec4(at.x/uRes.x*2.-1., 1.-at.y/uRes.y*2., 0., 1.);
  gl_PointSize = uDpr*(.95+1.75*front)*clamp(uR/150.,.75,1.25)+1.;
}`;
const FRAG = `
precision mediump float; varying float vA; uniform vec3 uInk;
void main(){ float r = length(gl_PointCoord-.5); float a = vA*smoothstep(.5,.30,r); gl_FragColor = vec4(uInk*a,a); }`;

export function createOrb(canvas, hero) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches, coarse = matchMedia("(pointer: coarse)").matches;
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error("Orb:", gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const count = coarse ? 1700 : 2800, data = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {                       // even spread over the sphere
    const y = 1 - (2 * (i + 0.5)) / count, r = Math.sqrt(1 - y * y), a = Math.PI * (1 + Math.sqrt(5)) * i;
    data.set([Math.cos(a) * r, y, Math.sin(a) * r, Math.random(), Math.random(), Math.random()], i * 6);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  for (const [name, off] of [["aDir", 0], ["aRnd", 12]]) { const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 24, off); }
  const U = Object.fromEntries(["uRes", "uCenter", "uMouse", "uR", "uTime", "uForm", "uHover", "uPush", "uBurst", "uDpr", "uSpin", "uLean", "uInk"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let W = 1, H = 1, dpr = 1, x = 0, y = 0, base = 100, R = 100, grow = 1, growTo = 1;
  let form = reduced ? 1 : 0, hover = 0, push = 0, burst = 0, spin = 0.4, time = 0, lean = { x: 0, y: 0 };
  let mouse = { x: -9999, y: -9999, on: false }, soft = { x: 0, y: 0 }, visible = true, raf = 0, last = 0, formed = null;
  const ready = new Promise((r) => { formed = r; });
  if (reduced) formed();

  function resize() {
    W = hero.clientWidth; H = hero.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const tall = W / H < 0.85;
    x = W / 2; y = H * (tall ? 0.43 : 0.43);
    base = Math.min(H * (tall ? 0.165 : 0.225), W * 0.32, 240);
    wake();
  }
  function ink() {
    const c = getComputedStyle(hero).color.match(/[\d.]+/g) || [255, 255, 255];
    gl.uniform3f(U.uInk, c[0] / 255, c[1] / 255, c[2] / 255);
  }
  function wake() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, now - last) / 1000), e = (k) => 1 - Math.exp(-k * dt);
    last = now;
    if (!reduced) {
      time += dt;
      if (form < 1) { form = Math.min(1, form + dt / 1.05); if (form > 0.66) formed(); }
      const near = mouse.on ? Math.max(0, 1 - Math.max(0, Math.hypot(mouse.x - x, mouse.y - y) - R * 0.75) / (R * 0.75)) : 0;
      hover += (near - hover) * e(near > hover ? 4.5 : 2.2);
      push += ((mouse.on ? 1 : 0) - push) * e(5);
      burst *= Math.exp(-2.6 * dt);
      soft.x += (mouse.x - soft.x) * e(14); soft.y += (mouse.y - soft.y) * e(14);
      const lx = mouse.on ? (mouse.x - x) / W : 0, ly = mouse.on ? (mouse.y - y) / H : 0;
      lean.x += (lx * 0.7 - lean.x) * e(3); lean.y += (-ly * 0.5 - lean.y) * e(3);
      spin += dt * (0.16 + 0.35 * hover + 0.9 * burst);
    }
    grow += (growTo - grow) * e(2);
    R = base * grow;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uCenter, x, y); gl.uniform2f(U.uMouse, soft.x, soft.y); gl.uniform2f(U.uLean, lean.x, lean.y);
    gl.uniform1f(U.uR, R); gl.uniform1f(U.uTime, time); gl.uniform1f(U.uForm, form); gl.uniform1f(U.uHover, hover);
    gl.uniform1f(U.uPush, push); gl.uniform1f(U.uBurst, burst); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uSpin, spin);
    gl.drawArrays(gl.POINTS, 0, count);
    if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function at(e) {
    const r = hero.getBoundingClientRect(), nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (!mouse.on) { soft.x = nx; soft.y = ny; }
    mouse = { x: nx, y: ny, on: true };
  }
  const off = () => { mouse.on = false; };
  hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" || mouse.on) at(e); }, { passive: true });
  hero.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") at(e); }, { passive: true });
  for (const n of ["pointerup", "pointercancel"]) addEventListener(n, (e) => { if (e.pointerType !== "mouse") off(); });
  hero.addEventListener("pointerleave", off);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(hero);
  new MutationObserver(() => requestAnimationFrame(() => { ink(); wake(); })).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", wake);
  resize();
  ink();
  return {
    ready,
    get x() { return x; }, get y() { return y; }, get r() { return R; },
    has(px, py) { return Math.hypot(px - x, py - y) < R * 1.1; },
    pulse(v = 1) { burst = Math.min(1.1, burst + v); wake(); },
    people(n) { growTo = 1 + 0.035 * Math.min(8, Math.max(0, n - 1)); wake(); },
  };
}
