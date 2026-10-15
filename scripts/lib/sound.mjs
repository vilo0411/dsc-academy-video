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

// Chuỗi nốt chuông (sine + hoạ âm, tắt dần): notes Hz, step giây giữa các nốt, ring giây ngân.
function arpeggio(notes, step, ring) {
  const n = Math.floor((step * notes.length + ring) * SR), out = new Float32Array(n);
  notes.forEach((f, i) => {
    const i0 = Math.floor(i * step * SR);
    for (let k = 0; i0 + k < n; k++) {
      const t = k / SR;
      out[i0 + k] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 8)) * Math.exp(-t * (3.2 / ring)) * Math.min(1, t / 0.003) * 0.5;
    }
  });
  return out;
}
function concatMix(a, b, offset) {
  const o = Math.floor(offset), out = new Float32Array(Math.max(a.length, o + b.length));
  out.set(a);
  for (let k = 0; k < b.length; k++) out[o + k] += b[k];
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
  // ---- Bộ tiếng vui nhộn (sfxSet "playful") ----
  // "pop": bong bóng/nút bật — sine trượt cao xuống nhanh
  pop(r) {
    const n = Math.floor(0.12 * SR), out = new Float32Array(n);
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      const f = 380 + 900 * Math.exp(-t * 45);
      ph += (2 * Math.PI * f) / SR;
      out[k] = Math.sin(ph) * Math.exp(-t * 32) * Math.min(1, t / 0.002);
    }
    return out;
  },
  // "swish": vút nhanh, sáng hơn whoosh
  swish(r) {
    const n = Math.floor(0.28 * SR);
    const s = sweepBP(r, n, 1200, 7000, 2.2);
    for (let k = 0; k < n; k++) { const u = k / n; s[k] *= Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 2) * 3.2; }
    return s;
  },
  // "ding": chuông nhỏ — hai hoạ âm, ngân ngắn
  ding(r) {
    const n = Math.floor(0.9 * SR), out = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      out[k] = (Math.sin(2 * Math.PI * 1568 * t) * 0.6 + Math.sin(2 * Math.PI * 3920 * t) * 0.25 * Math.exp(-t * 6)) * Math.exp(-t * 4.5) * Math.min(1, t / 0.003);
    }
    return out;
  },
  // "snap": búng tay
  snap(r) {
    const n = Math.floor(0.06 * SR), out = new Float32Array(n);
    const bp = biquad("bp", 2200, 1.5);
    for (let k = 0; k < n; k++) { const t = k / SR; out[k] = bp(r()) * Math.exp(-t * 140) * 4; }
    return out;
  },
  // "riser": cao dần trước điểm nhấn (0,8s)
  riser(r, dur = 0.8) {
    const n = Math.floor(dur * SR);
    const s = sweepBP(r, n, 400, 5000, 4);
    for (let k = 0; k < n; k++) s[k] *= Math.pow(k / n, 2) * 3;
    return s;
  },
  // "boing": lò xo hoạt hình — sine trượt lên rồi rung tần số tắt dần
  boing(r) {
    const n = Math.floor(0.6 * SR), out = new Float32Array(n);
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      const f = 180 + 160 * (1 - Math.exp(-t * 18)) + 70 * Math.sin(2 * Math.PI * 14 * t) * Math.exp(-t * 4);
      ph += (2 * Math.PI * f) / SR;
      out[k] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.exp(-t * 5) * Math.min(1, t / 0.004);
    }
    return out;
  },
  // "scratch": cào đĩa — nhiễu dải hẹp trượt lên xuống hai lần
  scratch(r) {
    const n = Math.floor(0.36 * SR), out = new Float32Array(n);
    let low = 0, band = 0;
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const fc = 500 + 2600 * Math.abs(Math.sin(Math.PI * 2 * u));
      const f = 2 * Math.sin((Math.PI * fc) / SR);
      low += f * band;
      band += f * (r() - low - 0.25 * band);
      out[k] = band * 0.35 * Math.sin(Math.PI * u);
    }
    return out;
  },
  // ---- Bộ tiếng tin tức / công nghệ (sfxSet "news") ----
  // "blip": nút giao diện — sine ngắn hai nốt
  blip(r) {
    const n = Math.floor(0.11 * SR), out = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const t = k / SR, f = t < 0.045 ? 1320 : 1760;
      out[k] = Math.sin(2 * Math.PI * f * t) * Math.exp(-((t % 0.045) * 60)) * Math.min(1, t / 0.002);
    }
    return out;
  },
  // "tock": gõ gỗ/đồng hồ
  tock(r) {
    const n = Math.floor(0.12 * SR), out = new Float32Array(n);
    const bp = biquad("bp", 900, 4);
    for (let k = 0; k < n; k++) { const t = k / SR; out[k] = (bp(r()) * 3 + Math.sin(2 * Math.PI * 620 * t) * 0.6) * Math.exp(-t * 70); }
    return out;
  },
  // "glitch": nhiễu số ngắn, lượng tử hoá thô
  glitch(r) {
    const n = Math.floor(0.18 * SR), out = new Float32Array(n);
    const hp = biquad("hp", 600);
    let hold = 0;
    for (let k = 0; k < n; k++) {
      if (k % 220 === 0) hold = Math.abs(r()) > 0.5 ? r() : 0;
      out[k] = Math.round(hp(hold + r() * 0.3) * 6) / 6 * Math.sin(Math.PI * (k / n)) * 1.4;
    }
    return out;
  },
  // ---- Stinger tổng hợp (cũng dùng được như tiếng động) ----
  // "chime": chuỗi ba nốt chuông đi lên (mở đầu/logo)
  chime(r) { return arpeggio([784, 988, 1175, 1568], 0.11, 1.6); },
  // "reveal": quiz lộ đáp án — riser ngắn + hai nốt sáng
  reveal(r) {
    const a = sweepBP(r, Math.floor(0.45 * SR), 500, 4200, 3);
    for (let k = 0; k < a.length; k++) a[k] *= Math.pow(k / a.length, 2) * 2.2;
    return concatMix(a, arpeggio([1047, 1568], 0.09, 1.0), 0.42 * SR);
  },
  // "success": "đúng rồi" — ba nốt trưởng nhanh
  success(r) { return arpeggio([659, 831, 988, 1319], 0.07, 1.1); },
  // "outro": hợp âm ngân dịu để kết
  outro(r) {
    const n = Math.floor(2.4 * SR), out = new Float32Array(n);
    const fs_ = [392, 494, 587, 784];
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      let v = 0;
      fs_.forEach((f, i) => (v += Math.sin(2 * Math.PI * f * t + i) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.7 * t + i))));
      out[k] = (v / fs_.length) * Math.min(1, t / 0.25) * Math.exp(-t * 1.3);
    }
    return out;
  },
};
const GAIN = { blip: 0.16, tock: 0.2, glitch: 0.1, chime: 0.3, reveal: 0.3, success: 0.3, outro: 0.35, boing: 0.3, scratch: 0.3, pop: 0.28, swish: 0.16, ding: 0.12, snap: 0.25, riser: 0.1, slide: 0.16, tap: 0.22, stamp: 0.55, tape: 0.12, key: 0.07, tick: 0.09, hit: 0.5, whoosh: 0.14, zip: 0.07, pen: 0.06 };

export const SOUND_KINDS = Object.keys(SOUNDS);

// Bộ tiếng động: builder phát theo tên tiếng gốc (bộ "paper" của essay), kịch bản đổi cả bộ bằng "sfxSet".
// Mỗi bộ ánh xạ tên gốc → tiếng thay thế; tên không có trong bảng giữ nguyên, null = bỏ tiếng đó.
export const SFX_SETS = {
  paper: {},
  playful: { slide: "swish", tap: "pop", stamp: "tock", tape: "snap", whoosh: "swish", zip: "swish", hit: "boing", tick: "pop", key: "pop" },
  news: { slide: "blip", tap: "tock", stamp: "hit", tape: "glitch", whoosh: "glitch", zip: "blip", pen: "blip", tick: "tock", pop: "blip", ding: "success", boing: "blip", scratch: "glitch" },
  soft: { stamp: "tap", hit: null, whoosh: "slide", zip: null, tape: "slide", boing: "pop", scratch: "swish" },
  none: null,
};
export function applySfxSet(events, set) {
  if (!set) return events;
  if (!(set in SFX_SETS)) throw new Error(`sfxSet "${set}" không có (${Object.keys(SFX_SETS).join(", ")})`);
  const m = SFX_SETS[set];
  if (!m) return [];
  return events.flatMap((e) => (!(e.kind in m) ? [e] : m[e.kind] ? [{ ...e, kind: m[e.kind] }] : []));
}

// Tiếng động từ thư viện: kind "lib:<id>" → giải mã file sang mono SR (cache theo đường dẫn).
const libCache = new Map();
let libResolver = null;
export const setLibResolver = (fn) => (libResolver = fn);
function libSound(kind) {
  if (libCache.has(kind)) return libCache.get(kind);
  const file = libResolver?.(kind.slice(4));
  let s = null;
  if (file) {
    const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
    if (r.status === 0) s = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  }
  libCache.set(kind, s);
  return s;
}

// ---------- Quy chuẩn tiếng động: lọc trước khi tổng hợp để tiếng động không dày đặc, không lặp ----------
// Mỗi hiệu ứng tự gắn tiếng của nó (pop khi vật hiện, tick mỗi bước bộ đếm, key mỗi từ chữ động…), nên cộng lại rất dày.
// Phân cấp: 1 = nhịp chính (chuyển cảnh, gag, tiếng cao dần) luôn giữ; 2 = vật chính xuất hiện, con dấu, cú đập: giữ khi còn chỗ;
// 3 = trang trí (tick, key, bút…): một chuỗi liền nhau chỉ giữ tiếng đầu, và cũng phải còn chỗ.
// Cấp mặc định theo loại tiếng; hiệu ứng có thể ghi đè bằng e.prio (chuyển cảnh và gag của toon đặt prio 1).
export const SFX_PRIO = { riser: 1, scratch: 1, whoosh: 2, slide: 2, swish: 2, stamp: 2, hit: 2, boing: 2, pop: 2, tap: 2, snap: 2, ding: 2, tick: 3, key: 3, pen: 3, zip: 3, tape: 3 };
export const SFX_RULES = {
  minGap: 0.9, // giây giữa hai tiếng bất kỳ (trừ cấp 1)
  sameGap: 1.6, // cùng một tiếng không lặp lại trong khoảng này (kể cả cấp 1)
  burst: 0.35, // tiếng cấp 3 cách nhau ít hơn thế là cùng một chuỗi (bộ đếm, chữ hiện từng từ)
  yield: 0.3, // tiếng cấp 2–3 nằm trong khoảng này trước một tiếng cấp 1 thì nhường
};
export function sfxBudget(events, rules = {}) {
  const R = { ...SFX_RULES, ...rules };
  const ev = events.map((e) => ({ ...e, prio: e.prio ?? SFX_PRIO[e.kind] ?? 2 })).sort((a, b) => a.t - b.t);
  const kept = [];
  let lastBurst = -Infinity;
  for (const e of ev) {
    if (e.prio === 3) {
      const inBurst = e.t - lastBurst < R.burst;
      lastBurst = e.t;
      if (inBurst) continue; // chỉ tiếng đầu của chuỗi
    }
    const sameRecent = kept.some((k) => k.kind === e.kind && e.t - k.t < R.sameGap);
    if (e.prio === 1) {
      if (sameRecent && kept.some((k) => k.kind === e.kind && e.t - k.t < 0.25)) continue; // trùng hẳn
      // tiếng phụ ngay trước nhịp chính thì nhường
      for (let i = kept.length - 1; i >= 0 && e.t - kept[i].t < R.yield; i--) if (kept[i].prio > 1) kept.splice(i, 1);
      kept.push(e);
      continue;
    }
    const near = kept.some((k) => e.t - k.t < R.minGap);
    if (near || sameRecent) continue;
    kept.push(e);
  }
  return kept;
}

// events: [{ t, kind, dur? }] → Buffer WAV 16-bit mono. kind là tên trong SOUNDS hoặc "lib:<id>".
export function synthSfx(events, total) {
  const out = new Float32Array(Math.ceil((total + 1.5) * SR));
  events.forEach((e, i) => {
    const isLib = e.kind?.startsWith("lib:");
    const fn = isLib ? () => libSound(e.kind) : SOUNDS[e.kind];
    if (!fn) return;
    const r = rng(1000 + i * 7919);
    let s = fn(r, e.dur);
    if (!s) return;
    // Mỗi lần phát lệch cao độ ±6% (đổi tốc độ đọc mẫu) để tiếng lặp lại không giống hệt nhau
    if (!isLib && e.vary !== false) {
      const rate = 1 + 0.06 * r();
      const n = Math.floor(s.length / rate), v = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const x = k * rate, k0 = Math.floor(x), f = x - k0;
        v[k] = (s[k0] || 0) * (1 - f) + (s[k0 + 1] || 0) * f;
      }
      s = v;
    }
    const g = (isLib ? 0.5 : GAIN[e.kind] || 0.1) * (e.gain ?? 1) * (0.85 + 0.15 * Math.abs(r()));
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

// Trộn: giọng (tuỳ chọn) + tiếng động + nhạc nền (tuỳ chọn, lặp có crossfade) + ambience (beds) + stinger (hits).
// Nhạc và ambience tự hạ khi có lời; stinger không bị hạ.
// beds: [{ file, start, end, vol }] — lặp cho đủ đoạn, fade 0,8 s hai đầu. hits: [{ file, t, vol }].
// loudness: mục tiêu LUFS (mặc định -16; YouTube chuẩn hoá về -14 và chỉ hạ, không tăng).
// v2 ("mix": "v2" trong kịch bản, mặc định tắt để video cũ dựng lại không đổi):
//   giọng: lọc ù < 70 Hz, nén nhẹ 2,5:1, khử xì (deesser)
//   nhạc + ambience: cắt trầm < 80 Hz (loa điện thoại), khoét -4 dB quanh 3 kHz để chừa chỗ cho giọng
//   hush: [{ t0, t1 }] — hạ nhạc còn 15% (ramp 0,3 s) ngay trước câu chốt: khoảng lặng có chủ đích
export const LOUDNESS = -16;
export function mixdown({ voice, sfx, music, total, out, musicVol = 1.5, sfxVol = 1.0, duck = {}, beds = [], hits = [], loudness = LOUDNESS, v2 = false, hush = [] }) {
  const inputs = [], chain = [], mixIn = [], bg = [];
  let idx = 0;
  const T = total.toFixed(3);
  const ms = (t) => Math.max(0, Math.round(t * 1000));
  const st = "aresample=48000,aformat=channel_layouts=stereo";
  let vLabel = null;
  if (voice) {
    inputs.push("-i", voice);
    const vfx = v2 ? "highpass=f=70,acompressor=threshold=0.125:ratio=2.5:attack=8:release=120:makeup=1.3,deesser=i=0.35," : "";
    chain.push(`[${idx}:a]${st},${vfx}apad,atrim=0:${T},asplit=2[vmix][vkey]`);
    vLabel = "[vmix]";
    idx++;
  }
  if (sfx) {
    inputs.push("-i", sfx);
    chain.push(`[${idx}:a]${st},volume=${sfxVol},apad,atrim=0:${T}[fx]`);
    mixIn.push("[fx]");
    idx++;
  }
  if (music) {
    const md = probeDur(music);
    const xf = 2.5;
    const copies = Math.max(1, Math.ceil((total + 1) / Math.max(1, md - xf)));
    // Lặp nhạc: nạp file nhiều lần (asplit + acrossfade dễ làm ffmpeg cắt cụt), nối bằng crossfade.
    const first = idx;
    for (let k = 0; k < copies; k++) inputs.push("-i", music);
    idx += copies;
    if (copies === 1) chain.push(`[${first}:a]${st}[mloop]`);
    else {
      for (let k = 0; k < copies; k++) chain.push(`[${first + k}:a]${st}[mc${k}]`);
      let prev = "[mc0]";
      for (let k = 1; k < copies; k++) {
        const lab = k === copies - 1 ? "[mloop]" : `[mx${k}]`;
        chain.push(`${prev}[mc${k}]acrossfade=d=${xf}:c1=qsin:c2=qsin${lab}`);
        prev = lab;
      }
    }
    chain.push(`[mloop]apad,atrim=0:${T},volume=${musicVol},afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, total - 3).toFixed(2)}:d=3[mus]`);
    bg.push("[mus]");
  }
  beds.forEach((b, k) => {
    const d = Math.max(0.5, Math.min(b.end, total) - b.start);
    const fd = Math.min(0.8, d / 3);
    inputs.push("-stream_loop", "-1", "-i", b.file);
    chain.push(`[${idx}:a]${st},atrim=0:${d.toFixed(3)},asetpts=PTS-STARTPTS,volume=${b.vol ?? 1},afade=t=in:d=${fd.toFixed(2)},afade=t=out:st=${(d - fd).toFixed(3)}:d=${fd.toFixed(2)},adelay=${ms(b.start)}:all=1,apad,atrim=0:${T}[bed${k}]`);
    bg.push(`[bed${k}]`);
    idx++;
  });
  hits.forEach((h, k) => {
    inputs.push("-i", h.file);
    chain.push(`[${idx}:a]${st},volume=${h.vol ?? 1},adelay=${ms(h.t)}:all=1,apad,atrim=0:${T}[hit${k}]`);
    mixIn.push(`[hit${k}]`);
    idx++;
  });
  if (bg.length) {
    if (bg.length > 1) chain.push(`${bg.join("")}amix=inputs=${bg.length}:normalize=0:duration=longest[bgall]`);
    let bgl = bg.length > 1 ? "[bgall]" : bg[0];
    if (v2) {
      // Khoảng lặng: hệ số 1 → 0,15 trong [t0, t1], dốc 0,3 s hai đầu
      const ramp = (t0, t1) => `(1-0.85*clip((t-${(t0 - 0.3).toFixed(2)})/0.3,0,1)*clip((${(t1 + 0.3).toFixed(2)}-t)/0.3,0,1))`;
      const gain = hush.length ? `,volume='${hush.map((h) => ramp(h.t0, h.t1)).join("*")}':eval=frame` : "";
      chain.push(`${bgl}highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=-4${gain}[bgeq]`);
      bgl = "[bgeq]";
    }
    if (vLabel) {
      chain.push(`${bgl}[vkey]sidechaincompress=threshold=${duck.threshold ?? 0.03}:ratio=${duck.ratio ?? 4}:attack=${duck.attack ?? 40}:release=${duck.release ?? 700}:makeup=1[mduck]`);
      mixIn.push("[mduck]");
    } else mixIn.push(bgl);
  } else if (vLabel) chain.push(`[vkey]anullsink`);
  if (vLabel) mixIn.unshift(vLabel);
  if (!mixIn.length) throw new Error("mixdown: không có nguồn âm thanh nào");
  const pre = mixIn.length > 1 ? `${mixIn.join("")}amix=inputs=${mixIn.length}:normalize=0:duration=longest,` : `${mixIn[0]}`;
  chain.push(`${pre}${mixIn.length > 1 ? "" : "anull,"}atrim=0:${T},loudnorm=I=${loudness}:TP=-1.5:LRA=11,aresample=48000[a]`);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", chain.join(";"), "-map", "[a]", "-c:a", "pcm_s16le", out]);
  if (r.status !== 0) throw new Error("ffmpeg trộn âm thanh lỗi: " + String(r.stderr).slice(-600));
  return out;
}

export function probeDur(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(String(r.stdout).trim()) || 0;
}

// Một tiếng tổng hợp đứng riêng (để đưa stinger tổng hợp vào thư viện): Buffer WAV.
export function renderSound(kind, dur) {
  const s = SOUNDS[kind](rng(1000), dur);
  const out = new Float32Array(s.length + Math.floor(0.05 * SR));
  for (let k = 0; k < s.length; k++) out[k] = s[k] * (GAIN[kind] || 0.1) * 2;
  return wav16(out);
}

// Tuỳ chọn trộn lấy từ kịch bản: "loudness": -14, "mix": "v2", cảnh có "hush": true (nhạc lặng từ 0,4 s trước cảnh tới hết cảnh).
export function mixOpts(content, timings) {
  const o = {};
  if (content.loudness != null) o.loudness = content.loudness;
  if (content.mix === "v2") {
    o.v2 = true;
    o.hush = content.scenes
      .map((s, i) => s.hush && timings?.scenes?.[i] && { t0: Math.max(0, timings.scenes[i].start - 0.4), t1: timings.scenes[i].end })
      .filter(Boolean);
  }
  return o;
}
