// Mốc thời gian từng từ bằng whisper.cpp chạy trên máy (miễn phí), khớp về đúng lời trong kịch bản.
// Whisper có thể nghe nhầm chữ ("dư" → "dưa"), nên chỉ lấy thời gian của nó; chữ luôn lấy từ kịch bản.
// Từ mốc từng từ suy ra hình miệng (A–H, X theo quy ước Rhubarb) dựa trên phụ âm đầu, nguyên âm, âm cuối tiếng Việt.
//
// Cần: brew install whisper-cpp; mô hình ở assets/models/whisper/ggml-large-v3-turbo-q5_0.bin
// (tải: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin)

import fs from "node:fs";
import { spawnSync } from "node:child_process";

export const WHISPER_MODEL = process.env.WHISPER_MODEL || "assets/models/whisper/ggml-large-v3-turbo-q5_0.bin";

const norm = (w) =>
  w
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]/gu, "");

// Chạy Whisper một lần cho mỗi file (lưu kết quả cạnh file wav), trả về các từ [{w, start, end}] (giây).
export function whisperWords(wav) {
  const base = wav.replace(/\.wav$/, ".whisper");
  if (!fs.existsSync(`${base}.json`)) {
    // WHISPER_TIMEOUT (giây): CI đặt giới hạn, quá hạn thì bên gọi chia đều theo âm tiết
    const r = spawnSync("whisper-cli", ["-m", WHISPER_MODEL, "-l", "vi", "-f", wav, "-ojf", "-of", base, "-np"], {
      encoding: "utf8",
      ...(process.env.WHISPER_TIMEOUT ? { timeout: +process.env.WHISPER_TIMEOUT * 1000 } : {}),
    });
    if (r.status !== 0) throw new Error(`whisper-cli lỗi: ${r.stderr?.slice(-400) || r.error}`);
  }
  const j = JSON.parse(fs.readFileSync(`${base}.json`, "utf8"));
  const words = [];
  for (const seg of j.transcription)
    for (const t of seg.tokens) {
      if (t.text.startsWith("[_")) continue;
      const piece = t.text;
      const startsWord = piece.startsWith(" ") || !words.length;
      const clean = norm(piece);
      if (!clean) continue; // dấu câu
      // p: xác suất token của Whisper; độ tin cậy của từ = p nhỏ nhất trong các token ghép thành từ
      if (startsWord) words.push({ w: clean, start: t.offsets.from / 1000, end: t.offsets.to / 1000, p: t.p ?? null });
      else {
        const last = words.at(-1);
        last.w += clean;
        last.end = t.offsets.to / 1000;
        if (t.p != null) last.p = last.p == null ? t.p : Math.min(last.p, t.p);
      }
    }
  return words;
}

// Khớp lời kịch bản với kết quả Whisper (quy hoạch động kiểu Levenshtein theo từ), nội suy chỗ không khớp.
export function alignScript(text, heard) {
  const script = text.split(/\s+/).filter((w) => norm(w));
  const a = script.map(norm);
  const b = heard.map((h) => h.w);
  const n = a.length;
  const m = b.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : 1;
      D[i][j] = Math.min(D[i - 1][j - 1] + sub, D[i - 1][j] + 1, D[i][j - 1] + 1);
    }
  const match = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    const sub = a[i - 1] === b[j - 1] ? 0 : 1;
    if (D[i][j] === D[i - 1][j - 1] + sub) {
      match[i - 1] = j - 1; // giữ cả cặp khác chữ (nghe nhầm) vì thời gian vẫn đúng
      i--;
      j--;
    } else if (D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  // exact: Whisper nghe đúng chữ của kịch bản; p: độ tin cậy (null khi nội suy)
  const out = script.map((w, i) => {
    const h = heard[match[i]];
    return h ? { word: w, start: h.start, end: h.end, p: h.p ?? null, exact: a[i] === h.w } : { word: w, p: null, exact: false };
  });
  // Nội suy các từ thiếu giữa hai từ đã có mốc
  for (let i = 0; i < out.length; i++) {
    if (out[i].start != null) continue;
    let k = i;
    while (k < out.length && out[k].start == null) k++;
    const from = i > 0 ? out[i - 1].end : (heard[0]?.start ?? 0);
    const to = k < out.length ? out[k].start : (heard.at(-1)?.end ?? from + 0.3 * (k - i));
    const step = (to - from) / (k - i);
    for (let q = i; q < k; q++) Object.assign(out[q], { start: from + step * (q - i), end: from + step * (q - i + 1) });
    i = k - 1;
  }
  // Whisper ghi số bằng chữ số ("1923") nên nhiều từ đọc số dồn vào một mốc: dàn đều tới từ kế tiếp
  for (let i = 0; i < out.length; ) {
    let k = i + 1;
    while (k < out.length && Math.abs(out[k].start - out[i].start) < 0.02) k++;
    if (k - i > 1) {
      const to = k < out.length ? out[k].start : Math.max(out[k - 1].end, out[i].start + 0.25 * (k - i));
      const step = (to - out[i].start) / (k - i);
      for (let q = i; q < k; q++) Object.assign(out[q], { start: out[i].start + step * (q - i), end: out[i].start + step * (q - i + 1) });
    }
    i = k;
  }
  return out;
}

// ---- Hình miệng từ âm tiết tiếng Việt ----

const strip = (s) =>
  s
    .normalize("NFD")
    .replace(/[̣̀́̃̉]/g, "") // bỏ dấu thanh, giữ mũ/móc
    .normalize("NFC");

function vowelShape(v) {
  if (/^(a|ă|â)$/.test(v[0]) && !/[ouy]/.test(v.slice(1))) return v[0] === "a" ? "D" : "C";
  if (/^(o|ô|ơ)/.test(v)) return v.startsWith("ơ") ? "C" : "E";
  if (/^(u|ư)/.test(v)) return v.startsWith("ư") ? "B" : "F";
  if (/^(e|ê|i|y)/.test(v)) return "C";
  return "C";
}

// Một âm tiết → các hình miệng theo thứ tự [phụ âm đầu?, nguyên âm, âm cuối?] với tỉ lệ thời lượng.
export function syllableVisemes(word) {
  const s = strip(norm(word));
  const m = s.match(/^(ngh|ng|nh|ch|gh|gi|kh|ph|th|tr|qu|[bcdđghklmnpqrstvx])?([aăâeêioôơuưy]+)(ch|ng|nh|[cmnpt])?$/);
  if (!m) return [{ v: "C", f: 1 }];
  const [, ini, vow, fin] = m;
  const out = [];
  if (ini) out.push({ v: /^[mbp]$/.test(ini) ? "A" : /^(ph|v)$/.test(ini) ? "G" : /^(l|n|đ|d|t|th)$/.test(ini) ? "H" : "B", f: 0.25 });
  out.push({ v: vowelShape(vow), f: ini || fin ? 0.5 : 1 });
  if (vow.length > 1 && /[ouy]$/.test(vow) && !/^[ouy]/.test(vow)) out.push({ v: /[ou]$/.test(vow) ? "F" : "C", f: 0.2 });
  if (fin) out.push({ v: /^[mp]$/.test(fin) ? "A" : "B", f: 0.25 });
  const total = out.reduce((a, x) => a + x.f, 0);
  return out.map((x) => ({ v: x.v, f: x.f / total }));
}

// Từ đã căn → mốc miệng [{start, value}] (giây, tính từ đầu file). Khoảng nghỉ > 0,15s thì ngậm miệng (X).
export function visemeCues(words) {
  const cues = [];
  words.forEach((w, i) => {
    let t = w.start;
    const dur = Math.max(0.06, w.end - w.start);
    for (const s of syllableVisemes(w.word)) {
      if (cues.at(-1)?.value !== s.v) cues.push({ start: +t.toFixed(3), value: s.v });
      t += dur * s.f;
    }
    const next = words[i + 1];
    if (!next || next.start - w.end > 0.15) cues.push({ start: +w.end.toFixed(3), value: "X" });
  });
  return cues;
}
