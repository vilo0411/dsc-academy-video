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
      ${T(512, 74, o.corner || o.t || "1000", 30)}`,
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
