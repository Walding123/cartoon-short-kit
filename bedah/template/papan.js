
// ================== PAPAN: tata letak + palet warna dari tema.json (dipasang otomatis kalau scene_body.js berisi "@papan") ==================
// tema.json: { "palet": "malam", "tata": "papan", "kicker": "ANATOMI ALAT GYM", "judul": "Leg press", "warna": { "aksen": "#ff5a36" } }
// palet: malam, neon, senja, hutan, kertas, es  ·  tata: papan (judul+kartu | adegan | subtitle), layar (adegan penuh, kartu & subtitle melayang),
// atas (adegan besar di atas, kartu + subtitle di bawah), sinematik (adegan penuh, judul kecil, kartu kecil, subtitle film),
// cerita (layar lebar berpita, judul bab besar, tanpa kartu). "warna" menimpa sebagian warna palet.
const PALET = {
  malam:  { bg: '#16181d', panel: '#1e2229', garis: '#2e333d', teks: '#ffffff', redup: '#8b93a3', sisa: '#59606e', aksen: '#f5a524', baik: '#3dd68c', buruk: '#ff6b6b', pil: '#ffc53d', pilTeks: '#16181d', lantai: '#15171c', langit: '#121419', grid: 'rgba(120,140,170,.10)' },
  neon:   { bg: '#0d0f1f', panel: '#151936', garis: '#262c5c', teks: '#ffffff', redup: '#8f97d6', sisa: '#4b5290', aksen: '#22d3ee', baik: '#a3e635', buruk: '#f472b6', pil: '#e879f9', pilTeks: '#0d0f1f', lantai: '#0c0e1d', langit: '#0a0c19', grid: 'rgba(110,150,255,.16)' },
  senja:  { bg: '#1c1325', panel: '#261a33', garis: '#3a2a4c', teks: '#ffffff', redup: '#b39cc9', sisa: '#6d5784', aksen: '#ff7a59', baik: '#ffd166', buruk: '#ef476f', pil: '#ff7a59', pilTeks: '#1c1325', lantai: '#1a1222', langit: '#150e1c', grid: 'rgba(200,150,255,.10)' },
  hutan:  { bg: '#101a15', panel: '#16241d', garis: '#24382d', teks: '#f1f7f2', redup: '#87a596', sisa: '#4d6a5b', aksen: '#c6f432', baik: '#5eead4', buruk: '#fb7185', pil: '#c6f432', pilTeks: '#101a15', lantai: '#0f1813', langit: '#0c140f', grid: 'rgba(150,220,170,.10)' },
  kertas: { bg: '#f4efe6', panel: '#fffaf2', garis: '#e2d8c6', teks: '#1d1b18', redup: '#8a7f6e', sisa: '#c2b8a6', aksen: '#e4572e', baik: '#2f9e6a', buruk: '#d64545', pil: '#1d1b18', pilTeks: '#fffaf2', lantai: '#ece5d8', langit: '#efe8dc', grid: 'rgba(120,100,70,.12)' },
  es:     { bg: '#eef3fa', panel: '#ffffff', garis: '#d6e0ee', teks: '#0f1b2d', redup: '#6a7a92', sisa: '#b3c0d3', aksen: '#2563eb', baik: '#059669', buruk: '#dc2626', pil: '#2563eb', pilTeks: '#ffffff', lantai: '#e6edf6', langit: '#e9eff7', grid: 'rgba(60,90,140,.12)' },
};
const TEMA = await (async () => { let j = {}; try { const r = await fetch('./tema.json'); if (r.ok) j = await r.json(); } catch {} return j; })();
const PP = { ...(PALET[TEMA.palet] || PALET.malam), ...(TEMA.warna || {}) };
// zona layar per tata letak: top/bot = batas adegan; cy = titik tengah adegan (kamera menaruh benda di sini)
const ZONA = { papan: { top: 380, bot: 1228, cy: 804 }, layar: { top: 0, bot: 1920, cy: 860 }, atas: { top: 0, bot: 1180, cy: 640 }, sinematik: { top: 0, bot: 1920, cy: 820 }, cerita: { top: 200, bot: 1500, cy: 850 } };
const TATA = ZONA[TEMA.tata] ? TEMA.tata : 'papan';
const PAPAN = { kicker: TEMA.kicker || 'KITA BONGKAR', title: TEMA.judul || '', tata: TATA, ...ZONA[TATA] };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
{ const L2 = { papan: `
    #ppTop { left: 0; right: 0; top: 0; height: 380px; background: ${PP.bg}; border-bottom: 2px solid ${PP.garis}; }
    #ppBot { left: 0; right: 0; top: 1228px; bottom: 0; background: ${PP.bg}; border-top: 2px solid ${PP.garis}; }
    #ppK { left: 56px; top: 64px; } #ppT { left: 56px; top: 104px; font-size: 86px; }
    #ppStats { left: 52px; right: 52px; top: 226px; }
    #ppCap { top: 1318px; height: 330px; } #ppProg { top: 1700px; }`,
  layar: `
    #ppTop { left: 0; right: 0; top: 0; height: 520px; background: linear-gradient(${rgba(PP.bg, 0.96)} 55%, ${rgba(PP.bg, 0)}); }
    #ppBot { left: 0; right: 0; top: 1300px; bottom: 0; background: linear-gradient(${rgba(PP.bg, 0)}, ${rgba(PP.bg, 0.92)} 35%, ${rgba(PP.bg, 0.98)}); }
    #ppK { left: 56px; top: 70px; } #ppT { left: 56px; top: 110px; font-size: 80px; }
    #ppStats { left: 52px; right: 52px; top: 226px; } .ppc { background: ${rgba(PP.panel, 0.72)}; backdrop-filter: blur(12px); }
    #ppCap { top: 1420px; height: 290px; } #ppProg { top: 1760px; }`,
  atas: `
    #ppTop { left: 0; right: 0; top: 0; height: 240px; background: linear-gradient(${rgba(PP.bg, 0.95)} 50%, ${rgba(PP.bg, 0)}); }
    #ppBot { left: 0; right: 0; top: 1180px; bottom: 0; background: ${PP.bg}; border-top: 2px solid ${PP.garis}; }
    #ppK { left: 56px; top: 60px; } #ppT { left: 56px; top: 98px; font-size: 64px; }
    #ppStats { left: 52px; right: 52px; top: 1222px; }
    #ppCap { top: 1380px; height: 290px; } #ppProg { top: 1720px; }`,
  sinematik: `
    #ppTop { left: 0; right: 0; top: 0; height: 360px; background: linear-gradient(${rgba(PP.bg, 0.9)}, ${rgba(PP.bg, 0)}); }
    #ppBot { left: 0; right: 0; top: 1280px; bottom: 0; background: linear-gradient(${rgba(PP.bg, 0)}, ${rgba(PP.bg, 0.86)} 45%, ${rgba(PP.bg, 0.95)}); }
    #ppK { left: 56px; top: 84px; font-size: 24px; } #ppT { left: 56px; top: 118px; font-size: 52px; }
    #ppStats { left: auto; right: 52px; top: 76px; width: 560px; height: 96px; gap: 12px; }
    .ppc { height: 96px; padding: 12px 16px; border-radius: 16px; background: ${rgba(PP.panel, 0.78)}; backdrop-filter: blur(10px); }
    .ppc .l { font-size: 16px; } .ppc .v { margin-top: 6px; font-size: 40px; } .ppc .v small { font-size: 20px; }
    #ppCap { top: 1440px; height: 270px; font-size: 58px; } #ppProg { top: 54px; height: 5px; }`,
  cerita: `
    #ppTop { left: 0; right: 0; top: 0; height: 200px; background: ${PP.bg}; }
    #ppBot { left: 0; right: 0; top: 1500px; bottom: 0; background: ${PP.bg}; }
    #ppK { left: 0; right: 0; top: 96px; text-align: center; font-size: 26px; letter-spacing: .3em; } #ppT { display: none; } #ppStats { display: none; }
    #ppCap { top: 1540px; height: 250px; font-family: Georgia, "Times New Roman", serif; font-weight: 700; font-size: 54px; }
    #ppCap b { font-weight: 700; } #ppProg { top: 1840px; }` }[TATA];
  const st = document.createElement('style'); st.textContent = `
  #hud, #capband, #vig, #cap { display: none !important; }
  #stage { background: ${PP.bg}; color: ${PP.teks}; }
  .pp { position: absolute; pointer-events: none; font-family: "Poppins", -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif; }
  #ppK { font-weight: 700; font-size: 30px; letter-spacing: .05em; color: ${PP.aksen}; }
  #ppT { font-weight: 800; letter-spacing: -.02em; color: ${PP.teks}; line-height: 1; }
  #ppStats { height: 132px; display: flex; gap: 18px; }
  .ppc { flex: 1; height: 132px; box-sizing: border-box; padding: 18px 22px; border-radius: 20px; background: ${PP.panel}; border: 2px solid ${PP.garis}; }
  .ppc .l { font-weight: 700; font-size: 21px; letter-spacing: .1em; color: ${PP.redup}; text-transform: uppercase; white-space: nowrap; }
  .ppc .v { margin-top: 8px; font-weight: 800; font-size: 60px; line-height: 1; color: ${PP.teks}; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ppc .v small { font-size: 28px; font-weight: 700; color: ${PP.redup}; margin-left: 8px; }
  .ppc.g .v { color: ${PP.baik}; } .ppc.o .v { color: ${PP.aksen}; } .ppc.r .v { color: ${PP.buruk}; }
  #ppCap { left: 60px; right: 60px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 800; font-size: 64px; line-height: 1.24; letter-spacing: -.01em; }
  #ppCap b { font-weight: 800; color: ${PP.sisa}; } #ppCap b.past { color: ${PP.teks}; } #ppCap b.cur { color: ${PP.aksen}; }
  #ppProg { left: 56px; right: 56px; height: 6px; border-radius: 3px; background: ${PP.garis}; overflow: hidden; }
  #ppProg b { position: absolute; inset: 0; background: ${PP.teks}; transform-origin: 0 50%; }
  #ppTags { left: 0; right: 0; top: ${PAPAN.top}px; height: ${PAPAN.bot - PAPAN.top}px; overflow: hidden; }
  .ppt { position: absolute; padding: 10px 22px 9px; border-radius: 40px; border: 3px solid ${PP.teks}; background: ${PP.bg}; color: ${PP.teks}; font-weight: 800; font-size: 30px; white-space: nowrap; letter-spacing: .02em; }
  .ppt.hi { border-color: ${PP.aksen}; color: ${PP.aksen}; } .ppt.y { background: ${PP.pil}; border-color: ${PP.pil}; color: ${PP.pilTeks}; } .ppt.warn { border-color: ${PP.buruk}; color: ${PP.buruk}; } .ppt.g { border-color: ${PP.baik}; color: ${PP.baik}; }
  #ppSvg { left: 0; top: 0; }
  #ppBab { left: 60px; right: 60px; top: ${{ papan: 440, layar: 400, atas: 260, sinematik: 230, cerita: 260 }[TATA]}px; text-align: ${TATA === 'cerita' ? 'center' : 'left'}; }
  #ppBab small { display: block; font-weight: 800; font-size: 24px; letter-spacing: .2em; color: ${PP.aksen}; text-transform: uppercase; margin-bottom: 10px; }
  #ppBab div { display: inline-block; font-family: ${TATA === 'cerita' ? 'Georgia, "Times New Roman", serif' : 'inherit'}; font-weight: 800; font-size: ${TATA === 'cerita' ? 76 : 64}px; line-height: 1.05; letter-spacing: -.02em; color: ${PP.teks};
    background: ${rgba(PP.bg, TATA === 'papan' ? 0 : 0.55)}; padding: 6px 14px; border-radius: 12px; }
  #ppBab em { font-style: normal; color: ${PP.aksen}; }
  #stamp { top: ${PAPAN.cy - 70}px !important; }
  #stamp span { color: ${PP.pilTeks} !important; } #stamp span::before { background: ${PP.pil} !important; top: 8% !important; height: 86% !important; }
  ${L2}`; document.head.appendChild(st);
  const mk = (id, html = '', parent = $('stage')) => { const d = document.createElement('div'); d.className = 'pp'; d.id = id; d.innerHTML = html; parent.appendChild(d); return d; };
  mk('ppTop'); mk('ppBot'); mk('ppK', PAPAN.kicker); mk('ppT', PAPAN.title); mk('ppStats'); mk('ppCap'); mk('ppProg', '<b></b>'); mk('ppBab');
  const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('class', 'pp'); sv.id = 'ppSvg'; sv.setAttribute('width', W); sv.setAttribute('height', H); $('shake').appendChild(sv);
  mk('ppTags', '', $('shake')); $('shake').appendChild($('stamp')); }
// kartu angka: [label, nilai, satuan, warna '' | g | o | r]
let lastStats = '';
const setStats = cards => { const s = cards.map(([l, v, u, c]) => `<div class="ppc ${c || ''}"><div class="l">${l}</div><div class="v">${v}<small>${u}</small></div></div>`).join('');
  if (s !== lastStats) { $('ppStats').innerHTML = s; lastStats = s; } };
// judul bab (muncul ±3 detik): setBab([[t, 'Bab 1 · Bagian', 'Judul <em>sorot</em>'], ...])
let BAB = [], lastBab = -2;
const setBab = list => (BAB = list);
// label pil di adegan: pill(mulai, akhir, teks, () => titik dunia, dx, dy, '' | hi | y | warn | g)
const pills = [];
const pill = (s, e, text, anchor, dx = 0, dy = -70, cls = '') => pills.push({ s, e, text, anchor, dx, dy, cls });
// subtitle besar: per kalimat (dipecah di koma kalau terlalu panjang)
const ppChunks = [];
for (let li = 0; li < NL; li++) { let cur = []; const ws = words.filter(w => w.l === li);
  ws.forEach((w, i) => { cur.push(w); const len = cur.map(x => x.w).join(' ').length;
    if (/[.?!]$/.test(w.w) && len > 18 || (/,$/.test(w.w) && len > 46) || len > 70 || i === ws.length - 1) { ppChunks.push(cur); cur = []; } }); }
{ const all = ppChunks.flat(); all.forEach((w, i) => (w.next = i + 1 < all.length ? all[i + 1].s : DUR));
  ppChunks.forEach((c, i) => { c.s = c[0].s - 0.1; c.e = i + 1 < ppChunks.length ? ppChunks[i + 1][0].s - 0.1 : DUR; }); }
let lastPP = -1;
// dipanggil tiap frame dari updateOverlay; mengembalikan SVG garis label (gabungkan dengan panah sendiri ke #ppSvg)
function updatePapan(t) {
  const ci = ppChunks.findIndex(c => t >= c.s && t < c.e), cap = $('ppCap');
  if (ci !== lastPP) { cap.innerHTML = ci < 0 ? '' : `<div>${ppChunks[ci].map(w => `<b>${w.w}</b>`).join(' ')}</div>`; lastPP = ci; }
  if (ci >= 0) [...cap.firstChild.children].forEach((b, k) => { const w = ppChunks[ci][k]; b.className = t >= w.next - 0.02 ? 'past' : (t >= w.s ? 'cur' : ''); });
  $('ppProg').firstChild.style.transform = `scaleX(${clamp(t / DUR).toFixed(4)})`;
  let bi = -1; BAB.forEach((b, i) => { if (t >= b[0]) bi = i; });
  const bel = $('ppBab');
  if (bi !== lastBab) { bel.innerHTML = bi < 0 ? '' : `<small>${BAB[bi][1]}</small><div>${BAB[bi][2]}</div>`; lastBab = bi; }
  if (bi >= 0) { const k = clamp((t - BAB[bi][0]) / 0.4) * (1 - clamp((t - BAB[bi][0] - 3) / 0.5)); bel.style.opacity = k.toFixed(3); bel.style.transform = `translateY(${(20 * (1 - easeIO(clamp((t - BAB[bi][0]) / 0.5)))).toFixed(1)}px)`; }
  const box = $('ppTags'); if (!box.children.length) pills.forEach(p => { const d = document.createElement('div'); d.className = 'ppt ' + p.cls; d.textContent = p.text; box.appendChild(d); });
  let svg = '';
  pills.forEach((p, i) => { const el = box.children[i], k = hlw(t, p.s, p.e);
    if (k < 0.02) { el.style.display = 'none'; return; } el.style.display = 'block';
    const [x, y] = project(p.anchor()), w = el.offsetWidth, h = el.offsetHeight;
    const lx = clamp(x + p.dx - w / 2, 24, W - 24 - w), ly = clamp(y + p.dy - h / 2 - PAPAN.top, 16, PAPAN.bot - PAPAN.top - h - 16);
    el.style.left = lx + 'px'; el.style.top = ly + 'px'; el.style.opacity = k.toFixed(3); el.style.transform = `scale(${lerp(0.85, 1, easeIO(k)).toFixed(3)})`;
    if (Math.hypot(p.dx, p.dy) > 40) svg += `<g opacity="${k.toFixed(3)}"><line x1="${x}" y1="${y}" x2="${lx + w / 2}" y2="${ly + PAPAN.top + h / 2}" stroke="${PP.teks}" stroke-width="2.5" opacity=".6"/><circle cx="${x}" cy="${y}" r="8" fill="${PP.teks}"/></g>`;
  });
  return svg;
}
// panah gaya berlabel (px), label pil di ujung
const F = 'font-family="Poppins, -apple-system, Helvetica Neue, sans-serif"';
const arrowSVG = (x0, y0, x1, y1, col, w = 10) => { const a = Math.atan2(y1 - y0, x1 - x0), h = w * 3;
  return `<line x1="${x0}" y1="${y0}" x2="${x1 - Math.cos(a) * h * 0.8}" y2="${y1 - Math.sin(a) * h * 0.8}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${x1} ${y1} L${x1 - Math.cos(a - .45) * h} ${y1 - Math.sin(a - .45) * h} L${x1 - Math.cos(a + .45) * h} ${y1 - Math.sin(a + .45) * h} Z" fill="${col}"/>`; };
const tagPx = (x, y, str, col, fill = PP.bg, tc = null) => { const w = str.length * 17 + 36;
  return `<rect x="${x - w / 2}" y="${y - 24}" width="${w}" height="48" rx="24" fill="${fill}" stroke="${col}" stroke-width="3"/><text x="${x}" y="${y + 10}" text-anchor="middle" ${F} font-weight="800" font-size="28" fill="${tc || col}">${str}</text>`; };
const forceArrow = (a, b, col, label, k, side = 1) => { if (k < 0.02) return ''; const [x0, y0] = project(a), [x1, y1] = project(b), q = easeIO(k);
  const xe = lerp(x0, x1, q), ye = lerp(y0, y1, q), nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
  return `<g opacity="${clamp(k * 2).toFixed(3)}">${arrowSVG(x0, y0, xe, ye, col, 12)}${label && q > 0.6 ? tagPx(xe + side * nx / nl * 70, ye + side * ny / nl * 70, label, col) : ''}</g>`; };
// cover: adegan + kartu tetap, subtitle diganti judul besar, satu pil penunjuk (window.coverPoint)
window.coverCustom = cfg => {
  for (const id of ['ppCap', 'ppProg', 'stamp', 'ppBab']) $(id).style.display = 'none';
  const top = { papan: 1298, layar: 1330, atas: 1370, sinematik: 1300, cerita: 1530 }[TATA];
  const st = document.createElement('style'); st.textContent = `
    #ppCover { left: 60px; right: 60px; top: ${top}px; }
    #ppCover .k { display: inline-block; font-weight: 800; font-size: 32px; letter-spacing: .06em; color: ${PP.pilTeks}; background: ${PP.pil}; padding: 10px 22px 8px; border-radius: 999px; }
    #ppCover h1 { margin: 26px 0 0; font-weight: 900; font-size: ${TATA === 'papan' ? 104 : TATA === 'cerita' ? 72 : 92}px; line-height: 1.04; letter-spacing: -.03em; color: ${PP.teks}; }
    #ppCover h1 mark { background: none; color: ${PP.aksen}; }`;
  document.head.appendChild(st);
  if (TATA === 'atas' || TATA === 'cerita') $('ppStats').style.display = 'none';
  const d = document.createElement('div'); d.className = 'pp'; d.id = 'ppCover'; d.innerHTML = `<span class="k">${cfg.kicker}</span><h1>${cfg.title}</h1>`; $('stage').appendChild(d);
  [...$('ppTags').children].forEach(e => (e.style.display = 'none'));
  if (cfg.pill && window.coverPoint) { const [x, y] = project(window.coverPoint()), p = document.createElement('div'); p.className = 'ppt y'; p.textContent = cfg.pill; p.style.fontSize = '38px';
    $('ppTags').appendChild(p); p.style.left = clamp(x - p.offsetWidth / 2, 24, W - 24 - p.offsetWidth) + 'px'; p.style.top = clamp(y - PAPAN.top - 190, 16, PAPAN.bot - PAPAN.top - 80) + 'px'; }
};
