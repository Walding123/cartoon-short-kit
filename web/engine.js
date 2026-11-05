// Render engine: toon materials, painted boxes, 2D character cards, normal/depth ink pass, DOF + grade.
import * as THREE from 'three';
import { Pen } from './toon.js';
export { THREE };

const Q = new URLSearchParams(location.search);
export const W = +(Q.get('w') || 1080), H = +(Q.get('h') || 1920);
export const FPS = 30;

export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 900);
scene.fog = new THREE.Fog(0xcfd8e0, 30, 160);

// 2-step toon ramp
const ramp = new Uint8Array([90, 90, 90, 255, 255, 255, 255, 255]);
const gradTex = new THREE.DataTexture(ramp, 2, 1, THREE.RGBAFormat); gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;

const matCache = new Map();
export const toon = (color = '#ffffff', map = null, extra = {}) => {
  const k = color + (map ? map.uuid : '') + JSON.stringify(extra);
  if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshToonMaterial({ color, map, gradientMap: gradTex, ...extra });
  matCache.set(k, m); return m;
};
export const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

export const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, opts = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
  if (opts.nd !== undefined) m.userData.nd = opts.nd;
  parent.add(m); return m;
};
/** box with constant texel density (den tiles per metre) */
export const tboxGeo = (w, h, d, den = 1) => {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0] * den, uv.getY(j) * dims[f][1] * den); }
  return g;
};
export const tbox = (w, h, d, mat, pos, parent = scene, den = 1, opts = {}) => add(tboxGeo(w, h, d, den), mat, pos, opts.rot || [0, 0, 0], parent, opts);
export const group = (pos = [0, 0, 0], parent = scene) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };

// ---------- lights ----------
export const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a70, 1.2); scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 80 });
scene.add(sun); scene.add(sun.target);
export const pointA = new THREE.PointLight(0xffd9a0, 0, 12, 1.6); scene.add(pointA);

export const LIGHTS = {
  day: { sky: '#cfe3ef', fog: '#d9e2e6', fogN: 25, fogF: 140, sun: '#fff1d8', sunI: 2.4, az: 35, el: 50, hs: '#e9f2ff', hg: '#a08a74', hI: 1.25, tint: '#ffffff', sat: 1.08, gain: 1.0, lift: 0.0, vig: 0.28 },
  golden: { sky: '#f3c98f', fog: '#f0c792', fogN: 20, fogF: 120, sun: '#ffc27a', sunI: 2.6, az: -40, el: 22, hs: '#ffe2b8', hg: '#8a5a4a', hI: 1.1, tint: '#fff0dc', sat: 1.12, gain: 1.02, lift: 0.01, vig: 0.34 },
  fog: { sky: '#d8d0bc', fog: '#d4cab4', fogN: 6, fogF: 70, sun: '#ffe8c4', sunI: 1.6, az: 30, el: 35, hs: '#efe6d2', hg: '#7d7466', hI: 1.4, tint: '#f8f2e6', sat: 1.0, gain: 1.0, lift: 0.015, vig: 0.3 },
  night: { sky: '#1d2b4f', fog: '#22325a', fogN: 12, fogF: 90, sun: '#a9c0ff', sunI: 1.8, az: -30, el: 40, hs: '#7d96d8', hg: '#2c3458', hI: 1.5, tint: '#b9c8f0', sat: 0.95, gain: 1.05, lift: 0.01, vig: 0.42 },
};
let LCUR = LIGHTS.day;
export const applyLight = (name, focusPt = [0, 0, 0], k = 0, other = null) => {
  let L = LIGHTS[name];
  if (other && k > 0) { const B = LIGHTS[other], m = {}; for (const key in L) m[key] = typeof L[key] === 'number' ? L[key] * (1 - k) + B[key] * k : (k < 0.5 ? L[key] : B[key]); for (const key of ['sky', 'fog', 'sun', 'hs', 'hg', 'tint']) m[key] = '#' + new THREE.Color(L[key]).lerp(new THREE.Color(B[key]), k).getHexString(); L = m; }
  LCUR = L;
  scene.background = new THREE.Color(L.sky);
  scene.fog.color.set(L.fog); scene.fog.near = L.fogN; scene.fog.far = L.fogF;
  sun.color.set(L.sun); sun.intensity = L.sunI;
  hemi.color.set(L.hs); hemi.groundColor.set(L.hg); hemi.intensity = L.hI;
  const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el), r = 30;
  sun.target.position.set(...focusPt);
  sun.position.set(focusPt[0] + r * Math.cos(el) * Math.sin(az), focusPt[1] + r * Math.sin(el), focusPt[2] + r * Math.cos(el) * Math.cos(az));
  for (const c of Card.all) c.mat.color.set(L.tint);
};

// ---------- cards ----------
const ndCardMat = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } },
  vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vD; void main(){ if(texture2D(map,vUv).a<0.5) discard; gl_FragColor=vec4(0.,0.,1.,vD/1000.); }`,
  side: THREE.DoubleSide,
});
export class Card {
  static all = [];
  constructor(draw, { h = 2.25, res = 1.5, parent = scene, shadow = true } = {}) {
    this.draw = draw; this.res = res; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = 600 * res; this.canvas.height = 1000 * res;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, color: 0xffffff });
    const w = h * 0.6, geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2 - h * 0.025, 0);
    this.root = new THREE.Group(); parent.add(this.root);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.castShadow = shadow; this.mesh.receiveShadow = false;
    this.mesh.userData.nd = ndCardMat(this.tex);
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.root.add(this.mesh);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(w * 0.32, 24), new THREE.MeshBasicMaterial({ color: 0x1a1020, transparent: true, opacity: 0.28, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.scale.y = 0.55; blob.userData.nd = null; blob.renderOrder = 1;
    this.blob = blob; this.root.add(blob);
    this.key = null; Card.all.push(this);
  }
  set(state) {
    const k = JSON.stringify(state);
    if (k !== this.key) {
      this.key = k; const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      g.setTransform(this.res, 0, 0, this.res, 0, 0); this.draw(new Pen(g), state, g); this.tex.needsUpdate = true;
    }
    return this;
  }
  /** place at feet position; yaw toward camera; idle bob/tilt; s = scale */
  place(x, y, z, { s = 1, bob = 0, tilt = 0, yaw = null, show = true, blob = true, lean = 0 } = {}) {
    this.root.visible = show; if (!show) return this;
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw ?? Math.atan2(camera.position.x - x, camera.position.z - z);
    this.mesh.scale.set(s * (1 - bob * 0.5), s * (1 + bob), s);
    this.mesh.rotation.z = THREE.MathUtils.degToRad(tilt);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(lean);
    this.blob.visible = blob; this.blob.scale.set(s, 0.55 * s, 1);
    return this;
  }
  hide() { this.root.visible = false; return this; }
}

// ---------- passes ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtND = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const ndWorld = new THREE.ShaderMaterial({
  vertexShader: `#include <common>
  varying vec3 vN; varying float vD;
  void main(){
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vN=normalize(transformedNormal); vD=-mvPosition.z;
  }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n.xy, 0., vD/1000.); }`,
  side: THREE.DoubleSide,
});
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene();
export const post = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtColor.texture }, tND: { value: rtND.texture }, res: { value: new THREE.Vector2(W, H) },
    inkR: { value: 2.5 * W / 1080 }, cInf: { value: 0 }, focus: { value: 5 }, flash: { value: 0 }, sat: { value: 1 }, gain: { value: 1 }, lift: { value: 0 }, vig: { value: 0.3 },
    inkCol: { value: new THREE.Color('#241726') }, dark: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `
  uniform sampler2D tColor, tND; uniform vec2 res; uniform float inkR, cInf, focus, flash, sat, gain, lift, vig, dark; uniform vec3 inkCol;
  varying vec2 vUv;
  float depthAt(vec2 uv){ float a=texture2D(tND,uv).a; return a<=0.0 ? 1000.0 : a*1000.0; }
  float cocOf(float d){ return clamp(cInf*abs(1.0-focus/d), 0.0, cInf); }
  void main(){
    vec4 c=texture2D(tND,vUv); float d=depthAt(vUv); bool card=c.b>0.5;
    // ---- DOF gather ----
    vec3 col; float cc=cocOf(d);
    if(cInf>0.5 && cc>0.6){
      vec3 acc=vec3(0.); float wsum=0.;
      for(int i=0;i<40;i++){
        float fi=float(i); float r=sqrt((fi+0.5)/40.0)*cc; float an=fi*2.39996;
        vec2 o=vec2(cos(an),sin(an))*r/res; float td=depthAt(vUv+o); float tc=cocOf(td);
        float w = td < d-0.05 ? smoothstep(r-1.0, r+1.0, tc) : 1.0;
        acc+=texture2D(tColor,vUv+o).rgb*w; wsum+=w;
      }
      col=acc/max(wsum,1e-3);
    } else col=texture2D(tColor,vUv).rgb;
    // ---- ink ----
    float ink=0.;
    if(!card && d<999.0){
      vec3 n0=vec3(c.xy, sqrt(max(0.,1.-dot(c.xy,c.xy))));
      for(int i=0;i<8;i++){
        float an=float(i)*0.785398; vec2 o=vec2(cos(an),sin(an))*inkR/res;
        vec4 q=texture2D(tND,vUv+o); float qd=q.a<=0.0?1000.0:q.a*1000.0;
        if(qd-d > max(0.05, d*0.035)) ink=1.;
        if(q.b<0.5 && abs(qd-d)<d*0.03){ vec3 n1=vec3(q.xy, sqrt(max(0.,1.-dot(q.xy,q.xy)))); if(dot(n0,n1)<0.72) ink=max(ink,0.85); }
      }
      ink*=1.0-smoothstep(140.0,520.0,d);
      ink*=1.0-clamp(cc/6.0,0.,0.7);
    }
    col=mix(col, inkCol*(1.0-dark*0.0), ink);
    // ---- grade ----
    col=col*gain+lift;
    float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=mix(vec3(l),col,sat);
    vec2 v=vUv-0.5; v.x*=0.75; col*=1.0-vig*smoothstep(0.25,0.85,length(v)*1.4);
    col=mix(col,vec3(1.0),flash);
    gl_FragColor=vec4(max(col,0.),1.);
    #include <colorspace_fragment>
  }`,
  depthTest: false, depthWrite: false,
});
fsScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

const swap = [];
const toND = () => {
  swap.length = 0;
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isSprite) return;
    const nd = o.userData.nd;
    swap.push([o, o.material, o.visible]);
    if (nd === null) o.visible = false; else o.material = nd || ndWorld;
  });
};
const fromND = () => { for (const [o, m, v] of swap) { o.material = m; o.visible = v; } };

export const look = { cInf: 0, focus: 5, flash: 0 };
let storyUpdate = null;
export const setStory = (fn) => { storyUpdate = fn; };

export const renderFrame = (f) => {
  storyUpdate(f);
  const L = LCUR;
  post.uniforms.cInf.value = look.cInf * W / 1080; post.uniforms.focus.value = look.focus; post.uniforms.flash.value = look.flash;
  post.uniforms.sat.value = L.sat; post.uniforms.gain.value = L.gain; post.uniforms.lift.value = L.lift; post.uniforms.vig.value = L.vig;
  camera.updateMatrixWorld();
  renderer.shadowMap.autoUpdate = true;
  renderer.setRenderTarget(rtColor); renderer.setClearColor(scene.background, 1); renderer.clear(); renderer.render(scene, camera);
  const bg = scene.background, fog = scene.fog;
  scene.background = null; scene.fog = null; renderer.shadowMap.autoUpdate = false;
  toND();
  renderer.setRenderTarget(rtND); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  fromND(); scene.background = bg; scene.fog = fog;
  renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
};

// ---------- camera helpers ----------
export const smoother = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t) => { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); };
export const easeIn = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * t; };
export const backOut = (t, s = 1.70158) => { t = Math.min(1, Math.max(0, t)); const u = t - 1; return 1 + u * u * ((s + 1) * u + s); };
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const prog = (f, a, b) => clamp01((f - a) / (b - a));
/** keys: [[frame, {p, t, fov, roll}], ...]; interpolate with smootherstep (or ease per key: e:'out'|'in'|'lin') + gentle creep */
export const camKeys = (keys, f, creep = 1) => {
  let a = keys[0], b = keys[0], t = 0;
  for (let i = 0; i < keys.length - 1; i++) if (f >= keys[i][0]) { a = keys[i]; b = keys[i + 1]; t = (f - a[0]) / Math.max(1, b[0] - a[0]); }
  if (f >= keys[keys.length - 1][0]) { a = b = keys[keys.length - 1]; t = 0; }
  const e = b[1].e === 'out' ? easeOut(t) : b[1].e === 'in' ? easeIn(t) : b[1].e === 'lin' ? clamp01(t) : smoother(t);
  const p = lerp3(a[1].p, b[1].p, e), tg = lerp3(a[1].t, b[1].t, e);
  const fov = lerp(a[1].fov ?? 40, b[1].fov ?? 40, e), roll = lerp(a[1].roll ?? 0, b[1].roll ?? 0, e);
  const cr = 0.012 * creep;
  p[0] += cr * Math.sin(f * 0.031); p[1] += cr * 0.6 * Math.sin(f * 0.023 + 1); p[2] += cr * Math.cos(f * 0.027);
  return { p, t: tg, fov, roll };
};
export const setCam = ({ p, t, fov = 40, roll = 0 }, shake = 0, f = 0) => {
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(p[0] + shake * 0.05 * Math.sin(f * 2.7), p[1] + shake * 0.05 * Math.cos(f * 3.1), p[2]);
  camera.up.set(0, 1, 0); camera.lookAt(t[0], t[1], t[2]);
  if (roll) camera.rotateZ(THREE.MathUtils.degToRad(roll));
};
/** idle motion: breathing bob + tiny sway */
export const idle = (f, seed = 1) => ({ bob: 0.008 * Math.sin(f * 0.12 + seed * 2), tilt: 0.8 * Math.sin(f * 0.05 + seed) });
export const blinkAt = (f, seed = 1) => { const per = 95 + (seed * 37) % 50, ph = (f + seed * 23) % per; return ph < 2 ? 1 : ph < 4 ? 0.5 : 0; };
export const talkPhase = (f) => Math.floor(f / 2);
