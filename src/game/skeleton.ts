import * as THREE from "three";
import type { ArmorId, WeaponId } from "./types";

export type SharedGeos = {
  cyl: THREE.CylinderGeometry;
  sph: THREE.SphereGeometry;
  box: THREE.BoxGeometry;
  torus: THREE.TorusGeometry;
};

export function createGeos(): SharedGeos {
  return {
    cyl: new THREE.CylinderGeometry(1, 1, 1, 8, 1),
    sph: new THREE.SphereGeometry(1, 12, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    torus: new THREE.TorusGeometry(1, 0.12, 6, 14),
  };
}

export type Mats = {
  bone: THREE.MeshStandardMaterial;
  boneDark: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  socket: THREE.MeshStandardMaterial;
};

export function createMats(
  boneMap: THREE.Texture,
  bump: THREE.Texture,
  clothMap: THREE.Texture,
  rustMap: THREE.Texture,
  soul: string,
): Mats {
  const bone = new THREE.MeshStandardMaterial({
    map: boneMap,
    bumpMap: bump,
    bumpScale: 0.35,
    color: 0xe4d6c0,
    roughness: 0.62,
    metalness: 0.04,
  });
  const boneDark = new THREE.MeshStandardMaterial({
    map: boneMap,
    color: 0x8a7864,
    roughness: 0.78,
    metalness: 0.02,
  });
  const cloth = new THREE.MeshStandardMaterial({
    map: clothMap,
    color: 0x2a2420,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const metal = new THREE.MeshStandardMaterial({
    map: rustMap,
    color: 0x9a9aa4,
    roughness: 0.38,
    metalness: 0.72,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: soul,
    emissive: soul,
    emissiveIntensity: 2.4,
    roughness: 0.3,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
  });
  const socket = new THREE.MeshStandardMaterial({
    color: 0x070605,
    roughness: 0.9,
    metalness: 0,
  });
  return { bone, boneDark, cloth, metal, glow, socket };
}

export type Rig = {
  root: THREE.Group;
  hips: THREE.Object3D;
  spine0: THREE.Object3D;
  spine1: THREE.Object3D;
  chest: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  jaw: THREE.Object3D;
  lShoulder: THREE.Object3D;
  lUpper: THREE.Object3D;
  lFore: THREE.Object3D;
  lHand: THREE.Object3D;
  rShoulder: THREE.Object3D;
  rUpper: THREE.Object3D;
  rFore: THREE.Object3D;
  rHand: THREE.Object3D;
  lUpLeg: THREE.Object3D;
  lLoLeg: THREE.Object3D;
  lFoot: THREE.Object3D;
  rUpLeg: THREE.Object3D;
  rLoLeg: THREE.Object3D;
  rFoot: THREE.Object3D;
  weapon: THREE.Object3D;
  eyeLights: THREE.PointLight[];
  soulOrbs: THREE.Object3D[];
  height: number;
};

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  parent: THREE.Object3D,
  pos: [number, number, number],
  scale: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function joint(parent: THREE.Object3D, x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function longBone(
  parent: THREE.Object3D,
  geos: SharedGeos,
  mat: THREE.Material,
  length: number,
  rTop: number,
  rMid: number,
  rBot: number,
) {
  mesh(geos.sph, mat, parent, [0, 0, 0], [rTop * 1.35, rTop * 1.2, rTop * 1.35]);
  mesh(geos.cyl, mat, parent, [0, length * 0.5, 0], [rMid, length, rMid]);
  mesh(geos.sph, mat, parent, [0, length, 0], [rBot * 1.3, rBot * 1.15, rBot * 1.3]);
}

function vertebra(parent: THREE.Object3D, geos: SharedGeos, mats: Mats, y: number, s: number) {
  mesh(geos.cyl, mats.bone, parent, [0, y, 0], [0.028 * s, 0.028, 0.028 * s]);
  mesh(geos.box, mats.boneDark, parent, [0, y, -0.032 * s], [0.034 * s, 0.02, 0.02]);
}

function makeSkull(head: THREE.Object3D, geos: SharedGeos, mats: Mats, soul: string, withLights: boolean) {
  const pts = [
    new THREE.Vector2(0.01, 0.16),
    new THREE.Vector2(0.07, 0.155),
    new THREE.Vector2(0.11, 0.12),
    new THREE.Vector2(0.125, 0.06),
    new THREE.Vector2(0.12, 0.01),
    new THREE.Vector2(0.1, -0.04),
    new THREE.Vector2(0.07, -0.07),
    new THREE.Vector2(0.02, -0.08),
  ];
  const craniumGeo = new THREE.LatheGeometry(pts, 18);
  const cranium = new THREE.Mesh(craniumGeo, mats.bone);
  cranium.scale.set(0.95, 1.02, 1.12);
  cranium.castShadow = true;
  head.add(cranium);

  mesh(geos.sph, mats.bone, head, [0, 0.02, 0.02], [0.1, 0.08, 0.11]);
  mesh(geos.box, mats.bone, head, [0, 0.05, 0.1], [0.14, 0.03, 0.05]);

  mesh(geos.sph, mats.socket, head, [0.045, 0.03, 0.1], [0.032, 0.028, 0.02]);
  mesh(geos.sph, mats.socket, head, [-0.045, 0.03, 0.1], [0.032, 0.028, 0.02]);

  const eyeL = new THREE.Mesh(geos.sph, mats.glow);
  eyeL.position.set(0.045, 0.03, 0.108);
  eyeL.scale.setScalar(0.018);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = -0.045;
  head.add(eyeR);

  const lights: THREE.PointLight[] = [];
  if (withLights) {
    const lightL = new THREE.PointLight(soul, 0.55, 3.2, 2);
    lightL.position.set(0.045, 0.03, 0.12);
    head.add(lightL);
    const lightR = lightL.clone();
    lightR.position.x = -0.045;
    head.add(lightR);
    lights.push(lightL, lightR);
  }

  mesh(geos.box, mats.socket, head, [0, -0.01, 0.12], [0.03, 0.045, 0.02]);
  mesh(geos.box, mats.bone, head, [0.07, 0.01, 0.06], [0.03, 0.04, 0.07]);
  mesh(geos.box, mats.bone, head, [-0.07, 0.01, 0.06], [0.03, 0.04, 0.07]);

  const jaw = joint(head, 0, -0.055, 0.02);
  mesh(geos.box, mats.bone, jaw, [0, -0.02, 0.04], [0.1, 0.035, 0.09]);
  mesh(geos.box, mats.bone, jaw, [0.05, -0.01, 0.0], [0.02, 0.04, 0.08]);
  mesh(geos.box, mats.bone, jaw, [-0.05, -0.01, 0.0], [0.02, 0.04, 0.08]);
  for (let i = 0; i < 6; i++) {
    const x = -0.045 + i * 0.018;
    mesh(geos.box, mats.bone, jaw, [x, 0.01, 0.07], [0.01, 0.018, 0.01]);
    mesh(geos.box, mats.bone, head, [x, -0.04, 0.09], [0.01, 0.016, 0.01]);
  }

  return { jaw, lights };
}

function makeRibs(chest: THREE.Object3D, mats: Mats) {
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const y = 0.14 - t * 0.26;
    const rad = 0.1 + Math.sin(t * Math.PI) * 0.085;
    const tube = 0.008 + (1 - t) * 0.004;
    const drop = 0.012 + t * 0.03;
    const curveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, y, -0.03),
      new THREE.Vector3(rad * 0.55, y - drop * 0.3, 0.07),
      new THREE.Vector3(rad, y - drop, 0.01),
      new THREE.Vector3(rad * 0.45, y - drop * 1.2, -0.07),
    ]);
    const geo = new THREE.TubeGeometry(curveL, 8, tube, 5, false);
    const ribL = new THREE.Mesh(geo, mats.bone);
    ribL.castShadow = true;
    chest.add(ribL);
    const ribR = ribL.clone();
    ribR.scale.x = -1;
    chest.add(ribR);
  }
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.018), mats.boneDark);
  sternum.position.set(0, 0.02, 0.11);
  chest.add(sternum);
}

function makePelvis(hips: THREE.Object3D, geos: SharedGeos, mats: Mats) {
  mesh(geos.sph, mats.bone, hips, [0.08, 0.02, 0], [0.09, 0.07, 0.055]);
  mesh(geos.sph, mats.bone, hips, [-0.08, 0.02, 0], [0.09, 0.07, 0.055]);
  mesh(geos.box, mats.boneDark, hips, [0, 0.04, -0.02], [0.07, 0.08, 0.05]);
  mesh(geos.box, mats.bone, hips, [0, -0.04, 0.03], [0.08, 0.04, 0.05]);
  mesh(geos.sph, mats.bone, hips, [0.09, -0.05, 0.01], [0.04, 0.04, 0.035]);
  mesh(geos.sph, mats.bone, hips, [-0.09, -0.05, 0.01], [0.04, 0.04, 0.035]);
}

function makeHand(parent: THREE.Object3D, geos: SharedGeos, mats: Mats, side: 1 | -1) {
  mesh(geos.box, mats.bone, parent, [0, 0.03, 0], [0.045, 0.055, 0.022]);
  for (let f = 0; f < 4; f++) {
    const x = (-0.018 + f * 0.012) * side;
    const len = 0.045 - Math.abs(f - 1.5) * 0.006;
    mesh(geos.cyl, mats.bone, parent, [x, 0.055 + len * 0.5, 0], [0.006, len, 0.006]);
    mesh(geos.sph, mats.bone, parent, [x, 0.055 + len, 0], [0.007, 0.007, 0.007]);
  }
  mesh(geos.cyl, mats.bone, parent, [0.028 * side, 0.03, 0.01], [0.007, 0.032, 0.007], [0.6, 0, 0.8 * side]);
}

function makeFoot(parent: THREE.Object3D, geos: SharedGeos, mats: Mats) {
  mesh(geos.box, mats.bone, parent, [0, -0.02, 0.05], [0.06, 0.03, 0.12]);
  mesh(geos.sph, mats.bone, parent, [0, -0.01, -0.02], [0.03, 0.025, 0.03]);
  for (let i = 0; i < 3; i++) {
    mesh(geos.cyl, mats.bone, parent, [-0.018 + i * 0.018, -0.025, 0.1], [0.007, 0.008, 0.03], [Math.PI / 2, 0, 0]);
  }
}

function makeWeapon(kind: WeaponId, geos: SharedGeos, mats: Mats) {
  const g = new THREE.Group();
  if (kind === "sword") {
    mesh(geos.cyl, mats.bone, g, [0, 0.08, 0], [0.014, 0.16, 0.014]);
    mesh(geos.sph, mats.bone, g, [0, 0, 0], [0.022, 0.022, 0.022]);
    mesh(geos.box, mats.metal, g, [0, 0.16, 0], [0.12, 0.018, 0.018]);
    mesh(geos.box, mats.metal, g, [0, 0.48, 0], [0.028, 0.62, 0.008]);
    mesh(geos.box, mats.metal, g, [0, 0.8, 0], [0.01, 0.06, 0.006]);
  } else if (kind === "scythe") {
    mesh(geos.cyl, mats.bone, g, [0, 0.45, 0], [0.016, 0.95, 0.016]);
    const blade = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.016, 6, 18, Math.PI * 0.95), mats.metal);
    blade.rotation.set(0, Math.PI / 2, 0.2);
    blade.position.set(0.12, 0.88, 0);
    blade.castShadow = true;
    g.add(blade);
    mesh(geos.box, mats.metal, g, [0.16, 0.9, 0], [0.22, 0.012, 0.04]);
  } else {
    mesh(geos.cyl, mats.bone, g, [0, 0.4, 0], [0.014, 0.85, 0.014]);
    mesh(geos.sph, mats.bone, g, [0, 0.86, 0], [0.045, 0.05, 0.05]);
    mesh(geos.sph, mats.glow, g, [0, 0.86, 0.02], [0.02, 0.02, 0.02]);
    mesh(geos.box, mats.bone, g, [0, 0.82, 0.03], [0.06, 0.03, 0.04]);
  }
  g.rotation.set(Math.PI / 2, 0, 0);
  g.position.set(0.02, 0.05, 0.02);
  return g;
}

function makeShroud(root: THREE.Group, hips: THREE.Object3D, chest: THREE.Object3D, mats: Mats) {
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.38, 10, 1, true), mats.cloth);
  skirt.position.set(0, -0.12, 0);
  hips.add(skirt);
  const drape = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.55, 3, 4), mats.cloth);
  drape.position.set(0, -0.05, -0.12);
  drape.rotation.x = 0.15;
  chest.add(drape);
  const shred = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.4), mats.cloth);
  shred.position.set(0.1, -0.08, 0.08);
  shred.rotation.set(0.2, 0.4, 0.3);
  hips.add(shred);
}

function makePlate(chest: THREE.Object3D, lShoulder: THREE.Object3D, rShoulder: THREE.Object3D, geos: SharedGeos, mats: Mats) {
  mesh(geos.sph, mats.boneDark, chest, [0, 0.06, 0.13], [0.12, 0.1, 0.04]);
  mesh(geos.sph, mats.bone, lShoulder, [0.04, 0, 0], [0.08, 0.05, 0.07]);
  mesh(geos.sph, mats.bone, rShoulder, [-0.04, 0, 0], [0.08, 0.05, 0.07]);
  mesh(geos.box, mats.boneDark, chest, [0, -0.04, 0.12], [0.16, 0.08, 0.03]);
}

export function createSkeleton(
  geos: SharedGeos,
  mats: Mats,
  opts: { soul: string; weapon: WeaponId; armor: ArmorId; scale?: number; lights?: boolean },
): Rig {
  const root = new THREE.Group();
  const s = opts.scale ?? 1;
  root.scale.setScalar(s);

  const hips = joint(root, 0, 0.94, 0);
  makePelvis(hips, geos, mats);

  const spine0 = joint(hips, 0, 0.06, 0);
  vertebra(spine0, geos, mats, 0.02, 1.1);
  const spine1 = joint(spine0, 0, 0.1, 0);
  vertebra(spine1, geos, mats, 0.02, 1);
  const chest = joint(spine1, 0, 0.1, 0);
  vertebra(chest, geos, mats, 0.04, 1.15);
  vertebra(chest, geos, mats, 0.1, 1.05);
  makeRibs(chest, mats);

  const soulOrbs: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const orb = new THREE.Mesh(geos.sph, mats.glow);
    orb.position.set((i - 1) * 0.03, 0.02 + i * 0.04, 0);
    orb.scale.setScalar(0.018 - i * 0.002);
    chest.add(orb);
    soulOrbs.push(orb);
  }

  const neck = joint(chest, 0, 0.18, 0);
  vertebra(neck, geos, mats, 0.02, 0.7);
  vertebra(neck, geos, mats, 0.06, 0.65);
  const head = joint(neck, 0, 0.1, 0.02);
  const { jaw, lights } = makeSkull(head, geos, mats, opts.soul, opts.lights !== false);

  const lClav = joint(chest, 0.05, 0.14, 0.02);
  lClav.rotation.z = -0.4;
  mesh(geos.cyl, mats.bone, lClav, [0.07, 0, 0], [0.012, 0.014, 0.12], [0, 0, Math.PI / 2]);
  const lShoulder = joint(lClav, 0.14, 0, 0);
  const lUpper = joint(lShoulder, 0, 0, 0);
  lUpper.rotation.set(Math.PI, 0, -0.28);
  longBone(lUpper, geos, mats.bone, 0.28, 0.032, 0.022, 0.026);
  const lFore = joint(lUpper, 0, 0.28, 0);
  longBone(lFore, geos, mats.bone, 0.25, 0.024, 0.016, 0.02);
  const lHand = joint(lFore, 0, 0.25, 0);
  makeHand(lHand, geos, mats, 1);

  const rClav = joint(chest, -0.05, 0.14, 0.02);
  rClav.rotation.z = 0.4;
  mesh(geos.cyl, mats.bone, rClav, [-0.07, 0, 0], [0.012, 0.014, 0.12], [0, 0, Math.PI / 2]);
  const rShoulder = joint(rClav, -0.14, 0, 0);
  const rUpper = joint(rShoulder, 0, 0, 0);
  rUpper.rotation.set(Math.PI, 0, 0.28);
  longBone(rUpper, geos, mats.bone, 0.28, 0.032, 0.022, 0.026);
  const rFore = joint(rUpper, 0, 0.28, 0);
  longBone(rFore, geos, mats.bone, 0.25, 0.024, 0.016, 0.02);
  const rHand = joint(rFore, 0, 0.25, 0);
  makeHand(rHand, geos, mats, -1);

  const weapon = makeWeapon(opts.weapon, geos, mats);
  rHand.add(weapon);

  const lUpLeg = joint(hips, 0.09, -0.04, 0);
  lUpLeg.rotation.x = Math.PI;
  longBone(lUpLeg, geos, mats.bone, 0.42, 0.04, 0.028, 0.032);
  const lLoLeg = joint(lUpLeg, 0, 0.42, 0);
  longBone(lLoLeg, geos, mats.bone, 0.4, 0.028, 0.02, 0.024);
  const lFoot = joint(lLoLeg, 0, 0.4, 0);
  lFoot.rotation.x = Math.PI;
  makeFoot(lFoot, geos, mats);

  const rUpLeg = joint(hips, -0.09, -0.04, 0);
  rUpLeg.rotation.x = Math.PI;
  longBone(rUpLeg, geos, mats.bone, 0.42, 0.04, 0.028, 0.032);
  const rLoLeg = joint(rUpLeg, 0, 0.42, 0);
  longBone(rLoLeg, geos, mats.bone, 0.4, 0.028, 0.02, 0.024);
  const rFoot = joint(rLoLeg, 0, 0.4, 0);
  rFoot.rotation.x = Math.PI;
  makeFoot(rFoot, geos, mats);

  if (opts.armor === "shroud") makeShroud(root, hips, chest, mats);
  if (opts.armor === "plate") makePlate(chest, lShoulder, rShoulder, geos, mats);

  return {
    root,
    hips,
    spine0,
    spine1,
    chest,
    neck,
    head,
    jaw,
    lShoulder,
    lUpper,
    lFore,
    lHand,
    rShoulder,
    rUpper,
    rFore,
    rHand,
    lUpLeg,
    lLoLeg,
    lFoot,
    rUpLeg,
    rLoLeg,
    rFoot,
    weapon,
    eyeLights: lights,
    soulOrbs,
    height: 1.78 * s,
  };
}

export type PoseInput = {
  time: number;
  speed: number;
  maxSpeed: number;
  attack: number;
  attackKind: "slash" | "cast";
  dead: number;
  moving: boolean;
};

export function applyPose(rig: Rig, a: PoseInput) {
  const t = a.time;
  const dead = THREE.MathUtils.clamp(a.dead, 0, 1);
  const move = THREE.MathUtils.clamp(a.speed / Math.max(0.01, a.maxSpeed), 0, 1);
  const phase = t * (4.2 + move * 4.5);
  const swing = Math.sin(phase) * move;
  const idle = 1 - move;

  const atk = THREE.MathUtils.clamp(a.attack, 0, 1);
  const wind = atk > 0 && atk < 0.28 ? atk / 0.28 : 0;
  const slash = atk >= 0.28 && atk < 0.7 ? (atk - 0.28) / 0.42 : atk >= 0.7 ? 1 - (atk - 0.7) / 0.3 : 0;
  const rec = atk >= 0.7 ? (atk - 0.7) / 0.3 : 0;

  rig.hips.position.y = THREE.MathUtils.lerp(0.94, 0.18, dead);
  rig.hips.position.y += Math.sin(t * 1.6) * 0.012 * idle * (1 - dead);
  rig.hips.rotation.y = Math.sin(t * 0.7) * 0.04 * idle;
  rig.spine0.rotation.x = 0.06 * idle + swing * 0.04 + dead * 1.05;
  rig.spine1.rotation.x = Math.sin(t * 1.6) * 0.05 * idle + dead * 0.4;
  rig.chest.rotation.y = swing * 0.12;
  rig.head.rotation.y = Math.sin(t * 0.5) * 0.12 * idle;
  rig.head.rotation.x = Math.sin(t * 1.1) * 0.06 * idle + dead * 0.5;
  rig.jaw.rotation.x = Math.max(0, Math.sin(t * 2.2) * 0.12) * idle;

  const armHang = Math.PI;
  rig.lUpper.rotation.set(armHang + swing * 0.7 + dead * 0.4, 0, -0.28 - dead * 0.5);
  rig.rUpper.rotation.set(armHang - swing * 0.7 + dead * 0.5, 0, 0.28 + dead * 0.5);
  rig.lFore.rotation.x = Math.max(0, -Math.sin(phase)) * 0.55 * move;
  rig.rFore.rotation.x = Math.max(0, Math.sin(phase)) * 0.55 * move;

  rig.lUpLeg.rotation.set(Math.PI - swing * 0.65, 0, -0.04);
  rig.rUpLeg.rotation.set(Math.PI + swing * 0.65, 0, 0.04);
  rig.lLoLeg.rotation.x = Math.max(0, Math.sin(phase)) * 0.7 * move;
  rig.rLoLeg.rotation.x = Math.max(0, -Math.sin(phase)) * 0.7 * move;
  rig.lFoot.rotation.x = Math.PI - Math.max(0, swing) * 0.25 * move;
  rig.rFoot.rotation.x = Math.PI - Math.max(0, -swing) * 0.25 * move;

  if (atk > 0 && dead <= 0) {
    if (a.attackKind === "slash") {
      rig.rUpper.rotation.x = armHang - 0.9 * wind + 1.6 * slash - 0.2 * rec;
      rig.rUpper.rotation.z = 0.28 - 0.5 * slash;
      rig.rFore.rotation.x = 0.2 + 0.4 * wind;
      rig.spine1.rotation.y = -0.35 * slash;
      rig.chest.rotation.y = -0.4 * slash;
    } else {
      const raise = Math.sin(Math.min(atk, 1) * Math.PI);
      rig.rUpper.rotation.x = armHang - 1.4 * raise;
      rig.lUpper.rotation.x = armHang - 1.2 * raise;
      rig.rFore.rotation.x = 0.4 * raise;
      rig.head.rotation.x = -0.25 * raise;
    }
  }

  const pulse = 0.85 + Math.sin(t * 3.2) * 0.15;
  for (const o of rig.soulOrbs) o.scale.setScalar(0.016 * pulse);
}
