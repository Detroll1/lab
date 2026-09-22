/* Тор 3D: WebGL-сцена: освещение, перетаскивание, зум колесом */
(function () {
  'use strict';

  var LAB = window.LAB;
  var M4 = LAB.M4;

  var VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNormal;',
    'uniform mat4 uModel;',
    'uniform mat4 uView;',
    'uniform mat4 uProj;',
    'varying vec3 vNormal;',
    'varying vec3 vWorld;',
    'varying vec3 vPos;',
    'void main(){',
    '  vec4 wp = uModel * vec4(aPos, 1.0);',
    '  vWorld = wp.xyz;',
    '  vNormal = mat3(uModel) * aNormal;',
    '  vPos = aPos;',
    '  gl_Position = uProj * uView * wp;',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'varying vec3 vNormal;',
    'varying vec3 vWorld;',
    'varying vec3 vPos;',
    'uniform vec3 uCam;',
    'void main(){',
    '  vec3 N = normalize(vNormal);',
    '  vec3 V = normalize(uCam - vWorld);',
    '  vec3 L = normalize(vec3(0.55, 0.85, 0.65));',
    '  vec3 L2 = normalize(vec3(-0.7, -0.3, 0.4));',
    '  float diff = max(dot(N, L), 0.0);',
    '  float diff2 = max(dot(N, L2), 0.0) * 0.25;',
    '  vec3 H = normalize(L + V);',
    '  float spec = pow(max(dot(N, H), 0.0), 56.0) * 0.9;',
    '  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);',
    '  vec3 base = mix(vec3(0.24, 0.62, 0.86), vec3(0.56, 0.38, 0.92), vPos.y * 0.5 + 0.5);',
    '  vec3 col = base * (0.14 + diff * 0.95 + diff2);',
    '  col += vec3(0.75, 0.85, 1.0) * spec;',
    '  col += vec3(0.45, 0.75, 1.0) * rim * 0.55;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function Torus(canvas) {
    LAB.BaseGL.call(this, canvas, { clearColor: [0.019, 0.023, 0.047, 1] });

    var gl = this.gl;
    this.prog = this.program(VS, FS);
    gl.useProgram(this.prog);
    this.u = {
      model: gl.getUniformLocation(this.prog, 'uModel'),
      view: gl.getUniformLocation(this.prog, 'uView'),
      proj: gl.getUniformLocation(this.prog, 'uProj'),
      cam: gl.getUniformLocation(this.prog, 'uCam')
    };

    this.buildMesh();

    this.rotX = -0.35;
    this.rotY = 0.6;
    this.spinX = 0;
    this.spinY = 0;
    this.dist = 3.4;
    this.dragging = false;
    this.lastPX = 0;
    this.lastPY = 0;

    this.onDrag = this.onDrag.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.onDown2 = this.onDown2.bind(this);
    canvas.addEventListener('pointerdown', this.onDown2);
    canvas.addEventListener('pointermove', this.onDrag);
    window.addEventListener('pointerup', this.onEnd);
  }

  Torus.prototype = Object.create(LAB.BaseGL.prototype);
  Torus.prototype.constructor = Torus;

  Torus.prototype.buildMesh = function () {
    var gl = this.gl;
    var segU = 96, segV = 48;
    var R = 1.0, r = 0.42;
    var pos = [], nrm = [], idx = [];
    var i, j;

    for (j = 0; j <= segV; j++) {
      var phi = (j / segV) * LAB.TAU;
      for (i = 0; i <= segU; i++) {
        var theta = (i / segU) * LAB.TAU;
        var cx = Math.cos(theta), sx = Math.sin(theta);
        var cp = Math.cos(phi), sp = Math.sin(phi);
        pos.push((R + r * cp) * cx, r * sp, (R + r * cp) * sx);
        nrm.push(cp * cx, sp, cp * sx);
      }
    }
    for (j = 0; j < segV; j++) {
      for (i = 0; i < segU; i++) {
        var a = j * (segU + 1) + i;
        var b = a + segU + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    this.count = idx.length;
    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    this.nrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nrm), gl.STATIC_DRAW);
    this.idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    this.aPos = gl.getAttribLocation(this.prog, 'aPos');
    this.aNormal = gl.getAttribLocation(this.prog, 'aNormal');
  };

  Torus.prototype.render = function (dt) {
    var gl = this.gl;

    if (this.dragging) {
      this.spinX = 0;
      this.spinY = 0;
    } else {
      /* инерция броска + медленное автовращение на покое */
      this.rotY += this.spinY * dt;
      this.rotX += this.spinX * dt;
      var decay = Math.pow(0.12, dt);
      this.spinX *= decay;
      this.spinY *= decay;
      if (Math.abs(this.spinY) < 0.25) this.rotY += dt * 0.35;
      if (Math.abs(this.spinX) < 0.25) {
        this.rotX += Math.sin(this.time * 0.6) * dt * 0.05;
      }
    }

    var model = M4.rotateY(M4.rotateX(M4.ident(), this.rotX), this.rotY);
    var eye = [0, 0.4, this.dist];
    var view = M4.translate(M4.ident(), 0, -0.05, -this.dist);
    var proj = M4.perspective(0.9, this.w / Math.max(this.h, 1), 0.1, 40);

    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.model, false, model);
    gl.uniformMatrix4fv(this.u.view, false, view);
    gl.uniformMatrix4fv(this.u.proj, false, proj);
    gl.uniform3f(this.u.cam, 0, 0.4, this.dist);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nrmBuf);
    gl.enableVertexAttribArray(this.aNormal);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  };

  Torus.prototype.onDown2 = function () {
    this.dragging = true;
    this.lastPX = this.pointer.x * this.w;
    this.lastPY = this.pointer.y * this.h;
  };

  Torus.prototype.onDrag = function (e) {
    if (!this.pointer.down) return;
    var r = this.canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var dx = mx - this.lastPX, dy = my - this.lastPY;
    this.lastPX = mx;
    this.lastPY = my;
    this.rotY += dx * 0.006;
    this.rotX += dy * 0.006;
    this.spinY = dx * 0.006 * 60;
    this.spinX = dy * 0.006 * 60;
  };

  Torus.prototype.onEnd = function () {
    this.dragging = false;
  };

  Torus.prototype.onScroll = function (deltaY) {
    this.dist = LAB.clamp(this.dist + deltaY * 0.0022, 1.9, 7.5);
  };

  Torus.prototype.destroy = function () {
    window.removeEventListener('pointerup', this.onEnd);
    LAB.BaseGL.prototype.destroy.call(this);
  };

  LAB.register({
    id: 'torus',
    title: 'Тор 3D',
    tag: 'webgl · сцена',
    desc: 'Собственный WebGL-конвейер: тор из 9 тысяч треугольников, направленный свет, блики Блинна-Фонга и rim-подсветка.',
    hint: 'тяните, чтобы вращать · колесо: зум',
    cls: Torus
  });
})();