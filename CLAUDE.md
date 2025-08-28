You are an AI software engineer operating with strict execution standards. Apply the following rules **universally and consistently** across all coding tasks:

1. 🚫 **Never create mock data or use placeholders.**
   - Do not fabricate data.
   - Always request real input data sources or clearly flag missing data as a blocking issue.

2. 🚨 **CRITICAL PROHIBITION: NEVER DELETE FILES WITHOUT EXPLICIT USER APPROVAL - EVER!**
   - **ZERO TOLERANCE**: Do not delete, remove, or destroy ANY files without explicit user consent.
   - **MANDATORY**: Always ask for manual user approval before deleting ANY file or directory.
   - **NO EXCEPTIONS**: This applies to temporary files, backups, source code, configs, docs, scripts, and ALL file types.
   - **ENFORCEMENT**: Unauthorized file deletion is considered a critical failure and security violation.
   - **PROCESS**: Identify → Ask User → Get Explicit Approval → Then Delete (never skip approval step)
   - **SAFETY**: When in doubt, DO NOT DELETE - ask the user first.

3. 🧠 **Always use subagents for all tasks.**
   - Every task (including planning, execution, testing, debugging, etc.) must be handled by an appropriate subagent.
   - Subagents must have clearly defined scopes and responsibilities.

4. 📋 **Always generate a TodoList before you begin.**
   - Include all high-level and granular subtasks necessary for successful task completion.
   - Revisit and update the list as needed during execution.

5. 📊 **Use model OpusPlan (Opus 4.1) for planning and task breakdown.**
   - Invoke OpusPlan to:
     - Generate project plans.
     - Break complex requests into subproblems.
     - Define workflows and dependencies.

   **Use model Sonnet 4.1 for execution.**
   - Execute the individual tasks and subplans using the Sonnet model.
   - Apply Sonnet for code generation, implementation, and testing.

6. ✅ **Every code solution must include a complete and executable test suite.**
   - Test suites must be:
     - Comprehensive (cover edge cases, expected flow, and error handling).
     - Written in the same language as the codebase (e.g., Python → `pytest`, TypeScript → `jest` or `vitest`).
     - Self-contained and reproducible.

7. 🔁 **If any test fails, fix iteratively with a dedicated subagent.**
   - Launch a "TestFixer" subagent with a sole purpose:
     - To analyze, fix, and validate failing tests.
   - This subagent must run iteratively until all tests pass.

8. 🔁 **If there are TypeScript or Python errors (e.g., type-checking, compile-time errors), resolve them iteratively.**
   - Use a dedicated "LintFixer" or "TypeFixer" subagent.
   - Iteratively fix and revalidate until the codebase is error-free and all type checks pass.

9. 🔁 **When creating a document, always place in in an appropriate subfolder under /docs**
   - Before creating a new document, scan the codebase and make sure there are no loose documents not under /docs and that the document you are about to create does not exist already.
   - Every Planning document MUST be accompanied by one or more mermaid diagrams that will be placed under /docs/diagrams/.
 
10. 🔁 **When creating a batch script, always place  in an appropriate subfolder under /scripts**
       - Before creating a new batch script, scan the codebase and make sure there are no loose scripts not under /scripts  and that the script you are about to create does npt exist already.

11. 🏗️ **MANDATORY: All code MUST be located in git submodules under /packages - NEVER in root repository**
   - **CRITICAL REQUIREMENT**: All source code, components, services, and modules MUST be created within their respective git submodules under `/packages/` directory
   - **ZERO TOLERANCE**: Do NOT create ANY code files in the root CVPlus git repository
   - **Module Structure**: Each package is an independent git submodule with its own repository:
     - `packages/core/` - Core types, constants, utilities (git@github.com:gilco1973/cvplus-core.git)
     - `packages/auth/` - Authentication and session management (git@github.com:gilco1973/cvplus-auth.git)
     - `packages/i18n/` - Internationalization framework (git@github.com:gilco1973/cvplus-i18n.git)
     - `packages/multimedia/` - Media processing and storage (git@github.com:gilco1973/cvplus-multimedia.git)
     - `packages/premium/` - Subscription and billing features (git@github.com:gilco1973/cvplus-premium.git)
     - `packages/public-profiles/` - Public profile functionality (git@github.com:gilco1973/cvplus-public-profiles.git)
     - `packages/recommendations/` - AI-powered recommendations engine (git@github.com:gilco1973/cvplus-recommendations.git)
     - `packages/admin/` - Admin dashboard and management (git@github.com:gilco1973/cvplus-admin.git)
     - `packages/analytics/` - Analytics and tracking services (git@github.com:gilco1973/cvplus-analytics.git)
   - **ENFORCEMENT**: Creating code in the root repository is considered a critical architectural violation
   - **PROCESS**: Always identify the appropriate package/module → Navigate to packages/[module]/ → Create/edit code there
   - **Git Operations**: Each submodule has independent git history and must be committed separately to its own repository

12. 🎯 **MANDATORY: Submodule tasks MUST be orchestrated by specialized submodule subagents**
   - **CRITICAL REQUIREMENT**: When executing ANY task related to a specific submodule, the task MUST be orchestrated by the corresponding specialized submodule subagent
   - **ZERO TOLERANCE**: Do NOT handle submodule-specific tasks directly - always delegate to the appropriate specialist
   - **Submodule-Specialist Mapping**:
     - `packages/core/` tasks → **core-module-specialist** subagent
     - `packages/auth/` tasks → **auth-module-specialist** subagent  
     - `packages/i18n/` tasks → **i18n-specialist** subagent
     - `packages/multimedia/` tasks → **multimedia-specialist** subagent
     - `packages/premium/` tasks → **premium-specialist** subagent
     - `packages/public-profiles/` tasks → **public-profiles-specialist** subagent
     - `packages/recommendations/` tasks → **recommendations-specialist** subagent
     - `packages/admin/` tasks → **admin-specialist** subagent
     - `packages/analytics/` tasks → **analytics-specialist** subagent
   - **ENFORCEMENT**: Direct handling of submodule tasks without specialist orchestration is considered a critical architectural violation
   - **PROCESS**: Identify target submodule → Use Task tool with appropriate specialist subagent → Let specialist orchestrate the task
   - **Specialist Responsibilities**: Deep understanding of module architecture, dependencies, testing strategies, and domain-specific requirements

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
🚨 **CRITICAL: Never delete ANY files without explicit user approval - this is a security violation**