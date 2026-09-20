import * as THREE from "three";

function canvas(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  return { c, ctx };
}

function hash(ix: number, iy: number) {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0);
  const b = hash(x0 + 1, y0);
  const c = hash(x0, y0 + 1);
  const d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, oct = 4) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += noise(x * f, y * f) * a;
    a *= 0.5;
    f *= 2;
  }
  return v;
}

function toTex(c: HTMLCanvasElement, repeat = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function makeBoneAlbedo() {
  const { c, ctx } = canvas(512);
  const img = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const n = fbm(x / 90, y / 70, 5);
      const grain = fbm(x / 18, y / 140, 3);
      const r = 214 + n * 28 + grain * 10;
      const g = 200 + n * 22 + grain * 8;
      const b = 176 + n * 16;
      const i = (y * 512 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(70, 52, 38, 0.28)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    const sx = (hash(i, 2) * 512) | 0;
    const sy = (hash(i, 9) * 512) | 0;
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + 40,
      sy + 80,
      sx - 20,
      sy + 140,
      sx + 10,
      sy + 200,
    );
    ctx.stroke();
  }
  return toTex(c, 2);
}

export function makeBoneBump() {
  const { c, ctx } = canvas(256);
  const img = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n = fbm(x / 40, y / 32, 4);
      const v = (n * 255) | 0;
      const i = (y * 256 + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

export function makeDirtAlbedo() {
  const { c, ctx } = canvas(512);
  const img = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const n = fbm(x / 70, y / 70, 5);
      const moss = Math.max(0, fbm(x / 40 + 20, y / 40, 3) - 0.52);
      const r = 42 + n * 28 - moss * 18;
      const g = 36 + n * 22 + moss * 34;
      const b = 28 + n * 14 - moss * 8;
      const i = (y * 512 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, 18);
}

export function makeStoneAlbedo() {
  const { c, ctx } = canvas(512);
  const img = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const n = fbm(x / 80, y / 60, 5);
      const r = 68 + n * 36;
      const g = 64 + n * 32;
      const b = 58 + n * 24;
      const i = (y * 512 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(20, 18, 14, 0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(hash(i, 1) * 512, hash(i, 4) * 512);
    ctx.lineTo(hash(i, 7) * 512, hash(i, 11) * 512);
    ctx.stroke();
  }
  return toTex(c, 2);
}

export function makeClothAlbedo() {
  const { c, ctx } = canvas(256);
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? "#241e18" : "#151210";
    ctx.fillRect(0, y, 256, 1);
  }
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = "#0c0a08";
    ctx.fillRect(hash(i, 3) * 256, hash(i, 8) * 256, 18, 40);
  }
  ctx.globalAlpha = 1;
  return toTex(c, 2);
}

export function makeRustAlbedo() {
  const { c, ctx } = canvas(256);
  const img = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n = fbm(x / 30, y / 30, 4);
      const r = 70 + n * 50;
      const g = 48 + n * 18;
      const b = 38 + n * 10;
      const i = (y * 256 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, 2);
}
