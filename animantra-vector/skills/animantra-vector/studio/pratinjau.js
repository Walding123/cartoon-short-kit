// Adegan pratinjau Gaya Saya: ruangan + pulpen klik dibelah, digambar SVG dengan palet bagian (PAL) dan tebal garis tepi (r)
// yang sama seperti bedah.js, sehingga karakter benda & garis tepi ikut diolah terapkanGaya().
const PAL = {
  lacquer: ['#b84256', '#8e2436', '#64172a'], cut: ['#f0dccd', '#f0dccd', '#f0dccd'], gold: ['#f6dc8e', '#e3bf62', '#b8913a'],
  steel: ['#a9a4a8', '#7d777c', '#555055'], ivory: ['#fbf7ef', '#e9e0cf', '#c9bba3'], lever: ['#4a4549', '#353034', '#221e21'],
  liqB: ['#8cb8ef', '#5d93dc', '#3f71bd'],
};
const EDGE = { r: { value: 2.6 } };
const INK = '#1b1a1f';
(() => {
  const sw = (EDGE.r.value * 2.3).toFixed(1);
  const part = (x, y, w, h, p, rx = 18) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${PAL[p][1]}" stroke="${INK}" stroke-width="${sw}"/>
    <rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${Math.max(6, h * 0.22)}" rx="${rx / 2}" fill="${PAL[p][0]}"/>
    <rect x="${x + 8}" y="${y + h * 0.7}" width="${w - 16}" height="${h * 0.22}" rx="${rx / 2}" fill="${PAL[p][2]}" opacity=".85"/>`;
  let pegas = ''; for (let k = 0; k < 9; k++) pegas += `<path d="M${330 + k * 30} 846 l15 -58 l15 58" fill="none" stroke="${PAL.lever[0]}" stroke-width="10" stroke-linejoin="round"/>`;
  const pulpen = `<g transform="translate(560 1010) rotate(-30) translate(-560 -820)">
    <ellipse cx="560" cy="990" rx="520" ry="60" fill="#5a4632" opacity=".16"/>
    ${part(40, 740, 1040, 160, 'lacquer', 70)}
    <rect x="70" y="764" width="980" height="112" rx="50" fill="${PAL.cut[1]}" stroke="${INK}" stroke-width="${sw}"/>
    ${part(120, 790, 720, 60, 'steel', 26)}
    <rect x="160" y="800" width="560" height="40" rx="18" fill="${PAL.liqB[1]}" stroke="${INK}" stroke-width="${sw}"/>
    ${pegas}
    ${part(840, 770, 130, 100, 'gold', 20)}
    ${part(960, 728, 170, 184, 'ivory', 40)}
    <path d="M40 778 L-60 820 L40 862 Z" fill="${PAL.steel[0]}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>
  </g>`;
  document.getElementById('bg').innerHTML = `<rect width="1080" height="1920" fill="#efe6d6"/>
    <rect x="0" y="0" width="1080" height="1180" fill="#f6f0e6"/><path d="M0 1180H1080" stroke="#e1d5c2" stroke-width="6"/>
    <rect x="120" y="140" width="380" height="520" rx="16" fill="#fbf7f0" stroke="#e1d5c2" stroke-width="6"/>
    <rect x="0" y="1180" width="1080" height="740" fill="#e9e2d6"/>${pulpen}`;
})();
