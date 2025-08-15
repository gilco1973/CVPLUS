import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { ProcessingPage } from './pages/ProcessingPage';
import { CVAnalysisPage } from './pages/CVAnalysisPage';
import { CVPreviewPage } from './pages/CVPreviewPage';
import { ResultsPage } from './pages/ResultsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CVFeaturesPage } from './pages/CVFeaturesPage';
import { AboutPage } from './pages/AboutPage';
import { KeywordOptimization } from './pages/KeywordOptimization';
import { FinalResultsPage } from './pages/FinalResultsPage';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionMonitor } from './components/dev/SubscriptionMonitor';
import { testNavigationFix } from './utils/navigationTestScript';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/features',
    element: <CVFeaturesPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/process/:jobId',
    element: <ProcessingPage />,
  },
  {
    path: '/analysis/:jobId',
    element: <CVAnalysisPage />,
  },
  {
    path: '/preview/:jobId',
    element: <CVPreviewPage />,
  },
  {
    path: '/results/:jobId',
    element: <ResultsPage />,
  },
  {
    path: '/final-results/:jobId',
    element: <FinalResultsPage />,
  },
  {
    path: '/templates/:jobId',
    element: <TemplatesPage />,
  },
  {
    path: '/keywords/:id',
    element: <KeywordOptimization />,
  },
]);

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <RouterProvider router={router} />
        <SubscriptionMonitor />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App
