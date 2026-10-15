#!/usr/bin/env node
// Nền vẽ bằng Nano Banana (Vertex AI, GCP_SA_KEY) cho bản thử hoạt hình rối: chỉ có cảnh, không người,
// sàn nằm ngang ở tầm mắt để đặt nhân vật SVG lên. Mặc định chỉ báo chi phí; thêm --yes mới gọi API.
//
// Cách dùng:  node lab/puppet-bg.mjs [--yes] [--only house-a,house-b]
// Kết quả:    lab/build/puppet-demo/bg/<tên>.png

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv } from "../scripts/lib/env.mjs";
import { gcpAccessToken, gcpProjectId } from "../scripts/lib/gcp-auth.mjs";

loadEnv();
const MODEL = "gemini-3-pro-image";
const UNIT = 0.134 + 0.007; // USD/ảnh 2K, cùng bảng giá với story-images.mjs
const OUT = "lab/build/puppet-demo/bg";

const COMMON =
  "Background plate for a 2D cut-out cartoon (style of OverSimplified / Vietnamese history explainer channels): " +
  "interior of an old Saigon tube house living room, wooden cabinet on the left with a small brown glazed ceramic jar on top, " +
  "window with iron grille in the back wall showing a sunny afternoon sky, patterned Vietnamese cement tile floor, potted plant on the right, " +
  "ceiling fan, warm afternoon light. Straight-on eye-level camera, wall parallel to the picture plane, the floor is a flat horizontal band " +
  "occupying the bottom 12 percent of the image so cartoon characters can stand on it, middle of the room left completely empty and uncluttered. " +
  "NO people, NO characters, NO animals, no text, no logos, no watermark. The illustration covers the entire canvas edge to edge, no border.";

const PLATES = {
  "house-a": `${COMMON} Look: painterly digital illustration with soft gradients, glowing light shafts, subtle texture and dramatic warm lighting, like a polished YouTube animation background.`,
  "house-b": `${COMMON} Look: clean flat vector illustration with bold dark outlines, limited warm palette, simple cel shading, matches thick-outlined cartoon characters.`,
};

const args = process.argv.slice(2);
const i = args.indexOf("--only");
const names = i >= 0 ? args[i + 1].split(",") : Object.keys(PLATES);
console.log(`Model ${MODEL}, ảnh 2K, ${UNIT.toFixed(3)} USD/ảnh.`);
for (const n of names) console.log(`  ${n}.png`);
console.log(`Tổng: ${names.length} ảnh ≈ ${(names.length * UNIT).toFixed(2)} USD.`);
if (!args.includes("--yes")) {
  console.log("Chưa gọi API. Thêm --yes để tạo.");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

async function generate(name) {
  const token = await gcpAccessToken();
  const project = gcpProjectId();
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-goog-user-project": project },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PLATES[name] }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "16:9", imageSize: "2K" } },
    }),
  });
  if (!res.ok) throw new Error(`lỗi ${res.status} ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!part) throw new Error(`không trả ảnh (${j?.candidates?.[0]?.finishReason || "không rõ"})`);
  const raw = path.join(OUT, `raw-${name}.png`);
  fs.writeFileSync(raw, Buffer.from(part.inlineData.data, "base64"));
  execFileSync("sips", ["-s", "format", "png", "-z", "1080", "1920", raw, "--out", path.join(OUT, `${name}.png`)], { stdio: "ignore" });
  fs.rmSync(raw);
  console.log(`  ✅ ${name}.png`);
}

await Promise.all(names.map((n) => generate(n).catch((e) => console.log(`  ❌ ${n}: ${e.message}`))));
