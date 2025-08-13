import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { subscribeToJob, processCV } from '../services/cvService';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import type { Job } from '../services/cvService';

const PROCESSING_STEPS = [
  { id: 'upload', label: 'File Uploaded', status: 'pending' },
  { id: 'analyze', label: 'Analyzing Content', status: 'pending' },
  { id: 'enhance', label: 'Generating Enhanced CV', status: 'pending' },
  { id: 'features', label: 'Applying AI Features', status: 'pending' },
  { id: 'media', label: 'Creating Media Content', status: 'pending' }
];

export const ProcessingPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [steps, setSteps] = useState(PROCESSING_STEPS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Subscribe to job updates
    const unsubscribe = subscribeToJob(jobId, async (updatedJob) => {
      if (!updatedJob) {
        setError('Job not found');
        return;
      }

      setJob(updatedJob);

      // Update steps based on job status
      const newSteps = [...PROCESSING_STEPS];
      
      if (updatedJob.status !== 'pending') {
        newSteps[0].status = 'completed';
      }
      
      if (['processing', 'analyzed', 'generating', 'completed'].includes(updatedJob.status)) {
        newSteps[1].status = updatedJob.status === 'processing' ? 'active' : 'completed';
      }
      
      if (['generating', 'completed'].includes(updatedJob.status)) {
        newSteps[2].status = updatedJob.status === 'generating' ? 'active' : 'completed';
      }
      
      if (updatedJob.status === 'completed') {
        newSteps[3].status = 'completed';
        newSteps[4].status = 'completed';
      }

      if (updatedJob.status === 'failed') {
        setError(updatedJob.error || 'Processing failed');
      }

      setSteps(newSteps);

      // Start processing if job is pending
      if (updatedJob.status === 'pending' && updatedJob.fileUrl) {
        try {
          await processCV(
            jobId,
            updatedJob.fileUrl,
            updatedJob.mimeType || '',
            updatedJob.isUrl || false
          );
        } catch (err) {
          console.error('Error starting processing:', err);
          setError('Failed to start processing');
        }
      }

      // Navigate to analysis results when analyzed or completed
      if (updatedJob.status === 'analyzed' || updatedJob.status === 'completed') {
        setTimeout(() => {
          navigate(`/analysis/${jobId}`);
        }, 1500);
      }
    });

    return () => unsubscribe();
  }, [jobId, navigate]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'active':
        return <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />;
      default:
        return <Circle className="w-6 h-6 text-gray-600" />;
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="small" />
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Processing Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700 animate-scale-in">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-100 animate-fade-in-up">Processing Your CV</h2>

            {/* Progress Bar */}
            <div className="mb-8 animate-fade-in animation-delay-200">
              <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500 ease-out animate-pulse-slow"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                {Math.round(getProgressPercentage())}% Complete
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className="flex items-center space-x-4 animate-fade-in-left"
                  style={{ animationDelay: `${300 + index * 100}ms` }}
                >
                  <div className={step.status === 'active' ? 'animate-pulse' : ''}>
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium transition-colors duration-300 ${
                      step.status === 'completed' ? 'text-gray-100' : 
                      step.status === 'active' ? 'text-cyan-400' : 
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    {step.status === 'active' && (
                      <p className="text-sm text-gray-400 animate-fade-in">
                        {step.id === 'analyze' && 'Extracting information with AI...'}
                        {step.id === 'enhance' && 'Applying professional templates...'}
                        {step.id === 'features' && 'Adding ATS optimization, personality insights...'}
                        {step.id === 'media' && 'Generating podcast and video content...'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg animate-fade-in-up">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-2 text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                >
                  Try again →
                </button>
              </div>
            )}

            {/* Status Message */}
            {job?.status === 'completed' && (
              <div className="mt-6 text-center animate-bounce-in">
                <p className="text-green-400 font-medium">All done! Redirecting to results...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};