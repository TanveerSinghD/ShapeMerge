import { SHAPES, WORLD, clamp } from "./constants.js";
import { applyMotion, collide } from "./physics.js";

export class ShapeMergeGame {
  constructor(ctx, statusEl, callbacks = {}) {
    this.ctx = ctx;
    this.statusEl = statusEl;
    this.callbacks = {
      onGameOver: callbacks.onGameOver || (() => {}),
      onGameCompleted: callbacks.onGameCompleted || (() => {}),
    };
    this.reset();
  }

  reset() {
    this.shapes = [];
    this.previewX = WORLD.width / 2;
    this.score = 0;
    this.isGameOver = false;
    this.isGameCompleted = false;
    this.lastTime = performance.now();
    this.nextId = 1;
    this.drops = 0;
    this.nextLevel = 0;
    this.lastSpawnedId = null;
    this.statusEl.textContent = "Click or tap to drop a triangle.";
  }

  drop() {
    if (this.isGameOver || this.isGameCompleted) return;
    this.spawnShape(this.previewX, this.nextLevel);
    this.drops += 1;
    this.nextLevel = this.pickNextLevel();
  }

  spawnFinal() {
    if (this.isGameOver || this.isGameCompleted) this.reset();
    const finalLevel = SHAPES.length - 1;
    this.spawnShape(this.previewX, finalLevel);
  }

  fillToTop() {
    if (this.isGameOver || this.isGameCompleted) this.reset();
    const shapes = [];
    const now = performance.now();
    const innerWidth = WORLD.width - WORLD.wall * 2;
    const spacing = 48;
    const cols = Math.max(3, Math.floor(innerWidth / spacing));
    const startX = WORLD.wall + (innerWidth - (cols - 1) * spacing) / 2;
    let id = this.nextId;
    for (let row = 0; row < 16; row++) {
      const y = WORLD.height - WORLD.floor - row * spacing - 10;
      if (y < 20) break;
      for (let col = 0; col < cols; col++) {
        const x = startX + col * spacing;
        const level = (row + col) % 2 === 0 ? 1 : 2;
        shapes.push({
          id: id++,
          x,
          y,
          vx: 0,
          vy: 0,
          level,
          angle: 0,
          spin: 0,
          bornAt: now,
          asleep: true,
          sleepTimer: WORLD.sleepThresholdTime,
          isKinematic: true,
          useGravity: false,
          contactSince: new Map(),
          topGraceStart: 0,
          topGraceYStart: 0,
        });
      }
    }
    this.nextId = id;
    this.shapes = shapes;
    this.lastSpawnedId = null;
    this.triggerGameOver("The stack has reached the top!");
  }

  pickNextLevel() {
    if (this.drops < 3) return 0;
    const roll = Math.random() * 100;
    if (roll < 65) return 0; // 65% triangle
    if (roll < 90) return 1; // next 25% square
    return 2; // final 10% pentagon
  }

  spawnShape(x, level) {
    const now = performance.now();
    const shape = {
      id: this.nextId++,
      x: clamp(x, WORLD.wall + SHAPES[level].radius, WORLD.width - WORLD.wall - SHAPES[level].radius),
      y: SHAPES[level].radius + 4,
      vx: 0,
      vy: 0,
      level,
      angle: Math.random() * Math.PI * 2,
      spin: 0,
      bornAt: now,
      cooldownUntil:
        now +
        (WORLD.spawnCooldownMin +
          Math.random() * (WORLD.spawnCooldownMax - WORLD.spawnCooldownMin)),
      asleep: false,
      sleepTimer: 0,
      isKinematic: false,
      useGravity: true,
      contactSince: new Map(),
      topGraceStart: 0,
      topGraceYStart: 0,
    };
    const { clear } = this.resolveSpawnOverlap(shape);
    this.shapes.push(shape);
    this.lastSpawnedId = shape.id;
    if (level === SHAPES.length - 1) {
      this.triggerGameCompleted();
    }
  }

  resolveSpawnOverlap(shape) {
    // Move the shape upward in small steps until it no longer overlaps others
    const maxSteps = 40;
    const step = 2;
    const r = SHAPES[shape.level].radius;
    let clear = true;
    for (let i = 0; i < maxSteps; i++) {
      const overlapping = this.shapes.some((other) => this.circleOverlap(shape, other));
      if (!overlapping) {
        clear = true;
        break;
      }
      clear = false;
      shape.y -= step;
    }
    const atTop = shape.y - r <= 0;
    shape.vx = 0;
    shape.vy = 0;
    shape.spin = 0;
    return { clear, atTop };
  }

  circleOverlap(a, b) {
    const ra = SHAPES[a.level].radius;
    const rb = SHAPES[b.level].radius;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.hypot(dx, dy);
    return dist < ra + rb;
  }

  setPreview(rawX) {
    this.previewX = rawX;
  }

  tryMerge(dist, a, b) {
    if (!dist) return false;
    return a.level === b.level && a.level < SHAPES.length - 1;
  }

  processMerges(mergePairs) {
    const toRemove = new Set();
    const now = performance.now();

    for (const [aIdx, bIdx, dist] of mergePairs) {
      if (toRemove.has(aIdx) || toRemove.has(bIdx)) continue;
      const a = this.shapes[aIdx];
      const b = this.shapes[bIdx];
      if (!a || !b) continue;
      if (this.tryMerge(dist, a, b)) {
        const level = a.level + 1;
        const nextShape = {
          id: this.nextId++,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          vx: (a.vx + b.vx) / 2,
          vy: (a.vy + b.vy) / 2,
          level,
          angle: Math.random() * Math.PI * 2,
          spin: Math.random() * 0.6 - 0.3,
          bornAt: now,
        };
        this.shapes.push(nextShape);
        this.score += level * 5;
        this.statusEl.textContent = `${SHAPES[level].name}! Score ${this.score}`;
        if (level === SHAPES.length - 1) {
          this.triggerGameCompleted();
        }
        toRemove.add(aIdx);
        toRemove.add(bIdx);
      }
    }

    if (toRemove.size) {
      this.shapes = this.shapes.filter((_, idx) => !toRemove.has(idx));
    }
  }

  triggerGameOver(message) {
    if (this.isGameOver || this.isGameCompleted) return;
    this.isGameOver = true;
    this.statusEl.textContent = message || "Game over.";
    this.callbacks.onGameOver();
  }

  triggerGameCompleted() {
    if (this.isGameCompleted) return;
    this.isGameCompleted = true;
    this.statusEl.textContent = "You reached the final shape! You win.";
    this.callbacks.onGameCompleted();
  }

  detectTopCollision(now) {
    if (!this.lastSpawnedId) return false;
    const s = this.shapes.find((shape) => shape.id === this.lastSpawnedId);
    if (!s) return false;
    const r = SHAPES[s.level].radius;
    const topLimit = 2;
    const nearTop = s.y - r <= topLimit;
    if (!nearTop) {
      s.topGraceStart = 0;
      s.topGraceYStart = 0;
      return false;
    }

    if (!s.topGraceStart) {
      s.topGraceStart = now;
      s.topGraceYStart = s.y;
      return false;
    }

    const elapsed = now - s.topGraceStart;
    const movedDown = s.y - s.topGraceYStart;
    const verticalNotFalling = s.vy > -0.05;
    const blocked = this.blockedDownward(s);

    if (!blocked) {
      s.topGraceStart = now;
      s.topGraceYStart = s.y;
      return false;
    }

    const graceMs = 700;
    if (elapsed >= graceMs && verticalNotFalling && movedDown < 0.1) {
      return true;
    }
    return false;
  }

  blockedDownward(target) {
    const r = SHAPES[target.level].radius;
    const stepDown = 6;
    const probeY = target.y + stepDown;
    if (probeY + r > WORLD.height - WORLD.floor) return true;
    for (const other of this.shapes) {
      if (other.id === target.id) continue;
      const rr = SHAPES[other.level].radius;
      const dx = target.x - other.x;
      const dy = probeY - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist < r + rr - 1) return true;
    }
    return false;
  }

  step(dt) {
    if (this.isGameOver || this.isGameCompleted) return;
    const now = performance.now();
    applyMotion(this.shapes, dt);
    const mergePairs = collide(this.shapes);
    this.processMerges(mergePairs);
    if (this.detectTopCollision(now)) {
      this.triggerGameOver("The stack has reached the top!");
    }
  }
}
