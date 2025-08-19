import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import debugging utilities in development
if (import.meta.env.DEV) {
  import('./utils/debugRecommendations');
  import('./utils/testRecommendationBlocking');
}

// Import component renderer to make it globally available
import('./utils/componentRenderer');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
