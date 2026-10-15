// Phong cách và quy chuẩn cho video ngắn 9:16 (format "shorts-*"), dùng bởi scripts/build-shorts.mjs,
// scripts/lib/thumbs.mjs và lint. Học từ AI Zening Studio (docs/studio-aizening-optimization.md):
// mỗi preset gói màu + bộ tiếng động + không khí nhạc; mỗi cue là một hiệu ứng theo ý câu.

export const W = 1080;
export const H = 1920;

// Vùng an toàn TikTok/Reels/Shorts: trên 15% (thanh trạng thái, tab), dưới 25% (tên kênh, mô tả),
// phải 18% (nút tim, bình luận, chia sẻ). Chữ và hình chính nằm trong khung này.
export const SAFE = { top: 288, bottom: 1440, left: 64, right: W - 194 };
SAFE.cx = (SAFE.left + SAFE.right) / 2;
SAFE.w = SAFE.right - SAFE.left;
// Hook 2 tầng ở 25–35% chiều cao, phụ đề chữ chạy ở 60–70%.
export const HOOK_Y = 480;
export const CAP_Y = 1180;

// Preset chỉ gồm những phong cách hợp với nội dung giáo dục tài chính của DSC
// (bán hàng, ẩm thực, thời trang… trong danh sách 20 phong cách của AI Zening thì không dùng).
export const PRESETS = {
  dsc: { label: "Thương hiệu DSC", bg: "#0B1237", bg2: "#1c2a6b", ink: "#FFFFFF", muted: "#C9D0E3", accent: "#10F3BD", hi: "#FACC15", key: "#A78BFA", mark: "#FB923C", up: "#22C55E", down: "#E5484D", card: "rgba(255,255,255,0.08)", cardLine: "rgba(255,255,255,0.18)", sfxSet: "playful", music: { mood: "upbeat", energy: 4 } },
  taichinh: { label: "Tài chính · số liệu", bg: "#0F172A", bg2: "#1E293B", ink: "#F8FAFC", muted: "#94A3B8", accent: "#EAB308", hi: "#FACC15", key: "#A78BFA", mark: "#FB923C", up: "#22C55E", down: "#EF4444", card: "rgba(255,255,255,0.07)", cardLine: "rgba(234,179,8,0.35)", sfxSet: "paper", music: { mood: "confident", energy: 4 } },
  kienthuc: { label: "Kiến thức chuyên gia", bg: "#F7F4EE", bg2: "#ECE6DA", ink: "#1D1A1A", muted: "#57534E", accent: "#2563EB", hi: "#FDE047", key: "#7C3AED", mark: "#EA580C", up: "#15803D", down: "#DC2626", card: "#FFFFFF", cardLine: "#D6D3D1", sfxSet: "soft", music: { mood: "curious", energy: 2 } },
  giaoduc: { label: "Bài giảng · học tập", bg: "#1F3B2D", bg2: "#2C5240", ink: "#F5F5EF", muted: "#C7D2C9", accent: "#FDE68A", hi: "#FDE68A", key: "#C4B5FD", mark: "#FDBA74", up: "#86EFAC", down: "#FCA5A5", card: "rgba(255,255,255,0.08)", cardLine: "rgba(255,255,255,0.25)", sfxSet: "soft", music: { mood: "playful", energy: 3 } },
  tintuc: { label: "Tin tức · điều tra", bg: "#111111", bg2: "#2A0A10", ink: "#FFFFFF", muted: "#D4D4D4", accent: "#E11D48", hi: "#FFFFFF", key: "#FB7185", mark: "#E11D48", up: "#22C55E", down: "#E11D48", card: "rgba(255,255,255,0.07)", cardLine: "rgba(225,29,72,0.5)", sfxSet: "news", music: { mood: "mystery", energy: 3 } },
};

// Cue (hiệu ứng theo ý câu) → trường bắt buộc. Xem bảng trong CLAUDE.md mục 4f.
export const CUES = {
  hook_2tier: ["tier1", "tier2"],
  big_counter: ["value"],
  ab_compare: ["left", "right"],
  list: ["items"],
  steps: ["items"],
  chapter: ["title"],
  statement: ["text"],
  arrow: ["dir"],
  question: ["text"],
  outro_cta: ["headline", "disclaimer"],
};

// Tên tiếng động quen dùng (AI Zening, CapCut) → tiếng tổng hợp trong scripts/lib/sound.mjs
export const SFX_ALIAS = {
  sub_boom: "hit", sub_thud: "hit", sub_drop: "hit", punch: "hit", boom: "hit",
  whoosh: "whoosh", whoosh_soft: "swish", swish: "swish", cinematic_whoosh: "whoosh",
  pop: "pop", bubble: "boing", ding: "ding", tick: "tick", click: "tap", tap: "tap",
  typewriter: "key", key: "key", riser: "riser", glitch: "glitch", marker: "pen", pen: "pen",
  tape: "tape", snap: "snap", split_snap: "snap", chime: "chime", notification: "chime", cash: "success", success: "success",
};

// Biểu tượng SVG (không dùng emoji: máy chủ GitHub không có font emoji màu)
export const ICONS = {
  up: '<path d="M50 8 L92 56 H64 V92 H36 V56 H8 Z"/>',
  down: '<path d="M50 92 L92 44 H64 V8 H36 V44 H8 Z"/>',
  warn: '<path d="M50 6 L96 90 H4 Z"/><rect x="45" y="34" width="10" height="30" fill="#000" opacity=".55"/><rect x="45" y="70" width="10" height="10" fill="#000" opacity=".55"/>',
  check: '<path d="M10 52 L38 80 L90 22" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>',
  coin: '<circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="30" fill="#000" opacity=".18"/>',
  clock: '<circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="10"/><path d="M50 24 V52 L68 62" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>',
  bulb: '<path d="M50 6 C26 6 14 26 18 44 C21 58 32 64 34 76 H66 C68 64 79 58 82 44 C86 26 74 6 50 6 Z"/><rect x="36" y="82" width="28" height="10" rx="4"/>',
  question: '<circle cx="50" cy="50" r="44"/><text x="50" y="70" text-anchor="middle" font-size="60" font-weight="800" fill="#000" opacity=".6">?</text>',
};
export const icon = (name, color, size = 120) =>
  ICONS[name] ? `<svg class="ico" viewBox="0 0 100 100" width="${size}" height="${size}" style="color:${color};fill:${color}">${ICONS[name]}</svg>` : "";

// Bộ chữ (assets/fonts-shorts, giấy phép SIL OFL, đủ dấu tiếng Việt). Kiểu AI Zening: một dòng nhỏ chữ có chân
// nghiêng đi với một dòng lớn chữ hẹp đậm viết hoa; phụ đề chữ thường không chân.
export const FONTS_DIR = "assets/fonts-shorts";
export const F = {
  body: '"Be Vietnam Pro", "Inter", sans-serif', // phụ đề, chữ thường
  cond: '"Barlow Condensed", "Inter", sans-serif', // tiêu đề lớn, số
  serif: '"Playfair Display", Georgia, serif', // dòng nhỏ nghiêng, kể chuyện, mờ ảo
  hand: '"Dancing Script", cursive', // viết tay
};
export const fontFaces = `
@font-face { font-family: "Be Vietnam Pro"; src: url("fonts/BeVietnamPro-SemiBold.ttf"); font-weight: 600; }
@font-face { font-family: "Be Vietnam Pro"; src: url("fonts/BeVietnamPro-ExtraBold.ttf"); font-weight: 800; }
@font-face { font-family: "Barlow Condensed"; src: url("fonts/BarlowCondensed-SemiBold.ttf"); font-weight: 600; }
@font-face { font-family: "Barlow Condensed"; src: url("fonts/BarlowCondensed-ExtraBold.ttf"); font-weight: 800; }
@font-face { font-family: "Playfair Display"; src: url("fonts/PlayfairDisplay-Italic.ttf"); font-style: italic; font-weight: 400 900; }
@font-face { font-family: "Dancing Script"; src: url("fonts/DancingScript.ttf"); font-weight: 400 700; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-SemiBold.otf"); font-weight: 600; }
@font-face { font-family: "Inter"; src: url("fonts/Inter-ExtraBold.otf"); font-weight: 800; }`;
// Chép font vào dự án HyperFrames
export function copyFonts(fs, path, proj) {
  const out = path.join(proj, "fonts");
  fs.mkdirSync(out, { recursive: true });
  for (const dir of ["assets/fonts", FONTS_DIR]) for (const f of fs.readdirSync(dir)) if (/\.(ttf|otf)$/.test(f)) fs.copyFileSync(path.join(dir, f), path.join(out, f));
}

export function presetFor(content) {
  const p = PRESETS[content.preset || "dsc"];
  if (!p) throw new Error(`preset "${content.preset}" không có (${Object.keys(PRESETS).join(", ")})`);
  const s = content.style || {};
  return { ...p, hi: s.highlight_color || p.hi, accent: s.secondary_color || p.accent, key: s.keyword_color || p.key };
}
