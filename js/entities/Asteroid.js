import { Vector2D } from '../engine/Vector2D.js';
import { pickAsteroidTier } from '../ui/Upgrades.js';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function darkenHex(hex, amount = 0.35) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c) => Math.round(c * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function lightenHex(hex, amount = 0.35) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jaggedLine(from, to, bends, rng, radius) {
  const points = [from.copy()];
  for (let i = 1; i <= bends; i++) {
    const t = i / (bends + 1);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const wobble = (rng() - 0.5) * radius * 0.26;
    points.push(new Vector2D(x + (-dy / len) * wobble, y + (dx / len) * wobble));
  }
  points.push(to.copy());
  return points;
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total || 1;
}

function strokePartial(ctx, points, t) {
  if (t <= 0 || points.length < 2) {
    return;
  }
  const target = pathLength(points) * Math.min(1, t);
  let used = 0;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.hypot(dx, dy);
    if (used + len <= target) {
      ctx.lineTo(points[i].x, points[i].y);
      used += len;
    } else {
      const f = (target - used) / (len || 1);
      ctx.lineTo(points[i - 1].x + dx * f, points[i - 1].y + dy * f);
      break;
    }
  }
  ctx.stroke();
}

function buildCracks(vertices, radius, rng) {
  const cracks = [];
  const n = 8 + Math.floor(rng() * 5);
  for (let i = 0; i < n; i++) {
    const vert = vertices[Math.floor(rng() * vertices.length)];
    const start = new Vector2D((rng() - 0.5) * radius * 0.32, (rng() - 0.5) * radius * 0.32);
    const end = new Vector2D(vert.x * (0.86 + rng() * 0.14), vert.y * (0.86 + rng() * 0.14));
    const points = jaggedLine(start, end, 3 + Math.floor(rng() * 3), rng, radius);
    cracks.push({
      points,
      unlock: 0.012 + (i / Math.max(1, n - 1)) * 0.76,
      width: 1.15 + rng() * 1.55,
      grow: 0.07 + rng() * 0.1
    });
    if (rng() < 0.7) {
      const mid = points[Math.floor(points.length * (0.35 + rng() * 0.35))];
      const branchEnd = new Vector2D(
        mid.x + (rng() - 0.5) * radius * 0.55,
        mid.y + (rng() - 0.5) * radius * 0.55
      );
      cracks.push({
        points: jaggedLine(mid, branchEnd, 2 + Math.floor(rng() * 2), rng, radius),
        unlock: 0.08 + (i / Math.max(1, n - 1)) * 0.7,
        width: 0.8 + rng() * 1.1,
        grow: 0.08 + rng() * 0.1
      });
    }
  }

  let farA = vertices[0];
  let farB = vertices[Math.floor(vertices.length / 2)];
  let best = -1;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = vertices[i].dist(vertices[j]);
      if (d > best) {
        best = d;
        farA = vertices[i];
        farB = vertices[j];
      }
    }
  }
  cracks.push({
    points: jaggedLine(farA.copy().mult(0.9), farB.copy().mult(0.9), 4, rng, radius),
    unlock: 0.38 + rng() * 0.12,
    width: 2.1 + rng() * 0.8,
    grow: 0.14
  });
  return cracks;
}

function buildSpalls(vertices, rng) {
  const spalls = [];
  const count = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const index = Math.floor(rng() * vertices.length);
    const vert = vertices[index];
    const prev = vertices[(index + vertices.length - 1) % vertices.length];
    const next = vertices[(index + 1) % vertices.length];
    spalls.push({
      unlock: 0.34 + rng() * 0.36,
      points: [
        new Vector2D(vert.x * 0.98, vert.y * 0.98),
        new Vector2D(
          vert.x * 0.72 + prev.x * 0.16 + (rng() - 0.5) * 4,
          vert.y * 0.72 + prev.y * 0.16 + (rng() - 0.5) * 4
        ),
        new Vector2D(
          vert.x * 0.72 + next.x * 0.16 + (rng() - 0.5) * 4,
          vert.y * 0.72 + next.y * 0.16 + (rng() - 0.5) * 4
        )
      ]
    });
  }
  return spalls;
}

let nextAsteroidId = 1;

export class Asteroid {
  constructor({ pos, tier, hpMult = 1, driftSpeed = 0 }) {
    this.id = nextAsteroidId++;
    this.pos = pos;
    this.tier = tier;
    this.radius = tier.radius;
    this.color = tier.color;
    this.strokeColor = lightenHex(tier.color);
    this.shadeColor = darkenHex(tier.color, 0.45);
    this.maxHp = tier.baseHp * hpMult;
    this.hp = this.maxHp;
    this.yieldCount = tier.yield;
    this.unitValue = tier.unitValue;
    this.rotation = randRange(0, Math.PI * 2);
    this.spin = randRange(-0.35, 0.35);
    this.vertices = Asteroid.buildVertices(this.radius);
    const rng = rngFrom(this.id * 9973 + Math.floor(this.radius * 17));
    this.cracks = buildCracks(this.vertices, this.radius, rng);
    this.spalls = buildSpalls(this.vertices, rng);
    this.specks = [];
    const speckN = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < speckN; i++) {
      this.specks.push({
        x: (rng() - 0.5) * this.radius * 1.1,
        y: (rng() - 0.5) * this.radius * 1.1,
        r: 0.7 + rng() * 1.6,
        a: 0.12 + rng() * 0.22
      });
    }
    this.crackFlash = 0;
    const drift = 8 + randRange(0, 5) + (tier.drift || 0) + driftSpeed;
    const heading = randRange(0, Math.PI * 2);
    this.vel = new Vector2D(Math.cos(heading), Math.sin(heading)).mult(drift);
  }

  static buildVertices(radius) {
    const n = 8 + Math.floor(Math.random() * 5);
    const verts = [];
    for (let i = 0; i < n; i++) {
      const theta = (Math.PI * 2 * i) / n;
      const r = radius * (1 + randRange(-0.25, 0.25));
      verts.push(new Vector2D(r * Math.cos(theta), r * Math.sin(theta)));
    }
    return verts;
  }

  static spawn(playfield, sectorLevel, hpMult, existing = [], rareBias = 0, driftSpeed = 0) {
    const tier = pickAsteroidTier(sectorLevel, rareBias);
    const margin = tier.radius + 8;
    let pos = null;
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = new Vector2D(
        randRange(margin, playfield.width - margin),
        randRange(margin, playfield.height - margin * 2)
      );
      const blocked = existing.some(
        (other) => candidate.dist(other.pos) < other.radius + tier.radius + 12
      );
      if (!blocked) {
        pos = candidate;
        break;
      }
    }
    if (!pos) {
      pos = new Vector2D(playfield.width * 0.5, playfield.height * 0.35);
    }
    return new Asteroid({ pos, tier, hpMult, driftSpeed });
  }

  noteHit() {
    this.crackFlash = 0.2;
  }

  update(dt, playfield) {
    this.rotation += this.spin * dt;
    this.crackFlash = Math.max(0, this.crackFlash - dt);
    if (!this.vel || this.vel.magSq() <= 0) {
      return;
    }
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    const W = playfield.width;
    const H = playfield.height;
    const spanX = W + this.radius * 2;
    const spanY = H + this.radius * 2;
    this.pos.x = ((this.pos.x + this.radius) % spanX + spanX) % spanX - this.radius;
    this.pos.y = ((this.pos.y + this.radius) % spanY + spanY) % spanY - this.radius;
  }

  isDestroyed() {
    return this.hp <= 0;
  }

  damageFrac() {
    return 1 - Math.max(0, this.hp) / this.maxHp;
  }

  _ensureFill(ctx) {
    if (this._fill && this._fillCtx === ctx) {
      return this._fill;
    }
    const r = this.radius;
    const fill = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.08, r * 0.1, r * 0.18, r * 1.15);
    fill.addColorStop(0, this.strokeColor);
    fill.addColorStop(0.45, this.color);
    fill.addColorStop(1, this.shadeColor);
    this._fill = fill;
    this._fillCtx = ctx;
    return fill;
  }

  draw(ctx, playfield) {
    const damage = this.damageFrac();
    const rare = ['gold', 'platinum', 'dark', 'void', 'horizon'].includes(this.tier.id);
    let wrapFade = 1;
    if (playfield) {
      const overhang = Math.max(
        0,
        this.radius - this.pos.x,
        this.pos.x + this.radius - playfield.width,
        this.radius - this.pos.y,
        this.pos.y + this.radius - playfield.height
      );
      if (overhang > 0) {
        wrapFade = Math.max(0.08, 1 - overhang / Math.max(8, this.radius * 2));
      }
    }
    ctx.save();
    ctx.globalAlpha = wrapFade;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    const first = this.vertices[0];
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    const fill = this._ensureFill(ctx);
    if (rare && this.crackFlash > 0) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = `rgba(15, 23, 42, ${0.04 + damage * 0.42})`;
    ctx.fill();
    for (const speck of this.specks) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(15, 23, 42, ${speck.a + damage * 0.15})`;
      ctx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const crack of this.cracks) {
      const grown = (damage - crack.unlock) / crack.grow;
      if (grown <= 0) {
        continue;
      }
      const t = Math.min(1, grown);
      ctx.strokeStyle = `rgba(8, 15, 30, ${0.55 + t * 0.4})`;
      ctx.lineWidth = crack.width * (0.85 + t * 0.85);
      strokePartial(ctx, crack.points, t);
      ctx.strokeStyle = `rgba(51, 65, 85, ${0.28 + t * 0.35})`;
      ctx.lineWidth = Math.max(0.5, crack.width * 0.35);
      strokePartial(ctx, crack.points, t);
      if (this.crackFlash > 0) {
        ctx.strokeStyle = `rgba(248, 250, 252, ${0.55 * (this.crackFlash / 0.2)})`;
        ctx.lineWidth = Math.max(0.6, crack.width * 0.45);
        strokePartial(ctx, crack.points, t);
      }
    }
    for (const spall of this.spalls) {
      if (damage < spall.unlock) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(spall.points[0].x, spall.points[0].y);
      ctx.lineTo(spall.points[1].x, spall.points[1].y);
      ctx.lineTo(spall.points[2].x, spall.points[2].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.strokeColor;
    ctx.stroke();
    ctx.restore();
  }
}
