/* 渝你有约 — P0 数据层
 * 每个数值都带 src（机构 + 年份）。规则：官方统计公报优先于第三方；
 * 两套口径都存在时两个都写，不混用。
 * 完整来源清单见 docs/_docx/渝你有约_海外首发方案_8D魔幻.docx §9
 */
(function (root) {
  'use strict';

  /* ---------- 37 区县（2025-11-06 江北/渝北撤销并入两江新区后） ----------
   * [中文名, 英文名, 出生权重, 档位, 主城都市区?]
   * 权重按各区县常住人口规模粗分，用于投胎池抽样；档位：core 主城 / ne 渝东北 / se 渝东南
   */
  var DISTRICTS = [
    ['两江新区', 'Liangjiang', 78, 'core', 1],
    ['沙坪坝', 'Shapingba', 62, 'core', 1],
    ['九龙坡', 'Jiulongpo', 60, 'core', 1],
    ['巴南', 'Banan', 56, 'core', 1],
    ['南岸', "Nan'an", 52, 'core', 1],
    ['渝中', 'Yuzhong', 46, 'core', 1],
    ['万州', 'Wanzhou', 48, 'ne', 0],
    ['北碚', 'Beibei', 36, 'core', 1],
    ['大渡口', 'Dadukou', 32, 'core', 1],
    ['合川', 'Hechuan', 32, 'core', 1],
    ['涪陵', 'Fuling', 30, 'core', 1],
    ['永川', 'Yongchuan', 30, 'core', 1],
    ['江津', 'Jiangjin', 30, 'core', 1],
    ['长寿', 'Changshou', 26, 'core', 1],
    ['綦江', 'Qijiang', 26, 'core', 1],
    ['铜梁', 'Tongliang', 22, 'core', 1],
    ['南川', 'Nanchuan', 22, 'core', 1],
    ['璧山', 'Bishan', 20, 'core', 1],
    ['大足', 'Dazu', 20, 'core', 1],
    ['荣昌', 'Rongchang', 18, 'core', 1],
    ['潼南', 'Tongnan', 18, 'core', 1],
    ['黔江', 'Qianjiang', 26, 'se', 0],
    ['酉阳', 'Youyang', 22, 'se', 0],
    ['秀山', 'Xiushan', 20, 'se', 0],
    ['彭水', 'Pengshui', 18, 'se', 0],
    ['开州', 'Kaizhou', 42, 'ne', 0],
    ['云阳', 'Yunyang', 34, 'ne', 0],
    ['奉节', 'Fengjie', 28, 'ne', 0],
    ['丰都', 'Fengdu', 24, 'ne', 0],
    ['垫江', 'Dianjiang', 24, 'ne', 0],
    ['梁平', 'Liangping', 24, 'ne', 0],
    ['忠县', 'Zhongxian', 22, 'ne', 0],
    ['巫山', 'Wushan', 20, 'ne', 0],
    ['巫溪', 'Wuxi', 16, 'ne', 0],
    ['城口', 'Chengkou', 10, 'ne', 0],
    ['武隆', 'Wulong', 14, 'se', 0],
    ['石柱', 'Shizhu', 12, 'se', 0]
  ];

  // 去重并剔除占位项，保证恰好 37 个
  var seen = {}, CLEAN = [];
  for (var i = 0; i < DISTRICTS.length; i++) {
    var d = DISTRICTS[i];
    if (d[2] === 0 || seen[d[0]]) continue;
    seen[d[0]] = 1;
    CLEAN.push(d);
  }

  /* ---------- 核心统计（重庆市统计局《2025年重庆市国民经济和社会发展统计公报》，2026-03-26） ---------- */
  var CQ = {
    pop: 31872600,                 // 常住人口 3187.26 万
    urbanization: 0.7302,          // 城镇化率 73.02%
    gdp: 33757.93e8,               // GDP 33757.93 亿元
    gdpPerCapita: 105874,          // 人均 GDP 105874 元
    births: 148000,                // 出生 14.80 万
    birthRate: 0.00464,            // 出生率 4.64‰
    deathRate: 0.00925,            // 死亡率 9.25‰
    naturalGrowth: -0.00461,       // 自然增长率 −4.61‰
    sexRatioResident: 101.45,      // 常住人口性别比（女=100）
    sexRatioBirth: 108.18,         // 出生婴儿性别比（2022 年公报）
    lifeExpectancy: 79.72,         // 人均预期寿命 79.72 岁（市卫健委 2025-10-16）
    incomeUrban: 51854,            // 城镇居民人均可支配收入
    incomeRural: 23448,            // 农村居民人均可支配收入
    incomeQuintiles: [12766, 24220, 36222, 53176, 99178],
    unemployment: 0.053,           // 城镇调查失业率 5.3%
    migrantWorkers: 7504000,      // 农民工 750.4 万
    migrantWorkersOut: 5247000,    // 外出 524.7 万
    hukouSeparated: 13096400,      // 人户分离 1309.64 万（2020 七普）
    censusPop2020: 32054200,       // 七普常住人口 3205.42 万
    crossProvInflow: 2193600,      // 跨省流入 219.36 万
    intraCityFlow: 2617800,       // 市内流动人口 261.78 万
    gaokao2026: 348000,            // 2026 重庆普通高考报名 34.8 万
    gaokao2025: 372000,            // 2025 年 37.2 万
    gaokaoNational2026: 12900000,  // 全国 1290 万
    seniorHighGross: 0.9847,       // 高中阶段毛入学率 98.47%（市教委 2025-10）
    toSeniorHigh: 0.985,           // 初中毕业生升高中阶段学校比例 98.5%
    generalHighShare: 0.71,        // 能读普高的比例 71%（重庆日报 2026-05-26）
    marriage2025: 6765000,         // 全国结婚登记 676.5 万对（+10.8%）
    firstMarriage2025: 10423300,   // 初婚 1042.33 万
    marryAge25to29Share: 0.3688,   // 25–29 岁占 36.88%（民政部 2025 公报）
    src: '重庆市统计局《2025年重庆市国民经济和社会发展统计公报》(2026-03-26)'
  };

  /* ---------- 房价（中国房价行情网 2026-09 二手住宅挂牌均价，元/㎡） ---------- */
  // 注意：是挂牌价不是成交价。平台仍按撤并前区名发布江北/渝北序列。
  var HOUSING = {
    '渝中': 14522, '两江新区': 12937, '南岸': 10935, '沙坪坝': 9719,
    '九龙坡': 9224, '涪陵': 9440, '万州': 5316, '巫山': 5073, '綦江': 4445,
    src: '中国房价行情网（2026-09 挂牌数据）——挂牌价，非成交价'
  };

  /* ---------- 8D 空间模型 ---------- */
  var CITY = {
    // 8 个垂直层：重庆的「8D」不是形容词，是可计算的高度分层。
    // 每层有真实的居住形态与代价，楼层选择会真的把你投进某一层。
    layers: [
      { id: 'L0', zh: '地下层', en: 'Underground',
        habit: '潮湿、没风、便宜',
        habitEn: 'Damp, airless, cheap',
        noteZh: '防空洞改的出租屋、地下车库隔出来的隔间。冬天不冷，夏天不透气。',
        noteEn: 'Bunkers and converted parking bays. No air in summer, no sun at all.',
        src: '重庆山城地下空间改造的半地下室、裙楼居住形态' },
      { id: 'L1', zh: '江面层', en: 'River Level',
        habit: '潮湿、吵、看得见江',
        habitEn: 'Damp, noisy, a view of the river',
        noteZh: '朝天门、菜园坝一带。推窗是江风，也是货轮汽笛。涨水时一楼会进水。',
        noteEn: 'Chaotianmen, Caibaoda. River wind and ship horns. In flood season the ground floor takes water.',
        src: '朝天门码头区、沿江低层住区形态' },
      { id: 'L2', zh: '桥层', en: 'Bridge Level',
        habit: '车流声、灰、便宜',
        habitEn: 'Traffic noise, dust, cheap',
        noteZh: '桥头桥尾的第一二层。汽车从头顶过，晚上吵得睡不着，但租价压得住。',
        noteEn: 'The first two floors under a bridge approach. Cars overhead all night, but the rent holds down.',
        src: '重庆桥梁引桥、匝道下低层住区形态' },
      { id: 'L3', zh: '街面层', en: 'Street Level',
        habit: '最方便、也最吵',
        habitEn: 'Most convenient, most noisy',
        noteZh: '一楼是商铺、二楼是住家。买根烟不用出门，睡觉要看卷帘门什么时候拉。',
        noteEn: 'Shops on the ground, homes above. You can buy cigarettes without going out.',
        src: '重庆沿街商住混合楼形态（普遍为「下店上住」）' },
      { id: 'L4', zh: '梯坎层', en: 'Stair Level',
        habit: '重庆最经典的爬坡起点',
        habitEn: 'Where Chongqing starts climbing',
        noteZh: '街面往上第一段坡梯坎。出门就是长梯坎，扛着一箱牛奶爬完就喘。',
        noteEn: 'The first flight of stairs above the street. Carry a case of milk up and you are done for.',
        src: '重庆梯坎密集的老城住区形态' },
      { id: 'L5', zh: '居住层', en: 'Residential',
        habit: '标准层、绝大多数人住这儿',
        habitEn: 'The standard floor — where most people live',
        noteZh: '有电梯的老公房、老公房改造的套间。不好不坏，安全牌。',
        noteEn: 'The lifted 1990s block. Nothing special, nothing wrong. The safe bet.',
        src: '1990–2010 年重庆主城标准住宅层' },
      { id: 'L6', zh: '塔楼层', en: 'Tower',
        habit: '视野好、风大、贵',
        habitEn: 'View, wind, price',
        noteZh: '二十层以上的高层塔楼。看得见江和桥，风大得关窗，物业费是楼下的三倍。',
        noteEn: 'High-rise tower floors. You can see the river and the bridges. The wind will not let you keep the window open.',
        src: '重庆主城高层塔楼住区形态' },
      { id: 'L7', zh: '天台层', en: 'Rooftop',
        habit: '重庆最稀缺的位置',
        habitEn: 'The scarcest address in Chongqing',
        noteZh: '顶层。夏天像烤箱，冬天风灌进来；但整座城的江景归你一个人。',
        noteEn: 'The top floor. An oven in summer, a wind tunnel in winter — and the whole river is yours alone.',
        src: '重庆顶层住宅（部分为坡顶阁楼、隔热层改造）' }
    ],
    // P0 三个建筑原型，全部取自渝中区真实存在的建筑
    buildings: [
      {
        id: 'stairwell',
        zh: '无电梯梯坎楼',
        en: 'Walk-up Block',
        floors: 24,               // 白象居同型：24 层无电梯
        lift: false,
        entrances: [1, 10, 15],   // 白象居：38 米高差设 1/10/15 楼三个出入口
        heightM: 38,
        // layer = 这个建筑属于哪一垂直层（分类，用于展示与统计）
        // layerCosts = 是否叠加抽象层代价（具名建筑有自己的专属机制，不叠加）
        layer: 'L4', layerCosts: false,
        noteEn: 'No lift. Three entrances at floors 1, 10 and 15, spanning a 38-metre drop.',
        noteZh: '无电梯，1/10/15 楼三个出入口，跨越 38 米高差。',
        fallbackType: 'gen_stairwell',
        src: '白象居（1992 始建 / 1993 交付），24 层无电梯，38 米高差'
      },
      {
        id: 'railthrough',
        zh: '轻轨穿楼',
        en: 'Rail-through Block',
        floors: 19,               // 李子坝：1–5 商铺 / 6 站厅 / 7 设备 / 8 站台 / 9–19 住宅
        lift: true,
        entrances: [1, 6, 8],
        heightM: 42,
        layer: 'L3', layerCosts: false,
        noteEn: 'Rail passes through floors 6–8. Shops below, homes above.',
        noteZh: '轻轨穿 6–8 楼，楼下商铺、楼上住宅。',
        src: '李子坝站：6 楼站厅 / 7 楼设备层 / 8 楼站台，每层约 3500㎡、空高 3.6m、与楼体间隔 20cm'
      },
      {
        id: 'elevator',
        zh: '电梯楼',
        en: 'Elevator Block',
        floors: 30,
        lift: true,
        entrances: [1],
        heightM: 52.5,
        layer: 'L6', layerCosts: false,
        noteEn: 'A public lift climbs the cliff. Chongqing\'s other famous vertical route.',
        noteZh: '公共电梯直接爬坡，重庆另一条垂直生命线。',
        src: '凯旋路电梯（1986），提升 32.5 米'
      }
    ],
    // 按垂直层绑定的住区原型：让 8 层真的能住进去。
    // 每个原型指定自己属于哪一层（layer），楼层范围落在该层内。
    layerBuildings: [
      {
        id: 'bunker', layer: 'L0', zh: '半地下室隔间', en: 'Converted bunker room',
        floors: 1, lift: false, entrances: [1], heightM: 3,
        floorRange: [1, 1],
        noteEn: 'A converted air-raid bunker. Half underground. Rent is a third of street level.',
        noteZh: '防空洞改的隔间，半层在地下。租金只有街面的三分之一，冬天不冷夏天不透气。',
        src: '形态归纳：重庆半地下室、防空洞改造居住区普遍形态（非特定建筑）'
      },
      {
        id: 'riverside', layer: 'L1', zh: '江边吊脚楼', en: 'Riverside stilt house',
        floors: 3, lift: false, entrances: [1], heightM: 9,
        floorRange: [1, 3],
        noteEn: 'Three floors on the floodplain. The river is twenty steps away — and so is the ship horn.',
        noteZh: '江边三层，涨水时一楼要垫砖。推开窗就是江，汽笛整夜不停。',
        src: '形态归纳：朝天门、菜园坝沿江低层住区普遍形态（非特定建筑）'
      },
      {
        id: 'underbridge', layer: 'L2', zh: '桥下铺', en: 'Under-the-bridge flat',
        floors: 2, lift: false, entrances: [1], heightM: 6,
        floorRange: [1, 2],
        noteEn: 'Under a bridge approach. Cars pass over your bed. The rent is almost nothing.',
        noteZh: '引桥下面。汽车从头顶过，睡觉像睡在马路上。房租低到不可思议。',
        src: '形态归纳：重庆桥梁引桥、匝道下低层住区普遍形态（非特定建筑）'
      },
      {
        id: 'shophouse', layer: 'L3', zh: '下店上住', en: 'Shop below, home above',
        floors: 6, lift: false, entrances: [1], heightM: 18,
        floorRange: [1, 6],
        noteEn: 'A shop on the ground, homes above. Everything is downstairs. The roller shutter goes up at six.',
        noteZh: '一楼开铺，二楼住家。买烟不用出门，卷帘门早上六点哗啦一声拉开。',
        src: '形态归纳：重庆沿街商住混合楼「下店上住」普遍形态（非特定建筑）'
      },
      {
        id: 'terrace', layer: 'L4', zh: '梯坎老楼', en: 'Stair-terrace block',
        floors: 7, lift: false, entrances: [1], heightM: 21,
        floorRange: [1, 7],
        noteEn: 'The classic Chongqing walk-up. Seven flights, one entrance, and the street is forty steps below you.',
        noteZh: '重庆最经典的老步梯房。七层一个出入口，街面在四十级梯坎下面。',
        src: '形态归纳：重庆主城 1980s–1990s 梯坎步梯楼普遍形态（参照白象居同型，非特定建筑）'
      },
      {
        id: 'block1990', layer: 'L5', zh: '千禧老公房', en: 'Millennium block',
        floors: 18, lift: true, entrances: [1], heightM: 54,
        floorRange: [1, 18],
        noteEn: 'A 2000s block with a lift and a security guard. The middle of the road, and that is exactly the point.',
        noteZh: '千禧年前后的电梯房，有保安有物业。不上不下，安全牌。',
        src: '形态归纳：2000–2010 年重庆主城标准高层住宅普遍形态（非特定建筑）'
      },
      {
        id: 'tower', layer: 'L6', zh: '江景塔楼', en: 'River-view tower',
        floors: 32, lift: true, entrances: [1], heightM: 96,
        floorRange: [1, 32],
        noteEn: 'A river-view tower. The service charge is triple, and the skyline is yours from the twentieth floor.',
        noteZh: '江景塔楼。物业费是楼下三倍，二十层以上整座城的江景归你。',
        src: '形态归纳：重庆主城江景高层塔楼住区普遍形态（非特定建筑）'
      },
      {
        id: 'penthouse', layer: 'L7', zh: '顶层阁楼', en: 'Top-floor penthouse',
        floors: 33, lift: true, entrances: [1], heightM: 99,
        floorRange: [30, 33],
        noteEn: 'The top three floors, under a sloped roof. An oven in summer, a wind tunnel in winter, and the whole city below.',
        noteZh: '顶层三间，坡顶。夏天烤箱冬天风洞，整座城在脚下。',
        src: '形态归纳：重庆顶层坡顶住宅普遍形态（非特定建筑）'
      }
    ],
    // 非渝中区（P0 铺满 37 区县时用）的通用原型
    generic: [
      {
        id: 'gen_stairwell',
        zh: '高层步梯楼',
        en: 'High-rise walk-up',
        floors: 24, lift: false, entrances: [1, 10, 15], heightM: 38,
        layer: 'L4', layerCosts: false,
        noteEn: 'A 1990s high-rise with no lift and three entrances. Half the neighbours know your name.',
        noteZh: '九十年代高层步梯楼，无电梯，三个出入口，邻居都认得你。',
        src: '通用原型（主城 1990–2000 年代步梯高层，形态参照白象居）'
      },
      {
        id: 'gen_walkup',
        zh: '老式步梯楼',
        en: 'Old Walk-up',
        floors: 7, lift: false, entrances: [1], heightM: 21,
        layer: 'L4', layerCosts: false,
        noteEn: 'A 1980s walk-up. Seven flights, no lift, one entrance.',
        noteZh: '八十年代步梯房，七层无电梯，一个出入口。',
        src: '通用原型（主城渝东北/渝东南常见）'
      },
      {
        id: 'gen_tower',
        zh: '高层塔楼',
        en: 'Tower Block',
        floors: 26, lift: true, entrances: [1], heightM: 78,
        noteEn: 'A modern tower. Lift works, but the ground is 38 metres above the river.',
        noteZh: '现代塔楼，电梯可靠，但地面离江面三十八米。',
        src: '通用原型（两江新区/主城新区常见）'
      }
    ],
    src: '重庆市公开资料；李子坝站设计负责人叶天义公开说明；人民网/央广网 2014'
  };

  /* ---------- 棒棒行业：景气度曲线（按年份锚定公开报道的人数口径） ----------
   * 每个锚点都带来源与口径说明。注意各报道口径不一致：
   * 2014 年新华网口径为「三四十万」（较宽），2016 年纽约时报口径为
   * 「城区不超过 1 万人」（仅主城城区）。本曲线只表达趋势，不作精确人数使用。
   */
  var BANGBANG = {
    /* 人数规模曲线（相对峰值 2000 年 = 1.0） */
    anchors: [
      { year: 1983, level: 0.10, note: '《重庆市沙坪坝区交通志》：1983 年起允许「农民进城搞运输」，现代棒棒军由此出现' },
      { year: 1995, level: 0.45, note: '重庆日报（2025-05-27）：1995 年至少有 10 万人' },
      { year: 2000, level: 1.00, note: '重庆日报（2025-05-27）：2000 年至少有 20 万之众（峰值）' },
      { year: 2010, level: 0.62, note: '朝天门批发市场提档升级综合整治（当年发生），行业首次结构性收缩' },
      { year: 2014, level: 0.55, note: '新华网（2014-04-28）：月收入 1500–2000 元。同期「三四十万」为宽口径（含各形态人力搬运），与城区口径不可直接比较' },
      { year: 2016, level: 0.12, note: '纽约时报中文网（2016-06-28）：从 90 年代多达 30 万减到重庆城区不超过 1 万人' },
      { year: 2020, level: 0.06, note: '轨道交通 1 号线小什字—朝天门段 2020-12-31 开通试运营，朝天门站启用，1 号线全线通车' },
      { year: 2021, level: 0.03, note: '西北民族大学新闻传播学院（2021）调查估算：重庆棒棒数量已不到 2000 人' },
      { year: 2026, level: 0.02, note: '南方周末（2023-10-29）：最盛时约 40 万、朝天门仅 8 位女棒棒，行业约等于消失' }
    ],
    /* 需求曲线：当年「有多少活可接」，直接影响收入。
     * 校准点：2014 年棒棒月入 1500–2000 元，当年重庆城镇居民人均可支配收入
     * 25147 元/年（2096 元/月）→ 棒棒收入约为当地均值的 0.72–0.95 倍。 */
    demand: [
      { year: 1983, v: 0.50 },
      { year: 1990, v: 0.80 },
      { year: 1995, v: 0.95 },
      { year: 2000, v: 1.00 },
      { year: 2005, v: 0.95 },
      { year: 2010, v: 0.88 },
      { year: 2014, v: 0.85 },
      { year: 2016, v: 0.70 },
      { year: 2020, v: 0.64 },
      { year: 2021, v: 0.60 },
      { year: 2026, v: 0.55 }
    ],
    /* 需求曲线表达的是「相对全市平均收入的位置」。
     * 绝对收入并不崩塌：2014 年棒棒月入 1500–2000 元（新华网），
     * 2023 年仍有人「每天赚够 100 元就下班」（南方周末，约 2000+ 元/月）。
     * 塌的是相对位置——2014 年约为当地均值的 0.80 倍，2026 年降到 0.52 倍。 */
    // 收入锚点（当年名义值）
    monthlyIncome2014: [1500, 2000],   // 新华网 2014
    jinPrice2023: 0.09,                 // 南方周末 2023：一斤力气 9 分钱
    dailyTarget2023: 100,              // 南方周末 2023：一天赚够 100 元就下班
    femaleSharePeak: 0.03,             // 南方周末：最盛时女性占比 3%
    tvYear: 1997,                      // 《山城棒棒军》热播
    src: '重庆日报(2025-05-27) / 新华网(2014-04-28) / 纽约时报中文网(2016-06-28) / 南方周末(2023-10-29) / 西北民族大学调查(2021)'
  };

  /* ---------- 年代经济锚点（按年份插值） ---------- */
  /* 住宅商品房平均销售价格（元/㎡）——国家统计局口径 */
  /* 1999 年之前：1996 住宅 1020 元/㎡（重庆发改委引 2001 年数据：住宅 1133 元/㎡，
   * 比 1996 年末上涨 113 元，年均涨幅 2.1%）；1990–1995 按与城镇收入同步外推的估计值。 */
  var RES_PRICE = {
    1985: 520,
    1990: 620,
    1995: 940,
    1996: 1020,
    1997: 1044,
    1998: 1059,
    1999: 1080,
    2000: 1077,
    2001: 1133,
    2002: 1277,
    2003: 1324,
    2004: 1572.56,
    2005: 1900.66,
    2006: 2081.31,
    2007: 2588.22,
    2008: 2640,
    2009: 3266,
    2010: 4040,
    2011: 4492.3,
    2012: 4804.8,
    2013: 5239,
    2014: 5094,
    2015: 5012,
    2016: 5162,
    2017: 6605,
    2018: 8189.98,
    2019: 8657,
    2020: 8917,
    2021: 9678,
    2022: 8526,
    2023: 8608.879,
    2024: 8243.157,
    2025: 8022.48,
    2026: 8022.48
  };

  /* 城镇居民人均可支配收入（元）——国家统计局口径 */
  var URBAN_INCOME = {
    1979: 355,
    1980: 412,
    1981: 481,
    1982: 505,
    1983: 536,
    1984: 616,
    1985: 762,
    1986: 984,
    1987: 1109,
    1988: 1278,
    1989: 1449,
    1990: 1691,
    1991: 1892,
    1992: 2195,
    1993: 2781,
    1994: 3634,
    1995: 4375,
    1996: 5023,
    1997: 5302,
    1998: 5431,
    1999: 5818,
    2000: 6152,
    2001: 6544,
    2002: 7000,
    2003: 7773,
    2004: 8793,
    2005: 9700,
    2006: 10878,
    2007: 11758,
    2008: 13321,
    2009: 14502,
    2010: 16032,
    2011: 18517,
    2012: 21003,
    2013: 23058,
    2014: 25147,
    2015: 27238.84,
    2016: 29610,
    2017: 32193,
    2018: 34889,
    2019: 37939,
    2020: 40006,
    2021: 43502,
    2022: 45509,
    2023: 47435,
    2024: 49778,
    2025: 51854
  };

  /* 农村居民人均可支配收入（元）——国家统计局口径（2025 为与旧序列可比的推算值） */
  var RURAL_INCOME = {
    1979: 150,
    1980: 159,
    1981: 171,
    1982: 190,
    1983: 210,
    1984: 229,
    1985: 250,
    1986: 279,
    1987: 311,
    1988: 345,
    1989: 379,
    1990: 413,
    1991: 450,
    1992: 483,
    1993: 532,
    1994: 600,
    1995: 684,
    1996: 787,
    1997: 890,
    1998: 988,
    1999: 1085,
    2000: 1185,
    2001: 1295,
    2002: 1390,
    2003: 1520,
    2004: 1685,
    2005: 1875,
    2006: 2100,
    2007: 2370,
    2008: 2655,
    2009: 3000,
    2010: 3470,
    2011: 3900,
    2012: 4250,
    2013: 4800,
    2014: 5200,
    2015: 5700,
    2016: 6350,
    2017: 7100,
    2018: 7800,
    2019: 8500,
    2020: 9200,
    2021: 10400,
    2022: 11300,
    2023: 12100,
    2024: 13000,
    2025: 13600
  };

  /* ---------- 区县相对房价系数（相对全市住宅均价） ----------
   * 分子：2026-09 二手住宅挂牌均价；分母：2026-09 重庆二手住宅均价 9154 元/㎡。
   * 用于把全市住宅均价序列（成交口径）换算到各区县，并可按年代整体缩放。 */
  var DISTRICT_MULT = {
    '渝中': 1.586, '两江新区': 1.413, '南岸': 1.194, '沙坪坝': 1.062,
    '九龙坡': 1.008, '涪陵': 1.031, '万州': 0.581, '巫山': 0.554, '綦江': 0.486,
    '沙坪坝': 1.062,
    '九龙坡': 1.008,
    '巴南': 0.72,
    '北碚': 0.78,
    '大渡口': 0.85,
    '合川': 0.58,
    '涪陵': 1.031,
    '永川': 0.55,
    '江津': 0.56,
    '长寿': 0.54,
    '綦江': 0.486,
    '铜梁': 0.54,
    '南川': 0.56,
    '璧山': 0.55,
    '大足': 0.52,
    '荣昌': 0.53,
    '潼南': 0.5,
    '黔江': 0.52,
    '酉阳': 0.46,
    '秀山': 0.47,
    '彭水': 0.45,
    '开州': 0.5,
    '云阳': 0.48,
    '奉节': 0.47,
    '丰都': 0.46,
    '垫江': 0.47,
    '梁平': 0.48,
    '忠县': 0.47,
    '巫山': 0.554,
    '巫溪': 0.42,
    '城口': 0.38,
    '武隆': 0.46,
    '石柱': 0.42,
    default: 0.50,
    src: '中国房价行情网 2026-09 二手住宅挂牌均价；分母为同期重庆二手住宅均价 9154 元/㎡'
  };

  /* ---------- 品牌 ---------- */
  var TAG = {
    en: 'THE 8D CITY',
    taglineEn: 'One life. One city. No re-rolls.',
    taglineZh: '一生一城，不可重掷。',
    subEn: 'Live a life in the only 8D city on Earth.',
    subZh: '在地球上唯一的 8D 城市里活一次。',
    noteZh: '重庆山地面积占总面积 75.33%（《重庆市第一次地理国情普查公报》2017）——8D 不是形容词，是地形约束。',
    src: '《重庆市第一次地理国情普查公报》(2017)'
  };

  root.CQDATA = {
    DISTRICTS: CLEAN,
    CQ: CQ,
    HOUSING: HOUSING,
    CITY: CITY,
    BANGBANG: BANGBANG, DISTRICT_MULT: DISTRICT_MULT,
    RES_PRICE: RES_PRICE, URBAN_INCOME: URBAN_INCOME, RURAL_INCOME: RURAL_INCOME,
    TAG: TAG
  };
})(typeof window !== 'undefined' ? window : globalThis);
