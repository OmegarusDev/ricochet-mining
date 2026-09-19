export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    this.x /= n;
    this.y /= n;
    return this;
  }

  static add(v1, v2) {
    return new Vector2D(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1, v2) {
    return new Vector2D(v1.x - v2.x, v1.y - v2.y);
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  normalize() {
    const m = this.mag();
    if (m === 0) {
      this.x = 0;
      this.y = 0;
      return this;
    }
    return this.div(m);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  reflect(normal) {
    const d = this.dot(normal);
    this.x -= 2 * d * normal.x;
    this.y -= 2 * d * normal.y;
    return this;
  }

  clamp(max) {
    const m = this.mag();
    if (m > max && m > 0) {
      this.mult(max / m);
    }
    return this;
  }

  copy() {
    return new Vector2D(this.x, this.y);
  }
}
