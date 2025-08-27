/**
 * Comprehensive test suite for applyImprovements function
 * Tests all critical paths, error handling, and performance requirements
 */

const jest = require('@jest/globals').jest;
import { getFirestore } from 'firebase-admin/firestore';
import { applyImprovements } from '../applyImprovements';
import { CVTransformationService } from '../../services/cv-transformation.service';

// Mock Firebase Admin
jest.mock('firebase-admin/firestore');
jest.mock('../../services/cv-transformation.service');

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  update: jest.fn(),
};

const mockRequest = {
  auth: { uid: 'test-user-123' },
  data: {
    jobId: 'test-job-123',
    selectedRecommendationIds: ['rec-1', 'rec-2', 'rec-3'],
    targetRole: 'Software Engineer',
    industryKeywords: ['JavaScript', 'React', 'Node.js']
  }
};

const mockJobData = {
  userId: 'test-user-123',
  parsedData: {
    personalInfo: { name: 'John Doe' },
    experience: [],
    skills: ['JavaScript', 'React']
  },
  cvRecommendations: [
    { id: 'rec-1', title: 'Improve Summary', type: 'content' },
    { id: 'rec-2', title: 'Add Keywords', type: 'keywords' },
    { id: 'rec-3', title: 'Format Skills', type: 'formatting' }
  ]
};

const mockTransformationResult = {
  improvedCV: { ...mockJobData.parsedData, improved: true },
  appliedRecommendations: [
    { id: 'rec-1', applied: true },
    { id: 'rec-2', applied: true },
    { id: 'rec-3', applied: true }
  ],
  transformationSummary: 'Applied 3 improvements',
  comparisonReport: { changes: 3, improvements: ['summary', 'keywords', 'formatting'] }
};

describe('applyImprovements Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    
    mockDb.get.mockResolvedValue({
      exists: true,
      data: () => mockJobData
    });
    
    mockDb.update.mockResolvedValue({});
    
    (CVTransformationService.prototype.applyRecommendations as jest.Mock)
      .mockResolvedValue(mockTransformationResult);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject requests without authentication', async () => {
      const unauthenticatedRequest = { ...mockRequest, auth: null };
      
      await expect(applyImprovements.run(unauthenticatedRequest, {} as any))
        .rejects
        .toThrow('User must be authenticated');
    });

    it('should reject requests without jobId', async () => {
      const requestWithoutJobId = {
        ...mockRequest,
        data: { ...mockRequest.data, jobId: null }
      };
      
      await expect(applyImprovements.run(requestWithoutJobId, {} as any))
        .rejects
        .toMatchObject({
          message: 'Job ID is required',
          code: 'MISSING_JOB_ID'
        });
    });

    it('should reject requests with invalid recommendation IDs', async () => {
      const requestWithInvalidRecs = {
        ...mockRequest,
        data: { ...mockRequest.data, selectedRecommendationIds: null }
      };
      
      await expect(applyImprovements.run(requestWithInvalidRecs, {} as any))
        .rejects
        .toMatchObject({
          message: 'Selected recommendation IDs array is required',
          code: 'INVALID_RECOMMENDATIONS'
        });
    });

    it('should reject requests with empty recommendation array', async () => {
      const requestWithEmptyRecs = {
        ...mockRequest,
        data: { ...mockRequest.data, selectedRecommendationIds: [] }
      };
      
      await expect(applyImprovements.run(requestWithEmptyRecs, {} as any))
        .rejects
        .toMatchObject({
          message: 'At least one recommendation must be selected',
          code: 'EMPTY_RECOMMENDATIONS'
        });
    });
  });

  describe('Job Access Control', () => {
    it('should reject access to non-existent jobs', async () => {
      mockDb.get.mockResolvedValue({ exists: false });
      
      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toMatchObject({
          message: 'Job not found',
          code: 'JOB_NOT_FOUND'
        });
    });

    it('should reject unauthorized access to jobs', async () => {
      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockJobData, userId: 'different-user' })
      });
      
      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toMatchObject({
          message: 'Unauthorized access to job',
          code: 'UNAUTHORIZED'
        });
    });

    it('should reject jobs without parsed CV data', async () => {
      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockJobData, parsedData: null })
      });
      
      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toMatchObject({
          message: 'No parsed CV found for this job',
          code: 'MISSING_CV_DATA'
        });
    });
  });

  describe('Recommendation Processing', () => {
    it('should successfully process valid recommendations', async () => {
      const result = await applyImprovements.run(mockRequest, {} as any);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          jobId: 'test-job-123',
          improvedCV: mockTransformationResult.improvedCV,
          appliedRecommendations: mockTransformationResult.appliedRecommendations,
          transformationSummary: mockTransformationResult.transformationSummary,
          comparisonReport: mockTransformationResult.comparisonReport,
          improvementsApplied: true,
          processingTime: expect.any(Number),
          attempt: 1,
          message: expect.stringContaining('Successfully applied 3 improvements')
        })
      });
    });

    it('should handle invalid recommendation IDs gracefully', async () => {
      const requestWithInvalidIds = {
        ...mockRequest,
        data: { ...mockRequest.data, selectedRecommendationIds: ['invalid-1', 'invalid-2'] }
      };
      
      await expect(applyImprovements.run(requestWithInvalidIds, {} as any))
        .rejects
        .toMatchObject({
          message: 'No valid recommendations found for the selected IDs',
          code: 'INVALID_RECOMMENDATION_IDS'
        });
    });

    it('should generate recommendations when none exist', async () => {
      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockJobData, cvRecommendations: [] })
      });

      (CVTransformationService.prototype.generateDetailedRecommendations as jest.Mock)
        .mockResolvedValue(mockJobData.cvRecommendations);

      const result = await applyImprovements.run(mockRequest, {} as any);
      
      expect(CVTransformationService.prototype.generateDetailedRecommendations)
        .toHaveBeenCalledWith(
          mockJobData.parsedData,
          'Software Engineer',
          ['JavaScript', 'React', 'Node.js']
        );
      
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          cvRecommendations: mockJobData.cvRecommendations,
          lastRecommendationGeneration: expect.any(String)
        })
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should retry on recoverable errors', async () => {
      let callCount = 0;
      (CVTransformationService.prototype.applyRecommendations as jest.Mock)
        .mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            const error = new Error('Temporary service error') as any;
            error.code = 'TEMPORARY_ERROR';
            error.recoverable = true;
            throw error;
          }
          return mockTransformationResult;
        });

      const result = await applyImprovements.run(mockRequest, {} as any);
      
      expect(result.success).toBe(true);
      expect(result.data.attempt).toBe(3);
      expect(CVTransformationService.prototype.applyRecommendations).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries on persistent errors', async () => {
      (CVTransformationService.prototype.applyRecommendations as jest.Mock)
        .mockRejectedValue({
          message: 'Persistent error',
          code: 'PERSISTENT_ERROR',
          recoverable: true
        });

      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('Failed to apply improvements after 3 attempts'),
          code: 'FINAL_FAILURE'
        });

      expect(CVTransformationService.prototype.applyRecommendations).toHaveBeenCalledTimes(3);
    });

    it('should fail immediately on non-recoverable errors', async () => {
      (CVTransformationService.prototype.applyRecommendations as jest.Mock)
        .mockRejectedValue({
          message: 'Non-recoverable error',
          code: 'FATAL_ERROR',
          recoverable: false
        });

      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('Failed to apply improvements after 3 attempts'),
          code: 'FINAL_FAILURE'
        });

      expect(CVTransformationService.prototype.applyRecommendations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete within 30 seconds for normal requests', async () => {
      const startTime = Date.now();
      const result = await applyImprovements.run(mockRequest, {} as any);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(30000);
      expect(result.data.processingTime).toBeLessThan(30000);
    });

    it('should timeout long-running transformations', async () => {
      (CVTransformationService.prototype.applyRecommendations as jest.Mock)
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 65000)));

      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toMatchObject({
          message: 'Transformation timeout',
          code: 'TRANSFORMATION_TIMEOUT'
        });
    }, 70000);

    it('should handle concurrent requests without duplication', async () => {
      const promises = Array.from({ length: 5 }, () => 
        applyImprovements.run(mockRequest, {} as any)
      );
      
      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach(result => expect(result.success).toBe(true));
      
      // But transformation service should only be called once (due to deduplication)
      expect(CVTransformationService.prototype.applyRecommendations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Operations', () => {
    it('should update job status on successful completion', async () => {
      await applyImprovements.run(mockRequest, {} as any);
      
      expect(mockDb.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          improvedCV: mockTransformationResult.improvedCV,
          appliedRecommendations: mockTransformationResult.appliedRecommendations,
          transformationSummary: mockTransformationResult.transformationSummary,
          comparisonReport: mockTransformationResult.comparisonReport,
          status: 'completed',
          improvementsApplied: true,
          processingTime: expect.any(Number),
          processedRecommendations: 3,
          attempt: 1
        })
      );
    });

    it('should update job status on failure', async () => {
      (CVTransformationService.prototype.applyRecommendations as jest.Mock)
        .mockRejectedValue({
          message: 'Fatal transformation error',
          code: 'FATAL_ERROR',
          recoverable: false
        });

      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toThrow();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.any(String),
          errorCode: expect.any(String),
          lastError: expect.any(String),
          processingTime: expect.any(Number),
          failedAttempts: 3
        })
      );
    });

    it('should continue operation if database update fails', async () => {
      mockDb.update
        .mockResolvedValueOnce({}) // Success for storing recommendations (if needed)
        .mockRejectedValueOnce(new Error('Database error')) // Failure for final update
        .mockResolvedValueOnce({}); // Success for retry

      const result = await applyImprovements.run(mockRequest, {} as any);
      expect(result.success).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should process large recommendation sets in batches', async () => {
      const largeRecommendationSet = Array.from({ length: 25 }, (_, i) => ({
        id: `rec-${i}`,
        title: `Recommendation ${i}`,
        type: 'content'
      }));

      mockDb.get.mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockJobData,
          cvRecommendations: largeRecommendationSet
        })
      });

      const requestWithManyRecs = {
        ...mockRequest,
        data: {
          ...mockRequest.data,
          selectedRecommendationIds: largeRecommendationSet.map(r => r.id)
        }
      };

      const result = await applyImprovements.run(requestWithManyRecs, {} as any);
      expect(result.success).toBe(true);
      expect(result.data.processedRecommendations).toBe(25);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    it('should activate circuit breaker after repeated failures', async () => {
      // Mock repeated database failures
      mockDb.get.mockRejectedValue(new Error('Database connection failed'));

      // Execute requests until circuit breaker opens
      for (let i = 0; i < 6; i++) {
        try {
          await applyImprovements.run(mockRequest, {} as any);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should be rejected immediately by circuit breaker
      await expect(applyImprovements.run(mockRequest, {} as any))
        .rejects
        .toThrow('Circuit breaker open');
    });
  });
});

describe('Performance Regression Tests', () => {
  it('should maintain consistent response times under load', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await applyImprovements.run(mockRequest, {} as any);
        times.push(Date.now() - startTime);
      } catch (error) {
        // Handle any errors but continue testing
      }
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    expect(averageTime).toBeLessThan(5000); // 5 second average
    expect(maxTime).toBeLessThan(30000); // 30 second max
  });

  it('should handle memory efficiently', async () => {
    const initialMemory = process.memoryUsage();
    
    // Process multiple requests
    for (let i = 0; i < 5; i++) {
      await applyImprovements.run(mockRequest, {} as any);
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});