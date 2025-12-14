const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const xpFill = document.getElementById("xpFill");
const xpLabel = document.getElementById("xpLabel");
const levelLabel = document.getElementById("levelLabel");
const hpLabel = document.getElementById("hpLabel");
const buildLabel = document.getElementById("buildLabel");
const upgradeHud = document.getElementById("upgradeHud");
const weaponPopup = document.getElementById("weaponPopup");
const startMenu = document.getElementById("startMenu");
const difficultyList = document.getElementById("difficultyList");
const classList = document.getElementById("classList");
const startButton = document.getElementById("startButton");
const autoButton = document.getElementById("autoButton");
const cooldownBar = document.getElementById("cooldownBar");
const cooldownFill = document.getElementById("cooldownFill");
const cooldownLabel = document.getElementById("cooldownLabel");
const adminPanel = document.getElementById("adminPanel");
const adminToggle = document.getElementById("adminToggle");
const adminBulletRow = document.getElementById("adminBulletRow");

const MAX_LEVEL = 60;
const TOKEN_LEVEL_CAP = 40;
const BASE_SPEED = 320;
const BASE_DRAG = 0.98;
const BASE_BULLET_SPEED = 780;
const BASE_BULLET_LIFE = 1.6;
const BASE_RELOAD = 0.38;
const POWERUP_COOLDOWN = 10;
const gameState = {
  started: false,
  over: false,
  difficulty: "easy",
  classChoice: "assault",
};

const difficulties = {
  easy: {
    worldSize: 2600,
    blockCount: 80,
    bots: {
      count: 4,
      speed: 210,
      damage: 18,
      reload: 1.2,
      health: 100,
      bulletSpeed: 540,
      aggroRange: 280,
    },
  },
  medium: {
    worldSize: 3200,
    blockCount: 95,
    bots: {
      count: 7,
      speed: 230,
      damage: 22,
      reload: 1.0,
      health: 130,
      bulletSpeed: 620,
      aggroRange: 300,
    },
  },
  hard: {
    worldSize: 3800,
    blockCount: 110,
    bots: {
      count: 10,
      speed: 260,
      damage: 28,
      reload: 0.9,
      health: 160,
      bulletSpeed: 700,
      aggroRange: 320,
    },
  },
};

const classes = {
  assault: { name: "Assault", description: "Balanced cannons with sustained fire." },
  sniper: { name: "Sniper", description: "High damage rails and lances." },
  spread: { name: "Spread", description: "Wide spreads and close-range storms." },
  bruiser: { name: "Bruiser", description: "Heavy cannons and tanky volleys." },
  flamethrower: { name: "Flamethrower", description: "Short-range fire that scales distance." },
};

const world = {
  size: 2600,
  grid: 70,
  blocks: [],
  bullets: [],
  powerups: [],
  bots: [],
  mega: null,
  megaRespawn: 0,
};

const player = {
  pos: { x: world.size / 2, y: world.size / 2 },
  vel: { x: 0, y: 0 },
  radius: 26,
  speed: BASE_SPEED,
  drag: BASE_DRAG,
  health: 130,
  maxHealth: 130,
  regen: 6,
  reload: BASE_RELOAD,
  fireTimer: 0,
  bulletSpeed: BASE_BULLET_SPEED,
  bulletLife: BASE_BULLET_LIFE,
  bulletSize: 10,
  bulletDamage: 25,
  recoil: 0.2,
  level: 1,
  xp: 0,
  upgradePoints: 0,
  barrels: 1,
  buildName: "Single Barrel",
  regenDelay: 0,
};

const upgrades = [
  {
    key: "1",
    name: "Damage",
    level: 0,
    color: "#ff6b6b",
    apply: () => {
      player.bulletDamage += 5;
      player.bulletSize += 0.5;
    },
    description: "Heavier shots",
  },
  {
    key: "2",
    name: "Reload",
    level: 0,
    color: "#5ad86a",
    apply: () => {
      if (gameState.classChoice === "flamethrower") return;
      player.reload = Math.max(0.16, player.reload - 0.03);
      player.bulletLife += 0.05;
    },
    description: "Faster fire rate",
  },
  {
    key: "3",
    name: "Mobility",
    level: 0,
    color: "#2b8df8",
    apply: () => {
      const targetLevel = upgrades.find((u) => u.key === "3")?.level ?? 0;
      const nextLevel = targetLevel + 1;
      const speedFactor = Math.min(2, 1 + nextLevel * 0.1); // up to 2x at level 10
      player.speed = BASE_SPEED * speedFactor;
      player.drag = Math.min(0.995, BASE_DRAG + nextLevel * 0.002);
    },
    description: "More speed",
  },
  {
    key: "4",
    name: "Defense",
    level: 0,
    color: "#c58afd",
    apply: () => {
      player.maxHealth += 111;
      player.health = Math.min(player.maxHealth, player.health + 111);
      player.regen += 1.2;
    },
    description: "Survive longer",
  },
  {
    key: "5",
    name: "Bullet Speed",
    level: 0,
    color: "#ffa94d",
    apply: () => {
      const targetLevel = getUpgradeLevel("5");
      const nextLevel = targetLevel + 1;
      if (gameState.classChoice === "flamethrower") {
        const rangeBlocks =
          FLAME_BASE_RANGE_BLOCKS +
          (nextLevel / 10) * (FLAME_MAX_RANGE_BLOCKS - FLAME_BASE_RANGE_BLOCKS);
        player.bulletLife = (rangeBlocks * world.grid) / FLAME_SPEED;
      } else {
        player.bulletSpeed = BASE_BULLET_SPEED * (1 + nextLevel * 0.08);
        player.bulletLife = BASE_BULLET_LIFE + nextLevel * 0.04;
      }
    },
    description: "Faster bullets / longer flame",
  },
  {
    key: "6",
    name: "Regen Speed",
    level: 0,
    color: "#4ad7d1",
    apply: () => {
      const lvl = upgrades.find((u) => u.key === "6")?.level ?? 0;
      const next = lvl + 1;
      regenRateBase = 10 + (next - 1) * 4.4; // level 1 =>10, level 10 =>50
    },
    description: "Faster regen tick rate",
  },
];

const weapons = [
  {
    id: "assault-05-double",
    class: "spread",
    name: "Double Cannon",
    description: "Two barrels with a slight reload bonus.",
    requiresLevel: 5,
    apply: () => {
      player.barrels = 2;
      player.buildName = "Double Cannon";
      player.reload = Math.max(0.18, player.reload - 0.02);
      player.recoil = 0.22;
    },
  },
  {
    id: "assault-10-triad",
    class: "spread",
    name: "Triad",
    description: "Three barrels balanced for control.",
    requiresLevel: 10,
    apply: () => {
      player.barrels = 3;
      player.buildName = "Triad";
      player.reload = Math.max(0.18, player.reload - 0.02);
      player.recoil = 0.23;
    },
  },
  {
    id: "assault-15-quad",
    class: "spread",
    name: "Quad Burst",
    description: "Four barrels; heavier recoil, fast volleys.",
    requiresLevel: 15,
    apply: () => {
      player.barrels = 4;
      player.buildName = "Quad Burst";
      player.reload = Math.max(0.18, player.reload - 0.025);
      player.recoil = 0.25;
    },
  },
  {
    id: "assault-20-penta",
    class: "spread",
    name: "Pentacore",
    description: "Five barrels with tighter spread.",
    requiresLevel: 20,
    apply: () => {
      player.barrels = 5;
      player.buildName = "Pentacore";
      player.reload = Math.max(0.17, player.reload - 0.025);
      player.recoil = 0.26;
    },
  },
  {
    id: "assault-25-hexa",
    class: "assault",
    name: "Hexa Storm",
    description: "Six barrels, moderate recoil.",
    requiresLevel: 25,
    apply: () => {
      player.barrels = 6;
      player.buildName = "Hexa Storm";
      player.reload = Math.max(0.17, player.reload - 0.03);
      player.recoil = 0.28;
    },
  },
  {
    id: "assault-30-septa",
    class: "assault",
    name: "Septagun",
    description: "Seven barrels accelerating fire.",
    requiresLevel: 30,
    apply: () => {
      player.barrels = 7;
      player.buildName = "Septagun";
      player.reload = Math.max(0.16, player.reload - 0.03);
      player.recoil = 0.3;
    },
  },
  {
    id: "assault-35-octet",
    class: "assault",
    name: "Octet Barrage",
    description: "Eight barrels and heavier recoil.",
    requiresLevel: 35,
    apply: () => {
      player.barrels = 8;
      player.buildName = "Octet Barrage";
      player.reload = Math.max(0.16, player.reload - 0.035);
      player.recoil = 0.32;
      player.bulletDamage += 6;
    },
  },
  {
    id: "assault-40-nova",
    class: "assault",
    name: "Nova Array",
    description: "Nine barrels for max coverage.",
    requiresLevel: 40,
    apply: () => {
      player.barrels = 9;
      player.buildName = "Nova Array";
      player.reload = Math.max(0.15, player.reload - 0.03);
      player.recoil = 0.33;
      player.bulletDamage += 6;
    },
  },
  {
    id: "assault-45-deca",
    class: "assault",
    name: "Deca Volt",
    description: "Ten barrels; overwhelming spread.",
    requiresLevel: 45,
    apply: () => {
      player.barrels = 10;
      player.buildName = "Deca Volt";
      player.reload = Math.max(0.15, player.reload - 0.03);
      player.recoil = 0.34;
      player.bulletDamage += 8;
    },
  },
  {
    id: "assault-50-eleven",
    class: "assault",
    name: "Elevenfold",
    description: "Eleven barrels; heavy recoil.",
    requiresLevel: 50,
    apply: () => {
      player.barrels = 11;
      player.buildName = "Elevenfold";
      player.reload = Math.max(0.14, player.reload - 0.03);
      player.recoil = 0.35;
      player.bulletDamage += 10;
    },
  },
  {
    id: "assault-55-twelve",
    class: "assault",
    name: "Twelfth Storm",
    description: "Twelve barrels wrapped around.",
    requiresLevel: 55,
    apply: () => {
      player.barrels = 12;
      player.buildName = "Twelfth Storm";
      player.reload = Math.max(0.14, player.reload - 0.03);
      player.recoil = 0.35;
      player.bulletDamage += 12;
    },
  },
  {
    id: "assault-60-thirteen",
    class: "assault",
    name: "Thirteen Nova",
    description: "Thirteen barrels at the edge of control.",
    requiresLevel: 60,
    apply: () => {
      player.barrels = 13;
      player.buildName = "Thirteen Nova";
      player.reload = Math.max(0.16, player.reload - 0.04);
      player.recoil = 0.36;
      player.bulletDamage += 14;
    },
  },
  {
    id: "sniper-precision",
    class: "sniper",
    name: "Precision Rail",
    description: "Single barrel, higher speed and damage.",
    requiresLevel: 5,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Precision Rail";
      player.bulletDamage = Math.max(player.bulletDamage, 70);
      player.bulletSpeed += 200;
      player.reload = player.reload + 0.02;
    },
  },
  {
    id: "sniper-heavy",
    class: "sniper",
    name: "Heavy Rail",
    description: "Heavier slug with more punch.",
    requiresLevel: 10,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Heavy Rail";
      player.bulletDamage = Math.max(player.bulletDamage, 90);
      player.bulletSpeed += 220;
      player.bulletSize += 2;
      player.reload = player.reload + 0.03;
    },
  },
  {
    id: "sniper-colossus",
    class: "sniper",
    name: "Colossus Shot",
    description: "Large slug with high impact and stagger.",
    requiresLevel: 15,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Colossus Shot";
      player.bulletDamage = Math.max(player.bulletDamage, 110);
      player.bulletSpeed += 240;
      player.bulletSize += 3;
      player.reload = player.reload + 0.04;
    },
  },
  {
    id: "sniper-rail",
    class: "sniper",
    name: "Rail Sniper",
    description: "Single rail; high damage and speed, slower reload.",
    requiresLevel: 20,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Rail Sniper";
      player.bulletDamage = Math.max(player.bulletDamage, 140);
      player.bulletSpeed += 220;
      player.reload = player.reload + 0.05;
    },
  },
  {
    id: "sniper-titan",
    class: "sniper",
    name: "Titan Lance",
    description: "Massive lance built to delete big targets.",
    requiresLevel: 25,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Titan Lance";
      player.bulletDamage = Math.max(player.bulletDamage, 170);
      player.bulletSpeed += 260;
      player.bulletSize += 4;
      player.reload = player.reload + 0.06;
      player.bulletLife += 0.2;
    },
  },
  {
    id: "sniper-dual",
    class: "sniper",
    name: "Dual Lance",
    description: "Twin rails with heavy impact.",
    requiresLevel: 30,
    apply: () => {
      player.barrels = 2;
      player.buildName = "Dual Lance";
      player.bulletDamage = Math.max(player.bulletDamage, 180);
      player.bulletSpeed += 260;
      player.reload = player.reload + 0.08;
    },
  },
  {
    id: "sniper-obliterator",
    class: "sniper",
    name: "Obliterator",
    description: "Super-massive slug with splashy hitbox.",
    requiresLevel: 35,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Obliterator";
      player.bulletDamage = Math.max(player.bulletDamage, 200);
      player.bulletSpeed += 300;
      player.bulletSize += 5;
      player.reload = player.reload + 0.1;
      player.bulletLife += 0.25;
    },
  },
  {
    id: "sniper-void",
    class: "sniper",
    name: "Void Lance",
    description: "Single lance that shreds big targets.",
    requiresLevel: 40,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Void Lance";
      player.bulletDamage = Math.max(player.bulletDamage, 220);
      player.bulletSpeed += 320;
      player.reload = player.reload + 0.1;
    },
  },
  {
    id: "sniper-jugger",
    class: "sniper",
    name: "Jugger Rail",
    description: "Dense slug that chunks bosses.",
    requiresLevel: 45,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Jugger Rail";
      player.bulletDamage = Math.max(player.bulletDamage, 260);
      player.bulletSpeed += 340;
      player.bulletSize += 6;
      player.reload = player.reload + 0.12;
      player.bulletLife += 0.3;
    },
  },
  {
    id: "sniper-apex",
    class: "sniper",
    name: "Apex Lance",
    description: "Peak rail tech, immense penetration.",
    requiresLevel: 50,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Apex Lance";
      player.bulletDamage = Math.max(player.bulletDamage, 300);
      player.bulletSpeed += 360;
      player.bulletSize += 7;
      player.reload = player.reload + 0.13;
      player.bulletLife += 0.35;
    },
  },
  {
    id: "sniper-supernova",
    class: "sniper",
    name: "Supernova Rail",
    description: "Expanding rail burst on impact.",
    requiresLevel: 55,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Supernova Rail";
      player.bulletDamage = Math.max(player.bulletDamage, 340);
      player.bulletSpeed += 380;
      player.bulletSize += 8;
      player.reload = player.reload + 0.14;
      player.bulletLife += 0.4;
    },
  },
  {
    id: "sniper-eclipse",
    class: "sniper",
    name: "Eclipse Cannon",
    description: "Final rail form: huge slug, max damage.",
    requiresLevel: 60,
    apply: () => {
      player.barrels = 1;
      player.buildName = "Eclipse Cannon";
      player.bulletDamage = Math.max(player.bulletDamage, 380);
      player.bulletSpeed += 400;
      player.bulletSize += 9;
      player.reload = player.reload + 0.16;
      player.bulletLife += 0.45;
    },
  },
  {
    id: "spread-tri",
    class: "assault",
    name: "Tri Split",
    description: "Three-barrel spread with balanced reload.",
    requiresLevel: 5,
    apply: () => {
      player.barrels = 3;
      player.buildName = "Tri Split";
      player.reload = Math.max(0.2, player.reload - 0.01);
    },
  },
  {
    id: "spread-quad",
    class: "assault",
    name: "Quad Spread",
    description: "Four-barrel spread, moderate recoil.",
    requiresLevel: 15,
    apply: () => {
      player.barrels = 4;
      player.buildName = "Quad Spread";
      player.reload = Math.max(0.2, player.reload - 0.02);
      player.recoil = 0.22;
    },
  },
  {
    id: "spread-hurricane",
    class: "assault",
    name: "Hurricane",
    description: "Six-barrel cone with faster reload.",
    requiresLevel: 25,
    apply: () => {
      player.barrels = 6;
      player.buildName = "Hurricane";
      player.reload = Math.max(0.18, player.reload - 0.03);
      player.recoil = 0.28;
      player.bulletDamage += 8;
    },
  },
  {
    id: "spread-storm",
    class: "assault",
    name: "Stormwall",
    description: "Seven barrels, tight spread storm.",
    requiresLevel: 35,
    apply: () => {
      player.barrels = 7;
      player.buildName = "Stormwall";
      player.reload = Math.max(0.16, player.reload - 0.04);
      player.recoil = 0.32;
      player.bulletDamage += 14;
    },
  },
  {
    id: "bruiser-05-twinheavy",
    class: "bruiser",
    name: "Twin Heavy",
    description: "Two heavy barrels; chunky damage.",
    requiresLevel: 5,
    apply: () => {
      player.barrels = 2;
      player.buildName = "Twin Heavy";
      player.bulletDamage = Math.max(player.bulletDamage, 80);
      player.bulletSize += 1;
      player.reload = player.reload + 0.02;
    },
  },
  {
    id: "bruiser-15-triple",
    class: "bruiser",
    name: "Triple Maul",
    description: "Three heavy cannons, slower pace.",
    requiresLevel: 15,
    apply: () => {
      player.barrels = 3;
      player.buildName = "Triple Maul";
      player.bulletDamage = Math.max(player.bulletDamage, 120);
      player.bulletSize += 2;
      player.reload = player.reload + 0.04;
      player.recoil = 0.26;
    },
  },
  {
    id: "bruiser-25-quad",
    class: "bruiser",
    name: "Quad Bulwark",
    description: "Four heavy barrels, tough recoil.",
    requiresLevel: 25,
    apply: () => {
      player.barrels = 4;
      player.buildName = "Quad Bulwark";
      player.bulletDamage = Math.max(player.bulletDamage, 150);
      player.bulletSize += 3;
      player.reload = player.reload + 0.05;
      player.recoil = 0.3;
    },
  },
  {
    id: "bruiser-35-penta",
    class: "bruiser",
    name: "Penta Siege",
    description: "Five heavy cannons, siege role.",
    requiresLevel: 35,
    apply: () => {
      player.barrels = 5;
      player.buildName = "Penta Siege";
      player.bulletDamage = Math.max(player.bulletDamage, 190);
      player.bulletSize += 4;
      player.reload = player.reload + 0.06;
      player.recoil = 0.32;
    },
  },
  {
    id: "bruiser-45-hexa",
    class: "bruiser",
    name: "Hexa Fortress",
    description: "Six cannons, fortress-tier salvo.",
    requiresLevel: 45,
    apply: () => {
      player.barrels = 6;
      player.buildName = "Hexa Fortress";
      player.bulletDamage = Math.max(player.bulletDamage, 240);
      player.bulletSize += 4;
      player.reload = player.reload + 0.07;
      player.recoil = 0.34;
    },
  },
  {
    id: "bruiser-60-colossus",
    class: "bruiser",
    name: "Colossus Battery",
    description: "Seven colossal cannons, endgame salvo.",
    requiresLevel: 60,
    apply: () => {
      player.barrels = 7;
      player.buildName = "Colossus Battery";
      player.bulletDamage = Math.max(player.bulletDamage, 300);
      player.bulletSize += 5;
      player.reload = player.reload + 0.08;
      player.recoil = 0.36;
    },
  },
];

const selectedWeapons = new Set();
let activeWeapon = null;
let pendingWeapon = null;
let autoShoot = false;
let adminHidden = false;

let upgradeHudState = "";
const buffTimers = { speed: 0, damage: 0, reload: 0, regen: 0 };
const buffMultipliers = { speed: 1, damage: 1, reload: 1, regen: 1 };
let powerupCooldown = 0;
let lastPowerupLabel = "";
let xpBoost = 1;
let regenRateBase = 10;
const FLAME_BASE_RANGE_BLOCKS = 4;
const FLAME_MAX_RANGE_BLOCKS = 7;
const FLAME_SPEED = 520;
const FLAME_SPREAD = 0.16;
const FLAME_BURN_DURATION = 2.2;

const powerupTypes = [
  { type: "speed", label: "Mobility", color: "#2b8df8", duration: 10, multiplier: 1.2 },
  { type: "damage", label: "Damage", color: "#ff6b6b", duration: 10, multiplier: 1.25 },
  { type: "reload", label: "Reload", color: "#5ad86a", duration: 10, multiplier: 0.82 },
  { type: "regen", label: "Defense", color: "#c58afd", duration: 10, multiplier: 1.4 },
];

function resetPlayer() {
  player.pos = { x: world.size / 2, y: world.size / 2 };
  player.vel = { x: 0, y: 0 };
  player.radius = 26;
  player.speed = BASE_SPEED;
  player.drag = BASE_DRAG;
  player.health = 130;
  player.maxHealth = 130;
  player.regen = 6;
  player.reload = getBaseReload();
  player.fireTimer = 0;
  player.bulletSpeed = BASE_BULLET_SPEED;
  player.bulletLife = BASE_BULLET_LIFE;
  player.bulletSize = 10;
  player.bulletDamage = 25;
  player.recoil = 0.2;
  player.level = 1;
  player.xp = 0;
  player.upgradePoints = 0;
  player.barrels = 1;
  player.buildName = "Single Barrel";
  player.regenDelay = 0;
}

function resetUpgrades() {
  upgrades.forEach((u) => {
    u.level = 0;
  });
  selectedWeapons.clear();
  activeWeapon = null;
  pendingWeapon = null;
  upgradeHudState = "";
  Object.keys(buffTimers).forEach((k) => {
    buffTimers[k] = 0;
  buffMultipliers[k] = 1;
  });
  powerupCooldown = 0;
  lastPowerupLabel = "";
}

function spawnBots(botCfg) {
  world.bots = [];
  if (!botCfg) return;
  for (let i = 0; i < botCfg.count; i += 1) {
    world.bots.push(createBot(botCfg, world.bots));
  }
}

function createBot(config, avoid = []) {
  const margin = 180;
  let pos = {
    x: rand(margin, world.size - margin),
    y: rand(margin, world.size - margin),
  };
  let attempts = 0;
  while (attempts < 10) {
    const farFromPlayer = Math.hypot(pos.x - player.pos.x, pos.y - player.pos.y) > 320;
    const farFromBots = avoid.every(
      (b) => Math.hypot(pos.x - b.pos.x, pos.y - b.pos.y) > 80
    );
    if (farFromPlayer && farFromBots) break;
    pos = { x: rand(margin, world.size - margin), y: rand(margin, world.size - margin) };
    attempts += 1;
  }
  return {
    pos,
    vel: { x: 0, y: 0 },
    radius: 22,
    speed: config.speed,
    drag: 0.97,
    health: config.health,
    maxHealth: config.health,
    regen: 2.5,
    reload: config.reload,
    fireTimer: 0,
    bulletSpeed: config.bulletSpeed,
    bulletLife: 1.4,
    bulletSize: 9,
    bulletDamage: config.damage,
    recoil: 0.14,
    strafe: rand(-0.6, 0.6),
    aiTimer: rand(0.8, 1.6),
    level: 1,
    xp: 0,
    upgradePoints: 0,
    upgrades: { damage: 0, reload: 0, mobility: 0, defense: 0 },
    aimAngle: 0,
    orbitDir: Math.random() > 0.5 ? 1 : -1,
    burnTime: 0,
    burnDps: 0,
    burnOwnerRef: null,
  };
}

function resetWorldForDifficulty(diffKey) {
  const config = difficulties[diffKey] || difficulties.easy;
  gameState.difficulty = diffKey;
  world.size = config.worldSize;
  world.bullets = [];
  world.blocks = [];
  world.powerups = [];
  world.bots = [];
  resetPlayer();
  // random player spawn
  const spawnPos = randomPosition(player.radius * 2, 200);
  player.pos.x = spawnPos.x + player.radius;
  player.pos.y = spawnPos.y + player.radius;
  world.mega = createMegaBlock(config, [{ pos: player.pos, radius: player.radius }]);
  world.megaRespawn = 0;
  resetUpgrades();
  seedBlocks(config.blockCount);
  spawnBots(config.bots);
  seedPowerups();
  renderUpgradeHud();
}

function startGame() {
  resetWorldForDifficulty(gameState.difficulty);
  gameState.started = true;
  gameState.over = false;
  if (startMenu) startMenu.classList.add("hidden");
  if (autoButton) {
    autoShoot = false;
    autoButton.textContent = "Auto Shoot: Off";
    autoButton.classList.remove("active");
  }
  setXpBoost(1);
  if (adminPanel) adminPanel.classList.remove("collapsed");
  if (adminToggle) {
    adminHidden = false;
    adminToggle.textContent = "»";
  }
  syncClassRestrictions();
  renderCooldownHud();
  lastTime = performance.now();
}

function showStartMenu() {
  if (startMenu) startMenu.classList.remove("hidden");
}

function renderUpgradeHud() {
  if (!upgradeHud) return;
  const allowed = upgrades.filter(isUpgradeAllowed);
  const snapshot = `${gameState.classChoice}|${player.upgradePoints}|${allowed
    .map((u) => `${u.key}:${u.level}`)
    .join("|")}`;
  if (snapshot === upgradeHudState) return;
  upgradeHudState = snapshot;
  const html = allowed
    .map((u) => {
      const fill = Math.min(100, (u.level / 10) * 100);
      return `
        <div class="upgrade-item" data-key="${u.key}">
          <div>
            <div class="upgrade-name">${upgradeLabel(u)}</div>
            <div class="upgrade-bar"><span style="width:${fill}%; background:${u.color};"></span></div>
          </div>
          <div class="upgrade-key">[${u.key}]</div>
          <div class="upgrade-level">Lv ${u.level}</div>
        </div>
      `;
    })
    .join("");
  upgradeHud.innerHTML = html;
  upgradeHud.classList.toggle("ready", player.upgradePoints > 0);
}

function showWeaponPopup(weapon) {
  if (!weaponPopup) return;
  pendingWeapon = weapon;
  weaponPopup.innerHTML = `
    <h2>Weapon Unlock</h2>
    <p>Reached Level ${weapon.requiresLevel}! Choose your weapon.</p>
    <div class="weapon-option">
      <div>
        <div class="upgrade-name">${weapon.name}</div>
        <div class="upgrade-bar"><span style="width:60%; background:${upgrades[0].color};"></span></div>
      </div>
      <button id="chooseWeaponBtn">Choose</button>
    </div>
  `;
  const btn = weaponPopup.querySelector("#chooseWeaponBtn");
  if (btn) {
    btn.addEventListener("click", () => selectWeapon(weapon));
  }
  weaponPopup.classList.remove("hidden");
}

function hideWeaponPopup() {
  if (!weaponPopup) return;
  weaponPopup.classList.add("hidden");
  weaponPopup.innerHTML = "";
  pendingWeapon = null;
}

function selectWeapon(weapon) {
  weapon.apply();
  activeWeapon = weapon.id;
  selectedWeapons.add(weapon.id);
  hideWeaponPopup();
  renderUpgradeHud();
  checkWeaponUnlocks();
}

function checkWeaponUnlocks() {
  if (pendingWeapon) return;
  const available = weapons
    .filter((w) => w.class === gameState.classChoice)
    .sort((a, b) => a.requiresLevel - b.requiresLevel)
    .find((w) => player.level >= w.requiresLevel && !selectedWeapons.has(w.id));
  if (available) showWeaponPopup(available);
}

const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0, down: false, worldX: 0, worldY: 0 },
};

let lastTime = performance.now();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (["1", "2", "3", "4", "5", "6"].includes(key) && player.upgradePoints > 0) {
    if (!isUpgradeAllowedKey(key)) return;
    const upgrade = upgrades.find((u) => u.key === key);
    if (upgrade && upgrade.level < 10) {
      player.upgradePoints -= 1;
      upgrade.apply();
      upgrade.level += 1;
      updateBuildTier();
      renderUpgradeHud();
    }
    return;
  }
  input.keys.add(key);
});

window.addEventListener("keyup", (e) => {
  input.keys.delete(e.key.toLowerCase());
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  input.mouse.x = e.clientX - rect.left;
  input.mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", () => {
  input.mouse.down = true;
});

canvas.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

if (difficultyList) {
  difficultyList.addEventListener("click", (e) => {
    const card = e.target.closest(".difficulty");
    if (!card) return;
    const diff = card.dataset.difficulty || "easy";
    gameState.difficulty = diff;
    [...difficultyList.querySelectorAll(".difficulty")].forEach((el) =>
      el.classList.toggle("active", el === card)
    );
  });
}

if (classList) {
  classList.addEventListener("click", (e) => {
    const card = e.target.closest(".class-card");
    if (!card) return;
    const cls = card.dataset.class || "assault";
    gameState.classChoice = cls;
    [...classList.querySelectorAll(".class-card")].forEach((el) =>
      el.classList.toggle("active", el === card)
    );
    syncClassRestrictions();
  });
}

if (startButton) {
  startButton.addEventListener("click", () => {
    startGame();
  });
}

if (autoButton) {
  autoButton.addEventListener("click", () => {
    autoShoot = !autoShoot;
    autoButton.textContent = `Auto Shoot: ${autoShoot ? "On" : "Off"}`;
    autoButton.classList.toggle("active", autoShoot);
  });
}

if (adminPanel) {
  adminPanel.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-upgrade]");
    const xpBtn = e.target.closest("button[data-xpboost]");
    if (btn) {
      const key = btn.dataset.upgrade;
      const amount = Number(btn.dataset.amount || 1);
      grantAdminUpgrades(key, amount);
    } else if (xpBtn) {
      const boost = Number(xpBtn.dataset.xpboost || 1);
      setXpBoost(boost);
    }
  });
}

if (adminToggle) {
  adminToggle.addEventListener("click", () => {
    adminHidden = !adminHidden;
    adminToggle.textContent = adminHidden ? "«" : "»";
    if (adminPanel) {
      adminPanel.classList.toggle("collapsed", adminHidden);
    }
  });
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomPosition(size, margin = 160, avoid = []) {
  let pos = {
    x: rand(margin, world.size - margin - size),
    y: rand(margin, world.size - margin - size),
  };
  let attempts = 0;
  while (attempts < 20) {
    const tooClose = avoid.some((item) => {
      const hasSize = typeof item.size === "number";
      const ax = item.pos.x + (hasSize ? item.size / 2 : 0);
      const ay = item.pos.y + (hasSize ? item.size / 2 : 0);
      const bx = pos.x + size / 2;
      const by = pos.y + size / 2;
      const rA = item.radius || (hasSize ? item.size / 2 : 0);
      const rB = size / 2;
      return Math.hypot(ax - bx, ay - by) < rA + rB + 80;
    });
    if (!tooClose) break;
    pos = {
      x: rand(margin, world.size - margin - size),
      y: rand(margin, world.size - margin - size),
    };
    attempts += 1;
  }
  return pos;
}

function requiredXP(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return 40 + Math.floor(level * level * 12);
}

function botGainXP(bot, amount) {
  bot.xp += amount;
  let needed = requiredXP(bot.level);
  while (bot.xp >= needed && bot.level < MAX_LEVEL) {
    bot.xp -= needed;
    bot.level += 1;
    bot.upgradePoints += 1;
    botAutoUpgrade(bot);
    needed = requiredXP(bot.level);
  }
}

function botAutoUpgrade(bot) {
  const options = ["damage", "reload", "mobility", "defense"].filter(
    (key) => bot.upgrades[key] < 10
  );
  if (bot.upgradePoints <= 0 || options.length === 0) return;
  const key = options[Math.floor(Math.random() * options.length)];
  bot.upgradePoints -= 1;
  bot.upgrades[key] += 1;
  if (key === "damage") {
    bot.bulletDamage += 3;
    bot.bulletSpeed += 15;
  } else if (key === "reload") {
    bot.reload = Math.max(0.6, bot.reload - 0.03);
    bot.bulletLife += 0.04;
  } else if (key === "mobility") {
    bot.speed += 10;
    bot.drag = Math.min(0.995, bot.drag + 0.005);
  } else if (key === "defense") {
    bot.maxHealth += 12;
    bot.health = Math.min(bot.maxHealth, bot.health + 12);
    bot.regen += 0.4;
  }
}

function createBlock() {
  const roll = Math.random();
  const type =
    roll > 0.8
      ? { size: 44, health: 120, xp: 45, color: "#f7d154" }
      : roll > 0.4
      ? { size: 32, health: 70, xp: 24, color: "#f4ad47" }
      : { size: 22, health: 40, xp: 14, color: "#e7893a" };
  const margin = 120;
  let pos = {
    x: rand(margin, world.size - margin - type.size),
    y: rand(margin, world.size - margin - type.size),
  };
  let attempts = 0;
  while (attempts < 10) {
    const dx = pos.x - player.pos.x;
    const dy = pos.y - player.pos.y;
    if (Math.hypot(dx, dy) > 220) break;
    pos = {
      x: rand(margin, world.size - margin - type.size),
      y: rand(margin, world.size - margin - type.size),
    };
    attempts += 1;
  }
  return { ...type, pos, maxHealth: type.health, burnTime: 0, burnDps: 0, burnOwnerRef: null };
}

function seedBlocks(count) {
  world.blocks = [];
  for (let i = 0; i < count; i += 1) {
    world.blocks.push(createBlock());
  }
}

function createPowerup() {
  const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
  const size = 18;
  const margin = 120;
  let pos = {
    x: rand(margin, world.size - margin - size),
    y: rand(margin, world.size - margin - size),
  };
  let attempts = 0;
  while (attempts < 10) {
    const dx = pos.x - player.pos.x;
    const dy = pos.y - player.pos.y;
    if (Math.hypot(dx, dy) > 200) break;
    pos = { x: rand(margin, world.size - margin - size), y: rand(margin, world.size - margin - size) };
    attempts += 1;
  }
  return { ...type, pos, size };
}

function seedPowerups() {
  world.powerups = [];
  for (let i = 0; i < 6; i += 1) {
    world.powerups.push(createPowerup());
  }
}

function createMegaBlock(config, avoid = []) {
  const health = config.worldSize === 2600 ? 10000 : config.worldSize === 3200 ? 30000 : 50000;
  const size = 160;
  const pos = randomPosition(size, 200, avoid);
  return {
    size,
    pos,
    health,
    maxHealth: health,
    xp: Math.floor(health / 5),
    color: "#d14af0",
    burnTime: 0,
    burnDps: 0,
    burnOwnerRef: null,
  };
}

function ensurePowerups() {
  const target = 6;
  while (world.powerups.length < target) {
    world.powerups.push(createPowerup());
  }
}

function applyPowerupEffect(power) {
  const buff = power.type;
  const typeDef = powerupTypes.find((p) => p.type === buff);
  if (!typeDef) return;
  buffTimers[buff] = typeDef.duration;
  buffMultipliers[buff] = typeDef.multiplier;
  powerupCooldown = POWERUP_COOLDOWN;
  lastPowerupLabel = typeDef.label || buff;
}

function updateBuffs(dt) {
  Object.keys(buffTimers).forEach((k) => {
    if (buffTimers[k] > 0) {
      buffTimers[k] -= dt;
      if (buffTimers[k] <= 0) {
        buffTimers[k] = 0;
        buffMultipliers[k] = 1;
      }
    }
  });
  if (powerupCooldown > 0) {
    powerupCooldown = Math.max(0, powerupCooldown - dt);
  }
}

function renderCooldownHud() {
  if (!cooldownBar || !cooldownFill || !cooldownLabel) return;
  if (powerupCooldown > 0) {
    cooldownBar.style.display = "block";
    const pct = Math.max(0, Math.min(1, powerupCooldown / POWERUP_COOLDOWN));
    cooldownFill.style.width = `${pct * 100}%`;
    const label = lastPowerupLabel ? `${lastPowerupLabel} buff` : "Power-up";
    cooldownLabel.textContent = `${label} cooldown: ${powerupCooldown.toFixed(1)}s`;
  } else {
    cooldownBar.style.display = "none";
  }
}
renderUpgradeHud();

function getCamera() {
  return {
    x: player.pos.x - canvas.width / 2,
    y: player.pos.y - canvas.height / 2,
  };
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (input.keys.has("w") || input.keys.has("arrowup")) dy -= 1;
  if (input.keys.has("s") || input.keys.has("arrowdown")) dy += 1;
  if (input.keys.has("a") || input.keys.has("arrowleft")) dx -= 1;
  if (input.keys.has("d") || input.keys.has("arrowright")) dx += 1;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  const accel = player.speed * buffMultipliers.speed * dt;
  player.vel.x += dx * accel;
  player.vel.y += dy * accel;

  player.vel.x *= player.drag;
  player.vel.y *= player.drag;

  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;

  player.pos.x = Math.max(player.radius, Math.min(world.size - player.radius, player.pos.x));
  player.pos.y = Math.max(player.radius, Math.min(world.size - player.radius, player.pos.y));
}

function shoot(dt) {
  player.fireTimer -= dt;
  const cam = getCamera();
  input.mouse.worldX = input.mouse.x + cam.x;
  input.mouse.worldY = input.mouse.y + cam.y;

  const angle = Math.atan2(input.mouse.worldY - player.pos.y, input.mouse.worldX - player.pos.x);
  if (player.fireTimer <= 0 && (input.mouse.down || autoShoot)) {
    const usingFlame = gameState.classChoice === "flamethrower";
    const shots = usingFlame ? 3 : 1;
    const baseAngles = barrelAngles(angle, player.barrels);
    baseAngles.forEach((base) => {
      for (let i = 0; i < shots; i += 1) {
        const jitter = usingFlame ? rand(-FLAME_SPREAD, FLAME_SPREAD) : 0;
        const a = base + jitter;
        const dir = { x: Math.cos(a), y: Math.sin(a) };
        const start = {
          x: player.pos.x + dir.x * (player.radius + player.bulletSize),
          y: player.pos.y + dir.y * (player.radius + player.bulletSize),
        };
        const speed = usingFlame ? FLAME_SPEED : player.bulletSpeed;
        const level5 = getUpgradeLevel("5");
        const flameRangeBlocks =
          FLAME_BASE_RANGE_BLOCKS +
          (level5 / 10) * (FLAME_MAX_RANGE_BLOCKS - FLAME_BASE_RANGE_BLOCKS);
        const life = usingFlame
          ? (flameRangeBlocks * world.grid) / FLAME_SPEED
          : player.bulletLife;
        const radius = usingFlame ? 7 : player.bulletSize;
        const damage = usingFlame
          ? player.bulletDamage * 0.7 * buffMultipliers.damage
          : player.bulletDamage * buffMultipliers.damage;
        world.bullets.push({
          pos: { ...start },
          vel: { x: dir.x * speed, y: dir.y * speed },
          radius,
          damage,
          life,
          owner: "player",
          type: usingFlame ? "flame" : "bullet",
        });
      }
    });
    player.fireTimer = player.reload * buffMultipliers.reload * (usingFlame ? 0.6 : 1);
  }
}

function updateBots(dt) {
  const diff = difficulties[gameState.difficulty] || difficulties.easy;
  const cfg = diff.bots;
  if (cfg) {
    while (world.bots.length < cfg.count) {
      world.bots.push(createBot(cfg, world.bots));
    }
  }
  for (let i = world.bots.length - 1; i >= 0; i -= 1) {
    const bot = world.bots[i];
    bot.fireTimer -= dt;
    bot.aiTimer -= dt;
    const dx = player.pos.x - bot.pos.x;
    const dy = player.pos.y - bot.pos.y;
    const dist = Math.hypot(dx, dy) || 1;
    const aggro = dist < (cfg?.aggroRange || 300);
    const block = findNearestBlock(bot.pos);
    const blockCenter = block
      ? { x: block.pos.x + block.size / 2, y: block.pos.y + block.size / 2 }
      : null;
    const target = aggro ? player.pos : blockCenter || null;
    const tdx = target ? target.x - bot.pos.x : 0;
    const tdy = target ? target.y - bot.pos.y : 0;
    const tdist = target ? Math.hypot(tdx, tdy) || 1 : Infinity;

    if (bot.aiTimer <= 0) {
      bot.strafe = rand(-0.7, 0.7);
      bot.aiTimer = rand(0.8, 1.4);
    }
    if (target) {
      let mx = 0;
      let my = 0;
      if (!aggro && blockCenter && block) {
        const toBlockX = blockCenter.x - bot.pos.x;
        const toBlockY = blockCenter.y - bot.pos.y;
        const distBlock = Math.hypot(toBlockX, toBlockY) || 1;
        const desired = block.size * 1.8;
        const nx = toBlockX / distBlock;
        const ny = toBlockY / distBlock;
        if (distBlock > desired + 24) {
          mx = nx;
          my = ny;
        } else {
          const tangentX = -ny;
          const tangentY = nx;
          mx = tangentX * bot.orbitDir + nx * 0.2;
          my = tangentY * bot.orbitDir + ny * 0.2;
        }
      } else {
        mx = tdx / tdist;
        my = tdy / tdist;
        const sideX = -my;
        const sideY = mx;
        mx += sideX * bot.strafe * (aggro ? 0.6 : 0.3);
        my += sideY * bot.strafe * (aggro ? 0.6 : 0.3);
      }
      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;
      const accel = bot.speed * dt;
      bot.vel.x += mx * accel;
      bot.vel.y += my * accel;
    }

    bot.vel.x *= bot.drag;
    bot.vel.y *= bot.drag;
    bot.pos.x += bot.vel.x * dt;
    bot.pos.y += bot.vel.y * dt;
    bot.pos.x = Math.max(bot.radius, Math.min(world.size - bot.radius, bot.pos.x));
    bot.pos.y = Math.max(bot.radius, Math.min(world.size - bot.radius, bot.pos.y));
    bot.health = Math.min(bot.maxHealth, bot.health + bot.regen * dt);

    if (target) bot.aimAngle = Math.atan2(tdy, tdx);

    const playerTarget = aggro && target === player.pos;
    const canFire =
      target && bot.fireTimer <= 0 && (!playerTarget || tdist <= (cfg?.aggroRange || 300) + 20);
    if (canFire) {
      const angle = bot.aimAngle;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const start = {
        x: bot.pos.x + dir.x * (bot.radius + bot.bulletSize),
        y: bot.pos.y + dir.y * (bot.radius + bot.bulletSize),
      };
      world.bullets.push({
        pos: { ...start },
        vel: { x: dir.x * bot.bulletSpeed, y: dir.y * bot.bulletSpeed },
        radius: bot.bulletSize,
        damage: bot.bulletDamage,
        life: bot.bulletLife,
        owner: "bot",
        ownerRef: bot,
      });
      bot.fireTimer = bot.reload;
    }

    if (bot.health <= 0) {
      const reward = (80 + bot.level * 12) * xpBoost;
      player.xp += reward;
      world.bots.splice(i, 1);
    }
  }
}

function barrelAngles(base, count) {
  return barrelMounts(count).map((m) => base + m.angleOffset);
}

function updateBullets(dt) {
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    b.life -= dt;
    if (b.life <= 0) {
      world.bullets.splice(i, 1);
      continue;
    }
    if (b.pos.x < 0 || b.pos.x > world.size || b.pos.y < 0 || b.pos.y > world.size) {
      world.bullets.splice(i, 1);
    }
  }
}

function circleRectOverlap(circle, rect) {
  const closestX = Math.max(rect.pos.x, Math.min(circle.x, rect.pos.x + rect.size));
  const closestY = Math.max(rect.pos.y, Math.min(circle.y, rect.pos.y + rect.size));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function findNearestBlock(pos) {
  let nearest = null;
  let best = Infinity;
  for (const block of world.blocks) {
    const dx = block.pos.x - pos.x;
    const dy = block.pos.y - pos.y;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      nearest = block;
    }
  }
  if (world.mega) {
    const m = world.mega;
    const center = { x: m.pos.x + m.size / 2, y: m.pos.y + m.size / 2 };
    const dx = center.x - pos.x;
    const dy = center.y - pos.y;
    const d = dx * dx + dy * dy;
    if (d < best) nearest = { ...m, pos: m.pos, size: m.size };
  }
  return nearest;
}

function handleCollisions(dt) {
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    let hit = false;
    if (b.owner === "player") {
      for (let j = world.blocks.length - 1; j >= 0; j -= 1) {
        const block = world.blocks[j];
        if (circleRectOverlap({ x: b.pos.x, y: b.pos.y, radius: b.radius }, block)) {
          block.health -= b.damage;
          if (b.type === "flame") applyBurnBlock(block, b.damage * 0.5);
          hit = true;
          if (block.health <= 0) {
            player.xp += block.xp * xpBoost;
            world.blocks.splice(j, 1);
            world.blocks.push(createBlock());
          }
          break;
        }
      }
      if (!hit) {
        for (let k = world.bots.length - 1; k >= 0; k -= 1) {
          const bot = world.bots[k];
          const dx = b.pos.x - bot.pos.x;
          const dy = b.pos.y - bot.pos.y;
          if (dx * dx + dy * dy <= (b.radius + bot.radius) * (b.radius + bot.radius)) {
            bot.health -= b.damage;
            if (b.type === "flame") applyBurnBot(bot, b.damage * 0.5);
            hit = true;
            if (bot.health <= 0) {
              const reward = (80 + bot.level * 12) * xpBoost;
              player.xp += reward;
              world.bots.splice(k, 1);
            }
            break;
          }
        }
      }
      if (!hit && world.mega) {
        const m = world.mega;
        if (circleRectOverlap({ x: b.pos.x, y: b.pos.y, radius: b.radius }, { pos: m.pos, size: m.size })) {
          m.health -= b.damage;
          if (b.type === "flame") applyBurnMega(b.damage * 0.5);
          hit = true;
          if (m.health <= 0) {
            player.xp += m.xp * xpBoost;
            world.mega = null;
            world.megaRespawn = 12;
          }
        }
      }
    } else if (b.owner === "bot") {
      const dx = b.pos.x - player.pos.x;
      const dy = b.pos.y - player.pos.y;
      if (dx * dx + dy * dy <= (b.radius + player.radius) * (b.radius + player.radius)) {
        applyPlayerDamage(b.damage);
        hit = true;
      }
      if (!hit) {
        for (let j = world.blocks.length - 1; j >= 0; j -= 1) {
          const block = world.blocks[j];
          if (circleRectOverlap({ x: b.pos.x, y: b.pos.y, radius: b.radius }, block)) {
            block.health -= b.damage;
            hit = true;
            if (block.health <= 0 && b.ownerRef) {
              botGainXP(b.ownerRef, block.xp);
              world.blocks.splice(j, 1);
              world.blocks.push(createBlock());
            }
            break;
          }
        }
      }
      if (!hit && world.mega && b.ownerRef) {
        const m = world.mega;
        if (circleRectOverlap({ x: b.pos.x, y: b.pos.y, radius: b.radius }, { pos: m.pos, size: m.size })) {
          m.health -= b.damage;
          hit = true;
          if (m.health <= 0) {
            botGainXP(b.ownerRef, m.xp);
            world.mega = null;
            world.megaRespawn = 12;
          }
        }
      }
    }
    if (hit) world.bullets.splice(i, 1);
  }

  if (world.mega) {
    const m = world.mega;
    const center = { x: m.pos.x + m.size / 2, y: m.pos.y + m.size / 2 };
    const dx = player.pos.x - center.x;
    const dy = player.pos.y - center.y;
    const half = m.size / 2 + player.radius;
    if (Math.abs(dx) < half && Math.abs(dy) < half) {
      applyPlayerDamage(80 * dt);
      const len = Math.hypot(dx, dy) || 1;
      player.vel.x += (dx / len) * 120 * dt;
      player.vel.y += (dy / len) * 120 * dt;
    }
  }

  for (let i = world.blocks.length - 1; i >= 0; i -= 1) {
    const block = world.blocks[i];
    if (circleRectOverlap({ x: player.pos.x, y: player.pos.y, radius: player.radius }, block)) {
      const touchDps = block.size > 40 ? 22 : block.size > 30 ? 14 : 8;
      applyPlayerDamage(touchDps * dt);
      const dx = player.pos.x - (block.pos.x + block.size / 2);
      const dy = player.pos.y - (block.pos.y + block.size / 2);
      const len = Math.hypot(dx, dy) || 1;
      player.vel.x += (dx / len) * 80 * dt;
      player.vel.y += (dy / len) * 80 * dt;
    }
  }
}

function updatePowerups(dt) {
  ensurePowerups();
  for (let i = world.powerups.length - 1; i >= 0; i -= 1) {
    const p = world.powerups[i];
    const dx = p.pos.x - player.pos.x;
    const dy = p.pos.y - player.pos.y;
    if (powerupCooldown <= 0 && dx * dx + dy * dy <= (p.size + player.radius) * (p.size + player.radius)) {
      applyPowerupEffect(p);
      world.powerups.splice(i, 1);
    }
  }
  updateBuffs(dt);
  if (!world.mega && world.megaRespawn > 0) {
    world.megaRespawn -= dt;
    if (world.megaRespawn <= 0) {
      const config = difficulties[gameState.difficulty] || difficulties.easy;
      world.mega = createMegaBlock(config, [{ pos: player.pos, radius: player.radius }]);
    }
  }
}

function applyRegen(dt) {
  if (player.regenDelay > 0) {
    player.regenDelay = Math.max(0, player.regenDelay - dt);
    return;
  }
  const rate = regenRateBase * buffMultipliers.regen;
  player.health = Math.min(player.maxHealth, player.health + rate * dt);
}

function applyPlayerDamage(amount) {
  player.health -= amount;
  player.regenDelay = 4;
}

function applyBurnBlock(block, dps) {
  block.burnTime = Math.max(block.burnTime, FLAME_BURN_DURATION);
  block.burnDps = Math.max(block.burnDps, dps);
  block.burnOwnerRef = "player";
}

function applyBurnBot(bot, dps) {
  bot.burnTime = Math.max(bot.burnTime, FLAME_BURN_DURATION);
  bot.burnDps = Math.max(bot.burnDps, dps);
  bot.burnOwnerRef = "player";
}

function applyBurnMega(dps) {
  if (!world.mega) return;
  world.mega.burnTime = Math.max(world.mega.burnTime, FLAME_BURN_DURATION);
  world.mega.burnDps = Math.max(world.mega.burnDps, dps);
  world.mega.burnOwnerRef = "player";
}

function tickBurn(dt) {
  for (let i = world.blocks.length - 1; i >= 0; i -= 1) {
    const block = world.blocks[i];
    if (block.burnTime > 0) {
      block.burnTime = Math.max(0, block.burnTime - dt);
      block.health -= block.burnDps * dt;
      if (block.health <= 0) {
        player.xp += block.xp * xpBoost;
        world.blocks.splice(i, 1);
        world.blocks.push(createBlock());
        continue;
      }
    }
  }
  for (let i = world.bots.length - 1; i >= 0; i -= 1) {
    const bot = world.bots[i];
    if (bot.burnTime > 0) {
      bot.burnTime = Math.max(0, bot.burnTime - dt);
      bot.health -= bot.burnDps * dt;
      if (bot.health <= 0) {
        const reward = (80 + bot.level * 12) * xpBoost;
        player.xp += reward;
        world.bots.splice(i, 1);
        continue;
      }
    }
  }
  if (world.mega && world.mega.burnTime > 0) {
    world.mega.burnTime = Math.max(0, world.mega.burnTime - dt);
    world.mega.health -= world.mega.burnDps * dt;
    if (world.mega.health <= 0) {
      player.xp += world.mega.xp * xpBoost;
      world.mega = null;
      world.megaRespawn = 12;
    }
  }
}

function checkLevelUps() {
  let needed = requiredXP(player.level);
  while (player.xp >= needed && player.level < MAX_LEVEL) {
    player.xp -= needed;
    player.level += 1;
    if (player.level <= TOKEN_LEVEL_CAP) {
      const gain = player.level <= 5 ? 2 : 1;
      player.upgradePoints += gain;
    }
    updateBuildTier();
    checkWeaponUnlocks();
    needed = requiredXP(player.level);
  }
  if (player.level >= MAX_LEVEL) {
    player.xp = 0;
  }
}

function updateBuildTier() {
  if (activeWeapon || pendingWeapon) return;
  const previous = player.barrels;
  if (player.level >= 18) {
    player.barrels = 3;
    player.buildName = "Trishot";
  } else if (player.level >= 10) {
    player.barrels = 2;
    player.buildName = "Twin";
  } else {
    player.barrels = 1;
    player.buildName = "Single Barrel";
  }
  if (player.barrels !== previous) {
    player.reload = Math.max(0.2, player.reload - 0.02);
  }
}

function updateUI() {
  const need = requiredXP(player.level);
  const percent = player.level >= MAX_LEVEL ? 1 : Math.min(1, player.xp / need);
  xpFill.style.width = `${(percent * 100).toFixed(1)}%`;
  xpLabel.textContent =
    player.level >= MAX_LEVEL
      ? `Lv ${player.level} • MAX`
      : `Lv ${player.level} • ${Math.floor(player.xp)}/${need} XP`;
  levelLabel.textContent = player.level;
  hpLabel.textContent = `${Math.max(0, Math.floor(player.health))}/${Math.floor(player.maxHealth)}`;
  const pts = player.upgradePoints > 0 ? ` (+${player.upgradePoints} pts)` : "";
  buildLabel.textContent = `${player.buildName}${pts}`;
  renderUpgradeHud();
  renderCooldownHud();
}

function grantAdminUpgrades(key, amount) {
  const upgrade = upgrades.find((u) => u.key === key);
  if (!upgrade || !isUpgradeAllowed(upgrade)) return;
  for (let i = 0; i < amount; i += 1) {
    if (upgrade.level >= 10) break;
    upgrade.apply();
    upgrade.level += 1;
  }
  updateBuildTier();
  renderUpgradeHud();
}

function setXpBoost(multiplier) {
  xpBoost = Math.max(1, multiplier);
}

function isUpgradeAllowed(upgrade) {
  if (upgrade.key === "5" && gameState.classChoice === "sniper") return false;
  if (upgrade.key === "2" && gameState.classChoice === "flamethrower") return false;
  return true;
}

function isUpgradeAllowedKey(key) {
  if (key === "5" && gameState.classChoice === "sniper") return false;
  if (key === "2" && gameState.classChoice === "flamethrower") return false;
  return true;
}

function syncClassRestrictions() {
  if (adminBulletRow) {
    adminBulletRow.style.display = gameState.classChoice === "sniper" ? "none" : "grid";
    const label = adminBulletRow.querySelector(".name");
    if (label) {
      label.textContent = gameState.classChoice === "flamethrower" ? "Fire Distance" : "Bullet Speed";
    }
  }
  const adminReloadRow = adminPanel?.querySelector('[data-upgrade="2"]')?.parentElement;
  if (adminReloadRow) {
    adminReloadRow.style.display = gameState.classChoice === "flamethrower" ? "none" : "grid";
  }
}

function getBaseReload() {
  return gameState.classChoice === "flamethrower" ? BASE_RELOAD * 2 : BASE_RELOAD;
}

function getUpgradeLevel(key) {
  const upgrade = upgrades.find((u) => u.key === key);
  return upgrade ? upgrade.level : 0;
}

function upgradeLabel(upgrade) {
  if (upgrade.key === "5" && gameState.classChoice === "flamethrower") return "Fire Distance";
  return upgrade.name;
}

function upgradeDesc(upgrade) {
  if (upgrade.key === "5" && gameState.classChoice === "flamethrower") return "Extend flame reach";
  return upgrade.description;
}

function drawGrid(cam) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;
  const startX = -((cam.x % world.grid) + world.grid);
  const startY = -((cam.y % world.grid) + world.grid);
  for (let x = startX; x < canvas.width + world.grid; x += world.grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = startY; y < canvas.height + world.grid; y += world.grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlocks(cam) {
  for (const block of world.blocks) {
    const x = block.pos.x - cam.x;
    const y = block.pos.y - cam.y;
    const hpRatio = block.health / block.maxHealth;
    ctx.fillStyle = block.color;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x, y, block.size, block.size);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x, y - 8, block.size, 4);
    ctx.fillStyle = "#7cf29c";
    ctx.fillRect(x, y - 8, block.size * hpRatio, 4);
  }
}

function drawMega(cam) {
  if (!world.mega) return;
  const m = world.mega;
  const x = m.pos.x - cam.x;
  const y = m.pos.y - cam.y;
  const hpRatio = Math.max(0, m.health / m.maxHealth);
  ctx.save();
  ctx.fillStyle = m.color;
  ctx.strokeStyle = "#22052f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.rect(x, y, m.size, m.size);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, y - 10, m.size, 6);
  ctx.fillStyle = "#ff9cf0";
  ctx.fillRect(x, y - 10, m.size * hpRatio, 6);
  ctx.restore();
}

function drawBots(cam) {
  for (const bot of world.bots) {
    const x = bot.pos.x - cam.x;
    const y = bot.pos.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    const angle = bot.aimAngle || 0;
    ctx.rotate(angle);
    ctx.fillStyle = "#f38b3a";
    ctx.strokeStyle = "#0a0f1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(bot.radius * 0.2, -6, bot.radius + 14, 12);
    ctx.fillStyle = "#f3b03f";
    ctx.fill();
    ctx.fillStyle = "#f38b3a";
    ctx.beginPath();
    ctx.arc(0, 0, bot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const hpPercent = Math.max(0, bot.health / bot.maxHealth);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - bot.radius, y + bot.radius + 4, bot.radius * 2, 5);
    ctx.fillStyle = "#ffcf70";
    ctx.fillRect(x - bot.radius, y + bot.radius + 4, bot.radius * 2 * hpPercent, 5);
  }
}

function drawPowerups(cam) {
  for (const p of world.powerups) {
    const x = p.pos.x - cam.x;
    const y = p.pos.y - cam.y;
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px \"Trebuchet MS\", sans-serif";
    ctx.textAlign = "center";
    const label = (p.label || p.type || "").toUpperCase();
    ctx.fillText(label[0] || "", x, y + 4);
    ctx.restore();
  }
}

function drawBullets(cam) {
  for (const b of world.bullets) {
    if (b.type === "flame") {
      const grad = ctx.createRadialGradient(
        b.pos.x - cam.x,
        b.pos.y - cam.y,
        b.radius * 0.2,
        b.pos.x - cam.x,
        b.pos.y - cam.y,
        b.radius * 1.6
      );
      grad.addColorStop(0, "rgba(255,210,120,0.9)");
      grad.addColorStop(1, "rgba(255,120,60,0.3)");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(255,150,80,0.6)";
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = "#7cf29c";
      ctx.strokeStyle = null;
    }
    ctx.beginPath();
    ctx.arc(b.pos.x - cam.x, b.pos.y - cam.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    if (b.type === "flame") ctx.stroke();
  }
}

function drawPlayer(cam) {
  const screenX = player.pos.x - cam.x;
  const screenY = player.pos.y - cam.y;
  const aimAngle = Math.atan2(input.mouse.worldY - player.pos.y, input.mouse.worldX - player.pos.x);
  const mounts = barrelMounts(player.barrels);

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.fillStyle = "#4ad7d1";
  ctx.strokeStyle = "#0a0f1a";
  ctx.lineWidth = 3;
  mounts.forEach((m) => {
    const offset = rotatePoint(m.x, m.y, aimAngle);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.rotate(aimAngle + m.angleOffset);
    ctx.beginPath();
    ctx.rect(player.radius * 0.2, -6, player.radius + 18, 12);
    ctx.fillStyle = "#5ff0c8";
    ctx.fill();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(screenX - player.radius, screenY + player.radius + 6, player.radius * 2, 6);
  ctx.fillStyle = "#7cf29c";
  const hpPercent = Math.max(0, player.health / player.maxHealth);
  ctx.fillRect(screenX - player.radius, screenY + player.radius + 6, player.radius * 2 * hpPercent, 6);
}

function barrelMounts(count) {
  if (count <= 3) {
    const spacing = 12;
    const mid = (count - 1) / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: 0,
      y: (i - mid) * spacing,
      angleOffset: (i - mid) * 0.16,
    }));
  }
  const isAssault = gameState.classChoice === "assault";
  const ring = isAssault ? player.radius * 0.55 : player.radius * 0.75;
  const arc = isAssault ? Math.PI * 0.8 : Math.PI * 2;
  const start = isAssault ? -arc / 2 : 0;
  const step = arc / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => {
    const theta = start + i * step;
    return {
      x: Math.cos(theta) * ring,
      y: Math.sin(theta) * ring,
      angleOffset: theta,
    };
  });
}

function rotatePoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function drawUpgradePrompt() {
  if (player.upgradePoints <= 0) return;
  const lines = upgrades
    .filter(isUpgradeAllowed)
    .map((u) => `${u.key} – ${upgradeLabel(u)}: ${upgradeDesc(u)}`);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  const boxWidth = 320;
  const boxHeight = 24 + lines.length * 18;
  const x = canvas.width / 2 - boxWidth / 2;
  const y = canvas.height - boxHeight - 22;
  ctx.beginPath();
  ctx.rect(x, y, boxWidth, boxHeight);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0f1a2c";
  ctx.font = "13px \"Trebuchet MS\", sans-serif";
  ctx.fillText(`Upgrade points: ${player.upgradePoints}`, x + 12, y + 16);
  ctx.fillStyle = "#9ab0d8";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + 12, y + 32 + i * 16);
  });
  ctx.restore();
}

function drawBorder(cam) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 4;
  ctx.strokeRect(-cam.x, -cam.y, world.size, world.size);
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameState.started) {
    drawGrid(getCamera());
    requestAnimationFrame(loop);
    return;
  }
  const cam = getCamera();

  drawGrid(cam);
  movePlayer(dt);
  shoot(dt);
  updateBots(dt);
  updateBullets(dt);
  handleCollisions(dt);
  updatePowerups(dt);
  tickBurn(dt);
  applyRegen(dt);
  checkLevelUps();
  updateUI();

  drawBlocks(cam);
  drawMega(cam);
  drawBots(cam);
  drawBullets(cam);
  drawPlayer(cam);
  drawPowerups(cam);
  drawBorder(cam);
  drawUpgradePrompt();

  if (player.health <= 0 && gameState.started) {
    gameState.started = false;
    gameState.over = true;
    showStartMenu();
  }
  if (gameState.over && !gameState.started) {
    drawGameOver();
  }

  requestAnimationFrame(loop);
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f66";
  ctx.font = "28px \"Trebuchet MS\", sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("You were destroyed", canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = "#e8eefc";
  ctx.font = "16px \"Trebuchet MS\", sans-serif";
  ctx.fillText("Refresh to try again", canvas.width / 2, canvas.height / 2 + 18);
  ctx.restore();
}

requestAnimationFrame(loop);
