/* LAB — общая база: регистр, шум, базовые классы 2D и WebGL */
(function () {
  'use strict';

  var LAB = (window.LAB = window.LAB || {});

  LAB.TAU = Math.PI * 2;

  LAB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  LAB.lerp = function (a, b, t) { return a + (b - a) * t; };
  LAB.rand = function (a, b) { return a + Math.random() * (b - a); };

  /* детерминированный value-noise (без библиотек) */
  function hash2(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function noise2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi);
    var b = hash2(xi + 1, yi);
    var c = hash2(xi, yi + 1);
    var d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, oct) {
    var v = 0, amp = 0.5, f = 1, i;
    oct = oct || 4;
    for (i = 0; i < oct; i++) {
      v += amp * noise2(x * f, y * f);
      f *= 2;
      amp *= 0.5;
    }
    return v;
  }

  LAB.noise2 = noise2;
  LAB.fbm = fbm;

  /* --- базовый класс 2D-эксперимента --- */

  var Base2D = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.pointer = { x: 0, y: 0, inside: false, down: false };
    this.warmup = 0;
    this.onMove = this.onMove.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onResize = this.onResize.bind(this);
    this.frame = this.frame.bind(this);

    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('resize', this.onResize);
  };

  Base2D.prototype.onMove = function (e) {
    var r = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - r.left;
    this.pointer.y = e.clientY - r.top;
    this.pointer.inside = true;
    if (this.onPointer) this.onPointer();
  };
  Base2D.prototype.onDown = function (e) {
    this.pointer.down = true;
    var r = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - r.left;
    this.pointer.y = e.clientY - r.top;
    if (this.onPress) this.onPress();
  };
  Base2D.prototype.onUp = function () { this.pointer.down = false; };
  Base2D.prototype.onLeave = function () { this.pointer.inside = false; };

  Base2D.prototype.onResize = function () {
    if (!this.running) return;
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    if (w === this.w && h === this.h) return;
    this.resize();
  };

  /* размер холста под CSS-размер с учётом dpr */
  Base2D.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.onResized) this.onResized(w, h);
  };

  Base2D.prototype.start = function () {
    if (this.running) return;
    this.resize();
    this.running = true;
    /* тёплый старт: сцена сразу видна развитой, а не пустой */
    if (this.warmup > 0) {
      for (var i = 0; i < this.warmup; i++) {
        this.time += 1 / 60;
        this.step(1 / 60);
      }
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  };

  Base2D.prototype.frame = function (now) {
    if (!this.running) return;
    var dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;
    if (this.step) this.step(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  Base2D.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Base2D.prototype.destroy = function () {
    this.stop();
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('resize', this.onResize);
  };

  LAB.Base2D = Base2D;

  /* --- базовый класс WebGL-эксперимента --- */

  var BaseGL = function (canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false
    });
    if (!this.gl) throw new Error('WebGL недоступен в этом браузере');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.pointer = { x: 0.5, y: 0.5, inside: false, down: false };
    this.uniforms = {};
    this.clearColor = opts.clearColor || [0.02, 0.024, 0.047, 1];

    this.onMove = this.onMove.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);
    this.frame = this.frame.bind(this);

    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);

    var gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], 1);
  };

  BaseGL.prototype.onMove = function (e) {
    var r = this.canvas.getBoundingClientRect();
    this.pointer.x = (e.clientX - r.left) / r.width;
    this.pointer.y = (e.clientY - r.top) / r.height;
    this.pointer.inside = true;
    if (this.onPointer) this.onPointer();
  };
  BaseGL.prototype.onDown = function (e) {
    this.pointer.down = true;
    if (this.onPress) this.onPress();
  };
  BaseGL.prototype.onUp = function () { this.pointer.down = false; };
  BaseGL.prototype.onLeave = function () { this.pointer.inside = false; };
  BaseGL.prototype.onWheel = function (e) {
    if (this.onScroll) {
      e.preventDefault();
      this.onScroll(e.deltaY);
    }
  };
  BaseGL.prototype.onResize = function () {
    if (!this.running) return;
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    if (w === this.w && h === this.h) return;
    this.resize();
  };

  BaseGL.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (this.onResized) this.onResized(w, h);
  };

  BaseGL.prototype.program = function (vsSrc, fsSrc) {
    var gl = this.gl;

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('Ошибка шейдера: ' + log);
      }
      return sh;
    }

    var vs = compile(gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Ошибка линковки: ' + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  };

  /* полный экран + квадрат под шейдерные эффекты */
  BaseGL.prototype.setupQuad = function (fsSrc) {
    var gl = this.gl;
    var prog = this.program(
      'attribute vec2 aPos;' +
      'varying vec2 vUv;' +
      'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }',
      fsSrc
    );
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    this.prog = prog;
    var names = ['uRes', 'uTime', 'uMouse', 'uDown', 'uExtra'];
    for (var i = 0; i < names.length; i++) {
      this.uniforms[names[i]] = gl.getUniformLocation(prog, names[i]);
    }
    return prog;
  };

  /* матрицы 4x4 для 3D-сцены */
  var M4 = {
    ident: function () {
      return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    },
    perspective: function (fov, aspect, near, far) {
      var f = 1 / Math.tan(fov / 2);
      var nf = 1 / (near - far);
      var m = new Float32Array(16);
      m[0] = f / aspect;
      m[5] = f;
      m[10] = (far + near) * nf;
      m[11] = -1;
      m[14] = 2 * far * near * nf;
      return m;
    },
    multiply: function (a, b) {
      var out = new Float32Array(16);
      for (var c = 0; c < 4; c++) {
        for (var r = 0; r < 4; r++) {
          var s = 0;
          for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          out[c * 4 + r] = s;
        }
      }
      return out;
    },
    translate: function (m, x, y, z) {
      var t = M4.ident();
      t[12] = x; t[13] = y; t[14] = z;
      return M4.multiply(m, t);
    },
    rotateX: function (m, a) {
      var c = Math.cos(a), s = Math.sin(a);
      var r = M4.ident();
      r[5] = c; r[6] = s; r[9] = -s; r[10] = c;
      return M4.multiply(m, r);
    },
    rotateY: function (m, a) {
      var c = Math.cos(a), s = Math.sin(a);
      var r = M4.ident();
      r[0] = c; r[2] = -s; r[8] = s; r[10] = c;
      return M4.multiply(m, r);
    }
  };

  LAB.M4 = M4;

  BaseGL.prototype.start = function () {
    if (this.running) return;
    this.resize();
    this.running = true;
    if (this.render) this.render(1 / 60);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  };

  BaseGL.prototype.frame = function (now) {
    if (!this.running) return;
    var dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;
    var gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (this.render) this.render(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  BaseGL.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  BaseGL.prototype.destroy = function () {
    this.stop();
    var c = this.canvas;
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    /* ВАЖНО: не вызываем WEBGL_lose_context.loseContext() — после него
       тот же canvas навсегда теряет возможность получить живой контекст,
       и превью при возврате карточки в зону видимости остаётся пустым */
  };

  LAB.BaseGL = BaseGL;

  /* --- реестр экспериментов --- */

  LAB.registry = [];

  LAB.register = function (def) {
    LAB.registry.push(def);
  };
})();