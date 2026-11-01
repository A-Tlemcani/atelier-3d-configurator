# Atelier Nord — 3D product configurator — notes for Claude Code sessions

E-commerce 3D product configurator: live materials, pricing, shareable configurations and cart.

## Stack
Vite 8 + TypeScript (strict) + Three.js, no framework. Static build in `dist/`, deployed by `.github/workflows/deploy.yml` to GitHub Pages (https://abdeltl.github.io/atelier-3d-configurator/).

## Commands
- `npm ci --ignore-scripts` – install (lockfile is the source of truth)
- `npm run dev` – local server
- `npm test` – unit tests (node:test, where present)
- `npm run build` – typecheck + production build (must pass before any commit)

## Rules
- Commits are authored by Abderrahman TLEMCANI; no AI attribution trailers (see `.claude/settings.json`).
- Conventional commits (`feat:`, `fix:`, `perf:`, `docs:`, `ci:`, `chore:`).
- Never use `innerHTML` with user input; keep the CSP in `vite.config.ts` strict (no inline scripts or styles, no new origins without reason).
- Keep the 3D scene cheap: cap devicePixelRatio at 2, pause rendering when the tab is hidden or the canvas is off-screen, honour `prefers-reduced-motion`.
- New dependencies: pin exact versions released at least 14 days ago.
