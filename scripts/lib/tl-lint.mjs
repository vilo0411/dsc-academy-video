// Soát timeline GSAP trong index.html đã sinh, theo quy tắc của GSAP Skills (greensock/gsap-skills: gsap-core,
// gsap-timeline, gsap-performance; bản sao ở .claude/skills/vendor-gsap-*) cộng quy tắc tua theo khung của HyperFrames.
//
//   - fromTo/from chồng lên tween trước đó cùng phần tử + thuộc tính mà thiếu immediateRender: false
//     → trạng thái đầu của tween sau đè lên lúc dựng, phần tử hiện/nháy sai trước khi tới lượt
//   - tên ease không có thật, animate thuộc tính layout (top/left/width…), dùng delay trong timeline,
//     repeat: -1 (không tua được), bộ chọn #id không có trong trang, tween vượt quá thời lượng video
//
// Cách dùng:  node scripts/lib/tl-lint.mjs videos/<id>/project/index.html   (hoặc import { lintTimeline })
import fs from "node:fs";

const EASES = /^(none|linear|(power[0-4]|quad|cubic|quart|quint|strong|back|bounce|circ|elastic|expo|sine)(\.(in|out|inOut))?(\([\d.,\s]*\))?|steps\(\d+\)|rough\(.*\)|slow\(.*\))$/;
const LAYOUT = new Set(["top", "left", "right", "bottom", "width", "height", "margin", "marginTop", "marginLeft", "padding", "fontSize"]);

// Tách lời gọi tl.<method>(…) thành danh sách đối số dạng chuỗi (đếm ngoặc, bỏ qua chuỗi).
function calls(js) {
  const out = [];
  const re = /\btl\.(to|from|fromTo|set)\(/g;
  let m;
  while ((m = re.exec(js))) {
    const args = [];
    let depth = 0;
    let cur = "";
    let q = null;
    let i = re.lastIndex;
    for (; i < js.length; i++) {
      const c = js[i];
      if (q) {
        cur += c;
        if (c === "\\") cur += js[++i];
        else if (c === q) q = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        q = c;
        cur += c;
      } else if ("({[".includes(c)) {
        depth++;
        cur += c;
      } else if (")}]".includes(c)) {
        if (depth === 0) break;
        depth--;
        cur += c;
      } else if (c === "," && depth === 0) {
        args.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    if (cur.trim()) args.push(cur.trim());
    re.lastIndex = i;
    out.push({ method: m[1], args, at: m.index });
  }
  return out;
}

// Khoá cấp 1 của một object literal: { opacity: 0, scale: 1, … } → ["opacity", "scale"]
function keys(obj) {
  if (!obj?.startsWith("{")) return [];
  const ks = [];
  let depth = 0;
  let q = null;
  let tok = "";
  for (let i = 1; i < obj.length - 1; i++) {
    const c = obj[i];
    if (q) {
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if ("({[".includes(c)) depth++;
    else if (")}]".includes(c)) depth--;
    else if (depth === 0 && c === ":") {
      ks.push(tok.trim().replace(/^["']|["']$/g, ""));
      tok = "";
      continue;
    } else if (depth === 0 && c === ",") {
      tok = "";
      continue;
    }
    if (depth === 0) tok += c;
  }
  return ks;
}

const val = (obj, k) => {
  const m = new RegExp(`(?:^|[{,\\s])${k}\\s*:\\s*("[^"]*"|'[^']*'|[^,}]+)`).exec(obj || "");
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};
const props = (ks) => ks.filter((k) => !["duration", "ease", "immediateRender", "overwrite", "yoyo", "repeat", "stagger", "delay", "keyframes", "onStart", "onComplete", "onUpdate", "transformOrigin", "svgOrigin"].includes(k));
// autoAlpha cũng là opacity; x/xPercent là cùng trục
const canon = (p) => (p === "autoAlpha" ? "opacity" : p);

// Phân tích tween: [{ method, sel, start, end, props, vars, from, line }]
export function parseTimeline(html) {
  const tweens = [];
  for (const c of calls(html)) {
    const [selRaw, a, b, posRaw] = c.args;
    const isFT = c.method === "fromTo";
    const vars = isFT ? b : a;
    const from = isFT ? a : c.method === "from" ? a : null;
    const pos = isFT ? posRaw : c.args[2];
    const start = pos != null && /^-?[\d.]+$/.test(pos) ? +pos : null;
    const dur = c.method === "set" ? 0 : +(val(vars, "duration") ?? 0.5);
    const sel = /^["'][^"']*["']$/.test(selRaw || "") ? selRaw.slice(1, -1) : null;
    const line = html.slice(0, c.at).split("\n").length;
    tweens.push({ method: c.method, sel, start, end: start == null ? null : start + (isNaN(dur) ? 0 : dur), dur, props: props(keys(vars)).map(canon), vars, from, line });
  }
  return tweens;
}

export function lintTimeline(html, { total } = {}) {
  const tw = parseTimeline(html);
  const issues = [];
  const add = (t, msg) => issues.push({ line: t.line, sel: t.sel, msg });
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const seen = new Map(); // sel|prop → tween đầu tiên đã chạm
  for (const t of tw) {
    const ease = val(t.vars, "ease");
    if (ease && !EASES.test(ease)) add(t, `ease "${ease}" không có trong GSAP`);
    if (t.method !== "set") {
      for (const p of t.props) if (LAYOUT.has(p)) add(t, `animate "${p}" (thuộc tính layout) — dùng x/y/scale`);
      if (val(t.vars, "delay") != null) add(t, "dùng delay trong timeline — đặt bằng tham số vị trí");
    }
    if (val(t.vars, "repeat") === "-1") add(t, "repeat: -1 không tua được — đặt số lần lặp cụ thể");
    if (t.sel) {
      for (const s of t.sel.split(",")) {
        const id = /^\s*#([\w-]+)\s*$/.exec(s)?.[1];
        if (id && !ids.has(id)) add(t, `không có phần tử #${id} trong trang`);
      }
    }
    if (total && t.start != null && t.start > total + 0.05) add(t, `bắt đầu ở ${t.start.toFixed(2)}s, sau khi video kết thúc (${total.toFixed(2)}s)`);
    // Tween from/fromTo dựng sau một tween khác cùng phần tử + thuộc tính, chạy muộn hơn,
    // mà vẫn để immediateRender mặc định (true) → trạng thái đầu của nó đè lên lúc dựng. Khi tua, tween trước
    // vẽ lại trạng thái của nó nên chỉ lộ ra trước lúc tween trước bắt đầu: bỏ qua khi tween trước ở giây 0
    // hoặc hai trạng thái đầu giống nhau.
    if (t.sel && t.start != null) {
      const ir = val(t.vars, "immediateRender");
      for (const p of t.props) {
        const key = `${t.sel}|${p}`;
        const first = seen.get(key);
        const startOf = (x) => val(x.from ?? (x.method === "set" ? x.vars : null), p === "opacity" ? "(?:opacity|autoAlpha)" : p);
        const harmless = first && (first.start <= 1e-3 || startOf(first) === startOf(t));
        if (first && !harmless && (t.method === "fromTo" || t.method === "from") && ir !== "false" && t.start > first.start + 1e-3) {
          add(t, `${t.method} chồng lên tween dòng ${first.line} (${p}) mà thiếu immediateRender: false`);
          break;
        }
      }
      for (const p of t.props) if (!seen.has(`${t.sel}|${p}`)) seen.set(`${t.sel}|${p}`, t);
    }
  }
  return { tweens: tw, issues };
}

// Mốc thay đổi hình: mọi tween có độ dài < 3 giây, không lặp (bỏ máy quay trôi, lắc lư nền).
export function changeTimes(tweens) {
  return tweens
    .filter((t) => t.start != null && t.dur < 3 && val(t.vars, "repeat") == null && !(t.method === "set" && t.props.every((p) => p === "transformOrigin")))
    .map((t) => t.start)
    .sort((a, b) => a - b);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const html = fs.readFileSync(process.argv[2], "utf8");
  const { tweens, issues } = lintTimeline(html);
  console.log(`${tweens.length} tween, ${issues.length} vấn đề`);
  const by = new Map();
  for (const i of issues) {
    const k = i.msg.replace(/dòng \d+/, "dòng N").replace(/#[\w-]+/, "#…").replace(/"[^"]*"/, '"…"');
    by.set(k, [...(by.get(k) || []), i]);
  }
  for (const [k, list] of by) console.log(`  ${list.length}× ${k}  (vd. dòng ${list[0].line} ${list[0].sel})`);
}
