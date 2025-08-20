import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import debugging utilities in development
if (import.meta.env.DEV) {
  import('./utils/debugRecommendations');
  import('./utils/testRecommendationBlocking');
}

// Import enhanced component renderer to make it globally available
import('./utils/componentRendererFix');

// Import contact form debugger in development
if (import.meta.env.DEV) {
  import('./utils/contactFormDebugger');
  import('./utils/testContactFormRendering');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
