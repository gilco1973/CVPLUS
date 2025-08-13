import { useState, useEffect } from 'react';
import { getJob, subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';

export const useJob = (jobId: string) => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const loadJob = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get initial job data
        const initialJob = await getJob(jobId);
        
        if (initialJob) {
          setJob(initialJob);
          
          // Subscribe to real-time updates
          unsubscribe = subscribeToJob(jobId, (updatedJob) => {
            if (updatedJob) {
              setJob(updatedJob);
            }
          });
        } else {
          setError('Job not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job');
        console.error('Error loading job:', err);
      } finally {
        setLoading(false);
      }
    };

    loadJob();

    // Cleanup subscription on unmount or jobId change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [jobId]);

  return { job, loading, error };
};

export default useJob;