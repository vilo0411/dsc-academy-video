#!/usr/bin/env node
// Tạo nhạc nền không lời bằng Google Lyria (Vertex AI, model lyria-002) từ "music" trong kịch bản.
// Lyria trả một đoạn ~30 giây; build-essay.mjs tự lặp có crossfade cho đủ độ dài video.
//
// Cách dùng:  node scripts/music.mjs content/essay-lich-su-lam-phat.json   (cần GCP_SA_KEY)
// Kết quả:    build/<id>/music.wav (+ bản lưu trong cache/<id>/ để lần sau dùng lại)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadEnv } from "./lib/env.mjs";
import { gcpAccessToken, gcpProjectId } from "./lib/gcp-auth.mjs";

loadEnv();
const file = process.argv[2];
const content = JSON.parse(fs.readFileSync(file, "utf8"));
const m = content.music;
if (!m?.prompt) {
  console.log("Kịch bản không có music.prompt — bỏ qua nhạc nền.");
  process.exit(0);
}
const buildDir = path.join("build", content.id);
const cacheDir = path.join("cache", content.id);
fs.mkdirSync(buildDir, { recursive: true });
const hash = crypto.createHash("sha1").update(JSON.stringify([m.prompt, m.negative || "", m.seed ?? 7, m.model || "lyria-002"])).digest("hex");

const cachedMeta = path.join(cacheDir, "music.json");
try {
  const meta = JSON.parse(fs.readFileSync(cachedMeta, "utf8"));
  if (meta.hash === hash && fs.existsSync(path.join(cacheDir, "music.wav"))) {
    fs.copyFileSync(path.join(cacheDir, "music.wav"), path.join(buildDir, "music.wav"));
    console.log("Nhạc nền không đổi — dùng lại bản đã tạo.");
    process.exit(0);
  }
} catch {}

const project = gcpProjectId();
if (!project) {
  console.error("Thiếu GCP_SA_KEY — không tạo được nhạc nền.");
  process.exit(1);
}
const loc = m.location || "us-central1";
const url = `https://${loc}-aiplatform.googleapis.com/v1/projects/${project}/locations/${loc}/publishers/google/models/${m.model || "lyria-002"}:predict`;
const body = { instances: [{ prompt: m.prompt, negative_prompt: m.negative || "vocals, singing, lyrics", seed: m.seed ?? 7 }], parameters: {} };

let lastErr = "";
for (let attempt = 1; attempt <= 3; attempt++) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await gcpAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (res.ok) {
    const j = JSON.parse(txt);
    const b64 = j.predictions?.[0]?.bytesBase64Encoded || j.predictions?.[0]?.audioContent;
    if (!b64) {
      lastErr = "Phản hồi không có audio: " + txt.slice(0, 300);
      break;
    }
    fs.writeFileSync(path.join(buildDir, "music.wav"), Buffer.from(b64, "base64"));
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.copyFileSync(path.join(buildDir, "music.wav"), path.join(cacheDir, "music.wav"));
    fs.writeFileSync(cachedMeta, JSON.stringify({ hash, prompt: m.prompt, model: m.model || "lyria-002" }, null, 2));
    console.log(`Đã tạo nhạc nền (${Math.round(fs.statSync(path.join(buildDir, "music.wav")).size / 1024)} KB).`);
    process.exit(0);
  }
  lastErr = `${res.status} ${txt.slice(0, 400)}`;
  if (res.status !== 429 && res.status < 500) break;
  await new Promise((r) => setTimeout(r, 5000 * attempt));
}
console.error("Không tạo được nhạc nền: " + lastErr);
process.exit(1);
