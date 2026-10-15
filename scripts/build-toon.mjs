#!/usr/bin/env node
// Dựng video hoạt hình kiểu OverSimplified (16:9) từ kịch bản "format": "toon".
//
// Cách dùng:  node scripts/build-toon.mjs videos/toon-lich-su-lam-phat/script.json
// Đầu vào:    script.json (lời, giọng, nhạc), voice.wav + timings.json (giọng đã tạo), music.wav (tuỳ chọn),
//             scenes.mjs: hình của từng cảnh, viết bằng bộ công cụ `k` dưới đây (hướng dẫn: docs/toon-guide.md).
// Kết quả:    videos/<id>/project/index.html + audio.wav (giọng + nhạc + tiếng động đã trộn)
//
// Mỗi lớp hình hiện đúng lúc lời đọc nhắc tới: mốc từng từ lấy bằng Whisper chạy trên máy (cần whisper-cli),
// nên định dạng này chỉ dựng trên máy; GitHub chỉ tạo giọng và nhạc.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { videoDir, projectDir, workDir } from "./lib/paths.mjs";
import { visemeCues } from "./lib/align.mjs";
import { sceneWords, estimateTimings, makeAt, weakAnchors } from "./lib/words.mjs";
import { synthSfx, mixdown, applySfxSet, setLibResolver, sfxBudget, mixOpts } from "./lib/sound.mjs";
import { resolveAudio, writeCredits, findTrack, trackFile } from "./lib/audio-lib.mjs";
import { writeIndex } from "./lib/edits.mjs";
import * as puppet from "./lib/puppet.mjs";
import * as fxlib from "./lib/toon-fx.mjs";
import * as props from "./lib/toon-props.mjs";
import { applyPresets, presetCSS } from "./lib/toon-presets.mjs";

const { createFx, captionsFromWords, page, transOverlays, grain, banner, INK, RED, T } = fxlib;
const { puppetSVG, pose, expr, lipSync, hop } = puppet;

const contentPath = process.argv[2];
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const dir = videoDir(content.id);
const proj = projectDir(dir);

// ---------- Giọng đọc và mốc từng từ ----------
// Mốc từ: Whisper khi có (máy hoặc CI), không thì chia đều theo âm tiết (scripts/lib/words.mjs).
// Chưa có giọng: thời lượng ước lượng, video không tiếng (xem thử hình).
const timingsPath = path.join(dir, "timings.json");
const timings = fs.existsSync(timingsPath) ? JSON.parse(fs.readFileSync(timingsPath, "utf8")) : estimateTimings(content);
if (!timings.audio) console.log(`⚠ Chưa có giọng đọc — dùng thời lượng ước lượng (${timings.duration.toFixed(1)}s), video không tiếng.`);
const voice = timings.audio ? path.join(dir, timings.audio) : null;
const TOTAL = timings.duration;
const S = timings.scenes.map((s) => s.start);
const E = timings.scenes.map((s) => s.end);
const { source: wordSource, words, byScene } = sceneWords(content, dir, timings);
if (wordSource !== "whisper" && timings.audio) console.log("⚠ Mốc từng từ: ước lượng (không có Whisper) — hình hiện gần đúng lời, dựng lại trên máy có Whisper để khớp chính xác.");
const { at, seq, has, lookups } = makeAt(content, byScene);
const stagger = (t, n, step = 0.11) => Array.from({ length: n }, (_, k) => t + k * step);

// ---------- Bộ công cụ cho scenes.mjs ----------
const fx = createFx();
const { A } = fx;
const scenes = []; // [{ id, html, z, drift, shift }]
const cuts = []; // [id, t, kiểu, tuỳ chọn]
const overlays = [];
const punches = [];
const idles = [];
const stamps = [];
const gags = [];
const actors = {};
let captionsUntil = Infinity;
const DRIFT_ORIGINS = ["60% 45%", "45% 60%", "62% 58%", "40% 42%"];

const k = {
  content, S, E, TOTAL, words, byScene, at, seq, has, stagger, T, fx, A,
  ...fxlib, ...props, ...puppet, visemeCues,
  // Một cảnh (khung hình). at: mốc vào, trans: kiểu chuyển (whip | zoom | zoomOut | slice | iris | wipe | slam | cut).
  // shift: dời bố cục SVG sang trái (px) khi vẽ lệch phải; drift: false (đứng yên) hoặc { z, origin, x, y, bg }.
  scene(id, html, { at: t, trans = "cut", opts = {}, drift, shift = 0, z } = {}) {
    if (shift) html = html.replace(`<svg viewBox="0 0 1920 1080"`, `<svg viewBox="${shift} 0 1920 1080"`);
    scenes.push({ id, html, z, drift, shift });
    if (t != null) cuts.push([id, t, trans, { ...opts, ...(z ? { z } : {}) }]);
  },
  // Quay lại một cảnh đã có (ví dụ bản đồ dùng chung)
  cut(id, t, trans = "cut", opts = {}) {
    cuts.push([id, t, trans, opts]);
  },
  // Lớp HTML nằm trên mọi cảnh (chữ chạy, nhãn…)
  overlay(html) {
    overlays.push(html);
  },
  // Phóng nhanh vào điểm (x, y) trong toạ độ SVG của cảnh (tự trừ shift)
  punch(id, t, x, y, o) {
    punches.push([id, t, x, y, o]);
  },
  // Vật đã hiện thì lơ lửng, lắc nhẹ từ t0 tới t1 (chọn phần tử không có transform riêng)
  idle(sel, t0, t1, o) {
    idles.push([sel, t0, t1, o]);
  },
  // Nhãn thời gian góc trên trái; txt null để ẩn
  stamp(t, txt) {
    stamps.push([t, txt]);
  },
  // Cắt sang cận mặt An phản ứng ~1 giây: { key, t0, t1, bg, ray, sticker, sound, sweat?, tilt? } và
  //   img: "an-shock" (ảnh nhân vật vẽ bằng AI trong media/cast/, xem scripts/toon-cast.mjs; imgH = cao ảnh px,
  //   imgBottom = phần ảnh (0–1) đặt ở mép dưới khung để cắt bỏ phần dưới), hoặc pose/expr cho nhân vật rối SVG.
  gag(g) {
    gags.push(g);
  },
  // Thẻ cuối: tiêu đề, dòng phụ, lời mời đọc bài, miễn trừ trách nhiệm; cast: ảnh nhân vật vẫy chào bên trái (ví dụ "an-base")
  endCard({ title, sub = "", cta = "Đọc bài viết bên dưới video", disclaimer, cast }) {
    return `<div class="end${cast ? " with-cast" : ""}"><div class="end-brand"><b>DSC</b> Academy</div><h2>${title}</h2>${sub ? `<div class="end-sub">${sub}</div>` : ""}<div class="end-cta">${cta}</div><div class="end-disc">${disclaimer}</div></div>${cast ? `<img class="end-cast" id="end-cast" src="${castSrc(cast)}" alt="">` : ""}`;
  },
  // Diễn viên ảnh AI (media/cast/<vai>-<tư thế>.cut.png, chân chạm đáy khung): mọi tư thế xếp chồng, hiện tư thế đầu.
  // (x, y) là điểm đặt chân, h là cao khung ảnh (px), flip: quay mặt ngược lại. Đổi tư thế bằng k.act.
  actor(id, role, poses, { x, y, h = 620, flip = false } = {}) {
    actors[id] = { role, poses };
    const imgs = poses
      .map((p, i) => `<image id="${id}-${p}" href="${castSrc(`${role}-${p}`)}" x="${-h / 2}" y="${-h}" width="${h}" height="${h}"${i ? ' opacity="0"' : ""}/>`)
      .join("");
    return `<g transform="translate(${x} ${y})${flip ? " scale(-1 1)" : ""}"><g id="${id}"><g id="${id}-b">${imgs}</g></g></g>`;
  },
  // Đổi tư thế lúc t, nhún co giãn nhẹ (squash) cho có cảm giác diễn
  act(id, pose, t, { squash = true } = {}) {
    const a = actors[id];
    if (!a?.poses.includes(pose)) throw new Error(`act("${id}", "${pose}"): diễn viên không có tư thế này (${a?.poses.join(", ")})`);
    a.poses.forEach((p) => A(`tl.set("#${id}-${p}", { opacity: ${p === pose ? 1 : 0} }, ${T(t)});`));
    if (squash) A(`tl.fromTo("#${id}", { scaleX: 1.06, scaleY: 0.93, transformOrigin: "50% 100%" }, { scaleX: 1, scaleY: 1, duration: 0.35, ease: "back.out(2.5)", immediateRender: false }, ${T(t)});`);
  },
  // Thở / lắc lư nhẹ từ t0 tới t1 (lớp #id-b, không đụng tới cú nhún của k.act)
  sway(id, t0, t1, { rot = 1.5, period = 2.2 } = {}) {
    const n = Math.max(1, Math.floor((t1 - t0) / (period / 2)) - 1);
    A(`tl.fromTo("#${id}-b", { rotation: ${-rot}, transformOrigin: "50% 100%" }, { rotation: ${rot}, duration: ${T(period / 2)}, ease: "sine.inOut", yoyo: true, repeat: ${n}, immediateRender: false }, ${T(t0)});`);
  },
  // Ảnh nhân vật (đã tách nền) đặt trong SVG: <image> rộng = cao = h, tâm đáy ở (x, y)
  sprite(id, name, x, y, h) {
    return `<image id="${id}" href="${castSrc(name)}" x="${x - h / 2}" y="${y - h}" width="${h}" height="${h}" opacity="0"/>`;
  },
  // Phụ đề tắt từ mốc này (thường là lúc thẻ cuối hiện)
  captionsUntil(t) {
    captionsUntil = t;
  },
};

// Ảnh nhân vật vẽ bằng AI: videos/<id>/media/cast/<tên>.cut.png → project/media/cast/
const castDir = path.join(dir, "media", "cast");
function castSrc(name) {
  const file = `${name}.cut.png`;
  if (!fs.existsSync(path.join(castDir, file))) throw new Error(`Thiếu ảnh nhân vật ${castDir}/${file}: chạy node scripts/toon-cast.mjs ${contentPath}`);
  fs.mkdirSync(path.join(proj, "media", "cast"), { recursive: true });
  fs.copyFileSync(path.join(castDir, file), path.join(proj, "media", "cast", file));
  return `media/cast/${file}`;
}

// Cảnh dựng sẵn (visual.type trong script.json, scripts/lib/toon-presets.mjs) rồi tới hình vẽ tay trong scenes.mjs (tuỳ chọn)
const presetCount = applyPresets(k, content);
const scenesFile = path.join(dir, "scenes.mjs");
if (fs.existsSync(scenesFile)) {
  const mod = await import(pathToFileURL(path.resolve(scenesFile)).href);
  await mod.default(k);
}
if (!scenes.length) throw new Error(`Không có cảnh nào: thêm visual.type cho cảnh trong script.json hoặc viết ${dir}/scenes.mjs`);

// ---------- Chuyển cảnh, máy quay trôi, punch-in ----------
const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));
const sorted = cuts.slice().sort((a, b) => a[1] - b[1]);
sorted.forEach(([id, t, kind, opts], i) => {
  if (!byId[id]) throw new Error(`cut("${id}") nhưng chưa có scene("${id}")`);
  fx.trans(sorted[i - 1]?.[0], id, t, kind, opts);
  const sc = byId[id];
  if (sc.drift === false) return;
  const end = sorted[i + 1]?.[1] ?? TOTAL;
  fx.drift(id, t, end, { z: 1.06, origin: DRIFT_ORIGINS[i % DRIFT_ORIGINS.length], ...(sc.drift || {}) });
});
punches.forEach(([id, t, x, y, o]) => fx.punch(id, t, x - (byId[id]?.shift || 0), y, o));
idles.forEach(([sel, t0, t1, o]) => t1 - t0 > 0.6 && fx.idle(sel, t0, t1, o));
stamps.forEach(([t, txt]) => {
  if (!txt) return fx.hide("#stamp", t);
  A(`tl.set("#stamp", { textContent: ${JSON.stringify(txt)} }, ${T(t)});`);
  A(`tl.fromTo("#stamp", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.25, ease: "power3.out" }, ${T(t)});`);
  fx.sound(t, "tap");
});

// ---------- Gag cut: cận mặt An trên nền tia nắng, nhãn chữ đập xuống ----------
const GX = 1000, GY = 560; // tâm đầu An trong khung cận
const rays = (id, color) =>
  `<g id="${id}-rays">${Array.from({ length: 18 }, (_, n) => {
    const a = (n * 20 * Math.PI) / 180, b = ((n * 20 + 10) * Math.PI) / 180, R = 2400;
    return `<path d="M${GX} ${GY} L${GX + R * Math.cos(a)} ${GY + R * Math.sin(a)} L${GX + R * Math.cos(b)} ${GY + R * Math.sin(b)} Z" fill="${color}"/>`;
  }).join("")}</g>`;
const sweatDrops = (id) =>
  [[1290, 330, 1], [1340, 470, 0.8], [720, 360, 0.9]]
    .map(([x, y, s], n) => `<g transform="translate(${x} ${y}) scale(${s})"><path id="${id}-sw${n}" opacity="0" d="M0 -40 Q26 0 18 16 Q0 34 -18 16 Q-26 0 0 -40 Z" fill="#8fd3ff" stroke="${INK}" stroke-width="6"/></g>`)
    .join("");
const gagHtml = gags.map((g) => {
  const id = `gag-${g.key}`;
  // Mốc ước lượng (không Whisper) có thể làm gag ngắn bất thường: nới ra 0,6 s thay vì dừng dựng
  if (wordSource !== "whisper" && g.t1 - g.t0 < 0.6) g.t1 = g.t0 + 0.6;
  const dur = g.t1 - g.t0;
  if (dur < 0.6) throw new Error(`Gag "${g.key}" quá ngắn (${dur.toFixed(2)}s, cần ≥ 0,6s)`);
  const s = 2.4; // đầu An (toạ độ riêng 200, 240) đặt vào (GX, GY)
  A(`tl.set("#${id}", { opacity: 1 }, ${T(g.t0)});`, `tl.set("#${id}", { opacity: 0 }, ${T(g.t1)});`);
  A(`tl.fromTo("#${id}-z", { scale: 1.12, transformOrigin: "${GX}px ${GY}px" }, { scale: 1.02, duration: 0.25, ease: "power3.out", immediateRender: false }, ${T(g.t0)});`);
  A(`tl.to("#${id}-z", { scale: 1.07, duration: ${T(dur - 0.25)}, ease: "none" }, ${T(g.t0 + 0.25)});`);
  A(`tl.fromTo("#${id}-rays", { attr: { transform: "rotate(0 ${GX} ${GY})" } }, { attr: { transform: "rotate(14 ${GX} ${GY})" }, duration: ${T(dur)}, ease: "none", immediateRender: false }, ${T(g.t0)});`);
  if (g.img) {
    // Ảnh AI: giật mình nảy lên (co giãn), rồi rung/lắc đầu nhẹ tới hết gag
    A(`tl.fromTo("#${id}-an", { scaleX: 1.1, scaleY: 0.86, y: 60, transformOrigin: "50% 100%" }, { scaleX: 1, scaleY: 1, y: 0, duration: 0.45, ease: "elastic.out(1.1, 0.4)", immediateRender: false }, ${T(g.t0)});`);
    const n = Math.max(1, Math.floor((dur - 0.45) / 0.09));
    A(`tl.fromTo("#${id}-an", { rotation: ${g.wobble ?? 1.2} }, { rotation: ${-(g.wobble ?? 1.2)}, duration: 0.09, ease: "sine.inOut", yoyo: true, repeat: ${n}, immediateRender: false }, ${T(g.t0 + 0.45)});`);
  } else {
    // Rối SVG: giật mình, đơ 0,5 giây rồi nhép miệng theo lời đang đọc
    A(...pose(id + "-an", g.pose || "gasp", g.t0 - 0.02, { dur: 0.2 }), ...expr(id + "-an", g.expr || "surprised", g.t0 - 0.02), ...hop(id + "-an", g.t0 + 0.02, 30));
    const ws = words.filter((w) => w.end > g.t0 && w.start < g.t1);
    const rest = { surprised: "o", smug: "smirk", sad: "frown" }[g.expr] || "flat";
    if (ws.length) A(...lipSync(id + "-an", visemeCues(ws), rest, { from: g.t0 + 0.5, to: Math.min(g.t1, ws.at(-1).end) }));
  }
  fx.slam(`#${id}-st`, g.t0 + 0.18, { kind: null, from: 2 });
  fx.sound(g.t0, g.sound || "scratch", g.sound === "hit" ? 0.7 : undefined, 1);
  if (g.sweat)
    [0, 1, 2].forEach((n) => A(`tl.fromTo("#${id}-sw${n}", { opacity: 1, y: 0 }, { opacity: 0, y: 160, duration: 0.7, ease: "power1.in", immediateRender: false }, ${T(g.t0 + 0.1 + n * 0.15)});`));
  return `<div class="gag" id="${id}"><div class="lay" id="${id}-z"><svg viewBox="0 0 1920 1080" width="1920" height="1080">
    <rect width="1920" height="1080" fill="${g.bg || "#ffd34d"}"/>${rays(id, g.ray || "#ffbf1f")}
    ${g.img ? (() => {
      const h = g.imgH || 1100;
      const y = 1080 - (g.imgBottom ?? 1) * h;
      return `<g transform="rotate(${g.tilt || 0} ${GX} ${GY})"><image id="${id}-an" href="${castSrc(g.img)}" x="${GX - h / 2}" y="${y}" width="${h}" height="${h}"/></g>`;
    })() : `<g transform="rotate(${g.tilt || 0} ${GX} ${GY})">${puppetSVG(id + "-an", content.character || "an", { x: GX, y: GY + 470 * s, dir: 1, scale: s })}</g>`}
    ${g.sweat ? sweatDrops(id) : ""}
    ${g.sticker ? banner(`${id}-st`, 1480, 230, g.sticker, { size: 110, bg: "#fff", color: RED, rot: 7 }) : ""}
  </svg></div></div>`;
});

// ---------- Âm thanh: giọng + tiếng động + nhạc nền (tự hạ khi có lời) ----------
fs.mkdirSync(path.join(proj, "vendor"), { recursive: true });
fs.mkdirSync(path.join(proj, "fonts"), { recursive: true });
fs.cpSync("assets/fonts", path.join(proj, "fonts"), { recursive: true });
fs.copyFileSync("assets/vendor/gsap.min.js", path.join(proj, "vendor", "gsap.min.js"));
for (const p of fxlib.usedPlugins(fx.anim)) fs.copyFileSync(`assets/vendor/${p}.min.js`, path.join(proj, "vendor", `${p}.min.js`));
setLibResolver((id) => trackFile(findTrack(id)));
// Quy chuẩn tiếng động (scripts/lib/sound.mjs: sfxBudget) trước khi đổi bộ tiếng; "sfxRules" trong kịch bản để chỉnh
const sfxEvents = applySfxSet(sfxBudget(fx.sfx, content.sfxRules), content.sfxSet);
console.log(`Tiếng động: giữ ${sfxEvents.length}/${fx.sfx.length} (${Math.round((sfxEvents.length / TOTAL) * 60)} tiếng/phút).`);
fs.writeFileSync(path.join(workDir(dir), "sfx.json"), JSON.stringify(sfxEvents.slice().sort((p, q) => p.t - q.t), null, 1));
fs.writeFileSync(path.join(dir, "sfx.wav"), synthSfx(sfxEvents, TOTAL));
const lib = resolveAudio(content, timings, TOTAL, dir);
writeCredits(dir, lib.used);
mixdown({
  voice,
  sfx: path.join(dir, "sfx.wav"),
  music: lib.music,
  musicVol: lib.musicVol ?? content.music?.volume ?? 1.5,
  beds: lib.beds,
  hits: lib.hits,
  duck: content.duck || {},
  total: TOTAL,
  ...mixOpts(content, timings),
  out: path.join(proj, "audio.wav"),
});

// ---------- HTML ----------
// Hạt giấy để đứng yên: cho nhảy vị trí (grainJitter) làm video nặng gần gấp đôi vì nhiễu khó nén.
const body = `<div class="brand"><b>DSC</b> Academy</div>
      <div class="stamp" id="stamp"></div>
      ${scenes.map((s) => `<div class="scn" id="${s.id}"${s.z ? ` style="z-index:${s.z}"` : ""}><div class="lay" id="${s.id}-d"><div class="lay" id="${s.id}-p">${s.html}</div></div></div>`).join("\n      ")}
      ${overlays.join("\n      ")}
      ${transOverlays}
      ${grain}
      ${gagHtml.join("\n      ")}
      ${captionsFromWords(words, { until: captionsUntil })}`;
const html = page({
  title: content.title,
  total: TOTAL,
  body,
  anim: fx.anim,
  extraCss: ".end-cast { position: absolute; left: 60px; bottom: -40px; height: 760px; } .end.with-cast { padding-left: 720px; padding-right: 100px; } .kw { padding-left: 0; } .cap { left: 160px; right: 160px; } .gag { position: absolute; inset: 0; z-index: 820; opacity: 0; overflow: hidden; }" + (presetCount ? presetCSS() : ""),
});
writeIndex(content.id, "16x9", proj, html);
console.log(`Dựng xong ${proj}/index.html: ${TOTAL.toFixed(1)}s, ${scenes.length} khung, ${cuts.length} lần chuyển cảnh, ${gags.length} gag, ${words.length} từ có mốc (${wordSource}), ${fx.sfx.length} tiếng động${presetCount ? `, ${presetCount} cảnh dựng sẵn` : ""}.`);
const weak = weakAnchors(lookups, wordSource);
if (weak.length) console.log(`⚠ Mốc từ dễ lệch (${weak.length}): ${weak.slice(0, 6).map((w) => `"${w.word}" ở ${w.scene}${w.p != null ? ` p=${w.p.toFixed(2)}` : ""}${w.exact ? "" : " nghe nhầm"}`).join(", ")}${weak.length > 6 ? " …" : ""} — xem lại nếu hình lệch lời`);
