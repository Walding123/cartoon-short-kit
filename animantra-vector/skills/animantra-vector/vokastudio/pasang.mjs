// Memasang suara VokaStudio (Gemini TTS, suara Kore) sebagai konektor MCP Claude Code di ~/.claude.json (Mac & Windows).
// Cara aman (bawaan): pengguna mengisi key sendiri lewat `node $K/kunci.mjs gemini` (TextEdit/Notepad), lalu  node pasang.mjs --dari-file [folder hasil suara]
// Cara lama: key lewat stdin  printf '%s' "$KEY" | node pasang.mjs [folder hasil suara]
// Hasil suara disimpan di <folder hasil suara>/_suara (default: folder tempat perintah dijalankan). gen_vo.mjs vokastudio langsung memakai key ini; tool MCP-nya aktif mulai chat berikutnya.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { bacaKunci } from '../template/alat.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DARI_FILE = process.argv.includes('--dari-file');
const argv = process.argv.slice(2).filter(a => a !== '--dari-file');
const KEY = DARI_FILE ? (bacaKunci('gemini').API_KEY || '') : readFileSync(0, 'utf8').replace(/\s+/g, '');
if (!KEY) { console.log(DARI_FILE ? 'API key belum diisi di file kunci (node kunci.mjs gemini)' : 'API key kosong'); process.exit(1); }
const OUT = join(resolve(argv[0] || process.cwd()), '_suara'); mkdirSync(OUT, { recursive: true });
// cek key ke Google dulu (tanpa mencetak key-nya)
let code = 0;
try { code = (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`, { signal: AbortSignal.timeout(15000) })).status; } catch {}
if (code !== 200) { console.log(`API key ditolak Google (HTTP ${code || '000'}). Cek lagi key-nya di aistudio.google.com/apikey`); process.exit(2); }
const f = join(homedir(), '.claude.json');
const j = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
j.mcpServers = j.mcpServers || {};
j.mcpServers.vokastudio = { type: 'stdio', command: process.execPath, args: [join(HERE, 'vokastudio-standalone-mcp.mjs')], env: { GEMINI_API_KEY: KEY, VOKASTUDIO_OUTPUT_DIR: OUT } };
writeFileSync(f, JSON.stringify(j, null, 2));
console.log('VokaStudio terpasang sebagai suara utama, langsung bisa dipakai.');
