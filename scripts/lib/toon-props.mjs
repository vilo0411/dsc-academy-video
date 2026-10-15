// Đạo cụ vẽ sẵn cho định dạng "toon" (SVG, nét đen dày, màu phẳng).
// Hàm có `id` trả về nhóm ẩn sẵn (opacity 0) để hiện bằng fx.pop / fx.slam; toạ độ là tâm vật.
import { INK } from "./toon-fx.mjs";

// Tờ tiền giấy (không ẩn, dùng để ghép vào xấp tiền / xe cút kít)
export const note = (x, y, rot, color = "#7fc8b5", txt = "MÁC") =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-70" y="-34" width="140" height="68" rx="5" fill="${color}" stroke="${INK}" stroke-width="5"/><rect x="-58" y="-24" width="116" height="48" rx="3" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="3"/>${txt ? `<text y="10" font-family="Inter" font-weight="800" font-size="24" fill="${INK}" fill-opacity="0.7" text-anchor="middle">${txt}</text>` : ""}</g>`;

// Xấp tiền buộc dây
export const bundle = (id, x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><g id="${id}" opacity="0">${note(-8, 18, -6, "#b9a7d6", "")}${note(6, 0, 4, "#a8c98f", "")}${note(0, -16, -2, "#e5c07b")}<rect x="-14" y="-52" width="28" height="104" rx="4" fill="#c2462f" stroke="${INK}" stroke-width="4"/></g></g>`;

// Bó củi
export const logs = (id, x, y) =>
  `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0">${[[-50, 20], [50, 20], [0, -24]]
    .map(([dx, dy]) => `<rect x="${dx - 60}" y="${dy - 22}" width="120" height="44" rx="22" fill="#9a6a3f" stroke="${INK}" stroke-width="5"/><ellipse cx="${dx + 50}" cy="${dy}" rx="14" ry="20" fill="#d9b27c" stroke="${INK}" stroke-width="5"/>`)
    .join("")}</g></g>`;

// Đồng xu có hình bóng mặt người (mặt xu có id `${id}-face` để đổi màu)
export const coin = (id, x, y, r, fill = "#cfd5dc") =>
  `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0"><circle r="${r}" fill="${fill}" stroke="${INK}" stroke-width="8" id="${id}-face"/><circle r="${r * 0.8}" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="5" stroke-dasharray="6 8"/><path transform="scale(${r / 100})" d="M-26 -50 Q20 -62 30 -20 Q36 0 22 12 L30 28 L10 30 Q8 48 -16 52 Q-40 40 -38 6 Q-50 -30 -26 -50 Z" fill="${INK}" fill-opacity="0.28"/></g></g>`;

// Ổ bánh mì
export const bread = (id, x, y) =>
  `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0"><path d="M-120 20 Q-130 -40 -40 -52 L60 -52 Q130 -44 124 18 Q118 44 0 44 Q-114 44 -120 20 Z" fill="#d79a4e" stroke="${INK}" stroke-width="7"/><path d="M-60 -40 Q-50 -10 -40 -38 M-10 -44 Q0 -14 10 -42 M40 -44 Q50 -14 60 -40" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g></g>`;

// Bát phở bốc khói
export const bowl = (id, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><g id="${id}" opacity="0">
  <path d="M-14 -40 Q-24 -60 -12 -76 M6 -40 Q-4 -60 8 -76" fill="none" stroke="#9aa" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="0" cy="-24" rx="62" ry="14" fill="#f5e3b3" stroke="${INK}" stroke-width="6"/>
  <path d="M-62 -24 Q-58 30 0 34 Q58 30 62 -24 Q30 -12 0 -12 Q-30 -12 -62 -24 Z" fill="#fff" stroke="${INK}" stroke-width="6"/>
  <path d="M-50 2 Q0 14 50 2" fill="none" stroke="#3f7fc2" stroke-width="6"/></g></g>`;

// Xe cút kít chất đầy tiền; (x, y) là điểm chạm đất của bánh xe
export const barrow = (id, x, y) => `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0">
  <line x1="-150" y1="-120" x2="-300" y2="-60" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><line x1="-150" y1="-120" x2="-300" y2="-60" stroke="#9c6b45" stroke-width="12" stroke-linecap="round"/>
  <line x1="-90" y1="-50" x2="-110" y2="-4" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
  ${[[-110, -170, -8, "#b9a7d6"], [-30, -182, 6, "#a8c98f"], [50, -172, -4, "#e5c07b"], [120, -160, 10, "#b9a7d6"], [-70, -220, 4, "#e5c07b"], [10, -232, -6, "#7fc8b5"], [90, -214, 8, "#a8c98f"], [-20, -272, -3, "#e5c07b"], [50, -262, 12, "#b9a7d6"]].map(([nx, ny, r, c]) => note(nx, ny, r, c, "")).join("")}
  <path d="M-170 -150 L170 -150 L120 -40 L-110 -40 Z" fill="#6f8f9c" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  <circle cx="110" cy="-30" r="34" fill="#3a3a40" stroke="${INK}" stroke-width="7"/><circle cx="110" cy="-30" r="9" fill="#ccc"/></g></g>`;

// Thẻ khung trắng có chú thích dưới (inner: SVG vẽ quanh gốc 0,0)
export const panel = (id, x, y, w, h, inner, cap) =>
  `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="${INK}" stroke-width="7"/>${inner}<text y="${h / 2 - 26}" font-family="Inter" font-weight="800" font-size="42" fill="${INK}" text-anchor="middle">${cap}</text></g></g>`;

// Chữ SVG đậm, ẩn sẵn (anchor: middle | start | end)
export const H = (id, x, y, txt, size = 80, color = INK, anchor = "middle") =>
  `<text id="${id}" opacity="0" x="${x}" y="${y}" font-family="Inter" font-weight="800" font-size="${size}" fill="${color}" text-anchor="${anchor}">${txt}</text>`;
