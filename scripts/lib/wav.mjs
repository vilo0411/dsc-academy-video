// Tiện ích WAV tối giản, không cần thư viện ngoài.

export function pcmToWav(pcm, sampleRate = 24000, channels = 1, bits = 16) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bits) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Đọc WAV PCM 16-bit, trả về mẫu mono dạng số thực [-1, 1].
export function readWav(buf) {
  let off = 12;
  let fmt = null;
  let data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      fmt = {
        channels: buf.readUInt16LE(off + 10),
        sampleRate: buf.readUInt32LE(off + 12),
        bits: buf.readUInt16LE(off + 22),
      };
    } else if (id === "data") {
      data = buf.subarray(off + 8, off + 8 + size);
    }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("File WAV không hợp lệ");
  if (fmt.bits !== 16) throw new Error("Chỉ hỗ trợ WAV 16-bit");
  const frames = data.length / 2 / fmt.channels;
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) s += data.readInt16LE((i * fmt.channels + c) * 2);
    samples[i] = s / fmt.channels / 32768;
  }
  return { samples, sampleRate: fmt.sampleRate, duration: frames / fmt.sampleRate };
}

// Tìm các khoảng lặng (năng lượng thấp) dài hơn minDur giây.
export function findSilences(samples, sampleRate, { win = 0.02, minDur = 0.22, ratio = 0.08 } = {}) {
  const n = Math.floor(win * sampleRate);
  const rms = [];
  for (let i = 0; i + n <= samples.length; i += n) {
    let s = 0;
    for (let j = i; j < i + n; j++) s += samples[j] * samples[j];
    rms.push(Math.sqrt(s / n));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const thr = Math.max(loud * ratio, 0.003);
  const out = [];
  let start = null;
  rms.forEach((v, i) => {
    if (v < thr && start === null) start = i;
    if ((v >= thr || i === rms.length - 1) && start !== null) {
      const dur = (i - start) * win;
      if (dur >= minDur) out.push({ start: start * win, end: i * win });
      start = null;
    }
  });
  return out;
}
