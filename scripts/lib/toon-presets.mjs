// Cảnh dựng sẵn cho định dạng toon: gộp chuỗi người que vào bộ dựng hoạt hình.
//
// Cảnh nào trong script.json có `visual.type` (title, formula, calc, dashboard, chain, pair, quiz, line, gauge, table, …,
// cùng trường như bảng kiểu cảnh trong CLAUDE.md) thì không cần vẽ trong scenes.mjs: hình lấy từ scripts/lib/scenes-basic.mjs
// (cùng hình 12 tập vĩ mô), đặt trong khung toon toàn màn hình với
//   - mốc theo lời: `visual.beats: ["từ", …]` — từ khoá cho từng mục hiện lần lượt; không có thì rải theo lời đọc
//   - An dạng rối (puppet.mjs) diễn trong cảnh: `pose`, `expr`, `emote`, nhép miệng theo giọng; `host: false` để bỏ
//   - chuyển cảnh `visual.trans` (mặc định: đổi `section` → giấy kraft, còn lại xoay vòng whip/slice/iris), máy quay trôi
//   - `visual.punch`: "từ" hoặc { at, x, y, z } — phóng nhanh vào khung đúng từ khoá
//   - `visual.gag`: { at?, dur?, sticker, bg, expr, pose, sound, sweat } — cắt cận mặt An phản ứng (không lời thoại)
//   - `visual.shake`: "từ" — rung khung khi va chạm; cảnh `warning` tự rung
//   - cảnh `outro` thành thẻ cuối (k.endCard) có miễn trừ trách nhiệm
// Hình vẽ tay vẫn viết trong scenes.mjs như cũ; hai cách dùng chung được trong một video.
import { renderScene, seriesCSS } from "./scenes-basic.mjs";
import { BRAND } from "./brand.mjs";
import { puppetSVG, pose, expr, lipSync, hop, gestureBeats, COSTUMES } from "./puppet.mjs";
import { visemeCues } from "./align.mjs";

export const BASIC = ["title", "formula", "numbers", "calc", "coins", "trend", "split", "compare", "warning", "checklist", "outro"];
export const MACRO = ["dashboard", "chain", "pair", "versus", "tide", "quiz", "notebook"];
export const EXTRA = ["line", "cycle", "gauge", "stack", "table", "steps", "scale", "seesaw", "tank", "slider", "grid", "chips", "calendar"];
export const PRESET_TYPES = new Set([...BASIC, ...MACRO, ...EXTRA]);
export const isPreset = (scene) => PRESET_TYPES.has(scene?.visual?.type);

// Tư thế/biểu cảm của người que → rối
const POSE = { idle: "idle", point: "point", pointUp: "holdUp", present: "explain", wave: "wave", cheer: "gasp", think: "count", shrug: "shrug", hips: "hips", headHold: "headHold", facepalm: "headHold" };
const EXPR = { happy: "happy", excited: "excited", surprised: "surprised", worried: "sad", sad: "sad", thinking: "neutral", confused: "sad", confident: "smug", neutral: "neutral" };
const REST = { happy: "smile", excited: "grin", surprised: "o", sad: "frown", smug: "smirk", neutral: "flat" };
const EMOTE = { question: "?", exclaim: "!", bulb: "✦", sparkle: "✦", sweat: "…" };
const ROTATE = [["whip", { dir: 1 }], ["slice", {}], ["whip", { dir: -1 }], ["iris", { cx: 1230, cy: 500 }]];

// CSS của cảnh dựng sẵn: CSS người que thu vào .pz (tránh trùng .brand/.cap của toon)
export function presetCSS() {
  const raw = seriesCSS({ vertical: false, W: 1920, H: 1080 });
  const skip = /^(@font-face|\*|html|#root|\.brand|\.cap|#fig-wrap|\.scene\b)/;
  const rules = raw.split("}").map((r) => r.trim()).filter(Boolean);
  const scoped = rules
    .map((r) => {
      const i = r.indexOf("{");
      const sel = r.slice(0, i).trim();
      if (!sel || skip.test(sel)) return "";
      return `${sel.split(",").map((s) => `.pz ${s.trim()}`).join(", ")} {${r.slice(i + 1)}}`;
    })
    .filter(Boolean)
    .join("\n");
  const A = BRAND;
  return `
.pz { position: absolute; inset: 0; color: ${A.ink}; background: radial-gradient(circle at 1px 1px, ${A.dot} 1.5px, transparent 0) 0 0 / 36px 36px, ${A.paper}; }
.pz .panel { position: absolute; left: 640px; top: 150px; width: 1180px; height: 740px; display: flex; align-items: center; justify-content: center; }
.pz.full .panel { left: 170px; width: 1580px; }
.pz-host { position: absolute; left: 0; top: 0; }
${scoped}`;
}

// Mốc cho n bước của một cảnh: từ khoá trong visual.beats, không thì rải đều theo các từ trong 85% đầu lời đọc
function stepper(i, v, ws, { at, has }, onStep) {
  return (n, t0, dur) =>
    Array.from({ length: n }, (_, k) => {
      const w = v.beats?.[k];
      let t;
      if (w && has(i, w)) t = at(i, w) - 0.12;
      else if (ws.length) t = ws[Math.min(ws.length - 1, Math.floor((k * ws.length * 0.85) / Math.max(n, 1)))].start - 0.1;
      else t = t0 + 0.25 + (k * dur * 0.62) / Math.max(n, 1);
      t = Math.max(t0, t);
      onStep(t);
      return t;
    });
}

const wordAt = (i, spec, { at, has }) => (typeof spec === "string" ? (has(i, spec) ? at(i, spec) : null) : spec?.at && has(i, spec.at) ? at(i, spec.at) : null);

// Dựng mọi cảnh dựng sẵn vào k (bộ công cụ của build-toon.mjs). Trả về số cảnh đã dựng.
export function applyPresets(k, content) {
  const { S, E, TOTAL, byScene, at, has, fx, A, T, anticipate } = k;
  const look = { at, has };
  const costume = COSTUMES[content.character] ? content.character : "an";
  const lead = content.lead ?? 0.12; // J-cut: hình vào sớm hơn lời một nhịp
  let n = 0;
  let rot = 0;
  let prevSection = content.scenes[0]?.section;
  content.scenes.forEach((scene, i) => {
    if (!isPreset(scene)) {
      if (scene.section) prevSection = scene.section;
      return;
    }
    const v = scene.visual;
    const id = `pz${i}`;
    const ws = byScene[i] || [];
    const t0 = i === 0 ? 0 : Math.max(0, S[i] - lead);
    const tEnd = S[i + 1] ?? TOTAL;
    // Chuyển cảnh: đổi phần → giấy kraft; warning → slam; còn lại xoay vòng, không lặp kiểu liền nhau
    let trans = v.trans;
    let opts = v.transOpts || {};
    if (!trans) {
      if (i === 0) trans = "cut";
      else if (scene.section && scene.section !== prevSection) trans = "wipe";
      else if (v.type === "warning") trans = "slam";
      else [trans, opts] = ROTATE[rot++ % ROTATE.length];
    }
    if (scene.section) prevSection = scene.section;

    if (v.type === "outro") {
      k.scene(id, k.endCard({ title: v.headline, sub: v.sub || "", cta: v.cta || "Đọc bài viết bên dưới video", disclaimer: v.disclaimer }), { at: t0, trans: v.trans || "iris", z: 850, drift: false });
      k.captionsUntil(t0 + 0.1);
      n++;
      return;
    }

    const r = renderScene(scene, i, { vertical: false, content, steps: stepper(i, v, ws, look, (t) => fx.sound(t, "tap", 0.6)) });
    const host = v.host !== false;
    let hostSvg = "";
    if (host) {
      const hid = `${id}h`;
      const p = POSE[v.pose] || "explain";
      const e = EXPR[v.type === "calc" ? v.face : v.expr] || (v.pose === "cheer" ? "excited" : "happy");
      const emote = EMOTE[v.emote];
      hostSvg = `<svg class="pz-host" viewBox="0 0 1920 1080" width="1920" height="1080">${puppetSVG(hid, costume, { x: 330, y: 1040, dir: 1, scale: 1.05 })}${
        emote ? `<text id="${hid}-emo" x="470" y="300" font-family="Inter" font-weight="800" font-size="130" fill="${BRAND.accentDark}" stroke="#fff" stroke-width="10" paint-order="stroke" opacity="0">${emote}</text>` : ""
      }</svg>`;
      // Anticipation: nhún xuống một nhịp trước khi đổi tư thế (nguyên lý hoạt hình), rồi diễn theo lời
      A(...anticipate(hid, t0 + 0.05));
      A(...pose(hid, p, t0 + 0.12), ...expr(hid, e, t0 + 0.12));
      if (v.pose === "cheer") A(...hop(hid, t0 + 0.3));
      if (ws.length) {
        A(...lipSync(hid, visemeCues(ws), REST[e] || "smile", { from: ws[0].start, to: ws.at(-1).end }));
        A(...gestureBeats(hid, p, ws[0].start, ws.at(-1).end, 1.6));
      }
      A(`tl.fromTo("#${hid}-bob", { attr: { transform: "translate(0 0)" } }, { attr: { transform: "translate(0 -5)" }, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor((tEnd - t0) / 1.3) - 1)}, immediateRender: false }, ${T(t0 + 0.4)});`);
      if (emote) fx.pop(`#${hid}-emo`, t0 + 0.45, { from: 0.2, kind: "boing" });
    }
    const html = `<div class="pz${host ? "" : " full"}"><div class="panel" id="${id}-pn">${r.html}</div>${hostSvg}</div>`;
    k.scene(id, html, { at: t0, trans, opts, drift: v.drift ?? { z: 1.035, origin: "62% 48%" } });
    A(`// ${scene.id || id} (${v.type})`, ...r.js(S[i], E[i] - S[i]));

    const tp = wordAt(i, v.punch, look);
    if (tp != null) k.punch(id, tp, v.punch?.x ?? 1230, v.punch?.y ?? 520, { z: v.punch?.z ?? 1.12 });
    const ts = wordAt(i, v.shake, look) ?? (v.type === "warning" ? S[i] + 0.3 : null);
    if (ts != null) {
      fx.shake(`#${id}-p`, ts);
      fx.sound(ts, "hit", 0.6);
    }
    if (v.gag) {
      const g0 = wordAt(i, v.gag.at, look) ?? S[i] + 0.4;
      k.gag({ key: `g${i}`, t0: g0, t1: g0 + (v.gag.dur ?? 1.1), ...v.gag });
    }
    n++;
  });
  return n;
}
