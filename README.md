# Shape Merge

Shape Merge is a minimalist stacking-and-merging puzzle where falling polygons combine into higher-level shapes. Aim your drops, manage bounces, and stack cleanly to reach the dodecagon to win.

## How to Play
- Move your cursor (or finger) to aim the drop position inside the container.
- Click/tap or press **Drop** to release a shape; **Restart** resets the board.
- Dev/test helpers: **Spawn Final** drops a 12-sided shape instantly; **Fill** packs the well to trigger a quick game-over check.
- First three drops are triangles. After that: 65% triangle, 25% square, 10% pentagon.
- Touching identical shapes merge instantly into the next level (triangle → square → … → dodecagon).
- The game ends if you overflow the top or if you reach the dodecagon.

## Controls
- Mouse/touch move: aim horizontally.
- Click/tap canvas or **Drop** button: drop current shape.
- **Restart** button: start a new run.
- **Spawn Final** button: spawn the final dodecagon for quick win-testing.
- **Fill** button: fill the container to the top to test overflow/game-over.

## Tech Stack
- Vanilla HTML/CSS/JS.
- Canvas 2D rendering.
- Custom SAT-based collision/stacking physics tailored for merging gameplay.

## Run Locally
1) Clone the repo.  
2) Open `index.html` directly in your browser, or serve the folder (e.g. `npx serve .`).  
3) Play on desktop or mobile; the canvas scales to the shell width.

## Tuning (optional)
Physics and shape parameters live in `src/constants.js` if you want to tweak gravity, friction, or solver iterations.

## Screenshots
Add your own gameplay screenshots here before publishing.
