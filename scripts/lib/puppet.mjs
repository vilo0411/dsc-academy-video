// Nhân vật rối (cut-out) kiểu hoạt hình lịch sử: đầu to, viền đậm, màu phẳng.
// Một khung xương dùng chung cho mọi vai; vai khác nhau chỉ ở "trang phục" (tóc, áo, phụ kiện).
// Miệng đổi theo mốc của Rhubarb Lip Sync (A–H, X); mắt, lông mày, tay, đầu tween bằng GSAP.
//
// Toạ độ riêng của nhân vật: khung 400 × 720, chân chạm y = 710, quay mặt sang phải.
// Góc tính bằng độ; dương = xoay theo chiều kim đồng hồ (tay đưa ra sau, đầu cúi về phía trước).

const INK = "#1d1a1a";
const MOUTH_DARK = "#4a1d1f";
const TONGUE = "#e0707a";

export const PIVOT = {
  armB: [152, 428],
  foreB: [152, 512],
  armF: [248, 428],
  foreF: [248, 512],
  head: [200, 405],
  lean: [200, 710],
};

// [tay sau, cẳng tay sau, tay trước, cẳng tay trước, đầu, nghiêng người]
export const POSES = {
  idle: [8, 4, -8, -4, 0, 0],
  holdUp: [14, 6, -150, -18, -6, -2], // giơ vật lên khoe
  explain: [10, 4, -62, -58, 3, 1], // ngửa tay giải thích
  count: [10, 4, -78, -70, -4, 0], // giơ tay đếm
  shrug: [42, 100, -42, -100, 6, 0],
  gasp: [46, 96, -46, -96, -4, -2], // hai tay giơ lên ngạc nhiên
  hips: [58, -92, -58, 92, 0, 0],
  wave: [10, 4, -150, -40, -4, 0],
  point: [10, 4, -96, -8, -3, 0], // chỉ thẳng về phía trước
  headHold: [120, 80, -120, -80, 4, 0],
};

// Biểu cảm khi không nói (miệng nghỉ) + mắt + lông mày
export const EXPRS = {
  happy: { eyes: "open", brows: "neutral", mouth: "smile" },
  excited: { eyes: "open", brows: "raised", mouth: "grin" },
  nostalgic: { eyes: "happy", brows: "neutral", mouth: "smile" },
  sad: { eyes: "open", brows: "worried", mouth: "frown" },
  surprised: { eyes: "wide", brows: "raised", mouth: "o" },
  smug: { eyes: "lidded", brows: "neutral", mouth: "smirk" },
  neutral: { eyes: "open", brows: "neutral", mouth: "flat" },
};

const EYES = ["open", "happy", "wide", "lidded"];
const BROWS = ["neutral", "raised", "worried", "angry"];
const REST = ["smile", "grin", "frown", "o", "flat", "smirk"];
const LIPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const r1 = (n) => Number(n.toFixed(3));
const rot = (a, [x, y]) => `rotate(${a} ${x} ${y})`;

// Chi thể = nét viền đen dày + nét màu bên trong (kỹ thuật vẽ cut-out đơn giản nhất).
function limb(x1, y1, x2, y2, color, w = 30) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${w + 12}" stroke-linecap="round"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

function arm(id, side, c, front) {
  const [sx, sy] = PIVOT[`arm${side}`];
  const ey = PIVOT[`fore${side}`][1];
  const sleeve = c.shirt;
  const fore = c.longSleeve ? sleeve : c.skin;
  const extra = front ? c.hand || "" : "";
  return `<g id="${id}-arm${side}" transform="rotate(0 ${sx} ${sy})">
      ${limb(sx, sy, sx, ey, sleeve)}
      <g id="${id}-fore${side}" transform="rotate(0 ${sx} ${ey})">
        ${limb(sx, ey, sx, ey + 80, fore, c.longSleeve ? 30 : 24)}
        <circle cx="${sx}" cy="${ey + 92}" r="19" fill="${c.skin}" stroke="${INK}" stroke-width="6"/>
        ${extra.replaceAll("$X", sx).replaceAll("$Y", ey + 92).replaceAll("$ID", id)}
      </g>
    </g>`;
}

function eyes(id, skin) {
  const one = (cx, k) => {
    const shapes = {
      open: `<ellipse cx="0" cy="0" rx="17" ry="21" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="5" cy="2" r="9" fill="${INK}"/>`,
      wide: `<ellipse cx="0" cy="-2" rx="21" ry="27" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="3" cy="0" r="6" fill="${INK}"/>`,
      happy: `<path d="M-17 6 Q0 -16 17 6" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
      lidded: `<ellipse cx="0" cy="0" rx="17" ry="21" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="5" cy="4" r="9" fill="${INK}"/><path d="M-19 -2 L19 -2 L19 -24 L-19 -24 Z" fill="${skin}"/><line x1="-19" y1="-2" x2="19" y2="-2" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    };
    return `<g transform="translate(${cx} 238)">${EYES.map(
      (e) => `<g class="${id}-eye-${e}"${e === k ? "" : ` opacity="0"`}>${shapes[e]}</g>`
    ).join("")}</g>`;
  };
  // Nhóm chớp mắt: co theo trục dọc quanh tâm mắt
  return `<g id="${id}-blink" transform="translate(0 0)">${one(184, "open")}${one(250, "open")}</g>`;
}

function brows(id) {
  const shapes = {
    neutral: ["M-20 2 Q0 -8 20 0", "M-20 0 Q0 -8 20 2"],
    raised: ["M-20 -12 Q0 -26 20 -14", "M-20 -14 Q0 -26 20 -12"],
    worried: ["M-20 4 Q2 0 20 -10", "M-20 -10 Q-2 0 20 4"],
    angry: ["M-20 -8 Q2 -4 20 8", "M-20 8 Q-2 -4 20 -8"],
  };
  return BROWS.map(
    (b) => `<g class="${id}-brow-${b}"${b === "neutral" ? "" : ` opacity="0"`} fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round">
        <path transform="translate(184 200)" d="${shapes[b][0]}"/><path transform="translate(250 200)" d="${shapes[b][1]}"/></g>`
  ).join("");
}

function mouths(id) {
  const teeth = (w, y) => `<path d="M${-w} ${y} L${w} ${y} L${w * 0.8} ${y + 7} L${-w * 0.8} ${y + 7} Z" fill="#fff"/>`;
  const open = (w, top, bot, extra = "") =>
    `<path d="M${-w} ${top} Q0 ${top - 6} ${w} ${top} Q${w * 0.7} ${bot} 0 ${bot} Q${-w * 0.7} ${bot} ${-w} ${top} Z" fill="${MOUTH_DARK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>${extra}`;
  const line = (d, w = 7) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
  const shapes = {
    // Miệng nghỉ theo biểu cảm
    smile: line("M-30 -4 Q0 22 30 -4"),
    grin: open(32, -6, 30, `${teeth(24, -6)}<ellipse cx="0" cy="20" rx="13" ry="6" fill="${TONGUE}"/>`),
    frown: line("M-26 12 Q0 -8 26 12"),
    o: `<ellipse cx="0" cy="6" rx="13" ry="17" fill="${MOUTH_DARK}" stroke="${INK}" stroke-width="5"/>`,
    flat: line("M-22 4 L22 4"),
    smirk: line("M-24 6 Q8 10 28 -6"),
    // Hình miệng Rhubarb (Preston Blair)
    A: line("M-20 4 L20 4", 8),
    B: open(24, -2, 14, teeth(20, -2)),
    C: open(28, -6, 24, teeth(22, -6)),
    D: open(30, -10, 38, `${teeth(24, -10)}<ellipse cx="0" cy="28" rx="14" ry="7" fill="${TONGUE}"/>`),
    E: `<ellipse cx="0" cy="8" rx="17" ry="20" fill="${MOUTH_DARK}" stroke="${INK}" stroke-width="5"/>`,
    F: `<ellipse cx="0" cy="6" rx="10" ry="12" fill="${MOUTH_DARK}" stroke="${INK}" stroke-width="5"/>`,
    G: open(24, -2, 12, `<path d="M-18 -2 L18 -2 L16 8 L-16 8 Z" fill="#fff"/>`),
    H: open(28, -6, 26, `<ellipse cx="0" cy="2" rx="12" ry="8" fill="${TONGUE}"/>`),
  };
  return Object.entries(shapes)
    .map(([k, v]) => `<g class="${id}-m-${k}"${k === "smile" ? "" : ` opacity="0"`}>${v}</g>`)
    .join("");
}

// Trang phục: mọi khác biệt giữa các vai nằm ở đây.
export const COSTUMES = {
  base: { skin: "#d9d4cc", shirt: "#bdb6ab", pants: "#8d867b", shoes: "#5a554e" },
  minh: {
    skin: "#f6d7b8",
    shirt: "#8fc3e8",
    pants: "#d9c19a",
    shoes: "#3b3a40",
    hairBack: "",
    hair: `<path d="M104 178 Q92 58 204 54 Q306 52 300 150 Q296 122 262 112 Q226 102 196 124 Q170 108 138 124 Q114 140 112 182 Z" fill="#1f1b1c" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`,
    face: `<g fill="none" stroke="${INK}" stroke-width="5"><circle cx="184" cy="238" r="31"/><circle cx="250" cy="238" r="31"/><path d="M215 236 Q217 230 219 236"/><line x1="153" y1="232" x2="118" y2="226"/></g>`,
    collar: `<path d="M172 404 L200 436 L228 404" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`,
    hand: `<g id="$ID-note" opacity="0" transform="translate($X $Y) rotate(-12)"><rect x="-10" y="-74" width="128" height="62" rx="5" fill="#7fc8b5" stroke="${INK}" stroke-width="5"/><rect x="2" y="-64" width="104" height="42" rx="3" fill="none" stroke="#2f7c6a" stroke-width="3"/><circle cx="76" cy="-43" r="13" fill="#bfe6da" stroke="#2f7c6a" stroke-width="3"/><text x="10" y="-36" font-family="Inter" font-weight="800" font-size="20" fill="#1f5a4c">100K</text></g>`,
  },
  ba: {
    skin: "#efc9a6",
    shirt: "#7b3f6e",
    pattern: "#f3e6f0",
    longSleeve: true,
    pants: "#232026",
    shoes: "#6b4b3a",
    scale: 0.88,
    lean: 4,
    hairBack: `<circle cx="112" cy="132" r="44" fill="#c8ccd4" stroke="${INK}" stroke-width="6"/>`,
    hair: `<path d="M102 196 Q90 62 206 58 Q306 58 298 168 Q292 118 252 110 Q206 102 170 118 Q130 130 118 196 Z" fill="#c8ccd4" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M150 90 Q190 74 240 84" fill="none" stroke="#9ea3ad" stroke-width="5" stroke-linecap="round"/>`,
    face: `<g fill="none" stroke="#b07f63" stroke-width="4" stroke-linecap="round"><path d="M170 268 Q184 274 198 268"/><path d="M238 270 Q250 276 262 270"/><path d="M192 300 Q186 316 194 330"/><path d="M262 296 Q272 312 264 326"/></g>`,
    collar: `<g fill="#fff" stroke="${INK}" stroke-width="3"><circle cx="200" cy="452" r="5"/><circle cx="200" cy="492" r="5"/><circle cx="200" cy="532" r="5"/></g>`,
    hand: `<ellipse cx="$X" cy="$Y" rx="17" ry="7" transform="translate(0 -22)" fill="none" stroke="#2fa37a" stroke-width="7"/>`,
  },
  an: {
    skin: "#f6d7b8",
    shirt: "#10c9a0",
    pants: "#0b1237",
    shoes: "#2c2b30",
    hair: `<path d="M104 170 Q96 60 206 56 Q304 56 300 160 Q284 96 226 104 Q236 120 214 126 Q196 104 160 118 Q120 128 110 172 Z" fill="#2a2120" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`,
    collar: `<path d="M168 404 L200 430 L232 404" fill="#0b1237" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><text x="218" y="478" font-family="Inter" font-weight="800" font-size="22" fill="#0b1237">DSC</text>`,
  },
  pilot: {
    skin: "#efc9a6",
    shirt: "#1f3a6e",
    longSleeve: true,
    pants: "#1f3a6e",
    shoes: "#141414",
    hair: `<path d="M104 160 Q100 96 140 86 L290 86 Q302 110 300 160 Q280 130 200 128 Q130 130 104 160 Z" fill="#3a2e2a" stroke="${INK}" stroke-width="6"/><path d="M92 112 Q100 40 206 34 Q308 40 312 112 Z" fill="#1f3a6e" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M84 112 L330 112 Q338 128 300 132 L110 132 Q78 128 84 112 Z" fill="#141414" stroke="${INK}" stroke-width="6"/><circle cx="214" cy="74" r="14" fill="#e3b85c" stroke="${INK}" stroke-width="4"/>`,
    collar: `<path d="M168 404 L200 440 L232 404" fill="#fff" stroke="${INK}" stroke-width="5"/><path d="M196 420 L204 420 L208 470 L200 480 L192 470 Z" fill="#c2462f"/><g stroke="#e3b85c" stroke-width="6"><line x1="146" y1="420" x2="176" y2="420"/><line x1="226" y1="420" x2="256" y2="420"/></g>`,
  },
  frau: {
    skin: "#f1d2b4",
    shirt: "#3f5a45",
    longSleeve: true,
    pants: "#3f5a45",
    shoes: "#3a2a22",
    apron: "#efe7d6",
    hairBack: `<path d="M100 150 Q80 260 120 330 L140 250 Z" fill="#8a3b2e" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`,
    hair: `<path d="M98 210 Q86 52 204 50 Q314 52 304 196 Q300 128 262 110 Q204 92 150 112 Q112 132 108 214 Z" fill="#8a3b2e" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M150 100 Q200 84 262 100" fill="none" stroke="#b5564a" stroke-width="6" stroke-linecap="round"/>`,
  },
  soldier: {
    skin: "#e8bf98",
    shirt: "#b8322a",
    pants: "#7a5536",
    shoes: "#6b4b2f",
    hair: `<path d="M100 196 Q92 60 204 56 Q312 58 304 196 L292 196 Q292 130 270 128 L136 128 Q114 130 112 196 Z" fill="#9aa0a8" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M110 70 Q200 -20 300 66 Q296 40 200 22 Q112 40 110 70 Z" fill="#c8322a" stroke="${INK}" stroke-width="6"/><rect x="100" y="120" width="210" height="20" rx="8" fill="#7d838b" stroke="${INK}" stroke-width="5"/>`,
    collar: `<rect x="134" y="560" width="132" height="22" rx="6" fill="#7a5536" stroke="${INK}" stroke-width="5"/>`,
  },
  emperor: {
    faceless: true,
    skin: "#262222",
    shirt: "#262222",
    longSleeve: true,
    pants: "#262222",
    shoes: "#262222",
    hair: `<g fill="#d9b44a" stroke="${INK}" stroke-width="4">${[0, 1, 2, 3, 4, 5, 6].map((k) => `<ellipse cx="${116 + k * 28}" cy="${92 - Math.sin((k / 6) * Math.PI) * 26}" rx="18" ry="9" transform="rotate(${-40 + k * 13} ${116 + k * 28} ${92 - Math.sin((k / 6) * Math.PI) * 26})"/>`).join("")}</g>`,
    collar: `<path d="M150 410 L250 600 L232 610 L140 430 Z" fill="#6b2a7a" stroke="${INK}" stroke-width="4"/>`,
  },
  pho: {
    skin: "#e8b98f",
    shirt: "#f4f1ea",
    pants: "#4a5a7a",
    shoes: "#2c2b30",
    apron: "#c2462f",
    hair: `<path d="M106 170 Q100 80 200 72 Q300 70 296 160 Q280 120 200 116 Q130 118 106 170 Z" fill="#3a2e2a" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`,
    face: `<path d="M190 292 Q222 278 256 292 Q244 304 222 298 Q200 304 190 292 Z" fill="#3a2e2a" stroke="${INK}" stroke-width="4"/>`,
    collar: `<path d="M150 410 Q140 470 160 500 L182 500 Q170 460 176 410 Z" fill="#fff" stroke="${INK}" stroke-width="5"/><path d="M152 440 L176 440 M155 470 L175 470" stroke="#3f7fc2" stroke-width="5"/>`,
  },
};

// SVG của một nhân vật, đặt ở (x, y = mặt đất), quay phải (dir = 1) hoặc trái (dir = -1).
export function puppetSVG(id, costumeName, { x, y, dir = 1, scale = 1 } = {}) {
  const c = COSTUMES[costumeName];
  const s = scale * (c.scale || 1);
  const pattern = c.pattern
    ? `<pattern id="${id}-pat" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="4" fill="${c.pattern}"/><circle cx="25" cy="25" r="3" fill="${c.pattern}"/></pattern>`
    : "";
  const shirtFill = c.pattern ? `url(#${id}-pat)` : c.shirt;
  const torsoBottom = c.longSleeve ? 640 : 600;
  return `
  <g id="${id}" transform="translate(${x} ${y}) scale(${dir * s} ${s}) translate(-200 -710)">
    <defs>${pattern}</defs>
    <ellipse cx="200" cy="712" rx="120" ry="14" fill="${INK}" opacity="0.12"/>
    <g id="${id}-hop" transform="translate(0 0)">
    <g id="${id}-lean" transform="${rot(c.lean || 0, PIVOT.lean)}">
    <g id="${id}-bob" transform="translate(0 0)">
      ${arm(id, "B", c, false)}
      <rect x="152" y="580" width="44" height="118" rx="14" fill="${c.pants}" stroke="${INK}" stroke-width="6"/>
      <rect x="204" y="580" width="44" height="118" rx="14" fill="${c.pants}" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="182" cy="702" rx="34" ry="14" fill="${c.shoes}" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="234" cy="702" rx="34" ry="14" fill="${c.shoes}" stroke="${INK}" stroke-width="6"/>
      <path d="M150 404 Q200 390 250 404 Q268 420 270 ${torsoBottom} L130 ${torsoBottom} Q132 420 150 404 Z" fill="${c.shirt}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      ${c.pattern ? `<path d="M150 404 Q200 390 250 404 Q268 420 270 ${torsoBottom} L130 ${torsoBottom} Q132 420 150 404 Z" fill="${shirtFill}"/>` : ""}
      ${c.apron ? `<path d="M156 470 L244 470 L250 650 L150 650 Z" fill="${c.apron}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` : ""}
      ${c.collar || ""}
      <g id="${id}-head" transform="${rot(0, PIVOT.head)}">
        ${c.hairBack || ""}
        <path d="M108 140 Q108 64 202 64 Q296 64 296 140 L292 300 Q288 398 204 400 Q120 398 112 300 Z" fill="${c.skin}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
        <ellipse cx="112" cy="252" rx="16" ry="24" fill="${c.skin}" stroke="${INK}" stroke-width="6"/>
        ${c.faceless ? "" : `<ellipse cx="170" cy="300" rx="16" ry="9" fill="#f08c8c" opacity="0.35"/><ellipse cx="266" cy="300" rx="14" ry="9" fill="#f08c8c" opacity="0.35"/>
        ${eyes(id, c.skin)}
        ${brows(id)}
        <path d="M232 256 Q250 278 230 286" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
        <g transform="translate(222 326)">${mouths(id)}</g>`}
        ${c.face || ""}
        ${c.hair || ""}
      </g>
      ${arm(id, "F", c, true)}
    </g></g></g>
  </g>`;
}

// ---- Hoạt cảnh: trả về các dòng lệnh GSAP (chuỗi) để chèn vào timeline ----

export function pose(id, name, t, { dur = 0.45, lean = 0 } = {}) {
  const [aB, fB, aF, fF, head, l] = POSES[name] || POSES.idle;
  const ease = "back.out(1.5)";
  const to = (part, a, pv, e = ease) =>
    `tl.to("#${id}-${part}", { attr: { transform: "${rot(a, PIVOT[pv])}" }, duration: ${dur}, ease: "${e}" }, ${r1(t)});`;
  return [
    to("armB", aB, "armB"),
    to("foreB", fB, "foreB"),
    to("armF", aF, "armF"),
    to("foreF", fF, "foreF"),
    to("head", head, "head", "power2.out"),
    to("lean", l + lean, "lean", "power2.out"),
  ];
}

export function expr(id, name, t) {
  const e = EXPRS[name] || EXPRS.neutral;
  const out = [];
  EYES.forEach((k) => out.push(`tl.set(".${id}-eye-${k}", { opacity: ${k === e.eyes ? 1 : 0} }, ${r1(t)});`));
  BROWS.forEach((k) => out.push(`tl.set(".${id}-brow-${k}", { opacity: ${k === e.brows ? 1 : 0} }, ${r1(t)});`));
  out.push(...mouthTo(id, e.mouth, t));
  return out;
}

function mouthTo(id, shape, t) {
  return [...REST, ...LIPS].map((k) => `tl.set(".${id}-m-${k}", { opacity: ${k === shape ? 1 : 0} }, ${r1(t)});`);
}

// Nhép miệng: cues = [{start, value}] từ Rhubarb (đã cộng thời điểm bắt đầu câu). X = miệng nghỉ.
// Đầu gật nhẹ ở các âm mở rộng (C, D) để lời nói có lực.
export function lipSync(id, cues, rest, { from, to }) {
  const out = [];
  let lastNod = -1;
  for (const c of cues) {
    if (c.start < from - 0.01 || c.start > to + 0.2) continue;
    const shape = c.value === "X" ? rest : c.value;
    // Chỉ đổi những hình cần thiết để timeline gọn: ẩn tất cả rồi hiện một
    out.push(...mouthTo(id, shape, c.start));
    if ((c.value === "D" || c.value === "C") && c.start - lastNod > 0.7) {
      out.push(
        `tl.to("#${id}-hop", { attr: { transform: "translate(0 -6)" }, duration: 0.12, ease: "power1.out", yoyo: true, repeat: 1 }, ${r1(c.start)});`
      );
      lastNod = c.start;
    }
  }
  out.push(...mouthTo(id, rest, to + 0.05));
  return out;
}

// Chớp mắt theo lịch cố định (lệch pha theo nhân vật) để render luôn giống nhau.
export function blinks(id, total, phase = 0) {
  const gaps = [3.3, 2.6, 4.1, 3.0, 3.7, 2.4];
  const out = [];
  let t = 1.1 + phase;
  let i = 0;
  while (t < total - 0.4) {
    out.push(
      `tl.to("#${id}-blink", { attr: { transform: "translate(0 238) scale(1 0.08) translate(0 -238)" }, duration: 0.07, ease: "power1.in", yoyo: true, repeat: 1 }, ${r1(t)});`
    );
    t += gaps[i++ % gaps.length];
  }
  return out;
}

export function breathe(id, total, phase = 0) {
  const cycles = Math.max(1, Math.floor(total / 2.6));
  return [
    `tl.to("#${id}-bob", { attr: { transform: "translate(0 -5)" }, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: ${cycles * 2 - 1} }, ${r1(0.4 + phase)});`,
  ];
}

// Nhảy nhỏ (phấn khích / giật mình)
export function hop(id, t, h = 26) {
  return [
    `tl.to("#${id}-hop", { attr: { transform: "translate(0 ${-h})" }, duration: 0.18, ease: "power2.out" }, ${r1(t)});`,
    `tl.to("#${id}-hop", { attr: { transform: "translate(0 0)" }, duration: 0.3, ease: "bounce.out" }, ${r1(t + 0.18)});`,
  ];
}

// Lắc nhẹ cẳng tay trước theo nhịp nói
export function gestureBeats(id, name, from, to, every = 1.1) {
  const fF = (POSES[name] || POSES.idle)[3];
  const out = [];
  for (let t = from + 0.6; t < to - 0.4; t += every) {
    out.push(
      `tl.to("#${id}-foreF", { attr: { transform: "${rot(fF - 14, PIVOT.foreF)}" }, duration: 0.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, ${r1(t)});`
    );
  }
  return out;
}

// Anticipation (nguyên lý hoạt hình): nhún xuống một nhịp ngắn trước động tác chính rồi bật lại
export function anticipate(id, t, d = 10) {
  return [
    `tl.to("#${id}-hop", { attr: { transform: "translate(0 ${d})" }, duration: 0.08, ease: "power2.in" }, ${r1(t)});`,
    `tl.to("#${id}-hop", { attr: { transform: "translate(0 0)" }, duration: 0.22, ease: "back.out(3)" }, ${r1(t + 0.08)});`,
  ];
}
