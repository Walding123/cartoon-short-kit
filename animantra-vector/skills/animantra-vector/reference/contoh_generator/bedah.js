// Video Kita Bongkar "Kenapa listrik bisa ada?" — dari stopkontak ke generator pembangkit (turbin uap + magnet berputar di
// dalam kumparan tembaga), gaya bedah. Alur: stopkontak (cover hidup) → ruang turbin → rumah generator dibuka → uap memutar
// turbin & rotor → magnet di dalam tembaga → elektron terdorong saat kutub lewat → arus keluar → kembali ke stopkontak.
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;
const W = 1080, H = 1920, SS = 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const backOut = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const pulse = (a, b, t, f = 0.15) => smooth(a - f, a + f, t) * (1 - smooth(b - f, b + f, t));
const hash = (a, b = 0) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

// ---------- kata & waktu ----------
const { words } = await (await fetch('./words.json')).json();
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const at = (l, w, n = 0) => {
  const c = words.filter(x => x.l === l && norm(x.w).startsWith(w));
  if (!c[n]) throw new Error(`kata tidak ada: ${l} ${w}`);
  return c[n];
};
const T = (l, w, n) => at(l, w, n).s;
const LN = i => { const ws = words.filter(x => x.l === i); return { s: ws[0].s, e: ws[ws.length - 1].e }; };
const NL = 6;
const L = Array.from({ length: NL }, (_, i) => LN(i));
const DUR = +(L[NL - 1].e + 1.4).toFixed(3);
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, c] = keys[i], [t0, v0] = keys[i - 1];
    if (t < t1) return c ? v0 : (Array.isArray(v0) ? v0.map((v, k) => lerp(v, v1[k], easeIO((t - t0) / (t1 - t0)))) : lerp(v0, v1, easeIO((t - t0) / (t1 - t0))));
  }
  return keys[keys.length - 1][1];
}

// ---------- renderer & pass (cel + garis tinta) ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, preserveDrawingBuffer: true, alpha: true });   // latar transparan: SVG #bg di belakang kanvas
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0xf4efe6, 1);
const mkRT = depth => {
  const rt = new THREE.WebGLRenderTarget(W * SS, H * SS, { type: THREE.HalfFloatType });
  if (depth) { rt.depthTexture = new THREE.DepthTexture(W * SS, H * SS); rt.depthTexture.type = THREE.FloatType; }
  return rt;
};
const rtCol = mkRT(true), rtNor = mkRT(false), rtComp = mkRT(false);
rtComp.texture.minFilter = rtComp.texture.magFilter = THREE.LinearFilter;
const scene = new THREE.Scene();
const NEAR = 1, FAR = 9000;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const quad = (frag, uniforms) => {
  const m = new THREE.ShaderMaterial({ uniforms, fragmentShader: frag, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }' });
  const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q);
  return { scene: s, mat: m };
};
const edge = quad(`
  uniform sampler2D tC, tN, tD; uniform vec2 px; uniform float r, far, zs, dim; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tC, vUv).rgb; vec3 n = texture2D(tN, vUv).rgb * 2. - 1.; float d = texture2D(tD, vUv).x;
    float e = 0., ec = 0.;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      vec2 uv2 = vUv + vec2(cos(a), sin(a)) * px * r;
      float d2 = texture2D(tD, uv2).x;
      bool b1 = d > .99999, b2 = d2 > .99999;
      if (b1 != b2) { e = 1.; continue; }
      if (b1) continue;
      vec3 n2 = texture2D(tN, uv2).rgb * 2. - 1.; vec3 c2 = texture2D(tC, uv2).rgb;
      if (abs(d - d2) * far > zs) e = 1.;
      if (dot(n, n2) < .35) e = 1.;
      if (length(c - c2) > .28) ec = 1.;
    }
    float a = d > .99999 ? e : 1.;                 // piksel latar: transparan kecuali garis siluet
    vec3 ink = vec3(.102, .110, .165);
    vec3 col = c * mix(vec3(1.), vec3(.42, .46, .58), dim);
    col = mix(col, mix(ink, c * .45, .45), ec * (1. - e) * .9);   // batas warna: gelap sewarna
    gl_FragColor = vec4(mix(col, ink, e) * a, a);
  }`, { tC: { value: rtCol.texture }, tN: { value: rtNor.texture }, tD: { value: rtCol.depthTexture },
  px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, r: { value: 2.6 }, far: { value: FAR - NEAR }, zs: { value: 0.3 }, dim: { value: 0 } });
const out = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`, { t: { value: rtComp.texture } });

// ---------- palet, cel 3 nada (satu warna tegas per bagian) ----------
const flat = h => [h, h, h];
const PAL = {
  brass: ['#f4cf6a', '#d9a63a', '#a8792a'], bore: ['#c2914a', '#9c6f30', '#6e4c1e'], plugF: ['#f0d58a', '#d2b260', '#a88a3f'],
  chrome: ['#fbfcfd', '#c3cad4', '#7e8794'], steel: ['#dfe3ea', '#aab1bd', '#717887'], cam: ['#b9bec8', '#8c929e', '#5d636e'],
  keyPin: ['#f08a8d', '#e5484d', '#b8333a'], drvPin: ['#8fb0ff', '#5b7fd6', '#3e5fb8'], spring: ['#5b5f6b', '#3f434d', '#262930'],
  slot: flat('#2b2a30'), plate: ['#c9ccd2', '#9ea3ac', '#6f7480'], straw: ['#ff8a80', '#e5484d', '#b8333a'],
  rust: ['#d9875a', '#b0582a', '#7a3a18'], ice: ['#f2fbff', '#c9e9f8', '#94c9e6'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], hl: ['#f6dc8e', '#e3bf62', '#b8913a'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// Cel berbasis teori warna (lihat reference/panduan_warna.md): 2 nada + terminator lembut, bayangan bergeser ke ungu-biru sejuk
// (bukan sekadar gelap), sisi terang sedikit hangat, cahaya langit dari atas, cahaya pinggir (rim) sejuk, kilap sesuai bahan.
// m.hl(palet, k) = ganti warna ke palet sorot; m.glow(k) = sorotan lembut (pinggir menyala emas), warna asli tetap.
const GLOSS = { brass: 0.8, plugF: 0.6, chrome: 0.95, steel: 0.8, cam: 0.6, keyPin: 0.5, drvPin: 0.5, spring: 0.5, plate: 0.45, straw: 0.5, bore: 0.3, ice: 0.9 };
function cel(pal, gloss = GLOSS[pal] ?? 0.2, side = THREE.DoubleSide) {
  const [a, b, c] = C3(PAL[pal]);
  const m = new THREE.ShaderMaterial({
    side,
    uniforms: { c0: { value: a }, c1: { value: b }, c2: { value: c }, k: { value: 0 }, gl: { value: gloss }, gw: { value: 0 }, al: { value: 1 },
      h0: { value: C3(PAL.hl)[0] }, h1: { value: C3(PAL.hl)[1] }, h2: { value: C3(PAL.hl)[2] } },
    vertexShader: `varying vec3 vN, vV; void main(){ vN = normalize(mat3(modelMatrix) * normal);
      vec4 w = modelMatrix * vec4(position, 1.); vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 c0, c1, c2, h0, h1, h2; uniform float k, gl, gw, al; varying vec3 vN, vV;
      void main(){ vec3 N = normalize(vN), V = normalize(vV); if (dot(N, V) < 0.) N = -N;
        vec3 L = normalize(vec3(.35, .9, .65));                                     // cahaya kunci dari kiri-atas layar
        vec3 t0 = mix(c0, h0, k), t1 = mix(c1, h1, k), t2 = mix(c2, h2, k);
        float d = dot(N, L);
        vec3 sh = mix(t2, t2 * vec3(.80, .86, 1.16), .75);                          // bayangan sejuk
        vec3 col = mix(sh, t1, smoothstep(.10, .20, d));                            // terminator lembut
        col = mix(col, t0 * vec3(1.02, 1.0, .965), smoothstep(.62, .74, d)) * .97;  // bidang terang, hangat
        col *= mix(.90, 1.03, N.y * .5 + .5);                                       // langit dari atas, bawah sedikit gelap
        float fr = pow(1. - max(dot(N, V), 0.), 2.5);
        col += vec3(.62, .74, .95) * smoothstep(.45, .8, fr) * .22 * (1. - smoothstep(.2, .6, d));   // rim sejuk di sisi gelap
        float sp = pow(max(dot(N, normalize(L + V)), 0.), 48.);
        col += vec3(1.) * smoothstep(.55, .8, sp) * gl * .35;                       // kilap
        col = col * (1. + .06 * gw) + vec3(1., .78, .32) * smoothstep(.3, .9, fr) * gw * 1.1;   // glow sorotan
        gl_FragColor = vec4(min(col, vec3(1.)), al); }`,
  });
  m.hl = (p2, k) => { const p = C3(PAL[p2]); m.uniforms.h0.value = p[0]; m.uniforms.h1.value = p[1]; m.uniforms.h2.value = p[2]; m.uniforms.k.value = k; };
  m.glow = k => { m.uniforms.gw.value = k; };
  return m;
}
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const tube = (pts, r, mat, closed = false) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed, 'catmullrom', 0.2), 160, r, 16, closed), mat);
class Helix extends THREE.Curve {   // pegas sepanjang +x
  constructor(len, r, turns) { super(); this.len = len; this.r = r; this.turns = turns; }
  getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * this.turns; return o.set(t * this.len, Math.cos(a) * this.r, Math.sin(a) * this.r); }
}


// ---------- generator pembangkit (cm; sumbu poros = x, ke kanan layar; y = atas; +z menghadap kamera) ----------
// Ciri dari foto turbo-generator PLTU: rumah silinder abu-hijau, inti stator berlapis (laminasi) abu gelap dengan 36 alur,
// tiap alur berisi batang tembaga + baji hijau; ujung kumparan = keranjang batang tembaga melengkung; rotor silinder baja
// beralur dengan cincin penahan mengilap di kedua ujung; poros panjang di bantalan; turbin uap dengan piringan bersudu di kiri.
// Kutub rotor diberi warna (U merah, S biru) sebagai alat bantu penjelasan.
Object.assign(PAL, {
  housing: ['#b4c6bb', '#8fa499', '#66796f'], cutH: flat('#d8e2dc'), core: ['#8a919c', '#676e79', '#474d57'], cutCore: flat('#a9b0ba'),
  copper: ['#f6b27a', '#df8443', '#a8551f'], wedge: ['#9fd3a6', '#5fae6c', '#3b7a46'], rotor: ['#a7aeb8', '#7c838e', '#545a64'],
  ring: ['#fbfcfd', '#c9d0d9', '#8a93a0'], poleN: ['#ff9a90', '#e5484d', '#a8333a'], poleS: ['#9cb8ff', '#4f78db', '#30509f'],
  shaft: ['#e2e6ec', '#aeb5bf', '#757d89'], ped: ['#c9ced6', '#9ca3ad', '#6f7681'], concrete: ['#d9d4c9', '#b8b2a5', '#8e887c'],
  blade: ['#e9edf2', '#b9c1cc', '#808a98'], turb: ['#c8b9a6', '#a08e78', '#73624f'],
  plate: ['#fbfaf6', '#e6e3db', '#bdb8ad'], hole: flat('#2b2a30'), clip: ['#e8ebef', '#b6bcc5', '#7f8692'], wall: ['#f1ede4', '#ddd7cb', '#b8b1a3'],
});
Object.assign(GLOSS, { housing: 0.35, core: 0.3, copper: 0.75, wedge: 0.4, rotor: 0.6, ring: 0.95, shaft: 0.9, ped: 0.4, blade: 0.8, turb: 0.4, plate: 0.35, clip: 0.85 });
const lt = new THREE.Group(); scene.add(lt);
const UYX = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(1, 0, 0));   // bentuk (z, y) diekstrusi sepanjang +x
const rad = d => d * Math.PI / 180;
// cincin bersudut (z, y) dari a0..a1 (derajat, 0 = +z/depan, 90 = atas), diekstrusi x0..x1
function sektor(rIn, rOut, a0, a1, x0, x1, mat) {
  const s = new THREE.Shape(), n = 64;
  for (let i = 0; i <= n; i++) { const a = rad(lerp(a0, a1, i / n)); const p = [Math.cos(a) * rOut, Math.sin(a) * rOut]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = n; i >= 0; i--) { const a = rad(lerp(a0, a1, i / n)); s.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn); }
  return mesh(new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false, curveSegments: 12 }).applyMatrix4(UYX).translate(x0, 0, 0), mat);
}
const silX = (r, x0, x1, mat, seg = 48) => mesh(new THREE.CylinderGeometry(r, r, x1 - x0, seg).rotateZ(Math.PI / 2), mat, (x0 + x1) / 2, 0, 0);
const CUT = [-25, 105];                     // sektor yang dibelah (depan-atas), derajat
const KEEP = [CUT[1], CUT[0] + 360];
const inCut = deg => { const d = ((deg % 360) + 360) % 360; return d >= 360 + CUT[0] || d <= CUT[1]; };
const RH = 150, RS_IN = 76, RS_OUT = 132, LS = 210, NSLOT = 36, RR = 68, LR = 200;
const gen = new THREE.Group(); lt.add(gen);
// rumah stator: bagian tetap + seperempat depan-atas yang diangkat
const housingMat = cel('housing'), cutHMat = cel('cutH');
gen.add(sektor(RH - 9, RH, ...KEEP, -260, 260, housingMat));
const lid = new THREE.Group(); gen.add(lid);
lid.add(sektor(RH - 9, RH, ...CUT, -260, 260, housingMat));
for (const x of [-262, 258]) { gen.add(sektor(RS_OUT + 4, RH, ...KEEP, x, x + 4, housingMat)); lid.add(sektor(RS_OUT + 4, RH, ...CUT, x, x + 4, housingMat)); }
for (const x of [-180, -60, 60, 180]) { gen.add(sektor(RH, RH + 5, ...KEEP, x - 6, x + 6, housingMat)); lid.add(sektor(RH, RH + 5, ...CUT, x - 6, x + 6, housingMat)); }   // rusuk penguat
// inti stator berlapis: paket laminasi + celah ventilasi
const coreMat = cel('core'), cutCoreMat = cel('cutCore');
for (let k = 0; k < 9; k++) { const x0 = -LS + k * (2 * LS / 9); gen.add(sektor(RS_IN, RS_OUT, ...KEEP, x0, x0 + 2 * LS / 9 - 4, coreMat)); }
// 36 alur: batang tembaga + baji hijau (alur di sektor terbelah tetap ada: inti dibelah, isinya terlihat)
const copperMat = cel('copper'), wedgeMat = cel('wedge'), bars = [];
for (let i = 0; i < NSLOT; i++) {
  if (inCut(i * 360 / NSLOT + 5)) continue;   // batang di sektor terbelah ikut diangkat: rotor terlihat
  const a = rad(i * 360 / NSLOT + 5), g = new THREE.Group(); g.rotation.x = -a; gen.add(g);   // rotation.x: z->y, sudut 0 = +z
  const bar = mesh(new THREE.BoxGeometry(2 * LS + 24, 6, 26).translate(0, 0, RS_IN + 17), copperMat); g.add(bar);
  g.add(mesh(new THREE.BoxGeometry(2 * LS, 6.6, 4).translate(0, 0, RS_IN + 2.2), wedgeMat));
  bars.push({ a, bar });
}
// ujung kumparan: keranjang batang tembaga melengkung keluar (involute)
for (const s of [-1, 1]) for (let i = 0; i < NSLOT; i++) {
  if (inCut(i * 360 / NSLOT + 5)) continue;
  const a0 = rad(i * 360 / NSLOT + 5), P = (x, r, da) => [x * s, Math.sin(a0 + da) * r, Math.cos(a0 + da) * r];
  gen.add(tube([P(LS + 10, RS_IN + 17, 0), P(LS + 26, RS_IN + 28, 0.12), P(LS + 40, RS_IN + 42, 0.32), P(LS + 46, RS_IN + 50, 0.5)], 3.2, copperMat));
}
// rotor: silinder baja beralur + dua permukaan kutub + cincin penahan, berputar di poros
const rot = new THREE.Group(); gen.add(rot);
const rotorMat = cel('rotor'), ringMat = cel('ring'), shaftMat = cel('shaft');
rot.add(silX(RR, -LR, LR, rotorMat, 64));
for (let i = 0; i < 24; i++) { const a = i * 360 / 24; if ((a + 30) % 180 < 60) continue;   // alur rotor, kecuali di daerah kutub
  const g = new THREE.Group(); g.rotation.x = -rad(a); rot.add(g); g.add(mesh(new THREE.BoxGeometry(2 * LR - 10, 5, 3).translate(0, 0, RR + 0.2), cel('core'))); }
const poleN = sektor(RR, RR + 0.8, 60, 120, -LR + 10, LR - 10, cel('poleN')), poleS = sektor(RR, RR + 0.8, 240, 300, -LR + 10, LR - 10, cel('poleS'));
rot.add(poleN, poleS);
for (const s of [-1, 1]) rot.add(silX(RR + 3, s > 0 ? LR - 2 : -LR - 36, s > 0 ? LR + 36 : -LR + 2, ringMat, 64));
const shaft = silX(30, -760, 430, shaftMat); rot.add(shaft);
for (const x of [-520, 300]) rot.add(silX(52, x, x + 26, shaftMat));   // kopling
// bantalan + alas beton
for (const x of [-330, 330]) { gen.add(mesh(new THREE.BoxGeometry(70, 120, 120), cel('ped'), x, -78, 0)); gen.add(silX(44, x - 30, x + 30, cel('ped'))); }
lt.add(mesh(new THREE.BoxGeometry(1700, 60, 420), cel('concrete'), -180, -168, 0));
gen.add(mesh(new THREE.BoxGeometry(560, 40, 260), cel('ped'), 0, -138, 0));
// terminal keluaran: 3 rel tembaga turun ke lantai
const busMat = cel('copper'); const BUS = [-40, 0, 40];
BUS.forEach(z => gen.add(mesh(new THREE.BoxGeometry(14, 120, 10), busMat, 150, -175, z)));
// turbin uap di kiri: rumah dibelah + piringan bersudu (ikut berputar)
const turb = new THREE.Group(); lt.add(turb);
turb.add(sektor(108, 118, ...KEEP, -760, -500, cel('turb')));
const turbLid = sektor(108, 118, ...CUT, -760, -500, cel('turb')); turb.add(turbLid);
for (let d = 0; d < 6; d++) { const x = -740 + d * 42, r = 58 + d * 8;
  rot.add(silX(36, x - 4, x + 4, shaftMat));
  for (let b = 0; b < 28; b++) { const g = new THREE.Group(); g.position.x = x; g.rotation.x = -rad(b * 360 / 28); rot.add(g);
    const bl = mesh(new THREE.BoxGeometry(10, 3, r - 36).translate(0, 0, 36 + (r - 36) / 2), cel('blade')); bl.rotation.z = 0.5; g.add(bl); } }
lt.add(mesh(new THREE.BoxGeometry(60, 110, 60), cel('turb'), -700, 160, 0));   // pipa uap masuk dari atas
lt.add(silX(24, -730, -670, cel('turb')).translateY(212));

// ---------- stopkontak SNI di dinding (hook), terpisah jauh dari generator ----------
const SOCK = [-2600, 0, 0];
const sock = new THREE.Group(); sock.position.set(...SOCK); lt.add(sock);
sock.add(mesh(new THREE.BoxGeometry(160, 160, 4), cel('wall'), 0, 0, -3));
const plateGeo = new THREE.BoxGeometry(86, 86, 10); sock.add(mesh(plateGeo, cel('plate'), 0, 0, 5));
PAL.recess = ['#efece5', '#d9d5cb', '#aea89b'];
sock.add(mesh(new THREE.TorusGeometry(25.5, 2.2, 12, 64), cel('plate'), 0, 0, 10));                 // bibir ceruk bulat
sock.add(mesh(new THREE.CylinderGeometry(24, 24, 1, 64).rotateX(Math.PI / 2), cel('recess'), 0, 0, 2.5));   // dasar ceruk (putih, cekung)
sock.add(mesh(new THREE.CylinderGeometry(24, 24, 7.5, 64, 1, true).rotateX(Math.PI / 2), cel('recess'), 0, 0, 6.5));   // dinding ceruk
const holeMat = cel('hole'); for (const x of [-9.5, 9.5]) sock.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 1, 20).rotateX(Math.PI / 2), holeMat, x, 0, 3.1));
for (const y of [-22.5, 22.5]) sock.add(mesh(new THREE.BoxGeometry(9, 2, 6), cel('clip'), 0, y, 6));   // klip arde di dinding ceruk

// ---------- jadwal ----------
const tTanya = T(0, 'lalu'), tBuka = T(1, 'bongkar'), tUap = T(2, 'uap'), tTurb = T(2, 'turbin', 1), tRpm = T(2, 'tiga'), tMag = T(3, 'magnet');
const tKutub = T(4, 'setiap'), tArus = T(4, 'itulah'), tJadi = T(5, 'jadi'), tGerak = T(5, 'gerak'), tTulis = T(5, 'tulis');
const CUT_T = L[1].s - 0.35;                         // potong dari stopkontak ke ruang generator
const openKeys = [[0, 0], [tBuka - 0.1, 0], [tBuka + 1.1, 1]];
const spinAt = t => smooth(tUap + 0.3, tTurb + 1.2, t);      // kecepatan tampil 0..1 (diperlambat: 0,6 putaran/detik)
const ROT_V = 0.6 * 2 * Math.PI;
const angleAt = t => { const t0 = tUap + 0.3, t1 = tTurb + 1.2; if (t < t0) return 0; const tt = Math.min(t, t1), ramp = (tt - t0) * (tt - t0) / (2 * (t1 - t0)); return ROT_V * (ramp + Math.max(0, t - t1)); };
const LOOP_T = DUR - 0.9;                            // akhir kembali ke stopkontak (video berputar mulus)

// kamera: [x, y, z, tinggi pandang (cm), azimut° (0 = depan +z, + = dari kanan), elevasi°, ax, ay]
const HOOK = [SOCK[0], 0, 0, 230, -14, 8, 0.5, 0.62], HOOK2 = [SOCK[0], 0, 0, 175, -10, 6, 0.5, 0.6];
const HALL = [-180, 20, 0, 1500, 22, 16, 0.5, 0.6];
const OPEN = [-60, 20, 0, 1050, 18, 20, 0.5, 0.6];
const TURB = [-560, 30, 0, 760, 24, 18, 0.5, 0.6];
const ROTOR = [140, 30, 0, 760, 32, 28, 0.5, 0.6];
const BARS = [170, 50, 20, 480, 36, 30, 0.5, 0.6];
const camKeys = [[0, HOOK], [CUT_T, HOOK2], [CUT_T + 0.001, HALL, 'c'], [tBuka - 0.2, HALL], [tBuka + 1.2, OPEN], [tUap - 0.1, OPEN], [tUap + 0.8, TURB],
  [tTurb + 0.6, TURB], [tTurb + 1.6, ROTOR], [tKutub - 0.3, ROTOR], [tKutub + 0.6, BARS], [tArus + 1.2, BARS], [tJadi + 0.5, HALL], [LOOP_T, HALL], [LOOP_T + 0.001, HOOK, 'c'], [DUR, HOOK]];

// ---------- label, stempel ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(tTanya, CUT_T - 0.1, 'Cuma lubang?', () => [SOCK[0] + 12, 0, 6], 'r', 'hi');
tag(tUap + 0.4, tTurb + 0.4, 'Turbin uap', () => [-600, 60, 70], 'r', '');
tag(tMag - 0.1, tKutub - 0.4, 'Magnet berputar (rotor)', () => [120, 40, 55], 'l', 'hi');
tag(tMag + 0.7, tKutub - 0.4, 'Kawat tembaga (stator)', () => [LS + 40, 40, -110], 'r', '');
tag(tKutub + 0.8, tArus + 1.0, 'Elektron terdorong', () => [60, Math.sin(rad(112)) * 93, Math.cos(rad(112)) * 93], 'l', 'hi');
tag(tArus + 0.3, tJadi + 0.2, 'Arus keluar', () => [150, -205, 40], 'r', 'warn');
const stampDefs = [
  [tRpm - 0.05, L[2].e + 0.4, '3.000|putaran/menit', 1360, 'snd'],
  [tArus, L[4].e + 0.5, 'Arus|listrik!', 1360, ''],
  [tGerak - 0.1, tTulis - 0.2, 'Gerak →|listrik', 1360, 'snd'],
  [tTulis - 0.05, LOOP_T - 0.05, 'Tulis di|komentar', 1360, 'snd'],
];

// ---------- caption karaoke (dipotong menurut lebar sebenarnya) ----------
const capCtx = document.createElement('canvas').getContext('2d'); capCtx.font = '800 58px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
const capW = s => capCtx.measureText(s).width + 52;
const chunks = [];
for (let li = 0; li < NL; li++) {
  let cur = [];
  const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => { cur.push(w);
    const nxt = ws[i + 1], lebar = nxt ? capW([...cur, nxt].map(x => x.w).join(' ')) : 0;
    if (/[,.?!:…]$/.test(w.w) || !nxt || lebar > 860 || cur.length >= 6) { chunks.push(cur); cur = []; } });
}
const allW = chunks.flat();
allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });

// ---------- model per waktu ----------
const S = { open: 0, dark: 0, dim: 0, ang: 0, spin: 0 };
function updateModel(t) {
  const o = S.open = track(openKeys, t);
  lid.position.set(0, 330 * easeIO(o), 120 * easeIO(o)); lid.visible = o < 0.98;
  turbLid.visible = o < 0.5;
  S.spin = spinAt(t); S.ang = angleAt(t); rot.rotation.x = -S.ang;
  // tembaga menyala saat kutub lewat (sesudah "setiap kutubnya lewat")
  const aktif = smooth(tKutub - 0.2, tKutub + 0.4, t) * (1 - smooth(tJadi + 0.4, tJadi + 1.2, t));
  for (const b of bars) {
    const dN = Math.cos(b.a - (rad(90) + S.ang)), dS = Math.cos(b.a - (rad(270) + S.ang));
    b.bar.material = b.bar.userData.m || (b.bar.userData.m = cel('copper'));
    b.bar.material.glow(aktif * 0.9 * Math.max(0, Math.max(dN, dS) - 0.75) * 4);
  }
  [poleN, poleS].forEach(p => p.material.glow(0.5 * pulse(tMag, tKutub + 1.5, t, 0.3)));
  // suasana: hook redup, ruang generator terang, bagian arus sedikit gelap supaya cahaya tembaga menonjol
  S.dark = 0.35 * (1 - smooth(0.8, tTanya, t)) * (t < CUT_T ? 1 : 0);
  S.dim = 0.3 * pulse(tKutub + 0.4, tArus + 1.0, t, 0.4) + (t < CUT_T ? 0.18 * (1 - smooth(0.8, tTanya, t)) : 0);
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[3], w = h * W / H;   // tanpa 'napas' kamera
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -w / 2; camera.right = w / 2;
  lt.updateMatrixWorld(true);
  const target = lt.localToWorld(tmpV.set(c[0], c[1], c[2]));
  const az = rad(c[4]), el = rad(c[5]);
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 4000);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[6]) * w).addScaledVector(up, (c[7] - 0.5) * h);
  camera.near = 1; camera.far = 9000;
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60; edge.mat.uniforms.far.value = 9000;
  edge.mat.uniforms.dim.value = S.dim;
  const sh = 6 * Math.exp(-Math.max(0, t - tArus) * 8) * (t > tArus ? 1 : 0);
  $('shake').style.transform = sh > 0.2 ? `translate(${(Math.sin(t * 91) * sh).toFixed(1)}px, ${(Math.cos(t * 77) * sh).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: ruang turbin PLTU (dinding panel, jendela pita, rel crane kuning, lantai epoksi) / dinding rumah ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <linearGradient id="hallw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d3d8"/><stop offset="1" stop-color="#b3bec4"/></linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".5" stop-color="#1d2440" stop-opacity="0"/><stop offset="1" stop-color="#1d2440" stop-opacity=".36"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#2a3346"/><stop offset="1" stop-color="#0c0e14"/></radialGradient>
  </defs>
  <rect id="bgbase" width="1080" height="1920" fill="#b3bec4"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const f1 = v => v.toFixed(1);
const planeM = (o, u, v) => {
  const O = project(o), U = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
function updateBg(t) {
  const pxcm = 1920 / CAM[3];
  $('dofb').setAttribute('stdDeviation', clamp((pxcm - 1.6) * 1.4, 0, 7).toFixed(2));
  let s = '';
  if (CAM[0] < -1500) {   // dinding rumah di belakang stopkontak: cat krem hangat dengan tekstur halus
    $('bgbase').setAttribute('fill', '#e9e1d2');
    s += `<g transform="${planeM([SOCK[0], 0, -6], [1, 0, 0], [0, -1, 0])}"><rect x="-800" y="-800" width="1600" height="1600" fill="#ece4d5"/>
      ${Array.from({ length: 40 }, (_, k) => `<circle cx="${f1(hash(k, 1) * 1600 - 800)}" cy="${f1(hash(k, 2) * 1600 - 800)}" r="${f1(1 + hash(k, 3) * 2)}" fill="#ddd3c1"/>`).join('')}
      <rect x="-800" y="140" width="1600" height="8" fill="#d8cfbe"/></g>
      <g transform="${planeM([SOCK[0], 0, -5.5], [1, 0, 0], [0, -1, 0])}" filter="url(#soft)" fill="#2a2440"><rect x="-38" y="-36" width="92" height="92" rx="8" opacity=".35"/></g>`;
  } else {                // ruang turbin: dinding belakang z = -400, lantai y = -198
    $('bgbase').setAttribute('fill', '#b3bec4');
    s += `<g transform="${planeM([0, 0, -420], [1, 0, 0], [0, -1, 0])}">
      <rect x="-2400" y="-1400" width="4800" height="1600" fill="url(#hallw)"/>
      ${Array.from({ length: 24 }, (_, k) => `<rect x="${-2400 + k * 200}" y="-1400" width="6" height="1600" fill="#a6b2b9"/>`).join('')}
      <rect x="-2400" y="-1150" width="4800" height="180" fill="#dfeaf0"/>${Array.from({ length: 24 }, (_, k) => `<rect x="${-2400 + k * 200}" y="-1150" width="12" height="180" fill="#8e9ba3"/>`).join('')}
      <rect x="-2400" y="-930" width="4800" height="46" fill="#e8b93e"/><rect x="-2400" y="-884" width="4800" height="10" fill="#9c7a1f"/>
      <rect x="-2400" y="-60" width="4800" height="260" fill="#a3b0b7"/>
      ${[-1300, -900, 700, 1100].map(x => `<rect x="${x}" y="-420" width="150" height="220" rx="6" fill="#c3cdd2" stroke="#8e9ba3" stroke-width="6"/><rect x="${x + 20}" y="-395" width="110" height="50" fill="#3a4a56"/><circle cx="${x + 40}" cy="-310" r="10" fill="#5fd38a"/><circle cx="${x + 75}" cy="-310" r="10" fill="#e8b93e"/>`).join('')}
    </g>
    <g transform="${planeM([0, -198, 0], [1, 0, 0], [0, 0, -1])}">
      <rect x="-2400" y="-420" width="4800" height="1600" fill="#9db3a7"/>
      <rect x="-2400" y="-260" width="4800" height="14" fill="#e8c34a"/><rect x="-2400" y="300" width="4800" height="14" fill="#e8c34a"/>
      ${Array.from({ length: 30 }, (_, k) => `<rect x="${-2400 + k * 160}" y="-246" width="70" height="14" fill="#2b2a30" opacity=".0"/>`).join('')}
      <ellipse cx="-180" cy="0" rx="900" ry="250" fill="#2a2440" opacity=".22" filter="url(#soft)"/>
    </g>`;
  }
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.95 * S.dark).toFixed(3));
}

// ---------- efek: uap, garis medan, elektron, arus keluar, cahaya lubang stopkontak ----------
function updateFx(t) {
  let s = '';
  const pxcm = 1920 / CAM[3];
  // uap masuk ke turbin (dari pipa atas), berkelok ke kanan mengikuti sudu
  const uap = smooth(tUap - 0.2, tUap + 0.5, t) * (1 - smooth(tKutub - 0.5, tKutub, t));
  if (uap > 0.02) for (let k = 0; k < 9; k++) { const ph = (t * 0.9 + k / 9) % 1, x = -700 + ph * 240, y = 150 - Math.min(ph * 3, 1) * 70 + Math.sin(ph * 12 + k) * 8, [cx, cy] = project([x, y, 40 + (k % 3) * 25]);
    s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1((12 + 10 * ph) * pxcm)}" fill="#ffffff" stroke="#b9c6d6" stroke-width="3" opacity="${(uap * 0.75 * Math.sin(Math.PI * ph)).toFixed(2)}"/>`; }
  // garis medan magnet dari kutub U ke S, ikut berputar (dibantu warna)
  const medan = pulse(tMag - 0.2, tJadi + 0.3, t, 0.4);
  if (medan > 0.02) for (const dx of [-120, 0, 120]) for (const k of [-1, 1]) {
    const aN = rad(90) + S.ang, aS = rad(270) + S.ang, r1 = RR + 4, r2 = RS_IN + 34, P = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16, a = lerp(aN, aS + k * 0.0001, u) + k * Math.sin(Math.PI * u) * 1.15, r = lerp(r1, r1, u) + Math.sin(Math.PI * u) * (r2 - r1);
      P.push(project([dx, Math.sin(a) * r, Math.cos(a) * r])); }
    s += `<polyline points="${P.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="#f6dc8e" stroke-width="${f1(2.2 * pxcm)}" stroke-dasharray="${f1(10 * pxcm)} ${f1(8 * pxcm)}" stroke-dashoffset="${f1(-t * 40 * pxcm)}" opacity="${(0.75 * medan).toFixed(2)}" stroke-linecap="round"/>`;
  }
  // elektron mengalir di batang tembaga yang sedang dilewati kutub
  const el = smooth(tKutub + 0.2, tKutub + 0.8, t) * (1 - smooth(tJadi + 0.4, tJadi + 1.2, t));
  if (el > 0.02) for (const b of bars) {
    const kuat = Math.max(0, Math.max(Math.cos(b.a - (rad(90) + S.ang)), Math.cos(b.a - (rad(270) + S.ang))) - 0.94) / 0.06;
    if (kuat <= 0.05) continue;
    const r = RS_IN + 17, za = Math.cos(b.a) * r, ya = Math.sin(b.a) * r;
    const off = hash(b.a * 10, 3);
    for (let k = 0; k < 6; k++) { const ph = (t * 0.7 + k / 6 + off) % 1, [cx, cy] = project([-LS + ph * 2 * LS, ya, za]);
      s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(5.5 * pxcm)}" fill="#7fd6ff" stroke="#1d3a6b" stroke-width="2.5" opacity="${(el * Math.min(1, kuat)).toFixed(2)}"/>`; }
  }
  // arus keluar lewat 3 rel tembaga ke bawah lantai
  const out = smooth(tArus, tArus + 0.6, t) * (1 - smooth(LOOP_T - 0.3, LOOP_T, t));
  if (out > 0.02) BUS.forEach((z, i) => { for (let k = 0; k < 4; k++) { const ph = (t * 0.8 + k / 4 + i * 0.1) % 1, [cx, cy] = project([150, -118 - ph * 110, z + 6]);
    s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(5 * pxcm)}" fill="#ffe259" stroke="#8a6a1c" stroke-width="2.5" opacity="${(out * Math.sin(Math.PI * ph)).toFixed(2)}"/>`; } });
  // stopkontak: lubang berkedip pertanyaan (hook) / menyala karena listrik sudah datang (akhir)
  if (CAM[0] < -1500) { const nyala = t > LOOP_T ? smooth(LOOP_T, LOOP_T + 0.4, t) : 0.35 + 0.25 * Math.sin(t * 5);
    for (const x of [-9.5, 9.5]) { const [cx, cy] = project([SOCK[0] + x, 0, 3.6]);
      s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(3.4 * pxcm)}" fill="#ffe7a3" opacity="${(0.55 * nyala).toFixed(2)}"/>`; } }
  // badge "diperlambat": rotor tampil 0,6 putaran/detik, aslinya 50 putaran/detik
  if (S.spin > 0.5 && CAM[0] > -1500) s += `<g opacity="${(Math.min(1, (S.spin - 0.5) * 4) * (1 - smooth(LOOP_T - 0.3, LOOP_T, t))).toFixed(2)}"><rect x="742" y="250" width="270" height="56" rx="28" fill="#1b1a1f"/><text x="877" y="287" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800" font-size="25" fill="#f6dc8e">DIPERLAMBAT 80×</text></g>`;
  $('dim').innerHTML = s;
}

// ---------- cover hidup (frame 0 = cover lengkap, adegan sudah bergerak) ----------
function updateCoverHidup(t) {
  const el = $('cvlive'); if (!el) return;
  const out = smooth(1.25, 1.7, t);
  el.style.opacity = 1 - out;
  el.style.transform = `translateY(${f1(-90 * out)}px) scale(${(1 + 0.035 * Math.sin(Math.PI * clamp(t / 0.35))).toFixed(4)})`;
  el.style.display = out >= 1 ? 'none' : 'block';
}

// ---------- overlay ----------
const ARROW = '<svg viewBox="0 0 13 10"><path d="M12 5H1.5M5 1.2 1.2 5 5 8.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const tagEls = tagDefs.map(d => {
  const el = document.createElement('div'); el.className = 'tag ' + d.cls;
  el.innerHTML = d.side === 'r' ? ARROW + `<span>${d.text}</span>` : `<span>${d.text}</span>` + ARROW.replace('<svg', '<svg style="transform:scaleX(-1)"');
  $('tags').appendChild(el); return el;
});
let lastChunk = -1, lastStamp = -1;
function updateOverlay(t) {
  updateCoverHidup(t);
  tagDefs.forEach((d, i) => {
    const el = tagEls[i];
    if (t < d.s || t > d.e + 0.15) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const [x, y] = project(d.anchor());
    const w = el.offsetWidth, h = el.offsetHeight, gap = 14;
    el.style.left = clamp(d.side === 'r' ? x + gap : x - gap - w, 24, W - 24 - w) + 'px';
    el.style.top = clamp(y - h / 2, 240, 1540) + 'px';
    el.style.setProperty('--ox', d.side === 'r' ? '0%' : '100%');
    const p = (t - d.s) / 0.38, o = clamp((t - d.e) / 0.15);
    el.style.opacity = clamp((t - d.s) / 0.16) * (1 - o);
    el.style.transform = `scale(${lerp(0.5, 1, backOut(p))})`;
  });
  let si = -1; stampDefs.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const stp = $('stamp');
  if (si !== lastStamp) {
    lastStamp = si;
    stp.innerHTML = si < 0 ? '' : stampDefs[si][2].split('|').map(line => `<div class="kl">${line.split(' ').map(w => `<span class="${stampDefs[si][4]}" data-t="${w}">${w}</span>`).join(' ')}</div>`).join('');
    if (si >= 0) stp.style.top = stampDefs[si][3] - (stampDefs[si][2].includes('|') ? 150 : 0) + 'px';
  }
  if (si >= 0) {
    const d = stampDefs[si], pout = clamp((t - d[1]) / 0.3);
    [...stp.querySelectorAll('span')].forEach((sp, k) => {
      const pin = (t - d[0] - k * 0.14) / 0.32;
      sp.style.opacity = clamp(pin * 3) * (1 - pout);
      sp.style.transform = `translateY(${(-120 * (1 - clamp(pin)) ** 2).toFixed(1)}px) rotate(${(-6 + (k % 2) * 4).toFixed(1)}deg) scale(${(lerp(1.6, 1, backOut(pin)) * lerp(1, 0.85, pout)).toFixed(3)})`;
    });
  }
  const ck = chunks.findIndex(c => t >= c.s && t < c.e), cap = $('cap');
  if (ck !== lastChunk) { cap.innerHTML = ck < 0 ? '' : `<span class="pill in">${chunks[ck].map(w => `<b>${w.w}</b>`).join(' ')}</span>`; lastChunk = ck; }
  if (ck >= 0) {
    const pill = cap.firstChild, c = chunks[ck];
    pill.style.opacity = lerp(0.2, 1, clamp((t - c.s) / 0.2));
    [...pill.children].forEach((b, k) => { const w = c[k]; b.className = t >= w.next ? 'past' : (t >= w.s ? 'cur' : ''); });
  }
  updateBg(t);
  updateFx(t);
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = o.userData.nmat || normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  ev.push({ t: CUT_T, type: 'whoosh' }, { t: tBuka - 0.05, type: 'lid' }, { t: tBuka + 0.1, type: 'whoosh' });
  ev.push({ t: tUap, type: 'desis', dur: tKutub - tUap }, { t: tTurb, type: 'hum', dur: LOOP_T - tTurb });
  ev.push({ t: tKutub + 0.3, type: 'zap' }, { t: tArus, type: 'hit' }, { t: tArus + 0.05, type: 'chime' }, { t: LOOP_T, type: 'whoosh' }, { t: LOOP_T + 0.2, type: 'blip' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', 1.2); cue('act1', L[1].s); cue('danger', tUap); cue('build', tTurb); cue('drop', tKutub - 0.1); cue('reveal', tArus); cue('warm', tArus + 1.2);
  cue('dark', L[5].s - 0.2); cue('resolve', tGerak); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project([40, 70, 40]);
