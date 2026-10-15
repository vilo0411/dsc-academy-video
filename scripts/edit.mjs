#!/usr/bin/env node
// Sửa video trong HyperFrames Studio và giữ bản sửa qua các lần dựng lại (kể cả trên GitHub).
//
// Cách dùng:  npm run edit -- open   <video> [--app]   mở Studio trên trình duyệt (--app: ứng dụng HyperFrames desktop)
//             npm run edit -- save   <video>           khoá bản đã sửa vào videos/<id>/edit/ (lưu trong git)
//             npm run edit -- drop   <video>           bỏ bản sửa, quay về bản sinh tự động từ kịch bản
//             npm run edit -- status <video>
// <video>: t01 | t01-vi-mo-la-gi | videos/<id>. Sau khi khoá, sửa kịch bản sẽ KHÔNG còn đổi video
// cho tới khi drop (bước dựng sẽ cảnh báo nếu bản sinh mới khác bản lúc khoá).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GENERATED, editsDir, generatedPath, sha1 } from "./lib/edits.mjs";
import { resolveVideo } from "./lib/paths.mjs";

const [cmd, arg] = process.argv.slice(2);
if (!["open", "save", "drop", "status"].includes(cmd)) {
  console.error("Cách dùng: npm run edit -- open|save|drop|status <video> [--app]");
  process.exit(1);
}
let v;
try {
  v = resolveVideo(arg);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const { id, dir } = v;
const listProjects = () =>
  fs
    .readdirSync(dir)
    .filter((d) => /^project(-\d+x\d+)?$/.test(d) && fs.existsSync(path.join(dir, d, "index.html")))
    .map((d) => ({ dir: path.join(dir, d), o: d === "project" ? "16x9" : d.replace(/^project-/, "") }));
let projects = listProjects();
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);

if (cmd === "open") {
  // Dựng (kèm lấy giọng từ nhánh renders nếu thiếu) để Studio có tiếng và đúng nhịp.
  if (!projects.length || !fs.existsSync(path.join(dir, "voice.wav"))) {
    spawnSync(process.execPath, ["scripts/video.mjs", v.script, "--build-only", "--no-voice"], { stdio: "inherit" });
    projects = listProjects();
  }
  if (!projects.length) process.exit(1);
  console.log(`Mở ${projects[0].dir}. Sửa xong: npm run edit -- save ${id}`);
  spawnSync("npx", ["hyperframes", process.argv.includes("--app") ? "open" : "preview", projects[0].dir], { stdio: "inherit" });
} else if (cmd === "save") {
  if (!projects.length) console.error(`Chưa dựng ${id}: npm run video -- ${id} --build-only`);
  for (const p of projects) {
    const gen = read(generatedPath(id, p.o));
    if (gen == null) {
      console.error(`Thiếu bản sinh của ${p.dir} — dựng lại: npm run video -- ${id} --build-only`);
      process.exit(1);
    }
    const html = read(path.join(p.dir, "index.html"));
    const out = editsDir(id, p.o);
    if (html === gen && !fs.existsSync(out)) {
      console.log(`${p.dir}: chưa sửa gì, bỏ qua.`);
      continue;
    }
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "index.html"), html);
    // File thêm vào trong Studio (ảnh, chữ…): mọi thứ không do bước dựng sinh ra.
    for (const f of fs.readdirSync(p.dir).filter((f) => !GENERATED(f))) fs.cpSync(path.join(p.dir, f), path.join(out, f), { recursive: true });
    fs.writeFileSync(path.join(out, ".base.json"), JSON.stringify({ hash: sha1(gen), savedAt: new Date().toISOString() }, null, 2) + "\n");
    console.log(`✓ Đã khoá ${out}/ — "npm run video -- ${id}" sẽ render bản này.`);
  }
} else if (cmd === "drop") {
  for (const p of projects) {
    fs.rmSync(editsDir(id, p.o), { recursive: true, force: true });
    const gen = read(generatedPath(id, p.o));
    if (gen != null) fs.writeFileSync(path.join(p.dir, "index.html"), gen);
  }
  fs.rmSync(editsDir(id), { recursive: true, force: true });
  console.log(`✓ Đã bỏ bản sửa của ${id}. Video sẽ dựng lại từ kịch bản.`);
} else {
  if (!projects.length) console.log(fs.existsSync(editsDir(id)) ? `Có bản sửa ở ${editsDir(id)}/ nhưng chưa dựng.` : "Chưa dựng, chưa có bản sửa.");
  for (const p of projects) {
    const html = read(path.join(p.dir, "index.html"));
    const gen = read(generatedPath(id, p.o));
    const saved = read(path.join(editsDir(id, p.o), "index.html"));
    let stale = false;
    try {
      stale = JSON.parse(read(path.join(editsDir(id, p.o), ".base.json"))).hash !== sha1(gen);
    } catch {}
    const unsaved = saved != null ? saved !== html : gen != null && gen !== html;
    console.log(`${p.dir}: ${saved != null ? "đã khoá bản sửa" : "bản sinh tự động"}${unsaved ? ", có sửa chưa khoá" : ""}${stale ? ", ⚠ kịch bản đã đổi sau khi khoá" : ""}`);
  }
}
