// Painted canvas textures: flat colour with darker seams, a little hand-painted noise.
import * as THREE from 'three';

const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const hexMul = (c, k) => {
  const n = parseInt(c.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, rep = true) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
};
const speckle = (g, w, h, col, n, r, seed = 1) => {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) { g.globalAlpha = 0.25 + 0.35 * rnd(seed + i * 3.1); g.beginPath(); g.ellipse(rnd(seed + i) * w, rnd(seed + i * 1.7) * h, r * (0.5 + rnd(i * 2.3)), r * 0.6, rnd(i) * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
};

/** wood planks, 1 texture = 1 m x 1 m */
export const planks = (col = '#b9824f', seed = 1) => {
  const [c, g] = cv(256, 256); g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = hexMul(col, 0.92 + 0.12 * rnd(seed + i)); g.fillRect(0, i * 64 + 3, 256, 58);
    g.fillStyle = hexMul(col, 0.62); g.fillRect(0, i * 64, 256, 4);
    const x = (rnd(seed + i * 7) * 256) | 0; g.fillRect(x, i * 64, 4, 64);
    g.strokeStyle = hexMul(col, 0.82); g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { g.beginPath(); const y = i * 64 + 14 + k * 15; g.moveTo(0, y); g.bezierCurveTo(80, y + 4, 170, y - 4, 256, y + 2); g.stroke(); }
  }
  return tex(c);
};
export const bricks = (col = '#a9573f', mortar = '#d9c7a8', seed = 2) => {
  const [c, g] = cv(256, 256); g.fillStyle = mortar; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) {
    const x = k * 64 + (r % 2 ? 32 : 0); g.fillStyle = hexMul(col, 0.85 + 0.25 * rnd(seed + r * 9 + k));
    g.fillRect(x + 3, r * 32 + 3, 58, 26);
  }
  speckle(g, 256, 256, hexMul(col, 0.6), 60, 3, seed);
  return tex(c);
};
export const plaster = (col = '#e9dcc0', seed = 3) => {
  const [c, g] = cv(256, 256); g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, hexMul(col, 0.9), 80, 10, seed); speckle(g, 256, 256, hexMul(col, 1.05), 40, 8, seed + 50);
  return tex(c);
};
export const tiles = (a = '#e8e4d8', b = '#9fb7b0', seed = 4) => {
  const [c, g] = cv(256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = hexMul(b, 0.6); g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
  speckle(g, 256, 256, '#7a7a70', 30, 4, seed);
  return tex(c);
};
export const cobbles = (col = '#8c8a94', seed = 5) => {
  const [c, g] = cv(256, 256); g.fillStyle = hexMul(col, 0.55); g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 9; k++) {
    const x = k * 32 + (r % 2 ? 16 : 0) + 16, y = r * 32 + 16; g.fillStyle = hexMul(col, 0.85 + 0.3 * rnd(seed + r * 13 + k));
    g.beginPath(); g.ellipse(x, y, 13, 12, 0, 0, 7); g.fill();
  }
  return tex(c);
};
export const roofTiles = (col = '#5a4e5e', seed = 6) => {
  const [c, g] = cv(256, 256); g.fillStyle = hexMul(col, 0.7); g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 9; k++) { g.fillStyle = hexMul(col, 0.9 + 0.2 * rnd(seed + r * 5 + k)); g.fillRect(k * 32 + (r % 2 ? 16 : 0) + 2, r * 32 + 2, 28, 26); }
  return tex(c);
};
export const flat = (col) => { const [c, g] = cv(8, 8); g.fillStyle = col; g.fillRect(0, 0, 8, 8); return tex(c); };

/** a single-use painted sign/label (not repeating); lines of text centred, never mirrored */
export const label = (lines, { w = 512, h = 256, bg = '#f4ead2', fg = '#2a1a22', border = '#2a1a22', font = 'bold 72px Georgia, serif', bw = 10, pad = 0 } = {}) => {
  const [c, g] = cv(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (border) { g.strokeStyle = border; g.lineWidth = bw; g.strokeRect(bw / 2 + pad, bw / 2 + pad, w - bw - 2 * pad, h - bw - 2 * pad); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lh = h / (lines.length + 0.6);
  lines.forEach((t, i) => g.fillText(t, w / 2, lh * (i + 0.8)));
  return tex(c, false);
};
export const chalkboard = () => {
  const [c, g] = cv(1024, 512); g.fillStyle = '#2f4a3c'; g.fillRect(0, 0, 1024, 512);
  speckle(g, 1024, 512, '#3d5a4a', 120, 20, 9);
  g.strokeStyle = 'rgba(240,240,225,0.85)'; g.fillStyle = 'rgba(240,240,225,0.85)'; g.lineWidth = 5; g.font = '48px "Comic Sans MS", cursive';
  g.fillText('E = ?', 60, 90); g.fillText('x² + 3y', 560, 110);
  g.beginPath(); g.arc(250, 300, 70, 0, 7); g.stroke();
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(225 + (i % 3) * 25, 275 + ((i / 3) | 0) * 25, 6, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(380, 300); g.lineTo(520, 300); g.lineTo(500, 285); g.moveTo(520, 300); g.lineTo(500, 315); g.stroke();
  g.fillText('?!', 560, 320);
  g.beginPath(); g.moveTo(700, 420); for (let i = 0; i < 8; i++) g.lineTo(720 + i * 35, 420 - Math.abs(Math.sin(i)) * 120); g.stroke();
  return tex(c, false);
};
/** chalk word that can be revealed left-to-right via texture offset tricks (we draw it fully, reveal in shader-free way by scaling a mask plane) */
export const chalkWord = (word) => {
  const [c, g] = cv(1024, 192); g.clearRect(0, 0, 1024, 192);
  g.fillStyle = 'rgba(245,245,230,0.95)'; g.font = 'bold 110px "Comic Sans MS", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(word, 512, 100);
  return tex(c, false);
};
export const windowTex = (sky = '#bfe0f0', frame = '#f2efe6', night = false) => {
  const [c, g] = cv(256, 384);
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, sky); gr.addColorStop(1, hexMul(sky, night ? 1.3 : 1.12)); g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
  if (night) { g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(180, 90, 28, 0, 7); g.fill(); g.fillStyle = sky; g.beginPath(); g.arc(166, 82, 26, 0, 7); g.fill(); }
  else { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(80, 120, 50, 20, 0, 0, 7); g.ellipse(120, 112, 40, 22, 0, 0, 7); g.fill(); }
  g.fillStyle = '#6e7a86'; for (let i = 0; i < 5; i++) g.fillRect(i * 52, 300 - (i % 3) * 30, 46, 100);
  g.fillStyle = frame; g.fillRect(0, 0, 256, 14); g.fillRect(0, 370, 256, 14); g.fillRect(0, 0, 14, 384); g.fillRect(242, 0, 14, 384); g.fillRect(121, 0, 14, 384); g.fillRect(0, 185, 256, 14);
  g.strokeStyle = '#2a1a22'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 378);
  return tex(c, false);
};
export const calendar = () => {
  const [c, g] = cv(256, 320); g.fillStyle = '#f7f1e3'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#c0353a'; g.fillRect(0, 0, 256, 70); g.fillStyle = '#fff'; g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.fillText('LIBUR', 128, 50);
  g.strokeStyle = '#2a1a22'; g.lineWidth = 2;
  for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) {
    const x = 12 + k * 33, y = 84 + r * 45; g.strokeRect(x, y, 30, 40);
    const day = r * 7 + k; if (day >= 9 && day < 23) { g.strokeStyle = '#c0353a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + 26, y + 36); g.moveTo(x + 26, y + 4); g.lineTo(x + 4, y + 36); g.stroke(); g.strokeStyle = '#2a1a22'; g.lineWidth = 2; }
  }
  g.lineWidth = 8; g.strokeStyle = '#2a1a22'; g.strokeRect(4, 4, 248, 312);
  return tex(c, false);
};
export const poster = (bg, draw) => { const [c, g] = cv(256, 320); g.fillStyle = bg; g.fillRect(0, 0, 256, 320); draw(g); g.lineWidth = 10; g.strokeStyle = '#2a1a22'; g.strokeRect(5, 5, 246, 310); return tex(c, false); };
export const agar = () => {
  const [c, g] = cv(512, 512); g.fillStyle = '#f0d27e'; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, '#e2bd62', 140, 18, 21); speckle(g, 512, 512, '#f8e2a0', 80, 14, 31);
  return tex(c);
};
export const fuzz = (col = '#3f9a8a') => {
  const [c, g] = cv(256, 256); g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, hexMul(col, 1.35), 220, 6, 41); speckle(g, 256, 256, hexMul(col, 0.7), 160, 5, 51); speckle(g, 256, 256, '#e8f5ee', 60, 3, 61);
  return tex(c);
};
export const cloudTex = () => {
  const [c, g] = cv(512, 256);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(80 + i * 45, 150 - Math.sin(i * 0.9) * 50, 70, 55, 0, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(200,210,230,0.6)'; g.fillRect(0, 190, 512, 66);
  g.globalCompositeOperation = 'destination-out'; g.fillRect(0, 205, 512, 60);
  return tex(c, false);
};
