// Lớp chữ HTML phủ lên khung 3D: nhãn tiêu đề cảnh (góc trên trái), phụ đề (dưới), thẻ kết (cảnh outro).
// Cập nhật theo thời gian t, không dùng animation CSS để mỗi khung chụp ra luôn giống nhau.
import { C } from "./materials.js";
import { clamp } from "./core.js";

export function createOverlay(root, video) {
  root.insertAdjacentHTML(
    "beforeend",
    `<style>
      .ov-chip { position: absolute; left: 72px; top: 56px; display: flex; align-items: center; gap: 18px; padding: 18px 30px 18px 22px;
        background: ${C.ink}; color: #fff; border-radius: 18px; font-weight: 800; font-size: 46px; letter-spacing: -0.5px; box-shadow: 0 10px 30px rgba(11,18,55,.25); }
      .ov-chip i { width: 12px; height: 46px; border-radius: 6px; background: ${C.accent}; display: block; }
      .ov-ep { position: absolute; right: 72px; top: 64px; color: ${C.ink}; font-weight: 600; font-size: 26px; opacity: .7; }
      .ov-cap { position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); max-width: 1500px; padding: 14px 30px; border-radius: 16px;
        background: rgba(11,18,55,.82); color: #fff; font-weight: 600; font-size: 42px; line-height: 1.3; text-align: center; white-space: nowrap; }
      .ov-end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
        background: rgba(246,248,253,.86); color: ${C.ink}; text-align: center; }
      .ov-end h1 { font-size: 96px; font-weight: 800; letter-spacing: -2px; }
      .ov-end p { font-size: 44px; font-weight: 600; color: ${C.accentDark}; }
      .ov-end small { position: absolute; bottom: 70px; left: 200px; right: 200px; font-size: 26px; color: ${C.muted}; line-height: 1.45; }
    </style>
    <div class="ov-chip"><i></i><span></span></div>
    <div class="ov-ep">${video.series} · Bài ${video.episode}</div>
    <div class="ov-cap"></div>
    <div class="ov-end"><h1></h1><p></p><small></small></div>`
  );
  const chip = root.querySelector(".ov-chip");
  const chipText = chip.querySelector("span");
  const cap = root.querySelector(".ov-cap");
  const end = root.querySelector(".ov-end");
  const outro = video.scenes.find((s) => s.visual.type === "outro");
  if (outro) {
    end.querySelector("h1").textContent = outro.visual.headline;
    end.querySelector("p").textContent = outro.visual.sub;
    end.querySelector("small").textContent = outro.visual.disclaimer;
  }
  const allCaps = video.scenes.flatMap((s) => s.captions);
  let lastChip = null, lastCap = null;

  return (t) => {
    const sc = video.scenes.find((s) => t >= s.start && t < s.end) || video.scenes.at(-1);
    const text = sc.story.onscreen || "";
    if (text !== lastChip) chipText.textContent = lastChip = text;
    // nhãn trượt vào đầu cảnh, mờ đi trước khi hết cảnh
    const kin = clamp((t - sc.start - 0.15) / 0.35), kout = clamp((sc.end - t) / 0.3);
    const k = Math.min(kin, kout);
    const isOutro = sc.visual.type === "outro";
    chip.style.opacity = isOutro ? 0 : k;
    chip.style.transform = `translateX(${(1 - k) * -40}px)`;
    chip.style.display = text ? "flex" : "none";

    const c = allCaps.find((x) => t >= x.start && t < x.end);
    const ct = c ? c.text : "";
    if (ct !== lastCap) cap.textContent = lastCap = ct;
    cap.style.opacity = ct && !isOutro ? 1 : 0;

    const ke = isOutro ? clamp((t - sc.start - 0.6) / 0.5) : 0;
    end.style.opacity = ke;
    end.style.transform = `scale(${0.96 + 0.04 * ke})`;
  };
}
