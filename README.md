# Atelier Nord: 3D product configurator

An e-commerce product page where customers configure a lounge chair in real-time 3D (wood, upholstery, legs, headrest), see the price update, share the exact configuration by link, and add it to a persistent cart.

**Live demo → [https://a-tlemcani.github.io/atelier-3d-configurator/](https://a-tlemcani.github.io/atelier-3d-configurator/)**

![Screenshot](https://a-tlemcani.github.io/work/atelier-3d-configurator.jpg)

## Highlights
- Procedural chair built from `RoundedBoxGeometry`, with **canvas-generated wood grain and fabric weave** textures tinted per option and PBR variants for leather, brass and steel
- Smooth colour cross-fades, headrest pillow that scales in, camera presets (¾, front, side, detail), soft VSM shadows
- **Shareable state:** the configuration lives in the URL hash, so links reproduce the exact chair
- **Cart drawer** persisted in `localStorage`, synced across tabs, merged by SKU
- **Input hardening** (`src/config.ts`, unit-tested): URL and storage values are whitelisted against known option ids, so crafted links or corrupted storage fall back to safe defaults

## Engineering
- **Stack:** Vite 8, TypeScript (strict), Three.js 0.186, no UI framework, with about 140 KB of JS gzipped including Three.js. The 3D chunk is lazy-loaded after first paint.
- **Performance:** device-pixel-ratio capped at 2, render loop paused when the canvas is off-screen or the tab is hidden, `prefers-reduced-motion` honoured.
- **Accessibility:** semantic HTML, native form controls, keyboard support, visible focus, ARIA only where native semantics fall short.
- **Security:** strict CSP (`default-src 'self'`, no inline scripts/styles), every string rendered via `textContent`, self-hosted fonts (no third-party requests, GDPR-friendly), pinned dependencies with a 14-day Dependabot cooldown, `npm audit` in CI.
- **SEO:** unique title/description, canonical URL, Open Graph, JSON-LD structured data, `robots.txt` and `sitemap.xml`.
- **Architecture:** `config.ts` (options, pricing, (de)serialisation, cart, all tested) · `chair.ts` (3D) · `main.ts` (UI). Hook `#checkout` to Stripe Checkout or Shopify Storefront API to sell for real.

## Run locally
```bash
npm ci --ignore-scripts
npm run dev      # http://localhost:5173
npm test         # unit tests (node:test)
npm run build    # typecheck + production build in dist/
```

## Deploy
Every push to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml` (Settings → Pages → Source: *GitHub Actions*).

---
Designed & developed by [Abderrahman Tlemcani](https://a-tlemcani.github.io/). The brand in this demo is fictional.
