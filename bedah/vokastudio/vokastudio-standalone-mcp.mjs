#!/usr/bin/env node
/**
 * VokaStudio — 100% Standalone Local MCP Server untuk Claude Desktop (Tanpa Perlu Publish Web App)
 *
 * Cara pakai:
 * 1. Simpan file ini di komputer Anda (misal: vokastudio-standalone-mcp.mjs)
 * 2. Pastikan Node.js (v18+) terpasang di komputer Anda (tanpa perlu npm install paket apa pun!)
 * 3. Masukkan konfigurasi berikut di claude_desktop_config.json:
 *    {
 *      "mcpServers": {
 *        "vokastudio-local": {
 *          "command": "node",
 *          "args": ["/path/lengkap/ke/vokastudio-standalone-mcp.mjs"],
 *          "env": {
 *            "GEMINI_API_KEY": "ISI_GEMINI_API_KEY_ANDA"
 *          }
 *        }
 *      }
 *    }
 * 4. Semua hasil Voice Over otomatis disimpan sebagai file .wav di folder Downloads Anda!
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

const API_KEY = process.env.GEMINI_API_KEY || "";
const OUTPUT_DIR = process.env.VOKASTUDIO_OUTPUT_DIR || path.join(os.homedir(), "Downloads");
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const TOOLS = [
  {
    name: "list_voices",
    description: "Tampilkan daftar karakter suara VokaStudio (Kore, Puck, Charon, Fenrir, Zephyr) dan panduan tag ekspresi (<breath>, <laugh>, <gasp>, |mhm|, |yeah|).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "generate_voiceover",
    description: "Render audio Voice Over solo (WAV 24kHz 16-bit) secara lokal dan simpan langsung ke folder Downloads komputer Anda.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Judul file rekaman (contoh: 'iklan-kopi')" },
        text: { type: "string", description: "Naskah voice over. Mendukung <breath>, <laugh>, <gasp>." },
        voiceName: {
          type: "string",
          enum: ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"],
          description: "Pilihan suara: Kore, Puck, Charon, Fenrir, atau Zephyr",
        },
        style: { type: "string", description: "Arahan gaya bicara / emosi (contoh: 'Warm persuasive commercial voiceover')" },
      },
      required: ["text"],
    },
  },
  {
    name: "generate_podcast_dialogue",
    description: "Render dialog 2 pembicara (WAV 24kHz 16-bit) dan simpan langsung ke folder Downloads komputer Anda.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Judul file dialog" },
        speaker1Name: { type: "string", description: "Nama pembicara 1" },
        speaker1Voice: { type: "string", enum: ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"] },
        speaker2Name: { type: "string", description: "Nama pembicara 2" },
        speaker2Voice: { type: "string", enum: ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"] },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              speaker: { type: "string" },
              text: { type: "string" },
              style: { type: "string" },
            },
            required: ["speaker", "text"],
          },
        },
      },
      required: ["speaker1Name", "speaker2Name", "lines"],
    },
  },
];

async function callGeminiTTS(model, payload) {
  if (!API_KEY || API_KEY === "ISI_GEMINI_API_KEY_ANDA" || API_KEY === "ISI_KEY_DI_SINI") {
    throw new Error(
      "GEMINI_API_KEY belum diisi pada bagian env di ~/.claude.json. Dapatkan API key gratis di https://aistudio.google.com/apikey"
    );
  }
  const url = `${API_BASE}/${model}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `HTTP Error ${res.status}`);
  }
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    throw new Error("Tidak ada data audio yang dikembalikan oleh model.");
  }
  return pcmToWav(part.inlineData.data, part.inlineData.mimeType);
}

// Gemini TTS biasanya mengirim PCM mentah (audio/L16;rate=24000), jadi beri header WAV.
function pcmToWav(base64, mimeType = "") {
  const pcm = Buffer.from(base64, "base64");
  if (pcm.subarray(0, 4).toString("ascii") === "RIFF") return pcm.toString("base64");
  const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] || 24000);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

async function handleRequest(msg) {
  const { jsonrpc = "2.0", id, method, params } = msg || {};
  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }

  try {
    if (method === "initialize") {
      return {
        jsonrpc,
        id,
        result: {
          protocolVersion: params?.protocolVersion || "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "vokastudio-standalone-local", version: "1.0.0" },
        },
      };
    }

    if (method === "ping") {
      return { jsonrpc, id, result: {} };
    }

    if (method === "tools/list") {
      return { jsonrpc, id, result: { tools: TOOLS } };
    }

    if (method === "tools/call") {
      const name = params?.name;
      const args = params?.arguments || {};

      if (name === "list_voices") {
        return {
          jsonrpc,
          id,
          result: {
            content: [
              {
                type: "text",
                text: "Karakter Suara VokaStudio:\n- Kore (Jernih & Hangat)\n- Puck (Energik & Cerah)\n- Charon (Dalam & Dokumenter)\n- Fenrir (Tegas & Kuat)\n- Zephyr (Lembut & Santai)\n\nTag Ekspresi: <breath>, <laugh>, <gasp>, |mhm|, |yeah|",
              },
            ],
          },
        };
      }

      if (name === "generate_voiceover") {
        const voiceName = String(args.voiceName || "Kore");
        const style = String(args.style || "Natural, warm, expressive Indonesian narrator");
        const text = String(args.text || "");
        const safeTitle = String(args.title || "voiceover")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "voiceover";

        const base64Audio = await callGeminiTTS("gemini-3.8-flash-tts", {
          contents: [
            {
              role: "user",
              parts: [{ text, speechMetadata: { style } }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        const filename = `${safeTitle}-${Date.now()}.wav`;
        const filePath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Audio, "base64"));

        return {
          jsonrpc,
          id,
          result: {
            content: [
              {
                type: "text",
                text: `Voice Over berhasil dibuat secara lokal (Tanpa Publish Web)!\n- Suara: ${voiceName}\n- Gaya: ${style}\n- Tersimpan di: ${filePath}`,
              },
            ],
          },
        };
      }

      if (name === "generate_podcast_dialogue") {
        const s1Name = String(args.speaker1Name || "Dimas");
        const s1Voice = String(args.speaker1Voice || "Puck");
        const s2Name = String(args.speaker2Name || "Nadia");
        const s2Voice = String(args.speaker2Voice || "Kore");
        const lines = Array.isArray(args.lines) ? args.lines : [];
        const safeTitle = String(args.title || "dialog-podcast")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "dialog-podcast";

        const parts = lines.map((l) => ({
          text: `${l.speaker}: ${l.text}`,
          speechMetadata: {
            speaker: l.speaker,
            style: l.style || "Natural conversational speaker",
          },
        }));

        const base64Audio = await callGeminiTTS("gemini-3.8-flash-tts", {
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: s1Name,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: s1Voice } },
                  },
                  {
                    speaker: s2Name,
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: s2Voice } },
                  },
                ],
              },
            },
          },
        });

        const filename = `${safeTitle}-${Date.now()}.wav`;
        const filePath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Audio, "base64"));

        return {
          jsonrpc,
          id,
          result: {
            content: [
              {
                type: "text",
                text: `Dialog 2 Pembicara berhasil dibuat secara lokal!\n- Pembicara: ${s1Name} (${s1Voice}) & ${s2Name} (${s2Voice})\n- Tersimpan di: ${filePath}`,
              },
            ],
          },
        };
      }
    }

    return {
      jsonrpc,
      id,
      error: { code: -32601, message: `Method/Tool tidak ditemukan: ${method}` },
    };
  } catch (err) {
    return {
      jsonrpc,
      id,
      error: { code: -32000, message: err?.message || String(err) },
    };
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    const res = await handleRequest(msg);
    if (res !== null) {
      process.stdout.write(JSON.stringify(res) + "\n");
    }
  } catch {
    // ignore malformed input
  }
});
