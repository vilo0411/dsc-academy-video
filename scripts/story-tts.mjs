#!/usr/bin/env node
// Giọng đọc cho phim kể chuyện: người dẫn chuyện dùng "voice", câu thoại của nhân vật dùng giọng riêng
// (characters.<key>.voice). Mỗi cảnh một lần gọi API; cảnh không đổi lời/giọng thì dùng lại bản đã tạo.
//
// Cách dùng:  node scripts/story-tts.mjs stories/<thư mục>/story.json
// Kết quả:    build/<id>/voice.wav + build/<id>/timings.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadEnv } from "./lib/env.mjs";
import { synthesize, resample, trimSilence, floatToWav } from "./lib/tts-providers.mjs";
import { readWav } from "./lib/wav.mjs";

loadEnv();
const RATE = 24000;
const GAP = 0.5; // giây nghỉ giữa hai câu
const LEAD = 0.6; // nghỉ đầu phim

const story = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const outDir = path.join("build", story.id);
const cacheDir = path.join(outDir, "voice-cache");
fs.mkdirSync(cacheDir, { recursive: true });

const voiceOf = (s) => (s.speaker && story.characters?.[s.speaker]?.voice) || story.voice;

const parts = [];
for (const s of story.scenes) {
  const v = voiceOf(s);
  const key = crypto.createHash("sha1").update(JSON.stringify({ text: s.text, v })).digest("hex").slice(0, 16);
  const file = path.join(cacheDir, `${s.id}-${key}.wav`);
  let samples;
  if (fs.existsSync(file)) {
    samples = readWav(fs.readFileSync(file)).samples;
    process.stdout.write("=");
  } else {
    const r = await synthesize(s.text, v);
    samples = trimSilence(resample(r.samples, r.sampleRate, RATE), RATE);
    fs.writeFileSync(file, floatToWav(samples, RATE));
    process.stdout.write(".");
  }
  // Cảnh video cần dài hơn lời đọc để đoạn phim kịp chạy (mặc định tối thiểu 5 giây).
  const minDur = s.minDuration ?? (s.shot?.mode === "video" ? 5 : 0);
  parts.push({ id: s.id, samples, hold: Math.max(0, minDur - samples.length / RATE) });
}
process.stdout.write("\n");

const gapN = Math.round(GAP * RATE);
const total = Math.round(LEAD * RATE) + parts.reduce((a, p) => a + p.samples.length + Math.round(p.hold * RATE) + gapN, 0);
const out = new Float32Array(total);
let pos = Math.round(LEAD * RATE);
const marks = [];
for (const p of parts) {
  out.set(p.samples, pos);
  marks.push({ id: p.id, a: pos / RATE, b: (pos + p.samples.length) / RATE });
  pos += p.samples.length + Math.round(p.hold * RATE) + gapN;
}
const r3 = (n) => Number(n.toFixed(3));
// Hình đổi cảnh giữa quãng nghỉ; speechStart/speechEnd dùng cho phụ đề.
const scenes = marks.map((m, i) => ({
  id: m.id,
  start: r3(i === 0 ? 0 : m.a - GAP / 2),
  end: r3(i === marks.length - 1 ? total / RATE : marks[i + 1].a - GAP / 2),
  speechStart: r3(m.a),
  speechEnd: r3(m.b),
}));
fs.writeFileSync(path.join(outDir, "voice.wav"), floatToWav(out, RATE));
fs.writeFileSync(
  path.join(outDir, "timings.json"),
  JSON.stringify({ source: "story-tts", audio: "voice.wav", duration: r3(total / RATE), scenes }, null, 2)
);
console.log(`Xong: ${outDir}/voice.wav (${(total / RATE).toFixed(1)}s, "=" là cảnh dùng lại, "." là cảnh mới tạo).`);
