// Ba phương án ảnh bìa cho video ngắn (học từ AI Zening Studio): câu hỏi, con số, so sánh A | B.
// Kịch bản: "thumbnails": [{ type: "question"|"number"|"compare", title, kicker?, sub?, color?, dir?: "up"|"down",
//   left?, right?, leftKicker?, rightKicker? }]
// Chữ hai tầng như câu móc: dòng nhỏ chữ có chân nghiêng (kicker) + dòng lớn chữ hẹp đậm viết hoa (title).
// Dựng một dự án HyperFrames nhỏ (mỗi giây một ảnh), chụp bằng `hyperframes snapshot`, lưu
// videos/<id>/<Tên> (bìa A|B|C).jpg. Chữ chính luôn nằm trong hình vuông giữa khung (tab hồ sơ TikTok/Shorts cắt vuông).
import fs from "node:fs";
import path from "node:path";
import { run } from "./pipeline.mjs";
import { workDir } from "./paths.mjs";
import { W, H, icon, presetFor, F, fontFaces, copyFonts } from "./shorts-style.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function card(th, P, k, hasBg) {
  const c = th.color || P.hi;
  const kicker = th.kicker ? `<div class="kick">${esc(th.kicker)}</div>` : "";
  const sub = th.sub ? `<div class="sub">${esc(th.sub)}</div>` : "";
  let mid;
  if (th.type === "compare") {
    const half = (kk, t, cls) => `<div class="half ${cls}">${kk ? `<div class="hk">${esc(kk)}</div>` : ""}<div class="ht">${esc(t)}</div></div>`;
    mid = `${kicker}<div class="cmp">${half(th.leftKicker, th.left || "A", "l")}${half(th.rightKicker, th.right || "B", "r")}</div>${th.title ? `<div class="ttl sm" style="color:${c}">${esc(th.title)}</div>` : ""}`;
  } else if (th.type === "number") {
    mid = `${icon(th.dir === "up" ? "up" : "down", th.dir === "up" ? P.up : P.down, 180)}${kicker}<div class="ttl" style="color:${c}">${esc(th.title)}</div>`;
  } else {
    mid = `${kicker}<div class="ttl" style="color:${c}">${esc(th.title)}</div>`;
  }
  return `<div class="card" id="th${k}">${hasBg ? '<div class="bgf"></div><div class="shade"></div>' : ""}<div class="sq">${mid}${sub}</div><div class="brand"><b>DSC</b>ACADEMY</div></div>`;
}

// Trả về danh sách file jpg đã tạo
export function makeThumbs(content, dir, name, bgFrame, log) {
  const P = presetFor(content);
  const list = content.thumbnails.slice(0, 3);
  const proj = path.join(workDir(dir), "thumbs");
  fs.rmSync(proj, { recursive: true, force: true });
  fs.mkdirSync(path.join(proj, "vendor"), { recursive: true });
  copyFonts(fs, path, proj);
  fs.copyFileSync("assets/vendor/gsap.min.js", path.join(proj, "vendor", "gsap.min.js"));
  const hasBg = bgFrame && fs.existsSync(bgFrame);
  if (hasBg) fs.copyFileSync(bgFrame, path.join(proj, "bg.jpg"));
  fs.writeFileSync(path.join(proj, "hyperframes.json"), JSON.stringify({ paths: { assets: "assets" } }));
  const n = list.length;
  const html = `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=${W}, height=${H}">
<script src="vendor/gsap.min.js"></script><style>${fontFaces}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${P.bg}; }
#root { position: relative; width: ${W}px; height: ${H}px; font-family: ${F.body}; }
.card { position: absolute; inset: 0; opacity: 0; color: #fff; overflow: hidden; background: radial-gradient(circle at 50% 45%, ${P.bg2}, ${P.bg} 75%); }
/* Khung hình của video làm nền: làm mờ vừa đủ để chữ trong khung không tranh với chữ bìa */
.bgf { position: absolute; inset: -60px; background: url(bg.jpg) center / cover; filter: blur(14px) brightness(0.55) saturate(1.2); }
.shade { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0.6) 75%); }
.sq { position: absolute; left: 50px; right: 50px; top: ${(H - W) / 2 + 40}px; height: ${W - 80}px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; }
.ico { display: block; margin-bottom: 10px; }
.kick { font-family: ${F.serif}; font-style: italic; font-size: 70px; font-weight: 500; line-height: 1.15; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.6); }
.ttl { font-family: ${F.cond}; font-size: 190px; font-weight: 800; line-height: 0.92; text-transform: uppercase; text-shadow: 0 8px 30px rgba(0,0,0,0.6); }
.ttl.sm { font-size: 110px; margin-top: 20px; }
.sub { margin-top: 24px; font-size: 44px; font-weight: 600; background: rgba(0,0,0,0.6); padding: 8px 22px; border-left: 8px solid ${P.mark}; border-radius: 6px; }
.cmp { display: flex; gap: 22px; width: 100%; margin-top: 24px; }
.half { flex: 1 1 0; min-width: 0; border-radius: 28px; padding: 48px 18px 54px; background: rgba(20,22,30,0.92); display: flex; flex-direction: column; justify-content: center; }
.half.r { background: ${P.up}; color: ${"#000"}; }
.hk { font-size: 38px; font-weight: 600; opacity: 0.75; margin-bottom: 8px; }
.ht { font-family: ${F.cond}; font-size: 104px; font-weight: 800; line-height: 0.95; text-transform: uppercase; overflow-wrap: anywhere; }
.brand { position: absolute; left: 0; right: 0; bottom: ${(H - W) / 2 - 90}px; text-align: center; font-size: 34px; font-weight: 800; letter-spacing: 0.3em; color: rgba(255,255,255,0.85); }
.brand b { color: ${P.accent}; margin-right: 10px; }
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${n}" data-width="${W}" data-height="${H}">
${list.map((th, k) => card(th, P, k, hasBg)).join("\n")}
</div><script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${list.map((_, k) => `tl.set("#th${k}", { opacity: 1 }, ${k});${k + 1 < n ? ` tl.set("#th${k}", { opacity: 0 }, ${k + 1});` : ""}`).join("\n")}
tl.set({}, {}, ${n});
window.__timelines["main"] = tl;
</script></body></html>`;
  fs.writeFileSync(path.join(proj, "index.html"), html);
  const shots = path.join(proj, "shots");
  const at = list.map((_, k) => (k + 0.5).toFixed(1)).join(",");
  const r = run("npx", ["hyperframes", "snapshot", ".", "--at", at, "--no-end", "--describe", "false", "-o", "shots"], { cwd: proj, log });
  if (!r.ok || !fs.existsSync(shots)) return [];
  const pngs = fs.readdirSync(shots).filter((f) => f.endsWith(".png")).sort();
  return pngs.slice(0, n).flatMap((f, k) => {
    const out = path.join(dir, `${name} (bìa ${"ABC"[k]}).jpg`);
    return run("ffmpeg", ["-y", "-v", "error", "-i", path.join(shots, f), "-q:v", "2", out], { log }).ok ? [out] : [];
  });
}
