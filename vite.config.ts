/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works when served from a subpath (GitHub Pages)
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
