// ===== 寶島富翁 3D：遊戲規則引擎（只在房主端執行，狀態可 JSON 化）=====
import { TILES, N_TILES, useMap, MAP_ID, GROUPS, TOLL_MUL, UPGRADE_RATE, SALARY, CARDS, CARD_IDS, GODS, STOCKS, LEVEL_NAMES, hasSkill } from './data.js';

export const PRE_T = 40000, DEC_T = 25000;
const HOSPI = () => TILES.findIndex(t => t.type === 'hospital');
const POLI = () => TILES.findIndex(t => t.type === 'police');
export const OWNABLE = t => t.type === 'prop' || t.type === 'company' || t.type === 'bigland';
export const BIG = {
  park: { name: '主題公園', icon: '🌳', cost: 30000, fee: 8000, desc: '遊客付門票，還會送地主點券' },
  gas: { name: '加油站', icon: '⛽', cost: 40000, fee: 15000, desc: '收加油費；地主停下點券 +15' },
  lab: { name: '研究所', icon: '🔬', cost: 50000, fee: 10000, desc: '地主停下送道具卡；別人付錢後地主點券 +20' },
  mall: { name: '購物中心', icon: '🛍️', cost: 60000, fee: 20000, desc: '收購物費；別人停下時地主多拿 10% 的業績獎金' },
  hotel: { name: '度假飯店', icon: '🏨', cost: 70000, fee: 30000, desc: '收住宿費，還要住一晚（停一回合）' },
  fun: { name: '遊樂園', icon: '🎡', cost: 90000, fee: 35000, desc: '收門票；遊客玩得開心會拿到一張道具卡' },
};
export const BIG_MAX = 3;
export const VEH = [{ name: '步行', icon: '🚶', dice: 1, price: 0 }, { name: '機車', icon: '🛵', dice: 2, price: 30000 }, { name: '汽車', icon: '🚗', dice: 3, price: 80000 }];
export function diceCount(s, p) { return Math.max(s.settings.dice || 1, VEH[p.veh || 0].dice); }
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const r100 = x => Math.round(x / 100) * 100;
const r10 = x => Math.round(x / 10) * 10;
export const money = n => '$' + Math.round(n).toLocaleString('en-US');

// ---------- 查詢 ----------
export function cur(s) { return s.players[s.turn]; }
export function pl(s, id) { return s.players.find(p => p.id === id); }
export function alive(s) { return s.players.filter(p => !p.out); }
export function price(s, i) { const t = TILES[i]; return r100(t.price * (s.gprice[t.g] || 1)); }
export function upCost(s, i) { return r100(price(s, i) * UPGRADE_RATE); }
export function upCostFor(s, i, p) { if (p.god && p.god.id === 'fushen') return 0; return r100(upCost(s, i) * (hasSkill(p, 'builder') ? 0.8 : 1)); }
export function cardCost(p, k) { return Math.round(CARDS[k].cost * (hasSkill(p, 'bargain') ? 0.7 : 1)); }
// ---------- 合併建設：相鄰 2～3 塊自己的地合併成住宅區／商業區／工業區 ----------
export const MG = {
  res: { name: '住宅區', icon: '🏘️', build: 1.2, up: 0.8, toll: [1.6, 2.6, 3.6], daily: 0.02, desc: '過路費中等，每天收房租' },
  com: { name: '商業區', icon: '🏬', build: 1.6, up: 1.0, toll: [2.3, 3.5, 5.0], daily: 0, desc: '過路費最高' },
  ind: { name: '工業區', icon: '🏭', build: 0.9, up: 0.6, toll: [1.0, 1.6, 2.2], daily: 0.05, desc: '過路費較低，每天工廠收入最多' },
};
export const MG_MAX = 3;
const mgBase = (s, ts) => ts.reduce((a, j) => a + price(s, j), 0);
export function mgBuildCost(s, ts, k) {
  const credit = ts.reduce((a, j) => a + s.tiles[j].l * upCost(s, j), 0) * 0.5;   // 原本蓋的房子折抵一半
  return Math.max(0, r100(mgBase(s, ts) * MG[k].build - credit));
}
export function mgUpCost(s, i) { const m = s.tiles[i].mg; return r100(mgBase(s, m.ts) * MG[m.k].up); }
export function mgToll(s, i) { const m = s.tiles[i].mg; return r10(mgBase(s, m.ts) * MG[m.k].toll[m.lv - 1] * (s.allMod ? s.allMod.m : 1)); }
export function mgDaily(s, i) { const m = s.tiles[i].mg; return r10(mgBase(s, m.ts) * MG[m.k].daily * m.lv); }
// 找出包含 i、連續屬於同一人的 2～3 塊一般土地（都還沒合併）
export function mergeRun(s, pid, i) {
  const ok = j => TILES[j] && TILES[j].type === 'prop' && s.tiles[j].o === pid && !s.tiles[j].mg;
  if (!ok(i)) return null;
  const nx = (j, d) => (j + d + N_TILES) % N_TILES;
  let a = i, b = i, n = 1;
  while (n < 3 && ok(nx(a, -1)) && nx(a, -1) !== b) { a = nx(a, -1); n++; }
  while (n < 3 && ok(nx(b, 1)) && nx(b, 1) !== a) { b = nx(b, 1); n++; }
  // 盡量讓 i 在中間：右邊還能延伸時，把左邊收一格換右邊
  if (n === 3 && a !== i && nx(a, 1) !== i && ok(nx(b, 1))) { a = nx(a, 1); b = nx(b, 1); }
  if (n < 2) return null;
  const ts = []; for (let j = a; ; j = nx(j, 1)) { ts.push(j); if (j === b) break; }
  return ts;
}
function mgSet(s, ts, m) { ts.forEach(j => { s.tiles[j].mg = m ? { ...m, ts: [...ts] } : null; s.tiles[j].l = 0; }); }
export function mgBreak(s, i) { const m = s.tiles[i] && s.tiles[i].mg; if (!m) return; mgSet(s, m.ts, null); }
// 被破壞：降級，降到 0 就拆回空地（土地還是原主人的）
function mgDamage(s, i, n) {
  const m = s.tiles[i].mg; if (!m) return false;
  const lv = m.lv - n;
  if (lv <= 0) { log(s, `💥 ${MG[m.k].name}被夷為平地，恢復成 ${m.ts.length} 塊空地`); mgSet(s, m.ts, null); }
  else mgSet(s, m.ts, { ...m, lv, inv: Math.round(m.inv * lv / m.lv) });
  return true;
}
function mgDailyPay(s) {
  const seen = new Set(), got = {};
  s.tiles.forEach((t, i) => {
    if (!t || !t.mg || seen.has(t.mg.ts[0])) return; seen.add(t.mg.ts[0]);
    const o = pl(s, t.o); if (!o || o.out) return;
    const v = mgDaily(s, i); if (!v) return;
    o.cash += v; got[o.id] = (got[o.id] || 0) + v; fx(s, { k: 'money', pid: o.id, d: v });
  });
  const txt = Object.entries(got).map(([id, v]) => `${pl(s, id).name} ${money(v)}`).join('、');
  if (txt) log(s, `🏘️ 房租／工廠收入：${txt}`);
}
export function propValue(s, i) {
  const t = TILES[i], st = s.tiles[i];
  if (st.mg) return price(s, i) + Math.round((st.mg.inv || 0) / st.mg.ts.length);
  if (t.type === 'company') return price(s, i);
  if (t.type === 'bigland') return price(s, i) + (st.b ? BIG[st.b].cost + ((st.bl || 1) - 1) * bigUpCost(s, i) : 0);
  return price(s, i) + st.l * upCost(s, i);
}
export function companyCount(s, pid) { return s.tiles.filter((x, i) => x && x.o === pid && TILES[i].type === 'company').length; }
export function companyFee(s, i, dice) { const st = s.tiles[i]; return Math.max(4000, (dice || 7) * 2000 * companyCount(s, st.o)); }
export function bigFee(s, i) { const st = s.tiles[i]; return st.b ? r10(BIG[st.b].fee * (1 + ((st.bl || 1) - 1) * 0.6)) : 5000; }
export function bigUpCost(s, i) { const st = s.tiles[i]; return st.b ? r100(BIG[st.b].cost * 0.6) : 0; }
export function ownsGroup(s, g, pid) {
  return TILES.every((t, i) => t.g !== g || s.tiles[i].o === pid);
}
function baseToll(s, i) {
  const t = TILES[i], st = s.tiles[i];
  let v = price(s, i) * TOLL_MUL[st.l];
  const gm = s.gmod[t.g]; if (gm) v *= gm.m;
  if (s.allMod) v *= s.allMod.m;
  return v;
}
// 大富翁6「連鎖」：同一位地主相連的土地，過路費一起加總
export function chainOf(s, i) {
  const st = s.tiles[i]; if (!st || st.o == null) return [];
  const out = [i];
  for (const d of [-1, 1]) {
    let j = (i + d + N_TILES) % N_TILES;
    while (j !== i && s.tiles[j] && TILES[j].type === 'prop' && s.tiles[j].o === st.o && !s.tiles[j].mg) { out.push(j); j = (j + d + N_TILES) % N_TILES; }
  }
  return [...new Set(out)];
}
export function toll(s, i) {
  const st = s.tiles[i];
  if (!st || st.o == null) return 0;
  if (TILES[i].type === 'company') return companyFee(s, i, s.lastDice);
  if (TILES[i].type === 'bigland') return bigFee(s, i);
  if (st.mg) return mgToll(s, i);
  return r10(chainOf(s, i).reduce((a, j) => a + baseToll(s, j), 0));
}
export function stockValue(s, p) { return p.stocks.reduce((a, q, k) => a + q * s.market[k].p, 0); }
export function assets(s, p) {
  let v = p.cash + p.deposit + stockValue(s, p);
  s.tiles.forEach((t, i) => { if (t && t.o === p.id) v += propValue(s, i); });
  return Math.round(v);
}
export function dist(a, b) { const d = Math.abs(a - b) % N_TILES; return Math.min(d, N_TILES - d); }
const hasGod = (p, id) => p.god && p.god.id === id;
export const cardLimit = p => (hasSkill(p, 'bag') ? 15 : 10);
function addPts(p, n) { p.points += hasSkill(p, 'pointsx') ? n * 2 : n; }

function log(s, msg) { s.log.push(msg); if (s.log.length > 60) s.log.shift(); }
function fx(s, o) { o.n = ++s.fxn; s.fx.push(o); if (s.fx.length > 30) s.fx.shift(); }

// ---------- 建立 ----------
export function createGame(players, settings, now) {
  useMap(settings.map || 'taiwan');
  const s = {
    map: MAP_ID, lotto: { pool: 50000, tix: [], last: null }, auction: null, lastDice: 7,
    v: 0, phase: 'play', settings, round: 1, month: 1, day: 1, turn: 0, step: 'pre', pending: null, anim: null,
    until: 0, deadline: 0, botAt: 0, botUses: 0,
    tiles: TILES.map(t => (OWNABLE(t) ? { o: null, l: 0, b: null } : null)),
    marks: {}, gmod: {}, gprice: {},
    market: STOCKS.map(x => ({ p: x.p, h: [x.p] })),
    players: players.map(p => ({
      id: p.id, name: p.name, char: p.char, bot: !!p.bot,
      cash: r100(settings.startCash * 0.7), deposit: r100(settings.startCash * 0.3), points: 60, pos: 0, dir: 1,
      cards: ['free', pick(['remote', 'block', 'turn', 'stay', 'turtle'])],
      stocks: STOCKS.map(() => 0),
      st: { hosp: 0, jail: 0, sleep: 0, turtle: 0 }, god: null, out: false, remote: 0, stay: false, veh: 0,
    })),
    log: [], fx: [], fxn: 0, rank: null, startedAt: now,
  };
  log(s, `🎉 環島之旅開始！共 ${players.length} 位玩家，起始資金 ${money(settings.startCash)}`);
  beginTurn(s, now);
  return s;
}

// ---------- 回合流程 ----------
function setStep(s, step, now) {
  s.step = step;
  s.deadline = now + (step === 'pre' ? PRE_T : DEC_T);
  s.botAt = now + 450 + rnd(450);
}
function done(s, now, delay = 800) { s.step = 'done'; s.pending = null; s.until = now + delay; }

function beginTurn(s, now) {
  const p = cur(s);
  s.pending = null; s.anim = null; s.botUses = 0;
  if (!p.out && hasSkill(p, 'pointsday')) addPts(p, 5);
  if (!p.out && hasSkill(p, 'autosave') && p.cash > 0) { const v = r10(p.cash * 0.05); p.cash -= v; p.deposit += v; }
  if (hasSkill(p, 'mischief') && !p.out && Math.random() < 0.15) { log(s, `🐒 ${p.name} 調皮地撿到一張卡`); giveCard(s, p); }
  if (p.god) {
    if (p.god.id === 'qiong') {
      const loss = r10(p.cash * 0.08);
      if (loss > 0) { p.cash -= loss; log(s, `🥀 窮神作祟，${p.name} 損失 ${money(loss)}`); fx(s, { k: 'money', pid: p.id, d: -loss }); }
    }
    p.god.t--;
    if (p.god.t <= 0) { log(s, `${GODS[p.god.id].icon} ${GODS[p.god.id].name}離開了 ${p.name}`); p.god = null; }
  }
  for (const [k, txt] of [['hosp', '🏥 住院休養中'], ['jail', '🚓 拘留中'], ['sleep', '😴 冬眠中']]) {
    if (p.st[k] > 0) {
      p.st[k]--;
      log(s, `${txt}：${p.name} 暫停一回合（剩 ${p.st[k]}）`);
      done(s, now, 1100); return;
    }
  }
  setStep(s, 'pre', now);
}

function nextTurn(s, now) {
  if (checkEnd(s)) return;
  const n = s.players.length;
  let idx = s.turn, wrapped = false;
  for (let k = 0; k < n; k++) {
    idx++;
    if (idx >= n) { idx = 0; wrapped = true; }
    if (!s.players[idx].out) break;
  }
  s.turn = idx;
  if (wrapped) {
    newRound(s);
    if (s.phase !== 'play') return;
  }
  beginTurn(s, now);
}

function newRound(s) {
  s.round++;
  s.day++;
  mgDailyPay(s);
  if (s.round % 7 === 0) drawLotto(s);
  if (s.day > 30) {
    s.day = 1; s.month = s.month % 12 + 1;
    log(s, `🗓️ ${s.month} 月 1 日：銀行發放存款利息 10%`);
    alive(s).forEach(p => { const it = r10(p.deposit * (hasSkill(p, 'interest') ? 0.2 : 0.1)); if (it > 0) { p.deposit += it; fx(s, { k: 'money', pid: p.id, d: it }); } });
    alive(s).forEach(p => {
      if (hasSkill(p, 'dividend')) { const d = r10(stockValue(s, p) * 0.08); if (d > 0) { gain(s, p, d); log(s, `🦜 ${p.name} 領到股利 ${money(d)}`); } }
      if (hasSkill(p, 'winter')) { log(s, `🦢 候鳥 ${p.name} 帶回一張道具卡`); giveCard(s, p); }
    });
  }
  s.market.forEach(m => {
    const drift = (Math.random() - 0.485) * 0.14;
    m.p = Math.max(2, Math.round(m.p * (1 + drift) * 10) / 10);
    m.h.push(m.p); if (m.h.length > 24) m.h.shift();
  });
  if (s.allMod && --s.allMod.r <= 0) { log(s, '📉 全台過路費恢復正常'); s.allMod = null; }
  for (const g of Object.keys(s.gmod)) { if (--s.gmod[g].r <= 0) { log(s, `📉 ${GROUPS[g].name}的過路費恢復正常`); delete s.gmod[g]; } }
  const mr = s.settings.maxRounds;
  if (mr && s.round > mr) endGame(s, `已滿 ${mr} 回合`);
  else log(s, `📅 ${s.month} 月 ${s.day} 日（第 ${s.round} 回合）`);
}

function checkEnd(s) {
  if (s.phase !== 'play') return true;
  if (alive(s).length <= 1) { endGame(s, '其他玩家都破產了'); return true; }
  return false;
}
function endGame(s, reason) {
  s.phase = 'over'; s.step = 'over'; s.pending = null;
  const order = [...s.players].sort((a, b) => (a.out - b.out) || (assets(s, b) - assets(s, a)));
  s.rank = order.map(p => ({ id: p.id, a: p.out ? 0 : assets(s, p) }));
  log(s, `🏁 遊戲結束（${reason}）！冠軍：${order[0].name}`);
  fx(s, { k: 'over' });
}

// ---------- 移動 ----------
function startMove(s, p, steps, now, dice) {
  const path = [p.pos];
  let pos = p.pos, pass = 0, mark = null;
  for (let k = 0; k < steps; k++) {
    pos = (pos + p.dir + N_TILES) % N_TILES;
    path.push(pos);
    if (pos === 0 && p.dir > 0) pass++;
    const mk = s.marks[pos];
    if (mk && !(mk === 'block' && hasSkill(p, 'noblock')) && !(mk === 'mine' && hasSkill(p, 'nomine'))) { mark = mk; break; }
  }
  s.anim = { pid: p.id, path, t0: now, dice: dice || null, dur: (dice ? 750 : 200) + (path.length - 1) * 280 };
  s.moveInfo = { pass, mark };
  s.step = 'move';
  s.until = now + s.anim.dur;
}

function finishMove(s, now) {
  const p = cur(s);
  const path = s.anim.path;
  p.pos = path[path.length - 1];
  const { pass, mark } = s.moveInfo || {};
  s.moveInfo = null;
  // 大富翁6：經過銀行可以存提款
  if (path.slice(1).some(i => TILES[i].type === 'bank')) { p.bankOk = true; log(s, `🏦 ${p.name} 經過銀行，下回合擲骰前可以存提款`); }
  for (let k = 0; k < (pass || 0); k++) {
    const sal = hasSkill(p, 'salary') ? SALARY * 1.5 : SALARY;
    p.cash += sal; addPts(p, 10);
    log(s, `🚉 ${p.name} 經過台北車站，領環島獎金 ${money(sal)}、點券 +${hasSkill(p, 'pointsx') ? 20 : 10}`);
    fx(s, { k: 'money', pid: p.id, d: sal });
  }
  if (mark) {
    delete s.marks[p.pos];
    if (mark === 'block') { log(s, `🚧 ${p.name} 被路障擋下了！`); fx(s, { k: 'boom', tile: p.pos, m: 'block' }); }
    else {
      fx(s, { k: 'boom', tile: p.pos, m: 'mine', big: 1, pid: p.id });
      log(s, `💣 轟！${p.name} 踩到地雷！`);
      if (p.veh) { log(s, `💥 ${p.name} 的${VEH[p.veh].name}被炸毀了`); p.veh = 0; }
      if (sendHospital(s, p, 2)) { done(s, now, 1800); return; }
    }
  }
  land(s, now);
}

function teleport(s, p, pos) { p.pos = pos; fx(s, { k: 'tp', pid: p.id, pos }); }
function sendHospital(s, p, turns) {
  if (hasGod(p, 'mazu')) { log(s, `🙏 媽祖保佑，${p.name} 平安無事`); return false; }
  if (hasSkill(p, 'agile')) turns = Math.max(0, turns - 1);
  teleport(s, p, HOSPI()); p.st.hosp = turns;
  const fee = Math.min(p.cash, hasSkill(p, 'thick') ? 4000 : 5000); p.cash -= fee;
  log(s, `🚑 ${p.name} 被送進醫院，住院 ${turns} 回合（醫藥費 ${money(fee)}）`);
  return true;
}
function sendJail(s, p, turns) {
  if (hasSkill(p, 'dig')) { log(s, `🕳️ ${p.name} 挖了個洞溜走了，不用被拘留`); return false; }
  if (hasGod(p, 'mazu')) { log(s, `🙏 媽祖保佑，${p.name} 逃過一劫`); return false; }
  if (hasSkill(p, 'agile')) turns = Math.max(0, turns - 1);
  teleport(s, p, POLI()); p.st.jail = turns;
  log(s, `🚓 ${p.name} 被帶到警察局，拘留 ${turns} 回合`);
  return true;
}

// ---------- 金錢 ----------
function liquidate(s, p, need) {
  let short = need - p.cash;
  if (short > 0 && p.deposit > 0) {
    const w = Math.min(p.deposit, short); p.deposit -= w; p.cash += w; short -= w;
    log(s, `🏦 ${p.name} 從存款提領 ${money(w)} 付款`);
  }
  for (let k = 0; k < p.stocks.length && short > 0; k++) {
    if (p.stocks[k] > 0) {
      const v = Math.round(p.stocks[k] * s.market[k].p);
      p.cash += v; short -= v; p.stocks[k] = 0;
      log(s, `📈 ${p.name} 賣出 ${STOCKS[k].name} 股票得 ${money(v)}`);
    }
  }
  if (short > 0) {
    const mine = s.tiles.map((t, i) => (t && t.o === p.id ? i : -1)).filter(i => i >= 0)
      .sort((a, b) => propValue(s, a) - propValue(s, b));
    for (const i of mine) {
      if (short <= 0) break;
      const v = r10(propValue(s, i) * 0.5);
      mgBreak(s, i); p.cash += v; short -= v; s.tiles[i].o = null; s.tiles[i].l = 0; s.tiles[i].b = null; s.tiles[i].bl = 0;
      log(s, `🏚️ ${p.name} 變賣 ${TILES[i].name} 得 ${money(v)}`);
    }
  }
}
function pay(s, p, to, amt, why) {
  amt = Math.round(amt);
  if (amt <= 0) return 0;
  if (p.cash < amt) liquidate(s, p, amt);
  const paid = Math.min(amt, p.cash);
  p.cash -= paid;
  if (to) to.cash += paid;
  fx(s, { k: 'money', pid: p.id, d: -paid });
  if (to) fx(s, { k: 'money', pid: to.id, d: paid });
  if (to && paid > 0) fx(s, { k: 'xfer', from: p.id, to: to.id, amt: paid, why: why || '', short: paid < amt ? amt : 0 });
  if (paid < amt) bankrupt(s, p);
  return paid;
}
function gain(s, p, amt) { if (s.chanceCtx === p.id && hasSkill(p, 'lucky')) amt = r10(amt * 1.5); p.cash += amt; fx(s, { k: 'money', pid: p.id, d: amt }); }
function bankrupt(s, p) {
  if (p.out) return;
  p.out = true; p.cash = 0; p.deposit = 0; p.cards = []; p.god = null;
  s.tiles.forEach(t => { if (t && t.o === p.id) { t.o = null; t.l = 0; t.b = null; t.bl = 0; t.mg = null; } });
  s.lotto.tix = s.lotto.tix.filter(x => x.pid !== p.id);
  log(s, `💸 ${p.name} 破產出局了！`);
  fx(s, { k: 'bankrupt', pid: p.id });
}

// ---------- 落點 ----------
function land(s, now) {
  const p = cur(s);
  if (p.out) { done(s, now); return; }
  const i = p.pos, t = TILES[i];
  switch (t.type) {
    case 'prop': return landProp(s, p, i, now);
    case 'chance': return chance(s, p, now);
    case 'news': return news(s, p, now);
    case 'temple': return temple(s, p, now);
    case 'company': return landCompany(s, p, i, now);
    case 'bigland': return landBig(s, p, i, now);
    case 'carshop':
      if (p.veh < 2 && p.cash >= VEH[p.veh + 1].price) return ask(s, { type: 'car' }, now);
      log(s, `🛵 ${p.name} 逛了逛車行`); return done(s, now);
    case 'game': return ask(s, { type: 'minigame' }, now);
    case 'magic': return magic(s, p, now);
    case 'shop':
      if (p.points >= 10 || hasSkill(p, 'network')) return ask(s, { type: 'shop' }, now);
      log(s, `🏪 ${p.name} 點券不足，逛逛就走`); return done(s, now);
    case 'lottery':
      if (p.cash >= 5000 && !s.lotto.tix.some(x => x.pid === p.id)) return ask(s, { type: 'lottery' }, now);
      log(s, `🎰 ${p.name} 已經有樂透彩券了`); return done(s, now);
    case 'bank': p.bankOk = true; return ask(s, { type: 'bank' }, now);
    case 'hospital': log(s, `🏥 ${p.name} 來醫院探病，獲得點券`); addPts(p, 5); return done(s, now);
    case 'police': log(s, `🚓 ${p.name} 到警察局做筆錄，獲得點券`); addPts(p, 5); return done(s, now);
    default: return done(s, now);
  }
}
function ask(s, pending, now) { s.askN = (s.askN || 0) + 1; pending.k = s.askN; s.pending = pending; setStep(s, 'decide', now); }

function landProp(s, p, i, now) {
  const st = s.tiles[i], t = TILES[i];
  if (hasGod(p, 'angel')) {
    let n = 0; TILES.forEach((q, j) => { const x = s.tiles[j]; if (q.g === t.g && x.o && x.l < 5 && !x.mg) { x.l++; n++; fx(s, { k: 'build', tile: j }); } });
    if (n) log(s, `👼 天使降臨${GROUPS[t.g].name}，${n} 塊地加蓋一層！`);
  }
  if (hasGod(p, 'devil')) {
    let n = 0; TILES.forEach((q, j) => { const x = s.tiles[j]; if (q.g === t.g && (x.l > 0 || x.mg) && !hasSkill(pl(s, x.o), 'armor')) { if (x.mg) mgDamage(s, j, 9); x.l = 0; n++; fx(s, { k: 'boom', tile: j, m: 'monster' }); } });
    if (n) log(s, `😈 惡魔肆虐${GROUPS[t.g].name}，${n} 塊地的房子全倒了！`);
  }
  if (st.o == null) {
    if (hasGod(p, 'tudi')) {
      st.o = p.id; log(s, `👴 土地公顯靈！${p.name} 免費獲得 ${t.name}`);
      fx(s, { k: 'buy', tile: i, pid: p.id }); return done(s, now, 1600);
    }
    if (p.cash >= price(s, i)) return ask(s, { type: 'buy', tile: i }, now);
    log(s, `${p.name} 錢不夠買 ${t.name}`); return done(s, now);
  }
  if (st.o === p.id) {
    if (st.mg) {
      if (st.mg.lv < MG_MAX && p.cash >= mgUpCost(s, i)) return ask(s, { type: 'mgup', tile: i }, now);
      return done(s, now);
    }
    const run = mergeRun(s, p.id, i);
    const canMerge = run && p.cash >= Math.min(...Object.keys(MG).map(k => mgBuildCost(s, run, k)));
    if ((st.l < 5 && p.cash >= upCostFor(s, i, p)) || canMerge) return ask(s, { type: 'upgrade', tile: i, merge: canMerge ? run : null }, now);
    return done(s, now);
  }
  const o = pl(s, st.o);
  if (o.st.hosp > 0 || o.st.jail > 0) {
    log(s, `😮 ${t.name} 的主人 ${o.name} 不在，${p.name} 免付過路費`); return done(s, now);
  }
  if (hasSkill(p, 'rush') && Math.random() < 0.25) { log(s, `🐗 ${p.name} 一路衝撞過去，不用付過路費！`); fx(s, { k: 'emote', pid: p.id, e: '💨' }); return done(s, now, 1400); }
  const fee = ownerFee(s, p, o, toll(s, i), t.name);
  if (!fee) return done(s, now, 1500);
  return charge(s, p, o, i, fee, 'prop', now);
}

// 計算要付給地主的錢（含神明、技能、免費卡），回傳 null 代表免付
function ownerFee(s, p, o, amt, label) {
  if (o.st.hosp > 0 || o.st.jail > 0) { log(s, `😮 ${label} 的主人 ${o.name} 不在，${p.name} 免付`); return null; }
  if (hasGod(p, 'caishen')) { log(s, `💰 財神護體，${p.name} 不用付錢`); fx(s, { k: 'emote', pid: p.id, e: '💰' }); return null; }
  const fi = p.cards.indexOf('free');
  if (fi >= 0) { p.cards.splice(fi, 1); log(s, `🎫 ${p.name} 使用免費卡，省下 ${money(amt)}`); fx(s, { k: 'card', pid: p.id, card: 'free' }); return null; }
  const notes = [];
  if (hasGod(p, 'shuai')) { amt *= 2; notes.push('衰神×2'); }
  if (hasGod(o, 'caishen')) { amt *= 2; notes.push('地主財神×2'); }
  if (hasSkill(o, 'rent')) { amt *= 1.2; notes.push('地主技能+20%'); }
  if (hasSkill(p, 'thick')) { amt *= 0.8; notes.push('皮厚-20%'); }
  s.feeNotes = notes;
  return r10(amt);
}
// 付錢給地主前：先動用存款；還不夠就讓玩家自己挑要變賣什麼
export function sellValue(s, i) { return r10(propValue(s, i) * 0.5); }
export function sellables(s, p) {
  const tiles = s.tiles.map((t, i) => (t && t.o === p.id ? i : -1)).filter(i => i >= 0);
  const stocks = p.stocks.map((q, k) => (q > 0 ? k : -1)).filter(k => k >= 0);
  const total = tiles.reduce((a, i) => a + sellValue(s, i), 0) + stocks.reduce((a, k) => a + Math.round(p.stocks[k] * s.market[k].p), 0);
  return { tiles, stocks, total };
}
function feeWhy(s, p, i, kind) {
  const t = TILES[i], st = s.tiles[i];
  let w;
  if (kind === 'prop' && st.mg) w = `過路費：${MG[st.mg.k].icon}${MG[st.mg.k].name} ${st.mg.lv} 級（${st.mg.ts.length} 塊地合併）`;
  else if (kind === 'prop') { const ch = chainOf(s, i).length; w = `過路費：${t.name}・${LEVEL_NAMES[st.l]}${ch > 1 ? `・${ch} 塊連鎖` : ''}`; }
  else if (kind === 'company') w = `公司收費：${t.name}（骰 ${s.lastDice} 點 × $2,000 × ${companyCount(s, st.o)} 家）`;
  else { const b = st.b ? BIG[st.b] : null; w = `${b ? b.name : '建地'}收費：${t.name}${st.bl > 1 ? `（${st.bl} 級）` : ''}`; }
  if (s.feeNotes && s.feeNotes.length) w += `（${s.feeNotes.join('、')}）`;
  return w;
}
function charge(s, p, o, i, amt, kind, now) {
  const why = feeWhy(s, p, i, kind); delete s.feeNotes;
  if (p.cash < amt && p.deposit > 0) {
    const w = Math.min(p.deposit, amt - p.cash); p.deposit -= w; p.cash += w;
    log(s, `🏦 ${p.name} 現金不夠，從存款提領 ${money(w)}`);
  }
  if (p.cash < amt) {
    const sv = sellables(s, p);
    if (sv.total > 0 && p.cash + sv.total >= amt) {
      log(s, `😰 ${p.name} 現金不夠付 ${o.name} ${money(amt)}，要變賣財產`);
      return ask(s, { type: 'sell', tile: i, to: o.id, amt, kind, why }, now);
    }
  }
  settle(s, p, o, i, amt, kind, why, now);
}
function settle(s, p, o, i, amt, kind, why, now) {
  const st = s.tiles[i], t = TILES[i];
  const paid = pay(s, p, o, amt, why);
  if (kind === 'prop') {
    log(s, `💵 ${p.name} 付給 ${o.name} ${money(paid)}　${why}`);
    if (!p.out && hasSkill(p, 'pick') && Math.random() < 0.25) { const back = Math.min(o.cash, r10(paid / 2)); o.cash -= back; gain(s, p, back); fx(s, { k: 'money', pid: o.id, d: -back }); log(s, `🐒 ${p.name} 順手牽羊拿回 ${money(back)}`); }
    return done(s, now, 2000);
  }
  if (kind === 'company') { log(s, `🏢 ${p.name} 付給 ${o.name} ${money(paid)}　${why}`); return done(s, now, 2000); }
  log(s, `${st.b ? BIG[st.b].icon : '🏗️'} ${p.name} 付給 ${o.name} ${money(paid)}　${why}`);
  if (paid && st.b === 'lab') addPts(o, 20);
  if (paid && st.b === 'park') addPts(o, 10 * (st.bl || 1));
  if (paid && st.b === 'mall') { const bonus = r10(paid * 0.1); gain(s, o, bonus); }
  bigAfter(s, p, st);
  done(s, now, 2000);
}
function bigAfter(s, p, st) {
  if (st.b === 'fun' && !p.out) { log(s, `🎡 ${p.name} 在遊樂園玩得很開心`); giveCard(s, p); }
  if (st.b === 'hotel' && !p.out && !hasGod(p, 'mazu')) { p.st.sleep = Math.max(p.st.sleep, 1); log(s, `🏨 ${p.name} 在度假飯店住一晚，休息一回合`); }
}
function sellOne(s, p, a) {
  if (a.tile != null) {
    const i = a.tile | 0, st = s.tiles[i];
    if (!st || st.o !== p.id) return '這不是你的地';
    const v = sellValue(s, i);
    mgBreak(s, i); p.cash += v; st.o = null; st.l = 0; st.b = null; st.bl = 0;
    fx(s, { k: 'money', pid: p.id, d: v }); fx(s, { k: 'sold', tile: i, pid: p.id });
    log(s, `🏚️ ${p.name} 變賣 ${TILES[i].name} 得 ${money(v)}`);
    return null;
  }
  const k = a.stock | 0;
  if (!(p.stocks[k] > 0)) return '你沒有這支股票';
  const v = Math.round(p.stocks[k] * s.market[k].p);
  p.cash += v; p.stocks[k] = 0; fx(s, { k: 'money', pid: p.id, d: v });
  log(s, `📈 ${p.name} 賣出 ${STOCKS[k].name} 股票得 ${money(v)}`);
  return null;
}

function landCompany(s, p, i, now) {
  const st = s.tiles[i], t = TILES[i];
  if (st.o == null) { if (p.cash >= price(s, i)) return ask(s, { type: 'buy', tile: i }, now); return done(s, now); }
  if (st.o === p.id) { log(s, `🏢 ${p.name} 視察自己的${t.name}`); return done(s, now); }
  const o = pl(s, st.o);
  const fee = ownerFee(s, p, o, companyFee(s, i, s.lastDice), t.name);
  if (!fee) return done(s, now, 1500);
  return charge(s, p, o, i, fee, 'company', now);
}
function landBig(s, p, i, now) {
  const st = s.tiles[i], t = TILES[i];
  if (st.o == null) { if (p.cash >= price(s, i)) return ask(s, { type: 'buy', tile: i }, now); return done(s, now); }
  if (st.o === p.id) {
    if (!st.b) { if (p.cash >= BIG.park.cost || hasGod(p, 'fushen')) return ask(s, { type: 'bigbuild', tile: i }, now); return done(s, now); }
    if (st.b === 'lab') { log(s, `🔬 研究所研發出新道具！`); giveCard(s, p); }
    if (st.b === 'gas' || st.b === 'hotel' || st.b === 'park') { log(s, `${BIG[st.b].icon} ${p.name} 在自己的${BIG[st.b].name}休息，點券 +15`); addPts(p, 15); }
    if ((st.bl || 1) < BIG_MAX && (p.cash >= bigUpCost(s, i) || hasGod(p, 'fushen'))) return ask(s, { type: 'bigup', tile: i }, now);
    return done(s, now, 1200);
  }
  const o = pl(s, st.o);
  const fee = ownerFee(s, p, o, bigFee(s, i), t.name);
  if (!fee) { bigAfter(s, p, st); return done(s, now, 1500); }
  return charge(s, p, o, i, fee, 'big', now);
}
// 拍賣：放棄購買的土地，大家出價
function startAuction(s, i, seller, now) {
  const bidders = alive(s).filter(o => o.id !== seller && o.cash >= Math.round(price(s, i) * 0.5));
  if (!bidders.length) return false;
  s.auction = { tile: i, seller, min: r100(price(s, i) * 0.5), best: null, until: now + 8000, bots: {} };
  bidders.forEach(o => { if (o.bot) s.auction.bots[o.id] = r100(price(s, i) * (0.7 + Math.random() * 0.5)); });
  s.step = 'auction'; s.pending = null;
  log(s, `🔨 ${TILES[i].name} 開始拍賣！底價 ${money(s.auction.min)}`);
  fx(s, { k: 'notice', kind: 'chance', title: '🔨 土地拍賣', text: `${TILES[i].name} 底價 ${money(s.auction.min)}，大家快出價！` });
  return true;
}
function bid(s, pid, amt, now) {
  const a = s.auction; if (!a) return '沒有拍賣';
  const p = pl(s, pid); if (!p || p.out || pid === a.seller) return '你不能出價';
  const need = a.best ? a.best.amt + 1000 : a.min;
  amt = r100(amt); if (amt < need) return `至少要出 ${money(need)}`;
  if (amt > p.cash) return '現金不足';
  a.best = { pid, amt }; a.until = Math.max(a.until, now + 3000);
  log(s, `🔨 ${p.name} 出價 ${money(amt)}`);
  return null;
}
function endAuction(s, now) {
  const a = s.auction; s.auction = null;
  if (a.best) {
    const p = pl(s, a.best.pid);
    if (p && !p.out && p.cash >= a.best.amt) {
      p.cash -= a.best.amt; s.tiles[a.tile].o = p.id;
      fx(s, { k: 'money', pid: p.id, d: -a.best.amt }); fx(s, { k: 'buy', tile: a.tile, pid: p.id });
      log(s, `🔨 成交！${p.name} 以 ${money(a.best.amt)} 標下 ${TILES[a.tile].name}`);
    }
  } else log(s, `🔨 ${TILES[a.tile].name} 流標了`);
  done(s, now, 1200);
}
function drawLotto(s) {
  const L = s.lotto, n = 1 + rnd(20), win = L.tix.filter(x => x.num === n);
  if (win.length) {
    const each = r10(L.pool / win.length);
    win.forEach(x => { const p = pl(s, x.pid); if (p && !p.out) gain(s, p, each); });
    const names = win.map(x => (pl(s, x.pid) || {}).name).join('、');
    log(s, `🎰 樂透開獎：${n} 號！${names} 中獎，各得 ${money(each)}`);
    fx(s, { k: 'notice', kind: 'god', title: '🎰 樂透開獎', text: `頭獎 ${n} 號！${names} 各得 ${money(each)}` });
    L.pool = 50000;
  } else {
    log(s, `🎰 樂透開獎：${n} 號，沒有人中獎，彩金累積到 ${money(L.pool + 20000)}`);
    fx(s, { k: 'notice', kind: 'chance', title: '🎰 樂透開獎', text: `${n} 號，槓龜！彩金累積到 ${money(L.pool + 20000)}` });
    L.pool += 20000;
  }
  L.last = n; L.tix = [];
}

// ---------- 機會 / 新聞 / 神明 ----------
// 抽牌：整副洗牌、抽完才重洗，不會一直抽到同一張
function draw(s, key, n) {
  s.decks = s.decks || {};
  let d = s.decks[key];
  if (!d || !d.length || d.some(i => i >= n)) { d = [...Array(n).keys()]; for (let i = d.length - 1; i > 0; i--) { const j = rnd(i + 1); [d[i], d[j]] = [d[j], d[i]]; } }
  const i = d.pop(); s.decks[key] = d; return i;
}
const ownProps = (s, p) => TILES.map((t, i) => (t.type === 'prop' && s.tiles[i].o === p.id ? i : -1)).filter(i => i >= 0);
const mapGroups = () => [...new Set(TILES.filter(t => t && t.type === 'prop').map(t => t.g))];
function setGod(s, p, id, t) { if (!GODS[id].good && hasGod(p, 'mazu')) return false; p.god = { id, t }; fx(s, { k: 'emote', pid: p.id, e: GODS[id].icon }); return true; }
const CHANCE = [
  { t: '統一發票中了二獎！', f: (s, p) => gain(s, p, 40000) },
  { t: '在夜市擺攤大賺一筆', f: (s, p) => gain(s, p, 15000) },
  { t: '颳中刮刮樂頭獎！', f: (s, p) => gain(s, p, 60000), w: 0.5 },
  { t: '參加路跑，獲得點券 30 點', f: (s, p) => { addPts(p, 30); } },
  { t: '朋友送你一張道具卡', f: (s, p) => giveCard(s, p) },
  { t: '生日快樂！每位玩家送你 $5,000', f: (s, p) => alive(s).forEach(o => { if (o !== p) pay(s, o, p, 5000); }) },
  { t: '請大家喝珍奶，每人付 $3,000', bad: 1, f: (s, p) => alive(s).forEach(o => { if (o !== p && !p.out) pay(s, p, o, 3000, '機會：請喝珍奶'); }) },
  { t: '違規停車，罰單 $12,000', bad: 1, f: (s, p) => pay(s, p, null, 12000) },
  { t: '繳交房屋稅：每層樓 $2,500', bad: 1, f: (s, p) => { let n = 0; s.tiles.forEach(t => { if (t && t.o === p.id) n += t.l; }); pay(s, p, null, n * 2500); } },
  { t: '吃太多鹹酥雞拉肚子，住院 1 回合', bad: 1, f: (s, p) => sendHospital(s, p, 1), stop: 1 },
  { t: '騎車闖紅燈被警察攔下，拘留 2 回合', bad: 1, f: (s, p) => sendJail(s, p, 2), stop: 1 },
  { t: '搭高鐵回台北，領環島獎金！', f: (s, p) => { teleport(s, p, 0); gain(s, p, SALARY); addPts(p, 10); }, stop: 1 },
  { t: '廟口捐香油錢 $5,000，點券 +25', f: (s, p) => { pay(s, p, null, 5000); addPts(p, 25); } },
  { t: '股票配息：持股市值 8%', f: (s, p) => gain(s, p, r10(stockValue(s, p) * 0.08)) },
  { t: '搭上順風車，前進 3 格', f: (s, p) => ({ move: 3 }) },
  { t: '忘了帶錢包，回頭走 2 格', bad: 1, f: (s, p) => { p.dir *= -1; return { move: 2, flip: 1 }; } },
  { t: '颱風天在家追劇，什麼事也沒發生', f: () => {} },
  { t: '車子被偷了！只好走路', bad: 1, f: (s, p) => { p.veh = 0; } },
  { t: '抽中機車一台！', f: (s, p) => { if (p.veh < 1) p.veh = 1; } },
  { t: '統一發票中了千萬特別獎！獎金 $100,000', f: (s, p) => gain(s, p, 100000) },
  { t: '過年回阿嬤家，紅包收到 $20,000', f: (s, p) => gain(s, p, 20000) },
  { t: '幫鄰居顧雜貨店，賺 $8,000 和點券 15 點', f: (s, p) => { gain(s, p, 8000); addPts(p, 15); } },
  { t: '手搖飲集點集滿了，換到 2 張道具卡', f: (s, p) => { giveCard(s, p); giveCard(s, p); } },
  { t: '跨年晚會被拍上電視，點券 +50', f: (s, p) => addPts(p, 50) },
  { t: '去墾丁衝浪曬傷了，住院 1 回合', bad: 1, f: (s, p) => sendHospital(s, p, 1), stop: 1 },
  { t: '打卡送優惠券，開心前進 2 格', f: () => ({ move: 2 }) },
  { t: '接到假冒客服的詐騙電話，被騙走 $20,000', bad: 1, f: (s, p) => pay(s, p, null, 20000) },
  { t: '繳交牌照稅：機車 $3,000、汽車 $8,000', bad: 1, f: (s, p) => pay(s, p, null, p.veh >= 2 ? 8000 : p.veh >= 1 ? 3000 : 0) },
  { t: '政府老屋修繕補助：你的一塊地免費加蓋一層', f: (s, p) => { const a = ownProps(s, p).filter(i => s.tiles[i].l < 5 && !s.tiles[i].mg); if (a.length) { const i = pick(a); s.tiles[i].l++; fx(s, { k: 'build', tile: i, pid: p.id }); return; } gain(s, p, 10000); } },
  { t: '地震搖了一下，你的一塊地房子倒一層', bad: 1, f: (s, p) => { const a = ownProps(s, p).filter(i => s.tiles[i].l > 0 && !s.tiles[i].mg); if (a.length && !hasSkill(p, 'armor')) { const i = pick(a); s.tiles[i].l--; fx(s, { k: 'boom', tile: i, m: 'quake' }); } } },
  { t: '遠房親戚留給你一塊地！', f: (s, p) => { const a = TILES.map((t, i) => (t.type === 'prop' && s.tiles[i].o == null ? i : -1)).filter(i => i >= 0); if (a.length) { const i = pick(a); s.tiles[i].o = p.id; s.tiles[i].l = 0; fx(s, { k: 'buy', tile: i, pid: p.id }); log(s, `🏠 ${p.name} 繼承了 ${TILES[i].name}`); return; } gain(s, p, 30000); } },
  { t: '搭捷運坐過站，往回走 3 格', bad: 1, f: (s, p) => { p.dir *= -1; return { move: 3, flip: 1 }; } },
  { t: '去廟裡擲到聖筊，財神附身 3 回合！', f: (s, p) => { setGod(s, p, 'caishen', 3); } },
  { t: '熬夜追劇精神不濟，在原地休息 1 回合', bad: 1, f: (s, p) => { p.st.sleep = Math.max(p.st.sleep, 1); } },
  { t: '搭飛機說走就走，飛到隨機一個地方！', f: (s, p) => { const a = TILES.map((t, i) => (t.type === 'prop' || t.type === 'chance' || t.type === 'shop' ? i : -1)).filter(i => i >= 0 && i !== p.pos); teleport(s, p, pick(a)); return { land: 1 }; }, stop: 1 },
  { t: '全民運動會拿到金牌！每位玩家送你 $3,000', f: (s, p) => alive(s).forEach(o => { if (o !== p) pay(s, o, p, 3000, '機會：運動會金牌賀禮'); }) },
  { t: '夏天冷氣開太兇，電費 $8,000', bad: 1, f: (s, p) => pay(s, p, null, 8000) },
  { t: '撿到錢包交給警察，好人有好報：$5,000 和點券 40', f: (s, p) => { gain(s, p, 5000); addPts(p, 40); } },
  { t: '跟風投資虛擬幣慘賠，損失現金 15%', bad: 1, f: (s, p) => pay(s, p, null, r10(p.cash * 0.15)) },
  { t: '銀行加碼優惠，你的存款增加 20%', f: (s, p) => { const add = r10(p.deposit * 0.2); p.deposit += add; if (add) fx(s, { k: 'money', pid: p.id, d: add }); } },
  { t: '公司尾牙抽中頭獎 $30,000！', f: (s, p) => gain(s, p, 30000) },
  { t: '被野狗追，一路狂奔 5 格', f: () => ({ move: 5 }) },
  { t: '換購電動機車，交通工具升級！', f: (s, p) => { if (p.veh < 1) p.veh = 1; else gain(s, p, 5000); } },
  { t: '颱風天搶購泡麵，花了 $4,000', bad: 1, f: (s, p) => pay(s, p, null, 4000) },
  { t: '在路邊攤吃到超好吃的蚵仔煎，心情好點券 +20', f: (s, p) => addPts(p, 20) },
  { t: '被選為里長伯的助手，下次過路費免付（獲得免費卡）', f: (s, p) => { if (p.cards.length < cardLimit(p)) { p.cards.push('free'); fx(s, { k: 'card', pid: p.id, card: 'free', got: 1 }); } } },
  { t: '健身房年費到期續約 $10,000', bad: 1, f: (s, p) => pay(s, p, null, 10000) },
];
function chance(s, p, now) {
  const c = CHANCE[draw(s, 'chance', CHANCE.length)];
  fx(s, { k: 'notice', kind: 'chance', title: '機會', text: c.t, pid: p.id });
  log(s, `❓ ${p.name}：${c.t}`);
  if (c.bad && hasGod(p, 'mazu')) { log(s, `🙏 媽祖保佑，${p.name} 逢凶化吉`); return done(s, now, 2200); }
  s.chanceCtx = p.id;
  const r = c.f(s, p) || {};
  s.chanceCtx = null;
  if (p.out) return done(s, now, 2000);
  if (r.land) { s.step = 'done'; s.until = now + 1800; s.landAfter = true; return; }
  if (r.move) {
    s.until = 0;
    startMove(s, p, r.move, now + 1600, null);
    s.anim.t0 = now + 1600; s.until = now + 1600 + s.anim.dur;
    if (r.flip) s.flipBack = p.id;
    return;
  }
  done(s, now, 2400);
}

const NEWS = [
  { t: '中央銀行升息！所有人存款增加 10%', f: s => alive(s).forEach(p => { p.deposit = r10(p.deposit * 1.1); }) },
  { t: '政府發放振興券，每人 $20,000', f: s => alive(s).forEach(p => gain(s, p, 20000)) },
  { t: '繳交所得稅，每人繳現金 10%', f: s => alive(s).forEach(p => { if (!hasGod(p, 'mazu') && !hasSkill(p, 'rainy')) pay(s, p, null, r10(p.cash * 0.1)); }) },
  { t: '國旅補助！每人獲得一張道具卡', f: s => alive(s).forEach(p => giveCard(s, p)) },
  { t: '股市大漲！所有股價上漲 20%', f: s => s.market.forEach(m => { m.p = Math.round(m.p * 12) / 10; m.h.push(m.p); }) },
  { t: '股市重挫！所有股價下跌 25%', f: s => s.market.forEach(m => { m.p = Math.max(2, Math.round(m.p * 7.5) / 10); m.h.push(m.p); }) },
  { t: '健保補助，住院中的玩家全部出院', f: s => alive(s).forEach(p => { p.st.hosp = 0; }) },
  { t: '最富有的玩家捐出 10% 現金給最窮的玩家', f: s => {
    const a = alive(s).sort((x, y) => assets(s, y) - assets(s, x));
    if (a.length < 2) return '';
    const rich = a[0], poor = a[a.length - 1], amt = r10(rich.cash * 0.1);
    const paid = pay(s, rich, poor, amt, '新聞：富人捐給窮人');
    return `💰 ${rich.name}（最富有）➜ ${poor.name}（最窮）${money(paid)}`;
  } },
  { t: '物價上漲！每位玩家多付生活費 $5,000', f: s => alive(s).forEach(p => { if (!hasGod(p, 'mazu')) pay(s, p, null, 5000); }) },
  { t: '年終獎金發放！每人領 $15,000', f: s => alive(s).forEach(p => gain(s, p, 15000)) },
  { t: '颱風假放一天，大家在家休息，點券各 +20', f: s => alive(s).forEach(p => addPts(p, 20)) },
  { t: '政府打炒房！全台過路費打 8 折，持續 3 回合', f: s => { s.allMod = { m: 0.8, r: 3 }; } },
  { t: '國際觀光客暴增！全台過路費 ×1.3，持續 3 回合', f: s => { s.allMod = { m: 1.3, r: 3 }; } },
  { t: '半導體股大漲！', f: s => { const k = rnd(s.market.length), m = s.market[k]; m.p = Math.round(m.p * 15) / 10; m.h.push(m.p); return `📈 ${STOCKS[k].name} 股價漲 50%`; } },
  { t: '某產業爆出醜聞，股價崩跌！', f: s => { const k = rnd(s.market.length), m = s.market[k]; m.p = Math.max(2, Math.round(m.p * 6) / 10); m.h.push(m.p); return `📉 ${STOCKS[k].name} 股價跌 40%`; } },
  { t: '流感大流行！', f: s => { const a = alive(s).filter(p => !hasGod(p, 'mazu')); if (!a.length) return ''; const p = pick(a); sendHospital(s, p, 1); return `🤧 ${p.name} 中標住院 1 回合`; } },
  { t: '大樂透連槓！彩金池增加 $50,000', f: s => { s.lotto.pool += 50000; } },
  { t: '政府普發現金！每人 $30,000', f: s => alive(s).forEach(p => gain(s, p, 30000)) },
  { t: '地價稅開徵，每塊土地繳 $2,000', f: s => { const out = []; alive(s).forEach(p => { const n = s.tiles.filter(t => t && t.o === p.id).length; if (n && !hasGod(p, 'mazu')) { pay(s, p, null, n * 2000); out.push(`${p.name} ${n} 塊 ${money(n * 2000)}`); } }); return out.join('、'); } },
  { t: '慈善晚會，每人捐 $5,000 進樂透彩金', f: s => alive(s).forEach(p => { const v = Math.min(5000, p.cash); p.cash -= v; s.lotto.pool += v; if (v) fx(s, { k: 'money', pid: p.id, d: -v }); }) },
  { t: '窮神出巡，盯上了最有錢的人！', f: s => { const a = alive(s).sort((x, y) => assets(s, y) - assets(s, x)); if (!a.length) return ''; const p = a[0]; return setGod(s, p, 'qiong', 3) ? `💸 ${p.name} 被窮神附身 3 回合` : `🙏 ${p.name} 有媽祖保佑，窮神進不來`; } },
  { t: '財神出巡，照顧最窮的人！', f: s => { const a = alive(s).sort((x, y) => assets(s, x) - assets(s, y)); if (!a.length) return ''; const p = a[0]; setGod(s, p, 'caishen', 3); return `💰 ${p.name} 被財神附身 3 回合`; } },
  { t: '中元普渡，大家準備供品，每人付 $3,000、點券 +15', f: s => alive(s).forEach(p => { pay(s, p, null, 3000); addPts(p, 15); }) },
  { tg: 1, t: g => `都市更新通過！${GROUPS[g].name}的房子各加蓋一層`, f: (s, g) => { TILES.forEach((t, i) => { const st = s.tiles[i]; if (t.g === g && st.o != null && st.l < 5 && !st.mg) st.l++; }); } },
  { tg: 1, t: g => `捷運新路線通車！${GROUPS[g].name}地價永久上漲 30%`, f: (s, g) => { s.gprice[g] = (s.gprice[g] || 1) * 1.3; } },
  { tg: 1, t: g => `觀光熱潮！${GROUPS[g].name}過路費 ×1.6，持續 4 回合`, f: (s, g) => { s.gmod[g] = { m: 1.6, r: 4 }; } },
  { tg: 1, t: g => `景氣低迷，${GROUPS[g].name}過路費減半，持續 4 回合`, f: (s, g) => { s.gmod[g] = { m: 0.5, r: 4 }; } },
  { tg: 1, t: g => `重大建設通車！${GROUPS[g].name}地價永久上漲 20%`, f: (s, g) => { s.gprice[g] = (s.gprice[g] || 1) * 1.2; } },
  { tg: 1, t: g => `颱風過境${GROUPS[g].name}，區內房子各倒一層`, f: (s, g) => { TILES.forEach((t, i) => { const st = s.tiles[i]; if (t.g === g && st.l > 0 && !hasSkill(pl(s, st.o), 'armor') && !hasSkill(pl(s, st.o), 'rainy')) st.l--; }); } },
];
function news(s, p, now) {
  const n = NEWS[draw(s, 'news', NEWS.length)];
  let text;
  if (n.tg) { const g = pick(mapGroups()); text = n.t(g); n.f(s, g); }
  else { text = n.t; const extra = n.f(s); if (extra) text += '\n' + extra; }
  fx(s, { k: 'notice', kind: 'news', title: '新聞快報', text, pid: p.id });
  log(s, `📰 ${text.replace('\n', '：')}`);
  done(s, now, 2600);
}
function giveCard(s, p) {
  if (p.cards.length >= cardLimit(p)) return;
  const c = pick(CARD_IDS); p.cards.push(c);
  fx(s, { k: 'card', pid: p.id, card: c, got: 1 });
  log(s, `🃏 ${p.name} 獲得「${CARDS[c].name}」`);
}
function temple(s, p, now) {
  const pool = ['caishen', 'caishen', 'fushen', 'fushen', 'tudi', 'tudi', 'mazu', 'angel', 'shuai', 'shuai', 'qiong', 'devil'];
  const id = pick(pool), g = GODS[id];
  if (!g.good && hasSkill(p, 'elder')) {
    log(s, `🦦 好運水獺！${g.name}不敢附身在 ${p.name} 身上`);
    fx(s, { k: 'notice', kind: 'god', title: '好運水獺', text: `${g.icon}${g.name}被趕走了`, pid: p.id });
    return done(s, now, 2200);
  }
  if (!g.good && hasGod(p, 'mazu')) {
    log(s, `🙏 ${g.name}想附身，被媽祖擋下了！`);
    fx(s, { k: 'notice', kind: 'god', title: '媽祖保佑', text: `${g.icon}${g.name}被擋在廟外`, pid: p.id });
    return done(s, now, 2200);
  }
  const dur = 5 + (hasSkill(p, 'divine') ? 2 : 0);
  p.god = { id, t: dur };
  fx(s, { k: 'notice', kind: g.good ? 'god' : 'evil', title: `${g.icon} ${g.name}附身`, text: `${p.name}：${g.desc}（${dur} 回合）`, pid: p.id });
  log(s, `${g.icon} ${g.name}附身在 ${p.name} 身上！${g.desc}`);
  done(s, now, 2400);
}

const MAGIC = [
  { t: '咻～被傳送到隨機景點！', f: (s, p, now) => { const props = TILES.map((x, i) => (x.type === 'prop' ? i : -1)).filter(i => i >= 0); teleport(s, p, pick(props)); return 'land'; } },
  { t: '和隨機一位對手交換位置！', f: (s, p) => { const o = pick(alive(s).filter(x => x !== p)); if (o) { const a = p.pos; teleport(s, p, o.pos); teleport(s, o, a); return o.name; } } },
  { t: '所有對手被施了定身術，停一回合', f: (s, p) => alive(s).forEach(o => { if (o !== p && !hasGod(o, 'mazu')) o.st.sleep = Math.max(o.st.sleep, 1); }) },
  { t: '隨機一位對手變成烏龜 3 回合', f: (s, p) => { const o = pick(alive(s).filter(x => x !== p && !hasGod(x, 'mazu'))); if (o) o.st.turtle = 3; } },
  { t: '點券加倍！', f: (s, p) => { p.points += Math.min(p.points, 100); } },
  { t: '對手的一張道具卡飛到你手上', f: (s, p) => { const o = pick(alive(s).filter(x => x !== p && x.cards.length)); if (o && p.cards.length < cardLimit(p)) p.cards.push(o.cards.splice(rnd(o.cards.length), 1)[0]); } },
];
function magic(s, p, now) {
  const m = hasSkill(p, 'magicfan') ? pick([MAGIC[2], MAGIC[3], MAGIC[4], MAGIC[5]]) : pick(MAGIC);
  fx(s, { k: 'notice', kind: 'god', title: '🔮 魔法屋', text: m.t, pid: p.id });
  log(s, `🔮 ${p.name}：${m.t}`);
  const r = m.f(s, p, now);
  if (r === 'land') { s.step = 'done'; s.until = now + 1800; s.landAfter = true; return; }
  done(s, now, 2400);
}

// ---------- 動作 ----------
export function act(s, pid, a, now) {
  if (!a || !a.type) return '無效動作';
  if (a.type === 'emote') {
    const p = pl(s, pid); if (!p) return 'x';
    fx(s, { k: 'emote', pid, e: String(a.e).slice(0, 4) }); return null;
  }
  if (s.phase !== 'play') return '遊戲未進行';
  if (a.type === 'leave') {
    const q = pl(s, pid); if (!q || !q.out || q.left) return null;
    q.left = true; log(s, `🚪 ${q.name} 離開了房間`); return null;
  }
  if (a.type === 'away') {
    const q = pl(s, pid); if (!q || q.out) return '無效';
    q.away = !!a.on;
    log(s, q.away ? `☕ ${q.name} 暫時離開，由電腦代打` : `👋 ${q.name} 回來了！`);
    fx(s, { k: 'emote', pid, e: q.away ? '☕' : '👋' });
    return null;
  }
  if (a.type === 'bid') return s.step === 'auction' ? bid(s, pid, a.amount, now) : '沒有拍賣';
  const p = cur(s);
  if (!p || p.id !== pid) return '還沒輪到你';
  if (s.step === 'pre') {
    if (a.type === 'roll') return doRoll(s, p, now);
    if (a.type === 'card') return useCard(s, p, a, now);
    if (a.type === 'stock') return doStock(s, p, a);
    if (a.type === 'bank') {
      if (!p.bankOk) return '要經過或停在銀行才能存提款';
      let amt = Math.round(a.amount || 0);
      if (amt > 0) { amt = Math.min(amt, p.cash); p.cash -= amt; p.deposit += amt; log(s, `🏦 ${p.name} 存入 ${money(amt)}`); }
      else if (amt < 0) { amt = Math.min(-amt, p.deposit); p.deposit -= amt; p.cash += amt; log(s, `🏦 ${p.name} 提領 ${money(amt)}`); }
      return null;
    }
    return '現在不能這樣做';
  }
  if (a.type === 'end' && s.step === 'done') { s.until = 0; return null; }
  if (s.step !== 'decide' || !s.pending) return '現在不能這樣做';
  const pd = s.pending;
  switch (pd.type) {
    case 'sell': {
      const o = pl(s, pd.to);
      if (a.type === 'sell') {
        const e = sellOne(s, p, a); if (e) return e;
        if (p.cash < pd.amt && sellables(s, p).total > 0) { ask(s, { ...pd }, now); return null; }
      }
      // 現金夠了、或交給電腦自動變賣、或時間到
      settle(s, p, o, pd.tile, pd.amt, pd.kind, pd.why, now);
      return null;
    }
    case 'buy': {
      if (a.type === 'yes') {
        const c = price(s, pd.tile);
        if (p.cash < c) return '現金不足';
        p.cash -= c; s.tiles[pd.tile].o = p.id;
        log(s, `🏠 ${p.name} 買下 ${TILES[pd.tile].name}（${money(c)}）`);
        fx(s, { k: 'buy', tile: pd.tile, pid: p.id }); fx(s, { k: 'money', pid: p.id, d: -c });
        return done(s, now, 500), null;
      }
      if (s.settings.auction !== false && startAuction(s, pd.tile, p.id, now)) return null;
      return done(s, now, 500), null;
    }
    case 'car': {
      if (a.type === 'veh') {
        const v = a.v | 0; if (v <= p.veh || v > 2) return '無效';
        if (p.cash < VEH[v].price) return '現金不足';
        p.cash -= VEH[v].price; p.veh = v; fx(s, { k: 'money', pid: p.id, d: -VEH[v].price });
        log(s, `${VEH[v].icon} ${p.name} 買了${VEH[v].name}，之後擲 ${VEH[v].dice} 顆骰子！`);
      }
      return done(s, now, 500), null;
    }
    case 'bigbuild': {
      if (a.type === 'build') {
        const b = BIG[a.kind]; if (!b) return '無效';
        const c = hasGod(p, 'fushen') ? 0 : b.cost; if (p.cash < c) return '現金不足';
        p.cash -= c; s.tiles[pd.tile].b = a.kind; s.tiles[pd.tile].bl = 1; if (c) fx(s, { k: 'money', pid: p.id, d: -c });
        fx(s, { k: 'build', tile: pd.tile, pid: p.id });
        log(s, `${b.icon} ${p.name} 在 ${TILES[pd.tile].name} 蓋了${b.name}`);
      }
      return done(s, now, 500), null;
    }
    case 'bigup': {
      if (a.type === 'yes') {
        const st = s.tiles[pd.tile], c = hasGod(p, 'fushen') ? 0 : bigUpCost(s, pd.tile);
        if (p.cash < c) return '現金不足';
        if ((st.bl || 1) >= BIG_MAX) return '已經最高級';
        p.cash -= c; st.bl = (st.bl || 1) + 1; if (c) fx(s, { k: 'money', pid: p.id, d: -c });
        fx(s, { k: 'build', tile: pd.tile, pid: p.id });
        log(s, `${BIG[st.b].icon} ${p.name} 把${BIG[st.b].name}擴建到 ${st.bl} 級！收費提高`);
      }
      return done(s, now, 500), null;
    }
    case 'minigame': {
      const sc = a.type === 'mg' ? Math.max(0, Math.min(60, a.score | 0)) : 0;
      addPts(p, sc);
      log(s, `🕹️ ${p.name} 玩接金幣，得到 ${sc} 點券`);
      fx(s, { k: 'notice', kind: 'god', title: '🕹️ 小遊戲', text: `${p.name} 接到 ${sc} 枚金幣，點券 +${sc}` });
      return done(s, now, 1600), null;
    }
    case 'mgup': {
      if (a.type === 'yes') {
        const st = s.tiles[pd.tile], m = st.mg; if (!m || m.lv >= MG_MAX) return '已經最高級';
        const c = mgUpCost(s, pd.tile); if (p.cash < c) return '現金不足';
        p.cash -= c; mgSet(s, m.ts, { ...m, lv: m.lv + 1, inv: (m.inv || 0) + c });
        log(s, `${MG[m.k].icon} ${p.name} 把${MG[m.k].name}擴建到 ${m.lv + 1} 級（${money(c)}）`);
        fx(s, { k: 'build', tile: pd.tile, pid: p.id, mg: 1 }); fx(s, { k: 'money', pid: p.id, d: -c });
      }
      return done(s, now, 600), null;
    }
    case 'upgrade': {
      if (a.type === 'merge') {
        const ts = pd.merge, k = a.kind;
        if (!ts || !MG[k]) return '無效';
        if (!ts.every(j => s.tiles[j].o === p.id && !s.tiles[j].mg)) return '土地已經變動';
        const c = mgBuildCost(s, ts, k); if (p.cash < c) return '現金不足';
        const inv = c + ts.reduce((a2, j) => a2 + s.tiles[j].l * upCost(s, j), 0) * 0.5;
        p.cash -= c; mgSet(s, ts, { k, lv: 1, inv: Math.round(inv) });
        log(s, `${MG[k].icon} ${p.name} 把 ${ts.map(j => TILES[j].name).join('、')} 合併蓋成${MG[k].name}！（${money(c)}）`);
        ts.forEach(j => fx(s, { k: 'build', tile: j, pid: p.id, mg: 1 })); if (c) fx(s, { k: 'money', pid: p.id, d: -c });
        fx(s, { k: 'notice', kind: 'god', title: `${MG[k].icon} 合併建設完成`, text: `${p.name} 的 ${ts.length} 塊地合併成${MG[k].name}\n${MG[k].desc}`, pid: p.id });
        return done(s, now, 1500), null;
      }
      if (a.type === 'yes') {
        const st = s.tiles[pd.tile];
        const n = Math.max(1, Math.min(2, a.n | 0 || 1, 5 - st.l));
        const c = upCostFor(s, pd.tile, p) * n;
        if (p.cash < c) return '現金不足';
        if (st.l >= 5) return '已經最高級';
        p.cash -= c; st.l += n;
        log(s, `🏗️ ${p.name} 把 ${TILES[pd.tile].name} 蓋成${LEVEL_NAMES[st.l]}${c ? `（${money(c)}）` : '（福神免費）'}`);
        fx(s, { k: 'build', tile: pd.tile, pid: p.id }); if (c) fx(s, { k: 'money', pid: p.id, d: -c });
      }
      return done(s, now, 500), null;
    }
    case 'shop': {
      if (a.type === 'buyCard') {
        const c = CARDS[a.card]; if (!c) return '沒有這張卡';
        const cc = cardCost(p, a.card);
        if (p.points < cc) return '點券不足';
        if (p.cards.length >= cardLimit(p)) return `道具卡最多 ${cardLimit(p)} 張`;
        p.points -= cc; p.cards.push(a.card);
        log(s, `🛍️ ${p.name} 買了「${c.name}」`);
        s.deadline = now + DEC_T; s.botAt = now + 600;
        return null;
      }
      if (hasSkill(p, 'network')) { log(s, `🤝 ${p.name} 人脈廣，老闆多送一張卡`); giveCard(s, p); }
      return done(s, now, 500), null;
    }
    case 'lottery': {
      if (a.type === 'pick') {
        const num = Math.max(1, Math.min(20, a.num | 0));
        if (p.cash < 5000) return '現金不足';
        p.cash -= 5000; s.lotto.pool += 5000; s.lotto.tix.push({ pid: p.id, num });
        fx(s, { k: 'money', pid: p.id, d: -5000 });
        log(s, `🎰 ${p.name} 買了 ${num} 號樂透（彩金 ${money(s.lotto.pool)}，${7 - (s.round % 7)} 天後開獎）`);
      }
      return done(s, now, 500), null;
    }
    case 'bank': {
      if (a.type === 'bank') {
        let amt = Math.round(a.amount || 0);
        if (amt > 0) { amt = Math.min(amt, p.cash); p.cash -= amt; p.deposit += amt; log(s, `🏦 ${p.name} 存入 ${money(amt)}`); }
        else if (amt < 0) { amt = Math.min(-amt, p.deposit); p.deposit -= amt; p.cash += amt; log(s, `🏦 ${p.name} 提領 ${money(amt)}`); }
        pd.did = (pd.did || 0) + 1;
        s.deadline = now + DEC_T; s.botAt = now + 600;
        return null;
      }
      return done(s, now, 500), null;
    }
  }
  return '無效動作';
}

function doRoll(s, p, now) {
  p.bankOk = false;
  if (p.stay) {
    p.stay = false;
    log(s, `🛑 ${p.name} 原地停留`);
    s.anim = { pid: p.id, path: [p.pos], t0: now, dice: null, dur: 300 };
    s.moveInfo = { pass: 0, mark: null }; s.step = 'move'; s.until = now + 300;
    return null;
  }
  const n = diceCount(s, p);
  let dice;
  if (p.remote) {
    let left = p.remote; dice = [];
    for (let k = n; k > 0; k--) { const v = Math.max(1, Math.min(6, left - (k - 1))); dice.push(v); left -= v; }
    p.remote = 0;
  } else dice = Array.from({ length: n }, () => 1 + rnd(6));
  let steps = dice.reduce((a, b) => a + b, 0);
  s.lastDice = steps;
  if (hasSkill(p, 'minstep') && steps < 3) steps = 3;
  if (hasSkill(p, 'swift')) steps += 1;
  if (p.st.turtle > 0) { p.st.turtle--; steps = 1; log(s, `🐢 ${p.name} 被烏龜卡影響，只能走 1 步`); }
  log(s, `🎲 ${p.name} 擲出 ${dice.join('+')}${dice.length > 1 ? '=' + dice.reduce((a, b) => a + b, 0) : ''}`);
  startMove(s, p, steps, now, dice);
  return null;
}

function doStock(s, p, a) {
  const k = a.sid | 0, q = Math.round(a.qty || 0);
  const m = s.market[k]; if (!m || !q) return '無效';
  if (q > 0) {
    const c = Math.round(m.p * q); if (c > p.cash) return '現金不足';
    p.cash -= c; p.stocks[k] += q; log(s, `📈 ${p.name} 買進 ${STOCKS[k].name} ${q} 股（${money(c)}）`);
  } else {
    const n = Math.min(-q, p.stocks[k]); if (!n) return '沒有持股';
    const c = Math.round(m.p * n); p.cash += c; p.stocks[k] -= n; log(s, `📉 ${p.name} 賣出 ${STOCKS[k].name} ${n} 股（${money(c)}）`);
  }
  return null;
}

export function cardTargets(s, p, card) {
  const c = CARDS[card];
  switch (c.target) {
    case 'player': return alive(s).filter(o => o !== p && !((card === 'tax' || card === 'turtle') && hasSkill(o, 'protected'))).map(o => o.id);
    case 'place': {
      const r = [];
      const R = hasSkill(p, 'range') ? 16 : 8;
      for (let i = 0; i < N_TILES; i++) if (i !== p.pos && dist(i, p.pos) <= R && !s.marks[i]) r.push(i);
      return r;
    }
    case 'godplayer': return alive(s).filter(o => o.god).map(o => o.id);
    case 'oppprop': return s.tiles.map((t, i) => (t && TILES[i].type === 'prop' && t.o && t.o !== p.id && (t.l > 0 || t.mg) ? i : -1)).filter(i => i >= 0);
    case 'myprop': return s.tiles.map((t, i) => (t && TILES[i].type === 'prop' && t.o === p.id && t.l < 5 && !t.mg ? i : -1)).filter(i => i >= 0);
    case 'here': { const t = s.tiles[p.pos]; return t && t.o && t.o !== p.id && p.cash >= propValue(s, p.pos) ? [p.pos] : []; }
    default: return null;
  }
}

function useCard(s, p, a, now) {
  const ci = p.cards.indexOf(a.card);
  if (ci < 0) return '你沒有這張卡';
  const c = CARDS[a.card];
  if (c.target === 'auto') return '這張卡會自動使用';
  const tg = cardTargets(s, p, a.card);
  if (tg && c.target !== 'godplayer' && !tg.includes(c.target === 'player' ? a.target : (c.target === 'here' ? p.pos : a.tile))) return '目標無效';
  if (c.target === 'godplayer' && !tg.includes(a.target)) return '目標無效';
  const tp = (c.target === 'player' || c.target === 'godplayer') ? pl(s, a.target) : null;
  const pre = `${c.icon} ${p.name} 使用「${c.name}」`;
  switch (a.card) {
    case 'remote': {
      const max = 6 * diceCount(s, p), min = diceCount(s, p);
      const v = a.value | 0; if (v < min || v > max) return '點數無效';
      p.remote = v; log(s, `${pre}，指定 ${v} 點`); break;
    }
    case 'block': case 'mine':
      s.marks[a.tile] = a.card; log(s, `${pre}，放在 ${TILES[a.tile].name}`); fx(s, { k: 'mark', tile: a.tile }); break;
    case 'equal': {
      const al = alive(s); const avg = r10(al.reduce((x, o) => x + o.cash, 0) / al.length);
      al.forEach(o => { fx(s, { k: 'money', pid: o.id, d: avg - o.cash }); o.cash = avg; });
      log(s, `${pre}，所有人現金變成 ${money(avg)}`); break;
    }
    case 'tax': {
      if (hasGod(tp, 'mazu')) { log(s, `${pre}，但 ${tp.name} 有媽祖保佑`); break; }
      const amt = r10(tp.cash * 0.25); tp.cash -= amt; fx(s, { k: 'money', pid: tp.id, d: -amt });
      log(s, `${pre}，${tp.name} 被查稅 ${money(amt)}`); break;
    }
    case 'rob': {
      if (!tp.cards.length) { log(s, `${pre}，可是 ${tp.name} 沒有卡`); break; }
      const n = hasSkill(p, 'rob2') ? 2 : 1, got = [];
      for (let q = 0; q < n && tp.cards.length; q++) { const k = rnd(tp.cards.length); const g = tp.cards.splice(k, 1)[0]; p.cards.push(g); got.push(CARDS[g].name); }
      log(s, `${pre}，從 ${tp.name} 搶走「${got.join('、')}」`);
      if (hasSkill(p, 'thief')) { const m = Math.min(10000, tp.cash); tp.cash -= m; gain(s, p, m); fx(s, { k: 'money', pid: tp.id, d: -m }); log(s, `🦡 ${p.name} 順手再偷走 ${money(m)}`); }
      break;
    }
    case 'sleep':
      alive(s).forEach(o => { if (o !== p && !hasGod(o, 'mazu')) o.st.sleep = 2; });
      log(s, `${pre}，其他人全部冬眠 2 回合！`); break;
    case 'buyland': {
      const i = p.pos, st = s.tiles[i], o = pl(s, st.o), v = propValue(s, i);
      mgBreak(s, i); p.cash -= v; o.cash += v; st.o = p.id;
      fx(s, { k: 'buy', tile: i, pid: p.id }); fx(s, { k: 'money', pid: p.id, d: -v }); fx(s, { k: 'money', pid: o.id, d: v });
      fx(s, { k: 'xfer', from: p.id, to: o.id, amt: v, why: `強制購買：${TILES[i].name}` });
      log(s, `${pre}，以 ${money(v)} 強制買下 ${o.name} 的 ${TILES[i].name}`); break;
    }
    case 'monster': {
      const st = s.tiles[a.tile]; fx(s, { k: 'boom', tile: a.tile, m: 'monster', big: 1 });
      if (hasSkill(pl(s, st.o), 'armor')) { log(s, `${pre}，但穿山甲的鱗甲擋住了！`); break; }
      if (st.mg) { log(s, `${pre}，${MG[st.mg.k].name}被怪獸踩爛了！`); mgDamage(s, a.tile, 9); break; }
      st.l = 0; log(s, `${pre}，${TILES[a.tile].name} 的房子全被摧毀！`); break;
    }
    case 'robot': {
      let n = 0; for (let k = 1; k <= 10; k++) { const i = (p.pos + p.dir * k + N_TILES * 2) % N_TILES; if (s.marks[i]) { delete s.marks[i]; n++; fx(s, { k: 'mark', tile: i }); } }
      log(s, `${pre}，清除了 ${n} 個障礙`); break;
    }
    case 'sendgod': { const g = GODS[tp.god.id]; tp.god = null; log(s, `${pre}，把 ${tp.name} 身上的${g.icon}${g.name}送走了`); break; }
    case 'missile': {
      const st = s.tiles[a.tile], o = pl(s, st.o); fx(s, { k: 'missile', pid: p.id, tile: a.tile, to: o.id, blocked: hasSkill(o, 'armor') ? 1 : 0 });
      if (hasSkill(o, 'armor')) { log(s, `${pre}，但穿山甲的鱗甲擋住了！`); break; }
      if (st.mg) { log(s, `${pre}，${MG[st.mg.k].name}被炸掉一級！`); mgDamage(s, a.tile, 1); }
      else { st.l = Math.max(0, st.l - 2); log(s, `${pre}，${TILES[a.tile].name} 被炸掉兩層！`); }
      sendHospital(s, o, 1); break;
    }
    case 'turn': p.dir *= -1; log(s, `${pre}，改成${p.dir > 0 ? '順時針' : '逆時針'}前進`); break;
    case 'stay': p.stay = true; log(s, `${pre}`); break;
    case 'build': {
      const st = s.tiles[a.tile]; st.l++; fx(s, { k: 'build', tile: a.tile, pid: p.id });
      log(s, `${pre}，${TILES[a.tile].name} 加蓋成${LEVEL_NAMES[st.l]}`); break;
    }
    case 'turtle':
      if (hasGod(tp, 'mazu')) { log(s, `${pre}，但 ${tp.name} 有媽祖保佑`); break; }
      tp.st.turtle = 3; log(s, `${pre}，${tp.name} 變成烏龜 3 回合`); break;
    case 'angel': {
      const g = TILES[a.tile].g;
      TILES.forEach((t, i) => { if (t.g === g && s.tiles[i].o && s.tiles[i].l < 5 && !s.tiles[i].mg) { s.tiles[i].l++; fx(s, { k: 'build', tile: i }); } });
      log(s, `${pre}，${GROUPS[g].name}所有土地加蓋一層！`); break;
    }
  }
  if ((a.card === 'stay' || a.card === 'remote') && hasSkill(p, 'encore') && Math.random() < 0.4) log(s, `✨ ${p.name} 臨場發揮，「${c.name}」沒有用掉！`);
  else p.cards.splice(p.cards.indexOf(a.card), 1);
  fx(s, { k: 'card', pid: p.id, card: a.card });
  s.botUses++;
  return null;
}

// ---------- 時間推進 ----------
// isAuto(p): 這位玩家是否由電腦代打（電腦玩家或斷線）
export function tick(s, now, isAuto) {
  if (s.phase !== 'play') return false;
  if (s.step === 'move') {
    if (now >= s.until) {
      finishMove(s, now);
      if (s.flipBack && s.step !== 'move') { const p = pl(s, s.flipBack); if (p) p.dir *= -1; s.flipBack = null; }
      return true;
    }
    return false;
  }
  if (s.step === 'auction') {
    const A = s.auction; if (!A) { done(s, now, 300); return true; }
    if (now >= A.until) { endAuction(s, now); return true; }
    if (!A.botT || now >= A.botT) {
      A.botT = now + 900 + rnd(900);
      const need = A.best ? A.best.amt + 1000 : A.min;
      for (const [id, max] of Object.entries(A.bots)) {
        const b = pl(s, id);
        if (!b || b.out || (A.best && A.best.pid === id)) continue;
        if (need <= max && b.cash - need > 30000 && Math.random() < 0.7) { bid(s, id, need + (Math.random() < 0.5 ? 0 : 2000), now); return true; }
      }
    }
    return false;
  }
  if (s.step === 'done') {
    if (now < s.until) return false;
    if (s.landAfter) { s.landAfter = false; land(s, now); return true; }
    nextTurn(s, now); return true;
  }
  if (s.step === 'pre' || s.step === 'decide') {
    const p = cur(s);
    if (isAuto(p)) {
      if (now >= s.botAt) { const a = botAction(s, p); act(s, p.id, a, now); return true; }
    } else if (now >= s.deadline) {
      const a = s.step === 'pre' ? { type: 'roll' } : { type: s.pending && (s.pending.type === 'shop' || s.pending.type === 'bank') ? 'done' : 'no' };
      act(s, p.id, a, now); return true;
    }
  }
  return false;
}

// ---------- 電腦 AI ----------
export function botAction(s, p) {
  if (s.step === 'pre') {
    if (s.botUses < 2 && p.cards.length) {
      const a = botCard(s, p); if (a) return a;
    }
    if (Math.random() < 0.15) {
      const k = rnd(6), m = s.market[k];
      if (p.stocks[k] > 0 && m.p > STOCKS[k].p * 1.25) return { type: 'stock', sid: k, qty: -p.stocks[k] };
      if (p.cash > 180000 && m.p < STOCKS[k].p * 0.95) { const q = Math.floor(p.cash * 0.12 / m.p / 100) * 100; if (q > 0) return { type: 'stock', sid: k, qty: q }; }
    }
    return { type: 'roll' };
  }
  const pd = s.pending;
  switch (pd.type) {
    case 'sell': return { type: 'auto' };
    case 'buy': return { type: p.cash - price(s, pd.tile) >= 25000 ? 'yes' : 'no' };
    case 'mgup': return { type: p.cash - mgUpCost(s, pd.tile) >= 50000 ? 'yes' : 'no' };
    case 'upgrade': {
      if (pd.merge && Math.random() < 0.7) for (const k of ['com', 'res', 'ind']) if (p.cash - mgBuildCost(s, pd.merge, k) >= 50000) return { type: 'merge', kind: k };
      if (s.tiles[pd.tile].l >= 5) return { type: 'no' };
      const c = upCostFor(s, pd.tile, p); if (p.cash - 2 * c >= 60000) return { type: 'yes', n: 2 }; return { type: p.cash - c >= 30000 ? 'yes' : 'no' }; }
    case 'shop': {
      if (p.cards.length >= cardLimit(p) - 3) return { type: 'done' };
      const pref = ['remote', 'block', 'free', 'tax', 'monster', 'build', 'turtle', 'buyland', 'equal'];
      for (const c of pref) if (cardCost(p, c) <= p.points && Math.random() < 0.6) return { type: 'buyCard', card: c };
      return { type: 'done' };
    }
    case 'lottery': return Math.random() < 0.5 ? { type: 'pick', num: 1 + rnd(20) } : { type: 'no' };
    case 'car': { const v = p.veh + 1; return p.cash - VEH[v].price > 120000 ? { type: 'veh', v } : { type: 'no' }; }
    case 'bigbuild': { for (const k of ['fun', 'hotel', 'mall', 'lab', 'gas', 'park']) if (p.cash - BIG[k].cost > 30000) return { type: 'build', kind: k }; return { type: 'no' }; }
    case 'bigup': return { type: p.cash - bigUpCost(s, pd.tile) > 40000 ? 'yes' : 'no' };
    case 'minigame': return { type: 'mg', score: 10 + rnd(35) };
    case 'bank':
      if (!pd.did && p.cash > 260000) return { type: 'bank', amount: r100(p.cash - 160000) };
      if (!pd.did && p.cash < 40000 && p.deposit > 0) return { type: 'bank', amount: -Math.min(p.deposit, 80000) };
      return { type: 'done' };
  }
  return { type: 'no' };
}
function botCard(s, p) {
  const has = c => p.cards.includes(c);
  const others = alive(s).filter(o => o !== p);
  const richest = [...others].sort((a, b) => assets(s, b) - assets(s, a))[0];
  if (has('buyland')) { const t = cardTargets(s, p, 'buyland'); if (t.length && p.cash - propValue(s, p.pos) > 50000) return { type: 'card', card: 'buyland' }; }
  if (has('equal')) { const avg = alive(s).reduce((a, o) => a + o.cash, 0) / alive(s).length; if (p.cash < avg * 0.55) return { type: 'card', card: 'equal' }; }
  if (has('tax') && richest && richest.cash > 90000 && Math.random() < 0.6) return { type: 'card', card: 'tax', target: richest.id };
  if (has('monster')) {
    const t = cardTargets(s, p, 'monster').filter(i => s.tiles[i].l >= 3);
    if (t.length) return { type: 'card', card: 'monster', tile: t.sort((a, b) => s.tiles[b].l - s.tiles[a].l)[0] };
  }
  if (has('build')) { const t = cardTargets(s, p, 'build'); if (t.length) return { type: 'card', card: 'build', tile: t.sort((a, b) => price(s, b) - price(s, a))[0] }; }
  if (has('angel')) { const t = cardTargets(s, p, 'angel'); if (t.length >= 2) return { type: 'card', card: 'angel', tile: t[0] }; }
  if (has('block')) {
    const t = cardTargets(s, p, 'block').filter(i => s.tiles[i] && s.tiles[i].o === p.id && s.tiles[i].l >= 1);
    if (t.length) return { type: 'card', card: 'block', tile: t.sort((a, b) => toll(s, b) - toll(s, a))[0] };
  }
  if (has('turtle') && richest && Math.random() < 0.4) return { type: 'card', card: 'turtle', target: richest.id };
  if (has('rob')) { const t = others.filter(o => o.cards.length >= 2); if (t.length && Math.random() < 0.5) return { type: 'card', card: 'rob', target: t[0].id }; }
  if (has('sleep') && others.length >= 2 && Math.random() < 0.35) return { type: 'card', card: 'sleep' };
  if (has('remote')) {
    const n = diceCount(s, p); let best = null, bs = -1e9, sum = 0, cnt = 0;
    for (let v = n; v <= 6 * n; v++) {
      const i = (p.pos + p.dir * v + N_TILES * 10) % N_TILES; const sc = scoreTile(s, p, i); sum += sc; cnt++;
      if (sc > bs) { bs = sc; best = v; }
    }
    if (bs - sum / cnt > 15000) return { type: 'card', card: 'remote', value: best };
  }
  if (has('stay')) { const t = s.tiles[p.pos]; if (t && t.o === p.id && t.l < 5 && p.cash > upCost(s, p.pos) + 60000 && Math.random() < 0.5) return { type: 'card', card: 'stay' }; }
  if (has('sendgod')) { const t = alive(s).find(o => o.god && ((o === p) !== GODS[o.god.id].good)); if (t) return { type: 'card', card: 'sendgod', target: t.id }; }
  if (has('robot')) { for (let k = 1; k <= 6 * (s.settings.dice || 1); k++) { const i = (p.pos + p.dir * k + N_TILES * 2) % N_TILES; if (s.marks[i]) return { type: 'card', card: 'robot' }; } }
  if (has('mine') && Math.random() < 0.3) { const t = cardTargets(s, p, 'mine'); if (t.length) return { type: 'card', card: 'mine', tile: pick(t) }; }
  return null;
}
function scoreTile(s, p, i) {
  const t = TILES[i], st = s.tiles[i];
  if (t.type === 'prop') {
    if (st.o == null) return p.cash > price(s, i) ? 20000 : 0;
    if (st.o === p.id) return st.l < 5 ? 15000 : 2000;
    return -toll(s, i);
  }
  return { shop: 5000, temple: 6000, chance: 3000, news: 1000, bank: 2000, lottery: 1000 }[t.type] || 0;
}
