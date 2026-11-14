/* 渝你有约 — V1 成就系统
 *
 * 「一次人生，不可重置」是产品的核心，但也带来一个问题：
 * 玩完一次就没动力了。成就是重玩理由。
 *
 * 设计原则：
 * 1. 成就只统计「发生过什么」，不评价好坏。
 *    「住过 L0 半地下室」不是奖杯，是记录。
 * 2. 每个成就都要能回答「我凭什么拿到它」。
 * 3. 全部存在 localStorage，不上传。
 * 4. 收集类成就是主线（8 层 / 12 职业 / 37 区县），
 *    其余是支线（活到 90 / 早逝 / 当过棒棒……）。
 */
(function (root) {
  'use strict';

  var KEY = 'cq8d.achievements.v1';

  /* ---------- 成就定义 ---------- */
  /* id / 名称 / 判定函数(st) / 描述 / 分类 */
  var ACHIEVEMENTS = [
    /* ── 垂直层收集（主线） ── */
    { id: 'layer_L0', cat: 'layer', zh: '半地下室', en: 'Down in the Dark',
      descZh: '住过 L0 半地下室。潮气从墙根往上爬。',
      descEn: 'Lived in a semi-basement. The damp climbed the wall.',
      when: function (s) { return s.prof && s.prof.layer === 'L0'; } },
    { id: 'layer_L1', cat: 'layer', zh: '江边', en: 'River Level',
      descZh: '住过 L1 江边。楼下是水。',
      descEn: 'Lived at river level. There was water underneath.',
      when: function (s) { return s.prof && s.prof.layer === 'L1'; } },
    { id: 'layer_L2', cat: 'layer', zh: '桥下', en: 'Under the Bridge',
      descZh: '住过 L2 桥下铺。车从头顶过。',
      descEn: 'Lived under the bridge. Traffic passed overhead.',
      when: function (s) { return s.prof && s.prof.layer === 'L2'; } },
    { id: 'layer_L3', cat: 'layer', zh: '街面', en: 'Street Level',
      descZh: '住过 L3 街面。楼下是店招，夜里亮到两点。',
      descEn: 'Lived on the street. The shop signs burned until two in the morning.',
      when: function (s) { return s.prof && s.prof.layer === 'L3'; } },
    { id: 'layer_L4', cat: 'layer', zh: '梯坎', en: 'Stair Level',
      descZh: '住过 L4 梯坎层。出门是往上。',
      descEn: 'Lived at stair level. Going out meant going up.',
      when: function (s) { return s.prof && s.prof.layer === 'L4'; } },
    { id: 'layer_L5', cat: 'layer', zh: '标准层', en: 'The Standard Floor',
      descZh: '住过 L5 标准住宅层。多数人的一生。',
      descEn: 'Lived on the standard residential floor. Where most lives happen.',
      when: function (s) { return s.prof && s.prof.layer === 'L5'; } },
    { id: 'layer_L6', cat: 'layer', zh: '塔楼', en: 'Tower',
      descZh: '住过 L6 塔楼。游船从窗户下面过。',
      descEn: 'Lived in a tower. Cruise boats passed below the window.',
      when: function (s) { return s.prof && s.prof.layer === 'L6'; } },
    { id: 'layer_L7', cat: 'layer', zh: '顶层', en: 'The Top',
      descZh: '住过 L7 顶层。整座城市的灯在脚下。',
      descEn: 'Lived at the top. Every light in the city below.',
      when: function (s) { return s.prof && s.prof.layer === 'L7'; } },
    { id: 'layer_all', cat: 'layer', zh: '八层都住过', en: 'All Eight Heights',
      descZh: '八层全部住过。你知道这座城市从上到下是什么样子。',
      descEn: 'You have lived at every height. You know this city from the bottom up.',
      when: function (s, seen) { return ['L0','L1','L2','L3','L4','L5','L6','L7']
        .every(function (L) { return seen.layers && seen.layers[L]; }); } },

    /* ── 职业收集（主线） ── */
    { id: 'job_bangbang', cat: 'job', zh: '一肩挑起来', en: 'One Shoulder, One Load',
      descZh: '当过棒棒。这个城市的力气。',
      descEn: 'You carried loads at Chaotianmen. The muscle of this city.',
      when: function (s) { return s.job && s.job.id === 'bangbang'; } },
    { id: 'job_factory', cat: 'job', zh: '流水线', en: 'The Line',
      descZh: '在流水线上站过。站得住，饿不着。',
      descEn: 'You worked a factory line. Steady, never hungry.',
      when: function (s) { return s.job && s.job.id === 'factory'; } },
    { id: 'job_office', cat: 'job', zh: '写字楼', en: 'A Desk Job',
      descZh: '进过写字楼。体面，天花板高。',
      descEn: 'You took a desk job. Respectable, with a high ceiling.',
      when: function (s) { return s.job && s.job.id === 'office'; } },
    { id: 'job_teacher', cat: 'job', zh: '讲台', en: 'The Classroom',
      descZh: '站过讲台。稳定，受尊敬。',
      descEn: 'You stood in front of a classroom. Stable and respected.',
      when: function (s) { return s.job && s.job.id === 'teacher'; } },
    { id: 'job_nurse', cat: 'job', zh: '白大褂', en: 'The Ward',
      descZh: '穿过白大褂。累，但被需要。',
      descEn: 'You wore scrubs. Tiring, but needed.',
      when: function (s) { return s.job && s.job.id === 'nurse'; } },
    { id: 'job_driver', cat: 'job', zh: '方向盘', en: 'The Steering Wheel',
      descZh: '握过方向盘。重庆没有一段路是直的。',
      descEn: 'You held the steering wheel. No road in Chongqing is straight.',
      when: function (s) { return s.job && s.job.id === 'driver'; } },
    { id: 'job_craft', cat: 'job', zh: '手上的活', en: 'The Trade',
      descZh: '有一门手艺。工具换了三轮，手法没变。',
      descEn: 'You had a trade. The tools changed three times; the technique never did.',
      when: function (s) { return s.job && s.job.id === 'craft'; } },
    { id: 'job_construction', cat: 'job', zh: '工地', en: 'The Site',
      descZh: '在工地上过。钱来得快，膝盖先坏。',
      descEn: 'You worked a building site. The money came fast, your knees went first.',
      when: function (s) { return s.job && s.job.id === 'construction'; } },
    { id: 'job_tech', cat: 'job', zh: '写代码', en: 'Write Code',
      descZh: '写过代码。在这城市里这是最体面的活法。',
      descEn: 'You wrote code. In this city, the most respectable way to earn a living.',
      when: function (s) { return s.job && s.job.id === 'tech'; } },
    { id: 'job_shop', cat: 'job', zh: '自己做生意', en: 'Your Own Shop',
      descZh: '开过自己的摊子。可能挣大钱，也可能赔光。',
      descEn: 'You ran your own shop. You could make a fortune or lose everything.',
      when: function (s) { return s.job && s.job.id === 'shop'; } },
    { id: 'job_farmer', cat: 'job', zh: '回山里', en: 'Back to the Hills',
      descZh: '回过山里种地。坡上有田，坡上有房，坡上有人。',
      descEn: 'You went back to the hills to farm. Paddies, houses and people, all on the slope.',
      when: function (s) { return s.job && s.job.id === 'farmer'; } },
    { id: 'job_courier', cat: 'job', zh: '快递员', en: 'The Courier',
      descZh: '送过快递。棒棒的活没了，但肩膀还在。',
      descEn: 'You delivered parcels. The carrying is gone, but the shoulders remain.',
      when: function (s) { return s.job && s.job.id === 'courier'; } },

    /* ── 一生本身 ── */
    { id: 'long_life', cat: 'life', zh: '长寿', en: 'A Long Life',
      descZh: '活过 90 岁。',
      descEn: 'Lived past 90.',
      when: function (s) { return s.finalAge >= 90; } },
    { id: 'short_life', cat: 'life', zh: '早逝', en: 'Early',
      descZh: '没活到 40 岁。',
      descEn: 'Did not reach 40.',
      when: function (s) { return s.finalAge < 40; } },
    { id: 'rich', cat: 'life', zh: '存下了', en: 'Put Something Away',
      descZh: '退休时净资产超过 300 万。',
      descEn: 'Retired with more than 3 million saved.',
      when: function (s) { return s.wealth >= 60; } },
    { id: 'broke', cat: 'life', zh: '一场空', en: 'Nothing Left',
      descZh: '结束时净资产为负，还欠着钱。',
      descEn: 'Finished in debt, with nothing left.',
      when: function (s) { return s.money < 0 && s.inDebt; } },
    { id: 'self_raised', cat: 'life', zh: '自己长起来', en: 'Raised Yourself',
      descZh: '在重庆长大，父母还在老家。',
      descEn: 'You grew up in Chongqing while your parents stayed home.',
      when: function (s) { return s.selfRaised; } },
    { id: 'left_behind', cat: 'life', zh: '留守儿童', en: 'Left Behind',
      descZh: '小时候爸妈不在身边。',
      descEn: 'As a child, your parents were not there.',
      when: function (s) { return s.family === 'left_behind'; } },
    { id: 'sold_flat', cat: 'life', zh: '卖了房', en: 'Sold the Flat',
      descZh: '把房子卖了。视野没了，账清了。',
      descEn: 'You sold the flat. The view is gone; the debt is settled.',
      when: function (s) { return s.soldFlat; } },
    { id: 'married', cat: 'life', zh: '有人等门', en: 'Someone Waiting',
      descZh: '结婚，然后有人在门口等你。',
      descEn: 'You married, and then someone waited at the door.',
      when: function (s) { return s.married; } },
    { id: 'three_kids', cat: 'life', zh: '一桌人', en: 'A Full Table',
      descZh: '养了三个孩子。',
      descEn: 'You raised three children.',
      when: function (s) { return s.children >= 3; } },
    { id: 'downgrade', cat: 'life', zh: '往下搬过', en: 'Moved Down',
      descZh: '因为扛不住房租，往下搬了一层。',
      descEn: 'You moved down a floor because the rent was too much.',
      when: function (s) {
        return (s.log || []).some(function (e) { return e.kind === 'downgrade'; });
      } },
    { id: 'moved_city', cat: 'life', zh: '换过城', en: 'Changed Cities',
      descZh: '在这座城市里搬过家。',
      descEn: 'You moved within this city.',
      when: function (s) {
        return (s.log || []).some(function (e) { return e.kind === 'move'; });
      } },
    { id: 'bangbang_line', cat: 'life', zh: '扛到底', en: 'Carried On',
      descZh: '当棒棒，一直扛到中年。',
      descEn: 'You kept carrying into middle age.',
      when: function (s) { return s.bbPersist || s.bbApprentice; } },
    { id: 'bangbang_teach', cat: 'life', zh: '把力气变成别的', en: 'Turned Strength Into Something Else',
      descZh: '收了徒弟。',
      descEn: 'You took an apprentice.',
      when: function (s) { return s.bbApprentice; } }
  ];

  var CATS = {
    layer: { zh: '垂直层', en: 'Vertical layers' },
    job: { zh: '职业', en: 'Work' },
    life: { zh: '一生', en: 'A life' }
  };

  /* ---------- 存储 ---------- */
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return null;
      if (!o.unlocked) o.unlocked = {};
      if (!o.seen) o.seen = { layers: {}, districts: {}, jobs: {}, buildings: {} };
      if (!o.seen.layers) o.seen.layers = {};
      if (!o.seen.districts) o.seen.districts = {};
      if (!o.seen.jobs) o.seen.jobs = {};
      if (!o.seen.buildings) o.seen.buildings = {};
      o.count = o.count || 0;
      return o;
    } catch (e) { return null; }
  }

  function save(data) {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 无痕模式 */ }
  }

  function blank() {
    return {
      unlocked: {}, seen: { layers: {}, districts: {}, jobs: {}, buildings: {} },
      count: 0, total: ACHIEVEMENTS.length
    };
  }

  /* ---------- 主接口 ---------- */
  /* 结算一条人生：更新收集进度，返回新解锁的成就列表。 */
  function recordLife(st, birth) {
    var data = load() || blank();
    var newly = [];

    // 收集进度（这个人生解锁了什么）
    if (st.prof && st.prof.layer) data.seen.layers[st.prof.layer] = 1;
    if (st.home && st.home.id) data.seen.buildings[st.home.id] = 1;
    if (st.job && st.job.id) data.seen.jobs[st.job.id] = 1;
    if (st.livingDistrict) data.seen.districts[st.livingDistrict] = 1;
    if (birth && birth.district) data.seen.districts[birth.district] = 1;

    data.count = (data.count || 0) + 1;

    // 逐个判定
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (data.unlocked[a.id]) continue;
      var ok = false;
      try { ok = !!a.when(st, data.seen); } catch (e) { ok = false; }
      if (ok) {
        data.unlocked[a.id] = 1;
        newly.push(a);
      }
    }

    save(data);
    return { data: data, newly: newly };
  }

  function getAll() {
    var data = load() || blank();
    return ACHIEVEMENTS.map(function (a) {
      return {
        id: a.id, cat: a.cat,
        zh: a.zh, en: a.en,
        descZh: a.descZh, descEn: a.descEn,
        unlocked: !!data.unlocked[a.id]
      };
    });
  }

  function summary() {
    var data = load() || blank();
    var n = Object.keys(data.unlocked).length;
    return {
      unlocked: n, total: ACHIEVEMENTS.length,
      lives: data.count || 0,
      layers: Object.keys(data.seen.layers).length,
      jobs: Object.keys(data.seen.jobs).length,
      districts: Object.keys(data.seen.districts).length,
      buildings: Object.keys(data.seen.buildings).length
    };
  }

  function reset() {
    save(blank());
    return blank();
  }

  root.CQACHIEVE = {
    ACHIEVEMENTS: ACHIEVEMENTS,
    CATS: CATS,
    recordLife: recordLife,
    getAll: getAll,
    summary: summary,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : globalThis);
