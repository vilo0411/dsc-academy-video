// Công trình 3D cho dàn doanh nghiệp giả định (tên, màu lấy từ scripts/lib/series.mjs).
// Mỗi công trình có biển tên và nhãn "giả định" — bắt buộc theo quy tắc nội dung (CLAUDE.md mục 2).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { COMPANIES } from "../lib/series.mjs";
import { mat, M, C } from "./materials.js";
import { sign } from "./props.js";

const box = (w, h, d, m, r = 0.06) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), m);
const at = (o, x, y, z) => (o.position.set(x, y, z), o);

// Dãy cửa sổ trên một mặt tường
function windows(g, { w, h, z, rows, cols, y0 = 0.5, color = "#BFE6FF" }) {
  const geo = new THREE.BoxGeometry(0.28, 0.32, 0.04);
  const m = mat(color, { emissive: color, emissiveIntensity: 0.12 });
  const inst = new THREE.InstancedMesh(geo, m, rows * cols);
  const d = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      d.position.set(-w / 2 + (w / (cols + 1)) * (c + 1), y0 + ((h - y0 - 0.3) / Math.max(1, rows - 1 || 1)) * r, z);
      d.updateMatrix();
      inst.setMatrixAt(i++, d.matrix);
    }
  g.add(inst);
}

const BUILDERS = {
  // Siêu thị: khối thấp, mái hiên sọc
  basket(g, fill) {
    g.add(at(box(3.2, 1.6, 2.2, M.paper()), 0, 0.8, 0));
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.7), mat(i % 2 ? fill : "#FFFFFF"));
      at(s, -1.4 + i * 0.4, 1.35, 1.35);
      s.rotation.x = 0.35;
      g.add(s);
    }
    g.add(at(box(1.1, 0.9, 0.06, mat("#BFE6FF")), 0, 0.5, 1.11));
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.45, 8, 1, true), mat(fill, { side: THREE.DoubleSide }));
    g.add(at(basket, 0, 2.0, 0));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 5, 12, Math.PI), M.ink());
    g.add(at(handle, 0, 2.2, 0));
    return 2.7;
  },
  // Ngân hàng: cột + mái tam giác + heo đất trên nóc
  piggy(g, fill) {
    g.add(at(box(3, 0.25, 2.2, M.paper()), 0, 0.12, 0));
    g.add(at(box(2.6, 1.7, 1.6, M.paper()), 0, 1.1, -0.2));
    for (let i = 0; i < 4; i++) g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.7, 8), M.white()), -1.05 + i * 0.7, 1.1, 0.75));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.7, 0.7, 3, 1), mat(fill));
    roof.scale.set(1, 1, 0.75);
    roof.rotation.y = Math.PI / 6;
    g.add(at(box(3, 0.18, 2.1, M.paper()), 0, 2.03, 0));
    const pig = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat(fill));
    torso.scale.set(1.2, 0.9, 0.9);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), mat("#F7A8BB"));
    snout.rotation.z = Math.PI / 2;
    pig.add(torso, at(snout, 0.68, 0, 0));
    for (const [x, z] of [[-0.35, -0.3], [-0.35, 0.3], [0.35, -0.3], [0.35, 0.3]]) pig.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 6), mat(fill)), x, -0.5, z));
    pig.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.06), M.ink()), 0, 0.5, 0));
    pig.rotation.y = -0.5;
    g.add(at(pig, 0, 2.75, 0));
    return 3.4;
  },
  // Bất động sản: toà căn hộ + nhà mái dốc
  house(g, fill) {
    g.add(at(box(1.6, 3.4, 1.6, mat(fill)), -0.6, 1.7, -0.3));
    windows(g, { w: 1.2, h: 3.4, z: 0.51, rows: 5, cols: 3, y0: 0.5 });
    g.children.at(-1).position.x = -0.6;
    g.add(at(box(1.6, 1.1, 1.4, M.paper()), 0.9, 0.55, 0.3));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 4), M.down());
    roof.rotation.y = Math.PI / 4;
    g.add(at(roof, 0.9, 1.5, 0.3));
    g.add(at(box(0.36, 0.6, 0.05, mat("#8A5A3C")), 0.9, 0.3, 1.01));
    return 3.9;
  },
  // Thép: nhà xưởng + ống khói + đe
  anvil(g, fill) {
    g.add(at(box(3, 1.5, 2, mat(fill)), 0, 0.75, 0));
    for (let i = 0; i < 3; i++) {
      const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.6, 0.6, 3), M.muted());
      saw.rotation.set(0, 0, Math.PI / 2);
      saw.scale.set(1, 1, 1.6);
      g.add(at(saw, -1 + i * 1, 1.8, 0));
    }
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.2, 8), M.ink()), 1.15, 2.1, -0.6));
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 8), M.down()), 1.15, 3.1, -0.6));
    return 3.3;
  },
  // Xây dựng: khung nhà dở dang + cần cẩu
  crane(g, fill) {
    for (const [x, z] of [[-1, -0.6], [-1, 0.6], [0.2, -0.6], [0.2, 0.6]]) g.add(at(box(0.15, 2, 0.15, M.line()), x, 1, z));
    g.add(at(box(1.5, 0.12, 1.5, M.line()), -0.4, 1, 0));
    g.add(at(box(1.5, 0.12, 1.5, M.line()), -0.4, 2, 0));
    g.add(at(box(0.22, 4, 0.22, mat(fill)), 1.2, 2, 0));
    g.add(at(box(3, 0.18, 0.18, mat(fill)), 0.7, 3.9, 0));
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), M.ink()), -0.4, 3.3, 0));
    g.add(at(box(0.5, 0.3, 0.3, M.warn()), -0.4, 2.6, 0));
    return 4.4;
  },
  // Thuỷ sản: kho lạnh + mặt nước + cá
  fish(g, fill) {
    g.add(at(box(2.6, 1.4, 1.8, M.paper()), 0, 0.7, -0.2));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.6, 8, 1, false, 0, Math.PI), mat(fill));
    roof.rotation.z = Math.PI / 2;
    g.add(at(roof, 0, 1.4, -0.2));
    const fish = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), mat(fill));
    fish.scale.set(1.5, 0.8, 0.4);
    g.add(at(fish, 0, 2.6, 0));
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 3), mat(fill));
    tail.rotation.z = Math.PI / 2;
    g.add(at(tail, 0.75, 2.6, 0));
    return 3.2;
  },
  // Hàng không: nhà ga + máy bay giấy
  kite(g, fill) {
    const hangar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.6, 10, 1, false, 0, Math.PI), M.paper());
    hangar.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    hangar.rotation.set(0, 0, Math.PI / 2);
    hangar.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    g.add(at(hangar, 0, 0, 0));
    const plane = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 4), mat(fill));
    plane.rotation.set(0, 0, -Math.PI / 2);
    plane.scale.set(1, 1, 0.25);
    g.add(at(plane, 0, 2, 0));
    return 2.8;
  },
  // Khu công nghiệp: cổng + nhà xưởng xanh
  gate(g, fill) {
    g.add(at(box(0.3, 2, 0.3, mat(fill)), -1.2, 1, 0.8));
    g.add(at(box(0.3, 2, 0.3, mat(fill)), 1.2, 1, 0.8));
    g.add(at(box(2.8, 0.35, 0.35, mat(fill)), 0, 2.1, 0.8));
    g.add(at(box(2.6, 1.2, 1.4, M.paper()), 0, 0.6, -0.6));
    return 2.6;
  },
};

// Tạo công trình của doanh nghiệp `key`. Trả { group, height, plate } — plate là biển tên (có thể ẩn/hiện).
export function createCompany(key, { label = true } = {}) {
  const c = COMPANIES[key];
  if (!c) throw new Error(`Không có doanh nghiệp "${key}" trong scripts/lib/series.mjs`);
  const group = new THREE.Group();
  group.name = c.name;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.16, 8), mat(C.line));
  base.position.y = 0.08;
  base.receiveShadow = true;
  const body = new THREE.Group();
  body.position.y = 0.16;
  group.add(base, body);
  const height = BUILDERS[c.icon](body, c.fill) + 0.16;
  body.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
  let plate = null;
  if (label) {
    plate = sign(c.name, { width: 2.4, size: 84, sub: "doanh nghiệp giả định" });
    plate.position.set(0, height + 0.45 + plate.userData.height / 2, 0);
    group.add(plate);
  }
  return { group, height, plate, name: c.name };
}
