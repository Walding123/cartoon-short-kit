// Tutorial "Cara aman ganti tabung LPG 3 kg" — dapur: kompor 2 tungku di meja, tabung melon hijau di lantai, regulator bermeteran + selang.
// Format Tutorial (format.js langkah): masalah -> JANGAN (cek bocor pakai api) -> langkah 1..5 -> hasil (api biru) -> kesalahan umum -> penutup.
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
const NL = 11;
const L = Array.from({ length: NL }, (_, i) => LN(i));
const DUR = +(L[NL - 1].e + 1.5).toFixed(3);
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
  tank: ['#bcd64c', '#94b22e', '#5f7d1c'], tankOld: ['#adc24a', '#8aa133', '#5a7124'], cutTank: flat('#f3eedb'), tankIn: ['#f1ebd9', '#dcd4bf', '#b9b199'],
  paint: flat('#f7f4ea'),
  brass: ['#f1c75e', '#d6a136', '#a87a22'], cutBrass: flat('#f6d98c'), seal: ['#ff7f6e', '#e2453a', '#a92d27'], cutSeal: flat('#f59a8a'),
  steel: ['#e2e3e7', '#b2b5bd', '#7a7d86'], cutSteel: flat('#d6d9de'), silver: ['#fbfcfd', '#c3cad4', '#7e8794'],
  regDark: ['#626674', '#434652', '#2a2c33'], cutReg: flat('#9ea3ae'), lockR: ['#ff9b6b', '#ec5d33', '#b53f1e'],
  dial: flat('#17181d'), dialR: flat('#e5484d'), dialY: flat('#f3c62b'), dialG: flat('#43b26e'), needle: flat('#ff3b3b'), dialW: flat('#f4f1ea'),
  dark: ['#4a4d57', '#2f3139', '#1b1c21'], hose: ['#ffad6e', '#ef7a33', '#b4521d'],
  enamel: ['#4d505b', '#2e3038', '#18191e'], stain: ['#eceef1', '#bfc3ca', '#868b95'], burner: ['#575a63', '#3a3c44', '#222328'],
  wok: ['#6a6e78', '#474a53', '#2b2d33'], wood: ['#dcb98a', '#bf9663', '#93703f'], cap: ['#f6f8fb', '#d9e1ea', '#a7b3c2'], capBand: ['#5f8fe0', '#3e6fd1', '#2a4f9e'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], hl: ['#f6dc8e', '#e3bf62', '#b8913a'], warn: ['#f0a57a', '#d9773f', '#a8551f'], hot: ['#ffb36b', '#f0702e', '#b8451a'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// Cel berbasis teori warna (lihat reference/panduan_warna.md): 2 nada + terminator lembut, bayangan bergeser ke ungu-biru sejuk
// (bukan sekadar gelap), sisi terang sedikit hangat, cahaya langit dari atas, cahaya pinggir (rim) sejuk, kilap sesuai bahan.
// m.hl(palet, k) = ganti warna ke palet sorot (seperti dulu); m.glow(k) = sorotan lembut (pinggir menyala emas), warna asli tetap.
const GLOSS = { tank: 0.55, tankOld: 0.4, brass: 0.8, seal: 0.3, steel: 0.8, silver: 0.9, regDark: 0.5, lockR: 0.45, hose: 0.35, dark: 0.55, enamel: 0.6, stain: 0.8, burner: 0.4, wok: 0.5, cap: 0.5, capBand: 0.45, dial: 0.7 };
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

const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const celA = (pal, alpha) => { const m = cel(pal); m.transparent = true; m.depthWrite = false; m.uniforms.al.value = alpha; return m; };

// ---------- dunia (mm): lantai y = 0, dinding belakang x = WX, kamera dari +x (+z = kiri layar) ----------
const TAU = Math.PI * 2;
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
const WX = -480;
const TABLE = { x0: -450, x1: 175, z0: -760, z1: 760, y0: 750, y1: 780 };
const STOVE = { x0: -330, x1: 10, z0: -380, z1: 300, y0: 780, y1: 868 };
const BURN = [{ x: -150, z: 130 }, { x: -150, z: -210 }];
const KNOB_Y = 822;
const TP = { x: -10, z: 110 };                                   // tempat tabung di lantai, di bawah meja
const INLET = [-250, 815, 300];                                  // nipel selang di sisi kiri kompor

// lathe dibelah dua di bidang x = 0: belahan depan (x > 0, menghadap kamera) bisa disembunyikan, belahan belakang + muka potong tetap
const M_POS = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(1, 0, 0));
const M_NEG = new THREE.Matrix4().makeBasis(V(0, 0, -1), V(0, 1, 0), V(1, 0, 0));
function latheParts(prof, mat, cutMat, ranges = [[0, TAU]], segs = 72) {
  const pts = prof.map(([r, y]) => new THREE.Vector2(r, y)); pts.push(pts[0].clone());
  const front = new THREE.Group(), back = new THREE.Group();
  for (const [a0, a1] of ranges) for (const [h0, h1, g] of [[0, Math.PI, front], [Math.PI, TAU, back]]) {
    const s = Math.max(a0, h0), e = Math.min(a1, h1);
    if (e - s > 1e-4) g.add(mesh(new THREE.LatheGeometry(pts, Math.max(3, Math.round(segs * (e - s) / TAU)), s, e - s), mat));
  }
  const solidAt = a => ranges.some(([a0, a1]) => a >= a0 - 1e-4 && a <= a1 + 1e-4);
  if (cutMat) { const sh = shp(prof);
    if (solidAt(0) || solidAt(TAU)) back.add(mesh(new THREE.ShapeGeometry(sh, 8).applyMatrix4(M_POS), cutMat, 0.04, 0, 0));
    if (solidAt(Math.PI)) back.add(mesh(new THREE.ShapeGeometry(sh, 8).applyMatrix4(M_NEG), cutMat, 0.04, 0, 0)); }
  return { front, back };
}
const latheFull = (prof, mat, segs = 72) => { const pts = prof.map(([r, y]) => new THREE.Vector2(r, y)); pts.push(pts[0].clone()); return mesh(new THREE.LatheGeometry(pts, segs), mat); };
const circProf = (r0, y0, rr, n = 12) => Array.from({ length: n }, (_, i) => [r0 + Math.cos(i / n * TAU) * rr, y0 + Math.sin(i / n * TAU) * rr]);

// ---------- tabung LPG 3 kg ("melon") ----------
// Ciri dari foto (Bing: "tabung gas lpg 3 kg pertamina hijau"):
// · badan baja bulat gemuk hijau muda-zaitun, lebih lebar dari tinggi, sambungan las melingkar di tengah (garis menonjol)
// · kerah/pegangan (handguard) silinder di atas, ±Ø170, dengan jendela besar di depan & belakang, bibir atas digulung
// · kaki cincin di bawah ±Ø185 dengan lubang ventilasi, tulisan putih bertumpuk di depan badan
// · katup kuningan di tengah atas (di dalam kerah), lubangnya berisi karet seal merah + pentil (katup tertutup per)
// · tabung baru bersegel tutup plastik di atas katup
// Ukuran: Ø ±270 mm, tinggi ±370 mm sampai bibir kerah; berat kosong ±5 kg + gas 3 kg = ±8 kg (ESDM).
const TANK = { R: 135, YC: 162, HH: 132, P: 3, V0: 294 };
const bodyR = y => TANK.R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs((y - TANK.YC) / TANK.HH), TANK.P)), 1 / TANK.P);
const V0 = TANK.V0;
const VALVE = [[5, -8], [20, -8], [20, 6], [16, 6], [16, 34], [13.5, 34], [13.5, 39], [16.5, 39], [16.5, 46], [11, 46], [11, 28], [7, 28], [7, 10], [5, 10]].map(([r, y]) => [r, V0 + y]);
const SEAL = [[6, 28], [10.8, 28], [10.8, 42], [8.2, 42], [8.2, 38], [6, 38]].map(([r, y]) => [r, V0 + y]);
const POPPET = [[0.01, 24], [6.5, 24], [6.5, 28], [2.5, 28], [2.5, 40], [0.01, 40]].map(([r, y]) => [r, V0 + y]);
const MOUNT_Y = V0 + 7;                                           // dasar rok regulator saat terkunci
function makeTank(pal, withCap) {
  const G = new THREE.Group(), fronts = [];
  const put = (p, parent = G) => { parent.add(p.back, p.front); fronts.push(p.front); return p; };
  const mT = cel(pal), mCut = cel('cutTank');
  // badan: profil tertutup (luar + dalam), permukaan dalam pucat di belahan belakang
  const out = [], inn = [];
  for (let i = 0; i <= 60; i++) { const y = 30 + (TANK.V0 - 30) * i / 60; out.push([bodyR(y), y]); }
  for (let i = 60; i >= 0; i--) { const y = 34 + (TANK.V0 - 4 - 34) * i / 60; inn.push([Math.max(0.01, bodyR(y) - 4.5), y]); }
  out[0][0] = 0.01; out[out.length - 1][0] = 0.01;
  put(latheParts([...out, ...inn], mT, mCut));
  G.add(mesh(new THREE.LatheGeometry(inn.map(([r, y]) => new THREE.Vector2(Math.max(0.01, r - 0.3), y)), 36, Math.PI, Math.PI), cel('tankIn')));
  put(latheParts([[bodyR(160) - 1, 159], [bodyR(160) + 2.2, 159.5], [bodyR(160) + 2.2, 164.5], [bodyR(160) - 1, 165]], mT, mCut));   // sambungan las
  // tulisan putih (baris cat) di depan badan
  const paint = cel('paint');
  const paintG = new THREE.Group(); G.add(paintG); fronts.push(paintG);
  for (const [y0, y1, a, n] of [[182, 194, 0.5, 3], [156, 166, 0.66, 5], [134, 142, 0.6, 6], [118, 124, 0.42, 5], [214, 220, 0.3, 2]]) {
    const r = bodyR((y0 + y1) / 2) + 0.7, gap = 0.035, wd = (2 * a - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) { const w = wd * (0.6 + 0.4 * hash(y0, k)), s0 = Math.PI / 2 - a + k * (wd + gap);
      paintG.add(mesh(new THREE.LatheGeometry([new THREE.Vector2(bodyR(y0) + 0.7, y0), new THREE.Vector2(r + 0.2, (y0 + y1) / 2), new THREE.Vector2(bodyR(y1) + 0.7, y1)], 6, s0, w), paint)); }
  }
  // kaki cincin dengan lubang ventilasi
  const fr = [[89, 0], [92.5, 0], [92.5, 50], [89, 50]];
  const clipY = (p, a, b) => p.map(([r, y]) => [r, Math.min(b, Math.max(a, y))]);
  put(latheParts(clipY(fr, 0, 14), mT, mCut)); put(latheParts(clipY(fr, 32, 50), mT, mCut));
  const hole = (c, w) => [c - w, c + w];
  const vents = [hole(Math.PI / 2, 0.22), hole(Math.PI * 7 / 6, 0.22), hole(Math.PI * 11 / 6, 0.22)].sort((a, b) => a[0] - b[0]);
  const gaps = []; let a0 = 0; for (const [s, e] of vents) { gaps.push([a0, s]); a0 = e; } gaps.push([a0, TAU]);
  put(latheParts(clipY(fr, 14, 32), mT, mCut, gaps));
  // kerah pegangan: jendela depan & belakang, pita atas utuh, bibir digulung
  const W1 = 0.82;
  put(latheParts([[83, 272], [86.5, 272], [86.5, 350], [83, 350]], mT, mCut, [[0, Math.PI / 2 - W1], [Math.PI / 2 + W1, Math.PI * 1.5 - W1], [Math.PI * 1.5 + W1, TAU]]));
  put(latheParts([[83, 350], [86.5, 350], [86.5, 368], [83, 368]], mT, mCut));
  put(latheParts(circProf(85, 369, 4.2), mT, mCut));
  // katup kuningan + karet seal + pentil ber-per
  const brassM = cel('brass'), sealM = cel('seal');
  put(latheParts(VALVE, brassM, cel('cutBrass')));
  put(latheParts(SEAL, sealM, cel('cutSeal')));
  const pop = new THREE.Group(); G.add(pop);
  put(latheParts(POPPET, cel('steel'), cel('cutSteel')), pop);
  const spring = new THREE.Group(); spring.position.y = V0 + 10; G.add(spring);
  { const sm = cel('silver'), turns = 4, len = 14;
    for (let k = 0; k < turns * 2; k++) {
      const a0 = Math.PI / 2 + k * Math.PI, pts = [];
      for (let i = 0; i <= 12; i++) { const a = a0 + Math.PI * i / 12; pts.push(V(Math.cos(a) * 4.6, (a - Math.PI / 2) / TAU / turns * len, Math.sin(a) * 4.6)); }
      const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.7, 6), sm); spring.add(m);
      if (k % 2 === 1) fronts.push(m);
    } }
  // tutup segel plastik (tabung baru)
  let cap = null;
  if (withCap) { cap = new THREE.Group(); cap.position.y = V0; G.add(cap);
    cap.add(latheFull([[17.6, 2], [20.2, 2], [20.4, 46], [18, 50], [0.01, 50], [0.01, 47], [17.6, 47]], cel('cap')));
    cap.add(latheFull([[20.1, 10], [21, 10], [21, 24], [20.1, 24]], cel('capBand')));
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; cap.add(box(-0.8, 0.8, 30, 44, -0.8, 0.8, cel('cap')).translateX(Math.sin(a) * 20.4).translateZ(Math.cos(a) * 20.4)); } }
  return { G, fronts, pop, spring, cap, mT, sealM, brassM };
}
const TA = makeTank('tankOld', false), TB = makeTank('tank', true);
const pivA = new THREE.Group(), pivB = new THREE.Group(); lt.add(pivA, pivB);   // poros miring di tepi kaki (sisi +z)
pivA.add(TA.G); pivB.add(TB.G); TA.G.position.z = -92; TB.G.position.z = -92;

// ---------- regulator bermeteran (gaya Winn Gas W-900M) ----------
// Ciri dari foto (Bing: "regulator gas lpg meteran winn gas"): rok penjepit abu gelap di bawah, cincin pengunci oranye-merah
// berusuk (diputar searah jarum jam sampai klik), badan kerucut, meteran bulat (bingkai krom, muka hitam, busur merah-kuning-hijau,
// jarum merah) menghadap depan, gagang lengkung hitam melingkari meteran, nipel selang berulir menyamping. Tinggi ±150 mm.
const RG = new THREE.Group(); lt.add(RG);
const regM = cel('regDark'), lockM = cel('lockR'), steelM = cel('steel');
RG.add(latheFull([[17.6, 0], [31, 0], [33, 5], [33, 30], [28, 38], [17.6, 38]], regM));
RG.add(latheFull([[0.01, 37], [17.8, 37], [17.8, 40], [0.01, 40]], regM));
RG.add(latheFull([[0.01, 35], [10.5, 35], [10.5, 37.2], [0.01, 37.2]], steelM));      // muka penekan karet seal
RG.add(latheFull([[0.01, 29], [2.2, 29], [2.2, 35.2], [0.01, 35.2]], steelM));        // pin penekan pentil
const lockG = new THREE.Group(); RG.add(lockG);
lockG.add(latheFull([[33, 8], [38, 8], [39.5, 12], [39.5, 26], [38, 30], [33, 30]], lockM));
for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; const r = rbox(-2, 2, 11, 27, -1.6, 1.6, 0.8, lockM); r.position.set(Math.sin(a) * 40, 19, Math.cos(a) * 40); r.rotation.y = a; lockG.add(r); }
{ const mk = box(-0.6, 0.6, 13, 25, -2.2, 2.2, cel('paint')); mk.position.x = 41.2; lockG.add(mk); }   // tanda panah putih
RG.add(latheFull([[0.01, 40], [30, 40], [29, 46], [21, 62], [11, 72], [0.01, 72]], regM));
RG.add(latheFull([[0.01, 70], [8, 70], [8, 80], [0.01, 80]], steelM));
const GC = [0, 104, 0];                                                               // pusat meteran
RG.add(mesh(new THREE.CylinderGeometry(28, 28, 18, 44).rotateZ(Math.PI / 2), regM, -1, GC[1], 0));
RG.add(mesh(new THREE.TorusGeometry(26.2, 2.4, 10, 48).rotateY(Math.PI / 2), cel('silver'), 8.6, GC[1], 0));
RG.add(mesh(new THREE.CircleGeometry(25, 44).rotateY(Math.PI / 2), cel('dial'), 8.4, GC[1], 0));
const dialTh = v => (225 - 270 * v) * Math.PI / 180;
for (const [v0, v1, p] of [[0, 0.25, 'dialR'], [0.25, 0.5, 'dialY'], [0.5, 1, 'dialG']])
  RG.add(mesh(new THREE.RingGeometry(17.5, 22, 24, 1, dialTh(v1), dialTh(v0) - dialTh(v1)).rotateY(Math.PI / 2), cel(p), 8.6, GC[1], 0));
for (let k = 0; k <= 10; k++) { const th = dialTh(k / 10), tk = box(-0.3, 0.3, -0.6, 0.6, -2.5, 2.5, cel('dialW')); tk.position.set(8.8, GC[1] + Math.sin(th) * 15, -Math.cos(th) * 15); tk.rotation.x = th + Math.PI / 2; RG.add(tk); }
const needle = new THREE.Group(); needle.position.set(9.2, GC[1], 0); RG.add(needle);
needle.add(mesh(new THREE.BoxGeometry(0.6, 2, 21).translate(0, 0, -8.5), cel('needle')), mesh(new THREE.CylinderGeometry(3, 3, 1.4, 16).rotateZ(Math.PI / 2), cel('needle'), 0.4, 0, 0));
RG.add(mesh(new THREE.CylinderGeometry(5, 5, 36, 20).rotateX(Math.PI / 2), steelM, 0, 54, 38));   // nipel selang
for (const z of [46, 52]) RG.add(mesh(new THREE.CylinderGeometry(5, 6.6, 5, 20).rotateX(-Math.PI / 2), steelM, 0, 54, z));
RG.add(tube([[-14, 28, 34], [-15, 70, 45], [-12, 118, 38], [-8, 146, 0], [-12, 118, -38], [-15, 70, -45], [-14, 28, -34]], 4.2, cel('dark')));   // gagang lengkung
const SPIG = [0, 54, 57];

// ---------- selang (dibuat ulang tiap frame dari ujung nipel regulator ke nipel kompor) ----------
const hoseM = cel('hose');
const hose = mesh(new THREE.BufferGeometry(), hoseM); lt.add(hose);
const HOSE_FIX = [[196, 742, 362], [192, 791, 364], [60, 787, 366], [-140, 787, 360], [-215, 803, 338], [-246, 815, 330]];
const clampG = [mesh(new THREE.CylinderGeometry(7.6, 7.6, 7, 20), steelM), mesh(new THREE.CylinderGeometry(7.6, 7.6, 7, 20).rotateX(Math.PI / 2), steelM, -246, 815, 326)];
lt.add(...clampG);
let hoseCurve = null;
function updateHose() {
  RG.updateMatrixWorld(true);
  const a = RG.localToWorld(V(...SPIG)), d = RG.localToWorld(V(0, 54, 80)).sub(a).normalize();
  const b = V(...HOSE_FIX[0]), a1 = a.clone().addScaledVector(d, 40);
  const m = a1.clone().lerp(b, 0.5).add(V(60, -70, 30));
  hoseCurve = new THREE.CatmullRomCurve3([a, a1, m, b, ...HOSE_FIX.slice(1).map(p => V(...p))], false, 'catmullrom', 0.4);
  hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(hoseCurve, 110, 6.2, 10);
  const c = RG.localToWorld(V(0, 54, 60)); clampG[0].position.copy(c); clampG[0].quaternion.copy(RG.quaternion); clampG[0].rotateX(Math.PI / 2);
}

// ---------- kompor 2 tungku di atas meja ----------
// Ciri dari foto (Bing: "kompor gas 2 tungku rinnai"): badan baja tahan karat rendah ±680 × 340 × 90 mm, nampan atas enamel hitam,
// dua tungku (cincin api + tutup kuningan) dengan dudukan panci 5 jari hitam, dua kenop bulat hitam di depan, nipel selang di sisi.
const stove = new THREE.Group(); lt.add(stove);
const S0 = STOVE;
stove.add(rbox(S0.x0, S0.x1, S0.y0 + 8, 860, S0.z0, S0.z1, 8, cel('stain')));
stove.add(rbox(S0.x0 + 5, S0.x1 - 5, 855, S0.y1, S0.z0 + 5, S0.z1 - 5, 6, cel('enamel')));
stove.add(box(S0.x1 - 0.5, S0.x1 + 0.6, 800, 846, S0.z0 + 20, S0.z1 - 20, cel('dark')));
for (const [x, z] of [[S0.x0 + 30, S0.z0 + 30], [S0.x0 + 30, S0.z1 - 30], [S0.x1 - 30, S0.z0 + 30], [S0.x1 - 30, S0.z1 - 30]]) stove.add(mesh(new THREE.CylinderGeometry(12, 14, 9, 16), cel('dark'), x, S0.y0 + 4.5, z));
const knobs = [];
for (const b of BURN) {
  stove.add(mesh(new THREE.CylinderGeometry(58, 60, 8, 40), cel('burner'), b.x, 872, b.z));
  stove.add(latheFull([[30, 876], [46, 876], [46, 882], [42, 885], [30, 885]], cel('burner'), 48));
  stove.children[stove.children.length - 1].position.set(b.x, 0, b.z);
  stove.add(latheFull([[0.01, 884], [31, 884], [33, 888], [28, 893], [0.01, 894]], cel('brass'), 48));
  stove.children[stove.children.length - 1].position.set(b.x, 0, b.z);
  const ps = new THREE.Group(); ps.position.set(b.x, 0, b.z); stove.add(ps);
  ps.add(mesh(new THREE.TorusGeometry(98, 3.4, 8, 60).rotateX(Math.PI / 2), cel('dark'), 0, 878, 0));
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.3, f = new THREE.Group(); f.rotation.y = a; ps.add(f);
    f.add(prismXY(shp([[62, 0], [101, 0], [101, 4], [96, 22], [66, 22], [62, 16]]), -3.2, 3.2, cel('dark')).translateY(876)); }
  const kn = new THREE.Group(); kn.position.set(S0.x1, KNOB_Y, b.z); stove.add(kn);
  stove.add(mesh(new THREE.CylinderGeometry(25, 25, 3, 40).rotateZ(Math.PI / 2), cel('silver'), S0.x1 + 1.5, KNOB_Y, b.z));
  kn.add(mesh(new THREE.CylinderGeometry(20, 21, 14, 40).rotateZ(Math.PI / 2), cel('dark'), 10, 0, 0));
  kn.add(rbox(14, 30, -21, 21, -5, 5, 3, cel('dark')));
  kn.add(box(30, 30.8, 10, 19, -1.6, 1.6, cel('paint')));
  knobs.push(kn);
}
stove.add(mesh(new THREE.CylinderGeometry(5.5, 5.5, 34, 20).rotateX(Math.PI / 2), cel('brass'), INLET[0], INLET[1], INLET[2] + 14));
// wajan di tungku kiri (sedang masak)
const wok = new THREE.Group(); wok.position.set(BURN[0].x, 0, BURN[0].z); stove.add(wok);
{ const outer = [], inner = [];
  for (let i = 0; i <= 30; i++) { const r = 175 * i / 30, y = r < 62 ? 898 - 5 * (1 - (r / 62) ** 2) : 898 + 88 * ((r - 62) / 113) ** 2; outer.push([Math.max(0.01, r), y]); }
  for (let i = 30; i >= 0; i--) { const [r, y] = outer[i]; inner.push([Math.max(0.01, r - 2.4), y + 3]); }
  wok.add(latheFull([...outer, ...inner], cel('wok'), 64));
  wok.add(latheFull(circProf(175, 986, 3.2, 10), cel('wok'), 64));
  for (const s of [-1, 1]) wok.add(tube([[0, 975, s * 168], [0, 985, s * 196], [0, 978, s * 214], [0, 962, s * 210], [0, 960, s * 186]], 4.4, cel('dark'))); }

// bayangan kontak lembut (gradien radial) di lantai & meja
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.55)'); g.addColorStop(.55, 'rgba(34,30,66,.24)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.position.set(x, y, z); lt.add(m); return m; };
const blobA = blob(0, 0.6, 0, 135, 135), blobB = blob(0, 0.6, 0, 135, 135);
blob((S0.x0 + S0.x1) / 2 + 20, TABLE.y1 + 0.6, (S0.z0 + S0.z1) / 2, 230, 400);

// titik penanda
const mk = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const MK = {
  gauge: mk(RG, 9, GC[1] + 6, -24), ring: mk(RG, 30, 22, -32), joint: mk(RG, 26, 2, -14), spig: mk(RG, 0, 54, 50),
  knob: mk(stove, S0.x1 + 30, KNOB_Y + 20, BURN[0].z), flame: mk(stove, BURN[0].x + 46, 885, BURN[0].z),
  cap: mk(TB.G, 14, V0 + 46, -14), seal: mk(TB.G, 0, V0 + 36, -10), sealTop: mk(TB.G, 8, V0 + 40, -6), poppet: mk(TB.G, 0, V0 + 16, 4),
  tankB: mk(TB.G, 120, 170, -60), hoseMid: null,
};

// ---------- jadwal (semua dikunci ke kata) ----------
const tFlameOut = T(0, 'habis') + 0.25;
const knobKeys = [[0, 1], [T(2, 'putar') + 0.1, 1], [T(2, 'mati') + 0.1, 0], [T(8, 'baru'), 0], [T(8, 'nyalakan') + 0.2, 1]];
const tIgnite = T(8, 'nyalakan') + 0.45;
const flameKeys = [[0, 1], [tFlameOut - 0.5, 1], [tFlameOut, 0], [tIgnite - 0.05, 0], [tIgnite + 0.25, 1]];
const unlockKeys = [[0, 1], [T(3, 'pengunci') - 0.2, 1], [T(3, 'pengunci') + 0.5, 0]];
const tLift = T(3, 'angkat');
const liftKeys = [[0, 0], [tLift - 0.1, 0], [tLift + 0.8, 1], [T(6, 'tekan') - 0.1, 1], [T(6, 'lurus') + 0.25, 0]];
const tOut = L[3].e + 0.05, tIn0 = tOut + 0.55, tIn1 = Math.max(tIn0 + 0.6, T(4, 'lepas') - 0.1);
const swapA = [[0, 0], [tOut, 0], [tOut + 0.7, 1]], swapB = [[0, 1], [tIn0, 1], [tIn1, 0]];
const tCap = T(4, 'segel') + 0.1;
const cutKeys = [[0, 0], [L[5].s - 0.35, 0], [L[5].s + 0.2, 1], [L[5].e + 0.1, 1], [L[5].e + 0.6, 0]];
const tKlik = T(6, 'klik');
const lockKeys = [[0, 0], [T(6, 'putar') - 0.05, 0], [tKlik - 0.05, 1]];
const pressKeys = [[0, 0], [tKlik - 0.12, 0], [tKlik, 1]];
const gaugeKeys = [[0, 0.06], [tLift, 0.06], [tLift + 0.4, 0], [tKlik, 0], [tKlik + 1.1, 0.86]];
const foamKeys = [[0, 0], [T(7, 'oles') - 0.1, 0], [T(7, 'sabun') + 0.2, 1], [L[8].e + 0.3, 1], [L[8].e + 0.9, 0]];
const bubKeys = [[0, 0], [T(7, 'ada') - 0.05, 0], [T(7, 'berarti') + 0.2, 1], [L[7].e + 0.1, 1], [L[8].s + 0.2, 0]];
const darkKeys = [[0, 0], [T(1, 'ngecek') - 0.2, 0], [T(1, 'ngecek') + 0.2, 0.8], [L[1].e + 0.15, 0.8], [L[2].s + 0.15, 0]];
const tiltKeys = [[0, 0], [T(9, 'rebahkan') - 0.05, 0], [T(9, 'miringkan') + 0.1, 1], [T(9, 'tabung') + 0.35, 1], [T(9, 'selang') - 0.1, 0]];
const crackKeys = [[0, 0], [T(9, 'selang') - 0.05, 0], [T(9, 'retak') + 0.2, 1], [L[9].e + 0.2, 1], [L[10].s + 0.3, 0]];

// kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x]
const camKeys = [
  [0, [BURN[0].z, 905, 420, 86, 5, 0.5, 0.5, 0.35, BURN[0].x + 40]],
  [tFlameOut + 0.4, [BURN[0].z, 905, 450, 84, 6, 0.5, 0.5, 0.35, BURN[0].x + 40]],
  [T(0, 'ganti') + 0.3, [TP.z + 10, 300, 820, 76, 14, 0.5, 0.5, 0.2, TP.x]],
  [L[0].e + 0.2, [TP.z + 10, 300, 780, 76, 14, 0.5, 0.5, 0.2, TP.x]],
  [T(1, 'ngecek') + 0.2, [TP.z - 20, 330, 420, 80, 12, 0.5, 0.6, 0.45, TP.x]],
  [L[1].e + 0.2, [TP.z - 20, 330, 400, 80, 12, 0.5, 0.6, 0.45, TP.x]],
  [T(2, 'putar'), [BURN[0].z - 40, 860, 620, 72, 14, 0.5, 0.42, 0.25, S0.x1 - 80]],
  [L[2].e + 0.1, [BURN[0].z - 40, 860, 600, 72, 14, 0.5, 0.42, 0.25, S0.x1 - 80]],
  [T(3, 'pengunci') - 0.3, [TP.z, 370, 560, 78, 16, 0.5, 0.5, 0.2, TP.x]],
  [tLift + 0.9, [TP.z, 420, 820, 78, 15, 0.5, 0.47, 0.2, TP.x]],
  [tIn1 + 0.1, [TP.z, 380, 860, 80, 15, 0.5, 0.5, 0.15, TP.x]],
  [T(4, 'intip'), [TP.z, V0 + 34, 300, 84, 34, 0.5, 0.52, 0.35, TP.x]],
  [L[4].e + 0.1, [TP.z, V0 + 32, 280, 86, 34, 0.5, 0.52, 0.35, TP.x]],
  [L[5].s + 0.3, [TP.z, V0 + 24, 150, 86, 9, 0.5, 0.5, 0.45, TP.x]],
  [L[5].e + 0.2, [TP.z, V0 + 24, 142, 86, 9, 0.5, 0.5, 0.45, TP.x]],
  [T(6, 'lurus') + 0.2, [TP.z, 360, 600, 80, 16, 0.5, 0.48, 0.25, TP.x]],
  [L[6].e + 0.2, [TP.z, 360, 570, 80, 16, 0.5, 0.48, 0.25, TP.x]],
  [T(7, 'oles'), [TP.z - 10, 320, 300, 80, 12, 0.5, 0.5, 0.35, TP.x]],
  [L[7].e + 0.1, [TP.z - 10, 320, 285, 80, 12, 0.5, 0.5, 0.35, TP.x]],
  [T(8, 'baru'), [BURN[0].z - 40, 880, 640, 74, 12, 0.5, 0.6, 0.25, S0.x1 - 90]],
  [L[8].e + 0.1, [BURN[0].z - 40, 880, 660, 74, 12, 0.5, 0.6, 0.25, S0.x1 - 90]],
  [T(9, 'rebahkan') - 0.3, [TP.z + 60, 300, 900, 74, 12, 0.5, 0.52, 0.15, TP.x]],
  [T(9, 'selang'), [180, 540, 900, 72, 13, 0.5, 0.5, 0.15, 40]],
  [L[9].e + 0.2, [180, 540, 920, 72, 13, 0.5, 0.5, 0.15, 40]],
  [L[10].s + 0.6, [20, 520, 1450, 70, 12, 0.5, 0.56, 0.05, -60]],
  [DUR, [20, 520, 1500, 68, 12, 0.5, 0.56, 0.05, -60]],
];

// ---------- label, teks kinetik, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(0, 'ganti') + 0.3, L[0].e + 0.2, 'Meteran: habis', () => MK.gauge, 'r', 'warn');
tag(T(2, 'kenop'), L[2].e + 0.2, 'Kenop: mati', () => MK.knob, 'l', 'hi');
tag(T(3, 'pengunci'), tLift + 0.2, 'Pengunci', () => MK.ring, 'r', 'hi');
tag(T(4, 'segel') + 0.05, T(4, 'intip') - 0.1, 'Segel plastik', () => MK.cap, 'r', '');
tag(T(4, 'karet'), L[4].e + 0.2, 'Karet seal', () => MK.sealTop, 'r', 'hi');
tag(L[5].s + 0.2, L[5].e + 0.3, 'Seal utuh', () => MK.seal, 'r', 'ok');
tag(T(5, 'karet'), L[5].e + 0.3, 'Pentil + per', () => MK.poppet, 'l', '');
tag(T(6, 'putar'), tKlik - 0.05, 'Searah jarum jam', () => MK.ring, 'r', 'hi');
tag(tKlik + 0.5, L[6].e + 0.3, 'Jarum: penuh', () => MK.gauge, 'r', 'ok');
tag(T(7, 'berarti'), L[7].e + 0.2, 'Gelembung = bocor', () => MK.joint, 'r', 'warn');
tag(L[8].s, T(8, 'baru') - 0.1, 'Aman, tak ada gelembung', () => MK.joint, 'r', 'ok');
tag(T(9, 'retak'), L[9].e + 0.2, 'Selang retak', () => hoseCurve.getPointAt(0.3).toArray(), 'r', 'warn');
const stampDefs = [
  [T(0, 'habis') + 0.1, T(0, 'pas') + 0.6, 'Habis!', 330, ''],
  [tKlik, L[6].e + 0.3, 'Klik!', 330, 'snd'],
  [tIgnite, L[8].e + 0.3, 'Wuss!', 330, 'snd'],
  [T(10, 'masak'), DUR + 1, 'Aman!', 820, 'snd'],
];
const J1 = { t: T(1, 'satu') - 0.1, e: L[1].e + 0.35, teks: 'Cek bocor pakai api' }, J2 = { t: T(9, 'jangan') - 0.1, e: T(9, 'selang') - 0.1, teks: 'Rebahkan tabung' };
const FORMAT = { langkah: { e: T(8, 'baru') - 0.05, items: [
  { t: T(2, 'langkah'), teks: 'Matikan kenop kompor' }, { t: T(3, 'dua'), teks: 'Buka kunci, angkat' }, { t: T(4, 'tiga'), teks: 'Cek karet seal' },
  { t: T(6, 'empat'), teks: 'Tekan lurus, kunci' }, { t: T(7, 'lima'), teks: 'Tes air sabun' }], jangan: J1 } };
const FMT = await import('./format.js'); FMT.pasang();

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
const S = { flame: 1, dark: 0, foam: 0, bub: 0, crack: 0, cut: 0, gauge: 0, imp: 0, tilt: 0 };
const mountObjB = mk(TB.G, 0, MOUNT_Y, 0), mountObjA = mk(TA.G, 0, MOUNT_Y, 0);
const qT = new THREE.Quaternion();
function updateModel(t) {
  S.flame = track(flameKeys, t);
  if (t > tFlameOut - 0.6 && t < tFlameOut) S.flame *= 0.55 + 0.45 * Math.abs(Math.sin(t * 37));      // api tersendat
  S.dark = track(darkKeys, t); S.foam = track(foamKeys, t); S.bub = track(bubKeys, t); S.crack = track(crackKeys, t);
  S.cut = track(cutKeys, t); S.gauge = track(gaugeKeys, t); S.tilt = track(tiltKeys, t);
  S.imp = t >= tKlik ? Math.exp(-(t - tKlik) * 7) : 0;
  knobs[0].rotation.x = -Math.PI / 2 * track(knobKeys, t);
  // tabung lama keluar ke kiri, tabung baru masuk dari kolong meja (kanan)
  const sa = easeIO(track(swapA, t)), sb = easeIO(track(swapB, t));
  pivA.position.set(TP.x, 0, TP.z + 92 + sa * 900); pivA.visible = sa < 0.999;
  pivB.position.set(TP.x, 0, TP.z + 92 - sb * 1000); pivB.visible = sb < 0.999;
  pivB.rotation.x = 0.3 * easeIO(S.tilt);
  blobA.position.set(TP.x, 0.6, TP.z + sa * 900); blobA.visible = pivA.visible;
  blobB.position.set(TP.x, 0.6, TP.z - sb * 1000); blobB.visible = pivB.visible;
  blobB.scale.set(1, 1, 1 - 0.25 * S.tilt);
  // tutup segel lepas (naik, berputar, lalu hilang)
  const cp = clamp((t - tCap) / 0.55);
  TB.cap.visible = cp < 1; TB.cap.position.set(cp * 20, V0 + 90 * Math.sin(cp * Math.PI * 0.6), -cp * 30); TB.cap.rotation.z = -cp * 1.2;
  // belah: belahan depan tabung baru digeser ke kamera lalu disembunyikan
  const cu = easeIO(S.cut);
  for (const f of TB.fronts) { f.visible = cu < 0.98; f.position.x = 50 * cu; }
  // regulator: di tabung lama (terkunci) -> buka -> angkat lurus -> menunggu di atas -> turun lurus ke tabung baru -> kunci
  const onB = t >= tIn1;
  const mObj = onB ? mountObjB : mountObjA;
  const press = onB ? easeIO(track(pressKeys, t)) : 1;
  const lift = easeIO(track(liftKeys, t)) * 230 + (1 - press) * 4;
  lt.updateMatrixWorld(true);
  mObj.getWorldPosition(RG.position); mObj.getWorldQuaternion(qT); RG.quaternion.copy(qT);
  RG.position.addScaledVector(V(0, 1, 0).applyQuaternion(qT), lift);
  if (!onB && t > tOut) RG.position.set(TP.x, MOUNT_Y + 230, TP.z);          // menunggu di atas saat tabung ditukar
  const lockA = onB ? track(lockKeys, t) : track(unlockKeys, t);
  lockG.rotation.y = -Math.PI / 2 * easeIO(lockA);
  needle.rotation.x = dialTh(S.gauge + 0.004 * Math.sin(t * 9) * S.gauge);
  // pentil tabung baru ditekan pin regulator (4 mm) saat terkunci; per memendek
  const open = onB ? clamp(4 - lift + 0, 0, 4) * (lift < 4.01 ? 1 : 0) : 0;
  TB.pop.position.y = -open; TB.spring.scale.y = (14 - open) / 14;
  TB.sealM.glow(0.9 * pulse(T(4, 'karet'), L[5].e, t)); TB.sealM.hl('seal', 0);
  hoseM.hl('warn', 0.5 * S.crack); hoseM.glow(0);
  TB.mT.glow(0.6 * S.tilt);
  lockM.glow(0.8 * (pulse(T(3, 'pengunci'), tLift, t) + pulse(T(6, 'putar'), tKlik + 0.2, t)));
  updateHose();
  wok.visible = true;
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2] * (1 - 0.012 * Math.sin(t * 0.7)) * (1 - 0.04 * S.imp);
  const w = h * W / H;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -w / 2; camera.right = w / 2;
  lt.updateMatrixWorld(true);
  const target = lt.localToWorld(tmpV.set(c[8] || 0, c[1], c[0]));
  const az = clamp(c[3], 20, 170) * Math.PI / 180, el = c[4] * Math.PI / 180;
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 4000);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[5]) * w).addScaledVector(up, (c[6] - 0.07 - 0.5) * h);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  edge.mat.uniforms.dim.value = S.dark * 0.7;
  $('shake').style.transform = S.imp > 0.05 ? `translate(${(Math.sin(t * 71) * 5 * S.imp).toFixed(1)}px, ${(Math.cos(t * 53) * 3 * S.imp).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: dapur (dinding keramik, jendela, rak, meja kayu, lantai) ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
  <pattern id="wtile" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="#c3d2d2"/><rect x="3" y="3" width="94" height="94" rx="5" fill="#cddbda"/><path d="M100 0H0V100" fill="none" stroke="#a9bcbd" stroke-width="5"/></pattern>
  <pattern id="ftile" width="300" height="300" patternUnits="userSpaceOnUse"><rect width="300" height="300" fill="#dcc3a0"/><rect x="4" y="4" width="292" height="292" fill="#e3cdad"/><path d="M300 0H0V300" fill="none" stroke="#bfa47f" stroke-width="7"/></pattern>
  <pattern id="woodt" width="600" height="60" patternUnits="userSpaceOnUse"><rect width="600" height="60" fill="#b98a5c"/><path d="M0 59H600" stroke="#a37548" stroke-width="3"/><path d="M60 22q90 -8 200 0t240 3" fill="none" stroke="#ab7d50" stroke-width="3"/></pattern>
  <linearGradient id="sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e3f1f8"/><stop offset="1" stop-color="#a9d2ec"/></linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#1e2433" stop-opacity="0"/><stop offset="1" stop-color="#1e2433" stop-opacity=".3"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#2a2230"/><stop offset="1" stop-color="#0d0f15"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#d6e0df"/>
  <g id="env" filter="url(#dof)"></g>
  <rect id="sorot" width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const P2 = p => project(p);
const f1 = v => v.toFixed(1);
const ptsAttr = a => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const planeM = (o, u, v) => {
  const O = P2(o), U = P2([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = P2([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
function boxSVG(x0, x1, y0, y1, z0, z1, top, side1, side2, stroke = '#1b1a1f') {
  const cd = V(0, 0, 1).applyQuaternion(camera.quaternion);
  const faces = [
    [[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top],
    [[1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], side1],
    [[0, 0, 1], [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]], side2],
    [[0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], side2],
  ];
  return faces.map(([n, q, col]) => n[0] * cd.x + n[1] * cd.y + n[2] * cd.z > 0
    ? `<polygon points="${ptsAttr(q.map(p => P2(p)))}" fill="${col}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>` : '').join('');
}
function updateBg(t) {
  const zoom = 900 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.1) * 1.4, 0, 9).toFixed(2));
  const T0 = TABLE;
  let s = `<g transform="${planeM([WX, 0, 0], [0, 0, -1], [0, -1, 0])}">
    <rect x="-1600" y="-2400" width="3200" height="2400" fill="url(#wtile)"/>
    <rect x="-1600" y="-90" width="3200" height="90" fill="#8fa3a6" stroke="#1b1a1f" stroke-width="4"/>
    <rect x="-1240" y="-1720" width="560" height="480" rx="8" fill="#f6f2ea" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="-1222" y="-1702" width="256" height="444" fill="url(#sky)"/><rect x="-948" y="-1702" width="250" height="444" fill="url(#sky)"/>
    <path d="M-1222 -1330q60 -40 120 -14t130 -30 120 24 150 -10V-1258H-1222Z" fill="#9cc79a"/>
    <rect x="-1250" y="-1250" width="580" height="18" rx="4" fill="#e9e1d2" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="200" y="-1380" width="620" height="14" rx="6" fill="#6f5b45" stroke="#1b1a1f" stroke-width="3"/>
    ${[260, 360, 460, 560, 660, 760].map((x, k) => `<line x1="${x}" y1="-1370" x2="${x}" y2="-1330" stroke="#1b1a1f" stroke-width="4"/>` + (k % 2
      ? `<rect x="${x - 9}" y="-1330" width="18" height="150" rx="6" fill="#d9773f" stroke="#1b1a1f" stroke-width="3"/><ellipse cx="${x}" cy="-1170" rx="26" ry="18" fill="#d9773f" stroke="#1b1a1f" stroke-width="3"/>`
      : `<rect x="${x - 7}" y="-1330" width="14" height="140" rx="5" fill="#a9b1bd" stroke="#1b1a1f" stroke-width="3"/><rect x="${x - 22}" y="-1196" width="44" height="58" rx="10" fill="#a9b1bd" stroke="#1b1a1f" stroke-width="3"/>`)).join('')}
    <rect x="-1600" y="-${T0.y1 - 10}" width="3200" height="${T0.y1 - 10}" fill="#2a2440" opacity=".16"/>
  </g>`;
  // lantai + bayangan kolong meja
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}"><rect x="${WX}" y="-2400" width="2600" height="4800" fill="url(#ftile)"/>
    <rect x="${T0.x0 + 40}" y="${-T0.z1 + 40}" width="${T0.x1 - T0.x0 - 40}" height="${T0.z1 - T0.z0 - 80}" fill="#2a2440" opacity=".18" filter="url(#soft)"/></g>`;
  // kaki meja (belakang lalu depan) + daun meja kayu
  for (const [x, z] of [[T0.x0 + 10, T0.z0 + 10], [T0.x0 + 10, T0.z1 - 40], [T0.x1 - 40, T0.z0 + 10], [T0.x1 - 40, T0.z1 - 40]]) s += boxSVG(x, x + 30, 0, T0.y0, z, z + 30, '#8a6440', '#9c7149', '#7e5a39');
  s += `<g transform="${planeM([0, T0.y1, 0], [1, 0, 0], [0, 0, -1])}"><rect x="${T0.x0}" y="${-T0.z1}" width="${T0.x1 - T0.x0}" height="${T0.z1 - T0.z0}" fill="url(#woodt)" stroke="#1b1a1f" stroke-width="4"/></g>`;
  s += boxSVG(T0.x0, T0.x1, T0.y0, T0.y1, T0.z0, T0.z1, 'none', '#a3764b', '#94693f');
  // toples & talenan di meja (kanan, di belakang)
  s += boxSVG(-420, -300, T0.y1, T0.y1 + 260, -720, -460, '#e7d6b5', '#d8c29a', '#c8b086');
  { const c = [-330, T0.y1, -600];
    s += `<g transform="${planeM([c[0], c[1] + 0.5, c[2]], [1, 0, 0], [0, 0, -1])}"><ellipse cx="0" cy="0" rx="70" ry="70" fill="#2a2440" opacity=".2"/></g>`; }
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.94 * S.dark).toFixed(3));
  $('sorot').setAttribute('opacity', (0.6 + 0.4 * CAM[7] / 0.45).toFixed(3));
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
    el.style.top = clamp(y - h / 2, 240, 1200) + 'px';
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
  $('inset').style.opacity = 0;
}

// efek: api biru kompor, uap wajan, api korek (JANGAN), busa & gelembung sabun, retak selang, gelombang klik, percik pemantik
function updateFx(t) {
  let s = `<defs><radialGradient id="glo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".35" stop-color="#f6c96a" stop-opacity=".55"/><stop offset="1" stop-color="#f6c96a" stop-opacity="0"/></radialGradient>
    <radialGradient id="bglo"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".75"/><stop offset="1" stop-color="#5aa2ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="fire"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff6a2b" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  // api biru: lidah-lidah di sekeliling cincin tungku (hanya sisi yang menghadap kamera)
  if (S.flame > 0.02) {
    const b = BURN[0], c = project([b.x, 884, b.z]);
    s += `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${f1(80 * pxmm)}" ry="${f1(26 * pxmm)}" fill="url(#bglo)" opacity="${(0.8 * S.flame).toFixed(2)}"/>`;
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * TAU, cx = Math.sin(a);
      if (cx < -0.35) continue;
      const fl = S.flame * (0.75 + 0.25 * Math.sin(t * 23 + k * 2.1)), r0 = 46, len = 16 * fl;
      const p0 = project([b.x + Math.sin(a) * r0, 883, b.z + Math.cos(a) * r0]), p1 = project([b.x + Math.sin(a) * (r0 + len * 0.7), 883 + len, b.z + Math.cos(a) * (r0 + len * 0.7)]);
      const wdt = 3.4 * pxmm;
      s += `<path d="M${f1(p0[0] - wdt)} ${f1(p0[1])} Q${f1((p0[0] + p1[0]) / 2 - wdt)} ${f1((p0[1] + p1[1]) / 2)} ${f1(p1[0])} ${f1(p1[1])} Q${f1((p0[0] + p1[0]) / 2 + wdt)} ${f1((p0[1] + p1[1]) / 2)} ${f1(p0[0] + wdt)} ${f1(p0[1])}Z" fill="#4f8dff" opacity="${(0.85 * fl).toFixed(2)}"/>`;
      s += `<path d="M${f1(p0[0] - wdt * 0.4)} ${f1(p0[1])} L${f1(lerp(p0[0], p1[0], 0.55))} ${f1(lerp(p0[1], p1[1], 0.55))} L${f1(p0[0] + wdt * 0.4)} ${f1(p0[1])}Z" fill="#cfe6ff" opacity="${(0.9 * fl).toFixed(2)}"/>`;
    }
  }
  // uap wajan
  { const c = project([BURN[0].x, 990, BURN[0].z]), hot = Math.max(S.flame, t < tFlameOut + 2 ? 1 - (t - tFlameOut) / 2 : 0, t > tIgnite ? 1 : 0);
    if (hot > 0.02) for (let k = 0; k < 4; k++) {
      const ph = (t * 0.28 + k / 4) % 1, x0 = c[0] + (k - 1.5) * 45 * pxmm, hgt = 160 * pxmm;
      s += `<path d="M${f1(x0)} ${f1(c[1])} q${f1(18 * pxmm * Math.sin(t * 1.2 + k))} ${f1(-hgt * 0.3)} 0 ${f1(-hgt * 0.5)} t0 ${f1(-hgt * 0.5)}" fill="none" stroke="#ffffff" stroke-width="${f1(9 * pxmm)}" stroke-linecap="round" opacity="${f1(0.55 * hot * Math.sin(Math.PI * ph))}" transform="translate(0 ${f1(-ph * 60 * pxmm)})"/>`;
    } }
  // JANGAN: korek api di dekat sambungan, api oranye, lingkaran larangan merah
  { const a = pulse(T(1, 'api') - 0.05, L[1].e + 0.2, t, 0.12);
    if (a > 0.01) {
      const j = project(MK.joint), x = j[0] + 70 * pxmm * 0.6, y = j[1] + 10, u = pxmm * 0.6, fl = 1 + 0.12 * Math.sin(t * 31);
      s += `<g opacity="${a.toFixed(2)}"><circle cx="${f1(x)}" cy="${f1(y - 60 * u)}" r="${f1(70 * u)}" fill="url(#fire)"/>
        <rect x="${f1(x - 16 * u)}" y="${f1(y - 6 * u)}" width="${f1(32 * u)}" height="${f1(90 * u)}" rx="${f1(8 * u)}" fill="#e5484d" stroke="#1b1a1f" stroke-width="4"/>
        <rect x="${f1(x - 15 * u)}" y="${f1(y - 26 * u)}" width="${f1(30 * u)}" height="${f1(22 * u)}" rx="${f1(3 * u)}" fill="#c3cad4" stroke="#1b1a1f" stroke-width="4"/>
        <path d="M${f1(x)} ${f1(y - 28 * u)} q${f1(-14 * u)} ${f1(-24 * u * fl)} ${f1(0)} ${f1(-58 * u * fl)} q${f1(14 * u)} ${f1(34 * u * fl)} 0 ${f1(58 * u * fl)}Z" fill="#ffb347" stroke="#c0491c" stroke-width="3"/>
        <path d="M${f1(x)} ${f1(y - 28 * u)} q${f1(-6 * u)} ${f1(-12 * u)} 0 ${f1(-28 * u * fl)} q${f1(6 * u)} ${f1(16 * u)} 0 ${f1(28 * u * fl)}Z" fill="#fff1b8"/>
        <circle cx="${f1(x)}" cy="${f1(y - 20 * u)}" r="${f1(78 * u)}" fill="none" stroke="#c9373f" stroke-width="${f1(12 * u)}"/>
        <path d="M${f1(x - 55 * u)} ${f1(y - 75 * u)} L${f1(x + 55 * u)} ${f1(y + 35 * u)}" stroke="#c9373f" stroke-width="${f1(12 * u)}" stroke-linecap="round"/></g>`;
    } }
  // busa air sabun di sambungan (sisi depan), gelembung membesar = bocor
  if (S.foam > 0.01 && pivB.visible) {
    for (let k = 0; k < 26; k++) {
      const a = -1.2 + 2.4 * (k / 25), rr = 21 + 3 * hash(k, 3), yy = MOUNT_Y + 1 + 6 * hash(k, 5);
      const p = project(TB.G.localToWorld(V(Math.cos(a) * rr, yy, Math.sin(a) * rr)).toArray());
      const grow = S.bub * (k % 3 === 0 ? 1 : 0.35) * (0.7 + 0.3 * Math.sin(t * 3 + k));
      const r = (1.4 + 1.6 * hash(k, 9) + 7 * grow) * pxmm * S.foam;
      s += `<circle cx="${f1(p[0])}" cy="${f1(p[1] - r * 0.6)}" r="${f1(r)}" fill="#f4fbff" fill-opacity=".55" stroke="#7fa7c9" stroke-width="${f1(clamp(0.35 * pxmm, 1.5, 4))}"/>
        <circle cx="${f1(p[0] - r * 0.35)}" cy="${f1(p[1] - r * 0.95)}" r="${f1(r * 0.25)}" fill="#ffffff"/>`;
    }
  }
  // retak di selang
  if (S.crack > 0.01 && hoseCurve) for (let k = 0; k < 5; k++) {
    const p = project(hoseCurve.getPointAt(0.18 + k * 0.05).toArray()), sz = 9 * pxmm * S.crack;
    s += `<path d="M${f1(p[0] - sz)} ${f1(p[1] - sz * 0.4)} l${f1(sz * 0.6)} ${f1(sz * 0.5)} l${f1(sz * 0.5)} ${f1(-sz * 0.6)} l${f1(sz * 0.7)} ${f1(sz * 0.5)}" fill="none" stroke="#1b1a1f" stroke-width="${f1(clamp(1.2 * pxmm, 2, 5))}" stroke-linecap="round" opacity="${S.crack.toFixed(2)}"/>`;
  }
  // gelombang klik
  if (t > tKlik && t < tKlik + 0.6) { const c = project(MK.ring), k = (t - tKlik) / 0.6;
    s += `<circle cx="${f1(c[0] - 20)}" cy="${f1(c[1])}" r="${f1(40 + 160 * k)}" fill="none" stroke="#e3bf62" stroke-width="${f1(10 * (1 - k))}" opacity="${f1(1 - k)}"/>`; }
  // percik pemantik (tik-tik) sebelum api menyala
  if (t > T(8, 'nyalakan') && t < tIgnite + 0.05 && Math.floor(t * 14) % 2 === 0) {
    const a = project([BURN[0].x + 40, 886, BURN[0].z + 22]), seed = Math.floor(t * 30);
    let d = `M${f1(a[0])} ${f1(a[1])}`; for (let q = 1; q < 5; q++) d += ` L${f1(a[0] + q * 6 + (hash(seed, q) - 0.5) * 14)} ${f1(a[1] - q * 7 + (hash(seed, q + 9) - 0.5) * 12)}`;
    s += `<circle cx="${f1(a[0] + 12)}" cy="${f1(a[1] - 14)}" r="30" fill="url(#glo)"/><path d="${d}" stroke="#1b1a1f" stroke-width="8" fill="none"/><path d="${d}" stroke="#fffbe6" stroke-width="4" fill="none"/>`;
  }
  $('dim').innerHTML = s;
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
window.renderAt = t => {
  updateModel(t); updateCamera(t); draw(); updateOverlay(t);
  FORMAT.langkah.jangan = t < L[5].s ? J1 : J2;
  FMT.gambar(t, FORMAT, project);
};
// peristiwa suara
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  ev.push({ t: J1.t, type: 'card' }, { t: J2.t, type: 'card' });
  FORMAT.langkah.items.forEach(it => ev.push({ t: it.t, type: 'card' }));
  ev.push({ t: 0, type: 'api', dur: tFlameOut }, { t: tFlameOut - 0.5, type: 'desis', dur: 0.5 });
  ev.push({ t: T(1, 'ngecek'), type: 'gelap' }, { t: T(1, 'api'), type: 'nyala' });
  ev.push({ t: T(2, 'putar') + 0.3, type: 'twist' }, { t: T(2, 'mati'), type: 'klikTombol' });
  ev.push({ t: T(3, 'pengunci'), type: 'twist' }, { t: tLift, type: 'whoosh' }, { t: tOut, type: 'whoosh' }, { t: tIn0, type: 'whoosh' }, { t: tIn1 - 0.05, type: 'hit' });
  ev.push({ t: tCap, type: 'clickOut' }, { t: L[5].s - 0.3, type: 'whoosh' }, { t: L[5].e + 0.1, type: 'whoosh' });
  ev.push({ t: T(6, 'tekan'), type: 'whoosh' }, { t: T(6, 'putar'), type: 'twist' }, { t: tKlik, type: 'clickIn' }, { t: tKlik + 0.02, type: 'cekrek' }, { t: tKlik + 0.3, type: 'desis', dur: 0.4 });
  ev.push({ t: T(7, 'oles'), type: 'rub' }, { t: T(7, 'oles') + 0.25, type: 'rub' }, { t: T(7, 'ada'), type: 'sprinkle' });
  ev.push({ t: T(8, 'baru'), type: 'klikTombol' });
  for (let k = 0; k < 3; k++) ev.push({ t: T(8, 'nyalakan') + k * 0.14, type: 'cetek' });
  ev.push({ t: tIgnite, type: 'nyala' }, { t: tIgnite + 0.1, type: 'api', dur: DUR - tIgnite - 0.2 });
  ev.push({ t: T(9, 'rebahkan'), type: 'hit' }, { t: T(9, 'retak'), type: 'crack' }, { t: L[10].s, type: 'whoosh' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera, MK };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', T(0, 'ganti')); cue('act1', LN(1).s); cue('danger', T(1, 'ngecek')); cue('drop', LN(2).s - 0.05); cue('build', LN(2).s + 1.0);
  cue('reveal', LN(6).s - 0.1); cue('warm', LN(8).s); cue('dark', LN(9).s); cue('resolve', LN(10).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(RG.localToWorld(V(36, 20, 42)).toArray());
