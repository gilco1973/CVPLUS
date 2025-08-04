import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { subscribeToJob, processCV } from '../services/cvService';
import type { Job } from '../services/cvService';

const PROCESSING_STEPS = [
  { id: 'upload', label: 'File Uploaded', status: 'pending' },
  { id: 'analyze', label: 'Analyzing Content', status: 'pending' },
  { id: 'enhance', label: 'Generating Enhanced CV', status: 'pending' },
  { id: 'podcast', label: 'Creating Podcast', status: 'pending' }
];

export const ProcessingPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
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

      // Navigate to results when analyzed or completed
      if (updatedJob.status === 'analyzed' || updatedJob.status === 'completed') {
        setTimeout(() => {
          navigate(`/results/${jobId}`);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-100">Processing Your CV</h2>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-cyan-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
              {Math.round(getProgressPercentage())}% Complete
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center space-x-4">
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <p className={`font-medium ${
                    step.status === 'completed' ? 'text-gray-100' : 
                    step.status === 'active' ? 'text-cyan-400' : 
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.status === 'active' && (
                    <p className="text-sm text-gray-400">
                      {step.id === 'analyze' && 'Extracting information with AI...'}
                      {step.id === 'enhance' && 'Applying professional templates...'}
                      {step.id === 'podcast' && 'Generating audio summary...'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-2 text-red-500 hover:text-red-400 text-sm font-medium"
              >
                Try again →
              </button>
            </div>
          )}

          {/* Status Message */}
          {job?.status === 'completed' && (
            <div className="mt-6 text-center">
              <p className="text-green-400 font-medium">All done! Redirecting to results...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};