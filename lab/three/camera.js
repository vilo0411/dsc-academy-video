// Đường máy quay theo khoá thời gian tuyệt đối.
// key = { t, p: [x,y,z] vị trí, l: [x,y,z] điểm nhìn, cut?: true (cắt cảnh: nhảy thẳng tới khoá này), fov? }
// Giữa hai khoá liền nhau: nội suy mượt (ease in-out). Trước một khoá "cut": đứng yên ở khoá trước.
import * as THREE from "three";
import { ease, clamp, lerp, wave } from "./core.js";

export function cameraPath(keys) {
  // Khoá được viết theo thứ tự thời gian. Khoá cuối của cảnh trước (vd. "giây 6,8" của cảnh dài 6,78s) có thể lỡ vượt qua
  // lệnh cắt của cảnh sau → kéo mọi khoá đứng trước một khoá về trước nó, để lệnh cắt luôn có hiệu lực đúng lúc.
  keys = keys.map((k) => ({ ...k }));
  for (let i = keys.length - 1; i > 0; i--) if (keys[i - 1].t >= keys[i].t) keys[i - 1].t = keys[i].t - 0.02;
  keys.sort((a, b) => a.t - b.t);
  const P = new THREE.Vector3(), L = new THREE.Vector3();
  const v = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  return (camera, t) => {
    let i = 0;
    while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
    const a = keys[i], b = keys[i + 1];
    let p = a.p, l = a.l, fov = a.fov || 38;
    if (b && !b.cut) {
      const k = (b.ease || ease.inOut)(clamp((t - a.t) / (b.t - a.t)));
      p = v(a.p, b.p, k);
      l = v(a.l, b.l, k);
      fov = lerp(a.fov || 38, b.fov || 38, k);
    }
    // trôi nhẹ để khung hình không bao giờ đứng im hoàn toàn
    P.set(p[0] + wave(t, 9) * 0.08, p[1] + wave(t, 11, 2) * 0.05, p[2]);
    L.set(...l);
    camera.position.copy(P);
    camera.lookAt(L);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    return L;
  };
}
