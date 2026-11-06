// POV "Jadi Si…": "Aku setetes air" — perjalanan air di rumah Indonesia dibelah: sumur -> pompa jet + tabung tekanan -> pipa tegak -> toren di atap (kran pelampung) -> pipa turun -> kran angsa dapur -> gelas.
// Satu model per waktu: muka air toren -> sudut pelampung -> bukaan katup -> tekanan pipa -> saklar tekanan -> pompa/impeler; keran -> pancuran -> air di gelas.
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
    c = mix(c, mix(vec3(.102, .110, .165), c * .45, .45), ec * (1. - e) * .9);   // batas warna: gelap sewarna
    gl_FragColor = vec4(mix(c * mix(vec3(1.), vec3(.42, .46, .58), dim), vec3(.106, .102, .122), e) * a, a);
  }`, { tC: { value: rtCol.texture }, tN: { value: rtNor.texture }, tD: { value: rtCol.depthTexture },
  px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, r: { value: 2.6 }, far: { value: FAR - NEAR }, zs: { value: 0.3 }, dim: { value: 0 } });
const out = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`, { t: { value: rtComp.texture } });


// ---------- palet, cel 3 nada ----------
const flat = h => [h, h, h];
const PAL = {
  pump: ['#585d6c', '#363945', '#1f2027'], cutPump: flat('#c9c4ba'), brass: ['#f1c75e', '#d6a136', '#a87a22'], cutBrass: flat('#f3d27f'),
  sw: ['#cfd6cc', '#a7b0a5', '#78817a'], swCap: ['#8d958c', '#6c736b', '#4b514a'], silver: ['#fbfcfd', '#c3cad4', '#7e8794'], steel: ['#e2e3e7', '#b2b5bd', '#7a7d86'],
  imp: ['#f6ead0', '#dcc89e', '#ab9668'], chamber: ['#3a3c46', '#2a2b33', '#1b1c22'], white: ['#fbfbf8', '#e4e3dd', '#bdbbb2'],
  pvc: ['#dfe2e6', '#b4b8c0', '#868b95'], pvcIn: ['#eef0f3', '#c9ccd3', '#9a9fa8'],
  toren: ['#5d8bea', '#3563c9', '#213f91'], cutToren: flat('#a9c0f0'), torenLid: ['#4a77d6', '#2b54b4', '#1b357d'],
  water: ['#a6dcf6', '#6fbbe8', '#4296cc'], cutWater: flat('#b9e3f7'), waterTop: ['#c7ecfb', '#a3dbf5', '#7cc4ea'],
  conc: ['#e2ddd3', '#c3bdb1', '#968f83'], cutConc: flat('#d7d0c2'), buis: ['#d6d2ca', '#b5afa4', '#8a847a'], cutBuis: flat('#cfc8bb'),
  ball: ['#fdfdfb', '#e6e6e0', '#c2c2ba'], chrome: ['#ffffff', '#cfd5de', '#8a93a1'], sink: ['#eef0f3', '#c3c8cf', '#8e949d'],
  cab: ['#f3efe6', '#d9d3c6', '#aea697'], top: ['#4d505c', '#393b45', '#25262d'], cutTop: flat('#6a6d78'), wood: ['#dcb98a', '#bf9663', '#93703f'],
  glass: ['#f2f9fd', '#d9ebf5', '#b3cfdf'], cutGlass: flat('#e3f2fa'), red: ['#ff8a80', '#e5484d', '#b8333a'], blueL: ['#6aa0ff', '#3f72d8', '#2a4fa3'],
  wall: ['#f1ece2', '#d6cfc1', '#a9a191'], cutWall: flat('#e6dccb'), green: ['#7cc49a', '#3f9a6a', '#2a6e4b'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], hl: ['#f6dc8e', '#e3bf62', '#b8913a'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// Cel berbasis teori warna (lihat reference/panduan_warna.md): 2 nada + terminator lembut, bayangan bergeser ke ungu-biru sejuk
// (bukan sekadar gelap), sisi terang sedikit hangat, cahaya langit dari atas, cahaya pinggir (rim) sejuk, kilap sesuai bahan.
// m.hl(palet, k) = ganti warna ke palet sorot (seperti dulu); m.glow(k) = sorotan lembut (pinggir menyala emas), warna asli tetap.
const GLOSS = { pump: 0.55, brass: 0.8, silver: 0.9, steel: 0.8, chrome: 0.95, sink: 0.8, toren: 0.5, torenLid: 0.5, water: 0.7, waterTop: 0.7, glass: 0.9, ball: 0.5, pvc: 0.35, white: 0.4, sw: 0.35, swCap: 0.3, top: 0.6, imp: 0.4 };
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

// ---------- dunia (mm). Rumah dibelah di bidang x = 0 (menghadap kamera), dinding belakang x = -600, lantai/tanah y = 0,
// sumbu z mendatar (+z = kiri layar): sumur (z 1900) -> pompa (z 1300) -> dinding luar (z 600..750) -> toren di atap (z 0) -> dapur (z -700)
const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
const cylX = (r1, r2, h, n = 32) => new THREE.CylinderGeometry(r1, r2, h, n).rotateZ(-Math.PI / 2);   // sumbu x, r1 di +x
const cylZ = (r1, r2, h, n = 32) => new THREE.CylinderGeometry(r1, r2, h, n).rotateX(Math.PI / 2);    // sumbu z
// setengah benda putar sumbu y (bagian x <= 0) + muka potong di bidang x = 0. prof = [[r, y], ...] tertutup
function halfLatheY(prof, mat, cutMat, seg = 64, capX = 0.4) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg, Math.PI, Math.PI), mat));
  if (cutMat) for (const sg of [1, -1]) {
    const sh = new THREE.ShapeGeometry(new THREE.Shape(prof.map(([r, y]) => new THREE.Vector2(r, y))));
    const pa = sh.attributes.position.array, n = pa.length / 3, np = new Float32Array(n * 3), nn = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { np[i * 3] = capX; np[i * 3 + 1] = pa[i * 3 + 1]; np[i * 3 + 2] = sg * pa[i * 3]; nn[i * 3] = 1; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(np, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
    geo.setIndex(sh.index); g.add(new THREE.Mesh(geo, cutMat));
  }
  return g;
}
// pipa dengan sudut membulat (CurvePath dipakai juga untuk jalur tetes & aliran titik)
function pipePath(poly, rc = 60) {
  const P = poly.map(p => V(...p)), path = new THREE.CurvePath();
  let prev = P[0];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i].clone().sub(P[i - 1]), b = P[i + 1].clone().sub(P[i]), r = Math.min(rc, a.length() / 2, b.length() / 2);
    const p1 = P[i].clone().addScaledVector(a.normalize(), -r), p2 = P[i].clone().addScaledVector(b.normalize(), r);
    if (prev.distanceTo(p1) > 0.01) path.add(new THREE.LineCurve3(prev.clone(), p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, P[i].clone(), p2)); prev = p2;
  }
  path.add(new THREE.LineCurve3(prev.clone(), P[P.length - 1].clone()));
  return path;
}
const pipe = (path, r, mat, seg = 200) => { const m = new THREE.Mesh(new THREE.TubeGeometry(path, seg, r, 14), mat); lt.add(m); return m; };
const socket = (p, axis, r, len, mat) => { const g = axis === 'x' ? cylX(r, r, len) : axis === 'y' ? new THREE.CylinderGeometry(r, r, len, 24) : cylZ(r, r, len, 24); const m = mesh(g, mat, ...p); lt.add(m); return m; };
// bayangan kontak lembut (bidang mendatar bertekstur gradien)
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.5)'); g.addColorStop(.55, 'rgba(34,30,66,.22)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz, par = lt) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.position.set(x, y, z); par.add(m); return m; };

// ===== SUMUR: buis beton bertumpuk (cincin Ø1.040 mm, tebal 60), bibir sumur 25 cm di atas tanah, air tanah di bawah =====
const WELL = { z: 1900, ro: 520, ri: 460, y0: -2900, y1: 250, water: -2250 };
const well = new THREE.Group(); well.position.z = WELL.z; lt.add(well);
const buisM = cel('buis'), cutBuis = cel('cutBuis');
for (let k = 0; k < 7; k++) { const a = WELL.y0 + k * 450, b = Math.min(WELL.y1, a + 450);
  well.add(halfLatheY([[WELL.ri, a], [WELL.ro, a], [WELL.ro, a + 12], [WELL.ro - 8, a + 22], [WELL.ro - 8, b - 22], [WELL.ro, b - 12], [WELL.ro, b], [WELL.ri, b]], buisM, cutBuis)); }
well.add(halfLatheY([[0, WELL.y0 - 60], [WELL.ro, WELL.y0 - 60], [WELL.ro, WELL.y0], [0, WELL.y0]], buisM, cutBuis));   // dasar
const waterM = cel('water'), cutWater = cel('cutWater'), waterTop = cel('waterTop');
well.add(halfLatheY([[0, WELL.y0], [WELL.ri - 2, WELL.y0], [WELL.ri - 2, WELL.water], [0, WELL.water]], waterM, cutWater));
// klep kaki (foot valve) kuningan bersaringan di ujung pipa hisap
const FOOT = [-30, -2700, WELL.z];
const foot = new THREE.Group(); foot.position.set(...FOOT); lt.add(foot);
foot.add(mesh(new THREE.CylinderGeometry(42, 42, 90, 28), cel('brass'), 0, -10, 0), mesh(new THREE.CylinderGeometry(30, 42, 28, 28), cel('brass'), 0, 48, 0));
for (let k = 0; k < 5; k++) foot.add(mesh(new THREE.CylinderGeometry(43.5, 43.5, 6, 28), cel('chamber'), 0, -42 + k * 16, 0));

// ===== POMPA JET otomatis (ciri foto Shimizu PS-135 E): motor silinder hitam bersirip + tutup kipas, kepala pompa besi cor
// hitam kotak membulat, tutup depan kuningan bulat dengan 6 telinga baut, soket hisap putih di atas, tabung tekanan hitam
// melintang di atas motor, saklar tekanan silinder abu-abu kehijauan + kabel, pelat nama perak di sisi motor. ±330 × 200 × 340 mm
const PUMP = [0, 120, 1300];
const PG = new THREE.Group(); PG.position.set(...PUMP); lt.add(PG);
lt.add(box(-320, 130, 0, 120, 1160, 1440, cel('conc')));                      // landasan beton
blob(-90, 120.5, 1300, 230, 140);
const pumpM = cel('pump');
PG.add(rbox(-235, 60, 0, 22, -98, 98, 6, pumpM), rbox(-215, -95, 20, 48, -62, 62, 6, pumpM));
PG.add(mesh(cylX(82, 82, 165, 40), pumpM, -152, 118, 0));                                               // motor
for (let k = 0; k < 9; k++) PG.add(mesh(cylX(85.5, 85.5, 5, 40), pumpM, -222 + k * 17, 118, 0));       // sirip
PG.add(mesh(cylX(80, 74, 34, 40), pumpM, -252, 118, 0), mesh(cylX(40, 40, 4, 24), cel('chamber'), -270, 118, 0));   // tutup kipas
PG.add(box(-205, -105, 92, 150, 82.5, 85, cel('silver')));                                              // pelat nama
PG.add(box(-205, -105, 140, 146, 85, 86, cel('blueL')), box(-205, -105, 130, 136, 85, 86, cel('red')));
const head = rbox(-78, 40, 18, 238, -94, 94, 16, pumpM); PG.add(head);                                  // kepala pompa
PG.add(rbox(-70, 0, 230, 262, -20, 70, 8, pumpM));
PG.add(mesh(new THREE.CylinderGeometry(27, 27, 46, 28), cel('white'), -30, 280, 30), mesh(new THREE.CylinderGeometry(19, 19, 2, 24), cel('chamber'), -30, 304, 30));   // soket hisap
PG.add(mesh(new THREE.CylinderGeometry(14, 14, 14, 6), pumpM, -30, 268, -48));                           // baut pancing
PG.add(mesh(cylZ(30, 30, 40, 24), pumpM, -20, 140, -110), mesh(cylZ(26, 26, 34, 24), cel('white'), -20, 140, -140));   // soket keluar
// ruang impeler (terlihat saat tutup kuningan digeser)
PG.add(mesh(cylX(80, 80, 2, 48), cel('chamber'), 41, 120, 0));
const imp = new THREE.Group(); imp.position.set(42, 120, 0); PG.add(imp);
imp.add(mesh(cylX(66, 66, 4, 48), cel('imp'), 2, 0, 0), mesh(cylX(16, 16, 14, 24), cel('brass'), 9, 0, 0));
for (let k = 0; k < 6; k++) {                                                                           // 6 sudu melengkung
  const s = new THREE.Shape(), a0 = k * Math.PI / 3; const P1 = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8, r = 18 + 46 * u, a = a0 + 0.9 * u; P1.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const P2 = P1.map(([x, y], i) => { const a = Math.atan2(y, x) + 0.12, r = Math.hypot(x, y); return [Math.cos(a) * r, Math.sin(a) * r]; }).reverse();
  [...P1, ...P2].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  imp.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 11, bevelEnabled: false }).rotateY(Math.PI / 2), cel('imp'), 3, 0, 0));
}
const cover = new THREE.Group(); cover.position.set(40, 120, 0); PG.add(cover);                         // tutup kuningan
const brassM = cel('brass');
cover.add(mesh(cylX(86, 86, 16, 56), brassM, 8, 0, 0), mesh(cylX(32, 38, 14, 32), brassM, 22, 0, 0));
for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, y = Math.sin(a) * 92, z = Math.cos(a) * 92;
  cover.add(mesh(cylX(15, 15, 14, 20), brassM, 7, y, z), mesh(cylX(8, 8, 8, 6), cel('steel'), 17, y, z)); }
for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; cover.add(mesh(new THREE.BoxGeometry(10, 46, 9).rotateX(a), brassM, 18, Math.sin(a) * 52, Math.cos(a) * 52)); }
// tabung tekanan: silinder hitam melintang (sumbu z), dibelah: setengah depan dibuang, isi air + udara terlihat
const TK = { x: -160, y: 334, r: 80, L: 120 };
const tankG = new THREE.Group(); tankG.position.set(TK.x, TK.y, 0); PG.add(tankG);
PG.add(box(-200, -120, 190, 262, -40, 40, pumpM));
{ const prof = [[0, -TK.L], [62, -TK.L + 2], [TK.r, -TK.L + 20], [TK.r, TK.L - 20], [62, TK.L - 2], [0, TK.L], [0, TK.L - 5], [57, TK.L - 7], [TK.r - 5, TK.L - 22], [TK.r - 5, -TK.L + 22], [57, -TK.L + 7], [0, -TK.L + 5]];
  const lat = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 56, Math.PI, Math.PI).rotateX(Math.PI / 2);
  tankG.add(new THREE.Mesh(lat, pumpM));
  const sh = new THREE.Shape(prof.map(([r, z]) => new THREE.Vector2(z, r)));
  for (const sg of [1, -1]) { const g = new THREE.ShapeGeometry(sh); const pa = g.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { const z = pa[i], r = pa[i + 1]; pa[i] = 0.4; pa[i + 1] = sg * r; pa[i + 2] = z; } g.computeVertexNormals(); tankG.add(new THREE.Mesh(g, cel('cutPump'))); } }
tankG.add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(TK.r - 6.5, -TK.L + 24), new THREE.Vector2(TK.r - 6.5, TK.L - 24)], 40, Math.PI, Math.PI).rotateX(Math.PI / 2), cel('steel')));
const tankWater = mesh(new THREE.BufferGeometry(), cel('water'), 0, 0, 0); tankG.add(tankWater);
let tankLv = -1;
function setTankLevel(h) {                                       // h = tinggi air dari dasar (mm), potongan lingkaran setengah x <= 0
  if (Math.abs(h - tankLv) < 0.5) return; tankLv = h;
  const R = TK.r - 6, yTop = -R + h, s = new THREE.Shape(); const pts = [];
  for (let i = 0; i <= 24; i++) { const y = lerp(-R, yTop, i / 24); pts.push([-Math.sqrt(Math.max(0, R * R - y * y)), y]); }
  pts.push([-0.6, yTop], [-0.6, -R]); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  tankWater.geometry.dispose(); tankWater.geometry = new THREE.ExtrudeGeometry(s, { depth: 2 * (TK.L - 26), bevelEnabled: false }).translate(0, 0, -(TK.L - 26));
}
// saklar tekanan: silinder abu-abu kehijauan + tutup lebih gelap + kabel ke motor
const SW = [-18, 238, -48];
const sw = new THREE.Group(); sw.position.set(...SW); PG.add(sw);
sw.add(mesh(new THREE.CylinderGeometry(16, 16, 16, 6), cel('brass'), 0, 8, 0), mesh(new THREE.CylinderGeometry(36, 36, 74, 32), cel('sw'), 0, 52, 0));
const swCap = mesh(new THREE.CylinderGeometry(33, 37, 14, 32), cel('swCap'), 0, 94, 0); sw.add(swCap);
sw.add(box(34, 37, 40, 70, -14, 14, cel('white')));                                                     // label ON/OFF
PG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-18, 300, -84), V(-60, 320, -100), V(-200, 260, -95), V(-245, 200, -70)]), 40, 5, 8), cel('chamber')));

// ===== PIPA PVC abu-abu: hisap (sumur -> pompa) dan dorong (pompa -> atap -> toren) =====
const pvcM = cel('pvc');
const SUCK = pipePath([[FOOT[0], FOOT[1] + 60, WELL.z], [-30, 560, WELL.z], [-30, 560, 1330], [-30, 405, 1330]], 90);
pipe(SUCK, 21, pvcM);
const PUSH = pipePath([[-20, 260, 1158], [-20, 260, 920], [-20, 4380, 920], [-20, 4380, 520]], 80);
pipe(PUSH, 21, pvcM);
for (const y of [900, 1800, 2700]) lt.add(box(-60, -40, y - 15, y + 15, 900, 940, cel('steel')));        // klem
for (const p of [[-20, 4380, 600]]) socket(p, 'z', 26, 40, pvcM);

// ===== RUMAH: dinding luar & dak beton (dibelah) =====
const wallM = cel('wall'), cutWall = cel('cutWall');
lt.add(box(-600, 260, 0, 3150, 600, 750, wallM), box(259, 261, 0, 3150, 600, 750, cutWall));
const SLAB = { y0: 3150, y1: 3300 };
lt.add(box(-600, 600, SLAB.y0, SLAB.y1, -1650, 800, cel('conc')), box(599, 601, SLAB.y0, SLAB.y1, -1650, 800, cel('cutConc')));
lt.add(box(-600, 600, SLAB.y1, SLAB.y1 + 260, 760, 800, cel('conc')));                                   // dinding pagar atap (parapet)

// ===== TOREN (ciri foto Penguin TB 110: 1.050 L, Ø±106 cm, tinggi ±127 cm): badan silinder biru dengan 4 cincin rusuk
// mendatar, bahu membulat ke kubah, tutup bulat Ø40 cm di puncak, kaki/rok bawah, logo. Dibelah: setengah depan dibuang.
const TOR = { y0: 3380, R: 530, H: 1050 };
const tor = new THREE.Group(); tor.position.y = TOR.y0; lt.add(tor);
lt.add(box(-560, 560, SLAB.y1, TOR.y0, -560, 560, cel('conc')));                                        // dudukan beton
blob(-60, SLAB.y1 + 0.6, 0, 660, 660);
const torM = cel('toren'), cutTor = cel('cutToren'), th = 16;
{ const sh = [];
  for (let i = 1; i <= 14; i++) { const a = i / 14 * Math.PI / 2; sh.push([200 + (TOR.R - 200) * Math.cos(a) ** 0.8, TOR.H + 160 * Math.sin(a)]); }
  const O = [[0, 0], [505, 0], [512, 40], [TOR.R, 60], [TOR.R, TOR.H], ...sh];
  const I = [[0, th], [489, th], [496, 40], [TOR.R - th, 60], [TOR.R - th, TOR.H], ...sh.map(([r, y]) => [r - th, y - th])];
  tor.add(halfLatheY([...O, ...I.slice().reverse()], torM, null, 72));
  const pos = [], idx = [];
  for (const sg of [1, -1]) { const b = pos.length / 3;
    O.forEach(([r, y], i) => { pos.push(0.4, y, sg * r, 0.4, I[i][1], sg * I[i][0]); });
    for (let i = 0; i < O.length - 1; i++) { const a = b + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
  tor.add(new THREE.Mesh(cg, cutTor)); }
for (const y of [260, 470, 680, 890]) tor.add(halfLatheY([[TOR.R - 2, y], [TOR.R + 9, y + 6], [TOR.R + 9, y + 30], [TOR.R - 2, y + 36]], cel('torenLid'), cutTor));   // rusuk
tor.add(halfLatheY([[0, TOR.H + 150], [215, TOR.H + 150], [222, TOR.H + 178], [200, TOR.H + 200], [120, TOR.H + 212], [0, TOR.H + 214]], cel('torenLid'), cutTor));   // tutup
const torWater = halfLatheY([[0, 0], [TOR.R - th - 2, 0], [TOR.R - th - 2, 1], [0, 1]], waterM, cutWater, 64, 3); torWater.position.y = th; tor.add(torWater);
// lubang keluar bawah + soket
const OUTL = [-300, 3450, -437];
// kran pelampung kuningan (ciri foto: badan kuningan berulir + mur segi enam menembus dinding, tuas engsel, batang kuningan panjang ±36 cm, bola pelampung putih Ø15 cm)
const FV = { x: -20, y: 4380, z: 506, piv: [-20, 4366, 462], L: 380, br: 72 };
const fv = new THREE.Group(); lt.add(fv);
fv.add(mesh(cylZ(22, 22, 70, 24), brassM, FV.x, FV.y, FV.z - 10), mesh(cylZ(30, 30, 12, 6), brassM, FV.x, FV.y, FV.z + 12), mesh(cylZ(30, 30, 12, 6), brassM, FV.x, FV.y, FV.z + 44));
fv.add(mesh(new THREE.CylinderGeometry(13, 13, 40, 20), brassM, FV.x, FV.y - 30, FV.z - 34));           // mulut keluar ke bawah
const poppet = mesh(new THREE.CylinderGeometry(10, 10, 16, 16), cel('red'), FV.x, FV.y - 52, FV.z - 34); fv.add(poppet);
const fvArm = new THREE.Group(); fvArm.position.set(...FV.piv); lt.add(fvArm);
fvArm.add(mesh(new THREE.CylinderGeometry(5, 5, FV.L, 12).rotateZ(Math.PI / 2).translate(FV.L / 2, 0, 0), brassM));
const ball = mesh(new THREE.SphereGeometry(FV.br, 40, 28), cel('ball'), FV.L + FV.br - 6, 0, 0); fvArm.add(ball);
fvArm.add(mesh(new THREE.CylinderGeometry(8, 8, 26, 12), brassM, FV.L - 4, 0, 0));
const ARM_DIR = new THREE.Vector2(-0.33, -0.94).normalize();     // arah mendatar batang (x, z)
// aliran dari mulut kran pelampung ke permukaan air (silinder air tipis)
const fallM = cel('water');
const fallStream = mesh(new THREE.CylinderGeometry(9, 7, 1, 16).translate(0, -0.5, 0), fallM, FV.x, FV.y - 60, FV.z - 34); lt.add(fallStream);

// ===== DAPUR: kabinet, meja (dibelah), bak cuci stainless (dinding depan dibelah), kran angsa tembok, gelas =====
const DOWN = pipePath([OUTL, [-300, 3450, -700], [-560, 3450, -700], [-560, 1262, -700], [-560, 1222, -700]], 70);
pipe(DOWN, 19, pvcM);
socket([-300, 3450, -470], 'z', 25, 40, pvcM);
for (const y of [2200, 1700]) lt.add(box(-600, -585, y - 15, y + 15, -730, -670, cel('steel')));
const SINK = { x0: -520, x1: -130, z0: -920, z1: -480, y0: 650, top: 860 };
const cabM = cel('cab');
lt.add(box(-600, -30, 0, 820, -1350, SINK.z0, cabM), box(-600, -30, 0, 820, SINK.z1, -150, cabM), box(-600, -30, 0, 600, SINK.z0, SINK.z1, cabM), box(-600, -29, 599, 601, SINK.z0, SINK.z1, cel('cutWall')));
for (const z of [-1350, -480]) lt.add(box(-30, -26, 40, 790, z + 15, z + 385, cel('cab')), box(-26, -20, 380, 470, z + 340, z + 352, cel('steel')));   // pintu + gagang
const topM = cel('top'), cutTop = cel('cutTop');
lt.add(box(-600, 10, 820, SINK.top, -1380, SINK.z0 - 8, topM), box(-600, 10, 820, SINK.top, SINK.z1 + 8, -120, topM),
  box(-600, SINK.x0 - 8, 820, SINK.top, SINK.z0, SINK.z1, topM));
lt.add(box(9, 11, 820, SINK.top, -1380, SINK.z0, cutTop), box(9, 11, 820, SINK.top, SINK.z1, -120, cutTop));
const sinkM = cel('sink');
lt.add(box(SINK.x0, SINK.x1, SINK.y0 - 8, SINK.y0, SINK.z0, SINK.z1, sinkM), box(SINK.x0 - 8, SINK.x0, SINK.y0 - 8, SINK.top - 2, SINK.z0, SINK.z1, sinkM),
  box(SINK.x0, SINK.x1, SINK.y0 - 8, SINK.top - 2, SINK.z0 - 8, SINK.z0, sinkM), box(SINK.x0, SINK.x1, SINK.y0 - 8, SINK.top - 2, SINK.z1, SINK.z1 + 8, sinkM));
lt.add(mesh(new THREE.CylinderGeometry(24, 24, 3, 24), cel('steel'), -320, SINK.y0 + 1, -620));          // lubang buangan
// kran angsa tembok (ciri foto: roset bulat di tembok, badan pendek mendatar, tuas kecil di atas, leher angsa tinggi melengkung, aerator di ujung menghadap bawah)
const TAP = { y: 1200, z: -700 };
const chromeM = cel('chrome');
lt.add(mesh(cylX(34, 34, 10, 40), chromeM, -595, TAP.y, TAP.z), mesh(cylX(20, 20, 70, 28), chromeM, -555, TAP.y, TAP.z), mesh(new THREE.CylinderGeometry(22, 22, 34, 28), chromeM, -536, TAP.y + 8, TAP.z));
const lever = new THREE.Group(); lever.position.set(-536, TAP.y + 26, TAP.z); lt.add(lever);
lever.add(mesh(new THREE.CylinderGeometry(15, 15, 12, 20), chromeM, 0, 4, 0), rbox(-74, 0, 2, 12, -7, 7, 4, chromeM));
const NECK = new THREE.CatmullRomCurve3([[-536, TAP.y + 20], [-536, 1360], [-528, 1450], [-490, 1500], [-420, 1516], [-360, 1488], [-330, 1440], [-325, 1405]].map(([x, y]) => V(x, y, TAP.z)));
lt.add(new THREE.Mesh(new THREE.TubeGeometry(NECK, 80, 12, 16), chromeM));
lt.add(mesh(new THREE.CylinderGeometry(15, 15, 36, 24), chromeM, -325, 1390, TAP.z), mesh(new THREE.CylinderGeometry(12, 12, 2, 20), cel('chamber'), -325, 1371.5, TAP.z));
const TIP = [-325, 1370, TAP.z];
const tapStream = mesh(new THREE.CylinderGeometry(7, 9, 1, 16).translate(0, -0.5, 0), fallM, ...TIP); lt.add(tapStream);
// gelas (dibelah) + air di dalamnya
const GL = { x: -325, y: SINK.y0, z: TAP.z, h: 120, r0: 30, r1: 38 };
const glassG = new THREE.Group(); glassG.position.set(GL.x, GL.y, GL.z); lt.add(glassG);
glassG.add(halfLatheY([[0, 0], [GL.r0, 0], [GL.r1, GL.h], [GL.r1 - 3, GL.h], [GL.r0 - 3, 8], [0, 8]], cel('glass'), cel('cutGlass'), 40));
const glassW = halfLatheY([[0, 0], [GL.r0 - 3, 0], [GL.r1 - 3.5, 1], [0, 1]], waterM, cutWater, 40); glassW.position.y = 8; glassG.add(glassW);
blob(GL.x, SINK.y0 + 0.5, GL.z, 52, 52);

// titik penanda
const mk = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const MK = {
  well: mk(lt, 0, WELL.water + 40, WELL.z + 260), foot: mk(lt, 40, FOOT[1], WELL.z + 40), pump: mk(PG, -150, 205, 80), imp: mk(PG, 52, 175, 0), tank: mk(PG, TK.x + 10, TK.y + 40, 60),
  sw: mk(PG, SW[0] + 30, SW[1] + 100, SW[2]), push: mk(lt, 0, 2300, 920), toren: mk(lt, 0, TOR.y0 + 1180, -200), fv: mk(lt, FV.x, FV.y + 20, FV.z - 20),
  tap: mk(lt, -500, 1505, TAP.z), glass: mk(lt, GL.x, GL.y + GL.h, GL.z), lever: mk(lt, -560, TAP.y + 40, TAP.z), down: mk(lt, -560, 2400, -700),
};
const W2 = o => o.isObject3D ? o.getWorldPosition(new THREE.Vector3()) : V(...o);

// ---------- jadwal (semua dikunci ke kata) ----------
// POV "Jadi Si…": tujuan (gelas) -> rintangan 1 pompa -> 2 pipa tegak -> 3 toren -> momen genting (pelampung menutup, saklar tekanan
// mematikan pompa) -> keran dibuka, gravitasi -> sampai di gelas -> refleksi
const G_MM = 9810;
const tPumpOn = T(2, 'pompa') - 0.3, tKlik = T(7, 'klik');
const LV0 = 4040, LVC = 4300;                                      // muka air toren (y dunia): awal & saat katup menutup
const tFill0 = L[4].s, tClose = T(6, 'menutup') + 0.15;
const torLevel = t => t < tFill0 ? LV0 : t < tClose ? lerp(LV0, LVC, (t - tFill0) / (tClose - tFill0)) : LVC;
const FV_SC = 0.126;                                                // sin sudut batang saat katup tertutup penuh
const armSin = lv => clamp((FV.piv[1] - (lv + 8)) / (FV.L + FV.br - 6), 0.05, 0.95);
const valveOpen = t => clamp((armSin(torLevel(t)) - FV_SC) / 0.12);
const pumpRun = t => smooth(tPumpOn, tPumpOn + 0.5, t) * (1 - smooth(tKlik, tKlik + 0.6, t));
const pressure = t => t < tPumpOn ? 0.32 : t < tClose ? lerp(0.32, 0.45, smooth(tPumpOn, tPumpOn + 1, t)) : t < tKlik ? lerp(0.45, 1, smooth(tClose, tKlik, t)) : 1;
const P_ON = 0.55, P_OFF = 1.0;
const tTap0 = T(8, 'keran'), tTap1 = T(8, 'dibuka') + 0.35;
const tapOpen = t => smooth(tTap0, tTap1, t);
const tPluk = T(9, 'pluk');
const glassLevel = t => t < tTap1 + 0.4 ? 0 : Math.min(78, (t - tTap1 - 0.4) * 9);   // tinggi air di gelas (mm)
const darkKeys = [[0, 0.85], [T(0, 'tujuanku') - 0.2, 0.85], [T(0, 'tujuanku') + 0.6, 0], [T(7, 'sunyi') - 0.15, 0], [T(7, 'sunyi') + 0.35, 0.62], [L[8].s + 0.25, 0.62], [T(8, 'dibuka'), 0]];
// impeler: sudut = integral kecepatan (pra-hitung, deterministik)
const DT = 1 / 240, NANG = Math.ceil((L[10].e + 3) / DT);
const IMP_ANG = new Float32Array(NANG);
for (let i = 1; i < NANG; i++) IMP_ANG[i] = IMP_ANG[i - 1] + pumpRun(i * DT) * 22 * DT;
const impAngle = t => IMP_ANG[clamp(Math.floor(t / DT), 0, NANG - 1)];

// ---------- jalur si tetes (POV) ----------
const DROP_W0 = [80, WELL.water - 150, WELL.z - 40];
const IMPW = [70, PUMP[1] + 120, PUMP[2]];                       // depan impeler (dunia)
const TANKW = [TK.x - 34, PUMP[1] + TK.y - 30, PUMP[2] + 20];
const MOUTH = [FV.x, FV.y - 66, FV.z - 34];
const P_B = pipePath([DROP_W0, [FOOT[0], FOOT[1] - 30, FOOT[2]], [-30, 560, WELL.z], [-30, 560, 1330], [-30, 330, 1330], IMPW], 90);
const P_D = pipePath([IMPW, [-40, 300, 1300], TANKW], 40);
const P_E = pipePath([TANKW, [-20, 300, 1240], [-20, 260, 1158], [-20, 260, 920], [-20, 4380, 920], [-20, 4380, 520], [-20, 4380, MOUTH[2]], MOUTH], 70);
const REST = [-210, LVC - 250, 240];
const P_H = pipePath([REST, [-290, 3520, -380], OUTL, [-300, 3450, -700], [-560, 3450, -700], [-560, 1240, -700]], 70);
P_H.add(new THREE.LineCurve3(V(-560, 1240, -700), NECK.getPoint(0))); P_H.add(NECK); P_H.add(new THREE.LineCurve3(NECK.getPoint(1), V(...TIP)));
const at3 = (path, u) => path.getPointAt(clamp(u)).toArray();
const tB0 = T(2, 'pompa') - 0.2, tB1 = L[2].e + 0.25, tD0 = T(3, 'didorong'), tE0 = L[4].s - 0.25, tE1 = L[4].e + 0.25;
const tFall = L[5].s + 0.15, tLand = tFall + Math.sqrt(2 * (MOUTH[1] - LV0 - (L[5].s - tFill0) / (tClose - tFill0) * (LVC - LV0)) / G_MM);
const tH0 = T(8, 'gravitasi') - 0.1, tH1 = L[8].e + 0.15;
const GW_TOP = t => GL.y + 8 + glassLevel(t);
const fallDur = Math.sqrt(2 * (TIP[1] - GW_TOP(tPluk)) / G_MM), tF2 = tPluk - fallDur;
function dropAt(t) {
  const bob = Math.sin(t * 2.2) * 6;
  if (t < tB0) return [DROP_W0[0], DROP_W0[1] + bob, DROP_W0[2]];
  if (t < tB1) return at3(P_B, easeIO((t - tB0) / (tB1 - tB0)));
  if (t < tD0) { const a = (t - tB1) * 9; return [IMPW[0], IMPW[1] + Math.sin(a) * 46, IMPW[2] + Math.cos(a) * 46 - 46 * (1 - smooth(tB1, tB1 + 0.3, t))]; }
  if (t < tE0) return at3(P_D, easeIO((t - tD0) / 0.9));
  if (t < tE1) return at3(P_E, easeIO((t - tE0) / (tE1 - tE0)));
  if (t < tFall) return MOUTH;
  if (t < tLand) { const d = t - tFall; return [MOUTH[0], MOUTH[1] - 0.5 * G_MM * d * d, MOUTH[2]]; }
  if (t < tH0) { const k = smooth(tLand, tLand + 1.4, t), lv = torLevel(t);
    return [lerp(MOUTH[0], REST[0], k), lerp(lv - 20, lv - 250, k) + bob, lerp(MOUTH[2], REST[2], k)]; }
  if (t < tH1) return at3(P_H, easeIO((t - tH0) / (tH1 - tH0)));
  if (t < tF2) return [TIP[0], TIP[1] - 8, TIP[2]];
  if (t < tPluk) { const d = t - tF2; return [TIP[0], TIP[1] - 0.5 * G_MM * d * d, TIP[2]]; }
  return [GL.x + 8, GW_TOP(t) - 24 + bob * 0.4, GL.z];
}
const ROUTE_LEN = P_B.getLength() + P_E.getLength() + P_H.getLength();

// kamera: [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot, x]
const WIDE = [450, 1000, 11300, 78, 10, 0.5, 0.52, 0, -100];
const camKeys = [
  [0, [WELL.z - 40, DROP_W0[1] - 20, 560, 70, 12, 0.5, 0.52, 0, 40]], [T(0, 'tujuanku') - 0.1, [WELL.z - 40, DROP_W0[1] - 20, 660, 70, 12, 0.5, 0.52, 0, 40]],
  [T(0, 'gelas') + 0.5, WIDE], [L[1].e, [450, 1000, 10900, 78, 10, 0.5, 0.52, 0, -100]],
  [tB0, [1650, -1700, 2700, 68, 13, 0.5, 0.5, 0, 0]], [tB1 - 0.3, [1450, 200, 2000, 66, 13, 0.5, 0.52, 0, 0]],
  [L[3].s + 0.2, [1250, 360, 840, 58, 13, 0.5, 0.56, 0, -30]], [L[3].e, [1250, 370, 860, 60, 13, 0.5, 0.56, 0, -60]],
  [tE0 + 0.5, [1050, 900, 2600, 70, 13, 0.5, 0.5, 0, 0]], [tE1 - 0.4, [700, 3900, 2600, 74, 13, 0.5, 0.5, 0, 0]],
  [T(5, 'toren') + 0.3, [40, 4000, 2150, 74, 13, 0.5, 0.52, 0, -100]], [L[5].e, [40, 4000, 2080, 74, 13, 0.5, 0.52, 0, -100]],
  [T(6, 'pelampung') + 0.2, [280, 4210, 1380, 70, 14, 0.5, 0.52, 0, -60]], [L[6].e + 0.1, [280, 4210, 1340, 70, 14, 0.5, 0.52, 0, -60]],
  [L[7].s + 0.7, [1300, 330, 900, 56, 13, 0.5, 0.66, 0, -100]], [L[7].e + 0.2, [1300, 330, 870, 56, 13, 0.5, 0.66, 0, -100]],
  [T(8, 'gravitasi') - 0.2, [-470, 2450, 3700, 78, 12, 0.5, 0.5, 0, -300]], [L[8].e, [-640, 1700, 2600, 78, 13, 0.5, 0.5, 0, -350]],
  [L[9].s + 0.1, [-700, 1100, 1320, 76, 14, 0.5, 0.5, 0, -400]], [L[9].e + 0.3, [-700, 1100, 1300, 76, 14, 0.5, 0.5, 0, -400]],
  [L[10].s + 1.4, WIDE], [DUR, [450, 1000, 10900, 78, 10, 0.5, 0.52, 0, -100]],
];
// kamera mengikuti si tetes saat ia naik / turun (bobot 0..1)
const followW = t => pulse(tB0 + 0.6, tB1 - 0.4, t, 0.35) + pulse(tE0 + 0.6, tE1 - 0.6, t, 0.4) + pulse(tH0 + 0.4, tH1 - 0.6, t, 0.35);

// ---------- label, teks kinetik, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(0, 'gelas'), L[0].e + 0.2, 'Tujuan: gelas', () => MK.glass, 'l', 'hi');
tag(T(1, 'tiga'), L[1].e + 0.3, '1 · Pompa', () => MK.pump, 'r');
tag(T(1, 'tiga') + 0.3, L[1].e + 0.3, '2 · Pipa tegak', () => MK.push, 'r');
tag(T(1, 'rintangan'), L[1].e + 0.3, '3 · Toren', () => MK.toren, 'l');
tag(T(2, 'naik'), T(2, 'pompa') + 0.2, 'Klep kaki', () => MK.foot, 'r');
tag(T(2, 'sembilan') - 0.1, L[2].e + 0.3, 'Hisap maks. 9 m', () => [-30, dropAt(T(2, 'sembilan'))[1] - 250, WELL.z + 30], 'r', 'hi');
tag(T(3, 'impeler'), T(3, 'didorong'), 'Impeler', () => [42, PUMP[1] + 40, PUMP[2] + 70], 'l', 'hi');
tag(T(3, 'tabung'), L[3].e + 0.3, 'Tabung tekanan', () => MK.tank, 'l');
tag(T(4, 'pipa'), L[4].e, 'Pipa PVC', () => [-20, Math.max(500, dropAt(TNOW)[1] - 500), 920], 'r');
tag(T(5, 'toren'), L[5].e + 0.2, 'Toren 1.050 L', () => MK.toren, 'l', 'hi');
tag(T(6, 'pelampung'), L[6].e + 0.3, 'Pelampung', () => { const p = W2(ball); return [p.x, p.y + 150, p.z + 60]; }, 'l', 'hi');
tag(T(6, 'katupnya'), L[6].e + 0.3, 'Katup menutup', () => [FV.x, FV.y + 90, FV.z - 40], 'r', 'warn');
tag(T(7, 'saklar'), L[7].e + 0.2, 'Saklar tekanan', () => MK.sw, 'l', 'hi');
tag(T(8, 'keran'), T(8, 'gravitasi') + 0.4, 'Keran dibuka', () => MK.tap, 'l');
tag(T(8, 'gravitasi'), L[8].e, 'Gravitasi', () => { const p = dropAt(Math.min(TNOW, tH1)); return [p[0], p[1] - 120, p[2]]; }, 'r', 'hi');
tag(T(10, 'pompa'), DUR + 1, 'Pompa', () => MK.pump, 'r');
tag(T(10, 'pelampung'), DUR + 1, 'Pelampung', () => MK.fv, 'r');
tag(T(10, 'gravitasi'), DUR + 1, 'Gravitasi', () => MK.down, 'l', 'hi');
let TNOW = 0;
const stampDefs = [[0.15, T(0, 'tujuanku') - 0.2, 'Setetes air', 1190, 'snd']];
// teks kinetik di samping benda (tidak menutupi): [mulai, akhir, teks, titik(), dx, dy]
const kinDefs = [
  [tKlik, T(7, 'saklar') + 0.6, 'KLIK!', () => W2(MK.sw), 230, 170],
  [tPluk, L[9].e + 0.4, 'PLUK!', () => [GL.x, GL.y + GL.h, GL.z], 250, -150],
];
const FORMAT = { pov: { t: 0, e: DUR + 1, nama: 'Aku, setetes air', warna: '#9ddcff', r: 44, titik: dropAt, ucapan: [
  { t: T(0, 'gelas') + 0.2, e: L[0].e + 0.3, teks: 'Jauh banget…' },
  { t: T(2, 'menyedotku'), e: L[2].e + 0.2, teks: 'Wuusss!' },
  { t: T(3, 'berputar'), e: T(3, 'didorong') + 0.2, teks: 'Pusiiing!' },
  { t: T(4, 'setinggi'), e: L[4].e + 0.2, teks: 'Tinggi amat!' },
  { t: T(5, 'jatuh') - 0.2, e: L[5].e + 0.2, teks: 'Byur!' },
  { t: T(6, 'menutup'), e: L[6].e + 0.4, teks: 'Pintunya ditutup!' },
  { t: T(8, 'turun'), e: L[8].e + 0.2, teks: 'Wiii… turun!' },
  { t: T(9, 'sampai'), e: L[9].e + 0.5, teks: 'Sampai!' },
  { t: T(10, 'kerja'), e: DUR, teks: 'Makasih, tim!' },
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
const S = { dark: 0, run: 0, P: 0, valve: 1, lv: LV0, tap: 0, gl: 0 };
const ballMat = ball.material, coverOpenKeys = [[0, 0], [L[3].s - 0.7, 0], [L[3].s + 0.1, 1], [L[4].s + 0.6, 1], [L[4].s + 1.4, 0]];
function updateModel(t) {
  TNOW = t;
  S.dark = track(darkKeys, t); S.run = pumpRun(t); S.P = pressure(t); S.lv = torLevel(t); S.valve = valveOpen(t); S.tap = tapOpen(t); S.gl = glassLevel(t);
  imp.rotation.x = -impAngle(t);
  const co = easeIO(track(coverOpenKeys, t));
  cover.position.set(40 + 95 * co, 120 + 10 * co, -40 * co); cover.rotation.y = -0.35 * co;
  setTankLevel(26 + 92 * S.P);
  // toren: muka air, pelampung (sudut batang dari muka air), katup
  torWater.scale.y = S.lv - TOR.y0 - th;
  const sn = armSin(S.lv), cs = Math.sqrt(1 - sn * sn);
  fvArm.rotation.set(0, Math.atan2(-ARM_DIR.y, ARM_DIR.x), -Math.asin(sn));
  poppet.position.y = FV.y - 52 + 10 * (1 - S.valve);
  const flowIn = S.run * S.valve * (t > tPumpOn + 0.6 ? 1 : 0);
  fallStream.visible = flowIn > 0.02; fallStream.scale.set(0.4 + 0.6 * flowIn, Math.max(1, MOUTH[1] + 6 - S.lv), 0.4 + 0.6 * flowIn);
  // keran: tuas naik, pancuran ke gelas
  lever.rotation.z = 0.55 * S.tap;
  const gw = GW_TOP(t);
  tapStream.visible = S.tap > 0.15; tapStream.scale.set(S.tap, TIP[1] - gw, S.tap);
  glassW.visible = S.gl > 0.5; glassW.scale.y = Math.max(0.5, S.gl);
  // sorotan lembut: benda yang sedang dibahas
  ballMat.glow(pulse(T(6, 'pelampung'), L[6].e, t) * 0.8);
  swCap.material.glow(pulse(T(7, 'saklar') - 0.3, L[7].e, t) * 0.9);
  brassM.glow(0);
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = (window.CAM_OVERRIDE || track(camKeys, t)).slice();
  const fw = clamp(followW(t));
  if (fw > 0 && !window.CAM_OVERRIDE) { const p = dropAt(t); c[1] = lerp(c[1], p[1], fw); c[0] = lerp(c[0], p[2] - 150, fw * 0.6); }
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
  edge.mat.uniforms.dim.value = S.dark * 0.7;
  const sh = t > tKlik && t < tKlik + 0.25 ? (1 - (t - tKlik) / 0.25) : 0;
  $('shake').style.transform = sh > 0.02 ? `translate(${(Math.sin(t * 91) * 5 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 3 * sh).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: halaman + sumur + rumah dibelah (dinding dapur, langit, tanah berlapis, air tanah) ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="45"/></filter>
  <pattern id="tile" width="150" height="150" patternUnits="userSpaceOnUse"><rect width="150" height="150" fill="#e9eef0"/><path d="M150 0H0V150" fill="none" stroke="#b7c3c8" stroke-width="6"/></pattern>
  <pattern id="ftile" width="400" height="400" patternUnits="userSpaceOnUse"><rect width="400" height="400" fill="#e3d6c0"/><path d="M400 0H0V400" fill="none" stroke="#cdbb9d" stroke-width="8"/></pattern>
  <pattern id="soil" width="300" height="300" patternUnits="userSpaceOnUse"><rect width="300" height="300" fill="#b98e64"/><circle cx="40" cy="60" r="16" fill="#a77d55"/><circle cx="200" cy="140" r="22" fill="#a77d55"/><circle cx="120" cy="250" r="12" fill="#c79d73"/><circle cx="260" cy="40" r="9" fill="#c79d73"/></pattern>
  <pattern id="aq" width="240" height="240" patternUnits="userSpaceOnUse"><rect width="240" height="240" fill="#8f9fa6"/><circle cx="40" cy="50" r="26" fill="#a4b4ba"/><circle cx="160" cy="120" r="34" fill="#7d8e96"/><circle cx="90" cy="200" r="20" fill="#a4b4ba"/><circle cx="210" cy="220" r="14" fill="#b4c6cc"/></pattern>
  <linearGradient id="sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e3f1fb"/><stop offset="1" stop-color="#9fcbec"/></linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#1c2340" stop-opacity="0"/><stop offset="1" stop-color="#1c2340" stop-opacity=".26"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#1d2a3e"/><stop offset="1" stop-color="#0a0e16"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#dfe9ee"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const P2 = p => project(p);
const f1 = v => v.toFixed(1);
const planeM = (o, u, v) => {
  const O = P2(o), U = P2([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = P2([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const INK = '#1b1a1f';
function updateBg(t) {
  const zoom = 3000 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.3) * 1.5, 0, 8).toFixed(2));
  const sway = Math.sin(t * 1.1) * 14;
  // dinding belakang x = -600: (a, b) = (-z, -y)
  let s = `<g transform="${planeM([-600, 0, 0], [0, 0, -1], [0, -1, 0])}">
    <rect x="-3200" y="-6400" width="5600" height="6400" fill="url(#sky)"/>
    <circle cx="-2350" cy="-5200" r="170" fill="#fff1c1"/><circle cx="-2350" cy="-5200" r="260" fill="#fff1c1" opacity=".35"/>
    <g fill="#ffffff" opacity=".9"><ellipse cx="-1500" cy="-5600" rx="320" ry="90"/><ellipse cx="-1300" cy="-5660" rx="200" ry="90"/><ellipse cx="900" cy="-5100" rx="360" ry="100"/><ellipse cx="1100" cy="-5170" rx="200" ry="90"/></g>
    <path d="M-3200 -2300 L-2700 -2700 L-2200 -2300Z" fill="#c97c5d" stroke="${INK}" stroke-width="8"/><rect x="-3150" y="-2300" width="900" height="2300" fill="#e7dcc8" stroke="${INK}" stroke-width="8"/>
    <rect x="-2950" y="-1800" width="280" height="380" fill="#a9cfe3" stroke="${INK}" stroke-width="8"/>
    <g transform="translate(${f1(-1350 + sway * 0.3)} 0)"><rect x="-40" y="-1900" width="80" height="1900" fill="#7b5a3c" stroke="${INK}" stroke-width="8"/>
      <circle cx="${f1(sway)}" cy="-2150" r="420" fill="#7fb07a" stroke="${INK}" stroke-width="8"/><circle cx="${f1(-260 + sway)}" cy="-1900" r="260" fill="#8fbd85" stroke="${INK}" stroke-width="8"/><circle cx="${f1(280 + sway)}" cy="-1950" r="280" fill="#6ea56b" stroke="${INK}" stroke-width="8"/></g>
    <rect x="-3200" y="-1500" width="2450" height="1500" fill="#efe6d4" stroke="${INK}" stroke-width="8"/>
    <rect x="-3200" y="-1560" width="2450" height="70" fill="#d9ccb2" stroke="${INK}" stroke-width="8"/>
    ${Array.from({ length: 6 }, (_, k) => `<rect x="${-3100 + k * 400}" y="-1400" width="300" height="140" rx="10" fill="#e2d6be"/>`).join('')}
    <rect x="-750" y="-3150" width="2400" height="3150" fill="#c5d4d3"/>
    <rect x="150" y="-1560" width="1200" height="700" fill="url(#tile)" stroke="${INK}" stroke-width="6"/>
    <rect x="200" y="-2350" width="1100" height="40" rx="8" fill="#b08a5f" stroke="${INK}" stroke-width="6"/>
    <rect x="260" y="-2520" width="110" height="170" rx="18" fill="#e9eef0" stroke="${INK}" stroke-width="6"/><rect x="420" y="-2470" width="90" height="120" rx="14" fill="#f3d9a6" stroke="${INK}" stroke-width="6"/><rect x="560" y="-2500" width="140" height="150" rx="20" fill="#d5e7d2" stroke="${INK}" stroke-width="6"/>
    <rect x="1050" y="-2800" width="420" height="300" rx="10" fill="#fbf8f2" stroke="${INK}" stroke-width="7"/><rect x="1075" y="-2775" width="370" height="250" fill="#bfdcef"/><path d="M1075 -2525l110 -120 80 70 70 -50 110 100Z" fill="#8bb98a"/>
    <rect x="-750" y="-120" width="2400" height="120" fill="#e9e3d6" stroke="${INK}" stroke-width="6"/>
    <g filter="url(#soft)" fill="#2a2440"><rect x="-560" y="-4700" width="1150" height="1350" opacity=".22"/><rect x="150" y="-830" width="1200" height="830" opacity=".22"/><rect x="-1300" y="-460" width="460" height="460" opacity=".2"/></g>
  </g>`;
  // lantai & halaman y = 0: (a, b) = (x, -z)
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}">
    <rect x="-600" y="-750" width="1300" height="2500" fill="url(#ftile)"/>
    <rect x="-600" y="-3300" width="1300" height="2550" fill="#9cc58f"/><rect x="-600" y="-2450" width="1300" height="1050" fill="#d8d2c6"/>
  </g>`;
  // muka potong tanah x = 0 (di bawah lantai): lapisan tanah, air tanah, batu
  s += `<g transform="${planeM([0, 0, 0], [0, 0, -1], [0, -1, 0])}">
    <rect x="-3200" y="0" width="5000" height="6000" fill="url(#soil)"/>
    <rect x="-3200" y="0" width="5000" height="90" fill="#8a6a49"/><rect x="-3200" y="0" width="2450" height="30" fill="#6fa565"/>
    <path d="M-3200 900 Q-2200 820 -1200 930 T1800 880 V1150 Q600 1240 -800 1120 T-3200 1180Z" fill="#a98059" opacity=".8"/>
    <rect x="-3200" y="2050" width="5000" height="3950" fill="url(#aq)"/>
    <path d="M-3200 2050 Q-2000 2000 -800 2070 T1800 2040" fill="none" stroke="#5f7f92" stroke-width="10"/>
    <rect x="-3200" y="2050" width="5000" height="3950" fill="#4f8fc0" opacity=".28"/>
  </g>`;
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.9 * S.dark).toFixed(3));
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
    el.style.top = clamp(y - h / 2, 200, 1520) + 'px';
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

// efek: aliran titik di pipa, rute, teman-teman tetes di toren, cahaya tujuan, cipratan, teks kinetik
const SANS = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
const outl = (x, y, s, size, fill, rot = -6, sc = 1, op = 1) => `<g opacity="${op.toFixed(3)}" transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${sc.toFixed(3)})"><text ${SANS} font-weight="900" font-size="${size}" text-anchor="middle" fill="${INK}" stroke="${INK}" stroke-width="22" stroke-linejoin="round">${s}</text><text ${SANS} font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}">${s}</text></g>`;
function flowDots(path, n, speed, t, amt, pxmm, seed) {
  if (amt < 0.02) return '';
  let s = ''; const r = clamp(9 * pxmm, 2.5, 9);
  for (let k = 0; k < n; k++) { const u = ((k / n + t * speed / path.getLength()) % 1), p = path.getPointAt(u), [x, y] = project([p.x, p.y, p.z]);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.2)}" fill="url(#wglo)" opacity="${(0.55 * amt).toFixed(2)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.6)}" fill="#effaff" opacity="${(0.9 * amt).toFixed(2)}"/>`; }
  return s;
}
function friend(x, y, r, t, k) {
  const bl = (t * 0.6 + k * 0.37) % 1 < 0.05 ? 0.15 : 1;
  return `<g opacity=".95"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#d6f1ff" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="${f1(x - r * 0.32)}" cy="${f1(y - r * 0.1)}" rx="${f1(r * 0.12)}" ry="${f1(r * 0.2 * bl)}" fill="${INK}"/><ellipse cx="${f1(x + r * 0.32)}" cy="${f1(y - r * 0.1)}" rx="${f1(r * 0.12)}" ry="${f1(r * 0.2 * bl)}" fill="${INK}"/></g>`;
}
const SUCK_F = SUCK, PUSH_F = pipePath([[-20, 260, 1158], [-20, 260, 920], [-20, 4380, 920], [-20, 4380, MOUTH[2]], MOUTH], 80), DOWN_F = (() => { const p = pipePath([OUTL, [-300, 3450, -700], [-560, 3450, -700], [-560, 1240, -700]], 70); p.add(new THREE.LineCurve3(V(-560, 1240, -700), NECK.getPoint(0))); p.add(NECK); return p; })();
function updateFx(t) {
  let s = `<defs><radialGradient id="wglo"><stop offset="0" stop-color="#e9f8ff" stop-opacity=".95"/><stop offset=".4" stop-color="#7fd0ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fd0ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="glo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".4" stop-color="#f6c96a" stop-opacity=".45"/><stop offset="1" stop-color="#f6c96a" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  // pembuka: dasar sumur gelap, berkas cahaya dari mulut sumur, gelembung naik
  const hk = 1 - smooth(T(0, 'tujuanku') - 0.1, T(0, 'tujuanku') + 0.5, t);
  if (hk > 0.01) {
    s += `<defs><linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfefff" stop-opacity=".55"/><stop offset="1" stop-color="#cfefff" stop-opacity="0"/></linearGradient></defs>`;
    for (let k = 0; k < 4; k++) { const x0 = 300 + k * 150 + Math.sin(t * 0.8 + k) * 25, w0 = 60 + 30 * hash(k, 5);
      s += `<path d="M${f1(x0)} -20 L${f1(x0 + w0)} -20 L${f1(x0 + w0 * 2.2 + 80)} 1300 L${f1(x0 - 40)} 1300Z" fill="url(#ray)" opacity="${(hk * (0.5 + 0.3 * Math.sin(t * 1.6 + k * 2))).toFixed(2)}"/>`; }
    for (let k = 0; k < 14; k++) { const ph = (t * (0.18 + 0.1 * hash(k, 7)) + hash(k, 8)) % 1, x = 160 + 760 * hash(k, 6) + Math.sin(t * 2 + k) * 12, y = 1450 - ph * 1300, r = 5 + 9 * hash(k, 9);
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="#dff4ff" stroke-width="3" opacity="${(hk * Math.sin(Math.PI * ph) * 0.8).toFixed(2)}"/>`; }
  }
  // cahaya tujuan (gelas) saat diperkenalkan
  const tg = pulse(T(0, 'gelas') - 0.1, L[1].e, t, 0.3);
  if (tg > 0.01) { const [x, y] = project([GL.x, GL.y + 60, GL.z]); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(70 + 30 * Math.sin(t * 5))}" fill="url(#glo)" opacity="${tg.toFixed(2)}"/>`; }
  // rute si tetes (garis putus-putus berjalan) + panjangnya
  const tr = pulse(T(1, 'jaraknya'), T(1, 'tiga') + 0.2, t, 0.25);
  if (tr > 0.01) {
    const pts = []; for (const P of [P_B, P_E]) for (let i = 0; i <= 60; i++) { const p = P.getPointAt(i / 60); pts.push(project([p.x, p.y, p.z])); }
    for (let i = 0; i <= 50; i++) { const p = P_H.getPointAt(i / 50); pts.push(project([p.x, p.y, p.z])); }
    const k = smooth(T(1, 'jaraknya'), T(1, 'belasan') + 0.4, t), n = Math.max(2, Math.round(pts.length * k));
    s += `<polyline points="${pts.slice(0, n).map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="#e3bf62" stroke-width="12" stroke-dasharray="26 18" stroke-dashoffset="${f1(-t * 80)}" stroke-linecap="round" stroke-linejoin="round" opacity="${tr.toFixed(2)}"/>`;
    const e = pts[n - 1]; s += `<g opacity="${(tr * smooth(T(1, 'belasan'), T(1, 'belasan') + 0.3, t)).toFixed(2)}"><rect x="${f1(e[0] - 150)}" y="${f1(e[1] + 40)}" width="300" height="76" rx="38" fill="#e3bf62" stroke="${INK}" stroke-width="5"/><text x="${f1(e[0])}" y="${f1(e[1] + 92)}" ${SANS} font-weight="900" font-size="40" text-anchor="middle" fill="${INK}">±${(ROUTE_LEN / 1000).toFixed(0)} meter</text></g>`;
  }
  // aliran: hisap + dorong saat pompa jalan dan katup terbuka; pipa turun saat keran dibuka
  const fIn = S.run * S.valve;
  s += flowDots(SUCK_F, 22, 900, t, fIn, pxmm, 1) + flowDots(PUSH_F, 40, 900, t, fIn, pxmm, 2) + flowDots(DOWN_F, 26, 700, t, S.tap, pxmm, 3);
  // teman-teman tetes di toren
  const fa = pulse(T(5, 'jatuh') - 0.3, L[8].e, t, 0.3);
  if (fa > 0.01) for (let k = 0; k < 7; k++) {
    const p = [-120 - 260 * hash(k, 2), S.lv - 120 - 520 * hash(k, 3) + Math.sin(t * 1.7 + k) * 14, 380 - 760 * hash(k, 4)];
    if (Math.abs(p[2] - REST[2]) < 110 && Math.abs(p[1] - REST[1]) < 120) continue;
    const [x, y] = project(p); s += `<g opacity="${fa.toFixed(2)}">${friend(x, y, clamp(30 * pxmm * 0.9, 8, 26), t, k)}</g>`;
  }
  // cipratan di gelas + riak
  if (t > tPluk - 0.02 && t < tPluk + 0.7) { const d = t - tPluk, [x, y] = project([GL.x, GW_TOP(t), GL.z]);
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.42, v = 520 * pxmm * (0.7 + 0.5 * hash(k, 9)), px = x + Math.cos(a) * v * d * 0.3, py = y + Math.sin(a) * v * d * 0.3 + 2400 * pxmm * d * d * 0.3;
      s += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(clamp(6 * pxmm, 3, 9))}" fill="#bfe8ff" stroke="${INK}" stroke-width="2.5" opacity="${(1 - d / 0.7).toFixed(2)}"/>`; }
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(30 * pxmm * (0.4 + d * 1.6))}" ry="${f1(8 * pxmm * (0.4 + d * 1.6))}" fill="none" stroke="#e9f8ff" stroke-width="4" opacity="${(1 - d / 0.7).toFixed(2)}"/>`; }
  // teks kinetik di samping benda
  for (const [s0, e0, txt, pt, dx, dy] of kinDefs) {
    if (t < s0 || t > e0 + 0.3) continue;
    const [x, y] = project(pt()), p = (t - s0) / 0.3, out = clamp((t - e0) / 0.3);
    s += outl(clamp(x + dx, 170, 910), y + dy - 90 * (1 - clamp(p)) ** 2, txt, 120, '#e3bf62', -8, lerp(1.7, 1, backOut(p)) * lerp(1, 0.8, out), clamp(p * 3) * (1 - out));
  }
  $('dim').innerHTML = s;
}

// kartu pengukur tekanan (momen genting): jarum dari model, tanda ON/OFF, status pompa
let INS = 0;
const Fn = 'font-family="-apple-system, Helvetica" font-weight="800"';
function updateInset(t) {
  const s0 = L[7].s - 0.1, e0 = L[7].e + 0.4, el = $('inset');
  const a = pulse(s0, e0, t, 0.15);
  INS = a; el.style.opacity = a; el.style.top = '170px';
  if (a <= 0.001) return;
  el.style.transform = `scale(${lerp(0.85, 1, backOut((t - s0 + 0.15) / 0.35)).toFixed(3)})`;
  $('insetk').textContent = 'TEKANAN DI PIPA DORONG';
  const cx = 300, cy = 350, R = 200, ang = v => Math.PI * (1 - clamp(v / 1.2, 0, 1));
  const arc = (v0, v1, col, w) => { const a0 = ang(v0), a1 = ang(v1); return `<path d="M${f1(cx + R * Math.cos(a0))} ${f1(cy - R * Math.sin(a0))} A${R} ${R} 0 0 1 ${f1(cx + R * Math.cos(a1))} ${f1(cy - R * Math.sin(a1))}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
  const P = S.P, na = ang(P), on = S.run > 0.5;
  let g = arc(0, 1.2, '#e6dfd2', 34) + arc(0, P, P >= P_OFF - 0.01 ? '#c9373f' : '#3e8fd1', 34);
  for (const [v, lab, col] of [[P_ON, 'ON', '#1f7a5c'], [P_OFF, 'OFF', '#c9373f']]) { const q = ang(v);
    g += `<line x1="${f1(cx + (R - 30) * Math.cos(q))}" y1="${f1(cy - (R - 30) * Math.sin(q))}" x2="${f1(cx + (R + 30) * Math.cos(q))}" y2="${f1(cy - (R + 30) * Math.sin(q))}" stroke="${col}" stroke-width="8"/>
      <text x="${f1(cx + (R + 62) * Math.cos(q))}" y="${f1(cy - (R + 62) * Math.sin(q) + 12)}" ${Fn} font-size="32" fill="${col}" text-anchor="middle">${lab}</text>`; }
  g += `<line x1="${cx}" y1="${cy}" x2="${f1(cx + (R - 40) * Math.cos(na))}" y2="${f1(cy - (R - 40) * Math.sin(na))}" stroke="#1b1a1f" stroke-width="12" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="18" fill="#1b1a1f"/>`;
  g += `<text x="720" y="200" ${Fn} font-size="34" fill="#7a7368" text-anchor="middle">POMPA</text>
    <rect x="590" y="225" width="260" height="90" rx="45" fill="${on ? '#1f7a5c' : '#c9373f'}" stroke="#1b1a1f" stroke-width="5"/>
    <text x="720" y="285" ${Fn} font-size="46" fill="#fff8ee" text-anchor="middle">${on ? 'NYALA' : 'MATI'}</text>
    <text x="720" y="380" ${Fn} font-size="30" fill="#7a7368" text-anchor="middle">${S.valve < 0.05 ? 'katup toren tertutup' : 'air mengalir ke toren'}</text>`;
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
const hidePov = t => t > L[6].e + 0.5 && t < T(8, 'gravitasi') - 0.3;      // kamera di pompa: si tetes di luar bingkai
window.renderAt = t => {
  updateModel(t); updateCamera(t); draw(); updateOverlay(t);
  const pv = FORMAT.pov; pv.nama = t < L[1].e + 0.3 ? 'Aku, setetes air' : ''; pv.r = t < T(0, 'tujuanku') ? 64 : 42;
  FMT.gambar(t, hidePov(t) ? {} : FORMAT, project);
};
// peristiwa suara
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  FORMAT.pov.ucapan.forEach(u => ev.push({ t: u.t, type: 'blip' }));
  ev.push({ t: 0.05, type: 'tetes', g: 0.7 }, { t: tPumpOn, type: 'klikTombol' }, { t: tPumpOn + 0.05, type: 'motor', dur: tKlik - tPumpOn });
  ev.push({ t: tB0, type: 'air', dur: tB1 - tB0, g: 0.8 }, { t: tE0, type: 'air', dur: tE1 - tE0, g: 0.8 }, { t: tE1 - 0.1, type: 'air', dur: tClose - tE1, g: 0.6 });
  ev.push({ t: tLand, type: 'tetes' }, { t: T(6, 'menutup'), type: 'clack' }, { t: tKlik, type: 'klikTombol' }, { t: tKlik + 0.02, type: 'hit' }, { t: T(7, 'sunyi'), type: 'gelap' });
  ev.push({ t: tTap0, type: 'twist' }, { t: tTap1 - 0.2, type: 'air', dur: DUR - tTap1, g: 0.9 }, { t: tPluk, type: 'tetes', g: 1.2 }, { t: L[7].s - 0.1, type: 'card' });
  for (const k of [T(0, 'gelas') - 0.3, tB0 + 0.1, L[3].s - 0.4, tE0 + 0.3, L[7].s, T(8, 'gravitasi') - 0.3, L[10].s + 0.3]) ev.push({ t: k, type: 'whoosh' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera, dropAt, ROUTE_LEN };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('drop', LN(4).s - 0.05); cue('build', LN(5).s + 0.5);
  cue('danger', LN(6).s); cue('dark', LN(7).s + 1.0); cue('reveal', LN(8).s - 0.1); cue('warm', LN(9).s); cue('resolve', LN(10).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => { const [x, y] = project(dropAt(TNOW)); return [x - 110, y]; };
