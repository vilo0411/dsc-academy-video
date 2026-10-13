#!/usr/bin/env node
// Dùng file giọng đọc có sẵn (tạo trên Google AI Studio, tự thu âm, hoặc dịch vụ TTS khác).
//
// Cách dùng:  node scripts/import-voice.mjs content/pe-la-gi.json duong-dan/giong-doc.wav
// Nhận mọi định dạng FFmpeg đọc được (wav, mp3, m4a…). Giữa các cảnh nên có quãng nghỉ ~0,5 giây.
// Kết quả:    build/<id>/voice.wav + build/<id>/timings.json — sau đó chạy "npm run build".

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { splitScenes } from "./lib/split.mjs";

const [contentPath, audioPath] = process.argv.slice(2);
if (!contentPath || !audioPath) {
  console.error("Ví dụ: node scripts/import-voice.mjs content/pe-la-gi.json ~/Downloads/giong-doc.wav");
  process.exit(1);
}
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const outDir = path.join("build", content.id);
fs.mkdirSync(outDir, { recursive: true });
const voicePath = path.join(outDir, "voice.wav");

// Chuẩn hoá về WAV 16-bit mono 48kHz, cắt bớt khoảng lặng đầu file.
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", audioPath, "-af", "silenceremove=start_periods=1:start_threshold=-45dB", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", voicePath + ".tmp.wav"], { stdio: "inherit" });
if (r.status !== 0) {
  console.error("FFmpeg không đọc được file audio này.");
  process.exit(1);
}
fs.renameSync(voicePath + ".tmp.wav", voicePath);
const t = splitScenes(fs.readFileSync(voicePath), content.scenes);
fs.writeFileSync(path.join(outDir, "timings.json"), JSON.stringify({ source: "import", audio: "voice.wav", ...t }, null, 2));
console.log(`Xong: ${voicePath} (${t.duration}s). Kiểm tra mốc cảnh trong ${outDir}/timings.json rồi chạy "npm run build".`);
