// ---------- "Kenapa mata loading saat gelap" (59,17 dtk, Indonesia) ----------
// Set baru di file ini: bioskop (CN), retina (RT), ruang kosong untuk kartu mata (VD).
import { THREE, scene, Card, applyLight, LIGHTS, setCam, camKeys, look, idle, blinkAt, prog, smoother, easeOut, backOut, lerp, clamp01, pointA, toon, basic, add, tbox, group } from './engine.js';
import * as T from './toon.js';
import { showSets } from './world.js';

export const TOTAL = 1775;
const D2R = Math.PI / 180;
const q = (x, n = 1) => Math.round(x * n) / n;
const INK = '#241726';

// ---------- cahaya ----------
const base = { fogN: 8, fogF: 45, az: -30, el: 45, gain: 1.0, lift: 0.0 };
LIGHTS.lobi = { ...base, sky: '#2a1a1e', fog: '#2a1a1e', sun: '#ffe6c8', sunI: 2.2, hs: '#ffe9d0', hg: '#7a5a50', hI: 1.4, tint: '#fff4e6', sat: 1.08, vig: 0.3 };
LIGHTS.gelap = { ...base, sky: '#05060b', fog: '#05060b', sun: '#3b4a78', sunI: 0.45, hs: '#2c3858', hg: '#0b0c14', hI: 0.55, tint: '#465070', sat: 0.75, vig: 0.62 };
LIGHTS.hitam = { ...base, sky: '#020205', fog: '#020205', sun: '#232c48', sunI: 0.25, hs: '#1a2036', hg: '#06070c', hI: 0.3, tint: '#2c3348', sat: 0.6, vig: 0.7 };
LIGHTS.samar = { ...base, sky: '#0c0e15', fog: '#0c0e15', sun: '#6c78a0', sunI: 1.1, hs: '#68729a', hg: '#1c1f2a', hI: 1.15, tint: '#8a92ae', sat: 0.45, vig: 0.5 };
LIGHTS.abu = { ...base, sky: '#17191e', fog: '#17191e', sun: '#a4abbc', sunI: 1.35, hs: '#98a0b2', hg: '#2a2c33', hI: 1.25, tint: '#b6bcc9', sat: 0.1, vig: 0.42 };
LIGHTS.retina = { ...base, fogN: 7, fogF: 22, sky: '#3a1422', fog: '#3a1422', sun: '#ffe6dc', sunI: 1.7, hs: '#ffc4cc', hg: '#5a2030', hI: 1.15, tint: '#ffffff', sat: 1.05, vig: 0.42 };
LIGHTS.kosong = { ...base, sky: '#0b0d18', fog: '#0b0d18', sun: '#ffffff', sunI: 1, hs: '#ffffff', hg: '#888888', hI: 1, tint: '#ffffff', sat: 1.0, vig: 0.45 };

// ---------- set: bioskop ----------
const CN = (x, y, z) => [x, y, z + 200];
const cinema = group(CN(0, 0, 0));
const seatMat = toon('#a32b3a'), wallMat = toon('#3a2a36'), floorMat = toon('#4a2230');
tbox(12, 0.1, 18, floorMat, [0, -0.05, -1], cinema);
tbox(0.3, 6, 18, wallMat, [-5.5, 3, -1], cinema); tbox(0.3, 6, 18, wallMat, [5.5, 3, -1], cinema);
tbox(12, 6, 0.3, wallMat, [0, 3, 7.5], cinema);
add(new THREE.BoxGeometry(12, 0.2, 18), wallMat, [0, 5.6, -1], [0, 0, 0], cinema, { cast: false });
const screenMat = basic('#22305a', { fog: false });
add(new THREE.PlaneGeometry(9, 4.2), screenMat, [0, 3.0, -8.3], [0, 0, 0], cinema, { cast: false, receive: false });
tbox(9.6, 4.8, 0.2, toon('#120c12'), [0, 3.0, -8.45], cinema);
const ROWS = [-4.2, -3.0, 0.6, 1.8, 3.0];
const SEATX = [-3.2, -2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4, 3.2];
for (const z of ROWS) for (const x of SEATX) {
  tbox(0.62, 0.14, 0.5, seatMat, [x, 0.42, z], cinema);
  tbox(0.64, 0.66, 0.1, seatMat, [x, 0.72, z + 0.27], cinema);
  tbox(0.08, 0.35, 0.5, toon('#2a1a22'), [x + 0.35, 0.3, z], cinema);
}
const stepMat = basic('#ffcf6a', { fog: false });
for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.08, 0.03, 0.08), stepMat, [4.3, 0.02, -4.5 + i * 1.1], [0, 0, 0], cinema, { cast: false, nd: null });
// HP tetangga
const phone = group(CN(0.86, 0.6, 0.2)); phone.scale.setScalar(1.6);
tbox(0.09, 0.16, 0.015, toon('#18181e'), [0, 0, 0], phone);
const phoneScr = basic('#101018', { fog: false });
add(new THREE.PlaneGeometry(0.075, 0.14), phoneScr, [0, 0, -0.009], [0, Math.PI, 0], phone, { cast: false, nd: null });
phone.rotation.x = -0.35;

// ---------- set: retina ----------
const RTo = [-200, 0, 0];
const RT = (x, y, z) => [x - 200, y, z];
const retina = group(RTo);
add(new THREE.PlaneGeometry(14, 14), toon('#c95a6c'), [0, 0, -1], [-Math.PI / 2, 0, 0], retina, { cast: false });
add(new THREE.PlaneGeometry(14, 6), toon('#8a2f45'), [0, 3, -5], [0, 0, 0], retina, { cast: false });
const coneCols = ['#e8463f', '#2fbf5f', '#2f6ff0'];
const coneMats = coneCols.map((c) => new THREE.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0 }));
const rodMat = new THREE.MeshToonMaterial({ color: '#9aa0bc', emissive: '#b44ae0', emissiveIntensity: 0 });
const eyeMat = basic('#120a12'), orbMat = basic('#b44ae0', { fog: false });
const CELLS = [], ORBS = [];
let ci = 0;
for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) {
  const x = -2.2 + i * 0.4 + (j % 2) * 0.2, z = -2.4 + j * 0.4;
  const cone = (i + 2 * j) % 4 === 0;
  const g = group([x, 0, z], retina);
  if (cone) {
    add(new THREE.ConeGeometry(0.16, 0.5, 18), coneMats[ci++ % 3], [0, 0.25, 0], [0, 0, 0], g);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.022, 8, 6), eyeMat, [s * 0.035, 0.22, 0.095], [0, 0, 0], g, { cast: false, nd: null });
  } else {
    add(new THREE.CylinderGeometry(0.065, 0.07, 0.86, 14), rodMat, [0, 0.43, 0], [0, 0, 0], g);
    add(new THREE.SphereGeometry(0.065, 12, 8), rodMat, [0, 0.86, 0], [0, 0, 0], g);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.017, 8, 6), eyeMat, [s * 0.028, 0.66, 0.064], [0, 0, 0], g, { cast: false, nd: null });
    const orb = add(new THREE.SphereGeometry(0.06, 12, 8), orbMat, [0, 1.02, 0], [0, 0, 0], g, { cast: false });
    ORBS.push(orb);
  }
  CELLS.push({ g, cone, d: Math.hypot(x, z - 0.2), k: (i * 7 + j * 13) % 17 });
}
const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const beam = add(new THREE.CylinderGeometry(0.3, 1.1, 6, 32, 1, true), beamMat, [0, 3, -1.4], [0, 0, 0], retina, { cast: false, receive: false, nd: null });

// ruang kosong untuk kartu mata
const VD = (x, y, z) => [x, y, z - 200];

// ---------- pemeran ----------
const hood = (o) => new Card((p, s) => T.hoodie(p, o, s));
const C = {
  hero: hood({ ...T.HOODIE.biru }),
  tetangga: hood({ ...T.HOODIE.oranye }),
  aud: [hood({ ...T.HOODIE.hijau }), hood({ ...T.HOODIE.ungu }), hood({ ...T.HOODIE.kuning }), hood({ ...T.HOODIE.merah }), hood({ ...T.HOODIE.hijau, build: 'kid' })],
  eye: new Card((p, s, g) => drawEye(g, s), { shadow: false }),
  fx: Array.from({ length: 3 }, () => new Card((p, s, g) => drawFx(g, s), { shadow: false, res: 1 })),
};
for (const c of [C.eye, ...C.fx]) c.mesh.castShadow = false;

function txt(g, s, x, y, size, fill = '#ffffff', stroke = INK, lw = 14) {
  g.save(); g.font = `900 ${size}px "Inter", "Inter Black", Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); g.restore();
}
function drawEye(g, { pupil = 0.2, pct = null, spin = 0, rays = -1, glow = 0, label = null, labelCol = '#ffffff' }) {
  const cx = 300, cy = 470;
  if (glow > 0) { const gr = g.createRadialGradient(cx, cy, 60, cx, cy, 300); gr.addColorStop(0, `rgba(190,120,255,${0.55 * glow})`); gr.addColorStop(1, 'rgba(190,120,255,0)'); g.fillStyle = gr; g.fillRect(0, 150, 600, 640); }
  if (pct !== null) {
    g.lineCap = 'round';
    g.lineWidth = 26; g.strokeStyle = INK; g.beginPath(); g.arc(cx, cy, 262, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 14; g.strokeStyle = '#3a3f55'; g.beginPath(); g.arc(cx, cy, 262, 0, Math.PI * 2); g.stroke();
    if (pct > 0.003) { g.lineWidth = 16; g.strokeStyle = '#ffd84a'; g.beginPath(); g.arc(cx, cy, 262, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); g.stroke(); }
    if (spin >= 0 && pct < 0.99) { const a = spin * Math.PI * 2; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + 262 * Math.cos(a), cy + 262 * Math.sin(a), 13, 0, Math.PI * 2); g.fill(); }
  }
  const shape = () => { g.beginPath(); g.moveTo(cx - 225, cy); g.quadraticCurveTo(cx, cy - 250, cx + 225, cy); g.quadraticCurveTo(cx, cy + 250, cx - 225, cy); g.closePath(); };
  shape(); g.fillStyle = '#fbf7f0'; g.fill();
  g.save(); shape(); g.clip();
  g.fillStyle = '#2f73d0'; g.beginPath(); g.arc(cx, cy, 108, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1d4c94'; g.lineWidth = 10; g.stroke();
  for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; g.strokeStyle = '#5b97e6'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 52 * Math.cos(a), cy + 52 * Math.sin(a)); g.lineTo(cx + 96 * Math.cos(a), cy + 96 * Math.sin(a)); g.stroke(); }
  g.fillStyle = '#0d0a12'; g.beginPath(); g.arc(cx, cy, lerp(30, 92, pupil), 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + 38, cy - 40, 20, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx - 30, cy + 34, 9, 0, Math.PI * 2); g.fill();
  g.restore();
  shape(); g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  if (rays >= 0 && rays <= 1) {
    for (let i = 0; i < 5; i++) {
      const u = clamp01(rays * 1.6 - i * 0.12); if (u <= 0) continue;
      const x0 = 40 + i * 30, y0 = 120 + i * 18, x1 = lerp(x0, cx - 10 + i * 5, u), y1 = lerp(y0, cy - 8 + i * 4, u);
      g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = '#ffe36a'; g.lineWidth = 8; g.stroke();
    }
  }
  if (label) txt(g, label, cx, 120, 78, labelCol);
}
function drawFx(g, { kind, t, s = '' }) {
  if (kind === 'sparkle') {
    const e = 1 - (1 - t) ** 3;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, r = 60 + 220 * e, x = 300 + r * Math.cos(a), y = 500 + r * Math.sin(a), z = (i % 2 ? 26 : 40) * (1 - t * 0.7);
      g.fillStyle = i % 2 ? '#fff7c2' : '#ffd84a'; g.strokeStyle = INK; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x, y - z); g.lineTo(x + z * 0.3, y - z * 0.3); g.lineTo(x + z, y); g.lineTo(x + z * 0.3, y + z * 0.3); g.lineTo(x, y + z); g.lineTo(x - z * 0.3, y + z * 0.3); g.lineTo(x - z, y); g.lineTo(x - z * 0.3, y - z * 0.3); g.closePath(); g.fill(); g.stroke();
    }
  } else if (kind === 'question') {
    txt(g, '?', 300, 560 - 40 * Math.sin(t * Math.PI), 300, '#ffd84a', INK, 18);
  } else if (kind === 'bang') {
    txt(g, '!', 300, 560, 320, '#ff6a4a', INK, 18);
  } else if (kind === 'zzz') {
    for (let i = 0; i < 3; i++) { const u = (t * 1.5 + i * 0.33) % 1; txt(g, 'z', 220 + i * 70 + 30 * u, 700 - 380 * u - i * 40, 90 + i * 30, `rgba(255,255,255,${(1 - u).toFixed(2)})`, INK, 10); }
  } else if (kind === 'clock') {
    const k = backOut(clamp01(t * 4));
    g.save(); g.translate(300, 470); g.scale(k, k);
    g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.arc(0, -40, 150, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(0, -40); g.arc(0, -40, 128, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(t * 1.3)); g.closePath(); g.fill();
    g.lineCap = 'round'; g.lineWidth = 14; g.beginPath(); g.moveTo(0, -40); g.lineTo(0, -140); g.stroke();
    g.restore();
    if (k > 0.5) txt(g, s, 300, 740, 92, '#ffd84a');
  } else if (kind === 'label') {
    const k = backOut(clamp01(t * 4));
    g.save(); g.translate(300, 500); g.scale(k, k);
    g.font = '900 86px "Inter", Arial Black, sans-serif'; const w = g.measureText(s).width + 70;
    g.fillStyle = '#b44ae0'; g.strokeStyle = INK; g.lineWidth = 12;
    g.beginPath(); g.roundRect(-w / 2, -70, w, 140, 40); g.fill(); g.stroke();
    g.restore();
    if (k > 0.3) { g.save(); g.translate(300, 500); g.scale(k, k); txt(g, s, 0, 4, 86, '#ffffff', INK, 10); g.restore(); }
  } else if (kind === 'vitA') {
    g.fillStyle = '#f39a2a'; g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.arc(300, 500, 170, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ffd08a'; g.beginPath(); g.arc(250, 440, 45, 0, Math.PI * 2); g.fill();
    txt(g, 'A', 300, 515, 210, '#ffffff', INK, 16);
    txt(g, 'VITAMIN', 300, 760, 74, '#ffd84a');
  }
}
const fxAt = (i, kind, t, pos, s = 1, extra = {}) => { if (t < 0 || t > 1) return C.fx[i].hide(); C.fx[i].set({ kind, t: q(t, 30), ...extra }).place(pos[0], pos[1], pos[2], { s, blob: false }); };
const place = (card, pos, state, f, seed, extra = {}) => { const id = idle(f, seed); card.set({ seed, blink: blinkAt(f, seed), ...state }).place(pos[0], pos[1], pos[2], { bob: id.bob, tilt: id.tilt, ...extra }); };
const walkPhase = (f, speed = 0.045) => (f * speed) % 1;
const SEAT_Z = 0.34;   // kartu duduk di depan bantalan kursi baris z = 0,6
const lit = (name, k = 0, other = null, focus = CN(0, 1, 0)) => {
  applyLight(name, focus, k, other);
  const sc = { lobi: '#c8d4ee', gelap: '#22305a', hitam: '#141c38', samar: '#3a4a70', abu: '#9aa0b0' };
  screenMat.color.set(other && k > 0.5 ? sc[other] || '#22305a' : sc[name] || '#22305a');
  for (const c of [C.eye, ...C.fx]) c.mat.color.set('#ffffff');
};

// penonton duduk (baris 0,6 dan belakang)
const AUD = [[-1.6, 0.6], [-0.8, 0.6], [2.4, 0.6], [-2.4, 1.8], [0.8, 1.8]];
function audience(f, exprs = {}) {
  AUD.forEach(([x, z], i) => place(C.aud[i], CN(x, 0, z - 0.26), { mode: 'sit', expr: exprs[i] || (i % 2 ? 'smile' : 'neutral'), f }, f, 30 + i));
}
function cellsRise(f, a, b) {
  for (const c of CELLS) { const k = backOut(prog(f, a + c.d * 7, b + c.d * 7)); c.g.scale.set(1, Math.max(0.001, k), 1); }
}
function resetWorld(f) {
  for (const c of Card.all) c.hide();
  showSets(); cinema.visible = false; retina.visible = false;
  look.cInf = 0; look.focus = 5; look.flash = 0;
  pointA.intensity = 0;
  for (const c of CELLS) { c.g.scale.set(1, 1, 1); c.g.rotation.set(0, 0, 0); }
  for (const o of ORBS) { o.visible = true; o.scale.setScalar(1); }
  orbMat.color.set('#b44ae0');
  coneMats.forEach((m) => (m.emissiveIntensity = 0)); rodMat.emissiveIntensity = 0;
  beamMat.opacity = 0; phone.visible = false; phoneScr.color.set('#101018');
}
const eyeShot = (f, st, a, push = 0.25) => {
  const k = smoother(prog(f, a, a + 90));
  setCam(camKeys([[a, { p: VD(0, 1.08, 3.35), t: VD(0, 1.08, 0), fov: 40 }], [a + 120, { p: VD(0, 1.08, 3.35 - push), t: VD(0, 1.08, 0), fov: 40 }]], f, 0.6));
  C.eye.set(st).place(...VD(0, 0, 0), { blob: false, yaw: 0 });
  return k;
};

// ---------- shot ----------
export const SHOTS = [
  // S1a lampu masih menyala -> gelap
  { a: 0, b: 66, fn(f) {
    cinema.visible = true;
    const k = smoother(prog(f, 34, 60));
    lit('lobi', k, 'gelap', CN(2.5, 1, 2.5));
    setCam(camKeys([[0, { p: CN(3.9, 1.5, 5.9), t: CN(4.25, 1.15, 2.4), fov: 42 }], [66, { p: CN(4.0, 1.45, 5.2), t: CN(4.25, 1.15, 2.4), fov: 40 }]], f));
    place(C.hero, CN(4.3, 0, 2.4), { expr: f < 46 ? 'smile' : 'shock', armR: f < 46 ? 'wave' : 'shrug', armL: f < 46 ? 'hang' : 'shrug', f }, f, 1);
    audience(f);
  } },
  // S1b mata "loading"
  { a: 66, b: 158, fn(f) {
    lit('kosong'); look.flash = 1 - prog(f, 66, 72);
    eyeShot(f, { pupil: 0.1, pct: q(0.02 + 0.13 * prog(f, 70, 150), 100), spin: q((f * 0.02) % 1, 50), label: 'MEMUAT...' }, 66);
  } },
  // S2a bioskop gelap, lebar
  { a: 158, b: 240, fn(f) {
    cinema.visible = true;
    lit('gelap', smoother(prog(f, 205, 225)), 'hitam', CN(0, 1, -1));
    look.flash = 1 - prog(f, 158, 164);
    setCam(camKeys([[158, { p: CN(0.2, 3.4, 6.6), t: CN(0, 1.1, -2.2), fov: 46 }], [240, { p: CN(0.2, 2.9, 5.6), t: CN(0, 1.0, -2.2), fov: 46 }]], f));
    audience(f);
    place(C.hero, CN(4.3, 0, lerp(4.2, 2.6, prog(f, 158, 240))), { expr: 'nervous', armR: 'reach', armL: 'reach', mode: 'walk', phase: walkPhase(f), f }, f, 1);
  } },
  // S2b meraba-raba, menginjak kaki
  { a: 240, b: 335, fn(f) {
    cinema.visible = true;
    lit('hitam', smoother(prog(f, 240, 260)) * 0.6, 'gelap', CN(1.5, 1, 0.3));
    const w = smoother(prog(f, 244, 300)), x = lerp(3.0, 1.12, w);
    const hit = f >= 304;
    setCam(camKeys([[240, { p: CN(2.3, 1.25, -3.3), t: CN(2.2, 0.9, 0.3), fov: 42 }], [300, { p: CN(1.25, 1.2, -3.1), t: CN(1.1, 0.85, 0.3), fov: 42 }], [335, { p: CN(1.1, 1.2, -2.8), t: CN(0.95, 0.85, 0.3), fov: 42 }]], f), hit ? Math.max(0, 1 - (f - 304) / 8) : 0, f);
    place(C.hero, CN(x, 0, 0.0), { expr: hit ? 'shock' : 'nervous', armR: hit ? 'shrug' : 'reach', armL: hit ? 'shrug' : 'reach', mode: w > 0 && w < 1 ? 'walk' : 'stand', phase: walkPhase(f), f }, f, 1);
    place(C.tetangga, CN(0.8, 0, SEAT_Z), { mode: 'sit', expr: hit ? 'pained' : 'neutral', armR: hit ? 'up' : 'hang', armL: hit ? 'up' : 'hang', f }, f, 2);
    place(C.aud[1], CN(-0.8, 0, SEAT_Z), { mode: 'sit', expr: 'neutral', f }, f, 31);
    place(C.aud[2], CN(2.4, 0, SEAT_Z), { mode: 'sit', expr: f > 250 && f < 290 ? 'stern' : 'neutral', f }, f, 32);
    if (hit) fxAt(0, 'bang', prog(f, 305, 334), CN(0.62, 1.15, 0.2), 0.3);
  } },
  // S3a pupil melebar, cahaya masuk
  { a: 335, b: 470, fn(f) {
    lit('kosong'); look.flash = 0.8 * (1 - prog(f, 335, 341));
    const pu = backOut(prog(f, 372, 400));
    eyeShot(f, { pupil: q(0.1 + 0.9 * pu - (f > 440 ? 0.04 * Math.sin((f - 440) * 0.35) : 0), 50), rays: f > 404 ? q(f < 452 ? prog(f, 404, 452) : 0.75 + 0.25 * Math.sin((f - 452) * 0.4), 30) : -1 }, 335, 0.35);
  } },
  // S3b ... tapi belum cukup
  { a: 470, b: 524, fn(f) {
    cinema.visible = true; lit('gelap', 0, null, CN(1.1, 1, 0));
    setCam(camKeys([[470, { p: CN(1.1, 1.35, -1.9), t: CN(1.1, 1.2, 0.05), fov: 40 }], [524, { p: CN(1.1, 1.35, -1.7), t: CN(1.1, 1.22, 0.05), fov: 40 }]], f));
    look.cInf = 8; look.focus = 1.2;
    place(C.hero, CN(1.12, 0, 0.0), { expr: 'nervous', armR: 'chin', armL: 'hang', headTilt: 6, f }, f, 1);
    fxAt(0, 'question', prog(f, 476, 522), CN(0.78, 1.5, 0.1), 0.2);
  } },
  // S4 retina: dua pasukan sel
  { a: 524, b: 700, fn(f) {
    retina.visible = true; lit('retina', 0, null, RT(0, 0, 0));
    look.flash = 1 - prog(f, 524, 530);
    cellsRise(f, 552, 580);
    setCam(camKeys([[524, { p: RT(0, 4.2, 4.2), t: RT(0, 0.2, -1.0), fov: 44 }], [600, { p: RT(0, 1.9, 3.4), t: RT(0, 0.5, -0.6), fov: 42 }],
      [640, { p: RT(-0.55, 0.75, 1.75), t: RT(-0.6, 0.3, 0.4), fov: 38 }], [670, { p: RT(0.35, 1.05, 2.0), t: RT(0.3, 0.65, 0.4), fov: 38 }], [700, { p: RT(0.4, 1.05, 1.85), t: RT(0.3, 0.68, 0.4), fov: 38 }]], f));
    look.cInf = f > 610 ? 8 : 0; look.focus = 1.6;
    const cg = Math.max(0, Math.sin(Math.PI * prog(f, 604, 656)));
    coneMats.forEach((m) => (m.emissiveIntensity = 0.7 * cg));
    rodMat.emissiveIntensity = 0.35 * Math.max(0, Math.sin(Math.PI * prog(f, 652, 700)));
    for (const o of ORBS) o.scale.setScalar(Math.max(0.001, backOut(prog(f, 655, 672))));
  } },
  // S5 cahaya terang memudarkan rodopsin -> sel batang lemas
  { a: 700, b: 935, fn(f) {
    retina.visible = true; lit('retina', 0, null, RT(0, 0, 0));
    setCam(camKeys([[700, { p: RT(0.3, 2.2, 3.4), t: RT(0.1, 0.7, -0.4), fov: 42 }], [770, { p: RT(0.2, 1.7, 2.9), t: RT(0.1, 0.7, -0.3), fov: 42 }],
      [850, { p: RT(0.35, 1.15, 1.8), t: RT(0.3, 0.75, 0.3), fov: 38 }], [935, { p: RT(0.35, 1.1, 1.6), t: RT(0.3, 0.6, 0.3), fov: 38 }]], f));
    const bm = prog(f, 742, 756) * (1 - prog(f, 830, 860));
    beamMat.opacity = 0.14 * bm; look.flash = 0.35 * Math.max(0, 1 - Math.abs(f - 750) / 10);
    const fade = smoother(prog(f, 770, 830));
    orbMat.color.set('#' + new THREE.Color('#b44ae0').lerp(new THREE.Color('#8a8496'), fade).getHexString());
    ORBS.forEach((o, i) => o.scale.setScalar(Math.max(0.001, 1 - smoother(prog(f, 790 + (i % 9) * 4, 830 + (i % 9) * 4)))));
    const droop = smoother(prog(f, 885, 925));
    for (const c of CELLS) if (!c.cone) { c.g.rotation.z = droop * (0.35 + 0.02 * c.k) * (c.k % 2 ? 1 : -1); c.g.rotation.x = droop * 0.12; }
    look.cInf = f > 840 ? 8 : 0; look.focus = 1.6;
    fxAt(0, 'label', prog(f, 800, 868), RT(0.3, 1.25, 0.6), 0.28, { s: 'RODOPSIN' });
    fxAt(1, 'zzz', f > 900 ? ((f - 900) % 60) / 60 : -1, RT(0.65, 0.9, 0.5), 0.3);
  } },
  // S6 rodopsin dibuat ulang, vitamin A
  { a: 935, b: 1090, fn(f) {
    retina.visible = true; lit('retina', 0, null, RT(0, 0, 0));
    setCam(camKeys([[935, { p: RT(0.35, 1.1, 1.6), t: RT(0.3, 0.6, 0.3), fov: 38 }], [1020, { p: RT(0.1, 1.6, 2.6), t: RT(0.1, 0.65, -0.1), fov: 42 }], [1090, { p: RT(0.0, 1.7, 2.8), t: RT(0.1, 0.65, -0.2), fov: 42 }]], f));
    const up = smoother(prog(f, 950, 1080));
    for (const c of CELLS) if (!c.cone) { const d = 1 - up; c.g.rotation.z = d * (0.35 + 0.02 * c.k) * (c.k % 2 ? 1 : -1); c.g.rotation.x = d * 0.12; }
    ORBS.forEach((o, i) => { const a = 945 + ((i * 37) % 70) * 1.6; o.scale.setScalar(Math.max(0.001, backOut(prog(f, a, a + 10)))); });
    look.cInf = f < 990 ? 8 : 0; look.focus = 1.6;
    const vd = prog(f, 1046, 1066), vy = lerp(2.4, 0.95, easeOut(vd)) + 0.08 * Math.sin(prog(f, 1066, 1090) * Math.PI);
    if (f >= 1046) fxAt(0, 'vitA', clamp01((f - 1046) / 44), RT(-0.55, vy, 0.6), 0.32);
    if (f >= 1066) fxAt(1, 'sparkle', prog(f, 1066, 1089), RT(-0.55, 0.9, 0.62), 0.4);
  } },
  // S7a lima menit: sel kerucut bekerja duluan
  { a: 1090, b: 1178, fn(f) {
    retina.visible = true; lit('retina', 0, null, RT(0, 0, 0));
    look.flash = 0.8 * (1 - prog(f, 1090, 1096));
    setCam(camKeys([[1090, { p: RT(-0.6, 1.2, 2.3), t: RT(-0.4, 0.45, 0.2), fov: 40 }], [1178, { p: RT(-0.5, 0.95, 1.8), t: RT(-0.4, 0.4, 0.3), fov: 38 }]], f));
    coneMats.forEach((m) => (m.emissiveIntensity = 0.8 * smoother(prog(f, 1134, 1150))));
    fxAt(0, 'clock', prog(f, 1092, 1178), RT(-0.4, 0.62, 0.95), 0.26, { s: '5 MENIT' });
  } },
  // S7b kursi mulai kelihatan, tapi samar
  { a: 1178, b: 1255, fn(f) {
    cinema.visible = true; lit('samar', 0, null, CN(0, 1, -3));
    look.flash = 1 - prog(f, 1178, 1184);
    setCam(camKeys([[1178, { p: CN(0.35, 1.25, 0.5), t: CN(-0.3, 0.9, -5), fov: 46, e: 'lin' }], [1255, { p: CN(-0.25, 1.15, -0.4), t: CN(0.3, 0.95, -5), fov: 44, e: 'lin' }]], f));
    look.cInf = lerp(4, 14, smoother(prog(f, 1222, 1240))); look.focus = 0.6;
  } },
  // S8a sepuluh menit: sel batang mengambil alih
  { a: 1255, b: 1336, fn(f) {
    retina.visible = true; lit('retina', 0, null, RT(0, 0, 0));
    look.flash = 0.8 * (1 - prog(f, 1255, 1261));
    setCam(camKeys([[1255, { p: RT(0.4, 1.4, 2.4), t: RT(0.3, 0.75, 0.0), fov: 40 }], [1336, { p: RT(0.35, 1.2, 1.9), t: RT(0.3, 0.75, 0.1), fov: 38 }]], f));
    coneMats.forEach((m) => (m.emissiveIntensity = 0.5));
    rodMat.emissiveIntensity = 0.75 * smoother(prog(f, 1290, 1310));
    for (const o of ORBS) o.scale.setScalar(1 + 0.25 * smoother(prog(f, 1290, 1310)) * (0.5 + 0.5 * Math.sin(f * 0.3)));
    fxAt(0, 'clock', prog(f, 1257, 1336), RT(0.75, 1.3, 0.7), 0.3, { s: '10 MENIT' });
  } },
  // S8b dunia abu-abu, makin jelas
  { a: 1336, b: 1412, fn(f) {
    cinema.visible = true; lit('samar', smoother(prog(f, 1336, 1360)), 'abu', CN(0.3, 1, 0.5));
    look.flash = 0.6 * (1 - prog(f, 1336, 1342));
    setCam(camKeys([[1336, { p: CN(0.35, 1.3, -1.9), t: CN(0.35, 0.95, 0.5), fov: 40 }], [1412, { p: CN(0.3, 1.28, -1.6), t: CN(0.3, 0.95, 0.5), fov: 40 }]], f));
    look.cInf = lerp(10, 0, smoother(prog(f, 1378, 1404))); look.focus = 1.8;
    place(C.hero, CN(0, 0, SEAT_Z), { mode: 'sit', expr: f > 1380 ? 'smile' : 'neutral', f }, f, 1);
    place(C.tetangga, CN(0.8, 0, SEAT_Z), { mode: 'sit', expr: 'neutral', f }, f, 2);
    place(C.aud[1], CN(-0.8, 0, SEAT_Z), { mode: 'sit', expr: 'smile', f }, f, 31);
  } },
  // S9a tiga puluh menit
  { a: 1412, b: 1462, fn(f) {
    cinema.visible = true; lit('abu', 0, null, CN(0.3, 1, 0.5));
    setCam(camKeys([[1412, { p: CN(0.1, 1.3, -1.6), t: CN(0.1, 1.0, 0.5), fov: 38 }], [1462, { p: CN(0.05, 1.32, -1.35), t: CN(0.05, 1.02, 0.5), fov: 38 }]], f));
    place(C.hero, CN(0, 0, SEAT_Z), { mode: 'sit', expr: 'grin', armR: f > 1420 ? 'thumb' : 'hang', f }, f, 1);
    place(C.tetangga, CN(0.8, 0, SEAT_Z), { mode: 'sit', expr: 'neutral', f }, f, 2);
    fxAt(0, 'clock', prog(f, 1414, 1462), CN(0.16, 1.18, 0.0), 0.22, { s: '30 MENIT' });
  } },
  // S9b mata ribuan kali lebih peka (100%)
  { a: 1462, b: 1532, fn(f) {
    lit('kosong'); look.flash = 0.8 * (1 - prog(f, 1462, 1468));
    const p = easeOut(prog(f, 1466, 1500));
    eyeShot(f, { pupil: 1, pct: q(0.15 + 0.85 * p, 100), spin: q((f * 0.03) % 1, 50), glow: q(p, 20), label: p >= 1 ? 'SIAP 100%' : 'MEMUAT ' + Math.round(15 + 85 * p) + '%', labelCol: p >= 1 ? '#ffd84a' : '#ffffff' }, 1462, 0.3);
    if (f > 1500) fxAt(0, 'sparkle', prog(f, 1500, 1530), VD(0.35, 1.25, 0.2), 0.5);
  } },
  // S10 tetangga menyalakan HP
  { a: 1532, b: 1642, fn(f) {
    cinema.visible = true; lit('abu', 0, null, CN(0.4, 1, 0.5));
    const on = f >= 1590, glare = on ? 1 - prog(f, 1590, 1612) * 0.55 : 0;
    setCam(camKeys([[1532, { p: CN(0.4, 1.15, -2.2), t: CN(0.4, 0.85, 0.5), fov: 42 }], [1588, { p: CN(0.4, 1.15, -2.0), t: CN(0.4, 0.86, 0.5), fov: 42 }],
      [1606, { p: CN(0.05, 1.0, -1.1), t: CN(0.05, 0.95, 0.4), fov: 40, roll: 3, e: 'out' }], [1642, { p: CN(0.05, 1.0, -1.0), t: CN(0.05, 0.96, 0.4), fov: 40, roll: 4 }]], f));
    phone.visible = f >= 1548;
    phoneScr.color.set(on ? '#ffffff' : '#101018');
    pointA.color.set(0xeaf2ff); pointA.position.set(...CN(0.6, 1.0, 0.0)); pointA.intensity = on ? 6 * glare : 0;
    look.flash = on ? 0.55 * Math.max(0, 1 - (f - 1590) / 14) : 0;
    place(C.hero, CN(0, 0, SEAT_Z), { mode: 'sit', expr: on ? 'pained' : 'smile', armR: on ? 'shield' : 'hang', f }, f, 1);
    place(C.tetangga, CN(0.8, 0, SEAT_Z), { mode: 'sit', expr: on ? 'smile' : 'neutral', armR: f >= 1548 ? 'hold' : 'hang', f }, f, 2);
    if (on && f < 1625) fxAt(0, 'bang', prog(f, 1592, 1625), CN(-0.3, 1.15, 0.2), 0.2);
  } },
  // S11 rodopsin pudar dalam sekejap
  { a: 1642, b: 1700, fn(f) {
    retina.visible = true; lit('retina', 0, null, RT(0, 0, 0));
    setCam(camKeys([[1642, { p: RT(0.3, 1.5, 2.4), t: RT(0.2, 0.8, 0.0), fov: 40 }], [1700, { p: RT(0.3, 1.45, 2.2), t: RT(0.2, 0.8, 0.0), fov: 40 }]], f), f >= 1658 && f < 1668 ? 1 : 0, f);
    rodMat.emissiveIntensity = f < 1658 ? 0.75 : 0;
    beamMat.opacity = f >= 1656 ? 0.14 * (1 - prog(f, 1660, 1690)) : 0;
    look.flash = f >= 1656 ? 0.8 * Math.max(0, 1 - (f - 1656) / 10) : 0;
    const gone = smoother(prog(f, 1658, 1666));
    orbMat.color.set(f < 1658 ? '#b44ae0' : '#8a8496');
    for (const o of ORBS) o.scale.setScalar(Math.max(0.001, 1 - gone));
    const droop = smoother(prog(f, 1668, 1695));
    for (const c of CELLS) if (!c.cone) { c.g.rotation.z = droop * (0.35 + 0.02 * c.k) * (c.k % 2 ? 1 : -1); c.g.rotation.x = droop * 0.12; }
  } },
  // S12 twist: kembali ke 0%
  { a: 1700, b: TOTAL, fn(f) {
    lit('kosong'); look.flash = 0.6 * (1 - prog(f, 1700, 1706));
    const p = 1 - easeOut(prog(f, 1708, 1724));
    const zero = f >= 1748;
    eyeShot(f, { pupil: q(lerp(0.15, 1, p), 50), pct: q(p, 100), spin: q((f * 0.02) % 1, 50), label: zero ? 'MEMUAT 0%' : 'MEMUAT ' + Math.round(100 * p) + '%', labelCol: p < 0.02 ? '#ff6a4a' : '#ffffff' }, 1700, 0.45);
  } },
];

export function update(f) {
  resetWorld(f);
  const s = SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];
  s.fn(f);
}
