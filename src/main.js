import * as THREE from "three";
import { Input } from "./input.js";
import { Flight } from "./flight.js";
import { createDrone } from "./drone.js";
import { createArena, checkGate } from "./arena.js";
import { AudioEngine } from "./audio.js";
import { createOsd } from "./osd.js";

const store = Object.create(null);
function storageGet(key) {
  try {
    const v = localStorage.getItem(key);
    if (v != null) store[key] = v;
    return v;
  } catch {
    return store[key] ?? null;
  }
}
function storageSet(key, value) {
  store[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const arena = createArena(scene);
const drone = createDrone();
drone.group.castShadow = true;
scene.add(drone.group);

const flight = new Flight(arena.spawn);
flight.mode = storageGet("whoop-mode") || "angle";

const fpvCam = new THREE.PerspectiveCamera(78, 1, 0.008, 60);
fpvCam.position.set(0, 0.013, 0.028);
drone.group.add(fpvCam);
const tiltDummy = new THREE.PerspectiveCamera();
let camTilt = 30;
function applyFpvTilt() {
  const tilt = THREE.MathUtils.degToRad(camTilt);
  tiltDummy.position.set(0, 0, 0);
  tiltDummy.up.set(0, 1, 0);
  tiltDummy.lookAt(0, Math.sin(tilt), Math.cos(tilt));
  fpvCam.quaternion.copy(tiltDummy.quaternion);
}
applyFpvTilt();

const chaseCam = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
const menuCam = new THREE.PerspectiveCamera(60, 1, 0.1, 80);

const input = new Input();
const audio = new AudioEngine();
const osd = createOsd();

const tracker = { next: 0, passed: 0, laps: 0 };
const state = {
  phase: "menu",
  flight,
  input,
  tracker,
  gates: arena.gates,
  gateCount: arena.gates.length,
  airtime: 0,
  lapTime: 0,
  lapStart: 0,
  bestLap: Number(storageGet("whoop-best") || 0) || null,
  flyingLap: false,
  cam: "fpv",
  camLabel: "FPV 30°",
};

const chasePos = new THREE.Vector3();
const chaseLook = new THREE.Vector3();
const spawnQ = new THREE.Quaternion();

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  fpvCam.aspect = aspect;
  fpvCam.updateProjectionMatrix();
  chaseCam.aspect = aspect;
  chaseCam.updateProjectionMatrix();
  menuCam.aspect = aspect;
  menuCam.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function setMode(mode) {
  flight.mode = mode;
  storageSet("whoop-mode", mode);
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.classList.toggle("on", b.dataset.mode === mode);
  });
}
setMode(flight.mode);

document.getElementById("mode-row").addEventListener("click", (e) => {
  const b = e.target.closest(".mode-btn");
  if (b) setMode(b.dataset.mode);
});

function show(id, on) {
  document.getElementById(id).classList.toggle("hidden", !on);
}

function enterFly() {
  try {
    audio.unlock();
    audio.arm();
  } catch {
    /* headless / autoplay policy */
  }
  state.phase = "play";
  show("menu", false);
  show("pause", false);
  show("hud", true);
  if ("ontouchstart" in window) show("touch", true);
  resetDrone(true);
  resize();
}

function resetDrone(full) {
  const g = arena.gates[(tracker.next - 1 + arena.gates.length) % arena.gates.length];
  if (full || tracker.passed === 0) {
    flight.reset(arena.spawn.position, arena.spawn.yaw);
  } else {
    const p = g.position.clone().addScaledVector(g.dir, 0.35);
    p.y = Math.max(0.08, g.position.y - 0.15);
    flight.reset(p, g.yaw);
  }
  flight.mode = storageGet("whoop-mode") || "angle";
  state.airtime = full ? 0 : state.airtime;
  if (full) {
    tracker.next = 0;
    tracker.passed = 0;
    tracker.laps = 0;
    state.lapTime = 0;
    state.lapStart = 0;
    state.flyingLap = false;
  }
  for (const gate of arena.gates) {
    gate.lastDepth = 0;
    gate.armed = false;
  }
  input.throttle = 0;
  crashBanner = false;
}

document.getElementById("play").addEventListener("click", enterFly);
document.getElementById("resume").addEventListener("click", () => {
  state.phase = "play";
  show("pause", false);
});
document.getElementById("to-menu").addEventListener("click", () => {
  state.phase = "menu";
  show("pause", false);
  show("hud", false);
  show("touch", false);
  show("menu", true);
  audio.silence();
});

function bindTouch(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  });
}
bindTouch("touch-reset", () => resetDrone(true));
bindTouch("touch-cam", () => {
  state.cam = state.cam === "fpv" ? "chase" : "fpv";
});
bindTouch("touch-mode", () => setMode(flight.mode === "angle" ? "acro" : "angle"));
bindTouch("touch-pause", () => {
  if (state.phase === "play") {
    state.phase = "paused";
    show("pause", true);
    audio.silence();
  } else if (state.phase === "paused") {
    state.phase = "play";
    show("pause", false);
  }
});

const STEP = 1 / 180;
let acc = 0;
let last = performance.now();
let crashBanner = false;

function updateChase(dt) {
  flight.bodyAxes();
  const back = chasePos.copy(flight.fwd).multiplyScalar(-0.62);
  back.y += 0.28;
  back.add(flight.pos);
  chaseCam.position.lerp(back, 1 - Math.exp(-dt * 8));
  chaseLook.copy(flight.pos).addScaledVector(flight.fwd, 0.25);
  chaseLook.y += 0.05;
  chaseCam.lookAt(chaseLook);
}

function highlightGates() {
  for (const g of arena.gates) {
    const on = state.phase === "play" && g.id === tracker.next;
    const glow = g.mesh.userData.glow;
    if (glow) glow.material.opacity = on ? 0.22 : 0.07;
    for (const piece of g.mesh.userData.frame || []) {
      piece.material.emissiveIntensity = on ? 1.25 : 0.45;
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  try {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  document.documentElement.dataset.whoop = state.phase;

  if (state.phase === "menu") {
    const t = now * 0.00018;
    menuCam.position.set(Math.sin(t) * 1.35 - 0.55, 0.42, -6.55 + Math.cos(t) * 0.45);
    menuCam.lookAt(0.08, 0.22, -4.55);
    flight.pos.copy(arena.spawn.position);
    flight.pos.y = 0.09 + Math.sin(now * 0.0024) * 0.012;
    spawnQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.18 + Math.sin(now * 0.00055) * 0.22);
    flight.quat.copy(spawnQ);
    flight.motors.fill(0.28);
    drone.update(flight, dt);
    highlightGates();
    audio.silence();
    renderer.render(scene, menuCam);
    return;
  }

  input.poll(dt, state.phase === "play");
  if (input.pauseEdge) {
    if (state.phase === "play") {
      state.phase = "paused";
      show("pause", true);
    } else if (state.phase === "paused") {
      state.phase = "play";
      show("pause", false);
    }
  }

  if (state.phase === "paused") {
    audio.silence();
    renderer.render(scene, state.cam === "fpv" ? fpvCam : chaseCam);
    return;
  }

  if (input.modeEdge) setMode(flight.mode === "angle" ? "acro" : "angle");
  if (input.camEdge) state.cam = state.cam === "fpv" ? "chase" : "fpv";
  if (input.keys.Comma) camTilt = Math.max(0, camTilt - 25 * dt);
  if (input.keys.Period) camTilt = Math.min(55, camTilt + 25 * dt);
  applyFpvTilt();
  state.camLabel = `${state.cam === "fpv" ? "FPV" : "CHASE"} ${camTilt | 0}°`;

  if (input.resetEdge) {
    resetDrone(input.keys.ShiftLeft || input.keys.ShiftRight);
  }

  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 12) {
    flight.step(STEP, input, arena.colliders);
    acc -= STEP;
    steps++;
  }

  if (!flight.crashed) {
    state.airtime += dt;
    if (state.flyingLap) state.lapTime += dt;
    const ev = checkGate(flight, arena.gates, tracker);
    if (ev === "gate") {
      audio.gate();
      osd.flash(`GATE ${tracker.next === 0 ? arena.gates.length : tracker.next}`);
    } else if (ev === "lap") {
      audio.lap();
      if (state.flyingLap) {
        const t = state.lapTime;
        if (!state.bestLap || t < state.bestLap) {
          state.bestLap = t;
          storageSet("whoop-best", String(t));
          osd.flash(`BEST ${t.toFixed(2)}s`);
        } else osd.flash(`LAP ${t.toFixed(2)}s`);
      } else {
        osd.flash("LAP TIMING");
      }
      state.flyingLap = true;
      state.lapTime = 0;
    }
  } else if (!crashBanner) {
    crashBanner = true;
    audio.crash();
    osd.flash("CRASH  ·  TAP RESET");
  }

  drone.update(flight, dt);
  const avg = (flight.motors[0] + flight.motors[1] + flight.motors[2] + flight.motors[3]) * 0.25;
  audio.setMotors(avg, flight.vel.length(), flight.crashed);
  osd.update(dt, state);
  highlightGates();
  updateChase(dt);

  renderer.render(scene, flight.crashed || state.cam === "chase" ? chaseCam : fpvCam);
  } catch (err) {
    window.__whoopErr = String(err && err.stack ? err.stack : err);
    console.error(err);
  }
}

requestAnimationFrame(frame);

const boot = new URLSearchParams(location.search);
if (boot.get("cam") === "chase") state.cam = "chase";
if (boot.get("play") === "1") {
  enterFly();
  const thr = Number(boot.get("thr"));
  if (Number.isFinite(thr) && thr > 0) input.throttle = Math.min(1, thr);
  const pitch = Number(boot.get("pitch"));
  if (Number.isFinite(pitch)) input.pitch = Math.max(-1, Math.min(1, pitch));
  const roll = Number(boot.get("roll"));
  if (Number.isFinite(roll)) input.roll = Math.max(-1, Math.min(1, roll));
}

window.__whoop = { flight, state, input, enterFly, resetDrone, setMode, applyFpvTilt, renderer, scene, fpvCam, chaseCam, drone };
document.documentElement.dataset.whoop = state.phase;
