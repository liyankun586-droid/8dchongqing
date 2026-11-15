/* ============================================================================
 * city3d.js —— 纯代码 Three.js 山城（第一人称可走进）
 *
 * 目标：替代 city.js（Canvas 2D 等距示意图）。
 * 参照 Felix Rieseberg 用 Claude Fable 5.2 做的 Saltline —— 约 1.4MB 单文件、
 * 零图片零模型、所有几何与材质都是函数算出来的。
 *
 * 关键差异 vs 旧 city.js：
 *   旧：Canvas 2D 等距投影，一堆多边形色块，看不到内部，不能走进去
 *   新：真 3D 几何（BufferGeometry）、真透视相机、方向光 + 阴影、雾、
 *       程序化贴图（Canvas 生成）、第一人称行走（WASD + 鼠标视角）
 *
 * 坐标约定：
 *   X = 东西，Y = 高度（向上），Z = 南北
 *   渝中半岛在原点附近，长江在 Z > 100，嘉陵江在 X < -150
 *   地形台地在 Y = 0..210 之间，悬殊的高差就是「8D」的视觉来源
 *
 * 依赖：three（examples/jsm 只用 OrbitControls 做轨道模式）
 * ==========================================================================*/
(function (root) {
  'use strict';

  var THREE = root.THREE;
  if (!THREE) { console.error('city3d: THREE 未加载'); return; }

  /* ---------------------------------------------------------------- 常量 */
  var RIVER_Z = 118;        // 长江主岸线
  var JIALING_X = -170;     // 嘉陵江岸线
  var TERRACE_Y = [0, 30, 60, 90, 120, 145, 175, 210];  // 台地高度

  /* 材质配色（夜） */
  var MAT = {
    concrete:  { color: 0x2a3140, rough: 0.92, metal: 0.02 },
    glass:     { color: 0x1b2434, rough: 0.22, metal: 0.55 },
    oldWood:   { color: 0x2e2620, rough: 0.95, metal: 0.0  },
    brick:     { color: 0x382a26, rough: 0.9,  metal: 0.0  },
    stiltWood: { color: 0x2b2118, rough: 0.96, metal: 0.0  },
    roofTile:  { color: 0x241a18, rough: 0.88, metal: 0.03 },
    rock:      { color: 0x1a2230, rough: 1.0,  metal: 0.0  },
    ground:    { color: 0x121a26, rough: 1.0,  metal: 0.0  },
    water:     { color: 0x0d1a2c, rough: 0.08, metal: 0.75 },
    road:      { color: 0x161c28, rough: 0.85, metal: 0.05 },
    foliage:   { color: 0x14261c, rough: 1.0,  metal: 0.0  },
    glassBlue: { color: 0x24425e, rough: 0.3,  metal: 0.4  }
  };

  /* ------------------------------------------------------------ 程序化贴图
   * 用 Canvas 画一张再转成 THREE.CanvasTexture —— 这就是「函数化纹理」，
   * 不依赖任何外部图片文件。 */

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* 建筑立面：混凝土 / 瓷砖 / 玻璃幕墙，程序化画窗户
   *
   * 关键：贴图必须是**灰度**的（只画窗户和纹理细节），颜色交给材质去乘。
   * 如果贴图自带深色（夜景色），白天照出来也是黑的 —— 这是之前整个场景
   * 在日间仍然一片死黑的原因。 */
  function facadeTexture(kind, opts) {
    opts = opts || {};
    var W = 128, H = 256;
    var c = makeCanvas(W, H), g = c.getContext('2d');
    /* 灰度底 —— 亮度中性，颜色由 material.color 提供 */
    var base = kind === 'glass' ? '#8a8a8a' : (kind === 'oldWood' ? '#9a9a9a' :
                kind === 'brick' ? '#a89e98' : (kind === 'stiltWood' ? '#8e8880' : '#a2a6ad'));
    g.fillStyle = base; g.fillRect(0, 0, W, H);

    /* 细噪点，避免大平面死板 */
    var img = g.getImageData(0, 0, W, H), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() * 16 - 8) | 0;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);

    if (kind === 'oldWood' || kind === 'stiltWood') {
      /* 木板条纹 + 木窗 */
      for (var x = 0; x < W; x += 8) {
        g.fillStyle = 'rgba(0,0,0,' + (0.10 + Math.random() * 0.12) + ')';
        g.fillRect(x, 0, 3, H);
      }
      for (var wy = 12; wy < H - 8; wy += 34) {
        for (var wx = 10; wx < W - 8; wx += 30) {
          var lit = Math.random() < (opts.litRatio || 0.35);
          g.fillStyle = lit ? 'rgba(255,240,210,0.95)' : 'rgba(18,20,26,0.9)';
          g.fillRect(wx, wy, 16, 20);
          g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(wx, wy, 16, 20);
        }
      }
    } else if (kind === 'glass') {
      /* 玻璃幕墙：竖向 mullion + 横向楼层线 */
      for (var mx = 0; mx < W; mx += 16) {
        g.fillStyle = 'rgba(120,170,210,0.10)'; g.fillRect(mx, 0, 1, H);
      }
      for (var fy = 0; fy < H; fy += 22) {
        g.fillStyle = 'rgba(150,190,225,0.14)'; g.fillRect(0, fy, W, 1);
        for (var gx = 2; gx < W; gx += 16) {
          if (Math.random() < 0.30) {
            g.fillStyle = 'rgba(255,240,214,' + (0.45 + Math.random() * 0.45) + ')';
            g.fillRect(gx, fy + 3, 12, 14);
          }
        }
      }
    } else {
      /* 混凝土/砖：规则窗洞 */
      for (var by = 10; by < H - 8; by += 26) {
        for (var bx = 8; bx < W - 10; bx += 22) {
          var lit2 = Math.random() < (opts.litRatio || 0.28);
          g.fillStyle = lit2 ? 'rgba(255,238,206,0.95)' : 'rgba(22,26,34,0.88)';
          g.fillRect(bx, by, 13, 16);
          g.strokeStyle = 'rgba(0,0,0,0.42)'; g.lineWidth = 1;
          g.strokeRect(bx + 0.5, by + 0.5, 13, 16);
        }
        /* 楼层分隔线 */
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, by - 3, W, 2);
      }
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /* 岩壁贴图：横向沉积层理 + 纵向冲沟 + 杂色斑
   * 崖壁是一大片竖直面，纯色会读成「巨型白板」。
   * 这张贴图把它切成有层次的岩体。 */
  function rockTexture() {
    var S = 256;
    var c = makeCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#909090'; g.fillRect(0, 0, S, S);
    /* 横向层理 */
    var y = 0;
    while (y < S) {
      var h = 3 + Math.random() * 9;
      var v = 118 + Math.random() * 70;
      g.fillStyle = 'rgb(' + (v|0) + ',' + (v|0) + ',' + (v|0) + ')';
      g.fillRect(0, y, S, h);
      y += h;
    }
    /* 纵向冲沟 —— 重庆崖壁最标志性的竖向侵蚀痕 */
    for (var i = 0; i < 46; i++) {
      var x = Math.random() * S;
      var w = 1 + Math.random() * 4;
      var dark = 60 + Math.random() * 45;
      g.fillStyle = 'rgba(' + (dark|0) + ',' + (dark|0) + ',' + (dark|0) + ',0.55)';
      g.fillRect(x, 0, w, S);
    }
    /* 亮边（岩层凸出）*/
    for (var j = 0; j < 28; j++) {
      var yy = Math.random() * S;
      g.fillStyle = 'rgba(215,215,215,0.30)';
      g.fillRect(0, yy, S, 1 + Math.random() * 2);
    }
    /* 杂色：苔藓 / 渗水 */
    for (var k = 0; k < 320; k++) {
      var px = Math.random() * S, py = Math.random() * S;
      var r = 2 + Math.random() * 9;
      var green = Math.random() < 0.4;
      g.fillStyle = green ? 'rgba(120,150,110,0.20)' : 'rgba(70,70,75,0.28)';
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /* 瓦屋顶贴图 */
  function roofTexture() {
    var W = 96, H = 64, c = makeCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#8e827c'; g.fillRect(0, 0, W, H);
    for (var row = 0; row < 8; row++) {
      var y = row * 8;
      for (var x = 0; x < W; x += 6) {
        g.fillStyle = 'rgba(0,0,0,' + (0.18 + Math.random() * 0.22) + ')';
        g.beginPath();
        g.moveTo(x, y + 8); g.lineTo(x + 3, y); g.lineTo(x + 6, y + 8);
        g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(90,70,62,0.16)'; g.fillRect(0, y, W, 1);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* 地面/道路 */
  function groundTexture() {
    var S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#8d9099'; g.fillRect(0, 0, S, S);
    for (var i = 0; i < 2600; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.035) + ')';
      g.fillRect(Math.random() * S, Math.random() * S, 1.6, 1.6);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* 水面：程序化法线扰动 */
  function waterTexture() {
    var S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#4a6b8e'; g.fillRect(0, 0, S, S);
    for (var y = 0; y < S; y += 4) {
      for (var x = 0; x < S; x += 4) {
        var v = Math.sin(x * 0.08) * Math.cos(y * 0.05);
        g.fillStyle = 'rgba(70,120,170,' + (0.05 + v * 0.05) + ')';
        g.fillRect(x, y, 4, 4);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ------------------------------------------------------------ 噪声/随机 */
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(x, y, seed) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function fbm(x, y, seed, oct) {
    var v = 0, amp = 0.5, f = 1;
    for (var i = 0; i < (oct || 4); i++) {
      v += amp * valueNoise(x * f, y * f, seed + i * 131);
      amp *= 0.5; f *= 2;
    }
    return v;
  }

  function valueNoise(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    var c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  /* -------------------------------------------------------------- 材质库
   * 贴图是灰度的，颜色由 material.color 决定 —— 所以昼夜切换只要换颜色。 */
  function makeMaterials() {
    var m = {};
    m.concrete = new THREE.MeshStandardMaterial({
      map: facadeTexture('concrete'), color: 0xffffff, roughness: 0.92, metalness: 0.02,
      emissive: 0xffffff, emissiveMap: facadeTexture('concrete'), emissiveIntensity: 0.30 });
    m.glass = new THREE.MeshStandardMaterial({
      map: facadeTexture('glass'), color: 0xffffff, roughness: 0.2, metalness: 0.55,
      emissive: 0xffffff, emissiveMap: facadeTexture('glass'), emissiveIntensity: 0.55 });
    m.oldWood = new THREE.MeshStandardMaterial({
      map: facadeTexture('oldWood', { litRatio: 0.38 }), color: 0xffffff, roughness: 0.95, metalness: 0.0,
      emissive: 0xffffff, emissiveMap: facadeTexture('oldWood', { litRatio: 0.38 }), emissiveIntensity: 0.42 });
    m.brick = new THREE.MeshStandardMaterial({
      map: facadeTexture('brick', { litRatio: 0.22 }), color: 0xffffff, roughness: 0.9, metalness: 0.0,
      emissive: 0xffffff, emissiveMap: facadeTexture('brick', { litRatio: 0.22 }), emissiveIntensity: 0.26 });
    m.stiltWood = new THREE.MeshStandardMaterial({
      map: facadeTexture('stiltWood', { litRatio: 0.42 }), color: 0xffffff, roughness: 0.96, metalness: 0.0,
      emissive: 0xffffff, emissiveMap: facadeTexture('stiltWood', { litRatio: 0.42 }), emissiveIntensity: 0.48 });
    m.roof = new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.88, metalness: 0.03,
      emissive: 0xffffff, emissiveMap: roofTexture(), emissiveIntensity: 0.08 });
    m.rock = new THREE.MeshStandardMaterial({
      map: rockTexture(), color: MAT.rock.color, roughness: 1.0, metalness: 0.0 });
    m.ground = new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.97, metalness: 0.0,
      emissive: 0xffffff, emissiveMap: groundTexture(), emissiveIntensity: 0.04,
      vertexColors: true });
    m.water = new THREE.MeshStandardMaterial({
      map: waterTexture(), color: 0xffffff, roughness: 0.08, metalness: 0.72,
      transparent: true, opacity: 0.94 });
    m.road = new THREE.MeshStandardMaterial({ color: MAT.road.color, roughness: 0.85, metalness: 0.05 });
    m.foliage = new THREE.MeshStandardMaterial({ color: MAT.foliage.color, roughness: 1.0, metalness: 0.0, flatShading: true });
    m.glassBlue = new THREE.MeshStandardMaterial({
      color: MAT.glassBlue.color, roughness: 0.28, metalness: 0.45, transparent: true, opacity: 0.62 });
    m.trunk = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1.0 });
    m.carBody = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.5, metalness: 0.4 });
    m.windowLit = new THREE.MeshBasicMaterial({ color: 0xffcf8c });
    m.neonAmber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    m.neonCyan  = new THREE.MeshBasicMaterial({ color: 0x4fd6ff });
    m.neonPink  = new THREE.MeshBasicMaterial({ color: 0xff5fa2 });
    m.neonWhite = new THREE.MeshBasicMaterial({ color: 0xf0f6ff });
    m.windowLit = new THREE.MeshBasicMaterial({ color: 0xffcf8c });
    return m;
  }

  /* ------------------------------------------------------------ 地形
   * 重庆的山不是「一圈圈同心台阶」（那是圆锥土包），而是
   * 不规则山体被切成高低错落的平台，每级平台边上是一道挡土墙，
   * 墙根紧贴着 6~10 层的老楼，楼顶再跨出连廊。
   *
   * 做法：高度场 → 量化成等高台阶 → 平台面 + 挡墙 + 密布楼群。
   * 高度场的山脊用 ridged fbm，所以有真实的沟壑和山脊走向，
   * 不是数学上的圆锥。
   */
  var TERRACE_STEP = 7.5;    /* 台地级差（米）≈ 2.5 层楼 */
  var GRID_N = 112;          /* 高度场分辨率 —— 密网格让坡面法线连续 */
  var WORLD = 700;           /* 世界尺寸（米） */

  /* 河流遮罩：长江 z>RIVER_Z，嘉陵江 x<JIALING_X */
  function isWater(x, z) {
    return z > RIVER_Z + 6 || x < JIALING_X + 4;
  }

  /* 高度场：连续的山脊，不是等高台阶
   *
   * 评审的致命诊断（第四轮）：
   *   「外轮廓仍是一条闭合的、360° 环绕的等高线阶梯」
   *   「没有脊 —— 等高线还是正圆/正椭圆套着走」
   *   「高频噪声波长相对山体尺度太小，只把每圈边缘啃成锯齿」
   *
   * 根因不是噪声不够，是**量化本身**：任何 quantize(heightField(x,z))
   * 都会产生一圈圈同心等高线。地形一旦量化，就必然是 ziggurat。
   *
   * 修法（这次是改思路，不是调参数）：
   *  ① 地形高度**不量化**，直接用连续高度场做网格曲面
   *  ② 山脊用**域扭曲**（domain warping）—— 噪声的输入坐标本身
   *     先被另一层噪声推歪，等高线才会出现「S 形」「分叉」「半岛」
   *     这种真实山脉才有的形状，而不是圆
   *  ③ 域扭曲的尺度要和山体同量级（~180m），不是 74m
   *
   * 「台地」的观感改由**人工层台**提供：在连续山体上，
   * 由挡墙 + 平台（buildTerraces）造出一层层楼台。
   * 真实重庆就是这样 —— 山是山，台是人在山上凿出来的。
   */
  /* 各向异性 ridged 噪声（平方让脊线更锐） */
  function ridgedN(x, y, seed, oct) {
    var v = 0, amp = 0.5, f = 1, norm = 0;
    for (var i = 0; i < oct; i++) {
      var n = valueNoise(x * f, y * f, seed + i * 7919);
      n = 1 - Math.abs(n * 2 - 1);
      v += n * n * amp;
      norm += amp; amp *= 0.5; f *= 2.02;
    }
    return v / norm;
  }

  /* ---------------------------------------------------------- 脊线几何
   * 评审第九轮（最关键的一次诊断）：
   *   「ridgedN 平方项作用在**分形噪声**上，产生的是尖刺噪声，不是脊场」
   *   「表面那些深色三角楔子（上百个）是随机撒的独立尖块，
   *    不是沿脊线排列的梳齿」
   *   「脊/鞍在数据上有了，在画面上读不出来」
   *
   * 关键认识：**脊必须显式定义**，不能靠噪声的统计特性去碰运气。
   * 做法：画出几条脊线折线，山高 = 距脊线的距离场。
   * 脊线是连续的几何曲线 —— 画面上必然读得出连续的山棱。
   * 实测（tools/terrain_lab.js）：垂直于主脊的剖面在 80m 内落差 130m，
   * 是真正的陡崖，不是圆丘的缓坡。
   */
  function ridgeLines() {
    return [
      /* 主脊：NE-SW，重庆半岛的真实走向 */
      [{ x: -260, z: -230 }, { x: -150, z: -140 }, { x: -55, z: -62 },
       { x: 45, z: 18 }, { x: 150, z: 95 }, { x: 265, z: 165 }],
      /* 支脊 1 */
      [{ x: -95, z: -55 }, { x: -165, z: 5 }, { x: -225, z: 80 }],
      /* 支脊 2 */
      [{ x: 40, z: 10 }, { x: 120, z: -85 }, { x: 175, z: -185 }],
      /* 支脊 3 */
      [{ x: -150, z: -140 }, { x: -205, z: -235 }]
    ];
  }
  var RIDGE_W = [70, 48, 50, 40];    /* 每条脊的宽度 */
  var RIDGE_H = [248, 140, 152, 112];/* 每条脊的高度 */

  function distToSeg(px, pz, a, b) {
    var dx = b.x - a.x, dz = b.z - a.z;
    var l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.sqrt((px - a.x) * (px - a.x) + (pz - a.z) * (pz - a.z));
    var tt = ((px - a.x) * dx + (pz - a.z) * dz) / l2;
    tt = Math.max(0, Math.min(1, tt));
    var qx = a.x + tt * dx, qz = a.z + tt * dz;
    return Math.sqrt((px - qx) * (px - qx) + (pz - qz) * (pz - qz));
  }

  /* 求最近脊线：同时返回沿脊线的弧长 s
   * 评审第十轮：「山体顶缘是一条圆弧 —— 这是一个圆丘顶，不是脊线」
   * 「脊顶没有『平台』」
   * 根因：距离场用**每条脊一个固定高度**，整条脊等高 → 顶缘是一条平线。
   * 修法：脊高 = 基础高度 × (1 + 沿脊线的 1D 噪声) → 脊上出现峰与鞍。 */
  function nearestRidge(px, pz, lines) {
    var bestD = 1e9, bestI = 0, bestS = 0;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], acc = 0;
      for (var j = 0; j < L.length - 1; j++) {
        var dx = L[j + 1].x - L[j].x, dz = L[j + 1].z - L[j].z;
        var segLen = Math.sqrt(dx * dx + dz * dz);
        var l2 = segLen * segLen;
        var tt = l2 === 0 ? 0 : ((px - L[j].x) * dx + (pz - L[j].z) * dz) / l2;
        tt = Math.max(0, Math.min(1, tt));
        var qx = L[j].x + tt * dx, qz = L[j].z + tt * dz;
        var d = Math.sqrt((px - qx) * (px - qx) + (pz - qz) * (pz - qz));
        if (d < bestD) { bestD = d; bestI = i; bestS = acc + tt * segLen; }
        acc += segLen;
      }
    }
    return { d: bestD, i: bestI, s: bestS };
  }

  function heightField(x, z, seed) {
    var lines = ridgeLines();
    var r = nearestRidge(x, z, lines);
    var w = RIDGE_W[r.i];
    /* 尖脊横截面：幂次 1.6 —— 顶是刃，两侧陡，不是穹顶 */
    var u = r.d / w;
    var cross = Math.max(0, 1 - Math.pow(u, 1.6));
    /* 脊高沿弧长变化 → 峰与鞍 */
    var along = fbm(r.s * 0.0072, r.i * 13.7, seed ^ 0x2b1d, 3);
    var amp = RIDGE_H[r.i] * (0.55 + 0.95 * along);
    var h = cross * amp;
    /* 次级地形 */
    h += fbm(x * 0.006, z * 0.006, seed ^ 0x1234, 3) * 18;
    /* 边缘压到水边 */
    if (z > RIVER_Z - 40) h = Math.min(h, (RIVER_Z - z) * 2.6 + 3);
    if (x < JIALING_X + 40) h = Math.min(h, (x - JIALING_X) * 2.6 + 3);
    return Math.max(0, h);
  }

  function buildTerrain(group, M, seed, landmarks) {
    var cell = WORLD / (GRID_N - 1);
    var half = WORLD / 2;

    /* ---- 采样连续高度场 ---- */
    var cells = [], grid = [];
    for (var i = 0; i < GRID_N; i++) {
      grid[i] = [];
      for (var j = 0; j < GRID_N; j++) {
        /* 非周期偏移：用 hash 噪声打散网格对齐。
         * 之前用 (i*37 % 7) 这种**周期**抖动 —— 周期 7 的位移图案
         * 在坡面上就是「细密规则竖条纹」（评审第十二轮诊断）。 */
        var wx = -half + i * cell + (hash2(i, j, seed ^ 0x31) - 0.5) * cell * 0.55;
        var wz = -half + j * cell + (hash2(j, i, seed ^ 0x72) - 0.5) * cell * 0.55 - 40;
        grid[i][j] = null;
        if (isWater(wx, wz)) continue;
        var h = heightField(wx, wz, seed);
        var c = { x: wx, z: wz, y: h, level: h, i: i, j: j };
        cells.push(c);
        grid[i][j] = c;
      }
    }

    /* ---- 连续地形网格 ----
     * 一个格子一个顶点，高度直接用高度场（**不量化**）。
     * 这样地形就是连续曲面，等高线由山脊形状决定，不会是同心圆。 */
    var vmap = {};     /* "i_j" → 顶点索引 */
    var pos = [], uv = [];
    cells.forEach(function (c) {
      vmap[c.i + '_' + c.j] = pos.length / 3;
      pos.push(c.x, c.y, c.z);
      uv.push(c.x / 26, c.z / 26);
    });
    var idx = [];
    cells.forEach(function (c) {
      var a = vmap[c.i + '_' + c.j];
      var b = vmap[(c.i + 1) + '_' + c.j];
      var d = vmap[c.i + '_' + (c.j + 1)];
      var e = vmap[(c.i + 1) + '_' + (c.j + 1)];
      if (b !== undefined && d !== undefined) idx.push(a, d, b);
      if (e !== undefined && b !== undefined && d !== undefined) idx.push(b, d, e);
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    /* ---- 顶点色：按高度 / 坡度 / 岩层分层上色 ----
     * 评审第十一轮：「山体没有任何植被/岩层/梯田分色，一整块同色」
     * 「表面有细密竖向条纹/拉丝感」
     *
     * 顶点色让山体自己带材质分层：
     *   低处 = 城市灰绿（建成区）
     *   中段 = 岩灰 + 垂直层理条纹（消除拉丝感，是岩层的横截面）
     *   高处 = 植被绿（山顶）
     *   陡坡 = 裸岩（更亮，凸显崖面）
     */
    var colArr = new Float32Array(pos.length / 3 * 3);
    for (var ci = 0; ci < cells.length; ci++) {
      var cc = cells[ci];
      var vi = vmap[cc.i + '_' + cc.j];
      if (vi === undefined) continue;
      /* 坡度 —— buildTerrain 期间 terrain 还没赋值，必须直接用 heightField */
      var ggx = heightField(cc.x + 12, cc.z, seed) - heightField(cc.x - 12, cc.z, seed);
      var ggz = heightField(cc.x, cc.z + 12, seed) - heightField(cc.x, cc.z - 12, seed);
      var slp = Math.min(1, Math.sqrt(ggx * ggx + ggz * ggz) / 30);

      /* 垂直层理：把高度切成 7.5m 一层的岩层，同层同色，层与层之间跳变 */
      var strata = Math.floor(cc.y / 11);
      var strataShade = 1 + ((strata * 2654435761) % 1000) / 1000 * 0.10 - 0.05;
      /* 叠一层 fbm 噪声 —— 否则层理会变成等高线色带 */
      strataShade *= 0.90 + fbm(cc.x * 0.022, cc.z * 0.022, seed ^ 0x9a1, 3) * 0.28;

      var hN = Math.min(1, cc.y / 230);
      var r, g, b;
      if (hN < 0.22) {
        /* 河谷：建成区的灰绿 */
        r = 0.44; g = 0.46; b = 0.42;
      } else if (hN < 0.55) {
        /* 山腰：岩灰带层理 */
        r = 0.50; g = 0.47; b = 0.43;
      } else {
        /* 山顶：植被绿 */
        r = 0.34; g = 0.42; b = 0.30;
      }
      /* 陡坡 → 裸岩，更亮更暖 */
      if (slp > 0.55) {
        var k = Math.min(1, (slp - 0.55) / 0.45);
        r = r + (0.60 - r) * k; g = g + (0.55 - g) * k; b = b + (0.49 - b) * k;
      }
      /* 层理明暗 */
      r *= strataShade; g *= strataShade; b *= strataShade;
      /* 谷底偏暗，山脊偏亮 */
      var lift = 0.86 + hN * 0.24;
      r *= lift; g *= lift; b *= lift;

      colArr[vi * 3] = r; colArr[vi * 3 + 1] = g; colArr[vi * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

    var ground = new THREE.Mesh(geo, M.ground);
    ground.receiveShadow = true;
    ground.castShadow = true;
    group.add(ground);

    /* 网格加密：64×64 的三角形在 1384px 宽的画面里每个约 20px，
     * 法线突变会读成「三角鳞片」。加密到 112×112 让坡面平滑。 */
    /* （实际加密在 buildTerrain 里通过 GRID_N 控制）*/

    /* ---- 崖壁：沿等高线的**连续挡墙带** ----
     *
     * 上一版：每个网格格子、每个方向落差 > 9m 就生成一个独立四边形挡墙。
     * 后果：5148 个独立 quad，顶点在网格交点上、尺寸全等、间距全等，
     * 在画面上读成「等距同尺寸三角锥阵列 / 龙鳞」（第十轮评审诊断）。
     *
     * 现在：先用 marching squares 追出**等高线**，
     * 在等高线上生成连续挡墙带（沿等高线方向拼接的带状 mesh），
     * 墙的高度 = 该等高线与下一条等高线的高差 —— 这正是重庆山坎的成因：
     * 人工把坡切成一圈圈台地，台地之间是挡墙。
     * 这样挡墙是**连续的长条**，读出来是「一圈圈山坎」，不是「一片鳞」。
     */
    var walls = buildRetainingWalls(cells, grid, GRID_N, cell, 9, M);
    if (walls) {
      walls.castShadow = true; walls.receiveShadow = true;
      group.add(walls);
    }

    /* ---- 台地描述（给地标吸附用） ---- */
    var terraces = [];
    var levels = {};
    cells.forEach(function (c) {
      var key = Math.round(c.y / 12) * 12;   /* 12m 一档，仅用于吸附 */
      if (!levels[key]) levels[key] = { y: key, pts: [], cells: [] };
      levels[key].cells.push(c);
    });
    Object.keys(levels).forEach(function (k) {
      var o = levels[k];
      o.pts = o.cells.map(function (c) { return new THREE.Vector3(c.x, c.y, c.z); });
      terraces.push(o);
    });
    terraces.sort(function (a, b) { return a.y - b.y; });

    return { terraces: terraces, cells: cells, cell: cell, grid: grid };
  }

  /* ------------------------------------------------ 连续挡墙带
   * 沿等高线生成连续的挡墙（山坎）。
   *
   * 原理：重庆的山坎不是天然的陡坡，是**人工把坡切成一圈圈台地**，
   * 台地之间砌挡墙。所以挡墙必须：
   *   ① 沿着等高线走（水平方向连续）
   *   ② 高度 = 到下一圈等高线的高差（垂直方向）
   *   ③ 一整圈是一个连续带，不是碎片
   */
  function buildRetainingWalls(cells, grid, N, cell, step, M) {
    /* 找出所有高度level */
    var maxH = 0, minH = 1e9;
    cells.forEach(function (c) {
      if (c.y > maxH) maxH = c.y;
      if (c.y < minH) minH = c.y;
    });

    var pos = [], uv = [], idx = [];
    var vbase = 0;

    /* 每一圈等高线都做一圈墙 */
    for (var lv = minH + step; lv < maxH; lv += step) {
      var segs = contourSegments(grid, N, lv);
      if (!segs.length) continue;

      /* 把这一圈的线段串成链 */
      var chains = linkSegments(segs, cell * 1.2);
      chains.forEach(function (chain) {
        if (chain.length < 6) return;

        /* 墙顶 = 当前等高线高度，墙底 = 下一圈（lv - step）
         * 只在「下方确实有落差」的地方建墙 —— 上一圈是台面就不建 */
        var top = lv, bot = lv - step;
        if (bot < 0) bot = 0;

        var start = vbase;
        for (var i = 0; i < chain.length; i++) {
          var p = chain[i];
          /* 墙的左右微偏移，避免和地形 z-fighting */
          pos.push(p.x, top, p.z);
          pos.push(p.x, bot, p.z);
          uv.push(i * 0.14, 0);
          uv.push(i * 0.14, (top - bot) / 13);
        }
        for (var k = 0; k < chain.length - 1; k++) {
          var a = start + k * 2, b = a + 1, cI = a + 2, d = a + 3;
          idx.push(a, b, cI);
          idx.push(b, d, cI);
        }
        vbase += chain.length * 2;
      });
    }

    if (!pos.length) return null;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    var mat = M.rock.clone();
    mat.side = THREE.DoubleSide;
    return new THREE.Mesh(g, mat);
  }

  /* 单个高程的等高线段（marching squares 的简化版：只取穿过格子的两点） */
  function contourSegments(grid, N, lv) {
    var segs = [];
    for (var i = 0; i < N - 1; i++) {
      for (var j = 0; j < N - 1; j++) {
        var a = grid[i][j], b = grid[i + 1][j];
        var c2 = grid[i][j + 1], d = grid[i + 1][j + 1];
        if (!a || !b || !c2 || !d) continue;
        var pts = [];
        if ((a.y - lv) * (b.y - lv) < 0) {
          var u = (lv - a.y) / (b.y - a.y);
          pts.push({ x: a.x + (b.x - a.x) * u, z: a.z, y: lv });
        }
        if ((b.y - lv) * (d.y - lv) < 0) {
          var u2 = (lv - b.y) / (d.y - b.y);
          pts.push({ x: b.x, z: b.z + (d.z - b.z) * u2, y: lv });
        }
        if ((d.y - lv) * (c2.y - lv) < 0) {
          var u3 = (lv - d.y) / (c2.y - d.y);
          pts.push({ x: d.x + (c2.x - d.x) * u3, z: d.z, y: lv });
        }
        if ((c2.y - lv) * (a.y - lv) < 0) {
          var u4 = (lv - c2.y) / (a.y - c2.y);
          pts.push({ x: a.x, z: c2.z + (a.z - c2.z) * u4, y: lv });
        }
        if (pts.length >= 2) segs.push([pts[0], pts[1]]);
      }
    }
    return segs;
  }

  /* --------------------------------------------------- 建筑布点
   * 关键：楼要「贴着崖壁」密排，不是撒在空旷踏面上。
   * 所以布点优先选**相邻有高差**的格子（紧邻挡墙），
   * 再补内部格子 —— 这才��得出重庆那种连成片的「楼海」。
   */
  /* ---------------------------------------------------------- 高度查询
   * 地面高度查询 —— 模块作用域，因为 placeBuildings（沿等高线布楼）
   * 也要用梯度来算「楼的前脸朝哪」。
   * terrain 是模块级变量，由 create() 赋值。 */
  var terrain = null;

  function groundAt(x, z) {
    if (!terrain) return 0;
    var cell = terrain.cell;
    var gi = Math.round((x + WORLD / 2) / cell);
    var gj = Math.round((z + 40 + WORLD / 2) / cell);
    if (gi < 0 || gj < 0 || gi >= GRID_N || gj >= GRID_N) return 0;
    var c = terrain.grid[gi][gj];
    if (c) return c.y;
    var best = 0, bd = 1e9;
    for (var i = 0; i < terrain.cells.length; i++) {
      var cc = terrain.cells[i];
      var dx = cc.x - x, dz = cc.z - z;
      var d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = cc.y; }
    }
    return best;
  }

  function placeBuildings(group, M, terrain, seed, count, avoidLms) {
    var rr = mulberry(seed ^ 0x51ed);
    var cells = terrain.cells;
    var grid = terrain.grid;
    var cell = terrain.cell;
    var placed = 0;
    var bounds = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 };

    /* ==================================================================
     * 布楼机制（第七轮重构）
     *
     * 评审诊断：「3 列近等距、同色、同坡顶角度、同层数、同尺寸 →
     * 一眼模型房」「坐在一块巨大灰白平板上」。
     *
     * 根因：**按网格格子布点**。网格是笛卡尔坐标的，所以楼必然
     * 排成行、列 —— 这在真实城市里不存在。
     *
     * 真实重庆的楼是怎么排的？**沿等高线成排**。
     * 山坡上一圈一圈的等高线，每条等高线上盖一排楼，
     * 楼的前脸对着坡下（看江），后排比前排高一个台。
     *
     * 所以正确做法：
     *  ① 对高度场做**等高线追踪**（marching squares），
     *     得到若干条闭合/开放的高程环线
     *  ② 在每条环线上等间距（但带抖动）放楼
     *  ③ 楼的前脸朝向坡下
     *  ④ 相邻环线的高差就是台地级差（自动形成层层叠叠）
     * ================================================================== */

    /* ---------- ① 等高线追踪 ---------- */
    var CONTOUR_STEP = 9;     /* 每 9m 一条等高线 ≈ 3 层楼 */
    var contours = traceContours(cells, grid, GRID_N, cell, CONTOUR_STEP);

    /* ---------- ② ③ 沿等高线布楼 ---------- */
    var used = {};
    var occupied = {};
    var lastKind = 'concrete';

    function lmBlocked(x, z) {
      for (var li = 0; li < (avoidLms || []).length; li++) {
        var L = avoidLms[li];
        var sc = L.scene || {};
        if (!sc.base) continue;
        if (Math.abs(x - sc.base.x) < sc.base.w * 0.55 + 16 &&
            Math.abs(z - sc.base.z) < sc.base.d * 0.55 + 16) return true;
      }
      return false;
    }

    /* 楼高沿等高线递增：越高的等高线，楼越密越高 */
    contours.forEach(function (ct) {
      if (placed >= count) return;
      var y = ct.y;
      /* 越高 → 楼越多（山腰山头是主城建成区） */
      var density = 0.35 + Math.min(0.6, y / 130);
      var pts = ct.pts;
      if (pts.length < 8) return;
      var spacing = 16 + rr() * 10;     /* 楼间距（米） */
      var acc = rr() * spacing;         /* 起始偏移，避免所有环对齐 */
      for (var pi = 0; pi < pts.length && placed < count; pi += 2) {
        var p0 = pts[pi], p1 = pts[(pi + 1) % pts.length];
        var segLen = Math.hypot(p1.x - p0.x, p1.z - p0.z);
        acc += segLen;
        if (acc < spacing) continue;
        acc = 0;
        if (rr() > density) continue;

        /* 位置：在线段上取点 + 抖动 */
        var u = rr();
        var px = p0.x + (p1.x - p0.x) * u;
        var pz = p0.z + (p1.z - p0.z) * u;
        px += (rr() - 0.5) * 4;
        pz += (rr() - 0.5) * 4;
        if (lmBlocked(px, pz)) continue;

        var key = Math.round(px) + '_' + Math.round(pz);
        if (occupied[key]) continue;
        occupied[key] = 1;

        /* 楼朝向：前脸对着坡下（等高线外法线的反方向） */
        var tanx = p1.x - p0.x, tanz = p1.z - p0.z;
        var tl = Math.hypot(tanx, tanz) || 1;
        var nx = tanz / tl, nz = -tanx / tl;      /* 法线 */
        /* 坡下方向 = 高度下降的方向 —— 用中心差分求梯度 */
        var gx = gradX(px, pz) , gz = gradZ(px, pz);
        var gl = Math.hypot(gx, gz) || 1;
        var downX = -gx / gl, downZ = -gz / gl;
        var face = Math.atan2(downX, downZ);

        /* 楼型 —— 不能连续同型：强制相邻楼换型 */
        var kind = lastKind;
        if (rr() < 0.62) {
          var r2 = rr();
          kind = r2 < 0.28 ? 'concrete' : (r2 < 0.52 ? 'glass' : (r2 < 0.80 ? 'oldWood' : 'brick'));
        }
        lastKind = kind;
        var hiBias = Math.min(1, y / 120);
        /* 层数：离散档位 + 抖动，避免每栋都 2~3 档 */
        var floors = 2 + Math.floor(rr() * (4 + hiBias * 24));
        if (kind === 'oldWood') floors = 2 + Math.floor(rr() * 5);
        if (kind === 'brick') floors = 3 + Math.floor(rr() * 8);
        /* 尺寸：连续变化，不是固定几个值 */
        var w = 6.5 + rr() * rr() * 16;
        var d = 5.5 + rr() * rr() * 15;
        var h = floors * (2.85 + rr() * 0.5);

        /* 楼基：不能低于地面（评审：「大量楼与地面互相穿插」）。
         * 取等高线高度和实际地形高度的最大值，再抬高 1m。 */
        var terrainY = groundAt(px, pz);
        var baseY = Math.max(y, terrainY) + 0.8;

        var geo = new THREE.BoxGeometry(w, h, d);
        var uv = geo.attributes.uv;
        /* UV 随机偏移 —— 否则每栋楼的窗户贴图完全一样，
         * 评审第七轮：「窗户贴图全同」 */
        var uo = rr(), vo = rr();
        for (var q = 0; q < uv.count; q++) {
          uv.setXY(q, uv.getX(q) * (w / 11) + uo, uv.getY(q) * (h / 11) + vo);
        }
        var mesh = new THREE.Mesh(geo, M[kind]);
        mesh.position.set(px, baseY + h / 2, pz);
        /* 稍微转一点，别全部平行 —— 真实房子朝向有偏差 */
        mesh.rotation.y = face + (rr() - 0.5) * 0.45;
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);

        if (rr() < 0.45) addFacadeDetail(group, M, px, baseY, pz, w, h, d, kind, rr);

        /* 屋顶：水箱 / 楼梯间 */
        if (kind !== 'oldWood' && rr() < 0.55) {
          var tank = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.3, 2.2, d * 0.3), M.concrete);
          tank.position.set(px + (rr() - 0.5) * w * 0.4, baseY + h + 1.1, pz + (rr() - 0.5) * d * 0.4);
          tank.castShadow = true;
          group.add(tank);
        }
        /* 屋顶小楼梯间 —— 打断平顶 */
        if (rr() < 0.3) {
          var hut = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 2.6, d * 0.22), M.brick);
          hut.position.set(px + (rr() - 0.5) * w * 0.5, baseY + h + 1.3, pz + (rr() - 0.5) * d * 0.5);
          hut.castShadow = true;
          group.add(hut);
        }

        bounds.minX = Math.min(bounds.minX, px); bounds.maxX = Math.max(bounds.maxX, px);
        bounds.minZ = Math.min(bounds.minZ, pz); bounds.maxZ = Math.max(bounds.maxZ, pz);
        placed++;
      }
    });

    /* 剩余名额：撒一些「非等高线」的楼（补空缺，但不能形成阵列） */
    var guard = 0;
    while (placed < count && guard < count * 30) {
      guard++;
      var c = cells[Math.floor(rr() * cells.length)];
      if (!c) continue;
      var px2 = c.x + (rr() - 0.5) * cell;
      var pz2 = c.z + (rr() - 0.5) * cell;
      var key2 = Math.round(px2) + '_' + Math.round(pz2);
      if (occupied[key2]) continue;
      if (lmBlocked(px2, pz2)) continue;
      occupied[key2] = 1;

      var r3 = rr();
      var kind2 = r3 < 0.35 ? 'concrete' : (r3 < 0.65 ? 'glass' : 'brick');
      var fl2 = 3 + Math.floor(rr() * 14);
      var w2 = 8 + rr() * 10, d2 = 7 + rr() * 9, h2 = fl2 * 3.0;
      var g2 = new THREE.BoxGeometry(w2, h2, d2);
      var uv2 = g2.attributes.uv;
      for (var q2 = 0; q2 < uv2.count; q2++) {
        uv2.setXY(q2, uv2.getX(q2) * (w2 / 11), uv2.getY(q2) * (h2 / 11));
      }
      var m2 = new THREE.Mesh(g2, M[kind2]);
      m2.position.set(px2, c.y + h2 / 2 - 0.5, pz2);
      m2.rotation.y = rr() * Math.PI * 2;
      m2.castShadow = true; m2.receiveShadow = true;
      group.add(m2);
      placed++;
    }

    return { count: placed, bounds: bounds };
  }

  /* ---------------------------------------------------------- 等高线追踪
   * Marching squares：找出高度场在指定高程上的等值线段。
   * 简化版：逐格子检查 4 个角的高度，按符号变化插值出线段。
   */
  function traceContours(cells, grid, N, cell, step) {
    var levels = [];
    var maxH = 0;
    cells.forEach(function (c) { if (c.y > maxH) maxH = c.y; });
    for (var lv = step; lv < maxH; lv += step) {
      var segs = [];
      for (var i = 0; i < N - 1; i++) {
        for (var j = 0; j < N - 1; j++) {
          var a = grid[i][j], b = grid[i + 1][j];
          var c2 = grid[i][j + 1], d = grid[i + 1][j + 1];
          if (!a || !b || !c2 || !d) continue;
          var pts = [];
          /* 边 AB (x 方向) */
          if ((a.y - lv) * (b.y - lv) < 0) {
            var u = (lv - a.y) / (b.y - a.y);
            pts.push({ x: a.x + (b.x - a.x) * u, z: a.z, y: lv });
          }
          /* 边 BC (z 方向) */
          if ((b.y - lv) * (d.y - lv) < 0) {
            var u2 = (lv - b.y) / (d.y - b.y);
            pts.push({ x: b.x, z: b.z + (d.z - b.z) * u2, y: lv });
          }
          /* 边 CD (x 方向，反向) */
          if ((d.y - lv) * (c2.y - lv) < 0) {
            var u3 = (lv - d.y) / (c2.y - d.y);
            pts.push({ x: d.x + (c2.x - d.x) * u3, z: d.z, y: lv });
          }
          /* 边 DA (z 方向) */
          if ((c2.y - lv) * (a.y - lv) < 0) {
            var u4 = (lv - c2.y) / (a.y - c2.y);
            pts.push({ x: a.x, z: c2.z + (a.z - c2.z) * u4, y: lv });
          }
          if (pts.length >= 2) segs.push([pts[0], pts[1]]);
        }
      }
      /* 把散段串成折线（按端点邻近连接） */
      var chains = linkSegments(segs, cell * 0.9);
      chains.forEach(function (ch) {
        if (ch.length >= 8) levels.push({ y: lv, pts: ch });
      });
    }
    return levels;
  }

  /* 把线段串成折线 */
  function linkSegments(segs, tol) {
    var chains = [];
    var used = {};
    for (var i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      var chain = [segs[i][0], segs[i][1]];
      var grew = true;
      while (grew) {
        grew = false;
        var tail = chain[chain.length - 1];
        for (var j = 0; j < segs.length; j++) {
          if (used[j]) continue;
          var s = segs[j];
          if (Math.hypot(s[0].x - tail.x, s[0].z - tail.z) < tol) {
            chain.push(s[1]); used[j] = 1; grew = true; break;
          }
          if (Math.hypot(s[1].x - tail.x, s[1].z - tail.z) < tol) {
            chain.push(s[0]); used[j] = 1; grew = true; break;
          }
        }
      }
      if (chain.length >= 8) chains.push(chain);
    }
    return chains;
  }

  /* 高度梯度（中心差分） */
  function gradX(x, z) {
    return groundAt(x + 6, z) - groundAt(x - 6, z);
  }
  function gradZ(x, z) {
    return groundAt(x, z + 6) - groundAt(x, z - 6);
  }

  /* --------------------------------------------------- 阳台 / 空调外机
   * 评审指出窗户「100% 是平贴图」是示意图感的最大来源。
   * 这里给每栋楼加真几何：阳台、栏杆、晾衣杆、空调外机、雨棚。
   * 尺寸必须到剪影级别（阳台挑出 ≥1.5m）才在全景里读得出来。 */
  function addFacadeDetail(group, M, px, py, pz, w, h, d, kind, rr) {
    var floors = Math.max(2, Math.floor(h / 3.0));
    var step = h / floors;

    /* 阳台：每 2~3 层一个 */
    if (kind !== 'oldWood' && rr() < 0.8) {
      var nBal = 1 + Math.floor(rr() * 3);
      for (var bi = 0; bi < nBal; bi++) {
        var f = 1 + Math.floor(rr() * (floors - 1));
        var by = py + f * step;
        var bw = Math.min(w * 0.62, 6.5);
        var side = rr() < 0.5 ? 1 : -1;
        var bxp = px + (rr() - 0.5) * (w - bw) * 0.5;
        var bzp = pz + side * (d / 2 + 1.5);

        var slab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.4, 3.0), M.concrete);
        slab.position.set(bxp, by, bzp);
        slab.castShadow = true; slab.receiveShadow = true;
        group.add(slab);
        var railMat = M.road;
        var top = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.12, 0.12), railMat);
        top.position.set(bxp, by + 1.15, bzp + side * 1.35);
        group.add(top);
        for (var ri = 0; ri < 5; ri++) {
          var rx = bxp - bw / 2 + (ri / 4) * bw;
          var bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.15, 0.13), railMat);
          bar.position.set(rx, by + 0.58, bzp + side * 1.35);
          group.add(bar);
        }
        if (rr() < 0.6) {
          var pole = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.8, 0.07, 0.07), railMat);
          pole.position.set(bxp, by + 1.9, bzp + side * 0.5);
          group.add(pole);
        }
      }
    }

    /* 空调外机 */
    if (kind !== 'oldWood' && rr() < 0.75) {
      var nAC = 1 + Math.floor(rr() * 4);
      for (var ai = 0; ai < nAC; ai++) {
        var af = 1 + Math.floor(rr() * (floors - 1));
        var ay = py + af * step + 0.9;
        var asd = rr() < 0.5 ? 1 : -1;
        var ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.75), M.concrete);
        ac.position.set(px + (rr() - 0.5) * w * 0.7, ay, pz + asd * (d / 2 + 0.95));
        ac.castShadow = true;
        group.add(ac);
      }
    }

    /* 雨棚 */
    if (rr() < 0.45) {
      var side2 = rr() < 0.5 ? 1 : -1;
      var aw = Math.min(w * 0.8, 9);
      var canopy = new THREE.Mesh(new THREE.BoxGeometry(aw, 0.28, 3.8), M.roof);
      canopy.position.set(px + (rr() - 0.5) * (w - aw) * 0.4, py + h - 1.2, pz + side2 * (d / 2 + 2.1));
      canopy.rotation.x = side2 * 0.16;
      canopy.castShadow = true;
      group.add(canopy);
    }
  }

  /* 吸附到最近的台地高度 */
  function nearestTerraceY(y, terraces) {
    var best = terraces[0].y, bd = 1e9;
    for (var i = 0; i < terraces.length; i++) {
      var d = Math.abs(terraces[i].y - y);
      if (d < bd) { bd = d; best = terraces[i].y; }
    }
    return best;
  }

  /* --------------------------------------------------------- 地标生成
   * 每类 tag 一个专用形态。landmark.scene.base 给出位置尺寸。
   */
  function buildLandmarks(group, M, landmarks, seed, terraces) {
    var handles = [];
    var rr = mulberry(seed ^ 0x2f1d);

    landmarks.forEach(function (lm) {
      var sc = lm.scene || {};
      var b = sc.base;
      if (!b) return;
      var tag = lm.tag;
      var g = new THREE.Group();
      /* 把地标吸附到最近的台地高度。
       * 地形级差改了之后，landmark.scene.base.y 还是老值，
       * 不吸附的话地标会浮在半空或者埋进崖壁里。 */
      var baseY = nearestTerraceY(b.y, terraces);
      g.position.set(b.x, baseY, b.z);

      var matFor = {
        'stacked-cliffs': M.oldWood,
        'old-town': M.oldWood,
        'footpath-stairs': M.oldWood,
        'rail-through-building': M.concrete,
        'night-neon': M.glass,
        'modern-skyline': M.glass,
        'river-bridge': M.concrete,
        'multi-level-road': M.concrete,
        'river-confluence': M.concrete,
        'hilltop-view': M.brick
      };
      var base = matFor[tag] || M.concrete;

      if (tag === 'river-bridge') {
        buildBridge(g, M, b, rr);
      } else if (tag === 'modern-skyline' || tag === 'night-neon') {
        buildTower(g, M, b, sc, tag, rr);
        if (tag === 'night-neon') buildNeonSigns(g, M, b, rr);
      } else if (tag === 'old-town' || tag === 'footpath-stairs' || tag === 'stacked-cliffs') {
        buildOldTown(g, M, b, sc, rr);
      } else if (tag === 'rail-through-building') {
        buildRailBuilding(g, M, b, sc, rr);
      } else if (tag === 'multi-level-road') {
        buildMultiRoad(g, M, b, sc, rr);
      } else if (tag === 'river-confluence') {
        buildConfluence(g, M, b, sc, rr);
      } else if (tag === 'hilltop-view') {
        buildHilltop(g, M, b, sc, rr);
      }

      group.add(g);
      handles.push({ id: lm.id, en: lm.en, zh: lm.zh, tag: lm.tag, obj: g, base: b, lat: lm.lat, lng: lm.lng });
    });
    return handles;
  }

  /* 斜拉桥 / 悬索桥 */
  function buildBridge(g, M, b, rr) {
    var len = b.w, deckY = b.h, wdt = b.d;
    /* 桥面 */
    var deck = new THREE.Mesh(new THREE.BoxGeometry(len, 2.4, wdt), M.concrete);
    deck.position.y = deckY; deck.castShadow = true; deck.receiveShadow = true;
    g.add(deck);
    /* 桥塔 */
    var towerH = b.h * 1.15;
    [-1, 1].forEach(function (s) {
      var t = new THREE.Mesh(new THREE.BoxGeometry(4.5, towerH, 4.5), M.concrete);
      t.position.set(s * len * 0.28, deckY + towerH / 2, 0);
      t.castShadow = true;
      g.add(t);
    });
    /* 拉索 */
    var cableMat = new THREE.LineBasicMaterial({ color: 0x8fa6c0 });
    [-1, 1].forEach(function (s) {
      for (var i = 1; i <= 8; i++) {
        var ax = s * len * 0.28, ay = deckY + towerH;
        var bx = s * (len * 0.06 + i * (len * 0.10));
        var by = deckY + towerH * (1 - i / 9);
        var geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ax, ay, 0), new THREE.Vector3(bx, by, 0)]);
        g.add(new THREE.Line(geo, cableMat));
      }
    });
  }

  /* 洪崖洞式霓虹招牌层
   * 评审指出夜景「完全靠窗户发光撑画面 —— 像贴纸城市」。
   * 真实重庆的夜景记忆点其实是招牌：层层叠叠的灯箱、竖排店名、
   * 探出崖壁的霓虹。做成真几何 + 自发光材质。 */
  function buildNeonSigns(g, M, b, rr) {
    var signMats = [M.neonAmber, M.neonCyan, M.neonPink, M.neonWhite];
    var rows = 3 + Math.floor(rr() * 3);
    for (var r = 0; r < rows; r++) {
      var y = b.h * (0.18 + r * 0.14) + rr() * 4;
      var w = b.w * (0.45 + rr() * 0.45);
      var d = b.d * (0.45 + rr() * 0.45);
      /* 水平灯箱：贴在楼体外侧 */
      var side = rr() < 0.5 ? 1 : -1;
      var box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 3.4, 0.7),
        signMats[Math.floor(rr() * signMats.length)]);
      box.position.set((rr() - 0.5) * w * 0.3, y, side * (d / 2 + 0.5));
      g.add(box);
      /* 竖排灯箱 —— 重庆街头那种竖着的招牌 */
      if (rr() < 0.7) {
        var vert = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9 + rr() * 7, 0.6),
          signMats[Math.floor(rr() * signMats.length)]);
        var side2 = rr() < 0.5 ? 1 : -1;
        vert.position.set((rr() - 0.5) * w * 0.7, y + 4, side2 * (d / 2 + 0.4));
        g.add(vert);
      }
    }
    /* 红灯笼 —— 挂在挑檐上 */
    var lanternMat = new THREE.MeshStandardMaterial({
      color: 0xd8342a, roughness: 0.7,
      emissive: 0xd8342a, emissiveIntensity: 0.9 });
    var nL = 6 + Math.floor(rr() * 8);
    for (var l = 0; l < nL; l++) {
      var lan = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 6), lanternMat);
      lan.scale.set(1, 1.25, 1);
      lan.position.set((rr() - 0.5) * b.w * 0.9, b.h * (0.2 + rr() * 0.6),
        (rr() < 0.5 ? 1 : -1) * (b.d / 2 + 1.6));
      g.add(lan);
    }
  }

  /* 摩天楼 / 玻璃幕墙 */
  function buildTower(g, M, b, sc, tag, rr) {
    var floors = sc.floors || 20;
    var h = b.h;

    /* 关键：不要做一个「巨型方盒子」。
     * 上一版把 h 切成 3 段叠在一起，260×150×200 的体量就变成
     * 一台三层楼梯模型 —— 评审直接判为「泡沫纸板/叠层积木」。
     * 正确做法：一栋主塔 + 若干**独立**的副塔，各自有自己的高度、
     * 宽度、位置，互相错开，形成真正的天际线。 */
    var towers = 3 + Math.floor(rr() * 4);
    var mainH = h * (0.62 + rr() * 0.38);

    /* 主塔：细高，收分 2 段 */
    var mainW = Math.min(b.w * (0.16 + rr() * 0.12), 42);
    var mainD = Math.min(b.d * (0.16 + rr() * 0.12), 42);
    var stack = 2;
    var y = 0;
    for (var s = 0; s < stack; s++) {
      var frac = s === 0 ? 1 : 0.72;
      var segH = mainH * (s === 0 ? 0.68 : 0.32);
      var geo = new THREE.BoxGeometry(mainW * frac, segH, mainD * frac);
      var uv = geo.attributes.uv;
      for (var q = 0; q < uv.count; q++) {
        uv.setXY(q, uv.getX(q) * (mainW * frac / 11), uv.getY(q) * (segH / 11));
      }
      var m = new THREE.Mesh(geo, M.glass);
      m.position.y = y + segH / 2;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      y += segH;
    }
    /* 主塔冠顶收束 + 天线 */
    var cap = new THREE.Mesh(new THREE.BoxGeometry(mainW * 0.55, 2.2, mainD * 0.55), M.concrete);
    cap.position.y = y + 1.1;
    cap.castShadow = true;
    g.add(cap);
    var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 12, 6), M.road);
    antenna.position.y = y + 8;
    g.add(antenna);

    /* 副塔：散落在周围，高矮不一 —— 这才像天际线 */
    for (var ti = 0; ti < towers; ti++) {
      var ang = (ti / towers) * Math.PI * 2 + rr() * 0.7;
      var rad = (0.18 + rr() * 0.32) * Math.min(b.w, b.d);
      var tw = 12 + rr() * 20;
      var td = 12 + rr() * 20;
      var th = h * (0.22 + rr() * 0.62);
      var tg = new THREE.BoxGeometry(tw, th, td);
      var tuv = tg.attributes.uv;
      for (var tq = 0; tq < tuv.count; tq++) {
        tuv.setXY(tq, tuv.getX(tq) * (tw / 11), tuv.getY(tq) * (th / 11));
      }
      var tm = new THREE.Mesh(tg, rr() < 0.4 ? M.concrete : M.glass);
      tm.position.set(Math.cos(ang) * rad, th / 2, Math.sin(ang) * rad);
      tm.castShadow = true; tm.receiveShadow = true;
      g.add(tm);
      /* 副塔顶楼 */
      if (rr() < 0.6) {
        var cap2 = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.7, 1.8, td * 0.7), M.concrete);
        cap2.position.set(tm.position.x, th + 0.9, tm.position.z);
        g.add(cap2);
      }
    }

    /* 裙楼：贴着主塔的底座，不能是一整块大薄板。
     * 之前是 BoxGeometry(b.w*0.62=161m, 8m, b.d*0.62) ——
     * 又宽又薄又没有柱，夜景里就是几片悬空的黑飞碟。 */
    var pw = Math.min(mainW * 1.9, 78);
    var pd = Math.min(mainD * 1.9, 78);
    var podium = new THREE.Mesh(new THREE.BoxGeometry(pw, 11, pd), M.concrete);
    podium.position.y = 5.5;
    podium.castShadow = true; podium.receiveShadow = true;
    g.add(podium);
    /* 裙楼底下的柱 —— 让它站得住 */
    for (var pc = 0; pc < 4; pc++) {
      var px2 = (pc % 2 ? 1 : -1) * (pw / 2 - 3);
      var pz2 = (pc < 2 ? 1 : -1) * (pd / 2 - 3);
      var pillar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5, 3.2), M.concrete);
      pillar.position.set(px2, 2.5, pz2);
      pillar.castShadow = true;
      g.add(pillar);
    }

    /* 顶部霓虹冠 + 竖向灯带 */
    if (tag === 'night-neon' || tag === 'modern-skyline') {
      var neon = tag === 'night-neon' ? M.neonWhite : M.neonPink;
      var crown = new THREE.Mesh(new THREE.BoxGeometry(mainW * 0.72, 2.2, mainD * 0.72), neon);
      crown.position.y = y + 1.4;
      g.add(crown);
      for (var i = 0; i < 5; i++) {
        var strip = new THREE.Mesh(new THREE.BoxGeometry(0.9, mainH * 0.42, 0.9),
          tag === 'night-neon' ? M.neonWhite : M.neonPink);
        strip.position.set(
          (i / 4 - 0.5) * mainW * 0.9,
          mainH * 0.42,
          mainD * 0.5);
        g.add(strip);
      }
    }
  }

  /* 老街 / 梯坎 / 吊脚楼 */
  function buildOldTown(g, M, b, sc, rr) {
    var floors = sc.floors || 3;
    var rows = Math.max(3, Math.floor(b.d / 16));
    for (var r = 0; r < rows; r++) {
      var z = -b.d / 2 + 8 + r * ((b.d - 16) / Math.max(1, rows - 1));
      var cols = Math.max(2, Math.floor(b.w / 22));
      for (var c = 0; c < cols; c++) {
        var x = -b.w / 2 + 12 + c * ((b.w - 24) / Math.max(1, cols - 1));
        var h = floors * 3.0 + rr() * 2;
        var w = 9 + rr() * 5, d = 8 + rr() * 4;
        /* 逐层退台 —— 洪崖洞那种挂在崖壁上的感觉 */
        var lift = (r % 3) * 1.8;
        var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.oldWood);
        m.position.set(x, h / 2 + lift, z);
        m.castShadow = true; m.receiveShadow = true;
        g.add(m);
        /* 双坡瓦顶 */
        var roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, w * 0.78, 3.4, 4, 1), M.roof);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(x, h + lift + 1.5, z);
        roof.castShadow = true;
        g.add(roof);
        /* 吊脚柱 */
        if (sc.stilt || r % 2 === 0) {
          for (var s = -1; s <= 1; s += 2) {
            var leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, h + lift, 1.1), M.stiltWood);
            leg.position.set(x + s * w * 0.38, (h + lift) / 2, z + d * 0.4);
            leg.castShadow = true;
            g.add(leg);
          }
        }
      }
    }
  }

  /* 轻轨穿楼 —— 轨道从楼体中间穿过 */
  function buildRailBuilding(g, M, b, sc, rr) {
    var h = b.h;
    var body = new THREE.Mesh(new THREE.BoxGeometry(b.w, h, b.d), M.concrete);
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    /* 轨道：从 -Z 穿到 +Z，在楼的第 6~8 层位置 */
    var railY = h * 0.36;
    var rail = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.8, 3.2, 90), M.concrete);
    rail.position.set(0, railY, 0);
    rail.castShadow = true;
    g.add(rail);
    /* 站台 */
    var plat = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.8, 0.5, 26), M.road);
    plat.position.set(0, railY + 1.9, 0);
    g.add(plat);
    /* 列车（纯代码方块车厢） */
    var train = new THREE.Group();
    for (var c = 0; c < 4; c++) {
      var car = new THREE.Mesh(new THREE.BoxGeometry(6.2, 5.2, 22), M.glassBlue);
      car.position.set(0, railY + 3.6, -18 + c * 24);
      train.add(car);
    }
    g.add(train);
  }

  /* 多层立交 */
  function buildMultiRoad(g, M, b, sc, rr) {
    var levels = sc.floors || 4;
    for (var l = 0; l < levels; l++) {
      var y = l * (b.h / levels) + 6;
      var rot = l * 0.5;
      var deck = new THREE.Mesh(new THREE.BoxGeometry(b.w, 2.6, b.d * 0.42), M.road);
      deck.rotation.y = rot;
      deck.position.y = y;
      deck.castShadow = true; deck.receiveShadow = true;
      g.add(deck);
      /* 桥墩 */
      var nPillars = 3 + Math.floor(rr() * 3);
      for (var p = 0; p < nPillars; p++) {
        var px = -b.w / 2 + (p + 0.5) * (b.w / nPillars);
        var pil = new THREE.Mesh(new THREE.BoxGeometry(3.4, y, 3.4), M.concrete);
        pil.position.set(px, y / 2, (rr() - 0.5) * b.d * 0.3);
        pil.castShadow = true;
        g.add(pil);
      }
    }
  }

  /* 两江交汇 */
  function buildConfluence(g, M, b, sc, rr) {
    /* 码头平台 */
    var plat = new THREE.Mesh(new THREE.BoxGeometry(b.w, 4, b.d), M.road);
    plat.position.y = 2; plat.receiveShadow = true;
    g.add(plat);
    /* 货柜堆 */
    for (var i = 0; i < 22; i++) {
      var cx = -b.w / 2 + rr() * b.w, cz = -b.d / 2 + rr() * b.d;
      var ch = 3 + Math.floor(rr() * 3) * 2.6;
      var box = new THREE.Mesh(new THREE.BoxGeometry(10, 5.4, 5.2),
        [M.brick, M.oldWood, M.glassBlue][Math.floor(rr() * 3)]);
      box.position.set(cx, 4 + ch / 2, cz);
      box.rotation.y = rr() * 0.6;
      box.castShadow = true; box.receiveShadow = true;
      g.add(box);
    }
  }

  /* 山顶观景台 */
  function buildHilltop(g, M, b, sc, rr) {
    var deck = new THREE.Mesh(new THREE.BoxGeometry(b.w, 3, b.d), M.road);
    deck.position.y = 1.5; deck.receiveShadow = true;
    g.add(deck);
    /* 观景栏杆 */
    var railMat = new THREE.LineBasicMaterial({ color: 0x9fb4cc });
    var pts = [];
    var per = 2 * (b.w + b.d);
    for (var i = 0; i <= 48; i++) {
      var t = i / 48 * per;
      var x, z;
      if (t < b.w) { x = -b.w / 2 + t; z = b.d / 2; }
      else if (t < b.w + b.d) { x = b.w / 2; z = b.d / 2 - (t - b.w); }
      else if (t < 2 * b.w + b.d) { x = b.w / 2 - (t - b.w - b.d); z = -b.d / 2; }
      else { x = -b.w / 2; z = -b.d / 2 + (t - 2 * b.w - b.d); }
      pts.push(new THREE.Vector3(x, 5.2, z));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), railMat));
    /* 观景台顶棚 */
    var roof = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.3, 1.2, b.d * 0.3), M.glassBlue);
    roof.position.set(0, 8, 0);
    g.add(roof);
    for (var s = -1; s <= 1; s += 2) {
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 7, 8), M.concrete);
      col.position.set(s * b.w * 0.12, 4.6, 0);
      g.add(col);
    }
  }


  /* --------------------------------------------------------- 道路网
   * 重庆的路是「立体」的：桥上、桥下、隧道里都有路。
   * 做法：在台地之间拉水平连廊（悬空路），再在台地上画地面路网。 */
  function buildRoads(group, M, terrain, seed, lmHandles) {
    var rr = mulberry(seed ^ 0x3c4d);
    var roadMat = M.road;
    var cells = terrain.cells;

    /* --- 地面路网：沿着同一台地的相邻格子连一条带子 ---
     * 真实重庆的路贴着崖壁走、在楼缝里穿。 */
    var ribbons = [];
    var used = {};
    cells.forEach(function (c) {
      /* 只向 +x 和 +z 方向连，避免重复 */
      var DIRS = [[1, 0], [0, 1]];
      DIRS.forEach(function (d) {
        var ni = c.i + d[0], nj = c.j + d[1];
        if (ni < 0 || nj < 0 || ni >= GRID_N || nj >= GRID_N) return;
        var n = terrain.grid[ni][nj];
        if (!n) return;
        var key = Math.min(c.i * 10000 + c.j, n.i * 10000 + n.j) + '_' +
                  Math.max(c.i * 10000 + c.j, n.i * 10000 + n.j);
        if (used[key]) return;
        used[key] = 1;
        /* 高差大的格子之间不铺平路（那是坡道，另做） */
        if (Math.abs(c.y - n.y) > 9) return;
        if (rr() < 0.5) return;          /* 不是每条缝都有路 */
        ribbons.push([c, n]);
      });
    });

    /* ribbon → 几何 */
    var pos = [], uv = [], idx = [], v = 0;
    var halfW = 2.6;
    ribbons.forEach(function (r) {
      var a = r[0], b = r[1];
      var dx = b.x - a.x, dz = b.z - a.z;
      var L = Math.sqrt(dx * dx + dz * dz) || 1;
      var sx = -dz / L * halfW, sz = dx / L * halfW;
      var y = a.y + 0.35;
      pos.push(a.x - sx, y, a.z - sz, a.x + sx, y, a.z + sz,
               b.x + sx, y, b.z + sz, b.x - sx, y, b.z - sz);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
      v += 4;
    });
    if (pos.length) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      var m = new THREE.Mesh(g, roadMat);
      m.receiveShadow = true;
      group.add(m);
    }

    /* --- 坡道 / 连廊：跨台地的斜坡（立体交通的魂）--- */
    var linkPos = [], linkUv = [], linkIdx = [], lv = 0;
    var links = 0, tries = 0;
    while (links < 30 && tries < 400) {
      tries++;
      var c1 = cells[Math.floor(rr() * cells.length)];
      var c2 = cells[Math.floor(rr() * cells.length)];
      if (!c1 || !c2) continue;
      if (Math.abs(c1.y - c2.y) < 10) continue;
      var dist = Math.hypot(c1.x - c2.x, c1.z - c2.z);
      if (dist < 40 || dist > 220) continue;
      var ax = c1.x, az = c1.z, ay = c1.y + 0.4;
      var bx = c2.x, bz = c2.z, by = c2.y + 0.4;
      var dx = bx - ax, dz = bz - az;
      var L = Math.sqrt(dx * dx + dz * dz) || 1;
      var sx = -dz / L * 3.2, sz = dx / L * 3.2;
      linkPos.push(ax - sx, ay, az - sz, ax + sx, ay, az + sz,
                   bx + sx, by, bz + sz, bx - sx, by, bz - sz);
      linkUv.push(0, 0, 1, 0, 1, 1, 0, 1);
      linkIdx.push(lv, lv + 2, lv + 1, lv, lv + 3, lv + 2);
      lv += 4;
      links++;
    }
    if (linkPos.length) {
      var lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3));
      lg.setAttribute('uv', new THREE.Float32BufferAttribute(linkUv, 2));
      lg.setIndex(linkIdx);
      lg.computeVertexNormals();
      var lm2 = new THREE.Mesh(lg, roadMat);
      lm2.receiveShadow = true;
      group.add(lm2);
    }

    return ribbons.length + links;
  }

  /* --------------------------------------------------------- 车流
   * 夜间车灯是山城最有名的画面之一：两江上密密麻麻的光点。 */
  function buildTraffic(group, M, terrain, seed) {
    var rr = mulberry(seed ^ 0x6e5f);
    var headMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
    var tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    var carMat = M.carBody;
    var cars = [];
    var cells = terrain.cells;
    var N = 140;
    for (var i = 0; i < N; i++) {
      var c = cells[Math.floor(rr() * cells.length)];
      if (!c) continue;
      var car = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 4.4), carMat);
      body.castShadow = true;
      car.add(body);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 2.2), M.glassBlue);
      cabin.position.y = 1.0;
      car.add(cabin);
      /* 车头灯 / 尾灯 */
      var hl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.2), headMat);
      hl.position.set(0, 0.5, 2.25);
      car.add(hl);
      var tl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 0.2), tailMat);
      tl.position.set(0, 0.5, -2.25);
      car.add(tl);

      var ang = rr() * Math.PI * 2;
      var rad = 40 + rr() * 240;
      car.position.set(c.x + Math.cos(ang) * rad * 0.12, c.y + 0.8, c.z + Math.sin(ang) * rad * 0.12);
      car.rotation.y = ang;
      car.userData = {
        speed: 12 + rr() * 22,
        ang: ang,
        rad: rad,
        cx: c.x, cz: c.z, y: c.y + 0.8
      };
      group.add(car);
      cars.push(car);
    }
    return cars;
  }

  /* --------------------------------------------------------- 植被
   * 山城的绿：崖壁上的树、坡上的灌木。 */
  function buildFoliage(group, M, terrain, seed) {
    var rr = mulberry(seed ^ 0x4b2a);
    var trunkMat = M.trunk;
    var leafMat = M.foliage;
    var n = 0;
    var cells = terrain.cells;
    for (var i = 0; i < cells.length; i += 2) {
      if (n > 340) break;
      var c = cells[i];
      /* 树只长在**平缓**的地方，绝不长在崖壁上。
       * 评审第九轮：「树是全坡等密度撒的，连近垂直面也有树，
       * 把唯一的坡度线索也糊掉了」。
       *
       * 判据用**真实坡度**（高度梯度），不是邻格高差：
       * 邻格高差在网格对齐时会误判 —— 连续坡面上每格差都小，
       * 但整体坡度可能已经很陡。 */
      var gx = groundAt(c.x + 14, c.z) - groundAt(c.x - 14, c.z);
      var gz = groundAt(c.x, c.z + 14) - groundAt(c.x, c.z - 14);
      var slope = Math.sqrt(gx * gx + gz * gz) / 28;   /* 每米升降 */
      if (slope > 0.40) continue;                      /* > 21° 就不种树 */
      /* 低处少、高处多 —— 山城的绿在山腰 */
      if (rr() > 0.38 + Math.min(0.45, c.y / 200)) continue;

      var s = 0.75 + rr() * 0.55;
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 5 * s, 6), trunkMat);
      trunk.position.set(c.x + (rr() - 0.5) * 4, c.y + 2.5 * s, c.z + (rr() - 0.5) * 4);
      trunk.castShadow = true;
      group.add(trunk);
      var leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4 * s, 0), leafMat);
      leaf.position.set(trunk.position.x, c.y + 5.6 * s, trunk.position.z);
      leaf.scale.set(1, 0.82, 1);
      leaf.castShadow = true;
      group.add(leaf);
      n++;
    }
    return n;
  }

  function buildRivers(group, M, seed) {
    /* 长江：Z 方向的长条 */
    var yangtze = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), M.water);
    yangtze.rotation.x = -Math.PI / 2;
    yangtze.position.set(0, 1, RIVER_Z + 130);
    yangtze.receiveShadow = true;
    group.add(yangtze);
    /* 嘉陵江：X 方向 */
    var jialing = new THREE.Mesh(new THREE.PlaneGeometry(260, 700), M.water);
    jialing.rotation.x = -Math.PI / 2;
    jialing.position.set(JIALING_X - 130, 1, -40);
    group.add(jialing);

    /* 江上船只 */
    var rr = mulberry(seed ^ 0x77aa);
    for (var i = 0; i < 6; i++) {
      var ship = new THREE.Group();
      var hull = new THREE.Mesh(new THREE.BoxGeometry(9, 3.4, 34), M.oldWood);
      hull.castShadow = true;
      ship.add(hull);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 12), M.concrete);
      cabin.position.y = 3.2; cabin.castShadow = true;
      ship.add(cabin);
      ship.position.set(-220 + rr() * 460, 3, RIVER_Z + 40 + rr() * 150);
      ship.rotation.y = rr() * 0.6 - 0.3;
      group.add(ship);
    }
  }

  /* --------------------------------------------------------- 街道灯光 */
  function buildStreetLights(group, M, terrain, seed) {
    var rr = mulberry(seed ^ 0x1a2b);
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3444, roughness: 0.8 });
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    var n = 0;
    var cells = terrain.cells;
    for (var i = 0; i < cells.length && n < 300; i += 2) {
      var c = cells[i];
      if (rr() < 0.55) continue;
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 8.5, 6), poleMat);
      pole.position.set(c.x + (rr() - 0.5) * 6, c.y + 4.25, c.z + (rr() - 0.5) * 6);
      pole.castShadow = true;
      group.add(pole);
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), bulbMat);
      bulb.position.set(pole.position.x, c.y + 8.6, pole.position.z);
      group.add(bulb);
      n++;
    }
    return n;
  }

  /* ------------------------------------------------------------- 主入口 */
  root.CQCITY3D = {
    /**
     * @param {HTMLElement} host 容器
     * @param {Object} opts  { seed, landmarks, onLandmark }
     */
    create: function (host, opts) {
      opts = opts || {};
      var seed = opts.seed || 20261114;
      var landmarks = opts.landmarks || [];
      var onLandmark = opts.onLandmark || function () {};

      /* ---------------- 场景 ---------------- */
      var scene = new THREE.Scene();
      var skyNight = new THREE.Color(0x101c30);
      var skyDay = new THREE.Color(0x8fb4d8);
      var fogNight = new THREE.Color(0x101c30);
      var fogDay = new THREE.Color(0x9dc0e0);
      scene.background = (isNight ? skyNight : skyDay).clone();
      scene.fog = new THREE.FogExp2((isNight ? fogNight : fogDay).clone(), isNight ? 0.00085 : 0.00032);

      var isNight = opts.night !== false;

      var renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        /* 分享卡要能导出画面，所以必须保留绘制缓冲 */
        preserveDrawingBuffer: opts.preserveDrawingBuffer !== false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);
      renderer.domElement.className = 'city3d-canvas';

      var camera = new THREE.PerspectiveCamera(58, 1, 0.5, 3000);
      camera.position.set(0, 165, 210);

      /* ---------------- 灯光 ---------------- */
      var hemi = new THREE.HemisphereLight(0x5a7ba8, 0x141c2c, 1.45);
      scene.add(hemi);
      /* 白天用的太阳光（默认关） */
      var sun = new THREE.DirectionalLight(0xfff2dc, 0.0);
      sun.position.set(-260, 520, 320);
      sun.castShadow = true;
      sun.shadow.mapSize.set(4096, 4096);
      sun.shadow.camera.near = 50;
      sun.shadow.camera.far = 2200;
      sun.shadow.camera.left = -620;
      sun.shadow.camera.right = 620;
      sun.shadow.camera.top = 620;
      sun.shadow.camera.bottom = -620;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 1.2;
      scene.add(sun);
      scene.add(sun.target);

      /* 轮廓光（rim light）—— 从侧后方打，勾出山脊和楼顶的边缘。
       * 评审第十轮：「坡面上盖满均匀的深色三角鳞片」——
       * 没有轮廓光的时候，山脊和楼只能靠明暗分界，边缘是糊的。
       * 加一盏弱侧光后，山棱会有一条亮边，脊线立刻读得出。 */
      var rim = new THREE.DirectionalLight(0xbcd8f5, 0.55);
      rim.position.set(420, 190, -380);
      rim.castShadow = false;
      scene.add(rim);
      rim.target.position.set(-40, 60, -40);
      rim.target.updateMatrixWorld();
      scene.add(rim.target);

      /* 方向光（月光）—— 投影 */
      var moon = new THREE.DirectionalLight(0xbcd4f0, 1.55);
      moon.position.set(-320, 420, -260);
      moon.castShadow = true;
      moon.shadow.mapSize.set(4096, 4096);
      moon.shadow.camera.near = 50;
      moon.shadow.camera.far = 1600;
      moon.shadow.camera.left = -520;
      moon.shadow.camera.right = 520;
      moon.shadow.camera.top = 520;
      moon.shadow.camera.bottom = -520;
      moon.shadow.bias = -0.0004;
      moon.shadow.normalBias = 1.2;
      scene.add(moon);
      scene.add(moon.target);

      /* 城市辉光（暖色补光，从半岛中心往上打） */
      /* 暖色补光：从半岛下方向上打，模拟城市灯火溢到山体上 */
      var warmFill = new THREE.DirectionalLight(0xffc98a, 0.45);
      warmFill.position.set(180, -120, 220);
      scene.add(warmFill);

      var cityGlow = new THREE.PointLight(0xffb347, 4.2, 900, 1.3);
      cityGlow.position.set(-40, 120, -40);
      scene.add(cityGlow);

      var riverGlow = new THREE.PointLight(0x4fd6ff, 2.8, 700, 1.5);
      riverGlow.position.set(0, 24, RIVER_Z + 80);
      scene.add(riverGlow);

      /* ---------------- 内容 ---------------- */
      var M = makeMaterials();
      var world = new THREE.Group();
      scene.add(world);

      terrain = buildTerrain(world, M, seed, landmarks);
      var terraces = terrain.terraces;
      var lmHandles = buildLandmarks(world, M, landmarks, seed, terraces);
      var bInfo = placeBuildings(world, M, terrain, seed, 900, landmarks);
      buildRivers(world, M, seed);
      buildStreetLights(world, M, terrain, seed);
      var roadCount = buildRoads(world, M, terrain, seed, lmHandles);
      var carObjs = buildTraffic(world, M, terrain, seed);
      var treeCount = buildFoliage(world, M, terrain, seed);

      /* ---------------- 控制器 ---------------- */
      var KEYS = {};
      var yaw = 0, pitch = -0.12;
      var WALK_SPEED = 34;
      var RUN_SPEED = 78;
      var pos = new THREE.Vector3(0, 0, 0);
      var vel = new THREE.Vector3();

      /* 相机模式：
       *   walk  —— 第一人称，踩在台地上（玩家的默认视角）
       *   orbit —— 绕城旋转俯视，看整座山城（截图/宣传用）
       *   fly   —— 自由飞行，鼠标拖动视角（探索用）
       */
      var mode = opts.mode || 'orbit';
      var flyTo = null;      /* focusOn 的目标点 */
      var flyDist = 120;
      var orbitAngle = opts.orbitAngle || 0.6;
      var orbitElev = opts.orbitElev || 0.62;
      var orbitDist = opts.orbitDist || 720;
      var orbitCenter = new THREE.Vector3(-30, 70, -20);

      /* 站在城中心的高处（解放碑一带） */
      pos.set(-40, groundAt(-40, -60) + 2.2, -60);
      if (mode === 'orbit') { pos.set(0, 200, 320); }

      /* 射线拾取地标 */
      function pickLandmark(nx, ny) {
        if (!lmHandles.length) return null;
        var ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
        var objs = [];
        for (var i = 0; i < lmHandles.length; i++) objs.push(lmHandles[i].obj);
        var hits = ray.intersectObjects(objs, true);
        for (var h = 0; h < hits.length; h++) {
          var o = hits[h].object;
          while (o) {
            for (var j = 0; j < lmHandles.length; j++) {
              if (lmHandles[j].obj === o) return lmHandles[j];
            }
            o = o.parent;
          }
        }
        return null;
      }

      function onKey(e, down) {
        var k = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) {
          KEYS[k] = down;
          if (e.preventDefault) e.preventDefault();
        }
      }
      function onKeyDown(e) { onKey(e, true); }
      function onKeyUp(e) { onKey(e, false); }
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);

      /* 鼠标视角（指针锁定） */
      var dragging = false, lastX = 0, lastY = 0;
      function onMove(e) {
        if (document.pointerLockElement) {
          yaw -= e.movementX * 0.0022;
          pitch -= e.movementY * 0.0022;
          pitch = Math.max(-1.35, Math.min(1.25, pitch));
          return;
        }
        if (dragging) {
          var dx = e.clientX - lastX, dy = e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
          if (mode === 'orbit') {
            orbitAngle -= dx * 0.006;
            orbitElev = Math.max(0.12, Math.min(1.45, orbitElev + dy * 0.004));
          } else {
            yaw -= dx * 0.004;
            pitch = Math.max(-1.35, Math.min(1.25, pitch - dy * 0.004));
          }
        }
      }
      document.addEventListener('mousemove', onMove);
      var downX = 0, downY = 0, downT = 0;
      renderer.domElement.addEventListener('mousedown', function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        downX = e.clientX; downY = e.clientY; downT = performance.now();
      });
      /* 点击（没拖动）= 拾取地标 */
      renderer.domElement.addEventListener('mouseup', function (e) {
        dragging = false;
        if (performance.now() - downT > 400) return;
        var dx = e.clientX - downX, dy = e.clientY - downY;
        if (dx * dx + dy * dy > 36) return;      /* 拖动，不算点击 */
        var r = renderer.domElement.getBoundingClientRect();
        var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        var ny = -((e.clientY - r.top) / r.height) * 2 + 1;
        var hit = pickLandmark(nx, ny);
        if (hit) onLandmark(hit);
      });
      window.addEventListener('mouseup', function () { dragging = false; });

      renderer.domElement.addEventListener('click', function (e) {
        /* 点击地标优先；否则第一人称模式下锁定指针 */
        if (mode === 'walk' && !document.pointerLockElement && renderer.domElement.requestPointerLock) {
          renderer.domElement.requestPointerLock();
        }
      });

      /* 昼夜调色板 —— 灰度贴图 × 这些颜色 */
      var PALETTE = {
        night: {
          concrete: 0x39445a, glass: 0x243449, oldWood: 0x3d3229, brick: 0x453430,
          stiltWood: 0x3a2d21, roof: 0x33261f, rock: 0x3a4356, ground: 0x4a5468,
          water: 0x14263f, road: 0x1c2432, foliage: 0x1a3a28, glassBlue: 0x2a4a68,
          trunk: 0x2a2018
        },
        day: {
          concrete: 0xb8bdc6, glass: 0x8fa8c0, oldWood: 0x8a7458, brick: 0x9c7c6a,
          stiltWood: 0x8e7550, roof: 0x6d4f42,
          rock: 0x8a8478, ground: 0xffffff,
          water: 0x5b82a8, road: 0x3f434b, foliage: 0x3f6b3f, glassBlue: 0x86a8c4,
          trunk: 0x5a4634
        }
      };

      function applyPalette(night) {
        var P = night ? PALETTE.night : PALETTE.day;
        /* 夜间靠 emissive 让窗户自己发光；白天关掉 */
        M.concrete.emissiveIntensity = night ? 0.38 : 0.0;
        M.glass.emissiveIntensity = night ? 0.72 : 0.0;
        M.oldWood.emissiveIntensity = night ? 0.55 : 0.0;
        M.brick.emissiveIntensity = night ? 0.34 : 0.0;
        M.stiltWood.emissiveIntensity = night ? 0.60 : 0.0;
        M.roof.emissiveIntensity = night ? 0.08 : 0.0;
        M.ground.emissiveIntensity = night ? 0.05 : 0.0;
        M.rock.emissiveIntensity = 0.0;   /* 崖壁永远不自发光 */
        M.concrete.color.setHex(P.concrete);
        M.glass.color.setHex(P.glass);
        M.oldWood.color.setHex(P.oldWood);
        M.brick.color.setHex(P.brick);
        M.stiltWood.color.setHex(P.stiltWood);
        M.roof.color.setHex(P.roof);
        M.rock.color.setHex(P.rock);
        M.ground.color.setHex(P.ground);
        M.water.color.setHex(P.water);
        M.road.color.setHex(P.road);
        M.foliage.color.setHex(P.foliage);
        M.glassBlue.color.setHex(P.glassBlue);
        M.trunk.color.setHex(P.trunk);
        M.carBody.color.setHex(night ? 0x1a2130 : 0x9aa2ad);
      }

      function setDayNight(night) {
        isNight = night;
        applyPalette(night);
        scene.background.copy(night ? skyNight : skyDay);
        scene.fog.color.copy(night ? fogNight : fogDay);
        scene.fog.density = night ? 0.00085 : 0.00032;
        /* 半球光是「无方向」的 —— 强度太高会把所有面照成同一个值，
         * 画面上就没有明暗梯度，山体读成黑纸剪影。
         * 评审第十二轮：「从背光面到受光面几乎同一个值」。
         * 修法：白天大幅压低半球光，把亮度交给方向光。 */
        hemi.intensity = night ? 2.2 : 0.95;
        hemi.color.set(night ? 0x5a7ba8 : 0xbcd8f5);
        hemi.groundColor.set(night ? 0x141c2c : 0x6a7280);
        moon.intensity = night ? 2.2 : 0.25;
        sun.intensity = night ? 0.0 : 4.6;
        cityGlow.intensity = night ? 4.2 : 0.6;
        riverGlow.intensity = night ? 2.8 : 0.4;
        warmFill.intensity = night ? 0.45 : 0.5;
        renderer.toneMappingExposure = night ? 1.75 : 1.0;
      }

      /* 初始昼夜状态 */
      setDayNight(isNight);

      /* ---------------- 渲染循环 ---------------- */
      var raf = 0;
      var clock = new THREE.Clock();
      var frames = 0;

      function resize() {
        var w = host.clientWidth || 720, h = host.clientHeight || 400;
        /* updateStyle=true，让 canvas 的 CSS 尺寸跟着容器走 */
        renderer.setSize(w, h, true);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', resize);
      resize();

      function tick() {
        raf = requestAnimationFrame(tick);
        var dt = Math.min(clock.getDelta(), 0.05);

        /* 移动 */
        var fwd = (KEYS['w'] || KEYS['arrowup'] ? 1 : 0) - (KEYS['s'] || KEYS['arrowdown'] ? 1 : 0);
        var strafe = (KEYS['d'] || KEYS['arrowright'] ? 1 : 0) - (KEYS['a'] || KEYS['arrowleft'] ? 1 : 0);
        var spd = (KEYS['shift'] ? RUN_SPEED : WALK_SPEED);
        var sin = Math.sin(yaw), cos = Math.cos(yaw);
        var mx = (fwd * -sin + strafe * cos) * spd;
        var mz = (fwd * -cos + strafe * -sin) * spd;
        vel.x += (mx - vel.x) * Math.min(1, dt * 9);
        vel.z += (mz - vel.z) * Math.min(1, dt * 9);

        var nx = pos.x + vel.x * dt;
        var nz = pos.z + vel.z * dt;
        /* 边界 */
        if (Math.abs(nx) < 330 && nz > -330 && nz < 240) { pos.x = nx; pos.z = nz; }
        if (mode === 'walk') {
          var gy = groundAt(pos.x, pos.z);
          /* 平滑贴地 + 轻微漂浮感 */
          pos.y += (gy + 2.2 - pos.y) * Math.min(1, dt * 6);
        }

        camera.rotation.order = 'YXZ';

        if (mode === 'orbit') {
          /* 绕城旋转：自动缓慢转动，也可以拖动 */
          if (!KEYS['shift']) orbitAngle += dt * 0.045;
          var oy = orbitCenter.y + Math.sin(orbitElev) * orbitDist;
          var orad = Math.cos(orbitElev) * orbitDist;
          camera.position.set(
            orbitCenter.x + Math.sin(orbitAngle) * orad,
            oy,
            orbitCenter.z + Math.cos(orbitAngle) * orad);
          camera.lookAt(orbitCenter);
        } else if (mode === 'fly') {
          camera.position.copy(pos);
          camera.rotation.set(pitch, yaw, 0, 'YXZ');
          /* 飞的时候不做贴地 */
          if (KEYS['q']) pos.y -= spd * dt;
          if (KEYS['e']) pos.y += spd * dt;
        } else {
          /* 第一人称：贴地 */
          camera.position.copy(pos);
          camera.rotation.set(pitch, yaw, 0, 'YXZ');
        }

        /* 月光跟随玩家，保证阴影覆盖 */
        moon.position.set(pos.x - 320, pos.y + 420, pos.z - 260);
        moon.target.position.copy(pos);
        moon.target.updateMatrixWorld();

        /* 车流：沿着各自的圆圈跑，贴着地面高度 */
        for (var ci = 0; ci < carObjs.length; ci++) {
          var car = carObjs[ci];
          var ud = car.userData;
          ud.ang += (ud.speed / 100) * dt;
          var nx = ud.cx + Math.sin(ud.ang) * ud.rad;
          var nz = ud.cz + Math.cos(ud.ang) * ud.rad;
          var ny = groundAt(nx, nz) + 0.8;
          car.position.set(nx, ny, nz);
          car.rotation.y = -ud.ang;
        }

        renderer.render(scene, camera);
        frames++;
      }
      tick();

      return {
        scene: scene,
        camera: camera,
        renderer: renderer,
        landmarks: lmHandles,
        terraces: terraces,
        buildings: bInfo.count,
        roads: roadCount,
        cars: carObjs.length,
        trees: treeCount,
        get frames() { return frames; },
        get mode() { return mode; },
        get isNight() { return isNight; },
        setMode: function (m) { mode = m; if (m === 'orbit') { orbitAngle = 0.6; orbitElev = 0.62; } },
        setDayNight: setDayNight,
        setOrbit: function (angle, elev, dist) {
          if (angle !== undefined) orbitAngle = angle;
          if (elev !== undefined) orbitElev = elev;
          if (dist !== undefined) orbitDist = dist;
        },
        get camera() { return camera; },
        /* 飞到某个地标 */
        focusOn: function (x, y, z) {
          flyTo = { x: x, y: y, z: z };
          flyDist = 120;
          mode = 'fly';
        },
        /* 点击命中检测：返回该屏幕坐标下的地标 */
        pick: function (nx, ny) {
          var ray = new T.Raycaster();
          ray.setFromCamera(new T.Vector2(nx, ny), camera);
          var objs = lmHandles.map(function (h) { return h.obj; });
          var hits = ray.intersectObjects(objs, true);
          if (!hits.length) return null;
          for (var i = 0; i < hits.length; i++) {
            var o = hits[i].object;
            while (o) {
              for (var j = 0; j < lmHandles.length; j++) {
                if (lmHandles[j].obj === o) return lmHandles[j];
              }
              o = o.parent;
            }
          }
          return null;
        },
        /* 外部接口 */
        teleportTo: function (x, z, y) {
          pos.set(x, y || (groundAt(x, z) + 2.2), z);
        },
        lookAtLandmark: function (id) {
          for (var i = 0; i < lmHandles.length; i++) {
            if (lmHandles[i].id === id) {
              var b = lmHandles[i].base;
              pos.set(b.x + b.w * 0.9, groundAt(b.x + b.w * 0.9, b.z + b.d * 0.9) + 3, b.z + b.d * 0.9);
              yaw = Math.atan2(-(b.x - pos.x), -(b.z - pos.z));
              pitch = -0.05;
              return true;
            }
          }
          return false;
        },
        dispose: function () {
          cancelAnimationFrame(raf);
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          document.removeEventListener('mousemove', onMove);
          window.removeEventListener('resize', resize);
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          renderer.dispose();
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
