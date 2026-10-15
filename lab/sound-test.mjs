#!/usr/bin/env node
// Bản nghe thử âm thanh để duyệt trước khi làm video: nhiều giọng đọc × nhiều bản nhạc nền,
// trộn với tiếng động theo đúng cách build-essay trộn.
//
// Cách dùng:  node scripts/sound-test.mjs content/sound-test-upbeat.json   (cần GEMINI_API_KEY, GCP_SA_KEY)
// Kết quả:    out/<id>/giong-*.mp3, nhac-*.mp3, demo-*.mp3 + out/<id>/README.txt

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnv } from "./lib/env.mjs";
import { synthesize, resample, trimSilence, floatToWav } from "./lib/tts-providers.mjs";
import { splitScenes } from "./lib/split.mjs";
import { generateMusic } from "./lib/lyria.mjs";
import { synthSfx, mixdown, probeDur } from "./lib/sound.mjs";

loadEnv();
const file = process.argv[2];
const c = JSON.parse(fs.readFileSync(file, "utf8"));
const work = path.join("build", c.id);
const outDir = path.join("out", c.id);
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const RATE = 24000;
const mp3 = (src, dst) => {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-c:a", "libmp3lame", "-b:a", "160k", dst]);
  if (r.status !== 0) throw new Error(String(r.stderr));
};
const report = [];
let errors = 0;

// 1) Giọng đọc
const voices = [];
for (const v of c.voices) {
  try {
    const text = c.scenes.map((s) => s.text.trim()).join("\n\n");
    const { samples, sampleRate } = await synthesize(text, v);
    const trimmed = trimSilence(resample(samples, sampleRate, RATE), RATE);
    const lead = new Float32Array(Math.round(0.3 * RATE));
    const all = new Float32Array(lead.length + trimmed.length);
    all.set(trimmed, lead.length);
    const wav = floatToWav(all, RATE);
    const wpath = path.join(work, `voice-${v.name}.wav`);
    fs.writeFileSync(wpath, wav);
    const split = splitScenes(wav, c.scenes);
    voices.push({ ...v, wav: wpath, split });
    mp3(wpath, path.join(outDir, `giong-${v.name}.mp3`));
    report.push(`giong-${v.name}.mp3  ${split.duration.toFixed(1)}s  (${v.voice}) ${v.note || ""}`);
    console.log(`✓ giọng ${v.name} ${split.duration.toFixed(1)}s`);
  } catch (e) {
    errors++;
    report.push(`giong-${v.name}: LỖI ${e.message.slice(0, 300)}`);
    console.error(`✗ giọng ${v.name}: ${e.message}`);
  }
}

// 2) Nhạc nền
const musics = [];
for (const m of c.musics) {
  try {
    const wpath = path.join(work, `music-${m.name}.wav`);
    fs.writeFileSync(wpath, await generateMusic(m));
    musics.push({ ...m, wav: wpath });
    mp3(wpath, path.join(outDir, `nhac-${m.name}.mp3`));
    report.push(`nhac-${m.name}.mp3  ${probeDur(wpath).toFixed(1)}s  ${m.note || ""}`);
    console.log(`✓ nhạc ${m.name}`);
  } catch (e) {
    errors++;
    report.push(`nhac-${m.name}: LỖI ${e.message.slice(0, 300)}`);
    console.error(`✗ nhạc ${m.name}: ${e.message}`);
  }
}

// 3) Bản trộn: giọng + nhạc + tiếng động (tiếng động đặt theo mốc cảnh của giọng)
const pairs = c.demos || voices.flatMap((v) => musics.map((m) => [v.name, m.name]));
for (const [vn, mn] of pairs) {
  const v = voices.find((x) => x.name === vn), m = musics.find((x) => x.name === mn);
  if (!v || !m) continue;
  const ev = [];
  c.scenes.forEach((s, i) => {
    const sc = v.split.scenes[i];
    const d = sc.end - sc.start;
    for (const e of s.sfx || []) ev.push({ t: sc.start + e.at * d, kind: e.kind, gain: e.gain, dur: e.dur });
  });
  const total = v.split.duration + 2.5;
  const sfx = path.join(work, `sfx-${vn}.wav`);
  fs.writeFileSync(sfx, synthSfx(ev, total));
  const mix = path.join(work, `demo-${vn}-${mn}.wav`);
  mixdown({ voice: v.wav, sfx, music: m.wav, total, out: mix, musicVol: m.volume ?? c.musicVolume ?? 1.8, duck: c.duck });
  mp3(mix, path.join(outDir, `demo-${vn}-${mn}.mp3`));
  report.push(`demo-${vn}-${mn}.mp3  giọng ${vn} + nhạc ${mn} + tiếng động`);
  console.log(`✓ demo ${vn} × ${mn}`);
}

fs.writeFileSync(path.join(outDir, "README.txt"), report.join("\n") + "\n");
fs.writeFileSync(path.join(work, "report.json"), JSON.stringify({ report, errors }, null, 2));
process.exit(voices.length && musics.length ? 0 : 1);
