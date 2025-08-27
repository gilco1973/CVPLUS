// Session Checkpoint Service - Backend support for enhanced session management
import * as admin from 'firebase-admin';
import {
  EnhancedSessionState,
  ProcessingCheckpoint,
  QueuedAction,
  CVStep
} from '../types/enhanced-models';

export interface CheckpointMetadata {
  functionName: string;
  parameters: Record<string, unknown>;
  executionTime?: number;
  memoryUsage?: number;
  error?: string;
}

export class SessionCheckpointService {
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor() {
    this.db = admin.firestore();
    this.storage = admin.storage();
  }

  // =====================================================================================
  // CHECKPOINT CREATION AND MANAGEMENT
  // =====================================================================================

  async createProcessingCheckpoint(
    sessionId: string,
    stepId: CVStep,
    functionName: string,
    parameters: Record<string, unknown>,
    featureId?: string
  ): Promise<ProcessingCheckpoint> {
    const checkpoint: ProcessingCheckpoint = {
      id: this.generateCheckpointId(sessionId, stepId, functionName),
      sessionId,
      stepId,
      functionName,
      parameters,
      featureId,
      state: 'pending',
      createdAt: new Date(),
      priority: this.determinePriority(stepId, featureId),
      retryCount: 0,
      maxRetries: 3,
      dependencies: this.getDependencies(stepId, featureId),
      estimatedDuration: this.getEstimatedDuration(functionName),
    };

    // Store checkpoint in Firestore
    await this.saveCheckpoint(checkpoint);
    
    // Update session with new checkpoint
    await this.addCheckpointToSession(sessionId, checkpoint);

    return checkpoint;
  }

  async updateCheckpointStatus(
    checkpointId: string,
    status: ProcessingCheckpoint['state'],
    result?: unknown,
    error?: string,
    executionTime?: number
  ): Promise<void> {
    const checkpointRef = this.db.collection('checkpoints').doc(checkpointId);
    
    const updates: Partial<ProcessingCheckpoint> = {
      state: status,
      lastAttemptAt: new Date()
    };

    if (result !== undefined) {
      updates.result = result;
      updates.completedAt = new Date();
    }

    if (error) {
      updates.error = error;
      updates.retryCount = admin.firestore.FieldValue.increment(1) as any;
    }

    if (executionTime) {
      updates.executionTime = executionTime;
    }

    await checkpointRef.update(updates);

    // Update session checkpoint list
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (checkpoint) {
      await this.updateSessionCheckpoint(checkpoint.sessionId, checkpoint);
    }
  }

  async getCheckpoint(checkpointId: string): Promise<ProcessingCheckpoint | null> {
    const doc = await this.db.collection('checkpoints').doc(checkpointId).get();
    return doc.exists ? (doc.data() as ProcessingCheckpoint) : null;
  }

  async getSessionCheckpoints(sessionId: string): Promise<ProcessingCheckpoint[]> {
    const snapshot = await this.db
      .collection('checkpoints')
      .where('sessionId', '==', sessionId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as ProcessingCheckpoint);
  }

  // =====================================================================================
  // CHECKPOINT EXECUTION AND RETRY LOGIC
  // =====================================================================================

  async executeCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Mark as in progress
    await this.updateCheckpointStatus(checkpointId, 'in_progress');

    const startTime = Date.now();

    try {
      // Execute the function with stored parameters
      const result = await this.executeFunctionWithCheckpoint(
        checkpoint.functionName,
        checkpoint.parameters,
        checkpoint.sessionId
      );

      const executionTime = Date.now() - startTime;

      // Mark as completed
      await this.updateCheckpointStatus(
        checkpointId,
        'completed',
        result,
        undefined,
        executionTime
      );

      return true;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (checkpoint.retryCount < checkpoint.maxRetries) {
        await this.updateCheckpointStatus(
          checkpointId,
          'pending',
          undefined,
          errorMessage,
          executionTime
        );
        
        // Schedule retry with exponential backoff
        await this.scheduleRetry(checkpointId, checkpoint.retryCount + 1);
      } else {
        await this.updateCheckpointStatus(
          checkpointId,
          'failed',
          undefined,
          errorMessage,
          executionTime
        );
      }

      return false;
    }
  }

  async resumeFromCheckpoint(sessionId: string, checkpointId: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Get all checkpoints after this one and mark them as pending
    const allCheckpoints = await this.getSessionCheckpoints(sessionId);
    const checkpointIndex = allCheckpoints.findIndex(cp => cp.id === checkpointId);
    
    if (checkpointIndex === -1) {
      throw new Error(`Checkpoint ${checkpointId} not found in session`);
    }

    // Reset subsequent checkpoints
    const subsequentCheckpoints = allCheckpoints.slice(0, checkpointIndex);
    
    for (const cp of subsequentCheckpoints) {
      if (cp.state === 'completed' || cp.state === 'failed') {
        await this.updateCheckpointStatus(cp.id, 'pending');
      }
    }

    // Execute from the specified checkpoint
    return this.executeCheckpoint(checkpointId);
  }

  // =====================================================================================
  // SESSION INTEGRATION
  // =====================================================================================

  async enhanceSessionWithCheckpoints(sessionId: string): Promise<void> {
    const session = await this.getEnhancedSession(sessionId);
    if (!session) return;

    const checkpoints = await this.getSessionCheckpoints(sessionId);
    
    // Update session with checkpoint information
    session.processingCheckpoints = checkpoints;
    
    // Update session progress based on checkpoints
    await this.updateSessionProgressFromCheckpoints(session);
    
    // Save enhanced session
    await this.saveEnhancedSession(session);
  }

  async processActionQueue(sessionId: string): Promise<void> {
    const session = await this.getEnhancedSession(sessionId);
    if (!session) return;

    const queuedActions = session.actionQueue || [];
    const pendingActions = queuedActions.filter(action => 
      action.attempts < action.maxAttempts && action.requiresNetwork
    );

    for (const action of pendingActions) {
      try {
        await this.executeQueuedAction(action);
        
        // Remove successful action from queue
        session.actionQueue = session.actionQueue?.filter(a => a.id !== action.id) || [];
      } catch (error) {
        // Increment retry count
        action.attempts++;
        console.error(`Failed to execute queued action ${action.id}:`, error);
      }
    }

    // Save updated session
    await this.saveEnhancedSession(session);
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async executeFunctionWithCheckpoint(
    functionName: string,
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // This would dynamically call the appropriate Firebase Function
    // Implementation depends on your specific function architecture
    
    switch (functionName) {
      case 'generateCV':
        return this.executeGenerateCV(parameters, sessionId);
      
      case 'generatePodcast':
        return this.executeGeneratePodcast(parameters, sessionId);
      
      case 'generateVideo':
        return this.executeGenerateVideo(parameters, sessionId);
      
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private async executeGenerateCV(
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // Call your existing CV generation function
    // This is a placeholder - replace with actual implementation
    console.log('Executing generateCV with checkpoint support:', parameters);
    return { success: true, cvId: 'generated-cv-id' };
  }

  private async executeGeneratePodcast(
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // Call your existing podcast generation function
    console.log('Executing generatePodcast with checkpoint support:', parameters);
    return { success: true, podcastId: 'generated-podcast-id' };
  }

  private async executeGenerateVideo(
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // Call your existing video generation function
    console.log('Executing generateVideo with checkpoint support:', parameters);
    return { success: true, videoId: 'generated-video-id' };
  }

  private async executeQueuedAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'session_update':
        await this.handleSessionUpdateAction(action);
        break;
      
      case 'form_save':
        await this.handleFormSaveAction(action);
        break;
      
      case 'feature_toggle':
        await this.handleFeatureToggleAction(action);
        break;
      
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  private async handleSessionUpdateAction(action: QueuedAction): Promise<void> {
    const { sessionId, updates } = action.payload;
    const session = await this.getEnhancedSession(sessionId as string);
    
    if (session) {
      Object.assign(session, updates);
      await this.saveEnhancedSession(session);
    }
  }

  private async handleFormSaveAction(action: QueuedAction): Promise<void> {
    const { sessionId, formId, formData } = action.payload;
    // Save form data to session
    console.log('Saving form data:', { sessionId, formId, formData });
  }

  private async handleFeatureToggleAction(action: QueuedAction): Promise<void> {
    const { sessionId, featureId, enabled } = action.payload;
    const session = await this.getEnhancedSession(sessionId as string);
    
    if (session && session.featureStates[featureId as string]) {
      session.featureStates[featureId as string].enabled = enabled as boolean;
      await this.saveEnhancedSession(session);
    }
  }

  private async saveCheckpoint(checkpoint: ProcessingCheckpoint): Promise<void> {
    await this.db.collection('checkpoints').doc(checkpoint.id).set(checkpoint);
  }

  private async addCheckpointToSession(
    sessionId: string,
    checkpoint: ProcessingCheckpoint
  ): Promise<void> {
    const sessionRef = this.db.collection('sessions').doc(sessionId);
    
    await sessionRef.update({
      processingCheckpoints: admin.firestore.FieldValue.arrayUnion(checkpoint)
    });
  }

  private async updateSessionCheckpoint(
    sessionId: string,
    updatedCheckpoint: ProcessingCheckpoint
  ): Promise<void> {
    const session = await this.getEnhancedSession(sessionId);
    if (!session) return;

    // Update the checkpoint in the session
    const checkpointIndex = session.processingCheckpoints.findIndex(
      cp => cp.id === updatedCheckpoint.id
    );

    if (checkpointIndex !== -1) {
      session.processingCheckpoints[checkpointIndex] = updatedCheckpoint;
      await this.saveEnhancedSession(session);
    }
  }

  private async getEnhancedSession(sessionId: string): Promise<EnhancedSessionState | null> {
    const doc = await this.db.collection('sessions').doc(sessionId).get();
    return doc.exists ? (doc.data() as EnhancedSessionState) : null;
  }

  private async saveEnhancedSession(session: EnhancedSessionState): Promise<void> {
    await this.db.collection('sessions').doc(session.sessionId).set(session, { merge: true });
  }

  private async updateSessionProgressFromCheckpoints(session: EnhancedSessionState): Promise<void> {
    // Update step progress based on checkpoint states
    for (const checkpoint of session.processingCheckpoints) {
      const stepProgress = session.stepProgress[checkpoint.stepId];
      if (stepProgress) {
        // Update substep progress based on checkpoint state
        const relatedSubstepKey = checkpoint.functionName;
        const hasRelatedSubstep = relatedSubstepKey in stepProgress.substeps;
        
        if (hasRelatedSubstep) {
          switch (checkpoint.state) {
            case 'completed':
              stepProgress.substeps[relatedSubstepKey] = true;
              break;
            case 'failed':
              stepProgress.substeps[relatedSubstepKey] = false;
              break;
            case 'in_progress':
              stepProgress.substeps[relatedSubstepKey] = false;
              break;
          }
        }
      }
    }
  }

  private async scheduleRetry(checkpointId: string, retryAttempt: number): Promise<void> {
    const delayMs = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
    
    // In a production environment, you'd use Cloud Tasks or similar for scheduling
    setTimeout(async () => {
      await this.executeCheckpoint(checkpointId);
    }, delayMs);
  }

  private generateCheckpointId(sessionId: string, stepId: CVStep, functionName: string): string {
    return `checkpoint_${sessionId}_${stepId}_${functionName}_${Date.now()}`;
  }

  private determinePriority(stepId: CVStep, featureId?: string): ProcessingCheckpoint['priority'] {
    // Core steps get higher priority
    const coreSteps: CVStep[] = ['upload', 'processing', 'analysis'];
    
    if (coreSteps.includes(stepId)) {
      return 'high';
    }

    // Optional features get lower priority
    if (featureId) {
      return 'low';
    }

    return 'normal';
  }

  private getDependencies(stepId: CVStep, featureId?: string): string[] {
    const dependencies: Record<CVStep, string[]> = {
      upload: [],
      processing: ['upload'],
      analysis: ['processing'],
      features: ['analysis'],
      templates: ['analysis'],
      generation: ['templates', 'features'],
      finalization: ['generation'],
      preview: ['finalization']
    };

    return dependencies[stepId] || [];
  }

  private getEstimatedDuration(functionName: string): number {
    // Estimated duration in seconds
    const durations: Record<string, number> = {
      generateCV: 30,
      generatePodcast: 120,
      generateVideo: 180,
      skillsVisualization: 15,
      portfolioGallery: 45
    };

    return durations[functionName] || 30;
  }

  private getResourceRequirements(functionName: string): Record<string, unknown> {
    // Resource requirements for different functions
    const requirements: Record<string, Record<string, unknown>> = {
      generateCV: { memory: '1GB', timeout: 120 },
      generatePodcast: { memory: '2GB', timeout: 300 },
      generateVideo: { memory: '2GB', timeout: 540 },
      skillsVisualization: { memory: '512MB', timeout: 60 }
    };

    return requirements[functionName] || { memory: '512MB', timeout: 60 };
  }
}

export default SessionCheckpointService;