
// ================== REALIS: tampilan semi-realistis (dipasang kalau scene_body.js berisi "@realis") ==================
// Bahan PBR + cahaya ruangan (RoomEnvironment) + bayangan lembut, tanpa garis tepi; nada ACES & 2× supersampling di pass akhir.
// Badan memanggil: lantaiRealis(induk, x, y, ukuran) sekali, lalu drawRealis() di draw(). Bahan: std(hex, kekasaran, logam) atau BAHAN.nama().
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const lin3 = h => new THREE.Color(h).convertSRGBToLinear();
// warna latar/lantai keluar persis seperti hex-nya setelah nada ACES: cari nilai linear-nya (bagi dua)
const acesF = x => { x *= 0.95; return Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14))); };
const preTone = hex => { const c = new THREE.Color(hex), o = [c.r, c.g, c.b].map(v => { const L = Math.pow(v, 2.2); let a = 0, b = 20; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (acesF(m) < L) a = m; else b = m; } return (a + b) / 2; });
  return new THREE.Color(...o); };
const REAL_BG = preTone(typeof PP !== 'undefined' ? PP.langit : '#efe8dc');
renderer.setClearColor(REAL_BG, 1);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.children.filter(o => o.isAmbientLight).forEach(o => (o.intensity = 0.1 * Math.PI));
sun.intensity = 2.0; sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.05;
const rimLight = new THREE.DirectionalLight('#9fb7ff', 0.9); rimLight.position.set(-3000, 2500, -2000); scene.add(rimLight);
function std(hex, rough = 0.5, metal = 0, env = 1, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: lin3(hex), roughness: rough, metalness: metal, envMapIntensity: env, side: THREE.DoubleSide, ...o });
  m.userData.base = m.color.clone();
  m.hl = (pal, k) => { const c = lin3(PAL[pal] ? PAL[pal][0] : pal); m.color.copy(m.userData.base).lerp(c, k * 0.8); m.emissive.copy(c).multiplyScalar(k * 0.28); };
  return m;
}
// bahan nyata (masing-masing dipanggil sebagai fungsi supaya sorotannya terpisah)
const BAHAN = {
  kuningan: () => std('#d6b25e', 0.3, 1), kuninganPotong: () => std('#ecd291', 0.55, 1), baja: () => std('#c9cdd3', 0.28, 1), bajaKasar: () => std('#a7acb4', 0.55, 1),
  krom: () => std('#f1f3f6', 0.1, 1), nikel: () => std('#d9dbe0', 0.22, 1), aluminium: () => std('#c6c9ce', 0.42, 1), tembaga: () => std('#d9875a', 0.32, 1),
  besiCor: () => std('#55585e', 0.7, 0.8), per: () => std('#9ea4ad', 0.35, 1), karetHitam: () => std('#25282e', 0.75, 0.05), plastikPutih: () => std('#f2f2ef', 0.45, 0),
  plastikHitam: () => std('#26282d', 0.4, 0), kayu: () => std('#b98a5a', 0.6, 0), kaca: () => std('#dfeef5', 0.05, 0, 1, { transparent: true, opacity: 0.25 }),
  cat: hex => std(hex, 0.38, 0.55), vinyl: () => std('#24272e', 0.5, 0, 0.6),
};
// lantai: warna tetap (sama dengan tema) + lapisan penerima bayangan
function lantaiRealis(parent, x = 0, y = 0, size = 4000) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: preTone(typeof PP !== 'undefined' ? PP.lantai : '#ece5d8') }));
  f.position.set(x, y, -0.05); parent.add(f);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity: 0.45 })); sh.position.set(x, y, 0.02); sh.receiveShadow = true; parent.add(sh);
  f.userData.lantai = sh.userData.lantai = true;
  return f;
}
const finPass = quad(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  void main() { vec3 c = .25 * (texture2D(t, vUv + px * vec2(-.5, -.5)).rgb + texture2D(t, vUv + px * vec2(.5, -.5)).rgb + texture2D(t, vUv + px * vec2(-.5, .5)).rgb + texture2D(t, vUv + px * vec2(.5, .5)).rgb);
    gl_FragColor = vec4(pow(aces(c * 0.95), vec3(1. / 2.2)), 1.); }`, { t: { value: rtCol.texture }, px: { value: new THREE.Vector2(1 / (W * SS), 1 / (H * SS)) } });
rtCol.texture.minFilter = rtCol.texture.magFilter = THREE.LinearFilter;
function drawRealis() {
  renderer.shadowMap.needsUpdate = true;
  renderer.setClearColor(REAL_BG, 1);
  renderer.setRenderTarget(rtCol); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(finPass.scene, camera);
}
