/* Глитч: процедурная synthwave-сцена + GLSL-глитч: RGB-сдвиг, срезы, блоки, сканлайны */
(function () {
  'use strict';

  var LAB = window.LAB;

  var FS = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uDown;',
    'uniform float uExtra;',
    '',
    'float hash11(float p){',
    '  p = fract(p * 0.1031);',
    '  p *= p + 33.33;',
    '  p *= p + p;',
    '  return fract(p);',
    '}',
    '',
    'float hash21(vec2 p){',
    '  p = fract(p * vec2(127.1, 311.7));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise2(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),',
    '             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);',
    '}',
    '',
    '/* процедурная synthwave-сцена, uv в [0,1] */',
    'vec3 scene(vec2 uv){',
    '  float horizon = 0.34;',
    '  vec3 col = mix(vec3(0.05, 0.04, 0.12), vec3(0.42, 0.10, 0.35), pow(clamp(uv.y, 0.0, 1.0), 1.4));',
    '',
    '  /* звёзды */',
    '  float st = step(0.9982, hash21(floor(uv * vec2(220.0, 124.0) + 7.0)));',
    '  col += st * smoothstep(0.34, 0.6, uv.y) * vec3(0.85, 0.9, 1.0);',
    '',
    '  /* солнце с полосами */',
    '  vec2 sp = vec2(0.5, 0.46);',
    '  float sd = length((uv - sp) * vec2(1.0, 1.35));',
    '  float disc = smoothstep(0.24, 0.205, sd);',
    '  float bands = smoothstep(0.45, 0.75, fract(uv.y * 42.0));',
    '  float mask = 1.0 - bands * smoothstep(sp.y - 0.02, sp.y - 0.2, uv.y);',
    '  vec3 sunCol = mix(vec3(1.0, 0.9, 0.3), vec3(1.0, 0.25, 0.4), clamp((sp.y - uv.y) / 0.35 + 0.35, 0.0, 1.0));',
    '  col = mix(col, sunCol, disc * mask);',
    '  col += sunCol * smoothstep(0.55, 0.2, sd) * 0.35 * step(horizon, uv.y);',
    '',
    '  /* горы-силуэты у горизонта */',
    '  float ridge = horizon + 0.015 + 0.075 * noise2(vec2(uv.x * 5.0, 2.7)) + 0.03 * noise2(vec2(uv.x * 17.0, 8.4));',
    '  float mtn = smoothstep(ridge, ridge - 0.004, uv.y) * smoothstep(horizon - 0.003, horizon, uv.y);',
    '  col = mix(col, vec3(0.09, 0.05, 0.16), mtn);',
    '',
    '  /* сетка на полу, бежит на зрителя */',
    '  float d = horizon - uv.y;',
    '  if(uv.y < horizon){',
    '    float dd = max(d, 0.015);',
    '    float px = (uv.x - 0.5) / dd;',
    '    float lz = abs(fract(px * 1.4) - 0.5);',
    '    float ly = abs(fract(0.35 / dd + uTime * 0.45) - 0.5);',
    '    float line = max(smoothstep(0.46, 0.5, lz), smoothstep(0.42, 0.5, ly));',
    '    float fade = smoothstep(0.0, 0.1, d);',
    '    vec3 floorCol = mix(vec3(0.95, 0.25, 0.6), vec3(0.15, 0.45, 0.95), uv.x);',
    '    col = mix(vec3(0.02, 0.02, 0.06), floorCol, line * fade * (0.35 + 0.65 * smoothstep(0.0, 0.25, d)));',
    '    col += vec3(1.0, 0.45, 0.35) * smoothstep(0.3, 0.0, abs(uv.x - 0.5)) * fade * 0.3;',
    '  }',
    '  return col;',
    '}',
    '',
    'void main(){',
    '  float T = uTime;',
    '  float amount = clamp(uExtra + uDown * 0.85, 0.0, 1.0);',
    '',
    '  vec2 uv = gl_FragCoord.xy / uRes.xy;',
    '  uv = (uv - 0.5) * vec2(1.0, 1.12) + 0.5;',
    '',
    '  /* крупный кадр-джиттер */',
    '  float jitter = step(0.985 - amount * 0.35, hash11(floor(T * 14.0))) * 0.012;',
    '  uv.x += (hash11(floor(T * 14.0) + 1.0) - 0.5) * jitter;',
    '',
    '  /* горизонтальные срезы */',
    '  float row = floor(uv.y * 90.0);',
    '  float rs = hash11(row * 3.71 + floor(T * 9.0) * 13.7);',
    '  if(rs > 1.0 - amount * 0.5){',
    '    uv.x += (hash11(row + floor(T * 9.0)) - 0.5) * amount * 0.35;',
    '  }',
    '',
    '  /* блоки-смещения: кусок кадра дёргается вбок */',
    '  vec2 cellD = floor(uv * vec2(16.0, 10.0));',
    '  float bd = hash21(cellD + floor(T * 8.0) * 3.3);',
    '  if(bd > 1.0 - amount * 0.10){',
    '    uv.x += (hash21(cellD + 1.7) - 0.5) * 0.22;',
    '    uv.y += (hash21(cellD + 9.1) - 0.5) * 0.05;',
    '  }',
    '',
    '  /* RGB-сдвиг */',
    '  float shift = (0.002 + amount * 0.02) * (1.0 + 2.0 * sin(T * 2.0));',
    '  vec3 col;',
    '  col.r = scene(uv + vec2(shift, 0.0)).r;',
    '  col.g = scene(uv).g;',
    '  col.b = scene(uv - vec2(shift, 0.0)).b;',
    '',
    '  /* редкие инвертированные чанки */',
    '  vec2 cellI = floor(uv * vec2(10.0, 7.0) + 4.2);',
    '  float bi = hash21(cellI + floor(T * 6.0));',
    '  if(bi > 1.0 - amount * 0.06){',
    '    col = vec3(1.0) - col;',
    '    col *= 0.75;',
    '  }',
    '',
    '  /* цифровой мусор и сканлайны */',
    '  float grain = hash21(gl_FragCoord.xy + fract(T) * 100.0) - 0.5;',
    '  col += grain * (0.03 + amount * 0.10);',
    '  col *= 0.88 + 0.12 * sin(gl_FragCoord.y * 3.14159);',
    '',
    '  float vig = 1.0 - 0.25 * dot(uv - 0.5, uv - 0.5);',
    '  gl_FragColor = vec4(pow(max(col * vig, 0.0), vec3(0.95)), 1.0);',
    '}'
  ].join('\n');

  function Glitch(canvas) {
    LAB.BaseGL.call(this, canvas, { clearColor: [0, 0, 0, 1] });
    this.setupQuad(FS);
    this.burst = 0;
    this.base = 0.12;
  }

  Glitch.prototype = Object.create(LAB.BaseGL.prototype);
  Glitch.prototype.constructor = Glitch;

  Glitch.prototype.onPointer = function () {
    this.base = this.pointer.x;
  };

  Glitch.prototype.onPress = function () {
    this.burst = 1;
  };

  Glitch.prototype.render = function (dt) {
    var gl = this.gl;
    this.burst = Math.max(0, this.burst - dt * 1.4);
    var amount = LAB.clamp(this.base + this.burst * 0.9, 0, 1);
    gl.useProgram(this.prog);
    gl.uniform2f(this.uniforms.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.uTime, this.time);
    gl.uniform2f(this.uniforms.uMouse, this.pointer.x, 1 - this.pointer.y);
    gl.uniform1f(this.uniforms.uDown, this.pointer.down ? 1 : 0);
    gl.uniform1f(this.uniforms.uExtra, amount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  LAB.register({
    id: 'glitch',
    title: 'Глитч',
    tag: 'glsl · пост-эффект',
    desc: 'Синтвейв-сцена целиком нарисованная в шейдере, поверх: цифровой распад: RGB-сдвиг, срезы, блоки и зерно.',
    hint: 'мышь влево-вправо: сила глитча · клик: всплеск',
    cls: Glitch
  });
})();