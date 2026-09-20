import { Vector2D } from '../engine/Vector2D.js';
import { TUNING } from '../sim/Tuning.js';

const CHIP_POOL = [];

export class OreParticle {
  constructor({ pos, vel, value, color, radius = 4 }) {
    this.reset({ pos, vel, value, color, radius });
  }

  reset({ pos, vel, value, color, radius = 4 }) {
    this.pos = pos;
    this.vel = vel;
    this.value = value;
    this.color = color;
    this.radius = radius;
    this.isMagnetized = false;
    this.targetCollectorId = null;
    this.collected = false;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(dt, playfield) {
    if (this.collected) {
      return;
    }
    this.pulse += dt * 6;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    if (!this.isMagnetized) {
      this.vel.mult(0.985);
    }

    const r = this.radius;
    if (this.pos.x - r <= 0 || this.pos.x + r >= playfield.width) {
      this.vel.x *= -0.7;
      this.pos.x = Math.max(r, Math.min(playfield.width - r, this.pos.x));
    }
    if (this.pos.y - r <= 0 || this.pos.y + r >= playfield.height) {
      this.vel.y *= -0.7;
      this.pos.y = Math.max(r, Math.min(playfield.height - r, this.pos.y));
    }
  }

  draw(ctx, reduced = false) {
    if (this.collected) {
      return;
    }
    if (!Number.isFinite(this.pos.x) || !Number.isFinite(this.pos.y)) {
      return;
    }
    const pulseR = Math.max(0.5, this.radius * (reduced ? 1 : 1 + 0.16 * Math.sin(this.pulse)));
    const dim = this.isMagnetized ? 1 : 0.92;
    ctx.save();
    ctx.globalAlpha = dim;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.pulse * 0.35);
    ctx.beginPath();
    ctx.moveTo(0, -pulseR * 1.35);
    ctx.lineTo(pulseR, 0);
    ctx.lineTo(0, pulseR * 1.35);
    ctx.lineTo(-pulseR, 0);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = this.isMagnetized ? 'rgba(248, 250, 252, 0.9)' : 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1.15;
    ctx.stroke();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-pulseR * 0.15, -pulseR * 0.7);
    ctx.lineTo(pulseR * 0.2, -pulseR * 0.15);
    ctx.lineTo(-pulseR * 0.05, pulseR * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function acquireOre(opts) {
  const chip = CHIP_POOL.pop();
  if (chip) {
    chip.reset(opts);
    return chip;
  }
  return new OreParticle(opts);
}

export function releaseOre(chip) {
  if (CHIP_POOL.length < TUNING.particleCap) {
    chip.collected = true;
    CHIP_POOL.push(chip);
  }
}

export function spawnOreBurst(asteroid, normal, oreValueMult, sectorMult, yieldMult = 1) {
  const particles = [];
  const impact = Vector2D.add(asteroid.pos, normal.copy().mult(asteroid.radius));
  const value = asteroid.unitValue * oreValueMult * sectorMult;
  const count = Math.max(1, Math.round(asteroid.yieldCount * yieldMult));
  const perp = new Vector2D(-normal.y, normal.x);
  for (let i = 0; i < count; i++) {
    const speed = 60 + Math.random() * 100;
    const side = Math.random() * 100 - 50;
    const vel = normal.copy().mult(speed).add(perp.copy().mult(side));
    particles.push(
      acquireOre({
        pos: impact.copy(),
        vel,
        value,
        color: asteroid.color
      })
    );
  }
  return particles;
}

export function spawnTapChip(pos, asteroid, value) {
  const jitter = new Vector2D(Math.random() * 40 - 20, Math.random() * 40 - 20);
  return acquireOre({
    pos: pos.copy(),
    vel: jitter,
    value,
    color: asteroid.color,
    radius: 3.2
  });
}

export function spawnSalvageChip(pos, value) {
  return acquireOre({
    pos: pos.copy(),
    vel: new Vector2D(Math.random() * 70 - 35, Math.random() * 40 - 70),
    value,
    color: '#7dd3fc',
    radius: 3.6
  });
}
