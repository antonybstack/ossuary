import * as THREE from "three";

export function createFx(scene: THREE.Scene, soul: string) {
  const count = 220;
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: soul,
    size: 0.08,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const motes = new Float32Array(80 * 3);
  for (let i = 0; i < 80; i++) {
    motes[i * 3] = (Math.random() - 0.5) * 40;
    motes[i * 3 + 1] = 0.4 + Math.random() * 3;
    motes[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motes, 3));
  const moteMat = new THREE.PointsMaterial({
    color: soul,
    size: 0.06,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motePts = new THREE.Points(moteGeo, moteMat);
  scene.add(motePts);

  type Floater = { sprite: THREE.Sprite; life: number; vy: number };
  const floaters: Floater[] = [];
  const spriteMatCache = new Map<string, THREE.SpriteMaterial>();

  function textSprite(text: string, color: string) {
    let mat = spriteMatCache.get(text + color);
    if (!mat) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 64;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 256, 64);
      ctx.font = "600 36px Figtree, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.fillText(text, 128, 44);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      spriteMatCache.set(text + color, mat);
    }
    return new THREE.Sprite(mat);
  }

  function burst(x: number, y: number, z: number, n = 18) {
    let spawned = 0;
    for (let i = 0; i < count && spawned < n; i++) {
      if (life[i] > 0) continue;
      life[i] = 0.45 + Math.random() * 0.25;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      vel[i * 3] = (Math.random() - 0.5) * 3;
      vel[i * 3 + 1] = 1.2 + Math.random() * 2.4;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 3;
      spawned++;
    }
    geo.attributes.position.needsUpdate = true;
  }

  function floatText(x: number, y: number, z: number, text: string, color: string) {
    const s = textSprite(text, color);
    s.position.set(x, y, z);
    s.scale.set(1.4, 0.35, 1);
    scene.add(s);
    floaters.push({ sprite: s, life: 0.9, vy: 1.4 });
  }

  function setSoul(hex: string) {
    mat.color.set(hex);
    moteMat.color.set(hex);
  }

  return {
    burst,
    floatText,
    setSoul,
    update(dt: number) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        vel[i * 3 + 1] -= 4 * dt;
        if (life[i] <= 0) pos[i * 3 + 1] = -10;
      }
      geo.attributes.position.needsUpdate = true;

      const mp = moteGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < 80; i++) {
        mp[i * 3 + 1] += dt * 0.25;
        if (mp[i * 3 + 1] > 4.5) mp[i * 3 + 1] = 0.2;
        mp[i * 3] += Math.sin(i + performance.now() * 0.0004) * dt * 0.15;
      }
      moteGeo.attributes.position.needsUpdate = true;

      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life -= dt;
        f.sprite.position.y += f.vy * dt;
        f.sprite.material.opacity = Math.max(0, f.life / 0.9);
        if (f.life <= 0) {
          scene.remove(f.sprite);
          floaters.splice(i, 1);
        }
      }
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      scene.remove(points);
      scene.remove(motePts);
      for (const f of floaters) scene.remove(f.sprite);
      for (const m of spriteMatCache.values()) {
        m.map?.dispose();
        m.dispose();
      }
    },
  };
}

export type FxHandle = ReturnType<typeof createFx>;
