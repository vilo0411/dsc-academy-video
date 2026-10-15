#!/usr/bin/env node
// Một lệnh cho cả luồng: kiểm tra kịch bản → giọng đọc → (nhạc) → dựng → render → phụ đề .srt + thumbnail.
//
// Cách dùng:  npm run video -- <video> [--draft] [--api] [--no-voice] [--build-only] [--open]
//   <video>       t01 | t01-vi-mo-la-gi | essay-lam-phat-ho-so | videos/<id>
//   --draft       render nhanh chất lượng thấp → videos/<id>/draft.mp4
//   --api         cho phép gọi API trả phí/giới hạn (giọng đọc, nhạc Lyria) khi lời hoặc nhạc đã đổi
//   --no-voice    dựng không tiếng nếu chưa có giọng (xem thử hình)
//   --build-only  chỉ dựng dự án HyperFrames (videos/<id>/project/), không render
//   --open        mở video sau khi xong
//   --audio-only  bản nghe để duyệt lời + nhạc trước khi dựng hình: "<Tên> (nghe thử).mp3", không render
//   --batch a,b,c chạy lần lượt nhiều video (cùng cờ), video lỗi không dừng cả lô; tóm tắt ở videos/.batch.json
// Giọng/nhạc thiếu thì tự lấy bản GitHub đã tạo (nhánh renders) trước khi tính tới API.
// Log đầy đủ: videos/<id>/.work/log.txt — màn hình chỉ in tóm tắt.
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./lib/env.mjs";
import { resolveVideo, projectDir, workDir, finalName, kindOf, orientationsFor } from "./lib/paths.mjs";
import { makeThumbs } from "./lib/thumbs.mjs";
import { run, tail, voiceState, stampVoice, scriptFor, ttsFor, render, captionsFromHtml, toSrt, thumbnail, probe } from "./lib/pipeline.mjs";
import { pullVideo } from "./lib/renders.mjs";
import { lintScript, printLint } from "./lint-script.mjs";
import { pacingFromHtml, pacingNotes, loudness, contactSheet, writeQa, isEndScene } from "./lib/qa.mjs";
import { publishNotes } from "./lib/publish.mjs";
import { estimateTimings } from "./lib/words.mjs";
import { spawnSync } from "node:child_process";

loadEnv();
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);

// Chạy theo lô (học từ MoneyPrinterTurbo --batch-file): mỗi video một tiến trình con, lỗi không dừng lô.
const bi = args.indexOf("--batch");
if (bi >= 0) {
  const ids = (args[bi + 1] || "").split(",").filter(Boolean);
  const rest = args.filter((a, i) => i !== bi && i !== bi + 1);
  const results = [];
  for (const vid of ids) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [process.argv[1], vid, ...rest], { stdio: "inherit" });
    results.push({ id: vid, code: r.status, ok: r.status === 0, seconds: Math.round((Date.now() - t0) / 1000) });
  }
  fs.writeFileSync("videos/.batch.json", JSON.stringify({ at: new Date().toISOString(), args: rest, results }, null, 1));
  console.log(`\nLô ${ids.length} video: ${results.filter((x) => x.ok).length} xong, ${results.filter((x) => x.code === 2).length} cần API, ${results.filter((x) => !x.ok && x.code !== 2).length} lỗi (videos/.batch.json)`);
  process.exit(results.every((x) => x.ok) ? 0 : 1);
}
let v;
try {
  v = resolveVideo(args.find((a) => !a.startsWith("--")));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const { id, dir, script, content } = v;
const kind = kindOf(content);
const log = path.join(workDir(dir), "log.txt");
fs.writeFileSync(log, `# ${new Date().toISOString()} ${args.join(" ")}\n`);
const node = (s, ...a) => run(process.execPath, [s, script, ...a], { log });
const fail = (msg, r) => {
  console.error(`✗ ${msg}${r ? "\n" + tail(r.out, 1500) : ""}\n  Log: ${log}`);
  process.exit(1);
};
const notes = [];

// 1. Kịch bản
const lint = lintScript(content);
if (lint.errors.length || lint.warns.length) printLint(id, lint);
if (lint.errors.length) process.exit(1);
if (kind === "story") node("scripts/story-prompts.mjs");

// 2. Giọng đọc
let voice = voiceState(dir, content);
if (voice !== "ok") {
  const got = pullVideo(content);
  if (got.length) notes.push(`lấy từ nhánh renders: ${got.join(", ")}`);
  voice = voiceState(dir, content);
}
if (voice !== "ok" && content.approved !== false) {
  const chars = content.scenes.reduce((n, s) => n + (s.text || "").length, 0);
  const provider = content.voice?.provider || "gemini-api";
  if (flag("--api")) {
    const r = node(ttsFor(content));
    if (!r.ok) fail("Tạo giọng đọc lỗi", r);
    stampVoice(dir, content);
    notes.push(`giọng mới (${provider}, ${chars} ký tự)`);
  } else if (!flag("--no-voice")) {
    const paid = provider === "cloud-gemini" ? "trả phí theo token" : provider === "cloud-chirp" ? "miễn phí 1 triệu ký tự/tháng" : "free tier Gemini";
    console.log(`Cần tạo giọng đọc (${voice === "stale" ? "lời đã đổi" : "chưa có"}): ${chars} ký tự, ${provider} — ${paid}.`);
    console.log(`Chạy lại với --api để tạo, hoặc --no-voice để xem hình không tiếng.`);
    process.exit(2);
  } else notes.push("không tiếng (chưa có giọng)");
}

// 3. Nhạc nền (essay, toon)
if ((kind === "essay" || kind === "toon") && content.music?.prompt) {
  const has = fs.existsSync(path.join(dir, "music.wav"));
  if (flag("--api") || has) {
    const r = node("scripts/music.mjs");
    if (!r.ok) notes.push("⚠ nhạc nền lỗi, dựng không nhạc");
    else if (/Đã tạo nhạc/.test(r.out)) notes.push("nhạc nền mới");
  } else notes.push("chưa có nhạc nền (thêm --api để tạo bằng Lyria)");
}

// 4. Dựng
const b = node(scriptFor(content));
if (!b.ok) fail("Dựng lỗi", b);
for (const line of b.out.split("\n")) if (/^(⚠|✎)/.test(line)) notes.push(line.slice(0, 200));
if (fs.existsSync(path.join(dir, "credits.txt"))) notes.push(`⚑ ghi công âm thanh: dán ${path.join(dir, "credits.txt")} vào mô tả video`);
const orientations = orientationsFor(content);
// QA timeline + nhịp hình (mọi định dạng): tl-lint.mjs theo quy tắc GSAP Skills, khoảng đứng yên dài nhất mỗi cảnh
const timingsFile = path.join(dir, "timings.json");
const timingsNow = fs.existsSync(timingsFile) ? JSON.parse(fs.readFileSync(timingsFile, "utf8")) : estimateTimings(content);
const qa = {};
for (const o of orientations) {
  const html = path.join(projectDir(dir, o), "index.html");
  if (!fs.existsSync(html) || !timingsNow) continue;
  const p = pacingFromHtml(fs.readFileSync(html, "utf8"), timingsNow);
  qa[o] = { timeline: p.issues, pacing: p.scenes };
  if (o === orientations[0]) notes.push(...pacingNotes(p, undefined, content));
}
if (flag("--audio-only") || content.audioOnly) {
  const mix = ["mix.wav", "audio.wav"].map((f) => path.join(projectDir(dir, orientations[0]), f)).find((f) => fs.existsSync(f));
  if (!mix) fail("Không có bản trộn âm thanh (cần giọng đọc; nhạc/tiếng động tuỳ kịch bản)");
  const mp3 = path.join(dir, `${finalName(content)} (nghe thử).mp3`);
  const r = run("ffmpeg", ["-y", "-v", "error", "-i", mix, "-c:a", "libmp3lame", "-b:a", "160k", mp3], { log });
  if (!r.ok) fail("Xuất mp3 lỗi", r);
  const loud = loudness(mp3);
  console.log(`✓ ${id} (bản nghe)\n  ${mp3}\n  Âm lượng: ${loud.lufs} LUFS, đỉnh ${loud.peak} dBTP`);
  for (const n of notes) console.log(`  ${n}`);
  process.exit(0);
}
if (flag("--build-only")) {
  writeQa(dir, qa);
  console.log(`✓ Đã dựng ${orientations.map((o) => projectDir(dir, o)).join(", ")}`);
  for (const n of notes) console.log(`  ${n}`);
  process.exit(0);
}

// Thumbnail: "thumbnailAt" (giây) trong kịch bản, không thì giữa cảnh tiêu đề đầu tiên, không thì giây 2,5.
function thumbAt() {
  if (content.thumbnailAt != null) return content.thumbnailAt;
  try {
    const t = JSON.parse(fs.readFileSync(path.join(dir, "timings.json"), "utf8"));
    const sc = content.scenes.find((s) => s.visual?.type === "title" || s.visual?.cue === "hook_2tier");
    const tm = sc && t.scenes.find((x) => x.id === sc.id);
    if (tm) return +((tm.start + tm.end) / 2).toFixed(2);
  } catch {}
  return 2.5;
}

// 5. Kiểm tra + render + phụ đề + thumbnail
const outputs = [];
for (const o of orientations) {
  const proj = projectDir(dir, o);
  const check = run("npx", ["hyperframes", "check"], { cwd: proj, log });
  const errs = +(/(\d+) error\(s\)/.exec(check.out) || [0, 0])[1];
  if (errs) notes.push(`⚠ hyperframes check: ${errs} lỗi (xem log)`);
  const name = finalName(content, o);
  const out = path.join(dir, flag("--draft") ? (o === "16x9" ? "draft.mp4" : `draft-${o}.mp4`) : `${name}.mp4`);
  const r = render(proj, out, flag("--draft") ? "draft" : "delivery", log);
  if (!r.ok || !fs.existsSync(out)) fail(`Render ${o} lỗi`, r);
  const caps = captionsFromHtml(fs.readFileSync(path.join(proj, "index.html"), "utf8"));
  if (caps.length) fs.writeFileSync(path.join(dir, `${name}.srt`), toSrt(caps));
  if (!flag("--draft")) {
    thumbnail(out, path.join(dir, `${name}.jpg`), thumbAt(), log);
    // Ba phương án ảnh bìa (câu hỏi / con số / so sánh) từ "thumbnails" trong kịch bản
    if (content.thumbnails?.length) {
      const th = makeThumbs(content, dir, name, path.join(dir, `${name}.jpg`), log);
      if (th.length) notes.push(`ảnh bìa: ${th.join(", ")}`);
      else notes.push("⚠ tạo ảnh bìa lỗi (xem log)");
    }
  }
  // Độ to (LUFS, đỉnh thật) và contact sheet một khung mỗi cảnh
  const loud = loudness(out);
  if (!isNaN(loud.lufs) && timingsNow.audio) {
    const target = content.loudness ?? -16;
    notes.push(`${Math.abs(loud.lufs - target) > 1.5 || loud.peak > -0.5 ? "⚠ " : ""}Âm lượng ${o}: ${loud.lufs} LUFS (mục tiêu ${target}), đỉnh ${loud.peak} dBTP`);
    (qa[o] ||= {}).loudness = loud;
  }
  if (timingsNow) {
    const sheet = contactSheet(out, timingsNow, dir);
    if (sheet) {
      notes.push(`contact sheet: ${sheet.file}`);
      const bad = sheet.frames.filter((f) => f.problems.length && !isEndScene(content, f.id));
      if (bad.length) notes.push(`⚠ Khung có viền/dải trống: ${bad.map((f) => f.id).join(", ")}`);
      (qa[o] ||= {}).frames = sheet.frames;
    }
  }
  if (!flag("--draft") && o === orientations[0]) {
    const desc = publishNotes(content, dir, name, timingsNow);
    if (desc) notes.push(`mô tả + chương YouTube: ${desc}`);
  }
  const p = probe(out);
  outputs.push(`${out}  (${(+p.duration || 0).toFixed(1)}s, ${((+p.size || 0) / 1048576).toFixed(1)} MB${caps.length ? `, ${caps.length} dòng phụ đề` : ""}, render ${r.seconds}s)`);
}
writeQa(dir, qa);
console.log(`✓ ${id}`);
for (const o of outputs) console.log(`  ${o}`);
for (const n of notes) console.log(`  ${n}`);
if (flag("--open")) run("open", [outputs[0].split("  (")[0]]);
