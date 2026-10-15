#!/usr/bin/env node
// Lấy kết quả GitHub CI (nhánh renders) về videos/<id>/: giọng đọc, nhạc nền, video.
// Dùng khi kịch bản được làm và render trên GitHub (ví dụ từ máy công ty).
//
// Cách dùng:  npm run pull               mọi video
//             npm run pull -- t01        một video
//             npm run pull -- t01 --force   ghi đè cả bản trên máy
import { allVideos, resolveVideo } from "./lib/paths.mjs";
import { pullVideo } from "./lib/renders.mjs";

const args = process.argv.slice(2);
const one = args.find((a) => !a.startsWith("--"));
const list = one ? [resolveVideo(one)] : allVideos().map((v) => resolveVideo(v.script));
let n = 0;
for (const v of list) {
  const got = pullVideo(v.content, { force: args.includes("--force") });
  if (got.length) {
    console.log(`✓ ${v.id}: ${got.join(", ")}`);
    n++;
  }
}
console.log(n ? `Đã cập nhật ${n} video.` : "Không có gì mới trên nhánh renders.");
