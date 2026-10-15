#!/usr/bin/env node
// Chạy trên GitHub Actions: giọng đọc → (nhạc) → dựng → kiểm tra → render cho từng kịch bản videos/<id>/script.json.
// Giọng/nhạc đã tạo nằm ở cache/<id>/ trên nhánh renders và được dùng lại nếu lời thoại không đổi.
// Kết quả: out/<id>.mp4 + out/<id>.srt, báo cáo status/<id>.json (đọc lại bằng "npm run pull" trên máy).
//
// Cách dùng:  node scripts/ci.mjs videos/t01-vi-mo-la-gi/script.json [...]
import fs from "node:fs";
import path from "node:path";
import { projectDir, orientationsFor } from "./lib/paths.mjs";
import { run, tail, voiceState, stampVoice, scriptFor, ttsFor, render, compress, probe, captionsFromHtml, toSrt } from "./lib/pipeline.mjs";

const files = process.argv.slice(2).filter((f) => f.endsWith(".json") && fs.existsSync(f));
if (!files.length) {
  console.log("Không có kịch bản nào cần render.");
  process.exit(0);
}
fs.mkdirSync("status", { recursive: true });
fs.mkdirSync("out", { recursive: true });
const CACHED = ["voice.wav", "timings.json", "music.wav", "music.json"];
const copy = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of CACHED) if (fs.existsSync(path.join(from, f))) fs.copyFileSync(path.join(from, f), path.join(to, f));
};

let failed = 0;
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(file, "utf8"));
  const { id } = content;
  const dir = path.dirname(file);
  const cacheDir = path.join("cache", id);
  const status = { id, file, commit: process.env.GITHUB_SHA || null, startedAt: new Date().toISOString(), ok: false, steps: [] };
  const save = () => fs.writeFileSync(path.join("status", `${id}.json`), JSON.stringify(status, null, 2));
  const step = (name, r, blocking = true) => {
    status.steps.push({ name, ok: r.ok, seconds: r.seconds, log: tail(r.out), ...(blocking ? {} : { blocking: false }) });
    save();
    return r.ok;
  };
  const node = (script) => run(process.execPath, [script, file]);
  console.log(`\n=== ${id} (${file}) ===`);
  copy(cacheDir, dir);

  const voice = voiceState(dir, content);
  if (content.approved === false) {
    step("tts", { ok: true, seconds: 0, out: "Kịch bản chưa duyệt (approved: false) — render bản xem thử không tiếng, chưa gọi API giọng đọc." });
    status.preview = true;
  } else if (voice === "ok") {
    step("tts", { ok: true, seconds: 0, out: "Lời thoại không đổi — dùng lại giọng đọc đã có." });
  } else if (!(content.voice?.provider?.startsWith("cloud") ? process.env.GCP_SA_KEY : process.env.GEMINI_API_KEY)) {
    step("tts", { ok: false, seconds: 0, out: "Thiếu secret (GEMINI_API_KEY hoặc GCP_SA_KEY) trong Settings → Secrets and variables → Actions. Vẫn render bản không tiếng để kiểm tra hình." });
    for (const f of ["voice.wav", "timings.json"]) fs.rmSync(path.join(dir, f), { force: true });
    status.silent = true;
    failed++;
  } else {
    if (!step("tts", node(ttsFor(content)))) {
      failed++;
      continue;
    }
    stampVoice(dir, content);
  }
  try {
    status.timings = JSON.parse(fs.readFileSync(path.join(dir, "timings.json"), "utf8"));
  } catch {}

  // Nhạc nền (Lyria trên Vertex AI) cho video essay — không chặn nếu lỗi, video vẫn có giọng và tiếng động.
  if ((content.format === "essay" || content.format === "toon") && content.music?.prompt) step("music", node("scripts/music.mjs"), false);
  copy(dir, cacheDir);

  // Hoạt hình toon: CI có Whisper (render.yml) nên dựng được, trừ video có nhân vật vẽ bằng AI ("cast": ảnh trong
  // videos/<id>/media/ chỉ có trên máy) — khi đó CI chỉ tạo giọng + nhạc rồi lưu vào cache.
  if (content.format === "toon" && content.cast) {
    step("build", { ok: true, seconds: 0, out: "Định dạng toon dựng trên máy: npm run video -- " + id + " (giọng và nhạc lấy từ nhánh renders)." });
    Object.assign(status, { ok: true, localOnly: true, finishedAt: new Date().toISOString() });
    save();
    continue;
  }

  if (!step("build", node(scriptFor(content)))) {
    failed++;
    continue;
  }
  if (fs.existsSync(path.join("videos", id, "edit"))) status.edited = true; // dùng bản sửa tay trong videos/<id>/edit/
  // Bản nghe (chỉ âm thanh) để duyệt lời và nhạc trước khi dựng hình: không render video.
  if (content.audioOnly && fs.existsSync(path.join(dir, "mix.wav"))) {
    const mp3 = path.resolve("out", `${id}.mp3`);
    step("audio", run("ffmpeg", ["-y", "-v", "error", "-i", path.join(dir, "mix.wav"), "-c:a", "libmp3lame", "-b:a", "160k", mp3]));
    Object.assign(status, { ok: true, output: { file: `out/${id}.mp3` }, finishedAt: new Date().toISOString() });
    save();
    continue;
  }
  const proj = projectDir(dir, orientationsFor(content)[0]);
  // Kiểm tra lint/layout của HyperFrames: ghi lại kết quả nhưng không chặn render.
  step("check", run("npx", ["hyperframes", "check"], { cwd: proj }), false);

  const out = path.join("out", `${id}.mp4`);
  if (!step("render", render(proj, out, process.env.RENDER_QUALITY || "looks"))) {
    failed++;
    continue;
  }
  const small = compress(out);
  if (small) status.steps.push({ name: "compress", ok: true, seconds: 0, log: `Nén lại còn ${small} MB` });
  const caps = captionsFromHtml(fs.readFileSync(path.join(proj, "index.html"), "utf8"));
  if (caps.length) fs.writeFileSync(path.join("out", `${id}.srt`), toSrt(caps));
  status.output = { file: `out/${id}.mp4`, ...probe(out) };
  Object.assign(status, { ok: !status.silent, rendered: true, finishedAt: new Date().toISOString() });
  save();
  console.log(`✓ ${id} → ${out}`);
}
process.exit(failed ? 1 : 0);
