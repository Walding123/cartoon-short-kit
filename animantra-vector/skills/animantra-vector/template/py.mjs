// Jalankan skrip Python proyek dengan Python mesin skill (Mac & Windows sama):
//   node py.mjs asr.py vo/take.wav vo/take_words.json
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PY } from './alat.mjs';

const r = spawnSync(PY, process.argv.slice(2), { stdio: 'inherit', cwd: dirname(fileURLToPath(import.meta.url)), env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
if (r.error) { console.error(`Python mesin tidak bisa dijalankan (${PY}): ${r.error.message}. Jalankan setup.mjs di folder skill.`); process.exit(1); }
process.exit(r.status ?? 1);
