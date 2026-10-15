// Gói xuất bản: "<Tên> (mô tả).txt" cạnh mp4 — chương YouTube, miễn trừ trách nhiệm, ghi công âm thanh.
// Không tự đăng; người dùng dán vào mô tả video.
//
// Chương: cảnh có "section": "Tên chương" mở một chương mới. Không có section thì lấy cảnh title (trừ cảnh đầu)
// và cue chapter của shorts. YouTube chỉ nhận chương khi có ≥ 3 mốc, mốc đầu 0:00, mỗi chương ≥ 10 giây.
import fs from "node:fs";
import path from "node:path";

const clock = (t) => {
  const s = Math.max(0, Math.floor(t));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

export function chapters(content, timings) {
  if (!timings?.scenes?.length) return [];
  const marks = [];
  content.scenes.forEach((s, i) => {
    const tm = timings.scenes[i];
    if (!tm) return;
    const v = s.visual || {};
    const name = s.section || (i > 0 && v.type === "title" && v.headline) || (v.cue === "chapter" && v.title);
    if (name) marks.push({ t: i === 0 ? 0 : tm.start, name: String(name) });
  });
  if (!marks.length) return [];
  if (marks[0].t > 0) marks.unshift({ t: 0, name: content.scenes[0].section || "Mở đầu" });
  // Gộp chương ngắn hơn 10 giây vào chương trước
  const out = [];
  for (const m of marks) {
    if (out.length && m.t - out.at(-1).t < 10) continue;
    out.push(m);
  }
  return out.length >= 3 ? out : [];
}

export function publishNotes(content, dir, name, timings) {
  const ch = chapters(content, timings);
  const disclaimer = content.disclaimer || content.scenes.map((s) => s.visual?.disclaimer).filter(Boolean).at(-1);
  const creditsFile = path.join(dir, "credits.txt");
  const credits = fs.existsSync(creditsFile) ? fs.readFileSync(creditsFile, "utf8").trim() : "";
  const parts = [];
  if (content.description) parts.push(content.description);
  if (ch.length) parts.push(ch.map((c) => `${clock(c.t)} ${c.name}`).join("\n"));
  if (disclaimer) parts.push(disclaimer);
  if (credits) parts.push(credits);
  if (!parts.length) return null;
  const file = path.join(dir, `${name} (mô tả).txt`);
  fs.writeFileSync(file, parts.join("\n\n") + "\n");
  return file;
}
