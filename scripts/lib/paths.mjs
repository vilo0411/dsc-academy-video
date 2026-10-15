// Mỗi video một thư mục: videos/<id>/
//   script.json                kịch bản
//   voice.wav timings.json …   giọng đọc, nhạc, tiếng động
//   media/ SHOTLIST.md         ảnh/clip (phim kể chuyện)
//   edit/                      bản sửa tay trong HyperFrames Studio (lưu trong git)
//   project/                   dự án HyperFrames sinh ra (bản 9:16: project-9x16/)
//   .work/                     log và file trung gian
//   "<Tên dễ đọc>.mp4" .srt .jpg, draft.mp4
import fs from "node:fs";
import path from "node:path";

export const VIDEOS = "videos";
export const videoDir = (id) => path.join(VIDEOS, id);
export const projectDir = (dir, orientation = "16x9") => path.join(dir, orientation === "16x9" ? "project" : `project-${orientation}`);
export const workDir = (dir) => {
  const w = path.join(dir, ".work");
  fs.mkdirSync(w, { recursive: true });
  return w;
};

// Mọi kịch bản: [{ id, dir, script }]
export function allVideos() {
  if (!fs.existsSync(VIDEOS)) return [];
  return fs
    .readdirSync(VIDEOS)
    .filter((d) => fs.existsSync(path.join(VIDEOS, d, "script.json")))
    .sort()
    .map((d) => ({ id: d, dir: path.join(VIDEOS, d), script: path.join(VIDEOS, d, "script.json") }));
}

// Nhận "t01", "t01-vi-mo-la-gi", "videos/t01-…", "videos/t01-…/script.json".
export function resolveVideo(arg) {
  if (!arg) throw new Error("Thiếu tên video. Ví dụ: t01, essay-lam-phat-ho-so, videos/t01-vi-mo-la-gi");
  let script = null;
  if (arg.endsWith(".json") && fs.existsSync(arg)) script = arg;
  else if (fs.existsSync(path.join(arg, "script.json"))) script = path.join(arg, "script.json");
  else {
    const hits = allVideos().filter((v) => v.id === arg || v.id.startsWith(arg + "-") || v.id.startsWith(arg));
    const exact = hits.find((v) => v.id === arg);
    if (exact || hits.length === 1) script = (exact || hits[0]).script;
    else if (hits.length > 1) throw new Error(`"${arg}" khớp nhiều video: ${hits.map((v) => v.id).join(", ")}`);
    else throw new Error(`Không thấy video "${arg}" trong ${VIDEOS}/`);
  }
  const content = JSON.parse(fs.readFileSync(script, "utf8"));
  return { id: content.id, dir: videoDir(content.id), script, content };
}

// Loại kịch bản: series (người que), essay, toon (hoạt hình kiểu OverSimplified), shorts (9:16 chữ chạy), story.
// Định dạng chưa có bộ dựng (faceless, shorts-skit…) trả về "unsupported" để lint chặn sớm.
export const SHORTS = /^shorts(-(kinetic|micro))?$/;
export const UNSUPPORTED = ["faceless", "shorts-skit", "shorts-split"];
export const kindOf = (content) =>
  content.format === "essay" ? "essay"
  : content.format === "toon" ? "toon"
  : SHORTS.test(content.format || "") ? "shorts"
  : UNSUPPORTED.includes(content.format) ? "unsupported"
  : content.characters || content.aspect || /^story-/.test(content.id) ? "story"
  : "series";

// Khung hình cần dựng: shorts luôn 9:16, phim kể chuyện theo "aspect", còn lại theo ORIENTATIONS (mặc định 16x9).
export const orientationsFor = (content) => {
  const k = kindOf(content);
  if (k === "shorts") return ["9x16"];
  if (k === "story") return [content.aspect === "9:16" ? "9x16" : "16x9"];
  return (process.env.ORIENTATIONS || "16x9").split(",");
};

// Tên file đầu ra: "T01 - Vĩ mô là gì", "Lạm phát: hồ sơ…" (bỏ ký tự cấm trong tên file).
export function finalName(content, orientation = "16x9") {
  const title = (content.title || content.id).replace(/[\/\\:*?"<>|]+/g, " –").replace(/\s+/g, " ").trim();
  const base = content.episode ? `T${String(content.episode).padStart(2, "0")} - ${title}` : title;
  return orientation === "16x9" ? base : `${base} (${orientation})`;
}
