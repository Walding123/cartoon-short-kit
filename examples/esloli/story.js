// ---------- story: "es loli" (1905, Frank lupa membereskan gelasnya) ----------
import { THREE, scene, Card, applyLight, setCam, camKeys, look, idle, blinkAt, prog, smoother, easeOut, easeIn, backOut, lerp, lerp3, clamp01, pointA, toon, basic, add, tbox, group } from './engine.js';
import * as T from './toon.js';
import * as P from './paint.js';
import { lab, LAB, street, STREET, room, ROOM, showSets, MATS } from './world.js';

export const TOTAL = 1426;
const D2R = Math.PI / 180;
const q = (x, n = 1) => Math.round(x * n) / n;
const M = MATS;
const cyl = (rt, rb, h, n = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
const sph = (r, a = 12, b = 8) => new THREE.SphereGeometry(r, a, b);
const plane = (w, h, mat, pos, rot, parent, opts = { cast: false }) => add(new THREE.PlaneGeometry(w, h), mat, pos, rot, parent, opts);

// ---------- cast ----------
const FRANK_KID = { jacket: '#4f9a5a', pants: '#7a5a3a', boots: '#5a3b2a', hat: 'cap', cap: '#d0453f', build: 'kid', skin: '#f1c9a0' };
const FRANK = { jacket: '#4f9a5a', pants: '#3b3f52', boots: '#3a2a22', hat: 'cap', cap: '#d0453f', moustache: '#6a4a2a', skin: '#f1c9a0', shirt: '#f7f3e8' };
const DAUGHTER = { jacket: '#f0b84a', pants: '#3b3f52', boots: '#5a3b2a', hat: 'bun', hair: '#5a3a22', dress: '#f0b84a', build: 'kid', skin: '#f1c9a0' };
const SON = { jacket: '#5aa0c9', pants: '#e8a23a', boots: '#f4f1ea', hat: 'hair', hair: '#5a3a22', build: 'kid', skin: '#f1c9a0' };
const FRIEND2 = { jacket: '#9a7ac9', pants: '#3b3f52', boots: '#2b2222', hat: 'hair', hair: '#2b2222', build: 'kid', skin: '#c99067' };
const fig = (o) => (p, s) => T.figure(p, o, s);
const C = {
  fk: new Card(fig(FRANK_KID)), fa: new Card(fig(FRANK)), dau: new Card(fig(DAUGHTER)), son: new Card(fig(SON)),
  fr1: new Card(fig(T.FOLK[3])), fr2: new Card(fig(FRIEND2)),
  folk: Array.from({ length: 8 }, (_, i) => new Card(fig(T.FOLK[i % 4]), { res: 0.8 })),
  fx: Array.from({ length: 2 }, () => new Card((p, s, g) => drawFx(p, s, g), { shadow: false, res: 1 })),
};
for (const c of C.fx) c.mesh.castShadow = false;

function drawFx(p, { kind, t }, g) {
  if (kind === 'sparkle') {
    const e = 1 - (1 - t) ** 3;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, r = 60 + 230 * e, x = 300 + r * Math.cos(a), y = 500 + r * Math.sin(a), s = (i % 2 ? 26 : 40) * (1 - t * 0.7);
      p.poly([[x, y - s], [x + s * 0.3, y - s * 0.3], [x + s, y], [x + s * 0.3, y + s * 0.3], [x, y + s], [x - s * 0.3, y + s * 0.3], [x - s, y], [x - s * 0.3, y - s * 0.3]], i % 2 ? '#fff7c2' : '#ffd84a', 6);
    }
    if (t < 0.4) p.ell(300, 500, 80 * (1 - t), 80 * (1 - t), '#ffffff', 8);
  } else if (kind === 'question') {
    g.save(); g.font = 'bold 300px Georgia'; g.textAlign = 'center'; g.lineWidth = 18; g.strokeStyle = '#241726'; g.fillStyle = '#ffd84a';
    const y = 560 - 40 * Math.sin(t * Math.PI); g.strokeText('?', 300, y); g.fillText('?', 300, y); g.restore();
  } else if (kind === 'bang') {
    g.save(); g.font = 'bold 320px Georgia'; g.textAlign = 'center'; g.lineWidth = 18; g.strokeStyle = '#241726'; g.fillStyle = '#ff6a4a';
    const s = 0.7 + 0.3 * backOut(Math.min(1, t * 3)); g.translate(300, 600); g.scale(s, s); g.strokeText('!', 0, 0); g.fillText('!', 0, 0); g.restore();
  }
}
const fxAt = (i, kind, t, x, y, z, s = 1) => { if (t < 0 || t > 1) return C.fx[i].hide(); C.fx[i].set({ kind, t: q(t, 30) }).place(x, y, z, { s, blob: false }); };

// ---------- porch set (new, at x+200) ----------
const porch = group([200, 0, 0]);
const PW = (x, y, z) => [x + 200, y, z];
const PR = {};
{
  const G = porch;
  const siding = toon('#ffffff', P.planks('#e3cfa0', 41)), grass = toon('#ffffff', P.plaster('#8cc06a', 51)), trim = toon('#f6f3ea');
  tbox(9, 0.3, 5.2, M.floorWood, [0, -0.15, -1], G, 1);
  tbox(70, 0.2, 70, grass, [0, -0.45, -5], G, 0.3);
  tbox(9, 3.8, 0.3, siding, [0, 1.9, -3.5], G, 1);
  tbox(9, 3.8, 5, siding, [0, 1.9, -6.2], G, 1);
  const rf = add(new THREE.ConeGeometry(6.9, 2.6, 4, 1), M.roof, [0, 5.1, -5.2], [0, Math.PI / 4, 0], G); rf.scale.set(1, 1, 0.62);
  tbox(9.6, 0.12, 1.4, M.roof, [0, 3.35, -2.85], G, 1, { rot: [0.25, 0, 0] });                  // awning
  tbox(1.1, 2.2, 0.08, M.door, [-1.7, 1.1, -3.32], G, 1); tbox(1.3, 0.1, 0.12, trim, [-1.7, 2.25, -3.3], G, 1);
  add(sph(0.05), M.brass, [-1.3, 1.1, -3.25], [0, 0, 0], G);
  PR.winDay = toon('#ffffff', P.windowTex('#bfe0f0')); PR.winNight = toon('#ffffff', P.windowTex('#25365e', '#d9d4c6', true));
  PR.wins = [plane(1.2, 1.5, PR.winDay, [1.3, 1.75, -3.33], [0, 0, 0], G), plane(1.0, 1.3, PR.winDay, [-3.4, 1.8, -3.33], [0, 0, 0], G)];
  tbox(1.4, 0.1, 0.2, trim, [1.3, 0.95, -3.28], G, 1);
  // flower box under window
  tbox(1.2, 0.22, 0.25, toon('#c0553a'), [1.3, 0.8, -3.2], G, 1);
  for (let i = 0; i < 6; i++) add(sph(0.07), toon(i % 2 ? '#f2c230' : '#e05a8a'), [0.85 + i * 0.18, 0.95, -3.2], [0, 0, 0], G, { cast: false });
  // side railings + posts
  for (const x of [-4.3, 4.3]) {
    for (const z of [-3.2, 1.4]) tbox(0.16, 3.3, 0.16, trim, [x, 1.65, z], G, 1);
    tbox(0.08, 0.08, 4.6, trim, [x, 0.95, -0.9], G, 1);
    for (let k = 0; k < 11; k++) tbox(0.05, 0.9, 0.05, trim, [x, 0.45, -3.0 + k * 0.42], G, 1);
  }
  tbox(2.2, 0.15, 0.5, M.floorWood, [0, -0.22, 1.85], G, 1);
  // trees around
  const leaf = toon('#4f9a5a'), leaf2 = toon('#3f8a52'), trunk = toon('#7a5a3a');
  for (const [x, z, s] of [[-7, -1, 1.2], [7.5, 0.5, 1.0], [-9, -6, 1.5], [9, -7, 1.4], [-6.5, 4, 0.9], [6, 5, 1.1]]) {
    add(cyl(0.12 * s, 0.16 * s, 1.6 * s, 8), trunk, [x, 0.8 * s - 0.35, z], [0, 0, 0], G);
    add(sph(1.1 * s, 14, 10), x > 0 ? leaf : leaf2, [x, 2.1 * s - 0.35, z], [0, 0, 0], G).scale.y = 1.15;
  }
  // little round table
  const tb = group([0.55, 0, -0.5], G);
  add(cyl(0.38, 0.38, 0.05, 28), M.shelf, [0, 0.6, 0], [0, 0, 0], tb);
  add(cyl(0.04, 0.06, 0.58, 10), M.dark, [0, 0.3, 0], [0, 0, 0], tb);
  add(cyl(0.22, 0.25, 0.04, 16), M.dark, [0, 0.02, 0], [0, 0, 0], tb);
  // the glass
  const gl = group([0.55, 0.625, -0.5], G); PR.gl = gl;
  add(cyl(0.062, 0.054, 0.17, 28, true), toon('#e4f6fa', null, { transparent: true, opacity: 0.28, name: 'cup' }), [0, 0.085, 0], [0, 0, 0], gl, { cast: false });
  add(cyl(0.054, 0.054, 0.014, 24), M.glassRim, [0, 0.007, 0], [0, 0, 0], gl, { cast: false });
  add(new THREE.TorusGeometry(0.062, 0.004, 6, 28), M.glassRim, [0, 0.17, 0], [Math.PI / 2, 0, 0], gl, { cast: false });
  PR.pop = group([0, 0, 0], gl);
  PR.liqMat = toon('#dfeff2', null, { transparent: true, opacity: 0.65, name: 'liq' });
  PR.liq = add(cyl(0.052, 0.047, 0.13, 24), PR.liqMat, [0, 0.079, 0], [0, 0, 0], PR.pop, { cast: false });
  PR.stick = tbox(0.02, 0.26, 0.007, toon('#d9b27a'), [0, 0.2, 0], PR.pop, 1);
  PR.frostMat = basic('#eef8ff', { transparent: true, opacity: 0, depthWrite: false });
  PR.frost = add(cyl(0.066, 0.058, 0.174, 28, true), PR.frostMat, [0, 0.087, 0], [0, 0, 0], gl, { cast: false }); PR.frost.userData.nd = null;
  PR.frostTop = add(new THREE.CircleGeometry(0.05, 20), basic('#ffffff', { transparent: true, opacity: 0.0, depthWrite: false }), [0, 0.146, 0], [-Math.PI / 2, 0, 0], PR.pop, { cast: false }); PR.frostTop.userData.nd = null;
}
const GL = [200.55, 0.625, -0.5];                                   // glass base, world
const powder = Array.from({ length: 22 }, () => { const m = add(sph(0.007, 6, 4), basic('#f6b26a'), [0, 0, 0], [0, 0, 0], scene, { cast: false }); m.userData.nd = null; return m; });
const crystals = Array.from({ length: 26 }, () => { const m = add(new THREE.OctahedronGeometry(0.008), basic('#ffffff', { fog: false }), [0, 0, 0], [0, 0, 0], scene, { cast: false }); m.userData.nd = null; return m; });
const mist = Array.from({ length: 10 }, () => { const m = add(sph(1, 12, 8), basic('#cfe0ff', { transparent: true, opacity: 0.12, depthWrite: false, fog: false }), [0, 0, 0], [0, 0, 0], scene, { cast: false }); m.userData.nd = null; return m; });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.3, depthWrite: false, fog: false });
const halo = new THREE.Mesh(sph(1, 20, 14), glowMat); halo.userData.nd = null; halo.castShadow = false; scene.add(halo);

// street banner + lab extras
const banner = plane(8.4, 1.6, toon('#ffffff', P.label(['TAHUN  1905'], { w: 1024, h: 196, bg: '#f2e2b8', font: 'bold 120px Georgia', bw: 14 }), { side: THREE.DoubleSide }), [0, 6.2, -14], [0, 0, 0], street);
const cleanBoard = plane(2.4, 1.3, toon('#2f4a3c'), [3.3, 2.1, -3.945], [0, 0, 0], lab);
const chalkA = plane(1.6, 0.31, toon('#ffffff', P.chalkWord('1905  →  1923'), { transparent: true, alphaTest: 0.2 }), [3.3, 2.45, -3.93], [0, 0, 0], lab); chalkA.userData.nd = null;
const chalkB = plane(1.6, 0.31, toon('#ffffff', P.chalkWord('18 TAHUN!'), { transparent: true, alphaTest: 0.2 }), [3.3, 2.05, -3.93], [0, 0, 0], lab); chalkB.userData.nd = null;
const paper = plane(0.34, 0.44, toon('#ffffff', P.label(['SURAT', 'PATEN', '1923'], { w: 384, h: 512, bg: '#f7f1e3', font: 'bold 70px Georgia', bw: 12 })), [0.3, 0.99, -0.85], [-Math.PI / 2, 0, 0.12], lab);
const stamp = plane(0.26, 0.13, toon('#ffffff', P.label(['DISETUJUI'], { w: 512, h: 256, bg: null, fg: '#c0353a', border: '#c0353a', font: 'bold 80px Georgia', bw: 16 }), { transparent: true, alphaTest: 0.1 }), [0.27, 0.996, -0.7], [-Math.PI / 2, 0, 0.3], lab);
stamp.userData.nd = null;

// ---------- helpers ----------
const SW = (x, y, z) => [x + 100, y, z];
const RW = (x, y, z) => [x + 100, y, z + 100];
const KH = 1.08, AH = 1.55;                                         // head-centre heights: kid, adult
const place = (card, pos, state, f, seed, extra = {}) => { const id = idle(f, seed); card.set({ seed, blink: blinkAt(f, seed), ...state }).place(pos[0], pos[1], pos[2], { bob: id.bob, tilt: id.tilt, ...extra }); };
const walkPhase = (f, speed = 0.05) => (f * speed) % 1;
const LIQ = { water: ['#cfe6ee', 0.55], soda: ['#e8621a', 0.92], frozen: ['#f08a3a', 1.0] };
function setLiquid(a, b = a, k = 0) {
  const A = LIQ[a], B = LIQ[b];
  PR.liqMat.color.set(A[0]).lerp(new THREE.Color(B[0]), k); PR.liqMat.opacity = lerp(A[1], B[1], k);
}
function glassState({ liquid = 'soda', frost = 0, lift = 0, stir = -1, spin = 0, show = true } = {}) {
  PR.gl.visible = true; PR.pop.visible = show;
  if (Array.isArray(liquid)) setLiquid(...liquid); else setLiquid(liquid);
  PR.frostMat.opacity = 0.32 * frost; PR.frostTop.material.opacity = 0.6 * frost;
  PR.pop.position.y = lift; PR.pop.rotation.y = spin; PR.liq.rotation.y = 0;
  if (stir >= 0) { const a = stir * Math.PI * 2; PR.stick.position.set(0.026 * Math.cos(a), 0.2, 0.026 * Math.sin(a)); PR.stick.rotation.set(-0.18 * Math.sin(a), 0, 0.18 * Math.cos(a)); PR.liq.rotation.y = a; }
  else { PR.stick.position.set(0.004, 0.2, 0); PR.stick.rotation.set(0, 0.3, -0.04); }
}

function resetWorld(f) {
  for (const c of Card.all) c.hide();
  look.cInf = 0; look.focus = 5; look.flash = 0;
  porch.visible = false; PR.wins.forEach((w) => (w.material = PR.winDay));
  for (const m of [...powder, ...crystals, ...mist]) m.visible = false;
  halo.visible = false; pointA.intensity = 0;
  glassState({});
  // lab: strip the penicillin story props
  for (const k of ['hookBottle', 'bottleBig', 'flask', 'flaskLabel', 'chalkWord', 'app', 'hero']) LAB[k].visible = false;
  for (const s of LAB.stacks) s.visible = false;
  LAB.glow.intensity = 0; LAB.doorPivot.rotation.y = 0; LAB.win.material = LAB.winDay;
  chalkA.visible = chalkB.visible = paper.visible = stamp.visible = false;
  STREET.banner.visible = false; STREET.cart.visible = false; banner.visible = false;
  ROOM.dish.visible = false; ROOM.glow.intensity = 0;
}
const usePorch = () => { showSets(); porch.visible = true; };

// ---------- shots ----------
export const SHOTS = [
  // S1 hook: the finished ice pop, floating & glowing
  { a: 0, b: 75, set: 'porch', fn(f) {
    applyLight('day', PW(0.5, 0, -0.5));
    const lift = 0.2 + 0.015 * Math.sin(f * 0.15);
    glassState({ liquid: 'frozen', frost: 0.35, lift, spin: f * 0.035 });
    halo.visible = true; halo.position.set(GL[0], GL[1] + lift + 0.12, GL[2]); halo.scale.setScalar(0.16 + 0.012 * Math.sin(f * 0.25)); glowMat.opacity = 0.14;
    pointA.position.set(GL[0], GL[1] + 0.4, GL[2] + 0.25); pointA.color.set(0xffd27a); pointA.intensity = 0.5;
    setCam(camKeys([[0, { p: PW(0.62, 0.98, 0.5), t: PW(0.55, 0.92, -0.5), fov: 34 }], [75, { p: PW(0.58, 0.96, 0.22), t: PW(0.55, 0.92, -0.5), fov: 34 }]], f));
    look.cInf = 10; look.focus = 0.85;
    fxAt(0, 'sparkle', (f % 36) / 36, GL[0], GL[1] + 0.05, GL[2] + 0.05, 0.22);
  } },
  // S2 ...found by a kid who forgot to clear his glass
  { a: 75, b: 185, set: 'porch', fn(f) {
    applyLight('day', PW(0.3, 0, -0.8));
    look.flash = 1 - prog(f, 75, 81);
    glassState({ liquid: 'soda' });
    setCam(camKeys([[75, { p: PW(0.2, 1.05, 2.9), t: PW(0.25, 0.9, -0.9), fov: 40 }], [125, { p: PW(0.25, 1.0, 2.5), t: PW(0.3, 0.88, -0.9), fov: 40 }],
      [165, { p: PW(0.6, 0.86, 0.55), t: PW(0.55, 0.72, -0.5), fov: 36 }], [185, { p: PW(0.58, 0.85, 0.42), t: PW(0.55, 0.72, -0.5), fov: 36 }]], f));
    look.cInf = f > 140 ? 9 : 0; look.focus = f > 140 ? 0.95 : 3;
    place(C.fk, PW(-0.1, 0, -0.95), { expr: f < 120 ? 'grin' : 'nervous', armR: f < 120 ? 'wave' : 'shrug', armL: f < 120 ? 'hang' : 'shrug', f }, f, 2);
    if (f > 128 && f < 165) fxAt(0, 'question', prog(f, 128, 165), PW(0.75, 0.82, -0.45)[0], 0.82, -0.45, 0.16);
  } },
  // S3a 1905: street establishing
  { a: 185, b: 243, set: 'street', fn(f) {
    applyLight('day', SW(0, 0, -8));
    look.flash = 1 - prog(f, 185, 191);
    banner.visible = true;
    setCam(camKeys([[185, { p: SW(0.5, 10, 12), t: SW(0, 6, -20), fov: 42 }], [235, { p: SW(0, 2.4, 8.5), t: SW(0, 5.3, -14), fov: 42 }], [243, { p: SW(0, 2.3, 8.2), t: SW(0, 5.25, -14), fov: 42 }]], f));
    const lanes = [[-5.2, 1], [4.8, -1], [-1.5, 1], [2.4, -1], [-6.0, -1], [5.6, 1]];
    lanes.forEach(([x, dir], i) => { const z = -4 - i * 2.5 + dir * (f - 185) * 0.035; place(C.folk[i], SW(x, 0.12, z), { mode: 'walk', phase: walkPhase(f + i * 7), expr: i % 2 ? 'smile' : 'neutral', f }, f, 20 + i); });
  } },
  // S3b ...an eleven-year-old called Frank
  { a: 243, b: 300, set: 'porch', fn(f) {
    applyLight('day', PW(0, 0, -1));
    look.flash = 1 - prog(f, 243, 249);
    glassState({ liquid: 'water', stir: -1 });
    setCam(camKeys([[243, { p: PW(-0.05, 1.0, 1.9), t: PW(-0.05, 0.95, -0.95), fov: 38 }], [300, { p: PW(-0.05, 1.04, 1.45), t: PW(-0.05, 0.98, -0.95), fov: 38 }]], f));
    look.cInf = 8; look.focus = 2.6;
    place(C.fk, PW(-0.05, 0, -0.95), { expr: f > 280 ? 'laugh' : 'grin', armR: 'wave', armL: f > 280 ? 'hip' : 'hang', f }, f, 2);
    if (f > 282) fxAt(0, 'sparkle', prog(f, 282, 300), PW(0.35, 0, 0)[0], 0.9, -0.9, 0.3);
  } },
  // S4 mixing soda powder into water
  { a: 300, b: 378, set: 'porch', fn(f) {
    applyLight('day', PW(0.5, 0, -0.6));
    const k = smoother(prog(f, 322, 362));
    glassState({ liquid: ['water', 'soda', k] });
    setCam(camKeys([[300, { p: PW(0.6, 1.0, 1.6), t: PW(0.55, 0.88, -0.8), fov: 38 }], [378, { p: PW(0.6, 0.98, 1.2), t: PW(0.55, 0.86, -0.8), fov: 38 }]], f));
    look.cInf = 8; look.focus = 1.9;
    place(C.fk, PW(0.4, 0, -1.0), { expr: f < 318 ? 'smile' : 'whistle', armR: 'lift', propR: 'packet', armL: 'hang', f }, f, 2);
    powder.forEach((m, i) => { const t = (f - 318 - i * 1.8) / 16; if (t < 0 || t > 1) return; m.visible = true; m.position.set(GL[0] - 0.02 + 0.03 * Math.sin(i * 2.3), GL[1] + 0.42 - 0.3 * t * t - 0.05 * t, GL[2] - 0.05 + 0.03 * Math.cos(i * 1.7)); });
  } },
  // S5 stirring with a little wooden stick
  { a: 378, b: 460, set: 'porch', fn(f) {
    applyLight('day', PW(0.5, 0, -0.5));
    const st = f >= 386 && f < 448 ? ((f - 386) / 20) % 1 : -1;
    glassState({ liquid: 'soda', stir: st });
    setCam(camKeys([[378, { p: PW(0.85, 0.92, 0.12), t: PW(0.55, 0.74, -0.5), fov: 34 }], [460, { p: PW(0.3, 0.92, 0.1), t: PW(0.55, 0.74, -0.5), fov: 34 }]], f));
    look.cInf = 11; look.focus = 0.7;
    place(C.fk, PW(0.4, 0, -1.05), { expr: 'whistle', armR: 'hold', armL: 'hang', f }, f, 2);
  } },
  // S6 distracted -> runs off; the glass is left on the porch
  { a: 460, b: 565, set: 'porch', fn(f) {
    applyLight('day', PW(0.5, 0, -0.8));
    glassState({ liquid: 'soda' });
    setCam(camKeys([[460, { p: PW(0.6, 1.05, 2.3), t: PW(0.5, 0.88, -0.8), fov: 40 }], [505, { p: PW(0.65, 1.05, 2.4), t: PW(0.75, 0.88, -0.8), fov: 40 }],
      [548, { p: PW(0.6, 0.85, 0.6), t: PW(0.55, 0.72, -0.5), fov: 36 }], [565, { p: PW(0.58, 0.84, 0.5), t: PW(0.55, 0.72, -0.5), fov: 36 }]], f));
    look.cInf = f > 520 ? 9 : 0; look.focus = f > 520 ? 1.0 : 3;
    const run = easeIn(prog(f, 482, 508));
    place(C.fk, PW(lerp(0.35, 2.6, run), 0, lerp(-1.0, -0.6, run)), { expr: f < 466 ? 'whistle' : f < 482 ? 'shock' : 'grin', look: f >= 466 ? 1 : 0, armR: f < 482 ? 'hang' : 'wave', armL: 'hang', mode: run > 0 && run < 1 ? 'walk' : 'stand', phase: walkPhase(f, 0.09), f }, f, 2, { show: run < 0.98 });
    if (f >= 466 && f < 484) fxAt(0, 'bang', prog(f, 466, 484), PW(0.75, 0, 0)[0], 1.1, -0.95, 0.22);
  } },
  // S7 night: very cold
  { a: 565, b: 650, set: 'porch', fn(f) {
    applyLight('night', PW(0.5, 0, -0.5));
    look.flash = 1 - prog(f, 565, 571);
    PR.wins.forEach((w) => (w.material = PR.winNight));
    const cold = smoother(prog(f, 600, 645));
    glassState({ liquid: ['soda', 'frozen', cold * 0.6], frost: cold * 0.8 });
    setCam(camKeys([[565, { p: PW(0.7, 1.5, 4.2), t: PW(0.5, 0.95, -1.2), fov: 40 }], [612, { p: PW(0.62, 1.05, 1.6), t: PW(0.55, 0.78, -0.5), fov: 38 }], [650, { p: PW(0.58, 0.9, 0.62), t: PW(0.55, 0.74, -0.5), fov: 36 }]], f));
    look.cInf = f > 615 ? 8 : 0; look.focus = 1.2;
    pointA.position.set(GL[0] + 0.4, 1.6, GL[2] + 0.6); pointA.color.set(0x9fc4ff); pointA.intensity = 0.8;
    mist.forEach((m, i) => { m.visible = true; const x = ((f * 0.012 + i * 0.9) % 9) - 4.5; m.position.set(PW(x, 0, 0)[0], 0.15 + 0.12 * (i % 3), -2.2 + (i % 5) * 0.8); m.scale.set(1.2, 0.18, 0.6); });
    crystals.forEach((m, i) => { const t = (f - 604 - i * 1.4) / 18; if (t < 0) return; m.visible = true; const a = i * 2.4, h = 0.02 + 0.15 * ((i * 0.37) % 1);
      m.position.set(GL[0] + 0.066 * Math.cos(a), GL[1] + h, GL[2] + 0.066 * Math.sin(a)); m.scale.setScalar(Math.min(1, backOut(t)) * (0.6 + 0.6 * ((i * 7) % 3) / 2)); m.rotation.set(f * 0.05 + i, i, 0); });
  } },
  // S8 morning: frozen hard, the stick still stuck in the middle
  { a: 650, b: 790, set: 'porch', fn(f) {
    applyLight('golden', PW(0.5, 0, -0.5), smoother(prog(f, 650, 790)), 'day');
    look.flash = 1 - prog(f, 650, 656);
    glassState({ liquid: 'frozen', frost: 1 });
    crystals.forEach((m, i) => { m.visible = true; const a = i * 2.4, h = 0.02 + 0.15 * ((i * 0.37) % 1); m.position.set(GL[0] + 0.066 * Math.cos(a), GL[1] + h, GL[2] + 0.066 * Math.sin(a)); m.scale.setScalar(0.6 + 0.6 * ((i * 7) % 3) / 2); });
    const shake = f >= 690 && f < 697 ? 1 : 0;
    setCam(camKeys([[650, { p: PW(0.9, 0.9, 0.35), t: PW(0.55, 0.72, -0.5), fov: 36 }], [722, { p: PW(0.68, 0.84, 0.1), t: PW(0.55, 0.71, -0.5), fov: 34 }],
      [758, { p: PW(0.6, 0.95, 0.05), t: PW(0.55, 0.88, -0.5), fov: 32, e: 'out' }], [790, { p: PW(0.6, 0.96, -0.02), t: PW(0.55, 0.89, -0.5), fov: 32, roll: 3 }]], f), shake, f);
    look.cInf = 11; look.focus = f < 735 ? 0.62 : 0.5;
    if (f >= 690 && f < 715) fxAt(0, 'bang', prog(f, 690, 715), GL[0] + 0.14, GL[1] + 0.05, GL[2] + 0.02, 0.12);
    if (f > 748) fxAt(1, 'sparkle', prog(f, 748, 780), GL[0], GL[1] + 0.27, GL[2] + 0.02, 0.12);
  } },
  // S9a he pulls -> the ice comes out whole
  { a: 790, b: 856, set: 'porch', fn(f) {
    applyLight('day', PW(0.5, 0, -0.6));
    const lift = 0.9 * easeIn(prog(f, 832, 856));
    glassState({ liquid: 'frozen', frost: 0.8, lift });
    setCam(camKeys([[790, { p: PW(0.55, 1.0, 1.25), t: PW(0.55, 0.85, -0.6), fov: 38 }], [856, { p: PW(0.55, 0.95, 0.95), t: PW(0.55, 0.88, -0.6), fov: 38 }]], f));
    look.cInf = 8; look.focus = 1.4;
    place(C.fk, PW(0.4, 0, -1.05), { expr: f < 820 ? 'neutral' : 'shock', armR: f < 832 ? 'hold' : 'up', armL: 'hang', f }, f, 2);
  } },
  // S9b holding it up
  { a: 856, b: 895, set: 'porch', fn(f) {
    applyLight('day', PW(0.3, 0, -0.9));
    glassState({ show: false });
    setCam(camKeys([[856, { p: PW(0.4, 1.15, 1.6), t: PW(0.4, 1.15, -1.05), fov: 38, e: 'out' }], [895, { p: PW(0.4, 1.12, 1.3), t: PW(0.4, 1.12, -1.05), fov: 38 }]], f));
    look.cInf = 8; look.focus = 2.4;
    place(C.fk, PW(0.4, 0, -1.05), { expr: f < 868 ? 'shock' : 'grin', armR: 'up', propR: 'popsicle', armL: 'hang', f }, f, 2);
    fxAt(0, 'sparkle', prog(f, 858, 886), PW(0.55, 0, 0)[0], 1.25, -1.0, 0.35);
  } },
  // S10 he licks it. Sweet.
  { a: 895, b: 960, set: 'porch', fn(f) {
    applyLight('day', PW(0.3, 0, -0.9));
    glassState({ show: false });
    setCam(camKeys([[895, { p: PW(0.5, KH + 0.08, 0.75), t: PW(0.5, KH + 0.04, -1.05), fov: 34 }], [928, { p: PW(0.5, KH + 0.08, 0.6), t: PW(0.5, KH + 0.04, -1.05), fov: 34 }],
      [936, { p: PW(0.47, KH + 0.04, 0.38), t: PW(0.47, KH, -1.05), fov: 34, e: 'out' }], [960, { p: PW(0.47, KH + 0.04, 0.32), t: PW(0.47, KH, -1.05), fov: 34 }]], f));
    look.cInf = 10; look.focus = 1.1;
    const sweet = f >= 927;
    place(C.fk, PW(0.4, 0, -1.05), { expr: sweet ? (f < 945 ? 'laugh' : 'smile_closed') : 'lick', armR: 'pointUp', propR: 'popsicle', armL: sweet ? 'cheer' : 'hang', f }, f, 2);
    if (sweet) fxAt(0, 'sparkle', prog(f, 928, 955), PW(0.42, 0, 0)[0], KH - 0.35, -1.0, 0.4);
  } },
  // S11a for years he made them for his friends
  { a: 960, b: 1030, set: 'porch', fn(f) {
    applyLight('day', PW(0.3, 0, -0.9));
    look.flash = 1 - prog(f, 960, 966);
    glassState({ liquid: 'soda' });
    setCam(camKeys([[960, { p: PW(0.3, 1.1, 3.5), t: PW(0.3, 0.92, -1.0), fov: 40 }], [1030, { p: PW(0.3, 1.05, 3.1), t: PW(0.3, 0.9, -1.0), fov: 40 }]], f));
    look.cInf = 6; look.focus = 4.2;
    const got = (i) => f > 975 + i * 10;
    place(C.fk, PW(0.3, 0, -1.15), { expr: 'grin', armL: 'lift', armR: 'lift', propL: got(0) ? null : 'popsicle', propR: got(1) ? null : 'popsicleRed', f }, f, 2);
    place(C.fr1, PW(-0.42, 0, -0.75), { expr: got(0) ? 'laugh' : 'smile', armR: got(0) ? 'cheer' : 'hang', propR: got(0) ? 'popsicle' : null, f: f + 5 }, f, 23);
    place(C.fr2, PW(1.02, 0, -0.75), { expr: got(1) ? 'laugh' : 'smile', armL: got(1) ? 'cheer' : 'hang', propL: got(1) ? 'popsicleRed' : null, f: f + 9 }, f, 31);
  } },
  // S11b ...then for his own children (years later)
  { a: 1030, b: 1087, set: 'porch', fn(f) {
    applyLight('golden', PW(0.3, 0, -0.9));
    look.flash = 1 - prog(f, 1030, 1036);
    glassState({ liquid: 'soda' });
    setCam(camKeys([[1030, { p: PW(0.25, 1.35, 4.3), t: PW(0.25, 1.05, -1.0), fov: 40 }], [1087, { p: PW(0.25, 1.3, 3.8), t: PW(0.25, 1.02, -1.0), fov: 40 }]], f));
    look.cInf = 6; look.focus = 4.8;
    place(C.fa, PW(0.2, 0, -1.35), { expr: 'grin', armR: 'thumb', armL: 'hip', f }, f, 4);
    place(C.dau, PW(-0.52, 0, -0.75), { expr: 'laugh', armR: 'cheer', propR: 'popsicle', f: f + 4 }, f, 8);
    place(C.son, PW(0.95, 0, -0.75), { expr: 'grin', armL: 'holdHigh', propL: 'popsicleRed', f: f + 8 }, f, 9);
  } },
  // S12a only 18 years later
  { a: 1087, b: 1143, set: 'lab', fn(f) {
    applyLight('day', [3, 1, -3]);
    look.flash = 1 - prog(f, 1087, 1093);
    chalkA.visible = true; const wa = Math.max(0.001, smoother(prog(f, 1090, 1115))); chalkA.scale.set(wa, 1, 1); chalkA.position.x = 3.3 - (1 - wa) * 0.8;
    chalkB.visible = f > 1112; const wb = Math.max(0.001, smoother(prog(f, 1112, 1132))); chalkB.scale.set(wb, 1, 1); chalkB.position.x = 3.3 - (1 - wb) * 0.8;
    setCam(camKeys([[1087, { p: [3.15, 1.95, 0.1], t: [3.25, 2.0, -3.95], fov: 40 }], [1143, { p: [3.2, 1.95, -0.25], t: [3.25, 2.0, -3.95], fov: 40 }]], f));
    place(C.fa, [2.7, 0, -3.2], { expr: f > 1115 ? 'shock' : 'smile', armR: 'pointUp', armL: 'hang' }, f, 4);
  } },
  // S12b ... he registered the patent (stamp!)
  { a: 1143, b: 1210, set: 'lab', fn(f) {
    applyLight('day', [0.3, 1, -1]);
    paper.visible = true; stamp.visible = f >= 1166;
    if (stamp.visible) { const k = backOut(prog(f, 1166, 1174), 2.4); const s = lerp(1.8, 1, Math.min(1, k)); stamp.scale.set(s, s, 1); }
    const shake = f >= 1166 && f < 1173 ? 1 : 0;
    setCam(camKeys([[1143, { p: [0.3, 1.78, -0.42], t: [0.3, 0.98, -0.88], fov: 36 }], [1180, { p: [0.3, 1.7, -0.45], t: [0.3, 0.98, -0.9], fov: 36 }],
      [1200, { p: [0.3, 1.55, 1.3], t: [0.3, 1.25, -1.6], fov: 40 }], [1210, { p: [0.3, 1.55, 1.4], t: [0.3, 1.25, -1.6], fov: 40 }]], f), shake, f);
    look.cInf = f < 1182 ? 8 : 0; look.focus = 0.8;
    place(C.fa, [0.3, 0, -2.15], { expr: f > 1180 ? 'grin' : 'neutral', armR: f > 1180 ? 'thumb' : 'hang', armL: 'hip' }, f, 4);
  } },
  // S13a the name became famous worldwide
  { a: 1210, b: 1262, set: 'street', fn(f) {
    applyLight('golden', SW(1, 0, -6));
    look.flash = 1 - prog(f, 1210, 1216);
    setCam(camKeys([[1210, { p: SW(1.2, 1.5, 0.8), t: SW(1.4, 1.3, -6), fov: 42 }], [1262, { p: SW(1.0, 4.2, 4.6), t: SW(1.4, 1.1, -6.5), fov: 44 }]], f));
    const spots = [[-0.6, -4.6], [0.6, -4.3], [2.4, -4.5], [3.4, -5.4], [-1.6, -5.6], [-0.4, -7.5], [1.4, -8.0], [3.0, -7.6]];
    spots.forEach(([x, z], i) => {
      const on = f > 1212 + i * 3;
      place(C.folk[i], SW(x, 0.12, z), { expr: i % 2 ? 'laugh' : 'grin', armR: on ? 'cheer' : 'hang', propR: on ? (i % 2 ? 'popsicle' : 'popsicleRed') : null, armL: on && i % 3 ? 'cheer' : 'hang', f: f + i * 5 }, f, 20 + i, { bob: on ? 0.03 * Math.abs(Math.sin(f * 0.25 + i)) : 0 });
    });
  } },
  // S13b ...was not his idea
  { a: 1262, b: 1310, set: 'porch', fn(f) {
    applyLight('day', PW(0.2, 0, -1.3));
    look.flash = 1 - prog(f, 1262, 1267);
    glassState({ liquid: 'soda' });
    setCam(camKeys([[1262, { p: PW(0.2, AH, 0.8), t: PW(0.2, AH - 0.08, -1.35), fov: 36 }], [1310, { p: PW(0.2, AH, 0.45), t: PW(0.2, AH - 0.08, -1.35), fov: 36, roll: -3 }]], f));
    look.cInf = 9; look.focus = 1.9;
    place(C.fa, PW(0.2, 0, -1.35), { expr: f < 1272 ? 'grin' : 'nervous', armR: f < 1272 ? 'thumb' : 'shrug', armL: f < 1272 ? 'hip' : 'shrug' }, f, 4);
    if (f > 1274) fxAt(0, 'question', prog(f, 1274, 1310), PW(0.62, 0, 0)[0], AH - 0.15, -1.3, 0.26);
  } },
  // S14 twist: his kids named it, "es punya Papa"
  { a: 1310, b: TOTAL, set: 'room', fn(f) {
    applyLight('day', RW(0.2, 1, -1.5));
    look.flash = 1 - prog(f, 1310, 1316);
    const keys = [[1310, { p: RW(0.2, 1.4, 4.0), t: RW(0.2, 1.05, -1.4), fov: 42 }], [1360, { p: RW(0.3, 1.3, 3.4), t: RW(0.35, 1.0, -1.3), fov: 42 }],
      [1394, { p: RW(0.3, 1.28, 3.2), t: RW(0.35, 1.0, -1.3), fov: 42 }], [1404, { p: RW(0.2, 1.32, 2.85), t: RW(0.2, 1.1, -1.4), fov: 40, e: 'out', roll: 3 }], [TOTAL, { p: RW(0.2, 1.32, 2.75), t: RW(0.2, 1.1, -1.4), fov: 40, roll: 3.5 }]];
    setCam(camKeys(keys, f));
    look.cInf = f > 1395 ? 6 : 0; look.focus = 3.0;
    const say = f >= 1393;
    place(C.fa, RW(-0.42, 0, -1.6), { expr: say ? 'laugh' : f > 1340 ? 'smile' : 'neutral', armR: say ? 'cheer' : 'hip', armL: say ? 'cheer' : 'hang', f }, f, 4);
    place(C.dau, RW(0.2, 0, -1.15), { expr: say ? 'laugh' : 'grin', armL: f > 1338 ? 'point' : 'hang', armR: say ? 'cheer' : 'holdHigh', propR: 'popsicle', f: f + 4 }, f, 8);
    place(C.son, RW(0.8, 0, -1.35), { expr: say ? 'laugh' : 'smile', armL: say ? 'cheer' : 'point', armR: 'holdHigh', propR: 'popsicleRed', f: f + 8 }, f, 9);
    if (say) fxAt(0, 'sparkle', prog(f, 1395, 1424), ...RW(0.15, 1.0, -1.2), 0.6);
  } },
];

const SETMAP = { lab: ['lab'], street: ['street'], room: ['room'] };
export function update(f) {
  resetWorld(f);
  const s = SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];
  if (s.set === 'porch') usePorch(); else showSets(...SETMAP[s.set]);
  s.fn(f);
}
