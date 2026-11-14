// ===== 寶島富翁 3D：台灣景點低多邊形模型（程式生成）=====
import * as THREE from 'three';

const _mats = {};
export function mat(c, o = {}) {
  const k = c + JSON.stringify(o);
  if (_mats[k]) return _mats[k];
  const m = new THREE.MeshStandardMaterial({
    color: c, flatShading: o.flat !== false, roughness: o.r ?? 0.75, metalness: o.m ?? 0.05,
    transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1, emissive: o.e || '#000000', emissiveIntensity: o.ei ?? 1,
    side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
  });
  return (_mats[k] = m);
}
function put(g, geo, c, x, y, z, o) {
  const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c, o));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
// 底面在 y 的方塊 / 圓柱 / 錐
export const B = (g, w, h, d, c, x = 0, y = 0, z = 0, o) => put(g, new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, o);
export const C = (g, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 10, o) => put(g, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, o);
export const S = (g, r, c, x = 0, y = 0, z = 0, o, ws = 10, hs = 7) => put(g, new THREE.SphereGeometry(r, ws, hs), c, x, y, z, o);
// 四角屋頂（廡殿頂）
export function roof(g, w, d, h, c, x = 0, y = 0, z = 0, o) {
  const m = put(g, new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), c, x, y + h / 2, z, o);
  m.rotation.y = Math.PI / 4; m.scale.set(w, h, d); return m;
}
// 角錐台（方形）
export function frustum(g, wt, wb, h, c, x = 0, y = 0, z = 0, seg = 4, o) {
  const m = put(g, new THREE.CylinderGeometry(wt * Math.SQRT1_2, wb * Math.SQRT1_2, h, seg), c, x, y + h / 2, z, o);
  if (seg === 4) m.rotation.y = Math.PI / 4; return m;
}
function arch(g, r, tube, c, x, y, z, rotY = 0, o) {
  const m = put(g, new THREE.TorusGeometry(r, tube, 6, 14, Math.PI), c, x, y, z, o);
  m.rotation.y = rotY; return m;
}
function water(g, r, x = 0, z = 0, y = 0.04, c = '#3fa7d6', seg = 20) {
  const m = put(g, new THREE.CylinderGeometry(r, r, 0.06, seg), mat(c, { r: 0.15, m: 0.3, op: 0.92 }), x, y, z);
  m.castShadow = false; return m;
}
function rocks(g, n, R, c = '#8b8378', y = 0, sz = 0.25) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = R * (0.5 + Math.random() * 0.5);
    S(g, sz * (0.6 + Math.random() * 0.8), c, Math.cos(a) * r, y, Math.sin(a) * r, undefined, 5, 4);
  }
}
function tree(g, x, z, h = 0.9, c = '#3c8d3a', y = 0) {
  C(g, 0.05, 0.07, h * 0.45, '#6b4a2b', x, y, z, 5);
  put(g, new THREE.ConeGeometry(h * 0.32, h * 0.75, 6), c, x, y + h * 0.45 + h * 0.3, z);
}
function roundTree(g, x, z, r = 0.35, c = '#4a9a3c', y = 0) {
  C(g, 0.05, 0.07, 0.45, '#6b4a2b', x, y, z, 5);
  S(g, r, c, x, y + 0.45 + r * 0.7, z, undefined, 7, 5);
}
function palm(g, x, z, h = 1.4, y = 0) {
  const seg = 4; let px = x, py = y, pz = z;
  for (let i = 0; i < seg; i++) {
    const m = C(g, 0.05, 0.07, h / seg, '#8a6a43', px, py, pz, 5);
    m.rotation.z = 0.08 * i; px += 0.04 * i; py += h / seg;
  }
  for (let i = 0; i < 6; i++) {
    const leaf = put(g, new THREE.ConeGeometry(0.09, 0.8, 4), '#2f9e44', px, py, pz);
    leaf.rotation.z = Math.PI / 2.4; leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.position.x += Math.cos(-leaf.rotation.y) * 0.3; leaf.position.z += Math.sin(-leaf.rotation.y) * 0.3;
  }
}
function lantern(g, x, y, z) { S(g, 0.09, '#e53935', x, y, z, { e: '#c62828', ei: 0.8 }, 6, 5); }
function islet(g, r = 1.6, c = '#5b9a4a', h = 0.35) {
  const m = C(g, r * 0.85, r, h, c, 0, -0.1, 0, 12);
  C(g, r * 1.05, r * 1.1, 0.12, '#e8d9a8', 0, -0.12, 0, 12);
  return m;
}
function hall(g, w, d, h, wall, roofc, x = 0, y = 0, z = 0, rh = 0.5) {
  B(g, w, h, d, wall, x, y, z);
  roof(g, w * 1.35, d * 1.45, rh, roofc, x, y + h, z);
}
function windowsTex(base = '#3d5a80', lit = '#ffe9a8') {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
  const x = cv.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 64, 128);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 4; c++) {
    x.fillStyle = Math.random() < 0.35 ? lit : 'rgba(255,255,255,0.18)'; x.fillRect(4 + c * 15, 4 + r * 8, 10, 5);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 動畫：在 group.userData.tick 註冊
function anim(g, f) { const prev = g.userData.tick; g.userData.tick = prev ? (t, dt) => { prev(t, dt); f(t, dt); } : f; }

const M = {};

M.t101 = g => {
  B(g, 2.4, 0.5, 2.4, '#9fb4b0');
  frustum(g, 1.15, 1.45, 1.1, '#4f9a90', 0, 0.5, 0, 4, { m: 0.35, r: 0.35 });
  let y = 1.6;
  for (let i = 0; i < 8; i++) {
    frustum(g, 1.25, 0.95, 0.56, '#5fb0a4', 0, y, 0, 4, { m: 0.4, r: 0.3 });
    B(g, 0.6, 0.05, 1.3, '#d4af37', 0, y + 0.02, 0);
    y += 0.56;
  }
  frustum(g, 0.55, 0.8, 0.5, '#4f9a90', 0, y, 0, 4, { m: 0.4 });
  B(g, 0.35, 0.35, 0.35, '#7cc4b8', 0, y + 0.5, 0);
  C(g, 0.03, 0.07, 1.4, '#cfd8dc', 0, y + 0.85, 0, 6, { m: 0.8 });
  S(g, 0.06, '#ff5252', 0, y + 2.25, 0, { e: '#ff1744' });
};
M.cks = g => {
  B(g, 3.2, 0.25, 3.2, '#e8e8e8'); B(g, 2.8, 0.25, 2.8, '#f2f2f2', 0, 0.25); B(g, 2.4, 0.3, 2.4, '#fafafa', 0, 0.5);
  B(g, 0.8, 0.8, 0.9, '#f5f5f5', 0, 0, 1.45);
  B(g, 1.7, 1.25, 1.7, '#ffffff', 0, 0.8);
  C(g, 0.55, 1.35, 0.7, '#1f4fa8', 0, 2.05, 0, 8, { r: 0.4 });
  C(g, 0.55, 0.55, 0.3, '#ffffff', 0, 2.75, 0, 8);
  C(g, 0.05, 0.75, 0.6, '#1f4fa8', 0, 3.05, 0, 8, { r: 0.4 });
  S(g, 0.1, '#d4af37', 0, 3.7, 0, { m: 0.8 });
};
M.npm = g => {
  B(g, 3.4, 0.35, 1.9, '#efe7d6');
  B(g, 1.2, 0.35, 0.8, '#efe7d6', 0, 0, 1.2);
  hall(g, 1.6, 0.9, 1.0, '#f3e6c8', '#2f7d4a', 0, 0.35, -0.1, 0.55);
  roof(g, 1.0, 0.6, 0.35, '#2f7d4a', 0, 1.85, -0.1);
  hall(g, 0.8, 0.7, 0.7, '#f3e6c8', '#2f7d4a', -1.25, 0.35, 0, 0.4);
  hall(g, 0.8, 0.7, 0.7, '#f3e6c8', '#2f7d4a', 1.25, 0.35, 0, 0.4);
  B(g, 0.4, 0.5, 0.05, '#7a5230', 0, 0.35, 0.36);
};
M.queen = g => {
  C(g, 1.6, 1.8, 0.25, '#d8c39a', 0, 0, 0, 9);
  C(g, 0.22, 0.42, 1.0, '#c69a62', 0, 0.25, 0, 7);
  const h = S(g, 0.55, '#c9a46e', 0.1, 1.55, 0, undefined, 9, 7); h.scale.set(1.25, 0.75, 0.85); h.rotation.z = -0.25;
  const n = S(g, 0.22, '#c9a46e', 0.75, 1.4, 0, undefined, 6, 5); n.scale.set(1.2, 0.7, 0.7);
  const hair = S(g, 0.32, '#b58b55', -0.45, 1.75, 0, undefined, 7, 5); hair.scale.set(1, 0.8, 0.9);
  C(g, 0.15, 0.3, 0.5, '#c69a62', -1, 0.25, 0.6, 6); S(g, 0.3, '#caa673', -1, 0.85, 0.6, undefined, 6, 4).scale.y = 0.6;
  C(g, 0.12, 0.25, 0.4, '#c69a62', 0.9, 0.25, -0.8, 6); S(g, 0.25, '#caa673', 0.9, 0.7, -0.8, undefined, 6, 4).scale.y = 0.6;
};
M.jiufen = g => {
  put(g, new THREE.ConeGeometry(2.0, 2.4, 7), '#3e7b3a', 0, 1.2, -0.6);
  const rows = [[0.9, 0, 1.1], [0.75, 0.5, 0.45], [0.6, 1.0, -0.2], [0.5, 1.5, -0.8]];
  const cs = ['#a1887f', '#8d6e63', '#bcaaa4', '#6d4c41'];
  rows.forEach(([w, y, z], r) => {
    for (let k = -1; k <= 1; k++) {
      const x = k * (w + 0.1);
      B(g, w, 0.55, 0.55, cs[(r + k + 3) % 4], x, y, z);
      B(g, w * 1.1, 0.08, 0.65, '#3b3b3b', x, y + 0.55, z);
      lantern(g, x - w * 0.3, y + 0.35, z + 0.32); lantern(g, x + w * 0.3, y + 0.35, z + 0.32);
    }
  });
  B(g, 0.9, 0.7, 0.6, '#b71c1c', 0, 0, 1.1); B(g, 1.1, 0.1, 0.7, '#212121', 0, 0.7, 1.1);
};
M.turtle = g => {
  islet(g, 1.7, '#567d46', 0.2);
  const sh = S(g, 1.1, '#5f8a4c', -0.2, 0.15, 0, undefined, 10, 6); sh.scale.set(1.2, 0.7, 0.9);
  S(g, 0.35, '#6b9656', -0.2, 0.9, 0, undefined, 6, 4);
  const nk = C(g, 0.18, 0.25, 0.9, '#6f9a58', 1.0, 0.0, 0, 6); nk.rotation.z = -1.1; nk.position.set(1.15, 0.35, 0);
  S(g, 0.3, '#6f9a58', 1.65, 0.55, 0, undefined, 7, 5);
  S(g, 0.12, '#6f9a58', -1.5, 0.1, 0.1, undefined, 5, 4);
};
M.onsen = g => {
  C(g, 1.6, 1.7, 0.2, '#9e9e9e', 0, 0, 0, 12);
  water(g, 1.2, 0, 0, 0.21, '#7fd3e6');
  rocks(g, 10, 1.45, '#7d7268', 0.25, 0.2);
  B(g, 0.08, 0.9, 0.08, '#6d4c41', -1.2, 0.2, -1.0); B(g, 0.08, 0.9, 0.08, '#6d4c41', -0.4, 0.2, -1.0);
  roof(g, 1.3, 0.8, 0.35, '#5d4037', -0.8, 1.1, -1.0);
  const steam = [];
  for (let i = 0; i < 7; i++) { const s = S(g, 0.22, '#ffffff', (Math.random() - 0.5) * 1.6, 0.4, (Math.random() - 0.5) * 1.4, { op: 0.45 }, 6, 5); s.castShadow = false; s.userData.ph = Math.random(); steam.push(s); }
  anim(g, t => steam.forEach(s => { const f = (t * 0.25 + s.userData.ph) % 1; s.position.y = 0.4 + f * 1.6; s.material.opacity = 0.5 * (1 - f); s.scale.setScalar(0.6 + f); }));
};
M.taroko = g => {
  water(g, 0.5, 0, 0, 0.04, '#5ec4c4').scale.set(0.8, 1, 4.5);
  for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
    const h = 2.3 + Math.random() * 1.2;
    const m = B(g, 0.7 + Math.random() * 0.3, h, 0.8, k % 2 ? '#cfcac0' : '#b9b3a8', side * (0.75 + Math.random() * 0.25), 0, -1.6 + k * 0.8);
    m.rotation.y = (Math.random() - 0.5) * 0.3;
    tree(g, side * 0.95, -1.6 + k * 0.8, 0.7, '#2e6b2e', h);
  }
  arch(g, 0.45, 0.06, '#d32f2f', 0, 0.25, 0.9, Math.PI / 2);
  B(g, 0.15, 0.05, 1.1, '#d32f2f', 0, 0.7, 0.9).rotation.y = Math.PI / 2;
};
M.cliff = g => {
  water(g, 1.8, 0.6, 0, 0.03, '#1976d2');
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.5, 0); sh.lineTo(1.0, 3.2); sh.lineTo(0, 3.6); sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 3.0, bevelEnabled: false });
  const m = put(g, geo, '#4a7c3f', -1.6, 0, -1.5); m.scale.set(1, 1, 1);
  const face = B(g, 0.1, 3.0, 3.0, '#9e9a8f', -0.15, 0.1, 0); face.rotation.z = 0.15;
  B(g, 0.3, 0.06, 3.0, '#555555', -0.25, 1.2, 0);
  B(g, 0.3, 0.06, 3.0, '#555555', -0.4, 2.0, 0);
  for (let k = 0; k < 4; k++) tree(g, -1.2, -1.2 + k * 0.8, 0.8, '#2e7d32', 3.2);
};
M.qixing = g => {
  water(g, 1.8, 0, 0.3, 0.03, '#1e88e5');
  const beach = put(g, new THREE.TorusGeometry(1.7, 0.35, 5, 24, Math.PI), '#9e9e9e', 0, 0.05, 0.3);
  beach.rotation.x = Math.PI / 2; beach.rotation.z = Math.PI; beach.scale.z = 0.3;
  rocks(g, 14, 1.9, '#bdbdbd', 0.1, 0.1);
  for (let i = 0; i < 7; i++) S(g, 0.07, '#fff59d', -1.2 + i * 0.4, 1.6 + Math.sin(i * 1.3) * 0.25, -1.4, { e: '#fff176' }, 5, 4);
};
M.sanxian = g => {
  const a = new THREE.Group(); g.add(a);
  C(a, 1.0, 1.2, 0.5, '#5b8f4a', 0, -0.15, -1.2, 9); put(a, new THREE.ConeGeometry(0.8, 1.0, 6), '#6b7d5a', 0, 0.85, -1.2);
  C(a, 0.6, 0.8, 0.25, '#9a8f7a', 0, -0.1, 1.6, 8);
  for (let i = 0; i < 8; i++) {
    const z = 1.2 - i * 0.3;
    arch(a, 0.17, 0.05, i % 2 ? '#e53935' : '#fbc02d', 0, 0.1, z, Math.PI / 2);
  }
  B(a, 0.18, 0.04, 2.6, '#8d6e63', 0, 0.26, 0.15);
};
M.brown = g => {
  B(g, 3.3, 0.12, 3.3, '#8bc34a');
  for (let k = -3; k <= 3; k++) B(g, 3.3, 0.02, 0.06, '#7cb342', 0, 0.12, k * 0.45);
  B(g, 0.45, 0.04, 3.3, '#616161', 0.2, 0.12, 0);
  roundTree(g, -0.5, -0.4, 0.5, '#33691e', 0.12);
  put(g, new THREE.ConeGeometry(1.0, 1.3, 5), '#5c7c5a', -1.1, 0.75, -1.4);
  put(g, new THREE.ConeGeometry(0.8, 1.0, 5), '#6d8b6a', 0.9, 0.6, -1.5);
};
M.greenisland = g => {
  islet(g, 1.8, '#4caf50', 0.4);
  put(g, new THREE.ConeGeometry(1.1, 1.1, 7), '#43a047', -0.4, 0.8, -0.4);
  C(g, 0.18, 0.26, 1.7, '#ffffff', 0.7, 0.3, 0.5, 10);
  C(g, 0.22, 0.22, 0.25, '#fdd835', 0.7, 2.0, 0.5, 8, { e: '#ffeb3b', ei: 0.6 });
  C(g, 0.02, 0.24, 0.18, '#c62828', 0.7, 2.25, 0.5, 8);
};
M.eluanbi = g => {
  C(g, 1.7, 1.8, 0.15, '#7cb342', 0, 0, 0, 12);
  C(g, 0.32, 0.48, 2.3, '#ffffff', 0, 0.15, 0, 12);
  C(g, 0.4, 0.4, 0.08, '#263238', 0, 2.45, 0, 12);
  C(g, 0.28, 0.28, 0.35, '#263238', 0, 2.5, 0, 8, { e: '#fff59d', ei: 0.3 });
  C(g, 0.02, 0.32, 0.25, '#263238', 0, 2.85, 0, 8);
  B(g, 0.9, 0.5, 0.6, '#fafafa', 1.0, 0.15, 0.5); roof(g, 1.1, 0.8, 0.25, '#b0bec5', 1.0, 0.65, 0.5);
  palm(g, -1.0, 0.8, 1.1, 0.15); palm(g, -1.2, -0.7, 1.3, 0.15);
};
M.kenting = g => {
  const sand = C(g, 1.8, 1.9, 0.12, '#f3dfa2', 0, 0, 0, 16);
  water(g, 1.3, 0.9, 0.9, 0.05, '#26c6da');
  const r = S(g, 0.55, '#8d7b68', 1.0, 0.7, 1.0, undefined, 7, 6); r.scale.set(0.8, 1.4, 1.1);
  palm(g, -1.1, -0.6, 1.5, 0.12); palm(g, -0.4, -1.2, 1.2, 0.12); palm(g, -1.3, 0.5, 1.1, 0.12);
  C(g, 0.02, 0.02, 0.8, '#ffffff', 0.1, 0.12, -0.1, 4);
  C(g, 0.02, 0.5, 0.18, '#ff7043', 0.1, 0.85, -0.1, 8);
};
M.dragontiger = g => {
  water(g, 1.8, 0, 0, 0.03, '#4fc3f7');
  for (const [x, c] of [[-0.6, '#43a047'], [0.6, '#fbc02d']]) {
    let y = 0.1;
    for (let i = 0; i < 7; i++) {
      const r = 0.38 - i * 0.03;
      C(g, r * 0.85, r * 0.9, 0.28, '#fdd835', x, y, -0.4, 6);
      C(g, 0.05, r * 1.35, 0.14, '#c62828', x, y + 0.28, -0.4, 6);
      y += 0.38;
    }
    C(g, 0.02, 0.06, 0.35, '#d4af37', x, y, -0.4, 5);
    const head = S(g, 0.3, c, x, 0.3, 0.25, undefined, 7, 5); head.scale.set(0.8, 0.8, 1.3);
  }
  for (let k = 0; k < 5; k++) B(g, 0.25, 0.06, 0.45, '#c62828', (k % 2 ? 0.15 : -0.15), 0.08, 0.6 + k * 0.25);
};
M.pier2 = g => {
  B(g, 3.3, 0.1, 3.3, '#9e9e9e');
  for (let i = 0; i < 2; i++) { B(g, 1.2, 0.8, 1.4, '#a1887f', -0.9 + i * 1.6, 0.1, -0.9); roof(g, 1.3, 1.5, 0.35, '#5d4037', -0.9 + i * 1.6, 0.9, -0.9); }
  const cs = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa'];
  let k = 0;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) B(g, 0.85, 0.38, 0.4, cs[k++ % 6], -0.95 + c * 0.95, 0.1 + r * 0.38, 0.6 + (r ? 0.1 : 0));
  B(g, 0.12, 2.2, 0.12, '#f57c00', 1.3, 0.1, 1.2); B(g, 1.4, 0.12, 0.12, '#f57c00', 0.8, 2.2, 1.2);
};
M.t85 = g => {
  const tex = windowsTex('#2f4a6d');
  const gm = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.4, roughness: 0.4 });
  B(g, 2.8, 0.3, 1.8, '#90a4ae');
  B(g, 0.75, 3.2, 1.2, gm, -0.8, 0.3, 0); B(g, 0.75, 3.2, 1.2, gm, 0.8, 0.3, 0);
  B(g, 2.35, 0.9, 1.2, gm, 0, 3.0, 0);
  B(g, 0.8, 2.2, 0.9, gm, 0, 3.9, 0);
  frustum(g, 0.4, 0.8, 0.5, '#455a64', 0, 6.1, 0);
  C(g, 0.03, 0.05, 1.0, '#cfd8dc', 0, 6.6, 0, 6, { m: 0.8 });
  S(g, 0.06, '#ff5252', 0, 7.65, 0, { e: '#ff1744' });
};
M.anping = g => {
  B(g, 3.2, 0.15, 3.2, '#c8b28a');
  for (const [w, d, x, z] of [[3, 0.25, 0, -1.4], [3, 0.25, 0, 1.4], [0.25, 3, -1.4, 0], [0.25, 3, 1.4, 0]]) B(g, w, 0.6, d, '#a0452e', x, 0.15, z);
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) B(g, 0.5, 0.8, 0.5, '#8d3b27', x, 0.15, z);
  B(g, 0.9, 1.6, 0.9, '#fafafa', 0, 0.15, 0);
  B(g, 1.05, 0.1, 1.05, '#e0e0e0', 0, 1.75, 0);
  roof(g, 1.0, 1.0, 0.7, '#c62828', 0, 1.85, 0);
  C(g, 0.06, 0.08, 0.6, '#37474f', 0.9, 0.5, 1.0, 6).rotation.x = Math.PI / 2;
};
M.chihkan = g => {
  B(g, 3.3, 0.45, 2.2, '#b5523b');
  for (const x of [-0.85, 0.85]) {
    B(g, 1.2, 0.8, 1.2, '#d84315', x, 0.45, 0);
    roof(g, 1.75, 1.75, 0.35, '#37474f', x, 1.25, 0);
    B(g, 0.85, 0.5, 0.85, '#d84315', x, 1.45, 0);
    roof(g, 1.35, 1.35, 0.4, '#37474f', x, 1.95, 0);
    C(g, 0.02, 0.05, 0.25, '#d4af37', x, 2.35, 0, 5);
  }
  roundTree(g, -1.4, 1.0, 0.3, '#2e7d32', 0.45); roundTree(g, 1.4, 1.0, 0.3, '#2e7d32', 0.45);
};
M.phbridge = g => {
  C(g, 0.8, 0.9, 0.3, '#c2b280', -1.5, -0.1, 0, 8); C(g, 0.8, 0.9, 0.3, '#c2b280', 1.5, -0.1, 0, 8);
  B(g, 3.4, 0.12, 0.45, '#eeeeee', 0, 0.75, 0);
  for (let k = -2; k <= 2; k++) arch(g, 0.3, 0.06, '#e0e0e0', k * 0.62, 0.05, 0);
  for (let k = -3; k <= 3; k++) C(g, 0.04, 0.04, 0.2, '#e53935', k * 0.5, 0.87, 0.2, 4);
};
M.twoheart = g => {
  C(g, 1.4, 1.6, 0.25, '#bfae8a', -0.2, -0.15, -1.3, 10);
  for (const [x, z, s] of [[-0.55, 0.3, 0.6], [0.7, 0.5, 0.45]]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3), hz = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push(new THREE.Vector3(x + hx * s * 0.06, 0.08, z + hz * s * 0.06));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    put(g, new THREE.TubeGeometry(curve, 60, 0.08, 4, true), '#7b7b7b', 0, 0, 0);
    water(g, s * 0.75, x, z + 0.05, 0.05, '#80deea');
  }
};
M.alishan = g => {
  C(g, 1.7, 1.8, 0.2, '#33691e', 0, 0, 0, 10);
  C(g, 0.35, 0.5, 2.6, '#6d4c41', -0.5, 0.2, -0.3, 7);
  put(g, new THREE.ConeGeometry(0.9, 1.6, 7), '#1b5e20', -0.5, 2.9, -0.3);
  for (const [x, z] of [[0.8, -1.0], [1.1, 0.2], [-1.3, 0.7], [0.3, -1.3]]) tree(g, x, z, 1.4, '#2e7d32', 0.2);
  B(g, 2.8, 0.04, 0.12, '#424242', 0.1, 0.2, 1.1);
  B(g, 0.7, 0.45, 0.4, '#c62828', -0.6, 0.24, 1.1); B(g, 0.7, 0.08, 0.42, '#fbc02d', -0.6, 0.45, 1.1);
  B(g, 0.7, 0.45, 0.4, '#c62828', 0.2, 0.24, 1.1); B(g, 0.7, 0.08, 0.42, '#fbc02d', 0.2, 0.45, 1.1);
  for (let i = 0; i < 4; i++) { const c = S(g, 0.4, '#ffffff', -1.3 + i * 0.9, 1.6, -1.4, { op: 0.6 }, 6, 4); c.scale.set(1.6, 0.4, 1); c.castShadow = false; }
};
M.sunmoon = g => {
  C(g, 1.75, 1.85, 0.16, '#558b2f', 0, 0, 0, 14);
  water(g, 1.3, 0.2, 0.3, 0.17, '#1e88e5');
  C(g, 0.18, 0.22, 0.1, '#7cb342', 0.5, 0.17, 0.4, 8); roundTree(g, 0.5, 0.4, 0.12, '#2e7d32', 0.2);
  put(g, new THREE.ConeGeometry(0.8, 1.2, 6), '#2e7d32', -1.1, 0.75, -1.0);
  let y = 1.3;
  for (let i = 0; i < 6; i++) { C(g, 0.11, 0.13, 0.14, '#fff3e0', -1.1, y, -1.0, 6); C(g, 0.02, 0.2, 0.08, '#bf360c', -1.1, y + 0.14, -1.0, 6); y += 0.22; }
  B(g, 0.35, 0.08, 0.15, '#ffffff', -0.2, 0.2, 0.6); B(g, 0.35, 0.08, 0.15, '#ffffff', 0.9, 0.2, -0.3);
};
M.lukang = g => {
  B(g, 3.3, 0.1, 3.3, '#b0a596');
  for (let k = 0; k < 3; k++) { hall(g, 0.85, 1.1, 0.7, '#b5523b', '#4e342e', -1.1 + k * 1.1, 0.1, -0.9, 0.3); lantern(g, -1.1 + k * 1.1, 0.6, -0.3); }
  B(g, 2.2, 0.9, 0.7, '#c62828', 0, 0.1, 0.8);
  roof(g, 2.6, 1.0, 0.4, '#bf360c', 0, 1.0, 0.8);
  B(g, 0.6, 0.6, 0.05, '#4e342e', 0, 0.1, 1.16);
  C(g, 0.06, 0.06, 0.3, '#fbc02d', -0.9, 1.4, 0.8, 5); C(g, 0.06, 0.06, 0.3, '#fbc02d', 0.9, 1.4, 0.8, 5);
};
M.opera = g => {
  B(g, 3.2, 0.12, 3.0, '#cfd8dc');
  const w = mat('#fafafa', { r: 0.4 });
  B(g, 2.6, 1.9, 2.0, w, 0, 0.12, 0);
  for (const [x, y] of [[-0.75, 0.9], [0.1, 0.65], [0.85, 1.05]]) {
    const hole = put(g, new THREE.CylinderGeometry(0.38, 0.38, 0.06, 14), mat('#37474f', { r: 0.3, m: 0.4 }), x, y + 0.12, 1.01);
    hole.rotation.x = Math.PI / 2; hole.scale.set(1, 1, 1.5);
  }
  for (const [z, y] of [[-0.4, 0.8], [0.5, 1.1]]) {
    const hole = put(g, new THREE.CylinderGeometry(0.35, 0.35, 0.06, 14), mat('#37474f', { r: 0.3, m: 0.4 }), 1.31, y + 0.12, z);
    hole.rotation.z = Math.PI / 2; hole.scale.set(1.4, 1, 1);
  }
  B(g, 2.7, 0.1, 2.1, '#eceff1', 0, 2.02, 0);
  roundTree(g, -1.4, 1.3, 0.25); roundTree(g, 1.4, 1.3, 0.25);
};
M.gaomei = g => {
  const wet = C(g, 1.8, 1.85, 0.08, '#90a4ae', 0, 0, 0, 16);
  water(g, 1.7, 0, 0, 0.09, '#b3e5fc');
  for (let k = 0; k < 6; k++) B(g, 0.3, 0.05, 0.6, '#8d6e63', -1.2 + k * 0.42, 0.12, 0.9 - (k % 2) * 0.3);
  const blades = [];
  for (const [x, z, h] of [[-0.9, -0.8, 2.6], [0.3, -1.1, 2.9], [1.2, -0.3, 2.5]]) {
    C(g, 0.04, 0.08, h, '#ffffff', x, 0.1, z, 6);
    const hub = new THREE.Group(); hub.position.set(x, h + 0.1, z + 0.08); g.add(hub);
    for (let i = 0; i < 3; i++) { const b = B(hub, 0.07, 0.85, 0.02, '#ffffff', 0, 0, 0); b.geometry.translate(0, 0.42, 0); b.position.y = 0; b.rotation.z = (i / 3) * Math.PI * 2; }
    S(hub, 0.07, '#eeeeee'); blades.push(hub);
  }
  anim(g, (t, dt) => blades.forEach((b, i) => { b.rotation.z += dt * (1.6 + i * 0.3); }));
};
M.neiwan = g => {
  C(g, 1.7, 1.8, 0.15, '#689f38', 0, 0, 0, 10);
  put(g, new THREE.ConeGeometry(1.0, 1.6, 6), '#33691e', -1.0, 0.9, -1.0);
  hall(g, 1.1, 0.7, 0.6, '#a1887f', '#5d4037', 0.6, 0.15, -0.8, 0.3);
  B(g, 3.0, 0.04, 0.12, '#424242', 0, 0.15, 0.3);
  B(g, 0.9, 0.5, 0.45, '#fdd835', -0.5, 0.19, 0.3); B(g, 0.9, 0.12, 0.47, '#1565c0', -0.5, 0.45, 0.3);
  B(g, 0.9, 0.5, 0.45, '#fdd835', 0.45, 0.19, 0.3); B(g, 0.9, 0.12, 0.47, '#1565c0', 0.45, 0.45, 0.3);
  for (const x of [-1.2, 1.2]) B(g, 0.1, 0.9, 0.1, '#795548', x, 0.15, 1.2);
  B(g, 2.4, 0.05, 0.3, '#a1887f', 0, 0.55, 1.2);
};
M.daxi = g => {
  B(g, 3.3, 0.1, 3.0, '#b0a596');
  const cs = ['#f8bbd0', '#ffe0b2', '#d7ccc8', '#ffccbc'];
  for (let k = 0; k < 4; k++) {
    const x = -1.2 + k * 0.8;
    B(g, 0.75, 1.1, 1.4, cs[k], x, 0.1, -0.3);
    B(g, 0.75, 0.45, 0.12, cs[k], x, 1.2, 0.35);
    S(g, 0.15, '#ffffff', x, 1.55, 0.36, undefined, 6, 4).scale.z = 0.4;
    for (const dx of [-0.2, 0.2]) { const w = B(g, 0.16, 0.32, 0.03, '#5d4037', x + dx, 0.6, 0.41); }
    B(g, 0.28, 0.45, 0.03, '#4e342e', x, 0.1, 0.41);
  }
};
M.tamsui = g => {
  water(g, 1.8, 0, 0, 0.03, '#29b6f6');
  B(g, 3.4, 0.1, 0.45, '#ffffff', 0, 0.5, 0);
  const py = B(g, 0.14, 2.6, 0.14, '#ffffff', 0, 0.5, 0); py.rotation.z = -0.25; py.position.x = -0.35;
  const top = new THREE.Vector3(0.0, 2.95, 0);
  for (let k = 1; k <= 4; k++) for (const sgn of [-1, 1]) {
    const end = new THREE.Vector3(sgn * k * 0.38, 0.6, 0);
    const curve = new THREE.LineCurve3(top, end);
    put(g, new THREE.TubeGeometry(curve, 1, 0.012, 3), '#eeeeee', 0, 0, 0);
  }
  C(g, 1.0, 1.1, 0.25, '#bcaaa4', 1.3, -0.1, -1.1, 8);
  B(g, 0.6, 0.15, 0.25, '#ffffff', -1.0, 0.05, 1.0); C(g, 0.01, 0.01, 0.5, '#795548', -1.0, 0.2, 1.0, 4);
};

// ---- 特殊格 ----
M.start = g => {
  B(g, 3.0, 0.15, 2.6, '#bdbdbd');
  B(g, 2.4, 1.2, 1.9, '#efe0c2', 0, 0.15, 0);
  for (let k = -2; k <= 2; k++) B(g, 0.22, 0.8, 0.03, '#5d4037', k * 0.45, 0.25, 0.96);
  frustum(g, 1.7, 2.7, 0.6, '#a86b32', 0, 1.35, 0);
  B(g, 1.2, 0.35, 0.9, '#efe0c2', 0, 1.95, 0); frustum(g, 0.7, 1.4, 0.35, '#a86b32', 0, 2.3, 0);
};
M.chance = g => {
  B(g, 1.6, 0.12, 1.6, '#ffe082');
  const q = new THREE.Group(); q.position.y = 1.4; g.add(q);
  const pts = [];
  for (let i = 0; i <= 20; i++) { const t = -Math.PI * 0.9 + (i / 20) * Math.PI * 1.4; pts.push(new THREE.Vector3(Math.cos(-t) * 0.4, 0.35 + Math.sin(-t) * 0.4, 0)); }
  pts.push(new THREE.Vector3(0, -0.25, 0));
  put(q, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.12, 6), mat('#ffb300', { m: 0.5, r: 0.3, e: '#ff8f00', ei: 0.3 }), 0, 0, 0);
  S(q, 0.14, mat('#ffb300', { m: 0.5, r: 0.3, e: '#ff8f00', ei: 0.3 }), 0, -0.55, 0);
  anim(g, t => { q.rotation.y = t * 1.5; q.position.y = 1.4 + Math.sin(t * 2) * 0.12; });
};
M.news = g => {
  B(g, 0.15, 1.4, 0.15, '#616161', -0.8, 0, 0); B(g, 0.15, 1.4, 0.15, '#616161', 0.8, 0, 0);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const x = cv.getContext('2d'); x.fillStyle = '#c62828'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.fillText('新聞快報', 128, 64); x.font = '24px sans-serif'; x.fillText('BREAKING NEWS', 128, 104);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  B(g, 2.0, 1.1, 0.15, '#212121', 0, 1.2, 0);
  const sc = put(g, new THREE.PlaneGeometry(1.85, 0.95), new THREE.MeshBasicMaterial({ map: tex }), 0, 1.75, 0.08);
  sc.castShadow = false;
};
M.shop = g => {
  B(g, 2.2, 1.1, 1.6, '#fafafa');
  B(g, 2.22, 0.12, 1.62, '#43a047', 0, 0.75); B(g, 2.22, 0.08, 1.62, '#fb8c00', 0, 0.87); B(g, 2.22, 0.08, 1.62, '#e53935', 0, 0.95);
  B(g, 1.6, 0.6, 0.03, '#90caf9', 0, 0.1, 0.81, { m: 0.5, r: 0.2 });
  const aw = B(g, 2.3, 0.06, 0.6, '#e53935', 0, 1.0, 1.05); aw.rotation.x = 0.35;
  B(g, 0.8, 0.35, 0.08, '#ffeb3b', 0, 1.15, 0.82, { e: '#fdd835', ei: 0.5 });
};
M.temple = g => {
  B(g, 2.4, 0.2, 1.8, '#9e9e9e');
  B(g, 1.8, 0.9, 1.2, '#c62828', 0, 0.2, 0);
  roof(g, 2.5, 1.8, 0.5, '#e65100', 0, 1.1, 0);
  B(g, 2.2, 0.08, 0.1, '#2e7d32', 0, 1.55, 0);
  for (const s of [-1, 1]) { const t = put(g, new THREE.ConeGeometry(0.08, 0.4, 4), '#2e7d32', s * 1.15, 1.7, 0); t.rotation.z = -s * 0.9; }
  C(g, 0.18, 0.22, 0.35, '#8d6e63', 0, 0.2, 1.2, 8); for (let k = -1; k <= 1; k++) C(g, 0.01, 0.01, 0.25, '#ff7043', k * 0.06, 0.55, 1.2, 3, { e: '#ff5722' });
  lantern(g, -0.6, 0.85, 0.66); lantern(g, 0.6, 0.85, 0.66);
};
M.hospital = g => {
  B(g, 2.4, 1.6, 1.6, '#ffffff');
  B(g, 2.42, 0.1, 1.62, '#4fc3f7', 0, 0.5); B(g, 2.42, 0.1, 1.62, '#4fc3f7', 0, 1.0);
  B(g, 0.6, 0.18, 0.18, '#e53935', 0, 1.9, 0, { e: '#c62828', ei: 0.4 }); B(g, 0.18, 0.6, 0.18, '#e53935', 0, 1.7, 0, { e: '#c62828', ei: 0.4 });
  B(g, 0.6, 0.6, 0.03, '#90caf9', 0, 0, 0.81);
};
M.police = g => {
  B(g, 2.3, 1.3, 1.6, '#eceff1');
  B(g, 2.32, 0.3, 1.62, '#1565c0', 0, 1.0);
  B(g, 0.7, 0.6, 0.03, '#455a64', 0, 0, 0.81);
  B(g, 0.9, 0.35, 0.45, '#ffffff', 1.3, 0, 1.2); B(g, 0.5, 0.25, 0.42, '#1565c0', 1.3, 0.35, 1.2);
  const r = S(g, 0.09, '#ff1744', 1.18, 0.65, 1.2, { e: '#ff1744' }, 6, 4), b = S(g, 0.09, '#2979ff', 1.42, 0.65, 1.2, { e: '#2979ff' }, 6, 4);
  anim(g, t => { const on = Math.floor(t * 4) % 2; r.material.emissiveIntensity = on ? 1.5 : 0.1; b.material.emissiveIntensity = on ? 0.1 : 1.5; });
};
M.lottery = g => {
  C(g, 0.5, 0.7, 0.6, '#6a1b9a', 0, 0, 0, 8);
  S(g, 0.75, mat('#e1f5fe', { op: 0.35, r: 0.1 }), 0, 1.35, 0, undefined, 14, 10).castShadow = false;
  const balls = new THREE.Group(); balls.position.y = 1.35; g.add(balls);
  const cs = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#ffffff', '#fb8c00'];
  for (let i = 0; i < 12; i++) S(balls, 0.12, cs[i % 6], (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.9, undefined, 6, 5);
  anim(g, t => { balls.rotation.y = t * 2; balls.rotation.x = Math.sin(t) * 0.5; });
};
M.bank = g => {
  B(g, 2.6, 0.3, 1.8, '#e0e0e0');
  for (let k = -2; k <= 2; k++) C(g, 0.12, 0.12, 1.2, '#fafafa', k * 0.5, 0.3, 0.6, 8);
  B(g, 2.4, 1.2, 1.0, '#eeeeee', 0, 0.3, -0.25);
  B(g, 2.6, 0.18, 1.8, '#fafafa', 0, 1.5);
  const sh = new THREE.Shape(); sh.moveTo(-1.3, 0); sh.lineTo(1.3, 0); sh.lineTo(0, 0.55); sh.lineTo(-1.3, 0);
  put(g, new THREE.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: false }), '#fafafa', 0, 1.68, -0.9);
  S(g, 0.2, '#d4af37', 0, 1.95, 0.92, { m: 0.8, r: 0.3 }).scale.z = 0.3;
};

// ---- 擴充景點 ----
function stall(g, x, z, c, rot = 0) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rot; g.add(t);
  B(t, 0.6, 0.45, 0.45, '#eeeeee'); B(t, 0.75, 0.05, 0.6, c, 0, 0.75);
  for (const dx of [-0.32, 0.32]) B(t, 0.04, 0.3, 0.04, '#9e9e9e', dx, 0.45, 0.25);
  S(t, 0.07, '#ffeb3b', 0, 0.68, 0.25, { e: '#ffc107', ei: 0.8 }, 5, 4);
}
function nightMarket(g, sign, signC) {
  B(g, 3.3, 0.1, 3.3, '#616161');
  const cs = ['#e53935', '#fb8c00', '#1e88e5', '#43a047', '#8e24aa', '#fdd835'];
  for (let k = 0; k < 4; k++) { stall(g, -1.1 + k * 0.75, -0.7, cs[k], 0); stall(g, -1.1 + k * 0.75, 0.75, cs[(k + 2) % 6], Math.PI); }
  B(g, 0.1, 1.6, 0.1, '#5d4037', -1.5, 0.1, 0); B(g, 0.1, 1.6, 0.1, '#5d4037', 1.5, 0.1, 0);
  B(g, 3.2, 0.45, 0.1, signC, 0, 1.6, 0, { e: signC, ei: 0.35 });
  for (let k = 0; k < 7; k++) lantern(g, -1.4 + k * 0.47, 1.5, 0.12);
}
function temple2(g, wall, roofc, ridge = '#2e7d32') {
  B(g, 3.0, 0.2, 2.6, '#9e9e9e');
  B(g, 2.2, 1.0, 1.4, wall, 0, 0.2, -0.3);
  roof(g, 2.9, 2.0, 0.55, roofc, 0, 1.2, -0.3);
  B(g, 2.6, 0.08, 0.1, ridge, 0, 1.68, -0.3);
  for (const sx of [-1, 1]) { const t = put(g, new THREE.ConeGeometry(0.08, 0.5, 4), ridge, sx * 1.3, 1.85, -0.3); t.rotation.z = -sx * 0.9; }
  B(g, 2.6, 0.7, 0.2, wall, 0, 0.2, 0.9); roof(g, 2.9, 0.6, 0.3, roofc, 0, 0.9, 0.9);
  B(g, 0.6, 0.55, 0.05, '#4e342e', 0, 0.2, 1.01);
  C(g, 0.2, 0.25, 0.35, '#8d6e63', 0, 0.2, 0.3, 8);
  lantern(g, -0.6, 0.8, 1.05); lantern(g, 0.6, 0.8, 1.05);
}
M.shilin = g => nightMarket(g, '士林', '#e53935');
M.fengjia = g => nightMarket(g, '逢甲', '#fb8c00');
M.miaokou = g => { nightMarket(g, '廟口', '#fdd835'); hall(g, 1.2, 0.8, 0.6, '#c62828', '#e65100', 0, 0.1, -1.4, 0.35); };
M.ximen = g => {
  B(g, 3.3, 0.1, 3.3, '#9e9e9e');
  C(g, 0.75, 0.75, 1.1, '#b5523b', -0.5, 0.1, -0.4, 8);
  C(g, 0.2, 0.85, 0.5, '#5d4037', -0.5, 1.2, -0.4, 8);
  B(g, 1.2, 0.9, 1.0, '#b5523b', -0.5, 0.1, 0.6); roof(g, 1.4, 1.2, 0.3, '#5d4037', -0.5, 1.0, 0.6);
  for (let k = 0; k < 3; k++) { const c = ['#ec407a', '#29b6f6', '#ffca28'][k]; B(g, 0.7, 1.6 + k * 0.4, 0.7, '#eceff1', 1.0, 0.1, -1.0 + k * 0.9); B(g, 0.72, 0.4, 0.05, c, 1.0, 1.0 + k * 0.3, -0.64 + k * 0.9, { e: c, ei: 0.6 }); }
};
M.longshan = g => temple2(g, '#c62828', '#bf360c');
M.chenghuang = g => temple2(g, '#b71c1c', '#4e342e', '#fbc02d');
M.confucius = g => {
  B(g, 3.2, 0.15, 3.2, '#bdbdbd');
  for (const [w, d, x, z] of [[3, 0.2, 0, -1.4], [3, 0.2, 0, 1.4], [0.2, 3, -1.4, 0], [0.2, 3, 1.4, 0]]) B(g, w, 0.55, d, '#c62828', x, 0.15, z);
  B(g, 1.8, 0.9, 1.2, '#c62828', 0, 0.15, -0.2);
  roof(g, 2.4, 1.7, 0.45, '#fbc02d', 0, 1.05, -0.2); roof(g, 1.6, 1.1, 0.35, '#fbc02d', 0, 1.45, -0.2);
  roundTree(g, -0.9, 0.9, 0.3, '#2e7d32', 0.15); roundTree(g, 0.9, 0.9, 0.3, '#2e7d32', 0.15);
};
M.lantern = g => {
  C(g, 1.7, 1.8, 0.15, '#558b2f', 0, 0, 0, 12);
  B(g, 3.0, 0.04, 0.5, '#5d4037', 0, 0.15, 0.9); for (let k = -5; k <= 5; k++) B(g, 0.06, 0.05, 0.6, '#795548', k * 0.27, 0.15, 0.9);
  hall(g, 1.0, 0.7, 0.6, '#a1887f', '#424242', -0.7, 0.15, -0.6, 0.3);
  const ls = [];
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Group(); const c = ['#ff7043', '#ffca28', '#ef5350', '#ab47bc', '#66bb6a'][i % 5];
    put(l, new THREE.CylinderGeometry(0.22, 0.15, 0.45, 8), mat(c, { e: c, ei: 0.7, op: 0.92 }), 0, 0, 0);
    l.position.set((Math.random() - 0.5) * 2.4, 1 + Math.random() * 2, (Math.random() - 0.5) * 2); l.userData.ph = Math.random();
    g.add(l); ls.push(l);
  }
  anim(g, t => ls.forEach(l => { const f = (t * 0.12 + l.userData.ph) % 1; l.position.y = 0.6 + f * 3.4; l.scale.setScalar(1 - f * 0.5); }));
};
M.lanyang = g => {
  B(g, 3.2, 0.12, 3.2, '#9e9e9e');
  water(g, 1.0, 0.8, 0.9, 0.13, '#4fc3f7');
  const sh = new THREE.Shape(); sh.moveTo(-1.2, 0); sh.lineTo(1.0, 0); sh.lineTo(1.0, 0.5); sh.lineTo(-1.2, 2.2); sh.lineTo(-1.2, 0);
  put(g, new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }), mat('#b0bec5', { r: 0.5 }), 0, 0.12, -1.4);
  for (let k = 0; k < 5; k++) B(g, 0.05, 1.6 - k * 0.3, 0.02, '#455a64', -1.0 + k * 0.45, 0.12, 0.21);
};
M.balloon = g => {
  C(g, 1.7, 1.8, 0.15, '#9ccc65', 0, 0, 0, 12);
  const bs = [];
  [['#e53935', -0.7, 2.4, 0], ['#fdd835', 0.6, 2.9, -0.5], ['#1e88e5', 0.3, 1.8, 0.8], ['#8e24aa', -0.4, 3.4, -0.9]].forEach(([c, x, y, z], i) => {
    const b = new THREE.Group(); b.position.set(x, y, z); g.add(b);
    const e = S(b, 0.5, c, 0, 0, 0, undefined, 10, 8); e.scale.y = 1.2;
    for (let k = 0; k < 4; k++) B(b, 0.02, 0.6, 0.02, '#795548', Math.cos(k * 1.57) * 0.15, -0.95, Math.sin(k * 1.57) * 0.15);
    B(b, 0.3, 0.25, 0.3, '#8d6e63', 0, -0.95, 0); b.userData.y0 = y; b.userData.ph = i; bs.push(b);
  });
  anim(g, t => bs.forEach(b => { b.position.y = b.userData.y0 + Math.sin(t * 0.8 + b.userData.ph) * 0.25; }));
};
M.lanyu = g => {
  islet(g, 1.8, '#388e3c', 0.35);
  put(g, new THREE.ConeGeometry(1.0, 1.4, 6), '#2e7d32', -0.5, 0.85, -0.6);
  for (const [x, z, r] of [[0.7, 0.9, 0.3], [-0.2, 1.2, -0.2]]) {
    const b = new THREE.Group(); b.position.set(x, 0.3, z); b.rotation.y = r; g.add(b);
    const hull = S(b, 0.4, '#fafafa', 0, 0.1, 0, undefined, 10, 6); hull.scale.set(2.0, 0.55, 0.6);
    B(b, 1.4, 0.06, 0.25, '#c62828', 0, 0.18, 0);
    for (const sx of [-1, 1]) { const p = B(b, 0.06, 0.45, 0.06, '#fafafa', sx * 0.75, 0.05, 0); p.rotation.z = sx * 0.35; }
  }
};
M.xiaoliuqiu = g => {
  islet(g, 1.7, '#7cb342', 0.3);
  water(g, 0.9, 0.9, 0.9, 0.05, '#4dd0e1');
  C(g, 0.18, 0.28, 0.7, '#8d7b68', 0.9, 0, 0.9, 7);
  const top = S(g, 0.55, '#7d6b58', 0.9, 0.95, 0.9, undefined, 8, 6); top.scale.y = 0.65;
  tree(g, 0.9, 0.9, 0.6, '#558b2f', 1.2);
  const t = S(g, 0.2, '#5d8a4a', -0.6, 0.15, 1.2, undefined, 8, 5); t.scale.set(1.3, 0.5, 1);
};
M.formosa = g => {
  B(g, 3.0, 0.15, 3.0, '#cfd8dc');
  const cols = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const seg = put(g, new THREE.SphereGeometry(1.3, 4, 6, a, Math.PI / 6, 0, Math.PI / 2), mat(cols[i % 6], { e: cols[i % 6], ei: 0.45, ds: true, op: 0.9 }), 0, 0.15, 0);
    seg.castShadow = false;
  }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; C(g, 0.08, 0.1, 1.0, '#eceff1', Math.cos(a) * 1.25, 0.15, Math.sin(a) * 1.25, 6); }
};
M.chimei = g => {
  B(g, 3.3, 0.12, 3.3, '#c8e6c9');
  water(g, 0.6, 0, 1.1, 0.13, '#4fc3f7'); C(g, 0.1, 0.15, 0.5, '#fafafa', 0, 0.12, 1.1, 6); S(g, 0.12, '#d4af37', 0, 0.72, 1.1, { m: 0.8 });
  B(g, 2.8, 1.0, 1.2, '#fafafa', 0, 0.12, -0.6);
  for (let k = -3; k <= 3; k++) C(g, 0.07, 0.07, 0.85, '#eeeeee', k * 0.36, 0.12, 0.05, 6);
  B(g, 2.9, 0.12, 1.3, '#f5f5f5', 0, 1.12, -0.6);
  C(g, 0.45, 0.45, 0.35, '#fafafa', 0, 1.24, -0.6, 12);
  const d = S(g, 0.45, '#cfd8dc', 0, 1.59, -0.6, { m: 0.5, r: 0.3 }, 12, 8); d.scale.y = 0.9;
  S(g, 0.08, '#d4af37', 0, 2.05, -0.6, { m: 0.8 });
};
M.jibei = g => {
  const sand = C(g, 0.9, 1.1, 0.3, '#fff3c4', -0.6, -0.15, -0.6, 10);
  const spit = B(g, 0.5, 0.18, 2.4, '#fff3c4', 0.3, -0.06, 0.4); spit.rotation.y = 0.5;
  water(g, 1.8, 0, 0, 0.02, '#4dd0e1');
  palm(g, -0.8, -0.8, 1.1, 0.15);
  B(g, 0.5, 0.12, 0.2, '#ff7043', 1.1, 0.02, -0.4); B(g, 0.4, 0.1, 0.18, '#ffee58', -0.2, 0.02, 1.3);
};
M.cingjing = g => {
  const hill = C(g, 1.75, 1.85, 0.3, '#9ccc65', 0, 0, 0, 12);
  for (let k = 0; k < 6; k++) {
    const x = -1.0 + (k % 3) * 0.9, z = -0.4 + Math.floor(k / 3) * 0.9;
    const b = S(g, 0.22, '#fafafa', x, 0.5, z, undefined, 7, 5); b.scale.set(1.3, 0.9, 0.9);
    S(g, 0.1, '#424242', x + 0.28, 0.58, z, undefined, 5, 4);
    for (const dx of [-0.12, 0.12]) C(g, 0.03, 0.03, 0.2, '#424242', x + dx, 0.3, z, 4);
  }
  B(g, 0.08, 0.5, 2.6, '#8d6e63', 1.4, 0.3, 0); hall(g, 0.8, 0.6, 0.5, '#fffde7', '#c62828', -1.0, 0.3, -1.2, 0.3);
};
M.hehuan = g => {
  C(g, 1.75, 1.85, 0.2, '#6d8b6a', 0, 0, 0, 12);
  put(g, new THREE.ConeGeometry(1.4, 2.6, 7), '#7b8b6f', -0.2, 1.5, -0.3);
  put(g, new THREE.ConeGeometry(0.62, 1.0, 7), '#ffffff', -0.2, 2.3, -0.3);
  put(g, new THREE.ConeGeometry(0.8, 1.6, 6), '#8a9a7a', 1.0, 1.0, 0.5);
  put(g, new THREE.ConeGeometry(0.35, 0.55, 6), '#ffffff', 1.0, 1.55, 0.5);
  B(g, 0.3, 0.5, 0.08, '#5d4037', -0.9, 0.2, 1.0); B(g, 0.6, 0.25, 0.08, '#fafafa', -0.9, 0.55, 1.0);
};
M.buddha = g => {
  C(g, 1.6, 1.8, 0.25, '#7cb342', 0, 0, 0, 12);
  C(g, 0.9, 1.0, 0.45, '#78909c', 0, 0.25, 0, 10);
  const body = S(g, 0.8, '#37474f', 0, 1.2, 0, { m: 0.3 }, 10, 8); body.scale.set(1, 1.1, 0.8);
  S(g, 0.42, '#37474f', 0, 2.25, 0, { m: 0.3 }, 10, 8);
  S(g, 0.2, '#37474f', 0, 2.65, 0, { m: 0.3 }, 6, 5);
  const lap = S(g, 0.6, '#455a64', 0, 0.8, 0.35, undefined, 8, 5); lap.scale.set(1.3, 0.4, 0.8);
};
M.roundhouse = g => {
  C(g, 1.75, 1.8, 0.1, '#9e9e9e', 0, 0, 0, 16);
  C(g, 0.55, 0.55, 0.08, '#616161', 0, 0.1, 0.8, 16); B(g, 1.1, 0.06, 0.15, '#424242', 0, 0.18, 0.8);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI + 0.25 + k * 0.38;
    const x = Math.cos(a) * 1.25, z = Math.sin(a) * 1.25 + 0.6;
    const b = B(g, 0.38, 0.55, 0.7, '#a1887f', x, 0.1, z); b.rotation.y = -a + Math.PI / 2;
    const r = roof(g, 0.45, 0.8, 0.2, '#5d4037', x, 0.65, z); r.rotation.y = -a + Math.PI / 2 + Math.PI / 4;
  }
  B(g, 0.35, 0.35, 0.8, '#212121', 0.1, 0.18, 0.8); C(g, 0.06, 0.08, 0.3, '#212121', 0.1, 0.5, 1.05, 6);
};
M.rainbow = g => {
  B(g, 3.2, 0.1, 3.2, '#e0e0e0');
  const cs = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  for (let k = 0; k < 6; k++) {
    const x = -1.1 + (k % 3) * 1.1, z = k < 3 ? -0.7 : 0.7;
    B(g, 0.9, 0.7, 0.9, '#fff8e1', x, 0.1, z);
    B(g, 0.92, 0.25, 0.92, cs[k], x, 0.3, z); S(g, 0.12, cs[(k + 3) % 6], x, 0.6, z + 0.46, undefined, 6, 4);
    roof(g, 1.0, 1.0, 0.25, '#795548', x, 0.8, z);
  }
};
M.shengxing = g => {
  C(g, 1.7, 1.8, 0.15, '#689f38', 0, 0, 0, 12);
  B(g, 1.6, 0.75, 0.9, '#8d6e63', -0.2, 0.15, -0.5); roof(g, 2.0, 1.2, 0.5, '#4e342e', -0.2, 0.9, -0.5);
  B(g, 3.0, 0.04, 0.12, '#424242', 0, 0.15, 0.6);
  B(g, 0.8, 0.5, 0.42, '#1565c0', -0.6, 0.19, 0.6); B(g, 0.8, 0.5, 0.42, '#fafafa', 0.3, 0.19, 0.6);
  put(g, new THREE.ConeGeometry(0.7, 1.2, 6), '#33691e', 1.1, 0.75, -0.9);
};
M.longteng = g => {
  C(g, 1.7, 1.8, 0.15, '#7cb342', 0, 0, 0, 12);
  for (let k = 0; k < 4; k++) {
    const x = -1.2 + k * 0.8, h = [1.5, 1.8, 1.3, 1.6][k];
    B(g, 0.32, h, 0.5, '#b5523b', x, 0.15, 0);
    if (k < 3 && k !== 1) { const a = put(g, new THREE.TorusGeometry(0.4, 0.13, 5, 10, Math.PI), '#a0452e', x + 0.4, 0.15 + h - 0.45, 0); a.scale.z = 2.5; }
  }
  tree(g, 1.2, 1.0, 0.8, '#2e7d32', 0.15); tree(g, -1.1, -1.1, 0.9, '#2e7d32', 0.15);
};
M.fortsd = g => {
  C(g, 1.7, 1.8, 0.2, '#8bc34a', 0, 0, 0, 12);
  B(g, 1.5, 1.2, 1.5, '#c62828', -0.2, 0.2, -0.2);
  for (let k = 0; k < 4; k++) B(g, 0.28, 0.2, 0.28, '#b71c1c', -0.8 + k * 0.4, 1.4, 0.43);
  B(g, 1.1, 0.7, 0.9, '#fafafa', 0.5, 0.2, 0.9); roof(g, 1.3, 1.1, 0.35, '#c62828', 0.5, 0.9, 0.9);
  C(g, 0.02, 0.02, 0.7, '#9e9e9e', -0.2, 1.4, -0.2, 4); B(g, 0.35, 0.22, 0.02, '#1e88e5', -0.02, 1.85, -0.2);
};

export function buildLandmark(id) {
  const g = new THREE.Group();
  (M[id] || M.chance)(g);
  return g;
}

// ---- 房屋（依等級）：買地就有小屋，越蓋越高 ----
export function buildHouses(level, color) {
  const g = new THREE.Group();
  const wall = '#fff8e1', win = mat('#90caf9', { e: '#fff59d', ei: 0.25 });
  const windows = (w, h, d, y0, floors) => {
    for (let f = 0; f < floors; f++) for (const sx of [-1, 1]) B(g, 0.16, 0.16, 0.02, win, sx * w * 0.25, y0 + 0.12 + f * (h / floors), d / 2 + 0.005);
  };
  if (level === 0) { // 小木屋
    B(g, 0.7, 0.45, 0.6, '#d7a86e'); roof(g, 0.95, 0.85, 0.4, color, 0, 0.45, 0);
    B(g, 0.16, 0.26, 0.02, '#6d4c41', 0, 0, 0.31); windows(0.7, 0.45, 0.6, 0.05, 1);
    C(g, 0.03, 0.03, 0.9, '#eeeeee', 0.45, 0, -0.2, 4); B(g, 0.32, 0.2, 0.02, color, 0.62, 0.65, -0.2);
  } else if (level === 1) { // 平房
    B(g, 1.1, 0.55, 0.8, wall); roof(g, 1.4, 1.1, 0.45, color, 0, 0.55, 0); B(g, 0.2, 0.32, 0.02, '#6d4c41', 0, 0, 0.41); windows(1.1, 0.55, 0.8, 0.08, 1);
  } else if (level === 2) { // 二層樓
    B(g, 1.0, 1.0, 0.85, wall); roof(g, 1.3, 1.15, 0.45, color, 0, 1.0, 0); windows(1.0, 1.0, 0.85, 0.05, 2); B(g, 0.2, 0.32, 0.02, '#6d4c41', 0, 0, 0.43);
  } else if (level === 3) { // 透天厝
    B(g, 0.95, 1.5, 0.9, wall); B(g, 1.0, 0.1, 0.95, color, 0, 1.5); windows(0.95, 1.5, 0.9, 0.05, 3);
    B(g, 0.6, 0.3, 0.6, color, 0, 1.6); B(g, 0.2, 0.32, 0.02, '#6d4c41', 0, 0, 0.46);
  } else if (level === 4) { // 公寓
    const tex = windowsTex(color);
    B(g, 1.1, 2.1, 1.0, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); B(g, 1.15, 0.12, 1.05, '#eeeeee', 0, 2.1);
    C(g, 0.2, 0.2, 0.35, '#90a4ae', 0.3, 2.22, 0.2, 8);
  } else { // 摩天大樓
    const tex = windowsTex(color);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.3 });
    B(g, 1.0, 2.0, 1.0, m); B(g, 0.8, 1.4, 0.8, m, 0, 2.0); B(g, 0.55, 0.8, 0.55, m, 0, 3.4);
    C(g, 0.02, 0.04, 0.8, '#cfd8dc', 0, 4.2, 0, 5); S(g, 0.06, '#ff5252', 0, 5.0, 0, { e: '#ff1744' });
  }
  g.scale.setScalar(0.85);
  return g;
}

// ---- 玩家棋子（有手腳、會走路揮手）----
function limb(parent, r, len, c, x, y, z) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), mat(c));
  m.position.y = -len / 2 - r * 0.5; m.castShadow = true; pivot.add(m);
  return pivot;
}
const ANIMALS = {
  bear: { fur: '#1c1c1c', belly: '#262626', ear: 'round', muzzle: '#c8a27a', tail: 'short', tailC: '#1c1c1c' },
  cloudleo: { fur: '#cdb48a', belly: '#f3e9d2', ear: 'cat', spots: '#4e4030', cloud: 1, tail: 'long' },
  otter: { fur: '#6d4c41', belly: '#d7ccc8', ear: 'small', tail: 'otter', whisker: 1 },
  muntjac: { fur: '#b5651d', belly: '#f5deb3', ear: 'deer', antler: 'short', tail: 'short', tailC: '#fff8e1' },
  owl: { fur: '#8d6e63', belly: '#d7ccc8', ear: 'tuft', beak: '#4e342e', bigEye: '#ffb300', tail: 'owl', leg: '#bdbdbd', wings: 1 },
  seaturtle: { fur: '#8bc34a', belly: '#fff59d', ear: 'none', tail: 'short', tailC: '#8bc34a', shell: '#4e6b2f', wings: 1 },
  leopard: { fur: '#d9a066', belly: '#fff3e0', ear: 'cat', spots: '#5d4037', tail: 'long' },
  magpie: { fur: '#1e5bd8', belly: '#cfe3ff', ear: 'none', headC: '#111111', beak: '#e53935', tail: 'bird', leg: '#e53935', wings: 1 },
  deer: { fur: '#a0522d', belly: '#fff8e1', ear: 'deer', spots: '#fffde7', antler: 1, tail: 'short' },
  pheasant: { fur: '#283593', belly: '#1a237e', ear: 'none', headC: '#1a237e', beak: '#eceff1', face: '#e53935', tail: 'pheasant', leg: '#9e9e9e', wings: 1 },
  pangolin: { fur: '#8d6e63', belly: '#d7ccc8', ear: 'none', scales: '#6d4c41', snout: 1, tail: 'scaly' },
  monkey: { fur: '#8d7b6a', belly: '#d7ccc8', ear: 'round', face: '#f8bbd0', tail: 'long' },
};
function buildAnimal(charId, color) {
  const a = ANIMALS[charId];
  const root = new THREE.Group();
  C(root, 0.42, 0.46, 0.06, '#ffffff', 0, 0, 0, 16, { e: color, ei: 0.35 });
  const body = new THREE.Group(); body.position.y = 0.06; root.add(body);
  const legC = a.leg || a.fur;
  const legL = limb(body, a.leg ? 0.04 : 0.09, 0.26, legC, -0.13, 0.42, 0), legR = limb(body, a.leg ? 0.04 : 0.09, 0.26, legC, 0.13, 0.42, 0);
  for (const l of [legL, legR]) { const f = S(l, 0.1, a.leg ? a.leg : a.fur, 0, -0.42, 0.05, undefined, 6, 4); f.scale.set(1, 0.5, 1.5); }
  const torso = new THREE.Group(); torso.position.y = 0.42; body.add(torso);
  const tb = S(torso, 0.3, a.fur, 0, 0.18, 0, undefined, 12, 9); tb.scale.set(1, 1.15, 0.95);
  const bl = S(torso, 0.2, a.belly, 0, 0.15, 0.15, undefined, 10, 8); bl.scale.set(1, 1.2, 0.6);
  let armL, armR;
  if (a.wings) {
    armL = new THREE.Group(); armL.position.set(-0.27, 0.35, 0); torso.add(armL);
    armR = new THREE.Group(); armR.position.set(0.27, 0.35, 0); torso.add(armR);
    for (const [w, sx] of [[armL, -1], [armR, 1]]) { const wing = S(w, 0.2, a.fur, sx * 0.04, -0.18, 0, undefined, 8, 6); wing.scale.set(0.35, 1.1, 0.8); }
  } else {
    armL = limb(torso, 0.07, 0.2, a.fur, -0.27, 0.36, 0); armR = limb(torso, 0.07, 0.2, a.fur, 0.27, 0.36, 0);
    for (const q of [armL, armR]) S(q, 0.08, a.face || a.belly, 0, -0.36, 0, undefined, 6, 5);
  }
  armL.rotation.z = 0.15; armR.rotation.z = -0.15;
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
  const hc = a.headC || a.fur;
  const hs = S(head, 0.3, hc, 0, 0, 0, undefined, 12, 10); hs.scale.set(1.05, 0.95, 1);
  if (a.face) { const fc = S(head, 0.2, a.face, 0, -0.02, 0.15, undefined, 10, 8); fc.scale.set(1.1, 1, 0.6); }
  else if (!a.headC && a.ear !== 'tuft') { const m = S(head, 0.15, a.muzzle || a.belly, 0, -0.08, 0.2, undefined, 8, 6); m.scale.set(1.2, 0.8, 0.7); }
  // 眼睛
  if (a.bigEye) for (const sx of [-1, 1]) { S(head, 0.11, '#f5f5f5', sx * 0.12, 0.04, 0.22, undefined, 10, 8).scale.z = 0.5; S(head, 0.075, a.bigEye, sx * 0.12, 0.04, 0.26, undefined, 8, 6).scale.z = 0.5; S(head, 0.045, '#111', sx * 0.12, 0.04, 0.29, undefined, 6, 5); S(head, 0.016, '#fff', sx * 0.1, 0.07, 0.32, undefined, 4, 3); }
  else for (const sx of [-1, 1]) { S(head, 0.06, '#ffffff', sx * 0.11, 0.05, 0.25, undefined, 8, 6); S(head, 0.038, '#111', sx * 0.11, 0.05, 0.29, undefined, 6, 5); S(head, 0.014, '#fff', sx * 0.1, 0.07, 0.32, undefined, 4, 3); }
  for (const sx of [-1, 1]) S(head, 0.05, '#ff8a80', sx * 0.19, -0.07, 0.22, undefined, 5, 4).scale.z = 0.3;
  if (a.beak) { const bk = put(head, new THREE.ConeGeometry(0.07, 0.2, 6), a.beak, 0, -0.04, 0.33); bk.rotation.x = Math.PI / 2; }
  else if (a.snout) { const sn = put(head, new THREE.CylinderGeometry(0.05, 0.11, 0.28, 8), a.fur, 0, -0.06, 0.32); sn.rotation.x = Math.PI / 2; S(head, 0.04, '#3e2723', 0, -0.06, 0.46); }
  else S(head, 0.035, '#3e2723', 0, -0.05, 0.31);
  if (a.ear === 'cat') for (const sx of [-1, 1]) { const e = put(head, new THREE.ConeGeometry(0.1, 0.2, 4), a.fur, sx * 0.17, 0.27, 0); e.rotation.z = -sx * 0.25; }
  if (a.ear === 'round' || a.ear === 'deer') for (const sx of [-1, 1]) { const e = S(head, a.ear === 'deer' ? 0.1 : 0.09, a.fur, sx * (a.ear === 'deer' ? 0.3 : 0.29), a.ear === 'deer' ? 0.12 : 0.02, 0, undefined, 6, 5); e.scale.set(a.ear === 'deer' ? 1.6 : 0.6, a.ear === 'deer' ? 0.6 : 1, 0.5); }
  if (a.ear === 'tuft') for (const sx of [-1, 1]) { const e = put(head, new THREE.ConeGeometry(0.06, 0.18, 4), a.fur, sx * 0.18, 0.3, 0); e.rotation.z = -sx * 0.4; }
  if (a.ear === 'small') for (const sx of [-1, 1]) S(head, 0.06, a.fur, sx * 0.22, 0.17, 0, undefined, 6, 4).scale.z = 0.5;
  if (a.whisker) for (const sx of [-1, 1]) for (const dy of [-0.06, -0.1]) { const w = B(head, 0.22, 0.008, 0.008, '#efebe9', sx * 0.2, dy, 0.26); w.rotation.z = sx * dy * 2; }
  if (charId === 'bear') { const v = B(torso, 0.34, 0.09, 0.05, '#fafafa', 0, 0.3, 0.26); const v2 = B(torso, 0.14, 0.09, 0.05, '#fafafa', 0, 0.22, 0.27); }
  if (a.cloud) for (let i = 0; i < 7; i++) { const c = S(torso, 0.07, a.spots, Math.cos(i * 0.9) * 0.27, 0.0 + (i % 4) * 0.1, Math.sin(i * 0.9) * 0.22, undefined, 6, 4); c.scale.set(1.5, 0.8, 0.5); }
  if (a.antler === 'short') for (const sx of [-1, 1]) { const an = C(head, 0.015, 0.025, 0.16, '#5d4037', sx * 0.1, 0.25, 0, 5); an.rotation.z = -sx * 0.2; }
  if (a.shell) { const sh = S(torso, 0.36, a.shell, 0, 0.2, -0.12, undefined, 12, 8); sh.scale.set(1.05, 1.1, 0.75); for (let i = 0; i < 5; i++) { const h = S(torso, 0.08, '#6b8e3a', Math.cos(i * 1.26) * 0.18, 0.2 + Math.sin(i * 1.26) * 0.2, -0.38, undefined, 6, 4); h.scale.z = 0.3; } }
  if (charId === 'leopard') {
    B(head, 0.035, 0.18, 0.02, '#fffde7', -0.05, 0.12, 0.27).rotation.x = -0.6; B(head, 0.035, 0.18, 0.02, '#fffde7', 0.05, 0.12, 0.27).rotation.x = -0.6;
    for (let i = 0; i < 6; i++) S(torso, 0.04, a.spots, Math.cos(i) * 0.26, 0.05 + (i % 3) * 0.12, Math.sin(i) * 0.2 - 0.05, undefined, 5, 4);
  }
  if (charId === 'deer') {
    for (let i = 0; i < 7; i++) S(torso, 0.035, a.spots, Math.cos(i * 1.7) * 0.25, 0.08 + (i % 3) * 0.1, -0.1 - Math.abs(Math.sin(i)) * 0.15, undefined, 5, 4);
    for (const sx of [-1, 1]) { const an = new THREE.Group(); an.position.set(sx * 0.12, 0.25, 0); head.add(an); const st = C(an, 0.02, 0.03, 0.3, '#d7ccc8', 0, 0, 0, 5); st.rotation.z = -sx * 0.3; const br = C(an, 0.015, 0.02, 0.15, '#d7ccc8', sx * 0.06, 0.12, 0, 5); br.rotation.z = sx * 0.6; }
  }
  if (charId === 'magpie') { const c = S(head, 0.06, '#e53935', 0.13, 0.12, 0.2, undefined, 5, 4); c.scale.set(0.5, 0.5, 0.5); }
  if (charId === 'pheasant') { for (const sx of [-1, 1]) S(head, 0.07, a.face, sx * 0.12, 0.05, 0.2, undefined, 6, 5).scale.z = 0.4; }
  if (a.scales) for (let r = 0; r < 3; r++) for (let k = -1; k <= 1; k++) { const sc = put(torso, new THREE.ConeGeometry(0.12, 0.14, 4), a.scales, k * 0.17, 0.35 - r * 0.15, -0.2 - r * 0.02); sc.rotation.x = -2.2; }
  if (a.scales) for (let k = -1; k <= 1; k++) { const sc = put(head, new THREE.ConeGeometry(0.1, 0.12, 4), a.scales, k * 0.13, 0.2, -0.12); sc.rotation.x = -2.0; }
  // 尾巴
  const tail = new THREE.Group(); tail.position.set(0, 0.0, -0.25); torso.add(tail);
  if (a.tail === 'long') { const tl = C(tail, 0.04, 0.06, 0.6, a.fur, 0, 0, 0, 6); tl.rotation.x = -0.9; if (charId === 'leopard') for (let i = 0; i < 3; i++) C(tail, 0.065, 0.065, 0.05, a.spots, 0, 0.12 + i * 0.13, -0.1 - i * 0.12, 6).rotation.x = -0.9; }
  if (a.tail === 'short') S(tail, 0.07, a.tailC || '#ffffff', 0, 0.12, 0);
  if (a.tail === 'otter') { const tl = C(tail, 0.03, 0.09, 0.55, a.fur, 0, -0.1, 0, 7); tl.rotation.x = -1.2; }
  if (a.tail === 'owl') { const tl = B(tail, 0.22, 0.05, 0.22, a.fur, 0, 0.0, -0.05); tl.rotation.x = -0.6; }
  if (a.tail === 'bird') { for (const sx of [-1, 1]) { const f = B(tail, 0.12, 0.05, 0.85, a.fur, sx * 0.05, 0, -0.4); f.rotation.x = -0.35; B(tail, 0.12, 0.051, 0.15, '#ffffff', sx * 0.05, -0.15, -0.8).rotation.x = -0.35; } }
  if (a.tail === 'pheasant') { for (let i = 0; i < 6; i++) { const f = B(tail, 0.1, 0.04, 0.16, i % 2 ? '#eceff1' : '#212121', 0, 0.02 + i * 0.05, -0.08 - i * 0.15); f.rotation.x = -0.35; } }
  if (a.tail === 'scaly') { for (let i = 0; i < 4; i++) { const f = put(tail, new THREE.ConeGeometry(0.12 - i * 0.02, 0.18, 4), a.scales, 0, -0.1 - i * 0.03, -0.05 - i * 0.14); f.rotation.x = -1.9; } }
  root.userData = { body, legL, legR, armL, armR, head, torso, tail, walk: 0 };
  return root;
}
export function buildToken(charId, color) {
  if (ANIMALS[charId]) return buildAnimal(charId, color);
  const root = new THREE.Group();
  C(root, 0.42, 0.46, 0.06, '#ffffff', 0, 0, 0, 16, { e: color, ei: 0.35 });
  const body = new THREE.Group(); body.position.y = 0.06; root.add(body);   // 會上下彈跳的部分
  const bear = charId === 'bear';
  const skin = bear ? '#212121' : '#f5cba7';
  const shirt = bear ? '#212121' : color;
  const pants = { boss: '#263238', ama: '#5d4037', chef: '#eeeeee', boba: '#3949ab', surf: '#1565c0', bear: '#212121' }[charId] || '#37474f';
  const legL = limb(body, 0.085, 0.3, pants, -0.12, 0.45, 0), legR = limb(body, 0.085, 0.3, pants, 0.12, 0.45, 0);
  for (const l of [legL, legR]) { const sh = S(l, 0.1, bear ? '#3e2723' : '#3e2723', 0, -0.48, 0.04, undefined, 6, 4); sh.scale.set(1, 0.6, 1.4); }
  const torso = new THREE.Group(); torso.position.y = 0.45; body.add(torso);
  const tor = C(torso, 0.2, 0.25, 0.48, shirt, 0, 0, 0, 10); 
  if (charId === 'ama' || charId === 'boba') C(torso, 0.25, 0.36, 0.3, charId === 'ama' ? '#7b1fa2' : '#fdd835', 0, -0.05, 0, 10);
  const armL = limb(torso, 0.065, 0.3, shirt, -0.27, 0.42, 0), armR = limb(torso, 0.065, 0.3, shirt, 0.27, 0.42, 0);
  armL.rotation.z = 0.15; armR.rotation.z = -0.15;
  for (const a of [armL, armR]) S(a, 0.075, skin, 0, -0.47, 0, undefined, 6, 5);
  const head = new THREE.Group(); head.position.y = 0.78; torso.add(head);
  S(head, bear ? 0.32 : 0.29, skin, 0, 0, 0, undefined, 12, 10);
  if (bear) {
    S(head, 0.11, '#212121', -0.23, 0.24, 0); S(head, 0.11, '#212121', 0.23, 0.24, 0);
    S(head, 0.06, '#5d4037', -0.23, 0.24, 0.05); S(head, 0.06, '#5d4037', 0.23, 0.24, 0.05);
    S(head, 0.14, '#c8a27a', 0, -0.06, 0.24, undefined, 8, 6).scale.z = 0.6;
    S(head, 0.045, '#000', 0, -0.02, 0.33);
    S(head, 0.04, '#fff', -0.11, 0.07, 0.27); S(head, 0.04, '#fff', 0.11, 0.07, 0.27);
    S(head, 0.02, '#000', -0.11, 0.07, 0.3); S(head, 0.02, '#000', 0.11, 0.07, 0.3);
    const v = B(torso, 0.34, 0.1, 0.05, '#fafafa', 0, 0.22, 0.22);
  } else {
    S(head, 0.045, '#fff', -0.1, 0.03, 0.25); S(head, 0.045, '#fff', 0.1, 0.03, 0.25);
    S(head, 0.028, '#222', -0.1, 0.03, 0.285); S(head, 0.028, '#222', 0.1, 0.03, 0.285);
    S(head, 0.05, '#ef9a9a', -0.17, -0.07, 0.22, undefined, 5, 4).scale.z = 0.3; S(head, 0.05, '#ef9a9a', 0.17, -0.07, 0.22, undefined, 5, 4).scale.z = 0.3;
    const mouth = S(head, 0.045, '#c62828', 0, -0.12, 0.26, undefined, 6, 4); mouth.scale.set(1.2, 0.5, 0.5);
  }
  if (charId === 'boss') {
    S(head, 0.3, '#212121', 0, 0.06, -0.03, undefined, 10, 6).scale.set(1, 0.7, 1);
    C(head, 0.34, 0.34, 0.03, '#111', 0, 0.2, 0, 14); C(head, 0.2, 0.21, 0.33, '#111', 0, 0.21, 0, 12); C(head, 0.21, 0.21, 0.05, '#c62828', 0, 0.24, 0, 12);
    B(torso, 0.18, 0.08, 0.04, '#fdd835', 0, 0.28, 0.22); B(torso, 0.05, 0.3, 0.02, '#fafafa', 0, 0.0, 0.245);
    const cane = C(armR, 0.02, 0.02, 0.6, '#d4af37', 0, -1.0, 0.08, 5);
  } else if (charId === 'ama') {
    S(head, 0.3, '#bdbdbd', 0, 0.06, -0.04, undefined, 10, 6).scale.y = 0.75; S(head, 0.15, '#bdbdbd', 0, 0.2, -0.25);
    C(head, 0.12, 0.12, 0.02, '#5d4037', -0.1, 0.03, 0.27, 10).rotation.x = Math.PI / 2; C(head, 0.12, 0.12, 0.02, '#5d4037', 0.1, 0.03, 0.27, 10).rotation.x = Math.PI / 2;
    const bag = S(armL, 0.13, '#e91e63', 0, -0.55, 0.05, undefined, 7, 5); bag.scale.set(1, 0.8, 0.5);
  } else if (charId === 'chef') {
    C(head, 0.21, 0.19, 0.25, '#ffffff', 0, 0.2, 0, 12); S(head, 0.25, '#ffffff', 0, 0.5, 0, undefined, 9, 6).scale.y = 0.7;
    C(torso, 0.26, 0.26, 0.04, '#ffffff', 0, 0.38, 0, 10); B(torso, 0.3, 0.32, 0.03, '#ffffff', 0, 0.02, 0.24);
    const sp = B(armR, 0.05, 0.4, 0.05, '#9e9e9e', 0, -0.8, 0.05); C(armR, 0.12, 0.12, 0.03, '#616161', 0, -0.98, 0.05, 10);
  } else if (charId === 'boba') {
    S(head, 0.3, '#3e2723', 0, 0.05, -0.05, undefined, 10, 6).scale.y = 0.8;
    S(head, 0.13, '#3e2723', -0.25, 0.22, 0); S(head, 0.13, '#3e2723', 0.25, 0.22, 0);
    S(head, 0.05, '#e91e63', -0.17, 0.27, 0.05); S(head, 0.05, '#e91e63', 0.17, 0.27, 0.05);
    C(armR, 0.08, 0.065, 0.24, '#d7b48a', 0, -0.68, 0.06, 8, { op: 0.92 }); C(armR, 0.012, 0.012, 0.18, '#e91e63', 0.02, -0.47, 0.06, 4);
    for (let i = 0; i < 4; i++) S(armR, 0.02, '#3e2723', (i - 1.5) * 0.03, -0.64, 0.12, undefined, 4, 3);
  } else if (charId === 'surf') {
    S(head, 0.3, '#ffb300', 0, 0.06, -0.04, undefined, 10, 6).scale.y = 0.75;
    const cap = S(head, 0.3, '#1565c0', 0, 0.12, 0, undefined, 10, 6); cap.scale.y = 0.5;
    B(head, 0.3, 0.03, 0.22, '#1565c0', 0, 0.15, -0.3);
    const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.0, 3, 10), mat('#ff7043')); bd.scale.z = 0.22; bd.position.set(0, 0.25, -0.3); bd.rotation.z = 0.15; bd.castShadow = true; torso.add(bd);
    B(torso, 0.04, 0.9, 0.02, '#ffffff', 0.04, -0.2, -0.34).rotation.z = 0.15;
  }
  root.userData = { body, legL, legR, armL, armR, head, torso, walk: 0 };
  return root;
}

// 每幀更新棋子動作：mode = walk | idle | wave | cheer | sad | sick
export function animateToken(tok, mode, t, dt) {
  const u = tok.userData; if (!u.body) return;
  const k = Math.min(1, dt * 10);
  let lL = 0, lR = 0, aL = 0.15, aR = -0.15, aLx = 0, aRx = 0, by = 0, hy = 0, tz = 0, tx = 0;
  if (mode === 'walk') {
    u.walk += dt * 13;
    const w = Math.sin(u.walk);
    lL = w * 0.8; lR = -w * 0.8; aLx = -w * 0.9; aRx = w * 0.9; by = Math.abs(Math.cos(u.walk)) * 0.06; tx = 0.12;
  } else if (mode === 'wave') {
    aR = -2.6 + Math.sin(t * 9) * 0.35; by = Math.abs(Math.sin(t * 3)) * 0.05; hy = Math.sin(t * 2) * 0.25;
  } else if (mode === 'cheer') {
    aL = 2.7; aR = -2.7; by = Math.abs(Math.sin(t * 8)) * 0.35;
  } else if (mode === 'sad') {
    aL = 0.05; aR = -0.05; tx = 0.35; hy = 0;
  } else if (mode === 'sick') {
    tz = 1.35; aL = 1.2; aR = -1.2;
  } else {
    by = Math.sin(t * 2.2 + tok.id) * 0.02; hy = Math.sin(t * 0.7 + tok.id) * 0.35; aL = 0.15 + Math.sin(t * 2.2) * 0.04; aR = -aL;
  }
  const L = (o, p, v) => { o[p] += (v - o[p]) * k; };
  if (u.tail) u.tail.rotation.y = Math.sin(t * (mode === 'walk' ? 10 : 3)) * 0.35;
  L(u.legL.rotation, 'x', lL); L(u.legR.rotation, 'x', lR);
  L(u.armL.rotation, 'z', aL); L(u.armR.rotation, 'z', aR); L(u.armL.rotation, 'x', aLx); L(u.armR.rotation, 'x', aRx);
  L(u.body.position, 'y', 0.06 + by); L(u.head.rotation, 'y', hy); L(u.body.rotation, 'z', tz); L(u.torso.rotation, 'x', tx);
}
