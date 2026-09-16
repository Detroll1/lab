/* LAB — сетка карточек, живые превью, полноэкранный просмотрщик */
(function () {
  'use strict';

  var LAB = window.LAB;
  var registry = LAB.registry;

  /* --- видимый индикатор ошибок: страница честно сигнализирует о сбое --- */
  var errorStrip = document.getElementById('errorStrip');
  window.addEventListener('error', function (e) {
    errorStrip.hidden = false;
    errorStrip.textContent = 'JS-ошибка: ' + (e.message || 'неизвестная') + ' (' + (e.filename || '') + ':' + (e.lineno || '') + ')';
  });
  window.addEventListener('unhandledrejection', function (e) {
    errorStrip.hidden = false;
    errorStrip.textContent = 'Ошибка промиса: ' + (e.reason && e.reason.message ? e.reason.message : e.reason);
  });

  var grid = document.getElementById('grid');
  var statCount = document.getElementById('statCount');
  statCount.textContent = String(registry.length);

  /* ---------- карточки ---------- */

  function makeCard(def, index) {
    var card = document.createElement('article');
    card.className = 'card';

    var wrap = document.createElement('div');
    wrap.className = 'card-canvas-wrap';
    var tag = document.createElement('span');
    tag.className = 'card-tag';
    tag.textContent = def.tag;
    var preview = document.createElement('canvas');
    wrap.appendChild(tag);
    wrap.appendChild(preview);

    var body = document.createElement('div');
    body.className = 'card-body';

    var title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = def.title;

    var desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = def.desc;

    var foot = document.createElement('div');
    foot.className = 'card-foot';
    var hint = document.createElement('span');
    hint.className = 'card-hint';
    hint.textContent = def.hint;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'expand-btn';
    btn.textContent = 'Развернуть';
    btn.setAttribute('aria-label', 'Развернуть «' + def.title + '» на весь экран');
    foot.appendChild(hint);
    foot.appendChild(btn);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(foot);

    card.appendChild(wrap);
    card.appendChild(body);

    function open() { viewer.open(index); }
    btn.addEventListener('click', open);
    wrap.addEventListener('click', open);

    return { card: card, canvas: preview, def: def };
  }

  var cards = registry.map(makeCard);
  cards.forEach(function (c) { grid.appendChild(c.card); });

  /* ---------- живые превью только в видимой области ---------- */

  var previews = cards.map(function (c) {
    return {
      canvas: c.canvas,
      def: c.def,
      inst: null,
      visible: false
    };
  });

  function startPreview(p) {
    if (p.inst || viewer.openedId) return;
    try {
      p.inst = new p.def.cls(p.canvas);
      p.inst.start();
    } catch (err) {
      p.inst = null;
      console.error('Превью «' + p.def.title + '»: ' + err.message);
    }
  }

  function stopPreview(p) {
    if (!p.inst) return;
    p.inst.destroy();
    p.inst = null;
  }

  /* без IntersectionObserver превью запускаем позже, после объявления viewer */
  var noObserver = false;

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var p = previews[Number(en.target.dataset.idx)];
        if (!p) return;
        p.visible = en.isIntersecting;
        if (p.visible && !viewer.openedId) startPreview(p);
        if (!p.visible) stopPreview(p);
      });
    }, { threshold: 0.05 });
    previews.forEach(function (p, i) {
      p.canvas.dataset.idx = String(i);
      io.observe(p.canvas);
    });
  } else {
    noObserver = true;
  }

  /* ---------- полноэкранный просмотрщик ---------- */

  var viewerEl = document.getElementById('viewer');
  var viewerCanvas = document.getElementById('viewerCanvas');
  var viewerTitle = document.getElementById('viewerTitle');
  var viewerDesc = document.getElementById('viewerDesc');
  var viewerHint = document.getElementById('viewerHint');
  var viewerIndex = document.getElementById('viewerIndex');
  var btnClose = document.getElementById('viewerClose');
  var btnPrev = document.getElementById('viewerPrev');
  var btnNext = document.getElementById('viewerNext');

  var viewer = {
    openedId: null,
    openedIndex: -1,
    inst: null,

    open: function (index) {
      var def = registry[index];
      if (!def) return;
      this.close(true);

      previews.forEach(stopPreview);

      /* сначала показываем просмотрщик: canvas должен получить реальный
         размер до создания экземпляра, иначе resize() видит 0x0 */
      viewerTitle.textContent = def.title;
      viewerDesc.textContent = def.desc;
      viewerHint.textContent = def.hint;
      viewerIndex.textContent = (index + 1) + ' / ' + registry.length;

      viewerEl.classList.add('open');
      viewerEl.setAttribute('aria-hidden', 'false');
      document.body.classList.add('viewer-open');
      btnClose.focus({ preventScroll: true });

      this.openedId = def.id;
      this.openedIndex = index;
      window.history.replaceState(null, '', '#exp-' + def.id);

      try {
        this.inst = new def.cls(viewerCanvas);
        this.inst.start();
      } catch (err) {
        console.error('Эксперимент «' + def.title + '»: ' + err.message);
        viewerTitle.textContent = def.title + ' — WebGL недоступен';
        viewerDesc.textContent = 'Этот браузер не смог запустить WebGL: ' + err.message;
        viewerHint.textContent = '';
      }
    },

    close: function (silent) {
      if (this.inst) {
        this.inst.destroy();
        this.inst = null;
      }
      this.openedId = null;
      this.openedIndex = -1;
      viewerEl.classList.remove('open');
      viewerEl.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('viewer-open');
      if (!silent) {
        window.history.replaceState(null, '', window.location.pathname);
        previews.forEach(function (p) {
          if (p.visible) startPreview(p);
        });
      }
    },

    step: function (dir) {
      var n = registry.length;
      var idx = ((this.openedIndex + dir) % n + n) % n;
      this.open(idx);
    }
  };

  btnClose.addEventListener('click', function () { viewer.close(); });
  btnPrev.addEventListener('click', function () { viewer.step(-1); });
  btnNext.addEventListener('click', function () { viewer.step(1); });

  document.addEventListener('keydown', function (e) {
    if (viewer.openedId === null) return;
    if (e.key === 'Escape') viewer.close();
    else if (e.key === 'ArrowLeft') viewer.step(-1);
    else if (e.key === 'ArrowRight') viewer.step(1);
  });

  /* deep-link: #exp-<id> открывает эксперимент сразу */
  function openFromHash() {
    var m = /^#exp-([\w-]+)$/.exec(window.location.hash);
    if (!m) return;
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].id === m[1]) {
        viewer.open(i);
        return;
      }
    }
  }

  window.addEventListener('hashchange', function () {
    if (!window.location.hash) viewer.close();
    else openFromHash();
  });
  openFromHash();

  /* массовый запуск превью, когда viewer уже объявлен */
  if (noObserver) previews.forEach(startPreview);
})();
