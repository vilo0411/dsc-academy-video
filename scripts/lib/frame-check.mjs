// Kiểm tra khung hình có bị model vẽ thêm viền/dải trống (letterbox, dải màu phẳng ở mép) không.
// Không bắt được dải chỉ tối/nhạt hơn một chút; những lỗi đó vẫn cần xem bằng mắt.
// Đọc ảnh thu nhỏ dạng xám qua ffmpeg, không cần thư viện ngoài.
import { execFileSync } from "node:child_process";

const W = 160;
const H = 90;

function gray(file) {
  return execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: W * H * 2 });
}

const rowStats = (px, y) => {
  let sum = 0;
  let sq = 0;
  for (let x = 0; x < W; x++) {
    const v = px[y * W + x];
    sum += v;
    sq += v * v;
  }
  const mean = sum / W;
  return { mean, sd: Math.sqrt(Math.max(0, sq / W - mean * mean)) };
};

// Trả về danh sách lỗi (rỗng nếu ảnh ổn).
export function checkFrame(file) {
  const px = gray(file);
  const rows = Array.from({ length: H }, (_, y) => rowStats(px, y));
  const problems = [];

  // Dải phẳng ở mép trên/dưới: nhiều hàng liền nhau gần như một màu.
  const flatRun = (ys) => {
    let n = 0;
    for (const y of ys) {
      if (rows[y].sd < 7) n++;
      else break;
    }
    return n / H;
  };
  const top = flatRun([...Array(H).keys()]);
  const bottom = flatRun([...Array(H).keys()].reverse());
  if (top > 0.06) problems.push(`dải phẳng ở mép trên (${Math.round(top * 100)}% chiều cao)`);
  if (bottom > 0.06) problems.push(`dải phẳng ở mép dưới (${Math.round(bottom * 100)}% chiều cao)`);

  // Viền kiểu khung phim: đường cắt rõ trên gần như mọi cột ở cả 15% trên lẫn 15% dưới. Một đường cắt đơn lẻ
  // không tính, vì mép bàn hay mép trần trong tranh cũng tạo đường như vậy.
  const seam = (y) => {
    let changed = 0;
    let sign = 0;
    for (let x = 0; x < W; x++) {
      const d = px[(y + 1) * W + x] - px[y * W + x];
      if (Math.abs(d) > 12) changed++;
      sign += Math.sign(d);
    }
    return changed / W > 0.95 && Math.abs(sign) / W > 0.95;
  };
  const edge = Math.round(H * 0.15);
  const seamTop = [...Array(edge).keys()].slice(1).some(seam);
  const seamBottom = [...Array(edge).keys()].slice(1).some((i) => seam(H - 2 - i));
  if (seamTop && seamBottom) problems.push("viền trên dưới kiểu khung phim");
  return problems;
}
