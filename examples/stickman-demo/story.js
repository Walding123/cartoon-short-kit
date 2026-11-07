// Demo karakter stickman berisi berwarna (lihat KATALOG.md > Tokoh > Stickman)
import { setCam, camKeys, applyLight, look, idle, blinkAt, Card } from './engine.js';
import * as T from './toon.js';
import { showSets } from './world.js';

export const TOTAL = 90;
const RW = (x, y, z) => [x + 100, y, z + 100];
const stick = (o) => new Card((p, s) => T.hoodie(p, o, s));
const C = [
  stick({ ...T.HOODIE.merah, shoes: '#e0463f' }),
  stick({ ...T.HOODIE.biru }),
  stick({ ...T.HOODIE.hijau, build: 'kid' }),
  stick({ ...T.HOODIE.kuning, shoes: '#f2b82a' }),
];
const place = (card, pos, state, f, seed) => { const id = idle(f, seed); card.set({ seed, blink: blinkAt(f, seed), ...state }).place(pos[0], pos[1], pos[2], { bob: id.bob, tilt: id.tilt }); };

export function update(f) {
  for (const c of Card.all) c.hide();
  showSets('room');
  applyLight('day', RW(0, 1, -1.5));
  look.cInf = 0; look.focus = 3; look.flash = 0;
  setCam(camKeys([[0, { p: RW(0.4, 1.4, 6.2), t: RW(0.4, 1.0, -1.3), fov: 50 }]], f));
  place(C[0], RW(-0.9, 0, -1.4), { expr: 'grin', armR: 'wave', armL: 'hip', f }, f, 1);
  place(C[1], RW(0.0, 0, -1.4), { expr: 'smile', armR: 'thumb', armL: 'hip', f }, f, 2);
  place(C[2], RW(0.8, 0, -1.4), { expr: 'laugh', armR: 'cheer', armL: 'cheer', f }, f, 3);
  place(C[3], RW(1.7, 0, -1.4), { expr: 'shock', armR: 'thumb', armL: 'shrug', f }, f, 4);
}
