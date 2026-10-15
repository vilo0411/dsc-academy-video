#!/usr/bin/env node
// Render video 3D: mở trang bằng Chrome headless, tua tới từng khung (window.renderFrame), chụp và đẩy thẳng vào FFmpeg.
//
// Cách dùng:  node lab/render3d.mjs content/t04-....json [draft] [--frames 0-300] [--out lab/out/x.mp4]
//             node lab/render3d.mjs lab/build/<id>/video3d            (render thẳng một thư mục đã dựng)
// draft = 15 khung/giây, ảnh 960×540 — để xem nhanh bố cục và nhịp.
// Kết quả mặc định: lab/out/<id>-3d.mp4 (có giọng đọc nếu thư mục dựng có voice.wav)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import { serve } from "./serve3d.mjs";

const args = process.argv.slice(2);
const target = args[0];
if (!target) {
  console.error("Thiếu đầu vào. Ví dụ: node lab/render3d.mjs lab/content3d/t04-lai-suat-va-chinh-sach-tien-te.json");
  process.exit(1);
}
const draft = args.includes("draft");
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

let dir, id;
if (target.endsWith(".json")) {
  const j = JSON.parse(fs.readFileSync(target, "utf8"));
  id = j.id + (j.name ? `-${j.name}` : "");
  dir = path.join("lab/build", j.id, j.name || "video3d");
} else {
  dir = target.replace(/\/$/, "");
  id = path.basename(path.dirname(dir));
}
if (!fs.existsSync(path.join(dir, "index.html"))) {
  console.error(`Chưa có ${dir}/index.html — chạy "npm run lab:build3d" trước.`);
  process.exit(1);
}

const FPS = Number(opt("--fps")) || (draft ? 15 : 30);
const SCALE = draft ? 0.5 : 1;
const out = path.resolve(opt("--out") || path.join("lab/out", `${id}-3d${draft ? "-draft" : ""}.mp4`));
fs.mkdirSync(path.dirname(out), { recursive: true });

const CHROME =
  process.env.CHROME_PATH ||
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

const server = await serve(process.cwd());
const url = `http://127.0.0.1:${server.address().port}/${dir}/index.html?render=1`;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=" + (process.platform === "darwin" ? "metal" : "swiftshader"), "--hide-scrollbars", "--mute-audio"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("console", (m) => (m.type() === "error" || m.text().startsWith("[3d]")) && console.log("  trang:", m.text()));
page.on("pageerror", (e) => console.error("  lỗi trang:", e.message));
await page.goto(url, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 120000 });
const gpu = await page.evaluate(() => {
  const gl = document.querySelector("canvas").getContext("webgl2");
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?";
});
const duration = await page.evaluate("window.__duration");
const total = Math.round(duration * FPS);
let [f0, f1] = (opt("--frames") || `0-${total}`).split("-").map(Number);
f1 = Math.min(f1, total);
console.log(`▶ ${id}: ${duration.toFixed(2)}s, ${FPS} fps, khung ${f0}–${f1} → ${out}\n  GPU: ${gpu}`);

// Có giọng đọc và render trọn video thì ghép luôn tiếng
const voice = path.join(dir, "voice.wav");
const withAudio = fs.existsSync(voice) && f0 === 0;
const ff = spawn(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    ...(withAudio ? ["-i", voice] : []),
    // ảnh JPEG là dải màu đầy đủ → chuyển về dải chuẩn TV + yuv420p để mọi trình phát hiển thị đúng màu
    "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-color_range", "tv",
    "-c:v", "libx264", "-preset", draft ? "veryfast" : "medium", "-crf", draft ? "26" : "18",
    ...(withAudio ? ["-c:a", "aac", "-b:a", "192k", "-af", "apad", "-shortest"] : []),
    "-movflags", "+faststart", out,
  ],
  { stdio: ["pipe", "inherit", "inherit"] }
);
const ffDone = new Promise((r) => ff.on("close", r));

const t0 = Date.now();
for (let n = f0; n < f1; n++) {
  await page.evaluate((t) => window.renderFrame(t), n / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: draft ? 80 : 93, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: SCALE } });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if ((n - f0) % (FPS * 5) === 0 && n > f0) {
    const per = (Date.now() - t0) / (n - f0);
    process.stdout.write(`  ${n}/${f1} khung — ${per.toFixed(0)} ms/khung, còn ~${Math.round(((f1 - n) * per) / 1000)}s\n`);
  }
}
ff.stdin.end();
const code = await ffDone;
await browser.close();
server.close();
const secs = (Date.now() - t0) / 1000;
console.log(`${code === 0 ? "✔ Xong" : "✘ FFmpeg lỗi"}: ${f1 - f0} khung trong ${secs.toFixed(0)}s (${((secs * 1000) / Math.max(1, f1 - f0)).toFixed(0)} ms/khung)${withAudio ? ", có giọng đọc" : ", không tiếng"}`);
process.exit(code === 0 ? 0 : 1);
