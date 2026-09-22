/* Аттрактор: странный аттрактор де Йонга, параметры перетекают по проверенным хаотическим пресетам */
(function () {
  'use strict';

  var LAB = window.LAB;

  /* наборы параметров де Йонга, вручную проверенные на хаотичность */
  var PRESETS = [
    [1.78, 1.19, 2.41, 2.16],
    [-1.29, -1.56, 1.88, 1.79],
    [0.89, 1.7, 2.17, -2.46],
    [-2.24, -2.48, 2.29, 1.97],
    [1.55, -2.47, 2.28, -1.22],
    [-2.11, 2.36, -2.13, -1.82],
    [1.94, 2.43, 1.47, 2.35],
    [-1.73, 1.61, 1.71, 2.13]
  ];

  function Attractor(canvas) {
    LAB.Base2D.call(this, canvas);
    this.a = PRESETS[0][0];
    this.b = PRESETS[0][1];
    this.c = PRESETS[0][2];
    this.d = PRESETS[0][3];
    this.x = 0.1;
    this.y = 0.1;
    this.warmup = 90;
  }

  Attractor.prototype = Object.create(LAB.Base2D.prototype);
  Attractor.prototype.constructor = Attractor;

  Attractor.prototype.onResized = function (w, h) {
    /* холст прозрачный, фон даёт страница */
  };

  Attractor.prototype.targets = function () {
    if (this.useCustom && this.time < this.customUntil) {
      return this.customTargets();
    }
    var n = PRESETS.length;
    var idx = Math.floor(this.time / 10) % n;
    if (idx < 0) idx += n;          /* время может уйти в минус: индекс не должен */
    if (!isFinite(idx)) idx = 0;
    return PRESETS[idx];
  };

  /* быстрая оценка хаотичности: доля уникальных ячеек орбиты */
  Attractor.chaosScore = function (a, b, c, d) {
    var x = 0.1, y = 0.1, i, seen = {}, cnt = 0;
    for (i = 0; i < 4000; i++) {
      var nx = Math.sin(a * y) - Math.cos(b * x);
      var ny = Math.sin(c * x) - Math.cos(d * y);
      x = nx; y = ny;
      if (i > 100) {
        var key = ((x + 2) * 20 | 0) + '_' + ((y + 2) * 20 | 0);
        if (!seen[key]) { seen[key] = 1; cnt++; }
      }
    }
    return cnt;
  };

  Attractor.prototype.step = function (dt) {
    var ctx = this.ctx;
    var w = this.w, h = this.h;
    var p = this.targets();

    if (this.pointer.inside) {
      /* мышь ведёт два параметра, остальные: пресет */
      var fx = LAB.clamp(this.pointer.x / this.w, 0, 1);
      var fy = LAB.clamp(this.pointer.y / this.h, 0, 1);
      this.ta = LAB.lerp(-2.5, -1.1, fx);
      this.tb = p[1];
      this.tc = LAB.lerp(1.2, 2.6, fy);
      this.td = p[3];
    } else {
      this.ta = p[0];
      this.tb = p[1];
      this.tc = p[2];
      this.td = p[3];
    }

    var k = 1 - Math.pow(0.15, dt);
    this.a = LAB.lerp(this.a, this.ta, k);
    this.b = LAB.lerp(this.b, this.tb, k);
    this.c = LAB.lerp(this.c, this.tc, k);
    this.d = LAB.lerp(this.d, this.td, k);

    /* мягкий фейд через альфу: структура живёт долго и непрерывно ткётся */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.016)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    var s = Math.min(w, h) / 4.4;
    var cx = w / 2, cy = h / 2;
    var n = Math.round(LAB.clamp((w * h) / 90, 1500, 24000));
    var hueBase = (this.time * 8) % 360;

    var x = this.x, y = this.y;
    var a = this.a, b = this.b, c = this.c, d = this.d;
    for (var i = 0; i < n; i++) {
      var nx = Math.sin(a * y) - Math.cos(b * x);
      var ny = Math.sin(c * x) - Math.cos(d * y);
      x = nx; y = ny;
      ctx.fillStyle = 'hsla(' + ((hueBase + (x + 2) * 42 + (y + 2) * 22) % 360) + ', 85%, 62%, 0.3)';
      ctx.fillRect(cx + x * s, cy + y * s, 1, 1);
    }
    this.x = x; this.y = y;

    ctx.globalCompositeOperation = 'source-over';
  };

  Attractor.prototype.onPress = function () {
    var tries = 0, p = [this.a, this.b, this.c, this.d];
    do {
      p = [
        (Math.random() < 0.5 ? -1 : 1) * LAB.rand(1.2, 2.5),
        (Math.random() < 0.5 ? -1 : 1) * LAB.rand(1.2, 2.5),
        (Math.random() < 0.5 ? -1 : 1) * LAB.rand(1.2, 2.5),
        (Math.random() < 0.5 ? -1 : 1) * LAB.rand(1.2, 2.5)
      ];
    } while (Attractor.chaosScore(p[0], p[1], p[2], p[3]) < 1500 && ++tries < 8);
    this.x = LAB.rand(-0.5, 0.5);
    this.y = LAB.rand(-0.5, 0.5);
    this.ta = p[0];
    this.tb = p[1];
    this.tc = p[2];
    this.td = p[3];
    this.useCustom = true;
    this.customUntil = this.time + 6;
  };

  Attractor.prototype.customTargets = function () {
    return [this.ta, this.tb, this.tc, this.td];
  };

  LAB.register({
    id: 'attractor',
    title: 'Аттрактор',
    tag: 'генеративное',
    desc: 'Итерации отображения Питера де Йонга: орбита хаотичного отображения ткёт мерцающую филаментную структуру.',
    hint: 'мышь задаёт форму · клик: новое зерно',
    cls: Attractor
  });
})();