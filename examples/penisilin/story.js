// ---------- story: shots, cameras, actors, fx (pure functions of the frame) ----------
import { THREE, scene, camera, Card, applyLight, setCam, camKeys, look, idle, blinkAt, prog, smoother, easeOut, easeIn, backOut, lerp, lerp3, clamp01, pointA } from './engine.js';
import * as T from './toon.js';
import { lab, LAB, lower, facade, street, STREET, macro, MACRO, room, ROOM, showSets, setBacteria, makeDish, MATS } from './world.js';

export const TOTAL = 2282;
const D2R = Math.PI / 180;
const q = (x, n = 1) => Math.round(x * n) / n;

// ---------- cast ----------
const fig = (o) => (p, s) => T.figure(p, o, s);
const C = {
  flem: new Card(fig(T.FLEMING)), hol: new Card(fig(T.FLEMING_HOLIDAY)), sci2: new Card(fig(T.SCI2)), sci3: new Card(fig(T.SCI3)),
  kid: new Card(fig(T.KIDO)), mom: new Card(fig(T.MOM)),
  folk: Array.from({ length: 8 }, (_, i) => new Card(fig(T.FOLK[i % 4]), { res: 0.8 })),
  moldC: new Card((p, s) => T.critter(p, { col: '#4fb39f', fuzzy: true, seed: 5, ...s }), { shadow: false }),
  bact: Array.from({ length: 3 }, (_, i) => new Card((p, s) => T.critter(p, { col: '#d77aa8', seed: 11 + i, ...s }), { shadow: false, res: 0.8 })),
  fx: Array.from({ length: 3 }, () => new Card((p, s, g) => drawFx(p, s, g), { shadow: false, res: 1 })),
};
for (const k of ['moldC']) C[k].mesh.castShadow = false;
for (const c of [...C.bact, ...C.fx]) c.mesh.castShadow = false;

function drawFx(p, { kind, t }, g) {
  if (kind === 'sparkle') {
    const e = 1 - (1 - t) ** 3;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, r = 60 + 230 * e, x = 300 + r * Math.cos(a), y = 500 + r * Math.sin(a), s = (i % 2 ? 26 : 40) * (1 - t * 0.7);
      p.poly([[x, y - s], [x + s * 0.3, y - s * 0.3], [x + s, y], [x + s * 0.3, y + s * 0.3], [x, y + s], [x - s * 0.3, y + s * 0.3], [x - s, y], [x - s * 0.3, y - s * 0.3]], i % 2 ? '#fff7c2' : '#ffd84a', 6);
    }
    if (t < 0.4) p.ell(300, 500, 80 * (1 - t), 80 * (1 - t), '#ffffff', 8);
  } else if (kind === 'puff') {
    for (let i = 0; i < 6; i++) {
      const a = (200 + i * 50) * D2R, d = 50 + 160 * t, r = (60 + 30 * (i % 2)) * (1 - 0.6 * t);
      p.ell(300 + d * Math.cos(a), 800 + d * 0.5 * Math.sin(a), r, r * 0.8, `rgba(238,232,215,${(1 - t).toFixed(3)})`, 6 * (1 - t));
    }
  } else if (kind === 'question') {
    g.save(); g.font = 'bold 300px Georgia'; g.textAlign = 'center'; g.lineWidth = 18; g.strokeStyle = '#241726'; g.fillStyle = '#ffd84a';
    const y = 560 - 40 * Math.sin(t * Math.PI); g.strokeText('?', 300, y); g.fillText('?', 300, y); g.restore();
  } else if (kind === 'bang') {
    g.save(); g.font = 'bold 320px Georgia'; g.textAlign = 'center'; g.lineWidth = 18; g.strokeStyle = '#241726'; g.fillStyle = '#ff6a4a';
    g.strokeText('!', 300, 600); g.fillText('!', 300, 600); g.restore();
  }
}
const fxAt = (i, kind, t, x, y, z, s = 1) => { if (t < 0 || t > 1) return C.fx[i].hide(); C.fx[i].set({ kind, t: q(t, 30) }).place(x, y, z, { s, blob: false }); };

// ---------- extra props ----------
const sporeMat = new THREE.MeshBasicMaterial({ color: 0xb8ffe8, fog: false });
const spores = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), sporeMat); m.userData.nd = null; m.castShadow = false; scene.add(m); return m; });
const movers = Array.from({ length: 3 }, () => makeDish(lab, [0, 0, 0], 0.09));
const tossDish = makeDish(lab, [0, 0, 0], 0.09);
const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glowMat); halo.userData.nd = null; halo.castShadow = false; scene.add(halo);
const lowerLight = new THREE.PointLight(0x7af0c0, 0, 9, 1.4); lowerLight.position.set(0, -2.2, -1.5); scene.add(lowerLight);

// ---------- helpers ----------
const LW = (x, y, z) => [x, y, z];                        // lab coords (lab at origin)
const MW = (x, y, z) => [x - 100, y, z];                  // macro set
const SW = (x, y, z) => [x + 100, y, z];                  // street
const RW = (x, y, z) => [x + 100, y, z + 100];            // room
const place = (card, pos, state, f, seed, extra = {}) => { const id = idle(f, seed); card.set({ seed, blink: blinkAt(f, seed), ...state }).place(pos[0], pos[1], pos[2], { bob: id.bob, tilt: id.tilt, ...extra }); };
const walkPhase = (f, speed = 0.045) => (f * speed) % 1;

function resetWorld(f) {
  for (const c of Card.all) c.hide();
  look.cInf = 0; look.focus = 5; look.flash = 0;
  LAB.hookBottle.visible = false; LAB.bottleBig.visible = false; LAB.flask.visible = false; LAB.flaskLabel.visible = false;
  LAB.chalkWord.visible = false; LAB.glow.intensity = 0; LAB.doorPivot.rotation.y = 0; LAB.app.visible = false;
  LAB.hero.userData.mold.visible = f >= 800; LAB.hero.userData.mold.scale.setScalar(1);
  LAB.hero.userData.mold.scale.y = 0.45;
  LAB.win.material = LAB.winDay;
  for (const s of LAB.stacks) { s.rotation.x = 0; s.userData.r0 ??= s.rotation.z; s.rotation.z = s.userData.r0; }
  for (const m of [...movers, tossDish]) m.visible = false;
  for (const s of spores) s.visible = false;
  halo.visible = false; lowerLight.intensity = 0; pointA.intensity = 0;
  STREET.banner.visible = true; STREET.cart.visible = false;
  MACRO.ring.visible = false; MACRO.wave.visible = false; MACRO.fence.visible = false; MACRO.mold.scale.setScalar(1); MACRO.mold.visible = true;
  ROOM.glow.intensity = 0;
}

// spore path: from floor vent (or lower lab) up into the hero dish
const VENT = [-0.6, 0.02, -0.1], DISH = [0.35, 1.0, -0.85];
const sporePos = (i, t, fromLower) => {
  const a = fromLower ? [-0.6 + 0.5 * Math.sin(i), -3.0, -1.2 + 0.3 * Math.cos(i * 1.3)] : VENT;
  const mid = fromLower ? [-0.6, 0.1, -0.1] : [0.0, 0.9, -0.2];
  const u = clamp01(t);
  const P1 = u < 0.5 ? lerp3(a, mid, u * 2) : lerp3(mid, DISH, (u - 0.5) * 2);
  const w = 0.12 * (1 - Math.abs(u - 0.5) * 1.2);
  return [P1[0] + w * Math.sin(i * 2.1 + t * 9), P1[1] + 0.05 * Math.sin(i + t * 7), P1[2] + w * Math.cos(i * 1.7 + t * 8)];
};

// ---------- shots ----------
export const SHOTS = [
  // S1 hook: glowing bottle -> Fleming off on holiday
  { a: 0, b: 198, set: ['lab'], fn(f) {
    applyLight('day', [-1.5, 1, -1]);
    LAB.hookBottle.visible = true; LAB.glow.position.set(-1.25, 1.3, -0.6); LAB.glow.intensity = 1.0 + 0.3 * Math.sin(f * 0.2);
    halo.visible = false; halo.position.set(-1.25, 1.12, -0.85); halo.scale.setScalar(0.22 + 0.02 * Math.sin(f * 0.25)); glowMat.opacity = 0.32;
    setCam(camKeys([[0, { p: [-0.95, 1.3, 0.45], t: [-1.25, 1.12, -0.85], fov: 36 }], [108, { p: [-1.02, 1.27, 0.2], t: [-1.25, 1.12, -0.85], fov: 36 }],
      [140, { p: [-1.6, 1.5, 2.6], t: [-2.5, 1.25, -0.3], fov: 40 }], [198, { p: [-2.0, 1.5, 2.5], t: [-3.0, 1.25, -0.6], fov: 40 }]], f));
    look.cInf = f < 125 ? 12 : 6; look.focus = f < 115 ? 1.15 : 3.0;
    if (f < 110) fxAt(0, 'sparkle', ((f % 40) / 40), -1.25, 0.95, -0.82, 0.25);
    const walk = prog(f, 162, 198), x = lerp(-2.5, -3.9, walk), z = lerp(-0.3, -1.5, walk);
    place(C.hol, [x, 0, z], { expr: f > 128 ? 'grin' : 'smile', armR: f > 128 && f < 165 ? 'wave' : 'hang', propL: 'suitcase', f, mode: walk > 0 ? 'walk' : 'stand', phase: walkPhase(f) }, f, 2);
    LAB.doorPivot.rotation.y = -1.2 * smoother(prog(f, 170, 190));
  } },
  // S2a London street
  { a: 198, b: 303, set: ['street'], fn(f) {
    applyLight('fog', SW(0, 0, -8));
    setCam(camKeys([[198, { p: SW(0.5, 10, 12), t: SW(0, 6, -20), fov: 42 }], [262, { p: SW(0, 2.2, 8.5), t: SW(0, 5.2, -14), fov: 42 }], [303, { p: SW(0, 2.0, 7.6), t: SW(0, 5.0, -14), fov: 42 }]], f));
    const lanes = [[-5.2, 1, 0], [4.8, -1, 1], [-1.5, 1, 2], [2.4, -1, 3], [-6.0, -1, 0], [5.6, 1, 1]];
    lanes.forEach(([x, dir, k], i) => { const z = -4 - i * 2.5 + dir * (f - 198) * 0.035; place(C.folk[i], SW(x, 0.12, z), { mode: 'walk', phase: walkPhase(f + i * 7, 0.05), expr: i % 2 ? 'smile' : 'neutral', f }, f, 20 + i); });
  } },
  // S2b genius ... and messy
  { a: 303, b: 434, set: ['lab'], fn(f) {
    applyLight('day', [1, 1, -1.5]);
    setCam(camKeys([[303, { p: [1.95, 1.6, 0.6], t: [1.75, 1.5, -2.15], fov: 36 }], [366, { p: [1.85, 1.6, 0.35], t: [1.75, 1.52, -2.15], fov: 36 }],
      [394, { p: [0.4, 3.4, 5.0, ], t: [0.6, 1.0, -1.4], fov: 44, e: 'out' }], [434, { p: [0.2, 3.5, 4.7], t: [0.6, 1.0, -1.4], fov: 44 }]], f));
    look.cInf = f < 370 ? 10 : 0; look.focus = 2.8;
    const messy = f >= 372;
    place(C.flem, [1.6, 0, -2.15], { expr: messy ? (f > 386 ? 'nervous' : 'shock') : 'smile', armR: !messy && f > 322 ? 'thumb' : messy ? 'shrug' : 'hang', armL: messy ? 'shrug' : 'hang' }, f, 1);
    if (messy) LAB.stacks.forEach((s, i) => { const w = Math.exp(-(f - 372) / 25) * Math.sin((f - 372) * 0.5 + i); s.rotation.z = s.userData.r0 + 0.12 * w; s.rotation.x = 0.06 * w * Math.cos(i); });
    if (f > 336 && f < 372) fxAt(0, 'sparkle', prog(f, 336, 362), 1.95, 2.1, -2.0, 0.35);
  } },
  // S3a calendar
  { a: 434, b: 487, set: ['lab'], fn(f) {
    applyLight('day', [-4, 1, 0.5]);
    setCam(camKeys([[434, { p: [-2.7, 1.65, 3.3], t: [-4.35, 1.6, 0.6], fov: 40 }], [487, { p: [-2.85, 1.65, 3.0], t: [-4.4, 1.62, 0.6], fov: 40 }]], f));
    place(C.flem, [-4.05, 0, 1.25], { expr: 'grin', armL: f > 446 ? 'point' : 'hang', armR: 'hang' }, f, 1);
  } },
  // S3b insert: stacks of dishes on the bench
  { a: 487, b: 588, set: ['lab'], fn(f) {
    applyLight('day', [0, 1, -1]);
    setCam(camKeys([[487, { p: [-2.1, 1.16, -0.35], t: [-1.6, 1.02, -1.25], fov: 38, e: 'lin' }], [560, { p: [-0.3, 1.16, -0.35], t: [0.0, 1.02, -1.35], fov: 38, e: 'lin' }], [588, { p: [-0.1, 1.12, -0.75], t: [0.0, 1.03, -1.45], fov: 36 }]], f));
    look.cInf = 10; look.focus = 0.95;
  } },
  // S3c not tidied, not thrown away -> leaves
  { a: 588, b: 664, set: ['lab'], fn(f) {
    applyLight('day', [-3, 1, -0.5]);
    setCam(camKeys([[588, { p: [-1.0, 1.6, 3.6], t: [-2.9, 1.3, -0.5], fov: 40 }], [664, { p: [-1.3, 1.6, 3.3], t: [-3.4, 1.3, -0.9], fov: 40 }]], f));
    const walk = prog(f, 625, 652);
    place(C.hol, [lerp(-2.6, -4.4, walk), 0, lerp(0.1, -1.8, walk)], { expr: f < 622 ? 'whistle' : 'grin', armR: f < 622 ? 'shrug' : 'hang', armL: f < 622 ? 'hang' : 'hang', propL: 'suitcase', mode: walk > 0 && walk < 1 ? 'walk' : 'stand', phase: walkPhase(f), f }, f, 2, { show: f < 650 });
    LAB.doorPivot.rotation.y = -1.2 * (smoother(prog(f, 618, 630)) - easeIn(prog(f, 648, 656)));
  } },
  // S4a night: spores drift in
  { a: 664, b: 741, set: ['lab'], fn(f) {
    applyLight('night', [0, 1, -1]); LAB.win.material = LAB.winNight;
    setCam(camKeys([[664, { p: [1.5, 1.05, 2.3], t: [-0.1, 0.55, -0.5], fov: 40 }], [741, { p: [1.25, 1.05, 1.9], t: [-0.05, 0.6, -0.5], fov: 40 }]], f));
    pointA.position.set(-0.5, 0.6, -0.2); pointA.color.set(0x7af0c0); pointA.intensity = 1.5 * prog(f, 700, 720);
    spores.forEach((s, i) => { const t = (f - 705 - i * 3) / 90; if (t < 0 || t > 1) return; s.visible = true; s.position.set(...sporePos(i, t, false)); s.scale.setScalar(0.018); });
  } },
  // S4b pull back to the dollhouse: spores rising from the lab downstairs
  { a: 741, b: 831, set: ['lab', 'lower', 'facade'], fn(f) {
    applyLight('night', [0, -1, -1]); LAB.win.material = LAB.winNight;
    setCam(camKeys([[741, { p: [1.25, 1.05, 1.9], t: [-0.05, 0.6, -0.5], fov: 40 }], [790, { p: [0.4, -0.4, 14.5], t: [0, -0.6, -1], fov: 42 }], [831, { p: [0.3, -0.5, 15.5], t: [0, -0.6, -1], fov: 42 }]], f));
    lowerLight.intensity = 3 * prog(f, 745, 770); pointA.position.set(-0.5, 0.6, -0.2); pointA.color.set(0x7af0c0); pointA.intensity = 1.2;
    const big = smoother(prog(f, 745, 790));
    spores.forEach((s, i) => { const t = ((f - 741 + i * 7) % 80) / 80; s.visible = true; s.position.set(...sporePos(i, t, true)); s.scale.setScalar(lerp(0.02, 0.07, big)); });
  } },
  // S5a he comes back
  { a: 831, b: 876, set: ['lab'], fn(f) {
    applyLight('day', [-3, 1, -0.5]);
    look.flash = 1 - prog(f, 831, 838);
    setCam(camKeys([[831, { p: [-0.8, 1.6, 3.6], t: [-3.1, 1.3, -0.8], fov: 40 }], [876, { p: [-1.0, 1.6, 3.3], t: [-2.8, 1.3, -0.6], fov: 40 }]], f));
    LAB.doorPivot.rotation.y = -1.2 * (smoother(prog(f, 831, 842)) - smoother(prog(f, 862, 872)));
    const walk = prog(f, 836, 866);
    place(C.hol, [lerp(-4.4, -2.6, walk), 0, lerp(-1.8, -0.2, walk)], { expr: 'grin', armR: walk >= 1 ? 'wave' : 'hang', propL: 'suitcase', mode: walk > 0 && walk < 1 ? 'walk' : 'stand', phase: walkPhase(f), f }, f, 2);
  } },
  // S5b sorting dishes into the sink
  { a: 876, b: 957, set: ['lab'], fn(f) {
    applyLight('day', [1.5, 1, -1.5]);
    setCam(camKeys([[876, { p: [2.0, 1.8, 2.7], t: [1.6, 1.2, -1.4], fov: 42 }], [957, { p: [1.7, 1.78, 2.2], t: [1.4, 1.25, -1.5], fov: 42 }]], f));
    place(C.flem, [0.9, 0, -2.15], { expr: 'whistle', armR: 'toss', propR: (f % 25) < 12 ? 'dish' : null, armL: 'hang' }, f, 1);
    movers.forEach((m, i) => {
      const t = prog(f, 880 + i * 24, 902 + i * 24); if (t <= 0) return;
      const a = [1.1, 1.85, -1.95], b = [3.8, 1.0, -1.2];
      m.visible = true; m.position.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t) + 0.9 * Math.sin(t * Math.PI), lerp(a[2], b[2], t)); m.rotation.set(t * 6, 0, t * 3);
    });
  } },
  // S5c ... then he stopped
  { a: 957, b: 1017, set: ['lab'], fn(f) {
    applyLight('day', [0.6, 1, -1.8]);
    setCam(camKeys([[957, { p: [0.75, 1.62, 0.9], t: [0.6, 1.55, -2.15], fov: 38 }], [1000, { p: [0.65, 1.62, -0.45], t: [0.6, 1.6, -2.15], fov: 36, roll: 3 }], [1017, { p: [0.64, 1.62, -0.55], t: [0.6, 1.6, -2.15], fov: 36, roll: 3.5 }]], f));
    look.cInf = 10; look.focus = lerp(3.0, 1.7, smoother(prog(f, 957, 1000)));
    place(C.flem, [0.6, 0, -2.15], { expr: f < 970 ? 'neutral' : 'shock', armR: 'hold', propR: 'dishMold', armL: 'hang' }, f, 1, { bob: 0, tilt: 0 });
    if (f >= 970 && f < 990) fxAt(0, 'bang', 0.5, 1.05, 1.75, -2.05, 0.3);
  } },
  // S6 macro: mold, bacteria vanish, protective ring
  { a: 1017, b: 1258, set: ['macro'], fn(f) {
    applyLight('day', MW(0, 0, 0));
    const mc = MACRO.moldC;
    setCam(camKeys([[1017, { p: MW(0.6, 6.8, 4.6), t: MW(0.45, 0.4, -0.3), fov: 40 }], [1090, { p: MW(0.8, 5.2, 4.0), t: MW(0.5, 0.4, -0.3), fov: 40 }],
      [1170, { p: MW(2.9, 2.6, 2.9), t: MW(0.5, 0.45, -0.3), fov: 40 }], [1258, { p: MW(-1.6, 2.4, 3.4), t: MW(0.5, 0.5, -0.3), fov: 40 }]], f));
    look.cInf = f > 1150 ? 8 : 0; look.focus = 3.6;
    const g = backOut(prog(f, 1045, 1068)); MACRO.mold.scale.setScalar(Math.max(0.001, g));
    const R = 1.05 * smoother(prog(f, 1110, 1165));
    setBacteria((b) => { const d = Math.hypot(b.x - mc[0], b.z - mc[2]); if (d < 0.55) return 0.001; return d < R ? Math.max(0.001, 1 - (R - d) * 4) : 1; });
    if (f > 1168 && f < 1200) fxAt(0, 'sparkle', prog(f, 1170, 1198), ...MW(mc[0], 0.6, mc[2] + 0.3), 0.8);
    if (f > 1198) { MACRO.ring.visible = true; const k = backOut(prog(f, 1200, 1218)); MACRO.ring.scale.set(1.1 * k, 1.1 * k, 1); MACRO.ring.material.opacity = 0.65 + 0.3 * Math.sin(f * 0.3); }
  } },
  // S7a another scientist would just throw it away
  { a: 1258, b: 1328, set: ['lab'], fn(f) {
    applyLight('day', [2, 1, 0.5]);
    setCam(camKeys([[1258, { p: [1.0, 1.55, 3.9], t: [2.2, 1.15, 0.4], fov: 40 }], [1328, { p: [1.2, 1.5, 3.6], t: [2.3, 1.1, 0.45], fov: 40 }]], f));
    const thrown = f >= 1290;
    place(C.sci2, [1.75, 0, 0.55], { expr: thrown ? 'grin' : 'stern', armR: 'toss', propR: thrown ? null : 'dish', armL: 'hip' }, f, 3);
    if (thrown) { const t = prog(f, 1290, 1306); if (t < 1) { tossDish.visible = true; tossDish.position.set(lerp(2.15, 2.6, t), lerp(1.95, 0.6, t) + 0.7 * Math.sin(t * Math.PI), lerp(0.55, 0.6, t)); tossDish.rotation.set(t * 9, 0, t * 4); } }
    fxAt(0, 'puff', prog(f, 1305, 1325), 2.6, 0.3, 0.7, 0.45);
  } },
  // S7b Fleming got curious
  { a: 1328, b: 1401, set: ['lab'], fn(f) {
    applyLight('day', [0.3, 1, -0.1]);
    setCam(camKeys([[1328, { p: [0.4, 1.6, 1.7], t: [0.3, 1.52, -0.1], fov: 34 }], [1401, { p: [0.38, 1.62, 1.2], t: [0.3, 1.56, -0.1], fov: 34 }]], f));
    look.cInf = 9; look.focus = 1.4;
    place(C.flem, [0.3, 0, -0.1], { expr: f > 1356 ? 'whistle' : 'neutral', armR: 'magnify', propR: 'magnifier', armL: 'hold', propL: 'dishMold', headTilt: f > 1356 ? 6 : 0 }, f, 1);
    if (f > 1356) fxAt(0, 'question', prog(f, 1356, 1400), -0.05, 1.45, 0.0, 0.25);
  } },
  // S8a he grows the mould: "mould juice"
  { a: 1401, b: 1516, set: ['lab'], fn(f) {
    applyLight('day', [-0.5, 1, -1.5]);
    setCam(camKeys([[1401, { p: [-0.2, 1.5, 1.6], t: [-0.5, 1.3, -1.4], fov: 40 }], [1446, { p: [-0.25, 1.45, 1.1], t: [-0.5, 1.25, -1.3], fov: 40 }], [1478, { p: [-0.48, 1.12, 0.12], t: [-0.5, 1.07, -0.8], fov: 36 }], [1516, { p: [-0.48, 1.12, 0.05], t: [-0.5, 1.07, -0.8], fov: 36 }]], f));
    look.cInf = f > 1460 ? 10 : 6; look.focus = f > 1460 ? 0.88 : 2.5;
    LAB.flask.visible = true; const lv = 0.25 + 0.75 * smoother(prog(f, 1405, 1460)); LAB.flask.userData.liq.scale.set(lv, lv, lv); LAB.flask.userData.liq.position.y = 0.06 * lv - 0.01;
    LAB.flaskLabel.visible = f > 1455; LAB.flaskLabel.scale.setScalar(backOut(prog(f, 1455, 1468)) || 0.001);
    place(C.flem, [-0.05, 0, -2.15], { expr: f > 1440 ? 'grin' : 'smile', armL: 'chin', armR: f > 1440 ? 'point' : 'hang' }, f, 1);
  } },
  // S8b chalkboard: PENICILLIUM
  { a: 1516, b: 1576, set: ['lab'], fn(f) {
    applyLight('day', [3, 1, -3]);
    setCam(camKeys([[1516, { p: [3.1, 1.75, -0.3], t: [3.3, 1.78, -3.95], fov: 40 }], [1576, { p: [3.15, 1.75, -0.6], t: [3.3, 1.78, -3.95], fov: 40 }]], f));
    LAB.chalkWord.visible = true; const w = Math.max(0.001, smoother(prog(f, 1522, 1558)));
    LAB.chalkWord.scale.set(w * 0.7, 0.7, 1); LAB.chalkWord.position.x = 3.3 - (1 - w) * 0.77;
    place(C.flem, [2.6, 0, -3.25], { expr: 'grin', armR: 'pointUp', armL: 'hang' }, f, 1);
  } },
  // S8c ... we know it as penicillin
  { a: 1576, b: 1669, set: ['lab'], fn(f) {
    applyLight('day', [-0.5, 1, -1]);
    setCam(camKeys([[1576, { p: [-0.5, 1.22, 0.15], t: [-0.5, 1.1, -0.9], fov: 38 }], [1669, { p: [-0.5, 1.18, -0.2], t: [-0.5, 1.12, -0.9], fov: 38, roll: -2 }]], f));
    look.cInf = 10; look.focus = 0.95;
    const pop = f >= 1612;
    LAB.flask.visible = !pop; LAB.flask.userData.liq.scale.setScalar(1); LAB.flaskLabel.visible = !pop; LAB.flaskLabel.scale.setScalar(1);
    LAB.bottleBig.visible = pop; LAB.bottleBig.scale.setScalar(pop ? backOut(prog(f, 1612, 1626)) : 1);
    LAB.glow.position.set(-0.5, 1.3, -0.6); LAB.glow.intensity = pop ? 1.0 + 0.3 * Math.sin(f * 0.2) : 0;
    fxAt(0, 'sparkle', prog(f, 1612, 1640), -0.5, 0.9, -0.82, 0.3);
    place(C.flem, [-0.5, 0, -2.15], { expr: pop ? 'grin' : 'smile', armL: 'hang', armR: pop ? 'thumb' : 'hang' }, f, 1);
  } },
  // S9 the analogy: a neighbour who won't share the yard
  { a: 1669, b: 1927, set: ['macro'], fn(f) {
    applyLight('night', MW(0, 0, 0));
    const mc = MACRO.moldC;
    setCam(camKeys([[1669, { p: MW(0.6, 2.4, 5.2), t: MW(0.5, 0.7, 0.0), fov: 40 }], [1780, { p: MW(0.9, 1.9, 4.4), t: MW(0.5, 0.75, 0.0), fov: 40 }], [1840, { p: MW(0.6, 2.2, 5.0), t: MW(0.5, 0.7, 0.0), fov: 40 }], [1927, { p: MW(0.2, 2.0, 4.6), t: MW(0.5, 0.75, 0.0), fov: 40 }]], f, 1.4));
    setBacteria((b) => { const d = Math.hypot(b.x - mc[0], b.z - mc[2]); return d < 1.25 ? 0.001 : 1; });
    MACRO.ring.visible = true; MACRO.ring.scale.set(1.1, 1.1, 1); MACRO.ring.material.opacity = 0.4;
    MACRO.fence.visible = f > 1690; MACRO.fence.scale.set(1, Math.max(0.001, backOut(prog(f, 1692, 1716))), 1);
    const smug = f > 1830;
    MACRO.mold.visible = false;
    place(C.moldC, MW(mc[0], 0.4, mc[2]), { expr: f > 1700 ? (smug ? 'smile_closed' : 'stern') : 'neutral', squash: q(0.04 * Math.sin(f * 0.15), 100) }, f, 5, { s: 0.95, blob: false });
    // bacteria critters approach, get pushed back, shrink
    const wv = prog(f, 1795, 1830);
    if (wv > 0 && wv < 1) { MACRO.wave.visible = true; MACRO.wave.scale.set(lerp(0.6, 2.4, wv), lerp(0.6, 2.4, wv), 1); MACRO.wave.material.opacity = 0.55 * (1 - wv); }
    for (let i = 0; i < 3; i++) {
      const ang = (-55 + i * 55) * D2R + Math.PI / 2;
      const approach = smoother(prog(f, 1700 + i * 8, 1772)), push = backOut(prog(f, 1808, 1826)), shrink = smoother(prog(f, 1855, 1890));
      const r = lerp(2.5, 1.45, approach) + 1.1 * push;
      const x = mc[0] + Math.cos(ang) * r, z = mc[2] + Math.sin(ang) * r;
      const expr = push > 0.05 ? (shrink > 0.3 ? 'dazed' : 'shock') : 'grin';
      place(C.bact[i], MW(x, 0.42, z), { expr, squash: q(0.06 * Math.sin(f * 0.3 + i), 100) }, f, 11 + i, { s: lerp(0.5, 0.25, shrink), blob: false });
    }
  } },
  // S10a years later: other scientists purify it
  { a: 1927, b: 2027, set: ['lab'], fn(f) {
    applyLight('golden', [0, 1, -1]);
    look.flash = 1 - prog(f, 1927, 1934);
    setCam(camKeys([[1927, { p: [-0.05, 1.75, 2.6], t: [0.0, 1.3, -1.3], fov: 42 }], [2027, { p: [-0.05, 1.65, 1.8], t: [0.0, 1.25, -1.3], fov: 42 }]], f));
    LAB.app.visible = true;
    LAB.prodBottles.forEach((b, i) => { const k = backOut(prog(f, 1972 + i * 5, 1984 + i * 5)); b.visible = k > 0.01; b.scale.setScalar(Math.max(0.001, k)); });
    LAB.glow.position.set(0.5, 1.4, -0.8); LAB.glow.intensity = 2.5 * prog(f, 1985, 2005);
    const done = f > 1998;
    place(C.sci3, [-0.42, 0, -2.15], { expr: done ? 'laugh' : 'neutral', armR: done ? 'cheer' : 'holdHigh', propR: done ? null : 'flask', armL: done ? 'cheer' : 'hang', f }, f, 4);
    place(C.sci2, [0.42, 0, -2.2], { expr: done ? 'grin' : 'smile', armR: done ? 'thumb' : 'hang', armL: 'hip' }, f, 3);
    if (done) fxAt(0, 'sparkle', prog(f, 1999, 2024), 0.6, 0.8, -1.0, 0.45);
  } },
  // S10b ... and saved millions of lives
  { a: 2027, b: 2121, set: ['street'], fn(f) {
    applyLight('golden', SW(1, 0, -6));
    STREET.banner.visible = false; STREET.cart.visible = true;
    setCam(camKeys([[2027, { p: SW(1.2, 1.5, 0.8), t: SW(1.4, 1.3, -6), fov: 42 }], [2121, { p: SW(1.0, 4.6, 5.2), t: SW(1.4, 1.1, -6.5), fov: 44 }]], f));
    const spots = [[-0.6, -4.6], [0.6, -4.3], [2.4, -4.5], [3.4, -5.4], [-1.6, -5.6], [-0.4, -7.5], [1.4, -8.0], [3.0, -7.6]];
    spots.forEach(([x, z], i) => {
      const on = f > 2027 + i * 4;
      place(C.folk[i], SW(x, 0.12, z), { expr: i % 2 ? 'laugh' : 'grin', armR: on ? 'cheer' : 'hang', armL: on && i % 3 ? 'cheer' : 'hang', propR: on && i % 3 === 0 ? 'bottle' : null, f: f + i * 5 }, f, 20 + i, { bob: on ? 0.03 * Math.abs(Math.sin(f * 0.25 + i)) : 0 });
    });
  } },
  // S11 twist: tell mum you're waiting for the Nobel
  { a: 2121, b: TOTAL, set: ['room'], fn(f) {
    applyLight('day', RW(0.5, 1, -2.5));
    const keys = [[2121, { p: RW(0.2, 1.55, 2.4), t: RW(0.3, 1.1, -2.3), fov: 42 }], [2186, { p: RW(0.25, 1.5, 2.1), t: RW(0.3, 1.1, -2.3), fov: 42 }],
      [2200, { p: RW(0.65, 1.3, -0.5), t: RW(0.6, 1.2, -2.3), fov: 38, e: 'out' }], [2216, { p: RW(0.65, 1.3, -0.6), t: RW(0.6, 1.2, -2.3), fov: 38 }],
      [2240, { p: RW(1.28, 1.12, -2.25), t: RW(1.35, 0.9, -2.95), fov: 38, roll: 4 }], [2250, { p: RW(0.9, 1.35, -0.4), t: RW(0.75, 1.45, -2.3), fov: 40, e: 'out' }], [TOTAL, { p: RW(0.88, 1.36, -0.25), t: RW(0.75, 1.45, -2.3), fov: 40 }]];
    setCam(camKeys(keys, f));
    look.cInf = f >= 2189 ? 10 : 0; look.focus = f >= 2216 && f < 2245 ? 0.75 : 1.9;
    ROOM.glow.intensity = f >= 2216 ? 2.0 + 0.5 * Math.sin(f * 0.3) : 0;
    const medal = f >= 2245;
    place(C.mom, RW(-0.2, 0, -1.3), { expr: f < 2189 ? 'stern' : 'nervous', armR: f < 2189 ? 'point' : 'hip', armL: 'hip' }, f, 6);
    place(C.kid, RW(0.75, 0, -2.3), { expr: f < 2189 ? 'nervous' : 'grin', armR: medal ? 'lift' : f >= 2189 ? 'thumb' : 'hang', propR: medal ? 'medal' : null, armL: 'hang' }, f, 7);
    if (medal) fxAt(0, 'sparkle', prog(f, 2247, 2275), ...RW(1.05, 1.35, -2.2), 0.35);
  } },
];

const SETMAP = { lab: [lab], lower: [lower], facade: [facade], street: [street], macro: [macro], room: [room] };
export function update(f) {
  resetWorld(f);
  const s = SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];
  showSets(...s.set);
  s.fn(f);
}
