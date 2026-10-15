// Đạo cụ dùng lại giữa các tập: biển chữ, mũi tên, đồng xu, ống dẫn + dòng chảy, đồng hồ đo, cột, pháo giấy, heo đất.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, M, C } from "./materials.js";
import { textPlate } from "./labels.js";
import { clamp, ease, rng } from "./core.js";

export const at = (o, x = 0, y = 0, z = 0) => (o.position.set(x, y, z), o);
export const rbox = (w, h, d, m, r = 0.08) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), m);
// Bật bóng cho mọi khối (trừ biển chữ MeshBasicMaterial — biển chữ không đổ bóng)
export const shadow = (g) => (g.traverse((o) => o.isMesh && !o.material.isMeshBasicMaterial && ((o.castShadow = true), (o.receiveShadow = true))), g);

// Biển chữ luôn quay mặt về camera: đăng ký vào danh sách, gọi faceCamera(camera) mỗi khung
const billboards = [];
export function sign(text, opts = {}) {
  const p = textPlate(text, opts);
  if (opts.billboard !== false) billboards.push(p);
  return p;
}
export function faceCamera(camera) {
  for (const b of billboards) {
    if (!b.visible) continue;
    b.quaternion.copy(camera.quaternion);
    if (b.parent) b.quaternion.premultiply(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  }
}

// Hiện/ẩn có nảy: k = 0..1
export function pop(o, k, base = 1) {
  const s = k <= 0 ? 0 : k >= 1 ? 1 : ease.back(k);
  o.visible = s > 0.001;
  o.scale.setScalar(Math.max(0.001, s * base));
}

// Mũi tên hướng lên +y (xoay group để đổi hướng)
export function arrow(color = C.accent, len = 1.4, r = 0.14) {
  const g = new THREE.Group();
  const m = mat(color);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
  shaft.position.y = len / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.4, r * 3.5, 8), m);
  head.position.y = len + r * 1.6;
  g.add(shaft, head);
  return shadow(g);
}

const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 14);
export function coin() {
  const m = new THREE.Mesh(coinGeo, mat("#F5B83D", { metalness: 0.4, roughness: 0.35, emissive: "#6B4500", emissiveIntensity: 0.15 }));
  m.castShadow = true;
  return m;
}

// Ống dẫn theo các điểm; trả { mesh, curve }
export function pipe(points, { r = 0.32, color = C.line } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.1);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 24), r, 10, false), mat(color, { transparent: true, opacity: 0.55, roughness: 0.3 }));
  mesh.receiveShadow = true;
  return { mesh, curve };
}

// Dòng chảy: các hạt chạy dọc đường cong. update(t, { speed, front, color }) — front (0..1) = đầu dòng đã chảy tới đâu
export function flow(curve, { n = 40, size = 0.16, color = C.water } = {}) {
  const m = mat(color, { emissive: color, emissiveIntensity: 0.35 });
  const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(size, 0), m, n);
  const d = new THREE.Object3D();
  return {
    mesh: inst,
    material: m,
    update(t, { speed = 0.12, front = 1, dir = 1 } = {}) {
      let c = 0;
      for (let i = 0; i < n; i++) {
        let u = (((i / n + dir * t * speed) % 1) + 1) % 1;
        if (u > front) continue;
        d.position.copy(curve.getPointAt(u));
        d.scale.setScalar(1);
        d.updateMatrix();
        inst.setMatrixAt(c++, d.matrix);
      }
      inst.count = c;
      inst.instanceMatrix.needsUpdate = true;
    },
  };
}

// Đồng hồ đo có kim. set(k): 0..1
export function gauge(label, { color = C.accentDark, size = 1 } = {}) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * size, 0.7 * size, 0.12, 24), M.white());
  face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7 * size, 0.07 * size, 6, 24), M.ink());
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.52 * size, 0.05 * size, 4, 20, Math.PI), mat(color));
  arc.position.z = 0.07;
  const needle = new THREE.Group();
  const n = new THREE.Mesh(new THREE.BoxGeometry(0.05 * size, 0.55 * size, 0.04), M.down());
  n.position.y = 0.26 * size;
  needle.add(n);
  needle.position.z = 0.1;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * size, 0.08 * size, 0.08, 10), M.ink());
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.12;
  g.add(face, rim, arc, needle, hub);
  const plate = sign(label, { width: 1.8 * size, size: 64, billboard: false });
  plate.position.set(0, -1.1 * size, 0.14); // nhô ra trước cột đỡ để không bị cột xuyên qua chữ
  g.add(plate);
  shadow(g);
  return { group: g, set: (k) => (needle.rotation.z = Math.PI / 2 - clamp(k) * Math.PI) };
}

// Cột có thể co giãn theo chiều cao (gốc ở đáy)
export function column(w, d, color) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), mat(color));
  m.position.y = 0.5;
  m.castShadow = true;
  g.add(m);
  return { group: g, mesh: m, set: (h) => (g.scale.y = Math.max(0.001, h)) };
}

// Pháo giấy tất định: vị trí = p0 + v·t + ½g·t²
export function confetti(n = 80, seed = 7) {
  const r = rng(seed);
  const colors = [C.accent, C.warn, "#FF8FA3", "#7FB8FF", "#FFFFFF"];
  const parts = Array.from({ length: n }, () => ({ v: [(r() - 0.5) * 6, 5 + r() * 5, (r() - 0.5) * 3], s: [r() * 6, r() * 6], c: colors[Math.floor(r() * colors.length)] }));
  const g = new THREE.Group();
  const meshes = parts.map((p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.24), mat(p.c, { side: THREE.DoubleSide }));
    g.add(m);
    return m;
  });
  return {
    group: g,
    update(lt) {
      g.visible = lt > 0 && lt < 4;
      if (!g.visible) return;
      parts.forEach((p, i) => {
        const m = meshes[i];
        const tt = lt;
        m.position.set(p.v[0] * tt, p.v[1] * tt - 4.9 * tt * tt * 0.55, p.v[2] * tt);
        m.rotation.set(p.s[0] * tt, p.s[1] * tt, 0);
      });
    },
  };
}

// Heo đất chung (két tiết kiệm)
export function piggy(color = "#FFC9D6", s = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat(color));
  body.scale.set(1.25, 0.95, 0.95);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 10), mat("#F7A8BB"));
  snout.rotation.z = Math.PI / 2;
  g.add(body, at(snout, 0.72, 0, 0));
  for (const [x, z] of [[-0.35, -0.3], [-0.35, 0.3], [0.35, -0.3], [0.35, 0.3]]) g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 6), mat(color)), x, -0.52, z));
  for (const z of [-0.22, 0.22]) g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), mat(color)), 0.35, 0.5, z));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.07), M.ink()), 0, 0.53, 0));
  for (const z of [-0.2, 0.2]) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), M.ink()), 0.55, 0.22, z));
  g.scale.setScalar(s);
  return shadow(g);
}

// Nhà máy chung (không phải doanh nghiệp cụ thể)
export function factory(color = C.line) {
  const g = new THREE.Group();
  g.add(at(rbox(2.2, 1.3, 1.6, mat(color)), 0, 0.65, 0));
  for (let i = 0; i < 3; i++) {
    const tooth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 3, 1), M.muted());
    tooth.rotation.set(Math.PI / 2, 0, 0);
    g.add(at(tooth, -0.72 + i * 0.72, 1.48, 0));
  }
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 8), M.ink()), 0.8, 1.9, -0.4));
  return shadow(g);
}
