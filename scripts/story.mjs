#!/usr/bin/env node
// Chạy trọn luồng phim kể chuyện: (ảnh) → bảng phân cảnh → giọng đọc → dựng → render.
//
// Cách dùng:  node scripts/story.mjs stories/chiec-lo-cua-ba/story.json [--images [--yes]] [--no-voice] [--no-render] [--draft]
//   --images     tạo ảnh còn thiếu bằng API (báo chi phí; thêm --yes mới gọi API), xem scripts/story-images.mjs
//   --no-voice   không gọi API giọng đọc (xem thử hình, video không tiếng)
//   --no-render  chỉ cập nhật SHOTLIST.md và dựng HTML (xem bằng: npx hyperframes preview trong thư mục build)
//   --draft      render nhanh chất lượng thấp
// Kết quả:    stories/<thư mục>/SHOTLIST.md, out/<id>-16x9.mp4 (hoặc -9x16)

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { loadEnv } from "./lib/env.mjs";

loadEnv();
const storyPath = process.argv[2];
if (!storyPath || !fs.existsSync(storyPath)) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/story.mjs stories/chiec-lo-cua-ba/story.json");
  process.exit(1);
}
const flag = (f) => process.argv.includes(f);
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const orientation = story.aspect === "9:16" ? "9x16" : "16x9";
const run = (script, ...args) => {
  const r = spawnSync(process.execPath, [script, storyPath, ...args], { stdio: "inherit", env: { ...process.env, ORIENTATIONS: orientation } });
  if (r.status !== 0) process.exit(r.status || 1);
};

if (flag("--images")) {
  const r = spawnSync(process.execPath, ["scripts/story-images.mjs", storyPath, ...(flag("--yes") ? ["--yes"] : [])], { stdio: "inherit" });
  if (r.status === 2) process.exit(0); // mới báo chi phí, chờ người dùng đồng ý
  if (r.status !== 0) process.exit(r.status || 1);
}
run("scripts/story-prompts.mjs");
if (!flag("--no-voice")) {
  const cloud = story.voice?.provider?.startsWith("cloud");
  if (cloud ? !process.env.GCP_SA_KEY : !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const need = cloud ? "GCP_SA_KEY (nội dung JSON khoá service account, viết trên một dòng)" : "GEMINI_API_KEY";
    console.error(`Chưa có ${need} trong .env. Thêm key, hoặc chạy với --no-voice để xem hình trước.`);
    process.exit(1);
  }
  run("scripts/story-tts.mjs");
}
run("scripts/build-story.mjs");
if (!flag("--no-render")) run("scripts/render.mjs", flag("--draft") ? "draft" : "looks");
