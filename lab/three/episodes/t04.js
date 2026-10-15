// Tập 4 — Lãi suất và NHNN (bản 3D). Storyboard: content3d/t04-lai-suat-va-chinh-sach-tien-te.json
// Một thế giới liền mạch: Đài điều khiển → Bể chứa NHNN → Hành lang → Đường ống → Ba kênh → Thành phố; sân khấu quiz riêng.
// Mọi hoạt cảnh tính theo thời gian của cảnh: T("s05", 3) = giây thứ 3 của cảnh s05 trên dòng thời gian chính.
import * as THREE from "three";
import { boot } from "../runtime.js";
import { createAn } from "../an.js";
import { createControl } from "../sets/control.js";
import { createCity } from "../sets/city.js";
import { createOverlay } from "../overlay.js";
import { cameraPath } from "../camera.js";
import { mat, M, C } from "../materials.js";
import { sign, faceCamera, pop, arrow, coin, pipe, flow, gauge, column, confetti, piggy, factory, rbox, at, shadow } from "../props.js";
import { ep, prog, ease, lerp, clamp, wave, rng } from "../core.js";

const V = window.VIDEO;
const S = Object.fromEntries(V.scenes.map((s) => [s.id, s]));
const T = (id, a = 0) => S[id].start + a;
const inS = (t, id) => t >= S[id].start && t < S[id].end;

// Gốc toạ độ của từng bối cảnh
const O = {
  control: [-80, 0, 0],
  valve: [-40, 0, 0],
  corridor: [-40, 0, -55],
  pipes: [0, 0, 0],
  channels: [45, 0, 0],
  city: [100, 0, 0],
  board: [-80, 0, 45],
  book: [-125, 0, 0],
};
const W = (set, x = 0, y = 0, z = 0) => [O[set][0] + x, O[set][1] + y, O[set][2] + z];
const place = (o, set, x = 0, y = 0, z = 0) => (o.position.set(...W(set, x, y, z)), o);

boot({
  duration: V.duration,
  audio: V.audio,
  async setup({ scene, camera, sun, overlay }) {
    const updates = [];
    const on = (fn) => updates.push(fn);

    // ---------- Nền chung ----------
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), M.ground());
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    // cây và mây trang trí (seed cố định, tránh khu vực bối cảnh)
    {
      const r = rng(42);
      const trunk = mat("#8A6A4F"), leaf = mat("#8FD6B5"), leaf2 = mat("#6CC4A0");
      const keep = Object.values(O);
      for (let i = 0; i < 160; i++) {
        const x = -150 + r() * 310, z = -80 + r() * 150;
        if (keep.some(([ox, , oz]) => Math.hypot(x - ox, z - oz) < (ox === 100 ? 30 : 19))) continue;
        const g = new THREE.Group();
        const s = 0.7 + r() * 0.8;
        g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 5), trunk), 0, 0.4, 0));
        g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 6), r() > 0.5 ? leaf : leaf2), 0, 1.5, 0));
        g.scale.setScalar(s);
        g.position.set(x, 0, z);
        scene.add(shadow(g));
      }
      for (let i = 0; i < 26; i++) {
        const c = new THREE.Group();
        const n = 3 + Math.floor(r() * 3);
        for (let j = 0; j < n; j++) c.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(1 + r() * 1.2, 0), M.white()), j * 1.4, r() * 0.6, r()));
        c.position.set(-140 + r() * 300, 16 + r() * 8, -60 + r() * 50);
        const sp = 0.2 + r() * 0.3;
        scene.add(c);
        const x0 = c.position.x;
        on((t) => (c.position.x = x0 + t * sp));
      }
    }

    // ---------- An ----------
    const an = createAn();
    scene.add(an.root);
    const rigErr = an.validateRig();
    console.log("[3d] rig An:", rigErr.join(", ") || "OK");
    if (rigErr.length) throw new Error("Rig An lỗi: " + rigErr.join(", "));

    // Vị trí đứng của An trong từng cảnh [bối cảnh, x, z]. Cùng bối cảnh mà đổi chỗ → An đi bộ tới; khác bối cảnh → cắt cảnh.
    const MARK = {
      s01: ["city", -3.4, 4.6], s02: ["control", 2.8, 2.6], s03: ["valve", 3.2, 10.8], s04: ["valve", 3.8, 4.2],
      s05: ["corridor", -8, 3.4], s06: ["pipes", 2.2, 4.2], s07: ["pipes", -9.2, 4.6], s08: ["pipes", 12.2, 5.6],
      s09: ["control", 2.8, 2.6], s10: ["channels", -11.4, 4], s11: ["channels", -11.4, 4], s12: ["channels", -0.4, 3.6],
      s13: ["channels", 18.6, 3.6], s14: ["city", -3.8, 5.6], s15: ["city", -4.6, 8.4], s16: ["city", -4.6, 8.4],
      s17: ["city", -3.4, 4.6], s18: ["city", 4.6, 3.6], s19: ["board", 7.4, 2.6], s20: ["control", 2.8, 2.6],
      s21: ["book", 5.8, 2.4], s22: ["control", 2.8, 2.6], s23: ["city", -2.2, 5.2],
    };
    const anKeys = [];
    const anPath = [];
    V.scenes.forEach((s, i) => {
      const [set, x, z] = MARK[s.id];
      const p = W(set, x, 0, z);
      const prev = i > 0 ? MARK[V.scenes[i - 1].id] : null;
      const walk = prev && prev[0] === set && (prev[1] !== x || prev[2] !== z);
      const wd = walk ? Math.min(1.8, Math.hypot(prev[1] - x, prev[2] - z) / 3.2 + 0.4) : 0;
      anPath.push({ t: s.start, p, walk: wd });
      if (walk) anKeys.push({ t: s.start, pose: "idle", walk: [0, 0, wd] });
      anKeys.push({ t: s.start + wd, pose: s.pose, expr: s.expr, emote: s.emote });
    });
    an.track(anKeys);
    const anPos = new THREE.Vector3();
    function updateAn(t) {
      let i = 0;
      while (i + 1 < anPath.length && anPath[i + 1].t <= t) i++;
      const cur = anPath[i], prev = anPath[i - 1];
      let walking = false;
      if (prev && cur.walk && t < cur.t + cur.walk) {
        const k = ease.inOut(prog(t, cur.t, cur.walk));
        anPos.set(lerp(prev.p[0], cur.p[0], k), 0, lerp(prev.p[2], cur.p[2], k));
        walking = true;
      } else anPos.set(...cur.p);
      an.root.position.copy(anPos);
      // quay mặt về camera (khi đi thì nhìn theo hướng đi)
      let ry = Math.atan2(camera.position.x - anPos.x, camera.position.z - anPos.z);
      if (walking) ry = Math.atan2(cur.p[0] - prev.p[0], cur.p[2] - prev.p[2]);
      an.root.rotation.y = ry;
      an.update(t);
    }

    // ---------- Đài điều khiển ----------
    const ctl = createControl();
    place(ctl.group, "control");
    scene.add(ctl.group);
    const screens = ["Quyết định trên web NHNN", "Lãi suất liên ngân hàng qua đêm", "Khối lượng OMO hằng ngày"].map((txt, i) => {
      const g = new THREE.Group();
      g.add(rbox(4.2, 2.6, 0.2, M.ink()));
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 2.3), new THREE.MeshBasicMaterial({ color: "#152257" }));
      scr.position.z = 0.11;
      g.add(scr);
      const label = sign(txt.length > 18 ? txt.replace(/^(.{0,18}\S*)\s/, "$1\n").split("\n") : txt, { width: 3.4, size: 70, bg: null, border: null, fg: "#FFFFFF", billboard: false });
      label.position.set(0, 0.25, 0.13);
      const tick = sign("✓", { width: 0.7, size: 120, bg: C.accent, border: null, radius: 80, billboard: false });
      tick.position.set(0, -0.75, 0.15);
      g.add(label, tick);
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 6), M.ink()), 0, -3.4, -0.1));
      place(g, "control", (i - 1) * 4.7, 5.6, -3.6);
      scene.add(shadow(g));
      return { g, scr, label, tick };
    });
    const conf = confetti(90, 11);
    place(conf.group, "control", 0, 2.6, 0.6);
    scene.add(conf.group);
    // ống dẫn gợi ý Bài 5 phía sau đài điều khiển
    const teaser = new THREE.Group();
    const teaserFlows = [];
    for (let i = 0; i < 3; i++) {
      const pp = pipe([[-3 + i * 3, 0.6, -2], [-6 + i * 6, 0.6, -10], [-10 + i * 10, 0.6, -22]], { r: 0.28 });
      const f = flow(pp.curve, { n: 30, size: 0.16 });
      teaser.add(pp.mesh, f.mesh);
      teaserFlows.push(f);
    }
    for (let i = 0; i < 14; i++) {
      const hgt = 1 + ((i * 37) % 5) * 0.5;
      teaser.add(at(rbox(1.4, hgt, 1.4, mat(i % 3 ? C.paper : C.accentSoft)), -12 + (i % 7) * 4, hgt / 2, -24 - Math.floor(i / 7) * 3));
    }
    const teaserSign = sign("Cung tiền và tín dụng", { width: 6, size: 90, bg: C.ink, fg: "#FFFFFF", border: null });
    teaserSign.position.set(0, 5.5, -22);
    teaser.add(teaserSign);
    place(teaser, "control");
    scene.add(shadow(teaser));

    on((t) => {
      for (const n of ["GDP", "CPI", "Lạm phát lõi"]) ctl.lit(n, 1);
      ctl.lit("Lãi suất", ep(t, T("s20", 0.4), 0.4));
      const blink = 0.5 + 0.5 * Math.sin(t * 7);
      let g = 0;
      if (inS(t, "s02") && t > T("s02", 1)) g = blink;
      else if (inS(t, "s20")) g = 1 - ep(t, T("s20", 1.5), 2) * 0.6;
      else if (inS(t, "s22")) g = blink;
      ctl.glow("money", g);
      ctl.glow("growth", inS(t, "s02") || inS(t, "s22") ? 0.25 : 0);
      ctl.glow("prices", inS(t, "s02") || inS(t, "s22") ? 0.25 : 0);
      const scrOn = t >= T("s09") - 0.3 && t < T("s09", 99) && t < S.s10.start;
      screens.forEach((s, i) => {
        pop(s.g, scrOn ? ep(t, T("s09") - 0.3, 0.5, ease.linear) : 0);
        const k = ep(t, T("s09", 0.4 + i * 1.4), 0.5);
        s.scr.material.color.set(k > 0.5 ? "#1D3A8A" : "#152257");
        s.label.visible = k > 0.02 || t > T("s09");
        s.label.material.opacity = Math.max(0.25, k);
        pop(s.tick, ep(t, T("s09", 1 + i * 1.4), 0.4, ease.linear));
      });
      conf.update(t - T("s20", 0.4));
      teaser.visible = inS(t, "s22");
      teaserFlows.forEach((f) => f.update(t, { speed: 0.18 }));
    });

    // ---------- Bể chứa NHNN + van (s03–s04) ----------
    const tank = new THREE.Group();
    tank.add(at(new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 5.6, 16), M.paper()), 0, 2.8, 0));
    for (const y of [0.6, 2.8, 5.0]) tank.add(at(new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.22, 16), M.ink()), 0, y, 0));
    tank.add(at(new THREE.Mesh(new THREE.SphereGeometry(2.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.accentDark)), 0, 5.6, 0));
    const tankSign = sign("Ngân hàng Nhà nước", { width: 5.4, size: 96, bg: C.ink, fg: "#FFFFFF", border: null });
    tankSign.position.set(0, 9.2, 0);
    tank.add(tankSign);
    place(tank, "valve", 0, 0, -1.2);
    scene.add(shadow(tank));
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 24), mat(C.accentDark)));
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.12), M.ink());
      sp.rotation.z = (i * Math.PI) / 3;
      wheel.add(sp);
    }
    wheel.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 10), M.warn()).rotateX(Math.PI / 2), 0, 0, 0));
    place(wheel, "valve", 0, 2.6, 1.95);
    scene.add(shadow(wheel));
    const wheelGlowMat = new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0, transparent: true, opacity: 0 });
    const wheelGlow = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 6, 30), wheelGlowMat);
    place(wheelGlow, "valve", 0, 2.6, 1.95);
    scene.add(wheelGlow);
    const wheelSign = sign("Lãi suất điều hành", { width: 3.2, size: 80, billboard: false });
    place(wheelSign, "valve", 0, 0.75, 2.4);
    scene.add(wheelSign);
    const baseRate = sign("Lãi suất gốc của hệ thống", { width: 4.4, size: 80, bg: C.accent, border: C.ink });
    place(baseRate, "valve", 0, 7.0, 2.6);
    scene.add(baseRate);
    const gRefi = gauge("Tái cấp vốn", { size: 1.1 });
    const gDisc = gauge("Tái chiết khấu", { size: 1.1 });
    for (const [gg, x] of [[gRefi, -4.6], [gDisc, 4.6]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), M.ink());
      post.position.y = -1.3;
      gg.group.add(post);
      place(gg.group, "valve", x, 2.7, 0.8);
      scene.add(gg.group);
    }
    // s03: túi tiền + thẻ giá, nhà máy (vay) và heo đất (tiết kiệm)
    const s03 = new THREE.Group();
    const bag = new THREE.Group();
    const bagBody = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), mat("#C9A66B"));
    bagBody.scale.set(1, 0.95, 0.9);
    bag.add(at(bagBody, 0, 1.25, 0));
    bag.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.5, 8), mat("#B48F55")), 0, 2.45, 0));
    bag.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 5, 12), M.down()).rotateX(Math.PI / 2), 0, 2.35, 0));
    const dong = sign("₫", { width: 0.9, size: 140, bg: null, border: null, billboard: false });
    bag.add(at(dong, 0, 1.25, 1.06));
    const tag = new THREE.Group();
    tag.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 4), M.ink()), 0, -0.55, 0));
    const tagPlate = sign(["Giá của tiền", "%"], { width: 1.9, size: 80, bg: C.warn });
    tag.add(at(tagPlate, 0, -1.4, 0));
    tag.position.set(-1.2, 2.6, 0.5);
    bag.add(tag);
    s03.add(bag);
    const fac = factory();
    fac.position.set(-6, 0, 0);
    const pig = piggy("#FFC9D6", 1.5);
    pig.position.set(6, 1.1, 0);
    pig.rotation.y = -0.6;
    const facSign = sign("Chi phí vay", { width: 2.4, size: 80, bg: C.paper });
    facSign.position.set(-6, 3.6, 0);
    const pigSign = sign("Tiết kiệm", { width: 2.2, size: 80, bg: C.paper });
    pigSign.position.set(6, 3.2, 0);
    s03.add(fac, pig, facSign, pigSign);
    const coinsA = Array.from({ length: 6 }, () => coin()), coinsB = Array.from({ length: 6 }, () => coin());
    s03.add(...coinsA, ...coinsB);
    place(s03, "valve", 0, 0, 9);
    scene.add(shadow(s03));
    const arc = (c, a, b, u, h = 2.2) => c.position.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * h, lerp(a[2], b[2], u));
    on((t) => {
      // thẻ giá đung đưa, nảy vào đầu cảnh
      pop(tag, ep(t, T("s03", 0.6), 0.6, ease.linear));
      const away = ep(t, T("s04") - 0.3, 0.6, ease.in);
      s03.visible = away < 1 && t < T("s05");
      s03.scale.setScalar(Math.max(0.001, 1 - away));
      s03.position.set(...W("valve", 0, away * 2.5, 9 - away * 9));
      tag.rotation.z = wave(t, 2.4) * 0.12;
      const flowOn = t > T("s03", 3) && t < T("s04") - 0.3;
      coinsA.forEach((c, i) => {
        const u = (((t * 0.55 + i / 6) % 1) + 1) % 1;
        c.visible = flowOn;
        arc(c, [-5, 1.6, 0], [-0.6, 1.8, 0], u);
        c.rotation.x = t * 4;
      });
      coinsB.forEach((c, i) => {
        const u = (((t * 0.55 + i / 6 + 0.08) % 1) + 1) % 1;
        c.visible = flowOn;
        arc(c, [0.6, 1.8, 0], [5.4, 1.7, 0], u);
        c.rotation.x = t * 4;
      });
      pop(facSign, ep(t, T("s03", 3), 0.5, ease.linear));
      pop(pigSign, ep(t, T("s03", 3.4), 0.5, ease.linear));
      // s04: vô lăng sáng lên, hai đồng hồ hiện ra; s06: vô lăng xoay
      const glow = inS(t, "s04") ? ep(t, T("s04", 0.3), 0.6) : inS(t, "s06") ? 1 - ep(t, T("s06", 2.5), 0.6) : 0;
      wheelGlowMat.opacity = glow * 0.9;
      wheelGlowMat.emissiveIntensity = glow * (0.8 + 0.4 * Math.sin(t * 6));
      wheel.rotation.z = -ep(t, T("s06", 0.2), 1.8) * Math.PI * 1.2;
      pop(gRefi.group, ep(t, T("s04", 3), 0.5, ease.linear));
      pop(gDisc.group, ep(t, T("s04", 3.4), 0.5, ease.linear));
      gRefi.set(0.62 + wave(t, 5) * 0.02);
      gDisc.set(0.38 + wave(t, 6) * 0.02);
      pop(baseRate, inS(t, "s04") ? ep(t, T("s04", 5.6), 0.5, ease.linear) : 0);
    });

    // ---------- Hành lang lãi suất (s05) ----------
    const RAIL_L = 18;
    const yOf = (v) => 1.2 + ((v - 3) / 2) * 3;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(RAIL_L, 0.2, 0.2), M.glow(C.down));
    const floorR = new THREE.Mesh(new THREE.BoxGeometry(RAIL_L, 0.2, 0.2), M.glow(C.accentDark));
    place(ceil, "corridor", 0, yOf(5), 0);
    place(floorR, "corridor", 0, yOf(3), 0);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(RAIL_L, 3), mat(C.accent, { transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    place(band, "corridor", 0, 2.7, -0.05);
    scene.add(ceil, floorR, band);
    for (const x of [-9, 9]) for (const y of [yOf(3), yOf(5)]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, y, 6), M.ink());
      place(post, "corridor", x, y / 2, 0);
      scene.add(post);
    }
    const ceilSign = sign("Trần: lãi suất tái cấp vốn", { width: 4.6, size: 72 });
    place(ceilSign, "corridor", -2.5, yOf(5) + 0.75, 0);
    const floorSign = sign("Sàn: lãi suất tái chiết khấu", { width: 4.8, size: 72 });
    place(floorSign, "corridor", -2.5, yOf(3) - 0.75, 0);
    scene.add(ceilSign, floorSign);
    const pts = [3.8, 4.3, 3.6, 4.1, 4.6, 3.9, 3.4, 4, 4.4];
    const ballCurve = new THREE.CatmullRomCurve3(pts.map((v, i) => new THREE.Vector3(...W("corridor", -8 + (16 * i) / (pts.length - 1), yOf(v), 0.4))));
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), mat("#3D7BFF", { emissive: "#3D7BFF", emissiveIntensity: 0.3 }));
    ball.castShadow = true;
    const ballSign = sign("Liên ngân hàng", { width: 2.6, size: 72, bg: "#3D7BFF", fg: "#FFFFFF", border: null });
    scene.add(ball, ballSign);
    const TRAIL = 160;
    const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), mat("#3D7BFF"), TRAIL);
    scene.add(trail);
    const liq = sign("Chỉ báo thanh khoản hằng ngày", { width: 5.4, size: 80, bg: C.accent, border: C.ink });
    place(liq, "corridor", 3, 6.4, 0);
    scene.add(liq);
    const ballU = (t) => ep(t, T("s05", 1.5), 6.5, ease.linear);
    on((t) => {
      const u = ballU(t);
      const p = ballCurve.getPointAt(u);
      ball.position.copy(p);
      ball.rotation.z = -u * 30;
      ballSign.position.set(p.x, p.y + 0.85, p.z);
      const d = new THREE.Object3D();
      const n = Math.floor(u * TRAIL);
      for (let i = 0; i < n; i++) {
        d.position.copy(ballCurve.getPointAt(i / TRAIL));
        d.updateMatrix();
        trail.setMatrixAt(i, d.matrix);
      }
      trail.count = n;
      trail.instanceMatrix.needsUpdate = true;
      pop(liq, inS(t, "s05") ? ep(t, T("s05", 7.6), 0.5, ease.linear) : 0);
    });

    // ---------- Đường ống, ngân hàng, OMO, dự trữ bắt buộc (s06–s08) ----------
    const main = pipe([W("valve", 2.6, 1.2, -0.6), W("valve", 9, 1.2, -0.6), W("valve", 22, 1.2, 1.5), W("pipes", -12, 1.2, 1.8), W("pipes", -6, 1.2, 1.8), W("pipes", 3.8, 1.2, 0.6)], { r: 0.36 });
    scene.add(main.mesh);
    const blue = flow(main.curve, { n: 90, size: 0.18 });
    const wave2 = flow(main.curve, { n: 90, size: 0.2, color: "#FF9F43" });
    scene.add(blue.mesh, wave2.mesh);
    const frontU = (t) => ep(t, T("s06", 1.4), 3.2, ease.linear);
    const bank = new THREE.Group();
    bank.add(at(new THREE.Mesh(new THREE.CylinderGeometry(2, 2.1, 3.6, 14), mat("#CFE3FF")), 0, 1.8, 0));
    bank.add(at(new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.2, 14), M.ink()), 0, 3.6, 0));
    const bankSign = sign("Ngân hàng thương mại", { width: 4.2, size: 84, bg: C.ink, fg: "#FFFFFF", border: null });
    bankSign.position.set(0, 4.6, 0);
    bank.add(bankSign);
    place(bank, "pipes", 6, 0, -0.4);
    scene.add(shadow(bank));
    const gLoan = gauge("Lãi suất cho vay", { size: 0.85 });
    const gDep = gauge("Lãi suất huy động", { size: 0.85 });
    for (const [gg, x] of [[gLoan, 4.4], [gDep, 7.8]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), M.ink());
      post.position.y = -0.8;
      gg.group.add(post);
      place(gg.group, "pipes", x, 1.75, 2.9);
      scene.add(gg.group);
    }
    // đồng hồ cát "Độ trễ"
    const glass = new THREE.Group();
    const gm = mat("#BFE6FF", { transparent: true, opacity: 0.45 });
    glass.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 10), gm).rotateX(Math.PI), 0, 1.25, 0));
    glass.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 10), gm), 0, 0.45, 0));
    const sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.5, 10), M.warn());
    sandTop.rotation.x = Math.PI;
    sandTop.position.y = 1.2;
    const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 10), M.warn());
    sandBot.position.y = 0.3;
    glass.add(sandTop, sandBot);
    for (const y of [0, 1.7]) glass.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 10), mat("#8A6A4F")), 0, y, 0));
    const lagSign = sign("Độ trễ", { width: 1.5, size: 80 });
    lagSign.position.y = 2.5;
    glass.add(lagSign);
    place(glass, "pipes", 10.6, 0, 2.6);
    scene.add(shadow(glass));
    // trạm bơm OMO
    const pump = new THREE.Group();
    pump.add(at(rbox(2.4, 2, 2, mat(C.accentSoft)), 0, 1, 0));
    pump.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12), M.muted()), 0, 2.5, 0));
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 8), M.ink());
    piston.position.y = 3.2;
    pump.add(piston);
    const pumpSign = sign("OMO", { width: 1.5, size: 100, bg: C.ink, fg: C.accent, border: null });
    pumpSign.position.set(0, 4.9, 0);
    pump.add(pumpSign);
    place(pump, "pipes", -6, 0, 5.2);
    scene.add(shadow(pump));
    const stub = pipe([W("pipes", -6, 1.2, 4.2), W("pipes", -6, 1.2, 1.8)], { r: 0.26 });
    scene.add(stub.mesh);
    const stubFlow = flow(stub.curve, { n: 8, size: 0.15 });
    scene.add(stubFlow.mesh);
    const inArrow = arrow(C.accentDark, 1.2), outArrow = arrow(C.down, 1.2);
    inArrow.rotation.z = Math.PI; // chỉ xuống ống: bơm vào
    place(inArrow, "pipes", -3.9, 3.6, 3);
    place(outArrow, "pipes", -3.9, 1.6, 3); // chỉ lên: hút về
    const inSign = sign("Bơm tiền vào", { width: 2.6, size: 76, bg: C.accent });
    const outSign = sign("Hút tiền về", { width: 2.4, size: 76, bg: "#FFD1D3" });
    place(inSign, "pipes", -1.4, 3.2, 3);
    place(outSign, "pipes", -1.4, 3.2, 3);
    scene.add(inArrow, outArrow, inSign, outSign);
    // bể ngân hàng cắt ngang (s08)
    const cut = new THREE.Group();
    const glassM = mat("#E6EEFA", { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    cut.add(at(new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.6, 0.12), M.paper()), 0, 1.8, -1.1));
    cut.add(at(new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 2.3), M.ink()), 0, 0.06, 0));
    for (const x of [-2.7, 2.7]) cut.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, 2.3), M.ink()), x, 1.8, 0));
    cut.add(at(new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.6), glassM), 0, 1.8, 1.14));
    const resW = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 2.1), mat("#2E4A9E", { transparent: true, opacity: 0.85 }));
    const lendW = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 2.1), M.water());
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 2.2), M.warn());
    cut.add(resW, lendW, wall);
    const resSign = sign("Dự trữ bắt buộc", { width: 2.6, size: 72, bg: "#2E4A9E", fg: "#FFFFFF", border: null });
    const lendSign = sign("Có thể cho vay", { width: 2.5, size: 72, bg: C.accent });
    cut.add(resSign, lendSign);
    // vòi tiền gửi + nắp "Trần lãi suất huy động"
    cut.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 8), M.muted()).rotateZ(Math.PI / 2), 3.35, 2.6, 0.4));
    const cap = rbox(0.5, 0.55, 0.55, M.down());
    cut.add(cap);
    const depSign = sign("Tiền gửi ngắn hạn", { width: 2.6, size: 66 });
    depSign.position.set(4.4, 3.5, 0.4);
    const capSign = sign("Trần lãi suất huy động", { width: 3.6, size: 72, bg: "#FFD1D3" });
    capSign.position.set(4.6, 1.3, 0.6);
    cut.add(depSign, capSign);
    place(cut, "pipes", 16, 0, 0);
    scene.add(shadow(cut));
    on((t) => {
      // dòng xanh chạy trước s06; sóng cam (lãi suất mới) lan dần từ van tới ngân hàng
      const fu = frontU(t);
      blue.mesh.visible = t < T("s06", 1.4);
      blue.update(t, { speed: 0.05 });
      wave2.mesh.visible = t >= T("s06", 1.4);
      wave2.update(t, { speed: 0.05, front: fu });
      const lagK = ep(t, T("s06", 4.6), 2.2);
      gLoan.set(0.35 + 0.25 * lagK);
      gDep.set(0.3 + 0.2 * ep(t, T("s06", 5.2), 2.2));
      const sand = clamp((t - T("s06", 3.5)) / 3);
      sandTop.scale.setScalar(Math.max(0.05, 1 - sand * 0.8));
      sandBot.scale.setScalar(0.3 + sand * 0.7);
      // OMO: bơm vào (0–4s), hút về (4–8s) của cảnh s07
      const lt = t - T("s07");
      const pumping = inS(t, "s07") ? (lt < 4 ? 1 : -1) : 0;
      piston.position.y = 3.2 + (pumping ? Math.sin(t * 8) * 0.4 : 0);
      stubFlow.mesh.visible = pumping !== 0;
      stubFlow.update(t, { speed: 0.6, dir: pumping >= 0 ? 1 : -1 });
      pop(inArrow, pumping === 1 ? ep(t, T("s07", 0.4), 0.4, ease.linear) : 0);
      pop(inSign, pumping === 1 ? ep(t, T("s07", 0.6), 0.4, ease.linear) : 0);
      pop(outArrow, pumping === -1 ? ep(t, T("s07", 4.1), 0.4, ease.linear) : 0);
      pop(outSign, pumping === -1 ? ep(t, T("s07", 4.3), 0.4, ease.linear) : 0);
      inArrow.position.y = 3.8 - ((t * 1.2) % 1) * 0.6;
      outArrow.position.y = 1.4 + ((t * 1.2) % 1) * 0.6;
      // dự trữ bắt buộc: vách ngăn dịch sang phải
      const R = lerp(1.4, 2.8, ep(t, T("s08", 3), 2.2));
      const x0 = -2.6, x1 = 2.6;
      resW.scale.x = R;
      resW.position.set(x0 + R / 2, 1.42, 0);
      lendW.scale.x = x1 - x0 - R;
      lendW.position.set(x0 + R + (x1 - x0 - R) / 2, 1.42, 0);
      wall.position.set(x0 + R, 1.7, 0);
      resSign.position.set(x0 + R / 2, 4.15, 0.3);
      lendSign.position.set(x0 + R + (x1 - x0 - R) / 2, 3.2 + 0.0, 0.3);
      const ck = ep(t, T("s08", 6.6), 0.7, ease.back);
      cap.position.set(lerp(4.6, 4.05, ck), lerp(4.4, 2.6, ck), 0.4);
      cap.visible = t > T("s08", 6.4);
      pop(capSign, ep(t, T("s08", 7), 0.4, ease.linear));
      pop(depSign, ep(t, T("s08", 5.8), 0.4, ease.linear));
    });

    // ---------- Ba kênh truyền dẫn (s10–s13) ----------
    const STN = { cost: -8, val: 4, flow: 25 };
    const junction = W("channels", 4, 1.2, -13);
    const chPipes = Object.entries(STN).map(([k, x], i) => {
      const pp = pipe([junction, W("channels", (4 + x) / 2, 1.2, -9), W("channels", x, 1.2, -3.2)], { r: 0.34 });
      const f = flow(pp.curve, { n: 26, size: 0.17, color: "#FF9F43" });
      scene.add(pp.mesh, f.mesh);
      const lbl = sign(`${i + 1}  ${["Chi phí vốn", "Định giá", "Dòng tiền"][i]}`, { width: 4, size: 96, bg: C.ink, fg: "#FFFFFF", border: null });
      lbl.position.copy(pp.curve.getPointAt(0.55)).add(new THREE.Vector3(0, 2.2, 0));
      scene.add(lbl);
      return { f, lbl };
    });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 12), M.muted());
    hub.position.set(...junction);
    scene.add(shadow(hub));
    // kênh 1: cỗ máy lợi nhuận
    const mach = new THREE.Group();
    mach.add(at(rbox(3, 2.2, 2.2, mat("#D3DBEE")), 0, 1.1, 0));
    const gear = new THREE.Group();
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 14).rotateX(Math.PI / 2), M.warn()));
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), M.warn());
      tooth.position.set(Math.cos((i / 8) * Math.PI * 2) * 0.85, Math.sin((i / 8) * Math.PI * 2) * 0.85, 0);
      gear.add(tooth);
    }
    gear.position.set(0, 1.2, 1.15);
    mach.add(gear);
    const profitBlk = new THREE.Group();
    profitBlk.add(at(rbox(2.4, 1.2, 1.6, M.accent()), 0, 0.6, 0));
    profitBlk.position.y = 2.2;
    mach.add(profitBlk);
    const profitSign = sign("Lợi nhuận", { width: 2.2, size: 84, bg: C.accent });
    mach.add(profitSign);
    const tray = rbox(1.6, 0.4, 1.4, M.down());
    tray.position.set(3.4, 0.2, 0.6);
    const traySign = sign("Tiền lãi", { width: 1.8, size: 80, bg: "#FFD1D3" });
    traySign.position.set(3.4, 1.1, 1.7);
    mach.add(tray, traySign);
    const costCoins = Array.from({ length: 6 }, () => coin());
    mach.add(...costCoins);
    place(mach, "channels", STN.cost, 0, 0);
    scene.add(shadow(mach));
    // kênh 2: băng chuyền thời gian + máy ép P/E
    const conv = new THREE.Group();
    conv.add(at(rbox(9, 0.5, 1.6, M.ink()), 0, 0.9, 0));
    for (let i = 0; i < 6; i++) conv.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), M.muted()), -4 + i * 1.6, 0.45, 0));
    ["Nay", "Năm 1", "Năm 2", "Năm 3", "Năm 4", "Năm 5"].forEach((y, i) => {
      const l = sign(y, { width: y === "Nay" ? 0.9 : 1.3, size: 70, billboard: false, bg: null, border: null });
      l.rotation.x = -Math.PI / 2.6;
      l.position.set(-4 + i * 1.6, 1.3, 1.05);
      conv.add(l);
    });
    const futCoins = Array.from({ length: 6 }, () => coin());
    conv.add(...futCoins);
    const pvSign = sign("Lợi nhuận tương lai → giá trị hiện tại", { width: 6.4, size: 70 });
    pvSign.position.set(-0.6, 2.6, 1);
    conv.add(pvSign);
    const peCol = column(1.6, 1.6, C.accent);
    peCol.group.position.set(7, 0, 0);
    conv.add(peCol.group);
    const peSign = sign("P/E hợp lý", { width: 2.2, size: 84, bg: C.accent });
    conv.add(peSign);
    const weight = new THREE.Group();
    weight.add(at(rbox(2.2, 1.2, 2.2, M.ink()), 0, 0.6, 0));
    weight.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 6, 12, Math.PI), M.ink()), 0, 1.2, 0));
    const wSign = sign("Tỷ suất chiết khấu ↑", { width: 3.4, size: 76, bg: "#FFD1D3" });
    weight.add(wSign);
    conv.add(weight);
    place(conv, "channels", STN.val, 0, 0);
    scene.add(shadow(conv));
    // kênh 3: cổ phiếu → tiết kiệm
    const exch = new THREE.Group();
    exch.add(at(rbox(3.4, 0.3, 2.4, M.paper()), 0, 0.15, 0));
    for (let i = 0; i < 4; i++) exch.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2, 8), M.white()), -1.2 + i * 0.8, 1.3, 0.8));
    exch.add(at(rbox(3.4, 0.4, 2.4, M.paper()), 0, 2.5, 0));
    exch.add(at(rbox(3, 2, 0.2, M.ink()), 0, 1.3, -0.6));
    const exSign = sign("Cổ phiếu", { width: 2.2, size: 88, bg: C.paper });
    exSign.position.set(0, 3.6, 0);
    exch.add(exSign);
    place(exch, "channels", STN.flow - 3.6, 0, 0);
    const vault = piggy("#FFC9D6", 2);
    place(vault, "channels", STN.flow + 4, 1.6, 0);
    vault.rotation.y = -Math.PI / 2 + 0.5;
    const vSign = sign(["Tiết kiệm", "lãi suất ↑"], { width: 2.4, size: 80, bg: C.accent });
    place(vSign, "channels", STN.flow + 4, 4.4, 0);
    scene.add(shadow(exch), vault, vSign);
    const flowCoins = Array.from({ length: 10 }, () => coin());
    flowCoins.forEach((c) => scene.add(c));
    on((t) => {
      chPipes.forEach((p, i) => {
        p.f.update(t, { speed: 0.25 });
        pop(p.lbl, inS(t, "s10") ? ep(t, T("s10", 0.4 + i * 0.5), 0.4, ease.linear) : 0);
      });
      gear.rotation.z = -t * (inS(t, "s11") ? 2.5 : 0.6);
      const shrink = ep(t, T("s11", 2.5), 2.5);
      profitBlk.scale.set(1 - shrink * 0.45, 1 - shrink * 0.45, 1);
      profitSign.position.set(0, 2.2 + 1.2 * (1 - shrink * 0.45) + 0.6, 0);
      const coinOn = inS(t, "s11");
      costCoins.forEach((c, i) => {
        const u = (((t * 0.7 + i / 6) % 1) + 1) % 1;
        c.visible = coinOn && t > T("s11", 0.8);
        arc(c, [1.2, 2.4, 0.6], [3.4, 0.5, 0.6], u, 1.6);
        c.rotation.x = t * 5;
      });
      // tiền tương lai chạy từ "Năm 5" về "Nay", nhỏ dần
      futCoins.forEach((c, i) => {
        const u = (((t * 0.16 + i / 6) % 1) + 1) % 1;
        c.position.set(4 - u * 8, 1.45, 0);
        c.rotation.set(Math.PI / 2, 0, 0);
        const disc = inS(t, "s12") && t > T("s12", 4) ? 1.25 : 1;
        c.scale.setScalar((1.7 - u * 0.95) / disc);
      });
      const press = ep(t, T("s12", 4.2), 2);
      const ph = 3.2 - press * 1.3;
      peCol.set(ph);
      peSign.position.set(7, ph + 2.4 + 0.2, 1.4);
      weight.position.set(7, lerp(7.5, ph, ep(t, T("s12", 3.8), 0.9, ease.in)), 0);
      weight.scale.setScalar(lerp(0.8, 1.15, press));
      wSign.position.set(0, 2.2, 0);
      pop(wSign, ep(t, T("s12", 3.8), 0.4, ease.linear), 1 / weight.scale.x);
      // dòng tiền: cổ phiếu → tiết kiệm
      const fOn = t > T("s13", 2.2) && t < T("s14", 1);
      flowCoins.forEach((c, i) => {
        const u = (((t * 0.45 + i / 10) % 1) + 1) % 1;
        c.visible = fOn;
        arc(c, W("channels", STN.flow - 3.2, 2.6, 0.3), W("channels", STN.flow + 3.4, 2.8, 0.3), u, 2.6);
        c.rotation.x = t * 4;
      });
    });

    // ---------- Thành phố (s01, s14–s18, s23) ----------
    const city = createCity();
    place(city.group, "city");
    scene.add(city.group);
    const toam = city.cos.toam, heodat = city.cos.heodat;
    const news = sign("TIN MỚI: NHNN tăng lãi suất", { width: 10, size: 110, bg: C.down, fg: "#FFFFFF", border: null });
    place(news, "city", 0, 10.5, -4);
    scene.add(news);
    const nProfit = sign("Lợi nhuận trước lãi vay: 400 tỷ/năm", { width: 6.2, size: 76, bg: C.accent });
    const nDebt = sign("Nợ vay: 2.000 tỷ", { width: 3.6, size: 76, bg: "#FFD1D3" });
    place(nProfit, "city", 5.4, 5.2, 2.5);
    place(nDebt, "city", 5.4, 4, 2.5);
    scene.add(nProfit, nDebt);
    // khối lợi nhuận 400 tỷ: 1 đơn vị = 100 tỷ
    const blk = new THREE.Group();
    blk.add(at(rbox(6.6, 0.9, 1.6, M.ink()), 0, 0.45, 0));
    const red = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.2), M.down());
    const mint = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.2), M.accent());
    blk.add(red, mint);
    const RATES = [
      { r: "8%", i: 160, k: 240, at: 0 },
      { r: "10%", i: 200, k: 200, at: 5.4 },
      { r: "12%", i: 240, k: 160, at: 8.6 },
    ];
    const rateSigns = RATES.map((x) => sign(`Lãi suất vay ${x.r}`, { width: 3.4, size: 84, bg: C.warn }));
    const intSigns = RATES.map((x) => sign(`Tiền lãi ${x.i} tỷ`, { width: 2.2, size: 72, bg: "#FFD1D3" }));
    const keepSigns = RATES.map((x) => sign(`Còn ${x.k} tỷ`, { width: 1.9, size: 76, bg: C.accent }));
    blk.add(...rateSigns, ...intSigns, ...keepSigns);
    const blkTitle = sign("Tổ Ấm Land (giả định): 400 tỷ", { width: 5, size: 72 });
    blkTitle.position.set(-0.6, 4, 0);
    blk.add(blkTitle);
    const knob = new THREE.Group();
    knob.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.4, 12).rotateX(Math.PI / 2), M.ink()));
    knob.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.1), M.warn()), 0, 0.3, 0.22));
    knob.position.set(4.5, 1.4, 0.5);
    blk.add(knob);
    const stamp = sign("−1/3 lợi nhuận", { width: 3.4, size: 100, bg: "#FFFFFF", fg: C.down, border: C.down });
    blk.add(stamp);
    place(blk, "city", 0, 0.1, 6.2);
    scene.add(shadow(blk));
    const lev = sign("Nợ gấp 5 lần lợi nhuận", { width: 4.4, size: 80, bg: C.warn });
    place(lev, "city", -5.4, 5.6, 4.4);
    const sens = sign("Nhạy nhất", { width: 2.2, size: 84, bg: C.down, fg: "#FFFFFF", border: null });
    place(sens, "city", 2.75, 3.2, 2.2);
    scene.add(lev, sens);
    // s17: cần cẩu chủ đầu tư + người mua nhà trước cửa ngân hàng
    const crane = new THREE.Group();
    crane.add(at(rbox(0.25, 5, 0.25, M.warn()), 0, 2.5, 0));
    const jib = new THREE.Group();
    jib.add(at(rbox(3.6, 0.2, 0.2, M.warn()), 1.2, 0, 0));
    jib.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), M.ink()), 2.6, -0.7, 0));
    jib.add(at(rbox(0.5, 0.4, 0.4, M.muted()), 2.6, -1.5, 0));
    jib.position.y = 5;
    crane.add(jib);
    place(crane, "city", -3.2, 0, -2.6);
    scene.add(shadow(crane));
    const devSign = sign(["Chủ đầu tư", "chi phí vốn ↑"], { width: 2.8, size: 76, bg: "#FFD1D3" });
    place(devSign, "city", -0.6, 5, 3.2);
    const buyer = createAn({ colors: { suit: "#D9773F", tie: "#FFFFFF", hair: "#4A2E1F" } });
    buyer.track([{ t: 0, pose: "idle", walk: [0, 0, 1e9] }]);
    const buyerStop = createAn({ colors: { suit: "#D9773F", tie: "#FFFFFF", hair: "#4A2E1F" } });
    buyerStop.track([{ t: 0, pose: "shrug", expr: "worried" }]);
    scene.add(buyer.root, buyerStop.root);
    const door = rbox(1.2, 1.7, 0.12, M.ink());
    place(door, "city", 8, 0.95, 1.05);
    scene.add(door);
    const buySign = sign(["Người mua nhà", "khó vay hơn"], { width: 2.8, size: 76, bg: "#FFD1D3" });
    place(buySign, "city", 11.2, 4.4, 2.4);
    scene.add(devSign, buySign);
    // s18: hai cột lãi suất của Heo Đất
    const tubeM = mat("#E6EEFA", { transparent: true, opacity: 0.35 });
    const tubes = [["Lãi suất cho vay", C.accentDark, 11.2], ["Lãi suất huy động", "#3D7BFF", 14.2]].map(([name, col, x]) => {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 4.2, 14, 1, true), tubeM), 0, 2.1, 0));
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 14), M.ink()), 0, 0.1, 0));
      const fill = column(1, 1, col);
      fill.mesh.geometry = new THREE.CylinderGeometry(0.55, 0.55, 1, 14);
      fill.group.position.y = 0.2;
      g.add(fill.group);
      const lbl = sign(name, { width: 2.4, size: 68 });
      lbl.position.y = 5;
      g.add(lbl);
      place(g, "city", x, 0, 1.4);
      scene.add(shadow(g));
      return { g, fill, lbl };
    });
    const nimBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), M.warn());
    const nimSign = sign("NIM", { width: 1.3, size: 100, bg: C.warn });
    scene.add(nimBar, nimSign);
    on((t) => {
      // s01: tin mới → các cột giá giảm, Tổ Ấm Land giảm sâu nhất (giữ nguyên trạng thái sau đó)
      pop(news, inS(t, "s01") ? ep(t, T("s01", 0.4), 0.5, ease.linear) : 0);
      const k1 = ep(t, T("s01", 1.4), 1.6);
      const DROP = { heodat: 0.12, giotre: 0.1, loren: 0.2, cancau: 0.22, cabac: 0.08, canhdieu: 0.15, congxanh: 0.12, giomay: 0.1 };
      for (const [k, sz] of Object.entries(DROP)) city.cos[k].move(k1, sz);
      toam.move(ep(t, T("s01", 3.4), 1.4), 0.7);
      // s14: số liệu Tổ Ấm Land
      const s14on = t >= T("s14") && t < T("s15");
      pop(nProfit, s14on ? ep(t, T("s14", 0.4), 0.5, ease.linear) : 0);
      pop(nDebt, s14on ? ep(t, T("s14", 3.6), 0.5, ease.linear) : 0);
      // s15–s16: khối lợi nhuận bị tiền lãi chiếm dần
      const blkOn = t >= T("s15") && t < T("s17");
      pop(blk, blkOn ? ep(t, T("s15"), 0.6, ease.linear) : 0);
      if (blk.visible) {
        let step = 0;
        RATES.forEach((x, i) => t >= T("s15", x.at) && (step = i));
        if (t >= T("s16")) step = 2;
        const prevI = step ? RATES[step - 1].i : RATES[0].i;
        const kk = step ? ep(t, T("s15", RATES[step].at), 0.8) : 1;
        const iv = (lerp(prevI, RATES[step].i, t >= T("s16") ? 1 : kk) / 100) * 1.5;
        const L = 6;
        red.scale.set(iv, 1, 1);
        red.position.set(-L / 2 + iv / 2, 1.4, 0);
        mint.scale.set(L - iv, 1, 1);
        mint.position.set(-L / 2 + iv + (L - iv) / 2, 1.4, 0);
        knob.rotation.z = -(step * 0.9 + (kk - 1) * 0.9 * (step ? 1 : 0));
        rateSigns.forEach((s, i) => ((s.visible = i === step), s.position.set(4.6, 2.75, 0.5)));
        intSigns.forEach((s, i) => ((s.visible = i === step), s.position.set(-L / 2 + iv / 2, 2.35, 0.7)));
        keepSigns.forEach((s, i) => ((s.visible = i === step), s.position.set(-L / 2 + iv + (L - iv) / 2, 2.35, 0.7)));
        pop(stamp, t >= T("s16") ? ep(t, T("s16", 0.3), 0.5, ease.linear) : 0);
        stamp.position.set(0, 1.5, 1.1);
      }
      pop(lev, inS(t, "s16") ? ep(t, T("s16", 4), 0.5, ease.linear) : 0);
      pop(sens, inS(t, "s16") ? ep(t, T("s16", 4.4), 0.5, ease.linear) : 0);
      // s17
      const s17 = inS(t, "s17");
      jib.rotation.y = t * 0.25 + (t > T("s17") ? -(t - T("s17")) * 0.2 : 0);
      pop(devSign, s17 ? ep(t, T("s17", 0.3), 0.5, ease.linear) : 0);
      pop(buySign, s17 ? ep(t, T("s17", 1.4), 0.5, ease.linear) : 0);
      const bw = ep(t, T("s17", 0), 2.4, ease.linear);
      const walking = s17 && bw < 1;
      buyer.root.visible = walking;
      buyerStop.root.visible = s17 && !walking;
      const bp = W("city", lerp(13.5, 9.6, bw), 0, 3.2);
      buyer.root.position.set(...bp);
      buyer.root.rotation.y = -Math.PI / 2 - 0.3;
      buyer.update(t);
      buyerStop.root.position.set(...bp);
      buyerStop.root.rotation.y = Math.atan2(camera.position.x - bp[0], camera.position.z - bp[2]);
      buyerStop.update(t);
      door.scale.x = 0.05 + 0.95 * ep(t, T("s17", 1), 1.2) * (s17 ? 1 : 0);
      door.visible = door.scale.x > 0.06;
      // s18: lãi suất cho vay điều chỉnh nhanh, huy động chậm hơn → NIM đổi
      const fast = ep(t, T("s18", 3.6), 1.2), slow = ep(t, T("s18", 4.4), 3.5);
      const hL = 2.3 + fast * 0.9, hD = 1.4 + slow * 1.3;
      tubes[0].fill.set(hL);
      tubes[1].fill.set(hD);
      const showT = t >= T("s18") - 0.3 && t < T("s19");
      tubes.forEach((x) => pop(x.g, showT ? ep(t, T("s18") - 0.3, 0.6, ease.linear) : 0));
      const nimOn = showT && t > T("s18", 4);
      nimBar.visible = nimOn;
      nimBar.scale.y = Math.max(0.01, hL - hD);
      nimBar.position.set(...W("city", 12.7, 0.2 + hD + (hL - hD) / 2, 1.4));
      pop(nimSign, nimOn ? ep(t, T("s18", 4), 0.4, ease.linear) : 0);
      nimSign.position.set(...W("city", 12.7, 0.2 + hL + 0.75, 1.6));
    });

    // ---------- Sân khấu quiz (s19) + sổ tay (s21) ----------
    const stage = new THREE.Group();
    stage.add(at(new THREE.Mesh(new THREE.CylinderGeometry(9, 9.3, 0.3, 32), mat("#DCE3F2")), 0, 0.15, 0));
    stage.add(at(rbox(14, 4.4, 0.3, M.ink()), 0, 4.4, -3));
    const q = V.scenes.find((s) => s.id === "s19").visual;
    const qSign = sign(["Ngành nào thường chịu bất lợi", "rõ nhất khi lãi suất tăng?"], { width: 12, size: 90, bg: null, border: null, fg: "#FFFFFF", billboard: false });
    qSign.position.set(0, 4.4, -2.8);
    stage.add(qSign);
    const peds = q.options.map((o, i) => {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 1.2, 12), mat([C.accent, C.warn, "#FFC9D6"][i])), 0, 0.6, 0));
      const l = sign(`${"ABC"[i]}. ${o}`, { width: o.length > 16 ? 4.2 : 3.2, size: 76 });
      l.position.y = 2;
      g.add(l);
      g.position.set((i - 1) * 4.6, 0.3, 1);
      stage.add(g);
      return g;
    });
    const answer = sign("Đáp án trong bài viết bên dưới", { width: 6, size: 84, bg: C.accent, border: C.ink });
    answer.position.set(0, 7.6, -2.6);
    stage.add(answer);
    const spot = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color: "#FFF6C8", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    stage.add(spot);
    place(stage, "board");
    scene.add(shadow(stage));
    // sổ tay
    const book = new THREE.Group();
    book.add(at(rbox(8.4, 1, 4.6, mat("#8A6A4F")), 0, 0.5, 0));
    for (const s of [-1, 1]) {
      const page = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.12, 4), M.white());
      page.position.set(s * 2.02, 1.08, 0);
      book.add(page);
    }
    const entries = V.scenes.find((s) => s.id === "s21").visual.entries;
    const lines = entries.map((e, i) => {
      const words = e.split(" ");
      const half = Math.ceil(words.length / 2);
      const l = sign([words.slice(0, half).join(" "), words.slice(half).join(" ")], { width: 3.5, size: 64, bg: null, border: null, weight: i === entries.length - 1 ? 800 : 600, fg: i === entries.length - 1 ? C.accentDark : C.ink, billboard: false });
      l.rotation.x = -Math.PI / 2;
      l.position.set(i < 2 ? -2.02 : 2.02, 1.2, -0.95 + (i % 2) * 1.9);
      book.add(l);
      return l;
    });
    const cover = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 1.6), M.white());
    book.add(cover);
    place(book, "book", 0, 0, 0);
    scene.add(shadow(book));
    on((t) => {
      peds.forEach((p, i) => {
        const k = ep(t, T("s19", 0.6 + i * 0.7), 0.6, ease.back);
        p.scale.set(1, Math.max(0.01, k), 1);
        p.visible = k > 0.01;
      });
      pop(answer, inS(t, "s19") ? ep(t, T("s19", 4.6), 0.5, ease.linear) : 0);
      spot.visible = inS(t, "s19") && t > T("s19", 2.6);
      const sx = Math.sin((t - T("s19", 2.6)) * 1.6) * 5.2;
      spot.position.set(sx, 4.6, 1);
      // dòng sổ tay mới: tấm che trượt đi để lộ chữ
      const reveal = ep(t, T("s21", 1.2), 1.6, ease.linear);
      cover.scale.x = Math.max(0.01, 1 - reveal);
      cover.position.set(2.02 + 1.9 * reveal, 1.24, 0.95);
      lines.at(-1).visible = t > T("s21", 1);
    });

    // ---------- Máy quay ----------
    const c = (id, a, set, p, l, extra = {}) => ({ t: T(id, a), p: W(set, ...p), l: W(set, ...l), ...extra });
    const cam = cameraPath([
      // s01 thành phố
      c("s01", 0, "city", [0, 17, 34], [0, 3, -3]),
      c("s01", 3.4, "city", [2, 6, 15], [0.8, 3.4, 0]),
      c("s01", 6, "city", [-1.2, 3.2, 11.5], [-2.2, 2.4, 2.5]),
      c("s01", 8.6, "city", [-1.6, 3, 10.5], [-2.4, 2.2, 3]),
      // s02 đài điều khiển
      c("s02", 0, "control", [-13, 4.2, 11], [-5, 2, 0], { cut: true }),
      c("s02", 4, "control", [-2.5, 3.8, 9], [0.4, 2.1, 0]),
      c("s02", 6.4, "control", [-1, 3.4, 8.4], [1, 2, 0.5]),
      // bay qua ống tới bể NHNN
      c("s03", 0.2, "valve", [0, 4.5, 24], [0, 2, 9], { ease: ease.out }),
      c("s03", 3, "valve", [0, 4.8, 22], [0, 2, 9]),
      c("s03", 5.5, "valve", [1.5, 3, 17.5], [1.5, 2, 9.5]),
      c("s03", 7.5, "valve", [1.2, 3.4, 17], [1, 2.4, 9]),
      // s04 bể chứa
      c("s04", 1.2, "valve", [0, 2.2, 12], [0, 5, 0]),
      c("s04", 3.6, "valve", [-7, 4, 11], [0, 3.4, 0]),
      c("s04", 6.4, "valve", [4.5, 3.6, 12], [1.5, 3.4, 1]),
      c("s04", 8.4, "valve", [5.5, 3.4, 11.5], [2, 3.2, 1.5]),
      // s05 hành lang
      c("s05", 0, "corridor", [-1, 3, 15.5], [-1, 2.8, 0], { cut: true }),
      c("s05", 2.8, "corridor", [-6, 3, 8.5], [-5.6, 2.8, 0]),
      c("s05", 8, "corridor", [6.5, 3, 8.5], [6.6, 2.8, 0], { ease: ease.linear }),
      c("s05", 10.8, "corridor", [-2, 3.4, 17], [-1.6, 2.8, 0]),
      // s06 van → theo dòng nước → ngân hàng
      c("s06", 0, "valve", [3.2, 3.2, 8], [0, 2.4, 1.8], { cut: true }),
      c("s06", 1.6, "valve", [4, 3.6, 9], [1, 2.2, 1]),
      c("s06", 4.6, "pipes", [3.5, 4, 13], [6, 2, 0]),
      c("s06", 6.8, "pipes", [5, 3.8, 12], [6.5, 2, 1]),
      // s07 OMO
      c("s07", 0, "pipes", [-6.5, 4.6, 17], [-5.2, 2.8, 3.2], { cut: true }),
      c("s07", 4, "pipes", [-3.8, 5, 16], [-4.8, 2.8, 3.2]),
      c("s07", 8.2, "pipes", [-5, 4.8, 16.5], [-5.4, 2.6, 3.4]),
      // s08 cắt ngang bể
      c("s08", 0, "pipes", [15.2, 3.6, 12], [15.2, 2.2, 0], { cut: true }),
      c("s08", 6, "pipes", [16, 3.4, 11], [15.8, 2.2, 0]),
      c("s08", 7.4, "pipes", [19.6, 3, 7.5], [19, 2.6, 0.4]),
      c("s08", 10.8, "pipes", [18.4, 3.4, 9.5], [17.4, 2.4, 0.4]),
      // s09 tường màn hình
      c("s09", 0, "control", [0, 4.6, 14], [0, 4.6, -3.6], { cut: true }),
      c("s09", 4.5, "control", [0.8, 4.2, 12], [0.6, 4.2, -3]),
      c("s09", 6.9, "control", [1.2, 4, 11], [0.8, 4, -2.4]),
      // s10 nhìn từ trên xuống ba ống
      c("s10", 0, "channels", [4, 30, 4], [4, 0, -4], { cut: true, fov: 42 }),
      c("s10", 2.4, "channels", [-4, 9, 16], [-6, 2, 0], { fov: 38 }),
      c("s10", 4.6, "channels", [-7, 5, 13], [-8, 2, 0]),
      // s11 kênh 1
      c("s11", 2, "channels", [-8, 4.4, 11], [-7.4, 2.2, 0]),
      c("s11", 6.2, "channels", [-9, 4, 10], [-8, 2.2, 0.5]),
      // s12 kênh 2
      c("s12", 1.2, "channels", [2.5, 3, 7], [4, 1.4, 0]),
      c("s12", 4, "channels", [6, 4.2, 14], [7, 3.4, 0]),
      c("s12", 7, "channels", [4, 3.8, 13], [5, 2.8, 0]),
      c("s12", 9.4, "channels", [3.2, 3.6, 12.5], [4.4, 2.6, 0.4]),
      // s13 kênh 3
      c("s13", 0.6, "channels", [25, 5, 16], [25, 2.4, 0]),
      c("s13", 2.6, "channels", [24, 4.8, 14], [24.6, 3, 0]),
      c("s13", 5, "channels", [22.6, 4.2, 14], [23.4, 2.4, 0.6]),
      // bay vào thành phố, orbit Tổ Ấm Land (s14)
      c("s14", 0, "city", [-6, 4.4, 14], [0.6, 3.2, 0.6], { cut: true }),
      c("s14", 7, "city", [6, 4.8, 14.5], [1.4, 3.4, 1]),
      // s15–s16 khối lợi nhuận
      c("s15", 0, "city", [0, 3.8, 20], [0, 2.4, 6.2], { cut: true }),
      c("s15", 5.4, "city", [0.4, 3.6, 19], [0.4, 2.4, 6.2]),
      c("s15", 8.6, "city", [0.8, 3.4, 18], [0.8, 2.4, 6.2]),
      c("s15", 11.9, "city", [0.6, 3.4, 17.6], [0.6, 2.4, 6.2]),
      c("s16", 4, "city", [0.6, 3.4, 17.6], [0.6, 2.4, 6.2]),
      c("s16", 6.5, "city", [-0.6, 5.4, 22.5], [-0.4, 3.4, 3]),
      c("s16", 10.4, "city", [-1.4, 5, 21.5], [-1, 3.2, 3.5]),
      // s17 hai nửa khung
      c("s17", 0, "city", [4.8, 5.4, 20], [4.8, 2.6, 0.5], { cut: true }),
      c("s17", 5.6, "city", [4.2, 4.8, 17.5], [4.2, 2.4, 1]),
      // s18 Heo Đất
      c("s18", 0, "city", [9, 4, 15], [10, 2.4, 0], { cut: true }),
      c("s18", 4, "city", [12.6, 3.6, 11], [12.7, 2.8, 1.4]),
      c("s18", 7, "city", [9, 3.6, 13], [9.4, 2.4, 1.4]),
      // s19 quiz
      c("s19", 0, "board", [0, 4.6, 18], [0, 3.6, 0], { cut: true }),
      c("s19", 4.5, "board", [1.6, 4, 15], [1.2, 3.2, 0]),
      c("s19", 7.4, "board", [2.4, 3.8, 14], [1.8, 3, 0]),
      // s20 đèn Lãi suất
      c("s20", 0, "control", [0.6, 3, 5], [0, 2.2, 0], { cut: true }),
      c("s20", 2, "control", [0.6, 4, 10.5], [1, 2.4, 0.5]),
      c("s20", 4.3, "control", [0.4, 4.2, 11], [1, 2.4, 0.5]),
      // s21 sổ tay
      c("s21", 0, "book", [0, 9, 3], [0, 1, 0], { cut: true }),
      c("s21", 3.5, "book", [0.4, 5, 9.5], [2.4, 1.6, 0.6]),
      c("s21", 6, "book", [0, 4.6, 10], [2.6, 1.6, 1]),
      // s22 gợi Bài 5
      c("s22", 0, "control", [-1, 3.6, 9], [0.6, 2.1, 0], { cut: true }),
      c("s22", 2.6, "control", [-0.5, 4, 8]  , [0.6, 2.2, 0]),
      c("s22", 5, "control", [0, 9, 1], [0, 1, -18]),
      c("s22", 6.6, "control", [0, 9, 0], [0, 1, -18]),
      c("s22", 8.9, "control", [-0.6, 3.8, 9.5], [1, 2, 0.5]),
      // s23 kết
      c("s23", 0, "city", [-0.4, 3.2, 12.5], [-1.6, 2, 4.5], { cut: true }),
      c("s23", 5.3, "city", [-0.4, 6, 20], [-1.4, 2.6, 3]),
    ]);

    const ov = createOverlay(overlay, V);
    const sunOff = new THREE.Vector3(12, 22, 14);
    return (t) => {
      const look = cam(camera, t);
      sun.target.position.copy(look);
      sun.position.copy(look).add(sunOff);
      for (const u of updates) u(t);
      updateAn(t);
      faceCamera(camera);
      ov(t);
    };
  },
});
