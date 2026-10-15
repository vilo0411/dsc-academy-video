#!/usr/bin/env node
// Lưới 3x3 phương án nhân vật kiểu doodle / người que đầu blob (tham chiếu kênh Vui Vẻ) để duyệt phong cách,
// vẽ bằng Nano Banana (Vertex AI, GCP_SA_KEY), mỗi lưới 1 ảnh; số thứ tự ô đánh lên ảnh bằng Pillow (AI hay viết sai chữ).
// Mặc định chỉ báo chi phí; thêm --yes mới gọi API.
//
// Cách dùng:  node lab/char-grid.mjs [--yes] [--only host,cast,an,cast2]   (mặc định: ảnh chưa có)
// Kết quả:    lab/out/char-grid/<lưới>.png (gốc) + <lưới>-so.png (có số ô)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv } from "../scripts/lib/env.mjs";
import { gcpAccessToken, gcpProjectId } from "../scripts/lib/gcp-auth.mjs";

loadEnv();
const MODEL = "gemini-3-pro-image";
const UNIT = 0.134 + 0.007; // USD/ảnh 2K, cùng bảng giá với scripts/story-images.mjs
const OUT = "lab/out/char-grid";

const STYLE =
  "Character design sheet in the style of Vietnamese doodle explainer YouTube cartoons: simple stylized stick-figure / 'blob figure' characters. " +
  "Each character has a large soft rounded-rectangle or bean-shaped 'blob' head, a small simple torso wearing clothes, and arms and legs drawn as thin single black lines (stick limbs) " +
  "ending in tiny round hands and small simple shoes. Faces are minimal and expressive: small dot or short-line eyes, simple eyebrows, a tiny mouth, light pink blush. " +
  "Clean confident black outlines of medium-thin even weight, flat soft pastel fills with no shading, pure white background. Cute, playful, hand-drawn doodle feel, polished and consistent.";
const LAYOUT =
  "Layout: a 3 by 3 grid of nine separate characters, each centered in its own equal square cell, separated by thin light grey lines. " +
  "Every character drawn at the same scale, full body from head to feet, standing front view in a friendly neutral pose, nothing cropped. " +
  "Absolutely no text, letters, numbers, labels, captions or logos anywhere in the image.";

const GRIDS = {
  host: `${STYLE}\n\nNine design options for the SAME host character "An", a cheerful young Vietnamese man who presents a finance education channel; brand colour teal (#10c9a0) with dark navy accents. Vary the design across the cells:
1 (top-left): tall rounded-rectangle head, spiky black hair, teal polo shirt, navy trousers.
2: bean-shaped head, side-swept black hair, teal hoodie, holding a small notebook.
3: square-ish head with rounded corners, short neat hair, round glasses, white shirt with teal tie.
4 (middle-left): tall blob head, messy black hair, teal t-shirt with a navy cross-body bag strap.
5 (center): egg-shaped head, short black hair with a cowlick, teal polo, thumbs-up pose.
6: wide rounded-rectangle head, teal cap worn backwards, teal t-shirt, navy shorts.
7 (bottom-left): tall head, side part hair, square glasses, teal cardigan over white shirt, holding a pointer stick.
8: bean head, curly black hair, teal varsity jacket, sneakers.
9 (bottom-right): minimal 'white figure' version: pure white blob head with only dot eyes and a small smile, no hair, teal scarf, stick body.\n\n${LAYOUT}`,
  cast: `${STYLE}\n\nNine different supporting characters for Vietnamese personal-finance and macroeconomics explainer videos (all fictional, ordinary people):
1 (top-left): young office worker, male, white shirt and navy tie, looking at a smartphone.
2: young woman investor, ponytail, coral blouse, holding a small tablet.
3: Vietnamese grandmother going to the market, grey hair bun, purple floral áo bà ba, holding a woven basket of vegetables.
4 (middle-left): small business owner of a bánh mì street stall, apron, holding a baguette.
5 (center): factory worker, blue overalls, yellow hard hat.
6: bank teller, neat uniform with name badge, holding a fan of banknotes.
7 (bottom-left): older economist professor, grey hair, glasses, brown tweed jacket, holding a chalk pointer.
8: student saver, school uniform, hugging a pink piggy bank.
9 (bottom-right): a small crowd of three plain 'white figures': featureless pure white blob heads with simple dot eyes, white bodies, stick limbs, used as background extras.\n\n${LAYOUT}`,
};

// An đã chọn: áo polo kiểu ô 1 nhưng màu trắng, tóc kiểu ô 7, logo DSC nhỏ ở ngực trái (ảnh đính kèm)
const AN_LOOK =
  "An, a cheerful young Vietnamese man who hosts a finance education channel. Body and head shape, clean white polo shirt cut and navy trousers exactly like the FIRST attached reference (tall rounded-rectangle blob head, stick arms), but the polo shirt is pure WHITE with a white collar and white placket buttons. " +
  "Hairstyle exactly like the SECOND attached reference: neat black hair with a side part and a smooth swept quiff (no glasses). " +
  "A small DSC logo printed on the LEFT chest of the polo (viewer's right side when he faces us), reproduced faithfully from the THIRD attached image: the word DSC in bright green (#22c55e) bold letters, small, about the width of his hand. No other text anywhere.";
const DETAIL = {
  an: {
    aspect: "16:9",
    refs: ["lab/out/char-grid/refs/host-1.png", "lab/out/char-grid/refs/host-7.png", "assets/brand/dsc-logo.png"],
    prompt: `${STYLE}

Character model sheet for ${AN_LOOK}

Layout on a pure white background, everything the same character and the same line style: on the left, a large full-body front view standing relaxed with a friendly smile; next to it a full-body three-quarter view waving one hand; on the right, a 2 by 2 block of four head-and-shoulders expressions: happy laughing with eyes closed, shocked with mouth open, thinking with a hand on chin, worried with a sweat drop. Even spacing, nothing cropped, no text or labels except the small DSC logo on the shirt.`,
  },
  cast2: {
    aspect: "1:1",
    numbered: true,
    refs: ["lab/out/char-grid/host.png"],
    prompt: `${STYLE}

Match the attached reference sheet exactly in body construction and line style: tall soft rounded-rectangle or bean blob heads, small torsos, and arms and legs drawn as THIN SINGLE BLACK STICK LINES with tiny round hands (no thick arms or legs). Natural human skin tones only (light, tan, brown), never blue, green or red skin.

Nine different supporting characters for Vietnamese personal-finance and macroeconomics explainer videos (all fictional, ordinary people), varied ages, genders, hairstyles and outfit colours:
1 (top-left): young office worker, male, white shirt and navy tie, looking at a smartphone.
2: young woman investor, ponytail, coral blouse, holding a small tablet showing a rising line chart.
3: Vietnamese grandmother going to the market, grey hair bun, purple floral áo bà ba, holding a woven basket of vegetables.
4 (middle-left): small business owner of a bánh mì street stall, apron, holding a baguette.
5 (center): factory worker, blue overalls, yellow hard hat.
6: bank teller, neat light-blue uniform with a blank name badge, holding a small fan of plain green banknotes with no symbols or text.
7 (bottom-left): older economist professor, grey hair, round glasses, brown jacket, holding a pointer.
8: student saver, Vietnamese school uniform, hugging a pink piggy bank.
9 (bottom-right): a small crowd of three plain 'white figures': pure white blob heads with dot eyes, white bodies, thin stick limbs, used as background extras.

${LAYOUT}`,
  },
};
for (const [k, v] of Object.entries(GRIDS)) DETAIL[k] ??= { aspect: "1:1", numbered: true, refs: [], prompt: v };

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : Object.keys(DETAIL).filter((k) => !fs.existsSync(path.join(OUT, `${k}.png`)));
const todo = only.filter((k) => DETAIL[k]);
console.log(`Model ${MODEL}, ảnh 2K, ${UNIT.toFixed(3)} USD/ảnh.`);
for (const k of todo) console.log(`  ${k}.png  (${DETAIL[k].aspect}${DETAIL[k].refs.length ? `, đính kèm ${DETAIL[k].refs.map((r) => path.basename(r)).join(", ")}` : ""})`);
console.log(`Tổng: ${todo.length} ảnh ≈ ${(todo.length * UNIT).toFixed(2)} USD.`);
if (!args.includes("--yes")) {
  console.log("Chưa gọi API. Thêm --yes để tạo.");
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const refPart = (file) => {
  const jpg = path.join(OUT, "refs", path.basename(file).replace(/\.png$/, ".jpg"));
  fs.mkdirSync(path.dirname(jpg), { recursive: true });
  execFileSync("sips", ["-s", "format", "jpeg", "-Z", "1024", file, "--out", jpg], { stdio: "ignore" });
  return { inlineData: { mimeType: "image/jpeg", data: fs.readFileSync(jpg).toString("base64") } };
};
async function generate({ prompt, refs, aspect }) {
  const token = await gcpAccessToken();
  const project = gcpProjectId();
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [...refs.map(refPart), { text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: aspect, imageSize: "2K" } },
  };
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-goog-user-project": project },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
      const text = await res.text();
      if (!(res.status === 429 || res.status >= 500) || attempt >= 4) throw new Error(`lỗi ${res.status} ${text.slice(0, 300)}`);
    } catch (e) {
      // lỗi mạng (fetch failed): chưa có ảnh trả về nên không tính phí, thử lại
      if (attempt >= 4 || /^lỗi \d/.test(e.message)) throw e;
    }
    await new Promise((r) => setTimeout(r, 15000 * attempt));
  }
}

let spent = 0;
await Promise.all(
  todo.map(async (k) => {
    const j = await generate(DETAIL[k]);
    const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!part) return console.log(`  ❌ ${k}: không trả ảnh (${j?.candidates?.[0]?.finishReason || "không rõ"})`);
    const dst = path.join(OUT, `${k}.png`);
    fs.writeFileSync(dst, Buffer.from(part.inlineData.data, "base64"));
    const u = j.usageMetadata || {};
    const img = (u.candidatesTokensDetails || []).filter((d) => d.modality === "IMAGE").reduce((a, d) => a + d.tokenCount, 0);
    const usd = ((u.promptTokenCount || 0) * 2 + img * 120 + ((u.candidatesTokenCount || 0) - img + (u.thoughtsTokenCount || 0)) * 12) / 1e6;
    spent += usd;
    // Đánh số ô 1–9 ở góc trên trái mỗi ô
    if (DETAIL[k].numbered) execFileSync("python3", [
      "-c",
      `from PIL import Image, ImageDraw, ImageFont
im = Image.open("${dst}").convert("RGB"); w, h = im.size; d = ImageDraw.Draw(im)
try: f = ImageFont.truetype("assets/fonts/Inter-ExtraBold.otf", w // 22)
except Exception: f = ImageFont.load_default()
for i in range(9):
    x, y = (i % 3) * w // 3 + w // 60, (i // 3) * h // 3 + h // 80
    r = w // 30
    d.ellipse([x, y, x + 2 * r, y + 2 * r], fill=(29, 26, 26))
    d.text((x + r, y + r), str(i + 1), font=f, fill="white", anchor="mm")
im.save("${dst.replace(/\.png$/, "-so.png")}")`,
    ]);
    console.log(`  ✅ ${dst} (${usd.toFixed(3)} USD)`);
  })
);
console.log(`Chi phí thực: ${spent.toFixed(3)} USD.`);
