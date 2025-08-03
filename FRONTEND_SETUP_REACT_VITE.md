# Frontend Setup with React + Vite

## Overview
The frontend is built with React and Vite for fast development and optimized production builds. It uses modern tooling and best practices for a scalable, performant application.

## Project Structure

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── fonts/
│   ├── components/
│   │   ├── common/
│   │   ├── cv/
│   │   ├── features/
│   │   ├── recommendations/
│   │   └── ui/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFirestore.ts
│   │   └── useCVGeneration.ts
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Upload.tsx
│   │   ├── Processing.tsx
│   │   ├── Preview.tsx
│   │   └── Dashboard.tsx
│   ├── services/
│   │   ├── cvService.ts
│   │   ├── authService.ts
│   │   └── analyticsService.ts
│   ├── store/
│   │   ├── cvStore.ts
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── components/
│   ├── types/
│   │   ├── cv.ts
│   │   ├── recommendations.ts
│   │   └── features.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.local
├── .eslintrc.cjs
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Initial Setup

### 1. Create Vite Project

```bash
# Create new Vite project with React and TypeScript
npm create vite@latest frontend -- --template react-ts

# Navigate to project
cd frontend

# Install dependencies
npm install
```

### 2. Install Core Dependencies

```bash
# React ecosystem
npm install react-router-dom@6 

# State management
npm install zustand immer

# UI and styling
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
npm install class-variance-authority clsx tailwind-merge
npm install framer-motion

# Forms and validation
npm install react-hook-form @hookform/resolvers zod

# Firebase
npm install firebase

# HTTP client
npm install axios

# File handling
npm install react-dropzone

# Utilities
npm install date-fns react-intersection-observer

# Dev dependencies
npm install -D @types/react @types/react-dom @types/node
npm install -D @vitejs/plugin-react-swc
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 3. Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', '@radix-ui/react-dialog'],
        },
      },
    },
  },
})
```

### 4. Configure Tailwind CSS

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 5. Setup Firebase

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Helper to get function references
export const getFunctionRef = (functionName: string) => {
  return functions.httpsCallable(functionName);
};
```

### 6. Environment Variables

```bash
# .env.local
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API endpoints
VITE_API_URL=http://localhost:5001/your-project/us-central1
VITE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net
```

## Core Components

### 1. Main App Component

```typescript
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/AuthProvider';
import { Layout } from '@/components/Layout';

// Pages
import Home from '@/pages/Home';
import Upload from '@/pages/Upload';
import Processing from '@/pages/Processing';
import Preview from '@/pages/Preview';
import Dashboard from '@/pages/Dashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/processing/:jobId" element={<Processing />} />
            <Route path="/preview/:jobId" element={<Preview />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Layout>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
```

### 2. State Management with Zustand

```typescript
// src/store/cvStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CVData, CVRecommendations, GeneratedCV } from '@/types/cv';

interface CVState {
  // State
  currentJobId: string | null;
  uploadedFile: File | null;
  parsedCV: CVData | null;
  recommendations: CVRecommendations | null;
  selectedFeatures: string[];
  generatedCV: GeneratedCV | null;
  processing: {
    status: 'idle' | 'uploading' | 'parsing' | 'generating' | 'completed' | 'error';
    progress: number;
    message: string;
  };

  // Actions
  setJobId: (jobId: string) => void;
  setUploadedFile: (file: File) => void;
  setParsedCV: (cv: CVData) => void;
  setRecommendations: (recommendations: CVRecommendations) => void;
  toggleFeature: (featureId: string) => void;
  setGeneratedCV: (cv: GeneratedCV) => void;
  updateProcessingStatus: (status: Partial<CVState['processing']>) => void;
  reset: () => void;
}

export const useCVStore = create<CVState>()(
  immer((set) => ({
    // Initial state
    currentJobId: null,
    uploadedFile: null,
    parsedCV: null,
    recommendations: null,
    selectedFeatures: [],
    generatedCV: null,
    processing: {
      status: 'idle',
      progress: 0,
      message: '',
    },

    // Actions
    setJobId: (jobId) =>
      set((state) => {
        state.currentJobId = jobId;
      }),

    setUploadedFile: (file) =>
      set((state) => {
        state.uploadedFile = file;
      }),

    setParsedCV: (cv) =>
      set((state) => {
        state.parsedCV = cv;
      }),

    setRecommendations: (recommendations) =>
      set((state) => {
        state.recommendations = recommendations;
        // Auto-select essential features
        if (recommendations.interactiveFeatures?.essential) {
          state.selectedFeatures = recommendations.interactiveFeatures.essential;
        }
      }),

    toggleFeature: (featureId) =>
      set((state) => {
        const index = state.selectedFeatures.indexOf(featureId);
        if (index > -1) {
          state.selectedFeatures.splice(index, 1);
        } else {
          state.selectedFeatures.push(featureId);
        }
      }),

    setGeneratedCV: (cv) =>
      set((state) => {
        state.generatedCV = cv;
      }),

    updateProcessingStatus: (status) =>
      set((state) => {
        Object.assign(state.processing, status);
      }),

    reset: () =>
      set((state) => {
        state.currentJobId = null;
        state.uploadedFile = null;
        state.parsedCV = null;
        state.recommendations = null;
        state.selectedFeatures = [];
        state.generatedCV = null;
        state.processing = {
          status: 'idle',
          progress: 0,
          message: '',
        };
      }),
  }))
);
```

### 3. Upload Component

```typescript
// src/pages/Upload.tsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useCVStore } from '@/store/cvStore';
import { uploadCV, submitURL } from '@/services/cvService';
import { toast } from '@/hooks/use-toast';

export default function Upload() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { setJobId, setUploadedFile, updateProcessingStatus } = useCVStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setIsUploading(true);
    updateProcessingStatus({ status: 'uploading', message: 'Uploading file...' });

    try {
      const { jobId } = await uploadCV(file);
      setJobId(jobId);
      toast({
        title: 'Upload successful',
        description: 'Your CV is being processed.',
      });
      navigate(`/processing/${jobId}`);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      updateProcessingStatus({ status: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }, [navigate, setJobId, setUploadedFile, updateProcessingStatus]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsUploading(true);
    updateProcessingStatus({ status: 'uploading', message: 'Fetching URL...' });

    try {
      const { jobId } = await submitURL(url);
      setJobId(jobId);
      toast({
        title: 'URL submitted',
        description: 'Your CV is being processed.',
      });
      navigate(`/processing/${jobId}`);
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
      updateProcessingStatus({ status: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Upload Your CV</h1>
        <p className="text-lg text-muted-foreground">
          Transform your CV into an interactive professional profile
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* File Upload */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UploadIcon className="w-5 h-5" />
            Upload File
          </h2>
          
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}
            `}
          >
            <input {...getInputProps()} disabled={isUploading} />
            <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? 'Drop your CV here'
                : 'Drag & drop your CV here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOCX, DOC, CSV (Max 10MB)
            </p>
          </div>
        </Card>

        {/* URL Input */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Enter URL
          </h2>
          
          <form onSubmit={handleURLSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                CV URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/my-cv.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isUploading}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={!url || isUploading}
            >
              {isUploading ? 'Processing...' : 'Submit URL'}
            </Button>
          </form>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Enter a direct link to your CV hosted online. We'll fetch and
              process it automatically.
            </p>
          </div>
        </Card>
      </div>

      {/* Sample CVs */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold mb-4">Try Sample CVs</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {sampleCVs.map((sample) => (
            <Card
              key={sample.id}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSampleCV(sample.url)}
            >
              <h4 className="font-medium">{sample.title}</h4>
              <p className="text-sm text-muted-foreground">{sample.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const sampleCVs = [
  {
    id: 'tech-lead',
    title: 'Tech Lead CV',
    description: '10+ years experience in software engineering',
    url: 'https://example.com/samples/tech-lead.pdf',
  },
  {
    id: 'designer',
    title: 'UX Designer CV',
    description: 'Creative professional with portfolio',
    url: 'https://example.com/samples/designer.pdf',
  },
  {
    id: 'graduate',
    title: 'Recent Graduate CV',
    description: 'Entry-level with academic achievements',
    url: 'https://example.com/samples/graduate.pdf',
  },
];
```

### 4. Processing Component

```typescript
// src/pages/Processing.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCVStore } from '@/store/cvStore';
import { subscribeToJobStatus } from '@/services/cvService';

const processingSteps = [
  { id: 'upload', label: 'File Uploaded', progress: 10 },
  { id: 'parse', label: 'Analyzing CV Content', progress: 30 },
  { id: 'enhance', label: 'Enhancing with AI', progress: 50 },
  { id: 'recommendations', label: 'Generating Recommendations', progress: 70 },
  { id: 'generate', label: 'Creating Interactive CV', progress: 90 },
  { id: 'complete', label: 'Ready for Preview', progress: 100 },
];

export default function Processing() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { setParsedCV, setRecommendations, updateProcessingStatus } = useCVStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = subscribeToJobStatus(jobId, (status) => {
      updateProcessingStatus({
        status: status.status,
        progress: status.progress,
        message: status.message || '',
      });

      // Update current step based on progress
      const stepIndex = processingSteps.findIndex(
        (step) => status.progress <= step.progress
      );
      setCurrentStep(Math.max(0, stepIndex));

      // Handle completion
      if (status.status === 'completed') {
        if (status.parsedCV) setParsedCV(status.parsedCV);
        if (status.recommendations) setRecommendations(status.recommendations);
        
        setTimeout(() => {
          navigate(`/preview/${jobId}`);
        }, 1000);
      }

      // Handle error
      if (status.status === 'failed') {
        setError(status.error || 'Processing failed');
      }
    });

    return () => unsubscribe();
  }, [jobId, navigate, setParsedCV, setRecommendations, updateProcessingStatus]);

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Card className="p-8 text-center">
          <div className="text-destructive mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Processing Failed</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate('/upload')} variant="outline">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12">
      <Card className="p-8">
        <h1 className="text-2xl font-bold text-center mb-8">
          Processing Your CV
        </h1>

        <div className="space-y-6">
          {processingSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {index < currentStep ? (
                    <CheckCircle className="w-6 h-6 text-primary" />
                  ) : index === currentStep ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-grow">
                  <p
                    className={`font-medium ${
                      index <= currentStep
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <Progress
            value={processingSteps[Math.min(currentStep, processingSteps.length - 1)].progress}
            className="h-2"
          />
          <p className="text-sm text-muted-foreground text-center mt-2">
            {processingSteps[Math.min(currentStep, processingSteps.length - 1)].progress}% complete
          </p>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            This usually takes 1-2 minutes. We're using AI to analyze your CV
            and create the best possible version.
          </p>
        </div>
      </Card>
    </div>
  );
}
```

### 5. API Service Layer

```typescript
// src/services/cvService.ts
import axios from 'axios';
import { 
  collection, 
  doc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface UploadResponse {
  jobId: string;
  message: string;
}

export interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  parsedCV?: any;
  recommendations?: any;
}

// Upload CV file
export async function uploadCV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(
    `${API_URL}/uploadCV`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

// Submit CV URL
export async function submitURL(url: string): Promise<UploadResponse> {
  const response = await axios.post<UploadResponse>(
    `${API_URL}/submitURL`,
    { url }
  );

  return response.data;
}

// Subscribe to job status updates
export function subscribeToJobStatus(
  jobId: string,
  callback: (status: JobStatus) => void
): Unsubscribe {
  const jobRef = doc(db, 'jobs', jobId);
  
  return onSnapshot(jobRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        status: data.status,
        progress: data.progress || 0,
        message: data.message,
        error: data.error,
      });

      // If completed, fetch additional data
      if (data.status === 'completed') {
        fetchCompletedJobData(jobId).then((completeData) => {
          callback({
            ...data,
            ...completeData,
          });
        });
      }
    }
  });
}

// Fetch completed job data
async function fetchCompletedJobData(jobId: string) {
  try {
    const [parsedCVResponse, recommendationsResponse] = await Promise.all([
      axios.get(`${API_URL}/getParsedCV/${jobId}`),
      axios.get(`${API_URL}/getRecommendations/${jobId}`),
    ]);

    return {
      parsedCV: parsedCVResponse.data,
      recommendations: recommendationsResponse.data,
    };
  } catch (error) {
    console.error('Error fetching job data:', error);
    return {};
  }
}

// Generate CV with selected options
export async function generateCV(
  jobId: string,
  options: {
    templateId: string;
    features: string[];
    format: string;
  }
) {
  const response = await axios.post(
    `${API_URL}/generateCV`,
    {
      jobId,
      ...options,
    }
  );

  return response.data;
}

// Download generated CV
export async function downloadCV(
  jobId: string,
  format: 'pdf' | 'docx' | 'html'
) {
  const response = await axios.get(
    `${API_URL}/downloadCV?jobId=${jobId}&format=${format}`,
    {
      responseType: 'blob',
    }
  );

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `cv-${jobId}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
```

## Build and Deployment

### 1. Build Configuration

```json
// package.json
{
  "name": "getmycv-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit",
    "deploy": "npm run build && firebase deploy --only hosting"
  },
  "dependencies": {
    // ... dependencies listed above
  },
  "devDependencies": {
    // ... dev dependencies listed above
  }
}
```

### 2. Firebase Hosting Configuration

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### 3. Production Build Optimization

```typescript
// vite.config.ts (production optimizations)
export default defineConfig({
  // ... existing config
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-select'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils': ['date-fns', 'axios', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});
```

## Performance Optimization

### 1. Code Splitting

```typescript
// Lazy load pages
const Home = lazy(() => import('@/pages/Home'));
const Upload = lazy(() => import('@/pages/Upload'));
const Processing = lazy(() => import('@/pages/Processing'));
const Preview = lazy(() => import('@/pages/Preview'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Wrap routes in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<Home />} />
    {/* ... other routes */}
  </Routes>
</Suspense>
```

### 2. Image Optimization

```typescript
// src/components/OptimizedImage.tsx
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    // Use Firebase Storage image resizing
    const optimizedSrc = src.includes('firebasestorage.googleapis.com')
      ? `${src}?alt=media&w=${width || 800}`
      : src;
    
    setImageSrc(optimizedSrc);
  }, [src, width]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        onLoad={() => setIsLoading(false)}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
      />
    </div>
  );
}
```

### 3. PWA Support

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GetMyCV.ai - Interactive CV Creator',
        short_name: 'GetMyCV.ai',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
```

## Testing Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

This setup provides a modern, performant React application with Vite, featuring:
- Fast HMR and build times
- Optimized production builds
- Firebase integration
- Modern UI components
- Type safety with TypeScript
- State management with Zustand
- Comprehensive routing
- Testing setup
- PWA support