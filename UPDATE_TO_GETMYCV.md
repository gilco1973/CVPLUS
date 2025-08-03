# Update Project to GetMyCV.ai

This document contains all the steps needed to rename the project from "onecv" to "getmycv.ai" and set up the GitHub repository.

## Step 1: Rename Directory

```bash
cd /Users/gklainert/Documents
mv onecv getmycv.ai
cd getmycv.ai
```

## Step 2: Initialize Git Repository

```bash
# Make the initialization script executable
chmod +x initialize-getmycv.sh

# Run the initialization script
./initialize-getmycv.sh

# Push to GitHub
git push -u origin main
```

## Step 3: Update Firebase Project (if needed)

If you want to rename the Firebase project as well:

1. Go to Firebase Console
2. Create a new project called "getmycv-ai" 
3. Update all Firebase configuration files

## Step 4: Update Domain References

All documentation has been updated to use "GetMyCV.ai" instead of "OneCV" or "onecv":

- ✅ SYSTEM_DESIGN.md
- ✅ PROJECT_SETUP.md  
- ✅ FRONTEND_SETUP_REACT_VITE.md
- ✅ CLAUDE.md
- ✅ UI_MOCKUP.md
- ✅ README.md (created by initialization script)

## Step 5: Update Environment Variables

When you set up the project, make sure to update:

### Frontend (.env.local)
```
VITE_FIREBASE_PROJECT_ID=getmycv-ai
VITE_FIREBASE_AUTH_DOMAIN=getmycv-ai.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=getmycv-ai.appspot.com
```

### Update package.json
```json
{
  "name": "getmycv-frontend",
  // ... rest of config
}
```

## Step 6: Update Firebase Configuration

### firebase.json
Update any references to the old project name.

### Update hosting headers
If you have a custom domain, update it to getmycv.ai

## Repository Information

- **Repository URL**: git@github.com:gilco1973/getmycv.git
- **Project Name**: GetMyCV.ai
- **Description**: AI-powered CV creator that transforms traditional CVs into interactive professional profiles

## Features Summary

The GetMyCV.ai project includes:

1. **AI-Powered CV Analysis** using Anthropic Claude API
2. **Smart Recommendations** for formats, industries, and keywords
3. **12+ Interactive Features** including:
   - AI Podcast generation with NotebookLLM
   - Video introductions
   - Interactive timelines
   - Skills visualizations
   - Smart contact cards
   - Meeting schedulers
   - And more...
4. **Multiple Export Formats**: PDF, DOCX, HTML, Online
5. **Firebase Backend** with Firestore, Functions, and Storage
6. **React + Vite Frontend** for fast development

## Next Steps

1. Complete the directory rename and git setup
2. Set up Firebase project
3. Configure environment variables
4. Start development:
   ```bash
   # Terminal 1: Firebase emulators
   firebase emulators:start
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   
   # Terminal 3: Functions
   cd functions && npm run build:watch
   ```

## Support

If you need any clarification or run into issues:
- Check the documentation files
- Review the git repository
- Contact the development team

---

Project successfully updated to GetMyCV.ai! 🚀