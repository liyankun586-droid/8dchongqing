/* 渝你有约 — V1 翻译包：韩语
 *
 * 原则：
 * 1. 一条文案只用韩文、不与英文混排。
 * 2. 术语统一：棒棒=방방이（짐을 지는 사람）/ 朝天门=차오톈먼 / 梯坎=계단 / 火锅=화훼
 * 3. 没翻译的条目自动回退到英文（见 i18n.js 的 FALLBACK）。
 */
(function (root) {
  'use strict';

  root.CQI18N_PACK_KO = root.CQI18N_PACK_KO || {};

  root.CQI18N_PACK_KO = {
    /* ── 职业结语 ── */
    'job:bangbang:0': {
      title: '마지막 스승',
      body: '내가 가르친 제자가 이제는 혼자 짐을 싣는다. 돈은 남기지 못했지만, 비탈 위에서 발을 디디는 법을 두 사람에게 가르쳤다.'
    },
    'job:bangbang:1': {
      title: '마지막 짐',
      body: '스물한 살부터 예순여섯까지 이 일을웠다. 이제 이 업종에 남은 사람은 없지만, 나는 차오톈먼의 비탈 하나하나를 아직 안다.'
    },
    'job:bangbang:2': {
      title: '다른 일',
      body: '트럭 기사가 됐다. 힘은 여전히 쓰고 있다. 다만 값이 달라졌을 뿐이다.'
    },
    'job:bangbang:3': {
      title: '대나무 막대',
      body: '대나무 막대와 두 줄의 손수건. 이 도시는 비탈을 엘리베이터로 바꿨지만, 내 어깨는 그대로였다.'
    },

    'job:office:0': {
      title: '두 개의 삶',
      body: '강베이 타워의 중간 관리직까지 올랐다. 급여 명세는 체면이 서서 않았다. 3년 동안 8시 전에 건물을 나간 적이 없다.'
    },
    'job:office:1': {
      title: '오피스 빌의 산',
      body: '18층에서 20년. 이 타워는 대부분의 산보다 높다. 책상은 봉우리보다 위에 있지만, 아무도 창밖을 보지 않는다.'
    },
    'job:office:2': {
      title: '두 정거장',
      body: '5km 밖에서 살며 더 싼 집을 택하고 하루 한 시간을 더 쓴다. 30년 동안 그 계산을 반복했는데, 그래도 이득이었다.'
    },
    'job:office:3': {
      title: '칸막이 방',
      body: '에어컨이 있는 방에서 30년. 충칭의 여름도 겨울도 그 창문으로 들어온 적이 없다.'
    },

    'job:teacher:0': {
      title: '맨 뒷자리',
      body: '한 학생이 아직도 매년 새해에 메시지를 보낸다. 내가 대단한 일을 한 건 아니지만, 누군가는 기억한다.'
    },
    'job:teacher:1': {
      title: '분필가루',
      body: '그 교실에서 역사 교과서 하나를 끝냈다. 도시는 세 차례 타워를 갈아탔고, 그 교과서는 농구 코트가 됐다. 내 시간표는 변하지 않았다.'
    },
    'job:teacher:2': {
      title: '종소리',
      body: '30년간 마지막 종을 울렸다. 학생들은 늘 나보다 먼저 뛰어나갔다.'
    },

    'job:nurse:0': {
      title: '야간 근무',
      body: '20년의 야간 근무. 내 몸은 남의 병을 나보다 오래 버텼다.'
    },
    'job:nurse:1': {
      title: '기억하는 사람',
      body: '한 환자가 퇴원할 날 집에서 삶은 달걀 한 봉지를 내 손에 쥐어주었다. 나는 받지 않았다.'
    },
    'job:nurse:2': {
      title: '복도 조명',
      body: '셀 수 없는 새벽을 복도 조명 아래로 걸었다. 이 도시는 세상에서 가장 가파른 비탈이 있지만, 새벽 3시에 비탈을 오르는 사람은 없다.'
    },

    'job:factory:0': {
      title: '손',
      body: '얼굴보다 손이 먼저 늙었다. 공장은 새로운 자동 라인들을 넣었지만, 나는 남겼다. 낡은 기계 고치는 법을 아니까.'
    },
    'job:factory:1': {
      title: '지붕 위의 집',
      body: '공장 옆 자가용 집에서 평생을 살았다. 베란다에는 빨래가 걸려 있었고, 저녁엔 자링강의 화물선들을 마주했다.'
    },
    'job:factory:2': {
      title: '두 교대',
      body: '30년간 두 교대 근무. 가장 힘든 건 피곤함이 아니었다. 주간 근무를 마치고 돌아가는 비탈길의 햇빛이었다.'
    },

    'job:driver:0': {
      title: '트럭 값',
      body: '12년간 운전해서 트럭 값을 갚았다. 이제 그 트럭은 내 트럭이고, 노선은 여전히 같은 고속도로다.'
    },
    'job:driver:1': {
      title: '핸들',
      body: '핸들은 내 손 아래에서 빛을 내도록 닳았다. 충칭에는 직선 도로가 없다. 산을 내려가는 그 길까지.'
    },

    'job:farmer:0': {
      title: '익어',
      body: '산으로 돌아가 밭을 지었다. 밭도, 집도, 사람도, 전부 경사면 위에 있었다.'
    },
    'job:farmer:1': {
      title: '논 냄새',
      body: '아침에 물 소리에 깬다. 진흙은 발에 달라붙고, 나는 그 냄새를 기억하고 있었다.'
    },

    'job:tech:0': {
      title: '평생의 코드',
      body: '코드를 써서 세상을 지켰다. 누군가 그걸 사용했고, 누군가 그걸로 돈을 벌었다. 그게 내 것이기도 했다.'
    },
    'job:tech:1': {
      title: '같은 화면',
      body: '같은 화면 앞에 몇만 시간을. 화면 저편에 누가 있었는지는 알 필요 없다.'
    },

    'job:shop:0': {
      title: '성실한 해',
      body: '성실한 한 해가 나를 풀어줬다. 전부 걸었다. 전부 돌아왔다. 다시는 그렇지 않겠다고 맹세했다.'
    },
    'job:shop:1': {
      title: '간판',
      body: '내 간판은 작았다. 지나가다 멈추고, 또 지나갔다.'
    },

    'job:shop:2': {
      title: '문 닫기',
      body: '매일 자정 넘게 가게를 닫았습니다. 이 거리의 야시는 두 시가 넘어야 사람 발길이 끊깁니다. 어느 순간 거리가 조용해지는지 당신보다 잘 아는 사람은 없었습니다.'
    },
    'job:craft:0': {
      title: '물려받은 손',
      body: '내 손은 오래된 장인에게서 물려받았다. 도구는 세 번 바뀌었지만 손은 한 번도 바뀌지 않았다.'
    },
    'job:craft:1': {
      title: '내 값',
      body: '내 손에는 내 값이 있었다. 이 세상에서 그걸 가장 잘 아는 사람은 나였다.'
    },

    'job:construction:0': {
      title: '무릎',
      body: '돈은 빨리 들어왔고, 무릎은 먼저 망가졌다. 건설업의 모든 이야기는 계단 위에서 벌어진다.'
    },
    'job:construction:1': {
      title: '안전모',
      body: '안전모를 쓰고 새벽 6시에 현장으로. 머리 위 철골은 늘 내 머리보다 높은 곳에서 멈췄다.'
    },

    'job:courier:0': {
      title: '마지막 어깨',
      body: '방방이는 없어졌지만 어깨는 남았다. 이제는 택배를 옮긴다. 빠르지만, 걸을 수 있는 거리가 다르다.'
    },

    /* ── 通用结语 ── */
    'generic:0': {
      title: '모르는 부자',
      body: '돈은 벌었다. 하지만 이 도시는 너무 크고, 내가 아는 사람은 몇 명뿐이었다.'
    },
    'generic:1': {
      title: '골목 전체가 나를 안다',
      body: '수십 년 산 거리에서 모두의 사정을 안다. 그것이 내 fortune 이다.'
    },
    'generic:2': {
      title: '나쁘지 않았다',
      body: '부자는 되지 않았다. 이 도시를 싫어한 적도 없다.'
    },
    'generic:3': {
      title: '혼자 자란 사람',
      body: '다섯 살에 마을에 남았다. 십 년 뒤 혼자 도시로 가 부모를 찾았다. 아무도 함께 오지 않았다.'
    },
    'generic:4': {
      title: '비탈을 내려가',
      body: '일흔에 집을 팔고 현으로 돌아갔다. 집은 없다. 그래도 여기 감귤 나무는 하나씩 알고 있다.'
    },
    'generic:5': {
      title: '돌아보지 않았다',
      body: '자녀는 바닷가로 떠나며 문자를 보내지 않았다. 이해한다. 그래도 차가 떠나간 뒤 그가 후회했는지 가끔은 생각한다.'
    },
    'generic:6': {
      title: '평생',
      body: '충칭에서 한평생을 살았다. 전설은 되지 않았고, 이 도시에 먹히지도 않았다.'
    },

    /* ── 楼层回声 ── */
    'floor:L0:0': {
      body: '나는 {floor}층에 살았다. 길은 이미 다른 세계였다. 현관 밖까지 수 계단이 더 있었다. 하루에 두 번, 40년간 무릎이 그걸 기억했다.'
    },
    'floor:L0:1': {
      body: '나는 {floor}층에 살았다. 습기가 벽 밑에서부터 올라왔고, 겨울에는 불을 피웠다. 하지만 길은 바로 거기 있었고, 아무도 당신이 몇 시에 돌아오는지 신경 쓰지 않았다.'
    },
    'floor:L1:0': {
      body: '나는 강 위에 뜬 집에 살았다. 밑은 물이었다. 밤에 물이 오르면, 침대까지 몇 계단 남았는지 들었다. 자기 집의 기둥 사이를 지나야 강을 볼 수 있었다.'
    },
    'floor:L1:1': {
      body: '나는 강가 {floor}층에 살았다. 화물선이 지나가면 밤마다 골목이 울렸다. 그러다 보니 어느새 그 소리가 잠의 일부가 됐고, 나중에 그게 그리웠다.'
    },
    'floor:L2:0': {
      body: '나는 다리 아래 {floor}층에 살았다. 머리 위를 차가 지나가다 한 번씩 바닥이 떨렸다. 어느새 가벼운 트럭과 무거운 트럭을 구분할 수 있게 됐다. 잠이 안 오면 셌다.'
    },
    'floor:L3:0': {
      body: '나는 1층에 살았다. 문밖이 그대로 길이었다. 아래 가게들 불을 언제 끄는지 다 알고 있었다. 혼자였던 날은 거의 없었다 — 필요도 없었다.'
    },
    'floor:L3:1': {
      body: '나는 길가의 {floor}층에 살았다. 아래 간판은 새벽 2시까지 빛났다. 나는 간판 빛 속에서 잠들었다. 필요한 것은 모두 손 닿았지만, 밖이 낮인지 밤인지는 끝내 몰랐다.'
    },
    'floor:L4:0': {
      body: '엘리베이터 없는 {floor}층에 살았다. 아래는 평지였고 길은 더 위에 있었다. 집으로 가는 길은 내려가고, 나가면 올라간다. 자기 집 계단을 한 번도 오르지 않은 사람들도 있었다 — 내가 높은 층에 살았으니까.'
    },
    'floor:L4:1': {
      body: '나는 {floor}층에 살았다. 매일 {stairs}계단, 자기 건물 안에서. 급하지 않았다. 다만 멈추지 않았다.'
    },
    'floor:L4:2': {
      body: '나는 {floor}층에 살았다. 복도의 소리 감지 등이 3년째 고장이었고, 나는 누구보다 어둠 속에서 계단을 올랐다.'
    },
    'floor:L5:0': {
      body: '나는 {floor}층에 엘리베이터와 함께 살았다. 오를 계단수는 얼마 되지 않았다. 그 뒤로 다른 몸의 아픔들이 하나씩 나타나기 시작했다. 엘리베이터가 고장 난 날, 몇 년 만에 자기 집 계단을 오르는 걸 알았다.'
    },
    'floor:L5:1': {
      body: '나는 {floor}층에 엘리베이터와 함께 살았다. 이 도시에서 가장 평범한 삶: 높지도 낮지도 않아 강이 보이지도 들리지도 않는. 문을 나설 때마다 엘리베이터가 기다리고 있었다.'
    },
    'floor:L5:2': {
      body: '나는 {floor}층에 살았다. 복도는 언제나 누군가의 요리 냄새로 가득했다. 30년을 남의 밥 냄새로만 살았다.'
    },
    'floor:L6:0': {
      body: '나는 높은 {floor}층에 살았다. 창문은 강을 향했고 유람선이 아래로 지나갔다. 손님이 유리창 앞에 오래 서서 이 집은 값이 많이 하겠냐고 말했다. 나는 응, 하고 설거지를 했다.'
    },
    'floor:L6:1': {
      body: '나는 {floor}층에 살았다. 바닥보다 바람이 세고 햇볕도 더 뜨거웠다. 층에는 사람이 거의 없어 엘리베이터에서 이웃을 만나지 않았다. 엘리베이터에서 고개만 끄덕이는 법을 배웠다.'
    },
    'floor:L7:0': {
      body: '나는 최상층, {floor}층에 살았다. 도시의 모든 빛이 발밑에 있었다. 강에서 불어오는 바람이 여름은 뜨겁고 겨울은 춥다. 이 층에는 우리 집 하나뿐이었고, 계단에서 발소리가 난 적은 — 내가 돌아온 날뿐이었다.'
    }

  /* ---------- 界面零散文案 ---------- */
  };

  /* ---------- 楼型名（原型） ---------- */
  root.CQI18N_PACK_KO['home:Converted bunker room'] = { body: '반지하 개조실' };
  root.CQI18N_PACK_KO['home:Riverside stilt house'] = { body: '강변 툇마루 집' };
  root.CQI18N_PACK_KO['home:Under-the-bridge flat'] = { body: '고가 밑집' };
  root.CQI18N_PACK_KO['home:Shop below, home above'] = { body: '아래는 상점 위는 집' };
  root.CQI18N_PACK_KO['home:Stair-terrace block'] = { body: '계단 테라스 건물' };
  root.CQI18N_PACK_KO['home:Millennium block'] = { body: '밀레니엄 아파트' };
  root.CQI18N_PACK_KO['home:River-view tower'] = { body: '강이 보이는 타워' };
  root.CQI18N_PACK_KO['home:Top-floor penthouse'] = { body: '최상층 펜트하우스' };
  root.CQI18N_PACK_KO['home:High-rise walk-up'] = { body: '계단식 고층 건물' };

  /* ---------- 楼型名 ---------- */
  root.CQI18N_PACK_KO['home:Stilt house'] = { body: '툇마루 집' };
  root.CQI18N_PACK_KO['home:Soviet-style block'] = { body: '소련식 연립주택' };
  root.CQI18N_PACK_KO['home:Old residential block'] = { body: '노후 공공주택' };
  root.CQI18N_PACK_KO['home:Resettlement block'] = { body: '이주再建 주택' };
  root.CQI18N_PACK_KO['home:New tower block'] = { body: '신축 아파트' };
  root.CQI18N_PACK_KO['home:Self-built house'] = { body: '자기 집 짓기' };

  /* ---------- 垂直层 SEO 描述 ---------- */
  root.CQI18N_PACK_KO['seo:layer:L0'] = { body: '반지하. 벽 밑에서 습기가 올라오고, 길은 수십 미터 위에 있습니다. 집에 가는 길은 끝이 없는 계단입니다.' };
  root.CQI18N_PACK_KO['seo:layer:L1'] = { body: '강변. 물 위에 선 툇마루 집. 물이 차면 먼저 침수됩니다. 밤에는 화물선이 지나 골목이 울립니다.' };
  root.CQI18N_PACK_KO['seo:layer:L2'] = { body: '고가 밑. 머리 위를 차가 지나가며 바닥이 가끔 떨립니다. 월세는 싸지만 잠을 잘 못 잡습니다.' };
  root.CQI18N_PACK_KO['seo:layer:L3'] = { body: '가로층. 아래 간판이 새벽 2시까지 빛납니다. 가장 편리하고, 가장 시끄럽습니다.' };
  root.CQI18N_PACK_KO['seo:layer:L4'] = { body: '계단층. 충칭이 오르기 시작하는 곳. 1층 주민도 길까지 몇십, 몇 백 계단을 걸어야 합니다.' };
  root.CQI18N_PACK_KO['seo:layer:L5'] = { body: '일반 주택층. 대부분의 삶. 낮지도 높지도 않아 강이 보이지도, 들리지도 않습니다.' };
  root.CQI18N_PACK_KO['seo:layer:L6'] = { body: '타워. 유람선이 창문 아래로 지나갑니다. 지상보다 바람이 세고, 엘리베이터에서 이웃을 만나지 않습니다.' };
  root.CQI18N_PACK_KO['seo:layer:L7'] = { body: '최상층. 도시의 모든 빛이 발밑에. 한 층에 한 집뿐이며, 계단 울림은 없었습니다.' };

  /* ---------- 落地页钩子（长文案） ---------- */
  root.CQI18N_PACK_KO['ui:重庆是世界上唯一的 8D 城市：一栋楼能同时是地铁站、商场、菜市场和江景房。'] = { body: '충칭은 지구에서 유일한 8D 도시입니다. 한 건물이 지하철역이면서 상점이고 시장이며 강이 보이는 집이 되기도 합니다.' };
  root.CQI18N_PACK_KO['ui:你不能选自己的出生地。但你可以选住几楼——而这一层会改写你的一生。'] = { body: '태어날 곳은 고를 수 없습니다. 하지만 사는 층은 고를 수 있습니다. 그리고 그 층이 당신의 삶을 다시 씁니다.' };
  root.CQI18N_PACK_KO['ui:点击投胎。系统按重庆 37 个区县的真实出生数据抽取，不能选择。'] = { body: '클릭해서 태어나세요. 충칭 37개 구역의 실제 출생 데이터에서 뽑힙니다. 고를 수 없습니다.' };
  root.CQI18N_PACK_KO['ui:按 37 个区县的出生人口权重抽取。'] = { body: '37개 구역의 출생 인구 가중치로 뽑힙니다.' };
  root.CQI18N_PACK_KO['ui:出生到死亡，不重掷、不复活。'] = { body: '탄생에서 죽음까지. 다시 뽑지도, 부활하지도 않습니다.' };
  root.CQI18N_PACK_KO['ui:整个游戏免费，付费只买纪念品。'] = { body: '게임은 무료입니다. 결제는 기념품만.' };
  root.CQI18N_PACK_KO['ui:楼层同时改写通勤、体力、租金、健康和关系。'] = { body: '층이 출퇴근·체력·월세·건강·인연을 동시에 바꿉니다.' };
  root.CQI18N_PACK_KO['ui:一生里有几个节点要你自己拿主意。'] = { body: '인생 몇 번은 자신이 정해야 할 순간이 있습니다.' };

  /* ---------- 界面零散文案（t('中文','English') 专用） ---------- */
  root.CQI18N_PACK_KO['ui:投胎'] = { body: '태어나기' };
  root.CQI18N_PACK_KO['ui:住几楼？'] = { body: '몇 층에 살까?' };
  root.CQI18N_PACK_KO['ui:不可选出生地'] = { body: '출생지는 고를 수 없다' };
  root.CQI18N_PACK_KO['ui:一生只有一次'] = { body: '인생은 한 번뿐' };
  root.CQI18N_PACK_KO['ui:付费不改命'] = { body: '결제로는 운명이 바뀌지 않는다' };
  root.CQI18N_PACK_KO['ui:住几楼是核心'] = { body: '‘몇 층’이 핵심' };
  root.CQI18N_PACK_KO['ui:你还会遇到抉择'] = { body: '선택할 순간도 있습니다' };
  root.CQI18N_PACK_KO['ui:视野'] = { body: '전망' };
  root.CQI18N_PACK_KO['ui:街坊多'] = { body: '이웃이 많다' };
  root.CQI18N_PACK_KO['ui:没人串门'] = { body: '아무도 오지 않는다' };
  root.CQI18N_PACK_KO['ui:潮湿'] = { body: '습기' };
  root.CQI18N_PACK_KO['ui:车流吵'] = { body: '차량 소음' };
  root.CQI18N_PACK_KO['ui:看得见江'] = { body: '강이 보인다' };
  root.CQI18N_PACK_KO['ui:一般'] = { body: '보통' };
  root.CQI18N_PACK_KO['ui:租金最低的一档'] = { body: '이 층 중 가장 싼 곳' };
  root.CQI18N_PACK_KO['ui:租金中等'] = { body: '월세는 중간' };
  root.CQI18N_PACK_KO['ui:身体负担重'] = { body: '몸에 부담이 크다' };
  root.CQI18N_PACK_KO['ui:但晒、吵、孤单'] = { body: '하지만 햇빛·소음·외로움' };
  root.CQI18N_PACK_KO['ui:电梯直达，腿不累'] = { body: '엘리베이터 직통, 다리는 편해' };
  root.CQI18N_PACK_KO['ui:出门就是平路，不用爬楼'] = { body: '문 밖이 평지, 계단 없음' };
  root.CQI18N_PACK_KO['ui:工作'] = { body: '직업' };
  root.CQI18N_PACK_KO['ui:住'] = { body: '주거' };
  root.CQI18N_PACK_KO['ui:净资产'] = { body: '순자산' };
  root.CQI18N_PACK_KO['ui:成就'] = { body: '업적' };
  root.CQI18N_PACK_KO['ui:返回'] = { body: '뒤로' };
  root.CQI18N_PACK_KO['ui:清空收集进度'] = { body: '수집 진행 삭제' };
  root.CQI18N_PACK_KO['ui:确定清空所有收集进度？'] = { body: '모든 수집 진행을 지울까요?' };
  root.CQI18N_PACK_KO['ui:解锁了新的一页'] = { body: '새 한 페이지가 열렸다' };
  root.CQI18N_PACK_KO['ui:收集进度'] = { body: '수집 진행' };
  root.CQI18N_PACK_KO['ui:垂直层'] = { body: '수직 층' };
  root.CQI18N_PACK_KO['ui:住过的高度'] = { body: '살아온 높이' };
  root.CQI18N_PACK_KO['ui:职业'] = { body: '직업' };
  root.CQI18N_PACK_KO['ui:干过的活'] = { body: '해온 일' };
  root.CQI18N_PACK_KO['ui:区县'] = { body: '구역' };
  root.CQI18N_PACK_KO['ui:待过的地方'] = { body: '살아본 곳' };
  root.CQI18N_PACK_KO['ui:查看全部成就'] = { body: '모든 업적 보기' };
  root.CQI18N_PACK_KO['ui:外部测试面板'] = { body: '외부 테스트 패널' };
  root.CQI18N_PACK_KO['ui:复制数据'] = { body: '데이터 복사' };
  root.CQI18N_PACK_KO['ui:清空'] = { body: '지우기' };
  root.CQI18N_PACK_KO['ui:刷新'] = { body: '새로고침' };
  root.CQI18N_PACK_KO['ui:活我自己的一生'] = { body: '내 삶을 살기' };
  root.CQI18N_PACK_KO['ui:生于'] = { body: '출생' };
  root.CQI18N_PACK_KO['ui:死于'] = { body: '사망' };
  root.CQI18N_PACK_KO['ui:岁'] = { body: '세' };
  root.CQI18N_PACK_KO['ui:万'] = { body: '만' };
})(typeof window !== 'undefined' ? window : globalThis);
