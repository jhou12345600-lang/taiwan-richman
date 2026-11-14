// ===== 寶島富翁 3D：靜態資料 =====
export const GROUPS = {
  tp: { name: '台北', color: '#e53935' },
  wh: { name: '萬華士林', color: '#ff7043' },
  nc: { name: '北海岸', color: '#00897b' },
  yl: { name: '宜蘭', color: '#7cb342' },
  hl: { name: '花蓮', color: '#1e88e5' },
  tt: { name: '台東', color: '#f4511e' },
  ld: { name: '東部離島', color: '#26a69a' },
  pt: { name: '屏東', color: '#fbc02d' },
  ks: { name: '高雄', color: '#8e24aa' },
  tn: { name: '台南', color: '#6d4c41' },
  ph: { name: '澎湖', color: '#00acc1' },
  mt: { name: '中部山林', color: '#2e7d32' },
  ch: { name: '彰化', color: '#c0ca33' },
  tc: { name: '台中', color: '#d81b60' },
  ml: { name: '竹苗', color: '#5e35b1' },
  ty: { name: '桃園淡水', color: '#3949ab' },
};
const SHOP = { type: 'shop', name: '道具店', icon: '🏪', desc: '用點券購買道具卡。' };
const CH = { type: 'chance', name: '機會', icon: '❓' };
const NEWS = { type: 'news', name: '新聞', icon: '📰' };
const BANK = { type: 'bank', name: '銀行', icon: '🏦', desc: '停在這裡可以存款、提款。存款不怕查稅、均富。' };
const P = (g, name, price, model, desc, sea) => ({ type: 'prop', g, name, price, model, desc, sea });

// type: start prop chance news shop temple hospital police lottery bank（順時針環島 72 格）
export const TILES = [
  { type: 'start', name: '台北車站', icon: '🚉', desc: '起點。每次經過領薪水 $2000、點券 +10，存款加 5% 利息。' },
  P('tp', '台北101', 4400, 't101', '台北信義區地標，508 公尺高，曾是世界第一高樓。'),
  P('tp', '中正紀念堂', 3800, 'cks', '藍瓦白牆的八角屋頂，自由廣場的牌樓非常壯觀。'),
  CH,
  P('tp', '故宮博物院', 4000, 'npm', '收藏翠玉白菜、肉形石等近 70 萬件文物。'),
  SHOP,
  P('wh', '士林夜市', 3000, 'shilin', '台北最大夜市，大餅包小餅、豪大雞排。'),
  P('wh', '西門町', 3200, 'ximen', '年輕人的潮流聖地，八角形的西門紅樓。'),
  P('wh', '艋舺龍山寺', 3200, 'longshan', '近 300 年歷史的古剎，香火鼎盛。'),
  NEWS,
  P('nc', '野柳女王頭', 2200, 'queen', '北海岸的蕈狀岩，風化出女王側臉。'),
  P('nc', '基隆廟口', 2000, 'miaokou', '奠濟宮前的小吃街，鼎邊趖、營養三明治。'),
  P('nc', '九份老街', 2400, 'jiufen', '依山而建的山城，紅燈籠與茶樓。'),
  P('nc', '平溪天燈', 2000, 'lantern', '在鐵道旁寫下願望，放上天空的天燈。'),
  { type: 'temple', name: '土地公廟', icon: '⛩️', desc: '隨機請到一位神明附身。' },
  P('yl', '龜山島', 1600, 'turtle', '蘭陽平原外海的火山島，形狀像一隻海龜。', true),
  P('yl', '礁溪溫泉', 1800, 'onsen', '平地溫泉，泡湯與溫泉蔬菜聞名。'),
  P('yl', '蘭陽博物館', 1800, 'lanyang', '仿單面山傾斜造型的博物館。'),
  CH,
  P('hl', '清水斷崖', 2200, 'cliff', '蘇花公路上的千尺斷崖，直落太平洋。'),
  P('hl', '太魯閣峽谷', 2600, 'taroko', '大理石峽谷，燕子口與長春祠。'),
  P('hl', '七星潭', 2200, 'qixing', '彎月形的礫石海灘，看日出的好地方。'),
  { type: 'lottery', name: '彩券行', icon: '🎰', desc: '花 $500 猜骰子點數，猜中贏 $3000。' },
  { type: 'hospital', name: '醫院', icon: '🏥', desc: '住院的玩家會在這裡休養。' },
  P('tt', '三仙台', 1800, 'sanxian', '八拱跨海步橋連接離岸小島。', true),
  P('tt', '伯朗大道', 1600, 'brown', '池上稻田間筆直的道路與金城武樹。'),
  P('tt', '鹿野高台', 1800, 'balloon', '夏天的熱氣球嘉年華，滿天彩色氣球。'),
  NEWS,
  P('ld', '綠島', 2000, 'greenisland', '海底溫泉與白色燈塔的離島。', true),
  P('ld', '蘭嶼', 2200, 'lanyu', '達悟族的拼板舟與飛魚季。', true),
  BANK,
  P('pt', '鵝鑾鼻燈塔', 2400, 'eluanbi', '台灣最南端的白色燈塔，被稱為東亞之光。'),
  P('pt', '墾丁大街', 2800, 'kenting', '椰影、沙灘與船帆石，南國度假勝地。'),
  P('pt', '小琉球', 2400, 'xiaoliuqiu', '花瓶岩與海龜，珊瑚礁島嶼。', true),
  CH,
  SHOP,
  P('ks', '美麗島站', 2800, 'formosa', '捷運站裡的光之穹頂彩繪玻璃。'),
  P('ks', '蓮池潭龍虎塔', 2600, 'dragontiger', '龍喉進、虎口出，象徵消災解厄。'),
  P('ks', '駁二藝術特區', 2800, 'pier2', '港邊倉庫改造的文創園區。'),
  P('ks', '高雄85大樓', 3400, 't85', '形似「高」字的高雄地標摩天樓。'),
  { type: 'temple', name: '媽祖廟', icon: '⛩️', desc: '隨機請到一位神明附身。' },
  P('tn', '奇美博物館', 3200, 'chimei', '白色宮殿式博物館，前有阿波羅噴泉。'),
  P('tn', '安平古堡', 2800, 'anping', '荷蘭人建造的熱蘭遮城，台灣最古老城堡。'),
  P('tn', '赤崁樓', 3000, 'chihkan', '府城古蹟，紅牆飛簷的普羅民遮城。'),
  P('tn', '台南孔廟', 2800, 'confucius', '全台首學，紅牆黃瓦的文廟。'),
  CH,
  P('ph', '澎湖跨海大橋', 2000, 'phbridge', '連接白沙與西嶼的跨海大橋。', true),
  P('ph', '七美雙心石滬', 2400, 'twoheart', '先民堆砌的雙心形捕魚石滬。', true),
  P('ph', '吉貝沙尾', 2000, 'jibei', '白沙延伸入海的沙嘴，水上活動天堂。', true),
  { type: 'police', name: '警察局', icon: '🚓', desc: '被抓的玩家會在這裡拘留。' },
  P('mt', '阿里山', 3200, 'alishan', '神木、雲海、日出與森林小火車。'),
  P('mt', '日月潭', 3600, 'sunmoon', '台灣最大天然湖泊，拉魯島與慈恩塔。'),
  P('mt', '清境農場', 3000, 'cingjing', '高山草原上的綿羊秀。'),
  P('mt', '合歡山', 3200, 'hehuan', '冬天會下雪的高山，武嶺的星空。'),
  NEWS,
  P('ch', '八卦山大佛', 2200, 'buddha', '彰化地標，俯瞰市區的大佛。'),
  P('ch', '扇形車庫', 2000, 'roundhouse', '全台僅存的扇形火車頭車庫與轉車台。'),
  P('ch', '鹿港老街', 2400, 'lukang', '一府二鹿三艋舺，紅磚老街與龍山寺。'),
  SHOP,
  P('tc', '彩虹眷村', 2600, 'rainbow', '彩虹爺爺畫滿繽紛圖案的眷村。'),
  P('tc', '逢甲夜市', 2800, 'fengjia', '創意小吃的發源地。'),
  P('tc', '臺中國家歌劇院', 3200, 'opera', '伊東豊雄設計的曲牆建築。'),
  P('tc', '高美濕地', 2600, 'gaomei', '夕陽、風車與天空之鏡。'),
  CH,
  P('ml', '勝興車站', 2200, 'shengxing', '海拔最高的舊山線木造車站。'),
  P('ml', '龍騰斷橋', 2200, 'longteng', '地震留下的紅磚拱橋遺跡。'),
  P('ml', '新竹城隍廟', 2400, 'chenghuang', '香火鼎盛的城隍廟與貢丸米粉。'),
  P('ml', '內灣老街', 2200, 'neiwan', '新竹山城，內灣線火車與吊橋。'),
  BANK,
  P('ty', '大溪老街', 2400, 'daxi', '巴洛克牌樓立面與豆干。'),
  P('ty', '淡水紅毛城', 2800, 'fortsd', '紅色的西班牙、荷蘭古城堡。'),
  P('ty', '淡水漁人碼頭', 3000, 'tamsui', '情人橋與淡水夕照。'),
];

export const N_TILES = TILES.length;
export const LEVEL_NAMES = ['空地', '一層平房', '二層樓', '透天厝', '公寓', '摩天大樓'];
export const TOLL_MUL = [0.3, 0.9, 1.7, 2.8, 4.2, 6.0];
export const UPGRADE_RATE = 0.55; // 每升一級花費 = 地價 × 0.55
export const SALARY = 2000;

export const CHARS = [
  { id: 'boss', name: '金董', emoji: '🤵', color: '#e53935', bio: '白手起家的建設公司董事長，口頭禪是「地段、地段、還是地段」。',
    sk: [['rent', '收租王', '收到的過路費 +20%'], ['builder', '建商', '加蓋房子費用 -20%']] },
  { id: 'ama', name: '阿嬤', emoji: '👵', color: '#8e24aa', bio: '台南市場賣了五十年菜粿，存摺比誰都厚。',
    sk: [['interest', '存錢筒', '存款利息加倍（10%）'], ['elder', '長輩保佑', '衰神、窮神不會附身']] },
  { id: 'chef', name: '夜市王', emoji: '🧑‍🍳', color: '#fb8c00', bio: '全台夜市都有他的攤位，朋友多到數不完。',
    sk: [['network', '人脈廣', '離開道具店時，隨機獲得 1 張卡'], ['bargain', '殺價', '道具店卡片 7 折']] },
  { id: 'boba', name: '珍奶妹', emoji: '🧋', color: '#fdd835', bio: '手搖飲網紅，走到哪拍到哪，運氣好得不得了。',
    sk: [['lucky', '人氣王', '機會事件拿到的錢 +50%'], ['encore', '臨場發揮', '使用停留卡、遙控骰子時 40% 機率返還']] },
  { id: 'surf', name: '浪人凱', emoji: '🏄', color: '#039be5', bio: '東海岸衝浪手，身手靈活，什麼都難不倒他。',
    sk: [['range', '浪裡來去', '路障、地雷放置距離翻倍'], ['agile', '身手矯健', '住院、拘留時間少 1 回合']] },
  { id: 'bear', name: '黑熊仔', emoji: '🐻', color: '#43a047', bio: '從玉山下來觀光的台灣黑熊，皮粗肉厚、深受山神眷顧。',
    sk: [['thick', '皮厚', '付過路費與醫藥費 -20%'], ['divine', '山林之子', '神明附身時間 +2 回合']] },
  { id: 'leopard', name: '石虎', emoji: '🐆', color: '#d84315', animal: 1, bio: '苗栗淺山的石虎，額頭兩條白線是招牌，夜裡身手最靈巧。',
    sk: [['nomine', '夜行', '踩到地雷不會爆炸'], ['noblock', '敏捷', '路障擋不住牠']] },
  { id: 'magpie', name: '藍鵲', emoji: '🐦', color: '#283593', animal: 1, bio: '拖著長尾巴的台灣藍鵲，最愛收集亮晶晶的東西。',
    sk: [['bag', '長尾巴', '道具卡上限 15 張'], ['rob2', '叼走', '搶奪卡一次搶兩張']] },
  { id: 'deer', name: '梅花鹿', emoji: '🦌', color: '#ec407a', animal: 1, bio: '墾丁復育的梅花鹿，蹦蹦跳跳停不下來。',
    sk: [['swift', '跳躍', '每次擲骰多走 1 步'], ['protected', '保育類', '不會被查稅卡、烏龜卡指定']] },
  { id: 'pheasant', name: '帝雉', emoji: '🐓', color: '#00897b', animal: 1, bio: '印在千元鈔上的國寶鳥，走到哪都很有排場。',
    sk: [['salary', '國寶', '經過台北車站薪水 +50%'], ['pointsx', '千元鈔', '獲得的點券加倍']] },
  { id: 'pangolin', name: '穿山甲', emoji: '🦔', color: '#546e7a', animal: 1, bio: '全身鱗甲的穿山甲，遇到危險就縮成一顆球。',
    sk: [['armor', '鱗甲', '怪獸卡、颱風不會摧毀牠的房子'], ['dig', '挖洞', '不會被警察拘留']] },
  { id: 'monkey', name: '獼猴', emoji: '🐒', color: '#9e9d24', animal: 1, bio: '壽山上的台灣獼猴，最會跟遊客「借」東西。',
    sk: [['pick', '順手牽羊', '付過路費後 25% 機率拿回一半'], ['mischief', '調皮', '每回合開始 15% 機率撿到道具卡']] },
];
export const hasSkill = (p, k) => { const c = CHARS.find(x => x.id === p.char); return !!(c && c.sk.some(x => x[0] === k)); };

// target: none | player | tile | dice | myprop | oppprop | ahead(放置)
export const CARDS = {
  remote: { name: '遙控骰子', icon: '🎲', cost: 30, target: 'dice', desc: '這回合自己決定骰出的點數。' },
  block: { name: '路障', icon: '🚧', cost: 20, target: 'place', desc: '在前後 8 格內放路障，經過的人會被擋下。' },
  mine: { name: '地雷', icon: '💣', cost: 35, target: 'place', desc: '在前後 8 格內埋地雷，踩到的人住院 2 回合。' },
  free: { name: '免費卡', icon: '🎫', cost: 20, target: 'auto', desc: '自動抵免一次過路費。' },
  equal: { name: '均富卡', icon: '⚖️', cost: 60, target: 'none', desc: '所有玩家的現金平均分配。' },
  tax: { name: '查稅卡', icon: '🧾', cost: 40, target: 'player', desc: '指定玩家繳交現金 25% 的稅金。' },
  rob: { name: '搶奪卡', icon: '🦹', cost: 30, target: 'player', desc: '隨機搶走指定玩家一張道具卡。' },
  sleep: { name: '冬眠卡', icon: '😴', cost: 50, target: 'none', desc: '其他所有玩家冬眠 2 回合。' },
  buyland: { name: '購地卡', icon: '📜', cost: 50, target: 'here', desc: '強制以原價買下你腳下的別人土地（含房子）。' },
  monster: { name: '怪獸卡', icon: '🦖', cost: 40, target: 'oppprop', desc: '摧毀指定對手土地上的所有房子。' },
  turn: { name: '轉向卡', icon: '🔄', cost: 15, target: 'none', desc: '自己的前進方向反轉。' },
  stay: { name: '停留卡', icon: '🛑', cost: 15, target: 'none', desc: '這回合原地不動，再觸發一次腳下的格子。' },
  build: { name: '加蓋卡', icon: '🏗️', cost: 40, target: 'myprop', desc: '免費替自己的一塊地加蓋一層。' },
  turtle: { name: '烏龜卡', icon: '🐢', cost: 25, target: 'player', desc: '指定玩家接下來 3 回合每次只走 1 步。' },
  angel: { name: '天使卡', icon: '👼', cost: 70, target: 'myprop', desc: '選一塊地，整個區域所有已擁有的土地都加蓋一層。' },
};
export const CARD_IDS = Object.keys(CARDS);

export const GODS = {
  caishen: { name: '財神', icon: '💰', good: true, desc: '不用付過路費，收過路費加倍。' },
  fushen: { name: '福神', icon: '🍀', good: true, desc: '蓋房子免費。' },
  tudi: { name: '土地公', icon: '👴', good: true, desc: '停在空地上直接免費獲得土地。' },
  mazu: { name: '媽祖', icon: '🙏', good: true, desc: '保佑平安：不會住院、被抓，也不受壞運影響。' },
  shuai: { name: '衰神', icon: '☠️', good: false, desc: '過路費加倍付。' },
  qiong: { name: '窮神', icon: '🥀', good: false, desc: '每回合開始損失 8% 現金。' },
};

export const STOCKS = [
  { name: '寶島半導體', p: 58 },
  { name: '珍奶食品', p: 22 },
  { name: '環島航運', p: 35 },
  { name: '高山觀光', p: 18 },
  { name: '夜市控股', p: 12 },
  { name: '黑熊科技', p: 40 },
];

export const EMOTES = ['👍', '😂', '😭', '😡', '🤑', '🙏', '🎉', '💩'];
