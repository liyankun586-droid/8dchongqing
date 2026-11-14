/* 渝你有约 — 时间比例系统
 *
 * Boss 的要求：「游戏中一年的时间 = 现实中一小时」。
 *
 * 这跟原来「一局几分钟走完一生」是两种完全不同的玩法：
 *   旧：一局几分钟，人-years 是抽象的，看完就走
 *   新：一年 = 一小时，一小时 = 一次实时推进，节奏跟现实同步
 *
 * 实现要点：
 *   1. 时间不是用 setInterval 累加的（后台标签页会被节流、而且不精确）
 *      而是用「时间戳差值」——每次 tick 算 (now - lastTick) 累积到年份里
 *   2. 玩家可以暂停 / 加速（1x / 8x / 60x），加速用于测试和「快进到下一个抉择」
 *   3. 抉择节点到达时自动暂停，等玩家做完决定再继续
 *   4. 状态里存 accumulatedMs，刷新页面不丢进度（localStorage）
 */
(function (root) {
  'use strict';

  var YEAR_MS = 60 * 60 * 1000;      // 一年 = 3600 秒 = 1 小时
  var SPEEDS = [1, 8, 60];
  var DEFAULT_SPEED_INDEX = 0;

  function Clock(opts) {
    opts = opts || {};
    this.yearMs = opts.yearMs || YEAR_MS;
    this.speeds = opts.speeds || SPEEDS;
    this.speedIndex = opts.speedIndex || DEFAULT_SPEED_INDEX;
    this.accumulatedMs = opts.accumulatedMs || 0;
    this.lastTick = null;
    this.running = false;
    this.onTick = opts.onTick || function () {};
    this.onYear = opts.onYear || function () {};
    this.onPause = opts.onPause || function () {};
    this._timer = null;
  }

  Clock.YEAR_MS = YEAR_MS;
  Clock.SPEEDS = SPEEDS;

  Clock.prototype.speed = function () { return this.speeds[this.speedIndex]; };

  Clock.prototype.setSpeedIndex = function (i) {
    this.speedIndex = Math.max(0, Math.min(this.speeds.length - 1, i));
    this.onTick(this.state());
  };

  Clock.prototype.cycleSpeed = function () {
    this.setSpeedIndex((this.speedIndex + 1) % this.speeds.length);
    return this.speed();
  };

  Clock.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.lastTick = Date.now();
    var self = this;
    // 250ms 一次 tick：足够让「一小时内过一年」的进度条平滑，
    // 又不会因为频率太高而吃 CPU（一年要跑 14400 次 tick）
    this._timer = setInterval(function () { self._tick(); }, 250);
    if (this._timer.unref) this._timer.unref();
  };

  Clock.prototype.stop = function () {
    this.running = false;
    this.lastTick = null;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  };

  Clock.prototype.pause = function () {
    if (!this.running) return;
    this.stop();
    this.onPause(this.state());
  };

  Clock.prototype.resume = function () {
    if (this.running) return;
    this.start();
  };

  /* 把真实经过的时间折算成「游戏内毫秒」，再折成年 */
  Clock.prototype._tick = function () {
    if (!this.running) return;
    var now = Date.now();
    var delta = now - this.lastTick;
    this.lastTick = now;
    /* 防御：系统休眠/时钟跳变时不要一次跳过几十年 */
    if (delta < 0) delta = 0;
    if (delta > 60000) delta = 60000;

    this.accumulatedMs += delta * this.speed();

    var years = Math.floor(this.accumulatedMs / this.yearMs);
    if (years > 0) {
      this.accumulatedMs -= years * this.yearMs;
      this.onYear(years, this.state());
    }
    this.onTick(this.state());
  };

  /* 手动推进（快进按钮 / 测试用），单位是「游戏内毫秒」 */
  Clock.prototype.advance = function (gameMs) {
    this.accumulatedMs += gameMs;
    var years = Math.floor(this.accumulatedMs / this.yearMs);
    if (years > 0) {
      this.accumulatedMs -= years * this.yearMs;
      this.onYear(years, this.state());
    }
    this.onTick(this.state());
    return years;
  };

  /* 推进整年数（测试 / 回放用） */
  Clock.prototype.advanceYears = function (n) {
    return this.advance(n * this.yearMs);
  };

  /* 当前进度：0..1，表示「今年过了多少」 */
  Clock.prototype.progress = function () {
    return this.accumulatedMs / this.yearMs;
  };

  /* 距离下一年的真实剩余秒数（按当前速度） */
  Clock.prototype.secondsToNextYear = function () {
    var remain = this.yearMs - this.accumulatedMs;
    return Math.max(0, remain / this.speed() / 1000);
  };

  /* 整段人生（80 年）需要的真实小时数 */
  Clock.prototype.hoursForLife = function (years) {
    return (years || 80) * this.yearMs / this.speed() / 3600000;
  };

  Clock.prototype.state = function () {
    return {
      running: this.running,
      speed: this.speed(),
      speedIndex: this.speedIndex,
      accumulatedMs: this.accumulatedMs,
      progress: this.progress(),
      secondsToNextYear: this.secondsToNextYear(),
      yearMs: this.yearMs
    };
  };

  Clock.prototype.save = function () {
    return { accumulatedMs: this.accumulatedMs, speedIndex: this.speedIndex, yearMs: this.yearMs };
  };

  Clock.prototype.restore = function (s) {
    if (!s) return;
    if (typeof s.accumulatedMs === 'number') this.accumulatedMs = s.accumulatedMs;
    if (typeof s.speedIndex === 'number') this.speedIndex = Math.max(0, Math.min(this.speeds.length - 1, s.speedIndex));
    if (typeof s.yearMs === 'number' && s.yearMs > 0) this.yearMs = s.yearMs;
  };

  root.CQCLOCK = {
    Clock: Clock,
    YEAR_MS: YEAR_MS,
    SPEEDS: SPEEDS
  };
})(typeof window !== 'undefined' ? window : globalThis);
