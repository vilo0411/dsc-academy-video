// Thư viện hình cắt dán cho video essay: mỗi hình là SVG phẳng tô chấm in (halftone),
// có viền trắng như được cắt bằng kéo. Không vẽ khuôn mặt người thật.

export const P = {
  ink: "#1C1A17",
  paper: "#EFE6D2",
  cream: "#F6F0E1",
  tan: "#D8C49C",
  manila: "#E3CF9B",
  gray: "#8C877C",
  red: "#C8302B",
  mustard: "#D7A12A",
  silver: "#C9C6BE",
  bronze: "#B07A45",
};

// Mẫu chấm in dùng chung (đặt một lần trong <svg> defs của trang).
export const HALFTONE_DEFS = `
<pattern id="ht" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="9" height="9" fill="${P.cream}"/><circle cx="4.5" cy="4.5" r="2.1" fill="${P.gray}"/></pattern>
<pattern id="htd" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="8" height="8" fill="#4A463F"/><circle cx="4" cy="4" r="2.6" fill="${P.ink}"/></pattern>
<pattern id="hts" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="8" height="8" fill="#E4E1DA"/><circle cx="4" cy="4" r="2" fill="#9C998F"/></pattern>
<pattern id="htb" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="8" height="8" fill="#D3A472"/><circle cx="4" cy="4" r="2.4" fill="#7C4E22"/></pattern>
<pattern id="htt" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="9" height="9" fill="${P.tan}"/><circle cx="4.5" cy="4.5" r="2.3" fill="#9E875C"/></pattern>
<pattern id="htr" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="8" height="8" fill="#E0573F"/><circle cx="4" cy="4" r="2.2" fill="${P.red}"/></pattern>
<pattern id="htm" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="8" height="8" fill="#EBC15E"/><circle cx="4" cy="4" r="2.2" fill="${P.mustard}"/></pattern>
`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const T = (x, y, s, size, o = "") =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="${size}" fill="${P.ink}" ${o}>${esc(s)}</text>`;

// Mỗi hình: { vb: [w, h], draw(o) } — vẽ hai lần: lớp viền trắng (cắt kéo) rồi lớp hình.
const ART = {
  banknote: {
    vb: [600, 300],
    draw: (o) => `
      <rect x="10" y="10" width="580" height="280" rx="6" fill="url(#${o.tone === "dark" ? "htt" : "ht"})" stroke="${P.ink}" stroke-width="6"/>
      <rect x="34" y="34" width="532" height="232" fill="none" stroke="${P.ink}" stroke-width="3" stroke-dasharray="2 6"/>
      <circle cx="150" cy="150" r="78" fill="url(#htt)" stroke="${P.ink}" stroke-width="4"/>
      <path d="M150 92 l14 40 h42 l-34 25 l13 40 l-35 -25 l-35 25 l13 -40 l-34 -25 h42 z" fill="${P.cream}" stroke="${P.ink}" stroke-width="3"/>
      ${T(400, 150, o.t || "1000", 92)}
      ${T(400, 214, o.sub || "MARK", 40, 'letter-spacing="6"')}
      ${o.corner ? T(512, 74, o.corner, 30) : ""}`,
  },
  bundle: {
    vb: [600, 330],
    draw: (o) => `
      <g transform="translate(0 30)">${ART.banknote.draw({ ...o })}</g>
      <g transform="translate(-6 15) rotate(-1.5 300 150)">${ART.banknote.draw({ ...o })}</g>
      <g transform="rotate(1.2 300 150)">${ART.banknote.draw({ ...o })}</g>
      <rect x="518" y="0" width="56" height="330" fill="url(#htm)" stroke="${P.ink}" stroke-width="5"/>`,
  },
  stove: {
    vb: [320, 460],
    draw: () => `
      <rect x="130" y="0" width="60" height="120" fill="url(#htd)" stroke="${P.ink}" stroke-width="5"/>
      <rect x="40" y="110" width="240" height="290" rx="18" fill="url(#htd)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="22" y="100" width="276" height="30" rx="6" fill="${P.ink}"/>
      <rect x="86" y="190" width="148" height="128" rx="10" fill="#2A2621" stroke="${P.gray}" stroke-width="5"/>
      <path d="M100 318 q20 -70 40 -30 q12 -60 34 -6 q18 -46 46 36 z" fill="url(#htr)"/>
      <path d="M130 318 q12 -30 24 -6 q10 -26 24 6 z" fill="url(#htm)"/>
      <rect x="60" y="398" width="34" height="56" fill="${P.ink}"/><rect x="226" y="398" width="34" height="56" fill="${P.ink}"/>`,
  },
  flame: {
    vb: [220, 280],
    draw: () => `
      <path d="M110 6 C150 70 210 110 200 190 C192 250 150 276 110 276 C60 276 22 246 20 190 C18 130 70 110 74 56 C96 90 100 110 110 6 Z" fill="url(#htr)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M112 110 C136 150 168 176 160 220 C154 252 132 264 110 264 C82 264 62 246 62 214 C62 178 92 168 96 138 C106 156 108 160 112 110 Z" fill="url(#htm)" stroke="${P.ink}" stroke-width="4"/>`,
  },
  logs: {
    vb: [500, 300],
    draw: () => [[110, 190], [250, 190], [390, 190], [180, 80], [320, 80]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="72" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/><circle cx="${x}" cy="${y}" r="44" fill="none" stroke="#7A6440" stroke-width="4"/><circle cx="${x}" cy="${y}" r="18" fill="none" stroke="#7A6440" stroke-width="4"/>`)
      .join(""),
  },
  bread: {
    vb: [460, 240],
    draw: () => `
      <path d="M20 170 C20 60 120 20 230 20 C340 20 440 60 440 170 C440 210 400 222 230 222 C60 222 20 210 20 170 Z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${[110, 190, 270, 350].map((x) => `<path d="M${x - 30} ${70} q30 30 60 0" fill="none" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>`).join("")}`,
  },
  coin: {
    vb: [320, 320],
    draw: (o) => {
      const fill = o.tone === "bronze" ? "htb" : o.tone === "mid" ? "htt" : "hts";
      const leaves = Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const x = 160 + Math.cos(a) * 112, y = 160 + Math.sin(a) * 112;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="16" ry="7" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="${P.ink}" stroke-width="3"/>`;
      }).join("");
      return `<circle cx="160" cy="160" r="150" fill="url(#${fill})" stroke="${P.ink}" stroke-width="7"/>
        <circle cx="160" cy="160" r="132" fill="none" stroke="${P.ink}" stroke-width="3"/>${leaves}
        ${T(160, 150, o.t || "S·C", (o.t || "").length > 5 ? 40 : 64)}${T(160, 206, o.sub || "ROMA", 30, 'letter-spacing="4"')}`;
    },
  },
  helmet: {
    vb: [360, 340],
    draw: () => `
      <path d="M150 20 C220 -6 300 30 312 80 L120 100 Z" fill="url(#htr)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M40 230 C40 120 100 70 180 70 C260 70 320 120 320 230 Z" fill="url(#hts)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="28" y="222" width="304" height="30" rx="8" fill="url(#htd)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M70 252 L84 330 L132 330 L120 252 Z M290 252 L276 330 L228 330 L240 252 Z" fill="url(#hts)" stroke="${P.ink}" stroke-width="5"/>`,
  },
  scale: {
    vb: [560, 420],
    draw: () => `
      <rect x="270" y="60" width="20" height="300" fill="${P.ink}"/><path d="M200 400 h160 l-30 -40 h-100 z" fill="${P.ink}"/>
      <rect x="60" y="56" width="440" height="16" rx="8" fill="${P.ink}"/><circle cx="280" cy="64" r="20" fill="url(#htm)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M80 72 L30 210 M80 72 L130 210 M480 72 L430 210 M480 72 L530 210" stroke="${P.ink}" stroke-width="4"/>
      <path d="M10 210 h140 q-10 50 -70 50 q-60 0 -70 -50 z M410 210 h140 q-10 50 -70 50 q-60 0 -70 -50 z" fill="url(#ht)" stroke="${P.ink}" stroke-width="5"/>`,
  },
  ticket: {
    vb: [340, 200],
    draw: (o) => `
      <rect x="8" y="8" width="324" height="184" fill="url(#htm)" stroke="${P.ink}" stroke-width="5" stroke-dasharray="10 5"/>
      <rect x="28" y="28" width="284" height="144" fill="${P.cream}" stroke="${P.ink}" stroke-width="3"/>
      ${T(170, 96, o.t || "TEM PHIẾU", 46)}${T(170, 146, o.sub || "1 KG", 34)}`,
  },
  basket: {
    vb: [440, 360],
    draw: () => `
      <circle cx="140" cy="120" r="56" fill="url(#htr)" stroke="${P.ink}" stroke-width="5"/>
      <rect x="196" y="40" width="70" height="120" rx="10" fill="url(#hts)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M260 150 C260 70 360 60 370 140 Z" fill="url(#htt)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M30 150 h380 l-40 190 h-300 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${[100, 170, 240, 310].map((x) => `<path d="M${x} 170 l-6 150" stroke="${P.ink}" stroke-width="4"/>`).join("")}
      <path d="M44 220 h352 M56 280 h328" stroke="${P.ink}" stroke-width="4"/>`,
  },
  bowl: {
    vb: [460, 320],
    draw: () => `
      ${[150, 230, 310].map((x) => `<path d="M${x} 110 q-24 -30 0 -60 q24 -30 0 -50" fill="none" stroke="${P.gray}" stroke-width="7" stroke-linecap="round"/>`).join("")}
      <ellipse cx="230" cy="150" rx="210" ry="40" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <path d="M20 150 C30 270 120 310 230 310 C340 310 430 270 440 150 Z" fill="url(#ht)" stroke="${P.ink}" stroke-width="6"/>
      <path d="M80 200 h300" stroke="${P.red}" stroke-width="8"/>`,
  },
  calendar: {
    vb: [300, 330],
    draw: (o) => `
      <rect x="10" y="30" width="280" height="290" fill="${P.cream}" stroke="${P.ink}" stroke-width="6"/>
      <rect x="10" y="30" width="280" height="80" fill="url(#htr)" stroke="${P.ink}" stroke-width="6"/>
      <circle cx="80" cy="30" r="12" fill="${P.ink}"/><circle cx="220" cy="30" r="12" fill="${P.ink}"/>
      ${T(150, 88, o.sub || "THÁNG 9", 40, `fill="${P.cream}"`)}${T(150, 250, o.t || "14", 130)}`,
  },
  wallet: {
    vb: [460, 320],
    draw: () => `
      <path d="M30 80 h360 a30 30 0 0 1 30 30 v170 a30 30 0 0 1 -30 30 h-330 a30 30 0 0 1 -30 -30 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="70" y="20" width="250" height="120" rx="6" fill="url(#ht)" stroke="${P.ink}" stroke-width="5" transform="rotate(-6 195 80)"/>
      ${T(200, 92, "50.000", 46, 'transform="rotate(-6 195 80)"')}
      <path d="M300 150 h150 v90 h-150 a45 45 0 0 1 0 -90 z" fill="url(#htd)" stroke="${P.ink}" stroke-width="5"/>
      <circle cx="320" cy="195" r="16" fill="url(#htm)" stroke="${P.ink}" stroke-width="4"/>`,
  },
  qmark: {
    vb: [240, 360],
    draw: () => `<path d="M40 110 C40 40 100 10 130 10 C190 10 220 55 220 100 C220 160 150 175 145 230 L90 230 C90 150 160 140 160 100 C160 75 145 65 125 65 C105 65 95 80 95 110 Z" fill="url(#htr)" stroke="${P.ink}" stroke-width="6"/>
      <circle cx="118" cy="300" r="40" fill="url(#htr)" stroke="${P.ink}" stroke-width="6"/>`,
  },
  folder: {
    vb: [520, 380],
    draw: (o) => `
      <path d="M10 40 h170 l30 30 h300 v300 h-500 z" fill="url(#htm)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="10" y="90" width="500" height="280" fill="#E9C873" stroke="${P.ink}" stroke-width="6"/>
      <rect x="60" y="130" width="230" height="40" fill="${P.cream}" stroke="${P.ink}" stroke-width="3"/>
      ${T(175, 162, o.t || "HỒ SƠ", 30)}
      ${o.sub ? T(260, 300, o.sub, 86) : ""}`,
  },
  crucible: {
    vb: [400, 380],
    draw: () => `
      <path d="M150 20 q-30 40 0 70 q30 30 0 60" fill="none" stroke="${P.gray}" stroke-width="7" stroke-linecap="round"/>
      <path d="M60 150 h280 l-30 190 h-220 z" fill="url(#htd)" stroke="${P.ink}" stroke-width="6"/>
      <ellipse cx="200" cy="150" rx="140" ry="24" fill="url(#htm)" stroke="${P.ink}" stroke-width="6"/>
      <path d="M130 210 q70 30 140 0" fill="none" stroke="${P.mustard}" stroke-width="6"/>`,
  },
  scroll: {
    vb: [420, 460],
    draw: (o) => `
      <rect x="50" y="40" width="320" height="380" fill="${P.cream}" stroke="${P.ink}" stroke-width="6"/>
      <rect x="20" y="20" width="380" height="40" rx="20" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="20" y="400" width="380" height="40" rx="20" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${T(210, 130, o.t || "SẮC LỆNH", 44)}
      ${[180, 220, 260, 300, 340].map((y) => `<path d="M90 ${y} h240" stroke="${P.gray}" stroke-width="6"/>`).join("")}`,
  },
  shelf: {
    vb: [520, 380],
    draw: () => `
      <rect x="20" y="20" width="480" height="340" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${[130, 240].map((y) => `<rect x="20" y="${y}" width="480" height="16" fill="${P.ink}"/>`).join("")}
      <rect x="380" y="70" width="60" height="60" fill="url(#ht)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M90 300 l40 -40 M90 260 l40 40" stroke="${P.red}" stroke-width="10" stroke-linecap="round"/>`,
  },
  cash: {
    vb: [520, 220],
    draw: () => `<path d="M20 110 Q260 200 500 110" fill="none" stroke="#7A6440" stroke-width="8"/>
      ${Array.from({ length: 9 }, (_, i) => { const x = 50 + i * 52, y = 110 + Math.sin((i / 8) * Math.PI) * 42; return `<circle cx="${x}" cy="${y.toFixed(0)}" r="30" fill="url(#htd)" stroke="${P.ink}" stroke-width="4"/><rect x="${x - 9}" y="${(y - 9).toFixed(0)}" width="18" height="18" fill="${P.cream}" stroke="${P.ink}" stroke-width="3"/>`; }).join("")}`,
  },
  chinanote: {
    vb: [300, 480],
    draw: (o) => `
      <rect x="10" y="10" width="280" height="460" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="34" y="34" width="232" height="412" fill="none" stroke="${P.ink}" stroke-width="4"/>
      ${Array.from({ length: 10 }, (_, i) => `<circle cx="${60 + (i % 5) * 45}" cy="${70 + Math.floor(i / 5) * 46}" r="14" fill="url(#htd)"/>`).join("")}
      <rect x="70" y="190" width="160" height="150" fill="${P.cream}" stroke="${P.ink}" stroke-width="4"/>
      ${T(150, 290, o.t || "1000", 64)}
      <rect x="180" y="370" width="70" height="70" fill="none" stroke="${P.red}" stroke-width="6"/>`,
  },
  press: {
    vb: [460, 440],
    draw: () => `
      <rect x="60" y="20" width="340" height="40" fill="url(#htd)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="90" y="60" width="30" height="300" fill="${P.ink}"/><rect x="340" y="60" width="30" height="300" fill="${P.ink}"/>
      <rect x="215" y="60" width="30" height="120" fill="${P.ink}"/>
      <rect x="140" y="170" width="180" height="40" fill="url(#hts)" stroke="${P.ink}" stroke-width="5"/>
      <rect x="40" y="300" width="380" height="60" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="150" y="250" width="160" height="50" fill="url(#ht)" stroke="${P.ink}" stroke-width="4"/>
      <circle cx="400" cy="120" r="44" fill="none" stroke="${P.ink}" stroke-width="10"/><path d="M400 76 v88 M356 120 h88" stroke="${P.ink}" stroke-width="8"/>
      <rect x="40" y="360" width="40" height="70" fill="${P.ink}"/><rect x="380" y="360" width="40" height="70" fill="${P.ink}"/>`,
  },
  ship: {
    vb: [480, 440],
    draw: () => `
      <path d="M40 300 h400 l-50 90 h-300 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="236" y="40" width="10" height="260" fill="${P.ink}"/><rect x="126" y="90" width="8" height="210" fill="${P.ink}"/><rect x="346" y="100" width="8" height="200" fill="${P.ink}"/>
      <path d="M250 60 q90 40 0 110 z M250 180 q100 40 0 110 z" fill="${P.cream}" stroke="${P.ink}" stroke-width="5"/>
      <path d="M138 110 q60 40 0 90 z M138 210 q66 30 0 80 z M358 120 q50 30 0 80 z" fill="${P.cream}" stroke="${P.ink}" stroke-width="5"/>
      <path d="M246 40 l50 14 l-50 14 z" fill="${P.red}"/>`,
  },
  map: {
    vb: [760, 420],
    draw: () => `
      <rect x="10" y="10" width="740" height="400" fill="#E9DFC4" stroke="${P.ink}" stroke-width="6"/>
      ${[110, 210, 310].map((y) => `<path d="M10 ${y} h740" stroke="rgba(60,90,120,.3)" stroke-width="3" stroke-dasharray="10 8"/>`).join("")}
      <path d="M90 60 q60 -10 90 30 q20 40 -10 70 q40 30 30 90 q-10 60 -50 90 q-20 -60 -40 -100 q-50 -40 -40 -100 q0 -60 20 -80 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M470 60 q80 -20 150 10 q60 40 40 90 q-40 20 -70 10 q20 60 -10 120 q-40 30 -60 -10 q-30 -40 -60 -60 q-40 -60 10 -160 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="5"/>
      ${T(150, 380, "CHÂU MỸ", 30)}${T(570, 380, "CHÂU ÂU", 30)}`,
  },
  chest: {
    vb: [420, 340],
    draw: () => `
      <path d="M30 120 q180 -110 360 0 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${Array.from({ length: 7 }, (_, i) => `<circle cx="${100 + i * 38}" cy="${112 - Math.abs(3 - i) * 8}" r="22" fill="url(#hts)" stroke="${P.ink}" stroke-width="4"/>`).join("")}
      <rect x="30" y="120" width="360" height="200" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="30" y="170" width="360" height="22" fill="${P.ink}"/><rect x="185" y="160" width="50" height="60" fill="url(#htm)" stroke="${P.ink}" stroke-width="5"/>`,
  },
  invoice: {
    vb: [300, 560],
    draw: (o) => `
      <path d="M20 10 h260 v520 l-20 20 l-20 -20 l-20 20 l-20 -20 l-20 20 l-20 -20 l-20 20 l-20 -20 l-20 20 l-20 -20 l-20 20 l-20 -20 l-20 20 z" fill="${P.cream}" stroke="${P.ink}" stroke-width="5"/>
      ${T(150, 70, o.t || "BỒI THƯỜNG", 34)}
      ${Array.from({ length: 9 }, (_, i) => `<path d="M50 ${120 + i * 44} h140" stroke="${P.gray}" stroke-width="6"/><path d="M210 ${120 + i * 44} h40" stroke="${P.ink}" stroke-width="6"/>`).join("")}`,
  },
  factory: {
    vb: [520, 380],
    draw: () => `
      <rect x="60" y="40" width="50" height="180" fill="url(#htd)" stroke="${P.ink}" stroke-width="5"/>
      <rect x="150" y="80" width="44" height="140" fill="url(#htd)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M20 360 V200 l120 -60 v60 l120 -60 v60 l120 -60 v60 l120 -60 v220 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${[80, 200, 320, 440].map((x) => `<rect x="${x - 30}" y="260" width="50" height="50" fill="${P.ink}"/>`).join("")}`,
  },
  clock: {
    vb: [320, 320],
    draw: () => `<circle cx="160" cy="160" r="146" fill="${P.cream}" stroke="${P.ink}" stroke-width="10"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M${160 + Math.cos(a) * 118} ${160 + Math.sin(a) * 118} L${160 + Math.cos(a) * 134} ${160 + Math.sin(a) * 134}" stroke="${P.ink}" stroke-width="8"/>`; }).join("")}
      <path d="M160 160 L160 64" stroke="${P.ink}" stroke-width="12" stroke-linecap="round"/><path d="M160 160 L236 200" stroke="${P.red}" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="160" r="14" fill="${P.ink}"/>`,
  },
  lock: {
    vb: [300, 380],
    draw: () => `<path d="M70 170 V110 a80 80 0 0 1 160 0 V170" fill="none" stroke="${P.ink}" stroke-width="34"/>
      <path d="M70 170 V110 a80 80 0 0 1 160 0 V170" fill="none" stroke="url(#hts)" stroke-width="20"/>
      <rect x="20" y="160" width="260" height="200" rx="20" fill="url(#htm)" stroke="${P.ink}" stroke-width="7"/>
      <circle cx="150" cy="240" r="24" fill="${P.ink}"/><rect x="140" y="250" width="20" height="60" fill="${P.ink}"/>`,
  },
  piggy: {
    vb: [460, 340],
    draw: (o) => `
      <ellipse cx="230" cy="180" rx="190" ry="130" fill="#F2B6C1" stroke="${P.ink}" stroke-width="6"/>
      <ellipse cx="230" cy="180" rx="190" ry="130" fill="url(#ht)" opacity="0.35"/>
      <rect x="190" y="50" width="80" height="14" rx="7" fill="${P.ink}"/>
      <ellipse cx="420" cy="180" rx="34" ry="44" fill="#F2B6C1" stroke="${P.ink}" stroke-width="6"/>
      <circle cx="410" cy="170" r="6" fill="${P.ink}"/><circle cx="430" cy="190" r="6" fill="${P.ink}"/>
      <circle cx="350" cy="130" r="9" fill="${P.ink}"/><path d="M300 60 l30 -40 l20 50 z" fill="#F2B6C1" stroke="${P.ink}" stroke-width="5"/>
      <rect x="100" y="280" width="40" height="50" fill="#F2B6C1" stroke="${P.ink}" stroke-width="5"/><rect x="300" y="280" width="40" height="50" fill="#F2B6C1" stroke="${P.ink}" stroke-width="5"/>
      ${o.crack ? `<path d="M200 60 l20 50 l-25 30 l30 40 l-20 40" fill="none" stroke="${P.ink}" stroke-width="7"/>` : ""}`,
  },
  magnifier: {
    vb: [380, 380],
    draw: () => `<path d="M235 235 L350 350" stroke="${P.ink}" stroke-width="40" stroke-linecap="round"/>
      <circle cx="150" cy="150" r="125" fill="rgba(200,225,235,.55)" stroke="${P.ink}" stroke-width="18"/>
      <path d="M90 100 q30 -40 80 -40" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`,
  },
  thermo: {
    vb: [200, 520],
    draw: (o) => {
      const lv = o.level ?? 0.35;
      const top = 40 + (1 - lv) * 340;
      return `<rect x="60" y="20" width="80" height="400" rx="40" fill="${P.cream}" stroke="${P.ink}" stroke-width="7"/>
        <rect x="80" y="${top.toFixed(0)}" width="40" height="${(400 - top).toFixed(0)}" fill="${lv > 0.7 ? P.red : P.mustard}"/>
        <circle cx="100" cy="440" r="64" fill="${lv > 0.7 ? P.red : P.mustard}" stroke="${P.ink}" stroke-width="7"/>
        <rect x="60" y="150" width="80" height="120" fill="rgba(80,160,120,.25)"/>
        ${[80, 140, 200, 260, 320].map((y) => `<path d="M140 ${y} h30" stroke="${P.ink}" stroke-width="6"/>`).join("")}`;
    },
  },
  gascan: {
    vb: [320, 380],
    draw: () => `<path d="M40 80 h200 l50 50 v230 h-250 z" fill="url(#htr)" stroke="${P.ink}" stroke-width="6"/>
      <rect x="80" y="20" width="110" height="40" rx="10" fill="none" stroke="${P.ink}" stroke-width="14"/>
      <path d="M240 90 l50 -60" stroke="${P.ink}" stroke-width="22" stroke-linecap="round"/>
      <path d="M80 160 l140 140 M220 160 l-140 140" stroke="${P.ink}" stroke-width="10" opacity="0.5"/>`,
  },
  sack: {
    vb: [340, 380],
    draw: (o) => `<path d="M110 70 q-100 130 -80 230 q10 60 140 60 q130 0 140 -60 q20 -100 -80 -230 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      <path d="M100 70 h140 l-20 -40 h-100 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/><path d="M110 75 h120" stroke="${P.red}" stroke-width="10"/>
      ${T(170, 250, o.t || "NGUYÊN LIỆU", 34)}`,
  },
  bank: {
    vb: [480, 400],
    draw: () => `<path d="M20 120 L240 20 L460 120 z" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${[80, 170, 260, 350].map((x) => `<rect x="${x}" y="140" width="50" height="190" fill="url(#ht)" stroke="${P.ink}" stroke-width="5"/>`).join("")}
      <rect x="30" y="120" width="420" height="24" fill="${P.ink}"/><rect x="20" y="330" width="440" height="50" fill="url(#htt)" stroke="${P.ink}" stroke-width="6"/>
      ${T(240, 100, "NGÂN HÀNG", 30)}`,
  },
  arrow: {
    vb: [400, 140],
    draw: (o) => `<path d="M10 50 h270 v-40 l110 60 l-110 60 v-40 h-270 z" fill="url(#${o.tone === "red" ? "htr" : "htm"})" stroke="${P.ink}" stroke-width="6"/>`,
  },
};

export const ART_NAMES = Object.keys(ART);

export function artSVG(name, o = {}) {
  const a = ART[name];
  if (!a) throw new Error(`Không có hình "${name}" trong essay-art.mjs`);
  const [w, h] = a.vb;
  const body = a.draw(o);
  const pad = 16;
  // Lớp viền trắng: cùng hình vẽ với nét trắng rất dày phía sau.
  return `<svg viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <g class="cutline" stroke="${P.cream}" stroke-width="26" stroke-linejoin="round" fill="${P.cream}">${body.replace(/stroke="[^"]*"/g, "").replace(/stroke-width="[^"]*"/g, "").replace(/fill="url\([^)]*\)"/g, "")}</g>
    <g>${body}</g></svg>`;
}

export const artAspect = (name) => ART[name].vb[1] / ART[name].vb[0];
