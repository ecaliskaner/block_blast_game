# POP! — Block Blast

A responsive, dependency-free arcade puzzle game with colorful blocks, particles, screen shake, synthesized sound, and saved personal bests.

## Play locally

Use Node.js 20 or later, run `npm start`, and open http://localhost:3000. Run `npm test` for gameplay engine tests and `npm run check` for JavaScript syntax checks. No installation step is required.

## Rules

- Tap 4 orthogonally connected blocks of one color to clear them.
- A group of 5–9 creates a rocket. Its randomly assigned arrow indicates whether it clears a row or column when tapped.
- Tap either of two adjacent rockets to clear three rows and three columns centered on the tapped rocket.
- Groups of 10+ create TNT, which clears a 5 × 5 area when tapped.
- Explosions trigger other power-ups in their path. New power-ups remain on the board and fall with gravity.
- Each valid tap costs one of 30 moves. Invalid taps are free. A shuffle costs one move and retains power-ups.
- Earn 40 points per cleared block, another 20 per block when creating a power-up, and 500 bonus points for a double rocket blast.
- Boards without any possible move automatically gain a matching group.

Sound is opt-in. Reduced-motion preferences are respected. Blocks have distinct shapes, accessible labels, arrow-key navigation, and native keyboard activation. Best scores persist locally when browser storage is available.

## Hosting

The game is static: deploy `index.html`, `style.css`, `game.js`, and `engine.js` on any static web host. Google Fonts is optional; system font fallbacks are supplied.
