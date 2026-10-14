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

const tail = (s, n = 4000) => { s = s || ""; return s.length <= n * 2 ? s : s.slice(0, n) + "\n…\n" + s.slice(-n); };
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

  // Bài nghe thử giọng: luôn tạo mới, ghép nhiều phương án vào một video.
  if (content.variants) {
    if (!step("voice-test", run(process.execPath, ["scripts/voice-test.mjs", file]))) {
      failed++;
      continue;
    }
    try {
      status.report = JSON.parse(fs.readFileSync(path.join(buildDir, "report.json"), "utf8"));
    } catch {}
    if (!step("build", run(process.execPath, ["scripts/build.mjs", path.join(buildDir, "content.json")]))) {
      failed++;
      continue;
    }
    const outVt = path.resolve("out", `${id}.mp4`);
    if (!step("render", run("npx", ["hyperframes", "render", "--quality", "looks", "--output", outVt], { cwd: path.join(buildDir, "video-16x9") }))) {
      failed++;
      continue;
    }
    status.ok = true;
    status.output = { file: `out/${id}.mp4` };
    save();
    continue;
  }

  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify({ texts: content.scenes.map((s) => s.text), voice: content.voice, model: process.env.GEMINI_TTS_MODEL || "" }))
    .digest("hex");
  const cachedTimings = path.join(cacheDir, "timings.json");
  let cached = null;
  try {
    cached = JSON.parse(fs.readFileSync(cachedTimings, "utf8"));
  } catch {}

  if (content.approved === false) {
    step("tts", { ok: true, seconds: 0, out: "Kịch bản chưa duyệt (approved: false) — render bản xem thử không tiếng, chưa gọi API giọng đọc." });
    status.preview = true;
  } else if (cached && cached.textHash === hash && fs.existsSync(path.join(cacheDir, "voice.wav"))) {
    fs.copyFileSync(path.join(cacheDir, "voice.wav"), path.join(buildDir, "voice.wav"));
    fs.copyFileSync(cachedTimings, path.join(buildDir, "timings.json"));
    step("tts", { ok: true, seconds: 0, out: "Lời thoại không đổi — dùng lại giọng đọc đã có." });
  } else if (!(content.voice?.provider?.startsWith("cloud") ? process.env.GCP_SA_KEY : process.env.GEMINI_API_KEY)) {
    step("tts", { ok: false, seconds: 0, out: "Thiếu secret (GEMINI_API_KEY hoặc GCP_SA_KEY) trong Settings → Secrets and variables → Actions. Vẫn render bản không tiếng để kiểm tra hình." });
    status.silent = true;
    failed++;
  } else {
    if (!step("tts", run(process.execPath, [content.voice?.provider ? "scripts/tts.mjs" : "scripts/tts-gemini.mjs", file]))) {
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

  if (!step("build", run(process.execPath, [content.format === "essay" ? "scripts/build-essay.mjs" : "scripts/build.mjs", file]))) {
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
  // GitHub từ chối file > 100 MB: nén lại nếu video quá nặng (nền giấy nhiễu hạt làm bitrate cao).
  if (fs.statSync(out).size > 80 * 1024 * 1024) {
    const tmp = out.replace(/\.mp4$/, ".small.mp4");
    for (const crf of [24, 28, 32]) {
      const r = run("ffmpeg", ["-y", "-v", "error", "-i", out, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", tmp]);
      if (r.ok && fs.statSync(tmp).size < 80 * 1024 * 1024) break;
    }
    if (fs.existsSync(tmp)) {
      fs.renameSync(tmp, out);
      status.steps.push({ name: "compress", ok: true, seconds: 0, log: `Nén lại còn ${(fs.statSync(out).size / 1048576).toFixed(1)} MB` });
    }
  }
  const probe = run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", out]);
  try {
    status.output = { file: `out/${id}.mp4`, ...JSON.parse(probe.out).format };
  } catch {}
  status.ok = !status.silent;
  status.rendered = true;
  status.finishedAt = new Date().toISOString();
  save();
  console.log(`✓ ${id} → out/${id}.mp4`);
}
process.exit(failed ? 1 : 0);
