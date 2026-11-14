/* 渝你有约 — 「下一世」继承层
 *
 * 问题（来自调研）：我们的核心承诺是「一次人生，不可重掷」，
 * 但终局页放一个「再来一次」按钮，玩家点下去就是重开一局 ——
 * 这跟承诺在哲学上是打架的。玩家会想重开，又会觉得重开没有意义。
 *
 * Reigns 的解法（最契合我们）：把「再来一次」改成「下一世」。
 * 不是重开，是延续。你是上一条命的下一个。
 *
 * 这一层做的事：把上一条人生里几样东西传给下一条。
 *   · 住的层（你上辈子住几层，这辈子起点还是那个层）
 *   · 攒下的成就（跨人生累计，localStorage）
 *   · 门口的遗物（上一世留下的东西，新房间里有）
 *
 * 硬约束：
 *   1. 确定性：同样的继承状态 → 同样的下一世。
 *   2. 不许变强：继承只传递「经历」，不传钱、不传健康、不传属性加成。
 *      否则「下一世」会变成刷数值，破坏「不可重掷」。
 *   3. 一次人生仍然是一条人生：继承不改出生地、不改出生年份、不改投胎结果。
 */
(function (root) {
  'use strict';

  var KEY = 'cq_nextlife';

  /* ---------- 上一世的遗产 ---------- */
  /* 只有这些能传下去，而且传的是「经历」不是「优势」。 */
  function legacyOf(life) {
    if (!life || !life.st) return null;
    var st = life.st;
    return {
      /* 住的层：这是最有分量的一项 —— 它代表你上一世的身份 */
      layer: st.prof && st.prof.layer ? st.prof.layer : null,
      floor: st.homeFloor,
      /* 经历的极端值：这些是「你活过」的证据，不是收益 */
      years: st.finalAge || st.age,
      job: st.job ? st.job.id : null,
      cause: st.causeOfDeath || null,
      /* 房间里的遗物：下一世开门能看见 */
      traces: []
    };
  }

  /* ---------- 继承规则 ---------- */
  /* layer 继承：下一世直接从同一个垂直层开始投胎。
   * 这不是变强 —— 楼层本身有代价（通勤、体力、租金、孤独），
   * 上一世住 L7，下一世还是 L7，你依然要爬楼。
   * 唯一的不同是：你知道自己那层是什么感觉了。 */
  function inheritedLayer(legacy) {
    if (!legacy || !legacy.layer) return null;
    return legacy.layer;
  }

  /* 下一世门��里的遗物：上一世留下的几样东西 */
  var RELICS = {
    oldShoes:   { zh: '一双旧鞋', en: 'A pair of old shoes' },
    kettle:     { zh: '一把用旧的电水壶', en: 'A worn electric kettle' },
    photo:      { zh: '一张没署名的照片', en: 'An unsigned photograph' },
    ledger:     { zh: '一本记账的旧本子', en: 'An old ledger' },
    pottedPlant:{ zh: '一盆还活着的花', en: 'A plant still alive' },
    radio:      { zh: '一台旧收音机', en: 'An old radio' },
    recipe:     { zh: '一张手写的菜谱', en: 'A handwritten recipe' }
  };

  /* 遗物由上一世的 state 派生 —— 确定性，不是随机 */
  function relicsOf(legacy) {
    if (!legacy) return [];
    var out = [];
    function add(key) { if (RELICS[key] && out.indexOf(key) < 0) out.push(key); }

    if (legacy.years >= 70) add('oldShoes');
    if (legacy.years >= 60) add('kettle');
    if (legacy.job === 'teacher' || legacy.job === 'nurse') add('ledger');
    if (legacy.job === 'bangbang') add('pole');
    if (legacy.years >= 50) add('photo');
    if (legacy.job === 'nurse' || legacy.job === 'teacher') add('recipe');
    if (legacy.cause === 'disease') add('pottedPlant');
    if (legacy.years >= 40) add('radio');

    return out.map(function (k) {
      return { key: k, zh: RELICS[k].zh, en: RELICS[k].en };
    });
  }

  /* ---------- 存取 ---------- */
  function load() {
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(KEY) : null;
      if (!raw) return null;
      var v = JSON.parse(raw);
      return (v && v.legacy) ? v : null;
    } catch (e) {
      return null;
    }
  }

  function save(legacy) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEY, JSON.stringify({ legacy: legacy }));
    } catch (e) { /* 隐私模式等，忽略 */ }
  }

  function clear() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
  }

  /* ---------- 下一世的起点 ---------- */
  /* 下一世投胎时，出生地/年份/性别/家境照旧 —— 唯一变的是：
   *   1. 默认选中的垂直层 = 上一世的层
   *   2. 房间里多出上一世的遗物
   */
  function prepareNextLife(life) {
    var legacy = load();
    if (!legacy || !legacy.legacy) return null;
    var relics = relicsOf(legacy.legacy);
    if (life) {
      life.cardTraces = life.cardTraces || {};
      relics.forEach(function (r) { life.cardTraces[r.key] = 1; });
    }
    return {
      layer: inheritedLayer(legacy.legacy),
      relics: relics,
      fromYears: legacy.legacy.years,
      fromJob: legacy.legacy.job
    };
  }

  /* 玩家点「再来一次」时：把这一世的遗产存下来 */
  function commitLife(life) {
    var legacy = legacyOf(life);
    if (!legacy) return null;
    save(legacy);
    return legacy;
  }

  root.CQNEXTLIFE = {
    RELICS: RELICS,
    legacyOf: legacyOf,
    inheritedLayer: inheritedLayer,
    relicsOf: relicsOf,
    prepareNextLife: prepareNextLife,
    commitLife: commitLife,
    load: load,
    save: save,
    clear: clear
  };
})(typeof window !== 'undefined' ? window : this);
