#!/usr/bin/env node
// Đoạn thử ~30 giây "kiểu kênh hoạt hình lịch sử" cho chủ đề tỷ giá (khớp Tập 6):
// người dẫn rối đứng góc khung, cắt cảnh dày, mỗi lớp hình hiện đúng lúc lời đọc nhắc tới (mốc từng từ bằng Whisper),
// chữ tiêu đề hiện từng từ, bản đồ có mũi tên dòng đô la, nhân vật mặt cờ, tiếng động tổng hợp.
//
// Cách dùng:  node lab/fx-demo.mjs [--yes]   (--yes: cho phép gọi Gemini-TTS khi chưa có giọng trong cache)
//             cd lab/build/fx-demo/video-16x9 && npx hyperframes render --output ../../../out/fx-demo.mp4

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { loadEnv } from "../scripts/lib/env.mjs";
import { synthesize, resample, trimSilence, floatToWav } from "../scripts/lib/tts-providers.mjs";
import { readWav } from "../scripts/lib/wav.mjs";
import { whisperWords, alignScript, visemeCues } from "../scripts/lib/align.mjs";
import { synthSfx, mixdown } from "../scripts/lib/sound.mjs";
import { POSES, puppetSVG, pose, expr, lipSync, blinks, breathe, hop, gestureBeats } from "../scripts/lib/puppet.mjs";

loadEnv();
const OUT = "lab/build/fx-demo";
const DIR = path.join(OUT, "video-16x9");
const RATE = 24000;
const LEAD = 0.35;
const GAP = 0.3;
const INK = "#1d1a1a";
const NAVY = "#0B1237";
const TEAL = "#10F3BD";

const VOICE = {
  provider: "cloud-gemini",
  model: "gemini-2.5-pro-tts",
  voice: "Kore",
  style:
    "You are a lively Vietnamese YouTube explainer narrator in the style of animated history channels: playful, punchy, slightly brisk, with comic timing and clear emphasis on key words. Speak natural Vietnamese.",
};

const LINES = [
  "Quý này, Hàng không Cánh Diều bán vé đều như mọi khi. Vậy mà báo cáo lại ghi lỗ.",
  "Thủ phạm là một con số: tỷ giá tăng ba phần trăm.",
  "Tỷ giá là giá đô la Mỹ, tính bằng tiền đồng.",
  "Đô la chảy vào Việt Nam qua ba ngả: thặng dư thương mại, vốn FDI và kiều hối.",
  "Khi đô la chảy vào ít đi, mà nhu cầu đô la tăng lên, tiền đồng mất giá.",
  "Và khoản nợ đô la của Cánh Diều tự nhiên phình to.",
  "Chi tiết nằm trong bài viết bên dưới video.",
];

// ---------- 1. Giọng đọc (mỗi câu một lần gọi, có cache) ----------
fs.mkdirSync(path.join(OUT, "lines"), { recursive: true });
fs.mkdirSync(path.join(DIR, "vendor"), { recursive: true });
fs.mkdirSync(path.join(DIR, "fonts"), { recursive: true });
fs.cpSync("assets/fonts", path.join(DIR, "fonts"), { recursive: true });
fs.cpSync("assets/vendor/gsap.min.js", path.join(DIR, "vendor/gsap.min.js"));

const files = LINES.map((text, i) => {
  const key = crypto.createHash("sha1").update(JSON.stringify({ text, VOICE })).digest("hex").slice(0, 12);
  return path.join(OUT, "lines", `l${i + 1}-${key}.wav`);
});
const missing = files.filter((f) => !fs.existsSync(f));
if (missing.length) {
  const chars = LINES.filter((_, i) => missing.includes(files[i])).join(" ").length;
  console.log(`Cần tạo ${missing.length} câu (${chars} ký tự) bằng ${VOICE.model}, ước tính ~0,02 USD.`);
  if (!process.argv.includes("--yes")) {
    console.log("Chưa gọi API. Thêm --yes để tạo giọng.");
    process.exit(2);
  }
  for (const [i, f] of files.entries()) {
    if (fs.existsSync(f)) continue;
    const r = await synthesize(LINES[i], VOICE);
    fs.writeFileSync(f, floatToWav(trimSilence(resample(r.samples, r.sampleRate, RATE), RATE), RATE));
    process.stdout.write(".");
  }
  process.stdout.write("\n");
}

// Ghép giọng, lấy mốc từng từ (Whisper) cho mỗi câu
const lines = [];
let pos = LEAD;
const parts = files.map((f) => readWav(fs.readFileSync(f)).samples);
for (const [i, s] of parts.entries()) {
  const dur = s.length / RATE;
  const words = alignScript(LINES[i], whisperWords(files[i])).map((w) => ({ ...w, start: w.start + pos, end: w.end + pos }));
  lines.push({ text: LINES[i], start: pos, end: pos + dur, words });
  pos += dur + GAP;
}
const TOTAL = pos + 3.2; // giữ thẻ cuối
const voice = new Float32Array(Math.ceil(TOTAL * RATE));
lines.forEach((l, i) => voice.set(parts[i], Math.round(l.start * RATE)));
fs.writeFileSync(path.join(OUT, "voice.wav"), floatToWav(voice, RATE));

const T = (n) => Number(n.toFixed(3));
const norm = (w) => w.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
// Thời điểm lời đọc nói tới từ `word` (lần thứ n) trong câu li
function at(li, word, n = 0) {
  const hits = lines[li].words.filter((w) => norm(w.word) === norm(word));
  if (!hits[n]) throw new Error(`Không thấy từ "${word}" trong câu ${li + 1}`);
  return hits[n].start;
}
const [L1, L2, L3, L4, L5, L6, L7] = lines;

const anim = [];
const sfx = [];
const A = (...s) => anim.push(...s);
const popIn = (sel, t, { from = 0.3, ease = "back.out(2.2)", origin = "50% 50%", kind = "pop" } = {}) => {
  A(`tl.fromTo("${sel}", { opacity: 0, scale: ${from}, transformOrigin: "${origin}" }, { opacity: 1, scale: 1, duration: 0.32, ease: "${ease}" }, ${T(t)});`);
  if (kind) sfx.push({ t, kind });
};

// ---------- 2. Cảnh ----------
// Cắt cảnh: mỗi cảnh hiện từ mốc của nó tới mốc cảnh sau
const CUTS = [
  ["s1", 0],
  ["s2", L2.start - 0.12],
  ["s3", L3.start - 0.12],
  ["s4", L4.start - 0.12],
  ["s5", at(4, "tiền") - 0.08],
  ["s6", L6.start - 0.12],
  ["s7", L7.start - 0.12],
];
CUTS.forEach(([id, t], i) => {
  A(`tl.set("#${id}", { opacity: 1 }, ${T(t)});`);
  if (CUTS[i + 1]) A(`tl.set("#${id}", { opacity: 0 }, ${T(CUTS[i + 1][1])});`);
});

// --- Cảnh 1: Cánh Diều bán vé đều nhưng báo cáo lỗ
const ticket = (id, x, y, r) => `<g id="${id}" opacity="0" transform="translate(${x} ${y}) rotate(${r})">
  <rect x="-80" y="-40" width="160" height="80" rx="10" fill="#fff6dc" stroke="${INK}" stroke-width="6"/>
  <line x1="40" y1="-40" x2="40" y2="40" stroke="${INK}" stroke-width="4" stroke-dasharray="8 7"/>
  <path d="M-52 4 L-6 -8 L10 -26 L18 -24 L12 -4 L32 0 L36 -8 L42 -6 L38 6 L40 18 L34 18 L30 10 L10 12 L14 30 L6 32 L-6 14 L-48 14 Z" fill="#3f7fc2"/>
  <text x="62" y="10" font-family="Inter" font-weight="800" font-size="22" fill="${INK}" text-anchor="middle">VÉ</text></g>`;
const report = (id) => `<g transform="translate(800 520) rotate(-4)"><g id="${id}" opacity="0">
  <rect x="-170" y="-210" width="340" height="420" rx="8" fill="#fff" stroke="${INK}" stroke-width="7"/>
  <text x="0" y="-150" font-family="Inter" font-weight="800" font-size="34" fill="${INK}" text-anchor="middle">BÁO CÁO QUÝ</text>
  ${[0, 1, 2, 3, 4].map((k) => `<rect x="-130" y="${-110 + k * 44}" width="${[260, 200, 240, 170, 220][k]}" height="14" rx="7" fill="#d9d3c7"/>`).join("")}
  <g transform="translate(10 110) rotate(-14)"><g id="${id}-stamp" opacity="0"><rect x="-120" y="-56" width="240" height="112" rx="14" fill="none" stroke="#d8342a" stroke-width="12"/><text x="0" y="32" font-family="Inter" font-weight="800" font-size="88" fill="#d8342a" text-anchor="middle">LỖ</text></g></g>
</g></g>`;
const nameTag = (id, x, y, text, sub, tx, ty) => `<g id="${id}" opacity="0">
  <text x="${x}" y="${y}" font-family="Inter" font-weight="800" font-size="40" fill="${INK}" text-anchor="middle">${text}</text>
  <text x="${x}" y="${y + 36}" font-family="Inter" font-weight="600" font-size="26" fill="#8a7f72" text-anchor="middle">${sub}</text>
  <path d="M${x + 60} ${y + 50} Q${(x + tx) / 2 + 40} ${(y + ty) / 2 + 30} ${tx} ${ty}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <path d="M${tx} ${ty} l-6 -22 M${tx} ${ty} l-22 -4" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>`;

const s1 = `<svg viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#fbf6ec"/><rect y="1010" width="1920" height="70" fill="#efe4cf"/><line x1="0" y1="1010" x2="1920" y2="1010" stroke="${INK}" stroke-width="5"/>
  <g id="pilot1wrap">${puppetSVG("p1", "pilot", { x: 1420, y: 1010, dir: -1, scale: 0.95 })}</g>
  ${nameTag("tag1", 1180, 190, "Hàng không Cánh Diều", "(doanh nghiệp giả định)", 1370, 330)}
  ${ticket("tk1", 760, 360, -8)}${ticket("tk2", 980, 300, 5)}${ticket("tk3", 1190, 420, -3)}
  ${report("rep1")}
</svg>`;
const p1In = at(0, "hàng") - 0.1;
A(`tl.fromTo("#pilot1wrap", { x: 700 }, { x: 0, duration: 0.45, ease: "power3.out" }, ${T(p1In)});`);
sfx.push({ t: p1In, kind: "whoosh" });
A(...pose("p1", "idle", 0), ...expr("p1", "happy", 0), ...breathe("p1", L2.start, 0.3), ...blinks("p1", L2.start, 0.5));
popIn("#tag1", at(0, "cánh"), { from: 0.8, ease: "power2.out", kind: "tap" });
["tk1", "tk2", "tk3"].forEach((id, k) => popIn(`#${id}`, at(0, "vé") + k * 0.16));
A(...pose("p1", "explain", at(0, "vé")));
A(`tl.to("#tk1, #tk2, #tk3", { opacity: 0, duration: 0.2 }, ${T(at(0, "báo") - 0.15)});`);
A(`tl.to("#tag1", { opacity: 0, duration: 0.2 }, ${T(at(0, "báo") - 0.15)});`);
A(`tl.fromTo("#rep1", { opacity: 0, y: 300 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, ${T(at(0, "báo") - 0.1)});`);
sfx.push({ t: at(0, "báo") - 0.1, kind: "slide" });
A(`tl.fromTo("#rep1-stamp", { opacity: 0, scale: 2.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.16, ease: "power4.in" }, ${T(at(0, "lỗ") - 0.06)});`);
sfx.push({ t: at(0, "lỗ") + 0.08, kind: "stamp" });
A(...pose("p1", "headHold", at(0, "lỗ")), ...expr("p1", "sad", at(0, "lỗ")), ...hop("p1", at(0, "lỗ"), 14));

// --- Cảnh 2: thủ phạm là tỷ giá tăng 3%
const s2 = `<div class="dark">
  <div class="kw k1" id="w-thu">THỦ PHẠM</div>
  <div class="kw k2" id="w-tygia">TỶ GIÁ</div>
  <div class="kw k3" id="w-3">+3%</div>
</div>`;
popIn("#w-thu", at(1, "thủ"), { from: 0.6, kind: "tap" });
popIn("#w-tygia", at(1, "tỷ"), { from: 1.6, ease: "power3.out", kind: "hit" });
sfx.push({ t: at(1, "ba") - 0.8, kind: "riser" });
popIn("#w-3", at(1, "ba"), { from: 2.6, ease: "power4.out", kind: "hit" });
A(`tl.fromTo("#s2", { x: -14 }, { x: 0, duration: 0.3, ease: "elastic.out(1.2, 0.3)" }, ${T(at(1, "ba") + 0.12)});`);

// --- Cảnh 3 và 5: hai quả bóng mặt cờ
function flagBall(id, kind, cx, cy, r) {
  const flag =
    kind === "vn"
      ? `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" fill="#da251d"/><path transform="scale(${r / 100})" d="M0 -52 L12.2 -16.8 L49.5 -16.1 L19.8 6.4 L30.6 42.1 L0 20.8 L-30.6 42.1 L-19.8 6.4 L-49.5 -16.1 L-12.2 -16.8 Z" fill="#ffde00"/>`
      : `${Array.from({ length: 13 }, (_, k) => `<rect x="${-r}" y="${-r + (k * 2 * r) / 13}" width="${2 * r}" height="${(2 * r) / 13 + 0.5}" fill="${k % 2 ? "#fff" : "#b22234"}"/>`).join("")}
         <rect x="${-r}" y="${-r}" width="${r * 1.05}" height="${r * 1.08}" fill="#3c3b6e"/>
         ${Array.from({ length: 12 }, (_, k) => `<circle cx="${-r + 18 + (k % 4) * (r / 4.2)}" cy="${-r + 22 + Math.floor(k / 4) * (r / 3.4)}" r="${r / 28}" fill="#fff"/>`).join("")}`;
  return `<g id="${id}" transform="translate(${cx} ${cy})"><g id="${id}-body">
    <ellipse cx="0" cy="${r + 18}" rx="${r * 0.8}" ry="14" fill="${INK}" opacity="0.12"/>
    <clipPath id="${id}-clip"><circle r="${r}"/></clipPath>
    <g clip-path="url(#${id}-clip)">${flag}</g>
    <circle r="${r}" fill="none" stroke="${INK}" stroke-width="8"/>
    <g class="${id}-eyes-ok"><ellipse cx="${-r * 0.32}" cy="${-r * 0.12}" rx="${r * 0.16}" ry="${r * 0.2}" fill="#fff" stroke="${INK}" stroke-width="6"/><ellipse cx="${r * 0.32}" cy="${-r * 0.12}" rx="${r * 0.16}" ry="${r * 0.2}" fill="#fff" stroke="${INK}" stroke-width="6"/></g>
    <g class="${id}-eyes-worried" opacity="0"><path d="M${-r * 0.48} ${-r * 0.06} Q${-r * 0.32} ${-r * 0.3} ${-r * 0.16} ${-r * 0.06} Z" fill="#fff" stroke="${INK}" stroke-width="6"/><path d="M${r * 0.16} ${-r * 0.06} Q${r * 0.32} ${-r * 0.3} ${r * 0.48} ${-r * 0.06} Z" fill="#fff" stroke="${INK}" stroke-width="6"/>
      <path d="M${-r * 0.52} ${-r * 0.42} L${-r * 0.16} ${-r * 0.32} M${r * 0.16} ${-r * 0.32} L${r * 0.52} ${-r * 0.42}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/></g>
    <g class="${id}-eyes-smug" opacity="0"><path d="M${-r * 0.48} ${-r * 0.12} L${-r * 0.16} ${-r * 0.12} Q${-r * 0.32} ${r * 0.08} ${-r * 0.48} ${-r * 0.12} Z" fill="#fff" stroke="${INK}" stroke-width="6"/><path d="M${r * 0.16} ${-r * 0.12} L${r * 0.48} ${-r * 0.12} Q${r * 0.32} ${r * 0.08} ${r * 0.16} ${-r * 0.12} Z" fill="#fff" stroke="${INK}" stroke-width="6"/></g>
    <path id="${id}-sweat" opacity="0" d="M${r * 0.78} ${-r * 0.7} Q${r * 0.98} ${-r * 0.4} ${r * 0.88} ${-r * 0.3} Q${r * 0.74} ${-r * 0.22} ${r * 0.66} ${-r * 0.36} Q${r * 0.62} ${-r * 0.5} ${r * 0.78} ${-r * 0.7} Z" fill="#8fd3ff" stroke="${INK}" stroke-width="5"/>
  </g></g>`;
}
const s3 = `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="#fbf6ec"/>
  <text id="t3h" opacity="0" x="1060" y="210" font-family="Inter" font-weight="800" font-size="92" fill="${INK}" text-anchor="middle">TỶ GIÁ</text>
  ${flagBall("usd", "us", 800, 560, 170)}${flagBall("vnd", "vn", 1340, 560, 170)}
  <text id="eq" opacity="0" x="1070" y="590" font-family="Inter" font-weight="800" font-size="110" fill="${INK}" text-anchor="middle">=</text>
  <text id="lab-usd" opacity="0" x="800" y="830" font-family="Inter" font-weight="800" font-size="48" fill="${INK}" text-anchor="middle">1 đô la Mỹ</text>
  <text id="lab-vnd" opacity="0" x="1340" y="830" font-family="Inter" font-weight="800" font-size="48" fill="#da251d" text-anchor="middle">? đồng</text>
</svg>`;
A(`tl.set("#usd, #vnd", { opacity: 0 }, 0);`);
popIn("#t3h", at(2, "tỷ", 0), { from: 0.7, kind: "tap" });
popIn("#usd", at(2, "đô"), { from: 0.2, ease: "back.out(2.6)" });
popIn("#lab-usd", at(2, "mỹ"), { from: 0.7, kind: null });
popIn("#eq", at(2, "tính"), { from: 0.5, kind: "tap" });
popIn("#vnd", at(2, "tiền"), { from: 0.2, ease: "back.out(2.6)" });
popIn("#lab-vnd", at(2, "đồng"), { from: 0.7, kind: null });

// --- Cảnh 4: bản đồ, ba dòng đô la chảy vào Việt Nam
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const countries = feature(topo, topo.objects.countries).features;
const proj = geoMercator()
  .rotate([-178, 0])
  .fitExtent([[600, 130], [1860, 900]], { type: "MultiPoint", coordinates: [[97, 6], [-70, 47], [142, 45], [-124, 27]] });
const gp = geoPath(proj).digits(1);
const COLOR = { 704: "#e24b3b", 840: "#4a6fd1", 410: "#f0b24a", 392: "#f0b24a" };
const land = countries
  .map((f) => {
    const d = gp(f);
    if (!d) return "";
    const [[x0, y0], [x1, y1]] = gp.bounds(f);
    if (x1 < -50 || x0 > 1970 || y1 < -50 || y0 > 1130 || x1 - x0 > 1900) return ""; // ngoài khung hoặc bị cắt qua kinh tuyến đổi ngày
    return `<path d="${d}" fill="${COLOR[+f.id] || "#f1e6cb"}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  })
  .join("");
const P = (lon, lat) => proj([lon, lat]).map((v) => +v.toFixed(1));
const VN = P(106.5, 15.5);
const arcs = [];
function arc(id, from, to, bend, color, label, labelAt, t0, coins = true) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const len0 = Math.hypot(x1 - x0, y1 - y0);
  const cx = mx + (-(y1 - y0) / len0) * bend;
  const cy = my + ((x1 - x0) / len0) * bend;
  const pt = (t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
  let len = 0;
  for (let k = 1; k <= 60; k++) len += Math.hypot(pt(k / 60)[0] - pt((k - 1) / 60)[0], pt(k / 60)[1] - pt((k - 1) / 60)[1]);
  len = Math.ceil(len);
  // Đầu mũi tên theo hướng tiếp tuyến cuối
  const ang = (Math.atan2(y1 - cy, x1 - cx) * 180) / Math.PI;
  const d = `M${x0} ${y0} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1}`;
  const [lx, ly] = pt(labelAt);
  const coinEls = coins
    ? [0, 1, 2].map((k) => `<g id="${id}-c${k}" opacity="0" transform="translate(${x0} ${y0})"><circle r="17" fill="#ffd34d" stroke="${INK}" stroke-width="4"/><text y="8" font-family="Inter" font-weight="800" font-size="22" fill="${INK}" text-anchor="middle">$</text></g>`).join("")
    : "";
  arcs.push(`<g id="${id}">
    <path id="${id}-o" d="${d}" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>
    <path id="${id}-p" d="${d}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>
    <g id="${id}-head" opacity="0" transform="translate(${x1} ${y1}) rotate(${ang.toFixed(1)})"><path d="M8 0 L-34 -24 L-24 0 L-34 24 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>
    ${coinEls}
    <g id="${id}-lab" opacity="0" transform="translate(${lx.toFixed(0)} ${ly.toFixed(0)})"><rect x="${-label.length * 13 - 22}" y="-34" width="${label.length * 26 + 44}" height="64" rx="32" fill="#fff" stroke="${INK}" stroke-width="5"/><text y="12" font-family="Inter" font-weight="800" font-size="36" fill="${INK}" text-anchor="middle">${label}</text></g>
  </g>`);
  A(`tl.to("#${id}-o, #${id}-p", { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, ${T(t0)});`);
  A(`tl.fromTo("#${id}-head", { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2.5)" }, ${T(t0 + 0.6)});`);
  popIn(`#${id}-lab`, t0 + 0.15, { from: 0.5, kind: null });
  sfx.push({ t: t0, kind: "swish" });
  if (coins) {
    const pts = Array.from({ length: 13 }, (_, k) => pt(k / 12));
    [0, 1, 2].forEach((k) => {
      const tk = t0 + 0.7 + k * 0.45;
      A(`tl.set("#${id}-c${k}", { opacity: 1 }, ${T(tk)});`);
      A(`tl.to("#${id}-c${k}", { keyframes: [${pts.map(([x, y]) => `{ attr: { transform: "translate(${x.toFixed(1)} ${y.toFixed(1)})" }, duration: 0.09, ease: "none" }`).join(", ")}] }, ${T(tk)});`);
      A(`tl.set("#${id}-c${k}", { opacity: 0 }, ${T(tk + 1.08)});`);
    });
  }
}
arc("a-trade", P(-98, 40), [VN[0] + 30, VN[1] - 30], -170, "#4ac08a", "Thặng dư thương mại", 0.5, at(3, "thặng") - 0.1);
arc("a-fdi", P(128, 36.5), [VN[0] + 26, VN[1] - 42], -40, "#f0b24a", "Vốn FDI", 0.12, at(3, "fdi") - 0.25);
arc("a-kh", P(-118, 34), [VN[0] + 26, VN[1] + 10], 150, "#9b7ae0", "Kiều hối", 0.55, at(3, "kiều") - 0.1);
const vnLabel = `<g id="vnlab" transform="translate(${VN[0] - 90} ${VN[1] - 120})"><rect x="-110" y="-34" width="220" height="64" rx="12" fill="${NAVY}" stroke="${INK}" stroke-width="4"/><text y="12" font-family="Inter" font-weight="800" font-size="34" fill="#fff" text-anchor="middle">VIỆT NAM</text></g>`;
const s4 = `<div id="mapcam"><svg viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect x="-400" y="-300" width="2720" height="1680" fill="#a9d6ea"/>${land}${vnLabel}
  ${arcs.join("")}
  <g id="a-out-wrap"></g>
</svg></div>`;
const mapZoom = (cx, cy, z, t, dur, ease = "power2.inOut") =>
  A(`tl.to("#mapcam", { x: ${T(960 - cx * z)}, y: ${T(540 - cy * z)}, scale: ${z}, duration: ${dur}, ease: "${ease}" }, ${T(t)});`);
A(`tl.set("#mapcam", { transformOrigin: "0 0", x: ${T(960 - VN[0] * 2.4)}, y: ${T(540 - VN[1] * 2.4)}, scale: 2.4 }, 0);`);
// Chuyển cảnh đẩy ngang (bản đồ trượt vào), rồi lùi máy quay ra toàn Thái Bình Dương
A(`tl.fromTo("#s4", { xPercent: 100 }, { xPercent: 0, duration: 0.35, ease: "power3.out" }, ${T(CUTS[3][1])});`);
A(`tl.to("#s3", { xPercent: -100, duration: 0.35, ease: "power3.out" }, ${T(CUTS[3][1])});`);
A(`tl.set("#s3", { opacity: 1 }, ${T(CUTS[3][1])});`, `tl.set("#s3", { opacity: 0 }, ${T(CUTS[3][1] + 0.36)});`);
sfx.push({ t: CUTS[3][1], kind: "whoosh" });
mapZoom(960, 540, 1, at(3, "thặng") - 0.7, 0.8);

// --- Cảnh 4 (tiếp): đô la vào ít đi, nhu cầu đô la tăng → mũi tên đỏ chảy ra
const outArc = (() => {
  const before = arcs.length;
  arc("a-out", [VN[0] + 40, VN[1] + 20], P(-104, 30), 230, "#d8342a", "Nhu cầu đô la", 0.5, at(4, "nhu") - 0.1, true);
  return arcs.splice(before, 1)[0];
})();
A(`tl.to("#a-trade, #a-fdi, #a-kh", { opacity: 0.25, duration: 0.4 }, ${T(at(4, "ít") - 0.1)});`);
sfx.push({ t: at(4, "ít") - 0.1, kind: "slide" });

// --- Cảnh 5: tiền đồng mất giá
const s5 = `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="#fbf6ec"/>
  <g id="s5cam">${flagBall("usd2", "us", 920, 560, 170)}${flagBall("vnd2", "vn", 1470, 600, 170)}</g>
  <g id="mg" opacity="0" transform="translate(1060 210) rotate(-4)"><rect x="-470" y="-74" width="940" height="128" rx="16" fill="#d8342a" stroke="${INK}" stroke-width="7"/><text y="30" font-family="Inter" font-weight="800" font-size="80" fill="#fff" text-anchor="middle">TIỀN ĐỒNG MẤT GIÁ</text></g>
</svg>`;
const tMat = at(4, "mất");
A(`tl.set(".usd2-eyes-ok", { opacity: 0 }, ${T(CUTS[4][1])});`, `tl.set(".usd2-eyes-smug", { opacity: 1 }, ${T(CUTS[4][1])});`);
A(`tl.to("#usd2-body", { scale: 1.22, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2)" }, ${T(CUTS[4][1] + 0.1)});`);
A(`tl.to("#vnd2-body", { scale: 0.68, transformOrigin: "50% 50%", duration: 0.5, ease: "power2.inOut" }, ${T(tMat - 0.1)});`);
A(`tl.set(".vnd2-eyes-ok", { opacity: 0 }, ${T(tMat - 0.1)});`, `tl.set(".vnd2-eyes-worried", { opacity: 1 }, ${T(tMat - 0.1)});`);
A(`tl.fromTo("#vnd2-sweat", { opacity: 0, y: -10 }, { opacity: 1, y: 6, duration: 0.5, ease: "power1.in" }, ${T(tMat + 0.2)});`);
A(`tl.fromTo("#mg", { opacity: 0, scale: 2.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, ${T(tMat)});`);
sfx.push({ t: tMat + 0.16, kind: "stamp" });
// Đẩy nhanh máy quay vào quả bóng tiền đồng (nhịp hài)
A(`tl.to("#s5cam", { scale: 1.35, x: -830, y: -250, transformOrigin: "0 0", duration: 0.22, ease: "power3.out" }, ${T(tMat + 0.45)});`);
sfx.push({ t: tMat + 0.45, kind: "snap" });

// --- Cảnh 6: khoản nợ đô la phình to
const sack = `<g id="sack" transform="translate(1520 760)"><g id="sack-body">
  <path d="M-40 -170 Q0 -196 40 -170 L24 -140 Q120 -110 130 10 Q134 150 0 156 Q-134 150 -130 10 Q-120 -110 -24 -140 Z" fill="#b98b55" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M-34 -146 Q0 -130 34 -146" fill="none" stroke="${INK}" stroke-width="7"/>
  <text y="60" font-family="Inter" font-weight="800" font-size="130" fill="#2d6b3c" text-anchor="middle">$</text></g>
  <text y="-210" font-family="Inter" font-weight="800" font-size="38" fill="${INK}" text-anchor="middle">Nợ đô la</text></g>`;
const s6 = `<svg viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#fbf6ec"/><rect y="1010" width="1920" height="70" fill="#efe4cf"/><line x1="0" y1="1010" x2="1920" y2="1010" stroke="${INK}" stroke-width="5"/>
  ${puppetSVG("p2", "pilot", { x: 1060, y: 1010, dir: 1, scale: 0.95 })}
  ${sack}
  <g transform="translate(1520 330)"><rect x="-210" y="-60" width="420" height="104" rx="18" fill="${NAVY}" stroke="${INK}" stroke-width="6"/>
  <text id="debt" y="12" font-family="Inter" font-weight="800" font-size="54" fill="${TEAL}" text-anchor="middle">250 tỷ đồng</text></g>
  <text x="1520" y="420" font-family="Inter" font-weight="600" font-size="26" fill="#8a7f72" text-anchor="middle">quy đổi ra tiền đồng · số liệu giả định</text>
</svg>`;
const tPhinh = at(5, "phình");
A(...pose("p2", "idle", 0), ...expr("p2", "neutral", 0), ...blinks("p2", TOTAL, 0.2));
[250, 251.5, 253, 254.5, 256, 257.5].forEach((v, k) =>
  A(`tl.set("#debt", { textContent: "${String(v).replace(".", ",")} tỷ đồng" }, ${T(tPhinh - 0.2 + k * 0.12)});`)
);
sfx.push(...[0, 1, 2, 3, 4].map((k) => ({ t: tPhinh - 0.2 + k * 0.12, kind: "tick" })), { t: tPhinh + 0.45, kind: "ding" });
A(`tl.to("#sack-body", { scale: 1.4, transformOrigin: "50% 100%", duration: 0.7, ease: "elastic.out(1.1, 0.4)" }, ${T(tPhinh - 0.2)});`);
A(...pose("p2", "gasp", tPhinh - 0.1), ...expr("p2", "surprised", tPhinh - 0.1), ...hop("p2", tPhinh - 0.1, 18));

// --- Cảnh 7: thẻ cuối
const s7 = `<div class="end">
  <div class="end-brand"><b>DSC</b> Academy</div>
  <h2>Tỷ giá và ngoại hối</h2>
  <div class="end-cta">Đọc bài viết bên dưới video</div>
  <div class="end-disc">Doanh nghiệp và số liệu trong video là giả định, chỉ nhằm minh hoạ. Không phải khuyến nghị đầu tư.</div>
</div>`;
A(`tl.fromTo(".end > *", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "power2.out" }, ${T(CUTS[6][1])});`);

// ---------- 3. Người dẫn An: góc dưới trái, nói theo lời đọc ----------
const host = `<svg viewBox="0 0 1920 1080" width="1920" height="1080">${puppetSVG("host", "an", { x: 230, y: 1250, dir: 1, scale: 0.92 })}</svg>`;
A(...pose("host", "explain", 0), ...expr("host", "happy", 0), ...breathe("host", TOTAL), ...blinks("host", TOTAL, 0.9));
const hostPlan = [
  ["explain", "happy"],
  ["point", "excited"],
  ["explain", "happy"],
  ["point", "happy"],
  ["shrug", "sad"],
  ["count", "surprised"],
  ["wave", "happy"],
];
lines.forEach((l, i) => {
  const [p, e] = hostPlan[i];
  A(...pose("host", p, l.start - 0.15), ...expr("host", e, l.start - 0.15));
  A(...lipSync("host", visemeCues(l.words), "smile", { from: l.start, to: l.end }));
  if (p === "explain") A(...gestureBeats("host", p, l.start, l.end, 0.9));
});
A(...pose("host", "shrug", tMat - 0.1), ...expr("host", "sad", tMat - 0.1));
A(`tl.to("#hostwrap", { y: 120, duration: 0.35, ease: "power2.in" }, ${T(CUTS[6][1] + 1.6)});`);

// Mốc thời gian góc trên trái (chỉ ở cảnh doanh nghiệp)
A(`tl.fromTo("#stamp", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, ${T(at(0, "quý"))});`);
A(`tl.set("#stamp", { opacity: 0 }, ${T(CUTS[1][1])});`, `tl.set("#stamp", { opacity: 1 }, ${T(CUTS[5][1])});`, `tl.set("#stamp", { opacity: 0 }, ${T(CUTS[6][1])});`);

// ---------- 4. Phụ đề theo mốc từng từ (cắt ở dấu câu, tối đa 11 từ) ----------
const caps = [];
for (const l of lines.slice(0, 6)) {
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    caps.push({ start: cur[0].start, end: cur.at(-1).end, text: cur.map((w) => w.word).join(" ") });
    cur = [];
  };
  for (const w of l.words) {
    cur.push(w);
    if (/[,.:;!?]$/.test(w.word) || cur.length >= 12) flush();
  }
  flush();
}
const capHtml = caps
  .map((c, i) => {
    const end = caps[i + 1] && caps[i + 1].start - c.end < 0.6 ? caps[i + 1].start : c.end + 0.3;
    return `<div class="clip cap" id="cap${i}" data-start="${T(c.start)}" data-duration="${T(end - c.start)}" data-track-index="3"><span class="cap-text">${c.text}</span></div>`;
  })
  .join("\n      ");

// ---------- 5. Âm thanh: giọng + tiếng động ----------
fs.writeFileSync(path.join(OUT, "sfx.wav"), synthSfx(sfx, TOTAL));
mixdown({ voice: path.join(OUT, "voice.wav"), sfx: path.join(OUT, "sfx.wav"), total: TOTAL, out: path.join(DIR, "audio.wav"), sfxVol: 1.1 });

// ---------- 6. HTML ----------
const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Bản thử hiệu ứng · tỷ giá</title>
    <script src="vendor/gsap.min.js"></script>
    <style>
@font-face { font-family: "Inter"; src: url("fonts/Inter-SemiBold.otf") format("opentype"); font-weight: 600; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-ExtraBold.otf") format("opentype"); font-weight: 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: #fbf6ec; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Inter", sans-serif; background: #fbf6ec; }
.scn { position: absolute; inset: 0; overflow: hidden; opacity: 0; }
#mapcam { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.dark { position: absolute; inset: 0; background: radial-gradient(circle at 60% 40%, #1c2a6b, ${NAVY} 70%); }
.kw { position: absolute; left: 0; right: 0; text-align: center; font-weight: 800; opacity: 0; letter-spacing: -0.01em; }
.k1 { top: 150px; font-size: 64px; color: #c9d0e3; padding-left: 300px; }
.k2 { top: 250px; font-size: 200px; color: ${TEAL}; padding-left: 300px; }
.k3 { top: 500px; font-size: 260px; color: #ff9f2e; padding-left: 300px; text-shadow: 0 10px 0 #7a3a00; }
#host-layer { position: absolute; inset: 0; z-index: 800; pointer-events: none; }
.brand { position: absolute; z-index: 900; right: 60px; top: 44px; font-size: 26px; font-weight: 600; color: ${INK}; background: rgba(255,255,255,0.85); padding: 6px 12px; border-radius: 10px; }
.brand b { background: ${NAVY}; color: ${TEAL}; padding: 3px 9px; border-radius: 7px; font-weight: 800; }
#stamp { position: absolute; z-index: 900; left: 56px; top: 40px; font-size: 64px; font-weight: 800; color: ${INK}; opacity: 0; }
.cap { position: absolute; z-index: 1000; left: 520px; right: 60px; bottom: 50px; display: flex; justify-content: center; }
.cap-text { display: inline-block; max-width: 1240px; font-size: 44px; font-weight: 600; line-height: 1.3; text-align: center; color: #fff;
  padding: 10px 26px; border-radius: 14px; background: rgba(20,16,16,0.75); }
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; text-align: center;
  background: radial-gradient(circle at 50% 40%, #1c2a6b, ${NAVY} 70%); color: #fff; padding: 0 160px; }
.end-brand { font-size: 52px; font-weight: 800; } .end-brand b { background: #fff; color: ${NAVY}; padding: 2px 16px; border-radius: 12px; }
.end h2 { font-size: 100px; font-weight: 800; letter-spacing: -0.02em; }
.end-cta { font-size: 46px; font-weight: 800; color: ${NAVY}; background: ${TEAL}; padding: 20px 56px; border-radius: 60px; }
.end-disc { font-size: 26px; color: #c9d0e3; max-width: 1100px; line-height: 1.4; }
</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T(TOTAL)}" data-width="1920" data-height="1080">
      <div class="brand"><b>DSC</b> Academy</div>
      <div id="stamp">QUÝ NÀY</div>
      <div class="scn" id="s1">${s1}</div>
      <div class="scn" id="s2">${s2}</div>
      <div class="scn" id="s3">${s3}</div>
      <div class="scn" id="s4">${s4}</div>
      <div class="scn" id="s5">${s5}</div>
      <div class="scn" id="s6">${s6}</div>
      <div class="scn" id="s7" style="z-index:850">${s7}</div>
      <div id="host-layer"><div id="hostwrap">${host}</div></div>
      ${capHtml}
      <audio id="soundtrack" src="audio.wav" data-start="0" data-duration="${T(TOTAL)}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${anim.join("\n      ")}
      tl.set({}, {}, ${T(TOTAL)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
// Mũi tên "nhu cầu đô la" nằm trên bản đồ, chèn vào sau khi đã dựng
fs.writeFileSync(path.join(DIR, "index.html"), html.replace('<g id="a-out-wrap"></g>', outArc));
console.log(`Xong: ${DIR}/index.html (${TOTAL.toFixed(1)}s, ${lines.reduce((a, l) => a + l.words.length, 0)} từ có mốc, ${anim.length} lệnh hoạt cảnh, ${sfx.length} tiếng động)`);
