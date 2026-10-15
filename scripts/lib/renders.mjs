// Lấy kết quả GitHub CI đã tạo (nhánh renders) về videos/<id>/: giọng đọc, nhạc nền, video.
// Trên nhánh renders: cache/<id>/{voice.wav,timings.json,music.wav,music.json}, out/<id>.mp4, status/<id>.json
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { videoDir, finalName } from "./paths.mjs";
import { textHash } from "./pipeline.mjs";

let tree = null;
function remoteTree() {
  if (tree) return tree;
  const f = spawnSync("git", ["fetch", "-q", "origin", "renders"], { encoding: "utf8" });
  if (f.status !== 0) return (tree = new Set());
  const ls = spawnSync("git", ["ls-tree", "-r", "--name-only", "FETCH_HEAD"], { encoding: "utf8", maxBuffer: 64 << 20 });
  return (tree = new Set(ls.status === 0 ? ls.stdout.split("\n").filter(Boolean) : []));
}
const show = (p) => spawnSync("git", ["show", `FETCH_HEAD:${p}`], { maxBuffer: 1 << 30 }).stdout;

// Trả về danh sách file đã chép. Giọng chỉ lấy khi khớp lời thoại hiện tại; video chỉ lấy khi trên máy chưa có.
export function pullVideo(content, { force = false } = {}) {
  const { id } = content;
  const t = remoteTree();
  const dir = videoDir(id);
  const got = [];
  const has = (p) => t.has(p);
  if (has(`cache/${id}/voice.wav`) && has(`cache/${id}/timings.json`)) {
    const remote = JSON.parse(show(`cache/${id}/timings.json`).toString("utf8"));
    let local = null;
    try {
      local = JSON.parse(fs.readFileSync(path.join(dir, "timings.json"), "utf8"));
    } catch {}
    const want = textHash(content);
    const localOk = local && local.textHash === want && fs.existsSync(path.join(dir, "voice.wav"));
    if (force || (!localOk && (remote.textHash === want || !local))) {
      fs.writeFileSync(path.join(dir, "voice.wav"), show(`cache/${id}/voice.wav`));
      fs.writeFileSync(path.join(dir, "timings.json"), JSON.stringify(remote, null, 2));
      got.push("voice.wav", "timings.json");
    }
  }
  for (const f of ["music.wav", "music.json"]) {
    if (has(`cache/${id}/${f}`) && (force || !fs.existsSync(path.join(dir, f)))) {
      fs.writeFileSync(path.join(dir, f), show(`cache/${id}/${f}`));
      got.push(f);
    }
  }
  const mp4 = path.join(dir, `${finalName(content)}.mp4`);
  if (has(`out/${id}.mp4`) && (force || !fs.existsSync(mp4))) {
    fs.writeFileSync(mp4, show(`out/${id}.mp4`));
    got.push(path.basename(mp4));
  }
  const srt = path.join(dir, `${finalName(content)}.srt`);
  if (has(`out/${id}.srt`) && (force || !fs.existsSync(srt))) {
    fs.writeFileSync(srt, show(`out/${id}.srt`));
    got.push(path.basename(srt));
  }
  return got;
}
