gradTex.image.data.set([84, 84, 84, 128, 128, 172, 172, 214]); gradTex.needsUpdate = true;   // stapler banyak bidang tegak: nada gelap dinaikkan
// ---------- dunia (mm; meja z = 0; stapler lokal: x ke depan, engsel di belakang) ----------
renderer.localClippingEnabled = true;
const cutPlane = new THREE.Plane(V(0, 1, 0), 1e5);                       // potongan belah (jauh = tidak memotong)
const normalMatClip = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, clippingPlanes: [cutPlane] });
const root = new THREE.Group(); scene.add(root);
root.rotation.y = -0.38;
const base = new THREE.Group(); root.add(base);
base.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 1).normalize(), V(1, 0, -1).normalize(), V(0, 1, 0)));
const W0 = new THREE.Group(); base.add(W0);
const box = (sx, sy, sz, mat, x, y, z, p = W0) => { const m = mesh(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z); p.add(m); return m; };
const rbox = (sx, sy, sz, r, mat, x, y, z, p = W0) => { const m = mesh(new RoundedBoxGeometry(sx, sy, sz, 3, Math.min(r, sx / 2 - .01, sy / 2 - .01, sz / 2 - .01)), mat, x, y, z); p.add(m); return m; };
// box dari rentang [x0,x1]×[y0,y1]×[z0,z1]
const span = (x0, x1, y0, y1, z0, z1, mat, p, r = 0) => (r > 0 ? rbox : (a, b, c, _r, m, x, y, z, pp) => box(a, b, c, m, x, y, z, pp))(x1 - x0, y1 - y0, z1 - z0, r, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, p);
const celC = pal => { const m = cel(pal); m.clippingPlanes = [cutPlane]; m.side = THREE.FrontSide;   // material yang ikut terbelah
  m.userData.back = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL[pal][0]).lerp(new THREE.Color('#ffffff'), 0.55), side: THREE.BackSide, clippingPlanes: [cutPlane] }); return m; };
const M = { wood: cel('deskwood'), book: cel('blue'), bookPage: cel('white'), paper: cel('paper'), staple: cel('steel'), driver: cel('steel'),
  steelC: celC('steel'), plateC: celC('plate'), head: celC('red'), baseM: cel('sleeve2'), baseIn: celC('sleeve2'), follower: cel('ink'), spring: cel('spring'),
  anvil: cel('plate'), pin: cel('steel'), torsion: cel('spring'), pencil: cel('tape'), note: cel('yellow') };
M.paper.transparent = true;

// meja + buku tipis (menyangga kertas yang menjulur keluar) + pensil, catatan tempel
rbox(1400, 900, 40, 12, M.wood, 60, 40, -20 - 1.2);
const book = new THREE.Group(); W0.add(book);
const ST = new THREE.Group(); W0.add(ST);                // stapler + kertas (bingkai lokal)
ST.rotation.z = 2.05; ST.position.set(-40, -30, 0);
span(152, 330, -70, 70, 0, 6.6, M.book, ST, 1.2); span(153, 328, -68.5, 68.5, 0.5, 6.4, M.bookPage, ST, 0.4);
const pencil = new THREE.Group(); pencil.position.set(60, 150, 4); pencil.rotation.z = -0.3; W0.add(pencil);
pencil.add(mesh(new THREE.CylinderGeometry(3.6, 3.6, 150, 6).rotateZ(Math.PI / 2), M.pencil, 0, 0, 0));
pencil.add(mesh(new THREE.ConeGeometry(3.6, 16, 6).rotateZ(-Math.PI / 2), cel('skewer'), 83, 0, 0));
pencil.add(mesh(new THREE.CylinderGeometry(3.7, 3.7, 10, 12).rotateZ(Math.PI / 2), cel('red'), -80, 0, 0));
{ const n = rbox(60, 60, 0.6, 0.6, M.note, -150, 120, 0.3); n.rotation.z = 0.25; }

// ---------- ukuran stapler ----------
const BASE_TOP = 7.0, PZ0 = 7.1, PZ1 = 8.7;               // landasan, dasar & puncak tumpukan kertas (4 lembar)
const HX = 9, HZ = 19;                                    // engsel
const XS = 137.15;                                        // x staples terdepan = bidang pisau
const W2 = 6.1, LEG = 6.0, WR = 0.36, RG = 0.65;           // setengah lebar mahkota, panjang kaki, jari-jari kawat, jari-jari alur landasan
const ZC0 = 15.2 - WR, DR0 = 17.2;                        // sumbu mahkota saat di wadah, dasar pisau saat diam
const LEVER = XS + 0.6 - HX;                              // jarak engsel -> pisau
const ZCF = PZ1 + WR;                                     // mahkota rebah di atas kertas
const EPSMAX = (DR0 - WR - ZCF) / LEVER;                  // sudut kepala relatif saat tekan penuh (rad)
const MAG_OPEN = deg(3.6);                                // wadah terangkat saat diam
const NSTRIP = 40;

// ---------- alas ----------
span(0, 150, -17, 17, 0, BASE_TOP, M.baseM, ST, 3);
span(0, 22, -12, 12, BASE_TOP - 1, 24, M.baseIn, ST, 2.5);                    // rumah engsel
for (const sy of [-1, 1]) { const f = mesh(cylZ(5, 5, 1.2, 20), cel('ink'), 0, 0, 0); f.position.set(sy > 0 ? 20 : 130, 0, 0.3); ST.add(f); }
const pin = mesh(new THREE.CylinderGeometry(2.1, 2.1, 27, 20), M.pin, HX, 0, HZ); ST.add(pin);
// per puntir di engsel (mengangkat kepala & wadah)
const torsion = new THREE.Group(); torsion.position.set(HX, 0, HZ); ST.add(torsion);
{ const pts = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * TAU * 4.5; pts.push(V(3.4 * Math.cos(a), -8 + 16 * i / 200, 3.4 * Math.sin(a))); }
  torsion.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.45, 6), M.torsion));
  torsion.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(3.4, 8, 0), V(14, 8, -6.5), V(30, 8, -9.6)]), 30, 0.45, 6), M.torsion)); }

// landasan berputar: dua pola alur (A = ke dalam di depan, B = ke luar di belakang), paku keling di tengah
const ANV = new THREE.Group(); ANV.position.set(XS - 6, 0, BASE_TOP); ST.add(ANV);
{ const s = new THREE.Shape(); s.absarc(6, 0, 11, -Math.PI / 2, Math.PI / 2, false); s.absarc(-6, 0, 11, Math.PI / 2, Math.PI * 1.5, false);
  ANV.add(mesh(extr(s, 0.6, 40), M.anvil, 0, 0, -0.52));
  ANV.add(mesh(new THREE.SphereGeometry(1.8, 16, 8, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.5), M.pin, 0, 0, 0.08));
  const cv = document.createElement('canvas'); cv.width = 680; cv.height = 440; const c = cv.getContext('2d'); const k = 20;   // 20 px/mm, 34 × 22 mm
  const X = x => 340 + x * k, Y = y => 220 - y * k;
  const dent = (x, y0, y1, dark) => {   // satu alur: lonjong, gelap di sisi dalam (dalam), terang di bibir
    const ya = Math.min(y0, y1), yb = Math.max(y0, y1), g = c.createLinearGradient(0, Y(y0), 0, Y(y1));
    g.addColorStop(0, dark); g.addColorStop(1, 'rgba(120,124,134,.35)');
    c.fillStyle = g; c.beginPath(); c.roundRect(X(x - 1.0), Y(yb), 2.0 * k, (yb - ya) * k, 0.9 * k); c.fill();
    c.strokeStyle = 'rgba(40,42,50,.75)'; c.lineWidth = 3; c.stroke(); };
  for (const sy of [-1, 1]) {
    dent(6, sy * (W2 + 0.5), sy * (W2 - 2 * RG - 0.9), 'rgba(40,42,52,.9)');    // pola A: ke dalam
    dent(-6, sy * (W2 - 0.5), sy * (W2 + 2 * RG + 1.4), 'rgba(40,42,52,.9)');   // pola B: ke luar
  }
  c.fillStyle = 'rgba(40,42,50,.55)'; c.font = '700 28px Helvetica Neue, Arial'; c.textAlign = 'center';
  c.fillText('▲', X(10.2), Y(0) + 10); c.fillText('▼', X(-10.2), Y(0) + 10);
  const tx = new THREE.CanvasTexture(cv); const pl = mesh(new THREE.PlaneGeometry(34, 22), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }), 0, 0, 0.1);
  pl.userData.decal = true; ANV.add(pl); }

// ---------- wadah (berengsel) ----------
const MAG = new THREE.Group(); MAG.position.set(HX, 0, HZ); ST.add(MAG);
const MAGI = new THREE.Group(); MAGI.position.set(-HX, 0, -HZ); MAG.add(MAGI);
const magWalls = [];
for (const sy of [-1, 1]) magWalls.push(span(20, 140.5, sy * 7.4 - 0.35, sy * 7.4 + 0.35, 8.8, 18.4, M.plateC, MAGI));
magWalls.push(span(20, 140.5, -7.75, 7.75, 18.4, 19.0, M.plateC, MAGI));
const rail = span(22, 136.8, -5.6, 5.6, 9.0, 14.3, M.plateC, MAGI);
const nose = span(138.1, 141.4, -8.4, 8.4, 8.8, 19.0, M.steelC, MAGI, 0.6);
for (const sy of [-1, 1]) span(12, 22, sy * 7.4 - 0.35, sy * 7.4 + 0.35, 14, 23, M.plateC, MAGI);
// barisan staples: mahkota + dua kaki, garis tiap 0,5 mm (lem)
const stripeTex = (() => { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 8; const c = cv.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 32, 8); c.fillStyle = 'rgba(60,64,74,.55)'; c.fillRect(0, 0, 5, 8);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const stripMat = cel('white'); stripMat.map = stripeTex;
const STRIP = new THREE.Group(); MAGI.add(STRIP);
const stripParts = [span(0, 1, -6.38, 6.38, ZC0 - WR, ZC0 + WR, stripMat, STRIP), ...[-1, 1].map(sy => span(0, 1, sy * W2 - WR, sy * W2 + WR, ZC0 - LEG, ZC0, stripMat, STRIP))];
const follower = new THREE.Group(); MAGI.add(follower);
span(-9, 0, -6.9, 6.9, 9.4, 16.2, M.follower, follower, 1.2); span(-5, -2, -2, 2, 16.2, 17.8, M.follower, follower, 0.6);
const pushSpring = new THREE.Group(); MAGI.add(pushSpring);
{ const pts = []; for (let i = 0; i <= 600; i++) { const a = i / 600 * TAU * 34; pts.push(V(i / 600, 1.3 * Math.cos(a), 16.9 + 1.3 * Math.sin(a))); }
  const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1200, 0.3, 5), M.spring); pushSpring.add(sp); }

// ---------- kepala (berengsel) + pisau ----------
const HEAD = new THREE.Group(); HEAD.position.set(HX, 0, HZ); ST.add(HEAD);
const HEADI = new THREE.Group(); HEADI.position.set(-HX, 0, -HZ); HEAD.add(HEADI);
{ const s = new THREE.Shape();
  s.moveTo(3, 21.5); s.lineTo(3, 27); s.quadraticCurveTo(8, 35.5, 40, 36.5); s.quadraticCurveTo(110, 38.5, 140, 32.5);
  s.quadraticCurveTo(150, 30, 151.5, 26.5); s.lineTo(151.5, 25.2); s.lineTo(16, 25.2); s.lineTo(12, 21.5); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 25, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.6, bevelSegments: 3, curveSegments: 32 });
  g.rotateX(Math.PI / 2).translate(0, 12.5, 0); HEADI.add(mesh(g, M.head)); }
// bantalan tekan + tulisan
{ const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '800 70px Helvetica Neue, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('26/6', 256, 66);
  const pl = mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }), 0, 0, 0);
  pl.position.set(78, 0, 38.85); pl.rotation.z = -Math.PI / 2; pl.rotation.x = 0.02; pl.userData.decal = true; HEADI.add(pl); }
const driver = span(XS + 0.35, XS + 0.85, -6.35, 6.35, DR0, DR0 + 11, M.driver, HEADI);
span(XS - 3, XS + 2, -7, 7, DR0 + 8, DR0 + 13, M.steelC, HEADI);                 // penjepit pisau di dalam kepala

// ---------- kertas (4 lembar) + staples yang tertancap ----------
const PC = [175, 0, PZ0 + 0.8];
const PAP = new THREE.Group(); ST.add(PAP);
const PIN = new THREE.Group(); PIN.position.set(-PC[0], -PC[1], -PC[2]); PAP.add(PIN);
const sheets = [];
for (let i = 0; i < 4; i++) { const s = span(120 + i * 0.6, 230 - i * 0.4, -45 + i * 0.5, 45 - i * 0.3, PZ0 + i * 0.4, PZ0 + i * 0.4 + 0.36, M.paper, PIN, 0.15);
  s.rotation.z = (i - 1.5) * 0.004; sheets.push(s); }
// lintasan kaki: lurus menembus kertas, lalu mengikuti alur setengah lingkaran (jari-jari RG), lalu rebah di bawah kertas
function legPts(zc, sy, dir) {
  const y0 = sy * W2, vert = zc - PZ0;
  if (vert >= LEG) return [[y0, zc], [y0, zc - LEG]];
  const pts = [[y0, zc], [y0, PZ0]], rest = LEG - vert;
  const arcL = Math.PI * RG, k = Math.min(rest, arcL), m = Math.max(2, Math.ceil(k / 0.2)), cy = y0 - sy * dir * RG;
  for (let i = 1; i <= m; i++) { const ph = (k * i / m) / RG; pts.push([cy + sy * dir * RG * Math.cos(ph), PZ0 - RG * Math.sin(ph)]); }
  if (rest > arcL) pts.push([cy - sy * dir * RG - sy * dir * (rest - arcL), PZ0]);
  return pts;
}
const bendDeg = zc => clamp((LEG - (zc - PZ0)) / (Math.PI * RG)) * 180;
const bentMM = zc => clamp(LEG - (zc - PZ0), 0, LEG);
function stapleGeo(zc, dir) {
  const raw = [...legPts(zc, -1, dir).reverse(), ...legPts(zc, 1, dir)], pts = [];
  for (let i = 0; i < raw.length; i++) {                  // pecah ruas panjang supaya sudut tetap tegas
    if (i) { const [a, b] = [raw[i - 1], raw[i]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.7);
      for (let j = 1; j < n; j++) pts.push(V(0, lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n))); }
    pts.push(V(0, raw[i][0], raw[i][1]));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), pts.length * 2, WR, 6);
}
const nextStaple = mesh(stapleGeo(ZC0, 1), M.staple, XS, 0, 0); MAGI.add(nextStaple);
nextStaple.material = cel('steel');

// ---------- pembantu waktu ----------
const pop = (t, s0) => (t > s0 && t < s0 + 0.42) ? Math.sin(Math.PI * (t - s0) / 0.42) : 0;
const LS = L;
// p: 0 diam, 0..0,35 wadah turun menyentuh kertas, 0,35..1 pisau turun (mahkota dari ZC0 ke ZCF)
const P = zc => 0.35 + 0.65 * clamp((DR0 - WR - zc) / (DR0 - WR - ZCF));
const pressKeys = [
  [0, 0], [T(0, 'ditekan') - 0.45, 0], [T(0, 'ditekan') + 0.12, 1], [T(0, 'dua') - 0.1, 1], [T(0, 'dua') + 0.25, 0],
  [T(5, 'menekan') - 0.1, 0], [T(5, 'turun') - 0.3, 0.35], [T(5, 'memutus') - 0.05, P(ZC0 + 0.02)], [T(5, 'memutus') + 0.3, P(ZC0 - 0.12)],
  [T(6, 'mendorongnya') - 0.1, P(ZC0 - 0.12)], [T(6, 'menembus') + 0.45, P(PZ0 + LEG - 0.03)], [T(8, 'menabrak') - 0.15, P(PZ0 + LEG - 0.03)],
  [T(8, 'mengunci') + 0.5, 1], [L[9].s + 0.2, 1], [L[9].s + 0.8, 0],
  [T(11, 'sekarang') - 0.4, 0], [T(11, 'kaki') - 0.1, 0.35], [T(11, 'menekuk') + 0.45, 1], [T(13, 'lepas') + 0.05, 1], [T(13, 'mengangkat') + 0.1, 0],
  [T(14, 'menekuk') - 0.55, 0], [T(14, 'menekuk') - 0.05, 1], [DUR - 1.3, 1], [DUR - 0.8, 0]];
const press = t => track(pressKeys, t);
const SHOTS = [[T(0, 'ditekan') - 0.4, T(0, 'dua') + 0.3], [T(5, 'menekan'), L[9].s + 0.9], [T(11, 'sekarang') - 0.4, T(13, 'mengangkat') + 0.2], [T(14, 'menekuk') - 0.6, DUR]];
const openKeys = [[0, 0], [L[10].s - 0.1, 0], [T(10, 'landasannya') + 0.2, 62], [T(11, 'sekarang') - 1.0, 62], [T(11, 'sekarang') - 0.45, 0], [DUR, 0]];
const anvFlipKeys = [[0, 0], [T(11, 'putar') - 0.05, 0], [T(11, 'setengah') + 0.6, 1], [DUR, 1]];
// kertas: [geser x, geser y, angkat, balik (0..1), tembus pandang]
const papKeys = [[0, [0, 0, 0, 0, 0]], [T(0, 'dua') + 0.25, [0, 0, 0, 0, 0]], [T(0, 'kakinya', 1) + 0.15, [92, 0, 26, 1, 0]], [T(1, 'menekuknya') + 0.3, [92, 0, 26, 1, 0]],
  [L[1].e - 0.6, [0, -22, 0, 0, 0]], [L[7].s + 1.2, [0, -22, 0, 0, 0]], [T(7, 'lihat'), [0, -22, 0, 0, 1]], [L[9].e, [0, -22, 0, 0, 1]], [L[10].s + 0.2, [0, -22, 0, 0, 0]],
  [T(10, 'landasannya'), [118, -22, 0, 0, 0]], [T(11, 'cekungannya') + 0.2, [118, -22, 0, 0, 0]], [T(11, 'sekarang') - 0.5, [0, 22, 0, 0, 0]],
  [L[13].e + 0.2, [0, 22, 0, 0, 0]], [L[14].s + 0.3, [-14, 0, 0, 0, 0]], [DUR, [-14, 0, 0, 0, 0]]];
const SHOTPOS = SHOTS.map(([a]) => track(papKeys, a + 0.01));
const anvDirAt = t => (track(anvFlipKeys, t) > 0.5 ? -1 : 1);
// mahkota tiap tembakan = dasar pisau terendah yang pernah dicapai selama jendelanya (staples tidak naik lagi)
const DTs = 1 / 120;
const ZCS = SHOTS.map(([a, b]) => { const n = Math.ceil((b - a) / DTs) + 2, arr = new Float32Array(n); let m = ZC0;
  for (let i = 0; i < n; i++) { const p = press(a + i * DTs); m = Math.min(m, DR0 - WR - EPSMAX * LEVER * clamp((p - 0.35) / 0.65)); arr[i] = Math.max(ZCF, m); } return arr; });
const zcAt = (k, t) => { const [a, b] = SHOTS[k]; if (t < a) return ZC0; const arr = ZCS[k]; return arr[Math.min(arr.length - 1, Math.round((t - a) / DTs))]; };
const shotStarted = (k, t) => zcAt(k, t) < ZC0 - 0.01;
const shotStapleGeoCache = SHOTS.map(() => ({ key: '', geo: null }));
const shotStaples = SHOTS.map((s, k) => { const m = new THREE.Mesh(stapleGeo(ZC0, 1), cel('steel')); PIN.add(m); m.visible = false; return m; });

// kamera (koordinat lokal stapler): [x, y, z, tinggi pandang, kemiringan 0 = mata elang .. 1 = isometrik]
const camKeys = [
  [0, [120, 0, 0, 900, 0.1]], [T(0, 'perhatikan'), [140, 0, 10, 300, 0.75]], [T(0, 'di'), [105, 0, 16, 200, 1.4]], [T(0, 'kakinya'), [125, 0, 14, 120, 1.5]],
  [T(0, 'tapi'), [120, 0, 14, 210, 1.1]], [T(0, 'dua'), [170, 0, 20, 220, 1]], [T(0, 'kakinya', 1) + 0.3, [229, 0, 32, 46, 0.55]], [T(1, 'menekuknya') + 0.3, [229, 0, 32, 42, 0.55]],
  [L[1].e - 0.5, [100, 0, 16, 230, 1.2]], [L[2].s, [85, 0, 16, 230, 1.4]], [T(2, 'wadah'), [95, 0, 14, 200, 1.5]], [T(2, 'per'), [70, 0, 14, 170, 1.5]],
  [T(2, 'pisau'), [130, 0, 16, 110, 1.5]], [T(2, 'landasan'), [132, 0, 8, 110, 1.2]], [L[3].s, [110, 0, 14, 130, 1.5]], [T(3, 'per'), [90, 0, 14, 150, 1.5]],
  [L[4].s, [128, 0, 14, 100, 1.5]], [L[4].e, [134, 0, 13, 72, 1.55]], [L[5].s, [128, 0, 15, 110, 1.5]], [T(5, 'memutus'), [136, 0, 13, 60, 1.55]],
  [L[6].s, [136, 0, 12, 66, 1.55]], [T(6, 'menembus'), [137, 0, 10, 60, 1.5]], [L[7].s, [137, 0, 9, 58, 1.55]], [T(7, 'lihat'), [137, 0, 8, 46, 1.6]],
  [L[8].s, [137, 0, 8, 42, 1.6]], [L[9].s, [137, 0, 9, 70, 1.4]], [L[9].e, [130, 0, 12, 130, 1.2]],
  [L[10].s + 0.6, [131, 0, 7, 64, 0.45]], [L[11].e - 0.6, [131, 0, 7, 64, 0.45]], [L[12].s, [134, 0, 10, 100, 1.1]], [L[12].e, [128, 0, 12, 140, 1.3]],
  [L[13].s, [105, 0, 18, 200, 1.4]], [T(13, 'staples'), [122, 0, 14, 120, 1.5]], [L[13].e, [110, 0, 16, 200, 1.4]],
  [L[14].s, [100, 0, 16, 230, 1.3]], [T(14, 'pemotong'), [132, 0, 16, 110, 1.5]], [T(14, 'pendorong'), [85, 0, 16, 160, 1.5]], [T(14, 'landasan'), [132, 0, 8, 110, 1.2]],
  [T(14, 'menekuk') - 0.4, [120, 0, 14, 260, 1.1]], [DUR, [140, 0, 0, 760, 0.3]]];
const cutKeys = [[0, 0], [T(0, 'di') - 0.1, 0], [T(0, 'di') + 0.4, 1], [T(0, 'lurus') + 0.5, 1], [T(0, 'tapi') + 0.2, 0],
  [T(1, 'bongkar') - 0.1, 0], [T(1, 'bongkar') + 0.55, 1], [T(14, 'menekuk') - 0.7, 1], [T(14, 'menekuk') - 0.2, 0]];

// callout
const tagDefs = [];
const tagAdd = (s, e, text, anchor, side = 'r', cls = '') => tagDefs.push({ s, e, text, anchor, side, cls });
const AT = (obj, x = 0, y = 0, z = 0) => () => obj.localToWorld(V(x, y, z));
tagAdd(T(0, 'kakinya') - 0.2, T(0, 'tapi'), 'Kaki lurus', AT(STRIP, -2, -W2, ZC0 - 3), 'r', 'hi');
tagAdd(T(0, 'kakinya', 1) - 0.1, T(1, 'ada', 1), 'Menekuk ke dalam', () => PIN.localToWorld(V(XS, 0, PZ0 - 0.5)), 'r', 'hi');
tagAdd(T(2, 'wadah'), T(2, 'per') - 0.1, 'Wadah staples', AT(MAGI, 80, -7.4, 18), 'r', 'hi');
tagAdd(T(2, 'per'), T(2, 'pisau') - 0.1, 'Per pendorong', AT(pushSpring, 0.5, 0, 17), 'r', 'hi');
tagAdd(T(2, 'pisau'), T(2, 'landasan') - 0.1, 'Pisau tipis', AT(HEADI, XS + 0.6, 0, DR0 + 4), 'r', 'hi');
tagAdd(T(2, 'landasan'), L[2].e + 0.2, 'Landasan', AT(ANV, 6, -9, 0.2), 'r', 'hi');
tagAdd(T(3, 'berjajar'), T(3, 'per') - 0.1, 'Ditempel lem tipis', AT(STRIP, 0.6, -6.4, ZC0 + 0.2), 'l', '');
tagAdd(T(3, 'per'), L[3].e + 0.2, 'Mendorong ke depan', AT(follower, -4, 0, 17.8), 'l', 'hi');
tagAdd(T(4, 'satu'), L[4].e + 0.2, 'Siap di bawah pisau', AT(MAGI, XS, -W2, ZC0), 'l', 'hi');
tagAdd(T(5, 'memutus') + 0.1, L[5].e + 0.3, 'Lem putus', AT(MAGI, XS - 0.3, -W2, ZC0 - 0.8), 'l', 'warn');
tagAdd(T(6, 'menembus'), L[6].e + 0.5, 'Menembus kertas', () => PIN.localToWorld(V(XS, 22 - W2, PZ1)), 'l', '');
tagAdd(T(7, 'cekungan') - 0.1, L[7].e + 0.3, 'Dua cekungan', AT(ANV, 6, -W2 + 1, 0.2), 'r', 'hi');
tagAdd(T(10, 'diputar') - 0.2, T(11, 'putar'), 'Landasan berputar', AT(ANV, 0, 0, 0.6), 'r', '');
tagAdd(T(11, 'cekungannya'), T(11, 'sekarang') - 0.6, 'Pola ke luar', AT(ANV, 6, W2 + 2, 0.2), 'r', 'hi');
tagAdd(T(13, 'per'), T(13, 'staples') - 0.1, 'Per puntir', AT(torsion, 0, -8, 3.4), 'r', 'hi');
tagAdd(T(13, 'staples'), L[13].e + 0.2, 'Staples berikutnya', AT(MAGI, XS, -W2, ZC0), 'l', 'hi');
tagAdd(T(14, 'pemotong'), T(14, 'pendorong') - 0.1, 'Pemotong', AT(HEADI, XS + 0.6, 0, DR0 + 4), 'r', 'hi');
tagAdd(T(14, 'pendorong'), T(14, 'landasan') - 0.1, 'Pendorong', AT(follower, -4, 0, 17.8), 'r', 'hi');
tagAdd(T(14, 'landasan'), T(14, 'menekuk') - 0.8, 'Landasan', AT(ANV, 6, -9, 0.2), 'r', 'hi');

const titleDefs = [
  [0, '', 'Kaki lurus, kok <em>bisa menekuk?</em>'],
  [L[1].s, '', 'Nggak ada yang <em>menekuknya?</em>'],
  [L[2].s, 'Babak 1 · Bagian', '<em>4 bagian</em> penting'],
  [L[3].s, 'Babak 1 · Wadah', 'Berjajar, <em>didorong per</em>'],
  [L[5].s, 'Babak 2 · Tekan', 'Pisau <em>memutus</em> satu staples'],
  [L[7].s, 'Babak 3 · Rahasia', 'Rahasianya di <em>landasan</em>'],
  [L[8].s, 'Babak 3 · Rahasia', 'Cekungan <em>membelokkan</em> kaki'],
  [L[9].s, 'Babak 3 · Rahasia', 'Bukan tekanan, tapi <em>bentuk</em>'],
  [L[10].s, 'Bonus · Landasan', 'Kenapa <em>bisa diputar?</em>'],
  [L[12].s, 'Bonus · Landasan', 'Staples <em>sementara</em>'],
  [L[13].s, 'Babak 4 · Kembali', 'Per <em>mengangkat</em> kepala'],
  [L[14].s, '', 'Pemotong · pendorong · <em>landasan</em>'],
];
const RED = '#e5484d', GRN = '#30a46c', GRY = '#8a8a8f', YEL = '#ffe259';
const chipDefs = [[0, 'Kaki lurus', GRY], [T(0, 'ditekan'), 'Ditekan', YEL], [L[1].s, 'Misteri', GRY], [T(1, 'bongkar'), 'Dibelah', YEL], [L[5].s, 'Tekan pelan', YEL],
  [L[7].s, 'Landasan', YEL], [L[10].s, 'Pola ke dalam', GRN], [T(11, 'putar') + 0.6, 'Pola ke luar', RED], [L[13].s, 'Lepas', GRN], [L[14].s, 'Siap', GRN]];
const stampDefs = [
  [T(0, 'menekuk'), L[0].e + 0.3, 'Menekuk sendiri?', ''],
  [T(1, 'bongkar'), L[1].e + 0.4, 'Kita bongkar!', 'snd'],
  [T(6, 'menembus') + 0.2, L[6].e + 0.3, 'Tembus!', 'snd'],
  [T(8, 'mengunci') + 0.3, L[8].e + 0.4, 'Terkunci!', 'snd'],
  [T(11, 'luar'), L[11].e + 0.4, 'Ke luar!', 'snd'],
  [T(13, 'siap'), L[13].e + 0.35, 'Siap lagi!', 'snd'],
];
const shakeAt = [T(0, 'ditekan') + 0.12, T(1, 'bongkar'), T(8, 'mengunci') + 0.3, T(14, 'menekuk') - 0.05];

// ---------- caption karaoke ----------
const chunks = [];
for (let li = 0; li < NL; li++) {
  let cur = [];
  const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => { cur.push(w); if (/[.?!:…]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 6 || i === ws.length - 1) { chunks.push(cur); cur = []; } });
}
const allW = chunks.flat();
allW.forEach((w, i) => (w.next = i + 1 < allW.length ? allW[i + 1].s : DUR));
chunks.forEach((c, i) => { c.s = c[0].s - 0.06; c.e = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.06 : DUR; });

// ---------- model per waktu ----------
const S = { t: 0, p: 0, drive: 0, n: NSTRIP, zc: ZC0, shot: -1 };
const tmpN = new THREE.Vector3();
function updateModel(t) {
  S.t = t;
  root.rotation.y = -0.38 + 0.04 * Math.sin(t * 0.33);
  const p = S.p = press(t);
  // pegas balik: sedikit memantul setelah dilepas
  let bounce = 0; for (const [a, b] of SHOTS) { const r = b - 0.1; if (t > r && t < r + 0.9) bounce = Math.max(bounce, Math.sin((t - r) * 14) * Math.exp(-(t - r) * 6) * 0.35); }
  const magA = MAG_OPEN * (1 - smooth(0, 0.35, p)) + deg(bounce) + deg(track(openKeys, t)), eps = EPSMAX * clamp((p - 0.35) / 0.65);
  MAG.rotation.y = -magA; HEAD.rotation.y = -magA + eps;
  torsion.rotation.y = -magA * 0.5;
  S.drive = eps * LEVER;
  // staples di wadah: jumlah = 40 - tembakan yang sudah lepas; pengikut menyusul di belakang barisan
  let shot = -1, fired = 0; SHOTS.forEach((s, k) => { if (shotStarted(k, t)) { fired++; if (t < s[1] + 0.2) shot = k; } });
  S.n = NSTRIP - fired; S.shot = shot;
  const driverLow = DR0 - eps * LEVER < ZC0 + WR + 0.3;
  const frontX = XS - 0.25, nBehind = S.n - 1, Ls = Math.max(0.5, nBehind * 0.5);
  STRIP.position.x = frontX - 0.5 - Ls; STRIP.scale.x = Ls;
  stripeTex.repeat.set(nBehind, 1);
  nextStaple.visible = !driverLow || shot < 0;
  const fx = STRIP.position.x; follower.position.x = fx;
  const sl = fx - 9 - 24; pushSpring.position.x = 24; pushSpring.scale.x = Math.max(1, sl);
  // staples yang ditembakkan: bentuk dari mahkota + arah alur landasan saat itu
  SHOTS.forEach(([a], k) => {
    const m = shotStaples[k], vis = shotStarted(k, t); m.visible = vis; if (!vis) return;
    const zc = zcAt(k, t), dir = anvDirAt(a + 0.02), key = zc.toFixed(3) + dir;
    if (shotStapleGeoCache[k].key !== key) { m.geometry.dispose(); m.geometry = stapleGeo(zc, dir); shotStapleGeoCache[k].key = key; }
    const sp = SHOTPOS[k]; m.position.set(XS - sp[0], -sp[1], 0);
    if (k === shot) S.zc = zc;
  });
  if (shot < 0) S.zc = ZC0;
  // landasan berputar
  ANV.rotation.z = Math.PI * easeIO(track(anvFlipKeys, t));
  // kertas: geser, angkat, balik, tembus pandang
  const [ox, oy, lift, fl, xr] = track(papKeys, t);
  PAP.position.set(PC[0] + ox, PC[1] + oy, PC[2] + lift); PAP.rotation.x = Math.PI * fl;
  M.paper.opacity = 1 - 0.68 * xr; M.paper.depthWrite = xr < 0.05;
  // belah: bidang lokal y = q, sisi dekat kamera dibuang
  const c = easeIO(track(cutKeys, t)), q = lerp(-40, 0.3, c);
  ST.updateMatrixWorld(true);
  tmpN.set(0, 1, 0).transformDirection(ST.matrixWorld);
  cutPlane.setFromNormalAndCoplanarPoint(tmpN, ST.localToWorld(V(0, q, 0)));
  // sorotan
  const hl = (m, k, pal = 'yellow') => m.hl(pal, k);
  hl(M.plateC, Math.max(hlw(t, T(2, 'wadah'), T(2, 'per')), 0) * 0.55);
  hl(M.spring, Math.max(hlw(t, T(2, 'per'), T(2, 'pisau')), hlw(t, T(3, 'per'), L[3].e), hlw(t, T(14, 'pendorong'), T(14, 'landasan'))) * 0.8);
  hl(M.follower, Math.max(hlw(t, T(2, 'per'), T(2, 'pisau')), hlw(t, T(3, 'per'), L[3].e), hlw(t, T(14, 'pendorong'), T(14, 'landasan'))) * 0.6);
  hl(M.driver, Math.max(hlw(t, T(2, 'pisau'), T(2, 'landasan')), hlw(t, T(5, 'pisau'), T(5, 'ia')), hlw(t, T(14, 'pemotong'), T(14, 'pendorong'))) * 0.7);
  hl(M.anvil, Math.max(hlw(t, T(2, 'landasan'), L[2].e), hlw(t, T(7, 'landasan'), L[7].e), hlw(t, T(14, 'landasan'), T(14, 'menekuk') - 0.8)) * 0.6);
  hl(nextStaple.material, Math.max(hlw(t, T(4, 'satu'), L[4].e), hlw(t, T(13, 'staples'), L[13].e)) * 0.85);
  hl(stripMat, hlw(t, T(3, 'staplesnya'), T(3, 'per')) * 0.5);
  hl(M.torsion, hlw(t, T(13, 'per'), T(13, 'staples')) * 0.85);
  shotStaples.forEach((m, k) => m.material.hl('yellow', k === 1 ? hlw(t, L[6].s, L[8].e) * 0.6 : 0));
}

const tmpV = new THREE.Vector3();
function updateCamera(t) {
  const c = window.CAM_OVERRIDE || track(camKeys, t);
  const drift = 1 - 0.012 * Math.sin(t * 0.7);
  const h = c[3] * drift, tilt = c[4] ?? 1;
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -h * W / H / 2; camera.right = h * W / H / 2;
  base.updateMatrixWorld(true);
  const target = ST.localToWorld(tmpV.set(c[0], c[1], c[2]));
  const dir = (tilt <= 1 ? V(0.05, 1, 0.05).normalize().lerp(V(1, 1.7, 1).normalize(), tilt) : V(1, 1.7, 1).normalize().lerp(V(1, 0.5, 1).normalize(), tilt - 1)).normalize();
  const dist = 3000 + h * 2;
  camera.near = 10; camera.far = dist + h * 3 + 3000;
  edge.mat.uniforms.far.value = camera.far - camera.near;
  const sb = Math.max(60, h * 0.9);
  sun.target.position.copy(target); sun.position.copy(target).addScaledVector(V(0.25, 1, 0.85).normalize(), sb * 3 + 200);
  Object.assign(sun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: sb * 6 + 600 }); sun.shadow.camera.updateProjectionMatrix();
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.up.copy(V(-1, 0, -1).normalize().lerp(V(0, 1, 0), smooth(0, 0.6, tilt)).normalize());
  camera.lookAt(target);
  camera.updateMatrixWorld();
  camera.position.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), -h * 0.08);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  let sh = 0; for (const s of shakeAt) if (t > s && t < s + 0.4) sh = Math.max(sh, 1 - (t - s) / 0.4);
  $('shake').style.transform = sh ? `translate(${(Math.sin(t * 91) * 14 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 10 * sh).toFixed(1)}px)` : '';
}
function project(v) { const p = (v.isVector3 ? v.clone() : v).project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }

// ---------- overlay ----------
const card = document.createElement('div'); card.className = 'ov'; card.id = 'card';
card.style.cssText = 'left:64px;right:64px;top:1150px;height:360px;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);border:1px solid rgba(22,23,27,.12);border-radius:26px;box-shadow:0 18px 50px rgba(22,23,27,.18);overflow:hidden;opacity:0';
card.innerHTML = '<div id="cardK" style="position:absolute;left:24px;top:18px;font:700 17px ui-monospace,Menlo;letter-spacing:.14em;color:#6c6e76"></div><svg id="cardS" viewBox="0 0 952 360" style="position:absolute;inset:0;width:100%;height:100%"></svg>';
$('stage').insertBefore(card, $('cap'));
const tagEls = tagDefs.map(d => { const el = document.createElement('div'); el.className = 'tag ' + d.cls; el.innerHTML = `<span>${d.text}</span>`; $('tags').appendChild(el); return el; });
const arrowSVG = (x0, y0, x1, y1, col, w = 8) => { const a = Math.atan2(y1 - y0, x1 - x0), h = w * 3.2;
  return `<line x1="${x0}" y1="${y0}" x2="${x1 - Math.cos(a) * h * 0.8}" y2="${y1 - Math.sin(a) * h * 0.8}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${x1} ${y1} L${x1 - Math.cos(a - .45) * h} ${y1 - Math.sin(a - .45) * h} L${x1 - Math.cos(a + .45) * h} ${y1 - Math.sin(a + .45) * h} Z" fill="${col}"/>`; };
const F = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
const txt = (x, y, str, col = '#16171b', sz = 24, anc = 'middle', wt = 800) => `<text x="${x}" y="${y}" text-anchor="${anc}" paint-order="stroke" stroke="#f8f8f5" stroke-width="7" stroke-linejoin="round" ${F} font-weight="${wt}" font-size="${sz}" fill="${col}">${str}</text>`;
// irisan landasan (tampak depan, sumbu y mendatar): landasan + alur, kertas, staples dari legPts yang sama dengan 3D
function sectionSVG(cx, zc, dir, sc, opts = {}) {
  const X = y => cx + y * sc, Y = z => (opts.base ?? 318) - (z - 4.6) * sc;
  let s = '';
  // landasan dengan dua alur setengah lingkaran (atau rata)
  const yL = -14, yR = 14; let d = `M${X(yL)} ${Y(BASE_TOP)}`;
  const grooves = opts.flat ? [] : [-1, 1].map(sy => { const c0 = sy * W2 - sy * dir * RG; return [c0 - RG, c0 + RG, c0]; }).sort((a, b) => a[0] - b[0]);
  for (const [g0, g1, gc] of grooves) { d += ` L${X(g0)} ${Y(BASE_TOP)}`; for (let i = 0; i <= 16; i++) { const ph = Math.PI + Math.PI * i / 16; d += ` L${X(gc + RG * Math.cos(ph)).toFixed(1)} ${Y(BASE_TOP + RG * Math.sin(ph)).toFixed(1)}`; } }
  d += ` L${X(yR)} ${Y(BASE_TOP)} L${X(yR)} ${Y(4.6)} L${X(yL)} ${Y(4.6)} Z`;
  s += `<path d="${d}" fill="#b4b6bd" stroke="#16171b" stroke-width="4" stroke-linejoin="round"/>`;
  if (opts.hlG) for (const [g0, g1, gc] of grooves) s += `<circle cx="${X(gc)}" cy="${Y(BASE_TOP)}" r="${RG * sc + 10}" fill="none" stroke="#e8b400" stroke-width="5" opacity="${opts.hlG.toFixed(2)}"/>`;
  // kertas (4 lembar) dengan lubang tembus kaki
  const pTop = Y(PZ1), pBot = Y(PZ0);
  s += `<rect x="${X(-13.5)}" y="${pTop}" width="${27 * sc}" height="${pBot - pTop}" fill="#fff" stroke="#16171b" stroke-width="3"/>`;
  for (let i = 1; i < 4; i++) s += `<line x1="${X(-13.5)}" y1="${lerp(pTop, pBot, i / 4)}" x2="${X(13.5)}" y2="${lerp(pTop, pBot, i / 4)}" stroke="#d8d4c6" stroke-width="2"/>`;
  // staples
  let path;
  if (opts.flat && zc < PZ0 + LEG) {   // tanpa alur: ujung kaki tertahan lalu melengkung sembarangan
    const over = PZ0 + LEG - zc, legs = [-1, 1].map(sy => { const y0 = sy * W2; const pts = [[y0, zc], [y0, PZ0 + 0.1]];
      const k = Math.min(over, 4); pts.push([y0 + sy * 0.6 * k * 0.4, PZ0 - 0.1 + 0.05], [y0 - sy * 0.4 * k * 0.3, PZ0 + 0.0]); return pts; });
    path = [...legs[0].reverse(), ...legs[1]];
  } else path = [...legPts(zc, -1, dir).reverse(), ...legPts(zc, 1, dir)];
  const pd = path.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(' ');
  s += `<path d="${pd}" fill="none" stroke="#16171b" stroke-width="${2 * WR * sc + 5}" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="${pd}" fill="none" stroke="${opts.col || '#e3e4e8'}" stroke-width="${2 * WR * sc - 1}" stroke-linejoin="round" stroke-linecap="round"/>`;
  // pisau di atas mahkota
  if (opts.driver) { const db = Y(zc + WR); if (db > 40) s += `<rect x="${X(-6.35)}" y="${Math.max(40, db - 200)}" width="${12.7 * sc}" height="${Math.min(200, db - 40)}" fill="#d4d6dc" stroke="#16171b" stroke-width="3" opacity=".92"/>`; }
  return s;
}
let lastTitle = -1, lastChunk = -1, lastStamp = -1;
function updateOverlay(t) {
  let ti = 0; titleDefs.forEach((d, i) => { if (t >= d[0]) ti = i; });
  const tEl = $('title');
  if (ti !== lastTitle) { tEl.innerHTML = titleDefs[ti][2]; lastTitle = ti; }
  const t0 = titleDefs[ti][0], hold = ti === 0 ? 4.4 : 3.0, tin = clamp((t - t0) / 0.45), tout = clamp((t - t0 - hold) / 0.45);
  tEl.style.opacity = (Math.min(1, tin * 1.6) * (1 - tout)).toFixed(3);
  tEl.style.transform = `translateY(${(30 * Math.pow(1 - tin, 3) - 18 * tout).toFixed(1)}px)`;
  tEl.style.clipPath = `inset(0 ${(100 * (1 - easeIO(tin))).toFixed(1)}% 0 0)`;
  $('chap').textContent = titleDefs[ti][1] || 'Kita bongkar · Stapler';
  const segs = [[0, L[2].s], [L[2].s, L[5].s], [L[5].s, L[7].s], [L[7].s, L[10].s], [L[10].s, L[13].s], [L[13].s, DUR]];
  const prog = $('prog');
  if (!prog.children.length) segs.forEach(() => { const i2 = document.createElement('i'); i2.appendChild(document.createElement('b')); prog.appendChild(i2); });
  segs.forEach(([a, b], k) => (prog.children[k].firstChild.style.transform = `scaleX(${clamp((t - a) / (b - a)).toFixed(4)})`));
  // angka dari model
  let rn, ru;
  const inAnvil = (t >= L[7].s && t < L[10].s) || (t >= L[11].s && t < L[13].s);
  if ((t >= L[3].s && t < L[5].s) || (t >= T(13, 'staples') - 0.3 && t < L[14].s)) { rn = String(S.n); ru = 'staples tersisa'; }
  else if (inAnvil && S.shot >= 0) { rn = bentMM(S.zc).toFixed(1).replace('.', ',') + ' mm'; ru = 'kaki ditekuk alur'; }
  else { rn = S.drive.toFixed(1).replace('.', ',') + ' mm'; ru = 'pisau turun'; }
  $('rn').textContent = rn; $('ru').textContent = ru;
  let ci = 0; chipDefs.forEach((d, i) => { if (t >= d[0]) ci = i; });
  const chip = $('chip'); chip.textContent = chipDefs[ci][1]; chip.style.setProperty('--dot', chipDefs[ci][2] === YEL ? '#e8b400' : chipDefs[ci][2]);
  // callout
  let svg = '';
  tagDefs.forEach((d, i) => {
    const el = tagEls[i];
    if (t < d.s || t > d.e + 0.2) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const [x, y] = project(d.anchor());
    const w = el.offsetWidth, h = el.offsetHeight, dx = d.side === 'r' ? 1 : -1;
    const lx = clamp(x + dx * 96, 40 + (dx < 0 ? w : 0), W - 40 - (dx > 0 ? w : 0)), ly = clamp(y - 96, 300, 1100);
    const p = clamp((t - d.s) / 0.35), o = clamp((t - d.e) / 0.2), ep = easeIO(p);
    el.style.left = (dx > 0 ? lx : lx - w) + 'px'; el.style.top = (ly - h / 2) + 'px';
    el.style.opacity = (clamp((p - 0.45) / 0.4) * (1 - o)).toFixed(3);
    el.style.transform = `translateX(${(dx * 12 * (1 - ep)).toFixed(1)}px)`;
    const col = d.cls === 'warn' ? RED : (d.cls === 'hi' ? '#e8b400' : '#16171b');
    const ex = lerp(x, lx, clamp(p / 0.6)), ey = lerp(y, ly, clamp(p / 0.6)), a = (1 - o).toFixed(3);
    svg += `<g opacity="${a}"><circle cx="${x}" cy="${y}" r="${(16 * ep).toFixed(1)}" fill="none" stroke="${col}" stroke-width="3" opacity=".5"/><circle cx="${x}" cy="${y}" r="7" fill="${col}" stroke="#fff" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" stroke="#16171b" stroke-width="2.5"/></g>`;
  });
  // panah gaya: tekan jari di kepala, dorongan per pendorong
  const pushK = Math.max(hlw(t, T(5, 'menekan') - 0.2, T(5, 'ia')), hlw(t, T(0, 'ditekan') - 0.5, T(0, 'dua')));
  if (pushK > 0.02) { const [hx, hy] = project(HEADI.localToWorld(V(120, 0, 38))); const pu = 0.85 + 0.15 * Math.sin(t * 7);
    svg += `<g opacity="${pushK.toFixed(3)}">${arrowSVG(hx, hy - 150 * pu, hx, hy - 12, '#16171b', 12)}</g>`; }
  const sprK = Math.max(hlw(t, T(3, 'per'), L[3].e), hlw(t, T(13, 'maju') - 0.4, L[13].e));
  if (sprK > 0.02) { const [ax, ay] = project(follower.localToWorld(V(-30, 0, 13))), [bx, by] = project(follower.localToWorld(V(1, 0, 13))); const pu = 0.5 + 0.5 * Math.sin(t * 7);
    svg += `<g opacity="${sprK.toFixed(3)}">${arrowSVG(ax + (bx - ax) * 0.15 * pu, ay + (by - ay) * 0.15 * pu, bx + (bx - ax) * 0.25, by + (by - ay) * 0.25, '#e8b400', 14)}</g>`; }
  const liftK = hlw(t, T(13, 'per'), T(13, 'staples'));
  if (liftK > 0.02) { const [hx, hy] = project(HEADI.localToWorld(V(110, 0, 40))); svg += `<g opacity="${liftK.toFixed(3)}">${arrowSVG(hx, hy - 10, hx, hy - 150, GRN, 12)}</g>`; }
  $('dim').innerHTML = svg;
  // stempel
  let si = -1; stampDefs.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const st = $('stamp');
  if (si !== lastStamp) { st.innerHTML = si < 0 ? '' : `<span class="${stampDefs[si][3]}">${stampDefs[si][2]}</span>`; lastStamp = si; }
  if (si >= 0) { const d = stampDefs[si], sp = st.firstChild; const pin2 = (t - d[0]) / 0.3, pout = clamp((t - d[1]) / 0.3);
    sp.style.opacity = clamp((t - d[0]) / 0.12) * (1 - pout); sp.style.transform = `rotate(-4deg) scale(${(lerp(1.35, 1, backOut(pin2)) * lerp(1, 0.94, pout)).toFixed(3)})`; }
  // kartu: irisan landasan (babak 7-9), pola ke luar (babak 11-12)
  const secOn = hlw(t, T(7, 'lihat') - 0.2, L[9].e + 0.1), outOn = hlw(t, T(11, 'cekungannya') - 0.2, L[12].e + 0.2);
  const co = Math.max(secOn, outOn);
  card.style.opacity = co.toFixed(3); card.style.transform = `translateY(${(26 * (1 - co)).toFixed(1)}px)`;
  if (secOn > 0.01) {
    if (t < L[9].s) {
      $('cardK').textContent = 'IRISAN LANDASAN · TAMPAK DEPAN';
      const zc = S.shot === 1 ? S.zc : zcAt(1, t), hlG = hlw(t, T(7, 'cekungan') - 0.2, L[8].s + 0.3);
      let s = sectionSVG(476, zc, 1, 25, { driver: true, hlG, base: 352 });
      const bd = Math.round(bendDeg(zc));
      if (t > T(8, 'menabrak') - 0.3 && bd > 2 && bd < 178) for (const sy of [-1, 1]) {   // panah arah ujung kaki di alur
        const ph = Math.min(Math.PI, (LEG - (zc - PZ0)) / RG), c0 = sy * W2 - sy * RG, yy = c0 + sy * RG * Math.cos(ph), zz = PZ0 - RG * Math.sin(ph);
        const tx2 = -sy * Math.sin(ph), tz = -Math.cos(ph), X0 = 476 + yy * 25, Y0 = 352 - (zz - 4.6) * 25;
        s += arrowSVG(X0 - tx2 * 10, Y0 + tz * 10, X0 + tx2 * 46, Y0 - tz * 46, '#e8b400', 6);
      }
      s += txt(40, 100, bd > 2 ? `kaki digiring alur · ${bentMM(zc).toFixed(1).replace('.', ',')} mm` : 'cekungan melengkung', bd > 2 ? '#16171b' : '#b07d00', 26, 'start');
      if (hlG > 0.1) s += txt(476 - W2 * 25 - 40, 336, 'cekungan', '#b07d00', 24, 'end') + txt(476 + W2 * 25 + 40, 336, 'cekungan', '#b07d00', 24, 'start');
      $('cardS').innerHTML = s;
    } else {
      $('cardK').textContent = 'HASIL · DENGAN CEKUNGAN vs RATA';
      const k = clamp((t - L[9].s - 0.2) / 1.6);
      let s = sectionSVG(250, ZCF, 1, 11.5, { base: 300 }) + sectionSVG(706, lerp(PZ0 + LEG, ZCF, easeIO(k)), 1, 11.5, { base: 300, flat: true, col: '#f3b0b2' });
      s += txt(250, 92, 'dengan cekungan', GRN, 26) + txt(250, 124, 'rapi, mengunci', '#6c6e76', 20, 'middle', 700) +
        txt(706, 92, 'landasan rata', RED, 26) + txt(706, 124, 'bengkok sembarangan', '#6c6e76', 20, 'middle', 700) +
        `<line x1="476" y1="70" x2="476" y2="330" stroke="#16171b" stroke-width="2" opacity=".15"/>`;
      $('cardS').innerHTML = s;
    }
  } else if (outOn > 0.01) {
    if (t < L[12].s) {
      $('cardK').textContent = 'IRISAN LANDASAN · POLA KE LUAR';
      const zc = S.shot === 2 ? S.zc : (t < SHOTS[2][0] ? PZ0 + LEG + 2 : zcAt(2, t)), bd = Math.round(bendDeg(zc));
      let s = sectionSVG(476, Math.min(zc, ZC0), -1, 25, { base: 352, driver: true, hlG: hlw(t, T(11, 'cekungannya'), T(11, 'sekarang')) });
      s += txt(40, 100, bd > 2 ? `ke luar · ${bentMM(zc).toFixed(1).replace('.', ',')} mm` : 'cekungannya berubah arah', bd > 2 ? '#16171b' : '#b07d00', 26, 'start');
      $('cardS').innerHTML = s;
    } else {
      $('cardK').textContent = 'PERMANEN vs SEMENTARA';
      const k = clamp((t - T(12, 'gampang') + 0.1) / 0.9), lift = 2.6 * easeIO(k);
      // kanan: staples ke luar ditarik ke atas, kaki lurus kembali keluar dari kertas
      const right = (() => { const zc = ZCF + lift * 3.2; return sectionSVG(706, zc, -1, 11.5, { base: 300 }); })();
      let s = sectionSVG(250, ZCF, 1, 11.5, { base: 300 }) + right;
      s += txt(250, 92, 'ke dalam · permanen', GRN, 26) + txt(706, 92, 'ke luar · sementara', '#b07d00', 26);
      if (k > 0.05) s += arrowSVG(706, 210, 706, 140, GRN, 8) + txt(700, 140, 'gampang dicabut', GRN, 22, 'end');
      s += `<line x1="476" y1="70" x2="476" y2="330" stroke="#16171b" stroke-width="2" opacity=".15"/>`;
      $('cardS').innerHTML = s;
    }
  }
  // subtitle
  const ci2 = chunks.findIndex(c => t >= c.s && t < c.e);
  const cap = $('cap');
  if (ci2 !== lastChunk) { cap.innerHTML = ci2 < 0 ? '' : `<span class="pill">${chunks[ci2].map(w => `<b>${w.w}</b>`).join(' ')}</span>`; lastChunk = ci2; }
  if (ci2 >= 0) { const pill = cap.firstChild, c = chunks[ci2]; pill.style.opacity = lerp(0.2, 1, clamp((t - c.s) / 0.2));
    [...pill.children].forEach((b, k) => { const w = c[k]; b.className = t >= w.next ? 'past' : (t >= w.s ? 'cur' : ''); }); }
}

// ---------- render ----------
{ const add = []; W0.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.back) add.push(o); });
  for (const o of add) { const b = new THREE.Mesh(o.geometry, o.material.userData.back); b.userData.backOf = true; o.add(b); } }
W0.traverse(o => { if (o.isMesh) { const basic = o.material.isMeshBasicMaterial; o.castShadow = !basic; o.receiveShadow = !basic; } });
for (const s of sheets) s.castShadow = false;
function draw() {
  renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rtCol); renderer.render(scene, camera);
  renderer.setClearColor(0x8080ff, 1);
  scene.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; const clip = o.material.clippingPlanes && o.material.clippingPlanes.length;
    o.userData.v0 = o.visible; if (o.userData.decal || o.userData.backOf || (o.material.transparent && o.material.opacity < 0.5)) o.visible = false; o.material = clip ? normalMatClip : normalMat; } });
  renderer.setRenderTarget(rtNor); renderer.render(scene, camera);
  scene.traverse(o => { if (o.isMesh) { o.material = o.userData.m0; o.visible = o.userData.v0; } });
  renderer.setClearColor(0xf3f3f0, 1);
  renderer.setRenderTarget(rtComp); renderer.render(edge.scene, camera);
  renderer.setRenderTarget(null); renderer.render(out.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };

window.EVENTS = (() => {
  const ev = [];
  tagDefs.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: d[3] === 'snd' ? 'stampSnd' : 'stamp', text: d[2] }));
  // bunyi dari model: lem putus, kaki menembus kertas, tekukan selesai (klak), lepas (per)
  SHOTS.forEach(([a, b], k) => {
    let snap = null, pierce = null, done = null, rel = null;
    for (let t = a; t < b + 0.3 && t < DUR; t += DTs) {
      const zc = zcAt(k, t);
      if (snap === null && zc < ZC0 - 0.05) snap = t;
      if (pierce === null && zc - LEG < PZ0) pierce = t;
      if (done === null && zc <= ZCF + 0.01) done = t;
      if (done !== null && rel === null && press(t) < 0.3) rel = t;
    }
    if (snap !== null) ev.push({ t: +snap.toFixed(3), type: 'snap' });
    if (pierce !== null) ev.push({ t: +pierce.toFixed(3), type: 'pierce' });
    if (done !== null) ev.push({ t: +done.toFixed(3), type: 'clack' });
    if (rel !== null) ev.push({ t: +rel.toFixed(3), type: 'spring' });
  });
  ev.push({ t: T(11, 'putar') - 0.05, type: 'twist' }, { t: T(1, 'bongkar'), type: 'whoosh' }, { t: T(0, 'dua') + 0.3, type: 'whoosh' }, { t: L[1].e - 1.2, type: 'whoosh' },
    { t: T(10, 'landasannya') - 0.6, type: 'whoosh' }, { t: T(11, 'sekarang') - 1.2, type: 'whoosh' }, { t: DUR - 1.4, type: 'chime' });
  const cue = (name, t) => ev.push({ t: +t.toFixed(3), type: 'cue', name });
  cue('heart', 0); cue('mystery', L[1].s); cue('act1', L[2].s); cue('danger', L[4].s); cue('drop', L[5].s + 0.1); cue('build', L[6].s);
  cue('reveal', L[7].s); cue('warm', L[8].s); cue('dark', L[10].s); cue('resolve', L[14].s); cue('end', DUR);
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: LS };
})();
window.DUR = DUR;
window.TW = T;
window.__dbg = { camera, base, W0, ST, S, draw };
window.coverPoint = () => ST.localToWorld(V(XS, 0, PZ0));          // titik tunjuk pil di cover
renderAt(0);
window.READY = true;
