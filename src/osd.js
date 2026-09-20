function fmtTime(s) {
  if (s == null || s < 0) return "--.--";
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`;
}

export function createOsd() {
  const el = {
    mode: document.getElementById("osd-mode"),
    batt: document.getElementById("osd-batt"),
    rssi: document.getElementById("osd-rssi"),
    timer: document.getElementById("osd-timer"),
    lap: document.getElementById("osd-lap"),
    best: document.getElementById("osd-best"),
    spd: document.getElementById("osd-spd"),
    alt: document.getElementById("osd-alt"),
    amp: document.getElementById("osd-amp"),
    gate: document.getElementById("osd-gate"),
    cam: document.getElementById("osd-cam"),
    fill: document.getElementById("thr-fill"),
    banner: document.getElementById("banner"),
    horizon: document.getElementById("horizon-bar"),
    stickL: document.querySelector("#stick-l i"),
    stickR: document.querySelector("#stick-r i"),
    map: document.getElementById("minimap"),
  };
  const ctx = el.map.getContext("2d");
  let bannerT = 0;

  return {
    flash(text) {
      el.banner.textContent = text;
      el.banner.classList.add("show");
      bannerT = 1.15;
    },
    update(dt, state) {
      if (bannerT > 0) {
        bannerT -= dt;
        if (bannerT <= 0) el.banner.classList.remove("show");
      }
      const f = state.flight;
      const spd = f.vel.length();
      el.mode.textContent = f.mode.toUpperCase() + (f.crashed ? "  CRASH" : f.armed ? "  ARMED" : "  DISARM");
      el.mode.style.color = f.crashed ? "#ff3d7f" : f.mode === "acro" ? "#ffc857" : "#7dffb3";
      el.batt.textContent = `${f.voltage.toFixed(2)}V  1S`;
      el.batt.style.color = f.voltage < 3.5 ? "#ff3d7f" : "#ffc857";
      el.rssi.textContent = `LQ ${Math.max(70, 99 - (spd * 0.4) | 0)}`;
      el.timer.textContent = fmtTime(state.airtime);
      el.lap.textContent = `LAP ${fmtTime(state.lapTime)}`;
      el.best.textContent = `BEST ${fmtTime(state.bestLap)}`;
      el.spd.textContent = `${spd.toFixed(1)} m/s`;
      el.alt.textContent = `ALT ${f.pos.y.toFixed(2)}`;
      el.amp.textContent = `${f.amps.toFixed(1)} A`;
      el.gate.textContent = `GATE ${state.tracker.next + 1} / ${state.gateCount}`;
      el.cam.textContent = state.camLabel;
      el.fill.style.height = `${(f.throttle * 100).toFixed(0)}%`;

      const { pitch, roll } = f.tilt();
      el.horizon.style.transform = `rotate(${(-roll * 180) / Math.PI}deg) translateY(${(pitch * 40)}px)`;

      const i = state.input;
      el.stickL.style.transform = `translate(calc(-50% + ${i.yaw * 18}px), calc(-50% + ${(0.5 - i.throttle) * 36}px))`;
      el.stickR.style.transform = `translate(calc(-50% + ${i.roll * 18}px), calc(-50% + ${i.pitch * 18}px))`;

      const w = el.map.width;
      const h = el.map.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, w, h);
      const sx = w / 18;
      const sz = h / 14;
      const px = (x) => (x + 9) * sx;
      const pz = (z) => (z + 7) * sz;
      ctx.strokeStyle = "rgba(125,255,179,0.18)";
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.strokeStyle = "rgba(255,200,87,0.7)";
      ctx.beginPath();
      state.gates.forEach((g, idx) => {
        const x = px(g.position.x);
        const y = pz(g.position.z);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-g.yaw);
        ctx.strokeStyle = idx === state.tracker.next ? "#d4ff5a" : "rgba(255,255,255,0.35)";
        ctx.lineWidth = idx === state.tracker.next ? 2 : 1;
        ctx.strokeRect(-5, -2, 10, 4);
        ctx.restore();
      });
      const dx = px(f.pos.x);
      const dy = pz(f.pos.z);
      ctx.save();
      ctx.translate(dx, dy);
      const yaw = Math.atan2(f.fwd.x, f.fwd.z);
      ctx.rotate(-yaw);
      ctx.fillStyle = "#ff3d7f";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}
