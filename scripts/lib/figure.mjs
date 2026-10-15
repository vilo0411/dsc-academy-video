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

// ---------- Vẻ ngoài nhân vật ----------
// Kịch bản chọn bằng "character": "<tên trong CAST>" và/hoặc "look": { ... } để chỉnh từng món.
//   hair:    none | spiky | long | bun | curly | side
//   hat:     none | cap | grad | beret
//   glasses: none | round | square
//   face:    none | mustache | beard
//   outfit:  scarf | tie | bowtie | tee | dress | coat
//   skin, hairColor, outfitColor, hatColor: mã màu; cheeks: true/false
// Mọi món đều nằm trong nhóm đầu/thân nên cử động, tư thế, biểu cảm giữ nguyên như cũ.
export const CAST = {
  an: { name: "An", hair: "none", outfit: "scarf" },
  mai: { name: "Mai", hair: "long", hairColor: "#3A2A24", outfit: "dress", outfitColor: "#FF8A7A", skin: "#FFE9DC", cheeks: true },
  minh: { name: "Minh", hair: "spiky", hat: "cap", hatColor: "#3B6CFF", outfit: "tee", outfitColor: "#10F3BD", skin: "#FBE3CF" },
  thay: { name: "Thầy Hùng", hair: "side", hairColor: "#9AA3B8", glasses: "round", face: "mustache", outfit: "bowtie", outfitColor: "#E5484D", skin: "#F7E2CF" },
  lan: { name: "Chị Lan", hair: "bun", hairColor: "#1F1A2E", glasses: "square", outfit: "coat", outfitColor: "#7C5CFF", skin: "#FFE4D2", cheeks: true },
  tuan: { name: "Tuấn", hair: "curly", hairColor: "#4A3426", face: "beard", outfit: "tie", outfitColor: "#FFC542", skin: "#E8C2A0" },
};

export function resolveLook(character, look = {}) {
  const base = CAST[character || "an"];
  if (!base) throw new Error(`Không có nhân vật "${character}". Chọn một trong: ${Object.keys(CAST).join(", ")}`);
  return { ...base, ...look };
}

function lookParts(L, { ink, accent, paper }) {
  const f = `stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
  const hc = L.hairColor || ink;
  const oc = L.outfitColor || accent;
  const tc = L.hatColor || accent;
  const p = { skin: L.skin || paper, hairBack: "", hairFront: "", face: "", hat: "", torso: "", neckwear: "" };

  // Tóc: phần sau vẽ dưới mặt, phần trước vẽ trên mặt (chừa chỗ lông mày, y ≥ 47).
  if (L.hair === "spiky")
    p.hairFront = `<path d="M104 60 Q102 30 126 24 L130 8 L142 22 L152 4 L162 22 L176 10 L176 28 Q198 36 196 60 Q176 38 150 38 Q124 38 104 60 Z" fill="${hc}" ${f}/>`;
  if (L.hair === "long") {
    p.hairBack = `<path d="M98 78 Q94 20 150 20 Q206 20 202 78 L206 142 Q190 152 176 138 L124 138 Q110 152 94 142 Z" fill="${hc}" ${f}/>`;
    p.hairFront = `<path d="M104 64 Q106 26 150 26 Q194 26 196 64 Q184 42 160 40 Q150 48 128 44 Q112 48 104 64 Z" fill="${hc}" ${f}/>`;
  }
  if (L.hair === "bun") {
    p.hairBack = `<circle cx="150" cy="18" r="17" fill="${hc}" ${f}/>`;
    p.hairFront = `<path d="M104 64 Q104 28 150 28 Q196 28 196 64 Q180 40 150 40 Q120 40 104 64 Z" fill="${hc}" ${f}/>`;
  }
  if (L.hair === "curly") {
    const bumps = [[110, 52], [116, 36], [130, 26], [150, 22], [170, 26], [184, 36], [190, 52]];
    p.hairFront = bumps.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="14" fill="${hc}" ${f}/>`).join("");
  }
  if (L.hair === "side")
    p.hairFront = `<path d="M104 66 Q100 26 146 26 Q196 24 198 62 Q186 40 160 38 Q132 38 116 48 Q108 54 104 66 Z" fill="${hc}" ${f}/>`;

  // Mũ (đè lên tóc)
  if (L.hat === "cap")
    p.hat = `<path d="M102 56 Q102 20 150 20 Q198 20 198 56 Z" fill="${tc}" ${f}/><path d="M184 54 L228 56 Q230 64 214 64 L186 62 Z" fill="${tc}" ${f}/><circle cx="150" cy="20" r="4" fill="${ink}"/>`;
  if (L.hat === "grad")
    p.hat = `<path d="M114 42 Q114 30 150 30 Q186 30 186 42 L186 50 Q150 42 114 50 Z" fill="${ink}" ${f}/><path d="M92 28 L150 8 L208 28 L150 48 Z" fill="${ink}" ${f}/><path d="M150 28 L200 34 L200 62" fill="none" stroke="${tc}" stroke-width="4" stroke-linecap="round"/><circle cx="200" cy="64" r="5" fill="${tc}"/>`;
  if (L.hat === "beret")
    p.hat = `<path d="M100 50 Q96 18 150 16 Q206 16 200 46 Q150 34 100 50 Z" fill="${tc}" ${f}/><path d="M150 16 L152 6" ${f} fill="none"/>`;

  // Mặt: má hồng, râu, kính
  if (L.cheeks) p.face += `<ellipse cx="122" cy="90" rx="9" ry="5" fill="#FF8A9A" opacity="0.55"/><ellipse cx="178" cy="90" rx="9" ry="5" fill="#FF8A9A" opacity="0.55"/>`;
  if (L.face === "mustache") p.face += `<path d="M132 88 Q141 79 150 86 Q159 79 168 88 Q150 93 132 88 Z" fill="${hc}" ${f} stroke-width="3"/>`;
  if (L.face === "beard") p.hairBack += `<path d="M106 86 Q112 132 150 134 Q188 132 194 86 Q182 120 150 120 Q118 120 106 86 Z" fill="${hc}" ${f}/>`;
  if (L.glasses === "round")
    p.face += `<g fill="none" ${f} stroke-width="4"><circle cx="133" cy="73" r="13"/><circle cx="167" cy="73" r="13"/><path d="M146 72 Q150 68 154 72 M120 70 L106 66 M180 70 L194 66"/></g>`;
  if (L.glasses === "square")
    p.face += `<g fill="none" ${f} stroke-width="4"><rect x="119" y="62" width="28" height="22" rx="5"/><rect x="153" y="62" width="28" height="22" rx="5"/><path d="M147 70 L153 70 M119 68 L106 64 M181 68 L194 64"/></g>`;

  // Trang phục: thân vẽ dưới tay; đồ ở cổ vẽ trên thân.
  if (L.outfit === "tee") p.torso = `<path d="M124 140 Q150 132 176 140 L174 302 L126 302 Z" fill="${oc}" ${f}/>`;
  if (L.outfit === "dress") p.torso = `<path d="M130 138 Q150 132 170 138 L198 318 Q150 330 102 318 Z" fill="${oc}" ${f}/>`;
  if (L.outfit === "coat")
    p.torso = `<path d="M122 140 Q150 130 178 140 L180 310 L120 310 Z" fill="${oc}" ${f}/><path d="M136 138 L150 196 L164 138" fill="#fff" ${f}/><path d="M150 196 L150 300" ${f} fill="none" stroke="${paper}" stroke-width="3"/>`;
  if (L.outfit === "scarf") p.neckwear = `<path d="M128 136 L172 136 L160 150 L150 186 L140 150 Z" fill="${oc}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  if (L.outfit === "tie") p.neckwear = `<path d="M138 134 L162 134 L150 148 Z M150 148 L142 210 L150 222 L158 210 Z" fill="${oc}" ${f}/>`;
  if (L.outfit === "bowtie") p.neckwear = `<path d="M150 140 L126 128 L126 152 Z M150 140 L174 128 L174 152 Z" fill="${oc}" ${f}/><circle cx="150" cy="140" r="6" fill="${oc}" ${f}/>`;
  return p;
}

export function figureSVG({ ink, accent, paper, warn, look }) {
  const s = `stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none"`;
  const f = `stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
  const P = lookParts(resolveLook(null, look), { ink, accent, paper });
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
    ${P.torso}${P.neckwear}
    <g id="armL" transform="rotate(0 ${x} ${y})">
      <line ${s} x1="${x}" y1="${y}" x2="${x}" y2="${ELBOW_Y}"/>
      <g id="foreL" transform="rotate(0 ${x} ${ELBOW_Y})"><line ${s} x1="${x}" y1="${ELBOW_Y}" x2="${x}" y2="330"/></g>
    </g>
    <g id="head" transform="rotate(0 150 ${NECK.y})">
      ${P.hairBack}
      <circle cx="150" cy="78" r="46" fill="${P.skin}" stroke="${ink}" stroke-width="9"/>
      ${P.hairFront}${P.hat}
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
      ${P.face}
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
