#!/usr/bin/env node
// Tạo ảnh cho phim kể chuyện bằng Nano Banana qua Vertex AI (dùng GCP_SA_KEY): ảnh nhân vật trước,
// rồi khung hình từng cảnh, mỗi khung đính kèm ảnh nhân vật xuất hiện trong cảnh để giữ đồng nhất.
// Mặc định chỉ liệt kê ảnh còn thiếu và báo chi phí; thêm --yes mới gọi API.
//
// Cách dùng:  node scripts/story-images.mjs stories/<thư mục>/story.json [--yes]
//               [--only s03,s07]  chỉ làm các ảnh này (tên cảnh hoặc char-<key>), tạo lại nếu đã có
//               [--model pro|nb21|flash]  mặc định pro (gemini-3-pro-image)
//               [--size 1K|2K]  mặc định 2K
//               [--out <thư mục>]  lưu chỗ khác thay vì media/ (để thử)
//               [--retry N]  số lần tự tạo lại khi khung hình bị viền/dải trống, mặc định 1
// Kết quả:    media/*.png (ảnh cũ bị thay được giữ ở media/_old/), build/<id>/image-log.json

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv } from "./lib/env.mjs";
import { gcpAccessToken, gcpProjectId } from "./lib/gcp-auth.mjs";
import { shots } from "./lib/story-shots.mjs";
import { checkFrame } from "./lib/frame-check.mjs";

loadEnv();

// Bảng giá Standard của Google (USD, kiểm tra 2026-10-14). price: mỗi ảnh ra, dùng để ước tính trước khi chạy;
// rate: mỗi 1 triệu token (vào, ảnh ra, chữ + suy nghĩ ra), dùng để tính chi phí thực sau khi chạy.
const MODELS = {
  pro: { id: "gemini-3-pro-image", price: { "1K": 0.134, "2K": 0.134 }, rate: { in: 2, image: 120, text: 12 } },
  nb21: { id: "gemini-nano-banana-2.1", price: { "1K": 0.0336, "2K": 0.0504 }, rate: { in: 1.5, image: 30, text: 7.5 } },
  flash: { id: "gemini-3.1-flash-image", price: { "1K": 0.067, "2K": 0.101 }, rate: { in: 0.5, image: 60, text: 3 } },
};
// Ước tính thêm cho phần gửi vào và suy nghĩ (ảnh thử thực tế: khoảng 0,007 USD/ảnh với model pro).
const EXTRA = 0.007;

function actualCost(u) {
  const img = (u.candidatesTokensDetails || []).filter((d) => d.modality === "IMAGE").reduce((a, d) => a + d.tokenCount, 0);
  const text = (u.candidatesTokenCount || 0) - img + (u.thoughtsTokenCount || 0);
  return ((u.promptTokenCount || 0) * model.rate.in + img * model.rate.image + text * model.rate.text) / 1e6;
}
const MAX_WIDTH = 1920; // đủ cho video 1080p, file nhẹ hơn nhiều so với ảnh gốc
const REF_WIDTH = 1024;
const PARALLEL = 3;

const args = process.argv.slice(2);
const storyPath = args.find((a) => a.endsWith(".json"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!storyPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/story-images.mjs stories/chiec-lo-cua-ba/story.json");
  process.exit(1);
}
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));
const mediaDir = path.join(path.dirname(storyPath), "media");
const outDir = opt("out") || mediaDir;
const buildDir = path.join("build", story.id);
const model = MODELS[opt("model") || story.imageModel || "pro"];
const size = opt("size") || "2K";
const RETRY = Number(opt("retry") ?? 1);
if (!model || !model.price[size]) {
  console.error(`Model/kích thước không hợp lệ. Model: ${Object.keys(MODELS).join(", ")}; kích thước: 1K, 2K.`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(buildDir, "refs"), { recursive: true });

const { images } = shots(story);
const only = opt("only")
  ?.split(",")
  .map((s) => s.trim().replace(/\.png$/, ""))
  .filter(Boolean);
const todo = only
  ? images.filter((im) => only.includes(im.file.replace(/\.png$/, "")))
  : images.filter((im) => !fs.existsSync(path.join(outDir, im.file)));
if (only && todo.length !== only.length) {
  const known = images.map((im) => im.file.replace(/\.png$/, ""));
  console.error(`Không có ảnh: ${only.filter((o) => !known.includes(o)).join(", ")}. Các ảnh: ${known.join(", ")}`);
  process.exit(1);
}

const usd = (x) => `${x.toFixed(2)} USD`;
const unit = model.price[size] + EXTRA;
console.log(`Model ${model.id}, ảnh ${size}, ${unit.toFixed(3)} USD/ảnh.`);
if (!todo.length) {
  console.log("Đã đủ ảnh, không cần tạo thêm. Muốn tạo lại ảnh nào thì dùng --only <tên>.");
  process.exit(0);
}
for (const im of todo) console.log(`  ${im.file}${im.refs.length ? `  (đính kèm ${im.refs.join(", ")})` : ""}`);
console.log(`Tổng: ${todo.length} ảnh ≈ ${usd(todo.length * unit)}. Ảnh bị viền/dải trống được tạo lại tối đa ${RETRY} lần, mỗi lần thêm ${usd(unit)}.`);
if (!args.includes("--yes")) {
  console.log("Chưa gọi API. Thêm --yes để tạo.");
  process.exit(2);
}
if (!process.env.GCP_SA_KEY) {
  console.error("Chưa có GCP_SA_KEY trong .env.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ảnh tham chiếu thu nhỏ thành JPEG để gửi đi nhanh và rẻ; tạo lại khi ảnh nhân vật thay đổi.
function refData(file) {
  const src = [outDir, mediaDir].map((d) => path.join(d, file)).find((p) => fs.existsSync(p));
  if (!src) throw new Error(`Thiếu ảnh tham chiếu ${file}. Tạo ảnh nhân vật trước.`);
  const dst = path.join(buildDir, "refs", file.replace(/\.png$/, ".jpg"));
  if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs)
    execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(REF_WIDTH), src, "--out", dst], { stdio: "ignore" });
  return { inlineData: { mimeType: "image/jpeg", data: fs.readFileSync(dst).toString("base64") } };
}

async function generate(im, extra = "") {
  const token = await gcpAccessToken();
  const project = gcpProjectId();
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model.id}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [...im.refs.map(refData), { text: im.prompt + extra }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: im.file.startsWith("char-") ? "16:9" : story.aspect || "16:9", imageSize: size },
    },
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-goog-user-project": project },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      console.log(`  ${im.file}: lỗi ${res.status}, thử lại sau ${20 * attempt}s…`);
      await sleep(20000 * attempt);
      continue;
    }
    throw new Error(`lỗi ${res.status} ${text.slice(0, 400)}`);
  }
}

function save(im, j) {
  const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!part) {
    const why = j?.candidates?.[0]?.finishReason || j?.promptFeedback?.blockReason || "không rõ";
    const said = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join(" ");
    throw new Error(`không trả ảnh (${why})${said ? `: ${said.slice(0, 200)}` : ""}`);
  }
  const dst = path.join(outDir, im.file);
  if (fs.existsSync(dst)) {
    const old = path.join(outDir, "_old");
    fs.mkdirSync(old, { recursive: true });
    fs.renameSync(dst, path.join(old, im.file.replace(/\.png$/, `-${Date.now()}.png`)));
  }
  const raw = path.join(buildDir, "refs", `raw-${im.file}`);
  fs.writeFileSync(raw, Buffer.from(part.inlineData.data, "base64"));
  execFileSync("sips", ["-s", "format", "png", "-Z", String(MAX_WIDTH), raw, "--out", dst], { stdio: "ignore" });
  fs.rmSync(raw);
  return j.usageMetadata || {};
}

const logFile = path.join(buildDir, "image-log.json");
const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : [];
let spent = 0;
const failed = [];

const STRICT = " IMPORTANT: the illustration must cover the entire canvas edge to edge; do not add any border, frame, bar or empty band.";

async function run(im) {
  for (let attempt = 0; ; attempt++) {
    const t0 = Date.now();
    try {
      const usage = save(im, await generate(im, attempt ? STRICT : ""));
      const cost = actualCost(usage);
      spent += cost;
      log.push({ file: im.file, model: model.id, size, usd: +cost.toFixed(4), at: new Date().toISOString(), usage });
      // Ảnh nhân vật có nền trơn nên không kiểm tra viền.
      const problems = im.file.startsWith("char-") ? [] : checkFrame(path.join(outDir, im.file));
      const took = `${((Date.now() - t0) / 1000).toFixed(0)}s, ${cost.toFixed(3)} USD`;
      if (!problems.length) return console.log(`  ✅ ${im.file} (${took})`);
      if (attempt < RETRY) {
        console.log(`  ↻ ${im.file} (${took}): ${problems.join("; ")}, tạo lại…`);
        continue;
      }
      failed.push(im.file);
      return console.log(`  ⚠️  ${im.file} (${took}): vẫn ${problems.join("; ")}`);
    } catch (e) {
      failed.push(im.file);
      return console.log(`  ❌ ${im.file}: ${e.message}`);
    }
  }
}

// Ảnh nhân vật làm trước vì khung hình cần chúng làm tham chiếu.
const chars = todo.filter((im) => im.file.startsWith("char-"));
const frames = todo.filter((im) => !im.file.startsWith("char-"));
for (const batch of [chars, frames]) {
  for (let i = 0; i < batch.length; i += PARALLEL) await Promise.all(batch.slice(i, i + PARALLEL).map(run));
}
fs.writeFileSync(logFile, JSON.stringify(log, null, 2) + "\n");

const total = log.reduce((a, x) => a + (x.usd || 0), 0);
console.log(`Lần này: ${todo.length - failed.length}/${todo.length} ảnh, ${usd(spent)}. Cộng dồn cho phim này ≈ ${usd(total)} (xem ${logFile}).`);
if (failed.length) {
  console.log(`Chưa tạo được: ${failed.join(", ")}. Sửa prompt trong story.json rồi chạy lại với --only ${failed.map((f) => f.replace(/\.png$/, "")).join(",")} --yes`);
  process.exit(1);
}
