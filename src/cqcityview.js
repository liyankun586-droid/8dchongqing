/* 渝你有约 — 3D 山城视图 + 地标面板 + 时间条 + 纪念卡
 *
 * 这层只管「画」和「交互」，不含任何游戏规则。
 * 规则在 rules.js，渲染在 city.js / sceneview.js，这里是编排。
 */
(function (root) {
  'use strict';

  var C = root.CQCITY;
  var Card = root.CQCARD;

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  /* ================================================================
   * 3D 山城视图
   * ================================================================ */
  function CityView(host, opts) {
    opts = opts || {};
    this.host = host;
    this.seed = opts.seed || 20261114;
    this.night = opts.night !== false;
    this.landmarks = opts.landmarks || [];
    this.onLandmark = opts.onLandmark || function () {};
    this.scale = opts.scale || 0.62;

    var wrap = el('div', 'citywrap');
    var canvas = el('canvas', 'citycanvas');
    var hint = el('div', 'cityhint');
    var toggle = el('button', 'citytoggle');
    var toolbar = el('div', 'citytools');
    var zoomIn = el('button', 'citybtn', '+');
    var zoomOut = el('button', 'citybtn', '−');
    var reset = el('button', 'citybtn wide', 'reset');

    toggle.textContent = this.night ? '☾ night' : '☀ day';
    toggle.onclick = function () {
      self.night = !self.night;
      toggle.textContent = self.night ? '☾ night' : '☀ day';
      self.draw();
    };
    zoomIn.onclick = function () { self.scale = Math.min(1.6, self.scale * 1.18); self.draw(); };
    zoomOut.onclick = function () { self.scale = Math.max(0.22, self.scale / 1.18); self.draw(); };
    reset.onclick = function () { self.scale = 0.62; self.draw(); };

    toolbar.appendChild(zoomIn);
    toolbar.appendChild(zoomOut);
    toolbar.appendChild(reset);
    toolbar.appendChild(toggle);

    wrap.appendChild(canvas);
    wrap.appendChild(hint);
    wrap.appendChild(toolbar);
    host.appendChild(wrap);

    var self = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hits = [];

    canvas.addEventListener('click', function (ev) {
      var r = canvas.getBoundingClientRect();
      var mx = ev.clientX - r.left, my = ev.clientY - r.top;
      var dpr = window.devicePixelRatio || 1;
      var cx = mx * dpr, cy = my * dpr;
      var best = null, bd = 1e9;
      for (var i = 0; i < self.hits.length; i++) {
        var h = self.hits[i];
        var dx = cx - h.x * dpr, dy = cy - h.y * dpr;
        var d = dx * dx + dy * dy;
        if (d < h.r * h.r * dpr * dpr && d < bd) { bd = d; best = h; }
      }
      if (best) self.onLandmark(best.lm);
    });

    canvas.addEventListener('mousemove', function (ev) {
      var r = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var cx = (ev.clientX - r.left) * dpr, cy = (ev.clientY - r.top) * dpr;
      var over = false;
      for (var i = 0; i < self.hits.length; i++) {
        var h = self.hits[i];
        var dx = cx - h.x * dpr, dy = cy - h.y * dpr;
        if (dx * dx + dy * dy < h.r * h.r * dpr * dpr) { over = true; break; }
      }
      canvas.style.cursor = over ? 'pointer' : 'default';
    });

    this.resize();
    window.addEventListener('resize', function () { self.resize(); });
    this.draw();
  }

  CityView.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var r = this.host.getBoundingClientRect();
    var w = Math.max(320, r.width);
    var h = Math.max(280, Math.min(620, w * 0.56));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssW = w; this.cssH = h;
  };

  CityView.prototype.draw = function () {
    var ctx = this.ctx;
    var res = C.render(ctx, this.cssW, this.cssH, {
      seed: this.seed,
      night: this.night,
      scale: this.scale,
      landmarks: this.landmarks
    });
    this.hits = res.hits || [];
    if (this.hint) {
      this.hint.textContent = this.landmarks.length
        ? this.landmarks.length + ' landmarks · click to open'
        : 'no landmarks yet';
    }
  };

  CityView.prototype.setLandmarks = function (lms) {
    this.landmarks = lms || [];
    this.draw();
  };

  /* ================================================================
   * 地标详情面板
   * ================================================================ */
  function LandmarkPanel(host) {
    this.host = host;
    host.classList.add('lmpanel');
  }
  LandmarkPanel.prototype.open = function (lm, lang) {
    var L = lang || 'en';
    this.host.innerHTML = '';
    if (!lm) return;
    var head = el('div', 'lmhead');
    head.appendChild(el('h3', 'lmtitle', L === 'zh' ? lm.zh : lm.en));
    head.appendChild(el('div', 'lmsub', L === 'zh' ? lm.en : lm.zh));
    var close = el('button', 'lmclose', '×');
    close.onclick = function () { self.close(); };
    head.appendChild(close);
    this.host.appendChild(head);

    /* 三语正文：zh / es / en 各自取自己的字段，缺失时回退到 blurbEn。
     * 之前这里只读那个纯英文字段，所以中文和西语玩家看到的
     * 永远是英文段落 —— 而数据集里明明有 blurbZh / blurbEs。 */
    var blurb = lm.blurbEn;
    if (L === 'zh') blurb = lm.blurbZh || lm.blurbEn;
    else if (L === 'es') blurb = lm.blurbEs || lm.blurbEn;
    this.host.appendChild(el('p', 'lmblurb', blurb));

    /* 标签：数据集里字段名是单数 tag（不是 tags）。
     * 之前读 lm.tags（复数），两个数据集都没有这个字段，
     * 结果标签栏永远为空 —— 特色标签一个都显示不出来。 */
    var tagList = lm.tags || (lm.tag ? [lm.tag] : []);
    var tags = el('div', 'lmtags');
    tagList.forEach(function (t) {
      tags.appendChild(el('span', 'lmtag', t));
    });
    if (tags.children.length) this.host.appendChild(tags);

    /* 近景：用 city.js 的渲染器画一个单地标的特写 */
    var art = el('div', 'lmart');
    this.host.appendChild(art);
    var self = this;
    requestAnimationFrame(function () {
      var c = el('canvas', 'lmcanvas');
      art.appendChild(c);
      var dpr = window.devicePixelRatio || 1;
      var w = Math.max(240, self.host.clientWidth - 8);
      var h = 190;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = w + 'px'; c.style.height = h + 'px';
      var ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* focus: 只按这个地标取景 —— 否则自动取景会框住整座城，
       * 地标小到根本认不出来（单文件版踩过同一个坑）。 */
      C.render(ctx, w, h, {
        seed: 20261114,
        night: true,
        scale: 1.0,
        focus: lm.id,
        landmarks: [lm]
      });
    });

    var foot = el('div', 'lmfoot');
    foot.appendChild(el('span', 'lmcoord', (lm.lat || 0).toFixed(4) + '°N  ' + (lm.lng || 0).toFixed(4) + '°E'));
    this.host.appendChild(foot);
  };
  LandmarkPanel.prototype.close = function () { this.host.innerHTML = ''; };

  /* ================================================================
   * 时间条（1 小时 = 1 年）
   * ================================================================ */
  function ClockBar(host, clock, opts) {
    opts = opts || {};
    this.host = host;
    this.clock = clock;
    this.opts = opts;
    /* 用 classList 而不是 className —— 后者会把宿主原有的类（如 'clockhost'）抹掉 */
    host.classList.add('clockbar');

    var left = el('div', 'cb-left');
    var yr = el('span', 'cb-year', 'year 0');
    left.appendChild(yr);

    var mid = el('div', 'cb-mid');
    var track = el('div', 'cb-track');
    var fill = el('div', 'cb-fill');
    track.appendChild(fill);
    mid.appendChild(track);
    var note = el('div', 'cb-note', '1 real hour = 1 in-game year');

    var right = el('div', 'cb-right');
    var pause = el('button', 'cb-btn', 'pause');
    var speed = el('button', 'cb-btn', '1×');
    var ff = el('button', 'cb-btn', '+1y');
    right.appendChild(pause); right.appendChild(speed); right.appendChild(ff);

    host.appendChild(left); host.appendChild(mid); host.appendChild(right);
    host.appendChild(note);

    var self = this;
    pause.onclick = function () {
      if (clock.running) { clock.pause(); pause.textContent = 'play'; }
      else { clock.resume(); pause.textContent = 'pause'; }
    };
    speed.onclick = function () {
      var s = clock.cycleSpeed();
      speed.textContent = s + '×';
    };
    ff.onclick = function () {
      clock.advanceYears(1);
      if (opts.onFastForward) opts.onFastForward();
    };

    this.parts = { yr: yr, fill: fill, pause: pause, speed: speed, note: note };
    clock.onTick = function (st) { self.update(st); };
    this.update(clock.state());
  }
  ClockBar.prototype.update = function (st) {
    /* 年份 = 出生年 + 已过年数（游戏内年龄） */
    var base = this.opts && this.opts.yearBase ? this.opts.yearBase : 0;
    var age = (this.opts && typeof this.opts.gameAge === 'function') ? this.opts.gameAge() : 0;
    var shown = base + age;
    this.parts.yr.textContent = (base ? String(shown) : 'year ' + age);
    this.parts.fill.style.width = Math.round(st.progress * 1000) / 10 + '%';
    this.parts.speed.textContent = st.speed + '×';
    this.parts.pause.textContent = st.running ? 'pause' : 'play';
    var s = Math.round(st.secondsToNextYear);
    this.parts.note.textContent = 'next year in ' + fmtDur(s) + ' · 1 real hour = 1 in-game year';
  };
  function fmtDur(sec) {
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    return h + 'h ' + m + 'm';
  }

  /* ================================================================
   * 纪念卡
   * ================================================================ */
  function CardShop(host, opts) {
    opts = opts || {};
    this.host = host;
    host.classList.add('cardshop');
    var self = this;

    var wrap = el('div', 'cs-inner');
    var title = el('h3', 'cs-title', opts.title || 'Commemorative Card');
    var blurb = el('p', 'cs-blurb', opts.blurb ||
      'One life, one city. The card is a keepsake of the life you actually lived — ' +
      'your block, your floor, your year. USD $9. The game itself stays free.');
    wrap.appendChild(title);
    wrap.appendChild(blurb);

    var grid = el('div', 'cs-grid');

    /* 数字卡 */
    var d = el('div', 'cs-item');
    d.appendChild(el('div', 'cs-item-title', opts.digitalTitle || 'Digital card'));
    d.appendChild(el('div', 'cs-item-desc', opts.digitalDesc ||
      'Unlocked instantly in-game. A generated card with your serial number, shareable as an image.'));
    var buyD = el('a', 'cs-buy', 'PayPal · $9');
    buyD.href = Card.paypalLink({
      returnUrl: (location.origin + location.pathname + '?card=1'),
      customId: 'digital',
      track: opts.track || ''
    });
    buyD.target = '_blank';
    buyD.rel = 'noopener';
    d.appendChild(buyD);
    grid.appendChild(d);

    /* 实体卡 */
    var p = el('div', 'cs-item');
    p.appendChild(el('div', 'cs-item-title', opts.physicalTitle || 'Physical card'));
    p.appendChild(el('div', 'cs-item-desc', opts.physicalDesc ||
      'A printed card with the same serial. Request it online, we mail it.'));
    var req = el('button', 'cs-buy', opts.requestLabel || 'Request by mail');
    req.onclick = function () { self.openPhysical(); };
    p.appendChild(req);
    grid.appendChild(p);

    wrap.appendChild(grid);

    /* 我的卡 */
    var mine = el('div', 'cs-mine');
    wrap.appendChild(mine);
    this.mine = mine;
    this.renderMine();

    host.appendChild(wrap);
  }

  CardShop.prototype.renderMine = function () {
    var cards = Card.loadCards();
    this.mine.innerHTML = '';
    if (!cards.length) return;
    this.mine.appendChild(el('div', 'cs-mine-title', 'Your cards'));
    cards.forEach(function (c) {
      var row = el('div', 'cs-card-row');
      row.appendChild(el('code', 'cs-serial', c.serial));
      var sum = el('span', 'cs-sum', 'checksum ' + Card.checksum(c.serial));
      row.appendChild(sum);
      var dl = el('button', 'cs-dl', 'Download');
      dl.onclick = function () { downloadCard(c); };
      row.appendChild(dl);
      this.mine.appendChild(row);
    }, this);
  };

  CardShop.prototype.openPhysical = function () {
    var self = this;
    var f = el('div', 'cs-form');
    f.innerHTML =
      '<div class="cs-form-title">Physical card request</div>' +
      '<label>Name<input type="text" data-f="name"></label>' +
      '<label>Email<input type="email" data-f="email"></label>' +
      '<label>Address<input type="text" data-f="address"></label>' +
      '<label>City<input type="text" data-f="city"></label>' +
      '<label>Country<input type="text" data-f="country"></label>' +
      '<label class="cs-form-note">We use this only to mail the card.</label>' +
      '<div class="cs-form-actions"><button class="cs-buy" data-a="send">Request</button>' +
      '<button class="cs-cancel" data-a="cancel">Cancel</button></div>' +
      '<div class="cs-form-msg"></div>';
    this.host.appendChild(f);
    var msg = f.querySelector('.cs-form-msg');
    f.querySelector('[data-a="cancel"]').onclick = function () { f.remove(); };
    f.querySelector('[data-a="send"]').onclick = function () {
      var data = {};
      f.querySelectorAll('[data-f]').forEach(function (i) { data[i.getAttribute('data-f')] = i.value.trim(); });
      if (!data.name || !data.email || !data.address) {
        msg.textContent = 'Please fill in name, email and address.';
        msg.className = 'cs-form-msg err';
        return;
      }
      var r = Card.physicalRequest(data);
      msg.textContent = r.ok ? 'Sent. We will email you when it ships.'
        : (r.queued ? 'Saved. We will email you when it ships.' : 'Could not send. Please email us directly.');
      msg.className = 'cs-form-msg ok';
      f.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      f.querySelector('[data-a="send"]').disabled = true;
    };
  };

  function downloadCard(c) {
    var svg = Card.cardSVG(c);
    var blob = new Blob([svg], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (c.serial || 'card') + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  root.CQCITYVIEW = {
    CityView: CityView,
    LandmarkPanel: LandmarkPanel,
    ClockBar: ClockBar,
    CardShop: CardShop,
    downloadCard: downloadCard
  };
})(typeof window !== 'undefined' ? window : globalThis);
