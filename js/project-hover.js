(() => {
  const cards = document.querySelectorAll('.selected-work .library-experiment');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (!cards.length) return;
  let canvas, gl, program, texture, uniforms;
  let current = null, frame = 0, strength = 0, target = 0, last = 0;
  let mouse = [0.5, 0.5], smoothMouse = [0.5, 0.5];
  let imageSize = [1, 1], request = 0, failed = false;
  function init() {
    if (gl) return true;
    if (failed) return false;
    canvas = document.createElement('canvas');
    canvas.className = 'project-hover-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
    if (!gl) { failed = true; return false; }
    function shader(type, source) {
      const value = gl.createShader(type);
      gl.shaderSource(value, source);
      gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
      return value;
    }
    try {
      const vertex = shader(gl.VERTEX_SHADER, `
        attribute vec2 position;
        varying vec2 uv;
        void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
      `);
      const fragment = shader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D photo;
        uniform vec2 cover;
        uniform vec2 mouse;
        uniform float strength;
        uniform float time;
        void main() {
          vec2 delta = uv - mouse;
          float local = exp(-dot(delta, delta) * 8.);
          float wave = sin(uv.y * 28. + time * 1.5) * .003;
          vec2 bend = delta * local * .045 + vec2(wave, wave * .35);
          vec2 p = (uv - .5) * (1. - strength * .035) + .5;
          p += bend * strength;
          vec2 split = (vec2(.006, .002) + delta * local * .018) * strength;
          vec2 sampleUV = (p - .5) * cover + .5;
          vec3 color;
          color.r = texture2D(photo, sampleUV + split * cover).r;
          color.g = texture2D(photo, sampleUV).g;
          color.b = texture2D(photo, sampleUV - split * cover).b;
          gl_FragColor = vec4(color, 1.);
        }
      `);
      program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader unavailable');
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      uniforms = Object.fromEntries(['cover','mouse','strength','time'].map(name => [name, gl.getUniformLocation(program, name)]));
      canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stop(); failed = true; gl = null; });
      return true;
    } catch { failed = true; gl = null; return false; }
  }
  function stop() {
    request++;
    cancelAnimationFrame(frame); frame = 0;
    current?.classList.remove('has-project-shader');
    current = null;
    canvas?.remove();
    strength = target = 0;
  }
  function render(now) {
    frame = 0;
    if (!current || document.hidden) { stop(); return; }
    const blend = 1 - Math.exp(-Math.min(now - last, 64) / 95);
    last = now;
    strength += (target - strength) * blend;
    smoothMouse = smoothMouse.map((value, i) => value + (mouse[i] - value) * blend);
    const width = current.clientWidth, height = current.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    const imageAspect = imageSize[0] / imageSize[1], aspect = width / height;
    gl.uniform2f(uniforms.cover, Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
    gl.uniform2fv(uniforms.mouse, smoothMouse);
    gl.uniform1f(uniforms.strength, strength);
    gl.uniform1f(uniforms.time, now / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!target && strength < .005) { stop(); return; }
    frame = requestAnimationFrame(render);
  }
  function move(event, card) {
    const rect = card.getBoundingClientRect();
    mouse = [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height];
  }
  cards.forEach(card => {
    card.addEventListener('pointerenter', async event => {
      if (!pointer.matches || motion.matches || event.pointerType === 'touch') return;
      stop();
      const id = request;
      const img = card.querySelector('.experiment-poster');
      try { await img.decode(); } catch { return; }
      if (id !== request || !card.matches(':hover') || motion.matches || !init()) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } catch { return; }
      imageSize = [img.naturalWidth, img.naturalHeight];
      current = card; target = 1;
      move(event, card); smoothMouse = [...mouse];
      card.append(canvas);
      card.classList.add('has-project-shader');
      last = performance.now();
      render(last);
    });
    card.addEventListener('pointermove', event => { if (current === card) move(event, card); });
    card.addEventListener('pointerleave', () => { request++; if (current === card) target = 0; });
  });
  motion.addEventListener('change', stop);
  pointer.addEventListener('change', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
