export class Renderer {
  constructor(engine) {
    this.engine = engine;
    this._cache = {
      key: '',
      nebula: [],
      vignette: null
    };
  }

  draw() {
    const engine = this.engine;
    const ctx = engine.ctx;
    const { width: W, height: H } = engine.playfield;
    const reduced = engine.state.settings.reducedMotion;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#050910';
    ctx.fillRect(0, 0, engine.view.cssW, engine.view.cssH);
    this._drawVoid(ctx, engine.view.cssW, engine.view.cssH, reduced);
    engine.applyViewTransform();
    ctx.save();
    if (engine.shake > 0 && !reduced) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-8, -8, W + 16, H + 16);
    this._drawStars(ctx, W, H, reduced);
    this._drawNebula(ctx, W, H, reduced);
    this._drawSectorTint(ctx, W, H);
    this._drawGrid(ctx, W, H);
    this._drawRail(ctx, W, H);
    this._drawDepot(ctx);
    for (const asteroid of engine.asteroids) {
      asteroid.draw(ctx, engine.playfield);
    }
    this._drawBolts(ctx);
    this._drawRipples(ctx);
    this._drawSparks(ctx);

    for (const particle of engine.particles) {
      particle.draw(ctx, reduced);
    }
    for (const collector of engine.collectors) {
      collector.draw(ctx);
    }
    for (const drone of engine.drones) {
      drone.draw(ctx);
    }
    this._drawFloating(ctx);
    if (engine.combo >= 2) {
      ctx.fillStyle = '#fde047';
      ctx.font = '800 16px ui-monospace, SFMono-Regular, Menlo, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO ×${engine.combo}`, 10, 18);
    }
    if (engine.stats.bankShot > 0 && engine.drones.some((drone) => drone.bankT > 0)) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 14px ui-monospace, SFMono-Regular, Menlo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('REBOUND', W - 10, 18);
    }
    if (engine.hint) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.82)';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FIRE THE LASER UNTIL IT SHATTERS', W / 2, 28);
    }
    if (engine.flash > 0) {
      ctx.fillStyle = `rgba(251, 191, 36, ${0.18 * (engine.flash / 0.25)})`;
      ctx.fillRect(0, 0, W, H);
    }
    this._drawVignette(ctx, W, H);
    ctx.restore();
    this._drawClaimWalls(ctx, W, H);
  }

  invalidate() {
    this._cache.key = '';
  }

  _cacheKey(width, height) {
    const tint = this.engine.stats.sector?.tint || '';
    return `${width}|${height}|${tint}|${this.engine.stars.length}`;
  }

  _ensureCache(ctx, width, height) {
    const key = this._cacheKey(width, height);
    if (this._cache.key === key && this._cache.vignette) {
      return;
    }
    this._cache.key = key;
    this._cache.nebula = (this.engine.nebula || []).map((cloud) => {
      const x = cloud.x * width;
      const y = cloud.y * height;
      const r = cloud.r * Math.max(width, height);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, cloud.tint);
      g.addColorStop(1, 'rgba(15, 23, 42, 0)');
      return { x, y, r, fill: g };
    });
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.35,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72
    );
    vignette.addColorStop(0, 'rgba(15, 23, 42, 0)');
    vignette.addColorStop(1, 'rgba(2, 6, 23, 0.42)');
    this._cache.vignette = vignette;
  }

  _drawVoid(ctx, width, height, reduced) {
    const t = this.engine.elapsed;
    for (const star of this.engine.stars) {
      if (star.layer) {
        continue;
      }
      const twinkle = reduced ? 0.55 : 0.4 + 0.35 * Math.sin(t * 1.1 + star.p);
      ctx.fillStyle = `rgba(148, 163, 184, ${star.a * twinkle})`;
      ctx.fillRect(star.x * width, star.y * height, 1.2, 1.2);
    }
  }

  _drawClaimWalls(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(8, 18, 32, 0.85)';
    ctx.lineWidth = 10;
    ctx.strokeRect(-2, -2, width + 4, height + 4);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    const b = Math.min(22, width * 0.06);
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'square';
    const corners = [
      [0, 0, 1, 1],
      [width, 0, -1, 1],
      [0, height, 1, -1],
      [width, height, -1, -1]
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * b, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * b);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawStars(ctx, width, height, reduced) {
    const t = this.engine.elapsed;
    for (const star of this.engine.stars) {
      const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * (star.layer ? 1.4 : 2.1) + star.p);
      const drift = reduced || !star.layer ? 0 : Math.sin(t * 0.05 + star.p) * 6;
      ctx.fillStyle = `rgba(186, 230, 253, ${star.a * twinkle})`;
      ctx.fillRect(star.x * width + drift, star.y * height, star.r + star.layer, star.r + star.layer);
    }
  }

  _drawNebula(ctx, width, height, reduced) {
    if (reduced) {
      return;
    }
    this._ensureCache(ctx, width, height);
    const drift = Math.sin(this.engine.elapsed * 0.07);
    for (const cloud of this._cache.nebula) {
      ctx.save();
      ctx.translate(drift * 8, 0);
      ctx.fillStyle = cloud.fill;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawRail(ctx, width, height) {
    const x = width / 2;
    const y = height - 8;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x - 28, y);
    ctx.lineTo(x, y - 18);
    ctx.lineTo(x + 28, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.fillRect(x - 22, y - 3, 44, 3);
  }

  _drawVignette(ctx, width, height) {
    this._ensureCache(ctx, width, height);
    ctx.fillStyle = this._cache.vignette;
    ctx.fillRect(0, 0, width, height);
  }

  _drawSectorTint(ctx, width, height) {
    const tint = this.engine.stats.sector?.tint;
    if (!tint) {
      return;
    }
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);
  }

  _drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.14)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      for (let x = 0; x <= width; x += 40) {
        ctx.fillRect(x - 0.5, y - 0.5, 1.6, 1.6);
      }
    }
  }

  _drawDepot(ctx) {
    const engine = this.engine;
    const depot = engine.depot();
    const pulse = engine.depotPulse > 0 ? engine.depotPulse / 0.45 : 0;
    ctx.fillStyle = `rgba(56, 189, 248, ${0.12 + pulse * 0.28})`;
    ctx.beginPath();
    ctx.arc(depot.x, depot.y, depot.r + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(depot.x, 12);
    ctx.lineTo(depot.x, depot.y - depot.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0b1a38';
    ctx.fillRect(depot.x - depot.w / 2, depot.y - depot.h / 2, depot.w, depot.h);
    ctx.strokeStyle = pulse > 0 ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 2 + pulse * 1.6;
    ctx.strokeRect(depot.x - depot.w / 2, depot.y - depot.h / 2, depot.w, depot.h);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(depot.x - depot.w / 2 + 8, depot.y - 3, depot.w - 16, 5);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REFINERY', depot.x, depot.y - depot.h / 2 - 6);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.beginPath();
    ctx.moveTo(depot.x - 10, depot.y - depot.h / 2 + 4);
    ctx.lineTo(depot.x, depot.y - depot.h / 2 - 4);
    ctx.lineTo(depot.x + 10, depot.y - depot.h / 2 + 4);
    ctx.fill();
  }

  _drawBolts(ctx) {
    for (const bolt of this.engine.bolts) {
      const nx = Math.cos(bolt.angle);
      const ny = Math.sin(bolt.angle);
      const len = 26;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(bolt.x - nx * len, bolt.y - ny * len);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.strokeStyle = bolt.payload?.crit ? '#fecaca' : '#ef4444';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(bolt.x - nx * len, bolt.y - ny * len);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
    }
  }

  _drawSparks(ctx) {
    for (const spark of this.engine.sparks) {
      const t = 1 - spark.age / spark.life;
      ctx.beginPath();
      ctx.fillStyle = spark.color;
      ctx.globalAlpha = Math.max(0, t);
      ctx.arc(spark.x, spark.y, spark.r * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawRipples(ctx) {
    for (const ripple of this.engine.ripples) {
      const t = ripple.age / ripple.life;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 * (1 - t)})`;
      ctx.lineWidth = 2;
      ctx.arc(ripple.x, ripple.y, 8 + t * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawFloating(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, sans-serif';
    for (const item of this.engine.floatingTexts) {
      ctx.globalAlpha = Math.max(0, 1 - item.age / item.life);
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.globalAlpha = 1;
  }
}
