import * as THREE from "three";
import {
  floorTexture,
  wallTexture,
  crateTexture,
  metalTexture,
  grilleTexture,
  logoTexture,
  windowTexture,
} from "./textures.js";

const W = 18;
const D = 14;
const H = 3.35;
const WALL = 0.28;

function aabb(min, max) {
  return { type: "aabb", min: new THREE.Vector3(...min), max: new THREE.Vector3(...max) };
}

function makeGate(w, h, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.2,
  });
  const t = 0.045;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + t * 2, t, t), mat);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w + t * 2, t, t), mat);
  const l = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), mat);
  const r = l.clone();
  top.position.y = h * 0.5;
  bot.position.y = -h * 0.5;
  l.position.x = -w * 0.5;
  r.position.x = w * 0.5;
  g.add(top, bot, l, r);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, h * 0.92),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  g.add(glow);
  g.userData.frame = [top, bot, l, r];
  g.userData.glow = glow;
  return g;
}

export function createArena(scene) {
  const colliders = [];
  const gates = [];

  scene.background = new THREE.Color(0x0a0c12);
  scene.fog = new THREE.Fog(0x0a0c12, 10, 28);

  const floorTex = floorTexture();
  floorTex.repeat.set(W, D);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.88,
      metalness: 0.05,
      color: 0x9aa0aa,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  colliders.push(aabb([-W / 2, -0.4, -D / 2], [W / 2, 0, D / 2]));

  const wallTex = wallTexture();
  wallTex.repeat.set(8, 2);
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.82,
    color: 0x8890a0,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x12141b,
    roughness: 0.9,
    map: metalTexture(),
  });
  ceilMat.map.repeat.set(10, 8);

  const walls = [
    { pos: [0, H / 2, -D / 2 - WALL / 2], size: [W + WALL * 2, H, WALL] },
    { pos: [0, H / 2, D / 2 + WALL / 2], size: [W + WALL * 2, H, WALL] },
    { pos: [-W / 2 - WALL / 2, H / 2, 0], size: [WALL, H, D] },
    { pos: [W / 2 + WALL / 2, H / 2, 0], size: [WALL, H, D] },
  ];
  for (const w of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...w.size), wallMat);
    m.position.set(...w.pos);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    const hw = w.size[0] / 2;
    const hh = w.size[1] / 2;
    const hd = w.size[2] / 2;
    colliders.push(
      aabb(
        [w.pos[0] - hw, w.pos[1] - hh, w.pos[2] - hd],
        [w.pos[0] + hw, w.pos[1] + hh, w.pos[2] + hd]
      )
    );
  }

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.2, D + 1), ceilMat);
  ceiling.position.y = H + 0.08;
  scene.add(ceiling);
  colliders.push(aabb([-W / 2, H, -D / 2], [W / 2, H + 0.4, D / 2]));

  const hemi = new THREE.HemisphereLight(0x9eb6ff, 0x221810, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
  sun.position.set(-6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 28;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);

  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.6, 0.03, 0.03),
    new THREE.MeshStandardMaterial({
      color: 0x7dffb3,
      emissive: 0x7dffb3,
      emissiveIntensity: 2.2,
    })
  );
  neon.position.set(0, H - 0.12, -D / 2 + 0.08);
  const neon2 = neon.clone();
  neon2.position.z = D / 2 - 0.08;
  const neon3 = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, D - 0.6),
    neon.material
  );
  neon3.position.set(-W / 2 + 0.08, H - 0.12, 0);
  const neon4 = neon3.clone();
  neon4.position.x = W / 2 - 0.08;
  const hotMat = new THREE.MeshStandardMaterial({
    color: 0xff3d7f,
    emissive: 0xff3d7f,
    emissiveIntensity: 1.6,
  });
  neon2.material = hotMat;
  scene.add(neon, neon2, neon3, neon4);

  const winTex = windowTexture();
  const winMat = new THREE.MeshBasicMaterial({ map: winTex });
  for (const z of [-3.5, 0, 3.5]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), winMat);
    pane.position.set(-W / 2 + 0.16, 1.7, z);
    pane.rotation.y = Math.PI / 2;
    scene.add(pane);
  }
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 2.2),
    new THREE.MeshBasicMaterial({ map: logoTexture() })
  );
  logo.position.set(0, 2.05, D / 2 - 0.16);
  logo.rotation.y = Math.PI;
  scene.add(logo);

  const grilleTex = grilleTexture();
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.4, 1.1),
    new THREE.MeshStandardMaterial({
      map: grilleTex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  net.position.set(0, 2.7, -D / 2 + 0.2);
  scene.add(net);

  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x2a303a,
    metalness: 0.7,
    roughness: 0.35,
  });
  for (let x = -7; x <= 7; x += 3.5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, D - 0.4), beamMat);
    beam.position.set(x, H - 0.12, 0);
    scene.add(beam);
  }
  for (let x = -6; x <= 6; x += 3) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0xfff4d2,
        emissive: 0xffe6a8,
        emissiveIntensity: 1.8,
      })
    );
    lamp.position.set(x, H - 0.22, 0);
    scene.add(lamp);
    const pl = new THREE.PointLight(0xfff0cc, 0.35, 8);
    pl.position.set(x, H - 0.5, 0);
    scene.add(pl);
  }

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a909c, roughness: 0.55 });
  const pillars = [
    [2.8, 2.6, 0.28],
    [-3.2, 2.9, 0.32],
    [4.2, -2.2, 0.24],
    [-2.6, -2.4, 0.26],
    [0.2, 1.1, 0.2],
  ];
  for (const [x, z, r] of pillars) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, H - 0.05, 18), pillarMat);
    p.position.set(x, (H - 0.05) / 2, z);
    p.castShadow = true;
    p.receiveShadow = true;
    scene.add(p);
    colliders.push({ type: "cyl", x, z, r, y0: 0, y1: H });
  }

  const crateTex = crateTexture();
  const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.7 });
  const crates = [
    [5.4, 0.25, 4.2, 0.5, 0.5, 0.5],
    [5.9, 0.22, 4.6, 0.44, 0.44, 0.44],
    [5.5, 0.68, 4.35, 0.4, 0.36, 0.4],
    [-6.2, 0.3, -4.0, 0.6, 0.6, 0.6],
    [-6.5, 0.22, -3.5, 0.44, 0.44, 0.44],
    [6.4, 0.18, -4.8, 1.4, 0.36, 0.7],
  ];
  for (const [x, y, z, sx, sy, sz] of crates) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), crateMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    colliders.push(
      aabb([x - sx / 2, 0, z - sz / 2], [x + sx / 2, y + sy / 2, z + sz / 2])
    );
  }

  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.5 });
  const stripe = new THREE.MeshStandardMaterial({
    color: 0xffc857,
    emissive: 0x402800,
    emissiveIntensity: 0.3,
  });
  for (const z of [-0.6, 0.6]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.12), barrierMat);
    b.position.set(-5.6, 0.11, z);
    scene.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.04, 0.13), stripe);
    s.position.set(-5.6, 0.2, z);
    scene.add(s);
    colliders.push(aabb([-5.6 - 0.9, 0, z - 0.08], [-5.6 + 0.9, 0.24, z + 0.08]));
  }

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 8, 16), tireMat);
    tire.position.set(6.6, 0.16 + i * 0.12, 0.8);
    tire.rotation.y = Math.PI / 2;
    scene.add(tire);
  }
  colliders.push(aabb([6.35, 0, 0.55], [6.85, 0.7, 1.05]));

  const path = [
    new THREE.Vector3(0, 0.02, -5.2),
    new THREE.Vector3(0, 0.02, -4.0),
    new THREE.Vector3(3.0, 0.02, -1.6),
    new THREE.Vector3(4.5, 0.02, 1.6),
    new THREE.Vector3(2.2, 0.02, 4.4),
    new THREE.Vector3(-2.1, 0.02, 4.5),
    new THREE.Vector3(-4.6, 0.02, 1.5),
    new THREE.Vector3(-4.0, 0.02, -1.5),
    new THREE.Vector3(-1.4, 0.02, -3.7),
    new THREE.Vector3(0, 0.02, -5.2),
  ];
  const curve = new THREE.CatmullRomCurve3(path, true, "catmullrom", 0.3);
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 120, 0.035, 5, true),
    new THREE.MeshStandardMaterial({
      color: 0xffc857,
      emissive: 0xffc857,
      emissiveIntensity: 0.25,
      roughness: 0.45,
    })
  );
  scene.add(line);

  const gateDefs = [
    { x: 0, y: 1.05, z: -4.15, yaw: 0, w: 1.15, h: 0.95, color: 0x7dffb3 },
    { x: 3.15, y: 0.95, z: -1.45, yaw: 0.45, w: 0.95, h: 0.85, color: 0x6ecbff },
    { x: 4.55, y: 1.15, z: 1.75, yaw: 1.15, w: 0.9, h: 0.9, color: 0xffc857 },
    { x: 2.25, y: 1.45, z: 4.35, yaw: 2.35, w: 0.95, h: 0.9, color: 0xff7ad1 },
    { x: -2.15, y: 0.85, z: 4.55, yaw: Math.PI, w: 1.0, h: 0.8, color: 0x7dffb3 },
    { x: -4.75, y: 1.7, z: 1.55, yaw: 3.85, w: 0.9, h: 0.85, color: 0x6ecbff },
    { x: -4.15, y: 0.72, z: -1.35, yaw: 4.55, w: 0.95, h: 0.7, color: 0xffc857 },
    { x: -1.45, y: 1.05, z: -3.65, yaw: 5.9, w: 1.0, h: 0.9, color: 0xff3d7f },
  ];

  gateDefs.forEach((gd, i) => {
    const n = gateDefs[(i + 1) % gateDefs.length];
    gd.yaw = Math.atan2(n.x - gd.x, n.z - gd.z);

    const mesh = makeGate(gd.w, gd.h, gd.color);
    mesh.position.set(gd.x, gd.y, gd.z);
    mesh.rotation.y = gd.yaw;
    scene.add(mesh);
    const num = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    const [cv, ctx] = [document.createElement("canvas"), null];
    cv.width = cv.height = 64;
    const c2 = cv.getContext("2d");
    c2.fillStyle = "#111";
    c2.fillRect(0, 0, 64, 64);
    c2.fillStyle = "#d4ff5a";
    c2.font = "700 42px IBM Plex Mono, monospace";
    c2.textAlign = "center";
    c2.textBaseline = "middle";
    c2.fillText(String(i + 1), 32, 34);
    const nt = new THREE.CanvasTexture(cv);
    nt.colorSpace = THREE.SRGBColorSpace;
    num.material = new THREE.MeshBasicMaterial({ map: nt });
    num.position.set(0, gd.h * 0.5 + 0.14, 0);
    mesh.add(num);

    const dir = new THREE.Vector3(Math.sin(gd.yaw), 0, Math.cos(gd.yaw));
    const right = new THREE.Vector3(dir.z, 0, -dir.x);
    const hx = gd.w / 2;
    const hy = gd.h / 2;
    for (const side of [-1, 1]) {
      colliders.push({
        type: "yawbox",
        x: gd.x + right.x * hx * side,
        y: gd.y,
        z: gd.z + right.z * hx * side,
        hx: 0.04,
        hy: hy + 0.04,
        hz: 0.04,
        yaw: gd.yaw,
      });
    }
    colliders.push({
      type: "yawbox",
      x: gd.x,
      y: gd.y + hy,
      z: gd.z,
      hx: hx + 0.05,
      hy: 0.03,
      hz: 0.04,
      yaw: gd.yaw,
    });
    colliders.push({
      type: "yawbox",
      x: gd.x,
      y: gd.y - hy,
      z: gd.z,
      hx: hx + 0.05,
      hy: 0.03,
      hz: 0.04,
      yaw: gd.yaw,
    });
    gates.push({
      id: i,
      position: new THREE.Vector3(gd.x, gd.y, gd.z),
      yaw: gd.yaw,
      dir,
      right,
      w: gd.w,
      h: gd.h,
      mesh,
      lastDepth: 0,
    });
  });

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.03, 32),
    new THREE.MeshStandardMaterial({
      color: 0x1a1f18,
      emissive: 0x143322,
      emissiveIntensity: 0.4,
    })
  );
  pad.position.set(0, 0.016, -5.55);
  scene.add(pad);
  const padLight = new THREE.PointLight(0x7dffb3, 0.9, 4.5);
  padLight.position.set(0, 0.55, -5.45);
  scene.add(padLight);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.36, 32),
    new THREE.MeshBasicMaterial({ color: 0x7dffb3, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.034, -5.55);
  scene.add(ring);

  return {
    colliders,
    gates,
    spawn: {
      position: new THREE.Vector3(0, 0.05, -5.55),
      yaw: 0,
    },
    bounds: { w: W, d: D, h: H },
  };
}

export function checkGate(flight, gates, tracker) {
  const g = gates[tracker.next];
  const relx = flight.pos.x - g.position.x;
  const rely = flight.pos.y - g.position.y;
  const relz = flight.pos.z - g.position.z;
  const depth = relx * g.dir.x + relz * g.dir.z;
  const side = relx * g.right.x + relz * g.right.z;
  const inHole = Math.abs(side) < g.w * 0.48 && Math.abs(rely) < g.h * 0.48;
  const crossed = g.lastDepth < -0.04 && depth > 0.02 && inHole;
  const along = flight.vel.x * g.dir.x + flight.vel.z * g.dir.z;
  g.lastDepth = depth;
  if (crossed && along > 0.12) {
    tracker.next = (tracker.next + 1) % gates.length;
    tracker.passed += 1;
    if (tracker.next === 0) {
      tracker.laps += 1;
      return "lap";
    }
    return "gate";
  }
  return null;
}
