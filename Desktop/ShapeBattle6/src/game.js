import { Path } from "./path.js";
import { Enemy } from "./enemy.js";
import { Tower, SHAPE_LIBRARY } from "./tower.js";

const SPECIAL_VARIANTS = [
  { name: "Plated", symbol: "P", hpMult: 2, armor: 0.25, scale: 0.05, color: "#b0bec5", borderColor: "#607d8b", speedMult: 0.95 },
  { name: "Fortified", symbol: "F", hpMult: 3, armor: 0.35, scale: 0.06, color: "#9fa8da", borderColor: "#5c6bc0", speedMult: 1 },
  { name: "Titan", symbol: "T", hpMult: 4, armor: 0.45, scale: 0.08, color: "#ffc38f", borderColor: "#f57c00", speedMult: 1.05 },
  { name: "Obsidian", symbol: "O", hpMult: 5, armor: 0.55, scale: 0.1, color: "#4a4a4a", borderColor: "#e53935", speedMult: 1.1 },
];

export class Game {
  constructor(canvas, uiHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = Number(canvas.dataset.logicalWidth) || canvas.width;
    this.height = Number(canvas.dataset.logicalHeight) || canvas.height;
    this.path = new Path(
      [
        { x: 60, y: 70 },
        { x: 900, y: 70 },
        { x: 900, y: 180 },
        { x: 200, y: 180 },
        { x: 200, y: 300 },
        { x: 780, y: 300 },
        { x: 780, y: 420 },
        { x: 140, y: 420 },
        { x: 140, y: 540 },
        { x: 920, y: 540 },
      ],
      55
    );
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.energy = 80;
    this.lives = 200;
    this.wave = 1;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnDelay = 0.7;
    this.spawnTimer = 0;
    this.selectedTower = null;
    this.lastFrame = performance.now();
    this.running = false;
    this.ui = uiHooks;
    this.loop = this.loop.bind(this);
    this.timeScale = 1;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.loop);
  }

  loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastFrame) / 1000, 0.05);
    this.lastFrame = timestamp;
    const scaledDt = dt * this.timeScale;
    this.update(scaledDt);
    this.draw();
    requestAnimationFrame(this.loop);
  }

  startWave() {
    if (this.waveActive) return;
    // Early waves start at ~5 HP and gain +2 per wave.
    const hp = Math.round(5 + (this.wave - 1) * 2);
    const count = Math.max(6, Math.round(6 + Math.pow(this.wave, 1.3)));
    const speed = 80 + Math.min(120, this.wave * 5);
    const specials = this.availableSpecials();
    const specialCount = specials.length ? Math.max(1, Math.round(count * 0.2)) : 0;
    const normalCount = count - specialCount;
    const queue = [];
    for (let i = 0; i < normalCount; i++) queue.push({ hp, speed, variant: null });
    for (let i = 0; i < specialCount; i++) {
      const variant = specials[i % specials.length];
      const hpBoost = variant.hpMult * (1 + variant.scale * (this.wave - 1));
      const vHp = Math.round(hp * hpBoost);
      const vSpeed = Math.round(speed * (variant.speedMult || 1));
      queue.push({ hp: vHp, speed: vSpeed, variant });
    }
    queue.sort(() => Math.random() - 0.5); // shuffle for variety
    this.spawnQueue = queue;
    this.waveActive = true;
    this.spawnTimer = 0.3;
  }

  addTower(type, x, y) {
    const config = SHAPE_LIBRARY[type];
    if (!config) return { success: false, reason: "Unknown shape" };
    if (this.energy < config.cost) {
      return { success: false, reason: "Not enough energy" };
    }
    if (this.path.isBlocked(x, y, 10)) {
      return { success: false, reason: "Too close to the path" };
    }
    for (const tower of this.towers) {
      const d = Math.hypot(x - tower.x, y - tower.y);
      if (d < 50) {
        return { success: false, reason: "Too close to another shape" };
      }
    }
    const tower = new Tower(type, x, y);
    this.towers.push(tower);
    this.energy -= config.cost;
    this.ui.onEnergyChange?.(this.energy);
    return { success: true, tower };
  }

  selectTower(x, y) {
    const hit = this.towers.find((t) => Math.hypot(x - t.x, y - t.y) < 26);
    this.selectedTower = hit || null;
    this.ui.onSelectionChange?.(this.selectedTower);
    return this.selectedTower;
  }

  upgradeSelected() {
    if (!this.selectedTower) return { success: false, reason: "Select a shape first" };
    const cost = this.selectedTower.upgradeCost;
    if (this.energy < cost) {
      return { success: false, reason: "Not enough energy" };
    }
    this.energy -= cost;
    this.selectedTower.upgrade();
    this.ui.onEnergyChange?.(this.energy);
    this.ui.onSelectionChange?.(this.selectedTower);
    return { success: true };
  }

  update(dt) {
    if (this.waveActive && this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const next = this.spawnQueue.shift();
        this.enemies.push(new Enemy(this.path, next.hp, next.speed, next.variant));
        this.spawnTimer = this.spawnDelay;
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(dt);
      if (enemy.dead && !enemy.counted) {
        enemy.counted = true;
        this.energy += this.energyForEnemy(enemy);
        this.ui.onEnergyChange?.(this.energy);
      }
      if (enemy.escaped && !enemy.scored) {
        enemy.scored = true;
        this.lives = Math.max(0, this.lives - 1);
        this.ui.onLivesChange?.(this.lives);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead && !e.escaped);

    for (const tower of this.towers) {
      const shot = tower.tryShoot(dt, this.enemies);
      if (shot) this.projectiles.push(shot);
    }

    for (const proj of this.projectiles) {
      proj.update(dt);
    }
    this.projectiles = this.projectiles.filter((p) => !p.expired);

    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      this.wave += 1;
      this.ui.onWaveComplete?.(this.wave);
    }
  }

  energyPerKill() {
    // Reduced energy to slow rush to high-tier shapes, scaling mildly with wave.
    return Math.max(3, Math.round(4 + (this.wave - 1) * 0.4));
  }

  energyForEnemy(enemy) {
    const hp = enemy.maxHp || 0;
    if (hp <= 45) return 5;
    if (hp <= 90) return 10;
    const tier = Math.ceil(hp / 45);
    return tier * 5;
  }

  availableSpecials() {
    const unlocked = Math.min(SPECIAL_VARIANTS.length, Math.floor((this.wave - 1) / 5));
    return SPECIAL_VARIANTS.slice(0, unlocked);
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.width, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawGrid();
    this.path.draw(ctx);

    for (const proj of this.projectiles) {
      proj.draw(ctx);
    }

    for (const tower of this.towers) {
      const isSelected = this.selectedTower === tower;
      tower.draw(ctx, isSelected);
    }

    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }

    if (this.lives <= 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#ff5d73";
      ctx.font = "bold 42px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("You were overrun", this.width / 2, this.height / 2);
      ctx.restore();
      this.running = false;
    }
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0.25, Math.min(scale, 4));
  }
}
