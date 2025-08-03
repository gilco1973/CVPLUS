# GetMyCV.ai Project Setup Guide

This guide will help you set up the complete GetMyCV.ai project with React + Vite frontend and Firebase backend.

## Prerequisites

- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Git
- A Firebase project created at https://console.firebase.google.com

## Step 1: Initialize Project Structure

```bash
# Create project directory
mkdir getmycv
cd getmycv

# Initialize git
git init

# Create .gitignore
cat > .gitignore << EOF
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/
lib/

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.log

# Firebase
.firebase/
.firebaserc
firebase-debug.log
firestore-debug.log
ui-debug.log
database-debug.log
pubsub-debug.log

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF

# Create README
echo "# GetMyCV.ai - Single Click CV Creator" > README.md
```

## Step 2: Setup Frontend (React + Vite)

```bash
# Create frontend with Vite
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install core dependencies
npm install

# Install additional dependencies
npm install react-router-dom@6 zustand immer
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install framer-motion react-dropzone
npm install react-hook-form @hookform/resolvers zod
npm install firebase axios date-fns

# Install dev dependencies
npm install -D @types/react @types/react-dom @types/node
npm install -D @vitejs/plugin-react-swc
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint
npm install -D tailwindcss-animate

# Initialize Tailwind CSS
npx tailwindcss init -p

# Go back to root
cd ..
```

## Step 3: Setup Firebase Backend

```bash
# Initialize Firebase
firebase init

# Select the following options:
# - Functions: Configure a Cloud Functions directory
# - Firestore: Configure security rules and indexes
# - Hosting: Configure files for Firebase Hosting
# - Storage: Configure security rules
# - Emulators: Set up local emulators

# When prompted:
# - Choose "Create a new project" or select existing
# - Use TypeScript for functions
# - Use ESLint
# - Install dependencies with npm
# - For hosting, use "frontend/dist" as public directory
# - Configure as single-page app: Yes
# - Don't overwrite index.html

# Setup Functions
cd functions

# Install additional dependencies
npm install @anthropic-ai/sdk pdf-parse mammoth csv-parser
npm install docx puppeteer @google-cloud/storage
npm install express cors busboy

# Install type definitions
npm install -D @types/pdf-parse @types/busboy @types/express @types/cors

cd ..
```

## Step 4: Configure Environment Variables

### Frontend (.env.local)
```bash
# Create frontend/.env.local
cat > frontend/.env.local << EOF
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API endpoints
VITE_API_URL=http://localhost:5001/your_project/us-central1
VITE_FUNCTIONS_URL=https://us-central1-your_project.cloudfunctions.net
EOF
```

### Functions (.env)
```bash
# Create functions/.env
cat > functions/.env << EOF
ANTHROPIC_API_KEY=your_anthropic_api_key
NOTEBOOK_LLM_API_KEY=your_notebooklm_api_key
FILE_RETENTION_DAYS=30
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,csv,doc,docx,txt
EOF
```

## Step 5: Configure Firebase Files

### firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "source": "functions"
  },
  "hosting": {
    "public": "frontend/dist",
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
    ]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true
    }
  }
}
```

### firestore.rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to jobs for the owner
    match /jobs/{jobId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Allow read access to generated CVs
    match /generatedCVs/{cvId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Parsed CVs are only accessible via Cloud Functions
    match /parsedCVs/{cvId} {
      allow read: if false;
      allow write: if false;
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### storage.rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to upload CVs
    match /uploads/{userId}/{fileName} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 10 * 1024 * 1024 // 10MB limit
        && request.resource.contentType.matches('application/pdf|application/.*word.*|text/csv');
    }
    
    // Generated files are publicly readable
    match /generated-cvs/{jobId}/{fileName} {
      allow read: if true;
      allow write: if false;
    }
    
    // Podcasts are publicly readable
    match /podcasts/{jobId}/{fileName} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Step 6: Setup Frontend Structure

```bash
cd frontend

# Create directory structure
mkdir -p src/{components,pages,hooks,lib,services,store,styles,types}
mkdir -p src/components/{common,cv,features,recommendations,ui}

# Create base files
touch src/lib/firebase.ts
touch src/lib/utils.ts
touch src/store/cvStore.ts
touch src/services/cvService.ts
touch src/types/cv.ts

# Update main.tsx
cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Update App.tsx
cat > src/App.tsx << 'EOF'
import { BrowserRouter } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <h1 className="text-4xl font-bold text-center py-8">
          GetMyCV.ai - Coming Soon
        </h1>
      </div>
    </BrowserRouter>
  )
}

export default App
EOF

# Update index.css for Tailwind
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}
EOF

cd ..
```

## Step 7: Setup Backend Functions

```bash
cd functions/src

# Create initial function structure
cat > index.ts << 'EOF'
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export functions
export { uploadCV } from './functions/uploadCV';
export { parseCV } from './functions/parseCV';
export { generateCV } from './functions/generateCV';
export { generatePodcast } from './functions/generatePodcast';
EOF

# Create functions directory
mkdir functions
touch functions/uploadCV.ts
touch functions/parseCV.ts
touch functions/generateCV.ts
touch functions/generatePodcast.ts

cd ../..
```

## Step 8: Run Development Environment

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start frontend dev server
cd frontend
npm run dev

# Terminal 3: Watch functions for changes
cd functions
npm run build:watch
```

## Step 9: Build and Deploy

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase
cd ..
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,storage:rules
```

## Additional Configuration

### VS Code Settings (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Firebase
- Thunder Client (API testing)

## Next Steps

1. **Configure Firebase Console**:
   - Enable Authentication providers
   - Set up Cloud Functions billing
   - Configure custom domains

2. **Implement Core Features**:
   - CV upload and parsing
   - AI recommendations
   - Template system
   - Interactive features
   - Podcast generation

3. **Add Analytics**:
   - Firebase Analytics
   - Performance monitoring
   - Error tracking with Sentry

4. **Setup CI/CD**:
   - GitHub Actions for automated testing
   - Automated deployment on merge to main

## Troubleshooting

### Common Issues

1. **Firebase emulators not starting**:
   ```bash
   firebase logout
   firebase login
   ```

2. **Vite build errors**:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **TypeScript errors in functions**:
   ```bash
   cd functions
   npm run build
   ```

4. **CORS issues in development**:
   - Check Firebase Functions are using cors middleware
   - Ensure frontend is using correct API URLs

## Resources

- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)