// Kiểm tra chất lượng dùng chung cho mọi định dạng, chạy từ scripts/video.mjs:
//   - timeline GSAP (scripts/lib/tl-lint.mjs) và nhịp hình: khoảng dài nhất trong mỗi cảnh không có gì đổi
//   - độ to tích hợp (LUFS) + đỉnh thật (dBTP) của file đã render, đo bằng ffmpeg ebur128
//   - contact sheet: một khung giữa mỗi cảnh ghép thành .work/contact.jpg (agent đọc ảnh này thay vì xem cả mp4),
//     kèm checkFrame (viền/dải trống) cho từng khung
// Kết quả gộp vào .work/qa.json.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { lintTimeline, changeTimes } from "./tl-lint.mjs";
import { checkFrame } from "./frame-check.mjs";
import { workDir } from "./paths.mjs";

export const STILL_MAX = 5; // giây — sổ tay: hình phải đổi ít nhất mỗi 3–5 giây

// Nhịp hình theo cảnh từ các mốc tween: [{ id, dur, maxStill }]
export function pacingFromHtml(html, timings) {
  const total = +(/data-duration="([\d.]+)"/.exec(html)?.[1] ?? timings?.duration);
  const { tweens, issues } = lintTimeline(html, { total });
  const times = changeTimes(tweens);
  const scenes = (timings?.scenes || []).map((s) => {
    const inside = times.filter((t) => t >= s.start - 0.05 && t < s.end);
    const marks = [s.start, ...inside, s.end].sort((a, b) => a - b);
    let gap = 0;
    for (let i = 1; i < marks.length; i++) gap = Math.max(gap, marks[i] - marks[i - 1]);
    return { id: s.id, dur: +(s.end - s.start).toFixed(2), maxStill: +gap.toFixed(2), changes: inside.length };
  });
  return { issues, scenes };
}

// Độ to tích hợp và đỉnh thật: { lufs, peak }
export function loudness(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const out = r.stderr || "";
  const sum = out.slice(out.lastIndexOf("Summary:"));
  const lufs = +(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1] ?? NaN);
  const peak = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1] ?? NaN);
  return { lufs, peak };
}

// Một khung giữa mỗi cảnh → contact.jpg (lưới 5 cột), trả về { file, frames: [{ id, t, problems }] }
export function contactSheet(video, timings, dir, { cols = 5, width = 384 } = {}) {
  const tmp = path.join(workDir(dir), "contact");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const frames = [];
  (timings?.scenes || []).forEach((s, i) => {
    const t = +((s.start + s.end) / 2).toFixed(2);
    const f = path.join(tmp, `f${String(i).padStart(3, "0")}.jpg`);
    try {
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "4", f]);
      let problems = [];
      try {
        problems = checkFrame(f);
      } catch {}
      frames.push({ id: s.id, t, problems });
    } catch {}
  });
  if (!frames.length) return null;
  const rows = Math.ceil(frames.length / cols);
  const file = path.join(workDir(dir), "contact.jpg");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", path.join(tmp, "f%03d.jpg"), "-vf", `tile=${cols}x${rows}:padding=6:margin=6:color=white`, "-frames:v", "1", "-q:v", "3", file]);
  return { file, frames };
}

// Tóm tắt một dòng cho màn hình
// Cảnh cuối (thẻ kết, outro) đứng yên có chủ đích: không tính vào nhịp hình và kiểm viền
export const isEndScene = (content, id) => {
  const i = content.scenes.findIndex((s) => s.id === id);
  const v = content.scenes[i]?.visual || {};
  return i === content.scenes.length - 1 || v.type === "outro" || v.cue === "outro_cta";
};

export function pacingNotes(p, max = STILL_MAX, content = null) {
  const notes = [];
  if (p.issues.length) {
    const kinds = [...new Set(p.issues.map((i) => i.msg.replace(/dòng \d+/, "dòng N").replace(/#[\w-]+/, "#…")))];
    notes.push(`⚠ Timeline: ${p.issues.length} vấn đề — ${kinds.slice(0, 3).join("; ")} (.work/qa.json)`);
  }
  const slow = p.scenes.filter((s) => s.maxStill > max && !(content && isEndScene(content, s.id))).sort((a, b) => b.maxStill - a.maxStill);
  if (slow.length) notes.push(`⚠ Nhịp hình: ${slow.length}/${p.scenes.length} cảnh đứng yên > ${max}s (lâu nhất ${slow.slice(0, 3).map((s) => `${s.id} ${s.maxStill}s`).join(", ")}) — thêm at/punch/beats`);
  return notes;
}

export function writeQa(dir, data) {
  const f = path.join(workDir(dir), "qa.json");
  const old = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  fs.writeFileSync(f, JSON.stringify({ ...old, ...data, at: new Date().toISOString() }, null, 1));
}
