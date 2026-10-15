#!/usr/bin/env node
// Dựng video ngắn 9:16 (TikTok/Reels/Shorts) từ kịch bản "format": "shorts-…": phụ đề chữ chạy theo từng từ,
// mỗi cảnh một hiệu ứng theo ý câu (visual.cue), tiếng động gắn theo cue, nhạc nền tự hạ khi có lời.
//
// Cách dùng:  node scripts/build-shorts.mjs videos/<id>/script.json
// Kết quả:    videos/<id>/project-9x16/index.html + audio.wav
//
// Mốc từng từ: Whisper trên máy nếu có (whisper-cli + mô hình, xem scripts/lib/align.mjs); không có (GitHub, --no-voice)
// thì chia đều thời lượng cảnh theo độ dài từ — chữ lệch lời chút ít nhưng vẫn dựng được.
// Cue, preset, vùng an toàn: scripts/lib/shorts-style.mjs. Hướng dẫn viết: CLAUDE.md mục 4f.

import fs from "node:fs";
import path from "node:path";
import { videoDir, projectDir, workDir } from "./lib/paths.mjs";
import { whisperWords, alignScript, WHISPER_MODEL } from "./lib/align.mjs";
import { synthSfx, mixdown, applySfxSet, setLibResolver, sfxBudget, mixOpts } from "./lib/sound.mjs";
import { resolveAudio, writeCredits, findTrack, trackFile } from "./lib/audio-lib.mjs";
import { writeIndex } from "./lib/edits.mjs";
import { createFx, T } from "./lib/toon-fx.mjs";
import { W, H, SAFE, HOOK_Y, CAP_Y, CUES, SFX_ALIAS, icon, presetFor, F, fontFaces, copyFonts } from "./lib/shorts-style.mjs";

const contentPath = process.argv[2];
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const dir = videoDir(content.id);
const proj = projectDir(dir, "9x16");
fs.mkdirSync(proj, { recursive: true });
const P = presetFor(content);

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = (w) => w.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
const wordsOf = (text) => (text || "").split(/\s+/).filter((w) => norm(w));

// ---------- Giọng đọc và mốc từng từ ----------
const timingsPath = path.join(dir, "timings.json");
let timings = fs.existsSync(timingsPath) ? JSON.parse(fs.readFileSync(timingsPath, "utf8")) : null;
const voice = timings && fs.existsSync(path.join(dir, timings.audio || "voice.wav")) ? path.join(dir, timings.audio || "voice.wav") : null;
if (!voice) {
  // Xem thử hình không tiếng: giả định tốc độ đọc ~4,5 âm tiết/giây
  let t = 0.3;
  const scenes = content.scenes.map((s) => {
    const start = t;
    t += Math.max(1.6, wordsOf(s.text).length / 4.5) + 0.25;
    return { id: s.id, start, end: t - 0.25 };
  });
  timings = { duration: t + 0.5, scenes };
  console.log("⚠ Chưa có giọng đọc: dựng không tiếng với thời lượng ước tính.");
}
const TOTAL = timings.duration;
const S = timings.scenes.map((s) => s.start);
const E = timings.scenes.map((s, i) => timings.scenes[i + 1]?.start ?? TOTAL);

// Chia đều theo độ dài chữ trong một khoảng thời gian (khi không có Whisper)
function spread(text, t0, t1) {
  const ws = wordsOf(text);
  const weight = ws.map((w) => 1 + norm(w).length * 0.25);
  const sum = weight.reduce((a, b) => a + b, 0) || 1;
  let t = t0;
  return ws.map((w, k) => {
    const d = ((t1 - t0) * weight[k]) / sum;
    const o = { word: w, start: t, end: t + d * 0.9 };
    t += d;
    return o;
  });
}
let words;
const canWhisper = voice && fs.existsSync(WHISPER_MODEL) && !process.env.CI;
if (canWhisper) {
  try {
    words = alignScript(content.scenes.map((s) => s.text).join(" "), whisperWords(voice));
  } catch (e) {
    console.log(`⚠ Whisper lỗi (${e.message.slice(0, 120)}), chia đều mốc từ theo cảnh.`);
  }
}
if (!words) {
  if (voice) console.log("⚠ Không có Whisper: mốc từng từ chia đều theo cảnh (chữ có thể lệch lời một chút).");
  words = content.scenes.flatMap((s, i) => spread(s.text, timings.scenes[i].start, timings.scenes[i].end));
}
const byScene = [];
{
  let wi = 0;
  for (const s of content.scenes) {
    const n = wordsOf(s.text).length;
    byScene.push(words.slice(wi, wi + n));
    wi += n;
  }
}
// Mốc của từ (hoặc cụm từ: lấy từ đầu) trong cảnh i; không thấy thì trả về def
function at(i, phrase, def) {
  if (phrase == null) return def;
  if (typeof phrase === "number") return S[i] + phrase * (E[i] - S[i]);
  const target = wordsOf(phrase).map(norm);
  const ws = byScene[i];
  for (let j = 0; j + target.length <= ws.length; j++) if (target.every((w, k) => norm(ws[j + k].word) === w)) return ws[j].start;
  console.log(`⚠ ${content.scenes[i].id}: không thấy "${phrase}" trong lời, dùng mốc mặc định`);
  return def;
}


// ---------- Hiệu ứng ----------
const fx = createFx();
const { A } = fx;
const sound = (t, kind, fallback, prio) => {
  const k = SFX_ALIAS[kind] || kind || fallback;
  if (k) fx.sound(t, k, undefined, prio);
};
const IR = "immediateRender: false";
const rise = (sel, t, { dy = 60, dur = 0.38, from = 1 } = {}) =>
  A(`tl.fromTo("${sel}", { opacity: 0, y: ${dy}, scale: ${from} }, { opacity: 1, y: 0, scale: 1, duration: ${dur}, ease: "back.out(1.8)", ${IR} }, ${T(t)});`);
const slamIn = (sel, t, from = 2.2) =>
  A(`tl.fromTo("${sel}", { opacity: 0, scale: ${from} }, { opacity: 1, scale: 1, duration: 0.2, ease: "power4.in", ${IR} }, ${T(t - 0.08)});`);
const fadeIn = (sel, t, dur = 0.35) => A(`tl.fromTo("${sel}", { opacity: 0 }, { opacity: 1, duration: ${dur}, ease: "power1.out", ${IR} }, ${T(t)});`);
const lum = (hex) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const tone = (x) => ({ up: P.up, down: P.down, good: P.up, bad: P.down, hi: P.hi, accent: P.accent, key: P.key, mark: P.mark }[x] || x || P.accent);

// Cụm cần nhấn trong chữ ("mark"): mặc định gạch lượn sóng màu cam vẽ từ trái sang (kiểu AI Zening),
// markStyle "highlight" = vệt bút dạ quang.
const WAVE = "M0 6 Q6.25 0 12.5 6 T25 6 T37.5 6 T50 6 T62.5 6 T75 6 T87.5 6 T100 6";
function markText(text, mark, id, style = "wave") {
  const s = esc(text);
  if (!mark || !text.includes(mark)) return s;
  const inner =
    style === "highlight"
      ? esc(mark)
      : `${esc(mark)}<svg class="wave" id="${id}-wv" viewBox="0 0 100 12" preserveAspectRatio="none"><path d="${WAVE}"/></svg>`;
  return s.replace(esc(mark), `<span class="mk ${style === "highlight" ? "hl" : "wv"}" id="${id}-mk">${inner}</span>`);
}
function markAnim(id, t, style = "wave") {
  if (style === "highlight") return fx.mark(`#${id}-mk`, t);
  A(`tl.fromTo("#${id}-wv", { clipPath: "inset(-50% 100% -50% 0)" }, { clipPath: "inset(-50% 0% -50% 0)", duration: 0.45, ease: "power2.out", ${IR} }, ${T(t)});`);
  A(`tl.to("#${id}-mk", { color: "${P.mark}", duration: 0.2 }, ${T(t)});`);
  sound(t, "pen");
}
// Khoanh vẽ tay màu vàng quanh phần chính (khung w × h, tâm y), kèm nhãn nhỏ phía trên nếu có
function circle(id, t, cy, w, h, label) {
  const rx = w / 2, ry = h / 2, cx = SAFE.cx;
  const d = `M${cx - rx * 0.2} ${cy - ry * 1.02} C${cx + rx * 0.9} ${cy - ry * 1.15} ${cx + rx * 1.1} ${cy + ry * 0.9} ${cx} ${cy + ry} C${cx - rx * 1.15} ${cy + ry * 1.05} ${cx - rx * 1.05} ${cy - ry * 0.95} ${cx + rx * 0.15} ${cy - ry * 1.08}`;
  A(`tl.fromTo("#${id}-ring", { strokeDashoffset: 4000 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out", ${IR} }, ${T(t)});`);
  sound(t, "pen");
  let tag = "";
  if (label) {
    tag = `<div class="ring-tag" id="${id}-rt" style="left:${cx - rx * 0.9}px;top:${cy - ry * 1.12 - 70}px">${esc(label)}</div>`;
    rise(`#${id}-rt`, t + 0.35, { dy: 20 });
  }
  return `<svg class="ring" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path id="${id}-ring" d="${d}" fill="none" stroke="${P.hi}" stroke-width="9" stroke-linecap="round" stroke-dasharray="4000" stroke-dashoffset="4000"/></svg>${tag}`;
}

// Số trong "value": giữ tiền tố/hậu tố, đếm phần số ("-5%", "50.000đ", "3,5%", "x2")
function counterSteps(value, from = 0, n = 14) {
  const m = String(value).match(/^(.*?)(\d[\d.,]*)(.*)$/);
  if (!m) return [String(value)];
  const [, pre, num, post] = m;
  const comma = /,\d{1,2}$/.test(num); // 3,5 → thập phân kiểu Việt
  const dec = comma ? num.split(",")[1].length : 0;
  const target = parseFloat(comma ? num.replace(/\./g, "").replace(",", ".") : num.replace(/[.,]/g, ""));
  const fmt = (x) => {
    const s = dec ? x.toFixed(dec).replace(".", ",") : Math.round(x).toString();
    return dec ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  return Array.from({ length: n + 1 }, (_, k) => {
    const e = 1 - Math.pow(1 - k / n, 3);
    return k === n ? String(value) : `${pre}${fmt(from + (target - from) * e)}${post}`;
  });
}

// ---------- Cảnh ----------
const scenesHtml = content.scenes.map((s, i) => {
  const v = s.visual || {};
  const id = `c${i}`;
  const t0 = S[i] + 0.05;
  const span = E[i] - S[i];
  const cue = v.cue || "statement";
  if (!CUES[cue]) throw new Error(`${s.id}: cue "${cue}" không có (${Object.keys(CUES).join(", ")})`);
  let html = "";
  let focus = null; // [tâm y, rộng, cao] cho khoanh vẽ tay

  if (cue === "hook_2tier") {
    // Tầng 1: chữ có chân nghiêng, nhỏ; tầng 2: chữ hẹp đậm viết hoa, rất to, đập xuống đúng từ khoá
    const t2 = at(i, v.at, t0 + 0.35);
    html = `<div class="hook" style="top:${HOOK_Y}px">${v.icon ? `<div class="hk-ico" id="${id}-ico">${icon(v.icon, tone(v.tone || "hi"), 110)}</div>` : ""}
      <div class="t1" id="${id}-t1">${esc(v.tier1)}</div><div class="t2" id="${id}-t2">${markText(v.tier2, v.mark, id, v.markStyle)}</div></div>`;
    rise(`#${id}-t1`, t0, { dy: 30 });
    slamIn(`#${id}-t2`, t2);
    if (v.icon) fx.pop(`#${id}-ico`, t0 + 0.1, { kind: null });
    A(`tl.fromTo("#${id}-z", { scale: ${v.punch_zoom || 1.15} }, { scale: 1, duration: 0.5, ease: "power3.out", ${IR} }, ${T(t2)});`);
    sound(t2, v.sfx, "hit", 1);
    if (v.mark) markAnim(id, t2 + 0.35, v.markStyle);
    focus = [HOOK_Y + 190, 860, 250];
  } else if (cue === "big_counter") {
    const tc = at(i, v.at, t0 + 0.15);
    const steps = counterSteps(v.value, v.from ?? 0);
    const c = tone(v.tone || (/^-/.test(String(v.value)) ? "down" : "hi"));
    html = `<div class="counter" style="top:${HOOK_Y}px">${v.icon ? `<div id="${id}-ico">${icon(v.icon, c, 120)}</div>` : ""}
      <div class="num" id="${id}-n" style="color:${c}">${esc(steps[0])}</div>${v.label ? `<div class="lab" id="${id}-l">${esc(v.label)}</div>` : ""}</div>`;
    rise(`#${id}-n`, tc, { dy: 0, from: 0.5, dur: 0.3 });
    fx.count(`#${id}-n`, steps, tc, { step: 0.06 });
    A(`tl.fromTo("#${id}-n", { scale: 1.2 }, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.45)", ${IR} }, ${T(tc + (steps.length - 1) * 0.06)});`);
    // Biểu tượng và nhãn hiện ngay đầu cảnh, con số đập vào đúng lúc đọc tới
    if (v.icon) fx.pop(`#${id}-ico`, t0, { kind: null });
    if (v.label) rise(`#${id}-l`, Math.min(t0 + 0.2, tc), { dy: 30 });
    if (v.sfx) sound(tc, v.sfx);
    focus = [HOOK_Y + (v.icon ? 270 : 200), 720, 250];
  } else if (cue === "ab_compare") {
    // Hai thẻ tối "bạn nghĩ … / thực ra …": thẻ phải hiện sau và đổi sang nền màu khi lời nói tới
    const card = (x, k) => `<div class="ab" id="${id}-${k}">${x.kicker ? `<div class="ab-k">${esc(x.kicker)}</div>` : ""}
      <div class="ab-t"${k === "a" && x.tone ? ` style="color:${tone(x.tone)}"` : ""}>${esc(x.title)}</div>${x.value ? `<div class="ab-v">${esc(x.value)}</div>` : ""}${x.text ? `<div class="ab-x">${esc(x.text)}</div>` : ""}</div>`;
    html = `${v.headline ? `<div class="head" id="${id}-h">${esc(v.headline)}</div>` : ""}<div class="abrow">${card(v.left, "a")}${v.vs ? `<div class="vs" id="${id}-vs">VS</div>` : ""}${card(v.right, "b")}</div>`;
    const ta = at(i, v.leftAt, t0 + 0.1);
    const tb = at(i, v.rightAt, t0 + Math.min(1.2, span * 0.4));
    if (v.headline) rise(`#${id}-h`, t0, { dy: 30 });
    rise(`#${id}-a`, ta, { dy: 40, from: 0.9 });
    rise(`#${id}-b`, tb, { dy: 40, from: 0.9 });
    // Thẻ trái giữ nền tối (tô màu chữ theo tone); thẻ phải đổi nền, chữ đen/trắng theo độ sáng của nền
    const fill = tone(v.right.tone || "up");
    A(`tl.to("#${id}-b", { backgroundColor: "${fill}", color: "${lum(fill) > 0.55 ? "#000" : "#fff"}", duration: 0.3 }, ${T(tb + 0.35)});`);
    if (v.vs) fx.pop(`#${id}-vs`, tb + 0.2, { kind: null });
    sound(tb, v.sfx, "snap");
  } else if (cue === "list") {
    // Viên thuốc tối có số tròn màu, dòng mới hiện thì dòng trước mờ đi
    const items = v.items.map((x) => (typeof x === "string" ? { title: x } : x));
    const times = items.map((x, k) => at(i, x.at, t0 + 0.15 + (k * Math.max(0.4, span * 0.75)) / Math.max(1, items.length)));
    const rows = items
      .map((x, k) => `<div class="row" id="${id}-r${k}">${x.icon ? `<span class="tick">${icon(x.icon, P.hi, 48)}</span>` : `<span class="dot">${k + 1}</span>`}<div><div class="rt">${esc(x.title)}</div>${x.text ? `<div class="rx">${esc(x.text)}</div>` : ""}</div></div>`)
      .join("");
    html = `${v.headline ? `<div class="head" id="${id}-h">${esc(v.headline)}</div>` : ""}<div class="list">${rows}</div>`;
    if (v.headline) rise(`#${id}-h`, t0, { dy: 30 });
    items.forEach((_, k) => {
      rise(`#${id}-r${k}`, times[k], { dy: 40 });
      if (k) A(`tl.to("#${id}-r${k - 1}", { opacity: 0.5, duration: 0.25 }, ${T(times[k])});`);
      sound(times[k], v.sfx, "pop", k ? 3 : 2);
    });
  } else if (cue === "steps") {
    // Sơ đồ khối dọc nối bằng đường kẻ. Có "active": cả sơ đồ hiện sẵn, bước đang nói sáng lên;
    // không có: từng khối hiện lần lượt theo lời, đường nối mọc dần xuống.
    const items = v.items.map((x) => (typeof x === "string" ? { title: x } : x));
    const active = v.active ? v.active - 1 : -1;
    const times = items.map((x, k) => at(i, x.at, t0 + 0.15 + (k * Math.max(0.5, span * 0.7)) / Math.max(1, items.length)));
    const boxes = items
      .map((x, k) => `${k ? `<div class="link" id="${id}-l${k}"></div>` : ""}<div class="box${active === k ? " on" : active >= 0 ? " off" : ""}" id="${id}-b${k}">${v.numbered ? `<span class="bn">${k + 1}</span>` : ""}${esc(x.title)}${x.text ? `<div class="bx">${esc(x.text)}</div>` : ""}</div>`)
      .join("");
    html = `${v.headline ? `<div class="head" id="${id}-h">${esc(v.headline)}</div>` : ""}<div class="flow">${boxes}</div>`;
    if (v.headline) rise(`#${id}-h`, t0, { dy: 30 });
    if (active >= 0) {
      items.forEach((_, k) => {
        fadeIn(`#${id}-b${k}`, t0, 0.2);
        if (k) fadeIn(`#${id}-l${k}`, t0, 0.2);
      });
      A(`tl.fromTo("#${id}-b${active}", { scale: 0.92 }, { scale: 1.06, duration: 0.4, ease: "back.out(2.5)", ${IR} }, ${T(t0 + 0.3)});`);
      sound(t0 + 0.3, v.sfx, "swish");
    } else
      items.forEach((_, k) => {
        if (k) A(`tl.fromTo("#${id}-l${k}", { opacity: 1, scaleY: 0 }, { scaleY: 1, duration: 0.25, ease: "power2.out", ${IR} }, ${T(times[k] - 0.25)});`);
        rise(`#${id}-b${k}`, times[k], { dy: 20, from: 0.85 });
        sound(times[k], v.sfx, "pop", k ? 3 : 2);
      });
  } else if (cue === "chapter") {
    // Dải tối ở phần ba dưới: "PHẦN 2" nhỏ, dòng nghiêng có chân, tên chương chữ hẹp đậm; số chương mờ lớn phía trên
    html = `<div class="ch-ghost" id="${id}-g">${esc(v.num ?? "")}</div><div class="chap" id="${id}-ch">
      ${v.num != null ? `<div class="ch-n">PHẦN ${esc(v.num)}</div>` : ""}${v.sub ? `<div class="ch-s">${esc(v.sub)}</div>` : ""}<div class="ch-t">${esc(v.title)}</div></div>`;
    A(`tl.fromTo("#${id}-ch", { clipPath: "inset(0 50% 0 50%)", opacity: 1 }, { clipPath: "inset(0 0% 0 0%)", duration: 0.35, ease: "power3.out", ${IR} }, ${T(S[i])});`);
    rise(`#${id}-ch .ch-t`, S[i] + 0.2, { dy: 30 });
    A(`tl.fromTo("#${id}-g", { opacity: 0, scale: 1.3 }, { opacity: 0.1, scale: 1, duration: 0.6, ease: "power2.out", ${IR} }, ${T(S[i])});`);
    sound(S[i], v.sfx, "whoosh", 1);
  } else if (cue === "statement") {
    // slide: chữ hẹp đậm viết hoa; blur: chữ có chân nghiêng hiện từ mờ (kể chuyện); hand: viết tay;
    // type: đánh máy; glow: phát sáng
    const style = v.style || "slide";
    const ts = at(i, v.at, t0);
    const y = v.y ?? 560;
    html = `<div class="stmt ${style}" id="${id}-s" style="top:${y}px">${markText(v.text, v.mark, id, v.markStyle)}</div>`;
    if (style === "type") {
      const chars = [...v.text];
      const step = Math.min(0.045, (span * 0.6) / chars.length);
      html = `<div class="stmt type" style="top:${y}px"><span id="${id}-s"></span><span class="caret">|</span></div>`;
      chars.forEach((_, k) => A(`tl.set("#${id}-s", { textContent: ${JSON.stringify(chars.slice(0, k + 1).join(""))} }, ${T(ts + k * step)});`));
      sound(ts, v.sfx, "key");
    } else if (style === "blur") {
      A(`tl.fromTo("#${id}-s", { opacity: 0, filter: "blur(24px)", scale: 1.1 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.9, ease: "power2.out", ${IR} }, ${T(ts)});`);
      if (v.sfx) sound(ts, v.sfx);
    } else if (style === "hand") {
      A(`tl.fromTo("#${id}-s", { opacity: 1, clipPath: "inset(-30% 100% -60% 0)" }, { clipPath: "inset(-30% 0% -60% 0)", duration: ${T(Math.min(1.2, span * 0.5))}, ease: "power1.inOut", ${IR} }, ${T(ts)});`);
      sound(ts, v.sfx, "pen");
    } else if (style === "glow") {
      rise(`#${id}-s`, ts, { dy: 0, from: 0.8 });
      A(`tl.fromTo("#${id}-s", { textShadow: "0 0 0px ${P.hi}" }, { textShadow: "0 0 36px ${P.hi}", duration: 0.6, yoyo: true, repeat: 1, ${IR} }, ${T(ts + 0.3)});`);
      sound(ts, v.sfx, "riser");
    } else {
      rise(`#${id}-s`, ts, { dy: 50 });
      sound(ts, v.sfx, "swish", 3);
    }
    if (v.mark) markAnim(id, at(i, v.mark, ts + 0.5), v.markStyle);
    focus = [y + 100, 860, 280];
  } else if (cue === "arrow") {
    const c = tone(v.dir);
    const ta = at(i, v.at, t0 + 0.1);
    html = `<div class="arrow" style="top:${HOOK_Y}px"><div id="${id}-ar">${icon(v.dir === "down" ? "down" : "up", c, 260)}</div>
      ${v.value ? `<div class="num sm" id="${id}-v" style="color:${c}">${esc(v.value)}</div>` : ""}${v.label ? `<div class="lab" id="${id}-l">${esc(v.label)}</div>` : ""}</div>`;
    A(`tl.fromTo("#${id}-ar", { opacity: 0, y: ${v.dir === "down" ? -200 : 200} }, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.6)", ${IR} }, ${T(ta)});`);
    A(`tl.fromTo("#${id}-ar", { y: 0 }, { y: ${v.dir === "down" ? 16 : -16}, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor((span - 0.8) / 0.5))}, ${IR} }, ${T(ta + 0.5)});`);
    if (v.value) slamIn(`#${id}-v`, ta + 0.35);
    if (v.label) rise(`#${id}-l`, ta + 0.55, { dy: 30 });
    sound(ta, v.sfx, "whoosh");
  } else if (cue === "question") {
    // Ô hỏi người xem, đứng tên kênh (không bịa bình luận của người khác)
    html = `<div class="ask" id="${id}-q"><div class="ask-h"><span class="av">DSC</span><b>DSC Academy</b><span class="ask-s">hỏi bạn</span></div>
      <div class="ask-t">${esc(v.text)}</div>${(v.options || []).map((o, k) => `<div class="opt" id="${id}-o${k}"><b>${"ABC"[k]}</b>${esc(o)}</div>`).join("")}</div>`;
    rise(`#${id}-q`, t0, { dy: 120, from: 0.9 });
    (v.options || []).forEach((_, k) => rise(`#${id}-o${k}`, t0 + 0.4 + k * 0.25, { dy: 30 }));
    sound(t0, v.sfx, "chime");
  } else if (cue === "outro_cta") {
    // Kết kiểu AI Zening: dòng nghiêng có chân, tên kênh chữ hoa nhỏ giãn cách; giữ nút mời đọc bài (quy tắc DSC)
    html = `<div class="end"><div class="end-h" id="${id}-h">${esc(v.headline)}</div>${v.sub ? `<div class="end-s" id="${id}-s">${esc(v.sub)}</div>` : ""}
      <div class="end-cta" id="${id}-cta">${esc(v.cta || "Đọc bài viết ở phần mô tả")}</div><div class="end-b">DSC ACADEMY</div><div class="end-d">${esc(v.disclaimer)}</div></div>`;
    A(`tl.fromTo("#${id}-h", { opacity: 0, filter: "blur(16px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "power2.out", ${IR} }, ${T(t0)});`);
    if (v.sub) fadeIn(`#${id}-s`, t0 + 0.3);
    rise(`#${id}-cta`, t0 + 0.5, { dy: 30 });
    sound(t0 + 0.5, v.sfx, "ding", 1);
  }

  // Lớp phụ dùng chung: nhãn dán (badge) có vạch màu bên trái, khoanh vẽ tay quanh phần chính
  if (v.badge) {
    html += `<div class="badge" id="${id}-bd">${esc(v.badge)}</div>`;
    A(`tl.fromTo("#${id}-bd", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out", ${IR} }, ${T(t0 + 0.3)});`);
    sound(t0 + 0.3, "tape");
  }
  if (v.circle && focus) html += circle(id, at(i, v.circle === true ? null : v.circle, t0 + 0.8), ...focus, v.circleLabel);

  // Cảnh vào: cắt cứng, lớp nội dung nhích nhẹ để mỗi cảnh có chuyển động
  fx.show(`#${id}`, S[i]);
  if (i + 1 < content.scenes.length) fx.hide(`#${id}`, S[i + 1]);
  if (cue !== "hook_2tier" && cue !== "chapter") A(`tl.fromTo("#${id}-z", { scale: 1.04 }, { scale: 1, duration: ${T(Math.max(0.6, span))}, ease: "power1.out", ${IR} }, ${T(S[i])});`);
  return `<div class="scn" id="${id}"><div class="lay" id="${id}-z">${html}</div></div>`;
});

// ---------- Phụ đề chữ chạy ----------
// "clean" (mặc định, kiểu AI Zening): chữ thường cỡ vừa, cả cụm hiện mờ, từ sáng dần theo lời, từ khoá đổi màu.
// "bold" (kiểu Hormozi): cụm 3 từ IN HOA to, viền đen, từ đang đọc tô vàng và phóng nhẹ.
const capStyle = content.style?.captions === "bold" || content.style?.captions === "hormozi-kinetic" ? "bold" : "clean";
const capWords = content.style?.capWords || (capStyle === "bold" ? 3 : 6);
const capUntil = S[content.scenes.findIndex((s) => s.visual?.cue === "outro_cta")] ?? Infinity;
const keyIdx = new Set();
content.scenes.forEach((s, i) => {
  for (const kw of s.visual?.keywords || []) {
    const target = wordsOf(kw).map(norm);
    const ws = byScene[i];
    for (let j = 0; j + target.length <= ws.length; j++)
      if (target.every((w, k) => norm(ws[j + k].word) === w)) target.forEach((_, k) => keyIdx.add(words.indexOf(ws[j + k])));
  }
});
const chunks = [];
{
  let cur = [];
  words.forEach((w, k) => {
    if (w.start >= capUntil) return;
    cur.push(k);
    const sceneEnd = byScene.some((ws) => ws.at(-1) === w);
    if (/[,.:;!?]$/.test(w.word) || cur.length >= capWords || sceneEnd) {
      chunks.push(cur);
      cur = [];
    }
  });
  if (cur.length) chunks.push(cur);
}
const capHtml = chunks
  .map((ks, c) => {
    const start = words[ks[0]].start;
    const next = chunks[c + 1] ? words[chunks[c + 1][0]].start : words[ks.at(-1)].end + 0.4;
    const end = Math.min(capUntil, next - words[ks.at(-1)].end < 0.7 ? next : words[ks.at(-1)].end + 0.35);
    if (capStyle === "bold") {
      A(`tl.fromTo("#k${c}", { scale: 0.86, y: 18 }, { scale: 1, y: 0, duration: 0.16, ease: "back.out(2)", ${IR} }, ${T(start)});`);
      ks.forEach((k) => {
        const key = keyIdx.has(k);
        A(`tl.set("#w${k}", { color: "${key ? P.accent : P.hi}", scale: 1.1 }, ${T(words[k].start)});`);
        A(`tl.set("#w${k}", { color: "${key ? P.accent : "#FFFFFF"}", scale: 1 }, ${T(Math.min(words[k].end + 0.05, end))});`);
        if (key) fx.sound(words[k].start, "pop", 0.6, 3);
      });
    } else {
      A(`tl.fromTo("#k${c}", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out", ${IR} }, ${T(start - 0.05)});`);
      ks.forEach((k) => {
        const key = keyIdx.has(k);
        A(`tl.to("#w${k}", { opacity: 1, color: "${key ? P.key : "#FFFFFF"}", duration: 0.12, ease: "none" }, ${T(words[k].start)});`);
        if (key) {
          A(`tl.fromTo("#w${k}", { scale: 1.18 }, { scale: 1, duration: 0.3, ease: "back.out(3)", ${IR} }, ${T(words[k].start)});`);
          fx.sound(words[k].start, "pop", 0.6, 3);
        }
      });
    }
    return `<div class="clip cap ${capStyle}" id="k${c}" data-start="${T(start)}" data-duration="${T(end - start)}" data-track-index="3">${ks
      .map((k) => `<span class="w" id="w${k}">${esc(words[k].word.replace(/[,.;:]$/, ""))}</span>`)
      .join(" ")}</div>`;
  })
  .join("\n      ");

// ---------- Thanh tiến độ, nền trôi ----------
A(`tl.fromTo("#prog i", { scaleX: 0 }, { scaleX: 1, duration: ${T(TOTAL)}, ease: "none" }, 0);`);
A(`tl.fromTo("#bgdots", { y: 0 }, { y: -240, duration: ${T(TOTAL)}, ease: "none" }, 0);`);

// ---------- Âm thanh ----------
fs.mkdirSync(path.join(proj, "vendor"), { recursive: true });
copyFonts(fs, path, proj);
fs.copyFileSync("assets/vendor/gsap.min.js", path.join(proj, "vendor", "gsap.min.js"));
setLibResolver((id) => trackFile(findTrack(id)));
const sfxEvents = applySfxSet(sfxBudget(fx.sfx, content.sfxRules), content.sfxSet ?? P.sfxSet);
fs.writeFileSync(path.join(workDir(dir), "sfx.json"), JSON.stringify(sfxEvents, null, 1));
fs.writeFileSync(path.join(dir, "sfx.wav"), synthSfx(sfxEvents, TOTAL));
const lib = resolveAudio({ ...content, music: content.music ?? P.music }, timings, TOTAL, dir);
writeCredits(dir, lib.used);
mixdown({
  voice,
  sfx: path.join(dir, "sfx.wav"),
  music: lib.music,
  musicVol: lib.musicVol ?? 1.5,
  beds: lib.beds,
  hits: lib.hits,
  duck: typeof content.duck === "object" ? content.duck : {},
  total: TOTAL,
  ...mixOpts(content, timings),
  out: path.join(proj, "audio.wav"),
});

// ---------- HTML ----------
const css = `${fontFaces}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${P.bg}; }
#root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; font-family: ${F.body}; color: ${P.ink};
  background: radial-gradient(circle at 40% 35%, ${P.bg2}, ${P.bg} 72%); }
#bgdots { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H + 300}px; opacity: 0.35;
  background-image: radial-gradient(${P.cardLine} 2px, transparent 2.5px); background-size: 60px 60px; }
.scn { position: absolute; inset: 0; opacity: 0; }
.lay { position: absolute; inset: 0; transform-origin: ${SAFE.cx}px 800px; }
.brand { position: absolute; z-index: 900; left: ${SAFE.left}px; top: ${SAFE.top + 22}px; font-size: 26px; font-weight: 600; letter-spacing: 0.18em; color: ${P.muted}; text-shadow: 0 1px 6px rgba(0,0,0,0.5); }
.brand b { color: ${P.accent}; font-weight: 800; margin-right: 8px; }
#prog { position: absolute; z-index: 900; left: ${SAFE.left}px; top: ${SAFE.top}px; width: ${SAFE.w}px; height: 6px; border-radius: 3px; background: ${P.cardLine}; overflow: hidden; }
#prog i { display: block; height: 100%; background: ${P.hi}; transform-origin: 0 50%; }
.ico { display: block; margin: 0 auto 18px; }
.hook, .counter, .arrow { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; text-align: center; }
.t1 { font-family: ${F.serif}; font-style: italic; font-size: 58px; font-weight: 500; color: ${P.ink}; opacity: 0; margin-bottom: 6px; }
.t2 { font-family: ${F.cond}; font-size: 136px; font-weight: 800; line-height: 0.98; text-transform: uppercase; color: ${P.hi}; opacity: 0; text-shadow: 0 6px 24px rgba(0,0,0,0.45); }
.num { font-family: ${F.cond}; font-size: 260px; font-weight: 800; letter-spacing: -0.01em; line-height: 0.95; opacity: 0; }
.num.sm { font-size: 170px; margin-top: 6px; }
.lab { font-family: ${F.serif}; font-style: italic; font-size: 50px; margin-top: 18px; opacity: 0; color: ${P.ink}; }
.head { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; top: ${SAFE.top + 110}px; text-align: center; font-family: ${F.cond}; font-size: 80px; font-weight: 800; line-height: 1; text-transform: uppercase; opacity: 0; }
.abrow { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; top: ${SAFE.top + 280}px; display: flex; gap: 24px; align-items: stretch; }
.ab { position: relative; flex: 1; background: rgba(20,22,30,0.92); border-radius: 26px; padding: 34px 22px 38px; text-align: center; opacity: 0; color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.35); }
.ab-k { font-family: ${F.body}; font-size: 30px; font-weight: 600; opacity: 0.72; margin-bottom: 8px; }
.ab-t { font-family: ${F.cond}; font-size: 80px; font-weight: 800; line-height: 0.95; text-transform: uppercase; }
.ab-v { font-family: ${F.cond}; font-size: 96px; font-weight: 800; margin-top: 12px; }
.ab-x { font-size: 32px; font-weight: 600; line-height: 1.3; margin-top: 12px; opacity: 0.85; }
.vs { position: absolute; left: 50%; top: 50%; margin: -50px 0 0 -50px; width: 100px; height: 100px; border-radius: 50px; background: ${P.hi}; color: #000;
  font-family: ${F.cond}; font-size: 46px; font-weight: 800; display: flex; align-items: center; justify-content: center; opacity: 0; z-index: 2; }
.list { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; top: ${SAFE.top + 260}px; display: flex; flex-direction: column; gap: 22px; align-items: flex-start; }
.row { display: flex; gap: 22px; align-items: center; background: rgba(20,22,30,0.88); border-radius: 22px; padding: 18px 30px 18px 20px; opacity: 0; color: #fff; }
.tick .ico { margin: 0; }
.dot { flex: none; width: 66px; height: 66px; border-radius: 33px; background: ${P.hi}; color: #000; display: flex; align-items: center; justify-content: center; font-family: ${F.cond}; font-size: 44px; font-weight: 800; }
.rt { font-size: 48px; font-weight: 800; line-height: 1.15; }
.rx { font-size: 32px; font-weight: 600; color: rgba(255,255,255,0.7); margin-top: 6px; line-height: 1.3; }
.flow { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; top: ${SAFE.top + 230}px; display: flex; flex-direction: column; align-items: center; }
.box { min-width: 480px; max-width: ${SAFE.w}px; text-align: center; padding: 26px 40px; border-radius: 18px; background: rgba(16,40,32,0.92); border: 3px solid ${P.hi}88;
  font-size: 48px; font-weight: 800; color: #fff; opacity: 0; box-shadow: 0 14px 40px rgba(0,0,0,0.35); }
.box.on { background: ${P.hi}; color: #000; border-color: ${P.hi}; }
.box.off { filter: saturate(0.4); color: rgba(255,255,255,0.65); }
.bn { font-family: ${F.cond}; color: ${P.hi}; margin-right: 14px; }
.box.on .bn { color: #000; }
.bx { font-size: 30px; font-weight: 600; opacity: 0.75; margin-top: 6px; }
.link { width: 5px; height: 64px; background: ${P.hi}aa; transform-origin: 50% 0; opacity: 0; }
.ch-ghost { position: absolute; left: 0; width: ${SAFE.right}px; top: ${SAFE.top + 60}px; text-align: center; font-family: ${F.cond}; font-size: 640px; font-weight: 800; line-height: 1; color: ${P.ink}; opacity: 0; }
.chap { position: absolute; left: 0; right: 0; top: 880px; padding: 40px ${W - SAFE.right}px 46px ${SAFE.left}px; background: rgba(8,10,16,0.82); text-align: center; opacity: 0; }
.ch-n { font-family: ${F.serif}; font-style: italic; font-size: 34px; letter-spacing: 0.25em; color: ${P.hi}; }
.ch-s { font-family: ${F.serif}; font-style: italic; font-size: 56px; color: #fff; margin-top: 4px; }
.ch-t { font-family: ${F.cond}; font-size: 120px; font-weight: 800; line-height: 1; text-transform: uppercase; color: #fff; margin-top: 8px; opacity: 0; }
.stmt { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; text-align: center; font-family: ${F.cond}; font-size: 120px; font-weight: 800; line-height: 1; text-transform: uppercase; opacity: 0; }
.stmt.blur { font-family: ${F.serif}; font-style: italic; font-weight: 500; font-size: 84px; line-height: 1.15; text-transform: none; }
.stmt.hand { font-family: ${F.hand}; font-weight: 700; font-size: 100px; line-height: 1.15; text-transform: none; color: ${P.hi}; }
.stmt.type { opacity: 1; font-family: ${F.serif}; font-style: italic; font-weight: 500; font-size: 64px; line-height: 1.25; text-transform: none; text-align: left; }
.caret { color: ${P.hi}; font-style: normal; }
.mk { position: relative; white-space: nowrap; display: inline-block; }
.mk.hl { background: linear-gradient(${P.hi}, ${P.hi}) no-repeat 0 90% / 0% 40%; padding: 0 0.06em; }
.mk .wave { position: absolute; left: 0; bottom: -0.3em; width: 100%; height: 0.14em; overflow: visible; clip-path: inset(-50% 100% -50% 0); }
.mk .wave path { fill: none; stroke: ${P.mark}; stroke-width: 3; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.mk.wv .wave path { stroke-width: 7px; }
.ring { position: absolute; left: 0; top: 0; pointer-events: none; }
.ring-tag { position: absolute; background: ${P.hi}; color: #000; font-size: 32px; font-weight: 800; padding: 6px 16px; border-radius: 8px; opacity: 0; }
.ask { position: absolute; left: ${SAFE.left}px; width: ${SAFE.w}px; top: ${SAFE.top + 180}px; background: #fff; color: #111; border-radius: 34px; padding: 40px; opacity: 0; box-shadow: 0 30px 80px rgba(0,0,0,0.35); }
.ask-h { display: flex; align-items: center; gap: 18px; font-size: 36px; margin-bottom: 26px; }
.av { width: 76px; height: 76px; border-radius: 38px; background: #0B1237; color: #10F3BD; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; }
.ask-s { color: #6b7280; font-weight: 600; }
.ask-t { font-size: 58px; font-weight: 800; line-height: 1.15; }
.opt { margin-top: 22px; font-size: 42px; font-weight: 600; background: #f1f5f9; border-radius: 20px; padding: 18px 24px; opacity: 0; }
.opt b { color: #0E9F7E; margin-right: 16px; }
.badge { position: absolute; z-index: 850; left: ${SAFE.left}px; top: ${SAFE.top + 80}px; background: rgba(10,12,18,0.85); color: #fff; font-size: 32px; font-weight: 600;
  padding: 10px 22px 10px 18px; border-left: 8px solid ${P.mark}; border-radius: 6px; opacity: 0; }
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; text-align: center;
  padding: 0 ${W - SAFE.right}px 160px ${SAFE.left}px; }
.end-h { font-family: ${F.serif}; font-style: italic; font-size: 88px; font-weight: 600; line-height: 1.1; opacity: 0; }
.end-s { font-size: 36px; font-weight: 600; color: ${P.muted}; opacity: 0; }
.end-cta { font-size: 40px; font-weight: 800; color: #000; background: ${P.hi}; padding: 20px 40px; border-radius: 60px; opacity: 0; margin-top: 10px; }
.end-b { font-size: 30px; font-weight: 800; letter-spacing: 0.3em; color: ${P.hi}; }
.end-d { font-size: 26px; color: ${P.muted}; line-height: 1.4; }
.cap { position: absolute; z-index: 1000; left: ${SAFE.left}px; width: ${SAFE.w}px; top: ${CAP_Y}px; text-align: center; }
.cap .w { display: inline-block; }
.cap.clean { font-size: 60px; font-weight: 800; line-height: 1.22; }
.cap.clean .w { margin: 0 0.06em; color: #fff; opacity: 0.38; text-shadow: 0 3px 14px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.9); }
.cap.bold { font-size: 76px; font-weight: 800; line-height: 1.15; text-transform: uppercase; letter-spacing: -0.01em; }
.cap.bold .w { margin: 0 0.14em; color: #fff; -webkit-text-stroke: 0.13em #000; paint-order: stroke fill; filter: drop-shadow(0 6px 0 rgba(0,0,0,0.45)); }
`;
const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(content.title)}</title>
    <script src="vendor/gsap.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T(TOTAL)}" data-width="${W}" data-height="${H}">
      <div id="bgdots"></div>
      ${scenesHtml.join("\n      ")}
      <div id="prog"><i></i></div>
      <div class="brand"><b>DSC</b>ACADEMY</div>
      ${capHtml}
      <audio id="soundtrack" src="audio.wav" data-start="0" data-duration="${T(TOTAL)}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${fx.anim.join("\n      ")}
      tl.set({}, {}, ${T(TOTAL)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeIndex(content.id, "9x16", proj, html);
const per = (sfxEvents.length / TOTAL) * 60;
console.log(`Dựng xong ${proj}/index.html: ${TOTAL.toFixed(1)}s, ${content.scenes.length} cảnh, ${chunks.length} cụm phụ đề (${capStyle}), ${sfxEvents.length} tiếng động (${Math.round(per)}/phút), preset ${content.preset || "dsc"}.`);
if (TOTAL > 62) console.log(`⚠ Nhịp: ${TOTAL.toFixed(0)}s — dài hơn 60s, Shorts/Reels sẽ không tính là video ngắn`);
const slow = content.scenes.filter((_, i) => E[i] - S[i] > 6).map((s) => s.id);
if (slow.length) console.log(`⚠ Nhịp: cảnh đứng quá 6s (${slow.join(", ")}) — tách cảnh để hình đổi mỗi 2–4s`);
if (S[1] != null && S[1] > 3.5) console.log(`⚠ Nhịp: câu móc dài ${S[1].toFixed(1)}s — nên ≤ 3s`);
