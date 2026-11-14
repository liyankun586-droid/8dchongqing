/* 渝你有约 — V1.1 场景层（房间内可操作物件）
 *
 * 解决的问题：V1 是一「纯文字 + 一张剖面图」。这不像模拟人生。
 * 这一层给玩家一个**可点的房间**：家具、窗口、楼梯、灶台、邻居门。
 * 点一下 → 发生一件事 → 状态轴真的变（体力/关系/知识/健康/金钱）。
 *
 * 三条硬约束：
 * 1. 确定性。场景动作不引入随机数。所有数值后果写在 data 里，由 life 的
 *    rng 决定"这次是哪个邻居"这种**内容选择**，不决定**数值幅度**。
 * 2. 不可重置。场景动作会消耗"体力预算"，一年能做的动作有限——
 *    这让"住几楼"变成体感：住 1 楼能天天爬楼，住 24 楼下楼就是灾难。
 * 3. 与已有 6 种住房形态对齐。不同形态的房间布局不一样，物件不一样。
 *
 * 房间对象由 housing.js 的 form 决定：同一个 L6 层，
 * 老旧小区是公共走廊 + 公用厨房，工人新村是上下铺 + 布帘子，
 * 新建高层是电梯 + 独立厨房。
 */
(function (root) {
  'use strict';

  /* ---------- 场景物件表 ----------
   * 每个物件：
   *   id       稳定标识
   *   zh/en    名字
   *   where    出现在哪种房间（由 form.room 决定）
   *   act      动作函数签名 act(life, st) —— 直接改 st
   *   cost     体力消耗（正数）。体力不够就做不了，这是"住几楼"的核心体感。
   *   once     true = 一年只能用一次
   *   desc     点了之后显示的一句话（会走 i18n 翻译）
   */
  var OBJECTS = {
    /* ---- 通用：所有人家里都有 ---- */
    bed: {
      id: 'bed', zh: '床', en: 'Bed',
      act: function (life, st) {
        st.stamina = Math.min(100, st.stamina + 16);
        st.health += 1;
      },
      cost: 0, once: false, repeatable: true,
      descZh: '躺下。什么也不做，这就是休息。',
      descEn: 'Lie down. Do nothing. That is what rest is.'
    },
    window: {
      id: 'window', zh: '窗', en: 'Window',
      act: function (life, st) {
        st.happiness += 3;
        st.knowledge += 1;
      },
      cost: 2, once: false, repeatable: true,
      descZh: '看一眼外面。重庆的天永远在变。',
      descEn: 'Look outside. The Chongqing sky is always changing.'
    },
    stairs: {
      id: 'stairs', zh: '楼梯', en: 'Stairs',
      act: function (life, st) {
        // 爬楼是体力活。楼层越高越贵——这是核心机制的手感化。
        var fl = st.homeFloor || 1;
        var burden = Math.min(18, 2 + Math.floor(fl / 3));
        st.stamina = Math.max(0, st.stamina - burden);
        st.health += burden >= 10 ? -1 : 0;
        st.happiness -= fl >= 12 ? 2 : 0;
      },
      cost: 0, once: false, repeatable: true,
      descZh: '上下楼。高楼层的人这一趟不轻松。',
      descEn: 'Up and down. For a high floor, it is not easy.'
    },
    lift: {
      id: 'lift', zh: '电梯', en: 'Lift',
      act: function (life, st) {
        st.stamina = Math.min(100, st.stamina + 3);
        st.happiness += 1;
      },
      cost: 0, once: false, repeatable: true,
      descZh: '电梯。不用爬，但是要等。',
      descEn: 'The lift. No stairs, but you wait.'
    },
    stove: {
      id: 'stove', zh: '灶台', en: 'Stove',
      act: function (life, st) {
        // 体力消耗在 act 内部按状态浮动，但门槛用 cost 声明
        var drain = Math.round(12 + (st.money < 200 ? 14 : 0));
        st.stamina = Math.max(0, st.stamina - drain);
        st.money = Math.max(0, st.money - 18);
        st.health += 2;
        st.happiness += 2;
      },
      cost: 12, once: false, repeatable: true,
      descZh: '做饭。烟火气，也是开销。',
      descEn: 'Cook. Warmth and a small bill.'
    },
    balcony: {
      id: 'balcony', zh: '阳台', en: 'Balcony',
      act: function (life, st) {
        st.happiness += 4;
        st.ties += 1;
      },
      cost: 3, once: false, repeatable: true,
      descZh: '阳台上晾着别人家的被子。重庆的阳台是另一个房间。',
      descEn: 'Other people\'s laundry. In Chongqing the balcony is another room.'
    },
    phone: {
      id: 'phone', zh: '手机', en: 'Phone',
      act: function (life, st) {
        st.ties += 4;
        st.happiness += 3;
        st.knowledge += 1;
      },
      cost: 1, once: false, repeatable: true,
      descZh: '打个电话。关系就是这样维持住的。',
      descEn: 'Make a call. This is how relationships are maintained.'
    },
    gate: {
      id: 'gate', zh: '楼下的门', en: 'Street gate',
      act: function (life, st) {
        st.ties += 3;
        st.knowledge += 2;
        st.stamina = Math.max(0, st.stamina - 4);
      },
      cost: 0, once: false, repeatable: true,
      descZh: '出门。楼下总有人在等你。',
      descEn: 'Go out. Someone is always waiting downstairs.'
    },

    /* ---- 依形态专属 ---- */
    corridor: {
      id: 'corridor', zh: '走廊', en: 'Shared corridor',
      act: function (life, st) {
        st.ties += 6;
        st.happiness += 1;
      },
      cost: 1, once: false, repeatable: true,
      descZh: '公共走廊。整层楼的人都在这儿。',
      descEn: 'The shared corridor. Everyone on the floor passes through.'
    },
    bunk: {
      id: 'bunk', zh: '上下铺', en: 'Bunk bed',
      act: function (life, st) {
        st.happiness -= 1;
        st.ties += 5;
        st.health += 1;
      },
      cost: 0, once: false, repeatable: true,
      descZh: '上下铺，一块布帘子隔开两代人。',
      descEn: 'Two generations, one cloth curtain between them.'
    },
    sharedkitchen: {
      id: 'sharedkitchen', zh: '公用厨房', en: 'Shared kitchen',
      act: function (life, st) {
        st.ties += 7;
        st.stamina = Math.max(0, st.stamina - 8);
      },
      cost: 8, once: false, repeatable: true,
      descZh: '几户共用一个厨房。灶台永远排着队。',
      descEn: 'Several households, one kitchen. The stove is always in a queue.'
    },
    neighbour: {
      id: 'neighbour', zh: '邻居', en: 'Neighbour',
      act: function (life, st) {
        st.ties += 8;
        st.happiness += 3;
      },
      cost: 2, once: false, repeatable: true,
      descZh: '敲邻居的门。重庆人的关系是从敲门开始的。',
      descEn: "Knock on a neighbour's door. In Chongqing, this is how it starts."
    },
    raisedfloor: {
      id: 'raisedfloor', zh: '架空层', en: 'Raised ground floor',
      act: function (life, st) {
        st.knowledge += 2;
        st.happiness += 2;
      },
      cost: 2, once: false, repeatable: true,
      descZh: '楼下是鸡圈、柴堆，或者江水。',
      descEn: 'Below: chickens, firewood, or the river.'
    },
    rooftop: {
      id: 'rooftop', zh: '屋顶', en: 'Rooftop',
      act: function (life, st) {
        st.happiness += 6;
        st.ties += 2;
        st.stamina = Math.max(0, st.stamina - 6);
      },
      cost: 6, once: false, repeatable: true,
      descZh: '爬到屋顶。整个江滩都在脚下。',
      descEn: 'Climb to the roof. The whole river is below you.'
    },
    dryingrack: {
      id: 'dryingrack', zh: '晾衣绳', en: 'Drying line',
      act: function (life, st) {
        st.happiness += 3;
        st.ties += 2;
      },
      cost: 2, once: false, repeatable: true,
      descZh: '整条巷子的衣服都挂在这儿。',
      descEn: 'The whole alley hangs its laundry here.'
    },
    fields: {
      id: 'fields', zh: '菜地', en: 'Vegetable plot',
      act: function (life, st) {
        st.stamina = Math.max(0, st.stamina - 10);
        st.health += 3;
        st.money += 12;
      },
      cost: 0, once: false, repeatable: true,
      descZh: '自己种的菜。省钱，但费力。',
      descEn: 'Your own vegetables. Cheaper, and hard work.'
    }
  };

  /* ---------- 房间布局：按住房形态 ---------- */
  /* room 字段决定哪些物件出现、出现在哪个位置。
   * pos 是百分比坐标（房间底图 100x100），用来摆 SVG。
   */
  var ROOMS = {
    stilt: {
      zh: '吊脚楼底层', en: 'Stilt house, lower level',
      slots: [
        { id: 'bed', x: 22, y: 62 },
        { id: 'stove', x: 58, y: 60 },
        { id: 'raisedfloor', x: 78, y: 74 },
        { id: 'window', x: 12, y: 38 },
        { id: 'dryingrack', x: 42, y: 22 },
        { id: 'phone', x: 84, y: 34 },
        { id: 'neighbour', x: 34, y: 48 }
      ]
    },
    soviet: {
      zh: '筒子楼单间', en: 'Soviet block, single room',
      slots: [
        { id: 'bed', x: 24, y: 64 },
        { id: 'stove', x: 56, y: 62 },
        { id: 'window', x: 14, y: 34 },
        { id: 'corridor', x: 78, y: 46 },
        { id: 'phone', x: 46, y: 74 },
        { id: 'neighbour', x: 68, y: 30 }
      ]
    },
    workers: {
      zh: '工人新村宿舍', en: "Workers' village dorm",
      slots: [
        { id: 'bunk', x: 26, y: 60 },
        { id: 'stove', x: 58, y: 64 },
        { id: 'window', x: 14, y: 32 },
        { id: 'corridor', x: 76, y: 44 },
        { id: 'neighbour', x: 48, y: 26 },
        { id: 'dryingrack', x: 66, y: 76 }
      ]
    },
    oldslab: {
      zh: '老旧小区房间', en: 'Old block, room',
      slots: [
        { id: 'bed', x: 24, y: 62 },
        { id: 'stove', x: 56, y: 62 },
        { id: 'window', x: 14, y: 34 },
        { id: 'stairs', x: 80, y: 52 },
        { id: 'sharedkitchen', x: 44, y: 26 },
        { id: 'neighbour', x: 68, y: 72 },
        { id: 'phone', x: 40, y: 42 }
      ]
    },
    resettlement: {
      zh: '移民安置房', en: 'Resettlement flat',
      slots: [
        { id: 'bed', x: 24, y: 62 },
        { id: 'stove', x: 56, y: 62 },
        { id: 'window', x: 14, y: 34 },
        { id: 'balcony', x: 84, y: 40 },
        { id: 'stairs', x: 78, y: 70 },
        { id: 'fields', x: 46, y: 24 },
        { id: 'phone', x: 44, y: 78 }
      ]
    },
    newtower: {
      zh: '高层公寓', en: 'High-rise flat',
      slots: [
        { id: 'bed', x: 24, y: 62 },
        { id: 'stove', x: 56, y: 62 },
        { id: 'window', x: 12, y: 30 },
        { id: 'balcony', x: 84, y: 36 },
        { id: 'lift', x: 80, y: 68 },
        { id: 'phone', x: 44, y: 78 },
        { id: 'neighbour', x: 66, y: 22 }
      ]
    },
    selfbuilt: {
      zh: '农村自建房', en: 'Self-built house',
      slots: [
        { id: 'bed', x: 24, y: 62 },
        { id: 'stove', x: 58, y: 62 },
        { id: 'window', x: 14, y: 34 },
        { id: 'fields', x: 80, y: 56 },
        { id: 'dryingrack', x: 44, y: 24 },
        { id: 'gate', x: 70, y: 76 },
        { id: 'rooftop', x: 36, y: 20 }
      ]
    }
  };

  /* 形态 id 归一：housing.js 的选项对象 id 是 'd_' + form.id（区县包装），
   * 而规则层有些路径直接传原始 form。两种都要认。
   * 不归一的后果：slotsFor('d_newtower') 找不到房间，静默退回 oldslab，
   * 表现是「选了新建高层，房间里却摆着老楼的公共厨房」。 */
  function normalizeForm(form) {
    if (!form) return 'oldslab';
    var id = typeof form === 'string' ? form : form.id;
    if (!id) return 'oldslab';
    if (id.indexOf('d_') === 0) id = id.slice(2);
    if (ROOMS[id]) return id;
    // 具名建筑（白象居/李子坝等）按层归到相近的房间
    if (id === 'baixiangju' || id === 'liziba' || id === 'kaixuanlu') return 'oldslab';
    return 'oldslab';
  }

  /* 楼层越高，越可能把"爬楼"换成"电梯"；无电梯的高层才需要爬楼 */
  function slotsFor(form, floor, hasLift) {
    form = normalizeForm(form);
    var room = ROOMS[form] || ROOMS.oldslab;
    var slots = room.slots.slice();
    // 高楼层：把 stairs 换成 lift（如果这栋有电梯）
    if (hasLift) {
      slots = slots.map(function (s) { return s.id === 'stairs' ? { id: 'lift', x: s.x, y: s.y } : s; });
    }
    return slots.map(function (s) {
      var o = OBJECTS[s.id];
      if (!o) return null;
      return {
        id: o.id, x: s.x, y: s.y,
        zh: o.zh, en: o.en,
        descZh: o.descZh, descEn: o.descEn,
        cost: o.cost, once: o.once, repeatable: o.repeatable
      };
    }).filter(Boolean);
  }

  /* ---------- 执行一个场景动作 ---------- */
  /* 返回 {ok, reason, changes} —— changes 是状态轴的前后差，UI 用来显示浮动数字 */
  function act(life, objectId) {
    var st = life.st;
    var o = OBJECTS[objectId];
    if (!o) return { ok: false, reason: 'unknown' };

    // 一年一次的动作：用年份+动作 id 记账
    var yearKey = st.year + ':' + objectId;
    if (o.once && st.sceneUsed && st.sceneUsed[yearKey]) {
      return { ok: false, reason: 'once' };
    }

    var before = {
      stamina: st.stamina, money: st.money, health: st.health,
      happiness: st.happiness, ties: st.ties, knowledge: st.knowledge
    };

    // 体力不够 → 做不了（"住几楼"的体感来源）
    var need = o.cost || 0;
    if (need > 0 && st.stamina < need) {
      return { ok: false, reason: 'tired', need: need, have: Math.floor(st.stamina) };
    }

    o.act(life, st);

    if (!st.sceneUsed) st.sceneUsed = {};
    st.sceneUsed[yearKey] = 1;

    var changes = {};
    ['stamina', 'money', 'health', 'happiness', 'ties', 'knowledge'].forEach(function (k) {
      var d = Math.round(st[k] - before[k]);
      if (d !== 0) changes[k] = d;
    });

    return { ok: true, id: objectId, changes: changes };
  }

  /* ---------- 房间随人生变化 ---------- */
  /* 一个人不能住一辈子同一间房：结婚、搬家、失业、变老，房间该跟着变。
   * 这是「场景」区别于「贴图」的关键——玩家得看得见自己的人生改了住处。 */
  function sceneState(life) {
    var st = life.st;
    var out = {};

    if (st.married) out.weddingPhoto = 1;
    if (st.children > 0) out.childToy = 1;
    if (st.children >= 2) out.schoolBag = 1;

    if (st.job) {
      if (st.job.id === 'bangbang') out.pole = 1;
      if (st.job.id === 'teacher') out.books = 1;
      if (st.job.id === 'nurse') out.labcoat = 1;
      if (st.job.id === 'driver') out.lorryKeys = 1;
    }
    out.desk = 1;
    if (st.education === 'college' || st.education === 'university') out.diploma = 1;

    if (st.age >= 60) out.walker = 1;
    if (st.age >= 70) out.photoAlbum = 1;
    if (st.health < 35) out.medicine = 1;

    if (st.money > 200000) out.tv = 1;
    if (st.money < 500 && st.age >= 20) out.rentNotice = 1;

    if (st.ties > 70) out.neighbourGift = 1;
    if (st.ties < 25) out.emptyChairs = 1;

    return out;
  }

  /* 这些是「人生痕迹」，只出现在房间里让玩家看见自己攒下了什么。 */
  var TRACES = {
    weddingPhoto: { zh: '结婚照', en: 'Wedding photo' },
    childToy:     { zh: '孩子的玩具', en: "Child's toy" },
    schoolBag:    { zh: '书包', en: 'School bag' },
    pole:         { zh: '扁担', en: 'Carrying pole' },
    books:        { zh: '一摞书', en: 'Stack of books' },
    labcoat:      { zh: '白大褂', en: 'Lab coat' },
    lorryKeys:    { zh: '车钥匙', en: 'Truck keys' },
    desk:         { zh: '一张桌子', en: 'A desk' },
    diploma:      { zh: '毕业证', en: 'Diploma' },
    walker:       { zh: '拐杖', en: 'Walking stick' },
    photoAlbum:   { zh: '相册', en: 'Photo album' },
    medicine:     { zh: '药盒', en: 'Medicine box' },
    tv:           { zh: '电视', en: 'Television' },
    rentNotice:   { zh: '催租单', en: 'Rent notice' },
    neighbourGift:{ zh: '邻居送的盆栽', en: "Neighbour's plant" },
    emptyChairs:  { zh: '空着的椅子', en: 'Empty chairs' }
  };

  var TRACE_SLOTS = [
    { x: 8, y: 92 }, { x: 18, y: 94 }, { x: 28, y: 92 }, { x: 38, y: 94 },
    { x: 50, y: 92 }, { x: 60, y: 94 }, { x: 70, y: 92 }, { x: 80, y: 94 },
    { x: 90, y: 92 }, { x: 12, y: 84 }, { x: 88, y: 84 }, { x: 46, y: 86 },
    { x: 34, y: 86 }, { x: 62, y: 86 }, { x: 24, y: 84 }, { x: 76, y: 84 },
    { x: 42, y: 78 }, { x: 56, y: 78 }
  ];

  /* 算出这一年的房间痕迹（确定性：由 state 派生，不是随机） */
  function tracesFor(life) {
    var st = life.st;
    var flags = sceneState(life);
    var order = Object.keys(TRACES);
    var keys = order.filter(function (k) { return flags[k]; });

    /* 人物卡回应后的物证也进房间（邻居送的青菜、亲戚留下的橘子……） */
    var extra = life.cardTraces || {};
    Object.keys(extra).forEach(function (k) {
      if (!flags[k]) { flags[k] = 1; keys.push(k); }
    });

    /* 「下一世」的遗物：上一世留在门后的东西 */
    var NL = (typeof window !== 'undefined' && window.CQNEXTLIFE) ? window.CQNEXTLIFE.RELICS : null;
    var RE = (typeof window !== 'undefined' && window.CQNEXTLIFE) ? window.CQNEXTLIFE : null;
    if (RE && RE.load) {
      var lg = RE.load();
      if (lg && lg.legacy) {
        RE.relicsOf(lg.legacy).forEach(function (r) {
          if (!flags[r.key]) { flags[r.key] = 1; keys.push(r.key); }
        });
      }
    }

    var C = (typeof window !== 'undefined' && window.CQPEOPLE) ? window.CQPEOPLE.CARD_TRACES : null;

    var res = [];
    for (var i = 0; i < keys.length && res.length < TRACE_SLOTS.length; i++) {
      var k = keys[i];
      var t = TRACES[k];
      var zh, en, gift = false;
      if (t) {
        zh = t.zh; en = t.en;
      } else if (C && C[k]) {
        /* 人物卡物证：房间里要有个看得见的东西，但不必有自己的图标 */
        zh = C[k].zh; en = C[k].en; gift = true;
      } else if (NL && NL[k]) {
        /* 上一世的遗物 */
        zh = NL[k].zh; en = NL[k].en; gift = true;
      } else {
        continue;   // 认不出的 key 直接跳过，别让整间屋子崩掉
      }
      res.push({ key: k, zh: zh, en: en, x: TRACE_SLOTS[i].x, y: TRACE_SLOTS[i].y, gift: gift });
    }
    return res;
  }

  root.CQSCENE = {
    OBJECTS: OBJECTS,
    ROOMS: ROOMS,
    TRACES: TRACES,
    slotsFor: slotsFor,
    normalizeForm: normalizeForm,
    sceneState: sceneState,
    tracesFor: tracesFor,
    act: act
  };
})(typeof window !== 'undefined' ? window : this);
