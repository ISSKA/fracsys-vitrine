import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: process.env.DEPLOY_BASE ?? '/',
  envDir: fromRoot('./vitrine-flowviewer'),
  publicDir: fromRoot('./vitrine-flowviewer/public'),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        mesh: fromRoot('./index.html'),
        flow: fromRoot('./flow/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
