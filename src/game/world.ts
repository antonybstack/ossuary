import * as THREE from "three";

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(
  scene: THREE.Scene,
  stoneMap: THREE.Texture,
  dirtMap: THREE.Texture,
  boneMat: THREE.MeshStandardMaterial,
) {
  const rand = mulberry32(0x0a11);
  const disposables: THREE.BufferGeometry[] = [];

  scene.background = new THREE.Color(0x0b0d12);
  scene.fog = new THREE.Fog(0x0b0d12, 10, 46);

  const hemi = new THREE.HemisphereLight(0x7a889c, 0x1a1510, 0.55);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc5d0de, 1.35);
  moon.position.set(-18, 28, -8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near = 2;
  moon.shadow.camera.far = 70;
  moon.shadow.camera.left = -28;
  moon.shadow.camera.right = 28;
  moon.shadow.camera.top = 28;
  moon.shadow.camera.bottom = -28;
  moon.shadow.bias = -0.0004;
  scene.add(moon);

  const amb = new THREE.AmbientLight(0x1c1814, 0.22);
  scene.add(amb);

  const groundGeo = new THREE.CircleGeometry(42, 48);
  groundGeo.rotateX(-Math.PI / 2);
  disposables.push(groundGeo);
  const groundMat = new THREE.MeshStandardMaterial({
    map: dirtMap,
    color: 0x5a5348,
    roughness: 0.95,
    metalness: 0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneMap,
    color: 0x8a8378,
    roughness: 0.86,
    metalness: 0.04,
  });
  const stoneGeo = new THREE.BoxGeometry(0.55, 1.15, 0.16);
  disposables.push(stoneGeo);
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, 40);
  stones.castShadow = true;
  stones.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = 6 + rand() * 28;
    dummy.position.set(Math.cos(ang) * rad, 0.55, Math.sin(ang) * rad);
    dummy.rotation.set((rand() - 0.5) * 0.12, rand() * Math.PI, (rand() - 0.5) * 0.08);
    dummy.scale.set(0.7 + rand() * 0.6, 0.7 + rand() * 1.1, 0.8 + rand() * 0.4);
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
  }
  scene.add(stones);

  const pillarGeo = new THREE.CylinderGeometry(0.22, 0.26, 2.4, 8);
  disposables.push(pillarGeo);
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(pillarGeo, stoneMat);
    const a = (i / 8) * Math.PI * 2;
    p.position.set(Math.cos(a) * 7.5, 1.2, Math.sin(a) * 7.5);
    p.rotation.z = (rand() - 0.5) * 0.15;
    p.castShadow = true;
    p.receiveShadow = true;
    scene.add(p);
  }

  const crypt = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 0.4), stoneMat);
  wall.position.set(0, 1.6, -16);
  wall.castShadow = true;
  crypt.add(wall);
  const wallL = wall.clone();
  wallL.position.set(-3.1, 1.4, -13);
  wallL.rotation.y = Math.PI / 2;
  wallL.scale.set(1, 0.85, 1);
  crypt.add(wallL);
  const wallR = wallL.clone();
  wallR.position.x = 3.1;
  crypt.add(wallR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 0.5), stoneMat);
  lintel.position.set(0, 2.6, -13);
  crypt.add(lintel);
  scene.add(crypt);

  function tree(x: number, z: number, h: number) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h, 6), stoneMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, h * 0.45, 5), stoneMat);
      br.position.set((rand() - 0.5) * 0.2, h * (0.55 + rand() * 0.3), 0);
      br.rotation.set((rand() - 0.4) * 1.2, rand() * 6, (rand() - 0.5) * 1.4);
      br.castShadow = true;
      g.add(br);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = 12 + rand() * 22;
    tree(Math.cos(a) * r, Math.sin(a) * r, 2.2 + rand() * 2.4);
  }

  const torchMat = new THREE.MeshStandardMaterial({
    color: 0xc47a52,
    emissive: 0xc47a52,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });
  const torchPos: [number, number, number][] = [
    [-6.8, 1.6, -13],
    [6.8, 1.6, -13],
    [0, 1.4, 8],
  ];
  for (const [x, y, z] of torchPos) {
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), torchMat);
    flame.position.set(x, y, z);
    scene.add(flame);
    const light = new THREE.PointLight(0xc47a52, 1.6, 9, 2);
    light.position.set(x, y, z);
    scene.add(light);
  }

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xdde4ee }),
  );
  moonMesh.position.set(-22, 34, -16);
  scene.add(moonMesh);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const h = 0.15 + rand() * 0.7;
    starPos[i * 3] = Math.cos(a) * (30 + rand() * 20);
    starPos[i * 3 + 1] = 12 + h * 28;
    starPos[i * 3 + 2] = Math.sin(a) * (30 + rand() * 20);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  disposables.push(starGeo);
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd6e0, size: 0.12 })));

  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 3 + rand() * 20;
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.35, 5), boneMat);
    bone.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
    bone.rotation.set(Math.PI / 2, rand() * 3, rand());
    bone.castShadow = true;
    scene.add(bone);
  }

  const ringGeo = new THREE.TorusGeometry(8, 0.08, 6, 40);
  disposables.push(ringGeo);
  const ring = new THREE.Mesh(ringGeo, stoneMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  scene.add(ring);

  return {
    dispose() {
      groundMat.dispose();
      stoneMat.dispose();
      torchMat.dispose();
      for (const g of disposables) g.dispose();
    },
  };
}
