#!/usr/bin/env node
// Vẽ dàn nhân vật cho video toon bằng Nano Banana (Vertex AI, GCP_SA_KEY), rồi tách nền trên máy
// (scripts/lib/cutout.py: tô loang từ mép ảnh, miễn phí) để ghép vào cảnh như rối giấy (k.sprite / k.gag({ img })).
// Mỗi vai vẽ ảnh "base" trước; các tư thế khác gửi kèm ảnh base để giữ đúng một nhân vật.
// Mặc định chỉ liệt kê ảnh còn thiếu và báo chi phí; thêm --yes mới gọi API.
//
// Cách dùng:  node scripts/toon-cast.mjs videos/<id>/script.json [--yes] [--only an-base,an-shock] [--model pro|nb21|flash]
//             node scripts/toon-cast.mjs videos/<id>/script.json --cut   (chỉ tách nền lại các ảnh đã có, không gọi API)
// Kịch bản:   "cast": { "style": "…", "styleRef": "ảnh mẫu phong cách (tuỳ chọn)", "<vai>": { "look": "…", "poses": { "base": "…", "<tư thế>": "…" } } }
//             ảnh base của mỗi vai gửi kèm styleRef và "refs" riêng của vai (nếu có); vai có sẵn <vai>-base.png thì không vẽ lại base.
//             aspect mặc định 1:1; "aspect" riêng cho từng vai nếu cần.
// Kết quả:    videos/<id>/media/cast/<vai>-<tư thế>.png (ảnh gốc) + .cut.png (đã tách nền),
//             videos/<id>/.work/cast-log.json (chi phí thực)

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { videoDir, workDir } from "./lib/paths.mjs";
import { loadEnv } from "./lib/env.mjs";
import { gcpAccessToken, gcpProjectId } from "./lib/gcp-auth.mjs";

loadEnv();

// Cùng bảng giá với scripts/story-images.mjs (USD, Standard, kiểm tra 2026-10-14)
const MODELS = {
  pro: { id: "gemini-3-pro-image", price: 0.134, rate: { in: 2, image: 120, text: 12 } },
  nb21: { id: "gemini-nano-banana-2.1", price: 0.0504, rate: { in: 1.5, image: 30, text: 7.5 } },
  flash: { id: "gemini-3.1-flash-image", price: 0.101, rate: { in: 0.5, image: 60, text: 3 } },
};
const EXTRA = 0.007; // phần gửi vào + suy nghĩ, ước tính

const args = process.argv.slice(2);
const scriptPath = args.find((a) => a.endsWith(".json"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!scriptPath) {
  console.error("Thiếu kịch bản. Ví dụ: node scripts/toon-cast.mjs videos/toon-lich-su-lam-phat/script.json");
  process.exit(1);
}
const content = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
const cast = content.cast;
if (!cast) {
  console.error('Kịch bản chưa có "cast".');
  process.exit(1);
}
const model = MODELS[opt("model") || cast.model || "pro"];
const outDir = path.join(videoDir(content.id), "media", "cast");
const work = workDir(videoDir(content.id));
fs.mkdirSync(outDir, { recursive: true });

// Danh sách ảnh: base trước, rồi các tư thế (đính kèm base)
const all = [];
for (const [role, c] of Object.entries(cast)) {
  if (["style", "model", "styleRef"].includes(role)) continue;
  for (const [pose, desc] of Object.entries(c.poses || {})) {
    all.push({
      file: `${role}-${pose}.png`,
      role,
      pose,
      // base: ảnh mẫu phong cách + ảnh mẫu riêng của vai ("refs", ví dụ tượng/chân dung nhân vật lịch sử)
      refs: pose === "base" ? [...(cast.styleRef ? [cast.styleRef] : []), ...(c.refs || [])] : [path.join(outDir, `${role}-base.png`)],
      aspect: c.aspect || "1:1",
      closeup: /close-up/i.test(desc),
      prompt:
        `${cast.style}\n\nCharacter: ${c.look}\n\n` +
        (pose === "base"
          ? `${cast.styleRef ? "Match the FIRST attached image (style reference) exactly in line weight, colouring, head shape and thin stick limbs (a different person). " : ""}${c.refs?.length ? "Base the character's likeness (hairstyle, face, costume) on the other attached reference image(s), simplified into this cartoon style. " : ""}Draw ONE single drawing of this character (only one figure: no turnaround, no extra views, no second close-up): ${desc}`
          : `Draw the SAME character as in the attached reference image (identical face, hair, outfit, colours, line style and proportions), as ONE single figure only: ${desc}`) +
        "\n\nSingle character only, centered, whole figure inside the frame with margin; a close-up shows only head, shoulders, arms and upper torso (no legs or feet anywhere). Plain flat light grey (#e6e6e6) background with no shadow on the background, no scenery, no text, no letters, no logos, no watermark, no border.",
    });
  }
}
const only = opt("only")?.split(",").map((s) => s.trim().replace(/\.png$/, ""));
const todo = only ? all.filter((im) => only.includes(im.file.replace(/\.png$/, ""))) : all.filter((im) => !fs.existsSync(path.join(outDir, im.file)));
if (only && todo.length !== only.length) {
  console.error(`Không có ảnh: ${only.filter((o) => !all.some((im) => im.file === `${o}.png`)).join(", ")}. Các ảnh: ${all.map((im) => im.file.replace(/\.png$/, "")).join(", ")}`);
  process.exit(1);
}
// Tách nền: mô hình cho ảnh người thật (hyperframes remove-background) để lại quầng xám giữa tay và thân,
// tranh viền đen nền trơn thì tô loang từ mép sạch hơn.
// Tư thế toàn thân: --single giữ đúng một hình (AI đôi khi vẽ thêm hình bán thân bên cạnh), chân chạm đáy khung.
function cutout(png, closeup) {
  const r = spawnSync("python3", ["scripts/lib/cutout.py", png, png.replace(/\.png$/, ".cut.png"), ...(closeup ? [] : ["--single"])], { encoding: "utf8" });
  return r.status === 0 ? null : (r.stderr || "").slice(-300);
}
if (args.includes("--cut")) {
  for (const im of all) {
    const p = path.join(outDir, im.file);
    if (!fs.existsSync(p)) continue;
    const err = cutout(p, im.closeup);
    console.log(`  ${err ? "⚠️ " : "✅"} ${im.file.replace(/\.png$/, ".cut.png")}${err ? " — " + err : ""}`);
  }
  process.exit(0);
}
const unit = model.price + EXTRA;
console.log(`Model ${model.id}, ảnh 2K, ${unit.toFixed(3)} USD/ảnh.`);
if (!todo.length) {
  console.log("Đã đủ ảnh. Muốn vẽ lại ảnh nào thì dùng --only <tên>.");
  process.exit(0);
}
for (const im of todo) console.log(`  ${im.file}${im.refs.length ? `  (đính kèm ${im.refs.map((r) => path.basename(r)).join(", ")})` : ""}`);
console.log(`Tổng: ${todo.length} ảnh ≈ ${(todo.length * unit).toFixed(2)} USD.`);
if (!args.includes("--yes")) {
  console.log("Chưa gọi API. Thêm --yes để tạo.");
  process.exit(2);
}
if (!process.env.GCP_SA_KEY) {
  console.error("Chưa có GCP_SA_KEY trong .env.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function refPart(src) {
  if (!fs.existsSync(src)) throw new Error(`Thiếu ảnh tham chiếu ${src}: vẽ ảnh base trước.`);
  const dst = path.join(work, `ref-${path.basename(src).replace(/\.png$/, ".jpg")}`);
  execFileSync("sips", ["-s", "format", "jpeg", "-Z", "1024", src, "--out", dst], { stdio: "ignore" });
  return { inlineData: { mimeType: "image/jpeg", data: fs.readFileSync(dst).toString("base64") } };
}
async function generate(im) {
  const token = await gcpAccessToken();
  const project = gcpProjectId();
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model.id}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [...im.refs.map(refPart), { text: im.prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: im.aspect, imageSize: "2K" } },
  };
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-goog-user-project": project },
        body: JSON.stringify(body),
      });
    } catch (e) {
      // lỗi mạng (fetch failed): chưa nhận ảnh nên không tính phí, thử lại
      if (attempt >= 4) throw e;
      console.log(`  ${im.file}: lỗi mạng, thử lại sau ${15 * attempt}s…`);
      await sleep(15000 * attempt);
      continue;
    }
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
const cost = (u) => {
  const img = (u.candidatesTokensDetails || []).filter((d) => d.modality === "IMAGE").reduce((a, d) => a + d.tokenCount, 0);
  const text = (u.candidatesTokenCount || 0) - img + (u.thoughtsTokenCount || 0);
  return ((u.promptTokenCount || 0) * model.rate.in + img * model.rate.image + text * model.rate.text) / 1e6;
};

const logFile = path.join(work, "cast-log.json");
const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : [];
let spent = 0;
const failed = [];
async function run(im) {
  const t0 = Date.now();
  try {
    const j = await generate(im);
    const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!part) throw new Error(`không trả ảnh (${j?.candidates?.[0]?.finishReason || j?.promptFeedback?.blockReason || "không rõ"})`);
    const dst = path.join(outDir, im.file);
    if (fs.existsSync(dst)) {
      fs.mkdirSync(path.join(outDir, "_old"), { recursive: true });
      fs.renameSync(dst, path.join(outDir, "_old", im.file.replace(/\.png$/, `-${Date.now()}.png`)));
    }
    const raw = path.join(work, `raw-${im.file}`);
    fs.writeFileSync(raw, Buffer.from(part.inlineData.data, "base64"));
    execFileSync("sips", ["-s", "format", "png", "-Z", "1600", raw, "--out", dst], { stdio: "ignore" });
    fs.rmSync(raw);
    const usd = cost(j.usageMetadata || {});
    spent += usd;
    log.push({ file: im.file, model: model.id, usd: +usd.toFixed(4), at: new Date().toISOString() });
    const err = cutout(dst, im.closeup);
    console.log(`  ${err ? "⚠️ " : "✅"} ${im.file} (${((Date.now() - t0) / 1000).toFixed(0)}s, ${usd.toFixed(3)} USD)${err ? " — tách nền lỗi: " + err : ""}`);
  } catch (e) {
    failed.push(im.file);
    console.log(`  ❌ ${im.file}: ${e.message}`);
  }
}
// base trước (các tư thế cần nó làm tham chiếu), mỗi đợt 3 ảnh
const bases = todo.filter((im) => im.pose === "base");
const rest = todo.filter((im) => im.pose !== "base");
for (const batch of [bases, rest]) for (let i = 0; i < batch.length; i += 3) await Promise.all(batch.slice(i, i + 3).map(run));
fs.writeFileSync(logFile, JSON.stringify(log, null, 2) + "\n");
console.log(`Xong: ${todo.length - failed.length}/${todo.length} ảnh, chi phí thực ${spent.toFixed(3)} USD (tổng đã dùng cho video này: ${log.reduce((a, x) => a + (x.usd || 0), 0).toFixed(3)} USD).`);
if (failed.length) process.exit(1);
