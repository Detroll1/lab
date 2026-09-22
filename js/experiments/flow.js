/* Поток: частицы в curl-поле шума; мышь расталкивает, клик: взрыв-импульс */
(function () {
  'use strict';

  var LAB = window.LAB;

  function Flow(canvas) {
    LAB.Base2D.call(this, canvas);
    this.particles = [];
    this.scale = 0.0016;
    this.warmup = 300;
    this.onResized = this.onResized.bind(this);
  }

  Flow.prototype = Object.create(LAB.Base2D.prototype);
  Flow.prototype.constructor = Flow;

  Flow.prototype.onResized = function (w, h) {
    var target = LAB.clamp(Math.round((w * h) / 450), 350, 3000);
    var p = this.particles;
    while (p.length < target) {
      p.push(this.spawn());
    }
    p.length = target;
  };

  Flow.prototype.spawn = function () {
    return {
      x: LAB.rand(0, this.w),
      y: LAB.rand(0, this.h),
      ix: 0,
      iy: 0,
      hue: LAB.rand(160, 330),
      speed: LAB.rand(0.75, 1.65),
      life: LAB.rand(5, 11)
    };
  };

  Flow.prototype.step = function (dt) {
    var ctx = this.ctx;
    var w = this.w, h = this.h;
    var p = this.particles;
    var i, pt, dx, dy, d2, f;

    /* фейд через альфу: цвет не деградирует от 8-битного округления */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    var t = this.time;
    var s = this.scale;
    var px = this.pointer.x, py = this.pointer.y;
    var pin = this.pointer.inside, pdown = this.pointer.down;

    for (i = 0; i < p.length; i++) {
      pt = p[i];
      pt.life -= dt;

      var n = LAB.fbm(pt.x * s, pt.y * s + t * 0.02, 3);
      var ang = n * Math.PI * 1.6 + t * 0.05;
      var sp = 6 * pt.speed * dt * 60;

      var ox = pt.x, oy = pt.y;
      pt.x += Math.cos(ang) * sp + pt.ix;
      pt.y += Math.sin(ang) * sp + pt.iy;

      pt.ix *= 0.9;
      pt.iy *= 0.92;

      if (pin) {
        dx = pt.x - px;
        dy = pt.y - py;
        d2 = dx * dx + dy * dy;
        if (d2 < 150 * 150 && d2 > 0.01) {
          f = (pdown ? 2.4 : 1.0) * (1 - d2 / 22500);
          pt.ix += (dx / Math.sqrt(d2)) * f;
          pt.iy += (dy / Math.sqrt(d2)) * f;
        }
      }

      var hue = (pt.hue + ang * 38) % 360;
      ctx.strokeStyle = 'hsla(' + hue + ', 88%, 62%, 0.09)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.strokeStyle = 'hsla(' + hue + ', 90%, 66%, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();

      if (pt.life <= 0 || pt.x < -20 || pt.x > w + 20 || pt.y < -20 || pt.y > h + 20) {
        p[i] = this.spawn();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  Flow.prototype.onPress = function () {
    var px = this.pointer.x, py = this.pointer.y;
    var p = this.particles;
    for (var i = 0; i < p.length; i++) {
      var dx = p[i].x - px, dy = p[i].y - py;
      var d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      if (d < 300) {
        var f = (300 - d) * 0.02;
        p[i].ix += (dx / d) * f;
        p[i].iy += (dy / d) * f;
        p[i].hue = (p[i].hue + 50) % 360;
      }
    }
  };

  LAB.register({
    id: 'flow',
    title: 'Поток',
    tag: 'canvas · частицы',
    desc: 'Сотни частиц плывут вдоль curl-поля многослойного шума, окрашиваясь по направлению движения.',
    hint: 'мышь расталкивает · клик: взрыв-импульс',
    cls: Flow
  });
})();