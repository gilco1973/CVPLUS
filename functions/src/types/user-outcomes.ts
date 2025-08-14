/**
 * User Outcomes Types
 * Extracted from phase2-models.ts for better modularity
 * 
 * User outcome tracking, events, and success measurement.
 */

// ===============================
// USER OUTCOME TRACKING MODELS
// ===============================

export interface UserOutcome {
  outcomeId: string;
  userId: string;
  jobId: string;
  outcomeType: 'interview_scheduled' | 'interview_completed' | 'offer_received' | 'offer_accepted' | 'hired' | 'rejected';
  
  // Timeline
  dateOccurred: Date;
  daysSinceApplication?: number;
  
  // Context
  jobDetails: {
    company: string;
    position: string;
    industry: string;
    location: string;
    salaryOffered?: number;
    salaryAccepted?: number;
  };
  
  // Source tracking
  applicationSource: 'direct' | 'job_board' | 'referral' | 'recruiter' | 'social_media';
  cvVersion: string; // Which version of CV was used
  
  // User feedback
  userRating?: number; // 1-5 stars
  userFeedback?: string;
  improvementSuggestions?: string[];
  
  // Prediction accuracy (if we had predictions for this outcome)
  predictionAccuracy?: {
    hadPrediction: boolean;
    predictedProbability?: number;
    actualOutcome: boolean;
    accuracyScore?: number;
  };
  
  // Additional metadata
  metadata: {
    interviewType?: 'phone' | 'video' | 'in_person' | 'panel' | 'technical';
    numberOfRounds?: number;
    negotiationRounds?: number;
    competitorsCount?: number;
  };
}

export interface OutcomeEvent {
  eventId: string;
  userId: string;
  jobId: string;
  outcomeId: string;
  
  // Event details
  eventType: 'application_sent' | 'response_received' | 'interview_scheduled' | 'feedback_received' | 'decision_made';
  eventData: Record<string, any>;
  timestamp: Date;
  
  // Context
  source: 'user_input' | 'email_tracking' | 'calendar_integration' | 'manual_entry';
  confidence: number; // How confident are we in this data
  
  // Related entities
  relatedEvents?: string[]; // Other event IDs related to this one
  parentOutcomeId?: string; // If this is a sub-event of a larger outcome
}