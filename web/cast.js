
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
 * Tokoh hoodie (gaya maskot): kepala bulat putih, hoodie tebal (tudung, tali, kantong), tangan putih besar,
 * celana berlipatan, sneakers bersol putih.
 * o: { color (hoodie), pants, shoes, head (bawaan putih), hand (bawaan putih), cuff (lipatan celana), build: adult|kid,
 *      hat/hair/cap/moustache }
 */
export const hoodie = (p, o, opts) => {
  const { phase = 0, expr = "neutral", mode = "stand", look = 0, blink = 0, tilt = 0, headTilt = 0, light = R2(-120), facing = 0, seed = 1,
    armL = "hang", armR = "hang", propL = null, propR = null, f = 0 } = opts;
  const HB = { adult: { a: 118, torso: 0.95, legs: 0.82, tw: 0.8 }, kid: { a: 112, torso: 0.8, legs: 0.7, tw: 0.72 } };
  const Bd = HB[o.build ?? "adult"], two = Math.PI * 2, lid = lidOf(blink);
  const body = o.color ?? "#1f5fe0", pants = o.pants ?? "#2a2a30", shoes = o.shoes ?? body, headCol = o.head ?? "#ffffff", handCol = o.hand ?? "#ffffff";
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975;
  const walking = mode === "walk";
  const bob = walking ? 0.018 * (1 + Bd.torso + Bd.legs) * HH * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, hipY = torsoBot - 0.1 * HH;
  const thick = thickAngle(light), ow = 4.6 * u, legW = 17 * u, armW = 15 * u;
  const limb = (pts, col, w) => { p.stroke(pts, w + 2 * ow, INK); p.stroke(pts, w, col); };
  p.rot = null;
  // sneakers: sol putih, badan sepatu berwarna, ujung putih, tali
  const shoe = (x, y, side) => {
    const cx = x + side * 7 * u;
    p.ell(cx, y + 6 * u, 19 * u, 7.5 * u, "#f4f4f6", 3.6 * u);
    p.ell(cx - side * 2 * u, y - 1 * u, 14.5 * u, 9.5 * u, shoes, 3.6 * u);
    p.ell(cx + side * 10 * u, y + 1 * u, 9 * u, 7.5 * u, "#f4f4f6", 3.2 * u);
    for (const d of [-5, 0, 5]) p.stroke([[cx - side * 6 * u + side * d * u * 0.2, y - 6 * u + d * 0.25 * u], [cx - side * 1 * u + side * d * u * 0.2, y - 3 * u + d * 0.25 * u]], 1.8 * u, "#f4f4f6");
  };
  const leg = (h, k, fo, side) => {
    limb(curve(h, k, fo), pants, legW);
    const a = [fo[0] + (k[0] - fo[0]) * 0.18, fo[1] + (k[1] - fo[1]) * 0.18 - 6 * u];
    p.stroke([[fo[0], fo[1] - 6 * u], a], legW + 5 * u, INK); p.stroke([[fo[0], fo[1] - 6 * u], a], legW + 1.5 * u, o.cuff ?? shade(pants, 1.25));
    shoe(fo[0], fo[1], side);
  };
  if (mode === "sit") {
    for (const side of [-1, 1]) leg([300 + side * 16 * u, hipY], [300 + side * 32 * u, hipY + 0.2 * HH], [300 + side * 36 * u, sole - 14 * u], side);
  } else {
    const L = walking ? 40 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 16 * u, fx = 300 + side * 22 * u, fy = sole - 14 * u - up;
      const k = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      leg([hx, hipY], k, [fx, fy], side);
    }
  }
  // badan
  const sway = walking ? 1.2 * Math.sin(two * phase) : 0, A = tilt + sway;
  p.rot = A ? [R2(A), 300, hipY] : null;
  const T = { a: 0.36 * W, b: 0.5 * (torsoBot + 0.04 * HH - (chin - 0.12 * HH)), nTop: 2.3, nBot: 2.7, egg: 0.08, asym: 0.03 * facing, rot: 0, noise: 0.004, seed: seed + 7 };
  const tcx = 300 + 2 * u * facing, tcy = torsoBot + 0.04 * HH - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side) => [tcx + side * 0.82 * T.a, chin + 0.1 * HH];
  const sw = walking ? Math.sin(two * phase) : 0;
  const arms = [];
  for (const [side, pose, prop] of [[-1, armL, propL], [1, armR, propR]]) {
    let pts = armFor(pose, side, sh(side), tcx, T, HH, u, chin, f);
    if (pose === "hang") pts = pts.map((q, i) => i ? [q[0] - side * 4 * u, q[1] - 0.04 * HH * (i - 1)] : q);
    if (pose === "hang" && sw) pts = pts.map((q, i) => i === 2 ? [q[0] + side * 6 * u * sw, q[1]] : q);
    arms.push({ pts, front: FRONT_POSES.has(pose), prop, side, pose });
  }
  const drawArm = (a) => {
    limb(curve(a.pts[0], a.pts[1], a.pts[2]), body, armW);
    const [hx, hy] = a.pts[2];
    if (a.prop) { drawProp(p, a.prop, hx, hy, u, a.side, f); return; }
    p.ell(hx, hy, 13 * u, 12 * u, handCol, 3.8 * u);
    if (a.pose === "thumb") p.ell(hx - a.side * 1 * u, hy - 15 * u, 6.5 * u, 10 * u, handCol, 3.6 * u);
    else p.ell(hx + a.side * 10 * u, hy - 5 * u, 5.5 * u, 4.6 * u, handCol, 3.4 * u);
  };
  for (const a of arms) if (!a.front) drawArm(a);
  // tudung di belakang kepala
  p.ell(tcx, chin + 0.02 * HH, 0.3 * W, 0.13 * HH, shade(body, 0.8), ow);
  p.gradFill(tp, body, mul(body, SH_CLOTH), light);
  p.clip(tp, () => {
    p.band([[tcx - T.a, torsoBot - 0.05 * HH], [tcx + T.a, torsoBot - 0.05 * HH]], shade(body, 0.88), 0.13 * HH, 0);
    p.poly([[tcx - 0.55 * T.a, torsoBot - 0.5 * HH], [tcx + 0.55 * T.a, torsoBot - 0.5 * HH], [tcx + 0.7 * T.a, torsoBot - 0.14 * HH], [tcx - 0.7 * T.a, torsoBot - 0.14 * HH]], shade(body, 0.93), 2 * u);
  });
  p.inkRing(tp, ow, thick);
  for (const s of [-1, 1]) { // tali tudung
    const x0 = tcx + s * 7 * u, y0 = chin + 0.1 * HH;
    p.stroke([[x0, y0], [x0 + s * 1.5 * u, y0 + 0.24 * HH]], 3.4 * u, INK); p.stroke([[x0, y0], [x0 + s * 1.5 * u, y0 + 0.24 * HH]], 1.8 * u, "#f4f4f6");
    p.ell(x0 + s * 1.5 * u, y0 + 0.27 * HH, 2.6 * u, 3.6 * u, "#f4f4f6", 2 * u);
  }
  // kepala
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], R2(A), [300, hipY]);
  p.rot = Ah ? [R2(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  const o2 = (o.hat === "boater" || o.hat === "bun") ? { ...o, hat: "hair" } : o;
  if (o.hat === "bun") hatExtra(p, o, H, 300, hc, light);
  hatBehind(p, o2, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, headCol, mul(headCol, [0.9, 0.9, 0.97]), light, H.a);
  p.inkRing(hp, ow * 1.2, thick);
  if (o2.hat) hatOn(p, o2, hp, H, 300, hc, light, seed, facing, false);
  if (o.hat === "boater") hatExtra(p, o, H, 300, hc, light);
  faceFront(p, 300, hc, W, expr, facing, look, lid, o.hat === "boater", headCol, o.moustache, false);
  p.rot = A ? [R2(A), 300, hipY] : null;
  for (const a of arms) if (a.front) drawArm(a);
  p.rot = null;
  return { hc, chin, u, W };
};

/** ubah data tokoh lama (jacket/pants/boots, mis. FOLK, FLEMING) ke opsi hoodie */
export const asHoodie = (o) => ({ color: o.jacket, pants: o.pants, shoes: o.boots, hat: o.hat, hair: o.hair, cap: o.cap,
  moustache: o.moustache, build: o.build === "kid" ? "kid" : "adult" });

/** preset hoodie: warna hoodie + celana */
export const HOODIE = {
  biru:   { color: "#1f5fe0", pants: "#2a2a30" },
  merah:  { color: "#e0463f", pants: "#2f3240" },
  hijau:  { color: "#2fa35f", pants: "#3a3a44" },
  kuning: { color: "#f2b82a", pants: "#2f3a55" },
  ungu:   { color: "#8a5ad0", pants: "#2a2a30" },
  oranye: { color: "#f08a2c", pants: "#2a3350" },
};
