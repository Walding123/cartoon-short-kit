// Video "Kisah microwave" (format Story / Kisah): satu ruangan panjang yang menjadi garis waktu, dari kiri ke kanan:
// lab radar 1945 (jas lab + cokelat di saku, magnetron radar di meja, mangkuk jagung, ceret berlubang + telur)
// -> Radarange 1947 (lemari baja setinggi ±1,8 m, pendingin air) -> microwave dapur masa kini (dibelah: magnetron, saluran gelombang, piring putar).
// Komponen format: bab (pita layar lebar + kartu "BAB n · tahun"). Semua gerak dihitung dari t (renderAt murni fungsi waktu).
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
const NL = 13;
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


// ---------- palet, cel 3 nada (satu warna tegas per bagian) ----------
const flat = h => [h, h, h];
const PAL = {
  copper: ['#f2a46f', '#d9773f', '#a8551f'], cutCopper: flat('#eb9a63'), brass: ['#f1c75e', '#d6a136', '#a87a22'],
  fin: ['#f3f5f8', '#c4cad2', '#8a929e'], magnet: ['#5d6b8c', '#3f4a66', '#262d42'], steel: ['#e2e3e7', '#b2b5bd', '#7a7d86'], cutSteel: flat('#cfd2d8'),
  ceram: ['#fbf8f0', '#e6e0d2', '#bdb5a3'], dark: ['#4a4d57', '#33353d', '#1e1f24'], pinkC: ['#f5a3a8', '#de7c84', '#b0575f'],
  choc: ['#9a6140', '#77462a', '#52301b'], chocMelt: ['#b0714b', '#8a5130', '#5e351d'], wrap: ['#4f6fc0', '#36509a', '#24376e'], foil: ['#f4f1e6', '#d4cdb8', '#a69d84'],
  coat: ['#fbfaf5', '#e4e1d6', '#bcb8aa'], wood: ['#dcb98a', '#bf9663', '#93703f'], woodD: ['#b88d5c', '#946b3f', '#6b4a28'],
  kernel: ['#ffd66e', '#f0b03a', '#c2852a'], pop: ['#fffaf0', '#f3e8cf', '#cdbd9c'], dish: ['#fbfbf8', '#e2e2dc', '#b8b8b0'], dishRim: ['#5f86d6', '#3e64b8', '#2a4588'],
  kettle: ['#86cbbd', '#55a294', '#327266'], cutKettle: flat('#d7efe9'), egg: ['#f8ead6', '#e7cfae', '#c0a27e'], yolk: ['#ffd24d', '#f2a91f', '#c27a10'], white: ['#fffef8', '#f1eee4', '#cfcbbd'],
  rr: ['#eef1f4', '#c3c9d1', '#8c949f'], rrD: ['#cfd5dc', '#a6adb7', '#717884'], chrome: ['#ffffff', '#cdd3db', '#7f8894'], mesh: ['#3a3f4a', '#2a2e37', '#1a1c22'],
  dialFace: ['#fbf3df', '#e8dcc0', '#c2b28f'], dialRim: ['#c98a55', '#a86a3a', '#7a4a24'], lampR: flat('#e5484d'), lampG: flat('#5fcf8a'), pipe: ['#f2a46f', '#d9773f', '#a8551f'],
  mw: ['#646873', '#474a53', '#2c2e34'], cutMw: flat('#d9d4ca'), cav: ['#f4f1ea', '#dcd8cd', '#b7b2a6'], glassD: ['#3c4452', '#2b313c', '#1b1f27'], panel: ['#3a3d45', '#2a2c32', '#1a1b1f'],
  plateG: ['#e3f3f7', '#c5e0e8', '#9cc0cc'], bowl: ['#fbfbf8', '#e4e4de', '#bcbcb4'], soup: ['#f39a4e', '#d9742c', '#a4521b'], xfm: ['#f2a46f', '#d9773f', '#a8551f'],
  wg: ['#e8eaee', '#bfc4cc', '#8c929c'], counter: ['#efeae2', '#d8d1c5', '#aea595'], cab: ['#a9bfb0', '#8aa394', '#637a6c'],
  yellow: ['#ffe259', '#f3c62b', '#d9a90f'], hl: ['#f6dc8e', '#e3bf62', '#b8913a'],
};
const C3 = p => p.map(h => new THREE.Color(h));
// Cel berbasis teori warna (lihat reference/panduan_warna.md): 2 nada + terminator lembut, bayangan bergeser ke ungu-biru sejuk
// (bukan sekadar gelap), sisi terang sedikit hangat, cahaya langit dari atas, cahaya pinggir (rim) sejuk, kilap sesuai bahan.
// m.hl(palet, k) = ganti warna ke palet sorot (seperti dulu); m.glow(k) = sorotan lembut (pinggir menyala emas), warna asli tetap.
const GLOSS = { silver: 0.9, steel: 0.8, rr: 0.75, chrome: 0.95, copper: 0.7, brass: 0.8, fin: 0.7, magnet: 0.5, choc: 0.35, chocMelt: 0.8, wrap: 0.5, egg: 0.25, kettle: 0.6, dish: 0.6, mw: 0.5, glassD: 0.9, plateG: 0.9, bowl: 0.55, dark: 0.55, wg: 0.6, ceram: 0.4, dialFace: 0.3 };
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
const box = (x0, x1, y0, y1, z0, z1, mat) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const prismXY = (shape, z0, z1, mat) => mesh(new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 16 }), mat, 0, 0, z0);
const tube = (pts, r, mat, seg = 120) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', 0.3), seg, r, 12), mat);
const { RoundedBoxGeometry } = await import('./node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js');
const rbox = (x0, x1, y0, y1, z0, z1, r, mat) => mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 3, r), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const cylY = (r0, r1, h, mat, x, y, z, seg = 40) => mesh(new THREE.CylinderGeometry(r1, r0, h, seg), mat, x, y + h / 2, z);       // alas di y, tinggi h
const cylX = (r, len, mat, x, y, z, seg = 40) => mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), mat, x + len / 2, y, z);   // mulai di x, sepanjang +x
const cylZ = (r, len, mat, x, y, z, seg = 40) => mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2), mat, x, y, z + len / 2);   // mulai di z, sepanjang +z
const lathe = (pts, mat, p0 = 0, pl = Math.PI * 2, seg = 48) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, p0, pl), mat);
// muka potong bidang x = 0 untuk benda putar yang dibelah: pita antara profil luar dan dalam (tebal th), sisi z+ dan z-
const cutRibbon = (prof, th, mat) => { const g = new THREE.Group();
  for (const s of [1, -1]) { const pts = [...prof.map(([r, y]) => [s * r, y]), ...prof.slice().reverse().map(([r, y]) => [s * Math.max(0, r - th), y])];
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(shp(pts)).rotateY(-Math.PI / 2), mat)); }
  return g; };

// ---------- dunia (mm): dinding x = 0 (benda menonjol ke +x), lantai y = 0, +z = kiri layar ----------
// Garis waktu dari kiri ke kanan layar: LAB 1945 (z 1050..2550) -> RADARANGE 1947 (z ±310) -> DAPUR KINI (z -900..-2100)
const lt = new THREE.Group(); scene.add(lt);
const BENCH = { x0: 120, x1: 820, y: 900, z0: 1050, z1: 2100 };
const MAGP = [400, BENCH.y, 1800];          // magnetron radar di meja
const DISHP = [430, BENCH.y, 1430];         // mangkuk jagung
const KETP = [430, BENCH.y, 1180];          // ceret berlubang + telur
const POCK = { y0: 1230, y1: 1360, z0: 2290, z1: 2410 };   // saku jas lab (jas digantung di dinding, digambar di SVG)
const RR = { x0: 30, x1: 630, z0: -310, z1: 310, h: 1800, kg: 340 };   // Radarange 1947: ±1,8 m, ±340 kg (750 lb)
const CNT = { x1: 640, y: 900, z0: -2100, z1: -900 };   // meja dapur
const MW = { x0: 100, x1: 460, y0: 900, y1: 1190, z0: -1740, z1: -1260 };   // microwave 48 × 29 × 36 cm
const CAV = { x0: 130, x1: 430, y0: 922, y1: 1140, z0: -1590, z1: -1270 };   // rongga masak
const TT = [280, 930, -1430];                // poros piring putar

// meja lab kayu
const wood = cel('wood'), woodD = cel('woodD');
lt.add(rbox(BENCH.x0, BENCH.x1, BENCH.y - 40, BENCH.y, BENCH.z0, BENCH.z1, 6, wood));
for (const [x, z] of [[BENCH.x0 + 40, BENCH.z0 + 40], [BENCH.x1 - 40, BENCH.z0 + 40], [BENCH.x0 + 40, BENCH.z1 - 40], [BENCH.x1 - 40, BENCH.z1 - 40]]) lt.add(box(x - 28, x + 28, 0, BENCH.y - 40, z - 28, z + 28, woodD));
lt.add(box(BENCH.x0 + 20, BENCH.x1 - 20, 220, 250, BENCH.z0 + 20, BENCH.z1 - 20, woodD));
lt.add(box(BENCH.x1 - 30, BENCH.x1 - 10, BENCH.y - 120, BENCH.y - 40, BENCH.z0 + 30, BENCH.z1 - 30, wood));     // lis depan

// ===== MAGNETRON RADAR 1945 =====
// Ciri dari foto magnetron era perang (mis. seri 2J/QK Raytheon) & magnetron oven (2M246):
// - blok anoda tembaga berbentuk silinder pendek (Ø ±70 mm) di tengah, dijepit dua kutub magnet di atas & bawah
// - sirip pendingin aluminium tipis yang menyebar dari anoda
// - magnet permanen besar berbentuk U / tapal kuda (dicat gelap), kutub baja berbentuk kerucut terpotong
// - keluaran: pipa pandu gelombang tembaga + flens kuningan + corong; batang katoda keramik putih dengan tutup hitam & kabel di sisi lain
const MG = new THREE.Group(); MG.position.set(...MAGP); lt.add(MG);
const copper = cel('copper'), fin = cel('fin'), magnetM = cel('magnet'), steel = cel('steel'), brass = cel('brass'), ceram = cel('ceram'), darkM = cel('dark');
MG.add(rbox(-175, 70, 0, 20, -80, 80, 5, cel('steel')));                       // pelat dudukan
{ const s = new THREE.Shape(); s.moveTo(-170, 20); s.lineTo(45, 20); s.quadraticCurveTo(58, 20, 58, 40); s.quadraticCurveTo(58, 62, 40, 62); s.lineTo(-118, 62);
  s.lineTo(-118, 208); s.lineTo(40, 208); s.quadraticCurveTo(58, 208, 58, 230); s.quadraticCurveTo(58, 250, 45, 250); s.lineTo(-150, 250); s.quadraticCurveTo(-170, 250, -170, 230); s.lineTo(-170, 20);
  MG.add(prismXY(s, -38, 38, magnetM)); }
const anodeY0 = 110, anodeY1 = 160;
MG.add(cylY(26, 34, anodeY0 - 62, steel, 0, 62, 0), cylY(34, 26, 208 - anodeY1, steel, 0, anodeY1, 0));   // kutub kerucut
const anode = cylY(36, 36, anodeY1 - anodeY0, copper, 0, anodeY0, 0); MG.add(anode);
MG.add(cylY(37.5, 37.5, 4, cel('brass'), 0, anodeY0 - 2, 0), cylY(37.5, 37.5, 4, cel('brass'), 0, anodeY1 - 2, 0));
for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a);
  if (Math.abs(sz) > 0.85) continue;
  const f = box(36, 104, anodeY0 + 4, anodeY1 - 4, -1.4, 1.4, fin); f.position.set(70 * cx, (anodeY0 + anodeY1) / 2, -70 * sz); f.rotation.y = a; MG.add(f); }
// keluaran ke -z: pandu gelombang tembaga, flens, corong
MG.add(box(-16, 16, 124, 146, -170, -34, copper), box(-34, 34, 108, 162, -176, -168, brass));
{ const horn = mesh(new THREE.CylinderGeometry(22, 58, 70, 4, 1, true).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), copper, 0, 135, -211); horn.scale.set(1, 0.75, 1); MG.add(horn); }
// katoda ke +z: keramik putih, tutup hitam, dua kabel ke pelat
MG.add(cylZ(13, 80, ceram, 0, 135, 34), cylZ(15, 14, darkM, 0, 135, 114), cylZ(6, 10, brass, 0, 135, 128));
MG.add(tube([[0, 128, 136], [0, 110, 160], [-20, 40, 170], [-40, 22, 150]], 3, cel('dark'), 40), tube([[0, 142, 136], [8, 120, 168], [20, 40, 178], [30, 22, 160]], 3, cel('dark'), 40));
const HORN = [MAGP[0], MAGP[1] + 135, MAGP[2] - 246];   // mulut corong (dunia)

// ===== COKELAT DI SAKU JAS =====
// Ciri: batang cokelat susu bersekat 2 × 4 kotak, bungkus kertas biru dengan pita foil, sebagian bungkus tersobek; meleleh = kotak melentur + tetesan.
const pocket = new THREE.Group(); lt.add(pocket);
const coatM = cel('coat');
pocket.add(rbox(16, 24, POCK.y0, POCK.y1, POCK.z0, POCK.z1, 3, coatM));                        // kantong (kain jas, tebal karena isi)
pocket.add(box(23.6, 25, POCK.y1 - 14, POCK.y1 - 10, POCK.z0 + 6, POCK.z1 - 6, cel('dialFace')));      // jahitan
const choc = new THREE.Group(); lt.add(choc);
const chocM = cel('choc'), wrapM = cel('wrap'), foilM = cel('foil');
choc.add(box(5, 15.5, POCK.y0 + 20, POCK.y1 + 10, 2315, 2385, wrapM));                          // bungkus (bawah, di dalam saku)
choc.add(box(4.5, 16, POCK.y1 - 2, POCK.y1 + 12, 2314, 2386, foilM));                        // pita foil di tepi sobekan
const chunks3 = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const m = rbox(5, 17, POCK.y1 + 12 + r * 24, POCK.y1 + 34 + r * 24, 2318 + c * 33, 2349 + c * 33, 3, chocM); m.userData.p0 = m.position.clone(); m.userData.r = r; m.userData.c = c; choc.add(m); chunks3.push(m); }
const drips = [0, 1, 2].map(k => { const g = new THREE.Group(); g.position.set(25, POCK.y1 + 6, 2326 + k * 24);
  const c = mesh(new THREE.CylinderGeometry(4.2 - k * 0.6, 4.2 - k * 0.6, 1, 14).translate(0, -0.5, 0), chocM); const b = mesh(new THREE.SphereGeometry(5.4 - k * 0.6, 16, 12), chocM);
  g.add(c, b); g.userData = { c, b }; lt.add(g); return g; });

// ===== MANGKUK JAGUNG =====
// Mangkuk enamel putih bertepi biru (khas 1940-an), biji jagung kuning berbentuk tetes; meletup jadi popcorn putih bergerombol.
const DG = new THREE.Group(); DG.position.set(...DISHP); lt.add(DG);
const DPROF = [[0, 0], [40, 0], [52, 4], [70, 22], [82, 40]];
DG.add(lathe(DPROF, cel('dish')), lathe([[80, 38], [84, 40], [82, 43], [78, 41]], cel('dishRim')));
const kernels = [], pops = [];
const kernelM = cel('kernel'), popM = cel('pop');
for (let k = 0; k < 11; k++) {
  const a = hash(k, 1) * Math.PI * 2, r = 8 + hash(k, 2) * 36, kx = Math.cos(a) * r, kz = Math.sin(a) * r;
  const ker = mesh(new THREE.SphereGeometry(1, 12, 10), kernelM, kx, 8 + r * 0.12, kz); ker.scale.set(5, 3.6, 6.5); ker.rotation.y = a; DG.add(ker); kernels.push(ker);
  const p = new THREE.Group(); for (let j = 0; j < 6; j++) p.add(mesh(new THREE.IcosahedronGeometry(6 + hash(k, j + 5) * 4, 1), popM, (hash(k, j) - 0.5) * 16, (hash(j, k) - 0.5) * 12, (hash(k + 3, j) - 0.5) * 16));
  p.add(mesh(new THREE.SphereGeometry(3.4, 10, 8), kernelM, 0, -7, 0));
  p.userData = { x0: kx, y0: 8 + r * 0.12, z0: kz, x1: (hash(k, 7) - 0.5) * 70, y1: 22 + hash(k, 8) * 26, z1: (hash(k, 9) - 0.5) * 70, rot: hash(k, 10) * 6 };
  p.visible = false; DG.add(p); pops.push(p); }

// ===== CERET BERLUBANG + TELUR =====
// Ceret enamel hijau toska (alas lebar, perut membulat, bahu menyempit), tutup + kenop, cerat, gagang melengkung;
// lubang di sisi yang menghadap magnetron. Dibelah di bidang x = 0 supaya telur di dalam terlihat.
const KG = new THREE.Group(); KG.position.set(...KETP); lt.add(KG);
const KPROF = [[0, 2], [74, 2], [92, 10], [102, 34], [102, 62], [93, 96], [72, 126], [54, 140], [50, 146]];
const ketM = cel('kettle'), cutK = cel('cutKettle');
KG.add(lathe(KPROF, ketM, Math.PI, Math.PI), cutRibbon(KPROF, 4, cutK));
const lidG = new THREE.Group(); KG.add(lidG);
const LPROF = [[0, 162], [26, 160], [50, 150], [54, 145]];
lidG.add(lathe(LPROF, ketM, Math.PI, Math.PI), cutRibbon(LPROF, 3, cutK), lathe([[0, 178], [10, 177], [12, 170], [7, 162], [0, 162]], cel('dark')));
KG.add(tube([[-6, 46, -96], [-6, 92, -140], [-6, 132, -176], [-6, 140, -186]], 9, ketM, 40));       // cerat
KG.add(tube([[-14, 136, 58], [-14, 214, 40], [-14, 226, 0], [-14, 214, -40], [-14, 136, -58]], 6, cel('dark'), 60));   // gagang
{ const d = V(-0.22, 0, 0.975).normalize(), hole = mesh(new THREE.CircleGeometry(24, 32), cel('dark'), d.x * 103, 70, d.z * 103); hole.lookAt(KG.position.clone().add(V(d.x * 400, 70, d.z * 400))); KG.add(hole); }
const eggM = cel('egg');
const egg = mesh(new THREE.SphereGeometry(1, 32, 24), eggM, -14, 44, 0); egg.scale.set(29, 39, 29); KG.add(egg);
const shells = Array.from({ length: 14 }, (_, k) => { const m = mesh(new THREE.SphereGeometry(30, 6, 4, hash(k, 1) * 6, 0.9, hash(k, 2) * 2.2, 0.8), eggM); m.visible = false; KG.add(m); return m; });
const yolk = mesh(new THREE.SphereGeometry(1, 24, 16), cel('yolk'), -14, 8, 0); yolk.visible = false; KG.add(yolk);
const albumen = mesh(new THREE.SphereGeometry(1, 24, 16), cel('white'), -14, 5, 0); albumen.visible = false; KG.add(albumen);

// ===== RADARANGE 1947 =====
// Ciri dari foto Raytheon Radarange model 1161: lemari baja tahan karat tegak ±1,8 m bersudut membulat; di atas jam/pengatur waktu bulat
// berbingkai tembaga + pelat nama; di tengah pintu oven kecil berjendela kisi + tuas pegangan krom; di bawah panel kisi ventilasi;
// alas gelap menjorok ke dalam; pipa air pendingin tembaga di sisi.
const RG = new THREE.Group(); lt.add(RG);
const rrM = cel('rr'), rrD = cel('rrD'), chromeM = cel('chrome');
RG.add(box(RR.x0 + 50, RR.x1 - 40, 0, 110, RR.z0 + 40, RR.z1 - 40, darkM));
RG.add(rbox(RR.x0, RR.x1, 110, RR.h, RR.z0, RR.z1, 34, rrM));
for (const y of [830, 1400]) RG.add(box(RR.x1 - 6, RR.x1 + 3, y - 5, y + 5, RR.z0 + 30, RR.z1 - 30, rrD));
RG.add(cylX(102, 6, cel('dialRim'), RR.x1 - 2, 1600, 0, 64), cylX(88, 7, cel('dialFace'), RR.x1, 1600, 0, 64));    // jam pengatur waktu
const needle = new THREE.Group(); needle.position.set(RR.x1 + 8, 1600, 0); RG.add(needle);
needle.add(box(0, 3, -4, 70, -3, 3, darkM), cylX(9, 4, darkM, 0, 0, 0, 20));
for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; RG.add(box(RR.x1 + 6, RR.x1 + 8, 1600 + Math.cos(a) * 76 - 3, 1600 + Math.cos(a) * 76 + 3, Math.sin(a) * 76 - 3, Math.sin(a) * 76 + 3, darkM)); }
RG.add(box(RR.x1 - 2, RR.x1 + 4, 1448, 1488, -150, 150, cel('mesh')));                                  // pelat nama
const lampR = cylX(11, 6, cel('lampR'), RR.x1, 1600, 210, 20), lampG = cylX(11, 6, cel('lampG'), RR.x1, 1600, -210, 20); RG.add(lampR, lampG);
RG.add(rbox(RR.x1 - 4, RR.x1 + 12, 900, 1300, -205, 205, 8, rrD));                                       // pintu oven
RG.add(box(RR.x1 + 10, RR.x1 + 14, 960, 1190, -150, 150, cel('mesh')));
for (let k = 1; k < 8; k++) RG.add(box(RR.x1 + 13, RR.x1 + 16, 960 + k * 28.7 - 2, 960 + k * 28.7 + 2, -150, 150, chromeM));
for (let k = 1; k < 10; k++) RG.add(box(RR.x1 + 13, RR.x1 + 16, 960, 1190, -150 + k * 30 - 1.5, -150 + k * 30 + 1.5, chromeM));
RG.add(box(RR.x1 + 12, RR.x1 + 30, 1222, 1236, -16, 16, chromeM), tube([[RR.x1 + 14, 1236, -60], [RR.x1 + 40, 1250, -50], [RR.x1 + 46, 1262, 0], [RR.x1 + 40, 1250, 50], [RR.x1 + 14, 1236, 60]], 6, chromeM, 40));
for (let k = 0; k < 11; k++) { const s = box(RR.x1 - 2, RR.x1 + 10, 0, 16, -220, 220, rrD); s.position.y = 250 + k * 46; s.rotation.z = -0.35; RG.add(s); }
RG.add(box(RR.x1 - 4, RR.x1 + 2, 230, 740, -236, -226, rrD), box(RR.x1 - 4, RR.x1 + 2, 230, 740, 226, 236, rrD));
const PIPE1 = [[110, 1480, RR.z0 - 2], [110, 1480, RR.z0 - 40], [110, 1420, RR.z0 - 60], [110, 300, RR.z0 - 60], [110, 80, RR.z0 - 80], [110, 20, RR.z0 - 140]];
const PIPE2 = [[190, 1440, RR.z0 - 2], [190, 1440, RR.z0 - 30], [190, 1390, RR.z0 - 44], [190, 300, RR.z0 - 44], [190, 80, RR.z0 - 64], [190, 20, RR.z0 - 120]];
const pipeM = cel('pipe'); RG.add(tube(PIPE1, 11, pipeM), tube(PIPE2, 11, pipeM));
const curveP1 = new THREE.CatmullRomCurve3(PIPE1.map(p => V(...p)).reverse(), false, 'catmullrom', 0.3), curveP2 = new THREE.CatmullRomCurve3(PIPE2.map(p => V(...p)), false, 'catmullrom', 0.3);

// ===== MEJA DAPUR + MICROWAVE KINI =====
// Ciri microwave rumahan (foto Sharp/Panasonic/LG di Indonesia): kotak abu gelap 48 × 29 × 36 cm, pintu kaca gelap berkisi titik di kiri
// (engsel kiri), panel kontrol di kanan (layar digital + tombol + kenop). Di dalam: rongga terang, piring kaca di atas cincin roda,
// magnetron (rangka baja kotak, sirip aluminium, cincin magnet abu, kubah antena) di balik panel kanan, menempel pada saluran gelombang
// di dinding rongga, trafo tegangan tinggi di bawahnya, kipas pendingin.
lt.add(box(0, 600, 100, CNT.y - 40, CNT.z0, CNT.z1, cel('cab')), box(0, 560, 0, 100, CNT.z0 + 20, CNT.z1 - 20, darkM), rbox(0, CNT.x1, CNT.y - 40, CNT.y, CNT.z0 - 10, CNT.z1 + 10, 4, cel('counter')));
for (const z of [-1300, -1700]) lt.add(box(600, 602, 120, CNT.y - 60, z - 2, z + 2, cel('panel')));
for (const z of [-1270, -1330, -1670, -1730]) lt.add(box(600, 616, 620, 760, z - 5, z + 5, chromeM));
const MWG = new THREE.Group(); lt.add(MWG);
const mwM = cel('mw'), cavM = cel('cav'), panelM = cel('panel');
for (const [x, z] of [[MW.x0 + 30, MW.z1 - 30], [MW.x1 - 30, MW.z1 - 30], [MW.x0 + 30, MW.z0 + 30], [MW.x1 - 30, MW.z0 + 30]]) MWG.add(cylY(14, 14, 6, darkM, x, MW.y0, z, 16));
MWG.add(box(MW.x0, MW.x1, MW.y0 + 6, MW.y0 + 22, MW.z0, MW.z1, mwM), box(MW.x0, MW.x0 + 6, MW.y0 + 6, MW.y1 - 4, MW.z0, MW.z1, mwM));   // alas + panel belakang
// rongga: lantai, dinding kiri/kanan/belakang (tutup atas ikut penutup)
MWG.add(box(CAV.x0, CAV.x1 + 25, CAV.y0 - 2, CAV.y0, CAV.z0, CAV.z1, cavM),
  box(CAV.x0 - 4, CAV.x0, CAV.y0, CAV.y1, CAV.z0, CAV.z1, cavM));
MWG.add(box(CAV.x0, CAV.x1 + 25, CAV.y0, CAV.y1, CAV.z0 - 4, CAV.z0, cavM));
MWG.add(box(MW.x1 - 8, MW.x1, MW.y0 + 6, MW.y1 - 4, MW.z0 + 4, CAV.z0 - 6, panelM));                  // panel kontrol depan
MWG.add(box(MW.x1, MW.x1 + 2, 1110, 1160, -1720, -1620, cel('glassD')));                            // layar
for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) MWG.add(rbox(MW.x1 - 2, MW.x1 + 5, 1074 - r * 26, 1094 - r * 26, -1712 + c * 48, -1676 + c * 48, 3, cel('rrD')));
MWG.add(cylX(24, 10, cel('rrD'), MW.x1, 960, -1670, 32));
MWG.add(box(MW.x1 - 8, MW.x1, MW.y0 + 6, MW.y0 + 22, CAV.z0, MW.z1, panelM));                         // ambang bawah pintu
// piring putar: cincin roda, piring kaca, mangkuk sup
const TTG = new THREE.Group(); TTG.position.set(...TT); MWG.add(TTG);
MWG.add(lathe([[60, -6], [96, -6], [96, -3], [60, -3]], darkM).translateX(TT[0]).translateY(TT[1]).translateZ(TT[2]));
TTG.add(lathe([[0, 0], [118, 0], [140, 6], [146, 12], [140, 12], [118, 4], [0, 4]], cel('plateG')));
TTG.add(lathe([[0, 4], [32, 4], [44, 10], [62, 40], [66, 52], [61, 52], [40, 14], [0, 12]], cel('bowl')).translateX(10), lathe([[0, 42], [58, 42], [58, 44], [0, 44]], cel('soup')).translateX(10));
// ruang kanan: saluran gelombang di dinding rongga, magnetron 2M246 (sumbu menghadap rongga), trafo, kipas
const wgM = cel('wg');
MWG.add(box(210, 330, 990, 1150, CAV.z0 - 34, CAV.z0 - 4, wgM));
const MM = new THREE.Group(); MM.position.set(268, 1062, -1672); MM.rotation.x = Math.PI / 2; MWG.add(MM);   // lokal +y -> dunia +z
MM.add(box(-44, 44, 38, 42, -44, 44, steel), box(-44, 44, -42, -38, -44, 44, steel), box(-44, 44, -42, 42, -44, -40, steel), box(-44, 44, -42, 42, 40, 44, steel));
MM.add(box(-58, 58, 42, 45, -58, 58, steel));                                                          // flens
MM.add(cylY(17, 17, 40, copper, 0, -20, 0, 28));
for (let k = 0; k < 7; k++) MM.add(box(-38, 38, -15 + k * 5, -14 + k * 5, -36, 36, fin));
MM.add(cylY(32, 32, 9, cel('dark'), 0, 25, 0, 32), cylY(32, 32, 9, cel('dark'), 0, -34, 0, 32));
MM.add(cylY(10, 10, 14, steel, 0, 45, 0, 20), cylY(12, 12, 6, cel('pinkC'), 0, 52, 0, 20), cylY(9, 5, 8, steel, 0, 58, 0, 20));
MM.add(box(-26, 26, -58, -42, -26, 26, steel), box(-3, 3, -66, -58, -18, -12, brass), box(-3, 3, -66, -58, 12, 18, brass));
MWG.add(box(150, 250, MW.y0 + 22, 1000, -1730, -1625, cel('dark')), box(170, 232, MW.y0 + 30, 994, -1720, -1635, cel('xfm')));   // trafo
const fan = new THREE.Group(); fan.position.set(130, 1060, -1672); MWG.add(fan);
for (let k = 0; k < 5; k++) { const b = box(-2, 2, 0, 40, -11, 11, cel('rrD')); b.rotation.x = k / 5 * Math.PI * 2; fan.add(b); }
fan.add(cylX(10, 10, darkM, -5, 0, 0, 16));
// penutup (atas + sisi kanan) dan pintu: dibuka saat dibelah
const cover = new THREE.Group(); MWG.add(cover);
cover.add(box(MW.x0, MW.x1, MW.y1 - 4, MW.y1, MW.z0, MW.z1, mwM), box(MW.x0, MW.x1, MW.y0 + 6, MW.y1 - 4, MW.z0, MW.z0 + 4, mwM), box(CAV.x0, CAV.x1 + 25, CAV.y1, CAV.y1 + 4, CAV.z0, CAV.z1, cavM),
  box(CAV.x0, CAV.x1 + 25, CAV.y0, CAV.y1, CAV.z1, CAV.z1 + 4, cavM), box(MW.x0, MW.x1, MW.y0 + 6, MW.y1 - 4, MW.z1 - 3, MW.z1, mwM));   // tutup atas + dinding kiri (rongga & luar)
const door = new THREE.Group(); door.position.set(MW.x1, 0, MW.z1); MWG.add(door);              // engsel kiri (z1)
door.add(box(-10, 8, MW.y0 + 22, MW.y1 - 4, CAV.z0 + 4 - MW.z1 - 6, 0, mwM));
door.add(box(8, 10, MW.y0 + 50, MW.y1 - 30, CAV.z0 + 40 - MW.z1, -26, cel('glassD')));
door.add(box(6, 22, 1000, 1110, CAV.z0 - MW.z1 - 2, CAV.z0 - MW.z1 + 12, panelM));
const WG_PATH = [[268, 1062, -1610], [268, 1110, -1600], [268, 1128, -1580], [280, 1050, -1500], [TT[0] + 10, 990, TT[2]]];
const curveWG = new THREE.CatmullRomCurve3(WG_PATH.map(p => V(...p)), false, 'catmullrom', 0.3);

// bayangan kontak di atas meja (lantai & dinding: di SVG)
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(34,30,66,.5)'); g.addColorStop(.55, 'rgba(34,30,66,.22)'); g.addColorStop(1, 'rgba(34,30,66,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blob = (x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.position.set(x, y, z); lt.add(m); return m; };
blob(MAGP[0] - 40, BENCH.y + 0.6, MAGP[2] - 20, 190, 190); blob(DISHP[0] + 10, BENCH.y + 0.6, DISHP[2], 110, 110); blob(KETP[0] + 10, BENCH.y + 0.6, KETP[2], 135, 135);
blob(300, CNT.y + 0.6, -1500, 260, 330);

const mk = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
const MK = {
  choc: mk(lt, 17, POCK.y1 + 50, 2350), anode: mk(MG, 30, 135, 20), fin: mk(MG, 70, 120, -30), magnet: mk(MG, -60, 240, 30), horn: mk(MG, 0, 135, -246),
  dish: mk(DG, 60, 40, 30), egg: mk(KG, 10, 70, 0), coat: mk(lt, 10, 1650, 2350),
  rrBody: mk(RG, RR.x1, 1100, -200), pipe: mk(RG, 150, 900, RR.z0 - 50), dial: mk(RG, RR.x1, 1600, -90),
  mag2: mk(MM, 44, 0, 0), wg: mk(lt, 270, 1150, -1605), plate: mk(lt, TT[0] + 100, TT[1] + 10, TT[2] + 100), mw: mk(lt, MW.x1, 1190, -1500),
};

// ---------- jadwal (semua dikunci ke kata) ----------
const MELT = [T(0, 'cokelat'), L[0].e];
const POP0 = T(4, 'meletup') - 0.12, POPDT = 0.08;
const SHAKE0 = T(5, 'bergetar'), BOOM = T(5, 'meledak');
const OPEN0 = L[10].s - 0.3, ON2 = T(10, 'magnetron');
const darkKeys = [[0, 0.3], [T(0, 'padahal'), 0.22], [L[1].s, 0], [L[6].s - 0.1, 0], [L[6].s + 0.5, 0.72], [L[6].e, 0.72], [L[7].s + 0.4, 0]];
const camKeys = [
  [0, [2352, 1380, 520, 70, 6, 0.5, 0.46, 0, 16]], [T(0, 'padahal'), [2350, 1400, 680, 68, 8, 0.5, 0.48, 0, 16]],
  [L[1].s + 0.6, [1700, 1150, 1700, 62, 10, 0.5, 0.64, 0, 320]], [L[1].e, [1720, 1140, 1600, 63, 10, 0.5, 0.64, 0, 320]],
  [T(2, 'magnetron') + 0.2, [1770, 1040, 660, 62, 14, 0.5, 0.6, 0, 380]], [L[2].e, [1770, 1040, 620, 64, 14, 0.5, 0.6, 0, 380]],
  [T(3, 'hangat'), [2090, 1260, 1550, 64, 10, 0.5, 0.6, 0, 260]], [L[3].e, [2080, 1250, 1500, 64, 10, 0.5, 0.6, 0, 260]],
  [L[4].s + 0.4, [1470, 960, 540, 60, 24, 0.5, 0.68, 0, 420]], [L[4].e + 0.2, [1460, 960, 500, 60, 24, 0.5, 0.68, 0, 420]],
  [T(5, 'telur') + 0.2, [1220, 1000, 560, 60, 18, 0.5, 0.64, 0, 420]], [BOOM, [1210, 1000, 520, 60, 18, 0.5, 0.64, 0, 420]],
  [L[6].s + 0.5, [1330, 990, 820, 60, 16, 0.5, 0.79, 0, 420]], [L[6].e, [1330, 990, 800, 60, 16, 0.5, 0.79, 0, 420]],
  [T(7, 'dua') - 0.3, [1300, 1000, 1500, 60, 12, 0.5, 0.66, 0, 350]], [T(7, 'radarange') + 0.4, [0, 900, 2300, 62, 8, 0.5, 0.52, 0, 330]],
  [L[8].e, [0, 920, 2200, 60, 8, 0.5, 0.53, 0, 330]],
  [L[9].s + 1.4, [-1500, 1030, 1100, 58, 16, 0.5, 0.75, 0, 300]], [L[9].e, [-1500, 1040, 1000, 58, 18, 0.5, 0.7, 0, 300]],
  [L[10].s + 0.9, [-1535, 1030, 780, 62, 38, 0.5, 0.6, 0, 290]], [L[10].e, [-1530, 1030, 740, 60, 38, 0.5, 0.6, 0, 290]],
  [L[11].s + 1.2, [250, 1000, 4300, 26, 12, 0.5, 0.5, 0, 320]], [L[11].e, [250, 1000, 4250, 26, 12, 0.5, 0.5, 0, 320]],
  [L[12].s + 1.2, [2090, 1250, 1600, 64, 10, 0.5, 0.64, 0, 260]], [DUR, [2090, 1250, 1500, 64, 10, 0.5, 0.64, 0, 260]],
];

// ---------- label, teks kinetik, komponen format ----------
const tagDefs = [];
const tag = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
tag(T(0, 'cokelat'), T(0, 'padahal') + 0.6, 'Cokelat di saku', () => MK.choc, 'r', 'hi');
tag(T(2, 'tabung'), L[2].e + 0.2, 'Anoda tembaga', () => MK.anode, 'r', 'hi');
tag(T(2, 'bersirip'), L[2].e + 0.2, 'Sirip pendingin', () => MK.fin, 'l');
tag(T(2, 'magnet', 1), L[2].e + 0.2, 'Magnet', () => MK.magnet, 'l');
tag(T(4, 'jagung'), T(4, 'meletup'), 'Biji jagung', () => MK.dish, 'r');
tag(T(5, 'telur'), BOOM - 0.1, 'Telur di dalam ceret', () => MK.egg, 'r', 'hi');
tag(T(8, 'tingginya'), L[8].e + 0.3, `±${(RR.h / 1000).toFixed(1).replace('.', ',')} m`, () => [RR.x1, RR.h, RR.z0 + 40], 'r', 'hi');
tag(T(8, 'beratnya'), L[8].e + 0.3, `±${RR.kg} kg`, () => MK.rrBody, 'r');
tag(T(8, 'didinginkan'), L[8].e + 0.3, 'Pipa air pendingin', () => MK.pipe, 'r', 'ok');
tag(T(10, 'magnetron'), L[10].e + 0.3, 'Magnetron', () => MK.mag2, 'r', 'hi');
tag(T(10, 'saluran'), L[10].e + 0.3, 'Saluran gelombang', () => MK.wg, 'l');
tag(T(10, 'piring'), L[10].e + 0.3, 'Piring putar', () => MK.plate, 'l');
const stampDefs = [
  [T(0, 'meleleh'), T(0, 'padahal') + 0.2, 'Meleleh?', 300, ''],
  [T(3, 'penasaran'), L[3].e + 0.4, 'Kenapa?', 280, 'snd'],
  [T(4, 'popcorn'), L[4].e + 0.4, 'Pop!', 300, 'snd'],
  [BOOM, L[5].e + 0.3, 'Duar!', 280, ''],
  [T(9, 'seharga'), L[9].e + 0.4, '$495', 300, 'snd'],
  [T(12, 'tulis'), DUR + 1, 'Tulis di|komentar!', 440, 'snd'],
];
const FORMAT = { bab: { pita: [[0, 1]], items: [
  { t: L[1].s, label: 'BAB 1 · 1945', judul: 'Cokelat di saku' },
  { t: L[4].s - 0.2, label: 'BAB 2 · 1945', judul: 'Jagung &amp; telur' },
  { t: T(7, 'dua'), label: 'BAB 3 · 1947', judul: 'Radarange' },
  { t: L[9].s, label: 'BAB 4 · 1967', judul: 'Masuk dapur' },
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
const S = { dark: 0, melt: 0, magOn: 1, mwOn: 0, open: 0, boom: 0, imp: 0 };
const G = 2600;    // gravitasi mm/s²
function updateModel(t) {
  S.dark = track(darkKeys, t);
  S.melt = smooth(MELT[0], MELT[1] + 0.8, t);
  S.magOn = 1 - smooth(L[6].e, L[7].s + 0.6, t) + smooth(L[11].e, L[12].s + 0.8, t);
  // cokelat meleleh: kotak atas melorot & menipis, tiga tetesan memanjang, warna mengilap
  chunks3.forEach(m => { const r = m.userData.r, sag = S.melt * (6 + r * 9); m.position.copy(m.userData.p0); m.position.y -= sag; m.position.x += S.melt * (2 + r * 1.5); m.scale.set(1 + S.melt * 0.12, 1 - S.melt * 0.18, 1 + S.melt * 0.05); });
  drips.forEach((g, k) => { const len = Math.max(0.01, smooth(MELT[0] + 0.3 + k * 0.4, MELT[1] + 1.2 + k * 0.3, t) * (60 + k * 28)); g.userData.c.scale.y = len; g.userData.b.position.y = -len; g.visible = S.melt > 0.05; });
  chocM.hl('chocMelt', S.melt * 0.8);
  // jagung -> popcorn (lompat lalu jatuh ke tumpukan)
  kernels.forEach((ker, k) => { const tp = POP0 + k * POPDT; ker.visible = t < tp;
    const p = pops[k], u = p.userData, d = t - tp; p.visible = d >= 0;
    if (d >= 0) { const f = clamp(d / 0.55), h = 120 * Math.sin(Math.PI * f);
      p.position.set(lerp(u.x0, u.x1, f), lerp(u.y0, u.y1, f) + h, lerp(u.z0, u.z1, f)); p.rotation.set(u.rot * f, u.rot * 0.7 * f, 0); p.scale.setScalar(lerp(0.3, 1, backOut(d / 0.18))); } });
  // telur: bergetar lalu meledak
  const sh = smooth(SHAKE0, BOOM, t), boomed = t >= BOOM;
  egg.visible = !boomed;
  egg.position.set(-14 + Math.sin(t * 90) * 2.4 * sh, 44 + Math.abs(Math.sin(t * 70)) * 3 * sh, Math.cos(t * 83) * 2 * sh);
  eggM.hl('yolk', sh * 0.2);
  shells.forEach((m, k) => { m.visible = boomed && t < BOOM + 2.5; if (!m.visible) return; const d = t - BOOM, a = hash(k, 4) * Math.PI * 2, sp = 500 + hash(k, 5) * 700;
    const vx = 280 + hash(k, 6) * 500, vy = 400 + hash(k, 7) * 900, vz = Math.sin(a) * sp * 0.6;
    let y = 60 + vy * d - 0.5 * G * d * d; const x = -14 + vx * d * 0.6, z = vz * d; y = Math.max(y, 2);
    m.position.set(x, y, z); m.rotation.set(d * 9 * hash(k, 8), d * 7, d * 5); });
  yolk.visible = albumen.visible = boomed;
  if (boomed) { const g = backOut((t - BOOM) / 0.4); yolk.scale.set(30 * g, 7, 30 * g); albumen.scale.set(70 * g, 4, 70 * g); }
  lidG.position.y = boomed ? Math.max(0, 260 * (t - BOOM) - 0.5 * G * (t - BOOM) ** 2) : 0;
  lidG.rotation.x = boomed ? 0.4 * Math.max(0, Math.sin(Math.PI * clamp((t - BOOM) / 0.2))) : 0;
  S.boom = boomed ? Math.exp(-(t - BOOM) * 4) : 0; S.imp = S.boom;
  copper.hl('yellow', S.magOn * 0.12 * (0.6 + 0.4 * Math.sin(t * 9)));
  // Radarange: jam berputar, lampu menyala
  needle.rotation.x = -t * 0.35;
  lampR.material.hl('yellow', t > L[7].e ? 0.6 : 0);
  // microwave: pintu berayun, penutup diangkat, piring berputar
  S.open = smooth(OPEN0, OPEN0 + 1.2, t) * (1 - smooth(L[11].e, L[12].s, t));
  door.rotation.y = -1.75 * easeIO(smooth(OPEN0, OPEN0 + 0.9, t)) * (1 - smooth(L[11].e, L[12].s, t));
  cover.position.set(-60 * S.open, 330 * easeIO(S.open), 0); cover.visible = S.open < 0.98;
  S.mwOn = smooth(ON2 - 0.3, ON2 + 0.3, t) * (1 - smooth(L[11].e, L[12].s, t));
  TTG.rotation.y = Math.max(0, t - ON2) * 0.9;
  fan.rotation.x = Math.max(0, t - ON2) * 14;
}

const tmpV = new THREE.Vector3();
let CAM = camKeys[0][1];
function updateCamera(t) {
  const c = CAM = window.CAM_OVERRIDE || track(camKeys, t);
  const h = c[2] * (1 - 0.012 * Math.sin(t * 0.7)) * (1 - 0.05 * S.imp);
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
  const sk = S.boom * 10;
  $('shake').style.transform = sk > 0.3 ? `translate(${(Math.sin(t * 71) * sk).toFixed(1)}px, ${(Math.cos(t * 53) * sk * 0.6).toFixed(1)}px)` : '';
}
function project(p) {
  const v = p.isObject3D ? p.getWorldPosition(new THREE.Vector3()) : lt.localToWorld(V(...p));
  v.project(camera);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}

// ---------- lingkungan SVG: satu dinding panjang = garis waktu (lab 1945 · ruang 1947 · dapur kini) ----------
$('bg').innerHTML = `<defs>
  <filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="dofb" stdDeviation="0"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <pattern id="ftile" width="300" height="300" patternUnits="userSpaceOnUse"><rect width="300" height="300" fill="#d6c9b1"/><rect width="150" height="150" fill="#cdbfa5"/><rect x="150" y="150" width="150" height="150" fill="#cdbfa5"/></pattern>
  <pattern id="btile" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="#eef2ee"/><path d="M100 0H0V100" fill="none" stroke="#c4cfca" stroke-width="5"/></pattern>
  <radialGradient id="lampg"><stop offset="0" stop-color="#fff2c6" stop-opacity=".9"/><stop offset="1" stop-color="#fff2c6" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#1c2236" stop-opacity="0"/><stop offset="1" stop-color="#1c2236" stop-opacity=".3"/></radialGradient>
  <radialGradient id="night" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#232838"/><stop offset="1" stop-color="#0d0f15"/></radialGradient>
  </defs>
  <rect width="1080" height="1920" fill="#aebdba"/>
  <g id="env" filter="url(#dof)"></g>
  <rect width="1080" height="1920" fill="url(#vig)"/>
  <rect id="bgNight" width="1080" height="1920" fill="url(#night)" opacity="0"/>`;
const f1 = v => v.toFixed(1);
const planeM = (o, u, v) => {
  const O = project(o), U = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]), Q = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(U[0] - O[0]).toFixed(5)} ${(U[1] - O[1]).toFixed(5)} ${(Q[0] - O[0]).toFixed(5)} ${(Q[1] - O[1]).toFixed(5)} ${f1(O[0])} ${f1(O[1])})`;
};
const WALL = () => planeM([0, 0, 0], [0, 0, -1], [0, -1, 0]);     // bidang dinding: (a, b) = (−z, −y)
const INK = '#1b1a1f', SANS = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
// jas lab (a = −z, b = −y), saku 3D ada di z 2290..2410
const COAT = `<path d="M-2350 -2075a16 16 0 1 1 10 14" fill="none" stroke="${INK}" stroke-width="7"/>
  <g filter="url(#soft)" opacity=".35"><path d="M-2510 -1950L-2140 -1950L-2120 -1030L-2520 -1030Z" fill="#2a2440" transform="translate(40 40)"/></g>
  <path d="M-2575 -1955Q-2625 -1600 -2612 -1250L-2558 -1250Q-2560 -1600 -2540 -1900Z" fill="#ece9e0" stroke="${INK}" stroke-width="6"/>
  <path d="M-2125 -1955Q-2075 -1600 -2088 -1250L-2142 -1250Q-2140 -1600 -2160 -1900Z" fill="#ece9e0" stroke="${INK}" stroke-width="6"/>
  <path d="M-2565 -1965Q-2590 -1700 -2560 -1040L-2140 -1040Q-2110 -1700 -2135 -1965Q-2240 -2010 -2350 -1995Q-2460 -2010 -2565 -1965Z" fill="#f6f4ed" stroke="${INK}" stroke-width="6"/>
  <path d="M-2530 -1975L-2350 -2042L-2170 -1975" fill="none" stroke="#6b4a28" stroke-width="10" stroke-linecap="round"/>
  <path d="M-2350 -1995L-2425 -1790L-2350 -1520L-2275 -1790Z" fill="#e2dfd4" stroke="${INK}" stroke-width="5"/>
  <path d="M-2350 -1520V-1040" stroke="${INK}" stroke-width="4"/>
  ${[-1460, -1320, -1180].map(b => `<circle cx="-2372" cy="${b}" r="11" fill="#d8d3c4" stroke="${INK}" stroke-width="3"/>`).join('')}
  <rect x="-2520" y="-1700" width="110" height="18" rx="6" fill="#e2dfd4" stroke="${INK}" stroke-width="4"/>`;
function updateBg(t) {
  const zoom = 600 / CAM[2];
  $('dofb').setAttribute('stdDeviation', clamp((zoom - 1.0) * 1.8, 0, 9).toFixed(2));
  const ang = t * 0.6;
  let s = `<g transform="${WALL()}">
    <rect x="-3400" y="-3400" width="2600" height="3400" fill="#aebdba"/>
    <rect x="-3400" y="-1000" width="2600" height="1000" fill="#91a5a2"/><rect x="-3400" y="-1010" width="2600" height="22" fill="#7a8f8c" stroke="${INK}" stroke-width="3"/>
    <rect x="-800" y="-3400" width="1600" height="3400" fill="#8fa3b3"/>
    <rect x="800" y="-3400" width="2600" height="3400" fill="#d3dbd5"/>
    ${[-820, 780].map(a => `<rect x="${a}" y="-3400" width="40" height="3400" fill="#6f8291" stroke="${INK}" stroke-width="4"/>`).join('')}
    <rect x="-1920" y="-2120" width="420" height="500" fill="#2f5f8f" stroke="${INK}" stroke-width="6"/>
    <g fill="none" stroke="#dbe9f7" stroke-width="5" opacity=".9"><path d="M-1830 -1760q120 -200 260 -60"/><path d="M-1700 -1820l-40 140M-1760 -1680h120M-1700 -1820l30 -60"/>
      <path d="M-1860 -2060h300M-1860 -2020h180" stroke-width="3"/><circle cx="-1600" cy="-1940" r="40"/><path d="M-1640 -1940h80M-1600 -1980v80" stroke-width="2"/></g>
    <rect x="-1420" y="-2040" width="380" height="110" rx="8" fill="#2e3036" stroke="${INK}" stroke-width="5"/>
    <text x="-1230" y="-1970" ${SANS} font-weight="900" font-size="54" letter-spacing="6" fill="#e9e1cf" text-anchor="middle">LAB RADAR</text>
    <circle cx="-1150" cy="-1720" r="70" fill="#fbf8f2" stroke="${INK}" stroke-width="7"/>
    <path d="M-1150 -1720l${f1(Math.sin(ang / 12) * 36)} ${f1(-Math.cos(ang / 12) * 36)}M-1150 -1720l${f1(Math.sin(ang) * 52)} ${f1(-Math.cos(ang) * 52)}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M-1660 -2600v380" stroke="${INK}" stroke-width="6"/><path d="M-1760 -2160h200l-40 -70h-120Z" fill="#3d5a52" stroke="${INK}" stroke-width="5"/>
    ${COAT}
    <rect x="-520" y="-2350" width="300" height="220" rx="6" fill="#6f5b45" stroke="${INK}" stroke-width="5"/><rect x="-502" y="-2332" width="264" height="184" fill="#b9d3e2"/>
    <path d="M-500 -2190h260v42h-260Z" fill="#5c8fb0"/><path d="M-470 -2200l30 -40h150l20 40Z" fill="#fbf8f2" stroke="${INK}" stroke-width="4"/><rect x="-400" y="-2270" width="22" height="34" fill="#c9443c" stroke="${INK}" stroke-width="3"/>
    <g filter="url(#soft)" opacity=".38"><rect x="-300" y="-1780" width="640" height="1780" fill="#2a2440" transform="translate(40 30)"/></g>
    <rect x="800" y="-1460" width="1700" height="560" fill="url(#btile)"/><rect x="800" y="-1470" width="1700" height="14" fill="#a9b6b0"/>
    <rect x="880" y="-2380" width="1560" height="680" fill="#93ab9b" stroke="${INK}" stroke-width="6"/>
    ${[880, 1270, 1660, 2050].map(a => `<rect x="${a + 14}" y="-2366" width="362" height="652" rx="6" fill="#a7bdaf" stroke="${INK}" stroke-width="4"/><rect x="${a + 180}" y="-1770" width="40" height="12" rx="6" fill="#e2e5e8" stroke="${INK}" stroke-width="3"/>`).join('')}
    <g filter="url(#soft)" opacity=".4"><rect x="1270" y="-1220" width="500" height="320" fill="#2a2440" transform="translate(30 20)"/></g>
  </g>`;
  // cahaya lampu meja lab
  { const c = project([0, 2160, 1660]), r = 1100 * (1920 / CAM[2]) / 3; s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="url(#lampg)" opacity=".6"/>`; }
  // lantai
  s += `<g transform="${planeM([0, 0, 0], [1, 0, 0], [0, 0, -1])}"><rect x="0" y="-2900" width="2600" height="5400" fill="url(#ftile)"/>
    <g filter="url(#soft)" fill="#2a2440"><rect x="120" y="-2100" width="700" height="1050" opacity=".32"/><ellipse cx="340" cy="0" rx="360" ry="370" opacity=".45"/><rect x="0" y="900" width="660" height="1200" opacity=".3"/></g></g>`;
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
    el.style.top = clamp(y - h / 2, 180, 1540) + 'px';
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

// ---------- efek: gelombang dari corong magnetron, cahaya, percikan telur, air pendingin, gelombang di saluran microwave, uap ----------
const WAVE = '#ff7ab8';
function updateFx(t) {
  let s = `<defs><radialGradient id="mglo"><stop offset="0" stop-color="#ffd0e6" stop-opacity=".95"/><stop offset=".4" stop-color="${WAVE}" stop-opacity=".45"/><stop offset="1" stop-color="${WAVE}" stop-opacity="0"/></radialGradient>
    <radialGradient id="warm"><stop offset="0" stop-color="#ffb36b" stop-opacity=".7"/><stop offset="1" stop-color="#ffb36b" stop-opacity="0"/></radialGradient></defs>`;
  const pxmm = 1920 / CAM[2];
  // cahaya magnetron dari kanan saat hook (magnetron di luar layar) + hangat di cokelat
  if (t < L[1].s + 0.5) { const a = 1 - smooth(L[0].e, L[1].s + 0.5, t), c = project(MK.choc);
    s += `<circle cx="1120" cy="1150" r="760" fill="url(#mglo)" opacity="${(0.55 * a).toFixed(3)}"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(120 * pxmm)}" fill="url(#warm)" opacity="${(0.8 * a * S.melt).toFixed(3)}"/>`; }
  // gelombang mikro dari corong magnetron radar
  if (S.magOn > 0.01) {
    const c = project(HORN), d = project([HORN[0], HORN[1], HORN[2] - 100]), th = Math.atan2(d[1] - c[1], d[0] - c[0]);
    s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(90 * pxmm)}" fill="url(#mglo)" opacity="${(0.9 * S.magOn).toFixed(3)}"/>`;
    for (let k = 0; k < 6; k++) { const ph = (t * 0.8 + k / 6) % 1, R = (24 + ph * 560) * pxmm, a0 = th - 0.62, a1 = th + 0.62;
      s += `<path d="M${f1(c[0] + R * Math.cos(a0))} ${f1(c[1] + R * Math.sin(a0))}A${f1(R)} ${f1(R)} 0 0 1 ${f1(c[0] + R * Math.cos(a1))} ${f1(c[1] + R * Math.sin(a1))}" fill="none" stroke="${WAVE}" stroke-width="${f1(clamp(3.2 * pxmm, 2, 9))}" stroke-linecap="round" opacity="${(S.magOn * (1 - ph) * 0.85).toFixed(3)}"/>`; }
  }
  // popcorn: kepulan kecil saat meletup
  for (let k = 0; k < 11; k++) { const d = t - (POP0 + k * POPDT); if (d < 0 || d > 0.25) continue; const c = project(pops[k]), r = (10 + d * 140) * pxmm;
    s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="none" stroke="#fff8e6" stroke-width="${f1(4 * pxmm)}" opacity="${(1 - d / 0.25).toFixed(2)}"/>`; }
  // telur meledak: kilat + cipratan kuning-putih menempel di layar lalu meleleh turun
  if (t >= BOOM && t < BOOM + 1.9) { const d = t - BOOM, c = project(egg.parent.localToWorld(V(-14, 44, 0))), g = backOut(d / 0.22), fade = 1 - smooth(1.2, 1.9, d), run = Math.max(0, d - 0.45) ** 2 * 160;
    s += `<rect width="1080" height="1920" fill="#fffbe6" opacity="${(Math.exp(-d * 14) * 0.85).toFixed(3)}"/>`;
    for (let k = 0; k < 9; k++) { const a = hash(k, 21) * Math.PI * 2, dist = (60 + hash(k, 22) * 420) * g, r = (40 + hash(k, 23) * 70) * g, x = c[0] + Math.cos(a) * dist, y = c[1] + Math.sin(a) * dist * 0.8 + run * (0.5 + hash(k, 24)), yolkK = k % 3 === 0;
      s += `<g opacity="${fade.toFixed(3)}"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * 0.82)}" fill="${yolkK ? '#f6b52a' : '#fffaf0'}" stroke="${INK}" stroke-width="4"/>
        <path d="M${f1(x - r * 0.3)} ${f1(y + r * 0.6)}q${f1(r * 0.1)} ${f1(r * 0.8 + run * 0.3)} ${f1(r * 0.25)} ${f1(r * 0.9 + run * 0.4)}" stroke="${yolkK ? '#f6b52a' : '#fffaf0'}" stroke-width="${f1(r * 0.3)}" stroke-linecap="round" fill="none"/></g>`; }
  }
  // Radarange: ukuran tinggi dari model + air pendingin mengalir
  { const a = pulse(T(8, 'tingginya') - 0.1, L[8].e + 0.3, t, 0.2);
    if (a > 0.01) { const p0 = project([RR.x1 + 10, 0, RR.z1 + 70]), p1 = project([RR.x1 + 10, RR.h, RR.z1 + 70]), q0 = project([RR.x1 + 10, 0, RR.z1 + 10]), q1 = project([RR.x1 + 10, RR.h, RR.z1 + 10]);
      s += `<g opacity="${a.toFixed(3)}" stroke="#e3bf62" stroke-width="6" stroke-linecap="round"><line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}"/>
        <line x1="${f1(q0[0])}" y1="${f1(q0[1])}" x2="${f1(p0[0])}" y2="${f1(p0[1])}"/><line x1="${f1(q1[0])}" y1="${f1(q1[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}"/></g>`; }
    const w = pulse(T(8, 'didinginkan') - 0.3, L[8].e + 0.6, t, 0.25);
    if (w > 0.01) for (const [cv, sp] of [[curveP1, 0.35], [curveP2, 0.35]]) for (let k = 0; k < 16; k++) { const p = cv.getPointAt((t * sp + k / 16) % 1), c = project([p.x, p.y, p.z]);
      s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(clamp(7 * pxmm, 3, 8))}" fill="#7fd0ff" stroke="${INK}" stroke-width="2" opacity="${w.toFixed(2)}"/>`; } }
  // microwave: kisi titik di kaca pintu & layar jam saat tertutup
  if (S.open < 0.02) {
    const m = planeM([MW.x1 + 10.5, MW.y1 - 50, MW.z1 - 40], [0, 0, -1], [0, -1, 0]);
    let dots = ''; for (let i = 0; i < 26; i++) for (let j = 0; j < 17; j++) dots += `<circle cx="${8 + i * 11}" cy="${8 + j * 11}" r="3" fill="#59616f"/>`;
    s += `<g transform="${m}">${dots}</g>`;
  }
  { const m = planeM([MW.x1 + 2.2, 1155, -1626], [0, 0, -1], [0, -1, 0]);
    s += `<g transform="${m}"><text x="47" y="36" ${SANS} font-weight="800" font-size="34" fill="#7ff0c8" text-anchor="middle">${S.mwOn > 0.5 ? '0:' + String(45 - Math.min(44, Math.floor(Math.max(0, t - ON2)))).padStart(2, '0') : '12:00'}</text></g>`; }
  { const m = planeM([RR.x1 + 4.5, 1484, 140], [0, 0, -1], [0, -1, 0]);
    s += `<g transform="${m}"><text x="140" y="28" ${SANS} font-weight="900" font-size="28" letter-spacing="5" fill="#e9e1cf" text-anchor="middle">RADARANGE</text></g>`; }
  // gelombang di saluran microwave -> makanan, uap di atas sup
  if (S.mwOn > 0.01) {
    const N = 70, pts = []; for (let i = 0; i <= N; i++) { const p = curveWG.getPointAt(i / N); pts.push(project([p.x, p.y, p.z])); }
    let d = ''; pts.forEach((p, i) => { const q = pts[Math.min(N, i + 1)], r = pts[Math.max(0, i - 1)], tx = q[0] - r[0], ty = q[1] - r[1], l = Math.hypot(tx, ty) || 1, o = Math.sin(i * 0.75 - t * 12) * 9 * pxmm * Math.sin(Math.PI * i / N);
      d += `${i ? 'L' : 'M'}${f1(p[0] - ty / l * o)} ${f1(p[1] + tx / l * o)}`; });
    const c0 = project(WG_PATH[0]), cf = project(WG_PATH[WG_PATH.length - 1]);
    s += `<circle cx="${f1(c0[0])}" cy="${f1(c0[1])}" r="${f1(40 * pxmm)}" fill="url(#mglo)" opacity="${S.mwOn.toFixed(2)}"/>
      <path d="${d}" fill="none" stroke="${WAVE}" stroke-width="${f1(clamp(3 * pxmm, 2, 8))}" stroke-linecap="round" opacity="${(0.9 * S.mwOn).toFixed(2)}"/>
      <circle cx="${f1(cf[0])}" cy="${f1(cf[1])}" r="${f1(80 * pxmm)}" fill="url(#warm)" opacity="${(0.8 * S.mwOn).toFixed(2)}"/>`;
    const st = S.mwOn * smooth(ON2 + 0.8, ON2 + 2.2, t);
    for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1, b = project([TT[0] + 10, TT[1] + 55 + ph * 80, TT[2] + (k - 1) * 22]);
      s += `<path d="M${f1(b[0])} ${f1(b[1])}q${f1(7 * pxmm)} ${f1(-8 * pxmm)} 0 ${f1(-16 * pxmm)}t0 ${f1(-16 * pxmm)}" fill="none" stroke="#fffaf0" stroke-width="${f1(3 * pxmm)}" stroke-linecap="round" opacity="${(st * Math.sin(Math.PI * ph)).toFixed(2)}"/>`; }
  }
  $('dim').innerHTML = s;
}

// ---------- kartu sisipan: molekul air berputar (momen gelap) · paten 1945 ----------
const Fn = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800"';
function updateInset(t) {
  const ws = [[L[6].s - 0.1, L[6].e + 0.2], [T(7, 'oktober') - 0.1, T(7, 'dua') - 0.25]];
  const k = ws.findIndex(([a, b]) => t > a - 0.12 && t < b + 0.12), el = $('inset');
  const a = k < 0 ? 0 : pulse(ws[k][0], ws[k][1], t, 0.12);
  el.style.opacity = a;
  if (a <= 0.001) return;
  el.style.transform = `scale(${lerp(0.85, 1, backOut((t - ws[k][0] + 0.12) / 0.35)).toFixed(3)})`;
  const tx = (x, y, s, size, col = INK, op = 1, anchor = 'start', extra = '') => `<text x="${x}" y="${y}" ${Fn} font-size="${size}" fill="${col}" opacity="${op.toFixed(3)}" text-anchor="${anchor}" ${extra}>${s}</text>`;
  let g = '';
  if (k === 0) {
    $('insetk').textContent = 'GELOMBANG MIKRO · MOLEKUL AIR';
    const E = Math.sin(t * Math.PI * 2 * 1.1), up = E >= 0;
    g += `<g transform="translate(110 245)"><line x1="0" y1="${f1(-110 * E)}" x2="0" y2="${f1(110 * E)}" stroke="${WAVE}" stroke-width="12" stroke-linecap="round"/>
      <path d="M-26 ${f1(-110 * E + 40 * Math.sign(E || 1))}L0 ${f1(-120 * E)}L26 ${f1(-110 * E + 40 * Math.sign(E || 1))}" fill="none" stroke="${WAVE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    g += tx(110, 420, 'medan', 28, '#7a7368', 1, 'middle');
    for (let i = 0; i < 6; i++) { const x = 290 + (i % 3) * 230, y = 175 + Math.floor(i / 3) * 150, th = -E * 70 + Math.sin(t * 23 + i) * 6 + (i % 2 ? 8 : -8);
      g += `<g transform="translate(${x} ${y}) rotate(${f1(th)})"><circle cx="-34" cy="28" r="19" fill="#fffdf8" stroke="${INK}" stroke-width="4"/><circle cx="34" cy="28" r="19" fill="#fffdf8" stroke="${INK}" stroke-width="4"/>
        <circle r="31" fill="#e5484d" stroke="${INK}" stroke-width="4"/>${tx(0, 11, 'O', 30, '#fff', 1, 'middle')}</g>`; }
    const heat = smooth(T(6, 'goyangan') - 0.3, L[6].e, t);
    g += tx(240, 438, 'PANAS', 26, '#c06a2e') + `<rect x="340" y="414" width="520" height="30" rx="15" fill="#efe8dc" stroke="${INK}" stroke-width="3"/><rect x="343" y="417" width="${f1(514 * heat)}" height="24" rx="12" fill="#e5884d"/>`;
    g += tx(470, 104, 'berbalik arah miliaran kali per detik', 30, INK, smooth(T(6, 'miliaran') - 0.2, T(6, 'miliaran') + 0.3, t), 'middle');
  } else {
    $('insetk').textContent = 'PATEN AMERIKA SERIKAT 2.495.429';
    const q = i => smooth(ws[1][0] + 0.25 * i, ws[1][0] + 0.25 * i + 0.4, t);
    g = tx(60, 160, 'Diajukan 8 Oktober 1945', 60, INK, q(0)) + tx(60, 236, '“Method of Treating Foodstuffs”', 40, '#3e5bb8', q(1), 'start', 'font-style="italic"') +
      tx(60, 306, 'Percy L. Spencer · Raytheon', 38, '#7a7368', q(2)) + tx(60, 400, 'Disetujui 24 Januari 1950', 40, '#1f7a5c', q(3));
    g += `<g transform="translate(800 330) rotate(-12)" opacity="${q(3).toFixed(3)}"><circle r="74" fill="none" stroke="#b8913a" stroke-width="8"/><circle r="60" fill="none" stroke="#b8913a" stroke-width="3"/>${tx(0, 12, 'PATEN', 32, '#b8913a', 1, 'middle')}</g>`;
  }
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
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); FMT.gambar(t, FORMAT, project); };
// peristiwa suara (dari model)
window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[4] === 'snd' ? 'stampSnd' : 'stamp' }));
  FORMAT.bab.items.forEach(it => ev.push({ t: it.t, type: 'card' }));
  ev.push({ t: L[6].s - 0.1, type: 'card' }, { t: T(7, 'oktober') - 0.1, type: 'card' });
  ev.push({ t: 0.05, type: 'hum', dur: L[6].e + 0.6 }, { t: MELT[0], type: 'desis', dur: 2.2 });
  for (let k = 0; k < 11; k++) ev.push({ t: POP0 + k * POPDT, type: 'klikTombol' });
  ev.push({ t: SHAKE0, type: 'jiggle' }, { t: BOOM, type: 'hit' }, { t: BOOM + 0.01, type: 'crack' }, { t: L[6].s, type: 'gelap' });
  for (const k of [L[1].s, T(7, 'dua'), L[9].s, L[11].s, L[12].s]) ev.push({ t: k, type: 'whoosh' });
  ev.push({ t: OPEN0, type: 'lid' }, { t: ON2 - 0.35, type: 'klikTombol' }, { t: ON2, type: 'blip' }, { t: ON2, type: 'hum', dur: L[11].s - ON2 + 0.8 }, { t: T(11, 'kenapa'), type: 'chime' });
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR; window.TW = T;
window.__dbg = { S, project, lt, camera };
renderAt(0);
window.READY = true;
{
  const cue = (name, t) => window.EVENTS.events.push({ t, type: 'cue', name });
  cue('heart', 0); cue('mystery', LN(1).s); cue('act1', LN(2).s); cue('danger', LN(4).s); cue('drop', LN(5).s - 0.05); cue('build', LN(5).s + 1.0);
  cue('reveal', LN(6).s - 0.1); cue('warm', LN(7).s); cue('dark', LN(10).s); cue('resolve', LN(11).s); cue('end', DUR);
  window.EVENTS.events.sort((a, b) => a.t - b.t);
}
window.coverPx = () => project(MK.anode);
