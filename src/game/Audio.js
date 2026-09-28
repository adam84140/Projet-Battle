// Sons synthétisés en direct avec la Web Audio API (aucun fichier audio requis).

export class Audio {
  constructor() {
    this.ctx = null;
    this.volume = 0.6;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.engine = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.comp = this.ctx.createDynamicsCompressor();
      this.master.connect(this.comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      return false;
    }
  }

  resume() {
    if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  setListener(x, y, z, yaw) {
    Object.assign(this.listener, { x, y, z, yaw });
  }

  // Gain + panoramique selon la distance à l'auditeur
  spatial(pos, maxDist = 120) {
    if (!pos) return { gain: 1, pan: 0 };
    const l = this.listener;
    const dx = pos.x - l.x;
    const dz = pos.z - l.z;
    const dist = Math.hypot(dx, dz, pos.y - l.y);
    if (dist > maxDist) return null;
    const gain = 1 / (1 + dist * 0.09);
    // côté droit de l'auditeur = (-cos yaw, sin yaw)
    const rx = -Math.cos(l.yaw);
    const rz = Math.sin(l.yaw);
    const pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist)) * 0.8 : 0;
    return { gain, pan };
  }

  out(sp) {
    const g = this.ctx.createGain();
    g.gain.value = sp.gain;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = sp.pan;
      g.connect(p).connect(this.master);
    } else g.connect(this.master);
    return g;
  }

  noiseBurst(dest, { dur = 0.15, freq = 1200, q = 0.8, type = 'bandpass', vol = 1, attack = 0.002, t = 0 }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    const now = c.currentTime + t;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(now, Math.random() * 1.0);
    src.stop(now + dur + 0.05);
  }

  tone(dest, { freq = 440, to = null, dur = 0.1, type = 'sine', vol = 0.5, t = 0 }) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    const now = c.currentTime + t;
    o.frequency.setValueAtTime(freq, now);
    if (to) o.frequency.exponentialRampToValueAtTime(to, now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g).connect(dest);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  shot(kind, pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 160);
    if (!sp) return;
    const d = this.out(sp);
    if (kind === 'sniper') {
      this.noiseBurst(d, { dur: 0.5, freq: 900, q: 0.5, vol: 1.2 });
      this.tone(d, { freq: 140, to: 40, dur: 0.35, vol: 0.9 });
    } else if (kind === 'mg') {
      this.noiseBurst(d, { dur: 0.13, freq: 700, q: 0.7, vol: 0.9 });
      this.tone(d, { freq: 110, to: 50, dur: 0.1, vol: 0.6 });
    } else if (kind === 'tank') {
      this.noiseBurst(d, { dur: 0.9, freq: 300, q: 0.4, vol: 1.4, type: 'lowpass' });
      this.tone(d, { freq: 90, to: 25, dur: 0.7, vol: 1.2 });
    } else {
      this.noiseBurst(d, { dur: 0.11, freq: 1300, q: 0.9, vol: 0.9 });
      this.tone(d, { freq: 160, to: 60, dur: 0.08, vol: 0.5 });
    }
  }

  explosion(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 250);
    if (!sp) return;
    const d = this.out(sp);
    this.noiseBurst(d, { dur: 1.3, freq: 420, q: 0.3, vol: 1.6, type: 'lowpass', attack: 0.005 });
    this.tone(d, { freq: 80, to: 22, dur: 1.0, vol: 1.4 });
  }

  hit(kill = false, head = false) {
    if (!this.ctx) return;
    const d = this.out({ gain: 0.6, pan: 0 });
    if (kill) {
      this.tone(d, { freq: 880, dur: 0.09, type: 'triangle', vol: 0.5 });
      this.tone(d, { freq: 1320, dur: 0.16, type: 'triangle', vol: 0.5, t: 0.08 });
    } else {
      this.tone(d, { freq: head ? 2400 : 1700, dur: 0.05, type: 'square', vol: 0.18 });
    }
  }

  hurt() {
    if (!this.ctx) return;
    const d = this.out({ gain: 0.5, pan: 0 });
    this.noiseBurst(d, { dur: 0.12, freq: 300, q: 1, vol: 0.6, type: 'lowpass' });
  }

  reload(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 30);
    if (!sp) return;
    const d = this.out(sp);
    this.noiseBurst(d, { dur: 0.05, freq: 3000, q: 3, vol: 0.5 });
    this.noiseBurst(d, { dur: 0.06, freq: 2200, q: 3, vol: 0.6, t: 0.35 });
  }

  empty() {
    if (!this.ctx) return;
    const d = this.out({ gain: 0.4, pan: 0 });
    this.noiseBurst(d, { dur: 0.03, freq: 4000, q: 4, vol: 0.5 });
  }

  ability(kind) {
    if (!this.ctx) return;
    const d = this.out({ gain: 0.5, pan: 0 });
    if (kind === 'heal') {
      [660, 880, 1100].forEach((f, i) => this.tone(d, { freq: f, dur: 0.18, type: 'sine', vol: 0.3, t: i * 0.07 }));
    } else if (kind === 'throw') {
      this.noiseBurst(d, { dur: 0.25, freq: 800, q: 0.6, vol: 0.4 });
    } else {
      this.tone(d, { freq: 300, to: 900, dur: 0.25, type: 'sawtooth', vol: 0.18 });
    }
  }

  capture(good) {
    if (!this.ctx) return;
    const d = this.out({ gain: 0.5, pan: 0 });
    const notes = good ? [523, 659, 784, 1046] : [523, 440, 349];
    notes.forEach((f, i) => this.tone(d, { freq: f, dur: 0.22, type: 'triangle', vol: 0.35, t: i * 0.11 }));
  }

  ui() {
    if (!this.ctx) return;
    const d = this.out({ gain: 0.3, pan: 0 });
    this.tone(d, { freq: 1200, dur: 0.04, type: 'triangle', vol: 0.3 });
  }

  // Moteur de véhicule (son continu)
  setEngine(on, speed01 = 0, heavy = false) {
    if (!this.ctx) return;
    if (on && !this.engine) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      const g = this.ctx.createGain();
      g.gain.value = 0.12;
      o.connect(f).connect(g).connect(this.master);
      o.start();
      this.engine = { o, f, g };
    }
    if (!on && this.engine) {
      this.engine.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      const e = this.engine;
      setTimeout(() => e.o.stop(), 400);
      this.engine = null;
    }
    if (this.engine) {
      const base = heavy ? 38 : 55;
      this.engine.o.frequency.setTargetAtTime(base + speed01 * (heavy ? 40 : 90), this.ctx.currentTime, 0.1);
      this.engine.f.frequency.setTargetAtTime(300 + speed01 * 700, this.ctx.currentTime, 0.1);
    }
  }
}
