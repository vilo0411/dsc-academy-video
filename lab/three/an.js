// Nhân vật An bản 3D low-poly. Tư thế và biểu cảm dùng cùng tên với bản người que (scripts/lib/figure.mjs).
// Tay "R" là tay bên phải màn hình khi An quay mặt về camera (trục +x), giống quy ước của bản 2D.
//
// Dùng:  const an = createAn();  an.track([{ t: 0, pose: "idle" }, { t: 3, pose: "point", expr: "happy" }]);
//        mỗi khung: an.update(t)
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, C } from "./materials.js";
import { deg, lerp, clamp, ease, wave } from "./core.js";
import { textPlate } from "./labels.js";

// Góc lấy từ POSES 2D: [vai R, khuỷu R, vai L, khuỷu L, nghiêng đầu, chân L, chân R, nghiêng người]
// + [đưa tay R ra trước, đưa tay L ra trước] (độ) để tay không xuyên qua thân/đầu trong không gian 3D.
export const POSES3D = {
  idle: [-14, 8, 14, -8, 0, 0, 0, 0, 0, 0],
  point: [-95, -10, 22, -14, -4, 0, -4, -2, 25, 0],
  pointUp: [-158, -6, 22, -14, -6, 0, 0, 0, 15, 0],
  present: [-72, -38, 18, -12, -3, 2, -4, -2, 45, 0],
  wave: [-128, -42, 16, -10, 4, 0, 0, 0, 10, 0],
  cheer: [-148, 12, 148, -12, 0, 8, -8, 0, 10, 10],
  think: [-25, -140, 18, -10, 8, 3, 0, 3, 55, 0],
  shrug: [-48, -78, 48, 78, -6, 0, 0, 0, 35, 35],
  hips: [-50, 95, 50, -95, 0, 7, -7, 0, -10, -10],
  headHold: [-125, -95, 125, 95, 0, 0, 0, 0, 30, 30],
  facepalm: [-105, -125, 14, -8, 7, 0, 0, 2, 60, 0],
};

// Biểu cảm mặc định theo tư thế (giống figure.mjs)
const DEFAULT_EXPR = {
  idle: "neutral", point: "happy", pointUp: "excited", present: "happy", wave: "happy", cheer: "excited",
  think: "thinking", shrug: "confused", hips: "confident", headHold: "worried", facepalm: "sad",
};

const EXPRS = {
  happy: { eyes: "dot", brows: 0, mouth: "smile" },
  excited: { eyes: "happy", brows: 1, mouth: "open" },
  surprised: { eyes: "wide", brows: 1, mouth: "o" },
  worried: { eyes: "dot", brows: -1, mouth: "frown" },
  sad: { eyes: "closed", brows: -1, mouth: "frown" },
  thinking: { eyes: "dot", brows: 0.5, mouth: "smirk" },
  confused: { eyes: "dot", brows: 0.5, mouth: "flat" },
  confident: { eyes: "dot", brows: -0.3, mouth: "smirk" },
  neutral: { eyes: "dot", brows: 0, mouth: "flat" },
};

const EMOTES = { question: "?", exclaim: "!", bulb: "💡", sweat: "💧", sparkle: "✨" };

const BLEND = 0.45; // giây chuyển giữa hai tư thế

// colors: đổi màu cho nhân vật phụ (vd. người mua nhà) để không nhầm với An
export function createAn({ scale = 1, colors = {} } = {}) {
  const K = { suit: C.suit, tie: C.accent, hair: C.hair, ...colors };
  const root = new THREE.Group();
  root.name = "An";
  const body = new THREE.Group(); // nghiêng người, thở
  root.add(body);

  const suit = mat(K.suit);
  const skin = mat(C.skin);
  const shoe = mat(C.shoe);
  const ink = mat(C.ink);
  const parts = { head: [], torso: [], arm: [], forearm: [], hand: [], leg: [], foot: [] };

  // Chân: trụ từ hông xuống, bàn chân ở cuối
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.86, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.78, 7), suit);
    leg.position.y = -0.39;
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.12, 0.32, 2, 0.04), shoe);
    foot.position.set(0, -0.8, 0.06);
    pivot.add(leg, foot);
    parts.leg.push(leg);
    parts.foot.push(foot);
    root.add(pivot);
    return pivot;
  });

  // Thân: áo vest + áo sơ mi + cà vạt mint
  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.78, 0.36, 3, 0.12), suit);
  torso.position.y = 1.24;
  parts.torso.push(torso);
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.02), mat(C.shirt));
  shirt.position.set(0, 1.44, 0.181);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.025), mat(K.tie));
  tie.position.set(0, 1.42, 0.19);
  body.add(torso, shirt, tie);

  // Đầu
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.66;
  body.add(headPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 6), skin);
  neck.position.y = 0.02;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), skin);
  head.scale.set(1, 1.05, 0.95);
  head.position.y = 0.36;
  parts.head.push(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.355, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(K.hair));
  hair.position.y = 0.4;
  hair.rotation.x = -0.25;
  headPivot.add(neck, head, hair);

  // Mặt (đặt hơi nhô khỏi đầu để tránh z-fighting)
  const face = new THREE.Group();
  face.position.set(0, 0.36, 0.31);
  headPivot.add(face);
  const eyeGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(eyeGeo, ink);
    e.position.set(s * 0.12, 0.04, 0.02);
    face.add(e);
    return e;
  });
  const happyEyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 4, 10, Math.PI), ink);
    e.position.set(s * 0.12, 0.03, 0.03);
    face.add(e);
    return e;
  });
  const brows = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.02), ink);
    b.position.set(s * 0.12, 0.13, 0.0);
    face.add(b);
    return b;
  });
  const mouthArc = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 4, 12, Math.PI), ink);
  mouthArc.position.set(0, -0.1, 0.0);
  const mouthFlat = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.02), ink);
  mouthFlat.position.set(0, -0.12, 0.0);
  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.016, 5, 12), ink);
  mouthO.position.set(0, -0.12, 0.0);
  const mouthOpen = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12, Math.PI, Math.PI), mat("#7A2230"));
  mouthOpen.position.set(0, -0.08, 0.0);
  face.add(mouthArc, mouthFlat, mouthO, mouthOpen);

  // Tay: vai → cánh tay trên → khuỷu → cẳng tay → bàn tay
  const arms = [1, -1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.38, 1.54, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.36, 6), suit);
    upper.position.y = -0.18;
    const elbow = new THREE.Group();
    elbow.position.y = -0.36;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.32, 6), suit);
    fore.position.y = -0.16;
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), skin);
    hand.position.y = -0.36;
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    body.add(shoulder);
    parts.arm.push(upper);
    parts.forearm.push(fore);
    parts.hand.push(hand);
    return { shoulder, elbow };
  });

  // Biểu tượng cảm xúc trên đầu
  const emote = new THREE.Group();
  emote.position.set(0.42, 2.55, 0);
  body.add(emote);
  const emoteSprites = {};
  for (const [k, ch] of Object.entries(EMOTES)) {
    const p = textPlate(ch, { width: 0.42, bg: k === "question" || k === "exclaim" ? C.warn : null, size: 120, pad: 30, radius: 60 });
    p.visible = false;
    emote.add(p);
    emoteSprites[k] = p;
  }

  root.scale.setScalar(scale);
  root.traverse((o) => {
    if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true;
  });

  let keys = [{ t: 0, pose: "idle" }];

  function applyPose(a, w) {
    const [rs, re, ls, le, hd, ll, rl, lean, rf, lf] = a;
    arms[0].shoulder.rotation.set(deg(-rf), 0, deg(-rs));
    arms[0].elbow.rotation.set(0, 0, deg(-re));
    arms[1].shoulder.rotation.set(deg(-lf), 0, deg(-ls));
    arms[1].elbow.rotation.set(0, 0, deg(-le));
    headPivot.rotation.z = deg(-hd);
    legs[0].rotation.z = deg(-ll);
    legs[1].rotation.z = deg(-rl);
    body.rotation.z = deg(-lean);
    // bước đi: vung chân + tay ngược chiều
    if (w) {
      legs[0].rotation.x = w * 0.5;
      legs[1].rotation.x = -w * 0.5;
      arms[0].shoulder.rotation.x += w * 0.35;
      arms[1].shoulder.rotation.x -= w * 0.35;
    } else {
      legs[0].rotation.x = legs[1].rotation.x = 0;
    }
  }

  function applyExpr(name, blink) {
    const e = EXPRS[name] || EXPRS.neutral;
    const open = e.eyes === "closed" ? 0.12 : e.eyes === "wide" ? 1.35 : 1;
    eyes.forEach((m) => {
      m.visible = e.eyes !== "happy";
      m.scale.set(open > 1 ? 1.2 : 1, Math.max(0.1, open * (1 - blink)), 1);
    });
    happyEyes.forEach((m) => (m.visible = e.eyes === "happy"));
    brows.forEach((b, i) => {
      const s = i === 0 ? -1 : 1;
      b.position.y = 0.13 + Math.max(0, e.brows) * 0.035;
      b.rotation.z = e.brows < 0 ? s * -0.35 * -e.brows : e.brows === 0.5 && i === 1 ? 0.25 : 0;
    });
    mouthArc.visible = e.mouth === "smile" || e.mouth === "frown" || e.mouth === "smirk";
    mouthArc.rotation.z = e.mouth === "frown" ? 0 : Math.PI;
    mouthArc.position.y = e.mouth === "frown" ? -0.15 : -0.08;
    mouthArc.scale.set(e.mouth === "smirk" ? 0.7 : 1, e.mouth === "smirk" ? 0.6 : 1, 1);
    mouthArc.position.x = e.mouth === "smirk" ? 0.03 : 0;
    mouthFlat.visible = e.mouth === "flat";
    mouthO.visible = e.mouth === "o";
    mouthOpen.visible = e.mouth === "open";
  }

  return {
    root,
    parts,
    // keys: [{ t, pose, expr?, emote?, walk?: [x0, x1, duration] }] sắp theo thời gian
    track(k) {
      keys = [...k].sort((a, b) => a.t - b.t);
    },
    update(t) {
      let i = 0;
      while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
      const cur = keys[i];
      const prev = keys[Math.max(0, i - 1)];
      const k = i === 0 ? 1 : ease.inOut(clamp((t - cur.t) / BLEND));
      const A = POSES3D[prev.pose] || POSES3D.idle;
      const B = POSES3D[cur.pose] || POSES3D.idle;
      const pose = B.map((b, j) => lerp(A[j], b, k));
      // cử chỉ nhỏ khi đang giảng giải + thở
      pose[0] += wave(t, 3.1) * 3;
      pose[2] -= wave(t, 3.7, 1) * 3;
      pose[4] += wave(t, 4.3) * 1.5;
      let w = 0;
      if (cur.walk && t < cur.t + cur.walk[2]) w = Math.sin((t - cur.t) * 9);
      applyPose(pose, w);
      body.position.y = wave(t, 3.2) * 0.012 + (w ? Math.abs(w) * 0.03 : 0);
      // chớp mắt khoảng 3,7s một lần, mỗi lần 0,14s
      const ph = (t + 0.9) % 3.7;
      const blink = ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
      applyExpr(cur.expr || DEFAULT_EXPR[cur.pose] || "neutral", blink);
      for (const [name, p] of Object.entries(emoteSprites)) {
        const on = cur.emote === name;
        p.visible = on;
        if (on) {
          const s = ease.back(clamp((t - cur.t - 0.2) / 0.4));
          p.scale.setScalar(Math.max(0.001, s));
          p.position.y = wave(t, 1.6) * 0.04;
        }
      }
    },
    // Kiểm tra rig trước khi render: đúng 1 đầu, 1 thân, 2 tay (2 khúc), 2 bàn tay, 2 chân, 2 bàn chân
    validateRig() {
      const want = { head: 1, torso: 1, arm: 2, forearm: 2, hand: 2, leg: 2, foot: 2 };
      const errs = Object.entries(want).filter(([k, n]) => parts[k].length !== n).map(([k, n]) => `${k}: ${parts[k].length}/${n}`);
      for (const [k, list] of Object.entries(parts)) for (const m of list) if (!m.parent) errs.push(`${k} bị tách khỏi khớp`);
      return errs;
    },
  };
}
