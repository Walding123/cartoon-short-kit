// Video "Apa jadinya kalau 4 alat pemanas dicolok ke satu terminal?" (format Apa Jadinya Kalau…).
// Ruang tamu: terminal 4 lubang di lantai (dibelah memanjang lewat baris pin), rice cooker + setrika + ketel di meja, dispenser,
// stop kontak dinding, meteran + MCB. Satu model per waktu: daya tiap alat -> arus tiap ruas kuningan -> panas (I²) -> warna, percikan, api, MCB.
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
    clipping: true,
    vertexShader: `#include <clipping_planes_pars_vertex>
      varying vec3 vN, vV; void main(){ vN = normalize(mat3(modelMatrix) * normal);
      vec4 w = modelMatrix * vec4(position, 1.); vV = normalize(cameraPosition - w.xyz);
      vec4 mvPosition = viewMatrix * w;
      #include <clipping_planes_vertex>
      gl_Position = projectionMatrix * mvPosition; }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
      uniform vec3 c0, c1, c2, h0, h1, h2; uniform float k, gl, gw, al; varying vec3 vN, vV;
      void main(){
        #include <clipping_planes_fragment>
        vec3 N = normalize(vN), V = normalize(vV); if (dot(N, V) < 0.) N = -N;
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


// ---------- dunia (mm): dinding x = 0 (benda menonjol ke +x), lantai y = 0, sumbu z mendatar (+z di kiri layar) ----------
const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const celA = (pal, alpha) => { const m = cel(pal); m.transparent = true; m.depthWrite = false; m.uniforms.al.value = alpha; return m; };
// potongan belah terminal: bidang tegak x = CUT (belahan dekat kamera, x > CUT, dibuang). Jauh = tidak memotong.
renderer.localClippingEnabled = true;
const cutPlane = new THREE.Plane(V(-1, 0, 0), 1e5);
const normalMatClip = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, clippingPlanes: [cutPlane] });
const celC = (pal, cutCol) => { const m = cel(pal); m.clippingPlanes = [cutPlane]; m.side = THREE.FrontSide;      // benda pejal: sisi dalam = bidang potong pucat
  m.userData.back = new THREE.MeshBasicMaterial({ color: new THREE.Color(cutCol || PAL[pal][0]).lerp(new THREE.Color('#ffffff'), cutCol ? 0 : 0.35), side: THREE.BackSide, clippingPlanes: [cutPlane] }); return m; };
const celD = pal => { const m = cel(pal); m.clippingPlanes = [cutPlane]; return m; };                              // permukaan tipis (dua sisi) yang ikut terbelah
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
const lathe = (pts, mat, x, y, z, seg = 64) => mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat, x, y, z);
const ledM = (p, x, y, z, r = 5) => mesh(new THREE.CylinderGeometry(r, r, 4, 12).rotateZ(Math.PI / 2), cel(p), x, y, z);
const ZY = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0));      // bentuk (z, y) diekstrusi ke −x
const prismZY = (shape, xFront, depth, mat, bv = 0) => mesh(new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bv, bevelEnabled: bv > 0, bevelSize: bv, bevelThickness: bv, bevelSegments: 3, curveSegments: 16 }).applyMatrix4(ZY), mat, xFront - bv, 0, 0);

// palet tambahan
Object.assign(PAL, {
  cover: ['#fbfaf6', '#e6e3db', '#bdb8ac'], base: ['#5a5d66', '#3f424a', '#26282e'], rocker: ['#ff7a6b', '#e0453a', '#a82a22'],
  plugB: ['#55585f', '#383a41', '#202126'], plugW: ['#fbfaf6', '#e2dfd6', '#b9b4a8'], cordB: ['#4a4d55', '#2f3137', '#1b1c20'], cordW: ['#fbfbf8', '#dedcd5', '#b3b0a7'],
  scorch: ['#f0d58f', '#cf9f4c', '#8f6526'], hot: ['#ffd28a', '#ff8a3a', '#d4471c'], kettle: ['#f4f6f9', '#c3c9d2', '#7f8794'],
  acBody: ['#fbfbf8', '#e4e3dd', '#bdbbb2'], irBlue: ['#7fb0ef', '#3f72d8', '#2a4fa3'], rcBody: ['#fdfbf7', '#ebe5dc', '#c9bfb1'], gal: ['#d6ecff', '#a9d2f5', '#7fb0e0'],
  water: ['#9fd0ff', '#6fb0ef', '#4a8bd0'], green: ['#c5ec8a', '#9fd45a', '#74a83a'], rcPanel: ['#a8cdf7', '#78a9e6', '#4f7fc0'], flower: flat('#c9b6e8'), flowerC: flat('#f2c94c'),
  ledO: flat('#ffb347'), ledG: flat('#5fd38a'), ledR: flat('#ff6b5b'), tapR: ['#ff8a80', '#e5484d', '#b8333a'], tapB: ['#86b5ff', '#3f72d8', '#2a4fa3'], soot: ['#4a4038', '#2e2823', '#1a1613'],
});
Object.assign(GLOSS, { cover: 0.45, plugB: 0.5, plugW: 0.45, kettle: 0.9, base: 0.3, rocker: 0.6, cordB: 0.3, cordW: 0.3, hot: 0.5, scorch: 0.4 });

// ---------- daya alat (sumber: label produk umum; disederhanakan) ----------
const VOLT = 220, BATAS_A = 10, BATAS_W = BATAS_A * VOLT;                      // terminal 10 A -> 2.200 W
const ALATD = {
  rice: { nama: 'Rice cooker', W: 400, sock: 3, plug: 'plugW', cord: 'cordW' },
  disp: { nama: 'Dispenser', W: 350, sock: 1, plug: 'plugB', cord: 'cordB' },
  iron: { nama: 'Setrika', W: 350, sock: 0, plug: 'plugB', cord: 'cordB' },
  kettle: { nama: 'Ketel listrik', W: 1500, sock: 2, plug: 'plugW', cord: 'cordW' },
};
for (const a of Object.values(ALATD)) a.I = a.W / VOLT;
const TOTAL_W = Object.values(ALATD).reduce((s, a) => s + a.W, 0);           // 2.600 W
const TOTAL_I = TOTAL_W / VOLT;                                               // 11,8 A
const RASIO_I = TOTAL_I / ALATD.rice.I, RASIO_P = RASIO_I * RASIO_I;          // 6,5× arus, 42× panas
const fmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
const fmtW = v => Math.round(v).toLocaleString('id-ID');

// ---------- stop kontak dinding SNI (pelat 86×86, cekungan Ø40 dalam 14, 2 lubang pin, klip arde atas-bawah) ----------
function wallSock(zc, yc) {
  const g = new THREE.Group(); lt.add(g);
  const f = new THREE.Shape(); f.moveTo(-43, -43); f.lineTo(43, -43); f.lineTo(43, 43); f.lineTo(-43, 43); f.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, 20, 0, Math.PI * 2, true); f.holes.push(h);
  const B = new THREE.Matrix4().makeBasis(V(0, 0, -1), V(0, 1, 0), V(1, 0, 0));
  g.add(mesh(new THREE.ExtrudeGeometry(f, { depth: 8, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2, curveSegments: 40 }).applyMatrix4(B), cel('cover'), 1, yc, zc));
  g.add(mesh(new THREE.CylinderGeometry(20, 20, 14, 48, 1, true).rotateZ(Math.PI / 2), cel('cover'), 4, yc, zc));
  g.add(mesh(new THREE.CircleGeometry(20, 48).rotateY(Math.PI / 2), cel('grey'), -3, yc, zc));
  for (const dz of [-9.5, 9.5]) g.add(mesh(new THREE.CircleGeometry(2.8, 16).rotateY(Math.PI / 2), cel('dark'), -2.9, yc, zc + dz));
  for (const s of [-1, 1]) g.add(box(-3, 6, yc + s * 18.5 - 2, yc + s * 18.5 + 2, zc - 5, zc + 5, cel('silver')));
  return g;
}
const SOCK_A = { z: -50, y: 760 }, SOCK_B = { z: -210, y: 760 };     // dua stop kontak dinding di atas meja
wallSock(SOCK_A.z, SOCK_A.y); wallSock(SOCK_B.z, SOCK_B.y);

// ---------- meteran prabayar + kotak MCB (dari video listrik rumah) ----------
const METER = { z0: 430, z1: 610, y0: 1500, y1: 1800, d: 90 };
const MCB = { zc: 320, y0: 1585, y1: 1675, d: 72, hw: 9 };
const MBOX = { z0: 265, z1: 375, y0: 1520, y1: 1740, d: 84 };
const meter = new THREE.Group(); lt.add(meter);
const mBody = cel('body'), lcdMat = cel('lcd'), keyMat = cel('key'), ledMat = cel('red');
meter.add(rbox(0, METER.d, METER.y0, METER.y1, METER.z0, METER.z1, 10, mBody));
meter.add(rbox(METER.d - 4, METER.d + 2, 1680, 1790, 440, 600, 4, cel('grey')));
meter.add(box(METER.d + 1, METER.d + 3, 1700, 1760, 462, 578, cel('dark')), box(METER.d + 2.5, METER.d + 3.5, 1705, 1755, 467, 573, lcdMat));
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) meter.add(rbox(METER.d - 1, METER.d + 4, 1530 + r * 34, 1556 + r * 34, 468 + c * 36, 498 + c * 36, 3, keyMat));
meter.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 4, 16).rotateZ(Math.PI / 2), ledMat, METER.d + 2.5, 1772, 590));
const pvc = cel('pvc');
lt.add(tube([[12, 2420, 650], [12, 2300, 650], [12, 1450, 650], [14, 1405, 630], [20, 1400, 585], [24, 1425, 560]], 10, pvc));
lt.add(tube([[24, 1425, 470], [20, 1395, 455], [14, 1380, 420], [14, 1380, 360], [18, 1400, 335], [22, 1520, 335]], 8, pvc));
lt.add(tube([[22, 1520, 305], [20, 1495, 305], [8, 1475, 305], [-2, 1468, 305]], 8, pvc));
const mcb = new THREE.Group(); lt.add(mcb);
const boxMat = cel('box2');
mcb.add(box(0, 4, MBOX.y0, MBOX.y1, MBOX.z0, MBOX.z1, boxMat), box(0, MBOX.d, MBOX.y1 - 4, MBOX.y1, MBOX.z0, MBOX.z1, boxMat), box(0, MBOX.d, MBOX.y0, MBOX.y0 + 4, MBOX.z0, MBOX.z1, boxMat),
  box(0, MBOX.d, MBOX.y0, MBOX.y1, MBOX.z1 - 4, MBOX.z1, boxMat), box(0, MBOX.d, MBOX.y0, MBOX.y1, MBOX.z0, MBOX.z0 + 4, boxMat), box(4, 8, 1625, 1640, MBOX.z0 + 6, MBOX.z1 - 6, cel('steel')));
const mcbG = new THREE.Group(); mcbG.position.set(4, MCB.y0, MCB.zc); mcb.add(mcbG);
const PROF = [[0, 0], [56, 0], [56, 20], [64, 20], [64, 34], [72, 34], [72, 60], [64, 60], [64, 70], [56, 70], [56, 90], [0, 90]];
mcbG.add(prismXY(shp(PROF), -MCB.hw, MCB.hw, cel('body')));
mcbG.add(box(64.5, 65, 72, 84, -6, 6, cel('dark')));
const tog = new THREE.Group(); tog.position.set(66, 47, 0); mcbG.add(tog);
tog.add(rbox(-3, 16, -4, 4, -MCB.hw + 1.5, MCB.hw - 1.5, 2, cel('toggle')));
lt.add(tube([[22, 1524, 335], [26, 1560, 352], [34, 1705, 352], [30, 1678, MCB.zc + 4]], 2.4, cel('wireL')));
lt.add(tube([[30, 1588, MCB.zc + 4], [26, 1560, 305], [20, 1525, 305]], 2.4, cel('wireL')));

// ---------- meja + alat pemanas ----------
// Ciri dari foto produk: dispenser berdiri putih + galon biru muda terbalik (ceruk keran merah/biru, nampan tetes, pintu hijau);
// magic com (gentong putih bermotif bunga, tutup kubah, gagang angkat, panel tuas + 2 lampu); setrika kering (tapak krom runcing,
// badan hitam, gagang tertutup, kenop suhu); ketel listrik (badan stainless silinder agak meruncing, tutup + bibir hitam, gagang C
// hitam setinggi badan, corong kecil, alas pemanas hitam bulat, saklar lampu biru di pangkal gagang).
const TABLE = { x0: 20, x1: 300, z0: -720, z1: -400, h: 460 };
const tbl = new THREE.Group(); lt.add(tbl);
const wood = cel('wood');
tbl.add(rbox(TABLE.x0, TABLE.x1, TABLE.h - 22, TABLE.h, TABLE.z0, TABLE.z1, 4, wood));
for (const [x, z] of [[TABLE.x0 + 14, TABLE.z0 + 6], [TABLE.x1 - 14, TABLE.z0 + 6], [TABLE.x0 + 14, TABLE.z1 - 6], [TABLE.x1 - 14, TABLE.z1 - 6]]) tbl.add(box(x - 9, x + 9, 0, TABLE.h - 22, z - 4, z + 4, wood));
tbl.add(box(TABLE.x0 + 6, TABLE.x1 - 6, TABLE.h - 90, TABLE.h - 22, TABLE.z0 + 3, TABLE.z0 + 5, wood), box(TABLE.x0 + 6, TABLE.x1 - 6, TABLE.h - 90, TABLE.h - 22, TABLE.z1 - 5, TABLE.z1 - 3, wood));
tbl.scale.set(1.45, 1, 2.5); tbl.position.set(-10, 0, 800);                                         // meja: x 19..425, z −1000..−200
const TOP = TABLE.h;
const ALAT = {};
// dispenser berdiri + galon 19 L terbalik (di lantai, kiri meja)
{ const g = new THREE.Group(); lt.add(g); ALAT.disp = g; const zc = 1305; g.position.z = -1050;
  g.add(rbox(30, 340, 0, 960, 1150, 1460, 20, cel('acBody')));
  g.add(mesh(new THREE.CylinderGeometry(122, 128, 30, 48), cel('grey'), 185, 975, zc));
  g.add(rbox(328, 342, 560, 862, 1185, 1425, 10, cel('grey')));
  g.add(rbox(336, 352, 850, 872, 1178, 1432, 6, cel('acBody')));
  for (const [z, p] of [[1355, 'tapR'], [1255, 'tapB']]) g.add(rbox(340, 372, 752, 802, z - 22, z + 22, 8, cel(p)), mesh(new THREE.CylinderGeometry(7, 7, 26, 16), cel(p), 362, 740, z), rbox(368, 382, 772, 816, z - 13, z + 13, 4, cel(p)));
  g.add(rbox(318, 374, 560, 586, 1190, 1420, 8, cel('irBlue')));
  for (let z = 1205; z < 1410; z += 22) g.add(box(326, 366, 586, 587, z, z + 10, cel('tapB')));
  ALAT.dispLed = [];
  for (const [z, p] of [[1250, 'ledR'], [1305, 'ledG'], [1360, 'ledO']]) { const l = ledM(p, 341, 905, z); g.add(l); ALAT.dispLed.push(l); }
  g.add(box(339, 341, 928, 940, 1270, 1340, cel('grey')));
  g.add(rbox(332, 348, 90, 520, 1180, 1430, 12, cel('green')), box(346, 350, 300, 470, 1400, 1410, cel('dark')));
  const GAL = [[28, 0], [30, 55], [48, 72], [100, 96], [130, 128], [136, 155], [136, 240], [130, 250], [136, 262], [136, 360], [130, 370], [136, 382], [136, 462], [126, 486], [70, 494], [0, 496]];
  g.add(lathe(GAL, cel('gal'), 185, 950, zc), lathe(GAL.filter(p => p[1] >= 96 && p[1] <= 330).map(([r, h]) => [r + 1.5, h]).concat([[137.5, 330]]), cel('water'), 185, 950, zc)); }
const DISP = { x: 185, z: 255 };
// magic com
const RC = { x: 165, z: -830 };
{ const g = new THREE.Group(); lt.add(g); ALAT.rice = g; const xc = 200, zc = -720; g.position.set(RC.x - xc, 0, RC.z - zc);
  g.add(lathe([[0, 0], [104, 0], [110, 8], [118, 14], [125, 45], [128, 100], [126, 160], [122, 197], [0, 197]], cel('rcBody'), xc, TOP, zc));
  g.add(lathe([[0, 197], [124, 197], [127, 203], [122, 222], [105, 245], [75, 260], [35, 267], [0, 268]], cel('rcBody'), xc, TOP, zc));
  g.add(mesh(new THREE.TorusGeometry(125, 3, 8, 64).rotateX(Math.PI / 2), cel('grey'), xc, TOP + 198, zc));
  g.add(mesh(new THREE.TorusGeometry(132, 8, 10, 40, Math.PI).rotateY(Math.PI / 2).rotateZ(1.1), cel('grey'), xc, TOP + 172, zc));
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(16, 16, 10, 20).rotateX(Math.PI / 2), cel('grey'), xc, TOP + 172, zc + s * 128));
  g.add(rbox(316, 333, TOP + 196, TOP + 216, -742, -698, 7, cel('key')));
  g.add(rbox(320, 334, TOP + 52, TOP + 168, -758, -682, 16, cel('rcPanel')));
  g.add(rbox(330, 344, TOP + 64, TOP + 92, -736, -704, 5, cel('key')));
  ALAT.rcLed = ledM('ledR', 334, TOP + 140, -738, 6); g.add(ALAT.rcLed);
  g.add(ledM('ledO', 334, TOP + 140, -702, 6));
  [[42, 50], [-42, 130], [75, 140], [-75, 55], [110, 60], [-110, 150], [150, 120], [-150, 70]].forEach(([a, y]) => {
    const r = Math.PI * a / 180, R = 127 - Math.abs(y - 100) * 0.02, fl = new THREE.Group();
    for (let k = 0; k < 5; k++) fl.add(mesh(new THREE.CircleGeometry(8, 14), cel('flower'), 9 * Math.cos(k * 1.2566), 9 * Math.sin(k * 1.2566), 0));
    fl.add(mesh(new THREE.CircleGeometry(4.5, 12), cel('flowerC'), 0, 0, 0.3));
    fl.position.set(xc + Math.cos(r) * (R + 0.8), TOP + y, zc + Math.sin(r) * (R + 0.8)); fl.rotation.y = Math.atan2(Math.cos(r), Math.sin(r)); g.add(fl); }); }
// setrika kering (ujung runcing ke −z, tumit + kabel ke +z)
const IR = { x: 165, z: -330 };
{ const g = new THREE.Group(); lt.add(g); ALAT.iron = g; const xc = IR.x, zc = IR.z;
  const plan = k => shp([[-140, 0], [-110, -28], [-70, -48], [-20, -60], [60, -62], [100, -60], [108, -50], [108, 50], [100, 60], [60, 62], [-20, 60], [-70, 48], [-110, 28]].map(([z, x]) => [zc + z * k, xc + x * k]));
  const lay = (k, y0, y1, bv, mat) => mesh(new THREE.ExtrudeGeometry(plan(k), { depth: y1 - y0 - 2 * bv, bevelEnabled: true, bevelSize: bv, bevelThickness: bv, bevelSegments: 3, curveSegments: 16 }).applyMatrix4(UZX).translate(0, y0 + bv, 0), mat);
  g.add(lay(1, TOP, TOP + 20, 4, cel('silver')), lay(0.9, TOP + 20, TOP + 64, 10, cel('dark')));
  const hs = shp([[-96, 50], [-62, 122], [-38, 150], [78, 152], [100, 136], [102, 50]].map(([z, y]) => [zc + z, y]));
  hs.holes.push(shp([[-44, 66], [-28, 108], [70, 110], [76, 66]].map(([z, y]) => [zc + z, y])));
  g.add(mesh(new THREE.ExtrudeGeometry(hs, { depth: 22, bevelEnabled: true, bevelSize: 6, bevelThickness: 6, bevelSegments: 3 }).applyMatrix4(ZY), cel('dark'), xc + 11, TOP, 0));
  g.add(mesh(new THREE.CylinderGeometry(19, 21, 12, 28), cel('grey'), xc, TOP + 68, zc - 106), box(xc - 2, xc + 2, TOP + 74.2, TOP + 74.6, zc - 122, zc - 104, cel('red')));
  ALAT.irLed = ledM('ledO', xc + 46, TOP + 50, zc - 70, 4); g.add(ALAT.irLed);
  g.add(mesh(new THREE.CylinderGeometry(6, 8, 26, 14).rotateX(Math.PI / 2), cel('dark'), xc, TOP + 42, zc + 118)); }      // pelindung kabel di tumit
// ketel listrik (jug kettle stainless 1,7 L): Ø156 × 240 mm di atas alas Ø172
const KT = { x: 165, z: -570 };
{ const g = new THREE.Group(); lt.add(g); ALAT.kettle = g; const xc = KT.x, zc = KT.z, y0 = TOP;
  g.add(lathe([[0, 0], [84, 0], [86, 4], [86, 16], [80, 20], [0, 20]], cel('dark'), xc, y0, zc));
  g.add(lathe([[0, 20], [76, 20], [78, 24], [78, 40], [72, 196], [70, 202], [0, 202]], cel('kettle'), xc, y0, zc));
  g.add(lathe([[0, 196], [71, 196], [73, 202], [70, 214], [0, 214]], cel('dark'), xc, y0, zc));
  g.add(lathe([[0, 214], [64, 214], [58, 224], [36, 231], [0, 233]], cel('dark'), xc, y0, zc));
  g.add(rbox(xc - 10, xc + 10, y0 + 230, y0 + 242, zc - 34, zc + 12, 5, cel('dark')));
  g.add(mesh(new THREE.TorusGeometry(77, 2.2, 8, 64).rotateX(Math.PI / 2), cel('dark'), xc, y0 + 40, zc));
  const hs = shp([[-70, 52], [-112, 62], [-126, 110], [-124, 186], [-104, 214], [-66, 214], [-66, 198], [-92, 196], [-106, 176], [-108, 110], [-98, 78], [-72, 70]].map(([z, y]) => [zc + z, y0 + y]));
  g.add(prismZY(hs, xc + 15, 30, cel('dark'), 4));
  g.add(prismZY(shp([[66, 178], [96, 206], [98, 214], [66, 214]].map(([z, y]) => [zc + z, y0 + y])), xc + 20, 40, cel('dark'), 2));
  ALAT.ktLed = rbox(xc - 9, xc + 9, y0 + 64, y0 + 82, zc - 128, zc - 116, 3, cel('tapB')); g.add(ALAT.ktLed);
  g.add(box(xc + 70.5, xc + 72.5, y0 + 70, y0 + 150, zc - 6, zc + 6, cel('grey'))); }

// ---------- terminal 4 lubang (gaya Broco 15441 / Uticon), koordinat lokal: x lebar, y tinggi dari meja, z panjang ----------
// Ciri dari foto: tutup putih dengan sisi panjang miring (penampang trapesium), alas abu tua, saklar rocker merah persegi di satu
// ujung, 4 lubang bulat SNI berbibir sedikit menonjol, 2 lubang pin + klip arde di dinding lubang, kabel keluar dari ujung saklar.
// Dalamnya (foto dibongkar): 2 rel kuningan memanjang (fase belakang, netral depan) dengan sepasang daun penjepit per pin,
// rel arde baja di tengah dengan kait arde naik ke tiap lubang, sekrup.  ±300 × 64 × 44 mm, jarak lubang 58, pin Ø4,8 berjarak 19.
const XS = 340, ZS = -570, SL = 150, SZ = [72, 14, -44, -102], RREC = 18, HT = 44, RECD = 15, YREC = HT - RECD;
const SW = (x, y, z) => [x, y + TOP, z + ZS];                          // lokal terminal -> ruang
const SP = new THREE.Group(); SP.position.set(0, TOP, ZS); lt.add(SP);
const coverM = celC('cover', '#efe9dd'), baseM = celC('base', '#a3a6ad');
const XCUT = 20;                                                       // jendela belah: dinding depan (x > XS+20) dibuang
{ SP.add(prismZY(shp([[-SL, 0], [SL, 0], [SL, 8], [-SL, 8]]), XS + 32, 64, baseM, 2.5));
  const prof = [[XS - 32, 8], [XS + 32, 8], [XS + 25, HT], [XS - 25, HT]], profIn = [[XS - 29.5, 8], [XS + 29.5, 8], [XS + 23, HT - 3], [XS - 23, HT - 3]];
  const ring = shp(prof); ring.holes.push(shp(profIn));
  SP.add(prismXY(ring, -SL + 3, SL - 3, coverM));
  SP.add(prismXY(shp(prof), -SL, -SL + 3, coverM), prismXY(shp(prof), SL - 3, SL, coverM));
  const top = new THREE.Shape(); [[-SL + 3, XS - 25], [SL - 3, XS - 25], [SL - 3, XS + 25], [-SL + 3, XS + 25]].forEach(([z, x], i) => (i ? top.lineTo(z, x) : top.moveTo(z, x))); top.closePath();
  for (const zc of SZ) { const h = new THREE.Path(); h.absarc(zc, XS, RREC, 0, Math.PI * 2, true); top.holes.push(h); }
  SP.add(mesh(new THREE.ExtrudeGeometry(top, { depth: 3, bevelEnabled: false, curveSegments: 40 }).applyMatrix4(UZX), coverM, 0, HT - 3, 0));
  for (const zc of SZ) {
    SP.add(mesh(new THREE.TorusGeometry(RREC + 1.4, 1.5, 8, 48).rotateX(Math.PI / 2), coverM, XS, HT, zc));
    SP.add(mesh(new THREE.CylinderGeometry(RREC, RREC, RECD, 48, 1, true), celD('cupIn'), XS, YREC + RECD / 2, zc));
    const fl = new THREE.Shape(); fl.absarc(zc, XS, RREC, 0, Math.PI * 2, false);
    for (const dx of [-9.5, 9.5]) { const h = new THREE.Path(); h.absarc(zc, XS + dx, 2.7, 0, Math.PI * 2, true); fl.holes.push(h); }
    SP.add(mesh(new THREE.ExtrudeGeometry(fl, { depth: 2.5, bevelEnabled: false, curveSegments: 32 }).applyMatrix4(UZX), celC('cupIn', '#e9e4da'), 0, YREC - 2.5, 0));
  }
}
// saklar rocker merah di ujung kabel
const ZSW = 122;
SP.add(rbox(XS - 15, XS + 15, HT - 2, HT + 3, ZSW - 17, ZSW + 17, 2, celC('dark')));
const rocker = new THREE.Group(); rocker.position.set(XS, HT + 2, ZSW); SP.add(rocker);
rocker.add(rbox(-12, 12, 0, 6, -13, 13, 3, celC('rocker')));
rocker.add(box(-7, -3, 6, 6.4, -1, 1, cel('cover')));                                     // tanda "I"
// rel kuningan: fase (belakang, x = XS−15) dan netral (depan, x = XS+15), ruas dari ujung kabel ke lubang 1..4
const brassM = () => celC('brass', '#f3d27f');
const SEGZ = [SL - 6, ...SZ, -SL + 8];
const segMat = [[], [], [], []];
for (const xr of [XS - 15, XS + 15]) for (let i = 0; i < 4; i++) { const m = brassM(); segMat[i].push(m); SP.add(box(xr - 0.8, xr + 0.8, 10, 18, SEGZ[i + 1], SEGZ[i], m)); }
const leaves = [];
SZ.forEach((zc, i) => {
  const m = brassM(); const lv = { m, parts: [] }; leaves.push(lv);
  for (const sx of [-1, 1]) {                                                              // baris fase (−) & netral (+)
    const xp = XS + sx * 9.5;
    for (const s of [-1, 1]) {
      const lg = new THREE.Group(); lg.position.set(xp, 11, zc + s * 2.6); SP.add(lg);
      const sh = shp([[0, 0], [1.4 * s, 0], [1.6 * s, 6], [0.4 * s, 12], [1.6 * s, 15], [3.4 * s, 16.5], [2.6 * s, 17.2], [0.2 * s, 15.6], [-0.9 * s, 12], [0.2 * s, 6]]);
      lg.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: false }).applyMatrix4(ZY), m, 3, 0, 0));
      lv.parts.push({ lg, s, sx });
    }
    SP.add(box(Math.min(xp, XS + sx * 15), Math.max(xp, XS + sx * 15), 10, 12, zc - 4, zc + 4, m));   // kaki ke rel
  }
  SP.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 3, 16), celC('steel'), XS - 15, 19.5, zc + 9));
});
// rel arde baja di tengah + kait arde ke dinding tiap lubang
SP.add(box(XS - 1.2, XS + 1.2, 19, 23, -SL + 10, SL - 30, celC('steel')));
for (const zc of SZ) for (const s of [-1, 1]) SP.add(box(XS - 1.2, XS + 1.2, 21, YREC + 10, zc + s * (RREC - 1.2) - 1, zc + s * (RREC - 1.2) + 1, celC('silver')));
SP.add(box(XS - 9, XS + 9, 8, 15, SL - 30, SL - 20, celC('dark')));                       // klem kabel

// ---------- steker SNI (bulat Ø35, dua pin Ø4,8 × 19 mm berjarak 19, kontak arde di samping, cincin cengkram berusuk, ekor kabel) ----------
const TAU = Math.PI * 2;
function makePlug(pal) {
  const g = new THREE.Group(), m = cel(pal);
  g.add(lathe([[0, 0], [17, 0], [17.5, 1.5], [17.5, 16], [20.5, 17], [21.5, 19], [21.5, 30], [19, 36], [10, 40], [6.5, 58], [0, 58]], m, 0, 0, 0, 40));
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + 0.26; const r = mesh(new THREE.BoxGeometry(2.4, 10, 2.4), m, Math.cos(a) * 21.6, 24.5, Math.sin(a) * 21.6); r.rotation.y = -a; g.add(r); }
  const pm = cel('silver');
  for (const dx of [-9.5, 9.5]) g.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 17, 16), pm, dx, -8.5, 0), mesh(new THREE.SphereGeometry(2.4, 12, 8), pm, dx, -17, 0));
  for (const s of [-1, 1]) g.add(box(-4, 4, 2, 14, s * 17.4 - 0.5, s * 17.4 + 0.5, pm));
  return g;
}
const PLUG = {};
for (const [k, a] of Object.entries(ALATD)) { const p = makePlug(a.plug); p.position.set(XS, YREC, SZ[a.sock]); SP.add(p); PLUG[k] = p; }
const plugWall = makePlug('plugB'); plugWall.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));
plugWall.position.set(-3, SOCK_A.y, SOCK_A.z); lt.add(plugWall);
const QWALL = plugWall.quaternion.clone();

// ---------- kabel (koordinat ruang; tube dibangun ulang saat steker bergerak) ----------
const Y1 = TOP + 4;                                                     // kabel rebah di meja
function cordPts(k, pos) {
  const [px, py, pz] = pos || [0, 0, 0];
  const top = [px, py + 58, pz], up = (dz, dx = 0) => [px + dx, py + 92, pz + dz];
  return {
    iron: [top, up(6), [px - 26, Y1 + 6, pz + 40], [300, Y1, -400], [262, Y1, -262], [215, Y1 + 8, -205], [IR.x + 6, TOP + 42, IR.z + 128]],
    disp: [top, up(8, 6), [px + 30, Y1 + 6, pz + 46], [404, Y1, -400], [428, TOP - 4, -320], [432, 240, -290], [430, 3.5, -160], [260, 3.5, 40], [90, 3.5, 140], [40, 60, DISP.z - 120]],
    kettle: [top, up(-6, -6), [px - 30, Y1 + 6, pz - 26], [262, Y1, -680], [170, Y1, -684], [96, Y1 + 2, -650], [KT.x - 84, TOP + 10, KT.z - 30]],
    rice: [top, up(-8, -6), [px - 26, Y1 + 6, pz - 30], [300, Y1, -740], [262, TOP + 30, -748]],
    main: [SW(XS, 18, SL), SW(XS, 14, SL + 26), [358, Y1, -360], [380, Y1, -262], [320, Y1, -212], [120, Y1, -205], [40, TOP + 30, -150], [32, SOCK_A.y - 90, SOCK_A.z - 10], [58, SOCK_A.y, SOCK_A.z]],
  }[k];
}
const cordCurve = {}, cordMesh = {};
function setCord(k, pts, pal, r = 3.4) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', 0.35); cordCurve[k] = c;
  const geo = new THREE.TubeGeometry(c, 160, r, 10);
  if (!cordMesh[k]) { cordMesh[k] = mesh(geo, cel(pal)); lt.add(cordMesh[k]); }
  else { cordMesh[k].geometry.dispose(); cordMesh[k].geometry = geo; }
}
setCord('main', cordPts('main'), 'cordB', 4.2);

// bayangan kontak (bidang bergradien) di meja & lantai
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.5)'); g.addColorStop(.55, 'rgba(34,30,66,.22)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.position.set(x, y, z); m.userData.decal = true; lt.add(m); return m; };
blob(RC.x, TOP + 0.6, RC.z, 165, 165); blob(IR.x, TOP + 0.6, IR.z, 95, 165); blob(KT.x, TOP + 0.6, KT.z, 112, 112); blob(XS, TOP + 0.6, ZS, 60, 190);

// sisi dalam pucat (bidang potong) untuk semua bahan celC
{ const add = []; lt.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.back) add.push(o); });
  for (const o of add) { const b = new THREE.Mesh(o.geometry, o.material.userData.back); b.userData.backOf = true; o.add(b); } }

// titik penanda
const mk = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const MK = {
  label: mk(SP, XS + 22, HT, -SL + 40), rocker: mk(SP, XS + 12, HT + 8, ZSW), seg0: mk(SP, XS + 15, 18, (SEGZ[0] + SEGZ[1]) / 2),
  leafK: mk(SP, XS + 9.5, 26, SZ[2]), plugK: mk(SP, XS + 20, HT + 40, SZ[2]), plugR: mk(SP, XS + 20, HT + 40, SZ[3]),
  mcb: mk(lt, MBOX.d, 1640, MCB.zc - 40), sockB: mk(lt, 40, SOCK_B.y + 40, SOCK_B.z),
};

// ---------- jadwal ----------
const tPlug = { rice: T(0, 'rice'), disp: T(0, 'dispenser'), iron: T(0, 'setrika'), kettle: T(0, 'ketel') };
const tOn = { rice: T(3, 'rice'), disp: T(4, 'empat'), iron: T(4, 'empat') + 0.35, kettle: T(4, 'bareng') };
const T_CUT = T(1, 'bongkar');
const T_HEAT = T(5, 'panasnya');
const T_SOFT = T(6, 'melunak'), T_YEL = T(6, 'menguning'), T_LOOSE = T(6, 'kendur'), T_SPARK = T(6, 'percikan');
const T_SMELL = T(7, 'bau'), T_MELT = T(7, 'meleleh'), T_FIRE = T(7, 'api');
const T_MCB = T(8, 'turun');
const T_CEK = T(9, 'cek'), T_SATU = T(9, 'satu'), T_MOVE = T(9, 'stop');
const BRANCH = L[8].s - 0.15;                                  // cabang "beruntung": terminal kembali utuh, MCB turun
const heatKeys = [[0, 0], [T_HEAT - 0.3, 0.15], [T_HEAT + 1.2, 0.75], [T_SOFT, 0.85], [T_FIRE, 1], [BRANCH, 1], [BRANCH + 0.01, 0.55, 'c'], [T_MCB, 0.55], [T_MCB + 1.6, 0]];
const scorchKeys = [[0, 0], [T_SOFT - 0.1, 0], [T_YEL + 0.6, 0.75], [T_SMELL, 0.9], [T_MELT, 1], [BRANCH, 1], [BRANCH + 0.01, 0, 'c']];
const looseKeys = [[0, 0], [T_LOOSE - 0.2, 0], [T_LOOSE + 0.5, 1], [BRANCH, 1], [BRANCH + 0.01, 0, 'c']];
const meltKeys = [[0, 0], [T_MELT - 0.1, 0], [T_MELT + 1.0, 1], [BRANCH, 1], [BRANCH + 0.01, 0, 'c']];
const fireKeys = [[0, 0], [T_FIRE - 0.15, 0], [T_FIRE + 0.25, 1], [BRANCH - 0.2, 1], [BRANCH + 0.1, 0]];
const smokeKeys = [[0, 0], [T_SMELL - 0.3, 0], [T_SMELL + 0.4, 1], [BRANCH - 0.2, 1], [BRANCH + 0.1, 0]];
const darkKeys = [[0, 0], [T_SMELL - 0.2, 0], [T_FIRE, 0.8], [BRANCH - 0.2, 0.8], [BRANCH + 0.3, 0], [T_MCB + 0.1, 0, 'c'], [T_MCB + 0.12, 0.85, 'c'], [L[9].s - 0.2, 0.85], [L[9].s + 0.3, 0]];
const cutKeys = [[0, 34], [T_CUT - 0.1, 34], [T_CUT + 0.8, XCUT], [BRANCH - 0.3, XCUT], [BRANCH + 0.3, 34]];   // bidang potong menyapu masuk lalu keluar
const mcbKeys = [[0, 0], [T_MCB - 0.05, 0], [T_MCB + 0.12, 1, 'c'], [L[9].s - 0.3, 1], [L[9].s + 0.2, 0]];
const moveKeys = [[0, 0], [T_MOVE - 0.6, 0], [T_MOVE + 1.0, 1], [DUR, 1]];
const onAt = (k, t) => {
  if (t > T_MCB && t < L[9].s + 0.2) return 0;
  if (t >= L[9].s + 0.2) return k === 'kettle' ? (t > T_MOVE + 1.0 ? 1 : 0) : 1;
  return t >= tOn[k] ? 1 : 0;
};
const plugAt = (k, t) => smooth(tPlug[k] - 0.05, tPlug[k] + 0.35, t);

// ---------- kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x] (koordinat ruang) ----------
const C_ = (x, y, z, h, az, el, ay = 0.5, so = 0.4) => [z, y, h, az, el, 0.5, ay, so, x];
const SHOT = {
  hook: C_(XS, TOP + 30, ZS, 380, 60, 56, 0.52, 0.5),
  hook2: C_(XS, TOP + 30, ZS, 450, 62, 48, 0.52, 0.5),
  wide: C_(250, 600, -560, 1500, 62, 16, 0.44, 0.2),
  cut: C_(XS + 10, TOP + 22, ZS - 10, 290, 78, 8, 0.56, 0.5),
  cutK: C_(XS + 10, TOP + 22, ZS - 44, 240, 80, 8, 0.56, 0.55),
  label: C_(XS, TOP + 40, ZS - 60, 340, 64, 42, 0.5, 0.5),
  sum: C_(250, 600, -560, 1300, 62, 18, 0.5, 0.2),
  mcb: C_(70, 1630, 320, 560, 76, 6, 0.5, 0.5),
  tip: C_(240, 580, -290, 1460, 72, 18, 0.62, 0.3),
  end: C_(250, 640, -480, 1650, 62, 16, 0.46, 0.2),
};
const camKeys = [
  [0, SHOT.hook], [L[0].e - 0.5, SHOT.hook2], [L[0].e + 0.5, SHOT.wide], [T_CUT - 0.5, SHOT.wide],
  [T_CUT + 0.9, SHOT.cut], [L[1].e + 0.3, SHOT.cut], [L[2].s + 0.6, SHOT.label], [L[2].e + 0.2, SHOT.label],
  [L[3].s + 0.7, C_(XS + 10, TOP + 26, ZS - 90, 270, 78, 10, 0.5, 0.5)], [L[3].e, C_(XS + 10, TOP + 26, ZS - 90, 260, 78, 10, 0.5, 0.5)],
  [L[4].s + 0.8, SHOT.sum], [L[4].e - 0.2, SHOT.sum], [L[5].s + 0.5, SHOT.cut], [L[5].e, SHOT.cutK], [T_SMELL, SHOT.cutK],
  [T_FIRE + 0.3, C_(XS, TOP + 40, ZS - 44, 380, 70, 20, 0.64, 0.5)], [BRANCH, C_(XS, TOP + 40, ZS - 44, 390, 70, 20, 0.64, 0.5)],
  [T_MCB - 0.4, SHOT.mcb], [L[8].e + 0.2, SHOT.mcb], [L[9].s + 0.9, SHOT.tip], [L[9].e + 0.3, SHOT.tip],
  [L[10].s + 1.0, SHOT.end], [DUR, SHOT.end],
];

// ---------- label, teks kinetik, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(2, 'sepuluh'), L[2].e + 0.3, `${BATAS_A} A · 250 V`, () => MK.label, 'r', 'hi');
tag(T(3, 'aman') - 0.1, L[3].e, `${fmt(ALATD.rice.I)} A`, () => MK.plugR, 'r', 'ok');
tag(T(5, 'arusnya'), L[5].e, `${fmt(TOTAL_I)} A lewat sini`, () => MK.seg0, 'l', 'warn');
tag(T_LOOSE, T_SMELL - 0.1, 'Penjepit kendur', () => MK.leafK, 'r', 'warn');
tag(T_MCB, L[8].e + 0.2, 'MCB turun', () => MK.mcb, 'r', 'hi');
tag(T_MOVE + 0.6, L[9].e + 0.2, 'Ketel: stop kontak sendiri', () => MK.sockB, 'r', 'ok');
const stampDefs = [
  [T(0, 'satu'), L[0].e + 0.2, '4 colokan!', 360, 'snd'],
  [T(4, 'hampir') + 0.2, L[4].e + 0.3, `${fmt(TOTAL_I)} ampere!`, 1060, ''],
  [T_FIRE, BRANCH - 0.3, 'API!', 330, ''],
  [T(10, 'hitung'), DUR + 1, 'Hitung|wattnya', 330, 'snd'],
];
const FORMAT = { kalau: { t: T(1, 'apa'), e: L[8].e + 0.3, kondisi: '4 pemanas di 1 terminal', tahap: [
  { t: T(1, 'apa') + 0.2, nama: 'Belum nyala', level: 0.03 },
  { t: L[3].s + 0.3, nama: `Aman · ${fmt(ALATD.rice.I)} A`, level: 0.16 },
  { t: T(4, 'hampir'), nama: `${fmt(TOTAL_I)} A · lewat batas`, level: 0.45 },
  { t: T_HEAT, nama: `Panas ${Math.round(RASIO_P)}×`, level: 0.62 },
  { t: T_SPARK, nama: 'Percikan', level: 0.8 },
  { t: T_FIRE, nama: 'API!', level: 1 },
  { t: T_MCB, nama: 'MCB turun · selamat', level: 0.2 },
] } };
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
const S = { on: 1, I: 0, heat: 0, scorch: 0, loose: 0, melt: 0, fire: 0, smoke: 0, dark: 0, trip: 0, Iseg: [0, 0, 0, 0] };
let lastPlugKey = '';
function updateModel(t) {
  S.heat = track(heatKeys, t); S.scorch = track(scorchKeys, t); S.loose = track(looseKeys, t); S.melt = track(meltKeys, t);
  S.fire = track(fireKeys, t); S.smoke = track(smokeKeys, t); S.dark = track(darkKeys, t); S.trip = track(mcbKeys, t);
  S.on = 1 - S.trip;
  // arus tiap alat & tiap ruas rel (ruas 0 = dari kabel ke lubang 1, membawa arus semua alat di terminal)
  const onStrip = k => onAt(k, t) * (k === 'kettle' && t > T_MOVE - 0.6 ? 0 : 1);
  const Ia = {}; for (const k in ALATD) Ia[k] = ALATD[k].I * onStrip(k);
  const bySock = [0, 0, 0, 0]; for (const k in ALATD) bySock[ALATD[k].sock] += Ia[k];
  for (let i = 0; i < 4; i++) S.Iseg[i] = bySock.slice(i).reduce((a, b) => a + b, 0);
  S.I = S.Iseg[0]; S.W = S.I * VOLT; S.Ia = Ia;
  // panas ∝ I²: warna kuningan per ruas & daun penjepit (lubang 3 = ketel: arus pin terbesar + penjepit kendur)
  for (let i = 0; i < 4; i++) segMat[i].forEach(m => m.hl('hot', clamp(Math.pow(S.Iseg[i] / BATAS_A, 2) * 0.8 * S.heat)));
  leaves.forEach((lv, i) => {
    const k = Object.keys(ALATD).find(q => ALATD[q].sock === i), Ipin = Ia[k];
    lv.m.hl('hot', clamp((Math.pow(S.Iseg[i] / BATAS_A, 2) * 0.5 + Math.pow(Ipin / 7, 2) * 0.6) * S.heat * (i === 2 ? 1.3 : 1)));
    const open = i === 2 ? S.loose : 0;
    lv.parts.forEach(({ lg, s }) => { lg.rotation.x = s * 0.2 * open; });
  });
  coverM.hl('scorch', S.scorch * 0.85);
  // steker: turun masuk lubang saat disebut; steker ketel miring saat plastik meleleh, lalu pindah ke stop kontak dinding B
  const mv = track(moveKeys, t);
  for (const k in PLUG) {
    const p = PLUG[k], u = plugAt(k, t), zc = SZ[ALATD[k].sock];
    p.position.set(XS, YREC + (1 - u) * 70, zc); p.quaternion.identity();
    if (k === 'kettle') {
      p.position.y -= 5 * S.melt; p.rotation.x = 0.2 * S.melt;
      if (mv > 0) {
        const a = smooth(0, 0.35, mv), b = smooth(0.3, 1, mv);
        const P0 = V(XS, YREC + 90 * a, zc), P1 = V(-3, SOCK_B.y - TOP, SOCK_B.z - ZS);
        p.position.copy(P0.clone().lerp(P1, b)); p.position.y += Math.sin(Math.PI * b) * 120;
        p.quaternion.copy(new THREE.Quaternion().slerp(QWALL, smooth(0.45, 1, mv)));
      }
    }
  }
  // kabel alat: bangun ulang hanya saat stekernya bergerak
  const key = Object.keys(PLUG).map(k => PLUG[k].position.toArray().map(v => v.toFixed(1)).join(',') + PLUG[k].quaternion.x.toFixed(3)).join('|');
  if (key !== lastPlugKey) {
    lastPlugKey = key;
    for (const k in PLUG) {
      const p = PLUG[k], pos = SW(p.position.x, p.position.y, p.position.z);
      let pts = cordPts(k, pos);
      if (k === 'kettle' && mv > 0.01) {
        const w = q => { const v = V(0, q, 0).applyQuaternion(p.quaternion).add(p.position); return SW(v.x, v.y, v.z); };
        const a = w(58), b2 = w(100);
        pts = [a, [b2[0], b2[1] - 10, b2[2]], [lerp(300, 120, smooth(0.4, 1, mv)), Y1 + 60 * Math.sin(Math.PI * mv), lerp(-640, -300, smooth(0.4, 1, mv))], [170, Y1, -684], [96, Y1 + 2, -650], [KT.x - 84, TOP + 10, KT.z - 30]];
      }
      setCord(k, pts, ALATD[k].plug === 'plugB' ? 'cordB' : 'cordW', 3.4);
    }
  }
  // lampu indikator alat & saklar terminal
  ALAT.rcLed.material.hl('yellow', 0); ALAT.rcLed.visible = onAt('rice', t) > 0;
  ALAT.dispLed.forEach((l, i) => (l.visible = onAt('disp', t) > 0 || i === 1));
  ALAT.irLed.visible = onAt('iron', t) > 0;
  ALAT.ktLed.material.hl('ledB', onAt('kettle', t));
  tog.rotation.z = lerp(0.4, -0.45, S.trip);
  // sorot alat saat disebut di hook & saat menyala
  const hi = { rice: pulse(tPlug.rice - 0.1, tPlug.rice + 0.9, t), disp: pulse(tPlug.disp - 0.1, tPlug.disp + 0.9, t), iron: pulse(tPlug.iron - 0.1, tPlug.iron + 0.9, t), kettle: pulse(tPlug.kettle - 0.1, tPlug.kettle + 0.9, t) };
  for (const k in ALAT) if (ALAT[k].traverse && hi[k] !== undefined) ALAT[k].traverse(o => { if (o.isMesh && o.material.glow) o.material.glow(hi[k] * 0.4); });
  // bidang potong
  const c = track(cutKeys, t);
  cutPlane.constant = c > 33.5 ? 1e5 : XS + c;
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
const shakeAt = t => (S.fire > 0.3 ? 4 * S.fire : 0) + 10 * pulse(T_MCB, T_MCB + 0.15, t, 0.05) + 6 * pulse(T_FIRE, T_FIRE + 0.2, t, 0.06);
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
  edge.mat.uniforms.dim.value = S.dark * 0.72;
  const sh = shakeAt(t);
  $('shake').style.transform = sh > 0.01 ? `translate(${(Math.sin(t * 71) * sh).toFixed(1)}px, ${(Math.cos(t * 53) * sh).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: ruang tamu (dinding, jendela, lampu, lantai kayu, karpet) ----------
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
const planeM = (o, u, v) => {
  const O = P2(o), U = P2([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = P2([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const WALL = () => planeM([0, 0, 0], [0, 0, -1], [0, -1, 0]);
function updateBg(t) {
  const zoom = 600 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.2) * 1.6, 0, 9).toFixed(2));
  const ang = t * 0.6;
  let s = `<g transform="${WALL()}">
    <rect x="-2600" y="-2800" width="5000" height="2800" fill="url(#plaster)"/>
    <rect x="-2600" y="-95" width="5000" height="95" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="4"/>
    <rect x="-1080" y="-2180" width="410" height="910" rx="8" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="-1060" y="-2160" width="370" height="870" fill="url(#sky)"/>
    <path d="M-1060 -1480q70 -50 140 -20t120 -40 110 30V-1290H-1060Z" fill="#a9cfa4"/>
    <path d="M-1060 -1420h140v-90l70 -50 70 50v90h90V-1290H-1060Z" fill="#d98c6a" stroke="#1b1a1f" stroke-width="3"/>
    ${Array.from({ length: 7 }, (_, k) => `<rect x="${-1050 + k * 52}" y="-2160" width="7" height="870" fill="#2e3036"/>`).join('')}
    <path d="M-1110 -2210h80c-10 140 10 600 -20 930h-60Z" fill="#c7a77d" stroke="#1b1a1f" stroke-width="3"/>
    <path d="M-720 -2210h80v930h-60c-30 -330 -10 -790 -20 -930Z" fill="#c7a77d" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="-1130" y="-2225" width="520" height="16" rx="8" fill="#6f5b45"/>
    <rect x="300" y="-1700" width="320" height="250" rx="6" fill="#6f5b45" stroke="#1b1a1f" stroke-width="5"/>
    <rect x="318" y="-1682" width="284" height="214" fill="#c9dfe8"/><path d="M318 -1468l90 -110 60 60 50 -40 84 90Z" fill="#7fae8a"/><circle cx="540" cy="-1630" r="20" fill="#f6dc8e"/>
    <circle cx="-250" cy="-2100" r="70" fill="#fbf8f2" stroke="#1b1a1f" stroke-width="6"/>
    <path d="M-250 -2100l${f1(Math.sin(ang / 12) * 36)} ${f1(-Math.cos(ang / 12) * 36)}M-250 -2100l${f1(Math.sin(ang) * 52)} ${f1(-Math.cos(ang) * 52)}" stroke="#1b1a1f" stroke-width="6" stroke-linecap="round"/>
    <g filter="url(#soft)" fill="#2a2a4a"><rect x="470" y="-2215" width="790" height="110" opacity=".28"/><rect x="1290" y="-1560" width="640" height="1560" opacity=".2"/><rect x="380" y="-500" width="440" height="500" opacity=".12"/><rect x="-60" y="-1010" width="130" height="600" opacity=".25"/></g>
    <path d="M340 -2060h60l30 70h-120Z" fill="#f6dc8e" stroke="#1b1a1f" stroke-width="4"/><rect x="364" y="-2100" width="12" height="40" fill="#1b1a1f"/>
  </g>`;
  { const c = P2([0, 1990, -370]), r = 900 * (1920 / CAM[2]) / 3; s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="url(#lampg)" opacity="${(0.85 * S.on).toFixed(3)}"/>`; }
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}"><rect x="0" y="-2200" width="2600" height="4400" fill="url(#ftile)"/>
    <rect x="520" y="-700" width="620" height="1300" rx="24" fill="#8a7a9c" opacity=".55"/><rect x="545" y="-675" width="570" height="1250" rx="16" fill="none" stroke="#e6dcc6" stroke-width="10" opacity=".7"/>
    <g filter="url(#soft)" fill="#2a2440"><rect x="30" y="-420" width="330" height="330" opacity=".45"/><rect x="20" y="200" width="410" height="800" opacity=".2"/></g></g>`;
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.92 * Math.max(S.dark, 0)).toFixed(3));
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
  updateInset(t);
}

// ---------- efek: tulisan rating di terminal, arus di kabel, uap, cahaya panas, percikan, asap, api ----------
function wave(x0, y0, len, amp, col, sw, op, dir = -1) { return `<path d="M${f1(x0)} ${f1(y0)} q${f1(amp)} ${f1(dir * len * 0.25)} 0 ${f1(dir * len * 0.5)} t0 ${f1(dir * len * 0.5)}" fill="none" stroke="${col}" stroke-width="${f1(sw)}" stroke-linecap="round" opacity="${op.toFixed(2)}"/>`; }
function updateFx(t) {
  let s = `<defs><radialGradient id="glo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".45" stop-color="#ff7a2e" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a1e" stop-opacity="0"/></radialGradient>
    <radialGradient id="soot"><stop offset="0" stop-color="#1a1410" stop-opacity=".85"/><stop offset=".6" stop-color="#2a2018" stop-opacity=".5"/><stop offset="1" stop-color="#2a2018" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  // tulisan rating dicetak di pelat atas terminal (dekat ujung tanpa saklar)
  { const m = planeM(SW(XS - 14, HT + 0.2, -SL + 92), [0, 0, -1], [1, 0, 0]);
    s += `<g transform="${m}"><text x="0" y="0" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800" font-size="7.5" fill="#6d6a63">10A 250V~</text><text x="0" y="10" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="6.5" fill="#6d6a63">MAKS 2200W</text></g>`; }
  // titik arus di kabel utama: kecepatan ∝ arus
  if (S.I > 0.05 && cordCurve.main) {
    const n = 14, sp = 0.05 * S.I;
    for (let k = 0; k < n; k++) { const u = ((k / n) - t * sp * 0.25) % 1, uu = u < 0 ? u + 1 : u; const p = cordCurve.main.getPointAt(uu); const [x, y] = project([p.x, p.y + 4, p.z]);
      const hotc = S.I > BATAS_A ? '#ff6a3d' : '#ffe27a';
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(clamp(3.2 * pxmm, 2, 9))}" fill="${hotc}" stroke="#1b1a1f" stroke-width="1.5" opacity=".9"/>`; }
  }
  // uap dari alat yang menyala
  const steam = (p, a, col, n = 3, len = 120) => { if (a <= 0.02) return ''; const [x, y] = project(p); let o = '';
    for (let k = 0; k < n; k++) { const ph = (t * 0.6 + k / n) % 1; o += wave(x + (k - (n - 1) / 2) * 16 * pxmm * len / 120, y - ph * 40 * pxmm * len / 120, len * pxmm, 8 * pxmm * len / 120, col, 4 * pxmm * len / 120, Math.sin(Math.PI * ph) * Math.min(1, a)); } return o; };
  s += steam([IR.x, TOP + 140, IR.z - 60], onAt('iron', t) * (1 - S.dark), '#ff9a5c', 3, 90);
  s += steam([RC.x, TOP + 285, RC.z], onAt('rice', t) * (1 - S.dark), '#ffffff', 3, 120);
  s += steam([KT.x, TOP + 260, KT.z + 90], onAt('kettle', t) * (1 - S.dark), '#ffffff', 3, 110);
  s += steam([362, 730, DISP.z + 50], onAt('disp', t) * 0.6 * (1 - S.dark), '#ffffff', 2, 80);
  // cahaya panas kuningan (tidak ikut redup): di ruas rel & daun penjepit, sebanding I²
  if (S.heat > 0.02 && track(cutKeys, t) < 30) {
    for (let i = 0; i < 4; i++) { const a = clamp(Math.pow(S.Iseg[i] / BATAS_A, 2) * S.heat) * 0.8; if (a < 0.03) continue;
      const z0 = SEGZ[i + 1], z1 = SEGZ[i];
      for (let q = 0; q < 3; q++) { const [x, y] = project(SW(XS + 15, 14, lerp(z0, z1, (q + 0.5) / 3))); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(16 * pxmm)}" fill="url(#glo)" opacity="${a.toFixed(2)}"/>`; } }
    { const [x, y] = project(SW(XS + 9.5, 22, SZ[2])); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((20 + 4 * Math.sin(t * 9)) * pxmm)}" fill="url(#glo)" opacity="${clamp(S.heat * 1.1).toFixed(2)}"/>`; }
  }
  // gelombang panas naik dari terminal
  if (S.heat > 0.3) { const [x, y] = project(SW(XS, HT + 10, 20)); for (let k = 0; k < 4; k++) { const ph = (t * 0.8 + k / 4) % 1;
    s += wave(x + (k - 1.5) * 30 * pxmm, y - ph * 50 * pxmm, 70 * pxmm, 6 * pxmm, '#ff8a4c', 3 * pxmm, Math.sin(Math.PI * ph) * (S.heat - 0.3)); } }
  // percikan di daun penjepit yang kendur (lubang 2 = ketel)
  if (S.loose > 0.5 && t > T_SPARK - 0.2 && t < BRANCH) {
    const ph = Math.floor(t * 12), on = hash(ph) > 0.45;
    if (on) { const [x, y] = project(SW(XS + 9.5, 27, SZ[2] + 2.5));
      let d = `M${f1(x)} ${f1(y)}`; for (let k = 0; k < 4; k++) d += ` l${f1((hash(ph, k) - 0.5) * 14 * pxmm)} ${f1(-(3 + hash(ph, k + 9) * 4) * pxmm)}`;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3.5 * pxmm)}" fill="#fffbe6" opacity=".95"/><path d="${d}" stroke="#ffffff" stroke-width="${f1(1.6 * pxmm)}" fill="none"/><path d="${d}" stroke="#7fd6ff" stroke-width="${f1(0.8 * pxmm)}" fill="none"/>`;
      for (let k = 0; k < 6; k++) { const a = hash(ph, k + 20) * TAU, r = (6 + hash(ph, k + 30) * 12) * pxmm; s += `<circle cx="${f1(x + Math.cos(a) * r)}" cy="${f1(y + Math.sin(a) * r)}" r="${f1(1.2 * pxmm)}" fill="#ffd27a"/>`; } }
  }
  // kilatan kecil saat steker masuk (hook)
  for (const k in tPlug) { const u = (t - tPlug[k] - 0.3) / 0.16; if (u < 0 || u > 1) continue;
    const [x, y] = project(SW(XS + 18, HT + 2, SZ[ALATD[k].sock])), r = (6 + 10 * u) * pxmm;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#fff3b0" opacity="${(0.9 * (1 - u)).toFixed(2)}"/>`;
    for (let q = 0; q < 6; q++) { const an = q / 6 * TAU + 0.4, r0 = r * 0.6, r1 = r * 1.6;
      s += `<path d="M${f1(x + Math.cos(an) * r0)} ${f1(y + Math.sin(an) * r0)}L${f1(x + Math.cos(an) * r1)} ${f1(y + Math.sin(an) * r1)}" stroke="#ffd27a" stroke-width="${f1(1.6 * pxmm)}" stroke-linecap="round" opacity="${(1 - u).toFixed(2)}"/>`; } }
  // jelaga & asap & api di lubang ketel
  if (S.scorch > 0.6) { const [x, y] = project(SW(XS, HT, SZ[2])); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(34 * pxmm * S.melt)}" ry="${f1(18 * pxmm * S.melt)}" fill="url(#soot)"/>`; }
  if (S.smoke > 0.02) { const [x, y] = project(SW(XS, HT + 60, SZ[2]));
    for (let k = 0; k < 5; k++) { const ph = (t * 0.35 + k / 5) % 1, xx = x + Math.sin(ph * 6 + k) * 18 * pxmm, yy = y - ph * 160 * pxmm;
      s += `<circle cx="${f1(xx)}" cy="${f1(yy)}" r="${f1((10 + ph * 26) * pxmm)}" fill="#5d5a62" opacity="${(Math.sin(Math.PI * ph) * 0.5 * S.smoke).toFixed(2)}"/>`; } }
  if (S.fire > 0.02) { const [x, y] = project(SW(XS + 10, HT + 2, SZ[2] - 6)), k = S.fire * pxmm;
    s += `<circle cx="${f1(x)}" cy="${f1(y - 30 * k)}" r="${f1(90 * k)}" fill="url(#glo)" opacity=".85"/>`;
    const fl = (sc, col, ph) => { const w = 26 * sc * k, h = (78 + 14 * Math.sin(t * 13 + ph)) * sc * k, sw = Math.sin(t * 9 + ph) * 8 * k;
      return `<path d="M${f1(x - w)} ${f1(y)} C${f1(x - w * 1.1)} ${f1(y - h * 0.45)} ${f1(x - w * 0.2 + sw)} ${f1(y - h * 0.6)} ${f1(x + sw * 1.5)} ${f1(y - h)} C${f1(x + w * 0.5 + sw)} ${f1(y - h * 0.55)} ${f1(x + w * 1.1)} ${f1(y - h * 0.4)} ${f1(x + w)} ${f1(y)} Z" fill="${col}" stroke="#1b1a1f" stroke-width="${f1(Math.max(2, 1.2 * k))}" stroke-linejoin="round"/>`; };
    s += fl(1.15, '#ff5a1e', 0) + fl(0.8, '#ffa53a', 1.3) + fl(0.45, '#ffe58a', 2.1);
    for (const [dz, sc, ph] of [[-22, 0.55, 3], [20, 0.6, 4.5]]) { const [x2, y2] = project(SW(XS + 10, HT + 2, SZ[2] + dz)); const w = 18 * sc * k, h = (60 + 10 * Math.sin(t * 11 + ph)) * sc * k;
      s += `<path d="M${f1(x2 - w)} ${f1(y2)} Q${f1(x2 - w * 0.4)} ${f1(y2 - h * 0.6)} ${f1(x2)} ${f1(y2 - h)} Q${f1(x2 + w * 0.4)} ${f1(y2 - h * 0.6)} ${f1(x2 + w)} ${f1(y2)}Z" fill="#ff8a2e" stroke="#1b1a1f" stroke-width="2"/>`; } }
  $('dim').innerHTML = s;
}

// ---------- kartu (inset atas, 130–530 px) ----------
const Fn = 'font-family="-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800"';
const CARDS = [
  { s: T(2, 'sepuluh') - 0.1, e: L[2].e + 0.3, k: 'BATAS TERMINAL' },
  { s: T(4, 'totalnya') - 0.2, e: L[4].e + 0.3, k: 'TOTAL DAYA 4 ALAT' },
  { s: T(5, 'arusnya') - 0.1, e: L[5].e + 0.4, k: 'PANAS DI KUNINGAN ∝ ARUS²' },
  { s: T_CEK - 0.1, e: L[9].e + 0.3, k: 'SEBELUM COLOK' },
];
function updateInset(t) {
  const el = $('inset');
  const ci = CARDS.findIndex(c => t > c.s - 0.2 && t < c.e + 0.2);
  const c = CARDS[ci], a = c ? pulse(c.s, c.e, t, 0.12) : 0;
  el.style.opacity = a;
  if (a <= 0.001) return;
  $('insetk').textContent = c.k;
  const tx = (x, y, s, size, col = '#1b1a1f', op = 1, anchor = 'start') => `<text x="${x}" y="${y}" ${Fn} font-size="${size}" fill="${col}" opacity="${op.toFixed(3)}" text-anchor="${anchor}">${s}</text>`;
  let g = '';
  if (ci === 0) {
    const q = smooth(T(2, 'kirakira') - 0.2, T(2, 'kirakira') + 0.3, t);
    g = tx(60, 170, `${BATAS_A} A × ${VOLT} V`, 64) + tx(60, 290, `= ${fmtW(BATAS_W)} W`, 92, '#9b2c3f', q) + tx(60, 350, 'batas aman yang tertulis di terminal', 30, '#7a7368', q);
  } else if (ci === 1) {
    const order = ['rice', 'disp', 'iron', 'kettle'], sc = 820 / 2800; let x = 60, acc = 0;
    order.forEach((k, i) => { const a2 = smooth(c.s + i * 0.35, c.s + i * 0.35 + 0.3, t), w = ALATD[k].W * sc * a2; acc += ALATD[k].W * a2;
      g += `<rect x="${f1(x)}" y="130" width="${f1(Math.max(0, w))}" height="70" fill="${['#f6dc8e', '#9fc7f0', '#c9b6e8', '#ff8a6b'][i]}" stroke="#1b1a1f" stroke-width="4"/>`;
      if (a2 > 0.5) g += tx(f1(x + w / 2), 240, `${ALATD[k].W}`, 28, '#1b1a1f', a2, 'middle');
      x += w; });
    const xl = 60 + BATAS_W * sc;
    g += `<path d="M${f1(xl)} 110V215" stroke="#c9373f" stroke-width="6" stroke-dasharray="10 7"/>` + tx(f1(xl - 8), 102, 'batas 2.200', 26, '#c9373f', 1, 'end');
    const q = smooth(T(4, 'hampir') - 0.2, T(4, 'hampir') + 0.3, t);
    g += tx(60, 320, `${fmtW(acc)} W`, 76, acc > BATAS_W ? '#c9373f' : '#1b1a1f') + tx(60, 395, `÷ ${VOLT} V = ${fmt(TOTAL_I)} A  (batas ${BATAS_A} A)`, 38, '#c9373f', q);
  } else if (ci === 2) {
    const q1 = smooth(c.s, c.s + 0.6, t), q2 = smooth(T(5, 'panasnya') - 0.1, T(5, 'panasnya') + 1.0, t), mx = 700;
    g = tx(60, 140, `1 rice cooker · ${fmt(ALATD.rice.I)} A`, 34) + `<rect x="60" y="160" width="${f1(Math.max(10, mx / RASIO_P * q1))}" height="48" rx="24" fill="#e3bf62" stroke="#1b1a1f" stroke-width="4"/>` + tx(90 + mx / RASIO_P, 196, '1×', 36) +
      tx(60, 270, `4 alat · ${fmt(TOTAL_I)} A (${fmt(RASIO_I)}× arus)`, 34, '#1b1a1f', q1) + `<rect x="60" y="290" width="${f1(Math.max(10, mx * q2))}" height="48" rx="24" fill="#e5484d" stroke="#1b1a1f" stroke-width="4"/>` +
      tx(f1(Math.min(780, 76 + mx * q2)), 380, `${Math.round(RASIO_P * q2)}× panas`, 40, '#c9373f', q2, 'end');
  } else {
    const rows = [[`Terminal: ${BATAS_A} A = ${fmtW(BATAS_W)} W`, T_CEK], [`Jumlahkan watt semua alat`, T_CEK + 0.6], [`1 alat pemanas, 1 stop kontak`, T_SATU]];
    rows.forEach(([s2, t0], i) => { const q = smooth(t0, t0 + 0.3, t); g += `<circle cx="84" cy="${150 + i * 100}" r="24" fill="#1f7a5c" opacity="${q.toFixed(2)}"/><path d="M73 ${150 + i * 100}l8 9 15-17" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity="${q.toFixed(2)}"/>` + tx(130, 162 + i * 100, s2, 42, '#1b1a1f', q); });
  }
  $('insetsvg').innerHTML = g;
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.userData.v0 = o.visible; const clip = o.material.clippingPlanes && o.material.clippingPlanes.length;
    if (o.userData.decal || o.userData.backOf) o.visible = false; o.material = clip ? normalMatClip : normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) { o.material = o.userData.m0; o.visible = o.userData.v0; } });
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); FMT.gambar(t, FORMAT, project); };
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  for (const k in tPlug) ev.push({ t: tPlug[k] + 0.3, type: 'klikTombol' }, { t: tPlug[k] + 0.31, type: 'percik', dur: 0.08 });
  ev.push({ t: L[0].e, type: 'whoosh' }, { t: T_CUT, type: 'whoosh' }, { t: T_CUT + 0.5, type: 'lid' });
  for (const k in tOn) ev.push({ t: tOn[k], type: 'blip' });
  ev.push({ t: T(4, 'empat'), type: 'hum', dur: BRANCH - T(4, 'empat') });
  ev.push({ t: T_HEAT, type: 'drone', dur: BRANCH - T_HEAT });
  CARDS.forEach(c => ev.push({ t: c.s, type: 'card' }));
  // percikan dari model: tiap kilatan (hash per 1/12 dtk) -> bunyi gemeretak
  for (let ph = Math.floor((T_SPARK - 0.2) * 12); ph < BRANCH * 12; ph++) if (hash(ph) > 0.45 && hash(ph - 1) <= 0.45) ev.push({ t: ph / 12, type: 'percik', dur: 0.14 });
  ev.push({ t: T_SMELL - 0.2, type: 'gelap' }, { t: T_FIRE, type: 'nyala' }, { t: T_FIRE + 0.2, type: 'api', dur: BRANCH - T_FIRE - 0.1 });
  ev.push({ t: BRANCH, type: 'whoosh' }, { t: T_MCB, type: 'cekrek' }, { t: T_MCB + 0.12, type: 'gelap' }, { t: L[9].s + 0.2, type: 'klikTombol' });
  ev.push({ t: T_MOVE + 1.0, type: 'klikTombol' }, { t: T_MOVE - 0.4, type: 'whoosh' }, { t: L[10].s, type: 'whoosh' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera, cutPlane };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(4).s); cue('drop', LN(5).s - 0.1); cue('build', LN(5).s + 0.8);
  cue('reveal', LN(7).s); cue('warm', LN(8).s); cue('dark', LN(8).s + 1.2); cue('resolve', LN(9).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(MK.plugK);
