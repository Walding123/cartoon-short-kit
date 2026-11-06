// Gaya Saya: palet, huruf, bentuk, dan identitas milik pengguna, dipasang ke video gaya bedah saat scene dirakit.
// Sumber bedah.js / bedah.html / format.js tidak diubah: rakitScene() menulis salinan bergaya (scene.js, index.html, format_gaya.js).
//   Gaya tersimpan di <folder sesi>/gaya-saya/<id>.json (aktif: gaya-saya/aktif.json), disalin ke proyek sebagai gaya_saya.json
//   saat proyek dibuat, jadi video lama tidak ikut berubah kalau gayanya diedit.
// Dipakai juga oleh Studio (pratinjau) lewat hitungGaya() dan cssGaya().

// ---------- warna ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
export const rgbHex = c => '#' + c.map(v => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join('');
export function rgbHsl([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function hslRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}
export const hsl = (h, s, l) => rgbHex(hslRgb([h, s, l]));
const lum = hex => { const [r, g, b] = hexRgb(hex).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const kontras = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// geser terang/gelap fg sampai kontrasnya dengan bg ≥ min (arah menjauh dari bg)
export function pastikan(fg, bg, min) {
  let [h, s, l] = rgbHsl(hexRgb(fg));
  const naik = lum(bg) < 0.18;
  for (let i = 0; i < 60 && kontras(hsl(h, s, l), bg) < min; i++) l = clamp(l + (naik ? 0.02 : -0.02));
  return hsl(h, s, l);
}
const teksDi = (bg, terang, gelap) => (kontras(terang, bg) >= kontras(gelap, bg) ? terang : gelap);
const rgba = (hex, a) => `rgba(${hexRgb(hex).map(v => Math.round(v * 255)).join(',')},${a})`;

// ---------- pilihan ----------
const SYS_SANS = '-apple-system, SF Pro Display, Helvetica Neue, Segoe UI, Helvetica, Arial, sans-serif';
const SYS_MONO = 'ui-monospace, SF Mono, Menlo, Consolas, monospace';
export const HURUF = {
  bawaan:  { nama: 'Tegas', ket: 'Huruf sistem, tebal dan bersih (bawaan)', sans: SYS_SANS, mono: SYS_MONO, file: [] },
  bulat:   { nama: 'Bulat ramah', ket: 'Nunito: membulat, hangat, cocok untuk anak & keluarga', sans: 'Nunito, ' + SYS_SANS, mono: 'DM Mono, ' + SYS_MONO, file: [['Nunito', 'Nunito.woff2'], ['DM Mono', 'DMMono.woff2']] },
  modern:  { nama: 'Modern', ket: 'Plus Jakarta Sans: rapi, kekinian, buatan Indonesia', sans: 'Plus Jakarta Sans, ' + SYS_SANS, mono: 'JetBrains Mono, ' + SYS_MONO, file: [['Plus Jakarta Sans', 'PlusJakartaSans.woff2'], ['JetBrains Mono', 'JetBrainsMono.woff2']] },
  majalah: { nama: 'Majalah', ket: 'Fraunces: huruf berkait yang elegan, kesan cerita & premium', sans: 'Fraunces, Georgia, serif', mono: 'DM Mono, ' + SYS_MONO, file: [['Fraunces', 'Fraunces.woff2'], ['DM Mono', 'DMMono.woff2']] },
  teknis:  { nama: 'Teknis', ket: 'Space Grotesk: kesan sains, mesin, dan teknologi', sans: 'Space Grotesk, ' + SYS_SANS, mono: 'JetBrains Mono, ' + SYS_MONO, file: [['Space Grotesk', 'SpaceGrotesk.woff2'], ['JetBrains Mono', 'JetBrainsMono.woff2']] },
  poster:  { nama: 'Poster', ket: 'Archivo: padat dan lantang seperti poster', sans: 'Archivo, ' + SYS_SANS, mono: 'DM Mono, ' + SYS_MONO, file: [['Archivo', 'Archivo.woff2'], ['DM Mono', 'DMMono.woff2']] },
};
export const PILIHAN = {
  sudut: { bulat: 'Bulat (bawaan)', lembut: 'Lembut', tajam: 'Tajam' },
  subtitle: { kotak: 'Kotak gelap (bawaan)', garis: 'Teks bergaris tepi', pita: 'Pita warna aksen' },
  stempel: { tebal: 'Tebal (bawaan)', miring: 'Miring berwarna', label: 'Label kotak' },
  garisTepi: { tipis: 'Tipis', sedang: 'Sedang (bawaan)', tebal: 'Tebal' },
  karakter: { asli: 'Asli (bawaan)', hangat: 'Hangat', dingin: 'Dingin', pastel: 'Pastel', berani: 'Berani' },
  musik: { sinematik: 'Sinematik', misteri: 'Misteri', ceria: 'Ceria', lofi: 'Lo-fi', elektronik: 'Elektronik' },
};
// nilai asli gaya bedah: dipakai apa adanya oleh preset bawaan, dan sebagai kunci pencarian saat warna diganti
export const ASLI = {
  latar: '#f4efe6', kartu: '#fffdf8', tinta: '#1b1a1f', pita: '#1f1d1b', teksTerang: '#fff8ee', teksSisa: '#8f8a82',
  aksen: '#9b2c3f', sorot: '#e3bf62', sorotMuda: '#f6dc8e', sorotTua: '#b8913a', stempel: '#7a1c2c',
  baik: '#1f7a5c', waspada: '#c06a2e', info: '#3e5bb8', buruk: '#c9373f', redup: '#7a7368', garis: '#d9cfc0',
  teksLatar: '#1b1a1f', teksAksen: '#ffffff',
};
export const PRESET = {
  bawaan: { nama: 'Bawaan Kita Bongkar', merek: '#9b2c3f', warna: { ...ASLI } },
  laut:   { nama: 'Laut', merek: '#1f5fbf' },
  jeruk:  { nama: 'Jeruk', merek: '#e2571b' },
  hutan:  { nama: 'Hutan', merek: '#2e7a4f' },
  anggur: { nama: 'Anggur', merek: '#7a3db5' },
  poster: { nama: 'Poster merah', merek: '#d7262e', sorot: '#ffd23f', huruf: 'poster', sudut: 'tajam', stempel: 'label' },
  malam:  { nama: 'Malam', merek: '#ff6a3d', gelap: true, sorot: '#ffd166' },
  neon:   { nama: 'Neon', merek: '#11b5c9', gelap: true, sorot: '#d4ff3f', huruf: 'teknis' },
};
export const GAYA_KOSONG = { id: 'gaya-saya', nama: 'Gaya Saya', preset: 'bawaan', merek: '', gelap: false, sorot: '', warna: {},
  huruf: 'bawaan', sudut: 'bulat', subtitle: 'kotak', stempel: 'tebal', garisTepi: 'sedang', karakter: 'asli',
  seri: 'KITA BONGKAR', penutup: '', logo: '', musik: 'sinematik' };

// palet lengkap dari satu warna merek (+ sorot opsional), dengan kontras dijaga
export function dariMerek(merek, { gelap = false, sorot = '' } = {}) {
  const [h, s0] = rgbHsl(hexRgb(merek)), s = Math.max(0.35, s0);
  const kuning = h >= 35 && h <= 70;
  const t = {};
  t.tinta = hsl(h, 0.14, 0.11);
  t.pita = hsl(h, 0.12, 0.12);
  t.teksTerang = hsl(h, 0.6, 0.97);
  t.sorot = sorot || (kuning ? hsl(h, 0.85, 0.62) : hsl(46, 0.72, 0.64));
  t.sorot = pastikan(t.sorot, t.tinta, 7);                           // kata aktif subtitle: tinta di atas sorot
  const [sh, ss, sl] = rgbHsl(hexRgb(t.sorot));
  t.sorotMuda = hsl(sh, ss, Math.min(0.9, sl + 0.13)); t.sorotTua = hsl(sh, ss * 0.85, sl - 0.2);
  if (gelap) {
    t.latar = hsl(h, 0.32, 0.1); t.kartu = hsl(h, 0.35, 0.97); t.teksLatar = hsl(h, 0.3, 0.96);
    t.aksen = pastikan(hsl(h, s, rgbHsl(hexRgb(merek))[2]), t.latar, 3);
    t.garis = hsl(h, 0.18, 0.32); t.redup = hsl(h, 0.12, 0.62); t.teksSisa = hsl(h, 0.08, 0.6);
    t.pita = hsl(h, 0.3, 0.27);                                       // label & subtitle harus tetap terpisah dari latar gelap
  } else {
    t.latar = hsl(h, Math.min(0.4, s * 0.45), 0.94); t.kartu = hsl(h, 0.6, 0.99); t.teksLatar = t.tinta;
    t.aksen = pastikan(merek, t.latar, 4.5);
    t.garis = hsl(h, 0.22, 0.8); t.redup = pastikan(hsl(h, 0.07, 0.45), t.latar, 4.5); t.teksSisa = hsl(h, 0.05, 0.56);
  }
  t.teksAksen = teksDi(t.aksen, '#ffffff', t.tinta);
  t.stempel = hsl(h, s, Math.max(0.18, rgbHsl(hexRgb(t.aksen))[2] * 0.62));
  t.baik = pastikan('#1f7a5c', '#fff8ee', 4.5); t.waspada = '#c06a2e'; t.info = '#3e5bb8'; t.buruk = '#c9373f';
  return t;
}

// gaya pengguna -> semua nilai jadi (token warna + pilihan)
export function hitungGaya(g = {}) {
  const pr = PRESET[g.preset] || PRESET.bawaan;
  const v = { ...GAYA_KOSONG, ...pr, ...Object.fromEntries(Object.entries(g).filter(([, x]) => x !== '' && x != null)) };
  const pakaiAsli = !g.merek && (g.preset || 'bawaan') === 'bawaan';
  const merek = g.merek || pr.merek;
  const dasar = pakaiAsli ? { ...ASLI } : dariMerek(merek, { gelap: !!v.gelap, sorot: v.sorot || '' });
  const warna = { ...dasar, ...(g.warna || {}) };
  const huruf = HURUF[v.huruf] || HURUF.bawaan;
  return { ...v, merek, gelap: lum(warna.latar) < 0.18, warna, hurufInfo: huruf, bawaan: pakaiAsli && isBawaanBentuk(v) && !Object.keys(g.warna || {}).length };
}
const isBawaanBentuk = v => v.huruf === 'bawaan' && v.sudut === 'bulat' && v.subtitle === 'kotak' && v.stempel === 'tebal' && v.garisTepi === 'sedang' && v.karakter === 'asli' && (v.seri || 'KITA BONGKAR') === 'KITA BONGKAR' && !v.logo;

// daftar periksa kontras (untuk Studio & cek otomatis)
export function cekKontras(w) {
  const c = [['Teks di latar', w.teksLatar, w.latar, 4.5], ['Teks di kartu', w.tinta, w.kartu, 4.5], ['Kata aktif subtitle', w.tinta, w.sorot, 4.5],
    ['Subtitle', w.teksTerang, w.pita, 4.5], ['Label seri', w.teksAksen, w.aksen, 3], ['Stempel', w.teksTerang, w.stempel, 3], ['Label di latar', w.pita, w.latar, 1.6]];
  return c.map(([nama, a, b, min]) => ({ nama, rasio: +kontras(a, b).toFixed(2), min, lolos: kontras(a, b) >= min }));
}

// ---------- CSS tambahan (huruf, bentuk, teks di latar gelap, logo) ----------
export function cssGaya(G, urlHuruf = 'huruf/') {
  const w = G.warna, H = G.hurufInfo;
  let s = H.file.map(([fam, f]) => `@font-face { font-family: '${fam}'; src: url('${urlHuruf}${f}') format('woff2'); font-weight: 100 900; font-display: block; }`).join('\n');
  s += `\n:root { --sans: ${H.sans}; --mono: ${H.mono}; --teksLatar: ${w.teksLatar}; --teksAksen: ${w.teksAksen}; --pita: ${w.pita}; }`;
  s += `\n#cvlive h1, #cv h1, #title, #readout .n { color: var(--teksLatar); }
#cvlive .k, #cv .k { color: var(--teksAksen); }
#cvlive .fade { background: linear-gradient(var(--paper) 62%, ${rgba(w.latar, 0)}); }
#cvfade { background: linear-gradient(var(--paper) 80%, ${rgba(w.latar, 0)}) !important; }
#readout .u { color: var(--muted); }
.tag:not(.hi):not(.warn):not(.ok) { color: ${w.teksTerang}; }`;
  if (G.gelap) s += `\n.tag:not(.hi):not(.warn):not(.ok), .ctag { box-shadow: 0 0 0 3px ${w.redup}, 0 10px 30px rgba(0,0,0,.35); }`;
  if (G.huruf === 'majalah') s += `\n#cvlive h1, #cv h1 { letter-spacing: -.02em; } #cap { letter-spacing: 0; }`;
  const r = { bulat: null, lembut: [16, 22], tajam: [4, 6] }[G.sudut];
  if (r) s += `\n.tag, #chip, #cvlive .k, #cv .k, .ctag, #steps i { border-radius: ${r[0]}px !important; }
#cap .pill { border-radius: ${r[0]}px; } .card, #inset { border-radius: ${r[1]}px; } #cap b.cur, #cvlive h1 mark, #cv h1 mark { border-radius: ${Math.max(3, r[0] - 6)}px; }`;
  if (G.subtitle === 'garis') s += `\n#cap .pill { background: none; box-shadow: none; color: ${rgba(w.teksTerang, 0.62)}; padding: 0 6px; word-spacing: .35em; -webkit-text-stroke: 13px ${w.tinta}; paint-order: stroke fill; }
#cap b.past { color: ${w.teksTerang}; } #cap b.cur { background: none; box-shadow: none; color: ${w.sorot}; margin: 0; padding: 0; }`;
  if (G.subtitle === 'pita') s += `\n#cap .pill { background: ${w.aksen}; color: ${rgba(w.teksAksen, 0.6)}; box-shadow: 0 0 0 5px ${w.tinta}, 0 16px 48px rgba(0,0,0,.15); }
#cap b.past { color: ${w.teksAksen}; }`;
  if (G.stempel === 'miring') s += `\n#stamp { transform: rotate(-7deg); } #stamp span { color: ${w.sorot}; } #stamp span::before { color: ${w.tinta}; -webkit-text-stroke-color: ${w.tinta}; text-shadow: 0 13px 0 ${w.tinta}; }`;
  if (G.stempel === 'label') s += `\n#stamp span { color: ${w.teksTerang}; background: ${w.stempel}; padding: 6px 34px 14px; border: 8px solid ${w.tinta}; border-radius: ${r ? r[0] : 22}px; box-shadow: 0 14px 0 ${w.tinta}; }
#stamp span::before { display: none; } #stamp span.snd { color: ${w.tinta}; background: ${w.sorot}; }`;
  s += `\n.glogo { display: block; height: 96px; max-width: 360px; object-fit: contain; margin: 0 0 22px; }`;
  return s;
}

// ---------- pemasangan ke file scene ----------
// pasangan [nilai asli, token]: hex, rgba(...), dan angka 0x untuk three.js
const PETA = [
  ['#f4efe6', 'latar'], ['#f3f3f0', 'latar'], ['#fffdf8', 'kartu'], ['#1b1a1f', 'tinta'], ['#1f1d1b', 'pita'], ['#fff8ee', 'teksTerang'],
  ['#8f8a82', 'teksSisa'], ['#9b2c3f', 'aksen'], ['#e3bf62', 'sorot'], ['#f6dc8e', 'sorotMuda'], ['#b8913a', 'sorotTua'], ['#7a1c2c', 'stempel'],
  ['#1f7a5c', 'baik'], ['#c06a2e', 'waspada'], ['#3e5bb8', 'info'], ['#3e6fd1', 'info'], ['#c9373f', 'buruk'], ['#7a7368', 'redup'], ['#d9cfc0', 'garis'],
];
const RGBA = [[[244, 239, 230], 'latar'], [[243, 243, 240], 'latar'], [[255, 253, 248], 'kartu'], [[27, 26, 31], 'tinta']];
const HEXRE = /#[0-9a-fA-F]{6}\b/g;

function gantiWarna(teks, G, { netral = false } = {}) {
  const w = G.warna, peta = Object.fromEntries(PETA.map(([a, k]) => [a, w[k]]));
  const [lh, ls, ll] = rgbHsl(hexRgb(w.latar)), PAPER_L = rgbHsl(hexRgb(ASLI.latar))[2];
  teks = teks.replace(HEXRE, m => {
    const k = m.toLowerCase();
    if (peta[k]) return peta[k];
    if (!netral) return m;
    // krem/abu muda lain (dinding, ubin, kertas di latar): ikut nada latar, selisih terangnya dipertahankan
    const rgb = hexRgb(k), kroma = Math.max(...rgb) - Math.min(...rgb), [, s, l] = rgbHsl(rgb);
    if (kroma > 0.13 || l < 0.78) return m;
    const nl = G.gelap ? clamp(ll + (PAPER_L - l) * 0.9 + 0.02, 0.05, 0.45) : clamp(ll + (l - PAPER_L), 0.6, 0.99);
    return hsl(lh, clamp(ls * (0.4 + s), 0, 0.6), nl);
  });
  teks = teks.replace(/0x(f4efe6|f3f3f0)\b/gi, () => '0x' + w.latar.slice(1));
  for (const [[r, g, b], k] of RGBA) {
    const [R, Gr, B] = hexRgb(w[k]).map(v => Math.round(v * 255));
    teks = teks.replace(new RegExp(`rgba\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*,`, 'g'), `rgba(${R},${Gr},${B},`);
  }
  return teks;
}
function gantiHuruf(teks, H) {
  return teks
    .replace(/font-family="[^"]*(?:monospace|Menlo)[^"]*"/g, `font-family="${H.mono}"`)
    .replace(/font-family="[^"]*(?:apple-system|Helvetica)[^"]*"/g, `font-family="${H.sans}"`);
}
// warna bagian benda (blok const PAL) menurut karakter; tiga nada tetap urut terang -> gelap
function karakterWarna(hex, kar) {
  let [h, s, l] = rgbHsl(hexRgb(hex));
  const geser = target => { let d = ((target - h + 540) % 360) - 180; return h + clamp(d, -10, 10) * (s > 0.12 ? 1 : 0); };
  if (kar === 'hangat') { h = geser(30); s = s * 1.08; }
  if (kar === 'dingin') { h = geser(215); s = s * 1.05; }
  if (kar === 'pastel') { s = s * 0.72; l = l + (1 - l) * 0.32; }
  if (kar === 'berani') { s = Math.min(1, s * 1.3 + (s > 0.12 ? 0.05 : 0)); l = l < 0.5 ? l * 0.92 : l; }
  return hsl(h, s, l);
}
function olahJs(js, G) {
  const m = js.match(/const PAL = \{[\s\S]*?\n\};/);
  const [pre, pal, post] = m ? [js.slice(0, m.index), m[0], js.slice(m.index + m[0].length)] : [js, '', ''];
  const luar = s => gantiHuruf(gantiWarna(s, G, { netral: true }), G.hurufInfo);
  const palBaru = G.karakter === 'asli' ? pal : pal.replace(HEXRE, x => karakterWarna(x, G.karakter));
  let out = luar(pre) + palBaru + luar(post);
  const r = { tipis: 1.8, sedang: 2.6, tebal: 3.6 }[G.garisTepi] || 2.6;
  out = out.replace(/r: \{ value: 2\.6 \}/g, `r: { value: ${r} }`);
  if (G.seri && G.seri !== 'KITA BONGKAR') out = out.replaceAll('KITA BONGKAR', G.seri);
  return out;
}

// dipanggil rakitScene(): html/js mentah -> versi bergaya
export function terapkanGaya({ html, js, format }, g) {
  const G = hitungGaya(g);
  if (G.bawaan) return { html, js, format, G };
  if (format != null) js = js.replace(/import\(\s*['"]\.\/format\.js['"]\s*\)/g, "import('./format_gaya.js')");
  js = olahJs(js, G);
  if (format != null) format = gantiHuruf(gantiWarna(format, G), G.hurufInfo).replaceAll('KITA BONGKAR', G.seri || 'KITA BONGKAR');
  html = gantiWarna(html, G);
  if (G.seri && G.seri !== 'KITA BONGKAR') html = html.replaceAll('KITA BONGKAR', G.seri);
  if (G.logo) html = html.replace(/(<div id="cvlive">[\s\S]*?<div class="in">)/, `$1<img class="glogo" src="logo_gaya.png" alt="">`);
  const meta = `<script>window.GAYA = ${JSON.stringify({ seri: G.seri, logo: G.logo ? 'logo_gaya.png' : '', warna: G.warna })};</script>`;
  html = html.replace('</head>', `<style id="gaya-saya">\n${cssGaya(G)}\n</style>\n${meta}\n</head>`);
  return { html, js, format, G };
}
