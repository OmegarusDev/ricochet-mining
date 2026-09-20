import { Vector2D } from '../engine/Vector2D.js';

export const CollectorState = {
  IDLE: 'IDLE',
  SEEKING: 'SEEKING',
  MAGNET_PULL: 'MAGNET_PULL',
  RETURNING: 'RETURNING',
  UNLOADING: 'UNLOADING'
};

export class CollectorDrone {
  constructor({ id, pos, maxSpeed, magnetRadius, capacity = 2, radius = 10 }) {
    this.id = id;
    this.pos = pos;
    this.vel = new Vector2D();
    this.radius = radius;
    this.maxSpeed = maxSpeed;
    this.magnetRadius = magnetRadius;
    this.capacity = capacity;
    this.state = CollectorState.IDLE;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.thrust = [];
    this.targetParticle = null;
    this.cargo = [];
    this.unloadLock = 0;
    this.unloadAcc = 0;
  }

  applyStats({ maxSpeed, magnetRadius, capacity }) {
    this.maxSpeed = maxSpeed;
    this.magnetRadius = magnetRadius;
    if (typeof capacity === 'number') {
      this.capacity = capacity;
    }
  }

  get used() {
    return this.cargo.length;
  }

  get full() {
    return this.cargo.length >= this.capacity;
  }

  cargoValue() {
    return this.cargo.reduce((sum, chip) => sum + chip.value, 0);
  }

  depotTarget(depot) {
    return new Vector2D(depot.x, depot.y);
  }

  update(dt, playfield, particles, depot, stats) {
    this.hoverTime += dt;
    this.unloadLock = Math.max(0, this.unloadLock - dt);
    const live = particles.filter((p) => !p.collected);
    const nearDepot = this.pos.dist(this.depotTarget(depot)) <= depot.r;

    this.steerRate = stats.steerRate || 8;
    const returnBoost = stats.returnBoost || 1;
    const magnetScale = nearDepot ? 1 + (stats.depotPull || 0) : 1;

    if (this.full || (this.used > 0 && live.length === 0)) {
      this.state = nearDepot ? CollectorState.UNLOADING : CollectorState.RETURNING;
      this._clearClaim();
      this._seek(this.depotTarget(depot), dt, this.maxSpeed * returnBoost);
    } else if (this.used > 0 && this._depotCloserThanOre(live, depot)) {
      this.state = nearDepot ? CollectorState.UNLOADING : CollectorState.RETURNING;
      this._clearClaim();
      this._seek(this.depotTarget(depot), dt, this.maxSpeed * returnBoost);
    } else if (live.length === 0 && this.used === 0) {
      this.state = CollectorState.IDLE;
      this._seek(this._idleTarget(playfield, depot), dt, this.maxSpeed * 0.28);
    } else {
      this._updateSeek(dt, live, stats);
      if (!this.full) {
        this._applyMagnet(dt, live, this.magnetRadius * magnetScale);
      }
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this._clampToPlayfield(playfield);
    this._emitThrust(dt);
  }

  _idleTarget(playfield, depot) {
    return new Vector2D(
      depot.x + Math.sin(this.hoverTime) * 28,
      depot.y - 36 + Math.cos(this.hoverTime * 0.7) * 10
    );
  }

  _depotCloserThanOre(particles, depot) {
    const pad = this.depotTarget(depot);
    const padDist = this.pos.dist(pad);
    let nearest = Infinity;
    for (const particle of particles) {
      const d = this.pos.dist(particle.pos);
      if (d < nearest) {
        nearest = d;
      }
    }
    return padDist <= nearest;
  }

  _clearClaim() {
    if (this.targetParticle && this.targetParticle.targetCollectorId === this.id) {
      this.targetParticle.targetCollectorId = null;
    }
    this.targetParticle = null;
  }

  _score(particle, stats) {
    const dist = Math.max(12, this.pos.dist(particle.pos));
    const valueWeight = 1 + (stats.valueSeek || 0) * particle.value;
    return valueWeight / dist;
  }

  _updateSeek(dt, particles, stats) {
    if (
      this.targetParticle &&
      (this.targetParticle.collected || this.targetParticle.targetCollectorId !== this.id)
    ) {
      this.targetParticle = null;
    }
    if (!this.targetParticle) {
      let best = null;
      let bestScore = -Infinity;
      for (const particle of particles) {
        if (particle.targetCollectorId !== null) {
          continue;
        }
        const score = this._score(particle, stats);
        if (score > bestScore) {
          bestScore = score;
          best = particle;
        }
      }
      if (best) {
        best.targetCollectorId = this.id;
        this.targetParticle = best;
      }
    }
    if (this.targetParticle) {
      this.state = CollectorState.SEEKING;
      this._seek(this.targetParticle.pos, dt, this.maxSpeed);
    }
  }

  _seek(target, dt, maxSpeed) {
    const desired = Vector2D.sub(target, this.pos);
    if (desired.magSq() === 0) {
      return;
    }
    desired.normalize().mult(maxSpeed);
    const steer = Vector2D.sub(desired, this.vel);
    this.vel.add(steer.mult(Math.min(1, dt * (this.steerRate || 8)))).clamp(maxSpeed);
  }

  _applyMagnet(dt, particles, radius = this.magnetRadius) {
    let pulling = false;
    for (const particle of particles) {
      const dist = this.pos.dist(particle.pos);
      if (dist <= radius) {
        pulling = true;
        particle.isMagnetized = true;
        const pull = Vector2D.sub(this.pos, particle.pos);
        if (pull.magSq() > 0) {
          pull.normalize().mult(620);
        }
        particle.vel.add(pull.mult(dt)).mult(0.95);
      }
    }
    if (pulling) {
      this.state = CollectorState.MAGNET_PULL;
    }
  }

  _clampToPlayfield(playfield) {
    const r = this.radius;
    this.pos.x = Math.max(r, Math.min(playfield.width - r, this.pos.x));
    this.pos.y = Math.max(r, Math.min(playfield.height - r, this.pos.y));
  }

  _emitThrust(dt) {
    const speed = this.vel.mag();
    if (speed > 12) {
      const heading = this.vel.heading();
      const rear = new Vector2D(
        this.pos.x - Math.cos(heading) * (this.radius + 2),
        this.pos.y - Math.sin(heading) * (this.radius + 2)
      );
      this.thrust.push({
        pos: rear,
        life: 0.22,
        age: 0,
        radius: 2 + Math.random() * 1.6
      });
    }
    for (const p of this.thrust) {
      p.age += dt;
    }
    this.thrust = this.thrust.filter((p) => p.age < p.life);
  }

  draw(ctx) {
    for (const p of this.thrust) {
      const a = 1 - p.age / p.life;
      ctx.beginPath();
      ctx.fillStyle = `rgba(245, 158, 11, ${0.75 * a})`;
      ctx.arc(p.pos.x, p.pos.y, p.radius * a, 0, Math.PI * 2);
      ctx.fill();
    }

    const heading = this.vel.magSq() > 4 ? this.vel.heading() : -Math.PI / 2;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(heading);
    ctx.beginPath();
    ctx.moveTo(this.radius + 2, 0);
    ctx.lineTo(-this.radius * 0.75, this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.35, 0);
    ctx.lineTo(-this.radius * 0.75, -this.radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = this.full ? '#f97316' : '#fbbf24';
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.arc(-this.radius * 0.08, 0, this.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(253, 230, 138, 0.55)';
    ctx.arc(-this.radius * 0.08, 0, this.radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pips = Math.min(this.capacity, 8);
    if (pips > 0 && this.capacity <= 8) {
      const pipW = 3;
      const gap = 1.5;
      const total = pips * pipW + (pips - 1) * gap;
      let x = this.pos.x - total / 2;
      const y = this.pos.y + this.radius + 4;
      for (let i = 0; i < pips; i++) {
        ctx.fillStyle = i < this.used ? (this.full ? '#f59e0b' : '#38bdf8') : '#334155';
        ctx.fillRect(x, y, pipW, 3);
        x += pipW + gap;
      }
    } else {
      const barW = 18;
      const barH = 3;
      const pct = this.capacity > 0 ? this.used / this.capacity : 0;
      ctx.fillStyle = '#334155';
      ctx.fillRect(this.pos.x - barW / 2, this.pos.y + this.radius + 4, barW, barH);
      ctx.fillStyle = this.full ? '#f59e0b' : '#38bdf8';
      ctx.fillRect(this.pos.x - barW / 2, this.pos.y + this.radius + 4, barW * pct, barH);
    }
  }
}
