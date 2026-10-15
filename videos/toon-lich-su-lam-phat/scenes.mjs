// Hình cho "Lịch sử lạm phát" (định dạng toon). Bộ công cụ `k`: xem docs/toon-guide.md.
// Đức 1923 → La Mã → Việt Nam 1985–1986 → định nghĩa lạm phát → CPI → thẻ cuối.

export default function (k) {
  const { at, seq, stagger, S, T, fx, A, INK, PAPER, NAVY, TEAL, RED } = k;
  const { room, worldMap, flagBall, ballMood, nameTag, banner, stampBox, kline } = k;
  const { note, bundle, logs, coin, bread, bowl, barrow, panel, H } = k;
  // Nhân vật: ảnh vẽ bằng Nano Banana (media/cast/, xem "cast" trong script.json), diễn bằng k.actor / k.act / k.sway

  // ===== Bản đồ dùng chung (cảnh 1, 5, 9) =====
  const ROME = [380, 724, 250, 300, 792, 818, 788, 434, 620, 191, 70, 8, 499, 688, 100, 807, 705, 756, 376, 422, 760, 400, 196, 642, 56];
  const map = worldMap({
    idPrefix: "land",
    colors: { 276: "#f0b24a", 704: "#e24b3b" },
    fit: [[-12, 30], [42, 58], [112, 6], [108, 23]],
    extent: [[80, 60], [1840, 1020]],
  });
  const DE = map.P(10.4, 51.2);
  const IT = map.P(12.5, 42.5);
  const VN = map.P(106, 16);
  const mapLabel = (id, [x, y], txt, dy = -80) =>
    `<g transform="translate(${x} ${y + dy})"><g id="${id}" opacity="0"><rect x="${-txt.length * 14 - 24}" y="-36" width="${txt.length * 28 + 48}" height="66" rx="12" fill="${NAVY}" stroke="${INK}" stroke-width="4"/><text y="12" font-family="Inter" font-weight="800" font-size="36" fill="#fff" text-anchor="middle">${txt}</text></g></g>`;
  k.scene(
    "map",
    `<div class="cam" id="mapcam"><svg viewBox="0 0 1920 1080" width="1920" height="1080" style="overflow:visible">${map.svg}
    ${mapLabel("lab-de", DE, "NƯỚC ĐỨC")}${mapLabel("lab-rome", IT, "LA MÃ", -60)}${mapLabel("lab-vn", VN, "VIỆT NAM", -110)}</svg></div>`,
    { at: 0, drift: false } // bản đồ có máy quay riêng (#mapcam)
  );

  // ===== Cảnh 1: Đức 1923, người phụ nữ nhóm lò bằng tiền giấy =====
  fx.camSet("#mapcam", DE[0], DE[1], 3.2, 0);
  fx.cam("#mapcam", DE[0], DE[1], 2.4, 0.2, 2.8, "power1.out");
  fx.pop("#lab-de", at(0, "đức"), { from: 0.5 });
  const stove = `<g transform="translate(1330 790)">
    <rect x="-150" y="-200" width="300" height="400" rx="16" fill="#3a3a40" stroke="${INK}" stroke-width="8"/>
    <rect x="-60" y="-520" width="70" height="330" fill="#4a4a52" stroke="${INK}" stroke-width="7"/>
    <rect x="-170" y="-224" width="340" height="40" rx="8" fill="#55555e" stroke="${INK}" stroke-width="7"/>
    <rect x="-90" y="-110" width="180" height="140" rx="14" fill="#1d1a1a" stroke="${INK}" stroke-width="7"/>
    <g id="flame" transform="translate(0 20)"><path d="M-60 0 Q-70 -60 -30 -90 Q-30 -50 0 -40 Q-10 -100 30 -130 Q30 -70 60 -50 Q76 -20 60 0 Z" fill="#ff9f2e" stroke="${INK}" stroke-width="5"/><path d="M-30 0 Q-30 -40 0 -60 Q4 -30 30 -20 Q36 -6 30 0 Z" fill="#ffd34d"/></g>
    <rect x="-130" y="200" width="40" height="30" fill="#2c2c30"/><rect x="90" y="200" width="40" height="30" fill="#2c2c30"/></g>`;
  const tWoman = at(0, "người") - 0.25;
  k.scene(
    "k1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080">${room("#efe2c6", "#d8c4a0", `<rect x="560" y="140" width="300" height="260" fill="#cfe3ea" stroke="${INK}" stroke-width="9"/><line x1="710" y1="140" x2="710" y2="400" stroke="${INK}" stroke-width="7"/><line x1="560" y1="270" x2="860" y2="270" stroke="${INK}" stroke-width="7"/>`)}
    ${stove}
    ${k.actor("frau", "frau", ["base", "toss", "smug"], { x: 930, y: 1012, h: 650 })}
    ${bundle("bun1", 1030, 640, 0.9)}
    ${stampBox("rich", 1500, 300, "GIÀU?", { size: 90, rot: 8 })}
    <g id="richx" opacity="0" stroke="${RED}" stroke-width="16" stroke-linecap="round"><line x1="1380" y1="210" x2="1620" y2="390"/><line x1="1620" y1="210" x2="1380" y2="390"/></g>
  </svg>`,
    { at: tWoman, trans: "zoom", shift: 150, drift: { z: 1.08, origin: "65% 60%", bg: 50 } } // xuyên qua nước Đức trên bản đồ
  );
  k.sway("frau", tWoman, S[2]);
  A(`tl.fromTo("#flame", { scale: 0.5, transformOrigin: "50% 100%" }, { scale: 0.6, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 7 }, ${T(tWoman)});`);
  const tPaper = at(0, "tiền");
  k.act("frau", "toss", tPaper - 0.1);
  fx.pop("#bun1", tPaper - 0.4, { from: 0.4, kind: "tap" });
  // Ném xấp tiền vào lò, lửa bùng lên
  A(`tl.to("#bun1", { keyframes: [{ x: 120, y: -80, rotation: 40, duration: 0.25, ease: "power1.out" }, { x: 290, y: 60, rotation: 120, scale: 0.4, opacity: 0, duration: 0.25, ease: "power1.in" }] }, ${T(tPaper + 0.1)});`);
  fx.sound(tPaper + 0.1, "whoosh");
  A(`tl.to("#flame", { scale: 1.5, transformOrigin: "50% 100%", duration: 0.3, ease: "back.out(3)" }, ${T(tPaper + 0.6)});`);
  A(`tl.to("#flame", { scale: 1.3, duration: 0.4, ease: "sine.inOut", yoyo: true, repeat: 5 }, ${T(tPaper + 0.9)});`);
  fx.sound(tPaper + 0.6, "hit", 0.6);
  // "Không phải vì cô giàu."
  fx.slam("#rich", at(1, "giàu") - 0.1, { kind: "stamp" });
  A(`tl.fromTo("#richx", { opacity: 0 }, { opacity: 1, duration: 0.12 }, ${T(at(1, "giàu") + 0.25)});`);
  fx.sound(at(1, "giàu") + 0.25, "snap");
  k.act("frau", "smug", at(1, "giàu"));

  // ===== Cảnh 2: tiền rẻ hơn cả củi (cái cân) =====
  const scaleSvg = `<g transform="translate(1180 0)">
    <path d="M-160 980 L160 980 L120 940 L-120 940 Z" fill="#8a5a3b" stroke="${INK}" stroke-width="7"/>
    <rect x="-14" y="330" width="28" height="620" fill="#9c6b45" stroke="${INK}" stroke-width="7"/>
    <g id="beam" transform="rotate(0 0 340)">
      <rect x="-420" y="326" width="840" height="28" rx="12" fill="#c8a165" stroke="${INK}" stroke-width="7"/>
      <circle cx="0" cy="340" r="22" fill="#e3b85c" stroke="${INK}" stroke-width="6"/>
      ${[-400, 400]
        .map(
          (x, n) => `<g id="pan${n}" transform="rotate(0 ${x} 340)"><line x1="${x}" y1="340" x2="${x - 120}" y2="600" stroke="${INK}" stroke-width="5"/><line x1="${x}" y1="340" x2="${x + 120}" y2="600" stroke="${INK}" stroke-width="5"/><path d="M${x - 150} 600 L${x + 150} 600 Q${x + 120} 660 ${x} 660 Q${x - 120} 660 ${x - 150} 600 Z" fill="#c8a165" stroke="${INK}" stroke-width="7"/>
        ${n === 0 ? bundle("bun2", x, 545, 1.1) : logs("logs", x, 548)}
        <text x="${x}" y="740" font-family="Inter" font-weight="800" font-size="46" fill="${INK}" text-anchor="middle" id="pl${n}" opacity="0">${n === 0 ? "TIỀN GIẤY" : "CỦI"}</text></g>`
        )
        .join("")}
    </g></g>`;
  k.scene("k2", `<svg viewBox="0 0 1920 1080" width="1920" height="1080">${room()}${scaleSvg}${banner("cheap", 1180, 170, "RẺ HƠN CẢ CỦI", { size: 76 })}</svg>`, {
    at: at(1, "mà") - 0.12,
    trans: "whip",
    shift: 200,
    drift: { z: 1.05, origin: "60% 40%", bg: 50 },
  });
  fx.pop("#bun2", at(1, "tiền"), { from: 0.3 });
  fx.pop("#pl0", at(1, "tiền") + 0.1, { kind: null });
  // Tiền nhẹ hơn: đòn cân nghiêng về phía củi khi củi đặt lên
  fx.pop("#logs", at(1, "củi") - 0.25, { from: 0.3, kind: "tap" });
  fx.pop("#pl1", at(1, "củi") - 0.1, { kind: null });
  A(`tl.to("#beam", { attr: { transform: "rotate(14 0 340)" }, duration: 0.6, ease: "bounce.out" }, ${T(at(1, "củi") - 0.05)});`);
  A(`tl.to("#pan0", { attr: { transform: "rotate(-14 -400 340)" }, duration: 0.6, ease: "bounce.out" }, ${T(at(1, "củi") - 0.05)});`);
  A(`tl.to("#pan1", { attr: { transform: "rotate(-14 400 340)" }, duration: 0.6, ease: "bounce.out" }, ${T(at(1, "củi") - 0.05)});`);
  fx.sound(at(1, "củi") + 0.05, "hit", 0.7);
  fx.slam("#cheap", at(1, "củi") + 0.45, { kind: "stamp" });
  k.punch("k2", at(1, "củi") + 0.05, 1180, 520);
  k.idle("#cheap", at(1, "củi") + 0.7, S[2], { y: 6, rot: 2 });

  // ===== Cảnh 3: bánh mì 1918 → 1923, xe cút kít chở tiền =====
  k.scene(
    "b1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080">${room("#f3e3c3", "#d8b88f", `<rect x="900" y="200" width="900" height="26" fill="#9c6b45" stroke="${INK}" stroke-width="6"/><rect x="900" y="400" width="900" height="26" fill="#9c6b45" stroke="${INK}" stroke-width="6"/>${[0, 1, 2, 3, 4].map((n) => `<ellipse cx="${980 + n * 170}" cy="${178}" rx="62" ry="26" fill="#d79a4e" stroke="${INK}" stroke-width="5"/><ellipse cx="${1000 + n * 165}" cy="${378}" rx="56" ry="24" fill="#c98b40" stroke="${INK}" stroke-width="5"/>`).join("")}`)}
    ${k.actor("baker", "baker", ["base", "shrug"], { x: 1450, y: 1012, h: 680, flip: true })}
    <rect x="900" y="760" width="1100" height="250" fill="#a8744a" stroke="${INK}" stroke-width="8"/>
    ${bread("bread", 1040, 715)}
    <g transform="translate(1040 560)"><g id="tag" opacity="0"><line x1="0" y1="-60" x2="0" y2="-20" stroke="${INK}" stroke-width="4"/><rect x="-230" y="-24" width="460" height="96" rx="12" fill="#fff6dc" stroke="${INK}" stroke-width="6"/><text id="price" y="42" font-family="Inter" font-weight="800" font-size="50" fill="${INK}" text-anchor="middle">&lt; 1 MÁC</text></g></g>
    ${k.actor("frau2", "frau", ["push", "gasp"], { x: 450, y: 1012, h: 620 })}
    ${barrow("barrow", 760, 1004)}
  </svg>`,
    { at: S[2] - 0.05, trans: "wipe", shift: 110, drift: { z: 1.05, origin: "55% 65%", x: -20, bg: 60 } }
  );
  k.sway("baker", S[2], S[4]);
  fx.pop("#bread", at(2, "bánh"), { from: 0.4 });
  fx.pop("#tag", at(2, "mác") - 0.1, { from: 0.4, origin: "50% 0%", kind: "tap" });
  const tSau = at(2, "sau");
  // Xe cút kít chở tiền đi mua bánh mì
  const tBarrow = tSau - 0.2;
  // Người phụ nữ đẩy xe cút kít vào cùng lúc
  A(`tl.set("#frau2", { opacity: 0 }, 0);`);
  A(`tl.fromTo("#barrow, #frau2", { opacity: 1, x: -900 }, { opacity: 1, x: 0, duration: 0.7, ease: "power2.out", immediateRender: false }, ${T(tBarrow)});`);
  A(`tl.fromTo("#barrow", { rotation: 0 }, { rotation: -3, duration: 0.12, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false }, ${T(tBarrow + 0.7)});`);
  fx.sound(tBarrow, "slide");
  fx.sound(tBarrow + 0.7, "boing");
  fx.count("#price", ["10 MÁC", "1.000 MÁC", "1 TRIỆU MÁC", "1 TỶ MÁC", "HÀNG TỶ MÁC"], at(2, "tỷ") - 0.55, { step: 0.12 });
  fx.shake("#b1-p", at(2, "tỷ") + 0.1);
  k.act("frau2", "gasp", at(2, "tỷ"));
  k.act("baker", "shrug", at(2, "tỷ") + 0.2);
  k.punch("b1", at(2, "tỷ") - 0.1, 1060, 600, { z: 1.2, hold: 1.1 });
  k.idle("#tag", at(2, "mác") + 0.4, at(2, "tỷ") - 0.6, { y: 0, rot: 5, period: 1.2 });
  k.gag({ key: "bread", t0: at(2, "tỷ") + 0.45, t1: S[3] - 0.28, bg: "#ffd34d", ray: "#ffbf1f", img: "an-shock", sticker: "HẢ?!", sound: "scratch" });

  // ===== Cảnh 4: 1 đô la = hơn 4 nghìn tỷ mác =====
  k.scene(
    "f1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${PAPER}"/>
    ${flagBall("usd", "us", 860, 500, 190)}${flagBall("dem", "de", 1450, 560, 150)}
    ${H("l-usd", 860, 800, "1 đô la Mỹ", 52)}
    <text id="mark" opacity="0" x="1450" y="820" font-family="Inter" font-weight="800" font-size="56" fill="${RED}" text-anchor="middle">4 mác</text>
    ${H("eq2", 1160, 540, "=", 120)}
    ${H("date4", 1450, 900, "tháng 11/1923", 32, "#8a7f72")}
  </svg>`,
    { at: S[3] - 0.05, trans: "whip", opts: { axis: "y" }, shift: 200, drift: { z: 1.06, origin: "60% 50%" } }
  );
  A(`tl.set("#usd, #dem", { opacity: 0 }, 0);`);
  fx.pop("#usd", at(3, "đô"), { from: 0.2, ease: "back.out(2.6)" });
  fx.pop("#l-usd", at(3, "mỹ"), { from: 0.6, kind: null });
  fx.pop("#eq2", at(3, "đổi"), { from: 0.5, kind: "tap" });
  fx.pop("#dem", at(3, "đổi") + 0.15, { from: 0.2, ease: "back.out(2.6)" });
  fx.pop("#mark", at(3, "bốn") - 0.05, { from: 0.6, kind: null });
  fx.pop("#date4", at(3, "bốn"), { from: 0.8, kind: null });
  fx.count("#mark", ["4 mác", "4.000 mác", "4 triệu mác", "4 tỷ mác", "4.000 tỷ mác"], at(3, "bốn"), { step: 0.13 });
  ballMood(fx, "usd", "smug", at(3, "tỷ"));
  ballMood(fx, "dem", "worried", at(3, "tỷ"));
  A(`tl.to("#dem-body", { scale: 0.62, transformOrigin: "50% 50%", duration: 0.6, ease: "power2.inOut" }, ${T(at(3, "bốn"))});`);
  A(`tl.fromTo("#dem-sweat", { opacity: 0, y: -10 }, { opacity: 1, y: 6, duration: 0.5 }, ${T(at(3, "mác"))});`);
  k.punch("f1", at(3, "bốn"), 1450, 760, { hold: 1.4 });
  // #usd có transform vị trí riêng: cho lớp thân bên trong lơ lửng
  k.idle("#usd-body", at(3, "đô") + 0.4, S[4], { y: 12, rot: 3 });
  k.idle("#dem-body", at(3, "đổi") + 0.5, S[4], { y: 8, rot: -3, period: 1.3 });

  // ===== Cảnh 5: lùi về La Mã (bản đồ lia + mốc năm chạy lùi) =====
  k.cut("map", S[4] - 0.05, "zoomOut");
  fx.hide("#lab-de", S[4] - 0.05);
  fx.camSet("#mapcam", DE[0], DE[1], 2.4, S[4] - 0.05);
  fx.cam("#mapcam", IT[0], IT[1] + 60, 1.7, at(4, "bắt") - 0.2, 1.4);
  fx.sound(at(4, "bắt") - 0.2, "riser");
  ROME.forEach((id, n) => A(`tl.to("#land${id}", { fill: "#9b6ad0", duration: 0.3 }, ${T(at(4, "lâu") + 0.1 + (n % 6) * 0.05)});`));
  fx.pop("#lab-rome", at(4, "lâu") + 0.3, { from: 0.5 });
  k.overlay(kline("rw", "LÙI LẠI GẦN 1.700 NĂM", { x: 960, top: 120, size: 84, align: "center", sticker: true, style: "z-index:700" }));
  fx.words("rw", stagger(at(4, "nhưng") + 0.2, 5, 0.12));
  fx.sound(at(4, "nhưng") + 0.2, "whoosh");
  fx.hide("#rw", S[5] - 0.05);

  // ===== Cảnh 6–7: La Mã, đồng bạc bị pha đồng để trả lương lính =====
  const columns = [300, 700, 1100, 1500].map((x) => `<rect x="${x}" y="230" width="90" height="780" fill="#efe8da" stroke="${INK}" stroke-width="6"/><rect x="${x - 20}" y="200" width="130" height="40" fill="#e4dccb" stroke="${INK}" stroke-width="6"/>`).join("");
  k.scene(
    "r1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080">${room("#bfe0ef", "#d9cdb4", `<path d="M200 200 L960 60 L1720 200 Z" fill="#efe8da" stroke="${INK}" stroke-width="7"/>${columns}`)}
    ${k.actor("emp", "emperor", ["base"], { x: 740, y: 1012, h: 700 })}
    ${nameTag("tag-emp", 1010, 170, "Hoàng đế Augustus", "(tranh minh hoạ)", 820, 330)}
    ${coin("silver", 1400, 470, 170)}
    ${banner("pure", 1400, 760, "~98% BẠC", { size: 64, bg: "#cfd5dc", color: INK })}
    ${stampBox("mix", 1400, 470, "PHA ĐỒNG", { size: 70, rot: -14 })}
    <g id="army">${[0, 1, 2].map((n) => k.actor(`sol${n}`, "soldier", ["base"], { x: 1170 + n * 230, y: 1012, h: 560, flip: true })).join("")}</g>
  </svg>`,
    { at: S[5] - 0.05, trans: "zoom", opts: { cy: 438 }, shift: 150, drift: { z: 1.06, origin: "70% 45%", x: -40, bg: 60 } } // xuyên qua La Mã
  );
  A(`tl.set("#army", { opacity: 0 }, 0);`);
  k.sway("emp", S[5], S[7]);
  fx.pop("#tag-emp", at(5, "augustus") - 0.1, { from: 0.8, ease: "power2.out", kind: "tap" });
  fx.pop("#silver", at(5, "bạc") - 0.1, { from: 0.2, ease: "back.out(2.4)" });
  fx.pop("#pure", at(5, "nguyên") - 0.1, { from: 0.6 });
  fx.hide("#tag-emp", S[6] - 0.1, 0.2);
  fx.hide("#pure", at(6, "pha") - 0.1, 0.2);
  // Pha đồng: đồng xu chuyển dần sang màu đồng
  A(`tl.to("#silver-face", { fill: "#c27a43", duration: 1.2, ease: "power1.inOut" }, ${T(at(6, "pha"))});`);
  fx.slam("#mix", at(6, "đồng") + 0.1);
  // Pha đồng: hoàng đế cúi người lén lút
  A(`tl.to("#emp", { rotation: 8, x: 30, transformOrigin: "50% 100%", duration: 0.4, ease: "back.out(2)" }, ${T(at(6, "pha"))});`);
  k.punch("r1", at(6, "đồng") + 0.1, 1400, 470);
  k.gag({ key: "rome", t0: at(6, "bạc") + 0.05, t1: at(6, "quân") - 0.35, bg: "#d9c8f0", ray: "#c4aee6", img: "an-smug", wobble: 0.5, sticker: "ỦA…?", sound: "boing" });
  // Quân lính trồi lên đòi lương
  const tLinh = at(6, "quân") - 0.3;
  A(`tl.to("#silver", { x: -260, y: -260, scale: 0.55, duration: 0.4, ease: "power2.inOut" }, ${T(tLinh)});`, `tl.to("#mix", { opacity: 0, duration: 0.2 }, ${T(tLinh)});`);
  A(`tl.fromTo("#army", { opacity: 1, y: 520 }, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.4)" }, ${T(tLinh)});`);
  fx.sound(tLinh, "slide");
  [0, 1, 2].forEach((n) => k.act(`sol${n}`, "base", tLinh + 0.35 + n * 0.08));

  // ===== Cảnh 8: năm 268 còn ~5% bạc, giá leo thang =====
  k.scene(
    "r2",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${PAPER}"/>
    <rect x="700" y="230" width="220" height="700" rx="18" fill="#fff" stroke="${INK}" stroke-width="8"/>
    <rect id="silverbar" x="712" y="242" width="196" height="676" rx="12" fill="#cfd5dc"/>
    <text id="pct" x="670" y="600" text-anchor="end" font-family="Inter" font-weight="800" font-size="64" fill="${INK}">~98%</text>
    ${coin("cop", 1310, 420, 110, "#c27a43")}
    <path id="stairs" d="M1050 940 L1050 860 L1180 860 L1180 760 L1310 760 L1310 640 L1440 640 L1440 500 L1570 500 L1570 330 L1700 330" fill="none" stroke="${RED}" stroke-width="16" stroke-linejoin="round" stroke-dasharray="1500" stroke-dashoffset="1500"/>
    <path id="stairhead" opacity="0" d="M1700 300 L1760 330 L1700 360 Z" fill="${RED}" stroke="${INK}" stroke-width="5"/>
    ${banner("climb", 1530, 200, "GIÁ CẢ LEO THANG", { size: 56, rot: -3 })}
  </svg>${kline("r2h", "BẠC TRONG MỖI ĐỒNG", { x: 560, top: 150, size: 56, align: "center" })}`,
    { at: S[7] - 0.05, trans: "whip", opts: { dir: -1 }, shift: 260, drift: { z: 1.05, origin: "60% 40%" } }
  );
  fx.words("r2h", stagger(S[7] + 0.1, 4, 0.1));
  fx.pop("#cop", at(7, "đồng") - 0.1, { from: 0.3 });
  const t5 = at(7, "năm", 1);
  A(`tl.fromTo("#silverbar", { attr: { y: 242, height: 676 } }, { attr: { y: 884, height: 34 }, duration: 1.1, ease: "power2.inOut" }, ${T(t5 - 0.9)});`);
  fx.count("#pct", ["~98%", "~80%", "~60%", "~40%", "~20%", "~10%", "~5%"], t5 - 0.9, { step: 0.16 });
  fx.sound(t5 + 0.1, "hit", 0.6);
  A(`tl.to("#stairs", { strokeDashoffset: 0, duration: 1.0, ease: "power1.inOut" }, ${T(at(7, "leo") - 0.4)});`);
  A(`tl.fromTo("#stairhead", { opacity: 0, scale: 0.2, transformOrigin: "0% 50%" }, { opacity: 1, scale: 1, duration: 0.2, ease: "back.out(2)" }, ${T(at(7, "leo") + 0.55)});`);
  fx.sound(at(7, "leo") - 0.4, "riser");
  fx.slam("#climb", at(7, "thang") + 0.05, { kind: "stamp", from: 1.8 });
  k.idle("#cop", at(7, "đồng") + 0.3, S[8], { y: 10, rot: 6 });
  k.idle("#climb", at(7, "thang") + 0.3, S[8], { y: 5, rot: 2 });

  // ===== Cảnh 9: Việt Nam 9/1985, đổi tiền 10 cũ lấy 1 mới =====
  k.cut("map", S[8] - 0.05, "wipe");
  fx.hide("#lab-rome", S[8] - 0.05);
  fx.camSet("#mapcam", IT[0], IT[1] + 60, 1.7, S[8] - 0.05);
  fx.cam("#mapcam", VN[0], VN[1] - 40, 2.2, S[8] + 0.05, 0.9, "power3.inOut");
  fx.sound(S[8] + 0.05, "whoosh");
  fx.pop("#lab-vn", at(8, "nam"), { from: 0.5 });
  const oldNotes = Array.from({ length: 10 }, (_, n) => `<g id="old${n}" opacity="0">${note(-40 + (n % 5) * 20, -60 + Math.floor(n / 5) * 70 + (n % 5) * 6, -12 + n * 3, "#d9c38f", n === 9 ? "CŨ" : "")}</g>`).join("");
  k.scene(
    "v1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080">${room("#f4e6c8", "#d8c4a0", `<rect x="1180" y="160" width="660" height="110" rx="10" fill="#2f6b5a" stroke="${INK}" stroke-width="7"/><text x="1510" y="236" font-family="Inter" font-weight="800" font-size="56" fill="#fff" text-anchor="middle">ĐỔI TIỀN</text>`)}
    <rect x="1180" y="700" width="760" height="310" fill="#b07a4b" stroke="${INK}" stroke-width="8"/>
    ${k.actor("vn1", "ba", ["base", "count", "surprised"], { x: 760, y: 1012, h: 640 })}
    <g transform="translate(1330 560)">${oldNotes}</g>
    ${H("arr10", 1530, 580, "→", 120)}
    <g transform="translate(1720 560)"><g id="new1" opacity="0">${note(0, 0, 4, "#7fc8b5", "MỚI")}</g></g>
    ${H("lab-old", 1330, 790, "10 đồng cũ", 48, "#fff")}${H("lab-new", 1720, 790, "1 đồng mới", 48, "#d6f5e6")}
  </svg>`,
    { at: at(8, "đổi") - 0.12, trans: "zoom", opts: { cy: 628 }, shift: 200, drift: { z: 1.07, origin: "70% 55%", bg: 50 } } // xuyên qua Việt Nam
  );
  k.sway("vn1", S[8], S[9]);
  const tMuoi = at(8, "mười");
  for (let n = 0; n < 10; n++) fx.pop(`#old${n}`, tMuoi - 0.1 + n * 0.05, { from: 0.4, kind: n % 3 ? null : "tap" });
  fx.pop("#lab-old", at(8, "cũ"), { from: 0.7, kind: null });
  fx.pop("#arr10", at(8, "lấy"), { from: 0.4, kind: "swish" });
  fx.pop("#new1", at(8, "mới") - 0.25, { from: 0.2, ease: "back.out(2.6)" });
  fx.pop("#lab-new", at(8, "mới"), { from: 0.7, kind: null });
  k.act("vn1", "count", at(8, "mười"));
  k.act("vn1", "surprised", at(8, "mới"));
  k.idle("#new1", at(8, "mới") + 0.2, S[9], { y: 10, rot: 4 });

  // ===== Cảnh 10: 1986, lạm phát vượt 700% =====
  k.scene(
    "d1",
    `<div class="dark"></div>
    <div class="kw" id="k10a" style="top:150px;font-size:64px;color:#c9d0e3">NĂM 1986</div>
    ${kline("k10b", "LẠM PHÁT", { x: 960, top: 250, size: 170, color: TEAL, align: "center" })}
    <div class="kw" id="k10c" style="top:470px;font-size:250px;color:#ff9f2e;text-shadow:0 10px 0 #7a3a00">&gt;700%</div>`,
    { at: S[9] - 0.05, trans: "slam", drift: { z: 1.1, origin: "50% 55%" } }
  );
  fx.pop("#k10a", at(9, "năm"), { from: 0.6, kind: "tap" });
  fx.words("k10b", seq(9, "lạm", 2), { from: 2.2, kind: null });
  fx.sound(at(9, "lạm") + 0.1, "hit");
  fx.sound(at(9, "bảy") - 0.8, "riser");
  fx.pop("#k10c", at(9, "bảy"), { from: 2.6, ease: "power4.out", kind: "hit" });
  fx.count("#k10c", ["100%", "300%", "500%", ">700%"], at(9, "bảy"), { step: 0.1, ding: false });
  fx.shake("#d1-p", at(9, "phần") + 0.1);
  k.punch("d1", at(9, "bảy"), 960, 600, { z: 1.1 });
  k.gag({ key: "panic", t0: at(9, "phần") + 0.05, t1: at(10, "ba") - 0.05, bg: "#ff8a5c", ray: "#ff7040", img: "an-panic", wobble: 2, sticker: "CHOÁNG!", sound: "hit" });

  // ===== Cảnh 11: ba thời đại, một điểm chung (gag "panic" che lần chuyển vào cảnh này) =====
  k.scene(
    "t1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${PAPER}"/>
    ${panel("pn1", 720, 330, 340, 380, `<g transform="translate(0 -40)">${note(-8, 18, -6, "#b9a7d6", "")}${note(6, 0, 4, "#a8c98f", "")}${note(0, -16, -2, "#e5c07b")}</g>`, "ĐỨC 1923")}
    ${panel("pn2", 1120, 330, 340, 380, `<g transform="translate(0 -40)"><circle r="90" fill="#c27a43" stroke="${INK}" stroke-width="7"/></g>`, "LA MÃ 268")}
    ${panel("pn3", 1520, 330, 340, 380, `<g transform="translate(0 -40)">${note(0, 0, 3, "#d9c38f", "ĐỒNG")}</g>`, "VIỆT NAM 1986")}
    <rect x="860" y="880" width="160" height="0" fill="${RED}" stroke="${INK}" stroke-width="6" id="barM"/>
    <rect x="1220" y="880" width="160" height="0" fill="#4ac08a" stroke="${INK}" stroke-width="6" id="barG"/>
    ${H("lbM", 940, 935, "TIỀN", 40)}${H("lbG", 1300, 935, "HÀNG HOÁ", 40)}
    ${banner("common", 1520, 700, "MỘT ĐIỂM CHUNG", { size: 54, bg: NAVY, color: TEAL, rot: 3 })}
  </svg>`,
    { at: S[10] - 0.05, trans: "cut", shift: 200, drift: { z: 1.05, origin: "60% 40%" } }
  );
  ["pn1", "pn2", "pn3"].forEach((id, n) => fx.pop(`#${id}`, at(10, "ba") + n * 0.18, { from: 0.4 }));
  fx.slam("#common", at(10, "điểm"), { kind: "stamp", from: 1.8 });
  const tTien = at(10, "tiền");
  A(`tl.to("#barM", { attr: { y: 560, height: 320 }, duration: 0.9, ease: "power2.out" }, ${T(tTien - 0.1)});`);
  A(`tl.to("#barG", { attr: { y: 800, height: 80 }, duration: 0.9, ease: "power2.out" }, ${T(at(10, "hàng") - 0.1)});`);
  fx.pop("#lbM", tTien - 0.1, { from: 0.6, kind: "swish" });
  fx.pop("#lbG", at(10, "hàng") - 0.1, { from: 0.6, kind: null });
  k.punch("t1", at(10, "điểm"), 1520, 700);
  k.idle("#common", at(10, "điểm") + 0.3, S[11], { y: 6, rot: 2 });

  // ===== Cảnh 12: định nghĩa lạm phát (chữ hiện theo lời, bút dạ tô "tăng liên tục", "ít hơn") =====
  const basketItems = [[-80, -40, "#e24b3b"], [-20, -60, "#f0b24a"], [40, -44, "#4ac08a"], [96, -30, "#e24b3b"], [-40, -10, "#9b6ad0"], [30, -12, "#f0b24a"]];
  k.scene(
    "l1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${PAPER}"/>
    <g transform="translate(1250 820)"><g id="basket" opacity="0">${basketItems.map(([x, y, c], n) => `<circle id="it${n}" cx="${x}" cy="${y}" r="40" fill="${c}" stroke="${INK}" stroke-width="5"/>`).join("")}
    <path d="M-170 -20 L170 -20 L130 130 L-130 130 Z" fill="#c8a165" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M-150 30 L150 30 M-140 80 L140 80" stroke="${INK}" stroke-width="5"/></g></g>
    ${coin("coin12", 900, 820, 90, "#e3b85c")}
  </svg>${kline("def", "LẠM PHÁT", { x: 910, top: 100, size: 150, color: RED, align: "center", sticker: true })}${kline("def1", "↑ Mặt bằng giá chung tăng liên tục", { x: 560, top: 375, size: 54 })}${kline("def2", "↓ Mỗi đồng tiền mua được ít hơn", { x: 560, top: 485, size: 54 })}`,
    { at: S[11] - 0.05, trans: "whip", shift: 200, drift: { z: 1.06, origin: "55% 35%" } }
  );
  fx.words("def", seq(11, "lạm", 2), { from: 2.2, kind: null });
  fx.sound(at(11, "lạm") + 0.1, "hit");
  const d1t = seq(11, "mặt", 7), d2t = seq(11, "mỗi", 7);
  fx.words("def1", [d1t[0] - 0.08, ...d1t]);
  fx.words("def2", [d2t[0] - 0.08, ...d2t]);
  [5, 6, 7].forEach((n) => fx.mark(`#def1-${n}`, d1t[n - 1] + 0.15, 0.25));
  [6, 7].forEach((n) => fx.mark(`#def2-${n}`, d2t[n - 1] + 0.15, 0.25));
  fx.pop("#coin12", at(11, "mỗi"), { from: 0.3 });
  fx.pop("#basket", at(11, "mua") - 0.1, { from: 0.4 });
  [0, 3, 5].forEach((n, j) => A(`tl.to("#it${n}", { y: -200, opacity: 0, duration: 0.3, ease: "power2.in" }, ${T(at(11, "ít") + j * 0.12)});`));
  fx.sound(at(11, "ít"), "pop");
  k.idle("#coin12", at(11, "mỗi") + 0.4, S[12], { y: 10, rot: 5 });

  // ===== Cảnh 13: lạm phát thấp, ổn định là bình thường; đo bằng CPI =====
  const pts = Array.from({ length: 13 }, (_, n) => [720 + n * 85, 640 - Math.sin(n * 0.9) * 22 - (n % 3) * 6]);
  k.scene(
    "c1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${PAPER}"/>
    <rect x="700" y="560" width="1060" height="140" fill="#4ac08a" opacity="0.18" id="band"/>
    <line x1="700" y1="840" x2="1780" y2="840" stroke="${INK}" stroke-width="6"/><line x1="700" y1="300" x2="700" y2="840" stroke="${INK}" stroke-width="6"/>
    <path id="line" d="M${pts.map((p) => p.join(" ")).join(" L")}" fill="none" stroke="#2f6b5a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1200" stroke-dashoffset="1200"/>
    ${banner("calm", 1240, 470, "THẤP · ỔN ĐỊNH", { size: 54, bg: "#4ac08a", color: INK, rot: -2 })}
    ${H("cpi", 1240, 220, "CPI", 150, NAVY)}${H("cpis", 1240, 290, "chỉ số giá tiêu dùng · đo hằng tháng", 40, "#6b625a")}
    ${H("ill", 1740, 880, "minh hoạ", 26, "#8a7f72", "end")}
    <g transform="translate(1660 360)"><text id="month" opacity="0" font-family="Inter" font-weight="800" font-size="44" fill="${INK}" text-anchor="middle">THÁNG 1</text></g>
  </svg>`,
    { at: S[12] - 0.05, trans: "wipe", shift: 260, drift: { z: 1.06, origin: "60% 55%", x: -30 } }
  );
  A(`tl.to("#line", { strokeDashoffset: 0, duration: 1.4, ease: "power1.inOut" }, ${T(at(12, "thấp") - 0.3)});`);
  fx.sound(at(12, "thấp") - 0.3, "pen");
  fx.pop("#ill", at(12, "thấp"), { kind: null });
  fx.slam("#calm", at(12, "ổn") + 0.05, { kind: "stamp", from: 1.8 });
  fx.pop("#month", at(12, "đo") - 0.1, { from: 0.6, kind: null });
  fx.count("#month", Array.from({ length: 12 }, (_, n) => `THÁNG ${n + 1}`), at(12, "đo") - 0.1, { step: 0.11, ding: false });
  fx.pop("#cpi", at(12, "cpi") - 0.15, { from: 1.8, ease: "power3.out", kind: "hit" });
  fx.pop("#cpis", at(12, "cpi") + 0.2, { from: 0.8, kind: null });
  k.punch("c1", at(12, "ổn"), 1240, 470);
  k.idle("#calm", at(12, "ổn") + 0.3, S[13], { y: 5, rot: 2 });

  // ===== Cảnh 14: đồng tiền vẫn vậy, thứ nó mua được thì khác =====
  k.scene(
    "h1",
    `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${PAPER}"/>
    ${coin("c14", 900, 470, 150, "#e3b85c")}
    ${banner("same", 900, 720, "VẪN VẬY", { size: 64, bg: "#fff", color: INK, rot: -3 })}
    ${bowl("bw", 1450, 520, 2.2)}
    ${stampBox("diff", 1450, 760, "ĐỔI KHÁC", { size: 72, rot: 6 })}
  </svg>`,
    { at: S[13] - 0.05, trans: "slice", shift: 220, drift: { z: 1.07, origin: "62% 55%" } }
  );
  fx.pop("#c14", at(13, "đồng") - 0.05, { from: 0.3 });
  fx.pop("#same", at(13, "vẫn"), { from: 0.6, kind: "tap" });
  fx.pop("#bw", at(13, "mua") - 0.1, { from: 0.3 });
  A(`tl.to("#bw", { scale: 0.55, transformOrigin: "50% 50%", duration: 0.5, ease: "back.in(1.6)" }, ${T(at(13, "đổi") - 0.25)});`);
  fx.slam("#diff", at(13, "khác"), { kind: "stamp" });
  k.punch("h1", at(13, "khác"), 1450, 700);
  k.idle("#c14", at(13, "đồng") + 0.3, S[14], { y: 12, rot: 6 });
  k.idle("#same", at(13, "vẫn") + 0.4, S[14], { y: 6, rot: 2 });
  k.idle("#diff", at(13, "khác") + 0.3, S[14], { y: 6, rot: -2 });

  // ===== Cảnh 15: thẻ cuối =====
  k.scene(
    "e1",
    k.endCard({
      title: "Lạm phát và CPI",
      sub: "Kinh tế vĩ mô cho nhà đầu tư · Bài 3/12",
      disclaimer: "Nội dung giáo dục, không phải khuyến nghị đầu tư. Hình ảnh minh hoạ.",
      cast: "an-wave",
    }),
    { at: S[14] - 0.05, trans: "iris", z: 850, drift: false }
  );
  A(`tl.fromTo(".end > *", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "power2.out" }, ${T(S[14] + 0.05)});`);
  // An vẫy chào: trồi lên từ mép dưới rồi lắc lư nhẹ
  A(`tl.fromTo("#end-cast", { y: 500 }, { y: 0, duration: 0.6, ease: "back.out(1.6)" }, ${T(S[14] + 0.3)});`);
  A(`tl.fromTo("#end-cast", { rotation: -2, transformOrigin: "50% 100%" }, { rotation: 2, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 4, immediateRender: false }, ${T(S[14] + 0.9)});`);
  fx.sound(S[14] + 0.3, "boing");
  k.captionsUntil(S[14] - 0.1);

  // ===== Nhãn thời gian góc trên trái =====
  [
    [at(0, "năm"), "1923"],
    [at(2, "năm", 0), "1918"],
    [tSau, "1923"],
    [S[4] + 0.3, "1923"],
    [S[5] - 0.05, "THỜI AUGUSTUS"],
    [S[7] - 0.05, "NĂM 268"],
    [at(8, "tháng"), "9/1985"],
    [S[9] - 0.05, null],
    [S[12] - 0.05, "NGÀY NAY"],
    [S[13] - 0.05, null],
  ].forEach(([t, txt]) => k.stamp(t, txt));
  // Năm chạy lùi khi về La Mã
  fx.count("#stamp", ["1923", "1700", "1400", "1100", "800", "500", "268", "100", "NĂM 1"], at(4, "bắt") - 0.2, { step: 0.15, ding: false });
}
