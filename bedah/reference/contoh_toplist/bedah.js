// Video "Perjalanan listrik di rumah" — satu dinding ruang tamu dibelah: tiang PLN -> meteran -> MCB -> kabel di tembok -> stopkontak -> charger -> HP.
// Aliran listrik digambar sebagai titik bercahaya (AC bergetar, DC mengalir). Satu model per waktu: arus, bimetal, kumparan, tuas, lampu rumah.
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
const NL = 9;
const L = Array.from({ length: NL }, (_, i) => LN(i));
const DUR = +(L[NL - 1].e + 1.6).toFixed(3);
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

// ---------- palet, cel 3 nada ----------
const flat = h => [h, h, h];
const PAL = {
  body: ['#f7f5f0', '#dedad1', '#b4ae9f'], cutBody: flat('#ece8de'), grey: ['#d9dce1', '#aeb3bc', '#7d838e'], dark: ['#4a4d57', '#33353d', '#1e1f24'],
  lcd: ['#bfe3b4', '#9ccc8f', '#7aa96c'], key: ['#fbfbf8', '#e2e2dc', '#bdbdb5'], red: ['#ff8a80', '#e5484d', '#b8333a'],
  brass: ['#f1c75e', '#d6a136', '#a87a22'], cutBrass: flat('#f3d27f'), copper: ['#f2a46f', '#d9773f', '#a8551f'], cutCopper: flat('#eb9a63'),
  steel: ['#e2e3e7', '#b2b5bd', '#7a7d86'], cutSteel: flat('#cfd2d8'), silver: ['#fbfcfd', '#c3cad4', '#7e8794'],
  bimB: ['#f6d27a', '#e0ad3c', '#b0821f'], bimS: ['#d0d4db', '#a3a8b2', '#737883'], hot: ['#ffb36b', '#f0702e', '#b8451a'],
  toggle: ['#5b7fd6', '#3e5fb8', '#2a4388'], wireL: ['#9a6a4a', '#7a4f33', '#553521'], wireN: ['#86b5ff', '#3f72d8', '#2a4fa3'],
  pcb: ['#5fb38a', '#2f8a5f', '#1f6542'], cap: ['#5a7bd1', '#3a5bb0', '#26407e'], ic: ['#4a4d57', '#2c2e36', '#1a1b20'],
  tape: ['#ffe48a', '#f2c94c', '#c99a1f'], ferrite: ['#5c5f68', '#3f424a', '#26282e'], phone: ['#3b3e47', '#25272d', '#141518'], screen: flat('#1c2a3a'),
  insul: ['#4a4d57', '#33353d', '#1e1f24'], plate: ['#ffffff', '#ebe9e3', '#c9c6bd'], box: ['#9aa0aa', '#7b818c', '#5b606a'],
  glass: ['#eef6fb', '#d6e7f2', '#b7cfdf'], pvc: ['#d3d6db', '#a9adb5', '#7c818a'], box2: ['#c9ccd2', '#9ea3ac', '#737882'], nym: ['#fbfbf8', '#e4e3dd', '#bdbbb2'],
  ledB: flat('#7fd6ff'), cupIn: ['#f4f2ec', '#dedbd2', '#bfbbb0'], resistor: ['#e8d3a8', '#cdb07c', '#a88a55'], wood: ['#dcb98a', '#bf9663', '#93703f'], cableW: ['#fbfbf8', '#dcdbd5', '#b0aea6'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], hl: ['#f6dc8e', '#e3bf62', '#b8913a'], warn: ['#f0a57a', '#d9773f', '#a8551f'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// Cel berbasis teori warna (lihat reference/panduan_warna.md): 2 nada + terminator lembut, bayangan bergeser ke ungu-biru sejuk
// (bukan sekadar gelap), sisi terang sedikit hangat, cahaya langit dari atas, cahaya pinggir (rim) sejuk, kilap sesuai bahan.
// m.hl(palet, k) = ganti warna ke palet sorot (seperti dulu); m.glow(k) = sorotan lembut (pinggir menyala emas), warna asli tetap.
const GLOSS = { silver: 0.9, steel: 0.8, silverF: 0.8, fridge: 0.7, gal: 0.9, water: 0.6, acBody: 0.45, rcBody: 0.4, key: 0.35, dark: 0.55, tapR: 0.6, tapB: 0.6, irBlue: 0.5, rcPanel: 0.6, grey: 0.35, green: 0.45, brass: 0.8, cutBrass: 0.3, copper: 0.7, phone: 0.6, glass: 0.9 };
function cel(pal, gloss = GLOSS[pal] ?? 0.2) {
  const [a, b, c] = C3(PAL[pal]);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { c0: { value: a }, c1: { value: b }, c2: { value: c }, k: { value: 0 }, gl: { value: gloss }, gw: { value: 0 }, al: { value: 1 },
      h0: { value: C3(PAL.hl || PAL.yellow)[0] }, h1: { value: C3(PAL.hl || PAL.yellow)[1] }, h2: { value: C3(PAL.hl || PAL.yellow)[2] } },
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
        col = mix(col, t0 * vec3(1.02, 1.0, .965), smoothstep(.62, .74, d)) * .97;  // bidang terang, hangat (putih tidak pernah 100%)
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
const shp = pts => { const s = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v))); s.closePath(); return s; };
const rectS = (u0, u1, v0, v1) => shp([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
const box = (x0, x1, y0, y1, z0, z1, mat) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// bentuk (x, y) diekstrusi sepanjang +z dari z0 (bawaan ExtrudeGeometry)
const prismXY = (shape, z0, z1, mat) => mesh(new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 16 }), mat, 0, 0, z0);
const faceXY = (shape, z, mat) => mesh(new THREE.ShapeGeometry(shape, 16), mat, 0, 0, z);
// bentuk (z, x) diekstrusi sepanjang +y
const UZX = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0));
const prismZX = (shape, y0, y1, mat) => mesh(new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 16 }).applyMatrix4(UZX).translate(0, y0, 0), mat);
const faceZX = (shape, y, mat) => mesh(new THREE.ShapeGeometry(shape, 16).applyMatrix4(UZX), mat, 0, y, 0);
const tube = (pts, r, mat) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', 0.3), 120, r, 10), mat);
class Helix extends THREE.Curve {
  constructor(len, r, turns) { super(); this.len = len; this.r = r; this.turns = turns; }
  getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * this.turns; return o.set(Math.cos(a) * this.r, t * this.len, Math.sin(a) * this.r); }
}

// ---------- dunia (mm): dinding x = 0 (perangkat menonjol ke +x), lantai y = 0, sumbu z mendatar (+z di kiri layar) ----------
// Bentuk mengikuti foto instalasi rumah: meteran prabayar (LCD + keypad 12 tombol + LED imp/kWh, kabel masuk dari bawah lewat
// tutup terminal bening), kotak MCB abu-abu berjendela bening, pipa PVC abu-abu menempel di dinding, stopkontak SNI (cekung bulat
// + klip arde), charger putih dengan port USB, HP di meja kecil.
const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const celA = (pal, alpha) => { const m = cel(pal); m.transparent = true; m.depthWrite = false; m.uniforms.al.value = alpha; return m; };
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
const METER = { z0: 430, z1: 610, y0: 1500, y1: 1800, d: 90 };
const MCB = { zc: 320, y0: 1585, y1: 1675, d: 72, hw: 9 };       // modul 18 × 90 × 72 mm
const MBOX = { z0: 265, z1: 375, y0: 1520, y1: 1740, d: 84 };      // kotak MCB
const SOCK = { y: 380, d: 10 };                                   // stopkontak di z = 0, tinggi 38 cm
const CHG = { z0: -21, z1: 21, y0: 356, y1: 404, x0: 10.5, x1: 44 };
const TABLE = { x0: 20, x1: 300, z0: -720, z1: -400, h: 460 };

// meteran prabayar
const meter = new THREE.Group(); lt.add(meter);
const mBody = cel('body'), lcdMat = cel('lcd'), keyMat = cel('key'), ledMat = cel('red');
meter.add(rbox(0, METER.d, METER.y0, METER.y1, METER.z0, METER.z1, 10, mBody));
meter.add(rbox(METER.d - 4, METER.d + 2, 1680, 1790, 440, 600, 4, cel('grey')));                 // panel atas abu-abu
meter.add(box(METER.d + 1, METER.d + 3, 1700, 1760, 462, 578, cel('dark')), box(METER.d + 2.5, METER.d + 3.5, 1705, 1755, 467, 573, lcdMat));
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) meter.add(rbox(METER.d - 1, METER.d + 4, 1530 + r * 34, 1556 + r * 34, 468 + c * 36, 498 + c * 36, 3, keyMat));
const led = mesh(new THREE.CylinderGeometry(3.5, 3.5, 4, 16).rotateZ(Math.PI / 2), ledMat, METER.d + 2.5, 1772, 590); meter.add(led);
meter.add(rbox(4, 78, 1430, 1505, 440, 600, 6, celA('glass', 0.35)));                             // tutup terminal bening
meter.add(box(10, 40, 1445, 1478, 455, 585, cel('dark')));                                        // blok terminal
for (let k = 0; k < 4; k++) meter.add(mesh(new THREE.CylinderGeometry(3.2, 3.2, 3, 12).rotateZ(Math.PI / 2), cel('brass'), 41, 1462, 470 + k * 34));
// pipa PVC: dari atas (kabel SR dari tiang) turun ke bawah meteran; meteran -> kotak MCB; kotak MCB -> masuk tembok
const pvc = cel('pvc');
const tubeR = (pts, r, mat) => { const m = tube(pts, r, mat); lt.add(m); return m; };
tubeR([[12, 2420, 650], [12, 2300, 650], [12, 1450, 650], [14, 1405, 630], [20, 1400, 585], [24, 1425, 560]], 10, pvc);
tubeR([[24, 1425, 470], [20, 1395, 455], [14, 1380, 420], [14, 1380, 360], [18, 1400, 335], [22, 1520, 335]], 8, pvc);
tubeR([[22, 1520, 305], [20, 1495, 305], [8, 1475, 305], [-2, 1468, 305]], 8, pvc);
// kotak MCB: pelat belakang, dinding atas/bawah/kanan; dinding dekat (z kecil) + jendela bening ikut "tutup" saat dibelah
const mcb = new THREE.Group(); lt.add(mcb);
const boxMat = cel('box2');
mcb.add(box(0, 4, MBOX.y0, MBOX.y1, MBOX.z0, MBOX.z1, boxMat), box(0, MBOX.d, MBOX.y1 - 4, MBOX.y1, MBOX.z0, MBOX.z1, boxMat), box(0, MBOX.d, MBOX.y0, MBOX.y0 + 4, MBOX.z0, MBOX.z1, boxMat),
  box(0, MBOX.d, MBOX.y0, MBOX.y1, MBOX.z1 - 4, MBOX.z1, boxMat), box(4, 8, 1625, 1640, MBOX.z0 + 6, MBOX.z1 - 6, cel('steel')));     // rel DIN
const boxNear = new THREE.Group(); mcb.add(boxNear);
boxNear.add(box(0, MBOX.d, MBOX.y0, MBOX.y1, MBOX.z0, MBOX.z0 + 4, boxMat), box(MBOX.d - 3, MBOX.d, MBOX.y0, MBOX.y1, MBOX.z0, MBOX.z1, celA('glass', 0.28)));
// modul MCB: profil bertingkat (sayap 56, hidung 64, jendela tuas 72), dibelah di z = zc; belahan dekat = tutup
const mcbG = new THREE.Group(); mcbG.position.set(4, MCB.y0, MCB.zc); mcb.add(mcbG);            // koordinat lokal: x kedalaman, y 0..90
const bodyMat = cel('body'), cutBody = cel('cutBody');
const PROF = [[0, 0], [56, 0], [56, 20], [64, 20], [64, 34], [72, 34], [72, 60], [64, 60], [64, 70], [56, 70], [56, 90], [0, 90]];
const PROF_IN = [[2.5, 2.5], [53.5, 2.5], [53.5, 22.5], [61.5, 22.5], [61.5, 36.5], [69.5, 36.5], [69.5, 57.5], [61.5, 57.5], [61.5, 67.5], [53.5, 67.5], [53.5, 87.5], [2.5, 87.5]];
const housing = shp(PROF), hollow = shp(PROF_IN), hShape = shp(PROF); hShape.holes.push(shp(PROF_IN));
mcbG.add(prismXY(hShape, 0, MCB.hw, bodyMat), faceXY(hShape, -0.02, cutBody));
mcbG.add(prismXY(hollow, MCB.hw - 1.5, MCB.hw, cel('grey')));
const mcbCover = new THREE.Group(); mcbG.add(mcbCover);
mcbCover.add(prismXY(housing, -MCB.hw, 0, bodyMat));
const P = (pal, cpal) => [cel(pal), cel(cpal || pal)];
const part = (shape, mats, z0 = 0, z1 = 6) => { const g = new THREE.Group(); g.add(prismXY(shape, z0, z1, mats[0]), faceXY(shape, z0 - 0.03, mats[1])); return g; };
const brassM = P('brass', 'cutBrass'), copperM = P('copper', 'cutCopper'), steelM = P('steel', 'cutSteel');
mcbG.add(part(rectS(8, 32, 78, 88), brassM), part(rectS(8, 32, 2, 12), brassM));
mcbG.add(mesh(new THREE.CylinderGeometry(3, 3, 8, 16).rotateX(Math.PI / 2), cel('steel'), 20, 83, 3), mesh(new THREE.CylinderGeometry(3, 3, 8, 16).rotateX(Math.PI / 2), cel('steel'), 20, 7, 3));
const coil = new THREE.Group(); mcbG.add(coil);
coil.add(part(rectS(34, 52, 50, 66), copperM));
for (let k = 0; k < 6; k++) coil.add(box(33.6, 52.4, 51 + k * 2.6, 52 + k * 2.6, -0.2, 6.2, cel('brass')));
const plunger = part(rectS(41, 45, 42, 64), steelM); mcbG.add(plunger);
for (let k = 0; k < 6; k++) mcbG.add(part(rectS(8, 24, 25 + k * 3.6, 26.6 + k * 3.6), steelM, 0.5, 5.5));
mcbG.add(part(rectS(26, 31, 47, 52), P('silver', 'cutSteel')), part(rectS(31, 35, 48.5, 50.5), copperM));
const arm = new THREE.Group(); arm.position.set(48, 36, 0); mcbG.add(arm);
arm.add(part(shp([[-18, 13], [-16, 15.5], [2, 1.5], [0, -1.5]]), steelM), part(rectS(-19.5, -15.5, 12.5, 16.5), P('silver', 'cutSteel')));
const bimL = cel('bimB'), bimR = cel('bimS');
const bim = mesh(new THREE.BufferGeometry(), bimL), bim2 = mesh(new THREE.BufferGeometry(), bimR); mcbG.add(bim, bim2);
function setBimetal(bend) {
  const strip = (off) => { const L = [], R = []; for (let i = 0; i <= 10; i++) { const u = i / 10, y = 14 + u * 22, dx = bend * 3 * u * u; L.push([50 + off + dx, y]); R.push([51.5 + off + dx, y]); } return shp([...L, ...R.reverse()]); };
  bim.geometry.dispose(); bim.geometry = new THREE.ExtrudeGeometry(strip(0), { depth: 6, bevelEnabled: false });
  bim2.geometry.dispose(); bim2.geometry = new THREE.ExtrudeGeometry(strip(1.5), { depth: 6, bevelEnabled: false });
}
mcbG.add(part(rectS(44, 55, 9, 14), P('dark')));
const tog = new THREE.Group(); tog.position.set(66, 47, 0); mcbG.add(tog);
const togMat = cel('toggle');
tog.add(rbox(-3, 16, -4, 4, -MCB.hw + 1.5, MCB.hw - 1.5, 2, togMat));
// kabel di dalam kotak: dari pipa bawah naik ke terminal atas MCB; keluar dari terminal bawah ke pipa tembok
const wireL = cel('wireL'), wireN = cel('wireN');
lt.add(tube([[22, 1524, 335], [26, 1560, 352], [34, 1705, 352], [30, 1678, MCB.zc + 4]], 2.4, wireL));
lt.add(tube([[30, 1588, MCB.zc + 4], [26, 1560, 305], [20, 1525, 305]], 2.4, wireL));
// kabel NYM (selubung putih) di dalam alur tembok, inti cokelat (fase) & biru (netral) di dekat stopkontak
const OUT_PATH = [[-8, 1468, 305], [-8, 1440, 305], [-8, 440, 305], [-8, 420, 285], [-8, 420, 60], [-14, 400, 22], [-20, 380, 9.5]];
lt.add(tube(OUT_PATH.slice(0, 5), 4.2, cel('nym')));
lt.add(tube([[-8, 420, 60], [-14, 400, 22], [-20, 380, 9.5]], 2.4, wireL), tube([[-8, 420, 60], [-14, 396, 10], [-20, 380, -9.5]], 2.4, wireN));

// stopkontak SNI: pelat 86 × 86 + cekungan bulat Ø40 (dalam 15) + inbow; dibelah di y = SOCK.y (belahan atas diangkat)
const sock = new THREE.Group(); lt.add(sock);
const plateM = P('plate', 'cutBody'), boxM = P('box', 'cutSteel');
const sockLower = new THREE.Group(); sock.add(sockLower);
const sockUpper = new THREE.Group(); sock.add(sockUpper);
const RINGS = [shp([[-43, 0], [-20, 0], [-20, 10], [-43, 10]]), shp([[20, 0], [43, 0], [43, 10], [20, 10]]), shp([[-20, -6], [20, -6], [20, -4], [-20, -4]])];   // sayap pelat + dasar cekungan
const sockBox = shp([[-30, -36], [30, -36], [30, -5.5], [-30, -5.5]]);
const half = (g, y0, y1, faceY) => {
  for (const ring of RINGS) g.add(prismZX(ring, y0, y1, plateM[0]), faceZX(ring, faceY, plateM[1]));
  g.add(prismZX(sockBox, y0, y1, boxM[0]), faceZX(sockBox, faceY, boxM[1]));
};
half(sockLower, SOCK.y - 43, SOCK.y, SOCK.y + 0.03);
half(sockUpper, SOCK.y, SOCK.y + 43, SOCK.y - 0.03);
sockUpper.add(box(2, 10, SOCK.y + 17, SOCK.y + 21, -5, 5, cel('silver')));       // klip arde atas & bawah
sockLower.add(box(2, 10, SOCK.y - 21, SOCK.y - 17, -5, 5, cel('silver')));
for (const zc of [-9.5, 9.5]) sock.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 16).rotateZ(Math.PI / 2), cel('dark'), -2.7, SOCK.y, zc));
const cup = new THREE.Group(); sock.add(cup);                                                     // cekungan bulat (tampak depan)
cup.add(mesh(new THREE.CylinderGeometry(20, 20, 15, 48, 1, true).rotateZ(Math.PI / 2), cel('cupIn'), 2.5, SOCK.y, 0), mesh(new THREE.CircleGeometry(20, 48).rotateY(Math.PI / 2), cel('cupIn'), -3, SOCK.y, 0));
{ const f = new THREE.Shape(); f.moveTo(-43, -43); f.lineTo(43, -43); f.lineTo(43, 43); f.lineTo(-43, 43); f.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, 20, 0, Math.PI * 2, true); f.holes.push(h);
  cup.add(mesh(new THREE.ShapeGeometry(f, 48).applyMatrix4(new THREE.Matrix4().makeBasis(V(0, 0, -1), V(0, 1, 0), V(1, 0, 0))), cel('plate'), 11.0, SOCK.y, 0)); }
const clipM = P('brass', 'cutBrass');
for (const zc of [-9.5, 9.5]) for (const s of [-1, 1]) {
  const sh = shp([[zc + s * 2.1, -26], [zc + s * 3.6, -26], [zc + s * 3.6, -8], [zc + s * 2.1, -10]]);
  sockLower.add(prismZX(sh, SOCK.y - 7, SOCK.y, clipM[0]), faceZX(sh, SOCK.y + 0.04, clipM[1]));
}
// charger: kaki steker, badan putih bersudut bulat (belahan depan = tutup), papan & komponen, port USB-A di bawah, LED
const chg = new THREE.Group(); lt.add(chg);
const pinM = P('silver', 'cutSteel');
for (const zc of [-9.5, 9.5]) {
  chg.add(mesh(new THREE.CylinderGeometry(2, 2, 24, 20).rotateZ(Math.PI / 2), pinM[0], -1.5, SOCK.y, zc));
  chg.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 9, 20).rotateZ(Math.PI / 2), cel('insul'), 6, SOCK.y, zc));
}
const chgBody = cel('plate');
const chgBack = new THREE.Group(); chg.add(chgBack);
chgBack.add(rbox(CHG.x0, 34, CHG.y0, CHG.y1, CHG.z0, CHG.z1, 4, chgBody));
chgBack.add(box(32, 34, 358, 402, -19, 19, cel('pcb')));
const chgFront = new THREE.Group(); chg.add(chgFront);
chgFront.add(rbox(30, CHG.x1, CHG.y0, CHG.y1, CHG.z0, CHG.z1, 5, chgBody), mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 12).rotateZ(Math.PI / 2), cel('ledB'), CHG.x1 + 0.2, 398, 14));
const comp = new THREE.Group(); chg.add(comp);
const diodes = [], dMat = cel('ic');
for (let k = 0; k < 4; k++) { const d = mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 12), dMat, 37, 394, -15 + k * 4.2); comp.add(d); diodes.push(d); }
const capMesh = mesh(new THREE.CylinderGeometry(5, 5, 9, 24).rotateZ(Math.PI / 2), cel('cap'), 38.5, 391, 9); comp.add(capMesh);
comp.add(box(42.9, 43.1, 386, 396, 6.5, 8, cel('steel')));                                        // garis polaritas kapasitor
const icMesh = box(34, 37, 372, 382, -15, -6, cel('ic')); comp.add(icMesh);
for (let k = 0; k < 4; k++) comp.add(box(34, 35.5, 371.4 + k * 3, 372.4 + k * 3, -16, -15, cel('steel')), box(34, 35.5, 371.4 + k * 3, 372.4 + k * 3, -6, -5, cel('steel')));
for (let k = 0; k < 3; k++) comp.add(mesh(new THREE.CylinderGeometry(1, 1, 7, 10).rotateX(Math.PI / 2), cel('resistor'), 35.2, 362, -14 + k * 4));
const xfm = new THREE.Group(); comp.add(xfm);
xfm.add(box(34, 44, 366, 380, 2, 16, cel('tape')), box(34, 45, 365, 368, 1, 17, cel('ferrite')), box(34, 45, 378, 381, 1, 17, cel('ferrite')));
const usb = new THREE.Group(); chg.add(usb);
usb.add(box(22, 40, 353, 357.5, -7, 7, cel('silver')), box(24, 38, 352.6, 353.4, -5.5, 5.5, cel('dark')));
// meja kecil + HP + kabel USB
const tbl = new THREE.Group(); lt.add(tbl);
const wood = cel('wood');
tbl.add(rbox(TABLE.x0, TABLE.x1, TABLE.h - 22, TABLE.h, TABLE.z0, TABLE.z1, 5, wood));
for (const [x, z] of [[TABLE.x0 + 18, TABLE.z0 + 18], [TABLE.x1 - 18, TABLE.z0 + 18], [TABLE.x0 + 18, TABLE.z1 - 18], [TABLE.x1 - 18, TABLE.z1 - 18]]) tbl.add(box(x - 10, x + 10, 0, TABLE.h - 22, z - 10, z + 10, wood));
const phone = new THREE.Group(); lt.add(phone);
phone.add(rbox(110, 185, TABLE.h, TABLE.h + 8, -610, -455, 6, cel('phone')), box(114, 181, TABLE.h + 8, TABLE.h + 8.3, -606, -459, cel('screen')));
const cableUSB = tube([[31, 352, 0], [40, 290, -20], [60, 250, -160], [90, 380, -330], [125, 462, -420], [147, TABLE.h + 4, -455]], 2, cel('cableW')); lt.add(cableUSB);
// titik-titik penanda
const mk = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const MK = {
  meter: mk(lt, METER.d, 1700, METER.z0), lcd: mk(lt, METER.d + 2, 1725, 520), mcbFront: mk(lt, MBOX.d, 1634, MCB.zc - 30), coil: mk(mcbG, 52, 58, 0), bim: mk(mcbG, 53, 26, 0),
  contact: mk(mcbG, 28, 50, 0), chute: mk(mcbG, 16, 38, 0), tog: mk(mcbG, 80, 50, 0), sock: mk(lt, 10, 423, 0), clip: mk(lt, -16, SOCK.y, 12),
  chg: mk(lt, CHG.x1, 400, 0), diode: mk(lt, 39, 394, -9), cap: mk(lt, 43, 391, 9), ic: mk(lt, 37, 377, -10), xfm: mk(lt, 45, 373, 9), usb: mk(lt, 40, 355, 0),
  phone: mk(lt, 148, TABLE.h + 8, -532), groove: mk(lt, 2, 900, 305),
};
// jalur aliran listrik: AC dari tiang sampai charger, DC setelahnya
const FLOW_AC = [[12, 2420, 650], [12, 1450, 650], [14, 1405, 630], [24, 1425, 560], [30, 1470, 530], [30, 1470, 480], [24, 1425, 470], [14, 1380, 420], [14, 1380, 360], [22, 1520, 335],
  [34, 1705, 352], [30, 1678, MCB.zc + 4], [30, 1588, MCB.zc + 4], [20, 1525, 305], ...OUT_PATH, [1, SOCK.y, 9.5], [30, SOCK.y, 4], [37, 392, -6], [38, 380, 0]];
const FLOW_DC = [[38, 380, 0], [31, 354, 0], [40, 290, -20], [60, 250, -160], [90, 380, -330], [125, 462, -420], [147, TABLE.h + 4, -455]];
const curveAC = new THREE.CatmullRomCurve3(FLOW_AC.map(p => V(...p)), false, 'catmullrom', 0.2), curveDC = new THREE.CatmullRomCurve3(FLOW_DC.map(p => V(...p)), false, 'catmullrom', 0.2);
const ptsAC = curveAC.getSpacedPoints(420), ptsDC = curveDC.getSpacedPoints(120);

// ---------- lima alat rumah (mm, koordinat ruang yang sama) ----------
// Bentuk mengikuti foto produk: AC split dinding (panel depan cembung, sirip miring di bawah, layar di ujung kanan), kulkas 2 pintu
// abu gelap (freezer di atas, gagang tegak, kisi bawah), dispenser berdiri + galon 19 L terbalik (ceruk keran merah/biru, nampan
// tetes, pintu kabinet hijau), magic com (badan gentong bermotif bunga, tutup kubah, gagang angkat, panel tuas + 2 lampu),
// setrika kering (tapak krom runcing, badan hitam, gagang tertutup, kenop suhu, kabel di belakang).
PAL.acBody = ['#fbfbf8', '#e4e3dd', '#bdbbb2']; PAL.fridge = ['#80858e', '#5f636c', '#41444b']; PAL.irBlue = ['#7fb0ef', '#3f72d8', '#2a4fa3'];
PAL.rcBody = ['#fdfbf7', '#ebe5dc', '#c9bfb1']; PAL.gal = ['#d6ecff', '#a9d2f5', '#7fb0e0']; PAL.water = ['#9fd0ff', '#6fb0ef', '#4a8bd0'];
PAL.green = ['#c5ec8a', '#9fd45a', '#74a83a']; PAL.rcPanel = ['#a8cdf7', '#78a9e6', '#4f7fc0']; PAL.flower = flat('#c9b6e8'); PAL.flowerC = flat('#f2c94c');
PAL.ledO = flat('#ffb347'); PAL.ledG = flat('#5fd38a'); PAL.ledR = flat('#ff6b5b'); PAL.tapR = ['#ff8a80', '#e5484d', '#b8333a']; PAL.tapB = ['#86b5ff', '#3f72d8', '#2a4fa3'];
const lathe = (pts, mat, x, y, z, seg = 64) => mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat, x, y, z);
const ledM = (p, x, y, z, r = 5) => mesh(new THREE.CylinderGeometry(r, r, 4, 12).rotateZ(Math.PI / 2), cel(p), x, y, z);
const ALAT = {};
// AC split 1 PK di dinding atas: profil samping (x, y) diekstrusi sepanjang z
{ const g = new THREE.Group(); lt.add(g); ALAT.ac = g;
  const s = new THREE.Shape(); s.moveTo(0, 2205); s.lineTo(0, 2490); s.lineTo(168, 2490); s.quadraticCurveTo(204, 2490, 207, 2455);
  s.quadraticCurveTo(217, 2352, 207, 2262); s.quadraticCurveTo(198, 2212, 150, 2200); s.lineTo(40, 2198); s.quadraticCurveTo(6, 2198, 0, 2205);
  g.add(prismXY(s, -1250, -450, cel('acBody')));
  g.add(box(72, 178, 2194, 2199, -1228, -472, cel('dark')));                                       // celah udara keluar
  ALAT.acFlap = new THREE.Group(); ALAT.acFlap.position.set(95, 2202, 0); g.add(ALAT.acFlap);   // sirip (louver) berengsel: tertutup rapat, terbuka miring
  ALAT.acFlap.add(prismXY(shp([[-3, -4], [91, -36], [93, -28], [0, 3]]), -1225, -475, cel('acBody')));
  for (let z = -1180; z < -480; z += 90) g.add(box(100, 160, 2186, 2197, z - 2, z + 2, cel('grey')));   // sirip tegak di dalam celah
  g.add(rbox(205, 213, 2298, 2352, -1172, -1078, 5, cel('dark')));                                  // layar suhu (ujung kanan)
  g.add(ledM('ledG', 212, 2322, -1060, 4));
  g.add(box(209, 212, 2414, 2424, -880, -820, cel('grey'))); }                                       // logo
// kulkas 2 pintu: freezer atas ±1/3, pintu kulkas bawah, gagang tegak di sisi kiri, kisi ventilasi bawah
{ const g = new THREE.Group(); lt.add(g); ALAT.kulkas = g;
  g.add(rbox(30, 650, 60, 1520, -1900, -1300, 16, cel('fridge')));
  g.add(rbox(640, 690, 1068, 1516, -1896, -1304, 12, cel('fridge')), rbox(686, 706, 1095, 1300, -1346, -1326, 6, cel('steel')));   // pintu freezer + gagang
  g.add(box(650, 652, 80, 1040, -1880, -1320, cel('plate')));                                       // dinding dalam (terlihat saat pintu dibuka)
  for (const y of [330, 600, 860]) g.add(box(652, 662, y, y + 8, -1876, -1324, cel('glass')));      // rak kaca
  ALAT.fridgeDoor = new THREE.Group(); ALAT.fridgeDoor.position.set(690, 0, -1896); g.add(ALAT.fridgeDoor);   // pintu kulkas berengsel di kanan
  const fd = new THREE.Group(); fd.position.set(-690, 0, 1896); ALAT.fridgeDoor.add(fd);
  fd.add(rbox(640, 690, 64, 1060, -1896, -1304, 12, cel('fridge')), rbox(686, 706, 800, 1035, -1346, -1326, 6, cel('steel')));
  g.add(box(688, 691, 1458, 1472, -1640, -1560, cel('silver')));                                    // logo
  g.add(box(40, 630, 0, 62, -1885, -1315, cel('dark')));
  for (let z = -1840; z < -1340; z += 45) g.add(box(630, 633, 18, 46, z, z + 26, cel('fridge'))); }   // kisi bawah
// dispenser berdiri + galon 19 L terbalik (leher masuk dudukan di atas)
{ const g = new THREE.Group(); lt.add(g); ALAT.dispenser = g; const zc = 1305;
  g.add(rbox(30, 340, 0, 960, 1150, 1460, 20, cel('acBody')));
  g.add(mesh(new THREE.CylinderGeometry(122, 128, 30, 48), cel('grey'), 185, 975, zc));            // dudukan galon
  g.add(rbox(328, 342, 560, 862, 1185, 1425, 10, cel('grey')));                                     // ceruk keran
  g.add(rbox(336, 352, 850, 872, 1178, 1432, 6, cel('acBody')));                                    // atap ceruk
  for (const [z, p] of [[1355, 'tapR'], [1255, 'tapB']]) {                                           // keran panas (kiri) & normal (kanan)
    g.add(rbox(340, 372, 752, 802, z - 22, z + 22, 8, cel(p)), mesh(new THREE.CylinderGeometry(7, 7, 26, 16), cel(p), 362, 740, z), rbox(368, 382, 772, 816, z - 13, z + 13, 4, cel(p))); }
  g.add(rbox(318, 374, 560, 586, 1190, 1420, 8, cel('irBlue')));                                    // nampan tetes
  for (let z = 1205; z < 1410; z += 22) g.add(box(326, 366, 586, 587, z, z + 10, cel('tapB')));
  for (const [z, p] of [[1250, 'ledR'], [1305, 'ledG'], [1360, 'ledO']]) { const m = ledM(p, 341, 905, z); g.add(m); if (p === 'ledR') ALAT.dspHeat = m; }
  g.add(box(339, 341, 928, 940, 1270, 1340, cel('grey')));                                          // logo
  g.add(rbox(332, 348, 90, 520, 1180, 1430, 12, cel('green')), box(346, 350, 300, 470, 1400, 1410, cel('dark')));   // pintu kabinet
  const GAL = [[28, 0], [30, 55], [48, 72], [100, 96], [130, 128], [136, 155], [136, 240], [130, 250], [136, 262], [136, 360], [130, 370], [136, 382], [136, 462], [126, 486], [70, 494], [0, 496]];
  g.add(lathe(GAL, cel('gal'), 185, 950, zc), lathe(GAL.filter(p => p[1] >= 96 && p[1] <= 330).map(([r, h]) => [r + 1.5, h]).concat([[137.5, 330]]), cel('water'), 185, 950, zc)); }   // galon biru muda, air terlihat di bagian bawah (galon terbalik)
// meja diperlebar: rice cooker + setrika
tbl.scale.set(1.3, 1, 1.5); tbl.position.set(-10, 0, 280);
const TOP = TABLE.h;
// magic com: badan gentong, tutup kubah, gagang angkat rebah di tutup, panel depan (tuas COOK/WARM + 2 lampu), motif bunga
{ const g = new THREE.Group(); lt.add(g); ALAT.rice = g; const xc = 200, zc = -720;
  g.add(lathe([[0, 0], [104, 0], [110, 8], [118, 14], [125, 45], [128, 100], [126, 160], [122, 197], [0, 197]], cel('rcBody'), xc, TOP, zc));
  g.add(lathe([[0, 197], [124, 197], [127, 203], [122, 222], [105, 245], [75, 260], [35, 267], [0, 268]], cel('rcBody'), xc, TOP, zc));
  g.add(mesh(new THREE.TorusGeometry(125, 3, 8, 64).rotateX(Math.PI / 2), cel('grey'), xc, TOP + 198, zc));
  g.add(mesh(new THREE.TorusGeometry(132, 8, 10, 40, Math.PI).rotateY(Math.PI / 2).rotateZ(1.1), cel('grey'), xc, TOP + 172, zc));   // gagang angkat
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(16, 16, 10, 20).rotateX(Math.PI / 2), cel('grey'), xc, TOP + 172, zc + s * 128));
  g.add(rbox(316, 333, TOP + 196, TOP + 216, -742, -698, 7, cel('key')));                           // tombol buka tutup
  g.add(rbox(320, 334, TOP + 52, TOP + 168, -758, -682, 16, cel('rcPanel')));                       // panel depan
  ALAT.riceLever = rbox(330, 344, TOP + 64, TOP + 92, -736, -704, 5, cel('key')); g.add(ALAT.riceLever);   // tuas masak (bawah) / hangat (naik)
  ALAT.ledCook = ledM('ledR', 334, TOP + 140, -738, 6); g.add(ALAT.ledCook);
  ALAT.ledWarm = ledM('ledO', 334, TOP + 140, -702, 6); g.add(ALAT.ledWarm);
  [[42, 50], [-42, 130], [75, 140], [-75, 55], [110, 60], [-110, 150], [150, 120], [-150, 70]].forEach(([a, y]) => {   // bunga cetak
    const r = Math.PI * a / 180, R = 127 - Math.abs(y - 100) * 0.02, fl = new THREE.Group();
    for (let k = 0; k < 5; k++) fl.add(mesh(new THREE.CircleGeometry(8, 14), cel('flower'), 9 * Math.cos(k * 1.2566), 9 * Math.sin(k * 1.2566), 0));
    fl.add(mesh(new THREE.CircleGeometry(4.5, 12), cel('flowerC'), 0, 0, 0.3));
    fl.position.set(xc + Math.cos(r) * (R + 0.8), TOP + y, zc + Math.sin(r) * (R + 0.8)); fl.rotation.y = Math.atan2(Math.cos(r), Math.sin(r)); g.add(fl); });
  g.add(tube([[78, TOP + 30, -720], [52, TOP + 20, -726], [34, TOP - 40, -738], [30, 200, -760], [30, 30, -790]], 4, cel('dark'))); }
// setrika kering: tapak & cangkang = denah (z, x) diekstrusi ke atas; gagang = profil samping (z, y)
{ const g = new THREE.Group(); lt.add(g); ALAT.iron = g; const xc = 195, zc = -440;
  const plan = k => shp([[-140, 0], [-110, -28], [-70, -48], [-20, -60], [60, -62], [100, -60], [108, -50], [108, 50], [100, 60], [60, 62], [-20, 60], [-70, 48], [-110, 28]].map(([z, x]) => [zc + z * k, xc + x * k]));
  const lay = (k, y0, y1, bv, mat) => mesh(new THREE.ExtrudeGeometry(plan(k), { depth: y1 - y0 - 2 * bv, bevelEnabled: true, bevelSize: bv, bevelThickness: bv, bevelSegments: 3, curveSegments: 16 }).applyMatrix4(UZX).translate(0, y0 + bv, 0), mat);
  g.add(lay(0.9, TOP + 20, TOP + 64, 10, cel('dark')));
  const ZY = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)), hs = shp([[-96, 50], [-62, 122], [-38, 150], [78, 152], [100, 136], [102, 50]].map(([z, y]) => [zc + z, y]));
  hs.holes.push(shp([[-44, 66], [-28, 108], [70, 110], [76, 66]].map(([z, y]) => [zc + z, y])));
  g.add(mesh(new THREE.ExtrudeGeometry(hs, { depth: 22, bevelEnabled: true, bevelSize: 6, bevelThickness: 6, bevelSegments: 3 }).applyMatrix4(ZY), cel('dark'), xc + 11, TOP, 0));
  ALAT.ironDial = new THREE.Group(); ALAT.ironDial.position.set(xc, TOP + 68, zc - 106); g.add(ALAT.ironDial);   // kenop suhu (berputar)
  ALAT.ironDial.add(mesh(new THREE.CylinderGeometry(19, 21, 12, 28), cel('grey')), box(-2, 2, 6.2, 6.6, -16, 2, cel('red')));
  ALAT.ironSole = lay(1, TOP, TOP + 20, 4, cel('silver')); g.add(ALAT.ironSole);
  g.add(tube([[xc, TOP + 40, zc + 104], [xc, TOP + 36, zc + 140], [xc + 20, TOP - 10, zc + 160], [xc - 60, 250, zc + 200], [40, 30, zc + 240]], 4, cel('dark'))); }
// bayangan kontak lembut di atas meja (lantai & dinding: di lingkungan SVG)
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.5)'); g.addColorStop(.55, 'rgba(34,30,66,.22)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.position.set(x, y, z); lt.add(m); return m; };
blob(200, TOP + 0.6, -715, 165, 165); blob(190, TOP + 0.6, -440, 95, 165);
phone.visible = false; cableUSB.visible = false;
const ALAT_PT = { iron: [195, TOP + 160, -440], dispenser: [330, 1000, 1305], kulkas: [690, 1300, -1600], rice: [330, TOP + 230, -720], ac: [214, 2440, -850] };

// ---------- jadwal (format Top List: #5 → #1, tiap alat dihitung W × jam × 30 hari × tarif) ----------
const TARIF = 1444.70;
const ITEMS = [
  { key: 'iron', rank: 5, nama: 'Setrika', rumus: '350 W × 1 jam/hari', kwhHari: 0.35, li: 1 },
  { key: 'dispenser', rank: 4, nama: 'Dispenser', rumus: 'pemanas nyala-mati ±1 kWh/hari', kwhHari: 1.0, li: 2 },
  { key: 'kulkas', rank: 3, nama: 'Kulkas', rumus: 'kompresor nyala-mati ±1,2 kWh/hari', kwhHari: 1.2, li: 3 },
  { key: 'rice', rank: 2, nama: 'Rice cooker', rumus: 'masak 400 W×½ jam + hangat 60 W×20 jam', kwhHari: 1.4, li: 4 },
  { key: 'ac', rank: 1, nama: 'AC 1 PK', rumus: '800 W × 8 jam/hari', kwhHari: 6.4, li: 5 },
];
ITEMS.forEach(it => { it.kwh = it.kwhHari * 30; it.rp = it.kwh * TARIF; it.t = L[it.li].s - 0.1; it.e = L[it.li].e + 0.35; it.i = it.t + (it.e - it.t) * 0.45; });   // it.i = mulai 'inspect' (dekati bagian penyebab)
const IT = Object.fromEntries(ITEMS.map(it => [it.key, it]));
const warmOnT = T(4, 'menghangat');
const rb = v => `${Math.round(v / 1000)} rb`;
const warmOffT = T(7, 'matikan') + 0.3;
const kwhAt = t => 128.4 - 2.2 * smooth(0.2, L[0].e, t) - 0.004 * t;
const hookKeys = [[0, 0]], mcbOpenKeys = [[0, 0]], sockOpenKeys = [[0, 0]], TRIP = 1e9;

// kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x]
const WIDE = [-200, 1150, 3900, 35, 12, 0.5, 0.52, 0, 0];
const SHOT = {   // seluruh benda terlihat utuh di bawah kartu (kartu di 7–33% atas layar)
  iron: [-440, TOP + 80, 820, 70, 22, 0.5, 0.6, 0.6, 195], dispenser: [1305, 723, 2450, 70, 8, 0.5, 0.73, 0.4, 185],
  kulkas: [-1600, 760, 2800, 74, 0, 0.5, 0.66, 0.3, 360], rice: [-720, TOP + 135, 900, 72, 18, 0.5, 0.6, 0.6, 200], ac: [-850, 2345, 2000, 76, -4, 0.5, 0.6, 0.4, 110],
};
// bahasa kamera: establish (benda utuh) -> hold (kartu dibaca) -> inspect (dekati bagian penyebab) -> hold; kamera diam saat menjelaskan
const DETAIL = {
  iron: [-470, TOP + 45, 520, 64, 26, 0.5, 0.6, 0.6, 195], dispenser: [1305, 820, 1100, 66, 6, 0.5, 0.6, 0.4, 330],
  kulkas: [-1500, 720, 2300, 38, 4, 0.5, 0.64, 0.3, 560], rice: [-720, TOP + 110, 600, 74, 14, 0.5, 0.6, 0.6, 290], ac: [-980, 2290, 1350, 72, -8, 0.5, 0.56, 0.4, 150],
};
const HOOK = [520, 1722, 240, 86, 6, 0.5, 0.55, 0.5, 90];
const camKeys = [[0, HOOK.map((v, i) => (i === 2 ? 300 : v))], [1.3, HOOK], [T(0, 'lima') - 0.2, HOOK.map((v, i) => (i === 2 ? 255 : v))], [T(0, 'lima') + 0.6, WIDE], [L[0].e + 0.2, WIDE]];
ITEMS.forEach(it => { camKeys.push([it.t + 0.6, SHOT[it.key]], [it.i, SHOT[it.key]], [it.i + 0.7, DETAIL[it.key]], [it.e - 0.15, DETAIL[it.key]]); });
camKeys.push([L[6].s + 0.4, WIDE], [L[6].e + 0.2, WIDE], [T(7, 'matikan') - 0.3, DETAIL.rice], [T(7, 'jangan') - 0.5, DETAIL.rice], [T(7, 'jangan') + 0.2, DETAIL.ac], [L[7].e + 0.2, DETAIL.ac], [L[8].s + 0.5, WIDE], [DUR - 1.5, WIDE], [DUR, HOOK]);   // akhir kembali ke meteran: video berputar mulus

// ---------- label, teks kinetik, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
// (label meteran dihapus: menutupi angka kWh)
const SEBAB = { iron: ['Kenop suhu: panas', () => ALAT.ironDial, 'l'], dispenser: ['Pemanas nyala', () => ALAT.dspHeat, 'r'], kulkas: ['Udara dingin keluar', () => [700, 700, -1500], 'r'],
  rice: ['COOK → WARM', () => ALAT.riceLever, 'r'], ac: ['Sirip terbuka', () => [214, 2200, -760], 'r'] };
ITEMS.forEach(it => { const [txt, anc, side] = SEBAB[it.key]; tag(it.i + 0.8, it.e - 0.2, txt, anc, side, it.rank === 1 ? 'warn' : 'hi'); });
tag(T(7, 'matikan'), T(7, 'jangan') - 0.1, 'Mode hangat: OFF', () => ALAT.ledWarm, 'r', 'hi');
const stampDefs = [
  [T(0, 'lima'), L[0].e - 0.6, '5 alat', 1120, 'snd'],
  [T(5, 'dua'), L[5].e + 0.4, 'Rp277|ribu!', 1420, ''],
  [T(8, 'tulis'), DUR + 1, 'Tulis di|komentar', 1400, 'snd'],
];
const FORMAT = { topList: { total: 5, items: ITEMS.map(it => ({ t: it.t + 0.2, e: it.t + 1.7, rank: it.rank, judul: it.nama })) } };   // peringkat dulu, angka menyusul di kartu
const FMT = await import('./format.js'); FMT.pasang();

// ---------- caption karaoke ----------
const capCtx = document.createElement('canvas').getContext('2d'); capCtx.font = '800 58px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
const capW = s => capCtx.measureText(s).width + 52;   // lebar pil subtitle sebenarnya (padding 26 kiri-kanan)
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
const S = { on: 1, I: 0, bend: 0, dark: 0, imp: 0, plug: 1 };
const active = (t, key) => { const it = ITEMS.find(i => i.key === key); return pulse(it.t + 0.4, it.e, t, 0.2); };
function updateModel(t) {
  tog.rotation.z = 0.4; arm.rotation.z = 0; if (!S.bim0) { setBimetal(0); S.bim0 = 1; }
  chgFront.visible = true; chg.position.x = 0;
  ALAT.ledWarm.material.hl('ledO', 0);
  // setrika: kenop diputar -> tapak memanas
  const ki = smooth(IT.iron.i + 0.5, IT.iron.i + 1.1, t); ALAT.ironDial.rotation.y = -2.2 * ki;
  ALAT.ironSole.material.hl('hot', 0.55 * ki * (1 - smooth(IT.iron.e, IT.iron.e + 0.6, t)));
  // dispenser: lampu pemanas nyala-mati (termostat)
  ALAT.dspHeat.visible = t < IT.dispenser.i + 0.6 || t > IT.dispenser.e ? true : ((t - IT.dispenser.i) % 1.4) < 0.9;
  // kulkas: pintu dibuka -> udara dingin keluar
  ALAT.fridgeDoor.rotation.y = 1.45 * pulse(IT.kulkas.i + 0.4, IT.kulkas.e - 0.3, t, 0.45);
  // rice cooker: tuas naik COOK -> WARM, lampu merah padam, oranye nyala; nanti hangat dimatikan
  const warm = t >= warmOnT, lev = smooth(warmOnT - 0.05, warmOnT + 0.1, t);
  ALAT.riceLever.position.y = 18 * lev; ALAT.ledCook.visible = !warm; ALAT.ledWarm.visible = warm && t < warmOffT;
  // AC: sirip membuka saat dibahas dan tetap terbuka sesudahnya
  ALAT.acFlap.rotation.z = 0.36 * (1 - smooth(IT.ac.i + 0.4, IT.ac.i + 1.1, t));
  ledMat.hl('yellow', (t * 2.5) % 1 < 0.3 ? 1 : 0);
  for (const it of ITEMS) ALAT[it.key].traverse(o => { if (o.isMesh && o.material.hl && o.material !== ALAT.ledWarm.material) o.material.glow(active(t, it.key) * 0.35); });
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2];   // tanpa 'napas' kamera: diam saat menjelaskan
  const w = h * W / H;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -w / 2; camera.right = w / 2;
  lt.updateMatrixWorld(true);
  const target = lt.localToWorld(tmpV.set(c[8] || 0, c[1], c[0]));
  const az = clamp(c[3], 20, 170) * Math.PI / 180, el = c[4] * Math.PI / 180;
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 6000);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[5]) * w).addScaledVector(up, (c[6] - 0.07 - 0.5) * h);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  edge.mat.uniforms.dim.value = 0;
  $('shake').style.transform = '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: ruang tamu (dinding, jendela + tiang PLN, lampu, lantai, alur kabel di tembok) ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <pattern id="plaster" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="120" height="120" fill="#c5d4d3"/><circle cx="20" cy="30" r="2" fill="#bccbcb"/><circle cx="80" cy="70" r="1.6" fill="#bccbcb"/><circle cx="50" cy="105" r="2.2" fill="#bfcece"/><circle cx="100" cy="15" r="1.4" fill="#bccbcb"/></pattern>
  <pattern id="ftile" width="900" height="160" patternUnits="userSpaceOnUse"><rect width="900" height="160" fill="#cfa274"/><rect y="80" width="900" height="80" fill="#c99b6c"/><path d="M0 0H900M0 80H900M600 0V80M250 80V160" stroke="#a97c50" stroke-width="5"/></pattern>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
  <linearGradient id="sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#dcefff"/><stop offset="1" stop-color="#9fcdef"/></linearGradient>
  <radialGradient id="lampg"><stop offset="0" stop-color="#fff2c6" stop-opacity=".95"/><stop offset="1" stop-color="#fff2c6" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#1d2440" stop-opacity="0"/><stop offset="1" stop-color="#1d2440" stop-opacity=".34"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#232838"/><stop offset="1" stop-color="#0d0f15"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#c5d4d3"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const P2 = p => project(p);
const f1 = v => v.toFixed(1);
const ptsAttr = a => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const planeM = (o, u, v) => {
  const O = P2(o), U = P2([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = P2([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const WALL = () => planeM([0, 0, 0], [0, 0, -1], [0, -1, 0]);     // bidang dinding: (a, b) = (−z, −y)
function updateBg(t) {
  const zoom = 600 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.2) * 1.6, 0, 9).toFixed(2));
  const groove = OUT_PATH.map(([, y, z]) => `${f1(-z)},${f1(-y)}`).join(' ');
  const ang = t * 0.6;
  let s = `<g transform="${WALL()}">
    <rect x="-2200" y="-2800" width="4200" height="2800" fill="url(#plaster)"/>
    <rect x="-2200" y="-95" width="4200" height="95" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="4"/>
    <rect x="-1080" y="-2180" width="410" height="910" rx="8" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="-1060" y="-2160" width="370" height="870" fill="url(#sky)"/>
    <path d="M-1060 -1480q70 -50 140 -20t120 -40 110 30V-1290H-1060Z" fill="#a9cfa4"/>
    <path d="M-1060 -1420h140v-90l70 -50 70 50v90h90V-1290H-1060Z" fill="#d98c6a" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="-874" y="-2160" width="22" height="870" fill="#b9b9b2" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="-940" y="-2090" width="150" height="12" fill="#8d8a84" stroke="#1b1a1f" stroke-width="3"/>
    ${[-920, -863, -806].map(x => `<rect x="${x - 5}" y="-2110" width="10" height="20" rx="4" fill="#e9e6df" stroke="#1b1a1f" stroke-width="2"/>`).join('')}
    <path d="M-1060 -2116Q-990 -2080 -925 -2108M-868 -2108Q-780 -2070 -690 -2100M-811 -2108Q-760 -2150 -690 -2160" fill="none" stroke="#1b1a1f" stroke-width="4"/>
    ${Array.from({ length: 7 }, (_, k) => `<rect x="${-1050 + k * 52}" y="-2160" width="7" height="870" fill="#2e3036"/>`).join('')}
    ${Array.from({ length: 4 }, (_, k) => `<rect x="-1060" y="${-2060 + k * 220}" width="370" height="7" fill="#2e3036"/>`).join('')}
    <path d="M-1110 -2210h80c-10 140 10 600 -20 930h-60Z" fill="#c7a77d" stroke="#1b1a1f" stroke-width="3"/>
    <path d="M-720 -2210h80v930h-60c-30 -330 -10 -790 -20 -930Z" fill="#c7a77d" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="-1130" y="-2225" width="520" height="16" rx="8" fill="#6f5b45"/>
    <polyline points="${groove}" fill="none" stroke="#b3c3c3" stroke-width="30" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${groove}" fill="none" stroke="#97a9ab" stroke-width="20" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="300" y="-1700" width="320" height="250" rx="6" fill="#6f5b45" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="318" y="-1682" width="284" height="214" fill="#c9dfe8"/><path d="M318 -1468l90 -110 60 60 50 -40 84 90Z" fill="#7fae8a"/><circle cx="540" cy="-1630" r="20" fill="#f6dc8e"/>
    <circle cx="-250" cy="-2100" r="70" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="6"/>
    <path d="M-250 -2100l${f1(Math.sin(ang / 12) * 36)} ${f1(-Math.cos(ang / 12) * 36)}M-250 -2100l${f1(Math.sin(ang) * 52)} ${f1(-Math.cos(ang) * 52)}" stroke="#1b1a1f" stroke-width="6" stroke-linecap="round"/>
    <rect x="120" y="-1440" width="70" height="110" rx="8" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="4"/><rect x="143" y="-1408" width="24" height="46" rx="4" fill="#e9e6df" stroke="#1b1a1f" stroke-width="3"/>
    <g filter="url(#soft)" fill="#2a2a4a"><rect x="470" y="-2215" width="790" height="110" opacity=".28"/><rect x="1290" y="-1560" width="640" height="1560" opacity=".2"/><rect x="-1470" y="-1470" width="330" height="1470" opacity=".2"/><rect x="380" y="-500" width="440" height="500" opacity=".12"/></g>
    <path d="M340 -2060h60l30 70h-120Z" fill="#f6dc8e" stroke="#1b1a1f" stroke-width="4"/><rect x="364" y="-2100" width="12" height="40" fill="#1b1a1f"/>
  </g>`;
  // cahaya lampu dinding (padam saat MCB putus)
  { const c = P2([0, 1990, -370]), r = 900 * (1920 / CAM[2]) / 3; s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="url(#lampg)" opacity="${(0.85 * S.on * (1 - track(hookKeys, t))).toFixed(3)}"/>`; }
  // lantai
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}"><rect x="0" y="-2200" width="2600" height="4200" fill="url(#ftile)"/>
    <rect x="60" y="0" width="420" height="560" rx="20" fill="#b45f4b" opacity=".85"/><rect x="80" y="20" width="380" height="520" rx="14" fill="none" stroke="#e7c48f" stroke-width="10"/>
    <rect x="20" y="110" width="280" height="330" fill="#5a4632" opacity=".15"/>
    <g filter="url(#soft)" fill="#2a2440"><ellipse cx="200" cy="-1305" rx="200" ry="210" opacity=".42"/><ellipse cx="350" cy="1600" rx="360" ry="330" opacity=".42"/><rect x="20" y="320" width="400" height="500" opacity=".22"/></g></g>`;
  { const fokus = Math.max(...ITEMS.map(it => pulse(it.i + 0.5, it.e - 0.15, t, 0.4))), bahaya = pulse(T(5, 'dua') - 0.2, L[5].e + 0.3, t, 0.4);
    s += `<rect width="1080" height="1920" fill="#1d2440" opacity="${(0.16 * fokus).toFixed(3)}"/><rect width="1080" height="1920" fill="#c9373f" opacity="${(0.14 * bahaya).toFixed(3)}"/>`; }   // suasana: fokus / bahaya
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.94 * S.dark).toFixed(3));
}

// ---------- overlay ----------
const ARROW = '<svg viewBox="0 0 13 10"><path d="M12 5H1.5M5 1.2 1.2 5 5 8.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const tagEls = tagDefs.map(d => {
  const el = document.createElement('div'); el.className = 'tag ' + d.cls;
  el.innerHTML = d.side === 'r' ? ARROW + `<span>${d.text}</span>` : `<span>${d.text}</span>` + ARROW.replace('<svg', '<svg style="transform:scaleX(-1)"');
  $('tags').appendChild(el); return el;
});
let lastChunk = -1, lastStamp = -1;
function updateCoverHidup(t) {
  const el = $('cvlive'), out = smooth(1.25, 1.7, t);
  el.style.opacity = 1 - out;
  el.style.transform = `translateY(${f1(-90 * out)}px) scale(${(1 + 0.035 * Math.sin(Math.PI * clamp(t / 0.35))).toFixed(4)})`;
  el.style.display = out >= 1 ? 'none' : 'block';
}
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
  updateInset(t);
}

// efek tiap alat saat dibahas: uap (setrika, rice cooker, dispenser), embusan dingin (AC, kulkas), layar meteran
function wave(x0, y0, len, amp, col, sw, op, dir = -1) { return `<path d="M${f1(x0)} ${f1(y0)} q${f1(amp)} ${f1(dir * len * 0.25)} 0 ${f1(dir * len * 0.5)} t0 ${f1(dir * len * 0.5)}" fill="none" stroke="${col}" stroke-width="${f1(sw)}" stroke-linecap="round" opacity="${op.toFixed(2)}"/>`; }
function updateFx(t) {
  let s = `<defs><radialGradient id="glo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset="1" stop-color="#f6c96a" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  { const m = planeM([METER.d + 3.6, 1755, 575], [0, 0, -1], [0, -1, 0]), v = kwhAt(t), low = t < L[0].e;
    s += `<g transform="${m}"><text x="10" y="34" font-family="ui-monospace, Menlo" font-weight="700" font-size="21" fill="${low ? '#9b2c3f' : '#24402a'}">${v.toFixed(2).replace('.', ',')}</text><text x="80" y="52" font-family="ui-monospace, Menlo" font-weight="700" font-size="11" fill="#24402a">kWh</text></g>`; }
  // layar suhu AC
  { const m = planeM([213.5, 2350, -1084], [0, 0, -1], [0, -1, 0]); s += `<g transform="${m}"><text x="12" y="38" font-family="ui-monospace, Menlo" font-weight="700" font-size="34" fill="#7fd6ff">${t > T(7, 'jangan') + 0.3 ? 25 : 18}°</text></g>`; }
  const A = k => { const it = ITEMS.find(i => i.key === k); return pulse(it.t + 0.4, it.e, t, 0.2) + (k === 'rice' && t < warmOffT && t > L[6].s ? 0.6 : 0) + (k === 'ac' && t > L[6].s ? 0.6 : 0); };
  const steam = (p, a, col, n = 3, len = 120) => { if (a <= 0.02) return ''; const [x, y] = project(p); let o = '';
    for (let k = 0; k < n; k++) { const ph = (t * 0.6 + k / n) % 1; o += wave(x + (k - (n - 1) / 2) * 16 * pxmm * len / 120, y - ph * 40 * pxmm * len / 120, len * pxmm, 8 * pxmm * len / 120, col, 4 * pxmm * len / 120, Math.sin(Math.PI * ph) * Math.min(1, a)); } return o; };
  s += steam([195, TOP + 160, -440], A('iron'), '#ff9a5c', 3, 90);
  s += steam([200, TOP + 285, -720], A('rice'), '#ffffff', 3, 120);
  s += steam([362, 730, 1355], A('dispenser') * 0.6, '#ffffff', 2, 80);
  { const a = Math.min(1, A('ac')); if (a > 0.02) { const [x, y] = project([214, 2205, -850]); for (let k = 0; k < 5; k++) { const ph = (t * 0.5 + k / 5) % 1;
    s += `<path d="M${f1(x + (k - 2) * 60 * pxmm)} ${f1(y + ph * 120 * pxmm)} q${f1(20 * pxmm)} ${f1(40 * pxmm)} 0 ${f1(80 * pxmm)}" fill="none" stroke="#9fd3ff" stroke-width="${f1(10 * pxmm)}" stroke-linecap="round" opacity="${(Math.sin(Math.PI * ph) * a * 0.9).toFixed(2)}"/>`; } } }
  if (t >= warmOnT && t < warmOffT) { const [x, y] = project(ALAT.ledWarm); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(16 * pxmm)}" fill="#ffb347" opacity="${(0.5 + 0.3 * Math.sin(t * 4)).toFixed(2)}"/>`; }
  { const o = ALAT.fridgeDoor.rotation.y / 1.45; if (o > 0.02) { const [x, y] = project([700, 560, -1560]);   // pintu kulkas terbuka: lampu dalam + udara dingin turun
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(260 * pxmm)}" ry="${f1(420 * pxmm)}" fill="url(#glo)" opacity="${(0.55 * o).toFixed(2)}"/>`;
    for (let k = 0; k < 4; k++) { const ph = (t * 0.45 + k / 4) % 1, [mx, my] = project([720 + ph * 160, 260 - ph * 200, -1700 + k * 90]);
      s += `<path d="M${f1(mx)} ${f1(my)} q${f1(40 * pxmm)} ${f1(-14 * pxmm)} ${f1(90 * pxmm)} 0 t${f1(90 * pxmm)} 0" fill="none" stroke="#eef7ff" stroke-width="${f1(22 * pxmm)}" stroke-linecap="round" opacity="${(Math.sin(Math.PI * ph) * 0.8 * o).toFixed(2)}"/>`; } } }
  $('dim').innerHTML = s;
}

// kartu: hitungan tiap alat + ringkasan semua
let INS = 0;
const Fn = 'font-family="-apple-system, Helvetica" font-weight="800" style="font-variant-numeric: tabular-nums"';
function updateInset(t) {
  const it = ITEMS.find(i => t > i.t + 1.3 && t < i.e - 0.1), sum = t > L[6].s - 0.1 && t < L[6].e + 0.4;
  const el = $('inset');
  const a = it ? pulse(it.t + 1.4, it.e - 0.2, t, 0.14) : sum ? pulse(L[6].s, L[6].e + 0.3, t, 0.12) : 0;
  INS = a; el.style.opacity = a;
  if (a <= 0.001) return;
  const tx = (x, y, s, size, col = '#1b1a1f', op = 1, anchor = 'start') => `<text x="${x}" y="${y}" ${Fn} font-size="${size}" fill="${col}" opacity="${op.toFixed(3)}" text-anchor="${anchor}">${s}</text>`;
  let g = '';
  if (it) {
    $('insetk').textContent = `#${it.rank} · ${it.nama.toUpperCase()} · SEBULAN`;
    const s0 = it.t + 1.5, q1 = smooth(s0, s0 + 0.35, t), q2 = smooth(s0 + 0.6, s0 + 0.95, t), q3 = smooth(s0 + 1.2, s0 + 1.5, t), q4 = smooth(s0 + 1.5, s0 + 2.4, t);
    const up = (q, d = 18) => `transform="translate(0 ${f1(d * (1 - q))})"`;   // tiap baris naik sedikit saat muncul
    g = `<g ${up(q1)}>${tx(60, 150, it.rumus, 40, '#1b1a1f', q1)}</g><g ${up(q2)}>${tx(60, 230, `× 30 hari = ${it.kwh.toFixed(1).replace('.', ',')} kWh`, 44, '#3e5bb8', q2)}</g>` +
      `<g ${up(q3)}>${tx(60, 300, '× Rp1.444,70 per kWh', 36, '#7a7368', q3)}</g>` +
      tx(60, 410, `≈ Rp${Math.round(it.rp * q4).toLocaleString('id-ID')}`, 84, it.rank === 1 ? '#c9373f' : '#9b2c3f', smooth(s0 + 1.45, s0 + 1.6, t));   // hasil menghitung naik
  } else {
    $('insetk').textContent = 'SEBULAN · TARIF Rp1.444,70/kWh';
    const mx = ITEMS[4].rp, g0 = smooth(L[6].s, L[6].s + 0.8, t);
    [...ITEMS].reverse().forEach((i, k) => { const y = 110 + k * 66, w = 520 * i.rp / mx * g0;
      g += tx(60, y + 30, i.nama, 32, '#1b1a1f') + `<rect x="300" y="${y}" width="${f1(Math.max(8, w))}" height="40" rx="20" fill="${i.rank === 1 ? '#e5484d' : '#e3bf62'}" stroke="#1b1a1f" stroke-width="4"/>` + tx(f1(310 + Math.max(8, w)), y + 31, `Rp${rb(i.rp)}`, 28, '#1b1a1f', g0); });
  }
  $('insetsvg').innerHTML = g;
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); FMT.gambar(t, FORMAT, project); };
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  ITEMS.forEach(it => { ev.push({ t: it.t + 0.3, type: 'whoosh' }, { t: it.t + 0.35, type: 'stamp' }, { t: it.t + 1.4, type: 'card' }, { t: it.t + 3.9, type: 'chime' }); });
  ev.push({ t: IT.iron.i + 0.5, type: 'twist' }, { t: IT.dispenser.i + 0.6, type: 'cetek' }, { t: IT.kulkas.i + 0.4, type: 'lid' }, { t: IT.kulkas.i + 0.6, type: 'desis', dur: 1.6 },
    { t: warmOnT, type: 'klikTombol' }, { t: IT.ac.i + 0.4, type: 'clickIn' }, { t: IT.ac.i + 0.5, type: 'hum', dur: IT.ac.e - IT.ac.i });
  ev.push({ t: L[6].s, type: 'card' }, { t: warmOffT, type: 'klikTombol' }, { t: T(7, 'jangan') + 0.3, type: 'blip' }, { t: T(0, 'lima'), type: 'whoosh' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(0).e - 0.5); cue('act1', LN(1).s); cue('danger', LN(3).s); cue('drop', LN(5).s - 0.1); cue('build', LN(5).s + 0.8);
  cue('reveal', LN(5).s + 1.6); cue('warm', LN(6).s); cue('dark', LN(7).s); cue('resolve', LN(8).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(ALAT_PT.ac);
