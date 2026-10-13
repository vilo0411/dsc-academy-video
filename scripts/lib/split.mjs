import { readWav, findSilences } from "./wav.mjs";

// Chia file giọng đọc thành từng cảnh: chọn khoảng lặng gần nhất với vị trí dự kiến
// (tỉ lệ theo số chữ của mỗi cảnh), ưu tiên khoảng lặng dài.
export function splitScenes(wavBuf, scenes) {
  const { samples, sampleRate } = readWav(wavBuf);
  const total = samples.length / sampleRate;
  const silences = findSilences(samples, sampleRate);
  const lens = scenes.map((s) => s.text.length);
  const sumLen = lens.reduce((a, b) => a + b, 0);
  const cuts = [];
  const used = new Set();
  let acc = 0;
  for (let i = 0; i < lens.length - 1; i++) {
    acc += lens[i];
    const expected = (acc / sumLen) * total;
    let best = null;
    silences.forEach((sil, idx) => {
      if (used.has(idx)) return;
      const mid = (sil.start + sil.end) / 2;
      if (cuts.length && mid <= cuts.at(-1)) return;
      const score = Math.abs(mid - expected) - 0.6 * (sil.end - sil.start);
      if (!best || score < best.score) best = { score, idx, mid };
    });
    if (best && Math.abs(best.mid - expected) < 4) {
      used.add(best.idx);
      cuts.push(best.mid);
    } else {
      cuts.push(expected);
      console.warn(`Cảnh ${scenes[i].id}: không thấy khoảng lặng rõ, cắt theo ước lượng.`);
    }
  }
  const bounds = [0, ...cuts, total];
  return {
    duration: Number(total.toFixed(3)),
    scenes: scenes.map((s, i) => ({ id: s.id, start: Number(bounds[i].toFixed(3)), end: Number(bounds[i + 1].toFixed(3)) })),
  };
}
