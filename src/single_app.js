/* 渝你有约 — 单文件版应用层
 *
 * 这一层只做「编排」：把规则层（rules.js）、渲染层（city.js）、
 * 时间层（clock.js）、卡片层（card.js）串成一条主线。
 *
 * 硬约束（与站点版一致）：
 *   1. 零外部请求：没有图片、没有 CDN、没有 fetch。
 *   2. 零图片资源：所有视觉由 Canvas 2D / 内联 SVG 函数算出来。
 *   3. 确定性：同一个 seed + 同一串抉择 = 同一条人生。
 *   4. 楼层影响至少三项：通勤 / 租金 / 健康 / 幸福 / 关系（见 rules.js 的 floorProfile）。
 *
 * 多语言约定（沿用站点版的做法）：
 *   文案以「中文源串」为键。西语从内联的 i18n_es 包按 'ui:'+中文源串 查，
 *   那 53 条西语 UI 文案已随 i18n_es.js 一起进来了，这里不重复写。
 *   只有本站新加的文案需要在 ES_EXTRA 里补西语。
 */
(function (root) {
  'use strict';

  var R = root.CQRULES;
  var Card = root.CQCARD;
  var City = root.CQCITY;

  var LANGS = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'zh', label: '中文', short: '中文' },
    { code: 'es', label: 'Español', short: 'ES' }
  ];

  /* ---------- UI 词典：中文源串 → 英文 ---------- */
  var UI = {
    '渝你有约': 'A Date with Chongqing',
    '8D 魔幻山城': 'THE 8D CITY',
    '一生一城，不可重掷。': 'One life. One city. No re-rolls.',
    '投胎': 'Roll a birth',
    '按 37 个区县的出生人口权重抽取。': 'Weighted by real birth counts across 37 districts.',
    '一生只有一次': 'One life, once',
    '出生到死亡，不重掷、不复活。': 'Birth to death. No re-roll, no reset.',
    '游戏本体永远免费': 'Free forever',
    '付费只买纪念品，不改命。': 'You only pay for keepsakes, never for outcomes.',
    '住几楼是核心': 'The floor is the game',
    '楼层同时改写通勤、体力、租金、健康和关系。': 'Floor changes commute, stamina, rent, health and ties — at once.',
    '第一步：住在这座城市的哪个高度': 'Step 1 — Which height in the city',
    '第二步：住哪种房子': 'Step 2 — Which kind of home',
    '第三步：住第几楼': 'Step 3 — Which floor',
    '开门': 'Open the door',
    '分钟／天': 'min/day',
    '楼': 'F',
    '工作': 'Work',
    '住': 'Home',
    '净资产': 'Net worth',
    '岁': 'years old',
    '过一年': 'Live one year',
    '人生节点': 'Turning points',
    '你做过的决定': 'The decisions you made',
    '分享这条人生': 'Share this life',
    '复制分享文案': 'Copy share text',
    '复制分享链接': 'Copy share link',
    '已复制': 'Copied',
    '复制失败，请手动选择文本': 'Copy failed — select the text manually',
    '纪念卡': 'Commemorative card',
    '购买纪念卡 · $9': 'Buy the Commemorative Card · $9',
    '申请实体纪念卡': 'Request a physical card',
    '实体卡申请': 'Physical card request',
    '这些信息只用于寄卡。': 'We use this only to mail the card.',
    '提交申请': 'Request',
    '取消': 'Cancel',
    '请填写姓名、邮箱和地址。': 'Please fill in name, email and address.',
    '已保存。发货时我们会邮件通知你。': 'Saved. We will email you when it ships.',
    '你的卡面（纯代码绘制）': 'Your card, drawn in code',
    '重庆 · 8D 立体城': 'Chongqing · the 8D city',
    '地标': 'Landmarks',
    '这是别人分享给你的一生': 'This is a life someone shared with you',
    '活我自己的一生': 'Live my own life',
    '重新投胎': 'Roll a new birth',
    '1 现实小时 = 1 游戏年': '1 real hour = 1 in-game year',
    '距离下一年': 'next year in',
    '暂停': 'pause',
    '继续': 'play',
    '结局': 'How it ended',
    '出生年': 'Born',
    '垂直层': 'Height',
    '职业': 'Job',
    '去世': 'Died',
    '疾病': 'illness',
    '意外': 'accident',
    '财富': 'Wealth',
    '健康': 'Health',
    '幸福': 'Happiness',
    '体力': 'Stamina',
    '关系': 'Ties',
    '知识': 'Knowledge',
    '区县': 'District',
    '家庭': 'Family',
    '性别': 'Sex',
    '男': 'Male',
    '女': 'Female',
    '收入五分位': 'Income quintile',
    '城镇': 'Urban',
    '农村': 'Rural',
    '生于': 'Born',
    '纯代码生成：没有一张贴图，每一栋楼、每一扇窗都是函数算出来的。点地标进去看看。':
      'Drawn entirely in code: no textures, no models. Every building and every lit window is a function. Click a landmark to open it.',
    '一生一城。卡面记录的是你真实活过的那条人生——你的楼、你的楼层、你的年份。9 美元。游戏本体永远免费。':
      'One life, one city. The card records the life you actually lived — your block, your floor, your year. USD $9. The game itself stays free.',
    '同编号实体卡，线上申请，线下寄送。':
      'The same serial on paper. Request it online, we mail it.',
    '你看到的是他完整活过的一次——出生、选择、楼层、结局。现在换成你的。':
      'You are seeing one complete life: the birth, the choices, the floor, the ending. Now it is your turn.'
  };

  /* ---------- 西语补遗：内联包里没有的新文案 ---------- */
  var ES_EXTRA = {
    '渝你有约': 'Una cita con Chongqing',
    '8D 魔幻山城': 'LA CIUDAD 8D',
    /* 职业名：内联的西语包只翻了「职业结语」，没翻「职业名」 */
    '棒棒': 'Portador',
    '外卖骑手': 'Repartidor',
    '流水线工人': 'Operario de fábrica',
    '写字楼白领': 'Empleado de oficina',
    '教师': 'Docente',
    '护士': 'Enfermera',
    '货车／网约车司机': 'Camionero / taxista',
    '农民': 'Agricultor',
    '程序员': 'Programador',
    '小生意主': 'Pequeño comerciante',
    '手艺人': 'Artesano',
    '建筑工人': 'Peón de la construcción',
    /* 垂直层名 */
    '地下层': 'Sótano',
    '江面层': 'Nivel del río',
    '桥层': 'Nivel del puente',
    '街面层': 'Nivel de calle',
    '梯坎层': 'Nivel de escaleras',
    '居住层': 'Nivel residencial',
    '塔楼层': 'Nivel de torre',
    '天台层': 'Nivel de azotea',
    /* 楼型名（终局卡和分享文案里出现） */
    '无电梯梯坎楼': 'Bloque sin ascensor',
    '轻轨穿楼': 'Bloque atravesado por el metro',
    '电梯楼': 'Bloque con ascensor',
    '半地下室隔间': 'Sótano convertido en cuarto',
    '江边吊脚楼': 'Casa sobre pilotes junto al río',
    '桥下铺': 'Bajo el puente',
    '下店上住': 'Tienda abajo, casa arriba',
    '梯坎老楼': 'Bloque viejo de escaleras',
    '千禧老公房': 'Bloque del milenio',
    '江景塔楼': 'Torre con vistas al río',
    '顶层阁楼': 'Ático',
    '老旧小区': 'Barrio viejo',
    '苏式筒子楼': 'Bloque soviético',
    '工人新村': 'Villa de los trabajadores',
    '新建高层': 'Torre nueva',
    '一生一城，不可重掷。': 'Una vida. Una ciudad. Sin volver a tirar.',
    '游戏本体永远免费': 'El juego es gratis para siempre',
    '付费只买纪念品，不改命。': 'Solo se paga por los recuerdos, nunca por el destino.',
    '第一步：住在这座城市的哪个高度': 'Paso 1 — a qué altura de la ciudad vives',
    '第二步：住哪种房子': 'Paso 2 — qué tipo de casa',
    '第三步：住第几楼': 'Paso 3 — qué piso',
    '开门': 'Abrir la puerta',
    '分钟／天': 'min/día',
    '楼': 'P',
    '过一年': 'Vivir un año',
    '人生节点': 'Hitos',
    '你做过的决定': 'Las decisiones que tomaste',
    '分享这条人生': 'Comparte esta vida',
    '复制分享文案': 'Copiar texto',
    '复制分享链接': 'Copiar enlace',
    '已复制': 'Copiado',
    '复制失败，请手动选择文本': 'No se pudo copiar: selecciona el texto',
    '纪念卡': 'Tarjeta conmemorativa',
    '购买纪念卡 · $9': 'Comprar la tarjeta conmemorativa · $9',
    '申请实体纪念卡': 'Pedir una tarjeta física',
    '实体卡申请': 'Solicitud de tarjeta física',
    '这些信息只用于寄卡。': 'Solo usamos estos datos para enviar la tarjeta.',
    '提交申请': 'Enviar',
    '取消': 'Cancelar',
    '请填写姓名、邮箱和地址。': 'Rellena nombre, correo y dirección.',
    '已保存。发货时我们会邮件通知你。': 'Guardado. Te avisaremos por correo cuando se envíe.',
    '你的卡面（纯代码绘制）': 'Tu tarjeta, dibujada con código',
    '重庆 · 8D 立体城': 'Chongqing · la ciudad 8D',
    '结局': 'Cómo terminó',
    '出生年': 'Nacimiento',
    '去世': 'Murió',
    '疾病': 'enfermedad',
    '意外': 'accidente',
    '财富': 'Riqueza',
    '健康': 'Salud',
    '幸福': 'Felicidad',
    '体力': 'Energía',
    '关系': 'Vínculos',
    '知识': 'Conocimiento',
    '家庭': 'Familia',
    '性别': 'Sexo',
    '男': 'Hombre',
    '女': 'Mujer',
    '收入五分位': 'Quintil de ingresos',
    '城镇': 'Urbano',
    '农村': 'Rural',
    '纯代码生成：没有一张贴图，每一栋楼、每一扇窗都是函数算出来的。点地标进去看看。':
      'Dibujado enteramente con código: sin texturas ni modelos. Cada edificio y cada ventana iluminada es una función. Haz clic en un monumento para abrirlo.',
    '一生一城。卡面记录的是你真实活过的那条人生——你的楼、你的楼层、你的年份。9 美元。游戏本体永远免费。':
      'Una vida, una ciudad. La tarjeta registra la vida que viviste de verdad: tu bloque, tu piso, tu año. 9 USD. El juego sigue siendo gratis.',
    '同编号实体卡，线上申请，线下寄送。':
      'La misma tarjeta en papel: solicítala y te la enviamos.',
    '你看到的是他完整活过的一次——出生、选择、楼层、结局。现在换成你的。':
      'Estás viendo una vida completa: el nacimiento, las decisiones, el piso, el final. Ahora te toca a ti.'
  };

  /* UI 取值：es 先查内联的西语包，再查 ES_EXTRA，最后回落英文 */
  function U(zh, enOverride) {
    var en = enOverride || UI[zh] || zh;
    if (state.lang === 'zh') return zh;
    if (state.lang === 'es') {
      var v = (root.CQI18N && root.CQI18N.t) ? root.CQI18N.t('ui:' + zh, 'es') : null;
      if (v) return v;
      if (ES_EXTRA[zh]) return ES_EXTRA[zh];
    }
    return en;
  }

  /* 抉择文案：西语包 → 英文 → 中文 */
  function cText(id, fallbackZh, fallbackEn) {
    if (state.lang === 'es') {
      var v = (root.CQI18N && root.CQI18N.t) ? root.CQI18N.t(id, 'es') : null;
      if (v) return v;
    }
    if (state.lang === 'zh') return fallbackZh;
    return fallbackEn;
  }

  /* ---- 状态 ---- */
  var state = {
    lang: 'en', seed: 0, birthYear: 2000, birth: null,
    pickLayer: 'L5', pickBuilding: null, pickFloor: null,
    life: null, clock: null, clockBar: null, choiceLog: [],
    stage: 'birth', replayed: false, pendingDecision: null,
    lmPanel: null, cityView: null
  };

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function scrollTop() { try { window.scrollTo(0, 0); } catch (e) {} }

  /* ---- 投胎页 ---- */
  function renderBirth() {
    var app = $('app');
    app.innerHTML = '';
    state.stage = 'birth';

    var hero = el('div');
    hero.appendChild(el('h1', null, U('渝你有约')));
    hero.appendChild(el('div', 'sub', U('8D 魔幻山城') + ' · ' + U('一生一城，不可重掷。')));
    app.appendChild(hero);

    var yrRow = el('div', 'card');
    var lab = el('label', null, U('生于') + ' ');
    var sel = el('select');
    sel.id = 'year';
    [2008, 2006, 2004, 2002, 2000, 1998, 1995, 1990, 1985, 1980, 1975, 1970, 1965, 1960, 1955, 1950].forEach(function (y) {
      var o = el('option', null, String(y));
      o.value = String(y);
      if (y === state.birthYear) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () { state.birthYear = parseInt(sel.value, 10); };
    lab.appendChild(sel);
    yrRow.appendChild(lab);
    app.appendChild(yrRow);

    var rules = el('div', 'rules');
    [
      ['不可选出生地', '按 37 个区县的出生人口权重抽取。'],
      ['一生只有一次', '出生到死亡，不重掷、不复活。'],
      ['游戏本体永远免费', '付费只买纪念品，不改命。'],
      ['住几楼是核心', '楼层同时改写通勤、体力、租金、健康和关系。']
    ].forEach(function (r) {
      var item = el('div', 'rule');
      item.appendChild(el('div', 'rule-t', U(r[0])));
      item.appendChild(el('div', 'rule-d', U(r[1])));
      rules.appendChild(item);
    });
    app.appendChild(rules);

    var roll = el('button', 'bigbtn', U('投胎'));
    roll.onclick = function () { doBirth(); };
    app.appendChild(roll);
  }

  function doBirth(forcedSeed) {
    state.seed = (forcedSeed !== undefined) ? (forcedSeed >>> 0) : (Math.random() * 0xFFFFFFFF) >>> 0;
    state.birth = R.drawBirth(new R.RNG(state.seed), state.birthYear);
    renderHousing();
  }

  /* ---- 选层 → 选楼 → 选楼层 ---- */
  function renderHousing() {
    var app = $('app');
    app.innerHTML = '';
    state.stage = 'housing';
    var b = state.birth;

    var hero = el('div');
    hero.appendChild(el('h1', null, U('渝你有约')));
    app.appendChild(hero);

    var card = el('div', 'birthcard');
    var qLabel = function (i) {
      if (state.lang === 'zh') return ['最低 20%', '第二档', '中间档', '第四档', '最高 20%'][i];
      if (state.lang === 'es') return ['20% más bajos', 'segundo quintil', 'tercio medio', 'cuarto quintil', '20% más altos'][i];
      return ['bottom 20%', 'second quintile', 'middle third', 'fourth quintile', 'top 20%'][i];
    };
    [
      [U('生于'), String(state.birthYear)],
      [U('区县'), b.district + ' / ' + b.districtEn],
      [U('家庭'), b.familyZh + ' / ' + b.familyEn],
      [U('性别'), b.sex === 'm' ? U('男') : U('女')],
      [U('收入五分位'), qLabel(b.incomeQuintile)],
      [U('城镇') + ' / ' + U('农村'), b.urban ? U('城镇') : U('农村')]
    ].forEach(function (r) {
      var line = el('div', 'bc-row');
      line.appendChild(el('span', 'bc-k', r[0]));
      line.appendChild(el('span', 'bc-v', r[1]));
      card.appendChild(line);
    });
    app.appendChild(card);

    var options = R.housingOptionsFor(b.district, b.urban);
    var LAYER_ORDER = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
    var layerName = {};
    (R.LAYERS || []).forEach(function (L) { layerName[L.id] = L; });
    var availableLayers = {};
    options.forEach(function (o) { if (o.layer) availableLayers[o.layer] = 1; });
    var layerKeys = LAYER_ORDER.filter(function (k) { return availableLayers[k]; });
    if (!layerKeys.length) layerKeys = ['L5'];

    app.appendChild(el('h2', null, U('第一步：住在这座城市的哪个高度')));
    var layerRow = el('div', 'layerrow');
    layerKeys.forEach(function (k) {
      var L = layerName[k] || { zh: k, en: k, habit: '', habitEn: '' };
      var lb = el('button', 'layerchip');
      lb.dataset.layer = k;
      lb.appendChild(el('span', 'lc-id', k));
      lb.appendChild(el('span', 'lc-zh', state.lang === 'zh' ? L.zh : L.en));
      lb.appendChild(el('span', 'lc-habit', state.lang === 'zh' ? L.habit : L.habitEn));
      lb.onclick = function () {
        state.pickLayer = k;
        Array.prototype.forEach.call(layerRow.children, function (c) { c.classList.remove('sel'); });
        lb.classList.add('sel');
        renderBuildings(k);
        renderFloors();
      };
      layerRow.appendChild(lb);
    });
    app.appendChild(layerRow);

    app.appendChild(el('h2', null, U('第二步：住哪种房子')));
    var bwrap = el('div', 'bcards');
    app.appendChild(bwrap);

    app.appendChild(el('h2', null, U('第三步：住第几楼')));
    var floorHost = el('div', 'floorlist');
    app.appendChild(floorHost);
    var go = el('button', 'bigbtn', U('开门'));
    app.appendChild(go);

    state.buildingHost = bwrap;
    state.floorHost = floorHost;
    state.goBtn = go;

    state.pickLayer = layerKeys.indexOf('L5') >= 0 ? 'L5' : layerKeys[0];
    var chip = layerRow.querySelector('[data-layer="' + state.pickLayer + '"]');
    if (chip) chip.classList.add('sel');
    renderBuildings(state.pickLayer);
    renderFloors();
  }

  function renderBuildings(layerKey) {
    var bwrap = state.buildingHost;
    if (!bwrap) return;
    bwrap.innerHTML = '';
    var b = state.birth;
    var options = R.housingOptionsFor(b.district, b.urban);
    var list = options.filter(function (o) { return o.layer === layerKey; });
    if (!list.length) list = options.filter(function (o) { return !o.layer; });
    if (!list.length) list = options;

    list.forEach(function (opt, oi) {
      var bw = el('button', 'bcard' + (oi === 0 ? ' sel' : ''));
      var range = opt.floorRange && opt.floorRange[0] !== opt.floorRange[1]
        ? opt.floorRange[0] + '–' + opt.floorRange[1] : String(opt.floors);
      bw.appendChild(el('div', 'b-name', (state.lang === 'zh' ? opt.zh : opt.en) + ' · ' + range + U('楼')));
      bw.appendChild(el('div', 'b-note', state.lang === 'zh' ? opt.noteZh : opt.noteEn));
      bw.appendChild(el('div', 'b-src', opt.src));
      bw.onclick = function () {
        Array.prototype.forEach.call(bwrap.querySelectorAll('.bcard'), function (c) { c.classList.remove('sel'); });
        bw.classList.add('sel');
        state.pickBuilding = opt;
        renderFloors();
      };
      bwrap.appendChild(bw);
    });
    if (list.length && (!state.pickBuilding || list.indexOf(state.pickBuilding) === -1)) {
      state.pickBuilding = list[0];
    }
  }

  /* 楼层的人话描述（不是数字，是「住上去是什么感觉」） */
  function envWord(prof, b, f) {
    var words = [];
    if (f === b.floors && b.floors >= 12) words.push('视野');
    if (f <= 3) words.push('街坊多');
    if (prof.ties <= -4) words.push('没人串门');
    if (prof.layer === 'L0') words.push('潮湿');
    if (prof.layer === 'L2') words.push('车流吵');
    if (prof.layer === 'L1') words.push('看得见江');
    if (!words.length) words.push('一般');
    return words.map(function (w) { return U(w); }).join(' · ');
  }

  function describeEnv(prof, b, f) {
    var bits = [];
    var rent = Math.round(prof.rentBase * 100);
    if (rent <= 100) bits.push(U('租金最低的一档'));
    else if (rent <= 115) bits.push(U('租金中等'));
    else bits.push(U('租金贵 ' + (rent - 100) + '%'));
    if (prof.extraStairs > 0) bits.push(U('身体负担重'));
    if (f === b.floors && b.floors >= 12) bits.push(U('但晒、吵、孤单'));
    return bits.join(' · ');
  }

  function renderFloors() {
    var floorHost = state.floorHost;
    if (!floorHost) return;
    floorHost.innerHTML = '';
    var b = state.pickBuilding;
    if (!b) return;

    var lo = b.floorRange ? b.floorRange[0] : 1;
    var hi = b.floorRange ? b.floorRange[1] : b.floors;
    var picks = {};
    [lo, hi, Math.ceil((lo + hi) / 2)].forEach(function (f) {
      if (f >= lo && f <= hi) picks[f] = 1;
    });
    (b.entrances || []).forEach(function (f) { if (f >= lo && f <= hi) picks[f] = 1; });
    var fl = Object.keys(picks).map(Number).sort(function (a, c) { return a - c; });

    fl.forEach(function (f) {
      var prof = R.floorProfile(b, f, state.birthYear);
      var row = el('button', 'floor');
      row.appendChild(el('div', 'f-num', f + U('楼')));
      var mid = el('div', 'f-info');
      mid.appendChild(el('div', 'f-line', '⏱ ' + Math.round(prof.commuteMin) + ' ' + U('分钟／天')));
      var stairTxt;
      if (b.lift) stairTxt = U('电梯直达，腿不累');
      else if (prof.extraStairs === 0) stairTxt = U('出门就是平路，不用爬楼');
      else {
        stairTxt = U('每天爬 ' + prof.extraStairs + ' 层');
        if (prof.entranceFloor > 1) stairTxt += U('（从 ' + prof.entranceFloor + ' 楼入口进）');
      }
      mid.appendChild(el('div', 'f-line', (b.lift ? '🛗 ' : '🪜 ') + stairTxt));
      mid.appendChild(el('div', 'f-line dim', describeEnv(prof, b, f)));
      row.appendChild(mid);
      row.appendChild(el('div', 'f-env ' + (prof.env >= 0 ? 'pos' : 'neg'), envWord(prof, b, f)));
      row.onclick = function () {
        Array.prototype.forEach.call(floorHost.children, function (c) { c.classList.remove('sel'); });
        row.classList.add('sel');
        state.pickFloor = f;
      };
      floorHost.appendChild(row);
    });

    state.pickFloor = fl[0];
    if (floorHost.children[0]) floorHost.children[0].classList.add('sel');

    state.goBtn.onclick = function () {
      var f = state.pickFloor || fl[0];
      state.life = R.createLife(state.seed, state.birthYear, state.pickBuilding, f);
      state.choiceLog = [];
      renderLife();
      scrollTop();
    };
  }

  /* ---- 人生进行中 ---- */
  function renderLife() {
    var app = $('app');
    app.innerHTML = '';
    state.stage = 'life';

    var hero = el('div');
    hero.appendChild(el('h1', null, U('渝你有约')));
    app.appendChild(hero);

    var bannerHost = el('div');
    app.appendChild(bannerHost);
    state.bannerHost = bannerHost;

    var clockHost = el('div');
    app.appendChild(clockHost);
    state.clockHost = clockHost;

    var hud = el('div', 'hud');
    app.appendChild(hud);
    state.hud = hud;

    var cityHost = el('div', 'cityhost');
    app.appendChild(cityHost);
    state.cityHost = cityHost;

    var choiceHost = el('div');
    app.appendChild(choiceHost);
    state.choiceHost = choiceHost;

    var log = el('div', 'log');
    app.appendChild(log);
    state.log = log;

    var cardHost = el('div');
    app.appendChild(cardHost);
    state.cardHost = cardHost;

    var nextBtn = el('button', 'bigbtn', U('过一年'));
    nextBtn.onclick = function () { advance(); };
    app.appendChild(nextBtn);
    state.nextBtn = nextBtn;

    var actions = el('div', 'row');
    actions.style.marginTop = '14px';
    var restart = el('button', 'ghostbtn', U('重新投胎'));
    restart.onclick = function () { renderBirth(); scrollTop(); };
    actions.appendChild(restart);
    app.appendChild(actions);

    setupClock();
    renderCity();
    paint();

    if (state.clock && state.life && state.life.phase === 'running') state.clock.start();
  }

  /* ---------- 时间条 ----------
   * 时间算法来自 clock.js（时间戳差值累积，YEAR_MS = 3600000）。
   * 这里只做 UI：进度条 + 1×/8×/60× 速度切换 + 手动快进一年。
   * 抉择点由 tickYear() 自动暂停时钟。 */
  function ClockBar(host, clock, opts) {
    opts = opts || {};
    this.host = host;
    this.clock = clock;
    this.opts = opts;

    var bar = el('div', 'clockbar');
    var yr = el('span', 'cb-year', '—');
    var left = el('div');
    left.appendChild(yr);
    bar.appendChild(left);

    var track = el('div', 'cb-track');
    var fill = el('div', 'cb-fill');
    track.appendChild(fill);
    var mid = el('div');
    mid.appendChild(track);
    bar.appendChild(mid);

    var pause = el('button', 'cb-btn', U('暂停'));
    var speed = el('button', 'cb-btn', '1×');
    var ff = el('button', 'cb-btn', '+1y');
    var right = el('div', 'cb-right');
    right.appendChild(pause); right.appendChild(speed); right.appendChild(ff);
    bar.appendChild(right);

    var note = el('div', 'cb-note', U('1 现实小时 = 1 游戏年'));
    bar.appendChild(note);
    host.appendChild(bar);

    pause.onclick = function () { if (clock.running) clock.pause(); else clock.resume(); };
    speed.onclick = function () { clock.cycleSpeed(); };
    ff.onclick = function () { clock.advanceYears(1); };

    this.parts = { yr: yr, fill: fill, pause: pause, speed: speed, note: note };
    this.update(clock.state());
  }

  ClockBar.prototype.update = function (st) {
    var base = this.opts && this.opts.yearBase ? this.opts.yearBase : 0;
    var age = (this.opts && typeof this.opts.gameAge === 'function') ? this.opts.gameAge() : 0;
    this.parts.yr.textContent = base ? String(base + age) : ('year ' + age);
    this.parts.fill.style.width = Math.round(st.progress * 1000) / 10 + '%';
    this.parts.speed.textContent = st.speed + '×';
    this.parts.pause.textContent = st.running ? U('暂停') : U('继续');
    this.parts.note.textContent = U('距离下一年') + ' ' + fmtDur(Math.round(st.secondsToNextYear)) +
      ' · ' + U('1 现实小时 = 1 游戏年');
  };

  function fmtDur(sec) {
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
    return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  }

  /* ---------- 时间钟：1 现实小时 = 1 游戏年 ---------- */
  function setupClock() {
    var Clock = root.CQCLOCK.Clock;
    if (!state.clock) {
      state.clock = new Clock({
        onTick: function (st) { if (state.clockBar) state.clockBar.update(st); },
        onYear: function (years) { for (var i = 0; i < years; i++) tickYear(); },
        onPause: function (st) { if (state.clockBar) state.clockBar.update(st); }
      });
    }
    if (state.clockHost && !state.clockBar) {
      state.clockBar = new ClockBar(state.clockHost, state.clock, {
        onFastForward: function () { tickYear(); },
        yearBase: state.birthYear || 2026,
        gameAge: function () { return (state.life && state.life.st) ? state.life.st.age : 0; }
      });
    }
    state.clock.yearBase = state.birthYear || 2026;
    if (state.clockBar) state.clockBar.update(state.clock.state());
  }

  function tickYear() {
    if (!state.life) return;
    if (state.life.phase === 'await_choice') {
      if (state.clock) state.clock.pause();
      return;
    }
    if (state.life.phase === 'dead') {
      if (state.clock) state.clock.stop();
      return;
    }
    var r = state.life.step();
    if (r.status === 'await_choice') {
      showChoice(r.decision);
      if (state.clock) state.clock.pause();
    } else if (r.status === 'dead') {
      showFinal();
      if (state.clock) state.clock.stop();
    } else {
      paint();
    }
  }

  function advance() {
    var life = state.life;
    if (!life || life.phase === 'dead') return;
    if (life.phase === 'await_choice') { showChoice(life.pending); return; }
    if (state.clock && state.clock.running) { state.clock.advanceYears(1); return; }
    var r = life.step();
    if (r.status === 'await_choice') showChoice(r.decision);
    else if (r.status === 'dead') showFinal();
    paint();
  }

  /* ---------- 抉择面板 ---------- */
  function showChoice(d) {
    state.pendingDecision = d;
    var host = state.choiceHost;
    host.innerHTML = '';
    var box = el('div', 'choicebox');
    box.appendChild(el('div', 'choice-age', d.age + U('岁')));
    box.appendChild(el('h3', 'choice-title', cText(d.id + ':title', d.titleZh, d.titleEn)));
    box.appendChild(el('div', 'choice-prompt', cText(d.id + ':prompt', d.promptZh, d.promptEn)));

    var opts = el('div', 'choiceopts');
    d.options.forEach(function (o) {
      var ob = el('button', 'choiceopt');
      ob.appendChild(el('div', 'co-main', cText(d.id + ':' + o.id + ':text', o.zh, o.en)));
      ob.appendChild(el('div', 'co-hint', cText(d.id + ':' + o.id + ':hint', o.hintZh, o.hintEn)));
      ob.onclick = function () { pickOption(o.id); };
      opts.appendChild(ob);
    });
    box.appendChild(opts);
    host.appendChild(box);
    if (state.nextBtn) state.nextBtn.style.display = 'none';
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }
  }

  function pickOption(id) {
    if (!state.life) return false;
    state.life.choose(id);
    state.choiceLog.push(id);
    state.pendingDecision = null;
    state.choiceHost.innerHTML = '';
    if (state.clock && state.life && state.life.phase !== 'dead') state.clock.resume();
    if (state.nextBtn) state.nextBtn.style.display = '';
    updateShareUrl();
    paint();
    return true;
  }

  /* ---------- HUD / 日志刷新 ---------- */
  function paint() {
    var life = state.life;
    if (!life) return;
    var st = life.st;

    if (state.hud) {
      state.hud.innerHTML = '';
      var ageBox = el('div', 'hud-age');
      var shownAge = (life.phase === 'await_choice') ? st.age - 1 : st.age;
      ageBox.appendChild(el('div', 'hud-num', String(shownAge)));
      ageBox.appendChild(el('div', 'hud-unit', U('岁')));
      state.hud.appendChild(ageBox);

      var grid = el('div', 'hud-grid');
      [['财富', st.wealth], ['健康', st.health], ['幸福', st.happiness],
       ['体力', st.stamina], ['关系', st.ties], ['知识', st.knowledge]].forEach(function (a) {
        var cell = el('div', 'hud-cell');
        cell.appendChild(el('div', 'hc-k', U(a[0])));
        var bar = el('div', 'hc-bar');
        var fill = el('div', 'hc-fill');
        fill.style.width = Math.round(R.clamp(a[1])) + '%';
        bar.appendChild(fill);
        cell.appendChild(bar);
        cell.appendChild(el('div', 'hc-v', String(Math.round(a[1]))));
        grid.appendChild(cell);
      });
      state.hud.appendChild(grid);

      var meta = el('div', 'hud-meta');
      meta.appendChild(el('span', null, U('工作') + ': ' +
        (st.job ? (state.lang === 'zh' ? st.job.zh : st.job.en) : '—')));
      meta.appendChild(el('span', null, U('住') + ': ' + st.homeFloor + U('楼')));
      meta.appendChild(el('span', null, U('净资产') + ': ¥' + Math.round(st.money)));
      state.hud.appendChild(meta);
    }

    if (state.log) {
      state.log.innerHTML = '';
      state.log.appendChild(el('h3', null, U('人生节点')));
      st.log.slice(-40).forEach(function (e) {
        var line = el('div', 'log-line');
        line.appendChild(el('span', 'log-age', e.age + U('岁')));
        line.appendChild(el('span', 'log-txt', state.lang === 'zh' ? e.zh : e.en));
        state.log.appendChild(line);
      });
    }
  }

  /* ---- 3D 山城 + 地标 ---- */
  function renderCity() {
    var host = state.cityHost;
    if (!host) return;
    host.innerHTML = '';

    var lms = (root.CQLANDMARKS && root.CQLANDMARKS.length) ? root.CQLANDMARKS : [];
    var head = el('div', 'cityhead');
    head.appendChild(el('h3', null, U('重庆 · 8D 立体城')));
    head.appendChild(el('div', 'citysub', U('纯代码生成：没有一张贴图，每一栋楼、每一扇窗都是函数算出来的。点地标进去看看。')));
    host.appendChild(head);

    var probe = document.createElement('canvas');
    var has2d = false;
    try { has2d = !!(probe.getContext && probe.getContext('2d')); } catch (e) { has2d = false; }
    if (!has2d) { host.appendChild(el('div', 'note', 'This browser has no canvas 2d context.')); return; }

    var wrap = el('div', 'citywrap');
    var canvas = el('canvas', 'citycanvas');
    var hint = el('div', 'cityhint');
    var tools = el('div', 'citytools');
    var night = true, scale = 0.62;
    var toggle = el('button', 'citybtn', '☾');
    var zin = el('button', 'citybtn', '+');
    var zout = el('button', 'citybtn', '−');
    tools.appendChild(zin); tools.appendChild(zout); tools.appendChild(toggle);
    wrap.appendChild(canvas); wrap.appendChild(hint); wrap.appendChild(tools);
    host.appendChild(wrap);

    var dpr = window.devicePixelRatio || 1;
    var cssW = 900, cssH = 460;
    var ctx = canvas.getContext('2d');
    var hits = [];

    function resize() {
      var r = wrap.getBoundingClientRect();
      cssW = Math.max(320, r.width || 900);
      cssH = Math.max(280, Math.min(620, cssW * 0.56));
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (!ctx) return;
      var res = City.render(ctx, cssW, cssH, {
        seed: state.seed || 20261114,
        night: night, scale: scale, landmarks: lms
      });
      hits = res.hits || [];
      hint.textContent = lms.length + ' ' + U('地标') + ' · click to open';
    }

    toggle.onclick = function () { night = !night; toggle.textContent = night ? '☾' : '☀'; draw(); };
    zin.onclick = function () { scale = Math.min(1.6, scale * 1.18); draw(); };
    zout.onclick = function () { scale = Math.max(0.22, scale / 1.18); draw(); };

    canvas.addEventListener('click', function (ev) {
      var r = canvas.getBoundingClientRect();
      var cx = (ev.clientX - r.left) * dpr, cy = (ev.clientY - r.top) * dpr;
      var best = null, bd = 1e9;
      for (var i = 0; i < hits.length; i++) {
        var h = hits[i];
        var dx = cx - h.x * dpr, dy = cy - h.y * dpr;
        var dd = dx * dx + dy * dy;
        if (dd < h.r * h.r * dpr * dpr && dd < bd) { bd = dd; best = h; }
      }
      if (best) openLandmark(best.lm);
    });

    var panel = el('div', 'lmpanel');
    host.appendChild(panel);
    state.lmPanel = panel;

    if (lms.length) {
      var chips = el('div', 'lmchips');
      lms.forEach(function (lm) {
        var chip = el('button', 'lmchip', state.lang === 'zh' ? lm.zh : lm.en);
        chip.onclick = function () { openLandmark(lm); };
        chips.appendChild(chip);
      });
      host.appendChild(chips);
    }

    resize();
    window.addEventListener('resize', function () { resize(); draw(); });
    draw();
    setTimeout(function () { resize(); draw(); }, 0);
  }

  function openLandmark(lm) {
    var panel = state.lmPanel;
    if (!panel || !lm) return;
    panel.innerHTML = '';
    var head = el('div', 'lmhead');
    head.appendChild(el('h3', 'lmtitle', state.lang === 'zh' ? lm.zh : lm.en));
    head.appendChild(el('div', 'lmsub', state.lang === 'zh' ? lm.en : lm.zh));
    var close = el('button', 'lmclose', '×');
    close.onclick = function () { panel.innerHTML = ''; };
    head.appendChild(close);
    panel.appendChild(head);

    var blurb = lm.blurbEn;
    if (state.lang === 'zh') blurb = lm.blurbZh || lm.blurb;
    else if (state.lang === 'es') blurb = lm.blurbEs || lm.blurbEn || lm.blurb;
    else blurb = lm.blurbEn || lm.blurb;
    panel.appendChild(el('p', 'lmblurb', blurb));

    if (lm.tag) {
      var tags = el('div', 'lmtags');
      tags.appendChild(el('span', 'lmtag', lm.tag));
      panel.appendChild(tags);
    }

    /* 近景：同一套纯代码渲染器，单地标特写 */
    var art = el('div');
    panel.appendChild(art);
    requestAnimationFrame(function () {
      var c = el('canvas', 'lmcanvas');
      art.appendChild(c);
      var d = window.devicePixelRatio || 1;
      var w = Math.max(240, (panel.clientWidth || 600) - 8);
      var h = 190;
      c.width = Math.round(w * d); c.height = Math.round(h * d);
      c.style.width = w + 'px'; c.style.height = h + 'px';
      var cx = c.getContext('2d');
      cx.setTransform(d, 0, 0, d, 0, 0);
      City.render(cx, w, h, { seed: 20261114, night: true, scale: 1.0, focus: lm.id, landmarks: [lm] });
    });

    var foot = el('div', 'lmfoot');
    foot.appendChild(el('span', null, (lm.lat || 0).toFixed(4) + '°N  ' + (lm.lng || 0).toFixed(4) + '°E'));
    panel.appendChild(foot);

    if (panel.scrollIntoView) { try { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }
  }

  /* ---- 终局：结果卡 + 分享 + $9 纪念卡 ---- */
  function shareUrl() {
    var q = 's=' + state.seed.toString(16) + '&y=' + state.birthYear + '&f=' + (state.pickFloor || 11);
    if (state.choiceLog.length) q += '&c=' + state.choiceLog.join(',');
    var base = location.protocol === 'file:'
      ? 'file://' + location.pathname
      : (location.origin + location.pathname);
    return base + '?' + q;
  }

  function updateShareUrl() {
    if (!history.replaceState) return;
    try { history.replaceState(null, '', shareUrl()); } catch (e) { /* file:// 下可能抛 */ }
  }

  function layerLabel(id) {
    if (!id) return '—';
    var L = null;
    (R.LAYERS || []).forEach(function (x) { if (x.id === id) L = x; });
    if (!L) return id;
    if (state.lang === 'zh') return L.zh + ' ' + id;
    if (state.lang === 'es') {
      /* 西语：垂直层名有专门的译名，其余情况回落英文 */
      var v = ES_EXTRA[L.zh] || L.en;
      return v + ' ' + id;
    }
    return L.en + ' ' + id;
  }

  /* 职业名（跟随语言） */
  function jobName(job) {
    if (!job) return '';
    if (state.lang === 'zh') return job.zh;
    if (state.lang === 'es') return ES_EXTRA[job.zh] || job.en;
    return job.en;
  }

  /* 区县名：西语用拼音（Chongqing 的区县名在西班牙语里通常也用拼音），
     所以 ES 下直接用 districtEn 的拼音形式，而不是中文。 */
  function districtName(b) {
    if (!b) return '';
    if (state.lang === 'zh') return b.district;
    return b.districtEn || b.district;
  }

  /* 楼型名（跟随语言） */
  function homeName(home) {
    if (!home) return '—';
    if (state.lang === 'zh') return home.zh;
    if (state.lang === 'es') return ES_EXTRA[home.zh] || home.en;
    return home.en;
  }

  function epilogueFor(st) {
    if (!st) return null;
    if (root.CQTEXT && root.CQTEXT.composeEpilogue) {
      try { return root.CQTEXT.composeEpilogue(st, state.lang); } catch (e) { /* 回退 */ }
    }
    return st.epilogue;
  }

  function shareText(st) {
    var epi = epilogueFor(st);
    var job = jobName(st.job);
    var layer = layerLabel(st.prof && st.prof.layer);
    var cause = st.causeOfDeath === 'disease' ? U('疾病')
      : (st.causeOfDeath === 'accident' ? U('意外') : '');
    var title = epi ? epi.title : '';
    if (state.lang === 'zh') {
      return '我在重庆活了 ' + st.finalAge + ' 岁。' +
        '生于 ' + state.birthYear + ' ' + districtName(state.birth) + '，住在' + layer + ' ' + st.homeFloor +
        ' 楼，做了' + job + '。' + (cause ? '死于' + cause + '。' : '') +
        (title ? ('「' + title + '」') : '') + '一次人生，不可重掷。';
    }
    if (state.lang === 'es') {
      return 'Viví ' + st.finalAge + ' años en Chongqing. ' +
        'Nací en ' + state.birthYear + ' en ' + districtName(state.birth) + ', viví en ' + layer +
        ' piso ' + st.homeFloor + ' y trabajé de ' + job + '. ' +
        (cause ? ('Murí de ' + cause + '. ') : '') +
        (title ? ('«' + title + '» ') : '') + 'Una vida. Sin volver a tirar.';
    }
    return 'I lived ' + st.finalAge + ' years in Chongqing. ' +
      'Born ' + state.birthYear + ' in ' + districtName(state.birth) + ', lived on ' + layer +
      ' floor ' + st.homeFloor + ', worked as ' + job + '. ' +
      (cause ? ('Died of ' + cause + '. ') : '') +
      (title ? ('"' + title + '" ') : '') + 'One life. No re-rolls.';
  }

  function showFinal() {
    var life = state.life;
    var st = life.st;
    state.stage = 'final';

    if (state.bannerHost && state.replayed) {
      state.bannerHost.innerHTML = '';
      var banner = el('div', 'replaybanner');
      banner.appendChild(el('div', 'rb-title', U('这是别人分享给你的一生')));
      banner.appendChild(el('div', 'rb-sub', U('你看到的是他完整活过的一次——出生、选择、楼层、结局。现在换成你的。')));
      var rbBtn = el('button', 'rb-btn', U('活我自己的一生'));
      rbBtn.onclick = function () { state.replayed = false; updateShareUrl(); renderBirth(); scrollTop(); };
      banner.appendChild(rbBtn);
      state.bannerHost.appendChild(banner);
    }

    if (state.choiceHost) state.choiceHost.innerHTML = '';
    var host = state.choiceHost;

    var causeTxt = st.causeOfDeath === 'disease' ? U('疾病')
      : (st.causeOfDeath === 'accident' ? U('意外') : '');
    var head = el('div', 'lifehead');
    head.appendChild(el('div', 'lh-age', String(st.finalAge)));
    head.appendChild(el('div', 'lh-sub', U('出生年') + ' ' + state.birthYear + ' · ' + state.birth.district +
      ' · ' + U('去世') + ' ' + st.yearOfDeath + (causeTxt ? ' · ' + causeTxt : '')));
    host.appendChild(head);

    /* 终局结果卡：出生年 / 层 / 楼层 / 职业 / 结局 */
    var rc = el('div', 'resultcard');
    var grid = el('div', 'rc-grid');
    [
      [U('出生年'), String(state.birthYear)],
      [U('垂直层'), layerLabel(st.prof && st.prof.layer)],
      [U('楼'), st.homeFloor + U('楼')],
      [U('职业'), st.job ? jobName(st.job) : '—'],
      [U('结局'), st.yearOfDeath + ' (' + st.finalAge + ')'],
      [U('住'), homeName(st.home)]
    ].forEach(function (c) {
      var cell = el('div', 'rc-cell');
      cell.appendChild(el('div', 'rc-k', c[0]));
      cell.appendChild(el('div', 'rc-v', c[1]));
      grid.appendChild(cell);
    });
    rc.appendChild(grid);

    var Epi = epilogueFor(st);
    if (Epi) {
      var title = state.lang === 'zh' ? Epi.titleZh : (Epi[state.lang + 'Title'] || Epi.titleEn);
      var text = state.lang === 'zh' ? Epi.zh : (Epi[state.lang] || Epi.en);
      rc.appendChild(el('div', 'rc-epi', title));
      rc.appendChild(el('div', 'epi-text', text));
    }
    host.appendChild(rc);

    if (st.decisions.length) {
      var dbox = el('div', 'decisions');
      dbox.appendChild(el('h3', null, U('你做过的决定')));
      st.decisions.forEach(function (d) {
        var row = el('div', 'dec-row');
        row.appendChild(el('span', 'dec-age', d.age + U('岁')));
        row.appendChild(el('span', null, state.lang === 'zh' ? d.labelZh : d.labelEn));
        dbox.appendChild(row);
      });
      host.appendChild(dbox);
    }

    /* 分享 */
    var shareHost = state.cardHost;
    shareHost.innerHTML = '';
    shareHost.appendChild(el('h2', null, U('分享这条人生')));

    var txt = shareText(st);
    var url = shareUrl();
    var sb = el('div', 'sharebar');
    var copyTxt = el('button', null, U('复制分享文案'));
    copyTxt.onclick = function () { copy(txt, copyTxt); };
    sb.appendChild(copyTxt);
    var copyUrl = el('button', null, U('复制分享链接'));
    copyUrl.onclick = function () { copy(url, copyUrl); };
    sb.appendChild(copyUrl);
    if (navigator.share) {
      var nat = el('button', null, 'Share');
      nat.onclick = function () {
        try {
          navigator.share({ title: 'A Date with Chongqing', text: txt, url: url }).catch(function () {});
        } catch (e) {}
      };
      sb.appendChild(nat);
    }
    shareHost.appendChild(sb);

    var ta = el('textarea', 'shareout');
    ta.value = txt + '\n' + url;
    ta.readOnly = true;
    shareHost.appendChild(ta);

    renderCardShop(shareHost, st);
    paint();
    scrollTop();
  }

  function copy(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = U('已复制');
      setTimeout(function () { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, btn); });
    } else {
      fallbackCopy(text, btn);
    }
  }

  function fallbackCopy(text, btn) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      var old = btn.textContent;
      btn.textContent = U('已复制');
      setTimeout(function () { btn.textContent = old; }, 1800);
    } catch (e) {
      btn.textContent = U('复制失败，请手动选择文本');
    }
  }

  /* ---------- $9 纪念卡 ---------- */
  function renderCardShop(host, st) {
    var serial = Card.makeSerial(state.seed + '|' + state.birthYear + '|' +
      (state.pickFloor || 0) + '|' + state.choiceLog.join(','));
    var wrap = el('div', 'cardshop');
    wrap.appendChild(el('h3', 'cs-title', U('纪念卡')));
    wrap.appendChild(el('p', 'cs-blurb', U('一生一城。卡面记录的是你真实活过的那条人生——你的楼、你的楼层、你的年份。9 美元。游戏本体永远免费。')));

    var grid = el('div', 'cs-grid');
    var item = el('div', 'cs-item');
    item.appendChild(el('div', 'cs-item-title', U('纪念卡')));
    item.appendChild(el('div', 'cs-item-desc', U('一生一城。卡面记录的是你真实活过的那条人生——你的楼、你的楼层、你的年份。9 美元。游戏本体永远免费。')));

    /* PayPal：business=404435105@qq.com & amount=9 & currency=USD */
    var buy = el('a', 'cs-buy', U('购买纪念卡 · $9'));
    buy.href = Card.paypalLink({
      returnUrl: (location.protocol === 'file:'
        ? 'https://8dchongqing.cn/'
        : (location.origin + location.pathname + '?card=1')),
      customId: serial,
      track: (state.lang || 'en')
    });
    buy.target = '_blank';
    buy.rel = 'noopener';
    item.appendChild(buy);
    grid.appendChild(item);

    var pitem = el('div', 'cs-item');
    pitem.appendChild(el('div', 'cs-item-title', U('申请实体纪念卡')));
    pitem.appendChild(el('div', 'cs-item-desc', U('同编号实体卡，线上申请，线下寄送。')));
    var req = el('button', 'cs-buy', U('申请实体纪念卡'));
    req.onclick = function () { openPhysical(wrap); };
    pitem.appendChild(req);
    grid.appendChild(pitem);
    wrap.appendChild(grid);

    /* 卡面预览：纯代码 SVG */
    wrap.appendChild(el('div', 'lc-habit', U('你的卡面（纯代码绘制）')));
    var art = el('div', 'cardart');
    art.innerHTML = Card.cardSVG({
      serial: serial,
      birthYear: state.birthYear,
      district: state.lang === 'zh' ? state.birth.district : state.birth.districtEn,
      age: st.finalAge,
      layerLabel: layerLabel(st.prof && st.prof.layer),
      floorLabel: st.homeFloor + U('楼'),
      name: jobName(st.job) || (state.lang === 'zh' ? '重庆' : 'Chongqing')
    });
    wrap.appendChild(art);

    var row = el('div', 'cs-card-row');
    row.appendChild(el('code', 'cs-serial', serial));
    row.appendChild(el('span', 'cs-sum', 'checksum ' + Card.checksum(serial)));
    wrap.appendChild(row);

    host.appendChild(wrap);
  }

  function openPhysical(host) {
    var f = el('div', 'cs-form');
    f.innerHTML =
      '<div class="cs-form-title">' + U('实体卡申请') + '</div>' +
      '<label>Name<input type="text" data-f="name"></label>' +
      '<label>Email<input type="email" data-f="email"></label>' +
      '<label>Address<input type="text" data-f="address"></label>' +
      '<label>City<input type="text" data-f="city"></label>' +
      '<label>Country<input type="text" data-f="country"></label>' +
      '<label class="cs-form-note">' + U('这些信息只用于寄卡。') + '</label>' +
      '<div class="cs-form-actions"><button class="cs-buy" data-a="send">' + U('提交申请') + '</button>' +
      '<button class="cs-cancel" data-a="cancel">' + U('取消') + '</button></div>' +
      '<div class="cs-form-msg"></div>';
    host.appendChild(f);
    var msg = f.querySelector('.cs-form-msg');
    f.querySelector('[data-a="cancel"]').onclick = function () { f.remove(); };
    f.querySelector('[data-a="send"]').onclick = function () {
      var data = {};
      Array.prototype.forEach.call(f.querySelectorAll('[data-f]'), function (i) {
        data[i.getAttribute('data-f')] = i.value.trim();
      });
      if (!data.name || !data.email || !data.address) {
        msg.textContent = U('请填写姓名、邮箱和地址。');
        msg.className = 'cs-form-msg err';
        return;
      }
      /* 单文件版没有后端：card.js 会先存到 localStorage，等接通服务端再发。 */
      Card.physicalRequest(data);
      msg.textContent = U('已保存。发货时我们会邮件通知你。');
      msg.className = 'cs-form-msg ok';
      Array.prototype.forEach.call(f.querySelectorAll('input'), function (i) { i.disabled = true; });
      f.querySelector('[data-a="send"]').disabled = true;
    };
  }

  /* ---- 分享链接回放 ---- */
  function replayFromUrl() {
    var q = new URLSearchParams(location.search);
    var seedHex = q.get('s');
    if (!seedHex) return false;
    var seed = parseInt(seedHex, 16);
    if (!isFinite(seed) || seed <= 0) return false;
    var year = parseInt(q.get('y') || '2026', 10);
    var floor = parseInt(q.get('f') || '11', 10);
    var choices = (q.get('c') || '').split(',').filter(Boolean);

    state.seed = seed >>> 0;
    state.birthYear = year;
    state.birth = R.drawBirth(new R.RNG(state.seed), year);

    /* 回放要落在同一栋楼：先找能承载该楼层的原型，再夹楼层。 */
    var opts = R.housingOptionsFor(state.birth.district, state.birth.urban);
    var bld = null, i;
    for (i = 0; i < opts.length; i++) {
      if (opts[i].id === 'stairwell' && floor <= opts[i].floors) { bld = opts[i]; break; }
    }
    if (!bld) {
      for (i = 0; i < opts.length; i++) {
        if (opts[i].floors >= floor && opts[i].layer) { bld = opts[i]; break; }
      }
    }
    if (!bld) bld = opts[0];
    state.pickBuilding = bld;
    state.pickFloor = Math.min(floor, bld.floors);

    state.life = R.createLife(state.seed, year, state.pickBuilding, state.pickFloor);
    state.choiceLog = [];
    var gi = 0, guard = 0;
    while (guard++ < 400) {
      var r = state.life.step();
      if (r.status === 'await_choice') {
        var pick = gi < choices.length ? choices[gi] : r.decision.options[0].id;
        var valid = r.decision.options.some(function (o) { return o.id === pick; });
        if (!valid) pick = r.decision.options[0].id;
        state.life.choose(pick);
        state.choiceLog.push(pick);
        gi++;
        continue;
      }
      if (r.status === 'dead') break;
    }
    state.replayed = true;
    renderLife();
    showFinal();
    return true;
  }

  /* ---- 语言 ---- */
  function setLang(l) {
    if (!LANGS.some(function (x) { return x.code === l; })) l = 'en';
    state.lang = l;
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
    if (root.CQTEXT && root.CQTEXT.setLang) root.CQTEXT.setLang(l);
    Array.prototype.forEach.call(document.querySelectorAll('#langs button'), function (b) {
      b.classList.toggle('sel', b.dataset.lang === l);
    });
    rerender();
  }

  function rerender() {
    if (state.stage === 'housing' && state.birth) renderHousing();
    else if (state.stage === 'life' || state.stage === 'final') {
      if (state.life && state.life.phase === 'dead') showFinal();
      else {
        renderLife();
        /* 切语言时如果正挂着一个抉择，必须把抉择面板重新画出来。
         * 否则 renderLife() 清空 choiceHost 之后，抉择就消失了——
         * 玩家会以为这一局卡死。 */
        if (state.pendingDecision) showChoice(state.pendingDecision);
      }
    } else {
      renderBirth();
    }
  }

  function buildLangBar() {
    var bar = $('langs');
    bar.innerHTML = '';
    LANGS.forEach(function (L) {
      var b = el('button', null, L.short);
      b.dataset.lang = L.code;
      b.onclick = function () { setLang(L.code); };
      bar.appendChild(b);
    });
  }

  /* ---- 启动 ---- */
  function boot() {
    buildLangBar();
    var q = new URLSearchParams(location.search);

    var guess = q.get('lang');
    if (!guess) {
      var bl = (navigator.language || 'en').toLowerCase();
      if (bl.indexOf('zh') === 0) guess = 'zh';
      else if (bl.indexOf('es') === 0) guess = 'es';
      else guess = 'en';
    }
    setLang(guess);

    /* 分享链接优先：带 s= 的链接直接回放那条人生 */
    if (q.get('s') && replayFromUrl()) return;
    renderBirth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 暴露给自动化测试：headless 验证脚本直接调用这些入口 */
  root.CQSINGLE = {
    state: state,
    doBirth: doBirth,
    renderHousing: renderHousing,
    renderLife: renderLife,
    showFinal: showFinal,
    showChoice: showChoice,
    advance: advance,
    tickYear: tickYear,
    replayFromUrl: replayFromUrl,
    shareUrl: shareUrl,
    shareText: shareText,
    setLang: setLang,
    pickLayer: function (layer) {
      state.pickLayer = layer;
      var chips = document.querySelectorAll('.layerrow .layerchip');
      for (var i = 0; i < chips.length; i++) {
        if (chips[i].dataset.layer === layer) { chips[i].click(); return true; }
      }
      return false;
    },
    pickBuildingIndex: function (idx) {
      var bcards = document.querySelectorAll('.bcards .bcard');
      if (!bcards[idx]) return false;
      bcards[idx].click();
      return true;
    },
    pickFloor: function (floor) {
      var floors = document.querySelectorAll('.floorlist .floor');
      for (var j = 0; j < floors.length; j++) {
        var n = parseInt(floors[j].querySelector('.f-num').textContent.replace(/\D+/g, ''), 10);
        if (n === floor) { floors[j].click(); return true; }
      }
      return false;
    },
    confirmHome: function () { if (state.goBtn) state.goBtn.click(); return true; },
    chooseById: function (id) {
      if (!state.pendingDecision) return false;
      var d = state.pendingDecision;
      for (var i = 0; i < d.options.length; i++) {
        if (d.options[i].id === id) return pickOption(id);
      }
      return false;
    },
    pendingDecision: function () { return state.pendingDecision; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
