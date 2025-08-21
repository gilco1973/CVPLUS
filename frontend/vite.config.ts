import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Security headers plugin for development and production
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Content Security Policy - Development friendly (allows Firebase emulators)
          const cspPolicy = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://apis.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com data:",
            "connect-src 'self' https: wss: ws: http: http://localhost:* ws://localhost:* https://accounts.google.com https://oauth2.googleapis.com https://identitytoolkit.googleapis.com",
            "media-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "frame-src 'self' https://accounts.google.com http://localhost:9099"
          ].join('; ');
          
          res.setHeader('Content-Security-Policy', cspPolicy);
          
          // XSS Protection headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          
          // Additional security headers
          res.setHeader('Permissions-Policy', 
            'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
          );
          
          // Remove potentially revealing headers
          res.removeHeader('X-Powered-By');
          res.removeHeader('Server');
          
          next();
        });
      }
    }
  ],
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
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 1 // Reduce from 3 to 1 to prevent hanging
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Simplified chunk configuration to prevent infinite loops
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to reduce warnings
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/storage',
      'dompurify',
      'zod'
    ],
    exclude: [
      'framer-motion',
      'recharts',
      'firebase/compat',
      'firebase/analytics',
      'firebase/messaging',
      'firebase/performance'
    ]
  },
  // Environment variable prefixes that should be exposed to the client
  envPrefix: ['VITE_']
})
