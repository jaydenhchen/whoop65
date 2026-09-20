import * as THREE from "three";

const GRAVITY = 9.81;
const RADIUS = 0.038;
const MAX_RATE = (820 * Math.PI) / 180;
const YAW_RATE = (520 * Math.PI) / 180;
const MAX_ANGLE = (48 * Math.PI) / 180;

function expo(x, e) {
  return x * (1 - e) + x * x * x * e;
}

function bfRate(x, rcRate, superRate, e) {
  const y = expo(x, e);
  const s = superRate;
  const p = 1 / Math.max(1e-5, 1 - Math.abs(y) * s);
  return rcRate * 200 * (Math.PI / 180) * y * p;
}

function bounce(vel, nx, ny, nz, rest = 0.18) {
  const vn = vel.x * nx + vel.y * ny + vel.z * nz;
  if (vn < 0) {
    vel.x -= (1 + rest) * vn * nx;
    vel.y -= (1 + rest) * vn * ny;
    vel.z -= (1 + rest) * vn * nz;
    vel.x *= 0.86;
    vel.y *= 0.9;
    vel.z *= 0.86;
  }
  return Math.abs(vn);
}

function collideAABB(pos, vel, r, min, max) {
  const inside =
    pos.x > min.x &&
    pos.x < max.x &&
    pos.y > min.y &&
    pos.y < max.y &&
    pos.z > min.z &&
    pos.z < max.z;

  let nx = 0;
  let ny = 0;
  let nz = 0;
  let hit = false;

  if (inside) {
    const dl = pos.x - min.x;
    const dr = max.x - pos.x;
    const db = pos.y - min.y;
    const dt = max.y - pos.y;
    const dn = pos.z - min.z;
    const df = max.z - pos.z;
    const m = Math.min(dl, dr, db, dt, dn, df);
    if (m === dl) nx = -1;
    else if (m === dr) nx = 1;
    else if (m === db) ny = -1;
    else if (m === dt) ny = 1;
    else if (m === dn) nz = -1;
    else nz = 1;
    pos.x += nx * (r + m);
    pos.y += ny * (r + m);
    pos.z += nz * (r + m);
    hit = true;
  } else {
    const cx = Math.max(min.x, Math.min(max.x, pos.x));
    const cy = Math.max(min.y, Math.min(max.y, pos.y));
    const cz = Math.max(min.z, Math.min(max.z, pos.z));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dz = pos.z - cz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 1e-6;
      nx = dx / d;
      ny = dy / d;
      nz = dz / d;
      const pen = r - d;
      pos.x += nx * pen;
      pos.y += ny * pen;
      pos.z += nz * pen;
      hit = true;
    }
  }
  return hit ? bounce(vel, nx, ny, nz) : 0;
}

function collideCyl(pos, vel, r, c) {
  if (pos.y + r < c.y0 || pos.y - r > c.y1) return 0;
  const dx = pos.x - c.x;
  const dz = pos.z - c.z;
  const d = Math.hypot(dx, dz);
  const lim = c.r + r;
  if (d >= lim) return 0;
  const nx = d < 1e-6 ? 1 : dx / d;
  const nz = d < 1e-6 ? 0 : dz / d;
  const pen = lim - (d || 0);
  pos.x += nx * pen;
  pos.z += nz * pen;
  return bounce(vel, nx, 0, nz, 0.12);
}

function collideYawBox(pos, vel, r, b) {
  const dx = pos.x - b.x;
  const dz = pos.z - b.z;
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const ly = pos.y - b.y;
  const cx = Math.max(-b.hx, Math.min(b.hx, lx));
  const cy = Math.max(-b.hy, Math.min(b.hy, ly));
  const cz = Math.max(-b.hz, Math.min(b.hz, lz));
  const qx = lx - cx;
  const qy = ly - cy;
  const qz = lz - cz;
  const d2 = qx * qx + qy * qy + qz * qz;
  if (d2 >= r * r && d2 > 1e-12) return 0;

  let nx;
  let ny;
  let nz;
  let pen;
  if (d2 < 1e-10) {
    const dl = lx + b.hx;
    const dr = b.hx - lx;
    const db = ly + b.hy;
    const dt = b.hy - ly;
    const dn = lz + b.hz;
    const df = b.hz - lz;
    const m = Math.min(dl, dr, db, dt, dn, df);
    if (m === dl) {
      nx = -1;
      ny = 0;
      nz = 0;
    } else if (m === dr) {
      nx = 1;
      ny = 0;
      nz = 0;
    } else if (m === db) {
      nx = 0;
      ny = -1;
      nz = 0;
    } else if (m === dt) {
      nx = 0;
      ny = 1;
      nz = 0;
    } else if (m === dn) {
      nx = 0;
      ny = 0;
      nz = -1;
    } else {
      nx = 0;
      ny = 0;
      nz = 1;
    }
    pen = r + m;
  } else {
    const d = Math.sqrt(d2);
    nx = qx / d;
    ny = qy / d;
    nz = qz / d;
    pen = r - d;
  }

  const wx = nx * c + nz * s;
  const wy = ny;
  const wz = -nx * s + nz * c;
  pos.x += wx * pen;
  pos.y += wy * pen;
  pos.z += wz * pen;
  return bounce(vel, wx, wy, wz, 0.14);
}

export class Flight {
  constructor(spawn) {
    this.mass = 0.032;
    this.twr = 3.8;
    this.spawn = spawn;
    this.mode = "angle";
    this.motors = [0, 0, 0, 0];
    this.omega = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.up = new THREE.Vector3();
    this.fwd = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.tmpQ = new THREE.Quaternion();
    this.tmpV = new THREE.Vector3();
    this.euler = new THREE.Euler();
    this.reset(spawn.position, spawn.yaw);
  }

  reset(position, yaw) {
    this.pos.copy(position || this.spawn.position);
    this.vel.set(0, 0, 0);
    this.omega.set(0, 0, 0);
    this.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw ?? this.spawn.yaw);
    this.armed = false;
    this.crashed = false;
    this.throttle = 0;
    this.mah = 0;
    this.voltage = 4.2;
    this.amps = 0;
    this.motors.fill(0);
    this.crashSpeed = 0;
    this.tumble = new THREE.Vector3();
  }

  bodyAxes() {
    this.right.set(1, 0, 0).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
    this.fwd.set(0, 0, 1).applyQuaternion(this.quat);
  }

  tilt() {
    this.bodyAxes();
    const pitch = Math.atan2(this.fwd.y, Math.hypot(this.fwd.x, this.fwd.z));
    const roll = Math.atan2(-this.right.y, this.up.y);
    return { pitch, roll };
  }

  step(dt, input, colliders) {
    if (this.crashed) {
      this.tumble.multiplyScalar(0.995);
      this.omega.copy(this.tumble);
      this._integrateOrientation(dt);
      this.vel.y -= GRAVITY * dt;
      this.vel.multiplyScalar(1 - 0.35 * dt);
      this.pos.addScaledVector(this.vel, dt);
      this._collide(colliders);
      this.motors.fill(0);
      this.amps = 0;
      return;
    }

    this.throttle = input.throttle;
    if (!this.armed && this.throttle > 0.08) this.armed = true;

    const idle = this.mode === "acro" && this.armed ? 0.07 : 0;
    const tcmd = this.armed ? Math.max(idle, this.throttle) : 0;

    let targetPitchRate;
    let targetRollRate;
    let targetYawRate;

    // Body +X = nose down, +Y = yaw right, +Z = roll left.
    // Stick forward (input.pitch < 0) pitches the nose down.
    if (this.mode === "angle") {
      const { pitch, roll } = this.tilt();
      const tp = input.pitch * MAX_ANGLE;
      const tr = input.roll * MAX_ANGLE;
      const cap = MAX_RATE * 0.55;
      targetPitchRate = Math.max(-cap, Math.min(cap, (pitch - tp) * 8.2));
      targetRollRate = Math.max(-cap, Math.min(cap, (roll - tr) * 8.2));
      targetYawRate = -bfRate(input.yaw, 1.0, 0.55, 0.4);
    } else {
      targetPitchRate = -bfRate(input.pitch, 1.15, 0.72, 0.45);
      targetRollRate = -bfRate(input.roll, 1.15, 0.72, 0.45);
      targetYawRate = -bfRate(input.yaw, 0.95, 0.55, 0.35);
      targetPitchRate = Math.max(-MAX_RATE, Math.min(MAX_RATE, targetPitchRate));
      targetRollRate = Math.max(-MAX_RATE, Math.min(MAX_RATE, targetRollRate));
      targetYawRate = Math.max(-YAW_RATE, Math.min(YAW_RATE, targetYawRate));
    }

    const k = 1 - Math.exp(-dt / 0.022);
    this.omega.x += (targetPitchRate - this.omega.x) * k;
    this.omega.z += (targetRollRate - this.omega.z) * k;
    this.omega.y += (targetYawRate - this.omega.y) * k;

    const mix = 0.28;
    const p = input.pitch;
    const r = input.roll;
    const y = input.yaw;
    this.motors[0] = tcmd + mix * (-r + p - y);
    this.motors[1] = tcmd + mix * (r + p + y);
    this.motors[2] = tcmd + mix * (r - p - y);
    this.motors[3] = tcmd + mix * (-r - p + y);
    for (let i = 0; i < 4; i++) this.motors[i] = Math.max(0, Math.min(1, this.motors[i]));

    const avg = (this.motors[0] + this.motors[1] + this.motors[2] + this.motors[3]) * 0.25;
    const hover = this.mass * GRAVITY;
    const maxT = hover * this.twr * Math.max(0.55, (this.voltage - 3.1) / 1.1);
    const thrust = avg * maxT;

    this.bodyAxes();
    const acc = this.tmpV.copy(this.up).multiplyScalar(thrust / this.mass);
    acc.y -= GRAVITY;

    const spd = this.vel.length();
    if (spd > 0.03) acc.addScaledVector(this.vel, -0.055 * spd - 0.28);

    if (this.pos.y < 0.16 && this.up.y > 0.72) {
      acc.addScaledVector(this.up, ((0.16 - this.pos.y) / 0.16) * 1.6);
    }

    this.vel.addScaledVector(acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    this._integrateOrientation(dt);
    const impact = this._collide(colliders);
    this.bodyAxes();
    const landing = this.pos.y < 0.14 && this.up.y > 0.4 && impact < 11;
    if (impact > 7.5 && !landing) this._crash(impact);

    this.mah += avg * 6.5 * dt;
    this.voltage = Math.max(3.2, 4.2 - this.mah / 280 - avg * 0.38);
    this.amps = avg * 9.5 + spd * 0.15;
  }

  _integrateOrientation(dt) {
    const w = this.omega.length();
    if (w > 1e-6) {
      this.tmpQ.setFromAxisAngle(this.tmpV.copy(this.omega).multiplyScalar(1 / w), w * dt);
      this.quat.multiply(this.tmpQ);
      this.quat.normalize();
    }
  }

  _collide(colliders) {
    let best = 0;
    for (const c of colliders) {
      let imp = 0;
      if (c.type === "aabb") imp = collideAABB(this.pos, this.vel, RADIUS, c.min, c.max);
      else if (c.type === "cyl") imp = collideCyl(this.pos, this.vel, RADIUS, c);
      else if (c.type === "yawbox") imp = collideYawBox(this.pos, this.vel, RADIUS, c);
      if (imp > best) best = imp;
    }
    if (this.pos.y < RADIUS) {
      this.pos.y = RADIUS;
      if (this.vel.y < 0) {
        best = Math.max(best, -this.vel.y);
        this.vel.y *= -0.15;
        this.vel.x *= 0.75;
        this.vel.z *= 0.75;
        if (Math.abs(this.vel.y) < 0.15) this.vel.y = 0;
      }
    }
    return best;
  }

  _crash(speed) {
    this.crashed = true;
    this.armed = false;
    this.crashSpeed = speed;
    this.tumble.set(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 18
    );
  }
}

export const DRONE_RADIUS = RADIUS;
