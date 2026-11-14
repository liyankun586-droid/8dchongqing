/* 抉择文案 —— 日文
 * flat string pack，键 = 节点id:字段
 * 7 节点 / 34 选项 / 每选项 2 条（按钮文案 + 提示文案）
 * 共 79 条 */
var CQI18N_CHOICES_JA = {
  /* ---- age5 ---- */
  'age5:title': '両親が引っ越す。あなたは誰と行く？',
  'age5:follow:text': '両親と共に市街地へ移る',
  'age5:follow:hint': '見聞は広がります。ただし、あなたたちは他郷から来た身です。',
  'age5:stay:text': '故郷の町にそのまま残る',
  'age5:stay:hint': '知っている人は多いけれど、世界は小さいままです。',
  'age5:grand:text': '祖父母に預けて、学校で学ぶ',
  'age5:grand:hint': '自分のことは自分で育てます。',
  'age5:board:text': '両親に任され、寄宿舎で学ぶ',
  'age5:board:hint': '家に帰れるのは年に一度です。',

  /* ---- age15 ---- */
  'age15:title': '高校入試の結果が出た。',
  'age15:prompt': '重慶では、中学卒業生の98.5%が高校段階の学校に進学します。そのうち一般高校へ通えるのは約71%。残りは職業高校や技術学校へ分かれます。',
  'age15:general:text': '一般高校（普通高校）へ進学',
  'age15:general:hint': '三年後、道がもっと広くなります。',
  'age15:vocational:text': '職業高校で早く手を習う',
  'age15:vocational:hint': '収入を得るのは二年早いです。',
  'age15:technical:text': '専門・技術学校に進学する',
  'age15:technical:hint': 'どちらの端にも属さない、中間の道です。',
  'age15:work:text': '学校をやめて、働きに出る',
  'age15:work:hint': '十六歳。大人の給料が入ります。',

  /* ---- age22 ---- */
  'age22:title': '最初の仕事。',
  'age22:prompt': 'あなたは二十二歳。重慶には7,500,000人の出稼ぎ労働者がいます。県下の町や他の省から荷物を背負って街に集まった人たちです。',
  'age22:job_office:text': 'オフィスビルに勤める',
  'age22:job_office:hint': '体面はいい。上に伸びる余地も大きいです。',
  'age22:job_teacher:text': '学校で先生として働く',
  'age22:job_teacher:hint': '収入は安定し、尊敬もされます。',
  'age22:job_nurse:text': '看護師として病院で働く',
  'age22:job_nurse:hint': '疲れます。でも必要な仕事です。',
  'age22:job_trade:text': '自分で小さな店を開く',
  'age22:job_trade:hint': '大きく儲かることも、全部失うこともあります。',
  'age22:job_tech:text': 'プログラマーとして働く',
  'age22:job_tech:hint': 'この都市では、それが一番体面な働き方です。',
  'age22:job_factory:text': '工場の組立ラインで働く',
  'age22:job_factory:hint': '職は安定しています。飯に困ることはありません。',
  'age22:job_driver:text': 'トラック運転か、ライドシェア',
  'age22:job_driver:hint': '道路の上にいる時間が長くなります。',
  'age22:job_craft:text': '最初から一つの職を習う',
  'age22:job_craft:hint': '自分の技には、自分で値段を付けられます。',
  'age22:job_construction:text': '土木工事の現場で働く',
  'age22:job_construction:hint': '重慶には現場が溢れています。金は早く入りますが、膝が先に壊れます。',
  'age22:job_bangbang:text': '朝天門の棒棒として働く',
  'age22:job_bangbang:hint': '荷を一肩に担ぐ担ぎ手です。それが重慶の力そのものです。',

  /* ---- age30 ---- */
  'age30:title': 'この仕事、続けていけるかな。',
  'age30:stay:text': 'いつもの仕事を続ける',
  'age30:stay:hint': 'やりこんだ腕が、そのまま自分の力になります。',
  'age30:light:text': 'もっと軽い仕事へ移る',
  'age30:light:hint': '体が先に崩れたら、何も残っていません。',
  'age30:risk:text': '自分の力で勝負に出る',
  'age30:risk:hint': '成功すれば人生がひっくり返ります。失敗すれば元手も残りません。',
  'age30:move:text': '住所を移して、市街地へ',
  'age30:move:hint': 'チャンスは多いですが、家賃は容赦しません。',

  /* ---- age50 ---- */
  'age50:title': '子どもが大きくなった。',
  'age50:child_stay:text': '重慶に残ることを認める',
  'age50:child_stay:hint': '近くにいるのはよい。でも、たまに息苦しくなることもあります。',
  'age50:child_away:text': '海岸地方や海外へ行かせる',
  'age50:child_away:hint': '彼は、あなたにはなかった人生を歩みます。',
  'age50:child_back:text': '自分の跡を継いでもらう',
  'age50:child_back:hint': 'この手は、次の世代へ渡せます。',
  'age50:child_move:text': '子どものところへ引っ越す',
  'age50:child_move:hint': '晩年は、見慣れない場所で暮らせます。',

  /* ---- age70 ---- */
  'age70:title': '七十歳になった。',
  'age70:prompt': '家は残っています。問題は、その家を何と交換するかです。',
  'age70:retire_move:text': '家を売り、故郷の町へ戻る',
  'age70:retire_move:hint': '空気はよく、知り合いも多い。ただ、家はなくなります。',
  'age70:retire_stay:text': '街に残って、家を守る',
  'age70:retire_stay:hint': '動かさない。ただ、そのままでいるだけです。',
  'age70:retire_lease:text': '家を貸し出し、小さな部屋に移る',
  'age70:retire_lease:hint': '家が収入になります。',

  /* ---- bangbang42 ---- */
  'bangbang42:title': 'まだ担ぎきれるか。',
  'bangbang42:prompt': 'あなたがこの世界に入ったとき、この仕事には200,000人がいた。今、朝天門は一日の数往復すら埋まりません。',
  'bangbang42:bb_persist:text': 'これまで通り荷を担ぐ',
  'bangbang42:bb_persist:hint': 'この仕事以外のことを、あなたは何も覚えていません。',
  'bangbang42:bb_quit:text': 'この道をやめて別の手へ',
  'bangbang42:bb_quit:hint': '面子は落ちますが、お腹は減りません。',
  'bangbang42:bb_teach:text': '弟子を一人連れてくる',
  'bangbang42:bb_teach:hint': '力だけだったものが、別のものになります。',
  'bangbang42:bb_driver:text': '手押しの荷車に変える',
  'bangbang42:bb_driver:hint': '肩は痛めません。ただ、もっと時間がかかります。'
};
