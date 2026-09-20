import { TUNING } from '../sim/Tuning.js';

export class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.volume = 0.7;
    this._unlockBound = this.unlock.bind(this);
    this._lastHit = -10;
    this._lastBreak = -10;
    this._lastCollect = -10;
    this._lastBounce = -10;
    this._gravelHits = null;
    this._gravelBreaks = null;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.02);
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
    this._buildGravel();
    return this.audioCtx;
  }

  _ready() {
    return this.audioCtx && this.masterGain && this.audioCtx.state === 'running';
  }

  _noise(seconds, crunch = 0.35) {
    const ctx = this.audioCtx;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * crunch) * 0.96;
      const pebble = Math.random() < 0.045 ? white * 0.9 : 0;
      data[i] = brown * 0.85 + white * 0.18 + pebble;
    }
    return buffer;
  }

  _buildGravel() {
    this._gravelHits = [this._noise(0.09, 0.42), this._noise(0.07, 0.5), this._noise(0.08, 0.38)];
    this._gravelBreaks = [this._noise(0.26, 0.28), this._noise(0.32, 0.22)];
  }

  _playGravel(buffers, { cutoff, peak, duration, q = 0.9 }) {
    if (!this._ready() || !buffers) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffers[Math.floor(Math.random() * buffers.length)];
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
    source.stop(t + duration + 0.02);
  }

  playHit(intensity = 10) {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    if (t - this._lastHit < TUNING.hitSoundGap) {
      return;
    }
    this._lastHit = t;
    const punch = Math.max(6, Number(intensity) || 10);
    this._playGravel(this._gravelHits, {
      cutoff: 520 + Math.min(520, punch * 6),
      peak: 0.2 + Math.min(0.22, punch / 220),
      duration: 0.08,
      q: 0.7
    });
  }

  playAsteroidBreak() {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    if (t - this._lastBreak < TUNING.breakSoundGap) {
      return;
    }
    this._lastBreak = t;
    this._playGravel(this._gravelBreaks, {
      cutoff: 240 + Math.random() * 90,
      peak: 0.48,
      duration: 0.28,
      q: 0.55
    });
  }

  playTap(crit = false) {
    this.playHit(crit ? 40 : 10);
  }

  playDrillCrit() {
    this.playHit(80);
  }

  playLeak() {
    if (!this._ready()) {
      return;
    }
    this._playGravel(this._gravelHits, {
      cutoff: 1400 + Math.random() * 400,
      peak: 0.08,
      duration: 0.05,
      q: 1.4
    });
  }

  playCollect() {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    if (t - this._lastCollect < 0.045) {
      return;
    }
    this._lastCollect = t;
    this._beep(880, 0.045, 0.07, 0, 'triangle');
    this._beep(1320, 0.03, 0.05, 0.02, 'sine');
  }

  playBounce() {
    if (!this._ready()) {
      return;
    }
    const t = this.audioCtx.currentTime;
    if (t - this._lastBounce < 0.05) {
      return;
    }
    this._lastBounce = t;
    this._beep(620 + Math.random() * 80, 0.05, 0.11, 0, 'square');
    this._beep(980, 0.04, 0.06, 0.02, 'sine');
  }

  playLaunch() {
    this._beep(392, 0.07, 0.09);
  }

  playPurchase() {
    this._beep(523, 0.05, 0.1);
    this._beep(784, 0.07, 0.08, 0.05);
  }

  playJob() {
    this.playPurchase();
  }

  playEvent() {
    this._beep(262, 0.1, 0.08);
  }

  playDeny() {
    this._beep(156, 0.11, 0.08, 0, 'square');
  }

  playUnload() {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(174, t);
    osc.frequency.exponentialRampToValueAtTime(98, t + 0.16);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  _beep(freq, duration, peak, delay = 0, type = 'sine') {
    if (!this._ready()) {
      return;
    }
    const ctx = this.audioCtx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
