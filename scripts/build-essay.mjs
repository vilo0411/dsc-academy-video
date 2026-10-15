#!/usr/bin/env node
// Dựng video essay phong cách cắt dán giấy (16:9) từ kịch bản "format": "essay".
//
// Cách dùng:  node scripts/build-essay.mjs videos/essay-lich-su-lam-phat/script.json
// Đầu vào:    videos/<id>/script.json, videos/<id>/timings.json (nếu chưa có giọng đọc thì tự ước lượng)
// Kết quả:    videos/<id>/project/index.html (+ sfx.wav: tiếng giấy, con dấu, dây…)
//
// Mỗi cảnh là một tấm cắt dán: visual.bg (nền) + visual.pieces[] (các mảnh, xếp theo thứ tự vào khung).
// Các mảnh tự lắp ráp theo nhịp stop-motion (chuyển động bậc thang), rồi đứng yên như tấm poster sống.

import fs from "node:fs";
import path from "node:path";
import { videoDir, projectDir, workDir } from "./lib/paths.mjs";
import { P, HALFTONE_DEFS, artSVG, artAspect } from "./lib/essay-art.mjs";
import { synthSfx, mixdown, hasFfmpeg, applySfxSet, setLibResolver, mixOpts } from "./lib/sound.mjs";
import { resolveAudio, writeCredits, findTrack, trackFile } from "./lib/audio-lib.mjs";
import { writeIndex } from "./lib/edits.mjs";

const contentPath = process.argv[2];
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const buildDir = videoDir(content.id);
fs.mkdirSync(buildDir, { recursive: true });
const W = 1920, H = 1080;

// ---------- Mốc thời gian ----------
const timingsPath = path.join(buildDir, "timings.json");
let timings;
if (fs.existsSync(timingsPath)) {
  timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
} else {
  let t = 0.4;
  const scenes = content.scenes.map((s) => {
    const d = s.text.split(/\s+/).length / 3.3 + 0.6;
    const out = { id: s.id, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return out;
  });
  timings = { source: "estimate", audio: null, duration: +t.toFixed(3), scenes };
  console.log(`Chưa có giọng đọc — ước lượng ${t.toFixed(1)}s.`);
}
const TOTAL = +(timings.duration + 2.0).toFixed(3);

// ---------- Tiện ích ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n) => Number(n).toFixed(3);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// Mép giấy rách: đa giác răng cưa ngẫu nhiên (cố định theo seed).
function torn(amp = 1.2, n = 18) {
  const pts = [];
  const side = (fn) => { for (let i = 0; i <= n; i++) pts.push(fn(i / n)); };
  side((u) => [u * 100, rnd() * amp]);
  side((u) => [100 - rnd() * amp, u * 100]);
  side((u) => [100 - u * 100, 100 - rnd() * amp]);
  side((u) => [rnd() * amp, 100 - u * 100]);
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
}
const TONES = { cream: P.cream, paper: P.paper, tan: P.tan, manila: P.manila, white: "#FBF8F1", red: P.red, mustard: P.mustard, ink: P.ink, gray: "#CFC9BC" };

const sfxEvents = []; // { t, kind, gain?, dur? } — xem scripts/lib/sound.mjs

// ---------- Mảnh cắt dán ----------
// Chung: x, y (góc trên trái, px), w, rot (độ), at (0–1: thời điểm vào trong phần lời của cảnh).
function piece(pc, id, sid) {
  const rot = pc.rot ?? 0;
  const box = (inner, extra = "") =>
    `<div class="pw" id="${id}-w" style="left:${pc.x}px;top:${pc.y}px;${pc.w ? `width:${pc.w}px;` : ""}"><div class="pc ${pc.kind}" id="${id}" style="${extra}">${inner}</div></div>`;
  switch (pc.kind) {
    case "scrap": {
      const tone = TONES[pc.tone || "tan"];
      return { html: box(`<div class="scrap-in ${pc.lines ? "lines" : ""}" style="height:${pc.h}px;background-color:${tone};clip-path:${torn(pc.amp ?? 1.4)}"></div>`), rot, enter: "slide", sfx: "slide" };
    }
    case "art":
      return { html: box(artSVG(pc.name, pc)), rot, enter: pc.enter || "slide", sfx: "drop" };
    case "fly": // vật thể bay ngang khung (dùng cho một nhịp then chốt, không lạm dụng)
      return { html: box(artSVG(pc.name, pc)), rot, enter: "fly", sfx: "whoosh" };
    case "label": {
      const bg = TONES[pc.tone || "red"], fg = pc.tone === "mustard" || pc.tone === "cream" || pc.tone === "white" ? P.ink : P.cream;
      return { html: box(`<div class="lab-in" style="background:${bg};color:${fg};font-size:${pc.size || 72}px;clip-path:${torn(1.6, 10)}">${esc(pc.text)}</div>`), rot, enter: "drop", sfx: "drop" };
    }
    case "type": {
      const chars = [...pc.text];
      const groups = [];
      for (let i = 0; i < chars.length; i += 2) groups.push(chars.slice(i, i + 2).join(""));
      const spans = groups.map((g, i) => `<span id="${id}-g${i}" style="opacity:0">${esc(g)}</span>`).join("");
      return { html: box(`<div class="type-in" style="font-size:${pc.size || 40}px;clip-path:${torn(0.8, 12)}">${spans}</div>`), rot, enter: "type", groups: groups.length, sfx: "slide" };
    }
    case "stamp":
      return { html: box(`<div class="stamp-in" style="font-size:${pc.size || 64}px;color:${TONES[pc.tone || "red"]};border-color:${TONES[pc.tone || "red"]}">${esc(pc.text)}</div>`), rot, enter: "stamp", sfx: "stamp" };
    case "tape":
      return { html: box(`<div class="tape-in" style="width:${pc.w || 180}px"></div>`), rot, enter: "tape", sfx: "tape" };
    case "counter": {
      const vals = pc.values;
      const spans = vals.map((v, i) => `<span class="cv" id="${id}-v${i}" style="opacity:${i ? 0 : 1}">${esc(v)}</span>`).join("");
      return { html: box(`<div class="counter-in" style="font-size:${pc.size || 120}px;height:${(pc.size || 120) * 1.3}px">${spans}</div>`), rot, enter: "counter", n: vals.length, sfx: "drop" };
    }
    case "chart": {
      const w = pc.w, h = pc.h;
      const n = pc.points.length;
      const max = pc.max ?? Math.max(...pc.points) * 1.2, min = pc.min ?? 0;
      const X = (i) => 60 + (i * (w - 100)) / (n - 1), Y = (v) => h - 60 - ((v - min) * (h - 120)) / (max - min);
      const d = pc.points.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
      const len = pc.points.slice(1).reduce((a, v, i) => a + Math.hypot(X(i + 1) - X(i), Y(v) - Y(pc.points[i])), 0);
      const band = pc.band ? `<rect x="60" y="${Y(pc.band[1])}" width="${w - 100}" height="${Y(pc.band[0]) - Y(pc.band[1])}" fill="${P.mustard}" opacity="0.35"/>` : "";
      return {
        html: box(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#F8F4E8"/><rect width="${w}" height="${h}" fill="url(#grid)"/>${band}
          <line x1="60" y1="${h - 60}" x2="${w - 40}" y2="${h - 60}" stroke="${P.ink}" stroke-width="4"/>
          <path id="${id}-p" d="${d}" fill="none" stroke="${P.red}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"/>
          ${pc.caption ? `<text x="${w - 50}" y="${h - 20}" text-anchor="end" font-family="Roboto Mono" font-size="24" fill="${P.gray}">${esc(pc.caption)}</text>` : ""}</svg>`),
        rot, enter: "chart", len, sfx: "slide",
      };
    }
    default:
      throw new Error(`Không biết loại mảnh "${pc.kind}" (cảnh ${sid})`);
  }
}

// Dây đỏ, đinh ghim, nét bút đỏ: vẽ trên lớp SVG phủ toàn khung của cảnh.
function overlay(v, sid) {
  const parts = [], anims = [];
  (v.strings || []).forEach((s, i) => {
    const [x1, y1] = s.from, [x2, y2] = s.to;
    const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + (s.sag ?? 40);
    const len = Math.hypot(mx - x1, my - y1) + Math.hypot(x2 - mx, y2 - my) + 20;
    const id = `${sid}-s${i}`;
    parts.push(`<path id="${id}" d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${P.red}" stroke-width="5" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"/>`);
    for (const [k, [x, y]] of [[0, s.from], [1, s.to]]) parts.push(`<g id="${id}-pin${k}" opacity="0"><circle cx="${x}" cy="${y}" r="13" fill="${P.mustard}" stroke="${P.ink}" stroke-width="4"/><circle cx="${x - 4}" cy="${y - 4}" r="4" fill="#fff"/></g>`);
    anims.push({ kind: "string", id, len, at: s.at ?? 0.6 });
  });
  (v.marks || []).forEach((m, i) => {
    const id = `${sid}-m${i}`;
    let d, len;
    if (m.type === "circle") {
      const { cx, cy, rx, ry } = m;
      d = `M${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx * 0.96} ${cy - ry * 0.28}`;
      len = Math.PI * (rx + ry) * 1.05;
    } else {
      const { x, y, w } = m;
      d = `M${x} ${y} q${w * 0.25} -10 ${w * 0.5} 0 t${w * 0.5} 4`;
      len = w * 1.1;
    }
    parts.push(`<path id="${id}" d="${d}" fill="none" stroke="${P.red}" stroke-width="10" stroke-linecap="round" opacity="0.9" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"/>`);
    anims.push({ kind: "mark", id, len, at: m.at ?? 0.7 });
  });
  return { svg: parts.length ? `<svg class="ov" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>` : "", anims };
}

// ---------- Máy quay ----------
// Chỉ dùng chuyển động phẳng an toàn (phóng to/thu nhỏ đều, trượt ngang/dọc, parallax).
// Không hai cảnh liền nhau cùng một kiểu; "static" dành cho câu chốt.
const MOVES = {
  static: [{ s: 1.0 }, { s: 1.012 }],
  push_in: [{ s: 1.0 }, { s: 1.06 }],
  pull_out: [{ s: 1.09 }, { s: 1.0 }],
  pan_left: [{ s: 1.08, dx: 60 }, { s: 1.08, dx: -60 }],
  pan_right: [{ s: 1.08, dx: -60 }, { s: 1.08, dx: 60 }],
  tilt_up: [{ s: 1.08, dy: -36 }, { s: 1.08, dy: 36 }],
  tilt_down: [{ s: 1.08, dy: 36 }, { s: 1.08, dy: -36 }],
  parallax: [{ s: 1.035 }, { s: 1.035 }],
};
const AUTO = ["push_in", "pan_left", "parallax", "pull_out", "tilt_up", "pan_right"];
function camState({ s, f: focus, dx = 0, dy = 0 }) {
  const [fx, fy] = focus || [W / 2, H * 0.46];
  const clamp = (v, lo) => Math.min(0, Math.max(lo, v));
  const x = clamp(W / 2 - fx * s + dx, W - W * s), y = clamp(H / 2 - fy * s + dy, H - H * s);
  return { scale: +s.toFixed(4), x: +x.toFixed(1), y: +y.toFixed(1), transformOrigin: "0px 0px" };
}
const camPlan = [];
function cameraOf(i) {
  const n = content.scenes.length;
  let m = content.scenes[i].visual.camera;
  if (!m) {
    if (i === n - 1) m = "static";
    else {
      let k = i % AUTO.length;
      m = AUTO[k];
      if (m === camPlan[i - 1]) m = AUTO[(k + 1) % AUTO.length];
    }
  }
  if (!MOVES[m]) throw new Error(`Kiểu máy quay "${m}" không hợp lệ (cảnh ${content.scenes[i].id}). Dùng: ${Object.keys(MOVES).join(", ")}`);
  camPlan[i] = m;
  return m;
}

// ---------- Ghép ----------
const pacing = [], warnings = [];
const sections = [], js = [], caps = [];
content.scenes.forEach((scene, i) => {
  const v = scene.visual;
  const tm = timings.scenes[i];
  const start = i === 0 ? 0 : tm.start;
  const end = i === content.scenes.length - 1 ? TOTAL : timings.scenes[i + 1].start;
  const dur = end - start;
  const speak = tm.end - tm.start;
  const sid = `e${i}`;
  seed = 101 + i * 37;
  const pcs = (v.pieces || []).map((pc, k) => ({ pc, ...piece(pc, `${sid}-p${k}`, scene.id), id: `${sid}-p${k}` }));
  const ov = overlay(v, sid);
  sections.push(`<section id="scene-${i}" class="clip scene bg-${v.bg || "news"}" data-start="${f(start)}" data-duration="${f(dur)}" data-track-index="1">
    <div class="cam" id="${sid}-cam">${v.bg === "news" || !v.bg ? `<div class="newsprint"></div>` : ""}${pcs.map((p) => p.html).join("")}${ov.svg}</div></section>`);

  // Thời điểm vào: rải đều trong 65% đầu phần lời (hoặc theo pc.at).
  const t0 = tm.start + 0.05;
  const span = Math.max(1.0, speak * 0.5);
  const AT = 0.7; // nén mốc "at" để tấm cắt dán lắp xong trước khi câu nói kết thúc
  js.push(`// ${scene.id}`);
  // Máy quay: chuyển động nền của cả cảnh + các cú cắt vào cận cảnh (cuts).
  const move = cameraOf(i);
  const visT = [start];
  const segs = [{ t: start, focus: null, zoom: 1 }];
  for (const c of v.cuts || []) segs.push({ t: tm.start + c.at * speak, focus: [c.x, c.y], zoom: c.zoom ?? 1.7 });
  segs.forEach((sg, k) => {
    const t1 = k < segs.length - 1 ? segs[k + 1].t : end;
    const d = Math.max(0.1, t1 - sg.t);
    let A, B;
    visT.push(sg.t);
    if (!sg.focus) {
      const [a, b] = MOVES[move] || MOVES.push_in;
      A = camState(a); B = camState(b);
    } else {
      A = camState({ s: sg.zoom, f: sg.focus }); B = camState({ s: sg.zoom * 1.04, f: sg.focus });
      sfxEvents.push({ t: sg.t, kind: "slide", gain: 0.7 });
    }
    js.push(`tl.set("#${sid}-cam", ${JSON.stringify(A)}, ${f(sg.t)});`);
    js.push(`tl.fromTo("#${sid}-cam", ${JSON.stringify(A)}, { ...${JSON.stringify(B)}, duration: ${f(d)}, ease: "none", immediateRender: false }, ${f(sg.t)});`);
  });
  // Parallax: các lớp trôi với tốc độ khác nhau (lớp trên trôi nhiều hơn).
  if (move === "parallax") {
    pcs.forEach((p, k) => {
      const depth = pcs.length > 1 ? k / (pcs.length - 1) : 0.5;
      js.push(`tl.fromTo("#${p.id}-w", { x: ${(depth * 28).toFixed(1)} }, { x: ${(-depth * 28).toFixed(1)}, duration: ${f(dur)}, ease: "none" }, ${f(start)});`);
    });
  }
  pcs.forEach((p, k) => {
    const sel = `#${p.id}`;
    const t = t0 + (p.pc.at != null ? p.pc.at * speak * AT : (k / Math.max(1, pcs.length)) * span);
    const r = p.rot;
    visT.push(t);
    js.push(`tl.set("${sel}", { rotation: ${r}, opacity: 0 }, 0);`);
    const SFX_AT = { stamp: [["stamp", 0.15]], tape: [["tape", 0]], drop: [["tap", 0.22]], counter: [["tap", 0.22]], type: [["slide", 0, 0.5]], chart: [["slide", 0, 0.6]] };
    for (const [kind, dt, g] of SFX_AT[p.enter] || [["slide", 0], ["tap", 0.4, 0.7]]) sfxEvents.push({ t: t + dt, kind, gain: g });
    if (p.pc.hit) sfxEvents.push({ t: t + 0.1, kind: "hit", gain: 0.7 });
    switch (p.enter) {
      case "stamp":
        js.push(`tl.fromTo("${sel}", { opacity: 0, scale: 1.6, rotation: ${r - 8} }, { opacity: 1, scale: 1, rotation: ${r}, duration: 0.18, ease: "steps(3)" }, ${f(t)});`);
        break;
      case "tape":
        js.push(`tl.fromTo("${sel}", { opacity: 0, scaleX: 0.2 }, { opacity: 1, scaleX: 1, duration: 0.2, ease: "steps(3)" }, ${f(t)});`);
        break;
      case "drop":
      case "counter":
        js.push(`tl.set("${sel}", { opacity: 1 }, ${f(t)});`, `tl.fromTo("${sel}", { y: -60, rotation: ${r + 6} }, { y: 0, rotation: ${r}, duration: 0.25, ease: "steps(4)", immediateRender: false }, ${f(t)});`);
        break;
      case "fly": {
        const [x0, y0] = p.pc.path[0], [x1, y1] = p.pc.path[1];
        const fd = p.pc.dur ?? 1.6;
        js.push(`tl.set("${sel}", { opacity: 1 }, ${f(t)});`, `tl.fromTo("#${p.id}-w", { x: ${x0 - p.pc.x}, y: ${y0 - p.pc.y} }, { x: ${x1 - p.pc.x}, y: ${y1 - p.pc.y}, duration: ${f(fd)}, ease: "steps(${Math.round(fd * 10)})", immediateRender: false }, ${f(t)});`);
        js.push(`tl.fromTo("${sel}", { rotation: ${r} }, { rotation: ${r + (p.pc.spin ?? 0)}, duration: ${f(fd)}, ease: "steps(${Math.round(fd * 10)})", immediateRender: false }, ${f(t)});`);
        if (p.pc.exit !== false) js.push(`tl.set("${sel}", { opacity: 0 }, ${f(t + fd)});`);
        break;
      }
      default: {
        const dx = p.pc.from === "left" ? -260 : p.pc.from === "top" ? 0 : p.pc.from === "bottom" ? 0 : 260;
        const dy = p.pc.from === "top" ? -220 : p.pc.from === "bottom" ? 220 : 30;
        js.push(`tl.set("${sel}", { opacity: 1 }, ${f(t)});`, `tl.fromTo("${sel}", { x: ${dx}, y: ${dy}, rotation: ${r + (dx > 0 ? 7 : -7)} }, { x: 0, y: 0, rotation: ${r}, duration: 0.42, ease: "steps(6)", immediateRender: false }, ${f(t)});`);
        js.push(`tl.to("${sel}", { rotation: ${r - 1.2}, duration: 0.12, ease: "steps(1)", yoyo: true, repeat: 1 }, ${f(t + 0.42)});`);
      }
    }
    if (p.enter === "type") {
      for (let g = 0; g < p.groups; g++) {
        const tg = t + 0.3 + g * 0.045;
        js.push(`tl.set("${sel}-g${g}", { opacity: 1 }, ${f(tg)});`);
        sfxEvents.push({ t: tg + (g % 3) * 0.006, kind: "key", gain: g % 4 === 0 ? 1 : 0.7 });
      }
    }
    if (p.enter === "counter") {
      const steps = p.n - 1;
      const tSpan = Math.max(0.5, Math.min(2.0, speak * 0.6 - (t - tm.start) - 0.3));
      for (let c = 1; c <= steps; c++) {
        const tc = t + 0.3 + (c * tSpan) / steps;
        js.push(`tl.set("${sel}-v${c - 1}", { opacity: 0 }, ${f(tc)});`, `tl.set("${sel}-v${c}", { opacity: 1 }, ${f(tc)});`);
        sfxEvents.push({ t: tc, kind: "tick" });
        if (c === steps && p.pc.hit !== false) sfxEvents.push({ t: tc, kind: "hit" });
      }
    }
    if (p.enter === "chart") {
      js.push(`tl.to("${sel}-p", { attr: { "stroke-dashoffset": 0 }, duration: ${f(Math.min(2.4, speak * 0.5))}, ease: "steps(14)" }, ${f(t + 0.4)});`);
      sfxEvents.push({ t: t + 0.4, kind: "pen", dur: Math.min(2.4, speak * 0.5) });
    }
    // Poster sống: rung rất nhẹ theo nhịp bậc thang.
    if (k % 2 === 0 && p.enter !== "stamp" && p.enter !== "fly") {
      js.push(`tl.to("${sel}", { rotation: ${r + 0.5}, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: ${Math.max(1, Math.floor((end - t - 1) / 0.5))} }, ${f(t + 0.9)});`);
    }
  });
  ov.anims.forEach((a) => {
    const t = tm.start + a.at * speak * AT;
    visT.push(t);
    if (a.kind === "string") {
      js.push(`tl.set("#${a.id}-pin0", { opacity: 1 }, ${f(t - 0.15)});`);
      js.push(`tl.to("#${a.id}", { attr: { "stroke-dashoffset": 0 }, duration: 0.5, ease: "steps(8)" }, ${f(t)});`);
      js.push(`tl.set("#${a.id}-pin1", { opacity: 1 }, ${f(t + 0.5)});`);
      sfxEvents.push({ t, kind: "zip" });
    } else {
      js.push(`tl.to("#${a.id}", { attr: { "stroke-dashoffset": 0 }, duration: 0.45, ease: "steps(7)" }, ${f(t)});`);
      sfxEvents.push({ t, kind: "pen", dur: 0.45 });
    }
  });
  if (i > 0) sfxEvents.push({ t: Math.max(0, start - 0.2), kind: "whoosh" });
  // Kiểm tra nhịp (theo hướng dẫn docs/essay-guide.md): hình phải đổi ít nhất mỗi 5 giây.
  {
    const ts = [...visT, end].sort((a, b) => a - b);
    let gap = 0, at = start;
    for (let k = 1; k < ts.length; k++) if (ts[k] - ts[k - 1] > gap) { gap = ts[k] - ts[k - 1]; at = ts[k - 1]; }
    pacing.push({ id: scene.id, camera: move, dur: +dur.toFixed(2), maxStill: +gap.toFixed(2) });
    if (gap > 5.2) warnings.push(`${scene.id}: hình đứng yên ${gap.toFixed(1)}s (từ ${at.toFixed(1)}s) — thêm "cuts" hoặc mảnh mới`);
    if (i > 0 && camPlan[i - 1] === move && move !== "static") warnings.push(`${scene.id}: cùng kiểu máy quay "${move}" với cảnh trước`);
    if (i === 0 && Math.min(...visT.slice(1)) - start > 1.0) warnings.push(`${scene.id}: mở đầu chậm — mảnh đầu tiên nên vào trong 1 giây`);
  }

  // Phụ đề
  if (content.captions !== false) {
    const words = scene.text.split(/\s+/);
    const chunks = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 52 && cur) { chunks.push(cur); cur = w; } else cur = (cur + " " + w).trim();
      if (/[,.?!:]$/.test(w) && cur.length > 26) { chunks.push(cur); cur = ""; }
    }
    if (cur) chunks.push(cur);
    const total = chunks.reduce((a, c) => a + c.length, 0);
    let ct = tm.start;
    chunks.forEach((c, k) => {
      const cd = (c.length / total) * (speak - 0.1);
      caps.push(`<div class="clip cap" id="cap-${i}-${k}" data-start="${f(ct)}" data-duration="${f(k === chunks.length - 1 ? tm.end - ct : cd)}" data-track-index="3"><span>${esc(c)}</span></div>`);
      ct += cd;
    });
  }
});

// Nền giấy báo: cột chữ mờ (chữ giả, chỉ để tạo kết cấu).
// Nền giấy báo: cột chữ giả vẽ thành ảnh nền SVG (chỉ là kết cấu, không phải chữ cần đọc).
let NEWS = "";
{
  const words = "giá thị trường đồng tiền hôm nay báo cáo phiên chợ lương thực hàng hoá nhà máy ngân khố tin tức tuần qua bản tin kinh tế mới nhất".split(" ");
  let r = 3;
  const pick = () => words[(r = (r * 48271) % 2147483647) % words.length];
  const colW = 290, gap = 34, lh = 26;
  let svg = "";
  for (let c = 0; c < 7; c++) {
    const x = 20 + c * (colW + gap);
    svg += `<text x='${x}' y='70' font-family='serif' font-weight='700' font-size='46' textLength='${colW}' lengthAdjust='spacingAndGlyphs'>${pick().toUpperCase()} ${pick().toUpperCase()}</text>`;
    for (let y = 120; y < 1160; y += lh) {
      let line = "";
      while (line.length < 34) line += pick() + " ";
      svg += `<text x='${x}' y='${y}' font-family='serif' font-size='19' textLength='${colW}' lengthAdjust='spacingAndGlyphs'>${line.trim()}</text>`;
    }
  }
  NEWS = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='2300' height='1180'><g fill='rgba(40,35,28,0.17)'>${svg}</g></svg>`)}")`;
}


// Âm thanh: trộn giọng + tiếng động + nhạc nền + ambience/stinger (thư viện assets/audio) thành một track (ffmpeg);
// không có ffmpeg thì để từng track riêng.
const audioTags = [];
setLibResolver((id) => trackFile(findTrack(id)));
const sfxAll = applySfxSet(sfxEvents, content.sfxSet);
fs.writeFileSync(path.join(buildDir, "sfx.wav"), synthSfx(sfxAll, TOTAL));
const lib = resolveAudio(content, timings, TOTAL, buildDir);
writeCredits(buildDir, lib.used);
let audioFiles = [];
if (hasFfmpeg()) {
  mixdown({
    voice: timings.audio ? path.join(buildDir, timings.audio) : null,
    sfx: path.join(buildDir, "sfx.wav"),
    music: lib.music,
    total: TOTAL,
    ...mixOpts(content, timings),
    musicVol: lib.musicVol ?? content.music?.volume ?? 1.5,
    sfxVol: content.sfxVolume ?? 1,
    duck: content.duck || {},
    beds: lib.beds,
    hits: lib.hits,
    out: path.join(buildDir, "mix.wav"),
  });
  audioTags.push(`<audio id="mix" src="mix.wav" data-start="0" data-duration="${f(TOTAL)}" data-track-index="2" data-volume="1"></audio>`);
  audioFiles = ["mix.wav"];
  console.log(`Âm thanh: giọng ${timings.audio ? "có" : "chưa có"}, nhạc nền ${lib.music ? path.basename(lib.music) : "không"}, ${lib.beds.length} ambience, ${lib.hits.length} stinger, ${sfxAll.length} tiếng động${content.sfxSet ? ` (bộ ${content.sfxSet})` : ""}.`);
} else {
  if (timings.audio) audioTags.push(`<audio id="voiceover" src="${timings.audio}" data-start="0" data-duration="${f(timings.duration)}" data-track-index="2" data-volume="1"></audio>`);
  audioTags.push(`<audio id="sfx" src="sfx.wav" data-start="0" data-duration="${f(TOTAL)}" data-track-index="4" data-volume="0.8"></audio>`);
  audioFiles = [timings.audio, "sfx.wav"].filter(Boolean);
}

const noise = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.32 0'/></filter><rect width='400' height='400' filter='url(#n)'/></svg>`)}")`;
const fiber = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='turbulence' baseFrequency='0.012 0.04' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.18 0'/></filter><rect width='600' height='600' filter='url(#n)'/></svg>`)}")`;

const css = `
@font-face { font-family: "Oswald"; src: url("fonts/Oswald.ttf") format("truetype"); font-weight: 200 700; }
@font-face { font-family: "Roboto Mono"; src: url("fonts/RobotoMono.ttf") format("truetype"); font-weight: 100 700; }
@font-face { font-family: "Old Standard"; src: url("fonts/OldStandard-Regular.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Old Standard"; src: url("fonts/OldStandard-Bold.ttf") format("truetype"); font-weight: 700; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${P.ink}; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Oswald", sans-serif; color: ${P.ink}; }
.scene { position: absolute; inset: 0; overflow: hidden; }
.cam { position: absolute; inset: 0; }
.bg-news .cam { background: ${fiber}, ${noise}, ${P.paper}; }
.bg-kraft .cam { background: ${fiber}, ${noise}, #CDB383; }
.bg-dark .cam { background: ${noise}, radial-gradient(circle at 50% 40%, #3A352E, #191714 75%); }
.bg-grid .cam { background: linear-gradient(rgba(70,110,150,.18) 2px, transparent 2px) 0 0/60px 60px, linear-gradient(90deg, rgba(70,110,150,.18) 2px, transparent 2px) 0 0/60px 60px, ${noise}, #F3EEDF; }
.bg-cork .cam { background: radial-gradient(circle at 30% 20%, rgba(255,240,210,.18), transparent 60%), ${noise}, ${noise}, #A97A4A; }
.newsprint { position: absolute; left: -40px; top: -40px; width: 2300px; height: 1180px; background: ${NEWS} no-repeat; }
.pw { position: absolute; }
.pc { position: relative; filter: drop-shadow(5px 8px 0 rgba(20,16,10,.28)); }
.pc svg { display: block; width: 100%; height: auto; }
.scrap-in { width: 100%; background-image: ${noise}; }
.scrap-in.lines { background-image: repeating-linear-gradient(0deg, transparent 0 34px, rgba(60,50,40,.18) 34px 36px), ${noise}; }
.lab-in { display: inline-block; padding: 0.08em 0.32em 0.12em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.01em; line-height: 1.05; white-space: nowrap; background-image: ${noise}; }
.type-in { display: inline-block; background: #FBF8F1; background-image: ${noise}; padding: 0.35em 0.7em; font-family: "Roboto Mono"; font-weight: 500; line-height: 1.35; color: ${P.ink}; }
.stamp-in { display: inline-block; border: 8px solid; padding: 0.06em 0.3em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.88; mix-blend-mode: multiply; filter: url(#rough); white-space: nowrap; }
.pc.stamp { filter: none; }
.tape-in { height: 46px; background: rgba(236,226,196,.82); background-image: ${noise}; clip-path: polygon(0 8%,3% 0,97% 6%,100% 0,98% 92%,100% 100%,2% 94%,0 100%); transform-origin: left center; }
.pc.tape { filter: none; }
.counter-in { position: relative; min-width: 100%; background: #FBF8F1; background-image: ${noise}; padding: 0 0.3em; font-weight: 700; clip-path: ${torn(1, 12)}; }
.cv { position: absolute; left: 0.3em; top: 0.05em; white-space: nowrap; }
.ov { position: absolute; left: 0; top: 0; pointer-events: none; }
.brand { position: absolute; left: 50px; top: 38px; z-index: 5; font-family: "Oswald"; font-weight: 600; font-size: 26px; letter-spacing: 0.06em; color: ${P.cream}; background: ${P.ink}; padding: 4px 14px; transform: rotate(-1.5deg); }
.brand i { font-style: normal; color: ${P.mustard}; margin-left: 10px; font-weight: 400; }
.grain { position: absolute; inset: 0; z-index: 6; pointer-events: none; background: ${noise}; opacity: .35; mix-blend-mode: multiply; }
.vig { position: absolute; inset: 0; z-index: 6; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(20,15,8,.38)); }
.cap { position: absolute; left: 0; right: 0; bottom: 40px; z-index: 7; display: flex; justify-content: center; }
.cap span { display: inline-block; max-width: 1400px; background: rgba(24,21,18,.86); color: #FBF8F1; font-family: "Roboto Mono"; font-weight: 500; font-size: 34px; line-height: 1.35; padding: 10px 26px; text-align: center; }
`;

const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(content.title)} · essay</title>
    <script src="vendor/gsap.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <svg width="0" height="0" style="position:absolute"><defs>${HALFTONE_DEFS}
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(70,110,150,.25)" stroke-width="2"/></pattern>
      <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>
    </defs></svg>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(TOTAL)}" data-width="${W}" data-height="${H}">
      ${sections.join("\n      ")}
      <div class="brand">DSC ACADEMY<i>${esc(content.series || "")}</i></div>
      <div class="grain"></div><div class="vig"></div>
      ${caps.join("\n      ")}
      ${audioTags.join("\n      ")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${js.join("\n      ")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

const dir = projectDir(buildDir);
fs.mkdirSync(path.join(dir, "fonts"), { recursive: true });
fs.mkdirSync(path.join(dir, "vendor"), { recursive: true });
for (const fnt of fs.readdirSync("assets/fonts-essay").filter((x) => x.endsWith(".ttf"))) fs.copyFileSync(path.join("assets/fonts-essay", fnt), path.join(dir, "fonts", fnt));
fs.copyFileSync("assets/vendor/gsap.min.js", path.join(dir, "vendor", "gsap.min.js"));
for (const a of audioFiles) fs.copyFileSync(path.join(buildDir, a), path.join(dir, a));
writeIndex(content.id, "16x9", dir, html);
fs.writeFileSync(path.join(workDir(buildDir), "pacing.json"), JSON.stringify({ warnings, scenes: pacing }, null, 2));
for (const w of warnings) console.log("⚠ Nhịp: " + w);
console.log(`Đã tạo ${dir}/index.html (${TOTAL}s, ${content.scenes.length} cảnh)`);
