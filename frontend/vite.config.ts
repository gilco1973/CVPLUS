import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    define: {
      // Firebase tree shaking
      __FIREBASE_DEFAULTS__: JSON.stringify({
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      })
    },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false, // Disable source maps in production for smaller size
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3, // Multiple passes for better compression
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        hoist_funs: true,
        hoist_vars: true
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // More intelligent chunk splitting based on actual imports
          if (id.includes('node_modules')) {
            // Vendor chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            if (id.includes('recharts') || id.includes('chart')) {
              return 'charts-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // All other node_modules
            return 'vendor';
          }
          
          // Application chunks
          if (id.includes('/pages/CVPreview') || id.includes('/components/cv/CVPreview')) {
            return 'cv-preview';
          }
          if (id.includes('/pages/Portfolio') || id.includes('/components/portfolio')) {
            return 'portfolio';
          }
          if (id.includes('/services/cv/') || id.includes('CVAnalyzer') || id.includes('CVParser')) {
            return 'cv-services';
          }
          if (id.includes('/services/features/') || id.includes('MediaService')) {
            return 'feature-services';
          }
          if (id.includes('/components/media/') || id.includes('VideoPlayer') || id.includes('AudioPlayer')) {
            return 'media-components';
          }
        }
      }
    },
    chunkSizeWarningLimit: 300 // More aggressive warning limit (300KB)
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions'
    ],
    exclude: [
      'framer-motion',
      'recharts',
      'firebase/compat',
      'firebase/storage',
      'firebase/analytics',
      'firebase/messaging',
      'firebase/performance'
    ]
  },
  // Environment variable prefixes that should be exposed to the client
  envPrefix: ['VITE_']
})
