#!/usr/bin/env node
// Tự kiểm tra video 3D: chụp khung hình ở các mốc của từng cảnh (đầu, giữa, cuối) rồi ghép contact sheet,
// và nếu đã có MP4 thì kiểm tra bằng ffprobe (độ phân giải, fps, thời lượng, codec, âm thanh).
//
// Cách dùng:  node lab/inspect3d.mjs lab/content3d/<id>.json [--scenes s01,s05] [--at 12.5,30]
// Kết quả:    lab/build/<id>/inspect/<cảnh>.jpg (mỗi cảnh 1 dải 3 khung) — mở bằng trình xem ảnh để soát lỗi
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { serve } from "./serve3d.mjs";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const story = JSON.parse(fs.readFileSync(args[0], "utf8"));
const id = story.id;
const dir = path.join("lab/build", id, story.name || "video3d");
const outDir = path.join("lab/build", id, "inspect" + (story.name ? `-${story.name}` : ""));
fs.mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME_PATH || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const server = await serve(process.cwd());
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--ignore-gpu-blocklist", "--use-angle=" + (process.platform === "darwin" ? "metal" : "swiftshader")],
  defaultViewport: { width: 1920, height: 1080 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => (m.type() === "error" || m.text().startsWith("[3d]")) && console.log("  trang:", m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/${dir}/index.html?render=1`, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 120000 }).catch(() => {});
if (errors.length) {
  console.error("Lỗi trang:\n  " + errors.join("\n  "));
  process.exit(1);
}
const scenes = await page.evaluate(() => window.VIDEO.scenes.map((s) => ({ id: s.id, start: s.start, end: s.end })));
const shots = async (name, times) => {
  const files = [];
  for (const [i, t] of times.entries()) {
    await page.evaluate((x) => window.renderFrame(x), t);
    // vật thể quan trọng lấn vào vùng chữ (trang tự đăng ký window.__overlap)
    const ov = await page.evaluate(() => (window.__overlap ? window.__overlap() : []));
    if (ov.length) console.log(`  ⚠ ${t.toFixed(2)}s: lấn vùng chữ — ${ov.join(", ")}`);
    const f = path.join(outDir, `_${name}-${i}.jpg`);
    await page.screenshot({ path: f, type: "jpeg", quality: 85, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.5 } });
    files.push(f);
  }
  // ghép ngang các khung (mốc thời gian in ra log)
  const inputs = files.flatMap((f) => ["-i", f]);
  const filter = times.length > 1 ? ["-filter_complex", `hstack=inputs=${times.length}`] : [];
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, ...filter, path.join(outDir, `${name}.jpg`)], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("FFmpeg ghép ảnh lỗi: " + r.stderr);
  files.forEach((f) => fs.unlinkSync(f));
  return `${path.join(outDir, `${name}.jpg`)}  (${times.map((t) => t.toFixed(1) + "s").join(", ")})`;
};

const only = opt("--scenes")?.split(",");
if (opt("--at")) {
  console.log(await shots("at", opt("--at").split(",").map(Number)));
} else {
  for (const s of scenes) {
    if (only && !only.includes(s.id)) continue;
    const d = s.end - s.start;
    console.log(await shots(s.id, [s.start + 0.6, s.start + d * 0.5, s.end - 0.25]));
  }
}
await browser.close();
server.close();

const mp4 = path.join("lab/out", `${id}-${story.name || "3d"}.mp4`);
if (fs.existsSync(mp4)) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt:format=duration", "-of", "json", mp4], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === "video"), a = j.streams.find((s) => s.codec_type === "audio");
  console.log(`\nffprobe ${mp4}: ${v.width}×${v.height}, ${v.r_frame_rate} fps, ${v.codec_name} ${v.pix_fmt}, ${Number(j.format.duration).toFixed(2)}s, âm thanh: ${a ? a.codec_name : "KHÔNG CÓ"}`);
}
