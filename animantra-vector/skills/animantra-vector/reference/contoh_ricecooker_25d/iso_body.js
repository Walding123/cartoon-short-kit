// ---------- Kita bongkar: rice cooker (mode 2.5D isometrik). Satuan mm; meja z = 0; x ke depan (tuas), kamera dari sisi -y ----------
PAL.rice = ['#fff6dc', '#f0e2bd', '#d8c393'];
PAL.water = ['#bfe3f2', '#93cbe2', '#6aa9c4'];
PAL.body = ['#f7f4ee', '#e6e1d6', '#c9c2b2'];

// ---------- ukuran (rice cooker 1,8 L) ----------
const R_BODY = 135, Z_TOP = 230, R_POT = 110, Z_POT = 70, H_POT = 130, R_IN = R_POT - 3, Z_FLOOR = Z_POT + 3;
const R_CAP = 18, Z_HOUSE = [24, 50], MAG_H = 10, Z_MAG_ON = 59 - MAG_H, DROP = 6;
const PIV = [70, 14], KNOB = [150, 50], PHI = Math.asin(DROP / PIV[0]);
const TC = 103, RICE0 = 40, WATER0 = 70;      // batas suhu sensor di model (sumber: "sedikit di atas 100 °C")
const VENT = [-48, 0, Z_TOP + 46];

// ---------- model masak (satu sumber untuk gambar, HUD, kartu, bunyi) ----------
function cook(m, wf = 1) {
  const boilEnd = 8 + 9 * wf, mTrip = boilEnd + (TC - 100) / 8;
  const free = m < 8 ? 1 - 0.2 * m / 8 : clamp(lerp(0.8, 0, (m - 8) / (boilEnd - 8)));
  let Tp;
  if (m < 8) Tp = 28 + 72 * smooth(0, 8, m);
  else if (m < boilEnd) Tp = 100;
  else if (m < mTrip) Tp = 100 + 8 * (m - boilEnd);
  else if (m < mTrip + 0.5) Tp = lerp(TC, 106, (m - mTrip) / 0.5);
  else Tp = 72 + 34 * Math.exp(-(m - mTrip - 0.5) / 6);
  const done = clamp((Math.min(m, boilEnd) - 8) / 9);
  const riceH = RICE0 + 22 * clamp((Math.min(m, boilEnd) - 4) / 13);
  return { T: Tp, free, done, riceH, boilEnd, mTrip, boiling: m >= 8 && m < boilEnd };
}
const MTRIP = cook(0).mTrip;

// ---------- timeline ----------
const tPressA = T(0, 'menekan') + 0.15, tKlekA = T(0, 'klek'), tReset = T(1, 'bongkar');
const tPressB = T(4, 'ditekan') + 0.1, tTripB = T(10, 'tuasnya') + 0.15;
const mKeys = [[0, 0], [tPressA, 0], [tKlekA, MTRIP], [tKlekA + 2.5, MTRIP + 2.5], [tReset, MTRIP + 2.5], [tReset + 0.001, 0],
  [L[5].s, 0], [T(5, 'mendidih'), 8], [L[6].s, 9], [L[7].e, 15.2], [T(8, 'habis') + 0.2, 17], [L[8].e, 17.25],
  [L[9].e, MTRIP - 0.02], [tTripB, MTRIP], [L[11].e, MTRIP + 6], [DUR, MTRIP + 9]];
const mAt = t => lin(mKeys, t);
function leverAt(t) {
  const on = (tp, tTrip, tEnd) => { if (t < tp - 0.25 || t >= tEnd) return null; if (t < tp) return easeIO((t - (tp - 0.25)) / 0.25); if (t < tTrip) return 1; return 1 - clamp((t - tTrip) / 0.1); };
  return on(tPressA, tKlekA, tReset) ?? on(tPressB, tTripB, 1e9) ?? 0;
}
const cutKeys = [[0, 0], [tReset - 0.1, 0], [tReset + 0.55, 1], [T(14, 'tuas') + 0.2, 1], [T(14, 'tuas') + 0.9, 0]];
const S = { m: 0, T: 28, free: 1, riceH: RICE0, waterTop: WATER0, lev: 0, on: false, boiling: false, done: 0, cut: 0 };
SC.model = t => {
  const c = cook(S.m = mAt(t));
  Object.assign(S, { T: c.T, free: c.free, riceH: c.riceH, boiling: c.boiling, done: c.done });
  S.waterTop = c.riceH + (WATER0 - c.riceH) * c.free;
  S.lev = leverAt(t); S.on = S.lev > 0.5; S.cut = easeIO(track(cutKeys, t));
};
const levTF = () => TF.rotY(PIV[0], PIV[1], -PHI * (1 - S.lev));
const magTF = () => TF.move(0, 0, -DROP * (1 - S.lev));
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const HL = {};                                      // sorotan per bagian, diisi tiap frame

// ---------- gambar ----------
SC.build = t => {
  const k = S.cut, inside = k > 0.02;
  Object.assign(HL, {
    pot: hlw(t, T(2, 'panci'), T(2, 'pemanas')) * 0.5, heater: hlw(t, T(2, 'pemanas'), T(2, 'sensor')) * 0.55,
    cap: Math.max(hlw(t, T(2, 'sensor'), T(2, 'tuas')), hlw(t, L[3].s, T(3, 'magnet'))) * 0.6,
    spring: Math.max(hlw(t, T(3, 'per'), T(3, 'magnet')), hlw(t, T(10, 'per'), T(10, 'tuasnya')), hlw(t, T(14, 'per'), T(14, 'tuas') + 0.2)) * 0.85,
    mag: Math.max(hlw(t, T(3, 'magnet'), L[3].e), hlw(t, T(4, 'magnet'), T(4, 'saklar'))) * 0.4,
    fer: Math.max(hlw(t, T(9, 'logamnya'), L[9].e), hlw(t, T(14, 'logam'), T(14, 'per'))) * 0.7,
    lever: Math.max(hlw(t, T(2, 'tuas'), L[2].e), hlw(t, T(4, 'tuas'), T(4, 'magnet')), hlw(t, T(10, 'tuasnya'), L[10].e)) * 0.5,
    water: Math.max(hlw(t, T(6, 'air'), L[7].e), hlw(t, T(14, 'air'), T(14, 'logam'))) * 0.45,
  });
  // meja + properti
  face([[-900, -700, 0], [900, -700, 0], [900, 700, 0], [-900, 700, 0]], 'deskwood', { layer: -2, stroke: 'none', sw: 0 });
  shadow(0, 0, 150, 150); shadow(250, -260, 70, 70, 0, 0.16); shadow(-260, 260, 42, 42, 0, 0.16);
  lathe(250, -260, [[0, 0], [30, 0], [34, 3], [62, 52], [58, 54], [30, 6], [0, 6]], 'white', { n: 32 });
  lathe(-260, 260, [[0, 0], [34, 0], [38, 70], [34, 70], [31, 4], [0, 4]], 'mug', { n: 32 });
  frustum(150, 260, 42, 42, 0, 4, 'white', { n: 28, tf: TF.rotZ(150, 260, 0.5) });
  box(180, 320, 251, 269, 0, 6, 'white', { tf: TF.rotZ(150, 260, 0.5) });
  // badan + kaki + cincin aksen
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; if (!inside || Math.sin(a) > -0.2) frustum(112 * Math.cos(a), 112 * Math.sin(a), 12, 10, 0, 6, 'ink', { n: 16 }); }
  lathe(0, 0, [[0, 6], [118, 6], [128, 8], [135, 20], [135, 214], [130, 226], [118, 230], [116, 222], [124, 214], [124, 20], [116, 14], [0, 14]], 'body', { cut: k, n: 56 });
  lathe(0, 0, [[135, 198], [138.5, 198], [138.5, 203], [135, 203]], 'orange', { cut: k, n: 56 });
  // tutup + lubang uap + engsel
  lathe(0, 0, [[0, Z_TOP + 52], [0, Z_TOP + 8], [118, Z_TOP + 8], [120, Z_TOP], [136, Z_TOP], [136, Z_TOP + 6], [124, Z_TOP + 18], [90, Z_TOP + 38], [40, Z_TOP + 50]].reverse(), 'body', { cut: k, n: 56 });
  cyl(VENT[0], 0, 11, Z_TOP + 44, Z_TOP + 54, 'ink', { n: 20, cut: k });
  box(-150, -128, -30, 30, 214, 236, 'ink');
  // isi (hanya terlihat lewat potongan)
  if (inside) {
    lathe(0, 0, [[0, Z_POT], [R_POT - 6, Z_POT], [R_POT, Z_POT + 6], [R_POT, Z_POT + H_POT], [R_POT + 7, Z_POT + H_POT + 4], [R_POT + 7, Z_POT + H_POT + 7],
      [R_POT - 2.5, Z_POT + H_POT + 2], [R_POT - 2.5, Z_POT + 8], [R_POT - 8, Z_FLOOR], [0, Z_FLOOR]], 'plate', { cut: k, n: 56, hl: HL.pot });
    cyl(0, 0, R_IN - 1, Z_FLOOR + 0.5, Z_FLOOR + S.riceH, 'rice', { cut: k, n: 48, tint: ['#cdb07f', 0.35 * (1 - S.done)] });
    const wl = S.waterTop - S.riceH;
    if (wl > 0.4) cyl(0, 0, R_IN - 0.5, Z_FLOOR + S.riceH, Z_FLOOR + S.waterTop, 'water', { cut: k, n: 48, hl: HL.water, bias: -0.2 });
    // gelembung (separuh belakang) saat mendidih
    if (S.boiling && S.waterTop > 3) for (let i = 0; i < 40; i++) {
      const ph = (t * (0.55 + hash(i) * 0.5) + hash(i + 9)) % 1, a = hash(i + 3) * Math.PI, r = 20 + hash(i + 5) * (R_IN - 30);
      blob([r * Math.cos(a), r * Math.sin(a) + 2, lerp(Z_FLOOR + 4, Z_FLOOR + S.waterTop, ph)], 1.6 + 2.2 * ph, 'white', { sw: 1.4, bias: -1 });
    }
    // pelat pemanas + elemen
    lathe(0, 0, [[22, 58], [108, 58], [112, 62], [112, 68], [108, Z_POT - 0.6], [24, Z_POT - 0.6], [22, 66]], 'plate', { cut: k, n: 56, hl: HL.heater });
    const ring = Array.from({ length: 12 }, (_, i) => { const a = -i / 12 * TAU; return [72 + 5 * Math.cos(a), 62 + 5 * Math.sin(a)]; });
    lathe(0, 0, ring, 'copper', { cut: k, n: 48, hl: S.on ? 0.55 + 0.1 * Math.sin(t * 9) : 0, hlPal: 'orange', bias: -2 });
    // sensor: tutup, ferit, rumah, per penekan, magnet + batang + kerah, per balik, tuas
    lathe(0, 0, [[0, 62], [R_CAP - 1, 62], [R_CAP, 63], [R_CAP, Z_POT - 0.4], [0, Z_POT - 0.4]], 'steel', { cut: k, n: 32, hl: HL.cap, bias: -1 });
    cyl(0, 0, 13, 59, 62, 'ferrite', { n: 28, hl: HL.fer, hlPal: 'red', bias: -2 });
    lathe(0, 0, [[3.5, Z_HOUSE[0]], [20, Z_HOUSE[0]], [20, Z_HOUSE[1]], [16, Z_HOUSE[1]], [16, Z_HOUSE[0] + 3], [3.5, Z_HOUSE[0] + 3]], 'sleeve2', { cut: k, n: 32 });
    coil(0, 0, 16.5, Z_HOUSE[1] + 0.8, 61.2, 3.5, 'spring', { w: 0.8, hl: HL.spring, bias: -3 });
    const mt = { tf: magTF(), n: 28, bias: -2.5 };
    cyl(0, 0, 10, Z_MAG_ON, Z_MAG_ON + MAG_H / 2, 'blue', { ...mt, hl: HL.mag });
    cyl(0, 0, 10, Z_MAG_ON + MAG_H / 2, Z_MAG_ON + MAG_H, 'red', { ...mt, hl: HL.mag });
    cyl(0, 0, 2.5, 14, Z_MAG_ON, 'steel', { ...mt, n: 12 });
    cyl(0, 0, 6, 14, 18, 'steel', { ...mt, n: 16 });
    coil(0, 0, 5.5, 18 - DROP * (1 - S.lev), Z_HOUSE[0] - 0.5, 4, 'spring', { w: 0.7, hl: HL.spring, bias: -3 });
    const kx = KNOB[0] - PIV[0], kz = KNOB[1] - PIV[1];
    prism([[0, PIV[1] - 3], [PIV[0] + 4, PIV[1] - 3], [PIV[0] + kx + 2, PIV[1] + kz - 4], [PIV[0] + kx + 2, PIV[1] + kz + 4], [PIV[0] - 2, PIV[1] + 4], [0, PIV[1] + 4]],
      -3, 3, 'yellow', { tf: levTF(), hl: HL.lever, hlPal: 'orange', bias: -2 });
  }
  // konsol depan (lampu MASAK & HANGAT) + kenop tuas (selalu terlihat)
  box(124, 152, -34, 34, 26, 96, 'ink', { bias: -4 });
  blob([146, -14, 97], 5.5, S.on ? '#ff5a4f' : '#6a2f2f', { bias: -5, fill: S.on ? '#ff5a4f' : '#6a2f2f' });
  blob([146, 14, 97], 5.5, S.on ? '#6a5a2f' : '#ffd23f', { bias: -5, fill: S.on ? '#6a5a2f' : '#ffd23f' });
  box(KNOB[0] - 2, KNOB[0] + 16, -14, 14, KNOB[1] - 8, KNOB[1] + 8, 'orange', { tf: levTF(), hl: HL.lever, bias: -6 });
  // uap dari lubang tutup
  if (S.boiling || (S.on && S.T > 90)) for (let i = 0; i < 9; i++) {
    const ph = (t * 0.45 + i / 9) % 1;
    blob([VENT[0] + Math.sin(ph * 5 + i) * 10, Math.cos(i * 2.1) * 6, VENT[2] + 14 + ph * 150], 8 + 22 * ph, 'white', { sw: 2, op: 1 - 0.6 * ph, layer: 1 });
  }
};

// ---------- kamera: [x, y, z, tinggi pandang, elevasi, yaw] ----------
const E = 0.5, Y = 0.38;
SC.camKeys = [
  [0, [0, 0, 120, 1300, 1.25, Y]], [T(0, 'cuma'), [10, 0, 150, 680, E, Y]], [T(0, 'menekan'), [120, 0, 70, 320, 0.45, Y]], [T(0, 'dua'), [10, 0, 160, 640, E, Y]],
  [tKlekA - 0.4, [110, 0, 80, 300, 0.45, Y]], [T(0, 'nasinya'), [110, 0, 85, 320, 0.5, Y]],
  [L[1].s + 0.3, [0, 0, 160, 640, 0.75, Y]], [tReset - 0.1, [0, 0, 150, 600, E, Y]], [L[1].e, [0, 0, 140, 580, 0.45, Y]],
  [T(2, 'panci'), [0, 0, 140, 480, 0.45, Y]], [T(2, 'pemanas'), [0, 0, 75, 360, 0.4, Y]], [T(2, 'sensor'), [0, 0, 58, 180, 0.35, Y]], [T(2, 'tuas'), [100, 0, 45, 280, 0.4, Y]],
  [L[3].s, [0, 0, 56, 150, 0.33, Y]], [T(3, 'magnet'), [0, 0, 50, 130, 0.33, Y]],
  [T(4, 'tuas'), [80, 0, 45, 290, 0.38, Y]], [T(4, 'magnet'), [20, 0, 46, 210, 0.35, Y]], [T(4, 'saklar'), [60, 0, 55, 330, 0.4, Y]],
  [L[5].s, [0, 0, 120, 540, 0.45, Y]], [L[5].e, [0, 0, 110, 520, 0.45, Y]],
  [L[6].s, [0, 0, 40, 600, 0.45, Y]], [L[7].e, [0, 0, 40, 600, 0.45, Y]],
  [T(8, 'airnya'), [0, 0, 20, 420, 0.42, Y]], [L[8].e, [0, 0, 20, 400, 0.42, Y]],
  [L[9].s, [0, 0, 20, 220, 0.35, Y]], [T(9, 'logamnya'), [0, 0, 22, 170, 0.33, Y]],
  [L[10].s, [25, 0, 10, 260, 0.36, Y]], [T(10, 'klek'), [90, 0, 25, 320, 0.4, Y]], [T(10, 'pemanas'), [0, 0, 40, 600, 0.45, Y]],
  [L[11].s + 0.2, [0, 0, 150, 620, 0.6, Y]], [L[11].e, [0, 0, 150, 640, 0.65, Y]],
  [L[12].s, [0, 0, 40, 620, 0.5, Y]], [L[13].e, [0, 0, 40, 620, 0.5, Y]],
  [T(14, 'air'), [0, 0, 110, 440, 0.42, Y]], [T(14, 'logam'), [0, 0, 56, 150, 0.33, Y]], [T(14, 'per'), [60, 0, 40, 280, 0.38, Y]],
  [T(14, 'tuas') + 0.3, [0, 0, 150, 640, 0.6, Y]], [DUR, [0, 0, 120, 1300, 1.2, Y]]];

// ---------- callout (titik dunia) ----------
const knobPt = () => levTF()([KNOB[0] + 16, 0, KNOB[1]]);
tagAdd(T(0, 'tuas') - 0.1, T(0, 'dua'), 'Tuas', knobPt, 'r', 'hi');
tagAdd(T(0, 'lampunya') - 0.1, L[0].e + 0.2, 'Lampu hangat', () => [146, 14, 100], 'r', 'hi');
tagAdd(T(2, 'panci'), T(2, 'pemanas') - 0.1, 'Panci', () => [R_POT, 0, 170], 'r', 'hi');
tagAdd(T(2, 'pemanas'), T(2, 'sensor') - 0.1, 'Pemanas', () => [72, 0, 62], 'r', 'hi');
tagAdd(T(2, 'sensor'), T(2, 'tuas') - 0.1, 'Sensor bulat', () => [R_CAP, 0, 66], 'r', 'hi');
tagAdd(T(2, 'tuas'), L[2].e + 0.2, 'Tuas saklar', knobPt, 'r', 'hi');
tagAdd(T(3, 'per'), T(3, 'magnet') - 0.1, 'Per penekan', () => [16.5, 0, 56], 'r', 'hi');
tagAdd(T(3, 'magnet'), L[3].e + 0.3, 'Magnet kecil', () => magTF()([10, 0, Z_MAG_ON + 5]), 'r', 'hi');
tagAdd(T(4, 'magnet'), T(4, 'saklar') - 0.1, 'Menempel', () => magTF()([10, 0, Z_MAG_ON + 9]), 'r', 'hi');
tagAdd(T(4, 'saklar'), L[4].e + 0.3, 'Pemanas menyala', () => [72, 0, 62], 'r', 'hi');
tagAdd(T(5, 'beras'), L[5].e + 0.2, 'Beras menyerap air', () => [70, 0, Z_FLOOR + S.riceH * 0.6], 'r', '');
tagAdd(T(6, 'air'), L[6].e + 0.3, 'Masih ada air', () => [80, 0, Z_FLOOR + S.waterTop - 2], 'r', 'hi');
tagAdd(T(7, 'menguapkan'), L[7].e, 'Panas → uap', () => [VENT[0], 0, VENT[2] + 20], 'r', '');
tagAdd(T(8, 'habis') - 0.1, L[8].e + 0.3, 'Air habis', () => [80, 0, Z_FLOOR + S.riceH], 'r', 'warn');
tagAdd(T(9, 'logamnya'), L[9].e + 0.3, 'Ferit: lepas magnet', () => [13, 0, 60.5], 'r', 'warn');
tagAdd(T(10, 'per'), T(10, 'tuasnya') - 0.1, 'Per mendorong magnet', () => [5, 0, 18], 'r', 'hi');
tagAdd(T(10, 'tuasnya'), L[10].e + 0.2, 'Tuas terlepas', knobPt, 'r', 'warn');
tagAdd(T(14, 'air'), T(14, 'logam') - 0.1, 'Air ≤ 100 °C', () => [80, 0, Z_FLOOR + S.riceH], 'r', 'hi');
tagAdd(T(14, 'logam'), T(14, 'per') - 0.1, 'Batas suhu', () => [13, 0, 60.5], 'r', 'hi');
tagAdd(T(14, 'per'), T(14, 'tuas') + 0.2, 'Per kecil', () => [5, 0, 18], 'r', 'hi');

SC.chap = 'Kita bongkar · Rice cooker';
SC.titles = [
  [0, '', 'Kok tahu <em>nasinya matang?</em>'], [L[1].s, '', 'Nggak punya <em>mata & timer</em>'],
  [L[2].s, 'Babak 1 · Bagian', '<em>4 bagian</em> penting'], [L[3].s, 'Babak 1 · Sensor', 'Sensor & <em>magnet kecil</em>'],
  [L[5].s, 'Babak 2 · Masak', 'Air <em>mendidih</em>'], [L[6].s, 'Babak 2 · Suhu', 'Tertahan di <em>100 °C</em>'],
  [L[8].s, 'Babak 3 · Rahasia', 'Air habis, <em>suhu naik</em>'], [L[9].s, 'Babak 3 · Rahasia', 'Magnet <em>punya batas</em>'],
  [L[10].s, 'Babak 3 · Rahasia', 'Klek! <em>Pemanas mati</em>'], [L[11].s, '', 'Bukan tahu nasi, tapi <em>tahu air</em>'],
  [L[12].s, 'Bonus · Air kurang', 'Kenapa <em>nasinya keras?</em>'], [L[14].s, '', 'Air · logam · <em>per</em>'],
];
SC.chips = [[0, 'Siaga', GRY], [tPressA, 'Masak', RED], [tKlekA, 'Hangat', YEL], [tReset, 'Dibelah', GRY], [tPressB, 'Masak', RED],
  [tTripB, 'Hangat', YEL], [L[12].s, 'Air kurang', RED], [L[14].s, 'Hangat', YEL]];
SC.stamps = [[tKlekA, L[0].e + 0.2, 'Klek!', 'snd'], [tReset, L[1].e + 0.4, 'Kita bongkar!', 'snd'], [T(10, 'klek'), L[10].e + 0.3, 'Klek!', 'snd']];
SC.shakes = [tKlekA, tReset, tTripB];
SC.segs = [[0, L[2].s], [L[2].s, L[5].s], [L[5].s, L[8].s], [L[8].s, L[11].s], [L[11].s, L[14].s], [L[14].s, DUR]];
SC.readout = t => (t < tReset ? [Math.floor(S.m) + ' mnt', 'waktu masak'] : [Math.round(S.T) + ' °C', 'suhu panci']);
SC.arrows = t => {
  const pushK = Math.max(hlw(t, tPressA - 0.7, tPressA + 0.2), hlw(t, tPressB - 0.7, tPressB + 0.25)), kp = knobPt(), pu = 0.85 + 0.15 * Math.sin(t * 7);
  let s = '';
  if (pushK > 0.02) { const [bx, by] = proj([kp[0] - 8, 0, kp[2] + 8]); s += `<g opacity="${pushK.toFixed(3)}">${arrowSVG(bx, by - 150 * pu, bx, by - 12, INK, 12)}</g>`; }
  s += arrow3(magTF()([-24, 0, Z_MAG_ON - 8]), magTF()([-24, 0, Z_MAG_ON + 12]), GRN, 10, hlw(t, T(4, 'magnet') - 0.2, T(4, 'saklar')));
  s += arrow3([-24, 0, Z_MAG_ON + 10], [-24, 0, Z_MAG_ON - 14], RED, 10, hlw(t, T(10, 'per') - 0.1, T(10, 'tuasnya')));
  s += arrow3([40, 0, 60], [40, 0, Z_FLOOR + S.waterTop + 30], '#f08c2e', 12, hlw(t, T(7, 'panas'), L[7].e));
  return s;
};

// ---------- kartu suhu (kurva dari cook() yang sama) ----------
const GX = m => 90 + m * 34, GY = Tp => (Tp <= 100 ? 312 - (Tp - 20) / 80 * 130 : 182 - (Tp - 100) / 10 * 110);   // sumbu terputus: 100-110 °C diperbesar
const curve = (wf, mEnd, col, w = 5) => { let d = ''; for (let m = 0; m <= mEnd + 1e-6; m += 0.1) d += `${d ? 'L' : 'M'}${GX(m).toFixed(1)} ${GY(cook(m, wf).T).toFixed(1)} `;
  return d ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>` : ''; };
function axes() {
  let s = `<line x1="90" y1="312" x2="910" y2="312" stroke="${INK}" stroke-width="2.5"/><line x1="90" y1="70" x2="90" y2="312" stroke="${INK}" stroke-width="2.5"/>`;
  s += `<line x1="90" y1="${GY(100)}" x2="910" y2="${GY(100)}" stroke="#2f8fa6" stroke-width="2" stroke-dasharray="8 8"/>` + txt(80, GY(100) + 22, '100°', '#2f8fa6', 20, 'end', 800);
  s += `<line x1="90" y1="${GY(TC)}" x2="910" y2="${GY(TC)}" stroke="${RED}" stroke-width="2" stroke-dasharray="4 6"/>` + txt(80, GY(TC) - 6, `${TC}°`, RED, 20, 'end', 800);
  s += `<path d="M84 ${GY(100) + 30} l12 -6 M84 ${GY(100) + 38} l12 -6" stroke="${INK}" stroke-width="2.5"/>`;
  for (const mm of [0, 5, 10, 15, 20]) s += txt(GX(mm), 340, `${mm} mnt`, '#6c6e76', 18, 'middle', 700);
  return s;
}
SC.cards = [
  { on: t => hlw(t, L[6].s - 0.1, L[10].e + 0.3), kicker: 'SUHU PANCI · DARI MODEL', svg: t => {
    const m = Math.min(S.m, MTRIP + 3), c = cook(m);
    let s = axes() + curve(1, m, INK) + `<circle cx="${GX(m)}" cy="${GY(c.T)}" r="10" fill="${S.on ? RED : '#e8b400'}" stroke="#fff" stroke-width="4"/>`;
    s += m >= MTRIP ? txt(GX(m) - 22, GY(c.T) + 10, `${Math.round(c.T)} °C`, INK, 26, 'end') : txt(GX(m) + 18, GY(c.T) - 16, `${Math.round(c.T)} °C`, INK, 26, 'start');
    if (m > 9) s += txt(GX(12.5), GY(100) + 34, 'air mendidih: suhu tertahan', '#2f8fa6', 22, 'middle', 800);
    if (m >= c.boilEnd) s += txt(GX(c.boilEnd) - 8, GY(TC) - 30, 'air habis', '#b07d00', 22, 'end', 800);
    if (m >= MTRIP) s += txt(GX(MTRIP) + 14, GY(TC) - 30, 'klek!', RED, 26, 'start', 900);
    return s + txt(910, GY(TC) + 26, 'batas sensor', RED, 20, 'end', 700); } },
  { on: t => hlw(t, L[12].s, L[13].e + 0.4), kicker: 'AIR CUKUP vs AIR KURANG', svg: t => {
    const k = clamp((t - L[12].s - 0.3) / 2.2), lw = 0.6, cl = cook(0, lw), m1 = lerp(0, MTRIP + 1, k), m2 = lerp(0, cl.mTrip + 1, clamp((t - L[13].s) / 1.6));
    let s = axes() + curve(1, m1, INK, 4) + (t >= L[13].s ? curve(lw, m2, RED, 5) : '');
    s += txt(GX(MTRIP) + 10, GY(106) - 10, 'air cukup', INK, 22, 'start');
    if (m2 >= cl.mTrip) s += txt(GX(cl.mTrip) - 10, GY(106) - 10, 'air kurang: klek lebih cepat', RED, 22, 'end') +
      txt(GX(cl.mTrip) - 10, GY(100) + 44, `beras baru ${Math.round(cook(cl.mTrip, lw).done * 100)}% matang`, RED, 20, 'end', 700);
    return s; } },
];

// ---------- bunyi: dari model (tuas ditekan, tuas lepas, pemanas, mendidih) + cue musik ----------
SC.events = (ev, cue) => {
  const DTs = 1 / 120; let pl = leverAt(0), pb = cook(mAt(0)).boiling, onS = null, bS = null;
  for (let t = DTs; t < DUR; t += DTs) {
    const l = leverAt(t), b = cook(mAt(t)).boiling;
    if (pl < 0.95 && l >= 0.95) { ev.push({ t: +t.toFixed(3), type: 'clack' }); onS = t; }
    if (pl > 0.5 && l <= 0.5) { ev.push({ t: +t.toFixed(3), type: 'snap' }); if (onS !== null) ev.push({ t: +onS.toFixed(3), type: 'hum', dur: +(t - onS).toFixed(2) }); onS = null; }
    if (!pb && b) bS = t;
    if (pb && !b && bS !== null) { ev.push({ t: +bS.toFixed(3), type: 'drone', dur: +(t - bS).toFixed(2) }); bS = null; }
    pl = l; pb = b;
  }
  if (bS !== null) ev.push({ t: +bS.toFixed(3), type: 'drone', dur: 2 });
  ev.push({ t: tReset, type: 'whoosh' }, { t: L[12].s - 0.5, type: 'whoosh' }, { t: DUR - 1.4, type: 'chime' });
  cue('heart', 0); cue('mystery', L[1].s); cue('act1', L[2].s); cue('danger', L[6].s); cue('drop', L[8].s + 0.1); cue('build', L[9].s);
  cue('reveal', L[10].s); cue('warm', L[11].s); cue('dark', L[12].s); cue('resolve', L[14].s); cue('end', DUR);
};
SC.coverPoint = () => [0, 0, 62];
mulai();
