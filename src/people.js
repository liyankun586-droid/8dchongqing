/* 渝你有约 — 人物卡片层
 *
 * 问题：社会关系现在是��个数（ties 0-100），玩家看不到「谁」。
 * 调研结论（docs/_research/人生模拟器玩法与商业模式.md）：
 *   Reigns 的解法最契合我们——一张卡 + 一句处境 + 两个回应，
 *   而且回应要有「物证」：邻居在你门后堆了东西，楼下老人帮你照看孩子。
 *
 * 设计约束：
 *   1. 确定性：同一 life + 同一 state → 同一张卡、同一套选项。
 *      不随机。卡片由 state 派生，和 traces 一个思路。
 *   2. 回应必须改状态，且改的量可测（跟抉择节点一个标准）。
 *   3. 每张卡的回应有后果物证，会出现在房间里。
 *   4. 卡片池按「谁可能出现在你这间屋子」来分：楼层越高，邻居越远，
 *      楼下的人反而更近 —— 这是「住几楼」在社交上的体感。
 */
(function (root) {
  'use strict';

  /* ---------- 人物档案 ---------- */
  /* 每个角色有自己的楼层偏好：住得越高，越见不到人。
   * minFloor/maxFloor 决定「谁能出现在你门口」。 */
  var PEOPLE = {
    auntie: {
      id: 'auntie', zh: '楼下嬢嬢', en: 'The auntie downstairs',
      role: 'neighbour',
      minFloor: 1, maxFloor: 6,
      zhIntro: '她住在你下面两层，每晚在门口择菜。',
      enIntro: 'She lives two floors below, sorting vegetables outside her door every evening.',
      options: [
        {
          id: 'help', zh: '帮她搬菜', en: 'Carry her vegetables up',
          zhResult: '两袋青菜，一句「你这个娃娃懂事」。',
          enResult: 'Two bags of greens, and one "what a good kid you are".',
          apply: function (st) { st.ties += 6; st.happiness += 2; },
          trace: 'auntieGift'
        },
        {
          id: 'chat', zh: '站着聊两句', en: 'Chat for a minute',
          zhResult: '她问你吃没吃，你说你吃了。',
          enResult: 'She asks if you have eaten. You say you have.',
          apply: function (st) { st.ties += 2; st.happiness += 3; },
          trace: null
        }
      ]
    },
    oldman: {
      id: 'oldman', zh: '对门的老头', en: 'The old man opposite',
      role: 'neighbour',
      minFloor: 1, maxFloor: 12,
      zhIntro: '他姓什么没人知道，但整层楼都知道他养了一盆三角梅。',
      enIntro: 'Nobody knows his surname, but the whole floor knows about his bougainvillea.',
      options: [
        {
          id: 'water', zh: '帮他浇花', en: 'Water his plant',
          zhResult: '他让你随便拿个苹果。你没拿。',
          enResult: 'He offers you an apple. You do not take it.',
          apply: function (st) { st.ties += 5; st.happiness += 4; },
          trace: 'plantPot'
        },
        {
          id: 'sit', zh: '陪他坐一会儿', en: 'Sit with him a while',
          zhResult: '他讲了两个你听不懂的本地话，你还是笑了。',
          enResult: 'He tells two stories in local dialect you do not follow. You smile anyway.',
          apply: function (st) { st.ties += 7; st.happiness += 6; st.knowledge += 1; },
          trace: null
        }
      ]
    },
    colleague: {
      id: 'colleague', zh: '同事', en: 'A colleague',
      role: 'work',
      minFloor: 1, maxFloor: 99,
      zhIntro: '你们在同一个办公室，但只有电梯里才说得上话。',
      enIntro: 'You share an office, and only ever speak in the lift.',
      options: [
        {
          id: 'lunch', zh: '喊他一起吃午饭', en: 'Ask him to lunch',
          zhResult: '他答应了。你们吃了一碗小面，谁都没提工作。',
          enResult: 'He says yes. You eat one bowl of noodles and never mention work.',
          apply: function (st) { st.ties += 4; st.happiness += 3; },
          trace: null
        },
        {
          id: 'helpwork', zh: '帮他顶个班', en: 'Cover his shift',
          zhResult: '他记住了。第二天他帮你带了早饭。',
          enResult: 'He remembers. Next day he brings you breakfast.',
          apply: function (st) { st.ties += 8; st.happiness -= 2; st.stamina -= 6; },
          trace: null
        }
      ]
    },
    relative: {
      id: 'relative', zh: '上门的亲戚', en: 'A relative at the door',
      role: 'family',
      minFloor: 1, maxFloor: 99,
      zhIntro: '她提着一袋橘子和一句「顺便来看看你」。',
      enIntro: 'She carries a bag of oranges and the words "I was passing by".',
      options: [
        {
          id: 'invite', zh: '请她进来坐', en: 'Invite her in',
          zhResult: '她在沙发上坐了三个小时，走的时候留下那袋橘子。',
          enResult: 'Three hours on your sofa. She leaves the oranges behind.',
          apply: function (st) { st.ties += 6; st.happiness += 2; st.money -= 120; },
          trace: 'orangeBag'
        },
        {
          id: 'refuse', zh: '说在忙，改天', en: 'Say you are busy, another time',
          zhResult: '她说好。门关上之后，屋子里安静得有点长。',
          enResult: 'She says sure. After the door closes, the room is quiet for a while.',
          apply: function (st) { st.ties -= 3; st.happiness -= 2; },
          trace: null
        }
      ]
    },
    child: {
      id: 'child', zh: '楼下的小孩', en: 'The kid downstairs',
      role: 'child',
      minFloor: 1, maxFloor: 6,
      zhIntro: '她比你小一轮，知道你的门牌号。',
      enIntro: 'She is a few years younger and knows your door number.',
      options: [
        {
          id: 'candy', zh: '给她一颗糖', en: 'Give her a sweet',
          zhResult: '她把糖含在嘴里，跑了。',
          enResult: 'She keeps it in her cheek and runs off.',
          apply: function (st) { st.ties += 4; st.happiness += 3; },
          trace: null
        },
        {
          id: 'homework', zh: '教她做功课', en: 'Help her with homework',
          zhResult: '半小时后她妈妈给你塞了两个包子。',
          enResult: 'Half an hour later her mother leaves two bao at your door.',
          apply: function (st) { st.ties += 6; st.knowledge += 3; st.happiness += 2; },
          trace: null
        }
      ]
    },
    landlord: {
      id: 'landlord', zh: '房东', en: 'The landlord',
      role: 'landlord',
      minFloor: 1, maxFloor: 99,
      zhIntro: '他上来的时候手里拎着收据。',
      enIntro: 'He comes up carrying a receipt.',
      options: [
        {
          id: 'ask', zh: '问能不能缓一个月', en: 'Ask to defer a month',
          zhResult: '他想了想，说下不为例。',
          enResult: 'He thinks about it, and says not to make a habit of it.',
          apply: function (st) { st.money += 800; st.ties -= 4; st.happiness -= 3; },
          trace: null
        },
        {
          id: 'pay', zh: '当场付清', en: 'Pay on the spot',
          zhResult: '他撕了收据就走了，一句多余的话都没有。',
          enResult: 'He tears off the receipt and leaves without another word.',
          apply: function (st) { st.money -= 800; st.ties += 1; },
          trace: null
        }
      ]
    }
  };

  /* ---------- 卡片物证（回应之后出现在房间里的东西） ---------- */
  var CARD_TRACES = {
    auntieGift: { zh: '嬢嬢送的两袋青菜', en: 'Two bags of greens from the auntie' },
    plantPot:   { zh: '三角梅盆栽', en: 'Bougainvillea in a pot' },
    orangeBag:  { zh: '亲戚留下的橘子', en: 'The oranges she left' }
  };

  /* ---------- 谁能出现 ---------- */
  /* 楼层是这里的核心变量，但要的是「梯度」不是「开关」：
   *   邻居和楼下的小孩受楼层限制（住得越高，就见不到人）；
   *   同事、亲戚、房东跟楼层无关（工作关系和血缘不看你住几楼）。
   * 所以住 28 楼依然有人上门，只是少了嬢嬢和小孩。
   * 这就是「住几楼」在社交上的体感 —— 和 traces 里的空椅子呼应。 */
  function candidatesFor(life) {
    var st = life.st;
    var fl = st.homeFloor || 1;
    var out = [];
    for (var k in PEOPLE) {
      if (!Object.prototype.hasOwnProperty.call(PEOPLE, k)) continue;
      var p = PEOPLE[k];
      if (fl < p.minFloor || fl > p.maxFloor) continue;

      /* 同事：得有工作 */
      if (p.role === 'work' && !st.job) continue;
      /* 亲戚：45 岁以后亲戚才上门得多 */
      if (p.role === 'family' && st.age < 22) continue;
      /* 小孩：没有孩子的时候不认识楼下的小孩 */
      if (p.role === 'child' && st.age < 8) continue;
      /* 房东：只有住租的才有房东 */
      if (p.role === 'landlord' && st.age < 18) continue;

      out.push(p);
    }
    return out;
  }

  /* ---------- 出牌：谁来了 ---------- */
  /* 确定性：由 state 派生，不随机。
   * 关系越好，越可能来「亲近的人」；关系越差，越可能是房东。 */
  function cardFor(life, lang) {
    var st = life.st;
    var cands = candidatesFor(life);
    if (!cands.length) return null;
    lang = lang || 'zh';

    /* 取翻译：i18n 层的 flat pack（人物id:字段）。
     * 找不到就退回中文源。 */
    function T(key, fallback) {
      try {
        var I = (typeof window !== 'undefined') ? window.CQI18N : null;
        if (I && I.t) {
          var v = I.t(key, lang);
          if (v) return v;
        }
      } catch (e) { /* i18n 未加载就退回源 */ }
      return fallback;
    }
    /* 中文用源文案，英文用源 en（i18n 包里没有 en，回退链会落到中文） */
    function pick(key, zh, en) {
      return lang === 'zh' ? zh : (lang === 'en' ? en : T(key, zh));
    }

    /* 按「谁该来了」排序，取第一个。
     * 排序键：关系值越低，越优先来「需要你处理的人」（房东/亲戚）；
     * 关系值越高，越优先来「亲近的人」（嬢嬢/老头/小孩）。 */
    var scored = cands.map(function (p) {
      var weight = st.ties;
      if (p.role === 'landlord') weight = 100 - st.ties;
      if (p.role === 'family') weight = 90 - st.ties;
      if (p.role === 'child') weight = st.ties;
      if (p.role === 'neighbour') weight = st.ties * 1.1;
      if (p.role === 'work') weight = st.ties * 0.9;
      return { p: p, w: weight + (p.minFloor * 0.01) };
    });
    scored.sort(function (a, b) { return b.w - a.w; });

    var idx = Math.min(scored.length - 1, Math.floor(st.age / 7) % scored.length);
    var p = scored[idx].p;

    return {
      person: p,
      zh: p.zh, en: p.en,
      /* 当前语言下的文案（zh/en 是源；ja/ko/es 走 i18n 包） */
      name: pick(p.id + ':name', p.zh, p.en),
      intro: pick(p.id + ':intro', p.zhIntro, p.enIntro),
      options: p.options.map(function (o) {
        return {
          id: o.id,
          text: pick(p.id + ':' + o.id + ':text', o.zh, o.en),
          result: pick(p.id + ':' + o.id + ':result', o.zhResult, o.enResult),
          trace: o.trace
        };
      }),
      /* 内部用：真正结算的函数不进 UI 层 */
      _apply: p.options.map(function (o) { return o.apply; }),
      _traces: p.options.map(function (o) { return o.trace; })
    };
  }

  /* ---------- 结算一次回应 ---------- */
  function resolve(card, optionIndex, life) {
    var st = life.st;
    var opt = card.options[optionIndex];
    if (!opt) return null;
    var apply = card._apply[optionIndex];
    if (apply) apply(st);
    var traceKey = card._traces[optionIndex];
    var tr = null;
    if (traceKey && CARD_TRACES[traceKey]) {
      tr = {
        key: traceKey,
        zh: CARD_TRACES[traceKey].zh,
        en: CARD_TRACES[traceKey].en
      };
    }
    return {
      optionId: opt.id,
      result: opt.result,
      trace: tr
    };
  }

  root.CQPEOPLE = {
    PEOPLE: PEOPLE,
    CARD_TRACES: CARD_TRACES,
    candidatesFor: candidatesFor,
    cardFor: cardFor,
    resolve: resolve
  };
})(typeof window !== 'undefined' ? window : this);
