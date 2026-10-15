// Chữ trong không gian 3D: vẽ lên canvas 2D (font Inter, hỗ trợ tiếng Việt) rồi dán thành texture.
// Gọi sau document.fonts.ready để chữ không bị vẽ bằng font dự phòng.
import * as THREE from "three";
import { C } from "./materials.js";

// Tấm biển phẳng có chữ. width = chiều rộng trong không gian 3D (đơn vị mét).
export function textPlate(lines, { width = 2, bg = C.paper, fg = C.ink, weight = 800, size = 96, pad = 36, radius = 28, border = C.ink, sub = null } = {}) {
  const arr = Array.isArray(lines) ? lines : [lines];
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  const subSize = Math.round(size * 0.55);
  ctx.font = `${weight} ${size}px Inter`;
  let w = Math.max(...arr.map((l) => ctx.measureText(l).width));
  if (sub) {
    ctx.font = `600 ${subSize}px Inter`;
    w = Math.max(w, ctx.measureText(sub).width);
  }
  const lh = size * 1.18;
  cv.width = Math.ceil(w + pad * 2);
  cv.height = Math.ceil(arr.length * lh + pad * 2 + (sub ? subSize * 1.4 : 0));
  if (bg) {
    ctx.fillStyle = bg;
    roundRect(ctx, 4, 4, cv.width - 8, cv.height - 8, radius);
    ctx.fill();
    if (border) {
      ctx.lineWidth = 8;
      ctx.strokeStyle = border;
      ctx.stroke();
    }
  }
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${weight} ${size}px Inter`;
  arr.forEach((l, i) => ctx.fillText(l, cv.width / 2, pad + lh * (i + 0.5)));
  if (sub) {
    ctx.font = `600 ${subSize}px Inter`;
    ctx.fillStyle = C.muted;
    ctx.fillText(sub, cv.width / 2, pad + lh * arr.length + subSize * 0.7);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const h = (width * cv.height) / cv.width;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.userData.height = h;
  return m;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
