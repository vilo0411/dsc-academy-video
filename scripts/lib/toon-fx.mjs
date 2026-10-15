// Bộ hiệu ứng cho định dạng "toon" (kiểu kênh hoạt hình lịch sử OverSimplified), dùng bởi scripts/build-toon.mjs:
// lớp hình bật ra theo mốc từng từ, con dấu đập xuống, bộ đếm số, bóng mặt cờ, bản đồ có mũi tên, nhãn tên có mũi tên.
// Mỗi hàm vừa trả về SVG vừa ghi lệnh GSAP (fx.anim) và tiếng động (fx.sfx) vào cùng một trục thời gian.

import fs from "node:fs";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

export const INK = "#1d1a1a";
export const PAPER = "#fbf6ec";
export const NAVY = "#0B1237";
export const TEAL = "#10F3BD";
export const RED = "#d8342a";
export const T = (n) => Number(n.toFixed(3));

export function createFx() {
  const anim = [];
  const sfx = [];
  const A = (...s) => anim.push(...s);
  const fx = {
    anim,
    sfx,
    A,
    // prio: cấp ưu tiên cho quy chuẩn tiếng động (sfxBudget); 1 = nhịp chính, luôn giữ
    sound: (t, kind, gain, prio) => sfx.push({ t, kind, ...(gain ? { gain } : {}), ...(prio ? { prio } : {}) }),
    show: (sel, t) => A(`tl.set("${sel}", { opacity: 1 }, ${T(t)});`),
    hide: (sel, t, dur = 0) =>
      A(dur ? `tl.to("${sel}", { opacity: 0, duration: ${dur} }, ${T(t)});` : `tl.set("${sel}", { opacity: 0 }, ${T(t)});`),
    // Bật ra (scale + back ease), kèm tiếng "pop" hoặc tiếng chỉ định
    pop(sel, t, { from = 0.3, ease = "back.out(2.2)", origin = "50% 50%", kind = "pop", dur = 0.32 } = {}) {
      A(`tl.fromTo("${sel}", { opacity: 0, scale: ${from}, transformOrigin: "${origin}" }, { opacity: 1, scale: 1, duration: ${dur}, ease: "${ease}" }, ${T(t)});`);
      if (kind) fx.sound(t, kind);
    },
    // Con dấu: to gấp đôi rồi đập xuống
    slam(sel, t, { kind = "stamp", from = 2.4 } = {}) {
      A(`tl.fromTo("${sel}", { opacity: 0, scale: ${from}, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.16, ease: "power4.in" }, ${T(t - 0.06)});`);
      if (kind) fx.sound(t + 0.08, kind);
    },
    // Trượt vào từ một phía (dx, dy tính bằng px)
    slideIn(sel, t, { dx = 0, dy = 0, dur = 0.4, kind = "whoosh" } = {}) {
      A(`tl.fromTo("${sel}", { opacity: 0, x: ${dx}, y: ${dy} }, { opacity: 1, x: 0, y: 0, duration: ${dur}, ease: "power3.out" }, ${T(t)});`);
      if (kind) fx.sound(t, kind);
    },
    // Bộ đếm: đổi chữ theo từng bước, tiếng tick, kết bằng "ding"
    count(sel, values, t, { step = 0.1, ding = true } = {}) {
      values.forEach((v, k) => A(`tl.set("${sel}", { textContent: ${JSON.stringify(String(v))} }, ${T(t + k * step)});`));
      values.slice(0, -1).forEach((_, k) => fx.sound(t + k * step, "tick"));
      if (ding) fx.sound(t + (values.length - 1) * step, "ding");
    },
    shake(sel, t, amp = 14) {
      A(`tl.fromTo("${sel}", { x: ${-amp} }, { x: 0, duration: 0.35, ease: "elastic.out(1.2, 0.3)" }, ${T(t)});`);
    },
    // Máy quay trên một nhóm có transformOrigin 0 0: đưa điểm (cx, cy) về giữa khung với độ phóng z
    cam(sel, cx, cy, z, t, dur = 0.8, ease = "power2.inOut") {
      A(`tl.to("${sel}", { x: ${T(960 - cx * z)}, y: ${T(540 - cy * z)}, scale: ${z}, duration: ${dur}, ease: "${ease}" }, ${T(t)});`);
    },
    camSet(sel, cx, cy, z, t = 0) {
      A(`tl.set("${sel}", { transformOrigin: "0 0", x: ${T(960 - cx * z)}, y: ${T(540 - cy * z)}, scale: ${z} }, ${T(t)});`);
    },
    // ---------- Chuyển cảnh: cảnh `to` thay cảnh `from` tại mốc t (id của .scn, không có #) ----------
    // slice: cảnh mới cắt chéo vào như khung truyện tranh (mép chéo quét từ phải sang trái)
    // whip: lia nhanh giữ đà (cũ tăng tốc ra, mới giảm tốc vào, nhoè chuyển động); dir 1 = sang trái, axis "y" = dọc
    // zoom: phóng xuyên qua điểm (cx, cy) của cảnh cũ; zoomOut: lùi ra; iris: vòng tròn mở từ (cx, cy)
    // wipe: tấm giấy kraft quét ngang, cắt cảnh khi giấy che kín; slam: cắt cứng + chớp trắng + giật; cut: cắt cứng
    // Mọi fromTo đặt immediateRender: false vì một cảnh (bản đồ) có thể vào nhiều lần.
    // withIn / withOut: phần tử khác (ví dụ người dẫn) đi theo cảnh mới / cảnh cũ trong cùng chuyển động
    trans(from, to, t, kind = "cut", { dir = 1, axis = "x", cx = 960, cy = 540, z = 2, withIn = [], withOut = [] } = {}) {
      const F = [from && `#${from}`, ...withOut].filter(Boolean).join(", ");
      const N = [`#${to}`, ...withIn].join(", ");
      const IR = "immediateRender: false";
      const reveal = (time) => A(`tl.set("${N}", { opacity: 1, zIndex: ${z} }, ${T(time)});`);
      const retire = (time) =>
        F && A(`tl.set("${F}", { opacity: 0, zIndex: 1, x: 0, y: 0, scale: 1, filter: "none", clipPath: "none" }, ${T(time)});`);
      if (withIn.length && kind !== "whip") A(`tl.set("${withIn.join(", ")}", { x: 0, y: 0, scale: 1, filter: "none" }, ${T(t - 0.4)});`);
      if (kind === "whip") {
        const D = (axis === "x" ? 1920 : 1080) * dir;
        if (F) A(`tl.fromTo("${F}", { ${axis}: 0, filter: "blur(0px)" }, { ${axis}: ${-D}, filter: "blur(22px)", duration: 0.2, ease: "power4.in", ${IR} }, ${T(t - 0.2)});`);
        reveal(t);
        A(`tl.fromTo("${N}", { ${axis}: ${D}, filter: "blur(22px)" }, { ${axis}: 0, filter: "blur(0px)", duration: 0.34, ease: "power4.out", ${IR} }, ${T(t)});`);
        retire(t);
        fx.sound(t - 0.22, "whoosh", undefined, 1);
      } else if (kind === "zoom") {
        if (F) A(`tl.fromTo("${F}", { scale: 1, transformOrigin: "${cx}px ${cy}px" }, { scale: 6, duration: 0.45, ease: "power3.in", ${IR} }, ${T(t - 0.35)});`);
        A(`tl.set("${N}", { zIndex: ${z} }, ${T(t - 0.15)});`);
        A(`tl.fromTo("${N}", { opacity: 0, scale: 0.55, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.4, ease: "power3.out", ${IR} }, ${T(t - 0.15)});`);
        retire(t + 0.25);
        fx.sound(t - 0.35, "whoosh", undefined, 1);
        fx.sound(t + 0.05, "pop", undefined, 1);
      } else if (kind === "zoomOut") {
        if (F) A(`tl.fromTo("${F}", { scale: 1, opacity: 1, transformOrigin: "50% 50%" }, { scale: 0.45, opacity: 0, duration: 0.35, ease: "power2.in", ${IR} }, ${T(t - 0.25)});`);
        A(`tl.set("${N}", { zIndex: ${z} }, ${T(t - 0.1)});`);
        A(`tl.fromTo("${N}", { opacity: 0, scale: 1.9, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out", ${IR} }, ${T(t - 0.1)});`);
        retire(t + 0.4);
        fx.sound(t - 0.25, "whoosh", undefined, 1);
      } else if (kind === "slice") {
        reveal(t);
        A(`tl.fromTo("${N}", { clipPath: "polygon(115% 0%, 140% 0%, 140% 100%, 95% 100%)" }, { clipPath: "polygon(-25% 0%, 140% 0%, 140% 100%, -45% 100%)", duration: 0.42, ease: "power3.inOut", ${IR} }, ${T(t - 0.1)});`);
        // Viền mực chạy theo mép chéo (tâm mép đi từ 105% → -35% bề ngang)
        A(`tl.fromTo("#slicebar", { x: 2016, opacity: 1 }, { x: -672, opacity: 1, duration: 0.42, ease: "power3.inOut", ${IR} }, ${T(t - 0.1)});`, `tl.set("#slicebar", { opacity: 0 }, ${T(t + 0.32)});`);
        retire(t + 0.35);
        fx.sound(t - 0.1, "swish", undefined, 1);
      } else if (kind === "iris") {
        reveal(t);
        A(`tl.fromTo("${N}", { clipPath: "circle(0px at ${cx}px ${cy}px)" }, { clipPath: "circle(2300px at ${cx}px ${cy}px)", duration: 0.55, ease: "power2.in", ${IR} }, ${T(t)});`);
        retire(t + 0.55);
        fx.sound(t, "swish", undefined, 1);
      } else if (kind === "wipe") {
        // Giấy rộng 2600px chạy đều: tại t giấy phủ từ -340 đến 2260px
        A(`tl.fromTo("#wipe", { x: -2600 }, { x: 1920, duration: 0.6, ease: "none", ${IR} }, ${T(t - 0.3)});`);
        reveal(t);
        retire(t);
        fx.sound(t - 0.3, "slide", undefined, 1);
      } else if (kind === "slam") {
        reveal(t);
        retire(t);
        A(`tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.3, ease: "power2.out", ${IR} }, ${T(t)});`);
        A(`tl.fromTo("#${to}", { scale: 1.1, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.35, ease: "power3.out", ${IR} }, ${T(t)});`);
        fx.sound(t, "hit", 0.7, 1);
      } else {
        reveal(t);
        retire(t);
      }
    },
    // Bóng thoại: bật ra từ đuôi, lắc nhẹ, tắt ở t1
    say(id, t0, t1) {
      fx.pop(`#${id}`, t0, { from: 0.2, origin: "50% 100%", kind: "pop", dur: 0.28 });
      A(`tl.fromTo("#${id}", { rotation: -2 }, { rotation: 2, duration: 0.4, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor((t1 - t0 - 0.3) / 0.4))}, immediateRender: false }, ${T(t0 + 0.28)});`);
      A(`tl.to("#${id}", { opacity: 0, scale: 0.6, duration: 0.15, ease: "power2.in" }, ${T(t1)});`);
    },
    // Chuyển động phụ cho vật đứng yên: lơ lửng (y) và lắc (rotation) qua lại từ t0 tới t1
    idle(sel, t0, t1, { y = 8, rot = 2, period = 1.6 } = {}) {
      const n = Math.max(1, Math.floor((t1 - t0) / (period / 2)) - 1);
      A(`tl.fromTo("${sel}", { y: 0, rotation: 0 }, { y: ${-y}, rotation: ${rot}, duration: ${T(period / 2)}, ease: "sine.inOut", yoyo: true, repeat: ${n}, immediateRender: false }, ${T(t0)});`);
    },
    // Máy quay trôi chậm suốt cảnh để khung không đứng yên (lớp #id-d)
    // bg: nền phòng (.bgx) trôi ngược chiều thêm bg px để có chiều sâu (thị sai)
    drift(id, t0, t1, { z = 1.06, origin = "50% 50%", x = 0, y = 0, bg = 0 } = {}) {
      A(`tl.fromTo("#${id}-d", { scale: 1, x: 0, y: 0, transformOrigin: "${origin}" }, { scale: ${z}, x: ${x}, y: ${y}, duration: ${T(t1 - t0)}, ease: "none", immediateRender: false }, ${T(t0)});`);
      if (bg) A(`tl.fromTo("#${id}-d .bgx", { x: 0 }, { x: ${bg}, duration: ${T(t1 - t0)}, ease: "none", immediateRender: false }, ${T(t0)});`);
    },
    // Chữ động: từng từ của kline(id) bật lên đúng mốc times[k] (mốc đọc từ Whisper); from: tỉ lệ ban đầu (>1 = đập xuống)
    words(id, times, { from = 0.4, kind = "key" } = {}) {
      times.forEach((t, k) => {
        const big = from > 1;
        A(`tl.fromTo("#${id}-${k}", { opacity: 0, scale: ${from}, y: ${big ? 0 : 30}, rotation: ${big ? 0 : k % 2 ? 6 : -6} }, { opacity: 1, scale: 1, y: 0, rotation: 0, duration: ${big ? 0.18 : 0.3}, ease: "${big ? "power4.in" : "back.out(2.4)"}", immediateRender: false }, ${T(t)});`);
        if (kind) fx.sound(t, kind);
      });
    },
    // Match cut bằng MorphSVG (GSAP, miễn phí từ 2025): path `sel` biến thành hình `shape` (selector hoặc chuỗi path d)
    // — ví dụ đồng xu → bánh xe. Trang tự nạp MorphSVGPlugin khi có lệnh này.
    morph(sel, shape, t, { dur = 0.6, ease = "power2.inOut", type = "linear", kind = "swish" } = {}) {
      A(`tl.to("${sel}", { morphSVG: { shape: ${JSON.stringify(shape)}, type: "${type}" }, duration: ${dur}, ease: "${ease}" }, ${T(t)});`);
      if (kind) fx.sound(t, kind);
    },
    // Nét vẽ hiện dần kiểu bảng trắng bằng DrawSVG (phần tử phải có stroke). Trang tự nạp DrawSVGPlugin.
    draw(sel, t, { dur = 0.8, ease = "power1.inOut", kind = "pen" } = {}) {
      A(`tl.fromTo("${sel}", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: ${dur}, ease: "${ease}" }, ${T(t)});`);
      if (kind) fx.sound(t, kind);
    },
    // Bút dạ vàng tô dưới một từ của kline (vạch từ trái sang)
    mark(sel, t, dur = 0.35) {
      A(`tl.fromTo("${sel}", { backgroundSize: "0% 38%" }, { backgroundSize: "100% 38%", duration: ${dur}, ease: "power2.out", immediateRender: false }, ${T(t)});`);
      fx.sound(t, "pen", 0.8);
    },
    // Phóng nhanh vào điểm (cx, cy) đúng từ khoá rồi thả về (lớp #id-p)
    punch(id, t, cx, cy, { z = 1.14, hold = 0.9 } = {}) {
      A(`tl.set("#${id}-p", { transformOrigin: "${cx}px ${cy}px" }, ${T(t - 0.01)});`);
      A(`tl.to("#${id}-p", { scale: ${z}, duration: 0.16, ease: "back.out(2)" }, ${T(t)});`);
      A(`tl.to("#${id}-p", { scale: 1, duration: 0.5, ease: "power2.inOut" }, ${T(t + hold)});`);
    },
  };
  return fx;
}

// ---------- Hình dùng chung ----------

// Dòng chữ động (HTML): mỗi từ một span để fx.words cho bật lên theo lời đọc. x là mép trái, hoặc tâm khi align "center".
// sticker: viền trắng dày + bóng đổ (kiểu chữ thumbnail của các kênh hoạt hình Việt)
export function kline(id, text, { x, top, size = 64, color = INK, align = "left", style = "", sticker = false }) {
  const words = text.split(" ");
  return `<div class="kl${sticker ? " stk" : ""}" id="${id}" style="left:${x}px;top:${top}px;font-size:${size}px;color:${color};${align === "center" ? "transform:translateX(-50%);" : ""}${style}">${words
    .map((w, k) => `<span class="klw" id="${id}-${k}">${w}</span>`)
    .join(" ")}</div>`;
}

// Hạt giấy phủ toàn khung, nhảy vị trí 8 lần/giây cho cảm giác giấy in sống động
export const grain = `<svg id="grain" viewBox="0 0 2000 1160" width="2000" height="1160"><filter id="grain-f"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="7"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0.9 0"/></filter><rect width="2000" height="1160" filter="url(#grain-f)"/></svg>`;
export function grainJitter(total) {
  return `tl.fromTo("#grain", { x: 0, y: 0 }, { x: -36, y: -28, duration: 0.5, ease: "steps(4)", yoyo: true, repeat: ${Math.ceil(total / 0.5)}, immediateRender: false }, 0);`;
}

// Lớp phủ cho fx.trans: tấm giấy kraft mép xé (wipe) và chớp trắng (slam)
const tornEdge = (x0, sign) =>
  Array.from({ length: 25 }, (_, k) => `${x0 + sign * (k % 2 ? 26 : 0) + sign * ((k * 37) % 23)} ${k * 48.3}`).join(" L");
export const transOverlays = `<svg id="wipe" viewBox="0 0 2600 1160" width="2600" height="1160">
  <path d="M${tornEdge(60, -1)} L60 1160 L2540 1160 L${tornEdge(2540, 1).split(" L").reverse().join(" L")} Z" fill="#c9a36b" stroke="${INK}" stroke-width="6"/>
  <path d="M200 260 L2400 230 M200 600 L2400 640 M200 900 L2400 880" stroke="#b08a52" stroke-width="10" opacity="0.6"/>
</svg>
<div id="flash"></div>
<div id="slicebar"></div>`;

export function flagBall(id, kind, cx, cy, r) {
  const flags = {
    vn: `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" fill="#da251d"/><path transform="scale(${r / 100})" d="M0 -52 L12.2 -16.8 L49.5 -16.1 L19.8 6.4 L30.6 42.1 L0 20.8 L-30.6 42.1 L-19.8 6.4 L-49.5 -16.1 L-12.2 -16.8 Z" fill="#ffde00"/>`,
    de: `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${(2 * r) / 3}" fill="#111"/><rect x="${-r}" y="${-r / 3}" width="${2 * r}" height="${(2 * r) / 3}" fill="#dd0000"/><rect x="${-r}" y="${r / 3}" width="${2 * r}" height="${(2 * r) / 3}" fill="#ffce00"/>`,
    us: `${Array.from({ length: 13 }, (_, k) => `<rect x="${-r}" y="${-r + (k * 2 * r) / 13}" width="${2 * r}" height="${(2 * r) / 13 + 0.5}" fill="${k % 2 ? "#fff" : "#b22234"}"/>`).join("")}
         <rect x="${-r}" y="${-r}" width="${r * 1.05}" height="${r * 1.08}" fill="#3c3b6e"/>
         ${Array.from({ length: 12 }, (_, k) => `<circle cx="${-r + r * 0.14 + (k % 4) * (r / 4.2)}" cy="${-r + r * 0.16 + Math.floor(k / 4) * (r / 3.4)}" r="${r / 28}" fill="#fff"/>`).join("")}`,
  };
  const e = (dx) => `<ellipse cx="${dx * r * 0.32}" cy="${-r * 0.12}" rx="${r * 0.16}" ry="${r * 0.2}" fill="#fff" stroke="${INK}" stroke-width="${Math.max(4, r / 28)}"/>`;
  const sw = Math.max(4, r / 28);
  return `<g id="${id}" transform="translate(${cx} ${cy})"><g id="${id}-body">
    <ellipse cx="0" cy="${r + 18}" rx="${r * 0.8}" ry="${r * 0.08}" fill="${INK}" opacity="0.12"/>
    <clipPath id="${id}-clip"><circle r="${r}"/></clipPath>
    <g clip-path="url(#${id}-clip)">${flags[kind]}</g>
    <circle r="${r}" fill="none" stroke="${INK}" stroke-width="${sw * 1.4}"/>
    <g class="${id}-eyes-ok">${e(-1)}${e(1)}</g>
    <g class="${id}-eyes-worried" opacity="0"><path d="M${-r * 0.48} ${-r * 0.06} Q${-r * 0.32} ${-r * 0.3} ${-r * 0.16} ${-r * 0.06} Z" fill="#fff" stroke="${INK}" stroke-width="${sw}"/><path d="M${r * 0.16} ${-r * 0.06} Q${r * 0.32} ${-r * 0.3} ${r * 0.48} ${-r * 0.06} Z" fill="#fff" stroke="${INK}" stroke-width="${sw}"/>
      <path d="M${-r * 0.52} ${-r * 0.42} L${-r * 0.16} ${-r * 0.32} M${r * 0.16} ${-r * 0.32} L${r * 0.52} ${-r * 0.42}" stroke="${INK}" stroke-width="${sw * 1.4}" stroke-linecap="round"/></g>
    <g class="${id}-eyes-smug" opacity="0"><path d="M${-r * 0.48} ${-r * 0.12} L${-r * 0.16} ${-r * 0.12} Q${-r * 0.32} ${r * 0.08} ${-r * 0.48} ${-r * 0.12} Z" fill="#fff" stroke="${INK}" stroke-width="${sw}"/><path d="M${r * 0.16} ${-r * 0.12} L${r * 0.48} ${-r * 0.12} Q${r * 0.32} ${r * 0.08} ${r * 0.16} ${-r * 0.12} Z" fill="#fff" stroke="${INK}" stroke-width="${sw}"/></g>
    <path id="${id}-sweat" opacity="0" d="M${r * 0.78} ${-r * 0.7} Q${r * 0.98} ${-r * 0.4} ${r * 0.88} ${-r * 0.3} Q${r * 0.74} ${-r * 0.22} ${r * 0.66} ${-r * 0.36} Q${r * 0.62} ${-r * 0.5} ${r * 0.78} ${-r * 0.7} Z" fill="#8fd3ff" stroke="${INK}" stroke-width="${sw}"/>
  </g></g>`;
}

export function ballMood(fx, id, mood, t) {
  for (const m of ["ok", "worried", "smug"]) fx.A(`tl.set(".${id}-eyes-${m}", { opacity: ${m === mood ? 1 : 0} }, ${T(t)});`);
}

// Nhãn tên có mũi tên cong chỉ vào (tx, ty)
export function nameTag(id, x, y, text, sub, tx, ty) {
  return `<g id="${id}" opacity="0">
  <text x="${x}" y="${y}" font-family="Inter" font-weight="800" font-size="40" fill="${INK}" text-anchor="middle">${text}</text>
  ${sub ? `<text x="${x}" y="${y + 36}" font-family="Inter" font-weight="600" font-size="26" fill="#8a7f72" text-anchor="middle">${sub}</text>` : ""}
  <path d="M${x + 40} ${y + 48} Q${(x + tx) / 2 + 40} ${(y + ty) / 2 + 30} ${tx} ${ty}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="${tx}" cy="${ty}" r="7" fill="${INK}"/></g>`;
}

// Nhãn chữ đậm trên nền màu, xoay nhẹ (dùng cho băng rôn, con dấu chữ)
export function banner(id, x, y, text, { size = 72, bg = RED, color = "#fff", rot = -4, pad = 40 } = {}) {
  const w = Math.round(text.length * size * 0.62 + pad * 2);
  const h = Math.round(size * 1.6);
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><g id="${id}" opacity="0"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="16" fill="${bg}" stroke="${INK}" stroke-width="7"/><text y="${size * 0.36}" font-family="Inter" font-weight="800" font-size="${size}" fill="${color}" text-anchor="middle">${text}</text></g></g>`;
}

export function stampBox(id, x, y, text, { size = 80, color = RED, rot = -12 } = {}) {
  const w = Math.round(text.length * size * 0.66 + 60);
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><g id="${id}" opacity="0"><rect x="${-w / 2}" y="${-size * 0.75}" width="${w}" height="${size * 1.5}" rx="14" fill="none" stroke="${color}" stroke-width="12"/><text y="${size * 0.35}" font-family="Inter" font-weight="800" font-size="${size}" fill="${color}" text-anchor="middle">${text}</text></g></g>`;
}

// Sàn + nền giấy cho cảnh có nhân vật
export const room = (wall = PAPER, floor = "#efe4cf", extra = "") =>
  `<rect x="-400" width="2720" height="1080" fill="${wall}"/><g class="bgx">${extra}</g><rect x="-400" y="1010" width="2720" height="70" fill="${floor}"/><line x1="-400" y1="1010" x2="2320" y2="1010" stroke="${INK}" stroke-width="5"/>`;

// Bóng thoại truyện tranh: thân ở (x, y), đuôi chỉ về (tx, ty). Hiện bằng fx.say.
export function bubble(id, x, y, text, tx, ty, { size = 46 } = {}) {
  const w = Math.round(text.length * size * 0.56 + 64);
  const h = Math.round(size * 1.9);
  const bx = Math.max(-w / 2 + 30, Math.min(w / 2 - 30, (tx - x) * 0.4));
  return `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0">
    <path d="M${bx - 22} ${h / 2 - 4} L${tx - x} ${ty - y} L${bx + 22} ${h / 2 - 4} Z" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" stroke="${INK}" stroke-width="6"/>
    <path d="M${bx - 19} ${h / 2 - 6} L${bx + 19} ${h / 2 - 6}" stroke="#fff" stroke-width="10"/>
    <text y="${size * 0.36}" font-family="Inter" font-weight="800" font-size="${size}" fill="${INK}" text-anchor="middle">${text}</text></g></g>`;
}

// ---------- Bản đồ ----------
// colors: { idQuốcGia: màu }, fit: các điểm [lon, lat] cần nằm trong khung extent
export function worldMap({ colors = {}, fit, extent = [[80, 80], [1840, 1000]], rotate = [0, 0], land = "#f1e6cb", sea = "#a9d6ea", idPrefix = "c" }) {
  const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
  const countries = feature(topo, topo.objects.countries).features;
  const proj = geoMercator().rotate(rotate).fitExtent(extent, { type: "MultiPoint", coordinates: fit });
  const gp = geoPath(proj).digits(1);
  const paths = countries
    .map((f) => {
      const d = gp(f);
      if (!d) return "";
      const [[x0, y0], [x1, y1]] = gp.bounds(f);
      if (x1 < -800 || x0 > 2700 || y1 < -600 || y0 > 1700 || x1 - x0 > 3000) return "";
      return `<path${f.id != null && !isNaN(+f.id) ? ` id="${idPrefix}${+f.id}"` : ""} d="${d}" fill="${colors[+f.id] || land}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    })
    .join("");
  const P = (lon, lat) => proj([lon, lat]).map((v) => +v.toFixed(1));
  return { svg: `<rect x="-2000" y="-2000" width="6000" height="5000" fill="${sea}"/>${paths}`, P };
}

// Mũi tên cong tự vẽ, đầu mũi tên bật ra, nhãn và đồng xu chạy dọc
export function arrowArc(fx, id, from, to, { bend = 120, color = "#4ac08a", label = "", labelAt = 0.5, t0, coins = 0, coinText = "$" }) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const L = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2 + (-(y1 - y0) / L) * bend;
  const cy = (y0 + y1) / 2 + ((x1 - x0) / L) * bend;
  const pt = (t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
  let len = 0;
  for (let k = 1; k <= 60; k++) len += Math.hypot(pt(k / 60)[0] - pt((k - 1) / 60)[0], pt(k / 60)[1] - pt((k - 1) / 60)[1]);
  len = Math.ceil(len);
  const ang = (Math.atan2(y1 - cy, x1 - cx) * 180) / Math.PI;
  const d = `M${x0} ${y0} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1}`;
  const [lx, ly] = pt(labelAt);
  const coinEls = Array.from({ length: coins }, (_, k) => `<g id="${id}-c${k}" opacity="0" transform="translate(${x0} ${y0})"><circle r="17" fill="#ffd34d" stroke="${INK}" stroke-width="4"/><text y="8" font-family="Inter" font-weight="800" font-size="22" fill="${INK}" text-anchor="middle">${coinText}</text></g>`).join("");
  const lw = label.length * 24 + 44;
  const svg = `<g id="${id}">
    <path id="${id}-o" d="${d}" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>
    <path id="${id}-p" d="${d}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>
    <g id="${id}-head" opacity="0" transform="translate(${x1} ${y1}) rotate(${ang.toFixed(1)})"><path d="M8 0 L-34 -24 L-24 0 L-34 24 Z" fill="${color}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>
    ${coinEls}
    ${label ? `<g transform="translate(${lx.toFixed(0)} ${ly.toFixed(0)})"><g id="${id}-lab" opacity="0"><rect x="${-lw / 2}" y="-34" width="${lw}" height="64" rx="32" fill="#fff" stroke="${INK}" stroke-width="5"/><text y="12" font-family="Inter" font-weight="800" font-size="34" fill="${INK}" text-anchor="middle">${label}</text></g></g>` : ""}
  </g>`;
  fx.A(`tl.to("#${id}-o, #${id}-p", { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, ${T(t0)});`);
  fx.A(`tl.fromTo("#${id}-head", { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2.5)" }, ${T(t0 + 0.6)});`);
  if (label) fx.pop(`#${id}-lab`, t0 + 0.15, { from: 0.5, kind: null });
  fx.sound(t0, "swish");
  const pts = Array.from({ length: 13 }, (_, k) => pt(k / 12));
  for (let k = 0; k < coins; k++) {
    const tk = t0 + 0.7 + k * 0.45;
    fx.show(`#${id}-c${k}`, tk);
    fx.A(`tl.to("#${id}-c${k}", { keyframes: [${pts.map(([x, y]) => `{ attr: { transform: "translate(${x.toFixed(1)} ${y.toFixed(1)})" }, duration: 0.09, ease: "none" }`).join(", ")}] }, ${T(tk)});`);
    fx.hide(`#${id}-c${k}`, tk + 1.08);
  }
  return svg;
}

// Phụ đề theo mốc từng từ: ngắt ở dấu câu hoặc khi đủ maxWords
export function captionsFromWords(words, { maxWords = 12, until = Infinity } = {}) {
  const caps = [];
  let cur = [];
  const flush = () => {
    if (cur.length) caps.push({ start: cur[0].start, end: cur.at(-1).end, text: cur.map((w) => w.word).join(" ") });
    cur = [];
  };
  for (const w of words) {
    if (w.start >= until) break;
    cur.push(w);
    if (/[,.:;!?]$/.test(w.word) || cur.length >= maxWords) flush();
  }
  flush();
  return caps
    .map((c, i) => {
      const end = caps[i + 1] && caps[i + 1].start - c.end < 0.6 ? caps[i + 1].start : c.end + 0.3;
      return `<div class="clip cap" id="cap${i}" data-start="${T(c.start)}" data-duration="${T(end - c.start)}" data-track-index="3"><span class="cap-text">${c.text}</span></div>`;
    })
    .join("\n      ");
}

// Khung HTML chung (font, phụ đề, logo, mốc thời gian góc trái)
// Plugin GSAP (assets/vendor/, bản 3.15.0) chỉ nạp khi timeline dùng tới, để trang cũ dựng lại không đổi
export const PLUGINS = { morphSVG: "MorphSVGPlugin", drawSVG: "DrawSVGPlugin" };
export const usedPlugins = (anim) => Object.entries(PLUGINS).filter(([k]) => anim.some((l) => l.includes(`${k}:`))).map(([, v]) => v);
const pluginTags = (anim) => usedPlugins(anim).map((p) => `\n    <script src="vendor/${p}.min.js"></script>`).join("");
const pluginRegister = (anim) => (usedPlugins(anim).length ? `\n      gsap.registerPlugin(${usedPlugins(anim).join(", ")});` : "");

export function page({ title, total, body, anim, audio = "audio.wav", extraCss = "" }) {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${title}</title>
    <script src="vendor/gsap.min.js"></script>${pluginTags(anim)}
    <style>
@font-face { font-family: "Inter"; src: url("fonts/Inter-SemiBold.otf") format("opentype"); font-weight: 600; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-ExtraBold.otf") format("opentype"); font-weight: 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${PAPER}; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Inter", sans-serif; background: ${PAPER}; }
.scn { position: absolute; inset: 0; overflow: hidden; opacity: 0; }
.cam { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.lay { position: absolute; inset: 0; }
.kl { position: absolute; font-weight: 800; white-space: nowrap; letter-spacing: -0.01em; line-height: 1.15; }
.kl.stk { -webkit-text-stroke: 0.16em #fff; paint-order: stroke fill; filter: drop-shadow(0 0.06em 0 rgba(29,26,26,0.35)); letter-spacing: 0.01em; }
.klw { display: inline-block; opacity: 0; padding: 0 0.04em; background: linear-gradient(#ffd34d, #ffd34d) no-repeat 0 88% / 0% 38%; }
#grain { position: absolute; z-index: 890; left: 0; top: 0; opacity: 0.2; mix-blend-mode: multiply; pointer-events: none; will-change: transform; }
#wipe { position: absolute; z-index: 750; left: 0; top: -40px; width: 2600px; height: 1160px; transform: translateX(-2600px); }
#slicebar { position: absolute; z-index: 755; left: -16px; top: -110px; width: 32px; height: 1300px; background: ${INK}; box-shadow: 0 0 0 10px #fff; opacity: 0; transform: rotate(19.6deg); }
#flash { position: absolute; z-index: 760; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
.dark { position: absolute; inset: 0; background: radial-gradient(circle at 60% 40%, #1c2a6b, ${NAVY} 70%); }
.kw { position: absolute; left: 0; right: 0; text-align: center; font-weight: 800; opacity: 0; letter-spacing: -0.01em; padding-left: 300px; }
#host-layer { position: absolute; inset: 0; z-index: 800; pointer-events: none; }
.brand { position: absolute; z-index: 900; right: 60px; top: 44px; font-size: 26px; font-weight: 600; color: ${INK}; background: rgba(255,255,255,0.85); padding: 6px 12px; border-radius: 10px; }
.brand b { background: ${NAVY}; color: ${TEAL}; padding: 3px 9px; border-radius: 7px; font-weight: 800; }
.stamp { position: absolute; z-index: 900; left: 56px; top: 36px; font-size: 68px; font-weight: 800; color: ${INK}; opacity: 0;
  background: rgba(255,255,255,0.85); padding: 0 18px; border-radius: 12px; }
.cap { position: absolute; z-index: 1000; left: 520px; right: 60px; bottom: 50px; display: flex; justify-content: center; }
.cap-text { display: inline-block; max-width: 1240px; font-size: 42px; font-weight: 600; line-height: 1.3; text-align: center; color: #fff;
  padding: 10px 26px; border-radius: 14px; background: rgba(20,16,16,0.75); }
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; text-align: center;
  background: radial-gradient(circle at 50% 40%, #1c2a6b, ${NAVY} 70%); color: #fff; padding: 0 160px; }
.end-brand { font-size: 52px; font-weight: 800; } .end-brand b { background: #fff; color: ${NAVY}; padding: 2px 16px; border-radius: 12px; }
.end h2 { font-size: 96px; font-weight: 800; letter-spacing: -0.02em; }
.end-sub { font-size: 36px; font-weight: 600; color: #c9d0e3; }
.end-cta { font-size: 46px; font-weight: 800; color: ${NAVY}; background: ${TEAL}; padding: 20px 56px; border-radius: 60px; }
.end-disc { font-size: 26px; color: #c9d0e3; max-width: 1100px; line-height: 1.4; }
${extraCss}
</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T(total)}" data-width="1920" data-height="1080">
      ${body}
      <audio id="soundtrack" src="${audio}" data-start="0" data-duration="${T(total)}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};${pluginRegister(anim)}
      const tl = gsap.timeline({ paused: true });
      ${anim.join("\n      ")}
      tl.set({}, {}, ${T(total)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}
