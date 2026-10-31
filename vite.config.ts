import { defineConfig, type Plugin } from 'vite';

/**
 * Strict Content-Security-Policy, injected into the production HTML only
 * (Vite's dev server relies on inline styles for HMR).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  'upgrade-insecure-requests',
].join('; ');

const csp = (): Plugin => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// Relative base so the build works on GitHub Pages project URLs and any static host.
export default defineConfig({
  base: './',
  plugins: [csp()],
  build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
