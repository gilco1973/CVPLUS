import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          ui: ['lucide-react'],
          // Split large services
          'cv-services': [
            './src/services/cvService.ts',
            './src/services/cv/CVAnalyzer.ts',
            './src/services/cv/CVParser.ts',
            './src/services/cv/CVTransformer.ts'
          ],
          'feature-services': [
            './src/services/features/MagicTransformService.ts',
            './src/services/features/MediaService.ts',
            './src/services/features/VisualizationService.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500 // Show warnings for chunks > 500KB
  },
  // Environment variable prefixes that should be exposed to the client
  envPrefix: ['VITE_']
})
