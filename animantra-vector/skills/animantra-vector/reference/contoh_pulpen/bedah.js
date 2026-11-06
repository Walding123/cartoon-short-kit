// Video "Kok pulpen klik bisa gantian keluar-masuk?" — gaya video bedah (seperti resleting/kunci), palet mewah.
// Pulpen isometrik dibelah di bidang x=0 (sumbu pulpen = z, ujung tulis di +z). Satu model: dorongan D (mm) + sudut cincin (°)
// dari jadwal klik -> posisi isi tinta, pegas, tombol, angka readout, dan bunyi. renderAt(t) deterministik.
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
const L = Array.from({ length: 10 }, (_, i) => LN(i));
const DUR = +(L[9].e + 1.2).toFixed(3);
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, c] = keys[i], [t0, v0] = keys[i - 1];
    if (t < t1) return c ? v0 : (Array.isArray(v0) ? v0.map((v, k) => lerp(v, v1[k], easeIO((t - t0) / (t1 - t0)))) : lerp(v0, v1, easeIO((t - t0) / (t1 - t0))));
  }
  return keys[keys.length - 1][1];
}

// ---------- renderer & pass (cel + garis tinta) ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, preserveDrawingBuffer: true });
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
const NEAR = 1, FAR = 1200;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const quad = (frag, uniforms) => {
  const m = new THREE.ShaderMaterial({ uniforms, fragmentShader: frag, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }' });
  const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q);
  return { scene: s, mat: m };
};
const edge = quad(`
  uniform sampler2D tC, tN, tD; uniform vec2 px; uniform float r, far, zs; varying vec2 vUv;
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
    c = mix(c, mix(vec3(.102, .110, .165), c * .45, .45), ec * (1. - e) * .9);   // batas warna: gelap sewarna
    gl_FragColor = vec4(mix(c, vec3(.106, .102, .122), e), 1.);
  }`, { tC: { value: rtCol.texture }, tN: { value: rtNor.texture }, tD: { value: rtCol.depthTexture },
  px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, r: { value: 2.6 }, far: { value: FAR - NEAR }, zs: { value: 0.3 } });
const out = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`, { t: { value: rtComp.texture } });

// ---------- palet mewah, cel 3 nada ----------
const PAL = {
  lacquer: ['#b84256', '#8e2436', '#64172a'], gold: ['#f6dc8e', '#e3bf62', '#b8913a'], tin: ['#eeeae2', '#cfc8bb', '#a39b8d'],
  ivory: ['#fbf7ef', '#e9e0cf', '#c9bba3'], ink: ['#9fb2ea', '#3e5bb8', '#2a3f85'], groove: ['#6b5a52', '#544640', '#3d3330'],
  cutL: ['#f0dccd', '#f0dccd', '#f0dccd'], cam: ['#f6dc8e', '#e3bf62', '#b8913a'], plunger: ['#e8e1d4', '#c9bea9', '#9d917c'],
  hl: ['#f6dc8e', '#e3bf62', '#b8913a'], warn: ['#e79a63', '#c06a2e', '#8d4a1c'], ok: ['#5fae8c', '#1f7a5c', '#155a43'],
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
const cylZ = (r1, r2, h, n = 32) => new THREE.CylinderGeometry(r1, r2, h, n).rotateX(Math.PI / 2);   // sumbu z, r1 di -z

// ---------- model pulpen (mm; z = 0 di bibir atas badan, +z ke ujung tulis) ----------
const root = new THREE.Group(); scene.add(root);
const pen = new THREE.Group(); root.add(pen);
pen.rotation.set(0.8, -0.3, 0, "YXZ");   // ujung tulis ke kiri-bawah, tombol kanan-atas, bidang potong menghadap kamera
// setengah benda putar (x ≤ 0) + muka potong di bidang x=0
function halfLathe(prof, mat, cutMat, seg = 56) {
  const g = new THREE.Group();
  const lat = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), seg, Math.PI, Math.PI).rotateX(Math.PI / 2);
  const m = new THREE.Mesh(lat, mat); g.add(m); g.userData.lathe = lat;
  if (cutMat) for (const sg of [1, -1]) {
    const sh = new THREE.ShapeGeometry(new THREE.Shape(prof.map(([r, z]) => new THREE.Vector2(z, r))));
    const pa = sh.attributes.position.array, n = pa.length / 3, np = new Float32Array(n * 3), nn = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { np[i * 3] = 0.003; np[i * 3 + 1] = sg * pa[i * 3 + 1]; np[i * 3 + 2] = pa[i * 3]; nn[i * 3] = 1; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(np, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
    geo.setIndex(sh.index); g.add(new THREE.Mesh(geo, cutMat));
  }
  return g;
}
const BARREL = [[5.2, 0], [5.2, 106], [4.7, 113], [2.3, 126], [1.6, 128], [1.0, 128], [1.0, 125.6], [3.5, 113.5], [4.25, 108],
  [4.25, 15.0], [2.85, 15.0], [2.85, 12.6], [4.25, 12.6], [4.25, 2.0], [3.0, 2.0], [3.0, 0]];
const shellL = new THREE.Group(), shellR = new THREE.Group(); pen.add(shellL, shellR);
const lacq = cel('lacquer'), cutMat = cel('cutL'), goldMat = cel('gold');
shellL.add(halfLathe(BARREL, lacq, cutMat));
const ringProf = (z0, z1) => [[5.2, z0], [5.45, z0 + 0.4], [5.45, z1 - 0.4], [5.2, z1]];
shellL.add(halfLathe(ringProf(0, 3.2), goldMat, null), halfLathe(ringProf(100, 106), goldMat, null));
const sr = halfLathe(BARREL, lacq, null); sr.scale.x = -1; shellR.add(sr);
for (const [a, b] of [[0, 3.2], [100, 106]]) { const r = halfLathe(ringProf(a, b), goldMat, null); r.scale.x = -1; shellR.add(r); }
// klip emas di atas badan
const clip = new THREE.Group(); pen.add(clip);
clip.add(mesh(new THREE.BoxGeometry(2.6, 1.0, 40), goldMat, 0, 6.1, 22));
clip.add(mesh(new THREE.BoxGeometry(2.6, 1.6, 3), goldMat, 0, 5.6, 2.2));
clip.add(mesh(new THREE.SphereGeometry(1.4, 16, 10), goldMat, 0, 5.6, 41.5));

// dinding dalam: 4 tonjolan pendek (sudut 45°+90°k) dan 4 alur panjang (0°+90°k); cuma yang di sisi x ≤ 0 yang kelihatan
const Z0 = 14.6;                          // puncak cincin saat ujung masuk (nempel ke cincin penahan)
const LUG = 7, TAB_TOP = Z0 + LUG + 5.5;  // tonjolan menahan cincin saat ujung keluar (D = 5,5)
const tabMat = cel('gold'), grooveMat = cel('groove');
const tabs = [], grooves = [];
const onWall = (o, ang, r) => { o.position.set(r * Math.cos(ang), r * Math.sin(ang), o.position.z); o.rotation.z = ang; };
for (let k = 0; k < 4; k++) {
  const aTab = Math.PI / 4 + k * Math.PI / 2, aGr = k * Math.PI / 2;
  if (Math.cos(aTab) < 0.2) {
    const g = new THREE.Group();
    const sh = new THREE.Shape(); sh.moveTo(-1.2, 0); sh.lineTo(1.2, 0); sh.lineTo(1.2, 4.5); sh.lineTo(-1.2, 4.5); sh.closePath();
    // tonjolan: balok + puncak miring (gigi gergaji)
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 4.0), tabMat); box.position.set(0, 0, TAB_TOP + 2.0); g.add(box);
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 1.2), tabMat); wedge.position.set(0, -0.5, TAB_TOP - 0.3); wedge.rotation.x = -0.45; g.add(wedge);
    pen.add(g); onWall(g, aTab, 3.75); g.position.z = 0; tabs.push(g);
  }
  if (Math.cos(aGr) < 0.2) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 22), grooveMat); s.position.z = 16 + 11; pen.add(s);
    onWall(s, aGr, 4.15); grooves.push(s);
  }
}

// gerigi: cincin gigi gergaji (n gigi, naik landai lalu turun tegak); arah +1 = gigi menghadap -z (ke atas)
function sawRing(rIn, rOut, n, h, dir) {
  const P = [];
  const v = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
  const quadF = (a, b, c, d) => P.push(...a, ...b, ...c, ...a, ...c, ...d);
  const seg = 6;
  for (let k = 0; k < n; k++) {
    const a0 = k * 2 * Math.PI / n, a1 = (k + 1) * 2 * Math.PI / n;
    for (let s = 0; s < seg; s++) {
      const u0 = s / seg, u1 = (s + 1) / seg, b0 = lerp(a0, a1, u0), b1 = lerp(a0, a1, u1), z0 = -dir * h * u0, z1 = -dir * h * u1;
      quadF(v(rIn, b0, z0), v(rOut, b0, z0), v(rOut, b1, z1), v(rIn, b1, z1));          // permukaan miring
      quadF(v(rOut, b0, 0), v(rOut, b1, 0), v(rOut, b1, z1), v(rOut, b0, z0));            // sisi luar
      quadF(v(rIn, b0, 0), v(rIn, b0, z0), v(rIn, b1, z1), v(rIn, b1, 0));                // sisi dalam
    }
    quadF(v(rIn, a1, 0), v(rIn, a1, -dir * h), v(rOut, a1, -dir * h), v(rOut, a1, 0));    // muka tegak
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  return g;
}
// cincin bergigi (cam): badan + gigi di atas + 4 sayap (lug) yang naik-turun di tonjolan/alur
const camMat = cel('cam'), lugMat = cel('cam');
const cam = new THREE.Group(); pen.add(cam);
cam.add(mesh(cylZ(3.1, 3.1, LUG, 40).translate(0, 0, LUG / 2), camMat));
cam.add(mesh(sawRing(1.4, 3.1, 8, 1.5, 1), camMat));
const lugs = [];
for (let k = 0; k < 4; k++) {
  const l = new THREE.Group(); cam.add(l);
  const b = mesh(new THREE.BoxGeometry(1.1, 1.8, 2.4), lugMat, 3.55, 0, LUG - 1.2); l.add(b);
  const w = mesh(new THREE.BoxGeometry(1.1, 1.8, 0.9), lugMat, 3.55, 0.45, LUG - 0.05); w.rotation.x = -0.5; l.add(w);
  l.rotation.z = k * Math.PI / 2; lugs.push(l);
}
// tombol + batang pendorong dengan gigi di bawah
const plMat = cel('plunger');
const plunger = new THREE.Group(); pen.add(plunger);
plunger.add(mesh(cylZ(2.6, 2.6, 26, 32).translate(0, 0, -13), plMat));
plunger.add(mesh(sawRing(1.4, 2.6, 8, 1.5, -1).translate(0, 0, 0), plMat));
const cap = mesh(cylZ(3.6, 3.6, 6, 40).translate(0, 0, -23), goldMat); plunger.add(cap);
const capTop = mesh(new THREE.SphereGeometry(3.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1, 0.45).translate(0, 0, -26), goldMat); plunger.add(capTop);
// isi tinta: tabung + ujung logam + bola 0,7 mm; cincin bahu buat pegas
const inkMat = cel('ink'), tinMat = cel('tin');
const refill = new THREE.Group(); pen.add(refill);
const RTOP = Z0 + LUG;                                 // puncak isi saat D = 0
refill.add(mesh(cylZ(1.45, 1.45, 108 - RTOP, 28).translate(0, 0, (108 + RTOP) / 2 - RTOP), inkMat));
refill.add(mesh(cylZ(1.45, 0.55, 16.2, 28).translate(0, 0, 108 + 8.1 - RTOP), tinMat));
const ball = mesh(new THREE.SphereGeometry(0.35, 20, 14), tinMat, 0, 0, 124.65 - RTOP); refill.add(ball);
refill.add(mesh(cylZ(2.2, 2.2, 0.8, 28).translate(0, 0, 93 - RTOP), tinMat));
// pegas: dibangun ulang tiap frame (panjang berubah)
class Helix extends THREE.Curve {
  constructor(len) { super(); this.len = len; }
  getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * 9; return o.set(Math.cos(a) * 2.0, Math.sin(a) * 2.0, t * this.len); }
}
const springMat = cel('tin');
const spring = new THREE.Mesh(new THREE.BufferGeometry(), springMat); spring.frustumCulled = false; pen.add(spring);
const SPRING_END = 112.5;

// ---------- jadwal klik: [mulai tekan, lepas, hasil 'out'/'in', lambat?] ----------
const clicks = [
  { p: T(0, 'klik', 0) - 0.12, r: T(0, 'klik', 0) + 0.12, to: 'out' },
  { p: T(0, 'klik', 1) - 0.12, r: T(0, 'klik', 1) + 0.12, to: 'in' },
  { p: T(3, 'ditekan') - 0.1, r: T(5, 'lepas'), to: 'out', slow: true },
  { p: T(6, 'klik') - 0.05, r: T(6, 'masuk') - 0.2, to: 'in', slow: true },
  { p: T(8, 'klik') - 0.12, r: T(8, 'klik') + 0.12, to: 'out' },
  { p: T(8, 'masuk') - 0.12, r: T(8, 'masuk') + 0.12, to: 'in' },
  { p: T(9, 'klik', 0) - 0.12, r: T(9, 'klik', 0) + 0.12, to: 'out' },
  { p: T(9, 'klik', 1) - 0.12, r: T(9, 'klik', 1) + 0.12, to: 'in' },
];
// rentang reset (potongan) — kembali ke ujung masuk & sudut 0 dari awal adegan
const D_IN = 0, D_OUT = 5.5, D_PRESS = 7.2;
function mech(t) {
  let D = D_IN, ang = 0, phase = 'in';
  for (const c of clicks) {
    if (t < c.p) break;
    const from = D;
    const pressT = c.slow ? Math.max(0.5, Math.min(1.4, (c.r - c.p) * 0.35)) : 0.1;
    const relT = c.slow ? (c.to === 'in' ? 0.25 : 0.4) : 0.1;
    if (t < c.p + pressT) { const u = easeIO((t - c.p) / pressT); D = lerp(from, D_PRESS, u); ang += 22.5 * smooth(0.6, 1, u); phase = 'press'; return { D, ang, phase }; }
    if (t < c.r) { D = D_PRESS; ang += 22.5; phase = 'press'; return { D, ang, phase }; }
    // lepas: naik, geser setengah gigi lagi; kalau ketemu tonjolan berhenti di D_OUT, kalau alur naik terus ke D_IN
    const target = c.to === 'out' ? D_OUT : D_IN;
    const fall = c.slow && c.to === 'in' ? T(7, 'naik') + 0.2 : c.r + relT + (c.to === 'in' ? 0.08 : 0);
    if (t < c.r + relT) { const u = easeIO((t - c.r) / relT); D = lerp(D_PRESS, c.to === 'out' ? D_OUT : D_OUT - 0.4, u); ang += 22.5 + 22.5 * u; phase = 'rel'; return { D, ang, phase }; }
    ang += 45;
    if (c.to === 'in' && t < fall) { D = D_OUT - 0.4; phase = 'hold'; return { D, ang, phase }; }
    if (c.to === 'in' && t < fall + 0.12) { D = lerp(D_OUT - 0.4, D_IN, easeIO((t - fall) / 0.12)); return { D, ang, phase: 'up' }; }
    D = target; phase = c.to;
  }
  return { D, ang, phase };
}
const springBoing = t => { let a = 0; for (const c of clicks) { const f = c.to === 'in' ? (c.slow ? T(7, 'naik') + 0.32 : c.r + 0.3) : null; if (f && t > f && t < f + 0.6) a = Math.sin((t - f) * 40) * 0.5 * (1 - (t - f) / 0.6); } return a; };

// ---------- adegan ----------
const splitKeys = [[0, 0], [T(1, 'bongkar') - 0.05, 0], [at(1, 'dalemnya').e + 0.3, 1], [L[8].s - 0.1, 1], [L[8].s - 0.1, 0, 'c']];
// kamera: [t, [z sumbu, y, tinggi pandang], 'c'?]
const camKeys = [
  [0, [62, 0, 205]], [L[0].e, [58, 0, 195]],
  [L[1].s, [40, 0, 175]], [T(1, 'bongkar'), [30, 0, 130]], [at(1, 'dalemnya').e + 0.3, [26, 0, 84]],
  [T(2, 'bola') - 0.2, [26, 0, 84]], [T(2, 'sekecil'), [125, 0, 12]], [T(2, 'mm') + 0.3, [124, 0, 12]],
  [T(2, 'didorong') - 0.05, [104, 0, 42]], [T(2, 'pegas') + 0.2, [102, 0, 36]],
  [T(2, 'nempel') - 0.1, [16, 0, 72]], [L[2].e, [16, 0, 70]],
  [L[3].s, [18, 0, 72]], [T(3, 'cincin'), [18, 0, 60]], [L[3].e, [18, 0, 58]],
  [T(4, 'giginya') - 0.1, [18, 0, 50]], [L[4].e, [19, 0, 52]],
  [T(5, 'tonjolan') - 0.1, [24, 0, 54]], [T(5, 'ujung') - 0.1, [24, 0, 56]], [T(5, 'ujung') + 0.25, [124, 0, 22]], [L[5].e + 0.1, [124, 0, 22]],
  [L[6].s, [20, 0, 56]], [T(6, 'alur'), [22, 0, 54]], [L[6].e, [22, 0, 58]],
  [T(7, 'naik') - 0.25, [92, 0, 120]], [T(7, 'ujungnya'), [120, 0, 30]], [L[7].e + 0.1, [122, 0, 26]],
  [L[8].s - 0.1, [60, 0, 205]], [T(8, 'bajumu'), [64, 0, 215]], [T(8, 'bolanya'), [124, 0, 18]], [L[8].e, [124, 0, 18]],
  [L[9].s - 0.05, [62, 0, 205], 'c'], [DUR, [58, 0, 195]],
];

// ---------- label, judul, chip, stempel ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
const P3 = (z, y = 0, x = 0) => [x, y, z];
tag(T(0, 'klik', 0), T(0, 'klik', 1) - 0.1, 'Ujung keluar', () => P3(129 + S.D - 5.5, -1.5), 'r', 'ok');
tag(T(1, 'tombolnya'), T(1, 'yuk'), 'Tombol', () => plunger.children[2], 'r');
tag(T(2, 'isi'), T(2, 'bola'), 'Isi tinta', () => P3(60 + S.D, -1.5), 'r');
tag(T(2, 'pegas'), T(2, 'nempel') - 0.15, 'Pegas', () => P3(102, -2.2), 'r', 'hi');
tag(T(2, 'nempel'), L[2].e + 0.2, 'Tombol', () => P3(4 + S.D, -2.4), 'r');
tag(T(3, 'cincin'), T(4, 'giginya') - 0.1, 'Cincin bergigi', () => P3(Z0 + S.D + 3, -3.1), 'r', 'hi');
tag(T(4, 'giginya'), L[4].e + 0.2, 'Gigi miring', () => P3(Z0 + S.D - 0.6, -2.4), 'r', 'hi');
tag(T(5, 'tonjolan'), T(5, 'ujung') - 0.1, 'Tonjolan pendek', () => tabs[0] ? tabs[0].localToWorld(V(0, 0, TAB_TOP + 1)) : P3(30), 'l', 'hi');
tag(T(5, 'ujung'), L[5].e + 0.2, 'Ujung keluar', () => P3(129.5, -0.8), 'r', 'ok');
tag(T(6, 'alur'), L[6].e + 0.2, 'Alur panjang', () => grooves[0] ? grooves[0].localToWorld(V(0, 0, -4)) : P3(25), 'l', 'hi');
tag(T(7, 'pegas'), T(7, 'ujungnya') - 0.2, 'Pegas', () => P3(102, -2.2), 'r', 'hi');
tag(T(7, 'ujungnya'), L[7].e + 0.2, 'Ujung masuk', () => P3(126, -0.8), 'r');
tag(T(8, 'bolanya'), L[8].e + 0.2, 'Bola 0,7 mm', () => P3(124.65 + S.D, -0.3), 'r', 'hi');

const titleDefs = [
  [0, 'Klik keluar, <em>klik masuk</em>'],
  [L[1].s, 'Cuma ditekan, <em>kok gantian?</em>'],
  [at(1, 'dalemnya').e, 'Isi tinta, <em>bola 0,7 mm</em>'],
  [T(2, 'pegas') - 0.1, 'Pegas dorong <em>ke atas</em>'],
  [L[3].s, 'Tombol dorong <em>cincin bergigi</em>'],
  [L[4].s, 'Gigi miring, <em>cincin muter</em>'],
  [L[5].s, 'Nyangkut di <em>tonjolan pendek</em>'],
  [L[6].s, 'Muter lagi, masuk <em>alur panjang</em>'],
  [L[7].s, 'Pegas dorong, <em>ujung masuk</em>'],
  [L[8].s - 0.1, 'Klik masuk <em>sebelum dikantongi</em>'],
  [L[9].s - 0.05, 'Klik keluar, <em>klik masuk</em>'],
];
const RED = '#9b2c3f', GRN = '#1f7a5c', GRY = '#7a7368', GOLD = '#e3bf62';
const stampDefs = [];
clicks.forEach((c, i) => { if (!c.slow && i !== 4 && i !== 5) stampDefs.push([c.p + 0.08, c.p + 0.6, 'Klik!', 'snd']); });
stampDefs.push([T(7, 'klik'), L[7].e + 0.2, 'Klik!', 'snd'], [T(5, 'nyangkut'), T(5, 'tonjolan') - 0.05, 'Nyangkut!', '']);
stampDefs.sort((a, b) => a[0] - b[0]);
const shakeAt = stampDefs.filter(d => d[3] === 'snd').map(d => d[0]);
const cardDefs = [[T(8, 'klik'), '01', 'Klik masuk dulu'], [T(8, 'bajumu'), '02', 'Baju aman coretan'], [T(8, 'bolanya'), '03', 'Bola nggak kering']];

// ---------- caption karaoke ----------
const chunks = [];
for (let li = 0; li < 10; li++) {
  let cur = [];
  const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => { cur.push(w); if (/[,.?!:…]$/.test(w.w) || cur.length >= 5 || i === ws.length - 1) { chunks.push(cur); cur = []; } });
}
const allW = chunks.flat();
allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });

// ---------- model per waktu ----------
const S = { D: 0, ang: 0, phase: 'in' };
function updateModel(t) {
  Object.assign(S, mech(t));
  const D = S.D + springBoing(t) * (S.phase === 'in' ? 1 : 0);
  cam.position.z = Z0 + D; cam.rotation.z = S.ang * Math.PI / 180;
  plunger.position.z = Z0 + D;
  refill.position.z = RTOP + D;
  const s0 = 93.4 + D, len = SPRING_END - s0;
  spring.geometry.dispose(); spring.geometry = new THREE.TubeGeometry(new Helix(len), 160, 0.28, 6, false); spring.position.z = s0;
  const sp = easeIO(track(splitKeys, t));
  shellR.position.set(30 * sp, 8 * sp, -4 * sp); shellR.visible = sp < 0.999;
  clip.position.set(30 * sp, 8 * sp, -4 * sp); clip.visible = sp < 0.999;
  // warna sebagai kode
  const camHi = Math.max(pulse(T(3, 'cincin'), T(4, 'giginya') - 0.1, t), pulse(T(4, 'cincin'), L[4].e + 0.2, t));
  camMat.hl('hl', 0); camMat.uniforms.k.value = 0;
  camMat.uniforms.c0.value = new THREE.Color(camHi > 0.5 ? '#fff0b0' : PAL.cam[0]);
  springMat.hl('hl', Math.max(pulse(T(2, 'pegas'), T(2, 'nempel') - 0.1, t), pulse(T(7, 'pegas'), T(7, 'ujungnya'), t)));
  plMat.hl('hl', Math.max(pulse(T(2, 'nempel'), L[2].e + 0.2, t), pulse(T(3, 'tombol'), T(3, 'cincin'), t)));
  inkMat.hl('hl', pulse(T(2, 'isi'), T(2, 'bola'), t) * 0.6);
  tabMat.hl('warn', pulse(T(5, 'tonjolan'), L[5].e + 0.2, t));
  grooveMat.hl('ok', pulse(T(6, 'alur'), L[6].e + 0.2, t));
  lugMat.hl('warn', Math.max(pulse(T(5, 'nyangkut'), L[5].e, t), pulse(T(6, 'masuk'), L[6].e + 0.1, t)));
}

const tmpV = new THREE.Vector3();
function updateCamera(t) {
  const c = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2] * (1 - 0.012 * Math.sin(t * 0.7));
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -h * W / H / 2; camera.right = h * W / H / 2;
  pen.updateMatrixWorld(true);
  const target = pen.localToWorld(tmpV.set(0, c[1], c[0]));
  camera.position.copy(target).addScaledVector(V(1, 1.05, 1).normalize(), 400);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const ins = clamp((t - L[4].s + 0.05) / 0.25) * (1 - clamp((t - L[6].e - 0.15) / 0.25));   // panel di atas -> objek turun
  camera.position.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), h * (0.03 + 0.07 * ins)); camera.updateMatrixWorld();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  let sh = 0; for (const s of shakeAt) if (t > s && t < s + 0.3) sh = 1 - (t - s) / 0.3;
  $('shake').style.transform = sh ? `translate(${(Math.sin(t * 91) * 12 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 9 * sh).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : (p.isVector3 ? p.clone() : pen.localToWorld(V(...p)));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- overlay ----------
const ARROW = '<svg viewBox="0 0 13 10"><path d="M12 5H1.5M5 1.2 1.2 5 5 8.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const tagEls = tagDefs.map(d => {
  const el = document.createElement('div'); el.className = 'tag ' + d.cls;
  el.innerHTML = d.side === 'r' ? ARROW + `<span>${d.text}</span>` : `<span>${d.text}</span>` + ARROW.replace('<svg', '<svg style="transform:scaleX(-1)"');
  $('tags').appendChild(el); return el;
});
const cardEls = cardDefs.map(([, n, txt]) => { const e = document.createElement('div'); e.className = 'card'; e.innerHTML = `<i>${n}</i>${txt}`; $('cards').appendChild(e); return e; });
let lastTitle = -1, lastChunk = -1, lastStamp = -1;
function updateOverlay(t) {
  let ti = 0; titleDefs.forEach((d, i) => { if (t >= d[0]) ti = i; });
  const tEl = $('title');
  if (ti !== lastTitle) { tEl.innerHTML = titleDefs[ti][1]; lastTitle = ti; }
  const tp = clamp((t - titleDefs[ti][0]) / 0.5);
  tEl.style.opacity = ti === 0 ? 1 : clamp((t - titleDefs[ti][0]) / 0.28);
  tEl.style.transform = ti === 0 ? '' : `translateY(${(26 * Math.pow(1 - tp, 4)).toFixed(1)}px)`;
  // angka: sudut putar cincin, dari model
  $('rn').textContent = `${Math.round(S.ang)}°`;
  const out = S.D > 3, chipTxt = S.phase === 'press' || S.phase === 'rel' ? 'Ditekan' : (out ? 'Keluar' : 'Masuk');
  const slow = (t > T(3, 'ditekan') - 0.1 && t < L[7].e);
  const chip = $('chip');
  chip.textContent = slow ? 'Gerak lambat 8×' : chipTxt;
  chip.style.background = slow ? GOLD : (chipTxt === 'Ditekan' ? GRY : (out ? GRN : RED));
  chip.style.color = slow ? '#1b1a1f' : '#fff8ee';
  tagDefs.forEach((d, i) => {
    const el = tagEls[i];
    if (t < d.s || t > d.e + 0.15) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const [x, y] = project(d.anchor());
    const w = el.offsetWidth, h = el.offsetHeight, gap = 14;
    el.style.left = clamp(d.side === 'r' ? x + gap : x - gap - w, 24, W - 24 - w) + 'px';
    el.style.top = clamp(y - h / 2, 440, 1380) + 'px';
    el.style.setProperty('--ox', d.side === 'r' ? '0%' : '100%');
    const p = (t - d.s) / 0.38, o = clamp((t - d.e) / 0.15);
    el.style.opacity = clamp((t - d.s) / 0.16) * (1 - o);
    el.style.transform = `scale(${lerp(0.5, 1, backOut(p))})`;
  });
  let si = -1; stampDefs.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const st = $('stamp');
  if (si !== lastStamp) { st.innerHTML = si < 0 ? '' : `<span class="${stampDefs[si][3]}" data-t="${stampDefs[si][2]}">${stampDefs[si][2]}</span>`; lastStamp = si; }
  if (si >= 0) {
    const d = stampDefs[si], sp = st.firstChild, pin = (t - d[0]) / 0.34, pout = clamp((t - d[1]) / 0.3);
    sp.style.opacity = clamp((t - d[0]) / 0.14) * (1 - pout);
    sp.style.transform = `rotate(-8deg) scale(${(lerp(1.7, 1, backOut(pin)) * lerp(1, 0.9, pout)).toFixed(3)})`;
  }
  const ck = chunks.findIndex(c => t >= c.s && t < c.e), cap = $('cap');
  if (ck !== lastChunk) { cap.innerHTML = ck < 0 ? '' : `<span class="pill in">${chunks[ck].map(w => `<b>${w.w}</b>`).join(' ')}</span>`; lastChunk = ck; }
  if (ck >= 0) {
    const pill = cap.firstChild, c = chunks[ck];
    pill.style.opacity = lerp(0.2, 1, clamp((t - c.s) / 0.2));
    [...pill.children].forEach((b, k) => { const w = c[k]; b.className = t >= w.next ? 'past' : (t >= w.s ? 'cur' : ''); });
  }
  const cardOut = 1 - smooth(L[9].s - 0.3, L[9].s - 0.1, t);
  cardDefs.forEach(([s], i) => {
    const el = cardEls[i], p = clamp((t - s) / 0.35);
    el.style.opacity = t < s ? 0 : clamp((t - s) / 0.12) * cardOut;
    el.style.transform = `translateY(${(30 * (1 - backOut(p))).toFixed(1)}px) scale(${lerp(0.9, 1, backOut(p)).toFixed(3)})`;
  });
  updateDim(t);
  updateInset(t);
}
// ukuran bola (bab 2)
function updateDim(t) {
  const a = smooth(T(2, 'sekecil') - 0.1, T(2, 'sekecil') + 0.2, t) * (1 - smooth(T(2, 'didorong') - 0.25, T(2, 'didorong') - 0.05, t));
  const svg = $('dim');
  if (a <= 0) { svg.innerHTML = ''; return; }
  const bz = 124.65 + S.D;
  const p1 = project([0.4, 0.35, bz]), p2 = project([0.4, -0.35, bz]);
  const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const k = backOut(clamp((t - T(2, 'sekecil') + 0.1) / 0.4));
  svg.innerHTML = `<g opacity="${a.toFixed(3)}" stroke="#1b1a1f" stroke-width="5" stroke-linecap="round">
    <line x1="${lerp(mid[0], p1[0], k)}" y1="${lerp(mid[1], p1[1], k) - 0}" x2="${lerp(mid[0], p2[0], k)}" y2="${lerp(mid[1], p2[1], k)}"/>
    <circle cx="${lerp(mid[0], p1[0], k)}" cy="${lerp(mid[1], p1[1], k)}" r="9" fill="#1b1a1f"/><circle cx="${lerp(mid[0], p2[0], k)}" cy="${lerp(mid[1], p2[1], k)}" r="9" fill="#1b1a1f"/>
    <g transform="translate(${mid[0] + 150} ${mid[1] - 120})" stroke="none">
      <rect x="-130" y="-42" width="260" height="84" rx="42" fill="#e3bf62" stroke="#1b1a1f" stroke-width="5"/>
      <text text-anchor="middle" y="17" font-family="ui-monospace, SF Mono, Menlo" font-weight="700" font-size="46" fill="#1b1a1f">≈ 0,7 mm</text></g></g>`;
}
// panel: dinding pulpen "dibuka" jadi bidang datar — jalur sayap cincin (bab 4–6), posisi dari model
function updateInset(t) {
  const s = L[4].s - 0.05, e = L[6].e + 0.15;
  const el = $('inset'), a = clamp((t - s) / 0.25) * (1 - clamp((t - e) / 0.25));
  el.style.opacity = a;
  if (a <= 0) return;
  el.style.transform = `scale(${lerp(0.85, 1, backOut((t - s) / 0.35)).toFixed(3)})`;
  $('insetk').textContent = 'DINDING DIBUKA JADI DATAR';
  const X = deg => 70 + ((deg % 360) + 360) % 360 / 360 * 800, Y = d => 150 + d * 26;
  let g = '';
  for (let k = 0; k < 4; k++) {
    const xt = X(45 + 90 * k), xg = X(90 * k);
    g += `<path d="M${xt - 34} ${Y(D_OUT) + 20} L${xt - 34} ${Y(D_OUT) + 8} L${xt + 34} ${Y(D_OUT) - 6} L${xt + 34} ${Y(D_OUT) + 120} L${xt - 34} ${Y(D_OUT) + 120} Z" fill="${pulse(T(5, 'tonjolan'), L[5].e + 0.2, t) > 0.5 ? '#c06a2e' : '#e3bf62'}" stroke="#1b1a1f" stroke-width="5" stroke-linejoin="round"/>`;
    g += `<rect x="${xg - 26}" y="${Y(-1.5)}" width="52" height="${Y(D_OUT + 4.6) - Y(-1.5)}" rx="8" fill="${pulse(T(6, 'alur'), L[6].e + 0.2, t) > 0.5 ? '#1f7a5c' : '#544640'}" opacity=".9"/>`;
  }
  // sayap cincin (4 buah, 90° terpisah) — di model sayap 0 mulai di alur 0°
  for (let k = 0; k < 4; k++) {
    const x = X(S.ang + 90 * k), y = Y(S.D);
    g += `<g transform="translate(${x} ${y})"><path d="M-30 -52 L30 -52 L30 -6 L-30 10 Z" fill="${k === 0 ? '#9b2c3f' : '#b8913a'}" stroke="#1b1a1f" stroke-width="5" stroke-linejoin="round"/></g>`;
  }
  g += `<line x1="60" y1="${Y(D_OUT) - 6}" x2="880" y2="${Y(D_OUT) - 6}" stroke="#7a7368" stroke-width="2" stroke-dasharray="6 10"/>
    <text x="900" y="${Y(D_IN) - 30}" font-family="ui-monospace, Menlo" font-weight="700" font-size="28" fill="#7a7368" text-anchor="end">↑ MASUK</text>
    <text x="900" y="${Y(D_OUT) + 64}" font-family="ui-monospace, Menlo" font-weight="700" font-size="28" fill="#7a7368" text-anchor="end">KELUAR</text>`;
  $('insetsvg').innerHTML = g;
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  renderer.setClearColor(0xf4efe6, 1);
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };
window.EVENTS = (() => {
  const ev = [];
  clicks.forEach(c => { ev.push({ t: c.p + (c.slow ? 0.5 : 0.06), type: 'clickDown' }); ev.push({ t: c.to === 'in' && c.slow ? T(7, 'naik') + 0.2 : c.r + 0.08, type: c.to === 'in' ? 'clickIn' : 'clickOut' }); });
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  cardDefs.forEach(([s]) => ev.push({ t: s, type: 'card' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[3] === 'snd' ? 'stampSnd' : 'stamp' }));
  ev.push({ t: T(1, 'bongkar'), type: 'whoosh' });
  for (const k of camKeys) if (k[2] === 'c') ev.push({ t: k[0], type: 'cut' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, pen, camera };
renderAt(0);
window.READY = true;

// isyarat musik untuk sfx.py (calm → punch → klimaks → calm) + titik pil cover (piksel)
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(3).s); cue('drop', LN(4).s + 0.1); cue('build', LN(5).s);
  cue('reveal', LN(6).s); cue('warm', LN(7).s); cue('dark', LN(8).s); cue('resolve', LN(9).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => window.__dbg.project([0, -3.1, 14.6 + window.__dbg.S.D + 3]);
