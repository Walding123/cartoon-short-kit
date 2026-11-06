// Video kuis "Lubang kecil di bawah gembok itu buat apa?" — gembok kuningan 40 mm tergantung di grendel pagar, gaya bedah.
// Alur (format Kuis): makro lubang misterius → kartu TEBAK + pilihan → hitung mundur 3-2-1 → jawaban B (lubang buang air)
// → gembok dibelah: air hujan masuk lewat celah gagang, menetes keluar lewat lubang → kalau terjebak: karat & beku → bonus pelumas.
// Satu model per waktu: belahan depan (open), aliran tetes air (drops), genangan (pool), karat/beku, semprotan pelumas.
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
const NL = 7;
const L = Array.from({ length: NL }, (_, i) => LN(i));
const DUR = +(L[NL - 1].e + 1.4).toFixed(3);
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

// ---------- palet, cel 3 nada (satu warna tegas per bagian) ----------
const flat = h => [h, h, h];
const PAL = {
  brass: ['#f4cf6a', '#d9a63a', '#a8792a'], bore: ['#c2914a', '#9c6f30', '#6e4c1e'], plugF: ['#f0d58a', '#d2b260', '#a88a3f'],
  chrome: ['#fbfcfd', '#c3cad4', '#7e8794'], steel: ['#dfe3ea', '#aab1bd', '#717887'], cam: ['#b9bec8', '#8c929e', '#5d636e'],
  keyPin: ['#f08a8d', '#e5484d', '#b8333a'], drvPin: ['#8fb0ff', '#5b7fd6', '#3e5fb8'], spring: ['#5b5f6b', '#3f434d', '#262930'],
  slot: flat('#2b2a30'), plate: ['#c9ccd2', '#9ea3ac', '#6f7480'], straw: ['#ff8a80', '#e5484d', '#b8333a'],
  rust: ['#d9875a', '#b0582a', '#7a3a18'], ice: ['#f2fbff', '#c9e9f8', '#94c9e6'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], hl: ['#f6dc8e', '#e3bf62', '#b8913a'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// Cel berbasis teori warna (lihat reference/panduan_warna.md): 2 nada + terminator lembut, bayangan bergeser ke ungu-biru sejuk
// (bukan sekadar gelap), sisi terang sedikit hangat, cahaya langit dari atas, cahaya pinggir (rim) sejuk, kilap sesuai bahan.
// m.hl(palet, k) = ganti warna ke palet sorot; m.glow(k) = sorotan lembut (pinggir menyala emas), warna asli tetap.
const GLOSS = { brass: 0.8, plugF: 0.6, chrome: 0.95, steel: 0.8, cam: 0.6, keyPin: 0.5, drvPin: 0.5, spring: 0.5, plate: 0.45, straw: 0.5, bore: 0.3, ice: 0.9 };
function cel(pal, gloss = GLOSS[pal] ?? 0.2, side = THREE.DoubleSide) {
  const [a, b, c] = C3(PAL[pal]);
  const m = new THREE.ShaderMaterial({
    side,
    uniforms: { c0: { value: a }, c1: { value: b }, c2: { value: c }, k: { value: 0 }, gl: { value: gloss }, gw: { value: 0 }, al: { value: 1 },
      h0: { value: C3(PAL.hl)[0] }, h1: { value: C3(PAL.hl)[1] }, h2: { value: C3(PAL.hl)[2] } },
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
        col = mix(col, t0 * vec3(1.02, 1.0, .965), smoothstep(.62, .74, d)) * .97;  // bidang terang, hangat
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
const tube = (pts, r, mat, closed = false) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed, 'catmullrom', 0.2), 160, r, 16, closed), mat);
class Helix extends THREE.Curve {   // pegas sepanjang +x
  constructor(len, r, turns) { super(); this.len = len; this.r = r; this.turns = turns; }
  getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * this.turns; return o.set(t * this.len, Math.cos(a) * this.r, Math.sin(a) * this.r); }
}

// ---------- gembok (mm; x = lebar, ke kanan layar; y = atas; z = tebal, +z menghadap kamera) ----------
// Ciri dari foto gembok kuningan 40 mm (Yale/Soligen/Master 140 di toko Indonesia):
//  1. Badan kuningan pejal kuning-emas, lebar 40 × tinggi 37 × tebal 18 mm, bahu atas membulat (r ±8), sudut bawah kecil, tepi dichamfer.
//  2. Gagang (shackle) baja krom berpenampang bulat Ø 6,4 mm, bentuk U, jarak dalam ±19 mm, tinggi bebas ±21 mm; dua kaki masuk ke bahu.
//  3. Di muka bawah: silinder anak kunci bulat Ø ±10,5 mm (warna kuningan lebih pucat) dengan alur kunci memanjang,
//     dan di sampingnya satu lubang kecil Ø ±2,4 mm = lubang buang air.
//  4. Muka depan bergrafir "SOLID BRASS"; digantung di grendel pagar (pelat + kawat U baja).
//  5. Isi (foto potongan gembok peraga): silinder tegak dari bawah, 4 pasang pin melintang (pin bawah + pin atas + pegas),
//     ujung silinder memutar cam di antara dua bola baja yang mengunci takik di kedua kaki gagang.
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
lt.rotation.y = Math.PI / 2;                       // lokal +z -> dunia +x (arah kamera azimut 90°), lokal +x -> kanan layar
const BW = 20, BH = 37, BD = 9;                    // setengah lebar, tinggi, setengah tebal
const SHX = 12.5, SHR = 3.2, SHY = 50, SHB = 21;   // kaki gagang di x = ±12,5; pusat lengkung y = 58; ujung bawah kaki
const PXC = 0, PRAD = 5.3, PTOP = 20.4;            // silinder anak kunci
const KW = [-4.2, 1.6, 19.2];                      // alur kunci x0, x1, tinggi
const PY = [4.6, 8.7, 12.8, 16.9], PINR = 1.25, CHR = 1.38, PEND = 17.6;   // 4 pasang pin melintang
const KL = [2.6, 3.7, 2.2, 3.1], DL = 4.0;         // panjang pin bawah (beda-beda), pin atas
const LAT = { x0: -16, x1: 16, y0: 20.4, y1: 26, d: 6 };   // rongga pengunci (cam + 2 bola)
const DRX = -10, DRR = 1.2;                        // lubang buang air
const BALLR = 2.6, BALLX = SHX - SHR + 1.2 - BALLR, BALLY = 23.2;

const outline = () => {
  const s = new THREE.Shape(), r = 8, rb = 2.5;
  s.moveTo(-BW + rb, 0); s.lineTo(BW - rb, 0); s.absarc(BW - rb, rb, rb, -Math.PI / 2, 0, false);
  s.lineTo(BW, BH - r); s.absarc(BW - r, BH - r, r, 0, Math.PI / 2, false);
  s.lineTo(-BW + r, BH); s.absarc(-BW + r, BH - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-BW, rb); s.absarc(-BW + rb, rb, rb, Math.PI, 1.5 * Math.PI, false);
  return s;
};
const brassMat = cel('brass');
// badan utuh (tepi dichamfer ke dalam)
const BT = 1.3;
const bodyFull = mesh(new THREE.ExtrudeGeometry(outline(), { depth: 2 * BD - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BT, bevelOffset: -BT, bevelSegments: 2, curveSegments: 40 }), brassMat, 0, 0, -BD + BT);
lt.add(bodyFull);
// belahan depan (digeser keluar saat dibelah)
const front = new THREE.Group(); lt.add(front);
front.add(mesh(new THREE.ExtrudeGeometry(outline(), { depth: BD - BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BT, bevelOffset: -BT, bevelSegments: 2, curveSegments: 40 }), brassMat, 0, 0, BT + 0.05));
// belahan belakang: dinding luar (tanpa tutup) + lempeng belakang + muka potong bertekstur (rongga dilubangi)
const back = new THREE.Group(); lt.add(back);
{ const g = new THREE.ExtrudeGeometry(outline(), { depth: 6.4, bevelEnabled: false, curveSegments: 40 });
  const side = g.groups[1]; g.setDrawRange(side.start, side.count); g.clearGroups();
  back.add(mesh(g, brassMat, 0, 0, -6.4));
  back.add(mesh(new THREE.ExtrudeGeometry(outline(), { depth: BD - 6.4, bevelEnabled: false, curveSegments: 40 }), brassMat, 0, 0, -BD)); }
// muka potong digambar di kanvas (16 px/mm): kuningan terbelah salem, rongga = transparan (dibuang di shader)
const CPX = 16;
function cutCanvas(x0, x1, y0, y1, paint) {
  const c = document.createElement('canvas'); c.width = (x1 - x0) * CPX; c.height = (y1 - y0) * CPX;
  const g = c.getContext('2d'); g.setTransform(CPX, 0, 0, -CPX, -x0 * CPX, y1 * CPX); paint(g);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const m = mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat, (x0 + x1) / 2, (y0 + y1) / 2, 0.02);
  m.userData.nmat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying vec3 vN; void main(){ if (texture2D(map, vUv).a < .5) discard; gl_FragColor = vec4(normalize(vN) * .5 + .5, 1.); }' });
  return m;
}
const rr = (g, x0, y0, x1, y1) => g.rect(x0, y0, x1 - x0, y1 - y0);
back.add(cutCanvas(-BW, BW, 0, BH, g => {
  const o = outline(), p = o.getPoints(40); g.beginPath(); p.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath();
  g.fillStyle = '#e8a07a'; g.fill();
  PY.forEach(y => { g.fillStyle = '#d98c66'; g.fillRect(PEND, y - CHR, 2.1, 2 * CHR); g.strokeStyle = '#a8603e'; g.lineWidth = 0.18; g.strokeRect(PEND, y - CHR, 2.1, 2 * CHR); });   // sumbat lubang pin
  g.globalCompositeOperation = 'destination-out'; g.beginPath();
  rr(g, -SHX - SHR - 0.2, LAT.y0, -SHX + SHR + 0.2, BH + 1); rr(g, SHX - SHR - 0.2, LAT.y0, SHX + SHR + 0.2, BH + 1);   // lubang kaki gagang
  rr(g, LAT.x0, LAT.y0, LAT.x1, LAT.y1);                     // rongga pengunci
  rr(g, PXC - PRAD, -1, PXC + PRAD, PTOP + 0.1);             // lubang silinder
  PY.forEach(y => rr(g, PXC + PRAD - 0.2, y - CHR, PEND, y + CHR));   // lubang pin di badan
  rr(g, DRX - DRR, -1, DRX + DRR, LAT.y0 + 0.1);             // saluran buang air
  g.fill();
}));
// permukaan dalam rongga
const boreMat = cel('bore');
const halfCylY = (x, y0, y1, r) => mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 28, 1, true, Math.PI / 2, Math.PI), boreMat, x, (y0 + y1) / 2, 0);
const halfCylX = (y, x0, x1, r) => { const m = mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 20, 1, true, Math.PI / 2, Math.PI), boreMat, (x0 + x1) / 2, y, 0); m.rotation.z = Math.PI / 2; return m; };
back.add(halfCylY(-SHX, LAT.y1 - 0.5, BH, SHR + 0.2), halfCylY(SHX, LAT.y1 - 0.5, BH, SHR + 0.2), halfCylY(DRX, 0, LAT.y0 + 0.5, DRR));
PY.forEach(y => back.add(halfCylX(y, PXC + PRAD - 0.2, PEND, CHR)));
{ const g = new THREE.BoxGeometry(LAT.x1 - LAT.x0, LAT.y1 - LAT.y0, LAT.d); back.add(mesh(g, cel('bore', 0.3, THREE.BackSide), 0, (LAT.y0 + LAT.y1) / 2, -LAT.d / 2)); }
// silinder anak kunci (belahan belakang): muka potong krem + alur kunci gelap + lubang pin
const plug = new THREE.Group(); back.add(plug);
plug.add(cutCanvas(PXC - PRAD, PXC + PRAD, 0, PTOP, g => {
  g.fillStyle = '#f6e6bd'; g.fillRect(PXC - PRAD, 0, 2 * PRAD, PTOP);
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); rr(g, KW[0], -1, KW[1], KW[2]); PY.forEach(y => rr(g, KW[1] - 0.1, y - CHR, PXC + PRAD + 1, y + CHR)); g.fill();
}));
plug.add(mesh(new THREE.PlaneGeometry(KW[1] - KW[0], KW[2]), cel('slot', 0.1), (KW[0] + KW[1]) / 2, KW[2] / 2, -1.0));
PY.forEach(y => plug.add(halfCylX(y, KW[1] - 0.1, PXC + PRAD, CHR)));
plug.add(halfCylY(PXC, 0, PTOP, PRAD + 0.02));
// cam di ujung silinder + dua bola pengunci (utuh, ikut terlihat saat dibelah)
const camMat = cel('cam'), ballMat = cel('chrome');
const cam = mesh(new THREE.BoxGeometry(2 * (BALLX - BALLR), 4.6, 5.6), camMat, 0, BALLY, 0); lt.add(cam);
const balls = [-1, 1].map(s => { const b = mesh(new THREE.SphereGeometry(BALLR, 28, 20), ballMat, s * BALLX, BALLY, 0); lt.add(b); return b; });
// pin (utuh): pin bawah merah berujung runcing, pin atas biru, pegas gelap — posisi diam (tanpa kunci = terkunci)
const keyPinMat = cel('keyPin'), drvPinMat = cel('drvPin'), springMat = cel('spring');
const pins = PY.map((y, i) => {
  const x0 = KW[1] - 0.9, kl = KL[i];
  const kp = new THREE.Group(); kp.position.set(x0, y, 0); lt.add(kp);
  const lath = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(PINR * 0.55, 0.45), new THREE.Vector2(PINR, 0.9), new THREE.Vector2(PINR, kl), new THREE.Vector2(0.001, kl)], 24);
  const k = mesh(lath, keyPinMat); k.rotation.z = -Math.PI / 2; kp.add(k);
  const d = mesh(new THREE.CylinderGeometry(PINR, PINR, DL, 24), drvPinMat, x0 + kl + DL / 2, y, 0); d.rotation.z = Math.PI / 2; lt.add(d);
  const s0 = x0 + kl + DL, sl = PEND - s0;
  const sp = mesh(new THREE.TubeGeometry(new Helix(sl, PINR * 0.78, 6.5), 140, 0.26, 8), springMat, s0, y, 0); lt.add(sp);
  return { kp, k, d, sp, x0, kl };
});
const innards = [cam, ...balls, ...pins.flatMap(p => [p.kp, p.d, p.sp])];
// gagang baja krom: kaki kiri, lengkung, kaki kanan (utuh)
const shMat = cel('chrome');
{ const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(V(-SHX, SHB, 0), V(-SHX, SHY, 0)));
  const arc = new THREE.Curve(); arc.getPoint = (t, o = new THREE.Vector3()) => o.set(-SHX * Math.cos(Math.PI * t), SHY + SHX * Math.sin(Math.PI * t), 0); path.add(arc);
  path.add(new THREE.LineCurve3(V(SHX, SHY, 0), V(SHX, SHB, 0)));
  lt.add(mesh(new THREE.TubeGeometry(path, 200, SHR, 24), shMat));
  [-SHX, SHX].forEach(x => { const c = mesh(new THREE.CircleGeometry(SHR, 24).rotateX(Math.PI / 2), shMat, x, SHB, 0); lt.add(c); }); }
// muka bawah (badan utuh): silinder bulat pucat + alur kunci + lubang buang air
const bottom = new THREE.Group(); bodyFull.add(bottom); bottom.position.z = BD - BT;   // (bodyFull digeser -BD+BT)
const plugFaceMat = cel('plugF'), holeMat = cel('slot', 0.1);
{ const disk = mesh(new THREE.CircleGeometry(PRAD, 40).rotateX(Math.PI / 2), plugFaceMat, PXC, -0.04, 0); bottom.add(disk);
  // alur kunci: profil berkelok (bentuk alur pin tumbler) memanjang searah pin
  const s = new THREE.Shape(); const ky = [[-4.2, -0.5], [-3.2, -0.5], [-2.8, 0.15], [-1.6, 0.15], [-1.2, -0.45], [0.2, -0.45], [0.6, 0.2], [1.6, 0.2], [1.6, 0.6], [0.2, 0.6], [-0.2, 0.05], [-1.4, 0.05], [-1.9, 0.65], [-3.6, 0.65], [-4.2, 0.2]];
  ky.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
  bottom.add(mesh(new THREE.ShapeGeometry(s).rotateX(Math.PI / 2), holeMat, PXC, -0.09, 0));
  bottom.add(mesh(new THREE.RingGeometry(PRAD, PRAD + 0.35, 40).rotateX(Math.PI / 2), cel('bore'), PXC, -0.06, 0)); }
const drainFace = mesh(new THREE.CircleGeometry(DRR, 28).rotateX(Math.PI / 2), holeMat, DRX, -0.08, 0); bottom.add(drainFace);
const drainRing = mesh(new THREE.RingGeometry(DRR, DRR + 0.45, 28).rotateX(Math.PI / 2), cel('bore'), DRX, -0.06, 0); bottom.add(drainRing);
// grendel pagar: pelat baja + kawat U yang melingkari lengkung gagang
const plateMat = cel('plate');
const hasp = new THREE.Group(); lt.add(hasp);
hasp.add(mesh(new THREE.BoxGeometry(34, 52, 3), plateMat, 0, SHY + 22, -33.5));
const STY0 = SHY + SHX - SHR - 2.5, STY1 = SHY + SHX + SHR + 2.6;
hasp.add(tube([[0, STY0, -32], [0, STY0, 1], [0, STY0 + 1.6, 5.2], [0, (STY0 + STY1) / 2, 6.6], [0, STY1 - 1.6, 5.2], [0, STY1, 1], [0, STY1, -32]], 2.5, cel('steel')));
[[-12, SHY + 2], [12, SHY + 2], [-12, SHY + 42], [12, SHY + 42]].forEach(([x, y]) => hasp.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 20).rotateX(Math.PI / 2), cel('steel'), x, y, -31.5)));
// sedotan semprotan pelumas (bonus)
const straw = tube([[DRX, -0.3, 0], [DRX, -9, 0.4], [DRX + 1.5, -26, 3], [DRX + 6, -60, 7]], 0.95, cel('straw'));
lt.add(straw);
const strawMat = straw.material;

// ---------- jadwal ----------
const tBuka0 = T(3, 'b');                          // "B" diucapkan = jawaban dibuka
const tTiga = T(2, 'tiga'), tDua = T(2, 'dua'), tSatu = T(2, 'satu');
const BUKA = tTiga + 2.92;                         // waktu-kuis: angka 3/2/1 jatuh tepat saat diucapkan
const KTW = [[0, 0], [tTiga - 0.6, tTiga - 0.6], [tTiga, BUKA - 2.92], [tDua, BUKA - 1.92], [tSatu, BUKA - 0.92], [tBuka0, BUKA]];
const kuisT = t => { if (t >= tBuka0) return t - tBuka0 + BUKA; for (let i = 1; i < KTW.length; i++) if (t < KTW[i][0]) { const [a0, b0] = KTW[i - 1], [a1, b1] = KTW[i]; return lerp(b0, b1, (t - a0) / (a1 - a0)); } return t; };
const QT = T(1, 'buat') - 0.15, QE = L[3].e + 0.7;
const FORMAT = { kuis: { t: QT, e: kuisT(QE), buka: BUKA, benar: 1, tanya: 'Lubang kecil ini buat apa?', pilihan: ['Tempat minyak / oli', 'Lubang buang air', 'Lubang kunci cadangan'] } };
const FMT = await import('./format.js'); FMT.pasang();

const tOpen = L[4].s - 0.15, tClose = L[6].s - 0.1;
const openKeys = [[0, 0], [tOpen, 0], [tOpen + 0.9, 1], [tClose, 1], [tClose + 0.8, 0]];
// tetes air di potongan: masuk di celah kaki kanan gagang -> rongga pengunci -> saluran -> keluar di bawah
const WPATH = [[SHX + SHR + 0.15, BH + 2], [SHX + SHR + 0.15, LAT.y0 + 0.9], [SHX - 2, LAT.y0 + 0.8], [DRX + 0.2, LAT.y0 + 0.8], [DRX, LAT.y0 - 1], [DRX, 0], [DRX, -3]];
const WLEN = (() => { let s = 0; for (let i = 1; i < WPATH.length; i++) s += Math.hypot(WPATH[i][0] - WPATH[i - 1][0], WPATH[i][1] - WPATH[i - 1][1]); return s; })();
const wAt = d => { for (let i = 1; i < WPATH.length; i++) { const [x0, y0] = WPATH[i - 1], [x1, y1] = WPATH[i], l = Math.hypot(x1 - x0, y1 - y0); if (d <= l) return [lerp(x0, x1, d / l), lerp(y0, y1, d / l)]; d -= l; } return WPATH[WPATH.length - 1]; };
const WSPEED = 40, WGAP = 0.36, wS = L[4].s + 0.5, wE = L[5].s + 0.2;       // mm/detik, jarak antar tetes (detik)
const dropsAt = t => { const out = []; for (let k = 0; ; k++) { const t0 = wS + k * WGAP; if (t0 > wE) break; const age = t - t0; if (age < 0) break; const d = age * WSPEED; if (d > WLEN + 40) continue; out.push({ k, d, age }); } return out; };
const tExit = k => wS + k * WGAP + (WLEN - 3) / WSPEED;   // tetes keluar dari lubang (bunyi)
// kalau terjebak (baris 5): air tertahan -> karat -> beku
const tBlock = L[5].s - 0.05, tRust = T(5, 'berkarat') - 0.1, tIce = T(5, 'membeku') - 0.1, tMacet = T(5, 'macet');
const poolAt = t => smooth(tBlock, tBlock + 1.2, t) * (1 - smooth(tClose - 0.3, tClose + 0.2, t));
// bonus pelumas (baris 6)
const tSpray = T(6, 'semprot') - 0.2, tSprayE = tSpray + 1.6;

// kamera: [x, y, z, tinggi pandang (mm), azimut° (0 = depan, + = dari kanan), elevasi°, ax, ay]
const MACRO = [DRX * 0.45, 0, 2, 64, -18, -40, 0.5, 0.5];
const MACRO2 = [DRX * 0.4, 1, 2, 84, -20, -36, 0.5, 0.52];
const QUIZ = [0, 10, 0, 185, -20, -26, 0.5, 0.735];
const REVEAL = [DRX * 0.5, 4, 0, 160, -20, -30, 0.5, 0.76];
const CUT = [2, 27, 0, 112, -10, 6, 0.5, 0.52];
const CUT2 = [0, 18, 0, 92, -8, 4, 0.5, 0.5];
const BONUS = [DRX * 0.6, -4, 2, 112, -22, -30, 0.5, 0.46];
const END = [-2, 14, 0, 150, -18, -16, 0.5, 0.6];
const camKeys = [[0, MACRO], [L[0].e, MACRO2], [QT + 0.6, QUIZ], [tBuka0 - 0.2, QUIZ], [tBuka0 + 0.5, REVEAL], [L[3].e + 0.4, REVEAL],
  [tOpen + 0.3, [1, 25, 0, 150, -14, -4, 0.5, 0.5]], [L[4].s + 1.2, CUT], [L[4].e, CUT], [tBlock + 0.6, CUT2], [tMacet + 0.4, CUT2],
  [tClose + 0.2, [0, 12, 0, 140, -16, -14, 0.5, 0.5]], [tClose + 1.0, BONUS], [tSprayE + 0.4, BONUS], [L[6].e - 0.4, END], [DUR, END]];

// ---------- label, stempel ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(0, 'lubang', 1) - 0.1, L[0].e + 0.2, 'Lubang kunci', () => [PXC + 2, -0.5, 0], 'r', '');
tag(T(0, 'lubang') + 0.15, L[0].e + 0.2, 'Ini buat apa?', () => [DRX - 1.4, -0.5, 0], 'l', 'hi');
tag(L[4].s + 1.3, L[4].e + 0.1, 'Air hujan', () => [SHX + SHR + 0.6, BH + 1, 0.5], 'r', '');
tag(L[4].s + 2.0, L[4].e + 0.1, 'Keluar di sini', () => [DRX - 1.4, 2, 0.5], 'l', 'hi');
tag(T(4, 'merembes') + 0.1, L[4].e + 0.1, 'Pin', () => [PEND - 3, PY[3], 1], 'r', '');
tag(tRust, tIce - 0.1, 'Berkarat', () => [PEND - 4, PY[1], 1], 'r', 'warn');
tag(tIce, tClose - 0.2, 'Beku', () => [BALLX + 2, BALLY, 1], 'r', 'warn');
tag(tSpray + 0.1, tSprayE + 0.6, 'Pelumas', () => [DRX + 3.5, -24, 2], 'r', 'hi');
const stampDefs = [
  [0.25, 1.55, 'Tes… tes…', 1240, 'snd'],
  [tMacet - 0.05, tClose - 0.25, 'Macet!', 1430, ''],
  [T(6, 'tebakanmu') - 0.1, DUR + 1, 'Tulis di|komentar', 470, 'snd'],
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
const S = { open: 0, dark: 0, dim: 0, pool: 0, rust: 0, ice: 0 };
function updateModel(t) {
  const o = S.open = track(openKeys, t);
  bodyFull.visible = o < 0.001; back.visible = front.visible = o >= 0.001;
  front.position.set(72 * easeIO(o), -10 * easeIO(o), 30 * easeIO(o));
  innards.forEach(m => (m.visible = o >= 0.001));
  // suasana: hook gelap -> terang; hitung mundur gelap; bahaya hangat
  S.dark = 0.55 * (1 - smooth(0.6, L[0].e, t)) + 0.62 * pulse(tTiga - 0.35, tBuka0 - 0.05, t, 0.25);
  S.dim = 0.25 * (1 - smooth(0.6, L[0].e, t)) + 0.3 * pulse(tTiga - 0.35, tBuka0 - 0.05, t, 0.25);
  S.pool = poolAt(t);
  S.rust = smooth(tRust, tRust + 0.8, t) * (1 - smooth(tIce, tIce + 0.6, t)) * (1 - smooth(tClose - 0.3, tClose + 0.2, t));
  S.ice = smooth(tIce, tIce + 0.8, t) * (1 - smooth(tClose - 0.3, tClose + 0.2, t));
  [keyPinMat, drvPinMat, springMat, ballMat, camMat].forEach(m => { if (S.ice > 0.01) m.hl('ice', S.ice * 0.75); else m.hl('rust', S.rust * 0.85); });
  // sorotan lubang buang air saat jawaban + bonus
  const g = pulse(tBuka0 - 0.05, L[3].e + 0.4, t, 0.2) + pulse(tSpray, tSprayE + 0.4, t, 0.2);
  drainRing.material.glow(g * 0.9); drainRing.material.hl('hl', g * 0.9);
  strawMat.glow(0); straw.visible = t > tClose + 0.6;
  straw.position.y = -14 * (1 - smooth(tClose + 0.6, tSpray, t));
  plugFaceMat.glow(0);
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[3] * (1 - 0.012 * Math.sin(t * 0.7));
  const w = h * W / H;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -w / 2; camera.right = w / 2;
  lt.updateMatrixWorld(true);
  const target = lt.localToWorld(tmpV.set(c[0], c[1], c[2]));
  const az = (90 + c[4]) * Math.PI / 180, el = c[5] * Math.PI / 180;
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 500);
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[6]) * w).addScaledVector(up, (c[7] - 0.5) * h);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  edge.mat.uniforms.dim.value = S.dim;
  // guncang kecil saat jawaban dibuka & saat macet
  const sh = 7 * Math.exp(-Math.max(0, t - tBuka0) * 9) * (t > tBuka0 ? 1 : 0) + 6 * Math.exp(-Math.max(0, t - tMacet) * 8) * (t > tMacet ? 1 : 0);
  $('shake').style.transform = sh > 0.2 ? `translate(${(Math.sin(t * 91) * sh).toFixed(1)}px, ${(Math.cos(t * 77) * sh).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: pagar besi bercat hijau-abu di bawah hujan, gembok tergantung di grendel ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <linearGradient id="gate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb3b6"/><stop offset="1" stop-color="#7f9699"/></linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".5" stop-color="#1d2440" stop-opacity="0"/><stop offset="1" stop-color="#1d2440" stop-opacity=".42"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="62%" r="70%"><stop offset="0" stop-color="#2a3346"/><stop offset="1" stop-color="#0c0e14"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#7f9699"/>
  <g id="env" filter="url(#dof)"></g>
  <g id="rain"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const f1 = v => v.toFixed(1);
const planeM = (o, u, v) => {
  const O = project(o), U = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const GZ = -35;   // bidang pintu pagar (di belakang pelat grendel)
function updateBg(t) {
  const pxmm = 1920 / CAM[3];
  $('dofb').setAttribute('stdDeviation', clamp((pxmm - 6) * 0.45, 0, 8).toFixed(2));
  // pintu pagar: panel besi bercat (a = x, b = -y) dengan rangka, paku keling, bilah tegak, noda karat & jejak air hujan
  let s = `<g transform="${planeM([0, 0, GZ], [1, 0, 0], [0, -1, 0])}">
    <rect x="-400" y="-400" width="800" height="900" fill="url(#gate)"/>
    ${Array.from({ length: 9 }, (_, k) => `<rect x="${-400 + k * 95}" y="-400" width="10" height="900" fill="#6f8689"/><rect x="${-392 + k * 95}" y="-400" width="4" height="900" fill="#b5c6c8"/>`).join('')}
    <rect x="-400" y="-112" width="800" height="16" fill="#5f7578"/><rect x="-400" y="-112" width="800" height="5" fill="#b9cacc"/>
    <rect x="-400" y="70" width="800" height="16" fill="#5f7578"/><rect x="-400" y="70" width="800" height="5" fill="#b9cacc"/>
    ${[-300, -205, -110, 70, 165, 260].map(x => `<circle cx="${x + 5}" cy="-104" r="4.5" fill="#5a6f72" stroke="#c4d3d5" stroke-width="1.5"/><circle cx="${x + 5}" cy="78" r="4.5" fill="#5a6f72" stroke="#c4d3d5" stroke-width="1.5"/>`).join('')}
    ${[[-150, -60, 70], [120, -20, 90], [-60, 40, 60], [40, -150, 50]].map(([x, y, l]) => `<path d="M${x} ${y}q3 ${l * 0.5} -1 ${l}" stroke="#6a7f82" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`).join('')}
    <ellipse cx="-230" cy="-60" rx="26" ry="12" fill="#a0745a" opacity=".45"/><ellipse cx="210" cy="30" rx="18" ry="9" fill="#a0745a" opacity=".4"/>
  </g>`;
  // bayangan kontak di pintu: pelat grendel + gembok (cahaya dari kiri-atas -> bayangan ke kanan-bawah)
  s += `<g transform="${planeM([0, 0, GZ + 0.1], [1, 0, 0], [0, -1, 0])}" filter="url(#soft)" fill="#2a2440">
    <rect x="-14" y="${-SHY - 46}" width="38" height="56" rx="6" opacity=".45"/>
    <rect x="${f1(-16 + 9)}" y="${f1(-BH - 6)}" width="44" height="${f1(BH + 4)}" rx="10" opacity=".34"/>
    <path d="M${-SHX + 7} ${-BH - 6} V${-SHY + 4} A${SHX} ${SHX} 0 0 1 ${SHX + 7} ${-SHY + 4} V${-BH - 6}" stroke="#2a2440" stroke-width="7" fill="none" opacity=".3"/></g>`;
  $('env').innerHTML = s;
  // hujan: garis miring tipis (tidak kena DOF), lebih rapat saat hook
  let r = '';
  const rain = 0.55 + 0.35 * (1 - smooth(0.5, L[1].s, t)) - 0.3 * smooth(L[3].e, L[4].s + 0.5, t);
  for (let k = 0; k < 46; k++) { const x0 = hash(k, 1) * 1180 - 50, sp = 1500 + hash(k, 2) * 900, ph = (t * sp / 1920 + hash(k, 3)) % 1, y = ph * 2200 - 200, l = 60 + hash(k, 4) * 70;
    r += `<line x1="${f1(x0 - y * 0.12)}" y1="${f1(y)}" x2="${f1(x0 - (y + l) * 0.12)}" y2="${f1(y + l)}" stroke="#e8f2f6" stroke-width="${f1(2 + hash(k, 5) * 2)}" stroke-linecap="round" opacity="${(rain * (0.25 + hash(k, 6) * 0.35)).toFixed(2)}"/>`; }
  $('rain').innerHTML = r;
  $('bgNight').setAttribute('opacity', (0.95 * S.dark).toFixed(3));
}

// ---------- efek: grafir, tetes air, genangan, karat/beku, semprotan ----------
const WATER = '#5fb8ff', WATER_L = '#d9f1ff';
function dropSVG(x, y, r, op = 1) {   // tetes: badan biru + kilau putih + cahaya lembut
  return `<g opacity="${op.toFixed(2)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.2)}" fill="${WATER}" opacity=".22"/>
    <path d="M${f1(x)} ${f1(y - r * 1.7)} C${f1(x + r * 0.4)} ${f1(y - r * 0.9)} ${f1(x + r)} ${f1(y - r * 0.4)} ${f1(x + r)} ${f1(y + r * 0.1)} A${f1(r)} ${f1(r)} 0 1 1 ${f1(x - r)} ${f1(y + r * 0.1)} C${f1(x - r)} ${f1(y - r * 0.4)} ${f1(x - r * 0.4)} ${f1(y - r * 0.9)} ${f1(x)} ${f1(y - r * 1.7)}Z" fill="${WATER}" stroke="#1a3c66" stroke-width="${f1(Math.max(2, r * 0.18))}"/>
    <ellipse cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.05)}" rx="${f1(r * 0.22)}" ry="${f1(r * 0.36)}" fill="${WATER_L}"/></g>`;
}
function updateFx(t) {
  let s = '';
  const pxmm = 1920 / CAM[3];
  // grafir "SOLID BRASS" di muka depan (badan utuh atau belahan depan)
  { const z = BD + 0.05, sh = S.open > 0.001 ? front.position.toArray() : [0, 0, 0];
    const vis = CAM[5] > -34 ? 1 : 0;
    if (vis) s += `<g transform="${planeM([sh[0] - 13, sh[1] + 15, z + sh[2]], [1, 0, 0], [0, -1, 0])}" opacity=".7"><text x="13" y="0" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800" font-size="3.7" letter-spacing=".35" text-anchor="middle" fill="#8a6220">SOLID BRASS</text>
      <text x="13" y="6.5" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="3.2" letter-spacing=".5" text-anchor="middle" fill="#8a6220">40 mm</text></g>`; }
  // hook: tetes jatuh dari lubang kecil (lingkaran misterius)
  if (t < L[1].s) {
    const [hx, hy] = project([DRX, -0.2, 0]);
    s += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(DRR * pxmm * (2.3 + 0.25 * Math.sin(t * 5)))}" fill="none" stroke="#e3bf62" stroke-width="5" stroke-dasharray="14 10" opacity="${(0.85 * smooth(T(0, 'lubang'), T(0, 'lubang') + 0.3, t)).toFixed(2)}"/>`;
    for (const t0 of [0.15, 1.35, 2.55, 3.75]) { const a = t - t0; if (a < 0 || a > 1.1) continue;
      const grow = smooth(0, 0.45, a), fall = Math.max(0, a - 0.45);
      s += dropSVG(hx, hy + (0.9 + 0.8 * grow) * pxmm + 0.5 * 9800 * fall * fall * pxmm / 1000 * 0.6, (0.6 + 0.45 * grow) * pxmm, 1 - smooth(0.85, 1.1, a)); }
  }
  // jawaban: tetes keluar dari lubang buang air
  if (t > tBuka0 && t < L[4].s) { const [hx, hy] = project([DRX, -0.2, 0]);
    for (let k = 0; k < 4; k++) { const a = t - tBuka0 - 0.15 - k * 0.55; if (a < 0 || a > 1) continue; const fall = Math.max(0, a - 0.3);
      s += dropSVG(hx, hy + (1.2 + 3 * smooth(0, 0.3, a)) * pxmm / 1.6 + 2900 * fall * fall * pxmm / 1000, 0.85 * pxmm, 1 - smooth(0.75, 1, a)); } }
  // potongan: aliran tetes di dalam gembok
  if (S.open > 0.5) {
    for (const d of dropsAt(t)) {
      let x, y;
      if (d.d <= WLEN) [x, y] = wAt(d.d); else { const f = (d.d - WLEN) / WSPEED; [x, y] = [DRX, -3 - 0.5 * 9800 * f * f]; }
      if (S.pool > 0.3 && y < LAT.y0 + 0.9 && d.d > 30) continue;     // tertahan saat lubang "tersumbat"
      const [px, py] = project([x, y, 1.5]);
      s += dropSVG(px, py, 0.95 * pxmm, 1 - smooth(WLEN + 20, WLEN + 40, d.d));
    }
    // genangan (kalau air tidak bisa keluar): rongga pengunci + celah pin terisi air -> karat -> es
    if (S.pool > 0.01) {
      const lv = LAT.y0 + (LAT.y1 - LAT.y0 - 0.6) * S.pool, iceK = S.ice;
      const fill = iceK > 0.05 ? `rgba(${Math.round(lerp(95, 214, iceK))},${Math.round(lerp(184, 240, iceK))},255,${(0.5 + 0.3 * iceK).toFixed(2)})` : 'rgba(95,184,255,.5)';
      const poly = (pts) => `<polygon points="${pts.map(p => project([p[0], p[1], 3.4])).map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="${fill}" stroke="#1a3c66" stroke-width="3"/>`;
      s += poly([[LAT.x0 + 0.2, LAT.y0 + 0.2], [LAT.x1 - 0.2, LAT.y0 + 0.2], [LAT.x1 - 0.2, lv], [LAT.x0 + 0.2, lv]]);
      s += poly([[DRX - DRR + 0.1, LAT.y0 * (1 - S.pool)], [DRX + DRR - 0.1, LAT.y0 * (1 - S.pool)], [DRX + DRR - 0.1, LAT.y0 + 0.3], [DRX - DRR + 0.1, LAT.y0 + 0.3]]);
      PY.forEach((y, i) => { if (S.pool > 0.4 + i * 0.12) s += poly([[KW[1], y - CHR + 0.15], [PEND - 0.2, y - CHR + 0.15], [PEND - 0.2, y - CHR + 0.15 + (2 * CHR - 0.3) * clamp((S.pool - 0.4 - i * 0.12) * 4)], [KW[1], y - CHR + 0.15 + (2 * CHR - 0.3) * clamp((S.pool - 0.4 - i * 0.12) * 4)]]); });
      // "tanpa lubang": sumbat merah di bawah saluran
      const [bx, by] = project([DRX, 0.2, 3]);
      s += `<g opacity="${smooth(tBlock, tBlock + 0.3, t).toFixed(2)}"><rect x="${f1(bx - 2.2 * pxmm)}" y="${f1(by - 1.2 * pxmm)}" width="${f1(4.4 * pxmm)}" height="${f1(2.4 * pxmm)}" rx="${f1(0.6 * pxmm)}" fill="#c9373f" stroke="#1b1a1f" stroke-width="4"/>
        <path d="M${f1(bx - 1.2 * pxmm)} ${f1(by - 0.7 * pxmm)}l${f1(2.4 * pxmm)} ${f1(1.4 * pxmm)}M${f1(bx + 1.2 * pxmm)} ${f1(by - 0.7 * pxmm)}l${f1(-2.4 * pxmm)} ${f1(1.4 * pxmm)}" stroke="#fff" stroke-width="${f1(0.35 * pxmm)}" stroke-linecap="round"/></g>`;
      // kristal es
      if (iceK > 0.05) for (let k = 0; k < 14; k++) { const x = lerp(LAT.x0 + 1.5, LAT.x1 - 1.5, hash(k, 9)), y = lerp(LAT.y0 + 0.8, lv - 0.6, hash(k, 8)), [cx, cy] = project([x, y, 3.6]), rr2 = (0.5 + hash(k, 7) * 0.6) * pxmm * iceK;
        s += `<path d="M${f1(cx - rr2)} ${f1(cy)}h${f1(2 * rr2)}M${f1(cx)} ${f1(cy - rr2)}v${f1(2 * rr2)}M${f1(cx - rr2 * 0.7)} ${f1(cy - rr2 * 0.7)}l${f1(rr2 * 1.4)} ${f1(rr2 * 1.4)}M${f1(cx + rr2 * 0.7)} ${f1(cy - rr2 * 0.7)}l${f1(-rr2 * 1.4)} ${f1(rr2 * 1.4)}" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`; }
    }
  }
  // bonus: kabut pelumas naik masuk ke lubang
  if (t > tSpray && t < tSprayE + 0.8) { const a = pulse(tSpray, tSprayE, t, 0.15);
    for (let k = 0; k < 18; k++) { const ph = (t * 1.8 + hash(k, 3)) % 1, x = DRX + (hash(k, 4) - 0.5) * 2.4 * (1 - ph), y = -9 + ph * 9.5, [cx, cy] = project([x, y, 0.5]);
      s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1((0.35 + 0.3 * hash(k, 5)) * pxmm)}" fill="#f6dc8e" stroke="#8a6220" stroke-width="2" opacity="${(a * Math.sin(Math.PI * ph)).toFixed(2)}"/>`; } }
  $('dim').innerHTML = s;
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
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = o.userData.nmat || normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) o.material = o.userData.m0; });
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); FMT.gambar(kuisT(t), FORMAT, project); };
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  [0.15, 1.35, 2.55].forEach(t0 => ev.push({ t: t0 + 0.75, type: 'tetes' }));
  ev.push({ t: 0, type: 'hujan', dur: L[1].s + 0.5 });
  ev.push({ t: QT, type: 'card' }, { t: QT + 0.05, type: 'whoosh' });
  [tTiga, tDua, tSatu].forEach(x => ev.push({ t: x, type: 'clack' }, { t: x, type: 'heart' }));
  ev.push({ t: tBuka0, type: 'reveal' }, { t: tBuka0 + 0.05, type: 'chime' }, { t: tBuka0 + 0.05, type: 'hit' });
  for (let k = 0; k < 4; k++) ev.push({ t: tBuka0 + 0.15 + k * 0.55 + 0.45, type: 'tetes' });
  ev.push({ t: tOpen, type: 'lid' }, { t: tOpen + 0.05, type: 'whoosh' });
  for (let k = 0; ; k++) { const t0 = wS + k * WGAP; if (t0 > wE) break; const x = tExit(k); if (x < tBlock) ev.push({ t: x, type: 'tetes' }); }
  ev.push({ t: tBlock, type: 'blip' }, { t: tRust, type: 'rub' }, { t: tIce, type: 'crack' }, { t: tMacet, type: 'jiggle' });
  ev.push({ t: tClose, type: 'lid' }, { t: tSpray, type: 'desis', dur: tSprayE - tSpray });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', L[0].e - 0.5); cue('act1', L[1].s); cue('danger', L[2].s - 0.2); cue('build', tTiga);
  cue('drop', tBuka0 - 0.15); cue('reveal', tBuka0); cue('warm', L[4].s); cue('dark', L[5].s); cue('resolve', L[6].s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project([DRX, -0.5, 0]);
