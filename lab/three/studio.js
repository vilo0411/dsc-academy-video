// "Phòng chụp" dùng lại cho các đoạn 3D đẹp: phông nền cong liền mạch, ánh sáng 3 điểm, phản chiếu môi trường,
// bóng mềm, hậu kỳ (bóng đổ vào khe GTAO, glow nhẹ) và khử răng cưa MSAA.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Phông nền cong: sàn phẳng uốn cong lên thành tường (không có đường gấp)
function cyclorama({ width = 60, depth = 24, radius = 7, height = 26, color = "#EDF1F9" } = {}) {
  const prof = [];
  for (let z = depth; z > 0; z -= 2) prof.push([0, z]);
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    prof.push([radius - Math.cos(a) * radius, -Math.sin(a) * radius]);
  }
  prof.push([height, -radius]);
  const cols = 2, rows = prof.length;
  const pos = [], idx = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) pos.push((c - 0.5) * width, prof[r][0], prof[r][1]);
  for (let r = 0; r < rows - 1; r++) {
    const a = r * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }));
  m.receiveShadow = true;
  return m;
}

export function setupStudio({ scene, renderer, camera, width, height }, { backdrop = "#EDF1F9", bg = "#F6F8FD", keyPos = [5, 9, 7] } = {}) {
  renderer.toneMapping = THREE.NeutralToneMapping; // giữ đúng màu thương hiệu
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.background = new THREE.Color(bg);
  scene.fog = null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const cyc = cyclorama({ color: backdrop });
  cyc.position.z = -3;
  scene.add(cyc);

  // đèn chính (ấm, có bóng mềm) + đèn phụ (lạnh) + đèn viền phía sau
  const key = new THREE.DirectionalLight("#FFF4E6", 2.4);
  key.position.set(...keyPos);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -4, near: 1, far: 30 });
  key.shadow.radius = 10;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0006;
  const fill = new THREE.DirectionalLight("#DDE8FF", 0.7);
  fill.position.set(-7, 4, 5);
  const rim = new THREE.DirectionalLight("#FFFFFF", 1.4);
  rim.position.set(-2, 6, -8);
  scene.add(key, key.target, fill, rim);

  const rt = new THREE.WebGLRenderTarget(width, height, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, width, height);
  ao.blendIntensity = 0.9;
  ao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1, scale: 1.1, samples: 16 });
  composer.addPass(ao);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.18, 0.5, 0.92));
  composer.addPass(new OutputPass());
  return { key, fill, rim, composer, render: () => composer.render() };
}

// Trụ tròn bo cạnh (bệ, núm, đế) bằng LatheGeometry
export function roundedCyl(r, h, bevel, mat, seg = 64) {
  const p = [new THREE.Vector2(0, 0), new THREE.Vector2(r - bevel, 0)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    p.push(new THREE.Vector2(r - bevel + Math.cos(a) * bevel, bevel + Math.sin(a) * bevel));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    p.push(new THREE.Vector2(r - bevel + Math.cos(a) * bevel, h - bevel + Math.sin(a) * bevel));
  }
  p.push(new THREE.Vector2(0, h));
  const m = new THREE.Mesh(new THREE.LatheGeometry(p, seg), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Đồng xu có gờ viền và mặt lõm (bán kính 0,5)
export const coinGeo = (() => {
  const pts = [[0, -0.058], [0.47, -0.058], [0.5, -0.03], [0.5, 0.03], [0.47, 0.058], [0.41, 0.058], [0.39, 0.04], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 56).scale(1, 0.82, 1);
})();
