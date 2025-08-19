// CORS configuration for all allowed origins
export const corsOptions = {
  cors: {
    origin: [
      'https://getmycv-ai.firebaseapp.com',
      'https://getmycv-ai.web.app',
      'https://cvplus.firebaseapp.com',
      'https://cvplus.web.app',
      'https://cvplus.ai',
      'https://www.cvplus.ai',
      'http://localhost:3000', // React dev server (port 3000)
      'http://localhost:3001', // React dev server (port 3001)
      'http://localhost:3002', // React dev server (port 3002)
      'http://localhost:5173', // Vite dev server
      'http://localhost:5000', // Firebase emulator
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-Requested-With'
    ]
  }
};

// For v2 functions that need simple cors
export const simpleCorsOptions = {
  cors: true
};

// Enhanced CORS options with error handling
export const enhancedCorsOptions = {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://getmycv-ai.firebaseapp.com',
        'https://getmycv-ai.web.app',
        'https://cvplus.firebaseapp.com',
        'https://cvplus.web.app',
        'https://cvplus.ai',
        'https://www.cvplus.ai',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5173',
        'http://localhost:5000'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  }
};

// Utility function to add CORS headers manually if needed
export function addCorsHeaders(response: any, origin?: string): void {
  const allowedOrigins = [
    'https://getmycv-ai.firebaseapp.com',
    'https://getmycv-ai.web.app',
    'https://cvplus.firebaseapp.com',
    'https://cvplus.web.app',
    'https://cvplus.ai',
    'https://www.cvplus.ai',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5000'
  ];
  
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  response.set({
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  });
}