// Đoạn 3D "Tổ Ấm Land" thay cảnh s14–s16 của Tập 4. Kịch bản: content3d/t04-tomland-3d.content.json
// Nguyên tắc cho gọn: mỗi câu thoại một nhịp hình, trên màn hình chỉ một con số; không chú thích phụ.
// Số liệu: 400 tỷ = 20 đồng (20 tỷ/đồng); nợ 2.000 tỷ; lãi 8% / 10% / 12% = 8 / 10 / 12 đồng → còn 240 / 200 / 160 tỷ.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { boot } from "../runtime.js";
import { setupStudio, roundedCyl, coinGeo } from "../studio.js";
import { createAn2 } from "../an2.js";
import { cameraPath } from "../camera.js";
import { C } from "../materials.js";
import { ep, prog, ease, lerp, clamp } from "../core.js";

const V = window.VIDEO;
const D = V.duration;
const S = Object.fromEntries(V.scenes.map((s) => [s.id, s]));
const T = (id, a = 0) => S[id].start + a;
const inS = (t, id) => t >= S[id].start && t < S[id].end;

const N = 20, VALUE = 20, H = 0.1, TOP = 0.62;
const XT = -0.7; // chồng xu
const XV = 2.4; // két ngân hàng
const FLY = 0.62;

// Ba đợt trả lãi: thời điểm huy hiệu lãi suất đổi, xu bắt đầu bay, tổng số đồng đã trả sau đợt
const STEPS = [
  { rate: "8%", at: () => T("a3", 0.1), fly: () => T("a3", 1.5), total: 8, gap: 0.16 },
  { rate: "10%", at: () => T("a4", 0.1), fly: () => T("a4", 1.1), total: 10, gap: 0.2 },
  { rate: "12%", at: () => T("a5", 0.1), fly: () => T("a5", 1.0), total: 12, gap: 0.2 },
];
const GOLD = new THREE.Color("#F2B544");

boot({
  duration: D,
  audio: V.audio,
  lights: false,
  async setup(ctx) {
    const { scene, camera, overlay, width, height } = ctx;
    const studio = setupStudio(ctx);
    const launch = [];
    STEPS.forEach((s, k) => {
      const from = k ? STEPS[k - 1].total : 0;
      for (let j = from; j < s.total; j++) launch[j] = s.fly() + (j - from) * s.gap;
    });
    // đồng thứ i (0 = dưới cùng) rơi xuống chồng lúc nào (cảnh a1)
    const dropAt = (i) => T("a1", 0.5) + i * 0.11;

    // ---------- bệ + chồng xu ----------
    const ped = new THREE.Group();
    ped.add(roundedCyl(0.95, TOP, 0.09, new THREE.MeshPhysicalMaterial({ color: "#1F2D63", roughness: 0.4, clearcoat: 0.6 })));
    const rimRing = roundedCyl(0.98, 0.07, 0.03, new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0.25, roughness: 0.4 }));
    rimRing.position.y = TOP - 0.1;
    ped.add(rimRing);
    ped.position.x = XT;
    scene.add(ped);
    const coins = Array.from({ length: N }, (_, i) => {
      const m = new THREE.Mesh(coinGeo, new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.26, clearcoat: 0.3, emissive: new THREE.Color("#FFB000"), emissiveIntensity: 0 }));
      m.castShadow = m.receiveShadow = true;
      m.userData.home = new THREE.Vector3(XT + Math.sin(i * 2.3) * 0.025, TOP + 0.05 + i * H, Math.cos(i * 1.7) * 0.025);
      m.userData.ry = i * 0.9;
      scene.add(m);
      return m;
    });

    // ---------- két ngân hàng ----------
    const vault = new THREE.Group();
    scene.add(vault);
    const vbody = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.8, 1.5, 4, 0.16), new THREE.MeshPhysicalMaterial({ color: "#2A3A78", roughness: 0.38, clearcoat: 0.7 }));
    vbody.position.y = 0.2 + 0.9;
    vbody.castShadow = vbody.receiveShadow = true;
    vault.add(vbody);
    const feet = roundedCyl(0.9, 0.2, 0.05, new THREE.MeshPhysicalMaterial({ color: "#1A245A", roughness: 0.4 }));
    feet.scale.z = 0.7;
    vault.add(feet);
    const door = roundedCyl(0.6, 0.1, 0.04, new THREE.MeshStandardMaterial({ color: "#D9DEEA", metalness: 0.85, roughness: 0.25 }));
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 1.1, 0.8);
    vault.add(door);
    const ringMat = new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0.3 });
    const doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.03, 10, 64), ringMat);
    doorRing.position.set(0, 1.1, 0.77);
    vault.add(doorRing);
    const handle = new THREE.Group();
    handle.position.set(0, 1.1, 0.92);
    const steel = new THREE.MeshStandardMaterial({ color: "#8E97AE", metalness: 0.9, roughness: 0.3 });
    handle.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 32), steel));
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.5, 4, 8), steel);
      sp.rotation.z = (k * Math.PI) / 3;
      handle.add(sp);
    }
    vault.add(handle);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.2), new THREE.MeshBasicMaterial({ color: "#0B1237" }));
    slot.position.set(0, 2.005, 0);
    const slotGlowMat = new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0, transparent: true, opacity: 0 });
    const slotGlow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.34), slotGlowMat);
    slotGlow.position.set(0, 2.0, 0);
    vault.add(slot, slotGlow);
    const slotWorld = new THREE.Vector3(XV, 2.02, 0);

    // ---------- An ----------
    const an = createAn2({ scale: 1.12 });
    const err = an.validateRig();
    if (err.length) throw new Error("Rig An lỗi: " + err.join(", "));
    an.root.position.set(-3.4, 0, 1.0);
    an.root.rotation.y = 0.4;
    scene.add(an.root);
    an.track([
      { t: 0, pose: "idle", expr: "happy" },
      { t: T("a2"), pose: "point", expr: "neutral" },
      { t: T("a3"), pose: "point", expr: "thinking" },
      { t: T("a5", 0.6), pose: "point", expr: "surprised" },
      { t: T("a6"), pose: "headHold", expr: "worried" },
      { t: T("a6", 2.6), pose: "shrug", expr: "confused" },
    ]);

    // ---------- máy quay ----------
    const cam = cameraPath([
      { t: 0, p: [-0.35, 0.95, 4.4], l: [XT, 0.95, 0] },
      { t: T("a1", 3.3), p: [-0.45, 2.3, 6.2], l: [XT, 1.85, 0] },
      { t: S.a1.end, p: [-1.5, 2.5, 8.8], l: [-1.4, 1.7, 0] },
      { t: T("a2"), p: [1.5, 2.6, 10.6], l: [1.0, 1.55, 0], cut: true },
      { t: S.a2.end, p: [1.0, 2.5, 10.1], l: [0.9, 1.5, 0] },
      { t: S.a5.end, p: [0.85, 2.2, 8.2], l: [0.85, 1.4, 0] },
      { t: T("a6"), p: [-2.45, 2.05, 4.1], l: [-3.15, 1.85, 1.0], cut: true },
      { t: T("a6", 2.4), p: [-2.3, 2.1, 4.4], l: [-3.0, 1.8, 1.0] },
      { t: D, p: [0.1, 3.0, 11.6], l: [0.1, 1.35, 0], ease: ease.out },
    ]);

    // ---------- lớp chữ ----------
    overlay.insertAdjacentHTML(
      "beforeend",
      `<style>
        .brand { position: absolute; left: 64px; top: 46px; display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 26px; color: ${C.ink}; }
        .brand b { background: ${C.ink}; color: ${C.accent}; padding: 6px 12px; border-radius: 10px; font-weight: 800; letter-spacing: .04em; }
        .brand i { font-style: normal; color: ${C.muted}; font-weight: 400; }
        .cap { position: absolute; left: 0; right: 0; bottom: 54px; display: flex; justify-content: center; padding-left: 520px; }
        .cap span { display: inline-block; max-width: 1240px; background: ${C.ink}; color: #fff; font-size: 40px; font-weight: 600; line-height: 1.3; padding: 14px 30px; border-radius: 18px; }
        .hud { position: absolute; left: 50%; top: 104px; transform: translateX(-50%); display: flex; align-items: stretch; gap: 18px; }
        .card { text-align: center; color: ${C.ink}; white-space: nowrap; background: rgba(255,255,255,.9); border-radius: 22px; padding: 12px 30px 14px; box-shadow: 0 10px 30px rgba(11,18,55,.1); }
        .card .k { font-size: 24px; color: ${C.muted}; font-weight: 600; }
        .card .n { font-size: 84px; font-weight: 800; letter-spacing: -2px; line-height: 1; color: ${C.ink}; }
        .card .n small { font-size: 44px; letter-spacing: 0; }
        .card .cut { display: inline-block; vertical-align: middle; margin-left: 10px; padding: 4px 14px; border-radius: 12px; background: #E5484D; color: #fff; font-size: 30px; font-weight: 800; letter-spacing: 0; }
        .tag { position: absolute; transform: translate(0, -50%); padding: 8px 16px; border-radius: 12px; background: #fff; box-shadow: 0 8px 24px rgba(11,18,55,.14);
          font-size: 26px; font-weight: 700; color: ${C.ink}; white-space: nowrap; }
        .vlab { position: absolute; transform: translate(-50%, -100%); text-align: center; color: ${C.ink}; white-space: nowrap; }
        .vlab .t { font-size: 34px; font-weight: 800; }
        .vlab .s { font-size: 26px; font-weight: 600; color: ${C.muted}; }
        .rate { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 12px 30px; border-radius: 22px; background: ${C.ink}; color: #fff; font-size: 24px; font-weight: 600; }
        .rate b { font-size: 70px; font-weight: 800; color: ${C.accent}; letter-spacing: -1px; line-height: 1; }
        .fade { position: absolute; inset: 0; background: #F6F8FD; }
      </style>
      <div class="brand"><b>DSC</b> Academy <i>· Bài ${V.episode}/12 · ${V.title}</i></div>
      <div class="hud"><div class="card"><div class="k"></div><div class="n"></div></div><div class="rate">Lãi suất vay <b></b></div></div>
      <div class="tag">1 đồng = ${VALUE} tỷ</div>
      <div class="vlab"><div class="t">Ngân hàng</div><div class="s">cho vay 2.000 tỷ</div></div>
      <div class="cap"><span></span></div>
      <div class="fade"></div>`
    );
    const $ = (s) => overlay.querySelector(s);
    const hud = $(".hud"), cardK = $(".card .k"), cardN = $(".card .n"), tag = $(".tag"), vlab = $(".vlab");
    const rate = $(".rate"), rateB = $(".rate b"), cap = $(".cap span"), fade = $(".fade");
    const allCaps = V.scenes.flatMap((s) => s.captions);
    const v3 = new THREE.Vector3();
    const place = (el, p) => {
      v3.copy(p).project(camera);
      el.style.left = ((v3.x + 1) / 2) * width + "px";
      el.style.top = ((1 - v3.y) / 2) * height + "px";
    };
    const a = new THREE.Vector3(), b = new THREE.Vector3(), tmp = new THREE.Vector3();

    const update = (t) => {
      cam(camera, t);

      // két trượt vào khung ở a2
      const vin = ep(t, T("a2", 0.1), 1.1, ease.out);
      vault.position.set(lerp(7.5, XV, vin), 0, 0);
      vault.visible = vin > 0;

      // xu: rơi xuống xếp chồng (a1) → bay vào khe két (a3–a5)
      let stacked = 0, paid = 0, entering = 0;
      coins.forEach((c, i) => {
        const home = c.userData.home;
        const j = N - 1 - i; // đồng trên cùng trả trước
        const L = launch[j];
        const u = L === undefined ? 0 : prog(t, L, FLY);
        const d = prog(t, dropAt(i), 0.36);
        if (d >= 1 && u < 0.95) stacked++;
        if (u >= 0.95) paid++;
        if (u > 0.7 && u < 1) entering++;
        if (u <= 0) {
          // rơi từ trên xuống, nảy nhẹ khi chạm
          const k = ease.in(d);
          c.position.set(home.x, home.y + (1 - k) * 3.2 + (d >= 1 ? Math.sin(clamp((t - dropAt(i) - 0.36) / 0.18) * Math.PI) * 0.03 : 0), home.z);
          c.rotation.set((1 - k) * 0.8, c.userData.ry + (1 - k) * 2, 0);
          c.visible = d > 0;
          c.scale.setScalar(1);
        } else {
          a.copy(home);
          const k = ease.inOut(clamp(u / 0.8));
          b.copy(slotWorld).setY(slotWorld.y + 0.45);
          c.position.lerpVectors(a, b, k);
          c.position.y += Math.sin(k * Math.PI) * 0.7;
          // 20% cuối: dựng đứng và chui vào khe
          const s = clamp((u - 0.8) / 0.2);
          c.position.y -= s * 0.6;
          c.rotation.set(lerp(Math.sin(k * Math.PI) * 0.4, Math.PI / 2, s), c.userData.ry + k * Math.PI * 2 * (1 - s), 0);
          c.visible = u < 1;
        }
        const tagGlow = inS(t, "a1") && i === N - 1 ? ep(t, T("a1") + S.a1.end - S.a1.start - 2.6, 0.3) : 0;
        c.material.emissiveIntensity = tagGlow * (0.35 + 0.15 * Math.sin(t * 8));
      });
      slotGlowMat.opacity = Math.min(1, entering) * 0.9;
      slotGlowMat.emissiveIntensity = entering ? 1.2 : 0;
      ringMat.emissiveIntensity = 0.3 + (entering ? 0.5 : 0);

      // thẻ số: đếm lên khi xếp chồng, đếm xuống khi trả lãi
      const value = stacked * VALUE;
      const cutOn = t >= T("a5", 1.0) + 0.2 + FLY;
      cardN.innerHTML = `${value}<small> tỷ</small>${cutOn ? '<span class="cut">−1/3</span>' : ""}`;
      cardK.textContent = t < T("a3") ? "Tổ Ấm Land (giả định) · lợi nhuận trước lãi vay" : "Lợi nhuận còn lại";
      hud.style.opacity = t < T("a6") ? ep(t, T("a1", 0.5), 0.4) : 1 - ep(t, T("a6", 0), 0.4);

      // "1 đồng = 20 tỷ" bên cạnh đồng trên cùng, đúng lúc nói câu đó
      const tagStart = S.a1.end - 2.7;
      tag.style.opacity = inS(t, "a1") ? ep(t, tagStart, 0.3) : 0;
      place(tag, tmp.set(XT + 0.62, TOP + N * H, 0));

      place(vlab, tmp.set(vault.position.x, 3.05, 0));
      vlab.style.opacity = t < T("a3") ? ep(t, T("a2", 0.9), 0.4) : 1 - ep(t, T("a3"), 0.3);

      let r = "";
      for (const s of STEPS) if (t >= s.at()) r = s.rate;
      rateB.textContent = r;
      const rk = r && t < T("a6") ? 1 : 0;
      const bump = STEPS.some((s) => t >= s.at() && t < s.at() + 0.35) ? 1.08 : 1;
      rate.style.display = rk ? "flex" : "none";
      rate.style.transform = `scale(${bump})`;

      an.root.visible = t >= T("a2"); // a1 chỉ tập trung vào chồng xu; An vào khung khi cắt sang toàn cảnh
      an.update(t);

      const c = allCaps.find((x) => t >= x.start && t < x.end);
      cap.textContent = c ? c.text : "";
      cap.parentElement.style.opacity = c ? 1 : 0;
      fade.style.opacity = Math.max(1 - ep(t, 0, 0.35), ep(t, D - 0.3, 0.3));
    };
    return { update, render: studio.render };
  },
});
