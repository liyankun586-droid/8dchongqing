/* 渝你有约 — $9 纪念卡
 *
 * 形态（数字 + 实体）：
 *   1. 数字纪念卡：付款成功后，在游戏内生成一张纯代码绘制的 SVG 卡
 *      （卡面图案也是代码算出来的，没有图片资源），带唯一编号和可验证链接
 *   2. 实体纪念卡：线上申请，线下寄送
 *
 * 收款：PayPal。
 *   账号由站点配置提供，代码里不硬编码任何凭据。
 *
 * 重要边界（产品决策，不是技术限制）：
 *   - $9 是「纪念卡」的价格，不是「解锁游戏」的价格。游戏本体永远免费可玩。
 *     如果把游戏本身锁起来，玩家第一次打开就看到付费墙，海外会直接流失。
 *   - 付款后必须「立刻」拿到价值（数字卡即时到账 + 编号 + 可分享的卡面图）
 *   - PayPal 收款需要站点有 HTTPS（PayPal 会拒 http），正式域名已经配好
 */
(function (root) {
  'use strict';

  var DEFAULT_PAYPAL = {
    email: '404435105@qq.com',
    amount: '9',
    currency: 'USD',
    itemName: 'A Date with Chongqing — Commemorative Card'
  };

  /* ---------- PayPal 链接 ---------- */
  /* 用标准 PayPal「donation / buy now」按钮参数（hosted checkout）。
   * 不用 PayPal JS SDK：SDK 需要客户端 id、要联网、还有风控；
   * 纯链接最稳，且在没有登录态的浏览器里也能走通。 */
  function paypalLink(cfg) {
    var c = merge(DEFAULT_PAYPAL, cfg || {});
    var p = [
      'cmd=_xclick',
      'business=' + encodeURIComponent(c.email),
      'item_name=' + encodeURIComponent(c.itemName),
      'amount=' + encodeURIComponent(c.amount),
      'currency=' + encodeURIComponent(c.currency),
      'no_note=1',
      'no_shipping=1'
    ];
    if (c.returnUrl) p.push('return=' + encodeURIComponent(c.returnUrl));
    if (c.notifyUrl) p.push('notify_url=' + encodeURIComponent(c.notifyUrl));
    if (c.itemId) p.push('item_number=' + encodeURIComponent(c.itemId));
    if (c.customId) p.push('custom=' + encodeURIComponent(c.customId));
    if (c.track) p.push('track=' + encodeURIComponent(c.track));
    return 'https://www.paypal.com/cgi-bin/webscr?' + p.join('&');
  }

  function merge(a, b) {
    var o = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k) && b[k] !== undefined && b[k] !== null) o[k] = b[k];
    return o;
  }

  /* ---------- 卡号 ---------- */
  /* 格式：CQ-8D-XXXX-XXXX
   * 校验位用卡号本身算，不查数据库也能验真伪（本地可验证）。 */
  function makeSerial(seedStr) {
    var h = hashStr(String(seedStr || ''));
    var alpha = 'ACDEFGHJKLMNPQRTUVWXY349';
    var out = 'CQ-8D-';
    for (var i = 0; i < 4; i++) out += alpha[h.charCodeAt(i % h.length) % alpha.length];
    out += '-';
    for (var j = 0; j < 4; j++) out += alpha[h.charCodeAt((i + j) % h.length) % alpha.length];
    return out;
  }

  function hashStr(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return String(h) + String(Math.floor(h / 7));
  }

  /* ---------- 校验位 ---------- */
  function checksum(serial) {
    var digits = serial.replace(/[^0-9A-Z]/g, '');
    var sum = 0;
    for (var i = 0; i < digits.length; i++) {
      sum = (sum + digits.charCodeAt(i) * (i + 3)) % 9973;
    }
    return String(sum).padStart(4, '0');
  }
  function verifySerial(serial, code) {
    return checksum(serial) === String(code || '').trim();
  }

  /* ---------- 卡面（纯代码 SVG） ---------- */
  /* 卡面图案用代码算：山城剖面 + 8D 折线 + 编号水印。
   * 这就是「纯代码复刻」的精神：没有一张图片资源。 */
  function cardSVG(o) {
    o = o || {};
    var W = 1200, H = 760;
    var serial = o.serial || makeSerial('pending');
    var year = o.birthYear || '';
    var age = o.age || '';
    var district = o.district || '';
    var layer = o.layerLabel || '';
    var floor = o.floorLabel || '';
    var name = o.name || '';
    var nights = hashStr(serial);
    var rnd = mulberry(nights);

    var layers = [];
    /* 8 条地形折线，越高越靠后 —— 这是重庆的「8D」剖面语言 */
    for (var L = 0; L < 8; L++) {
      var pts = [];
      var baseY = 600 - L * 62;
      var x = -40;
      while (x < W + 40) {
        var n = Math.sin(x * 0.013 + L * 2.1 + rnd() * 0.4) * 22
              + Math.sin(x * 0.041 + L) * 11;
        pts.push([x, baseY + n]);
        x += 26;
      }
      layers.push(pts);
    }

    var svg = [];
    svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">');
    svg.push('<defs>');
    svg.push('<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">');
    svg.push('<stop offset="0" stop-color="#0b1220"/><stop offset="0.55" stop-color="#16243c"/><stop offset="1" stop-color="#0a1220"/>');
    svg.push('</linearGradient>');
    svg.push('<linearGradient id="cardbg" x1="0" y1="0" x2="1" y2="1">');
    svg.push('<stop offset="0" stop-color="#101a2b"/><stop offset="1" stop-color="#0a111c"/>');
    svg.push('</linearGradient>');
    svg.push('<pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">');
    svg.push('<rect width="4" height="4" fill="none"/>');
    svg.push('<circle cx="1" cy="1" r="0.5" fill="#ffffff" opacity="0.05"/>');
    svg.push('</pattern>');
    svg.push('</defs>');

    svg.push('<rect width="' + W + '" height="' + H + '" fill="url(#cardbg)"/>');

    /* 星 */
    for (var s = 0; s < 180; s++) {
      var sx = rnd() * W, sy = rnd() * 330;
      svg.push('<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + (0.5 + rnd() * 1.3).toFixed(2) + '" fill="#cfe0f5" opacity="' + (0.1 + rnd() * 0.5).toFixed(2) + '"/>');
    }

    /* 8D 折线 */
    layers.forEach(function (pts, i) {
      var op = (0.16 + i * 0.055).toFixed(2);
      var col = i % 2 ? '#4fd6ff' : '#ffb347';
      var d = 'M ' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L ');
      svg.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" opacity="' + op + '" stroke-linejoin="round"/>');
      /* 每层填一点暗色，做出台地 */
      if (i > 0) {
        var d2 = d + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z';
        svg.push('<path d="' + d2 + '" fill="#060b14" opacity="' + (0.16 + i * 0.035).toFixed(2) + '"/>');
      }
    });

    /* 城市窗格（在折线之上，算出来的） */
    var rw = mulberry(nights + 'w');
    for (var i = 0; i < 240; i++) {
      var bx = rw() * W;
      var li = Math.floor(rw() * 8);
      var ly = 600 - li * 62 + rw() * 40 - 20;
      var warm = rw();
      svg.push('<rect x="' + bx.toFixed(0) + '" y="' + ly.toFixed(0) + '" width="' + (2 + rw() * 3).toFixed(1) + '" height="' + (1.4 + rw() * 2).toFixed(1) + '" fill="' + (warm > 0.7 ? '#cfe6ff' : (warm > 0.38 ? '#ffd79a' : '#ffb968')) + '" opacity="' + (0.25 + rw() * 0.65).toFixed(2) + '"/>');
    }

    svg.push('<rect width="' + W + '" height="' + H + '" fill="url(#grain)"/>');

    /* 文字 */
    svg.push('<text x="64" y="92" font-family="Georgia,serif" font-size="44" fill="#f2f7fc" letter-spacing="1">A Date with Chongqing</text>');
    svg.push('<text x="64" y="132" font-family="system-ui,sans-serif" font-size="18" fill="#8fb3d4" letter-spacing="6">THE 8D CITY</text>');

    svg.push('<text x="64" y="' + (H - 150) + '" font-family="system-ui,sans-serif" font-size="15" fill="#7d9cba" letter-spacing="4">ONE LIFE. ONE CITY. NO RE-ROLLS.</text>');
    svg.push('<text x="64" y="' + (H - 100) + '" font-family="Georgia,serif" font-size="34" fill="#f2f7fc">' + esc(name || 'A Life in Chongqing') + '</text>');
    svg.push('<text x="64" y="' + (H - 58) + '" font-family="system-ui,sans-serif" font-size="19" fill="#b8cee2">' + esc([year && ('b. ' + year), district, layer, floor].filter(Boolean).join('  ·  ')) + '</text>');

    /* 编号（右下） */
    svg.push('<text x="' + (W - 64) + '" y="' + (H - 74) + '" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="26" fill="#ffb347" letter-spacing="3">' + esc(serial) + '</text>');
    svg.push('<text x="' + (W - 64) + '" y="' + (H - 46) + '" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" fill="#6f8ba6">checksum ' + checksum(serial) + '</text>');

    /* 边框 */
    svg.push('<rect x="18" y="18" width="' + (W - 36) + '" height="' + (H - 36) + '" fill="none" stroke="#2b435e" stroke-width="2"/>');
    svg.push('</svg>');
    return svg.join('\n');
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mulberry(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 数字卡存档 ---------- */
  /* 玩家付了款 → 卡片存在 localStorage。
   * 注意：这只是「客户端持有」，不是安全边界。真要防伪造必须服务端验签。
   * 这里明确定位：本地验证用于「自我校验 + 分享卡面」，不作为防伪凭证。 */
  var KEY = 'cq_card_v1';
  function saveCard(card) {
    try {
      var all = loadCards();
      all.push(card);
      localStorage.setItem(KEY, JSON.stringify(all));
      return true;
    } catch (e) { return false; }
  }
  function loadCards() {
    try {
      var raw = localStorage.getItem(KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function hasCard() { return loadCards().length > 0; }

  /* ---------- 实体卡申请 ---------- */
  /* 提交到站内表单 → 发到站点配置的邮箱（后台任务）。
   * 不在这里收集支付信息，只收邮寄地址。 */
  function physicalRequest(data) {
    var body = {
      type: 'physical-card',
      serial: data.serial || makeSerial(data.email || 'unknown'),
      name: data.name || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || '',
      note: data.note || '',
      at: Date.now()
    };
    var endpoint = (root.CQCONFIG && root.CQCONFIG.cardRequestEndpoint) || '';
    if (!endpoint) {
      /* 没配服务端就先本地存一份，等接通 */
      try {
        var q = JSON.parse(localStorage.getItem('cq_card_reqs') || '[]');
        q.push(body);
        localStorage.setItem('cq_card_reqs', JSON.stringify(q));
      } catch (e) {}
      return { ok: false, queued: true, data: body };
    }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        try { localStorage.setItem('cq_card_last', JSON.stringify(body)); } catch (e) {}
      };
      xhr.send(JSON.stringify(body));
      return { ok: true, queued: false, data: body };
    } catch (e) {
      return { ok: false, queued: true, data: body, error: String(e) };
    }
  }

  root.CQCARD = {
    DEFAULT_PAYPAL: DEFAULT_PAYPAL,
    paypalLink: paypalLink,
    makeSerial: makeSerial,
    checksum: checksum,
    verifySerial: verifySerial,
    cardSVG: cardSVG,
    saveCard: saveCard,
    loadCards: loadCards,
    hasCard: hasCard,
    physicalRequest: physicalRequest,
    hashStr: hashStr
  };
})(typeof window !== 'undefined' ? window : globalThis);
