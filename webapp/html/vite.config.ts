import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Base public path
  base: './',

  // Development server configuration
  server: {
    port: 3000,
    open: true, // Automatically open browser
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },

  // Resolve configuration
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement: path.resolve(__dirname, './lib/three@0.181.0/build/three.module.js'),
      },
      {
        find: /^three\/addons\/(.*)$/,
        replacement: path.resolve(__dirname, './lib/three@0.181.0/examples/jsm/$1'),
      },
    ],
  },
});
