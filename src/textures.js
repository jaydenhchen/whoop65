import * as THREE from "three";

function canvas(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")];
}

function toTex(c, repeat = false) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  }
  tex.needsUpdate = true;
  return tex;
}

export function floorTexture() {
  const [c, g] = canvas(256);
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 18) | 0;
    img.data[i] = 28 + n;
    img.data[i + 1] = 30 + n;
    img.data[i + 2] = 36 + n;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = "rgba(255,255,255,0.07)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 254);
  g.strokeStyle = "rgba(255, 200, 80, 0.12)";
  g.beginPath();
  g.moveTo(128, 0);
  g.lineTo(128, 256);
  g.moveTo(0, 128);
  g.lineTo(256, 128);
  g.stroke();
  return toTex(c, true);
}

export function wallTexture() {
  const [c, g] = canvas(256);
  g.fillStyle = "#14171f";
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 64) {
      const ox = (y / 32) % 2 === 0 ? 0 : 32;
      g.fillStyle = `rgb(${18 + ((x * y) % 10)}, ${20 + (y % 8)}, ${26 + (x % 12)})`;
      g.fillRect(x + ox, y, 62, 30);
    }
  }
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(0, 0, 256, 18);
  return toTex(c, true);
}

export function crateTexture() {
  const [c, g] = canvas(128);
  g.fillStyle = "#6b4423";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#3d2412";
  g.lineWidth = 6;
  g.strokeRect(4, 4, 120, 120);
  g.beginPath();
  g.moveTo(8, 8);
  g.lineTo(120, 120);
  g.moveTo(120, 8);
  g.lineTo(8, 120);
  g.stroke();
  g.strokeStyle = "#c48a4a";
  g.lineWidth = 2;
  g.strokeRect(10, 10, 108, 108);
  return toTex(c);
}

export function metalTexture() {
  const [c, g] = canvas(64);
  const img = g.createImageData(64, 64);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 40 + ((Math.random() * 30) | 0);
    img.data[i] = n;
    img.data[i + 1] = n + 2;
    img.data[i + 2] = n + 6;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTex(c, true);
}

export function grilleTexture() {
  const [c, g] = canvas(128);
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(180, 190, 200, 0.55)";
  g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 10) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 128);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(128, i);
    g.stroke();
  }
  const tex = toTex(c, true);
  tex.premultiplyAlpha = false;
  return tex;
}

export function logoTexture() {
  const [c, g] = canvas(512);
  g.fillStyle = "#0c0e14";
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#7dffb3";
  g.font = "800 96px Syne, sans-serif";
  g.textAlign = "center";
  g.fillText("WHOOP.65", 256, 250);
  g.fillStyle = "#ff3d7f";
  g.font = "500 28px IBM Plex Mono, monospace";
  g.fillText("INDOOR PARK  ·  65mm", 256, 300);
  return toTex(c);
}

export function windowTexture() {
  const [c, g] = canvas(256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#1a2450");
  grd.addColorStop(0.45, "#3a2a58");
  grd.addColorStop(1, "#ff7a4a");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,200,120,0.15)";
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 140;
    g.fillRect(x, y, 2, 4);
  }
  return toTex(c);
}
