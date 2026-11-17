// ===== 寶島富翁 3D：3D 場景 =====
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TILES, N_TILES, GROUPS, CHARS, useMap } from './data.js';
import { buildLandmark, buildHouses, buildToken, animateToken, buildBig, buildOwnerSign, buildComplex, buildConnector, mat, B, C, S } from './landmarks.js';

// 台灣海岸線（經度, 緯度），順時針：北→東→南→西
const COAST = [
  [121.53, 25.30], [121.65, 25.24], [121.74, 25.15], [121.92, 25.05], [122.00, 25.01], [121.87, 24.86], [121.83, 24.70],
  [121.86, 24.58], [121.80, 24.40], [121.70, 24.18], [121.62, 24.00], [121.55, 23.75], [121.48, 23.45], [121.40, 23.15],
  [121.28, 22.95], [121.15, 22.75], [121.00, 22.55], [120.90, 22.33], [120.85, 22.10], [120.87, 21.90], [120.74, 21.94],
  [120.70, 22.10], [120.62, 22.30], [120.45, 22.48], [120.28, 22.58], [120.22, 22.80], [120.15, 23.00], [120.12, 23.20],
  [120.14, 23.40], [120.16, 23.65], [120.25, 23.85], [120.40, 24.05], [120.52, 24.25], [120.63, 24.45], [120.72, 24.62],
  [120.88, 24.82], [121.00, 24.98], [121.15, 25.08], [121.40, 25.17], [121.48, 25.26],
];
const SC = 42;   // 地圖放大
const proj = ([lon, lat]) => new THREE.Vector2((lon - 121) * 0.915 * 1.5 * SC, -(lat - 23.6) * SC);
const POLY = COAST.map(proj);
const SPINE = [[121.6, 24.95], [121.35, 24.35], [121.1, 23.7], [120.92, 23.0], [120.8, 22.3]].map(proj);

function segDist(px, pz, a, b) {
  const dx = b.x - a.x, dz = b.y - a.y; const l = dx * dx + dz * dz;
  let t = l ? ((px - a.x) * dx + (pz - a.y) * dz) / l : 0; t = Math.max(0, Math.min(1, t));
  const x = a.x + dx * t - px, z = a.y + dz * t - pz; return Math.sqrt(x * x + z * z);
}
function inside(px, pz, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pz) !== (b.y > pz) && px < ((b.x - a.x) * (pz - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
function sdist(px, pz) {
  let d = 1e9;
  for (let i = 0; i < POLY.length; i++) d = Math.min(d, segDist(px, pz, POLY[i], POLY[(i + 1) % POLY.length]));
  return inside(px, pz, POLY) ? d : -d;
}
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function heightAt(x, z) {
  const d = sdist(x, z);
  if (d < 0) return Math.max(-2.5, -0.35 + d * 0.18);
  let h = 0.3 + 0.15 * smooth(0, 1.2, d);
  let ds = 1e9; for (let i = 0; i < SPINE.length - 1; i++) ds = Math.min(ds, segDist(x, z, SPINE[i], SPINE[i + 1]));
  const n = vnoise(x * 0.18, z * 0.18) * 0.65 + vnoise(x * 0.5, z * 0.5) * 0.35;
  const m = smooth(8.0, 20, d) * (8.0 * Math.exp(-(ds * ds) / 170) + 1.8) * (0.65 + n * 0.6);
  return h + m;
}

// 路徑：海岸線往內縮
function buildPath() {
  const n = POLY.length, pts = [];
  for (let i = 0; i < n; i++) {
    const p = POLY[i], a = POLY[(i - 1 + n) % n], b = POLY[(i + 1) % n];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    let nm = new THREE.Vector2(-t.y, t.x);
    const test = p.clone().addScaledVector(nm, 0.5);
    if (!inside(test.x, test.y, POLY)) nm.negate();
    pts.push(p.clone().addScaledVector(nm, 2.7));
  }
  let poly = pts;
  for (let it = 0; it < 3; it++) {
    const q = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      q.push(a.clone().lerp(b, 0.25), a.clone().lerp(b, 0.75));
    }
    poly = q;
  }
  const L = [0];
  for (let i = 1; i <= poly.length; i++) L.push(L[i - 1] + poly[i - 1].distanceTo(poly[i % poly.length]));
  const total = L[poly.length];
  const start = proj([121.60, 25.17]);
  let si = 0, sd = 1e9; poly.forEach((p, i) => { const d = p.distanceTo(start); if (d < sd) { sd = d; si = i; } });
  const out = [];
  for (let k = 0; k < N_TILES; k++) {
    let target = (L[si] + (k / N_TILES) * total) % total;
    let j = 0; while (L[j + 1] < target) j++;
    const f = (target - L[j]) / (L[j + 1] - L[j]);
    out.push(poly[j].clone().lerp(poly[(j + 1) % poly.length], f));
  }
  return { pts: out, spacing: total / N_TILES };
}

// ---- 其他地圖：橢圓形環狀路線 ----
function ellipsePath(a, b, start = Math.PI / 2) {
  const M = 720, pts = [];
  for (let k = 0; k < M; k++) { const t = start + (k / M) * Math.PI * 2; pts.push(new THREE.Vector2(Math.cos(t) * a + Math.sin(3 * t) * 1.5, Math.sin(t) * b + Math.cos(2 * t) * 1.2)); }
  const L = [0]; for (let i = 1; i <= M; i++) L.push(L[i - 1] + pts[i - 1].distanceTo(pts[i % M]));
  const total = L[M], out = [];
  for (let k = 0; k < N_TILES; k++) { const target = (k / N_TILES) * total; let j = 0; while (L[j + 1] < target) j++; const f = (target - L[j]) / (L[j + 1] - L[j]); out.push(pts[j].clone().lerp(pts[(j + 1) % M], f)); }
  return { pts: out, spacing: total / N_TILES };
}
const GEO = {
  taiwan: { height: heightAt, path: buildPath, spine: true, W: 225, H: 245, ox: -3, oz: 3, view: [0, 200, 46, 0, 1] },
  taipei: {
    a: 41, b: 30, W: 170, H: 150, ox: 0, oz: 0, view: [0, 118, 30, 0, 2], city: 70,
    height(x, z) {
      const r = Math.hypot(x / 70, z / 58); if (r > 1) return Math.max(-2.5, -0.3 - (r - 1) * 12);
      const rp = Math.hypot(x / 41, z / 30), n = vnoise(x * 0.12, z * 0.12);
      const hill = smooth(1.2, 1.65, rp) * (3.5 + 4 * n + (z < 0 ? smooth(0, -45, z) * 4 : 0)) * (1 - smooth(0.9, 1, r));
      const river = Math.abs(x + 47 + Math.sin(z * 0.08) * 3) < 2.2 ? -0.9 : 0;
      return 0.62 + hill + (hill < 0.5 ? river : 0);
    },
  },
  tainan: {
    a: 38, b: 27, W: 160, H: 140, ox: 0, oz: 0, view: [0, 112, 28, 0, 2], city: 40,
    height(x, z) {
      const coast = -52 + Math.sin(z * 0.09) * 3;
      if (x < coast) return Math.max(-2.5, -0.35 - (coast - x) * 0.25);
      if (Math.abs(z) > 58 || x > 74) return -1.5;
      const n = vnoise(x * 0.1, z * 0.1);
      const hill = smooth(44, 62, x) * (2.5 + 4 * n);
      const salt = (x < -40 && Math.abs(z) < 20) ? -0.05 : 0;
      return 0.32 + 0.32 * smooth(coast, coast + 4, x) + hill + salt;
    },
  },
  islands: {
    a: 38, b: 27, W: 170, H: 150, ox: 0, oz: 0, view: [0, 112, 28, 0, 2], piers: true,
    isl: [[0, 0, 12], [-14, 8, 6], [12, -7, 5], [-60, -20, 6], [58, 22, 7], [-30, -46, 4], [30, 46, 5]],
    height(x, z) {
      let h = -1.4;
      for (const [cx, cz, r] of this.isl) { const d = r - Math.hypot(x - cx, z - cz) + vnoise(x * 0.3, z * 0.3) * 2; if (d > 0) h = Math.max(h, Math.min(0.3 + d * 0.35, 3.5)); else h = Math.max(h, -0.3 + d * 0.25); }
      return h;
    },
  },
  taichung: {
    a: 40, b: 29, W: 165, H: 145, ox: 0, oz: 0, view: [0, 114, 29, 0, 2], city: 55,
    height(x, z) {
      const coast = -60 + Math.sin(z * 0.07) * 3;
      if (x < coast) return Math.max(-2.5, -0.35 - (coast - x) * 0.25);
      if (Math.abs(z) > 66) return -1.5;
      const n = vnoise(x * 0.1, z * 0.1);
      const mtn = smooth(44, 70, x) * (4 + 6 * n);
      const dadu = Math.exp(-((x + 30) ** 2) / 60) * smooth(-10, 20, z) * 1.6;   // 大肚山台地
      return 0.4 + 0.3 * smooth(coast, coast + 5, x) + mtn + dadu * (1 - smooth(-36, -24, Math.abs(x + 30) * -1));
    },
  },
  kaohsiung: {
    a: 40, b: 29, W: 165, H: 145, ox: 0, oz: 0, view: [0, 114, 29, 0, 2], city: 65,
    height(x, z) {
      const coast = -52 + Math.sin(z * 0.08) * 2;
      const qj = Math.abs(x - (-61 + z * 0.06)) < 2.4 && z > -46 && z < 44;   // 旗津沙洲
      if (x < coast) return qj ? 0.38 : Math.max(-2.5, -0.35 - (coast - x) * 0.25);
      if (Math.abs(z) > 66) return -1.5;
      const n = vnoise(x * 0.11, z * 0.11);
      const shou = 4.2 * Math.exp(-((x + 42) ** 2 + (z + 40) ** 2) / 90);           // 壽山
      const east = smooth(46, 68, x) * (2.5 + 4 * n);
      const river = Math.abs(x + 16 + Math.sin(z * 0.1) * 4) < 1.8 && z > -64 && z < 24 && east < 0.3 && shou < 0.3 ? -0.9 : 0;
      return 0.4 + 0.25 * smooth(coast, coast + 4, x) + shou + east + river;
    },
  },
  huadong: {
    a: 25, b: 42, W: 150, H: 170, ox: 0, oz: 0, view: [0, 138, 30, 0, 2],
    isl: [[54, 18, 4.5], [58, 46, 5]],
    height(x, z) {
      const coast = 44 + Math.sin(z * 0.06) * 3;
      const n = vnoise(x * 0.1, z * 0.1);
      let isl = -9;
      for (const [cx, cz, r] of this.isl) { const d = r - Math.hypot(x - cx, z - cz) + n * 1.5; isl = Math.max(isl, d > 0 ? Math.min(0.35 + d * 0.5, 3) : -0.3 + d * 0.3); }
      if (x > coast) return Math.max(isl, Math.max(-2.5, -0.35 - (x - coast) * 0.3));
      if (Math.abs(z) > 80) return -1.5;
      const central = smooth(-30, -60, x) * (3.5 + 4.2 * n);                       // 中央山脈
      const coastal = Math.exp(-((x - 14) ** 2) / 30) * (1.8 + 2.2 * n) * smooth(70, 40, Math.abs(z));   // 海岸山脈
      return 0.4 + 0.3 * smooth(coast, coast - 4, x) + central + coastal;
    },
  },
};
const MAPK = 1.35;   // 其他地圖整體放大倍率
for (const k of ['taipei', 'tainan', 'islands', 'taichung', 'kaohsiung', 'huadong']) {
  const g = GEO[k], h0 = g.height.bind(g);
  g.K = MAPK; g.height = (x, z) => h0(x / MAPK, z / MAPK);
  g.a *= MAPK; g.b *= MAPK; g.W *= MAPK; g.H *= MAPK; g.view = g.view.map(v => v * MAPK);
  g.path = () => ellipsePath(g.a, g.b);
}

// 所有格子的字卡畫在同一張大貼圖上，格子頂面才能合併成一次繪製
function tileAtlas(n) {
  const cols = Math.ceil(Math.sqrt(n)), cv = document.createElement('canvas'); cv.width = cv.height = cols * 256;
  const x = cv.getContext('2d');
  for (let i = 0; i < n; i++) if (TILES[i]) { x.save(); x.translate((i % cols) * 256, Math.floor(i / cols) * 256); drawTile(x, i); x.restore(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, cols, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) };
}
function drawTile(x, i) {
  const t = TILES[i];
  const gc = t.g ? GROUPS[t.g].color : t.type === 'company' ? '#455a64' : t.type === 'bigland' ? '#795548' : '#f9a825';
  x.fillStyle = (t.type === 'prop' || t.type === 'company' || t.type === 'bigland') ? '#fffaf0' : '#fff3c4'; x.fillRect(0, 0, 256, 256);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (t.type === 'prop' || t.type === 'company' || t.type === 'bigland') {
    x.fillStyle = gc; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#fff'; x.font = 'bold 34px "Noto Sans TC",sans-serif'; x.fillText(t.g ? GROUPS[t.g].name : t.type === 'company' ? '🏢 投資公司' : '🏗️ 大型建地', 128, 34);
    x.fillStyle = '#222';
    let fs = 54; x.font = `bold ${fs}px "Noto Sans TC",sans-serif`;
    while (x.measureText(t.name).width > 236 && fs > 24) { fs -= 3; x.font = `bold ${fs}px "Noto Sans TC",sans-serif`; }
    x.fillText(t.name, 128, 138);
    x.fillStyle = '#555'; x.font = 'bold 34px sans-serif'; x.fillText('$' + t.price.toLocaleString(), 128, 210);
  } else {
    x.font = '90px sans-serif'; x.fillText(t.icon || '⭐', 128, 100);
    x.fillStyle = '#222'; let fs = 50; x.font = `bold ${fs}px "Noto Sans TC",sans-serif`;
    while (x.measureText(t.name).width > 236 && fs > 24) { fs -= 3; x.font = `bold ${fs}px "Noto Sans TC",sans-serif`; }
    x.fillText(t.name, 128, 200);
  }
  x.strokeStyle = gc; x.lineWidth = 10; x.strokeRect(5, 5, 246, 246);
}
function textSprite(text, color = '#fff', bg = 'rgba(0,0,0,0.55)', size = 44, k = 0.012) {
  const cv = document.createElement('canvas'); const x = cv.getContext('2d');
  x.font = `bold ${size}px "Noto Sans TC",sans-serif`;
  const w = Math.ceil(x.measureText(text).width) + 28; cv.width = w; cv.height = size + 22;
  x.font = `bold ${size}px "Noto Sans TC",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (bg) { x.fillStyle = bg; const r = 14; x.beginPath(); x.roundRect(0, 0, w, cv.height, r); x.fill(); }
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,0.6)'; x.strokeText(text, w / 2, cv.height / 2 + 2);
  x.fillStyle = color; x.fillText(text, w / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(w * k, cv.height * k, 1); sp.renderOrder = 10;
  return sp;
}

export class World {
  constructor(canvas, opts = {}) {
    this.opts = opts;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.mobile = mobile;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 900);
    this.camera.position.set(0, 148, 34);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * 0.46; this.controls.minDistance = 8; this.controls.maxDistance = 280;
    this.controls.target.set(0, 0, 1);
    this.controls.addEventListener('start', () => { this.userMoved = performance.now(); });

    this.follow = true; this.followId = null; this.hl = null; this.cheer = {}; this.cheerMode = {};
    this.floaters = [];
    this.loadMap('taiwan');
    this.clock = new THREE.Clock();
    this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
    let downAt = null;
    canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', e => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
      const r = canvas.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.mouse, this.camera);
      const hits = this.ray.intersectObjects(this.pickables, true);
      if (hits.length) { let o = hits[0].object; while (o && o.userData.tile == null) o = o.parent; if (o) this.opts.onTileClick?.(o.userData.tile); }
    });
    this.resize(); addEventListener('resize', () => this.resize());
    this.controls.addEventListener('change', () => { this.lastChange = performance.now(); });
    this.controls.addEventListener('start', () => { this.lastChange = performance.now(); });
    this.renderer.domElement.addEventListener('pointerdown', () => { this.lastChange = performance.now(); }, { passive: true });
    let q = null; try { q = localStorage.getItem('tr3d-q'); } catch (e) {}
    this.setQuality(q || (mobile ? 'std' : 'high'));
    // 依畫質限制每秒畫面數；沒有東西在動時再降低，手機比較不燙
    this.lastTs = 0;
    this.renderer.setAnimationLoop(ts => {
      const fps = this.targetFps();
      if (fps < 58 && ts - this.lastTs < 1000 / fps - 2.5) return;
      this.lastTs = ts; this.frame();
    });
  }
  setQuality(q) {
    if (!['high', 'std', 'saver'].includes(q)) q = 'std';
    this.quality = q; try { localStorage.setItem('tr3d-q', q); } catch (e) {}
    const dpr = devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'high' ? Math.min(dpr, 2) : q === 'std' ? Math.min(dpr, this.mobile ? 1.35 : 1.5) : Math.min(dpr, this.mobile ? 1 : 1.25));
    this.applyShadow();
    this.resize();
  }
  applyShadow() {
    if (!this.sun) return;
    const q = this.quality, n = q === 'high' ? (this.mobile ? 1536 : 2048) : 1024;
    this.sun.castShadow = q !== 'saver';
    if (this.sun.shadow.mapSize.x !== n) { this.sun.shadow.mapSize.set(n, n); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
  }
  busy() {
    const now = performance.now(), s = this.state;
    return now - (this.lastChange || 0) < 1200 || now - (this.userMoved || 0) < 1500 || (this.anims && this.anims.length > 0) || this.floaters.length > 0 || !!this.camTo ||
      (s && s.step === 'move') || now - (this.stateAt || 0) < 2500;
  }
  // 只用 60 / 30 / 20 這種能整除螢幕更新率的數字，畫面間隔才平均、不會一頓一頓
  targetFps() {
    const b = this.busy(), q = this.quality;
    if (q === 'high') return 60;
    if (q === 'std') return b ? 60 : 30;
    return b ? 30 : 20;
  }
  loadMap(id) {
    if (this.mapId === id && this.scene) return;
    useMap(id); this.mapId = id; this.geo = GEO[id] || GEO.taiwan;
    if (this.scene) this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color('#8fd0f2'); sc.fog = new THREE.Fog('#8fd0f2', 230, 460);
    sc.add(new THREE.HemisphereLight('#dff4ff', '#4b6b3a', 0.9));
    const sun = this.sun = new THREE.DirectionalLight('#fff4e0', 2.0);
    sun.position.set(-55, 110, 40); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 115, bottom: -115, near: 1, far: 320 });
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target); if (this.quality) this.applyShadow();
    this.H = this.geo.height;
    this.buildTerrain();
    const { pts, spacing } = this.geo.path();
    this.path = pts; this.spacing = spacing;
    this.relaxPath();
    this.buildTiles();
    if (this.geo.city) this.buildCity(this.geo.city);
    try { this.buildScenery(id); } catch (e) { console.warn('scenery', e); }
    try { this.bakeStatic(); } catch (e) { console.warn('bake', e); }
    this.tokens = {}; this.marks = {}; this.floaters = []; this.arrow = null; this.inited = false; this.state = null; this.tickDirty = true;
    this.overview(); this.camTo = null;
    const v = this.geo.view; this.camera.position.set(v[0], v[1], v[2]); this.controls.target.set(v[3], 0, v[4]);
  }
  // 效能：把不會動的模型依「材質 + 區塊」合併成少數幾個大網格，大幅減少每畫面的繪製次數
  bakeStatic() {
    const sc = this.scene; sc.updateMatrixWorld(true);
    const skip = new Set([this.sea, ...(this.clouds || [])]);
    for (const o of this.tileObjs) { skip.add(o.ring); skip.add(o.lot); }
    this.tileObjs.forEach((o, i) => { o.base.userData.baseOf = i; });
    this.baseRefs = [];
    // 有動畫的模型：實際跑幾次動畫，找出真的會動的零件，其餘照樣合併
    const snap = root => { const a = []; root.traverse(c => { const m = c.material && !Array.isArray(c.material) ? c.material : null;
      a.push([c, [c.position.x, c.position.y, c.position.z, c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w, c.scale.x, c.scale.y, c.scale.z, c.visible ? 1 : 0,
        m && m.color ? m.color.getHex() : 0, m && m.emissive ? m.emissive.getHex() : 0, m ? m.emissiveIntensity || 0 : 0, m ? m.opacity : 0].join()]); }); return a; };
    const tickers = [], moved = new Set(); sc.traverse(o => { if (o.userData.tick && !skip.has(o)) tickers.push(o); });
    for (const r of tickers) {
      const before = snap(r);
      try { for (const t of [0.37, 1.91, 4.43, 7.7]) r.userData.tick(t, 0.33); } catch (e) { r.userData.noBake = true; continue; }
      const after = snap(r);
      before.forEach(([c, v], k) => { if (!after[k] || after[k][1] !== v) { c.userData.noBake = true; moved.add(c); } });
    }
    // 會動的物件（火車、船、風車葉片…）：它底下相對固定的零件先在本地合併
    for (const j of moved) if (!j.isMesh || j.children.length) { try { this.mergeJoints(j, [j], moved); } catch (e) { console.warn(e); } }
    for (const c of this.clouds || []) this.mergeJoints(c, [c]);
    sc.updateMatrixWorld(true);
    const CH = 48, buckets = new Map(), mats = new Map(), victims = [];
    const keyOf = m => (m.type === 'MeshStandardMaterial' && !m.map && !m.vertexColors)
      ? ['S', m.roughness, m.metalness, m.flatShading ? 1 : 0, m.transparent ? m.opacity.toFixed(2) : 1, m.emissive.getHexString(), m.emissiveIntensity, m.side].join('|')
      : 'U' + m.uuid;
    const wp = new THREE.Vector3();
    const visit = (o, dyn) => {
      dyn = dyn || skip.has(o) || o.userData.noBake || o.isLight || o.visible === false;
      if (o.isMesh && !dyn && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && !o.material.vertexColors && !o.geometry.attributes.color && o.geometry.attributes.position && o.geometry.attributes.normal) {
        const m = o.material, mk = keyOf(m);
        o.getWorldPosition(wp);
        const k = mk + '#' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '#' + Math.floor(wp.x / CH) + ',' + Math.floor(wp.z / CH);
        if (!buckets.has(k)) buckets.set(k, { mk, mat: m, cast: o.castShadow, recv: o.receiveShadow, list: [] });
        buckets.get(k).list.push(o); victims.push(o);
      }
      for (const c of o.children) visit(c, dyn);
    };
    for (const c of [...sc.children]) visit(c, false);
    const root = new THREE.Group(); root.matrixAutoUpdate = false;
    let made = 0;
    for (const b of buckets.values()) {
      const shared = b.mk[0] === 'S';
      const useUv = !shared && b.list.every(o => o.geometry.attributes.uv);
      const parts = b.list.map(o => {
        let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        if (!g.attributes.normal) g.computeVertexNormals();
        return { g, c: o.material.color, bi: o.userData.baseOf };
      });
      const n = parts.reduce((a, q) => a + q.g.attributes.position.count, 0);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = shared ? new Float32Array(n * 3) : null, uv = useUv ? new Float32Array(n * 2) : null;
      let off = 0;
      for (const q of parts) {
        const P = q.g.attributes.position, N = q.g.attributes.normal, cnt = P.count;
        for (let i = 0; i < cnt; i++) {
          pos[(off + i) * 3] = P.getX(i); pos[(off + i) * 3 + 1] = P.getY(i); pos[(off + i) * 3 + 2] = P.getZ(i);
          nor[(off + i) * 3] = N.getX(i); nor[(off + i) * 3 + 1] = N.getY(i); nor[(off + i) * 3 + 2] = N.getZ(i);
          if (col) { col[(off + i) * 3] = q.c.r; col[(off + i) * 3 + 1] = q.c.g; col[(off + i) * 3 + 2] = q.c.b; }
          if (uv) { const U = q.g.attributes.uv; uv[(off + i) * 2] = U.getX(i); uv[(off + i) * 2 + 1] = U.getY(i); }
        }
        if (q.bi != null) this.baseRefs[q.bi] = { b, start: off, cnt };
        off += cnt; q.g.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.computeBoundingSphere(); g.computeBoundingBox();
      let m = b.mat;
      if (shared) {
        if (!mats.has(b.mk)) {
          const o = b.mat;
          mats.set(b.mk, new THREE.MeshStandardMaterial({ vertexColors: true, color: '#ffffff', roughness: o.roughness, metalness: o.metalness, flatShading: o.flatShading,
            transparent: o.transparent, opacity: o.opacity, emissive: o.emissive, emissiveIntensity: o.emissiveIntensity, side: o.side, depthWrite: o.depthWrite }));
        }
        m = mats.get(b.mk);
      }
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false;
      root.add(mesh); made++; b.mesh = mesh;
    }
    // 原本的物件：可點選的（格子、景點）留著但隱藏，好讓點擊判定照常；其餘直接移除
    for (const o of victims) {
      let a = o.parent, pick = false;
      while (a) { if (a.userData.tile != null) { pick = true; break; } a = a.parent; }
      if (pick) o.visible = false; else o.parent && o.parent.remove(o);
    }
    sc.add(root); this.baked = root;
    this.baseRefs = this.baseRefs.map(r => r && { mesh: r.b.mesh, start: r.start, cnt: r.cnt });
    this.bakeInfo = { meshes: victims.length, merged: made };
  }
  // 角色：每個會動的關節（身體、頭、手腳、尾巴）底下的固定零件合併成一個網格
  mergeToken(root) {
    const u = root.userData; if (!u.body) return;
    this.mergeJoints(root, [u.body, u.torso, u.head, u.legL, u.legR, u.armL, u.armR, u.tail].filter(Boolean));
  }
  // 在每個「會動的節點」底下，把相對它固定不動的零件合併
  mergeJoints(root, joints, stop = new Set(joints)) {
    root.updateMatrixWorld(true);
    const cache = this.tokMats || (this.tokMats = new Map());
    for (const j of joints) {
      const inv = j.matrixWorld.clone().invert(), groups = new Map(), list = [];
      const walk = o => { for (const c of [...o.children]) { if (stop.has(c)) continue; if (c.isMesh && !Array.isArray(c.material) && c.material.type === 'MeshStandardMaterial' && !c.material.map && !c.material.vertexColors && !c.geometry.attributes.color && c.visible) list.push(c); walk(c); } };
      walk(j);
      for (const m of list) {
        const mm = m.material, k = [mm.roughness, mm.metalness, mm.flatShading ? 1 : 0, mm.transparent ? mm.opacity.toFixed(2) : 1, mm.emissive.getHexString(), mm.emissiveIntensity, mm.side, m.castShadow ? 1 : 0].join('|');
        if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m);
      }
      for (const [k, ms] of groups) {
        if (ms.length < 2) continue;
        const parts = ms.map(m => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(inv.clone().multiply(m.matrixWorld)); if (!g.attributes.normal) g.computeVertexNormals(); return { g, c: m.material.color }; });
        const n = parts.reduce((a, q) => a + q.g.attributes.position.count, 0);
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
        for (const q of parts) { const P = q.g.attributes.position, N = q.g.attributes.normal;
          for (let i = 0; i < P.count; i++) { const o3 = (off + i) * 3; pos[o3] = P.getX(i); pos[o3 + 1] = P.getY(i); pos[o3 + 2] = P.getZ(i); nor[o3] = N.getX(i); nor[o3 + 1] = N.getY(i); nor[o3 + 2] = N.getZ(i); col[o3] = q.c.r; col[o3 + 1] = q.c.g; col[o3 + 2] = q.c.b; }
          off += P.count; q.g.dispose(); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere();
        if (!cache.has(k)) { const o = ms[0].material; cache.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness, metalness: o.metalness, flatShading: o.flatShading, transparent: o.transparent, opacity: o.opacity, emissive: o.emissive, emissiveIntensity: o.emissiveIntensity, side: o.side })); }
        const mesh = new THREE.Mesh(g, cache.get(k)); mesh.castShadow = ms[0].castShadow; mesh.receiveShadow = ms[0].receiveShadow; mesh.userData.noBake = true;
        // 被合併掉的零件若底下還有子物件（例如其他關節），先搬到關節底下保持原位置
        for (const m of ms) { for (const c of [...m.children]) j.attach(c); m.parent.remove(m); }
        j.add(mesh);
      }
    }
  }
  tintBase(i, color) {
    const o = this.tileObjs[i]; o.base.material.color.set(color);
    const r = this.baseRefs && this.baseRefs[i]; if (!r) return;
    const c = o.base.material.color, a = r.mesh.geometry.attributes.color;
    for (let k = r.start; k < r.start + r.cnt; k++) a.setXYZ(k, c.r, c.g, c.b);
    a.needsUpdate = true;
  }
  buildCity(n) {
    const cs = ['#eceff1', '#cfd8dc', '#ffe0b2', '#d7ccc8', '#b3e5fc', '#f8bbd0'];
    let placed = 0;
    for (let t = 0; t < n * 8 && placed < n; t++) {
      const x = (Math.random() - 0.5) * this.geo.a * 1.4, z = (Math.random() - 0.5) * this.geo.b * 1.4;
      const q = new THREE.Vector2(x, z);
      if (this.lmSpots.some(r => r.distanceTo(q) < 3.2) || this.path.some(r => r.distanceTo(q) < 4) || this.H(x, z) > 1 || this.H(x, z) < 0.2) continue;
      const h = 0.6 + Math.random() * 2.4, w = 0.8 + Math.random() * 0.8;
      const g = new THREE.Group(); B(g, w, h, w, cs[placed % 6]); B(g, w * 1.02, 0.08, w * 1.02, '#90a4ae', 0, h);
      g.position.set(x, this.H(x, z), z); g.rotation.y = Math.random(); this.scene.add(g); placed++;
    }
  }

  // ---- 當地生活場景：火車、捷運、機車、漁船、海鷗、稻田、鹽田、魚塭…… ----
  freeSpot(q, r = 2.5, hmin = 0.3, hmax = 1.6) {
    const h = this.H(q.x, q.y);
    if (h < hmin || h > hmax) return false;
    return !this.lmSpots.some(p => p.distanceTo(q) < r + 2.2) && !this.path.some(p => p.distanceTo(q) < r + 2.2) && !this.tileObjs.some(o => o.lot.position.distanceTo(new THREE.Vector3(q.x, o.lot.position.y, q.y)) < r + 0.8);
  }
  randSpots(n, r, hmin, hmax, area, tries = 400) {
    const out = [], G = this.geo, W = G.W * 0.45, H = G.H * 0.45;
    for (let t = 0; t < tries && out.length < n; t++) {
      const q = area ? area() : new THREE.Vector2(G.ox + (Math.random() - 0.5) * 2 * W, G.oz + (Math.random() - 0.5) * 2 * H);
      if (this.freeSpot(q, r, hmin, hmax) && !out.some(o => o.distanceTo(q) < r * 2)) out.push(q);
    }
    return out;
  }
  mover(obj, pts, speed, closed = true, yfn) {
    if (!pts || pts.length < 2) return obj;
    const L = [0]; for (let i = 1; i < pts.length + (closed ? 1 : 0); i++) L.push(L[i - 1] + pts[i - 1].distanceTo(pts[i % pts.length]));
    const total = L[L.length - 1]; let d = Math.random() * total, dir = 1;
    obj.userData.tick = (t, dt) => {
      d += dt * speed * dir;
      if (closed) d = ((d % total) + total) % total; else if (d > total || d < 0) { dir *= -1; d = Math.max(0, Math.min(total, d)); }
      let j = 0; while (j < L.length - 2 && L[j + 1] < d) j++;
      const a = pts[j], b = pts[(j + 1) % pts.length], f = (d - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
      const x = a.x + (b.x - a.x) * f, z = a.y + (b.y - a.y) * f;
      obj.position.set(x, yfn ? yfn(x, z) : obj.position.y, z);
      obj.rotation.y = Math.atan2((b.x - a.x) * dir, (b.y - a.y) * dir);
    };
    this.scene.add(obj);
    return obj;
  }
  train(colors, cars = 3) {
    const g = new THREE.Group();
    for (let i = 0; i < cars; i++) {
      const c = new THREE.Group(); c.position.z = -i * 1.25; g.add(c);
      B(c, 0.6, 0.55, 1.15, colors[0]); B(c, 0.62, 0.12, 1.17, colors[1], 0, 0.3);
      for (let k = -1; k <= 1; k++) B(c, 0.63, 0.14, 0.22, '#263238', 0, 0.36, k * 0.35);
      if (i === 0) { const n = S(c, 0.3, colors[0], 0, 0.27, 0.62, undefined, 8, 6); n.scale.set(1, 0.9, 1.4); }
    }
    return g;
  }
  scooter(color) {
    const g = new THREE.Group();
    B(g, 0.18, 0.18, 0.7, color, 0, 0.12); for (const z of [-0.28, 0.28]) { const w = C(g, 0.11, 0.11, 0.07, '#212121', 0, 0.11, z, 10); w.rotation.z = Math.PI / 2; }
    B(g, 0.05, 0.4, 0.05, '#9e9e9e', 0, 0.25, 0.3); B(g, 0.3, 0.04, 0.04, '#9e9e9e', 0, 0.62, 0.3);
    C(g, 0.1, 0.12, 0.35, ['#e53935', '#1e88e5', '#43a047', '#8e24aa'][Math.floor(Math.random() * 4)], 0, 0.3, -0.05, 8);
    S(g, 0.12, '#fdd835', 0, 0.75, -0.05, undefined, 8, 6);
    return g;
  }
  boat() {
    const g = new THREE.Group(); const h = S(g, 0.5, ['#fafafa', '#e53935', '#1e88e5', '#ffb300'][Math.floor(Math.random() * 4)], 0, 0.05, 0, undefined, 8, 5); h.scale.set(0.8, 0.45, 2);
    B(g, 0.5, 0.4, 0.5, '#eceff1', 0, 0.15, -0.2); C(g, 0.03, 0.03, 1.0, '#795548', 0, 0.2, 0.3, 4);
    for (let i = 0; i < 4; i++) S(g, 0.05, '#ffeb3b', 0, 1.0 - i * 0.18, 0.3 + (i % 2 ? 0.1 : -0.1), { e: '#ffeb3b', ei: 0.8 }, 4, 3);
    return g;
  }
  bird() {
    const g = new THREE.Group(); S(g, 0.12, '#ffffff', 0, 0, 0, undefined, 6, 4).scale.set(0.8, 0.7, 1.4);
    const wl = B(g, 0.6, 0.03, 0.18, '#eceff1', -0.32, 0, 0), wr = B(g, 0.6, 0.03, 0.18, '#eceff1', 0.32, 0, 0);
    const prev = g.userData.tick;
    g.userData.flap = t => { wl.rotation.z = Math.sin(t * 8) * 0.5; wr.rotation.z = -Math.sin(t * 8) * 0.5; };
    return g;
  }
  ellipsePts(cx, cz, a, b, n = 64) { const pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push(new THREE.Vector2(cx + Math.cos(t) * a, cz + Math.sin(t) * b)); } return pts; }
  buildScenery(id) {
    const H = (x, z) => this.H(x, z);
    // 共同：機車在路上跑、海鷗、漁船
    const ring = this.path.map((p, i) => { const o = this.tileObjs[i]; return new THREE.Vector2(p.x - o.nm.x * (this.tileSize * 0.62), p.y - o.nm.y * (this.tileSize * 0.62)); });
    for (let i = 0; i < 4; i++) this.mover(this.scooter(['#e53935', '#fafafa', '#1e88e5', '#fdd835'][i]), ring, 3 + i * 0.6, true, (x, z) => Math.max(0.35, H(x, z)) + 0.2);
    for (let i = 0; i < 8; i++) {
      const b = this.bird(); const cx = (Math.random() - 0.5) * this.geo.W * 0.7, cz = (Math.random() - 0.5) * this.geo.H * 0.7, y = 9 + Math.random() * 5;
      const pts = this.ellipsePts(cx, cz, 6 + Math.random() * 6, 5 + Math.random() * 5, 32);
      this.mover(b, pts, 4 + Math.random() * 2, true, () => y);
      const tk = b.userData.tick; b.userData.tick = (t, dt) => { tk(t, dt); b.userData.flap(t + cx); };
    }
    const seaSpots = [];
    for (let t = 0; t < 600 && seaSpots.length < 7; t++) {
      const q = new THREE.Vector2(this.geo.ox + (Math.random() - 0.5) * this.geo.W * 0.95, this.geo.oz + (Math.random() - 0.5) * this.geo.H * 0.95);
      if (H(q.x, q.y) < -1.0 && !this.path.some(p => p.distanceTo(q) < 9) && !this.lmSpots.some(p => p.distanceTo(q) < 8)) seaSpots.push(q);
    }
    seaSpots.forEach(q => { const pts = this.ellipsePts(q.x, q.y, 3 + Math.random() * 3, 2 + Math.random() * 3, 24).filter(p => H(p.x, p.y) < -0.5); if (pts.length > 6) this.mover(this.boat(), pts, 0.8 + Math.random() * 0.6, true, () => 0.05); });
    const paddies = (n, area) => this.randSpots(n, 2.2, 0.3, 1.2, area).forEach(q => {
      const g = new THREE.Group(); const c = Math.random() < 0.5 ? '#9ccc65' : '#cddc39';
      B(g, 3.6, 0.06, 2.6, c); for (let k = -2; k <= 2; k++) B(g, 3.6, 0.02, 0.05, '#7cb342', 0, 0.06, k * 0.5);
      B(g, 0.12, 0.08, 2.6, '#a1887f', 1.8, 0, 0); g.position.set(q.x, H(q.x, q.y) + 0.01, q.y); g.rotation.y = Math.random() * 0.4; this.scene.add(g);
    });
    const temples = n => this.randSpots(n, 1.6, 0.3, 2.5).forEach(q => {
      const g = new THREE.Group(); B(g, 1.1, 0.6, 0.8, '#c62828'); const r = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.4, 4), mat('#e65100')); r.rotation.y = Math.PI / 4; r.scale.set(1.2, 1, 0.9); r.position.y = 0.8; g.add(r);
      g.position.set(q.x, H(q.x, q.y), q.y); g.rotation.y = Math.random() * 6; this.scene.add(g);
    });
    const turbines = (n, area) => this.randSpots(n, 1.2, 0.25, 1.0, area).forEach(q => {
      const g = new THREE.Group(); C(g, 0.06, 0.1, 4, '#fafafa', 0, 0, 0, 6); const hub = new THREE.Group(); hub.position.set(0, 4, 0.12); g.add(hub);
      for (let i = 0; i < 3; i++) { const bl = B(hub, 0.1, 1.5, 0.03, '#fafafa', 0, 0, 0); bl.geometry.translate(0, 0.75, 0); bl.position.y = 0; bl.rotation.z = i * 2.094; }
      g.position.set(q.x, H(q.x, q.y), q.y); g.userData.tick = (t, dt) => { hub.rotation.z += dt * 1.8; }; this.scene.add(g);
    });
    const palms = n => this.randSpots(n, 1.0, 0.3, 2.0).forEach(q => {
      const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const x = (k - 1) * 0.5; C(g, 0.04, 0.05, 1.8, '#8d6e63', x, 0, 0, 5); S(g, 0.3, '#2e7d32', x, 1.9, 0, undefined, 6, 4).scale.y = 0.5; }
      g.position.set(q.x, H(q.x, q.y), q.y); this.scene.add(g);
    });
    if (id === 'taiwan') {
      // 高鐵：沿著西部走廊
      const west = this.path.map((p, i) => ({ p, o: this.tileObjs[i] })).filter(({ p }) => p.x < -6).map(({ p, o }) => new THREE.Vector2(p.x + o.nm.x * 9, p.y + o.nm.y * 9)).sort((a, b) => a.y - b.y);
      const hsr = west.filter((q, i) => i % 2 === 0);
      if (hsr.length > 4) {
        for (let i = 0; i < hsr.length - 1; i++) { const a = hsr[i], b = hsr[i + 1], m = a.clone().lerp(b, 0.5), len = a.distanceTo(b); const tr = B(new THREE.Group(), 0.5, 0.1, len, '#bdbdbd'); tr.position.set(m.x, Math.max(0.4, H(m.x, m.y)) + 0.9, m.y); tr.rotation.y = Math.atan2(b.x - a.x, b.y - a.y); this.scene.add(tr); const pl = C(new THREE.Group(), 0.1, 0.12, 0.9, '#9e9e9e', 0, 0, 0, 6); pl.position.set(a.x, Math.max(0.4, H(a.x, a.y)), a.y); this.scene.add(pl); }
        this.mover(this.train(['#fafafa', '#ff6f00'], 4), hsr, 9, false, (x, z) => Math.max(0.4, H(x, z)) + 0.95);
      }
      paddies(14); temples(8); palms(10);
      turbines(8, () => { const q = this.path[Math.floor(Math.random() * this.path.length)]; return q.x < -5 ? new THREE.Vector2(q.x - 4 + Math.random() * 2, q.y + (Math.random() - 0.5) * 4) : new THREE.Vector2(999, 999); });
    }
    if (id === 'taipei') {
      const mrt = this.ellipsePts(0, 0, this.geo.a * 0.62, this.geo.b * 0.58, 48);
      for (let i = 0; i < mrt.length; i++) { const a = mrt[i], b = mrt[(i + 1) % mrt.length], m = a.clone().lerp(b, 0.5); const tr = B(new THREE.Group(), 0.4, 0.08, a.distanceTo(b) + 0.05, '#cfd8dc'); tr.position.set(m.x, H(m.x, m.y) + 1.6, m.y); tr.rotation.y = Math.atan2(b.x - a.x, b.y - a.y); this.scene.add(tr); if (i % 3 === 0) { const pl = C(new THREE.Group(), 0.08, 0.1, 1.6, '#b0bec5', 0, 0, 0, 6); pl.position.set(a.x, H(a.x, a.y), a.y); this.scene.add(pl); } }
      this.mover(this.train(['#eceff1', '#1e88e5'], 3), mrt, 7, true, (x, z) => H(x, z) + 1.65);
      this.mover(this.train(['#eceff1', '#8d6e63'], 3), mrt.slice().reverse(), 6, true, (x, z) => H(x, z) + 1.65);
      const K = this.geo.K || 1; const river = []; for (let z = -50; z <= 50; z += 4) river.push(new THREE.Vector2((-47 - Math.sin(z * 0.08) * 3) * K, z * K));
      this.mover(this.boat(), river, 1.5, false, () => 0.05); this.mover(this.boat(), river.slice().reverse(), 1.2, false, () => 0.05);
      temples(4); palms(4);
    }
    if (id === 'tainan') {
      // 七股鹽田、魚塭水車
      this.randSpots(14, 1.8, 0.3, 0.9, () => new THREE.Vector2((-50 + Math.random() * 12) * (this.geo.K || 1), (Math.random() - 0.5) * 70 * (this.geo.K || 1))).forEach(q => {
        const g = new THREE.Group(); for (let i = 0; i < 4; i++) B(g, 1.4, 0.04, 1.4, i % 2 ? '#ffffff' : '#b3e5fc', (i % 2) * 1.5 - 0.75, 0, Math.floor(i / 2) * 1.5 - 0.75);
        g.position.set(q.x, H(q.x, q.y) + 0.02, q.y); this.scene.add(g);
      });
      this.randSpots(10, 2.0, 0.3, 1.0).forEach(q => {
        const g = new THREE.Group(); B(g, 3.2, 0.1, 2.4, '#8d6e63'); B(g, 2.9, 0.05, 2.1, '#4db6ac', 0, 0.08); const wh = new THREE.Group(); wh.position.set(0.6, 0.25, 0); g.add(wh);
        for (let i = 0; i < 6; i++) { const p = B(wh, 0.04, 0.35, 0.18, '#fdd835', 0, 0, 0); p.geometry.translate(0, 0.17, 0); p.position.y = 0; p.rotation.x = i * 1.047; }
        g.position.set(q.x, H(q.x, q.y), q.y); g.userData.tick = (t, dt) => { wh.rotation.x += dt * 4; }; this.scene.add(g);
      });
      temples(8); paddies(6); palms(6);
    }
    const K2 = this.geo.K || 1;
    const loopTrain = (rx, rz, colors, h = 1.6, col = '#cfd8dc') => {
      const pts = this.ellipsePts(0, 0, rx, rz, 48);
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], m = a.clone().lerp(b, 0.5); const tr = B(new THREE.Group(), 0.4, 0.08, a.distanceTo(b) + 0.05, col); tr.position.set(m.x, H(m.x, m.y) + h, m.y); tr.rotation.y = Math.atan2(b.x - a.x, b.y - a.y); this.scene.add(tr); if (h > 0.5 && i % 3 === 0) { const pl = C(new THREE.Group(), 0.08, 0.1, h, '#b0bec5', 0, 0, 0, 6); pl.position.set(a.x, H(a.x, a.y), a.y); this.scene.add(pl); } }
      this.mover(this.train(colors, 3), pts, 6.5, true, (x, z) => H(x, z) + h + 0.05);
    };
    if (id === 'taichung') {
      loopTrain(this.geo.a * 0.6, this.geo.b * 0.56, ['#eceff1', '#7cb342']);           // 捷運綠線
      turbines(10, () => new THREE.Vector2((-58 + Math.random() * 4) * K2, (Math.random() - 0.5) * 100 * K2));
      paddies(10); temples(6); palms(3);
    }
    if (id === 'kaohsiung') {
      loopTrain(this.geo.a * 0.62, this.geo.b * 0.58, ['#fafafa', '#43a047'], 0.15, '#9e9e9e');   // 環狀輕軌
      // 港口貨櫃吊車與貨櫃
      for (let k = 0; k < 7; k++) { const z = (-38 + k * 11) * K2, x = (-53 + Math.sin(z / K2 * 0.08) * 2) * K2 + 1.2; const g = new THREE.Group();
        for (const sx of [-0.7, 0.7]) B(g, 0.15, 3.2, 0.15, '#e53935', sx, 0, 0); B(g, 3.2, 0.25, 0.3, '#e53935', -0.6, 3.2, 0);
        for (let c = 0; c < 4; c++) B(g, 1.0, 0.45, 0.5, ['#1e88e5', '#fb8c00', '#43a047', '#fdd835'][c], 1.6 + (c % 2) * 1.05, Math.floor(c / 2) * 0.45, 0.5);
        g.position.set(x, Math.max(0.35, H(x, z)), z); g.rotation.y = Math.PI / 2; this.scene.add(g); }
      const ferry = []; for (let k = 0; k <= 8; k++) ferry.push(new THREE.Vector2((-53 - k * 0.8) * K2, (-6 + k * 0.4) * K2));
      this.mover(this.boat(), ferry, 1.2, false, () => 0.05);
      temples(5); palms(8);
    }
    if (id === 'huadong') {
      // 縱谷鐵路、熱氣球、大片稻田
      const rail = []; for (let z = -34; z <= 34; z += 4) rail.push(new THREE.Vector2((4 + Math.sin(z * 0.05) * 3) * K2, z * K2));
      for (let i = 0; i < rail.length - 1; i++) { const a = rail[i], b = rail[i + 1], m = a.clone().lerp(b, 0.5); const tr = B(new THREE.Group(), 0.45, 0.06, a.distanceTo(b) + 0.05, '#8d6e63'); tr.position.set(m.x, H(m.x, m.y) + 0.05, m.y); tr.rotation.y = Math.atan2(b.x - a.x, b.y - a.y); this.scene.add(tr); }
      this.mover(this.train(['#fafafa', '#e65100'], 4), rail, 5, false, (x, z) => H(x, z) + 0.12);
      for (let k = 0; k < 5; k++) { const g = new THREE.Group(), c = ['#e53935', '#fdd835', '#1e88e5', '#8e24aa', '#43a047'][k]; const bb = S(g, 0.9, c, 0, 1.2, 0, undefined, 10, 8); bb.scale.y = 1.15; B(g, 0.35, 0.3, 0.35, '#8d6e63', 0, 0, 0);
        const x = (-8 + Math.random() * 18) * K2, z = (-30 + k * 14) * K2, y0 = 6 + Math.random() * 4; g.position.set(x, y0, z); g.userData.tick = t => { g.position.y = y0 + Math.sin(t * 0.4 + k) * 1.2; }; this.scene.add(g); }
      paddies(20); temples(4); palms(6);
    }
    if (id === 'islands') {
      // 渡輪往返各島、珊瑚礁、燈塔
      const KK = this.geo.K || 1, isl = this.geo.isl.map(([x, z, r]) => [x * KK, z * KK, r * KK]);
      for (let i = 1; i < isl.length; i++) { const a = new THREE.Vector2(isl[0][0], isl[0][1]), b = new THREE.Vector2(isl[i][0], isl[i][1]); const pts = []; for (let k = 0; k <= 10; k++) pts.push(a.clone().lerp(b, k / 10)); if (i % 2) this.mover(this.boat(), pts.filter(p => H(p.x, p.y) < -0.4), 2, false, () => 0.05); }
      for (const [cx, cz, r] of isl.slice(3)) { const g = new THREE.Group(); C(g, 0.3, 0.4, 2.5, '#fafafa', 0, 0, 0, 8); C(g, 0.35, 0.35, 0.4, '#e53935', 0, 2.5, 0, 8, { e: '#ff5252', ei: 0.4 }); g.position.set(cx + r * 0.4, H(cx + r * 0.4, cz), cz); this.scene.add(g); }
      for (let i = 0; i < 60; i++) { const q = new THREE.Vector2((Math.random() - 0.5) * 140 * KK, (Math.random() - 0.5) * 120 * KK); if (H(q.x, q.y) > -0.6 || H(q.x, q.y) < -1.3 || this.path.some(p => p.distanceTo(q) < 3)) continue; const c = S(new THREE.Group(), 0.4 + Math.random() * 0.5, ['#ff8a80', '#ffd180', '#ea80fc', '#80d8ff'][i % 4], 0, 0, 0, undefined, 6, 4); c.position.set(q.x, H(q.x, q.y) + 0.2, q.y); this.scene.add(c); }
      palms(8);
    }
  }
  resize() {
    const c = this.renderer.domElement, w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    this.camera.fov = w < h ? 60 : 45; this.camera.updateProjectionMatrix();
  }

  buildTerrain() {
    const G = this.geo, W = G.W, H = G.H, SX = Math.round(W * 1.2), SZ = Math.round(H * 1.2);
    const geo = new THREE.PlaneGeometry(W, H, SX, SZ); geo.rotateX(-Math.PI / 2);
    geo.translate(G.ox, 0, G.oz);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = this.H(x, z);
      pos.setY(i, h);
      if (h < -0.1) c.set(h < -1.2 ? '#2a7fb0' : '#57c4c8');
      else if (h < 0.55) c.set('#e9dca4').lerp(new THREE.Color('#8cc56a'), smooth(0.3, 0.5, h));
      else if (h < 3) c.set('#6fb35a').lerp(new THREE.Color('#3f8a3e'), smooth(0.5, 3, h));
      else if (h < 7) c.set('#3f8a3e').lerp(new THREE.Color('#5f6f4d'), smooth(3, 7, h));
      else c.set('#7a7a6e').lerp(new THREE.Color('#f2f2f2'), smooth(9, 12, h));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.95 }));
    land.receiveShadow = true; this.scene.add(land);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#1f8fd1', transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0.2 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = 0; sea.receiveShadow = true; this.scene.add(sea); this.sea = sea;
    const deep = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('#2a7fb0'));
    deep.rotation.x = -Math.PI / 2; deep.position.y = -2.6; this.scene.add(deep);
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) { const s = S(g, 2 + Math.random() * 1.5, '#ffffff', k * 2.2 - 3, Math.random(), Math.random() * 1.5, { op: 0.85 }, 7, 5); s.castShadow = false; s.scale.y = 0.55; }
      g.position.set((Math.random() - 0.5) * 200, 34 + Math.random() * 8, -60 - Math.random() * 60);
      this.scene.add(g); this.clouds.push(g);
    }
  }

  buildTiles() {
    this.tileObjs = []; this.pickables = []; this.lmSpots = [];
    if (this.atlas) { this.atlas.tex.dispose(); this.atlas.mat.dispose(); }
    this.atlas = tileAtlas(this.path.length);
    const n = this.path.length, size0 = Math.min(3.5, this.spacing * 0.9), size = size0;
    this.tileSize = size0;
    // 第一輪：每格的方向與「蓋房子的空地」位置
    const info = [];
    for (let i = 0; i < n; i++) {
      const p = this.path[i], a = this.path[(i - 1 + n) % n], b = this.path[(i + 1) % n];
      const tan = new THREE.Vector2().subVectors(b, a).normalize();
      let best = new THREE.Vector2(0, 0), bd = 1e9;
      if (this.geo.spine) for (let k = 0; k < SPINE.length - 1; k++) {
        const A = SPINE[k], Bq = SPINE[k + 1], d = new THREE.Vector2().subVectors(Bq, A);
        let f = d.dot(new THREE.Vector2().subVectors(p, A)) / d.lengthSq(); f = Math.max(0, Math.min(1, f));
        const q = A.clone().addScaledVector(d, f), dd = q.distanceTo(p); if (dd < bd) { bd = dd; best = q; }
      }
      let nm = new THREE.Vector2().subVectors(best, p).normalize();
      const perp = new THREE.Vector2(-tan.y, tan.x); if (perp.dot(nm) < 0) perp.negate();
      nm = nm.multiplyScalar(0.5).addScaledVector(perp, 0.5).normalize();
      info.push({ p, tan, nm });
    }
    for (let i = 0; i < n; i++) {
      const { p, nm } = info[i], d = size / 2 + 0.95;
      let lotP = new THREE.Vector2(p.x + nm.x * d, p.y + nm.y * d);
      if (this.path.some((q, j) => j !== i && q.distanceTo(lotP) < size * 0.85)) lotP = new THREE.Vector2(p.x - nm.x * d, p.y - nm.y * d);
      info[i].lotP = lotP;
    }
    const lots = info.map(x => x.lotP);
    // 第二輪：建格子、空地、景點（景點不可壓到格子與房子）
    for (let i = 0; i < n; i++) {
      const { p, tan, nm, lotP } = info[i]; const size = this.tileSizes ? this.tileSizes[i] : size0;
      const y = Math.max(0.35, this.H(p.x, p.y)) + 0.18;
      const g = new THREE.Group(); g.position.set(p.x, y, p.y); g.userData.tile = i;
      const ang = Math.atan2(tan.x, tan.y);
      const base = new THREE.Mesh(new THREE.BoxGeometry(size + 0.25, 0.32, size + 0.25), new THREE.MeshStandardMaterial({ color: '#cbbf9f', roughness: 0.6 }));
      base.position.y = -0.1; base.receiveShadow = true; base.castShadow = true; g.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), mat('#fff8e7'));
      top.position.y = 0.06; top.receiveShadow = true; g.add(top);
      { // 文字面：從共用大貼圖取這一格（文字永遠朝北，從南方視角可讀）
        const A = this.atlas, cu = (i % A.cols) / A.cols, cv = Math.floor(i / A.cols) / A.cols, d = 1 / A.cols, e = d * 0.008;
        const pg = new THREE.PlaneGeometry(size, size), uv = pg.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, cu + e + uv.getX(k) * (d - 2 * e), 1 - (cv + d) + e + uv.getY(k) * (d - 2 * e));
        const face = new THREE.Mesh(pg, A.mat); face.rotation.x = -Math.PI / 2; face.position.y = 0.161; face.receiveShadow = true; g.add(face);
      }
      this.scene.add(g); this.pickables.push(g);
      if (this.H(p.x, p.y) < 0.2) for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = C(new THREE.Group(), 0.14, 0.16, 2.2, '#6d4c41', 0, 0, 0, 6); leg.position.set(p.x + lx * size * 0.4, -1.8, p.y + lz * size * 0.4); this.scene.add(leg); }
      const t = TILES[i];
      const lm = buildLandmark(t.model || t.type);
      const R = 2.6; // 景點半徑
      const clear = q => !this.lmSpots.some(r => r.distanceTo(q) < R * 2) && !this.path.some(r => r.distanceTo(q) < size * 0.72 + R) && !lots.some(r => r.distanceTo(q) < R + 0.9);
      const dir = t.sea ? -1 : 1;
      const score = q => Math.min(...this.lmSpots.map(r => r.distanceTo(q) - R * 2), ...this.path.map(r => r.distanceTo(q) - (size * 0.72 + R)), ...lots.map(r => r.distanceTo(q) - (R + 0.9)));
      let lp = null, bestQ = null, bestS = -1e9, sc = 1.35;
      search: for (let off = t.sea ? 6.4 : 5.4; off < (t.sea ? 16 : 30); off += 0.7) {
        for (const sh of [0, 1.5, -1.5, 3, -3, 4.5, -4.5, 6, -6]) {
          const q = new THREE.Vector2(p.x + dir * nm.x * off, p.y + dir * nm.y * off).addScaledVector(tan, sh);
          if (!t.sea && (this.H(q.x, q.y) > 2.2 || this.H(q.x, q.y) < 0.25)) continue;
          if (t.sea && this.H(q.x, q.y) > -0.2) continue;
          const sv = score(q);
          if (sv >= 0) { lp = q; break search; }
          if (sv > bestS) { bestS = sv; bestQ = q; }
        }
      }
      if (!lp) { // 第二輪：在附近隨機找一塊空地（離格子近的優先）
        let bd = 1e9;
        for (let k = 0; k < 900; k++) {
          const r = 4 + Math.random() * 26, a = Math.random() * Math.PI * 2, q = new THREE.Vector2(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          const h = this.H(q.x, q.y);
          if (t.sea ? h > -0.2 : (h > 2.2 || h < 0.25)) continue;
          if (score(q) >= 0 && r < bd) { bd = r; lp = q; }
        }
      }
      if (!lp) {
        lp = bestQ || new THREE.Vector2(p.x + dir * nm.x * 6, p.y + dir * nm.y * 6);
        const dT = Math.min(...this.path.map((r, j) => Math.max(Math.abs(r.x - lp.x), Math.abs(r.y - lp.y)) - (this.tileSizes ? this.tileSizes[j] : size) / 2));
        sc = Math.max(0.45, Math.min(1.35, (dT - 0.2) / 1.9));
      }
      lm.position.set(lp.x, t.sea ? 0 : this.H(lp.x, lp.y) - 0.05, lp.y);
      this.lmSpots.push(lp.clone());
      lm.rotation.y = Math.atan2(-nm.x, -nm.y); lm.scale.setScalar(sc);
      lm.userData.tile = i; this.scene.add(lm); this.pickables.push(lm);
      const ISLET = ['turtle', 'sanxian', 'greenisland', 'lanyu', 'xiaoliuqiu', 'twoheart', 'phbridge', 'jibei', 'erkan', 'juguang', 'tunnel', 'windlion', 'shuitou', 'qinbi', 'seaspring', 'cave', 'airport', 'moses', 'milksea', 'bluetears', 'ferry', 'eternal', 'tamsui', 'pier', 'cliff', 'qixing', 'dragontiger', 'mangrove', 'lanternport'];
      if (t.sea && !ISLET.includes(t.model) && !['twoheart'].includes(t.model)) {
        const isl = new THREE.Group(); C(isl, 2.0, 2.3, 0.6, '#7cb342', 0, -0.45, 0, 14); C(isl, 2.35, 2.5, 0.3, '#f3dfa2', 0, -0.55, 0, 14);
        isl.position.set(lp.x, 0, lp.y); isl.scale.setScalar(sc / 1.15); this.scene.add(isl);
        if (t.sea) lm.position.y = 0.15;
      }
      if (!t.sea && t.type === 'prop') {
        const pad = C(new THREE.Group(), 1.9, 2.1, 0.5, '#7fb862', 0, -0.45, 0, 12);
        pad.position.copy(lm.position).y -= 0.4; pad.scale.setScalar(sc / 1.15); this.scene.add(pad); lm.userData.pad = pad;
      }
      // 連到景點的小步道
      if (!t.sea) {
        const mid = p.clone().lerp(lp, 0.5), len = p.distanceTo(lp) - size * 0.6 - 1.6;
        if (len > 0.3 && len < 5) {
          const path = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, len), mat('#d7c9a7'));
          const st = p.clone().addScaledVector(new THREE.Vector2().subVectors(lp, p).normalize(), size * 0.6 + len / 2);
          path.position.set(st.x, Math.max(0.35, this.H(st.x, st.y)) + 0.03, st.y); path.rotation.y = Math.atan2(lp.x - p.x, lp.y - p.y); path.receiveShadow = true;
          this.scene.add(path);
        }
      }
      const lot = new THREE.Group();
      lot.position.set(lotP.x, Math.max(0.35, this.H(lotP.x, lotP.y)), lotP.y); lot.rotation.y = ang; this.scene.add(lot);
      const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.62, size * 0.74, 32), new THREE.MeshBasicMaterial({ color: '#ffeb3b', transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; ring.visible = false; g.add(ring);
      this.tileObjs.push({ g, base, lm, lot, ring, nm, tan, ang, level: -1, owner: undefined, pos: new THREE.Vector3(p.x, y + 0.17, p.y) });
    }
    // 格子之間鋪一條路
    for (let i = 0; i < n; i++) {
      const a = this.tileObjs[i].pos, b = this.tileObjs[(i + 1) % n].pos;
      const len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.5) continue;
      const road = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, len), mat('#bfae8a'));
      road.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.2, (a.z + b.z) / 2); road.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      road.receiveShadow = true; this.scene.add(road);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, len * 0.8), mat('#fff8e1'));
      line.position.copy(road.position); line.position.y += 0.005; line.rotation.y = road.rotation.y; this.scene.add(line);
    }
    // 最後檢查：景點和任何格子太近就往外推，推不開就縮小
    const S2 = this.tileSizes;
    const clr = (x, z) => Math.min(...this.tileObjs.map((o, j) => Math.max(Math.abs(o.pos.x - x), Math.abs(o.pos.z - z)) - (S2 ? S2[j] : size0) / 2));
    this.tileObjs.forEach((o, i) => {
      const L = o.lm.position; let c = clr(L.x, L.z), sc = o.lm.scale.x;
      for (let k = 0; k < 12 && c < 1.9 * sc; k++) {
        let near = null, nd = 1e9; this.tileObjs.forEach(q => { const d = Math.hypot(q.pos.x - L.x, q.pos.z - L.z); if (d < nd) { nd = d; near = q; } });
        const dx = L.x - near.pos.x, dz = L.z - near.pos.z, len = Math.hypot(dx, dz) || 1;
        const nx = L.x + dx / len * 0.5, nz = L.z + dz / len * 0.5, h = this.H(nx, nz);
        if (!TILES[i].sea && (h < 0.25 || h > 2.6)) break;
        L.x = nx; L.z = nz; if (!TILES[i].sea) L.y = h - 0.05; c = clr(L.x, L.z);
      }
      if (c < 1.9 * sc) o.lm.scale.setScalar(Math.max(0.35, Math.min(sc, c / 1.9 - 0.03)));
      const pad = o.lm.userData.pad; if (pad) { pad.position.x = L.x; pad.position.z = L.z; pad.scale.setScalar(o.lm.scale.x / 1.15); }
    });
  }

  // 防止格子互相重疊：把太靠近的格子推開，還是太擠就把那格縮小一點
  relaxPath() {
    const P = this.path, n = P.length, orig = P.map(p => p.clone());
    const base = Math.min(3.5, this.spacing * 0.9), want = base + 0.45;
    const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    for (let it = 0; it < 240; it++) {
      let moved = false;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const c = cheb(P[i], P[j]);
        if (c < want) {
          const d = new THREE.Vector2().subVectors(P[j], P[i]); if (d.lengthSq() < 1e-6) d.set(Math.random() - 0.5, Math.random() - 0.5);
          d.normalize().multiplyScalar((want - c) * 0.3); P[i].sub(d); P[j].add(d); moved = true;
        }
      }
      for (let i = 0; i < n; i++) P[i].lerp(orig[i], 0.04);
      if (!moved) break;
    }
    this.tileSizes = P.map((p, i) => { let m = 99; for (let j = 0; j < n; j++) if (j !== i) m = Math.min(m, cheb(p, P[j])); return Math.max(2.2, Math.min(base, m - 0.4)); });
  }
  tilePos(i) { return this.tileObjs[i].pos; }

  // 依狀態更新場景
  setState(s, offset) {
    this.stateAt = performance.now();
    if (s.map && s.map !== this.mapId) this.loadMap(s.map);
    this.state = s; this.offset = offset || 0;
    const colors = {}; s.players.forEach(p => { colors[p.id] = (CHARS.find(c => c.id === p.char) || CHARS[0]).color; });
    this.colors = colors;
    const hold = this.hold || {}, hnow = performance.now();
    s.tiles.forEach((t, i) => {
      if (!t) return;
      if (hold['t' + i] && hnow < hold['t' + i]) return;   // 飛彈還沒落地，先保留原本的房子
      const o = this.tileObjs[i];
      if (o.owner !== t.o) { o.owner = t.o; this.tintBase(i, t.o ? colors[t.o] : '#cbbf9f'); if (!t.o) o.level = -1; else if (o.level !== -1) o.level = 'x'; }
      const key = t.mg ? `mg:${t.mg.k}:${t.mg.lv}:${t.mg.ts.join(',')}` : t.l + ':' + (t.b || '') + ':' + (t.bl || 0);
      if (o.level !== key) {
        const grew = t.o && this.inited && o.level !== -1 && o.level !== key;
        const first = t.o && this.inited && o.level === -1;
        o.level = key; o.lot.clear(); this.tickDirty = true;
        if (t.o) {
          const tp = TILES[i].type;
          if (t.mg) {   // 合併建設：每塊地一棟，並連到下一塊地
            const ts = t.mg.ts, j = ts.indexOf(i), h = buildComplex(t.mg.k, t.mg.lv, colors[t.o], j, ts.length);
            if (grew || first) { h.userData.base = h.scale.x; h.scale.setScalar(0.01); h.userData.growT = performance.now(); }
            o.lot.add(h);
            if (j < ts.length - 1) {
              const nxt = this.tileObjs[ts[j + 1]].lot; o.lot.updateMatrixWorld(true);
              const loc = o.lot.worldToLocal(nxt.position.clone());
              const sc = o.lot.scale.x || 1;
              o.lot.add(buildConnector(t.mg.k, t.mg.lv, colors[t.o], loc.x, loc.z));
              void sc;
            }
            return;
          }
          const h = tp === 'company' ? buildOwnerSign(colors[t.o]) : tp === 'bigland' ? (t.b ? buildBig(t.b, colors[t.o]) : buildOwnerSign(colors[t.o])) : buildHouses(t.l, colors[t.o]);
          if (tp === 'bigland' && t.b && t.bl > 1) { h.scale.multiplyScalar(1 + (t.bl - 1) * 0.18); for (let k = 0; k < t.bl; k++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), mat('#ffd600', { e: '#ffab00', ei: 0.6 })); st.position.set((k - (t.bl - 1) / 2) * 0.4, 3.0, 0); h.add(st); } }
          if (grew || first) { h.userData.base = h.scale.x; h.scale.setScalar(0.01); h.userData.growT = performance.now(); }
          o.lot.add(h);
        }
      }
    });
    for (const k of Object.keys(this.marks)) if (!s.marks[k]) { this.scene.remove(this.marks[k]); delete this.marks[k]; }
    for (const [k, v] of Object.entries(s.marks)) {
      if (this.marks[k] && this.marks[k].userData.kind === v) continue;
      if (this.marks[k]) this.scene.remove(this.marks[k]);
      const g = new THREE.Group(); g.userData.kind = v;
      if (v === 'block') { C(g, 0.06, 0.4, 0.9, '#ff6d00', 0, 0, 0, 10); C(g, 0.21, 0.27, 0.12, '#ffffff', 0, 0.35, 0, 10); B(g, 0.9, 0.06, 0.9, '#ff6d00', 0, 0, 0); }
      else { const m = S(g, 0.4, '#263238', 0, 0, 0, undefined, 10, 6); m.scale.y = 0.45; S(g, 0.09, '#ff1744', 0, 0.2, 0, { e: '#ff1744' }); }
      const tp = this.tileObjs[k].pos; const off = this.tileObjs[k].tan;
      g.position.set(tp.x + off.x * 1.1, tp.y, tp.z + off.y * 1.1); this.scene.add(g); this.marks[k] = g;
    }
    s.players.forEach((p, idx) => {
      if (!this.tokens[p.id]) {
        const t = buildToken(p.char, colors[p.id]); t.scale.setScalar(1.7);
        const lab = textSprite(p.name, colors[p.id], 'rgba(0,0,0,0.55)', 40, 0.0075); lab.position.y = 1.65; t.add(lab);
        t.userData.label = lab;
        const tp = this.tilePos(p.pos); t.position.copy(tp);
        try { this.mergeToken(t); } catch (e) { console.warn('mergeToken', e); }
        this.scene.add(t); this.tokens[p.id] = t;
      }
      this.tokens[p.id].visible = !p.out;
    });
    this.inited = true;
    if (!this.arrow) {
      this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 4), mat('#ffeb3b', { e: '#ffc107', ei: 0.7 }));
      this.arrow.rotation.x = Math.PI; this.scene.add(this.arrow);
    }
    const cp = s.players[s.turn];
    this.followId = cp ? cp.id : null;
  }

  setHighlight(list) {
    this.hl = list ? new Set(list) : null;
    this.tileObjs.forEach((o, i) => { const on = !!(this.hl && this.hl.has(i)); o.ring.material.opacity = on ? 0.9 : 0; o.ring.visible = on; });
  }
  focusTile(i) { this.focusAt = this.tilePos(i).clone(); this.focusUntil = performance.now() + 4000; }
  setFollow(v) { this.follow = v; if (!v) this.overview(); }
  overview() {
    this.follow = false;
    const v = (this.geo || GEO.taiwan).view;
    this.camTo = { target: new THREE.Vector3(v[3], 0, v[4]), pos: new THREE.Vector3(v[0], v[1], v[2]) };
  }
  zoomIn() {
    this.follow = true;
    const t = this.tokens[this.followId]; if (!t) return;
    this.camTo = { target: t.position.clone(), pos: t.position.clone().add(new THREE.Vector3(0, 21, 20)) };
  }

  setAvatar(pid, img) {
    const t = this.tokens[pid]; if (!t || t.userData.avImg === img) return;
    t.userData.avImg = img;
    if (t.userData.av) t.remove(t.userData.av);
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
      x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.closePath(); x.save(); x.clip(); x.drawImage(im, 0, 0, 128, 128); x.restore();
      x.lineWidth = 8; x.strokeStyle = this.colors[pid] || '#fff'; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.stroke();
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); sp.renderOrder = 11;
      sp.scale.set(0.7, 0.7, 1); sp.position.y = 2.15; t.add(sp); t.userData.av = sp;
    };
    im.src = img;
  }
  react(pid, mode, ms = 1600) { this.cheer[pid] = performance.now() + ms; this.cheerMode[pid] = mode; }
  floatText(pid, text, color) {
    const t = this.tokens[pid]; if (!t) return;
    const sp = textSprite(text, color, null, 54); sp.position.copy(t.position).y += 2.4;
    this.scene.add(sp); this.floaters.push({ sp, t0: performance.now() });
  }
  burst(tile, color = '#ffcc00', n = 24) {
    const p = this.tilePos(tile);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat(color, { e: color, ei: 0.6 }));
      m.position.copy(p).y += 0.5; this.scene.add(m);
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 5, (Math.random() - 0.5) * 6);
      this.floaters.push({ m, v, t0: performance.now() });
    }
  }

  anim(dur, upd, end, delay = 0) { (this.anims = this.anims || []).push({ t0: performance.now() + delay, dur, upd, end }); }
  holdForMissile(tile, pid) {
    this.hold = this.hold || {};
    const until = performance.now() + 1750;
    this.hold['t' + tile] = until; if (pid) this.hold['p' + pid] = until;
  }
  // 飛彈：從發射者飛到目標土地，劃出弧線、拖著煙，落地爆炸
  missile(fromPid, tile, onHit, blocked) {
    const tok = this.tokens[fromPid], to = this.tilePos(tile).clone();
    const from = tok ? tok.position.clone().add(new THREE.Vector3(0, 2.2, 0)) : to.clone().add(new THREE.Vector3(-25, 30, 0));
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 12), mat('#eceff1'));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 12), mat('#e53935')); nose.position.y = 1.05;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.2, 12), mat('#e53935')); band.position.y = 0.3;
    g.add(body, nose, band);
    for (let k = 0; k < 4; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.45), mat('#c62828')); fin.position.set(Math.cos(k * Math.PI / 2) * 0.24, -0.55, Math.sin(k * Math.PI / 2) * 0.24); fin.rotation.y = -k * Math.PI / 2; g.add(fin); }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 10), new THREE.MeshBasicMaterial({ color: '#ffab00', transparent: true, opacity: 0.9 }));
    flame.position.y = -1.15; flame.rotation.x = Math.PI; g.add(flame);
    const inner = g; const holder = new THREE.Group(); inner.rotation.x = Math.PI / 2; holder.add(inner);
    holder.position.copy(from); holder.scale.setScalar(2.2); this.scene.add(holder);
    const dist = from.distanceTo(to), H = Math.min(9, Math.max(5, dist * 0.35)), dur = 1500;
    const P = f => { const q = from.clone().lerp(to, f); q.y += Math.sin(f * Math.PI) * H; return q; };
    { const mid = from.clone().lerp(to, 0.55); mid.y = 0; const d = Math.max(16, Math.min(34, dist * 0.9 + 12));
      this.camTo = { target: mid, pos: mid.clone().add(new THREE.Vector3(0, d * 0.95, d * 0.8)) }; this.userMoved = 0; }
    let lastPuff = 0;
    this.anim(dur, f => {
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const pos = P(e), nxt = P(Math.min(1, e + 0.02));
      holder.position.copy(pos); holder.lookAt(nxt);
      flame.scale.setScalar(0.8 + Math.random() * 0.6);
      if (performance.now() - lastPuff > 40) {
        lastPuff = performance.now();
        const sm = new THREE.Mesh(new THREE.SphereGeometry(0.45 + Math.random() * 0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#cfd8dc', transparent: true, opacity: 0.7, depthWrite: false }));
        sm.position.copy(pos); this.scene.add(sm);
        this.anim(900, k => { sm.scale.setScalar(1 + k * 2.2); sm.material.opacity = 0.7 * (1 - k); sm.position.y += 0.01; }, () => { this.scene.remove(sm); sm.geometry.dispose(); sm.material.dispose(); });
      }
      if (f > 0.6) { this.focusAt = to.clone(); this.focusUntil = performance.now() + 2500; }
    }, () => {
      this.scene.remove(holder);
      this.explode(tile, blocked);
      if (this.hold) { delete this.hold['t' + tile]; for (const k of Object.keys(this.hold)) if (performance.now() >= this.hold[k] - 400) delete this.hold[k]; }
      if (this.state) this.setState(this.state, this.offset);
      if (onHit) onHit();
    });
  }
  // 爆炸：閃光火球、衝擊波、碎片、濃煙、鏡頭震動
  explode(tile, small) {
    const c = this.tilePos(tile).clone(); c.y += 0.4;
    const S0 = small ? 0.5 : 1;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff59d', transparent: true, opacity: 1, depthWrite: false, depthTest: false }));
    ball.renderOrder = 20; ball.position.copy(c); this.scene.add(ball);
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, depthTest: false }));
    core.renderOrder = 21; core.position.copy(c); this.scene.add(core);
    this.anim(350, f => { core.scale.setScalar((0.8 + f * 2.5) * S0); core.material.opacity = 1 - f; }, () => { this.scene.remove(core); core.geometry.dispose(); core.material.dispose(); });
    this.anim(900, f => { const e = 1 - Math.pow(1 - f, 3); ball.scale.setScalar((1 + e * 5.5) * S0); ball.position.y = c.y + e * 1.5; ball.material.color.setHSL(0.11 - f * 0.1, 1, 0.6 - f * 0.25); ball.material.opacity = f < 0.4 ? 1 : 1 - (f - 0.4) / 0.6; }, () => { this.scene.remove(ball); ball.geometry.dispose(); ball.material.dispose(); });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: '#ffccbc', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(c); ring.position.y = c.y - 0.25; this.scene.add(ring);
    this.anim(900, f => { ring.scale.setScalar((1 + f * 9) * S0); ring.material.opacity = 0.9 * (1 - f); }, () => { this.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); });
    const light = new THREE.PointLight('#ff9100', 60, 30); light.position.copy(c).y += 2; this.scene.add(light);
    this.anim(600, f => { light.intensity = 60 * (1 - f); }, () => this.scene.remove(light));
    for (let i = 0; i < (small ? 6 : 14); i++) {
      const sm = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.6, 8, 6), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? '#9e9e9e' : '#757575', transparent: true, opacity: 0.7, depthWrite: false }));
      const v = new THREE.Vector3((Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 2.5);
      sm.position.copy(c); this.scene.add(sm);
      this.anim(1800 + Math.random() * 800, f => { sm.position.addScaledVector(v, 0.016 * (1 - f * 0.7)); sm.scale.setScalar(1 + f * 2.5); sm.material.opacity = 0.7 * (1 - f); }, () => { this.scene.remove(sm); sm.geometry.dispose(); sm.material.dispose(); }, 450);
    }
    this.burst(tile, '#ff3d00', small ? 14 : 30); this.burst(tile, '#ffd600', small ? 8 : 18); this.burst(tile, '#5d4037', small ? 6 : 14);
    this.shakeUntil = performance.now() + 700;
  }
  // 金幣從付錢的人飛到收錢的人
  coinFlow(fromPid, toPid, amt) {
    const A = this.tokens[fromPid], B = this.tokens[toPid]; if (!A || !B || A === B) return;
    const n = Math.min(12, 3 + Math.floor(Math.log10(Math.max(10, amt)) * 2));
    for (let i = 0; i < n; i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16), mat('#ffd600', { e: '#ffab00', ei: 0.5 }));
      coin.rotation.x = Math.PI / 2; this.scene.add(coin);
      this.anim(900, f => {
        const a = A.position.clone(), b = B.position.clone(); a.y += 1.6; b.y += 1.6;
        const q = a.lerp(b, f); q.y += Math.sin(f * Math.PI) * (3 + i * 0.15); coin.position.copy(q); coin.rotation.z += 0.3;
      }, () => { this.scene.remove(coin); coin.geometry.dispose(); }, i * 70);
    }
  }

  tokenTarget(p, idxOnTile, countOnTile) {
    const o = this.tileObjs[p.pos], base = o.pos.clone();
    if (countOnTile > 1) {
      const a = (idxOnTile / countOnTile) * Math.PI * 2;
      base.x += Math.cos(a) * 0.85; base.z += Math.sin(a) * 0.85;
    }
    return base;
  }

  frame() {
    const dt = Math.min(0.1, this.clock.getDelta()), t = this.clock.elapsedTime;
    const s = this.state;
    if (this.tickDirty || !this.tickers) { this.tickers = []; this.scene.traverse(o => { if (o.userData.tick) this.tickers.push(o); }); this.tickDirty = false; }
    for (const o of this.tickers) o.userData.tick(t, dt);
    if (this.tileObjs) for (const o of this.tileObjs) { const h = o.lot.children[0]; if (h && h.userData.growT) { const f = Math.min(1, (performance.now() - h.userData.growT) / 700); const e = f < 1 ? 1 + Math.sin(f * Math.PI) * 0.25 * (1 - f) : 1; h.scale.setScalar(Math.max(0.01, f * e) * (h.userData.base || 1)); if (f >= 1) h.userData.growT = 0; } }
    this.clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.05); if (c.position.x > 90) c.position.x = -90; });
    if (s) {
      const now = Date.now() - this.offset;
      const occ = {};
      s.players.forEach(p => { if (!p.out) (occ[p.pos] = occ[p.pos] || []).push(p.id); });
      s.players.forEach(p => {
        const tok = this.tokens[p.id]; if (!tok) return;
        if (this.hold && this.hold['p' + p.id] && performance.now() < this.hold['p' + p.id]) { animateToken(tok, 'idle', t, dt); return; }
        let target, jump = 0, face = null;
        const an = s.anim;
        if (an && an.pid === p.id && s.step === 'move') {
          const el = now - an.t0 - (an.dice ? 750 : 200);
          const path = an.path;
          if (el < 0) target = this.tilePos(path[0]).clone();
          else {
            const k = Math.floor(el / 280), f = (el % 280) / 280;
            if (k >= path.length - 1) target = this.tilePos(path[path.length - 1]).clone();
            else {
              const A = this.tilePos(path[k]), Bp = this.tilePos(path[k + 1]);
              target = A.clone().lerp(Bp, f); jump = Math.sin(f * Math.PI) * 0.9;
              face = Bp.clone().sub(A);
            }
          }
          tok.position.copy(target); tok.position.y += jump;
        } else {
          const list = occ[p.pos] || [p.id];
          target = this.tokenTarget(p, list.indexOf(p.id), list.length);
          const d = tok.position.distanceTo(target);
          if (d > 6) tok.position.copy(target); else tok.position.lerp(target, Math.min(1, dt * 8));
        }
        const moving = !!face || (tok.userData.lastPos && tok.userData.lastPos.distanceTo(tok.position) > dt * 1.5);
        tok.userData.lastPos = (tok.userData.lastPos || new THREE.Vector3()).copy(tok.position);
        if (face && face.lengthSq() > 0.001) tok.rotation.y = Math.atan2(face.x, face.z);
        else { let ty = 0; let d = ty - tok.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); tok.rotation.y += d * Math.min(1, dt * 3); }
        const sick = p.st.hosp || p.st.jail || p.st.sleep;
        const cheerUntil = this.cheer[p.id] || 0;
        let mode = 'idle';
        if (p.out) mode = 'sad';
        else if (moving) mode = 'walk';
        else if (performance.now() < cheerUntil) mode = this.cheerMode[p.id] || 'cheer';
        else if (sick) mode = 'sick';
        else if (s.players[s.turn] === p && (s.step === 'pre' || s.step === 'decide')) mode = 'wave';
        animateToken(tok, mode, t, dt);
      });
      const ct = this.tokens[this.followId];
      if (ct && this.arrow) { this.arrow.visible = s.phase === 'play'; this.arrow.position.copy(ct.position).y += 3.9 + Math.sin(t * 4) * 0.2; this.arrow.rotation.y = t * 2; }
      // 鏡頭跟隨
      const userIdle = !this.userMoved || performance.now() - this.userMoved > 2500;
      let want = null;
      if (this.focusAt && performance.now() < this.focusUntil) want = this.focusAt;
      else if (this.follow && ct) want = ct.position;
      if (want && userIdle && !this.camTo) {
        const delta = want.clone().sub(this.controls.target).multiplyScalar(Math.min(1, dt * 2.5));
        delta.y = 0;
        this.controls.target.add(delta); this.camera.position.add(delta);
      }
    }
    if (this.camTo) {
      const k = Math.min(1, dt * 3);
      this.controls.target.lerp(this.camTo.target, k); this.camera.position.lerp(this.camTo.pos, k);
      if (this.camera.position.distanceTo(this.camTo.pos) < 0.3) this.camTo = null;
    }
    const nowp = performance.now();
    if (this.anims && this.anims.length) {
      const list = this.anims; this.anims = [];
      const keep = list.filter(a => {
        const f = Math.min(1, (nowp - a.t0) / a.dur);
        if (f < 0) return true;
        a.upd(f, dt);
        if (f >= 1) { if (a.end) a.end(); return false; }
        return true;
      });
      this.anims = keep.concat(this.anims);
    }
    if (this.shakeUntil && nowp < this.shakeUntil) {
      const k = (this.shakeUntil - nowp) / 700 * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * k; this.camera.position.y += (Math.random() - 0.5) * k * 0.6;
    }
    this.floaters = this.floaters.filter(f => {
      const age = (nowp - f.t0) / 1000;
      if (f.sp) { f.sp.position.y += dt * 1.2; f.sp.material.opacity = Math.max(0, 1 - age / 1.8); if (age > 1.8) { this.scene.remove(f.sp); return false; } }
      if (f.m) { f.v.y -= dt * 14; f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += dt * 5; if (age > 1.4) { this.scene.remove(f.m); return false; } }
      return true;
    });
    if (this.hl) { const a = 0.55 + Math.sin(t * 6) * 0.35; this.tileObjs.forEach((o, i) => { if (this.hl.has(i)) o.ring.material.opacity = a; }); }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
