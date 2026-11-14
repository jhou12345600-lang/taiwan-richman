// ===== 寶島富翁 3D：主程式（房主 / 玩家 / 介面）=====
import { TILES, N_TILES, GROUPS, CHARS, CARDS, GODS, STOCKS, EMOTES, LEVEL_NAMES, TOLL_MUL } from './data.js';
import { cardLimit, createGame, act, tick, cur, pl, price, upCost, upCostFor, cardCost, toll, propValue, assets, money, cardTargets, stockValue, PRE_T, DEC_T } from './engine.js';
import { World } from './world.js';
import { MqttNet, LocalNet, BROKERS } from './net.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const SS = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
};
const rid = n => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const charOf = id => CHARS.find(c => c.id === id) || CHARS[0];

const Q = new URLSearchParams(location.search);
let myId = SS.get('tr3d-sid') || ('u' + rid(8).toLowerCase());
SS.set('tr3d-sid', myId);

const G = {
  s: null, net: null, room: Q.get('r'), bi: +(Q.get('b') || 0), localMode: Q.get('local') === '1', solo: false,
  isHost: false, offset: 0, seen: {}, hostSeenAt: 0, lastStateAt: 0, seenFx: -1, hostStart: 0,
  dirty: false, ui: { mode: null }, sound: LS.get('tr3d-snd', true), lastAnim: 0,
};
const hnow = () => Date.now() - G.offset; // 房主時間

// ---------- 3D 世界 ----------
let world;
try {
  world = new World($('#cv'), { onTileClick: i => onTileClick(i) });
} catch (e) {
  $('#loading').textContent = '你的裝置不支援 3D（WebGL），請換個瀏覽器試試。';
  throw e;
}
$('#loading').classList.add('hidden');

// ---------- 音效 ----------
let actx;
function beep(type) {
  if (!G.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const tone = (f, d, w = 'sine', v = 0.12, dl = 0) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = w; o.frequency.value = f;
      g.gain.setValueAtTime(v, t + dl); g.gain.exponentialRampToValueAtTime(0.001, t + dl + d);
      o.connect(g).connect(actx.destination); o.start(t + dl); o.stop(t + dl + d);
    };
    if (type === 'coin') { tone(988, 0.08, 'square', 0.06); tone(1319, 0.25, 'square', 0.06, 0.08); }
    else if (type === 'pay') { tone(330, 0.15, 'triangle', 0.12); tone(262, 0.25, 'triangle', 0.12, 0.12); }
    else if (type === 'dice') { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 300, 0.04, 'square', 0.04, i * 0.08); }
    else if (type === 'build') { tone(523, 0.1, 'triangle'); tone(659, 0.1, 'triangle', 0.12, 0.1); tone(784, 0.2, 'triangle', 0.12, 0.2); }
    else if (type === 'boom') { tone(90, 0.5, 'sawtooth', 0.2); tone(60, 0.6, 'square', 0.12, 0.05); }
    else if (type === 'turn') { tone(880, 0.12, 'sine', 0.1); tone(1175, 0.2, 'sine', 0.1, 0.12); }
    else if (type === 'notice') { tone(660, 0.1, 'sine'); tone(880, 0.18, 'sine', 0.12, 0.1); }
    else if (type === 'step') { tone(600 + Math.random() * 100, 0.05, 'sine', 0.05); }
  } catch (e) {}
}

// ---------- 首頁 ----------
let pickChar = LS.get('tr3d-char', 'boss');
G.avatars = {};
let myAvatar = LS.get('tr3d-avatar', null);
function renderAvatarBtn() { $('#avPrev').innerHTML = myAvatar ? `<img src="${myAvatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">` : '（未設定）'; }
$('#avFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const im = new Image(); const url = URL.createObjectURL(f);
  im.onload = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d');
    const m = Math.min(im.width, im.height); x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 96, 96);
    myAvatar = cv.toDataURL('image/jpeg', 0.8); LS.set('tr3d-avatar', myAvatar); renderAvatarBtn(); URL.revokeObjectURL(url);
    if (G.net) pubAvatar();
  };
  im.src = url;
};
$('#avClear').onclick = () => { myAvatar = null; LS.set('tr3d-avatar', null); renderAvatarBtn(); };
renderAvatarBtn();
function pubAvatar() { if (G.net && myAvatar) G.net.pub('av/' + myId, { id: myId, img: myAvatar }, true); if (myAvatar) G.avatars[myId] = myAvatar; }
function avHtml(id, emoji) { const a = G.avatars[id]; return a ? `<img src="${a}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : emoji; }
$('#nameIn').value = LS.get('tr3d-name', '');
function renderCharPick(taken = []) {
  $('#charPick').innerHTML = CHARS.map(c => `<div class="char ${c.id === pickChar ? 'sel' : ''} ${taken.includes(c.id) ? 'taken' : ''}" data-c="${c.id}">
    <div class="e">${c.emoji}</div><div class="n" style="color:${c.color}">${c.name}</div></div>`).join('') +
    (() => { const c = charOf(pickChar); return `<div class="skillbox" style="border-color:${c.color}"><b style="color:${c.color}">${c.emoji} ${c.name}</b>　<span class="note">${c.bio}</span>${c.sk.map(k => `<div>⭐ <b>${k[1]}</b>：${k[2]}</div>`).join('')}</div>`; })();
  $('#charPick').querySelectorAll('.char').forEach(el => el.onclick = () => { pickChar = el.dataset.c; LS.set('tr3d-char', pickChar); renderCharPick(taken); });
}
renderCharPick();
function myName() {
  const n = $('#nameIn').value.trim().slice(0, 8) || charOf(pickChar).name;
  LS.set('tr3d-name', $('#nameIn').value.trim()); return n;
}
function show(id) {
  for (const k of ['#home', '#lobby', '#hud']) $(k).classList.toggle('hidden', k !== id);
}
if (G.room) {
  $('#joinBtn').classList.remove('hidden'); $('#joinBtn').textContent = `🚪 加入房間 ${G.room}`;
  $('#createBtn').classList.add('hidden');
}
show('#home');
world.overview();

$('#soloBtn').onclick = () => {
  G.solo = true; G.isHost = true; G.room = 'SOLO'; if (myAvatar) G.avatars[myId] = myAvatar;
  G.s = lobbyState(); G.s.seats.push({ id: myId, name: myName(), char: pickChar, ctl: myId });
  addBot(); addBot(); addBot();
  enterLobby();
};
$('#createBtn').onclick = async () => {
  const name = myName();
  $('#createBtn').disabled = true; $('#homeMsg').textContent = '正在建立房間…';
  G.room = rid(6);
  let ok = false;
  for (let b = 0; b < BROKERS.length && !ok && !G.localMode; b++) {
    G.bi = b; $('#homeMsg').textContent = `正在連線伺服器 ${b + 1}…`;
    try { await connectNet(); ok = true; } catch (e) { console.warn(e); }
  }
  if (G.localMode) { await connectNet(); ok = true; }
  $('#createBtn').disabled = false;
  if (!ok) { $('#homeMsg').textContent = '❌ 連不上連線伺服器，請檢查網路後再試，或先玩單機。'; return; }
  G.isHost = true;
  G.s = lobbyState(); G.s.seats.push({ id: myId, name, char: pickChar, ctl: myId });
  history.replaceState(null, '', shareUrl());
  LS.set('tr3d-seat-' + G.room, myId);
  publish(true);
  enterLobby();
};
$('#joinBtn').onclick = async () => {
  myName();
  $('#joinBtn').disabled = true; $('#homeMsg').textContent = '正在連線…';
  try { await connectNet(); } catch (e) {
    $('#joinBtn').disabled = false; $('#homeMsg').textContent = '❌ 連線失敗，請重新整理再試一次。'; return;
  }
  $('#homeMsg').textContent = '正在取得房間資料…';
  G.joinWanted = true;
  G.net.pub('hi', { from: myId, t: 'hello' });
  setTimeout(() => { if (!G.s) { $('#homeMsg').textContent = '⌛ 找不到房間，可能房主已離開或網址錯誤。'; $('#joinBtn').disabled = false; } }, 9000);
};

function shareUrl() {
  const u = new URL(location.href); u.search = '';
  u.searchParams.set('r', G.room); u.searchParams.set('b', G.bi);
  if (G.localMode) u.searchParams.set('local', '1');
  return u.toString();
}
function lobbyState() {
  return { phase: 'lobby', v: 1, host: myId, room: G.room, seats: [], settings: { startCash: 30000, maxRounds: 30, dice: 2 }, fx: [], fxn: 0, log: [] };
}

// ---------- 連線 ----------
async function connectNet() {
  if (G.net) G.net.close();
  const net = G.localMode ? new LocalNet(G.room) : new MqttNet(G.room, G.bi, myId);
  net.on('st', m => onStateMsg(m));
  net.on('act', m => { if (G.isHost) onAction(m); });
  net.on('hi', m => onHi(m));
  net.on('av', m => { if (m && m.id && typeof m.img === 'string' && m.img.startsWith('data:image/') && m.img.length < 60000) { G.avatars[m.id] = m.img; world.setAvatar(m.id, m.img); renderPlayers(); renderLobby(); } });
  net.on('status', st => { renderNet(); if (st === 'ok' && G.s) net.pub('hi', { from: myId, t: 'hello' }); });
  await net.connect();
  G.net = net; G.connectedAt = Date.now();
  setTimeout(pubAvatar, 300);
  renderNet();
}
function renderNet() {
  const st = G.solo ? '單機' : !G.net ? '' : G.net.status === 'ok' ? '🟢 已連線' : G.net.status === 'reconnecting' ? '🟡 重新連線中…' : '🔴 斷線';
  $('#net').textContent = st + (G.isHost && !G.solo ? '・房主' : '');
}
setInterval(() => {
  if (G.net && G.s) G.net.pub('hi', { from: myId, t: 'ping' });
  if (G.s) checkHostAlive();
  renderPlayers();
}, 4000);

function onHi(m) {
  if (!m || !m.from) return;
  G.seen[m.from] = Date.now();
  if (G.s && m.from === G.s.host) G.hostSeenAt = Date.now();
  if (m.t === 'hello' && G.localMode && myAvatar) pubAvatar();
  if (m.t === 'hello' && m.from !== myId && G.net && !G.probe && Date.now() - (G.lastPong || 0) > 800) { G.lastPong = Date.now(); G.net.pub('hi', { from: myId, t: 'ping' }); }
  if (G.isHost && m.t === 'hello') publish(true);
}
const canJudge = () => G.connectedAt && Date.now() - G.connectedAt > (G.localMode ? 4500 : 6500);
const online = id => id === myId || G.solo || (G.seen[id] && Date.now() - G.seen[id] < 13000) || (G.isHost && Date.now() - G.hostStart < 15000);

function onStateMsg(m) {
  if (!m || !m.s || G.probe) return;
  const s = m.s;
  if (G.s && s.room !== G.s.room) return;
  if (G.s && s.v < G.s.v && s.host === G.s.host) return;
  if (G.isHost && s.host === myId && G.s && s.v <= G.s.v) return; // 自己的回音
  G.lastStateAt = Date.now(); G.hostSeenAt = Date.now();
  G.offset = Date.now() - m.now;
  if (G.isHost && s.host !== myId) { G.isHost = false; toast('房主已交給 ' + (nameOf(s, s.host) || '其他玩家')); }
  if (!G.isHost && s.host === myId && G.s == null) { G.isHost = true; G.hostStart = Date.now(); }
  applyState(s);
}
function nameOf(s, id) { const a = (s.players || s.seats || []).find(p => p.id === id || p.ctl === id); return a && a.name; }

function checkHostAlive() {
  const s = G.s; if (!s || G.isHost || G.solo || s.phase !== 'play') return;
  if (Date.now() - G.lastStateAt < 22000 || Date.now() - (G.hostSeenAt || 0) < 22000) return;
  // 房主斷線太久：由線上 id 最小的真人玩家接手
  const cands = s.players.filter(p => !p.bot && !p.out && p.ctl !== s.host && online(p.ctl)).map(p => p.ctl);
  if (!cands.includes(myId)) cands.push(myId);
  cands.sort();
  if (cands[0] === myId) {
    G.isHost = true; G.hostStart = Date.now();
    s.host = myId; s.v += 1000;
    toast('原房主斷線，由你接手主持遊戲');
    publish(true);
  }
}

// ---------- 房主：處理動作 ----------
function onAction(m) {
  const s = G.s; if (!s || !m || !m.a) return;
  G.seen[m.from] = Date.now();
  const a = m.a;
  if (s.phase === 'lobby') {
    if (a.type === 'join') {
      let seat = s.seats.find(x => x.id === m.from);
      const taken = s.seats.filter(x => x.id !== m.from).map(x => x.char);
      let ch = CHARS.find(c => c.id === a.char) ? a.char : 'boss';
      if (taken.includes(ch)) ch = (CHARS.find(c => !taken.includes(c.id)) || CHARS[0]).id;
      const name = String(a.name || '玩家').slice(0, 8);
      if (seat) { seat.name = name; seat.char = ch; }
      else if (s.seats.length < 6) s.seats.push({ id: m.from, name, char: ch, ctl: m.from });
      else return;
      publish(); return;
    }
    if (a.type === 'leave') { s.seats = s.seats.filter(x => x.id !== m.from); publish(); return; }
    return;
  }
  if (s.phase === 'play' || s.phase === 'over') {
    if (a.type === 'emote') { act(s, m.pid, a, hnow()); publish(); return; }
    const p = pl(s, m.pid);
    if (!p || p.ctl !== m.from) return;
    const err = act(s, m.pid, a, Date.now());
    if (!err) publish();
    else if (G.net) G.net.pub('hi', { from: myId, t: 'err', to: m.from, msg: err });
  }
}
function send(pid, a) {
  if (G.isHost) {
    if (G.s.phase === 'lobby') return;
    const err = act(G.s, pid, a, Date.now());
    if (err) toast(err); else publish();
  } else if (G.net) G.net.pub('act', { from: myId, pid, a });
}

let pubTimer = null;
function publish(now = false) {
  if (!G.isHost || !G.s) return;
  G.s.v++;
  if (now) doPublish(); else if (!pubTimer) pubTimer = setTimeout(doPublish, 60);
  applyState(G.s);
}
function doPublish() {
  clearTimeout(pubTimer); pubTimer = null;
  if (!G.s) return;
  if (G.net) G.net.pub('st', { s: G.s, now: Date.now() }, true);
  if (!G.solo) LS.set('tr3d-save-' + G.room, { s: G.s, t: Date.now() });
  else LS.set('tr3d-solo', { s: G.s, t: Date.now() });
}
// 房主主迴圈
setInterval(() => {
  if (!G.isHost || !G.s || G.s.phase !== 'play') return;
  const isAuto = p => p.bot || !online(p.ctl);
  let changed = false, n = 0;
  while (tick(G.s, Date.now(), isAuto) && n++ < 5) changed = true;
  if (changed) publish();
}, 100);
// 房主就算沒變化也定期重送（讓新加入者拿到最新狀態）
setInterval(() => { if (G.isHost && G.s && !G.solo) doPublish(); }, 6000);

// ---------- 套用狀態 ----------
function applyState(s) {
  const first = !G.s || G.s !== s && G.seenFx < 0;
  G.s = s;
  if (s.phase === 'lobby') {
    if (G.joinWanted && !s.seats.find(x => x.id === myId)) {
      G.net.pub('act', { from: myId, a: { type: 'join', name: myName(), char: pickChar } });
      LS.set('tr3d-seat-' + G.room, myId);
    }
    G.joinWanted = false;
    if (!s.seats.find(x => x.ctl === myId) && !G.isHost && !G.joinedOnce) {
      const tk = s.seats.map(x => x.char).join();
      if (G.takenKey !== tk) { G.takenKey = tk; renderCharPick(s.seats.map(x => x.char)); }
      $('#homeMsg').textContent = `房間 ${s.room}：目前 ${s.seats.length}/6 人，按「加入房間」入座`;
      return;
    }
    G.joinedOnce = true;
    if ($('#lobby').classList.contains('hidden')) enterLobby();
    renderLobby();
    return;
  }
  // 遊戲中
  if (G.seenFx < 0) G.seenFx = s.fxn;
  if (!s.players.find(p => p.ctl === myId) && !G.claimAsked) tryClaimSeat(s);
  world.setState(s, G.offset);
  for (const [id, img] of Object.entries(G.avatars)) world.setAvatar(id, img);
  if ($('#hud').classList.contains('hidden')) enterGame();
  for (const f of s.fx) if (f.n > G.seenFx) { G.seenFx = f.n; playFx(s, f); }
  renderHud();
}
function tryClaimSeat(s) {
  if (!G.solo && !canJudge()) { if (!G.claimTimer) G.claimTimer = setTimeout(() => { G.claimTimer = null; if (G.s && G.s.players && !G.s.players.find(p => p.ctl === myId)) tryClaimSeat(G.s); }, 2000); return; }
  const saved = LS.get('tr3d-seat-' + s.room, null);
  const p = saved && s.players.find(x => x.ctl === saved && !x.bot);
  if (p && !online(p.ctl)) { myId = saved; SS.set('tr3d-sid', myId); if (s.host === myId) { G.isHost = true; G.hostStart = Date.now(); } toast('已重新回到座位：' + p.name); return; }
  G.claimAsked = true;
  const offl = s.players.filter(x => !x.bot && !x.out && !online(x.ctl));
  if (!offl.length) { toast('遊戲已開始，你目前是觀戰模式'); return; }
  openSheet(`<h3>遊戲進行中</h3><p class="note">如果你是斷線的玩家，點選你的名字回到座位；否則可以觀戰。</p>
    ${offl.map(x => `<button class="ghost" style="width:100%;margin:4px 0" data-claim="${esc(x.ctl)}">${charOf(x.char).emoji} 我是 ${esc(x.name)}</button>`).join('')}
    <button class="blue" style="width:100%;margin-top:6px" data-close>只觀戰</button>`);
  $('#sheet').querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
    myId = b.dataset.claim; SS.set('tr3d-sid', myId); LS.set('tr3d-seat-' + s.room, myId);
    G.net && G.net.pub('hi', { from: myId, t: 'ping' }); closeSheet(); renderHud();
  });
}

// ---------- 等待室 ----------
function enterLobby() {
  show('#lobby');
  if (G.solo) { $('#roomBox').classList.add('hidden'); }
  else {
    $('#roomBox').classList.remove('hidden');
    $('#roomCode').textContent = G.room;
    $('#shareUrl').value = shareUrl();
    try {
      const qr = qrcode(0, 'M'); qr.addData(shareUrl()); qr.make();
      $('#qr').innerHTML = qr.createImgTag(4, 8);
    } catch (e) { $('#qr').innerHTML = ''; }
  }
  renderLobby();
}
function renderLobby() {
  const s = G.s; if (!s || s.phase !== 'lobby') return;
  $('#seatCount').textContent = `(${s.seats.length}/6)`;
  $('#seats').innerHTML = s.seats.map((x, i) => {
    const c = charOf(x.char);
    const tag = x.bot ? '電腦' : x.ctl === s.host ? '房主' : x.ctl === myId ? '你' : (x.ctl !== x.id ? '本機' : '');
    const off = !x.bot && !online(x.ctl) ? ' <small style="color:#e53935">離線</small>' : '';
    return `<div class="seat"><div class="e" style="background:${c.color}33">${avHtml(x.id, c.emoji)}</div>
      <div class="nm" style="color:${c.color}">${esc(x.name)} <small>${tag}</small>${off}<br><small>${c.sk.map(k => k[1]).join('・')}</small></div>
      ${G.isHost && x.id !== myId ? `<button class="ghost" data-kick="${i}">移除</button>` : ''}</div>`;
  }).join('');
  $('#seats').querySelectorAll('[data-kick]').forEach(b => b.onclick = () => { s.seats.splice(+b.dataset.kick, 1); publish(); });
  $('#hostCtl').classList.toggle('hidden', !G.isHost);
  if (G.isHost) {
    $('#setCash').value = s.settings.startCash; $('#setRounds').value = s.settings.maxRounds; $('#setDice').value = s.settings.dice;
    $('#startBtn').disabled = s.seats.length < 2;
    $('#addBot').disabled = $('#addLocal').disabled = s.seats.length >= 6;
  }
  $('#lobbyMsg').textContent = G.isHost ? (s.seats.length < 2 ? '至少需要 2 位玩家（可加電腦）' : '人到齊就按開始！') : '等待房主開始遊戲…';
}
function freeChar(s) { const t = s.seats.map(x => x.char); return (CHARS.find(c => !t.includes(c.id)) || CHARS[0]).id; }
function addBot() {
  const s = G.s; if (s.seats.length >= 6) return;
  const ch = freeChar(s); const nm = charOf(ch).name;
  s.seats.push({ id: 'bot-' + rid(4), name: nm + '(電腦)', char: ch, bot: true, ctl: myId });
}
$('#addBot').onclick = () => { addBot(); publish(); };
$('#addLocal').onclick = () => {
  const s = G.s; if (s.seats.length >= 6) return;
  const ch = freeChar(s);
  s.seats.push({ id: myId + '-' + rid(3), name: charOf(ch).name, char: ch, ctl: myId });
  publish();
};
for (const [id, k] of [['#setCash', 'startCash'], ['#setRounds', 'maxRounds'], ['#setDice', 'dice']]) $(id).onchange = e => { G.s.settings[k] = +e.target.value; publish(); };
$('#copyBtn').onclick = async () => {
  try { await navigator.clipboard.writeText($('#shareUrl').value); toast('已複製網址'); }
  catch (e) { $('#shareUrl').select(); toast('請長按網址複製'); }
};
$('#leaveBtn').onclick = () => {
  if (G.net && !G.isHost) G.net.pub('act', { from: myId, a: { type: 'leave' } });
  location.href = location.pathname;
};
$('#startBtn').onclick = () => {
  const s = G.s;
  const g = createGame(s.seats, s.settings, Date.now());
  g.players.forEach((p, i) => { p.ctl = s.seats[i].ctl; });
  g.host = myId; g.room = s.room; g.v = s.v + 1; g.seats = s.seats;
  G.s = g; G.hostStart = Date.now(); G.seenFx = -1;
  publish(true);
};

// ---------- 遊戲畫面 ----------
function enterGame() {
  show('#hud');
  closeSheet();
  world.zoomIn();
  $('#emotes').innerHTML = EMOTES.map(e => `<button data-e="${e}">${e}</button>`).join('');
  $('#emotes').querySelectorAll('button').forEach(b => b.onclick = () => {
    const me = myPlayer(); if (me) send(me.id, { type: 'emote', e: b.dataset.e });
    $('#emotes').classList.add('hidden');
  });
  wakeLock();
}
let wl = null;
async function wakeLock() { try { if ('wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && G.s && G.s.phase === 'play') { wakeLock(); if (G.net) G.net.pub('hi', { from: myId, t: 'hello' }); } });

const myPlayers = () => (G.s && G.s.players ? G.s.players.filter(p => p.ctl === myId && !p.bot) : []);
function myPlayer() { const s = G.s; if (!s || !s.players) return null; const c = cur(s); if (c && c.ctl === myId && !c.bot) return c; return myPlayers()[0] || null; }
const isMyTurn = () => { const s = G.s; const c = s && s.players && cur(s); return !!(c && c.ctl === myId && !c.bot && s.phase === 'play'); };

function renderPlayers() {
  const s = G.s; if (!s || !s.players) return;
  $('#players').innerHTML = s.players.map((p, i) => {
    const c = charOf(p.char);
    const ic = [p.god ? GODS[p.god.id].icon : '', p.st.hosp ? '🏥' : '', p.st.jail ? '🚓' : '', p.st.sleep ? '😴' : '', p.st.turtle ? '🐢' : '', p.dir < 0 ? '🔄' : ''].join('');
    const off = !p.bot && !online(p.ctl) && s.phase === 'play' ? '<span class="off">離線・託管</span>' : '';
    return `<div class="pc ${i === s.turn && s.phase === 'play' ? 'cur' : ''} ${p.out ? 'out' : ''}" data-p="${esc(p.id)}">
      <div class="av" style="background:${c.color}33">${avHtml(p.ctl === p.id || p.bot ? p.id : '', c.emoji)}</div>
      <div><div class="nm" style="color:${c.color}">${esc(p.name)}${p.ctl === myId && !p.bot ? '（你）' : ''}</div>
      <div class="cash">${p.out ? '破產' : money(p.cash)}</div><div class="ic">${ic}</div></div>${off}</div>`;
  }).join('');
  $('#players').querySelectorAll('.pc').forEach(el => el.onclick = () => showPlayer(el.dataset.p));
}

function renderHud() {
  const s = G.s; if (!s || !s.players) return;
  renderPlayers();
  $('#roundinfo').textContent = `第 ${s.round}${s.settings.maxRounds ? '/' + s.settings.maxRounds : ''} 回合`;
  const feed = s.log.slice(-4);
  $('#feed').innerHTML = feed.map(l => `<div>${esc(l)}</div>`).join('');
  renderNet();
  if (s.phase === 'over') { renderOver(); return; }
  const c = cur(s), mine = isMyTurn();
  const acts = $('#acts');
  let st = '';
  if (s.step === 'pre') st = mine ? `輪到你了！${c.name}` : `${c.name} 的回合…`;
  else if (s.step === 'move') st = `${c.name} 移動中…`;
  else if (s.step === 'decide') st = mine ? '請做決定' : `${c.name} 思考中…`;
  else st = `${c.name}`;
  $('#status').textContent = st;
  const key = s.v + ':' + mine + ':' + s.step + ':' + G.ui.mode;
  if (acts.dataset.k !== key) {
    acts.dataset.k = key;
    if (mine && s.step === 'pre') {
      acts.innerHTML = `<button class="ghost" id="aCard">🃏 道具 ${c.cards.length}</button><button class="pri" id="rollBtn">🎲 擲骰子</button><button class="ghost" id="aStock">📈 股市</button>`;
      $('#rollBtn').onclick = () => { if (G.ui.target) cancelTarget(); beep('dice'); send(c.id, { type: 'roll' }); };
      $('#aCard').onclick = () => openCards();
      $('#aStock').onclick = () => openStock();
    } else {
      const me = myPlayer();
      acts.innerHTML = me ? `<button class="ghost" id="aMine">👤 我的資產</button>` : '<span style="color:#fff;font-size:13px">觀戰中</span>';
      if (me) $('#aMine').onclick = () => showPlayer(me.id);
    }
  }
  // 決策視窗
  if (mine && s.step === 'decide' && s.pending) {
    const pk = s.v + s.pending.type;
    if (G.ui.decideKey !== s.pending.type + ':' + s.turn + ':' + s.round || G.ui.mode !== 'decide') { G.ui.decideKey = s.pending.type + ':' + s.turn + ':' + s.round; openDecide(); }
    else if (s.pending.type === 'shop' || s.pending.type === 'bank') openDecide(true);
  } else if (G.ui.mode === 'decide') { G.ui.decideKey = null; closeSheet(); }
  // 計時條
  updateTimer();
  // 骰子動畫
  if (s.anim && s.anim.dice && s.anim.t0 !== G.lastAnim && s.step === 'move') { G.lastAnim = s.anim.t0; showDice(s.anim); }
}
setInterval(updateTimer, 250);
function updateTimer() {
  const s = G.s; const el = $('#timer');
  if (!s || !s.players || s.phase !== 'play' || !(s.step === 'pre' || s.step === 'decide') || !isMyTurn()) { el.style.visibility = 'hidden'; return; }
  el.style.visibility = 'visible';
  const tot = s.step === 'pre' ? PRE_T : DEC_T;
  const left = Math.max(0, s.deadline - hnow());
  el.firstElementChild.style.width = (left / tot * 100) + '%';
  el.firstElementChild.style.background = left < 8000 ? '#ff5252' : '#ffeb3b';
}

// ---------- 骰子 ----------
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieHtml = v => `<div class="die ${v === 1 ? 'one' : ''}">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[v].includes(i) ? 'on' : ''}"></i>`).join('')}</div>`;
function showDice(an) {
  const el = $('#dice'); el.classList.remove('hidden');
  const start = Date.now();
  const spin = () => {
    const el2 = Date.now() - start;
    if (el2 < 750) { el.innerHTML = an.dice.map(() => dieHtml(1 + Math.floor(Math.random() * 6))).join(''); el.querySelectorAll('.die').forEach(d => d.classList.add('spin')); requestAnimationFrame(spin); }
    else { el.innerHTML = an.dice.map(v => dieHtml(v)).join(''); setTimeout(() => el.classList.add('hidden'), 900); }
  };
  beep('dice'); spin();
  const n = an.path.length - 1;
  for (let k = 0; k < n; k++) setTimeout(() => beep('step'), 900 + k * 340);
}

// ---------- 特效 ----------
let noticeT;
function playFx(s, f) {
  const p = f.pid && pl(s, f.pid);
  switch (f.k) {
    case 'money':
      if (!f.d) break;
      if (Math.abs(f.d) >= 1000) world.react(f.pid, f.d > 0 ? 'cheer' : 'sad', 1500);
      world.floatText(f.pid, (f.d > 0 ? '+' : '') + money(f.d), f.d > 0 ? '#9cff57' : '#ff6b6b');
      beep(f.d > 0 ? 'coin' : 'pay'); break;
    case 'notice':
      showNotice(f.title, f.text, f.kind); break;
    case 'card': world.floatText(f.pid, CARDS[f.card].icon + CARDS[f.card].name, '#ffe082'); break;
    case 'buy': world.burst(f.tile, world.colors[f.pid] || '#ffcc00', 18); world.react(f.pid, 'cheer', 1400); beep('build'); break;
    case 'build': world.burst(f.tile, '#ffd54f', 20); beep('build'); break;
    case 'boom': world.burst(f.tile, f.m === 'block' ? '#ff9800' : '#ff1744', 34); beep('boom'); break;
    case 'emote': world.floatText(f.pid, f.e, '#ffffff'); world.react(f.pid, 'wave', 1500); break;
    case 'bankrupt': showNotice('💸 破產', `${p ? p.name : ''} 破產出局了！`, 'evil'); break;
    case 'mark': world.burst(f.tile, '#ff9800', 10); break;
  }
}
function showNotice(title, text, kind) {
  const n = $('#notice'); n.querySelector('.nb').className = 'nb k-' + (kind || 'chance');
  n.querySelector('.nt').textContent = title; n.querySelector('.nx').textContent = text;
  n.classList.add('show'); beep('notice');
  clearTimeout(noticeT); noticeT = setTimeout(() => n.classList.remove('show'), 2300);
}
let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => el.style.opacity = 0, 2200); }

// ---------- 視窗 ----------
function openSheet(html, mode = 'info', center = false) {
  G.ui.mode = mode;
  $('#sheet').innerHTML = html;
  $('#modal').classList.toggle('center', center);
  $('#modal').classList.remove('hidden');
  $('#sheet').querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeSheet());
}
function closeSheet() { $('#modal').classList.add('hidden'); G.ui.mode = null; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && G.ui.mode !== 'decide') closeSheet(); });

function tileInfoHtml(i) {
  const s = G.s, t = TILES[i];
  let h = `<h3>${t.icon || ''} ${esc(t.name)}</h3><p class="note">${esc(t.desc || '')}</p>`;
  if (t.type === 'prop' && s.tiles) {
    const st = s.tiles[i], o = st.o && pl(s, st.o);
    h += `<div class="kv"><b>區域</b><span style="color:${GROUPS[t.g].color};font-weight:900">${GROUPS[t.g].name}</span>
      <b>地主</b><span>${o ? esc(o.name) : '（無）'}</span><b>建築</b><span>${LEVEL_NAMES[st.l]}</span>
      <b>地價</b><span>${money(price(s, i))}</span><b>加蓋費</b><span>${money(upCost(s, i))}／層</span>
      <b>目前過路費</b><span style="color:#e53935;font-weight:900">${o ? money(toll(s, i)) : '—'}</span></div>
      <p class="note">過路費：空地 ${money(price(s, i) * TOLL_MUL[0])} → 摩天大樓 ${money(price(s, i) * TOLL_MUL[5])}。擁有整個區域時過路費 ×1.5。</p>`;
  }
  return h;
}
function onTileClick(i) {
  if (G.ui.target && G.ui.target.kind === 'tile') {
    if (G.ui.target.list.includes(i)) finishTarget(i); else toast('這格不能選');
    return;
  }
  if (!G.s || G.ui.mode === 'decide') return;
  openSheet(tileInfoHtml(i) + '<button class="ghost" data-close style="width:100%">關閉</button>');
}
function showPlayer(id) {
  const s = G.s, p = pl(s, id); if (!p) return;
  const c = charOf(p.char);
  const props = s.tiles.map((t, i) => (t && t.o === id ? i : -1)).filter(i => i >= 0);
  openSheet(`<button class="x" data-close>✕</button><h3>${c.emoji} <span style="color:${c.color}">${esc(p.name)}</span></h3>
    <div class="kv"><b>現金</b><span>${money(p.cash)}</span><b>存款</b><span>${money(p.deposit)}</span><b>股票</b><span>${money(stockValue(s, p))}</span>
    <b>點券</b><span>${p.points}</span><b>總資產</b><span style="font-weight:900">${money(assets(s, p))}</span>
    <b>神明</b><span>${p.god ? `${GODS[p.god.id].icon}${GODS[p.god.id].name}（剩 ${p.god.t} 回合）` : '—'}</span>
    <b>道具卡</b><span>${p.ctl === myId || G.s.phase === 'over' ? (p.cards.map(k => CARDS[k].icon + CARDS[k].name).join('、') || '—') : p.cards.length + ' 張'}</span></div>
    <div class="lab">角色技能</div><div class="note">${c.sk.map(k => `⭐ <b>${k[1]}</b>：${k[2]}`).join('<br>')}</div>
    <div class="lab">土地（${props.length}）</div>
    <div class="note">${props.map(i => `${esc(TILES[i].name)}・${LEVEL_NAMES[s.tiles[i].l]}`).join('<br>') || '還沒有土地'}</div>`);
}

// 決策
function openDecide(refresh = false) {
  const s = G.s, p = cur(s), pd = s.pending; if (!pd) return;
  let h = '';
  const id = p.id;
  if (pd.type === 'buy') {
    const i = pd.tile;
    h = tileInfoHtml(i) + `<p>要花 <b>${money(price(s, i))}</b> 買下嗎？（你有 ${money(p.cash)}）</p>
      <div class="choice"><button class="green" data-a="yes">🏠 買下</button><button class="ghost" data-a="no">不買</button></div>`;
  } else if (pd.type === 'upgrade') {
    const i = pd.tile, st = s.tiles[i], c1 = upCostFor(s, i, p);
    const two = st.l <= 3 && p.cash >= c1 * 2;
    h = tileInfoHtml(i) + `<p>要加蓋成 <b>${LEVEL_NAMES[st.l + 1]}</b> 嗎？每層 <b>${c1 ? money(c1) : '免費（福神）'}</b>（你有 ${money(p.cash)}）</p>
      <div class="choice"><button class="green" data-a="yes">🏗️ 蓋一層</button>${two ? `<button class="green" data-n2>🏗️🏗️ 蓋兩層（${money(c1 * 2)}）</button>` : ''}<button class="ghost" data-a="no">不用</button></div>`;
  } else if (pd.type === 'shop') {
    h = `<h3>🏪 道具店</h3><p>你的點券：<b>${p.points}</b>　道具卡 ${p.cards.length}/${cardLimit(p)}</p><div class="cards">` +
      Object.entries(CARDS).map(([k, c]) => `<div class="card"><div class="t">${c.icon} ${c.name}</div><div class="d">${c.desc}</div>
      <button class="${p.points >= cardCost(p, k) ? 'pri' : 'ghost'}" data-buy="${k}" ${p.points < cardCost(p, k) || p.cards.length >= cardLimit(p) ? 'disabled' : ''}>${cardCost(p, k)} 點</button></div>`).join('') +
      `</div><button class="blue" style="width:100%;margin-top:10px" data-a="done">離開商店</button>`;
  } else if (pd.type === 'lottery') {
    h = `<h3>🎰 彩券行</h3><p>花 $500 猜一個點數，開出的骰子一樣就贏 <b>$3000</b>！</p>
      <div class="choice">${[1, 2, 3, 4, 5, 6].map(n => `<button class="pri" data-pick="${n}">${n}</button>`).join('')}</div>
      <button class="ghost" style="width:100%;margin-top:8px" data-a="no">不玩</button>`;
  } else if (pd.type === 'bank') {
    h = `<h3>🏦 銀行</h3><div class="kv"><b>現金</b><span>${money(p.cash)}</span><b>存款</b><span>${money(p.deposit)}</span></div>
      <p class="note">存款每次經過台北車站有 5% 利息，而且不會被查稅、均富卡拿走。</p>
      <div class="choice"><button class="green" data-bank="1000">存 $1000</button><button class="green" data-bank="5000">存 $5000</button><button class="green" data-bank="${p.cash}">全部存入</button></div>
      <div class="choice"><button class="blue" data-bank="-1000">領 $1000</button><button class="blue" data-bank="-5000">領 $5000</button><button class="blue" data-bank="${-p.deposit}">全部領出</button></div>
      <button class="ghost" style="width:100%;margin-top:10px" data-a="done">完成</button>`;
  }
  openSheet(h, 'decide');
  const sh = $('#sheet');
  sh.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { send(id, { type: b.dataset.a }); closeSheet(); });
  sh.querySelectorAll('[data-n2]').forEach(b => b.onclick = () => { send(id, { type: 'yes', n: 2 }); closeSheet(); });
  sh.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => send(id, { type: 'buyCard', card: b.dataset.buy }));
  sh.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { send(id, { type: 'pick', num: +b.dataset.pick }); closeSheet(); });
  sh.querySelectorAll('[data-bank]').forEach(b => b.onclick = () => send(id, { type: 'bank', amount: +b.dataset.bank }));
}

// 道具卡
function openCards() {
  const s = G.s, p = cur(s);
  if (!p.cards.length) { toast('你沒有道具卡，到道具店用點券買吧'); return; }
  const counts = {}; p.cards.forEach(k => counts[k] = (counts[k] || 0) + 1);
  openSheet(`<button class="x" data-close>✕</button><h3>🃏 我的道具卡</h3><p class="note">點券：${p.points}（免費卡會在付過路費時自動使用）</p><div class="cards">` +
    Object.entries(counts).map(([k, n]) => { const c = CARDS[k]; return `<div class="card"><div class="t">${c.icon} ${c.name} ×${n}</div><div class="d">${c.desc}</div>
    ${c.target === 'auto' ? '<button class="ghost" disabled>自動</button>' : `<button class="pri" data-use="${k}">使用</button>`}</div>`; }).join('') + '</div>');
  $('#sheet').querySelectorAll('[data-use]').forEach(b => b.onclick = () => useCardFlow(b.dataset.use));
}
function useCardFlow(k) {
  const s = G.s, p = cur(s), c = CARDS[k];
  const tg = cardTargets(s, p, k);
  if (c.target === 'none' || c.target === 'here') {
    if (tg && !tg.length) { toast('現在不能用：' + (c.target === 'here' ? '腳下不是別人的地或錢不夠' : '')); return; }
    closeSheet(); send(p.id, { type: 'card', card: k }); return;
  }
  if (c.target === 'dice') {
    const n = s.settings.dice || 1;
    openSheet(`<h3>🎲 遙控骰子</h3><p>要走幾步？</p><div class="choice">${Array.from({ length: 5 * n + 1 }, (_, i) => i + n).map(v => `<button class="pri" data-v="${v}">${v}</button>`).join('')}</div>
      <button class="ghost" style="width:100%;margin-top:8px" data-close>取消</button>`);
    $('#sheet').querySelectorAll('[data-v]').forEach(b => b.onclick = () => { closeSheet(); send(p.id, { type: 'card', card: k, value: +b.dataset.v }); });
    return;
  }
  if (c.target === 'player') {
    if (!tg.length) { toast('沒有可以選的玩家'); return; }
    openSheet(`<h3>${c.icon} ${c.name}</h3><p>選擇對象：</p>` + tg.map(id => { const o = pl(s, id); return `<button class="ghost" style="width:100%;margin:4px 0" data-t="${esc(id)}">${charOf(o.char).emoji} ${esc(o.name)}　${money(o.cash)}・${o.cards.length} 張卡</button>`; }).join('') +
      `<button class="ghost" style="width:100%;margin-top:6px" data-close>取消</button>`);
    $('#sheet').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { closeSheet(); send(p.id, { type: 'card', card: k, target: b.dataset.t }); });
    return;
  }
  // 選格子
  if (!tg.length) { toast('沒有可以選的格子'); return; }
  closeSheet();
  G.ui.target = { kind: 'tile', list: tg, card: k, pid: p.id };
  world.setHighlight(tg);
  openSheet(`<h3>${c.icon} ${c.name}：選擇格子</h3><p class="note">點地圖上發光的格子，或從下面選：</p><div class="choice">` +
    tg.map(i => `<button class="ghost" data-tile="${i}" style="flex:1 1 45%">${esc(TILES[i].name)}${s.tiles[i] && s.tiles[i].o ? '・' + LEVEL_NAMES[s.tiles[i].l] : ''}</button>`).join('') +
    `</div><button class="ghost" style="width:100%;margin-top:8px" id="tgCancel">取消</button>`, 'target');
  $('#modal').classList.remove('center');
  $('#sheet').querySelectorAll('[data-tile]').forEach(b => b.onclick = () => finishTarget(+b.dataset.tile));
  $('#tgCancel').onclick = () => cancelTarget();
}
function finishTarget(i) {
  const t = G.ui.target; G.ui.target = null; world.setHighlight(null); closeSheet();
  send(t.pid, { type: 'card', card: t.card, tile: i });
}
function cancelTarget() { G.ui.target = null; world.setHighlight(null); closeSheet(); }

// 股市
function openStock() {
  const s = G.s; if (!s || !s.market) return;
  const me = myPlayer();
  const can = isMyTurn() && s.step === 'pre';
  const spark = h => { const mx = Math.max(...h), mn = Math.min(...h), w = 80, ht = 22; return `<svg width="${w}" height="${ht}"><polyline fill="none" stroke="#1e88e5" stroke-width="2" points="${h.map((v, i) => `${(i / Math.max(1, h.length - 1)) * w},${ht - ((v - mn) / Math.max(0.01, mx - mn)) * (ht - 2) - 1}`).join(' ')}"/></svg>`; };
  openSheet(`<button class="x" data-close>✕</button><h3>📈 寶島股市</h3><p class="note">${can ? `現金 ${money(me.cash)}。擲骰前可以買賣。` : '輪到你、擲骰前才能交易。'}股價每回合變動，新聞會影響股市。</p>` +
    s.market.map((m, k) => {
      const prev = m.h.length > 1 ? m.h[m.h.length - 2] : m.p, ch = ((m.p - prev) / prev * 100);
      const hold = me ? me.stocks[k] : 0;
      return `<div class="stk"><div><b>${STOCKS[k].name}</b> <span class="${ch >= 0 ? 'up' : 'dn'}">$${m.p.toFixed(1)} ${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(1)}%</span><br><small>持有 ${hold} 股（${money(hold * m.p)}）</small></div><div>${spark(m.h)}</div>
      ${can ? `<div class="bt"><button class="red" data-q="${k},100">買100</button><button class="red" data-q="${k},1000">買1000</button><button class="green" data-q="${k},-100" ${hold < 100 ? 'disabled' : ''}>賣100</button><button class="green" data-q="${k},-${hold}" ${!hold ? 'disabled' : ''}>全賣</button></div>` : ''}</div>`;
    }).join(''), 'stock');
  $('#sheet').querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    const [k, q] = b.dataset.q.split(',').map(Number); send(cur(G.s).id, { type: 'stock', sid: k, qty: q });
    setTimeout(() => { if (G.ui.mode === 'stock') openStock(); }, 400);
  });
}

// 結束
function renderOver() {
  const s = G.s;
  if (G.ui.mode === 'over') return;
  const medal = ['🥇', '🥈', '🥉', '4', '5', '6'];
  openSheet(`<h3 style="text-align:center;font-size:26px">🏁 遊戲結束</h3>` +
    s.rank.map((r, i) => { const p = pl(s, r.id), c = charOf(p.char); return `<div class="rank"><span class="m">${medal[i]}</span><span style="font-size:24px">${c.emoji}</span><span style="flex:1;color:${c.color}">${esc(p.name)}</span><span>${p.out ? '破產' : money(r.a)}</span></div>`; }).join('') +
    (G.isHost ? `<button class="pri" style="width:100%;margin-top:10px" id="againBtn">🔁 再玩一局</button>` : '<p class="note" style="text-align:center">等房主開新的一局…</p>') +
    `<button class="ghost" style="width:100%;margin-top:6px" data-close>看地圖</button>`, 'over', true);
  const ag = $('#againBtn');
  if (ag) ag.onclick = () => {
    const l = lobbyState(); l.seats = s.seats || []; l.settings = s.settings; l.v = s.v + 1;
    G.s = l; G.seenFx = -1; closeSheet(); G.ui.mode = null; publish(true); enterLobby();
  };
  $('#acts').innerHTML = `<button class="pri" id="rankBtn">🏆 排名</button>`;
  $('#rankBtn').onclick = () => { G.ui.mode = null; renderOver(); };
  $('#status').textContent = '遊戲結束';
}

// 按鈕
$('#camBtn').onclick = () => { if (world.follow) { world.overview(); toast('全島視角'); } else { world.zoomIn(); toast('跟隨目前玩家'); } };
$('#stockBtn').onclick = () => openStock();
$('#logBtn').onclick = () => { if (!G.s) return; openSheet(`<button class="x" data-close>✕</button><h3>📜 遊戲紀錄</h3><div class="note" style="font-size:13px;color:#333">${G.s.log.slice().reverse().map(esc).join('<br>')}</div>`); };
$('#emoBtn').onclick = () => $('#emotes').classList.toggle('hidden');
$('#sndBtn').onclick = () => { G.sound = !G.sound; LS.set('tr3d-snd', G.sound); $('#sndBtn').textContent = G.sound ? '🔊' : '🔇'; };
$('#sndBtn').textContent = G.sound ? '🔊' : '🔇';
$('#helpBtn').onclick = () => openSheet(`<button class="x" data-close>✕</button><h3>❔ 玩法說明</h3><div class="note" style="font-size:14px;color:#333">
  <p>🎲 輪到你時先可以用道具卡、買賣股票，再擲骰子前進。</p>
  <p>🏠 停在無人景點可以買下；停在自己的地可以加蓋，最高蓋到摩天大樓。別人停到你的地要付過路費，擁有整個區域過路費 ×1.5。</p>
  <p>🚉 經過台北車站領薪水 $2000、點券 +10、存款利息 5%。</p>
  <p>🏪 道具店用點券買卡；⛩️ 廟會請到神明附身 5 回合（財神、福神、土地公、媽祖是好神，衰神、窮神是壞神）。</p>
  <p>❓ 機會、📰 新聞會發生隨機事件；🏦 銀行可存提款；🎰 彩券行猜點數。</p>
  <p>💸 付不出錢會自動提款、賣股票、賣地，還不夠就破產。最後只剩一人、或回合結束時總資產最多的人獲勝！</p>
  <p>📶 斷線的玩家會由電腦暫時託管；重新打開同一個網址就能回到座位。房主斷線太久，會由其他玩家自動接手。</p>
  <p>👆 點地圖上的格子可以看景點介紹和過路費；兩指縮放、拖曳旋轉視角。</p></div>`);

// ---------- 啟動：恢復進度 ----------
(async function boot() {
  if (G.room) {
    const saved = LS.get('tr3d-save-' + G.room, null);
    const seat = LS.get('tr3d-seat-' + G.room, null);
    if (saved && saved.s && saved.s.host === seat && seat !== myId && Date.now() - saved.t < 6 * 3600e3) {
      // 可能是房主重新整理：先確認原房主不在線上（避免同一瀏覽器開第二個分頁搶走房主）
      $('#homeMsg').textContent = '正在恢復房間…';
      G.probe = true;
      try { await connectNet(); } catch (e) { $('#homeMsg').textContent = '❌ 連線失敗，請重新整理。'; return; }
      G.net.pub('hi', { from: 'probe-' + myId, t: 'hello' });
      await new Promise(r => setTimeout(r, G.localMode ? 1200 : 3500));
      G.probe = false;
      if (G.seen[seat] && Date.now() - G.seen[seat] < 6000) { $('#homeMsg').textContent = ''; G.net.pub('hi', { from: myId, t: 'hello' }); return; }
      myId = seat; SS.set('tr3d-sid', myId);
      G.isHost = true; G.hostStart = Date.now(); G.s = saved.s; G.s.v += 500;
      if (G.s.step === 'move') G.s.until = Date.now();
      if (G.s.phase === 'play') { G.s.deadline = Date.now() + PRE_T; }
      publish(true);
      if (G.s.phase === 'lobby') enterLobby();
      return;
    }
    if (saved && saved.s && saved.s.host === seat && seat === myId) {
      try { await connectNet(); } catch (e) { $('#homeMsg').textContent = '❌ 連線失敗，請重新整理。'; return; }
      G.isHost = true; G.hostStart = Date.now(); G.s = saved.s; G.s.v += 500;
      if (G.s.step === 'move') G.s.until = Date.now();
      if (G.s.phase === 'play') G.s.deadline = Date.now() + PRE_T;
      publish(true); if (G.s.phase === 'lobby') enterLobby();
      return;
    }
    if (seat) {
      // 之前加入過：直接重連
      try { await connectNet(); G.net.pub('hi', { from: myId, t: 'hello' }); } catch (e) {}
    }
  }
})();

window.__G = G; window.__world = world;
