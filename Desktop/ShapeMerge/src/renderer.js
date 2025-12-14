import { SHAPES, WORLD, clamp } from "./constants.js";

function polygon(ctx, x, y, radius, sides, angle, color) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.stroke();
}

export function clear(ctx) {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
}

export function drawContainer(ctx) {
  ctx.save();
  const left = WORLD.wall;
  const right = WORLD.width - WORLD.wall;
  const bottom = WORLD.height - WORLD.floor;
  ctx.fillStyle = "#f0e3c7";
  ctx.fillRect(left, 0, right - left, bottom);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = WORLD.wall * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, 0);
  ctx.lineTo(left, bottom);
  ctx.moveTo(right, 0);
  ctx.lineTo(right, bottom);
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function drawShapes(ctx, shapes) {
  for (const s of shapes) {
    const shape = SHAPES[s.level];
    polygon(ctx, s.x, s.y, shape.radius, shape.sides, s.angle, shape.color);
  }
}

export function drawPreview(ctx, previewX, level) {
  const shape = SHAPES[level];
  const x = clamp(previewX, WORLD.wall + shape.radius, WORLD.width - WORLD.wall - shape.radius);
  const y = shape.radius + 6;
  ctx.globalAlpha = 0.35;
  polygon(ctx, x, y, shape.radius, shape.sides, -Math.PI / 2, shape.color);
  ctx.globalAlpha = 1;
}
