// Tiện ích dùng chung cho video 3D. Mọi chuyển động là hàm thuần tuý của thời gian t (giây) trên dòng thời gian chính:
// cùng một t luôn cho cùng một khung hình, nên render từng khung không phụ thuộc tốc độ máy.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const deg = (d) => (d * Math.PI) / 180;

// Tiến độ 0→1 của khoảng [a, a + d]
export const prog = (t, a, d) => clamp((t - a) / d);

export const ease = {
  linear: (k) => k,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  in: (k) => k * k * k,
  back: (k) => {
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  },
  elastic: (k) => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

// Tiến độ có easing của khoảng [a, a + d]
export const ep = (t, a, d, fn = ease.inOut) => fn(prog(t, a, d));

// Số ngẫu nhiên có seed (mulberry32) — chỉ dùng lúc dựng cảnh, không dùng trong update(t)
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Dao động mượt, tất định
export const wave = (t, period = 2, phase = 0) => Math.sin(((t + phase) / period) * Math.PI * 2);
