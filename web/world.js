// ---------- world ----------
import { THREE, scene, toon, basic, add, tbox, tboxGeo, group } from './engine.js';
import * as P from './paint.js';

const cyl = (rt, rb, h, n = 24) => new THREE.CylinderGeometry(rt, rb, h, n);
const sph = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b);

// shared materials
const M = {
  floorWood: toon('#ffffff', P.planks('#b9824f', 3)),
  plaster: toon('#ffffff', P.plaster('#efe3c6')),
  plasterG: toon('#ffffff', P.plaster('#cfe0d2', 7)),
  tiles: toon('#ffffff', P.tiles('#ece6d6', '#a9c4bb')),
  bench: toon('#ffffff', P.planks('#8a5a38', 5)),
  benchTop: toon('#ffffff', P.planks('#5f6b5c', 8)),
  shelf: toon('#ffffff', P.planks('#9a6a40', 11)),
  brick: toon('#ffffff', P.bricks('#a9573f')),
  brick2: toon('#ffffff', P.bricks('#8f5a4a', '#cdbb9c', 12)),
  brick3: toon('#ffffff', P.bricks('#b56f4a', '#e0cfae', 13)),
  roof: toon('#ffffff', P.roofTiles('#5a4e5e')),
  cobble: toon('#ffffff', P.cobbles('#8c8a94')),
  stone: toon('#ffffff', P.plaster('#b8b2a4', 17)),
  glass: toon('#cfeaf0', null, { transparent: true, opacity: 0.55 }),
  glassRim: toon('#e4f6fa', null, { transparent: true, opacity: 0.7 }),
  agar: toon('#ffffff', P.agar()),
  dark: toon('#3a3040'),
  metal: toon('#a9b2ba'),
  brass: toon('#d6a84a'),
  white: toon('#f6f3ea'),
  red: toon('#c0353a'),
  door: toon('#ffffff', P.planks('#6e4a32', 21)),
  sink: toon('#e8ece8'),
  mold: toon('#ffffff', P.fuzz('#3f9a8a')),
  moldPurple: toon('#ffffff', P.fuzz('#7a5aa8')),
  moldYellow: toon('#ffffff', P.fuzz('#c9a83a')),
  bacteria: toon('#d77aa8'),
  bed: toon('#5a8ad0'),
  blanket: toon('#ffffff', P.plaster('#f0b84a', 33)),
  wallKid: toon('#ffffff', P.plaster('#bfe0e6', 34)),
  rug: toon('#e05a5a'),
};
export const MATS = M;

const plane = (w, h, mat, pos, rot, parent, opts = {}) => add(new THREE.PlaneGeometry(w, h), mat, pos, rot, parent, opts);
const lbl = (tex, w, h, pos, rot, parent) => plane(w, h, toon('#ffffff', tex, { transparent: true, alphaTest: 0.1 }), pos, rot, parent, { cast: false });

/** petri dish (radius r), optional bacteria dots */
const dishGeo = { base: cyl(1, 1, 0.12, 32), rim: new THREE.CylinderGeometry(1.02, 1.02, 0.16, 32, 1, true), agar: cyl(0.97, 0.97, 0.1, 32) };
export const makeDish = (parent, pos, r = 0.09, opts = {}) => {
  const g = group(pos, parent);
  add(dishGeo.base, M.glassRim, [0, 0.06 * r, 0], [0, 0, 0], g, { cast: false }).scale.set(r, r, r);
  add(dishGeo.agar, M.agar, [0, 0.08 * r, 0], [0, 0, 0], g, { cast: false }).scale.set(r, r, r);
  const rim = add(dishGeo.rim, M.glassRim, [0, 0.08 * r, 0], [0, 0, 0], g, { cast: false }); rim.scale.set(r, r, r); rim.userData.nd = null;
  if (opts.dots !== false) for (let i = 0; i < 5; i++) {
    const a = i * 2.4 + pos[0] * 7, d = 0.25 + 0.5 * ((i * 0.37 + pos[2] * 3) % 1);
    add(sph(0.12 * r, 8, 6), M.bacteria, [Math.cos(a) * d * r, 0.14 * r, Math.sin(a) * d * r], [0, 0, 0], g, { cast: false }).scale.y = 0.5;
  }
  if (opts.mold) { const m = add(sph(0.22 * r, 12, 8), M.mold, [0.15 * r, 0.14 * r, -0.1 * r], [0, 0, 0], g, { cast: false }); m.scale.y = 0.45; g.userData.mold = m; }
  return g;
};
const stack = (parent, x, z, n, r = 0.09, tilt = 0) => {
  const g = group([x, 0, z], parent); g.rotation.z = tilt;
  for (let i = 0; i < n; i++) { const d = makeDish(g, [0.008 * Math.sin(i * 2.1), i * 0.026, 0.008 * Math.cos(i * 1.7)], r, { dots: i === n - 1 }); d.rotation.y = i * 0.7; }
  return g;
};
const bottle = (parent, pos, col = '#e9b44a', h = 0.24, labelTex = null) => {
  const g = group(pos, parent);
  add(cyl(h * 0.28, h * 0.28, h * 0.62, 18), toon(col), [0, h * 0.31, 0], [0, 0, 0], g);
  add(cyl(h * 0.11, h * 0.28, h * 0.16, 18), toon(col), [0, h * 0.7, 0], [0, 0, 0], g);
  add(cyl(h * 0.1, h * 0.1, h * 0.14, 12), toon('#f2efe6'), [0, h * 0.85, 0], [0, 0, 0], g);
  if (labelTex) lbl(labelTex, h * 0.5, h * 0.3, [0, h * 0.32, h * 0.285], [0, 0, 0], g);
  return g;
};
const flask = (parent, pos, liquid = '#e8c84a', s = 1) => {
  const g = group(pos, parent); g.scale.setScalar(s);
  add(new THREE.ConeGeometry(0.13, 0.2, 24, 1, true), M.glass, [0, 0.1, 0], [0, 0, 0], g, { cast: false }).userData.nd = undefined;
  add(cyl(0.035, 0.035, 0.12, 16, 1), M.glass, [0, 0.24, 0], [0, 0, 0], g, { cast: false });
  const liq = add(new THREE.ConeGeometry(0.11, 0.1, 24), toon(liquid), [0, 0.06, 0], [0, 0, 0], g, { cast: false });
  add(new THREE.TorusGeometry(0.04, 0.012, 8, 20), toon('#f2efe6'), [0, 0.3, 0], [Math.PI / 2, 0, 0], g);
  g.userData.liq = liq;
  return g;
};

// ============ LAB (two floors, dollhouse open front) ============
export const lab = group([0, 0, 0]);
export const LAB = {};
{
  const L = lab;
  tbox(10.6, 0.3, 7.6, M.floorWood, [0, -0.15, -0.4], L, 1);              // upper floor slab
  tbox(10.6, 0.25, 7.6, M.stone, [0, 3.7, -0.4], L, 1);                    // ceiling
  tbox(10.6, 3.9, 0.3, M.plaster, [0, 1.8, -4.2], L, 1);                   // back wall
  tbox(0.3, 3.9, 7.6, M.plaster, [-5.15, 1.8, -0.4], L, 1);                // left wall
  tbox(0.3, 3.9, 7.6, M.plaster, [5.15, 1.8, -0.4], L, 1);                 // right wall
  tbox(10.6, 0.8, 0.06, M.plasterG, [0, 0.4, -4.04], L, 1, { cast: false }); // wainscot
  // window on back wall (left)
  const win = plane(1.6, 2.0, toon('#ffffff', P.windowTex('#bfe0f0')), [-3.2, 2.0, -4.03], [0, 0, 0], L, { cast: false });
  LAB.winDay = win.material; LAB.winNight = toon('#ffffff', P.windowTex('#25365e', '#d9d4c6', true)); LAB.win = win;
  tbox(1.9, 0.12, 0.25, M.white, [-3.2, 0.95, -3.95], L, 1);                // sill
  // shelves with bottles (back wall centre)
  for (const y of [1.55, 2.15, 2.75]) tbox(2.8, 0.06, 0.35, M.shelf, [0.2, y, -3.85], L, 2);
  const cols = ['#5aa0c9', '#c95a5a', '#e9b44a', '#6ab36a', '#9a7ac9', '#e0e0d0'];
  for (let i = 0; i < 18; i++) bottle(L, [-1.0 + (i % 6) * 0.45, 1.58 + Math.floor(i / 6) * 0.6, -3.82], cols[(i * 5) % 6], 0.18 + 0.08 * ((i * 7) % 3) / 2);
  // chalkboard (right of back wall)
  tbox(2.6, 1.5, 0.08, M.dark, [3.3, 2.1, -4.0], L, 1);
  plane(2.4, 1.3, toon('#ffffff', P.chalkboard()), [3.3, 2.1, -3.95], [0, 0, 0], L, { cast: false });
  LAB.chalkWord = plane(2.2, 0.42, toon('#ffffff', P.chalkWord('PENICILLIUM'), { transparent: true, alphaTest: 0.2 }), [3.3, 1.72, -3.93], [0, 0, 0], L, { cast: false });
  LAB.chalkWord.userData.nd = null;
  // calendar on left wall
  plane(0.6, 0.75, toon('#ffffff', P.calendar()), [-4.98, 1.9, 0.6], [0, Math.PI / 2, 0], L, { cast: false });
  // door on left wall (pivot)
  tbox(0.12, 2.5, 1.3, M.white, [-5.0, 1.25, -1.8], L, 1);
  LAB.doorPivot = group([-4.94, 0, -2.4], L);
  tbox(0.08, 2.3, 1.1, M.door, [0, 1.15, 0.55], LAB.doorPivot, 1);
  add(sph(0.05), M.brass, [0.08, 1.1, 0.95], [0, 0, 0], LAB.doorPivot);
  // main bench
  tbox(4.6, 0.08, 1.1, M.benchTop, [0, 0.93, -1.1], L, 2);
  tbox(4.4, 0.85, 0.9, M.bench, [0, 0.45, -1.1], L, 1.5);
  for (let i = 0; i < 4; i++) tbox(0.9, 0.02, 0.02, M.dark, [-1.65 + i * 1.1, 0.75, -0.64], L, 1, { cast: false });
  // microscope
  const ms = group([1.6, 0.97, -1.35], L);
  tbox(0.22, 0.04, 0.26, M.dark, [0, 0.02, 0], ms); add(cyl(0.025, 0.025, 0.32), M.dark, [0, 0.2, -0.08], [0.25, 0, 0], ms); add(cyl(0.04, 0.03, 0.2), M.metal, [0, 0.3, 0], [-0.4, 0, 0], ms);
  tbox(0.14, 0.02, 0.14, M.metal, [0, 0.14, 0.02], ms);
  // dish stacks (the mess)
  LAB.stacks = [];
  const sp = [[-1.9, -1.3, 6], [-1.6, -0.9, 4], [-1.25, -1.45, 8], [-0.9, -1.0, 3], [-0.55, -1.4, 5], [0.0, -1.5, 7], [0.85, -0.9, 4], [1.1, -1.5, 6], [2.0, -0.85, 5], [0.45, -1.45, 3]];
  for (const [x, z, n] of sp) LAB.stacks.push(stack(L, x, z, n, 0.09, (n % 3 - 1) * 0.05));
  for (const s of LAB.stacks) s.position.y = 0.97;
  // hero dish (the one with mold), front middle
  LAB.hero = makeDish(L, [0.35, 0.97, -0.85], 0.1, { mold: true });
  // papers mess
  for (let i = 0; i < 9; i++) { const pp = plane(0.21, 0.29, toon(i % 3 ? '#f4efe0' : '#e8dcc0'), [-2 + i * 0.5, 0.975 + i * 0.001, -0.75 - (i % 3) * 0.12], [-Math.PI / 2, 0, i * 0.7], L, { cast: false }); pp.userData.nd = null; }
  // sink + tray on right
  tbox(1.2, 0.9, 0.8, M.white, [3.8, 0.45, -1.2], L, 1);
  tbox(0.9, 0.12, 0.55, M.sink, [3.8, 0.92, -1.2], L, 1);
  LAB.tray = [3.8, 0.99, -1.2];
  add(cyl(0.03, 0.03, 0.5), M.metal, [3.8, 1.2, -1.5], [0, 0, 0], L);
  // stools
  for (const x of [-1, 1]) { add(cyl(0.22, 0.22, 0.06), M.bench, [x, 0.62, 0.0], [0, 0, 0], L); for (const k of [0, 1, 2]) add(cyl(0.02, 0.02, 0.62), M.dark, [x + 0.15 * Math.cos(k * 2.1), 0.31, 0.15 * Math.sin(k * 2.1)], [0, 0, 0.0], L); }
  // ceiling lamps
  for (const x of [-2.5, 2.5]) { add(cyl(0.01, 0.01, 0.8), M.dark, [x, 3.2, -1.2], [0, 0, 0], L, { cast: false }); add(new THREE.ConeGeometry(0.3, 0.25, 20, 1, true), toon('#2f6a5a'), [x, 2.75, -1.2], [0, 0, 0], L, { cast: false }); }
  // floor vent near bench (spores come up through it)
  tbox(0.6, 0.02, 0.4, M.dark, [-0.6, 0.005, -0.1], L, 1, { cast: false });
  // flask + apparatus group (shown in S8 and S10)
  LAB.flask = flask(L, [-0.5, 0.97, -0.9], '#e8c84a', 1.4);
  LAB.flaskLabel = lbl(P.label(['JUS JAMUR'], { w: 512, h: 160, font: 'bold 78px Georgia' }), 0.26, 0.08, [-0.5, 1.07, -0.73], [0, 0, 0], L);
  LAB.bottleBig = bottle(L, [-0.5, 0.97, -0.9], '#d9963a', 0.36, P.label(['PENISILIN'], { w: 512, h: 200, font: 'bold 80px Georgia' }));
  LAB.hookBottle = bottle(L, [-1.25, 0.97, -0.85], '#d9963a', 0.34, P.label(['PENISILIN'], { w: 512, h: 200, font: 'bold 80px Georgia' }));
  LAB.glow = new THREE.PointLight(0xffd27a, 0, 3, 1.5); L.add(LAB.glow);
  LAB.trash = group([2.6, 0, 0.6], L);
  add(cyl(0.28, 0.22, 0.62, 20, 1), toon('#7a8a7a'), [0, 0.31, 0], [0, 0, 0], LAB.trash);
  // apparatus (S10): coil + stand + rows of bottles on lower shelf
  LAB.app = group([0, 0.97, -1.2], L);
  add(cyl(0.015, 0.015, 0.9), M.metal, [-1.2, 0.45, 0], [0, 0, 0], LAB.app); tbox(0.3, 0.03, 0.3, M.dark, [-1.2, 0.015, 0], LAB.app);
  flask(LAB.app, [-1.2, 0.55, 0], '#9fd47a', 1.2);
  add(new THREE.TorusGeometry(0.12, 0.02, 8, 24), M.glassRim, [-0.75, 0.55, 0], [0, 0, Math.PI / 2], LAB.app);
  add(new THREE.TorusGeometry(0.12, 0.02, 8, 24), M.glassRim, [-0.75, 0.45, 0], [0, 0, Math.PI / 2], LAB.app);
  add(cyl(0.012, 0.012, 0.7), M.glassRim, [-0.95, 0.75, 0], [0, 0, 1.2], LAB.app);
  LAB.prodBottles = [];
  for (let i = 0; i < 7; i++) LAB.prodBottles.push(bottle(LAB.app, [-0.2 + i * 0.28, 0, 0.15], '#e9b44a', 0.24, P.label(['P'], { w: 128, h: 96, font: 'bold 70px Georgia' })));
}
// ---- lower lab (mycology) ----
export const lower = group([0, -4.2, 0]);
{
  const L = lower;
  tbox(10.6, 0.3, 7.6, M.tiles, [0, -0.15, -0.4], L, 1);
  tbox(10.6, 4.2, 0.3, M.plasterG, [0, 2.0, -4.2], L, 1);
  tbox(0.3, 4.2, 7.6, M.plasterG, [-5.15, 2.0, -0.4], L, 1);
  tbox(0.3, 4.2, 7.6, M.plasterG, [5.15, 2.0, -0.4], L, 1);
  for (const y of [1.2, 1.9, 2.6]) tbox(6, 0.06, 0.4, M.shelf, [0, y, -3.85], L, 2);
  const mm = [M.mold, M.moldPurple, M.moldYellow];
  for (let i = 0; i < 24; i++) {
    const x = -2.7 + (i % 8) * 0.77, y = 1.23 + Math.floor(i / 8) * 0.7;
    add(cyl(0.13, 0.13, 0.3, 16, 1, true), M.glass, [x, y + 0.15, -3.8], [0, 0, 0], L, { cast: false });
    add(sph(0.12, 12, 8), mm[i % 3], [x, y + 0.1, -3.8], [0, 0, 0], L, { cast: false }).scale.y = 0.8;
  }
  tbox(4, 0.9, 1, M.bench, [0, 0.45, -1.4], L, 1.5);
  for (let i = 0; i < 5; i++) { add(sph(0.18, 12, 8), mm[i % 3], [-1.6 + i * 0.8, 1.0, -1.4], [0, 0, 0], L, { cast: false }).scale.y = 0.6; }
  add(cyl(0.3, 0.3, 0.02, 20), M.glass, [-0.6, 3.95, -0.1], [0, 0, 0], L, { cast: false }); // vent shaft below
  tbox(0.5, 4.0, 0.35, M.metal, [-0.6, 2.1, -0.1], L, 1).visible = false;
}
// ---- building exterior for the dollhouse wide ----
export const facade = group([0, 0, 0]);
{
  tbox(0.4, 9.2, 8.0, M.brick, [-5.5, -0.4, -0.4], facade, 1);
  tbox(0.4, 9.2, 8.0, M.brick, [5.5, -0.4, -0.4], facade, 1);
  const rf = add(new THREE.ConeGeometry(8.2, 2.4, 4, 1), M.roof, [0, 5.0, -0.4], [0, Math.PI / 4, 0], facade); rf.scale.set(1, 1, 0.66);
  tbox(30, 0.2, 30, M.cobble, [0, -4.45, 2], facade, 0.5);
  for (const x of [-14, 13]) tbox(7, 7 + Math.abs(x) % 3, 6, x < 0 ? M.brick2 : M.brick3, [x, -1, -2], facade, 1);
}

// ============ STREET (London, 1928) ============
export const street = group([100, 0, 0]);
export const STREET = {};
{
  const S = street;
  tbox(16, 0.2, 140, M.cobble, [0, -0.1, -50], S, 0.6);
  tbox(3, 0.25, 140, M.stone, [-6.5, 0.02, -50], S, 1); tbox(3, 0.25, 140, M.stone, [6.5, 0.02, -50], S, 1);
  const bm = [M.brick, M.brick2, M.brick3];
  for (let i = 0; i < 12; i++) for (const side of [-1, 1]) {
    const h = 7 + ((i * 7 + (side > 0 ? 3 : 0)) % 5), w = 8, z = 10 - i * 10;
    const b = tbox(5, h, w - 0.4, bm[(i + (side > 0 ? 1 : 0)) % 3], [side * 10.5, h / 2, z], S, 0.8);
    const r = add(new THREE.ConeGeometry(3.9, 2.2, 4), M.roof, [side * 10.5, h + 1.1, z], [0, Math.PI / 4, 0], S); r.scale.set(0.9, 1, 1.45);
    for (let fl = 0; fl < Math.floor(h / 2.6); fl++) for (let k = 0; k < 2; k++)
      plane(1.1, 1.5, toon('#ffffff', P.windowTex(fl % 2 ? '#9cc4d8' : '#b9d6e2')), [side * 7.97, 1.9 + fl * 2.6, z - 1.7 + k * 3.4], [0, -side * Math.PI / 2, 0], S, { cast: false });
    add(cyl(0.25, 0.25, 1.4, 8), M.brick2, [side * 11, h + 1.6, z + 2], [0, 0, 0], S);
  }
  for (let i = 0; i < 8; i++) for (const side of [-1, 1]) { // lamps
    const z = 4 - i * 14; add(cyl(0.06, 0.08, 3.6, 8), M.dark, [side * 5.4, 1.8, z], [0, 0, 0], S);
    add(new THREE.BoxGeometry(0.35, 0.45, 0.35), toon('#fff1b8'), [side * 5.4, 3.75, z], [0, 0, 0], S);
  }
  // banner across the street (diegetic text)
  STREET.banner = plane(8.4, 1.6, toon('#ffffff', P.label(['LONDON  1928'], { w: 1024, h: 196, bg: '#f2e2b8', font: 'bold 120px Georgia', bw: 14 }), { side: THREE.DoubleSide }), [0, 6.2, -14], [0, 0, 0], S);
  for (const s of [-1, 1]) add(cyl(0.02, 0.02, 4.5), M.dark, [s * 6.3, 6.6, -14], [0, 0, s * 1.2], S, { cast: false });
  // clock tower far away
  const ct = group([6, 0, -95], S);
  tbox(5, 34, 5, M.stone, [0, 17, 0], ct, 0.4);
  plane(3.4, 3.4, toon('#f4ead2'), [0, 30, 2.52], [0, 0, 0], ct, { cast: false });
  add(new THREE.ConeGeometry(3.8, 9, 4), M.roof, [0, 38.5, 0], [0, Math.PI / 4, 0], ct);
  // clouds
  const ctex = P.cloudTex();
  for (let i = 0; i < 6; i++) { const c = plane(30, 15, new THREE.MeshBasicMaterial({ map: ctex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }), [-40 + i * 18, 34 + (i % 3) * 6, -120], [0, 0, 0], S, { cast: false, receive: false }); c.userData.nd = null; }
  // market cart with bottles (S10)
  STREET.cart = group([1.5, 0, -6], S);
  tbox(2.2, 0.15, 1.1, M.bench, [0, 0.8, 0], STREET.cart, 1);
  for (const x of [-0.8, 0.8]) add(new THREE.TorusGeometry(0.38, 0.06, 8, 18), M.dark, [x, 0.4, 0.6], [0, 0, 0], STREET.cart);
  for (let i = 0; i < 10; i++) bottle(STREET.cart, [-0.9 + (i % 5) * 0.45, 0.88, -0.25 + Math.floor(i / 5) * 0.45], '#e9b44a', 0.3, P.label(['P'], { w: 128, h: 96, font: 'bold 70px Georgia' }));
}

// ============ MACRO DISH ============
export const macro = group([-100, 0, 0]);
export const MACRO = {};
{
  const G = macro;
  tbox(40, 1, 40, M.benchTop, [0, -0.5, 0], G, 0.25);
  add(cyl(3.2, 3.2, 0.3, 64), M.glassRim, [0, 0.15, 0], [0, 0, 0], G, { cast: false });
  const rim = add(new THREE.CylinderGeometry(3.25, 3.25, 0.7, 64, 1, true), M.glassRim, [0, 0.35, 0], [0, 0, 0], G, { cast: false }); rim.userData.nd = null;
  add(new THREE.TorusGeometry(3.25, 0.04, 6, 64), M.glassRim, [0, 0.7, 0], [Math.PI / 2, 0, 0], G, { cast: false });
  add(cyl(3.1, 3.1, 0.3, 64), M.agar, [0, 0.3, 0], [0, 0, 0], G);
  // bacteria colonies (instanced)
  const N = 260, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), toon('#d77aa8'), N);
  inst.castShadow = true; inst.receiveShadow = true;
  MACRO.bact = []; let seed = 1;
  const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < N; i++) { const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * 2.85; MACRO.bact.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.7 + rr() * 0.8 }); }
  MACRO.inst = inst; G.add(inst);
  MACRO.moldC = [0.5, 0.45, -0.3];
  MACRO.mold = group(MACRO.moldC, G);
  for (let i = 0; i < 14; i++) { const a = i * 2.39, d = 0.12 + 0.28 * Math.sqrt(i / 14); add(sph(0.22 + 0.1 * ((i * 7) % 3) / 2, 14, 10), M.mold, [Math.cos(a) * d, 0.05 + 0.08 * ((i * 3) % 2), Math.sin(a) * d], [0, 0, 0], MACRO.mold); }
  for (let i = 0; i < 26; i++) { const a = i * 0.9, d = 0.35 + 0.15 * ((i * 5) % 3); const h = add(cyl(0.012, 0.012, 0.25, 5), toon('#e8f5ee'), [Math.cos(a) * d, 0.2, Math.sin(a) * d], [Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5], MACRO.mold, { cast: false }); h.userData.nd = null; }
  // halo glow ring + mist wave
  MACRO.ring = add(new THREE.TorusGeometry(1, 0.035, 8, 80), basic('#bff7ff', { transparent: true, opacity: 0.9, fog: false }), [MACRO.moldC[0], 0.47, MACRO.moldC[2]], [Math.PI / 2, 0, 0], G, { cast: false, receive: false });
  MACRO.ring.userData.nd = null;
  MACRO.wave = add(new THREE.TorusGeometry(1, 0.12, 8, 80), basic('#9ff0d8', { transparent: true, opacity: 0.5, fog: false, depthWrite: false }), [MACRO.moldC[0], 0.5, MACRO.moldC[2]], [Math.PI / 2, 0, 0], G, { cast: false, receive: false });
  MACRO.wave.userData.nd = null;
  // picket fence (analogy)
  MACRO.fence = group([MACRO.moldC[0], 0.45, MACRO.moldC[2]], G);
  const pk = toon('#f6f3ea');
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; tbox(0.07, 0.38, 0.03, pk, [Math.cos(a) * 1.15, 0.19, Math.sin(a) * 1.15], MACRO.fence, 1, { rot: [0, -a + Math.PI / 2, 0] }); }
  const railG = new THREE.TorusGeometry(1.15, 0.018, 6, 64);
  add(railG, pk, [0, 0.27, 0], [Math.PI / 2, 0, 0], MACRO.fence); add(railG, pk, [0, 0.12, 0], [Math.PI / 2, 0, 0], MACRO.fence);
}
export const setBacteria = (fn) => { // fn(b, i) -> scale multiplier
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  MACRO.bact.forEach((b, i) => { const k = fn(b, i); p.set(b.x, 0.45, b.z); s.set(b.s * k, b.s * k * 0.55, b.s * k); m.compose(p, q, s); MACRO.inst.setMatrixAt(i, m); });
  MACRO.inst.instanceMatrix.needsUpdate = true;
};

// ============ KID ROOM ============
export const room = group([100, 0, 100]);
export const ROOM = {};
{
  const R = room;
  tbox(8, 0.3, 7, M.floorWood, [0, -0.15, -0.5], R, 1);
  tbox(8, 3.6, 0.3, M.wallKid, [0, 1.8, -4.0], R, 1);
  tbox(0.3, 3.6, 7, M.wallKid, [-4.0, 1.8, -0.5], R, 1);
  tbox(0.3, 3.6, 7, M.wallKid, [4.0, 1.8, -0.5], R, 1);
  add(new THREE.CircleGeometry(1.3, 32), M.rug, [-0.5, 0.01, -0.5], [-Math.PI / 2, 0, 0], R, { cast: false }).scale.y = 0.7;
  plane(1.4, 1.8, toon('#ffffff', P.windowTex('#bfe0f0')), [-1.6, 2.0, -3.84], [0, 0, 0], R, { cast: false });
  plane(0.8, 1.0, toon('#ffffff', P.poster('#f2c230', (g) => { g.fillStyle = '#c0353a'; for (let i = 0; i < 5; i++) { g.beginPath(); const a = i * 1.2566 - 1.57; g.moveTo(128, 160); g.lineTo(128 + 90 * Math.cos(a), 160 + 90 * Math.sin(a)); g.lineTo(128 + 90 * Math.cos(a + 0.6), 160 + 90 * Math.sin(a + 0.6)); g.fill(); } })), [1.2, 2.3, -3.84], [0, 0, 0], R, { cast: false });
  plane(0.7, 0.9, toon('#ffffff', P.poster('#5aa0c9', (g) => { g.fillStyle = '#f4ead2'; g.beginPath(); g.arc(128, 150, 70, 0, 7); g.fill(); g.fillStyle = '#2a1a22'; g.fillRect(118, 60, 20, 180); })), [2.4, 2.1, -3.84], [0, 0, 0], R, { cast: false });
  // bed
  tbox(1.4, 0.45, 2.4, M.bed, [-3.0, 0.225, -2.5], R, 1); tbox(1.42, 0.12, 2.0, M.blanket, [-3.0, 0.5, -2.3], R, 1);
  tbox(1.4, 0.9, 0.12, M.bed, [-3.0, 0.45, -3.72], R, 1);
  // desk with mess
  tbox(2.2, 0.08, 1.0, M.bench, [1.2, 0.8, -3.2], R, 2); for (const x of [0.2, 2.2]) tbox(0.08, 0.8, 0.9, M.bench, [x, 0.4, -3.2], R, 1);
  const bc = ['#c0353a', '#2b6aa8', '#e9b44a', '#6ab36a'];
  for (let i = 0; i < 6; i++) tbox(0.35, 0.06, 0.25, toon(bc[i % 4]), [0.6 + (i % 2) * 0.1, 0.87 + i * 0.065, -3.3], R, 1, { rot: [0, i * 0.3, 0] });
  for (let i = 0; i < 5; i++) { const pp = plane(0.21, 0.29, toon('#f4efe0'), [1.2 + i * 0.18, 0.845, -3.0 - (i % 2) * 0.2], [-Math.PI / 2, 0, i], R, { cast: false }); pp.userData.nd = null; }
  add(cyl(0.06, 0.05, 0.12, 14), toon('#e05a5a'), [2.0, 0.9, -3.4], [0, 0, 0], R);
  add(cyl(0.18, 0.18, 0.02, 20), toon('#f6f3ea'), [1.75, 0.85, -3.0], [0, 0, 0], R);
  for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.08, 0.04, 6, 12), toon(i % 2 ? '#f0b84a' : '#5aa0c9'), [-0.6 + i * 0.7, 0.04, -1.2 + (i % 2) * 0.8], [Math.PI / 2, 0, i], R); // socks/toys on floor
  ROOM.dish = makeDish(R, [1.35, 0.84, -2.95], 0.1, { mold: true });
  ROOM.glow = new THREE.PointLight(0x9ff0d8, 0, 2.2, 1.5); ROOM.glow.position.set(1.35, 1.1, -2.85); R.add(ROOM.glow);
}

export const SETS = { lab, lower, facade, street, macro, room };
export const showSets = (...names) => { for (const k in SETS) SETS[k].visible = names.includes(k); };
