// Video "Kita bongkar: stapler" — stapler isometrik (toon + bayangan, potongan belah) di WebGL + HUD sinematik/inset/karaoke di DOM.
// Satu model: tekanan p(t) -> sudut kepala -> turunnya pisau -> kaki staples mengikuti alur landasan. renderAt(t) deterministik.
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
scene.add(sun, sun.target, new THREE.AmbientLight("#ffffff", 0.46 * Math.PI));
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

