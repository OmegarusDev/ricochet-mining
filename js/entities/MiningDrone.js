import { Vector2D } from '../engine/Vector2D.js';

export class MiningDrone {
  constructor({ pos, vel, damage, maxHp, radius = 8 }) {
    this.pos = pos;
    this.vel = vel;
    this.radius = radius;
    this.damage = damage;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.trail = [];
    this.bounces = 0;
    this.bankT = 0;
    this.bounceLock = 0;
    this.rockLock = 0;
  }

  integrate(dt) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.bankT = Math.max(0, this.bankT - dt);
    this.bounceLock = Math.max(0, this.bounceLock - dt);
    this.rockLock = Math.max(0, this.rockLock - dt);
  }

  recordTrail() {
    this.trail.push(this.pos.copy());
    if (this.trail.length > 9) {
      this.trail.shift();
    }
  }

  isDestroyed() {
    return this.hp <= 0;
  }

  applyStats({ damage, maxHp, speed, radius }) {
    this.damage = damage;
    const wasDead = this.hp <= 0;
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = maxHp;
    if (wasDead) {
      this.hp = 0;
    } else {
      this.hp = Math.min(maxHp, Math.max(1, hpRatio * maxHp));
    }
    if (typeof radius === 'number') {
      this.radius = radius;
    }
    const mag = this.vel.mag();
    if (mag > 0) {
      this.vel.normalize().mult(speed);
    }
  }

  draw(ctx) {
    if (this.trail.length > 0) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const banked = this.bankT > 0;
      const n = this.trail.length;
      for (let i = 1; i <= n; i++) {
        const prev = this.trail[i - 1];
        const cur = i === n ? this.pos : this.trail[i];
        const t = i / n;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(cur.x, cur.y);
        ctx.strokeStyle = banked
          ? `rgba(251, 191, 36, ${0.12 + 0.7 * t})`
          : `rgba(56, 189, 248, ${0.1 + 0.62 * t})`;
        ctx.lineWidth = 1.1 + 2.6 * t;
        ctx.stroke();
      }
    }

    const heading = this.vel.magSq() > 4 ? this.vel.heading() : -Math.PI / 2;
    const pct = Math.max(0, this.hp / this.maxHp);
    const r = this.radius;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(heading);
    if (this.bankT > 0) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#fbbf24';
    } else {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
    }
    ctx.beginPath();
    ctx.moveTo(r + 3, 0);
    ctx.lineTo(-r * 0.85, r * 0.72);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 0.85, -r * 0.72);
    ctx.closePath();
    ctx.fillStyle = this.bankT > 0 ? '#fde68a' : `rgba(125, 211, 252, ${0.55 + pct * 0.45})`;
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = this.bankT > 0 ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.55)';
    ctx.moveTo(-r * 0.85, r * 0.28);
    ctx.lineTo(-r * 1.55, 0);
    ctx.lineTo(-r * 0.85, -r * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.strokeStyle = this.bankT > 0 ? 'rgba(251, 191, 36, 0.95)' : 'rgba(56, 189, 248, 0.9)';
    ctx.lineWidth = 1.7;
    ctx.arc(0, 0, r + 4, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pct);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#0f172a';
    ctx.arc(-r * 0.12, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function launchMiningDrone(stats, playfield) {
  const radius = stats.probeRadius || 8;
  const pos = new Vector2D(playfield.width / 2, playfield.height - radius - 26);
  const cone = (120 * Math.PI) / 180;
  const heading = -Math.PI / 2 + (Math.random() - 0.5) * cone;
  const vel = new Vector2D(Math.cos(heading), Math.sin(heading)).mult(stats.droneSpeed);
  return new MiningDrone({
    pos,
    vel,
    damage: stats.droneDamage,
    maxHp: stats.droneMaxHp,
    radius
  });
}
