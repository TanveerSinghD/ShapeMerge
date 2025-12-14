export const SHAPES = [
  { name: "Triangle", sides: 3, color: "#fb923c", radius: 18 },
  { name: "Square", sides: 4, color: "#fbbf24", radius: 24 },
  { name: "Pentagon", sides: 5, color: "#38bdf8", radius: 30 },
  { name: "Hexagon", sides: 6, color: "#a78bfa", radius: 54 },
  { name: "Heptagon", sides: 7, color: "#22c55e", radius: 63 },
  { name: "Octagon", sides: 8, color: "#f472b6", radius: 72 },
  { name: "Nonagon", sides: 9, color: "#34d399", radius: 83 },
  { name: "Decagon", sides: 10, color: "#60a5fa", radius: 93 },
  { name: "Hendecagon", sides: 11, color: "#facc15", radius: 105 },
  { name: "Dodecagon", sides: 12, color: "#f97316", radius: 117 },
];

export const WORLD = {
  width: 486,
  height: 680,
  wall: 14,
  floor: 12,
  gravity: 1200,
  gravityScale: 1.0,
  restitution: 0.0, // no bounce
  friction: 1.0, // maximum grip
  frictionCombine: "max",
  solverIterations: 20,
  solverVelocityIterations: 20,
  contactOffset: 0.005,
  sleepMode: "startAsleep",
  sleepThresholdTime: 0.5,
  sleepVelocity: 0.03,
  sleepAngularVelocity: 0.03,
  minFreezeLinear: 0.03,
  minFreezeAngular: 0.03,
  linearDamping: 2.5,
  angularDamping: 3.0,
  impulseIgnore: 0.05,
  wakeImpulse: 0.2,
  microBounceVertical: 0.01,
};

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
