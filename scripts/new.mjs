#!/usr/bin/env node
// Tạo kịch bản mới videos/<id>/script.json: chép cấu hình từ templates/ hoặc video gần nhất cùng loại,
// kèm khung cảnh mẫu theo đúng cấu trúc để chỉ cần điền nội dung.
//
// Cách dùng:
//   npm run new -- t13-ten-bai "Tiêu đề"        (chuỗi vĩ mô: toon + cảnh dựng sẵn, không cần scenes.mjs;
//                                                --format series cho bộ dựng người que cũ)
//   npm run new -- shorts-lam-phat "Lạm phát là gì trong 45s" [--format shorts-kinetic|shorts-micro]   (9:16, CLAUDE.md mục 4f)
//   npm run new -- toon-chuyen-tien-te "Chuyện tiền tệ" --format toon
// Sau đó:     viết nội dung → npm run lint -- <id> → npm run video -- <id>
import fs from "node:fs";
import path from "node:path";
import { allVideos, resolveVideo, videoDir, kindOf } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const [id, title] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!id || !title || !/^[a-z0-9-]+$/.test(id)) {
  console.error('Cách dùng: npm run new -- <id-khong-dau> "Tiêu đề" [--format series|essay|toon|story|dataviz|shorts-kinetic|shorts-micro]');
  process.exit(1);
}

// Tự động nhận diện format từ cờ hoặc tiền tố ID
let format = opt("--format");
if (!format) {
  if (id.startsWith("shorts-split-")) format = "shorts-split";
  else if (id.startsWith("shorts-micro-")) format = "shorts-micro";
  else if (id.startsWith("shorts-skit-")) format = "shorts-skit";
  else if (id.startsWith("shorts-") || id.startsWith("tiktok-") || id.startsWith("reels-")) format = "shorts-kinetic";
  else if (id.startsWith("faceless-")) format = "faceless";
  else if (id.startsWith("dataviz-") || id.startsWith("chart-")) format = "dataviz";
  else if (id.startsWith("essay-")) format = "essay";
  else if (id.startsWith("toon-")) format = "toon";
  else if (id.startsWith("story-")) format = "story";
  else format = "toon-series"; // tập chuỗi vĩ mô: người que dựng trên bộ toon (scripts/lib/toon-presets.mjs)
}
const presetSeries = format === "toon-series";
if (presetSeries) format = "toon";

const dir = videoDir(id);
if (fs.existsSync(path.join(dir, "script.json"))) {
  console.error(`${dir}/script.json đã có.`);
  process.exit(1);
}

// Tìm kịch bản tham chiếu từ các video đã có cùng loại để giữ giọng/nhạc chuẩn
const same = allVideos()
  .map((v) => resolveVideo(v.script).content)
  .filter((c) => (presetSeries ? c.series && /^t\d/.test(c.id) : kindOf(c) === format || c.format === format));
const ref = same.sort((a, b) => (a.episode || 0) - (b.episode || 0)).at(-1) || {};
const keep = (keys) => Object.fromEntries(keys.filter((k) => ref[k] !== undefined).map((k) => [k, ref[k]]));

let script;
const templatePath = path.join("templates", format, "script.json");

if (fs.existsSync(templatePath) && !presetSeries) {
  // Ưu tiên nạp từ thư mục templates/
  script = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  script.id = id;
  script.title = title;
  if (ref.voice) script.voice = ref.voice;
  if (ref.series && !script.series) script.series = ref.series;
  if (format === "series" && ref.episode) {
    script.episode = (ref.episode || 0) + 1;
  }
} else if (format === "series" || presetSeries) {
  const ep = (ref.episode || 0) + 1;
  const S = (sid, text, visual) => ({ id: sid, text, visual });
  script = {
    id,
    episode: ep,
    title,
    ...keep(["series", "character"]),
    article: opt("--article") || "",
    articleUpdated: new Date().toISOString().slice(0, 10),
    voice: ref.voice,
    ...(presetSeries ? { format: "toon", music: "upbeat-indie-ukulele", sfxSet: "playful", mix: "v2", sources: [] } : {}),
    scenes: [
      S("s01", "[Mở đầu: câu móc gắn đời thường]", { type: "title", pose: "wave", headline: title, sub: `Bài ${ep}` }),
      S("s02", "[Nhắc tập trước một câu]", { type: "notebook", pose: "idle", entries: ["[dòng tập trước]"] }),
      S("s03", "[Khái niệm chính]", { type: "versus", pose: "present", headline: "", left: { title: "", text: "" }, right: { title: "", text: "" } }),
      S("s04", "[Đọc số liệu]", { type: "dashboard", pose: "point", show: ["growth", "prices", "money", "external", "fiscal"], reveal: [], lit: [] }),
      S("s05", "[Chuỗi tác động tới lợi nhuận/định giá]", { type: "chain", pose: "pointUp", highlight: "both", dir: "up" }),
      S("s06", "[Ví dụ với doanh nghiệp giả định]", { type: "pair", pose: "present", items: [] }),
      S("s07", "[Tóm tắt]", { type: "checklist", pose: "present", headline: "Ghi nhớ", items: [] }),
      S("s08", "[Câu hỏi quiz]", { type: "quiz", pose: "think", question: "", options: ["", "", ""] }),
      S("s09", "[Gieo tập sau + mời đọc bài viết bên dưới video]", {
        type: "outro",
        pose: "wave",
        headline: `Hẹn gặp ở Bài ${ep + 1}`,
        sub: "Chi tiết và quiz ngay bên dưới video",
        disclaimer: "Nội dung chỉ nhằm mục đích giáo dục, không phải khuyến nghị đầu tư. Doanh nghiệp và số liệu trong video là giả định.",
      }),
    ],
  };
  if (presetSeries) {
    const sections = ["Mở đầu", "Tập trước", "Khái niệm", "Đọc số liệu", "Chuỗi tác động", "Ví dụ", "Tóm tắt", "Quiz", "Tập sau"];
    script.scenes.forEach((sc, i) => (sc.section = sections[i]));
  }
} else {
  script = { id, title, format, ...keep(["brand", "aspect", "style", "voice"]), scenes: [{ id: "s01", text: "[…]" }] };
}

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "script.json"), JSON.stringify(script, null, 2) + "\n");

// Nếu là toon, tạo hoặc sao chép scenes.mjs
if (format === "toon" && !presetSeries) {
  const toonSceneTpl = path.join("templates", "toon", "scenes.mjs");
  if (fs.existsSync(toonSceneTpl)) {
    let tplContent = fs.readFileSync(toonSceneTpl, "utf8");
    tplContent = tplContent.replace(/\$\{title\}/g, title);
    fs.writeFileSync(path.join(dir, "scenes.mjs"), tplContent);
  } else {
    fs.writeFileSync(
      path.join(dir, "scenes.mjs"),
      `// Hình cho "${title}" (định dạng toon). Bộ công cụ \`k\`: xem docs/toon-guide.md.

export default function (k) {
  const { at, S, fx, A, T, PAPER } = k;
  k.scene("c1", \`<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="\${PAPER}"/></svg>\`, { at: 0 });
  k.scene("end", k.endCard({ title: "${title}", disclaimer: "Nội dung giáo dục, không phải khuyến nghị đầu tư. Hình ảnh minh hoạ." }), { at: S.at(-1) - 0.05, trans: "iris", z: 850, drift: false });
  k.captionsUntil(S.at(-1) - 0.1);
}
`
    );
  }
}
// Tự động chép demo.mp4 từ template nếu có để người dùng tiện xem mẫu
const demoMp4Tpl = path.join("templates", format, "demo.mp4");
if (fs.existsSync(demoMp4Tpl) && !presetSeries) {
  fs.copyFileSync(demoMp4Tpl, path.join(dir, "demo.mp4"));
}

console.log(`✓ ${dir}/script.json (định dạng: ${format}${ref.id ? `, cấu hình mượn từ ${ref.id}` : ""})`);
