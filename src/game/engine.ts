import * as THREE from "three";
import { createAudio } from "./audio";
import { createFx } from "./fx";
import { createInput, type InputHandle } from "./input";
import {
  applyPose,
  createGeos,
  createMats,
  createSkeleton,
  type Mats,
  type Rig,
} from "./skeleton";
import { useGame } from "./store";
import type { Loadout } from "./types";
import { createWorld } from "./world";
import { makeBoneAlbedo, makeBoneBump, makeClothAlbedo, makeDirtAlbedo, makeRustAlbedo, makeStoneAlbedo } from "./textures";

const WALK = 3.4;
const RUN = 6.2;
const ARENA = 36;
const CAM_DIST = 5.4;
const CAM_H = 1.55;
const ATTACK_T = 0.55;

type Enemy = {
  rig: Rig;
  mats: Mats;
  hp: number;
  maxHp: number;
  yaw: number;
  speed: number;
  state: "wander" | "chase" | "attack" | "dead";
  attackT: number;
  deadT: number;
  wander: number;
  name: string;
  hitFlash: number;
};

const NAMES = ["Wight", "Rattlekin", "Marrow", "Ossifex", "Grimjaw", "Cinderbone", "Hollow", "Pale"];

export type Engine = {
  start: () => void;
  respawn: () => void;
  setLoadout: (loadout: Loadout) => void;
  setMuted: (m: boolean) => void;
  pressSkill: (i: 1 | 2 | 3) => void;
  pressAttack: () => void;
  setStick: (x: number, y: number, active: boolean) => void;
  lookDelta: (dx: number, dy: number) => void;
  dispose: () => void;
};

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
  camera.position.set(0, 1.6, 4.2);

  const boneMap = makeBoneAlbedo();
  const bump = makeBoneBump();
  const dirt = makeDirtAlbedo();
  const stone = makeStoneAlbedo();
  const cloth = makeClothAlbedo();
  const rust = makeRustAlbedo();
  const geos = createGeos();

  let loadout = { ...useGame.getState().loadout };
  let playerMats = createMats(boneMap, bump, cloth, rust, loadout.soul);
  let player = createSkeleton(geos, playerMats, loadout);
  scene.add(player.root);

  const world = createWorld(scene, stone, dirt, playerMats.bone);
  const fx = createFx(scene, loadout.soul);
  const audio = createAudio();
  const input = createInput(canvas);

  const spotlight = new THREE.SpotLight(0xe8dcc4, 8, 14, 0.5, 0.45, 1);
  spotlight.position.set(2.2, 5.2, 3.4);
  spotlight.target = player.root;
  scene.add(spotlight);
  scene.add(spotlight.target);

  type Actor = {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    xp: number;
    xpTo: number;
    level: number;
    yaw: number;
    speed: number;
    attackT: number;
    attackKind: "slash" | "cast";
    deadT: number;
    invuln: number;
    kills: number;
  };

  const actor: Actor = {
    hp: 120,
    maxHp: 120,
    mp: 80,
    maxMp: 80,
    xp: 0,
    xpTo: 80,
    level: 1,
    yaw: 0,
    speed: 0,
    attackT: 0,
    attackKind: "slash",
    deadT: 0,
    invuln: 0,
    kills: 0,
  };

  let camYaw = 0;
  let camPitch = 0.32;
  let phase: "title" | "playing" | "dead" = "title";
  let paused = false;
  let target: Enemy | null = null;
  let trauma = 0;
  let toast = "";
  let toastT = 0;
  let cd1 = 0;
  let cd2 = 0;
  let cd3 = 0;
  let pet: Enemy | null = null;
  let showcaseT = 0;
  let last = performance.now();
  let disposed = false;
  let lookInject = { x: 0, y: 0 };
  let hudAcc = 0;

  const enemies: Enemy[] = [];

  function makeEnemy(x: number, z: number, scale = 0.92, soul = "#c45c4a"): Enemy {
    const mats = createMats(boneMap, bump, cloth, rust, soul);
    const rig = createSkeleton(geos, mats, { soul, weapon: "sword", armor: "bare", scale, lights: false });
    rig.root.position.set(x, 0, z);
    scene.add(rig.root);
    return {
      rig,
      mats,
      hp: 55,
      maxHp: 55,
      yaw: Math.random() * Math.PI * 2,
      speed: 0,
      state: "wander",
      attackT: 0,
      deadT: 0,
      wander: Math.random() * 4,
      name: NAMES[(Math.random() * NAMES.length) | 0]!,
      hitFlash: 0,
    };
  }

  function spawnEnemies() {
    for (const e of enemies) {
      scene.remove(e.rig.root);
    }
    enemies.length = 0;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const r = 10 + (i % 3) * 4;
      enemies.push(makeEnemy(Math.cos(a) * r, Math.sin(a) * r));
    }
  }

  function setToast(msg: string) {
    toast = msg;
    toastT = 2.4;
    useGame.getState().setHud({ toast });
  }

  function reach() {
    if (loadout.weapon === "staff") return 9.5;
    if (loadout.weapon === "scythe") return 2.6;
    return 2.15;
  }

  function autoDmg() {
    const base = loadout.weapon === "staff" ? 16 : loadout.weapon === "scythe" ? 22 : 18;
    return base + actor.level * 3;
  }

  function rebuildPlayer() {
    const pos = player.root.position.clone();
    const yaw = actor.yaw;
    scene.remove(player.root);
    playerMats.glow.dispose();
    playerMats = createMats(boneMap, bump, cloth, rust, loadout.soul);
    player = createSkeleton(geos, playerMats, loadout);
    player.root.position.copy(pos);
    player.root.rotation.y = yaw;
    scene.add(player.root);
    spotlight.target = player.root;
    fx.setSoul(loadout.soul);
  }

  function hud() {
    useGame.getState().setHud({
      phase,
      paused,
      hp: actor.hp,
      maxHp: actor.maxHp,
      mp: actor.mp,
      maxMp: actor.maxMp,
      xp: actor.xp,
      xpToLevel: actor.xpTo,
      level: actor.level,
      targetName: target && target.state !== "dead" ? target.name : null,
      targetHp: target?.hp ?? 0,
      targetMaxHp: target?.maxHp ?? 1,
      cd1: cd1 / 4,
      cd2: cd2 / 8,
      cd3: cd3 / 22,
      toast,
      killCount: actor.kills,
    });
  }

  function gainXp(n: number) {
    actor.xp += n;
    while (actor.xp >= actor.xpTo) {
      actor.xp -= actor.xpTo;
      actor.level += 1;
      actor.xpTo = Math.floor(actor.xpTo * 1.35);
      actor.maxHp += 18;
      actor.maxMp += 8;
      actor.hp = actor.maxHp;
      actor.mp = actor.maxMp;
      audio.levelUp();
      setToast(`Risen to level ${actor.level}`);
    }
  }

  function hurtEnemy(e: Enemy, dmg: number, heal = 0) {
    if (e.state === "dead") return;
    e.hp -= dmg;
    e.hitFlash = 0.12;
    e.state = "chase";
    const p = e.rig.root.position;
    fx.burst(p.x, 1.1, p.z, 14);
    fx.floatText(p.x, 1.6, p.z, String(dmg), "#ece6dc");
    audio.hit();
    trauma = Math.min(1, trauma + 0.28);
    if (heal) {
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      fx.floatText(player.root.position.x, 1.8, player.root.position.z, `+${heal}`, "#6fbfa3");
    }
    if (e.hp <= 0) {
      e.hp = 0;
      e.state = "dead";
      e.deadT = 0;
      actor.kills += 1;
      gainXp(28 + actor.level * 4);
      fx.burst(p.x, 1.0, p.z, 28);
      setToast(`${e.name} returns to dust`);
    }
  }

  function nearest(range: number) {
    let best: Enemy | null = null;
    let bestD = range;
    const p = player.root.position;
    for (const e of enemies) {
      if (e.state === "dead") continue;
      const d = p.distanceTo(e.rig.root.position);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function tryAttack() {
    if (phase !== "playing" || actor.deadT > 0 || actor.attackT > 0) return;
    if (!target || target.state === "dead") target = nearest(14);
    const ranged = loadout.weapon === "staff";
    actor.attackKind = ranged ? "cast" : "slash";
    actor.attackT = ATTACK_T;
    if (ranged) audio.cast();
    else audio.whoosh();

    if (target && target.state !== "dead") {
      const d = player.root.position.distanceTo(target.rig.root.position);
      if (d <= reach() + 0.3) {
        const dir = target.rig.root.position.clone().sub(player.root.position);
        actor.yaw = Math.atan2(-dir.x, -dir.z);
        window.setTimeout(() => {
          if (target && target.state !== "dead") hurtEnemy(target, autoDmg() + ((Math.random() * 6) | 0));
        }, ranged ? 220 : 180);
      }
    }
  }

  function skill(i: 1 | 2 | 3) {
    if (phase !== "playing" || actor.deadT > 0) return;
    if (i === 1) {
      if (cd1 > 0 || actor.mp < 12) return;
      actor.mp -= 12;
      cd1 = 4;
      actor.attackKind = "slash";
      actor.attackT = ATTACK_T;
      audio.whoosh();
      const p = player.root.position;
      const fxDir = new THREE.Vector3(-Math.sin(actor.yaw), 0, -Math.cos(actor.yaw));
      fx.burst(p.x + fxDir.x, 1.1, p.z + fxDir.z, 22);
      for (const e of enemies) {
        if (e.state === "dead") continue;
        const to = e.rig.root.position.clone().sub(p);
        const dist = to.length();
        to.normalize();
        if (dist < 3.4 && to.dot(fxDir) > 0.25) hurtEnemy(e, 34 + actor.level * 4);
      }
      setToast("Bone Slash");
    } else if (i === 2) {
      if (cd2 > 0 || actor.mp < 18) return;
      if (!target || target.state === "dead") target = nearest(12);
      if (!target) return;
      actor.mp -= 18;
      cd2 = 8;
      actor.attackKind = "cast";
      actor.attackT = ATTACK_T;
      audio.cast();
      hurtEnemy(target, 26 + actor.level * 3, 14);
      setToast("Soul Drain");
    } else {
      if (cd3 > 0 || actor.mp < 28) return;
      actor.mp -= 28;
      cd3 = 22;
      actor.attackKind = "cast";
      actor.attackT = ATTACK_T;
      audio.cast();
      if (pet) {
        scene.remove(pet.rig.root);
      }
      const f = new THREE.Vector3(-Math.sin(actor.yaw), 0, -Math.cos(actor.yaw));
      pet = makeEnemy(player.root.position.x + f.x * 1.4, player.root.position.z + f.z * 1.4, 0.72, loadout.soul);
      pet.name = "Risen Ally";
      pet.hp = pet.maxHp = 70;
      pet.state = "chase";
      enemies.push(pet);
      setToast("Raise Dead");
    }
    hud();
  }

  function start() {
    if (phase === "playing") return;
    audio.resume();
    audio.startDrone();
    phase = "playing";
    paused = false;
    spotlight.intensity = 0;
    player.root.position.set(0, 0, 4);
    actor.yaw = 0;
    camYaw = 0;
    camPitch = 0.28;
    actor.hp = actor.maxHp;
    actor.mp = actor.maxMp;
    actor.deadT = 0;
    spawnEnemies();
    useGame.getState().setPhase("playing");
    hud();
    input.requestLock();
  }

  function respawn() {
    actor.hp = Math.floor(actor.maxHp * 0.6);
    actor.mp = actor.maxMp;
    actor.deadT = 0;
    phase = "playing";
    player.root.position.set(0, 0, 4);
    actor.yaw = 0;
    actor.invuln = 1.4;
    useGame.getState().setPhase("playing");
    hud();
  }

  function faceMove(mx: number, my: number, cy: number) {
    const fx = -Math.sin(cy);
    const fz = -Math.cos(cy);
    const rx = Math.cos(cy);
    const rz = -Math.sin(cy);
    const wx = rx * mx + fx * my;
    const wz = rz * mx + fz * my;
    const mag = Math.hypot(wx, wz);
    if (mag < 0.05) return { wx: 0, wz: 0, mag: 0 };
    return { wx: wx / mag, wz: wz / mag, mag };
  }

  const tmpCam = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  function updateShowcase(dt: number) {
    showcaseT += dt;
    player.root.position.set(0, 0, 0);
    player.root.rotation.y = showcaseT * 0.35;
    applyPose(player, {
      time: showcaseT,
      speed: 0,
      maxSpeed: WALK,
      attack: 0,
      attackKind: "slash",
      dead: 0,
      moving: false,
    });
    const orbit = 3.4;
    camera.position.set(Math.sin(showcaseT * 0.25) * orbit, 1.55, Math.cos(showcaseT * 0.25) * orbit);
    camera.lookAt(0, 1.15, 0);
  }

  function updatePlay(dt: number, now: number) {
    const act = input.sample();
    act.lookDx += lookInject.x;
    act.lookDy += lookInject.y;
    lookInject.x = 0;
    lookInject.y = 0;

    if (act.justPause) {
      paused = !paused;
      if (paused) input.exitLock();
      hud();
    }
    if (paused) return;

    camYaw -= act.lookDx * 0.0022;
    camPitch = THREE.MathUtils.clamp(camPitch - act.lookDy * 0.002, -0.2, 0.85);

    if (act.justAttack) tryAttack();
    if (act.justSkill1) skill(1);
    if (act.justSkill2) skill(2);
    if (act.justSkill3) skill(3);
    if (act.justTab) {
      const alive = enemies.filter((e) => e.state !== "dead");
      if (alive.length) {
        const idx = target ? alive.indexOf(target) : -1;
        target = alive[(idx + 1) % alive.length] ?? null;
      }
    }

    cd1 = Math.max(0, cd1 - dt);
    cd2 = Math.max(0, cd2 - dt);
    cd3 = Math.max(0, cd3 - dt);
    actor.invuln = Math.max(0, actor.invuln - dt);
    actor.mp = Math.min(actor.maxMp, actor.mp + dt * 3.2);
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) {
        toast = "";
      }
    }

    if (actor.attackT > 0) actor.attackT = Math.max(0, actor.attackT - dt);

    const wish = faceMove(act.moveX, act.moveY, camYaw);
    const maxSp = act.sprint ? RUN : WALK;
    if (actor.deadT <= 0 && wish.mag > 0 && actor.attackT <= 0) {
      const targetYaw = Math.atan2(-wish.wx, -wish.wz);
      actor.yaw = lerpAngle(actor.yaw, targetYaw, 1 - Math.exp(-10 * dt));
      actor.speed = THREE.MathUtils.lerp(actor.speed, maxSp * wish.mag, 1 - Math.exp(-8 * dt));
      player.root.position.x += wish.wx * actor.speed * dt;
      player.root.position.z += wish.wz * actor.speed * dt;
    } else {
      actor.speed = THREE.MathUtils.lerp(actor.speed, 0, 1 - Math.exp(-10 * dt));
    }

    const r = Math.hypot(player.root.position.x, player.root.position.z);
    if (r > ARENA) {
      player.root.position.x *= ARENA / r;
      player.root.position.z *= ARENA / r;
    }

    player.root.rotation.y = actor.yaw;

    if (actor.hp <= 0 && actor.deadT <= 0) {
      actor.deadT = 0.001;
      actor.hp = 0;
      phase = "dead";
      audio.death();
      setToast("The grave reclaims you");
      useGame.getState().setPhase("dead");
    }
    if (actor.deadT > 0) actor.deadT = Math.min(1, actor.deadT + dt * 0.7);

    applyPose(player, {
      time: now * 0.001,
      speed: actor.speed,
      maxSpeed: maxSp,
      attack: actor.attackT > 0 ? 1 - actor.attackT / ATTACK_T : 0,
      attackKind: actor.attackKind,
      dead: actor.deadT,
      moving: actor.speed > 0.2,
    });

    if (actor.speed > 1.2 && Math.floor(now / 380) !== Math.floor((now - dt * 1000) / 380)) {
      audio.clack();
    }

    updateEnemies(dt, now);
    updateCamera(dt);
    trauma = Math.max(0, trauma - dt * 1.8);
  }

  function updateEnemies(dt: number, now: number) {
    const p = player.root.position;
    for (const e of enemies) {
      if (e.state === "dead") {
        e.deadT = Math.min(1, e.deadT + dt * 0.8);
        applyPose(e.rig, {
          time: now * 0.001,
          speed: 0,
          maxSpeed: 2,
          attack: 0,
          attackKind: "slash",
          dead: e.deadT,
          moving: false,
        });
        if (e.deadT >= 1 && e !== pet) {
          const a = Math.random() * Math.PI * 2;
          const r = 12 + Math.random() * 16;
          e.rig.root.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
          e.hp = e.maxHp;
          e.state = "wander";
          e.deadT = 0;
        }
        continue;
      }

      const to = p.clone().sub(e.rig.root.position);
      const dist = to.length();
      const isPet = e === pet;

      if (isPet) {
        const foe = enemies.find((o) => o !== e && o.state !== "dead");
        if (foe) {
          const d = foe.rig.root.position.clone().sub(e.rig.root.position);
          const dd = d.length();
          e.yaw = Math.atan2(-d.x, -d.z);
          if (dd > 1.8) {
            d.normalize();
            e.rig.root.position.x += d.x * 3.2 * dt;
            e.rig.root.position.z += d.z * 3.2 * dt;
            e.speed = 3.2;
          } else {
            e.speed = 0;
            e.attackT -= dt;
            if (e.attackT <= 0) {
              e.attackT = 1.2;
              hurtEnemy(foe, 10);
            }
          }
        }
      } else if (dist < 11 && actor.deadT <= 0) {
        e.state = dist < 1.7 ? "attack" : "chase";
        e.yaw = Math.atan2(-to.x, -to.z);
        if (e.state === "chase") {
          to.normalize();
          e.rig.root.position.x += to.x * 2.4 * dt;
          e.rig.root.position.z += to.z * 2.4 * dt;
          e.speed = 2.4;
        } else {
          e.speed = 0;
          e.attackT -= dt;
          if (e.attackT <= 0 && actor.invuln <= 0) {
            e.attackT = 1.35;
            actor.hp -= 8 + ((Math.random() * 6) | 0);
            trauma = Math.min(1, trauma + 0.35);
            audio.hit();
            fx.burst(p.x, 1.2, p.z, 10);
            fx.floatText(p.x, 1.7, p.z, "hit", "#c45c4a");
          }
        }
      } else {
        e.state = "wander";
        e.wander -= dt;
        if (e.wander <= 0) {
          e.yaw += (Math.random() - 0.5) * 2;
          e.wander = 2 + Math.random() * 3;
        }
        const fxw = -Math.sin(e.yaw);
        const fzw = -Math.cos(e.yaw);
        e.rig.root.position.x += fxw * 0.9 * dt;
        e.rig.root.position.z += fzw * 0.9 * dt;
        e.speed = 0.9;
      }

      e.rig.root.rotation.y = e.yaw;
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.mats.bone.emissive.setHex(e.hitFlash > 0 ? 0x442222 : 0x000000);
      }
      applyPose(e.rig, {
        time: now * 0.001,
        speed: e.speed,
        maxSpeed: 2.6,
        attack: e.state === "attack" ? 0.4 : 0,
        attackKind: "slash",
        dead: 0,
        moving: e.speed > 0.2,
      });
    }
    if (target && target.state === "dead") target = nearest(14);
  }

  function updateCamera(dt: number) {
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const px = player.root.position.x;
    const py = player.root.position.y;
    const pz = player.root.position.z;
    const desired = tmpCam.set(px - fx * CAM_DIST, py + CAM_H + camPitch * 2.2, pz - fz * CAM_DIST);
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
    const shake = trauma * trauma;
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.18;
      camera.position.y += (Math.random() - 0.5) * shake * 0.12;
    }
    tmpLook.set(px, py + 1.25, pz);
    camera.lookAt(tmpLook);
  }

  function lerpAngle(a: number, b: number, t: number) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const onDown = (e: PointerEvent) => {
    if (phase !== "playing" || e.button !== 0) return;
    input.noteMouseDown();
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    for (const en of enemies) {
      if (en.state === "dead") continue;
      const hits = ray.intersectObject(en.rig.root, true);
      if (hits.length) {
        target = en;
        hud();
        return;
      }
    }
    tryAttack();
  };
  const onUp = () => input.noteMouseUp();
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  window.__controlsTest = {
    getYaw: () => actor.yaw,
    getSpeed: () => actor.speed,
    setKeys(codes: string[]) {
      if (phase !== "playing") start();
      input.setInjected(codes);
    },
  };

  useGame.getState().setReady(true);
  hud();

  renderer.setAnimationLoop(() => {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (phase === "title") updateShowcase(dt);
    else updatePlay(dt, now);
    fx.update(dt);
    renderer.render(scene, camera);
    hudAcc += dt;
    if (hudAcc > 0.1) {
      hudAcc = 0;
      hud();
    }
  });

  return {
    start,
    respawn,
    setLoadout(next: Loadout) {
      const changed = next.soul !== loadout.soul || next.weapon !== loadout.weapon || next.armor !== loadout.armor;
      loadout = { ...next };
      if (changed) rebuildPlayer();
    },
    setMuted(m: boolean) {
      audio.setMuted(m);
    },
    pressSkill: skill,
    pressAttack: tryAttack,
    setStick(x: number, y: number, active: boolean) {
      input.stick.x = x;
      input.stick.y = y;
      input.stick.active = active;
    },
    lookDelta(dx: number, dy: number) {
      lookInject.x += dx;
      lookInject.y += dy;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      input.dispose();
      audio.dispose();
      fx.dispose();
      world.dispose();
      geos.cyl.dispose();
      geos.sph.dispose();
      geos.box.dispose();
      geos.torus.dispose();
      boneMap.dispose();
      bump.dispose();
      dirt.dispose();
      stone.dispose();
      cloth.dispose();
      rust.dispose();
      renderer.dispose();
      delete window.__controlsTest;
    },
  };
}
