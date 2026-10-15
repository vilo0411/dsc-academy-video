// Đoạn 3D "Thang máy lợi nhuận" (thay cảnh s14–s16 của Tập 4). Kịch bản: content3d/t04-tomland-3d.content.json
// An đứng trong cabin thang kính của toà Tổ Ấm Land (giả định). Lợi nhuận = tầng: 400 → 240 → 200 → 160.
// Mỗi lần lãi suất tăng, cần cẩu "Ngân hàng" đặt thêm bao tiền lãi lên nóc cabin (160 / +40 / +40 tỷ) và thang tụt tầng.
// Chữ đều nằm trên vật thể; 22% đáy khung để dành cho phụ đề (kiểm tra bằng window.__overlap).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { boot } from "../runtime.js";
import { setupStudio, roundedCyl } from "../studio.js";
import { createAn2 } from "../an2.js";
import { createFlap } from "../flap.js";
import { textPlate } from "../labels.js";
import { C } from "../materials.js";
import { COMPANIES } from "../../lib/series.mjs";
import { ep, prog, ease, lerp, clamp, wave } from "../core.js";

const V = window.VIDEO;
const D = V.duration;
const S = Object.fromEntries(V.scenes.map((s) => [s.id, s]));
const T = (id, a = 0) => S[id].start + a;
const dur = (id) => S[id].end - S[id].start;

// tầng (sàn cabin) theo lợi nhuận: 400 → y 14
const FLOOR = (p) => p * 0.035;
const LEVELS = [400, 240, 200, 160];
const CAB = { w: 2.4, d: 2.2, h: 2.8 };
const SHAFT_Z = 0.9;
const MAST_X = -8.5, JIB_Y = 25.5;

// lịch: bao thứ k đặt lên nóc lúc land[k], thang bắt đầu rơi lúc drop[k]
const PLAN = () => [
  { label: ["8%", "160 tỷ"], scale: 1, off: [-0.55, -0.3], land: T("a3", 0.7), drop: T("a3", dur("a3") * 0.56), fall: 0.6, bounce: 0.09, shake: 0.12 },
  { label: ["+40 tỷ"], scale: 0.72, off: [0.6, -0.3], land: T("a4", 0.95), drop: T("a4", 1.25), fall: 0.55, bounce: 0.08, shake: 0.12 },
  { label: ["+40 tỷ"], scale: 0.72, off: [0, 0.5], land: T("a5", 0.95), drop: T("a5", 1.3), fall: 0.75, bounce: 0.13, shake: 0.22 },
];

const vinyl = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, ...o });
const shadowAll = (g) => (g.traverse((o) => o.isMesh && !o.material.isMeshBasicMaterial && !o.material.transparent && (o.castShadow = o.receiveShadow = true)), g);

// chữ "sơn" lên vật thể: tấm phẳng không viền, không quay theo camera
const paint = (lines, o) => textPlate(lines, { bg: null, border: null, ...o });

function tower({ color, w = 5.6, h = 22, d = 4.6, name, sub, cols = [-2.2, -1.35, 1.35, 2.2] }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, 0.35), vinyl(color, { roughness: 0.55, clearcoat: 0.2 }));
  body.position.set(0, h / 2, -d / 2 - 0.4);
  g.add(body);
  // lưới cửa sổ
  const win = new THREE.InstancedMesh(new RoundedBoxGeometry(0.62, 0.9, 0.08, 2, 0.06), vinyl("#BFE3FF", { roughness: 0.1, clearcoat: 1, emissive: "#9FD3FF", emissiveIntensity: 0.12 }), 400);
  const m = new THREE.Object3D();
  let n = 0;
  for (let y = 1.6; y < h - 1.4; y += 1.45)
    for (const x of cols) {
      m.position.set(x, y, -0.36);
      m.updateMatrix();
      win.setMatrixAt(n++, m.matrix);
    }
  win.count = n;
  g.add(win);
  // vương miện trên nóc
  const crown = new THREE.Mesh(new RoundedBoxGeometry(w + 0.3, 0.6, d + 0.3, 3, 0.2), vinyl(C.accent, { emissive: C.accent, emissiveIntensity: 0.15 }));
  crown.position.set(0, h + 0.3, -d / 2 - 0.4);
  g.add(crown);
  const sign = paint(name, { width: 4.4, size: 96, fg: C.ink, sub });
  sign.position.set(0, h - 1.4, 0.0 - 0.32);
  // biển tên trên mặt tiền, phía trên giếng thang
  const plate = new THREE.Mesh(new RoundedBoxGeometry(4.8, 1.7, 0.2, 3, 0.12), vinyl("#FFFFFF", { roughness: 0.4 }));
  plate.position.set(0, h + 1.6, -0.6);
  sign.position.set(0, h + 1.6, -0.48);
  g.add(plate, sign);
  return shadowAll(g);
}

function shaft(h = 21) {
  const g = new THREE.Group();
  const navy = vinyl("#1F2D63", { roughness: 0.35, clearcoat: 0.7 });
  for (const x of [-1.45, 1.45]) for (const z of [-1.3, 1.3]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, h, 12), navy);
    p.position.set(x, h / 2, SHAFT_Z + z);
    g.add(p);
  }
  for (let y = 3.5; y <= h; y += 3.5)
    for (const z of [-1.3, 1.3]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 8), navy);
      b.rotation.z = Math.PI / 2;
      b.position.set(0, y, SHAFT_Z + z);
      g.add(b);
    }
  const top = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.35, 3.0, 3, 0.1), navy);
  top.position.set(0, h + 0.17, SHAFT_Z);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 10, 32), vinyl("#C5CCDC", { metalness: 0.8, roughness: 0.3 }));
  wheel.position.set(0, h + 0.75, SHAFT_Z);
  g.add(top, wheel);
  return shadowAll(g);
}

function cabin() {
  const g = new THREE.Group();
  const navy = vinyl("#1F2D63", { roughness: 0.35, clearcoat: 0.7 });
  const floor = new THREE.Mesh(new RoundedBoxGeometry(CAB.w, 0.2, CAB.d, 3, 0.07), navy);
  floor.position.y = 0.1;
  const roof = floor.clone();
  roof.position.y = CAB.h;
  g.add(floor, roof);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, CAB.h, 10), navy);
    p.position.set((x * (CAB.w - 0.12)) / 2, CAB.h / 2, (z * (CAB.d - 0.12)) / 2);
    g.add(p);
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: "#DDEEFF", roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(CAB.w - 0.1, CAB.h - 0.2), glass);
  back.position.set(0, CAB.h / 2, -CAB.d / 2 + 0.05);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(CAB.d - 0.1, CAB.h - 0.2), glass);
  left.rotation.y = Math.PI / 2;
  left.position.set(-CAB.w / 2 + 0.05, CAB.h / 2, 0);
  const right = left.clone();
  right.position.x = CAB.w / 2 - 0.05;
  g.add(back, left, right);
  // tay vịn vàng
  const brass = vinyl("#E8B04B", { metalness: 0.7, roughness: 0.3 });
  const rail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, CAB.w - 0.4, 4, 10), brass);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.05, -CAB.d / 2 + 0.2);
  g.add(rail);
  // dầm trên cửa + bảng số lật
  const beam = new THREE.Mesh(new RoundedBoxGeometry(CAB.w, 0.62, 0.16, 3, 0.06), navy);
  beam.position.set(0, CAB.h - 0.38, CAB.d / 2);
  g.add(beam);
  const flap = createFlap({ digits: 3, width: 1.3, unit: "tỷ" });
  flap.mesh.position.set(0, CAB.h - 0.38, CAB.d / 2 + 0.09);
  g.add(flap.mesh);
  return { group: shadowAll(g), flap, roofY: CAB.h + 0.2 };
}

function sack(label, s) {
  const g = new THREE.Group();
  const burlap = vinyl("#C9A15F", { roughness: 0.8, clearcoat: 0 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), burlap);
  body.scale.set(1, 0.85, 0.9);
  body.position.y = 0.52;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 16), burlap);
  neck.position.y = 1.1;
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 8, 20), vinyl("#E5484D"));
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 1.08;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), vinyl("#8E97AE", { metalness: 0.8 }));
  loop.position.y = 1.32;
  g.add(body, neck, tie, loop);
  const txt = paint(label, { width: 0.9, size: 90, fg: "#B3262B", weight: 800 });
  txt.position.set(0, 0.55, 0.57);
  g.add(txt);
  g.scale.setScalar(s);
  return shadowAll(g);
}

function crane() {
  const g = new THREE.Group();
  const yellow = vinyl(C.warn, { roughness: 0.4 });
  const mast = new THREE.Mesh(new RoundedBoxGeometry(0.7, JIB_Y, 0.7, 2, 0.08), yellow);
  mast.position.y = JIB_Y / 2;
  g.add(mast);
  for (let y = 1; y < JIB_Y - 1; y += 1.4) {
    const x = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06), vinyl("#B88A1E"));
    x.position.set(0, y + 0.7, 0.36);
    x.rotation.z = 0.42 * (Math.floor(y) % 2 ? 1 : -1);
    g.add(x);
  }
  const pivot = new THREE.Group();
  pivot.position.y = JIB_Y;
  g.add(pivot);
  const jib = new THREE.Mesh(new RoundedBoxGeometry(12, 0.55, 0.55, 2, 0.08), yellow);
  jib.position.x = 5.6;
  const counter = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.5, 0.5, 2, 0.08), yellow);
  counter.position.x = -1.6;
  const weight = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.0, 0.9, 2, 0.1), vinyl("#5A6385"));
  weight.position.set(-2.6, -0.6, 0);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.9, 0.9, 2, 0.1), vinyl("#FFFFFF"));
  cab.position.set(0.6, -0.7, 0);
  pivot.add(jib, counter, weight, cab);
  const sign = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.0, 0.12, 2, 0.08), vinyl(C.ink));
  sign.position.set(5.2, 0.85, 0.15);
  const signTxt = paint("NGÂN HÀNG", { width: 3.1, size: 110, fg: C.accent });
  signTxt.position.set(5.2, 0.85, 0.23);
  pivot.add(sign, signTxt);
  const trolley = new THREE.Group();
  trolley.add(new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.35, 0.8, 2, 0.06), vinyl("#5A6385")));
  trolley.position.y = -0.45;
  pivot.add(trolley);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), vinyl("#2A2F45"));
  const hook = new THREE.Group();
  hook.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16, Math.PI * 1.4), vinyl("#8E97AE", { metalness: 0.8 })));
  const block = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.3, 0.3, 2, 0.05), vinyl(C.warn));
  block.position.y = 0.3;
  hook.add(block);
  g.add(cable, hook);
  return { group: shadowAll(g), pivot, trolley, cable, hook };
}

boot({
  duration: D,
  audio: V.audio,
  lights: false,
  async setup(ctx) {
    const { scene, camera, overlay, width, height } = ctx;
    const studio = setupStudio(ctx, { backdrop: "#E9EEF8", bg: "#E9EEF8", keyPos: [10, 30, 16] });
    Object.assign(studio.key.shadow.camera, { left: -18, right: 18, top: 30, bottom: -4, near: 1, far: 70 });
    studio.key.shadow.camera.updateProjectionMatrix();
    studio.key.target.position.set(0, 8, 0);
    const BG_WARM = new THREE.Color("#EEF1F8"), BG_COOL = new THREE.Color("#DCE3F2");
    const KEY_WARM = new THREE.Color("#FFF1DC"), KEY_COOL = new THREE.Color("#D2DEFF");
    const plan = PLAN();

    // ---------- toà Tổ Ấm Land + giếng thang ----------
    const tom = tower({ color: COMPANIES.toam.fill, name: COMPANIES.toam.name, sub: "doanh nghiệp giả định", cols: [1.85, 2.4] }); // nửa trái để sơn vạch tầng
    scene.add(tom);
    scene.add(shaft());
    // vạch tầng sơn trên mặt tiền, cạnh giếng thang
    const marks = {};
    for (const p of LEVELS) {
      const g = new THREE.Group();
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.04), new THREE.MeshBasicMaterial({ color: C.ink }));
      const txt = paint(String(p), { width: 0.68, size: 110, fg: C.ink });
      txt.position.set(0, 0.32, 0);
      g.add(line, txt);
      g.position.set(-2.32, FLOOR(p) + 0.2, -0.32);
      scene.add(g);
      marks[p] = g;
    }
    const third = paint("−1/3", { width: 0.8, size: 120, fg: "#D93C41" });
    third.position.set(-2.32, FLOOR(160) - 0.22, -0.31);
    scene.add(third);
    const shaftSign = paint("THANG MÁY LỢI NHUẬN", { width: 2.9, size: 90, fg: "#FFFFFF" });
    shaftSign.position.set(0, 21.17, SHAFT_Z + 1.52);
    scene.add(shaftSign);
    const cableMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), vinyl("#2A2F45"));
    scene.add(cableMesh);

    // ---------- cabin + An ----------
    const cab = cabin();
    scene.add(cab.group);
    const an = createAn2({ scale: 1.0 });
    const err = an.validateRig();
    if (err.length) throw new Error("Rig An lỗi: " + err.join(", "));
    an.root.position.set(0, 0.2, -0.15);
    cab.group.add(an.root);
    an.track([
      { t: 0, pose: "idle", expr: "happy" },
      { t: T("a1", 1.6), pose: "wave", expr: "happy" },
      { t: T("a2", 0.6), pose: "lookUp", expr: "surprised" },
      { t: plan[0].drop - 0.1, pose: "grip", expr: "worried" },
      { t: T("a4"), pose: "lookUp", expr: "worried" },
      { t: plan[1].drop - 0.1, pose: "grip", expr: "surprised" },
      { t: plan[2].drop + plan[2].fall, pose: "headHold", expr: "worried" },
      { t: T("a6", 0.8), pose: "shrug", expr: "confused" },
    ]);
    cab.flap.schedule([{ t: 0, value: 400 }, ...plan.map((b, k) => ({ t: b.drop + b.fall * 0.7, value: LEVELS[k + 1] }))]);

    // ---------- bao tiền lãi + cần cẩu ----------
    const sacks = plan.map((b) => {
      const s = sack(b.label, b.scale);
      scene.add(s);
      return s;
    });
    const cr = crane();
    cr.group.position.set(MAST_X, 0, SHAFT_Z);
    scene.add(cr.group);

    // ---------- toà "ít nợ" (chỉ ở a6) ----------
    const low = new THREE.Group();
    low.add(tower({ color: "#CFEFE4", name: "Doanh nghiệp ít nợ", sub: "giả định", h: 22 }));
    low.add(shaft());
    const lowCab = cabin();
    lowCab.flap.mesh.visible = false;
    low.add(lowCab.group);
    const lowCable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), vinyl("#2A2F45"));
    low.add(lowCable);
    const lowSack = sack(["lãi nhỏ"], 0.45);
    low.add(lowSack);
    low.position.x = 9.5;
    scene.add(low);

    // ---------- chữ HTML: chỉ dòng thương hiệu + phụ đề ----------
    overlay.insertAdjacentHTML(
      "beforeend",
      `<style>
        .brand { position: absolute; left: 64px; top: 46px; display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 26px; color: ${C.ink}; }
        .brand b { background: ${C.ink}; color: ${C.accent}; padding: 6px 12px; border-radius: 10px; font-weight: 800; letter-spacing: .04em; }
        .brand i { font-style: normal; color: ${C.muted}; font-weight: 400; }
        .cap { position: absolute; left: 0; right: 0; bottom: 54px; display: flex; justify-content: center; }
        .cap span { display: inline-block; max-width: 1400px; background: ${C.ink}; color: #fff; font-size: 40px; font-weight: 600; line-height: 1.3; padding: 14px 30px; border-radius: 18px; }
        .fade { position: absolute; inset: 0; background: #F6F8FD; }
      </style>
      <div class="brand"><b>DSC</b> Academy <i>· Bài ${V.episode}/12 · ${V.title}</i></div>
      <div class="cap"><span></span></div>
      <div class="fade"></div>`
    );
    const cap = overlay.querySelector(".cap span"), fade = overlay.querySelector(".fade"), brand = overlay.querySelector(".brand");
    const allCaps = V.scenes.flatMap((s) => s.captions);

    // vị trí sàn cabin theo thời gian: rơi nhanh dần rồi nảy lò xo tắt dần
    function cabinY(t) {
      let y = FLOOR(400);
      plan.forEach((b, k) => {
        const y0 = FLOOR(LEVELS[k]), y1 = FLOOR(LEVELS[k + 1]);
        if (t < b.drop) return;
        const tt = t - b.drop;
        if (tt < b.fall) y = lerp(y0, y1, ease.in(tt / b.fall));
        else {
          const tau = tt - b.fall;
          y = y1 - (y0 - y1) * b.bounce * Math.exp(-5 * tau) * Math.sin(16 * tau);
        }
      });
      return y;
    }
    // rung camera sau mỗi cú chạm sàn
    function shake(t) {
      let a = 0;
      for (const b of plan) {
        const tau = t - (b.drop + b.fall);
        if (tau > 0) a += b.shake * Math.exp(-4.5 * tau);
      }
      return [wave(t, 0.09) * a, wave(t, 0.07, 0.3) * a * 0.8];
    }

    const P = new THREE.Vector3(), L = new THREE.Vector3();
    const set = (p, l) => (P.set(...p), L.set(...l));
    const mix = (pa, la, pb, lb, k) => set(pa.map((v, i) => lerp(v, pb[i], k)), la.map((v, i) => lerp(v, lb[i], k)));

    function shot(t, Y) {
      const roof = Y + cab.roofY;
      if (t < T("a2")) {
        // a1: cận bảng số lật → kéo ra xuyên kính → toàn cảnh
        const k = ep(t, T("a1", 1.4), dur("a1") - 1.6, ease.inOut);
        mix([0.25, Y + 2.4, 4.0], [0, Y + 2.42, 2.2], [6.5, Y - 1.5, 24], [0.4, Y - 0.6, 0], k);
        camera.fov = lerp(30, 34, k);
      } else if (t < T("a3")) {
        // a2: góc thấp từ phố nhìn lên, thấy cần cẩu vươn vào
        const k = ep(t, T("a2"), dur("a2"), ease.inOut);
        mix([-7.5, Y - 0.2, 14.5], [-2.2, Y + 3.2, 0.9], [-6.2, Y + 0.4, 13.2], [-1.6, Y + 3.6, 0.9], k);
        camera.fov = 50;
      } else if (t < plan[0].drop) {
        // a3 trước khi rơi: từ móc cẩu nhìn xuống nóc cabin
        const k = ep(t, T("a3"), plan[0].drop - T("a3"));
        mix([3.4, roof + 5.2, 8.2], [0, roof - 1.5, SHAFT_Z], [3.0, roof + 4.4, 7.6], [0, roof - 1.6, SHAFT_Z], k);
        camera.fov = 40;
      } else if (t < T("a4")) {
        // a3 khi rơi: cắt sang bám ngang theo cabin
        set([6.8, Y + 2.0, 10.5], [0, Y + 1.3, SHAFT_Z]);
        camera.fov = 36;
      } else if (t < T("a5")) {
        // a4: trung cảnh chính diện, thấy An và bảng số
        const k = ep(t, T("a4"), dur("a4"));
        mix([0.6, Y + 2.6, 11.2], [0, Y + 2.1, SHAFT_Z], [0.3, Y + 2.5, 10.4], [0, Y + 2.1, SHAFT_Z], k);
        camera.fov = 36;
      } else if (t < T("a6")) {
        // a5: góc thấp trong giếng thang nhìn lên, cabin lao xuống về phía camera
        const k = ep(t, T("a5"), dur("a5"));
        mix([3.2, 1.6, 9.5], [0, Y + 1.2, SHAFT_Z], [2.6, 1.8, 8.6], [0, Y + 1.6, SHAFT_Z], k);
        camera.fov = 40;
      } else {
        // a6: trung cảnh nóc toà ít nợ (thấy biển "giả định", bao lãi nhỏ, thang chỉ nhún nhẹ) → lùi rộng so sánh hai toà
        const k = ep(t, T("a6", 3.4), dur("a6") - 3.6, ease.inOut);
        const lx = 9.5;
        mix([lx + 2.4, 19.2, 16.5], [lx, 18.8, SHAFT_Z], [4.7, 13.8, 35], [4.7, 13.2, 0], k);
        camera.fov = lerp(40, 40, k);
      }
      const [sx, sy] = shake(t);
      camera.position.set(P.x + sx, P.y + sy, P.z);
      camera.lookAt(L);
      camera.updateProjectionMatrix();
    }

    const v3 = new THREE.Vector3(), box = new THREE.Box3();
    // kiểm tra vật thể quan trọng có lấn vào vùng chữ không (inspect3d gọi hàm này)
    const keepClear = { "cabin": cab.group, "bao 1": sacks[0], "bao 2": sacks[1], "bao 3": sacks[2] };
    window.__overlap = () => {
      const rects = [brand.getBoundingClientRect()];
      if (cap.textContent) rects.push(cap.getBoundingClientRect());
      const out = [];
      for (const [name, o] of Object.entries(keepClear)) {
        if (!o.visible) continue;
        box.setFromObject(o);
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          v3.set(x, y, z).project(camera);
          if (v3.z > 1) continue;
          const sx = ((v3.x + 1) / 2) * width, sy = ((1 - v3.y) / 2) * height;
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
        const area = Math.max(1, (x1 - x0) * (y1 - y0));
        for (const r of rects) {
          const ix = Math.max(0, Math.min(x1, r.right) - Math.max(x0, r.left)), iy = Math.max(0, Math.min(y1, r.bottom) - Math.max(y0, r.top));
          if ((ix * iy) / area > 0.04) out.push(name);
        }
      }
      return out;
    };

    const update = (t) => {
      const Y = cabinY(t);
      const profit = cab.flap.value(t);
      // ánh sáng nguội dần khi lợi nhuận giảm
      const mood = clamp((400 - profit) / 240);
      studio.key.color.copy(KEY_WARM).lerp(KEY_COOL, mood);
      studio.key.intensity = lerp(2.5, 1.9, mood);
      scene.background.copy(BG_WARM).lerp(BG_COOL, mood);

      // cabin + cáp
      cab.group.position.set(0, Y, SHAFT_Z);
      const cableTop = 21.75, cableBot = Y + cab.roofY;
      cableMesh.scale.y = cableTop - cableBot;
      cableMesh.position.set(0, (cableTop + cableBot) / 2, SHAFT_Z);
      cab.flap.update(t);
      an.update(t);
      // An hơi bồng lên lúc thang rơi
      const floatUp = plan.reduce((s, b) => s + Math.sin(clamp((t - b.drop) / b.fall) * Math.PI) * 0.12, 0);
      an.root.position.y = 0.2 + floatUp;

      // cần cẩu: vươn vào ở a2, xe con chạy tới trên giếng thang
      cr.pivot.rotation.y = lerp(-1.25, 0, ep(t, T("a2", 0.2), 1.6, ease.inOut));
      const tx = lerp(2.2, -MAST_X, ep(t, T("a2", 1.6), 1.6));
      cr.trolley.position.x = tx;
      const trolleyWorld = cr.trolley.getWorldPosition(v3).clone();
      // móc: mỗi bao có một chặng hạ xuống nóc rồi nhả, móc kéo lên
      let hookY = JIB_Y - 3.5;
      let carrying = -1;
      plan.forEach((b, k) => {
        const start = k === 0 ? T("a2", 3.0) : b.land - 0.95;
        const roofAt = Y + cab.roofY;
        if (t >= start && t < b.land) {
          carrying = k;
          hookY = lerp(k === 0 ? JIB_Y - 3.5 : JIB_Y - 2, roofAt + 1.45 * b.scale + 0.15, ease.inOut(prog(t, start, b.land - start)));
        } else if (t >= b.land && t < b.land + 0.9) hookY = lerp(roofAt + 1.6, JIB_Y - 2, ease.in(prog(t, b.land + 0.15, 0.75)));
      });
      if (t < T("a2", 3.0)) carrying = 0;
      cr.hook.position.set(trolleyWorld.x, hookY, trolleyWorld.z);
      cr.cable.scale.y = Math.max(0.01, trolleyWorld.y - 0.2 - (hookY + 0.45));
      cr.cable.position.set(trolleyWorld.x, (trolleyWorld.y - 0.2 + hookY + 0.45) / 2, trolleyWorld.z);
      const hookVisible = t >= T("a2", 0.2) && t < T("a6");
      cr.hook.visible = cr.cable.visible = hookVisible;

      sacks.forEach((s, k) => {
        const b = plan[k];
        if (t >= b.land) {
          // nằm trên nóc, đi theo cabin; nảy nhẹ lúc đặt xuống
          const squash = 1 - Math.sin(clamp((t - b.land) / 0.25) * Math.PI) * 0.12;
          s.position.set(b.off[0], Y + cab.roofY, SHAFT_Z + b.off[1]);
          s.scale.set(b.scale * (2 - squash), b.scale * squash, b.scale * (2 - squash));
          s.visible = true;
        } else if (carrying === k) {
          s.position.set(cr.hook.position.x + b.off[0] * clamp((t - (b.land - 0.5)) / 0.5), hookY - 1.45 * b.scale, cr.hook.position.z + b.off[1] * clamp((t - (b.land - 0.5)) / 0.5));
          s.scale.setScalar(b.scale);
          s.visible = hookVisible;
        } else s.visible = false;
      });
      third.visible = t >= plan[2].drop + plan[2].fall;
      third.scale.setScalar(third.visible ? ease.back(clamp((t - plan[2].drop - plan[2].fall) / 0.4)) : 0.001);

      // toà ít nợ mọc lên ở a6; bao nhỏ rơi xuống, cabin chỉ nhún nhẹ
      const rise = ep(t, T("a6", 0.1), 0.9, ease.back);
      low.visible = t >= T("a6");
      low.scale.set(1, Math.max(0.001, rise), 1);
      const lLand = T("a6", 1.7);
      const lowY = FLOOR(400) - (t > lLand ? 0.35 * (1 - Math.exp(-5 * (t - lLand))) + 0.06 * Math.exp(-4 * (t - lLand)) * Math.sin(14 * (t - lLand)) : 0);
      lowCab.group.position.set(0, lowY, SHAFT_Z);
      lowCable.scale.y = 21.75 - (lowY + lowCab.roofY);
      lowCable.position.set(0, (21.75 + lowY + lowCab.roofY) / 2, SHAFT_Z);
      lowSack.visible = t > lLand - 0.6;
      lowSack.position.set(0.5, t < lLand ? lerp(26, lowY + lowCab.roofY, ease.in(prog(t, lLand - 0.6, 0.6))) : lowY + lowCab.roofY, SHAFT_Z - 0.3);

      shot(t, Y);

      const c = allCaps.find((x) => t >= x.start && t < x.end);
      cap.textContent = c ? c.text : "";
      cap.parentElement.style.opacity = c ? 1 : 0;
      fade.style.opacity = Math.max(1 - ep(t, 0, 0.35), ep(t, D - 0.3, 0.3));
    };
    return { update, render: studio.render };
  },
});
