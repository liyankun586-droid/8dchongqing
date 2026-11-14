/* 渝你有约 — 纯代码 3D 山城渲染器
 *
 * 为什么不用 WebGL/Three.js：
 *   Fable 5.2 那个标杆（Felix Rieseberg 的 1.4MB 单 HTML）的关键不是 3D，
 *   是「零资源」—— 没有一张图片、没有一个模型文件，所有纹理和几何都是函数算出来的。
 *   我们对标的是这一点，不是像素数。
 *
 * 所以这里用 Canvas 2D + 等距（isometric）投影手写：
 *   - 几何：全部由地标的 scene 参数算出（层数、包围盒、吊脚、临江方向）
 *   - 纹理：全部由函数算（噪声哈希 → 色阶），不加载任何位图
 *   - 山城地形：程序化生成的多层台地 + 崖壁 + 江面
 *   - 可交互：点击地标 → 近景特写 + 说明面板；可切换昼夜
 *
 * 为什么用 2D 而不是 3D：
 *   1. 单文件 HTML 必须能双击打开，不能依赖网络加载任何资源
 *   2. 2D 等距投影反而更像「剖面插画」，和本项目已有的视觉语言一致
 *   3. 性能：上百栋楼 + 上千个窗户在 2D 上 60fps 稳，3D 未必
 */
(function (root) {
  'use strict';

  /* ---------- 确定性伪随机 ---------- */
  /* 同一个 seed 永远画出同一座山城（可回放、可分享） */
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 程序化纹理 ---------- */
  /* 用哈希噪声算出一个 [0,1) 的高度场，再映射成色阶。
   * 这替代了「加载一张砖墙贴图」这件事。 */
  function hash2(x, y, seed) {
    var n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.017) * 43758.5453;
    return n - Math.floor(n);
  }
  function noise2(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    var c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  function fbm(x, y, seed, oct) {
    var s = 0, amp = 0.5, f = 1;
    for (var i = 0; i < (oct || 3); i++) {
      s += noise2(x * f, y * f, seed) * amp;
      amp *= 0.5; f *= 2;
    }
    return s;
  }

  /* ---------- 等距投影 ---------- */
  /* 世界坐标 (x,y,z)：x 向右，y 向上（海拔），z 向里
   * 屏幕坐标：x 右下、z 左下 —— 这是标准 isometric */
  var ISO = {
    ax: 0.866, ay: 0.5,    // x 轴投影
    bx: -0.866, by: 0.5,   // z 轴投影
    cy: -1.0               // y 轴（海拔）投影
  };
  function project(x, y, z, origin, scale) {
    return {
      x: origin.x + (x * ISO.ax + z * ISO.bx) * scale,
      y: origin.y + (x * ISO.ay + z * ISO.by + y * ISO.cy) * scale
    };
  }

  /* ---------- 配色 ---------- */
  var PALETTE = {
    day: {
      sky: '#dfe8ef', far: '#c3d2dc', mid: '#a8bcc9', near: '#8ea6b6',
      rock: '#8c8272', rockLight: '#a89d8b', grass: '#7d9166',
      water: '#5d8ba6', waterHi: '#7fa8c0',
      glass: '#9fc4d8', glassDark: '#6f9ab4',
      concrete: '#c4bfb4', wood: '#8a6a4f', brick: '#a8725a',
      ink: '#2b3138', roof: '#6b5b4e', steel: '#7d858c',
      windowLit: 0
    },
    night: {
      sky: '#0b1220', far: '#16233a', mid: '#1d2f4a', near: '#263a58',
      rock: '#1a2230', rockLight: '#263044', grass: '#16261f',
      water: '#0d1a2b', waterHi: '#1d3550',
      glass: '#2b4258', glassDark: '#16283a',
      concrete: '#2a3340', wood: '#2e241c', brick: '#33211a',
      ink: '#e8eef5', roof: '#1a1410', steel: '#39434d',
      windowLit: 1
    }
  };
  var NEON = {
    amber: '#ffb347', cyan: '#4fd6ff', magenta: '#ff5fa2',
    white: '#e8f4ff', none: null
  };

  /* ---------- 地形 ---------- */
  /* 重庆的地形本质是「两江夹一山半岛 + 多级台地」。
   * 这里程序化生成：一条江（y=0），江对岸是山脊（y 高），中间是半岛台地。 */
  function buildTerrain(seed) {
    var rng = mulberry(seed);
    var terraces = [];
    var levels = 8;
    for (var L = 0; L < levels; L++) {
      var t = {
        level: L,
        /* 每级台地是一个真实的海拔台阶 —— 这就是重庆的「层」。
         * L0 最低（贴江），L7 最高（山顶）。 */
        y: L * 30,
        /* 越高越往江心退，形成层层叠叠的「城中之城」 */
        inset: L * 46,
        zBase: 180 - L * 52,      // 台地在 z 轴上的中心位置（越高层越靠前）
        blocks: []
      };
      /* 楼群密度。
       *
       * 原来每级台地只有 7-12 栋楼，覆盖率 8.3% —— 看上去是几座
       * 散落的盒子，而真实重庆渝中半岛核心区建筑基底占地约 35-45%，
       * 是一整片压得很紧的楼海。视觉上「密」是山城的第一特征，
       * 稀松的楼会让整个画面塌掉。
       *
       * 现在的做法：按台面面积定楼数（每 ~2600 m² 一栋），
       * 并做简单的footprint 去重叠，让楼贴着楼排开而不是叠在一起。
       * 楼高按层数分层：低层区多是老楼（矮而密），高层区出塔楼。
       */
      var halfW = 380 - L * 46;
      var deckArea = halfW * 2 * 300;
      var target = Math.round(deckArea / 2600);
      var placed = [];
      var guard = 0;
      while (placed.length < target && guard < target * 40) {
        guard++;
        var w = 18 + rng() * 34;
        var d = 16 + rng() * 28;
        var x = (rng() - 0.5) * (halfW * 2 - w);
        var z = t.zBase + (rng() - 0.5) * (300 - d - 20);
        /* 去重叠：跟已放的楼留一点缝，不重叠 */
        /* 去重叠：两个矩形在 x 和 z 上都要错开才算不撞。
           判据用 (w1+w2)/2 —— 两栋楼贴在一起但刚好不重叠，
           所以这里取 0.5 减去一点余量，保证视觉上有缝。 */
        var ok = true;
        for (var k = 0; k < placed.length; k++) {
          var q = placed[k];
          var needX = (q.w + w) * 0.52;
          var needZ = (q.d + d) * 0.52;
          if (Math.abs(q.x - x) < needX && Math.abs(q.z - z) < needZ) { ok = false; break; }
        }
        if (!ok) continue;
        /* 楼高分布：低层区矮楼多，高层区塔楼多 */
        var tower = rng();
        var hBase;
        if (L <= 2) hBase = tower > 0.88 ? 40 + rng() * 70 : 14 + rng() * 26;
        else if (L <= 4) hBase = tower > 0.74 ? 34 + rng() * 76 : 16 + rng() * 32;
        else if (L <= 6) hBase = tower > 0.62 ? 30 + rng() * 84 : 18 + rng() * 34;
        else hBase = tower > 0.5 ? 26 + rng() * 78 : 16 + rng() * 30;
        placed.push({ x: x, z: z, w: w, d: d, h: hBase, hue: rng() });
      }
      t.blocks = placed;
      /* 崖壁上的建筑：越高越矮（山顶留给塔类） */
      for (var bi = 0; bi < t.blocks.length; bi++) {
        t.blocks[bi].shrink = 1 - L * 0.055;
      }
      terraces.push(t);
    }
    return { terraces: terraces, seed: seed };
  }

  /* ---------- 崖壁 ---------- */
  /* 每一级台地的临江面是一堵垂直的墙。
   * 这是「山城」视觉的核心：不是斜坡，是一层一层的悬崖。 */
  function drawCliff(ctx, ter, P, C, seed) {
    var y0 = ter.y - 30;                 // 崖底
    var y1 = ter.y;                      // 崖顶
    var zFront = ter.zBase + 150;        // 台地前缘
    var halfW = 380 - ter.inset;
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };

    var a = p(-halfW, y0, zFront);
    var b = p(halfW, y0, zFront);
    var c = p(halfW, y1, zFront);
    var d = p(-halfW, y1, zFront);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, a.y, 0, d.y);
    g.addColorStop(0, C.rock);
    g.addColorStop(1, C.rockLight);
    ctx.fillStyle = g;
    ctx.fill();

    /* 崖壁纹理。
     *
     * 原来只有 9 条淡淡的横线，整个崖面是一块纯色渐变 ——
     * 看着像贴图而不是岩石。
     *
     * 重庆的江边崖壁有三个特征，这里都补上：
     *   1) 竖向冲沟 —— 雨水冲出来的深色竖槽，是崖壁最有辨识度的纹理
     *   2) 岩层横线 —— 沉积岩的层理
     *   3) 顶部植被 —— 崖顶边缘垂下来的一排深绿
     */
    var rr = mulberry(seed ^ (ter.level * 977));

    /* 1) 竖向冲沟 */
    var grooves = 26 + Math.floor(rr() * 14);
    for (var gI = 0; gI < grooves; gI++) {
      var gx = a.x + (b.x - a.x) * (gI / grooves + rr() * 0.03);
      var gw = Math.max(1, (b.x - a.x) / grooves * (0.25 + rr() * 0.5));
      ctx.globalAlpha = 0.10 + rr() * 0.16;
      ctx.fillStyle = C.ink;
      ctx.fillRect(gx, a.y, gw, d.y - a.y);
      /* 冲沟右侧受光面 */
      ctx.globalAlpha = 0.06 + rr() * 0.08;
      ctx.fillStyle = C.rockLight;
      ctx.fillRect(gx + gw, a.y, Math.max(0.8, gw * 0.5), d.y - a.y);
    }

    /* 2) 岩层横线 */
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    for (var s = 0; s < 9; s++) {
      var t = (s + 0.5) / 9;
      var yy = a.y + (d.y - a.y) * t;
      ctx.beginPath();
      ctx.moveTo(a.x, yy);
      for (var x = 0; x <= 1.001; x += 0.1) {
        var px = a.x + (b.x - a.x) * x;
        ctx.lineTo(px, yy + (rr() - 0.5) * 3.5);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* 3) 崖顶植被：垂下来的深绿，间隔分布 */
    var shrubs = 18 + Math.floor(rr() * 12);
    for (var v = 0; v < shrubs; v++) {
      var vx = a.x + (b.x - a.x) * ((v + rr() * 0.6) / shrubs);
      if (vx < a.x || vx > b.x) continue;
      var vh = (2 + rr() * 6) * Math.max(0.6, P.s);
      ctx.globalAlpha = 0.5 + rr() * 0.35;
      ctx.fillStyle = C.grass;
      ctx.beginPath();
      /* 用 arc 而不是 ellipse：ellipse 在部分 Canvas 实现/测试桩里没有，
         而 arc 是所有实现都有的基础方法。 */
      ctx.arc(vx, d.y + vh * 0.35, Math.max(1.5, vh * 0.75), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- 台地面 ---------- */
  function drawTerraceTop(ctx, ter, P, C, seed) {
    var y = ter.y;
    var zFront = ter.zBase + 150;
    var zBack = ter.zBase - 150;
    var halfW = 380 - ter.inset;
    var p = function (x, yy, z) { return project(x, yy, z, P.o, P.s); };
    var a = p(-halfW, y, zFront), b = p(halfW, y, zFront);
    var c = p(halfW, y, zBack), d = p(-halfW, y, zBack);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fillStyle = shade(C.grass, 0.35, 0.02);
    ctx.fill();
    /* 台地边缘高光（把层级分开） */
    ctx.strokeStyle = C.rockLight;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------- 建筑 ---------- */
  /* 从地标 scene 参数或台地方块生成一栋楼 */
  function makeBuilding(src, seed, opts) {
    opts = opts || {};
    var rng = mulberry(seed + (src.id ? src.id.length * 31 : 0) + Math.floor((src.x || 0) * 7 + (src.z || 0) * 13));
    var s = src.scene || {};
    var b = {
      x: src.x || 0,
      z: src.z || 0,
      w: (s.base && s.base.w) || src.w || 30,
      d: (s.base && s.base.d) || src.d || 26,
      h: (s.base && s.base.h) || src.h || 40,
      floors: s.floors || Math.max(3, Math.round(((s.base && s.base.h) || src.h || 40) / 9)),
      stilt: !!s.stilt,
      neon: s.neon || (opts.neon || 'none'),
      facade: s.facade || (rng() < 0.45 ? 'concrete-glass' : (rng() < 0.5 ? 'old-wood' : 'glass-curtain')),
      riverSide: s.riverSide || 'none',
      id: src.id || null,
      landmark: !!s.landmark,
      seed: seed,
      rng: rng
    };
    b.floorH = b.h / b.floors;
    return b;
  }

  /* ---------- 绘制一个盒子（带三面 + 顶面） ---------- */
  function drawBox(ctx, b, P, o, seed) {
    var w = b.w, d = b.d, h = b.h;
    var y0 = o.y0 !== undefined ? o.y0 : (b.y0 || 0);
    var x0 = b.x - w / 2, z0 = b.z - d / 2;

    var p000 = project(x0, y0, z0, P.o, P.s);
    var p100 = project(x0 + w, y0, z0, P.o, P.s);
    var p101 = project(x0 + w, y0, z0 + d, P.o, P.s);
    var p001 = project(x0, y0, z0 + d, P.o, P.s);
    var t000 = project(x0, y0 + h, z0, P.o, P.s);
    var t100 = project(x0 + w, y0 + h, z0, P.o, P.s);
    var t101 = project(x0 + w, y0 + h, z0 + d, P.o, P.s);
    var t001 = project(x0, y0 + h, z0 + d, P.o, P.s);

    // 顶面
    ctx.beginPath();
    ctx.moveTo(t001.x, t001.y); ctx.lineTo(t101.x, t101.y);
    ctx.lineTo(t100.x, t100.y); ctx.lineTo(t000.x, t000.y);
    ctx.closePath();
    ctx.fillStyle = o.roof;
    ctx.fill();

    // 右面（x+）
    ctx.beginPath();
    ctx.moveTo(p100.x, p100.y); ctx.lineTo(t100.x, t100.y);
    ctx.lineTo(t101.x, t101.y); ctx.lineTo(p101.x, p101.y);
    ctx.closePath();
    ctx.fillStyle = o.right;
    ctx.fill();

    // 左面（z+）
    ctx.beginPath();
    ctx.moveTo(p001.x, p001.y); ctx.lineTo(t001.x, t001.y);
    ctx.lineTo(t101.x, t101.y); ctx.lineTo(p101.x, p101.y);
    ctx.closePath();
    ctx.fillStyle = o.left;
    ctx.fill();

    return { p000: p000, p001: p001, p100: p100, p101: p101, t000: t000, t001: t001, t100: t100, t101: t101 };
  }

  /* ---------- 窗户（程序化纹理：按楼层 × 列 算哈希） ---------- */
  function drawWindows(ctx, b, geo, P, o, seed) {
    var lit = o.windowLit;
    if (!lit) return 0;
    var cols = Math.max(2, Math.floor(b.w / 7));
    var rows = b.floors;
    var c = 0;
    for (var f = 0; f < rows; f++) {
      var wy = b.floorH * (f + 0.55);
      for (var i = 0; i < cols; i++) {
        var wx = (i + 0.5) * (b.w / cols);
        var r = hash2(b.x + wx * 0.7, f * 3.1 + b.z * 0.3, seed);
        if (r < 0.42) continue;                 // 有些窗是暗的
        var warm = hash2(f * 5.3, b.x * 0.9, seed + 7);
        var col = warm > 0.72 ? '#cfe6ff' : (warm > 0.4 ? '#ffd79a' : '#ffb968');
        var y0 = geo.p100.y + (geo.t100.y - geo.p100.y) * (f / rows) - 1.6;
        var y1 = geo.p100.y + (geo.t100.y - geo.p100.y) * ((f + 0.55) / rows) - 1.6;
        var dx = (geo.p101.x - geo.p100.x) * ((i + 0.5) / cols);
        var dw = Math.max(1.2, (geo.p101.x - geo.p100.x) / cols * 0.52);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.5 + r * 0.5;
        ctx.fillRect(geo.p100.x + dx - dw / 2, y1, dw, Math.max(1.2, y0 - y1));
        c++;
      }
    }
    ctx.globalAlpha = 1;
    return c;
  }

  /* ---------- 吊脚（洪崖洞那种） ---------- */
  function drawStilts(ctx, b, P, o) {
    var n = Math.max(2, Math.floor(b.w / 16));
    for (var i = 0; i < n; i++) {
      var x = b.x - b.w / 2 + (i + 0.5) * (b.w / n);
      var top = project(x, 0, b.z - b.d / 2, P.o, P.s);
      var bot = project(x, -(10 + b.h * 0.05), b.z - b.d / 2, P.o, P.s);
      ctx.strokeStyle = o.ink;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1, P.s * 2.4);
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- 霓虹 ---------- */
  function drawNeon(ctx, b, geo, P, o) {
    var col = NEON[b.neon];
    if (!col) return;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, P.s * 1.6);
    ctx.globalAlpha = 0.85;
    // 楼顶一圈
    ctx.beginPath();
    ctx.moveTo(geo.t000.x, geo.t000.y); ctx.lineTo(geo.t100.x, geo.t100.y);
    ctx.lineTo(geo.t101.x, geo.t101.y); ctx.lineTo(geo.t001.x, geo.t001.y);
    ctx.closePath(); ctx.stroke();
    // 竖向灯带
    ctx.globalAlpha = 0.4;
    var bands = 3;
    for (var i = 1; i <= bands; i++) {
      var t = i / (bands + 1);
      var ax = geo.p100.x + (geo.t100.x - geo.p100.x) * t;
      var ay = geo.p100.y + (geo.t100.y - geo.p100.y) * t;
      var bx = geo.p101.x + (geo.t101.x - geo.p101.x) * t;
      var by = geo.p101.y + (geo.t101.y - geo.p101.y) * t;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }


  /* ---------- 地标专用绘制 ----------
   *
   * 为什么需要：地标如果只画成方盒子，那就只是「高一点的普通楼」，
   * 完全认不出是千厮门大桥、长江索道、李子坝穿楼。
   * 真实重庆的辨识度就在这些具体形态上，所以按 tag 分类型画。
   *
   * 类型（来自 landmarks.js 的 tag 字段）：
   *   river-bridge       斜拉桥 / 悬索桥：桥塔 + 拉索 + 桥面
   *   rail-through-building 轻轨穿楼：楼体中间一道横贯的轨道 + 站台
   *   stacked-cliffs     吊脚楼群：多层木构叠在崖上，下面有支撑柱
   *   hilltop-view       山顶观景台：栏杆 + 望远镜 + 旗杆
   *   old-town           老街：低矮瓦顶 + 灯笼
   *   night-neon         商圈：密集霓虹招牌
   *   multi-level-road   立体交通：多层高架 + 匝道
   *   river-confluence   江湾：江心洲 + 汇流线
   */

  /* 斜拉桥：塔 + 扇形拉索 + 桥面 */
  function drawCableBridge(ctx, b, P, o, seed) {
    var w = b.w, d = b.d;
    var deckY = b.y0 + b.h * 0.42;          /* 桥面高度 */
    var towerH = b.h * 1.55;
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var rr = mulberry(seed ^ (b.x * 7 + b.z * 3));

    /* 桥面（细长条） */
    var a = p(-w / 2, deckY, b.z), bb = p(w / 2, deckY, b.z);
    ctx.strokeStyle = o.deck;
    ctx.lineWidth = Math.max(1.4, P.s * 5.5);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();

    /* 两座桥塔 */
    [-0.28, 0.28].forEach(function (fx) {
      var tx = b.x + fx * w;
      var base = p(tx, b.y0, b.z), top = p(tx, b.y0 + towerH, b.z);
      ctx.strokeStyle = o.tower;
      ctx.lineWidth = Math.max(1.2, P.s * 4.2);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      /* 拉索：扇形，从塔顶拉到桥面 */
      ctx.strokeStyle = o.cable;
      ctx.lineWidth = Math.max(0.6, P.s * 1.1);
      ctx.globalAlpha = 0.65;
      for (var k = 0; k < 7; k++) {
        var sx = tx + (k < 3.5 ? -1 : 1) * (0.06 + (k % 3.5) * 0.16) * w;
        var sp = p(sx, deckY, b.z);
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(sp.x, sp.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    /* 桥墩 */
    ctx.strokeStyle = o.tower;
    ctx.lineWidth = Math.max(1, P.s * 3);
    for (var q = -0.42; q <= 0.42; q += 0.21) {
      var px = b.x + q * w;
      var pt = p(px, b.y0, b.z), pd = p(px, deckY, b.z);
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pd.x, pd.y); ctx.stroke();
    }
  }

  /* 悬索桥：主缆下垂 + 吊索 */
  function drawSuspensionBridge(ctx, b, P, o, seed) {
    var w = b.w, d = b.d;
    var deckY = b.y0 + b.h * 0.45;
    var towerH = b.h * 1.5;
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var a = p(-w / 2, deckY, b.z), bb = p(w / 2, deckY, b.z);
    ctx.strokeStyle = o.deck;
    ctx.lineWidth = Math.max(1.4, P.s * 5.5);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();

    var towers = [-0.42, 0.42];
    towers.forEach(function (fx) {
      var tx = b.x + fx * w;
      var base = p(tx, b.y0, b.z), top = p(tx, b.y0 + towerH, b.z);
      ctx.strokeStyle = o.tower; ctx.lineWidth = Math.max(1.2, P.s * 4);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    });
    /* 主缆：两段下垂曲线 */
    ctx.strokeStyle = o.cable; ctx.lineWidth = Math.max(0.8, P.s * 1.6);
    ctx.globalAlpha = 0.75;
    var t0 = towers[0] * w, t1 = towers[1] * w;
    var seg = 14;
    for (var side = 0; side < 2; side++) {
      var xa = side ? t0 : -w / 2, xb = side ? t1 : w / 2;
      ctx.beginPath();
      for (var s = 0; s <= seg; s++) {
        var u = s / seg;
        var x = xa + (xb - xa) * u;
        var sag = Math.sin(u * Math.PI) * b.h * 0.42;
        var yy = b.y0 + towerH - (side ? 0 : 0) - sag;
        var pt = p(x, yy, b.z);
        if (s === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* 轻轨穿楼：楼体中间一道横贯的轨道 + 站台 + 穿楼的列车 */
  function drawRailThrough(ctx, b, P, o, geo, seed) {
    var yRail = b.y0 + b.h * 0.58;
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var a = p(b.x - b.w * 0.75, yRail, b.z + b.d * 0.55);
    var bb = p(b.x + b.w * 0.75, yRail, b.z + b.d * 0.55);
    /* 轨道梁 */
    ctx.strokeStyle = o.rail;
    ctx.lineWidth = Math.max(1.6, P.s * 6);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
    /* 站台层（穿楼的那一层，比楼体宽一点） */
    var c1 = p(b.x - b.w * 0.62, yRail + b.floorH * 0.9, b.z + b.d * 0.5);
    var c2 = p(b.x + b.w * 0.62, yRail + b.floorH * 0.9, b.z + b.d * 0.5);
    ctx.strokeStyle = o.railHi;
    ctx.lineWidth = Math.max(1.2, P.s * 3.4);
    ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
    /* 列车：亮色小方块串 */
    ctx.fillStyle = o.train;
    var ncar = 4;
    for (var i = 0; i < ncar; i++) {
      var u = (i + 0.5) / ncar;
      var x = b.x - b.w * 0.7 + b.w * 1.4 * u;
      var pt = p(x, yRail + b.floorH * 0.45, b.z + b.d * 0.55);
      var pw = Math.max(2, P.s * 7);
      ctx.fillRect(pt.x - pw / 2, pt.y - pw * 0.55, pw, pw * 0.62);
    }
  }

  /* 吊脚楼群：一叠木构 + 底下支撑柱 + 底层红灯笼 */
  function drawStiltStack(ctx, b, P, o, seed) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var rr = mulberry(seed ^ (b.x * 11));
    /* 支撑柱：伸到崖下 */
    var nLegs = Math.max(3, Math.round(b.w / 11));
    ctx.strokeStyle = o.leg;
    ctx.lineWidth = Math.max(1, P.s * 2.6);
    ctx.globalAlpha = 0.85;
    for (var i = 0; i < nLegs; i++) {
      var x = b.x - b.w / 2 + (i + 0.5) * (b.w / nLegs);
      var top = p(x, b.y0, b.z + b.d * 0.45);
      var bot = p(x, b.y0 - 16 - rr() * 14, b.z + b.d * 0.45);
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* 底层灯笼（洪崖洞的招牌灯） */
    ctx.fillStyle = o.lantern;
    for (var k = 0; k < 7; k++) {
      var lx = b.x - b.w * 0.44 + (k + 0.5) * (b.w * 0.88 / 7);
      var lp = p(lx, b.y0 + b.h * 0.08, b.z + b.d * 0.55);
      var s = Math.max(1.2, P.s * 2.6);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(lp.x - s / 2, lp.y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* 山顶观景台：栏杆 + 望远镜 + 旗 */
  function drawViewDeck(ctx, b, P, o, seed) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var topY = b.y0 + b.h;
    /* 观景栏杆 */
    var a = p(b.x - b.w * 0.5, topY + 3, b.z + b.d * 0.5);
    var bb = p(b.x + b.w * 0.5, topY + 3, b.z + b.d * 0.5);
    ctx.strokeStyle = o.railHi;
    ctx.lineWidth = Math.max(0.8, P.s * 1.6);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
    /* 望远镜 */
    var t = p(b.x, topY + 5, b.z + b.d * 0.4);
    ctx.fillStyle = o.railHi;
    ctx.fillRect(t.x - Math.max(1, P.s * 2), t.y - Math.max(2, P.s * 4), Math.max(2, P.s * 4), Math.max(4, P.s * 8));
    /* 旗 */
    var f = p(b.x + b.w * 0.3, topY, b.z);
    ctx.strokeStyle = o.railHi;
    ctx.lineWidth = Math.max(0.7, P.s * 1.2);
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - Math.max(4, P.s * 12)); ctx.stroke();
    ctx.fillStyle = o.lantern;
    ctx.fillRect(f.x, f.y - Math.max(4, P.s * 12), Math.max(3, P.s * 5), Math.max(2, P.s * 3));
  }

  /* 老街：低矮瓦顶 + 灯笼串 */
  function drawOldTown(ctx, b, P, o, geo, seed) {
    var rr = mulberry(seed ^ (b.x * 3 + 1));
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    /* 灯笼串 */
    ctx.fillStyle = o.lantern;
    var n = Math.max(3, Math.round(b.w / 16));
    for (var i = 0; i < n; i++) {
      var x = b.x - b.w * 0.45 + (i + 0.5) * (b.w * 0.9 / n);
      var lp = p(x, b.y0 + b.h * 0.55, b.z + b.d * 0.52);
      var s = Math.max(1.1, P.s * 2.4);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(lp.x - s / 2, lp.y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* 商圈霓虹：竖排招牌 */
  function drawNeonSigns(ctx, b, P, o, seed) {
    var rr = mulberry(seed ^ (b.x * 13));
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var cols = [NEON.magenta, NEON.cyan, NEON.amber, NEON.white];
    var n = Math.max(2, Math.round(b.w / 13));
    for (var i = 0; i < n; i++) {
      var x = b.x - b.w * 0.42 + (i + 0.5) * (b.w * 0.84 / n);
      var yy = b.y0 + b.h * (0.25 + rr() * 0.5);
      var sp = p(x, yy, b.z + b.d * 0.55);
      var col = cols[Math.floor(rr() * cols.length)];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.9;
      var w = Math.max(1.2, P.s * 3), h = Math.max(3, P.s * 9);
      ctx.fillRect(sp.x - w / 2, sp.y, w, h);
    }
    ctx.globalAlpha = 1;
  }

  /* 立体交通：多层高架 + 匝道 */
  function drawInterchange(ctx, b, P, o, seed) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var levels = 3;
    for (var L = 0; L < levels; L++) {
      var y = b.y0 + b.h * (0.25 + L * 0.27);
      var a = p(b.x - b.w * 0.5, y, b.z + (L - 1) * b.d * 0.3);
      var bb = p(b.x + b.w * 0.5, y, b.z + (L - 1) * b.d * 0.3);
      ctx.strokeStyle = L === 0 ? o.deck : o.rail;
      ctx.lineWidth = Math.max(1.2, P.s * 4);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
      /* 桥墩 */
      ctx.strokeStyle = o.tower; ctx.lineWidth = Math.max(0.8, P.s * 2);
      [-0.3, 0, 0.3].forEach(function (fx) {
        var px = b.x + fx * b.w;
        var pt = p(px, b.y0, b.z), pd = p(px, y, b.z);
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pd.x, pd.y); ctx.stroke();
      });
    }
  }

  /* 江湾：江心洲 + 汇流线 */
  function drawConfluence(ctx, b, P, o, seed) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    /* 江心洲（一个小三角） */
    var c1 = p(b.x - b.w * 0.22, b.y0, b.z);
    var c2 = p(b.x + b.w * 0.22, b.y0, b.z);
    var c3 = p(b.x, b.y0, b.z + b.d * 0.45);
    ctx.fillStyle = o.isle;
    ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y);
    ctx.closePath(); ctx.fill();
    /* 汇流线：两股水交汇的亮线 */
    ctx.strokeStyle = o.tower;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1, P.s * 2.4);
    ctx.beginPath();
    ctx.moveTo(b.x - b.w * 0.5, b.y0);
    ctx.lineTo(b.x, b.y0 + b.d * 0.2);
    ctx.lineTo(b.x + b.w * 0.5, b.y0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* 索道：跨江的缆绳 + 吊厢 */
  function drawCableway(ctx, b, P, o, seed) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var yTop = b.y0 + b.h;
    var a = p(b.x - b.w * 0.7, yTop, b.z), bb = p(b.x + b.w * 0.7, yTop - b.h * 0.28, b.z + b.d);
    /* 缆绳（微微下垂） */
    ctx.strokeStyle = o.cable;
    ctx.lineWidth = Math.max(0.9, P.s * 1.8);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    var N = 12;
    for (var i = 0; i <= N; i++) {
      var u = i / N;
      var x = a.x + (bb.x - a.x) * u;
      var y = a.y + (bb.y - a.y) * u + Math.sin(u * Math.PI) * P.s * 6;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    /* 吊厢 */
    ctx.fillStyle = o.lantern;
    var c = p(b.x, yTop - b.h * 0.16, b.z + b.d * 0.5);
    var s = Math.max(2.4, P.s * 8);
    ctx.fillRect(c.x - s / 2, c.y, s, s * 0.78);
    ctx.globalAlpha = 1;
  }


  /* 石阶老街：一段段台阶 + 沿街瓦屋 */
  function drawStairLane(ctx, b, P, o, seed) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var rr = mulberry(seed ^ (b.x * 17 + b.z));
    var steps = 14;
    /* 台地面上的石阶：沿 z 方向一级级往上 */
    ctx.strokeStyle = o.stair;
    ctx.lineWidth = Math.max(0.8, P.s * 1.8);
    ctx.globalAlpha = 0.8;
    for (var i = 0; i < steps; i++) {
      var u = i / steps;
      var x = b.x - b.w * 0.4 + u * b.w * 0.8;
      var y = b.y0 + b.h * u * 0.5;
      var a = p(x - b.w * 0.08, y, b.z + b.d * 0.5);
      var bb = p(x + b.w * 0.08, y, b.z + b.d * 0.5);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* 沿街灯笼 */
    ctx.fillStyle = o.lantern;
    for (var k = 0; k < 6; k++) {
      var u2 = (k + 0.5) / 6;
      var lx = b.x - b.w * 0.4 + u2 * b.w * 0.8;
      var ly = b.y0 + b.h * u2 * 0.5 + b.h * 0.2;
      var lp = p(lx, ly, b.z + b.d * 0.5);
      var s = Math.max(1, P.s * 2.2);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(lp.x - s / 2, lp.y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* 现代天际线：楼顶天线 / 水箱 / 航空障碍灯 */
  function drawSkyline(ctx, b, P, o, seed) {
    var rr = mulberry(seed ^ (b.x * 23 + 5));
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var topY = b.y0 + b.h;
    /* 屋顶水箱 */
    if (rr() < 0.6) {
      var tk = p(b.x + (rr() - 0.5) * b.w * 0.4, topY, b.z);
      ctx.fillStyle = o.railHi;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(tk.x - Math.max(1.5, P.s * 4), tk.y - Math.max(2, P.s * 5),
                   Math.max(3, P.s * 8), Math.max(4, P.s * 10));
      ctx.globalAlpha = 1;
    }
    /* 天线 */
    var a = p(b.x + (rr() - 0.5) * b.w * 0.3, topY, b.z);
    var h = Math.max(5, P.s * 18);
    ctx.strokeStyle = o.railHi;
    ctx.lineWidth = Math.max(0.7, P.s * 1.3);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y - h); ctx.stroke();
    /* 航空障碍灯（红色，闪） */
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(a.x, a.y - h, Math.max(1, P.s * 2.2), 0, Math.PI * 2);
    ctx.fill();
  }


  /* ---------- 穿城轻轨 ----------
   *
   * 重庆的轨道交通是「爬山」的：2 号线从地面钻进李子坝的楼里再钻出来，
   * 3 号线在江边高架上跑，环线干脆挂在半山腰。
   * 画一条高架轨道横穿画面，串起几栋楼，是重庆最有辨识度的动态元素。
   */
  function drawMonorail(ctx, P, C, seed, night) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var rr = mulberry(seed ^ 0x77c1);
    /* 轨道走向：从左后方斜向右前方，穿过 L3-L4 的台面高度 */
    var z0 = -180, z1 = 340;
    var y0 = 96, y1 = 126;
    var x0 = -300, x1 = 320;

    /* 轨道梁 */
    var a = p(x0, y0, z0), b = p(x1, y1, z1);
    ctx.strokeStyle = night ? '#5a6b80' : '#8c99a6';
    ctx.lineWidth = Math.max(1.4, P.s * 4.4);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    /* 轨道面高光 */
    ctx.strokeStyle = night ? '#8fa6bd' : '#b8c4cf';
    ctx.lineWidth = Math.max(0.7, P.s * 1.6);
    ctx.beginPath(); ctx.moveTo(a.x, a.y - 1); ctx.lineTo(b.x, b.y - 1); ctx.stroke();

    /* 桥墩：每 ~70 米一根 */
    for (var t = 0; t <= 10; t++) {
      var u = t / 10;
      var px = x0 + (x1 - x0) * u;
      var py = y0 + (y1 - y0) * u;
      var pz = z0 + (z1 - z0) * u;
      var top = p(px, py, pz);
      var bot = p(px, 0, pz);
      ctx.strokeStyle = night ? '#3d4a5c' : '#9aa5b0';
      ctx.lineWidth = Math.max(0.9, P.s * 2.4);
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    }

    /* 一列亮色列车（3 节），停在轨道中段 */
    var tu = 0.42 + rr() * 0.2;
    for (var cI = 0; cI < 3; cI++) {
      var cu = tu + cI * 0.055;
      if (cu > 0.94) break;
      var cx2 = x0 + (x1 - x0) * cu;
      var cy2 = y0 + (y1 - y0) * cu + 4;
      var cz2 = z0 + (z1 - z0) * cu;
      var cp = p(cx2, cy2, cz2);
      var cw = Math.max(3, P.s * 13);
      var ch = Math.max(2, P.s * 7);
      ctx.fillStyle = night ? '#d8ecff' : '#f2f7fb';
      ctx.fillRect(cp.x - cw / 2, cp.y - ch, cw, ch);
      /* 车窗 */
      ctx.fillStyle = night ? '#2a4a6a' : '#5d7f9c';
      ctx.fillRect(cp.x - cw / 2 + cw * 0.12, cp.y - ch + ch * 0.22, cw * 0.76, ch * 0.34);
    }
  }

  /* ---------- 江上船只 ----------
   * 朝天门曾是千帆竞发的码头，现在仍有货船和渡船往来。
   * 前景江面上放两三条船，把江变成「有东西在动」而不是一块蓝色。 */
  function drawRiverBoats(ctx, P, C, seed, night, nearBack, nearFront, W) {
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var rr = mulberry(seed ^ 0x3b0a);
    var n = 3 + Math.floor(rr() * 3);
    for (var i = 0; i < n; i++) {
      var u = 0.15 + rr() * 0.7;
      var y = nearBack + u * (nearFront - nearBack);
      var z = 400 + u * 900;
      var x = (rr() - 0.5) * 900;
      var cp = p(x, 0, z);
      var w = Math.max(4, P.s * 26 * (0.5 + u));
      var h = Math.max(1.6, P.s * 5);
      /* 船体 */
      ctx.fillStyle = night ? '#1d2a3c' : '#4a5a68';
      ctx.beginPath();
      ctx.moveTo(cp.x - w / 2, cp.y);
      ctx.lineTo(cp.x + w / 2, cp.y);
      ctx.lineTo(cp.x + w / 3, cp.y + h);
      ctx.lineTo(cp.x - w / 3, cp.y + h);
      ctx.closePath(); ctx.fill();
      /* 舱楼 */
      ctx.fillStyle = night ? '#2c3d52' : '#6d7d8a';
      ctx.fillRect(cp.x - w * 0.16, cp.y - h * 1.5, w * 0.32, h * 1.5);
      /* 桅杆与灯 */
      ctx.strokeStyle = night ? '#54657a' : '#8794a0';
      ctx.lineWidth = Math.max(0.6, P.s * 1.1);
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y - h * 1.5); ctx.lineTo(cp.x, cp.y - h * 3.2); ctx.stroke();
      if (night) {
        ctx.fillStyle = '#ffd79a';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y - h * 3.3, Math.max(0.8, P.s * 1.6), 0, Math.PI * 2);
        ctx.fill();
        /* 水面倒影 */
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#ffd79a';
        ctx.fillRect(cp.x - 1, cp.y + h, 2, h * 2.4);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ---------- 路上的车 ----------
   * 盘山路上车流是一串亮点（夜间）—— 立体交通的呼吸感。 */
  function drawTraffic(ctx, P, C, seed, night) {
    if (!night) return;                 /* 白天车太小，看不见，只在夜景加 */
    var p = function (x, y, z) { return project(x, y, z, P.o, P.s); };
    var rr = mulberry(seed ^ 0x9a11);
    var n = 46;
    for (var i = 0; i < n; i++) {
      var L = Math.floor(rr() * 8);
      var u = rr();
      var x = -320 + u * 640;
      var z = 180 - L * 52 + (rr() - 0.5) * 120;
      var y = L * 30 + 2;
      var cp = p(x, y, z);
      var w = Math.max(1.8, P.s * 4.6);
      /* 车头灯（白）/ 尾灯（红） */
      var white = rr() < 0.5;
      /* 先画一圈淡淡的辉光，再画灯芯 —— 远处的车灯在夜景里
         就是一个个带光晕的小点，这才像车流而不是噪点。 */
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = white ? '#fff6d6' : '#ff6048';
      ctx.fillRect(cp.x - w * 1.1, cp.y - w * 1.3, w * 2.2, w * 2.6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = white ? '#fff6d6' : '#ff6048';
      ctx.fillRect(cp.x - w / 2, cp.y - w * 0.8, w, w * 1.6);
    }
  }

  /* ---------- 主渲染 ---------- */
  /* 返回 { landmarks, hits } —— hits 是可点击区域，供命中测试 */
  function render(ctx, W, H, opts) {
    opts = opts || {};
    var seed = opts.seed || 20261114;
    var night = !!opts.night;
    var C = night ? PALETTE.night : PALETTE.day;
    var P = {
      o: { x: W / 2, y: H * (opts.originY !== undefined ? opts.originY : 0.34) },
      s: opts.scale || 0.62
    };
    /* 自动取景：等距投影下 x/z 都会偏移屏幕 x，
     * 固定原点会让城偏向一边、留出大片空白；
     * 固定缩放也会随画布尺寸失衡。
     * 这里按实际内容算包围盒，然后：
     *   1) 缩放 —— 让城填满画布（留 6% 边）
     *   2) 居中 —— 把包围盒中心对到画面中心偏上
     * 只算「城」不算前景江，前景江是留白，不是内容。 */
    /* 单地标特写：opts.focus = 地标 id。
     *
     * 为什么需要：自动取景是按「整座城」的包围盒算的，
     * 所以哪怕只传了一个地标，画面里出现的是全城 —— 地标小得看不清。
     * 这里改成只按这个地标（含它的高度）取景，
     * 让玩家点开地标面板时真的看到那个地标的近景。 */
    if (opts.focus) {
      var fl = null;
      (opts.landmarks || []).forEach(function (m) { if (m.id === opts.focus) fl = m; });
      if (fl) {
        var fb = (fl.scene && fl.scene.base) || {};
        var fw = fb.w || 40, fd = fb.d || 30, fh = fb.h || 50;
        var fx = fb.x || 0, fy = fb.y || 0, fz = fb.z || 0;
        var c0 = project(fx, fy, fz, { x: 0, y: 0 }, P.s);
        /* 顶点和底角，用于算包围盒 */
        var pts = [
          [fx - fw / 2, fy, fz - fd / 2],
          [fx + fw / 2, fy, fz - fd / 2],
          [fx - fw / 2, fy, fz + fd / 2],
          [fx + fw / 2, fy, fz + fd / 2],
          [fx - fw / 2, fy + fh, fz - fd / 2],
          [fx + fw / 2, fy + fh, fz + fd / 2]
        ];
        var bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        pts.forEach(function (q) {
          var r = project(q[0], q[1], q[2], { x: 0, y: 0 }, P.s);
          if (r.x < bx0) bx0 = r.x; if (r.x > bx1) bx1 = r.x;
          if (r.y < by0) by0 = r.y; if (r.y > by1) by1 = r.y;
        });
        /* 留边：地标再小也要占画面主体 */
        var span = Math.max(bx1 - bx0, by1 - by0, 40);
        var zoom = Math.min(W, H) * 0.62 / span;
        if (isFinite(zoom) && zoom > 0) {
          P.s = P.s * zoom;
          var cc = project(fx, fy + fh * 0.5, fz, { x: 0, y: 0 }, P.s);
          P.o.x = W / 2 - cc.x;
          P.o.y = H * 0.56 - cc.y;
        }
      }
    } else if (opts.autoCenter !== false) {
      var ter0 = buildTerrain(seed);
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      function probe(x, y, z) {
        var q = project(x, y, z, { x: 0, y: 0 }, P.s);
        if (q.x < minX) minX = q.x; if (q.x > maxX) maxX = q.x;
        if (q.y < minY) minY = q.y; if (q.y > maxY) maxY = q.y;
      }
      ter0.terraces.forEach(function (t) {
        var hw = 380 - t.inset;
        probe(-hw, t.y - 30, t.zBase + 150); probe(hw, t.y - 30, t.zBase + 150);
        probe(-hw, t.y, t.zBase - 150); probe(hw, t.y, t.zBase - 150);
        probe(-hw, t.y + 130, t.zBase); probe(hw, t.y + 130, t.zBase);
        probe(-hw, t.y + 130, t.zBase - 150); probe(hw, t.y + 130, t.zBase + 150);
      });
      (opts.landmarks || []).forEach(function (lm) {
        var b = (lm.scene && lm.scene.base) || {};
        var w = b.w || 40, d = b.d || 30, h = b.h || 50;
        probe((b.x || 0) - w / 2, b.y || 0, (b.z || 0) - d / 2);
        probe((b.x || 0) + w / 2, (b.y || 0) + h, (b.z || 0) + d / 2);
      });
      if (isFinite(minX)) {
        var bw = maxX - minX, bh = maxY - minY;
        /* 缩放：让城占画布 92%（高度方向给前景江留 8%） */
        var fit = Math.min(W * 0.92 / bw, H * 0.88 / bh);
        if (opts.fitScale !== false && isFinite(fit) && fit > 0) {
          P.s = P.s * fit;
          /* 缩放变了要重算包围盒 */
          minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
          ter0.terraces.forEach(function (t) {
            var hw = 380 - t.inset;
            probe(-hw, t.y - 30, t.zBase + 150); probe(hw, t.y - 30, t.zBase + 150);
            probe(-hw, t.y, t.zBase - 150); probe(hw, t.y, t.zBase - 150);
            probe(-hw, t.y + 130, t.zBase); probe(hw, t.y + 130, t.zBase);
            probe(-hw, t.y + 130, t.zBase - 150); probe(hw, t.y + 130, t.zBase + 150);
          });
          (opts.landmarks || []).forEach(function (lm) {
            var b = (lm.scene && lm.scene.base) || {};
            var w = b.w || 40, d = b.d || 30, h = b.h || 50;
            probe((b.x || 0) - w / 2, b.y || 0, (b.z || 0) - d / 2);
            probe((b.x || 0) + w / 2, (b.y || 0) + h, (b.z || 0) + d / 2);
          });
        }
        var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        P.o.x = W / 2 - cx;
        /* 垂直：城心放在画面 46% 处，上留天空、下留江 */
        P.o.y = H * 0.46 - cy;
      }
    }

    ctx.clearRect(0, 0, W, H);

    /* 命中区（地标可点击） */
    var hits = [];

    /* 天空 */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.sky);
    g.addColorStop(0.55, night ? '#131f33' : '#eef4f8');
    g.addColorStop(1, night ? '#0a1220' : '#d8e4ec');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* 星（夜间，程序化） */
    if (night) {
      var rs = mulberry(seed ^ 0x5f3a);
      for (var s0 = 0; s0 < 120; s0++) {
        var sx = rs() * W, sy = rs() * H * 0.5;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + rs() * 0.6).toFixed(2) + ')';
        ctx.fillRect(sx, sy, 1.4, 1.4);
      }
    }

    /* 远江：城市背后的那一条江（对岸在山脊下） */
    var farBack = project(0, 0, -620, P.o, P.s).y;
    var farFront = project(0, 0, -210, P.o, P.s).y;
    ctx.beginPath();
    ctx.moveTo(0, farBack);
    ctx.lineTo(W, farBack + 6);
    ctx.lineTo(W, farFront + 10);
    ctx.lineTo(0, farFront);
    ctx.closePath();
    var fwg = ctx.createLinearGradient(0, farBack, 0, farFront);
    fwg.addColorStop(0, C.water);
    fwg.addColorStop(1, C.waterHi);
    ctx.fillStyle = fwg;
    ctx.fill();
    /* 对岸灯光倒影 */
    var fw = mulberry(seed ^ 0x3311);
    ctx.globalAlpha = 0.22;
    for (var f0 = 0; f0 < 120; f0++) {
      var fx = fw() * W;
      var fy = farBack + fw() * (farFront - farBack);
      ctx.fillStyle = night ? '#ffd79a' : '#ffffff';
      ctx.fillRect(fx, fy, 1.6, 2.6 + fw() * 4);
    }
    ctx.globalAlpha = 1;

    /* 远景山脊（三层，营造层次） */
    var layers = [
      { d: -980, h: 150, col: C.far, amp: 120, f: 0.004 },
      { d: -760, h: 108, col: C.mid, amp: 96, f: 0.006 },
      { d: -560, h: 72, col: C.near, amp: 74, f: 0.009 }
    ];
    /* 远景山脊 + 雾。
     *
     * 重庆的山是「一层压一层退到天里去」的，全靠大气透视才分得开。
     * 没有雾的话，三层山脊是三个实色块叠在一起，看起来像色卡；
     * 有了雾，远山才真的「远」。
     *
     * 做法：每层山脊先填本色，再叠一层从山脚往上渐隐的雾色
     * （雾越靠山脚越浓，因为水汽从江面往上蒸）。
     */
    var HAZE = night ? '#16233a' : '#dbe6ee';
    layers.forEach(function (L, li) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (var px = 0; px <= W; px += 6) {
        var n = fbm(px * L.f, 0.5, seed + 13, 4);
        var base = project(0, 0, L.d, P.o, P.s).y;
        var py = base - L.h * P.s - n * L.amp * P.s;
        if (px === 0) ctx.lineTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = L.col;
      ctx.fill();

      /* 雾：山脚浓、山顶淡。越远的层雾越重（li 越小越远）。 */
      var fogTop = project(0, 0, L.d, P.o, P.s).y - L.h * P.s - L.amp * P.s;
      var fogBot = project(0, 0, L.d, P.o, P.s).y + 40 * P.s;
      var fg = ctx.createLinearGradient(0, fogTop, 0, fogBot);
      var strength = 0.72 - li * 0.2;      /* 最远 0.72，最近 0.32 */
      fg.addColorStop(0, 'rgba(' + hexToRgb(HAZE) + ',' + (strength * 0.45).toFixed(3) + ')');
      fg.addColorStop(1, 'rgba(' + hexToRgb(HAZE) + ',' + strength.toFixed(3) + ')');
      ctx.fillStyle = fg;
      ctx.fill();
    });

    /* 江：不是铺满整个下半屏，而是一条有边界的江带。
     * 重庆是两江交汇 —— 江在城的前面和两侧。 */
    var riverFront = project(0, 0, 620, P.o, P.s).y;   /* 近岸 */
    var riverBack = project(0, 0, 330, P.o, P.s).y;    /* 远岸 */
    ctx.beginPath();
    ctx.moveTo(0, riverBack);
    ctx.lineTo(W, riverBack + (riverFront - riverBack) * 0.35);
    ctx.lineTo(W, riverFront + 26);
    ctx.lineTo(0, riverFront - 8);
    ctx.closePath();
    var wg = ctx.createLinearGradient(0, riverBack, 0, riverFront);
    wg.addColorStop(0, C.water);
    wg.addColorStop(1, C.waterHi);
    ctx.fillStyle = wg;
    ctx.fill();
    /* 水面反光：横向条纹，越近越粗（透视） */
    var rw = mulberry(seed ^ 0x77aa);
    var nStreak = 90;
    for (var i0 = 0; i0 < nStreak; i0++) {
      var t = rw();
      var ry = riverBack + t * (riverFront - riverBack);
      var rx = rw() * W;
      var len = 16 + t * 130 + rw() * 70;
      ctx.globalAlpha = 0.10 + rw() * 0.22;
      ctx.strokeStyle = night ? '#8fd0ff' : '#ffffff';
      ctx.lineWidth = 1 + t * 2.2;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + len, ry); ctx.stroke();
    }
    /* 岸边高光线 */
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = night ? '#4a6f95' : '#9fb6c6';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, riverBack);
    ctx.lineTo(W, riverBack + (riverFront - riverBack) * 0.35);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* 远岸（江对岸的城市底子） */
    ctx.beginPath();
    ctx.moveTo(0, riverBack + 4);
    ctx.lineTo(W, riverBack + (riverFront - riverBack) * 0.35 + 4);
    ctx.lineTo(W, riverBack - 26);
    ctx.lineTo(0, riverBack - 26);
    ctx.closePath();
    ctx.fillStyle = night ? '#0f1a2b' : '#b9cbd8';
    ctx.fill();

    /* 台地 + 建筑：必须按 z 从远到近统一排序，
     * 否则楼会浮在崖壁前面、或被后画的崖壁盖住。
     * 这是等距渲染最容易出错的地方。 */
    var terrain = buildTerrain(seed);
    var landmarks = opts.landmarks || [];

    /* 收集所有可绘制体，带上各自的 z（用于排序） */
    var items = [];
    terrain.terraces.forEach(function (ter) {
      items.push({ kind: 'terrace', ter: ter, z: ter.zBase + 150 });
      ter.blocks.forEach(function (blk) {
        items.push({ kind: 'block', blk: blk, ter: ter, z: blk.z });
      });
    });
    landmarks.forEach(function (lm) {
      var sc = lm.scene || {};
      var base = sc.base || {};
      items.push({ kind: 'lm', lm: lm, z: base.z || 0, y: base.y || 0 });
    });
    /* 画家算法：z 大的（远）先画 */
    items.sort(function (a, b) { return b.z - a.z; });

    var windows = 0;
    var cliffs = 0;
    items.forEach(function (it) {
      if (it.kind === 'terrace') {
        drawCliff(ctx, it.ter, P, C, seed);
        cliffs++;
        drawTerraceTop(ctx, it.ter, P, C, seed);
        return;
      }
      if (it.kind === 'block') {
        var blk = it.blk;
        var ter = it.ter;
        var b = makeBuilding({
          x: blk.x, z: blk.z,
          w: blk.w * (blk.shrink || 1), d: blk.d * (blk.shrink || 1),
          h: blk.h
        }, seed, {});
        b.y0 = ter.y;                 /* 楼立在台地上 */
        var geo = drawBox(ctx, b, P, {
          roof: shade(C.roof, blk.hue, -0.12),
          right: shade(C.glassDark, blk.hue, -0.02),
          left: shade(C.concrete, blk.hue, 0.04),
          ink: C.ink
        }, seed);
        windows += drawWindows(ctx, b, geo, P, { windowLit: C.windowLit }, seed);
        return;
      }
      /* 地标 */
      var lm = it.lm;
      var sc = lm.scene || {};
      var base = sc.base || {};
      var lb = makeBuilding({
        id: lm.id,
        x: base.x || 0, z: base.z || 0,
        w: base.w || 40, d: base.d || 30, h: base.h || 50
      }, seed, { neon: sc.neon });
      lb.floors = sc.floors || lb.floors;
      lb.floorH = lb.h / lb.floors;
      lb.y0 = base.y || 0;

      var lp = {
        roof: shade(C.roof, 0.4, -0.1),
        right: facadeColor(lb.facade, C, 0.0),
        left: facadeColor(lb.facade, C, -0.14),
        ink: C.ink
      };
      /* 地标专用绘制：按 tag 分类型画。
       * tag 来自 landmarks.js（真实地标数据的分类标签）。 */
      var ltag = lm.tag || '';
      /* 补充材质色：不同类型要用不同线色 */
      var lo = {
        deck: C.ink, tower: C.ink, cable: C.ink,
        rail: C.ink, railHi: C.ink, train: '#f4f8ff',
        leg: C.ink, lantern: '#ff8a3d', isle: C.grass, stair: C.ink
      };
      if (!night) {
        lo.deck = C.concrete; lo.tower = C.steel; lo.cable = C.ink;
        lo.rail = C.steel; lo.railHi = C.rock; lo.train = '#ffffff';
        lo.leg = C.wood; lo.lantern = '#e05a1e'; lo.isle = C.grass; lo.stair = C.rockLight;
      }

      if (ltag === 'river-bridge') {
        /* 桥：先画桥本身，再画桥墩塔（不画成方盒子） */
        var isSusp = lm.id === 'egongyan';
        if (isSusp) drawSuspensionBridge(ctx, lb, P, lo, seed);
        else drawCableBridge(ctx, lb, P, lo, seed);
        var bgeo = drawBox(ctx, lb, P, { roof: 'transparent', right: 'transparent', left: 'transparent', ink: C.ink }, seed);
        /* 命中区域用桥的中心 */
        var bcx = (bgeo.t000.x + bgeo.t101.x) / 2;
        var bcy = (bgeo.t000.y + bgeo.t101.y) / 2;
        hits.push({ id: lm.id, x: bcx, y: bcy, r: Math.max(18, P.s * 42), lm: lm });
        return;
      }
      if (ltag === 'rail-through-building') {
        var geo2 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo2, P, { windowLit: C.windowLit }, seed);
        drawRailThrough(ctx, lb, P, lo, geo2, seed);
        drawNeon(ctx, lb, geo2, P, lp);
        var hx2 = (geo2.t000.x + geo2.t101.x) / 2;
        var hy2 = (geo2.t000.y + geo2.t101.y) / 2;
        hits.push({ id: lm.id, x: hx2, y: hy2, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'stacked-cliffs') {
        var geo3 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo3, P, { windowLit: C.windowLit }, seed);
        drawStiltStack(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo3, P, lp);
        var hx3 = (geo3.t000.x + geo3.t101.x) / 2;
        var hy3 = (geo3.t000.y + geo3.t101.y) / 2;
        hits.push({ id: lm.id, x: hx3, y: hy3, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'hilltop-view') {
        var geo4 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo4, P, { windowLit: C.windowLit }, seed);
        drawViewDeck(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo4, P, lp);
        var hx4 = (geo4.t000.x + geo4.t101.x) / 2;
        var hy4 = (geo4.t000.y + geo4.t101.y) / 2;
        hits.push({ id: lm.id, x: hx4, y: hy4, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'old-town') {
        var geo5 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo5, P, { windowLit: C.windowLit }, seed);
        drawOldTown(ctx, lb, P, lo, geo5, seed);
        drawNeon(ctx, lb, geo5, P, lp);
        var hx5 = (geo5.t000.x + geo5.t101.x) / 2;
        var hy5 = (geo5.t000.y + geo5.t101.y) / 2;
        hits.push({ id: lm.id, x: hx5, y: hy5, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'night-neon') {
        var geo6 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo6, P, { windowLit: C.windowLit }, seed);
        drawNeonSigns(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo6, P, lp);
        var hx6 = (geo6.t000.x + geo6.t101.x) / 2;
        var hy6 = (geo6.t000.y + geo6.t101.y) / 2;
        hits.push({ id: lm.id, x: hx6, y: hy6, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'multi-level-road') {
        /* 索道是特殊的多层交通：拉缆绳而不是画匝道 */
        if (lm.id === 'cableway') {
          drawCableway(ctx, lb, P, lo, seed);
          var cwp = project(lb.x, lb.y0 + lb.h * 0.4, lb.z, P.o, P.s);
          hits.push({ id: lm.id, x: cwp.x, y: cwp.y, r: Math.max(18, P.s * 42), lm: lm });
          return;
        }
        var geo7 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo7, P, { windowLit: C.windowLit }, seed);
        drawInterchange(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo7, P, lp);
        var hx7 = (geo7.t000.x + geo7.t101.x) / 2;
        var hy7 = (geo7.t000.y + geo7.t101.y) / 2;
        hits.push({ id: lm.id, x: hx7, y: hy7, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'footpath-stairs') {
        var geo9 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo9, P, { windowLit: C.windowLit }, seed);
        drawStairLane(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo9, P, lp);
        var hx9 = (geo9.t000.x + geo9.t101.x) / 2;
        var hy9 = (geo9.t000.y + geo9.t101.y) / 2;
        hits.push({ id: lm.id, x: hx9, y: hy9, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'modern-skyline') {
        var geo10 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo10, P, { windowLit: C.windowLit }, seed);
        drawSkyline(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo10, P, lp);
        var hx10 = (geo10.t000.x + geo10.t101.x) / 2;
        var hy10 = (geo10.t000.y + geo10.t101.y) / 2;
        hits.push({ id: lm.id, x: hx10, y: hy10, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }
      if (ltag === 'river-confluence') {
        var geo8 = drawBox(ctx, lb, P, lp, seed);
        windows += drawWindows(ctx, lb, geo8, P, { windowLit: C.windowLit }, seed);
        drawConfluence(ctx, lb, P, lo, seed);
        drawNeon(ctx, lb, geo8, P, lp);
        var hx8 = (geo8.t000.x + geo8.t101.x) / 2;
        var hy8 = (geo8.t000.y + geo8.t101.y) / 2;
        hits.push({ id: lm.id, x: hx8, y: hy8, r: Math.max(16, P.s * 36), lm: lm });
        return;
      }

      if (lb.stilt) drawStilts(ctx, lb, P, lp);
      var geo = drawBox(ctx, lb, P, lp, seed);
      windows += drawWindows(ctx, lb, geo, P, { windowLit: C.windowLit }, seed);
      drawNeon(ctx, lb, geo, P, lp);

      /* 命中区域 */
      var cx = (geo.t000.x + geo.t101.x) / 2;
      var cy = (geo.t000.y + geo.t101.y) / 2;
      hits.push({ id: lm.id, x: cx, y: cy, r: Math.max(14, P.s * 34), lm: lm });
    });

    /* 穿城轻轨 + 路上的车：属于「城」这一层，画在地标之后、
     * 前景江之前。轻轨是重庆最有辨识度的动态元素。 */
    drawMonorail(ctx, P, C, seed, night);
    drawTraffic(ctx, P, C, seed, night);

    /* 近江：画在城的前面。
     * 重庆是两江夹一山半岛 —— 前景这条江是「8D」的关键读法：
     * 你站在江这边看城，城从水面往上长，一直叠到山顶。 */
    var nearFront = project(0, 0, 1560, P.o, P.s).y;   /* 远超画布底：江一直延伸到画面外 */
    var nearBack = project(0, 0, 330, P.o, P.s).y;
    ctx.beginPath();
    ctx.moveTo(0, nearBack);
    ctx.lineTo(W, nearBack + (nearFront - nearBack) * 0.28);
    ctx.lineTo(W, nearFront + 40);
    ctx.lineTo(0, nearFront);
    ctx.closePath();
    var nwg = ctx.createLinearGradient(0, nearBack, 0, nearFront);
    nwg.addColorStop(0, C.water);
    nwg.addColorStop(1, C.waterHi);
    ctx.fillStyle = nwg;
    ctx.fill();
    /* 江上船只：画在江面之上 */
    drawRiverBoats(ctx, P, C, seed, night, nearBack, nearFront, W);

    /* 水面反光条纹（近处更粗 = 透视） */
    var nw = mulberry(seed ^ 0x77aa);
    for (var n0 = 0; n0 < 130; n0++) {
      var t = nw();
      var ny = nearBack + t * (nearFront - nearBack);
      var nx = nw() * W;
      var len = 18 + t * 150 + nw() * 90;
      ctx.globalAlpha = 0.09 + nw() * 0.26;
      ctx.strokeStyle = night ? '#8fd0ff' : '#ffffff';
      ctx.lineWidth = 1 + t * 2.6;
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + len, ny); ctx.stroke();
    }
    /* 江面灯光倒影（城市霓虹落在水里） */
    for (var n1 = 0; n1 < 90; n1++) {
      var nx2 = nw() * W;
      var ny2 = nearBack + nw() * (nearFront - nearBack) * 0.7;
      ctx.globalAlpha = 0.10 + nw() * 0.2;
      ctx.fillStyle = nw() > 0.5 ? '#ffd79a' : '#4fd6ff';
      ctx.fillRect(nx2, ny2, 2 + nw() * 3, 2 + nw() * 8);
    }
    ctx.globalAlpha = 1;
    /* 近岸线 */
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = night ? '#3f6288' : '#9fb6c6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, nearBack);
    ctx.lineTo(W, nearBack + (nearFront - nearBack) * 0.28);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* 地标名（只标重点地标，避免糊成一片） */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    hits.forEach(function (h) {
      var lm = h.lm;
      var ne = NEON[(lm.scene && lm.scene.neon) || 'none'];
      ctx.font = '600 ' + (night ? 12 : 11) + 'px system-ui, -apple-system, sans-serif';
      var label = lm.en;
      var tw = ctx.measureText(label).width;
      var bx = h.x - tw / 2 - 6, by = h.y - 11;
      ctx.fillStyle = night ? 'rgba(6,12,22,0.78)' : 'rgba(255,255,255,0.86)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, tw + 12, 20, 5); else ctx.rect(bx, by, tw + 12, 20);
      ctx.fill();
      ctx.strokeStyle = ne || (night ? 'rgba(150,190,225,0.5)' : 'rgba(0,0,0,0.14)');
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = ne || C.ink;
      ctx.fillText(label, h.x, h.y - 1);
    });

    return { hits: hits, windows: windows, terrain: terrain };
  }

/* hex → "r,g,b"（给 rgba() 用） */
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }

  /* ---------- 材质色 ---------- */
  function facadeColor(facade, C, shift) {
    switch (facade) {
      case 'stilted-wood': return shade(C.wood, 0.3, shift);
      case 'concrete-glass': return shade(C.concrete, 0.2, shift);
      case 'modern-tower': return shade(C.glassDark, 0.25, shift);
      case 'old-wood': return shade(C.wood, 0.5, shift);
      case 'brick': return shade(C.brick, 0.3, shift);
      case 'glass-curtain': return shade(C.glass, 0.35, shift);
      default: return shade(C.concrete, 0, shift);
    }
  }
  /* hsl 微调：让同类楼有差异（程序化「材质变化」） */
  function shade(hex, hueJit, lightShift) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    h = (h + (hueJit - 0.5) * 0.08 + 1) % 1;
    l = Math.max(0, Math.min(1, l + lightShift));
    s = Math.max(0, Math.min(1, s));
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
    function hx(v) { return ('0' + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2); }
    return '#' + hx(r) + hx(g) + hx(b);
  }

  root.CQCITY = {
    render: render,
    project: project,
    mulberry: mulberry,
    fbm: fbm,
    PALETTE: PALETTE,
    NEON: NEON,
    buildTerrain: buildTerrain,
    makeBuilding: makeBuilding
  };
})(typeof window !== 'undefined' ? window : globalThis);
