/* 渝你有约 — V1 区县住房形态库
 *
 * P0 里 37 个区县共用 3 个通用原型。那是刻意的取舍，但 V1 要铺开。
 *
 * 设计原则：
 * 1. 不是 37 × 4 = 148 个互不相关的房子。那是凑数。
 *    重庆的真实住房形态是有限的几种，每种在不同区县有不同的出现概率和名字。
 * 2. 每个原型必须说明「它长什么样」和「谁会住在里面」——
 *    形态归纳，不是具名建筑。
 * 3. 形态原型吃抽象层代价（layerCosts 默认为 true），
 *    因为它们本来就是按垂直高度划分的类型。
 *
 * 六种原型（对应重庆住宅史的真实脉络）：
 *   1. 吊脚楼    —— 沿江干打棚脚，民国到 80 年代干打棚的形态
 *   2. 苏式筒子楼 —— 1953–1957 一五计划苏援项目，坡屋顶、厚墙、长走廊串单间
 *   3. 工人新村  —— 五六十年代工厂宿舍，红砖三四层，厨房厕所公用
 *   4. 老旧小区  —— 依山而建，梯坎密集，一楼也要走几十上百步台阶
 *   5. 移民统建房 —— 三峡移民安置，大批量同户型板楼，远离老城
 *   6. 新建高层  —— 2000 年后商品房或安置房，带电梯
 *
 * 地域分布（按真实建成年代与地形）：
 *   主城都市区：老旧小区 + 苏式筒子楼 + 工人新村 + 新建高层
 *   渝东北库区：移民统建房 + 吊脚楼 + 老旧小区
 *   渝东南：吊脚楼 + 老旧小区 + 移民统建房
 *   远郊农村：自建房（区县自建）
 */
(function (root) {
  'use strict';

  /* ---------- 六种基础形态 ---------- */
  var FORMS = {
    /* 1. 吊脚楼：沿江干打棚脚，下层架空 */
    stilt: {
      id: 'stilt',
      zh: '吊脚楼',
      en: 'Stilt house',
      floors: 2, lift: false, entrances: [1], heightM: 7,
      floorRange: [1, 2], layer: 'L1', layerCosts: true,
      noteZh: '下面架空支柱，上面住人。楼下是鸡圈、柴堆或者江水。一楼地势低，涨水先淹。',
      noteEn: 'Living space held up on posts; below is livestock, firewood, or the river. The ground floor floods first.',
      src: '形态归纳：重庆沿江干打棚、吊脚楼普遍形态（沿江低层住区）'
    },

    /* 2. 苏式筒子楼：1953–1957 苏援时期，坡屋顶厚墙，一条长走廊串起许多单间 */
    soviet: {
      id: 'soviet',
      zh: '苏式筒子楼',
      en: 'Soviet-style block',
      floors: 4, lift: false, entrances: [1], heightM: 13,
      floorRange: [1, 4], layer: 'L4', layerCosts: true,
      noteZh: '一条长走廊串着一排单间，厨房和厕所都是公用的。冬暖夏凉，墙厚得能挡住重庆的夏天。',
      noteEn: 'One long corridor strung with single rooms; kitchens and toilets shared. Thick walls keep the Chongqing summer out.',
      src: '形态归纳：1953–1957 一五计划苏援项目苏式楼/筒子楼形态（赫鲁晓夫楼）'
    },

    /* 3. 工人新村：五六十年代工厂宿舍，红砖三四层 */
    workers: {
      id: 'workers',
      zh: '工人新村',
      en: "Workers' village",
      floors: 4, lift: false, entrances: [1], heightM: 12,
      floorRange: [1, 4], layer: 'L4', layerCosts: true,
      noteZh: '红砖房，一幢挨一幢，走廊上搭炉子。二十来平米要住一家人，上下铺用布帘子隔开。',
      noteEn: 'Red brick, shoulder to shoulder, cooking stoves on the corridor. Twenty square metres for a whole family.',
      src: '形态归纳：1950–1960 年代重庆工厂宿舍（工人新村：钢花村、模范村、嘉陵村等）形态'
    },

    /* 4. 老旧小区：依山而建，梯坎密集——重庆住房的核心痛点 */
    oldslab: {
      id: 'oldslab',
      zh: '老旧小区',
      en: 'Old residential block',
      floors: 18, lift: false, entrances: [1], heightM: 54,
      floorRange: [1, 18], layer: 'L5', layerCosts: true,
      noteZh: '依山而建，楼栋之间是几十上百级梯坎。住一楼照样要爬坡出门——这是重庆最反常的地方。',
      noteEn: 'Built into the slope. Even the ground-floor residents climb steps to reach the street. The most counter-intuitive thing about Chongqing.',
      src: '形态归纳：重庆 2000 年底前建成的城镇老旧小区普遍形态（依山而建、梯坎密集、一楼高出街面数十米）'
    },

    /* 5. 移民统建房：三峡移民安置，同户型大批量板楼 */
    resettlement: {
      id: 'resettlement',
      zh: '移民统建房',
      en: 'Resettlement block',
      floors: 12, lift: false, entrances: [1], heightM: 36,
      floorRange: [1, 12], layer: 'L5', layerCosts: true,
      noteZh: '为了安置移民统一盖的楼，户型一样，楼层一样，隔音不好。离原来的老城有几公里。',
      noteEn: 'Identical units, identical floors, poor soundproofing, and several kilometres from the old town you left.',
      src: '形态归纳：三峡库区移民统建房安置小区形态（1990s–2000s 集中建设）'
    },

    /* 6. 新建高层：2000 年后商品房或安置房，带电梯 */
    newtower: {
      id: 'newtower',
      zh: '新建高层',
      en: 'New tower block',
      floors: 28, lift: true, entrances: [1], heightM: 84,
      floorRange: [1, 28], layer: 'L6', layerCosts: true,
      noteZh: '电梯、物业、地下车库。这是这座城市里最不「重庆」的一种住法。',
      noteEn: 'Lift, property management, underground parking. The least Chongqing way to live in Chongqing.',
      src: '形态归纳：2000 年后重庆商品房与棚改安置房高层形态'
    }
  };

  /* ---------- 区县 → 形态组合与权重 ---------- */
  /* tier:
   *   core  主城都市区：老旧小区、筒子楼、工人新村、新建高层
   *   ne    渝东北库区：移民统建房、吊脚楼、老旧小区
   *   se    渝东南武陵山区：吊脚楼、老旧小区、移民统建房
   *   rural 远郊农村：自建房为主
   * forms: 该区县以什么形态为主，权重递减
   */
  var DISTRICT_FORMS = {
    /* ── 主城都市区 ── */
    '渝中': {
      tier: 'core', forms: [['oldslab', 40], ['soviet', 22], ['workers', 18], ['newtower', 20]],
    },
    '两江新区': {
      tier: 'core', forms: [['newtower', 60], ['oldslab', 25], ['workers', 15]],
    },
    '沙坪坝': {
      tier: 'core', forms: [['oldslab', 42], ['workers', 26], ['newtower', 20], ['soviet', 12]],
    },
    '九龙坡': {
      tier: 'core', forms: [['workers', 38], ['oldslab', 32], ['newtower', 20], ['soviet', 10]],
    },
    '巴南': {
      tier: 'core', forms: [['newtower', 45], ['oldslab', 35], ['workers', 20]],
    },
    '南岸': {
      tier: 'core', forms: [['oldslab', 38], ['workers', 30], ['newtower', 22], ['stilt', 10]],
    },
    '北碚': {
      tier: 'core', forms: [['oldslab', 40], ['newtower', 28], ['soviet', 18], ['workers', 14]],
    },
    '大渡口': {
      tier: 'core', forms: [['workers', 42], ['oldslab', 33], ['soviet', 15], ['newtower', 10]],
    },
    '合川': {
      tier: 'core', forms: [['oldslab', 38], ['newtower', 30], ['workers', 18], ['resettlement', 14]],
    },
    '涪陵': {
      tier: 'core', forms: [['oldslab', 36], ['resettlement', 26], ['newtower', 24], ['workers', 14]],
    },
    '永川': {
      tier: 'core', forms: [['newtower', 36], ['oldslab', 34], ['workers', 18], ['resettlement', 12]],
    },
    '江津': {
      tier: 'core', forms: [['oldslab', 34], ['newtower', 30], ['soviet', 20], ['workers', 16]],
    },
    '长寿': {
      tier: 'core', forms: [['resettlement', 34], ['oldslab', 32], ['newtower', 22], ['workers', 12]],
    },
    '綦江': {
      tier: 'core', forms: [['oldslab', 38], ['resettlement', 28], ['workers', 20], ['newtower', 14]],
    },
    '铜梁': {
      tier: 'core', forms: [['oldslab', 36], ['newtower', 30], ['resettlement', 20], ['workers', 14]],
    },
    '南川': {
      tier: 'core', forms: [['oldslab', 34], ['resettlement', 26], ['newtower', 26], ['stilt', 14]],
    },
    '璧山': {
      tier: 'core', forms: [['oldslab', 36], ['newtower', 34], ['workers', 18], ['resettlement', 12]],
    },
    '大足': {
      tier: 'core', forms: [['oldslab', 40], ['newtower', 26], ['resettlement', 20], ['workers', 14]],
    },
    '荣昌': {
      tier: 'core', forms: [['oldslab', 38], ['resettlement', 26], ['newtower', 22], ['workers', 14]],
    },
    '潼南': {
      tier: 'core', forms: [['oldslab', 36], ['resettlement', 28], ['newtower', 24], ['workers', 12]],
    },

    /* ── 渝东北（三峡库区） ── */
    '万州': {
      tier: 'ne', forms: [['resettlement', 38], ['oldslab', 28], ['newtower', 22], ['stilt', 12]],
    },
    '开州': {
      tier: 'ne', forms: [['resettlement', 36], ['oldslab', 30], ['newtower', 20], ['stilt', 14]],
    },
    '云阳': {
      tier: 'ne', forms: [['stilt', 26], ['resettlement', 34], ['oldslab', 24], ['newtower', 16]],
    },
    '奉节': {
      tier: 'ne', forms: [['resettlement', 40], ['stilt', 24], ['oldslab', 22], ['newtower', 14]],
    },
    '巫山': {
      tier: 'ne', forms: [['stilt', 28], ['resettlement', 34], ['oldslab', 24], ['newtower', 14]],
    },
    '巫溪': {
      tier: 'ne', forms: [['stilt', 30], ['oldslab', 32], ['resettlement', 24], ['newtower', 14]],
    },
    '忠县': {
      tier: 'ne', forms: [['resettlement', 34], ['oldslab', 30], ['stilt', 20], ['newtower', 16]],
    },
    '梁平': {
      tier: 'ne', forms: [['oldslab', 38], ['resettlement', 26], ['newtower', 22], ['workers', 14]],
    },
    '城口': {
      tier: 'ne', forms: [['stilt', 30], ['oldslab', 34], ['resettlement', 22], ['newtower', 14]],
    },
    '丰都': {
      tier: 'ne', forms: [['resettlement', 34], ['oldslab', 30], ['stilt', 22], ['newtower', 14]],
    },
    '垫江': {
      tier: 'ne', forms: [['oldslab', 36], ['resettlement', 26], ['newtower', 22], ['workers', 16]],
    },

    /* ── 渝东南（武陵山区） ── */
    '黔江': {
      tier: 'se', forms: [['stilt', 30], ['oldslab', 32], ['resettlement', 24], ['newtower', 14]],
    },
    '酉阳': {
      tier: 'se', forms: [['stilt', 32], ['oldslab', 30], ['resettlement', 24], ['newtower', 14]],
    },
    '秀山': {
      tier: 'se', forms: [['oldslab', 34], ['stilt', 28], ['resettlement', 24], ['newtower', 14]],
    },
    '彭水': {
      tier: 'se', forms: [['stilt', 30], ['oldslab', 30], ['resettlement', 26], ['newtower', 14]],
    },
    '武隆': {
      tier: 'se', forms: [['stilt', 28], ['oldslab', 30], ['resettlement', 24], ['newtower', 18]],
    },
    '石柱': {
      tier: 'se', forms: [['stilt', 32], ['oldslab', 30], ['resettlement', 24], ['newtower', 14]],
    },

    /* ── 农村自建（各区县都可能出现，权重低） ── */
    '城口农村': null   // 占位，实际由 selfbuilt 形态处理
  };

  /* ---------- 农村自建房：任何区县都可能有的第四种活法 ---------- */
  var SELFBUILT = {
    id: 'selfbuilt',
    zh: '自建房',
    en: 'Self-built house',
    floors: 3, lift: false, entrances: [1], heightM: 9,
    floorRange: [1, 3], layer: 'L4', layerCosts: true,
    src: '形态归纳：重庆区县农村自建房（砖混或土木，底层养殖、上层自住）普遍形态'
  };

  /* ---------- 装配：某个区县可选的住房选项 ---------- */
  /* 返回带权重的形态数组，规则层据此抽取。 */
  function formsForDistrict(district, urban) {
    var cfg = DISTRICT_FORMS[district];
    var out = [];
    if (cfg) {
      for (var i = 0; i < cfg.forms.length; i++) {
        var f = FORMS[cfg.forms[i][0]];
        if (!f) continue;
        out.push({ form: f, weight: cfg.forms[i][1] });
      }
    } else {
      // 没有专属配置的区县：按档位给通用组合
      out.push({ form: FORMS.oldslab, weight: 40 });
      out.push({ form: FORMS.newtower, weight: 30 });
      out.push({ form: FORMS.workers, weight: 20 });
      out.push({ form: FORMS.stilt, weight: 10 });
    }
    if (!urban) {
      // 农村：自建房权重最高
      out.push({ form: SELFBUILT, weight: 60 });
      out.push({ form: FORMS.stilt, weight: 40 });
    }
    return out;
  }

  function districtNote(district) {
    var cfg = DISTRICT_FORMS[district];
    if (cfg) return { zh: cfg.noteZh, en: cfg.noteEn, tier: cfg.tier };
    return null;
  }

  function tierOf(district) {
    var cfg = DISTRICT_FORMS[district];
    return cfg ? cfg.tier : 'core';
  }

  root.CQHOUSING = {
    FORMS: FORMS, SELFBUILT: SELFBUILT,
    DISTRICT_FORMS: DISTRICT_FORMS,
    formsForDistrict: formsForDistrict,
    districtNote: districtNote,
    tierOf: tierOf,
    formCount: Object.keys(FORMS).length
  };
})(typeof window !== 'undefined' ? window : globalThis);
