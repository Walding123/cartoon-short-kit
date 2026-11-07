
// ---------------- cast for "penisilin" (same module scope as toonbase.js) ----------------
export const FLEMING = { jacket: "#f3f1ea", pants: "#4a4f63", boots: "#3a2a22", hat: "hair", hair: "#8d8a90", coat: true, bowtie: "#c0353a", skin: "#ffe2c2" };
export const FLEMING_HOLIDAY = { jacket: "#f2c46b", pants: "#e8e2cf", boots: "#7a4b2a", hat: "boater", hair: "#8d8a90", skin: "#ffe2c2", shirt: "#f7f3e8" };
export const SCI2 = { jacket: "#f3f1ea", pants: "#3f4a3e", boots: "#2b2222", hat: null, coat: true, moustache: "#5a3b2a", skin: "#f5c9a0", build: "stout", bowtie: "#2b6aa8" };
export const SCI3 = { jacket: "#f3f1ea", pants: "#584238", boots: "#2b2222", hat: "hair", hair: "#3a2a22", coat: true, skin: "#ecd0b6", bowtie: "#2b8a5a" };
export const KIDO = { jacket: "#3fa2d9", pants: "#e8a23a", boots: "#f4f1ea", hat: "hair", hair: "#3a2418", build: "kid", skin: "#f1c9a0" };
export const MOM = { jacket: "#c94f7c", pants: "#3b3f52", boots: "#5a3b2a", hat: "bun", hair: "#3a2418", dress: "#c94f7c", skin: "#f1c9a0" };
export const FOLK = [
  { jacket: "#2f8f6b", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#4a5a8a", skin: "#ffe2c2" },
  { jacket: "#e07a3a", pants: "#3b3f52", boots: "#5a3b2a", hat: "bun", hair: "#c9852e", dress: "#e07a3a", skin: "#f5c9a0" },
  { jacket: "#6a5ac9", pants: "#2e3340", boots: "#2b2222", hat: "hair", hair: "#2b2222", skin: "#c99067" },
  { jacket: "#d94a4a", pants: "#455060", boots: "#3a2a22", hat: "hair", hair: "#8a5a2a", skin: "#ecd0b6", build: "kid" },
];

const R2 = (d) => (d * Math.PI) / 180;

/** extra headwear on top of toon's hats */
const hatExtra = (p, o, H, cx, hc, light) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b;
  if (o.hat === "boater") {
    const yb = crown + 0.2 * HH;
    p.ell(cx, yb + 2 * u, 0.62 * W, 0.07 * HH, "#e8c86a", 3.5 * u);
    p.poly([[cx - 0.36 * W, yb], [cx - 0.33 * W, yb - 0.26 * HH], [cx + 0.33 * W, yb - 0.26 * HH], [cx + 0.36 * W, yb]], "#f0d27a", 3.5 * u);
    p.clip([[cx - 0.36 * W, yb], [cx - 0.33 * W, yb - 0.26 * HH], [cx + 0.33 * W, yb - 0.26 * HH], [cx + 0.36 * W, yb]],
      () => p.band([[cx - 0.4 * W, yb - 0.07 * HH], [cx + 0.4 * W, yb - 0.07 * HH]], "#2b4a8a", 0.09 * HH, 0));
  }
  if (o.hat === "bun") p.ell(cx + 4 * u, crown - 6 * u, 20 * u, 17 * u, o.hair, 4 * u);
};

/** arm polyline [shoulder, elbow, hand] for a named pose */
const armFor = (pose, side, S, tcx, T, HH, u, chin, f) => {
  const sx = S[0], sy = S[1], s = side;
  const t = f || 0;
  switch (pose) {
    case "wave": { const w = Math.sin(t * 0.45) * 0.5 + 0.5; return [S, [tcx + s * (T.a + 14 * u + 3 * u * w), sy - 0.2 * HH], [tcx + s * (T.a + 22 * u + 14 * u * w), sy - 0.62 * HH]]; }
    case "up": return [S, [sx + s * 10 * u, sy - 0.45 * HH], [sx + s * 14 * u, sy - 0.95 * HH]];
    case "lift": return [S, [sx + s * 30 * u, sy - 0.25 * HH], [sx + s * 46 * u, sy - 0.8 * HH]];
    case "point": return [S, [sx + s * 30 * u, sy - 0.08 * HH], [sx + s * 62 * u, sy - 0.2 * HH]];
    case "pointUp": return [S, [sx + s * 26 * u, sy - 0.15 * HH], [sx + s * 40 * u, sy - 0.55 * HH]];
    case "hip": return [S, [sx + s * 26 * u, sy + 0.3 * HH], [tcx + s * (T.a - 2 * u), sy + 0.62 * HH]];
    case "hold": return [S, [sx + s * 14 * u, sy + 0.42 * HH], [tcx + s * 14 * u, sy + 0.42 * HH]];
    case "holdHigh": return [S, [sx + s * 18 * u, sy + 0.28 * HH], [tcx + s * 18 * u, sy + 0.05 * HH]];
    case "chin": return [S, [sx + s * 16 * u, sy + 0.4 * HH], [tcx + s * 10 * u, chin - 0.06 * HH]];
    case "shrug": return [S, [sx + s * 24 * u, sy + 0.25 * HH], [sx + s * 44 * u, sy + 0.05 * HH]];
    case "thumb": return [S, [sx + s * 18 * u, sy + 0.4 * HH], [tcx + s * 22 * u, sy + 0.18 * HH]];
    case "magnify": return [S, [sx + s * 22 * u, sy + 0.25 * HH], [tcx + s * 22 * u, chin - 0.42 * HH]];
    case "toss": return [S, [sx + s * 22 * u, sy - 0.25 * HH], [sx + s * 50 * u, sy - 0.55 * HH]];
    case "cheer": return [S, [sx + s * 22 * u, sy - 0.35 * HH], [sx + s * 30 * u + 6 * u * Math.sin(t * 0.5 + s), sy - 0.85 * HH]];
    default: { const ex = tcx + s * (1.12 * T.a + 4 * u); return [S, [ex, sy + 0.48 * HH], [ex + s * 3 * u, chin + 1.04 * HH]]; }
  }
};
const FRONT_POSES = new Set(["hold", "holdHigh", "chin", "thumb", "magnify", "lift"]);

/** a prop held at hand (hx, hy) */
const drawProp = (p, kind, hx, hy, u, side, f) => {
  switch (kind) {
    case "suitcase":
      p.poly([[hx - 24 * u, hy + 6 * u], [hx + 24 * u, hy + 6 * u], [hx + 24 * u, hy + 42 * u], [hx - 24 * u, hy + 42 * u]], "#9a5a32", 3 * u);
      p.stroke([[hx - 24 * u, hy + 18 * u], [hx + 24 * u, hy + 18 * u]], 2 * u);
      p.poly([[hx - 8 * u, hy + 6 * u], [hx - 8 * u, hy - 2 * u], [hx + 8 * u, hy - 2 * u], [hx + 8 * u, hy + 6 * u]], null, 3 * u);
      p.ell(hx + 14 * u, hy + 30 * u, 5 * u, 5 * u, "#e8c45a", 1.5 * u);
      p.dot(hx, hy, 5.5 * u);
      break;
    case "dish": case "dishMold":
      p.ell(hx, hy - 4 * u, 26 * u, 10 * u, "#cfe9ef", 3 * u);
      p.ell(hx, hy - 6 * u, 20 * u, 6.5 * u, "#f2dc8a", 0);
      for (let i = 0; i < 6; i++) p.dot(hx - 14 * u + i * 5.5 * u, hy - 6 * u + ((i * 7) % 5 - 2) * u, 1.8 * u, "#c66a9a");
      if (kind === "dishMold") p.ell(hx + 4 * u, hy - 7 * u, 7 * u, 3.5 * u, "#3f9a8a", 1.2 * u);
      p.dot(hx - 22 * u, hy, 5.5 * u); p.dot(hx + 22 * u, hy, 5.5 * u);
      break;
    case "flask": { const k = 1.5; const P = (x, y) => [hx + (x - hx) * k, hy + (y - hy) * k];
      p.poly([[hx - 5 * u, hy - 40 * u], [hx + 5 * u, hy - 40 * u], [hx + 5 * u, hy - 22 * u], [hx + 20 * u, hy + 6 * u], [hx - 20 * u, hy + 6 * u], [hx - 5 * u, hy - 22 * u]].map(q => P(q[0], q[1] - 10 * u)), "#bfe6ea", 3 * u);
      p.poly([[hx - 13 * u, hy - 8 * u], [hx + 13 * u, hy - 8 * u], [hx + 18 * u, hy + 3 * u], [hx - 18 * u, hy + 3 * u]].map(q => P(q[0], q[1] - 10 * u)), "#e8c84a", 2 * u);
      p.dot(hx, hy, 5.5 * u);
      break; }
    case "magnifier":
      p.band([[hx, hy], [hx + side * 10 * u, hy + 22 * u]], "#7a4b2a", 5 * u, 1.5 * u, "round");
      p.ell(hx - side * 8 * u, hy - 18 * u, 18 * u, 18 * u, "rgba(220,240,255,0.55)", 4 * u);
      p.ell(hx - side * 8 * u, hy - 18 * u, 18 * u, 18 * u, null, 5 * u);
      p.dot(hx, hy, 5.5 * u);
      break;
    case "medal": {
      p.stroke([[hx - 8 * u, hy - 6 * u], [hx, hy + 20 * u], [hx + 8 * u, hy - 6 * u]], 5 * u, "#c0353a");
      p.ell(hx, hy + 34 * u, 16 * u, 16 * u, "#f2c230", 3.5 * u);
      p.ell(hx, hy + 34 * u, 10 * u, 10 * u, "#ffd95a", 1.5 * u);
      p.dot(hx, hy, 5.5 * u);
      break;
    }
    case "bottle":
      p.poly([[hx - 4 * u, hy - 34 * u], [hx + 4 * u, hy - 34 * u], [hx + 4 * u, hy - 24 * u], [hx + 11 * u, hy - 18 * u], [hx + 11 * u, hy + 8 * u], [hx - 11 * u, hy + 8 * u], [hx - 11 * u, hy - 18 * u], [hx - 4 * u, hy - 24 * u]], "#e9b44a", 3 * u);
      p.poly([[hx - 9 * u, hy - 12 * u], [hx + 9 * u, hy - 12 * u], [hx + 9 * u, hy], [hx - 9 * u, hy]], "#fff6dc", 1.5 * u);
      p.dot(hx, hy, 5.5 * u);
      break;
    case "popsicle": case "popsicleRed": { // ice pop on a stick, pointing up from the hand
      const col = kind === "popsicleRed" ? "#e2504a" : "#f2913a", w = 13 * u, top = hy - 74 * u, bot = hy - 24 * u;
      p.band([[hx, hy + 6 * u], [hx, bot + 4 * u]], "#d9b27a", 5 * u, 1.5 * u);
      p.poly([[hx - w, bot], [hx - w, top + w], [hx - w * 0.7, top + w * 0.3], [hx, top], [hx + w * 0.7, top + w * 0.3], [hx + w, top + w], [hx + w, bot]], col, 3.5 * u);
      p.band([[hx - w * 0.45, top + 16 * u], [hx - w * 0.45, bot - 8 * u]], "rgba(255,255,255,0.55)", 3 * u, 0);
      p.dot(hx, hy, 5.5 * u);
      break;
    }
    case "packet": // paper sachet of soda powder
      p.poly([[hx - 12 * u, hy - 30 * u], [hx + 12 * u, hy - 34 * u], [hx + 14 * u, hy + 2 * u], [hx - 10 * u, hy + 4 * u]], "#f4ead2", 3 * u);
      p.poly([[hx - 11 * u, hy - 18 * u], [hx + 13 * u, hy - 21 * u], [hx + 13.5 * u, hy - 12 * u], [hx - 10.5 * u, hy - 9 * u]], "#e2504a", 1.5 * u);
      p.dot(hx, hy, 5.5 * u);
      break;
    default: p.dot(hx, hy, 5.5 * u);
  }
};

/**
 * Full-body front figure. opts: mode stand|walk|sit, phase, expr, blink, look, facing, seed, tilt, headTilt,
 * armL, armR (pose names), propL, propR, light, f (frame, for waving)
 */
export const figure = (p, o, opts) => {
  const { phase = 0, expr = "neutral", mode = "stand", look = 0, blink = 0, tilt = 0, headTilt = 0, light = R2(-120), facing = 0, seed = 1,
    armL = "hang", armR = "hang", propL = null, propR = null, f = 0 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  const walking = mode === "walk";
  const bob = walking ? 0.018 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = o.coat ? "#e4e0d4" : mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  p.rot = null;
  // legs
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h = [300 + side * 15 * u, hipY], k = [300 + side * 30 * u, hipY + 0.25 * HH], fo = [300 + side * 34 * u, sole - 8 * u];
      p.stroke(curve(h, k, fo), legW, legCol);
      footStroke(p, [fo[0] - side * 2 * u, fo[1]], [fo[0] + side * 12 * u, fo[1] - 3 * u], footW, footCol);
    }
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const up = walking ? Math.max(0, Math.sin(two * (phase + (side > 0 ? 0.5 : 0)))) * 25 : 0;
      const fx = 300 + side * 12 * u, fy = sole - 4 * u - up;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = walking ? 40 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // upper body
  const sway = walking ? 1.2 * Math.sin(two * phase) : 0, A = tilt + sway;
  p.rot = A ? [R2(A), 300, hipY] : null;
  const T = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side) => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const sw = walking ? Math.sin(two * phase) : 0;
  const arms = [];
  for (const [side, pose, prop] of [[-1, armL, propL], [1, armR, propR]]) {
    let pts = armFor(pose, side, sh(side), tcx, T, HH, u, chin, f);
    if (pose === "hang" && sw) { pts = pts.map((q, i) => i === 2 ? [q[0] - side * 6 * u * sw * side, q[1]] : q); }
    arms.push({ pts, front: FRONT_POSES.has(pose), prop, side });
  }
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol);
    if (a.prop) drawProp(p, a.prop, a.pts[2][0], a.pts[2][1], u, a.side, f); else p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u);
  };
  for (const a of arms) if (!a.front) drawArm(a);
  if (o.dress && mode !== "sit") {
    const D = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress, mul(o.dress, SH_CLOTH), light); p.inkRing(dp, ow, thick);
  } else if (o.coat && mode !== "sit") {
    const C = { a: T.a * 1.08, b: 0.5 * ((torsoBot + 0.42 * HH) - (chin - 0.2 * HH)), nTop: 2.2, nBot: 3.2, egg: 0.18, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const cp = blobPts(tcx, torsoBot + 0.42 * HH - C.b, C);
    p.gradFill(cp, "#f6f4ee", "#c9cbd6", light);
    p.clip(cp, () => {
      p.stroke([[tcx + 2 * u * facing, chin + 0.3 * HH], [tcx + 2 * u * facing, torsoBot + 0.5 * HH]], 1.6 * u);
      p.poly([[tcx - 12 * u, chin - 0.02 * HH], [tcx + 2 * u * facing, chin + 0.32 * HH], [tcx + 12 * u, chin - 0.02 * HH]], o.shirt ?? "#dfe7f2", 1.6 * u);
      for (const s of [-1, 1]) p.poly([[tcx + s * 0.55 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.85 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.85 * T.a, torsoBot + 0.18 * HH], [tcx + s * 0.55 * T.a, torsoBot + 0.18 * HH]], null, 1.4 * u);
    });
    p.inkRing(cp, ow, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.shirt) p.poly([[tcx - 10 * u, chin - 0.02 * HH], [tcx, chin + 0.28 * HH], [tcx + 10 * u, chin - 0.02 * HH]], o.shirt, 1.6 * u);
      for (let i = 1; i < 4; i++) { const y = chin + 0.12 * HH + i * 0.2 * HH; p.dot(tcx + 2 * u * facing, y, 3 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, shade(o.jacket, 0.75)); }
    });
    p.inkRing(tp, ow, thick);
  }
  if (o.bowtie) {
    const bx = tcx + 2 * u * facing, by = chin + 0.04 * HH;
    p.poly([[bx, by], [bx - 11 * u, by - 6 * u], [bx - 11 * u, by + 6 * u]], o.bowtie, 1.8 * u);
    p.poly([[bx, by], [bx + 11 * u, by - 6 * u], [bx + 11 * u, by + 6 * u]], o.bowtie, 1.8 * u);
    p.ell(bx, by, 3.5 * u, 3.5 * u, o.bowtie, 1.6 * u);
  }
  // head
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], R2(A), [300, hipY]);
  p.rot = Ah ? [R2(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  const o2 = (o.hat === "boater") ? { ...o, hat: "hair" } : (o.hat === "bun" ? { ...o, hat: "hair" } : o);
  if (o.hat === "bun") hatExtra(p, o, H, 300, hc, light);
  hatBehind(p, o2, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (o2.hat) hatOn(p, o2, hp, H, 300, hc, light, seed, facing, false);
  if (o.hat === "boater") hatExtra(p, o, H, 300, hc, light);
  faceFront(p, 300, hc, W, expr, facing, look, lid, o.hat === "boater", skin, o.moustache, o.build === "stout");
  p.rot = A ? [R2(A), 300, hipY] : null;
  for (const a of arms) if (a.front) drawArm(a);
  p.rot = null;
  return { hc, chin, u, W };
};

/** head centre in design units for a build/seed (for aligning detached parts) */
export const headCenterOf = (o, seed = 1) => {
  const Bd = BUILD[o.build ?? "adult"], H = headBlob(seed, Bd.a, 0), HH = 2 * H.b;
  return 975 - Bd.legs * HH - Bd.torso * HH - H.b;
};

/** a little blob creature (bacterium / mold spirit) centred in the 600x1000 design canvas */
export const critter = (p, { col = "#d77aa8", expr = "neutral", seed = 3, squash = 0, blink = 0, look = 0, fuzzy = false, scale = 1 }) => {
  const B = { a: 210 * scale * (1 + squash), b: 190 * scale * (1 - squash), nTop: 2.3, nBot: 2.6, egg: 0.08, asym: 0, rot: 0, noise: fuzzy ? 0.05 : 0.012, seed };
  const cy = 975 - B.b - 10;
  const pts = blobPts(300, cy, B, fuzzy ? 140 : 72);
  if (fuzzy) {
    const g = p.g; g.save();
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const r = 1.04 + 0.08 * rnd(seed, i); p.ell(300 + Math.cos(a) * B.a * r, cy + Math.sin(a) * B.b * r, 18 * scale, 18 * scale, "#2f8a7c", 0); }
    g.restore();
  }
  p.shadedFill(pts, col, mul(col, [0.75, 0.75, 0.82]), R2(-120), B.a);
  for (let i = 0; i < 7; i++) p.ell(300 + (rnd(seed, i) - 0.5) * B.a * 1.2, cy + (rnd(seed, i + 9) - 0.2) * B.b * 0.9, 14 * scale, 10 * scale, shade(col, 0.88), 0);
  p.inkRing(pts, 14 * scale, thickAngle(R2(-120)));
  faceFront(p, 300, cy - 20 * scale, 240 * scale, expr, 0, look, lidOf(blink), false, col);
};


/**
 * Stickman berisi berwarna: kepala bulat berwarna, badan kapsul terisi, anggota badan tebal berkontur tinta.
 * o: { color (badan), head (kepala, bawaan = color), limb (lengan/kaki, bawaan = color), hand (tangan, bawaan = head), boots,
 *      hat/hair/cap/moustache (sama seperti figure), build: adult|kid, shirt (strip dada), belt }
 * opts sama dengan figure (mode stand|walk|sit, expr, armL/armR, propL/propR, facing, f, ...)
 */
export const stickman = (p, o, opts) => {
  const { phase = 0, expr = "neutral", mode = "stand", look = 0, blink = 0, tilt = 0, headTilt = 0, light = R2(-120), facing = 0, seed = 1,
    armL = "hang", armR = "hang", propL = null, propR = null, f = 0 } = opts;
  const Bd = BUILD[o.build ?? "adult"], two = Math.PI * 2, lid = lidOf(blink);
  const body = o.color ?? "#e8a23a", headCol = o.head ?? body, limbCol = o.limb ?? body, handCol = o.hand ?? headCol;
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975;
  const walking = mode === "walk";
  const bob = walking ? 0.018 * (1 + Bd.torso + Bd.legs) * HH * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, hipY = torsoBot - 0.1 * HH;
  const thick = thickAngle(light), ow = 4.4 * u, limbW = 8.5 * u;
  const limb = (pts, col = limbCol, w = limbW) => { p.stroke(pts, w + 2 * ow, INK); p.stroke(pts, w, col); };
  p.rot = null;
  // kaki
  const footAt = (x, y, side) => { p.ell(x + side * 5 * u, y, 10 * u, 5.5 * u, o.boots ?? shade(limbCol, 0.7), 3.2 * u); };
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h = [300 + side * 11 * u, hipY], k = [300 + side * 28 * u, hipY + 0.22 * HH], fo = [300 + side * 32 * u, sole - 9 * u];
      limb(curve(h, k, fo)); footAt(fo[0], fo[1] + 2 * u, side);
    }
  } else {
    const L = walking ? 40 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 11 * u, fx = 300 + side * 20 * u, fy = sole - 8 * u - up;
      const k = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      limb(curve([hx, hipY], k, [fx, fy])); footAt(fx, fy + 3 * u, side);
    }
  }
  // badan (kapsul terisi)
  const sway = walking ? 1.2 * Math.sin(two * phase) : 0, A = tilt + sway;
  p.rot = A ? [R2(A), 300, hipY] : null;
  const T = { a: 0.2 * W, b: 0.5 * (torsoBot - (chin - 0.18 * HH)), nTop: 2.4, nBot: 2.8, egg: 0.1, asym: 0.03 * facing, rot: 0, noise: 0.004, seed: seed + 7 };
  const tcx = 300 + 2 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side) => [tcx + side * 0.8 * T.a, chin + 0.1 * HH];
  const sw = walking ? Math.sin(two * phase) : 0;
  const arms = [];
  for (const [side, pose, prop] of [[-1, armL, propL], [1, armR, propR]]) {
    let pts = armFor(pose, side, sh(side), tcx, T, HH, u, chin, f);
    if (pose === "hang") pts = pts.map((q, i) => i ? [q[0] - side * 8 * u, q[1] - 0.06 * HH * (i - 1)] : q);
    if (pose === "hang" && sw) pts = pts.map((q, i) => i === 2 ? [q[0] + side * 6 * u * sw, q[1]] : q);
    arms.push({ pts, front: FRONT_POSES.has(pose), prop, side });
  }
  const drawArm = (a) => {
    limb(curve(a.pts[0], a.pts[1], a.pts[2]));
    if (a.prop) drawProp(p, a.prop, a.pts[2][0], a.pts[2][1], u, a.side, f); else p.ell(a.pts[2][0], a.pts[2][1], 6.5 * u, 6.5 * u, handCol, 3.2 * u);
  };
  for (const a of arms) if (!a.front) drawArm(a);
  p.gradFill(tp, body, mul(body, SH_CLOTH), light); p.inkRing(tp, ow, thick);
  if (o.belt) p.clip(tp, () => p.band([[tcx - T.a, torsoBot - 0.16 * HH], [tcx + T.a, torsoBot - 0.16 * HH]], o.belt, 0.14 * HH, 0));
  if (o.shirt) p.clip(tp, () => p.poly([[tcx - 0.55 * T.a, chin - 0.1 * HH], [tcx, chin + 0.3 * HH], [tcx + 0.55 * T.a, chin - 0.1 * HH]], o.shirt, 1.8 * u));
  // kepala
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], R2(A), [300, hipY]);
  p.rot = Ah ? [R2(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  const o2 = (o.hat === "boater" || o.hat === "bun") ? { ...o, hat: "hair" } : o;
  if (o.hat === "bun") hatExtra(p, o, H, 300, hc, light);
  hatBehind(p, o2, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, headCol, mul(headCol, SH_SKIN), light, H.a);
  p.inkRing(hp, ow * 1.15, thick);
  if (o2.hat) hatOn(p, o2, hp, H, 300, hc, light, seed, facing, false);
  if (o.hat === "boater") hatExtra(p, o, H, 300, hc, light);
  faceFront(p, 300, hc, W, expr, facing, look, lid, o.hat === "boater", headCol, o.moustache, false);
  p.rot = A ? [R2(A), 300, hipY] : null;
  for (const a of arms) if (a.front) drawArm(a);
  p.rot = null;
  return { hc, chin, u, W };
};

/** tokoh stickman siap pakai (warna badan beda-beda) */
export const STICK = {
  merah:  { color: "#e0463f", head: "#ffe2c2" },
  biru:   { color: "#3f8fe0", head: "#ffe2c2" },
  hijau:  { color: "#3fae6a", head: "#ffe2c2" },
  kuning: { color: "#f2c230", head: "#ffe2c2" },
  ungu:   { color: "#8a5ad0", head: "#ffe2c2" },
  oranye: { color: "#f08a2c", head: "#ffe2c2" },
};
