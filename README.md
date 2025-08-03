# GetMyCV.ai - AI-Powered CV Creator

Transform your traditional CV into an interactive, multimedia-rich professional profile with just one click.

## 🚀 Features

- **AI-Powered Analysis**: Uses Anthropic's Claude API to intelligently parse and enhance CVs
- **Smart Recommendations**: Get personalized suggestions for formats, industries, and keywords
- **Interactive Features**: Add podcasts, videos, timelines, and more to your CV
- **Multiple Formats**: Export to PDF, DOCX, HTML, or share online
- **ATS Optimization**: Ensure your CV passes applicant tracking systems
- **Real-time Preview**: See changes as you make them

## 🛠️ Tech Stack

### Frontend
- React + Vite
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (State Management)
- Firebase SDK

### Backend
- Firebase Functions
- Firestore Database
- Firebase Storage
- Anthropic Claude API
- NotebookLLM Integration

## 📋 Prerequisites

- Node.js 18+
- Firebase CLI
- Anthropic API Key
- Firebase Project

## 🚀 Quick Start

1. Clone the repository:
```bash
git clone git@github.com:gilco1973/getmycv.git
cd getmycv
```

2. Install dependencies:
```bash
# Frontend
cd frontend && npm install

# Functions
cd ../functions && npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp frontend/.env.example frontend/.env.local
cp functions/.env.example functions/.env
```

4. Start development:
```bash
# Terminal 1: Firebase emulators
firebase emulators:start

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Functions
cd functions && npm run build:watch
```

## 📦 Project Structure

```
getmycv.ai/
├── frontend/              # React + Vite app
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── dist/             # Build output
├── functions/            # Firebase Cloud Functions
│   ├── src/              # TypeScript source
│   └── lib/              # Compiled JS
├── firestore.rules       # Database security rules
├── storage.rules         # Storage security rules
└── firebase.json         # Firebase configuration
```

## 🔑 Environment Variables

### Frontend (.env.local)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Functions (.env)
```
ANTHROPIC_API_KEY=
NOTEBOOK_LLM_API_KEY=
```

## 🚀 Deployment

```bash
# Build frontend
cd frontend && npm run build

# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
```

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs.

## 📧 Contact

For questions or support, please contact the development team.

---

Built with ❤️ by the GetMyCV.ai team
