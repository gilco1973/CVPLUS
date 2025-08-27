import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CVPlusRecommendations',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`
    },
    rollupOptions: {
      external: [
        'react', 
        'react-dom', 
        'firebase', 
        'firebase-admin', 
        '@cvplus/core',
        'node:crypto',
        'crypto'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          firebase: 'Firebase',
          'firebase-admin': 'FirebaseAdmin',
          '@cvplus/core': 'CVPlusCore',
          'node:crypto': 'crypto',
          'crypto': 'crypto'
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
