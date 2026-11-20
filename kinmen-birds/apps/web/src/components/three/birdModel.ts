import * as THREE from "three";

interface Style {
  body: number;
  head: number;
  wing: number;
  beak: number;
  leg: number;
  legLen: number;
  beakLen: number;
  tailLen: number;
  neck: number;
  flatBeak?: boolean;
  crest?: number;
  ring?: number;
}

const STYLES: Record<string, Style> = {
  "great-cormorant": { body: 0x1b1f24, head: 0x1b1f24, wing: 0x2c343b, beak: 0xb8a27a, leg: 0x222222, legLen: 0.08, beakLen: 0.28, tailLen: 0.35, neck: 0.08 },
  "blue-tailed-bee-eater": { body: 0x2fa88a, head: 0xb5532a, wing: 0x2f6fd0, beak: 0x111111, leg: 0x333333, legLen: 0.05, beakLen: 0.3, tailLen: 0.5, neck: 0 },
  "eurasian-hoopoe": { body: 0xd9a066, head: 0xd9a066, wing: 0x1f1f1f, beak: 0x2a2a2a, leg: 0x555555, legLen: 0.1, beakLen: 0.4, tailLen: 0.3, neck: 0, crest: 0xc8793a },
  "black-faced-spoonbill": { body: 0xf4f4ee, head: 0x222222, wing: 0xe8e8e0, beak: 0x2b2b2b, leg: 0x1a1a1a, legLen: 0.45, beakLen: 0.35, tailLen: 0.25, neck: 0.15, flatBeak: true },
  "common-pheasant": { body: 0x9c5a2a, head: 0x1f6f5c, wing: 0x7a4720, beak: 0xcfc29a, leg: 0x6b5a45, legLen: 0.1, beakLen: 0.14, tailLen: 0.75, neck: 0.03, ring: 0xffffff },
};

const FALLBACK: Style = { body: 0x888888, head: 0x777777, wing: 0x666666, beak: 0x333333, leg: 0x333333, legLen: 0.1, beakLen: 0.2, tailLen: 0.3, neck: 0 };

const mat = (color: number) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });

/**
 * 座標約定：+x = 鳥頭朝向、+y = 左側、+z = 向上。整體長度約 1 單位。
 * 根節點 userData.modelScale 由資料庫 birds.model_scale 提供。
 */
export function buildBirdModel(slug: string, modelScale: number): THREE.Group {
  const s = STYLES[slug] ?? FALLBACK;
  const root = new THREE.Group();
  root.userData.modelScale = modelScale;

  const h = s.legLen;
  const add = (
    geo: THREE.BufferGeometry,
    color: number,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    scale?: [number, number, number]
  ) => {
    const mesh = new THREE.Mesh(geo, mat(color));
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    if (scale) mesh.scale.set(...scale);
    root.add(mesh);
  };

  const headZ = h + 0.6 + s.neck;

  // 身體、頭、頸
  add(new THREE.SphereGeometry(0.3, 14, 10), s.body, [0, 0, h + 0.3], [0, 0, 0], [1.35, 0.85, 0.85]);
  add(new THREE.SphereGeometry(0.16, 12, 10), s.head, [0.42, 0, headZ]);
  if (s.neck > 0) {
    add(new THREE.CylinderGeometry(0.07, 0.09, 0.3 + s.neck, 8), s.body, [0.34, 0, h + 0.55 + s.neck / 2], [Math.PI / 2, 0, 0]);
  }

  // 嘴
  const beakX = 0.42 + 0.12 + s.beakLen / 2;
  if (s.flatBeak) {
    add(new THREE.BoxGeometry(s.beakLen, 0.1, 0.02), s.beak, [beakX, 0, headZ - 0.02]);
  } else {
    add(new THREE.ConeGeometry(0.045, s.beakLen, 8), s.beak, [beakX, 0, headZ - 0.02], [0, 0, -Math.PI / 2]);
  }

  // 尾、翅
  add(new THREE.BoxGeometry(s.tailLen, 0.14, 0.03), s.wing, [-0.45 - s.tailLen / 2 + 0.1, 0, h + 0.34], [0, 0.2, 0]);
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.5, 0.34, 0.03), s.wing, [0, side * 0.27, h + 0.38], [side * 0.35, 0, 0]);
  }

  // 腿
  if (h > 0.02) {
    for (const side of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.014, 0.014, h + 0.1, 6), s.leg, [0.02, side * 0.1, (h + 0.1) / 2], [Math.PI / 2, 0, 0]);
    }
  }

  // 特徵：冠羽、頸環
  if (s.crest) add(new THREE.ConeGeometry(0.06, 0.3, 6), s.crest, [0.36, 0, headZ + 0.2], [Math.PI / 2, 0.5, 0]);
  if (s.ring) add(new THREE.TorusGeometry(0.11, 0.025, 8, 16), s.ring, [0.3, 0, h + 0.52 + s.neck / 2], [0, Math.PI / 2.4, 0]);

  return root;
}

export function disposeModel(group: THREE.Group) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}