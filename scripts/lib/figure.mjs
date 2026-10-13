// Nhân vật An — người que vẽ bằng SVG, cử động bằng GSAP (tween thuộc tính transform của SVG).
// Góc tính bằng độ; 0 = buông thẳng; âm = xoay về bên phải màn hình.
//
// Mỗi cảnh chọn:  pose (tư thế), expr (biểu cảm, mặc định theo tư thế), emote (biểu tượng trên đầu, tuỳ chọn).
// Ngoài ra nhân vật tự chớp mắt, thở, đi vào khung hình và có cử chỉ nhỏ khi giảng giải.

export const SHOULDER = { x: 150, y: 165 };
export const ELBOW_Y = 252;
export const NECK = { x: 150, y: 124 };
export const HIP = { x: 150, y: 300 };
const FEET_Y = 470;

// [vai phải, khuỷu phải, vai trái, khuỷu trái, nghiêng đầu, chân trái, chân phải, nghiêng người]
export const POSES = {
  idle: [-14, 8, 14, -8, 0, 0, 0, 0],
  point: [-100, -10, 22, -14, -4, 0, -4, -2], // chỉ sang phải, về phía nội dung
  pointUp: [-158, -6, 22, -14, -6, 0, 0, 0], // giơ tay chỉ lên (ý tưởng)
  present: [-72, -38, 18, -12, -3, 2, -4, -2], // ngửa tay giới thiệu
  wave: [-128, -42, 16, -10, 4, 0, 0, 0],
  cheer: [-148, 12, 148, -12, 0, 8, -8, 0],
  think: [-32, -158, 18, -10, 8, 3, 0, 3], // tay chống cằm
  shrug: [-48, -78, 48, 78, -6, 0, 0, 0], // nhún vai
  hips: [-55, 90, 55, -90, 0, 7, -7, 0], // chống nạnh, tự tin
  headHold: [-125, -85, 125, 85, 0, 0, 0, 0], // ôm đầu, lo lắng
  facepalm: [-114, -122, 14, -8, 7, 0, 0, 2], // tay che mặt
};

// Biểu cảm = mắt + lông mày + miệng + hướng nhìn
export const EXPRS = {
  happy: { eyes: "dot", brows: null, mouth: "smile" },
  excited: { eyes: "happy", brows: "raised", mouth: "open" },
  surprised: { eyes: "wide", brows: "raised", mouth: "o" },
  worried: { eyes: "dot", brows: "worried", mouth: "frown" },
  sad: { eyes: "closed", brows: "worried", mouth: "frown" },
  thinking: { eyes: "dot", brows: "quizzical", mouth: "smirk", gaze: [5, -4] },
  confused: { eyes: "dot", brows: "quizzical", mouth: "flat", gaze: [-3, 0] },
  confident: { eyes: "dot", brows: "focused", mouth: "smirk" },
  neutral: { eyes: "dot", brows: null, mouth: "flat" },
};

const POSE_EXPR = {
  idle: "happy",
  point: "happy",
  pointUp: "excited",
  present: "happy",
  wave: "excited",
  cheer: "excited",
  think: "thinking",
  shrug: "confused",
  hips: "confident",
  headHold: "worried",
  facepalm: "sad",
};

const EYES = ["dot", "happy", "wide", "closed"];
const BROWS = ["raised", "worried", "focused", "quizzical"];
const MOUTHS = ["smile", "flat", "open", "o", "frown", "smirk"];
export const EMOTES = ["question", "exclaim", "bulb", "sweat", "sparkle"];

export function figureSVG({ ink, accent, paper, warn }) {
  const s = `stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none"`;
  const f = `stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
  const { x, y } = SHOULDER;
  const hide = (cur, def) => (cur === def ? "" : ` opacity="0"`);
  return `
<svg id="fig" viewBox="0 0 300 500" width="100%" height="100%" style="overflow: visible" aria-hidden="true">
  <ellipse cx="150" cy="482" rx="92" ry="10" fill="${ink}" opacity="0.08"/>
  <g id="fig-jump" transform="translate(0 0)">
  <g id="fig-lean" transform="rotate(0 150 ${FEET_Y})">
  <g id="fig-bob" transform="translate(0 0)">
    <g id="legL" transform="rotate(0 ${HIP.x} ${HIP.y})"><line ${s} x1="150" y1="300" x2="104" y2="468"/></g>
    <g id="legR" transform="rotate(0 ${HIP.x} ${HIP.y})"><line ${s} x1="150" y1="300" x2="196" y2="468"/></g>
    <line ${s} x1="150" y1="${NECK.y}" x2="150" y2="300"/>
    <path d="M128 136 L172 136 L160 150 L150 186 L140 150 Z" fill="${accent}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
    <g id="armL" transform="rotate(0 ${x} ${y})">
      <line ${s} x1="${x}" y1="${y}" x2="${x}" y2="${ELBOW_Y}"/>
      <g id="foreL" transform="rotate(0 ${x} ${ELBOW_Y})"><line ${s} x1="${x}" y1="${ELBOW_Y}" x2="${x}" y2="330"/></g>
    </g>
    <g id="head" transform="rotate(0 150 ${NECK.y})">
      <circle cx="150" cy="78" r="46" fill="${paper}" stroke="${ink}" stroke-width="9"/>
      <g id="gaze" transform="translate(0 0)">
        <g id="blink" transform="translate(0 72) scale(1 1) translate(0 -72)">
          <g id="eyes-dot"><ellipse cx="133" cy="72" rx="5.5" ry="6.5" fill="${ink}"/><ellipse cx="167" cy="72" rx="5.5" ry="6.5" fill="${ink}"/></g>
          <g id="eyes-happy"${hide("happy", "dot")}><path d="M125 75 Q133 63 141 75" fill="none" ${f}/><path d="M159 75 Q167 63 175 75" fill="none" ${f}/></g>
          <g id="eyes-wide"${hide("wide", "dot")}><circle cx="133" cy="71" r="10" fill="#fff" ${f}/><circle cx="167" cy="71" r="10" fill="#fff" ${f}/><circle cx="134" cy="72" r="4.5" fill="${ink}"/><circle cx="168" cy="72" r="4.5" fill="${ink}"/></g>
          <g id="eyes-closed"${hide("closed", "dot")}><path d="M126 73 Q133 78 140 73" fill="none" ${f}/><path d="M160 73 Q167 78 174 73" fill="none" ${f}/></g>
        </g>
      </g>
      <g id="brow-raised" opacity="0"><path d="M124 55 Q133 47 142 55" fill="none" ${f}/><path d="M158 55 Q167 47 176 55" fill="none" ${f}/></g>
      <g id="brow-worried" opacity="0"><path d="M125 60 L141 53" fill="none" ${f}/><path d="M159 53 L175 60" fill="none" ${f}/></g>
      <g id="brow-focused" opacity="0"><path d="M125 54 L141 60" fill="none" ${f}/><path d="M159 60 L175 54" fill="none" ${f}/></g>
      <g id="brow-quizzical" opacity="0"><path d="M125 59 L141 59" fill="none" ${f}/><path d="M158 56 Q167 47 176 54" fill="none" ${f}/></g>
      <path id="mouth-smile" d="M131 92 Q150 108 169 92" fill="none" ${f} stroke-width="6"/>
      <path id="mouth-flat" d="M136 98 L164 98" fill="none" ${f} stroke-width="6" opacity="0"/>
      <path id="mouth-open" d="M130 90 Q150 120 170 90 Z" fill="${ink}" opacity="0"/>
      <ellipse id="mouth-o" cx="150" cy="99" rx="7" ry="9" fill="${ink}" opacity="0"/>
      <path id="mouth-frown" d="M134 103 Q150 90 166 103" fill="none" ${f} stroke-width="6" opacity="0"/>
      <path id="mouth-smirk" d="M135 98 Q154 105 167 91" fill="none" ${f} stroke-width="6" opacity="0"/>
    </g>
    <g id="armR" transform="rotate(0 ${x} ${y})">
      <line ${s} x1="${x}" y1="${y}" x2="${x}" y2="${ELBOW_Y}"/>
      <g id="foreR" transform="rotate(0 ${x} ${ELBOW_Y})"><line ${s} x1="${x}" y1="${ELBOW_Y}" x2="${x}" y2="330"/></g>
    </g>
  </g>
  </g>
  </g>
  <g id="emo-question" opacity="0" transform="translate(232 14) scale(0)"><circle r="26" fill="#fff" ${f}/><text y="11" text-anchor="middle" font-size="34" font-weight="800" fill="${ink}" font-family="Inter">?</text></g>
  <g id="emo-exclaim" opacity="0" transform="translate(232 14) scale(0)"><circle r="26" fill="${warn}" ${f}/><text y="12" text-anchor="middle" font-size="34" font-weight="800" fill="${ink}" font-family="Inter">!</text></g>
  <g id="emo-bulb" opacity="0" transform="translate(232 8) scale(0)"><path d="M-14 6 A18 18 0 1 1 14 6 Q8 12 8 20 H-8 Q-8 12 -14 6 Z" fill="${warn}" ${f}/><path d="M-7 27 H7 M-28 -16 L-36 -22 M28 -16 L36 -22 M0 -30 V-40" fill="none" ${f}/></g>
  <g id="emo-sweat" opacity="0" transform="translate(98 46) scale(0)"><path d="M0 -16 Q12 2 0 10 Q-12 2 0 -16 Z" fill="#BFE8FF" ${f}/></g>
  <g id="emo-sparkle" opacity="0" transform="translate(150 30) scale(0)"><path d="M-78 -6 l5 -14 l5 14 l14 5 l-14 5 l-5 14 l-5 -14 l-14 -5 Z M70 -20 l4 -11 l4 11 l11 4 l-11 4 l-4 11 l-4 -11 l-11 -4 Z M62 30 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" fill="${accent}" ${f} stroke-width="3"/></g>
</svg>`;
}

const rot = (a, cx, cy) => `rotate(${a} ${cx} ${cy})`;
const T = (t) => t.toFixed(3);
const EMO_POS = { question: [232, 14], exclaim: [232, 14], bulb: [232, 8], sweat: [98, 46], sparkle: [150, 30] };

function setExpression(name, t, poseName) {
  const e = EXPRS[name] || EXPRS.happy;
  const out = [];
  EYES.forEach((k) => out.push(`tl.set("#eyes-${k}", { opacity: ${k === e.eyes ? 1 : 0} }, ${T(t)});`));
  BROWS.forEach((k) => out.push(`tl.set("#brow-${k}", { opacity: ${k === e.brows ? 1 : 0} }, ${T(t)});`));
  MOUTHS.forEach((k) => out.push(`tl.set("#mouth-${k}", { opacity: ${k === e.mouth ? 1 : 0} }, ${T(t)});`));
  let gaze = e.gaze || [0, 0];
  if (!e.gaze && (poseName === "point" || poseName === "present")) gaze = [5, 0]; // nhìn về phía nội dung
  out.push(`tl.to("#gaze", { attr: { transform: "translate(${gaze[0]} ${gaze[1]})" }, duration: 0.3, ease: "power2.out" }, ${T(t)});`);
  return out;
}

// Chuyển nhân vật sang tư thế + biểu cảm tại thời điểm t; end = lúc cảnh kết thúc (để thêm cử chỉ, tắt emote).
export function poseTween(pose, t, { dur = 0.55, expr, emote, end } = {}) {
  const p = POSES[pose] || POSES.idle;
  const [ur, fr, ul, fl, head, lL, lR, lean] = p;
  const { x, y } = SHOULDER;
  const ease = "back.out(1.4)";
  const sceneEnd = end ?? t + 4;
  const lines = [
    `tl.to("#armR", { attr: { transform: "${rot(ur, x, y)}" }, duration: ${dur}, ease: "${ease}" }, ${T(t)});`,
    `tl.to("#foreR", { attr: { transform: "${rot(fr, x, ELBOW_Y)}" }, duration: ${dur}, ease: "${ease}" }, ${T(t)});`,
    `tl.to("#armL", { attr: { transform: "${rot(ul, x, y)}" }, duration: ${dur}, ease: "${ease}" }, ${T(t)});`,
    `tl.to("#foreL", { attr: { transform: "${rot(fl, x, ELBOW_Y)}" }, duration: ${dur}, ease: "${ease}" }, ${T(t)});`,
    `tl.to("#head", { attr: { transform: "${rot(head, 150, NECK.y)}" }, duration: ${dur}, ease: "power2.out" }, ${T(t)});`,
    `tl.to("#legL", { attr: { transform: "${rot(lL, HIP.x, HIP.y)}" }, duration: ${dur}, ease: "power2.out" }, ${T(t)});`,
    `tl.to("#legR", { attr: { transform: "${rot(lR, HIP.x, HIP.y)}" }, duration: ${dur}, ease: "power2.out" }, ${T(t)});`,
    `tl.to("#fig-lean", { attr: { transform: "${rot(lean, 150, FEET_Y)}" }, duration: ${dur}, ease: "power2.out" }, ${T(t)});`,
    ...setExpression(expr || POSE_EXPR[pose] || "happy", t + 0.1, pose),
  ];

  // Cử chỉ theo tư thế
  if (pose === "wave") {
    for (let i = 0; i < 3; i++) {
      const t0 = t + dur + i * 0.5;
      lines.push(`tl.to("#foreR", { attr: { transform: "${rot(fr + 34, x, ELBOW_Y)}" }, duration: 0.25, ease: "sine.inOut" }, ${T(t0)});`);
      lines.push(`tl.to("#foreR", { attr: { transform: "${rot(fr, x, ELBOW_Y)}" }, duration: 0.25, ease: "sine.inOut" }, ${T(t0 + 0.25)});`);
    }
  }
  if (pose === "cheer") {
    lines.push(`tl.to("#fig-jump", { attr: { transform: "translate(0 -28)" }, duration: 0.22, ease: "power2.out" }, ${T(t + 0.1)});`);
    lines.push(`tl.to("#fig-jump", { attr: { transform: "translate(0 0)" }, duration: 0.32, ease: "bounce.out" }, ${T(t + 0.32)});`);
  }
  if (pose === "shrug") {
    lines.push(`tl.to("#fig-jump", { attr: { transform: "translate(0 -8)" }, duration: 0.18, ease: "power1.out", yoyo: true, repeat: 1 }, ${T(t + 0.4)});`);
  }
  if (pose === "headHold") {
    lines.push(`tl.to("#head", { attr: { transform: "${rot(6, 150, NECK.y)}" }, duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: 3 }, ${T(t + dur)});`);
  }
  // Nhịp tay khi giảng giải (point/present): mỗi 1,6 giây khuỷu tay nhấn nhẹ một lần.
  if (pose === "point" || pose === "present") {
    const beats = Math.min(6, Math.floor((sceneEnd - t - dur - 0.6) / 1.6));
    for (let i = 0; i < beats; i++) {
      const t0 = t + dur + 0.5 + i * 1.6;
      lines.push(`tl.to("#foreR", { attr: { transform: "${rot(fr - 12, x, ELBOW_Y)}" }, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: 1 }, ${T(t0)});`);
    }
  }
  if (pose === "think") {
    const beats = Math.min(3, Math.floor((sceneEnd - t - 1) / 2));
    for (let i = 0; i < beats; i++) {
      lines.push(`tl.to("#head", { attr: { transform: "${rot(head + (i % 2 ? -5 : 4), 150, NECK.y)}" }, duration: 0.6, ease: "sine.inOut" }, ${T(t + dur + 0.4 + i * 2)});`);
    }
  }

  // Biểu tượng trên đầu: hiện ra, lơ lửng, rồi tắt trước khi cảnh kết thúc.
  if (emote && EMO_POS[emote]) {
    const [ex, ey] = EMO_POS[emote];
    const off = Math.min(t + 3.2, sceneEnd - 0.3);
    lines.push(`tl.set("#emo-${emote}", { opacity: 1 }, ${T(t + 0.3)});`);
    lines.push(`tl.fromTo("#emo-${emote}", { attr: { transform: "translate(${ex} ${ey}) scale(0)" } }, { attr: { transform: "translate(${ex} ${ey}) scale(1)" }, duration: 0.4, ease: "back.out(2.5)" }, ${T(t + 0.3)});`);
    lines.push(`tl.to("#emo-${emote}", { attr: { transform: "translate(${ex} ${ey - 8}) scale(1)" }, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 1 }, ${T(t + 0.75)});`);
    lines.push(`tl.to("#emo-${emote}", { opacity: 0, duration: 0.25 }, ${T(off)});`);
  }
  return lines;
}

// Đi vào khung hình ở đầu video: hai chân bước luân phiên.
export function walkIn() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const a = i % 2 ? -16 : 16;
    out.push(`tl.to("#legL", { attr: { transform: "${rot(a, HIP.x, HIP.y)}" }, duration: 0.17, ease: "sine.inOut" }, ${T(i * 0.17)});`);
    out.push(`tl.to("#legR", { attr: { transform: "${rot(-a, HIP.x, HIP.y)}" }, duration: 0.17, ease: "sine.inOut" }, ${T(i * 0.17)});`);
  }
  return out;
}

// Chớp mắt theo lịch cố định (không dùng số ngẫu nhiên để render luôn giống nhau).
export function blinks(total) {
  const gaps = [3.1, 4.2, 2.7, 3.8, 4.5, 2.9, 3.4];
  const out = [];
  let t = 1.6;
  let i = 0;
  while (t < total - 0.5) {
    out.push(`tl.to("#blink", { attr: { transform: "translate(0 72) scale(1 0.1) translate(0 -72)" }, duration: 0.07, ease: "power1.in", yoyo: true, repeat: 1 }, ${T(t)});`);
    t += gaps[i++ % gaps.length];
  }
  return out;
}

// Nhịp thở nhẹ suốt video (lặp hữu hạn, đúng quy tắc deterministic của HyperFrames).
export function breathe(total) {
  const cycles = Math.max(1, Math.floor(total / 2.4));
  return [`tl.to("#fig-bob", { attr: { transform: "translate(0 -5)" }, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: ${cycles * 2 - 1} }, 0.8);`];
}
