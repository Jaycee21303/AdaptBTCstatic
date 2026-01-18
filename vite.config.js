import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const educationPages = readdirSync('education')
  .filter((file) => file.endsWith('.html'))
  .map((file) => ({
    name: `education-${file.replace('.html', '')}`,
    path: resolve(__dirname, 'education', file),
  }));

const input = {
  index: resolve(__dirname, 'index.html'),
  learning: resolve(__dirname, 'learning.html'),
  consulting: resolve(__dirname, 'consulting.html'),
  getInvolved: resolve(__dirname, 'get-involved.html'),
  toolsRedirect: resolve(__dirname, 'tools.html'),
  dca: resolve(__dirname, 'tools/dca/index.html'),
};

educationPages.forEach((page) => {
  input[page.name] = page.path;
});

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input,
      output: {
        manualChunks: {
          vendor: ['chart.js'],
        },
      },
    },
  },
});
