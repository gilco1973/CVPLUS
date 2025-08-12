# Project: CVPlus

## Overview
CVPlus is an AI-powered CV transformation platform that takes traditional CVs "From Paper to Powerful", reinventing them into interactive, multimedia-rich professional profiles. The system uses Anthropic's Claude API for intelligent CV analysis and provides personalized recommendations with cutting-edge interactive features.
Use sub agents from ~/.local/share/claude-007-agents/.claude/agents in everything you do.

## Project Structure
```
/Users/gklainert/Documents/cvplus/
├── .claude/
│   └── settings.local.json    # Claude Code permissions configuration
└── CLAUDE.md                  # This file - AI assistant documentation
```

## Technology Stack
**Frontend**: React.js with TypeScript, Vite, Tailwind CSS
**Backend**: Firebase Functions (Node.js), Firebase Firestore, Firebase Storage
**Authentication**: Firebase Auth
**AI Integration**: Anthropic Claude API
**Additional Services**: Google APIs, Calendly integration, multimedia processing

## Development Environment

### Prerequisites
- Node.js 20+
- Firebase CLI
- Git

### Setup Instructions
1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Install backend dependencies: `cd functions && npm install`
4. Configure Firebase: `firebase login` and `firebase init`
5. Set up environment variables in `functions/.env`

## Key Commands
**Frontend (from frontend/ directory):**
- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript checks

**Backend (from functions/ directory):**
- `npm install` - Install dependencies
- `npm run build` - Build functions
- `firebase functions:log` - View function logs
- `firebase deploy --only functions` - Deploy functions only

**Full Deployment:**
- `firebase deploy` - Deploy entire project

## Project Conventions
To be established as the project develops. Consider:
- Code style and formatting rules
- Directory structure conventions
- Naming conventions for files and variables
- Git commit message format
- Testing approach

## Important Notes
1. CVPlus is a fully functional AI-powered CV transformation platform
2. Uses Firebase for backend services and hosting
3. Integrates with Anthropic Claude API for CV analysis and enhancement
4. Features include multimedia CV generation, podcast creation, video introductions, and portfolio galleries
5. Remote repository name changed from 'origin' to 'cvplus'

## Claude Code Configuration
The project has basic Claude Code permissions configured in `.claude/settings.local.json`:
- Allowed: `ls:*` and `find:*` commands
- Additional permissions should be added as needed during development

## Current Development Status
CVPlus is actively being developed with the following key features implemented:
- Interactive CV generation with AI analysis
- Multimedia integration (audio, video, podcasts)
- Portfolio gallery management
- Calendar integration
- Certification badge system
- Public profile sharing
- Real-time processing status tracking