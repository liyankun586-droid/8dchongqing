/* 渝你有约 — P0 规则层（第二版）
 * 确定性：同一个 seed + 同一串抉择 = 同一条人生。引擎不调用任何 LLM。
 *
 * 核心耦合：住几楼 → 通勤时间 / 体力 / 租金 / 金钱开销 / 健康 / 幸福 / 关系
 * 第二版新增：
 *   1) 逐年推进（step/choose），让一局有节奏，而不是瞬间算完
 *   2) 抉择节点（5/15/22/30/50/70 岁 + 棒棒专属节点）
 *   3) 棒棒人生线：行业景气度按真实报道锚定，体力曲线 + 时代退潮 + 被替代
 *
 * 单位约定：
 *   money   = 人民币元（实际数字，不是抽象分）
 *   axes    = 0–100 归一化轴
 *   wealth 轴映射：净资产 0 元 → 0 分，2,000,000 元 → 100 分
 */
(function (root) {
  'use strict';

  var D = root.CQDATA;

  /* ---------- 确定性随机 ----------
   * xorshift32 + 整数混淆（splitmix32 finalizer）。
   * 必须做 seed 混淆：xorshift32 直接用连续小整数做种子时，
   * 首个输出几乎是线性的（1→0.000063, 2→0.000126, 3→0.000189...），
   * 会让不同开局抽到同一个出生地。
   */
  function mix32(seed) {
    var z = (seed >>> 0) || 0x9e3779b9;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
  }
  function RNG(seed) {
    this.s = mix32(seed) || 1;
  }
  RNG.prototype.next = function () {
    var x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x;
    return x / 4294967296;
  };
  RNG.prototype.range = function (a, b) { return a + (this.next() * (b - a)); };
  RNG.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.weighted = function (items, weightFn) {
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += weightFn(items[i]);
    var r = this.next() * total;
    for (i = 0; i < items.length; i++) {
      r -= weightFn(items[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };

  /* ---------- 状态轴 ---------- */
  var AXES = [
    { id: 'stamina', zh: '体力', en: 'Stamina' },
    { id: 'wealth', zh: '财富', en: 'Wealth' },
    { id: 'health', zh: '健康', en: 'Health' },
    { id: 'happiness', zh: '幸福', en: 'Happiness' },
    { id: 'knowledge', zh: '知识', en: 'Knowledge' },
    { id: 'ties', zh: '关系', en: 'Ties' }
  ];

  /* ---------- 城市垂直摩擦模型 ----------
   * 每层楼同时影响五个变量。参数写成可读常数，方便按真实数据调。
   */
  var FRICTION = {
    stairMinPerFloor: 1.6,        // 爬一层楼（分钟）
    stairStaminaPerFloor: 1.35,    // 每层楼梯的体力负荷（展示用）
    // 体力是「平衡态」而不是一次性资源：
    // 每天爬 N 层楼 × 每天上下班两趟 × 300 个工作日 = 年消耗量。
    // 体力向一个由「通勤 + 爬楼」决定的平衡点漂移。
    commuteDrain: 0.05,           // 每分钟通勤的体力负荷
    stairLoad: 0.55,              // 每层楼梯的体力负荷（平衡点计算用）
    staminaCapacity: 12.0,        // 负荷达到此值时体力归零
    stairAdaptation: 0.022,       // 常年爬楼的人，负荷逐年递减 2.2%（上限 55%）
    liftWaitMin: 6,               // 等电梯
    liftRideMinPerFloor: 0.12,    // 电梯运行每层
    workFloor: 'L3',              // 工作地固定在街面层
    floorPremiumPerFloor: 0.014,  // 同栋楼内每层 +1.4% 租金
    noLiftPenalty: 0.03,          // 无电梯老楼整体便宜 3%
    groundNoise: -6,              // 一楼噪音
    groundDamp: -4,               // 一楼潮湿
    topHeat: -3.5,                // 顶楼热
    topViewBonus: 14,             // 顶层视野（重庆最稀缺的资源）
    midIsolation: -3,             // 中高层孤立
    topIsolation: -5,             // 顶层没人串门
    lowFloorTies: 7,              // 一二楼街坊关系
    oldLiftFailRate: 0.06,        // 老楼电梯故障年概率
    // 通勤 > 40 分钟开始产生额外金钱开销（打车、吃饭、早饭摊）
    commuteFreeMinutes: 40,
    commuteMoneyPerMin: 6.5,      // 元／分钟／工作日（超出免费额度部分）
    workDaysPerYear: 300,
    // 租售比：年租金 = 挂牌总价 × 3.2%
    rentYieldAnnual: 0.032,
    // 独立居住起始年龄：此前与父母同住，不付房租
    independentAge: 22,
    // 净资产 → 财富轴
    wealthTopCNY: 3000000,
    // 环境对健康的影响系数（轻）——环境主要影响幸福，不该决定生死
    envHealthFactor: 0.05,
    // 体力对收入的惩罚
    lowStaminaIncomeMult: 0.60,
    // 房租负担上限：房租占收入比例超过此值就开始伤健康和心情
    rentBurdenMax: 0.40,
    // 农村身份的租金折减：农村户口住在区县城中村/自建房，
    // 租金远低于同地段商品房。没有这个折减，
    // 「农村出身 + 搬到区县城区」的人生会因收入按农村口径、
    // 租金按市区口径而被模型压死。
    ruralRentFactor: 0.42,
    // 棒棒收入模型：年入 = base × 景气度^exp
    bangbangBaseAnnual: 38000,
    bangbangLevelExp: 0.72,
    // 抉择节点年龄
    decisionAges: [5, 15, 22, 30, 50, 70]
  };

  /* 文本层查找器：优先用 CQTEXT 的文案，缺失时回落到内置默认 */
  function T(kind, ctx, fallbackZh, fallbackEn) {
    var TX = root.CQTEXT;
    if (TX && TX.eventText) {
      var r = TX.eventText(kind, ctx);
      if (r && r.zh) return r;
    }
    return { zh: fallbackZh, en: fallbackEn };
  }

  /* ---------- 家庭类型 ---------- */
  var FAMILY_TYPES = [
    { id: 'urban_local', zh: '本地户籍城市家庭', en: 'Local urban family', w: 26 },
    { id: 'rural_local', zh: '本地户籍农村家庭', en: 'Local rural family', w: 18 },
    { id: 'migrant_worker', zh: '跨省流入务工家庭', en: 'Migrant worker family', w: 24 },
    { id: 'left_behind', zh: '留守儿童', en: 'Left-behind child', w: 14 },
    { id: 'migrant_child', zh: '随迁子女', en: 'Migrant child', w: 18 }
  ];

  /* ---------- 职业（年薪，人民币元） ----------
   * drain = 每年额外体力消耗（棒棒最高，因为要扛 200–400 斤货）
   */
  var JOBS = [
    /* risk = 职业意外风险（年度额外死亡风险）：体力劳动、户外、高空更高。
     * 数据没有权威统一口径，这里按职业属性定级，量级参照工伤与交通死亡统计。 */
    { id: 'bangbang', zh: '棒棒', en: 'Porter', urban: 1, salary: [120000, 200000], physical: 0.9, drain: 3.4, risk: 0.0022 },
    { id: 'courier', zh: '外卖骑手', en: 'Delivery rider', urban: 1, salary: [80000, 150000], physical: 0.85, drain: 2.6, risk: 0.0020 },
    { id: 'factory', zh: '流水线工人', en: 'Factory worker', urban: 0, salary: [70000, 120000], physical: 0.8, drain: 2.2, risk: 0.0011 },
    { id: 'office', zh: '写字楼白领', en: 'Office worker', urban: 1, salary: [160000, 400000], physical: 0.15, drain: 0.6, risk: 0.0002 },
    { id: 'teacher', zh: '教师', en: 'Teacher', urban: 1, salary: [150000, 260000], physical: 0.2, drain: 0.8, risk: 0.0002 },
    { id: 'nurse', zh: '护士', en: 'Nurse', urban: 1, salary: [140000, 240000], physical: 0.5, drain: 1.4, risk: 0.0003 },
    { id: 'driver', zh: '货车／网约车司机', en: 'Truck / ride-hailing driver', urban: 1, salary: [110000, 180000], physical: 0.6, drain: 2.0, risk: 0.0014 },
    { id: 'farmer', zh: '农民', en: 'Farmer', urban: 0, salary: [50000, 90000], physical: 0.75, drain: 1.8, risk: 0.0013 },
    { id: 'tech', zh: '程序员', en: 'Programmer', urban: 1, salary: [250000, 600000], physical: 0.1, drain: 0.5, risk: 0.0002 },
    { id: 'shop', zh: '小生意主', en: 'Small trader', urban: 1, salary: [100000, 220000], physical: 0.45, drain: 1.3, risk: 0.0006 },
    { id: 'craft', zh: '手艺人', en: 'Skilled craftsman', urban: 1, salary: [90000, 160000], physical: 0.4, drain: 1.5, risk: 0.0007 },
    { id: 'construction', zh: '建筑工人', en: 'Construction worker', urban: 1, salary: [110000, 200000], physical: 0.9, drain: 3.0, risk: 0.0026 }
  ];
  var JOB_BY_ID = {};
  for (var ji = 0; ji < JOBS.length; ji++) JOB_BY_ID[JOBS[ji].id] = JOBS[ji];

  /* ---------- 棒棒行业景气度 ----------
   * 按公开报道的人数口径锚定，线性插值。
   * 注意口径不一致（2014 宽口径 vs 2016 仅城区），只表达趋势。
   */
  function bangbangLevel(year) {
    var a = D.BANGBANG.anchors;
    if (year <= a[0].year) return a[0].level;
    for (var i = 0; i < a.length - 1; i++) {
      if (year >= a[i].year && year <= a[i + 1].year) {
        var t = (year - a[i].year) / (a[i + 1].year - a[i].year);
        return a[i].level + (a[i + 1].level - a[i].level) * t;
      }
    }
    return a[a.length - 1].level;
  }

  /* 棒棒需求曲线：当年「有多少活可接」。
   * 与人数曲线分开：人数是供给，需求才是你能不能挣到钱。 */
  function bangbangDemand(year) {
    var d = D.BANGBANG.demand;
    if (year <= d[0].year) return d[0].v;
    for (var i = 0; i < d.length - 1; i++) {
      if (year >= d[i].year && year <= d[i + 1].year) {
        var t = (year - d[i].year) / (d[i + 1].year - d[i].year);
        return d[i].v + (d[i + 1].v - d[i].v) * t;
      }
    }
    return d[d.length - 1].v;
  }

  /* ---------- 出生抽样 ---------- */
  function drawBirth(rng, birthYear) {
    var dist = rng.weighted(D.DISTRICTS, function (d) { return d[2]; });
    var fam = rng.weighted(FAMILY_TYPES, function (f) { return f.w; });
    // 出生婴儿性别比 108.18（女=100）→ 男约 51.94%
    var isMale = rng.next() < (108.18 / 208.18);
    var urban = fam.id === 'urban_local' || fam.id === 'migrant_child' ||
                (fam.id === 'migrant_worker' && rng.next() < 0.7);
    var quintile = urban
      ? rng.weighted([0, 1, 2, 3, 4], function (q) { return [30, 28, 22, 14, 6][q]; })
      : rng.weighted([0, 1, 2, 3, 4], function (q) { return [46, 30, 16, 6, 2][q]; });
    return {
      year: birthYear,
      district: dist[0], districtEn: dist[1], districtTier: dist[3],
      family: fam.id, familyZh: fam.zh, familyEn: fam.en,
      sex: isMale ? 'm' : 'f',
      urban: urban,
      incomeQuintile: quintile,
      parentsEducYears: Math.round(rng.range(3, 16)),
      startWealth: urban ? 18 + quintile * 9 : 10 + quintile * 6,
      startHealth: 78 + rng.range(-8, 12),
      startStamina: 82 + rng.range(-8, 10),
      startHappiness: 66 + rng.range(-10, 14),
      startKnowledge: urban ? 25 + quintile * 6 : 18 + quintile * 4,
      startTies: fam.id === 'left_behind' ? 28 : (fam.id === 'migrant_worker' ? 42 : 60)
    };
  }

  /* ---------- 住房选项 ---------- */
  /* ---------- 住房选项 ---------- */
  /* V1：每个区县有自己的住房形态谱系（见 housing.js）。
   * 渝中区额外保留具名建筑（白象居／李子坝／凯旋路）——它们是可核的真实建筑，
   * 有专属机制，不能被形态归纳替代。 */
  function housingOptionsFor(district, urban) {
    var opts = [];
    // 只有渝中区才有白象居／李子坝／凯旋路
    if (district === '渝中') opts = opts.concat(D.CITY.buildings);
    else opts = opts.concat(D.CITY.generic);
    // 8 层住区：每层一个原型，让 8D 从视觉变成可玩的选择
    opts = opts.concat(D.CITY.layerBuildings);

    // V1：区县本地形态
    var H = root.CQHOUSING;
    if (H) {
      var forms = H.formsForDistrict(district, urban);
      var seen = {};
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i].form;
        if (seen[f.id]) continue;
        seen[f.id] = 1;
        opts.push({
          id: 'd_' + f.id,
          zh: f.zh, en: f.en,
          floors: f.floors, lift: f.lift, entrances: f.entrances,
          heightM: f.heightM, floorRange: f.floorRange,
          layer: f.layer, layerCosts: f.layerCosts,
          rentMult: f.rentMult,
          noteZh: f.noteZh, noteEn: f.noteEn, src: f.src,
          // 区县形态的额外信息：这是本区县的典型住法
          districtForm: true
        });
      }
    }
    return opts;
  }

  /* 某区县可选的形态（供 UI 分组与测试使用） */
  function housingFormsFor(district, urban) {
    var H = root.CQHOUSING;
    if (!H) return [];
    return H.formsForDistrict(district, urban);
  }

  /* ---------- 楼层剖面：把「楼层」翻译成人生变量 ---------- */
  function floorProfile(building, floor, year) {
    var yr = year || 2026;
    var f = building.floors;
    var lift = building.lift;

    // 入口层：白象居式多入口。住 12 楼可以从 10 楼入口只爬 2 层，
    // 住 5 楼只能从 1 楼入口爬 4 层——这是白象居最反直觉的地方。
    var entranceFloor = 1;
    for (var i = 0; i < building.entrances.length; i++) {
      if (building.entrances[i] <= floor && building.entrances[i] > entranceFloor) {
        entranceFloor = building.entrances[i];
      }
    }
    // 日常爬层：从最近入口到自己这层。
    // 白象居多入口的意义就在这里——住 11 楼从 10 楼入口只爬 1 层，
    // 住 9 楼从 1 楼入口要爬 8 层。楼下的层数是别人的事。
    var stairs = lift ? 0 : (floor - entranceFloor);
    var verticalMin = lift
      ? FRICTION.liftWaitMin + (floor - 1) * FRICTION.liftRideMinPerFloor
      : stairs * FRICTION.stairMinPerFloor;
    var stairStamina = lift ? 0 : stairs * FRICTION.stairStaminaPerFloor;
    // 电梯坏了要爬的层数：从一层到自家楼层，无电梯楼则是全爬
    var totalStairs = lift ? (floor - 1) : (floor - 1);

    // 通勤 = 上下班往返 + 地面接驳
    var commuteMin = verticalMin * 2 + 12;
    // 通勤过长 → 额外金钱开销（打车 / 路上吃饭）
    var overMin = Math.max(0, commuteMin - FRICTION.commuteFreeMinutes);
    // 金额按当年物价折算（见 eraIndex）
    var commuteMoney = overMin * FRICTION.commuteMoneyPerMin * FRICTION.workDaysPerYear *
                       wageIndex(yr);

    // 租金：同栋内越高层越贵；无电梯老楼整体便宜。
    // 总倍率封顶 1.55：顶层再高也不能贵到普通工薪完全住不起——
    // 否则「最贵」会变成纯粹的陷阱，而不是一个真实取舍。
    var rentBase = 1 + (floor - 1) * FRICTION.floorPremiumPerFloor;
    if (!lift) rentBase -= FRICTION.noLiftPenalty;
    rentBase = Math.min(rentBase, 1.55);

    // 环境与关系
    // 楼层带来的加成必须按楼实际高度缩放：
    // 两层的桥下铺顶上一层就是屋顶，不该拿到 24 层塔楼的视野红利。
    var heightScale = Math.min(1, Math.max(0, (f - 1) / 12));
    var env = 0;
    if (floor === 1) env += (FRICTION.groundNoise + FRICTION.groundDamp) * (0.45 + 0.55 * heightScale);
    if (floor === f) {
      env += (FRICTION.topHeat + FRICTION.topViewBonus + FRICTION.topIsolation) * heightScale;
      // 矮楼的顶层是屋顶：晒得到、也热，但没有视野
      env += (1 - heightScale) * 2;
    } else if (floor >= f * 0.6 && heightScale > 0.5) {
      env += FRICTION.midIsolation * heightScale;
    }
    // 采光：中间楼层最亮，一楼最暗，顶楼好但热
    var light = (floor - 1) / Math.max(1, f - 1);          // 0..1
    env += Math.round(light * 6 * heightScale) - 3 * heightScale;
    var ties = floor <= 3 ? FRICTION.lowFloorTies : (floor >= f * 0.6 ? -2 : 0);

    // ---------- 垂直层（L0–L7）的影响 ----------
    // 楼层是「楼内几层」，垂直层是「你在城市哪个高度」。
    // 两者独立：住 11 楼既可以是梯坎层（老楼），也可以是塔楼层（高层）。
    //
    // 只有显式绑定垂直层的原型才吃这套数值。白象居／李子坝／凯旋路
    // 是具名真实建筑，各自有专属楼层机制，不叠加抽象层代价。
    var layer = building.layer || null;
    // layerCosts=false 的具名建筑只做分类展示，不叠加抽象层代价
    var useLayerCosts = layer && building.layerCosts !== false;
    var L = useLayerCosts
      ? layerEffects(layer, building)
      : { env: 0, ties: 0, rentMult: 1, verticalMin: 0, name: null };
    env += L.env;
    ties += L.ties;
    // 垂直位移成本：地下/江面要爬坡上行，桥层要穿过匝道
    commuteMin += L.verticalMin * 2;

    env = Math.round(env * 10) / 10;

    return {
      floor: floor, layer: layer, layerName: L.name,
      verticalMin: verticalMin, stairStamina: stairStamina,
      extraStairs: stairs, totalStairs: totalStairs,
      commuteMin: commuteMin, commuteMoney: commuteMoney,
      rentBase: rentBase * L.rentMult, env: env, ties: ties, lift: lift,
      entranceFloor: entranceFloor
    };
  }

  /* ---------- 垂直层（L0–L7）的居住代价与红利 ---------- */
  // 每层的身份必须一句话说得清，且代价和红利在不同轴上：
  //   L0 地下   —— 最便宜，环境和健康最差，没人串门
  //   L1 江面   —— 便宜，看得见江，码头有人味，但潮湿吵
  //   L2 桥层   —— 最便宜之一，头顶是车流，没人愿意住
  //   L3 街面   —— 街坊关系最强，通勤最短，吵
  //   L4 梯坎   —— 重庆的经典：坡、梯坎、便宜、熟人社会
  //   L5 居住   —— 标准层，不上不下，安全的中间选择
  //   L6 塔楼   —— 视野好、贵、孤立
  //   L7 天台   —— 最稀缺：视野最好、最孤独、最贵、最孤独到老
  var LAYER_FX = {
    L0: { env: -14, ties: -6, rentMult: 0.50, verticalMin: 3,
          name: '地下层' },              // 便宜、潮、没光、没人串门
    L1: { env: -8, ties: 4, rentMult: 0.66, verticalMin: 5,
          name: '江面层' },              // 潮、吵，但看得见江、码头有人
    L2: { env: -10, ties: -5, rentMult: 0.56, verticalMin: 7,
          name: '桥层' },                // 车流噪音、灰，但便宜
    L3: { env: -1, ties: 11, rentMult: 0.90, verticalMin: 2,
          name: '街面层' },              // 最方便，街坊关系最好
    L4: { env: 3, ties: 5, rentMult: 0.96, verticalMin: 6,
          name: '梯坎层' },              // 经典，代价是爬坡
    L5: { env: 7, ties: 1, rentMult: 1.0, verticalMin: 4,
          name: '居住层' },              // 标准层
    L6: { env: 13, ties: -7, rentMult: 1.10, verticalMin: 5,
          name: '塔楼层' },              // 视野好、贵、孤立
    L7: { env: 19, ties: -10, rentMult: 1.22, verticalMin: 6,
          name: '天台层' }               // 最稀缺，也最孤独
  };

  function layerEffects(layerId, building) {
    var fx = LAYER_FX[layerId] || LAYER_FX.L5;
    return {
      env: fx.env, ties: fx.ties, rentMult: fx.rentMult,
      verticalMin: fx.verticalMin, name: fx.name
    };
  }

  /* 某个原型属于哪一层（没有绑定则返回 null） */
  function buildingLayer(b) { return b && b.layer ? b.layer : null; }

  /* ---------- 年代插值：从年度锚点表取某年的值 ---------- */
  function seriesAt(table, year) {
    var years = Object.keys(table).map(Number).sort(function (a, b) { return a - b; });
    if (!years.length) return 0;
    if (year <= years[0]) return table[years[0]];
    if (year >= years[years.length - 1]) return table[years[years.length - 1]];
    for (var i = 0; i < years.length - 1; i++) {
      if (year >= years[i] && year <= years[i + 1]) {
        var t = (year - years[i]) / (years[i + 1] - years[i]);
        return table[years[i]] + (table[years[i + 1]] - table[years[i]]) * t;
      }
    }
    return table[years[years.length - 1]];
  }

  /* 工资基准：当年城镇居民人均可支配收入 / 2026 年值。
   * 工资和房价不是同一个曲线：1985 年重庆城镇收入 762 元，
   * 2026 年 51854 元——涨了 68 倍；同期住宅均价只涨了约 15 倍。
   * 用房价指数折算工资会让 1985 年的人富得离谱。 */
  function wageIndex(year) {
    return seriesAt(D.URBAN_INCOME, year) / seriesAt(D.URBAN_INCOME, 2026);
  }

  /* 房价基准：当年住宅均价 / 2026 年值。用于折算房产相关金额。 */
  function priceIndex(year) {
    return seriesAt(D.RES_PRICE, year) / seriesAt(D.RES_PRICE, 2026);
  }

  /* 当年城镇／农村人均可支配收入（元），用于「这一年在重庆能挣多少」 */
  function meanIncome(year, urban) {
    return urban
      ? seriesAt(D.URBAN_INCOME, year)
      : seriesAt(D.RURAL_INCOME, year);
  }

  /* ---------- 租金（元／月） ----------
   * 口径：当年全市住宅均价 × 区县相对系数 × 面积 × 租售比（3.2%／年）÷ 12。
   * 区县相对系数用 2026 挂牌口径（见 data.js DISTRICT_MULT），
   * 因为全市住宅均价序列是成交口径，两者口径不同但相对关系稳定。 */
  function monthlyRent(livingDistrict, building, prof, year, urban) {
    var yr = year || 2026;
    var mult = D.DISTRICT_MULT[livingDistrict] || D.DISTRICT_MULT.default;
    var cityPrice = seriesAt(D.RES_PRICE, yr);
    /* 城乡房价口径必须分开。
     * 原式所有区县都用全市（市区）住宅均价序列算租金，
     * 于是「农村出身 + 搬到万州城区」这种人生：
     * 年收入按农村人均可支配收入算（2013 年 4,800 元），
     * 房租却按市区房价算（万州 5,000+ 元/月）——
     * 收入只有房租的一半，模型必然把这个人压死。
     *
     * 现实里农村户口住在区县城中村/自建房，
     * 租金远低于同地段商品房。所以农村身份用 0.42 的租金折减，
     * 并改用当年人均可支配收入推算的收入口径。 */
    if (urban === false) cityPrice *= FRICTION.ruralRentFactor;
    var sizeM2 = building.id === 'stairwell' ? 58
               : (building.id === 'gen_selfbuilt' ? 95
               : (building.id === 'gen_walkup' ? 62 : 72));
    var totalPrice = cityPrice * mult * sizeM2;
    var base = totalPrice * FRICTION.rentYieldAnnual / 12;
    return base * prof.rentBase;
  }

  /* ---------- 生活开销（元／年，不含房租） ----------
   * 按当年城镇/农村人均可支配收入的比例推导：
   * 城镇家庭生活开销 ≈ 当年均值的 0.62 倍，农村 ≈ 0.55 倍。
   * 22 岁前与父母同住：既不付房租，也没有自己的开销。 */
  /* 未成年子女数：18 岁以下才算需要抚养 */
  function dependentChildren(st) {
    if (!st.childBirthYears || !st.childBirthYears.length) return st.children || 0;
    var n = 0;
    for (var i = 0; i < st.childBirthYears.length; i++) {
      if (st.age - st.childBirthYears[i] < 18) n++;
    }
    return n;
  }

  function livingCost(st, annualIncome, annualRent) {
    if (st.age < FRICTION.independentAge) return 0;
    if (!annualIncome || annualIncome <= 0) return 0;
    // 60 岁后开销下降：孩子已独立，通勤开销也没了
    // 关键：开销是「扣掉房租后剩下的钱」里的一部分。
    // 如果按收入比例算开销，房租一高预算就穿帮（收入 2.3 万、房租 2.3 万、
    // 开销 1.7 万，必然年年欠债）。
    // 现实里人先定住房，再在剩下的钱里过日子。
    var afterRent = Math.max(0, annualIncome - (annualRent || 0));
    // 消费倾向：剩下的钱里花掉约 70%（储蓄 30%）
    var ratio = st.livingUrban ? 0.70 : 0.66;
    var base = afterRent * ratio;
    // 抚养成本：只算未成年子女。孩子长大后要自己扛，
    // 否则老人一辈子背着子女的学费，越老越穷。
    var dependents = dependentChildren(st);
    base += dependents * annualIncome * 0.14;
    if (!st.livingUrban && st.age > 40) base *= 1.08;
    return base;
  }

  /* ---------- 收入（元／年） ----------
   * 以「当年当地人均可支配收入」为锚，按职业系数缩放。
   * 这样 1985 年出生的人赚的是 1985 年的钱，2026 年出生的人赚 2026 年的钱，
   * 而积累下来的财富仍然可以跨年代比较（因为都按当年币值记账）。 */
  var JOB_INCOME_MULT = {
    // 相对当地人均可支配收入（人均/年）
    // 棒棒：新华网 2014 年口径「月入约 1675 元」÷ 当地人均可支配约 2403 元/月 ≈ 0.84
    // 注：这是「有活接」的旺季月收入，不同时期差异很大（见 BANGBANG 景气度曲线）
    bangbang: 0.84,
    courier: 0.85,
    factory: 0.80,
    office: 1.35,
    teacher: 1.30,
    nurse: 1.15,
    driver: 1.00,
    farmer: 0.70,
    tech: 2.10,
    shop: 1.20,
    craft: 1.05,
    construction: 1.05
  };

  /* 配偶收入：婚后家庭多一份收入；有学龄孩子时减半（要照顾）。 */
  function spouseIncome(st, year) {
    if (!st.married || st.age < 24 || st.age > 62) return 0;
    var mean = meanIncome(year, st.livingUrban);
    var mult = st.spouseJobMult || 1.0;
    var inc = mean * mult;
    if (dependentChildren(st) > 0 && st.age > 32) inc *= 0.55;   // 带孩子
    return inc;
  }

  function incomeFor(st, rng, year) {
    if (st.age < FRICTION.independentAge) return 0;
    if (!st.job) return 0;
    var mean = meanIncome(year, st.livingUrban);
    var mult = JOB_INCOME_MULT[st.job.id] || 1.0;
    var base = mean * mult;

    if (st.job.id === 'bangbang') {
      // 棒棒：当年有多少活可接 → 需求曲线
      base *= bangbangDemand(year);
      // 个人能力：走量的师傅比新手强
      base *= 0.75 + (st.skill || 0.3) * 0.8;
    } else {
      // 年资折减（上限 1.25）
      var yearsInJob = Math.max(0, st.age - FRICTION.independentAge);
      base *= Math.min(1.25, 0.78 + yearsInJob * 0.035);
      /* 手上功夫：所有职业都受影响，不只是棒棒。
       * 范围 0.85–1.15——手艺人比生手值钱，但不会翻盘。 */
      base *= 0.85 + (st.skill || 0.3) * 0.5;
    }
    /* 转轻活儿：收入打折，但体力损耗也小。
     * 这条不写的话，30 岁那次抉择的「继续干」和「转轻活儿」就没区别。 */
    if (st.lighterWork) base *= 0.88;
    /* 知识加成：上下限收紧。
     * 原式 (0.78 + knowledge/100 * 0.5) 范围是 0.78–1.28。
     * 和年资折减、体力折减、健康折减乘在一起，最低能到 0.55 倍——
     * 一个有手艺的成年人收入只有人均可支配收入的一半，
     * 折合每月三百多块，连自己都养不活。
     * 现在知识加成范围收紧到 0.90–1.15。 */
    base *= (0.90 + st.knowledge / 100 * 0.25);
    // 体力状态：体力差干不了体力活（连续曲线：体力越低收入越低）
    if (st.job.physical > 0.4) {
      // 体力 50 为分界：50 以下按比例衰减，50 以上小幅加成
      if (st.stamina < 50) {
        var fatigue = (50 - st.stamina) / 50;      // 0..1
        base *= 1 - fatigue * (1 - FRICTION.lowStaminaIncomeMult);
      } else if (st.stamina > 70) {
        base *= 1.08;
      }
    }
    // 健康状态：范围收紧到 0.90–1.05，避免低收入者雪上加霜
    base *= (0.90 + st.health / 100 * 0.15);
    // 60 岁后逐步退出劳动力市场
    if (st.age >= 60) base *= Math.max(0.15, 1 - (st.age - 60) * 0.045);
    // 退休金：60 岁后按当年人均可支配收入的比例发放，
    // 并覆盖到 70 岁以后（重庆职工基本养老保险覆盖广）
    if (st.age >= 60) {
      var pensionMean = meanIncome(year, st.livingUrban);
      var pension = pensionMean * 0.30 * Math.max(0.35, 1 - (st.age - 60) * 0.035);
      base = Math.max(base, pension);
    }
    return base;
  }

  function wealthScore(money) {
    return clamp((money / FRICTION.wealthTopCNY) * 100);
  }

  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  /* ================= 抉择节点 ================= */

  function opt(id, zh, en, hintZh, hintEn, apply) {
    return { id: id, zh: zh, en: en, hintZh: hintZh, hintEn: hintEn, apply: apply };
  }

  /* 5 岁：跟谁走 —— 决定你是否随父母进入主城 */
  function decisionAge5(life) {
    var st = life.st, rng = life.rng;
    var corePool = D.DISTRICTS.filter(function (d) { return d[3] === 'core'; });
    return {
      id: 'age5', age: 5,
      titleZh: '爸妈要搬家了，你跟谁走？', titleEn: 'Your parents are moving. Where do you go?',
      promptZh: st.livingUrban
        ? '你家的活儿在主城和区县之间换来换去。'
        : '你家在区县，日子不宽裕，但有个屋顶。',
      promptEn: st.livingUrban
        ? 'Your family has always moved between the city and the counties.'
        : 'Your family is in a county. Not much money, but a roof.',
      options: [
        opt('follow', '跟父母进主城', 'Move to the city with them',
          '见识多，但你们是外来人。', 'More to see, but you are an outsider.',
          function () {
            var d = rng.pick(corePool);
            relocate(life, d[0], true, d[1]);
            st.ties += 14; st.knowledge += 6; st.happiness += 4;
            st.family = 'migrant_child';
          }),
        opt('stay', '留在区县老家', 'Stay in the county',
          '熟人多，但世界小。', 'You know everyone, but the world is small.',
          function () {
            st.ties += 8; st.knowledge += 2; st.happiness -= 2;
            st.family = 'rural_local';
            st.livingUrban = false;
          }),
        opt('grand', '交给祖辈带，你留下念书', 'Stay with grandparents and study',
          '你自己会长大。', 'You will grow up on your own.',
          function () {
            st.ties -= 6; st.happiness -= 5; st.knowledge += 9; st.stamina += 4;
            st.family = 'left_behind';
            st.selfRaised = true;
          }),
        opt('board', '父母把你送去寄宿，你住校', 'Your parents send you to boarding school',
          '一年回家一次。', 'Home once a year.',
          function () {
            // 寄宿：知识最高但关系最疏。这条路的代价是「不在父母身边长大」。
            st.knowledge += 13; st.happiness -= 9; st.ties -= 12;
            st.stamina += 6; st.skill += 0.06;
            st.family = 'boarder';
            st.selfRaised = true;
          })
      ]
    };
  }

  /* 15 岁：中考分流 */
  function decisionAge15(life) {
    var st = life.st;
    var p = D.CQ.generalHighShare;
    return {
      id: 'age15', age: 15,
      titleZh: '中考出分了。', titleEn: 'Your high school results are in.',
      promptZh: '重庆初中毕业生升学高中阶段学校比例 98.5%，但能读普高的只有约 71%。',
      promptEn: 'In Chongqing 98.5% of junior high graduates enter senior high, but only about 71% reach a general high school.',
      options: [
        opt('general', '读普高', 'Go to a general high school',
          '三年后路更宽。', 'A wider road three years from now.',
          function () {
            // 普高是通往白领/教师/护士的唯一入口。
            // 起点知识 ~31（跨省务工家庭偏低），+14 后 45，
            // 再长到 22 岁约 55 —— 必须真的越过 48 的门槛，
            // 否则选了普高也进不了写字楼，这条抉择就形同虚设。
            st.knowledge += 14; st.happiness += 5;
            st.education = 'senior_high'; st.track = 'general';
          }),
        opt('vocational', '读职高，早点学手艺', 'Go to vocational school, learn a trade early',
          '早两年挣钱。', 'Two years of earnings sooner.',
          function () {
            st.knowledge += 4; st.happiness -= 2; st.skill = (st.skill || 0.3) + 0.25;
            st.education = 'vocational'; st.track = 'vocational';
          }),
        opt('technical', '读中专／技校', 'Go to a technical school',
          '一条中间的路。', 'A middle road.',
          function () {
            st.knowledge += 8; st.skill = (st.skill || 0.3) + 0.18;
            st.education = 'technical'; st.track = 'technical';
          }),
        opt('work', '不读了，出去打工', 'Leave school and go to work',
          '十六岁，成年人的工资。', 'Sixteen, and an adult wage.',
          function () {
            // 直接工作：知识最低、收入最早开始。
            // 这是 90 年代真实存在的路径——不是失败，是另一条路。
            st.knowledge -= 6; st.happiness -= 4; st.stamina -= 4;
            st.skill = (st.skill || 0.3) + 0.30;
            st.education = 'none'; st.track = 'work';
            st.startWorkEarly = true;
          })
      ]
    };
  }

  /* 22 岁：第一份工作 —— 棒棒线在这里可能开始 */
  function decisionAge22(life) {
    var st = life.st, rng = life.rng;
    /* 白领路的门槛有两个条件，缺一不可：
     * 1) 读过普高（track === 'general'）——这是重庆中考分流的真实分水岭；
     * 2) 知识值确实够（起点家庭差异很大，农村孩子即使读普高也可能吃力）。
     * 只看知识绝对值会让「读普高」这道抉择没有后果；
     * 只看 track 会让投胎家庭变成唯一变量。两个都要。 */
    var highEdu = (st.track === 'general' || st.education === 'senior_high') &&
                  st.knowledge >= 48;
    var opts = [];
    // 标记：22 岁这道题只问一次
    st.jobDecided22 = true;
    if (highEdu) {
      opts.push(opt('job_office', '进写字楼', 'Take a desk job',
        '体面，天花板高。', 'Respectable, with a high ceiling.',
        function () { setJob(life, 'office'); }));
      opts.push(opt('job_teacher', '去当老师', 'Become a teacher',
        '稳定，受尊敬。', 'Stable and respected.',
        function () { setJob(life, 'teacher'); }));
      opts.push(opt('job_nurse', '去医院当护士', 'Work as a nurse',
        '累，但被需要。', 'Tiring, but needed.',
        function () { setJob(life, 'nurse'); }));
      opts.push(opt('job_trade', '自己做生意', 'Start your own business',
        '可能挣大钱，也可能赔光。', 'You could make a fortune or lose everything.',
        function () { setJob(life, 'shop'); st.risk = true; }));
      // 程序员：知识再高一些才够格，否则白领里混着程序员会让选择没有区分
      if (st.knowledge >= 58) {
        opts.push(opt('job_tech', '写代码', 'Write code',
          '在这座城市里，这是最体面的活法。', 'In this city, this is the most respectable way to earn a living.',
          function () { setJob(life, 'tech'); }));
      }
    } else {
      opts.push(opt('job_factory', '进厂流水线', 'Work on a factory line',
        '站得住，饿不着。', 'Steady, never hungry.',
        function () { setJob(life, 'factory'); }));
      opts.push(opt('job_driver', '开货车／跑网约', 'Drive a truck or a ride-hailing car',
        '路上时间多。', 'A lot of time on the road.',
        function () { setJob(life, 'driver'); }));
      opts.push(opt('job_craft', '学门手艺', 'Learn a trade',
        '自己的手艺，自己的价。', 'Your skill, your price.',
        function () { setJob(life, 'craft'); }));
      opts.push(opt('job_construction', '去工地干活', 'Work on a construction site',
        '重庆到处是工地。钱来得快，膝盖先坏。',
        'Chongqing is full of construction sites. The money comes fast, your knees go first.',
        function () { setJob(life, 'construction'); }));
      opts.push(opt('job_bangbang', '去朝天门当棒棒', 'Carry loads at Chaotianmen',
        '一肩挑起来，就是这个城市的力气。', 'One shoulder, one load — the muscle of this city.',
        function () { setJob(life, 'bangbang'); st.bangbangLine = true; }));
    }
    // 棒棒线对所有人开放一条（但知识越高越难选）
    if (!highEdu || rng.next() < 0.3) {
      if (!opts.some(function (o) { return o.id === 'job_bangbang'; })) {
        opts[opts.length - 1] = opt('job_bangbang', '去朝天门当棒棒', 'Carry loads at Chaotianmen',
          '一肩挑起来，就是这个城市的力气。', 'One shoulder, one load — the muscle of this city.',
          function () { setJob(life, 'bangbang'); st.bangbangLine = true; });
      }
    }
    return {
      id: 'age22', age: 22,
      titleZh: '第一份工作。', titleEn: 'Your first job.',
      promptZh: '你二十二岁了。重庆有七百五十万农民工，背着行李从区县和各省进城。',
      promptEn: 'You are twenty-two. Chongqing has 7.5 million migrant workers, arriving from the counties and from other provinces.',
      options: opts
    };
  }

  /* 30 岁：换个活法 */
  function decisionAge30(life) {
    var st = life.st, rng = life.rng;
    var jn = st.job ? (st.job.en || st.job.zh) : '—';
    return {
      id: 'age30', age: 30,
      titleZh: '这活儿还干得下去吗？', titleEn: 'Can you keep doing this?',
      promptZh: '你现在做的是' + jn + '。十年下来，你知道自己还剩多少力气。',
      promptEn: 'You have been doing ' + jn + ' for a decade. You know exactly how much strength you have left.',
      options: [
        opt('stay', '继续干老本行', 'Keep going',
          '熟练就是资本。', 'Experience is capital.',
          function () {
            st.careerDepth = (st.careerDepth || 0) + 1;
            st.skill = Math.min(1, (st.skill || 0.3) + 0.12);
            // 老本行越干越熟，但身体也一年比一年差。
            // 这条路和「转轻活儿」的区别必须看得见：
            // 钱多一点，人老一点。
            st.stamina -= 8; st.health -= 3;
            st.happiness += 2;
            // 一直留在区县的人，最后多半还是种地的
            if (!st.livingUrban && !st.job) setJob(life, 'farmer');
          }),
        opt('light', '转轻活儿', 'Switch to lighter work',
          '身体先垮就什么都没了。', 'If your body goes first, nothing else matters.',
          function () {
            // 不是所有职业都能「转轻」：老师转轻活儿还是老师，
            // 护士还是护士。只有体力活才会换成别的手艺。
            var jid = st.job ? st.job.id : '';
            var deskJob = (jid === 'office' || jid === 'teacher' || jid === 'nurse' ||
                           jid === 'tech' || jid === 'shop');
            if (!deskJob) {
              // 体力活的「轻活」是降一档体力，不是换行：
              // 棒棒 → 货运/司机；流水线 → 小厂/建筑；建筑 → 小生意/司机
              var lighter = { bangbang: 'courier', courier: 'driver', factory: 'courier',
                              driver: 'shop', construction: 'driver', farmer: 'farmer' }[jid];
              if (lighter) setJob(life, lighter);
              else { st.careerDepth = (st.careerDepth || 0) + 1; st.lighterWork = true; }
              // 身体保住了：体力回一点，但技能不再涨
              st.stamina += 10; st.health += 2;
            } else {
              // 坐办公室的转轻活：换单位，不换职业，但收入打折
              st.careerDepth = (st.careerDepth || 0) + 1;
              st.lighterWork = true;
              st.happiness += 3;
            }
          }),
        opt('risk', '自己搏一把', 'Go out on your own',
          '成了就翻身，败了连本都没了。', 'Win big, or lose everything.',
          function () {
            // 没有本钱的人搏不了：穷人创业只是换一种饿法。
            // 有储蓄的人搏，可能翻身；没储蓄的人搏，只是换个死法。
            if (st.money > 60000) {
              setJob(life, 'shop'); st.risk = true; st.happiness += 6;
            } else {
              st.risk = true; st.happiness -= 4;
              st.log.push({
                age: st.logAge, kind: 'risk_fail',
                zh: '你算了算手里的钱，不够开一个铺子。',
                en: 'You did the arithmetic on what you had. It was not enough for a shop.'
              });
            }
          }),
        opt('move', '换个地方住，搬到主城', 'Move to the city',
          '机会多，房租也吓人。', 'More chances, and rent that bites.',
          function () {
            var corePool = D.DISTRICTS.filter(function (d) { return d[3] === 'core'; });
            var d = rng.pick(corePool);
            relocate(life, d[0], true, d[1]);
            st.happiness += 3; st.ties -= 5;
          })
      ]
    };
  }

  /* 50 岁：孩子 */
  function decisionAge50(life) {
    var st = life.st;
    return {
      id: 'age50', age: 50,
      titleZh: '孩子大了。', titleEn: 'Your child is grown.',
      promptZh: st.children === 0
        ? '你没有孩子。这件事到了五十岁才算数。'
        : '孩子在重庆，还是已经走了？',
      promptEn: st.children === 0
        ? 'You have no children. At fifty, that finally counts.'
        : 'Is your child still in Chongqing, or already gone?',
      options: [
        opt('child_stay', '让他留在重庆', 'Let them stay in Chongqing',
          '离得近，就是常常见面。', 'Close by. Too close, sometimes.',
          function () {
            st.childWhere = 'cq';
            st.ties += 18; st.happiness += 8;
            st.livingCostExtra = 9000 * wageIndex(st.year);
          }),
        opt('child_away', '让他去沿海／出国', 'Let them go to the coast or abroad',
          '他会有你没有的人生。', 'They will have a life you never had.',
          function () {
            st.childWhere = 'away';
            st.happiness -= 6; st.ties -= 12;
            st.money += 120000 * wageIndex(st.year);   // 他走得早，你少花很多
          }),
        opt('child_back', '让他回来接你的班', 'Bring them back to take over your work',
          '手艺传下去。', 'The trade passes on.',
          function () {
            st.childWhere = 'back';
            st.ties += 22; st.happiness += 4; st.knowledge += 4;
          }),
        opt('child_move', '你搬过去跟他住', 'Move to wherever they are',
          '晚年换个地方。', 'A new place for the last years.',
          function () {
            // 你跟孩子走：关系最好，但你要离开住了几十年的地方。
            st.childWhere = 'with_child';
            st.ties += 16; st.happiness += 10; st.health -= 3;
            // 换个城市生活 = 社交圈归零，但要付搬迁成本
            st.money -= 60000 * wageIndex(st.year);
            st.livingCostExtra = 12000 * wageIndex(st.year);
            st.movedForChild = true;
          })
      ]
    };
  }

  /* 70 岁：晚年 */
  function decisionAge70(life) {
    var st = life.st;
    return {
      id: 'age70', age: 70,
      titleZh: '七十岁了。', titleEn: 'Seventy.',
      promptZh: '房子还在。问题是，你要用它换什么。',
      promptEn: 'The flat is still there. The question is what you trade it for.',
      options: [
        opt('retire_move', '卖房，搬回区县老家', 'Sell the flat and go back to the county',
          '空气好，熟人多，就是房子没了。', 'Clean air, familiar faces, and no flat.',
          function () {
            // 卖房：按当年房价与房屋面积折算（58㎡ 户型的挂牌总价）
            var salePrice = seriesAt(D.RES_PRICE, st.year) *
                            (D.DISTRICT_MULT[st.livingDistrict] || D.DISTRICT_MULT.default) * 58;
            st.money += salePrice * 0.92;   // 卖价约为挂牌价的 92%
            st.soldFlat = true;
            st.health += 8; st.ties += 14; st.happiness += 4;
            st.livingUrban = false;
          }),
        opt('retire_stay', '留在城里，守着房子', 'Stay and hold on to the flat',
          '不动，就是不动。', 'You do not move. That is the whole point.',
          function () {
            st.health -= 4; st.ties -= 6; st.happiness -= 2;
          }),
        opt('retire_family', '去孩子那里', 'Go to your child',
          st.childWhere === 'away' ? '他已经不在重庆了。' : '他就在附近。',
          st.childWhere === 'away' ? 'They are no longer in Chongqing.' : 'They are close by.',
          function () {
            if (st.childWhere === 'away') {
              st.happiness -= 5; st.ties -= 4; st.health -= 2;
            } else {
              st.happiness += 12; st.ties += 16; st.health += 3;
            }
          }),
        opt('retire_lease', '把房子租出去，自己住小房', 'Rent out the flat, move to something small',
          '房子变成收入。', 'The flat becomes income.',
          function () {
            // 出租：现金流最稳，但住的地方变差了。
            var rent = seriesAt(D.RES_PRICE, st.year) *
                       (D.DISTRICT_MULT[st.livingDistrict] || D.DISTRICT_MULT.default) *
                       58 / 2400;   // 58㎡ 户型年租金 ≈ 月租 × 12
            st.money += rent * 8;    // 未来八年（七十到七十八）的租金提前计入
            st.health -= 2; st.happiness -= 3; st.ties -= 8;
            st.rentedOut = true;
            st.livingCostExtra = 3000 * wageIndex(st.year);
          })
      ]
    };
  }

  /* 棒棒专属节点：42 岁，行业已经不是当年那个行业 */
  function decisionBangbang(life) {
    var st = life.st, rng = life.rng;
    var lvl = bangbangLevel(st.year);
    return {
      id: 'bangbang42', age: 42,
      titleZh: '还扛得动吗？', titleEn: 'Can you still carry it?',
      promptZh: '你入行的时候，这行当有二十万人。现在朝天门一天挑不满几趟货。',
      promptEn: 'When you started, this trade had two hundred thousand workers. Now Chaotianmen cannot fill a few trips a day.',
      options: [
        opt('bb_persist', '接着扛', 'Keep carrying',
          '你教不会自己别的。', 'You never learned anything else.',
          function () {
            st.bbPersist = true;
            st.ties += 12; st.happiness -= 6;
          }),
        opt('bb_quit', '转行', 'Change trade',
          '面子难看，肚子不饿。', 'It costs you face, not your stomach.',
          function () {
            setJob(life, 'driver');
            st.bbPersist = false; st.bbQuit = true;
            st.happiness -= 4; st.stamina += 10;
          }),
        opt('bb_teach', '收个徒弟', 'Take an apprentice',
          '你把力气变成别的。', 'You turn strength into something else.',
          function () {
            st.bbPersist = true; st.bbApprentice = true;
            st.ties += 20; st.happiness += 6; st.knowledge += 5;
          }),
        opt('bb_driver', '改拉板车', 'Switch to pulling a cart',
          '不用上肩，但更慢。', 'Nothing on your shoulder, but slower.',
          function () {
            // 板车：不伤肩但收入低。这条路的现实是——
            // 老棒棒的膝盖和腰撑不住挑担，但拉车还能再干几年。
            st.bbPersist = true; st.bbCart = true;
            st.ties += 4; st.happiness -= 3; st.stamina -= 4;
            st.skill = (st.skill || 0.3) + 0.08;
          })
      ]
    };
  }

  function rng_pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function setJob(life, id) {
    life.st.job = JOB_BY_ID[id] || null;
    if (life.st.job) {
      var jobTxt = T('startJob',
              { jobZh: life.st.job.zh, jobEn: life.st.job.en },
              '开始做' + life.st.job.zh,
              'Started work as a ' + life.st.job.en);
      life.st.log.push({
              age: life.st.logAge, kind: 'job',
              zh: jobTxt.zh, en: jobTxt.en
            });
    }
  }

  /* 搬家：换区县 → 换楼栋原型 → 重算剖面 */
  function relocate(life, district, urban, districtEn) {
    var st = life.st;
    st.livingDistrict = district;
    st.livingDistrictEn = districtEn || district;
    st.livingUrban = urban;
    var opts = housingOptionsFor(district, urban);
    /* 搬家时必须保住玩家选的那一层。
     *
     * 原来的做法：找不到同款楼就退到 opts[0]，楼层再按新楼高度夹一次。
     * 结果是「住 20 楼白象居」搬一次家变成「住 19 楼通用步梯楼」——
     * 玩家人生里最重要的一次选择被系统悄悄改掉了，而且没有任何提示。
     *
     * 现在：楼型可以换（同层高、同梯坎性质的等价形态优先），
     * 但楼层只在物理上不可能时才调整，而且必须记进日志让玩家看见。
     */
    var same = opts.filter(function (o) { return o.id === st.home.id; });
    var fb = st.home.fallbackType
      ? opts.filter(function (o) { return o.id === st.home.fallbackType; })[0]
      : null;
    if (same.length) {
      st.home = same[0];
    } else if (fb) {
      st.home = fb;
    } else {
      /* 找一个能承载原楼层的等价楼型：
       * 层数够、有同样的梯坎性质、垂直层尽量接近。 */
      var wantLift = st.home.lift;
      var wantLayer = st.home.layer;
      var pool = opts.filter(function (o) {
        return o.floors >= st.homeFloor && !!o.lift === wantLift;
      });
      if (!pool.length) {
        pool = opts.filter(function (o) { return o.floors >= st.homeFloor; });
      }
      if (!pool.length) {
        // 新区实在没有这么高的楼：取最高的那个
        var tallest = opts.reduce(function (a, b) {
          return (!a || b.floors > a.floors) ? b : a;
        }, null);
        st.home = tallest || opts[0];
      } else {
        // 同层优先，其次层数接近原楼
        var ranked = pool.slice().sort(function (a, b) {
          var la = (a.layer === wantLayer) ? 0 : 1;
          var lb = (b.layer === wantLayer) ? 0 : 1;
          if (la !== lb) return la - lb;
          var da = Math.abs(a.floors - st.home.floors);
          var db = Math.abs(b.floors - st.home.floors);
          return da - db;
        });
        st.home = ranked[0];
      }
    }
    // 楼层只在物理上不可能时才调整（楼太矮），并记录下来
    var newFloor = Math.min(st.homeFloor, st.home.floors);
    var dropped = newFloor !== st.homeFloor;
    st.homeFloor = newFloor;
    st.prof = floorProfile(st.home, st.homeFloor, st.year);
    // 刚搬完家不要立刻因为房租往下搬——找房子的那几年本来就是勉强撑着的
    st.lastMoveAge = st.logAge;
    var sameBuilding = st.home.id === st.home.id;
    st.log.push({
      age: st.logAge, kind: 'move',
      zh: '搬到了' + district + (dropped ? '，新楼矮些，楼层往下调到了' + newFloor + '楼' : ''),
      en: 'The family moved to ' + (districtEn || district) +
          (dropped ? '. The new block was shorter, so the flat moved down to floor ' + newFloor + '.' : '')
    });
  }

  /* ================= 人生引擎 ================= */

  function createLife(seed, birthYear, building, floor) {
    var rng = new RNG(seed);
    var birth = drawBirth(rng, birthYear);
    var prof = floorProfile(building, floor, birthYear);

    var st = {
      age: 0, year: birthYear,
      stamina: birth.startStamina,
      money: 0,
      wealth: 0,          // 派生字段：由 money 实时算出
      health: birth.startHealth,
      happiness: birth.startHappiness,
      knowledge: birth.startKnowledge,
      ties: birth.startTies,
      alive: true, causeOfDeath: null, yearOfDeath: null,
      home: building, homeFloor: floor, prof: prof,
      livingDistrict: birth.district,
      livingDistrictEn: birth.districtEn,
      livingUrban: birth.urban,
      job: null, education: 'none', married: false, children: 0,
    childBirthYears: [],
    // 派生字段：财富分由 money 实时算出，不独立存储（避免与净资产脱节）
    wealth: 0,
      skill: 0.3, track: null, careerDepth: 0,
      childWhere: null, soldFlat: false,
      log: [], path: [], decisions: []
    };

    var life = {
      seed: seed, birthYear: birthYear, birth: birth, st: st,
      rng: rng, phase: 'running', pending: null,
      // 棒棒行业事件锚点（按玩家年份触发一次）
      eraFired: {}
    };

    life.step = function () { return stepLife(life); };
    life.choose = function (optId) { return chooseFor(life, optId); };
    life.pendingDecision = function () { return life.pending; };
    return life;
  }

  /* ---------- 抉择调度 ---------- */
  function decisionFor(life, age) {
    var st = life.st;
    // 棒棒专属节点：42 岁，仍在扛
    if (age === 42 && st.job && st.job.id === 'bangbang' && !st.bbDecided) {
      st.bbDecided = true;
      return decisionBangbang(life);
    }
    if (age === 5) return decisionAge5(life);
    if (age === 15) return decisionAge15(life);
    // 22 岁节点只问一次：选完必须有职业，否则会反复触发同一个节点
    if (age === 22 && !st.job && !st.jobDecided22) return decisionAge22(life);
    if (age === 30) return decisionAge30(life);
    if (age === 50) return decisionAge50(life);
    if (age === 70) return decisionAge70(life);
    return null;
  }

  function chooseFor(life, optId) {
    if (!life.pending) return null;
    var d = life.pending;
    var chosen = null;
    for (var i = 0; i < d.options.length; i++) {
      if (d.options[i].id === optId) { chosen = d.options[i]; break; }
    }
    // 传了不存在的选项 id：退回第一个选项。
    // 否则 life 永远停在 await_choice，step() 会一直返回同一个抉择，
    // 整个流程死循环——必须兜底。
    if (!chosen) chosen = d.options[0];
    if (!chosen) return null;
    chosen.apply(life);
    life.st.decisions.push({
      age: d.age, id: d.id, optionId: chosen.id,
      labelZh: chosen.zh, labelEn: chosen.en
    });
    life.st.log.push({
      age: d.age, kind: 'choice',
      zh: chosen.zh, en: chosen.en
    });
    life.pending = null;
    life.phase = 'running';
    return d;
  }

  /* ---------- 棒棒行业大事件（按年份触发一次） ---------- */
  function bangbangEraEvent(life, age) {
    var st = life.st, year = st.year;
    var fired = life.eraFired;
    var inTrade = st.job && st.job.id === 'bangbang';
    var past = st.bangbangLine || inTrade;

    function fire(key, zh, en, apply) {
      if (fired[key]) return;
      fired[key] = 1;
      st.log.push({ age: age, kind: 'era', zh: zh, en: en });
      if (apply) apply();
    }

    if (year === 1997 && past) {
      fire('tv1997', '《山城棒棒军》播了，满城都在讲你们。',
        'A TV drama about porters aired. The whole city was talking about your trade.',
        function () { st.ties += 8; st.happiness += 6; });
    }
    if (year === 2008 && past) {
      fire('quake2008', '地震之后，朝天门没生意了。',
        'After the earthquake, Chaotianmen went quiet.',
        function () { st.happiness -= 6; st.money -= 8000; });
    }
    if (year === 2010 && past) {
      fire('market2010', '朝天门要整治升级了，铺子搬走了一大片。',
        'Chaotianmen was rebuilt and upgraded. Whole rows of stalls moved out.',
        function () { st.happiness -= 5; });
    }
    if (year === 2014 && past) {
      fire('courier2014', '快递来了。人家一趟送三家，你的担子只剩一趟。',
        'Courier services arrived. They deliver three drops in one run. You get one.',
        function () { st.ties -= 4; });
    }
    if (year === 2020 && past) {
      // 轨道交通 1 号线小什字—朝天门段 2020-12-31 开通试运营，朝天门站启用
      fire('rail2020', '轻轨修到了朝天门门口。',
        'The light rail reached the gates of Chaotianmen.',
        function () { st.happiness -= 4; });
    }
    if (year >= 2021 && past) {
      fire('late2021', '你还在扛。现在整个重庆，棒棒不到两千人。',
        'You are still carrying. Fewer than two thousand porters are left in Chongqing.',
        function () { st.ties += 6; st.happiness -= 3; });
    }
  }

  /* ---------- 推进一年 ---------- */
  function stepLife(life) {
    var st = life.st, rng = life.rng;

    if (life.phase === 'await_choice') {
      return { status: 'await_choice', decision: life.pending, age: st.age };
    }
    if (life.phase === 'dead') {
      return { status: 'dead', age: st.age };
    }

    var age = st.age;
    st.logAge = age;            // 结算中：日志写当前年龄，而不是「下一年」
    st.year = life.birthYear + age;
    // 剖面里的通勤金额随年代折算，每年刷新一次（楼层摩擦本身不变）
    st.prof = floorProfile(st.home, st.homeFloor, st.year);
    var prof = st.prof;

    // 教育与就业
    if (age < 23 && !st.job) {
      st.education = age < 6 ? 'childhood'
        : (age < 15 ? 'primary'
          : (st.education === 'none'
            ? (st.knowledge >= 48 ? 'senior_high'
              : (st.knowledge >= 34 ? 'junior_or_vocational' : 'vocational_only'))
            : st.education));
      // 在校期间知识逐年增长：读普高的人到 22 岁知识值必须真的越过门槛，
      // 否则「读普高」这道抉择就没有实际后果。
      if (age >= 6 && age < 22 && !st.job) {
        // 增长速度要让三条路在 22 岁真正分开（普高越过门槛，职高/中专差一点）：
        //   起点 ~31 → 普高 +14，再按 1.70/年 × 7 年 ≈ 57（白领路）
        //              职高 +4，按 0.85/年 × 7 年 ≈ 41（体力活路）
        //              中专 +8，按 1.05/年 × 7 年 ≈ 46（中层，活儿能坐但用不上脑）
        var eduGain = st.education === 'senior_high' ? 1.70
          : (st.education === 'junior_or_vocational' ? 0.70
            : (st.education === 'vocational_only' ? 0.55
              : (st.education === 'technical' ? 0.85
                : (st.education === 'vocational' ? 0.60 : 0.95))));
        st.knowledge += eduGain;
      }
    } else if (!st.job && age >= 22) {
      // 没做选择时的兜底（自动玩模式）
      setJob(life, ((st.track === 'general' || st.education === 'senior_high') &&
                    st.knowledge >= 48) ? 'office' : 'factory');
    }

    // 通勤与体力
    if (age >= 6 && age < 70) {
      // 体力向平衡点漂移：负荷越高，平衡点越低
      // 常年爬楼会适应：负荷逐年递减，但恢复不到不爬楼的水平
      st.stairAdapt = Math.min(0.55, (st.stairAdapt || 0) + FRICTION.stairAdaptation);
      var stairLoad = prof.extraStairs * FRICTION.stairLoad * (1 - st.stairAdapt);
      var load = prof.commuteMin * FRICTION.commuteDrain + stairLoad;
      if (st.job) load += st.job.drain * (st.age < 60 ? 1 : 0.5);
      var eq = 100 * Math.max(0, 1 - load / FRICTION.staminaCapacity);
      st.stamina += (eq - st.stamina) * 0.12;
      // 老楼电梯故障：只发生在有电梯但年久失修的楼里
      if (prof.lift && rng.next() < FRICTION.oldLiftFailRate) {
        st.stamina -= 12;
        st.happiness -= 4;
        var fl = Math.round(prof.totalStairs);
        var liftTxt = T('liftBroken',
              { floor: st.homeFloor, flights: fl, trips: 2 },
              '电梯坏了，爬了 ' + fl + ' 层',
              'The lift was broken. You climbed ' + fl + ' flights.');
            st.log.push({
              age: age, kind: 'liftfail',
              zh: liftTxt.zh, en: liftTxt.en
            });
      }
    } else if (age >= 70) {
      st.stamina -= 1.6;
    }

    // 居住环境与街坊关系
    // 环境不是每年无限累加，而是把幸福拉向一个由楼层决定的水平。
    // 这样 1 楼（噪音潮湿）和 24 楼（视野好但热）会稳定在各自的区间，
    // 而不是随时间漂到同���个值。
    var envTarget = 60 + prof.env * 2.0;
    st.happiness += (envTarget - st.happiness) * 0.045;
    // 垂直层的环境代价是真实的居住不适（潮、噪音、没光），
    // 不只是数值偏好——必须同时吃掉健康。
    if (prof.layer) {
      var layerDiscomfort = prof.layer === 'L0' ? 15.0
        : prof.layer === 'L1' ? 11.0
        : prof.layer === 'L2' ? 17.0
        : 0;
      if (layerDiscomfort > 0) {
        st.health -= layerDiscomfort * 0.014;
        st.happiness -= layerDiscomfort * 0.010;
      }
    }
    // 环境对健康：向目标靠拢，避免负面环境逐年累加把人压死
    if (prof.env < 0) {
      var healthTarget = 80 + prof.env * 1.15;
      st.health += (healthTarget - st.health) * 0.024;
    } else {
      st.health += (78 - st.health) * 0.012;
    }
    // 街坊关系：向目标靠拢。关系不只是数值，它是重庆生活的真实分量——
    // 有人串门和没人串门，一天过得不一样。
    st.ties += ((55 + prof.ties * 1.4) - st.ties) * 0.030;
    // 关系也进幸福：有人串门和没人串门，一天过得不一样
    st.happiness += (st.ties - 55) * 0.010;

    // 棒棒时代事件
    bangbangEraEvent(life, age);

    // 收入与开销
    var income = incomeFor(st, rng, st.year) + spouseIncome(st, st.year);
    var rent = age >= FRICTION.independentAge && !st.soldFlat
      ? monthlyRent(st.livingDistrict, st.home, prof, st.year, st.livingUrban) * 12 : 0;
    var living = livingCost(st, income, rent) + (st.livingCostExtra || 0);
    var commuteCost = age >= 6 && age < 70 ? prof.commuteMoney : 0;
    // 18 岁前无收入、无开销、无通勤开销：父母供养
    if (age < 18) { rent = 0; living = 0; commuteCost = 0; }
    // 住得贵的现实：房租占收入超过 40% 就扛不住了。
    // 扛不住的人会往下搬——这正是「楼层决定人生」的现实版本。
    if (income > 0 && rent > income * FRICTION.rentBurdenMax) {
      var burden = rent / Math.max(1, income);
      /* 房租压力的伤害必须封顶。
       * 原式 (burden - 0.40) * 22 是每年无上限扣血：手艺人月入低、
       * 住 L6 塔楼，burden 能到 2.0，每年扣 35 点血，三年就把人扣死了。
       * 真实情况是：房租压垮的是生活质量，不是三年暴毙。
       * 现在单年扣血封顶 6 点、幸福封顶 5 点，压力持续但不会秒杀。 */
      var over = Math.min(burden - FRICTION.rentBurdenMax, 0.6);
      st.health -= over * 22;
      st.happiness -= over * 16;
      if (!st.rentStressed) {
        st.rentStressed = true;
        var rentTxt = T('rentBurden',
              { pct: Math.round(burden * 100) },
              '房租吃掉了你 ' + Math.round(burden * 100) + '% 的收入',
              'Rent takes ' + Math.round(burden * 100) + '% of your income.');
            st.log.push({
              age: age, kind: 'rent',
              zh: rentTxt.zh, en: rentTxt.en
            });
      }
      // 撑不住就往下搬——这是「楼层决定人生」最现实的一环：
      // 扛不住房租的人会换矮一层，视野没了，但活得下去。
      // 但搬家不是瞬移：一次只降一层，且两年内不会再搬（找不到那么合适的下一层）。
      var canMove = (st.lastMoveAge === undefined) || (age - st.lastMoveAge >= 3);
      if (st.homeFloor > 1 && burden > 0.55 && canMove) {
        var from = st.homeFloor;
        st.homeFloor = Math.max(1, st.homeFloor - 1);
        st.lastMoveAge = age;
        st.prof = floorProfile(st.home, st.homeFloor, st.year);
        var dgTxt = T('downgrade',
              { from: from, to: st.homeFloor },
              '你从 ' + from + ' 楼搬到了 ' + st.homeFloor + ' 楼',
              'You moved from floor ' + from + ' to floor ' + st.homeFloor + '.');
            st.log.push({
              age: age, kind: 'downgrade',
              zh: dgTxt.zh, en: dgTxt.en
            });
      }
    } else if (income > 0) {
      st.rentStressed = false;
    }
    st.money += income - rent - living - commuteCost;
    st.wealth = wealthScore(st.money);

    // 家庭
    if (age >= 26 && age <= 40 && !st.married && rng.next() < 0.30) {
      st.married = true; st.happiness += 9; st.ties += 12;
      // 配偶的职业倾向：知识水平相当的人更可能走到一起
      st.spouseJobMult = 0.85 + (st.knowledge / 100) * 0.55;
      var marryTxt = T('marry',
              { hasHome: st.homeFloor > 1 && st.money > 20000 },
              '结婚了', 'You got married.');
            st.log.push({ age: age, kind: 'marry', zh: marryTxt.zh, en: marryTxt.en });
    }
    // 生育：结婚后 28–45 岁，每年 18% 概率；两次生育至少间隔 3 年，最多 3 个
    if (st.married && age >= 28 && age <= 45 && st.children < 3 &&
        (st.lastChildAge === undefined || age - st.lastChildAge >= 3) &&
        rng.next() < 0.18) {
      st.children++; st.lastChildAge = age;
    st.childBirthYears = st.childBirthYears || [];
    st.childBirthYears.push(age);
    st.happiness += 7;
      var childTxt = T('child', { boy: rng.next() < 0.52 },
              '孩子出生了', 'A child was born.');
            st.log.push({ age: age, kind: 'child', zh: childTxt.zh, en: childTxt.en });
    }
    if (age === 50 && st.children === 0 && st.married) {
      st.happiness -= 6;
      var emptyTxt = T('childGone', {},
              '孩子已经不在这个城市了', 'Your children do not live in this city any more.');
            st.log.push({ age: age, kind: 'empty', zh: emptyTxt.zh, en: emptyTxt.en });
    }
    if (age === 18 && birth_familyIsLeftBehind(life)) {
      st.happiness -= 5; st.ties += 4;
      var lbTxt = T('reunion', {},
              '第一次在重庆见到爸妈，他们又老了一岁',
              'First time seeing your parents in Chongqing. They look a year older.');
          st.log.push({ age: age, kind: 'left_behind', zh: lbTxt.zh, en: lbTxt.en });
    }

    // 随年龄衰减
    if (age > 40) st.stamina -= (age - 40) * 0.09;
    // 60 岁后退居二线：不再每天扛货上下楼，体力下滑放缓
    if (age >= 60) st.stamina += (age - 59) * 0.55;
    if (age > 50) st.health -= (age - 50) * 0.09;
    if (age > 65) st.happiness -= (age - 65) * 0.05;
    st.happiness += (st.health / 100 - 0.62) * 0.06;
    // 幸福均值回归（弱）：日子久了回到常态
    st.happiness += (58 - st.happiness) * 0.0035;

    // 长期体力透支 → 健康被慢慢磨掉（高楼层最明显）
    if (age >= 16 && st.stamina < 18) {
      // 磨损是渐进的，不是断崖：人到中年以后身体已经定型
      var wearFactor = age < 45 ? 0.055 : 0.028;
      st.health -= (18 - st.stamina) * wearFactor;
      st.happiness -= (18 - st.stamina) * 0.035;
    }
    // 常年爬楼的关节磨损：到 45 岁以后才显现，不压死人，但确实折寿
    if (age >= 45 && prof.extraStairs > 0 && !prof.lift) {
      st.health -= prof.extraStairs * 0.085;
    }
    // 体力耗尽 → 垮一次
    if (st.stamina <= 0 && age >= 16) {
      st.health -= 2.0;
      st.happiness -= 1.8;
      st.stamina = 22;          // 垮一次之后要缓一阵
      var colTxt = T('collapse', {},
              '累垮了，在楼梯间坐了很久',
              'You broke down. Sat in the stairwell for a long time.');
            st.log.push({
              age: age, kind: 'collapse',
              zh: colTxt.zh, en: colTxt.en
            });
    }
    // 债务：只在状态变化时记一次，不逐年刷屏
    if (st.money < -60000) {
      st.health -= 1.2; st.happiness -= 1.0;
      if (!st.inDebt) {
        st.inDebt = true;
        var debtTxt = T('debt', {}, '欠了很多钱', 'You are deep in debt.');
            st.log.push({ age: age, kind: 'debt', zh: debtTxt.zh, en: debtTxt.en });
      }
    } else if (st.money > -30000) {
      st.inDebt = false;
    }

    // 归一化到 0–100。
    // 健康和幸福有地板：活着就有基本体力，日子再难也还有感觉。
    // 没有地板的话轴会钉死在 0，多条人生读起来完全一样——
    // 而且结语里「幸福 0」看着像 bug，不像人生。
    st.stamina = clamp(st.stamina);
    st.health = clamp(st.health);
    st.happiness = clamp(st.happiness);
    if (st.health < 12) st.health = 12;
    if (st.happiness < 6) st.happiness = 6;
    st.knowledge = clamp(st.knowledge);
    st.ties = clamp(st.ties);

    // 死亡
    if (st.alive) {
      var lifeExp = D.CQ.lifeExpectancy
        + (st.livingUrban ? 2 : -3)
        + (isCoreDistrict(st.livingDistrict) ? 1.5 : 0)
        + (st.education === 'senior_high' ? 1.2 : 0)
        + (st.health - 70) * 0.06;
      var ageGap = age - lifeExp;
      // Gompertz 形状：年轻时极低，之后加速上升
      // 年轻段：Gompertz 在期望寿命之前是平的，会让 20 岁夭折。
      // 真实情况是「少年夭折概率极低，20–40 岁有个小驼峰（意外/疾病）」，
      // 45 岁后才快速爬升。
      var base;
      var gompBase = 0.010 + Math.max(0, ageGap) * 0.0032 +
                     Math.pow(Math.max(0, ageGap), 2.1) * 0.000028;
      if (age < 18) {
        base = 0.0010;                                   // 未成年：极低
      } else if (ageGap > 0) {
        base = gompBase;                                 // 过了期望寿命：Gompertz 主段
      } else {
        // 期望寿命之前：从 18 岁的极低值平滑指数爬升，
        // 在期望寿命处正好接上 Gompertz 的 0.010（连续，没有断崖）
        base = 0.010 * Math.exp(-0.0307 * Math.max(0, lifeExp - age));
      }
      var healthMul = Math.max(0.5, Math.min(2.4, 1 + (70 - st.health) * 0.02));
      var hazard = base * healthMul + (st.health < 35 ? 0.018 : 0);
      // 体力劳动者的职业风险：搬运、工地、高空
      if (st.job && st.job.risk) hazard += st.job.risk * (age < 55 ? 1 : 0.5);
      // 96 岁后强制加速：避免出现「活到 99 岁」的长尾
      if (age >= 96) hazard = Math.max(hazard, 0.16 + (age - 96) * 0.2);
      if (age >= 100) hazard = 1;
      if (age > 18 && rng.next() < hazard) {
        st.alive = false;
        // 死因存代码，不存中文——中文会漏到英文页面和分享卡里。
    st.causeOfDeath = age >= 60 ? 'disease' : (age < 30 ? 'accident' : 'disease');
    st.causeOfDeathZh = age >= 60 ? '疾病' : (age < 30 ? '意外' : '疾病');
        st.yearOfDeath = st.year;
      }
    }

    st.path.push({
      age: age, year: st.year,
      stamina: st.stamina, wealth: wealthScore(st.money),
      health: st.health, happiness: st.happiness,
      knowledge: st.knowledge, ties: st.ties,
      floor: st.homeFloor, commute: prof.commuteMin,
      money: Math.round(st.money),
      job: st.job ? st.job.zh : null,
      dead: !st.alive
    });

    if (!st.alive) {
      st.finalAge = age;
      st.yearOfDeath = st.year;
      st.wealth = wealthScore(st.money);
      st.epilogue = buildEpilogue(life);
      life.phase = 'dead';
      return { status: 'dead', age: age, path: st.path };
    }

    // 抉择节点（只在还活着的时候挂）
    var d = st.alive ? decisionFor(life, age) : null;
    // 先推进年龄，再挂起抉择——否则同一个年龄会反复触发同一个抉择
    st.age = age + 1;
    if (d) {
      life.pending = d;
      life.phase = 'await_choice';
      return { status: 'await_choice', decision: d, age: age };
    }

    return { status: 'running', age: age, path: st.path };
  }

  function birth_familyIsLeftBehind(life) {
    return life.st.family === 'left_behind' || life.birth.family === 'left_behind';
  }

  function isCoreDistrict(name) {
    for (var i = 0; i < D.DISTRICTS.length; i++) {
      if (D.DISTRICTS[i][0] === name) return D.DISTRICTS[i][3] === 'core';
    }
    return false;
  }

  /* ---------- 结局：给一段有骨头的话 ---------- */
  /* 结语：委托给文本层（CQTEXT）。
   * 规则层只负责「这辈子的境况」，具体怎么写由文本层按职业挑选。 */
  function buildEpilogue(life) {
    var st = life.st;
    var T = root.CQTEXT;
    if (T && T.composeEpilogue) return T.composeEpilogue(st);
    if (T && T.pickEpilogue) return T.pickEpilogue(st);
    return {
      titleZh: '一辈子', titleEn: 'A lifetime',
      zh: '你在重庆活了一辈子。没传奇，也没被这座城市吃掉。',
      en: 'You lived a whole life in Chongqing. No legend, and the city did not eat you either.'
    };
  }

  /* ---------- 自动玩（测试用）：自动选一个选项 ---------- */
  function autoPlay(life, choiceFn) {
    var guard = 0;
    while (guard++ < 300) {
      var r = life.step();
      if (r.status === 'await_choice') {
        var d = r.decision;
        var pick;
        if (choiceFn) {
          pick = choiceFn(d, life);
        } else {
          pick = d.options[life.rng.int(0, d.options.length - 1)].id;
        }
        life.choose(pick);
        continue;
      }
      if (r.status === 'dead') break;
    }
    return { birth: life.birth, state: life.st, profile: life.st.prof };
  }

  /* ---------- 兼容旧接口：一次性模拟 ---------- */
  function simulate(seed, birthYear, floorChoice, opts) {
    opts = opts || {};
    var life = createLife(seed, birthYear, floorChoice.building, floorChoice.floor);
    return autoPlay(life, opts.choiceFn);
  }

  root.CQRULES = {
    RNG: RNG, AXES: AXES, FRICTION: FRICTION, FAMILY_TYPES: FAMILY_TYPES,
    JOBS: JOBS, JOB_BY_ID: JOB_BY_ID,
    LAYERS: D.CITY.layers, LAYER_FX: LAYER_FX, layerEffects: layerEffects,
    buildingLayer: buildingLayer,
    drawBirth: drawBirth, housingOptionsFor: housingOptionsFor, housingFormsFor: housingFormsFor,
    floorProfile: floorProfile, monthlyRent: monthlyRent, livingCost: livingCost,
    incomeFor: incomeFor, wealthScore: wealthScore,
    createLife: createLife, simulate: simulate, autoPlay: autoPlay,
    bangbangLevel: bangbangLevel, bangbangDemand: bangbangDemand,
    wageIndex: wageIndex, priceIndex: priceIndex, meanIncome: meanIncome,
    seriesAt: seriesAt, clamp: clamp
  };
})(typeof window !== 'undefined' ? window : globalThis);
