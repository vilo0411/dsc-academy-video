#!/usr/bin/env node
// Bài nghe thử: đọc cùng một đoạn bằng nhiều phương án giọng, ghép thành một video có thẻ tên từng phương án.
//
// Cách dùng:  node lab/voice-test.mjs lab/voice-test.json
// Kết quả:    lab/build/<id>/content.json (kịch bản đã ghép), voice.wav, timings.json, report.json
//             lab/out/<id>/<chữ cái>.wav cho từng phương án

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../scripts/lib/env.mjs";
import { synthScenes } from "../scripts/tts.mjs";

loadEnv();
const contentPath = process.argv[2];
const test = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const outDir = path.join("lab/build", test.id);
const wavDir = path.join("lab/out", test.id);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(wavDir, { recursive: true });

const letters = "ABCDEFGHIJ";
const report = [];
const scenes = [];
const segments = [];
let k = 0;
for (const v of test.variants) {
  const letter = letters[k];
  try {
    console.log(`Phương án ${letter}: ${v.label}`);
    const r = await synthScenes(test.passage, v, { leadIn: 0.1 });
    fs.writeFileSync(path.join(wavDir, `${letter}.wav`), r.wav);
    segments.push({ letter, v, r });
    report.push({ letter, label: v.label, ok: true, seconds: r.duration });
    k++;
  } catch (e) {
    console.log(`  bỏ qua: ${e.message}`);
    report.push({ letter: null, label: v.label, ok: false, error: e.message.slice(0, 500) });
  }
}
if (!segments.length) {
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.error("Không phương án nào tạo được giọng.");
  process.exit(1);
}

// Ghép: [thẻ tên 2,5s im lặng] + đoạn đọc, lần lượt từng phương án.
const LABEL = 2.5;
const RATE = 24000;
const chunks = [];
const timing = [];
let t = 0;
const readPcm = (wav) => wav.subarray(44);
for (const { letter, v, r } of segments) {
  scenes.push({
    id: `${letter}-label`,
    text: `Phương án ${letter}. ${v.label}`,
    visual: { type: "title", pose: "idle", headline: `Phương án ${letter}`, sub: v.label },
  });
  timing.push({ id: `${letter}-label`, start: Number(t.toFixed(3)), end: Number((t + LABEL).toFixed(3)) });
  chunks.push(Buffer.alloc(Math.round(LABEL * RATE) * 2));
  t += LABEL;
  r.scenes.forEach((s, i) => {
    const src = test.passage[i];
    scenes.push({ ...src, id: `${letter}-${src.id}` });
    timing.push({ id: `${letter}-${src.id}`, start: Number((t + s.start).toFixed(3)), end: Number((t + s.end).toFixed(3)) });
  });
  chunks.push(readPcm(r.wav));
  t += r.duration;
}
const pcm = Buffer.concat(chunks);
const header = Buffer.from(fs.readFileSync(path.join(wavDir, `${segments[0].letter}.wav`)).subarray(0, 44));
header.writeUInt32LE(36 + pcm.length, 4);
header.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(outDir, "voice.wav"), Buffer.concat([header, pcm]));
fs.writeFileSync(path.join(outDir, "timings.json"), JSON.stringify({ source: "voice-test", audio: "voice.wav", duration: Number(t.toFixed(3)), scenes: timing }, null, 2));
fs.writeFileSync(path.join(outDir, "content.json"), JSON.stringify({ id: test.id, title: test.title, series: test.series, scenes }, null, 2));
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(`Xong: ${segments.length}/${test.variants.length} phương án, tổng ${t.toFixed(1)}s`);
