// Suara narasi -> vo/take.wav. Urutan sumber: ElevenLabs (kalau kuncinya ada) > VokaStudio > VoiceStudio > suara sistem.
//   node gen_vo.mjs elevenlabs [voice_id]      ElevenLabs (eleven_multilingual_v2), per baris dengan konteks kalimat sebelum/sesudah, butuh internet
//     API key & VOICE_ID dari ~/.animantra-vector/kunci-elevenlabs.txt (diisi pengguna lewat `node $K/kunci.mjs elevenlabs`), atau ELEVENLABS_API_KEY
//   node gen_vo.mjs vokastudio [suara]          VokaStudio (Gemini TTS, default Kore): seluruh naskah sekali panggil (±30 dtk), butuh internet
//     API key dari GEMINI_API_KEY, ~/.animantra-vector/kunci-gemini.txt, atau konektor vokastudio di ~/.claude.json (dipasang vokastudio/pasang.mjs); gaya bicara dari gaya.txt kalau ada
//   node gen_vo.mjs voicestudio <profile_id> [--bagus]   VoiceStudio lokal, per baris (jeda 0,35 dtk) (127.0.0.1:3900); daftar profil: http://127.0.0.1:3900/profiles
//     default 16 langkah olahan (±3x lebih cepat, kata sama); --bagus = langkah bawaan VoiceStudio (paling halus, ±30 dtk/baris)
//     baris yang teks & pengaturannya tidak berubah diambil dari vo/simpan/ (hasil VoiceStudio sama persis untuk seed yang sama)
//   node gen_vo.mjs sistem [suara]             suara bawaan: Mac `say` (default Damayanti), Windows SAPI (default suara Indonesia pertama)
// Teks: ucapan.txt (boleh berisi "..." untuk jeda) kalau ada, kalau tidak narasi.txt. Satu baris = satu babak.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PY, WIN, MAC, bacaKunci } from './alat.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
process.chdir(DIR);
const BAGUS = process.argv.includes('--bagus');
let [mode, arg] = process.argv.slice(2).filter(a => a !== '--bagus');
if (mode === 'say') mode = 'sistem';
if (!['elevenlabs', 'vokastudio', 'voicestudio', 'sistem'].includes(mode) || (mode === 'voicestudio' && !arg)) {
  console.log('pakai: node gen_vo.mjs elevenlabs [voice_id] | node gen_vo.mjs vokastudio [suara] | node gen_vo.mjs voicestudio <profile_id> | node gen_vo.mjs sistem [suara]'); process.exit(2);
}
const src = existsSync('ucapan.txt') ? 'ucapan.txt' : 'narasi.txt';
const lines = readFileSync(src, 'utf8').split(/\r?\n/).filter(l => l.trim());

if (mode === 'vokastudio') {
  const key = process.env.GEMINI_API_KEY || bacaKunci('gemini').API_KEY || (() => { try { return JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')).mcpServers.vokastudio.env.GEMINI_API_KEY; } catch { return ''; } })();
  if (!key) { console.log('VokaStudio belum dipasang (API key Gemini belum ada). Pasang dulu, atau pakai VoiceStudio.'); process.exit(3); }
  const voice = arg || 'Kore', text = lines.join('\n');
  const style = existsSync('gaya.txt') ? readFileSync('gaya.txt', 'utf8').trim() : 'Narator konten edukasi berbahasa Indonesia, hangat dan penasaran seperti teman yang sedang membongkar rahasia, tempo pelan dan jelas dengan jeda dramatis di titik-titik, penutup tenang dan puas';
  mkdirSync('vo/simpan', { recursive: true });
  const simpan = join('vo/simpan', 'voka-' + createHash('sha1').update([text, voice, style].join('|')).digest('hex').slice(0, 16) + '.wav');
  if (existsSync(simpan)) { copyFileSync(simpan, 'vo/take.wav'); console.log('vo/take.wav (tersimpan, naskah tidak berubah)'); process.exit(0); }
  let data = {}, status = 0;
  for (let coba = 1; coba <= 3 && status !== 200; coba++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(300000),
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text, speechMetadata: { style } }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) });
      status = res.status; data = await res.json();
    } catch (e) { data = { error: { message: e.message } }; }
    if (status !== 200) console.log(`percobaan ${coba} gagal (${status || 'jaringan'}): ${String(data?.error?.message || '').slice(0, 160)}`);
  }
  const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) { console.log('VokaStudio gagal (kuota habis, key ditolak, atau internet putus): pakai VoiceStudio.'); process.exit(4); }
  let pcm = Buffer.from(part.inlineData.data, 'base64');
  if (pcm.subarray(0, 4).toString('ascii') !== 'RIFF') {
    const rate = +(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000), h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    pcm = Buffer.concat([h, pcm]);
  }
  mkdirSync('vo', { recursive: true }); writeFileSync('vo/take.wav', pcm); writeFileSync(simpan, pcm);
  console.log(`vo/take.wav ${((pcm.length - 44) / 48000).toFixed(1)} dtk (VokaStudio ${voice})`);
  process.exit(0);
}
mkdirSync('vo/baris', { recursive: true }); mkdirSync('vo/simpan', { recursive: true });
for (const f of readdirSync('vo/baris')) if (f.endsWith('.wav')) rmSync(join('vo/baris', f));

const EL = bacaKunci('elevenlabs'), EL_KEY = process.env.ELEVENLABS_API_KEY || EL.API_KEY;
const EL_VOICE = arg || EL.VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb', EL_MODEL = 'eleven_multilingual_v2';
const EL_SET = { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed: 0.95 };   // tempo sedikit pelan
if (mode === 'elevenlabs' && !EL_KEY) { console.log('ElevenLabs belum dipasang: jalankan node $K/kunci.mjs elevenlabs, isi key-nya, lalu ulangi.'); process.exit(3); }
const wav = (pcm, rate) => { const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]); };

const SAPI = `Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'id*' } | Select-Object -First 1
if ($env:KB_VOICE) { $s.SelectVoice($env:KB_VOICE) } elseif ($v) { $s.SelectVoice($v.VoiceInfo.Name) } else { Write-Host 'PERINGATAN: tidak ada suara Bahasa Indonesia di Windows' }
$s.Rate = -1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile($env:KB_OUT, $fmt)
$s.Speak($env:KB_TEXT)
$s.Dispose()`;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i], out = join('vo/baris', String(i + 1).padStart(2, '0') + '.wav');
  if (mode === 'elevenlabs') {
    const simpan = join('vo/simpan', 'el-' + createHash('sha1').update([line, lines[i - 1] || '', lines[i + 1] || '', EL_VOICE, EL_MODEL, JSON.stringify(EL_SET)].join('|')).digest('hex').slice(0, 16) + '.wav');
    if (existsSync(simpan)) { copyFileSync(simpan, out); console.log(`baris ${i + 1} ok (tersimpan)`); continue; }
    let res, buf = Buffer.alloc(0);
    for (let coba = 1; coba <= 3; coba++) {
      try {
        res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}?output_format=pcm_24000`, {
          method: 'POST', headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
          body: JSON.stringify({ text: line, model_id: EL_MODEL, voice_settings: EL_SET, previous_text: lines[i - 1] || undefined, next_text: lines[i + 1] || undefined }) });
        buf = Buffer.from(await res.arrayBuffer());
        if (res.status === 200) break;
      } catch (e) { res = { status: 0 }; buf = Buffer.from(e.message); }
      console.log(`baris ${i + 1} percobaan ${coba} gagal (${res.status || 'jaringan'}): ${buf.toString('utf8', 0, 200)}`);
      if ([401, 403, 422].includes(res.status)) break;
    }
    if (res.status !== 200) { console.log('ElevenLabs gagal (key ditolak, kredit habis, Voice ID salah, atau internet putus): pakai VokaStudio/VoiceStudio.'); process.exit(4); }
    const w = wav(buf, 24000); writeFileSync(out, w); writeFileSync(simpan, w);
  } else if (mode === 'voicestudio') {
    const simpan = join('vo/simpan', createHash('sha1').update([line, arg, BAGUS ? 'bagus' : 16, 21].join('|')).digest('hex').slice(0, 16) + '.wav');
    if (existsSync(simpan)) { copyFileSync(simpan, out); console.log(`baris ${i + 1} ok (tersimpan)`); continue; }
    const fd = new FormData();
    fd.append('text', line); fd.append('profile_id', arg); fd.append('language', 'Indonesian'); fd.append('seed', '21');
    if (!BAGUS) fd.append('num_step', '16');
    let res;
    try { res = await fetch('http://127.0.0.1:3900/generate', { method: 'POST', body: fd, signal: AbortSignal.timeout(600000) }); }
    catch (e) { console.log(`baris ${i + 1} gagal: VoiceStudio tidak menjawab (${e.message}). Buka aplikasi VoiceStudio dulu.`); process.exit(1); }
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200) { console.log(`baris ${i + 1} gagal (${res.status}): ${buf.toString('utf8', 0, 200)}`); process.exit(1); }
    writeFileSync(out, buf); writeFileSync(simpan, buf);
  } else if (MAC) {
    const r = spawnSync('say', ['-v', arg || 'Damayanti', '-r', '165', '--data-format=LEI16@24000', '-o', out, line.replaceAll('...', ',')], { stdio: 'inherit' });
    if (r.status !== 0) { console.log(`baris ${i + 1} gagal (say)`); process.exit(1); }
  } else if (WIN) {
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', SAPI], { stdio: 'inherit',
      env: { ...process.env, KB_TEXT: line.replaceAll('...', ','), KB_OUT: join(DIR, out), KB_VOICE: arg || '' } });
    if (r.status !== 0 || !existsSync(out)) { console.log(`baris ${i + 1} gagal (suara Windows)`); process.exit(1); }
  } else { console.log('suara sistem hanya ada di Mac dan Windows: pakai VoiceStudio'); process.exit(2); }
  console.log(`baris ${i + 1} ok`);
}

const r = spawnSync(PY, ['-c', `
import wave, glob, numpy as np
fs = sorted(glob.glob('vo/baris/*.wav')); parts = []; sr = None
for f in fs:
    with wave.open(f) as w:
        sr = sr or w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16)
        if w.getnchannels() == 2: a = a.reshape(-1, 2).mean(1).astype(np.int16)
    parts += [a, np.zeros(int(sr * 0.35), np.int16)]
with wave.open('vo/take.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(np.concatenate(parts).tobytes())
print('vo/take.wav', round(sum(len(p) for p in parts) / sr, 1), 'dtk')
`], { stdio: 'inherit' });
process.exit(r.status ?? 1);
