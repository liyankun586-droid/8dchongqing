/* 渝你有约 — 遥测层
 *
 * 目的不是监控玩家，是回答三个问题：
 *   1. 「住几楼」被感知到了吗？玩家会不会主动讲出自己的楼层故事？
 *   2. 玩家在哪一层犹豫最久？哪一层被选得最多？
 *   3. 哪种结语被分享得最多？
 *
 * 设计约束：
 *   - 不调用 LLM，不做用户画像，只记事件。
 *   - 默认只在本地记录（localStorage），不发任何网络请求。
 *   - 外部测试阶段可以打开 sendBeacon，把汇总数据发到指定地址。
 *   - 任何上报都不含可识别个人的信息：没有 IP、没有账号、没有精确位置。
 *
 * 用法：
 *   A.track('floor_selected', { layer: 'L6', floor: 17 });
 *   A.dump()   → 返回可上报的汇总对象
 */
(function (root) {
  'use strict';

  var KEY = 'yuyouyue.telemetry.v1';
  var ENDPOINT = '';        // 留空 = 只本地记录；填 URL = 额外发一次 beacon
  var MAX_EVENTS = 500;

  var mem = null;

  function now() { return Date.now(); }

  function load() {
    if (mem) return mem;
    mem = { events: [], sessions: 0, startedAt: now(), meta: {} };
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.events) mem = o;
      }
    } catch (e) { /* 隐私模式 / 无 localStorage：只用内存 */ }
    return mem;
  }

  function save() {
    try {
      if (root.localStorage) root.localStorage.setItem(KEY, JSON.stringify(mem));
    } catch (e) { /* 配额满或被禁用：忽略 */ }
  }

  function track(name, data) {
    var d = load();
    var ev = { n: name, t: now() };
    if (data) {
      Object.keys(data).forEach(function (k) {
        // 只接受标量，避免把整棵对象塞进去
        var v = data[k];
        if (v === null || v === undefined) return;
        if (typeof v === 'object') return;
        ev[k] = v;
      });
    }
    d.events.push(ev);
    if (d.events.length > MAX_EVENTS) d.events = d.events.slice(-MAX_EVENTS);
    save();
    return ev;
  }

  /* ---------- 汇总：不留原始事件，只留统计 ---------- */
  function dump() {
    var d = load();
    var byName = {};
    var floors = {};
    var layers = {};
    var jobs = {};
    var epilogues = {};
    var sessions = 0;

    d.events.forEach(function (ev) {
      byName[ev.n] = (byName[ev.n] || 0) + 1;
      if (ev.n === 'floor_selected') {
        if (ev.floor !== undefined) floors[ev.floor] = (floors[ev.floor] || 0) + 1;
        if (ev.layer !== undefined) layers[ev.layer] = (layers[ev.layer] || 0) + 1;
      }
      if (ev.n === 'life_finished' || ev.n === 'replay_opened') sessions++;
      if (ev.n === 'job_chosen' && ev.job) jobs[ev.job] = (jobs[ev.job] || 0) + 1;
      if (ev.n === 'share_clicked' && ev.epilogue) {
        epilogues[ev.epilogue] = (epilogues[ev.epilogue] || 0) + 1;
      }
    });

    // 楼层停留时长（从选层到第一次推进之间的秒数）
    var dwell = {};
    var pickT = null;
    d.events.forEach(function (ev) {
      if (ev.n === 'floor_selected') { pickT = ev.t; return; }
      if (pickT !== null && (ev.n === 'year_advanced' || ev.n === 'choice_made')) {
        var sec = Math.round((ev.t - pickT) / 1000);
        if (ev.layer !== undefined) dwell[ev.layer] = (dwell[ev.layer] || 0) + sec;
        pickT = null;
      }
    });

    return {
      events: d.events.length,
      byName: byName,
      floors: floors,
      layers: layers,
      jobs: jobs,
      epilogues: epilogues,
      dwellByLayer: dwell,
      // 平均每层停留秒数（只有选过该层的人算）
      avgDwell: (function () {
        var out = {};
        Object.keys(dwell).forEach(function (k) {
          var n = layers[k] || 1;
          out[k] = Math.round(dwell[k] / n);
        });
        return out;
      })(),
      meta: d.meta
    };
  }

  function reset() {
    mem = { events: [], sessions: 0, startedAt: now(), meta: {} };
    save();
  }

  function meta(k, v) {
    var d = load();
    d.meta[k] = v;
    save();
  }

  function send() {
    var d = dump();
    if (!ENDPOINT) return false;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, JSON.stringify(d));
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  root.CQTELEMETRY = {
    track: track, dump: dump, reset: reset, meta: meta, send: send,
    setEndpoint: function (u) { ENDPOINT = u; },
    getEndpoint: function () { return ENDPOINT; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
