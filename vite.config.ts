import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages project URLs and any static host.
export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
});
