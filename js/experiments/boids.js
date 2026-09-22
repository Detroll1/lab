/* Стая: биороботы-боиды: сепарация, выравнивание, сцепление */
(function () {
  'use strict';

  var LAB = window.LAB;

  function Boids(canvas) {
    LAB.Base2D.call(this, canvas);
    this.boids = [];
    this.warmup = 80;
    this.onResized = this.onResized.bind(this);
  }

  Boids.prototype = Object.create(LAB.Base2D.prototype);
  Boids.prototype.constructor = Boids;

  Boids.prototype.onResized = function (w, h) {
    var target = LAB.clamp(Math.round((w * h) / 8500), 45, 150);
    var b = this.boids;
    while (b.length < target) {
      var ang = LAB.rand(0, LAB.TAU);
      b.push({
        x: LAB.rand(0, w),
        y: LAB.rand(0, h),
        vx: Math.cos(ang) * 1.6,
        vy: Math.sin(ang) * 1.6
      });
    }
    b.length = target;
  };

  Boids.prototype.step = function (dt) {
    var ctx = this.ctx;
    var w = this.w, h = this.h;
    var bs = this.boids;
    var i, j, bi, bj;

    var view = 62, view2 = view * view;
    var sep = 26, sep2 = sep * sep;
    var maxSpeed = 2.4, maxForce = 0.06;

    var px = this.pointer.x, py = this.pointer.y;
    var pin = this.pointer.inside, pdown = this.pointer.down;

    for (i = 0; i < bs.length; i++) {
      bi = bs[i];
      var cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, cnt = 0, scnt = 0;

      for (j = 0; j < bs.length; j++) {
        if (i === j) continue;
        bj = bs[j];
        var dx = bj.x - bi.x, dy = bj.y - bi.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > view2) continue;
        cnt++;
        cx += bj.x; cy += bj.y;
        ax += bj.vx; ay += bj.vy;
        if (d2 < sep2 && d2 > 0.01) {
          var inv = 1 / d2;
          sx -= dx * inv;
          sy -= dy * inv;
          scnt++;
        }
      }

      if (cnt > 0) {
        /* сцепление */
        var tx = cx / cnt - bi.x, ty = cy / cnt - bi.y;
        var tl = Math.sqrt(tx * tx + ty * ty) || 1;
        bi.vx += (tx / tl) * maxForce;
        bi.vy += (ty / tl) * maxForce;
        /* выравнивание */
        tx = ax / cnt - bi.vx; ty = ay / cnt - bi.vy;
        tl = Math.sqrt(tx * tx + ty * ty) || 1;
        var f = Math.min(tl, maxForce) / tl;
        bi.vx += tx * f;
        bi.vy += ty * f;
      }
      if (scnt > 0) {
        bi.vx += sx * 34;
        bi.vy += sy * 34;
      }

      /* мышь: притягивает, при зажатии распугивает */
      if (pin) {
        dx = px - bi.x; dy = py - bi.y;
        var md = Math.sqrt(dx * dx + dy * dy) || 1;
        var power = pdown ? -0.11 : 0.045;
        if (md < 240) {
          bi.vx += (dx / md) * power * (1 - md / 240) * 10;
          bi.vy += (dy / md) * power * (1 - md / 240) * 10;
        }
      }

      var sp = Math.sqrt(bi.vx * bi.vx + bi.vy * bi.vy) || 0.001;
      if (sp > maxSpeed) { bi.vx = bi.vx / sp * maxSpeed; bi.vy = bi.vy / sp * maxSpeed; }
      if (sp < 0.9) { bi.vx = bi.vx / sp * 0.9; bi.vy = bi.vy / sp * 0.9; }

      bi.x += bi.vx * dt * 60;
      bi.y += bi.vy * dt * 60;

      if (bi.x < -12) bi.x += w + 24;
      if (bi.x > w + 12) bi.x -= w + 24;
      if (bi.y < -12) bi.y += h + 24;
      if (bi.y > h + 12) bi.y -= h + 24;
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    for (i = 0; i < bs.length; i++) {
      bi = bs[i];
      sp = Math.sqrt(bi.vx * bi.vx + bi.vy * bi.vy);
      var hue = 185 + (sp / maxSpeed) * 130;
      var size = 7;
      var a2 = Math.atan2(bi.vy, bi.vx);
      ctx.fillStyle = 'hsla(' + hue + ', 80%, 62%, 0.9)';
      ctx.beginPath();
      ctx.moveTo(bi.x + Math.cos(a2) * size, bi.y + Math.sin(a2) * size);
      ctx.lineTo(bi.x + Math.cos(a2 + 2.6) * size, bi.y + Math.sin(a2 + 2.6) * size);
      ctx.lineTo(bi.x + Math.cos(a2 - 2.6) * size, bi.y + Math.sin(a2 - 2.6) * size);
      ctx.closePath();
      ctx.fill();
    }
  };

  LAB.register({
    id: 'boids',
    title: 'Стая',
    tag: 'эмерджентность',
    desc: 'Три правила Крейга Рейнольдса (сепарация, выравнивание, сцепление) рождают живое поведение стаи.',
    hint: 'мышь приманивает · зажмите, чтобы рассеять',
    cls: Boids
  });
})();