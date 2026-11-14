// ===== 寶島富翁 3D：遊戲規則引擎（只在房主端執行，狀態可 JSON 化）=====
import { TILES, N_TILES, GROUPS, TOLL_MUL, UPGRADE_RATE, SALARY, CARDS, CARD_IDS, GODS, STOCKS, LEVEL_NAMES, hasSkill } from './data.js';

export const PRE_T = 40000, DEC_T = 25000;
export const HOSP = TILES.findIndex(t => t.type === 'hospital');
export const POLICE = TILES.findIndex(t => t.type === 'police');
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
export function propValue(s, i) { return price(s, i) + s.tiles[i].l * upCost(s, i); }
export function ownsGroup(s, g, pid) {
  return TILES.every((t, i) => t.g !== g || s.tiles[i].o === pid);
}
export function toll(s, i) {
  const t = TILES[i], st = s.tiles[i];
  if (!st || st.o == null) return 0;
  let v = price(s, i) * TOLL_MUL[st.l];
  if (ownsGroup(s, t.g, st.o)) v *= 1.5;
  const gm = s.gmod[t.g]; if (gm) v *= gm.m;
  return r10(v);
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
  const s = {
    v: 0, phase: 'play', settings, round: 1, turn: 0, step: 'pre', pending: null, anim: null,
    until: 0, deadline: 0, botAt: 0, botUses: 0,
    tiles: TILES.map(t => (t.type === 'prop' ? { o: null, l: 0 } : null)),
    marks: {}, gmod: {}, gprice: {},
    market: STOCKS.map(x => ({ p: x.p, h: [x.p] })),
    players: players.map(p => ({
      id: p.id, name: p.name, char: p.char, bot: !!p.bot,
      cash: settings.startCash, deposit: 0, points: 60, pos: 0, dir: 1,
      cards: ['free', pick(['remote', 'block', 'turn', 'stay', 'turtle'])],
      stocks: STOCKS.map(() => 0),
      st: { hosp: 0, jail: 0, sleep: 0, turtle: 0 }, god: null, out: false, remote: 0, stay: false,
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
  s.botAt = now + 700 + rnd(700);
}
function done(s, now, delay = 1300) { s.step = 'done'; s.pending = null; s.until = now + delay; }

function beginTurn(s, now) {
  const p = cur(s);
  s.pending = null; s.anim = null; s.botUses = 0;
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
  s.market.forEach(m => {
    const drift = (Math.random() - 0.485) * 0.14;
    m.p = Math.max(2, Math.round(m.p * (1 + drift) * 10) / 10);
    m.h.push(m.p); if (m.h.length > 24) m.h.shift();
  });
  for (const g of Object.keys(s.gmod)) { if (--s.gmod[g].r <= 0) { log(s, `📉 ${GROUPS[g].name}的過路費恢復正常`); delete s.gmod[g]; } }
  const mr = s.settings.maxRounds;
  if (mr && s.round > mr) endGame(s, `已滿 ${mr} 回合`);
  else log(s, `📅 第 ${s.round} 回合`);
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
  s.anim = { pid: p.id, path, t0: now, dice: dice || null, dur: (dice ? 900 : 200) + (path.length - 1) * 340 };
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
  for (let k = 0; k < (pass || 0); k++) {
    const intr = r10(p.deposit * (hasSkill(p, 'interest') ? 0.1 : 0.05));
    const sal = hasSkill(p, 'salary') ? SALARY * 1.5 : SALARY;
    p.cash += sal; addPts(p, 10); p.deposit += intr;
    log(s, `🚉 ${p.name} 經過台北車站，領薪水 ${money(sal)}${intr ? `、利息 ${money(intr)}` : ''}、點券 +${hasSkill(p, 'pointsx') ? 20 : 10}`);
    fx(s, { k: 'money', pid: p.id, d: sal + intr });
  }
  if (mark) {
    delete s.marks[p.pos];
    if (mark === 'block') { log(s, `🚧 ${p.name} 被路障擋下了！`); fx(s, { k: 'boom', tile: p.pos, m: 'block' }); }
    else {
      fx(s, { k: 'boom', tile: p.pos, m: 'mine' });
      log(s, `💣 轟！${p.name} 踩到地雷！`);
      if (sendHospital(s, p, 2)) { done(s, now, 1800); return; }
    }
  }
  land(s, now);
}

function teleport(s, p, pos) { p.pos = pos; fx(s, { k: 'tp', pid: p.id, pos }); }
function sendHospital(s, p, turns) {
  if (hasGod(p, 'mazu')) { log(s, `🙏 媽祖保佑，${p.name} 平安無事`); return false; }
  if (hasSkill(p, 'agile')) turns = Math.max(0, turns - 1);
  teleport(s, p, HOSP); p.st.hosp = turns;
  const fee = Math.min(p.cash, hasSkill(p, 'thick') ? 400 : 500); p.cash -= fee;
  log(s, `🚑 ${p.name} 被送進醫院，住院 ${turns} 回合（醫藥費 ${money(fee)}）`);
  return true;
}
function sendJail(s, p, turns) {
  if (hasSkill(p, 'dig')) { log(s, `🕳️ ${p.name} 挖了個洞溜走了，不用被拘留`); return false; }
  if (hasGod(p, 'mazu')) { log(s, `🙏 媽祖保佑，${p.name} 逃過一劫`); return false; }
  if (hasSkill(p, 'agile')) turns = Math.max(0, turns - 1);
  teleport(s, p, POLICE); p.st.jail = turns;
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
      p.cash += v; short -= v; s.tiles[i].o = null; s.tiles[i].l = 0;
      log(s, `🏚️ ${p.name} 變賣 ${TILES[i].name} 得 ${money(v)}`);
    }
  }
}
function pay(s, p, to, amt) {
  amt = Math.round(amt);
  if (amt <= 0) return 0;
  if (p.cash < amt) liquidate(s, p, amt);
  const paid = Math.min(amt, p.cash);
  p.cash -= paid;
  if (to) to.cash += paid;
  fx(s, { k: 'money', pid: p.id, d: -paid });
  if (to) fx(s, { k: 'money', pid: to.id, d: paid });
  if (paid < amt) bankrupt(s, p);
  return paid;
}
function gain(s, p, amt) { if (s.chanceCtx === p.id && hasSkill(p, 'lucky')) amt = r10(amt * 1.5); p.cash += amt; fx(s, { k: 'money', pid: p.id, d: amt }); }
function bankrupt(s, p) {
  if (p.out) return;
  p.out = true; p.cash = 0; p.deposit = 0; p.cards = []; p.god = null;
  s.tiles.forEach(t => { if (t && t.o === p.id) { t.o = null; t.l = 0; } });
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
    case 'shop':
      if (p.points >= 10 || hasSkill(p, 'network')) return ask(s, { type: 'shop' }, now);
      log(s, `🏪 ${p.name} 點券不足，逛逛就走`); return done(s, now);
    case 'lottery':
      if (p.cash >= 500) return ask(s, { type: 'lottery' }, now);
      return done(s, now);
    case 'bank': return ask(s, { type: 'bank' }, now);
    case 'hospital': log(s, `🏥 ${p.name} 來醫院探病，獲得點券`); addPts(p, 5); return done(s, now);
    case 'police': log(s, `🚓 ${p.name} 到警察局做筆錄，獲得點券`); addPts(p, 5); return done(s, now);
    default: return done(s, now);
  }
}
function ask(s, pending, now) { s.pending = pending; setStep(s, 'decide', now); }

function landProp(s, p, i, now) {
  const st = s.tiles[i], t = TILES[i];
  if (st.o == null) {
    if (hasGod(p, 'tudi')) {
      st.o = p.id; log(s, `👴 土地公顯靈！${p.name} 免費獲得 ${t.name}`);
      fx(s, { k: 'buy', tile: i, pid: p.id }); return done(s, now, 1600);
    }
    if (p.cash >= price(s, i)) return ask(s, { type: 'buy', tile: i }, now);
    log(s, `${p.name} 錢不夠買 ${t.name}`); return done(s, now);
  }
  if (st.o === p.id) {
    if (st.l < 5 && p.cash >= upCostFor(s, i, p)) return ask(s, { type: 'upgrade', tile: i }, now);
    return done(s, now);
  }
  const o = pl(s, st.o);
  if (o.st.hosp > 0 || o.st.jail > 0) {
    log(s, `😮 ${t.name} 的主人 ${o.name} 不在，${p.name} 免付過路費`); return done(s, now);
  }
  let amt = toll(s, i);
  if (hasGod(p, 'caishen')) { log(s, `💰 財神護體，${p.name} 不用付過路費`); return done(s, now); }
  const fi = p.cards.indexOf('free');
  if (fi >= 0) { p.cards.splice(fi, 1); log(s, `🎫 ${p.name} 使用免費卡，省下 ${money(amt)}`); fx(s, { k: 'card', pid: p.id, card: 'free' }); return done(s, now, 1500); }
  if (hasGod(p, 'shuai')) amt *= 2;
  if (hasGod(o, 'caishen')) amt *= 2;
  if (hasSkill(o, 'rent')) amt *= 1.2;
  if (hasSkill(p, 'thick')) amt *= 0.8;
  amt = r10(amt);
  const paid = pay(s, p, o, amt);
  log(s, `💵 ${p.name} 付給 ${o.name} 過路費 ${money(paid)}（${t.name}・${LEVEL_NAMES[st.l]}）`);
  if (!p.out && hasSkill(p, 'pick') && Math.random() < 0.25) { const back = Math.min(o.cash, r10(paid / 2)); o.cash -= back; gain(s, p, back); fx(s, { k: 'money', pid: o.id, d: -back }); log(s, `🐒 ${p.name} 順手牽羊拿回 ${money(back)}`); }
  fx(s, { k: 'toll', from: p.id, to: o.id, amt: paid, tile: i });
  done(s, now, 1700);
}

// ---------- 機會 / 新聞 / 神明 ----------
const CHANCE = [
  { t: '統一發票中了二獎！', f: (s, p) => gain(s, p, 4000) },
  { t: '在夜市擺攤大賺一筆', f: (s, p) => gain(s, p, 1500) },
  { t: '颳中刮刮樂頭獎！', f: (s, p) => gain(s, p, 6000), w: 0.5 },
  { t: '參加路跑，獲得點券 30 點', f: (s, p) => { addPts(p, 30); } },
  { t: '朋友送你一張道具卡', f: (s, p) => giveCard(s, p) },
  { t: '生日快樂！每位玩家送你 $500', f: (s, p) => alive(s).forEach(o => { if (o !== p) pay(s, o, p, 500); }) },
  { t: '請大家喝珍奶，每人付 $300', bad: 1, f: (s, p) => alive(s).forEach(o => { if (o !== p) pay(s, p, o, 300); }) },
  { t: '違規停車，罰單 $1200', bad: 1, f: (s, p) => pay(s, p, null, 1200) },
  { t: '繳交房屋稅：每層樓 $250', bad: 1, f: (s, p) => { let n = 0; s.tiles.forEach(t => { if (t && t.o === p.id) n += t.l; }); pay(s, p, null, n * 250); } },
  { t: '吃太多鹹酥雞拉肚子，住院 1 回合', bad: 1, f: (s, p) => sendHospital(s, p, 1), stop: 1 },
  { t: '騎車闖紅燈被警察攔下，拘留 2 回合', bad: 1, f: (s, p) => sendJail(s, p, 2), stop: 1 },
  { t: '搭高鐵回台北，順便領薪水！', f: (s, p) => { teleport(s, p, 0); gain(s, p, SALARY); p.points += 10; }, stop: 1 },
  { t: '廟口捐香油錢 $500，點券 +25', f: (s, p) => { pay(s, p, null, 500); addPts(p, 25); } },
  { t: '股票配息：持股市值 8%', f: (s, p) => gain(s, p, r10(stockValue(s, p) * 0.08)) },
  { t: '搭上順風車，前進 3 格', f: (s, p) => ({ move: 3 }) },
  { t: '忘了帶錢包，回頭走 2 格', bad: 1, f: (s, p) => { p.dir *= -1; return { move: 2, flip: 1 }; } },
  { t: '颱風天在家追劇，什麼事也沒發生', f: () => {} },
];
function chance(s, p, now) {
  const pool = CHANCE.flatMap(c => (c.w === 0.5 ? (Math.random() < 0.5 ? [c] : []) : [c]));
  const c = pick(pool);
  fx(s, { k: 'notice', kind: 'chance', title: '機會', text: c.t, pid: p.id });
  log(s, `❓ ${p.name}：${c.t}`);
  if (c.bad && hasGod(p, 'mazu')) { log(s, `🙏 媽祖保佑，${p.name} 逢凶化吉`); return done(s, now, 2200); }
  s.chanceCtx = p.id;
  const r = c.f(s, p) || {};
  s.chanceCtx = null;
  if (p.out) return done(s, now, 2000);
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
  { t: '政府發放振興券，每人 $2000', f: s => alive(s).forEach(p => gain(s, p, 2000)) },
  { t: '繳交所得稅，每人繳現金 10%', f: s => alive(s).forEach(p => { if (!hasGod(p, 'mazu')) pay(s, p, null, r10(p.cash * 0.1)); }) },
  { t: '國旅補助！每人獲得一張道具卡', f: s => alive(s).forEach(p => giveCard(s, p)) },
  { t: '股市大漲！所有股價上漲 20%', f: s => s.market.forEach(m => { m.p = Math.round(m.p * 12) / 10; m.h.push(m.p); }) },
  { t: '股市重挫！所有股價下跌 25%', f: s => s.market.forEach(m => { m.p = Math.max(2, Math.round(m.p * 7.5) / 10); m.h.push(m.p); }) },
  { t: '健保補助，住院中的玩家全部出院', f: s => alive(s).forEach(p => { p.st.hosp = 0; }) },
  { t: '最富有的玩家捐出 10% 現金給最窮的玩家', f: s => {
    const a = alive(s).sort((x, y) => assets(s, y) - assets(s, x));
    if (a.length > 1) { const amt = r10(a[0].cash * 0.1); pay(s, a[0], a[a.length - 1], amt); }
  } },
  { tg: 1, t: g => `觀光熱潮！${GROUPS[g].name}過路費 ×1.6，持續 4 回合`, f: (s, g) => { s.gmod[g] = { m: 1.6, r: 4 }; } },
  { tg: 1, t: g => `景氣低迷，${GROUPS[g].name}過路費減半，持續 4 回合`, f: (s, g) => { s.gmod[g] = { m: 0.5, r: 4 }; } },
  { tg: 1, t: g => `重大建設通車！${GROUPS[g].name}地價永久上漲 20%`, f: (s, g) => { s.gprice[g] = (s.gprice[g] || 1) * 1.2; } },
  { tg: 1, t: g => `颱風過境${GROUPS[g].name}，區內房子各倒一層`, f: (s, g) => { TILES.forEach((t, i) => { const st = s.tiles[i]; if (t.g === g && st.l > 0 && !hasSkill(pl(s, st.o), 'armor')) st.l--; }); } },
];
function news(s, p, now) {
  const n = pick(NEWS);
  let text;
  if (n.tg) { const g = pick(Object.keys(GROUPS)); text = n.t(g); n.f(s, g); }
  else { text = n.t; n.f(s); }
  fx(s, { k: 'notice', kind: 'news', title: '新聞快報', text, pid: p.id });
  log(s, `📰 ${text}`);
  done(s, now, 2600);
}
function giveCard(s, p) {
  if (p.cards.length >= cardLimit(p)) return;
  const c = pick(CARD_IDS); p.cards.push(c);
  fx(s, { k: 'card', pid: p.id, card: c, got: 1 });
  log(s, `🃏 ${p.name} 獲得「${CARDS[c].name}」`);
}
function temple(s, p, now) {
  const pool = ['caishen', 'caishen', 'fushen', 'fushen', 'tudi', 'tudi', 'mazu', 'shuai', 'shuai', 'qiong'];
  const id = pick(pool), g = GODS[id];
  if (!g.good && hasSkill(p, 'elder')) {
    log(s, `👵 長輩保佑！${g.name}不敢附身在 ${p.name} 身上`);
    fx(s, { k: 'notice', kind: 'god', title: '長輩保佑', text: `${g.icon}${g.name}被阿嬤趕走了`, pid: p.id });
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

// ---------- 動作 ----------
export function act(s, pid, a, now) {
  if (!a || !a.type) return '無效動作';
  if (a.type === 'emote') {
    const p = pl(s, pid); if (!p) return 'x';
    fx(s, { k: 'emote', pid, e: String(a.e).slice(0, 4) }); return null;
  }
  if (s.phase !== 'play') return '遊戲未進行';
  const p = cur(s);
  if (!p || p.id !== pid) return '還沒輪到你';
  if (s.step === 'pre') {
    if (a.type === 'roll') return doRoll(s, p, now);
    if (a.type === 'card') return useCard(s, p, a, now);
    if (a.type === 'stock') return doStock(s, p, a);
    return '現在不能這樣做';
  }
  if (s.step !== 'decide' || !s.pending) return '現在不能這樣做';
  const pd = s.pending;
  switch (pd.type) {
    case 'buy': {
      if (a.type === 'yes') {
        const c = price(s, pd.tile);
        if (p.cash < c) return '現金不足';
        p.cash -= c; s.tiles[pd.tile].o = p.id;
        log(s, `🏠 ${p.name} 買下 ${TILES[pd.tile].name}（${money(c)}）`);
        fx(s, { k: 'buy', tile: pd.tile, pid: p.id }); fx(s, { k: 'money', pid: p.id, d: -c });
      }
      return done(s, now, 900), null;
    }
    case 'upgrade': {
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
      return done(s, now, 900), null;
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
      return done(s, now, 900), null;
    }
    case 'lottery': {
      if (a.type === 'pick') {
        const num = Math.max(1, Math.min(6, a.num | 0));
        pay(s, p, null, 500);
        const r = 1 + rnd(6);
        const win = r === num;
        if (win) gain(s, p, 3000);
        fx(s, { k: 'notice', kind: win ? 'god' : 'chance', title: '🎰 開獎', text: `你猜 ${num}，開出 ${r}　${win ? '中獎！贏得 $3000' : '槓龜了…'}`, pid: p.id });
        log(s, `🎰 ${p.name} 猜 ${num} 開出 ${r}，${win ? '中獎 $3000！' : '沒中'}`);
        return done(s, now, 2200), null;
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
  if (p.stay) {
    p.stay = false;
    log(s, `🛑 ${p.name} 原地停留`);
    s.anim = { pid: p.id, path: [p.pos], t0: now, dice: null, dur: 300 };
    s.moveInfo = { pass: 0, mark: null }; s.step = 'move'; s.until = now + 300;
    return null;
  }
  const n = s.settings.dice || 1;
  let dice;
  if (p.remote) {
    let left = p.remote; dice = [];
    for (let k = n; k > 0; k--) { const v = Math.max(1, Math.min(6, left - (k - 1))); dice.push(v); left -= v; }
    p.remote = 0;
  } else dice = Array.from({ length: n }, () => 1 + rnd(6));
  let steps = dice.reduce((a, b) => a + b, 0);
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
    case 'oppprop': return s.tiles.map((t, i) => (t && t.o && t.o !== p.id && t.l > 0 ? i : -1)).filter(i => i >= 0);
    case 'myprop': return s.tiles.map((t, i) => (t && t.o === p.id && t.l < 5 ? i : -1)).filter(i => i >= 0);
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
  if (tg && !tg.includes(c.target === 'player' ? a.target : (c.target === 'here' ? p.pos : a.tile))) return '目標無效';
  const tp = c.target === 'player' ? pl(s, a.target) : null;
  const pre = `${c.icon} ${p.name} 使用「${c.name}」`;
  switch (a.card) {
    case 'remote': {
      const max = 6 * (s.settings.dice || 1), min = s.settings.dice || 1;
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
      log(s, `${pre}，從 ${tp.name} 搶走「${got.join('、')}」`); break;
    }
    case 'sleep':
      alive(s).forEach(o => { if (o !== p && !hasGod(o, 'mazu')) o.st.sleep = 2; });
      log(s, `${pre}，其他人全部冬眠 2 回合！`); break;
    case 'buyland': {
      const i = p.pos, st = s.tiles[i], o = pl(s, st.o), v = propValue(s, i);
      p.cash -= v; o.cash += v; st.o = p.id;
      fx(s, { k: 'buy', tile: i, pid: p.id });
      log(s, `${pre}，以 ${money(v)} 強制買下 ${o.name} 的 ${TILES[i].name}`); break;
    }
    case 'monster': {
      const st = s.tiles[a.tile]; fx(s, { k: 'boom', tile: a.tile, m: 'monster' });
      if (hasSkill(pl(s, st.o), 'armor')) { log(s, `${pre}，但穿山甲的鱗甲擋住了！`); break; }
      st.l = 0; log(s, `${pre}，${TILES[a.tile].name} 的房子全被摧毀！`); break;
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
      TILES.forEach((t, i) => { if (t.g === g && s.tiles[i].o && s.tiles[i].l < 5) { s.tiles[i].l++; fx(s, { k: 'build', tile: i }); } });
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
  if (s.step === 'done') { if (now >= s.until) { nextTurn(s, now); return true; } return false; }
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
      if (p.cash > 18000 && m.p < STOCKS[k].p * 0.95) { const q = Math.floor(p.cash * 0.12 / m.p / 100) * 100; if (q > 0) return { type: 'stock', sid: k, qty: q }; }
    }
    return { type: 'roll' };
  }
  const pd = s.pending;
  switch (pd.type) {
    case 'buy': return { type: p.cash - price(s, pd.tile) >= 2500 ? 'yes' : 'no' };
    case 'upgrade': { const c = upCostFor(s, pd.tile, p); if (p.cash - 2 * c >= 6000) return { type: 'yes', n: 2 }; return { type: p.cash - c >= 3000 ? 'yes' : 'no' }; }
    case 'shop': {
      if (p.cards.length >= cardLimit(p) - 3) return { type: 'done' };
      const pref = ['remote', 'block', 'free', 'tax', 'monster', 'build', 'turtle', 'buyland', 'equal'];
      for (const c of pref) if (cardCost(p, c) <= p.points && Math.random() < 0.6) return { type: 'buyCard', card: c };
      return { type: 'done' };
    }
    case 'lottery': return Math.random() < 0.3 ? { type: 'pick', num: 1 + rnd(6) } : { type: 'no' };
    case 'bank':
      if (!pd.did && p.cash > 26000) return { type: 'bank', amount: r100(p.cash - 16000) };
      if (!pd.did && p.cash < 4000 && p.deposit > 0) return { type: 'bank', amount: -Math.min(p.deposit, 8000) };
      return { type: 'done' };
  }
  return { type: 'no' };
}
function botCard(s, p) {
  const has = c => p.cards.includes(c);
  const others = alive(s).filter(o => o !== p);
  const richest = [...others].sort((a, b) => assets(s, b) - assets(s, a))[0];
  if (has('buyland')) { const t = cardTargets(s, p, 'buyland'); if (t.length && p.cash - propValue(s, p.pos) > 5000) return { type: 'card', card: 'buyland' }; }
  if (has('equal')) { const avg = alive(s).reduce((a, o) => a + o.cash, 0) / alive(s).length; if (p.cash < avg * 0.55) return { type: 'card', card: 'equal' }; }
  if (has('tax') && richest && richest.cash > 9000 && Math.random() < 0.6) return { type: 'card', card: 'tax', target: richest.id };
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
    const n = s.settings.dice || 1; let best = null, bs = -1e9, sum = 0, cnt = 0;
    for (let v = n; v <= 6 * n; v++) {
      const i = (p.pos + p.dir * v + N_TILES * 10) % N_TILES; const sc = scoreTile(s, p, i); sum += sc; cnt++;
      if (sc > bs) { bs = sc; best = v; }
    }
    if (bs - sum / cnt > 1500) return { type: 'card', card: 'remote', value: best };
  }
  if (has('stay')) { const t = s.tiles[p.pos]; if (t && t.o === p.id && t.l < 5 && p.cash > upCost(s, p.pos) + 6000 && Math.random() < 0.5) return { type: 'card', card: 'stay' }; }
  if (has('mine') && Math.random() < 0.3) { const t = cardTargets(s, p, 'mine'); if (t.length) return { type: 'card', card: 'mine', tile: pick(t) }; }
  return null;
}
function scoreTile(s, p, i) {
  const t = TILES[i], st = s.tiles[i];
  if (t.type === 'prop') {
    if (st.o == null) return p.cash > price(s, i) ? 2000 : 0;
    if (st.o === p.id) return st.l < 5 ? 1500 : 200;
    return -toll(s, i);
  }
  return { shop: 500, temple: 600, chance: 300, news: 100, bank: 200, lottery: 100 }[t.type] || 0;
}
