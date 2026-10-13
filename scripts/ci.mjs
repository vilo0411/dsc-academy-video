#!/usr/bin/env node
// Chạy trên GitHub Actions: giọng đọc (Gemini) → dựng → kiểm tra → render cho từng file kịch bản.
// Giọng đọc được lưu trong cache/<id>/ và dùng lại nếu lời thoại không đổi (tiết kiệm lượt gọi free tier).
// Mỗi kịch bản ghi kết quả vào status/<id>.json để đọc lại mà không cần xem log Actions.
//
// Cách dùng:  node scripts/ci.mjs content/t01-vi-mo-la-gi.json [content/...]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const files = process.argv.slice(2).filter((f) => f.endsWith(".json") && fs.existsSync(f));
if (!files.length) {
  console.log("Không có kịch bản nào cần render.");
  process.exit(0);
}
fs.mkdirSync("status", { recursive: true });
fs.mkdirSync("out", { recursive: true });

const tail = (s, n = 4000) => (s || "").slice(-n);
function run(cmd, args, opts = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  return { ok: r.status === 0, code: r.status, seconds: Math.round((Date.now() - t0) / 1000), out: tail((r.stdout || "") + (r.stderr || "")) };
}

let failed = 0;
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(file, "utf8"));
  const { id } = content;
  const status = { id, file, commit: process.env.GITHUB_SHA || null, startedAt: new Date().toISOString(), ok: false, steps: [] };
  const save = () => fs.writeFileSync(path.join("status", `${id}.json`), JSON.stringify(status, null, 2));
  const step = (name, r) => {
    status.steps.push({ name, ok: r.ok, seconds: r.seconds, log: r.out });
    save();
    return r.ok;
  };
  console.log(`\n=== ${id} (${file}) ===`);

  const buildDir = path.join("build", id);
  const cacheDir = path.join("cache", id);
  fs.mkdirSync(buildDir, { recursive: true });
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify({ texts: content.scenes.map((s) => s.text), voice: content.voice, model: process.env.GEMINI_TTS_MODEL || "" }))
    .digest("hex");
  const cachedTimings = path.join(cacheDir, "timings.json");
  let cached = null;
  try {
    cached = JSON.parse(fs.readFileSync(cachedTimings, "utf8"));
  } catch {}

  if (cached && cached.textHash === hash && fs.existsSync(path.join(cacheDir, "voice.wav"))) {
    fs.copyFileSync(path.join(cacheDir, "voice.wav"), path.join(buildDir, "voice.wav"));
    fs.copyFileSync(cachedTimings, path.join(buildDir, "timings.json"));
    step("tts", { ok: true, seconds: 0, out: "Lời thoại không đổi — dùng lại giọng đọc đã có." });
  } else if (!process.env.GEMINI_API_KEY) {
    step("tts", { ok: false, seconds: 0, out: "Thiếu secret GEMINI_API_KEY trong Settings → Secrets and variables → Actions." });
    failed++;
    continue;
  } else {
    if (!step("tts", run(process.execPath, ["scripts/tts-gemini.mjs", file]))) {
      failed++;
      continue;
    }
    const t = JSON.parse(fs.readFileSync(path.join(buildDir, "timings.json"), "utf8"));
    t.textHash = hash;
    fs.writeFileSync(path.join(buildDir, "timings.json"), JSON.stringify(t, null, 2));
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.copyFileSync(path.join(buildDir, "voice.wav"), path.join(cacheDir, "voice.wav"));
    fs.copyFileSync(path.join(buildDir, "timings.json"), cachedTimings);
  }
  try {
    status.timings = JSON.parse(fs.readFileSync(path.join(buildDir, "timings.json"), "utf8"));
  } catch {}

  if (!step("build", run(process.execPath, ["scripts/build.mjs", file]))) {
    failed++;
    continue;
  }
  const projDir = path.join(buildDir, "video-16x9");
  // Kiểm tra lint/layout của HyperFrames: ghi lại kết quả nhưng không chặn render.
  const check = run("npx", ["hyperframes", "check"], { cwd: projDir });
  status.steps.push({ name: "check", ok: check.ok, seconds: check.seconds, log: check.out, blocking: false });
  save();

  const out = path.resolve("out", `${id}.mp4`);
  const quality = process.env.RENDER_QUALITY || "looks";
  if (!step("render", run("npx", ["hyperframes", "render", "--quality", quality, "--output", out], { cwd: projDir }))) {
    failed++;
    continue;
  }
  const probe = run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", out]);
  try {
    status.output = { file: `out/${id}.mp4`, ...JSON.parse(probe.out).format };
  } catch {}
  status.ok = true;
  status.finishedAt = new Date().toISOString();
  save();
  console.log(`✓ ${id} → out/${id}.mp4`);
}
process.exit(failed ? 1 : 0);
