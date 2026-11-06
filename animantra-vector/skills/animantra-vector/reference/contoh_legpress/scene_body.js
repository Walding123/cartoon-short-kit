// @papan ---------- Kita bongkar: leg press 45° (3D, tata letak papan; palet & tata dari tema.json). Satuan mm; lantai z = 0 ----------
// Satu model: sudut rel θ(t) dan posisi kereta s(t) -> gaya searah rel = W·sin θ -> kaki, angka di kartu, panah, bunyi.
// Tampilan semi-realistis: bahan PBR + cahaya lingkungan + bayangan lembut, tanpa garis tepi; nada akhir (ACES) di pass terakhir.
// Mesin lokal (grup LP): x sepanjang mesin (kursi di x kecil, rel naik ke +x), y ke samping, z ke atas.
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const BG = 0x16181d;
const lin3 = h => new THREE.Color(h).convertSRGBToLinear();
// warna latar/lantai harus keluar persis seperti di tema setelah nada ACES di pass akhir: cari nilai linear-nya (bagi dua)
const acesF = x => { x *= 0.95; return Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14))); };
const preTone = hex => { const c = new THREE.Color(hex), out = [c.r, c.g, c.b].map(v => { const L = Math.pow(v, 2.2); let a = 0, b = 20; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (acesF(m) < L) a = m; else b = m; } return (a + b) / 2; });
  return new THREE.Color(...out); };
const BGL = preTone(PP.langit);
renderer.setClearColor(BGL, 1);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.children.filter(o => o.isAmbientLight).forEach(o => (o.intensity = 0.1 * Math.PI));
sun.intensity = 2.0; sun.shadow.bias = -0.0002; sun.shadow.normalBias = 1.5;
{ const rim = new THREE.DirectionalLight('#9fb7ff', 1.1); rim.position.set(-3000, 2500, -2000); scene.add(rim); }   // cahaya tepi dingin dari belakang
// bahan PBR: warna sRGB -> linear; sorotan = warna + sedikit cahaya (emissive)
function std(hex, rough = 0.5, metal = 0, env = 1) {
  const m = new THREE.MeshStandardMaterial({ color: lin3(hex), roughness: rough, metalness: metal, envMapIntensity: env, side: THREE.DoubleSide });
  m.userData.base = m.color.clone();
  m.hl = (pal, k) => { const c = lin3(PAL[pal][0]); m.color.copy(m.userData.base).lerp(c, k * 0.8); m.emissive.copy(c).multiplyScalar(k * 0.28); };
  return m;
}
PAL.frame = ['#aab3c4', '#86909f', '#5d6676'];
PAL.sled = ['#dfe4ec', '#b8c0cc', '#8a93a2'];
PAL.plates = ['#646b78', '#4b515c', '#343841'];
PAL.pad = [PP.garis, '#363b47', '#262a33'];
PAL.body = ['#c9ced8', '#a7aebb', '#7f8796'];
PAL.floor = ['#1f232b', '#1b1e25', PP.pilTeks];
PAL.bar = ['#e3e6ec', '#b9bec8', '#8a909b'];

// ---------- dunia ----------
const root = new THREE.Group(); scene.add(root);
const base = new THREE.Group(); root.add(base);
base.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 1).normalize(), V(1, 0, -1).normalize(), V(0, 1, 0)));
const W0 = new THREE.Group(); base.add(W0);
const box = (sx, sy, sz, mat, x, y, z, p = W0) => { const m = mesh(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z); p.add(m); return m; };
const rbox = (sx, sy, sz, r, mat, x, y, z, p = W0) => { const m = mesh(new RoundedBoxGeometry(sx, sy, sz, 3, Math.min(r, sx / 2 - .01, sy / 2 - .01, sz / 2 - .01)), mat, x, y, z); p.add(m); return m; };
const span = (x0, x1, y0, y1, z0, z1, mat, p, r = 0) => (r > 0 ? rbox(x1 - x0, y1 - y0, z1 - z0, r, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, p) : box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, p));
const M = { floor: std('#0b0c0f', 0.95, 0, 0.05), frame: std('#7e8899', 0.38, 0.6), rail: std('#a5adba', 0.22, 0.85), sled: std('#b9bfc8', 0.3, 0.75), foot: std('#2c3038', 0.75, 0.1),
  plates: std('#25282e', 0.72, 0.05), horn: std('#eef0f3', 0.12, 1), pad: std('#24272e', 0.5, 0, 0.6), roller: std('#17191d', 0.55, 0.3), bar: std('#dfe2e7', 0.18, 1), sqPlates: std('#25282e', 0.72, 0.05) };
// lantai gelap + grid tipis
// lantai: warna gelap tetap (sama dengan latar papan) + lapisan penerima bayangan
const floorM = mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: preTone(PP.lantai) }), 400, 0, -0.5); W0.add(floorM);
const floorSh = mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.ShadowMaterial({ opacity: 0.55 }), 400, 0, 0.2); W0.add(floorSh);
{ const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const c = cv.getContext('2d');
  c.strokeStyle = PP.grid; c.lineWidth = 2; for (let i = 0; i <= 1024; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 1024); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(1024, i); c.stroke(); }
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(9, 9);
  const g = mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }), 400, 0, 0.5); g.userData.decal = true; W0.add(g); }

// ---------- ukuran (leg press 45° komersial) ----------
const P0 = [700, 250];                 // pangkal rel (x, z)
const RAIL_L = 1500, RAIL_Y = 250;     // panjang rel, jarak rel dari tengah
const SLED_L = 700, FOOT_H = 520;      // panjang kereta sepanjang rel, tinggi pijakan
const HIP = [330, 330], THIGH = 430, SHIN = 430, LEG_Y = 140;
const PLATE_R = 225, PLATE_T = 42, N_PLATES = 4, PLATE_KG = 25;   // 4 × 25 kg tiap sisi
const W_KG = 2 * N_PLATES * PLATE_KG;                            // 200 kg
const BODY_KG = 70, ABOVE_SHIN = 1 - 2 * (0.0433 + 0.0137);      // de Leva (1996), pria: tungkai bawah + kaki
const LIFT_KG = BODY_KG * ABOVE_SHIN, BAR_KG = 80;
const feltKg = th => W_KG * Math.sin(deg(th));

// ---------- mesin leg press ----------
const LP = new THREE.Group(); W0.add(LP); LP.rotation.z = -Math.PI / 2 - 0.5;
// rangka bawah, tiang, kursi
for (const sy of [-1, 1]) span(-300, 1900, sy * 300 - 30, sy * 300 + 30, 0, 70, M.frame, LP, 6);
for (const x of [-250, 700, 1850]) span(x - 35, x + 35, -300, 300, 0, 70, M.frame, LP, 6);
const post = new THREE.Group(); LP.add(post);           // tiang belakang (tinggi ikut ujung rel)
for (const sy of [-1, 1]) post.add(mesh(new THREE.BoxGeometry(70, 60, 1).translate(0, 0, 0.5), M.frame, 0, sy * RAIL_Y, 0));
for (const sy of [-1, 1]) span(P0[0] - 30, P0[0] + 30, sy * RAIL_Y - 30, sy * RAIL_Y + 30, 0, P0[1], M.frame, LP, 4);
// kursi: dudukan + sandaran miring + rangka
const SEAT = new THREE.Group(); LP.add(SEAT);
span(-60, 60, -40, 40, 0, HIP[1] - 70, M.frame, SEAT, 6); SEAT.children[0].position.x = HIP[0] - 60;
{ const pan = rbox(380, 460, 70, 25, M.pad, 0, 0, 0, SEAT); pan.position.set(HIP[0] + 40, 0, HIP[1] - 70); pan.rotation.y = deg(-12);
  const back = rbox(720, 460, 80, 30, M.pad, 0, 0, 0, SEAT); back.position.set(HIP[0] - 330, 0, HIP[1] + 150); back.rotation.y = deg(-34);
  const bf = rbox(700, 60, 50, 10, M.frame, 0, 0, 0, SEAT); bf.position.set(HIP[0] - 320, 0, HIP[1] + 80); bf.rotation.y = deg(-34);
  span(-150 - 30, -150 + 30, -30, 30, 0, 470, M.frame, SEAT, 6);
  for (const sy of [-1, 1]) { const h = rbox(220, 30, 30, 12, M.horn, 0, 0, 0, SEAT); h.position.set(HIP[0] + 60, sy * 270, HIP[1] - 30); } }
// rakitan rel: berputar di pangkal rel (θ); koordinat rakitan: u sepanjang rel (x), n tegak lurus rel (z)
const RAIL = new THREE.Group(); RAIL.position.set(P0[0], 0, P0[1]); LP.add(RAIL);
for (const sy of [-1, 1]) { span(0, RAIL_L, sy * RAIL_Y - 32, sy * RAIL_Y + 32, -60, 0, M.rail, RAIL, 5); span(RAIL_L - 40, RAIL_L, sy * RAIL_Y - 50, sy * RAIL_Y + 50, 0, 60, M.frame, RAIL, 4); }
// kereta luncur (posisi s sepanjang rel)
const SLED = new THREE.Group(); RAIL.add(SLED);
span(0, SLED_L, -RAIL_Y - 45, RAIL_Y + 45, 30, 75, M.sled, SLED, 8);                         // pelat dasar kereta
for (const sy of [-1, 1]) span(0, SLED_L, sy * (RAIL_Y + 20) - 18, sy * (RAIL_Y + 20) + 18, -10, 110, M.sled, SLED, 6);
const FOOT = rbox(40, 620, FOOT_H, 14, M.foot, 0, 0, 0, SLED); FOOT.position.set(20, 0, 75 + FOOT_H / 2);   // pijakan, tegak lurus rel
for (const sy of [-1, 1]) { const g = rbox(260, 30, 30, 10, M.horn, 0, 0, 0, SLED); g.position.set(560, sy * 360, 40); g.rotation.y = deg(45); }   // pegangan pengaman
const rollers = [];
for (const u of [80, SLED_L - 80]) for (const sy of [-1, 1]) { const r = mesh(new THREE.CylinderGeometry(28, 28, 24, 20), M.roller, u, sy * RAIL_Y, 22); r.rotation.z = Math.PI / 2; r.rotation.x = Math.PI / 2; SLED.add(r); rollers.push(r); }
const HORN_U = 520, HORN_N = 230;
const plateMeshes = [];
for (const sy of [-1, 1]) {
  const h = mesh(new THREE.CylinderGeometry(25, 25, 330, 20), M.horn, HORN_U, sy * (RAIL_Y + 45 + 165), HORN_N); SLED.add(h);
  span(HORN_U - 40, HORN_U + 40, sy * (RAIL_Y + 30), sy * (RAIL_Y + 60), 60, HORN_N + 40, M.sled, SLED, 6);
  for (let k = 0; k < N_PLATES; k++) {
    const g = new THREE.Group(); g.position.set(HORN_U, sy * (RAIL_Y + 90 + k * (PLATE_T + 4)), HORN_N); SLED.add(g);
    const d = mesh(new THREE.CylinderGeometry(PLATE_R, PLATE_R, PLATE_T, 48), M.plates, 0, 0, 0); g.add(d);
    const hub = mesh(new THREE.CylinderGeometry(60, 60, PLATE_T + 6, 24), M.horn, 0, 0, 0); g.add(hub);
    plateMeshes.push(g);
  }
}
// ---------- orang (proporsi dewasa 175 cm): segmen dari profil putar, sendi dihitung tiap frame ----------
const lathe = (prof, n = 24) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), n).translate(0, -0.5, 0);
const PROF = {
  thigh: [[0, 0], [72, 0.01], [84, 0.14], [80, 0.45], [63, 0.86], [55, 1], [0, 1]],
  shortsLeg: [[0, 0], [90, 0.0], [89, 0.42], [0, 0.42]],
  shin: [[0, 0], [52, 0], [57, 0.1], [61, 0.3], [49, 0.66], [35, 0.95], [0, 1]],
  torso: [[0, 0], [118, 0.02], [134, 0.14], [117, 0.4], [138, 0.64], [150, 0.8], [124, 0.95], [52, 1], [0, 1]],
  upper: [[0, 0], [46, 0], [51, 0.3], [42, 0.86], [38, 1], [0, 1]],
  sleeve: [[0, 0], [58, 0], [56, 0.38], [0, 0.38]],
  fore: [[0, 0], [40, 0], [43, 0.25], [31, 0.9], [28, 1], [0, 1]],
  neck: [[0, 0], [50, 0], [45, 1], [0, 1]],
};
const GEO = Object.fromEntries(Object.entries(PROF).map(([k, v]) => [k, lathe(v)]));
// letakkan segmen dari a ke b; lat = arah kiri-kanan badan (mengunci putaran segmen), sx/sz = skala penampang
function placeB(m, a, b, lat, sx = 1, sz = 1) {
  const A = V(...a), d = V(b[0] - a[0], b[1] - a[1], b[2] - a[2]), l = d.length(), y = d.normalize();
  const L3 = V(...lat), x = L3.sub(y.clone().multiplyScalar(L3.dot(y))).normalize(), z = x.clone().cross(y);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); m.position.copy(A).addScaledVector(d, l / 2); m.scale.set(sx, l, sz);
}
// sendi 2 ruas (lutut/siku): dari a ke c, panjang l1 & l2, menekuk ke arah pole
function ik(a, c, l1, l2, pole) {
  const A = V(...a), C = V(...c), d = C.clone().sub(A), dist = Math.min(l1 + l2 - 1, d.length()), u = d.normalize();
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const P = V(...pole), pp = P.sub(u.clone().multiplyScalar(P.dot(u))).normalize();
  return A.addScaledVector(u, x).addScaledVector(pp, h).toArray();
}
function makeHuman(parent, shirtHex) {
  const mt = { skin: std('#d6a07c', 0.55, 0, 0.7), thigh: std('#d6a07c', 0.55, 0, 0.7), shin: std('#d6a07c', 0.55, 0, 0.7), shirt: std(shirtHex, 0.8, 0, 0.6),
    shorts: std('#23262d', 0.85, 0, 0.5), shoe: std('#f1f2f4', 0.6, 0, 0.6), sole: std('#3a3d44', 0.8), hair: std('#2b221d', 0.7, 0, 0.5) };
  const g = new THREE.Group(); parent.add(g);
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
  const sph = (r, mat) => add(new THREE.SphereGeometry(r, 24, 16), mat);
  const side = () => ({ thigh: add(GEO.thigh, mt.thigh), shorts: add(GEO.shortsLeg, mt.shorts), shin: add(GEO.shin, mt.shin), knee: sph(52, mt.thigh),
    shoe: add(new RoundedBoxGeometry(1, 1, 1, 3, 0.3), mt.shoe), sole: add(new RoundedBoxGeometry(1, 1, 1, 2, 0.2), mt.sole),
    upper: add(GEO.upper, mt.skin), sleeve: add(GEO.sleeve, mt.shirt), fore: add(GEO.fore, mt.skin), elbow: sph(40, mt.skin), shoulder: sph(60, mt.shirt), hand: sph(44, mt.skin) });
  const H = { mt, g, L: side(), R: side(), torso: add(GEO.torso, mt.shirt), pelvis: sph(120, mt.shorts), neck: add(GEO.neck, mt.skin), head: sph(100, mt.skin), hair: sph(104, mt.hair) };
  H.hair.geometry = new THREE.SphereGeometry(104, 24, 16, 0, TAU, 0, Math.PI * 0.55);
  // J: titik sendi; lat: arah kiri-kanan; up: arah atas kepala
  H.pose = (J, lat, br = 0) => {
    placeB(H.torso, J.pelvis, J.neck, lat, 1, 0.64 * (1 + br)); H.pelvis.position.set(...J.pelvis);
    H.pelvis.quaternion.copy(H.torso.quaternion); H.pelvis.scale.set(1.25, 0.8, 0.85);
    const nk = [J.neck[0] + (J.head[0] - J.neck[0]) * 0.45, J.neck[1] + (J.head[1] - J.neck[1]) * 0.45, J.neck[2] + (J.head[2] - J.neck[2]) * 0.45];
    placeB(H.neck, J.neck, nk, lat); H.head.position.set(...J.head); placeB(H.head, J.head.map((v, i) => v - (J.head[i] - J.neck[i]) * 0.001), J.head, lat, 0.86, 0.95);
    H.head.scale.y = 1.1; H.head.position.set(...J.head);
    H.hair.quaternion.copy(H.head.quaternion); H.hair.position.set(...J.head); H.hair.scale.set(0.88, 1.08, 0.97);
    for (const [k, S2] of [['L', H.L], ['R', H.R]]) {
      const hip = J['hip' + k], kn = J['knee' + k], an = J['ankle' + k];
      placeB(S2.thigh, hip, kn, lat); placeB(S2.shorts, hip, kn, lat); placeB(S2.shin, kn, an, lat); S2.knee.position.set(...kn);
      placeB(S2.shoe, J['heel' + k], J['toe' + k], J.shoeUp, 1, 1); S2.shoe.scale.set(100, S2.shoe.scale.y, 85);
      placeB(S2.sole, J['heel' + k], J['toe' + k], J.shoeUp, 1, 1); S2.sole.scale.set(108, S2.sole.scale.y + 10, 22);
      S2.sole.position.addScaledVector(V(...J.soleN), 40);
      const sh = J['sh' + k], el = J['el' + k], wr = J['wr' + k];
      placeB(S2.upper, sh, el, lat); placeB(S2.sleeve, sh, el, lat); placeB(S2.fore, el, wr, lat);
      S2.shoulder.position.set(...sh); S2.elbow.position.set(...el); S2.hand.position.set(...wr); S2.hand.scale.set(0.75, 1.1, 0.95);
    }
  };
  return H;
}
const MAN = makeHuman(LP, '#3a6ed8');
const v3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
// pose di leg press: punggung di sandaran (34°), tangan di pegangan, telapak di pijakan
function lpPose(t) {
  const th = deg(S.th), u = [Math.cos(th), 0, Math.sin(th)], n = [-Math.sin(th), 0, Math.cos(th)];
  const db = [-Math.cos(deg(34)), 0, Math.sin(deg(34))], nb = [Math.sin(deg(34)), 0, Math.cos(deg(34))];
  const push = clamp(Math.abs(sAt(t + 0.05) - sAt(t - 0.05)) / 40);           // tenaga saat kereta bergerak
  const pelvis = [HIP[0] - 20, 0, HIP[1] + 25], neck = v3(v3(pelvis, db, 520), nb, 35);
  const head = v3(v3(neck, db, 125), nb, 40 + 22 * push);                      // dagu sedikit menunduk saat mendorong
  const J = { pelvis, neck, head, shoeUp: n, soleN: u };
  const F = footPt(S.s);
  for (const [k, sy] of [['L', -1], ['R', 1]]) {
    const C = [F[0], sy * 150, F[1]];
    J['hip' + k] = [HIP[0], sy * 95, HIP[1]];
    J['ankle' + k] = v3(v3(C, u, -140), n, -40);                                  // C = muka belakang pijakan; muka depan 40 mm di depannya
    J['heel' + k] = v3(v3(C, u, -88), n, -105); J['toe' + k] = v3(v3(C, u, -88), n, 150);
    J['knee' + k] = ik(J['hip' + k], J['ankle' + k], THIGH, SHIN, [0.1, sy * 0.35, 1]);
    J['sh' + k] = [neck[0] - db[0] * 55, sy * 180, neck[2] - db[2] * 55 - 10];
    J['wr' + k] = [HIP[0] + 50, sy * 268, HIP[1] - 5];
    J['el' + k] = ik(J['sh' + k], J['wr' + k], 300, 270, [0.2, sy * 1, -0.6]);
  }
  return J;
}

// ---------- squat (pembanding), di samping mesin ----------
const SQ = new THREE.Group(); W0.add(SQ); SQ.position.set(-2600, 2800, 0); SQ.rotation.z = -Math.PI / 2 - 0.5;
const SQM = makeHuman(SQ, '#d9573c');
const BAR = new THREE.Group(); SQ.add(BAR);
BAR.add(mesh(new THREE.CylinderGeometry(14, 14, 2000, 20), M.bar));
for (const sy of [-1, 1]) { for (let k = 0; k < 2; k++) BAR.add(mesh(new THREE.CylinderGeometry(225 - k * 40, 225 - k * 40, 48, 48), M.sqPlates, 0, sy * (640 + k * 54), 0));
  BAR.add(mesh(new THREE.CylinderGeometry(30, 30, 30, 20), M.bar, 0, sy * 590, 0)); }
// squat: tulang kering condong 28°, paha sampai hampir datar, badan condong 40° (q 0 berdiri .. 1 jongkok)
function sqJoints(q, t) {
  const a = deg(30) * q, b = deg(88) * q, g = deg(42) * q, J = { shoeUp: [0, 0, 1], soleN: [0, 0, -1] };
  let pel = null;
  for (const [k, sy] of [['L', -1], ['R', 1]]) {
    const A = [0, sy * 165, 105], K = [A[0] + SHIN * Math.sin(a), sy * (165 + 35 * q), A[2] + SHIN * Math.cos(a)];
    const Hp = [K[0] - THIGH * Math.sin(b), sy * 95, K[2] + THIGH * Math.cos(b)];
    Object.assign(J, { ['ankle' + k]: A, ['knee' + k]: K, ['hip' + k]: Hp, ['heel' + k]: [-55, sy * 165, 40], ['toe' + k]: [205, sy * 180, 40] });
    pel = [Hp[0], 0, Hp[2] + 20];
  }
  const td = [Math.sin(g), 0, Math.cos(g)], back = [-Math.cos(g), 0, Math.sin(g)];
  J.pelvis = pel; J.neck = v3(pel, td, 520); J.head = v3(v3(J.neck, td, 120), [1, 0, 0], 25 * q + 15);
  J.bar = v3(v3(J.neck, td, -70), back, 95);
  for (const [k, sy] of [['L', -1], ['R', 1]]) {
    J['sh' + k] = [J.neck[0] - td[0] * 55, sy * 182, J.neck[2] - td[2] * 55];
    J['wr' + k] = [J.bar[0] + 15, sy * 430, J.bar[2] + 10];
    J['el' + k] = ik(J['sh' + k], J['wr' + k], 300, 270, [-0.5, sy * 0.3, -1]);
  }
  return J;
}
const squatPose = q => ({ Hp: sqJoints(q).pelvis });

// ---------- timeline (dikunci ke kata) ----------
const th0 = 45;
const thKeys = [[0, th0], [T(11, 'tegak') - 0.2, th0], [T(11, 'berat') + 0.4, 80], [T(11, 'terasa') + 0.4, 80], [L[12].s + 0.6, th0]];
const thAt = t => track(thKeys, t);
// posisi kereta: 300 = lutut menekuk, 640 = kaki lurus
const sKeys = [[0, 420], [T(0, 'dorong') - 0.2, 420], [T(0, 'kilo') + 0.3, 600], [T(0, 'kok'), 600], [L[1].s + 0.5, 320],
  [T(2, 'mendorong') - 0.2, 320], [T(2, 'depannya') + 0.3, 620], [L[3].s + 0.4, 620], [T(3, 'kuncinya') - 0.2, 420],
  [T(4, 'sepanjang') - 0.2, 420], [L[4].e + 0.4, 330], [L[5].s + 0.6, 420], [T(6, 'kakimu') - 0.2, 420], [L[6].e, 600], [L[7].s + 0.3, 600],
  [T(7, '200') - 0.1, 600], [T(7, '140') + 0.4, 360], [L[8].s, 420], [L[11].s, 420], [T(11, 'terasa') + 0.8, 420], [T(12, 'jujur') - 0.4, 340], [T(12, 'menanggung'), 630], [DUR, 630]];
const sAt = t => track(sKeys, t);
const sqKeys = [[0, 0], [T(9, 'mengangkat') - 0.6, 0], [T(9, 'badanmu') + 0.1, 0.9], [T(9, 'sendiri') + 0.4, 0.9], [T(9, 'orang'), 0.1],
  [T(9, 'kilo', 1) - 0.3, 0.9], [T(9, 'naik') + 0.4, 0.05], [L[10].s + 0.4, 0.05], [T(10, 'badan') + 0.1, 0.85], [T(10, 'hampir'), 0.85], [L[10].e + 0.3, 0.1]];
const tReveal = T(7, 'persen') - 0.2;
const tSq = L[8].s - 0.3, tSqEnd = L[10].e + 0.6;

// ---------- model per waktu ----------
const S = { th: th0, s: 420, felt: feltKg(th0), q: 0, hl: {} };
const footPt = s => { const th = deg(S.th), u = [Math.cos(th), Math.sin(th)], n = [-Math.sin(th), Math.cos(th)], k = 75 + FOOT_H / 2 - 20;
  return [P0[0] + u[0] * (s + 40) + n[0] * k, P0[1] + u[1] * (s + 40) + n[1] * k]; };
function updateModel(t) {
  S.th = thAt(t); S.s = sAt(t); S.felt = feltKg(S.th); S.q = track(sqKeys, t);
  const th = deg(S.th);
  RAIL.rotation.y = -th; SLED.position.x = S.s;
  rollers.forEach(r => (r.rotation.y = S.s / 28));
  const end = [P0[0] + RAIL_L * Math.cos(th), P0[1] + RAIL_L * Math.sin(th)];
  post.position.set(end[0] - 20, 0, 0); post.scale.z = Math.max(1, end[1] - 30);
  // orang di leg press (napas pelan) dan orang squat
  MAN.pose(lpPose(t), [0, 1, 0], 0.025 * Math.sin(t * 2.3));
  const J = sqJoints(S.q, t); SQM.pose(J, [0, 1, 0], 0.02 * Math.sin(t * 2.6)); BAR.position.set(...J.bar);
  // sorotan per kalimat
  const hS = Math.max(hlw(t, T(2, 'kereta'), T(2, 'pelat')), hlw(t, T(3, 'keretanya'), T(3, 'rel')));
  const hP = Math.max(hlw(t, T(2, 'pelat'), T(2, 'kakimu')), hlw(t, T(4, 'berat'), L[4].e), hlw(t, T(0, '200'), T(0, 'tapi')));
  const hF = hlw(t, T(2, 'pijakan') - 0.1, L[2].e + 0.2), hR = Math.max(hlw(t, T(3, 'rel'), L[3].e + 0.2), hlw(t, T(6, 'ditahan') - 0.2, T(6, 'kakimu')), hlw(t, T(12, 'relnya'), DUR));
  const hB = Math.max(hlw(t, T(9, 'badanmu') - 0.1, L[9].e + 0.2), hlw(t, T(10, 'ditambah'), L[10].e)), hL = hlw(t, T(6, 'kakimu') - 0.1, L[6].e + 0.2);
  M.sled.hl('orange', hS * 0.7); M.plates.hl('yellow', hP * 0.75); M.foot.hl('orange', Math.max(hF, hS) * 0.7); M.rail.hl('orange', hR * 0.7);
  MAN.mt.thigh.hl('orange', hL * 0.6); MAN.mt.shin.hl('orange', hL * 0.6);
  for (const k of ['skin', 'thigh', 'shirt', 'shorts', 'hair']) SQM.mt[k].hl('orange', hB * 0.6); M.sqPlates.hl('yellow', hlw(t, T(10, '80') - 0.2, T(10, 'ditambah')) * 0.75);
}

// ---------- kamera: [x, y, z, tinggi pandang, kemiringan, putar] di koordinat LP (squat: koordinat SQ) ----------
const YW = 0.75, TL = 1.65;
const C = (x, z, h, tilt = TL, yaw = YW, y = 0, frame = 'LP') => [x, y, z, frame === 'SQ' ? h : h * 1.12, tilt, yaw, frame === 'SQ' ? 1 : 0];
const camKeys = [
  [0, C(900, 600, 7000, 0.6, 0.3)], [T(0, 'dorong'), C(900, 650, 4600)], [T(0, 'squat'), C(900, 650, 4400, TL, YW + 0.1)], [L[1].s, C(900, 650, 4300)],
  [L[2].s, C(1140, 900, 2800)], [T(2, 'pelat'), C(1200, 1050, 2400, TL, YW + 0.15)], [T(2, 'kakimu'), C(650, 620, 2800, TL, YW - 0.1)],
  [L[3].s + 0.2, C(950, 650, 4300)], [T(3, '45'), C(850, 500, 3200, 1.75)], [L[3].e, C(900, 600, 3600, 1.7)],
  [L[4].s, C(1150, 750, 3600, 1.75)], [L[5].e, C(1150, 750, 3500, 1.75)], [L[6].s + 0.3, C(950, 700, 3900, 1.7)], [L[6].e, C(950, 700, 4000, 1.7)],
  [L[7].s + 0.4, C(950, 700, 4100)], [L[7].e + 0.3, C(900, 650, 4300, TL, YW + 0.1)],
  [tSq, C(900, 650, 4300, TL, YW + 0.1)], [tSq + 1.6, C(0, 850, 4200, TL, 1.55, 0, 'SQ')], [L[9].e, C(0, 850, 4000, TL, 1.65, 0, 'SQ')], [L[10].e - 0.6, C(0, 850, 4100, TL, 1.65, 0, 'SQ')],
  [tSqEnd + 1.0, C(950, 750, 4400)], [T(11, 'derajat') + 0.3, C(950, 900, 5000, 1.7)], [L[11].e + 0.4, C(950, 900, 5000, 1.7)],
  [L[12].s + 0.6, C(900, 650, 4400)], [DUR, C(900, 600, 5600, 1.2, YW + 0.3)],
];
const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3();
function updateCamera(t) {
  const c = window.CAM_OVERRIDE || track(camKeys, t);
  const drift = 1 - 0.01 * Math.sin(t * 0.7);
  const h = c[3] * drift, tilt = c[4] ?? 1;
  root.rotation.y = -0.38 + (c[5] || 0);
  camera.top = h / 2; camera.bottom = -h / 2; camera.left = -h * W / H / 2; camera.right = h * W / H / 2;
  root.updateMatrixWorld(true);
  const kSq = clamp(c[6] || 0);
  const target = LP.localToWorld(tmpV.set(c[0], c[1], c[2])).lerp(SQ.localToWorld(tmpW.set(c[0], c[1], c[2])), kSq);
  const dir = (tilt <= 1 ? V(0.05, 1, 0.05).normalize().lerp(V(1, 1.7, 1).normalize(), tilt) : V(1, 1.7, 1).normalize().lerp(V(1, 0.5, 1).normalize(), tilt - 1)).normalize();
  const dist = 9000 + h * 2;
  camera.near = 10; camera.far = dist + h * 3 + 9000;
  edge.mat.uniforms.far.value = (camera.far - camera.near) / 30;
  const sb = Math.max(600, h * 0.8);
  sun.target.position.copy(target); sun.position.copy(target).addScaledVector(V(0.25, 1, 0.85).normalize(), sb * 3 + 2000);
  Object.assign(sun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: sb * 6 + 6000 }); sun.shadow.camera.updateProjectionMatrix();
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.up.copy(V(-1, 0, -1).normalize().lerp(V(0, 1, 0), smooth(0, 0.6, tilt)).normalize());
  camera.lookAt(target);
  camera.updateMatrixWorld();
  camera.position.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), -h * (H / 2 - PAPAN.cy) / H);   // benda di tengah zona adegan
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  let sh = 0; for (const s of shakeAt) if (t > s && t < s + 0.4) sh = Math.max(sh, 1 - (t - s) / 0.4);
  $('shake').style.transform = sh ? `translate(${(Math.sin(t * 91) * 10 * sh).toFixed(1)}px, ${(Math.cos(t * 77) * 7 * sh).toFixed(1)}px)` : '';
}
function project(v) { const p = (v.isVector3 ? v.clone() : v).project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const lp = (x, y, z) => LP.localToWorld(V(x, y, z));
const railPt = (u, n, y = 0) => { const th = deg(S.th); return lp(P0[0] + u * Math.cos(th) - n * Math.sin(th), y, P0[1] + u * Math.sin(th) + n * Math.cos(th)); };
const plateC = (sy = 1) => railPt(S.s + HORN_U, HORN_N, sy * (RAIL_Y + 90 + 1.5 * (PLATE_T + 4)));

// ---------- label & sorotan ----------
pill(T(0, '200') - 0.2, T(0, 'tapi'), 'PELAT 200 kg', () => plateC(1), 0, -150, 'y');
pill(T(2, 'kereta') - 0.1, T(2, 'pelat') - 0.1, 'KERETA LUNCUR', () => railPt(S.s + 350, 120), 0, -170, 'hi');
pill(T(2, 'pelat') - 0.1, T(2, 'kakimu') - 0.1, 'PELAT 8 × 25 kg', () => plateC(1), 0, -170, 'y');
pill(T(2, 'pijakan') - 0.1, L[2].e + 0.3, 'PIJAKAN', () => railPt(S.s + 20, 500), -40, -110, 'hi');
pill(T(3, 'rel') - 0.1, L[3].e + 0.3, 'REL MIRING', () => railPt(1150, -30, -RAIL_Y), 120, 110, 'hi');
pill(T(6, 'ditahan') - 0.2, T(6, 'kakimu') - 0.2, 'DITAHAN REL', () => railPt(S.s + HORN_U, -30, RAIL_Y), 140, 90, 'g');
pill(T(6, 'kakimu') - 0.1, L[6].e + 0.3, 'KAKI MELAWAN INI', () => railPt(S.s + 20, 300), -60, -150, 'hi');
pill(T(9, 'badanmu') - 0.1, L[9].e + 0.2, 'BADAN IKUT NAIK', () => SQ.localToWorld(V(...squatPose(S.q).Hp)), -200, -90, 'hi');
pill(T(10, '80') - 0.2, T(10, 'ditambah') + 0.2, 'BARBEL 80 kg', () => BAR.localToWorld(V(0, 650, 0)), 0, -170, 'y');

const shakeAt = [T(1, 'bongkar')];
const stampDefs = [[T(1, 'bongkar'), L[1].e + 0.5, 'Kita bongkar!', 'snd'], [T(7, '140'), L[7].e + 0.9, '200 → 140 kg', 'snd']];
const tagDefs = [];

// ---------- overlay per frame ----------
const fmt = v => Math.round(v);
let lastStamp = -1;
function updateOverlay(t) {
  // kartu angka (dari model)
  const sq = t > tSq + 0.8 && t < tSqEnd + 0.4, late = t > L[11].s - 0.2;
  if (sq) setStats([['Barbel', '80', 'kg', ''], ['Badan', t > T(9, '60') - 0.1 ? '≈ ' + Math.round(LIFT_KG / 5) * 5 : '?', 'kg', t > T(9, '60') - 0.1 ? 'o' : ''],
    ['Total', t > T(10, 'ditambah') ? '≈ ' + Math.round((BAR_KG + Math.round(LIFT_KG / 5) * 5) / 5) * 5 : '?', 'kg', t > T(10, 'ditambah') ? 'g' : '']]);
  else setStats([['Pelat', String(W_KG), 'kg', ''], ['Di kaki', t > tReveal ? String(fmt(S.felt)) : '?', 'kg', t > tReveal ? (late && S.th > 50 ? 'r' : 'g') : ''],
    ['Sudut rel', String(fmt(S.th)) + '°', '', late && S.th > 50 ? 'r' : (t > T(3, '45') - 0.2 ? 'o' : '')]]);
  let svg = updatePapan(t);
  // sudut rel: busur + angka
  const kA = Math.max(hlw(t, T(3, '45') - 0.2, L[3].e + 0.4), hlw(t, T(7, '45') - 0.2, T(7, 'persen')), hlw(t, T(11, 'tegak') - 0.2, L[11].e + 0.3));
  if (kA > 0.02) { const o = project(lp(P0[0], -RAIL_Y - 80, P0[1])); const pts = []; for (let a = 0; a <= S.th; a += 3) pts.push(project(lp(P0[0] + 420 * Math.cos(deg(a)), -RAIL_Y - 80, P0[1] + 420 * Math.sin(deg(a)))));
    const g0 = project(lp(P0[0] + 700, -RAIL_Y - 80, P0[1])), m = project(lp(P0[0] + 520 * Math.cos(deg(S.th / 2)), -RAIL_Y - 80, P0[1] + 520 * Math.sin(deg(S.th / 2))));
    svg += `<g opacity="${kA.toFixed(3)}"><line x1="${o[0]}" y1="${o[1]}" x2="${g0[0]}" y2="${g0[1]}" stroke="${PP.redup}" stroke-width="4" stroke-dasharray="12 10"/>` +
      `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${PP.aksen}" stroke-width="7" stroke-linecap="round"/>` + tagPx(m[0], m[1], fmt(S.th) + '°', PP.aksen, PP.aksen, PP.pilTeks) + '</g>'; }
  // gaya: berat (lurus ke bawah) dipecah jadi searah rel + menekan rel
  const c = plateC(-1), th = deg(S.th), Lw = 900, Wv = lp(0, 0, -Lw), du = Lw * Math.sin(th), dn = Lw * Math.cos(th);
  const end = (v) => c.clone().add(v);
  const along = LP.localToWorld(V(P0[0] - du * Math.cos(th), -1e-9, P0[1] - du * Math.sin(th))).sub(lp(P0[0], 0, P0[1]));
  const normal = LP.localToWorld(V(P0[0] + dn * Math.sin(th), 0, P0[1] - dn * Math.cos(th))).sub(lp(P0[0], 0, P0[1]));
  const down = Wv.sub(lp(0, 0, 0));
  const kW = Math.max(hlw(t, T(4, 'menarik') - 0.2, L[7].e), hlw(t, T(11, 'tegak') - 0.2, L[11].e)), kU = Math.max(hlw(t, T(4, 'sepanjang') - 0.2, T(5, 'satu') - 0.3), hlw(t, T(5, 'satu', 1) - 0.1, L[7].e), hlw(t, T(11, 'tegak') - 0.2, L[11].e));
  const kN = hlw(t, T(5, 'satu') - 0.1, L[6].e - 0.2), kHold = hlw(t, T(6, 'ditahan') - 0.2, T(6, 'kakimu') + 0.3), kLeg = hlw(t, T(6, 'kakimu') - 0.2, L[7].e);
  svg += forceArrow(c, end(down), PP.buruk, W_KG + ' kg', kW, -1);
  svg += forceArrow(c, end(along), PP.aksen, t > tReveal || late ? fmt(S.felt) + ' kg' : '? kg', kU, 1);
  svg += forceArrow(c, end(normal), PP.redup, t > tReveal ? fmt(W_KG * Math.cos(th)) + ' kg' : '', kN, -1);
  svg += forceArrow(end(normal), c, PP.baik, '', kHold * 0.9, 1);
  const fp = railPt(S.s - 600, 300), fq = railPt(S.s + 20, 300);
  svg += forceArrow(fp, fq, PP.baik, t > tReveal ? '' : 'kaki', kLeg, -1);
  // kartu banding (babak squat): batang
  const kB = hlw(t, T(10, 'hampir') - 0.3, L[10].e + 0.6);
  if (kB > 0.02) { const y0 = PAPAN.top + 90, x0 = 70, Wb = 600, sc = Wb / 200, felt = fmt(feltKg(th0)), tot = BAR_KG + Math.round(LIFT_KG / 5) * 5;
    const bar = (y, lab, v, col, sub) => `<text x="${x0}" y="${y - 14}" ${F} font-weight="700" font-size="28" fill="${PP.redup}">${lab}</text><rect x="${x0}" y="${y}" width="${(v * sc * easeIO(kB)).toFixed(1)}" height="46" rx="10" fill="${col}"/><text x="${x0 + v * sc + 18}" y="${y + 36}" ${F} font-weight="800" font-size="34" fill="${PP.teks}">${sub}</text>`;
    svg += `<g opacity="${kB.toFixed(3)}"><rect x="0" y="${PAPAN.top}" width="${W}" height="${PAPAN.bot - PAPAN.top}" fill="${PP.bg}" opacity=".86"/>` +
      `<text x="${x0}" y="${y0 + 20}" ${F} font-weight="800" font-size="52" fill="${PP.teks}">Yang terasa di kaki</text>` +
      bar(y0 + 120, 'leg press · pelat 200 kg', felt, PP.baik, felt + ' kg') + bar(y0 + 240, 'squat · barbel 80 + badan', tot, PP.aksen, '≈ ' + tot + ' kg') +
      bar(y0 + 360, 'angka di pelat', 200, PP.garis, '200 kg') + '</g>'; }
  $('dim').innerHTML = ''; $('ppSvg').innerHTML = svg;
  // stempel
  let si = -1; stampDefs.forEach((d, i) => { if (t >= d[0] && t < d[1] + 0.3) si = i; });
  const st = $('stamp');
  if (si !== lastStamp) { st.innerHTML = si < 0 ? '' : `<span class="${stampDefs[si][3]}">${stampDefs[si][2]}</span>`; lastStamp = si; }
  if (si >= 0) { const d = stampDefs[si], sp = st.firstChild; const pin = (t - d[0]) / 0.3, pout = clamp((t - d[1]) / 0.3);
    sp.style.opacity = clamp((t - d[0]) / 0.12) * (1 - pout); sp.style.transform = `rotate(-4deg) scale(${(lerp(1.35, 1, backOut(pin)) * lerp(1, 0.94, pout)).toFixed(3)})`; }
}

// ---------- render ----------
W0.traverse(o => { if (o.isMesh) { const basic = o.material.isMeshBasicMaterial; o.castShadow = !basic; o.receiveShadow = !basic; } });
floorM.castShadow = false; floorM.receiveShadow = false; floorSh.castShadow = false; floorSh.receiveShadow = true;
// pass akhir: 2× supersampling -> nada ACES -> sRGB
const fin = quad(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  void main() { vec3 c = .25 * (texture2D(t, vUv + px * vec2(-.5, -.5)).rgb + texture2D(t, vUv + px * vec2(.5, -.5)).rgb + texture2D(t, vUv + px * vec2(-.5, .5)).rgb + texture2D(t, vUv + px * vec2(.5, .5)).rgb);
    gl_FragColor = vec4(pow(aces(c * 0.95), vec3(1. / 2.2)), 1.); }`, { t: { value: rtCol.texture }, px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) } });
rtCol.texture.minFilter = rtCol.texture.magFilter = THREE.LinearFilter;
function draw() {
  renderer.shadowMap.needsUpdate = true;
  renderer.setClearColor(BGL, 1);
  renderer.setRenderTarget(rtCol); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(fin.scene, camera);
}
window.renderAt = t => { updateModel(t); updateCamera(t); draw(); updateOverlay(t); };

window.EVENTS = (() => {
  const ev = [];
  pills.forEach(d => ev.push({ t: d.s, type: 'pop' }));
  stampDefs.forEach(d => ev.push({ t: d[0], type: 'stampSnd', text: d[2] }));
  // bunyi dari model: kereta mulai meluncur (whoosh pelan), kereta berhenti di bawah (clack)
  let ps = sAt(0), mv = 0;
  for (let t = 1 / 120; t < DUR; t += 1 / 120) { const s = sAt(t), v = (s - ps) * 120;
    if (mv === 0 && Math.abs(v) > 60) { ev.push({ t: +t.toFixed(3), type: 'whoosh' }); mv = Math.sign(v); }
    else if (mv !== 0 && Math.abs(v) < 10) { if (mv < 0) ev.push({ t: +t.toFixed(3), type: 'clack' }); mv = 0; }
    ps = s; }
  ev.push({ t: T(3, '45'), type: 'blip' }, { t: tReveal, type: 'blip' }, { t: T(11, 'derajat'), type: 'blip' }, { t: tSq, type: 'whoosh' }, { t: tSqEnd, type: 'whoosh' }, { t: DUR - 1.4, type: 'chime' });
  const cue = (name, t) => ev.push({ t: +t.toFixed(3), type: 'cue', name });
  cue('heart', 0); cue('mystery', L[1].s); cue('act1', L[2].s); cue('danger', L[4].s); cue('drop', L[5].s + 0.1); cue('build', L[6].s);
  cue('reveal', L[7].s); cue('warm', L[8].s); cue('dark', L[11].s); cue('resolve', L[12].s); cue('end', DUR);
  return { dur: DUR, events: ev.sort((a, b) => a.t - b.t), lines: L };
})();
window.DUR = DUR;
window.TW = T;
window.__dbg = { camera, base, W0, LP, S, draw };
window.coverPoint = () => plateC(-1);
renderAt(0);
window.READY = true;
