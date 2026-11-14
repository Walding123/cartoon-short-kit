// ---------- "Rahasia titik biru di tengah laut" (GPS, 60,21 dtk, Indonesia) ----------
// Set baru di file ini: laut + perahu (SEA), angkasa + bumi + 30 satelit (SP), papan kartu 2D (VD).
import { THREE, camera, W, H, Card, applyLight, LIGHTS, setCam, camKeys, look, idle, blinkAt, prog, smoother, easeOut, easeIn, backOut, lerp, clamp01, toon, basic, add, tbox, group } from './engine.js';
import * as T from './toon.js';
import { showSets } from './world.js';

export const TOTAL = 1806;
const D2R = Math.PI / 180;
const q = (x, n = 1) => Math.round(x * n) / n;
const INK = '#241726';

// ---------- cahaya ----------
const base = { az: 35, el: 50, gain: 1.0, lift: 0.0 };
LIGHTS.laut = { ...base, sky: '#9fd6f3', fog: '#d2ecf8', fogN: 16, fogF: 70, sun: '#fff3dc', sunI: 2.4, hs: '#eef8ff', hg: '#3a6a8a', hI: 1.3, tint: '#ffffff', sat: 1.08, vig: 0.26 };
LIGHTS.senja = { ...base, az: -40, el: 20, sky: '#f3b98c', fog: '#f4c9a2', fogN: 14, fogF: 60, sun: '#ffc78a', sunI: 2.5, hs: '#ffe2c0', hg: '#6a4a5a', hI: 1.15, tint: '#fff0de', sat: 1.12, vig: 0.36 };
LIGHTS.angkasa = { ...base, az: -50, el: 25, sky: '#060a1c', fog: '#060a1c', fogN: 80, fogF: 400, sun: '#fff6e6', sunI: 2.7, hs: '#8aa0e0', hg: '#101830', hI: 0.95, tint: '#ffffff', sat: 1.05, vig: 0.45 };
LIGHTS.papan = { ...base, sky: '#11203f', fog: '#11203f', fogN: 50, fogF: 300, sun: '#ffffff', sunI: 1, hs: '#ffffff', hg: '#888888', hI: 1, tint: '#ffffff', sat: 1.0, vig: 0.4 };

// ---------- set: laut + perahu ----------
const SEA = (x, y, z) => [x, y, z + 300];
const sea = group(SEA(0, 0, 0));
const waterGeo = new THREE.PlaneGeometry(170, 170, 90, 90);
const W0 = Float32Array.from(waterGeo.attributes.position.array);
const water = add(waterGeo, toon('#2b86c8'), [0, 0, 0], [-Math.PI / 2, 0, 0], sea, { cast: false, nd: null });
const foamMat = toon('#e9f6ff');
const FOAM = [];
for (let i = 0; i < 46; i++) {
  const a = i * 2.39996, r = 3 + (i * 7.3) % 26;
  const m = add(new THREE.SphereGeometry(1, 12, 6), foamMat, [r * Math.cos(a), 0.02, r * Math.sin(a) - 4], [0, a, 0], sea, { cast: false });
  m.scale.set(0.5 + (i % 3) * 0.25, 0.03, 0.12); FOAM.push(m);
}
const cloudMat = toon('#ffffff');
for (let i = 0; i < 7; i++) {
  const g = group([-36 + i * 12, 9 + (i % 3) * 2.5, -55 - (i % 2) * 10], sea);
  for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(1.8 + (k % 2), 14, 10), cloudMat, [k * 2.2 - 3, (k % 2) * 0.8, 0], [0, 0, 0], g, { cast: false, receive: false }).scale.set(1, 0.62, 0.7);
}
const boat = group(SEA(0, 0, 0));
const hullMat = toon('#c8553d'), rimMat = toon('#f3efe4'), deckMat = toon('#8a5a3a');
tbox(1.4, 0.14, 3.0, hullMat, [0, 0.05, 0], boat);
for (const s of [-1, 1]) { tbox(0.12, 0.5, 3.0, hullMat, [s * 0.7, 0.3, 0], boat); tbox(0.16, 0.07, 3.04, rimMat, [s * 0.7, 0.58, 0], boat); }
tbox(1.52, 0.5, 0.12, hullMat, [0, 0.3, 1.5], boat); tbox(1.52, 0.5, 0.12, hullMat, [0, 0.3, -1.5], boat);
tbox(1.56, 0.07, 0.16, rimMat, [0, 0.58, 1.5], boat); tbox(1.56, 0.07, 0.16, rimMat, [0, 0.58, -1.5], boat);
tbox(1.3, 0.04, 2.8, deckMat, [0, 0.14, 0], boat);
tbox(1.3, 0.08, 0.36, deckMat, [0, 0.34, -0.95], boat);   // bangku
const motor = group([0, 0, -1.72], boat);
tbox(0.34, 0.42, 0.42, toon('#4a5260'), [0, 0.78, 0], motor); tbox(0.36, 0.08, 0.44, toon('#e2453c'), [0, 1.0, 0], motor);
tbox(0.09, 0.7, 0.09, toon('#2f343e'), [0, 0.3, 0], motor);
const marker = add(new THREE.TorusGeometry(1.6, 0.07, 10, 64), new THREE.MeshBasicMaterial({ color: 0x3f8cff, transparent: true, opacity: 0, depthWrite: false, fog: false }), SEA(0, 0.06, 0), [-Math.PI / 2, 0, 0], undefined, { cast: false, receive: false, nd: null });
function animSea(f) {
  const P = waterGeo.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = W0[i * 3], y = W0[i * 3 + 1];
    P.array[i * 3 + 2] = 0.07 * Math.sin(0.55 * x + f * 0.085) + 0.05 * Math.sin(0.8 * y - f * 0.06 + 1.3) + 0.03 * Math.sin(1.7 * (x + y) + f * 0.13);
  }
  P.needsUpdate = true; waterGeo.computeVertexNormals();
  FOAM.forEach((m, i) => { m.position.y = 0.04 + 0.04 * Math.sin(f * 0.08 + i); m.position.x += 0; });
}
let boatStill = 0;
function animBoat(f) {
  const k = 1 - 0.4 * boatStill;
  boat.position.y = 0.035 * Math.sin(f * 0.09) * k;
  boat.rotation.z = 0.035 * Math.sin(f * 0.07) * k; boat.rotation.x = 0.02 * Math.sin(f * 0.055 + 1) * k;
}
const FLOOR = 0.16;

// ---------- set: angkasa ----------
const SP = (x, y, z) => [x, y, z - 300];
const space = group(SP(0, 0, 0));
const earthCv = document.createElement('canvas'); earthCv.width = 1024; earthCv.height = 512;
{
  const g = earthCv.getContext('2d'); g.fillStyle = '#2d7fd8'; g.fillRect(0, 0, 1024, 512);
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 1024, y = 110 + rnd() * 290, r = 30 + rnd() * 70;
    g.fillStyle = i % 5 === 0 ? '#e3cf8c' : '#4cb85a';
    g.beginPath(); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, rr = r * (0.7 + 0.5 * rnd()); g.lineTo(x + rr * Math.cos(a) * 1.4, y + rr * Math.sin(a)); } g.closePath(); g.fill();
  }
  g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, 1024, 38); g.fillRect(0, 474, 1024, 38);
}
const earthTex = new THREE.CanvasTexture(earthCv); earthTex.colorSpace = THREE.SRGBColorSpace;
const earth = add(new THREE.SphereGeometry(4, 64, 40), toon('#ffffff', earthTex), [0, 0, 0], [-0.6, 0, 0], space);
const atmo = add(new THREE.SphereGeometry(4.25, 48, 32), new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.BackSide }), [0, 0, 0], [0, 0, 0], space, { cast: false, receive: false, nd: null });
{
  const n = 700, pos = new Float32Array(n * 3); let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1), r = 120; pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false }));
  stars.userData.nd = null; space.add(stars);
}
const satBody = toon('#e8b84a'), satPanel = toon('#2f4fa8'), satWhite = toon('#f2f2f2');
function makeSat(parent, s = 1) {
  const g = group([0, 0, 0], parent); g.scale.setScalar(s);
  tbox(0.3, 0.3, 0.4, satBody, [0, 0, 0], g);
  for (const k of [-1, 1]) { tbox(0.55, 0.025, 0.28, satPanel, [k * 0.46, 0, 0], g); tbox(0.18, 0.03, 0.03, satWhite, [k * 0.2, 0, 0], g); }
  add(new THREE.ConeGeometry(0.1, 0.12, 14), satWhite, [0, -0.2, 0], [Math.PI, 0, 0], g);
  return g;
}
const R_ORB = 8.2, PLANES = [];
for (let i = 0; i < 6; i++) {
  const outer = group([0, 0, 0], space); outer.rotation.y = i * 60 * D2R;
  const inner = group([0, 0, 0], outer); inner.rotation.z = 55 * D2R;
  add(new THREE.TorusGeometry(R_ORB, 0.018, 6, 160), new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.35, depthWrite: false }), [0, 0, 0], [Math.PI / 2, 0, 0], inner, { cast: false, receive: false, nd: null });
  const sats = []; for (let k = 0; k < 5; k++) sats.push(makeSat(inner, 0.9));
  PLANES.push({ inner, sats, ph: i * 0.37 });
}
function animSats(f, speed = 1) {
  for (const P of PLANES) P.sats.forEach((s, k) => { const th = P.ph + k * Math.PI * 2 / 5 + f * 0.004 * speed; s.position.set(R_ORB * Math.cos(th), 0, R_ORB * Math.sin(th)); s.rotation.set(0, -th, 0); });
}
const bigSat = makeSat(space, 1.5); bigSat.position.set(0, 7.4, 3.2);
const ringMat = Array.from({ length: 5 }, () => new THREE.MeshBasicMaterial({ color: 0x7ff0ff, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
const RINGS = ringMat.map((m) => add(new THREE.TorusGeometry(1, 0.045, 8, 64), m, [0, 0, 0], [Math.PI / 2, 0, 0], space, { cast: false, receive: false, nd: null }));
const EARTH_TOP = new THREE.Vector3(0, 7.4, 3.2).normalize().multiplyScalar(4.02);
function emit(f, on = 1, rate = 0.022) {
  RINGS.forEach((r, i) => {
    const u = (f * rate + i / RINGS.length) % 1;
    r.position.set(0, lerp(7.1, EARTH_TOP.y, u), lerp(3.05, EARTH_TOP.z, u));
    r.scale.setScalar(lerp(0.35, 2.6, u)); ringMat[i].opacity = on * 0.85 * (1 - u) * Math.min(1, u * 8);
  });
}
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0, depthWrite: false, fog: false });
const distLine = (() => { const a = EARTH_TOP, b = new THREE.Vector3(0, 7.4, 3.2), d = b.clone().sub(a), m = add(new THREE.CylinderGeometry(0.035, 0.035, d.length(), 8), lineMat, [0, 0, 0], [0, 0, 0], space, { cast: false, receive: false, nd: null }); m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; })();

// papan kartu 2D
const VD = (x, y, z) => [x + 300, y, z];

// ---------- pemeran ----------
const C = {
  udin: new Card((p, s) => T.hoodie(p, { ...T.HOODIE.oranye, hat: 'cap', cap: '#2a4a7a', moustache: '#3a2418' }, s)),
  panel: new Card((p, s, g) => drawPanel(g, s), { shadow: false }),
  fx: Array.from({ length: 4 }, () => new Card((p, s, g) => drawFx(g, s), { shadow: false, res: 1 })),
};
for (const c of [C.panel, ...C.fx]) c.mesh.castShadow = false;

function txt(g, s, x, y, size, fill = '#ffffff', stroke = INK, lw = 14, align = 'center') {
  g.save(); g.font = `900 ${size}px "Inter", "Inter Black", Arial Black, sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); g.restore();
}
function pill(g, s, x, y, size, bg, fg = '#ffffff') {
  g.save(); g.font = `900 ${size}px "Inter", Arial Black, sans-serif`; const w = g.measureText(s).width + size * 0.9, h = size * 1.6;
  g.fillStyle = bg; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke(); g.restore();
  txt(g, s, x, y + 2, size, fg, fg === INK ? bg : INK, fg === INK ? 0 : 8);
}
const pop = (t) => backOut(clamp01(t * 4));
function satIcon(g, x, y, s = 1, col = '#e8b84a') {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 7; g.strokeStyle = INK;
  for (const k of [-1, 1]) { g.fillStyle = '#2f4fa8'; g.beginPath(); g.rect(k > 0 ? 26 : -86, -16, 60, 32); g.fill(); g.stroke(); g.strokeStyle = '#7fa0ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(k > 0 ? 56 : -56, -16); g.lineTo(k > 0 ? 56 : -56, 16); g.stroke(); g.strokeStyle = INK; g.lineWidth = 7; }
  g.fillStyle = col; g.beginPath(); g.roundRect(-26, -30, 52, 60, 8); g.fill(); g.stroke();
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(-16, 30); g.lineTo(16, 30); g.lineTo(0, 50); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
function phoneIcon(g, x, y, s = 1, scr = '#49a8ea') {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 8; g.strokeStyle = INK;
  g.fillStyle = '#1c2030'; g.beginPath(); g.roundRect(-42, -74, 84, 148, 16); g.fill(); g.stroke();
  g.fillStyle = scr; g.beginPath(); g.roundRect(-32, -60, 64, 120, 8); g.fill();
  g.fillStyle = '#1e6cff'; g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}
function cross(g, x, y, r, k = 1) {
  if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round';
  for (const [w, c] of [[30, INK], [18, '#ff4a3a']]) { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, r); g.moveTo(r, -r); g.lineTo(-r, r); g.stroke(); }
  g.restore();
}
function check(g, x, y, r, k = 1) {
  if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, c] of [[30, INK], [18, '#4ad66a']]) { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(-r, 0); g.lineTo(-r * 0.3, r * 0.7); g.lineTo(r, -r * 0.7); g.stroke(); }
  g.restore();
}
function clockFace(g, x, y, r, ang, ring = '#ffd84a', fill = '#ffffff') {
  g.save(); g.translate(x, y); g.lineWidth = 14; g.strokeStyle = INK; g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.lineWidth = 9; g.strokeStyle = ring; g.beginPath(); g.arc(0, 0, r - 12, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = INK; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = i % 3 ? 4 : 8; g.beginPath(); g.moveTo(Math.sin(a) * (r - 24), -Math.cos(a) * (r - 24)); g.lineTo(Math.sin(a) * (r - 34), -Math.cos(a) * (r - 34)); g.stroke(); }
  g.lineWidth = 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * 0.42); g.stroke();
  g.lineWidth = 7; g.strokeStyle = '#e2453c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(ang) * r * 0.68, -Math.cos(ang) * r * 0.68); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
  g.restore();
}
function board(g, x0 = 30, y0 = 70, x1 = 570, y1 = 720, col = '#1a3366') {
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 40); g.fill(); g.stroke();
}
function seaMap(g, x0, y0, x1, y1, wv) {
  g.fillStyle = '#3d9fe2'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3;
  for (let x = x0 + 40; x < x1; x += 60) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
  for (let y = y0 + 40; y < y1; y += 60) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  g.strokeStyle = '#8fd0f6'; g.lineWidth = 5; g.lineCap = 'round';
  for (let j = 0; j < 9; j++) for (let i = 0; i < 4; i++) {
    const x = x0 + 30 + ((i * 90 + j * 47 + wv * 40) % (x1 - x0 - 40)), y = y0 + 40 + j * 66;
    g.beginPath(); g.arc(x, y, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  }
}

// ---------- papan 2D besar ----------
function drawPanel(g, st) {
  const k = st.kind;
  if (k === 'phone') {
    const cx = 300, x0 = 140, x1 = 460, y0 = 80, y1 = 700, dy = 405;
    g.fillStyle = '#1c2030'; g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 48); g.fill(); g.stroke();
    g.save(); g.beginPath(); g.roundRect(x0 + 16, y0 + 16, x1 - x0 - 32, y1 - y0 - 32, 34); g.clip();
    seaMap(g, x0 + 16, y0 + 16, x1 - 16, y1 - 16, st.wv || 0);
    g.fillStyle = 'rgba(10,20,40,0.45)'; g.fillRect(x0 + 16, y0 + 16, x1 - x0 - 32, 52);
    txt(g, '12:00', x0 + 44, y0 + 43, 26, '#ffffff', INK, 0, 'left');
    for (let i = 0; i < 4; i++) { g.fillStyle = st.noSig ? 'rgba(255,255,255,0.35)' : '#ffffff'; g.fillRect(x1 - 104 + i * 15, y0 + 56 - 8 - i * 7, 10, 8 + i * 7); }
    if (st.noSig) cross(g, x1 - 80, y0 + 40, 13, pop(st.noSig));
    if (st.dot > 0) {
      const pu = st.pulse ?? 0;
      for (let i = 0; i < 2; i++) { const u = (pu + i * 0.5) % 1; g.strokeStyle = `rgba(30,108,255,${(0.8 * (1 - u)).toFixed(2)})`; g.lineWidth = 8; g.beginPath(); g.arc(cx, dy, 30 + 90 * u, 0, Math.PI * 2); g.stroke(); }
      const r = 30 * backOut(st.dot) * (st.blink ? 1 + 0.12 * st.blink : 1);
      g.fillStyle = 'rgba(30,108,255,0.25)'; g.beginPath(); g.arc(cx, dy, r * 1.9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e6cff'; g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.beginPath(); g.arc(cx, dy, r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
    g.fillStyle = '#05060b'; g.beginPath(); g.roundRect(cx - 44, y0 + 22, 88, 20, 10); g.fill();
    if (st.label) { g.save(); g.translate(cx, dy + 120); const s = pop(st.lt ?? 1); g.scale(s, s); pill(g, st.label, 0, 0, 40, st.lc || '#ffd84a', INK); g.restore(); }
    if (st.pulsa) { g.save(); g.translate(cx, y0 + 125); const s = pop(st.pulsa); g.scale(s, s); pill(g, 'PULSA Rp0', 0, 0, 34, '#ff5a4a'); g.restore(); }
    if (st.q) { txt(g, '?', 470, 160 - 20 * Math.sin(st.q * Math.PI), 150 * pop(st.q), '#ffd84a', INK, 16); }
  } else if (k === 'tri') {
    board(g, 30, 70, 570, 720, '#1a3366');
    g.save(); g.beginPath(); g.roundRect(44, 84, 512, 622, 30); g.clip(); seaMap(g, 44, 84, 556, 706, st.wv || 0);
    const P = [300, 430], S = [[120, 180], [490, 200], [150, 660]], cols = ['#ffd84a', '#ff7ab8', '#7af08a'];
    const R = S.map(([x, y]) => Math.hypot(x - P[0], y - P[1]));
    const cs = [st.c1, st.c2, st.c3];
    cs.forEach((c, i) => {
      if (!(c > 0)) return; const e = easeOut(c);
      g.fillStyle = cols[i] + '22'; if (e >= 1) { g.beginPath(); g.arc(S[i][0], S[i][1], R[i], 0, Math.PI * 2); g.fill(); }
      g.lineWidth = 16; g.strokeStyle = INK; g.beginPath(); g.arc(S[i][0], S[i][1], R[i], -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); g.stroke();
      g.lineWidth = 9; g.strokeStyle = cols[i]; g.stroke();
    });
    // dua kemungkinan (lingkaran 1 dan 2)
    if (st.c2 >= 1 && !(st.c3 >= 0.6)) {
      const [ax, ay] = S[0], [bx, by] = S[1], d = Math.hypot(bx - ax, by - ay), a = (R[0] ** 2 - R[1] ** 2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R[0] ** 2 - a * a));
      const mx = ax + a * (bx - ax) / d, my = ay + a * (by - ay) / d;
      for (const sg of [1, -1]) { const x = mx + sg * h * (by - ay) / d, y = my - sg * h * (bx - ax) / d; g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); g.stroke(); txt(g, '?', x, y - 46, 54, '#ffffff', INK, 9); }
    }
    if (st.dot > 0) {
      const r = 26 * backOut(st.dot);
      g.fillStyle = 'rgba(30,108,255,0.3)'; g.beginPath(); g.arc(P[0], P[1], r * 2.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e6cff'; g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.beginPath(); g.arc(P[0], P[1], r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
    S.forEach(([x, y], i) => { if (cs[i] > 0) satIcon(g, x, y, 0.62 * pop(cs[i] * 1.5), cols[i]); });
    const n = st.c3 > 0 ? 3 : st.c2 > 0 ? 2 : 1;
    pill(g, n + ' SATELIT', 300, 112, 40, cols[n - 1], INK);
  } else if (k === 'delay') {
    board(g, 30, 70, 570, 720, '#16244a');
    const y0 = 190, y1 = 600, u = st.u ?? 0;
    g.setLineDash([18, 16]); g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(300, y0 + 50); g.lineTo(300, y1 - 80); g.stroke(); g.setLineDash([]);
    satIcon(g, 300, y0, 1.0);
    phoneIcon(g, 300, y1, 0.9);
    if (u > 0 && u < 1) {
      const y = lerp(y0 + 50, y1 - 80, u);
      const gr = g.createLinearGradient(0, y - 120, 0, y); gr.addColorStop(0, 'rgba(127,240,255,0)'); gr.addColorStop(1, 'rgba(127,240,255,0.9)');
      g.fillStyle = gr; g.fillRect(290, y - 120, 20, 120);
      g.fillStyle = '#ffffff'; g.strokeStyle = '#7ff0ff'; g.lineWidth = 10; g.beginPath(); g.arc(300, y, 18, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    if (u >= 1) { g.strokeStyle = 'rgba(127,240,255,0.8)'; g.lineWidth = 8; const w = ((st.f || 0) % 20) / 20; g.beginPath(); g.arc(300, y1, 80 + 40 * w, 0, Math.PI * 2); g.stroke(); }
    if (st.l1 > 0) { g.save(); g.translate(300, 112); const s = pop(st.l1); g.scale(s, s); pill(g, 'SECEPAT CAHAYA', 0, 0, 38, '#7ff0ff', INK); g.restore(); }
    if (st.sw > 0) {
      const s = pop(st.sw); g.save(); g.translate(150, 420); g.scale(s, s);
      clockFace(g, 0, 0, 70, (st.f || 0) * 0.5, '#ffd84a'); g.restore();
      g.save(); g.translate(300, 690); g.scale(s, s); pill(g, '0,067 DETIK', 0, 0, 46, '#ffd84a', INK); g.restore();
    }
  } else if (k === 'clocks') {
    board(g, 30, 70, 570, 720, '#1a3366');
    const sec = st.sec || 0;
    satIcon(g, 300, 150, 0.72 * pop(st.s4 ?? 1), '#9fe0ff');
    if (st.s4 > 0) txt(g, 'SATELIT KE-4', 300, 228, 34, '#9fe0ff', INK, 8);
    if (st.beam > 0 && st.beam < 1) { g.setLineDash([14, 12]); g.lineDashOffset = -(st.f || 0) * 3; g.lineWidth = 8; g.strokeStyle = '#7ff0ff'; g.beginPath(); g.moveTo(330, 185); g.lineTo(lerp(330, 430, st.beam * 1.5 > 1 ? 1 : st.beam * 1.5), lerp(185, 330, st.beam * 1.5 > 1 ? 1 : st.beam * 1.5)); g.stroke(); g.setLineDash([]); }
    clockFace(g, 165, 420, 112, sec, '#ffd84a');
    clockFace(g, 435, 420, 112, sec + (st.off || 0), st.fix > 0 ? '#4ad66a' : '#ff7a5a');
    txt(g, 'JAM ATOM', 165, 575, 40, '#ffd84a', INK, 9);
    txt(g, 'JAM HP', 435, 575, 40, st.fix > 0 ? '#4ad66a' : '#ff7a5a', INK, 9);
    if (st.fix > 0) check(g, 435, 420, 48, pop(st.fix)); else if (st.wrong > 0) { g.save(); g.translate(435, 296); const s = pop(st.wrong); g.scale(s, s); pill(g, 'MELESET', 0, 0, 30, '#ff7a5a'); g.restore(); }
    if (st.pres > 0) { g.save(); g.translate(300, 660); const s = pop(st.pres); g.scale(s, s); pill(g, 'ATOM JAUH LEBIH PRESISI', 0, 0, 30, '#ffd84a', INK); g.restore(); }
  } else if (k === 'listen') {
    board(g, 30, 70, 570, 720, '#16244a');
    const sy = 175, py = 590;
    for (let i = 0; i < 4; i++) {
      const u = ((st.f || 0) * 0.025 + i / 4) % 1, r = 60 + 420 * u;
      g.strokeStyle = `rgba(127,240,255,${(0.9 * (1 - u)).toFixed(2)})`; g.lineWidth = 10; g.beginPath(); g.arc(300, sy, r, Math.PI * 0.28, Math.PI * 0.72); g.stroke();
    }
    satIcon(g, 300, sy, 0.95);
    phoneIcon(g, 300, py, 0.85);
    if (st.up > 0) {
      const e = easeOut(st.up), y = lerp(py - 80, 330, e);
      g.lineCap = 'round'; for (const [w, c] of [[26, INK], [14, '#ffffff']]) { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(420, py - 60); g.lineTo(420, y); g.moveTo(390, y + 34); g.lineTo(420, y); g.lineTo(450, y + 34); g.stroke(); }
      cross(g, 420, lerp(py - 60, y, 0.5), 44, pop(st.x || 0));
    }
    if (st.lab > 0) { g.save(); g.translate(300, 690); const s = pop(st.lab); g.scale(s, s); pill(g, 'HANYA MENERIMA', 0, 0, 42, '#7ff0ff', INK); g.restore(); }
  }
}

// ---------- kartu efek kecil ----------
function drawFx(g, { kind, t, s = '', c = '#ffd84a', icon = '' }) {
  const k = pop(t);
  if (kind === 'nope') {
    g.save(); g.translate(300, 500); g.scale(k, k);
    g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.arc(0, 0, 200, 0, Math.PI * 2); g.fill(); g.stroke();
    g.lineWidth = 10;
    if (icon === 'jalan') {
      g.fillStyle = '#5a6070'; g.beginPath(); g.moveTo(-50, -120); g.lineTo(50, -120); g.lineTo(120, 120); g.lineTo(-120, 120); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffd84a'; for (let i = 0; i < 3; i++) g.fillRect(-8, -100 + i * 78, 16, 44);
    } else if (icon === 'rambu') {
      g.fillStyle = '#8a8f9a'; g.fillRect(-12, -40, 24, 170); g.strokeRect(-12, -40, 24, 170);
      g.fillStyle = '#2fa85a'; g.beginPath(); g.moveTo(-110, -130); g.lineTo(80, -130); g.lineTo(130, -85); g.lineTo(80, -40); g.lineTo(-110, -40); g.closePath(); g.fill(); g.stroke();
    } else {
      g.fillStyle = '#2f73d0'; for (let i = 0; i < 4; i++) { const h = 50 + i * 45; g.fillRect(-110 + i * 58, 110 - h, 40, h); g.strokeRect(-110 + i * 58, 110 - h, 40, h); }
    }
    g.lineCap = 'round'; g.lineWidth = 30; g.strokeStyle = INK; g.beginPath(); g.arc(0, 0, 186, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-132, -132); g.lineTo(132, 132); g.stroke();
    g.lineWidth = 18; g.strokeStyle = '#ff4a3a'; g.beginPath(); g.arc(0, 0, 186, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-132, -132); g.lineTo(132, 132); g.stroke();
    g.restore();
  } else if (kind === 'question') {
    txt(g, '?', 300, 560 - 40 * Math.sin(t * Math.PI), 300 * k, '#ffd84a', INK, 18);
  } else if (kind === 'bang') {
    txt(g, '!', 300, 560, 320 * k, '#ff6a4a', INK, 18);
  } else if (kind === 'smoke') {
    for (let i = 0; i < 5; i++) {
      const u = clamp01(t * 1.4 - i * 0.12); if (u <= 0) continue;
      const x = 300 + Math.sin(i * 2.1) * 60 + u * 40, y = 760 - u * 520, r = 50 + 70 * u;
      g.fillStyle = `rgba(90,94,104,${(0.95 * (1 - u * 0.7)).toFixed(2)})`; g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  } else if (kind === 'label') {
    g.save(); g.translate(300, 500); g.scale(k, k); pill(g, s, 0, 0, 78, c, INK); g.restore();
  } else if (kind === 'bubble') {
    g.save(); g.translate(300, 480); g.scale(k, k);
    g.font = '900 76px "Inter", Arial Black, sans-serif'; const w = Math.max(380, g.measureText(s).width + 90);
    g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 14;
    g.beginPath(); g.roundRect(-w / 2, -95, w, 190, 60); g.moveTo(-40, 95); g.lineTo(-90, 200); g.lineTo(30, 95); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(-36, 80, 60, 24);
    txt(g, s, 0, 2, 76, c, INK, 10); g.restore();
  } else if (kind === 'atom') {
    g.save(); g.translate(300, 470); g.scale(k, k);
    clockFace(g, 0, 0, 170, t * 12, '#ffd84a');
    g.strokeStyle = '#7ff0ff'; g.lineWidth = 8;
    for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3 + t * 2); g.beginPath(); g.ellipse(0, 0, 240, 80, 0, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#7ff0ff'; g.beginPath(); g.arc(240 * Math.cos(t * 20 + i), 80 * Math.sin(t * 20 + i), 18, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.restore();
    if (k > 0.5) txt(g, 'JAM ATOM', 300, 790, 86, '#ffd84a', INK, 12);
  } else if (kind === 'formula') {
    g.save(); g.translate(300, 470); g.scale(k, k);
    g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.roundRect(-270, -190, 540, 380, 50); g.fill(); g.stroke();
    txt(g, 'JEDA WAKTU', 0, -110, 62, '#ff7a5a', INK, 8);
    txt(g, '× CAHAYA', 0, -20, 62, '#2f73d0', INK, 8);
    g.fillStyle = INK; g.fillRect(-210, 40, 420, 12);
    txt(g, '= JARAK', 0, 115, 78, '#2fa85a', INK, 8);
    g.restore();
  } else if (kind === 'sparkle') {
    const e = 1 - (1 - t) ** 3;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, r = 60 + 220 * e, x = 300 + r * Math.cos(a), y = 500 + r * Math.sin(a), z = (i % 2 ? 26 : 40) * (1 - t * 0.7);
      g.fillStyle = i % 2 ? '#fff7c2' : '#ffd84a'; g.strokeStyle = INK; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x, y - z); g.lineTo(x + z * 0.3, y - z * 0.3); g.lineTo(x + z, y); g.lineTo(x + z * 0.3, y + z * 0.3); g.lineTo(x, y + z); g.lineTo(x - z * 0.3, y + z * 0.3); g.lineTo(x - z, y); g.lineTo(x - z * 0.3, y - z * 0.3); g.closePath(); g.fill(); g.stroke();
    }
  } else if (kind === 'waves') {
    for (let i = 0; i < 4; i++) {
      const u = (t + i / 4) % 1, r = 60 + 300 * u, y = 150 + 420 * u;
      g.strokeStyle = `rgba(127,240,255,${(0.95 * Math.min(1, (1 - u) * 1.5)).toFixed(2)})`; g.lineWidth = 16; g.lineCap = 'round';
      g.beginPath(); g.arc(300, y - r * 0.2, r, Math.PI * 0.25, Math.PI * 0.75); g.stroke();
    }
  }
}
const fxAt = (i, kind, t, pos, s = 1, extra = {}) => { if (t < 0 || t > 1) return C.fx[i].hide(); C.fx[i].set({ kind, t: q(t, 60), ...extra }).place(pos[0], pos[1], pos[2], { s, blob: false }); };
// kartu HUD: posisi pecahan layar (fx,fy dari -1..1), ukuran = pecahan tinggi layar
const hud = (i, kind, t, fx, fy, size, extra = {}) => {
  if (t < 0 || t > 1) return C.fx[i].hide();
  camera.updateMatrixWorld(); const d = 1.2, hh = d * Math.tan(camera.fov * D2R / 2), hw = hh * W / H, s = size * 2 * hh / 2.25;
  const v = new THREE.Vector3(fx * hw, fy * hh - 1.11 * s, -d).applyMatrix4(camera.matrixWorld);
  C.fx[i].set({ kind, t: q(t, 60), ...extra }).place(v.x, v.y, v.z, { s, blob: false });
  C.fx[i].root.quaternion.copy(camera.quaternion);
};
const place = (card, pos, state, f, seed, extra = {}) => { const id = idle(f, seed); card.set({ seed, blink: blinkAt(f, seed), ...state }).place(pos[0], pos[1], pos[2], { bob: id.bob, tilt: id.tilt, ...extra }); };
const lit = (name, k = 0, other = null, focus = SEA(0, 1, 0)) => { applyLight(name, focus, k, other); for (const c of [C.panel, ...C.fx]) c.mat.color.set('#ffffff'); };
const udinAt = (f, state, z = 0.3, x = 0) => place(C.udin, [boat.position.x + x, boat.position.y + FLOOR, boat.position.z + z], { f, ...state }, f, 1, { blob: false });
const panelShot = (f, st, a, push = 0.3, dur = 120) => {
  setCam(camKeys([[a, { p: VD(0, 1.08, 3.35), t: VD(0, 1.08, 0), fov: 40 }], [a + dur, { p: VD(0, 1.08, 3.35 - push), t: VD(0, 1.08, 0), fov: 40 }]], f, 0.6));
  C.panel.set(st).place(...VD(0, 0, 0), { blob: false, yaw: 0 });
};
function resetWorld(f) {
  for (const c of Card.all) c.hide();
  showSets(); sea.visible = false; boat.visible = false; space.visible = false; marker.visible = false;
  look.cInf = 0; look.focus = 5; look.flash = 0; boatStill = 0;
  boat.position.set(...SEA(0, 0, 0));
  RINGS.forEach((r, i) => (ringMat[i].opacity = 0)); lineMat.opacity = 0;
}
const atSea = (f, name = 'laut', k = 0, other = null) => { sea.visible = boat.visible = true; animSea(f); animBoat(f); lit(name, k, other, SEA(0, 1, 0)); };
const inSpace = (f, speed = 1) => { space.visible = true; animSats(f, speed); earth.rotation.y = f * 0.0015; lit('angkasa', 0, null, SP(0, 0, 0)); };

// ---------- shot ----------
export const SHOTS = [
  // S1 laut lebar: tidak ada jalan, rambu, sinyal
  { a: 0, b: 143, fn(f) {
    atSea(f);
    setCam(camKeys([[0, { p: SEA(4.5, 3.4, 11), t: SEA(0, 1.8, 0), fov: 44 }], [143, { p: SEA(3.4, 2.8, 8.6), t: SEA(0, 1.8, 0), fov: 44 }]], f));
    udinAt(f, { expr: 'neutral', armR: 'hip', armL: 'hang' });
    const ic = [['jalan', 38, -1.9], ['rambu', 75, 0], ['sinyal', 107, 1.9]];
    ic.forEach(([icon, a, x], i) => { if (f >= a) fxAt(i, 'nope', clamp01((f - a) / 30) * 0.999, SEA(x, 2.3, -1.2), 0.85, { icon }); });
  } },
  // S2 tapi HP tetap tahu
  { a: 143, b: 228, fn(f) {
    lit('papan'); look.flash = 1 - prog(f, 143, 149);
    panelShot(f, { kind: 'phone', wv: q(f * 0.02, 20), noSig: 1, dot: q(prog(f, 152, 166), 30), pulse: q((f * 0.025) % 1, 30), label: f >= 186 ? 'KAMU DI SINI' : null, lt: q(prog(f, 186, 200), 30) }, 143, 0.35, 85);
  } },
  // S3 bagaimana caranya?
  { a: 228, b: 264, fn(f) {
    atSea(f); look.flash = 0.6 * (1 - prog(f, 228, 234));
    setCam(camKeys([[228, { p: SEA(0.9, 1.75, 3.4), t: SEA(0, 1.45, 0.3), fov: 40 }], [264, { p: SEA(0.8, 1.72, 3.0), t: SEA(0, 1.45, 0.3), fov: 40 }]], f));
    udinAt(f, { expr: 'nervous', armR: 'chin', armL: 'lift', propL: 'phone', headTilt: 8 });
    hud(0, 'question', prog(f, 230, 263), 0.5, 0.45, 0.3);
  } },
  // S4 Pak Udin, nelayan, hanyut setelah mesin mati
  { a: 264, b: 363, fn(f) {
    const dead = f >= 340; atSea(f); boatStill = smoother(prog(f, 340, 362));
    look.flash = 0.6 * (1 - prog(f, 264, 270));
    setCam(camKeys([[264, { p: SEA(4.2, 1.8, 2.4), t: SEA(0, 1.1, -0.4), fov: 42 }], [340, { p: SEA(3.7, 1.7, 2.0), t: SEA(0, 1.1, -0.5), fov: 42 }], [363, { p: SEA(3.4, 1.65, 1.8), t: SEA(0, 1.1, -0.5), fov: 40 }]], f), dead && f < 352 ? 0.8 : 0, f);
    udinAt(f, { expr: dead ? 'shock' : f < 300 ? 'grin' : 'smile', armR: dead ? 'shrug' : f < 300 ? 'wave' : 'hip', armL: dead ? 'shrug' : 'hang' }, 0.1);
    if (f < 330) hud(0, 'label', Math.min(0.999, (f - 266) / 64), 0, 0.65, 0.48, { s: 'PAK UDIN', c: '#ffd84a' });
    if (dead) fxAt(1, 'smoke', prog(f, 340, 363), SEA(0, 0.85, -1.75), 0.7);
    if (dead) fxAt(2, 'bang', prog(f, 342, 362), SEA(0.55, 2.0, 0.2), 0.26);
  } },
  // S5 sejauh mata memandang, hanya air
  { a: 363, b: 438, fn(f) {
    atSea(f); boatStill = 1; look.flash = 0.5 * (1 - prog(f, 363, 369));
    const a = lerp(-30, 60, smoother(prog(f, 363, 438))) * D2R, r = 7.5;
    setCam({ p: SEA(r * Math.sin(a), 2.4, r * Math.cos(a)), t: SEA(0, 1.3, 0), fov: 46 });
    udinAt(f, { expr: 'nervous', armR: 'shield', armL: 'hip' });
  } },
  // S6 ia membuka peta di HP
  { a: 438, b: 489, fn(f) {
    atSea(f); boatStill = 1; look.flash = 0.5 * (1 - prog(f, 438, 444));
    setCam(camKeys([[438, { p: SEA(0.55, 1.6, 2.7), t: SEA(0.1, 1.3, 0.3), fov: 40 }], [489, { p: SEA(0.45, 1.58, 2.4), t: SEA(0.1, 1.3, 0.3), fov: 40 }]], f));
    look.cInf = 6; look.focus = 1.8;
    udinAt(f, { expr: f < 462 ? 'neutral' : 'smile', armR: 'lift', propR: f < 452 ? 'phoneOff' : 'phone', armL: 'hang' });
  } },
  // S7 titik biru muncul di tengah lautan
  { a: 489, b: 570, fn(f) {
    lit('papan'); look.flash = 0.8 * (1 - prog(f, 489, 495));
    panelShot(f, { kind: 'phone', wv: q(f * 0.02, 20), noSig: 0, dot: q(prog(f, 493, 507), 30), pulse: q((f * 0.025) % 1, 30), label: f >= 530 ? 'TENGAH LAUT' : null, lt: q(prog(f, 530, 544), 30), lc: '#7ff0ff' }, 489, 0.7, 81);
  } },
  // S8a kamera naik ke langit
  { a: 570, b: 628, fn(f) {
    atSea(f); boatStill = 1;
    const k = easeIn(prog(f, 570, 628));
    setCam({ p: SEA(0.6, lerp(3.2, 30, k), lerp(4.5, 1.5, k)), t: SEA(0, lerp(1.2, 60, k), lerp(0.2, -6, k)), fov: 44 });
    udinAt(f, { expr: 'neutral', armR: 'pointUp', armL: 'hang', propL: 'phone' });
    look.flash = 0.9 * Math.max(0, (f - 620) / 8);
  } },
  // S8b angkasa: 20.000 km
  { a: 628, b: 681, fn(f) {
    inSpace(f); look.flash = 0.9 * (1 - prog(f, 628, 636));
    for (const P of PLANES) P.inner.visible = false;
    setCam(camKeys([[628, { p: SP(4.6, 6.3, 12.5), t: SP(0, 5.4, 2.2), fov: 44 }], [681, { p: SP(4.0, 6.0, 11.2), t: SP(0, 5.4, 2.2), fov: 44 }]], f));
    lineMat.opacity = smoother(prog(f, 636, 650));
    fxAt(0, 'label', f >= 640 ? Math.min(0.999, (f - 640) / 40) : -1, SP(0.4, 4.9, 3.6), 1.1, { s: '20.000 KM', c: '#ffd84a' });
  } },
  // S9 sekitar tiga puluh satelit, dua kali sehari
  { a: 681, b: 804, fn(f) {
    inSpace(f, f >= 771 ? 3.2 : 1); for (const P of PLANES) P.inner.visible = true; bigSat.visible = false;
    look.flash = 0.5 * (1 - prog(f, 681, 687));
    const a = lerp(20, 55, smoother(prog(f, 681, 804))) * D2R, r = lerp(27, 24, smoother(prog(f, 681, 804)));
    setCam({ p: SP(r * Math.sin(a), 6, r * Math.cos(a)), t: SP(0, 0.2, 0), fov: 44 });
    hud(0, 'label', f >= 690 && f < 760 ? Math.min(0.999, (f - 690) / 40) : -1, 0, 0.7, 0.42, { s: '±30 SATELIT', c: '#ffd84a' });
    hud(1, 'label', f >= 771 ? Math.min(0.999, (f - 771) / 33) : -1, 0, 0.7, 0.42, { s: '2× SEHARI', c: '#7ff0ff' });
  } },
  // S10 jam atom
  { a: 804, b: 864, fn(f) {
    inSpace(f); for (const P of PLANES) P.inner.visible = false; bigSat.visible = true;
    look.flash = 0.6 * (1 - prog(f, 804, 810));
    setCam(camKeys([[804, { p: SP(0.6, 7.9, 8.6), t: SP(0, 7.7, 3.2), fov: 42 }], [864, { p: SP(0.5, 7.9, 8.0), t: SP(0, 7.7, 3.2), fov: 42 }]], f));
    bigSat.rotation.y = f * 0.004;
    fxAt(0, 'atom', f >= 810 ? Math.min(0.999, (f - 810) / 54) : -1, SP(0, 8.0, 3.7), 0.75);
  } },
  // S11 berteriak ke bumi: aku di sini, jam sekian
  { a: 864, b: 983, fn(f) {
    inSpace(f); for (const P of PLANES) P.inner.visible = false; bigSat.visible = true; bigSat.rotation.y = 0;
    look.flash = 0.5 * (1 - prog(f, 864, 870));
    setCam(camKeys([[864, { p: SP(6.5, 7.2, 11.5), t: SP(0, 5.6, 2.6), fov: 44 }], [983, { p: SP(5.6, 6.9, 10.4), t: SP(0, 5.6, 2.6), fov: 44 }]], f));
    emit(f, smoother(prog(f, 868, 880)));
    hud(0, 'bubble', f >= 918 && f < 944 ? Math.min(0.999, (f - 918) / 26) : -1, -0.25, 0.75, 0.5, { s: 'AKU DI SINI!', c: '#2f73d0' });
    hud(1, 'bubble', f >= 944 ? Math.min(0.999, (f - 944) / 39) : -1, -0.25, 0.75, 0.5, { s: 'JAM 12:00:00', c: '#e2453c' });
  } },
  // S12 secepat cahaya, tetap terlambat
  { a: 983, b: 1112, fn(f) {
    lit('papan'); look.flash = 0.8 * (1 - prog(f, 983, 989));
    const u = f < 1000 ? 0 : clamp01((f - 1000) / 36);
    panelShot(f, { kind: 'delay', u: q(u, 60), f: f >= 1036 ? f : 0, l1: q(prog(f, 986, 1000), 30), sw: q(prog(f, 1046, 1060), 30) }, 983, 0.3, 129);
  } },
  // S13 HP menghitung jarak
  { a: 1112, b: 1199, fn(f) {
    atSea(f); boatStill = 1; look.flash = 0.6 * (1 - prog(f, 1112, 1118));
    setCam(camKeys([[1112, { p: SEA(0.3, 1.8, 3.8), t: SEA(0.15, 1.4, 0.3), fov: 40 }], [1199, { p: SEA(0.3, 1.75, 3.4), t: SEA(0.15, 1.4, 0.3), fov: 40 }]], f));
    udinAt(f, { expr: f < 1153 ? 'neutral' : 'grin', armR: 'chin', armL: 'lift', propL: 'phone' }, 0.3, -0.25);
    hud(0, 'formula', f >= 1153 ? Math.min(0.999, (f - 1153) / 46) : -1, 0.42, 0.5, 0.34);
  } },
  // S14 tiga lingkaran
  { a: 1199, b: 1402, fn(f) {
    lit('papan'); look.flash = 0.8 * (1 - prog(f, 1199, 1205));
    panelShot(f, { kind: 'tri', wv: q(f * 0.01, 10), c1: q(prog(f, 1202, 1232), 30), c2: f >= 1276 ? q(prog(f, 1276, 1300), 30) : 0, c3: f >= 1341 ? q(prog(f, 1341, 1362), 30) : 0, dot: q(prog(f, 1367, 1380), 30) }, 1199, 0.25, 203);
    if (f >= 1367) fxAt(0, 'sparkle', prog(f, 1367, 1396), VD(0, 0.55, 0.15), 0.45);
  } },
  // S15 itulah posisi Pak Udin
  { a: 1402, b: 1442, fn(f) {
    atSea(f); boatStill = 1; look.flash = 0.6 * (1 - prog(f, 1402, 1408));
    setCam(camKeys([[1402, { p: SEA(1.2, 7.5, 5.0), t: SEA(0, 0.6, 0), fov: 44 }], [1442, { p: SEA(1.0, 6.6, 4.4), t: SEA(0, 0.6, 0), fov: 44 }]], f));
    marker.visible = true; const m = backOut(prog(f, 1404, 1418)); marker.scale.setScalar(Math.max(0.01, m * (1 + 0.05 * Math.sin(f * 0.3)))); marker.material.opacity = 0.9 * clamp01(m);
    udinAt(f, { expr: 'grin', armR: 'thumb', armL: 'lift', propL: 'phone' });
  } },
  // S16 satelit keempat membetulkan jam HP
  { a: 1442, b: 1557, fn(f) {
    lit('papan'); look.flash = 0.8 * (1 - prog(f, 1442, 1448));
    const fixK = f >= 1492 ? 1 : 0, off = fixK ? 0 : 0.55 + 0.12 * Math.sin(f * 0.5);
    panelShot(f, { kind: 'clocks', sec: q(f * 0.035, 20), off: q(off, 20), s4: q(prog(f, 1444, 1458), 30), beam: f >= 1458 && f < 1494 ? q(prog(f, 1458, 1490), 30) : 0, f, wrong: q(prog(f, 1452, 1466), 30), fix: q(prog(f, 1492, 1506), 30), pres: q(prog(f, 1506, 1520), 30) }, 1442, 0.25, 115);
  } },
  // S17 pulsa habis, sinyal hilang
  { a: 1557, b: 1646, fn(f) {
    atSea(f, 'laut', smoother(prog(f, 1557, 1600)), 'senja'); boatStill = 1; look.flash = 0.6 * (1 - prog(f, 1557, 1563));
    setCam(camKeys([[1557, { p: SEA(0.7, 1.65, 3.1), t: SEA(0.05, 1.35, 0.3), fov: 40 }], [1646, { p: SEA(0.6, 1.62, 2.8), t: SEA(0.05, 1.35, 0.3), fov: 40 }]], f), f >= 1608 && f < 1616 ? 0.6 : 0, f);
    udinAt(f, { expr: f < 1606 ? 'nervous' : 'shock', armR: 'lift', propR: 'phone', armL: f < 1606 ? 'hang' : 'shrug' });
    hud(0, 'label', f >= 1560 ? Math.min(0.999, (f - 1560) / 86) : -1, -0.2, 0.7, 0.46, { s: 'PULSA Rp0', c: '#ff5a4a' });
    if (f >= 1608) hud(1, 'nope', Math.min(0.999, (f - 1608) / 38), -0.55, 0.35, 0.2, { icon: 'sinyal' });
  } },
  // S18 titik biru tetap berkedip
  { a: 1646, b: 1698, fn(f) {
    lit('papan'); look.flash = 0.7 * (1 - prog(f, 1646, 1652));
    const bl = 0.5 + 0.5 * Math.sin(f * 0.45);
    panelShot(f, { kind: 'phone', wv: q(f * 0.02, 20), noSig: 1, pulsa: 1, dot: 1, blink: q(bl, 10), pulse: q((f * 0.03) % 1, 30), label: f >= 1660 ? 'TETAP ADA!' : null, lt: q(prog(f, 1660, 1674), 30), lc: '#4ad66a' }, 1646, 0.9, 52);
    if (f >= 1662) fxAt(0, 'sparkle', prog(f, 1662, 1692), VD(0, 1.25, 0.2), 0.5);
  } },
  // S19 twist: HP tidak pernah bicara ke satelit
  { a: 1698, b: 1772, fn(f) {
    lit('papan'); look.flash = 1 - prog(f, 1698, 1706);
    panelShot(f, { kind: 'listen', f, up: f >= 1712 ? q(prog(f, 1712, 1726), 30) : 0, x: q(prog(f, 1728, 1740), 30), lab: q(prog(f, 1744, 1758), 30) }, 1698, 0.3, 74);
  } },
  // S20 ia hanya mendengarkan
  { a: 1772, b: TOTAL, fn(f) {
    atSea(f, 'senja'); boatStill = 1; look.flash = 0.7 * (1 - prog(f, 1772, 1778));
    setCam(camKeys([[1772, { p: SEA(0.45, 1.62, 2.6), t: SEA(0.1, 1.34, 0.3), fov: 40 }], [TOTAL, { p: SEA(0.4, 1.6, 2.35), t: SEA(0.1, 1.34, 0.3), fov: 40 }]], f));
    udinAt(f, { expr: 'smile_closed', armR: 'lift', propR: 'phone', armL: 'hang', headTilt: -6 });
    hud(0, 'waves', ((f - 1772) * 0.03) % 1, 0.35, 0.5, 0.42);
  } },
];

export function update(f) {
  resetWorld(f);
  const s = SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];
  s.fn(f);
}
