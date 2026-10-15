#!/usr/bin/env node
// Dựng composition HyperFrames (16:9 và 9:16) từ kịch bản + mốc thời gian giọng đọc.
//
// Cách dùng:  node scripts/build.mjs videos/t01-vi-mo-la-gi/script.json
// Đầu vào:    videos/<id>/script.json, videos/<id>/timings.json (nếu chưa có giọng đọc thì tự ước lượng)
// Kết quả:    videos/<id>/project/index.html, videos/<id>/project-9x16/index.html

import fs from "node:fs";
import path from "node:path";
import { videoDir, projectDir } from "./lib/paths.mjs";
import { figureSVG, resolveLook, poseTween, breathe, walkIn, blinks } from "./lib/figure.mjs";
import { BRAND } from "./lib/brand.mjs";
import { renderScene, seriesCSS } from "./lib/scenes-basic.mjs";
import { chunkCaption } from "./lib/captions.mjs";
import { writeIndex } from "./lib/edits.mjs";
import { synthSfx, mixdown, hasFfmpeg, applySfxSet, setLibResolver, mixOpts } from "./lib/sound.mjs";
import { resolveAudio, writeCredits, findTrack, trackFile } from "./lib/audio-lib.mjs";

const contentPath = process.argv[2];
if (!contentPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/build.mjs videos/t01-vi-mo-la-gi/script.json");
  process.exit(1);
}
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const buildDir = videoDir(content.id);
fs.mkdirSync(buildDir, { recursive: true });

// ---------- Mốc thời gian ----------
const timingsPath = path.join(buildDir, "timings.json");
let timings;
if (fs.existsSync(timingsPath)) {
  timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  console.log(`Dùng mốc thời gian từ giọng đọc thật (${timings.duration}s).`);
} else {
  // Chưa có giọng đọc: ước lượng ~3,8 âm tiết/giây + 0,6s nghỉ giữa cảnh (để xem thử hình).
  let t = 0;
  const scenes = content.scenes.map((s) => {
    const syl = s.text.split(/\s+/).length;
    const d = syl / 3.4 + 0.5;
    const out = { id: s.id, start: Number(t.toFixed(3)), end: Number((t + d).toFixed(3)) };
    t += d;
    return out;
  });
  timings = { source: "estimate", audio: null, duration: Number(t.toFixed(3)), scenes };
  console.log(`Chưa có giọng đọc — dùng thời lượng ước lượng (${t.toFixed(1)}s), video sẽ không có tiếng.`);
}
const OUTRO_HOLD = 1.5;
const TOTAL = Number((timings.duration + OUTRO_HOLD).toFixed(3));

// ---------- Âm thanh thư viện (tuỳ chọn) ----------
// Chỉ khi kịch bản có music / ambience / stingers / sfxSet: trộn giọng + nhạc nền + tiếng động thành mix.wav.
// Không có khoá nào thì giữ nguyên track giọng như trước.
let MIX = null;
const wantsMix = content.music || content.ambience || content.stingers || content.sfxSet || content.scenes.some((s) => s.stinger);
if (wantsMix && hasFfmpeg()) {
  setLibResolver((id) => trackFile(findTrack(id)));
  const ev = [];
  content.scenes.forEach((s, i) => {
    const tm = timings.scenes[i];
    if (!tm) return;
    const type = s.visual?.type;
    if (i > 0) ev.push({ t: Math.max(0, tm.start - 0.2), kind: "whoosh", gain: 0.6 });
    if (type === "quiz") ev.push({ t: tm.start + 0.35, kind: "pop" });
    if (type === "outro") ev.push({ t: tm.start + 0.2, kind: "ding", gain: 0.8 });
    if (["calc", "numbers", "stack"].includes(type)) ev.push({ t: tm.start + 0.5, kind: "tap", gain: 0.8 });
  });
  const sfx = applySfxSet(ev, content.sfxSet || "none");
  const sfxPath = path.join(buildDir, "sfx.wav");
  fs.writeFileSync(sfxPath, synthSfx(sfx, TOTAL));
  const lib = resolveAudio(content, timings, TOTAL, null);
  writeCredits(buildDir, lib.used);
  MIX = "mix.wav";
  mixdown({
    voice: timings.audio ? path.join(buildDir, timings.audio) : null,
    sfx: sfxPath,
    music: lib.music,
    musicVol: lib.musicVol ?? content.music?.volume ?? 1.5,
    sfxVol: content.sfxVolume ?? 1,
    duck: content.duck || {},
    beds: lib.beds,
    hits: lib.hits,
    total: TOTAL,
    ...mixOpts(content, timings),
    out: path.join(buildDir, MIX),
  });
  console.log(`Âm thanh: nhạc nền ${lib.music ? path.basename(lib.music) : "không"}, ${lib.beds.length} ambience, ${lib.hits.length} stinger, ${sfx.length} tiếng động${content.sfxSet ? ` (bộ ${content.sfxSet})` : ""}.`);
} else if (wantsMix) console.log("⚠ Không có ffmpeg — bỏ qua nhạc nền/tiếng động, chỉ dùng giọng.");

// ---------- Tiện ích ----------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n) => Number(n).toFixed(3);

// ---------- Ghép composition ----------
function build(orientation) {
  const vertical = orientation === "9x16";
  const W = vertical ? 1080 : 1920;
  const H = vertical ? 1920 : 1080;
  const o = { vertical };
  const A = BRAND;
  const capMax = vertical ? 26 : 46;

  const sections = [];
  const js = [];
  const caps = [];
  content.scenes.forEach((scene, i) => {
    const tm = timings.scenes[i];
    const start = tm.start;
    const end = i === content.scenes.length - 1 ? TOTAL : timings.scenes[i + 1].start;
    const dur = end - start;
    const r = renderScene(scene, i, { ...o, content });
    sections.push(
      `<section id="scene-${i}" class="clip scene" data-start="${f(start)}" data-duration="${f(dur)}" data-track-index="1"><div class="panel" id="panel-${i}">${r.html}</div></section>`
    );
    js.push(`// ${scene.id}`);
    js.push(...r.js(start, tm.end - tm.start));
    // chuyển cảnh: nội dung cũ mờ dần trước khi cảnh mới vào
    if (i < content.scenes.length - 1) {
      js.push(`tl.to("#panel-${i}", { opacity: 0, y: -24, duration: 0.3, ease: "power2.in" }, ${f(end - 0.3)});`);
    }
    let pose = scene.visual.pose || "idle";
    if (vertical && pose === "point") pose = "pointUp";
    js.push(...poseTween(pose, Math.max(i === 0 ? 0.7 : 0, start - 0.05), { expr: scene.visual.face || (scene.visual.type === "calc" ? undefined : scene.visual.expr), emote: scene.visual.emote, end }));

    // phụ đề: chia đoạn theo số ký tự trong khoảng thời gian đọc của cảnh
    const chunks = chunkCaption(scene.text, capMax);
    const speechDur = tm.end - tm.start - 0.25;
    const totalChars = chunks.reduce((s, c) => s + c.length, 0);
    let ct = tm.start;
    chunks.forEach((c, k) => {
      const cd = Math.max(0.6, (c.length / totalChars) * speechDur);
      caps.push(
        `<div class="clip cap" data-start="${f(ct)}" data-duration="${f(k === chunks.length - 1 ? tm.end - ct : cd)}" data-track-index="3"><span class="cap-text">${esc(c)}</span></div>`
      );
      ct += cd;
    });
  });
  js.push(...breathe(TOTAL), ...walkIn(), ...blinks(TOTAL));
  js.unshift(`tl.fromTo("#fig-wrap", { opacity: 0, x: ${vertical ? 0 : -80}, y: ${vertical ? 80 : 0} }, { opacity: 1, x: 0, y: 0, duration: 0.7, ease: "power3.out" }, 0);`);

  const audio = MIX
    ? `<audio id="mix" src="${MIX}" data-start="0" data-duration="${f(TOTAL)}" data-track-index="2" data-volume="1"></audio>`
    : timings.audio
    ? `<audio id="voiceover" src="${timings.audio}" data-start="0" data-duration="${f(timings.duration)}" data-track-index="2" data-volume="1"></audio>`
    : "";

  const css = seriesCSS({ vertical, W, H });

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(content.title)} · ${orientation}</title>
    <script src="vendor/gsap.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(TOTAL)}" data-width="${W}" data-height="${H}">
      <div class="brand"><b>DSC</b> Academy <i>· ${content.episode ? `Bài ${content.episode}/12 · ` : ""}${esc(content.title)}</i></div>
      <div id="fig-wrap">${figureSVG({ ...A, look: resolveLook(content.character, content.look) })}</div>
      ${sections.join("\n      ")}
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
}

for (const orientation of (process.env.ORIENTATIONS || "16x9").split(",")) {
  const dir = projectDir(buildDir, orientation);
  fs.mkdirSync(path.join(dir, "fonts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "vendor"), { recursive: true });
  for (const fnt of fs.readdirSync("assets/fonts")) fs.copyFileSync(path.join("assets/fonts", fnt), path.join(dir, "fonts", fnt));
  fs.copyFileSync("assets/vendor/gsap.min.js", path.join(dir, "vendor", "gsap.min.js"));
  for (const a of MIX ? [MIX] : timings.audio ? [timings.audio] : []) fs.copyFileSync(path.join(buildDir, a), path.join(dir, a));
  writeIndex(content.id, orientation, dir, build(orientation));
  console.log(`Đã tạo ${dir}/index.html`);
}
console.log(`Tổng thời lượng: ${TOTAL}s. Bước tiếp theo: npm run video -- ${content.id}`);
