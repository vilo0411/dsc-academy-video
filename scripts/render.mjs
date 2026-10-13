#!/usr/bin/env node
// Render MP4 bằng HyperFrames cho cả bản ngang (YouTube) và bản dọc (Shorts/Reels/TikTok).
//
// Cách dùng:  node scripts/render.mjs content/pe-la-gi.json [draft|looks|delivery]
// Kết quả:    out/<id>-16x9.mp4, out/<id>-9x16.mp4

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const contentPath = process.argv[2] || "content/pe-la-gi.json";
const quality = process.argv[3] || "looks";
const { id } = JSON.parse(fs.readFileSync(contentPath, "utf8"));
fs.mkdirSync("out", { recursive: true });

for (const orientation of (process.env.ORIENTATIONS || "16x9").split(",")) {
  const dir = path.join("build", id, `video-${orientation}`);
  if (!fs.existsSync(path.join(dir, "index.html"))) {
    console.error(`Chưa có ${dir}/index.html — chạy "npm run build" trước.`);
    process.exit(1);
  }
  const out = path.resolve("out", `${id}-${orientation}.mp4`);
  console.log(`\n▶ Render ${orientation} → ${out}`);
  const r = spawnSync("npx", ["hyperframes", "render", "--quality", quality, "--output", out], {
    cwd: dir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error(`Render ${orientation} lỗi. Thử "npx hyperframes doctor" trong thư mục ${dir} để kiểm tra Chrome/FFmpeg.`);
    process.exit(r.status || 1);
  }
}
console.log("\nXong. Video nằm trong thư mục out/");
