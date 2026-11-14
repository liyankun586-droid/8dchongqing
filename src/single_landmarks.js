/* 渝你有约 — 重庆地标数据集（站点版与单文件版共用同一份真源）
 *
 * ── 这份文件是唯一的真源 ──────────────────────────────────────
 * 历史上站点版 src/landmarks.js（22 条，只有英文 blurb）和
 * 单文件版 src/single_landmarks.js（10 条，有中/英/西三语）
 * 是两份互不相干的副本，且对同一地标给出的坐标互相矛盾。
 * 现在合并为一份，两边都从这里取。
 *
 * ── 坐标来源（一手核实） ────────────────────────────────────────
 * 标了 src: 'Qxxxxxxx' 的，坐标直接取自 Wikidata 该实体的 P625
 * （坐标声明），Q 号可点开复核。2026-11-14 逐条比对过。
 * 未标 src 的 9 条是街区/路段/观景点而非独立 POI，
 * 坐标取自其所属街区的公开坐标，误差在街区尺度内。
 *
 * ── 字段 ───────────────────────────────────────────────────────
 * id / en / zh   标识与中英文名
 * lat / lng      WGS84 经纬度（度，4 位小数）
 * tag            所属「8D 特征」标签
 * blurb          英文一句话（= blurbEn 的兜底）
 * blurbEn/Zh/Es  三语正文，缺则回退到 blurb
 * scene          纯代码山城的构造参数（喂给 city.js 的 makeBuilding）
 *   base{x,y,z,w,d,h}  世界坐标与包围盒（米）
 *   floors            层数（决定程序化窗户的行列）
 *   stilt             吊脚架空（洪崖洞那种架在江边的木构）
 *   neon              夜景灯色：amber / cyan / magenta / white / none
 *   riverSide         jialing / yangtze / both / none
 *   facade            立面材质
 *   landmark          是否重点地标（独立的近景和说明面板）
 */

(function (root) {
  'use strict';

  var LM = [
    {
      id: 'hongyadong',
      en: 'Hongya Cave',
      zh: '洪崖洞',
      lat: 29.5648, lng: 106.5742,
      src: 'Q32171478',
      tag: 'stacked-cliffs',
      blurbEn: 'Eleven storeys of timber built straight out of the cliff and over the Jialing River. Shops below, old street above, and the original that inspired a famous animation.',
      blurbZh: '嘉陵江边的吊脚楼群，十一层木构直接架在崖壁和江面上。楼下是巴渝老街，楼下还是千与千寻的原型。',
      blurbEs: 'Once(storeys) de madera construidos sobre la roca y el río Jialing. Tiendas abajo, calle vieja arriba, y el original que inspiró una película animada.',
      scene: { floors: 11, base: { x: -170, y: 90, z: 124, w: 70, d: 34, h: 46 },
               stilt: true, neon: 'amber', riverSide: 'jialing', facade: 'stilted-wood', landmark: true }
    },
    {
      id: 'liziba',
      en: 'Liziba Monorail Station',
      zh: '李子坝轻轨穿楼',
      lat: 29.5556, lng: 106.5338,
      src: 'Q11095941',
      tag: 'rail-through-building',
      blurbEn: 'Line 2 runs through the building between floors six and eight. Concourse, plant room, platform — 3,500 square metres a floor, with twenty centimetres of air between train and home.',
      blurbZh: '轻轨2号线从六到八楼穿楼而过。站厅在六楼、设备层在七楼、站台在八楼，每层约三千五百平方米，和楼体之间留着二十厘米。',
      blurbEs: 'La línea 2 atraviesa el edificio entre las plantas sexta y octava. Vestíbulo, sala de máquinas, andén: 3.500 m² por planta, con veinte centímetros entre el tren y la vivienda.',
      scene: { floors: 19, base: { x: -95, y: 180, z: -140, w: 32, d: 16, h: 62 },
               stilt: false, neon: 'cyan', riverSide: 'none', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'jiefangbei',
      en: 'Jiefangbei',
      zh: '解放碑',
      lat: 29.5572, lng: 106.577,
      src: 'Q13564560',
      tag: 'night-neon',
      blurbEn: 'The People\'s Liberation Monument, 27.5 metres tall. At its feet is the most expensive ground in Chongqing — the coordinate the whole city argues about.',
      blurbZh: '人民解放纪念碑，通高二十七点五米。脚下是重庆最贵的一圈路面，也是这座城市最硬的市中心坐标。',
      blurbEs: 'El Monumento a la Liberación del Pueblo, 27,5 metros. A sus pies, el suelo más caro de Chongqing: la coordenada por la que pelea toda la ciudad.',
      scene: { floors: 1, base: { x: -30, y: 180, z: -132, w: 12, d: 12, h: 27 },
               stilt: false, neon: 'white', riverSide: 'none', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'ciqikou',
      en: 'Ciqikou',
      zh: '磁器口',
      lat: 29.5793, lng: 106.4424,
      src: 'Q10566663',
      tag: 'old-town',
      blurbEn: 'An old wharf on the Jialing, and a porcelain trading post seventeen hundred years ago. Now: sour-and-spicy noodles, stone mills, and very long queues.',
      blurbZh: '嘉陵江边的老码头，一千七百年前是瓷器集散地。现在是酸辣粉、磨豆机和排队的人。',
      blurbEs: 'Un viejo muelle del Jialing y un puesto de porcelana hace mil setecientos años. Ahora: fideos picantes, molinos de piedra y colas larguísimas.',
      scene: { floors: 4, base: { x: -300, y: 30, z: 130, w: 100, d: 50, h: 14 },
               stilt: false, neon: 'amber', riverSide: 'jialing', facade: 'old-wood', landmark: true }
    },
    {
      id: 'qiansimen',
      en: 'Qiansimen Bridge',
      zh: '千厮门大桥',
      lat: 29.5608, lng: 106.5874,
      src: 'Q25352117',
      tag: 'river-bridge',
      blurbEn: 'A single-span steel truss cable-stayed bridge, 720 metres of main span in one go across the Yangtze. At night the light band is the most photographed thing in Chongqing.',
      blurbZh: '单跨钢桁梁斜拉桥，主跨七百二十米，一跨跨过长江。夜里灯带亮起来，是重庆最常被拍的一张照片。',
      blurbEs: 'Un puente atirantado de celosía de acero: 720 metros de vano principal de una sola vez sobre el Yangtsé. De noche, la cinta de luz es lo más fotografiado de Chongqing.',
      scene: { floors: 1, base: { x: -120, y: 30, z: 135, w: 110, d: 22, h: 56 },
               stilt: false, neon: 'white', riverSide: 'jialing', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'cableway',
      en: 'Yangtze River Cableway',
      zh: '长江索道',
      lat: 29.5575, lng: 106.5857,
      tag: 'multi-level-road',
      blurbEn: 'Opened in 1987, it crosses two kilometres of river from Xinhua Road to Shangxin Street. One car, one crossing, one view.',
      blurbZh: '一九八七年通车的过江索道，从新华路跨到上新街，单程一趟要过江两公里。',
      blurbEs: 'Abierto en 1987, cruza dos kilómetros de río desde Xinhua Road hasta Shangxin Street. Una cabina, un cruce, una vista.',
      scene: { floors: 1, base: { x: 200, y: 0, z: 168, w: 170, d: 14, h: 48 },
               stilt: false, neon: 'cyan', riverSide: 'yangtze', facade: 'modern-tower', landmark: true }
    },
    {
      id: 'chaotianmen',
      en: 'Chaotianmen Wharf',
      zh: '朝天门码头',
      lat: 29.5698, lng: 106.5841,
      src: 'Q11092528',
      tag: 'river-confluence',
      blurbEn: 'Where the Yangtze and the Jialing meet. In the 1980s this was the wharf of two hundred thousand porters; now it is a market that has been rebuilt several times.',
      blurbZh: '长江和嘉陵江在这里汇合。八十年代这儿是二十万棒棒的码头，现在是一个改了又改的市场。',
      blurbEs: 'Donde confluyen el Yangtsé y el Jialing. En los años 80 era el muelle de doscientos mil cargadores; hoy es un mercado rehecho varias veces.',
      scene: { floors: 4, base: { x: 20, y: 30, z: 140, w: 140, d: 70, h: 18 },
               stilt: true, neon: 'cyan', riverSide: 'both', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'eling2',
      en: 'Eling Testbed 2',
      zh: '鹅岭二厂',
      lat: 29.5497, lng: 106.5362,
      src: 'Q10567057',
      tag: 'hilltop-view',
      blurbEn: 'A Republican-era printing works turned creative park. The roof is one of the best-known overlooks in the city: the whole Yuzhong peninsula of roofs underneath you.',
      blurbZh: '民国印钞厂改成创意园。天台是重庆最出名的观景位之一，往下看是整个渝中半岛的楼顶。',
      blurbEs: 'Una imprenta de la era republicana convertida en parque creativo. La azotea es uno de los miradores más conocidos: bajo tus pies, todos los tejados de Yuzhong.',
      scene: { floors: 4, base: { x: 0, y: 210, z: -184, w: 100, d: 64, h: 22 },
               stilt: false, neon: 'amber', riverSide: 'none', facade: 'brick', landmark: true }
    },
    {
      id: 'shibati',
      en: 'Shibati',
      zh: '十八梯',
      lat: 29.5543, lng: 106.5691,
      src: 'Q32169345',
      tag: 'footpath-stairs',
      blurbEn: 'Two hundred stone steps climb the cliff between the upper and lower city, red lanterns and teahouses stacked terrace upon terrace.',
      blurbZh: '两百级石梯从上半城爬到下半城，红灯笼和茶馆一层压着一层，十八梯把重庆的落差拆成了可以走的台阶。',
      blurbEs: 'Doscientos escalones de piedra suben del barrio alto al bajo, faroles rojos y casas de té apiladas terraza sobre terraza: Shibati convierte el desnivel de Chongqing en gradas que se pueden caminar.',
      scene: { floors: 4, base: { x: -55, y: 175, z: -120, w: 150, d: 50, h: 30 },
               stilt: false, neon: 'amber', riverSide: 'none', facade: 'old-wood', landmark: true }
    },
    {
      id: 'shanchengxiang',
      en: 'Shanchengxiang',
      zh: '山城巷',
      lat: 29.5526, lng: 106.5646,
      tag: 'footpath-stairs',
      blurbEn: 'A sloping blue-stone lane climbs the city wall from the old wharf, a French chapel and walled courtyards hiding behind the parapet.',
      blurbZh: '一条青石板斜巷顺着城墙爬上去，旧码头、法国教堂和带院墙的院落都藏在矮墙后面，走到底就是江。',
      blurbEs: 'Un callejón de losas azules sube en pendiente pegado a la muralla, con el viejo embarcadero, una capilla francesa y patios amurallados escondidos tras el parapeto.',
      scene: { floors: 3, base: { x: -110, y: 145, z: -60, w: 130, d: 36, h: 24 },
               stilt: false, neon: 'amber', riverSide: 'none', facade: 'old-wood', landmark: true }
    },
    {
      id: 'xiahao',
      en: 'Xiahao Old Street',
      zh: '下浩老街',
      lat: 29.5605, lng: 106.5917,
      tag: 'stacked-cliffs',
      blurbEn: 'Cliff-hugging houses lean out over the Yangtze on timber stilts, the old lane dropping away in steps toward the water.',
      blurbZh: '一排吊脚木楼挂在长江边的崖壁上往外探，老街顺着台阶一路往下掉，尽头就是水面。',
      blurbEs: 'Casas de madera sobre pilotes se asoman al vacío sobre el Yangtsé y la calle vieja baja en escalones hasta el agua.',
      scene: { floors: 3, base: { x: 280, y: 60, z: 60, w: 150, d: 40, h: 18 },
               stilt: true, neon: 'amber', riverSide: 'yangtze', facade: 'old-wood', landmark: true }
    },
    {
      id: 'yikeshu',
      en: 'Nanshan One Tree',
      zh: '南山一棵树观景台',
      lat: 29.5569, lng: 106.5541,
      src: 'Q25110905',
      tag: 'hilltop-view',
      blurbEn: 'The Nanshan ridge lookout frames the whole peninsula in one sweep, river and bridges and towers stacked like a lit-up model.',
      blurbZh: '南山这道山脊上的观景台一眼就能框住整个半岛——两条江、几座桥、一片楼，像一张亮着灯的立体模型。',
      blurbEs: 'Desde el mirador de la cresta de Nanshan la península entera cabe en una sola mirada: dos ríos, los puentes y las torres, como una maqueta iluminada.',
      scene: { floors: 3, base: { x: 140, y: 150, z: -130, w: 42, d: 24, h: 20 },
               stilt: false, neon: 'white', riverSide: 'yangtze', facade: 'modern-tower', landmark: true }
    },
    {
      id: 'huangjuewan',
      en: 'Huangjuewan Interchange',
      zh: '黄桷湾立交',
      lat: 29.5877, lng: 106.6012,
      src: 'Q48903535',
      tag: 'multi-level-road',
      blurbEn: 'Five levels of ramps braid together on the Yangtze bank, the biggest interchange in the city, stacked so you can change road without touching ground.',
      blurbZh: '五层匝道在长江岸边编成一团，全城最大的立交，叠着叠着你换条路都不用落地。',
      blurbEs: 'Cinco niveles de rampas se entrelazan en la orilla del Yangtsé: el mayor intercambiador de la ciudad, apilado para que cambies de carretera sin tocar el suelo.',
      scene: { floors: 5, base: { x: 250, y: 60, z: 90, w: 240, d: 240, h: 28 },
               stilt: true, neon: 'white', riverSide: 'yangtze', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'liangjiang',
      en: 'Two Rivers Confluence',
      zh: '两江交汇',
      lat: 29.5747, lng: 106.5848,
      tag: 'river-confluence',
      blurbEn: 'Where green Jialing water slides under the brown Yangtze, the two currents shear against each other in a line you can actually see.',
      blurbZh: '嘉陵江的绿水从长江的浑水里穿过去，两股水在江心切出一条能看见的界线。',
      blurbEs: 'El agua verde del Jialing se desliza bajo el agua marrón del Yangtsé y ambas corrientes se cortan en una línea que se ve a simple vista.',
      scene: { floors: 2, base: { x: 90, y: 0, z: 175, w: 80, d: 44, h: 10 },
               stilt: true, neon: 'white', riverSide: 'both', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'yuzhong-night',
      en: 'Yuzhong Peninsula Night View',
      zh: '渝中半岛夜景',
      lat: 29.5626, lng: 106.5809,
      tag: 'modern-skyline',
      blurbEn: 'The whole peninsula blazes at once, a cliff of lit towers rising straight out of the water between two rivers.',
      blurbZh: '整座半岛一次亮完，一片灯火直接从江里长出来，夹在两条江之间。',
      blurbEs: 'Toda la península se enciende de golpe: un acantilado de torres iluminadas que emerge del agua entre dos ríos.',
      scene: { floors: 30, base: { x: -40, y: 140, z: -60, w: 260, d: 200, h: 150 },
               stilt: false, neon: 'magenta', riverSide: 'both', facade: 'glass-curtain', landmark: true }
    },
    {
      id: 'nanbinlu',
      en: 'Nanbin Road',
      zh: '南滨路',
      lat: 29.5413, lng: 106.5654,
      src: 'Q116258885',
      tag: 'multi-level-road',
      blurbEn: 'Twenty-five kilometres of waterfront road cling to the Yangtze southern cliff, galleries and tunnels stacked one road above another.',
      blurbZh: '二十五公里沿江公路贴着长江南岸的悬崖走，廊道和隧道一条压着一条叠在上面。',
      blurbEs: 'Veinticinco kilómetros de carretera ribereña se agarran a la cornisa del sur del Yangtsé, con galerías y túneles apilados un nivel sobre otro.',
      scene: { floors: 3, base: { x: 280, y: 30, z: 120, w: 300, d: 24, h: 16 },
               stilt: true, neon: 'cyan', riverSide: 'yangtze', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'nananlaojie',
      en: 'Nan’an Old Street',
      zh: '南岸老街',
      lat: 29.5826, lng: 106.5844,
      tag: 'old-town',
      blurbEn: 'Reconstructed treaty-port guild halls and arcades climb the slope above Danzishi, a lantern-lit old street stacked over the modern waterfront.',
      blurbZh: '重建的通商口岸会馆和骑楼爬在弹子石的坡上，灯笼照着的老街悬在现代江岸上头。',
      blurbEs: 'Las casas de guild del puerto de tratados, reconstruidas, y sus arcadas suben la ladera de Danzishi: una calle vieja iluminada por faroles, suspendida sobre la ribera moderna.',
      scene: { floors: 5, base: { x: 230, y: 90, z: 40, w: 170, d: 50, h: 20 },
               stilt: false, neon: 'amber', riverSide: 'yangtze', facade: 'old-wood', landmark: true }
    },
    {
      id: 'caiyuanba',
      en: 'Caiyuanba Bridge',
      zh: '菜园坝大桥',
      lat: 29.5431, lng: 106.5478,
      src: 'Q3396908',
      tag: 'river-bridge',
      blurbEn: 'The city first road-and-rail bridge splits in two: six lanes of traffic up top, the Line 3 monorail running the deck below.',
      blurbZh: '这座桥是公路铁路两用双层桥：上层六条车道跑汽车，下层桥面跑轻轨3号线。',
      blurbEs: 'El primer puente vial y ferroviario de la ciudad se parte en dos: seis carriles de coches arriba y la línea 3 del monorraíl bajo el tablero.',
      scene: { floors: 1, base: { x: -240, y: 0, z: 165, w: 190, d: 24, h: 52 },
               stilt: true, neon: 'white', riverSide: 'yangtze', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'baixiangju',
      en: 'Baixiangju Towers',
      zh: '白象居',
      lat: 29.5585, lng: 106.5814,
      tag: 'stacked-cliffs',
      blurbEn: 'Twenty-odd storeys of flats hang off a cliff without a single lift, their walkways linking balconies straight out over the Jialing.',
      blurbZh: '二十来层的老楼挂在崖壁上，一台电梯都没有，连廊把阳台直接搭到嘉陵江上面去。',
      blurbEs: 'Veinte y tantos pisos de viviendas cuelgan de la roca sin un solo ascensor, con pasarelas que unen balcones directamente sobre el Jialing.',
      scene: { floors: 24, base: { x: -80, y: 90, z: 110, w: 56, d: 20, h: 72 },
               stilt: true, neon: 'white', riverSide: 'jialing', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'egongyan',
      en: 'Egongyan Bridge',
      zh: '鹅公岩大桥',
      lat: 29.5233, lng: 106.5281,
      src: 'Q4170537',
      tag: 'river-bridge',
      blurbEn: 'A suspension span with a floating steel deck carries eight lanes across the Yangtze, its 600-metre centre span one of the city widest.',
      blurbZh: '一座悬索桥，钢桁梁是浮动的，八条车道横过长江，中间六百米的跨径是全城最宽的之一。',
      blurbEs: 'Un puente colgante con tablero de acero flotante lleva ocho carriles sobre el Yangtsé; sus 600 metros de vano central son de los más anchos de la ciudad.',
      scene: { floors: 1, base: { x: -330, y: 0, z: 160, w: 160, d: 22, h: 48 },
               stilt: true, neon: 'white', riverSide: 'yangtze', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'guanyinqiao',
      en: 'Guanyinqiao',
      zh: '观音桥',
      lat: 29.584, lng: 106.5416,
      src: 'Q13660598',
      tag: 'modern-skyline',
      blurbEn: 'The one flat district of the city, a level grid of malls, screens and glass towers where the mountain finally gives up.',
      blurbZh: '全城唯一一片平的，商场、大屏、玻璃楼齐齐整整排成网格——山到这里终于认输了。',
      blurbEs: 'El único distrito plano de la ciudad: una cuadrícula nivelada de centros comerciales, pantallas y torres de vidrio donde la montaña por fin se rinde.',
      scene: { floors: 24, base: { x: -300, y: 60, z: 90, w: 240, d: 200, h: 100 },
               stilt: false, neon: 'magenta', riverSide: 'none', facade: 'glass-curtain', landmark: true }
    },
    {
      id: 'lianglukou',
      en: 'Lianglukou',
      zh: '两路口',
      lat: 29.5548, lng: 106.5458,
      src: 'Q10871528',
      tag: 'multi-level-road',
      blurbEn: 'China longest escalator climbs 52.7 metres from the lower city up to the railway station, carrying feet between two halves of Chongqing.',
      blurbZh: '中国最长的自动扶梯，从下半城爬五十二点七米到火车站，把人从重庆的这一半送到另一半。',
      blurbEs: 'La escalera mecánica más larga de China sube 52,7 metros desde la ciudad baja hasta la estación de tren, llevando a la gente de una mitad de Chongqing a la otra.',
      scene: { floors: 12, base: { x: -140, y: 145, z: -70, w: 120, d: 100, h: 50 },
               stilt: true, neon: 'cyan', riverSide: 'none', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'nanshan',
      en: 'Nanshan Tree',
      zh: '南山一棵树',
      lat: 29.533, lng: 106.56,
      tag: 'hilltop-view',
      blurbEn: 'One tree on Nanshan hill, and beside it the most complete panorama of the Yuzhong peninsula: two rivers, the bridges, the towers, all in one view.',
      blurbZh: '南山顶上的一棵树，旁边是渝中半岛最完整的全景位。两江、桥、塔楼，全在一眼里。',
      blurbEs: 'Un árbol en la colina de Nanshan y, junto a él, el panorama más completo de la península de Yuzhong: dos ríos, los puentes, las torres, todo en una mirada.',
      scene: { floors: 3, base: { x: -70, y: 210, z: -220, w: 26, d: 26, h: 26 },
               stilt: false, neon: 'none', riverSide: 'none', facade: 'concrete-glass', landmark: true }
    },
    {
      id: 'huguang',
      en: 'Huguang Guild Hall',
      zh: '湖广会馆',
      lat: 29.5608, lng: 106.5835,
      src: 'Q16078575',
      tag: 'old-town',
      blurbEn: 'The guildhall for Guangdong, Hunan and Hubei, three centuries old. The opera stage still plays, and so does the television industry.',
      blurbZh: '广东、湖南、湖北三省的同乡会馆，三百多年了。戏楼还在演，山城棒棒军的片场也在这儿。',
      blurbEs: 'El gremio de Guangdong, Hunan y Hubei, con tres siglos. El teatro de ópera sigue en funciones, y con él la televisión.',
      scene: { floors: 3, base: { x: -100, y: 90, z: 150, w: 46, d: 36, h: 24 },
               stilt: false, neon: 'none', riverSide: 'none', facade: 'old-wood', landmark: true }
    }
  ];

  root.CQLANDMARKS = LM;
})(typeof window !== 'undefined' ? window : globalThis);
