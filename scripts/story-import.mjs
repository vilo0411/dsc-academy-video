#!/usr/bin/env node
// Tự nhận file tải về cho phim kể chuyện: để lệnh này chạy, tải video (Flow/Veo) hoặc ảnh (Gemini) về
// theo đúng thứ tự cảnh; mỗi file mới xuất hiện trong thư mục tải về được đổi tên thành file còn thiếu
// kế tiếp cùng loại và chuyển vào media/. Ảnh được thu về rộng 1920px.
//
// Cách dùng:  node scripts/story-import.mjs videos/<id>/script.json [--from ~/Downloads] [--only s05]
//   --only  nhận đúng các file này (tên cảnh hoặc char-<key>), thay file đang có; ảnh cũ giữ ở media/_old/
// Dừng:       tự dừng khi đủ file, hoặc Ctrl+C.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { shots } from "./lib/story-shots.mjs";

const args = process.argv.slice(2);
const storyPath = args.find((a) => a.endsWith(".json"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!storyPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/story-import.mjs videos/story-chiec-lo-cua-ba/script.json");
  process.exit(1);
}
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const mediaDir = path.join(path.dirname(storyPath), "media");
const from = (opt("from") || path.join(os.homedir(), "Downloads")).replace(/^~/, os.homedir());
const MAX_WIDTH = 1920;

const { images, videos } = shots(story);
const only = opt("only")
  ?.split(",")
  .map((s) => s.trim().replace(/\.(png|mp4)$/, ""));
const pick = (list) => (only ? list.filter((x) => only.includes(x.file.replace(/\.(png|mp4)$/, ""))) : list.filter((x) => !fs.existsSync(path.join(mediaDir, x.file))));
const queue = { image: pick(images), video: pick(videos) };
if (!queue.image.length && !queue.video.length) {
  console.log("Đã đủ file. Muốn thay file nào thì dùng --only <tên>.");
  process.exit(0);
}

const kindOf = (f) => (/\.(png|jpe?g|webp|heic)$/i.test(f) ? "image" : /\.(mp4|mov|webm)$/i.test(f) ? "video" : null);
const show = (k) => queue[k].map((x) => x.file).join(", ") || "(đủ)";
console.log(`Đang chờ file mới trong ${from}`);
console.log(`  Video theo thứ tự: ${show("video")}`);
console.log(`  Ảnh theo thứ tự:   ${show("image")}`);
for (const v of queue.video) console.log(`  → ${v.file}: khung đầu media/${v.first}`);
console.log("Tải về lần lượt từng file. Ctrl+C để dừng.");

const start = Date.now();
const seen = new Set(fs.readdirSync(from));
const sizes = new Map();

function place(file, item) {
  fs.mkdirSync(mediaDir, { recursive: true });
  const dst = path.join(mediaDir, item.file);
  if (fs.existsSync(dst)) {
    const old = path.join(mediaDir, "_old");
    fs.mkdirSync(old, { recursive: true });
    fs.renameSync(dst, path.join(old, item.file.replace(/(\.\w+)$/, `-${Date.now()}$1`)));
  }
  if (item.file.endsWith(".png")) {
    execFileSync("sips", ["-s", "format", "png", "-Z", String(MAX_WIDTH), file, "--out", dst], { stdio: "ignore" });
    fs.rmSync(file);
  } else {
    fs.renameSync(file, dst);
  }
}

const timer = setInterval(() => {
  for (const name of fs.readdirSync(from)) {
    if (seen.has(name) || name.startsWith(".") || /\.(crdownload|download|part|tmp)$/i.test(name)) continue;
    const kind = kindOf(name);
    const full = path.join(from, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (!kind || !st.isFile() || Math.max(st.mtimeMs, st.birthtimeMs) < start - 1000) {
      seen.add(name);
      continue;
    }
    // Chờ kích thước file đứng yên một nhịp để chắc trình duyệt đã tải xong.
    if (sizes.get(name) !== st.size || st.size === 0) {
      sizes.set(name, st.size);
      continue;
    }
    seen.add(name);
    const item = queue[kind].shift();
    if (!item) {
      console.log(`  bỏ qua ${name}: không còn ${kind === "image" ? "ảnh" : "video"} nào cần nhận`);
      continue;
    }
    place(full, item);
    console.log(`  ✅ ${name} → media/${item.file}${queue[kind].length ? `   (tiếp theo: ${queue[kind][0].file})` : ""}`);
  }
  if (!queue.image.length && !queue.video.length) {
    clearInterval(timer);
    console.log("Đã nhận đủ file.");
    spawnSync(process.execPath, ["scripts/story-prompts.mjs", storyPath], { stdio: "inherit" });
  }
}, 1000);
