// Bối cảnh "Đài điều khiển vĩ mô": 5 ô theo DASHBOARD (scripts/lib/series.mjs), mỗi chỉ số là một bóng đèn.
// Dùng lại cho mọi tập: lit(name, k) bật đèn, glow(groupKey, k) làm sáng viền ô (nhấp nháy = truyền k dao động).
import * as THREE from "three";
import { DASHBOARD } from "../../lib/series.mjs";
import { mat, M, C } from "../materials.js";
import { sign, rbox, at, shadow } from "../props.js";

export const PANEL_GAP = 3.6;

export function createControl() {
  const group = new THREE.Group();
  const lamps = {}, panels = {};
  // sàn sân khấu
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(13, 13.4, 0.2, 40), mat("#DCE3F2"));
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  group.add(floor);

  DASHBOARD.forEach((g, i) => {
    const x = (i - 2) * PANEL_GAP;
    const panel = new THREE.Group();
    panel.position.set(x, 0.2, 0);
    group.add(panel);
    // chân bàn + mặt bàn nghiêng về phía người xem
    panel.add(at(rbox(3.2, 1.3, 1.2, M.ink()), 0, 0.65, 0));
    const face = new THREE.Group();
    face.position.set(0, 1.9, 0.1);
    face.rotation.x = -0.42;
    panel.add(face);
    const frameMat = new THREE.MeshStandardMaterial({ color: C.ink, emissive: C.accent, emissiveIntensity: 0, flatShading: true, roughness: 0.6 });
    face.add(at(rbox(3.3, 2.5, 0.16, frameMat), 0, 0, -0.02));
    face.add(at(rbox(3.0, 2.2, 0.06, M.paper()), 0, 0, 0.07));
    const head = sign(g.name, { width: 2.0, size: 80, billboard: false, bg: null, border: null });
    face.add(at(head, 0, 0.82, 0.12));
    g.items.forEach((name, j) => {
      const col = j % 2, row = Math.floor(j / 2);
      const n = g.items.length;
      const lx = n === 1 ? 0 : (col - 0.5) * 1.45;
      const ly = 0.2 - row * 0.85;
      const lm = new THREE.MeshStandardMaterial({ color: "#B9C2D8", emissive: C.accent, emissiveIntensity: 0, flatShading: true, roughness: 0.4 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lm);
      bulb.rotation.x = Math.PI / 2;
      face.add(at(bulb, lx - 0.48, ly, 0.1));
      const label = sign(name, { width: name.length > 8 ? 0.95 : 0.7, size: 64, billboard: false, bg: null, border: null, weight: 600 });
      face.add(at(label, lx + 0.12, ly, 0.12));
      lamps[name] = { set: (k) => { lm.emissiveIntensity = k * 1.4; lm.color.set(k > 0.5 ? C.accent : "#B9C2D8"); } };
    });
    panels[g.key] = { group: panel, face, set: (k) => (frameMat.emissiveIntensity = k * 1.2) };
  });
  shadow(group);
  return {
    group,
    lamps,
    panels,
    lit(name, k = 1) {
      lamps[name]?.set(k);
    },
    glow(key, k) {
      panels[key]?.set(k);
    },
    // điểm nhìn của từng ô (toạ độ cục bộ) cho máy quay
    panelPos: (key) => [(DASHBOARD.findIndex((g) => g.key === key) - 2) * PANEL_GAP, 2.1, 0],
  };
}
