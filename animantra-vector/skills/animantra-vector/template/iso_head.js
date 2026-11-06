// Mesin 2.5D isometrik (SVG) untuk "Kita bongkar": bentuk dipecah jadi bidang datar, diwarnai toon 3 nada, diurutkan
// belakang -> depan (painter), lalu digambar sebagai SVG. Overlay (judul, HUD, callout, stempel, kartu, subtitle, peristiwa suara)
// sudah ada di sini; iso_body.js cukup berisi model, timeline, dan daftar definisi (lihat reference/panduan_iso.md).
// scene.js = iso_head.js + iso_body.js. renderAt(t) deterministik.

const W = 1080, H = 1920;
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const backOut = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const deg = d => d * Math.PI / 180;

// ---------- kata & waktu ----------
const { words } = await (await fetch('./words.json')).json();
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const at = (l, w, n = 0) => {
  const c = words.filter(x => x.l === l && norm(x.w).startsWith(w));
  if (!c[n]) throw new Error(`kata tidak ada: ${l} ${w} ${n}`);
  return c[n];
};
const T = (l, w, n) => at(l, w, n).s;
const TE = (l, w, n) => at(l, w, n).e;
const NL = Math.max(...words.map(w => w.l)) + 1;
const L = Array.from({ length: NL }, (_, i) => { const ws = words.filter(x => x.l === i); return { s: ws[0].s, e: ws[ws.length - 1].e }; });
const DUR = +(L[NL - 1].e + 2.0).toFixed(3);
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, c] = keys[i], [t0, v0] = keys[i - 1];
    if (t < t1) { if (c) return v0; const k = easeIO((t - t0) / Math.max(1e-6, t1 - t0)); return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k); }
  }
  return keys[keys.length - 1][1];
}
function lin(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [t1, v1] = keys[i], [t0, v0] = keys[i - 1]; if (t < t1) return t1 - t0 < 1e-6 ? v1 : lerp(v0, v1, (t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}
const hlw = (t, s, e) => smooth(s - 0.12, s + 0.18, t) * (1 - smooth(e, e + 0.3, t));

// ---------- palet toon 3 nada (terang, sedang, gelap) ----------
const PAL = {
  steel: ['#e3e4e8', '#b4b6bd', '#7c7e86'], plate: ['#d4d6dc', '#a9abb3', '#6c6e76'], spring: ['#9fa3ad', '#6c6e76', '#45474f'],
  ink: ['#41444e', '#2c2e36', '#1a1b20'], red: ['#f07a7e', '#e5484d', '#b5303a'], blue: ['#7d97ef', '#3e63dd', '#2a47a8'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], orange: ['#ffb066', '#f08c2e', '#c96a12'], copper: ['#f0b98a', '#d48c58', '#a8673a'],
  white: ['#ffffff', '#ececea', '#cfcfcb'], green: ['#6fd09c', '#30a46c', '#1f7a4f'], ferrite: ['#7c7e86', '#55575f', '#36383e'],
  tan: ['#e7cfa3', '#cdb07f', '#a68a5c'], sleeve: ['#4a4d58', '#2c2e36', '#1a1b20'], sleeve2: ['#5a5d68', '#3c3f48', '#272930'],
  glass: ['#dff1f8', '#bcdcea', '#8fbcd1'], mug: ['#f7d36b', '#e8b84a', '#c0922e'], paper: ['#ffffff', '#f4f3ef', '#dedcd4'],
  deskwood: ['#c9a27a', '#a57f58', '#7f5f3e'], wall: ['#f6f1e7', '#e4ddcf', '#c8c0b0'], leaf: ['#7fbf7a', '#5f9e5c', '#457a43'],
};
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, k) => { if (k <= 0) return a; const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join(''); };
const INK = '#16171b';

// ---------- kamera isometrik: [x, y, z, tinggi pandang (mm), elevasi (rad), yaw (rad)] ----------
const CAM = { x: 0, y: 0, z: 0, h: 600, el: 0.55, yaw: -0.4, k: 1, f: [0, 1, 0], cx: 0, cy: 0 };
const LIGHT = (() => { const v = [-0.45, -0.6, 0.75], n = Math.hypot(...v); return v.map(x => x / n); })();
function setCamera(c) {
  Object.assign(CAM, { x: c[0], y: c[1], z: c[2], h: c[3], el: c[4] ?? 0.55, yaw: c[5] ?? -0.4 });
  CAM.k = H / CAM.h;
  const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw), ce = Math.cos(CAM.el), se = Math.sin(CAM.el);
  CAM.f = [-sy * ce, cy * ce, -se];                         // arah pandang (menjauh dari kamera), dunia
  const p = rawProj([CAM.x, CAM.y, CAM.z]); CAM.cx = p[0]; CAM.cy = p[1];
}
function rawProj([x, y, z]) {
  const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw), ce = Math.cos(CAM.el), se = Math.sin(CAM.el);
  const xr = x * cy + y * sy, yr = -x * sy + y * cy;
  return [xr, z * ce + yr * se, yr * ce - z * se];          // layar-x, layar-atas, kedalaman
}
// titik dunia -> [X px, Y px, kedalaman]
function proj(p) { const [sx, su, d] = rawProj(p); return [W / 2 + (sx - CAM.cx) * CAM.k, H / 2 - (su - CAM.cy) * CAM.k, d]; }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function newell(pts) { const n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
  n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  const l = Math.hypot(...n) || 1; return n.map(v => v / l); }
const tone = (pal, n, o = {}) => {
  const P = PAL[pal] || [pal, pal, pal], d = dot(n, LIGHT);
  let c = o.cut ? mixHex(P[0], '#ffffff', 0.55) : (d > 0.45 ? P[0] : d > -0.1 ? P[1] : P[2]);
  if (o.hl) c = mixHex(c, PAL[o.hlPal || 'yellow'][d > 0.45 ? 0 : 1], o.hl);
  if (o.tint) c = mixHex(c, o.tint[0], o.tint[1]);
  return c;
};

// ---------- daftar gambar per frame ----------
let ITEMS = [];
const tfp = (o, p) => (o.tf ? o.tf(p) : p);
// bidang datar; normal dari urutan titik (berlawanan jarum jam dilihat dari luar). o: {cut, hl, both, stroke, sw, layer, bias, op}
function face(pts, pal, o = {}) {
  const P = pts.map(p => tfp(o, p)), n = o.norm || newell(P);
  let vis = dot(n, CAM.f) < 0;
  if (!vis && !o.both) return null;
  const nn = vis ? n : n.map(v => -v);
  const pr = P.map(proj), d = pr.reduce((s, q) => s + q[2], 0) / pr.length;
  const fill = o.fill || tone(pal, nn, o);
  const it = { t: 'poly', pts: pr, fill, stroke: o.stroke ?? INK, sw: o.sw ?? 2.4, d: d + (o.bias || 0), layer: o.layer || 0, op: o.op };
  ITEMS.push(it); return it;
}
function box(x0, x1, y0, y1, z0, z1, pal, o = {}) {
  const v = (x, y, z) => [x, y, z];
  face([v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], pal, o);   // atas
  face([v(x0, y1, z0), v(x1, y1, z0), v(x1, y0, z0), v(x0, y0, z0)], pal, o);   // bawah
  face([v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)], pal, o);   // -y
  face([v(x1, y1, z0), v(x0, y1, z0), v(x0, y1, z1), v(x1, y1, z1)], pal, o);   // +y
  face([v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), v(x1, y0, z1)], pal, o);   // +x
  face([v(x0, y1, z0), v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1)], pal, o);   // -x
}
// prisma: poligon di bidang x-z (titik [x, z]) ditebalkan sepanjang y dari y0 ke y1 (untuk tuas, pelat, dll.)
function prism(poly, y0, y1, pal, o = {}) {
  const ccw = poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) > 0;
  const P = ccw ? poly : [...poly].reverse();
  face(P.map(([x, z]) => [x, y0, z]), pal, o);
  face([...P].reverse().map(([x, z]) => [x, y1, z]), pal, o);
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length];
    face([[a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]], [a[0], y0, a[1]]], pal, o); }
}
// benda putar: profil tertutup [[r, z], ...] (berlawanan jarum jam: r ke kanan, z ke atas) diputar mengelilingi sumbu z di (cx, cy).
// o.cut 0..1: 0 utuh, 1 separuh dekat kamera (y < cy) dibuang dan bidang irisannya digambar pucat. o.n jumlah segmen.
function lathe(cx, cy, prof, pal, o = {}) {
  const n = o.n || 40, cut = clamp(o.cut || 0), alpha = (1 - cut) * Math.PI / 2;
  const a0 = -alpha, a1 = Math.PI + alpha, full = cut < 0.001, segs = full ? n : Math.max(6, Math.round(n * (a1 - a0) / TAU));
  const A = Array.from({ length: segs + 1 }, (_, i) => (full ? i * TAU / segs : lerp(a0, a1, i / segs)));
  const area = prof.reduce((s, p, i) => { const q = prof[(i + 1) % prof.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0);
  const sgn = area >= 0 ? 1 : -1, m = prof.length;
  const pt = (r, z, a) => tfp(o, [cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
  const V = [], D = [];
  for (let j = 0; j < m; j++) {
    const p = prof[j], q = prof[(j + 1) % m]; if (p[0] < 0.01 && q[0] < 0.01) { V.push(null); D.push(null); continue; }
    const dr = q[0] - p[0], dz = q[1] - p[1], ln = Math.hypot(dr, dz) || 1, nr = sgn * dz / ln, nz = -sgn * dr / ln;
    const vr = [], dr2 = [];
    for (let i = 0; i < segs; i++) {
      const am = (A[i] + A[i + 1]) / 2, nrm = [nr * Math.cos(am), nr * Math.sin(am), nz];
      const quad = [pt(p[0], p[1], A[i]), pt(p[0], p[1], A[i + 1]), pt(q[0], q[1], A[i + 1]), pt(q[0], q[1], A[i])];
      const vis = dot(nrm, CAM.f) < 0;
      vr.push(vis); dr2.push(null);
      if (!vis) continue;
      const pr = quad.map(proj), d = pr.reduce((s, x) => s + x[2], 0) / 4, fill = tone(pal, nrm, o);
      ITEMS.push({ t: 'poly', pts: pr, fill, stroke: fill, sw: 1.1, d: d + (o.bias || 0), layer: o.layer || 0, op: o.op });
      dr2[i] = d + (o.bias || 0);
    }
    V.push(vr); D.push(dr2);
  }
  // garis tepi: lekukan profil (ring) dan siluet (generator di tempat visibilitas berganti)
  const lineAt = (pts, d) => ITEMS.push({ t: 'line', pts: pts.map(proj), stroke: INK, sw: 2.4, d: d - 0.02, layer: o.layer || 0, op: o.op });
  for (let j = 0; j < m; j++) {
    const jp = (j - 1 + m) % m, p = prof[j], a = prof[jp], b = prof[(j + 1) % m];
    if (!V[j] && !V[jp]) continue;
    const u = [p[0] - a[0], p[1] - a[1]], w = [b[0] - p[0], b[1] - p[1]];
    const ang = Math.acos(clamp((u[0] * w[0] + u[1] * w[1]) / ((Math.hypot(...u) || 1) * (Math.hypot(...w) || 1)), -1, 1));
    if (ang < deg(28) || p[0] < 0.01) continue;
    for (let i = 0; i < segs; i++) {
      const v1 = V[j] && V[j][i], v0 = V[jp] && V[jp][i]; if (!v1 && !v0) continue;
      lineAt([pt(p[0], p[1], A[i]), pt(p[0], p[1], A[i + 1])], Math.min(v1 ? D[j][i] : 1e9, v0 ? D[jp][i] : 1e9));
    }
  }
  for (let j = 0; j < m; j++) { if (!V[j]) continue; const p = prof[j], q = prof[(j + 1) % m];
    for (let i = 0; i <= segs; i++) {
      const L0 = i > 0 ? V[j][i - 1] : (full ? V[j][segs - 1] : false), R0 = i < segs ? V[j][i] : (full ? V[j][0] : false);
      if (L0 !== R0) lineAt([pt(p[0], p[1], A[i]), pt(q[0], q[1], A[i])], Math.min(L0 ? D[j][(i - 1 + segs) % segs] : 1e9, R0 ? D[j][i % segs] : 1e9));
    } }
  // bidang irisan di kedua sisi potongan; garis tepinya hanya di tepi profil yang bukan sumbu (supaya dua irisan menyatu tanpa garis tengah)
  if (!full) for (const [a, s] of [[A[0], 1], [A[segs], -1]]) {
    const poly = prof.map(([r, z]) => pt(r, z, a));
    const it = face(s > 0 ? poly : [...poly].reverse(), pal, { ...o, tf: null, cut: true, both: true, bias: (o.bias || 0) + 0.5, sw: 1.1 });
    if (!it) continue;
    it.stroke = it.fill;
    for (let j = 0; j < m; j++) { const p = prof[j], q = prof[(j + 1) % m]; if (p[0] < 0.01 && q[0] < 0.01) continue;
      lineAt([pt(p[0], p[1], a), pt(q[0], q[1], a)], it.d); }
  }
}
const cyl = (cx, cy, r, z0, z1, pal, o = {}) => lathe(cx, cy, [[0, z0], [r, z0], [r, z1], [0, z1]], pal, o);
const frustum = (cx, cy, r0, r1, z0, z1, pal, o = {}) => lathe(cx, cy, [[0, z0], [r0, z0], [r1, z1], [0, z1]], pal, o);
const tube = (cx, cy, ro, ri, z0, z1, pal, o = {}) => lathe(cx, cy, [[ri, z0], [ro, z0], [ro, z1], [ri, z1]], pal, o);
// per spiral: garis tebal dipecah per ruas supaya bisa tertutup benda lain
function coil(cx, cy, r, z0, z1, turns, pal, o = {}) {
  const N = Math.ceil(turns * 24), P = PAL[pal] || [pal, pal, pal], w = (o.w || 1) * CAM.k;
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const k = i / N, a = k * turns * TAU, p = proj(tfp(o, [cx + r * Math.cos(a), cy + r * Math.sin(a), lerp(z0, z1, k)]));
    if (prev) { const front = Math.sin(a) < 0;
      const col = o.hl ? mixHex(front ? P[0] : P[2], PAL.yellow[0], o.hl) : (front ? P[0] : P[2]);
      ITEMS.push({ t: 'seg', pts: [prev, p], stroke: col, sw: Math.max(2.5, w * 2), outline: true, d: (prev[2] + p[2]) / 2 + (o.bias || 0), layer: o.layer || 0 }); }
    prev = p;
  }
}
const blob = (p, r, pal, o = {}) => { const q = proj(tfp(o, p)); ITEMS.push({ t: 'circ', c: q, r: r * CAM.k, fill: o.fill || (PAL[pal] || [pal])[0], stroke: o.stroke ?? INK, sw: o.sw ?? 2.2, d: q[2] + (o.bias || 0), layer: o.layer || 0, op: o.op }); };
const label3 = (p, str, o = {}) => { const q = proj(p); ITEMS.push({ t: 'text', c: q, str, size: (o.size || 6) * CAM.k, fill: o.fill || '#fff', d: q[2] + (o.bias ?? -1), layer: o.layer || 0 }); };
// bayangan jatuh di lantai/meja (z = zg): elips gelap tipis, digambar sebelum benda
const shadow = (cx, cy, rx, ry, zg = 0, op = 0.22) => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; pts.push(proj([cx + rx * Math.cos(a) + rx * 0.18, cy + ry * Math.sin(a) + ry * 0.25, zg])); }
  ITEMS.push({ t: 'poly', pts, fill: '#2a1d10', stroke: 'none', sw: 0, d: 0, layer: -1, op }); };
// transformasi untuk bagian bergerak
const TF = {
  move: (dx, dy, dz) => p => [p[0] + dx, p[1] + dy, p[2] + dz],
  rotY: (px, pz, a) => p => { const x = p[0] - px, z = p[2] - pz, c = Math.cos(a), s = Math.sin(a); return [px + x * c + z * s, p[1], pz - x * s + z * c]; },
  rotZ: (px, py, a) => p => { const x = p[0] - px, y = p[1] - py, c = Math.cos(a), s = Math.sin(a); return [px + x * c - y * s, py + x * s + y * c, p[2]]; },
  then: (...fs) => p => fs.reduce((q, f) => f(q), p),
};
// ---------- alat tambahan (dari video engsel sendok) ----------
// poligon denah [x, y] ditebalkan sepanjang z: pelat, lengan, batang berbentuk bebas dilihat dari atas (o.top = opsi khusus muka atas)
function slab(poly, z0, z1, pal, o = {}) {
  const ar = poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0);
  const P = ar > 0 ? poly : [...poly].reverse();
  face(P.map(([x, y]) => [x, y, z1]), pal, { ...o, ...(o.top || {}) });
  face([...P].reverse().map(([x, y]) => [x, y, z0]), pal, o);
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length];
    face([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], pal, o); }
}
// denah batang berujung bulat dari titik p ke q, setengah lebar w (pakai dengan slab)
const stadium = (p, q, w) => { const a = Math.atan2(q[1] - p[1], q[0] - p[0]), pts = [];
  for (let i = 0; i <= 4; i++) { const b = a - Math.PI / 2 + i * Math.PI / 4; pts.push([q[0] + w * Math.cos(b), q[1] + w * Math.sin(b)]); }
  for (let i = 0; i <= 4; i++) { const b = a + Math.PI / 2 + i * Math.PI / 4; pts.push([p[0] + w * Math.cos(b), p[1] + w * Math.sin(b)]); }
  return pts; };
// tabung dengan sumbu sejajar y (peredam, pin, baut tidur), dari faces supaya normalnya benar
function cylY(x, z, r, y0, y1, pal, o = {}, n = 12) {
  for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, P = (a, y) => [x + r * Math.cos(a), y, z + r * Math.sin(a)];
    face([P(a0, y0), P(a0, y1), P(a1, y1), P(a1, y0)], pal, { ...o, sw: 0.8, stroke: undefined }); }
  const cap = y => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i / n * TAU), y, z + r * Math.sin(i / n * TAU)]);
  face(cap(y0), pal, o); face([...cap(y1)].reverse(), pal, o);
}
// per spiral dengan sumbu sejajar y (coil = sumbu z)
function coilY(x, z, r, y0, y1, turns, pal, o = {}) {
  const N = Math.ceil(turns * 20), P = PAL[pal], w = (o.w || 0.8) * CAM.k; let prev = null;
  for (let i = 0; i <= N; i++) { const k = i / N, a = k * turns * TAU, p = proj(tfp(o, [x + r * Math.cos(a), lerp(y0, y1, k), z + r * Math.sin(a)]));
    if (prev) { const up = Math.sin(a) > 0, col = mixHex(up ? P[0] : P[2], PAL.yellow[0], o.hl || 0);
      ITEMS.push({ t: 'seg', pts: [prev, p], stroke: col, sw: Math.max(2.5, w * 2), d: (prev[2] + p[2]) / 2 + (o.bias || 0), layer: o.layer || 0 }); }
    prev = p; }
}
// titik-titik busur [u, z] (lubang, cekungan, ujung membulat pada profil face/prism)
const arc = (cu, cz, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cu + r * Math.cos(a), cz + r * Math.sin(a)]; });
// garis/jejak titik dunia sebagai SVG untuk SC.arrows (jalur gerak, garis bantu putus-putus)
const pathSVG = (pts, col, w, dash = '') => `<polyline points="${pts.map(p => { const q = proj(p); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
// kamera dengan titik bidik diturunkan 22% tinggi pandang: benda naik menjauhi area subtitle
const camLow = (x, y, z, h, el, yaw) => [x, y, z - 0.22 * h, h, el, yaw];
function drawItems() {
  ITEMS.sort((a, b) => (a.layer - b.layer) || (b.d - a.d));
  const f1 = v => v.toFixed(1);
  let s = '';
  for (const it of ITEMS) {
    const op = it.op != null ? ` opacity="${it.op.toFixed(3)}"` : '';
    if (it.t === 'poly') s += `<polygon points="${it.pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="${it.fill}" stroke="${it.stroke}" stroke-width="${it.sw}" stroke-linejoin="round"${op}/>`;
    else if (it.t === 'line') s += `<polyline points="${it.pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="${it.stroke}" stroke-width="${it.sw}" stroke-linecap="round"${op}/>`;
    else if (it.t === 'seg') { const pp = it.pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
      s += `<polyline points="${pp}" fill="none" stroke="${INK}" stroke-width="${it.sw + 3.4}" stroke-linecap="round"/><polyline points="${pp}" fill="none" stroke="${it.stroke}" stroke-width="${it.sw}" stroke-linecap="round"/>`; }
    else if (it.t === 'circ') s += `<circle cx="${f1(it.c[0])}" cy="${f1(it.c[1])}" r="${f1(it.r)}" fill="${it.fill}" stroke="${it.stroke}" stroke-width="${it.sw}"${op}/>`;
    else if (it.t === 'text') s += `<text x="${f1(it.c[0])}" y="${f1(it.c[1])}" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800" font-size="${f1(it.size)}" fill="${it.fill}">${it.str}</text>`;
  }
  ISO.innerHTML = s;
}

// ---------- panggung ----------
const ISO = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
ISO.setAttribute('class', 'ov'); ISO.setAttribute('width', W); ISO.setAttribute('height', H); ISO.id = 'iso';
$('gl').style.display = 'none';
$('shake').insertBefore(ISO, $('vig'));

// ---------- definisi yang diisi iso_body.js ----------
const SC = {
  chap: 'Kita bongkar', camKeys: [[0, [0, 0, 0, 600, 0.55, -0.4]]], segs: null,
  model: t => {}, build: t => {}, readout: t => ['', ''], cards: [], arrows: t => '', events: (ev, cue) => {}, coverPoint: null,
  titles: [], chips: [], stamps: [], shakes: [], stampTop: 1330,
};
const tagDefs = [];
const tagAdd = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
const RED = '#e5484d', GRN = '#30a46c', GRY = '#8a8a8f', YEL = '#ffe259';
const arrowSVG = (x0, y0, x1, y1, col, w = 8) => { const a = Math.atan2(y1 - y0, x1 - x0), h = w * 3.2;
  return `<line x1="${x0}" y1="${y0}" x2="${x1 - Math.cos(a) * h * 0.8}" y2="${y1 - Math.sin(a) * h * 0.8}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${x1} ${y1} L${x1 - Math.cos(a - .45) * h} ${y1 - Math.sin(a - .45) * h} L${x1 - Math.cos(a + .45) * h} ${y1 - Math.sin(a + .45) * h} Z" fill="${col}"/>`; };
// panah dari titik dunia a ke b (px), dengan pudar k
const arrow3 = (a, b, col, w = 10, k = 1) => { if (k <= 0.02) return ''; const p = proj(a), q = proj(b); return `<g opacity="${k.toFixed(3)}">${arrowSVG(p[0], p[1], q[0], q[1], col, w)}</g>`; };
const F = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
const txt = (x, y, str, col = INK, sz = 24, anc = 'middle', wt = 800) => `<text x="${x}" y="${y}" text-anchor="${anc}" paint-order="stroke" stroke="#f8f8f5" stroke-width="7" stroke-linejoin="round" ${F} font-weight="${wt}" font-size="${sz}" fill="${col}">${str}</text>`;

// ---------- overlay ----------
let card, tagEls, chunks;
function setupOverlay() {
  card = document.createElement('div'); card.className = 'ov'; card.id = 'card';
  card.style.cssText = 'left:64px;right:64px;top:1150px;height:360px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);border:1px solid rgba(22,23,27,.12);border-radius:26px;box-shadow:0 18px 50px rgba(22,23,27,.18);overflow:hidden;opacity:0';
  card.innerHTML = '<div id="cardK" style="position:absolute;left:24px;top:18px;font:700 17px ui-monospace,Menlo;letter-spacing:.14em;color:#6c6e76"></div><svg id="cardS" viewBox="0 0 952 360" style="position:absolute;inset:0;width:100%;height:100%"></svg>';
  $('stage').insertBefore(card, $('cap'));
  $('stamp').style.top = SC.stampTop + 'px';
  tagEls = tagDefs.map(d => { const el = document.createElement('div'); el.className = 'tag ' + d.cls; el.innerHTML = `<span>${d.text}</span>`; $('tags').appendChild(el); return el; });
  chunks = [];
  for (let li = 0; li < NL; li++) { let cur = []; const ws = words.filter(w => w.l === li);
    ws.forEach((w, i) => { cur.push(w); if (/[.?!:…]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 6 || i === ws.length - 1) { chunks.push(cur); cur = []; } }); }
  const allW = chunks.flat(); allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
  chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });
}
let lastTitle = -1, lastChunk = -1, lastStamp = -1;
function updateOverlay(t) {
  const TD = SC.titles; let ti = 0; TD.forEach((d, i) => { if (t >= d[0]) ti = i; });
  const tEl = $('title');
  if (TD.length) {
    if (ti !== lastTitle) { tEl.innerHTML = TD[ti][2]; lastTitle = ti; }
    const t0 = TD[ti][0], hold = ti === 0 ? 4.4 : 3.0, tin = clamp((t - t0) / 0.45), tout = clamp((t - t0 - hold) / 0.45);
    tEl.style.opacity = (Math.min(1, tin * 1.6) * (1 - tout)).toFixed(3);
    tEl.style.transform = `translateY(${(30 * Math.pow(1 - tin, 3) - 18 * tout).toFixed(1)}px)`;
    tEl.style.clipPath = `inset(0 ${(100 * (1 - easeIO(tin))).toFixed(1)}% 0 0)`;
    $('chap').textContent = TD[ti][1] || SC.chap;
  }
  const segs = SC.segs || [[0, DUR]], prog = $('prog');
  if (!prog.children.length) segs.forEach(() => { const i2 = document.createElement('i'); i2.appendChild(document.createElement('b')); prog.appendChild(i2); });
  segs.forEach(([a, b], k) => (prog.children[k].firstChild.style.transform = `scaleX(${clamp((t - a) / (b - a)).toFixed(4)})`));
  const [rn, ru] = SC.readout(t); $('rn').textContent = rn; $('ru').textContent = ru;
  if (SC.chips.length) { let ci = 0; SC.chips.forEach((d, i) => { if (t >= d[0]) ci = i; });
    const chip = $('chip'); chip.textContent = SC.chips[ci][1]; chip.style.setProperty('--dot', SC.chips[ci][2] === YEL ? '#e8b400' : SC.chips[ci][2]); }
  let svg = '';
  tagDefs.forEach((d, i) => {
    const el = tagEls[i];
    if (t < d.s || t > d.e + 0.2) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const [x, y] = proj(d.anchor());
    const w = el.offsetWidth, h = el.offsetHeight, dx = d.side === 'r' ? 1 : -1;
    const lx = clamp(x + dx * 96, 40 + (dx < 0 ? w : 0), W - 40 - (dx > 0 ? w : 0)), ly = clamp(y - 96, 300, 1100);
    const p = clamp((t - d.s) / 0.35), o = clamp((t - d.e) / 0.2), ep = easeIO(p);
    el.style.left = (dx > 0 ? lx : lx - w) + 'px'; el.style.top = (ly - h / 2) + 'px';
    el.style.opacity = (clamp((p - 0.45) / 0.4) * (1 - o)).toFixed(3);
    el.style.transform = `translateX(${(dx * 12 * (1 - ep)).toFixed(1)}px)`;
    const col = d.cls === 'warn' ? RED : (d.cls === 'hi' ? '#e8b400' : INK);
    const ex = lerp(x, lx, clamp(p / 0.6)), ey = lerp(y, ly, clamp(p / 0.6)), a = (1 - o).toFixed(3);
    svg += `<g opacity="${a}"><circle cx="${x}" cy="${y}" r="${(16 * ep).toFixed(1)}" fill="none" stroke="${col}" stroke-width="3" opacity=".5"/><circle cx="${x}" cy="${y}" r="7" fill="${col}" stroke="#fff" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" stroke="${INK}" stroke-width="2.5"/></g>`;
  });
  svg += SC.arrows(t);
  $('dim').innerHTML = svg;
  let si = -1; SC.stamps.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const st = $('stamp');
  if (si !== lastStamp) { st.innerHTML = si < 0 ? '' : `<span class="${SC.stamps[si][3]}">${SC.stamps[si][2]}</span>`; lastStamp = si; }
  if (si >= 0) { const d = SC.stamps[si], sp = st.firstChild; const pin2 = (t - d[0]) / 0.3, pout = clamp((t - d[1]) / 0.3);
    sp.style.opacity = clamp((t - d[0]) / 0.12) * (1 - pout); sp.style.transform = `rotate(-4deg) scale(${(lerp(1.35, 1, backOut(pin2)) * lerp(1, 0.94, pout)).toFixed(3)})`; }
  // kartu: {on: t => 0..1, kicker: string | t => string, svg: t => string}; yang pertama aktif dipakai
  let co = 0, cur = null; for (const c of SC.cards) { const k = c.on(t); if (k > co) { co = k; cur = c; } }
  card.style.opacity = co.toFixed(3); card.style.transform = `translateY(${(26 * (1 - co)).toFixed(1)}px)`;
  if (cur && co > 0.01) { $('cardK').textContent = typeof cur.kicker === 'function' ? cur.kicker(t) : cur.kicker; $('cardS').innerHTML = cur.svg(t); }
  const ci2 = chunks.findIndex(c => t >= c.s && t < c.e), cap = $('cap');
  if (ci2 !== lastChunk) { cap.innerHTML = ci2 < 0 ? '' : `<span class="pill">${chunks[ci2].map(w => `<b>${w.w}</b>`).join(' ')}</span>`; lastChunk = ci2; }
  if (ci2 >= 0) { const pill = cap.firstChild, c = chunks[ci2]; pill.style.opacity = lerp(0.2, 1, clamp((t - c.s) / 0.2));
    [...pill.children].forEach((b, k) => { const w = c[k]; b.className = t >= w.next ? 'past' : (t >= w.s ? 'cur' : ''); }); }
  let sh = 0; for (const s of SC.shakes) if (t > s && t < s + 0.4) sh = Math.max(sh, 1 - (t - s) / 0.4);
  $('shake').style.transform = sh ? `translate(${(Math.sin(t * 91) * 14 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 10 * sh).toFixed(1)}px)` : '';
}

// iso_body.js memanggil mulai() di akhir
function mulai() {
  setupOverlay();
  window.renderAt = t => {
    SC.model(t);
    setCamera(window.CAM_OVERRIDE || track(SC.camKeys, t));
    ITEMS = []; SC.build(t); drawItems();
    updateOverlay(t);
  };
  window.EVENTS = (() => {
    const ev = [];
    tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
    SC.stamps.forEach(d => ev.push({ t: d[0], type: d[3] === 'snd' ? 'stampSnd' : 'stamp', text: d[2] }));
    const cue = (name, t) => ev.push({ t: +t.toFixed(3), type: 'cue', name });
    SC.events(ev, cue);
    return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
  })();
  window.DUR = DUR; window.TW = T;
  window.coverPx = () => { if (!SC.coverPoint) return [700, 1150]; const p = proj(SC.coverPoint()); return [p[0], p[1]]; };
  window.__dbg = { CAM, SC, ITEMS: () => ITEMS.length };
  window.renderAt(0);
  window.READY = true;
}
