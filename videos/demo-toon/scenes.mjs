// Hình cho hoạt hình kiểu OverSimplified (format: toon).
// Bộ công cụ `k`: xem docs/toon-guide.md.

export default function (k) {
  const { at, S, fx, A, T, PAPER } = k;

  // Cảnh 1: Hoàng đế tiêu sạch tiền (nền kraft, xuất hiện ngai vàng và túi rỗng)
  k.scene("c1", `<svg viewBox="0 0 1920 1080" width="1920" height="1080">
    <rect width="1920" height="1080" fill="${PAPER}"/>
    <text x="960" y="300" text-anchor="middle" font-size="64" font-family="sans-serif" font-weight="900" fill="#1e293b">ĐẾ CHẾ LA MÃ - NĂM 270</text>
  </svg>`, { at: 0, trans: "fade" });

  // Cảnh 2: Trộn đồng vào tiền bạc
  k.scene("c2", `<svg viewBox="0 0 1920 1080" width="1920" height="1080">
    <rect width="1920" height="1080" fill="${PAPER}"/>
    <text x="960" y="250" text-anchor="middle" font-size="54" font-weight="bold" fill="#b45309">KẾ HOẠCH BÍ MẬT CỦA HOÀNG ĐẾ</text>
  </svg>`, { at: S[1], trans: "whip" });

  // Cảnh 3: Punch-in gag khi giá bánh mì tăng vọt
  k.scene("c3", `<svg viewBox="0 0 1920 1080" width="1920" height="1080">
    <rect width="1920" height="1080" fill="${PAPER}"/>
    <circle cx="960" cy="540" r="300" fill="#fee2e2" stroke="#ef4444" stroke-width="8"/>
    <text x="960" y="480" text-anchor="middle" font-size="80" font-weight="900" fill="#dc2626">BÁNH MÌ: 10 ĐỒNG!</text>
    <text x="960" y="580" text-anchor="middle" font-size="44" fill="#1e293b">(Hôm qua: 1 đồng)</text>
  </svg>`, { at: S[2], trans: "slam" });

  // Thẻ kết thúc
  k.scene("end", k.endCard({
    title: "Lịch Sử Lạm Phát Cổ Đại",
    disclaimer: "Nội dung giáo dục lịch sử, minh họa trào lộng. Hình ảnh mang tính biểu trưng."
  }), { at: S.at(-1) - 0.05, trans: "iris", z: 850, drift: false });

  k.captionsUntil(S.at(-1) - 0.1);
}

