// Âm thanh cho video essay: tiếng động tổng hợp (giấy, con dấu, máy đánh chữ, whoosh…)
// và trộn cuối cùng bằng ffmpeg: giọng đọc + tiếng động + nhạc nền tự hạ khi có lời (ducking),
// chuẩn hoá độ to về -16 LUFS.

import fs from "node:fs";
import { spawnSync } from "node:child_process";

export const SR = 44100;

// ---------- Bộ lọc & nguồn âm ----------
function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
}
// Biquad (RBJ cookbook)
function biquad(type, f0, q = 0.7) {
  const w = (2 * Math.PI * f0) / SR, cs = Math.cos(w), a = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = a; b1 = 0; b2 = -a; } // bandpass (đỉnh 0 dB)
  a0 = 1 + a; a1 = -2 * cs; a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const c = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  return (x) => {
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}
// Bandpass có tần số trượt: bộ lọc state-variable (Chamberlin), đổi tần số mượt từng mẫu.
function sweepBP(noise, n, f0, f1, q) {
  const out = new Float32Array(n);
  let low = 0, band = 0;
  const damp = 1 / q;
  for (let k = 0; k < n; k++) {
    const fc = f0 * Math.pow(f1 / f0, k / n);
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
    const x = noise();
    low += f * band;
    const high = x - low - damp * band;
    band += f * high;
    out[k] = band * damp;
  }
  return out;
}

// ---------- Từng loại tiếng ----------
// Mỗi hàm trả Float32Array ở SR, biên độ ~[-1, 1] trước khi nhân gain.
const SOUNDS = {
  // giấy trượt trên bàn: tiếng sột soạt băng giữa
  slide(r) {
    const n = Math.floor(0.2 * SR), out = new Float32Array(n);
    const bp = biquad("bp", 2600, 0.9), hp = biquad("hp", 900);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const env = Math.min(1, u / 0.15) * Math.pow(1 - u, 1.6) * (0.75 + 0.25 * Math.abs(r()));
      out[k] = hp(bp(r())) * env * 2.2;
    }
    return out;
  },
  // mảnh bìa đặt xuống: cú gõ nhẹ có thân trầm
  tap(r) {
    const n = Math.floor(0.09 * SR), out = new Float32Array(n);
    const lp = biquad("lp", 2400);
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      const body = Math.sin(2 * Math.PI * 170 * t) * Math.exp(-t * 55);
      const click = lp(r()) * Math.exp(-t * 260);
      out[k] = body * 0.7 + click * 0.9;
    }
    return out;
  },
  // con dấu: tiếng thịch trầm + tiếng giấy nén
  stamp(r) {
    const n = Math.floor(0.32 * SR), out = new Float32Array(n);
    const hp = biquad("hp", 1400), lp = biquad("lp", 5000);
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      const f = 48 + 70 * Math.exp(-t * 30);
      ph += (2 * Math.PI * f) / SR;
      const thump = Math.sin(ph) * Math.exp(-t * 14);
      const crack = lp(hp(r())) * Math.exp(-t * 90);
      out[k] = thump * 1.0 + crack * 0.6;
    }
    return out;
  },
  // băng dính xé
  tape(r) {
    const n = Math.floor(0.22 * SR), out = new Float32Array(n);
    const bp = biquad("bp", 4200, 1.2);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const crackle = Math.abs(r()) > 0.82 ? 1 : 0.25;
      out[k] = bp(r()) * crackle * Math.sin(Math.PI * u) * 2.4;
    }
    return out;
  },
  // phím máy đánh chữ
  key(r) {
    const n = Math.floor(0.045 * SR), out = new Float32Array(n);
    const hp = biquad("hp", 1800);
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      out[k] = hp(r()) * Math.exp(-t * 520) * 1.3 + Math.sin(2 * Math.PI * 3100 * t) * Math.exp(-t * 180) * 0.35;
    }
    return out;
  },
  // bộ đếm cơ khí
  tick(r) {
    const n = Math.floor(0.05 * SR), out = new Float32Array(n);
    const hp = biquad("hp", 2500);
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      out[k] = hp(r()) * Math.exp(-t * 600) + Math.sin(2 * Math.PI * 1250 * t) * Math.exp(-t * 120) * 0.5;
    }
    return out;
  },
  // nhấn mạnh con số lớn: tiếng "bùm" trầm + lớp nhiễu phồng lên
  hit(r) {
    const n = Math.floor(1.2 * SR), out = new Float32Array(n);
    const lp = biquad("lp", 900);
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      const f = 38 + 50 * Math.exp(-t * 8);
      ph += (2 * Math.PI * f) / SR;
      const boom = Math.sin(ph) * Math.exp(-t * 3.2);
      const air = lp(r()) * Math.exp(-t * 6) * 0.5;
      out[k] = (boom + air) * Math.min(1, t / 0.006);
    }
    return out;
  },
  // chuyển cảnh: whoosh mềm
  whoosh(r) {
    const n = Math.floor(0.55 * SR);
    const s = sweepBP(r, n, 500, 3800, 1.4);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      s[k] *= Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 2) * 3;
    }
    return s;
  },
  // dây đỏ kéo căng
  zip(r) {
    const n = Math.floor(0.42 * SR);
    const s = sweepBP(r, n, 1600, 5200, 3);
    for (let k = 0; k < n; k++) s[k] *= Math.sin(Math.PI * (k / n)) * 3;
    return s;
  },
  // bút dạ vạch trên giấy
  pen(r, dur = 0.5) {
    const n = Math.floor(dur * SR), out = new Float32Array(n);
    const bp = biquad("bp", 3300, 1.1);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const grain = 0.55 + 0.45 * Math.sin(2 * Math.PI * 19 * (k / SR) + Math.sin(k / 900));
      out[k] = bp(r()) * grain * Math.min(1, u / 0.05) * Math.min(1, (1 - u) / 0.1) * 2;
    }
    return out;
  },
};
const GAIN = { slide: 0.16, tap: 0.22, stamp: 0.55, tape: 0.12, key: 0.07, tick: 0.09, hit: 0.5, whoosh: 0.14, zip: 0.07, pen: 0.06 };

// events: [{ t, kind, dur? }] → Buffer WAV 16-bit mono
export function synthSfx(events, total) {
  const out = new Float32Array(Math.ceil((total + 1.5) * SR));
  events.forEach((e, i) => {
    const fn = SOUNDS[e.kind];
    if (!fn) return;
    const r = rng(1000 + i * 7919);
    const s = fn(r, e.dur);
    const g = (GAIN[e.kind] || 0.1) * (e.gain ?? 1) * (0.85 + 0.15 * Math.abs(r()));
    const i0 = Math.max(0, Math.floor(e.t * SR));
    for (let k = 0; k < s.length && i0 + k < out.length; k++) out[i0 + k] += s[k] * g;
  });
  return wav16(out);
}

export function wav16(out) {
  const buf = Buffer.alloc(44 + out.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + out.length * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(out.length * 2, 40);
  for (let i = 0; i < out.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i])) * 32767), 44 + i * 2);
  return buf;
}

export const hasFfmpeg = () => spawnSync("ffmpeg", ["-version"]).status === 0;

// Trộn: giọng (tuỳ chọn) + tiếng động + nhạc nền (tuỳ chọn, lặp có crossfade, tự hạ khi có lời).
export function mixdown({ voice, sfx, music, total, out, musicVol = 1.5, sfxVol = 1.0 }) {
  const inputs = [], chain = [], mixIn = [];
  let idx = 0;
  const T = total.toFixed(3);
  let vLabel = null;
  if (voice) {
    inputs.push("-i", voice);
    chain.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${T},asplit=2[vmix][vkey]`);
    vLabel = "[vmix]";
    idx++;
  }
  inputs.push("-i", sfx);
  chain.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${sfxVol},apad,atrim=0:${T}[fx]`);
  idx++;
  if (music) {
    const md = probeDur(music);
    const xf = 2.5;
    const copies = Math.max(1, Math.ceil((total + 1) / Math.max(1, md - xf)));
    // Lặp nhạc: nạp file nhiều lần (asplit + acrossfade dễ làm ffmpeg cắt cụt), nối bằng crossfade.
    const first = idx;
    for (let k = 0; k < copies; k++) inputs.push("-i", music);
    idx += copies;
    if (copies === 1) chain.push(`[${first}:a]aresample=48000,aformat=channel_layouts=stereo[mloop]`);
    else {
      for (let k = 0; k < copies; k++) chain.push(`[${first + k}:a]aresample=48000,aformat=channel_layouts=stereo[mc${k}]`);
      let prev = "[mc0]";
      for (let k = 1; k < copies; k++) {
        const lab = k === copies - 1 ? "[mloop]" : `[mx${k}]`;
        chain.push(`${prev}[mc${k}]acrossfade=d=${xf}:c1=qsin:c2=qsin${lab}`);
        prev = lab;
      }
    }
    chain.push(`[mloop]atrim=0:${T},volume=${musicVol},afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, total - 3).toFixed(2)}:d=3[mus]`);
    if (vLabel) {
      chain.push(`[mus][vkey]sidechaincompress=threshold=0.03:ratio=4:attack=40:release=700:makeup=1[mduck]`);
      mixIn.push("[mduck]");
    } else mixIn.push("[mus]");
  } else if (vLabel) chain.push(`[vkey]anullsink`);
  if (vLabel) mixIn.unshift(vLabel);
  mixIn.push("[fx]");
  chain.push(`${mixIn.join("")}amix=inputs=${mixIn.length}:normalize=0:duration=longest,atrim=0:${T},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", chain.join(";"), "-map", "[a]", "-c:a", "pcm_s16le", out]);
  if (r.status !== 0) throw new Error("ffmpeg trộn âm thanh lỗi: " + String(r.stderr).slice(-600));
  return out;
}

export function probeDur(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(String(r.stdout).trim()) || 0;
}
