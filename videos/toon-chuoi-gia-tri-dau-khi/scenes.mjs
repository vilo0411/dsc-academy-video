// Hình cho "Chuỗi giá trị ngành Dầu khí" (định dạng toon).
// Bộ công cụ `k`: xem docs/toon-guide.md.
// Thiết kế: Hook trực quan + Lược đồ Master Flow + Card thông tin sâu sắc, chuẩn infographic tài chính.

export default function (k) {
  const { at, S, fx, A, T, INK, PAPER, NAVY, TEAL, RED } = k;

  // Bảng màu chuẩn tài chính / infographic
  const BORDER_DARK = "#1e293b";
  const TEXT_MAIN = "#0f172a";
  const TEXT_SUB = "#334155";
  const CARD_BG = "#ffffff";
  const BLUE_DARK = "#1e3a8a";
  const TEAL_DARK = "#115e59";
  const AMBER_DARK = "#92400e";
  const GREEN_DARK = "#166534";
  const RED_DARK = "#991b1b";

  // Component Thẻ thông tin doanh nghiệp chi tiết (không bao giờ tràn text)
  const infoCard = (id, x, y, { ticker, badge, isListed, title, desc, tag, color = BLUE_DARK, tagBg = "#f1f5f9", tagColor = TEXT_MAIN }) => `
    <g id="${id}" opacity="0" transform="translate(${x} ${y})" data-layout-allow-overlap>
      <!-- Nền thẻ bóng đổ nhẹ -->
      <rect x="0" y="0" width="760" height="150" rx="16" fill="${CARD_BG}" stroke="${BORDER_DARK}" stroke-width="4"/>
      <!-- Thanh nhấn màu bên trái -->
      <path d="M 0 16 A 16 16 0 0 1 16 0 L 22 0 L 22 150 L 16 150 A 16 16 0 0 1 0 134 Z" fill="${color}"/>
      
      <!-- Hàng 1: Ticker + Badge niêm yết -->
      <text x="44" y="42" font-family="Inter" font-weight="900" font-size="30" fill="${color}">${ticker}</text>
      <rect x="180" y="18" width="${isListed ? 150 : 160}" height="32" rx="8" fill="${isListed ? "#eff6ff" : "#f1f5f9"}" stroke="${isListed ? "#3b82f6" : "#94a3b8"}" stroke-width="2"/>
      <text x="${180 + (isListed ? 75 : 80)}" y="39" font-family="Inter" font-weight="700" font-size="16" fill="${isListed ? "#1d4ed8" : "#475569"}" text-anchor="middle">${badge}</text>

      <!-- Hàng 2: Tên & Vai trò -->
      <text x="44" y="74" font-family="Inter" font-weight="800" font-size="20" fill="${TEXT_MAIN}">${title}</text>

      <!-- Hàng 3: Mô tả hoạt động kinh doanh -->
      <text x="44" y="102" font-family="Inter" font-weight="600" font-size="16" fill="${TEXT_SUB}">${desc}</text>

      <!-- Hàng 4: Tag điểm mấu chốt đầu tư -->
      <g transform="translate(44 116)">
        <rect x="0" y="0" width="670" height="24" rx="6" fill="${tagBg}"/>
        <text x="12" y="17" font-family="Inter" font-weight="700" font-size="14" fill="${tagColor}">💡 ${tag}</text>
      </g>
    </g>
  `;

  // Component Hộp phân tích cơ chế tài chính (Insight Box)
  const insightBox = (id, x, y, { title, bullet1, bullet2, color = "#78350f", bg = "#fffbeb" }) => `
    <g id="${id}" opacity="0" transform="translate(${x} ${y})" data-layout-allow-overlap>
      <rect x="0" y="0" width="760" height="150" rx="16" fill="${bg}" stroke="${color}" stroke-width="4"/>
      <rect x="24" y="-18" width="340" height="36" rx="8" fill="${color}"/>
      <text x="194" y="6" font-family="Inter" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle">${title}</text>

      <text x="32" y="60" font-family="Inter" font-weight="700" font-size="18" fill="${color}">${bullet1}</text>
      <text x="32" y="105" font-family="Inter" font-weight="700" font-size="18" fill="${color}">${bullet2}</text>
    </g>
  `;

  // ==========================================
  // CẢNH 1: THE HOOK (Chiếc xe máy, cây xăng, 50.000đ & câu hỏi nghịch lý)
  // ==========================================
  const hookSVG = `
    <svg viewBox="0 0 1920 1080" width="1920" height="1080" style="background: ${PAPER};">
      <!-- Nền phố xá cây xăng -->
      <rect width="1920" height="1080" fill="${PAPER}"/>
      <line x1="0" y1="880" x2="1920" y2="880" stroke="${BORDER_DARK}" stroke-width="8"/>

      <!-- Tiêu đề mở đầu kịch tính -->
      <g id="hook-title" opacity="0" transform="translate(960 120)">
        <rect x="-480" y="-45" width="960" height="90" rx="20" fill="${RED_DARK}" stroke="${BORDER_DARK}" stroke-width="5"/>
        <text x="0" y="12" font-family="Inter" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" letter-spacing="1">50.000 ĐỒNG ĐỔ XĂNG CHẠY VỀ TÚI AI?</text>
      </g>

      <!-- Minh hoạ Trụ bơm xăng bên trái -->
      <g id="hook-pump" transform="translate(360 520)">
        <rect x="-100" y="-220" width="200" height="420" rx="22" fill="#ef4444" stroke="${BORDER_DARK}" stroke-width="8"/>
        <!-- Màn hình điện tử -->
        <rect x="-70" y="-180" width="140" height="100" rx="10" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="5"/>
        <text x="0" y="-140" font-family="Inter" font-weight="900" font-size="20" fill="#15803d" text-anchor="middle">XĂNG RON 95</text>
        <text x="0" y="-105" font-family="Inter" font-weight="900" font-size="26" fill="#b91c1c" text-anchor="middle">50.000 đ</text>
        <!-- Vòi bơm xăng -->
        <path d="M80 -50 Q160 -50 180 80 Q190 180 230 180" fill="none" stroke="${BORDER_DARK}" stroke-width="12" stroke-linecap="round"/>
        <rect x="210" y="160" width="50" height="30" rx="6" fill="#334155" stroke="${BORDER_DARK}" stroke-width="4"/>
      </g>

      <!-- Minh hoạ Bình xăng xe máy -->
      <g id="hook-bike" transform="translate(700 700)">
        <ellipse cx="0" cy="0" rx="140" ry="80" fill="#3b82f6" stroke="${BORDER_DARK}" stroke-width="8"/>
        <circle cx="20" cy="-45" r="28" fill="#cbd5e1" stroke="${BORDER_DARK}" stroke-width="6"/>
        <text x="0" y="15" font-family="Inter" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">BÌNH XĂNG</text>
      </g>

      <!-- Tờ tiền 50k bay ra chia 3 dòng chảy -->
      <g id="hook-bill" opacity="0" transform="translate(960 480)">
        <rect x="-140" y="-70" width="280" height="140" rx="12" fill="#f472b6" stroke="${BORDER_DARK}" stroke-width="6"/>
        <circle cx="0" cy="0" r="40" fill="#fbcfe8" stroke="${BORDER_DARK}" stroke-width="4"/>
        <text x="0" y="10" font-family="Inter" font-weight="900" font-size="26" fill="#831843" text-anchor="middle">50.000 VNĐ</text>
      </g>

      <!-- 3 Mũi tên phân bổ dòng tiền -->
      <g id="hook-split-1" opacity="0" transform="translate(1380 290)" data-layout-allow-overlap>
        <rect x="-240" y="-35" width="480" height="70" rx="14" fill="#ffffff" stroke="${BLUE_DARK}" stroke-width="4" data-layout-allow-overlap/>
        <text x="-210" y="8" font-family="Inter" font-weight="900" font-size="22" fill="${BLUE_DARK}" data-layout-allow-overlap>⚓ Thợ khoan biển sâu (PVD, PVS)?</text>
      </g>
      <g id="hook-split-2" opacity="0" transform="translate(1380 430)" data-layout-allow-overlap>
        <rect x="-240" y="-35" width="480" height="70" rx="14" fill="#ffffff" stroke="${TEAL_DARK}" stroke-width="4" data-layout-allow-overlap/>
        <text x="-210" y="8" font-family="Inter" font-weight="900" font-size="22" fill="${TEAL_DARK}" data-layout-allow-overlap>🚢 Tàu chở dầu & Đường ống (GAS, PVT)?</text>
      </g>
      <g id="hook-split-3" opacity="0" transform="translate(1380 570)" data-layout-allow-overlap>
        <rect x="-240" y="-35" width="480" height="70" rx="14" fill="#ffffff" stroke="${AMBER_DARK}" stroke-width="4" data-layout-allow-overlap/>
        <text x="-210" y="8" font-family="Inter" font-weight="900" font-size="22" fill="${AMBER_DARK}" data-layout-allow-overlap>🏭 Nhà máy lọc dầu & Cây xăng (BSR, PLX)?</text>
      </g>

      <!-- Nghịch lý giá dầu tăng -->
      <g id="hook-paradox" opacity="0" transform="translate(1380 730)" data-layout-allow-overlap>
        <rect x="-260" y="-45" width="520" height="90" rx="16" fill="#fef2f2" stroke="${RED_DARK}" stroke-width="5" data-layout-allow-overlap/>
        <text x="0" y="-8" font-family="Inter" font-weight="900" font-size="22" fill="${RED_DARK}" text-anchor="middle" data-layout-allow-overlap>GIÁ DẦU TĂNG VỌT: TẠI SAO</text>
        <text x="0" y="24" font-family="Inter" font-weight="800" font-size="20" fill="#7f1d1d" text-anchor="middle" data-layout-allow-overlap>Có mã tăng trần, có mã lại đứng im?</text>
      </g>
    </svg>
  `;
  k.scene("hook", hookSVG, { at: 0 });

  // Hoạt cảnh Cảnh 1
  fx.pop("#hook-title", S[0] + 0.3);
  fx.pop("#hook-bill", at(0, "năm") - 0.2, { from: 0.4 });
  fx.pop("#hook-split-1", at(0, "khoan") - 0.2, { from: 0.6 });
  fx.pop("#hook-split-2", at(0, "tàu") - 0.2, { from: 0.6 });
  fx.pop("#hook-split-3", at(0, "máy") - 0.2, { from: 0.6 });
  fx.pop("#hook-paradox", at(0, "tăng", 1) - 0.2, { from: 0.6 });

  // ==========================================
  // CẢNH 2: TỔNG QUAN CHUỖI GIÁ TRỊ (Bản đồ 3 mắt xích năng lượng)
  // ==========================================
  const overviewSVG = `
    <svg viewBox="0 0 1920 1080" width="1920" height="1080" style="background: ${PAPER};">
      <rect width="1920" height="1080" fill="${PAPER}"/>
      
      <!-- Tiêu đề lớn -->
      <g id="ov-title" opacity="0" transform="translate(960 110)">
        <rect x="-420" y="-40" width="840" height="80" rx="18" fill="${NAVY}" stroke="${BORDER_DARK}" stroke-width="4"/>
        <text x="0" y="12" font-family="Inter" font-weight="900" font-size="32" fill="#ffffff" text-anchor="middle" letter-spacing="1">CẤU TRÚC 3 MẮT XÍCH CHUỖI GIÁ TRỊ</text>
      </g>

      <!-- 3 Khối lớn -->
      <!-- Khối 1: Thượng nguồn -->
      <g id="ov-block-1" opacity="0" transform="translate(360 520)">
        <rect x="-240" y="-280" width="480" height="560" rx="24" fill="#eff6ff" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="-210" y="-250" width="420" height="70" rx="14" fill="${BLUE_DARK}"/>
        <text x="0" y="-206" font-family="Inter" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">1. THƯỢNG NGUỒN</text>
        <text x="0" y="-150" font-family="Inter" font-weight="800" font-size="22" fill="${BLUE_DARK}" text-anchor="middle">Thăm dò & Khai thác</text>
        <circle cx="0" cy="-40" r="70" fill="#dbeafe" stroke="${BLUE_DARK}" stroke-width="4"/>
        <text x="0" y="-28" font-family="Inter" font-weight="900" font-size="44" fill="${BLUE_DARK}" text-anchor="middle">⚓</text>
        <rect x="-180" y="60" width="360" height="160" rx="14" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="0" y="105" font-family="Inter" font-weight="800" font-size="20" fill="${TEXT_MAIN}" text-anchor="middle">Chủ mỏ: PVEP, Vietsovpetro</text>
        <text x="0" y="145" font-family="Inter" font-weight="800" font-size="20" fill="${BLUE_DARK}" text-anchor="middle">Dịch vụ: PVD, PVS</text>
        <text x="0" y="185" font-family="Inter" font-weight="600" font-size="16" fill="${TEXT_SUB}" text-anchor="middle">⏱ Độ trễ hợp đồng 6-12 tháng</text>
      </g>

      <!-- Khối 2: Trung nguồn -->
      <g id="ov-block-2" opacity="0" transform="translate(960 520)">
        <rect x="-240" y="-280" width="480" height="560" rx="24" fill="#f0fdfa" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="-210" y="-250" width="420" height="70" rx="14" fill="${TEAL_DARK}"/>
        <text x="0" y="-206" font-family="Inter" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">2. TRUNG NGUỒN</text>
        <text x="0" y="-150" font-family="Inter" font-weight="800" font-size="22" fill="${TEAL_DARK}" text-anchor="middle">Vận chuyển & Lưu trữ</text>
        <circle cx="0" cy="-40" r="70" fill="#ccfbf1" stroke="${TEAL_DARK}" stroke-width="4"/>
        <text x="0" y="-28" font-family="Inter" font-weight="900" font-size="44" fill="${TEAL_DARK}" text-anchor="middle">🚢</text>
        <rect x="-180" y="60" width="360" height="160" rx="14" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="0" y="105" font-family="Inter" font-weight="800" font-size="20" fill="${TEXT_MAIN}" text-anchor="middle">Đường ống khí: GAS</text>
        <text x="0" y="145" font-family="Inter" font-weight="800" font-size="20" fill="${TEAL_DARK}" text-anchor="middle">Đội tàu vận tải biển: PVT</text>
        <text x="0" y="185" font-family="Inter" font-weight="600" font-size="16" fill="${TEXT_SUB}" text-anchor="middle">🛡 Thu cước phí & Dòng tiền đều</text>
      </g>

      <!-- Khối 3: Hạ nguồn -->
      <g id="ov-block-3" opacity="0" transform="translate(1560 520)">
        <rect x="-240" y="-280" width="480" height="560" rx="24" fill="#fffbeb" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="-210" y="-250" width="420" height="70" rx="14" fill="${AMBER_DARK}"/>
        <text x="0" y="-206" font-family="Inter" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">3. HẠ NGUỒN</text>
        <text x="0" y="-150" font-family="Inter" font-weight="800" font-size="22" fill="${AMBER_DARK}" text-anchor="middle">Lọc hóa dầu & Bán lẻ</text>
        <circle cx="0" cy="-40" r="70" fill="#fef3c7" stroke="${AMBER_DARK}" stroke-width="4"/>
        <text x="0" y="-28" font-family="Inter" font-weight="900" font-size="44" fill="${AMBER_DARK}" text-anchor="middle">🏭</text>
        <rect x="-180" y="60" width="360" height="160" rx="14" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="0" y="105" font-family="Inter" font-weight="800" font-size="20" fill="${TEXT_MAIN}" text-anchor="middle">Lọc dầu: BSR (Dung Quất)</text>
        <text x="0" y="145" font-family="Inter" font-weight="800" font-size="20" fill="${AMBER_DARK}" text-anchor="middle">Bán lẻ xăng dầu: PLX, OIL</text>
        <text x="0" y="185" font-family="Inter" font-weight="600" font-size="16" fill="${TEXT_SUB}" text-anchor="middle">📊 Biên lọc dầu Crack Spread</text>
      </g>

      <!-- Mũi tên kết nối liên hoàn -->
      <g id="ov-conn-1" opacity="0">
        <path d="M600 520 L720 520" stroke="${BORDER_DARK}" stroke-width="8" stroke-dasharray="12 10"/>
        <polygon points="720,505 750,520 720,535" fill="${BORDER_DARK}"/>
      </g>
      <g id="ov-conn-2" opacity="0">
        <path d="M1200 520 L1320 520" stroke="${BORDER_DARK}" stroke-width="8" stroke-dasharray="12 10"/>
        <polygon points="1320,505 1350,520 1320,535" fill="${BORDER_DARK}"/>
      </g>
    </svg>
  `;
  k.scene("overview", overviewSVG, { at: S[1], trans: "zoom" });
  fx.pop("#ov-title", S[1] + 0.2);
  fx.pop("#ov-block-1", at(1, "thượng") - 0.2, { from: 0.5 });
  fx.pop("#ov-block-2", at(1, "trung") - 0.2, { from: 0.5 });
  fx.pop("#ov-block-3", at(1, "hạ") - 0.2, { from: 0.5 });
  fx.show("#ov-conn-1", at(1, "trung") - 0.1);
  fx.show("#ov-conn-2", at(1, "hạ") - 0.1);

  // ==========================================
  // CẢNH 3 & 4: DEEP DIVE THƯỢNG NGUỒN (Upstream - Khoan & Khai thác ngoài khơi)
  // ==========================================
  const upstreamGraphic = `
    <!-- Biển sâu & Giàn khoan tự nâng PVD -->
    <g transform="translate(450 560)">
      <rect x="-350" y="-450" width="700" height="900" rx="24" fill="#eff6ff" stroke="${BORDER_DARK}" stroke-width="6"/>
      <rect x="-320" y="-420" width="640" height="60" rx="12" fill="${BLUE_DARK}"/>
      <text x="0" y="-380" font-family="Inter" font-weight="900" font-size="26" fill="#ffffff" text-anchor="middle">PHÂN KHÚC THƯỢNG NGUỒN (UPSTREAM)</text>

      <!-- Minh hoạ Giàn khoan chi tiết -->
      <g id="up-rig-anim" transform="translate(0 30)">
        <!-- 3 Chân giàn cắm xuống biển sâu -->
        <line x1="-140" y1="240" x2="-90" y2="20" stroke="${BORDER_DARK}" stroke-width="12"/>
        <line x1="140" y1="240" x2="90" y2="20" stroke="${BORDER_DARK}" stroke-width="12"/>
        <line x1="0" y1="240" x2="0" y2="20" stroke="${BORDER_DARK}" stroke-width="12"/>
        <line x1="-120" y1="120" x2="120" y2="120" stroke="${BORDER_DARK}" stroke-width="8"/>
        <!-- Sóng biển -->
        <path d="M-300 150 Q-200 120 -100 150 Q0 180 100 150 Q200 120 300 150" fill="none" stroke="#3b82f6" stroke-width="8" stroke-linecap="round"/>
        <!-- Sàn giàn khoan -->
        <rect x="-180" y="-30" width="360" height="50" rx="8" fill="#eab308" stroke="${BORDER_DARK}" stroke-width="8"/>
        <!-- Tháp khoan derrick -->
        <path d="M-60 -30 L-20 -240 L20 -240 L60 -30 Z" fill="#ea580c" stroke="${BORDER_DARK}" stroke-width="8"/>
        <line x1="-40" y1="-130" x2="40" y2="-130" stroke="${BORDER_DARK}" stroke-width="6"/>
        <!-- Ngọn lửa flare -->
        <circle cx="0" cy="-260" r="18" fill="#f97316"/>
        <circle cx="0" cy="-260" r="10" fill="#fde047"/>
        <!-- Tầng chứa dầu khí ngầm -->
        <rect x="-260" y="200" width="520" height="80" rx="14" fill="#1e293b" stroke="${BORDER_DARK}" stroke-width="5" data-layout-allow-overlap/>
        <text x="0" y="248" font-family="Inter" font-weight="900" font-size="22" fill="#e2e8f0" text-anchor="middle" data-layout-allow-overlap>MỎ DẦU THÔ & KHÍ TỰ NHIÊN DƯỚI ĐÁY BIỂN</text>
      </g>
    </g>
  `;

  const upstreamCards = `
    <!-- Cụm card bên phải (x: 1020, y: 120 -> 900) -->
    ${infoCard("card-pvep", 1020, 140, {
      ticker: "PVEP / VSP",
      badge: "○ Chưa niêm yết",
      isListed: false,
      color: "#475569",
      title: "Nhóm 1: Chủ sở hữu mỏ & Nhà thầu dầu khí",
      desc: "Tổng Công ty PVEP và Liên doanh Vietsovpetro sở hữu các mỏ tại Việt Nam",
      tag: "Nắm giữ tài nguyên mỏ, trực tiếp ký hợp đồng thuê dịch vụ kỹ thuật",
      tagBg: "#f8fafc",
      tagColor: "#334155",
    })}

    ${infoCard("card-pvd", 1020, 310, {
      ticker: "PVD",
      badge: "● Niêm yết HOSE",
      isListed: true,
      color: BLUE_DARK,
      title: "Nhóm 2: Khoan và Dịch vụ khoan Dầu khí",
      desc: "Vận hành đội giàn khoan tự nâng (Jack-up) phục vụ thăm dò & khai thác",
      tag: "Hưởng lợi trực tiếp khi giá thuê giàn (Day rate) và hiệu suất hoạt động tăng",
      tagBg: "#eff6ff",
      tagColor: BLUE_DARK,
    })}

    ${infoCard("card-pvs", 1020, 480, {
      ticker: "PVS",
      badge: "● Niêm yết HNX",
      isListed: true,
      color: "#0369a1",
      title: "Nhóm 2: Dịch vụ Kỹ thuật & Cơ khí Dầu khí Biển",
      desc: "Tổng thầu EPCI công trình dầu khí ngoài khơi, tàu FSO/FPSO & điện gió biển",
      tag: "Khối lượng công việc lớn từ các đại dự án phát triển mỏ khí như Lô B Ô Môn",
      tagBg: "#f0f9ff",
      tagColor: "#0369a1",
    })}

    ${insightBox("card-lag", 1020, 660, {
      title: "ĐẶC TRƯNG TÀI CHÍNH: ĐỘ TRỄ HỢP ĐỒNG",
      bullet1: "• Động lực: Giá dầu cao kích hoạt CAPEX & nhu cầu khoan mỏ mới.",
      bullet2: "• Độ trễ 6 - 12 tháng: Do thực hiện theo hợp đồng dài hạn ký trước.",
      color: "#78350f",
      bg: "#fffbeb",
    })}
  `;

  k.scene(
    "upstream",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="background: ${PAPER};">
      <rect width="1920" height="1080" fill="${PAPER}"/>
      ${upstreamGraphic}
      ${upstreamCards}
    </svg>`,
    { at: S[2], trans: "zoom" }
  );

  // Hoạt cảnh Thượng nguồn (Cảnh 3 & 4)
  fx.pop("#card-pvep", at(2, "pvep") - 0.2, { from: 0.6 });
  fx.pop("#card-pvd", at(2, "pvd") - 0.2, { from: 0.6 });
  fx.pop("#card-pvs", at(2, "pvs") - 0.2, { from: 0.6 });
  fx.slam("#card-lag", at(3, "độ") - 0.2);

  // ==========================================
  // CẢNH 5: DEEP DIVE TRUNG NGUỒN (Midstream - Vận chuyển & Lưu trữ)
  // ==========================================
  const midstreamGraphic = `
    <!-- Tàu chở dầu & Đường ống khí ngầm -->
    <g transform="translate(450 560)">
      <rect x="-350" y="-450" width="700" height="900" rx="24" fill="#f0fdfa" stroke="${BORDER_DARK}" stroke-width="6"/>
      <rect x="-320" y="-420" width="640" height="60" rx="12" fill="${TEAL_DARK}"/>
      <text x="0" y="-380" font-family="Inter" font-weight="900" font-size="26" fill="#ffffff" text-anchor="middle">PHÂN KHÚC TRUNG NGUỒN (MIDSTREAM)</text>

      <!-- Minh hoạ Tàu chở dầu thô (Tanker) -->
      <g id="mid-tanker-anim" transform="translate(0 -60)">
        <path d="M-220 0 L-160 100 L180 100 L240 30 L180 0 Z" fill="#dc2626" stroke="${BORDER_DARK}" stroke-width="8"/>
        <rect x="70" y="-80" width="90" height="80" rx="8" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="110" y="-120" width="24" height="40" rx="4" fill="#1e293b" stroke="${BORDER_DARK}" stroke-width="5"/>
        <circle cx="-60" cy="50" r="22" fill="#991b1b"/>
        <circle cx="30" cy="50" r="22" fill="#991b1b"/>
        <!-- Sóng biển cuộn -->
        <path d="M-280 130 Q-200 90 -120 130 Q-40 170 40 130 Q120 90 200 130 Q280 170 320 130" fill="none" stroke="#0d9488" stroke-width="8" stroke-linecap="round"/>
        <text x="0" y="190" font-family="Inter" font-weight="900" font-size="22" fill="${TEAL_DARK}" text-anchor="middle">ĐỘI TÀU VẬN TẢI BIỂN CHUYÊN DỤNG (PVT)</text>
      </g>

      <!-- Minh hoạ Hệ thống Đường ống ngầm -->
      <g id="mid-pipe-anim" transform="translate(0 280)">
        <rect x="-260" y="-20" width="520" height="40" rx="20" fill="#334155" stroke="${BORDER_DARK}" stroke-width="6"/>
        <line x1="-230" y1="0" x2="230" y2="0" stroke="#facc15" stroke-width="10" stroke-dasharray="24 16"/>
        <text x="0" y="55" font-family="Inter" font-weight="900" font-size="22" fill="#0f172a" text-anchor="middle">HỆ THỐNG ĐƯỜNG ỐNG KHÍ DƯỚI ĐÁY BIỂN (GAS)</text>
      </g>
    </g>
  `;

  const midstreamCards = `
    <!-- Cụm card bên phải -->
    ${infoCard("card-gas", 1020, 160, {
      ticker: "GAS",
      badge: "● Niêm yết HOSE",
      isListed: true,
      color: "#0369a1",
      title: "Tổng Công ty Khí Việt Nam (PV GAS)",
      desc: "Độc quyền vận hành hệ thống đường ống thu gom, vận chuyển và phân phối khí",
      tag: "Cơ sở hạ tầng khí huyết mạch quốc gia, bao gồm các kho cảng LNG nhập khẩu",
      tagBg: "#f0f9ff",
      tagColor: "#0369a1",
    })}

    ${infoCard("card-pvt", 1020, 360, {
      ticker: "PVT",
      badge: "● Niêm yết HOSE",
      isListed: true,
      color: TEAL_DARK,
      title: "Tổng Công ty Cổ phần Vận tải Dầu khí (PV Trans)",
      desc: "Làm chủ đội tàu vận tải dầu thô, sản phẩm dầu và khí hóa lỏng lớn nhất Việt Nam",
      tag: "Mở rộng đội tàu quốc tế, hưởng lợi từ giá cước thuê tàu (spot & định hạn)",
      tagBg: "#f0fdfa",
      tagColor: TEAL_DARK,
    })}

    ${insightBox("card-mid-defense", 1020, 570, {
      title: "ĐẶC TRƯNG TÀI CHÍNH: TÍNH PHÒNG THỦ CAO",
      bullet1: "• Nguồn thu từ cước phí vận tải & phí trung chuyển dịch vụ ổn định.",
      bullet2: "• Ít chịu biến động trực tiếp khi giá dầu thế giới tăng/giảm sốc ngắn hạn.",
      color: GREEN_DARK,
      bg: "#f0fdf4",
    })}
  `;

  k.scene(
    "midstream",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="background: ${PAPER};">
      <rect width="1920" height="1080" fill="${PAPER}"/>
      ${midstreamGraphic}
      ${midstreamCards}
    </svg>`,
    { at: S[4], trans: "whip" }
  );

  // Hoạt cảnh Trung nguồn (Cảnh 5)
  fx.pop("#card-gas", at(4, "gas") - 0.2, { from: 0.6 });
  fx.pop("#card-pvt", at(4, "pvt") - 0.2, { from: 0.6 });
  fx.slam("#card-mid-defense", at(4, "cước") - 0.2);

  // ==========================================
  // CẢNH 6 & 7: DEEP DIVE HẠ NGUỒN (Downstream - Lọc dầu & Bán lẻ)
  // ==========================================
  const downstreamGraphic = `
    <!-- Nhà máy lọc dầu & Cây xăng bán lẻ -->
    <g transform="translate(450 560)">
      <rect x="-350" y="-450" width="700" height="900" rx="24" fill="#fffbeb" stroke="${BORDER_DARK}" stroke-width="6"/>
      <rect x="-320" y="-420" width="640" height="60" rx="12" fill="${AMBER_DARK}"/>
      <text x="0" y="-380" font-family="Inter" font-weight="900" font-size="26" fill="#ffffff" text-anchor="middle">PHÂN KHÚC HẠ NGUỒN (DOWNSTREAM)</text>

      <!-- Minh hoạ Nhà máy lọc dầu Dung Quất -->
      <g id="down-refinery-anim" transform="translate(0 -50)">
        <!-- Tháp chưng cất phân đoạn cao vút -->
        <rect x="-140" y="-160" width="80" height="260" rx="14" fill="#94a3b8" stroke="${BORDER_DARK}" stroke-width="7"/>
        <line x1="-140" y1="-80" x2="-60" y2="-80" stroke="${BORDER_DARK}" stroke-width="5"/>
        <line x1="-140" y1="0" x2="-60" y2="0" stroke="${BORDER_DARK}" stroke-width="5"/>
        <!-- Tháp cracking -->
        <rect x="-40" y="-120" width="60" height="220" rx="10" fill="#cbd5e1" stroke="${BORDER_DARK}" stroke-width="6"/>
        <!-- Bồn chứa dầu hình tròn -->
        <circle cx="100" cy="20" r="70" fill="#e2e8f0" stroke="${BORDER_DARK}" stroke-width="7"/>
        <circle cx="100" cy="20" r="45" fill="none" stroke="#94a3b8" stroke-width="4"/>
        <text x="0" y="145" font-family="Inter" font-weight="900" font-size="22" fill="${AMBER_DARK}" text-anchor="middle">LỌC HÓA DẦU: NHÀ MÁY DUNG QUẤT & NGHI SƠN</text>
      </g>

      <!-- Minh hoạ Trạm xăng bán lẻ & Xe bồn -->
      <g id="down-station-anim" transform="translate(0 260)">
        <!-- Trụ bơm & Mái che -->
        <rect x="-240" y="-20" width="480" height="26" rx="6" fill="#dc2626" stroke="${BORDER_DARK}" stroke-width="5"/>
        <line x1="-180" y1="6" x2="-180" y2="90" stroke="${BORDER_DARK}" stroke-width="8"/>
        <line x1="180" y1="6" x2="180" y2="90" stroke="${BORDER_DARK}" stroke-width="8"/>
        <rect x="-60" y="10" width="120" height="80" rx="8" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="5"/>
        <text x="0" y="55" font-family="Inter" font-weight="900" font-size="20" fill="#15803d" text-anchor="middle">PETROLIMEX</text>
        <text x="0" y="125" font-family="Inter" font-weight="900" font-size="22" fill="${BORDER_DARK}" text-anchor="middle">PHÂN PHỐI BÁN LẺ (PLX, PV OIL)</text>
      </g>
    </g>
  `;

  const downstreamCards = `
    <!-- Cụm card bên phải -->
    ${infoCard("card-bsr", 1020, 140, {
      ticker: "BSR",
      badge: "● Niêm yết HOSE",
      isListed: true,
      color: AMBER_DARK,
      title: "Công ty Cổ phần Lọc Hóa dầu Bình Sơn",
      desc: "Vận hành Nhà máy Lọc dầu Dung Quất (cùng Nhà máy Nghi Sơn chưa niêm yết)",
      tag: "Biến dầu thô thành xăng RON95, dầu Diesel, nhiên liệu phản lực & hạt nhựa",
      tagBg: "#fef3c7",
      tagColor: AMBER_DARK,
    })}

    ${infoCard("card-plx-oil", 1020, 310, {
      ticker: "PLX / OIL",
      badge: "● Niêm yết HOSE / UPCoM",
      isListed: true,
      color: RED_DARK,
      title: "Tập đoàn Xăng dầu Petrolimex & PV OIL",
      desc: "Sau khi PVT vận chuyển thành phẩm, PLX và OIL phân phối về kho & trạm xăng",
      tag: "Nắm giữ mạng lưới hàng nghìn cây xăng bán lẻ phủ kín toàn quốc",
      tagBg: "#fef2f2",
      tagColor: RED_DARK,
    })}

    ${insightBox("card-crack-spread", 1020, 480, {
      title: "CƠ CHẾ SINH LỜI KHÂU HẠ NGUỒN",
      bullet1: "• Lọc dầu (BSR): Phụ thuộc biên Crack Spread = Giá xăng - Giá dầu thô.",
      bullet2: "• Bán lẻ (PLX, OIL): Sống nhờ sản lượng tiêu thụ & chiết khấu kinh doanh.",
      color: "#991b1b",
      bg: "#fff5f5",
    })}

    ${infoCard("card-pvt-down", 1020, 660, {
      ticker: "PVT",
      badge: "● Vận tải thứ cấp",
      isListed: true,
      color: TEAL_DARK,
      title: "PV Trans (Mắt xích kép: Vận tải thành phẩm)",
      desc: "PVT tiếp tục đảm nhận vận chuyển xăng từ Dung Quất & Nghi Sơn đến các đầu mối",
      tag: "Hưởng lợi cả 2 chiều: vận chuyển dầu thô đầu vào lẫn xăng dầu thành phẩm đầu ra",
      tagBg: "#f0fdfa",
      tagColor: TEAL_DARK,
    })}
  `;

  k.scene(
    "downstream",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="background: ${PAPER};">
      <rect width="1920" height="1080" fill="${PAPER}"/>
      ${downstreamGraphic}
      ${downstreamCards}
    </svg>`,
    { at: S[5], trans: "whip" }
  );

  // Hoạt cảnh Hạ nguồn (Cảnh 6 & 7)
  fx.pop("#card-bsr", at(5, "bsr") - 0.2, { from: 0.6 });
  fx.pop("#card-plx-oil", at(5, "plx") - 0.2, { from: 0.6 });
  fx.slam("#card-crack-spread", at(6, "crack") - 0.2);
  fx.pop("#card-pvt-down", at(5, "pvt") - 0.2, { from: 0.6 });

  // ==========================================
  // CẢNH 8: MA TRẬN PHÂN BỔ VỐN CHO NHÀ ĐẦU TƯ (Decision Matrix)
  // ==========================================
  const matrixSVG = `
    <svg viewBox="0 0 1920 1080" width="1920" height="1080" style="background: ${PAPER};">
      <rect width="1920" height="1080" fill="${PAPER}"/>
      
      <!-- Tiêu đề lớn -->
      <g id="mat-title" opacity="0" transform="translate(960 90)">
        <rect x="-460" y="-40" width="920" height="80" rx="18" fill="${NAVY}" stroke="${BORDER_DARK}" stroke-width="4"/>
        <text x="0" y="12" font-family="Inter" font-weight="900" font-size="32" fill="#ffffff" text-anchor="middle" letter-spacing="1">KIM CHỈ NAM ĐẦU TƯ CỔ PHIẾU DẦU KHÍ</text>
      </g>

      <!-- Cột 1: Thượng nguồn -->
      <g id="mat-col-1" opacity="0" transform="translate(360 560)" data-layout-allow-overlap>
        <rect x="-240" y="-380" width="480" height="760" rx="24" fill="#eff6ff" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="-210" y="-350" width="420" height="70" rx="14" fill="${BLUE_DARK}"/>
        <text x="0" y="-306" font-family="Inter" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">THƯỢNG NGUỒN</text>
        <text x="0" y="-250" font-family="Inter" font-weight="900" font-size="32" fill="${BLUE_DARK}" text-anchor="middle">PVD · PVS</text>

        <rect x="-200" y="-200" width="400" height="120" rx="12" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="0" y="-165" font-family="Inter" font-weight="800" font-size="18" fill="${TEXT_MAIN}" text-anchor="middle">Bối cảnh phù hợp:</text>
        <text x="0" y="-125" font-family="Inter" font-weight="900" font-size="20" fill="${BLUE_DARK}" text-anchor="middle">Giá dầu cao dài hạn & Đại dự án</text>

        <rect x="-200" y="-50" width="400" height="390" rx="12" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="-170" y="0" font-family="Inter" font-weight="800" font-size="18" fill="${TEXT_MAIN}">Đặc tính đầu tư:</text>
        <text x="-170" y="45" font-family="Inter" font-weight="700" font-size="17" fill="${BLUE_DARK}">✔ Tính chu kỳ rất cao (High Beta)</text>
        <text x="-170" y="95" font-family="Inter" font-weight="700" font-size="17" fill="${BLUE_DARK}">✔ Lợi nhuận bùng nổ theo giá thuê</text>
        <text x="-170" y="145" font-family="Inter" font-weight="700" font-size="17" fill="${AMBER_DARK}">⚠ Lưu ý: Độ trễ hợp đồng 6-12 tháng</text>
        <text x="-170" y="195" font-family="Inter" font-weight="700" font-size="17" fill="${AMBER_DARK}">⚠ Cần theo dõi sát CAPEX và backlog</text>
        <rect x="-180" y="240" width="360" height="60" rx="10" fill="#eff6ff"/>
        <text x="0" y="278" font-family="Inter" font-weight="900" font-size="18" fill="${BLUE_DARK}" text-anchor="middle">Phù hợp: Đón sóng chu kỳ lớn</text>
      </g>

      <!-- Cột 2: Trung nguồn -->
      <g id="mat-col-2" opacity="0" transform="translate(960 560)" data-layout-allow-overlap>
        <rect x="-240" y="-380" width="480" height="760" rx="24" fill="#f0fdfa" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="-210" y="-350" width="420" height="70" rx="14" fill="${TEAL_DARK}"/>
        <text x="0" y="-306" font-family="Inter" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">TRUNG NGUỒN</text>
        <text x="0" y="-250" font-family="Inter" font-weight="900" font-size="32" fill="${TEAL_DARK}" text-anchor="middle">GAS · PVT</text>

        <rect x="-200" y="-200" width="400" height="120" rx="12" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="0" y="-165" font-family="Inter" font-weight="800" font-size="18" fill="${TEXT_MAIN}" text-anchor="middle">Bối cảnh phù hợp:</text>
        <text x="0" y="-125" font-family="Inter" font-weight="900" font-size="20" fill="${TEAL_DARK}" text-anchor="middle">Thị trường biến động & Cần an toàn</text>

        <rect x="-200" y="-50" width="400" height="390" rx="12" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="-170" y="0" font-family="Inter" font-weight="800" font-size="18" fill="${TEXT_MAIN}">Đặc tính đầu tư:</text>
        <text x="-170" y="45" font-family="Inter" font-weight="700" font-size="17" fill="${TEAL_DARK}">✔ Dòng tiền thu cước cực kỳ ổn định</text>
        <text x="-170" y="95" font-family="Inter" font-weight="700" font-size="17" fill="${TEAL_DARK}">✔ Cổ tức tiền mặt đều đặn hàng năm</text>
        <text x="-170" y="145" font-family="Inter" font-weight="700" font-size="17" fill="${GREEN_DARK}">✔ Phòng thủ vững chắc trước bão giá</text>
        <text x="-170" y="195" font-family="Inter" font-weight="700" font-size="17" fill="${TEXT_SUB}">⚠ Tăng trưởng vừa phải, không sốc</text>
        <rect x="-180" y="240" width="360" height="60" rx="10" fill="#f0fdfa"/>
        <text x="0" y="278" font-family="Inter" font-weight="900" font-size="18" fill="${TEAL_DARK}" text-anchor="middle">Phù hợp: Phòng thủ & Nhận cổ tức</text>
      </g>

      <!-- Cột 3: Hạ nguồn -->
      <g id="mat-col-3" opacity="0" transform="translate(1560 560)" data-layout-allow-overlap>
        <rect x="-240" y="-380" width="480" height="760" rx="24" fill="#fffbeb" stroke="${BORDER_DARK}" stroke-width="6"/>
        <rect x="-210" y="-350" width="420" height="70" rx="14" fill="${AMBER_DARK}"/>
        <text x="0" y="-306" font-family="Inter" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">HẠ NGUỒN</text>
        <text x="0" y="-250" font-family="Inter" font-weight="900" font-size="32" fill="${AMBER_DARK}" text-anchor="middle">BSR · PLX · OIL</text>

        <rect x="-200" y="-200" width="400" height="120" rx="12" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="0" y="-165" font-family="Inter" font-weight="800" font-size="18" fill="${TEXT_MAIN}" text-anchor="middle">Bối cảnh phù hợp:</text>
        <text x="0" y="-125" font-family="Inter" font-weight="900" font-size="20" fill="${AMBER_DARK}" text-anchor="middle">Crack Spread giãn & Sức mua tăng</text>

        <rect x="-200" y="-50" width="400" height="390" rx="12" fill="#ffffff" stroke="${BORDER_DARK}" stroke-width="3"/>
        <text x="-170" y="0" font-family="Inter" font-weight="800" font-size="18" fill="${TEXT_MAIN}">Đặc tính đầu tư:</text>
        <text x="-170" y="45" font-family="Inter" font-weight="700" font-size="17" fill="${AMBER_DARK}">✔ BSR ăn dày khi chênh lệch giá lớn</text>
        <text x="-170" y="95" font-family="Inter" font-weight="700" font-size="17" fill="${AMBER_DARK}">✔ PLX/OIL hưởng lợi từ mở rộng chiết khấu</text>
        <text x="-170" y="145" font-family="Inter" font-weight="700" font-size="17" fill="${RED_DARK}">⚠ Rủi ro trích lập tồn kho khi dầu giảm</text>
        <text x="-170" y="195" font-family="Inter" font-weight="700" font-size="17" fill="${TEXT_SUB}">⚠ Chịu quản lý giá cơ sở của Nhà nước</text>
        <rect x="-180" y="240" width="360" height="60" rx="10" fill="#fffbeb"/>
        <text x="0" y="278" font-family="Inter" font-weight="900" font-size="18" fill="${AMBER_DARK}" text-anchor="middle">Phù hợp: Đánh theo biên lọc dầu & tiêu dùng</text>
      </g>
    </svg>
  `;

  k.scene("matrix", matrixSVG, { at: S[7], trans: "zoom" });
  fx.pop("#mat-title", S[7] + 0.2);
  fx.pop("#mat-col-1", at(7, "thượng") - 0.2, { from: 0.6 });
  fx.pop("#mat-col-2", at(7, "trung") - 0.2, { from: 0.6 });
  fx.pop("#mat-col-3", at(7, "hạ") - 0.2, { from: 0.6 });
  fx.hide("#matrix", S[8] - 0.2);

  // ==========================================
  // CẢNH 9: OUTRO & KÊU GỌI HÀNH ĐỘNG
  // ==========================================
  k.scene(
    "end",
    k.endCard({
      title: "Chuỗi giá trị ngành Dầu khí",
      sub: "Hiểu đúng chuỗi giá trị — Chọn đúng mã cổ phiếu",
      cta: "Đọc bài viết phân tích chi tiết & tải infographic bên dưới video",
      disclaimer: "Nội dung chỉ nhằm mục đích giáo dục, không phải khuyến nghị mua bán cổ phiếu. Thông tin tham khảo từ PVN, Vietcap và TechProfit.",
    }),
    { at: S[8], trans: "iris", z: 850, drift: false }
  );

  k.captionsUntil(S[8] - 0.1);
}
