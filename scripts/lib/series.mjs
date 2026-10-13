// Dữ liệu dùng chung cho cả chuỗi "Kinh tế vĩ mô cho nhà đầu tư": dàn doanh nghiệp giả định và bảng điều khiển.
// Số liệu cố định của từng doanh nghiệp xem "Sổ tay sản xuất". Đổi ở đây là đổi cho cả 12 tập.

import { BRAND as A } from "./brand.mjs";

const S = `stroke="${A.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;

export const ICONS = {
  basket: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M18 26 Q32 4 46 26" fill="none" ${S}/><path d="M8 26 H56 L50 54 H14 Z" fill="${fill}" ${S}/><path d="M22 30 L24 50 M32 30 V50 M42 30 L40 50" fill="none" ${S}/></svg>`,
  piggy: (fill) =>
    `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="36" rx="22" ry="16" fill="${fill}" ${S}/><path d="M20 22 L24 14 L28 21" fill="${fill}" ${S}/><rect x="50" y="31" width="8" height="10" rx="3" fill="${fill}" ${S}/><path d="M22 51 V58 M40 51 V58 M28 22 H38" fill="none" ${S}/><circle cx="42" cy="32" r="2" fill="${A.ink}"/></svg>`,
  house: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M8 30 L32 10 L56 30" fill="none" ${S}/><path d="M14 27 V56 H50 V27" fill="${fill}" ${S}/><rect x="27" y="38" width="10" height="18" fill="#fff" ${S}/></svg>`,
  anvil: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M8 22 H50 Q58 22 58 30 H42 Q38 38 42 44 H48 V52 H18 V44 H24 Q28 38 22 30 H8 Z" fill="${fill}" ${S}/><path d="M48 10 L52 4 M54 14 L60 12 M42 8 L42 2" fill="none" ${S}/></svg>`,
  crane: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M20 58 V14 M28 58 V14 M20 22 L28 30 M28 22 L20 30 M20 38 L28 46 M28 38 L20 46" fill="none" ${S}/><path d="M10 14 H58" fill="none" ${S}/><path d="M50 14 V30" fill="none" ${S}/><rect x="44" y="30" width="12" height="9" fill="${fill}" ${S}/><path d="M12 58 H36" fill="none" ${S}/></svg>`,
  fish: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M6 32 Q24 12 44 32 Q24 52 6 32 Z" fill="${fill}" ${S}/><path d="M44 32 L58 20 V44 Z" fill="${fill}" ${S}/><circle cx="18" cy="29" r="2.5" fill="${A.ink}"/></svg>`,
  kite: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M32 4 L50 24 L32 46 L14 24 Z" fill="${fill}" ${S}/><path d="M14 24 H50 M32 4 V46" fill="none" ${S}/><path d="M32 46 Q26 52 32 56 Q38 60 32 63" fill="none" ${S}/></svg>`,
  gate: (fill) =>
    `<svg viewBox="0 0 64 64"><path d="M6 56 V30 L18 36 V30 L30 36 V30 L42 36 V20 H52 V56 Z" fill="${fill}" ${S}/><path d="M4 56 H60" fill="none" ${S}/></svg>`,
};

export const COMPANIES = {
  giotre: { name: "Siêu thị Giỏ Tre", icon: "basket", fill: A.accent },
  giomay: { name: "Siêu thị Giỏ Mây", icon: "basket", fill: A.warn },
  heodat: { name: "Ngân hàng Heo Đất", icon: "piggy", fill: "#FFC9D6" },
  toam: { name: "Tổ Ấm Land", icon: "house", fill: "#FFE3A8" },
  loren: { name: "Thép Lò Rèn", icon: "anvil", fill: "#C9D3E8" },
  cancau: { name: "Xây dựng Cần Cẩu", icon: "crane", fill: A.warn },
  cabac: { name: "Thuỷ sản Cá Bạc", icon: "fish", fill: "#BFE8FF" },
  canhdieu: { name: "Hàng không Cánh Diều", icon: "kite", fill: "#FFD2C2" },
  congxanh: { name: "KCN Cổng Xanh", icon: "gate", fill: A.accentSoft },
};

export const companyIcon = (key) => {
  const c = COMPANIES[key];
  if (!c) throw new Error(`Không có doanh nghiệp "${key}" trong scripts/lib/series.mjs`);
  return ICONS[c.icon](c.fill);
};

// 5 nhóm biến số của Bài 1 — các "ô" trên bảng điều khiển vĩ mô.
export const DASHBOARD = [
  { key: "growth", name: "Tăng trưởng", items: ["GDP", "PMI", "Sản xuất", "Bán lẻ"] },
  { key: "prices", name: "Giá cả", items: ["CPI", "Lạm phát lõi"] },
  { key: "money", name: "Tiền tệ", items: ["Lãi suất", "Tín dụng, M2", "Trái phiếu"] },
  { key: "external", name: "Đối ngoại", items: ["Tỷ giá", "Thương mại", "FDI", "Fed, USD"] },
  { key: "fiscal", name: "Tài khoá", items: ["Ngân sách", "Đầu tư công"] },
];
