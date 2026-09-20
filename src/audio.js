export class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = "sawtooth";
    oscB.type = "sawtooth";
    oscA.frequency.value = 90;
    oscB.frequency.value = 96;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0;
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.value = 1200;
    oscA.connect(oscFilter);
    oscB.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);
    oscA.start();
    oscB.start();

    this.ctx = ctx;
    this.master = master;
    this.noiseGain = noiseGain;
    this.noiseFilter = noiseFilter;
    this.oscA = oscA;
    this.oscB = oscB;
    this.oscGain = oscGain;
    this.oscFilter = oscFilter;
    } catch {
      this.ctx = null;
    }
  }

  setMotors(avg, airspeed, crashed) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (crashed || avg < 0.02) {
      this.oscGain.gain.setTargetAtTime(0, t, 0.04);
      this.noiseGain.gain.setTargetAtTime(0, t, 0.05);
      return;
    }
    const f = 70 + avg * 520;
    this.oscA.frequency.setTargetAtTime(f, t, 0.05);
    this.oscB.frequency.setTargetAtTime(f * 1.06, t, 0.05);
    this.oscFilter.frequency.setTargetAtTime(700 + avg * 1800, t, 0.08);
    this.oscGain.gain.setTargetAtTime(0.012 + avg * 0.05, t, 0.05);
    this.noiseFilter.frequency.setTargetAtTime(600 + airspeed * 80, t, 0.08);
    this.noiseGain.gain.setTargetAtTime(0.01 + avg * 0.04 + airspeed * 0.004, t, 0.08);
  }

  silence() {
    this.setMotors(0, 0, true);
  }

  blip(freq, dur = 0.12, type = "square", gain = 0.08) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(this.master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.stop(this.ctx.currentTime + dur + 0.02);
  }

  arm() {
    this.blip(880, 0.06);
    setTimeout(() => this.blip(1320, 0.08), 70);
  }

  gate() {
    this.blip(1480, 0.07, "triangle", 0.07);
  }

  lap() {
    this.blip(660, 0.08, "square", 0.08);
    setTimeout(() => this.blip(990, 0.1, "square", 0.08), 90);
    setTimeout(() => this.blip(1320, 0.16, "square", 0.09), 180);
  }

  crash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = 0.18;
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    const src = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }
}
