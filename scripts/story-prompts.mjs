#!/usr/bin/env node
// Sinh bảng phân cảnh (SHOTLIST.md) cho phim kể chuyện: câu lệnh tạo hình cho Nano Banana và Flow (Veo),
// kèm tên file cần có trong media/. Chạy lại bất cứ lúc nào để xem còn thiếu file nào.
//
// Cách dùng:  node scripts/story-prompts.mjs stories/<thư mục>/story.json
// Kết quả:    stories/<thư mục>/SHOTLIST.md

import fs from "node:fs";
import path from "node:path";
import { shots } from "./lib/story-shots.mjs";

const storyPath = process.argv[2];
if (!storyPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/story-prompts.mjs stories/chiec-lo-cua-ba/story.json");
  process.exit(1);
}
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const dir = path.dirname(storyPath);
const mediaDir = path.join(dir, "media");
fs.mkdirSync(mediaDir, { recursive: true });

const has = (f) => fs.existsSync(path.join(mediaDir, f));
const mark = (f) => (has(f) ? `✅ \`media/${f}\`` : `⬜ \`media/${f}\``);
const chars = story.characters || {};
const { images, videos, refs } = shots(story);
const charImages = images.filter((im) => im.file.startsWith("char-"));
const frameOf = (id) => images.find((im) => im.file === `${id}.png`);

const lines = [];
const out = (s = "") => lines.push(s);

out(`# ${story.title} · bảng phân cảnh`);
out();
out(`> ${story.logline || ""}`);
out();
out("**Ảnh (nhân vật + khung hình):** tạo tự động bằng API, có báo chi phí trước khi chạy:");
out();
out("```bash");
out(`node scripts/story-images.mjs ${storyPath}          # xem danh sách ảnh và chi phí`);
out(`node scripts/story-images.mjs ${storyPath} --yes    # tạo các ảnh còn thiếu`);
out("```");
out();
out("**Video 🎬 (Flow → Veo):** làm tay theo mục 3. Trước khi tải, chạy lệnh dưới đây; file tải về sẽ tự đổi tên và chuyển vào `media/`:");
out();
out("```bash");
out(`node scripts/story-import.mjs ${storyPath}`);
out("```");
out();
out(`Xong thì dựng phim: \`node scripts/story.mjs ${storyPath}\`. Thiếu file nào thì cảnh đó hiện khung giữ chỗ.`);
out();

out("## 1. Ảnh tham chiếu nhân vật");
out();
for (const im of charImages) {
  out(`### ${im.label} — ${mark(im.file)}`);
  out();
  out("```text");
  out(im.prompt);
  out("```");
  out();
}

out("## 2. Khung hình từng cảnh");
out();
out("| Cảnh | Loại | Lời | File |");
out("| --- | --- | --- | --- |");
for (const s of story.scenes) {
  const who = s.speaker ? `**${chars[s.speaker]?.name || s.speaker}:** ` : "";
  const files = [mark(`${s.id}.png`)];
  if (s.shot.mode === "video") files.push(mark(`${s.id}.mp4`));
  out(`| ${s.id} | ${s.shot.mode === "video" ? "🎬 video" : "🖼 ảnh"} | ${who}${s.text} | ${files.join("<br>")} |`);
}
out();
for (const s of story.scenes) {
  const im = frameOf(s.id);
  out(`### ${s.id} ${s.shot.mode === "video" ? "🎬" : "🖼"} — ${mark(im.file)}`);
  out();
  const r = refs(s.shot.cast);
  if (r.length) {
    out(`Đính kèm: ${r.map((f) => `\`media/${f}\``).join(", ")}`);
    out();
  }
  out("```text");
  out(im.prompt);
  out("```");
  out();
}

out("## 3. Đoạn video (Flow → Veo, chế độ Frames to Video)");
out();
if (!videos.length) out("Kịch bản này không có cảnh video.");
else out("Chọn ảnh khung hình của cảnh làm **khung đầu**, dán câu lệnh, chọn bản Fast để tiết kiệm credit. Tải về dạng MP4.");
out();
for (const v of videos) {
  out(`### ${v.label} — ${mark(v.file)}`);
  out();
  out(`Khung đầu: \`media/${v.first}\``);
  out();
  out("```text");
  out(v.prompt);
  out("```");
  out();
}

const needed = [...images, ...videos].map((x) => x.file);
const missing = needed.filter((f) => !has(f));
out("## Tiến độ");
out();
out(`${needed.length - missing.length}/${needed.length} file đã có. ${videos.length} cảnh video ≈ ${videos.length} lượt Veo (chưa tính tạo lại).`);

fs.writeFileSync(path.join(dir, "SHOTLIST.md"), lines.join("\n") + "\n");
console.log(`Đã tạo ${path.join(dir, "SHOTLIST.md")} — ${needed.length - missing.length}/${needed.length} file media đã có.`);
if (missing.length) console.log(`Còn thiếu: ${missing.join(", ")}`);
