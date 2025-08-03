# GetMyCV.ai - System Design Document

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [UI/UX Design](#uiux-design)
4. [Technical Stack](#technical-stack)
5. [API Design](#api-design)
6. [Security Considerations](#security-considerations)
7. [Deployment Architecture](#deployment-architecture)
8. [Advanced Features](#advanced-features)
9. [Performance Requirements](#performance-requirements)
10. [Cost Estimation](#cost-estimation)

## Overview
GetMyCV.ai is an AI-powered system that transforms existing CVs/resumes into professional, enhanced versions with multimedia capabilities. Users can upload a CV in various formats or provide a URL, and the system automatically generates an advanced professional CV with additional features including an AI-generated podcast.

## System Architecture

### High-Level Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│ Firebase Hosting │────▶│Firebase Functions│
│  (React/Next.js)│     │  (Static Files)  │     │  (Serverless)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                              ┌────────────────────────────┼────────────────────────────┐
                              │                            │                            │
                        ┌─────▼──────┐          ┌─────────▼─────────┐        ┌─────────▼─────────┐
                        │  Firebase  │          │  Anthropic API    │        │  NotebookLLM API  │
                        │  Storage   │          │  (CV Analysis)    │        │ (Podcast Gen)     │
                        └────────────┘          └───────────────────┘        └───────────────────┘
                              │
                        ┌─────▼──────┐
                        │  Firestore │
                        │  Database  │
                        └────────────┘
```

### Core Components

#### 1. Frontend Application
- **Technology**: React with Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Routing**: React Router v6
- **Features**:
  - Drag-and-drop file upload
  - URL input field
  - Real-time progress indicators
  - Preview of generated CV
  - Download options (PDF, DOCX, etc.)
  - Podcast player integration

#### 2. Backend API (Firebase Functions)
- **Technology**: Node.js with Firebase Functions
- **Database**: Firestore for all data storage
- **Queue System**: Firebase Cloud Tasks for async processing
- **Features**:
  - RESTful API endpoints via Cloud Functions
  - Firebase Realtime Database for real-time updates
  - Firebase Authentication
  - Built-in rate limiting and quotas
  - Cloud Logging for error tracking

#### 3. CV Processing Pipeline
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ File Upload │────▶│ File Parser  │────▶│ AI Analysis │────▶│ CV Generator │
│   Handler   │     │ (PDF/CSV/URL)│     │ (Anthropic) │     │  (Templates) │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                       │
                                                              ┌────────▼────────┐
                                                              │ Podcast Creator │
                                                              │  (NotebookLLM)  │
                                                              └─────────────────┘
```

### Data Flow

1. **Input Stage**
   - User uploads CV file (PDF/CSV) or provides URL
   - System validates input format
   - File stored temporarily in cloud storage

2. **Analysis Stage**
   - Extract text from uploaded document
   - Send to Anthropic API for intelligent parsing
   - Receive structured CV data (JSON format)

3. **Enhancement Stage**
   - Apply professional templates
   - Enhance content using AI suggestions
   - Generate multiple format options

4. **Multimedia Stage**
   - Create NotebookLLM datasource from CV content
   - Generate podcast discussing achievements
   - Create visual timeline/infographics

5. **Output Stage**
   - Generate final CV in multiple formats
   - Provide download links
   - Send notification to user

## UI/UX Design

### User Flow Diagram

```mermaid
flowchart TD
    A[Landing Page] --> B{User Action}
    B -->|Upload CV| C[File Upload UI]
    B -->|Enter URL| D[URL Input UI]
    
    C --> E[Processing Screen]
    D --> E[Processing Screen]
    
    E --> F[AI Analysis]
    F --> G[Preview Generated CV]
    
    G --> H{User Options}
    H -->|Download| I[Download Options]
    H -->|Edit| J[Template Selection]
    H -->|Play Podcast| K[Podcast Player]
    
    I --> L[Select Format]
    L --> M[Download File]
    
    J --> N[Apply Template]
    N --> G
    
    K --> O[Audio Player UI]
```

### Main Screen Wireframe

```mermaid
graph TB
    subgraph "Landing Page"
        A[Header with Logo]
        B[Hero Section - Single Click CV Creator]
        C[Upload Area - Drag & Drop]
        D[URL Input Field]
        E[Sample CVs Gallery]
        F[Features Section]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
```

### Processing Screen Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Backend
    participant AI
    participant Storage
    
    User->>UI: Upload CV/Enter URL
    UI->>Backend: Send file/URL
    Backend->>Storage: Store original file
    Backend->>AI: Analyze CV content
    AI-->>Backend: Return parsed data
    Backend->>AI: Generate enhanced CV
    AI-->>Backend: Return enhanced content
    Backend->>Storage: Save generated files
    Backend-->>UI: Send completion status
    UI-->>User: Show preview & options
```

### Component Hierarchy

```mermaid
graph TD
    A[App Root] --> B[Navigation Bar]
    A --> C[Main Container]
    
    C --> D[Upload Section]
    C --> E[Processing Section]
    C --> F[Preview Section]
    C --> G[Download Section]
    
    D --> H[Drag Drop Zone]
    D --> I[URL Input]
    D --> J[File Preview]
    
    E --> K[Progress Bar]
    E --> L[Status Messages]
    E --> M[Animation Loader]
    
    F --> N[CV Preview]
    F --> O[Template Selector]
    F --> P[Edit Options]
    
    G --> Q[Format Options]
    G --> R[Podcast Player]
    G --> S[Share Options]
```

### Mobile Responsive Design

```mermaid
graph LR
    subgraph "Desktop View"
        A1[3-Column Layout]
        A2[Full Preview]
        A3[Side Controls]
    end
    
    subgraph "Tablet View"
        B1[2-Column Layout]
        B2[Stacked Controls]
        B3[Scrollable Preview]
    end
    
    subgraph "Mobile View"
        C1[Single Column]
        C2[Accordion Sections]
        C3[Bottom Actions]
    end
    
    A1 --> B1
    B1 --> C1
```

### UI Component States

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Uploading: User uploads file
    Idle --> InputtingURL: User enters URL
    
    Uploading --> Processing
    InputtingURL --> Processing
    
    Processing --> Analyzing: File validated
    Processing --> Error: Validation failed
    
    Analyzing --> Generating: Analysis complete
    Generating --> Preview: CV generated
    
    Preview --> Downloading: User downloads
    Preview --> Editing: User edits
    Preview --> Playing: User plays podcast
    
    Editing --> Preview: Changes applied
    
    Downloading --> Complete
    Playing --> Complete
    
    Error --> Idle: User retries
    Complete --> [*]
```

## Technical Stack

### Frontend
```json
{
  "framework": "Vite 5+",
  "ui": "React 18+",
  "routing": "React Router v6",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui",
  "state": "Zustand",
  "forms": "React Hook Form + Zod",
  "http": "Firebase SDK + Axios",
  "animations": "Framer Motion",
  "build": "Vite",
  "hosting": "Firebase Hosting"
}
```

### Backend (Firebase)
```json
{
  "runtime": "Node.js 18+",
  "framework": "Firebase Functions",
  "database": "Firestore",
  "auth": "Firebase Authentication",
  "storage": "Firebase Storage",
  "queue": "Cloud Tasks",
  "logging": "Cloud Logging",
  "monitoring": "Firebase Performance Monitoring"
}
```

### AI/ML Services
```json
{
  "cv_analysis": "Anthropic Claude API",
  "podcast_generation": "NotebookLLM API",
  "text_enhancement": "Anthropic Claude API",
  "image_generation": "Stable Diffusion/DALL-E (optional)"
}
```

## API Design

### Firebase Functions Endpoints

```typescript
// Upload CV
exports.uploadCV = functions.https.onRequest(async (req, res) => {
  // POST /uploadCV
  // Body: multipart/form-data { file: File }
  // Response: { jobId: string, status: 'processing' }
});

// Submit URL
exports.submitURL = functions.https.onRequest(async (req, res) => {
  // POST /submitURL
  // Body: { url: string }
  // Response: { jobId: string, status: 'processing' }
});

// Check Status
exports.getStatus = functions.https.onRequest(async (req, res) => {
  // GET /getStatus?jobId=xxx
  // Response: { 
  //   status: 'processing' | 'completed' | 'failed',
  //   progress: number,
  //   result?: CVResult
  // }
});

// Download Generated CV
exports.downloadCV = functions.https.onRequest(async (req, res) => {
  // GET /downloadCV?jobId=xxx&format=pdf
  // Params: format = 'pdf' | 'docx' | 'html'
  // Response: File download URL from Firebase Storage
});

// Get Podcast
exports.getPodcast = functions.https.onRequest(async (req, res) => {
  // GET /getPodcast?jobId=xxx
  // Response: { podcastUrl: string, transcript: string }
});
```

### Firestore Data Models

```typescript
// Collection: 'jobs'
interface JobDocument {
  id: string;
  userId?: string;
  originalFileUrl: string; // Firebase Storage URL
  uploadedAt: firebase.firestore.Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

// Collection: 'parsedCVs'
interface ParsedCV {
  jobId: string;
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
}

// Collection: 'generatedCVs'
interface GeneratedCV {
  id: string;
  jobId: string;
  formats: {
    pdf: string; // Firebase Storage URL
    docx: string; // Firebase Storage URL
    html: string; // Firebase Storage URL
  };
  enhancements: {
    improvedSummary: string;
    suggestedSkills: string[];
    achievementHighlights: string[];
  };
  podcast: {
    url: string; // Firebase Storage URL
    duration: number;
    transcript: string;
  };
  metadata: {
    template: string;
    generatedAt: firebase.firestore.Timestamp;
    aiModel: string;
  };
}
```

## Security Considerations

1. **Data Privacy**
   - Firebase automatically encrypts data at rest and in transit
   - Implement GDPR compliance with Firestore TTL policies
   - Auto-delete files after 30 days using Cloud Scheduler
   - Firebase Storage security rules for access control

2. **API Security**
   - Firebase Authentication for user management
   - Firebase Security Rules for Firestore access
   - Function-level authentication checks
   - Built-in Firebase rate limiting
   - CORS configuration in Firebase Functions

3. **File Security**
   - Cloud Functions virus scanning on uploads
   - File type validation in upload function
   - Size limits (10MB max) enforced by Firebase Storage
   - Secure signed URLs for temporary access

## Environment Configuration

```bash
# .env file structure for Firebase Functions
# AI Services
ANTHROPIC_API_KEY=your_anthropic_key
NOTEBOOK_LLM_API_KEY=your_notebooklm_key

# Firebase Config (auto-configured in Functions environment)
# FIREBASE_CONFIG automatically available
# GCLOUD_PROJECT automatically available

# Custom Config
FILE_RETENTION_DAYS=30
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=pdf,csv,doc,docx,txt

# Frontend .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Deployment Architecture

### Firebase Deployment
```bash
# Deploy Frontend to Firebase Hosting
cd frontend
npm run build # Build React app with Vite
firebase deploy --only hosting

# Deploy Backend Functions
cd ../functions
npm run deploy # Deploys all Cloud Functions

# Deploy Security Rules
cd ..
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# Full Deployment
firebase deploy # Deploys everything
```

### Firebase Project Structure
```
getmycv/
├── frontend/              # React + Vite app
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── dist/             # Build output
│   ├── .env.local        # Environment variables
│   ├── index.html        # Entry HTML
│   ├── package.json      # Dependencies
│   ├── vite.config.ts    # Vite configuration
│   ├── tsconfig.json     # TypeScript config
│   └── tailwind.config.js # Tailwind config
├── functions/             # Cloud Functions
│   ├── src/              # TypeScript source
│   ├── lib/              # Compiled JS
│   ├── .env              # API keys
│   ├── index.ts          # Function exports
│   ├── package.json      # Dependencies
│   └── tsconfig.json     # TypeScript config
├── firestore.rules       # Database security
├── storage.rules         # Storage security
├── firebase.json         # Project config
└── .firebaserc          # Project aliases
```

### Scalability Considerations

1. **Automatic Scaling**
   - Firebase Functions auto-scale based on demand
   - Firebase Hosting uses global CDN
   - Firestore handles scaling automatically

2. **Caching Strategy**
   - Firebase Hosting CDN for static assets
   - Firestore offline persistence
   - Function memory caching for frequently used data

3. **Queue Management**
   - Cloud Tasks for async processing
   - Firestore triggers for event-driven processing
   - Scheduled functions for batch operations

## Advanced Features (Interactive CV Capabilities)

The system offers a comprehensive suite of interactive features that users can select and customize:

### 1. AI-Powered Features
- **AI Podcast (NotebookLLM)**: 2-15 minute audio summary of career achievements
- **AI Chat Assistant**: Interactive bot that answers questions about experience
- **Smart Content Enhancement**: AI-driven content improvement suggestions

### 2. Multimedia Elements
- **Video Introduction**: 30-second elevator pitch video embed
- **Interactive Timeline**: Visual career journey with milestones
- **Portfolio Gallery**: Showcase projects with images and links
- **Skills Visualization**: Dynamic charts (radar, bubble, word cloud)

### 3. Communication Tools
- **Smart Contact Card**: One-click contact with calendar integration
- **Meeting Scheduler**: Integrated booking system (Calendly/Google Calendar)
- **Direct Messaging**: Built-in contact form
- **Social Media Links**: Professional network connections

### 4. Analytics & Tracking
- **View Analytics**: Track CV views and engagement
- **Download Tracking**: Monitor which formats are downloaded
- **Interaction Heatmap**: See which sections get most attention
- **Geographic Analytics**: View locations of CV viewers

### 5. Professional Enhancements
- **QR Code Integration**: Smart QR linking to online profile
- **Testimonials Carousel**: Rotating recommendations
- **Certification Badges**: Verified credential display
- **ATS Optimization**: Keyword optimization for applicant tracking

### 6. Export & Distribution
- **Multi-Format Export**: PDF, DOCX, HTML, JSON
- **Online Version**: Hosted interactive CV with custom URL
- **Embed Code**: iframe code for portfolio websites
- **Print-Optimized**: Clean version for physical printing

### Feature Selection Interface
Users can:
- Choose from 12+ interactive features
- Customize each feature's appearance and behavior
- Preview features in real-time
- Set privacy preferences for each feature
- Enable/disable features post-generation

## Performance Requirements

- **Upload Processing**: < 5 seconds
- **AI Analysis**: < 15 seconds
- **CV Generation**: < 10 seconds
- **Podcast Creation**: < 30 seconds
- **Total Time**: < 1 minute end-to-end

## Monitoring & Analytics

1. **Application Metrics**
   - Response times
   - Error rates
   - API usage
   - Conversion rates

2. **Business Metrics**
   - CVs generated per day
   - Popular templates
   - User retention
   - Feature adoption

3. **Infrastructure Metrics**
   - Server health
   - Database performance
   - Queue lengths
   - Storage usage

## Future Enhancements

1. **AI Interview Prep**: Generate common interview questions based on CV
2. **Job Matching**: Suggest relevant job postings
3. **Cover Letter Generation**: Auto-generate matching cover letters
4. **Multi-language Support**: Generate CVs in multiple languages
5. **Team Features**: Company-wide CV management
6. **API Platform**: Allow third-party integrations
7. **Mobile App**: Native iOS/Android applications
8. **Browser Extension**: Quick CV updates from LinkedIn

## Cost Estimation

### Monthly Costs (1000 users)
- **Infrastructure**: $200-500 (AWS/GCP)
- **Anthropic API**: $500-1000 (based on usage)
- **NotebookLLM**: $300-600 (based on usage)
- **Storage**: $50-100
- **CDN**: $50-100
- **Total**: $1,100-2,300/month

## Implementation Timeline

### Phase 1: MVP (4-6 weeks)
- Basic upload functionality
- Anthropic integration
- Simple CV generation
- PDF export

### Phase 2: Enhanced Features (4-6 weeks)
- Multiple templates
- Podcast integration
- Advanced formatting
- User accounts

### Phase 3: Professional Features (4-6 weeks)
- ATS optimization
- Analytics dashboard
- Team features
- API development

### Phase 4: Scale & Optimize (Ongoing)
- Performance optimization
- Additional integrations
- Mobile apps
- International expansion