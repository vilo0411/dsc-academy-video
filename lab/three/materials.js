// Bảng vật liệu dùng chung theo màu thương hiệu DSC (scripts/lib/brand.mjs). Tạo một lần, dùng lại cho mọi vật thể.
import * as THREE from "three";
import { BRAND } from "../lib/brand.mjs";

const cache = new Map();

// Vật liệu low-poly: phẳng mặt (flatShading), hơi nhám
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02, flatShading: true, ...opts }));
  }
  return cache.get(key);
}

export const C = {
  ...BRAND,
  skin: "#F2C9A5",
  hair: "#1D2340",
  suit: "#1B2A5C",
  shirt: "#FFFFFF",
  shoe: "#141A33",
  ground: "#E7ECF7",
  water: "#4FC3F7",
  sky: "#EAF0FA",
};

export const M = {
  ink: () => mat(C.ink),
  accent: () => mat(C.accent, { emissive: C.accent, emissiveIntensity: 0.15 }),
  accentDark: () => mat(C.accentDark),
  paper: () => mat(C.paper),
  warn: () => mat(C.warn),
  down: () => mat(C.down),
  muted: () => mat(C.muted),
  line: () => mat(C.line),
  ground: () => mat(C.ground, { roughness: 0.95 }),
  white: () => mat("#FFFFFF"),
  water: () => mat(C.water, { transparent: true, opacity: 0.85, roughness: 0.2 }),
  glow: (color) => mat(color, { emissive: color, emissiveIntensity: 0.9 }),
};
