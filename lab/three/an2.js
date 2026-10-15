// Nhân vật An bản 2 — phong cách đồ chơi vinyl: khối mượt, đầu to, vật liệu bóng nhẹ (clearcoat), mắt có điểm sáng.
// Cùng API với an.js (track / update / validateRig) và cùng bảng tư thế POSES3D, nên đổi qua lại không phải sửa tập.
import * as THREE from "three";
import { POSES3D } from "./an.js";
import { C } from "./materials.js";
import { deg, lerp, clamp, ease, wave } from "./core.js";

const DEFAULT_EXPR = {
  idle: "neutral", point: "happy", pointUp: "excited", present: "happy", wave: "happy", cheer: "excited",
  think: "thinking", shrug: "confused", hips: "confident", headHold: "worried", facepalm: "sad",
  grip: "worried", lookUp: "surprised",
};
// mắt: độ mở; mày: nâng (+) / nhíu (−); miệng: kiểu
const EXPRS = {
  happy: { eye: 1, brow: 0.2, mouth: "smile" },
  excited: { eye: 1.1, brow: 1, mouth: "open" },
  surprised: { eye: 1.35, brow: 1.2, mouth: "o" },
  worried: { eye: 0.9, brow: -1, mouth: "frown" },
  sad: { eye: 0.35, brow: -1, mouth: "frown" },
  thinking: { eye: 0.85, brow: 0.6, mouth: "smirk" },
  confused: { eye: 1, brow: 0.6, mouth: "flat" },
  confident: { eye: 0.8, brow: -0.3, mouth: "smirk" },
  neutral: { eye: 1, brow: 0, mouth: "smile" },
};
const BLEND = 0.45;

// Bảng tư thế chung + tư thế riêng của bản 2. Giá trị thứ 11 = gật đầu (độ, dương = ngửa lên); bảng cũ không có thì là 0.
const POSES = {
  ...POSES3D,
  grip: [-12, -22, 12, 22, 0, 2, -2, 0, 72, 72, 0], // hai tay đưa ra trước bám tay vịn
  lookUp: [-14, 8, 14, -8, 0, 0, 0, 0, 0, 0, 24], // ngửa đầu nhìn lên
};
const pose11 = (name) => {
  const a = POSES[name] || POSES.idle;
  return a.length >= 11 ? a : [...a, ...Array(11 - a.length).fill(0)];
};

const vinyl = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35, ...o });

export function createAn2({ scale = 1, colors = {} } = {}) {
  const K = { suit: "#22336E", tie: C.accent, hair: "#1A1F3A", skin: "#F6CFAE", shoe: "#151A33", ...colors };
  const M = {
    suit: vinyl(K.suit, { roughness: 0.55, clearcoat: 0.2 }),
    skin: vinyl(K.skin, { roughness: 0.5, clearcoat: 0.25, sheen: 0.4, sheenColor: new THREE.Color("#FFD9C4") }),
    hair: vinyl(K.hair, { roughness: 0.35, clearcoat: 0.8 }),
    shoe: vinyl(K.shoe, { roughness: 0.3, clearcoat: 1 }),
    shirt: vinyl("#FFFFFF", { roughness: 0.6, clearcoat: 0 }),
    tie: vinyl(K.tie, { roughness: 0.35, clearcoat: 0.8 }),
    eye: vinyl("#141829", { roughness: 0.1, clearcoat: 1 }),
    white: new THREE.MeshBasicMaterial({ color: "#FFFFFF" }),
    blush: new THREE.MeshBasicMaterial({ color: "#FF9EA8", transparent: true, opacity: 0.45, depthWrite: false }),
    mouth: vinyl("#7A2635", { roughness: 0.5, clearcoat: 0 }),
    brow: vinyl(K.hair, { roughness: 0.4 }),
  };
  const parts = { head: [], torso: [], arm: [], forearm: [], hand: [], leg: [], foot: [] };
  const root = new THREE.Group();
  root.name = "An2";
  const body = new THREE.Group();
  root.add(body);

  // chân: trụ bo tròn + giày tròn
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.15, 0.64, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.36, 8, 20), M.suit);
    leg.position.y = -0.27;
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), M.shoe);
    shoe.scale.set(0.95, 0.6, 1.35);
    shoe.position.set(0, -0.56, 0.05);
    pivot.add(leg, shoe);
    root.add(pivot);
    parts.leg.push(leg);
    parts.foot.push(shoe);
    return pivot;
  });

  // thân: viên nang hơi phình + cổ áo trắng + cà vạt mint
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.32, 10, 28), M.suit);
  torso.scale.set(1, 1, 0.82);
  torso.position.y = 0.98;
  body.add(torso);
  parts.torso.push(torso);
  const collar = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 3, 1), M.shirt);
  collar.rotation.set(Math.PI, 0, 0);
  collar.scale.set(1, 1, 0.3);
  collar.position.set(0, 1.27, 0.235);
  const tie = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.17, 4, 10), M.tie);
  tie.position.set(0, 1.15, 0.262);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), M.tie);
  knot.position.set(0, 1.29, 0.255);
  body.add(collar, tie, knot);
  for (const s of [-1, 1]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 6), M.hair);
    btn.position.set(s * 0.06, 0.94, 0.252);
    body.add(btn);
  }

  // đầu to (tỉ lệ chibi)
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.38;
  body.add(headPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 16), M.skin);
  neck.position.y = 0.03;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.43, 48, 32), M.skin);
  head.scale.set(1.04, 0.96, 0.98);
  head.position.y = 0.44;
  headPivot.add(neck, head);
  parts.head.push(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), M.skin);
    ear.scale.set(0.6, 1, 0.8);
    ear.position.set(s * 0.44, 0.42, 0);
    headPivot.add(ear);
  }
  // tóc: chỏm tròn + mái hất
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.455, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair);
  hair.scale.set(1.04, 0.92, 1.0);
  hair.position.set(0, 0.5, -0.03);
  hair.rotation.x = -0.32;
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), M.hair);
  fringe.scale.set(1.5, 0.55, 0.8);
  fringe.position.set(-0.1, 0.78, 0.24);
  fringe.rotation.z = 0.35;
  headPivot.add(hair, fringe);

  // mặt
  const face = new THREE.Group();
  face.position.set(0, 0.42, 0.405);
  headPivot.add(face);
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group();
    g.position.set(s * 0.15, 0.02, 0);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 14), M.eye);
    e.scale.set(0.85, 1.15, 0.5);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), M.white);
    hl.position.set(0.018, 0.03, 0.03);
    g.add(e, hl);
    face.add(g);
    return g;
  });
  const brows = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.08, 4, 8), M.brow);
    b.rotation.z = Math.PI / 2;
    b.position.set(s * 0.15, 0.13, -0.005);
    face.add(b);
    return b;
  });
  for (const s of [-1, 1]) {
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), M.blush);
    bl.position.set(s * 0.25, -0.07, -0.04);
    bl.rotation.y = s * 0.45;
    face.add(bl);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.017, 8, 20, Math.PI), M.mouth);
  smile.position.set(0, -0.1, -0.005);
  const flat = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.07, 4, 8), M.mouth);
  flat.rotation.z = Math.PI / 2;
  flat.position.set(0, -0.12, -0.005);
  const oMouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), M.mouth);
  oMouth.scale.set(0.9, 1.1, 0.4);
  oMouth.position.set(0, -0.13, -0.01);
  const open = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.mouth);
  open.scale.set(1, 0.8, 0.4);
  open.position.set(0, -0.08, -0.01);
  face.add(smile, flat, oMouth, open);

  // tay: vai → cánh tay trên → khuỷu → cẳng tay → bàn tay tròn
  const arms = [1, -1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.33, 1.2, 0);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.2, 6, 14), M.suit);
    up.position.y = -0.14;
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.17, 6, 14), M.suit);
    fore.position.y = -0.12;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 14), M.shirt);
    cuff.position.y = -0.24;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), M.skin);
    hand.position.y = -0.32;
    elbow.add(fore, cuff, hand);
    shoulder.add(up, elbow);
    body.add(shoulder);
    parts.arm.push(up);
    parts.forearm.push(fore);
    parts.hand.push(hand);
    return { shoulder, elbow };
  });

  root.scale.setScalar(scale);
  root.traverse((o) => {
    if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = o.receiveShadow = true;
  });

  let keys = [{ t: 0, pose: "idle" }];
  function applyPose(a, w) {
    const [rs, re, ls, le, hd, ll, rl, lean, rf, lf, hp] = a;
    arms[0].shoulder.rotation.set(deg(-rf), 0, deg(-rs));
    arms[0].elbow.rotation.set(0, 0, deg(-re));
    arms[1].shoulder.rotation.set(deg(-lf), 0, deg(-ls));
    arms[1].elbow.rotation.set(0, 0, deg(-le));
    headPivot.rotation.set(deg(-hp), 0, deg(-hd));
    legs[0].rotation.set(w * 0.5, 0, deg(-ll));
    legs[1].rotation.set(-w * 0.5, 0, deg(-rl));
    body.rotation.z = deg(-lean);
  }
  function applyExpr(name, blink, talk) {
    const e = EXPRS[name] || EXPRS.neutral;
    const open_ = Math.max(0.08, e.eye * (1 - blink));
    eyes.forEach((g) => g.scale.set(1, open_, 1));
    brows.forEach((b, i) => {
      const s = i === 0 ? -1 : 1;
      b.position.y = 0.13 + Math.max(0, e.brow) * 0.035 + (e.eye > 1.2 ? 0.02 : 0);
      b.rotation.z = Math.PI / 2 + (e.brow < 0 ? -s * 0.35 * -e.brow : e.brow === 0.6 && i === 1 ? 0.25 : 0);
    });
    smile.visible = ["smile", "frown", "smirk"].includes(e.mouth);
    smile.rotation.z = e.mouth === "frown" ? 0 : Math.PI;
    smile.position.set(e.mouth === "smirk" ? 0.03 : 0, e.mouth === "frown" ? -0.15 : -0.08, -0.005);
    smile.scale.set(e.mouth === "smirk" ? 0.7 : 1, (e.mouth === "smirk" ? 0.6 : 1) * (1 + talk * 0.4), 1);
    flat.visible = e.mouth === "flat";
    oMouth.visible = e.mouth === "o";
    oMouth.scale.set(0.9, 1.1 + talk * 0.3, 0.4);
    open.visible = e.mouth === "open";
  }

  return {
    root,
    parts,
    track(k) {
      keys = [...k].sort((a, b) => a.t - b.t);
    },
    update(t, { talk = 0 } = {}) {
      let i = 0;
      while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
      const cur = keys[i], prev = keys[Math.max(0, i - 1)];
      const k = i === 0 ? 1 : ease.inOut(clamp((t - cur.t) / BLEND));
      const A = pose11(prev.pose), B = pose11(cur.pose);
      const pose = B.map((b, j) => lerp(A[j], b, k));
      pose[0] += wave(t, 3.1) * 3;
      pose[2] -= wave(t, 3.7, 1) * 3;
      pose[4] += wave(t, 4.3) * 2;
      const w = cur.walk && t < cur.t + cur.walk[2] ? Math.sin((t - cur.t) * 9) : 0;
      applyPose(pose, w);
      body.position.y = wave(t, 3.2) * 0.012 + Math.abs(w) * 0.03;
      body.scale.set(1, 1 + wave(t, 3.2) * 0.008, 1);
      const ph = (t + 0.9) % 3.7;
      const blink = ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
      applyExpr(cur.expr || DEFAULT_EXPR[cur.pose] || "neutral", blink, talk);
    },
    validateRig() {
      const want = { head: 1, torso: 1, arm: 2, forearm: 2, hand: 2, leg: 2, foot: 2 };
      const errs = Object.entries(want).filter(([k, n]) => parts[k].length !== n).map(([k, n]) => `${k}: ${parts[k].length}/${n}`);
      for (const [k, list] of Object.entries(parts)) for (const m of list) if (!m.parent) errs.push(`${k} bị tách khỏi khớp`);
      return errs;
    },
  };
}
