// Bảng số lật (split-flap) như bảng giờ sân bay — vẽ bằng canvas, hoàn toàn theo thời gian t.
// Dùng:  const f = createFlap({ digits: 3 }); f.schedule([{ t: 0, value: 400 }, { t: 5, value: 240 }]); mỗi khung: f.update(t)
// Mỗi lần đổi số, chữ số nào khác thì lật: nửa trên cũ gập xuống (0 → 0,5 thời gian lật), nửa dưới mới mở ra (0,5 → 1).
import * as THREE from "three";

const FLIP = 0.42; // giây cho một lần lật
const STAGGER = 0.07; // các chữ số lật lệch nhau một chút cho sinh động

export function createFlap({ digits = 3, width = 1.2, cell = [180, 260], gap = 18, unit = "", bg = "#0F1A45", fg = "#FFFFFF" } = {}) {
  const [cw, ch] = cell;
  const unitW = unit ? 150 : 0;
  const cv = document.createElement("canvas");
  cv.width = digits * cw + (digits - 1) * gap + unitW + 40;
  cv.height = ch + 40;
  const ctx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const h = (width * cv.height) / cv.width;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  let sched = [{ t: 0, value: 0 }];
  let lastKey = "";

  const pad = (v) => String(v).padStart(digits, " ").slice(-digits);
  function card(x, y, w, hh, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, hh, r);
  }
  // vẽ một nửa (top/bottom) của chữ số d, co giãn theo chiều dọc quanh bản lề với hệ số sy
  function half(x, d, which, sy = 1) {
    const top = 20, mid = top + ch / 2;
    ctx.save();
    ctx.beginPath();
    if (which === "top") ctx.rect(x, top, cw, ch / 2 - 2);
    else ctx.rect(x, mid + 2, cw, ch / 2 - 2);
    ctx.clip();
    ctx.translate(0, mid);
    ctx.scale(1, Math.max(0.001, sy));
    ctx.translate(0, -mid);
    card(x, top, cw, ch, 22);
    ctx.fillStyle = which === "top" ? bg : shade(bg, -0.12);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `800 ${Math.round(ch * 0.78)}px Inter`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d, x + cw / 2, mid + ch * 0.03);
    ctx.restore();
  }

  function draw(prev, next, ks) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < digits; i++) {
      const x = 20 + i * (cw + gap);
      const a = prev[i], b = next[i], k = ks[i];
      if (a === b || k >= 1) {
        half(x, b, "top");
        half(x, b, "bottom");
      } else if (k <= 0) {
        half(x, a, "top");
        half(x, a, "bottom");
      } else {
        half(x, b, "top"); // nửa trên mới đã lộ phía sau
        half(x, a, "bottom"); // nửa dưới cũ còn đó cho tới khi lá mới phủ xuống
        if (k < 0.5) half(x, a, "top", 1 - k * 2); // lá trên cũ gập xuống
        else half(x, b, "bottom", (k - 0.5) * 2); // lá dưới mới mở ra
      }
      // khe bản lề
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(x, 20 + ch / 2 - 2, cw, 4);
    }
    if (unit) {
      ctx.fillStyle = fg;
      ctx.font = `800 ${Math.round(ch * 0.36)}px Inter`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(unit, 20 + digits * (cw + gap) + 4, 20 + ch * 0.86);
    }
    tex.needsUpdate = true;
  }

  return {
    mesh,
    height: h,
    schedule(s) {
      sched = [...s].sort((a, b) => a.t - b.t);
    },
    value(t) {
      let v = sched[0].value;
      for (const s of sched) if (t >= s.t) v = s.value;
      return v;
    },
    update(t) {
      let i = 0;
      while (i + 1 < sched.length && sched[i + 1].t <= t) i++;
      const cur = sched[i], prev = sched[Math.max(0, i - 1)];
      const A = pad(prev.value), B = pad(cur.value);
      const ks = [...B].map((_, j) => (i === 0 ? 1 : Math.min(1, Math.max(0, (t - cur.t - j * STAGGER) / FLIP))));
      const key = A + B + ks.map((k) => k.toFixed(3)).join();
      if (key === lastKey) return;
      lastKey = key;
      draw(A, B, ks);
    },
  };
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return "#" + c.getHexString();
}
