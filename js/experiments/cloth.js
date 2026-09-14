/* Ткань — verlet-физика: тяните ткань мышью, перетяжка рвёт нити */
(function () {
  'use strict';

  var LAB = window.LAB;

  function Cloth(canvas) {
    LAB.Base2D.call(this, canvas);
    this.points = [];
    this.links = [];
    this.grabbed = -1;
    this.mousePos = { x: 0, y: 0 };
    this.cols = 0;
    this.rows = 0;
    this.spacing = 10;
    this.warmup = 30;
    this.onResized = this.onResized.bind(this);
    canvas.addEventListener('dblclick', this.rebuild.bind(this));
  }

  Cloth.prototype = Object.create(LAB.Base2D.prototype);
  Cloth.prototype.constructor = Cloth;

  Cloth.prototype.onResized = function (w, h) {
    this.cols = LAB.clamp(Math.round(w / 30), 10, 26);
    this.rows = LAB.clamp(Math.round(h / 30), 7, 16);
    this.spacing = Math.min((w * 0.86) / (this.cols - 1), (h * 0.72) / (this.rows - 1));
    this.build();
  };

  Cloth.prototype.build = function () {
    var c = this.cols, r = this.rows, s = this.spacing;
    var startX = (this.w - (c - 1) * s) / 2;
    var startY = this.h * 0.09;
    this.points = [];
    this.links = [];
    var x, y, i, j, idx;

    for (y = 0; y < r; y++) {
      for (x = 0; x < c; x++) {
        var pinned = y === 0 && (x % 3 === 0 || x === c - 1);
        this.points.push({
          x: startX + x * s,
          y: startY + y * s,
          px: startX + x * s,
          py: startY + y * s,
          pinned: pinned
        });
      }
    }

    for (y = 0; y < r; y++) {
      for (x = 0; x < c; x++) {
        idx = y * c + x;
        if (x < c - 1) this.links.push({ a: idx, b: idx + 1, rest: s, dead: false });
        if (y < r - 1) this.links.push({ a: idx, b: idx + c, rest: s, dead: false });
      }
    }
  };

  Cloth.prototype.step = function (dt) {
    var ctx = this.ctx;
    var pts = this.points, links = this.links;
    var i, ln, p, a, b;

    /* интегрирование verlet */
    var wind = Math.sin(this.time * 0.9) * 14 + Math.sin(this.time * 2.3) * 6;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p.pinned) continue;
      var vx = (p.x - p.px) * 0.985;
      var vy = (p.y - p.py) * 0.985;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + wind * dt;
      p.y += vy + 560 * dt * dt;
    }

    /* захват мышью */
    if (this.grabbed >= 0 && this.pointer.down) {
      var g = pts[this.grabbed];
      g.x = this.pointer.x;
      g.y = this.pointer.y;
      g.px = g.x;
      g.py = g.y;
    } else if (this.grabbed >= 0) {
      this.grabbed = -1;
    }

    /* связи */
    for (var iter = 0; iter < 3; iter++) {
      for (i = 0; i < links.length; i++) {
        ln = links[i];
        if (ln.dead) continue;
        a = pts[ln.a];
        b = pts[ln.b];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        if (d > ln.rest * 3.8) { ln.dead = true; continue; }
        var diff = (d - ln.rest) / d * 0.5;
        var ox = dx * diff, oy = dy * diff;
        if (!a.pinned && !(ln.a === this.grabbed)) { a.x += ox; a.y += oy; }
        if (!b.pinned && !(ln.b === this.grabbed)) { b.x -= ox; b.y -= oy; }
      }
    }

    /* пол */
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p.y > this.h - 6) {
        p.y = this.h - 6;
        p.px = LAB.lerp(p.px, p.x, 0.5);
      }
      if (p.x < 4) { p.x = 4; }
      if (p.x > this.w - 4) { p.x = this.w - 4; }
    }

    /* отрисовка */
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.lineWidth = 1;
    for (i = 0; i < links.length; i++) {
      ln = links[i];
      if (ln.dead) continue;
      a = pts[ln.a];
      b = pts[ln.b];
      var dx2 = b.x - a.x, dy2 = b.y - a.y;
      var stretch = Math.sqrt(dx2 * dx2 + dy2 * dy2) / ln.rest;
      var stress = LAB.clamp((stretch - 1) * 2.2, 0, 1);
      var hue = LAB.lerp(215, 350, stress);
      ctx.strokeStyle = 'hsla(' + hue + ', ' + (60 + stress * 40) + '%, ' + (58 + stress * 8) + '%, ' + (0.55 + stress * 0.45) + ')';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.fillStyle = '#7dd3fc';
    for (i = 0; i < pts.length; i++) {
      if (pts[i].pinned) {
        ctx.fillRect(pts[i].x - 2, pts[i].y - 2, 4, 4);
      }
    }
  };

  Cloth.prototype.onPress = function () {
    var best = -1, bestD = 42 * 42;
    var pts = this.points;
    for (var i = 0; i < pts.length; i++) {
      var dx = pts[i].x - this.pointer.x;
      var dy = pts[i].y - this.pointer.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    this.grabbed = best;
  };

  Cloth.prototype.rebuild = function () {
    this.build();
  };

  LAB.register({
    id: 'cloth',
    title: 'Ткань',
    tag: 'физика · verlet',
    desc: 'Классическая cloth-симуляция на интеграторе Верле: гравитация, ветер и обрыв нитей при перерастяжении.',
    hint: 'тяните ткань мышью · двойной клик — новая ткань',
    cls: Cloth
  });
})();