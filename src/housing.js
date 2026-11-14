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
      src: '形态归纳：重庆沿江干打棚、吊脚楼普遍形态（沿江低层住区）',
      srcEn: 'Pattern summary: the widespread stilt-house form along the Chongqing riverbank.'
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
      src: '形态归纳：1953–1957 一五计划苏援项目苏式楼/筒子楼形态（赫鲁晓夫楼）',
      srcEn: 'Pattern summary: Soviet-aid projects of the First Five-Year Plan, 1953-1957 - Soviet blocks and corridor dormitories.'
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
      src: '形态归纳：1950–1960 年代重庆工厂宿舍（工人新村：钢花村、模范村、嘉陵村等）形态',
      srcEn: 'Pattern summary: factory dormitory compounds of the 1950s-60s (workers\' villages: Ganghuacun, Mofancun, Jialingcun and others).'
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
      src: '形态归纳：重庆 2000 年底前建成的城镇老旧小区普遍形态（依山而建、梯坎密集、一楼高出街面数十米）',
      srcEn: 'Pattern summary: pre-2000 urban housing compounds across Chongqing - built along the slope, dense with stairs, first floors tens of metres above the street.'
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
      src: '形态归纳：三峡库区移民统建房安置小区形态（1990s–2000s 集中建设）',
      srcEn: 'Pattern summary: resettlement housing for Three Gorges reservoir migrants, mass-built from the 1990s to the 2000s.'
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
      src: '形态归纳：2000 年后重庆商品房与棚改安置房高层形态',
      srcEn: 'Pattern summary: post-2000 commodity housing and redeveloped high-rises across Chongqing.'
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
      noteZh: '重庆的母城。2000 年前建成的老旧小区占住宅总面积四成以上，一栋楼里塞着几种年代的人生。',
      noteEn: 'The mother city. Over 40% of its housing predates 2000 — several eras of life packed into one compound.'
    },
    '两江新区': {
      tier: 'core', forms: [['newtower', 60], ['oldslab', 25], ['workers', 15]],
      noteZh: '新区。名字才用了几十年，楼是新的，人是新的，坡也还是那么陡。',
      noteEn: 'A new district with a new name, new towers and new arrivals — and exactly the same slopes.'
    },
    '沙坪坝': {
      tier: 'core', forms: [['oldslab', 42], ['workers', 26], ['newtower', 20], ['soviet', 12]],
      noteZh: '大学城在山上，学生比老邻居还多。磁器口一带的梯坎是重庆最陡的那种。',
      noteEn: 'A university town on the hill, where students outnumber the old neighbours.'
    },
    '九龙坡': {
      tier: 'core', forms: [['workers', 38], ['oldslab', 32], ['newtower', 20], ['soviet', 10]],
      noteZh: '厂区多。建设厂、空压厂、二钢厂的宿舍楼一片挨一片，走路容易迷路。',
      noteEn: 'Factory country. Rows of company housing so alike that visitors get lost in them.'
    },
    '巴南': {
      tier: 'core', forms: [['newtower', 45], ['oldslab', 35], ['workers', 20]],
      noteZh: '主城往南第一站，渝南大道两边全是新盘。鱼洞的老街还在，但人已经换了一茬。',
      noteEn: 'The first stop south of the core. New developments line the avenue; the old street is still there with new faces.'
    },
    '南岸': {
      tier: 'core', forms: [['oldslab', 38], ['workers', 30], ['newtower', 22], ['stilt', 10]],
      noteZh: '长江南岸。铜元局的家属区还在，弹子石的老码头也还在——一个靠山，一个靠江。',
      noteEn: 'South of the Yangtze. The Tongyuanju workers\' compound and the old wharf at Danzishi: one against the hill, one against the river.'
    },
    '北碚': {
      tier: 'core', forms: [['oldslab', 40], ['newtower', 28], ['soviet', 18], ['workers', 14]],
      noteZh: '两江半岛的尖端。抗战时陪都的腹地，西南大学的老楼和山一样高。',
      noteEn: 'The tip of the peninsula. Wartime capital country — the old university buildings stand as high as the hills.'
    },
    '大渡口': {
      tier: 'core', forms: [['workers', 42], ['oldslab', 33], ['soviet', 15], ['newtower', 10]],
      noteZh: '钢铁厂区。钢花路的红砖房曾经是西南最大的军工基地宿舍。',
      noteEn: 'Steel town. The red-brick rows on Ganghua Road once housed the southwest\'s largest defence workforce.'
    },
    '合川': {
      tier: 'core', forms: [['oldslab', 38], ['newtower', 30], ['workers', 18], ['resettlement', 14]],
      noteZh: '嘉陵江、涪江、渠江三江汇流。钓鱼城还在山上看着这座城。',
      noteEn: 'Three rivers meet here, and the old fortress still watches over the town from the hill.'
    },
    '涪陵': {
      tier: 'core', forms: [['oldslab', 36], ['resettlement', 26], ['newtower', 24], ['workers', 14]],
      noteZh: '乌江和长江交汇。页岩气让这个地方突然富裕，也突然陌生。',
      noteEn: 'Where the Wu joins the Yangtze. Shale gas made it rich, and suddenly unrecognisable.'
    },
    '永川': {
      tier: 'core', forms: [['newtower', 36], ['oldslab', 34], ['workers', 18], ['resettlement', 12]],
      noteZh: '主城往西的门户。茶山竹海在边上，但多数人一辈子在厂里和工地上过。',
      noteEn: 'The western gateway. Tea hills at the edge — but most lives are spent on factory floors and building sites.'
    },
    '江津': {
      tier: 'core', forms: [['oldslab', 34], ['newtower', 30], ['soviet', 20], ['workers', 16]],
      noteZh: '津南片区曾经是重慶的长寿之乡。1950 年代这里就是干打棚的天下。',
      noteEn: 'Once the tobacco capital of the region — and in the 1950s, the home of hundreds of thousands of timber-framed houses.'
    },
    '长寿': {
      tier: 'core', forms: [['resettlement', 34], ['oldslab', 32], ['newtower', 22], ['workers', 12]],
      noteZh: '长江边上的化工城。1958 年围湖造田，围出来的新城和老城隔着水。',
      noteEn: 'A chemical city on the Yangtze. The new town reclaimed from the lake in 1958 still faces the old one across the water.'
    },
    '綦江': {
      tier: 'core', forms: [['oldslab', 38], ['resettlement', 28], ['workers', 20], ['newtower', 14]],
      noteZh: '渝南。产煤，也产煤矸石。街边一整排的平房是矿工和家属的。',
      noteEn: 'Coal country south of the city. The long low terraces along the road housed miners and their families.'
    },
    '铜梁': {
      tier: 'core', forms: [['oldslab', 36], ['newtower', 30], ['resettlement', 20], ['workers', 14]],
      noteZh: '铜梁在大足与大足之间不遥远，挨着永川。哪里都是坡，只是坡的方向不同。',
      noteEn: 'Between Dazu and Yongchuan. Every place here is a slope; only the direction differs.'
    },
    '南川': {
      tier: 'core', forms: [['oldslab', 34], ['resettlement', 26], ['newtower', 26], ['stilt', 14]],
      noteZh: '南平、兴隆一带的老房子，是山地民居改的。稻田在坡上，房子在坡上，人在坡上。',
      noteEn: 'Old houses around Nanping and Xinglong are converted mountain dwellings — paddies, houses and people all on the slope.'
    },
    '璧山': {
      tier: 'core', forms: [['oldslab', 36], ['newtower', 34], ['workers', 18], ['resettlement', 12]],
      noteZh: '大学城西边。产青杠木的区县，家具厂多，最近被并进了主城。',
      noteEn: 'West of the university town. A furniture-making county recently folded into the core.'
    },
    '大足': {
      tier: 'core', forms: [['oldslab', 40], ['newtower', 26], ['resettlement', 20], ['workers', 14]],
      noteZh: '石刻在这里，但大多数人不知道刻的是什么，只知道门票多少钱。',
      noteEn: 'The rock carvings are here. Most people do not know what they depict — only what the ticket costs.'
    },
    '荣昌': {
      tier: 'core', forms: [['oldslab', 38], ['resettlement', 26], ['newtower', 22], ['workers', 14]],
      noteZh: '猪市口。荣昌猪曾被列为地方良种，八十年代县城家家养猪。',
      noteEn: 'Pig country. Rongchang pigs were once a prized local breed; in the 1980s nearly every household kept one.'
    },
    '潼南': {
      tier: 'core', forms: [['oldslab', 36], ['resettlement', 28], ['newtower', 24], ['workers', 12]],
      noteZh: '涪江边上的产棉区。民国时是川东产棉第一县，如今是重庆的北大门。',
      noteEn: 'Cotton country on the Fu River — once the region\'s leading cotton county, now the northern gateway to the city.'
    },

    /* ── 渝东北（三峡库区） ── */
    '万州': {
      tier: 'ne', forms: [['resettlement', 38], ['oldslab', 28], ['newtower', 22], ['stilt', 12]],
      noteZh: '库区最大的城市。1990 年代全淹老城，几十万人搬上山，搬成了「孤岛」。',
      noteEn: 'The largest city in the reservoir area. The old town was drowned whole; hundreds of thousands moved uphill into what became "islands".'
    },
    '开州': {
      tier: 'ne', forms: [['resettlement', 36], ['oldslab', 30], ['newtower', 20], ['stilt', 14]],
      noteZh: '平坝上的库区城。街上能看到从老城搬来的移民统建房，门牌号还是原来那条街的。',
      noteEn: 'A reservoir town on the flats. The resettlement blocks still carry street names from the old town.'
    },
    '云阳': {
      tier: 'ne', forms: [['stilt', 26], ['resettlement', 34], ['oldslab', 24], ['newtower', 16]],
      noteZh: '张飞庙、梯城。云阳老城全是梯坎，新城在山上，中间隔着一段谁也走不完的坡。',
      noteEn: 'The Sloping City. The old town was all stairs; the new town sits above it, separated by a climb nobody escapes.'
    },
    '奉节': {
      tier: 'ne', forms: [['resettlement', 40], ['stilt', 24], ['oldslab', 22], ['newtower', 14]],
      noteZh: '搬迁难度最大的县城。新城建在高山坡上，分成七八个点，绵延 27 公里。',
      noteEn: 'The hardest county to relocate. The new town was cut into seven or eight points spread over 27 kilometres of hillside.'
    },
    '巫山': {
      tier: 'ne', forms: [['stilt', 28], ['resettlement', 34], ['oldslab', 24], ['newtower', 14]],
      noteZh: '神女峰脚下。移民小区在半山腰，从窗口能看到长江在新县城下面拐弯。',
      noteEn: 'Below the Goddess Peak. The resettlement blocks sit halfway up the slope, looking down on the river bend.'
    },
    '巫溪': {
      tier: 'ne', forms: [['stilt', 30], ['oldslab', 32], ['resettlement', 24], ['newtower', 14]],
      noteZh: '大巴山深处。红池坝的夏天很凉快，冬天要烧煤。',
      noteEn: 'Deep in the Daba Mountains. Red Pond Dam is cool in summer; in winter you burn coal.'
    },
    '忠县': {
      tier: 'ne', forms: [['resettlement', 34], ['oldslab', 30], ['stilt', 20], ['newtower', 16]],
      noteZh: '忠州石刻在长江边。移民搬走后，老城的部分房子一直空着。',
      noteEn: 'The cliff carvings overlook the river. Some old-town houses have stood empty since the move.'
    },
    '梁平': {
      tier: 'ne', forms: [['oldslab', 38], ['resettlement', 26], ['newtower', 22], ['workers', 14]],
      noteZh: '重庆的坝子。竹海和柚子，农机厂和丝绸厂。',
      noteEn: 'The basin beyond Chongqing — bamboo sea, pomelos, a tractor plant and a silk mill.'
    },
    '城口': {
      tier: 'ne', forms: [['stilt', 30], ['oldslab', 34], ['resettlement', 22], ['newtower', 14]],
      noteZh: '渝陕交界。雪竹山的老房子是木架结构，坡上一户一户散着。',
      noteEn: 'On the Shaanxi border. The old houses are timber-framed, scattered one by one up the slope.'
    },
    '丰都': {
      tier: 'ne', forms: [['resettlement', 34], ['oldslab', 30], ['stilt', 22], ['newtower', 14]],
      noteZh: '鬼城。名山上的庙和长江边的移民小区，各有各的香火和各的难处。',
      noteEn: 'The Ghost City. The temples on the hill and the resettlement blocks by the river each keep their own kind of trouble.'
    },
    '垫江': {
      tier: 'ne', forms: [['oldslab', 36], ['resettlement', 26], ['newtower', 22], ['workers', 16]],
      noteZh: '牡丹之乡。垫江的棉花和榨油厂，养活了半个县城的工人新村。',
      noteEn: 'Peony country. Cotton and oil presses once kept half the county\'s workers\' village alive.'
    },

    /* ── 渝东南（武陵山区） ── */
    '黔江': {
      tier: 'se', forms: [['stilt', 30], ['oldslab', 32], ['resettlement', 24], ['newtower', 14]],
      noteZh: '挂壁公路的起点。峡谷里的村子挂在半山腰，一户一户错开，像长在岩壁上。',
      noteEn: 'Where the cliff-hugging road starts. Villages cling to the canyon wall, staggered like things growing on rock.'
    },
    '酉阳': {
      tier: 'se', forms: [['stilt', 32], ['oldslab', 30], ['resettlement', 24], ['newtower', 14]],
      noteZh: '桃花源。酉水河边的吊脚楼是最早的那批， UNESCO 认的是桃花源景区，不是这些房子。',
      noteEn: 'The Peach Blossom Spring. The stilt houses along the You River are older than the designation, and are not part of it.'
    },
    '秀山': {
      tier: 'se', forms: [['oldslab', 34], ['stilt', 28], ['resettlement', 24], ['newtower', 14]],
      noteZh: '边城。湖南和重庆在这里换班，边贸市场热闹得不像一个县。',
      noteEn: 'The Border Town. Hunan and Chongqing change shifts at the market here — too busy for a county seat.'
    },
    '彭水': {
      tier: 'se', forms: [['stilt', 30], ['oldslab', 30], ['resettlement', 26], ['newtower', 14]],
      noteZh: '阿依河和蚩尤九黎城。苗族吊脚楼和汉族土楼在一条街上挨着。',
      noteEn: 'Ayi River and the Chi You city. Miao stilt houses stand next to Han courtyard houses on the same street.'
    },
    '武隆': {
      tier: 'se', forms: [['stilt', 28], ['oldslab', 30], ['resettlement', 24], ['newtower', 18]],
      noteZh: '天生三桥、仙女山。仙女山是高原草原，武隆城区却是在沟壑里。',
      noteEn: 'Three Natural Bridges and Fairy Mountain. The mountain is alpine grassland; the town sits in the gullies below.'
    },
    '石柱': {
      tier: 'se', forms: [['stilt', 32], ['oldslab', 30], ['resettlement', 24], ['newtower', 14]],
      noteZh: '黄水高原的边缘。土家族的白马梯田就在旁边，石柱城反而在河谷里。',
      noteEn: 'Edge of the Huangshui plateau. Tujia terraces lie just above; the town itself sits down in the valley.'
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
    noteZh: '自己盖的房，三层，底层养牲口。跟工作隔着几十公里山，每天来回两个半小时。',
    noteEn: 'Your own three-storey house, livestock downstairs, and an hour and a half each way to work over the mountain.',
    src: '形态归纳：重庆区县农村自建房（砖混或土木，底层养殖、上层自住）普遍形态',
    srcEn: 'Pattern summary: self-built houses in Chongqing\'s rural counties - brick or timber, with livestock below and the family living above.'
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
