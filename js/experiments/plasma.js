/* Плазма — GLSL fbm-плазма с палитрами: мышь искривляет поле, клик меняет палитру */
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
    'float hash(vec2 p){',
    '  p = fract(p * vec2(127.1, 311.7));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise(vec2 p){',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p){',
    '  float v = 0.0;',
    '  float amp = 0.5;',
    '  for(int i = 0; i < 5; i++){',
    '    v += amp * noise(p);',
    '    p = p * 2.03 + vec2(1.7, 9.2);',
    '    amp *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'vec3 palette(float t, float variant){',
    '  vec3 a = vec3(0.5);',
    '  vec3 b = vec3(0.5);',
    '  vec3 c = vec3(1.0);',
    '  vec3 d;',
    '  if(variant < 1.0)      d = vec3(0.00, 0.33, 0.67);',
    '  else if(variant < 2.0) d = vec3(0.50, 0.20, 0.25);',
    '  else if(variant < 3.0) d = vec3(0.20, 0.40, 0.45);',
    '  else if(variant < 4.0) d = vec3(0.60, 0.00, 0.30);',
    '  else                   d = vec3(0.30, 0.50, 0.60);',
    '  return a + b * cos(6.28318 * (c * t + d));',
    '}',
    '',
    'void main(){',
    '  float aspect = uRes.x / max(uRes.y, 1.0);',
    '  vec2 uv = (gl_FragCoord.xy / uRes.xy - 0.5) * vec2(aspect, 1.0) * 2.4;',
    '  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0) * 2.4;',
    '  uv += m * 0.55 * uDown;',
    '  uv += m * 0.12;',
    '',
    '  float t = uTime * 0.18;',
    '  vec2 p = uv * 1.15;',
    '  vec2 q = vec2(fbm(p + t * 0.35), fbm(p + vec2(5.2, 1.3) - t * 0.28));',
    '  vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 0.45),',
    '                fbm(p + 3.2 * q + vec2(8.3, 2.8) - t * 0.31));',
    '  float v = fbm(p + 3.0 * r);',
    '',
    '  float band = pow(clamp(0.5 + 0.5 * sin(12.0 * v + uTime * 0.8), 0.0, 1.0), 3.0);',
    '  vec3 col = palette(v + 0.15 * length(q), uExtra);',
    '  col += band * vec3(0.55, 0.75, 1.0) * 0.22;',
    '',
    '  vec2 vm = uv - m;',
    '  col += exp(-dot(vm, vm) * 6.0) * vec3(0.25, 0.45, 0.7) * 0.6;',
    '',
    '  float vig = 1.0 - 0.32 * dot(uv * 0.5, uv * 0.5);',
    '  col *= vig;',
    '',
    '  col = pow(max(col, 0.0), vec3(0.92));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function Plasma(canvas) {
    LAB.BaseGL.call(this, canvas, { clearColor: [0, 0, 0, 1] });
    this.setupQuad(FS);
    this.variant = 3;
    this.target = 3;
    this.burst = 0;
    this.variants = 5;
  }

  Plasma.prototype = Object.create(LAB.BaseGL.prototype);
  Plasma.prototype.constructor = Plasma;

  Plasma.prototype.onPress = function () {
    this.target = (this.target + 1) % this.variants;
    this.burst = 1;
  };

  Plasma.prototype.render = function (dt) {
    var gl = this.gl;
    this.variant += (this.target - this.variant) * (1 - Math.pow(0.02, dt));
    this.burst = Math.max(0, this.burst - dt * 1.6);
    gl.useProgram(this.prog);
    gl.uniform2f(this.uniforms.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.uTime, this.time);
    gl.uniform2f(this.uniforms.uMouse, this.pointer.x, 1 - this.pointer.y);
    gl.uniform1f(this.uniforms.uDown, this.pointer.down ? 1 : 0);
    gl.uniform1f(this.uniforms.uExtra, this.variant + this.burst * 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  LAB.register({
    id: 'plasma',
    title: 'Плазма',
    tag: 'glsl · шейдер',
    desc: 'Фрактальный шум в пять октав на GPU: вложенное искривление координат и косинусные палитры Ины Куинеке.',
    hint: 'зажмите мышь — линза · клик — следующая палитра',
    cls: Plasma
  });
})();