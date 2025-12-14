import { WORLD, clamp } from "./constants.js";
import { ShapeMergeGame } from "./game.js";
import { clear, drawContainer, drawPreview, drawShapes } from "./renderer.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const dropBtn = document.getElementById("dropBtn");
const resetBtn = document.getElementById("resetBtn");

canvas.width = WORLD.width;
canvas.height = WORLD.height;

const overlayEl = document.getElementById("overlay");
const popupTitleEl = document.getElementById("popupTitle");
const popupSubtitleEl = document.getElementById("popupSubtitle");
const playAgainBtn = document.getElementById("playAgainBtn");

function showPopup(title, subtitle) {
  popupTitleEl.textContent = title;
  popupSubtitleEl.textContent = subtitle;
  overlayEl.classList.remove("hidden");
}

function hidePopup() {
  overlayEl.classList.add("hidden");
}

const game = new ShapeMergeGame(ctx, statusEl, {
  onGameOver: () => showPopup("Game Over", "The stack has reached the top!"),
  onGameCompleted: () => showPopup("Congratulations!", "You reached the final shape!"),
});
let lastTime = performance.now();

function worldXFromClient(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scale = WORLD.width / rect.width;
  return (clientX - rect.left) * scale;
}

function handleAim(clientX) {
  const x = worldXFromClient(clientX);
  game.setPreview(clamp(x, WORLD.wall, WORLD.width - WORLD.wall));
}

function handleDrop() {
  game.drop();
}

canvas.addEventListener("mousemove", (e) => handleAim(e.clientX));
canvas.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  handleAim(touch.clientX);
});

canvas.addEventListener("click", handleDrop);
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handleDrop();
  },
  { passive: false }
);

dropBtn.addEventListener("click", handleDrop);
resetBtn.addEventListener("click", () => {
  game.reset();
  lastTime = performance.now();
  hidePopup();
});
playAgainBtn.addEventListener("click", () => {
  hidePopup();
  game.reset();
  lastTime = performance.now();
});

function drawFrame() {
  clear(ctx);
  drawContainer(ctx);
  drawShapes(ctx, game.shapes);
  if (!game.isGameOver && !game.isGameCompleted) drawPreview(ctx, game.previewX, game.nextLevel);
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  game.step(dt);
  drawFrame();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
