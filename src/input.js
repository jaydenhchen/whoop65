const prevent = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export class Input {
  constructor() {
    this.keys = Object.create(null);
    this.throttle = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.camEdge = false;
    this.modeEdge = false;
    this.resetEdge = false;
    this.pauseEdge = false;
    this.usingPad = false;
    this.touch = { l: null, r: null };
    this._edges = Object.create(null);

    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (prevent.has(e.code) || e.code === "KeyW" || e.code === "KeyS") {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener("blur", () => {
      this.keys = Object.create(null);
    });

    this._bindPads();
  }

  _bindPads() {
    const l = document.getElementById("pad-l");
    const r = document.getElementById("pad-r");
    if (!l) return;
    const bind = (el, side) => {
      const go = (ev) => {
        const t = ev.changedTouches ? ev.changedTouches[0] : ev;
        const rect = el.getBoundingClientRect();
        const x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((t.clientY - rect.top) / rect.height) * 2 - 1;
        this.touch[side] = {
          x: Math.max(-1, Math.min(1, x)),
          y: Math.max(-1, Math.min(1, y)),
        };
        const knob = el.querySelector("i");
        knob.style.transform = `translate(calc(-50% + ${this.touch[side].x * 36}px), calc(-50% + ${this.touch[side].y * 36}px))`;
      };
      const end = () => {
        this.touch[side] = null;
        el.querySelector("i").style.transform = "translate(-50%, -50%)";
      };
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture(e.pointerId);
        go(e);
      });
      el.addEventListener("pointermove", (e) => {
        if (this.touch[side]) go(e);
      });
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
    };
    bind(l, "l");
    bind(r, "r");
  }

  _edge(code) {
    const down = Boolean(this.keys[code]);
    const was = Boolean(this._edges[code]);
    this._edges[code] = down;
    return down && !was;
  }

  _gpEdge(buttons, i, name) {
    const down = Boolean(buttons && buttons[i] && buttons[i].pressed);
    const was = Boolean(this._edges[name]);
    this._edges[name] = down;
    return down && !was;
  }

  poll(dt, playing) {
    this.camEdge = this._edge("KeyC") || this._edge("KeyV");
    this.modeEdge = this._edge("KeyM");
    this.resetEdge = this._edge("KeyR");
    this.pauseEdge = this._edge("Escape") || this._edge("KeyP");

    let throttle = this.throttle;
    let yaw = 0;
    let pitch = 0;
    let roll = 0;
    this.usingPad = false;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads[0] || pads[1];
    if (gp && playing) {
      const dead = (v) => (Math.abs(v) < 0.08 ? 0 : v);
      const ly = dead(gp.axes[1] ?? 0);
      const lx = dead(gp.axes[0] ?? 0);
      const rx = dead(gp.axes[2] ?? 0);
      const ry = dead(gp.axes[3] ?? 0);
      const live = Math.abs(ly) + Math.abs(lx) + Math.abs(rx) + Math.abs(ry) > 0.02;
      if (live || gp.buttons?.[0]?.pressed) {
        this.usingPad = true;
        throttle = Math.max(0, Math.min(1, (-ly + 1) * 0.5));
        yaw = lx;
        roll = rx;
        pitch = ry;
      }
      this.resetEdge = this.resetEdge || this._gpEdge(gp.buttons, 0, "gpA");
      this.camEdge = this.camEdge || this._gpEdge(gp.buttons, 1, "gpB");
      this.modeEdge = this.modeEdge || this._gpEdge(gp.buttons, 3, "gpY");
      this.pauseEdge = this.pauseEdge || this._gpEdge(gp.buttons, 9, "gpStart");
    }

    if (this.touch.l || this.touch.r) {
      this.usingPad = false;
      if (this.touch.l) {
        yaw = this.touch.l.x;
        throttle = Math.max(0, Math.min(1, (-this.touch.l.y + 1) * 0.5));
      }
      if (this.touch.r) {
        roll = this.touch.r.x;
        pitch = this.touch.r.y;
      }
    } else if (!this.usingPad) {
      const k = this.keys;
      if (k.KeyW || k.Space) throttle += 1.35 * dt;
      if (k.KeyS) throttle -= 1.35 * dt;
      if (k.KeyX || k.KeyZ) throttle = 0;
      throttle = Math.max(0, Math.min(1, throttle));

      const targetYaw = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      const targetPitch =
        (k.ArrowUp || k.KeyI ? -1 : 0) + (k.ArrowDown || k.KeyK ? 1 : 0);
      const targetRoll =
        (k.ArrowRight || k.KeyL ? 1 : 0) - (k.ArrowLeft || k.KeyJ ? 1 : 0);

      const follow = (cur, tgt, rate) => {
        if (cur < tgt) return Math.min(tgt, cur + rate * dt);
        if (cur > tgt) return Math.max(tgt, cur - rate * dt);
        return tgt;
      };
      yaw = follow(this.yaw, targetYaw, targetYaw === 0 ? 8 : 10);
      pitch = follow(this.pitch, targetPitch, targetPitch === 0 ? 8 : 10);
      roll = follow(this.roll, targetRoll, targetRoll === 0 ? 8 : 10);
    }

    this.throttle = throttle;
    this.yaw = Math.max(-1, Math.min(1, yaw));
    this.pitch = Math.max(-1, Math.min(1, pitch));
    this.roll = Math.max(-1, Math.min(1, roll));
  }
}
