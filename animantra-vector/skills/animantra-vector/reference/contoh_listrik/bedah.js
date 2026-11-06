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
const NL = 12;
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
    c = mix(c, mix(vec3(.102, .110, .165), c * .45, .45), ec * (1. - e) * .9);   // batas warna: gelap sewarna
    gl_FragColor = vec4(mix(c * mix(vec3(1.), vec3(.42, .46, .58), dim), vec3(.106, .102, .122), e) * a, a);
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

// ---------- jadwal (semua dikunci ke kata) ----------
const LOADS = [['Rice cooker', 400, T(4, 'terlalu')], ['Setrika', 350, T(4, 'banyak')], ['Pompa air', 250, T(4, 'alat')], ['Dispenser', 350, T(4, 'nyala')]];
const TRIP = T(5, 'klik'), SHORT = T(6, 'melonjak'), SHORT_TRIP = T(6, 'menarik') + 0.1, RESET1 = T(6, 'korsleting') - 0.15, RESET2 = T(7, 'lolos') - 0.1;
const onAt = t => (t < TRIP || (t >= RESET1 && t < SHORT_TRIP) || t >= RESET2) ? 1 : 0;
const togKeys = [[0, 1], [TRIP - 0.04, 1], [TRIP + 0.06, 0], [RESET1 - 0.3, 0], [RESET1, 1], [SHORT_TRIP - 0.05, 1], [SHORT_TRIP + 0.05, 0], [RESET2 - 0.3, 0], [RESET2, 1]];
const currentAt = t => {
  if (!onAt(t)) return 0;
  if (t >= SHORT && t < SHORT_TRIP) return 60;                              // korsleting: melonjak berkali-kali lipat (ilustrasi)
  let a = 0.5; if (t >= L[4].s && t < TRIP + 0.5) for (const [, w, s] of LOADS) a += (w / 220) * smooth(s, s + 0.3, t);
  return a;
};
const bendKeys = [[0, 0], [T(4, 'arus'), 0], [at(4, 'melengkung').e + 0.2, 1], [TRIP + 0.4, 1], [L[6].s, 0]];
const plungKeys = [[0, 0], [T(6, 'kumparan') - 0.1, 0], [T(6, 'menarik') + 0.1, 1], [RESET2 - 0.3, 1], [RESET2, 0]];
const plugKeys = [[0, 0], [T(1, 'butuh') - 0.35, 0], [T(1, 'butuh') + 0.15, 1]];
const mcbOpenKeys = [[0, 0], [T(3, 'penjaga') - 0.2, 0], [T(3, 'penjaga') + 0.4, 1], [RESET2 + 0.2, 1], [RESET2 + 0.8, 0]];
const sockOpenKeys = [[0, 0], [L[8].s - 0.4, 0], [L[8].s + 0.2, 1], [L[9].s - 0.3, 1], [L[9].s, 0]];
const chgOpenKeys = [[0, 0], [T(9, 'rahasianya') - 0.2, 0], [T(9, 'charger') + 0.2, 1], [L[10].s - 0.2, 1], [L[10].s + 0.3, 0]];
const hookKeys = [[0, 1], [L[0].e + 0.1, 1], [T(1, 'tapi') + 0.3, 0]];
const kwh0 = 128.4;
const kwhAt = t => kwh0 - 0.004 * t - 0.6 * smooth(T(2, 'kilowattjam'), L[2].e + 0.5, t);

// kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x] — azimut 90 = tegak lurus dinding, >90 = dari sisi -z
const camKeys = [
  [0, [0, 380, 140, 95, 8, 0.5, 0.56, 0, 0]], [L[0].e, [0, 380, 118, 92, 8, 0.5, 0.56, 0, 0]],
  [T(1, 'tapi'), [-250, 330, 980, 72, 16, 0.5, 0.56, 0, 40]], [T(1, 'aman') + 0.3, [-250, 330, 940, 74, 16, 0.5, 0.56, 0, 40]],
  [T(1, 'perjalanan'), [250, 1250, 2900, 68, 10, 0.5, 0.5, 0, 0]], [L[1].e + 0.2, [250, 1250, 2900, 70, 10, 0.5, 0.5, 0, 0]],
  [T(2, 'tiang'), [820, 2100, 980, 74, 10, 0.5, 0.5, 0, 0]], [T(2, 'meteran'), [520, 1660, 560, 80, 10, 0.5, 0.52, 0.3, 40]],
  [T(2, 'kilowattjam') - 0.2, [520, 1722, 240, 86, 6, 0.5, 0.52, 0.6, 90]], [L[2].e + 0.2, [520, 1722, 250, 86, 6, 0.5, 0.52, 0.6, 90]],
  [T(3, 'mcb'), [MCB.zc, 1630, 320, 96, 8, 0.5, 0.52, 0.6, 40]], [T(3, 'penjaga') + 0.5, [MCB.zc, 1630, 140, 152, 10, 0.5, 0.52, 0.8, 38]],
  [L[3].e + 0.3, [MCB.zc, 1630, 150, 150, 10, 0.5, 0.6, 0.8, 38]],
  [T(4, 'keping') - 0.2, [MCB.zc, 1612, 96, 156, 8, 0.5, 0.56, 0.85, 50]], [at(4, 'melengkung').e + 0.3, [MCB.zc, 1612, 100, 154, 8, 0.5, 0.56, 0.85, 50]],
  [TRIP + 0.25, [MCB.zc, 1630, 140, 150, 10, 0.5, 0.52, 0.8, 40]], [T(5, 'satu'), [250, 1250, 2800, 70, 10, 0.5, 0.5, 0, 0]], [L[5].e + 0.3, [250, 1250, 2800, 72, 10, 0.5, 0.5, 0, 0]],
  [T(6, 'korsleting'), [MCB.zc, 1630, 130, 152, 10, 0.5, 0.52, 0.85, 38]], [T(6, 'kumparan') - 0.1, [MCB.zc, 1645, 100, 156, 8, 0.5, 0.52, 0.85, 36]],
  [T(6, 'milidetik'), [MCB.zc, 1635, 120, 152, 10, 0.5, 0.52, 0.85, 30]], [L[6].e + 0.3, [MCB.zc, 1635, 124, 150, 10, 0.5, 0.52, 0.85, 30]],
  [T(7, 'mengalir'), [MCB.zc, 1350, 900, 82, 12, 0.5, 0.5, 0, 0]], [T(7, 'tembok'), [180, 700, 1150, 76, 12, 0.5, 0.5, 0, 0]],
  [T(7, 'stopkontak'), [0, 385, 280, 86, 14, 0.5, 0.55, 0.3, 10]], [L[7].e + 0.4, [0, 385, 260, 88, 14, 0.5, 0.55, 0.3, 10]],
  [L[8].s + 0.4, [0, SOCK.y, 120, 104, 58, 0.5, 0.62, 0.8, -10]], [L[8].e + 0.2, [0, SOCK.y, 124, 102, 58, 0.5, 0.64, 0.8, -10]],
  [T(9, 'charger'), [0, 382, 110, 92, 10, 0.5, 0.64, 0.8, 40]], [T(9, 'trafo') - 0.2, [6, 376, 84, 96, 12, 0.5, 0.64, 0.85, 42]], [L[9].e + 0.2, [0, 380, 120, 92, 10, 0.5, 0.64, 0.8, 40]],
  [T(10, 'tiga'), [250, 1150, 2800, 70, 10, 0.5, 0.48, 0, 0]], [L[10].e + 0.2, [250, 1150, 2800, 72, 10, 0.5, 0.48, 0, 0]],
  [T(11, 'mcb'), [MCB.zc, 1630, 300, 98, 8, 0.5, 0.55, 0.5, 40]], [DUR, [MCB.zc, 1630, 280, 96, 8, 0.5, 0.55, 0.5, 40]],
];

// ---------- label, teks kinetik ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(1, 'hpmu'), T(1, 'perjalanan') - 0.2, 'HP · 5 V', () => MK.phone, 'r', 'hi');
tag(T(2, 'meteran'), L[2].e + 0.2, 'Meteran kWh', () => MK.meter, 'l', 'hi');
tag(T(3, 'mcb'), T(3, 'penjaga') - 0.1, 'MCB', () => MK.mcbFront, 'r', 'hi');
tag(T(4, 'keping'), TRIP - 0.1, 'Keping bimetal', () => MK.bim, 'r', 'warn');
tag(TRIP, L[5].e, 'Kontak terbuka', () => MK.contact, 'l', 'hi');
tag(T(6, 'kumparan'), T(6, 'milidetik') - 0.05, 'Kumparan magnet', () => MK.coil, 'r', 'hi');
tag(T(6, 'milidetik'), L[6].e + 0.2, 'Pemadam busur api', () => MK.chute, 'l', 'warn');
tag(T(7, 'kabel'), T(7, 'stopkontak') - 0.1, 'Kabel di dalam tembok', () => MK.groove, 'r', 'hi');
tag(T(8, 'sini'), L[8].e + 0.2, 'Jepit kuningan', () => MK.clip, 'r', 'hi');
tag(T(9, 'diluruskan'), T(9, 'dicacah') - 0.05, 'Dioda: meluruskan', () => MK.diode, 'l', 'hi');
tag(T(9, 'dicacah'), T(9, 'trafo') - 0.05, 'IC: mencacah', () => MK.ic, 'l', 'hi');
tag(T(9, 'trafo'), L[9].e + 0.2, 'Trafo mini', () => MK.xfm, 'r', 'hi');
tag(T(10, 'meteran'), L[10].e + 0.3, 'Menghitung', () => MK.meter, 'l', 'hi');
tag(T(10, 'mcb'), L[10].e + 0.3, 'Memutus', () => MK.mcbFront, 'r', 'hi');
tag(T(10, 'charger'), L[10].e + 0.3, 'Menurunkan', () => MK.chg, 'r', 'hi');
const stampDefs = [
  [T(0, '220'), L[0].e + 0.4, '220|volt', 1080, ''],
  [T(1, '5'), T(1, 'kok') - 0.05, '5 volt', 1180, 'snd'],
  [TRIP, T(5, 'satu') - 0.05, 'Klik!', 1120, 'snd'],
  [T(6, 'milidetik'), L[6].e + 0.3, 'Milidetik!', 1180, ''],
  [T(9, '5'), L[9].e + 0.3, '5 volt', 1180, 'snd'],
  [T(11, 'diganjal'), L[11].e + 0.6, 'Jangan|diganjal!', 1060, ''],
];

// ---------- caption karaoke ----------
const chunks = [];
for (let li = 0; li < NL; li++) {
  let cur = [];
  const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => { cur.push(w); if (/[,.?!:…]$/.test(w.w) || cur.length >= 5 || i === ws.length - 1) { chunks.push(cur); cur = []; } });
}
const allW = chunks.flat();
allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });

// ---------- model per waktu ----------
const S = { on: 1, I: 0.5, bend: 0, dark: 0, imp: 0, plug: 0 };
function updateModel(t) {
  S.on = onAt(t); S.I = currentAt(t); S.bend = track(bendKeys, t); S.plug = track(plugKeys, t);
  S.imp = Math.max(Math.exp(-Math.max(0, t - TRIP) * 9) * (t >= TRIP ? 1 : 0), Math.exp(-Math.max(0, t - SHORT) * 7) * (t >= SHORT ? 1 : 0));
  S.dark = Math.max(track(hookKeys, t), 1 - S.on);
  tog.rotation.z = lerp(-0.4, 0.4, track(togKeys, t));
  arm.rotation.z = -0.5 * (1 - track(togKeys, t));
  setBimetal(S.bend); bimL.hl('hot', S.bend); bimR.hl('hot', S.bend * 0.7);
  plunger.position.y = -7 * track(plungKeys, t);
  mcbCover.position.z = -40 * easeIO(track(mcbOpenKeys, t)); mcbCover.visible = track(mcbOpenKeys, t) < 0.999;
  boxNear.position.z = -90 * easeIO(track(mcbOpenKeys, t)); boxNear.visible = track(mcbOpenKeys, t) < 0.999;
  sockUpper.position.y = 60 * easeIO(track(sockOpenKeys, t)); sockUpper.visible = track(sockOpenKeys, t) < 0.999;
  chgFront.position.x = 40 * easeIO(track(chgOpenKeys, t)); chgFront.visible = track(chgOpenKeys, t) < 0.999;
  chg.position.x = 50 * (1 - easeIO(S.plug)); chg.visible = S.plug > 0.01; cableUSB.visible = S.plug > 0.5;
  cup.visible = track(sockOpenKeys, t) < 0.05;
  { const v = track(sockOpenKeys, t) < 0.05; chgBack.visible = v; chgFront.visible = chgFront.visible && v; comp.visible = v; }   // saat stopkontak dibelah: tampak kaki steker saja
  // kontak jepit merenggang sedikit saat kaki steker masuk
  // LED impuls meteran berkedip lebih cepat saat arus besar
  const blink = S.I > 0 ? (Math.sin(t * Math.PI * 2 * (0.6 + S.I * 0.5)) > 0.6 ? 1 : 0) : 0;
  ledMat.hl('yellow', blink);
  { const k = pulse(T(6, 'kumparan'), T(6, 'milidetik'), t); coil.traverse(m => m.isMesh && m.material.hl && m.material.hl('hl', k)); }
  togMat.hl('hl', Math.max(pulse(T(3, 'mcb'), T(3, 'penjaga'), t), pulse(T(11, 'mcb'), L[11].e, t)));
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2] * (1 - 0.012 * Math.sin(t * 0.7)) * (1 - 0.06 * S.imp);
  const w = h * W / H;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -w / 2; camera.right = w / 2;
  lt.updateMatrixWorld(true);
  const target = lt.localToWorld(tmpV.set(c[8] || 0, c[1], c[0]));
  const az = clamp(c[3], 20, 170) * Math.PI / 180, el = c[4] * Math.PI / 180, roll = 0.04 * S.imp * Math.sin(t * 40);
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 4000);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[5]) * w).addScaledVector(up, (c[6] - 0.07 - 0.5) * h);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  edge.mat.uniforms.dim.value = S.dark;
  $('shake').style.transform = S.imp > 0.05 ? `translate(${(Math.sin(t * 91) * 12 * S.imp).toFixed(1)}px, ${(Math.cos(t * 77) * 9 * S.imp).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: ruang tamu (dinding, jendela + tiang PLN, lampu, lantai, alur kabel di tembok) ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <pattern id="plaster" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="120" height="120" fill="#efe4d2"/><circle cx="20" cy="30" r="2" fill="#e6d9c5"/><circle cx="80" cy="70" r="1.6" fill="#e6d9c5"/><circle cx="50" cy="105" r="2.2" fill="#e8dcc8"/><circle cx="100" cy="15" r="1.4" fill="#e6d9c5"/></pattern>
  <pattern id="ftile" width="400" height="400" patternUnits="userSpaceOnUse"><rect width="400" height="400" fill="#e8dcc8"/><path d="M400 0H0V400" fill="none" stroke="#d5c6ad" stroke-width="5"/></pattern>
  <linearGradient id="sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#dcefff"/><stop offset="1" stop-color="#9fcdef"/></linearGradient>
  <radialGradient id="lampg"><stop offset="0" stop-color="#fff2c6" stop-opacity=".95"/><stop offset="1" stop-color="#fff2c6" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#3a2d1e" stop-opacity="0"/><stop offset="1" stop-color="#3a2d1e" stop-opacity=".28"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#232838"/><stop offset="1" stop-color="#0d0f15"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#efe6d6"/>
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
    <rect x="-1400" y="-2800" width="2600" height="2800" fill="url(#plaster)"/>
    <rect x="-1400" y="-95" width="2600" height="95" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="4"/>
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
    <polyline points="${groove}" fill="none" stroke="#b8a68c" stroke-width="30" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${groove}" fill="none" stroke="#8e7d66" stroke-width="20" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="300" y="-1700" width="320" height="250" rx="6" fill="#6f5b45" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="318" y="-1682" width="284" height="214" fill="#c9dfe8"/><path d="M318 -1468l90 -110 60 60 50 -40 84 90Z" fill="#7fae8a"/><circle cx="540" cy="-1630" r="20" fill="#f6dc8e"/>
    <circle cx="640" cy="-1980" r="70" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="6"/>
    <path d="M640 -1980l${f1(Math.sin(ang / 12) * 36)} ${f1(-Math.cos(ang / 12) * 36)}M640 -1980l${f1(Math.sin(ang) * 52)} ${f1(-Math.cos(ang) * 52)}" stroke="#1b1a1f" stroke-width="6" stroke-linecap="round"/>
    <rect x="120" y="-1440" width="70" height="110" rx="8" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="4"/><rect x="143" y="-1408" width="24" height="46" rx="4" fill="#e9e6df" stroke="#1b1a1f" stroke-width="3"/>
    <path d="M340 -2060h60l30 70h-120Z" fill="#f6dc8e" stroke="#1b1a1f" stroke-width="4"/><rect x="364" y="-2100" width="12" height="40" fill="#1b1a1f"/>
  </g>`;
  // cahaya lampu dinding (padam saat MCB putus)
  { const c = P2([0, 1990, -370]), r = 900 * (1920 / CAM[2]) / 3; s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="url(#lampg)" opacity="${(0.85 * S.on * (1 - track(hookKeys, t))).toFixed(3)}"/>`; }
  // lantai
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}"><rect x="0" y="-1400" width="1800" height="2600" fill="url(#ftile)"/>
    <rect x="60" y="0" width="420" height="560" rx="20" fill="#b45f4b" opacity=".85"/><rect x="80" y="20" width="380" height="520" rx="14" fill="none" stroke="#e7c48f" stroke-width="10"/>
    <rect x="20" y="110" width="280" height="330" fill="#5a4632" opacity=".15"/></g>`;
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
function updateOverlay(t) {
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

// efek: aliran listrik (AC bergetar kuning, DC mengalir biru), layar meteran, busur api, percikan lubang stopkontak, kilat
function zig(a, b, seed, amp) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
  let d = `M${f1(a[0])} ${f1(a[1])}`;
  for (let k = 1; k < 6; k++) { const f = k / 6, o = (hash(seed, k) - 0.5) * len * amp; d += ` L${f1(lerp(a[0], b[0], f) + nx * o)} ${f1(lerp(a[1], b[1], f) + ny * o)}`; }
  return d + ` L${f1(b[0])} ${f1(b[1])}`;
}
function updateFx(t) {
  let s = `<defs><radialGradient id="glo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".35" stop-color="#f6c96a" stop-opacity=".55"/><stop offset="1" stop-color="#f6c96a" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  // layar meteran: sisa kWh token
  { const m = planeM([METER.d + 1.6, 1755, 575], [0, 0, -1], [0, -1, 0]);
    s += `<g transform="${m}"><text x="10" y="34" font-family="ui-monospace, Menlo" font-weight="700" font-size="21" fill="#24402a">${kwhAt(t).toFixed(2).replace('.', ',')}</text><text x="80" y="52" font-family="ui-monospace, Menlo" font-weight="700" font-size="11" fill="#24402a">kWh</text></g>`; }
  // aliran listrik
  const r = clamp(2.2 * pxmm, 3, 11), I = S.I, on = S.on && S.plug > 0.5 || (S.on && t < T(1, 'butuh'));
  if (on && I > 0 && S.dark < 0.99 || (t < L[0].e && false)) {
    const n = ptsAC.length, cnt = 70, wig = Math.min(0.01, 0.0025 * I);
    for (let k = 0; k < cnt; k++) {
      const u = clamp(k / cnt + wig * Math.sin(t * 7 + k * 0.3)), p = ptsAC[Math.round(u * (n - 1))], [x, y] = project([p.x, p.y, p.z]);
      if (x < -20 || x > 1100 || y < -20 || y > 1940) continue;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.2)}" fill="url(#glo)" opacity="${clamp(0.4 + I / 8, 0.4, 1).toFixed(2)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.55)}" fill="#fff6c8"/>`;
    }
    if (S.plug > 0.5) for (let k = 0; k < 24; k++) {
      const u = ((k / 24 + t * 0.12) % 1), p = ptsDC[Math.round(u * (ptsDC.length - 1))], [x, y] = project([p.x, p.y, p.z]);
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.7)}" fill="#7fd6ff" stroke="#1b1a1f" stroke-width="2"/>`;
    }
  }
  // pembuka: percikan di lubang stopkontak (gelap)
  if (t < L[0].e + 0.3) {
    for (const zc of [-9.5, 9.5]) { const c = project([4, SOCK.y, zc]), seed = Math.floor(t * 20) + (zc > 0 ? 7 : 0);
      s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(9 * pxmm)}" fill="url(#glo)" opacity=".9"/>`;
      if (hash(seed) > 0.35) { const b = [c[0] + (hash(seed, 2) - 0.5) * 30 * pxmm, c[1] + (hash(seed, 3) - 0.5) * 30 * pxmm];
        s += `<path d="${zig(c, b, seed, 0.5)}" stroke="#fffbe6" stroke-width="5" fill="none"/>`; } }
  }
  // busur api saat kontak terbuka (korsleting, gerak lambat) + pelat pemadam bercahaya
  const arcA = clamp((t - SHORT_TRIP + 0.05) / 0.08) * (1 - clamp((t - SHORT_TRIP - 0.7) / 0.3));
  if (arcA > 0.01) {
    const a = project(mcbG.localToWorld(V(28, 50, 0))), b = project(arm.localToWorld(V(-17.5, 14.5, 0))), seed = Math.floor(t * 30);
    s += `<circle cx="${f1((a[0] + b[0]) / 2)}" cy="${f1((a[1] + b[1]) / 2)}" r="${f1(14 * pxmm)}" fill="url(#glo)" opacity="${arcA.toFixed(2)}"/>
      <path d="${zig(a, b, seed, 0.6)}" stroke="#fffbe6" stroke-width="${f1(1.5 * pxmm)}" fill="none" opacity="${arcA.toFixed(2)}"/>`;
    const ch = project(MK.chute); s += `<circle cx="${f1(ch[0])}" cy="${f1(ch[1])}" r="${f1(12 * pxmm)}" fill="url(#glo)" opacity="${(arcA * 0.7).toFixed(2)}"/>`;
  }
  // ganjal di tuas (larangan)
  if (t > T(11, 'diganjal') - 0.1) {
    const k = smooth(T(11, 'diganjal') - 0.1, T(11, 'diganjal') + 0.3, t), a = project(mcbG.localToWorld(V(84, 36, -6))), b = project(mcbG.localToWorld(V(84, 36, 6))), c = project(mcbG.localToWorld(V(84, 44, 0)));
    s += `<polygon points="${ptsAttr([a, b, c])}" fill="#c9a26b" stroke="#1b1a1f" stroke-width="4" opacity="${k.toFixed(2)}"/>`;
    const m = project(MK.tog), R = 46;
    s += `<g opacity="${smooth(T(11, 'diganjal') + 0.2, T(11, 'diganjal') + 0.5, t).toFixed(2)}" stroke="#e5484d" stroke-width="14" stroke-linecap="round"><path d="M${f1(m[0] - R)} ${f1(m[1] - R)}L${f1(m[0] + R)} ${f1(m[1] + R)}M${f1(m[0] + R)} ${f1(m[1] - R)}L${f1(m[0] - R)} ${f1(m[1] + R)}"/></g>`;
  }
  // kilat layar saat klik & korsleting
  const fl = Math.max(t >= TRIP ? 1 - (t - TRIP) / 0.12 : 0, t >= SHORT ? 1 - (t - SHORT) / 0.2 : 0);
  if (fl > 0) s += `<rect width="1080" height="1920" fill="#fff6dc" opacity="${(0.55 * fl).toFixed(3)}"/>`;
  $('dim').innerHTML = s;
}

// kartu: (3) daya MCB · (4) beban vs 6 A · (8) gelombang 50 Hz · (9) tahap charger
let INS = 0;
const Fn = 'font-family="-apple-system, Helvetica" font-weight="800"';
function updateInset(t) {
  const ws = [[T(3, 'rumah') - 0.1, L[3].e + 0.4], [T(4, 'kalau') - 0.1, T(4, 'keping') - 0.25], [T(8, 'berganti') - 0.15, L[8].e + 0.4], [T(9, 'diluruskan') - 0.2, L[9].e + 0.3]];
  const k = ws.findIndex(([a, b]) => t > a - 0.12 && t < b + 0.12), el = $('inset');
  const a = k < 0 ? 0 : pulse(ws[k][0], ws[k][1], t, 0.12);
  INS = a; el.style.opacity = a;
  if (a <= 0.001) return;
  el.style.transform = `scale(${lerp(0.85, 1, backOut((t - ws[k][0] + 0.12) / 0.35)).toFixed(3)})`;
  const tx = (x, y, s, size, col = '#1b1a1f', op = 1, anchor = 'start') => `<text x="${x}" y="${y}" ${Fn} font-size="${size}" fill="${col}" opacity="${op.toFixed(3)}" text-anchor="${anchor}">${s}</text>`;
  let g = '';
  if (k === 0) {
    $('insetk').textContent = 'BATAS DAYA · DIHITUNG';
    const q = smooth(T(3, '1300') - 0.2, T(3, 'ampere') + 0.3, t);
    g = tx(470, 170, '6 A × 220 V', 64, '#1b1a1f', 1, 'middle') + tx(470, 270, `= ${Math.round(1320 * q).toLocaleString('id-ID')} VA`, 76, '#9b2c3f', q, 'middle') + tx(470, 360, '≈ daya rumah 1.300 VA', 36, '#7a7368', q, 'middle');
  } else if (k === 1) {
    $('insetk').textContent = 'BEBAN · DIMODELKAN';
    let y = 120, tot = 0.5;
    LOADS.forEach(([n, wt, s0]) => { const q = smooth(s0 - 0.1, s0 + 0.25, t); if (q > 0) { tot += wt / 220 * q; g += tx(60, y, n, 32, '#1b1a1f', q) + tx(420, y, `${wt} W`, 30, '#7a7368', q, 'end') + tx(560, y, `${(wt / 220).toFixed(1).replace('.', ',')} A`, 30, '#c06a2e', q, 'end'); y += 50; } });
    const bw = 300 * Math.min(tot / 8, 1), over = tot > 6;
    g += `<rect x="600" y="100" width="300" height="56" rx="12" fill="#efe8dc"/><rect x="600" y="100" width="${f1(bw)}" height="56" rx="12" fill="${over ? '#e5484d' : '#1f7a5c'}" stroke="#1b1a1f" stroke-width="4"/>
      <line x1="${f1(600 + 300 * 6 / 8)}" x2="${f1(600 + 300 * 6 / 8)}" y1="86" y2="172" stroke="#1b1a1f" stroke-width="5" stroke-dasharray="8 6"/>
      ${tx(f1(600 + 300 * 6 / 8), 200, 'batas 6 A', 26, '#1b1a1f', 1, 'middle')}${tx(750, 290, `${tot.toFixed(1).replace('.', ',')} A`, 72, over ? '#e5484d' : '#1f7a5c', 1, 'middle')}
      ${tx(750, 350, over ? 'lewat batas!' : '', 32, '#e5484d', 1, 'middle')}`;
  } else if (k === 2) {
    $('insetk').textContent = 'LISTRIK PLN · 50 Hz';
    const ph = t * 3, pts = Array.from({ length: 121 }, (_, i) => { const x = 60 + i * 6.8; return `${f1(x)},${f1(240 - 110 * Math.sin(i / 120 * Math.PI * 2 * 5 - ph))}`; }).join(' ');
    g = `<line x1="60" x2="880" y1="240" y2="240" stroke="#d9cfc0" stroke-width="3"/><polyline points="${pts}" fill="none" stroke="#e3bf62" stroke-width="10" stroke-linejoin="round"/>
      ${tx(70, 115, '+', 40, '#9b2c3f')}${tx(70, 390, '−', 44, '#3e5bb8')}${tx(880, 420, '1 detik = 50 kali bolak-balik', 32, '#1b1a1f', 1, 'end')}`;
  } else {
    $('insetk').textContent = 'DI DALAM CHARGER';
    const st = [T(9, 'diluruskan'), T(9, 'dicacah'), T(9, 'trafo'), T(9, '5')], on = st.map(s0 => smooth(s0 - 0.1, s0 + 0.2, t));
    const wave = (x0, kind, op) => { const pts = Array.from({ length: 41 }, (_, i) => { const u = i / 40, x = x0 + u * 180; let y;
        if (kind === 0) y = 230 - 70 * Math.sin(u * Math.PI * 4); else if (kind === 1) y = 230 - 70 * Math.abs(Math.sin(u * Math.PI * 4)); else if (kind === 2) y = (Math.floor(u * 16) % 2 ? 160 : 300); else y = 200; return `${f1(x)},${f1(y)}`; }).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${kind === 3 ? '#3e8fd1' : '#e3bf62'}" stroke-width="7" opacity="${op.toFixed(2)}" stroke-linejoin="round"/>`; };
    g = wave(40, 0, 1) + tx(130, 360, '220 V ~', 26, '#7a7368', 1, 'middle') + tx(250, 240, '→', 40, '#1b1a1f', on[0]) +
      wave(270, 1, on[0]) + tx(360, 360, 'diluruskan', 26, '#7a7368', on[0], 'middle') + tx(480, 240, '→', 40, '#1b1a1f', on[1]) +
      wave(500, 2, on[1]) + tx(590, 360, 'dicacah', 26, '#7a7368', on[1], 'middle') + tx(708, 240, '→', 40, '#1b1a1f', on[2]) +
      wave(728, 3, Math.max(on[2], on[3])) + tx(818, 360, '5 V', 34, '#3e5bb8', Math.max(on[2], on[3]), 'middle');
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
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };
// peristiwa suara
window.EVENTS = (() => {
  const ev = [];
  ev.push({ t: 0.1, type: 'percik', dur: L[0].e }, { t: T(1, 'butuh') + 0.1, type: 'klikTombol' }, { t: T(1, 'perjalanan'), type: 'whoosh' });
  ev.push({ t: TRIP, type: 'clack' }, { t: TRIP + 0.05, type: 'gelap' }, { t: RESET1, type: 'klikTombol' }, { t: SHORT, type: 'zap' }, { t: SHORT, type: 'hit' }, { t: SHORT_TRIP, type: 'clack' }, { t: SHORT_TRIP, type: 'percik', dur: 0.7 }, { t: RESET2, type: 'klikTombol' });
  LOADS.forEach(([, , s0]) => ev.push({ t: s0, type: 'blip' }));
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  for (const k of [T(3, 'rumah'), T(4, 'kalau'), T(8, 'berganti'), T(9, 'diluruskan')]) ev.push({ t: k, type: 'card' });
  ev.push({ t: T(7, 'mengalir'), type: 'whoosh' }, { t: T(10, 'tiga'), type: 'whoosh' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(4).s); cue('drop', LN(5).s - 0.05); cue('build', LN(5).s + 1.0);
  cue('reveal', LN(7).s); cue('warm', LN(9).s); cue('dark', LN(11).s - 0.1); cue('resolve', LN(11).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(MK.mcbFront);
