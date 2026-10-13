#!/usr/bin/env node
// Dựng composition HyperFrames cho phim kể chuyện: ảnh tĩnh có chuyển động máy quay (Ken Burns),
// đoạn video Veo, chuyển cảnh mờ chồng, phụ đề có tên người nói, giọng đọc và nhạc nền (nếu có).
// Cảnh chưa có media hiện khung giữ chỗ kèm câu lệnh để xem thử nhịp phim trước.
//
// Cách dùng:  node scripts/build-story.mjs stories/<thư mục>/story.json
// Đầu vào:    stories/<thư mục>/media/*, build/<id>/timings.json (nếu chưa có giọng đọc thì tự ước lượng)
// Kết quả:    build/<id>/video-16x9/index.html (hoặc video-9x16 khi aspect là 9:16)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { BRAND } from "./lib/brand.mjs";
import { timeCaptions } from "./lib/captions.mjs";

const storyPath = process.argv[2];
if (!storyPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/build-story.mjs stories/chiec-lo-cua-ba/story.json");
  process.exit(1);
}
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const mediaDir = path.join(path.dirname(storyPath), "media");
const buildDir = path.join("build", story.id);
const vertical = story.aspect === "9:16";
const orientation = vertical ? "9x16" : "16x9";
const W = vertical ? 1080 : 1920;
const H = vertical ? 1920 : 1080;
const XF = 0.6; // thời gian chuyển cảnh mờ chồng
const END_HOLD = 2.5; // giữ màn kết sau câu cuối

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n) => Number(n).toFixed(3);
const has = (file) => fs.existsSync(path.join(mediaDir, file));

// ---------- Mốc thời gian ----------
const timingsPath = path.join(buildDir, "timings.json");
let timings;
if (fs.existsSync(timingsPath) && JSON.parse(fs.readFileSync(timingsPath, "utf8")).source === "story-tts") {
  timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  console.log(`Dùng mốc thời gian từ giọng đọc thật (${timings.duration}s).`);
} else {
  // Chưa có giọng đọc: ước lượng ~3,4 âm tiết/giây (giống build.mjs) để xem thử hình.
  let t = 0.6;
  const scenes = story.scenes.map((s, i) => {
    const speech = s.text.split(/\s+/).length / 3.4;
    const d = Math.max(speech, s.minDuration ?? (s.shot?.mode === "video" ? 5 : 0));
    const out = { id: s.id, start: i === 0 ? 0 : t - 0.25, speechStart: t, speechEnd: t + speech };
    t += d + 0.5;
    return out;
  });
  scenes.forEach((s, i) => (s.end = i === scenes.length - 1 ? t : scenes[i + 1].start));
  timings = { source: "estimate", audio: null, duration: Number(t.toFixed(3)), scenes };
  console.log(`Chưa có giọng đọc — dùng thời lượng ước lượng (${t.toFixed(1)}s), video sẽ không có tiếng.`);
}
const TOTAL = Number((timings.duration + END_HOLD).toFixed(3));

function probeDuration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  const d = Number((r.stdout || "").trim());
  return Number.isFinite(d) && d > 0 ? d : 8;
}

// Chuyển động máy quay trên ảnh tĩnh.
const CAMERA = {
  zoomIn: [{ scale: 1.0 }, { scale: 1.12 }],
  zoomOut: [{ scale: 1.12 }, { scale: 1.0 }],
  panLeft: [{ scale: 1.12, xPercent: 3 }, { scale: 1.12, xPercent: -3 }],
  panRight: [{ scale: 1.12, xPercent: -3 }, { scale: 1.12, xPercent: 3 }],
  panUp: [{ scale: 1.12, yPercent: 3 }, { scale: 1.12, yPercent: -3 }],
  still: [{ scale: 1.02 }, { scale: 1.05 }],
};
const tweenVars = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

// ---------- Ghép composition ----------
const layers = [];
const js = [];
const caps = [];
const media = new Set();
const missing = [];
const n = story.scenes.length;

story.scenes.forEach((s, i) => {
  const tm = timings.scenes[i];
  const start = tm.start;
  const end = i === n - 1 ? TOTAL : timings.scenes[i + 1].start;
  const span = end - start + (i === n - 1 ? 0 : XF); // chồng sang cảnh sau để mờ chuyển
  const z = 10 + i * 3;
  const img = `${s.id}.png`;
  const vid = `${s.id}.mp4`;
  const isVideo = s.shot?.mode === "video";
  const inner = [];

  if (has(img)) {
    media.add(img);
    inner.push(`<img class="still" id="im${i}" src="media/${img}" alt="" />`);
    const [from, to] = CAMERA[s.shot?.camera] || CAMERA.zoomIn;
    js.push(`tl.fromTo("#im${i}", { ${tweenVars(from)} }, { ${tweenVars(to)}, duration: ${f(span)}, ease: "none" }, ${f(start)});`);
  } else if (!(isVideo && has(vid))) {
    missing.push(img);
    inner.push(`<div class="ph"><div class="ph-id" data-layout-allow-overlap data-layout-allow-occlusion>${esc(s.id)} · ${isVideo ? "🎬 video" : "🖼 ảnh"} · thiếu media/${esc(img)}</div>
      <div class="ph-text" data-layout-allow-overlap data-layout-allow-occlusion>${esc(s.shot?.prompt || "")}</div></div>`);
  }
  if (s.title) {
    inner.push(`<div class="title-card" id="tt${i}"><h1>${esc(s.title)}</h1><div class="title-sub">${esc(story.brand || "")}</div></div>`);
    js.push(`tl.fromTo("#tt${i}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, ${f(start + 0.4)});`);
    js.push(`tl.to("#tt${i}", { opacity: 0, duration: 0.6, ease: "power2.in" }, ${f(end - 0.9)});`);
  }
  if (s.keyword) {
    inner.push(`<div class="keyword" id="kw${i}">${esc(s.keyword)}</div>`);
    js.push(`tl.fromTo("#kw${i}", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, ${f(tm.speechEnd - 1.6)});`);
  }
  if (s.end) {
    inner.push(`<div class="end-card" id="ec${i}">
      <div class="end-brand"><b>DSC</b> Academy</div>
      <h2>${esc(s.end.headline)}</h2>
      <div class="end-cta">${esc(s.end.cta || "Đọc bài viết bên dưới")}</div>
      <p class="end-disc">${esc(s.end.disclaimer)}</p></div>`);
    const at = Math.max(start + 0.8, tm.speechEnd - 2);
    js.push(`tl.fromTo("#ec${i}", { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, ${f(at)});`);
    if (story.brand) js.push(`tl.to("#brand", { opacity: 0, duration: 0.5 }, ${f(at)});`);
  }
  layers.push(
    `<section class="clip scene" id="scene-${i}" style="z-index:${z}" data-start="${f(start)}" data-duration="${f(span)}" data-track-index="1">${inner.join("\n        ")}</section>`
  );
  js.push(`tl.fromTo("#scene-${i}", { opacity: 0 }, { opacity: 1, duration: ${i === 0 ? 0.9 : XF}, ease: "power1.inOut" }, ${f(start)});`);

  if (isVideo) {
    if (has(vid)) {
      media.add(vid);
      const vdur = probeDuration(path.join(mediaDir, vid)) - (s.shot.trimStart || 0);
      const vspan = Math.min(span, vdur);
      if (vdur < end - start) console.warn(`${s.id}: video dài ${vdur.toFixed(1)}s, cảnh dài ${(end - start).toFixed(1)}s — phần còn lại hiện ảnh ${img}.`);
      const audio = s.shot.keepAudio ? `data-has-audio="true" data-volume="${s.shot.volume ?? 0.3}"` : "muted";
      layers.push(
        `<video class="clip vid" id="vd${i}" style="z-index:${z + 1}" src="media/${vid}" data-start="${f(start)}" data-duration="${f(vspan)}" data-media-start="${f(s.shot.trimStart || 0)}" ${audio} playsinline data-track-index="4"></video>`
      );
      js.push(`tl.fromTo("#vd${i}", { opacity: 0 }, { opacity: 1, duration: ${XF}, ease: "power1.inOut" }, ${f(start)});`);
      if (vspan < span) js.push(`tl.to("#vd${i}", { opacity: 0, duration: 0.4, ease: "power1.in" }, ${f(start + vspan - 0.4)});`);
    } else missing.push(vid);
  }

  // Phụ đề: chỉ chạy trong lúc đang đọc; câu thoại có tên người nói.
  const speaker = s.speaker ? story.characters?.[s.speaker]?.name || s.speaker : null;
  timeCaptions(s.text, tm.speechStart, tm.speechEnd + 0.25, vertical ? 30 : 56).forEach((c, k) => {
    const who = speaker && k === 0 ? `<b>${esc(speaker)}</b> ` : "";
    caps.push(
      `<div class="clip cap" data-start="${f(c.start)}" data-duration="${f(c.end - c.start)}" data-track-index="3"><span class="cap-text${speaker ? " talk" : ""}">${who}${esc(c.text)}</span></div>`
    );
  });
});

const musicFile = ["music.mp3", "music.m4a", "music.wav"].find(has);
if (musicFile) media.add(musicFile);
const audio = [
  timings.audio ? `<audio id="voiceover" src="${timings.audio}" data-start="0" data-duration="${f(timings.duration)}" data-track-index="2" data-volume="1"></audio>` : "",
  musicFile
    ? `<audio id="music" src="media/${musicFile}" data-start="0" data-duration="${f(TOTAL)}" data-track-index="5" data-volume="${story.musicVolume ?? 0.12}" data-fade-in="1.5" data-fade-out="2.5"></audio>`
    : "",
].join("\n      ");

const A = BRAND;
const css = `
@font-face { font-family: "Inter"; src: url("fonts/Inter-Regular.otf") format("opentype"); font-weight: 400; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-SemiBold.otf") format("opentype"); font-weight: 600; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-ExtraBold.otf") format("opentype"); font-weight: 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Inter", sans-serif; color: #fff; background: #000; }
.scene { position: absolute; inset: 0; overflow: hidden; background: #000; }
.still { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: 50% 50%; }
.vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ph { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 28px; padding: ${vertical ? "0 80px" : "0 220px"};
  background: radial-gradient(circle at 30% 30%, #26304f, #0b1020 70%); }
.ph-id { font-size: 34px; font-weight: 600; color: ${A.accent}; }
.ph-text { font-size: ${vertical ? 40 : 38}px; line-height: 1.45; color: #c9d0e3; max-width: 1400px; }
.title-card { position: absolute; left: 0; right: 0; top: ${vertical ? "34%" : "38%"}; text-align: center; text-shadow: 0 4px 30px rgba(0,0,0,0.6); }
.title-card h1 { font-size: ${vertical ? 120 : 132}px; font-weight: 800; letter-spacing: -0.02em; }
.title-sub { margin-top: 18px; font-size: 34px; font-weight: 600; color: ${A.accent}; letter-spacing: 0.08em; text-transform: uppercase; }
.keyword { position: absolute; left: 50%; top: ${vertical ? "20%" : "14%"}; transform: translateX(-50%); font-size: ${vertical ? 84 : 92}px; font-weight: 800;
  color: ${A.ink}; background: ${A.accent}; padding: 12px 48px; border-radius: 26px; box-shadow: 0 12px 40px rgba(0,0,0,0.35); }
.end-card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; text-align: center;
  background: linear-gradient(180deg, rgba(11,18,55,0.55), rgba(11,18,55,0.92)); padding: 0 120px; }
.end-brand { font-size: 56px; font-weight: 800; } .end-brand b { background: #fff; color: ${A.ink}; padding: 2px 18px; border-radius: 14px; }
.end-card h2 { font-size: ${vertical ? 96 : 104}px; font-weight: 800; letter-spacing: -0.02em; }
.end-cta { font-size: 44px; font-weight: 800; color: ${A.ink}; background: ${A.accent}; padding: 20px 54px; border-radius: 60px; }
.end-disc { font-size: 26px; color: #c9d0e3; max-width: 1100px; line-height: 1.4; }
.brand { position: absolute; z-index: 900; left: ${vertical ? 56 : 60}px; top: ${vertical ? 80 : 44}px; font-size: 26px; font-weight: 600; opacity: 0.85; text-shadow: 0 2px 10px rgba(0,0,0,0.6); }
.brand b { background: rgba(11,18,55,0.85); color: ${A.accent}; padding: 4px 10px; border-radius: 8px; font-weight: 800; }
.cap { position: absolute; z-index: 1000; left: 0; right: 0; ${vertical ? "bottom: 360px;" : "bottom: 64px;"} display: flex; justify-content: center; }
.cap-text { display: inline-block; max-width: ${vertical ? 960 : 1500}px; font-size: ${vertical ? 50 : 46}px; font-weight: 600; line-height: 1.3; text-align: center;
  padding: 10px 26px; border-radius: 14px; background: rgba(0,0,0,0.45);
  text-shadow: 0 2px 6px rgba(0,0,0,0.9); }
.cap-text.talk { color: #fff6d6; }
.cap-text b { color: ${A.accent}; font-weight: 800; margin-right: 6px; }
`;

const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(story.title)} · ${orientation}</title>
    <script src="vendor/gsap.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(TOTAL)}" data-width="${W}" data-height="${H}">
      ${story.brand ? `<div class="brand" id="brand"><b>DSC</b> Academy</div>` : ""}
      ${layers.join("\n      ")}
      ${caps.join("\n      ")}
      ${audio}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${js.join("\n      ")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

const dir = path.join(buildDir, `video-${orientation}`);
fs.rmSync(path.join(dir, "media"), { recursive: true, force: true });
for (const sub of ["fonts", "vendor", "media"]) fs.mkdirSync(path.join(dir, sub), { recursive: true });
for (const fnt of fs.readdirSync("assets/fonts")) fs.copyFileSync(path.join("assets/fonts", fnt), path.join(dir, "fonts", fnt));
fs.copyFileSync("assets/vendor/gsap.min.js", path.join(dir, "vendor", "gsap.min.js"));
for (const m of media) fs.copyFileSync(path.join(mediaDir, m), path.join(dir, "media", m));
if (timings.audio) fs.copyFileSync(path.join(buildDir, timings.audio), path.join(dir, timings.audio));
fs.writeFileSync(path.join(dir, "index.html"), html);
console.log(`Đã tạo ${dir}/index.html — ${TOTAL}s, ${media.size} file media.`);
if (missing.length) console.log(`Cảnh dùng khung giữ chỗ (thiếu ${missing.join(", ")}).`);
