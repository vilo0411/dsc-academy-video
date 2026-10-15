#!/usr/bin/env node
// Quản lý thư viện âm thanh dùng chung assets/audio/ (nhạc nền, ambience, stinger, tiếng động).
//
//   npm run audio -- list [--kind music] [--mood upbeat]
//   npm run audio -- play <id>
//   npm run audio -- try <id> <video>              trộn thử với giọng của video → videos/<id>/.work/try-<track>.mp3
//   npm run audio -- sources                                            nguồn hay dùng (Pixabay, Mixkit, YouTube Audio Library…)
//   npm run audio -- add <file|thư mục|URL> --kind music --mood upbeat,playful [--source pixabay|mixkit|yt|incompetech|epidemic|…]
//                        [--id …] [--energy 1-5] [--bpm …] [--license cc0|pdm|by|by-sa|pixabay|mixkit|yt|subscription|own]
//                        [--author …] [--url …] [--title …] [--credit] [--contentid]
//   npm run audio -- search "<từ khoá>" [--kind music|ambience|sfx] [--cc0]   tìm trên Openverse (chỉ giấy phép dùng thương mại;
//                        --cc0: chỉ bài không cần ghi công)
//   npm run audio -- fetch <openverse-id> --kind ambience --mood rain [--id …]
//   npm run audio -- generate [--only id,id] [--api]                     tạo lô nhạc Lyria từ assets/audio/lyria-batch.json
//   npm run audio -- synth                                               đưa stinger tổng hợp trong code vào thư viện
//   npm run audio -- remove <id>
//   npm run audio -- credits                                             sinh lại assets/audio/CREDITS.md
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadEnv } from "./lib/env.mjs";
import { AUDIO_DIR, KINDS, TARGET_LUFS, LICENSES, loadCatalog, saveCatalog, findTrack, trackFile, needsCredit, creditLine, licenseNote } from "./lib/audio-lib.mjs";
import { mixdown, probeDur, renderSound } from "./lib/sound.mjs";
import { resolveVideo, workDir } from "./lib/paths.mjs";

loadEnv();
const [cmd, ...rest] = process.argv.slice(2);
const pos = [], opt = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) {
    const k = rest[i].slice(2);
    opt[k] = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : true;
  } else pos.push(rest[i]);
}
const die = (msg, code = 1) => (console.error(msg), process.exit(code));
const list = (s) => (s && s !== true ? String(s).split(",").map((x) => x.trim()).filter(Boolean) : []);
const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-v", "error", ...args], { maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error("ffmpeg lỗi: " + String(r.stderr).slice(-400));
  return r;
};
const SUBDIR = { music: "music", ambience: "ambience", stinger: "stingers", sfx: "sfx" };
const UA = { "User-Agent": "dsc-academy-video/0.1 (audio library tool)" };

// Chuẩn hoá một file bất kỳ → m4a 48 kHz stereo ở độ to chuẩn theo loại (tăng/giảm tuyến tính, giữ động).
function normalize(src, kind, outFile) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dsc-audio-")), "a.wav");
  const trim = kind === "ambience" ? "" : "silenceremove=start_periods=1:start_threshold=-60dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,";
  // Ambience dài: giữ tối đa 90 giây (đủ cho một đoạn cảnh, mixdown tự lặp) để thư viện nhẹ.
  const max = +opt.max || (kind === "ambience" ? 90 : 0);
  ff(["-i", src, "-vn", ...(max ? ["-t", String(max)] : []), "-af", `${trim}aresample=48000`, "-ac", "2", tmp]);
  const m = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", tmp, "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const err = String(m.stderr), j = JSON.parse(err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1));
  let gain = TARGET_LUFS[kind] - parseFloat(j.input_i);
  // Clip quá ngắn (< 0,4 s) không đo được LUFS: chuẩn hoá theo đỉnh −3 dBFS.
  if (!isFinite(gain)) {
    const v = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", tmp, "-af", "volumedetect", "-f", "null", "-"]);
    const peak = parseFloat((/max_volume: (-?[\d.]+) dB/.exec(String(v.stderr)) || [])[1]);
    gain = -3 - peak;
  }
  if (!isFinite(gain)) throw new Error("Không đo được độ to (file im lặng?)");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  ff(["-i", tmp, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`, "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", outFile]);
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  return { lufs: TARGET_LUFS[kind], gain: +gain.toFixed(1), duration: +probeDur(outFile).toFixed(2) };
}

// Nguồn hay dùng (tải tay từ web rồi add --source …): tự điền giấy phép và ghi chú.
const SOURCES = {
  pixabay: { license: "pixabay", url: "https://pixabay.com/music/" },
  mixkit: { license: "mixkit", url: "https://mixkit.co/free-stock-music/" },
  incompetech: { license: "by", author: "Kevin MacLeod", url: "https://incompetech.com/music/royalty-free/" },
  fma: { url: "https://freemusicarchive.org/" }, // giấy phép khác nhau từng bài: bắt buộc --license
  freesound: { url: "https://freesound.org/" }, // như trên
  yt: { license: "yt", url: "https://studio.youtube.com/ (Audio Library)" },
  epidemic: { license: "subscription", account: "Epidemic Sound", url: "https://www.epidemicsound.com/" },
  artlist: { license: "subscription", account: "Artlist", url: "https://artlist.io/" },
  envato: { license: "subscription", account: "Envato Elements", url: "https://elements.envato.com/" },
};

function addTrack(src, meta) {
  const pre = SOURCES[meta.preset] || {};
  if (meta.preset && !SOURCES[meta.preset]) die(`--source "${meta.preset}" không có. Có: ${Object.keys(SOURCES).join(", ")}`);
  meta = { ...meta, license: meta.license || pre.license, author: meta.author || pre.author, url: meta.url || pre.url, account: pre.account, source: meta.source || meta.preset };
  const kind = meta.kind;
  if (!KINDS.includes(kind)) die(`--kind phải là một trong: ${KINDS.join(", ")}`);
  if (!meta.license) die(`Thiếu --license (${Object.keys(LICENSES).join(", ")}). Ghi rõ nguồn gốc file trước khi đưa vào thư viện.`);
  if (!LICENSES[meta.license]) die(`Giấy phép "${meta.license}" không dùng được cho video thương mại. Cho phép: ${Object.keys(LICENSES).join(", ")}`);
  if (needsCredit(meta) && !meta.author && !meta.attribution) die("Bài cần ghi công: thêm --author (và --url) hoặc --attribution \"dòng ghi công nguyên văn\".");
  const cat = loadCatalog();
  const id = meta.id || slug(meta.title || path.basename(src, path.extname(src)));
  if (cat.tracks.some((t) => t.id === id) && !opt.force) die(`Đã có "${id}" trong thư viện (thêm --force để ghi đè, hoặc --id khác).`);
  const file = `${SUBDIR[kind]}/${id}.m4a`;
  const n = normalize(src, kind, path.join(AUDIO_DIR, file));
  const t = {
    id, kind, file, title: meta.title || id, mood: meta.mood || [], energy: meta.energy != null ? +meta.energy : 3,
    ...(meta.bpm ? { bpm: +meta.bpm } : {}), duration: n.duration, loop: kind === "music" || kind === "ambience",
    source: meta.source || "user", license: meta.license,
    ...(meta.author ? { author: meta.author } : {}), ...(meta.url ? { url: meta.url } : {}),
    ...(meta.attribution ? { attribution: meta.attribution } : {}), ...(meta.prompt ? { prompt: meta.prompt } : {}),
    ...(meta.hash ? { hash: meta.hash } : {}), ...(meta.credit ? { credit: true } : {}), ...(meta.contentId ? { contentId: true } : {}),
    ...(meta.account ? { account: meta.account } : {}), ...(meta.note ? { note: meta.note } : {}),
  };
  cat.tracks = cat.tracks.filter((x) => x.id !== id).concat(t);
  saveCatalog(cat);
  writeCreditsMd(cat);
  console.log(`✓ ${id} (${kind}, ${n.duration}s, chỉnh ${n.gain >= 0 ? "+" : ""}${n.gain} dB → ${n.lufs} LUFS) → ${path.join(AUDIO_DIR, file)}`);
  if (licenseNote(t)) console.log(`  ⚠ ${licenseNote(t)}`);
  return t;
}

function writeCreditsMd(cat = loadCatalog()) {
  const rows = cat.tracks.map((t) => `| ${t.id} | ${t.kind} | ${LICENSES[t.license] || t.license} | ${t.author || "—"} | ${t.url ? `[nguồn](${t.url})` : "—"} |`);
  const need = cat.tracks.filter((t) => needsCredit(t));
  const md = `# Nguồn âm thanh (sinh tự động bởi \`npm run audio -- credits\`)\n\nBài CC BY / BY-SA phải ghi công trong mô tả video — \`npm run video\` tự ghi \`videos/<id>/credits.txt\` khi video dùng bài đó.\n\n| id | loại | giấy phép | tác giả | nguồn |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n${need.length ? `\n## Dòng ghi công\n\n${need.map((t) => `- ${t.id}: ${creditLine(t)}`).join("\n")}\n` : ""}`;
  fs.writeFileSync(path.join(AUDIO_DIR, "CREDITS.md"), md);
}

// ---------- Openverse ----------
const OV = "https://api.openverse.org/v1/audio/";
const OV_LICENSES = ["cc0", "pdm", "by", "by-sa"];
// Openverse gắn category "music" khá đủ; tiếng động (Freesound) phần lớn không có category nên không lọc.
const ovCategory = (kind) => (kind === "music" ? "music" : null);

// Openverse giới hạn tần suất khi không có key: chờ rồi thử lại (429 hoặc trang chặn của Cloudflare).
async function ovJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { ...UA, Accept: "application/json" } });
    const txt = await res.text();
    if (res.ok && txt.trimStart().startsWith("{")) return JSON.parse(txt);
    if (attempt >= 4 || (res.status < 500 && res.status !== 429 && res.status !== 403)) throw new Error(`Openverse ${res.status}: ${txt.slice(0, 200)}`);
    const wait = 15 * attempt;
    console.error(`  Openverse bận (${res.status}), chờ ${wait}s…`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

async function search(q) {
  const p = new URLSearchParams({ q, license: opt.cc0 ? "cc0,pdm" : OV_LICENSES.join(","), page_size: String(Math.min(20, +opt.n || 20)) });
  if (ovCategory(opt.kind)) p.set("category", ovCategory(opt.kind));
  if (opt.long) p.set("length", "long");
  const j = await ovJson(`${OV}?${p}`);
  if (!j.results?.length) return console.log("Không có kết quả.");
  console.log(`${j.result_count} kết quả (hiện ${j.results.length}). Lấy về: npm run audio -- fetch <id> --kind … --mood …\n`);
  for (const r of j.results) {
    const d = r.duration ? `${(r.duration / 1000).toFixed(0)}s` : "?";
    console.log(`${r.id}  ${d.padStart(5)}  ${(r.license + (r.license_version ? " " + r.license_version : "")).padEnd(10)} ${r.source.padEnd(10)} ${r.title?.slice(0, 60)} — ${r.creator || "?"}`);
  }
}

async function fetchOv(ovId) {
  if (!opt.kind) die("Thiếu --kind (music, ambience, stinger, sfx)");
  const r = await ovJson(`${OV}${encodeURIComponent(ovId)}/`);
  if (!OV_LICENSES.includes(r.license)) die(`Giấy phép ${r.license} không dùng được cho video thương mại.`);
  // File tải về là dữ liệu không tin cậy: để trong thư mục tạm riêng, chỉ đọc bằng ffmpeg.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-ov-"));
  const ext = (r.filetype || path.extname(new URL(r.url).pathname).slice(1) || "bin").replace(/[^a-z0-9]/gi, "");
  const dl = path.join(tmpDir, `src.${ext}`);
  const res = await fetch(r.url, { headers: UA, redirect: "follow" });
  if (!res.ok) die(`Tải file lỗi ${res.status} (${r.url})`);
  fs.writeFileSync(dl, Buffer.from(await res.arrayBuffer()));
  const lic = `${LICENSES[r.license]}${r.license_version ? " " + r.license_version : ""}`;
  try {
    addTrack(dl, {
      kind: opt.kind, id: opt.id || slug(r.title || ovId), title: r.title, mood: list(opt.mood), energy: opt.energy, bpm: opt.bpm,
      source: `openverse:${r.source}`, license: r.license, author: r.creator, url: r.foreign_landing_url || r.url,
      attribution: r.attribution || `"${r.title}" – ${r.creator} (${lic}) ${r.foreign_landing_url || ""}`.trim(),
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------- Lyria ----------
const PRICE_PER_CLIP = 0.06; // USD cho một đoạn ~30 giây lyria-002 — kiểm tra lại trang giá Vertex AI
async function generate() {
  const batch = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, "lyria-batch.json"), "utf8"));
  const cat = loadCatalog();
  const only = list(opt.only);
  const neg = (b) => b.negative || batch.negative || "";
  const hashOf = (b) => crypto.createHash("sha1").update(JSON.stringify([b.prompt, neg(b), b.seed ?? 7])).digest("hex").slice(0, 12);
  // Cùng mã băm với scripts/music.mjs → lấy lại music.wav một video đã tạo, khỏi gọi API.
  const videoHash = (b) => crypto.createHash("sha1").update(JSON.stringify([b.prompt, neg(b), b.seed ?? 7, "lyria-002"])).digest("hex");
  const existing = new Map();
  for (const d of fs.existsSync("videos") ? fs.readdirSync("videos") : []) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join("videos", d, "music.json"), "utf8"));
      if (fs.existsSync(path.join("videos", d, "music.wav"))) existing.set(m.hash, path.join("videos", d, "music.wav"));
    } catch {}
  }
  let todo = batch.tracks.filter((b) => (!only.length || only.includes(b.id)) && cat.tracks.find((t) => t.id === b.id)?.hash !== hashOf(b));
  opt.force = true;
  todo = todo.filter((b) => {
    const wav = existing.get(videoHash(b));
    if (!wav) return true;
    addTrack(wav, { ...b, kind: "music", source: "lyria", license: "lyria", hash: hashOf(b), title: b.title || b.id, note: [b.note, `lấy lại từ ${wav}`].filter(Boolean).join("; ") });
    return false;
  });
  if (!todo.length) return console.log("Mọi bài trong lô đã có trong thư viện.");
  console.log(`Cần tạo ${todo.length} bài bằng Lyria (lyria-002): ${todo.map((b) => b.id).join(", ")}`);
  console.log(`Ước tính ~${(todo.length * PRICE_PER_CLIP).toFixed(2)} USD (${PRICE_PER_CLIP} USD/đoạn 30 giây, tính phí Vertex AI).`);
  if (!opt.api) die("Chạy lại với --api để tạo.", 2);
  const { generateMusic } = await import("./lib/lyria.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-lyria-"));
  let fail = 0;
  for (const b of todo) {
    try {
      const wav = path.join(tmpDir, `${b.id}.wav`);
      fs.writeFileSync(wav, await generateMusic({ prompt: b.prompt, negative: neg(b), seed: b.seed }));
      addTrack(wav, { ...b, kind: "music", source: "lyria", license: "lyria", hash: hashOf(b), title: b.title || b.id });
    } catch (e) {
      fail++;
      console.error(`✗ ${b.id}: ${e.message}`);
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (fail) process.exit(1);
}

// ---------- Lệnh ----------
const cat = loadCatalog();
switch (cmd) {
  case "list": {
    const moods = list(opt.mood);
    const rows = cat.tracks.filter((t) => (!opt.kind || t.kind === opt.kind) && (!moods.length || moods.some((m) => t.mood?.includes(m))));
    if (!rows.length) {
      console.log("Thư viện trống (hoặc không có mục hợp bộ lọc). Thêm: npm run audio -- add | fetch | generate | synth");
      break;
    }
    for (const k of KINDS) {
      const g = rows.filter((t) => t.kind === k);
      if (!g.length) continue;
      console.log(`\n${k} (${g.length})`);
      for (const t of g) console.log(`  ${t.id.padEnd(28)} ${String(t.duration.toFixed(0) + "s").padStart(5)}  e${t.energy ?? "?"}  ${(t.mood || []).join(",").padEnd(26)} ${t.license}${needsCredit(t) ? " ⚑ghi công" : ""}${licenseNote(t) ? " ⚠" : ""}`);
    }
    const allMoods = [...new Set(cat.tracks.flatMap((t) => t.mood || []))].sort();
    console.log(`\nmood: ${allMoods.join(", ")}`);
    break;
  }
  case "play": {
    const t = findTrack(pos[0] || die("Thiếu id"), null, cat);
    console.log(`▶ ${t.id} (${t.duration}s) — Ctrl+C để dừng`);
    spawnSync(process.platform === "darwin" ? "afplay" : "ffplay", process.platform === "darwin" ? [trackFile(t)] : ["-nodisp", "-autoexit", trackFile(t)], { stdio: "inherit" });
    break;
  }
  case "try": {
    const t = findTrack(pos[0] || die("Thiếu id bài"), null, cat);
    const v = resolveVideo(pos[1] || die("Thiếu tên video (cần giọng đã tạo)"));
    let timings = {};
    try { timings = JSON.parse(fs.readFileSync(path.join(v.dir, "timings.json"), "utf8")); } catch {}
    const voice = path.join(v.dir, timings.audio || "voice.wav");
    if (!fs.existsSync(voice)) die(`${v.id} chưa có giọng đọc (${voice}).`);
    const total = Math.min(+opt.seconds || 40, probeDur(voice));
    const w = workDir(v.dir);
    const wav = path.join(w, `try-${t.id}.wav`), mp3 = path.join(w, `try-${t.id}.mp3`);
    const isBg = t.kind === "music" || t.kind === "ambience";
    mixdown({
      voice, total, out: wav,
      music: t.kind === "music" ? trackFile(t) : null, musicVol: +opt.volume || v.content.music?.volume || 1.5,
      beds: t.kind === "ambience" ? [{ file: trackFile(t), start: 0, end: total, vol: +opt.volume || 1 }] : [],
      hits: isBg ? [] : [{ file: trackFile(t), t: 0.5, vol: +opt.volume || 1 }],
      duck: v.content.duck || {},
    });
    ff(["-i", wav, "-c:a", "libmp3lame", "-b:a", "160k", mp3]);
    fs.rmSync(wav);
    console.log(`✓ ${mp3}`);
    if (opt.play) spawnSync("afplay", [mp3], { stdio: "inherit" });
    break;
  }
  case "add": {
    // URL: tải về thư mục tạm riêng (dữ liệu không tin cậy, chỉ đọc bằng ffmpeg), id/title theo tên file.
    const urlTmp = [];
    for (let i = 0; i < pos.length; i++) {
      if (!/^https?:\/\//.test(pos[i])) continue;
      const u = new URL(pos[i]);
      const d = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-url-"));
      const name = decodeURIComponent(path.basename(u.pathname)).replace(/[^\w .()-]/g, "_") || "audio.mp3";
      const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (dsc-academy-video)" }, redirect: "follow" });
      if (!res.ok) die(`Tải ${u} lỗi ${res.status}`);
      fs.writeFileSync(path.join(d, name), Buffer.from(await res.arrayBuffer()));
      if (!opt.url) opt.url = u.href;
      if (!opt.title && pos.length === 1) opt.title = path.basename(name, path.extname(name));
      pos[i] = path.join(d, name);
      urlTmp.push(d);
    }
    process.on("exit", () => urlTmp.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
    // Nhiều file một lần (vd. cả thư mục tải về): id lấy theo tên file, cùng kind/mood/nguồn.
    const files = pos.flatMap((p) => (fs.existsSync(p) && fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter((f) => /\.(mp3|wav|m4a|aac|ogg|flac|aiff?)$/i.test(f)).map((f) => path.join(p, f)) : [p]));
    if (!files.length || files.some((f) => !fs.existsSync(f))) die("Thiếu file. Ví dụ: npm run audio -- add ~/Downloads/x.mp3 --kind music --mood calm --source pixabay");
    if (files.length > 1 && opt.id) die("--id chỉ dùng khi thêm một file.");
    for (const f of files)
      addTrack(f, { kind: opt.kind, id: opt.id, title: opt.title, mood: list(opt.mood), energy: opt.energy, bpm: opt.bpm, license: opt.license, author: opt.author, url: opt.url, attribution: opt.attribution, note: opt.note, preset: opt.source, credit: !!opt.credit, contentId: !!opt.contentid });
    break;
  }
  case "sources":
    console.log("Nguồn hay dùng (tải tay rồi: npm run audio -- add <file|thư mục> --kind … --mood … --source <tên>):\n");
    for (const [k, v] of Object.entries(SOURCES)) console.log(`  ${k.padEnd(12)} ${(v.license ? LICENSES[v.license] : "ghi --license theo từng bài").padEnd(44)} ${v.url}`);
    console.log("\nTìm tự động (Openverse: Freesound, Jamendo, ccMixter…): npm run audio -- search \"…\"");
    console.log("TikTok Commercial Music Library chỉ dùng được trong TikTok, không tải về được — xem docs/audio-guide.md.");
    break;
  case "search":
    await search(pos.join(" ") || die('Thiếu từ khoá. Ví dụ: npm run audio -- search "rain" --kind ambience'));
    break;
  case "fetch":
    await fetchOv(pos[0] || die("Thiếu id Openverse (lấy từ lệnh search)"));
    break;
  case "generate":
    await generate();
    break;
  case "synth": {
    // Stinger tổng hợp sẵn trong scripts/lib/sound.mjs — miễn phí.
    const SYN = [
      { id: "chime-intro", sound: "chime", mood: ["bright", "intro"], energy: 3 },
      { id: "quiz-reveal", sound: "reveal", mood: ["quiz", "reveal"], energy: 4 },
      { id: "correct-ding", sound: "success", mood: ["quiz", "correct", "playful"], energy: 4 },
      { id: "soft-outro", sound: "outro", mood: ["calm", "outro"], energy: 2 },
      { id: "boom-hit", sound: "hit", mood: ["serious", "emphasis"], energy: 4 },
      { id: "riser-short", sound: "riser", mood: ["tense", "build"], energy: 4 },
    ];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dsc-synth-"));
    opt.force = true;
    for (const s of SYN) {
      const wav = path.join(tmpDir, `${s.id}.wav`);
      fs.writeFileSync(wav, renderSound(s.sound));
      addTrack(wav, { kind: "stinger", id: s.id, title: s.id, mood: s.mood, energy: s.energy, source: "synth", license: "synth", note: `sound.mjs: ${s.sound}` });
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    break;
  }
  case "remove": {
    const t = findTrack(pos[0] || die("Thiếu id"), null, cat);
    fs.rmSync(trackFile(t), { force: true });
    cat.tracks = cat.tracks.filter((x) => x.id !== t.id);
    saveCatalog(cat);
    writeCreditsMd(cat);
    console.log(`✓ Đã xoá ${t.id}`);
    break;
  }
  case "credits":
    writeCreditsMd(cat);
    console.log(`✓ ${path.join(AUDIO_DIR, "CREDITS.md")}`);
    break;
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(1).map((l) => l.slice(3)).join("\n"));
}
