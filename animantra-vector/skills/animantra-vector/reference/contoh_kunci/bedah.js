// Video "Kok cuma kuncimu yang bisa buka?" — kunci silinder pin tumbler isometrik di WebGL + lapisan HUD/karaoke di DOM.
// Semua gerak dihitung dari satu model: posisi kunci (keyOff) -> tinggi tiap pin -> celah vs garis potong -> angka & bunyi.
// renderAt(t) deterministik -> direkam per frame oleh render.mjs.
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
const LS = Array.from({ length: 10 }, (_, i) => LN(i));
const DUR = +(LS[9].e + 0.9).toFixed(3);

// key: [t, nilai, 'c' = potong langsung]; di antara key diinterpolasi easeIO
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, c] = keys[i], [t0, v0] = keys[i - 1];
    if (t < t1) return c ? v0 : (Array.isArray(v0) ? v0.map((v, k) => lerp(v, v1[k], easeIO((t - t0) / (t1 - t0)))) : lerp(v0, v1, easeIO((t - t0) / (t1 - t0))));
  }
  return keys[keys.length - 1][1];
}

// ---------- renderer & pass ----------
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
const NEAR = 1, FAR = 600;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const flatNormalMat = new THREE.MeshBasicMaterial({ color: 0x8080ff, side: THREE.DoubleSide });

const quad = (frag, uniforms) => {
  const m = new THREE.ShaderMaterial({ uniforms, fragmentShader: frag, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }' });
  const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q);
  return { scene: s, mat: m };
};
// garis tinta: tepi dari loncatan kedalaman, normal, dan warna (ala ilustrasi cel)
const edge = quad(`
  uniform sampler2D tC, tN, tD; uniform vec2 px; uniform float r, far; varying vec2 vUv;
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
      vec3 n2 = texture2D(tN, uv2).rgb * 2. - 1.;
      vec3 c2 = texture2D(tC, uv2).rgb;
      if (abs(d - d2) * far > .3) e = 1.;
      if (dot(n, n2) < .35) e = 1.;
      if (length(c - c2) > .28) ec = 1.;
    }
    c = mix(c, mix(vec3(.102, .110, .165), c * .45, .45), ec * (1. - e) * .9);   // batas warna: gelap sewarna
    gl_FragColor = vec4(mix(c, vec3(.086, .09, .106), e), 1.);
  }`, { tC: { value: rtCol.texture }, tN: { value: rtNor.texture }, tD: { value: rtCol.depthTexture },
  px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, r: { value: 2.6 }, far: { value: FAR - NEAR } });
const out = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`,
  { t: { value: rtComp.texture } });

// ---------- material cel 3 nada ----------
const PAL = {
  brass: ['#e2b552', '#c9952e', '#a87a22'], steel: ['#d9dade', '#a9abb3', '#6c6e76'],
  nickel: ['#eceded', '#c4c6cc', '#8d9098'], dark: ['#41444e', '#2c2e36', '#1a1b20'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], orange: ['#ffb066', '#f08c2e', '#c96a12'],
  green: ['#6fd09c', '#30a46c', '#1f7a4f'], red: ['#f08a8d', '#e5484d', '#b8333a'],
  cutH: ['#e8a07a', '#e8a07a', '#e8a07a'], cutP: ['#f6e6bd', '#f6e6bd', '#f6e6bd'],
  bore: ['#9a9ca4', '#8a8c94', '#7a7c84'], oil: ['#d39a45', '#b07424', '#7d4c12'],
  dust: ['#a39b8c', '#857e70', '#665f53'], wood: ['#f1cf9b', '#d9ad6c', '#b88a4a'],
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
const mark = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

// ---------- model kunci (koordinat lokal: x melintang, y ke atas = arah pin, z sumbu silinder; 1 unit = 1 mm) ----------
// Dimensi dimodelkan mengikuti silinder umum: pin Ø 2,9 mm (0,115"), 5 pasang pin, jarak pin 4 mm.
const root = new THREE.Group(); scene.add(root);
const lock = new THREE.Group(); root.add(lock);
lock.rotation.y = -0.22;                     // bidang potong sedikit menghadap kamera
const R = 6.5, RH = 8.5, TWD = 5, TOP = 22, CTOP = 20.5, PR = 1.45, LEN = 28, FRONT = 0.6;
const KW = { x: 1.1, y0: -4.6, y1: 1.4 };    // lubang anak kunci
const CZ = [-5, -9, -13, -17, -21];          // posisi 5 lubang pin
const REST = -2.6, DRV = 5;                  // ujung pin bawah tanpa kunci, panjang pin atas
const HT = d => 1.2 - 0.55 * d;              // tinggi punggung kunci untuk kedalaman potong d
const BIT = [2, 4, 1, 5, 3];                 // kunci kamu
const BIT2 = [2, 2, 4, 5, 3];                // kunci tetangga: 2 potongan beda
const KPL = BIT.map(d => R - HT(d));         // panjang pin bawah = pas dengan kunci kamu

// geometri ekstrusi setengah (x ≤ 0); muka di bidang x=0 dibuang, diganti muka potong berlubang
function halfExtrude(shape, z0, z1) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 48 });
  g.translate(0, 0, z0);
  const pos = g.attributes.position, nor = g.attributes.normal, P = [], N = [];
  for (let i = 0; i < pos.count; i += 3) {
    let onCut = true;
    for (let k = 0; k < 3; k++) if (pos.getX(i + k) < -1e-4) onCut = false;
    if (onCut) continue;
    for (let k = 0; k < 3; k++) { P.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)); N.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k)); }
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  return o;
}
// persegi di bidang potong x=0 (u = kedalaman = -z, v = y), normal +x
const CUTB = new THREE.Matrix4().makeBasis(V(0, 0, -1), V(0, 1, 0), V(1, 0, 0));
function cutRects(rects, mat, parent) {
  for (const [u0, u1, v0, v1] of rects) {
    const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0).translate((u0 + u1) / 2, (v0 + v1) / 2, 0).applyMatrix4(CUTB);
    parent.add(mesh(g, mat, 0.002, 0, 0));
  }
}
// celah antar lubang pin sepanjang u
function between(u0, u1) {
  const r = []; let a = u0;
  for (const z of CZ) { r.push([a, -z - PR]); a = -z + PR; }
  r.push([a, u1]); return r;
}

// rumah kunci (diam)
const housing = new THREE.Group(); lock.add(housing);
const hShape = new THREE.Shape();
hShape.moveTo(0, TOP); hShape.lineTo(-TWD, TOP);
hShape.absarc(0, 0, RH, Math.atan2(Math.sqrt(RH * RH - TWD * TWD), -TWD), 1.5 * Math.PI, false);
hShape.lineTo(0, -R); hShape.absarc(0, 0, R + 0.02, 1.5 * Math.PI, 0.5 * Math.PI, true); hShape.lineTo(0, TOP);
const hGeo = halfExtrude(hShape, -LEN, 0);
const housingMat = cel('nickel'), hCutMat = cel('cutH'), boreMat = cel('bore');
const housingL = mesh(hGeo, housingMat); housing.add(housingL);
const housingR = mesh(hGeo, housingMat); housingR.scale.x = -1; housing.add(housingR);
cutRects([[0, LEN, -RH, -R], ...between(0, LEN).map(([a, b]) => [a, b, R, TOP]), ...CZ.map(z => [-z - PR, -z + PR, CTOP, TOP])], hCutMat, housing);
const boreGeo = (y0, y1) => new THREE.CylinderGeometry(PR + 0.02, PR + 0.02, y1 - y0, 20, 1, true, Math.PI, Math.PI).translate(0, (y0 + y1) / 2, 0);
CZ.forEach(z => housing.add(mesh(boreGeo(R, CTOP), boreMat, 0, 0, z)));

// silinder (ikut berputar) + pengait di belakang
const plug = new THREE.Group(); lock.add(plug);
const pShape = new THREE.Shape();
pShape.moveTo(0, R); pShape.absarc(0, 0, R, 0.5 * Math.PI, 1.5 * Math.PI, false);
pShape.lineTo(0, KW.y0); pShape.lineTo(-KW.x, KW.y0); pShape.lineTo(-KW.x, KW.y1); pShape.lineTo(0, KW.y1); pShape.lineTo(0, R);
const pGeo = halfExtrude(pShape, -LEN, FRONT);
const plugMat = cel('steel'), pCutMat = cel('cutP'), boreMatP = cel('bore');
const plugL = mesh(pGeo, plugMat); plug.add(plugL);
const plugR = mesh(pGeo, plugMat); plugR.scale.x = -1; plug.add(plugR);
const plugCut = new THREE.Group(); plug.add(plugCut);
cutRects([[-FRONT, LEN, -R, KW.y0], ...between(-FRONT, LEN).map(([a, b]) => [a, b, KW.y1, R])], pCutMat, plugCut);
CZ.forEach(z => plug.add(mesh(boreGeo(KW.y1, R), boreMatP, 0, 0, z)));
const camMat = cel('steel');
const camShape = new THREE.Shape(); camShape.moveTo(-3.2, 0); camShape.lineTo(3.2, 0); camShape.lineTo(2.2, -13); camShape.absarc(0, -13, 2.2, 0, -Math.PI, true); camShape.lineTo(-3.2, 0);
const cam = mesh(new THREE.ExtrudeGeometry(camShape, { depth: 2.4, bevelEnabled: false, curveSegments: 16 }), camMat, 0, 2.5, -LEN - 2.6);
plug.add(cam);
// lidah kunci (pengait pintu), digeser bubungan
const boltMat = cel('steel');
const bShape = new THREE.Shape(); bShape.moveTo(-6, -15.2); bShape.lineTo(12, -15.2); bShape.lineTo(17, -19.5); bShape.lineTo(17, -21); bShape.lineTo(-6, -21); bShape.lineTo(-6, -15.2);
const bolt = mesh(new THREE.ExtrudeGeometry(bShape, { depth: 4.6, bevelEnabled: false }), boltMat, 0, 0, -LEN - 3.7);
lock.add(bolt);

// pin bawah (kuningan, ujung membulat), pin atas (baja), pegas
const kpMats = [], drMats = [], spMats = [];
const keyPins = KPL.map((L, i) => {
  const pts = [[0, 0], [0.55, 0.12], [1.05, 0.5], [1.45, 1.05], [1.45, L], [0, L]].map(([x, y]) => new THREE.Vector2(x, y));
  const m = cel('brass'); kpMats.push(m);
  const o = mesh(new THREE.LatheGeometry(pts, 28), m, 0, REST, CZ[i]); plug.add(o); return o;
});
const drivers = CZ.map(z => {
  const m = cel('steel'); drMats.push(m);
  const o = mesh(new THREE.CylinderGeometry(PR, PR, DRV, 28).translate(0, DRV / 2, 0), m, 0, 0, z); housing.add(o); return o;
});
class Helix extends THREE.Curve {
  constructor(len) { super(); this.len = len; }
  getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * 6.5; return o.set(Math.cos(a) * 1.08, t * this.len, Math.sin(a) * 1.08); }
}
const springs = CZ.map(z => {
  const m = cel('dark'); spMats.push(m);
  const o = mesh(new THREE.BufferGeometry(), m, 0, 0, z); housing.add(o); o.frustumCulled = false; return o;
});

// anak kunci: profil punggung dihitung dari kedalaman potongan
function profPts(bit) {
  const p = [[0.8, 1.2], [-2.6, 1.2]];
  bit.forEach((d, i) => {
    const z = CZ[i];
    p.push([z + 0.55, HT(d)], [z - 0.55, HT(d)]);
    if (i < 4) p.push([z - 2, Math.min(1.2, Math.max(HT(d), HT(bit[i + 1])) + 0.9)]);
  });
  p.push([-23.2, Math.min(1.2, HT(bit[4]) + 0.9)], [-25.4, -1.4], [-26.4, -3.4]);
  return p;
}
function prof(pts, s) {
  if (s > pts[0][0]) return 1.2;
  for (let i = 1; i < pts.length; i++) {
    const [s0, y0] = pts[i - 1], [s1, y1] = pts[i];
    if (s >= s1) return lerp(y0, y1, (s - s0) / (s1 - s0));
  }
  return -99;
}
const KEYB = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0));
function makeKey(bit, pal) {
  const g = new THREE.Group(), pts = profPts(bit);
  const sh = new THREE.Shape(); sh.moveTo(0.8, -4.3); sh.lineTo(-25.6, -4.3);
  [...pts].reverse().forEach(([s, y]) => sh.lineTo(s, y)); sh.lineTo(0.8, -4.3);
  const blade = cel(pal), bow = cel(pal);
  g.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: false }).applyMatrix4(KEYB).translate(0.9, 0, 0), blade));
  const b = new THREE.Shape(); b.moveTo(0.8, -6); b.lineTo(0.8, 5);
  b.absarc(4.3, 5, 3.5, Math.PI, 0.5 * Math.PI, true); b.lineTo(15.5, 8.5); b.absarc(15.5, 1.5, 7, 0.5 * Math.PI, -0.5 * Math.PI, true);
  b.lineTo(4.3, -5.5); b.absarc(4.3, -6, 3.5, -0.5 * Math.PI, -Math.PI, true);
  const hole = new THREE.Path(); hole.absarc(16.5, 1.5, 2.6, 0, Math.PI * 2, true); b.holes.push(hole);
  g.add(mesh(new THREE.ExtrudeGeometry(b, { depth: 2.6, bevelEnabled: false, curveSegments: 24 }).applyMatrix4(KEYB).translate(1.3, 0, 0), bow));
  g.userData = { pts, blade, bow, tipMk: mark(g, 0.9, 1.2, -6), bowMk: mark(g, 1.3, 7, 10), bladeMk: mark(g, 0.9, 1.2, -13) };
  plug.add(g);
  return g;
}
const key1 = makeKey(BIT, 'nickel'), key2 = makeKey(BIT2, 'nickel');

// pensil (bab 8)
const pencil = new THREE.Group(); lock.add(pencil);
const penBody = cel('yellow'), penWood = cel('wood'), penLead = cel('dark');
pencil.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 18, 6).translate(0, 4 + 9, 0), penBody));
pencil.add(mesh(new THREE.CylinderGeometry(1.4, 0.45, 4, 6, 1).translate(0, 2, 0), penWood));
pencil.add(mesh(new THREE.ConeGeometry(0.45, 0.8, 12).rotateX(Math.PI).translate(0, 0.4, 0), penLead));
pencil.rotation.set(0.35, 0, -0.55);

// oli, debu, serbuk grafit (bab 8)
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const oilMat = cel('oil'), dustMat = cel('dust'), grMat = cel('dark');
const blobs = [], dusts = [], grains = [];
CZ.forEach((z, i) => {
  for (let k = 0; k < 2; k++) {
    const o = mesh(new THREE.SphereGeometry(1, 16, 10), oilMat); o.scale.set(0.9 + rnd() * 0.5, 0.55, 0.9 + rnd() * 0.6); lock.add(o);
    blobs.push({ o, x: 0.4 + rnd() * 0.6, y: R + (k ? 1.5 : -0.6) + rnd() * 0.6, z: z + (rnd() - 0.5) * 2.6, d: i * 0.06 + k * 0.1 });
  }
});
for (let k = 0; k < 26; k++) {
  const o = mesh(new THREE.IcosahedronGeometry(0.3 + rnd() * 0.3, 0), dustMat); lock.add(o);
  const b = blobs[k % blobs.length];
  dusts.push({ o, x: b.x + 0.3 + rnd() * 0.5, y: b.y + (rnd() - 0.5) * 1.6, z: b.z + (rnd() - 0.5) * 2.4, fx: 8 + rnd() * 14, fy: 10 + rnd() * 16, d: rnd() * 0.5 });
}
for (let k = 0; k < 40; k++) {
  const o = mesh(new THREE.IcosahedronGeometry(0.16 + rnd() * 0.14, 0), grMat); lock.add(o);
  const i = k % 5;
  grains.push({ o, x: 0.3 + rnd() * 0.6, y: lerp(KW.y1, CTOP - 3, rnd()), z: CZ[i] + (rnd() - 0.5) * 3.4, d: rnd() * 0.6 });
}

// penanda buat label & SVG
const gapMk = CZ.map(z => mark(plug, 0.3, 0, z));
const midKP = keyPins.map((p, i) => mark(p, 0.9, KPL[i] * 0.45, 0));
const midDR = drivers.map(p => mark(p, 0.9, DRV * 0.5, 0));
const midSP = springs.map(p => mark(p, 1.1, 0, 0));

// ---------- timeline adegan ----------
const L = LS;
const OUT = 200;
const key1Keys = [
  [0, 30], [T(0, 'dicolok') - 0.05, 30], [at(0, 'dicolok').e + 0.1, 0],
  [L[1].s - 0.15, 0], [L[1].s - 0.15, 34, 'c'], [T(1, 'yuk'), 34], [T(1, 'jeroannya'), 75],
  [L[3].s - 0.05, 75], [L[3].s - 0.05, 32, 'c'], [L[3].s + 0.1, 32], [L[3].e - 0.05, 0],
  [L[6].s - 0.02, 0], [L[6].s + 0.3, 40],
  [L[7].s - 0.05, 40], [L[7].s - 0.05, 0, 'c'],
  [L[8].s - 0.1, 0], [L[8].s - 0.1, OUT, 'c'], [T(8, 'gosok') - 0.3, OUT], [T(8, 'gosok') - 0.3, 34, 'c'],
  [L[9].s - 0.1, 34], [L[9].s - 0.1, 0, 'c'],
];
const key2Keys = [
  [0, OUT], [L[1].s - 0.15, OUT], [L[1].s - 0.15, 34, 'c'], [T(1, 'yuk'), 34], [T(1, 'jeroannya'), 75],
  [L[6].s + 0.3, 75], [L[6].s + 0.3, 32, 'c'], [T(6, 'satu') - 0.02, 0], [L[7].s - 0.05, 0], [L[7].s - 0.05, OUT, 'c'],
];
const key2Y = [[0, -17], [L[1].e + 0.3, -17], [L[1].e + 0.3, 0, 'c']];
const ROT = -Math.PI / 2;
const rotKeys = [
  [0, 0], [at(0, 'dicolok').e + 0.12, 0], [T(0, 'cekreeek') + 0.05, ROT], [L[1].s - 0.15, ROT], [L[1].s - 0.15, 0, 'c'],
  [T(7, 'muter') - 0.25, 0], [T(7, 'cekreeek') + 0.05, -1.0], [L[8].s - 0.1, -1.0], [L[8].s - 0.1, 0, 'c'],
  [T(9, 'puter') - 0.05, 0], [T(9, 'cekreeek') + 0.05, ROT],
];
const jigAt = [T(2, 'bisa'), T(6, 'keblok')];
const splitKeys = [[0, 0], [T(1, 'intip') - 0.05, 0], [T(1, 'jeroannya') + 0.3, 1], [L[9].s - 0.1, 1], [L[9].s - 0.1, 0, 'c']];

// kamera: [t, [x, y, z, tinggi pandang], 'c'?] dalam koordinat kunci
const camKeys = [
  [0, [0, -2, -3, 72]], [T(0, 'diputer'), [0, -3, -9, 60]], [L[0].e + 0.3, [0, -3, -10, 56]],
  [L[1].s - 0.15, [0, -3, -10, 56]], [L[1].s - 0.15, [0, -7, 26, 66], 'c'], [T(1, 'ini'), [0, -6, 24, 62]],
  [T(1, 'yuk') - 0.05, [0, -4, 18, 64]], [T(1, 'jeroannya') + 0.35, [0, 8, -15, 46]],
  [T(2, '3') - 0.3, [0, 8, -12, 46]], [T(2, '3') + 0.15, [0, 6.5, -5, 22]], [T(2, 'ditekan') - 0.1, [0, 7, -5, 21]],
  [T(2, 'pegas') + 0.15, [0, 13, -11, 34]], [T(2, 'nyangkut') + 0.1, [0, 9, -13, 36]], [T(2, 'silinder'), [0, 6, -15, 44]],
  [L[3].s - 0.05, [0, 6, -15, 44]], [L[3].s - 0.05, [0, 2, -2, 60], 'c'], [L[3].e, [0, 4, -11, 46]],
  [T(4, 'pin') + 0.2, [0, 2, -13, 38]], [T(4, 'gerigi'), [0, 1, -13, 36]],
  [L[5].s, [0, 5, -15, 42]], [T(5, 'garis'), [0, 6.5, -12, 38]], [L[5].e, [0, 6.5, -12, 40]],
  [L[6].s, [0, 6, -9, 50]], [T(6, 'kurang') - 0.1, [0, 6.5, -11, 26]], [T(6, 'kelebihan'), [0, 6.5, -10, 26]], [T(6, 'keblok') - 0.05, [0, 5, -15, 42]],
  [L[7].s - 0.05, [0, 5, -15, 42]], [L[7].s - 0.05, [0, 5, -13, 40], 'c'], [T(7, 'silinder'), [0, 1, -16, 50]], [T(7, 'pengait'), [0, -4, -18, 52]],
  [L[8].s - 0.1, [0, -4, -18, 52]], [L[8].s - 0.1, [0, 8, -13, 34], 'c'], [T(8, 'macet'), [0, 8, -13, 32]],
  [T(8, 'pakai') - 0.05, [0, 8, -13, 32]], [T(8, 'pakai') - 0.05, [0, 7, -13, 38], 'c'],
  [T(8, 'gosok') - 0.3, [0, 7, -13, 38]], [T(8, 'gosok') - 0.3, [0, 1, 22, 34], 'c'], [L[8].e, [0, 2, 20, 36]],
  [L[9].s - 0.1, [0, 2, 20, 36]], [L[9].s - 0.1, [0, -3, -10, 62], 'c'], [DUR, [0, -3, -10, 56]],
];

const tagDefs = [];
const tagAdd = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tagAdd(T(1, 'kunci', 1), T(1, 'yuk') - 0.05, 'Kunci kamu', () => key1.userData.bowMk, 'r');
tagAdd(T(1, 'tetangga'), T(1, 'yuk') - 0.05, 'Kunci tetangga', () => key2.userData.bowMk, 'r');
tagAdd(T(2, 'pin'), T(2, 'tebalnya') - 0.05, 'Pin atas', () => midDR[0], 'l');
tagAdd(T(2, 'pin') + 0.12, T(2, 'tebalnya') - 0.05, 'Pin bawah', () => midKP[0], 'l');
tagAdd(T(2, 'pegas'), T(2, 'pin', 1) - 0.05, 'Pegas', () => midSP[0], 'l', 'hi');
tagAdd(T(2, 'dua'), T(2, 'silinder') - 0.05, 'Rumah kunci', () => [0.2, 15, -15], 'r');
tagAdd(T(2, 'bagian'), T(2, 'silinder') - 0.05, 'Silinder', () => [0.2, -5.5, -15], 'r');
tagAdd(T(3, 'gerigi'), L[3].e + 0.1, 'Gerigi', () => key1.userData.bladeMk, 'r', 'hi');
tagAdd(T(4, 'pin'), T(4, 'pas'), 'Pin bawah', () => midKP[2], 'r', 'hi');
tagAdd(T(5, 'garis', 1), L[5].e + 0.2, 'Garis potong', () => [0.1, R, 1.5], 'l', 'hi');
tagAdd(T(6, 'tetangga'), T(6, 'kurang') - 0.05, 'Kunci tetangga', () => key2.userData.tipMk, 'l', 'warn');
tagAdd(T(6, 'kurang'), T(6, 'garisnya'), 'Kurang tinggi', () => gapMk[2], 'r', 'warn');
tagAdd(T(6, 'kelebihan'), T(6, 'keblok') + 0.2, 'Kelebihan', () => gapMk[1], 'l', 'warn');
tagAdd(T(7, 'pengait'), L[7].e + 0.3, 'Pengait', () => [12, -18, -LEN - 1.4], 'r', 'hi');
tagAdd(T(8, 'oli'), T(8, 'debu') - 0.05, 'Oli', () => blobs[4].o, 'r', 'warn');
tagAdd(T(8, 'debu'), T(8, 'pakai') - 0.1, 'Debu nempel', () => dusts[3].o, 'r', 'warn');
tagAdd(T(8, 'serbuk'), T(8, 'gosok') - 0.35, 'Serbuk grafit', () => grains[7].o, 'r', 'hi');
tagAdd(T(8, 'pensil'), L[8].e + 0.25, 'Pensil', () => pencil.children[0], 'r', 'hi');

const titleDefs = [
  [0, 'Diputer sekali, <em>cekreeek!</em>'],
  [L[1].s - 0.15, 'Kunci tetangga mirip.<br><em>Kok nggak bisa?</em>'],
  [T(1, 'jeroannya') + 0.1, '5 pasang pin,<br><em>tebalnya &lt; 3 mm</em>'],
  [T(2, 'pin', 1), 'Pin atas <em>nyangkut</em><br>di dua bagian'],
  [L[3].s - 0.05, 'Tiap gerigi <em>ngangkat</em><br>satu pasang pin'],
  [L[4].s, 'Rahasianya di <em>pin bawah</em>'],
  [L[5].s, 'Semua celah di<br><em>garis potong</em>'],
  [L[6].s, 'Kunci tetangga? <em>Keblok</em>'],
  [L[7].s - 0.05, 'Pas semua, <em>bebas muter</em>'],
  [L[8].s - 0.1, 'Kunci seret? <em>Jangan oli</em>'],
  [T(8, 'pakai') - 0.05, 'Pakai <em>grafit</em> atau pensil'],
  [L[9].s - 0.1, 'Diputer sekali, <em>cekreeek!</em>'],
];
const RED = '#e5484d', GRN = '#30a46c', GRY = '#8a8a8f', YEL = '#ffe259', ORG = '#f08c2e';
const chipDefs = [
  [0, 'Terkunci', RED], [T(0, 'cekreeek'), 'Kebuka', GRN],
  [L[1].s - 0.15, 'Dua kunci', GRY], [T(1, 'intip'), 'Dibelah', GRY], [T(2, 'nyangkut'), 'Terkunci', RED],
  [L[3].s - 0.05, 'Gerak lambat 4×', YEL], [T(5, 'cocok'), 'Pas', GRN],
  [L[6].s, 'Kunci salah', ORG], [T(6, 'keblok'), 'Keblok', RED],
  [L[7].s - 0.05, 'Pas', GRN], [T(7, 'cekreeek'), 'Kebuka', GRN],
  [L[8].s - 0.1, 'Seret', RED], [T(8, 'macet'), 'Macet', RED], [T(8, 'pakai') - 0.05, 'Licin', GRN],
  [L[9].s - 0.1, 'Terkunci', RED], [T(9, 'cekreeek'), 'Kebuka', GRN],
];
const stampDefs = [
  [T(0, 'cekreeek'), L[0].e + 0.15, 'Cekreeek!', 'snd'],
  [T(2, 'bisa'), L[2].e + 0.15, 'Terkunci', ''],
  [T(6, 'keblok'), L[6].e + 0.25, 'Keblok!', ''],
  [T(7, 'cekreeek'), L[7].e + 0.2, 'Cekreeek!', 'snd'],
  [T(8, 'oli'), T(8, 'debu') + 0.2, 'Jangan oli!', ''],
  [T(9, 'cekreeek'), DUR + 1, 'Cekreeek!', 'snd'],
];
const shakeAt = [T(0, 'cekreeek'), T(6, 'keblok'), T(7, 'cekreeek'), T(9, 'cekreeek')];

// ---------- caption karaoke: potong per frasa (tanda baca / maks 5 kata) ----------
const chunks = [];
for (let li = 0; li < 10; li++) {
  let cur = [];
  const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => {
    cur.push(w);
    if (/[,.?!:…]$/.test(w.w) || cur.length >= 5 || i === ws.length - 1) { chunks.push(cur); cur = []; }
  });
}
const allW = chunks.flat();
allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });

// ---------- model per waktu ----------
const S = { k1: 30, k2: OUT, k2y: -17, rot: 0, split: 0, bottoms: [], tops: [], aligned: 0, wrong: false };
const jig = t => jigAt.reduce((a, s) => a + (t > s && t < s + 0.55 ? 0.045 * Math.sin((t - s) * 46) * (1 - (t - s) / 0.55) : 0), 0);
// tinggi ujung bawah pin i untuk posisi kunci tertentu (dipakai juga oleh EVENTS)
function pinBottom(i, k1, k2, k2y) {
  let y = REST;
  if (k1 < 60) y = Math.max(y, prof(key1.userData.pts, CZ[i] - k1));
  if (k2 < 60 && Math.abs(k2y) < 0.01) y = Math.max(y, prof(key2.userData.pts, CZ[i] - k2));
  return y;
}
const stateAt = t => ({ k1: track(key1Keys, t), k2: track(key2Keys, t), k2y: track(key2Y, t) });

function updateModel(t) {
  Object.assign(S, stateAt(t));
  S.rot = track(rotKeys, t) + jig(t);
  S.split = track(splitKeys, t);
  plug.rotation.z = S.rot;
  key1.position.set(0, 0, S.k1); key1.visible = S.k1 < 150;
  key2.position.set(0, S.k2y, S.k2); key2.visible = S.k2 < 150;
  const sp = easeIO(S.split);
  housingR.position.set(70 * sp, 14 * sp, 0); housingR.visible = sp < 0.999;
  plugR.position.set(70 * sp, 14 * sp, 0); plugR.visible = sp < 0.999;
  bolt.position.x = 11.5 * Math.sin(Math.min(0, track(rotKeys, t)));

  S.aligned = 0; S.wrong = S.k2 < 1;
  const turned = Math.abs(track(rotKeys, t)) > 0.02;
  CZ.forEach((z, i) => {
    const b = pinBottom(i, S.k1, S.k2, S.k2y), top = b + KPL[i];
    S.bottoms[i] = b; S.tops[i] = top;
    if (Math.abs(top - R) < 0.08) S.aligned++;
    keyPins[i].position.y = b;
    gapMk[i].position.y = top;
    const dBot = turned ? R : top;          // silinder berputar: pin atas tertahan di garis potong
    drivers[i].position.y = dBot;
    const len = CTOP - (dBot + DRV);
    springs[i].geometry.dispose();
    springs[i].geometry = new THREE.TubeGeometry(new Helix(len), 120, 0.2, 6, false);
    springs[i].position.y = dBot + DRV; midSP[i].position.y = len * 0.5;
  });

  // warna sebagai kode
  const k1Hi = Math.max(pulse(T(3, 'gerigi'), L[3].e + 0.1, t), pulse(T(4, 'gerigi'), L[4].e + 0.2, t));
  key1.userData.blade.hl('yellow', k1Hi);
  key1.userData.bow.hl('yellow', pulse(T(1, 'ini') - 0.1, T(1, 'yuk'), t));
  const gr = smooth(T(8, 'gosok'), T(8, 'pensil') + 0.2, t) * (1 - smooth(L[9].s - 0.15, L[9].s - 0.05, t));
  if (gr > 0) key1.userData.blade.hl('dark', gr * 0.55);
  key2.userData.blade.hl('orange', pulse(T(6, 'tetangga'), L[6].e + 0.1, t));
  const macet = pulse(T(8, 'macet'), T(8, 'pakai') - 0.05, t, 0.08);
  CZ.forEach((z, i) => {
    const wave = pulse(T(2, '5') + i * 0.08, T(2, 'tebalnya') - 0.1, t, 0.08);
    let kp = Math.max(wave, pulse(T(4, 'pin'), L[4].e + 0.15, t));
    let dr = Math.max(wave, pulse(T(2, 'nyangkut'), L[2].e + 0.1, t));
    kpMats[i].hl('yellow', kp); drMats[i].hl(dr > wave ? 'orange' : 'yellow', dr);
    if (i === 2) { const w = pulse(T(6, 'kurang'), L[6].e + 0.1, t); if (w > 0) drMats[i].hl('orange', w); }
    if (i === 1) { const w = pulse(T(6, 'kelebihan'), L[6].e + 0.1, t); if (w > 0) kpMats[i].hl('orange', w); }
    if (macet > 0) { kpMats[i].hl('orange', macet); drMats[i].hl('orange', macet); }
    spMats[i].hl('yellow', pulse(T(2, 'ditekan') - 0.1, T(2, 'pin', 1) - 0.05, t));
  });
  boltMat.hl('yellow', pulse(T(7, 'pengait'), L[7].e + 0.3, t));
  camMat.hl('yellow', pulse(T(7, 'pengait'), L[7].e + 0.3, t));

  // pegas sedikit membal waktu disebut
  // oli, debu, grafit
  const oilA = T(8, 'disemprot'), clean = T(8, 'pakai') - 0.05;
  blobs.forEach(b => {
    const p = clamp((t - oilA - b.d) / 0.35);
    b.o.visible = p > 0 && t < clean;
    b.o.position.set(b.x, b.y + 9 * (1 - easeIO(p)), b.z);
  });
  dusts.forEach(d => {
    const p = clamp((t - T(8, 'debu') - d.d * 0.6) / 0.45);
    d.o.visible = p > 0 && t < clean;
    const e = 1 - easeIO(p);
    d.o.position.set(d.x + d.fx * e, d.y + d.fy * e, d.z); d.o.rotation.set(t * 2 + d.d * 9, t * 3, 0);
  });
  grains.forEach(g => {
    const p = clamp((t - T(8, 'serbuk') - g.d * 0.5) / 0.4);
    g.o.visible = p > 0 && t < T(8, 'gosok') - 0.3;
    g.o.position.set(g.x, g.y + 10 * (1 - easeIO(p)), g.z);
  });
  // pensil menggosok punggung kunci
  const pv = t > T(8, 'gosok') - 0.3 && t < L[9].s - 0.1;
  pencil.visible = pv;
  if (pv) {
    const ph = clamp((t - T(8, 'gosok')) / (L[8].e - T(8, 'gosok')));
    const s = -14 + 11 * Math.sin(ph * Math.PI * 5 - Math.PI / 2);
    const zz = S.k1 + s;
    pencil.position.set(0, prof(key1.userData.pts, s) + 0.05 + (1 - smooth(T(8, 'gosok') - 0.3, T(8, 'gosok'), t)) * 6, zz);
  }
}

const tmpV = new THREE.Vector3();
function updateCamera(t) {
  const c = window.CAM_OVERRIDE || track(camKeys, t);
  const drift = 1 - 0.012 * Math.sin(t * 0.7);   // napas kamera halus, tidak pernah diam
  const h = c[3] * 1.55 * drift;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -h * W / H / 2; camera.right = h * W / H / 2;
  lock.updateMatrixWorld(true);
  const target = lock.localToWorld(tmpV.set(c[0], c[1], c[2]));
  const dir = V(1, 1.05, 1).normalize();
  camera.position.copy(target).addScaledVector(dir, 250);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  camera.position.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), h * 0.03);
  camera.updateMatrixWorld();
  let sh = 0; for (const s of shakeAt) if (t > s && t < s + 0.35) sh = (1 - (t - s) / 0.35);
  $('shake').style.transform = sh ? `translate(${(Math.sin(t * 91) * 14 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 10 * sh).toFixed(1)}px)` : '';
}

function project(p) {
  let v;
  if (p.isObject3D) v = p.getWorldPosition(new THREE.Vector3());
  else v = lock.localToWorld(V(...p));
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
let lastTitle = -1, lastChunk = -1, lastStamp = -1;
function updateOverlay(t) {
  let ti = 0; titleDefs.forEach((d, i) => { if (t >= d[0]) ti = i; });
  const tEl = $('title');
  if (ti !== lastTitle) { tEl.innerHTML = titleDefs[ti][1]; lastTitle = ti; }
  const tp = clamp((t - titleDefs[ti][0]) / 0.5);
  tEl.style.opacity = ti === 0 ? 1 : clamp((t - titleDefs[ti][0]) / 0.28);
  tEl.style.transform = ti === 0 ? '' : `translateY(${(26 * Math.pow(1 - tp, 4)).toFixed(1)}px)`;
  // angka: berapa pasang pin yang celahnya pas di garis potong, dihitung dari model
  $('rn').textContent = `${S.aligned}/5`;
  $('rn').style.color = S.aligned === 5 ? GRN : (S.wrong ? RED : '');
  let ci = 0; chipDefs.forEach((d, i) => { if (t >= d[0]) ci = i; });
  const chip = $('chip'); chip.textContent = chipDefs[ci][1]; chip.style.background = chipDefs[ci][2];
  chip.style.color = chipDefs[ci][2] === YEL ? '#16171b' : '#fff';
  tagDefs.forEach((d, i) => {
    const el = tagEls[i];
    if (t < d.s || t > d.e + 0.15) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const [x, y] = project(d.anchor());
    const w = el.offsetWidth, h = el.offsetHeight;
    const gap = 14;
    el.style.left = clamp(d.side === 'r' ? x + gap : x - gap - w, 24, W - 24 - w) + 'px';
    el.style.top = (y - h / 2) + 'px';
    el.style.setProperty('--ox', d.side === 'r' ? '0%' : '100%');
    const p = (t - d.s) / 0.38, o = clamp((t - d.e) / 0.15);
    el.style.opacity = clamp((t - d.s) / 0.16) * (1 - o);
    el.style.transform = `scale(${lerp(0.5, 1, backOut(p))})`;
  });
  let si = -1; stampDefs.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const st = $('stamp');
  if (si !== lastStamp) {
    st.innerHTML = si < 0 ? '' : `<span class="${stampDefs[si][3]}" data-t="${stampDefs[si][2]}">${stampDefs[si][2]}</span>`;
    lastStamp = si;
  }
  if (si >= 0) {
    const d = stampDefs[si], sp = st.firstChild;
    const pin = (t - d[0]) / 0.34, pout = clamp((t - d[1]) / 0.3);
    sp.style.opacity = clamp((t - d[0]) / 0.14) * (1 - pout);
    sp.style.transform = `rotate(-8deg) scale(${(lerp(1.7, 1, backOut(pin)) * lerp(1, 0.9, pout)).toFixed(3)})`;
  }
  const ci2 = chunks.findIndex(c => t >= c.s && t < c.e);
  const cap = $('cap');
  if (ci2 !== lastChunk) {
    cap.innerHTML = ci2 < 0 ? '' : `<span class="pill">${chunks[ci2].map(w => `<b>${w.w}</b>`).join(' ')}</span>`;
    lastChunk = ci2;
  }
  if (ci2 >= 0) {
    const pill = cap.firstChild, c = chunks[ci2];
    pill.style.opacity = lerp(0.2, 1, clamp((t - c.s) / 0.2));
    [...pill.children].forEach((b, k) => { const w = c[k]; b.className = t >= w.next ? 'past' : (t >= w.s ? 'cur' : ''); });
  }
  updateSvg(t);
}

// garis ukur pin (bab 2), garis potong + penanda celah (bab 5–7)
function updateSvg(t) {
  const svg = $('dim');
  let s = '';
  const a = smooth(T(2, '3') - 0.15, T(2, '3') + 0.2, t) * (1 - smooth(T(2, 'ditekan') - 0.1, T(2, 'ditekan') + 0.15, t));
  if (a > 0) {
    const y = S.tops[0] + 2.2, z = CZ[0];
    const p1 = project([0.3, y, z + PR]), p2 = project([0.3, y, z - PR]);
    const q1 = project([0.3, y + 3.4, z + PR]), q2 = project([0.3, y + 3.4, z - PR]);
    const k = backOut(clamp((t - T(2, '3') + 0.15) / 0.4));
    const mid = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];
    const m1 = [lerp(mid[0], q1[0], k), lerp(mid[1], q1[1], k)], m2 = [lerp(mid[0], q2[0], k), lerp(mid[1], q2[1], k)];
    s += `<g opacity="${a.toFixed(3)}" stroke="#16171b" stroke-width="5" stroke-linecap="round">
      <line x1="${p1[0]}" y1="${p1[1]}" x2="${q1[0]}" y2="${q1[1]}" stroke-dasharray="2 12"/>
      <line x1="${p2[0]}" y1="${p2[1]}" x2="${q2[0]}" y2="${q2[1]}" stroke-dasharray="2 12"/>
      <line x1="${m1[0]}" y1="${m1[1]}" x2="${m2[0]}" y2="${m2[1]}"/>
      <circle cx="${m1[0]}" cy="${m1[1]}" r="9" fill="#16171b"/><circle cx="${m2[0]}" cy="${m2[1]}" r="9" fill="#16171b"/>
      <g transform="translate(${mid[0] - 40} ${mid[1] - 80})" stroke="none">
        <rect x="-130" y="-42" width="260" height="84" rx="42" fill="#ffe259" stroke="#16171b" stroke-width="5"/>
        <text text-anchor="middle" y="17" font-family="ui-monospace, SF Mono, Menlo" font-weight="700" font-size="46" fill="#16171b">≈ 2,9 mm</text>
      </g></g>`;
  }
  // garis potong: batas silinder & rumah kunci di y = R
  const g0 = T(5, 'garis'), gl = smooth(g0 - 0.1, at(5, 'potong').e, t) * (1 - smooth(T(7, 'muter') - 0.3, T(7, 'muter'), t));
  if (gl > 0) {
    const za = 1.5, zb = lerp(za, -LEN - 0.5, clamp((t - g0 + 0.1) / 0.6));
    const p1 = project([0.15, R, za]), p2 = project([0.15, R, zb]);
    s += `<g opacity="${Math.min(1, gl * 3).toFixed(3)}" stroke-linecap="round">
      <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#16171b" stroke-width="15"/>
      <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#ffe259" stroke-width="7" stroke-dasharray="22 14"/></g>`;
  }
  // penanda celah tiap pasang pin
  const ga = Math.max(pulse(T(5, 'celah'), L[5].e + 0.2, t), pulse(T(6, 'satu'), L[6].e + 0.2, t), pulse(T(7, 'lima'), T(7, 'muter') - 0.1, t));
  if (ga > 0) CZ.forEach((z, i) => {
    const [x, y] = project(gapMk[i]);
    const ok = Math.abs(S.tops[i] - R) < 0.08;
    const col = t < L[6].s ? YEL : (ok ? '#30a46c' : ORG);
    const r = 17 * backOut(clamp((t - T(5, 'celah') - i * 0.06) / 0.3) || 1);
    s += `<circle cx="${x}" cy="${y}" r="${(18 * ga).toFixed(1)}" fill="${col}" stroke="#16171b" stroke-width="5" opacity="${ga.toFixed(3)}"/>`;
  });
  svg.innerHTML = s;
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  renderer.setClearColor(0xf3f3f0, 1);
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => {
  updateModel(t);
  updateCamera(t);
  draw();
  updateOverlay(t);
};

// peristiwa buat efek suara: klik tiap pin melewati puncak gerigi, cekrek, stempel, potongan
window.EVENTS = (() => {
  const ev = [];
  const prevY = [], prevV = [];
  for (let t = 0; t < DUR; t += 1 / 240) {
    const st = stateAt(t);
    CZ.forEach((z, i) => {
      const y = pinBottom(i, st.k1, st.k2, st.k2y);
      if (prevY[i] !== undefined) {
        const v = y - prevY[i];
        if (prevV[i] > 0.002 && v <= 0.0005) ev.push({ t: +t.toFixed(4), type: 'pin', i });
        if (prevV[i] < -0.002 && v >= -0.0005) ev.push({ t: +t.toFixed(4), type: 'pinDrop', i });
        prevV[i] = v;
      } else prevV[i] = 0;
      prevY[i] = y;
    });
  }
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[3] === 'snd' ? 'stampSnd' : 'stamp', text: d[2] }));
  for (const k of camKeys) if (k[2] === 'c') ev.push({ t: k[0], type: 'cut' });
  for (const w of [0, 7, 9]) ev.push({ t: T(w, 'cekreeek'), type: 'cekrek' });
  jigAt.forEach(s => ev.push({ t: s, type: 'jiggle' }));
  ev.push({ t: T(1, 'intip'), type: 'whoosh' }, { t: T(8, 'disemprot'), type: 'oil' }, { t: T(8, 'serbuk'), type: 'sprinkle' });
  for (let t = T(8, 'gosok'); t < L[8].e; t += (L[8].e - T(8, 'gosok')) / 5) ev.push({ t, type: 'rub' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: LS };
})();
window.DUR = DUR;
window.TW = T;
renderAt(0);
window.READY = true;
window.__dbg = { edge, camera, S, lock, plug, renderer, scene, draw, project, key1 };

// isyarat musik untuk sfx.py (calm → punch → klimaks → calm) + titik pil cover (piksel)
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(3).s); cue('drop', LN(4).s + 0.1); cue('build', LN(4).e);
  cue('reveal', LN(5).s); cue('warm', LN(5).e); cue('dark', LN(6).s); cue('resolve', LN(7).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => window.__dbg.project([0.1, 6.5, -28.5]);
