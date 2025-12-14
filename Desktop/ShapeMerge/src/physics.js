import { SHAPES, WORLD } from "./constants.js";

function wakeShape(body) {
  if (!body) return;
  body.asleep = false;
  body.isKinematic = false;
  body.useGravity = true;
  body.sleepTimer = 0;
}

export function applyMotion(shapes, dt) {
  // Small substeps help mimic continuous collision detection
  const steps = Math.max(1, Math.ceil(dt / 0.008));
  const subDt = dt / steps;
  for (let step = 0; step < steps; step++) {
    for (const s of shapes) {
      if (s.asleep || s.isKinematic) continue;

      // Gravity only when allowed
      const hasGravity = s.useGravity !== false;
      if (hasGravity) s.vy += WORLD.gravity * WORLD.gravityScale * subDt;
      s.x += s.vx * subDt;
      s.y += s.vy * subDt;
      s.angle += s.spin * subDt;

      // Air drag + explicit damping to kill micro-jitter (time-scaled)
      const linearDampBase = Math.pow(0.9985, subDt / (1 / 60));
      const spinDampBase = Math.pow(0.994, subDt / (1 / 60));
      const extraLinear = Math.exp(-WORLD.linearDamping * subDt);
      const extraAngular = Math.exp(-WORLD.angularDamping * subDt);
      s.vx *= linearDampBase * extraLinear;
      s.vy *= linearDampBase * extraLinear;
      s.spin *= spinDampBase * extraAngular;

      const r = SHAPES[s.level].radius;
      let onGround = false;
      if (s.x - r < WORLD.wall) {
        s.x = WORLD.wall + r;
        s.vx = Math.abs(s.vx) * 0.6;
      } else if (s.x + r > WORLD.width - WORLD.wall) {
        s.x = WORLD.width - WORLD.wall - r;
        s.vx = -Math.abs(s.vx) * 0.6;
      }
      if (s.y + r > WORLD.height - WORLD.floor) {
        s.y = WORLD.height - WORLD.floor - r;
        s.vy = -Math.abs(s.vy) * 0.25;
        onGround = true;
      }

      // Floor friction: bleed horizontal speed when resting
      if (onGround) {
        s.vx *= 0.9;
        s.spin *= 0.96;
      }

      // Soft velocity cap to prevent tunneling/jitter
      const maxVel = 2200;
      s.vx = Math.max(-maxVel, Math.min(maxVel, s.vx));
      s.vy = Math.max(-maxVel, Math.min(maxVel, s.vy));

      // Sleep detection and freeze when nearly still
      if (!s.sleepTimer) s.sleepTimer = 0;
      const speedSq = s.vx * s.vx + s.vy * s.vy;
      const speed = Math.sqrt(speedSq);
      const ang = Math.abs(s.spin);
      const tinyMotion = speed < WORLD.sleepVelocity && ang < WORLD.sleepAngularVelocity;
      if (tinyMotion) {
        s.sleepTimer += subDt;
        if (s.sleepTimer >= WORLD.sleepThresholdTime) {
          s.vx = 0;
          s.vy = 0;
          s.spin = 0;
          s.asleep = true;
          s.isKinematic = true;
          s.useGravity = false;
        }
      } else {
        s.sleepTimer = 0;
      }

      // Hard freeze if under min movement clamp
      if (speed < WORLD.minFreezeLinear && ang < WORLD.minFreezeAngular) {
        s.vx = 0;
        s.vy = 0;
        s.spin = 0;
        s.asleep = true;
        s.isKinematic = true;
        s.useGravity = false;
      }
    }
  }
}

function polygonVertices(shape) {
  const { radius, sides } = SHAPES[shape.level];
  const verts = [];
  const offset = shape.angle;
  for (let i = 0; i < sides; i++) {
    const a = offset + (i / sides) * Math.PI * 2;
    verts.push({ x: shape.x + Math.cos(a) * radius, y: shape.y + Math.sin(a) * radius });
  }
  return verts;
}

function polygonAxes(verts) {
  const axes = [];
  for (let i = 0; i < verts.length; i++) {
    const p1 = verts[i];
    const p2 = verts[(i + 1) % verts.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    const len = Math.hypot(edge.x, edge.y) || 1;
    // Normalized outward normal
    axes.push({ x: -edge.y / len, y: edge.x / len });
  }
  return axes;
}

function project(axis, verts) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of verts) {
    const p = v.x * axis.x + v.y * axis.y;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return { min, max };
}

function supportPoint(verts, dir) {
  let best = verts[0];
  let bestVal = verts[0].x * dir.x + verts[0].y * dir.y;
  for (let i = 1; i < verts.length; i++) {
    const v = verts[i];
    const val = v.x * dir.x + v.y * dir.y;
    if (val > bestVal) {
      bestVal = val;
      best = v;
    }
  }
  return best;
}

function satCollision(a, b) {
  const vertsA = polygonVertices(a);
  const vertsB = polygonVertices(b);
  const axes = [...polygonAxes(vertsA), ...polygonAxes(vertsB)];
  let minOverlap = Infinity;
  let bestAxis = null;
  for (const axis of axes) {
    const projA = project(axis, vertsA);
    const projB = project(axis, vertsB);
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxis = axis;
    }
  }
  // Ensure normal points from a to b
  const delta = { x: b.x - a.x, y: b.y - a.y };
  if (bestAxis.x * delta.x + bestAxis.y * delta.y < 0) {
    bestAxis = { x: -bestAxis.x, y: -bestAxis.y };
  }

  const contactA = supportPoint(vertsA, bestAxis);
  const contactB = supportPoint(vertsB, { x: -bestAxis.x, y: -bestAxis.y });
  return {
    normal: bestAxis,
    penetration: minOverlap,
    contactPoint: {
      x: (contactA.x + contactB.x) / 2,
      y: (contactA.y + contactB.y) / 2,
    },
    contactA,
    contactB,
  };
}

function applyCollision(a, b, collision) {
  const { normal, penetration, contactPoint, contactA, contactB } = collision;
  const invMassA = a.isKinematic ? 0 : 1;
  const invMassB = b.isKinematic ? 0 : 1;

  // Positional correction to prevent deep overlap
  const slop = WORLD.contactOffset;
  const correctionMag = Math.max(penetration - slop, 0) * 0.65;
  const correctionX = normal.x * correctionMag * 0.5;
  const correctionY = normal.y * correctionMag * 0.5;
  const totalInv = invMassA + invMassB;
  const shareA = totalInv ? invMassA / totalInv : 0.5;
  const shareB = totalInv ? invMassB / totalInv : 0.5;
  a.x -= correctionX * shareA;
  a.y -= correctionY * shareA;
  b.x += correctionX * shareB;
  b.y += correctionY * shareB;

  // Rigid body impulse with angular response
  const ra = { x: contactPoint.x - a.x, y: contactPoint.y - a.y };
  const rb = { x: contactPoint.x - b.x, y: contactPoint.y - b.y };
  const raPerpDotN = ra.x * normal.y - ra.y * normal.x;
  const rbPerpDotN = rb.x * normal.y - rb.y * normal.x;

  const velAx = a.vx + -a.spin * ra.y;
  const velAy = a.vy + a.spin * ra.x;
  const velBx = b.vx + -b.spin * rb.y;
  const velBy = b.vy + b.spin * rb.x;
  const rvx = velBx - velAx;
  const rvy = velBy - velAy;

  const velAlongNormal = rvx * normal.x + rvy * normal.y;
  if (velAlongNormal > 0) return penetration;

  const inertiaA = 0.5 * Math.pow(SHAPES[a.level].radius, 2);
  const inertiaB = 0.5 * Math.pow(SHAPES[b.level].radius, 2);
  const invIA = invMassA ? 1 / inertiaA : 0;
  const invIB = invMassB ? 1 / inertiaB : 0;

  const restitution = WORLD.restitution;
  const denom =
    invMassA +
    invMassB +
    (raPerpDotN * raPerpDotN) * invIA +
    (rbPerpDotN * rbPerpDotN) * invIB;
  if (denom === 0) return penetration;
  const j = (-(1 + restitution) * velAlongNormal) / denom;
  const jAbs = Math.abs(j);
  const microImpulse = jAbs < WORLD.impulseIgnore;
  const maxVertSpeed = Math.max(Math.abs(a.vy), Math.abs(b.vy));
  if (microImpulse) {
    if (maxVertSpeed < WORLD.microBounceVertical) {
      a.vx = 0;
      a.vy = 0;
      a.spin = 0;
      b.vx = 0;
      b.vy = 0;
      b.spin = 0;
    }
    // Ignore tiny impulses entirely, no wake
    return penetration;
  }

  const shouldWake = jAbs > WORLD.wakeImpulse;
  if (shouldWake) {
    wakeShape(a);
    wakeShape(b);
  }
  const impulseX = j * normal.x;
  const impulseY = j * normal.y;

  a.vx -= impulseX * invMassA;
  a.vy -= impulseY * invMassA;
  b.vx += impulseX * invMassB;
  b.vy += impulseY * invMassB;
  a.spin -= raPerpDotN * j * invIA;
  b.spin += rbPerpDotN * j * invIB;

  // Friction
  const tangent = {
    x: rvx - velAlongNormal * normal.x,
    y: rvy - velAlongNormal * normal.y,
  };
  const tLen = Math.hypot(tangent.x, tangent.y) || 1;
  tangent.x /= tLen;
  tangent.y /= tLen;
  const velAlongTangent = rvx * tangent.x + rvy * tangent.y;
  const frictionDenom =
    invMassA +
    invMassB +
    (raPerpDotN * raPerpDotN) * invIA +
    (rbPerpDotN * rbPerpDotN) * invIB;
  if (frictionDenom !== 0) {
    const jt = -velAlongTangent / frictionDenom;
    const mu = WORLD.friction;
    const friction = Math.max(-mu * Math.abs(j), Math.min(mu * Math.abs(j), jt));
    const fx = friction * tangent.x;
    const fy = friction * tangent.y;
    a.vx -= fx * invMassA;
    a.vy -= fy * invMassA;
    b.vx += fx * invMassB;
    b.vy += fy * invMassB;
    const raPerpDotT = ra.x * tangent.y - ra.y * tangent.x;
    const rbPerpDotT = rb.x * tangent.y - rb.y * tangent.x;
    a.spin -= raPerpDotT * friction * invIA;
    b.spin += rbPerpDotT * friction * invIB;
  }

  // Center-of-mass tipping: triangle perched off-center on a square
  const normalVertical = Math.abs(normal.y) > 0.85;
  if (normalVertical) {
    const top = normal.y < 0 ? b : a;
    const bottom = normal.y < 0 ? a : b;
    const topIsTriangle = SHAPES[top.level].sides === 3;
    const bottomIsSquare = SHAPES[bottom.level].sides === 4;
    if (topIsTriangle && bottomIsSquare) {
      const horizontalOffset = top.x - bottom.x;
      const threshold = SHAPES[bottom.level].radius * 0.45;
      if (Math.abs(horizontalOffset) > threshold) {
        const dir = Math.sign(horizontalOffset);
        top.spin += dir * 2.6;
        top.vx += dir * 120;
      }
    }
  }

  return penetration;
}

export function collide(shapes) {
  const mergePairs = [];
  // Multi-iteration solver to keep stacks stable
  const iterations = Math.max(WORLD.solverIterations, WORLD.solverVelocityIterations);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const collision = satCollision(shapes[i], shapes[j]);
        if (!collision) continue;
        const depth = applyCollision(shapes[i], shapes[j], collision);
        if (iter === 0 && depth !== null) mergePairs.push([i, j, depth]);
      }
    }
  }
  return mergePairs;
}

export function reachedCeiling(shapes, now) {
  let stuck = false;
  for (const s of shapes) {
    const r = SHAPES[s.level].radius;
    if (!s.topSince) s.topSince = 0;
    const nearTop = s.y - r < 4;
    if (nearTop) {
      if (Math.abs(s.vy) < 20) {
        if (!s.topSince) s.topSince = now;
        if (now - s.topSince > 500) stuck = true;
      } else {
        s.topSince = 0;
      }
    } else {
      s.topSince = 0;
    }
  }
  return stuck;
}
