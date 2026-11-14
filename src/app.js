/* 渝你有约 — P0 主程序（第二版）
 * 流程：抽签（不可选）→ 选楼层（唯一的架构性抉择）→ 逐年推进 + 抉择节点 → 生命剖面图
 *
 * 第二版的核心变化：人生不再瞬间算完。
 * 规则层每推进一年就可能挂起一个抉择（5/15/22/30/42/50/70 岁），
 * 玩家在这些节点做选择，选择会改写后续人生。
 */
(function () {
  'use strict';

  var D = window.CQDATA, R = window.CQRULES, V = window.CQVIEW;
  // 遥测层：只记事件，不做用户画像；默认只写本地，不发网络请求
  var A = window.CQTELEMETRY || { track: function () {}, dump: function () { return {}; } };
  var state = {
    lang: 'en', seed: 0, birthYear: 2026,
    birth: null, life: null, result: null, stage: 'birth',
    pickBuilding: null, pickFloor: null, pendingDecision: null,
    // 抉择回放：记录玩家每一步的选择，URL 里带出来就能原样重演
    choiceLog: [],
    // 打开的是别人分享链接，不是自己新开的一局
    replayed: false, bannerHost: null, testPanel: null,
    pickLayer: 'L5', buildingHost: null,
    // V1.2：时间钟（1 现实小时 = 1 游戏年）
    clock: null, clockBar: null
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  /* ---------- 语言词典 ----------
   * V1：改成「按语言分表」，加语言只是加一张表。
   * 结构：I18N[langCode][key] = [中文, 英文] 或 [中文, 英文, 日, 韩, 西]
   * 取值：T(k) 取当前语言；缺哪门语言就沿回退链找，
   *      最后一定落到英文——海外版不能显示中文界面。
   */
  /* 单词级翻译：t('中文', 'English')。
   * 用法比 T(k) 灵活——适合一次性文案（钩子、提示语）。
   * V1：这里也接翻译包，翻译包里的 id 用 'ui:<中文原文>' 形式，
   * 找不到就退回英文。 */
  function t(zh, en) {
    if (state.lang === 'zh') return zh;
    if (state.lang === 'en') return en;
    var packs = (window.CQI18N && window.CQI18N.PACKS) || {};
    var chain = (window.CQI18N && window.CQI18N.FALLBACK && window.CQI18N.FALLBACK[state.lang]) ||
                [state.lang, 'en'];
    var id = 'ui:' + zh;
    for (var i = 0; i < chain.length; i++) {
      var p = packs[chain[i]];
      if (p && p[id] && p[id].body) return p[id].body;
    }
    return en;
  }

  var I18N = {
    zh: {
      title: '渝你有约', tag: 'THE 8D CITY', tagline: '一生一城，不可重掷。',
      sub: '在地球上唯一的 8D 城市里活一次。',
      birthTitle: '你出生了', birthNote: '不可选择，不可重掷。这就是规则。',
      district: '出生地', family: '家庭', sex: '性别', year: '出生年份',
      quintile: '家境五等份', urban: '城镇', rural: '农村',
      male: '男', female: '女',
      q: '最穷 20%', q2: '偏下', q3: '中等', q4: '偏上', q5: '最富 20%',
      homeTitle: '你住在哪一层？',
      homeNote: '这是你一生中最重要的一个决定，而且它不可更改。',
      building: '楼栋', floor: '楼层', commute: '通勤', rent: '租金', stairs: '爬楼',
      lift: '有电梯', noLift: '无电梯', stairsClimb: '层', perDay: '分钟／趟', perMonth: '元／月',
      confirm: '就住这里了',
      lifeTitle: '你的一生', share: '保存生命剖面图', savePng: '保存图片', saveSvg: '保存 SVG',
      copyText: '复制文案', copied: '已复制', nativeShare: '分享…', compareFour: '同秒四人',
      copyLink: '复制链接',
      pickLayer: '第一步：住在这座城市的哪个高度', pickHome: '第二步：住哪种房子',
      sources: '数据来源', job: '职业', born: '生于',
      wealth: '财富', health: '健康', happiness: '幸福', knowledge: '知识',
      ties: '关系', stamina: '体力', floorLabel: '层', playAgain: '再活一次',
      legendHome: '你的家', legendPath: '人生轨迹', legendAxes: '状态轴', age: '岁',
      staminaUnit: '点体力', yearNow: '年', continueBtn: '继续',
      chooseTitle: '抉择', chosen: '你选了', untilNext: '直到下一个节点',
      ageNow: '现在', pressStart: '开始', pressingOn: '生活继续',
      turningPoint: '人生大事', epilogue: '结语', decisionsMade: '你的抉择',
      decades: '十年', summary: '这一层楼决定了你的一生。'
    },
    en: {
    title: 'A Date with Chongqing',
    tag: 'THE 8D CITY',
    tagline: 'One life. One city. No re-rolls.',
    sub: 'Live a life in the only 8D city on Earth.',
    birthTitle: 'You were born',
    birthNote: 'You cannot choose. You cannot re-roll. That is the rule.',
    district: 'Birthplace',
    family: 'Family',
    sex: 'Sex',
    year: 'Year of birth',
    quintile: 'Household income quintile',
    urban: 'Urban', rural: 'Rural',
    male: 'Male', female: 'Female',
    q: 'Bottom 20%', q2: 'Lower-middle', q3: 'Middle',
    q4: 'Upper-middle', q5: 'Top 20%',
    homeTitle: 'Which floor do you live on?',
    homeNote: 'This is the most important decision of your life, and you cannot change it.',
    building: 'Building',
    floor: 'Floor',
    commute: 'Commute',
    rent: 'Rent',
    stairs: 'Stairs',
    lift: 'Lift',
    noLift: 'No lift',
    stairsClimb: 'flights',
    perDay: 'min each way',
    perMonth: 'CNY/month',
    confirm: 'Live here',
    lifeTitle: 'Your life',
    share: 'Save your life cross-section',
    savePng: 'Save image',
    saveSvg: 'Save SVG',
    copyText: 'Copy text',
    copied: 'Copied',
    nativeShare: 'Share…',
    compareFour: 'Four lives, four floors',
    copyLink: 'Copy link',
    pickLayer: 'Step 1: Which height in the city',
    pickHome: 'Step 2: Which kind of home',
    sources: 'Sources',
    job: 'Work',
    born: 'Born',
    wealth: 'Wealth', health: 'Health',
    happiness: 'Happiness', knowledge: 'Knowledge',
    ties: 'Ties', stamina: 'Stamina',
    floorLabel: 'F',
    playAgain: 'Live another',
    legendHome: 'Your home',
    legendPath: 'Life path',
    legendAxes: 'State axes',
    age: 'yrs',
    female: 'Female',
    rural: 'Rural',
    staminaUnit: 'stamina',
    /* 新增：节奏相关 */
    yearNow: 'year',
    continueBtn: 'Continue',
    chooseTitle: 'A choice',
    chosen: 'You chose',
    untilNext: 'Until the next turning point',
    ageNow: 'Now',
    pressStart: 'Begin',
    pressingOn: 'Life goes on',
    turningPoint: 'Turning points',
    epilogue: 'Epilogue',
    decisionsMade: 'Your choices',
    decades: 'decade',
    summary: 'This one floor decided your life.'
    },
    ja: {
      title: '渝你有約', tag: 'THE 8D CITY', tagline: '一生一城、リロールなし。',
      sub: '地球で唯一の8Dの街で、一生を生きる。',
      birthTitle: 'あなたは生まれた', birthNote: '選ぶことはできません。リロールもできません。それがルールです。',
      district: '出身地', family: '家庭', sex: '性別', year: '生年',
      quintile: '家庭所得五段階', urban: '都市', rural: '農村',
      male: '男', female: '女',
      q: '最下位20%', q2: '中下', q3: '中間', q4: '中上', q5: '最上位20%',
      homeTitle: '何階に住みますか？',
      homeNote: 'これはあなたの人生で最も重要な決断で、あとから変えられません。',
      building: '建物', floor: '階', commute: '通勤', rent: '家賃', stairs: '階段',
      lift: 'エレベーターあり', noLift: 'エレベーターなし', stairsClimb: '段', perDay: '分／往復', perMonth: '元／月',
      confirm: 'ここに住む',
      lifeTitle: 'あなたの人生', share: '人生断面図を保存', savePng: '画像を保存', saveSvg: 'SVGを保存',
      copyText: '文をコピー', copied: 'コピーしました', nativeShare: '共有…', compareFour: '同時刻の四人',
      copyLink: 'リンクをコピー',
      pickLayer: '第1歩：街のどの高さに住むか', pickHome: '第2歩：どんな家に住むか',
      sources: '出典', job: '仕事', born: '生まれ',
      wealth: '富', health: '健康', happiness: '幸せ', knowledge: '知識',
      ties: 'つながり', stamina: '体力', floorLabel: 'F', playAgain: 'もう一度生きる',
      legendHome: 'あなたの家', legendPath: '人生の軌跡', legendAxes: '状態軸', age: '歳',
      staminaUnit: '体力', yearNow: '年', continueBtn: '続ける',
      chooseTitle: '選択', chosen: 'あなたの選択', untilNext: '次の節目まで',
      ageNow: '現在', pressStart: '始める', pressingOn: '生活は続く',
      turningPoint: '人生の節目', epilogue: '結語', decisionsMade: 'あなたの選択',
      decades: '十年', summary: 'この一階があなたの人生を決めました。'
    },
    ko: {
      title: '위유위위약', tag: 'THE 8D CITY', tagline: '한 번의 삶, 한 도시, 다시 뽑기 없음.',
      sub: '지구에서 유일한 8D 도시에서 한 번을 살다.',
      birthTitle: '당신은 태어났습니다', birthNote: '선택할 수 없습니다. 다시 뽑을 수도 없습니다. 그게 규칙입니다.',
      district: '출생지', family: '가족', sex: '성별', year: '출생 연도',
      quintile: '가정소득 5분위', urban: '도시', rural: '농촌',
      male: '남', female: '여',
      q: '하위 20%', q2: '중하위', q3: '중간', q4: '중상위', q5: '상위 20%',
      homeTitle: '몇 층에 사시나요?',
      homeNote: '이것은 당신 인생에서 가장 중요한 결정이며, 나중에 바꿀 수 없습니다.',
      building: '건물', floor: '층', commute: '출퇴근', rent: '월세', stairs: '계단',
      lift: '엘리베이터 있음', noLift: '엘리베이터 없음', stairsClimb: '단', perDay: '분／편도', perMonth: '원／월',
      confirm: '여기서 살기',
      lifeTitle: '당신의 인생', share: '인생 단면도 저장', savePng: '이미지 저장', saveSvg: 'SVG 저장',
      copyText: '문구 복사', copied: '복사됨', nativeShare: '공유…', compareFour: '같은 시각 네 명',
      copyLink: '링크 복사',
      pickLayer: '1단계: 도시의 어느 높이에서 살 것인가', pickHome: '2단계: 어떤 집에서 살 것인가',
      sources: '출처', job: '직업', born: '출생',
      wealth: '재산', health: '건강', happiness: '행복', knowledge: '지식',
      ties: '인연', stamina: '체력', floorLabel: 'F', playAgain: '다시 한 번',
      legendHome: '당신의 집', legendPath: '인생의 궤적', legendAxes: '상태 축', age: '세',
      staminaUnit: '체력', yearNow: '년', continueBtn: '계속',
      chooseTitle: '선택지', chosen: '당신의 선택', untilNext: '다음 전환점까지',
      ageNow: '지금', pressStart: '시작', pressingOn: '삶은 계속됩니다',
      turningPoint: '인생의 전환점', epilogue: '에필로그', decisionsMade: '당신의 선택',
      decades: '10년', summary: '이 한 층이 당신의 인생을 정했습니다.'
    },
    es: {
      title: 'Una cita con Chongqing', tag: 'THE 8D CITY', tagline: 'Una vida. Una ciudad. Sin tirar los dados.',
      sub: 'Vive una vida en la única ciudad 8D del planeta.',
      birthTitle: 'Has nacido', birthNote: 'No puedes elegir. No puedes volver a tirar. Esa es la regla.',
      district: 'Lugar de nacimiento', family: 'Familia', sex: 'Sexo', year: 'Año de nacimiento',
      quintile: 'Quintil de ingresos del hogar', urban: 'Urbano', rural: 'Rural',
      male: 'Hombre', female: 'Mujer',
      q: '20% más pobre', q2: 'Media baja', q3: 'Media', q4: 'Media alta', q5: '20% más rico',
      homeTitle: '¿En qué piso vives?',
      homeNote: 'Esta es la decisión más importante de tu vida y no podrás cambiarla.',
      building: 'Edificio', floor: 'Piso', commute: 'Trayecto', rent: 'Alquiler', stairs: 'Escaleras',
      lift: 'Con ascensor', noLift: 'Sin ascensor', stairsClimb: 'tramos', perDay: 'min por trayecto', perMonth: 'CNY/mes',
      confirm: 'Vivir aquí',
      lifeTitle: 'Tu vida', share: 'Guardar tu sección de vida', savePng: 'Guardar imagen', saveSvg: 'Guardar SVG',
      copyText: 'Copiar texto', copied: 'Copiado', nativeShare: 'Compartir…', compareFour: 'Cuatro vidas',
      copyLink: 'Copiar enlace',
      pickLayer: 'Paso 1: a qué altura de la ciudad vives', pickHome: 'Paso 2: qué tipo de casa',
      sources: 'Fuentes', job: 'Trabajo', born: 'Nacimiento',
      wealth: 'Riqueza', health: 'Salud', happiness: 'Felicidad', knowledge: 'Conocimiento',
      ties: 'Vínculos', stamina: 'Energía', floorLabel: 'F', playAgain: 'Vivir otra vez',
      legendHome: 'Tu casa', legendPath: 'Trayectoria vital', legendAxes: 'Ejes de estado', age: 'años',
      staminaUnit: 'energía', yearNow: 'año', continueBtn: 'Continuar',
      chooseTitle: 'Una elección', chosen: 'Elegiste', untilNext: 'Hasta el próximo punto de inflexión',
      ageNow: 'Ahora', pressStart: 'Empezar', pressingOn: 'La vida sigue',
      turningPoint: 'Hitos', epilogue: 'Epílogo', decisionsMade: 'Tus elecciones',
      decades: 'década', summary: 'Ese piso decidió tu vida.'
    },
  };

  /* 回退链：找不到当前语言就沿链找，最后一定落到英文。 */
  var LANG_CHAIN = {
    zh: ['zh', 'en'], en: ['en'], ja: ['ja', 'en'], ko: ['ko', 'en'], es: ['es', 'en']
  };

  function T(k) {
    var chain = LANG_CHAIN[state.lang] || ['en'];
    for (var i = 0; i < chain.length; i++) {
      var tbl = I18N[chain[i]];
      if (tbl && tbl[k]) return tbl[k];
    }
    return k;
  }

  /* ---------- 渲染：抽签 ---------- */
  function renderBirth() {
    var app = $('app');
    app.innerHTML = '';
    state.stage = 'birth';

    var hero = el('div', 'hero');
    hero.appendChild(el('h1', null, T('title')));
    hero.appendChild(el('div', 'tag', T('tag')));
    hero.appendChild(el('div', 'tagline', T('tagline')));
    hero.appendChild(el('div', 'sub', T('sub')));
    app.appendChild(hero);

    // 首屏三件事：这是什么 / 为什么值得玩 / 怎么开始
    var hook = el('div', 'hook');
    hook.appendChild(el('div', 'hook-q', t(
      '重庆是世界上唯一的 8D 城市：一栋楼能同时是地铁站、商场、菜市场和江景房。',
      'Chongqing is the only 8D city on Earth: one building can be a metro station, a mall, a market and a river view at the same time.')));
    hook.appendChild(el('div', 'hook-q', t(
      '你不能选自己的出生地。但你可以选住几楼——而这一层会改写你的一生。',
      'You don\'t pick where you are born. You pick which floor you live on — and that floor rewrites your life.')));
    app.appendChild(hook);

    var btn = el('button', 'bigbtn', t('投胎', 'Be born'));
    btn.onclick = function () { doBirth(); };
    app.appendChild(btn);

    var hint = el('div', 'hint', t(
      '点击投胎。系统按重庆 37 个区县的真实出生数据抽取，不能选择。',
      'Click to be born. Drawn from real birth data across Chongqing\'s 37 districts. No choosing.'));
    app.appendChild(hint);

    // 楼层预览：让陌生人第一眼就看到核心机制
    var prevTitle = el('div', 'q-title small', t('住几楼？', 'Which floor?'));
    app.appendChild(prevTitle);
    var prevHost = el('div', 'floorpreview');
    var sample = R.housingOptionsFor('渝中', true);
    var sampleB = sample.find(function (o) { return o.id === 'stairwell'; }) || sample[0];
    prevHost.innerHTML = V.drawSection({ building: sampleB, floor: 11, path: [], lang: state.lang });
    app.appendChild(prevHost);
    var prevNote = el('div', 'hint', t(
      '同一栋楼，住 11 楼只爬 1 层（10 楼有出入口），住 9 楼要爬 8 层。',
      'Same building: floor 11 climbs 1 flight (there\'s a second entrance at floor 10). Floor 9 climbs 8.'));
    app.appendChild(prevNote);

    var rule = el('div', 'rulebox');
    rule.appendChild(el('h3', null, t('规则', 'The rules')));
    [
      [t('不可选出生地', 'Your birthplace is not yours to pick'),
       t('按 37 个区县的出生人口权重抽取。', 'Weighted by real birth counts across 37 districts.')],
      [t('一生只有一次', 'One life, once'),
       t('出生到死亡，不重掷、不复活。', 'Birth to death. No re-roll, no reset.')],
      [t('付费不改命', 'Money never changes a life'),
       t('整个游戏免费，付费只买纪念品。', 'Free forever. You only pay for keepsakes, never for outcomes.')],
      [t('住几楼是核心', 'The floor is the game'),
       t('楼层同时改写通勤、体力、租金、健康和关系。', 'Floor changes commute, stamina, rent, health and ties — at once.')],
      [t('你还会遇到抉择', 'You will face choices'),
       t('一生里有几个节点要你自己拿主意。', 'A few moments in your life will be yours to decide.')]
    ].forEach(function (r) {
      var item = el('div', 'rule');
      item.appendChild(el('div', 'rule-t', r[0]));
      item.appendChild(el('div', 'rule-d', r[1]));
      rule.appendChild(item);
    });
    app.appendChild(rule);
  }

  function doBirth(forcedSeed) {
    state.seed = (forcedSeed !== undefined) ? (forcedSeed >>> 0) : (Math.random() * 0xFFFFFFFF) >>> 0;
    var rng = new R.RNG(state.seed);
    var birth = R.drawBirth(rng, state.birthYear);
    state.birth = birth;
    A.track('born', { district: birth.district, urban: birth.urban ? 1 : 0, year: state.birthYear });
    renderHousing();
  }

  /* ---------- 渲染：选楼层 ---------- */
  function renderHousing() {
    var app = $('app');
    app.innerHTML = '';
    state.stage = 'housing';
    var b = state.birth;

    var hero = el('div', 'hero small');
    hero.appendChild(el('h1', null, T('title')));
    app.appendChild(hero);

    var card = el('div', 'birthcard');
    var qnames = ['q', 'q2', 'q3', 'q4', 'q5'];
    [
      [T('born') + ' ' + state.birthYear, ''],
      [T('district'), b.district + ' / ' + b.districtEn],
      [T('family'), b.familyZh + ' / ' + b.familyEn],
      [T('sex'), b.sex === 'm' ? T('male') : T('female')],
      [T('quintile'), T(qnames[b.incomeQuintile])],
      [T('urban') + ' / ' + T('rural'), b.urban ? T('urban') : T('rural')]
    ].forEach(function (r) {
      var line = el('div', 'bc-row');
      line.appendChild(el('span', 'bc-k', r[0]));
      line.appendChild(el('span', 'bc-v', r[1]));
      card.appendChild(line);
    });
    app.appendChild(card);

    app.appendChild(el('h2', 'q-title', T('homeTitle')));
    app.appendChild(el('div', 'hint', T('homeNote')));

    var options = R.housingOptionsFor(b.district, b.urban);
    var building = options[0];
    var preview = el('div', 'preview');
    preview.innerHTML = V.drawSection({ building: building, floor: 1, path: [], lang: state.lang });
    app.appendChild(preview);

    // V1：先选垂直层，再选楼型，再选楼层。
    // 这是 8D 游戏该有的入口结构——玩家先理解「住在这座城市的哪个高度」，
    // 再理解「哪种房子」，最后才是「第几层」。
    var LAYER_ORDER = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
    var layerName = {};
    (R.LAYERS || []).forEach(function (L) { layerName[L.id] = L; });

    // 本区县可选的层有哪些（只有这些层才出现）
    var availableLayers = {};
    options.forEach(function (opt) { if (opt.layer) availableLayers[opt.layer] = 1; });
    var layerKeys = LAYER_ORDER.filter(function (k) { return availableLayers[k]; });

    // 区县说明：让玩家知道这个区县的住房长什么样
    var dNote = (window.CQHOUSING && window.CQHOUSING.districtNote) ?
      window.CQHOUSING.districtNote(b.district) : null;
    if (dNote) {
      var dbox = el('div', 'districtnote');
      dbox.appendChild(el('div', 'dn-zh', dNote.zh));
      app.appendChild(dbox);
    }

    // 第一步：选层
    app.appendChild(el('h2', 'q-title small', T('pickLayer')));
    var layerRow = el('div', 'layerrow');
    layerKeys.forEach(function (k) {
      var L = layerName[k];
      var lb = el('button', 'layerchip');
      lb.dataset.layer = k;
      lb.appendChild(el('span', 'lc-id', k));
      lb.appendChild(el('span', 'lc-zh', state.lang === 'zh' ? L.zh : L.en));
      lb.appendChild(el('span', 'lc-habit', state.lang === 'zh' ? L.habit : L.habitEn));
      lb.onclick = function () {
        state.pickLayer = k;
        Array.prototype.forEach.call(layerRow.children, function (c) {
          c.classList.remove('sel');
        });
        lb.classList.add('sel');
        renderBuildings(k);
        renderFloors();
      };
      layerRow.appendChild(lb);
    });
    app.appendChild(layerRow);

    // 第二步：选楼型（随所选层变化）
    app.appendChild(el('h2', 'q-title small', T('pickHome')));
    var bwrap = el('div', 'buildings');
    state.buildingHost = bwrap;
    app.appendChild(bwrap);

    // 第三步：选楼层
    var floorWrap = el('div', 'floorwrap');
    floorWrap.appendChild(el('div', 'q-title small', T('floor')));
    var floorHost = el('div', 'floorlist');
    floorWrap.appendChild(floorHost);
    var go = el('button', 'bigbtn', T('confirm'));
    floorWrap.appendChild(go);
    app.appendChild(floorWrap);

    state.floorHost = floorHost;
    state.goBtn = go;

    // 默认：选本区县最常见的层
    /* 「下一世」：默认住在上一世住的那一层。
     * 继承的是经历不是优势 —— 楼层照样要爬，房租照样要交。 */
    var NL = window.CQNEXTLIFE;
    var inherited = (NL && NL.load()) ? NL.inheritedLayer(NL.load().legacy) : null;
    var defaultLayer = (inherited && layerKeys.indexOf(inherited) >= 0)
      ? inherited
      : (layerKeys.indexOf('L5') >= 0 ? 'L5' : layerKeys[0]);
    state.pickLayer = defaultLayer;
    var chip = layerRow.querySelector('[data-layer="' + state.pickLayer + '"]');
    if (chip) chip.classList.add('sel');
    renderBuildings(state.pickLayer);
    renderFloors();
  }

  /* 列出某个垂直层在这个区县可住的楼型 */
  function renderBuildings(layerKey) {
    var bwrap = state.buildingHost;
    if (!bwrap) return;
    bwrap.innerHTML = '';
    var b = state.birth;
    var options = R.housingOptionsFor(b.district, b.urban);
    var list = options.filter(function (o) { return o.layer === layerKey; });
    if (!list.length) {
      list = options.filter(function (o) { return !o.layer; });
    }
    list.forEach(function (opt, oi) {
      var bw = el('button', 'bcard' + (oi === 0 ? ' sel' : ''));
      bw.appendChild(el('div', 'b-name', (state.lang === 'zh' ? opt.zh : opt.en) +
        (opt.floorRange && opt.floorRange[0] !== opt.floorRange[1]
          ? ' · ' + opt.floorRange[0] + '–' + opt.floorRange[1] + 'F'
          : ' · ' + opt.floors + 'F')));
      bw.appendChild(el('div', 'b-note', state.lang === 'zh' ? opt.noteZh : opt.noteEn));
      bw.appendChild(el('div', 'b-src', opt.src));
      bw.onclick = function () {
        Array.prototype.forEach.call(bwrap.querySelectorAll('.bcard'),
          function (c) { c.classList.remove('sel'); });
        bw.classList.add('sel');
        state.pickBuilding = opt;
        renderFloors();
      };
      bwrap.appendChild(bw);
    });
    // 只在还没选过时才给默认值。
    // 之前这里无条件写 list[0]，会把玩家刚点的楼型覆盖掉——
    // 表现是「我选了新建高层，进屋还是老旧小区」。
    if (list.length && !state.pickBuilding) state.pickBuilding = list[0];
    // 但如果当前选中的楼型不在这一层的列表里（切层了），换成第一个。
    if (list.length && state.pickBuilding && list.indexOf(state.pickBuilding) === -1) {
      state.pickBuilding = list[0];
    }
  }


  /* ---------- 楼层环境的人话描述 ---------- */
  /* 「+13」没人看得懂。要说「视野好，邻居少」。 */
  function envWord(prof, b, f) {
    var parts = [];
    if (f === b.floors && b.floors >= 12) parts.push(t('视野', 'View'));
    if (f <= 3) parts.push(t('街坊多', 'Neighbours'));
    if (prof.ties <= -4) parts.push(t('没人串门', 'Nobody visits'));
    if (prof.layer === 'L0') parts.push(t('潮湿', 'Damp'));
    if (prof.layer === 'L2') parts.push(t('车流吵', 'Traffic noise'));
    if (prof.layer === 'L1') parts.push(t('看得见江', 'River view'));
    if (!parts.length) parts.push(t('一般', 'Average'));
    return parts.join(' · ');
  }

  function describeEnv(prof, b, f) {
    var bits = [];
    var rent = Math.round(prof.rentBase * 100);
    // 裸百分比没人看得懂。给出参照：本层最低租金 / 你这层贵多少。
    var rentTxt;
    if (rent <= 100) {
      rentTxt = t('租金最低的一档', 'Cheapest on this floor');
    } else if (rent <= 115) {
      rentTxt = t('租金中等', 'Mid-range rent');
    } else {
      rentTxt = t('租金贵 ' + (rent - 100) + '%', 'Rent ' + (rent - 100) + '% above the cheapest');
    }
    bits.push(rentTxt);
    if (prof.extraStairs > 0) {
      bits.push(t('身体负担重', 'Hard on the body'));
    }
    if (f === b.floors && b.floors >= 12) {
      bits.push(t('但晒、吵、孤单', 'But hot, noisy, alone'));
    }
    return bits.join(' · ');
  }

  function renderFloors() {
    var floorHost = state.floorHost;
    if (!floorHost) return;
    floorHost.innerHTML = '';
    var b = state.pickBuilding;

    // 关键楼层：1、所有入口层、中间、最高
    // 有 floorRange 的层绑定建筑只在区间内选层
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
      row.appendChild(el('div', 'f-num', f + T('floorLabel')));
      var mid = el('div', 'f-info');
      mid.appendChild(el('div', 'f-line', '⏱ ' + Math.round(prof.commuteMin) + ' ' + T('perDay')));
      // 爬楼必须说人话：+13 这种数字没人看得懂
      var stairTxt;
      if (b.lift) {
        stairTxt = t('电梯直达，腿不累', 'Lift to the door, legs spared');
      } else if (prof.extraStairs === 0) {
        stairTxt = t('出门就是平路，不用爬楼', 'Door opens onto the street — no stairs');
      } else {
        stairTxt = t('每天爬 ' + prof.extraStairs + ' 层',
                     'Climb ' + prof.extraStairs + ' flights a day');
        // 白象居式多入口：住在入口层之上的人爬得少——这是最反直觉也最关键的信息
        if (prof.entranceFloor > 1) {
          stairTxt += t('（从 ' + prof.entranceFloor + ' 楼入口进）',
                        ' (enter at floor ' + prof.entranceFloor + ')');
        }
      }
      mid.appendChild(el('div', 'f-line', (b.lift ? '🛗 ' : '🪜 ') + stairTxt));
      // 环境分改成描述，不给数字
      mid.appendChild(el('div', 'f-line dim', describeEnv(prof, b, f)));
      row.appendChild(mid);
      var envEl = el('div', 'f-env ' + (prof.env >= 0 ? 'pos' : 'neg'),
        envWord(prof, b, f));
      row.appendChild(envEl);
      row.onclick = function () {
        Array.prototype.forEach.call(floorHost.children, function (c) { c.classList.remove('sel'); });
        row.classList.add('sel');
        state.pickFloor = f;
        // 点了但还没确认——这是「犹豫」的信号，与最终选择分开记
        A.track('floor_considered', { floor: f, layer: prof.layer || 'na' });
        var prev = document.querySelector('.preview');
        if (prev) prev.innerHTML = V.drawSection({ building: b, floor: f, path: [], lang: state.lang });
      };
      floorHost.appendChild(row);
    });

    state.pickFloor = fl[0];
    if (floorHost.children[0]) floorHost.children[0].classList.add('sel');
    var prev0 = document.querySelector('.preview');
    if (prev0) prev0.innerHTML = V.drawSection({ building: b, floor: fl[0], path: [], lang: state.lang });

    state.goBtn.onclick = function () {
      var f = state.pickFloor || fl[0];
      var prof = R.floorProfile(state.pickBuilding, f, state.birthYear);
      // 最终选择：层 + 楼层 + 该层的关键取舍值
      A.track('floor_selected', {
        floor: f, layer: prof.layer || 'na',
        commute: Math.round(prof.commuteMin),
        stairs: prof.extraStairs,
        env: prof.env, ties: prof.ties
      });
      state.life = R.createLife(state.seed, state.birthYear, state.pickBuilding, f);
      /* 「下一世」：上一世留在门后的东西，这辈子开门能看见 */
      if (window.CQNEXTLIFE) window.CQNEXTLIFE.prepareNextLife(state.life);
      state.choiceLog = [];
      state.result = { birth: state.birth, state: state.life.st, profile: state.life.st.prof };
      renderLife();
      safeScrollTop();
    };
  }

  function safeScrollTop() {
    try { window.scrollTo(0, 0); } catch (e) { /* jsdom 未实现 */ }
  }

  /* ---------- 渲染：一生（逐年推进） ---------- */
  function renderLife() {
    var app = $('app');
    app.innerHTML = '';
    state.stage = 'life';

    var hero = el('div', 'hero small');
    hero.appendChild(el('h1', null, T('title')));
    app.appendChild(hero);

    // 回放横幅容器（只在打开别人分享链接时填充）
    var bannerHost = el('div', 'bannerhost');
    app.appendChild(bannerHost);

    // 时间条（1 现实小时 = 1 游戏年）
    var clockHost = el('div', 'clockhost');
    app.appendChild(clockHost);

    // 状态条
    var hud = el('div', 'hud');
    app.appendChild(hud);

    // 3D 山城（纯代码渲染）+ 地标入口（V1.2）
    var cityHost = el('div', 'cityhost');
    app.appendChild(cityHost);

    // 房间场景（V1.1：可点物件）
    var sceneHost = el('div', 'scenehost');
    app.appendChild(sceneHost);

    // 抉择面板（挂起时显示）
    var choiceHost = el('div', 'choicehost');
    app.appendChild(choiceHost);

    // 人物卡片（V1.1：社会关系的可见形态）
    // 注意：不能叫 cardHost —— showFinal() 早就用这个名字放分享卡了。
    var peopleHost = el('div', 'peoplehost');
    app.appendChild(peopleHost);

    // 剖面 + 轨迹
    var sec = el('div', 'sectionwrap');
    app.appendChild(sec);

    // 推进按钮
    var ctrl = el('div', 'ctrl');
    var nextBtn = el('button', 'bigbtn', T('continueBtn'));
    nextBtn.onclick = function () { advance(nextBtn); };
    ctrl.appendChild(nextBtn);
    app.appendChild(ctrl);

    // 事件日志
    var log = el('div', 'log');
    log.appendChild(el('h3', null, T('turningPoint')));
    app.appendChild(log);

    // 分享卡（终局才显示）
    var cardHost = el('div', 'cardhost');
    app.appendChild(cardHost);

    // 底部操作
    var actions = el('div', 'actions');
    /* 人生进行中也能重开，但这一世还没活完，不提交遗产 */
    var restart = el('button', 'ghostbtn', state.lang === 'zh' ? '重新投胎' : 'Roll a new birth');
    restart.onclick = function () {
      renderBirth();
      safeScrollTop();
    };
    actions.appendChild(restart);
    app.appendChild(actions);

    state.hud = hud;
    state.clockHost = clockHost;
    state.cityHost = cityHost;
    setupClock();
    state.sceneHost = sceneHost;
    state.bannerHost = bannerHost;
    state.choiceHost = choiceHost;
    state.peopleHost = peopleHost;
    state.sec = sec;
    state.ctrl = ctrl;
    state.log = log;
    state.cardHost = cardHost;
    state.actions = actions;
    state.nextBtn = nextBtn;

    paint();

    /* 人生开始 → 启动时间钟（1 现实小时 = 1 游戏年） */
    if (state.clock && state.life && state.life.phase === 'running') {
      state.clock.start();
    }
  }

  /* 推进一年（或处理挂起的抉择） */
  function advance(btn) {
    var life = state.life;
    if (!life) return;
    if (life.phase === 'dead') return;

    // 如果挂着一个抉择，先让玩家选
    if (life.phase === 'await_choice') {
      showChoice(life.pending);
      return;
    }

    /* 时间钟接管年推进：手动按钮和自动计时走同一条路，
     * 否则会出现「一年被推两次」的不一致。 */
    if (state.clock && state.clock.running) {
      state.clock.advanceYears(1);
      return;
    }

    var r = life.step();
    A.track('year_advanced', { age: life.st.age, layer: life.st.prof.layer || 'na' });
    if (r.status === 'await_choice') {
      showChoice(r.decision);
    } else if (r.status === 'dead') {
      state.result = { birth: state.birth, state: life.st, profile: life.st.prof };
      A.track('life_finished', {
        age: life.st.finalAge,
        job: life.st.job ? life.st.job.id : 'none',
        layer: life.st.prof.layer || 'na',
        floor: life.st.homeFloor,
        epilogue: life.st.epilogue ? life.st.epilogue.titleEn : ''
      });
      showFinal();
    }
    paint();
  }

  /* 抉择文案取值：优先目标语言包 → 英文 → 中文。
   * 键 = 节点id:字段（title / prompt / <optionId>:text / <optionId>:hint） */
  function cText(id, fallback) {
    var lang = state.lang;
    if (lang !== 'zh') {
      var v = (window.CQI18N && window.CQI18N.t) ? window.CQI18N.t(id, lang) : null;
      if (v) return v;
    }
    return fallback;
  }

  /* 显示抉择面板 */
  function showChoice(d) {
    state.pendingDecision = d;
    var host = state.choiceHost;
    host.innerHTML = '';
    var box = el('div', 'choicebox');
    box.appendChild(el('div', 'choice-age', d.age + T('age')));
    box.appendChild(el('h3', 'choice-title', cText(d.id + ':title', state.lang === 'zh' ? d.titleZh : d.titleEn)));
    box.appendChild(el('div', 'choice-prompt', cText(d.id + ':prompt', state.lang === 'zh' ? d.promptZh : d.promptEn)));

    var opts = el('div', 'choiceopts');
    d.options.forEach(function (o) {
      var ob = el('button', 'choiceopt');
      ob.appendChild(el('div', 'co-main', cText(d.id + ':' + o.id + ':text', state.lang === 'zh' ? o.zh : o.en)));
      ob.appendChild(el('div', 'co-hint', cText(d.id + ':' + o.id + ':hint', state.lang === 'zh' ? o.hintZh : o.hintEn)));
      ob.onclick = function () {
        state.life.choose(o.id);
        state.choiceLog.push(o.id);
        // 抉择埋点：节点 id + 选了哪个选项。job_chosen 单独拆出来便于分析
        A.track('choice_made', { node: d.id, pick: o.id, age: d.age });
        if (o.id && o.id.indexOf('job_') === 0) {
          var jid = o.id.replace('job_', '');
          A.track('job_chosen', { job: jid, age: d.age });
        }
        state.pendingDecision = null;
        host.innerHTML = '';
        /* 抉择结束 → 时钟继续跑 */
        if (state.clock && state.life && state.life.phase !== 'dead') state.clock.resume();
        if (state.nextBtn) state.nextBtn.style.display = '';
        updateShareUrl();
        paint();
      };
      opts.appendChild(ob);
    });
    box.appendChild(opts);
    host.appendChild(box);
    if (state.nextBtn) state.nextBtn.style.display = 'none';
    if (typeof host.scrollIntoView === 'function') {
      host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ---------- 人物卡片 ---------- */
  /* 一张卡 + 一句处境 + 两个回应。回应会改状态，并在房间里留下物证。 */
  function showCard() {
    var host = state.peopleHost;
    if (!host) return;
    host.innerHTML = '';
    var life = state.life;
    if (!life) return;
    var P = window.CQPEOPLE;
    if (!P) return;

    /* 人死了就没有人上门了；终局页不该还挂着人物卡 */
    if (life.phase === 'dead' || state.stage === 'final') return;

    var card = P.cardFor(life, state.lang);
    if (!card) return;

    var box = el('div', 'pcard');
    box.appendChild(el('div', 'pcard-who', card.name));
    box.appendChild(el('div', 'pcard-intro', card.intro));

    var opts = el('div', 'pcard-opts');
    card.options.forEach(function (o, i) {
      var ob = el('button', 'pcard-opt');
      ob.appendChild(el('div', 'po-main', o.text));
      ob.onclick = function () {
        var res = P.resolve(card, i, life);
        if (res) {
          // 物证进房间
          if (res.trace) {
            life.cardTraces = life.cardTraces || {};
            life.cardTraces[res.trace.key] = 1;
          }
          life.log = life.log || [];
          life.st.log = life.st.log || [];
          life.st.log.push({
            age: life.st.age,
            text: card.name + '：' + res.result
          });
        }
        A.track('card_resolved', { who: card.person.id, pick: card.options[i].id });
        host.innerHTML = '';
        paint();
      };
      opts.appendChild(ob);
    });
    box.appendChild(opts);
    host.appendChild(box);
  }

  /* 刷新显示 */
  function paint() {
    var life = state.life;
    if (!life) return;
    var st = life.st;

    // HUD
    if (state.hud) {
      state.hud.innerHTML = '';
      var ageBox = el('div', 'hud-age');
      // 有抉择挂起时，刚结算完的是 st.age - 1 那一年
      var shownAge = (life.phase === 'await_choice') ? st.age - 1 : st.age;
      ageBox.appendChild(el('div', 'hud-num', shownAge));
      ageBox.appendChild(el('div', 'hud-unit', T('age')));
      state.hud.appendChild(ageBox);

      var grid = el('div', 'hud-grid');
      [['wealth', st.wealth], ['health', st.health], ['happiness', st.happiness],
       ['stamina', st.stamina], ['ties', st.ties], ['knowledge', st.knowledge]].forEach(function (a) {
        var cell = el('div', 'hud-cell');
        cell.appendChild(el('div', 'hc-k', T(a[0])));
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
      meta.appendChild(el('span', null, t('工作', 'Work') + ': ' +
        (st.job ? (state.lang === 'zh' ? st.job.zh : st.job.en) : '—')));
      meta.appendChild(el('span', null, t('住', 'Home') + ': ' + st.homeFloor + 'F'));
      meta.appendChild(el('span', null, t('净资产', 'Net') + ': ' +
        (Math.round(st.money / 10000) / 10) + t('万', 'w')));
      state.hud.appendChild(meta);
    }

    // 3D 山城（V1.2）
    if (state.cityHost && !state.cityView) renderCity();

    // 房间场景（V1.1）
    if (state.sceneHost) renderScene();

    // 人物卡片（V1.1）
    showCard();

    // 剖面
    if (state.sec) {
      state.sec.innerHTML = V.drawSection({
        building: st.home, floor: st.homeFloor, path: st.path, lang: state.lang
      });
    }

    // 日志
    if (state.log) {
      state.log.innerHTML = '';
      state.log.appendChild(el('h3', null, T('turningPoint')));
      var recent = st.log.slice(-40);
      recent.forEach(function (e) {
        var line = el('div', 'log-line');
        line.appendChild(el('span', 'log-age', e.age + T('age')));
        line.appendChild(el('span', 'log-txt', state.lang === 'zh' ? e.zh : e.en));
        state.log.appendChild(line);
      });
    }
  }

  /* ---------- 房间场景：可点物件 ---------- */
  /* ================================================================
   * V1.2 —— 时间钟：1 现实小时 = 1 游戏年
   * ================================================================ */

  /* 建立时钟并挂上时间条 */
  function setupClock() {
    if (!window.CQCLOCK) return;
    if (!state.clock) {
      state.clock = new window.CQCLOCK.Clock({
        onTick: function (st) {
          if (state.clockBar) state.clockBar.update(st);
        },
        onYear: function (years) {
          for (var i = 0; i < years; i++) tickYear();
        },
        onPause: function (st) {
          if (state.clockBar) state.clockBar.update(st);
        }
      });
      /* 从 localStorage 恢复进度：刷新页面不丢人生进度 */
      try {
        var saved = JSON.parse(localStorage.getItem('cq_clock') || 'null');
        if (saved) state.clock.restore(saved);
      } catch (e) {}
    }

    if (state.clockHost && window.CQCITYVIEW && !state.clockBar) {
      state.clockBar = new window.CQCITYVIEW.ClockBar(state.clockHost, state.clock, {
        onFastForward: function () { tickYear(); },
        yearBase: state.birthYear || 2026,
        gameAge: function () {
          return (state.life && state.life.st) ? (state.life.st.age || 0) : 0;
        }
      });
    }
    /* 年份基线（进度条显示用） */
    state.clock.yearBase = state.birthYear || 2026;
    if (state.clockBar) state.clockBar.update(state.clock.state());
  }

  /* 一年到了：推进人生一年 */
  function tickYear() {
    if (!state.life) return;
    if (state.life.phase === 'await_choice') {
      /* 正在等抉择：时钟停下，等玩家决定 */
      if (state.clock) state.clock.pause();
      return;
    }
    if (state.life.phase === 'dead') {
      if (state.clock) state.clock.stop();
      return;
    }

    var r = state.life.step();
    A.track('year_advanced', {
      age: state.life.st.age,
      layer: state.life.st.prof.layer || 'na'
    });
    if (r.status === 'await_choice') {
      showChoice(r.decision);
      if (state.clock) state.clock.pause();
    } else if (r.status === 'dead') {
      state.result = { birth: state.birth, state: state.life.st, profile: state.life.st.prof };
      showFinal();
      if (state.clock) state.clock.stop();
    } else {
      paint();
    }
    /* 存进度 */
    try { localStorage.setItem('cq_clock', JSON.stringify(state.clock.save())); } catch (e) {}
  }

  /* 渲染 3D 山城 + 地标入口面板
   * 地标数据来自 window.CQLANDMARKS（landmarks.js）。
   * 点地标 → 打开地标详情（近景 + 说明），这是「游戏内打开重庆地标」的主入口。 */
  function renderCity() {
    if (!state.cityHost) return;
    state.cityHost.innerHTML = '';

    var lms = (window.CQLANDMARKS && window.CQLANDMARKS.length) ? window.CQLANDMARKS : [];
    var head = el('div', 'cityhead');
    head.appendChild(el('h3', null, state.lang === 'zh' ? '重庆 · 8D 立体城' : 'Chongqing · the 8D city'));
    var sub = el('div', 'citysub',
      state.lang === 'zh'
        ? '纯代码生成：没有一张贴图，每一栋楼、每一扇窗都是函数算出来的。点地标进去看看。'
        : 'Drawn entirely in code: no textures, no models. Every building and every lit window is a function. Click a landmark to open it.');
    head.appendChild(sub);
    state.cityHost.appendChild(head);

    if (!window.CQCITYVIEW || !window.CQCITY) {
      var miss = el('div', 'cityhint', 'city renderer not loaded');
      state.cityHost.appendChild(miss);
      return;
    }

    /* 环境能力检测：jsdom / 老浏览器没有 canvas 2d context 时，
     * 整块 3D 视图要安静跳过，而不是让整个游戏流程挂掉。 */
    var probe = document.createElement('canvas');
    var has2d = false;
    try { has2d = !!(probe.getContext && probe.getContext('2d')); } catch (e) { has2d = false; }
    if (!has2d) {
      state.cityHost.appendChild(el('div', 'cityhint', '3D city view needs a canvas-capable browser'));
      return;
    }

    var panel = el('div', 'lmpanelwrap');
    state.cityHost.appendChild(panel);

    var view = new window.CQCITYVIEW.CityView(el('div', 'cityhostinner', ''), {
      seed: state.seed || 20261114,
      landmarks: lms,
      onLandmark: function (lm) { openLandmark(lm); }
    });
    state.cityView = view;

    var p = new window.CQCITYVIEW.LandmarkPanel(panel);
    state.lmPanel = p;

    /* 地标快速入口（列表，方便手机上点） */
    if (lms.length) {
      var list = el('div', 'lmlist');
      var lh = el('div', 'lmlist-title', state.lang === 'zh' ? '地标' : 'Landmarks');
      list.appendChild(lh);
      var chips = el('div', 'lmchips');
      lms.forEach(function (lm) {
        var chip = el('button', 'lmchip', state.lang === 'zh' ? lm.zh : lm.en);
        chip.onclick = function () { openLandmark(lm); };
        chips.appendChild(chip);
      });
      list.appendChild(chips);
      state.cityHost.appendChild(list);
    }
  }

  function openLandmark(lm) {
    if (!state.lmPanel) return;
    state.lmPanel.open(lm, state.lang);
    if (state.lmPanel.host && state.lmPanel.host.scrollIntoView) {
      try { state.lmPanel.host.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
    if (window.CQANALYTICS && window.CQANALYTICS.track) {
      window.CQANALYTICS.track('landmark_open', { id: lm.id });
    }
  }

  function renderScene() {
    var life = state.life;
    if (!life || !state.sceneHost) return;
    var st = life.st;
    var S = window.CQSCENE;
    var SV = window.CQSCENEVIEW;
    if (!S || !SV) return;

    // 归一形态 id：区县包装的选项是 'd_' + form.id
    var form = S.normalizeForm(st.home);
    var hasLift = !!(st.home && st.home.lift);
    var slots = S.slotsFor(form, st.homeFloor, hasLift);
    var roomDef = S.ROOMS[form] || S.ROOMS.oldslab;

    state.sceneHost.innerHTML = '';

    // 标题：房间名 + 楼层
    var head = el('div', 'scene-head');
    head.appendChild(el('span', 'scene-title',
      SV.tr(state.lang, 'room', form, roomDef.zh || '房间', roomDef.en || 'Room')));
    head.appendChild(el('span', 'scene-floor',
      st.homeFloor + 'F' + (hasLift ? (state.lang === 'zh' ? ' · 有电梯' : ' · lift') : '')));
    state.sceneHost.appendChild(head);

    // SVG 房间
    var svgWrap = el('div', 'scene-svg');
    svgWrap.innerHTML = SV.drawRoom({
      slots: slots,
      traces: S.tracesFor(life),
      lang: state.lang,
      roomName: SV.tr(state.lang, 'room', form, roomDef.zh, roomDef.en)
    });
    state.sceneHost.appendChild(svgWrap);

    // 事件委托：点物件
    svgWrap.onclick = function (ev) {
      var g = ev.target && ev.target.closest ? ev.target.closest('.scene-obj') : null;
      if (!g) return;
      var id = g.getAttribute('data-obj');
      if (!id) return;
      doSceneAct(id);
    };
    svgWrap.onkeydown = function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var g = ev.target && ev.target.closest ? ev.target.closest('.scene-obj') : null;
      if (!g) return;
      ev.preventDefault();
      doSceneAct(g.getAttribute('data-obj'));
    };

    // 提示行
    var hint = el('div', 'scene-hint');
    hint.textContent = state.lang === 'zh'
      ? '点房间里的东西，做点什么。每一年你能做的事有限。'
      : 'Click something in the room. You only get so many actions a year.';
    state.sceneHost.appendChild(hint);

    // 结果条
    if (state.sceneMsg) {
      var msg = el('div', 'scene-msg');
      msg.innerHTML = state.sceneMsg;
      state.sceneHost.appendChild(msg);
    }
  }

  /* 执行一个房间动作 */
  function doSceneAct(id) {
    var life = state.life;
    if (!life) return;
    var S = window.CQSCENE;
    if (!S) return;
    var st = life.st;
    var o = S.OBJECTS[id];
    if (!o) return;

    var r = S.act(life, id);
    if (!r.ok) {
      var reason = r.reason === 'tired'
        ? (state.lang === 'zh'
            ? '太累了，做不动。先睡一觉。'
            : 'Too tired for that. Sleep first.')
        : (state.lang === 'zh' ? '这个动作今年做过了。' : 'You already did that this year.');
      state.sceneMsg = reason;
      renderScene();
      return;
    }

    var desc = SV.tr(state.lang, 'desc', o.id, o.descZh, o.descEn);
    var chips = [];
    var names = {
      stamina: state.lang === 'zh' ? '体力' : 'Stamina',
      money: state.lang === 'zh' ? '钱' : 'Money',
      health: state.lang === 'zh' ? '健康' : 'Health',
      happiness: state.lang === 'zh' ? '幸福' : 'Happiness',
      ties: state.lang === 'zh' ? '关系' : 'Ties',
      knowledge: state.lang === 'zh' ? '知识' : 'Knowledge'
    };
    Object.keys(r.changes).forEach(function (k) {
      var v = r.changes[k];
      var sign = v > 0 ? '+' : '';
      chips.push('<span class="chip ' + (v > 0 ? 'up' : 'down') + '">' +
        names[k] + ' ' + sign + v + '</span>');
    });

    state.sceneMsg = '<b>' + (state.lang === 'zh' ? o.zh : o.en) + '</b> — ' + desc +
      ' <span class="chips">' + chips.join('') + '</span>';
    A.track('scene_act', { obj: id, floor: st.homeFloor, layer: st.prof.layer || 'na' });
    paint();
  }

  /* 终局 */
  /* 成就全表：单独一页，看得见还差什么 */
  function showAchievements() {
    /* 注意：这里不能叫 A —— A 是遥测对象（window.CQTELEMETRY），
       用同名局部变量遮蔽它会让别处的 A.track(...) 变成 undefined 的方法。
       这条坑踩过一次：track is not defined。 */
    var ACH = window.CQACHIEVE;
    if (!ACH) return;
    state.stage = 'achievements';
    app.innerHTML = '';
    var head = el('div', 'achpage-head');
    head.appendChild(el('h2', 'q-title', t('成就', 'Achievements')));
    var back = el('button', 'ghostbtn small', t('返回', 'Back'));
    back.onclick = function () { showFinal(); };
    head.appendChild(back);
    app.appendChild(head);

    var all = ACH.getAll();
    Object.keys(ACH.CATS).forEach(function (cat) {
      var list = all.filter(function (a) { return a.cat === cat; });
      if (!list.length) return;
      var sec = el('div', 'achcat');
      sec.appendChild(el('h3', null, state.lang === 'zh' ? ACH.CATS[cat].zh : ACH.CATS[cat].en));
      list.forEach(function (a) {
        var row = el('div', 'achrow' + (a.unlocked ? ' got' : ''));
        row.appendChild(el('div', 'ar-dot', a.unlocked ? '●' : '○'));
        row.appendChild(el('div', 'ar-main',
          el('div', 'ar-zh', state.lang === 'zh' ? a.zh : a.en) +
          el('div', 'ar-desc', state.lang === 'zh' ? a.descZh : a.descEn)));
        sec.appendChild(row);
      });
      app.appendChild(sec);
    });

    var rst = el('button', 'ghostbtn small', t('清空收集进度', 'Reset progress'));
    rst.onclick = function () {
      if (window.confirm(t('确定清空所有收集进度？', 'Clear all collected progress?'))) {
        ACH.reset();
        showAchievements();
      }
    };
    app.appendChild(rst);
  }

  function showFinal() {
    var life = state.life;
    var st = life.st;
    state.stage = 'final';

    /* 人物卡清场：人已经走完了，终局页不该还挂着「楼下嬢嬢在等你」。
     * 注意：必须显式清空，不能只靠 showCard() 的早退分支。 */
    if (state.peopleHost) state.peopleHost.innerHTML = '';

    // 回放横幅：打开别人分享的链接时，必须说清楚这不是「你的」人生
    if (state.replayed && state.bannerHost) {
      var banner = el('div', 'replaybanner');
      banner.appendChild(el('div', 'rb-title', t(
        '这是别人分享给你的一生',
        'This is a life someone shared with you')));
      banner.appendChild(el('div', 'rb-sub', t(
        '你看到的是他完整活过的一次——出生、选择、楼层、结局。现在换成你的。',
        'You are seeing one complete life: the birth, the choices, the floor, the ending. Now it\'s your turn.')));
      var rbBtn = el('button', 'rb-btn', t('活我自己的一生', 'Live my own life'));
      rbBtn.onclick = function () {
        state.replayed = false;
        updateShareUrl();
        renderBirth();
      };
      banner.appendChild(rbBtn);
      state.bannerHost.appendChild(banner);
    }

    // 剖面补上完整轨迹
    if (state.sec) {
      state.sec.innerHTML = V.drawSection({
        building: st.home, floor: st.homeFloor, path: st.path, lang: state.lang
      });
    }

    /* 成就：结算这条人生。
     * 「一次人生不可重置」意味着只能靠多活几条来收集——
     * 成就就是重玩的理由，而且它只记录「发生过什么」，不评价好坏。 */
    var achNew = [];
    if (window.CQACHIEVE && !state.achRecorded) {
      state.achRecorded = true;
      var res = window.CQACHIEVE.recordLife(st, state.birth);
      achNew = res.newly || [];
      state.achData = res.data;
    }

    // 终局卡片
    var head = el('div', 'lifehead');
    head.appendChild(el('div', 'lh-age', st.finalAge + T('age')));
    head.appendChild(el('div', 'lh-sub', t('生于此', 'Born in') + ' ' + state.birth.district +
      ' · ' + t('死于', 'died at') + ' ' + st.finalAge + t('岁', ' years') +
      (st.causeOfDeath ? ' · ' + (state.lang === 'zh'
        ? (st.causeOfDeathZh || st.causeOfDeath)
        : ({ disease: '疾病', accident: '意外' }[st.causeOfDeath] || st.causeOfDeath)) : '')));
    state.choiceHost.innerHTML = '';
    state.choiceHost.appendChild(head);

    // 结语
    var Epi = epilogueFor(st);
    if (Epi) {
      var epi = el('div', 'epilogue');
      var epiTitle = state.lang === 'zh' ? Epi.titleZh : (Epi[Epi.lang + 'Title'] || Epi.titleEn);
      var epiText = state.lang === 'zh' ? Epi.zh : (Epi[Epi.lang] || Epi.en);
      epi.appendChild(el('div', 'epi-title', epiTitle));
      epi.appendChild(el('div', 'epi-text', epiText));
      state.choiceHost.appendChild(epi);
    }

    // 抉择回顾
    if (st.decisions.length) {
      var dbox = el('div', 'decisions');
      dbox.appendChild(el('h3', null, T('decisionsMade')));
      st.decisions.forEach(function (d) {
        var row = el('div', 'dec-row');
        row.appendChild(el('span', 'dec-age', d.age + T('age')));
        row.appendChild(el('span', 'dec-label', state.lang === 'zh' ? d.labelZh : d.labelEn));
        dbox.appendChild(row);
      });
      state.choiceHost.appendChild(dbox);
    }

    /* ---------- 成就 ---------- */
    if (window.CQACHIEVE) {
      var sum = window.CQACHIEVE.summary();
      var abox = el('div', 'achbox');

      if (achNew.length) {
        var nb = el('div', 'achnew');
        nb.appendChild(el('div', 'an-title', t('解锁了新的一页', 'A new page opens')));
        achNew.forEach(function (a) {
          var row = el('div', 'achrow fresh');
          row.appendChild(el('div', 'ar-zh', state.lang === 'zh' ? a.zh : a.en));
          row.appendChild(el('div', 'ar-desc', state.lang === 'zh' ? a.descZh : a.descEn));
          nb.appendChild(row);
        });
        abox.appendChild(nb);
      }

      var ah = el('div', 'achhead');
      ah.appendChild(el('div', 'ah-title', t('收集进度', 'Collected')));
      ah.appendChild(el('div', 'ah-num', sum.unlocked + ' / ' + sum.total));
      abox.appendChild(ah);

      // 三个收集条：8 层 / 12 职业 / 37 区县
      var bars = el('div', 'achbars');
      [
        ['layer', sum.layers, 8, t('垂直层', 'Heights'), t('住过的高度', 'Heights lived')],
        ['job', sum.jobs, 12, t('职业', 'Jobs'), t('干过的活', 'Jobs worked')],
        ['district', sum.districts, 37, t('区县', 'Districts'), t('待过的地方', 'Places lived')]
      ].forEach(function (b) {
        var bar = el('div', 'achbar');
        var top = el('div', 'ab-top');
        top.appendChild(el('span', 'ab-label', b[3]));
        top.appendChild(el('span', 'ab-num', b[1] + ' / ' + b[2]));
        bar.appendChild(top);
        var track = el('div', 'ab-track');
        var fill = el('div', 'ab-fill');
        fill.style.width = Math.min(100, (b[1] / b[2]) * 100) + '%';
        track.appendChild(fill);
        bar.appendChild(track);
        bar.appendChild(el('div', 'ab-desc', b[4]));
        bars.appendChild(bar);
      });
      abox.appendChild(bars);

      var more = el('button', 'ghostbtn small', t('查看全部成就', 'See all achievements'));
      more.onclick = function () { showAchievements(); };
      abox.appendChild(more);

      state.choiceHost.appendChild(abox);
    }

    // 分享卡
    state.cardHost.innerHTML = '';
    state.cardHost.appendChild(el('h2', 'q-title', T('share')));
    var card = el('div', 'cardwrap');
    var result = { birth: state.birth, state: st, profile: st.prof };
    card.innerHTML = V.drawShareCard(result, { lang: state.lang });
    state.cardHost.appendChild(card);

    // ---- 分享层：PNG 导出 + 复制文案 + 原生分享 ----
    var shareBar = el('div', 'sharebar');

    var savePng = el('button', 'bigbtn small', T('savePng'));
    savePng.onclick = function () { exportPng(card); };
    shareBar.appendChild(savePng);

    var saveSvg = el('button', 'ghostbtn', T('saveSvg'));
    saveSvg.onclick = function () {
      var svg = card.querySelector('svg');
      var blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'yuyouyue-lifetime-' + state.seed.toString(16) + '.svg';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    };
    shareBar.appendChild(saveSvg);

    var copyBtn = el('button', 'ghostbtn', T('copyText'));
    copyBtn.onclick = function () { copyShareText(copyBtn); };
    shareBar.appendChild(copyBtn);

    // 分享这条人生的链接：别人打开就是同一条人生
    var linkBtn = el('button', 'ghostbtn', T('copyLink'));
    linkBtn.onclick = function () {
      var url = shareUrl();
      A.track('share_clicked', {
        via: 'copy_link',
        epilogue: state.life && state.life.st && state.life.st.epilogue
          ? state.life.st.epilogue.titleEn : ''
      });
      var done = function () {
        linkBtn.textContent = T('copied');
        setTimeout(function () { linkBtn.textContent = T('copyLink'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url, done); });
      } else {
        fallbackCopy(url, done);
      }
    };
    shareBar.appendChild(linkBtn);

    // 同秒四人：四条命四种楼层并排，这是短视频最好的结构
    var cmpBtn = el('button', 'ghostbtn', T('compareFour'));
    cmpBtn.onclick = function () { showCompare(); };
    shareBar.appendChild(cmpBtn);

    // 原生分享（移动端 Web Share）
    if (navigator.share) {
      var nativeBtn = el('button', 'ghostbtn', T('nativeShare'));
    nativeBtn.addEventListener('click', function () {
      A.track('share_clicked', {
        via: 'native',
        epilogue: state.life && state.life.st && state.life.st.epilogue
          ? state.life.st.epilogue.titleEn : ''
      });
    });
      nativeBtn.onclick = function () {
        var svg = card.querySelector('svg');
        var blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
        var file = null;
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'life.svg', { type: 'image/svg+xml' })] })) {
          file = new File([blob], 'life.svg', { type: 'image/svg+xml' });
        }
        var payload = { title: 'A Date with Chongqing', text: shareText() };
        if (file) payload.files = [file];
        navigator.share(payload).catch(function () { /* 用户取消 */ });
      };
      shareBar.appendChild(nativeBtn);
    }
    state.cardHost.appendChild(shareBar);

    // 分享文案
    var st2 = st;
    function shareText() {
      var jobName = st2.job ? (state.lang === 'zh' ? st2.job.zh : st2.job.en) : (state.lang === 'zh' ? '无' : 'none');
      var homeName = state.lang === 'zh' ? (st2.home.zh || st2.home.en) : (st2.home.en || st2.home.zh);
      var _Epi = epilogueFor(st2);
      var epiTitle = _Epi
        ? (state.lang === 'zh' ? _Epi.titleZh : (_Epi[_Epi.lang + 'Title'] || _Epi.titleEn)) : '';
      var lines = state.lang === 'zh' ? [
        '我在重庆活了 ' + st2.finalAge + ' 岁。',
        '住在' + homeName + ' ' + st2.homeFloor + ' 楼，做了' + jobName + '。',
        epiTitle ? ('「' + epiTitle + '」') : '',
        '一次人生，不能重来。',
        '你也来一次？',
        'A Date with Chongqing — THE 8D CITY'
      ] : [
        'I lived ' + st2.finalAge + ' years in Chongqing.',
        homeName + ', floor ' + st2.homeFloor + '. ' + jobName + '.',
        epiTitle ? ('"' + epiTitle + '."') : '',
        'One life. No re-rolls.',
        'Take your turn:',
        'A Date with Chongqing — THE 8D CITY'
      ];
      return lines.filter(Boolean).join('\n');
    }

    function copyShareText(btn) {
      A.track('share_clicked', {
        via: 'copy_text',
        epilogue: state.life && state.life.st && state.life.st.epilogue
          ? state.life.st.epilogue.titleEn : ''
      });
      var text = shareText();
      var done = function () {
        btn.textContent = T('copied');
        setTimeout(function () { btn.textContent = T('copyText'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    }

    function fallbackCopy(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
      document.body.removeChild(ta);
    }

    function exportPng(wrap) {
      var svg = wrap.querySelector('svg');
      if (!svg) return;
      A.track('share_clicked', {
        via: 'save_png',
        epilogue: state.life && state.life.st && state.life.st.epilogue
          ? state.life.st.epilogue.titleEn : ''
      });
      var clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var svgText = new XMLSerializer().serializeToString(clone);
      var svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(svgBlob);
      var img = new Image();
      var scale = 2;   // 2 倍图，社交平台不糊
      img.onload = function () {
        var w = 640, h = 400;
        var canvas = document.createElement('canvas');
        canvas.width = w * scale; canvas.height = h * scale;
        var ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'a-date-with-chongqing-' + state.seed.toString(16) + '.png';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); };
      img.src = url;
    }

    // ---- 同秒四人对比 ----
    function showCompare() {
      var host = document.querySelector('.comparewrap');
      if (!host) {
        host = el('div', 'comparewrap');
        state.cardHost.appendChild(host);
      }
      host.innerHTML = '';
      host.appendChild(el('h3', null, T('compareFour')));
      // 四个不同楼层、同一套规则、同一批 seed 的四条命
      var floors = [1, 11, 15, 24];
      // 职业路径：四条命走不同的 22 岁选项，对比才有意义
      // （同一职业四条命只比楼层差异，对比图会显得重复）
      var lives = floors.map(function (f, i) {
        var life = R.createLife(state.seed + i * 7919, state.birthYear, state.pickBuilding, f);
        var g2 = 0;
        while (g2++ < 400) {
          var r = life.step();
          if (r.status === 'await_choice') {
            var d = r.decision;
            // 22 岁那组选项是随机抽的，不是每次都同几个职业——
            // 所以按「第 i 条命挑第 i 个职业选项」来保证四条命职业不同
            var pick = d.options[0].id;
            if (d.id === 'age22' && d.options.length > 1) {
              pick = d.options[i % d.options.length].id;
            }
            life.choose(pick);
            continue;
          }
          if (r.status === 'dead') break;
        }
        return { birth: life.birth, state: life.st };
      });
      var cmp = el('div', 'comparecardwrap');
      cmp.innerHTML = V.drawCompare(lives, { lang: state.lang });
      host.appendChild(cmp);

      var saveCmp = el('button', 'bigbtn small', T('savePng'));
      saveCmp.onclick = function () { exportPng(cmp); };
      host.appendChild(saveCmp);
      if (typeof host.scrollIntoView === 'function') {
        host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // 终局：URL 变成这条人生的永久地址，社交预览卡同步
    updateShareUrl();
    updateOgTags(st);

    // 来源
    var src = el('div', 'sources');
    src.appendChild(el('h3', null, T('sources')));
    [D.CQ.src, D.HOUSING.src, D.CITY.src, D.BANGBANG.src, D.TAG.src].forEach(function (s) {
      src.appendChild(el('div', 'src-line', '· ' + s));
    });
    state.cardHost.appendChild(src);

    /* ---------- 下一世 ---------- */
    /* 承诺是「一次人生，不可重掷」，所以重开必须读起来像延续，不是重来。
     * 这一世活完了：把它住过的层、活到的年数、留下的东西存下来，
     * 下一世从同一个层开始投胎 —— 门后还摆着这一世留下的东西。 */
    var NL2 = window.CQNEXTLIFE;
    if (NL2) {
      var legacy = NL2.commitLife(life);
      var nlBox = el('div', 'nextlife');
      nlBox.appendChild(el('h3', null, state.lang === 'zh' ? '下一世' : 'The next life'));
      nlBox.appendChild(el('div', 'nl-line', state.lang === 'zh'
        ? '你住的那一层会跟着你走。这一世活到 ' + (legacy ? legacy.years : st.finalAge) + ' 岁。'
        : 'The layer you lived on comes with you. This life ran to ' +
          (legacy ? legacy.years : st.finalAge) + ' years.'));
      var rel = NL2.relicsOf(legacy);
      if (rel.length) {
        nlBox.appendChild(el('div', 'nl-relics',
          (state.lang === 'zh' ? '门后留下：' : 'Left at the door: ') +
          rel.map(function (r) { return state.lang === 'zh' ? r.zh : r.en; }).join(' · ')));
      }
      var nlBtn = el('button', 'bigbtn', state.lang === 'zh' ? '开始下一世' : 'Begin the next life');
      nlBtn.onclick = function () {
        renderBirth();
        safeScrollTop();
      };
      nlBox.appendChild(nlBtn);
      state.cardHost.appendChild(nlBox);
    }

    /* 纪念卡（V1.2）：游戏本体免费，$9 是实体/数字纪念卡 */
    if (window.CQCITYVIEW && window.CQCARD && state.cardHost) {
      var shopHost = el('div', 'cardshophost');
      state.cardHost.appendChild(shopHost);
      state.cardShop = new window.CQCITYVIEW.CardShop(shopHost, {
        track: (state.lang === 'zh' ? 'zh' : 'en') + '-final'
      });
    }

    if (state.nextBtn) state.nextBtn.style.display = 'none';
  }


  /* ---------- 分享链接：一条人生可以被复现和转发 ---------- */
  /* URL 形态：?s=<seed hex>&y=<year>&f=<floor>&c=<choice ids 逗号分隔>
   * 任何拿到这个链接的人看到的都是同一条人生——这才是「不可重置」的真正含义：
   * 你不能自己重开，但你可以把这一条给别人看。 */
  function shareUrl() {
    var q = 's=' + state.seed.toString(16) +
            '&y=' + state.birthYear +
            '&f=' + (state.pickFloor || 11);
    /* 层和楼型必须进 URL：
     * 只给 seed + 楼层的话，回放会落在另一个区县的另一栋楼上，
     * 那就不是同一条人生了。 */
    if (state.pickLayer) q += '&l=' + state.pickLayer;
    if (state.pickBuilding && state.pickBuilding.id) q += '&b=' + encodeURIComponent(state.pickBuilding.id);
    if (state.choiceLog.length) q += '&c=' + state.choiceLog.join(',');
    return location.origin + location.pathname + '?' + q;
  }

  function updateShareUrl() {
    if (!history.replaceState) return;
    try { history.replaceState(null, '', shareUrl()); } catch (e) { /* file:// 下会抛 */ }
  }

  /* 社交预览卡：分享出去的那一眼，决定有没有人点进来 */
  function updateOgTags(st) {
    if (!st) return;
    var _Epi2 = epilogueFor(st);
    var epi = _Epi2
      ? (state.lang === 'zh' ? _Epi2.titleZh : (_Epi2[_Epi2.lang + 'Title'] || _Epi2.titleEn))
      : '';
    var job = st.job ? (state.lang === 'zh' ? st.job.zh : st.job.en) : '';
    var desc = state.lang === 'zh'
      ? ('我在重庆活了 ' + st.finalAge + ' 岁，住在' + (st.home.zh || st.home.en) + ' ' + st.homeFloor +
         ' 楼，做了' + job + '。' + epi + ' 一次人生，不能重来。')
      : ('I lived ' + st.finalAge + ' years in Chongqing, ' + (st.home.en || st.home.zh) +
         ' floor ' + st.homeFloor + ', as ' + job + '. ' + epi + ' One life. No re-rolls.');
    var set = function(sel, val) {
      var m = document.querySelector(sel);
      if (m) m.setAttribute('content', val);
    };
    set('meta[property="og:title"]',
      'A Date with Chongqing' + (epi ? ' — ' + epi : ''));
    set('meta[property="og:description"]', desc);
    set('meta[name="twitter:title"]',
      'A Date with Chongqing' + (epi ? ' — ' + epi : ''));
    set('meta[name="twitter:description"]', desc);
    set('meta[name="description"]', desc);
  }

  /* ---------- 按当前语言重算结语 ---------- */
  /* 结语在人生结束那一刻就生成了（英文），
   * 所以切换语言后必须重新生成一次，否则
   * 日语用户会看到英文结语。 */
  function epilogueFor(st) {
    if (!st) return null;
    if (window.CQTEXT && window.CQTEXT.composeEpilogue) {
      try {
        return window.CQTEXT.composeEpilogue(st, state.lang);
      } catch (e) { /* 回退到已生成的结语 */ }
    }
    return st.epilogue;
  }

  /* ---------- 语言切换 ---------- */
  /* V1：支持 5 门语言（英 / 中 / 日 / 韩 / 西）。
   * 语言是数据驱动的：加一门语言只是加一份翻译包，
   * 不用改任何逻辑代码。 */
  var LANGS = (window.CQI18N && window.CQI18N.LANGS) || [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'zh', label: '中文', short: '中文' }
  ];

  function setLang(l) {
    if (!LANGS.some(function (x) { return x.code === l; })) l = 'en';
    state.lang = l;
    // 文本层跟随 UI 语言
    if (window.CQTEXT && window.CQTEXT.setLang) window.CQTEXT.setLang(l);
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
    document.body.classList.toggle('zh', l === 'zh');
    // 顶栏语言按钮：显示为菜单
    var btn = $('langbtn');
    if (btn) {
      btn.textContent = LANGS.filter(function (x) { return x.code === l; })[0].short;
      btn.onclick = function (e) {
        e.stopPropagation();
        toggleLangMenu();
      };
    }
    closeLangMenu();
    rerender();
  }

  /* 语言下拉：点开选一门 */
  function toggleLangMenu() {
    var m = $('langmenu');
    if (!m) {
      m = el('div', 'langmenu');
      m.id = 'langmenu';
      document.body.appendChild(m);
    }
    if (m.style.display === 'block') { closeLangMenu(); return; }
    m.innerHTML = '';
    LANGS.forEach(function (L) {
      var b = el('button', 'lm-item' + (L.code === state.lang ? ' cur' : ''), L.label);
      b.onclick = function (e) {
        e.stopPropagation();
        setLang(L.code);
        A.track('lang_switch', { lang: L.code });
      };
      m.appendChild(b);
    });
    m.style.display = 'block';
    var r = $('langbtn').getBoundingClientRect();
    m.style.top = (r.bottom + 6) + 'px';
    m.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  }

  function closeLangMenu() {
    var m = $('langmenu');
    if (m) m.style.display = 'none';
  }

  document.addEventListener('click', function () { closeLangMenu(); });

  function rerender() {
    if (state.stage === 'birth') renderBirth();
    else if (state.stage === 'housing') renderHousing();
    else if (state.stage === 'life') {
      // 重绘人生界面，保留进度
      var keepStage = state.stage;
      renderLife();
      state.stage = keepStage;
      if (state.life && state.life.phase === 'dead') showFinal();
      else if (state.life && state.life.phase === 'await_choice') showChoice(state.life.pending);
    } else if (state.stage === 'final') {
      renderLife();
      showFinal();
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    /* 语言按钮：打开语言下拉菜单（不是 zh/en 来回切） */
    $('langbtn').onclick = function (e) { e.stopPropagation(); toggleLangMenu(); };
    $('year').onchange = function () { state.birthYear = parseInt($('year').value, 10); };
    state.birthYear = parseInt($('year').value, 10);
    /* 语言：优先 ?lang=，没有则按浏览器语言猜，最后回落英文。
     * 西语/日语用户直接打开链接，不应该先看到英文再自己找开关。 */
    var langParam = null;
    try {
      langParam = new URLSearchParams(location.search).get('lang');
    } catch (e) { /* ignore */ }
    var guess = langParam;
    if (!guess) {
      /* 按浏览器语言猜。中文用户自然拿到中文界面，
       * 其余语言先给英文——海外首发的主语言是英文，
       * 不确定时宁可给英文也不要给中文。 */
      var bl = (navigator.language || 'en').toLowerCase();
      if (bl.indexOf('zh') === 0) guess = 'zh';
      else if (bl.indexOf('ja') === 0) guess = 'ja';
      else if (bl.indexOf('ko') === 0) guess = 'ko';
      else if (bl.indexOf('es') === 0) guess = 'es';
      else guess = 'en';
    }
    /* 记一笔用的是哪种语言，遥测能看出流量构成 */
    A.track('landing_lang', { lang: guess });
    setLang(guess);
    autoAdvance();
    // 外部测试面板：?test=1 打开
    try {
      if (new URLSearchParams(location.search).get('test')) renderTestPanel();
    } catch (e) { /* ignore */ }
  });

  /* ---------- 分享链接回放 ---------- */
  /* ?s=<seed>&y=<year>&f=<floor>&c=<id1,id2,...>
   * 拿到链接的人不需要重玩一遍：他直接看到那一条人生。
   * 这才是「一次人生、不可重置」在分享层面的真正含义。 */
  function replayFromUrl() {
    var q = new URLSearchParams(location.search);
    var seedHex = q.get('s');
    if (!seedHex) return false;
    var seed = parseInt(seedHex, 16);
    if (!isFinite(seed) || seed <= 0) return false;
    var year = parseInt(q.get('y') || '2026', 10);
    var floor = parseInt(q.get('f') || '11', 10);
    var choices = (q.get('c') || '').split(',').filter(Boolean);

    var layer = q.get('l') || '';
    var bId = q.get('b') || '';

    state.seed = seed >>> 0;
    state.birthYear = year;
    var rng = new R.RNG(state.seed);
    var birth = R.drawBirth(rng, year);
    state.birth = birth;

    /* 优先按 URL 里的层和楼型 id 复原；老链接没有这两个参数时退回原行为 */
    var opts = R.housingOptionsFor(birth.district, birth.urban);
    var bld = null, i;
    if (bId) {
      for (i = 0; i < opts.length; i++) {
        if (opts[i].id === bId) { bld = opts[i]; break; }
      }
    }
    if (!bld && layer) {
      for (i = 0; i < opts.length; i++) {
        if (opts[i].layer === layer) { bld = opts[i]; break; }
      }
    }
    if (!bld) {
      for (i = 0; i < opts.length; i++) {
        if (opts[i].floors >= floor && opts[i].layer === layer) { bld = opts[i]; break; }
      }
    }
    if (!bld) bld = opts[0];
    state.pickLayer = bld.layer || layer || 'L5';
    state.pickBuilding = bld;
    state.pickFloor = Math.min(floor, bld.floors);

    state.life = R.createLife(state.seed, year, state.pickBuilding, state.pickFloor);
    state.choiceLog = [];
    var gi = 0;
    var guard = 0;
    while (guard++ < 400) {
      var r = state.life.step();
      if (r.status === 'await_choice') {
        // 按 URL 里的顺序重放；不够了就取第一个
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
    state.result = { birth: state.birth, state: state.life.st, profile: state.life.st.prof };
    state.stage = 'life';
    state.replayed = true;
    A.track('replay_opened', {
      age: state.life.st.finalAge,
      job: state.life.st.job ? state.life.st.job.id : 'none',
      layer: state.life.st.prof.layer || 'na',
      floor: state.life.st.homeFloor,
      epilogue: state.life.st.epilogue ? state.life.st.epilogue.titleEn : ''
    });
    renderLife();
    showFinal();
    return true;
  }

  /* 预览模式：?preview=life（自动跑完）/ ?preview=step（停在某个抉择）
   * 用于生成分享卡截图、社交预览图和自动化回归测试。 */
  /* ---------- 外部测试面板 ---------- */
  /* ?test=1 打开：显示本次会话的汇总数据 + 导出按钮。
   * 目的是让测试者能直接把结果交回来，而不用开发者去翻数据库。 */
  function renderTestPanel() {
    // 面板必须挂在 #app 之外：每次 re-render 都会 app.innerHTML = ''，
    // 挂在里面的话一进选层页就被抹掉了。
    var host = $('testhost');
    if (!host) {
      host = el('div', 'testhost');
      host.id = 'testhost';
      document.body.appendChild(host);
    }
    host.innerHTML = '';
    var panel = el('div', 'testpanel');
    panel.appendChild(el('h3', null, t('外部测试面板', 'External test panel')));

    var out = el('pre', 'testdata');
    var refresh = function () {
      var d = A.dump();
      out.textContent = JSON.stringify(d, null, 2);
    };
    refresh();

    var bar = el('div', 'testbar');
    var copyBtn = el('button', 'ghostbtn', t('复制数据', 'Copy data'));
    copyBtn.onclick = function () {
      var text = out.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = T('copied');
          setTimeout(function () { copyBtn.textContent = t('复制数据', 'Copy data'); }, 1800);
        });
      }
    };
    var resetBtn = el('button', 'ghostbtn', t('清空', 'Reset'));
    resetBtn.onclick = function () { A.reset(); refresh(); };
    var reloadBtn = el('button', 'ghostbtn', t('刷新', 'Refresh'));
    reloadBtn.onclick = refresh;
    bar.appendChild(copyBtn); bar.appendChild(resetBtn); bar.appendChild(reloadBtn);
    panel.appendChild(bar);
    panel.appendChild(out);

    host.appendChild(panel);
    state.testPanel = panel;
  }

  function autoAdvance() {
    var q = new URLSearchParams(location.search);
    var mode = q.get('preview');
    // 分享链接优先：带 s= 的链接直接回放那条人生
    if (!mode && q.get('s')) {
      if (replayFromUrl()) {
        if (q.get('test')) renderTestPanel();
        return;
      }
    }
    if (!mode) return;
    var seed = parseInt(q.get('seed') || '20261113', 10);
    if (mode !== 'housing' && mode !== 'life' && mode !== 'step' && mode !== 'final') return;

    doBirth(seed);
    if (!state.pickBuilding) return;
    var fl = parseInt(q.get('floor') || '11', 10);
    state.pickFloor = fl;
    if (mode === 'housing') { renderFloors(); return; }

    state.life = R.createLife(state.seed, state.birthYear, state.pickBuilding, fl);
    state.result = { birth: state.birth, state: state.life.st, profile: state.life.st.prof };
    renderLife();

    if (mode === 'step') {
      // 推进到第一个抉择就停
      var guard = 0;
      while (guard++ < 60 && state.life.phase === 'running') {
        var r = state.life.step();
        if (r.status === 'await_choice') { showChoice(r.decision); break; }
        if (r.status === 'dead') { state.result = { birth: state.birth, state: state.life.st, profile: state.life.st.prof }; showFinal(); break; }
      }
      paint();
      return;
    }

    // mode === 'life' / 'final'：自动选完所有抉择
    var g2 = 0;
    while (g2++ < 400) {
      if (state.life.phase === 'dead') break;
      if (state.life.phase === 'await_choice') {
        var d = state.life.pending;
        var pick = d.options[0].id;
        // 预览/自动模式选最有戏剧性的选项：棒棒线优先，其次收徒
        ['job_bangbang', 'bb_teach', 'city_move'].forEach(function (want) {
          d.options.forEach(function (o) { if (o.id === want) pick = o.id; });
        });
        state.life.choose(pick);
        continue;
      }
      state.life.step();
    }
    state.result = { birth: state.birth, state: state.life.st, profile: state.life.st.prof };
    showFinal();
    paint();
  }
  // 调试出口：外部测试面板和自动化脚本需要读内部状态
  if (typeof window !== 'undefined') {
    window.CQSTATE = state;
    window.CQAPP = {
      setLang: setLang,
      showCard: showCard,
      getState: function () { return state; },
      shareUrl: shareUrl,
      replayFromUrl: replayFromUrl
    };
  }
})();
