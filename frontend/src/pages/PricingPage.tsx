import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PricingCard } from '../components/pricing/PricingCard';
import { StripeCheckoutIframe } from '../components/pricing/StripeCheckoutIframe';
import { PricingHero } from './components/PricingHero';
import { LifetimeAccessGuarantee } from './components/LifetimeAccessGuarantee';
import { FeatureComparison } from './components/FeatureComparison';
import { PricingFAQ } from './components/PricingFAQ';
import { ArrowLeft, Users, Crown, CheckCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatFeatureName } from '../services/paymentService';

export const PricingPage = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { subscription, isLifetimePremium, isLoading: premiumLoading } = useSubscription();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const freeFeaturesIncluded = [
    'AI CV Analysis & Enhancement',
    'Professional CV Templates',
    'ATS Optimization & Scoring',
    'Skills Visualization Charts',
    'Interactive Career Timeline',
    'Basic QR Code Generation',
    'Portfolio Gallery',
    'Multi-format Export (PDF, DOCX, HTML)',
    'Basic Analytics & Tracking'
  ];

  const premiumFeaturesIncluded = [
    'Everything in Free Forever',
    'Personal Web Portal (Custom URL)',
    'AI Chat Assistant (RAG-powered)',
    'AI Career Podcast Generation',
    'Advanced Analytics Dashboard',
    'Priority Customer Support',
    'Remove CVPlus Branding'
  ];

  const handleGetStartedFree = async () => {
    if (!user) {
      try {
        setIsLoading(true);
        await signInWithGoogle();
        navigate('/');
      } catch (error) {
        toast.error('Please sign in to get started');
      } finally {
        setIsLoading(false);
      }
    } else {
      navigate('/');
    }
  };

  const handleUpgradeToPremium = async () => {
    // Don't allow upgrade if already premium
    if (isLifetimePremium) {
      toast.success('You already have Premium access!');
      return;
    }
    
    if (!user) {
      try {
        setIsLoading(true);
        await signInWithGoogle();
        setShowPaymentForm(true);
      } catch (error) {
        toast.error('Please sign in with Google to upgrade');
      } finally {
        setIsLoading(false);
      }
    } else {
      setShowPaymentForm(true);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('🎉 Welcome to CVPlus Premium! Lifetime access activated.');
    navigate('/?premium=activated');
  };
  
  const handleManageAccount = () => {
    navigate('/');
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
    setShowPaymentForm(false);
  };

  if (showPaymentForm && user) {
    return (
      <div className="min-h-screen bg-neutral-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowPaymentForm(false)}
            className="flex items-center gap-2 text-neutral-400 hover:text-neutral-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </button>
          
          <StripeCheckoutIframe
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={() => setShowPaymentForm(false)}
          />
        </div>
      </div>
    );
  }

  // Show Already Premium state for existing premium users
  if (isLifetimePremium && !showPaymentForm) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Premium Status Hero */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                  <Crown className="w-10 h-10 text-yellow-900" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-100 mb-4">
              You're <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">Premium!</span>
            </h1>
            <p className="text-xl text-neutral-300 mb-8">
              Welcome to CVPlus Premium - You have lifetime access to all features
            </p>
          </div>

          {/* Premium Features Summary */}
          <div className="bg-neutral-800 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-neutral-100">Your Premium Features</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {subscription?.features && Object.entries(subscription.features)
                .filter(([_, hasAccess]) => hasAccess)
                .map(([feature, _]) => (
                  <div key={feature} className="flex items-center gap-3 p-3 bg-neutral-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-neutral-200">{formatFeatureName(feature)}</span>
                  </div>
                ))
              }
              
              {/* Always show base features */}
              <div className="flex items-center gap-3 p-3 bg-neutral-700 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-neutral-200">All Free Features Included</span>
              </div>
            </div>
            
            {subscription?.purchasedAt && (
              <div className="mt-6 pt-6 border-t border-neutral-600">
                <p className="text-sm text-neutral-400">
                  Premium access activated on {new Date(subscription.purchasedAt.seconds * 1000).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Account Management */}
          <div className="text-center space-y-4">
            <button
              onClick={handleManageAccount}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              Go to Dashboard
            </button>
            
            <p className="text-neutral-400 text-sm">
              Need help? Visit our <button onClick={() => navigate('/faq')} className="text-cyan-400 hover:text-cyan-300 underline">FAQ section</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <PricingHero />

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Tier */}
          <PricingCard
            title="Free"
            subtitle="Perfect for getting started"
            price={0}
            billing="Forever"
            features={freeFeaturesIncluded}
            buttonText="Get Started Free"
            buttonVariant="outline"
            onButtonClick={handleGetStartedFree}
            isLoading={isLoading}
            popular={false}
          />

          {/* Premium Tier */}
          <PricingCard
            title="Premium"
            subtitle="Lifetime Access"
            price={5}
            billing="One-time payment"
            features={premiumFeaturesIncluded}
            buttonText={isLifetimePremium ? "Already Premium!" : "Get Lifetime Access"}
            buttonVariant={isLifetimePremium ? "disabled" : "primary"}
            onButtonClick={handleUpgradeToPremium}
            isLoading={isLoading || premiumLoading}
            popular={true}
            badge={isLifetimePremium ? "ACTIVE" : "LIFETIME"}
            disabled={isLifetimePremium}
          />
        </div>

        {/* Lifetime Access Guarantee */}
        <LifetimeAccessGuarantee />

        {/* Feature Comparison */}
        <FeatureComparison freeFeaturesIncluded={freeFeaturesIncluded} />

        {/* Social Proof */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-semibold text-neutral-100">
              Transform your career with CVPlus
            </span>
          </div>
          <p className="text-neutral-300">
            Start your career transformation journey today
          </p>
        </div>

        {/* FAQ Section */}
        <PricingFAQ />
      </div>
    </div>
  );
};