/* 渝你有约 — P0 视图层
 * 8D 城市剖面 SVG 渲染器。核心资产：生命剖面图（分享卡）。
 */
  var CAUSE_EN = { disease: 'of illness', accident: 'in an accident' };
(function (root) {
  'use strict';

  var W = 320, H = 460;          // 剖面图画布
  var PAD_L = 26, PAD_R = 14, PAD_T = 26, PAD_B = 30;
  var PLOT_W = W - PAD_L - PAD_R;
  var PLOT_H = H - PAD_T - PAD_B;

  // 8 层 → 剖面纵向位置（y 越大越靠下 = 越接近江面/地面）
  // L0 地下在最底，L7 天台在最顶
  var LAYOUT = [
    { id: 'L7', label: 'L7', zh: '天台', en: 'Rooftop', y: 0.00 },
    { id: 'L6', label: 'L6', zh: '塔楼', en: 'Tower', y: 0.13 },
    { id: 'L5', label: 'L5', zh: '居住', en: 'Residential', y: 0.28 },
    { id: 'L4', label: 'L4', zh: '梯坎', en: 'Stairs', y: 0.43 },
    { id: 'L3', label: 'L3', zh: '街面', en: 'Street', y: 0.58 },
    { id: 'L2', label: 'L2', zh: '桥层', en: 'Bridge', y: 0.70 },
    { id: 'L1', label: 'L1', zh: '江面', en: 'River', y: 0.84 },
    { id: 'L0', label: 'L0', zh: '地下', en: 'Underground', y: 0.95 }
  ];

  function layerY(id) {
    for (var i = 0; i < LAYOUT.length; i++) {
      if (LAYOUT[i].id === id) return LAYOUT[i].y;
    }
    return 0.5;
  }

  /* 楼层 → y 坐标。楼层越高越靠上（y 越小）。
   * 楼内 24 层映射到 L4..L7 区间（街面层之上），中间还有 L5/L6。 */
  function floorToY(building, floor) {
    var top = layerY('L6');          // 塔楼层顶
    var base = layerY('L4');         // 梯坎层底（街面 L3 之上）
    var ratio = building.floors > 1 ? (floor - 1) / (building.floors - 1) : 0;
    // 楼内再细分：把楼层分到 L4→L5→L6 三段
    var span = base - top;
    var seg = Math.min(2, Math.floor(ratio * 3));
    var withinSeg = (ratio * 3) - seg;
    var segStart = [base, (base + top) / 2, top][seg];
    var segEnd = [(base + top) / 2, top, top][seg];
    var y = segStart + (segEnd - segStart) * withinSeg;
    return y;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 剖面图：底图 ---------- */
  function drawSection(opts) {
    var building = opts.building;
    var lifeFloor = opts.floor;
    var path = opts.path || [];
    var lang = opts.lang || 'en';
    var out = [];

    out.push('<svg class="crosssection" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img">');
    out.push('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#0d1b2a"/><stop offset="45%" stop-color="#1b263b"/>' +
      '<stop offset="100%" stop-color="#415a77"/></linearGradient>' +
      '<linearGradient id="river" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#2a9d8f"/><stop offset="100%" stop-color="#1b6b63"/></linearGradient>' +
      '<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#3d3226"/><stop offset="100%" stop-color="#241c14"/></linearGradient>' +
      '</defs>');

    // 天空 / 背景
    out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#sky)"/>');

    // 层带
    LAYOUT.forEach(function (L) {
      var y = PAD_T + L.y * PLOT_H;
      var h = (LAYOUT.indexOf(L) < LAYOUT.length - 1
        ? (LAYOUT[LAYOUT.indexOf(L) + 1].y - L.y) : (1 - L.y)) * PLOT_H;
      var fill = L.id === 'L1' ? 'url(#river)' :
                 (L.id === 'L0' ? 'url(#ground)' : 'rgba(255,255,255,0.028)');
      out.push('<rect x="' + PAD_L + '" y="' + y.toFixed(1) + '" width="' + PLOT_W +
        '" height="' + h.toFixed(1) + '" fill="' + fill + '"/>');
      out.push('<line x1="' + PAD_L + '" y1="' + y.toFixed(1) + '" x2="' + (W - PAD_R) +
        '" y2="' + y.toFixed(1) + '" stroke="rgba(140,180,220,0.22)" stroke-width="1"/>');
      out.push('<text x="' + (PAD_L - 4) + '" y="' + (y + 9).toFixed(1) +
        '" text-anchor="end" font-size="7.5" fill="rgba(200,220,240,0.62)" font-family="monospace">' + L.label + '</text>');
    });

    // 长江 / 嘉陵江交汇示意
    var riverY = PAD_T + layerY('L1') * PLOT_H;
    out.push('<path d="M' + PAD_L + ' ' + riverY.toFixed(1) + ' Q ' + (PAD_L + PLOT_W * 0.35).toFixed(1) + ' ' +
      (riverY - 7).toFixed(1) + ' ' + (PAD_L + PLOT_W * 0.62).toFixed(1) + ' ' + riverY.toFixed(1) +
      ' T ' + (W - PAD_R) + ' ' + (riverY - 4).toFixed(1) +
      '" stroke="rgba(120,230,210,0.5)" stroke-width="1.2" fill="none"/>');

    // 桥层：层间斜坡示意（重庆的桥都是斜的）
    var bridgeY = PAD_T + layerY('L2') * PLOT_H;
    var streetY = PAD_T + layerY('L3') * PLOT_H;
    out.push('<path d="M' + (PAD_L + 18).toFixed(1) + ' ' + streetY.toFixed(1) +
      ' L ' + (PAD_L + PLOT_W * 0.72).toFixed(1) + ' ' + (bridgeY - 4).toFixed(1) +
      '" stroke="rgba(255,190,110,0.55)" stroke-width="2" fill="none"/>');
    out.push('<path d="M' + (PAD_L + PLOT_W * 0.72).toFixed(1) + ' ' + (bridgeY - 4).toFixed(1) +
      ' L ' + (W - PAD_R - 14).toFixed(1) + ' ' + streetY.toFixed(1) +
      '" stroke="rgba(255,190,110,0.55)" stroke-width="2" fill="none"/>');

    // 建筑：竖向塔体
    var bH = building.heightM || 30;
    var towerTopF = building.floors;
    var yTop = PAD_T + floorToY(building, towerTopF) * PLOT_H;
    var yBase = PAD_T + floorToY(building, 1) * PLOT_H;
    var bx = PAD_L + PLOT_W * 0.24;
    var bw = PLOT_W * 0.52;
    out.push('<rect x="' + bx.toFixed(1) + '" y="' + yTop.toFixed(1) + '" width="' + bw.toFixed(1) +
      '" height="' + Math.max(6, (yBase - yTop)).toFixed(1) +
      '" fill="rgba(230,240,255,0.07)" stroke="rgba(200,220,245,0.42)" stroke-width="1.2"/>');

    // 入口层标记（白象居式多入口）
    (building.entrances || [1]).forEach(function (ef) {
      var y = PAD_T + floorToY(building, ef) * PLOT_H;
      out.push('<line x1="' + (bx - 7).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + bx.toFixed(1) +
        '" y2="' + y.toFixed(1) + '" stroke="#e8b464" stroke-width="2"/>');
    });

    // 楼层刻度
    var step = building.floors > 20 ? 6 : (building.floors > 10 ? 4 : 2);
    for (var f = 1; f <= building.floors; f += step) {
      var y = PAD_T + floorToY(building, f) * PLOT_H;
      out.push('<line x1="' + bx.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (bx + 12).toFixed(1) +
        '" y2="' + y.toFixed(1) + '" stroke="rgba(200,220,245,0.30)" stroke-width="0.7"/>');
      out.push('<text x="' + (bx - 10).toFixed(1) + '" y="' + (y + 2.5).toFixed(1) +
        '" text-anchor="end" font-size="6" fill="rgba(190,210,235,0.5)" font-family="monospace">' + f + 'F</text>');
    }

    // 人生轨迹折线：x = 年龄, y = 楼层高度（随年龄不变，因为这是"你住几楼"的命运）
    // 折线叠加 4 条状态轴在剖面右侧
    if (path.length > 1) {
      var maxAge = path[path.length - 1].age || 1;
      var px = function (age) { return PAD_L + (age / Math.max(1, maxAge)) * PLOT_W * 0.92; };
      var py = function (floor) { return PAD_T + floorToY(building, floor) * PLOT_H; };
      var d = '';
      for (var i = 0; i < path.length; i++) {
        d += (i === 0 ? 'M' : 'L') + px(path[i].age).toFixed(1) + ' ' + py(path[i].floor).toFixed(1) + ' ';
      }
      out.push('<path d="' + d + '" stroke="#ffd166" stroke-width="2" fill="none" stroke-linejoin="round"/>');
      // 终点
      var last = path[path.length - 1];
      out.push('<circle cx="' + px(last.age).toFixed(1) + '" cy="' + py(last.floor).toFixed(1) +
        '" r="3.4" fill="' + (last.dead ? '#e05a5a' : '#ffd166') + '"/>');
    }

    // 楼层标记点（你的家）
    var hy = PAD_T + floorToY(building, lifeFloor) * PLOT_H;
    out.push('<circle cx="' + (bx + bw * 0.5).toFixed(1) + '" cy="' + hy.toFixed(1) +
      '" r="4.6" fill="none" stroke="#ffd166" stroke-width="2"/>');
    out.push('<circle cx="' + (bx + bw * 0.5).toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="1.8" fill="#ffd166"/>');

    // 状态轴曲线（右侧小图）
    var AXC = [
      { id: 'wealth', c: '#4cc9f0' },
      { id: 'health', c: '#80ed99' },
      { id: 'happiness', c: '#ffafcc' },
      { id: 'knowledge', c: '#c7b8ff' }
    ];
    AXC.forEach(function (ax) {
      if (!path.length) return;
      var d2 = '';
      for (var j = 0; j < path.length; j++) {
        var xx = PAD_L + (path[j].age / Math.max(1, maxAge)) * PLOT_W * 0.92;
        var yy = PAD_T + PLOT_H * (1 - path[j][ax.id] / 100) * 0.42 + PLOT_H * 0.55;
        d2 += (j === 0 ? 'M' : 'L') + xx.toFixed(1) + ' ' + yy.toFixed(1) + ' ';
      }
      out.push('<path d="' + d2 + '" stroke="' + ax.c + '" stroke-width="1.3" fill="none" opacity="0.85"/>');
    });

    // 标题
    out.push('<text x="' + PAD_L + '" y="15" font-size="11" font-weight="bold" fill="#ffd166" font-family="sans-serif">' +
      esc(lang === 'zh' ? '生命剖面图' : 'LIFE CROSS-SECTION') + '</text>');
    out.push('<text x="' + (W - PAD_R) + '" y="15" text-anchor="end" font-size="8" fill="rgba(220,235,250,0.75)" font-family="sans-serif">' +
      esc(lang === 'zh' ? '第 ' + (opts.floor) + ' 层' : 'Floor ' + (opts.floor)) + '</text>');

    out.push('</svg>');
    return out.join('');
  }

  /* ---------- 分享卡（更大尺寸，含数据） ---------- */
  function drawShareCard(result, opts) {
    var lang = (opts && opts.lang) || 'en';
    var st = result.state, birth = result.birth;
    var prof = result.profile;
    var CW = 640, CH = 400;
    var out = [];
    out.push('<svg class="sharecard" viewBox="0 0 ' + CW + ' ' + CH + '" xmlns="http://www.w3.org/2000/svg">');
    out.push('<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#0d1b2a"/><stop offset="55%" stop-color="#1b263b"/>' +
      '<stop offset="100%" stop-color="#0b1622"/></linearGradient>' +
      '<linearGradient id="riv" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#2a9d8f"/><stop offset="100%" stop-color="#164e49"/></linearGradient></defs>');
    out.push('<rect width="' + CW + '" height="' + CH + '" fill="url(#bg)"/>');

    // 左侧：剖面（复用 drawSection 的逻辑，简化版）
    var b = st.home;
    var maxAge = st.finalAge || 1;
    var SX = 30, SY = 46, SW = 300, SH = 330;
    var bx = SX + 62, bw = 150;
    var yTop = SY + floorToY(b, b.floors) * SH;
    var yBase = SY + floorToY(b, 1) * SH;

    // 江面
    var riverY = SY + layerY('L1') * SH;
    out.push('<rect x="' + SX + '" y="' + riverY.toFixed(1) + '" width="' + SW + '" height="' + (SH - (riverY - SY)).toFixed(1) + '" fill="url(#riv)" opacity="0.55"/>');
    // 街面
    var streetY = SY + layerY('L3') * SH;
    out.push('<rect x="' + SX + '" y="' + streetY.toFixed(1) + '" width="' + SW + '" height="' + (riverY - streetY).toFixed(1) + '" fill="#2b2419"/>');
    out.push('<line x1="' + SX + '" y1="' + streetY.toFixed(1) + '" x2="' + (SX + SW) + '" y2="' + streetY.toFixed(1) + '" stroke="rgba(240,220,180,0.55)" stroke-width="1.4"/>');

    // 塔体
    out.push('<rect x="' + bx + '" y="' + yTop.toFixed(1) + '" width="' + bw + '" height="' + Math.max(8, (yBase - yTop)).toFixed(1) +
      '" fill="rgba(230,240,255,0.09)" stroke="rgba(200,220,245,0.45)" stroke-width="1.4"/>');
    // 入口
    (b.entrances || [1]).forEach(function (ef) {
      var y = SY + floorToY(b, ef) * SH;
      out.push('<line x1="' + (bx - 8) + '" y1="' + y.toFixed(1) + '" x2="' + bx + '" y2="' + y.toFixed(1) + '" stroke="#e8b464" stroke-width="2.4"/>');
    });
    // 楼层线
    for (var f = 1; f <= b.floors; f += (b.floors > 20 ? 6 : 4)) {
      var y = SY + floorToY(b, f) * SH;
      out.push('<line x1="' + bx + '" y1="' + y.toFixed(1) + '" x2="' + (bx + 10) + '" y2="' + y.toFixed(1) + '" stroke="rgba(200,220,245,0.32)" stroke-width="0.8"/>');
      out.push('<text x="' + (bx - 11) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="8" fill="rgba(200,215,235,0.55)" font-family="monospace">' + f + '</text>');
    }

    // 人生轨迹（楼层线）
    var path = st.path;
    if (path.length > 1) {
      var px = function (age) { return SX + 18 + (age / Math.max(1, maxAge)) * (SW - 36); };
      var py = function (fl) { return SY + floorToY(b, fl) * SH; };
      var d = '';
      for (var i = 0; i < path.length; i++) d += (i ? 'L' : 'M') + px(path[i].age).toFixed(1) + ' ' + py(path[i].floor).toFixed(1) + ' ';
      out.push('<path d="' + d + '" stroke="#ffd166" stroke-width="2.4" fill="none" stroke-linejoin="round"/>');
      var last = path[path.length - 1];
      out.push('<circle cx="' + px(last.age).toFixed(1) + '" cy="' + py(last.floor).toFixed(1) + '" r="4" fill="' + (last.dead ? '#e05a5a' : '#ffd166') + '"/>');
    }
    // 家
    var hy = SY + floorToY(b, st.homeFloor) * SH;
    out.push('<circle cx="' + (bx + bw * 0.5) + '" cy="' + hy.toFixed(1) + '" r="6" fill="none" stroke="#ffd166" stroke-width="2.4"/>');
    out.push('<circle cx="' + (bx + bw * 0.5) + '" cy="' + hy.toFixed(1) + '" r="2.4" fill="#ffd166"/>');

    // 状态轴曲线叠在剖面下三分之一
    var AXC = [
      { id: 'wealth', c: '#4cc9f0', l: 'W' },
      { id: 'health', c: '#80ed99', l: 'H' },
      { id: 'happiness', c: '#ffafcc', l: 'F' },
      { id: 'knowledge', c: '#c7b8ff', l: 'K' }
    ];
    AXC.forEach(function (ax) {
      var d2 = '';
      for (var j = 0; j < path.length; j++) {
        var xx = SX + 18 + (path[j].age / Math.max(1, maxAge)) * (SW - 36);
        var yy = SY + SH - 8 - (path[j][ax.id] / 100) * 70;
        d2 += (j ? 'L' : 'M') + xx.toFixed(1) + ' ' + yy.toFixed(1) + ' ';
      }
      out.push('<path d="' + d2 + '" stroke="' + ax.c + '" stroke-width="1.8" fill="none" opacity="0.9"/>');
    });

    // 右侧信息
    var TX = 360;
    out.push('<text x="' + TX + '" y="30" font-size="19" font-weight="bold" fill="#ffd166" font-family="sans-serif">A DATE WITH CHONGQING</text>');
    out.push('<text x="' + TX + '" y="46" font-size="10" fill="rgba(220,235,250,0.6)" font-family="sans-serif">THE 8D CITY · One life. One city. No re-rolls.</text>');
    out.push('<line x1="' + TX + '" y1="56" x2="' + (CW - 24) + '" y2="56" stroke="rgba(200,220,245,0.25)"/>');

    var jobName = st.job ? (lang === 'zh' ? st.job.zh : st.job.en) : (lang === 'zh' ? '无' : 'none');
    var homeName = lang === 'zh' ? (st.home.zh || st.home.en) : (st.home.en || st.home.zh);
    // 出生地是抽签结果；住的地方可能后来变了（5 岁搬家等）——
    // 卡片要显示「你实际生活的区县」，否则会出现「出生潼南却住渝中楼」的矛盾
    var liveDistrict = st.livingDistrict || birth.district;
    var liveDistrictEn = st.livingDistrictEn || birth.districtEn;
    var bornIn = lang === 'zh'
      ? birth.district + (liveDistrict !== birth.district ? ' → ' + liveDistrict : '') + ' · ' + birth.familyZh
      : birth.districtEn + (liveDistrict !== birth.district ? ' → ' + liveDistrictEn : '') + ' · ' + birth.familyEn;
    var causeTxt = (lang === 'zh') ? (st.causeOfDeathZh || st.causeOfDeath || '在世')
                                 : (CAUSE_EN[st.causeOfDeath] || st.causeOfDeath || 'alive');
    var lifeLine = st.finalAge + (lang === 'zh' ? ' 岁 · ' : ' years · ') + causeTxt;
    var originLine = lang === 'zh' ? (birth.urban ? '城镇家庭' : '农村家庭')
                                   : (birth.urban ? 'Urban household' : 'Rural household');
    var floorLine = lang === 'zh' ? (homeName + ' ' + st.homeFloor + ' 楼')
                                  : (homeName + ', floor ' + st.homeFloor);
    var commLine = Math.round(prof.commuteMin) + (lang === 'zh' ? ' 分钟／趟' : ' min each way');
    var finalLine = (lang === 'zh'
      ? ['财富', '健康', '幸福', '知识']
      : ['Wealth', 'Health', 'Joy', 'Knowledge'])
      .map(function (k, i) { return k + ' ' + Math.round([st.wealth, st.health, st.happiness, st.knowledge][i]); })
      .join(' · ');

    var rows = lang === 'zh' ? [
      ['出生地', bornIn],
      ['出身', originLine],
      ['人生', lifeLine],
      ['住', floorLine],
      ['通勤', commLine],
      ['职业', jobName],
      ['终局', finalLine]
    ] : [
      ['Born in', bornIn],
      ['Origin', originLine],
      ['Life', lifeLine],
      ['Home', floorLine],
      ['Commute', commLine],
      ['Work', jobName],
      ['Final', finalLine]
    ];
    var y = 76;
    rows.forEach(function (r) {
      out.push('<text x="' + TX + '" y="' + y + '" font-size="9" fill="rgba(190,215,240,0.55)" font-family="sans-serif">' + esc(r[0]) + '</text>');
      out.push('<text x="' + TX + '" y="' + (y + 13) + '" font-size="11.5" fill="#eaf2ff" font-family="sans-serif">' + esc(r[1]) + '</text>');
      y += 36;
    });

    // 结语（如果有）：分享卡最有传播力的部分
    if (st.epilogue) {
      var epiTitle = lang === 'zh' ? st.epilogue.titleZh : st.epilogue.titleEn;
      var epiText = lang === 'zh' ? st.epilogue.zh : st.epilogue.en;
      out.push('<line x1="' + TX + '" y1="' + (y - 8) + '" x2="' + (CW - 24) + '" y2="' + (y - 8) +
        '" stroke="rgba(200,220,245,0.18)"/>');
      out.push('<text x="' + TX + '" y="' + (y + 8) + '" font-size="11" font-weight="bold" fill="#ffd166" font-family="sans-serif">' +
        esc(epiTitle) + '</text>');
      // 中文按字数截断，英文按单词截断
      var maxChars = lang === 'zh' ? 26 : 44;
      var epiShort = lang === 'zh'
        ? (epiText.length > maxChars ? epiText.slice(0, maxChars) + '…' : epiText)
        : (epiText.length > maxChars ? epiText.slice(0, epiText.lastIndexOf(' ', maxChars)) + '…' : epiText);
      out.push('<text x="' + TX + '" y="' + (y + 24) + '" font-size="9.5" fill="rgba(220,235,250,0.72)" font-family="sans-serif">' +
        esc(epiShort) + '</text>');
    }

    out.push('<text x="' + TX + '" y="' + (CH - 14) + '" font-size="8" fill="rgba(190,210,235,0.42)" font-family="sans-serif">' +
      esc(lang === 'zh' ? '数值来自重庆官方统计公报；故事为虚构，非个人预测' : 'Figures from official Chongqing statistics; the story is fiction, not a prediction') + '</text>');
    out.push('</svg>');
    return out.join('');
  }

  
  /* ---------- 同秒四人：四条剖面并排对比图 ----------
   * 这是短视频与社交平台最好的结构：四条命，四种楼层，一眼看出差别。
   * 每条剖面复用 drawSection 的层坐标，但压缩到窄条。
   */
  function drawCompare(lives, opts) {
    var lang = (opts && opts.lang) || 'en';
    var CW = 900, CH = 520;
    var out = [];
    var n = lives.length;
    var gap = 18;
    var padX = 26;
    var panelW = (CW - padX * 2 - gap * (n - 1)) / n;
    var panelH = 330;
    var topY = 74;

    out.push('<svg class="comparecard" viewBox="0 0 ' + CW + ' ' + CH + '" xmlns="http://www.w3.org/2000/svg">');
    out.push('<defs><linearGradient id="cmpbg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#0d1b2a"/><stop offset="55%" stop-color="#1b263b"/>' +
      '<stop offset="100%" stop-color="#0b1622"/></linearGradient>' +
      '<linearGradient id="cmpground" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#3d3226"/><stop offset="100%" stop-color="#241c14"/></linearGradient>' +
      '<linearGradient id="cmpriver" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#2a9d8f"/><stop offset="100%" stop-color="#1b6b63"/></linearGradient>' +
      '</defs>');

    // 背景
    out.push('<rect width="' + CW + '" height="' + CH + '" fill="url(#cmpbg)"/>');

    // 标题
    out.push('<text x="' + padX + '" y="34" font-size="20" font-weight="bold" fill="#eaf2ff" font-family="sans-serif">A DATE WITH CHONGQING</text>');
    out.push('<text x="' + padX + '" y="54" font-size="10" letter-spacing="2.6" fill="#ffd166" font-family="sans-serif">THE 8D CITY · ' +
      (lang === 'zh' ? '四条命，四层楼' : 'FOUR LIVES, FOUR FLOORS') + '</text>');

    lives.forEach(function (lv, i) {
      var st = lv.state, birth = lv.birth;
      var x = padX + i * (panelW + gap);
      var b = st.home;
      var floors = b.floors || 24;
      var segH = panelH / 8;
      var accent = ['#ffd166', '#4cc9f0', '#f72585', '#b8e986'][i % 4];

      // 面板底
      out.push('<rect x="' + x + '" y="' + topY + '" width="' + panelW + '" height="' + panelH +
        '" fill="rgba(255,255,255,0.03)" stroke="rgba(200,220,245,0.12)" rx="4"/>');

      // 剖面：8 层格
      for (var L = 0; L < 8; L++) {
        var ly = topY + L * segH;
        var fill = L === 0 ? 'rgba(43,157,143,0.35)'
          : (L === 7 ? 'rgba(255,209,102,0.16)' : 'rgba(255,255,255,0.02)');
        out.push('<rect x="' + (x + 6) + '" y="' + ly + '" width="' + (panelW - 12) + '" height="' + (segH - 2) +
          '" fill="' + fill + '" stroke="rgba(200,220,245,0.10)"/>');
        out.push('<text x="' + (x + 11) + '" y="' + (ly + 11) + '" font-size="8" fill="rgba(190,215,240,0.45)" font-family="sans-serif">L' + L + '</text>');
      }

      // 人物所在层的高亮条
      var li = 7 - Math.min(7, Math.max(0, Math.round((st.homeFloor - 1) / Math.max(1, floors - 1) * 7)));
      var hy = topY + li * segH;
      out.push('<rect x="' + (x + 6) + '" y="' + hy + '" width="' + (panelW - 12) + '" height="' + (segH - 2) +
        '" fill="none" stroke="' + accent + '" stroke-width="1.6" opacity="0.9"/>');

      // 生命轨迹：一条竖向折线，沿楼层随年份移动
      var pts = [];
      var path = st.path || [];
      for (var k = 0; k < path.length; k++) {
        var p = path[k];
        var fl = p.floor || st.homeFloor;
        var idx = 7 - Math.min(7, Math.max(0, Math.round((fl - 1) / Math.max(1, floors - 1) * 7)));
        var py = topY + idx * segH + segH / 2;
        var px = x + 12 + (k / Math.max(1, path.length - 1)) * (panelW - 24);
        pts.push(px.toFixed(1) + ',' + py.toFixed(1));
      }
      if (pts.length > 1) {
        out.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + accent +
          '" stroke-width="2" opacity="0.92" stroke-linejoin="round"/>');
      }

      // 楼层标签
      out.push('<text x="' + (x + panelW - 10) + '" y="' + (hy + 12) + '" font-size="9" text-anchor="end" fill="' + accent +
        '" font-family="sans-serif">' + st.homeFloor + 'F</text>');

      // 底部信息
      var ty = topY + panelH + 20;
      var jobName = st.job ? (lang === 'zh' ? st.job.zh : st.job.en) : (lang === 'zh' ? '无' : 'none');
      var lifeLine = st.finalAge + (lang === 'zh' ? ' 岁' : ' yrs');
      var moneyLine = (lang === 'zh' ? '净资产 ' : 'Net ') +
        (Math.round(st.money / 10000).toLocaleString('en-US') + (lang === 'zh' ? ' 万' : '0k'));
      var rows = lang === 'zh'
        ? [[lifeLine, jobName], [moneyLine, (lang === 'zh' ? '幸福 ' : 'Joy ') + Math.round(st.happiness)],
           [(lang === 'zh' ? '寿命 ' : 'Age ') + st.finalAge, (lang === 'zh' ? '健康 ' : 'HP ') + Math.round(st.health)]]
        : [[lifeLine, jobName], [moneyLine, 'Joy ' + Math.round(st.happiness)],
           ['Age ' + st.finalAge, 'HP ' + Math.round(st.health)]];
      rows.forEach(function (r, ri) {
        out.push('<text x="' + x + '" y="' + (ty + ri * 15) + '" font-size="9.5" fill="rgba(225,238,252,0.88)" font-family="sans-serif">' +
          esc(r[0]) + '</text>');
        out.push('<text x="' + (x + panelW) + '" y="' + (ty + ri * 15) + '" font-size="9.5" text-anchor="end" fill="' + accent +
          '" font-family="sans-serif">' + esc(r[1]) + '</text>');
      });

      // 结语
      if (st.epilogue) {
        var epi = lang === 'zh' ? st.epilogue.titleZh : st.epilogue.titleEn;
        out.push('<text x="' + x + '" y="' + (ty + 58) + '" font-size="10" font-weight="bold" fill="#ffd166" font-family="sans-serif">' +
          esc(epi) + '</text>');
      }
    });

    // 页脚
    out.push('<text x="' + padX + '" y="' + (CH - 16) + '" font-size="8" fill="rgba(190,215,240,0.45)" font-family="sans-serif">' +
      (lang === 'zh'
        ? '数值来自重庆官方统计公报；故事为虚构，非个人预测 · One life. One city. No re-rolls.'
        : 'Figures from official Chongqing statistics; the story is fiction · One life. One city. No re-rolls.') + '</text>');
    out.push('</svg>');
    return out.join('');
  }

root.CQVIEW = {
    drawSection: drawSection, drawShareCard: drawShareCard, drawCompare: drawCompare,
    floorToY: floorToY, layerY: layerY, LAYOUT: LAYOUT
  };
})(typeof window !== 'undefined' ? window : globalThis);
