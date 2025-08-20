import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { ProcessingPage } from './pages/ProcessingPage';
import { CVAnalysisPage } from './pages/CVAnalysisPage';
import { CVPreviewPageNew } from './pages/CVPreviewPageNew';
import { ResultsPage } from './pages/ResultsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CVFeaturesPage } from './pages/CVFeaturesPage';
import { AboutPage } from './pages/AboutPage';
import { KeywordOptimization } from './pages/KeywordOptimization';
import { FinalResultsPage } from './pages/FinalResultsPage';
import { PricingPage } from './pages/PricingPage';
import { FAQPage } from './components/pages/FAQ';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionMonitor } from './components/dev/SubscriptionMonitor';
import { GlobalLayout } from './components/layout/GlobalLayout';
import { WorkflowLayout } from './components/layout/WorkflowLayout';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <GlobalLayout variant="full-width" showFooter={true}>
          <HomePage />
        </GlobalLayout>
      ),
    },
    {
      path: '/features',
      element: (
        <GlobalLayout variant="full-width" showFooter={true}>
          <CVFeaturesPage />
        </GlobalLayout>
      ),
    },
    {
      path: '/about',
      element: (
        <GlobalLayout variant="default" showFooter={true}>
          <AboutPage />
        </GlobalLayout>
      ),
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
      element: <CVPreviewPageNew />,
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
    {
      path: '/faq',
      element: (
        <GlobalLayout variant="default" showFooter={true}>
          <FAQPage />
        </GlobalLayout>
      ),
    },
    {
      path: '/pricing',
      element: (
        <GlobalLayout variant="default" showFooter={true}>
          <PricingPage />
        </GlobalLayout>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <SubscriptionMonitor />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937', // neutral-800
            color: '#f3f4f6', // neutral-100
            border: '1px solid #374151', // neutral-700
          },
        }}
      />
    </AuthProvider>
  );
}

export default App
