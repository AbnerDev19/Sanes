import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: 'app',
  resolve: { alias: { '/src': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: './',
  publicDir: '../public',
  esbuild: { jsx: 'automatic' },
  build: { outDir: '../dist', emptyOutDir: true },
});
