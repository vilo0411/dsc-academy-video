#!/usr/bin/env node
// Tạo giọng đọc theo từng cảnh rồi ghép lại. Mốc thời gian mỗi cảnh lấy chính xác từ độ dài audio,
// không cần dò khoảng lặng. Nguồn giọng khai báo ở "voice" trong file kịch bản (xem scripts/lib/tts-providers.mjs).
//
// Cách dùng:  node scripts/tts.mjs content/t01-vi-mo-la-gi.json
// Kết quả:    build/<id>/voice.wav + build/<id>/timings.json

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./lib/env.mjs";
import { synthesize, resample, trimSilence, floatToWav } from "./lib/tts-providers.mjs";

loadEnv();
const RATE = 24000;
const GAP = 0.45; // giây nghỉ giữa hai cảnh

export async function synthScenes(scenes, voice, { gap = GAP, leadIn = 0.25 } = {}) {
  const parts = [];
  for (const s of scenes) {
    if (s.silent) {
      parts.push({ id: s.id, samples: new Float32Array(Math.round((s.duration || 2) * RATE)) });
      continue;
    }
    const { samples, sampleRate } = await synthesize(s.text, voice);
    parts.push({ id: s.id, samples: trimSilence(resample(samples, sampleRate, RATE), RATE) });
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  const gapN = Math.round(gap * RATE);
  const leadN = Math.round(leadIn * RATE);
  const total = leadN + parts.reduce((a, p) => a + p.samples.length + gapN, 0);
  const out = new Float32Array(total);
  let pos = leadN;
  const marks = [];
  for (const p of parts) {
    out.set(p.samples, pos);
    marks.push({ id: p.id, a: pos / RATE, b: (pos + p.samples.length) / RATE });
    pos += p.samples.length + gapN;
  }
  // Hình đổi cảnh ở giữa quãng nghỉ, trước khi câu mới bắt đầu.
  const scenesT = marks.map((m, i) => ({
    id: m.id,
    start: Number((i === 0 ? 0 : m.a - gap / 2).toFixed(3)),
    end: Number((i === marks.length - 1 ? total / RATE : marks[i + 1].a - gap / 2).toFixed(3)),
  }));
  return { wav: floatToWav(out, RATE), duration: Number((total / RATE).toFixed(3)), scenes: scenesT };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const contentPath = process.argv[2];
  const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const voice = content.voice;
  if (!voice?.provider) {
    console.error('Kịch bản chưa khai báo "voice.provider". Dùng scripts/tts-gemini.mjs cho cách cũ.');
    process.exit(1);
  }
  const outDir = path.join("build", content.id);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Tạo giọng: ${voice.provider} · ${voice.model || ""} · ${voice.voice} · ${content.scenes.length} cảnh`);
  const r = await synthScenes(content.scenes, voice);
  fs.writeFileSync(path.join(outDir, "voice.wav"), r.wav);
  fs.writeFileSync(
    path.join(outDir, "timings.json"),
    JSON.stringify({ source: voice.provider, voice, audio: "voice.wav", duration: r.duration, scenes: r.scenes }, null, 2)
  );
  console.log(`Xong: ${outDir}/voice.wav (${r.duration}s)`);
}
