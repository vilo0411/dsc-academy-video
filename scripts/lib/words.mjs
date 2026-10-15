// Mốc từng từ dùng chung cho mọi định dạng (toon, cảnh dựng sẵn, phụ đề).
//
// Hai nguồn, giống MoneyPrinterTurbo (subtitle_provider = edge | whisper):
//   whisper   — whisper.cpp trên máy hoặc trên CI (scripts/lib/align.mjs), chữ luôn lấy từ kịch bản
//   estimate  — chia đều theo âm tiết trong khung thời gian của từng cảnh (timings.json), khi không có Whisper
// Kết quả ghi ra .work/words.json theo kiểu Caption của Remotion (@remotion/captions):
//   { text, startMs, endMs, confidence, exact, scene }
// confidence = xác suất token nhỏ nhất của Whisper (null khi nội suy/ước lượng) — QA dùng để báo mốc `at` dễ sai.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { whisperWords, alignScript, WHISPER_MODEL } from "./align.mjs";
import { workDir } from "./paths.mjs";

export const norm = (w) => w.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
const splitWords = (text) => (text || "").split(/\s+/).filter((w) => norm(w));

let whisperOk;
export function hasWhisper() {
  if (process.env.NO_WHISPER) return false;
  if (whisperOk == null) whisperOk = fs.existsSync(WHISPER_MODEL) && !spawnSync("whisper-cli", ["--help"], { stdio: "ignore" }).error;
  return whisperOk;
}

// Thời lượng ước lượng khi chưa có giọng (cùng công thức với bộ dựng người que).
export function estimateTimings(content) {
  let t = 0.6;
  const scenes = content.scenes.map((s) => {
    const d = splitWords(s.text).length / 3.4 + 0.5;
    const out = { id: s.id, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return out;
  });
  return { source: "estimate", audio: null, duration: +t.toFixed(3), scenes };
}

// words: [{ word, start, end, p, exact }] liền một dải; byScene: mảng theo cảnh.
export function sceneWords(content, dir, timings) {
  const voice = timings.audio ? path.join(dir, timings.audio) : null;
  let words;
  let source = "estimate";
  if (voice && fs.existsSync(voice) && hasWhisper()) {
    try {
      words = alignScript(content.scenes.map((s) => s.text).join(" "), whisperWords(voice));
      source = "whisper";
    } catch (e) {
      console.log(`⚠ Whisper lỗi, chia đều theo âm tiết: ${String(e.message).slice(0, 160)}`);
    }
  }
  if (!words) {
    words = [];
    content.scenes.forEach((s, i) => {
      const tm = timings.scenes[i];
      const ws = splitWords(s.text);
      if (!tm || !ws.length) return;
      const span = Math.max(0.2, tm.end - tm.start - 0.15);
      const step = span / ws.length;
      ws.forEach((w, k) => words.push({ word: w, start: +(tm.start + k * step).toFixed(3), end: +(tm.start + (k + 1) * step).toFixed(3), p: null, exact: false }));
    });
  }
  const byScene = [];
  let wi = 0;
  for (const s of content.scenes) {
    const n = splitWords(s.text).length;
    byScene.push(words.slice(wi, wi + n));
    wi += n;
  }
  const caps = byScene.flatMap((ws, i) =>
    ws.map((w) => ({ text: w.word, startMs: Math.round(w.start * 1000), endMs: Math.round(w.end * 1000), confidence: w.p ?? null, exact: !!w.exact, scene: content.scenes[i].id ?? i }))
  );
  fs.writeFileSync(path.join(workDir(dir), "words.json"), JSON.stringify({ source, words: caps }, null, 0));
  return { source, words, byScene };
}

// Tra mốc theo từ trong cảnh: at(cảnh, "từ", lần) — cảnh là chỉ số (0…) hoặc id. Ghi lại mọi lần tra để QA soát độ tin cậy.
export function makeAt(content, byScene) {
  const lookups = [];
  const si = (sc) => {
    const i = typeof sc === "number" ? sc : content.scenes.findIndex((s) => s.id === sc);
    if (!byScene[i]) throw new Error(`Không có cảnh ${sc}`);
    return i;
  };
  function at(sc, word, n = 0) {
    const i = si(sc);
    const hits = byScene[i].filter((w) => norm(w.word) === norm(word));
    if (!hits[n]) throw new Error(`Không thấy từ "${word}" (lần ${n + 1}) trong cảnh ${i + 1}: ${content.scenes[i].text}`);
    lookups.push({ scene: content.scenes[i].id ?? i, word, p: hits[n].p, exact: hits[n].exact, t: hits[n].start });
    return hits[n].start;
  }
  function seq(sc, word, n) {
    const i = si(sc);
    const ws = byScene[i];
    const j = ws.findIndex((w) => norm(w.word) === norm(word));
    if (j < 0) throw new Error(`Không thấy từ "${word}" trong cảnh ${i + 1}`);
    lookups.push({ scene: content.scenes[i].id ?? i, word, p: ws[j].p, exact: ws[j].exact, t: ws[j].start });
    return ws.slice(j, j + n).map((w) => w.start);
  }
  // Có từ này trong cảnh không (không ném lỗi) — cho cảnh dựng sẵn khi `at` là tuỳ chọn
  const has = (sc, word) => byScene[si(sc)].some((w) => norm(w.word) === norm(word));
  return { at, seq, si, has, lookups };
}

// Mốc `at` neo vào từ Whisper nghe nhầm hoặc độ tin cậy thấp → nên đổi sang từ bên cạnh.
// Bỏ qua từ nghe khác chữ nhưng Whisper rất chắc (thường là số: "năm" ↔ "1923"); nội suy (p null, không khớp) thì báo.
export function weakAnchors(lookups, source, minP = 0.5) {
  if (source !== "whisper") return [];
  const seen = new Set();
  return lookups.filter((l) => {
    const k = `${l.scene}|${l.word}|${l.t}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return l.p == null ? !l.exact : l.p < minP || (!l.exact && l.p < 0.8);
  });
}
