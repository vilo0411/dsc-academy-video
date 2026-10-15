// Bối cảnh "Thành phố doanh nghiệp giả định": các công trình trong lab/three/companies.js, mỗi toà có cột giá bên cạnh.
// move(key, k, size): cột giá giảm theo tiến độ k (0..1), size = mức giảm (0..1); màu chuyển dần từ mint sang đỏ.
import * as THREE from "three";
import { createCompany } from "../companies.js";
import { mat, C } from "../materials.js";
import { arrow, pop, at, shadow } from "../props.js";

// Bố cục mặc định: toà chính ở giữa hàng trước
export const CITY_LAYOUT = {
  toam: [0, 0],
  heodat: [8, -1],
  giotre: [-8, -1],
  loren: [-13, -9],
  cancau: [-5, -10],
  cabac: [3.5, -10],
  canhdieu: [12, -9],
  congxanh: [17, -2],
  giomay: [-17, -2],
};

export function createCity(layout = CITY_LAYOUT) {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 48), mat("#DDE5F3"));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  group.add(ground);
  // đường phố
  for (const [w, d, x, z] of [[40, 1.6, 0, 4], [40, 1.6, 0, -5], [1.6, 12, 4, -1], [1.6, 12, -4, -1]]) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat("#C3CCE0"));
    road.position.set(x, 0.04, z);
    road.receiveShadow = true;
    group.add(road);
  }
  const cos = {};
  for (const [key, [x, z]] of Object.entries(layout)) {
    const c = createCompany(key);
    c.group.position.set(x, 0, z);
    c.group.rotation.y = -Math.atan2(x, 30) * 0.6;
    group.add(c.group);
    // cột giá
    const barMat = new THREE.MeshStandardMaterial({ color: C.accent, flatShading: true, roughness: 0.5 });
    const bar = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1, 0.55), barMat);
    m.position.y = 0.5;
    m.castShadow = true;
    bar.add(m);
    bar.position.set(2.75, 0.16, 0.6);
    c.group.add(bar);
    const down = arrow(C.down, 0.9, 0.12);
    down.rotation.z = Math.PI;
    at(down, 2.75, 0, 0.6);
    c.group.add(down);
    pop(down, 0);
    const base = 2.6;
    bar.scale.y = base;
    cos[key] = {
      ...c,
      bar,
      move(k, size = 0.3) {
        bar.scale.y = base * (1 - size * k);
        barMat.color.set(C.accent).lerp(new THREE.Color(C.down), Math.min(1, k * (0.4 + size)));
        pop(down, k > 0.05 ? Math.min(1, k * 2) : 0, 0.6 + size * 1.2);
        down.position.y = base * (1 - size * k) + 1.5 + size;
      },
    };
  }
  shadow(group);
  return { group, cos };
}
