import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'firebase',
    'firebase-admin',
    '@cvplus/core'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
});