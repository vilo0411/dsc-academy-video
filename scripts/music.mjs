#!/usr/bin/env node
// Tạo nhạc nền không lời bằng Google Lyria (Vertex AI, model lyria-002) từ "music" trong kịch bản.
// Lyria trả một đoạn ~30 giây; build-essay.mjs tự lặp có crossfade cho đủ độ dài video.
//
// Cách dùng:  node scripts/music.mjs videos/essay-lich-su-lam-phat/script.json   (cần GCP_SA_KEY)
// Kết quả:    videos/<id>/music.wav + music.json (mã băm để lần sau dùng lại)

import fs from "node:fs";
import path from "node:path";
import { videoDir } from "./lib/paths.mjs";
import crypto from "node:crypto";
import { loadEnv } from "./lib/env.mjs";
import { generateMusic } from "./lib/lyria.mjs";

loadEnv();
const file = process.argv[2];
const content = JSON.parse(fs.readFileSync(file, "utf8"));
const m = content.music;
if (!m?.prompt) {
  console.log("Kịch bản không có music.prompt — bỏ qua nhạc nền.");
  process.exit(0);
}
// music.wav + music.json nằm ngay trong videos/<id>/ (CI chép qua lại với cache/<id>/ trên nhánh renders).
const buildDir = videoDir(content.id);
const cacheDir = buildDir;
fs.mkdirSync(buildDir, { recursive: true });
const hash = crypto.createHash("sha1").update(JSON.stringify([m.prompt, m.negative || "", m.seed ?? 7, m.model || "lyria-002"])).digest("hex");

const cachedMeta = path.join(cacheDir, "music.json");
try {
  const meta = JSON.parse(fs.readFileSync(cachedMeta, "utf8"));
  if (meta.hash === hash && fs.existsSync(path.join(cacheDir, "music.wav"))) {
    console.log("Nhạc nền không đổi — dùng lại bản đã tạo.");
    process.exit(0);
  }
} catch {}

try {
  const wav = await generateMusic(m);
  fs.writeFileSync(path.join(buildDir, "music.wav"), wav);
  fs.writeFileSync(cachedMeta, JSON.stringify({ hash, prompt: m.prompt, model: m.model || "lyria-002" }, null, 2));
  console.log(`Đã tạo nhạc nền (${Math.round(wav.length / 1024)} KB).`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
