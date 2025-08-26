import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionMonitor } from './components/dev/SubscriptionMonitor';
import { GlobalLayout } from './components/layout/GlobalLayout';
import { WorkflowLayout as _WorkflowLayout } from './components/layout/WorkflowLayout';

// Lazy load heavy components to reduce initial bundle size
const ProcessingPage = lazy(() => import('./pages/ProcessingPage').then(m => ({ default: m.ProcessingPage })));
const CVAnalysisPage = lazy(() => import('./pages/CVAnalysisPage').then(m => ({ default: m.CVAnalysisPage })));
const CVPreviewPageNew = lazy(() => import('./pages/CVPreviewPageNew').then(m => ({ default: m.CVPreviewPageNew })));
const FeatureSelection = lazy(() => import('./pages/FeatureSelection').then(m => ({ default: m.FeatureSelection })));
const CVFeaturesPage = lazy(() => import('./pages/CVFeaturesPage').then(m => ({ default: m.CVFeaturesPage })));
const FeatureSelectionPage = lazy(() => import('./pages/FeatureSelectionPage').then(m => ({ default: m.FeatureSelectionPage })));
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage').then(m => ({ default: m.RoleSelectionPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const KeywordOptimization = lazy(() => import('./pages/KeywordOptimization').then(m => ({ default: m.KeywordOptimization })));
const FinalResultsPage = lazy(() => import('./pages/FinalResultsPage').then(m => ({ default: m.FinalResultsPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })));
const FAQPage = lazy(() => import('./components/pages/FAQ').then(m => ({ default: m.FAQPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
  </div>
);

// Redirect component for deprecated routes
const FeatureSelectionRedirect = () => {
  const { jobId } = useParams<{ jobId: string }>();
  return <Navigate to={`/select-features/${jobId}`} replace />;
};

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
          <Suspense fallback={<PageLoader />}>
            <CVFeaturesPage />
          </Suspense>
        </GlobalLayout>
      ),
    },
    {
      path: '/about',
      element: (
        <GlobalLayout variant="default" showFooter={true}>
          <Suspense fallback={<PageLoader />}>
            <AboutPage />
          </Suspense>
        </GlobalLayout>
      ),
    },
    {
      path: '/role-select/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <RoleSelectionPage />
        </Suspense>
      ),
    },
    {
      path: '/select-features/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <FeatureSelectionPage />
        </Suspense>
      ),
    },
    {
      path: '/process/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <ProcessingPage />
        </Suspense>
      ),
    },
    {
      path: '/analysis/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <CVAnalysisPage />
        </Suspense>
      ),
    },
    {
      path: '/preview/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <CVPreviewPageNew />
        </Suspense>
      ),
    },
    {
      path: '/featureselection/:jobId',
      element: <FeatureSelectionRedirect />,
    },
    {
      path: '/final-results/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <FinalResultsPage />
        </Suspense>
      ),
    },
    {
      path: '/keywords/:jobId',
      element: (
        <Suspense fallback={<PageLoader />}>
          <KeywordOptimization />
        </Suspense>
      ),
    },
    {
      path: '/faq',
      element: (
        <GlobalLayout variant="default" showFooter={true}>
          <Suspense fallback={<PageLoader />}>
            <FAQPage />
          </Suspense>
        </GlobalLayout>
      ),
    },
    {
      path: '/pricing',
      element: (
        <GlobalLayout variant="default" showFooter={true}>
          <Suspense fallback={<PageLoader />}>
            <PricingPage />
          </Suspense>
        </GlobalLayout>
      ),
    },
    {
      path: '/payment-success',
      element: (
        <GlobalLayout variant="default" showFooter={false}>
          <Suspense fallback={<PageLoader />}>
            <PaymentSuccessPage />
          </Suspense>
        </GlobalLayout>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
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
