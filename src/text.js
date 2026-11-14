/* 渝你有约 — P0 文本层
 *
 * 数值已经可信，质感来自文本。这个文件只管「怎么说」，
 * 不碰任何数值——所有判定条件都从规则层传进来。
 *
 * 设计原则：
 * 1. 一条人生只讲一个故事。结语必须指向这一生具体发生过的选择，
 *    而不是通用的鸡汤。
 * 2. 不美化。棒棒的一生不写成励志故事，程序员的三十年不写成奋斗史。
 * 3. 英文不是中文的直译。英文读者要能看懂重庆的地理感。
 * 4. 每段文案都要能被分享出去独立成立。
 */
(function (root) {
  'use strict';

  /* ---------- 职业结语 ---------- */
  /* 每个职业 2–3 个分支，按这辈子的实际境况挑选。 */
  var EPILOGUE_BY_JOB = {
    bangbang: [
      {
        when: function (st) { return st.bbApprentice; },
        titleZh: '最后一个师父', titleEn: 'The last master',
        zh: '你收的那个徒弟，现在自己带人扛货了。你没攒下钱，但你教会了两个人怎么在坡上站稳。',
        en: 'Your apprentice now crews his own loads. You saved no money, but you taught two people how to stand on a slope.'
      },
      {
        when: function (st) { return st.bbPersist; },
        titleZh: '扛到最后一趟', titleEn: 'The last load',
        zh: '你从二十几岁扛到六十几岁。这行当已经没人了，但你还认得朝天门每一条坡。',
        en: 'You carried from your twenties into your sixties. Nobody is left in the trade, but you still know every slope of Chaotianmen.'
      },
      {
        when: function (st) { return st.bbQuit; },
        titleZh: '换了个活法', titleEn: 'A different trade',
        zh: '你改开货车了。力气还在用，只是换了个价钱。',
        en: 'You switched to driving a truck. The strength is still there, only the price changed.'
      },
      {
        when: function () { return true; },
        titleZh: '一根竹棒', titleEn: 'A bamboo pole',
        zh: '你一辈子靠一根竹棒两条绳。城市把坡修成了电梯，但你的肩还记得。',
        en: 'A bamboo pole and two ropes. The city turned its slopes into lifts, but your shoulder still remembers.'
      }
    ],
    office: [
      {
        when: function (st) { return st.wealth > 65 && st.happiness < 48; },
        titleZh: '两套人生', titleEn: 'Two lives',
        zh: '你在江北的写字楼里做到了中层。工资条很体面，但你已经三年没在晚上八点前离开那栋楼。',
        en: 'You made it to middle management in a tower in Jiangbei. The payslip is respectable. You have not left the building before eight in three years.'
      },
      {
        when: function (st) { return st.knowledge > 72 && st.wealth > 55; },
        titleZh: '写字楼里的山', titleEn: 'A mountain in the office block',
        zh: '你在十八层待了二十年。这栋楼比很多山还高，你的工位比山顶高，但没人从这里看风景。',
        en: 'Twenty years on the eighteenth floor. This tower is taller than most mountains. Your desk is higher than the peak, but nobody looks out of the window.'
      },
      {
        when: function (st) { return st.livingDistrict !== '渝中' && st.livingUrban; },
        titleZh: '每天多走两站', titleEn: 'Two extra stops',
        zh: '你住在五公里外，每天多花一小时换一套便宜的房子。这笔账你算了三十年，还是划算。',
        en: 'You live five kilometres out and spend an extra hour a day on a cheaper flat. You did the arithmetic for thirty years. It still came out ahead.'
      },
      {
        when: function () { return true; },
        titleZh: '格子间', titleEn: 'The cubicle',
        zh: '你在空调房里坐了三十年。重庆的夏天和冬天都没进过这扇窗。',
        en: 'Thirty years in an air-conditioned room. Neither the Chongqing summer nor the Chongqing winter ever came through that window.'
      }
    ],
    teacher: [
      {
        when: function (st) { return st.children > 0 && st.ties > 65; },
        titleZh: '教室最后一排', titleEn: 'The back row',
        zh: '你教过的学生里，有一个每年过年给你发消息。你没教出什么名堂，但有人记得你。',
        en: 'One of your students still sends you a message every new year. You did not make anything of it, but someone remembers you.'
      },
      {
        when: function (st) { return st.knowledge > 70; },
        titleZh: '粉笔灰', titleEn: 'Chalk dust',
        zh: '你在这间教室讲完了一整本历史。城市换了三轮高层，操场变成了球场，你的课表没变。',
        en: 'You finished a whole history textbook in that classroom. The city replaced three rounds of towers and the field became a basketball court. Your timetable never changed.'
      },
      {
        when: function () { return true; },
        titleZh: '下课铃', titleEn: 'The bell',
        zh: '你按了三十年的下课铃。学生跑得比你快。',
        en: 'You rang the final bell for thirty years. The students always ran out faster than you did.'
      }
    ],
    nurse: [
      {
        when: function (st) { return st.health < 45; },
        titleZh: '夜班', titleEn: 'Night shift',
        zh: '你值了二十年的夜班。你的身体撑得住别人的病，撑不住自己的。',
        en: 'Twenty years of night shifts. Your body could hold up other people’s illness for longer than it could hold up your own.'
      },
      {
        when: function (st) { return st.ties > 68; },
        titleZh: '有人记得', titleEn: 'Someone remembers',
        zh: '有个病人出院时塞给你一袋自家煮的鸡蛋。你没要。',
        en: 'A patient pressed a bag of home-boiled eggs into your hands on discharge. You did not take them.'
      },
      {
        when: function () { return true; },
        titleZh: '走廊灯', titleEn: 'The corridor light',
        zh: '你在医院走廊的灯底下走过无数个凌晨。这座城市的坡再陡，也没有人半夜往山上跑。',
        en: 'You walked countless dawns under the corridor lights. This city has slopes steeper than anywhere else, but nobody runs uphill at three in the morning.'
      }
    ],
    factory: [
      {
        when: function (st) { return st.stamina < 40; },
        titleZh: '流水线上的手', titleEn: 'Hands on the line',
        zh: '你的手比脸先老。厂里换了新的自动化设备，你被留了下来，因为你懂怎么修那些老机器。',
        en: 'Your hands aged before your face did. The plant installed new automated lines and kept you on, because you know how to fix the old machines.'
      },
      {
        when: function (st) { return st.wealth > 50; },
        titleZh: '厂房顶上的家', titleEn: 'A home on the roof',
        zh: '你在厂区旁边的自建房住了一辈子。阳台能挂衣服，也能看见嘉陵江上晚班的船。',
        en: 'You lived your whole life in a self-built house beside the plant. The balcony holds laundry, and it also faces the night freighters on the Jialing.'
      },
      {
        when: function () { return true; },
        titleZh: '两班倒', titleEn: 'Two shifts',
        zh: '你上了三十年两班倒。最难的不是累，是白班下班时太阳正好照在你回家的坡上。',
        en: 'Thirty years of two-shift work. The hardest part was not the tiredness. It was coming off the day shift straight into the sun on your way up the slope home.'
      }
    ],
    driver: [
      {
        when: function (st) { return st.wealth > 55; },
        titleZh: '跑够本了', titleEn: 'The truck paid for itself',
        zh: '你跑了十二年车，把车钱跑回来了。现在你开自己的车，还是那条高速。',
        en: 'Twelve years of driving paid for the truck. Now it is your truck, and it is still the same expressway.'
      },
      {
        when: function () { return true; },
        titleZh: '方向盘', titleEn: 'The steering wheel',
        zh: '你的方向盘上有一层握出来的包浆。重庆的路没有一段是直的，包括去山下的那一段。',
        en: 'The steering wheel has worn to a shine under your hands. No stretch of road in Chongqing is straight, including the one that goes down the mountain.'
      }
    ],
    farmer: [
      {
        when: function (st) { return st.happiness > 60; },
        titleZh: '回得去', titleEn: 'You can go back',
        zh: '你在城里待了几年，还是回区县种地把房子修好了。别人问起，你说不算失败。',
        en: 'You spent a few years in the city and went back to the county to farm and fix the house. People ask. You say it was not a failure.'
      },
      {
        when: function () { return true; },
        titleZh: '坡上的地', titleEn: 'Land on the slope',
        zh: '你种了一辈子坡地。雨水顺着梯田往下走，每一级都不一样。',
        en: 'You farmed the slopes your whole life. Rain runs down the terraces, and every level of them is different.'
      }
    ],
    tech: [
      {
        when: function (st) { return st.wealth > 70; },
        titleZh: '很值钱', titleEn: 'Valuable',
        zh: '你的工资是当年同学的好几倍。你在群里看着他们聊孩子和社保，然后就不说话了。',
        en: 'Your salary is several times what your classmates earn. You watch them talk about school fees and pensions in the group chat, then stop typing.'
      },
      {
        when: function () { return true; },
        titleZh: '远程办公', titleEn: 'Remote work',
        zh: '你在二十六楼对着屏幕上班，从窗口能看到江。同事在两千公里外，你们都没去过朝天门。',
        en: 'You work on the twenty-sixth floor, facing a screen, with the river in the window. Your colleague is two thousand kilometres away. Neither of you has been to Chaotianmen.'
      }
    ],
    shop: [
      {
        when: function (st) { return st.risk && st.money < 0; },
        titleZh: '赔进去了', titleEn: 'It went wrong',
        zh: '你拿全部家当开了那个店，第一年就赔光了。你现在在别的地方打工，还是每天想着那件事。',
        en: 'You put everything into the shop and lost it all in the first year. You work somewhere else now and still think about it every day.'
      },
      {
        when: function (st) { return st.wealth > 55; },
        titleZh: '自己的招牌', titleEn: 'Your own sign',
        zh: '你在街边撑起一块招牌，二十年没挪过位置。整条街的人认得那块牌子。',
        en: 'You put up a sign on the street and never moved it in twenty years. The whole block knows that sign.'
      },
      {
        when: function () { return true; },
        titleZh: '收摊', titleEn: 'Closing up',
        zh: '你每天半夜收摊。重庆的夜市到两点才散，你比谁都清楚这条街什么时候安静。',
        en: 'You closed up at midnight every day. The night market here does not empty until two, so you know better than anyone when the street goes quiet.'
      }
    ],
    craft: [
      {
        when: function (st) { return st.knowledge > 60; },
        titleZh: '手上的活', titleEn: 'Work of the hands',
        zh: '你的活儿现在没人会了。你教了三个徒弟，走了一个，留了一个。',
        en: 'Nobody does your work now. You taught three apprentices. One left. One stayed.'
      },
      {
        when: function () { return true; },
        titleZh: '祖师爷', titleEn: 'The old way',
        zh: '你用的手法是老辈传下来的。工具换了三轮，手法没变。',
        en: 'Your technique came down from the old masters. The tools have been replaced three times over. The technique has not changed once.'
      }
    ],
    construction: [
      {
        when: function (st) { return st.health < 45; },
        titleZh: '腰不行了', titleEn: 'The back gives out',
        zh: '你的腰在四十岁那年就不行了。你在工地上扶着腰看年轻人爬架子。',
        en: 'Your back gave out at forty. You stand at the site with a hand on your hip, watching the young ones climb the scaffolding.'
      },
      {
        when: function () { return true; },
        titleZh: '楼上的活儿', titleEn: 'Work on the upper floors',
        zh: '你盖的楼现在都比你高。走在下面抬头看一眼，认得出哪栋是你干的。',
        en: 'The buildings you put up are all taller than you now. Look up from below and you can tell which ones were yours.'
      }
    ],
    courier: [
      {
        when: function () { return true; },
        titleZh: '最后一百米', titleEn: 'The last hundred metres',
        zh: '你在这一片跑了六年。电梯坏了的时候，别人等，你上去。',
        en: 'You ran this district for six years. When the lift is broken, everyone waits. You go up.'
      }
    ]
  };

  /* ---------- 通用兜底（按人生境况挑，而不是固定一条） ---------- */
  var GENERIC = [
    {
      when: function (st) { return st.wealth > 70 && st.happiness < 45; },
      titleZh: '有钱的陌生人', titleEn: 'A wealthy stranger',
      zh: '你赚到了钱。但这座城市这么大，你认识的人一共也没几个。',
      en: 'You made the money. But this city is enormous, and you only ever knew a handful of people.'
    },
    {
      when: function (st) { return st.ties > 72; },
      titleZh: '街坊都认得你', titleEn: 'The whole street knows you',
      zh: '你住了几十年的这条街，谁家的事你都知道。这就是你的资产。',
      en: 'On the street where you lived for decades, you know everyone\'s business. That is your fortune.'
    },
    {
      when: function (st) { return st.happiness > 70; },
      titleZh: '还行', titleEn: 'Not bad',
      zh: '你没大富大贵，但你也没恨过这座城市。',
      en: 'You never got rich. You never hated the city either.'
    },
    {
      when: function (st) { return st.selfRaised && st.knowledge > 55; },
      titleZh: '自己长大的孩子', titleEn: 'Raised by yourself',
      zh: '五岁那年你留在了老家。十来年后你一个人坐车进城来找爸妈，谁也没送。',
      en: 'At five you stayed behind in the village. A decade later you came to the city alone to find your parents. Nobody came with you.'
    },
    {
      when: function (st) { return st.soldFlat && st.happiness > 55; },
      titleZh: '回到坡下', titleEn: 'Back down the slope',
      zh: '七十岁那年你把房子卖了，搬回区县。房子没了，但你认得这儿的每一棵枇杷树。',
      en: 'At seventy you sold the flat and moved back to the county. The flat is gone. You still know every loquat tree here.'
    },
    {
      when: function (st) { return st.childWhere === 'away' && st.ties < 45; },
      titleZh: '他没回头', titleEn: 'He did not look back',
      zh: '孩子去了沿海，走的时候没让你送。你理解，但还是会想那趟车开走之后他有没有后悔。',
      en: 'Your child left for the coast and did not let you see him off. You understand. You still wonder whether he regretted it once the car pulled away.'
    },
    {
      when: function () { return true; },
      titleZh: '一辈子', titleEn: 'A lifetime',
      zh: '你在重庆活了一辈子。没传奇，也没被这座城市吃掉。',
      en: 'You lived a whole life in Chongqing. No legend, and the city did not eat you either.'
    }
  ];

  /* ---------- 事件文案：把机械事件写成人生片段 ---------- */
  /* kind 对应规则层 log 的 kind；ctx 传入上下文变量。 */
    /* 事件文案
   *
   * V1 改成「模板 + 变体」结构，这样才可翻译：
   *   tpl   模板，{name} 是占位符
   *   vars  变体：不同条件走不同模板（如有房/没房的婚礼）
   *   pick  选变体的条件函数
   *
   * 旧写法是 zh: function(ctx){...}，每个语言都要重写一遍逻辑，
   * 加第三门语言就变成三份几乎一样的代码。
   */
  var EVENT_TEXT = {
    /* 电梯坏了 */
    liftBroken: {
      tpl: {
        zh: '电梯坏了，你从{floor}楼爬上来。花了{trips}趟。',
        en: 'The lift broke. You walked up from floor {floor}. It took {trips} trips.'
      }
    },
    /* 房租吃掉了收入 */
    rentBurden: {
      tpl: {
        zh: '房租吃掉了你 {pct}% 的收入。你算了一遍，还是付了。',
        en: 'Rent takes {pct}% of your income. You did the arithmetic. You paid it anyway.'
      }
    },
    /* 搬家 */
    move: {
      tpl: {
        zh: '搬到了{district}。{note}',
        en: 'Moved to {districtEn}. {noteEn}'
      }
    },
    /* 降层 */
    downgrade: {
      tpl: {
        zh: '你从 {from} 楼搬到了 {to} 楼。视野没了，但撑得住。',
        en: 'You moved from floor {from} to floor {to}. The view is gone. The rent is bearable.'
      }
    },
    /* 累垮 */
    collapse: {
      tpl: {
        zh: '累垮了。你在楼梯间坐了很久，楼下有人在炒菜。',
        en: 'You broke down. You sat in the stairwell for a long time. Someone downstairs was cooking.'
      }
    },
    /* 欠债 */
    debt: {
      tpl: {
        zh: '你欠了很多钱。第一个月你不敢看余额。',
        en: 'You are deep in debt. The first month you did not check the balance.'
      }
    },
    /* 结婚 */
    marry: {
      vars: [
        {
          when: function (c) { return c.hasHome; },
          tpl: {
            zh: '你们在出租屋里摆了桌酒，来了十一桌人。',
            en: 'You set out a table in the rented flat. Eleven tables of guests came.'
          }
        },
        {
          when: function () { return true; },
          tpl: {
            zh: '你们领了证，没办酒。',
            en: 'You registered the marriage. No banquet.'
          }
        }
      ]
    },
    /* 生孩子 */
    child: {
      vars: [
        {
          when: function (c) { return c.boy; },
          tpl: {
            zh: '生了个儿子。你在医院走廊里抱着他，比想象中轻。',
            en: 'A son. You held him in the hospital corridor. Lighter than you expected.'
          }
        },
        {
          when: function () { return true; },
          tpl: {
            zh: '生了个女儿。你在医院走廊里抱着她，比想象中轻。',
            en: 'A daughter. You held her in the hospital corridor. Lighter than you expected.'
          }
        }
      ]
    },
    /* 孩子长大离开 */
    childGone: {
      tpl: {
        zh: '孩子已经不在这个城市了。你还留着那间最小的卧室。',
        en: 'Your child no longer lives in this city. You still keep the smallest bedroom.'
      }
    },
    /* 第一次在重庆见到爸妈 */
    reunion: {
      tpl: {
        zh: '第一次在重庆见到爸妈，他们又老了一岁。你带他们去吃了顿火锅。',
        en: 'The first time you saw your parents in Chongqing, they had aged a year. You took them out for hot pot.'
      }
    },
    /* 开始工作 */
    startJob: {
      tpl: {
        zh: '开始做{jobZh}。',
        en: 'You started work as {jobEn}.'
      }
    }
  };

  /* 模板渲染：把 {name} 换成 ctx 里的值 */
  function renderTpl(tpl, ctx) {
    if (!tpl) return '';
    return tpl.replace(/\{(\w+)\}/g, function (m, k) {
      var v = ctx ? ctx[k] : undefined;
      return v === undefined || v === null ? '' : String(v);
    });
  }

/* ---------- 楼层回声 ---------- */
  /* V1 补上最重要的一块：这一生「住几楼」的选择，必须在结语里回响。
   * 之前职业结语完全不看楼层——住 1 楼和住 24 楼读出来一模一样，
   * 那等于游戏最重要的一次选择没有后果。 */
  /* 楼层段落分三层：
   *   1) 空间层：住的地方本身长什么样（梯坎、江景、噪音）
   *   2) 身体层：这些年的楼梯对身体的收账
   *   3) 关系层：楼里的邻居、串门、孤独
   * 每层都按 st 的真实数值选，不编故事。 */

  var FLOOR_ECHO = {
    /* 梯坎层：住得低，但楼梯一样多——重庆最反直觉的地方 */
    L0: [
      {
        when: function (st) { return st.prof.floor <= 2 && st.prof && st.prof.extraStairs > 0; },
        zh: function (st) {
          return '你住' + st.prof.floor + '楼，楼下是另一个世界。' +
            '从单元门到街面还有' + st.prof.extraStairs + '级台阶，' +
            '每天上下两趟，膝盖记了四十年。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ', where the street is another world below. ' +
            'Another ' + st.prof.extraStairs + ' steps between your door and the pavement, twice a day, ' +
            'for forty years. Your knees kept the score.';
        }
      },
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼。' +
            '潮湿从墙根往上爬，冬天要烤火，' +
            '但出门就是街，没人管你几点回来。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + '. ' +
            'Damp climbed the wall from the skirting board, and you burned charcoal in winter — ' +
            'but the street was right there, and nobody minded when you came home.';
        }
      }
    ],

    /* 江边层 */
    L1: [
      {
        when: function (st) { return st.prof && st.prof.extraStairs > 2; },
        zh: function (st) {
          return '你住在江边吊脚楼，楼下是水。' +
            '半夜涨水，你听得出江水离你的床还有几级台阶。' +
            '从' + st.prof.floor + '楼下去看江，要走过自己家的地基。';
        },
        en: function (st) {
          return 'You lived in a stilt house over the river. You could hear the water ' +
            'and tell how many steps it was from your floor. To see the river from your own door, ' +
            'you walked past the footings of your own house.';
        }
      },
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在江边' + st.prof.floor + '楼。' +
            '货船过夜的时候，整条街都在响，你听了一年，' +
            '后来那声音变成了睡觉的一部分。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ' by the river. ' +
            'When the freighters passed at night the whole street shook. ' +
            'After a year you stopped hearing it, and then missed it.';
        }
      }
    ],

    /* 桥下层 */
    L2: [
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在桥下' + st.prof.floor + '楼。' +
            '车从头顶过，每隔一会儿就有一次震动，' +
            '你后来能靠震动判断是轻卡还是重卡。' +
            '晚上睡不着的时候，你数那声音。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ', under the bridge. ' +
            'Traffic passed overhead — every so often the floor trembled, and after a while ' +
            'you could tell a light truck from a loaded one. When you could not sleep, you counted.';
        }
      }
    ],

    /* 临街层 */
    L3: [
      {
        when: function (st) { return st.prof.floor <= 2; },
        zh: function (st) {
          return '你住在一楼，门口就是街。' +
            '你认识楼下每一家开门的，谁家的灯几点关你都知道。' +
            '你几乎没有一天是独自待着的——也不需要。';
        },
        en: function (st) {
          return 'You lived on the ground floor with the street at your door. ' +
            'You knew every shop downstairs and when each of them put out its lights. ' +
            'You were rarely alone, and never lonely.';
        }
      },
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在临街' + st.prof.floor + '楼。' +
            '楼下是店招，夜里亮到凌晨两点，' +
            '你睡在招牌的光里。好处是什么都买得到，' +
            '坏处是从来不知道外面是白天还是夜里。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ' above the shops. ' +
            'The signs burned until two in the morning and you slept inside their light. ' +
            'Everything was within reach; you just never knew if it was day outside.';
        }
      }
    ],

    /* 梯坎层：重庆的真正开始 */
    L4: [
      {
        when: function (st) { return st.prof && st.prof.extraStairs >= 8; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼，一栋没有电梯的老楼。' +
            '楼下是平地，街在更高的地方——回家是往下，' +
            '出门是往上。有人一辈子没爬过自己家楼栋的楼梯，' +
            '因为你住得高的时候，梯坎在你脚下。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ' of a walk-up with no lift. ' +
            'The flat was level; the street was higher. Coming home went down, going out went up. ' +
            'Some people never climbed their own stairwell, because the steps lay beneath them.';
        }
      },
      {
        when: function (st) { return st.prof && st.prof.extraStairs > 0; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼。' +
            '每天' + st.prof.extraStairs + '级台阶，在自己的楼里。' +
            '这些台阶不陡，但从不停止。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + '. ' +
            st.prof.extraStairs + ' steps a day, inside your own building. ' +
            'They were not steep. They just never stopped.';
        }
      },
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼。' +
            '楼道里的声控灯坏了三年，' +
            '你摸黑上楼的次数比谁都多。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + '. ' +
            'The motion-sensor light in the stairwell was broken for three years, ' +
            'and you climbed in the dark more than anyone.';
        }
      }
    ],

    /* 标准住宅层：多数人的一生 */
    L5: [
      {
        when: function (st) { return st.prof && st.prof.extraStairs <= 0 && st.stamina < 55; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼，有电梯。' +
            '不用爬楼的日子不多，到了后来，别的毛病开始一个一个冒出来。' +
            '电梯坏了的那天，你才发现自己已经很久没有走过自己家那几级台阶。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ', with a lift. ' +
            'There were few enough stairs to notice. Later, every other pain announced itself. ' +
            'The day the lift broke, you realised you had not climbed your own steps in years.';
        }
      },
      {
        when: function (st) { return st.prof && st.prof.extraStairs <= 0; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼，有电梯。' +
            '这是这座城市里最普通的一种生活：' +
            '不低不高，看不见江，也听不见江。' +
            '每天出门回家，进门出门，都有电梯等着。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ', with a lift. ' +
            'The most ordinary life in this city: neither low enough nor high enough to see the river ' +
            'or hear it. Every door you walked through had a lift waiting.';
        }
      },
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼。' +
            '楼道里永远有人在做饭的味道，' +
            '你闻着别人的饭吃了三十年。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + '. ' +
            'The stairwell always smelled of someone else cooking. ' +
            'You ate thirty years of other people\'s dinners by smell alone.';
        }
      }
    ],

    /* 塔楼层 */
    L6: [
      {
        when: function (st) { return st.prof && st.prof.extraStairs <= 0; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼的高层。' +
            '窗户对着江，游船从窗户下面过。' +
            '有人来做过客，站在窗前看了很久，说这房子该值很多钱。' +
            '你说嗯，然后去厨房洗碗。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ', high up. ' +
            'The window faced the river; cruise boats went past below it. ' +
            'A guest once stood at the glass for a long time and said the place must be worth a fortune. ' +
            'You said yes, and went to wash the dishes.';
        }
      },
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼。' +
            '风比地面大，晒得也更狠。' +
            '楼里没什么人，电梯里遇不到邻居。' +
            '你学会了在电梯里跟人点头，但不搭话。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + '. ' +
            'The wind was stronger up here and the sun harder. ' +
            'There was nobody about; you met no one in the lift. ' +
            'You learned to nod at people in the lift and say nothing more.';
        }
      }
    ],

    /* 顶层 */
    L7: [
      {
        when: function () { return true; },
        zh: function (st) {
          return '你住在' + st.prof.floor + '楼，' + (st.home && st.home.zh ? st.home.zh : '顶层') + '。' +
            '整座城市的灯在你脚下。' +
            '风从江上来，夏天热，冬天冷。' +
            '这层楼只有你一户，楼梯从来没响过——' +
            '除了你回来的那一次。';
        },
        en: function (st) {
          return 'You lived on floor ' + st.prof.floor + ', at the top. ' +
            'Every light in the city lay below you. ' +
            'The wind came off the river: hot in summer, cold in winter. ' +
            'You were the only household on the floor, and the stairwell never sounded — ' +
            'except for the times you came home.';
        }
      }
    ]
  };

  /* 楼层的身体收账：楼梯对健康的长期影响 */
  function stairToll(st) {
    if (!st.prof) return null;
    var n = st.prof.totalStairs;
    if (!n || n < 100) return null;
    var years = Math.max(1, st.finalAge - 20);
    if (n < 2000) return null;
    if (st.health < 45) {
      return {
        zh: '爬了大约' + Math.round(n * years / 10000) + '万级台阶。' +
          '你的膝盖比同龄人差，医生说是磨损，不是别的。',
        en: 'Roughly ' + Math.round(n * years / 10000) + '0,000 steps climbed. ' +
          'Your knees gave out years before your peers did. The doctor called it wear, not anything else.'
      };
    }
    if (st.ties < 42) {
      return {
        zh: '爬了大约' + Math.round(n * years / 10000) + '万级台阶。' +
          '你的身体还行，但这些年你很少上楼，' +
          '楼上的邻居换了几茬，你一个也不认识。',
        en: 'Roughly ' + Math.round(n * years / 10000) + '0,000 steps climbed. ' +
          'Your body held up, but you went up those stairs so rarely that the neighbours above ' +
          'turned over several times and you knew none of them.'
      };
    }
    return {
      zh: '爬了大约' + Math.round(n * years / 10000) + '万级台阶。' +
        '你的身体比大多数同龄人好——' +
        '在重庆，楼层是可以换命的。',
      en: 'Roughly ' + Math.round(n * years / 10000) + '0,000 steps climbed. ' +
        'Your body outlasted most of your generation. In Chongqing, the floor you choose is a kind of fate.'
    };
  }

  /* 楼层关系的收账：邻居与串门 */
  function neighbourToll(st) {
    if (!st.prof) return null;
    if (st.ties >= 66 && st.prof.extraStairs > 0) {
      return {
        zh: '楼梯上碰面的次数比你想的多。' +
          '对门的人借过你的盐，你还过他一把伞。' +
          '这种交情不会写进任何证件，但它撑住了你后来的很多年。',
        en: 'You met the neighbours on the stairs more often than you expected. ' +
          'The family opposite borrowed salt; you lent them an umbrella. ' +
          'Nothing of it is written down anywhere, and it held you up for years afterwards.'
      };
    }
    if (st.ties < 40 && st.prof.extraStairs <= 0 && st.prof.floor > 8) {
      return {
        zh: '你住得高，电梯里碰不到人，' +
          '楼里也没有人敲门。' +
          '你过了很多年没有人问过你今天怎么样。',
        en: 'You lived high enough that the lift stayed empty and nobody knocked. ' +
          'You went a long stretch without anyone asking how your day had been.'
      };
    }
    return null;
  }

  /* ---------- 组合结语：职业 + 楼层 ---------- */
  /* 结语不再是一段话，而是一到三段：
   *   段一：职业（这段人生的主要身份）
   *   段二：楼层（那个选择的结果）
   *   段三：身体 / 关系的收账（可选）
   * 分享出去的卡片才是完整的一生。 */
  /* ---------- 语言 ---------- */
  /* 文本层的语言状态：默认 en。UI 切换语言时同步改这里。 */
  var LANG = 'en';

  function setLang(l) { LANG = l || 'en'; }
  function lang() { return LANG; }

  /* 取翻译包的条目（找不到就回退到英文） */
  function packEntry(id) {
    /* 翻译包由 i18n.js 统一收集到 CQI18N.PACKS。
     * 回退链在 i18n.js 里定义（ja→en、ko→en、es→en）。 */
    var packs = (root.CQI18N && root.CQI18N.PACKS) || {};
    var chain = (root.CQI18N && root.CQI18N.FALLBACK && root.CQI18N.FALLBACK[LANG]) ||
                (LANG === 'zh' ? ['zh', 'en'] : [LANG, 'en']);
    for (var i = 0; i < chain.length; i++) {
      var p = packs[chain[i]];
      if (p && p[id]) return p[id];
    }
    return null;
  }

  /* 结语条目 id：按职业/通用/楼层推导 */
  function epilogueId(listName, key, idx) {
    return listName + ':' + key + ':' + idx;
  }

  function composeEpilogue(st, langCode) {
    if (langCode) LANG = langCode;
    var base = pickEpilogue(st);
    var paras = [];
    paras.push({ zh: base.zh, en: base.en });

    var layer = st.prof && st.prof.layer;
    var fl = layer && FLOOR_ECHO[layer];
    if (fl) {
      for (var i = 0; i < fl.length; i++) {
        if (fl[i].when(st)) {
          paras.push({ zh: fl[i].zh(st), en: fl[i].en(st) });
          break;
        }
      }
    }
    var toll = stairToll(st);
    if (toll) paras.push({ zh: toll.zh, en: toll.en });
    var nb = neighbourToll(st);
    if (nb) paras.push({ zh: nb.zh, en: nb.en });

    /* 翻译包接管：把每个段落按 id 翻成目标语言。
     * 结构：
     *   段一 = 职业结语（job:<职业>:<序号> 或 generic:<序号>）
     *   段二 = 楼层回声（floor:<层>:<序号>）
     * 找不到翻译就保留英文，绝不显示中文。 */
    var out = {
      titleZh: base.titleZh, titleEn: base.titleEn,
      zh: paras.map(function (p) { return p.zh; }).join('\n\n'),
      en: paras.map(function (p) { return p.en; }).join('\n\n'),
      paras: paras,
      title: base.titleZh,
      lang: LANG
    };

    if (LANG !== 'zh' && LANG !== 'en') {
      var ids = epilogueIdsFor(st);
      var trs = [];
      var trTitles = [];
      /* 翻译文本里的占位符要替换：
       * {floor} → 实际楼层，{stairs} → 实际爬楼数。
       * 源文（zh/en）里这些是函数插值，翻译包里是模板字符串。 */
      var tctx = {
        floor: st.prof ? st.prof.floor : (st.homeFloor || ''),
        stairs: st.prof ? st.prof.extraStairs : 0
      };
      for (var k = 0; k < ids.length; k++) {
        var e = packEntry(ids[k]);
        if (!e) continue;
        trs.push(renderTpl(e.body, tctx));
        if (e.title) trTitles.push(e.title);
      }
      if (trs.length) {
        out[LANG] = trs.join('\n\n');
        out.title = trTitles[0] || out.titleEn;
      }
      // 标题也按语言翻
      var tE = packEntry(ids[0]);
      if (tE && tE.title) out[LANG + 'Title'] = tE.title;
    } else if (LANG === 'zh') {
      out.title = base.titleZh;
    } else {
      out.title = base.titleEn;
    }
    return out;
  }

  /* 算出这条人生对应的翻译 id 序列（顺序与 paras 一致） */
  function epilogueIdsFor(st) {
    var ids = [];
    /* 这一段必须和 pickEpilogue 完全一致，
     * 否则算出来的翻译 id 会指向另一条结语，
     * 表现为「某些人生只有一段结语」或「翻出来是别的话」。
     * pickEpilogue 的规则：
     *   1. 有职业且职业有匹配分支 → 用它
     *   2. 职业列表存在但一个 when() 都没命中 → 走通用
     *   3. 通用里按 when() 依次匹配
     */
    var list = null, key = null;
    if (st.job && st.job.id && EPILOGUE_BY_JOB[st.job.id]) {
      list = EPILOGUE_BY_JOB[st.job.id];
      key = st.job.id;
    }
    var idx = -1;
    if (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].when(st)) { idx = i; break; }
      }
    }
    if (idx >= 0) {
      ids.push(epilogueId('job', key, idx));
    } else {
      idx = -1;
      for (var j = 0; j < GENERIC.length; j++) {
        if (GENERIC[j].when(st)) { idx = j; break; }
      }
      if (idx < 0) idx = GENERIC.length - 1;
      ids.push('generic:' + idx);
    }
    // 楼层回声
    var layer = st.prof && st.prof.layer;
    var fl = layer && FLOOR_ECHO[layer];
    if (fl) {
      for (var m = 0; m < fl.length; m++) {
        if (fl[m].when(st)) { ids.push('floor:' + layer + ':' + m); break; }
      }
    }
    return ids;
  }

  /* ---------- 挑选结语 ---------- */
  /* 规则：先按职业找，职业没有合适的再走通用；职业内按 when() 依次匹配。 */
  function pickEpilogue(st) {
    var list = null;
    if (st.job && st.job.id && EPILOGUE_BY_JOB[st.job.id]) {
      list = EPILOGUE_BY_JOB[st.job.id];
    }
    if (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].when(st)) return list[i];
      }
    }
    for (var j = 0; j < GENERIC.length; j++) {
      if (GENERIC[j].when(st)) return GENERIC[j];
    }
    return GENERIC[GENERIC.length - 1];
  }

  /* ---------- 事件文案 ---------- */
  function eventText(kind, ctx) {
    var e = EVENT_TEXT[kind];
    if (!e) return null;
    var c = ctx || {};
    var entry = e;
    if (e.vars) {
      for (var i = 0; i < e.vars.length; i++) {
        if (e.vars[i].when(c)) { entry = e.vars[i]; break; }
      }
    }
    var tpl = entry.tpl || {};
    return { zh: renderTpl(tpl.zh, c), en: renderTpl(tpl.en, c) };
  }

  /* 列出所有源结语的 id（不含翻译）。
   * 用途：测试用它检查翻译包是否覆盖了每一个分支。
   * 漏翻译的症状很隐蔽——某些人生会少一段结语。 */
  function allEpilogueIds() {
    var ids = [];
    for (var job in EPILOGUE_BY_JOB) {
      if (!Object.prototype.hasOwnProperty.call(EPILOGUE_BY_JOB, job)) continue;
      var list = EPILOGUE_BY_JOB[job];
      for (var i = 0; i < list.length; i++) ids.push('job:' + job + ':' + i);
    }
    for (var g = 0; g < GENERIC.length; g++) ids.push('generic:' + g);
    for (var layer in FLOOR_ECHO) {
      if (!Object.prototype.hasOwnProperty.call(FLOOR_ECHO, layer)) continue;
      var fl = FLOOR_ECHO[layer];
      for (var m = 0; m < fl.length; m++) ids.push('floor:' + layer + ':' + m);
    }
    return ids;
  }

  root.CQTEXT = {
    EPILOGUE_BY_JOB: EPILOGUE_BY_JOB,
    GENERIC: GENERIC,
    EVENT_TEXT: EVENT_TEXT,
    pickEpilogue: pickEpilogue,
    composeEpilogue: composeEpilogue,
    FLOOR_ECHO: FLOOR_ECHO,
    eventText: eventText,
    renderTpl: renderTpl,
    setLang: setLang,
    lang: lang,
    epilogueIdsFor: epilogueIdsFor,
    packEntry: packEntry,
    allEpilogueIds: allEpilogueIds
  };
})(typeof window !== 'undefined' ? window : globalThis);
