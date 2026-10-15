#!/usr/bin/env node
// Dựng trang Three.js cho video 3D từ storyboard + kịch bản + mốc thời gian giọng đọc.
//
// Cách dùng:  node lab/build3d.mjs lab/content3d/t04-lai-suat-va-chinh-sach-tien-te.json
//             (hoặc chỉ tên file trong lab/content3d/)
// Đầu vào:    lab/content3d/<id>.json (storyboard: bối cảnh, nhịp máy quay, chữ trên màn hình, file mã của tập)
//             videos/<id>/script.json (lời thoại, tư thế An), videos/<id>/timings.json + voice.wav (nếu đã có giọng đọc)
// Kết quả:    lab/build/<id>/video3d/index.html — xem trước: npm run lab:preview3d rồi mở đường dẫn được in ra
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { page3d } from "./three/page.mjs";
import { timeCaptions } from "../scripts/lib/captions.mjs";

let p = process.argv[2];
if (!p) {
  console.error("Thiếu file. Ví dụ: node lab/build3d.mjs lab/content3d/t04-lai-suat-va-chinh-sach-tien-te.json");
  process.exit(1);
}
if (!fs.existsSync(p)) p = path.join("lab/content3d", path.basename(p));
const story = JSON.parse(fs.readFileSync(p, "utf8"));
const content = JSON.parse(fs.readFileSync(story.content, "utf8"));
const id = content.id;
// Giọng/mốc thời gian lấy từ videos/<id>/ (bản 2D); bản dựng 3D nằm ở lab/build/<id>/
const buildDir = path.join("videos", id);
// "only": dựng riêng vài cảnh làm đoạn chèn vào bản 2D (mốc thời gian dời về 0, cắt đúng đoạn giọng đọc)
const outDir = path.join("lab/build", id, story.name || "video3d");
fs.mkdirSync(outDir, { recursive: true });

// Mốc thời gian: giọng thật nếu có, không thì ước lượng như build.mjs
const timingsPath = path.join(buildDir, "timings.json");
let timings;
if (fs.existsSync(timingsPath)) {
  timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  console.log(`Dùng mốc thời gian từ giọng đọc thật (${timings.duration}s).`);
} else {
  let t = 0;
  const scenes = content.scenes.map((s) => {
    const d = s.text.split(/\s+/).length / 4.2 + 0.4; // giọng Gemini thực tế đọc khoảng 4,2 âm tiết/giây
    const o = { id: s.id, start: t, end: t + d };
    t += d;
    return o;
  });
  timings = { audio: null, duration: t, scenes };
  console.log(`Chưa có giọng đọc — dùng thời lượng ước lượng (${t.toFixed(1)}s), video sẽ không có tiếng.`);
}
const OUTRO_HOLD = 1.5;
let duration = Number((timings.duration + OUTRO_HOLD).toFixed(3));
let offset = 0;
let list = content.scenes;
if (story.only) {
  list = content.scenes.filter((s) => story.only.includes(s.id));
  const tms = list.map((s) => timings.scenes.find((x) => x.id === s.id));
  offset = tms[0].start;
  duration = Number((tms.at(-1).end - offset).toFixed(3));
}

const missing = list.filter((s) => !story.scenes[s.id]).map((s) => s.id);
if (missing.length) console.warn(`⚠ Storyboard thiếu cảnh: ${missing.join(", ")}`);

const scenes = list.map((s, i) => {
  const tm0 = timings.scenes.find((x) => x.id === s.id);
  const tm = { start: tm0.start - offset, end: tm0.end - offset };
  const end = i === list.length - 1 ? duration : tm.end;
  return {
    id: s.id,
    start: tm.start,
    end,
    pose: s.visual.pose || "idle",
    expr: s.visual.face || (s.visual.type === "calc" ? undefined : s.visual.expr),
    emote: s.visual.emote,
    visual: s.visual,
    story: story.scenes[s.id] || {},
    captions: timeCaptions(s.text, tm.start, tm.end, story.captionChars || 52),
  };
});

const audio = timings.audio && fs.existsSync(path.join(buildDir, timings.audio)) ? timings.audio : null;
if (audio && story.only) {
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(offset), "-t", String(duration), "-i", path.join(buildDir, audio), path.join(outDir, "voice.wav")]);
  if (r.status !== 0) throw new Error("Không cắt được giọng đọc");
} else if (audio) fs.copyFileSync(path.join(buildDir, audio), path.join(outDir, "voice.wav"));

const data = { id, offset, title: content.title, series: content.series, episode: content.episode, duration, audio: audio ? "voice.wav" : null, scenes };
fs.writeFileSync(path.join(outDir, "index.html"), page3d({ title: `${content.title} (3D)`, entry: story.entry, data }));
console.log(`Đã tạo ${outDir}/index.html (${duration}s, ${scenes.length} cảnh${audio ? ", có giọng đọc" : ""}).`);
console.log(`Xem trước: npm run lab:preview3d → http://localhost:5173/${outDir}/   ·   Render: npm run lab:render3d -- ${p}`);
