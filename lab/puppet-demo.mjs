#!/usr/bin/env node
// Bản thử hoạt hình rối (cut-out): Minh và bà Tư nói chuyện về tờ một trăm nghìn trong lọ.
// Dùng lại giọng đã tạo của phim "Chiếc lọ của bà" (không gọi API), nhép miệng theo mốc từng từ của Whisper (chạy trên máy).
//
// Cách dùng:  [BG=house-a|house-b] [LIPS=envelope] node lab/puppet-demo.mjs
//             cd lab/build/puppet-demo/video-16x9 && npx hyperframes render --output ../../../out/puppet-demo.mp4

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readWav } from "../scripts/lib/wav.mjs";
import { WHISPER_MODEL, whisperWords, alignScript, visemeCues } from "../scripts/lib/align.mjs";
import { POSES, puppetSVG, pose, expr, lipSync, blinks, breathe, hop, gestureBeats } from "../scripts/lib/puppet.mjs";

const SRC = "videos/story-chiec-lo-cua-ba";
const OUT = "lab/build/puppet-demo";
// BG=house-a|house-b: dùng ảnh nền Nano Banana (lab/puppet-bg.mjs) thay cho nền SVG
const BG = process.env.BG;
const GROUND = { "house-a": 1000, "house-b": 985 }[BG] ?? 1012;
const DIR = path.join(OUT, BG ? `video-16x9-${BG}` : "video-16x9");
const LEAD = 1.6;
const GAP = 0.45;
const END_CARD = 5;

// Câu thoại lấy từ voice.wav của phim gốc (giây)
const LINES = [
  { who: "minh", name: "Minh", from: 15.416, to: 18.567, text: "Bà ơi, trong lọ có tiền nè! Của bà cất hồi nào vậy?" },
  { who: "ba", name: "Bà Tư", from: 18.967, to: 25.188, text: "Hồi đó, chừng ấy đủ cho con ăn hai tô phở, còn dư ly chè đó." },
  { who: "minh", name: "Minh", from: 31.088, to: 35.084, text: "Giờ tờ này chỉ đủ một tô, mà không có chè luôn bà ơi." },
  { who: "ba", name: "Bà Tư", from: 44.901, to: 49.298, text: "Vậy tiền để trong lọ, tự nó teo lại hả con?" },
];

fs.mkdirSync(path.join(OUT, "lines"), { recursive: true });
fs.mkdirSync(path.join(DIR, "fonts"), { recursive: true });
fs.mkdirSync(path.join(DIR, "vendor"), { recursive: true });
fs.cpSync("assets/fonts", path.join(DIR, "fonts"), { recursive: true });
fs.cpSync("assets/vendor/gsap.min.js", path.join(DIR, "vendor/gsap.min.js"));

if (BG) fs.cpSync(path.join(OUT, "bg", `${BG}.png`), path.join(DIR, "bg.png"));

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} lỗi:\n${r.stderr}`);
  return r.stdout;
};

// Mặc định dùng Whisper; LIPS=envelope (hoặc máy chưa có whisper-cli) thì đoán theo độ to giọng.
const useWhisper = process.env.LIPS !== "envelope" && spawnSync("whisper-cli", ["--help"]).status === 0 && fs.existsSync(WHISPER_MODEL);

// Dự phòng khi không có Whisper: đoán hình miệng theo độ to của giọng (mỗi khung 1/24 giây).
function envelopeCues(wav) {
  const { samples, sampleRate } = readWav(fs.readFileSync(wav));
  const step = Math.round(sampleRate / 24);
  const rms = [];
  for (let i = 0; i < samples.length; i += step) {
    let a = 0;
    for (let j = i; j < Math.min(i + step, samples.length); j++) a += samples[j] * samples[j];
    rms.push(Math.sqrt(a / step));
  }
  const peak = Math.max(...rms) || 1;
  const cues = [];
  rms.forEach((v, k) => {
    const n = v / peak;
    const value = n < 0.06 ? "X" : n < 0.2 ? "B" : n < 0.45 ? (k % 3 ? "C" : "E") : "D";
    if (cues.at(-1)?.value !== value) cues.push({ start: k / 24, value });
  });
  return cues;
}

// 1. Cắt từng câu, lấy mốc từng từ bằng Whisper, khớp về lời kịch bản, xếp lên trục thời gian
let t = LEAD;
for (const [i, l] of LINES.entries()) {
  const wav = path.join(OUT, "lines", `l${i + 1}.wav`);
  run("ffmpeg", ["-v", "error", "-y", "-i", path.join(SRC, "voice.wav"), "-ss", `${l.from}`, "-to", `${l.to}`, "-ac", "1", "-ar", "24000", wav]);
  l.wav = wav;
  l.dur = l.to - l.from;
  l.start = t;
  l.end = t + l.dur;
  l.words = useWhisper ? alignScript(l.text, whisperWords(wav)) : null;
  const raw = useWhisper ? visemeCues(l.words) : envelopeCues(wav);
  l.cues = raw.map((c) => ({ ...c, start: c.start + t }));
  t = l.end + GAP;
}
const talkEnd = LINES.at(-1).end + 0.9;
const total = talkEnd + END_CARD;

// Ghép âm thanh: im lặng + các câu cách nhau GAP
const inputs = [];
const filters = [];
LINES.forEach((l, i) => {
  inputs.push("-i", l.wav);
  filters.push(`[${i}:a]adelay=${Math.round(l.start * 1000)}[a${i}]`);
});
run("ffmpeg", [
  "-v", "error", "-y", ...inputs,
  "-filter_complex", `${filters.join(";")};${LINES.map((_, i) => `[a${i}]`).join("")}amix=inputs=${LINES.length}:normalize=0,apad=whole_dur=${total.toFixed(2)}`,
  "-ar", "24000", "-ac", "1", path.join(DIR, "voice.wav"),
]);

const [L1, L2, L3, L4] = LINES;
const T = (n) => Number(n.toFixed(3));

// 2. Nền: nhà ống Sài Gòn, màu phẳng, viền đậm
const ink = "#1d1a1a";
const tiles = [];
for (let x = 0; x < 1920; x += 120)
  for (let y = 990; y < 1080; y += 60)
    tiles.push(`<rect x="${x + ((y / 60) % 2) * 60}" y="${y}" width="60" height="60" fill="#d9a77a"/><path d="M${x + 30} ${y + 8} L${x + 52} ${y + 30} L${x + 30} ${y + 52} L${x + 8} ${y + 30} Z" fill="#3f7d78" opacity="0.55"/>`);
const grille = [];
for (let i = 1; i < 6; i++) grille.push(`<line x1="${780 + i * 60}" y1="150" x2="${780 + i * 60}" y2="470" stroke="${ink}" stroke-width="7"/>`);
const background = `
  <rect width="1920" height="1080" fill="#f2dfb8"/>
  <rect y="0" width="1920" height="70" fill="#e6cd9e"/>
  <rect y="760" width="1920" height="230" fill="#c99a6b"/><line x1="0" y1="760" x2="1920" y2="760" stroke="${ink}" stroke-width="6"/>
  <rect y="990" width="1920" height="90" fill="#e9c79e"/>${tiles.join("")}<line x1="0" y1="990" x2="1920" y2="990" stroke="${ink}" stroke-width="6"/>
  <g>
    <rect x="780" y="150" width="360" height="320" fill="#a8dcef" stroke="${ink}" stroke-width="10"/>
    <circle cx="1060" cy="230" r="44" fill="#ffe28a"/>
    <path d="M780 400 Q860 360 940 400 T1140 390 L1140 470 L780 470 Z" fill="#8cc59a"/>
    ${grille.join("")}<path d="M780 310 Q960 260 1140 310" fill="none" stroke="${ink}" stroke-width="7"/>
    <rect x="762" y="466" width="396" height="22" rx="6" fill="#9c6b45" stroke="${ink}" stroke-width="6"/>
  </g>
  <g>
    <rect x="120" y="430" width="300" height="420" rx="10" fill="#8a5a3b" stroke="${ink}" stroke-width="8"/>
    <rect x="145" y="560" width="115" height="260" rx="6" fill="#9e6a47" stroke="${ink}" stroke-width="6"/>
    <rect x="280" y="560" width="115" height="260" rx="6" fill="#9e6a47" stroke="${ink}" stroke-width="6"/>
    <circle cx="245" cy="690" r="7" fill="#e3b85c"/><circle cx="295" cy="690" r="7" fill="#e3b85c"/>
    <path d="M220 430 Q200 380 230 350 L310 350 Q340 380 320 430 Z" fill="#8b5636" stroke="${ink}" stroke-width="7"/>
    <rect x="236" y="330" width="68" height="26" rx="6" fill="#6d4128" stroke="${ink}" stroke-width="6"/>
    <path d="M230 392 Q270 404 312 392" fill="none" stroke="#c88d55" stroke-width="5"/>
  </g>
  <g>
    <path d="M1640 990 L1660 860 L1800 860 L1820 990 Z" fill="#c4623f" stroke="${ink}" stroke-width="7"/>
    <path d="M1730 860 Q1640 700 1600 640 Q1700 690 1730 860 Q1740 640 1800 560 Q1780 720 1730 860 Q1840 700 1880 690 Q1820 780 1730 860" fill="#4f9b5e" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>
  </g>
  <g>
    <line x1="1500" y1="0" x2="1500" y2="140" stroke="${ink}" stroke-width="5"/>
    <path d="M1450 140 L1550 140 L1530 180 L1470 180 Z" fill="#3f7d78" stroke="${ink}" stroke-width="6"/>
    <circle cx="1500" cy="190" r="14" fill="#fff3b0" stroke="${ink}" stroke-width="5"/>
  </g>`;

// Bong bóng suy nghĩ (đặt theo tâm cx, cy)
const cloud = (id, cx, cy, tailTo, body) => `
  <g id="${id}" opacity="0" transform="translate(${cx} ${cy}) scale(1)">
    <circle cx="${tailTo[0] * 0.35}" cy="${tailTo[1] * 0.35 + 60}" r="18" fill="#fff" stroke="${ink}" stroke-width="6"/>
    <circle cx="${tailTo[0] * 0.6}" cy="${tailTo[1] * 0.6 + 60}" r="11" fill="#fff" stroke="${ink}" stroke-width="5"/>
    <path d="M-170 40 Q-210 -30 -140 -70 Q-120 -140 -40 -120 Q10 -170 80 -125 Q160 -140 170 -70 Q230 -20 180 40 Q190 110 110 105 Q60 150 0 115 Q-70 150 -110 105 Q-190 110 -170 40 Z" fill="#fff" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>
    ${body}
  </g>`;
const bowl = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-14 -40 Q-24 -60 -12 -76 M6 -40 Q-4 -60 8 -76" fill="none" stroke="#9aa" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-24" rx="62" ry="14" fill="#f5e3b3" stroke="${ink}" stroke-width="6"/>
    <path d="M-62 -24 Q-58 30 0 34 Q58 30 62 -24 Q30 -12 0 -12 Q-30 -12 -62 -24 Z" fill="#fff" stroke="${ink}" stroke-width="6"/>
    <path d="M-50 2 Q0 14 50 2" fill="none" stroke="#3f7fc2" stroke-width="6"/></g>`;
const che = (x, y) => `<g transform="translate(${x} ${y})">
    <path d="M-26 -50 L26 -50 L20 34 L-20 34 Z" fill="#fff" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M-23 -10 L23 -10 L20 34 L-20 34 Z" fill="#7cbf6a"/><path d="M-25 -32 L25 -32 L23 -10 L-23 -10 Z" fill="#f2d6a0"/>
    <path d="M-26 -50 L26 -50 L20 34 L-20 34 Z" fill="none" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>
    <line x1="8" y1="-74" x2="2" y2="-20" stroke="#e05a4a" stroke-width="6" stroke-linecap="round"/></g>`;
const cross = (x, y) => `<g transform="translate(${x} ${y})" stroke="#d8342a" stroke-width="12" stroke-linecap="round"><line x1="-40" y1="-50" x2="40" y2="40"/><line x1="40" y1="-50" x2="-40" y2="40"/></g>`;

const bubbles = [
  cloud("bub1", 860, 290, [250, 200], `${bowl(-90, 10, 0.85)}${bowl(20, 10, 0.85)}${che(110, 4)}`),
  cloud("bub2", 1100, 290, [-260, 200], `${bowl(-60, 10, 0.95)}${che(90, 4)}<g id="bub2-x" opacity="0">${cross(90, 0)}</g>`),
].join("");

// Biểu tượng cảm xúc trên đầu
const emotes = `
  <g id="emo-ex" opacity="0" transform="translate(760 300)"><path d="M-12 -70 L12 -70 L8 -10 L-8 -10 Z" fill="#ffcf3a" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/><circle cx="0" cy="14" r="11" fill="#ffcf3a" stroke="${ink}" stroke-width="6"/></g>
  <g id="emo-q" opacity="0" transform="translate(1250 380)"><path d="M-26 -50 Q-24 -84 4 -84 Q34 -84 34 -58 Q34 -38 10 -28 L8 -6" fill="none" stroke="${ink}" stroke-width="18" stroke-linecap="round"/><path d="M-26 -50 Q-24 -84 4 -84 Q34 -84 34 -58 Q34 -38 10 -28 L8 -6" fill="none" stroke="#7fd0ff" stroke-width="9" stroke-linecap="round"/><circle cx="8" cy="20" r="10" fill="#7fd0ff" stroke="${ink}" stroke-width="5"/></g>
  <g id="emo-sweat" opacity="0" transform="translate(818 460)"><path d="M0 -36 Q22 -2 14 14 Q0 30 -14 14 Q-22 -2 0 -36 Z" fill="#8fd3ff" stroke="${ink}" stroke-width="5"/></g>`;

const world = `
<svg viewBox="0 0 1920 1080" width="1920" height="1080">
  ${BG ? `<image href="bg.png" x="-20" y="-12" width="1960" height="1104" preserveAspectRatio="xMidYMid slice"/>` : background}
  ${puppetSVG("minh", "minh", { x: 690, y: GROUND, dir: 1 })}
  ${puppetSVG("ba", "ba", { x: 1250, y: GROUND, dir: -1 })}
  ${bubbles}
  ${emotes}
</svg>`;

// Thẻ cuối: một khung xương, nhiều vai
const lineup = `
<svg viewBox="0 0 1920 1080" width="1920" height="1080">
  ${puppetSVG("p0", "base", { x: 390, y: 900, dir: 1, scale: 0.72 })}
  ${puppetSVG("p1", "minh", { x: 770, y: 900, dir: 1, scale: 0.72 })}
  ${puppetSVG("p2", "ba", { x: 1150, y: 900, dir: -1, scale: 0.72 })}
  ${puppetSVG("p3", "pho", { x: 1530, y: 900, dir: -1, scale: 0.72 })}
</svg>`;

// 3. Hoạt cảnh
const anim = [];
const cam = (cx, cy, z, at, dur, ease = "power2.inOut") =>
  anim.push(`tl.to("#cam", { x: ${T(960 - cx * z)}, y: ${T(540 - cy * z)}, scale: ${z}, duration: ${dur}, ease: "${ease}" }, ${T(at)});`);
const pop = (sel, at, off) => {
  anim.push(`tl.fromTo("${sel}", { opacity: 0, scale: 0.2, transformOrigin: "50% 100%" }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.2)" }, ${T(at)});`);
  anim.push(`tl.to("${sel}", { y: "-=10", duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, ${T(at + 0.45)});`);
  anim.push(`tl.to("${sel}", { opacity: 0, duration: 0.25 }, ${T(off)});`);
};

anim.push(`tl.set("#cam", { x: 0, y: 0, scale: 1, transformOrigin: "0 0" }, 0);`);
anim.push(`tl.fromTo("#world", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0);`);
for (const [id, ph] of [["minh", 0], ["ba", 0.7]]) anim.push(...breathe(id, talkEnd, ph), ...blinks(id, talkEnd, ph));
anim.push(...expr("minh", "happy", 0), ...expr("ba", "happy", 0), ...pose("minh", "idle", 0), ...pose("ba", "idle", 0));

// Tờ tiền trong tay luôn giữ gần thẳng đứng: xoay ngược với góc tay
const holdNote = (id, poseName, at) => {
  const [, , aF, fF] = POSES[poseName];
  anim.push(`tl.to("#${id}-note", { attr: { transform: "translate(248 604) rotate(${-12 - aF - fF})" }, duration: 0.45, ease: "back.out(1.5)" }, ${T(at)});`);
};

// Câu 1 — Minh phấn khích giơ tờ tiền
cam(780, 600, 1.32, L1.start - 0.5, 0.7);
anim.push(`tl.set("#minh-note", { opacity: 1 }, ${T(L1.start - 0.3)});`);
holdNote("minh", "holdUp", L1.start - 0.3);
anim.push(...pose("minh", "holdUp", L1.start - 0.3), ...expr("minh", "excited", L1.start - 0.3), ...hop("minh", L1.start - 0.2));
pop("#emo-ex", L1.start, L1.end - 0.2);
anim.push(...lipSync("minh", L1.cues, "grin", { from: L1.start, to: L1.end }));
anim.push(...pose("minh", "explain", L1.end + 0.1));
holdNote("minh", "explain", L1.end + 0.1);
anim.push(...expr("ba", "smug", L1.start + 1.2));

// Câu 2 — bà nhớ lại: hai tô phở và ly chè
cam(1080, 610, 1.28, L2.start - 0.35, 0.6);
anim.push(...pose("ba", "count", L2.start), ...expr("ba", "nostalgic", L2.start));
anim.push(...lipSync("ba", L2.cues, "smile", { from: L2.start, to: L2.end }), ...gestureBeats("ba", "count", L2.start, L2.end));
anim.push(...expr("minh", "happy", L2.start));
pop("#bub1", L2.start + 1.6, L2.end + 0.3);
anim.push(...pose("ba", "idle", L2.end + 0.2));

// Câu 3 — Minh: giờ chỉ đủ một tô
cam(860, 610, 1.24, L3.start - 0.35, 0.6);
anim.push(...pose("minh", "shrug", L3.start), ...expr("minh", "sad", L3.start));
anim.push(`tl.set("#minh-note", { opacity: 0 }, ${T(L3.start)});`);
anim.push(...lipSync("minh", L3.cues, "frown", { from: L3.start, to: L3.end }));
pop("#bub2", L3.start + 0.5, L3.end + 0.3);
anim.push(`tl.fromTo("#bub2-x", { opacity: 0, scale: 2.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.in" }, ${T(L3.start + 2.6)});`);
anim.push(...expr("ba", "sad", L3.start + 1.4));

// Câu 4 — bà ngạc nhiên: máy quay đẩy nhanh vào mặt (nhịp hài)
cam(1225, 560, 1.62, L4.start - 0.1, 0.28, "power3.out");
anim.push(...pose("ba", "gasp", L4.start - 0.1), ...expr("ba", "surprised", L4.start - 0.1), ...hop("ba", L4.start - 0.1, 18));
anim.push(...lipSync("ba", L4.cues, "o", { from: L4.start, to: L4.end }));
pop("#emo-q", L4.start + 0.4, L4.end);
anim.push(...pose("minh", "idle", L4.start), ...expr("minh", "neutral", L4.start));
cam(960, 560, 1.05, L4.end + 0.05, 0.6);
pop("#emo-sweat", L4.end + 0.2, talkEnd);

// Thẻ cuối
anim.push(`tl.to("#world", { opacity: 0, duration: 0.5 }, ${T(talkEnd - 0.3)});`);
anim.push(`tl.fromTo("#end", { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${T(talkEnd - 0.1)});`);
const lineupIds = ["p0", "p1", "p2", "p3"];
lineupIds.forEach((id, i) => {
  anim.push(...expr(id, i === 0 ? "neutral" : "happy", 0), ...breathe(id, total, i * 0.4));
  anim.push(`tl.fromTo("#${id}", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${T(talkEnd + 0.3 + i * 0.35)});`);
  anim.push(...hop(id, talkEnd + 0.3 + i * 0.35, 30));
});
anim.push(`tl.fromTo(".lbl", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.35 }, ${T(talkEnd + 0.5)});`);
anim.push(...pose("p1", "holdUp", talkEnd + 2), ...pose("p2", "count", talkEnd + 2.2), ...pose("p3", "hips", talkEnd + 2.4));
anim.push(`tl.set("#p1-note", { opacity: 1 }, ${T(talkEnd + 2)});`);
holdNote("p1", "holdUp", talkEnd + 2);

// Phụ đề
const caps = LINES.map(
  (l) => `<div class="clip cap" data-start="${T(l.start)}" data-duration="${T(l.dur)}" data-track-index="3"><span class="cap-text"><b>${l.name}</b> ${l.text}</span></div>`
).join("\n      ");

const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Bản thử hoạt hình rối · 16x9</title>
    <script src="vendor/gsap.min.js"></script>
    <style>
@font-face { font-family: "Inter"; src: url("fonts/Inter-SemiBold.otf") format("opentype"); font-weight: 600; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-ExtraBold.otf") format("opentype"); font-weight: 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: #f2dfb8; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Inter", sans-serif; background: #f2dfb8; }
#world, #end { position: absolute; inset: 0; }
#cam { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
#end { background: #fbf3e2; }
#end h2 { position: absolute; top: 90px; left: 0; right: 0; text-align: center; font-size: 76px; font-weight: 800; color: #1d1a1a; }
.lbl { position: absolute; top: 930px; width: 360px; text-align: center; font-size: 34px; font-weight: 800; color: #1d1a1a; }
.lbl small { display: block; font-size: 24px; font-weight: 600; color: #6b625a; }
.brand { position: absolute; z-index: 900; left: 60px; top: 44px; font-size: 26px; font-weight: 600; color: #1d1a1a; }
.brand b { background: #0B1237; color: #10F3BD; padding: 4px 10px; border-radius: 8px; font-weight: 800; }
.tag { position: absolute; z-index: 900; right: 60px; top: 44px; font-size: 22px; font-weight: 600; color: #fff; background: #c2462f; padding: 6px 14px; border-radius: 8px; }
.cap { position: absolute; z-index: 1000; left: 0; right: 0; bottom: 56px; display: flex; justify-content: center; }
.cap-text { display: inline-block; max-width: 1500px; font-size: 44px; font-weight: 600; line-height: 1.3; text-align: center; color: #fff;
  padding: 10px 26px; border-radius: 14px; background: rgba(20,16,16,0.72); }
.cap-text b { color: #ffcf3a; font-weight: 800; margin-right: 8px; }
</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T(total)}" data-width="1920" data-height="1080">
      <div class="brand"><b>DSC</b> Academy</div>
      <div class="tag">Bản thử · hoạt hình rối</div>
      <div id="world"><div id="cam">${world}</div></div>
      <div id="end" style="opacity:0">
        <h2>Một khung xương, nhiều vai</h2>
        ${lineup}
        <div class="lbl" style="left:210px">Khung chung<small>chưa mặc gì</small></div>
        <div class="lbl" style="left:590px">Minh<small>tóc, kính, áo xanh</small></div>
        <div class="lbl" style="left:970px">Bà Tư<small>tóc búi, áo bà ba</small></div>
        <div class="lbl" style="left:1350px">Chú bán phở<small>ria, tạp dề, khăn</small></div>
      </div>
      ${caps}
      <audio id="voiceover" src="voice.wav" data-start="0" data-duration="${T(total)}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${anim.join("\n      ")}
      tl.set({}, {}, ${T(total)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(DIR, "index.html"), html);
const cues = LINES.reduce((a, l) => a + l.cues.length, 0);
console.log(`Nhép miệng: ${useWhisper ? "Whisper (mốc từng từ)" : "theo độ to giọng"}`);
console.log(`Xong: ${DIR}/index.html (${total.toFixed(1)}s, ${cues} mốc miệng, ${anim.length} lệnh hoạt cảnh)`);
