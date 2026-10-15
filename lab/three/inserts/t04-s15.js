// Đoạn chèn 3D cho cảnh s15 của Tập 4 (hướng B: chèn vào bản 2D). Storyboard: content3d/t04-s15-insert.json
// Ẩn dụ: lợi nhuận trước lãi vay 400 tỷ của Tổ Ấm Land (giả định) = 20 đồng xu, mỗi đồng 20 tỷ.
// Lãi suất 8% → 10% → 12% trên khoản vay 2.000 tỷ = tiền lãi 160 → 200 → 240 tỷ = 8 → 10 → 12 đồng bay sang chồng "Tiền lãi".
// Mốc thời gian lấy theo chỗ ngắt hơi của giọng đọc (giây tính từ đầu cảnh s15).
import * as THREE from "three";
import { boot } from "../runtime.js";
import { setupStudio, roundedCyl, coinGeo } from "../studio.js";
import { createAn2 } from "../an2.js";
import { cameraPath } from "../camera.js";
import { C } from "../materials.js";
import { ep, prog, ease, lerp, clamp, wave } from "../core.js";

const V = window.VIDEO;
const D = V.duration;
const COIN_VALUE = 20; // tỷ đồng mỗi đồng xu
const N = 20;
const H = 0.1; // độ dày một đồng trong chồng
const TOP = 0.62; // mặt bệ

// Ba đợt lãi suất: thời điểm vặn núm, thời điểm xu bắt đầu bay, tổng số đồng đã sang chồng tiền lãi sau đợt
const STEPS = [
  { rate: "8%", turn: 0.35, fly: 1.75, total: 8, gap: 0.17 },
  { rate: "10%", turn: 6.35, fly: 7.85, total: 10, gap: 0.2 },
  { rate: "12%", turn: 9.15, fly: 10.35, total: 12, gap: 0.2 },
];
const FLY = 0.6; // giây bay của mỗi đồng

// lịch bay của từng đồng: đồng thứ j (0 = đồng đầu tiên bay) cất cánh lúc nào
const launch = [];
STEPS.forEach((s, k) => {
  const from = k ? STEPS[k - 1].total : 0;
  for (let j = from; j < s.total; j++) launch[j] = s.fly + (j - from) * s.gap;
});

const GOLD = new THREE.Color("#F2B544"), COPPER = new THREE.Color("#E2654F");

boot({
  duration: D,
  audio: V.audio,
  lights: false,
  async setup(ctx) {
    const { scene, camera, overlay, width, height } = ctx;
    const studio = setupStudio(ctx);

    // ---------- bệ ----------
    const pedL = new THREE.Group(), pedR = new THREE.Group();
    pedL.add(roundedCyl(0.95, TOP, 0.09, new THREE.MeshPhysicalMaterial({ color: "#1F2D63", roughness: 0.4, clearcoat: 0.6 })));
    { const rim = roundedCyl(0.98, 0.07, 0.03, new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0.25, roughness: 0.4 })); rim.position.y = TOP - 0.1; pedL.add(rim); }
    pedR.add(roundedCyl(0.95, TOP, 0.09, new THREE.MeshPhysicalMaterial({ color: "#F4F6FB", roughness: 0.45, clearcoat: 0.4 })));
    { const rim = roundedCyl(0.98, 0.07, 0.03, new THREE.MeshStandardMaterial({ color: "#E5484D", emissive: "#E5484D", emissiveIntensity: 0.2, roughness: 0.4 })); rim.position.y = TOP - 0.1; pedR.add(rim); }
    const XL = -1.15, XR = 1.35;
    pedL.position.x = XL;
    pedR.position.x = XR;
    scene.add(pedL, pedR);

    // ---------- 20 đồng xu ----------
    const coins = Array.from({ length: N }, (_, i) => {
      const m = new THREE.Mesh(coinGeo, new THREE.MeshPhysicalMaterial({ color: GOLD.clone(), metalness: 1, roughness: 0.26, clearcoat: 0.3, emissive: new THREE.Color("#FFB000"), emissiveIntensity: 0 }));
      m.castShadow = m.receiveShadow = true;
      // lệch nhẹ có quy luật để chồng xu trông tự nhiên
      m.userData.jx = Math.sin(i * 2.3) * 0.025;
      m.userData.jz = Math.cos(i * 1.7) * 0.025;
      m.userData.ry = i * 0.9;
      scene.add(m);
      return m;
    });
    const stackPos = (x, k, c) => new THREE.Vector3(x + c.userData.jx, TOP + 0.05 + k * H, c.userData.jz);

    // ---------- núm vặn lãi suất ----------
    const dial = new THREE.Group();
    dial.position.set(3.2, 0, 0.5);
    dial.rotation.y = -0.35;
    scene.add(dial);
    const stand = roundedCyl(0.5, 0.18, 0.05, new THREE.MeshPhysicalMaterial({ color: "#1F2D63", roughness: 0.4, clearcoat: 0.6 }));
    dial.add(stand);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 16), new THREE.MeshStandardMaterial({ color: "#C5CCDC", metalness: 0.8, roughness: 0.3 }));
    post.position.y = 0.6;
    post.castShadow = true;
    dial.add(post);
    const faceG = new THREE.Group();
    faceG.position.y = 1.55;
    dial.add(faceG);
    const plate = roundedCyl(0.78, 0.16, 0.06, new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.35, clearcoat: 0.8 }));
    plate.rotation.x = Math.PI / 2;
    plate.position.z = 0.08;
    faceG.add(plate);
    const ringMat = new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0.2 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 10, 64), ringMat);
    ring.position.z = 0.1;
    faceG.add(ring);
    const ANG = { off: 115, "8%": 55, "10%": 0, "12%": -55 };
    for (const r of ["8%", "10%", "12%"]) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: C.ink }));
      const a = THREE.MathUtils.degToRad(ANG[r]);
      tick.position.set(-Math.sin(a) * 0.62, Math.cos(a) * 0.62, 0.12);
      tick.rotation.z = a;
      faceG.add(tick);
    }
    const knob = new THREE.Group();
    knob.position.z = 0.12;
    faceG.add(knob);
    const kb = roundedCyl(0.42, 0.18, 0.06, new THREE.MeshPhysicalMaterial({ color: "#1F2D63", roughness: 0.35, clearcoat: 0.9 }));
    kb.rotation.x = Math.PI / 2;
    kb.position.z = 0.0;
    knob.add(kb);
    const notch = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 6, 12), new THREE.MeshStandardMaterial({ color: C.warn, emissive: C.warn, emissiveIntensity: 0.3 }));
    notch.position.set(0, 0.24, 0.2);
    knob.add(notch);

    // ---------- An bản mới ----------
    const an = createAn2({ scale: 1.12 });
    const err = an.validateRig();
    if (err.length) throw new Error("Rig An lỗi: " + err.join(", "));
    an.root.position.set(-3.0, 0, 1.0);
    an.root.rotation.y = 0.38;
    scene.add(an.root);
    an.track([
      { t: 0, pose: "present", expr: "happy" },
      { t: 1.6, pose: "point", expr: "happy" },
      { t: 3.6, pose: "present", expr: "confident" },
      { t: 6.2, pose: "point", expr: "thinking" },
      { t: 9.0, pose: "point", expr: "surprised" },
      { t: 10.5, pose: "headHold", expr: "worried" },
    ]);

    // ---------- máy quay ----------
    const cam = cameraPath([
      { t: 0, p: [-0.5, 2.7, 11.4], l: [0.1, 1.75, 0], fov: 30 },
      { t: 3.6, p: [-0.1, 2.6, 11.0], l: [0.1, 1.72, 0], fov: 30 },
      { t: 6.3, p: [0.8, 2.7, 10.8], l: [0.25, 1.72, 0], fov: 30 },
      { t: 9.1, p: [0.4, 2.5, 10.3], l: [0.15, 1.7, 0], fov: 30 },
      { t: D, p: [0.15, 2.4, 9.9], l: [0.1, 1.66, 0], fov: 30 },
    ]);

    // ---------- lớp chữ HTML (giống bản 2D: dòng thương hiệu + phụ đề) ----------
    overlay.insertAdjacentHTML(
      "beforeend",
      `<style>
        .brand { position: absolute; left: 64px; top: 46px; display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 26px; color: ${C.ink}; }
        .brand b { background: ${C.ink}; color: ${C.accent}; padding: 6px 12px; border-radius: 10px; font-weight: 800; letter-spacing: .04em; }
        .brand i { font-style: normal; color: ${C.muted}; font-weight: 400; }
        .cap { position: absolute; left: 0; right: 0; bottom: 54px; display: flex; justify-content: center; padding-left: 520px; }
        .cap span { display: inline-block; max-width: 1240px; background: ${C.ink}; color: #fff; font-size: 40px; font-weight: 600; line-height: 1.3; padding: 14px 30px; border-radius: 18px; }
        .card { position: absolute; transform: translate(-50%, -100%); background: rgba(255,255,255,.92); border-radius: 22px; padding: 16px 26px 14px; text-align: center;
          box-shadow: 0 12px 36px rgba(11,18,55,.14); color: ${C.ink}; white-space: nowrap; }
        .card .k { font-size: 22px; color: ${C.muted}; font-weight: 600; }
        .card .t { font-size: 28px; font-weight: 800; margin-top: 2px; }
        .card .n { font-size: 64px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.05; margin-top: 4px; }
        .card.l .n { color: ${C.accentDark}; } .card.r .n { color: #D93C41; }
        .rate { position: absolute; transform: translate(-50%, -100%); text-align: center; color: ${C.ink}; }
        .rate .t { font-size: 24px; font-weight: 600; color: ${C.muted}; }
        .rate .n { font-size: 60px; font-weight: 800; letter-spacing: -1px; }
        .tk { position: absolute; transform: translate(-50%, -50%); font-size: 22px; font-weight: 800; color: ${C.muted}; }
        .legend { position: absolute; right: 64px; top: 40px; display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 600; color: ${C.ink};
          background: rgba(255,255,255,.85); padding: 10px 18px; border-radius: 14px; }
        .legend i { width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #FFE19A, #E9A62A); box-shadow: inset 0 0 0 3px #D89422; }
        .fade { position: absolute; inset: 0; background: #F6F8FD; }
      </style>
      <div class="brand"><b>DSC</b> Academy <i>· Bài ${V.episode}/12 · ${V.title}</i></div>
      <div class="legend"><i></i> 1 đồng = ${COIN_VALUE} tỷ đồng</div>
      <div class="card l"><div class="k">Tổ Ấm Land (giả định)</div><div class="t">Lợi nhuận trước thuế</div><div class="n"></div></div>
      <div class="card r"><div class="k">Trả cho ngân hàng</div><div class="t">Tiền lãi</div><div class="n"></div></div>
      <div class="rate"><div class="t">Lãi suất vay</div><div class="n"></div></div>
      <div class="tk" data-r="8%">8%</div><div class="tk" data-r="10%">10%</div><div class="tk" data-r="12%">12%</div>
      <div class="cap"><span></span></div>
      <div class="fade"></div>`
    );
    const $ = (s) => overlay.querySelector(s);
    const cardL = $(".card.l"), cardR = $(".card.r"), nL = $(".card.l .n"), nR = $(".card.r .n"), rate = $(".rate"), rateN = $(".rate .n"), cap = $(".cap span"), fade = $(".fade");
    const ticks = [...overlay.querySelectorAll(".tk")];
    const legend = $(".legend");
    const caps = V.scenes[0].captions;
    const v3 = new THREE.Vector3();
    const toScreen = (p) => {
      v3.copy(p).project(camera);
      return [((v3.x + 1) / 2) * width, ((1 - v3.y) / 2) * height];
    };
    const placeAt = (el, p) => {
      const [x, y] = toScreen(p);
      el.style.left = x + "px";
      el.style.top = y + "px";
    };
    const tmp = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3();
    const tickWorld = (r) => {
      const ang = THREE.MathUtils.degToRad(ANG[r]);
      return faceG.localToWorld(new THREE.Vector3(-Math.sin(ang) * 0.98, Math.cos(ang) * 0.98, 0.15));
    };

    const update = (t) => {
      cam(camera, t);

      // núm vặn: off → 8% → 10% → 12%
      let ang = ANG.off;
      let curRate = null;
      for (const s of STEPS) {
        const k = ep(t, s.turn, 0.8, ease.back);
        if (t >= s.turn) {
          ang = lerp(ang, ANG[s.rate], k);
          curRate = s.rate;
        }
      }
      knob.rotation.z = THREE.MathUtils.degToRad(ang);
      const turning = STEPS.some((s) => t >= s.turn && t < s.turn + 1);
      ringMat.emissiveIntensity = turning ? 0.9 + 0.4 * Math.sin(t * 14) : 0.25;

      // xu: đồng thứ j bay từ đỉnh chồng trái sang chồng phải (vị trí j), lật một vòng, đổi màu vàng → đồng đỏ
      let landed = 0;
      coins.forEach((c, i) => {
        const j = N - 1 - i; // đồng trên cùng bay trước
        const L = launch[j];
        const u = L === undefined ? 0 : prog(t, L, FLY);
        if (u >= 0.92) landed++;
        a.copy(stackPos(XL, i, c));
        if (u <= 0) {
          c.position.copy(a);
          c.rotation.set(0, c.userData.ry, 0);
        } else {
          b.copy(stackPos(XR, j, c));
          const k = ease.inOut(u);
          c.position.lerpVectors(a, b, k);
          c.position.y += Math.sin(k * Math.PI) * 0.4;
          // xoay ngang + nghiêng nhẹ: luôn thấy rõ là đồng xu (lật dọc sẽ nhìn thẳng mặt như quả bóng)
          c.rotation.set(Math.sin(k * Math.PI) * 0.45, c.userData.ry + k * Math.PI * 3, -Math.sin(k * Math.PI) * 0.25);
        }
        c.material.color.copy(GOLD).lerp(COPPER, ease.inOut(clamp(u * 1.3)));
        // chồng còn lại lấp lánh khi nói "còn lại ..."
        const glow = u <= 0 ? Math.max(ep(t, 3.7, 0.4) * (1 - ep(t, 5.3, 0.6)), ep(t, 10.5, 0.4)) : 0;
        c.material.emissiveIntensity = glow * (0.12 + 0.06 * Math.sin(t * 6 + i));
      });

      // chữ bám theo vật thể
      const left = N - landed;
      nL.textContent = `${left * COIN_VALUE} tỷ`;
      nR.textContent = `${landed * COIN_VALUE} tỷ`;
      // hai thẻ cùng một hàng, cao hơn đường bay của xu
      placeAt(cardL, tmp.set(XL, TOP + N * H + 0.48, 0));
      placeAt(cardR, tmp.set(XR, TOP + N * H + 0.48, 0));
      const pulse = 1 + 0.06 * Math.max(Math.sin(clamp((t - 3.7) / 0.5) * Math.PI), Math.sin(clamp((t - 7.9) / 0.5) * Math.PI), Math.sin(clamp((t - 10.5) / 0.5) * Math.PI));
      cardL.style.transform = `translate(-50%, -100%) scale(${pulse})`;
      cardL.style.opacity = ep(t, 0.15, 0.5);
      cardR.style.opacity = ep(t, 1.6, 0.4);
      placeAt(rate, faceG.localToWorld(mid.set(0, 1.25, 0)));
      rateN.textContent = curRate || "";
      rate.style.opacity = ep(t, 0.3, 0.4);
      ticks.forEach((el) => {
        placeAt(el, tickWorld(el.dataset.r));
        el.style.color = el.dataset.r === curRate ? C.ink : C.muted;
        el.style.opacity = ep(t, 0.2, 0.4) * (el.dataset.r === curRate ? 1 : 0.6);
      });
      legend.style.opacity = ep(t, 0.6, 0.5);

      an.update(t);

      const c = caps.find((x) => t >= x.start && t < x.end);
      cap.textContent = c ? c.text : "";
      cap.parentElement.style.opacity = c ? 1 : 0;
      // vào/ra mờ từ nền giấy của bản 2D để cắt ghép liền mạch
      fade.style.opacity = Math.max(1 - ep(t, 0, 0.35), ep(t, D - 0.3, 0.3));
    };
    return { update, render: studio.render };
  },
});
