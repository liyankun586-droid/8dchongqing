/* 渝你有约 — V1 多语言层
 *
 * 为什么单独一个文件：
 * 加一门语言应该是「加一份数据」，不是「改一遍代码」。
 * 所以这里的规则是：
 *   1. 每条文案有稳定 id（由位置推导，不需要手写）
 *   2. 找不到目标语言时按 fallback 链回退：ja → en，ko → en，es → en
 *   3. 回退到英文永远不会显示空白，也不会显示中文（海外版不能漏中文）
 *
 * id 规则：
 *   job:<职业id>:<序号>    职业结语
 *   generic:<序号>         通用结语
 *   event:<事件类型>       事件文案
 *   floor:<层>:<序号>      楼层回声
 *
 * 语言代码用 BCP 47：en / zh / ja / ko / es
 */
(function (root) {
  'use strict';

  var LANGS = [
    { code: 'en', label: 'English',  short: 'EN' },
    { code: 'zh', label: '中文',      short: '中文' },
    { code: 'ja', label: '日本語',    short: '日本語' },
    { code: 'ko', label: '한국어',    short: '한국어' },
    { code: 'es', label: 'Español',  short: 'ES' }
  ];

  /* 回退链：目标语言没有就退到英文，再没有就退到中文（仅中文源） */
  var FALLBACK = {
    en: ['en'],
    zh: ['zh', 'en'],
    ja: ['ja', 'en'],
    ko: ['ko', 'en'],
    es: ['es', 'en']
  };

  /* ---------- 翻译数据 ---------- */
  /* 结构：{ 文本id: { ja: '...', ko: '...', es: '...' } } */
  /* 没翻译的语言会自动回退到英文。 */
  var PACKS = {
    ja: {},
    ko: {},
    es: {}
  };

  /* 各语言包文件（i18n_ja.js 等）会把自己挂到 root.CQI18N_PACK_JA 上，
   * 这里统一收集。加一门语言 = 加一个文件 + 在下面加一行。 */
  function collectPacks() {
    ['JA', 'KO', 'ES'].forEach(function (code) {
      // 场景层包（i18n_ja_scene.js 等）也要收进来
      ['CQI18N_PACK_' + code, 'CQI18N_PACK_' + code + '_SCENE', 'CQI18N_PEOPLE_' + code, 'CQI18N_CHOICES_' + code].forEach(function (name) {
        var src = root[name];
        if (!src) return;
        var lang = code.toLowerCase();
        for (var k in src) {
          if (Object.prototype.hasOwnProperty.call(src, k)) PACKS[lang][k] = src[k];
        }
      });
    });
  }

  /* ---------- 查找 ---------- */
  /* 翻译包有两种形状，都要认：
   *   { title: '...', body: '...' }   —— 职业结语、UI 词典
   *   '...'                          —— 场景层翻译包（扁平字符串）
   * 返回字符串或 null。 */
  function valueOf(v) {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'object') {
      if (v.body) return v.body;
      if (v.title) return v.title;
      return null;
    }
    return String(v);
  }

  /* 按回退链找：ja → en，ko → en，es → en */
  function lookup(pack, lang) {
    if (!pack) return null;
    var chain = FALLBACK[lang] || ['en'];
    for (var i = 0; i < chain.length; i++) {
      var v = valueOf(pack[chain[i]]);
      if (v !== null) return v;
    }
    return null;
  }

  /* 取文本条目：pack 里按 id 存 */
  function t(id, lang, pack) {
    var p = pack || PACKS;
    /* 按语言链找：p[lang][id] 是该语言的条目本身（不是嵌套对象） */
    var chain = FALLBACK[lang] || [lang, 'en'];
    for (var i = 0; i < chain.length; i++) {
      var lp = p[chain[i]];
      if (!lp) continue;
      var v = valueOf(lp[id]);
      if (v !== null) return v;
    }
    return null;
  }

  /* 覆盖某个语言包（构建脚本或后续人工翻译用） */
  function addPack(lang, map) {
    if (!PACKS[lang]) PACKS[lang] = {};
    for (var k in map) PACKS[lang][k] = map[k];
  }

  /* 该语言翻译覆盖率 */
  function coverage(lang) {
    var p = PACKS[lang];
    if (!p) return { has: 0, total: 0, pct: 0 };
    var ids = Object.keys(p);
    var total = 0;
    // 以最全的语言包为基准
    for (var code in PACKS) {
      total = Math.max(total, Object.keys(PACKS[code]).length);
    }
    return { has: ids.length, total: total, pct: total ? Math.round(ids.length / total * 100) : 0 };
  }

  collectPacks();

  root.CQI18N = {
    LANGS: LANGS,
    PACKS: PACKS,
    FALLBACK: FALLBACK,
    lookup: lookup,
    t: t,
    addPack: addPack,
    coverage: coverage
  };
})(typeof window !== 'undefined' ? window : globalThis);
