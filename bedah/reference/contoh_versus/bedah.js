// Video "LED vs pijar" (format Perbandingan A vs B): lampu LED 9 W vs lampu pijar bening 60 W, sama-sama ±800 lumen.
// Ukuran: tagihan sebulan, panas terbuang, umur. Satu model per waktu: nyala lampu, LED dibelah, kawat membara, panas.
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


// ---------- dunia (mm): dinding x = 0, permukaan meja y = 0, sumbu z mendatar (+z = kiri layar) ----------
// Format Perbandingan A vs B: lampu LED 9 W (A, kiri) vs lampu pijar bening 60 W (B, kanan), sama-sama ±800 lumen.
const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const celA = (pal, alpha) => { const m = cel(pal); m.transparent = true; m.depthWrite = false; m.uniforms.al.value = alpha; return m; };
Object.assign(PAL, {
  dome: ['#fdfdfb', '#eeede8', '#cfcdc6'], cutDome: flat('#f6f3ea'), neck: ['#f2f2ef', '#d9d9d4', '#b1b0aa'], cutNeck: flat('#e6e2d8'),
  shell: ['#eef0f3', '#b9bec6', '#7f8590'], cutShell: flat('#d3d6db'), blackG: ['#4a4d57', '#2c2e36', '#16171b'], tip: ['#f1c75e', '#d6a136', '#a87a22'],
  glassB: ['#f8fbfb', '#eaf1f1', '#ffffd2'], glassF: ['#ffffff', '#eaf3f9', '#cfe0ec'], stem: ['#e3f1f4', '#c4dde3', '#9dbcc4'],
  fil: ['#d9d4c8', '#a8a39a', '#6d6a66'], hotW: ['#fffdf0', '#fff1b8', '#ffd36b'], hotO: ['#ffd27a', '#ff9a3c', '#d9601e'],
  wireN: ['#e7e9ec', '#b8bcc3', '#80858e'], alu: ['#e4e7eb', '#bcc2ca', '#8c939d'], chipW: ['#fbfbf8', '#e8e8e2', '#c6c6be'], phos: ['#ffe680', '#f5cf3a', '#d8a910'],
  ledOn: ['#ffffff', '#f4f8ff', '#dfe9ff'], pcbG: ['#6cc49a', '#2f8a5f', '#1f6542'], capB: ['#5a7bd1', '#3a5bb0', '#26407e'],
  holder: ['#fbfaf6', '#e6e3db', '#c2beb3'], screw: ['#e9eaee', '#b5b9c1', '#7f848d'], cable: ['#fbfbf8', '#e4e3dd', '#bdbbb2'],
  egg: ['#fdf1e1', '#f0d8b6', '#d6b28a'], tray: ['#d9d2c4', '#bdb4a3', '#958b78'], trayIn: ['#c9c1b1', '#ada493', '#857b69'],
});
Object.assign(GLOSS, { dome: 0.35, neck: 0.3, shell: 0.85, glassB: 0.9, glassF: 0.95, stem: 0.8, fil: 0.7, alu: 0.7, chipW: 0.4, holder: 0.4, egg: 0.25, wood: 0.18, blackG: 0.7 });
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
const ZA = 88, ZB = -88, XB = 175, Y0 = 13;      // lampu A (LED) di z = +88 (kiri layar), B (pijar) di z = −88; ujung fitting y = 13

// --- belahan benda putar: poligon tertutup (r, y) diputar; belakang (x ≤ 0) tetap, depan (x ≥ 0) bisa dibuka ---
const lathePoly = (poly, mat, phi0, len, seg = 48) => mesh(new THREE.LatheGeometry(poly.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)), seg, phi0, len), mat);
function cutFace(poly, mat, x = 0.02) {          // muka potong di bidang x = 0 (dua sisi sumbu: z = +r dan z = −r)
  const g = new THREE.Group();
  for (const sg of [1, -1]) {
    const sh = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([r, y]) => new THREE.Vector2(r, y))), 8);
    const pa = sh.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { const r = pa[i], y = pa[i + 1]; pa[i] = x; pa[i + 1] = y; pa[i + 2] = sg * r; }
    sh.computeVertexNormals(); const nn = sh.attributes.normal.array; for (let i = 0; i < nn.length; i += 3) { nn[i] = 1; nn[i + 1] = 0; nn[i + 2] = 0; }
    g.add(new THREE.Mesh(sh, mat));
  }
  return g;
}
// bagian putar: belakang + muka potong ke grup `back`, depan ke grup `front`; tanpa potong (penuh) kalau front null
function revolve(poly, pal, cutPal, back, front) {
  const m = typeof pal === 'string' ? cel(pal) : pal;
  if (!front) { back.add(lathePoly(poly, m, 0, Math.PI * 2)); return m; }
  back.add(lathePoly(poly, m, Math.PI, Math.PI));
  front.add(lathePoly(poly, m, 0, Math.PI));
  if (cutPal) back.add(cutFace(poly, cel(cutPal)));
  return m;
}
const ring = (outer, th) => [...outer, ...outer.slice().reverse().map(([r, y]) => [r - th, y])];   // dinding tipis dari profil luar

// --- fitting duduk (fitting plafon/tempel) putih: alas bulat Ø76, leher Ø47, sekrup pengikat di alas, kabel keluar belakang ---
const HOLDER = [[0, 0], [36, 0], [38, 2.5], [37.6, 8], [33, 11.5], [24.6, 13], [23.6, 33], [22, 35.5], [15, 35.5], [14.4, 34], [14.4, 14], [0, 14]];
// --- fitting ulir E27 (sama di dua lampu): kontak kuningan, isolator kaca hitam, selongsong ulir aluminium 7 gang ---
const TIP = [[0, 0], [4.6, 0], [5.2, 1.2], [5.4, 2.6], [0, 2.6]];
const INSUL = [[0, 2.4], [6.5, 2.4], [9.5, 3.4], [12.2, 6.2], [12.6, 8.4], [0, 8.4]];
const SHELL = (() => { const o = []; for (let y = 8; y <= 30.01; y += 0.4) o.push([13.05 + 0.85 * Math.sin(Math.PI * 2 * (y - 8) / 3.6 - 1.2) * smooth(8, 9.5, y) * (1 - smooth(28, 30, y)), y]); return ring(o, 0.45); })();
function e27(back, front) {
  revolve(TIP, 'tip', 'tip', back, front); revolve(INSUL, 'blackG', 'blackG', back, front); revolve(SHELL, 'shell', 'cutShell', back, front);
}

// ===== A. Lampu LED A60 9 W (bentuk dari foto produk: kubah susu putih buram Ø60, leher plastik putih doff yang melebar ke atas,
//       sambungan kubah-leher terlihat, ulir E27 aluminium, isolator hitam + kontak kuningan; tinggi ±110 mm.
//       Isi (foto lampu LED dibongkar): papan bundar aluminium berisi 14 chip LED SMD 2835 (badan putih, fosfor kuning) melingkar,
//       driver = papan hijau tegak di dalam leher (kapasitor elko, IC, dioda jembatan), dua kabel ke papan LED dan ke ulir.) =====
const ledG = new THREE.Group(); ledG.position.set(XB, Y0, ZA); lt.add(ledG);
const ledBack = new THREE.Group(), ledFront = new THREE.Group(); ledG.add(ledBack, ledFront);
e27(ledBack, ledFront);
const NECK = ring([[13.4, 28.5], [14.4, 30.5], [15.1, 36], [16.4, 44], [19.4, 52], [23.4, 59], [26.4, 63.6], [27.5, 66.6], [27.6, 67.6]], 1.6);
const neckMat = revolve(NECK, 'neck', 'cutNeck', ledBack, ledFront);
const DOME = (() => { const o = []; for (let a = -0.45; a <= Math.PI / 2 + 1e-6; a += 0.06) o.push([30 * Math.cos(a) * (a < 0 ? 0.92 + 0.08 * (1 + a / 0.45) : 1), 80 + 30 * Math.sin(a)]); o[o.length - 1][0] = 0; return [[27.2, 66.8], ...o]; })();
const domePoly = [...DOME, ...DOME.slice().reverse().map(([r, y]) => [Math.max(r - 1.3, 0), y - (r < 1 ? 1.3 : 0)])];
const domeMat = revolve(domePoly, 'dome', 'cutDome', ledBack, ledFront);
ledBack.add(mesh(new THREE.TorusGeometry(27.3, 0.5, 6, 48, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI), cel('neck'), 0, 66.8, 0));   // garis sambungan
// papan LED bundar (aluminium) + 14 chip
const ledBoard = new THREE.Group(); ledG.add(ledBoard);
ledBoard.add(mesh(new THREE.CylinderGeometry(25.6, 25.6, 1.6, 48), cel('alu'), 0, 65.6, 0));
const chipMats = [];
const CHIPS = [...Array.from({ length: 10 }, (_, k) => [18.5, k * Math.PI * 2 / 10]), ...Array.from({ length: 4 }, (_, k) => [8.5, Math.PI / 4 + k * Math.PI / 2])];
CHIPS.forEach(([r, a]) => {
  const g = new THREE.Group(); g.position.set(r * Math.sin(a), 66.4, r * Math.cos(a)); g.rotation.y = a; ledBoard.add(g);
  g.add(box(-1.75, 1.75, 0, 0.9, -1.4, 1.4, cel('chipW')));
  const pm = cel('phos'); chipMats.push(pm); g.add(box(-1.2, 1.2, 0.9, 1.05, -0.95, 0.95, pm));
});
// driver: papan hijau tegak di dalam leher (bidang z–y, menghadap kamera) + komponen
const driver = new THREE.Group(); ledG.add(driver);
driver.add(box(-3.4, -1.8, 30.5, 61, -10.2, 10.2, cel('pcbG')));
driver.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 11, 20), cel('capB'), 2.0, 47, 4.5), mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.4, 20), cel('alu'), 2.0, 52.7, 4.5));   // elko
driver.add(box(-1.8, 0.2, 49, 54, -8, -3, cel('blackG')), box(-1.8, -0.4, 38, 42, -7, -2, cel('blackG')));     // IC + dioda jembatan
driver.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 6, 10).rotateX(Math.PI / 2), cel('egg'), -0.6, 35, 0));    // resistor
driver.add(tube([[-1, 61, 6], [-1, 63.5, 9], [-0.5, 64.8, 11]], 0.45, cel('red')), tube([[-1, 61, -6], [-1, 63.5, -9], [-0.5, 64.8, -11]], 0.45, cel('dark')));
driver.add(tube([[-2.5, 30.5, 3], [-2, 18, 4], [-1, 8.2, 11.6]], 0.45, cel('red')), tube([[-2.5, 30.5, -3], [-2, 14, -2], [0, 2.6, 0]], 0.45, cel('dark')));

// ===== B. Lampu pijar bening A60 60 W (bentuk dari foto: bola kaca bening berleher, batang kaca (stem) di tengah, dua kawat
//       penghantar melebar ke atas, kawat pijar tungsten terpilin menggantung di antara 2 kawat penyangga dari kancing kaca,
//       ulir E27 sama; tinggi ±105 mm, Ø60). Kaca: belakang opak pucat + depan tembus tipis (kanvas transparan). =====
const pjG = new THREE.Group(); pjG.position.set(XB, Y0, ZB); lt.add(pjG);
const pjBack = new THREE.Group(); pjG.add(pjBack);
e27(pjBack, null);
const GLASS = (() => { const o = [[12.9, 28.5], [13.3, 33], [14.6, 40], [17.6, 48], [21.6, 55], [25.3, 62]]; for (let y = 68; y <= 112; y += 1.5) o.push([Math.sqrt(Math.max(0, 900 - (y - 82) ** 2)), y]); o.push([0, 112]); return o; })();
const glassBack = lathePoly(GLASS, cel('glassB'), Math.PI, Math.PI, 48); pjBack.add(glassBack);
const glassFrontMat = celA('glassF', 0.16);
const glassFront = lathePoly(GLASS, glassFrontMat, 0, Math.PI, 48); glassFront.renderOrder = 5; pjG.add(glassFront);
const STEM = [[0, 26], [8.4, 26], [8.6, 30], [7, 34], [4.4, 40], [2.6, 48], [2.1, 56], [2.1, 69], [3.4, 69.8], [3.4, 71.4], [0, 72]];
pjG.add(lathePoly(STEM, cel('stem'), 0, Math.PI * 2, 28));
const FIL_A = [0, 80, 12.5], FIL_B = [0, 80, -12.5];
const wireM = cel('wireN');
pjG.add(tube([[0, 44, 1.6], [0, 60, 2.4], [0, 70, 7], [0, 80, 12.5]], 0.42, wireM), tube([[0, 44, -1.6], [0, 60, -2.4], [0, 70, -7], [0, 80, -12.5]], 0.42, wireM));   // kawat penghantar
pjG.add(tube([[0, 71, 1.2], [0, 79, 4.5], [0, 86.3, 5.6]], 0.3, wireM), tube([[0, 71, -1.2], [0, 79, -4.5], [0, 86.3, -5.6]], 0.3, wireM));                      // kawat penyangga
const filPath = new THREE.CatmullRomCurve3([V(...FIL_A), V(0, 84, 9), V(0, 86.6, 5.6), V(0, 87.4, 0), V(0, 86.6, -5.6), V(0, 84, -9), V(...FIL_B)]);
class Coil extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) {
  const p = filPath.getPointAt(u), tn = filPath.getTangentAt(u), n1 = V(1, 0, 0), n2 = new THREE.Vector3().crossVectors(tn, n1).normalize(), a = u * Math.PI * 2 * 46;
  return o.copy(p).addScaledVector(n1, Math.cos(a) * 0.75).addScaledVector(n2, Math.sin(a) * 0.75); } }
const filMat = cel('fil');
pjG.add(mesh(new THREE.TubeGeometry(new Coil(), 900, 0.24, 6), filMat));

// fitting + kabel + bayangan kontak
const holderMat = cel('holder');
for (const z of [ZA, ZB]) {
  lt.add(mesh(new THREE.LatheGeometry(HOLDER.map(([r, y]) => new THREE.Vector2(r, y)), 56), holderMat, XB, 0, z));
  for (const s of [-1, 1]) lt.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 14), cel('screw'), XB + s * 21, 11.4, z + s * 21));
}
// meja kayu menempel di dinding
const TOPX = 400;
lt.add(rbox(4, TOPX, -28, 0, -700, 700, 4, cel('wood')), box(TOPX - 30, TOPX - 14, -120, -28, -680, 680, cel('wood')));
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.5)'); g.addColorStop(.55, 'rgba(34,30,66,.22)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.userData.tembus = true; m.position.set(x, y, z); lt.add(m); return m; };
blob(XB + 8, 0.4, ZA - 8, 58, 54); blob(XB + 8, 0.4, ZB - 8, 58, 54);
// telur di nampan (penetas sederhana), muncul di babak "menghangatkan"
const eggG = new THREE.Group(); eggG.position.set(XB + 40, 0, ZB - 102); lt.add(eggG);
eggG.add(rbox(-50, 50, 0, 14, -50, 50, 5, cel('tray')));
for (const [x, z] of [[-23, -23], [23, -23], [-23, 23], [23, 23]]) eggG.add(mesh(new THREE.CylinderGeometry(17, 13, 6, 24), cel('trayIn'), x, 12, z));
const EGG = Array.from({ length: 21 }, (_, i) => { const u = i / 20, y = 54 * u, k = (y - 24) / 30; return [i === 0 || i === 20 ? 0 : 21 * Math.sqrt(Math.max(0, 1 - k * k)) * (1 - 0.1 * (u - 0.4)), y - 24]; });
const eggPos = [[-23, -23], [23, -23], [-23, 23], [23, 23]];
const eggs = eggPos.map(([x, z], i) => { const e = mesh(new THREE.LatheGeometry(EGG.map(([r, y]) => new THREE.Vector2(r * 0.9, y * 0.95)), 32), cel('egg'), x, 33, z); e.rotation.z = (i % 2 ? 0.08 : -0.06); eggG.add(e); return e; });
const eggBlob = blob(XB + 46, 0.5, ZB - 108, 66, 66);

// titik penanda
const mk = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const MK = {
  ledTop: mk(ledG, 0, 112, 0), pjTop: mk(pjG, 0, 113, 0), dome: mk(ledG, -10, 98, -20), chips: mk(ledG, 0, 67, -18.5), board: mk(ledG, 0, 65, 23),
  driver: mk(ledG, 2, 47, 8), neck: mk(ledG, 0, 40, -16), e27: mk(ledG, 0, 22, 14), fil: mk(pjG, 0, 87, 0), filL: mk(pjG, 0, 85, -8), glass: mk(pjG, 0, 100, -24),
  stem: mk(pjG, 0, 52, 3), supp: mk(pjG, 0, 79, 4.5), egg: mk(eggG, 0, 62, -30), pjMid: mk(pjG, 0, 80, 0), ledMid: mk(ledG, 0, 75, 0), ledSide: mk(ledG, 0, 74, -31), pjSide: mk(pjG, 0, 84, 31),
};

// ---------- angka (semua dihitung di sini; sumber di caption) ----------
const W_LED = 9, W_PJ = 60, LUMEN = 800;
const TARIF = 1444.70, JAM = 6, HARI = 30;                               // tarif R-1 1.300 VA, nyala 6 jam/hari
const kwh = w => w * JAM * HARI / 1000;                                  // LED 1,62 kWh · pijar 10,8 kWh
const RP_LED = kwh(W_LED) * TARIF, RP_PJ = kwh(W_PJ) * TARIF;          // ±Rp2.340 · ±Rp15.603
const PANAS_PJ = 0.90, PANAS_LED = 0.70;                                  // fraksi energi jadi panas (DOE/Energy Star: pijar ±90%; LED ±70%)
const HEAT_PJ = W_PJ * PANAS_PJ, HEAT_LED = W_LED * PANAS_LED;            // 54 W · 6,3 W
const UMUR_PJ = 1000, UMUR_LED = 15000;
const RASIO = W_PJ / W_LED;                                               // 6,7× (hampir 7)
const id = (v, d = 0) => (+v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const rp = v => 'Rp' + id(Math.round(v));

// ---------- jadwal (dikunci ke kata) ----------
// keadaan lampu: nyala A/B (0..1), ruang gelap, LED dibelah, pijar membara
const onA = [[0, 0], [0.25, 1], [L[1].e, 1], [L[2].s, 0], [T(4, 'chip') - 0.1, 0], [T(4, 'berpendar') - 0.3, 1], [L[9].s - 0.2, 1], [L[9].s + 0.3, 0.0], [L[10].s, 0], [T(10, 'terang'), 1]];
const onB = [[0, 0], [0.15, 1], [L[1].e, 1], [L[2].s, 0], [T(4, 'kawat') - 0.1, 0], [T(4, 'membara') + 0.4, 1], [L[10].e + 2, 1]];
const darkKeys = [[0, 0.8], [L[0].e - 0.6, 0.8], [L[1].s + 0.4, 0], [T(4, 'matikan'), 0], [T(4, 'ruangan') + 0.2, 0.85], [L[4].e + 0.3, 0.85], [L[5].s + 0.4, 0], [L[9].s, 0], [T(9, 'penetas') , 0.35], [L[9].e + 0.3, 0.35], [L[10].s + 0.3, 0]];
const openKeys = [[0, 0], [T(2, 'kubahnya') - 0.2, 0], [T(2, 'kubahnya') + 0.5, 1], [L[4].e + 0.2, 1], [L[5].s + 0.4, 0]];
const eggKeys = [[0, 0], [T(9, 'penetas') - 0.2, 0], [T(9, 'penetas') + 0.4, 1], [L[10].s + 0.2, 1], [L[10].s + 0.6, 0]];
const heatKeys = [[0, 0], [T(6, 'panas'), 0], [T(6, 'membuang') + 0.3, 1], [L[6].e + 0.4, 1], [L[7].s + 0.3, 0], [T(9, 'menghangatkan'), 0], [T(9, 'menghangatkan') + 0.5, 1], [L[9].e + 0.3, 1], [L[10].s + 0.5, 0.4]];

// kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x]
const WIDE = [0, 66, 470, 64, 12, 0.5, 0.70, 0, XB];
const BOTH = [0, 62, 590, 64, 12, 0.5, 0.77, 0, XB];        // bidikan papan skor: lampu di bawah kartu (kartu 480–950 px)
const camKeys = [
  [0, [ZB, 86, 150, 84, 8, 0.5, 0.56, 0, XB]], [T(0, 'lampu') - 0.1, [ZB, 84, 170, 82, 8, 0.5, 0.56, 0, XB]], [T(0, 'tapi'), [0, 70, 500, 64, 11, 0.5, 0.70, 0, XB]], [L[1].e, WIDE],
  [T(2, 'kiri') + 0.6, [ZA, 62, 215, 72, 24, 0.5, 0.62, 0, XB]], [L[2].e, [ZA, 64, 195, 74, 26, 0.5, 0.62, 0, XB]],
  [T(3, 'kanan') + 0.6, [ZB, 64, 190, 94, 14, 0.5, 0.62, 0, XB]], [L[3].e, [ZB, 70, 160, 94, 12, 0.5, 0.62, 0, XB]],
  [T(4, 'matikan') + 0.3, [0, 70, 470, 64, 16, 0.5, 0.74, 0, XB]], [L[4].e, [0, 70, 450, 64, 16, 0.5, 0.74, 0, XB]],
  [L[5].s + 0.5, BOTH], [L[7].e, [0, 62, 610, 64, 12, 0.5, 0.78, 0, XB]],
  [L[8].s + 0.5, WIDE], [L[8].e, WIDE],
  [T(9, 'menghangatkan') + 0.3, [ZB - 52, 58, 440, 74, 16, 0.5, 0.66, 0, XB + 20]], [L[9].e, [ZB - 52, 58, 420, 74, 16, 0.5, 0.66, 0, XB + 20]],
  [L[10].s + 0.6, [0, 70, 480, 64, 12, 0.5, 0.68, 0, XB]], [DUR, [0, 70, 520, 64, 12, 0.5, 0.68, 0, XB]],
];

// ---------- label, teks kinetik, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(2, 'kubahnya'), T(2, 'chipchip') - 0.05, 'Kubah buram', () => MK.dome, 'l');
tag(T(2, 'chipchip'), L[2].e + 0.3, `${CHIPS.length} chip LED`, () => MK.chips, 'r', 'hi');
tag(T(2, 'papan'), L[2].e + 0.3, 'Papan aluminium', () => MK.board, 'l');
tag(T(2, 'kubahnya') + 0.6, L[2].e + 0.3, 'Driver', () => MK.driver, 'l');
tag(T(3, 'kawat'), L[3].e + 0.3, 'Kawat tungsten', () => MK.fil, 'r', 'hi');
tag(T(3, 'digantung'), L[3].e + 0.3, 'Kawat penyangga', () => MK.supp, 'l');
tag(T(3, 'kaca'), L[3].e + 0.3, 'Bola kaca', () => MK.glass, 'r');
tag(T(4, 'chip'), L[4].e + 0.3, 'Berpendar', () => MK.chips, 'l', 'ok');
tag(T(5, 'nyala'), L[5].e + 0.3, `${id(kwh(W_LED), 2)} kWh`, () => MK.ledSide, 'r');
tag(T(5, 'nyala') + 0.2, L[5].e + 0.3, `${id(kwh(W_PJ), 1)} kWh`, () => MK.pjSide, 'l', 'warn');
tag(T(6, 'membuang'), L[6].e + 0.3, `${id(HEAT_PJ)} W panas`, () => MK.pjSide, 'l', 'warn');
tag(T(6, 'led'), L[6].e + 0.3, `±${id(HEAT_LED, 1)} W`, () => MK.ledSide, 'r');
tag(T(7, 'tahan'), L[7].e + 0.3, `±${id(UMUR_PJ)} jam`, () => MK.pjSide, 'l', 'warn');
tag(T(7, 'led'), L[7].e + 0.3, `±${id(UMUR_LED)} jam`, () => MK.ledSide, 'r', 'ok');
tag(T(9, 'penetas'), L[9].e + 0.3, 'Penetas telur', () => MK.egg, 'r', 'hi');
tag(T(10, 'terang'), DUR + 1, 'Terang: LED', () => MK.ledSide, 'r', 'ok');
tag(T(10, 'hangat'), DUR + 1, 'Hangat: pijar', () => MK.pjSide, 'l', 'warn');
const stampDefs = [
  [0.3, T(0, 'tapi') - 0.25, 'Sama terang', 520, ''],
  [T(0, '7'), L[0].e + 0.5, `${id(RASIO, 1)}× lipat`, 600, 'snd'],
  [T(4, 'lebih'), T(4, 'chip') - 0.2, '2.000 °C+', 420, ''],
  [T(8, 'iya'), L[8].e + 0.5, 'LED menang', 640, 'snd'],
  [T(9, 'juara'), L[9].e + 0.5, 'Pijar juara', 600, ''],
];
const VS = { t: L[1].s, e: L[7].e + 0.5,
  a: { nama: `LED ${W_LED} W`, titik: () => MK.ledTop, warna: '#3e6fd1' }, b: { nama: `Pijar ${W_PJ} W`, titik: () => MK.pjTop, warna: '#c06a2e' },
  ukuran: [
    { t: T(5, 'tagihan'), nama: 'Tagihan', nilaiA: Math.round(RP_LED), nilaiB: Math.round(RP_PJ), satuan: 'rupiah', makin: 'kecil' },
    { t: T(6, 'panas'), nama: 'Panas', nilaiA: +HEAT_LED.toFixed(1), nilaiB: HEAT_PJ, satuan: 'watt', makin: 'kecil' },
    { t: T(7, 'umur'), nama: 'Umur', nilaiA: UMUR_LED, nilaiB: UMUR_PJ, satuan: 'jam', makin: 'besar' },
  ] };
const FORMAT = { versus: VS };
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
const S = { a: 0, b: 0, dark: 0, open: 0, heat: 0, egg: 0, imp: 0 };
function updateModel(t) {
  S.a = track(onA, t); S.b = track(onB, t); S.dark = track(darkKeys, t); S.open = easeIO(track(openKeys, t)); S.heat = track(heatKeys, t); S.egg = track(eggKeys, t);
  S.imp = t >= T(0, '7') ? Math.exp(-(t - T(0, '7')) * 7) * 0.7 : 0;
  // LED dibelah: belahan depan bergeser ke kiri-depan (±60 mm), lalu disembunyikan saat sudah keluar
  ledFront.position.set(30 * S.open, 4 * S.open, 62 * S.open); ledFront.visible = S.open < 0.98;
  ledBoard.visible = driver.visible = S.open > 0.02;
  // LED menyala: kubah jadi putih terang (dari dalam), chip putih bercahaya
  domeMat.hl('ledOn', S.a * (1 - S.open) * 0.9);
  chipMats.forEach(m => m.hl('ledOn', S.a));
  // pijar: kawat dari abu-abu tungsten -> oranye -> putih kekuningan
  const fb = S.b; filMat.hl(fb < 0.5 ? 'hotO' : 'hotW', fb < 0.5 ? fb * 2 : 1);
  glassBack.material.hl('hotW', S.b * 0.35);
  eggs.forEach((e, i) => { const k = clamp(S.egg * 1.6 - i * 0.2); e.scale.setScalar(Math.max(0.001, backOut(k))); });
  for (let i = 0; i < 5; i++) eggG.children[i].scale.setScalar(Math.max(0.001, backOut(clamp(S.egg * 2)))); eggBlob.visible = S.egg > 0.05; eggG.visible = S.egg > 0.01;
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
  const az = clamp(c[3], 20, 170) * Math.PI / 180, el = c[4] * Math.PI / 180;
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 4000);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[5]) * w).addScaledVector(up, (c[6] - 0.07 - 0.5) * h);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  edge.mat.uniforms.dim.value = S.dark * 0.75;
  $('shake').style.transform = S.imp > 0.05 ? `translate(${(Math.sin(t * 71) * 6 * S.imp).toFixed(1)}px, 0)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: dinding biru-abu (benda putih kontras), saklar, bingkai, bayangan lampu di dinding ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
  <pattern id="plaster" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="120" height="120" fill="#bfcfd0"/><circle cx="20" cy="30" r="2" fill="#b5c6c8"/><circle cx="80" cy="70" r="1.6" fill="#b5c6c8"/><circle cx="50" cy="105" r="2.2" fill="#b8c9ca"/><circle cx="100" cy="15" r="1.4" fill="#b5c6c8"/></pattern>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#1a2233" stop-opacity="0"/><stop offset="1" stop-color="#1a2233" stop-opacity=".32"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#1d2232"/><stop offset="1" stop-color="#090b11"/></radialGradient>
  <radialGradient id="wallWarm"><stop offset="0" stop-color="#ffd88a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd88a" stop-opacity="0"/></radialGradient>
  <radialGradient id="wallCool"><stop offset="0" stop-color="#f4f8ff" stop-opacity=".7"/><stop offset="1" stop-color="#f4f8ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#bfcfd0"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>
  <g id="wallLight"></g>`;
const f1 = v => v.toFixed(1);
const planeM = (o, u, v) => {
  const O = project(o), U = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const WALL = () => planeM([0, 0, 0], [0, 0, -1], [0, -1, 0]);     // bidang dinding: (a, b) = (−z, −y)
function updateBg(t) {
  const zoom = 520 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.1) * 2.2, 0, 9).toFixed(2));
  let s = `<g transform="${WALL()}">
    <rect x="-1400" y="-1400" width="2800" height="1700" fill="url(#plaster)"/>
    <rect x="-1400" y="0" width="2800" height="400" fill="#9fb1b4"/>
    <rect x="-1400" y="0" width="2800" height="60" fill="#2a2440" opacity=".18" filter="url(#soft)"/>
    <rect x="${-ZA - 80}" y="-230" width="160" height="200" rx="40" fill="#2a2440" opacity=".16" filter="url(#soft)"/>
    <rect x="${-ZB - 70}" y="-230" width="160" height="200" rx="40" fill="#2a2440" opacity=".16" filter="url(#soft)"/>
    <g transform="translate(420 -330)"><rect x="-6" y="-6" width="96" height="140" rx="10" fill="#2a2440" opacity=".18" filter="url(#soft)"/>
      <rect x="-36" y="-56" width="72" height="112" rx="10" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="5"/><rect x="-22" y="-40" width="44" height="80" rx="6" fill="#eeeae1" stroke="#1b1a1f" stroke-width="3"/><rect x="-14" y="-30" width="28" height="30" rx="4" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="3"/></g>
    <g transform="translate(-330 -420)"><rect x="-120" y="-150" width="240" height="300" fill="#6f5b45" stroke="#1b1a1f" stroke-width="6"/><rect x="-100" y="-130" width="200" height="260" fill="#efe6d6"/>
      <path d="M-100 130l70 -110 50 60 40 -40 40 90Z" fill="#7fae8a"/><circle cx="40" cy="-60" r="24" fill="#e3bf62"/></g>
  </g>`;
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.93 * S.dark).toFixed(3));
  // cahaya lampu di dinding (di atas lapisan gelap): hangat dari pijar, putih sejuk dari LED
  const pxmm = H / CAM[2];
  const wa = project([0, Y0 + 85, ZA]), wb = project([0, Y0 + 85, ZB]);
  $('wallLight').innerHTML = `<circle cx="${f1(wb[0])}" cy="${f1(wb[1])}" r="${f1(260 * pxmm)}" fill="url(#wallWarm)" opacity="${(S.b * (0.25 + 0.6 * S.dark)).toFixed(3)}"/>` +
    `<circle cx="${f1(wa[0])}" cy="${f1(wa[1])}" r="${f1(240 * pxmm)}" fill="url(#wallCool)" opacity="${(S.a * (0.2 + 0.55 * S.dark)).toFixed(3)}"/>`;
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
    if (si >= 0) stp.style.top = stampDefs[si][3] + 'px';
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

// efek: cahaya kubah LED, kawat membara, chip berpendar, gelombang panas
function updateFx(t) {
  let s = `<defs><radialGradient id="gW"><stop offset="0" stop-color="#fffbe8" stop-opacity=".95"/><stop offset=".3" stop-color="#ffd27a" stop-opacity=".6"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
    <radialGradient id="gC"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".35" stop-color="#e6efff" stop-opacity=".5"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="hot"><stop offset="0" stop-color="#ff7a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a3c" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = H / CAM[2], night = 0.35 + 0.65 * S.dark;
  // pijar: cahaya di kawat (paling terang saat gelap)
  if (S.b > 0.01) { const c = project(MK.fil), fl = 1 + 0.03 * Math.sin(t * 37);
    s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(70 * pxmm * fl)}" fill="url(#gW)" opacity="${(S.b * night).toFixed(3)}"/>` +
      `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(16 * pxmm)}" fill="url(#gW)" opacity="${(S.b * 0.8).toFixed(3)}"/>`; }
  // LED: tertutup -> kubah bercahaya; terbuka -> tiap chip bercahaya kecil
  if (S.a > 0.01) {
    if (S.open < 0.5) { const c = project([XB, Y0 + 84, ZA]); s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(62 * pxmm)}" fill="url(#gC)" opacity="${(S.a * night * 0.9).toFixed(3)}"/>`; }
    else CHIPS.forEach(([r, a]) => { const c = project([XB + r * Math.sin(a), Y0 + 67.5, ZA + r * Math.cos(a)]); s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(13 * pxmm)}" fill="url(#gC)" opacity="${S.a.toFixed(3)}"/>`; });
    if (S.open >= 0.5) { const c = project([XB, Y0 + 70, ZA]); s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(48 * pxmm)}" fill="url(#gC)" opacity="${(S.a * night * 0.8).toFixed(3)}"/>`; }
  }
  // gelombang panas naik dari pijar (besar) dan LED (kecil)
  if (S.heat > 0.02) {
    const src = [[ZB, 1, 5], [ZA, 0.25, 2]];
    for (const [z, k, n] of src) {
      const c = project([XB, Y0 + 115, z]);
      if (k > 0.5) s += `<circle cx="${f1(c[0])}" cy="${f1(c[1] + 40 * pxmm)}" r="${f1(70 * pxmm)}" fill="url(#hot)" opacity="${(S.heat * 0.9).toFixed(2)}"/>`;
      for (let j = 0; j < n; j++) {
        const ph = (t * 0.7 + j / n) % 1, x0 = c[0] + (j - (n - 1) / 2) * 13 * pxmm, y0 = c[1] - ph * 70 * pxmm, a = Math.sin(Math.PI * ph) * S.heat * (0.4 + 0.6 * k);
        s += `<path d="M${f1(x0)} ${f1(y0)} q${f1(6 * pxmm)} ${f1(-7 * pxmm)} 0 ${f1(-14 * pxmm)} t0 ${f1(-14 * pxmm)}" fill="none" stroke="${k > 0.5 ? '#ff7a3c' : '#e3bf62'}" stroke-width="${f1(2.6 * pxmm * (0.5 + 0.5 * k))}" stroke-linecap="round" opacity="${a.toFixed(2)}"/>`;
      }
    }
  }
  $('dim').innerHTML = s;
}

// ---------- render ----------
const tembus = []; scene.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.tembus) tembus.push(o); });
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  const vis = tembus.map(o => o.visible); tembus.forEach(o => (o.visible = false));
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  tembus.forEach((o, i) => (o.visible = vis[i]));
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); FMT.gambar(t, FORMAT, project); };
// peristiwa suara
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  ev.push({ t: 0.12, type: 'klikTombol' }, { t: 0.15, type: 'nyala' }, { t: T(0, '7'), type: 'hit' });
  ev.push({ t: L[1].s, type: 'whoosh' }, { t: T(1, 'adu'), type: 'card' });
  ev.push({ t: T(2, 'kubahnya') - 0.1, type: 'whoosh' }, { t: T(3, 'kanan'), type: 'whoosh' });
  ev.push({ t: T(4, 'matikan') + 0.2, type: 'klikTombol' }, { t: T(4, 'ruangan'), type: 'gelap' }, { t: T(4, 'kawat') - 0.05, type: 'hum', dur: L[4].e - T(4, 'kawat') });
  ev.push({ t: T(4, 'berpendar') - 0.3, type: 'chime' }, { t: L[5].s + 0.2, type: 'klikTombol' });
  for (const m of VS.ukuran) ev.push({ t: m.t, type: 'card' }, { t: m.t + 0.3, type: 'blip' });
  ev.push({ t: T(6, 'membuang'), type: 'desis', dur: 1.6 }, { t: T(8, 'iya'), type: 'hit' }, { t: T(9, 'penetas') , type: 'pop' }, { t: T(10, 'terang') - 0.1, type: 'klikTombol' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(4).s - 0.2); cue('drop', LN(5).s - 0.05); cue('build', LN(5).s + 1.0);
  cue('reveal', LN(8).s - 0.1); cue('warm', LN(8).e); cue('dark', LN(9).s); cue('resolve', LN(10).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(MK.pjMid);
