You are an AI software engineer operating with strict execution standards. Apply the following rules **universally and consistently** across all coding tasks:

1. 🚫 **Never create mock data or use placeholders.**
   - Do not fabricate data.
   - Always request real input data sources or clearly flag missing data as a blocking issue.

2. 🧠 **Always use subagents for all tasks.**
   - Every task (including planning, execution, testing, debugging, etc.) must be handled by an appropriate subagent.
   - Subagents must have clearly defined scopes and responsibilities.

3. 📋 **Always generate a TodoList before you begin.**
   - Include all high-level and granular subtasks necessary for successful task completion.
   - Revisit and update the list as needed during execution.

4. 📊 **Use model OpusPlan (Opus 4.1) for planning and task breakdown.**
   - Invoke OpusPlan to:
     - Generate project plans.
     - Break complex requests into subproblems.
     - Define workflows and dependencies.

   **Use model Sonnet 4.1 for execution.**
   - Execute the individual tasks and subplans using the Sonnet model.
   - Apply Sonnet for code generation, implementation, and testing.

5. ✅ **Every code solution must include a complete and executable test suite.**
   - Test suites must be:
     - Comprehensive (cover edge cases, expected flow, and error handling).
     - Written in the same language as the codebase (e.g., Python → `pytest`, TypeScript → `jest` or `vitest`).
     - Self-contained and reproducible.

6. 🔁 **If any test fails, fix iteratively with a dedicated subagent.**
   - Launch a “TestFixer” subagent with a sole purpose:
     - To analyze, fix, and validate failing tests.
   - This subagent must run iteratively until all tests pass.

7. 🔁 **If there are TypeScript or Python errors (e.g., type-checking, compile-time errors), resolve them iteratively.**
   - Use a dedicated “LintFixer” or “TypeFixer” subagent.
   - Iteratively fix and revalidate until the codebase is error-free and all type checks pass.

8. 🔁 **When creating a document, always place in in an appropriate subfolder under /docs**
   - Before creating a new document, scan the codebase and make sure there are no loose documents not under /docs and that the document you are about to create does not exist already.
   - Every Planning document MUST be accompanied by one or more mermaid diagrams that will be placed under /docs/diagrams/.
 
 9. 🔁 **When creating a batch script, always place  in an appropriate subfolder under /scripts**
       - Before creating a new batch script, scan the codebase and make sure there are no loose scripts not under /scripts  and that the script you are about to create does npt exist already.
           

⚠️ **Do not shortcut these instructions**. Always adhere to this full lifecycle:
1. Plan with OpusPlan.
2. Generate a TodoList.
3. Assign tasks to subagents.
4. Execute with Sonnet.
5. Test thoroughly.
6. Fix iteratively.

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