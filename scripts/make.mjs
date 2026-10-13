#!/usr/bin/env node
// Chạy trọn luồng cho một kịch bản: giọng đọc → dựng → render.
// Cách dùng:  node scripts/make.mjs content/pe-la-gi.json
// Bỏ qua bước giọng đọc (chỉ xem hình):  node scripts/make.mjs content/pe-la-gi.json --no-voice

import { spawnSync } from "node:child_process";
import { loadEnv } from "./lib/env.mjs";

loadEnv();
const contentPath = process.argv[2] || "content/pe-la-gi.json";
const noVoice = process.argv.includes("--no-voice");
const run = (script, ...args) => {
  const r = spawnSync(process.execPath, [script, contentPath, ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
};

if (!noVoice) {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error("Chưa có GEMINI_API_KEY trong .env. Thêm key, hoặc chạy với --no-voice để xem hình trước.");
    process.exit(1);
  }
  run("scripts/tts-gemini.mjs");
}
run("scripts/build.mjs");
run("scripts/render.mjs", "looks");
