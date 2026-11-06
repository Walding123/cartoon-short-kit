// Video bedah "Kok gunting bisa motong?" — gunting isometrik (toon + bayangan) di WebGL + HUD sinematik/inset/karaoke di DOM.
// Satu model: sudut buka gunting a(t) -> titik potong x = e / sin(a) -> sobekan kertas, angka, bunyi. renderAt(t) deterministik.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

THREE.ColorManagement.enabled = false;
const W = 1080, H = 1920, SS = 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
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

// key: [t, nilai, 'c' = potong langsung]; di antara key diinterpolasi easeIO
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, c] = keys[i], [t0, v0] = keys[i - 1];
    if (t < t1) {
      if (c) return v0;
      const k = easeIO((t - t0) / Math.max(1e-6, t1 - t0));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}
// key linear (buat laju), tanpa easing
function lin(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (t < t1) return t1 - t0 < 1e-6 ? v1 : lerp(v0, v1, (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
const hlw = (t, s, e) => smooth(s - 0.12, s + 0.18, t) * (1 - smooth(e, e + 0.3, t));

// ---------- renderer & pass (sama dengan resleting) ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0xf3f3f0, 1);
const mkRT = depth => {
  const rt = new THREE.WebGLRenderTarget(W * SS, H * SS, { type: THREE.HalfFloatType });
  if (depth) { rt.depthTexture = new THREE.DepthTexture(W * SS, H * SS); rt.depthTexture.type = THREE.FloatType; }
  return rt;
};
const rtCol = mkRT(true), rtNor = mkRT(false), rtComp = mkRT(false);
rtComp.texture.minFilter = rtComp.texture.magFilter = THREE.LinearFilter;
const scene = new THREE.Scene();
const NEAR = 1, FAR = 400;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const quad = (frag, uniforms) => {
  const m = new THREE.ShaderMaterial({ uniforms, fragmentShader: frag, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }' });
  const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q);
  return { scene: s, mat: m };
};
const edge = quad(`
  uniform sampler2D tC, tN, tD; uniform vec2 px; uniform float r, far; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tC, vUv).rgb; vec3 n = texture2D(tN, vUv).rgb * 2. - 1.; float d = texture2D(tD, vUv).x;
    float e = 0.;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      vec2 o = vec2(cos(a), sin(a)) * px * r;
      vec2 uv2 = vUv + o;
      float d2 = texture2D(tD, uv2).x, d3 = texture2D(tD, vUv - o).x;
      bool b1 = d > .99999, b2 = d2 > .99999;
      if (b1 != b2) { e = 1.; continue; }
      if (b1) continue;
      vec3 n2 = texture2D(tN, uv2).rgb * 2. - 1.;
      vec3 c2 = texture2D(tC, uv2).rgb;
      // kelengkungan kedalaman (turunan kedua): bidang datar semiring apa pun = 0, jadi tidak jadi garis palsu
      if (d3 < .99999 && abs(d2 + d3 - 2. * d) * far > .35) e = 1.;
      if (dot(n, n2) < .35) e = 1.;
    }
    gl_FragColor = vec4(mix(c, vec3(.086, .09, .106), e), 1.);
  }`, { tC: { value: rtCol.texture }, tN: { value: rtNor.texture }, tD: { value: rtCol.depthTexture },
  px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, r: { value: 2.4 }, far: { value: FAR - NEAR } });
const out = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`,
  { t: { value: rtComp.texture } });

// ---------- material cel 3 nada ----------
const PAL = {
  brass: ['#e9c46a', '#cf9d36', '#a87a22'], gold: ['#f1d27a', '#d9ab45', '#b0832a'],
  steel: ['#e3e4e8', '#b4b6bd', '#7c7e86'], plate: ['#d4d6dc', '#a9abb3', '#6c6e76'],
  spring: ['#9fa3ad', '#6c6e76', '#45474f'], ruby: ['#f06a6f', '#c2261a', '#8e1a12'],
  dial: ['#fbfbf8', '#e8e8e3', '#c9cac4'], ink: ['#41444e', '#2c2e36', '#1a1b20'],
  strap: ['#5a4a3e', '#3f342c', '#2a221d'], red: ['#f07a7e', '#e5484d', '#b5303a'], blue: ['#7d97ef', '#3e63dd', '#2a47a8'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], orange: ['#ffb066', '#f08c2e', '#c96a12'],
  pcb: ['#4f8f6c', '#2f6a4d', '#1f4a35'], copper: ['#f0b98a', '#d48c58', '#a8673a'], white: ['#ffffff', '#ececea', '#cfcfcb'],
  green: ['#6fd09c', '#30a46c', '#1f7a4f'], ferrite: ['#7c7e86', '#55575f', '#36383e'], tape: ['#ffe28a', '#f2c94c', '#c9a032'],
  tan: ['#e7cfa3', '#cdb07f', '#a68a5c'], sleeve: ['#4a4d58', '#2c2e36', '#1a1b20'],
  glass: ['#dff1f8', '#bcdcea', '#8fbcd1'], filmcap: ['#8fa6c9', '#6f88ad', '#536a8d'], stripe: ['#c9ccd4', '#a9abb3', '#7c7e86'],
  ycap: ['#5b8def', '#3e63dd', '#2a47a8'], sleeve2: ['#5a5d68', '#3c3f48', '#272930'],
  leaf: ['#7fbf7a', '#5f9e5c', '#457a43'], terracotta: ['#e39a74', '#c97a55', '#a35f40'], mug: ['#f7d36b', '#e8b84a', '#c0922e'],
  bedlight: ['#d3def2', '#b8c8e6', '#9bb0d6'], lampshade: ['#fff4dc', '#f2e2bf', '#d9c59c'], curtain: ['#e6b9a6', '#cf9a85', '#ad7a66'], art: ['#9ad1c5', '#6fb3a5', '#4e8f82'],
  handle: ['#ff8a5c', '#f0643a', '#c44a26'], blade: ['#e9ebef', '#c3c7cf', '#8d929c'], edge: ['#ffffff', '#f2f4f7', '#d9dde3'], mat: ['#5fa37a', '#478a62', '#356b4b'],
  paper: ['#ffffff', '#f4f3ef', '#dedcd4'], skewer: ['#e6c48f', '#cfa66a', '#a8824a'],
  mov: ['#4fb3c9', '#2f8fa6', '#1f6878'], glue: ['#f4f2ea', '#dedbd0', '#b9b6aa'], brick: ['#4a4d58', '#34363e', '#22242a'], danger: ['#ff6b6b', '#e5484d', '#b5303a'],
  wall: ['#f6f1e7', '#e4ddcf', '#c8c0b0'], floorwood: ['#dcbb8c', '#c29c69', '#9c7a4c'], bed: ['#a9bde0', '#8aa3cf', '#6d84b0'],
  rug: ['#eeb3a6', '#dc9384', '#b97165'], deskwood: ['#c9a27a', '#a57f58', '#7f5f3e'], screen: ['#2a3140', '#222833', '#1a1f28'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// toon 3 nada + bayangan jatuh: cahaya terarah (π) memberi nada, cahaya sekitar (0,5π) jadi nada bayangan
const gradTex = (() => { const d = new Uint8Array([40, 40, 40, 40, 40, 112, 112, 168]); const t = new THREE.DataTexture(d, 8, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const sun = new THREE.DirectionalLight('#ffffff', Math.PI); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target, new THREE.AmbientLight("#ffffff", 0.38 * Math.PI));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
function cel(pal) {
  const [a] = C3(PAL[pal]), y = C3(PAL.yellow)[0];
  const m = new THREE.MeshToonMaterial({ color: a.clone(), gradientMap: gradTex, side: THREE.DoubleSide });
  m.userData.base = a.clone();
  m.hl = (pal2, k) => { m.color.copy(m.userData.base).lerp(C3(PAL[pal2])[0], k); };
  return m;
}
const glow = hex => new THREE.MeshBasicMaterial({ color: hex });   // benda bercahaya: tidak terkena bayangan
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const cylZ = (r1, r2, h, n = 32) => new THREE.CylinderGeometry(r1, r2, h, n).rotateX(Math.PI / 2);
const extr = (shape, depth, seg = 24) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg });
function annulus(R, r, a0 = 0, a1 = TAU) {
  const s = new THREE.Shape();
  if (a1 - a0 >= TAU - 1e-6) { s.absarc(0, 0, R, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, r, 0, TAU, true); s.holes.push(h); }
  else { s.absarc(0, 0, R, a0, a1, false); s.lineTo(r * Math.cos(a1), r * Math.sin(a1)); s.absarc(0, 0, r, a1, a0, true); s.closePath(); }
  return s;
}
// roda gigi jam: gigi trapesium + jari-jari berlubang
function gearShape(R, n, d, spokes = 4, club = false) {
  const s = new THREE.Shape(), p = TAU / n, rb = R - d;
  for (let i = 0; i < n; i++) {
    const a = i * p;
    const pts = club ? [[rb, a], [R, a + 0.5 * p], [R * 0.985, a + 0.62 * p], [rb, a + 0.66 * p]]
                     : [[rb, a], [R, a + 0.2 * p], [R, a + 0.45 * p], [rb, a + 0.65 * p]];
    pts.forEach(([r, aa], j) => (i === 0 && j === 0 ? s.moveTo : s.lineTo).call(s, r * Math.cos(aa), r * Math.sin(aa)));
  }
  s.closePath();
  if (spokes) {
    const r2 = rb - Math.max(0.35, R * 0.1), r1 = Math.max(0.75, R * 0.24), g = 0.32 / Math.max(1, R * 0.35) + 0.12;
    for (let k = 0; k < spokes; k++) {
      const a0 = k * TAU / spokes + g, a1 = (k + 1) * TAU / spokes - g;
      const h = new THREE.Path(); h.absarc(0, 0, r2, a0, a1, false); h.lineTo(r1 * Math.cos(a1), r1 * Math.sin(a1));
      h.absarc(0, 0, r1, a1, a0, true); h.closePath(); s.holes.push(h);
    }
  }
  return s;
}
function makeWheel(R, n, d, thick, mat, opts = {}) {
  const g = new THREE.Group();
  g.add(mesh(extr(gearShape(R, n, d, opts.spokes ?? 4, opts.club), thick, 12), mat));
  const arbor = mesh(cylZ(0.42, 0.42, opts.arborH ?? 2.6), opts.arborMat ?? mat, 0, 0, thick / 2);
  g.add(arbor);
  if (opts.pinion) g.add(mesh(cylZ(opts.pinion, opts.pinion, 0.7, 12), opts.arborMat ?? mat, 0, 0, -0.5));
  g.add(mesh(cylZ(0.5, 0.5, 0.22, 16), rubyMat, 0, 0, (opts.arborH ?? 2.6) / 2 + thick / 2));
  return g;
}
// pita spiral dinamis (per utama & per rambut): dinding luar, dalam, dan tutup atas
function makeRibbon(n, mat, z0, z1, th) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6 * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 6 * 3), 3));
  const idx = [];
  for (let f = 0; f < 3; f++) for (let i = 0; i < n - 1; i++) { const a = f * n * 2 + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false;
  m.userData.update = (fn) => {   // fn(s 0..1) -> [x, y]
    const pos = geo.attributes.position.array, nor = geo.attributes.normal.array;
    for (let i = 0; i < n; i++) {
      const [x, y] = fn(i / (n - 1)), [x2, y2] = fn(Math.min(1, (i + 1) / (n - 1) + 1e-4));
      let tx = x2 - x, ty = y2 - y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = ty, ny = -tx, h = th / 2;
      const ox = x + nx * h, oy = y + ny * h, ix = x - nx * h, iy = y - ny * h;
      const faces = [[[ox, oy, z0], [ox, oy, z1], [nx, ny, 0]], [[ix, iy, z1], [ix, iy, z0], [-nx, -ny, 0]], [[ix, iy, z1], [ox, oy, z1], [0, 0, 1]]];
      faces.forEach(([A, B, Nn], fi) => { const k = (fi * n * 2 + i * 2) * 3; pos.set(A, k); pos.set(B, k + 3); nor.set(Nn, k); nor.set(Nn, k + 3); });
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
  };
  return m;
}

// ---------- dunia (mm; meja z = 0; gunting rebah di atas kertas) ----------
const root = new THREE.Group(); scene.add(root);
root.rotation.y = -0.38;
const base = new THREE.Group(); root.add(base);
base.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 1).normalize(), V(1, 0, -1).normalize(), V(0, 1, 0)));
const W0 = new THREE.Group(); base.add(W0);                   // koordinat dunia diorama
const box = (sx, sy, sz, mat, x, y, z, p = W0) => { const m = mesh(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z); p.add(m); return m; };
const rbox = (sx, sy, sz, r, mat, x, y, z, p = W0) => { const m = mesh(new RoundedBoxGeometry(sx, sy, sz, 3, Math.min(r, sx / 2 - .01, sy / 2 - .01, sz / 2 - .01)), mat, x, y, z); p.add(m); return m; };
const cz = (r, h, mat, x, y, z, p = W0, n = 28) => { const m = mesh(cylZ(r, r, h, n), mat, x, y, z); p.add(m); return m; };
const M = { wood: cel('deskwood'), mat: cel('mat'), paper: cel('paper'), blade: cel('blade'), edge: cel('edge'), brass: cel('brass'), ink: cel('ink'),
  steel: cel('steel'), handleA: cel('handle'), handleB: cel('handle'), skewer: cel('skewer'), yellow: cel('yellow'), white: cel('white') };

// meja kayu + alas potong hijau bergaris + alat tulis (konteks)
rbox(1400, 900, 40, 12, M.wood, 120, 40, -20 - 1.2);
rbox(460, 320, 2.4, 3, M.mat, 60, 0, -0.1);
{ const cv = document.createElement('canvas'); cv.width = 920; cv.height = 640; const c = cv.getContext('2d');
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (let x = 0; x <= 920; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 640); c.stroke(); }
  for (let y = 0; y <= 640; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(920, y); c.stroke(); }
  c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.6)'; for (let x = 0; x <= 920; x += 100) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 640); c.stroke(); }
  const tx = new THREE.CanvasTexture(cv); const pl = mesh(new THREE.PlaneGeometry(460, 320), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }), 60, 0, 1.25); pl.userData.sign = true; W0.add(pl); }
const pencil = new THREE.Group(); pencil.position.set(220, 150, 4); pencil.rotation.z = 0.5; W0.add(pencil);
pencil.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 150, 6).rotateZ(Math.PI / 2), cel('tape'), 0, 0, 0));
pencil.add(mesh(new THREE.ConeGeometry(3.6, 16, 6).rotateZ(-Math.PI / 2), cel('skewer'), 83, 0, 0));
pencil.add(mesh(new THREE.CylinderGeometry(3.7, 3.7, 10, 12).rotateZ(Math.PI / 2), cel('red'), -80, 0, 0));
const ruler = rbox(300, 30, 2, 2, cel('glass'), -120, -150, 1.2); ruler.rotation.z = -0.2;
for (const [x, y, r, s] of [[260, -120, 0.4, 30], [300, -60, 1.3, 22], [-200, 140, 2.1, 26]]) { const sc = rbox(s, s * 0.7, 0.3, 0.5, M.paper, x, y, 1.4); sc.rotation.z = r; }

// kertas: bagian utuh + dua sayap yang sudah terpotong (dihitung ulang tiap frame)
const PX0 = 12, PX1 = 210, PW = 150, PZ = 3.0;
const paperWhole = rbox(1, PW, 0.3, 0.1, M.paper, 0, 0, PZ);
const paperL = rbox(1, PW / 2, 0.3, 0.1, M.paper, 0, 0, PZ), paperR = rbox(1, PW / 2, 0.3, 0.1, M.paper, 0, 0, PZ);
const paperFold = new THREE.Group(); W0.add(paperFold);                                      // lipatan saat baut longgar
const foldFlap = rbox(30, 40, 0.3, 0.1, glow('#eceae3'), 15, 0, 0, paperFold);
const paperFall = rbox(1, PW, 0.3, 0.1, M.paper, 0, 0, PZ); paperFall.visible = false;         // potongan yang jatuh di akhir
const cutLine = mesh(new THREE.BoxGeometry(1, 0.6, 0.35), glow('#16171b'), 0, 0, PZ + 0.05); W0.add(cutLine);
// tusuk sate (benda keras, bab tuas)
const skew = new THREE.Group(); W0.add(skew);
const skewA = new THREE.Group(), skewB = new THREE.Group(); skew.add(skewA, skewB);
skewA.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 10), M.skewer, 0, 30, 0)); skewB.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 10), M.skewer, 0, -30, 0));
skewB.add(mesh(new THREE.ConeGeometry(1.6, 8, 10).rotateZ(Math.PI), M.skewer, 0, -64, 0));

// ---------- gunting (lokal: poros di 0; x ke ujung bilah; tiap belahan berputar ±a) ----------
// lapisan z: bilah bawah (A) 0..1,8, bilah atas (B) 1,8..3,6; bidang kontak di z = 1,8
const SCZ = 5.2, SCZ2 = 7.0;                             // tinggi gunting rebah (bertumpu di gagang), dan saat dibalik
const SC = new THREE.Group(); SC.position.set(-20, 0, SCZ); W0.add(SC);
const BL = 96, E = 1.4, BTH = 1.8, XT = BL + 5;           // panjang bilah, jarak tepi potong ke garis poros, tebal, ujung
const bEdge = x => -E + (x > BL - 14 ? 3.4 * Math.pow((x - (BL - 14)) / (XT - (BL - 14)), 2) : 0);
const bWid = x => { const u = clamp((x - 2) / (XT - 2)); return lerp(9.4, 11.8, smooth(2, 18, x)) * Math.pow(1 - Math.pow(u, 2.3), 0.62) + 0.25; };
// bilah dibentuk per irisan: muka dalam rata, tepi potong + bevel miring, punggung membulat, makin tipis ke ujung
function bladeGeo() {
  const N = 90, xs = [];
  for (let i = 0; i <= N; i++) { const u = i / N; xs.push(2 + (XT - 2) * (1 - Math.pow(1 - u, 1.35))); }
  const sec = x => { const ey = bEdge(x), w = bWid(x), sy = ey + w, u = clamp((x - 2) / (XT - 2)), zo = 0.55 * Math.pow(u, 1.5);
    const bw = Math.min(2.9, w * 0.4), r = Math.min(0.9, w * 0.22);
    return [[ey, BTH], [ey, BTH - 0.16], [ey + bw, zo], [sy - r, zo], [sy, (zo + BTH) / 2], [sy - r, BTH]]; };
  const body = [], bev = [];
  const P = (S, j, x) => [x, S[j][0], S[j][1]];
  for (let i = 0; i < N; i++) {
    const A = sec(xs[i]), B = sec(xs[i + 1]);
    for (let k = 0; k < 6; k++) {
      const k2 = (k + 1) % 6, arr = k <= 1 ? bev : body;
      const a = P(A, k, xs[i]), b = P(A, k2, xs[i]), c = P(B, k2, xs[i + 1]), d = P(B, k, xs[i + 1]);
      arr.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  const S = sec(XT); for (let k = 1; k < 5; k++) body.push(...P(S, 0, XT), ...P(S, k, XT), ...P(S, k + 1, XT));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...body, ...bev], 3));
  g.addGroup(0, body.length / 3, 0); g.addGroup(body.length / 3, bev.length / 3, 1);
  g.computeVertexNormals();
  return g;
}
const BLADE_G = bladeGeo();
// pelat poros baja (ricasso) + lubang baut tertutup sekrup
const PLATE_G = (() => { const s = new THREE.Shape(); s.absarc(0, 0, 9.2, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, 2.3, 0, TAU, true); s.holes.push(h); return extr(s, BTH, 40); })();
// gagang plastik cetak: batang dari kerah poros melebar ke cincin jari, satu kontur utuh (tanpa sambungan)
function handleShape(s) {
  const sh = new THREE.Shape();
  if (s > 0) {   // A: lubang jari besar (lonjong), ke arah -y
    const cx = -72, cy = -24, rx = 24, ry = 15, a1 = deg(72), a2 = deg(-12);
    const p1 = [cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)], p2 = [cx + rx * Math.cos(a2), cy + ry * Math.sin(a2)];
    sh.moveTo(-9.5, 5);
    sh.bezierCurveTo(-26, 4, p1[0] + 14, p1[1] - 2.8, p1[0], p1[1]);
    sh.absellipse(cx, cy, rx, ry, a1, TAU + a2, false);
    sh.bezierCurveTo(p2[0] + 3, p2[1] + 9, -24, -10, -9.5, -8.5);
    sh.closePath();
    const h = new THREE.Path(); h.absellipse(cx, cy, rx - 6.5, ry - 5.2, 0, TAU, true); sh.holes.push(h);
  } else {       // B: lubang ibu jari (bulat), ke arah +y
    const cx = -64, cy = 18, rx = 15.5, ry = 13, a1 = deg(285), a2 = deg(12);
    const p1 = [cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)], p2 = [cx + rx * Math.cos(a2), cy + ry * Math.sin(a2)];
    sh.moveTo(-9.5, -4);
    sh.bezierCurveTo(-26, -3, p1[0] + 9, p1[1] + 2, p1[0], p1[1]);
    sh.absellipse(cx, cy, rx, ry, a1, a2, true);
    sh.bezierCurveTo(p2[0] + 2, p2[1] - 8, -24, 8, -9.5, 8);
    sh.closePath();
    const h = new THREE.Path(); h.absellipse(cx, cy, rx - 5, ry - 4.8, 0, TAU, true); sh.holes.push(h);
  }
  return sh;
}
const HANDLE_OPT = { depth: 3.0, bevelEnabled: true, bevelThickness: 1.0, bevelSize: 1.1, bevelSegments: 3, curveSegments: 56 };
// cap "STAINLESS" tergores di bilah atas
const etchMat = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(60,64,74,.55)'; c.font = '700 44px Helvetica Neue, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('STAINLESS · 8"', 256, 34);
  const tx = new THREE.CanvasTexture(cv); return new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }); })();
function makeHalf(s, layerZ, hMat) {
  const g = new THREE.Group(); g.position.z = layerZ;
  const flipG = geo => (s > 0 ? geo : geo.clone().rotateX(Math.PI).translate(0, 0, BTH));
  const blade = new THREE.Mesh(flipG(BLADE_G), [M.blade, M.edge]); g.add(blade);
  g.add(mesh(PLATE_G, M.blade));
  // gagang: A menjorok ke bawah (sisi luar bawah), B ke atas
  const hd = mesh(new THREE.ExtrudeGeometry(handleShape(s), HANDLE_OPT), hMat, 0, 0, s > 0 ? -2.2 : 1.0); g.add(hd);
  if (s < 0) { const pl = mesh(new THREE.PlaneGeometry(30, 3.75), etchMat, 34, -4.6, BTH + 0.03); pl.rotation.z = Math.PI; g.add(pl); }
  g.userData = { blade, edgeY: -s * E };
  return g;
}
const halfA = makeHalf(1, 0, M.handleA), halfB = makeHalf(-1, BTH, M.handleB);
const hingeA = new THREE.Group(), hingeB = new THREE.Group(); SC.add(hingeA, hingeB); hingeA.add(halfA); hingeB.add(halfB);
// baut poros: kepala keju berbibir + alur obeng, ring (washer), batang berulir, mur kubah di bawah
const screw = new THREE.Group(); SC.add(screw);
const HEAD_G = new THREE.LatheGeometry([V(0, 0), V(4.8, 0), V(4.8, 0.55), V(4.05, 1.6), V(0, 1.6)].map(p => new THREE.Vector2(p.x, p.y)), 40).rotateX(Math.PI / 2);
screw.add(mesh(HEAD_G, M.steel, 0, 0, 2 * BTH + 0.45));
screw.add(mesh(new THREE.BoxGeometry(7.0, 1.0, 0.7), M.ink, 0, 0, 2 * BTH + 0.45 + 1.6 - 0.34));
screw.add(mesh(cylZ(2.15, 2.15, 6.4, 20), M.steel, 0, 0, 2 * BTH + 0.45 - 3.2));
for (let k = 0; k < 6; k++) screw.add(mesh(new THREE.TorusGeometry(2.15, 0.32, 6, 20), M.steel, 0, 0, 2 * BTH - 2.6 - k * 0.62));
const washer = mesh(new THREE.ExtrudeGeometry(annulus(5.9, 2.4), { depth: 0.45, bevelEnabled: false, curveSegments: 40 }), M.brass, 0, 0, 2 * BTH); SC.add(washer);
const nut = new THREE.Group(); SC.add(nut);
nut.add(mesh(new THREE.SphereGeometry(4.0, 28, 10, 0, TAU, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 0.42), M.steel, 0, 0, -0.05));
// titik potong (bercahaya) + jejak
const dot = mesh(new THREE.SphereGeometry(1.7, 16, 12), glow('#ffcf33'), 0, 0, 2 * BTH + 0.2); SC.add(dot);
const dotRing = mesh(new THREE.TorusGeometry(4.2, 0.6, 8, 32), glow('#ffcf33'), 0, 0, 2 * BTH + 0.2); SC.add(dotRing);

// ---------- pembantu waktu ----------
const pop = (t, s0) => (t > s0 && t < s0 + 0.42) ? Math.sin(Math.PI * (t - s0) / 0.42) : 0;

// ---------- timeline (14 babak, dikunci ke kata) ----------
const LS = L;
const angKeys = [   // setengah sudut buka (derajat)
  [0, 17], [T(0, 'longgar') - 0.2, 17], [T(0, 'terlipat') - 0.5, 17], [T(0, 'terlipat') + 0.3, 5], [L[0].e + 0.4, 5], [L[1].s + 0.6, 17],
  [L[3].s, 17], [T(3, 'gagangnya'), 9], [T(3, 'bilahnya'), 16], [T(3, 'jadi'), 9], [L[3].e, 15],
  [T(4, 'benda'), 18], [T(4, 'dipotong') - 0.1, 18], [T(4, 'dekat') + 0.25, 4.5], [L[4].e, 4.5], [L[5].s + 0.4, 12],
  [L[7].s, 12], [T(8, 'saat') - 0.2, 21], [T(8, 'ujung') + 0.2, 0.7], [L[8].e + 0.2, 0.7], [L[9].s + 0.3, 21],
  [T(9, 'putus') + 0.1, 0.7], [T(9, 'longgar') - 0.2, 15], [T(9, 'terlipat') - 0.3, 15], [T(9, 'terlipat') + 0.3, 5], [L[9].e + 0.3, 5], [L[10].s + 0.5, 15],
  [L[11].s, 15], [T(11, 'meremas'), 7], [L[11].e, 7], [L[12].s + 0.2, 15], [T(12, 'merenggangkan') - 0.2, 6], [T(12, 'makanya'), 6], [L[12].e + 0.3, 14],
  [L[13].s, 20], [T(13, 'tuas') - 0.1, 1.0], [T(13, 'tuas') + 0.5, 20], [T(13, 'penggeser') - 0.1, 1.0], [T(13, 'penggeser') + 0.5, 20], [T(13, 'titik') - 0.2, 20], [T(13, 'titik') + 1.4, 0.6], [DUR, 0.6]];
const scXKeys = [[0, -20], [L[8].e + 0.2, -20], [L[9].s + 0.3, 40], [L[10].s + 0.2, 40], [L[10].s + 1.6, -20], [L[13].s, -20], [T(13, 'tuas') + 0.5, -20], [T(13, 'penggeser') - 0.3, 52], [T(13, 'penggeser') + 0.5, 52], [T(13, 'titik') - 0.4, 128], [DUR, 128]];
const looseKeys = [[0, 0], [T(0, 'longgar') - 0.1, 0], [T(0, 'longgar') + 0.5, 1], [T(1, 'bongkar') - 0.1, 1], [T(1, 'bongkar') + 0.6, 0],
  [T(9, 'longgar') - 0.1, 0], [T(9, 'longgar') + 0.5, 1], [L[9].e + 0.2, 1], [L[10].s + 0.5, 0]];
const gapLeftKeys = [[0, 0], [T(12, 'merenggangkan') - 0.4, 0], [T(12, 'merenggangkan') + 0.3, 1], [T(12, 'makanya'), 1], [T(12, 'dibalik'), 0]];
const flipKeys = [[0, 0], [T(12, 'dibalik') - 0.1, 0], [T(12, 'dibalik') + 0.9, 1], [L[13].s - 0.1, 1], [L[13].s + 0.6, 0]];
const explodeKeys = [[0, 0], [T(2, 'tiga') - 0.1, 0], [T(2, 'tiga') + 0.7, 1], [L[2].e, 1], [L[3].s + 0.5, 0]];
const skewKeys = [[0, 0], [T(4, 'benda') - 0.4, 0], [T(4, 'benda') + 0.2, 1], [L[5].s + 0.5, 1], [L[5].s + 0.9, 0]];
// sapuan menutup: titik potong berjalan rata dari baut ke ujung, sudut diturunkan dari posisinya (a = asin(e / x))
const SWEEPS = [[T(8, 'saat') - 0.2, T(8, 'ujung') + 0.2], [L[9].s + 0.3, T(9, 'putus') + 0.1], [T(13, 'titik') - 0.2, T(13, 'titik') + 1.4]];
const ang = t => {
  for (const [t0, t1] of SWEEPS) if (t > t0 && t < t1) {
    const a0 = track(angKeys, t0 + 1e-4), u = clamp((t - t0) / (t1 - t0)), k = 0.5 * (u + easeIO(u));
    const x = lerp(E / Math.sin(deg(a0)), BL, k); return Math.max(0.7, Math.asin(Math.min(1, E / x)) * 180 / Math.PI);
  }
  return track(angKeys, t);
};
const contactX = a => Math.min(BL, E / Math.sin(deg(Math.max(0.3, a))));
// kertas: sobekan = jarak terjauh yang pernah dicapai titik potong (selama baut rapat), direset di babak tertentu
const RESETS = [0, L[1].s + 0.6, T(13, 'titik') + 99];
const DTs = 1 / 120, NSs = Math.ceil(DUR / DTs) + 2, CUT = new Float32Array(NSs);
{ let m = 0;
  for (let i = 0; i < NSs; i++) { const t = i * DTs;
    if (RESETS.some(r => t >= r && t < r + DTs)) m = 0;
    const tight = track(looseKeys, t) < 0.3 && track(gapLeftKeys, t) < 0.3 && track(explodeKeys, t) < 0.1;
    const cx = track(scXKeys, t) + contactX(ang(t));
    if (tight && t > L[7].s) m = Math.max(m, cx);
    CUT[i] = m; } }
const cutAt = t => CUT[Math.min(NSs - 1, Math.max(0, Math.round(t / DTs)))];
const foldAt = t => Math.max(hlw(t, T(0, 'terlipat') - 0.2, L[1].s + 0.4), hlw(t, T(9, 'terlipat') - 0.2, L[10].s + 0.3), hlw(t, T(12, 'merenggangkan'), T(12, 'dibalik') - 0.1));

// kamera: [x, y, z, tinggi pandang, kemiringan 0 = mata elang .. 1 = isometrik]
const camKeys = [
  [0, [80, 30, 0, 1500, 0.08]], [T(0, 'gunting') + 0.2, [40, 0, 0, 520, 0.5]], [T(0, 'bilahnya'), [55, 0, 4, 140, 1]], [T(0, 'longgar'), [-5, 0, 6, 110, 1]],
  [T(0, 'terlipat') - 0.3, [30, 0, 4, 150, 1]], [L[1].s, [25, 0, 4, 170, 1]], [T(1, 'bongkar'), [-5, 0, 6, 120, 1]],
  [L[2].s, [0, 0, 6, 260, 1]], [T(2, 'tiga') + 0.6, [-10, 0, 8, 320, 1]], [T(2, 'baut', 1), [0, 0, 8, 120, 1]], [L[2].e, [0, 0, 8, 130, 1]],
  [L[3].s + 0.3, [-15, 0, 4, 250, 1]], [L[3].e, [-10, 0, 4, 240, 1]],
  [L[4].s, [5, 0, 4, 150, 1]], [T(4, 'dekat'), [8, 0, 4, 120, 1]], [L[4].e, [8, 0, 4, 130, 1]],
  [L[5].s, [30, 0, 4, 200, 1]], [L[6].e, [35, 0, 4, 210, 1]],
  [L[7].s, [40, 0, 4, 230, 1]], [L[8].s, [45, 0, 4, 220, 1]], [L[8].e, [55, 0, 4, 200, 1]],
  [L[9].s, [70, 0, 4, 230, 1]], [T(9, 'putus') + 0.3, [90, 0, 4, 230, 1]], [T(9, 'longgar'), [55, 0, 6, 140, 1]], [L[9].e, [70, 0, 4, 170, 1]],
  [L[10].s, [-10, 0, 4, 260, 1]], [L[11].s, [-55, 0, 4, 280, 1]], [L[12].e - 1.5, [-55, 0, 4, 280, 1]], [L[12].e, [-25, 0, 4, 260, 1]],
  [L[13].s, [60, 0, 2, 300, 1]], [T(13, 'titik'), [130, 0, 2, 320, 1]], [DUR - 1.2, [120, 0, 0, 420, 0.7]], [DUR, [110, 20, 0, 700, 0.35]],
];

// callout
const tagDefs = [];
const tagAdd = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
const AT = (obj, x = 0, y = 0, z = 0) => () => obj.localToWorld(V(x, y, z));
tagAdd(T(0, 'bilahnya'), T(0, 'longgar') - 0.1, 'Bilah · masih tajam', AT(halfA, 70, 4, 2), 'r', 'hi');
tagAdd(T(0, 'longgar'), L[0].e, 'Baut longgar', AT(screw, 0, 0, 6), 'r', 'warn');
tagAdd(T(0, 'terlipat'), L[1].s + 0.3, 'Kertas terlipat', AT(paperFold, 15, 0, 6), 'r', 'warn');
tagAdd(T(2, 'dua'), T(2, 'satu') - 0.1, 'Bilah 1', AT(halfA, 60, 5, 0), 'l', 'hi');
tagAdd(T(2, 'dua') + 0.25, T(2, 'satu') - 0.1, 'Bilah 2', AT(halfB, 60, -5, 2), 'r', 'hi');
tagAdd(T(2, 'satu'), L[2].e + 0.2, 'Baut = poros', AT(screw, 0, 0, 6), 'r', 'hi');
tagAdd(T(3, 'gagangnya'), T(3, 'bilahnya') - 0.1, 'Gagang panjang', AT(halfA, -64, 18, 3), 'l', '');
tagAdd(T(3, 'bilahnya'), L[3].e + 0.2, 'Bilah pendek', AT(halfA, 60, 5, 2), 'r', '');
tagAdd(T(4, 'dekat'), L[4].e + 0.3, 'Dekat baut = paling kuat', AT(skew, 0, 0, 2), 'l', 'hi');
tagAdd(T(2, 'kecil'), L[2].e + 0.2, 'Ring penahan', () => washer.localToWorld(V(-5.9, 0, 0.4)), 'l', '');
tagAdd(T(5, 'membelah') - 0.2, L[5].e + 0.2, 'Tepi miring (bevel)', AT(halfB, 58, E - 1.3, BTH), 'r', 'hi');
tagAdd(T(8, 'titik'), L[8].e + 0.3, 'Satu titik', () => dot.getWorldPosition(new THREE.Vector3()), 'r', 'hi');
tagAdd(T(9, 'rapat'), T(9, 'kalau') - 0.1, 'Menekan rapat', () => dot.getWorldPosition(new THREE.Vector3()), 'r', 'hi');
tagAdd(T(9, 'longgar'), L[9].e + 0.2, 'Titiknya hilang', AT(screw, 0, 0, 6), 'r', 'warn');

const titleDefs = [
  [0, '', 'Tajam, tapi <em>cuma melipat?</em>'],
  [L[1].s, '', 'Rahasianya <em>bukan di tajamnya</em>'],
  [L[2].s, 'Babak 1 · Bagian', 'Cuma <em>3 bagian</em>'],
  [L[3].s, 'Babak 1 · Tuas', 'Gunting adalah <em>tuas</em>'],
  [L[4].s, 'Babak 1 · Tuas', 'Dekat baut = <em>paling kuat</em>'],
  [L[5].s, 'Babak 2 · Geser', 'Bukan membelah, <em>menggeser</em>'],
  [L[7].s, 'Babak 3 · Rahasia', 'Bilahnya <em>melengkung</em>'],
  [L[8].s, 'Babak 3 · Rahasia', '<em>Satu titik</em> yang berjalan'],
  [L[9].s, 'Babak 3 · Rahasia', 'Longgar = <em>titiknya hilang</em>'],
  [L[10].s, 'Bonus · Kidal', 'Kenapa ada <em>gunting kidal?</em>'],
  [L[13].s, '', 'Tuas · penggeser · <em>satu titik</em>'],
];
const RED = '#e5484d', GRN = '#30a46c', GRY = '#8a8a8f', YEL = '#ffe259';
const chipDefs = [[0, 'Tajam', GRN], [T(0, 'longgar'), 'Baut longgar', RED], [T(1, 'bongkar'), 'Rapat', GRN], [L[3].s, 'Tuas', YEL], [L[5].s, 'Gaya geser', YEL],
  [L[7].s, 'Rahasia', YEL], [T(9, 'longgar'), 'Baut longgar', RED], [L[10].s + 0.5, 'Rapat', GRN], [L[11].s, 'Tangan kanan', GRN], [L[12].s, 'Tangan kiri', RED], [T(12, 'dibalik'), 'Gunting kidal', GRN], [L[13].s, 'Rapat', GRN]];
const stampDefs = [
  [T(0, 'terlipat'), L[0].e + 0.35, 'Cuma terlipat', ''],
  [T(1, 'bongkar'), L[1].e + 0.4, 'Kita bongkar!', 'snd'],
  [T(5, 'pisau'), L[5].e + 0.4, 'Bukan pisau', ''],
  [T(6, 'putus'), L[6].e + 0.4, 'Putus!', 'snd'],
  [T(8, 'ujung'), L[8].e + 0.35, 'Satu titik', 'snd'],
  [T(12, 'dibalik'), L[12].e + 0.4, 'Dibalik!', 'snd'],
];
const shakeAt = [T(1, 'bongkar'), T(6, 'putus'), T(13, 'titik') + 1.2];

// ---------- caption karaoke ----------
const chunks = [];
for (let li = 0; li < NL; li++) {
  let cur = [];
  const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => { cur.push(w); if (/[.?!:…]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 6 || i === ws.length - 1) { chunks.push(cur); cur = []; } });
}
const allW = chunks.flat();
allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });

// ---------- model per waktu ----------
const S = { t: 0, a: 17, xc: 0 };
function updateModel(t) {
  S.t = t;
  root.rotation.y = -0.38 + 0.04 * Math.sin(t * 0.33);
  const a = S.a = ang(t), loose = track(looseKeys, t), gapL = track(gapLeftKeys, t), ex = easeIO(track(explodeKeys, t)), fl = easeIO(track(flipKeys, t));
  SC.position.x = track(scXKeys, t);
  hingeA.rotation.z = deg(a); hingeB.rotation.z = -deg(a);
  const gap = Math.max(loose, gapL) * 2.4;
  halfA.position.z = -gap * 0.3; halfB.position.z = BTH + ex * 16 + gap;
  hingeA.position.y = -ex * 26; hingeB.position.y = ex * 26; hingeA.position.x = hingeB.position.x = ex * 6;
  screw.position.z = ex * 42 + loose * 3.2 + gap; screw.rotation.z = loose * 4 + ex * 2;
  washer.position.z = 2 * BTH + ex * 28 + gap;
  nut.position.z = -gap * 0.3;
  SC.rotation.x = Math.PI * fl;                                         // dibalik = cermin (gunting kidal)
  SC.position.z = lerp(SCZ, SCZ2, fl) + Math.sin(Math.PI * fl) * 30;
  // titik potong
  const xc = S.xc = contactX(a);
  const tight = loose < 0.3 && gapL < 0.3 && ex < 0.1;
  const dotOn = tight && (hlw(t, T(8, 'titik') - 0.2, L[9].e - 0) > 0.05 && t < T(9, 'longgar') + 0.2);
  dot.visible = dotRing.visible = dotOn || (t > L[11].s && t < L[11].e + 0.3) || (t > T(13, 'titik') - 0.1 && t < T(13, 'titik') + 1.3);
  dot.position.set(xc, 0, 2 * BTH + 0.2); dotRing.position.set(xc, 0, 2 * BTH + 0.2); dotRing.scale.setScalar(1 + 0.25 * Math.sin(t * 9) + 0.6 * pop(t, T(9, 'rapat')));
  // kertas
  const cx = cutAt(t), cut = Math.max(PX0, Math.min(PX1, cx));
  const done = t > T(13, 'titik') + 1.25;
  paperWhole.visible = cut < PX1 - 0.5 && !done;
  paperWhole.scale.x = PX1 - cut; paperWhole.position.set((cut + PX1) / 2, 0, PZ - 1.2);
  const wl = cut - PX0, open = Math.min(1.2, wl * 0.01);
  paperL.visible = paperR.visible = wl > 0.5;
  paperL.scale.x = paperR.scale.x = Math.max(0.01, wl); paperL.position.set(PX0 + wl / 2, PW / 4 + open, PZ - 1.2); paperR.position.set(PX0 + wl / 2, -PW / 4 - open, PZ - 1.2);
  cutLine.visible = wl > 0.5 && !done; cutLine.scale.x = Math.max(0.01, wl); cutLine.position.set(PX0 + wl / 2, 0, PZ - 1.0);
  if (done) { const k = easeIO(clamp((t - T(13, 'titik') - 1.25) / 1.0)); paperR.position.y = -PW / 4 - 2 - 26 * k; paperR.rotation.z = -0.25 * k; paperL.position.y = PW / 4 + 2 + 8 * k; paperL.scale.x = paperR.scale.x = PX1 - PX0; paperL.position.x = paperR.position.x = (PX0 + PX1) / 2; }
  else { paperR.rotation.z = 0; }
  // lipatan kertas
  const fo = foldAt(t);
  paperFold.visible = fo > 0.02; paperFold.position.set(SC.position.x + 34, 0, PZ - 1.0); paperFold.rotation.x = -1.1 * fo; foldFlap.scale.set(1, 1, 1);
  // tusuk sate
  const sk = track(skewKeys, t); skew.visible = sk > 0.01; skew.position.set(SC.position.x + 18, 0, SCZ + BTH + (1 - backOut(sk)) * 40);
  const snapK = smooth(T(4, 'dekat') + 0.15, T(4, 'dekat') + 0.5, t) * (t < L[5].s + 0.4 ? 1 : 0);
  skewA.position.y = 4 * snapK; skewA.rotation.x = 0.25 * snapK; skewB.position.y = -4 * snapK; skewB.rotation.x = -0.25 * snapK;
  // sorotan
  M.handleA.hl('yellow', hlw(t, T(3, 'gagangnya'), T(3, 'bilahnya')) * 0.6); M.handleB.hl('yellow', hlw(t, T(3, 'gagangnya'), T(3, 'bilahnya')) * 0.6);
  M.blade.hl('yellow', Math.max(hlw(t, T(0, 'bilahnya'), T(0, 'longgar')), hlw(t, T(2, 'dua'), T(2, 'satu')), hlw(t, T(3, 'bilahnya'), L[3].e)) * 0.55);
  M.brass.hl(loose > 0.3 ? 'red' : 'yellow', Math.max(hlw(t, T(2, 'satu'), L[2].e + 0.3), hlw(t, T(0, 'longgar'), L[0].e) , hlw(t, T(9, 'longgar'), L[9].e)));
}

const tmpV = new THREE.Vector3();
function updateCamera(t) {
  const c = window.CAM_OVERRIDE || track(camKeys, t);
  const drift = 1 - 0.012 * Math.sin(t * 0.7);
  const h = c[3] * drift, tilt = c[4] ?? 1;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -h * W / H / 2; camera.right = h * W / H / 2;
  base.updateMatrixWorld(true);
  const target = W0.localToWorld(tmpV.set(c[0], c[1], c[2]));
  const dir = V(0.05, 1, 0.05).normalize().lerp(V(1, 1.7, 1).normalize(), tilt).normalize();
  const dist = 3000 + h * 2;
  camera.near = 10; camera.far = dist + h * 3 + 3000;
  edge.mat.uniforms.far.value = camera.far - camera.near;
  const sb = Math.max(40, h * 0.9);
  sun.target.position.copy(target); sun.position.copy(target).addScaledVector(V(-0.35, 1, 0.75).normalize(), sb * 3 + 200);
  Object.assign(sun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: sb * 6 + 600 }); sun.shadow.camera.updateProjectionMatrix();
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.up.copy(V(-1, 0, -1).normalize().lerp(V(0, 1, 0), smooth(0, 0.6, tilt)).normalize());
  camera.lookAt(target);
  camera.updateMatrixWorld();
  camera.position.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), h * 0.06);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  let sh = 0; for (const s of shakeAt) if (t > s && t < s + 0.4) sh = Math.max(sh, 1 - (t - s) / 0.4);
  $('shake').style.transform = sh ? `translate(${(Math.sin(t * 91) * 14 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 10 * sh).toFixed(1)}px)` : '';
}
function project(v) { const p = (v.isVector3 ? v.clone() : v).project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }

// ---------- overlay ----------
const card = document.createElement('div'); card.className = 'ov'; card.id = 'card';
card.style.cssText = 'left:64px;right:64px;top:1180px;height:330px;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border:1px solid rgba(22,23,27,.12);border-radius:26px;box-shadow:0 18px 50px rgba(22,23,27,.18);overflow:hidden;opacity:0';
card.innerHTML = '<div id="cardK" style="position:absolute;left:24px;top:18px;font:700 17px ui-monospace,Menlo;letter-spacing:.14em;color:#6c6e76"></div><svg id="cardS" viewBox="0 0 952 330" style="position:absolute;inset:0;width:100%;height:100%"></svg>';
$('stage').insertBefore(card, $('cap'));
const tagEls = tagDefs.map(d => { const el = document.createElement('div'); el.className = 'tag ' + d.cls; el.innerHTML = `<span>${d.text}</span>`; $('tags').appendChild(el); return el; });
const arrowSVG = (x0, y0, x1, y1, col, w = 8) => { const a = Math.atan2(y1 - y0, x1 - x0), h = w * 3.2;
  return `<line x1="${x0}" y1="${y0}" x2="${x1 - Math.cos(a) * h * 0.8}" y2="${y1 - Math.sin(a) * h * 0.8}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${x1} ${y1} L${x1 - Math.cos(a - .45) * h} ${y1 - Math.sin(a - .45) * h} L${x1 - Math.cos(a + .45) * h} ${y1 - Math.sin(a + .45) * h} Z" fill="${col}"/>`; };
const BLADE_PATH = 'M0 -14 L560 -3 L600 0 L560 3 L0 14 Z';
let lastTitle = -1, lastChunk = -1, lastStamp = -1;
function updateOverlay(t) {
  // judul babak: tampil sesaat
  let ti = 0; titleDefs.forEach((d, i) => { if (t >= d[0]) ti = i; });
  const tEl = $('title');
  if (ti !== lastTitle) { tEl.innerHTML = titleDefs[ti][2]; lastTitle = ti; }
  const t0 = titleDefs[ti][0], hold = ti === 0 ? 4.4 : 3.0, tin = clamp((t - t0) / 0.45), tout = clamp((t - t0 - hold) / 0.45);
  tEl.style.opacity = (Math.min(1, tin * 1.6) * (1 - tout)).toFixed(3);
  tEl.style.transform = `translateY(${(30 * Math.pow(1 - tin, 3) - 18 * tout).toFixed(1)}px)`;
  tEl.style.clipPath = `inset(0 ${(100 * (1 - easeIO(tin))).toFixed(1)}% 0 0)`;
  $('chap').textContent = titleDefs[ti][1] || 'Kita bongkar · Gunting';
  const segs = [[0, L[2].s], [L[2].s, L[5].s], [L[5].s, L[7].s], [L[7].s, L[10].s], [L[10].s, L[13].s], [L[13].s, DUR]];
  const prog = $('prog');
  if (!prog.children.length) segs.forEach(() => { const i2 = document.createElement('i'); i2.appendChild(document.createElement('b')); prog.appendChild(i2); });
  segs.forEach(([a, b], k) => (prog.children[k].firstChild.style.transform = `scaleX(${clamp((t - a) / (b - a)).toFixed(4)})`));
  // angka dari model
  let rn = '17°', ru = 'sudut buka';
  if (t >= L[3].s && t < L[5].s) { const x = t < L[4].s ? 25 : 18; rn = (66 / x).toFixed(1).replace('.', ',') + '×'; ru = 'tenaga jari (tuas)'; }
  else if (t >= L[8].s && t < L[10].s) { rn = Math.round(S.xc) + ' mm'; ru = 'titik potong dari baut'; }
  else { rn = Math.round(S.a * 2) + '°'; ru = 'sudut buka'; }
  $('rn').textContent = rn; $('ru').textContent = ru; $('rn').style.color = '';
  let ci = 0; chipDefs.forEach((d, i) => { if (t >= d[0]) ci = i; });
  const chip = $('chip'); chip.textContent = chipDefs[ci][1]; chip.style.setProperty('--dot', chipDefs[ci][2] === YEL ? '#e8b400' : chipDefs[ci][2]);
  // callout + panah gaya
  let svg = '';
  tagDefs.forEach((d, i) => {
    const el = tagEls[i];
    if (t < d.s || t > d.e + 0.2) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const [x, y] = project(d.anchor());
    const w = el.offsetWidth, h = el.offsetHeight, dx = d.side === 'r' ? 1 : -1;
    const lx = clamp(x + dx * 96, 40 + (dx < 0 ? w : 0), W - 40 - (dx > 0 ? w : 0)), ly = clamp(y - 96, 300, 1120);
    const p = clamp((t - d.s) / 0.35), o = clamp((t - d.e) / 0.2), ep = easeIO(p);
    el.style.left = (dx > 0 ? lx : lx - w) + 'px'; el.style.top = (ly - h / 2) + 'px';
    el.style.opacity = (clamp((p - 0.45) / 0.4) * (1 - o)).toFixed(3);
    el.style.transform = `translateX(${(dx * 12 * (1 - ep)).toFixed(1)}px)`;
    const col = d.cls === 'warn' ? RED : (d.cls === 'hi' ? '#e8b400' : '#16171b');
    const ex = lerp(x, lx, clamp(p / 0.6)), ey = lerp(y, ly, clamp(p / 0.6)), a = (1 - o).toFixed(3);
    svg += `<g opacity="${a}"><circle cx="${x}" cy="${y}" r="${(16 * ep).toFixed(1)}" fill="none" stroke="${col}" stroke-width="3" opacity=".5"/><circle cx="${x}" cy="${y}" r="7" fill="${col}" stroke="#fff" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" stroke="#16171b" stroke-width="2.5"/></g>`;
  });
  // tuas: panah tenaga jari (kecil) di gagang -> panah besar di dekat poros
  const lev = hlw(t, T(3, 'jadi') - 0.2, L[4].e);
  if (lev > 0.02) {
    const xl = t < L[4].s ? 25 : 18, F = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
    const [fx, fy] = project(halfB.localToWorld(V(-64, 18, 5))), [px, py] = project(halfA.localToWorld(V(xl, 4, 2))), [ox, oy] = project(SC.localToWorld(V(0, 0, 6)));
    const pulse = 0.85 + 0.15 * Math.sin(t * 6);
    // garis ukur lengan: poros -> cincin (lengan gaya) dan poros -> titik potong (lengan beban)
    const dim = (x0, y0, x1, y1, col, txt, off, lk = 1.9) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * off, ny = Math.cos(a) * off;
      const mx = clamp((x0 + x1) / 2 + nx * lk, 140, W - 140), my = (y0 + y1) / 2 + ny * lk;
      return `<line x1="${x0 + nx}" y1="${y0 + ny}" x2="${x1 + nx}" y2="${y1 + ny}" stroke="${col}" stroke-width="4" stroke-dasharray="10 8"/>` +
        `<line x1="${x0}" y1="${y0}" x2="${x0 + nx * 1.3}" y2="${y0 + ny * 1.3}" stroke="${col}" stroke-width="3"/><line x1="${x1}" y1="${y1}" x2="${x1 + nx * 1.3}" y2="${y1 + ny * 1.3}" stroke="${col}" stroke-width="3"/>` +
        `<rect x="${mx - 92}" y="${my - 24}" width="184" height="48" rx="12" fill="#fff" stroke="${col}" stroke-width="3"/><text x="${mx}" y="${my + 10}" text-anchor="middle" ${F} font-weight="800" font-size="28" fill="#16171b">${txt}</text>`; };
    svg += `<g opacity="${lev.toFixed(3)}">` + dim(ox, oy, fx, fy, '#16171b', 'gaya · 66 mm', 34) + dim(ox, oy, px, py, '#e8b400', `beban · ${xl} mm`, -30, 5.2) +
      `<circle cx="${ox}" cy="${oy}" r="12" fill="#ffe259" stroke="#16171b" stroke-width="4"/>` +
      arrowSVG(fx - 40, fy - 70, fx, fy, '#16171b', 6) + arrowSVG(px + 110 * pulse, py + 60 * pulse, px + 8, py + 4, '#e8b400', 16) +
      `<text x="${fx - 46}" y="${fy - 84}" ${F} font-weight="800" font-size="30" fill="#16171b" text-anchor="end">1×</text>` +
      `<text x="${px + 128}" y="${py + 112}" ${F} font-weight="900" font-size="48" fill="#16171b" text-anchor="start">${$('rn').textContent}</text></g>`;
  }
  // kidal: dorongan ibu jari
  const thumbR = hlw(t, T(11, 'ibu'), L[11].e + 0.2), thumbL = hlw(t, T(12, 'dorongan') - 0.1, T(12, 'makanya'));
  for (const [k, dir, col, txt] of [[thumbR, 1, GRN, 'Ibu jari kanan → bilah RAPAT'], [thumbL, -1, RED, 'Ibu jari kiri → bilah RENGGANG']]) if (k > 0.02) {
    const [bx, by] = project(halfB.localToWorld(V(-64, 18, 6))), [ax, ay] = project(halfA.localToWorld(V(-72, -24, 6)));
    let ux = ax - bx, uy = ay - by; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    const pu = 0.5 + 0.5 * Math.sin(t * 7), L0 = 240;
    const [x0, y0, x1, y1] = dir > 0 ? [bx - ux * (L0 + 20 * pu), by - uy * (L0 + 20 * pu), bx - ux * 30, by - uy * 30] : [bx - ux * 30, by - uy * 30, bx - ux * (L0 + 20 * pu), by - uy * (L0 + 20 * pu)];
    const lx = (W - 560) / 2, ly = 330;
    svg += `<g opacity="${k.toFixed(3)}">${arrowSVG(x0, y0, x1, y1, col, 18)}<circle cx="${bx}" cy="${by}" r="${44 + 6 * pu}" fill="none" stroke="${col}" stroke-width="6"/>` +
`</g>`;
  }
  $('dim').innerHTML = svg;
  // stempel
  let si = -1; stampDefs.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const st = $('stamp');
  if (si !== lastStamp) { st.innerHTML = si < 0 ? '' : `<span class="${stampDefs[si][3]}">${stampDefs[si][2]}</span>`; lastStamp = si; }
  if (si >= 0) { const d = stampDefs[si], sp = st.firstChild; const pin = (t - d[0]) / 0.3, pout = clamp((t - d[1]) / 0.3);
    sp.style.opacity = clamp((t - d[0]) / 0.12) * (1 - pout); sp.style.transform = `rotate(-4deg) scale(${(lerp(1.35, 1, backOut(pin)) * lerp(1, 0.94, pout)).toFixed(3)})`; }
  // kartu inset: gaya geser (babak 6) dan tampak samping bilah melengkung (babak 7-8)
  const shearOn = hlw(t, L[6].s - 0.2, L[6].e + 0.2), sideOn = hlw(t, L[7].s + 0.6, L[9].e + 0.2);
  const kidOn = hlw(t, L[11].s - 0.1, L[12].e + 0.1);
  const co = Math.max(shearOn, sideOn, kidOn), F = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
  card.style.opacity = co.toFixed(3); card.style.top = kidOn > 0.01 ? '300px' : '1180px'; card.style.transform = `translateY(${(26 * (1 - co)).toFixed(1)}px)`;
  const txt = (x, y, str, col = '#16171b', sz = 24, anc = 'middle', wt = 800) => `<text x="${x}" y="${y}" text-anchor="${anc}" paint-order="stroke" stroke="#f8f8f5" stroke-width="7" stroke-linejoin="round" ${F} font-weight="${wt}" font-size="${sz}" fill="${col}">${str}</text>`;
  if (kidOn > 0.01) {
    // tampak dari ujung bilah: dorongan ibu jari memuntir bilah atas -> merapat (kanan) atau merenggang (kiri); gunting kidal = cermin
    const mir = t > T(12, 'dibalik') + 0.2, left = t >= L[12].s - 0.1 && !mir;
    const gL = track(gapLeftKeys, t), kR = clamp((t - T(11, 'ibu')) / 0.5), kM = clamp((t - T(12, 'dibalik') - 0.2) / 0.5);
    const phi = mir ? 3 * kM : left ? -6 * gL : 3 * kR;
    const cx = 476, y0 = 196, piv = phi >= 0 ? [cx + 8, y0] : [cx - 190, y0];
    const col = left ? '#e5484d' : '#30a46c';
    $('cardK').textContent = mir ? 'TAMPAK DARI UJUNG · GUNTING KIDAL (BILAH DIBALIK)' : left ? 'TAMPAK DARI UJUNG · TANGAN KIRI' : 'TAMPAK DARI UJUNG · TANGAN KANAN';
    const gapPx = left ? 198 * Math.sin(deg(6 * gL)) : 0;
    // kertas tegak lurus bidang gunting: terjepit di titik kontak, atau terselip ke celah lalu terlipat
    const bend = left ? gapPx * 1.6 : 0;
    const paper = `<path d="M${cx} 54 L${cx} ${y0 - 34} Q${cx} ${y0 - 6} ${cx - bend} ${y0 - 4} Q${cx - bend * 0.2} ${y0 + 10} ${cx} ${y0 + 34} L${cx} 284" fill="none" stroke="#16171b" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M${cx} 54 L${cx} ${y0 - 34} Q${cx} ${y0 - 6} ${cx - bend} ${y0 - 4} Q${cx - bend * 0.2} ${y0 + 10} ${cx} ${y0 + 34} L${cx} 284" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
    const A = `<path d="M${cx - 8} ${y0} L${cx + 190} ${y0} L${cx + 190} ${y0 + 40} L${cx + 42} ${y0 + 40} Z" fill="#aab0ba" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/>`;
    const B = `<g transform="rotate(${phi.toFixed(2)} ${piv[0]} ${piv[1]})"><path d="M${cx + 8} ${y0} L${cx - 190} ${y0} L${cx - 190} ${y0 - 40} L${cx - 42} ${y0 - 40} Z" fill="#c3c7cf" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/></g>`;
    const thumb = (phi >= 0 ? arrowSVG(cx - 150, y0 - 112, cx - 104, y0 - 52, col, 9) : arrowSVG(cx - 104, y0 - 52, cx - 150, y0 - 112, col, 9));
    const contact = !left ? `<circle cx="${cx}" cy="${y0}" r="${10 + 3 * Math.sin(t * 9)}" fill="#ffcf33" stroke="#16171b" stroke-width="4"/>` :
      `<path d="M${cx + 16} ${y0 - gapPx} L${cx + 26} ${y0 - gapPx} L${cx + 26} ${y0} L${cx + 16} ${y0}" fill="none" stroke="#e5484d" stroke-width="3"/>`;
    const g = `<g transform="${mir ? `translate(${2 * cx} 0) scale(-1 1)` : ''}">${A}${B}${contact}</g>`;
    const thumbG = `<g transform="${mir ? `translate(${2 * cx} 0) scale(-1 1)` : ''}">${thumb}</g>`;
    const lab = mir ? txt(cx, 312, 'ibu jari kiri sekarang merapatkan', '#30a46c', 26) :
      left ? txt(cx + 40, y0 - 40, 'celah', '#e5484d', 26, 'start') + txt(cx, 312, 'kertas terselip → terlipat', '#b5303a', 26) :
      txt(cx + 26, y0 - 22, 'rapat', '#30a46c', 26, 'start') + txt(cx, 312, 'bilah atas ditekan ke bawah', '#30a46c', 26);
    const who = txt(mir ? cx + 160 : cx - 160, 70, mir || left ? 'ibu jari kiri' : 'ibu jari kanan', col, 24, mir ? 'start' : 'end');
    $('cardS').innerHTML = paper + g + thumbG + who + lab;
  } else if (shearOn > 0.01) {
    // irisan melintang tegak lurus garis potong: dua bilah lewat bersilangan dengan celah ~0, kertas tergeser lalu putus
    $('cardK').textContent = 'IRISAN MELINTANG · GAYA GESER';
    const p = clamp((t - L[6].s - 0.3) / (T(6, 'putus') - L[6].s - 0.3)), br = t > T(6, 'putus');
    const cx = 476, y0 = 182, top = y0 - 15, bot = y0 + 15;
    const adv = lerp(-34, 14, easeIO(p)) + (br ? 22 * smooth(T(6, 'putus'), T(6, 'putus') + 0.5, t) : 0);
    const yE = top + adv, yE2 = bot - adv;                     // ujung tepi bilah atas / bawah
    const pen = clamp(yE - top, 0, 30), dl = br ? 0 : pen * 0.55, sep = br ? 12 * smooth(T(6, 'putus'), T(6, 'putus') + 0.4, t) : 0;
    // kertas: kiri tertekan turun, kanan terdorong naik, peralihan berbentuk S di antara dua tepi
    const sig = x => { const k = clamp((x - (cx - 22)) / 44); return k * k * (3 - 2 * k); };
    const yOff = x => (br ? (x < cx ? sep : -sep) : dl * (1 - 2 * sig(x)));
    let paper = '', fib = '';
    const band = (x0, x1) => { let d = ''; for (let x = x0; x <= x1; x += 4) d += (x === x0 ? 'M' : 'L') + x + ' ' + (top + yOff(x)).toFixed(1);
      for (let x = x1; x >= x0; x -= 4) d += 'L' + x + ' ' + (bot + yOff(x)).toFixed(1); return d + 'Z'; };
    if (!br) paper = `<path d="${band(120, 832)}" fill="#fff" stroke="#16171b" stroke-width="3" stroke-linejoin="round"/>`;
    else paper = `<path d="${band(120, cx - 4)}" fill="#fff" stroke="#16171b" stroke-width="3"/><path d="${band(cx + 4, 832)}" fill="#fff" stroke="#16171b" stroke-width="3"/>`;
    for (let x = 132; x < 832; x += 14) {
      const near = Math.abs(x - cx) < 26;
      if (br && near) { const sx = x < cx ? -1 : 1; fib += `<line x1="${cx + sx * 3}" y1="${(top + yOff(x) + 4 + (x % 5)).toFixed(1)}" x2="${cx + sx * (9 + (x % 7))}" y2="${(bot + yOff(x) - 4 - (x % 4)).toFixed(1)}" stroke="#c9a032" stroke-width="3" stroke-linecap="round"/>`; continue; }
      const y1 = top + yOff(x - 6) + 4, y2 = bot + yOff(x + 6) - 4;
      fib += `<line x1="${x - 3}" y1="${y1.toFixed(1)}" x2="${x + 3}" y2="${y2.toFixed(1)}" stroke="${near ? '#e5484d' : '#d8d4c6'}" stroke-width="${near ? 4 : 3}" stroke-linecap="round"/>`;
    }
    // bilah: muka dalam tegak (bidang kontak), bevel miring di tepi potong
    const up = `M${cx - 1} ${yE} L${cx - 1} ${yE - 150} L${cx - 96} ${yE - 150} L${cx - 96} ${yE - 62} Z`;
    const dn = `M${cx + 1} ${yE2} L${cx + 1} ${yE2 + 150} L${cx + 96} ${yE2 + 150} L${cx + 96} ${yE2 + 62} Z`;
    const bev = (x0, y0b, sx, sy) => `<path d="M${x0} ${y0b} L${x0 + sx * 95} ${y0b + sy * 62}" stroke="#fff" stroke-width="5" opacity=".8"/>`;
    $('cardS').innerHTML = `<defs><clipPath id="cc"><rect x="0" y="40" width="952" height="290"/></clipPath></defs><g clip-path="url(#cc)">` + paper + fib +
      `<path d="${up}" fill="#c3c7cf" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/>` + bev(cx - 4, yE - 2, -1, -1) +
      `<path d="${dn}" fill="#aab0ba" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/>` + bev(cx + 4, yE2 + 2, 1, 1) +
      `<line x1="${cx}" y1="40" x2="${cx}" y2="330" stroke="#16171b" stroke-width="2" stroke-dasharray="4 7" opacity=".45"/></g>` +
      arrowSVG(cx - 150, 60, cx - 150, 112, '#e5484d', 10) + txt(cx - 170, 92, 'bilah atas', '#e5484d', 26, 'end') +
      arrowSVG(cx + 150, 312, cx + 150, 260, '#30a46c', 10) + txt(cx + 172, 292, 'bilah bawah', '#30a46c', 26, 'start') +
      txt(cx + 22, 88, 'celah ≈ 0', '#16171b', 24, 'start') + `<path d="M${cx + 16} 80 L${cx + 4} 80" stroke="#16171b" stroke-width="3"/>` +
      txt(cx + 104, yE2 + 50, 'tepi miring', '#6c6e76', 22, 'start', 700) +
      (br ? txt(cx - 30, 258, 'serat putus', '#b5303a', 28, 'end') : (p > 0.25 ? txt(cx + 120, 132, 'serat tergeser', '#e5484d', 24, 'start') : ''));
  } else if (sideOn > 0.01) {
    // tampak samping: dua bilah melengkung saling mendekat, menyentuh di satu titik; baut menekan; longgar = celah
    $('cardK').textContent = 'TAMPAK SAMPING · LENGKUNGAN DILEBIH-LEBIHKAN';
    const loose = track(looseKeys, t), u = clamp((S.xc - 6) / (BL - 6)), y0 = 176, x0 = 150, len = 700;
    const bow = 30 * smooth(T(7, 'lurus'), T(7, 'melengkung') + 0.4, t), gapPx = 16 * loose;
    // jarak muka dalam ke bidang kontak: nol di titik potong, membuka ke arah baut dan ujung
    const g = sx => { const d = sx - u; return bow * d * d / Math.max(u * u, (1 - u) * (1 - u)) * 0.9; };
    const face = sgn => { let d = ''; for (let i = 0; i <= 70; i++) { const sx = i / 70, x = x0 + sx * len, y = y0 + sgn * (gapPx + g(sx) + 1.5);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } return d; };
    const thick = sx => 30 - 16 * sx;
    const outer = sgn => { let d = ''; for (let i = 70; i >= 0; i--) { const sx = i / 70; d += 'L' + (x0 + sx * len).toFixed(1) + ' ' + (y0 + sgn * (gapPx + g(sx) + 1.5 + thick(sx))).toFixed(1); } return d; };
    const cxp = x0 + u * len, showDot = t > T(8, 'titik') - 0.3 && loose < 0.3;
    const ref = hlw(t, T(7, 'lurus') - 0.1, T(7, 'melengkung') + 1.2);
    // baut: kepala di atas, mur di bawah, menjepit dua bilah
    const sg = gapPx;
    $('cardS').innerHTML =
      `<path d="${face(-1)} ${outer(-1)} Z" fill="#c3c7cf" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="${face(1)} ${outer(1)} Z" fill="#aab0ba" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/>` +
      (ref > 0.02 ? `<g opacity="${ref.toFixed(2)}"><line x1="${x0}" y1="${y0}" x2="${x0 + len}" y2="${y0}" stroke="#e5484d" stroke-width="3" stroke-dasharray="12 9"/>${txt(x0 + len, y0 - 54, 'garis lurus', '#e5484d', 22, 'end', 700)}</g>` : '') +
      `<rect x="${x0 - 9}" y="${y0 - sg - 44}" width="18" height="${88 + 2 * sg}" fill="#b4b6bd" stroke="#16171b" stroke-width="3"/>` +
      `<rect x="${x0 - 30}" y="${y0 - sg - 58 - 6 * loose}" width="60" height="16" rx="5" fill="#e3e4e8" stroke="#16171b" stroke-width="4"/>` +
      `<rect x="${x0 - 22}" y="${y0 + sg + 40}" width="44" height="12" rx="6" fill="#e3e4e8" stroke="#16171b" stroke-width="4"/>` +
      (loose < 0.3 ? arrowSVG(x0 + 46, y0 - 100, x0 + 46, y0 - 64, '#30a46c', 7) + arrowSVG(x0 + 46, y0 + 100, x0 + 46, y0 + 64, '#30a46c', 7) + txt(x0 + 68, y0 - 80, 'baut menekan', '#30a46c', 22, 'start') : '') +
      (loose > 0.3 ? `<g opacity="${clamp((loose - 0.3) / 0.4).toFixed(2)}">${txt(x0 + len * 0.55, y0 + 92, 'celah → kertas terselip & terlipat', '#b5303a', 26)}${txt(x0 + 50, y0 - 82, 'baut longgar', '#b5303a', 22, 'start')}</g>` : '') +
      (showDot ? `<circle cx="${cxp}" cy="${y0}" r="${11 + 3 * Math.sin(t * 9)}" fill="#ffcf33" stroke="#16171b" stroke-width="4"/>${txt(Math.max(x0 + 150, cxp), y0 + 92, 'titik potong · ' + Math.round(S.xc) + ' mm', '#16171b', 24)}` : '') +
      txt(x0, 318, 'baut', '#6c6e76', 20, 'middle', 700) + txt(x0 + len, 318, 'ujung', '#6c6e76', 20, 'end', 700);
  }
  // subtitle
  const ci2 = chunks.findIndex(c => t >= c.s && t < c.e);
  const cap = $('cap');
  if (ci2 !== lastChunk) { cap.innerHTML = ci2 < 0 ? '' : `<span class="pill">${chunks[ci2].map(w => `<b>${w.w}</b>`).join(' ')}</span>`; lastChunk = ci2; }
  if (ci2 >= 0) { const pill = cap.firstChild, c = chunks[ci2]; pill.style.opacity = lerp(0.2, 1, clamp((t - c.s) / 0.2));
    [...pill.children].forEach((b, k) => { const w = c[k]; b.className = t >= w.next ? 'past' : (t >= w.s ? 'cur' : ''); }); }
}

// ---------- render ----------
W0.traverse(o => { if (o.isMesh) { const basic = o.material.isMeshBasicMaterial; o.castShadow = !basic; o.receiveShadow = !basic; } });
for (const m2 of [paperWhole, paperL, paperR, paperFall, foldFlap]) m2.castShadow = false;
W0.children.forEach(o => { if (o.isMesh && o.geometry.parameters && o.geometry.parameters.depth !== undefined && o.geometry.parameters.depth < 3) o.castShadow = false; });
function draw() {
  renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rtCol); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  renderer.setClearColor(0xf3f3f0, 1);
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };

window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[3] === 'snd' ? 'stampSnd' : 'stamp', text: d[2] }));
  // bunyi gunting dari model: desis geser saat menutup, "cris" saat bilah bertemu
  let pa = ang(0), closing = null;
  for (let t = 0; t < DUR; t += 1 / 120) {
    const a = ang(t), v = (pa - a) * 120;
    if (v > 4 && closing === null) closing = t;
    if ((v <= 4 || t + 1 / 120 >= DUR) && closing !== null) { if (t - closing > 0.12) { const tight = track(looseKeys, t) < 0.3 && track(gapLeftKeys, t) < 0.3; ev.push({ t: +closing.toFixed(3), type: tight ? 'snip' : 'fold', dur: +(t - closing).toFixed(3) }); } closing = null; }
    pa = a;
  }
  for (const [k, typ] of [[T(0, 'longgar'), 'screw'], [T(1, 'bongkar'), 'screw'], [T(9, 'longgar'), 'screw'], [L[10].s + 0.5, 'screw']]) ev.push({ t: k, type: typ });
  ev.push({ t: T(2, 'tiga'), type: 'whoosh' }, { t: L[3].s + 0.4, type: 'whoosh' }, { t: T(4, 'dekat') + 0.15, type: 'crack' }, { t: T(12, 'dibalik'), type: 'whoosh' });
  ev.push({ t: L[6].s, type: 'whoosh' }, { t: T(6, 'putus'), type: 'tear' }, { t: T(13, 'titik') + 1.2, type: 'tear' }, { t: DUR - 1.4, type: 'chime' });
  const cue = (name, t) => ev.push({ t: +t.toFixed(3), type: 'cue', name });
  cue('heart', 0); cue('mystery', L[1].s); cue('act1', L[2].s); cue('danger', L[4].s); cue('drop', L[5].s + 0.1); cue('build', L[6].s);
  cue('reveal', L[7].s); cue('warm', L[8].s); cue('dark', L[10].s); cue('resolve', L[13].s); cue('end', DUR);
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: LS };
})();
window.DUR = DUR;
window.TW = T;
window.__dbg = { camera, base, W0, SC, S, draw };
renderAt(0);
window.READY = true;
