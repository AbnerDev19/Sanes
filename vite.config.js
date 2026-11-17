import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  base: './',
  publicDir: '../public',
  esbuild: { jsx: 'automatic' },
  build: { outDir: '../dist', emptyOutDir: true },
});
