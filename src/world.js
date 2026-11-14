// ===== 寶島富翁 3D：3D 場景 =====
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TILES, N_TILES, GROUPS, CHARS } from './data.js';
import { buildLandmark, buildHouses, buildToken, animateToken, mat, B, C, S } from './landmarks.js';

// 台灣海岸線（經度, 緯度），順時針：北→東→南→西
const COAST = [
  [121.53, 25.30], [121.65, 25.24], [121.74, 25.15], [121.92, 25.05], [122.00, 25.01], [121.87, 24.86], [121.83, 24.70],
  [121.86, 24.58], [121.80, 24.40], [121.70, 24.18], [121.62, 24.00], [121.55, 23.75], [121.48, 23.45], [121.40, 23.15],
  [121.28, 22.95], [121.15, 22.75], [121.00, 22.55], [120.90, 22.33], [120.85, 22.10], [120.87, 21.90], [120.74, 21.94],
  [120.70, 22.10], [120.62, 22.30], [120.45, 22.48], [120.28, 22.58], [120.22, 22.80], [120.15, 23.00], [120.12, 23.20],
  [120.14, 23.40], [120.16, 23.65], [120.25, 23.85], [120.40, 24.05], [120.52, 24.25], [120.63, 24.45], [120.72, 24.62],
  [120.88, 24.82], [121.00, 24.98], [121.15, 25.08], [121.40, 25.17], [121.48, 25.26],
];
const SC = 31;
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

function tileTexture(i) {
  const t = TILES[i];
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  const gc = t.g ? GROUPS[t.g].color : '#f9a825';
  x.fillStyle = t.type === 'prop' ? '#fffaf0' : '#fff3c4'; x.fillRect(0, 0, 256, 256);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (t.type === 'prop') {
    x.fillStyle = gc; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#fff'; x.font = 'bold 34px "Noto Sans TC",sans-serif'; x.fillText(GROUPS[t.g].name, 128, 34);
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
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
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
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color('#8fd0f2'); sc.fog = new THREE.Fog('#8fd0f2', 160, 320);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 600);
    this.camera.position.set(0, 148, 34);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * 0.46; this.controls.minDistance = 8; this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 1);
    this.controls.addEventListener('start', () => { this.userMoved = performance.now(); });

    sc.add(new THREE.HemisphereLight('#dff4ff', '#4b6b3a', 0.9));
    const sun = this.sun = new THREE.DirectionalLight('#fff4e0', 2.0);
    sun.position.set(-40, 80, 30); sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 80, bottom: -80, near: 1, far: 220 });
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target);

    this.buildTerrain();
    const { pts, spacing } = buildPath();
    this.path = pts; this.spacing = spacing;
    this.buildTiles();
    this.tokens = {}; this.tokenState = {};
    this.marks = {}; this.floaters = [];
    this.follow = true; this.followId = null; this.hl = null; this.cheer = {}; this.cheerMode = {};
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
    this.renderer.setAnimationLoop(() => this.frame());
  }
  resize() {
    const c = this.renderer.domElement, w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    this.camera.fov = w < h ? 60 : 45; this.camera.updateProjectionMatrix();
  }

  buildTerrain() {
    const W = 165, H = 180, SX = 200, SZ = 220;
    const geo = new THREE.PlaneGeometry(W, H, SX, SZ); geo.rotateX(-Math.PI / 2);
    geo.translate(-2, 0, 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z);
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
    const n = this.path.length, size = Math.min(3.5, this.spacing * 0.9);
    this.tileSize = size;
    // 第一輪：每格的方向與「蓋房子的空地」位置
    const info = [];
    for (let i = 0; i < n; i++) {
      const p = this.path[i], a = this.path[(i - 1 + n) % n], b = this.path[(i + 1) % n];
      const tan = new THREE.Vector2().subVectors(b, a).normalize();
      let best = null, bd = 1e9;
      for (let k = 0; k < SPINE.length - 1; k++) {
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
      const { p, tan, nm, lotP } = info[i];
      const y = Math.max(0.35, heightAt(p.x, p.y)) + 0.18;
      const g = new THREE.Group(); g.position.set(p.x, y, p.y); g.userData.tile = i;
      const ang = Math.atan2(tan.x, tan.y);
      const base = new THREE.Mesh(new THREE.BoxGeometry(size + 0.25, 0.32, size + 0.25), new THREE.MeshStandardMaterial({ color: '#cbbf9f', roughness: 0.6 }));
      base.rotation.y = ang; base.position.y = -0.1; base.receiveShadow = true; base.castShadow = true; g.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), [mat('#fff8e7'), mat('#fff8e7'), new THREE.MeshStandardMaterial({ map: tileTexture(i), roughness: 0.6 }), mat('#fff8e7'), mat('#fff8e7'), mat('#fff8e7')]);
      top.position.y = 0.06; top.receiveShadow = true; g.add(top);   // 文字永遠朝北，從南方視角可讀
      this.scene.add(g); this.pickables.push(g);
      const t = TILES[i];
      const lm = buildLandmark(t.type === 'prop' ? t.model : t.type);
      const R = 2.3; // 景點半徑
      const clear = q => !this.lmSpots.some(r => r.distanceTo(q) < R * 2) && !this.path.some(r => r.distanceTo(q) < size * 0.72 + R) && !lots.some(r => r.distanceTo(q) < R + 0.9);
      const dir = t.sea ? -1 : 1;
      const score = q => Math.min(...this.lmSpots.map(r => r.distanceTo(q) - R * 2), ...this.path.map(r => r.distanceTo(q) - (size * 0.72 + R)), ...lots.map(r => r.distanceTo(q) - (R + 0.9)));
      let lp = null, bestQ = null, bestS = -1e9, sc = 1.15;
      search: for (let off = t.sea ? 6.4 : 5.4; off < (t.sea ? 14 : 22); off += 0.7) {
        for (const sh of [0, 1.5, -1.5, 3, -3, 4.5, -4.5]) {
          const q = new THREE.Vector2(p.x + dir * nm.x * off, p.y + dir * nm.y * off).addScaledVector(tan, sh);
          if (!t.sea && (heightAt(q.x, q.y) > 2.2 || heightAt(q.x, q.y) < 0.25)) continue;
          if (t.sea && heightAt(q.x, q.y) > -0.2) continue;
          const sv = score(q);
          if (sv >= 0) { lp = q; break search; }
          if (sv > bestS) { bestS = sv; bestQ = q; }
        }
      }
      if (!lp) { lp = bestQ || new THREE.Vector2(p.x + dir * nm.x * 6, p.y + dir * nm.y * 6); sc = Math.max(0.6, 1.15 + bestS / 3); }
      lm.position.set(lp.x, t.sea ? 0 : heightAt(lp.x, lp.y) - 0.05, lp.y);
      this.lmSpots.push(lp.clone());
      lm.rotation.y = Math.atan2(-nm.x, -nm.y); lm.scale.setScalar(sc);
      lm.userData.tile = i; this.scene.add(lm); this.pickables.push(lm);
      if (!t.sea && t.type === 'prop') {
        const pad = C(new THREE.Group(), 1.9, 2.1, 0.5, '#7fb862', 0, -0.45, 0, 12);
        pad.position.copy(lm.position).y -= 0.4; pad.scale.setScalar(sc / 1.15); this.scene.add(pad);
      }
      // 連到景點的小步道
      if (!t.sea) {
        const mid = p.clone().lerp(lp, 0.5), len = p.distanceTo(lp) - size * 0.6 - 1.6;
        if (len > 0.3 && len < 5) {
          const path = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, len), mat('#d7c9a7'));
          const st = p.clone().addScaledVector(new THREE.Vector2().subVectors(lp, p).normalize(), size * 0.6 + len / 2);
          path.position.set(st.x, Math.max(0.35, heightAt(st.x, st.y)) + 0.03, st.y); path.rotation.y = Math.atan2(lp.x - p.x, lp.y - p.y); path.receiveShadow = true;
          this.scene.add(path);
        }
      }
      const lot = new THREE.Group();
      lot.position.set(lotP.x, Math.max(0.35, heightAt(lotP.x, lotP.y)), lotP.y); lot.rotation.y = ang; this.scene.add(lot);
      const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.62, size * 0.74, 32), new THREE.MeshBasicMaterial({ color: '#ffeb3b', transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
      this.tileObjs.push({ g, base, lm, lot, ring, nm, tan, ang, level: -1, owner: undefined, pos: new THREE.Vector3(p.x, y + 0.17, p.y) });
    }
  }

  tilePos(i) { return this.tileObjs[i].pos; }

  // 依狀態更新場景
  setState(s, offset) {
    this.state = s; this.offset = offset || 0;
    const colors = {}; s.players.forEach(p => { colors[p.id] = (CHARS.find(c => c.id === p.char) || CHARS[0]).color; });
    this.colors = colors;
    s.tiles.forEach((t, i) => {
      if (!t) return;
      const o = this.tileObjs[i];
      if (o.owner !== t.o) { o.owner = t.o; o.base.material.color.set(t.o ? colors[t.o] : '#cbbf9f'); o.level = -1; }
      if (o.level !== t.l) {
        const grew = o.level >= -1 && t.o && (o.level === -1 || t.l > o.level) && this.inited;
        o.level = t.l; o.lot.clear();
        if (t.o) {
          const h = buildHouses(t.l, colors[t.o]);
          if (grew) { h.scale.setScalar(0.01); h.userData.growT = performance.now(); }
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
    this.tileObjs.forEach((o, i) => { o.ring.material.opacity = this.hl && this.hl.has(i) ? 0.9 : 0; });
  }
  focusTile(i) { this.focusAt = this.tilePos(i).clone(); this.focusUntil = performance.now() + 4000; }
  setFollow(v) { this.follow = v; if (!v) this.overview(); }
  overview() {
    this.follow = false;
    this.camTo = { target: new THREE.Vector3(0, 0, 1), pos: new THREE.Vector3(0, 148, 34) };
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

  tokenTarget(p, idxOnTile, countOnTile) {
    const o = this.tileObjs[p.pos], base = o.pos.clone();
    if (countOnTile > 1) {
      const a = (idxOnTile / countOnTile) * Math.PI * 2;
      base.x += Math.cos(a) * 0.85; base.z += Math.sin(a) * 0.85;
    }
    return base;
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta()), t = this.clock.elapsedTime;
    const s = this.state;
    this.scene.traverse(o => { if (o.userData.tick) o.userData.tick(t, dt); });
    if (this.tileObjs) for (const o of this.tileObjs) { const h = o.lot.children[0]; if (h && h.userData.growT) { const f = Math.min(1, (performance.now() - h.userData.growT) / 700); const e = f < 1 ? 1 + Math.sin(f * Math.PI) * 0.25 * (1 - f) : 1; h.scale.setScalar(Math.max(0.01, f * e)); if (f >= 1) h.userData.growT = 0; } }
    this.clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.05); if (c.position.x > 90) c.position.x = -90; });
    if (s) {
      const now = Date.now() - this.offset;
      const occ = {};
      s.players.forEach(p => { if (!p.out) (occ[p.pos] = occ[p.pos] || []).push(p.id); });
      s.players.forEach(p => {
        const tok = this.tokens[p.id]; if (!tok) return;
        let target, jump = 0, face = null;
        const an = s.anim;
        if (an && an.pid === p.id && s.step === 'move') {
          const el = now - an.t0 - (an.dice ? 900 : 200);
          const path = an.path;
          if (el < 0) target = this.tilePos(path[0]).clone();
          else {
            const k = Math.floor(el / 340), f = (el % 340) / 340;
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
