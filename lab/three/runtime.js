// Khung chạy chung của video 3D.
// - Chế độ render (?render=1): không tự chạy; scripts/render3d.mjs gọi window.renderFrame(t) cho từng khung rồi chụp.
// - Chế độ xem trước: tự phát theo thời gian thực kèm giọng đọc, có thanh tua (phím cách = dừng/phát).
import * as THREE from "three";
import { C } from "./materials.js";

// lights: false → cảnh tự dựng ánh sáng (vd. phòng chụp). setup trả về update(t), hoặc { update, render } nếu tự render (hậu kỳ).
export async function boot({ width = 1920, height = 1080, duration, audio = null, lights = true, setup }) {
  const params = new URLSearchParams(location.search);
  const renderMode = params.has("render");
  const stage = document.getElementById("stage");
  stage.style.width = width + "px";
  stage.style.height = height + "px";

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = params.get("shadows") !== "0";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  if (lights) scene.fog = new THREE.Fog(C.sky, 40, 110);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 400);

  // Ánh sáng mặc định: trời + mặt trời có bóng + đèn viền
  if (lights) scene.add(new THREE.HemisphereLight("#FFFFFF", "#B8C3DE", 1.4));
  const sun = new THREE.DirectionalLight("#FFF6E8", 2.2);
  sun.position.set(12, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  const rim = new THREE.DirectionalLight("#CFE9FF", 0.8);
  rim.position.set(-14, 10, -12);
  if (lights) scene.add(sun, sun.target, rim);

  await document.fonts.ready;
  const ctx = { THREE, scene, camera, renderer, sun, width, height, duration, overlay: document.getElementById("overlay") };
  const res = await setup(ctx);
  const update = typeof res === "function" ? res : res.update;
  const draw = typeof res === "function" ? () => renderer.render(scene, camera) : res.render;

  const frame = (t) => {
    update(t);
    draw(t);
  };
  window.__duration = duration;
  window.renderFrame = (t) => {
    frame(t);
    // chờ trình duyệt vẽ xong lớp chữ HTML trước khi chụp
    return new Promise((r) => requestAnimationFrame(() => r(true)));
  };
  frame(0);
  window.__ready = true;
  if (renderMode) return;
  previewControls({ duration, audio, frame, stage });
}

function previewControls({ duration, audio, frame, stage }) {
  const bar = document.createElement("div");
  bar.id = "controls";
  bar.innerHTML = `<button id="pp">▶</button><input id="seek" type="range" min="0" max="${duration}" step="0.01" value="0"><span id="tc">0.0s</span>`;
  document.body.appendChild(bar);
  const au = audio ? Object.assign(new Audio(audio), { preload: "auto" }) : null;
  let playing = false, t0 = 0, start = 0, t = 0;
  const seek = bar.querySelector("#seek"), tc = bar.querySelector("#tc"), pp = bar.querySelector("#pp");
  const show = () => {
    frame(t);
    seek.value = t;
    tc.textContent = t.toFixed(1) + "s";
  };
  const toggle = () => {
    playing = !playing;
    pp.textContent = playing ? "❚❚" : "▶";
    if (playing) {
      t0 = t;
      start = performance.now();
      if (au) { au.currentTime = t; au.play(); }
    } else au?.pause();
  };
  pp.onclick = toggle;
  addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); toggle(); } });
  seek.oninput = () => {
    t = Number(seek.value);
    t0 = t;
    start = performance.now();
    if (au) au.currentTime = t;
    show();
  };
  // thu nhỏ khung 1920×1080 cho vừa cửa sổ
  const fit = () => {
    const s = Math.min(innerWidth / stage.offsetWidth, (innerHeight - 48) / stage.offsetHeight);
    stage.style.transform = `scale(${s})`;
  };
  addEventListener("resize", fit);
  fit();
  const loop = () => {
    if (playing) {
      t = Math.min(duration, t0 + (performance.now() - start) / 1000);
      if (t >= duration) toggle();
      show();
    }
    requestAnimationFrame(loop);
  };
  loop();
}
