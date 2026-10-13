#!/usr/bin/env node
// Dựng composition HyperFrames (16:9 và 9:16) từ kịch bản + mốc thời gian giọng đọc.
//
// Cách dùng:  node scripts/build.mjs content/pe-la-gi.json
// Đầu vào:    content/<id>.json, build/<id>/timings.json (nếu chưa có giọng đọc thì tự ước lượng)
// Kết quả:    build/<id>/video-16x9/index.html, build/<id>/video-9x16/index.html

import fs from "node:fs";
import path from "node:path";
import { figureSVG, poseTween, breathe, walkIn, blinks } from "./lib/figure.mjs";
import { BRAND } from "./lib/brand.mjs";
import { macroScene, macroCSS } from "./lib/scenes-macro.mjs";
import { extraScene, extraCSS } from "./lib/scenes-extra.mjs";
import { chunkCaption } from "./lib/captions.mjs";

const contentPath = process.argv[2];
if (!contentPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/build.mjs content/pe-la-gi.json");
  process.exit(1);
}
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const buildDir = path.join("build", content.id);
fs.mkdirSync(buildDir, { recursive: true });

// ---------- Mốc thời gian ----------
const timingsPath = path.join(buildDir, "timings.json");
let timings;
if (fs.existsSync(timingsPath)) {
  timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
  console.log(`Dùng mốc thời gian từ giọng đọc thật (${timings.duration}s).`);
} else {
  // Chưa có giọng đọc: ước lượng ~3,8 âm tiết/giây + 0,6s nghỉ giữa cảnh (để xem thử hình).
  let t = 0;
  const scenes = content.scenes.map((s) => {
    const syl = s.text.split(/\s+/).length;
    const d = syl / 3.4 + 0.5;
    const out = { id: s.id, start: Number(t.toFixed(3)), end: Number((t + d).toFixed(3)) };
    t += d;
    return out;
  });
  timings = { source: "estimate", audio: null, duration: Number(t.toFixed(3)), scenes };
  console.log(`Chưa có giọng đọc — dùng thời lượng ước lượng (${t.toFixed(1)}s), video sẽ không có tiếng.`);
}
const OUTRO_HOLD = 1.5;
const TOTAL = Number((timings.duration + OUTRO_HOLD).toFixed(3));

// ---------- Tiện ích ----------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n) => Number(n).toFixed(3);

// ---------- Các kiểu cảnh ----------
// Mỗi hàm trả { html, js(t0, dur) } — html nằm trong <section class="clip">, js là các tween GSAP.
function renderScene(scene, idx, o) {
  const v = scene.visual;
  const id = `sc${idx}`;
  const A = BRAND;
  const inn = (sel, t, extra = "") =>
    `tl.fromTo("${sel}", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out"${extra} }, ${f(t)});`;
  const pop = (sel, t) =>
    `tl.fromTo("${sel}", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, ${f(t)});`;
  const steps = (n, t0, dur) => Array.from({ length: n }, (_, i) => t0 + 0.25 + (i * (dur * 0.62)) / Math.max(n, 1));

  switch (v.type) {
    case "title":
      return {
        html: `<div class="stack center"><div class="kicker" id="${id}-k">${esc(content.series)}</div>
          <h1 class="mega" id="${id}-h">${esc(v.headline)}</h1>
          <div class="underline" id="${id}-u"></div>
          <p class="sub" id="${id}-s">${esc(v.sub)}</p></div>`,
        js: (t, d) => [
          inn(`#${id}-k`, t + 0.1),
          pop(`#${id}-h`, t + 0.3),
          `tl.fromTo("#${id}-u", { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, ${f(t + 0.75)});`,
          inn(`#${id}-s`, t + 1.0),
        ],
      };
    case "formula":
      return {
        html: `<div class="formula"><div class="f-left" id="${id}-l">${esc(v.left)} =</div>
          <div class="frac"><div class="f-top" id="${id}-t">${esc(v.top)}</div><div class="f-bar" id="${id}-b"></div><div class="f-bot" id="${id}-o">${esc(v.bottom)}</div></div></div>`,
        js: (t, d) => {
          const [a, b, c] = steps(3, t, d);
          return [
            pop(`#${id}-l`, a),
            `tl.fromTo("#${id}-b", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.inOut" }, ${f(b)});`,
            inn(`#${id}-t`, b + 0.15),
            inn(`#${id}-o`, c),
          ];
        },
      };
    case "numbers":
      return {
        html: `<div class="stack"><div class="label" id="${id}-lb">${esc(v.label)}</div>
          ${v.items.map((it, i) => `<div class="card row" id="${id}-i${i}"><span class="k">${esc(it.k)}</span><span class="v">${esc(it.v)}</span></div>`).join("")}</div>`,
        js: (t, d) => {
          const st = steps(v.items.length + 1, t, d);
          return [inn(`#${id}-lb`, st[0]), ...v.items.map((_, i) => inn(`#${id}-i${i}`, st[i + 1]))];
        },
      };
    case "calc":
      return {
        html: `<div class="stack center"><div class="expr" id="${id}-e">${esc(v.expr)}</div>
          <div class="eq" id="${id}-q">=</div><div class="result" id="${id}-r">${esc(v.result)}</div></div>`,
        js: (t, d) => {
          const [a, b] = steps(2, t, d);
          return [inn(`#${id}-e`, a), inn(`#${id}-q`, b - 0.2), pop(`#${id}-r`, b)];
        },
      };
    case "coins": {
      const coins = Array.from({ length: 10 }, (_, i) => `<div class="coin" id="${id}-c${i}">1đ</div>`).join("");
      return {
        html: `<div class="stack center"><div class="coins-row">
            <div class="coin-group"><div class="label">Nhà đầu tư trả</div><div class="coin-grid">${coins}</div><div class="big" id="${id}-p">${esc(v.pay)}</div></div>
            <div class="arrow" id="${id}-a">${o.vertical ? "↓" : "→"}</div>
            <div class="coin-group" id="${id}-rg"><div class="label">Công ty làm ra</div><div class="coin-grid one"><div class="coin gold" id="${id}-g">1đ</div></div><div class="big" id="${id}-gt">${esc(v.get)}</div></div>
          </div><p class="sub" id="${id}-cap">${esc(v.caption)}</p></div>`,
        js: (t, d) => {
          const out = [];
          for (let i = 0; i < 10; i++) out.push(pop(`#${id}-c${i}`, t + 0.3 + i * 0.09));
          out.push(inn(`#${id}-p`, t + 1.3), pop(`#${id}-a`, t + 1.7), inn(`#${id}-rg`, t + 1.95), pop(`#${id}-g`, t + 2.1), inn(`#${id}-gt`, t + 2.3), inn(`#${id}-cap`, t + d * 0.62));
          return out;
        },
      };
    }
    case "trend": {
      const up = v.direction !== "down";
      const pts = up ? [[0, 300], [120, 250], [220, 270], [340, 180], [450, 200], [560, 90], [680, 30]] : [[0, 40], [120, 90], [220, 70], [340, 170], [450, 150], [560, 240], [680, 290]];
      const len = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
      const d0 = pts.map((p, i) => `${i ? "L" : "M"}${p[0] + 20} ${p[1] + 20}`).join(" ");
      return {
        html: `<div class="stack center"><h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>
          <svg class="chart" viewBox="0 0 720 340"><line x1="20" y1="330" x2="710" y2="330" stroke="${A.line}" stroke-width="3"/>
          <path id="${id}-p" d="${d0}" fill="none" stroke="${up ? A.accentDark : A.down}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"/></svg>
          <p class="sub" id="${id}-s">${esc(v.sub)}</p></div>`,
        js: (t, d) => [
          pop(`#${id}-h`, t + 0.2),
          `tl.to("#${id}-p", { attr: { "stroke-dashoffset": 0 }, duration: ${f(Math.min(1.8, d * 0.45))}, ease: "power1.inOut" }, ${f(t + 0.5)});`,
          inn(`#${id}-s`, t + d * 0.5),
        ],
      };
    }
    case "split":
      return {
        html: `<div class="stack center"><h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>
          <div class="split"><div class="card good" id="${id}-a"><div class="icon">✓</div>${esc(v.a)}</div>
          <div class="or" id="${id}-o">hay</div>
          <div class="card warn" id="${id}-b"><div class="icon">?</div>${esc(v.b)}</div></div></div>`,
        js: (t, d) => {
          const [a, b, c] = steps(3, t, d);
          return [pop(`#${id}-h`, a), inn(`#${id}-a`, b), pop(`#${id}-o`, (b + c) / 2), inn(`#${id}-b`, c)];
        },
      };
    case "compare": {
      const max = Math.max(...v.bars.map((b) => b.v));
      return {
        html: `<div class="stack"><h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>
          ${v.bars.map((b, i) => `<div class="bar-row" id="${id}-r${i}"><span class="bk">${esc(b.k)}</span><div class="bar-track"><div class="bar ${b.tone || ""}" id="${id}-b${i}" style="width:${((b.v / max) * 100).toFixed(1)}%"><span>${esc(b.label ?? "P/E " + b.v)}</span></div></div></div>`).join("")}
          <p class="note" id="${id}-n">${esc(v.note || "")}</p></div>`,
        js: (t, d) => {
          const st = steps(v.bars.length, t + 0.3, d * 0.9);
          return [
            pop(`#${id}-h`, t + 0.15),
            ...v.bars.flatMap((_, i) => [
              inn(`#${id}-r${i}`, st[i]),
              `tl.fromTo("#${id}-b${i}", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power3.out" }, ${f(st[i] + 0.1)});`,
            ]),
            inn(`#${id}-n`, t + d * 0.7),
          ];
        },
      };
    }
    case "warning":
      return {
        html: `<div class="stack center"><svg class="sign" id="${id}-w" viewBox="0 0 200 180"><path d="M100 12 L190 168 L10 168 Z" fill="${A.warn}" stroke="${A.ink}" stroke-width="8" stroke-linejoin="round"/><rect x="92" y="62" width="16" height="58" rx="8" fill="${A.ink}"/><circle cx="100" cy="142" r="10" fill="${A.ink}"/></svg>
          <h2 class="h2" id="${id}-h">${esc(v.headline)}</h2><p class="sub" id="${id}-s">${esc(v.sub)}</p></div>`,
        js: (t, d) => [
          pop(`#${id}-w`, t + 0.2),
          `tl.fromTo("#${id}-w", { rotation: -8 }, { rotation: 8, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${f(t + 0.65)});`,
          inn(`#${id}-h`, t + 0.6),
          inn(`#${id}-s`, t + d * 0.5),
        ],
      };
    case "checklist":
      return {
        html: `<div class="stack"><h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>
          ${v.items.map((it, i) => `<div class="check-row" id="${id}-r${i}"><svg class="box" viewBox="0 0 60 60"><rect x="4" y="4" width="52" height="52" rx="12" fill="none" stroke="${A.ink}" stroke-width="6"/><path id="${id}-m${i}" d="M16 31 L27 42 L45 19" fill="none" stroke="${A.accentDark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="48" stroke-dashoffset="48"/></svg><span>${esc(it)}</span></div>`).join("")}</div>`,
        js: (t, d) => {
          const st = steps(v.items.length, t + 0.3, d);
          return [
            pop(`#${id}-h`, t + 0.15),
            ...v.items.flatMap((_, i) => [
              inn(`#${id}-r${i}`, st[i]),
              `tl.to("#${id}-m${i}", { attr: { "stroke-dashoffset": 0 }, duration: 0.35, ease: "power2.out" }, ${f(st[i] + 0.35)});`,
            ]),
          ];
        },
      };
    case "outro":
      return {
        html: `<div class="stack center"><div class="wordmark" id="${id}-m"><span>DSC</span> Academy</div>
          <h2 class="h2" id="${id}-h">${esc(v.headline)}</h2><p class="sub" id="${id}-s">${esc(v.sub)}</p>
          <div class="cta" id="${id}-c">${esc(v.cta || "Đọc bài viết bên dưới")}</div>
          <p class="disclaimer" id="${id}-d">${esc(v.disclaimer)}</p></div>`,
        js: (t, d) => [pop(`#${id}-m`, t + 0.15), inn(`#${id}-h`, t + 0.45), inn(`#${id}-s`, t + 0.7), pop(`#${id}-c`, t + 1.0), inn(`#${id}-d`, t + 1.3)],
      };
    default: {
      const m = macroScene(v, id, { inn, pop, steps, esc, f, A, o }) || extraScene(v, id, { inn, pop, steps, esc, f, A, o });
      if (m) return m;
      throw new Error(`Kiểu cảnh chưa hỗ trợ: ${v.type} (cảnh ${scene.id})`);
    }
  }
}

// ---------- Ghép composition ----------
function build(orientation) {
  const vertical = orientation === "9x16";
  const W = vertical ? 1080 : 1920;
  const H = vertical ? 1920 : 1080;
  const o = { vertical };
  const A = BRAND;
  const capMax = vertical ? 26 : 46;

  const sections = [];
  const js = [];
  const caps = [];
  content.scenes.forEach((scene, i) => {
    const tm = timings.scenes[i];
    const start = tm.start;
    const end = i === content.scenes.length - 1 ? TOTAL : timings.scenes[i + 1].start;
    const dur = end - start;
    const r = renderScene(scene, i, o);
    sections.push(
      `<section id="scene-${i}" class="clip scene" data-start="${f(start)}" data-duration="${f(dur)}" data-track-index="1"><div class="panel" id="panel-${i}">${r.html}</div></section>`
    );
    js.push(`// ${scene.id}`);
    js.push(...r.js(start, tm.end - tm.start));
    // chuyển cảnh: nội dung cũ mờ dần trước khi cảnh mới vào
    if (i < content.scenes.length - 1) {
      js.push(`tl.to("#panel-${i}", { opacity: 0, y: -24, duration: 0.3, ease: "power2.in" }, ${f(end - 0.3)});`);
    }
    let pose = scene.visual.pose || "idle";
    if (vertical && pose === "point") pose = "pointUp";
    js.push(...poseTween(pose, Math.max(i === 0 ? 0.7 : 0, start - 0.05), { expr: scene.visual.face || (scene.visual.type === "calc" ? undefined : scene.visual.expr), emote: scene.visual.emote, end }));

    // phụ đề: chia đoạn theo số ký tự trong khoảng thời gian đọc của cảnh
    const chunks = chunkCaption(scene.text, capMax);
    const speechDur = tm.end - tm.start - 0.25;
    const totalChars = chunks.reduce((s, c) => s + c.length, 0);
    let ct = tm.start;
    chunks.forEach((c, k) => {
      const cd = Math.max(0.6, (c.length / totalChars) * speechDur);
      caps.push(
        `<div class="clip cap" data-start="${f(ct)}" data-duration="${f(k === chunks.length - 1 ? tm.end - ct : cd)}" data-track-index="3"><span class="cap-text">${esc(c)}</span></div>`
      );
      ct += cd;
    });
  });
  js.push(...breathe(TOTAL), ...walkIn(), ...blinks(TOTAL));
  js.unshift(`tl.fromTo("#fig-wrap", { opacity: 0, x: ${vertical ? 0 : -80}, y: ${vertical ? 80 : 0} }, { opacity: 1, x: 0, y: 0, duration: 0.7, ease: "power3.out" }, 0);`);

  const audio = timings.audio
    ? `<audio id="voiceover" src="${timings.audio}" data-start="0" data-duration="${f(timings.duration)}" data-track-index="2" data-volume="1"></audio>`
    : "";

  const css = `
@font-face { font-family: "Inter"; src: url("fonts/Inter-Regular.otf") format("opentype"); font-weight: 400; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-SemiBold.otf") format("opentype"); font-weight: 600; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-ExtraBold.otf") format("opentype"); font-weight: 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${A.paper}; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Inter", sans-serif; color: ${A.ink};
  background: radial-gradient(circle at 1px 1px, ${A.dot} 1.5px, transparent 0) 0 0 / 36px 36px, ${A.paper}; }
.brand { position: absolute; left: ${vertical ? 60 : 64}px; top: ${vertical ? 90 : 46}px; display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: ${vertical ? 30 : 26}px; color: ${A.ink}; }
.brand b { background: ${A.ink}; color: ${A.accent}; padding: 6px 12px; border-radius: 10px; font-weight: 800; letter-spacing: 0.04em; }
.brand i { font-style: normal; color: ${A.muted}; font-weight: 400; }
#fig-wrap { position: absolute; ${vertical ? "left: 354px; top: 1180px; width: 372px; height: 620px;" : "left: 120px; top: 270px; width: 440px; height: 733px;"} }
.scene { position: absolute; inset: 0; }
.panel { position: absolute; ${vertical ? "left: 70px; top: 190px; width: 940px; height: 830px;" : "left: 640px; top: 130px; width: 1180px; height: 740px;"} display: flex; align-items: center; justify-content: center; }
.stack { display: flex; flex-direction: column; gap: ${vertical ? 34 : 28}px; width: 100%; }
.stack.center { align-items: center; text-align: center; }
.kicker { font-size: ${vertical ? 34 : 30}px; font-weight: 600; color: ${A.accentDark}; letter-spacing: 0.02em; }
.mega { font-size: ${vertical ? 150 : 168}px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.underline { width: ${vertical ? 420 : 520}px; height: 18px; border-radius: 9px; background: ${A.accent}; transform-origin: left center; }
.h2 { font-size: ${vertical ? 76 : 80}px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
.sub { font-size: ${vertical ? 46 : 46}px; font-weight: 400; color: ${A.muted}; line-height: 1.3; max-width: 1000px; }
.label { font-size: ${vertical ? 40 : 38}px; font-weight: 600; color: ${A.muted}; }
.card { background: #fff; border: 4px solid ${A.ink}; border-radius: 28px; padding: 30px 40px; box-shadow: 8px 8px 0 ${A.ink}; }
.row { display: flex; justify-content: space-between; align-items: baseline; font-size: ${vertical ? 46 : 52}px; }
.row .k { font-weight: 600; } .row .v { font-weight: 800; color: ${A.accentDark}; font-size: ${vertical ? 70 : 76}px; }
.formula { display: flex; ${vertical ? "flex-direction: column;" : ""} align-items: center; gap: 40px; }
.f-left { font-size: ${vertical ? 110 : 120}px; font-weight: 800; white-space: nowrap; }
.frac { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.f-top, .f-bot { font-size: ${vertical ? 46 : 50}px; font-weight: 600; padding: 18px 28px; border-radius: 18px; background: #fff; border: 4px solid ${A.ink}; text-align: center; }
.f-top { background: ${A.accentSoft}; }
.f-bar { width: 100%; height: 10px; background: ${A.ink}; border-radius: 5px; }
.expr { font-size: ${vertical ? 104 : 120}px; font-weight: 800; letter-spacing: -0.02em; }
.eq { font-size: 90px; font-weight: 800; color: ${A.muted}; }
.result { font-size: ${vertical ? 120 : 136}px; font-weight: 800; background: ${A.accent}; padding: 16px 56px; border-radius: 40px; border: 5px solid ${A.ink}; box-shadow: 10px 10px 0 ${A.ink}; }
.coins-row { display: flex; ${vertical ? "flex-direction: column;" : ""} align-items: ${vertical ? "center" : "flex-start"}; gap: ${vertical ? 30 : 60}px; }
.coin-group { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.coin-grid { display: grid; grid-template-columns: repeat(5, ${vertical ? 68 : 84}px); gap: 14px; }
.coin-grid.one { grid-template-columns: ${vertical ? 68 : 84}px; }
.coin { width: ${vertical ? 68 : 84}px; height: ${vertical ? 68 : 84}px; border-radius: 50%; border: 5px solid ${A.ink}; background: ${A.accentSoft}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 26px; }
.coin.gold { background: ${A.warn}; }
.big { font-size: 56px; font-weight: 800; }
.arrow { font-size: 110px; font-weight: 800; color: ${A.accentDark}; ${vertical ? "" : "margin-top: 110px;"} }
.chart { width: ${vertical ? 900 : 860}px; height: auto; }
.split { display: flex; ${vertical ? "flex-direction: column;" : ""} align-items: center; gap: ${vertical ? 18 : 36}px; }
.split .card { ${vertical ? "padding: 22px 30px;" : ""} width: ${vertical ? 820 : 460}px; font-size: ${vertical ? 50 : 46}px; font-weight: 600; line-height: 1.25; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.split .icon { width: 96px; height: 96px; border-radius: 50%; border: 5px solid ${A.ink}; display: flex; align-items: center; justify-content: center; font-size: 56px; font-weight: 800; }
.split .good .icon { background: ${A.accent}; } .split .warn .icon { background: ${A.warn}; }
.or { font-size: 48px; font-weight: 800; color: ${A.muted}; }
.bar-row { display: flex; align-items: center; gap: 28px; }
.bk { width: ${vertical ? 270 : 280}px; font-size: ${vertical ? 44 : 46}px; font-weight: 600; flex-shrink: 0; }
.bar-track { flex: 1; height: 96px; }
.bar { height: 100%; background: ${A.accent}; border: 4px solid ${A.ink}; border-radius: 20px; transform-origin: left center; display: flex; align-items: center; justify-content: flex-end; padding-right: 26px; font-size: 40px; font-weight: 800; white-space: nowrap; min-width: 220px; }
.bar.bad { background: #F6B6B8; } .bar.warn { background: #FFE08A; } .bar.ink { background: #C9D3E8; }
.note { font-size: 30px; color: ${A.muted}; }
.sign { width: ${vertical ? 300 : 260}px; height: auto; }
.check-row { display: flex; align-items: center; gap: 30px; font-size: ${vertical ? 56 : 60}px; font-weight: 600; }
.check-row .box { width: 84px; height: 84px; flex-shrink: 0; }
.wordmark { font-size: ${vertical ? 80 : 72}px; font-weight: 800; }
.wordmark span { background: ${A.ink}; color: ${A.accent}; padding: 4px 22px; border-radius: 18px; }
.cta { font-size: 46px; font-weight: 800; color: #fff; background: ${A.down}; padding: 22px 56px; border-radius: 60px; }
.disclaimer { font-size: ${vertical ? 30 : 26}px; color: ${A.muted}; max-width: 900px; line-height: 1.4; }
.cap { position: absolute; left: 0; right: 0; ${vertical ? "top: 1062px;" : "bottom: 54px;"} display: flex; justify-content: center; ${vertical ? "" : "padding-left: 520px;"} }
.cap-text { display: inline-block; max-width: ${vertical ? 940 : 1240}px; background: ${A.ink}; color: #fff; font-size: ${vertical ? 46 : 40}px; font-weight: 600; line-height: 1.3; padding: 14px 30px; border-radius: 18px; text-align: center; }
${macroCSS(A)}
${extraCSS(A)}
`;

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(content.title)} · ${orientation}</title>
    <script src="vendor/gsap.min.js"></script>
    <style>${css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(TOTAL)}" data-width="${W}" data-height="${H}">
      <div class="brand"><b>DSC</b> Academy <i>· ${content.episode ? `Bài ${content.episode}/12 · ` : ""}${esc(content.title)}</i></div>
      <div id="fig-wrap">${figureSVG(A)}</div>
      ${sections.join("\n      ")}
      ${caps.join("\n      ")}
      ${audio}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${js.join("\n      ")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

for (const orientation of (process.env.ORIENTATIONS || "16x9").split(",")) {
  const dir = path.join(buildDir, `video-${orientation}`);
  fs.mkdirSync(path.join(dir, "fonts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "vendor"), { recursive: true });
  for (const fnt of fs.readdirSync("assets/fonts")) fs.copyFileSync(path.join("assets/fonts", fnt), path.join(dir, "fonts", fnt));
  fs.copyFileSync("assets/vendor/gsap.min.js", path.join(dir, "vendor", "gsap.min.js"));
  if (timings.audio) fs.copyFileSync(path.join(buildDir, timings.audio), path.join(dir, timings.audio));
  fs.writeFileSync(path.join(dir, "index.html"), build(orientation));
  console.log(`Đã tạo ${dir}/index.html`);
}
console.log(`Tổng thời lượng: ${TOTAL}s. Bước tiếp theo: npm run render`);
