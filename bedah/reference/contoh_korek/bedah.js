// Video "Kok korek gas nyala tanpa baterai?" — korek gas piezo dibelah, gaya bedah dari korek awal (palet mewah).
// Kamera berkomposisi (sepertiga/golden), zoom & sorotan per komponen, latar SVG blueprint, efek benturan/listrik/percikan.
// Satu model: langkah tombol D(t) -> tuas jungkat (katup naik D x 3,7/10,7), pegas, palu -> kristal -> listrik -> percikan -> api.
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
const NL = 10;
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
    float e = 0.;
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
      if (length(c - c2) > .28) e = max(e, .85);
    }
    float a = d > .99999 ? e : 1.;                 // piksel latar: transparan kecuali garis siluet
    gl_FragColor = vec4(mix(c * mix(vec3(1.), vec3(.42, .46, .58), dim), vec3(.106, .102, .122), e) * a, a);
  }`, { tC: { value: rtCol.texture }, tN: { value: rtNor.texture }, tD: { value: rtCol.depthTexture },
  px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) }, r: { value: 2.6 }, far: { value: FAR - NEAR }, zs: { value: 0.3 }, dim: { value: 0 } });
const out = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`, { t: { value: rtComp.texture } });

// ---------- palet mewah, cel 3 nada ----------
const PAL = {
  lacquer: ['#b84256', '#8e2436', '#64172a'], gold: ['#f6dc8e', '#e3bf62', '#b8913a'], tin: ['#eeeae2', '#cfc8bb', '#a39b8d'],
  cut: ['#f0dccd', '#f0dccd', '#f0dccd'], tank: ['#d9cfc9', '#bfb2ab', '#9e8f88'], liquid: ['#cfe0f5', '#a9c4ea', '#7f9fd0'],
  cutLiq: ['#dbe8f8', '#dbe8f8', '#dbe8f8'], lever: ['#4a4549', '#353034', '#221e21'], cutLever: ['#5b5559', '#5b5559', '#5b5559'],
  hole: ['#3a3135', '#3a3135', '#3a3135'], gas: ['#a9dfcb', '#5fb59a', '#327f69'],
  ivory: ['#fbf7ef', '#e9e0cf', '#c9bba3'], cutIvory: ['#f7f1e4', '#f7f1e4', '#f7f1e4'],
  crys: ['#d9c2f7', '#a987de', '#7a5bb3'], cutCrys: ['#c8acf0', '#c8acf0', '#c8acf0'],
  steel: ['#a9a4a8', '#7d777c', '#555055'], cutSteel: ['#97919a', '#97919a', '#97919a'],
  copper: ['#f2a46f', '#d9773f', '#a8551f'],
  flameO: ['#f7b267', '#ee8a3c', '#d4692a'], flameM: ['#ffe39a', '#f9cf63', '#ecb23f'], flameI: ['#c9d6ff', '#8fa6f0', '#5f78d0'],
  shell: ['#c4e2f4', '#8cc2e4', '#5e9ac6'], cutShell: ['#d8ecf8', '#d8ecf8', '#d8ecf8'], tankIn: ['#f1f8fc', '#e2eff8', '#c8deef'],
  liqB: ['#8cb8ef', '#5d93dc', '#3f71bd'], cutLiqB: ['#9fc3f1', '#9fc3f1', '#9fc3f1'], felt: ['#ffffff', '#ecebe6', '#cfcbc0'], cutFelt: ['#f7f6f2', '#f7f6f2', '#f7f6f2'],
  ceramic: ['#ecebf1', '#c9c6d6', '#9c98ae'], cutCeramic: ['#dcd9e8', '#dcd9e8', '#dcd9e8'], wireB: ['#86b5ff', '#3f72d8', '#2a4fa3'], vapor: ['#f2f8ff', '#d3e5f8', '#a9c6ea'],
  frost: ['#fdfdfb', '#e9e8e2', '#c8c6bd'], cutFrost: ['#f6f5f0', '#f6f5f0', '#f6f5f0'],
  chrome: ['#fbfcfd', '#c3cad4', '#7e8794'], cutChrome: ['#e3e7ed', '#e3e7ed', '#e3e7ed'], slot: ['#2e3036', '#2e3036', '#2e3036'],
  hl: ['#f6dc8e', '#e3bf62', '#b8913a'], warn: ['#f0a57a', '#d9773f', '#a8551f'], ok: ['#5fae8c', '#1f7a5c', '#155a43'],
};
const C3 = p => p.map(h => new THREE.Color(h));
function cel(pal, alpha = 1) {
  const [a, b, c] = C3(PAL[pal]);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: alpha < 1, depthWrite: alpha >= 1,
    uniforms: { c0: { value: a }, c1: { value: b }, c2: { value: c }, k: { value: 0 }, uA: { value: alpha },
      h0: { value: C3(PAL.hl)[0] }, h1: { value: C3(PAL.hl)[1] }, h2: { value: C3(PAL.hl)[2] } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 c0, c1, c2, h0, h1, h2; uniform float k, uA; varying vec3 vN;
      void main(){ float d = dot(normalize(vN), normalize(vec3(.45, 1., .3)));
        vec3 col = d > .62 ? mix(c0, h0, k) : (d > .15 ? mix(c1, h1, k) : mix(c2, h2, k));
        gl_FragColor = vec4(col, uA); }`,
  });
  m.hl = (p2, k) => { const p = C3(PAL[p2]); m.uniforms.h0.value = p[0]; m.uniforms.h1.value = p[1]; m.uniforms.h2.value = p[2]; m.uniforms.k.value = k; };
  return m;
}
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
// persegi di bidang potong x=0 (u = z, v = y), normal +x
const cutRect = (z0, z1, y0, y1, mat, dx = 0) => {
  const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0).rotateY(Math.PI / 2);
  return mesh(g, mat, 0.004 + dx, (y0 + y1) / 2, (z0 + z1) / 2);
};
// setengah silinder elips (x ≤ 0), sumbu y: rx (tebal), rz (lebar)
const halfEll = (rx, rz, y0, y1, mat, open = false) => {
  const g = new THREE.CylinderGeometry(1, 1, y1 - y0, 56, 1, open, Math.PI, Math.PI);
  const m = mesh(g, mat, 0, (y0 + y1) / 2, 0); m.scale.set(rx, 1, rz); return m;
};
// penampang badan korek: persegi bersudut bulat (lebar 2·rz, tebal 2·rx, sudut rc); titik (z, x) setengah x ≤ 0
const UZX = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0));   // bentuk (z, x) diekstrusi ke +y
const ZYB = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0));  // bentuk (z, y) diekstrusi ke -x
const shp = pts => { const s = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v))); s.closePath(); return s; };
const arcPts = (cu, cv, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
const halfRR = (rx, rz, rc, z1 = rz) => [[-rz, 0], ...arcPts(-rz + rc, -rx + rc, rc, Math.PI, 1.5 * Math.PI), ...(z1 >= rz ? arcPts(rz - rc, -rx + rc, rc, 1.5 * Math.PI, 2 * Math.PI) : [[z1, -rx]]), [z1, 0]];
const prism = (pts, y0, y1, mat) => mesh(new THREE.ExtrudeGeometry(shp(pts), { depth: y1 - y0, bevelEnabled: false }).applyMatrix4(UZX).translate(0, y0, 0), mat);
// dinding saja (bentuk U): luar lalu dalam dibalik
const shellPts = (rx, rz, rc, w, z1 = rz) => { const o = halfRR(rx, rz, rc, z1), i = halfRR(rx - w, rz - w, rc - w, z1 >= rz ? rz - w : z1); return [...o.slice(1, -1), [z1 >= rz ? rz : z1, 0], ...(z1 >= rz ? [[rz - w, 0]] : []), ...i.slice(1, -1).reverse(), [-rz + w, 0], [-rz, 0]]; };
// setengah tabung bulat di z = zc: permukaan dalam terlihat + muka potong dinding
const halfTube = (r, w, y0, y1, zc, mat, cmat, parent, bottom = 0) => {
  const m = halfEll(r, r, y0, y1, mat, true); m.position.z = zc; parent.add(m);
  parent.add(cutRect(zc - r, zc - r + w, y0, y1, cmat), cutRect(zc + r - w, zc + r, y0, y1, cmat));
  if (bottom) parent.add(cutRect(zc - r, zc + r, y0, y0 + bottom, cmat));
};
const halfRod = (r, y0, y1, zc, mat, cmat, parent) => {
  const m = halfEll(r, r, y0, y1, mat); m.position.z = zc; parent.add(m);
  parent.add(cutRect(zc - r, zc + r, y0, y1, cmat, 0.002));
};

// ---------- model korek gas piezo (mm) ----------
// Bentuk mengikuti korek gas piezo sekali pakai; di belakang ada unit piezo (z = PZ), di depan katup + tudung logam.
const root = new THREE.Group(); scene.add(root);
const lt = new THREE.Group(); root.add(lt);
lt.rotation.y = -0.55;                              // bidang potong menghadap kamera
const RX = 7.5, RZ = 12.5, WALL = 1.4, BODY_TOP = 64, TANK_TOP = 56, PZ = 6.5, VZ = -3;
// Badan plastik bening berwarna (seperti korek gas warung): penampang 25 × 13 mm bersudut bulat; belahan kanan tembus pandang.
const RC = 4.2;
const bodyMat = cel('shell'), cutMat = cel('cutShell'), tankMat = cel('tankIn'), tinMat = cel('tin');
const frontL = new THREE.Group(), frontR = new THREE.Group(); lt.add(frontL, frontR);
frontL.add(prism(shellPts(RX, RZ, RC, WALL), 0, BODY_TOP, bodyMat));
frontL.add(prism(halfRR(RX, RZ, RC), 0, WALL, bodyMat));
frontL.add(prism(halfRR(RX - WALL, RZ - WALL, RC - WALL), BODY_TOP - 0.6, BODY_TOP, bodyMat));
frontL.add(prism(halfRR(RX - WALL, RZ - WALL, RC - WALL).map(([z, x]) => [z, x * 0.12 - (RX - WALL) * 0.88]), WALL, BODY_TOP - 0.6, tankMat));   // dinding belakang dalam
// muka potong badan: dasar, dua dinding samping, blok atas (lubang katup & lubang unit piezo)
for (const r of [[-RZ, RZ, 0, WALL], [-RZ, -RZ + WALL, 0, BODY_TOP], [RZ - WALL, RZ, 0, BODY_TOP],
  [-RZ + WALL, -4.6, TANK_TOP, BODY_TOP], [-1.6, PZ - 4.4, TANK_TOP, BODY_TOP], [PZ + 4.4, RZ - WALL, TANK_TOP, BODY_TOP]]) frontL.add(cutRect(...r, cutMat));
const glassMat = cel('shell', 0.34);
const fr = prism(halfRR(RX, RZ, RC), 0, BODY_TOP, glassMat); fr.scale.x = -1; fr.userData.noNormal = true; frontR.add(fr);
// gas cair (isobutana) setengah silinder sampai permukaan + muka potong; bisa surut (gas habis)
const liqMat = cel('liqB'), liqCut = cel('cutLiqB');
const LEVEL = 30;
const liquid = new THREE.Group(); lt.add(liquid);
liquid.add(prism(halfRR(RX - WALL - 0.05, RZ - WALL - 0.05, RC - WALL), WALL, LEVEL, liqMat));
liquid.add(cutRect(-RZ + WALL, RZ - WALL, WALL, LEVEL, liqCut));
// kotak berongga setengah (x ≤ 0): dinding belakang, dua dinding samping, alas; muka potong dinding
const halfBox = (zc, hz, hx, y0, y1, w, mat, cmat, parent, bottom = 0) => {
  const h = y1 - y0, ym = (y0 + y1) / 2;
  parent.add(mesh(new THREE.BoxGeometry(w, h, 2 * hz), mat, -hx + w / 2, ym, zc));
  for (const sz of [-1, 1]) parent.add(mesh(new THREE.BoxGeometry(hx, h, w), mat, -hx / 2, ym, zc + sz * (hz - w / 2)));
  parent.add(cutRect(zc - hz, zc - hz + w, y0, y1, cmat), cutRect(zc + hz - w, zc + hz, y0, y1, cmat));
  if (bottom) { parent.add(mesh(new THREE.BoxGeometry(hx, bottom, 2 * hz), mat, -hx / 2, y0 + bottom / 2, zc)); parent.add(cutRect(zc - hz, zc + hz, y0, y0 + bottom, cmat)); }
};
const halfBlock = (zc, hz, hx, y0, y1, mat, cmat, parent) => {
  parent.add(mesh(new THREE.BoxGeometry(hx, y1 - y0, 2 * hz), mat, -hx / 2, (y0 + y1) / 2, zc));
  parent.add(cutRect(zc - hz, zc + hz, y0, y1, cmat, 0.002));
};
// kantong unit piezo (dicetak menyatu dengan badan, terpisah dari gas)
halfBox(PZ, 4.3, 3.9, 29.4, TANK_TOP, 0.5, bodyMat, cutMat, lt, 0.5);

// unit piezo: rumah persegi putih susu (tetap) + kontak kuningan di bawah, kristal keramik ber-ujung logam, landasan, palu,
// pegas, selongsong atas (ikut tombol) bertutup logam
const ivMat = cel('frost'), ivCut = cel('cutFrost');
halfBox(PZ, 3.0, 2.7, 31, 52, 0.6, ivMat, ivCut, lt, 0.8);
halfRod(1.6, 28.6, 31, PZ, cel('gold'), cel('gold'), lt);             // kontak bawah (kuningan)
const crysMat = cel('ceramic'), crysCut = cel('cutCeramic');
const crystal = new THREE.Group(); lt.add(crystal);
halfRod(1.4, 32.2, 38.4, PZ, crysMat, crysCut, crystal);
const capMat = cel('chrome'), capCut = cel('cutChrome');
halfRod(1.55, 31.8, 32.2, PZ, capMat, capCut, crystal); halfRod(1.55, 38.4, 39, PZ, capMat, capCut, crystal);   // ujung logam kristal
halfRod(2.0, 39, 40.5, PZ, capMat, capCut, lt);                      // landasan
const hammer = new THREE.Group(); lt.add(hammer);
const hamMat = cel('steel'), hamCut = cel('cutSteel');
halfBlock(PZ, 2.3, 2.1, 0, 5, hamMat, hamCut, hammer);
halfRod(1.0, -1, 0, PZ, hamMat, hamCut, hammer);                     // hidung palu
const HY0 = 49, HYHIT = 41.5;                                         // palu tertahan / hidung kena landasan
const sleeve = new THREE.Group(); lt.add(sleeve);
const slMat = cel('frost'), slCut = cel('cutFrost');
halfBox(PZ, 3.6, 3.3, 50, 67.3, 0.5, slMat, slCut, sleeve);
halfBlock(PZ, 3.6, 3.3, 67.3, 68, capMat, capCut, sleeve);           // tutup logam atas
class Helix extends THREE.Curve {
  constructor(len, r, turns) { super(); this.len = len; this.r = r; this.turns = turns; }
  getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * this.turns; return o.set(Math.cos(a) * this.r, t * this.len, Math.sin(a) * this.r); }
}
const springMat = cel('chrome');
const spring = mesh(new THREE.BufferGeometry(), springMat, 0, 0, PZ); lt.add(spring); spring.frustumCulled = false;
// kabel tembaga: landasan -> naik di samping kantong -> elektroda di dalam tudung
const wireMat = cel('wireB');
const wirePts = [[40, PZ - 2.2], [41.6, PZ - 3.6], [44, 1.7], [56, 1.5], [63.5, 1.3], [70, 0.6], [76.5, 0.4], [79.2, 0.1]];
const wireCurve = new THREE.CatmullRomCurve3(wirePts.map(([y, z]) => V(0.6, y, z)), false, 'catmullrom', 0.3);
lt.add(mesh(new THREE.TubeGeometry(wireCurve, 90, 0.38, 8), wireMat));
const WIRE_S = wireCurve.getSpacedPoints(48);
const ELTIP = [0.6, 79.5, -1.2];
lt.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(0.6, 79.2, 0.1), V(...ELTIP)), 4, 0.24, 8), cel('copper')));   // ujung tembaga terbuka

// katup + nosel (z = -3): naik saat ujung depan tuas terangkat
const valve = new THREE.Group(); lt.add(valve);
const valveMat = cel('chrome');
valve.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 16, 24), valveMat, 0, 66, VZ));
valve.add(mesh(new THREE.CylinderGeometry(0.9, 1.5, 2, 24), valveMat, 0, 75, VZ));
valve.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.1, 24), cel('lever'), 0, 65.55, VZ));     // kerah pengatur api (diangkat tuas)
const wick = new THREE.Group(); lt.add(wick);
halfRod(1.1, WALL + 1.5, 58.2, VZ, cel('felt'), cel('cutFelt'), wick);                         // sumbu/filter putih ke gas cair
lt.add(mesh(new THREE.TubeGeometry(new Helix(4, 2.2, 4), 60, 0.22, 6), capMat, 0, TANK_TOP, VZ));
// tuas jungkat: poros di z = 0,7; ujung depan di bawah kerah katup, garpu mengapit selongsong, ujung belakang ditekan tombol
const LPZ = 0.7, LPY = 64.55, ARM_F = 3.7, ARM_B = 10.7;
const lever = new THREE.Group(); lever.position.set(0, LPY, LPZ); lt.add(lever);
const leverMat = cel('chrome'), leverCut = cel('cutChrome'), btnCut = cel('cutLever');
const bar = (x0, x1, z0, z1) => { const b = mesh(new THREE.BoxGeometry(x1 - x0, 0.9, z1 - z0), leverMat, (x0 + x1) / 2, 0, (z0 + z1) / 2); lever.add(b); };
bar(-5.2, 0, -5.4, PZ - 4.6 - LPZ);                                  // lengan depan
bar(-5.2, -4.4, PZ - 4.6 - LPZ, PZ + 4.6 - LPZ);                     // garpu (di belakang selongsong)
bar(-5.2, 0, PZ + 4.6 - LPZ, ARM_B + 0.6);                           // ujung belakang
lever.add(cutRect(-5.4, PZ - 4.6 - LPZ, -0.45, 0.45, leverCut, 0.002), cutRect(PZ + 4.6 - LPZ, ARM_B + 0.6, -0.45, 0.45, leverCut, 0.002));
lever.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 6, 16).rotateZ(Math.PI / 2), tinMat, -3, 0, 0));
const leverMk = new THREE.Object3D(); leverMk.position.set(0.1, 0.5, -2.2); lever.add(leverMk);
// tombol: setengah balok (belahan kanan ikut terbuka) + lidah penekan tuas
const button = new THREE.Group(); lt.add(button);
const BT = { z0: 1.6, z1: RZ, y0: 68, y1: 73.5 };
const btnMat = cel('lever');
// profil samping tutup (z, y): depan tegak, atas melengkung turun ke belakang, sudut belakang membulat, rok sampai badan
const btnProf = [[BT.z0, BT.y0], [BT.z0, 74.6], ...Array.from({ length: 9 }, (_, i) => { const u = (i + 1) / 9, z = lerp(BT.z0, RZ - 3.2, u); return [z, 74.6 - 1.4 * u * u]; }),
  ...arcPts(RZ - 3.2, 70, 3.2, Math.PI / 2, 0, 6), [RZ, BT.y0]];
const btnGeo = new THREE.ExtrudeGeometry(shp(btnProf), { depth: RX, bevelEnabled: false }).applyMatrix4(ZYB);
button.add(mesh(btnGeo, btnMat));
const btnR = new THREE.Group(); button.add(btnR);
{ const m = mesh(btnGeo, btnMat); m.scale.x = -1; btnR.add(m); }
for (const sx of [-1, 1]) {                                                   // rok tutup: dinding samping luar + belakang
  const g = sx < 0 ? button : btnR;
  g.add(mesh(new THREE.BoxGeometry(0.7, BT.y0 - 64.8, RZ - BT.z0), btnMat, sx * (RX - 0.35), (BT.y0 + 64.8) / 2, (RZ + BT.z0) / 2));
  g.add(mesh(new THREE.BoxGeometry(RX, BT.y0 - 64.8, 0.7), btnMat, sx * RX / 2, (BT.y0 + 64.8) / 2, RZ - 0.35));
}
button.add(mesh(new THREE.ShapeGeometry(shp(btnProf)).applyMatrix4(ZYB), btnCut, 0.006));
button.add(mesh(new THREE.BoxGeometry(3, BT.y0 - (LPY + 0.45), 1.2), btnMat, -1.5, (BT.y0 + LPY + 0.45) / 2, LPZ + ARM_B));   // lidah ke ujung belakang tuas
// tudung logam (penahan angin) di atas katup: dinding belakang + samping, lubang-lubang
const HB = 64, HT = 80, HZ1 = 1.2, HW = 0.5;
const hood = new THREE.Group(); lt.add(hood);
const hoodMat = cel('chrome'), holeMat = cel('slot'), hoodCut = cel('cutChrome');
const hoodGeo = new THREE.ExtrudeGeometry(shp(shellPts(RX, RZ, RC, HW, HZ1)), { depth: HT - HB, bevelEnabled: false }).applyMatrix4(UZX).translate(0, HB, 0);
hood.add(mesh(hoodGeo, hoodMat));
hood.add(cutRect(-RZ, -RZ + HW, HB, HT, hoodCut, 0.003), cutRect(HZ1 - HW, HZ1, HB, HT, hoodCut, 0.003));
const slots = sx => Array.from({ length: 3 }, (_, k) => mesh(new THREE.BoxGeometry(0.3, 7, 1.4), holeMat, sx * (RX + 0.06), 72.5, -8.6 + k * 3));
hood.add(...slots(-1));
const hoodR = new THREE.Group(); frontR.add(hoodR);
const hR = mesh(hoodGeo, hoodMat); hR.scale.x = -1; hoodR.add(hR, ...slots(1));
// api: tiga lapis tetes, uap gas
const drop = (h, r) => new THREE.LatheGeometry(Array.from({ length: 16 }, (_, i) => { const u = i / 15; return new THREE.Vector2(r * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.25 * u), u * h); }), 32);
const flame = new THREE.Group(); flame.position.set(0, 76.2, VZ); lt.add(flame);
const fO = mesh(drop(26, 5.2), cel('flameO')), fM = mesh(drop(17, 3.4), cel('flameM')), fI = mesh(drop(6, 1.9), cel('flameI'));
fO.position.x = -0.2; fM.position.x = 0.6; fI.position.x = 1.6; flame.add(fO, fM, fI);
const gasMat = cel('vapor');
const puffs = Array.from({ length: 8 }, () => { const o = mesh(new THREE.SphereGeometry(1, 14, 10), gasMat); lt.add(o); return o; });
const bubs = Array.from({ length: 14 }, () => { const o = mesh(new THREE.SphereGeometry(1, 12, 8), gasMat); lt.add(o); return o; });

// ---------- jadwal: langkah tombol D (mm), pukulan palu, nyala api ----------
// Babak: 0 hook gelap (percikan makro) · 1 korek utuh, cetek · 2 bongkar · 3 tuas & katup · 4 pegas · 5 palu (gerak lambat, meredup)
// · 6 waktu "membeku": kristal = listrik, 220 V · 7 listrik loncat, api menerangi · 8 pelan/cepat sama · 9 kompor + cetek penutup
const DMAX = 4;
const pressKeys = [
  [0, 0], [T(1, 'cetek') - 0.32, 0], [T(1, 'cetek') - 0.03, DMAX], [L[1].e + 0.5, DMAX], [L[2].s - 0.05, 0],
  [T(3, 'tekan'), 0], [T(3, 'tuas') + 0.2, 1.9], [T(4, 'tombol'), 1.9], [at(4, 'kencang').e, 3.7], [T(5, 'ujung'), 3.85], [T(5, 'lepas') - 0.05, DMAX],
  [L[7].e + 0.3, DMAX], [L[8].s - 0.05, 0],
  [T(8, 'ditekan'), 0], [T(8, 'atau') - 0.03, DMAX], [T(8, 'cepat') - 0.3, 0], [T(8, 'cepat') - 0.03, DMAX], [L[8].e + 0.2, DMAX], [L[9].s - 0.05, 0],
  [T(9, 'cetek') - 0.32, 0], [T(9, 'cetek') - 0.03, DMAX],
];
const Dat = t => track(pressKeys, t);
const liftOf = D => ARM_F * clamp(D / ARM_B, 0, 1);                 // tuas jungkat: katup naik D × 3,7/10,7
// pukulan: lepas (rel) -> kena kristal (hit) -> [waktu membeku] -> listrik lari di kabel (bolt..zap) -> percikan -> api (ign)
const strikes = [
  { hit: T(1, 'cetek') },
  { rel: T(5, 'lepas'), hit: T(5, 'kristal'), bolt: T(7, 'listriknya'), zap: T(7, 'loncat'), spark: T(7, 'menyala') + 0.25 - T(7, 'loncat'),
    ign: T(7, 'menyala') - 0.1, grow: 0.5 },
  { hit: T(8, 'atau') },
  { hit: T(8, 'cepat') },
  { hit: T(9, 'cetek'), ign: T(9, 'cetek') + 0.08 },
];
const tankAt = () => 1;
const STEP = 1 / 240;
for (const s of strikes) {
  s.rel = s.rel ?? s.hit - 0.03; s.zap = s.zap ?? s.hit + 0.18; s.bolt = s.bolt ?? s.hit; s.spark = s.spark ?? 0.22;
  let t = s.hit; while (t < DUR + 2 && Dat(t) > 1) t += STEP; s.reset = t;
  s.lit = liftOf(Dat(s.zap)) > 0.5;
  s.ign = s.ign ?? s.zap + 0.03; s.grow = s.grow ?? 0.14;
  t = s.ign; while (t < DUR + 2 && liftOf(Dat(t)) > 0.4) t += STEP; s.out = t;
}
const hammerY = t => {
  let y = HY0;
  for (const s of strikes) {
    if (t < s.rel || t > s.reset + 0.2) continue;
    y = t < s.hit ? lerp(HY0, HYHIT, Math.pow((t - s.rel) / (s.hit - s.rel), 2)) : lerp(HYHIT, HY0, smooth(s.reset - 0.05, s.reset + 0.15, t));
  }
  return y;
};
const fireAt = t => strikes.reduce((a, s) => s.lit ? Math.max(a, smooth(s.ign, s.ign + s.grow, t) * (1 - smooth(s.out - 0.02, s.out + 0.12, t))) : a, 0);
const HOOK = [0.15, L[0].e + 0.35];                                    // percikan makro di pembuka (tanpa tekan, efek "cuplikan")
const sparkOn = t => (t >= HOOK[0] && t < HOOK[1] && hash(Math.floor(t * 12)) > 0.25) || strikes.some(s => t >= s.zap && t < s.zap + s.spark);
const impulse = t => strikes.reduce((a, s) => Math.max(a, t >= s.hit ? Math.exp(-(t - s.hit) * 9) : 0), 0);
// gelap: pembuka & momen palu–kristal–listrik; api yang menyala menerangi kembali
const darkKeys = [[0, 1], [L[0].e + 0.2, 1], [T(1, 'tanpa') + 0.2, 0], [T(5, 'lepas') - 0.1, 0], [T(5, 'kristal'), 1], [T(7, 'menyala'), 1], [T(7, 'menyala') + 0.7, 0]];
// belahan kanan: terbuka di pembuka (makro), tertutup di babak 1, terbuka lagi saat "bongkar", tertutup di penutup
const splitKeys = [[0, 1], [L[0].e + 0.25, 1], [T(1, 'tanpa'), 0], [T(2, 'rahasianya') - 0.1, 0], [T(2, 'kotak'), 1], [L[9].s - 0.1, 1], [T(9, 'ada'), 0]];
const SLOW = [[T(3, 'tekan') - 0.1, L[7].e]];

// ---------- kamera berkomposisi ----------
// key: [t, [z, y, tinggi pandang, azimut°, elevasi°, ax, ay, sorot]]; titik fokus (z, y) ke titik komposisi (ax, ay) layar
const G1 = 0.382, G2 = 0.618, R1 = 0.333, R2 = 0.667;
const camKeys = [
  [0, [-2.2, 78, 16, 40, 14, 0.5, 0.52, 0]], [L[0].e, [-2.2, 78, 20, 44, 16, 0.5, 0.52, 0]],
  [T(1, 'tanpa') + 0.1, [-1, 52, 100, 26, 8, 0.5, 0.56, 0]], [T(1, 'cetek'), [-2, 62, 90, 30, 10, 0.5, 0.58, 0]], [L[1].e + 0.3, [-2, 62, 94, 34, 12, 0.5, 0.58, 0]],
  [T(2, 'rahasianya'), [0, 50, 104, 46, 20, 0.5, 0.56, 0]], [T(2, 'putih'), [PZ, 50, 58, 60, 18, R1, G2, 0.8]], [T(2, 'yuk') - 0.1, [PZ, 50, 60, 60, 18, R1, G2, 0.8]],
  [at(2, 'bongkar').e + 0.3, [0, 42, 104, 48, 24, 0.5, 0.56, 0]],
  [T(3, 'tekan'), [5, 70, 52, 50, 52, R1, G1 + 0.1, 0.6]], [T(3, 'tuas'), [0, 66, 38, 44, 40, 0.5, G2, 0.85]], [T(3, 'katup'), [VZ, 70, 40, 36, 26, G2, G2, 0.85]], [T(3, 'gas'), [VZ, 80, 56, 32, 22, G2, R2, 0.7]],
  [T(4, 'tombol'), [PZ, 54, 56, 70, 18, R1, G2, 0.85]], [T(4, 'pegas'), [PZ, 59, 40, 76, 14, R1, G2, 0.9]], [L[4].e + 0.1, [PZ, 58, 40, 80, 12, R1, G2, 0.9]],
  [T(5, 'palu') - 0.1, [PZ, 47, 40, 64, 10, 0.42, 0.52, 0.95]], [T(5, 'kristal') - 0.2, [PZ, 43, 30, 60, 6, 0.42, 0.56, 0.95]],
  [T(6, 'kristal'), [PZ, 40, 40, 56, 10, 0.5, 0.66, 0.9]], [L[6].e, [PZ, 40, 44, 54, 10, 0.5, 0.68, 0.9]],
  [T(7, 'listriknya'), [3, 58, 74, 52, 20, 0.5, 0.56, 0.4]], [T(7, 'loncat') - 0.1, [-1.5, 78, 26, 40, 18, G2, 0.56, 0.85]], [T(7, 'gasnya'), [-1.5, 79, 30, 36, 16, G2, 0.58, 0.8]],
  [T(7, 'menyala') + 0.4, [VZ, 88, 62, 28, 10, 0.55, 0.56, 0.3]], [L[7].e + 0.3, [VZ, 88, 64, 26, 8, 0.55, 0.56, 0.3]],
  [T(8, 'ditekan') - 0.2, [5, 56, 80, 56, 26, 0.5, 0.7, 0.3]], [L[8].e, [5, 56, 84, 58, 26, 0.5, 0.7, 0.3]],
  [L[9].s, [0, 54, 104, 36, 12, 0.5, 0.6, 0]], [T(9, 'pemantik') - 0.1, [-115, 70, 640, 34, 26, 0.5, 0.56, 0]], [T(9, 'dapurmu') + 0.2, [-115, 70, 610, 36, 26, 0.5, 0.56, 0]],
  [T(9, 'cetek') - 0.02, [-2, 60, 92, 24, 6, 0.5, 0.6, 0]], [DUR, [-2, 62, 88, 18, 5, 0.5, 0.6, 0]],
];

// ---------- label, teks kinetik ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(0, 'listrik'), L[0].e + 0.2, 'Percikan listrik', () => [0.5, 80.6, 0.6], 'l', 'hi');
tag(T(2, 'kotak'), T(2, 'yuk') - 0.05, 'Kotak piezo', () => [0, 46, PZ + 3.4], 'r', 'hi');
tag(T(3, 'tombolnya'), T(3, 'tuas') - 0.05, 'Tombol', () => [0, BT.y1 - Dat(T(3, 'tuas')), 9], 'r', 'hi');
tag(T(3, 'tuas'), T(3, 'katup') - 0.05, 'Tuas', () => leverMk, 'r', 'hi');
tag(T(3, 'katup'), T(3, 'gas') - 0.05, 'Katup', () => [0, 70 + S.lift, VZ - 1.5], 'l', 'hi');
tag(T(3, 'gas'), L[3].e + 0.3, 'Gas keluar', () => puffs[2], 'l', 'ok');
tag(T(4, 'pegas'), L[4].e + 0.2, 'Pegas', () => [2, (S.hy + 5 + 67.3 - S.D) / 2, PZ + 2], 'r', 'hi');
tag(T(5, 'palu'), T(5, 'kristal') - 0.05, 'Palu', () => [0.1, S.hy + 2.5, PZ + 2.4], 'r', 'hi');
tag(T(5, 'kristal'), T(6, 'kristal') - 0.1, 'Kristal', () => [0.1, 35, PZ + 1.5], 'r', 'hi');
tag(T(7, 'celah'), T(7, 'gasnya') - 0.05, 'Celah ±2 mm', () => [0.5, 80.6, 0.6], 'l', 'hi');
tag(T(9, 'kompor'), T(9, 'cetek') - 0.15, 'Pemantik piezo', () => [STOVE.x1 + 1, 64, STOVE.kz], 'r', 'hi');
tag(T(8, 'pegasnya'), L[8].e + 0.2, 'Pegas', () => [2, (S.hy + 5 + 67.3 - S.D) / 2, PZ + 2], 'r', 'hi');
const titleDefs = [[0, '']];
const STEPS = [['', 0]];
const RED = '#9b2c3f', GRN = '#1f7a5c', GRY = '#7a7368', GOLD = '#e3bf62', COP = '#c06a2e';
// teks kinetik besar: kata muncul satu per satu (jatuh + membal); [mulai, akhir, teks ('|' = baris baru), y, gaya]
const stampDefs = [
  [T(0, 'ribuan'), L[0].e + 0.5, 'Ribuan|volt', 1060, 'snd'],
  [T(1, 'tanpa'), T(1, 'cuma') - 0.05, 'Tanpa|baterai', 1060, ''],
  [T(1, 'cetek'), L[1].e + 0.45, 'Cetek!', 1100, 'snd'],
  [T(5, 'memukul'), T(6, 'kristal') - 0.1, 'Tak!', 1240, 'snd'],
  [T(6, 'ribuan'), T(6, 'lebih') - 0.05, 'Ribuan|volt', 1060, 'snd'],
  [T(7, 'menyala'), L[7].e + 0.3, 'Fwush!', 1180, 'snd'],
  [T(9, 'cetek'), DUR + 1, 'Cetek!', 1180, 'snd'],
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
const S = { D: 0, lift: 0, fire: 0, hy: HY0, tank: 1, imp: 0, dark: 0 };
function updateModel(t) {
  S.D = Dat(t); S.lift = liftOf(S.D); S.fire = fireAt(t); S.hy = hammerY(t); S.tank = 1; S.imp = impulse(t);
  S.dark = track(darkKeys, t) * (1 - smooth(0.05, 0.9, S.fire));        // api menerangi kegelapan
  button.position.y = -S.D; sleeve.position.y = -S.D; hammer.position.y = S.hy;
  lever.rotation.x = Math.asin(clamp(S.D / ARM_B, 0, 1));
  valve.position.y = S.lift;
  const top = 67.3 - S.D, bot = S.hy + 5;
  spring.geometry.dispose(); spring.geometry = new THREE.TubeGeometry(new Helix(top - bot, 2.0, 7), 140, 0.24, 6); spring.position.y = bot;
  const sp = easeIO(track(splitKeys, t));
  frontR.position.set(30 * sp, 6 * sp, 0); frontR.visible = sp < 0.999;
  btnR.position.x = 30 * sp; btnR.position.y = 6 * sp; btnR.visible = sp < 0.999;
  const fl = S.fire, fk = 1 + 0.06 * Math.sin(t * 31) + 0.04 * Math.sin(t * 53 + 1);
  flame.visible = fl > 0.02;
  flame.scale.set(lerp(0.3, 1, fl), lerp(0.15, 1, fl) * fk, lerp(0.3, 1, fl));
  flame.rotation.x = 0.04 * Math.sin(t * 7);
  flame.position.y = 76.2 + S.lift;
  const gasOn = S.lift > 0.5 && fl < 0.5;
  puffs.forEach((o, i) => {
    const q = ((t * 1.6 + i / puffs.length) % 1);
    o.visible = gasOn;
    o.position.set(-0.5, 77 + S.lift + q * 14, VZ + Math.sin(i * 2.3 + t * 3) * (1 + q * 3)); o.scale.setScalar(0.45 + q * 1.3);
  });
  bubs.forEach((o, i) => {
    const q = ((t * 0.9 + hash(i)) % 1);
    o.visible = S.lift > 0.5;
    o.position.set(-1.5 - hash(i, 2) * 3, WALL + 3 + q * (LEVEL - WALL - 4), -9 + hash(i, 3) * 18); o.scale.setScalar(0.5 + hash(i, 4) * 0.8);
  });
  // warna sebagai kode
  const glowK = strikes[1];
  const crysGlow = Math.max(strikes.reduce((a, s) => Math.max(a, t >= s.hit ? Math.max(0, 1 - (t - s.hit) / 0.6) : 0), 0),
    smooth(glowK.hit, glowK.hit + 0.2, t) * (1 - smooth(glowK.bolt, glowK.bolt + 0.4, t)));
  crysMat.hl('hl', crysGlow); crysCut.hl('hl', crysGlow);
  wireMat.hl('hl', clamp((t - glowK.bolt) / (glowK.zap - glowK.bolt)) * (1 - smooth(glowK.zap + 0.6, glowK.zap + 1.2, t)));
  leverMat.hl('hl', pulse(T(3, 'tuas'), T(3, 'katup'), t)); leverCut.hl('hl', pulse(T(3, 'tuas'), T(3, 'katup'), t));
  btnMat.hl('hl', Math.max(pulse(T(3, 'tombolnya'), T(3, 'tuas'), t), pulse(T(4, 'tombol'), T(4, 'pegas'), t) * 0.6));
  valveMat.hl('hl', pulse(T(3, 'katup'), T(3, 'gas'), t));
  const box = pulse(T(2, 'kotak'), T(2, 'yuk'), t);
  slMat.hl('hl', box); slCut.hl('hl', box * 0.6); ivMat.hl('hl', box * 0.6);
  springMat.hl('warn', Math.max(pulse(T(4, 'pegas'), L[4].e + 0.1, t), pulse(T(8, 'pegasnya'), L[8].e, t)));
  hamCut.hl('hl', pulse(T(5, 'palu'), T(5, 'kristal'), t)); hamMat.hl('hl', pulse(T(5, 'palu'), T(5, 'kristal'), t) * 0.6);
}

const tmpV = new THREE.Vector3();
let CAM = [0, 60, 100, 45, 30, 0.5, 0.5, 0];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2] * (1 - 0.012 * Math.sin(t * 0.7)) * (1 - 0.07 * S.imp);      // napas + punch-in saat benturan
  const w = h * W / H;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -w / 2; camera.right = w / 2;
  lt.updateMatrixWorld(true);
  const target = lt.localToWorld(tmpV.set(0, c[1], c[0]));
  const az = clamp(c[3], 25, 66) * Math.PI / 180, el = (16 + c[4] * 0.8) * Math.PI / 180, roll = 0.05 * S.imp * Math.sin(t * 40);
  camera.position.copy(target).addScaledVector(V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), 400);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(target); camera.updateMatrixWorld();
  const right = V(1, 0, 0).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, (0.5 - c[5]) * w).addScaledVector(up, (c[6] - 0.07 - 0.5) * h);   // tanpa teks atas: fokus naik ±130 px
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  edge.mat.uniforms.zs.value = 0.3 * h / 60;
  $('shake').style.transform = S.imp > 0.05 ? `translate(${(Math.sin(t * 91) * 12 * S.imp).toFixed(1)}px, ${(Math.cos(t * 77) * 9 * S.imp).toFixed(1)}px)` : '';
  // gelap: objek diredupkan (bagian bercahaya digambar di atasnya), latar ikut gelap
  const dk = S.dark;
  edge.mat.uniforms.dim.value = dk;
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: dapur (meja, dinding keramik, jendela, gelas, tanaman, kompor) ----------
// Kamera ortografis = proyeksi affine, jadi tiap bidang datar dipetakan persis lewat matrix(); benda bulat/kotak
// digambar dari titik-titik yang diproyeksikan. Semua di belakang/samping korek (tidak menutupi model 3D).
// Kedalaman fokus: lingkungan diburamkan sebanding zoom. Gelap & cahaya api ikut lapisan di atasnya.
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <pattern id="tile" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#f6f0e6"/><rect x="1.5" y="1.5" width="57" height="57" rx="4" fill="#fbf7f0"/><path d="M60 0H0V60" fill="none" stroke="#e1d5c2" stroke-width="3"/></pattern>
  <pattern id="wood" width="400" height="36" patternUnits="userSpaceOnUse"><rect width="400" height="36" fill="#dcc09a"/><path d="M0 35H400" stroke="#cfae84" stroke-width="2"/><path d="M40 12q60 -6 140 0t160 2" fill="none" stroke="#d2b48c" stroke-width="2"/></pattern>
  <linearGradient id="sky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d9ecf6"/><stop offset="1" stop-color="#a9d2ec"/></linearGradient>
  <radialGradient id="shad"><stop offset="0" stop-color="#5a4632" stop-opacity=".38"/><stop offset="1" stop-color="#5a4632" stop-opacity="0"/></radialGradient>
  <radialGradient id="sunp"><stop offset="0" stop-color="#fff6dc" stop-opacity=".75"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
  <radialGradient id="warm" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffd59a" stop-opacity=".95"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#3a2d1e" stop-opacity="0"/><stop offset="1" stop-color="#3a2d1e" stop-opacity=".28"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#232838"/><stop offset="1" stop-color="#0d0f15"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#efe6d6"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>
  <rect id="bgWarm" width="1080" height="1920" fill="url(#warm)" opacity="0"/>`;
const WX = -120;                                                         // dinding belakang (x lokal)
const STOVE = { x0: -110, x1: 100, z0: -400, z1: -130, h: 88, bz: -265, kz: -180 };  // kompor portabel satu tungku di meja yang sama
const P2 = p => project(p);
const f1 = v => v.toFixed(1);
const ptsAttr = a => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
// matriks bidang: o (asal), u & v (vektor 1 mm) -> transform SVG
const planeM = (o, u, v) => {
  const O = P2(o), U = P2([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = P2([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const area = a => a.reduce((s, p, i) => { const q = a[(i + 1) % a.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
// kotak: gambar sisi yang menghadap kamera (normal sisi · arah ke kamera > 0, dalam koordinat korek)
function boxSVG(x0, x1, y0, y1, z0, z1, top, side1, side2, stroke = '#1b1a1f') {
  const cd = V(0, 0, 1).applyQuaternion(camera.quaternion).applyQuaternion(lt.quaternion.clone().invert());
  const faces = [
    [[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top],
    [[1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], side1],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], side1],
    [[0, 0, 1], [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]], side2],
    [[0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], side2],
  ];
  return faces.map(([n, q, col]) => n[0] * cd.x + n[1] * cd.y + n[2] * cd.z > 0
    ? `<polygon points="${ptsAttr(q.map(p => P2(p)))}" fill="${col}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>` : '').join('');
}
// silinder tegak: badan (selubung cembung) + tutup atas elips
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function cylSVG(x, z, r, y0, y1, side, top, rTop = r) {
  const ring = (y, rr) => Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2; return P2([x + Math.cos(a) * rr, y, z + Math.sin(a) * rr]); });
  const b = ring(y0, r), tp = ring(y1, rTop);
  return `<polygon points="${ptsAttr(hull(b.concat(tp)))}" fill="${side}" stroke="#1b1a1f" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${ptsAttr(tp)}" fill="${top}" stroke="#1b1a1f" stroke-width="3"/>`;
}
// debu di berkas cahaya jendela (posisi tetap per partikel, melayang pelan)
const MOTES = Array.from({ length: 26 }, (_, i) => [WX + 30 + hash(i, 1) * 160, 40 + hash(i, 2) * 220, -60 + hash(i, 3) * 220, hash(i, 4)]);
function updateBg(t) {
  const zoom = 110 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 0.9) * 2.6, 0, 9).toFixed(2));
  let s = '';
  // dinding belakang: keramik (0–180 mm) + cat di atasnya + jendela
  s += `<g transform="${planeM([WX, 0, 0], [0, 0, -1], [0, -1, 0])}">
    <rect x="-700" y="-520" width="1400" height="340" fill="#efe2cf"/>
    <rect x="-700" y="-180" width="1400" height="180" fill="url(#tile)"/>
    <rect x="-700" y="-186" width="1400" height="8" fill="#d8c7ae"/>
    <rect x="-150" y="-430" width="230" height="200" rx="6" fill="#fbf7f0" stroke="#1b1a1f" stroke-width="3"/>
    <rect x="-138" y="-418" width="98" height="176" fill="url(#sky)"/><rect x="-28" y="-418" width="96" height="176" fill="url(#sky)"/>
    <path d="M-120 -300q20 -18 40 -6t36 -10" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity=".8"/>
    <rect x="-150" y="-236" width="230" height="10" fill="#e9dcc7" stroke="#1b1a1f" stroke-width="3"/></g>`;
  // meja: kayu + tepi
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}">
    <rect x="${WX}" y="-700" width="${600 - WX}" height="1400" fill="url(#wood)"/>
    <rect x="${WX}" y="-700" width="6" height="1400" fill="#c3a074"/>
    <polygon points="${WX},-180 ${WX + 260},-40 ${WX + 260},120 ${WX},-20" fill="url(#sunp)" opacity="${(0.9 * (1 - S.dark)).toFixed(3)}"/>
    <ellipse cx="0" cy="0" rx="${RX + 6}" ry="${RZ + 7}" fill="url(#shad)"/></g>`;
  // kompor (di sisi kanan, tampak di penutup)
  const st = STOVE;
  s += boxSVG(st.x0, st.x1, 0, st.h, st.z0, st.z1, '#c9cdd3', '#3a3d46', '#2c2e35');
  s += `<g transform="${planeM([0, st.h + 0.2, 0], [1, 0, 0], [0, 0, -1])}">` +
    [st.bz].map(zc => `<circle cx="-2" cy="${-zc}" r="52" fill="#2b2d33" stroke="#1b1a1f" stroke-width="3"/><circle cx="-2" cy="${-zc}" r="30" fill="#55585f" stroke="#1b1a1f" stroke-width="3"/>` +
      Array.from({ length: 4 }, (_, k) => `<path d="M${f1(-2 + Math.cos(k * Math.PI / 2) * 56)} ${f1(-zc + Math.sin(k * Math.PI / 2) * 56)} L${f1(-2 + Math.cos(k * Math.PI / 2) * 30)} ${f1(-zc + Math.sin(k * Math.PI / 2) * 30)}" stroke="#1b1a1f" stroke-width="6"/>`).join('')).join('') + `</g>`;
  s += `<g transform="${planeM([st.x1 + 0.3, 0, 0], [0, 0, -1], [0, -1, 0])}">` +
    [st.kz].map((zc, k) => `<circle cx="${-zc}" cy="-42" r="17" fill="#d8dbe0" stroke="#1b1a1f" stroke-width="3"/><rect x="${-zc - 3}" y="-56" width="6" height="22" rx="3" fill="#1b1a1f" transform="rotate(${k === 0 ? (t > T(9, 'pemantik') ? -60 : 0) : 0} ${-zc} -42)"/>`).join('') + `</g>`;
  // percikan pemantik kompor (tik-tik-tik) saat "pemantik kompor"
  if (t > T(9, 'pemantik') && t < T(9, 'cetek') - 0.1 && Math.floor((t - T(9, 'pemantik')) * 6) % 2 === 0) {
    const a = P2([-2 + 34, st.h + 4, st.bz]), b = P2([-2 + 48, st.h + 14, st.bz]), seed = Math.floor(t * 30);
    let d = `M${f1(a[0])} ${f1(a[1])}`; for (let q = 1; q < 5; q++) d += ` L${f1(lerp(a[0], b[0], q / 5) + (hash(seed, q) - 0.5) * 16)} ${f1(lerp(a[1], b[1], q / 5) + (hash(seed, q + 9) - 0.5) * 16)}`;
    s += `<circle cx="${f1((a[0] + b[0]) / 2)}" cy="${f1((a[1] + b[1]) / 2)}" r="40" fill="#fff1b8" opacity=".7"/><path d="${d} L${f1(b[0])} ${f1(b[1])}" stroke="#1b1a1f" stroke-width="9" fill="none"/><path d="${d} L${f1(b[0])} ${f1(b[1])}" stroke="#fffbe6" stroke-width="4" fill="none"/>`;
  }
  // gelas berasap
  s += cylSVG(-74, 60, 38, 0, 92, '#c96f4a', '#e7a27f', 40);
  const pxmm = 1920 / CAM[2];
  { const kopi = Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2; return P2([-74 + Math.cos(a) * 34, 86, 60 + Math.sin(a) * 34]); });
    s += `<polygon points="${ptsAttr(kopi)}" fill="#5b3a28" stroke="#1b1a1f" stroke-width="2"/>`;
    const c = P2([-74, 92, 60]);
    for (let k = 0; k < 3; k++) {                                            // uap kopi naik & melengkung
      const ph = (t * 0.3 + k / 3) % 1, x0 = c[0] + (k - 1) * 16 * pxmm, hgt = 90 * pxmm;
      s += `<path d="M${f1(x0)} ${f1(c[1])} q${f1(10 * pxmm * Math.sin(t * 1.3 + k))} ${f1(-hgt * 0.3)} 0 ${f1(-hgt * 0.5)} t0 ${f1(-hgt * 0.5)}" fill="none" stroke="#ffffff" stroke-width="${f1(5 * pxmm)}" stroke-linecap="round" opacity="${f1(0.6 * Math.sin(Math.PI * ph))}" transform="translate(0 ${f1(-ph * 30 * pxmm)})"/>`;
    } }
  // tanaman dalam pot (daun bergoyang)
  s += cylSVG(-86, 150, 44, 0, 74, '#b86b45', '#9a5536', 50);
  { const c = P2([-86, 74, 150]), u = 0.9 * pxmm;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.42 + 0.06 * Math.sin(t * 1.1 + k), len = (95 + 25 * hash(k, 7)) * u;
      const ex = c[0] + Math.cos(a) * len, ey = c[1] + Math.sin(a) * len;
      s += `<path d="M${f1(c[0])} ${f1(c[1])} Q${f1(c[0] + Math.cos(a - 0.35) * len * 0.6)} ${f1(c[1] + Math.sin(a - 0.35) * len * 0.6)} ${f1(ex)} ${f1(ey)} Q${f1(c[0] + Math.cos(a + 0.35) * len * 0.6)} ${f1(c[1] + Math.sin(a + 0.35) * len * 0.6)} ${f1(c[0])} ${f1(c[1])}" fill="${k % 2 ? '#5f9a63' : '#73b277'}" stroke="#1b1a1f" stroke-width="3" stroke-linejoin="round"/>`;
    } }
  // debu melayang di cahaya
  if (S.dark < 0.9) for (const [x, y, z, h] of MOTES) {
    const p = P2([x + 6 * Math.sin(t * 0.4 + h * 9), y + ((t * 6 + h * 200) % 60) - 30, z]);
    s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(clamp(0.7 * pxmm, 1.5, 9))}" fill="#fffaf0" opacity="${f1(0.55 * (1 - S.dark) * Math.sin(Math.PI * ((t * 0.2 + h) % 1)))}"/>`;
  }
  $('env').innerHTML = s;
  $('bgNight').setAttribute('opacity', (0.96 * S.dark).toFixed(3));
  $('bgWarm').setAttribute('opacity', (0.8 * S.fire * (0.6 + 0.4 * track(darkKeys, t))).toFixed(3));
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
  // teks kinetik: tiap kata jatuh dari atas, membal, sedikit miring; keluar mengecil
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

// efek: sorotan, kilat layar, gelombang kejut, listrik di kabel, percikan + cahaya, cahaya kristal di gelap
function bolt(a, b, seed, wGlow) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
  let d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
  for (let k = 1; k < 7; k++) { const f = k / 7, o = (hash(seed, k) - 0.5) * len * 0.42; d += ` L${(lerp(a[0], b[0], f) + nx * o).toFixed(1)} ${(lerp(a[1], b[1], f) + ny * o).toFixed(1)}`; }
  d += ` L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  return `<path d="${d}" stroke="#fff2b0" stroke-width="${wGlow}" fill="none" opacity=".35" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" stroke="#1b1a1f" stroke-width="${Math.max(12, len * 0.09).toFixed(1)}" fill="none" opacity="${(1 - S.dark).toFixed(3)}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" stroke="#fffbe6" stroke-width="${Math.max(6, len * 0.045).toFixed(1)}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function updateFx(t) {
  let s = `<defs><radialGradient id="glo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".35" stop-color="#f6c96a" stop-opacity=".55"/><stop offset="1" stop-color="#f6c96a" stop-opacity="0"/></radialGradient>
    <radialGradient id="gloB"><stop offset="0" stop-color="#e7dcff" stop-opacity=".9"/><stop offset=".4" stop-color="#a98bff" stop-opacity=".45"/><stop offset="1" stop-color="#a98bff" stop-opacity="0"/></radialGradient></defs>`;
  const spot = CAM[7] * (1 - S.dark);
  if (spot > 0.02) {
    const [fx, fy] = project([0, CAM[1], CAM[0]]), r = 560 + 3000 / CAM[2];
    s += `<radialGradient id="sp" gradientUnits="userSpaceOnUse" cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${r.toFixed(1)}">
      <stop offset=".55" stop-color="#f4efe6" stop-opacity="0"/><stop offset="1" stop-color="#f4efe6" stop-opacity="${(0.22 * spot).toFixed(3)}"/></radialGradient>
      <rect width="1080" height="1920" fill="url(#sp)"/>`;
  }
  const px = 1920 / CAM[2];
  // cahaya kristal di gelap (waktu membeku)
  const g = strikes[1], cg = smooth(g.hit, g.hit + 0.15, t) * (1 - smooth(g.bolt, g.bolt + 0.5, t)) * S.dark;
  if (cg > 0.01) { const [cx, cy] = project([0.1, 35.3, PZ]); s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(px * (9 + Math.sin(t * 9))).toFixed(1)}" fill="url(#gloB)" opacity="${cg.toFixed(3)}"/>`; }
  for (const st of strikes) {
    const a = t - st.hit;
    if (a >= 0 && a < 0.7) {
      const [cx, cy] = project([0.1, 39.5, PZ]);
      for (let k = 0; k < 3; k++) {
        const q = clamp((a - k * 0.08) / 0.5); if (q <= 0 || q >= 1) continue;
        s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(20 + q * (90 + 900 / CAM[2])).toFixed(1)}" fill="none" stroke="#e3bf62" stroke-width="${(10 * (1 - q)).toFixed(1)}" opacity="${(1 - q).toFixed(3)}"/>`;
      }
    }
    const lw = (t - st.bolt) / (st.zap - st.bolt);
    if (lw > 0 && lw < 1.15) {
      const n = WIRE_S.length, head = clamp(lw) * (n - 1), tail = Math.max(0, head - n * 0.35);
      const pts = [];
      for (let k = Math.floor(tail); k <= Math.ceil(head); k++) { const p = WIRE_S[Math.min(n - 1, k)]; const [x, y] = project([p.x, p.y, p.z]); pts.push(`${(x + (hash(k, Math.floor(t * 30)) - 0.5) * 10).toFixed(1)},${(y + (hash(k + 50, Math.floor(t * 30)) - 0.5) * 10).toFixed(1)}`); }
      const op = 1 - clamp((lw - 1) / 0.15), hp = WIRE_S[Math.min(n - 1, Math.round(head))], [hx, hy] = project([hp.x, hp.y, hp.z]);
      s += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(px * 4).toFixed(1)}" fill="url(#glo)" opacity="${op.toFixed(3)}"/>
        <polyline points="${pts.join(' ')}" fill="none" stroke="#f6dc8e" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.45 * op).toFixed(3)}"/>
        <polyline points="${pts.join(' ')}" fill="none" stroke="#fffbe6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="${op.toFixed(3)}"/>`;
    }
  }
  if (sparkOn(t)) {
    const a = project(ELTIP), b = project([0.3, 76 + S.lift, VZ + 0.4]), seed = Math.floor(t * 30);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let rays = '';
    for (let k = 0; k < 12; k++) { const an = hash(seed, k + 20) * Math.PI * 2, r0 = len * 0.4, r1 = len * (0.8 + hash(seed, k + 40) * 1.0); rays += `<line x1="${(m[0] + Math.cos(an) * r0).toFixed(1)}" y1="${(m[1] + Math.sin(an) * r0).toFixed(1)}" x2="${(m[0] + Math.cos(an) * r1).toFixed(1)}" y2="${(m[1] + Math.sin(an) * r1).toFixed(1)}" stroke="#f6dc8e" stroke-width="5" stroke-linecap="round"/>`; }
    s += `<circle cx="${m[0]}" cy="${m[1]}" r="${(len * (1.6 + S.dark)).toFixed(1)}" fill="url(#glo)"/>${rays}` + bolt(a, b, seed, (len * 0.5).toFixed(1));
  }
  // cahaya api (lebih terasa di gelap)
  if (S.fire > 0.05) { const [fx, fy] = project([0, 86 + S.lift, VZ]); s += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(px * 22).toFixed(1)}" fill="url(#glo)" opacity="${(S.fire * (0.25 + 0.5 * track(darkKeys, t))).toFixed(3)}"/>`; }
  const fl = strikes.reduce((a, st) => Math.max(a, t >= st.hit ? 1 - (t - st.hit) / 0.16 : 0), 0);
  if (fl > 0) s += `<rect width="1080" height="1920" fill="#fff6dc" opacity="${(0.5 * fl).toFixed(3)}"/>`;
  $('dim').innerHTML = s;
}

// kartu: (6) kristal diperbesar → 220 V vs ribuan volt; (8) kecepatan jari vs palu; (9) pemantik kompor
const pressDur = hit => { let a = hit; while (a > 0 && Dat(a) > 0.01) a -= STEP; return hit - a; };
const vSlow = DMAX / pressDur(strikes[2].hit), vFast = DMAX / pressDur(strikes[3].hit);
let INS = 0;
const F = 'font-family="-apple-system, Helvetica" font-weight="800"';
function updateInset(t) {
  const W6 = [T(6, 'kristal') - 0.1, T(6, 'lebih') - 0.15], W6b = [T(6, 'lebih') - 0.15, L[6].e + 0.3], W8 = [T(8, 'hasilnya') - 0.15, L[8].e + 0.2], W9 = [-9, -8];   // kompor kini di lingkungan
  const ws = [W6, W6b, W8, W9], k = ws.findIndex(([a, b]) => t > a - 0.12 && t < b + 0.12);
  const el = $('inset');
  const a = k < 0 ? 0 : pulse(ws[k][0], ws[k][1], t, 0.12);
  INS = a; el.style.opacity = a;
  if (a <= 0.001) return;
  const s0 = ws[k][0];
  el.style.transform = k === 1 ? '' : `scale(${lerp(0.85, 1, backOut((t - s0 + 0.12) / 0.35)).toFixed(3)})`;
  const line = (y, txt, col, op, size = 31, x = 500) => `<text x="${x}" y="${y}" ${F} font-size="${size}" fill="${col}" opacity="${op.toFixed(3)}">${txt}</text>`;
  if (k === 0) {
    $('insetk').textContent = 'KRISTAL · DIPERBESAR';
    const sq = smooth(T(6, 'dipukul') - 0.1, T(6, 'dipukul') + 0.25, t), ch = smooth(T(6, 'mengeluarkan') - 0.2, T(6, 'listrik') + 0.1, t), volt = smooth(T(6, 'ribuan') - 0.2, T(6, 'ribuan') + 0.3, t);
    const bx = 60, bw = 400, by = 132 + 30 * sq, bh = 270 - 50 * sq;
    let atoms = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const pos = (r + c) % 2 === 0, x = bx + 52 + c * 74, y = by + 40 + r * (bh - 80) / 3 + (pos ? -1 : 1) * 12 * ch;
      atoms += `<circle cx="${x}" cy="${y.toFixed(1)}" r="23" fill="${pos ? '#e3bf62' : '#8fa6f0'}" stroke="#1b1a1f" stroke-width="4"/><text x="${x}" y="${(y + 11).toFixed(1)}" text-anchor="middle" ${F} font-size="32" fill="#1b1a1f">${pos ? '+' : '−'}</text>`;
    }
    const row = (y, sym, col) => Array.from({ length: 5 }, (_, q) => `<text x="${bx + 52 + q * 74}" y="${y.toFixed(1)}" text-anchor="middle" ${F} font-size="46" fill="${col}" opacity="${ch.toFixed(3)}">${sym}</text>`).join('');
    const hy = by - 52 - 46 * (1 - sq);
    $('insetsvg').innerHTML = `<rect x="${bx + 130}" y="${hy.toFixed(1)}" width="140" height="40" rx="10" fill="#7d777c" stroke="#1b1a1f" stroke-width="5"/>
      <rect x="${bx}" y="${by.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="20" fill="#efe4fb" stroke="#1b1a1f" stroke-width="6"/>
      ${atoms}${row(by - 10, '+', '#9b2c3f')}${row(by + bh + 50, '−', '#3e5bb8')}
      ${line(130, '1. Dipukul palu,', '#1b1a1f', sq)}${line(170, '   kristal tertekan', '#1b1a1f', sq)}
      ${line(235, '2. Muatan + naik,', '#9b2c3f', ch)}${line(275, '   muatan − turun', '#9b2c3f', ch)}
      ${line(340, '3. Beda muatan', '#1f7a5c', ch)}${line(380, '   = listrik', '#1f7a5c', ch)}
      ${line(440, 'ribuan volt', '#1b1a1f', volt, 46)}`;
  } else if (k === 1) {
    $('insetk').textContent = 'TEGANGAN · DIBANDINGKAN';
    const g1 = smooth(T(6, 'lebih') - 0.1, T(6, 'lebih') + 0.3, t), g2 = smooth(T(6, 'sepuluh') - 0.1, T(6, 'stopkontak') + 0.2, t);
    const b1 = 56, b2 = Math.max(b1, 10.6 * b1 * g2);                    // > 10 × 220 V
    $('insetsvg').innerHTML = `
      ${line(140, 'Stopkontak rumah', '#7a7368', g1, 32, 60)}
      <rect x="60" y="160" width="${(b1 * g1).toFixed(1)}" height="54" rx="12" fill="#7d8fb3" stroke="#1b1a1f" stroke-width="5" opacity="${g1.toFixed(3)}"/>
      ${line(201, '220 V', '#1b1a1f', g1, 34, 60 + b1 + 20)}
      ${line(290, 'Percikan korek (satu tekanan jempol)', '#7a7368', g2 > 0 ? 1 : 0, 32, 60)}
      <rect x="60" y="310" width="${b2.toFixed(1)}" height="54" rx="12" fill="#e3bf62" stroke="#1b1a1f" stroke-width="5" opacity="${(g2 > 0 ? 1 : 0)}"/>
      ${line(420, 'ribuan volt · lebih dari 10×', '#9b2c3f', smooth(0.7, 1, g2), 40, 60)}`;
  } else if (k === 2) {
    $('insetk').textContent = 'KECEPATAN · DIMODELKAN';
    const g = clamp((t - s0) / 0.6);
    const bar = (y, f, col, txt) => `<text x="300" y="${y + 30}" text-anchor="end" font-family="-apple-system, Helvetica" font-weight="700" font-size="30" fill="#7a7368">${txt}</text>
      <rect x="320" y="${y}" width="560" height="40" rx="20" fill="#efe8dc"/><rect x="320" y="${y}" width="${Math.max(40, 560 * f * g).toFixed(1)}" height="40" rx="20" fill="${col}" stroke="#1b1a1f" stroke-width="5"/>`;
    $('insetsvg').innerHTML = `<text x="60" y="140" ${F} font-size="46" fill="#1b1a1f">Jari</text>
      ${bar(100, vSlow / vFast, '#c06a2e', 'pelan')}${bar(160, 1, '#c06a2e', 'cepat')}
      <line x1="60" x2="880" y1="235" y2="235" stroke="#e6ddcf" stroke-width="4"/>
      <text x="60" y="310" ${F} font-size="46" fill="#1b1a1f">Palu</text>
      ${bar(270, 1, '#1f7a5c', 'pelan')}${bar(330, 1, '#1f7a5c', 'cepat')}
      <text x="880" y="430" text-anchor="end" ${F} font-size="32" fill="#1f7a5c" opacity="${smooth(T(8, 'pegasnya') - 0.2, T(8, 'pegasnya') + 0.2, t).toFixed(3)}">didorong pegas: selalu sama</text>`;
  } else {
    $('insetk').textContent = 'DI DAPURMU';
    const tik = Math.floor((t - s0) * 3) % 2 === 0 && t > T(9, 'pemantik'), seed = Math.floor(t * 30);
    let spk = '';
    if (tik) { const a = [612, 214], b = [650, 186]; let d = `M${a[0]} ${a[1]}`; for (let q = 1; q < 5; q++) d += ` L${lerp(a[0], b[0], q / 5) + (hash(seed, q) - 0.5) * 18} ${lerp(a[1], b[1], q / 5) + (hash(seed, q + 9) - 0.5) * 18}`; spk = `<circle cx="631" cy="200" r="46" fill="#f6dc8e" opacity=".5"/><path d="${d} L${b[0]} ${b[1]}" stroke="#1b1a1f" stroke-width="10" fill="none"/><path d="${d} L${b[0]} ${b[1]}" stroke="#fffbe6" stroke-width="4" fill="none"/>`; }
    $('insetsvg').innerHTML = `
      <rect x="40" y="230" width="860" height="200" rx="28" fill="#3a3d46" stroke="#1b1a1f" stroke-width="6"/>
      <ellipse cx="560" cy="236" rx="240" ry="58" fill="#2b2d33" stroke="#1b1a1f" stroke-width="6"/>
      <ellipse cx="560" cy="220" rx="150" ry="34" fill="#55585f" stroke="#1b1a1f" stroke-width="5"/>
      <rect x="600" y="186" width="10" height="40" fill="#cfd5dc" stroke="#1b1a1f" stroke-width="3"/>
      <circle cx="190" cy="340" r="62" fill="#d8dbe0" stroke="#1b1a1f" stroke-width="6"/><rect x="182" y="292" width="16" height="56" rx="6" fill="#1b1a1f" transform="rotate(${(Math.floor((t - s0) * 3) * 30) % 90} 190 340)"/>
      ${spk}
      ${line(140, 'Kenop kompor diputar: tik-tik-tik', '#1b1a1f', 1, 32, 60)}
      ${line(190, '= palu kecil memukul kristal juga', '#9b2c3f', smooth(T(9, 'pemantik'), T(9, 'pemantik') + 0.4, t), 32, 60)}
      ${line(445, 'piezo', '#1f7a5c', smooth(T(9, 'kompor'), T(9, 'kompor') + 0.3, t), 34, 175)}`;
  }
}

// ---------- render ----------
function draw() {
  renderer.setRenderTarget(rtCol); renderer.setClearColor(0xf4efe6, 1); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = normalMat; if (o.userData.noNormal) { o.userData.v0 = o.visible; o.visible = false; } } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) { o.material = o.userData.m0; if (o.userData.noNormal) o.visible = o.userData.v0; } });
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };
// peristiwa suara (dari model): klik tombol, cetek (palu–kristal), percik, desis gas, fwoomp + api, gelap
window.EVENTS = (() => {
  const ev = [];
  let pD = 0, gS = -1, fS = -1;
  for (let t = 0; t < DUR; t += STEP) {
    const D = Dat(t), gas = liftOf(D) > 0.5 && fireAt(t) < 0.5, f = fireAt(t) > 0.3;
    if (pD < 0.02 && D >= 0.02) ev.push({ t: +t.toFixed(4), type: 'klikTombol' });
    if (gas && gS < 0) gS = t; if (!gas && gS >= 0) { ev.push({ t: +gS.toFixed(4), type: 'desis', dur: +(t - gS).toFixed(3) }); gS = -1; }
    if (f && fS < 0) fS = t; if (!f && fS >= 0) { ev.push({ t: +fS.toFixed(4), type: 'api', dur: +(t - fS).toFixed(3) }); fS = -1; }
    pD = D;
  }
  if (fS >= 0) ev.push({ t: +fS.toFixed(4), type: 'api', dur: +(DUR - fS).toFixed(3) });
  strikes.forEach(s => { ev.push({ t: s.hit, type: 'cetek' }, { t: s.zap, type: 'percik', dur: s.spark }); if (s.lit) ev.push({ t: s.ign, type: 'nyala' }); });
  ev.push({ t: HOOK[0], type: 'percik', dur: HOOK[1] - HOOK[0] }, { t: T(5, 'lepas'), type: 'gelap' });
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  ev.push({ t: T(9, 'pemantik'), type: 'percik', dur: 0.12 }, { t: T(9, 'pemantik') + 0.33, type: 'percik', dur: 0.12 }, { t: T(9, 'pemantik') + 0.66, type: 'percik', dur: 0.12 }, { t: T(9, 'cetek') - 0.3, type: 'whoosh' });
  ev.push({ t: T(1, 'tanpa') - 0.2, type: 'whoosh' }, { t: T(2, 'rahasianya'), type: 'whoosh' }, { t: T(6, 'lebih'), type: 'card' }, { t: T(8, 'hasilnya'), type: 'card' }, { t: T(9, 'pemantik') - 0.2, type: 'whoosh' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera, strikes };
renderAt(0);
window.READY = true;

// isyarat musik (gaya di musik.json) + titik pil cover (piksel)
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(4).s); cue('drop', LN(5).s); cue('build', LN(5).s + 1.2);
  cue('reveal', LN(6).s); cue('warm', LN(7).s); cue('dark', LN(8).s); cue('resolve', LN(9).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project([0.1, 35, PZ + 1.5]);
