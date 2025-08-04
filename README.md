# CVisionery - From Paper to Powerful: Your CV, Reinvented

Transform your traditional CV into an interactive, AI-enhanced professional profile with cutting-edge features!

## 🚀 Features

- **AI-Powered CV Analysis**: Uses Claude 4 Sonnet to intelligently parse and understand your CV
- **PII Detection & Protection**: Automatically identifies and flags sensitive personal information
- **Multiple Templates**: Choose from Modern, Classic, or Creative professional templates
- **Smart Enhancement Options**:
  - ATS Optimization
  - Keyword Enhancement
  - Achievement Highlighting
  - Skills Visualization
- **Multiple Export Formats**: HTML (available now), PDF & DOCX (coming soon)
- **AI Career Podcast**: Generate an audio summary of your career (coming soon)
- **Easy Sharing**: Copy link or generate QR code to share your CV
- **Privacy Mode**: Create a masked version for public sharing

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Firebase SDK** for authentication and storage

### Backend
- **Firebase Functions** (Node.js 20)
- **Claude 4 Sonnet API** for AI processing
- **Firebase Firestore** for data storage
- **Firebase Storage** for file storage
- **Firebase Authentication** (Anonymous & Google)

## 📋 Prerequisites

- Node.js 20 or higher
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- An Anthropic API key for Claude

## 🔧 Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/getmycv.git
cd getmycv
```

### 2. Install dependencies

Frontend:
```bash
cd frontend
npm install
```

Functions:
```bash
cd ../functions
npm install
```

### 3. Configure environment variables

Create `frontend/.env.local`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

Create `functions/.env`:
```env
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 4. Set up Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase (select existing project or create new)
firebase init

# Deploy Firebase rules and functions
firebase deploy
```

### 5. Set the Anthropic API key in Firebase

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# Enter your Anthropic API key when prompted
```

## 🚀 Development

### Run frontend locally:
```bash
cd frontend
npm run dev
```

### Run Firebase emulators:
```bash
firebase emulators:start
```

### Build for production:
```bash
# Frontend
cd frontend
npm run build

# Functions
cd ../functions
npm run build
```

### Deploy:
```bash
firebase deploy
```

## 📁 Project Structure

```
getmycv/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── lib/          # Firebase configuration
│   └── dist/             # Built frontend files
├── functions/            # Firebase Cloud Functions
│   ├── src/
│   │   ├── functions/    # Individual cloud functions
│   │   ├── services/     # Business logic services
│   │   └── config/       # Configuration files
│   └── lib/             # Compiled functions
├── firebase.json         # Firebase configuration
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
└── README.md
```

## 🔐 Security

- All CV data is stored securely in Firebase
- Authentication required for all operations
- PII detection helps protect sensitive information
- Storage rules ensure users can only access their own files
- API keys are stored as Firebase Secrets

## 🎯 Usage Flow

1. **Upload CV**: Users can upload PDF, DOCX, or provide a URL
2. **AI Analysis**: Claude 4 analyzes and extracts information
3. **PII Review**: System shows any detected sensitive information
4. **Generation Options**: 
   - "Just Generate it for Me" - One-click with all enhancements
   - Custom selection of features and templates
5. **Download & Share**: Get your enhanced CV and share it easily

## 🔜 Roadmap

- [ ] PDF generation with proper formatting
- [ ] DOCX export functionality
- [ ] AI-generated career podcast
- [ ] More CV templates
- [ ] LinkedIn integration
- [ ] Multi-language support
- [ ] CV comparison and tracking
- [ ] Interview preparation features

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues or questions, please create an issue in the GitHub repository.

---

Built with ❤️ by the CVisionery team