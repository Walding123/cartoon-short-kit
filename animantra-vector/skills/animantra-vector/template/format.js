// Komponen tampilan per format video (gaya bedah). Semua murni fungsi waktu t -> SVG di lapisan #fmt (di atas adegan,
// di bawah subtitle). Tidak memakai area judul atas; elemen besar diletakkan di zona objek atau sepertiga bawah.
// Pakai dari bedah.js:
//   const FMT = await import('./format.js');  FMT.pasang();          // sekali, setelah DOM siap
//   FMT.gambar(t, { topList, mitos, versus, langkah, pov, timeline, kuis, kalau, bab }, project);   // tiap frame (di updateOverlay)
// Setiap kunci opsional; isi hanya format yang dipakai video itu.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const backOut = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const f1 = v => (+v).toFixed(1);
const SANS = 'font-family="-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif"';
const MONO = 'font-family="ui-monospace, SF Mono, Menlo, monospace"';
const INK = '#1b1a1f', GOLD = '#e3bf62', RED = '#c9373f', GRN = '#1f7a5c', ORG = '#c06a2e', BLUE = '#3e6fd1', PAPER = '#fffdf8';
// jendela aktif: [mulai, akhir] -> 0..1 dengan masuk/keluar halus
const win = (t, s, e, f = 0.25) => smooth(s - 0.01, s + f, t) * (1 - smooth(e - f, e, t));
const pop = (t, s, d = 0.35) => lerp(0.6, 1, backOut((t - s) / d));
const txt = (x, y, s, size, col = INK, w = 800, anchor = 'start', extra = '') => `<text x="${f1(x)}" y="${f1(y)}" ${extra.includes('font-family') ? '' : SANS} font-weight="${w}" font-size="${size}" fill="${col}" text-anchor="${anchor}" ${extra}>${s}</text>`;
const outlined = (x, y, s, size, fill, stroke = INK, sw = 14, anchor = 'middle', rot = 0) =>
  `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><text ${SANS} font-weight="900" font-size="${size}" text-anchor="${anchor}" fill="${stroke}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">${s}</text>
   <text ${SANS} font-weight="900" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${s}</text></g>`;
const card = (x, y, w, h, inner, op = 1, sc = 1) => `<g opacity="${op.toFixed(3)}" transform="translate(${f1(x + w / 2)} ${f1(y + h / 2)}) scale(${sc.toFixed(3)}) translate(${f1(-w / 2)} ${f1(-h / 2)})">
  <rect width="${w}" height="${h}" rx="30" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>${inner}</g>`;

export function pasang() {
  if (document.getElementById('fmt')) return;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.id = 'fmt'; s.setAttribute('width', 1080); s.setAttribute('height', 1920); s.setAttribute('class', 'ov');
  s.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  const cap = document.getElementById('cap');
  cap.parentNode.insertBefore(s, cap);
}

// 1. Top List: angka peringkat raksasa + judul item + titik kemajuan.  topList = { items: [{ t, e, rank, judul, sub }] , total }
function topList(t, d) {
  let s = '';
  const it = d.items.find(i => t >= i.t && t < i.e);
  if (!it) return '';
  const a = win(t, it.t, it.e), k = pop(t, it.t);
  s += `<g opacity="${a.toFixed(3)}">` + outlined(150, 1420, `#${it.rank}`, 200 * k, GOLD, INK, 22, 'middle', -6) +
    txt(270, 1350, it.judul, 64, INK, 900, 'start', `opacity="${smooth(it.t + 0.1, it.t + 0.4, t).toFixed(3)}" paint-order="stroke" stroke="${PAPER}" stroke-width="14"`) +
    (it.sub ? txt(272, 1410, it.sub, 36, ORG, 800, 'start', `paint-order="stroke" stroke="${PAPER}" stroke-width="10"`) : '');
  const n = d.total || d.items.length;
  for (let i = 0; i < n; i++) { const r = n - i, on = r >= it.rank; s += `<circle cx="${f1(276 + i * 34)}" cy="1450" r="${r === it.rank ? 11 : 8}" fill="${on ? GOLD : '#d9cfc0'}" stroke="${INK}" stroke-width="3"/>`; }
  return s + '</g>';
}

// 2. Mitos vs Fakta: kartu klaim (KATANYA) lalu stempel putusan.  mitos = { klaim: { t, e, teks }, putusan: { t, e, jenis: 'mitos'|'fakta'|'sebagian', alasan } }
function mitos(t, d) {
  let s = '';
  if (d.klaim) { const { t: s0, e, teks } = d.klaim, a = win(t, s0, e);
    if (a > 0) s += card(70, 500, 940, 260, txt(50, 82, 'KATANYA…', 34, '#7a7368', 800, 'start', MONO) + txt(50, 170, teks, 58, INK, 900), a, pop(t, s0)); }
  if (d.putusan) { const { t: s0, e, jenis, alasan } = d.putusan, a = win(t, s0, e, 0.15);
    if (a > 0) { const col = { mitos: RED, fakta: GRN, sebagian: ORG }[jenis] || RED, k = lerp(1.8, 1, backOut((t - s0) / 0.3));
      s += `<g opacity="${a.toFixed(3)}" transform="translate(540 1080) rotate(-9) scale(${k.toFixed(3)})">
        <rect x="-330" y="-110" width="660" height="200" rx="24" fill="none" stroke="${col}" stroke-width="16"/>
        <rect x="-312" y="-92" width="624" height="164" rx="14" fill="none" stroke="${col}" stroke-width="5"/>
        <text ${SANS} font-weight="900" font-size="128" text-anchor="middle" y="40" fill="${col}" letter-spacing="6">${jenis.toUpperCase()}</text></g>`;
      if (alasan) s += txt(540, 1260, alasan, 40, INK, 800, 'middle', `opacity="${smooth(s0 + 0.4, s0 + 0.7, t).toFixed(3)}" paint-order="stroke" stroke="${PAPER}" stroke-width="12"`); } }
  return s;
}

// 3. Perbandingan A vs B: label A/B mengikuti titik 3D + papan skor per ukuran.  versus = { a: {nama, titik, warna}, b: {...}, t, e, ukuran: [{ t, nama, nilaiA, nilaiB, satuan, makin: 'kecil'|'besar' }] }
function versus(t, d, project) {
  let s = '';
  const a = win(t, d.t, d.e);
  if (a <= 0) return '';
  for (const [k, side] of [['a', 'A'], ['b', 'B']]) { const o = d[k]; if (!o.titik) continue; const [x, y] = project(o.titik());
    s += `<g opacity="${a.toFixed(3)}"><circle cx="${f1(x)}" cy="${f1(y - 130)}" r="56" fill="${o.warna || (side === 'A' ? BLUE : ORG)}" stroke="${INK}" stroke-width="5"/>${txt(x, y - 112, side, 58, '#fff', 900, 'middle')}${txt(x, y - 46, o.nama, 40, INK, 900, 'middle', `paint-order="stroke" stroke="${PAPER}" stroke-width="10"`)}</g>`; }
  const ms = d.ukuran.filter(m => t >= m.t);
  if (ms.length) {
    const h = 110 + ms.length * 120;
    let inner = txt(50, 70, `${d.a.nama.toUpperCase()} VS ${d.b.nama.toUpperCase()}`, 34, '#7a7368', 800, 'start', MONO);
    ms.forEach((m, i) => { const y = 140 + i * 120, mx = Math.max(m.nilaiA, m.nilaiB) || 1, g = smooth(m.t, m.t + 0.6, t);
      const winA = m.makin === 'kecil' ? m.nilaiA <= m.nilaiB : m.nilaiA >= m.nilaiB;
      inner += txt(50, y + 12, m.nama, 40, INK, 900) +
        `<rect x="250" y="${y - 30}" width="${f1(380 * m.nilaiA / mx * g)}" height="34" rx="17" fill="${d.a.warna || BLUE}" stroke="${INK}" stroke-width="4"/>` +
        `<rect x="250" y="${y + 12}" width="${f1(380 * m.nilaiB / mx * g)}" height="34" rx="17" fill="${d.b.warna || ORG}" stroke="${INK}" stroke-width="4"/>` +
        txt(890, y - 2, `${(+m.nilaiA).toLocaleString('id-ID')} ${m.satuan || ''}`, 32, winA ? GRN : '#7a7368', 900, 'end') + txt(890, y + 40, `${(+m.nilaiB).toLocaleString('id-ID')} ${m.satuan || ''}`, 32, winA ? '#7a7368' : GRN, 900, 'end'); });
    s += card(70, 480, 940, h, inner, a);
  }
  return s;
}

// 4. Tutorial / Cara: lencana LANGKAH n/N + daftar centang + kartu "jangan".  langkah = { items: [{ t, teks }], jangan: { t, e, teks } }
function langkah(t, d) {
  let s = '';
  const n = d.items.length, cur = d.items.filter(i => t >= i.t).length;
  if (cur > 0 && t < (d.e ?? 1e9)) {
    const it = d.items[cur - 1], k = pop(t, it.t);
    s += `<g transform="translate(70 1250)">` + `<rect width="300" height="86" rx="43" fill="${GOLD}" stroke="${INK}" stroke-width="5" transform="scale(${k.toFixed(3)})"/>` +
      txt(150, 58, `LANGKAH ${cur}/${n}`, 36, INK, 900, 'middle') + `</g>` + txt(70, 1395, it.teks, 52, INK, 900, 'start', `paint-order="stroke" stroke="${PAPER}" stroke-width="14"`);
    d.items.forEach((x, i) => { const done = i < cur - 1;
      s += `<g transform="translate(${f1(900 - (n - 1 - i) * 60)} 1293)"><circle r="22" fill="${done ? GRN : (i === cur - 1 ? GOLD : '#e9e2d6')}" stroke="${INK}" stroke-width="4"/>${done ? `<path d="M-10 0l7 8 13-15" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>` : txt(0, 10, i + 1, 26, INK, 900, 'middle')}</g>`; });
  }
  if (d.jangan) { const { t: s0, e, teks } = d.jangan, a = win(t, s0, e);
    if (a > 0) s += card(70, 500, 940, 220, `<circle cx="100" cy="110" r="56" fill="${RED}" stroke="${INK}" stroke-width="5"/><path d="M75 85l50 50M125 85l-50 50" stroke="#fff" stroke-width="14" stroke-linecap="round"/>` +
      txt(190, 92, 'JANGAN', 34, RED, 900, 'start', MONO) + txt(190, 156, teks, 50, INK, 900), a, pop(t, s0)); }
  return s;
}

// 5. POV "Jadi Si…": tokoh bermata (titik bercahaya) di titik 3D + gelembung pikiran.  pov = { nama, titik: t => [x,y,z], warna, ucapan: [{ t, e, teks }] }
function pov(t, d, project) {
  if (t < (d.t ?? 0) || t > (d.e ?? 1e9)) return '';
  const [x, y] = project(d.titik(t)), r = d.r || 46, col = d.warna || '#ffe27a', blink = (t * 0.7 % 1) < 0.06 ? 0.15 : 1, look = Math.sin(t * 1.3) * 5;
  let s = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r * 2.4}" fill="${col}" opacity=".28"/>
    <circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="${f1(x - r * 0.32 + look)}" cy="${f1(y - r * 0.12)}" rx="${f1(r * 0.13)}" ry="${f1(r * 0.2 * blink)}" fill="${INK}"/>
    <ellipse cx="${f1(x + r * 0.32 + look)}" cy="${f1(y - r * 0.12)}" rx="${f1(r * 0.13)}" ry="${f1(r * 0.2 * blink)}" fill="${INK}"/>
    <path d="M${f1(x - r * 0.3)} ${f1(y + r * 0.3)} q${f1(r * 0.3)} ${f1(r * 0.25)} ${f1(r * 0.6)} 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (d.nama) s += txt(x, y - r - 24, d.nama, 38, INK, 900, 'middle', `paint-order="stroke" stroke="${PAPER}" stroke-width="10"`);
  const u = (d.ucapan || []).find(q => t >= q.t && t < q.e);
  if (u) { const a = win(t, u.t, u.e, 0.18), w = Math.min(760, 40 + u.teks.length * 25), bx = clamp(x + r + 30, 30, 1050 - w), by = clamp(y - r - 150, 260, 1500);
    s += `<g opacity="${a.toFixed(3)}"><rect x="${f1(bx)}" y="${f1(by)}" width="${w}" height="92" rx="46" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
      <path d="M${f1(bx + 40)} ${f1(by + 88)} L${f1(x + r * 0.6)} ${f1(y - r * 0.6)} L${f1(bx + 90)} ${f1(by + 88)}" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="${f1(bx + 30)}" y="${f1(by + 78)}" width="80" height="12" fill="${PAPER}"/>${txt(bx + w / 2, by + 60, u.teks, 40, INK, 900, 'middle')}</g>`; }
  return s;
}

// 6. Evolusi / Timeline: garis tahun di sepertiga bawah, penanda meluncur, label era.  timeline = { t, e, era: [{ t, tahun, nama }] }
function timeline(t, d) {
  const a = win(t, d.t, d.e);
  if (a <= 0) return '';
  const n = d.era.length, x0 = 110, x1 = 970, y = 1500;
  let k = 0; d.era.forEach((e, i) => { if (t >= e.t) k = i; });
  const nx = i => x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : 0.5);
  const prev = Math.max(0, k - 1), mv = smooth(d.era[k].t, d.era[k].t + 0.6, t), mx = lerp(nx(k === 0 ? 0 : prev), nx(k), k === 0 ? 1 : mv);
  let s = `<g opacity="${a.toFixed(3)}"><line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  d.era.forEach((e, i) => { const on = i <= k; s += `<circle cx="${f1(nx(i))}" cy="${y}" r="14" fill="${on ? GOLD : PAPER}" stroke="${INK}" stroke-width="4"/>` + txt(nx(i), y + 54, e.tahun, 30, on ? INK : '#9a9286', 900, 'middle', MONO); });
  s += `<path d="M${f1(mx)} ${y - 24} l-16 -26 h32z" fill="${RED}" stroke="${INK}" stroke-width="4"/>`;
  s += outlined(540, 1370, d.era[k].nama, 84 * pop(t, d.era[k].t), GOLD, INK, 16) + '</g>';
  return s;
}

// 7. Kuis / Tebak: "TEBAK!" + pilihan + hitung mundur + jawaban.  kuis = { t, tanya, pilihan: ['A..','B..','C..'], benar: 1, buka, e }
function kuis(t, d) {
  const a = win(t, d.t, d.e);
  if (a <= 0) return '';
  let inner = txt(50, 74, 'TEBAK!', 40, RED, 900, 'start', MONO) + txt(50, 150, d.tanya, 50, INK, 900);
  const open = t >= d.buka;
  d.pilihan.forEach((p, i) => { const y = 200 + i * 86, ok = open && i === d.benar, dim = open && i !== d.benar;
    inner += `<rect x="50" y="${y}" width="840" height="68" rx="34" fill="${ok ? '#cfe9da' : '#f4efe6'}" stroke="${ok ? GRN : INK}" stroke-width="${ok ? 7 : 4}" opacity="${dim ? 0.45 : 1}"/>` +
      txt(92, y + 46, String.fromCharCode(65 + i), 34, ok ? GRN : INK, 900, 'middle') + txt(130, y + 46, p, 34, INK, 800, 'start', `opacity="${dim ? 0.45 : 1}"`); });
  const h = 230 + d.pilihan.length * 86;
  let s = card(70, 470, 940, h, inner, a, pop(t, d.t));
  if (!open && t > d.buka - 3) { const c = Math.ceil(d.buka - t), fr = (d.buka - t) % 1;
    s += `<g transform="translate(540 ${470 + h + 120})"><circle r="74" fill="${PAPER}" stroke="${INK}" stroke-width="6"/><circle r="64" fill="none" stroke="${GOLD}" stroke-width="12" stroke-dasharray="${f1(402 * fr)} 402" transform="rotate(-90)"/>${txt(0, 30, c, 84, INK, 900, 'middle')}</g>`; }
  if (open) s += txt(540, 470 + h + 90, 'Tulis tebakanmu di komentar!', 40, ORG, 900, 'middle', `opacity="${smooth(d.buka, d.buka + 0.4, t).toFixed(3)}" paint-order="stroke" stroke="${PAPER}" stroke-width="12"`);
  return s;
}

// 8. Apa Jadinya Kalau: pita "KALAU…" + pengukur bahaya bertahap.  kalau = { t, e, kondisi, tahap: [{ t, nama, level 0..1 }] }
function kalau(t, d) {
  const a = win(t, d.t, d.e);
  if (a <= 0) return '';
  let k = -1; d.tahap.forEach((p, i) => { if (t >= p.t) k = i; });
  const lv = k < 0 ? 0 : lerp(k > 0 ? d.tahap[k - 1].level : 0, d.tahap[k].level, smooth(d.tahap[k].t, d.tahap[k].t + 0.6, t));
  const col = lv < 0.4 ? GRN : lv < 0.75 ? ORG : RED, shake = lv > 0.75 ? Math.sin(t * 60) * 3 * lv : 0;
  let s = `<g opacity="${a.toFixed(3)}"><g transform="translate(70 1250)"><rect width="940" height="84" rx="42" fill="${INK}"/>${txt(40, 57, 'KALAU…', 40, GOLD, 900, 'start', MONO)}${txt(230, 57, d.kondisi, 42, '#fff', 900)}</g>`;
  s += `<g transform="translate(${f1(70 + shake)} 1352)"><rect width="940" height="96" rx="48" fill="#efe8dc" stroke="${INK}" stroke-width="5"/>
    <rect x="8" y="8" width="${f1(924 * lv)}" height="80" rx="40" fill="${col}"/>${k >= 0 ? txt(470, 64, d.tahap[k].nama, 46, lv > 0.3 ? '#fff' : INK, 900, 'middle', `paint-order="stroke" stroke="${lv > 0.3 ? INK : 'none'}" stroke-width="6"`) : ''}</g></g>`;
  return s;
}

// 9. Story / Kisah: pita layar lebar + kartu bab (tahun · judul) muncul ±2,5 dtk.  bab = { pita: 0..1 atau [[t,v]...], items: [{ t, label, judul }] }
function bab(t, d) {
  let s = '';
  const pv = Array.isArray(d.pita) ? d.pita.reduce((v, [tt, val]) => (t >= tt ? val : v), 0) : (d.pita ?? 1);
  if (pv > 0) s += `<rect x="0" y="0" width="1080" height="${f1(150 * pv)}" fill="#0d0e12"/><rect x="0" y="${f1(1920 - 120 * pv)}" width="1080" height="${f1(120 * pv)}" fill="#0d0e12"/>`;
  const it = (d.items || []).find(i => t >= i.t && t < i.t + 2.6);
  if (it) { const a = win(t, it.t, it.t + 2.6, 0.3);
    s += `<g opacity="${a.toFixed(3)}"><rect x="0" y="760" width="1080" height="260" fill="#0d0e12" opacity=".55"/>
      ${txt(540, 845, it.label, 34, GOLD, 800, 'middle', MONO + ' letter-spacing="8"')}
      <text x="540" y="950" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="82" fill="#fff" text-anchor="middle">${it.judul}</text></g>`; }
  return s;
}

export function gambar(t, cfg, project) {
  const el = document.getElementById('fmt');
  if (!el) return;
  let s = '';
  if (cfg.bab) s += bab(t, cfg.bab);
  if (cfg.timeline) s += timeline(t, cfg.timeline);
  if (cfg.versus) s += versus(t, cfg.versus, project);
  if (cfg.pov) s += pov(t, cfg.pov, project);
  if (cfg.kalau) s += kalau(t, cfg.kalau);
  if (cfg.langkah) s += langkah(t, cfg.langkah);
  if (cfg.topList) s += topList(t, cfg.topList);
  if (cfg.mitos) s += mitos(t, cfg.mitos);
  if (cfg.kuis) s += kuis(t, cfg.kuis);
  el.innerHTML = s;
}
