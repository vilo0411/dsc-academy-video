// Nhân vật người que DSC — vẽ bằng SVG, cử động bằng GSAP (tween thuộc tính transform).
// Mọi góc tính bằng độ; 0 = tay buông thẳng; âm = xoay về bên phải màn hình.

export const SHOULDER = { x: 150, y: 165 };
export const ELBOW_Y = 252;
export const NECK = { x: 150, y: 124 };

// [vai phải, khuỷu phải, vai trái, khuỷu trái, nghiêng đầu]
// "Phải/trái" theo phía màn hình người xem.
export const POSES = {
  idle: [-14, 8, 14, -8, 0],
  point: [-100, -10, 22, -14, -4], // chỉ sang phải (nội dung bên phải)
  pointUp: [-158, -6, 22, -14, -6], // chỉ lên trên (bản dọc)
  wave: [-128, -42, 16, -10, 4],
  cheer: [-148, 12, 148, -12, 0],
  think: [-32, -158, 18, -10, 8],
  shrug: [-48, -78, 48, 78, -6],
};

export const EXPRESSIONS = {
  idle: "smile",
  point: "smile",
  pointUp: "smile",
  wave: "open",
  cheer: "open",
  think: "flat",
  shrug: "flat",
};

export function figureSVG({ ink, accent, paper }) {
  const s = `stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none"`;
  const { x, y } = SHOULDER;
  return `
<svg id="fig" viewBox="0 0 300 500" width="100%" height="100%" style="overflow: visible" aria-hidden="true">
  <ellipse cx="150" cy="482" rx="92" ry="10" fill="${ink}" opacity="0.08"/>
  <g id="fig-jump" transform="translate(0 0)">
  <g id="fig-bob" transform="translate(0 0)">
    <line ${s} x1="150" y1="300" x2="104" y2="468"/>
    <line ${s} x1="150" y1="300" x2="196" y2="468"/>
    <line ${s} x1="150" y1="${NECK.y}" x2="150" y2="300"/>
    <path d="M128 136 L172 136 L160 150 L150 186 L140 150 Z" fill="${accent}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
    <g id="armR" transform="rotate(0 ${x} ${y})">
      <line ${s} x1="${x}" y1="${y}" x2="${x}" y2="${ELBOW_Y}"/>
      <g id="foreR" transform="rotate(0 ${x} ${ELBOW_Y})">
        <line ${s} x1="${x}" y1="${ELBOW_Y}" x2="${x}" y2="330"/>
      </g>
    </g>
    <g id="armL" transform="rotate(0 ${x} ${y})">
      <line ${s} x1="${x}" y1="${y}" x2="${x}" y2="${ELBOW_Y}"/>
      <g id="foreL" transform="rotate(0 ${x} ${ELBOW_Y})">
        <line ${s} x1="${x}" y1="${ELBOW_Y}" x2="${x}" y2="330"/>
      </g>
    </g>
    <g id="head" transform="rotate(0 150 ${NECK.y})">
      <circle cx="150" cy="78" r="46" fill="${paper}" stroke="${ink}" stroke-width="9"/>
      <circle cx="133" cy="72" r="5.5" fill="${ink}"/>
      <circle cx="167" cy="72" r="5.5" fill="${ink}"/>
      <path id="mouth-smile" d="M131 92 Q150 108 169 92" stroke="${ink}" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path id="mouth-flat" d="M136 98 L164 98" stroke="${ink}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0"/>
      <path id="mouth-open" d="M130 90 Q150 120 170 90 Z" fill="${ink}" opacity="0"/>
    </g>
  </g>
  </g>
</svg>`;
}

const rot = (a, cx, cy) => `rotate(${a} ${cx} ${cy})`;

// Trả về các dòng JS GSAP để chuyển nhân vật sang tư thế `pose` tại thời điểm t (giây).
export function poseTween(pose, t, dur = 0.55) {
  const p = POSES[pose] || POSES.idle;
  const [ur, fr, ul, fl, head] = p;
  const { x, y } = SHOULDER;
  const ease = "back.out(1.4)";
  const lines = [
    `tl.to("#armR", { attr: { transform: "${rot(ur, x, y)}" }, duration: ${dur}, ease: "${ease}" }, ${t.toFixed(3)});`,
    `tl.to("#foreR", { attr: { transform: "${rot(fr, x, ELBOW_Y)}" }, duration: ${dur}, ease: "${ease}" }, ${t.toFixed(3)});`,
    `tl.to("#armL", { attr: { transform: "${rot(ul, x, y)}" }, duration: ${dur}, ease: "${ease}" }, ${t.toFixed(3)});`,
    `tl.to("#foreL", { attr: { transform: "${rot(fl, x, ELBOW_Y)}" }, duration: ${dur}, ease: "${ease}" }, ${t.toFixed(3)});`,
    `tl.to("#head", { attr: { transform: "${rot(head, 150, NECK.y)}" }, duration: ${dur}, ease: "power2.out" }, ${t.toFixed(3)});`,
  ];
  const expr = EXPRESSIONS[pose] || "smile";
  for (const m of ["smile", "flat", "open"]) {
    lines.push(`tl.set("#mouth-${m}", { opacity: ${m === expr ? 1 : 0} }, ${t.toFixed(3)});`);
  }
  if (pose === "wave") {
    // vẫy tay 3 nhịp
    for (let i = 0; i < 3; i++) {
      const t0 = t + dur + i * 0.5;
      lines.push(`tl.to("#foreR", { attr: { transform: "${rot(fr + 34, x, ELBOW_Y)}" }, duration: 0.25, ease: "sine.inOut" }, ${t0.toFixed(3)});`);
      lines.push(`tl.to("#foreR", { attr: { transform: "${rot(fr, x, ELBOW_Y)}" }, duration: 0.25, ease: "sine.inOut" }, ${(t0 + 0.25).toFixed(3)});`);
    }
  }
  if (pose === "cheer") {
    lines.push(`tl.to("#fig-jump", { attr: { transform: "translate(0 -26)" }, duration: 0.22, ease: "power2.out" }, ${(t + 0.1).toFixed(3)});`);
    lines.push(`tl.to("#fig-jump", { attr: { transform: "translate(0 0)" }, duration: 0.3, ease: "bounce.out" }, ${(t + 0.32).toFixed(3)});`);
  }
  return lines;
}

// Nhịp thở nhẹ suốt video (lặp hữu hạn, đúng quy tắc deterministic của HyperFrames).
export function breathe(total) {
  const cycles = Math.max(1, Math.floor(total / 2.4));
  return [
    `tl.to("#fig-bob", { attr: { transform: "translate(0 -5)" }, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: ${cycles * 2 - 1} }, 0.8);`,
  ];
}
