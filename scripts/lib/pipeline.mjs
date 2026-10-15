// Các bước dùng chung cho scripts/video.mjs (trên máy) và scripts/ci.mjs (GitHub).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { kindOf } from "./paths.mjs";

// Chạy lệnh, gom log vào file (nếu có) thay vì in ra màn hình.
export function run(cmd, args, { log, ...opts } = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
  const out = (r.stdout || "") + (r.stderr || "") + (r.error ? String(r.error) : "");
  if (log) fs.appendFileSync(log, `\n$ ${cmd} ${args.join(" ")}\n${out}`);
  return { ok: r.status === 0, code: r.status, seconds: Math.round((Date.now() - t0) / 1000), out };
}
export const tail = (s, n = 4000) => {
  s = s || "";
  return s.length <= n * 2 ? s : s.slice(0, n) + "\n…\n" + s.slice(-n);
};

// Băm lời thoại + cấu hình giọng: đổi thì phải tạo giọng mới.
export const textHash = (content) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify({ texts: content.scenes.map((s) => s.text), voice: content.voice, model: process.env.GEMINI_TTS_MODEL || "" }))
    .digest("hex");

export function voiceState(dir, content) {
  let t = null;
  try {
    t = JSON.parse(fs.readFileSync(path.join(dir, "timings.json"), "utf8"));
  } catch {}
  if (!t || !fs.existsSync(path.join(dir, t.audio || "voice.wav"))) return "missing";
  if (t.textHash && t.textHash !== textHash(content)) return "stale";
  return "ok";
}
export function stampVoice(dir, content) {
  const p = path.join(dir, "timings.json");
  const t = JSON.parse(fs.readFileSync(p, "utf8"));
  t.textHash = textHash(content);
  fs.writeFileSync(p, JSON.stringify(t, null, 2));
}

export const scriptFor = (content) =>
  content.format === "essay" ? "scripts/build-essay.mjs"
  : content.format === "toon" ? "scripts/build-toon.mjs"
  : kindOf(content) === "shorts" ? "scripts/build-shorts.mjs"
  : content.characters ? "scripts/build-story.mjs"
  : "scripts/build.mjs";
export const ttsFor = (content) => (content.characters ? "scripts/story-tts.mjs" : content.voice?.provider ? "scripts/tts.mjs" : "scripts/tts-gemini.mjs");

// Render MP4 bằng HyperFrames.
export const render = (projDir, out, quality, log) =>
  run("npx", ["hyperframes", "render", "--quality", quality, "--quiet", "--output", path.resolve(out)], { cwd: projDir, log });

// GitHub từ chối file > 100 MB: nén lại nếu video quá nặng.
export function compress(out, limitMB = 95, log) {
  if (fs.statSync(out).size <= limitMB * 1048576) return null;
  const tmp = out.replace(/\.mp4$/, ".small.mp4");
  for (const crf of [24, 26, 28, 30, 32]) {
    const r = run("ffmpeg", ["-y", "-v", "error", "-i", out, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", tmp], { log });
    if (r.ok && fs.statSync(tmp).size < limitMB * 1048576) break;
  }
  if (!fs.existsSync(tmp)) return null;
  fs.renameSync(tmp, out);
  return (fs.statSync(out).size / 1048576).toFixed(1);
}

export function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", file]);
  try {
    return JSON.parse(r.out).format;
  } catch {
    return {};
  }
}

// Phụ đề .srt lấy từ các clip phụ đề trong index.html (khớp cả bản sửa tay).
const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
export function captionsFromHtml(html) {
  const caps = [];
  const re = /<div\b[^>]*class="[^"]*\bclip cap\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  for (let m; (m = re.exec(html)); ) {
    const tag = m[0].slice(0, m[0].indexOf(">"));
    const start = +(/data-start="([\d.]+)"/.exec(tag) || [])[1];
    const dur = +(/data-duration="([\d.]+)"/.exec(tag) || [])[1];
    const text = decode(m[1]);
    if (text && Number.isFinite(start) && Number.isFinite(dur)) caps.push({ start, end: start + dur, text });
  }
  return caps.sort((a, b) => a.start - b.start);
}
const ts = (t) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
export const toSrt = (caps) => caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n");

// Ảnh thumbnail: một khung lúc cảnh đầu đã hiện đủ (mặc định giây thứ 2.5).
export function thumbnail(video, jpg, at = 2.5, log) {
  return run("ffmpeg", ["-y", "-v", "error", "-ss", String(at), "-i", video, "-frames:v", "1", "-q:v", "2", jpg], { log }).ok;
}
