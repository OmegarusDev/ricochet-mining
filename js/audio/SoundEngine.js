export class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.volume = 0.7;
    this._unlockBound = this.unlock.bind(this);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.audioCtx.currentTime,
        0.02
      );
    }
  }

  attachUnlock() {
    window.addEventListener('pointerdown', this._unlockBound, { passive: true });
    window.addEventListener('keydown', this._unlockBound);
    window.addEventListener('touchstart', this._unlockBound, { passive: true });
  }

  async unlock() {
    this.ensureContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('AudioContext resume failed.', err);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      window.removeEventListener('pointerdown', this._unlockBound);
      window.removeEventListener('keydown', this._unlockBound);
      window.removeEventListener('touchstart', this._unlockBound);
    }
  }

  ensureContext() {
    if (this.audioCtx) {
      return this.audioCtx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    this.audioCtx = new Ctx();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.audioCtx.destination);
    return this.audioCtx;
  }

  _ready() {
    return this.audioCtx && this.masterGain && this.audioCtx.state === 'running';
  }

  playLaunch() {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  playHit(damage) {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(Math.min(100 + damage * 2, 800), t);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playAsteroidBreak() {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const duration = 0.25;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.linearRampToValueAtTime(0.01, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
    source.stop(t + duration);
  }

  playCollect() {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    this._playSineTone(880, t, 0.04, 0.18);
    this._playSineTone(1320, t + 0.03, 0.05, 0.12);
  }

  playTap(crit = false) {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(crit ? 520 : 340, t);
    osc.frequency.exponentialRampToValueAtTime(crit ? 180 : 140, t + 0.05);
    gain.gain.setValueAtTime(crit ? 0.22 : 0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playUnload() {
    if (!this._ready()) {
      return;
    }
    this._playSineTone(523, this.audioCtx.currentTime, 0.05, 0.16);
    this._playSineTone(784, this.audioCtx.currentTime + 0.05, 0.08, 0.14);
  }

  playPurchase() {
    if (!this._ready()) {
      return;
    }
    this._playSineTone(660, this.audioCtx.currentTime, 0.06, 0.14);
    this._playSineTone(990, this.audioCtx.currentTime + 0.05, 0.08, 0.12);
  }

  playDeny() {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  playJob() {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    this._playSineTone(523, t, 0.07, 0.16);
    this._playSineTone(659, t + 0.06, 0.08, 0.14);
    this._playSineTone(784, t + 0.12, 0.1, 0.12);
  }

  playEvent() {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    this._playSineTone(196, t, 0.12, 0.14);
    this._playSineTone(392, t + 0.08, 0.16, 0.12);
  }

  playBounce() {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playProbeCrit() {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    this._playSineTone(740, t, 0.05, 0.16);
    this._playSineTone(1180, t + 0.03, 0.07, 0.12);
  }

  playLeak() {
    if (!this._ready()) {
      return;
    }
    this._playSineTone(980, this.audioCtx.currentTime, 0.035, 0.1);
  }

  _playSineTone(freq, start, duration, peak) {
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
