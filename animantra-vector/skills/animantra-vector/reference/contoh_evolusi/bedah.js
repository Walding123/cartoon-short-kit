// Video "Evolusi telepon" (format Evolusi / Timeline): engkol & operator -> piringan putar -> tombol nada -> ponsel -> layar sentuh -> ?
// Satu meja di depan dinding, kamera meluncur kiri ke kanan; tiap era satu mekanisme kunci dihitung dari model per waktu.
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

// ======================= EVOLUSI TELEPON (format Evolusi / Timeline) =======================
// Satu meja kayu di depan dinding: telepon engkol di dinding (kiri) -> telepon putar -> telepon tombol -> ponsel -> ponsel layar sentuh -> "?".
// Kamera meluncur dari kiri ke kanan; tiap era dibongkar satu mekanisme kuncinya (magneto, pulsa, nada ganda, radio, kisi sentuh).
const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
Object.assign(PAL, {
  oak: ['#e3a868', '#c07f42', '#8f5628'], oakD: ['#c98c50', '#a3672f', '#74461c'], oakIn: flat('#e9c9a0'),
  brass: ['#f6d27a', '#d9a63c', '#a77a20'], black: ['#5a5d68', '#2e3038', '#16171c'], steel: ['#e6e8ec', '#b3b7bf', '#7b7f88'],
  magnet: ['#ff8a7a', '#d9423e', '#9e2a2c'], copper: ['#f5ae78', '#d9783f', '#a5521f'], wood2: ['#d9b07c', '#b98a52', '#8a6232'],
  plate: ['#fbfaf6', '#e9e6de', '#c8c3b6'], blue15: ['#a9d4ee', '#7fb5d9', '#5a8fb6'], kpad: ['#8c939e', '#6d737d', '#4f545c'],
  key: ['#fbfbf8', '#e4e4de', '#bdbdb5'], navy: ['#4d5f9e', '#34437a', '#222c55'], nokGrey: ['#d9dde3', '#aeb4bd', '#7f8691'],
  nokKey: ['#9ec0f0', '#6f97d6', '#4a6fae'], nokKey2: ['#e7eaee', '#c3c8cf', '#98a0aa'], lcdG: flat('#b5c99a'),
  alu: ['#eef0f3', '#c4c9d0', '#8c929b'], glassBk: ['#3a3e4a', '#22252d', '#121318'], wall2: ['#7f8b92', '#66717a', '#4b545c'],
  dock: flat('#3b4660'), wallpaper: flat('#1f3150'), stand: ['#7a6450', '#5e4a39', '#3f3126'], ped: ['#4a4f5c', '#33363f', '#1e2026'],
  i1: flat('#5fd38a'), i2: flat('#5ab0f0'), i3: flat('#f2c94c'), i4: flat('#f08a5d'), i5: flat('#b38df0'), i6: flat('#ef6b7b'), i7: flat('#e9edf2'), i8: flat('#7fd6c2'),
  glass2: ['#e8f6ff', '#cfe8f7', '#b1d2e8'], holo: ['#bfeaff', '#8fd3f5', '#5fb2dd'],
});
Object.assign(GLOSS, { black: 0.75, brass: 0.85, steel: 0.85, blue15: 0.5, navy: 0.5, nokGrey: 0.7, nokKey: 0.5, alu: 0.8, glassBk: 0.9, oak: 0.25, oakD: 0.25, magnet: 0.4, copper: 0.7, plate: 0.3, kpad: 0.3 });
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const lathe = (pts, mat, seg = 48) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat);
const glowM = hex => new THREE.MeshBasicMaterial({ color: hex });
const celA = (pal, alpha) => { const m = cel(pal); m.transparent = true; m.depthWrite = false; m.uniforms.al.value = alpha; return m; };
const ZY = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0));
// bentuk (z, y) diekstrusi sepanjang x dari x0 ke x1 (bevel opsional, bentuk luar = garis bentuk + bevel)
const prismZY = (shape, x0, x1, mat, b = 0) => mesh(new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.1, x1 - x0 - 2 * b), bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 24 }).applyMatrix4(ZY).translate(x1 - b, 0, 0), mat);
// bentuk (x, y) diekstrusi sepanjang z dari z0 ke z1 dengan bevel
const prismXYb = (shape, z0, z1, mat, b = 0) => mesh(new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.1, z1 - z0 - 2 * b), bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 24 }).translate(0, 0, z0 + b), mat);
const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
const ellS = (cx, cy, rx, ry) => { const s = new THREE.Shape(); s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0); return s; };
const rrS = (x0, x1, y0, y1, r) => { const s = new THREE.Shape(); s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s; };
const rrPath = (x0, x1, y0, y1, r) => { const p = new THREE.Path(); p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r); p.lineTo(x1, y1 - r);
  p.quadraticCurveTo(x1, y1, x1 - r, y1); p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0); return p; };

// ---------- dunia (mm): dinding x = 0, lantai y = 0, +z = kiri layar. Meja kayu di depan dinding. ----------
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
const TOP = 760;
lt.add(box(0, 540, TOP - 38, TOP, -1120, 900, cel('wood2')), box(500, 540, TOP - 110, TOP - 38, -1120, 900, cel('stand')));
[[-1100], [860]].forEach(([z]) => lt.add(box(470, 530, 0, TOP - 38, z - 30, z + 10, cel('stand'))));
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.55)'); g.addColorStop(.55, 'rgba(34,30,66,.24)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.position.set(x, y, z); lt.add(m); return m; };

// ===== 1. Telepon engkol dinding (magneto), ±1900 =====
// Ciri dari foto (oak wall telephone, Western Electric/Kellogg/Ericsson): papan belakang kayu; kotak atas kayu oak berpintu depan;
// dua gong bel kuningan bundar di atas pintu; corong bicara hitam di lengan yang menonjol di tengah; gagang dengar silinder hitam
// tergantung di kait sisi kiri; engkol logam + kenop kayu di sisi kanan; papan tulis miring di bawah kotak; kotak baterai panjang di bawah.
const WP = new THREE.Group(); lt.add(WP);
const oak = cel('oak'), oakD = cel('oakD'), blackM = cel('black'), brassM = cel('brass'), steelM = cel('steel');
WP.add(box(0, 14, 860, 1610, 520, 680, oakD));                                        // papan belakang
WP.add(box(14, 24, 1280, 1530, 485, 715, oak), box(14, 143, 1280, 1292, 485, 715, oak), box(14, 143, 1518, 1530, 485, 715, oak),
  box(14, 143, 1292, 1518, 485, 497, oak), box(14, 143, 1292, 1518, 703, 715, oak));   // kotak atas berongga
{ const s = new THREE.Shape(); s.moveTo(505, 1530); s.lineTo(695, 1530); s.lineTo(695, 1548); s.quadraticCurveTo(650, 1552, 630, 1570); s.quadraticCurveTo(600, 1592, 570, 1570);
  s.quadraticCurveTo(550, 1552, 505, 1548); s.closePath(); WP.add(prismZY(s, 14, 120, oakD, 2)); }                 // mahkota atas
WP.add(box(24, 26, 1292, 1518, 497, 703, cel('oakIn')));                                 // dinding dalam (terlihat saat pintu dibuka)
// magneto di dalam: 3 magnet tapal kuda, jangkar berkumparan, roda gigi besar di poros engkol
const MAG = { x: 70, y: 1365, ro: 46, ri: 28, xl: 128 };
const uShape = (() => { const s = new THREE.Shape(), { x, y, ro, ri, xl } = MAG; s.moveTo(xl, y + ro); s.lineTo(x, y + ro); s.absarc(x, y, ro, Math.PI / 2, Math.PI * 1.5, false);
  s.lineTo(xl, y - ro); s.lineTo(xl, y - ri); s.lineTo(x, y - ri); s.absarc(x, y, ri, Math.PI * 1.5, Math.PI / 2, true); s.lineTo(xl, y + ri); s.closePath(); return s; })();
const magM = cel('magnet'); const magnets = [];
[[548, 566], [572, 590], [596, 614]].forEach(([z0, z1]) => { const m = prismXYb(uShape, z0, z1, magM, 1.5); WP.add(m); magnets.push(m); });
const ARM = new THREE.Group(); ARM.position.set(100, MAG.y, 0); WP.add(ARM);           // jangkar berputar (sumbu z)
{ const cu = cel('copper'); ARM.add(mesh(new THREE.CylinderGeometry(16, 16, 80, 28).rotateX(Math.PI / 2), steelM, 0, 0, 582));
  ARM.add(mesh(new THREE.BoxGeometry(14, 34, 64), cu, 0, 0, 582));                     // kumparan melilit jangkar
  ARM.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 112, 12).rotateX(Math.PI / 2), steelM, 0, 0, 588)); }
const gearShape = (r, n, d) => { const s = new THREE.Shape(); for (let i = 0; i <= n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, rr = (i % 4 < 2) ? r : r - d;
  const px = Math.cos(a) * rr, py = Math.sin(a) * rr; i ? s.lineTo(px, py) : s.moveTo(px, py); } return s; };
const GEAR = new THREE.Group(); GEAR.position.set(100, 1452, 0); WP.add(GEAR);
{ const g = gearShape(62, 40, 5); g.holes.push(ellS(0, 0, 8, 8)); for (let k = 0; k < 5; k++) g.holes.push(ellS(Math.cos(k * 1.2566) * 36, Math.sin(k * 1.2566) * 36, 11, 11));
  GEAR.add(prismXYb(g, 630, 640, brassM)); GEAR.add(mesh(new THREE.CylinderGeometry(6, 6, 175, 14).rotateX(Math.PI / 2), steelM, 0, 0, 550)); }
const PIN = new THREE.Group(); PIN.position.set(100, MAG.y, 0); WP.add(PIN);
PIN.add(prismXYb(gearShape(25, 16, 4), 630, 640, brassM));
// pintu depan berengsel di sisi kiri (z = 715): gong bel, palu, corong bicara ikut di pintu
const DOOR = new THREE.Group(); DOOR.position.set(150, 0, 715); WP.add(DOOR);
const DI = new THREE.Group(); DI.position.set(-150, 0, -715); DOOR.add(DI);
DI.add(box(143, 152, 1282, 1528, 487, 713, oak), box(152, 155, 1300, 1420, 515, 685, oakD));
const bellG = []; [650, 550].forEach(z => { const b = lathe([[0, 0], [38, 0], [40, 6], [36, 16], [26, 24], [12, 27], [0, 28]], brassM); b.rotation.z = -Math.PI / 2; b.position.set(152, 1478, z); DI.add(b); bellG.push(b);
  DI.add(mesh(new THREE.CylinderGeometry(5, 5, 10, 12).rotateZ(Math.PI / 2), brassM, 182, 1478, z)); });
const HAM = new THREE.Group(); HAM.position.set(160, 1440, 600); DI.add(HAM);           // palu bel bergetar kiri-kanan
HAM.add(box(-2, 2, 0, 40, -2, 2, steelM), mesh(new THREE.SphereGeometry(7, 16, 12), steelM, 0, 42, 0));
DI.add(box(152, 175, 1355, 1385, 588, 612, blackM), box(175, 232, 1362, 1378, 593, 607, blackM));    // lengan corong
{ const h = lathe([[9, 0], [12, 10], [18, 26], [30, 40], [33, 44], [26, 44], [14, 34], [0, 34]], blackM); h.rotation.z = -Math.PI / 2; h.position.set(228, 1370, 600); DI.add(h); }
// engkol di sisi kanan (z < 485)
const CRANK = new THREE.Group(); CRANK.position.set(100, 1452, 466); WP.add(CRANK);
CRANK.add(mesh(new THREE.CylinderGeometry(9, 9, 22, 16).rotateX(Math.PI / 2), steelM, 0, 0, 8));
CRANK.add(rbox(-6, 80, -7, 7, -5, 3, 3, steelM));
{ const k = lathe([[0, 0], [9, 2], [11, 14], [9, 30], [0, 34]], cel('wood2')); k.rotation.x = -Math.PI / 2; k.position.set(76, 0, -3); CRANK.add(k); }
// gagang dengar tergantung di kait sisi kiri (z > 715)
WP.add(box(60, 72, 1468, 1478, 715, 760, steelM), box(60, 72, 1478, 1494, 752, 760, steelM));
const REC = lathe([[0, 0], [12, 0], [13, 6], [11, 18], [12, 100], [15, 116], [26, 128], [30, 136], [28, 142], [0, 142]], blackM); REC.position.set(66, 1328, 772); WP.add(REC);
WP.add(tube([[66, 1330, 772], [64, 1290, 775], [50, 1265, 760], [36, 1290, 722], [30, 1310, 716]], 3.2, cel('black')));
// papan tulis miring + siku, kotak baterai bawah
{ const s = shp([[14, 1262], [205, 1236], [208, 1250], [14, 1278]]); WP.add(prismXYb(s, 490, 710, oak, 2)); }
[505, 695].forEach(z => WP.add(prismXYb(shp([[14, 1262], [120, 1248], [14, 1200]]), z - 6, z + 6, oakD)));
WP.add(rbox(14, 124, 900, 1222, 500, 700, 4, oak), box(124, 128, 930, 1190, 525, 675, oakD));
WP.add(tube([[30, 1576, 640], [24, 1700, 640], [14, 1760, 700], [10, 1800, 1000], [10, 1830, 1400]], 3, cel('black')));     // kawat ke sentral
const WP_PT = { magnet: anchor(WP, 128, MAG.y + 52, 548), arm: anchor(WP, 112, MAG.y, 630), crank: anchor(CRANK, 76, 0, -36), bell: anchor(WP, 182, 1478, 650),
  rec: anchor(WP, 66, 1400, 790), wire: anchor(WP, 12, 1760, 760), top: anchor(WP, 120, 1600, 600) };
blob(70, TOP + 0.6, 600, 160, 150);

// ===== 2. Telepon putar meja (rotary), ±1930–1950 =====
// Ciri dari foto (telepon putar jadul hitam, tipe "500"): badan bakelit hitam lebar, muka depan miring tempat piringan; gagang di atas melintang
// kiri-kanan di dudukan bertanduk dua; gagang = dua mangkuk (dengar & bicara) dihubungkan pegangan melengkung; kabel spiral di sisi kiri;
// piringan perak dengan 10 lubang jari, angka putih di bawah lubang, kartu nomor di tengah, penahan jari logam di kanan bawah.
const deskPhone = (pal, prof, slope, zc) => {
  const G = new THREE.Group(); G.position.set(150, TOP, zc); lt.add(G);
  const m = cel(pal);
  G.add(prismXYb(shp(prof), -78, 78, m, 10));
  G.add(rbox(4, 226, 0, 6, -86, 86, 2.5, cel('black')));
  // tanduk dudukan gagang
  [-60, 60].forEach(z => { const s = new THREE.Shape(); s.moveTo(72, 100); s.lineTo(116, 100); s.lineTo(118, 140); s.quadraticCurveTo(116, 148, 108, 146); s.quadraticCurveTo(95, 128, 82, 146);
    s.quadraticCurveTo(72, 148, 70, 140); s.closePath(); G.add(prismXYb(s, z - 12, z + 12, m, 3)); });
  // gagang: mangkuk dengar (kanan, -z) + mangkuk bicara (kiri, +z) + pegangan melengkung
  const HS = new THREE.Group(); G.add(HS);
  [-92, 92].forEach(z => { const c = lathe([[0, 0], [24, 0], [31, 6], [33, 16], [26, 28], [14, 32], [0, 33]], m); c.position.set(96, 126, z); HS.add(c);
    HS.add(mesh(new THREE.CylinderGeometry(20, 20, 1, 24), cel('black'), 96, 125.6, z)); });
  HS.add(tube([[96, 160, -96], [96, 155, -62], [96, 151, -25], [96, 151, 25], [96, 155, 62], [96, 160, 96]], 14, m));
  // kabel spiral dari mangkuk bicara ke sisi kiri badan
  const cp = []; for (let i = 0; i <= 260; i++) { const s = i / 260, a = s * Math.PI * 2 * 16, base = [lerp(96, 40, s), lerp(124, 30, s) - Math.sin(s * Math.PI) * 30, lerp(110, 104, s) + Math.sin(s * Math.PI) * 30];
    cp.push([base[0] + Math.cos(a) * 6, base[1] + Math.sin(a) * 6, base[2]]); }
  G.add(tube(cp, 2.2, cel('black')));
  // muka miring: basis lokal (X ke kanan layar = -z, Y naik lereng, Z = normal)
  const [p0, p1] = slope, d = [p1[0] - p0[0], p1[1] - p0[1]], len = Math.hypot(...d), u = [d[0] / len, d[1] / len], n = [-u[1], u[0]].map(v => -v);
  const nn = n[0] < 0 ? n.map(v => -v) : n;
  const F = new THREE.Group(); F.matrixAutoUpdate = false;
  const c = [(p0[0] + p1[0]) / 2 + nn[0] * 12.5, (p0[1] + p1[1]) / 2 + nn[1] * 12.5];
  F.matrix.makeBasis(V(0, 0, -1), V(u[0], u[1], 0), V(nn[0], nn[1], 0)).setPosition(c[0], c[1], 0); G.add(F);
  return { G, F, HS, m };
};
const ROT = deskPhone('black', [[8, 10], [214, 10], [216, 14], [178, 104], [160, 112], [44, 116], [16, 104], [6, 64], [6, 14]], [[216, 14], [178, 104]], 200);
// piringan
const DIAL = { R: 44, rh: 31, hole: 7.6, stop: -58 };
const travel = d => 35 + 29 * d;                                     // derajat putaran untuk angka d (1..10, "0" = 10)
const holeAng = d => DIAL.stop + travel(d);
const dialTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), k = 256 / DIAL.R;
  x.fillStyle = '#f3f1ea'; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill(); x.strokeStyle = '#1b1a1f'; x.lineWidth = 6; x.stroke();
  x.fillStyle = '#1b1a1f'; x.font = 'bold 58px Helvetica'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let d = 1; d <= 10; d++) { const a = holeAng(d) * Math.PI / 180; x.fillText(d % 10, 256 + Math.cos(a) * DIAL.rh * k, 256 - Math.sin(a) * DIAL.rh * k); }
  return new THREE.CanvasTexture(c); })();
const cardTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fbf8ef'; x.beginPath(); x.arc(128, 128, 128, 0, 7); x.fill(); x.strokeStyle = '#9b2c3f'; x.lineWidth = 8; x.beginPath(); x.moveTo(40, 128); x.lineTo(216, 128); x.stroke();
  x.fillStyle = '#1b1a1f'; x.font = 'bold 40px Helvetica'; x.textAlign = 'center'; x.fillText('2 4 6 8', 128, 108); x.font = '30px Helvetica'; x.fillText('LOKAL', 128, 168); return new THREE.CanvasTexture(c); })();
ROT.F.add(mesh(new THREE.CircleGeometry(DIAL.R + 3, 64), cel('steel'), 0, 0, -0.6));
ROT.F.add(mesh(new THREE.CircleGeometry(DIAL.R, 64), new THREE.MeshBasicMaterial({ map: dialTex }), 0, 0, 0.2));
const WHEEL = new THREE.Group(); ROT.F.add(WHEEL);
{ const s = ellS(0, 0, DIAL.R - 2, DIAL.R - 2); for (let d = 1; d <= 10; d++) { const a = holeAng(d) * Math.PI / 180; s.holes.push(ellS(Math.cos(a) * DIAL.rh, Math.sin(a) * DIAL.rh, DIAL.hole, DIAL.hole)); }
  s.holes.push(ellS(0, 0, 13, 13)); WHEEL.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 2, curveSegments: 40 }), cel('steel'), 0, 0, 1)); }
ROT.F.add(mesh(new THREE.CylinderGeometry(13.5, 13.5, 1.5, 40).rotateX(Math.PI / 2), cel('steel'), 0, 0, 4.4));
ROT.F.add(mesh(new THREE.CircleGeometry(12, 40), new THREE.MeshBasicMaterial({ map: cardTex }), 0, 0, 5.3));
{ const a = DIAL.stop * Math.PI / 180, s = new THREE.Shape(); s.moveTo(-2.5, 0); s.lineTo(2.5, 0); s.lineTo(2, 15); s.quadraticCurveTo(0, 18, -2, 15); s.closePath();
  const st = mesh(new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: false }), cel('steel'), Math.cos(a) * 33, Math.sin(a) * 33, 3.5); st.rotation.z = a - Math.PI / 2; ROT.F.add(st); }
const ROT_PT = { stop: anchor(ROT.F, Math.cos(DIAL.stop * Math.PI / 180) * 44, Math.sin(DIAL.stop * Math.PI / 180) * 44, 6), dial: anchor(ROT.F, 0, 0, 5), hs: anchor(ROT.G, 96, 170, 0) };
blob(260, TOP + 0.6, 200, 150, 140);

// ===== 3. Telepon tombol (Touch-Tone, 1963) =====
// Ciri dari foto (model 1500, 1963): badan lebih kotak, warna pastel (biru muda), muka miring dengan pelat papan tombol abu-abu persegi,
// 10 tombol putih 4 baris × 3 (baris bawah hanya "0", posisi * dan # masih kosong), gagang + dudukan bertanduk seperti telepon putar.
const PB = deskPhone('blue15', [[8, 10], [222, 10], [226, 16], [190, 100], [176, 108], [44, 112], [16, 100], [6, 60], [6, 14]], [[226, 16], [190, 100]], -200);
PB.F.add(rrBox(PB.F));
function rrBox(F) { const g = new THREE.Group(); g.add(prismPlate(rrS(-30, 30, -40, 40, 6), 0, 2.5, cel('kpad'))); return g; }
function prismPlate(s, z0, z1, m) { return mesh(new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8, bevelSegments: 2 }), m, 0, 0, z0); }
const KEYS = [];
const KEYPOS = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2], 7: [2, 0], 8: [2, 1], 9: [2, 2], 0: [3, 1] };
const kx = c => -17 + c * 17, ky = r => 27 - r * 18;
Object.entries(KEYPOS).forEach(([d, [r, c]]) => { const k = rbox(kx(c) - 6.5, kx(c) + 6.5, ky(r) - 5.5, ky(r) + 5.5, 2.5, 8, 2, cel('key')); PB.F.add(k); KEYS[d] = k; });
const LOW = [697, 770, 852, 941], HIGH = [1209, 1336, 1477];
const PB_PT = { k5: anchor(PB.F, kx(1), ky(1), 9), pad: anchor(PB.F, 30, 0, 4) };
blob(260, TOP + 0.6, -200, 150, 140);

// ===== 4. Ponsel batangan (±2000) =====
// Ciri dari foto (ponsel batangan legendaris 2000, 113 × 48 × 22 mm): siluet membulat atas-bawah dengan "pinggang" sedikit ramping,
// cangkang depan biru tua, bingkai layar abu-perak, layar monokrom hijau, tombol navigasi biru lonjong + tombol C kecil, 12 tombol abu
// lonjong 4 × 3 dengan baris melengkung "senyum", celah speaker di atas. Tanpa logo.
const NK = new THREE.Group(); NK.position.set(300, TOP + 4, -480); NK.rotation.z = 0.22; lt.add(NK);
lt.add(prismXYb(shp([[236, TOP], [298, TOP], [284, TOP + 62], [256, TOP + 62]]), -500, -460, cel('stand'), 2));
const nokOutline = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(14, 0, 23, 3, 23.5, 14); s.bezierCurveTo(24, 30, 21.5, 45, 21.5, 58); s.bezierCurveTo(21.5, 75, 24, 85, 24, 98);
  s.bezierCurveTo(24, 109, 15, 113, 0, 113); s.bezierCurveTo(-15, 113, -24, 109, -24, 98); s.bezierCurveTo(-24, 85, -21.5, 75, -21.5, 58); s.bezierCurveTo(-21.5, 45, -24, 30, -23.5, 14);
  s.bezierCurveTo(-23, 3, -14, 0, 0, 0); return s; })();
NK.add(prismZY(nokOutline, 0, 21, cel('navy'), 3));
{ const s = new THREE.Shape(); s.moveTo(-18, 104); s.lineTo(18, 104); s.quadraticCurveTo(21, 104, 21, 100); s.lineTo(20, 66); s.quadraticCurveTo(14, 60, 6, 61); s.quadraticCurveTo(0, 58, -6, 61);
  s.quadraticCurveTo(-14, 60, -20, 66); s.lineTo(-21, 100); s.quadraticCurveTo(-21, 104, -18, 104); NK.add(prismZY(s, 20.5, 22.2, cel('nokGrey'), 0.5)); }
NK.add(prismZY(rrS(-14.5, 14.5, 72, 97, 1.5), 22, 22.6, cel('lcdG')));
NK.add(prismZY(ellS(1, 54, 11, 5.2), 21, 24, cel('nokKey'), 1));
NK.add(prismZY(ellS(-15, 57, 4.2, 3.2), 21, 23.4, cel('nokKey'), 0.8));
const nkKeys = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const u = (c - 1) * 13.5, v = 42 - r * 9 + (c !== 1 ? 2.2 : 0); const k = prismZY(ellS(u, v, 5.6, 3.1), 20.5, 23.2, cel('nokKey2'), 0.7); NK.add(k); nkKeys.push(k); }
[-4.5, -1.5, 1.5, 4.5].forEach(u => NK.add(box(21.8, 22.6, 107.5, 109.5, u - 0.8, u + 0.8, cel('black'))));
const NK_PT = { ant: anchor(NK, 10, 112, 0), scr: anchor(NK, 23, 85, 0) };
blob(285, TOP + 0.6, -480, 70, 50);

// ===== 5. Ponsel layar sentuh (2007) =====
// Ciri dari foto (ponsel layar sentuh generasi pertama 2007, 115 × 61 × 11,6 mm): muka kaca hitam penuh dengan bingkai krom tipis,
// layar 3,5" berisi kisi ikon warna-warni 4 kolom + dok 4 ikon, satu tombol bulat di bawah layar, celah speaker di atas;
// punggung aluminium perak dengan pita hitam di bawah. Tanpa logo.
const IP = new THREE.Group(); IP.position.set(300, TOP + 4, -690); IP.rotation.z = 0.2; lt.add(IP);
lt.add(prismXYb(shp([[236, TOP], [298, TOP], [284, TOP + 62], [256, TOP + 62]]), -710, -670, cel('stand'), 2));
const ipOut = rrS(-30.5, 30.5, 0, 115, 9);
IP.add(prismZY(ipOut, 0, 8.5, cel('alu'), 1.5));
IP.add(prismZY(rrS(-30.5, 30.5, 0, 22, 9), -0.4, 3, cel('black'), 1));                    // pita hitam punggung bawah
IP.add(prismZY(rrS(-25.5, 25.5, 24, 101, 1), 8.4, 9.0, cel('wallpaper')));               // panel layar
const ICONS = new THREE.Group(); IP.add(ICONS);
const icP = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8'];
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) ICONS.add(prismZY(rrS(-4.3, 4.3, -4.3, 4.3, 2), 8.9, 9.4, cel(icP[(r * 4 + c * 3) % 8])).translateZ(-19 + c * 12.6).translateY(91 - r * 13));
ICONS.add(prismZY(rrS(-25, 25, 26, 37, 0.5), 8.9, 9.1, cel('dock')));
for (let c = 0; c < 4; c++) ICONS.add(prismZY(rrS(-4.3, 4.3, -4.3, 4.3, 2), 9.0, 9.5, cel(icP[(c * 5 + 2) % 8])).translateZ(-19 + c * 12.6).translateY(31.5));
// kisi elektroda sentuh (lapisan tengah) + kaca depan (bingkai hitam + panel tembus)
const GRID = new THREE.Group(); IP.add(GRID);
const gridMats = [];
const gCols = [-20, -10, 0, 10, 20], gRows = [32, 43, 54, 65, 76, 87, 98];
gCols.forEach(u => { const m = glowM(0x7fd6ff); gridMats.push({ m, type: 'c', u }); GRID.add(mesh(new THREE.BoxGeometry(0.4, 76, 0.7), m, 9.6, 62.5, u)); });
gRows.forEach(v => { const m = glowM(0x7fd6ff); gridMats.push({ m, type: 'r', v }); GRID.add(mesh(new THREE.BoxGeometry(0.4, 0.7, 50), m, 9.7, v, 0)); });
const GLASS = new THREE.Group(); IP.add(GLASS);
{ const s = rrS(-30, 30, 0.5, 114.5, 8.5); s.holes.push(rrPath(-25.5, 25.5, 24, 101, 1)); GLASS.add(prismZY(s, 9.0, 10.6, cel('glassBk'), 0.3));
  GLASS.add(prismZY(ellS(0, 12.5, 5.5, 5.5), 10.5, 10.9, cel('black')), prismZY(rrS(-6, 6, 107.5, 109.5, 1), 10.5, 10.9, cel('black')));
  GLASS.add(mesh(new THREE.BoxGeometry(0.6, 77, 51), celA('glass2', 0.22), 10.2, 62.5, 0)); }
IP.add(prismZY((() => { const s = rrS(-31.2, 31.2, -0.6, 115.6, 9.6); s.holes.push(rrPath(-30, 30, 0.6, 114.4, 8.6)); return s; })(), 7.6, 10.4, cel('steel')));
const TOUCH = { r: 2, c: 1 };                                   // titik sentuh: ikon baris 3, kolom 2
const touchUV = [-19 + TOUCH.c * 12.6, 91 - TOUCH.r * 13];
const IP_PT = { glass: anchor(GLASS, 11, 104, 22), grid: anchor(GRID, 10, 40, 22), touch: anchor(IP, 11, touchUV[1], touchUV[0]), top: anchor(IP, 10, 112, 0) };
blob(285, TOP + 0.6, -690, 75, 55);

// ===== 6. Masa depan: alas bulat + "telepon" hologram berputar =====
const FT = new THREE.Group(); FT.position.set(270, TOP, -900); lt.add(FT);
FT.add(lathe([[0, 0], [62, 0], [64, 4], [60, 14], [0, 14]], cel('ped')));
FT.add(mesh(new THREE.TorusGeometry(52, 2.2, 8, 48).rotateX(Math.PI / 2), glowM(0x7fd6ff), 0, 14.5, 0));
const HOLO = new THREE.Group(); HOLO.position.set(0, 120, 0); FT.add(HOLO);
{ const e = new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(8, 150, 72, 2, 3), 30), new THREE.LineBasicMaterial({ color: 0x7fd6ff })); HOLO.add(e);
  HOLO.add(mesh(new THREE.BoxGeometry(7, 146, 68), celA('holo', 0.35)));
  [[-75], [75]].forEach(([y]) => HOLO.add(mesh(new THREE.BoxGeometry(9, 2.4, 74), glowM(0x9fe4ff), 0, y, 0)));
  [[-37], [37]].forEach(([z]) => HOLO.add(mesh(new THREE.BoxGeometry(9, 152, 2.4), glowM(0x9fe4ff), 0, 0, z))); }
const FT_PT = { top: anchor(FT, 0, 220, 0), mid: anchor(FT, 0, 120, 0) };
blob(270, TOP + 0.6, -900, 90, 90);

// ---------- jadwal ----------
const E = { // waktu peristiwa dari kata
  ring: T(0, 'kriiing'), wide: L[1].s, touch1: T(1, 'sentuh'), door: T(2, 'engkol'), spin: T(2, 'memutar'), arus: T(2, 'arus'), op: L[3].s, plug: T(3, 'menyambungkan'),
  rot: L[4].s, wind: T(4, 'putar', 1), rel: T(4, 'lepas'), pb: L[5].s, press1: T(5, 'datang'), dtmf: T(5, 'rahasianya'), press2: T(5, 'dua'),
  nk: L[6].s, radio: T(6, 'gelombang'), ip: L[7].s, layer: T(7, 'balik'), finger: T(8, 'jarimu'), tahu: T(8, 'tahu'), sum: L[9].s, fut: L[10].s,
};
// engkol: kecepatan putar (putaran/detik) -> sudut terintegrasi (larik pra-hitung, deterministik)
const crankRate = t => 2.2 * pulse(0.05, E.ring + 0.6, t, 0.2) + 2.0 * pulse(E.spin, L[2].e + 0.3, t, 0.25);
const DT = 1 / 240, CR = [0];
for (let i = 1; i * DT < DUR + 2; i++) CR.push(CR[i - 1] + crankRate(i * DT) * DT * Math.PI * 2);
const crankAt = t => { const i = clamp(t / DT, 0, CR.length - 1), a = Math.floor(i); return lerp(CR[a], CR[Math.min(a + 1, CR.length - 1)], i - a); };
const RATIO = 62 / 25;
const ringing = t => pulse(E.ring - 0.05, E.ring + 1.3, t, 0.08);
const doorOpen = t => smooth(E.door - 0.3, E.door + 0.5, t) * (1 - smooth(L[3].e + 0.2, L[3].e + 0.9, t));
// piringan: putar ke penahan untuk angka 5, lalu kembali pelan (gerak lambat 4×: 290°/s / 4)
const DIGIT = 5, TRAV = travel(DIGIT), SLOW = 3, RET = 290 / SLOW;
const windAt = t => { if (t < E.wind) return 0; if (t < E.rel) return TRAV * easeIO((t - E.wind) / Math.min(0.9, E.rel - E.wind));
  return Math.max(0, TRAV - (t - E.rel) * RET); };
const pulsesAt = t => { if (t < E.rel) return 0; const ret = TRAV - windAt(t); return clamp(Math.floor((ret - 35 - 14.5) / 29) + 1, 0, DIGIT); };
const pulseT = Array.from({ length: DIGIT }, (_, k) => E.rel + (35 + 14.5 + 29 * k) / RET);
const relEnd = E.rel + TRAV / RET;
// tombol 5 ditekan dua kali
const PRESS = [[E.press1, E.press1 + 0.45], [E.press2, E.press2 + 1.1]];
const pressAt = t => Math.max(...PRESS.map(([a, b]) => pulse(a, b, t, 0.06)));
// layar sentuh: lapisan dibuka, sentuhan
const explode = t => smooth(E.layer - 0.2, E.layer + 0.8, t) * (1 - smooth(L[8].e - 0.2, L[8].e + 0.6, t));
const touchK = t => smooth(E.finger, E.finger + 0.3, t) * (1 - smooth(L[8].e, L[8].e + 0.4, t));
const darkAt = t => 0.85 * (1 - smooth(L[0].e - 0.2, L[1].s + 0.4, t)) + 0.75 * pulse(E.layer + 0.2, L[8].e, t, 0.35);

// kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x]
const dialC = (() => { lt.updateMatrixWorld(true); const p = ROT.F.localToWorld(V(0, 0, 0)); return lt.worldToLocal(p); })();
const padC = (() => { const p = PB.F.localToWorld(V(0, 0, 0)); return lt.worldToLocal(p); })();
const SHOT = {
  hook: [540, 1450, 540, 118, 8, 0.46, 0.55, 0, 110],
  hook2: [650, 1400, 700, 106, 8, 0.56, 0.55, 0, 110],
  wide: [20, TOP + 330, 2800, 62, 12, 0.5, 0.5, 0, 220],
  wpOpen: [610, 1400, 600, 104, 6, 0.5, 0.52, 0, 120],
  wpFull: [630, 1330, 820, 102, 6, 0.52, 0.62, 0, 100],
  rot: [200, TOP + 88, 620, 100, 18, 0.5, 0.49, 0, 230],
  dial: [dialC.z, TOP + 88, 540, 92, 24, 0.5, 0.485, 0, 230],
  pb: [padC.z, TOP + 86, 540, 92, 24, 0.5, 0.485, 0, 230],
  nk: [-480, TOP + 60, 310, 90, 13, 0.5, 0.55, 0, 290],
  ip: [-690, TOP + 62, 280, 88, 12, 0.5, 0.555, 0, 290],
  ipSide: [-690, TOP + 62, 290, 62, 18, 0.5, 0.555, 0, 290],
  sum: [-60, TOP + 330, 2900, 62, 12, 0.5, 0.47, 0, 220],
  fut: [-900, TOP + 120, 620, 84, 16, 0.5, 0.6, 0, 270],
};
const camKeys = [
  [0, SHOT.hook], [E.ring + 0.2, SHOT.hook2], [L[0].e + 0.1, SHOT.hook2], [L[1].s + 1.3, SHOT.wide], [L[1].e + 0.1, SHOT.wide],
  [L[2].s + 1.0, SHOT.wpOpen], [L[2].e, SHOT.wpOpen], [L[3].s + 0.7, SHOT.wpFull], [L[3].e + 0.1, SHOT.wpFull],
  [L[4].s + 1.1, SHOT.rot], [E.wind - 0.15, SHOT.dial], [relEnd + 0.3, SHOT.dial.map((v, i) => (i === 2 ? v * 0.95 : v))],
  [L[5].s + 1.0, SHOT.pb], [L[5].e + 0.1, SHOT.pb.map((v, i) => (i === 2 ? v * 0.95 : v))],
  [L[6].s + 1.0, SHOT.nk], [L[6].e + 0.1, SHOT.nk.map((v, i) => (i === 2 ? v * 0.95 : v))],
  [L[7].s + 0.9, SHOT.ip], [E.layer - 0.1, SHOT.ip], [E.layer + 0.9, SHOT.ipSide], [E.finger, SHOT.ipSide], [E.finger + 0.8, SHOT.ip], [L[8].e + 0.1, SHOT.ip],
  [L[9].s + 1.2, SHOT.sum], [L[9].e + 0.1, SHOT.sum], [L[10].s + 1.1, SHOT.fut], [DUR, SHOT.fut.map((v, i) => (i === 2 ? v * 0.92 : v))],
];

for (let i = 1; i < camKeys.length; i++) if (camKeys[i][0] <= camKeys[i - 1][0]) throw new Error('camKeys tidak urut di ' + i + ' t=' + camKeys[i][0]);
// ---------- label, stempel, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchorFn, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor: anchorFn, side, cls });
tag(L[1].s + 1.2, L[1].e, 'Dulu', () => WP_PT.top, 'r', 'warn');
tag(E.touch1, L[1].e, 'Kini', () => IP_PT.top, 'l', 'hi');
tag(T(2, 'magnet'), L[2].e, 'Magnet', () => WP_PT.magnet, 'l', '');
tag(E.spin + 0.5, L[2].e, 'Kumparan berputar', () => WP_PT.arm, 'r', 'hi');
tag(E.wind, E.rel + 0.3, 'Penahan jari', () => ROT_PT.stop, 'r', '');
tag(E.press1, E.dtmf - 0.2, 'Tombol 5', () => PB_PT.k5, 'r', 'hi');
tag(E.radio - 0.2, L[6].e, 'Antena di dalam', () => NK_PT.ant, 'r', '');
tag(E.layer + 0.6, E.finger - 0.2, 'Kaca', () => IP_PT.glass, 'r', '');
tag(E.layer + 1.0, E.finger - 0.2, 'Kisi listrik', () => IP_PT.grid, 'r', 'hi');
tag(E.tahu, L[8].e, `Kolom ${[...gCols].sort((a, b) => b - a).findIndex(u => Math.abs(u - touchUV[0]) < 6) + 1} · baris ${[...gRows].sort((a, b) => b - a).findIndex(v => Math.abs(v - touchUV[1]) < 6) + 1}`, () => IP_PT.touch, 'r', 'hi');
const YEARS = [1900, 1930, 1963, 2000, 2007];
const stampDefs = [
  [E.ring, L[0].e + 0.2, 'Kriiing!', 820, 'snd'],
  [T(9, 'seratus'), L[9].e + 0.3, `± ${Math.round((YEARS[4] - YEARS[0]) / 100) * 100}|tahun`, 820, ''],
  [T(10, 'tulis'), DUR + 1, 'Tulis di|komentar', 560, 'snd'],
];
const FORMAT = { timeline: { t: L[2].s - 0.1, e: DUR + 1, era: [
  { t: L[2].s, tahun: '1900', nama: 'Engkol & operator' }, { t: L[4].s, tahun: '1930', nama: 'Piringan putar' },
  { t: L[5].s, tahun: '1963', nama: 'Tombol nada' }, { t: L[6].s, tahun: '2000', nama: 'Ponsel' },
  { t: L[7].s, tahun: '2007', nama: 'Layar sentuh' }, { t: L[10].s, tahun: '20??', nama: 'Masa depan?' }] } };
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
const S = { dark: 0, pulses: 0 };
function updateModel(t) {
  const ca = crankAt(t);
  CRANK.rotation.z = -ca; GEAR.rotation.z = -ca; PIN.rotation.z = ca * RATIO; ARM.rotation.z = ca * RATIO;
  const rg = ringing(t); HAM.rotation.z = 0; HAM.rotation.x = Math.sin(t * 2 * Math.PI * 20) * 0.35 * rg;
  bellG.forEach(b => b.material.glow(rg * 0.8)); DOOR.rotation.y = -doorOpen(t) * 1.75;
  magM.glow(pulse(T(2, 'magnet'), L[2].e, t, 0.2) * 0.6);
  WHEEL.rotation.z = -windAt(t) * Math.PI / 180;
  Object.values(KEYS).forEach(k => { k.position.z = 5.25; k.material.glow(0); });
  KEYS[5].position.z = 5.25 - 3 * pressAt(t); KEYS[5].material.glow(pressAt(t) * 0.9 + pulse(E.dtmf, L[5].e, t, 0.2) * 0.4);
  const ex = explode(t); GLASS.position.x = 30 * ex; GRID.position.x = 15 * ex;
  GRID.visible = ex > 0.01; const tk = touchK(t);
  gridMats.forEach(g => { const hit = (g.type === 'c' && Math.abs(g.u - touchUV[0]) < 6) || (g.type === 'r' && Math.abs(g.v - touchUV[1]) < 6);
    g.m.color.set(hit && t > E.tahu - 0.2 ? 0xffd25a : 0x7fd6ff); });
  HOLO.visible = t > L[10].s - 0.2; HOLO.scale.setScalar(Math.max(0.01, backOut((t - L[10].s + 0.2) / 0.6)));
  HOLO.rotation.y = t * 0.8; HOLO.position.y = 120 + Math.sin(t * 2) * 6;
  S.dark = darkAt(t); S.pulses = pulsesAt(t); S.tk = tk;
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2] * (1 - 0.012 * Math.sin(t * 0.7));
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
  edge.mat.uniforms.dim.value = S.dark * 0.55;
  $('shake').style.transform = '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : (p.isVector3 ? p.clone() : lt.localToWorld(V(...p)));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}
const projO = (obj, x, y, z) => project(obj.localToWorld(V(x, y, z)));

// ---------- lingkungan SVG: dinding biru-abu, lis kayu, jendela, foto lama, jam; lantai ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <pattern id="plaster" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="120" height="120" fill="#b9c9cc"/><circle cx="20" cy="30" r="2" fill="#b0c0c3"/><circle cx="80" cy="70" r="1.6" fill="#b0c0c3"/><circle cx="50" cy="105" r="2.2" fill="#b3c3c6"/></pattern>
  <pattern id="ftile" width="900" height="160" patternUnits="userSpaceOnUse"><rect width="900" height="160" fill="#c99b6c"/><rect y="80" width="900" height="80" fill="#c39566"/><path d="M0 0H900M0 80H900M600 0V80M250 80V160" stroke="#a97c50" stroke-width="5"/></pattern>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
  <linearGradient id="sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e6f2fb"/><stop offset="1" stop-color="#a9d0ec"/></linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#1d2440" stop-opacity="0"/><stop offset="1" stop-color="#1d2440" stop-opacity=".34"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#232838"/><stop offset="1" stop-color="#0d0f15"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#b9c9cc"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const f1 = v => (+v).toFixed(1);
const planeM = (o, u, v) => {
  const O = project(o), U = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
// bidang di dalam objek bergerak: (o, u, v) dalam koordinat lokal obj
const planeO = (obj, o, u, v) => {
  const O = projO(obj, ...o), U = projO(obj, o[0] + u[0], o[1] + u[1], o[2] + u[2]), Q = projO(obj, o[0] + v[0], o[1] + v[1], o[2] + v[2]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
function updateBg(t) {
  const zoom = 600 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.0) * 1.8, 0, 7).toFixed(2));
  const ang = t * 0.6;
  // dinding: (a, b) = (−z, −y)
  let s = `<g transform="${planeM([0, 0, 0], [0, 0, -1], [0, -1, 0])}">
    <rect x="-1400" y="-2600" width="2900" height="2600" fill="url(#plaster)"/>
    <rect x="-1400" y="-1000" width="2900" height="1000" fill="#8d9fa6"/><rect x="-1400" y="-1012" width="2900" height="24" fill="#d8c4a2" stroke="#1b1a1f" stroke-width="4"/>
    ${Array.from({ length: 15 }, (_, k) => `<rect x="${-1380 + k * 196}" y="-960" width="176" height="900" rx="6" fill="none" stroke="#7d8f96" stroke-width="6"/>`).join('')}
    <rect x="-1400" y="-90" width="2900" height="90" fill="#efe7da" stroke="#1b1a1f" stroke-width="4"/>
    <g filter="url(#soft)" fill="#2a2a4a"><rect x="-690" y="-1600" width="230" height="760" opacity=".32"/><rect x="-150" y="-1000" width="900" height="240" opacity=".18"/></g>
    <rect x="-180" y="-2120" width="420" height="560" rx="8" fill="#efe7da" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="-160" y="-2100" width="380" height="520" fill="url(#sky)"/><rect x="18" y="-2100" width="16" height="520" fill="#efe7da" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="-160" y="-1850" width="380" height="14" fill="#efe7da" stroke="#1b1a1f" stroke-width="3"/>
    <path d="M-160 -1640q60 -40 120 -16t110 -30 150 30V-1580H-160Z" fill="#a9cfa4"/>
    <rect x="-210" y="-1560" width="480" height="22" rx="6" fill="#d8c4a2" stroke="#1b1a1f" stroke-width="4"/>
    <rect x="520" y="-1780" width="300" height="230" rx="4" fill="#6f5b45" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="538" y="-1762" width="264" height="194" fill="#e9dcc4"/><path d="M560 -1585l60 -70 40 40 40 -30 80 60Z" fill="#b8a38a"/><circle cx="740" cy="-1720" r="18" fill="#c9b79d"/>
    <rect x="900" y="-1700" width="180" height="230" rx="4" fill="#6f5b45" stroke="#1b1a1f" stroke-width="5"/><rect x="916" y="-1684" width="148" height="198" fill="#e2d6c0"/>
    <circle cx="1000" cy="-1610" r="38" fill="#c9b79d"/><path d="M940 -1490q60 -80 120 0Z" fill="#b8a38a"/>
    <circle cx="1250" cy="-2000" r="80" fill="#efe7da" stroke="#1b1a1f" stroke-width="6"/>
    <path d="M1250 -2000l${f1(Math.sin(ang / 12) * 40)} ${f1(-Math.cos(ang / 12) * 40)}M1250 -2000l${f1(Math.sin(ang) * 60)} ${f1(-Math.cos(ang) * 60)}" stroke="#1b1a1f" stroke-width="7" stroke-linecap="round"/>
  </g>`;
  // lantai
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}"><rect x="0" y="-1400" width="2600" height="2900" fill="url(#ftile)"/>
    <g filter="url(#soft)" fill="#2a2440"><rect x="20" y="-900" width="560" height="2050" opacity=".35"/></g></g>`;
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
    el.style.top = clamp(y - h / 2, 240, 1300) + 'px';
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

// efek: arus bolak-balik di kawat, angka tombol, layar ponsel, gelombang radio, riak sentuh, hologram
const FN = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
const MONO = 'font-family="ui-monospace, Menlo, monospace"';
function updateFx(t) {
  let s = `<defs><radialGradient id="glo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset="1" stop-color="#f6c96a" stop-opacity="0"/></radialGradient>
    <radialGradient id="gloB"><stop offset="0" stop-color="#d9f4ff" stop-opacity=".95"/><stop offset="1" stop-color="#7fd6ff" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  // bel berdering: cincin getar
  { const rg = ringing(t); if (rg > 0.02) [650, 550].forEach((z, k) => { const [x, y] = project([190, 1478, z]); for (let j = 0; j < 3; j++) { const ph = (t * 3 + j / 3 + k * 0.2) % 1;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((40 + ph * 70) * pxmm)}" fill="none" stroke="#ffd25a" stroke-width="${f1(5 * pxmm)}" opacity="${((1 - ph) * rg).toFixed(2)}"/>`; } }); }
  // arus bolak-balik dari magneto ke kawat sentral
  { const a = pulse(E.arus, L[3].e, t, 0.2); if (a > 0.02) { const path = [[100, 1452, 600], [60, 1540, 640], [30, 1576, 640], [24, 1700, 640], [14, 1760, 700], [10, 1800, 1000], [10, 1830, 1400]].map(p => project(p));
    s += `<polyline points="${path.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="#ffd25a" stroke-width="${f1(7 * pxmm)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.55 * a).toFixed(2)}"/>`;
    const segs = []; let tot = 0; for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(l); tot += l; }
    for (let k = 0; k < 9; k++) { let d = ((t * 0.45 + k / 9) % 1) * tot, i = 0; while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
      const q = d / segs[i], x = lerp(path[i][0], path[i + 1][0], q), y = lerp(path[i][1], path[i + 1][1], q), wob = Math.sin(t * 30 + k) * 0.5 + 0.5;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((8 + 6 * wob) * pxmm)}" fill="url(#glo)" opacity="${a.toFixed(2)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3.5 * pxmm)}" fill="#fff6d0" opacity="${a.toFixed(2)}"/>`; } } }
  // angka di tombol telepon tombol
  Object.entries(KEYPOS).forEach(([d, [r, c]]) => { const k = KEYS[d], m = planeO(PB.F, [kx(c), ky(r), k.position.z + 2.8], [1, 0, 0], [0, -1, 0]);
    s += `<g transform="${m}"><text x="0" y="3" ${FN} font-weight="800" font-size="8" text-anchor="middle" fill="#1b1a1f">${d}</text></g>`; });
  // layar ponsel batangan: sinyal, baterai, teks
  { const m = planeO(NK, [22.7, 97, 14.5], [0, 0, -1], [0, -1, 0]), call = t > L[6].s - 0.3 && t < L[7].s, bars = call ? 1 + Math.floor((t * 3) % 4) : 4;
    let g = ''; for (let b = 0; b < 4; b++) g += `<rect x="1.5" y="${f1(20 - b * 4.5)}" width="${f1(2 + b * 0.9)}" height="3" fill="#2c3a22" opacity="${b < bars ? 1 : 0.18}"/>`;
    for (let b = 0; b < 4; b++) g += `<rect x="${f1(25 - b * 0.9)}" y="${f1(20 - b * 4.5)}" width="${f1(2 + b * 0.9)}" height="3" fill="#2c3a22"/>`;
    g += `<text x="14.5" y="8" ${MONO} font-weight="700" font-size="4.6" text-anchor="middle" fill="#2c3a22">${call ? 'Memanggil' : '10:07'}</text>`;
    if (call) g += `<text x="14.5" y="15" ${MONO} font-weight="700" font-size="4" text-anchor="middle" fill="#2c3a22">${'.'.repeat(1 + Math.floor(t * 2) % 3)}</text>`;
    s += `<g transform="${m}">${g}</g>`; }
  // gelombang radio dari antena ke menara (kanan atas)
  { const a = pulse(E.radio - 0.2, L[6].e + 0.3, t, 0.25); if (a > 0.02) { const [x, y] = project(NK_PT.ant);
    for (let k = 0; k < 5; k++) { const ph = (t * 0.9 + k / 5) % 1, r = (20 + ph * 220) * pxmm;
      s += `<path d="M${f1(x + r * Math.cos(-1.25))} ${f1(y + r * Math.sin(-1.25))} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r * Math.cos(-0.1))} ${f1(y + r * Math.sin(-0.1))}" fill="none" stroke="#3e6fd1" stroke-width="${f1(3.2 * pxmm)}" stroke-linecap="round" opacity="${((1 - ph) * a).toFixed(2)}"/>`; } } }
  // layar sentuh menyala (baris 1) + riak sentuh & muatan mengalir (baris 8)
  { const a = pulse(E.touch1, E.touch1 + 1.2, t, 0.15); if (a > 0.02) { const [x, y] = project(IP_PT.touch), ph = clamp((t - E.touch1) / 0.9);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((4 + 16 * ph) * pxmm)}" fill="none" stroke="#ffffff" stroke-width="${f1(1.6 * pxmm)}" opacity="${(a * (1 - ph)).toFixed(2)}"/>`; } }
  { const k = S.tk; if (k > 0.02) { const [x, y] = project(IP_PT.touch);
    for (let j = 0; j < 3; j++) { const ph = (t * 1.2 + j / 3) % 1; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((3 + ph * 14) * pxmm)}" fill="none" stroke="#ffd25a" stroke-width="${f1(1.4 * pxmm)}" opacity="${((1 - ph) * k).toFixed(2)}"/>`; }
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(6 * pxmm)}" fill="url(#glo)" opacity="${k.toFixed(2)}"/>`;
    const q = smooth(E.finger + 0.4, E.finger + 1.0, t) * (1 - smooth(T(8, 'dari'), T(8, 'dari') + 0.5, t));
    if (q > 0.02) for (let j = 0; j < 10; j++) { const ang = j / 10 * Math.PI * 2, ph = (t * 0.8 + j * 0.37) % 1, r = (18 * (1 - ph)) * pxmm;
      s += `<circle cx="${f1(x + Math.cos(ang) * r)}" cy="${f1(y + Math.sin(ang) * r)}" r="${f1(1.3 * pxmm)}" fill="#7fd6ff" opacity="${(q * Math.sin(Math.PI * ph)).toFixed(2)}"/>`; } } }
  // hologram masa depan: tanda tanya
  { const a = smooth(L[10].s + 0.6, L[10].s + 1.2, t); if (a > 0.02) { const [x, y] = project(FT_PT.mid);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(110 * pxmm)}" fill="url(#gloB)" opacity="${(0.45 * a).toFixed(2)}"/>`;
    s += `<text x="${f1(x)}" y="${f1(y + 30 * pxmm)}" ${FN} font-weight="900" font-size="${f1(90 * pxmm)}" text-anchor="middle" fill="#e9f8ff" stroke="#1a1c2a" stroke-width="${f1(3 * pxmm)}" paint-order="stroke" opacity="${a.toFixed(2)}">?</text>`; } }
  // lencana gerak lambat
  { const a = pulse(E.rel, relEnd + 0.2, t, 0.15); if (a > 0.02) s += `<g opacity="${a.toFixed(2)}" transform="translate(70 600)"><rect width="330" height="66" rx="33" fill="#1b1a1f"/>
    <circle cx="36" cy="33" r="10" fill="#e5484d" opacity="${(0.5 + 0.5 * Math.sin(t * 8)).toFixed(2)}"/><text x="60" y="44" ${FN} font-weight="900" font-size="30" fill="#e3bf62">GERAK LAMBAT ${SLOW}×</text></g>`; }
  $('dim').innerHTML = s;
}

// kartu sisipan (atas): papan operator, pulsa, nada ganda, radio
const Fn = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800"';
const tx = (x, y, s, size, col = '#1b1a1f', op = 1, anchor = 'start', extra = '') => `<text x="${x}" y="${y}" ${Fn} font-size="${size}" fill="${col}" opacity="${(+op).toFixed(3)}" text-anchor="${anchor}" ${extra}>${s}</text>`;
const CARDS = [
  { s: L[3].s - 0.1, e: L[3].e + 0.3, k: 'PAPAN OPERATOR · 1900-AN', f: cardOperator },
  { s: E.rel - 0.2, e: L[4].e + 0.4, k: 'PIRINGAN → PULSA LISTRIK', f: cardPulse },
  { s: E.dtmf - 0.1, e: L[5].e + 0.3, k: 'TOMBOL 5 = DUA NADA', f: cardDtmf },
  { s: E.radio - 0.3, e: L[6].e + 0.3, k: 'SUARA → GELOMBANG RADIO', f: cardRadio },
];
function cardOperator(t) {
  let g = `<rect x="40" y="70" width="560" height="300" rx="16" fill="#8f5628" stroke="#1b1a1f" stroke-width="4"/>`;
  const fall = smooth(L[3].s + 0.1, L[3].s + 0.4, t), plug = smooth(E.plug - 0.1, E.plug + 0.8, t);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { const x = 90 + c * 88, y = 120 + r * 140, me = r === 0 && c === 3;
    g += `<rect x="${x - 26}" y="${y - 30}" width="52" height="34" rx="6" fill="#2e3038" stroke="#1b1a1f" stroke-width="3"/>`;
    g += me ? `<rect x="${x - 24}" y="${f1(y - 28 + 26 * fall)}" width="48" height="${f1(30 - 18 * fall)}" rx="4" fill="#e3bf62" stroke="#1b1a1f" stroke-width="3"/>` : `<rect x="${x - 22}" y="${y - 26}" width="44" height="26" rx="4" fill="#4a4d57"/>`;
    g += `<circle cx="${x}" cy="${y + 40}" r="15" fill="#d9a63c" stroke="#1b1a1f" stroke-width="3"/><circle cx="${x}" cy="${y + 40}" r="6" fill="#1b1a1f"/>`; }
  const jx = 90 + 3 * 88, jy = 160, sx = 680, sy = 380, px = lerp(sx, jx, plug), py = lerp(sy, jy + 6, plug);
  g += `<path d="M${sx} 470 C ${sx} 420, ${f1(px)} ${f1(py + 120)}, ${f1(px)} ${f1(py + 28)}" fill="none" stroke="#9b2c3f" stroke-width="9" stroke-linecap="round"/>`;
  g += `<rect x="${f1(px - 11)}" y="${f1(py)}" width="22" height="34" rx="5" fill="#2e3038" stroke="#1b1a1f" stroke-width="3"/><rect x="${f1(px - 4)}" y="${f1(py - 14)}" width="8" height="16" fill="#d9a63c" stroke="#1b1a1f" stroke-width="2"/>`;
  g += tx(640, 140, 'Bel berbunyi', 34, '#1b1a1f', fall) + tx(640, 182, '→ kartu jatuh', 30, '#9b2c3f', fall);
  g += tx(640, 260, 'Kabel dicolok', 34, '#1b1a1f', plug) + tx(640, 302, 'dengan tangan', 30, '#9b2c3f', plug);
  return g;
}
function cardPulse(t) {
  const n = S.pulses, ret = t >= E.rel ? TRAV - windAt(t) : 0;
  let g = tx(60, 120, 'Sirkuit telepon', 30, '#7a7368');
  const x0 = 60, x1 = 600, yH = 175, yL = 265, span = TRAV;   // sumbu = sudut balik piringan
  let d = `M${x0} ${yH}`;
  for (let k = 0; k < DIGIT; k++) { const a0 = 35 + 29 * k + 7, a1 = a0 + 15, X0 = x0 + (x1 - x0) * a0 / span, X1 = x0 + (x1 - x0) * a1 / span;
    if (ret > a0) { d += `L${f1(X0)} ${yH}L${f1(X0)} ${yL}`; d += ret > a1 ? `L${f1(X1)} ${yL}L${f1(X1)} ${yH}` : `L${f1(x0 + (x1 - x0) * ret / span)} ${yL}`; if (ret <= a1) break; } }
  if (ret > 0 && !(d.endsWith(`${yL}`))) d += `L${f1(x0 + (x1 - x0) * Math.min(ret, span) / span)} ${yH}`;
  g += `<line x1="${x0}" x2="${x1}" y1="${yH}" y2="${yH}" stroke="#d9cfc0" stroke-width="3" stroke-dasharray="8 8"/>`;
  g += `<path d="${d}" fill="none" stroke="#3e5bb8" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += tx(x0, 305, 'nyambung', 24, '#1f7a5c') + tx(x0 + 150, 305, 'putus', 24, '#9b2c3f');
  g += `<rect x="650" y="90" width="240" height="220" rx="24" fill="#1b1a1f"/>` + tx(770, 225, `${n}`, 120, '#e3bf62', 1, 'middle') + tx(770, 282, `dari ${DIGIT} pulsa`, 26, '#f4efe6', 1, 'middle');
  g += tx(60, 370, `Angka ${DIGIT} = ${DIGIT}× putus · aslinya 10 pulsa per detik`, 28, '#1b1a1f', smooth(relEnd - 0.2, relEnd + 0.3, t));
  return g;
}
function cardDtmf(t) {
  const hi = smooth(E.dtmf, E.dtmf + 0.5, t), w2 = smooth(E.press2, E.press2 + 0.6, t);
  let g = '';
  HIGH.forEach((f, c) => { g += tx(150 + c * 74, 108, f, 22, c === 1 ? '#c06a2e' : '#7a7368', 1, 'middle', c === 1 ? `font-weight="900"` : ''); });
  LOW.forEach((f, r) => { g += tx(80, 158 + r * 60, f, 22, r === 1 ? '#3e5bb8' : '#7a7368', 1, 'end');
    for (let c = 0; c < 3; c++) { const lab = r < 3 ? r * 3 + c + 1 : (c === 1 ? 0 : ''), on = r === 1 && c === 1;
      g += `<rect x="${118 + c * 74}" y="${128 + r * 60}" width="62" height="46" rx="10" fill="${on ? '#e3bf62' : (lab === '' ? '#e9e2d6' : '#fffdf8')}" stroke="#1b1a1f" stroke-width="${on ? 5 : 3}"/>` + (lab !== '' ? tx(149 + c * 74, 161 + r * 60, lab, 28, '#1b1a1f', 1, 'middle') : ''); } });
  g += `<rect x="104" y="${180}" width="230" height="58" rx="14" fill="none" stroke="#3e5bb8" stroke-width="4" opacity="${hi}"/><rect x="${178}" y="78" width="70" height="380" rx="14" fill="none" stroke="#c06a2e" stroke-width="4" opacity="${hi}" transform="translate(0 -6)"/>`;
  const wave = (y, f, col, amp, sum = false) => { let d = ''; for (let i = 0; i <= 160; i++) { const x = 400 + i * 3.1, tt = i / 160 * 0.012 + t * 0.0004;
      const v = sum ? (Math.sin(2 * Math.PI * 770 * tt) + Math.sin(2 * Math.PI * 1336 * tt)) / 2 : Math.sin(2 * Math.PI * f * tt); d += `${i ? 'L' : 'M'}${f1(x)} ${f1(y - v * amp)}`; }
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round"/>`; };
  g += `<g opacity="${hi.toFixed(2)}">${wave(130, 770, '#3e5bb8', 26)}${tx(400, 95, '770 Hz (baris)', 24, '#3e5bb8')}${wave(232, 1336, '#c06a2e', 26)}${tx(400, 197, '1336 Hz (kolom)', 24, '#c06a2e')}</g>`;
  g += `<g opacity="${w2.toFixed(2)}">${tx(400, 300, '= bunyi tombol 5', 26, '#1b1a1f')}${wave(355, 0, '#1b1a1f', 34, true)}</g>`;
  return g;
}
function cardRadio(t) {
  let g = `<g transform="translate(90 120)"><rect x="0" y="0" width="70" height="160" rx="30" fill="#34437a" stroke="#1b1a1f" stroke-width="4"/><rect x="12" y="22" width="46" height="40" rx="5" fill="#b5c99a" stroke="#1b1a1f" stroke-width="3"/>
    <ellipse cx="35" cy="80" rx="18" ry="8" fill="#6f97d6" stroke="#1b1a1f" stroke-width="2"/>${[0, 1, 2].map(r => [0, 1, 2].map(c => `<ellipse cx="${16 + c * 19}" cy="${102 + r * 16}" rx="7" ry="4.5" fill="#c3c8cf"/>`).join('')).join('')}</g>`;
  for (let k = 0; k < 5; k++) { const ph = (t * 0.9 + k / 5) % 1, x = 190 + ph * 430;
    g += `<path d="M${f1(x)} ${f1(150)} q 22 50 0 100" fill="none" stroke="#3e6fd1" stroke-width="7" stroke-linecap="round" opacity="${(Math.sin(Math.PI * ph)).toFixed(2)}"/>`; }
  g += `<g transform="translate(700 70)" stroke="#1b1a1f" stroke-width="4" fill="none"><path d="M40 0 L10 300 M40 0 L70 300 M18 220 L62 220 M24 150 L56 150 M30 80 L50 80 M18 220 L56 150 M24 150 L50 80 M62 220 L24 150 M56 150 L30 80"/>
    <rect x="28" y="10" width="10" height="44" fill="#d9dde3"/><rect x="44" y="10" width="10" height="44" fill="#d9dde3"/></g>`;
  g += tx(130, 340, 'Ponsel', 28, '#1b1a1f', 1, 'middle') + tx(740, 400, 'Menara (BTS)', 28, '#1b1a1f', 1, 'middle');
  g += tx(400, 360, 'GSM ±900 / 1800 MHz', 26, '#3e5bb8', smooth(E.radio + 0.5, E.radio + 1.0, t), 'middle');
  return g;
}
function updateInset(t) {
  const c = CARDS.find(c => t > c.s && t < c.e), el = $('inset');
  const a = c ? pulse(c.s + 0.15, c.e - 0.15, t, 0.15) : 0;
  el.style.opacity = a;
  if (a <= 0.001) return;
  el.style.transform = `scale(${lerp(0.92, 1, backOut((t - c.s) / 0.4)).toFixed(3)})`;
  $('insetk').textContent = c.k;
  $('insetsvg').innerHTML = c.f(t);
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  const hid = [];
  scene.traverse(o => { if (o.isMesh || o.isLineSegments) { if (o.material.transparent) { hid.push(o); o.visible = false; } else if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; } } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh && o.userData.m0) { o.material = o.userData.m0; o.userData.m0 = null; } });
  hid.forEach(o => (o.visible = true));
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); FMT.gambar(t, FORMAT, project); };
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  CARDS.forEach(c => ev.push({ t: c.s + 0.15, type: 'card' }));
  FORMAT.timeline.era.forEach(e => ev.push({ t: e.t, type: 'whoosh' }));
  ev.push({ t: 0.05, type: 'putar', dur: E.ring - 0.1 }, { t: E.ring, type: 'kring', dur: 1.3 }, { t: E.spin, type: 'putar', dur: L[2].e - E.spin });
  ev.push({ t: E.door, type: 'lid' }, { t: L[3].s + 0.25, type: 'clack' }, { t: E.plug + 0.75, type: 'klikTombol' });
  ev.push({ t: E.wind, type: 'putar', dur: Math.min(0.9, E.rel - E.wind) }, { t: E.rel, type: 'putar', dur: relEnd - E.rel });
  pulseT.forEach(p => ev.push({ t: p, type: 'pulsa' }));
  PRESS.forEach(([a]) => ev.push({ t: a, type: 'klikTombol' }, { t: a + 0.02, type: 'dtmf', f1: 770, f2: 1336, dur: 0.4 }));
  ev.push({ t: L[6].s + 0.5, type: 'ringHP' }, { t: E.radio, type: 'whoosh' });
  ev.push({ t: E.touch1, type: 'ketuk' }, { t: E.layer, type: 'gelap' }, { t: E.layer + 0.2, type: 'lid' }, { t: E.finger, type: 'ketuk' }, { t: E.tahu, type: 'chime' });
  ev.push({ t: L[10].s + 0.6, type: 'reveal' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera, E };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(0).e - 0.3); cue('act1', LN(2).s); cue('danger', LN(4).s); cue('drop', LN(5).s - 0.1); cue('build', LN(5).s + 0.8);
  cue('reveal', LN(7).s); cue('warm', LN(8).s); cue('dark', LN(9).s); cue('resolve', LN(10).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(ROT_PT.dial);
