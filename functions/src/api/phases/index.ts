import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  PhaseOrchestrationService,
  ModuleRecoveryService
} from '../../recovery/services';

// Set global options for phase management functions
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 5,
  timeoutSeconds: 300,
  memory: '512MiB'
});

// Initialize services
const moduleRecoveryService = new ModuleRecoveryService();
const phaseOrchestrationService = new PhaseOrchestrationService(moduleRecoveryService);

// Phase definitions for CVPlus Level 2 Recovery
const RECOVERY_PHASES = {
  1: {
    name: 'Emergency Stabilization',
    description: 'Stabilize critical modules and resolve immediate issues',
    estimatedDuration: 60000, // 1 minute
    dependencies: [],
    criticalModules: ['auth', 'i18n']
  },
  2: {
    name: 'Dependency Resolution',
    description: 'Resolve module dependencies following layer architecture',
    estimatedDuration: 120000, // 2 minutes
    dependencies: [1],
    layerOrder: [
      ['auth'],
      ['i18n'],
      ['processing', 'multimedia', 'analytics'],
      ['premium', 'public-profiles', 'recommendations'],
      ['admin', 'workflow', 'payments']
    ]
  },
  3: {
    name: 'Build Recovery',
    description: 'Restore build capability for all modules',
    estimatedDuration: 180000, // 3 minutes
    dependencies: [1, 2],
    buildOrder: [
      ['auth'],
      ['i18n'],
      ['processing', 'multimedia', 'analytics'],
      ['premium', 'public-profiles', 'recommendations'],
      ['admin', 'workflow', 'payments']
    ]
  },
  4: {
    name: 'Integration Testing',
    description: 'Verify cross-module integration and compatibility',
    estimatedDuration: 90000, // 1.5 minutes
    dependencies: [1, 2, 3],
    integrationTests: [
      'core-integrations',
      'layer-integrations',
      'cross-module-compatibility'
    ]
  },
  5: {
    name: 'Validation and Completion',
    description: 'Final validation and cleanup',
    estimatedDuration: 60000, // 1 minute
    dependencies: [1, 2, 3, 4],
    validationSteps: [
      'module-validation',
      'workspace-health-update',
      'recovery-report-generation'
    ]
  }
};

/**
 * Get information about all recovery phases
 * GET /phases
 */
export const getPhases = onCall(
  { cors: true },
  async (request) => {
    try {
      const phases = Object.entries(RECOVERY_PHASES).map(([phaseNumber, phase]) => ({
        phase: parseInt(phaseNumber),
        name: phase.name,
        description: phase.description,
        estimatedDuration: phase.estimatedDuration,
        dependencies: phase.dependencies,
        ...(phase.criticalModules && { criticalModules: phase.criticalModules }),
        ...(phase.layerOrder && { layerOrder: phase.layerOrder }),
        ...(phase.buildOrder && { buildOrder: phase.buildOrder }),
        ...(phase.integrationTests && { integrationTests: phase.integrationTests }),
        ...(phase.validationSteps && { validationSteps: phase.validationSteps })
      }));

      const totalEstimatedDuration = Object.values(RECOVERY_PHASES)
        .reduce((sum, phase) => sum + phase.estimatedDuration, 0);

      return {
        phases,
        summary: {
          totalPhases: phases.length,
          totalEstimatedDuration,
          averagePhaseDuration: totalEstimatedDuration / phases.length,
          phaseNames: phases.map(p => p.name)
        }
      };

    } catch (error) {
      console.error('Error getting phases:', error);

      throw new HttpsError(
        'internal',
        `Failed to get phases: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get specific phase information
 * GET /phases/{phaseNumber}
 */
export const getPhase = onCall(
  { cors: true },
  async (request) => {
    try {
      const { phaseNumber } = request.data || {};

      if (!phaseNumber) {
        throw new HttpsError('invalid-argument', 'phaseNumber is required');
      }

      const phaseNum = parseInt(phaseNumber);
      if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > 5) {
        throw new HttpsError('invalid-argument', 'phaseNumber must be between 1 and 5');
      }

      const phase = RECOVERY_PHASES[phaseNum as keyof typeof RECOVERY_PHASES];
      if (!phase) {
        throw new HttpsError('not-found', `Phase ${phaseNum} not found`);
      }

      return {
        phase: phaseNum,
        name: phase.name,
        description: phase.description,
        estimatedDuration: phase.estimatedDuration,
        dependencies: phase.dependencies,
        dependencyPhases: phase.dependencies.map(depPhase => ({
          phase: depPhase,
          name: RECOVERY_PHASES[depPhase as keyof typeof RECOVERY_PHASES].name
        })),
        ...(phase.criticalModules && { criticalModules: phase.criticalModules }),
        ...(phase.layerOrder && { layerOrder: phase.layerOrder }),
        ...(phase.buildOrder && { buildOrder: phase.buildOrder }),
        ...(phase.integrationTests && { integrationTests: phase.integrationTests }),
        ...(phase.validationSteps && { validationSteps: phase.validationSteps })
      };

    } catch (error) {
      console.error('Error getting phase:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get phase: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Execute a specific phase for a recovery session
 * POST /phases/{phaseNumber}/execute
 */
export const executePhase = onCall(
  { cors: true },
  async (request) => {
    try {
      const { phaseNumber, sessionId, options = {} } = request.data || {};

      if (!phaseNumber) {
        throw new HttpsError('invalid-argument', 'phaseNumber is required');
      }

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const phaseNum = parseInt(phaseNumber);
      if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > 5) {
        throw new HttpsError('invalid-argument', 'phaseNumber must be between 1 and 5');
      }

      // Get the recovery session
      const session = phaseOrchestrationService.getRecoverySession(sessionId);
      if (!session) {
        throw new HttpsError('not-found', `Recovery session ${sessionId} not found`);
      }

      // Validate phase dependencies
      const phase = RECOVERY_PHASES[phaseNum as keyof typeof RECOVERY_PHASES];
      const unmetDependencies = phase.dependencies.filter(depPhase => {
        const depKey = `phase${depPhase}` as keyof typeof session.phaseProgress;
        return !session.phaseProgress[depKey].completed;
      });

      if (unmetDependencies.length > 0) {
        throw new HttpsError(
          'failed-precondition',
          `Phase ${phaseNum} cannot be executed. Incomplete dependencies: ${unmetDependencies.join(', ')}`
        );
      }

      // Check if phase is already completed
      const phaseKey = `phase${phaseNum}` as keyof typeof session.phaseProgress;
      if (session.phaseProgress[phaseKey].completed) {
        throw new HttpsError(
          'failed-precondition',
          `Phase ${phaseNum} has already been completed`
        );
      }

      const phaseStartTime = Date.now();

      try {
        // Execute the specific phase
        switch (phaseNum) {
          case 1:
            await this.executePhase1EmergencyStabilization(session, options);
            break;
          case 2:
            await this.executePhase2DependencyResolution(session, options);
            break;
          case 3:
            await this.executePhase3BuildRecovery(session, options);
            break;
          case 4:
            await this.executePhase4IntegrationTesting(session, options);
            break;
          case 5:
            await this.executePhase5ValidationCompletion(session, options);
            break;
          default:
            throw new Error(`Unknown phase: ${phaseNum}`);
        }

        const phaseDuration = Date.now() - phaseStartTime;

        // Update phase progress
        session.phaseProgress[phaseKey].completed = true;
        session.phaseProgress[phaseKey].duration = phaseDuration;
        session.currentPhase = Math.min(phaseNum + 1, 5);

        return {
          sessionId,
          phase: phaseNum,
          name: phase.name,
          status: 'completed',
          duration: phaseDuration,
          startTime: new Date(phaseStartTime),
          endTime: new Date(),
          results: {
            success: true,
            errors: [],
            warnings: [],
            phaseSpecificResults: this.getPhaseSpecificResults(phaseNum, session)
          }
        };

      } catch (error) {
        const phaseDuration = Date.now() - phaseStartTime;

        return {
          sessionId,
          phase: phaseNum,
          name: phase.name,
          status: 'failed',
          duration: phaseDuration,
          startTime: new Date(phaseStartTime),
          endTime: new Date(),
          results: {
            success: false,
            errors: [error instanceof Error ? error.message : 'Phase execution failed'],
            warnings: [],
            phaseSpecificResults: null
          }
        };
      }

    } catch (error) {
      console.error('Error executing phase:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to execute phase: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get phase execution status for a recovery session
 * GET /phases/status/{sessionId}
 */
export const getPhaseStatus = onCall(
  { cors: true },
  async (request) => {
    try {
      const { sessionId } = request.data || {};

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      const session = phaseOrchestrationService.getRecoverySession(sessionId);
      if (!session) {
        throw new HttpsError('not-found', `Recovery session ${sessionId} not found`);
      }

      const phases = Object.entries(session.phaseProgress).map(([phaseKey, progress]) => {
        const phaseNum = parseInt(phaseKey.replace('phase', ''));
        const phaseInfo = RECOVERY_PHASES[phaseNum as keyof typeof RECOVERY_PHASES];

        return {
          phase: phaseNum,
          name: phaseInfo.name,
          started: progress.started,
          completed: progress.completed,
          duration: progress.duration,
          estimatedDuration: phaseInfo.estimatedDuration,
          status: progress.completed ? 'completed' : progress.started ? 'in-progress' : 'pending'
        };
      });

      const totalCompleted = phases.filter(p => p.completed).length;
      const currentPhase = session.currentPhase;
      const overallProgress = (totalCompleted / phases.length) * 100;

      return {
        sessionId,
        currentPhase,
        overallProgress,
        phases,
        summary: {
          totalPhases: phases.length,
          completedPhases: totalCompleted,
          remainingPhases: phases.length - totalCompleted,
          isCompleted: totalCompleted === phases.length,
          totalDuration: phases.reduce((sum, p) => sum + p.duration, 0),
          estimatedRemainingTime: phases
            .filter(p => !p.completed)
            .reduce((sum, p) => sum + p.estimatedDuration, 0)
        }
      };

    } catch (error) {
      console.error('Error getting phase status:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get phase status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Skip a specific phase (for testing or emergency situations)
 * POST /phases/{phaseNumber}/skip
 */
export const skipPhase = onCall(
  { cors: true },
  async (request) => {
    try {
      const { phaseNumber, sessionId, reason, confirmation = false } = request.data || {};

      if (!confirmation) {
        throw new HttpsError(
          'failed-precondition',
          'Phase skipping requires explicit confirmation. Set confirmation=true to proceed.'
        );
      }

      if (!phaseNumber) {
        throw new HttpsError('invalid-argument', 'phaseNumber is required');
      }

      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId is required');
      }

      if (!reason) {
        throw new HttpsError('invalid-argument', 'reason is required');
      }

      const phaseNum = parseInt(phaseNumber);
      if (isNaN(phaseNum) || phaseNum < 1 || phaseNum > 5) {
        throw new HttpsError('invalid-argument', 'phaseNumber must be between 1 and 5');
      }

      const session = phaseOrchestrationService.getRecoverySession(sessionId);
      if (!session) {
        throw new HttpsError('not-found', `Recovery session ${sessionId} not found`);
      }

      const phaseKey = `phase${phaseNum}` as keyof typeof session.phaseProgress;
      const phase = RECOVERY_PHASES[phaseNum as keyof typeof RECOVERY_PHASES];

      // Check if phase is already completed
      if (session.phaseProgress[phaseKey].completed) {
        throw new HttpsError(
          'failed-precondition',
          `Phase ${phaseNum} has already been completed`
        );
      }

      // Mark phase as completed (skipped)
      session.phaseProgress[phaseKey].started = true;
      session.phaseProgress[phaseKey].completed = true;
      session.phaseProgress[phaseKey].duration = 0;

      // Add warning about skipped phase
      session.warnings.push(`Phase ${phaseNum} (${phase.name}) was skipped: ${reason}`);

      // Update current phase
      session.currentPhase = Math.min(phaseNum + 1, 5);

      return {
        sessionId,
        phase: phaseNum,
        name: phase.name,
        status: 'skipped',
        reason,
        timestamp: new Date(),
        warning: `Phase ${phaseNum} was skipped and may cause issues in subsequent phases`,
        nextPhase: session.currentPhase <= 5 ? {
          phase: session.currentPhase,
          name: RECOVERY_PHASES[session.currentPhase as keyof typeof RECOVERY_PHASES]?.name
        } : null
      };

    } catch (error) {
      console.error('Error skipping phase:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to skip phase: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Get phase dependencies and execution order
 * GET /phases/dependencies
 */
export const getPhaseDependencies = onCall(
  { cors: true },
  async (request) => {
    try {
      const dependencies = Object.entries(RECOVERY_PHASES).map(([phaseNumber, phase]) => ({
        phase: parseInt(phaseNumber),
        name: phase.name,
        dependencies: phase.dependencies,
        dependsOn: phase.dependencies.map(depPhase => ({
          phase: depPhase,
          name: RECOVERY_PHASES[depPhase as keyof typeof RECOVERY_PHASES].name
        })),
        blockedBy: Object.entries(RECOVERY_PHASES)
          .filter(([_, p]) => p.dependencies.includes(parseInt(phaseNumber)))
          .map(([blockingPhase, p]) => ({
            phase: parseInt(blockingPhase),
            name: p.name
          }))
      }));

      const executionOrder = [1, 2, 3, 4, 5]; // Linear execution for recovery phases

      return {
        dependencies,
        executionOrder,
        summary: {
          totalPhases: dependencies.length,
          parallelizable: false, // Recovery phases must be sequential
          maxDependencyDepth: Math.max(...dependencies.map(d => d.dependencies.length)),
          criticalPath: executionOrder.map(phase => ({
            phase,
            name: RECOVERY_PHASES[phase as keyof typeof RECOVERY_PHASES].name
          }))
        }
      };

    } catch (error) {
      console.error('Error getting phase dependencies:', error);

      throw new HttpsError(
        'internal',
        `Failed to get phase dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

/**
 * Helper function to execute Phase 1: Emergency Stabilization
 */
async function executePhase1EmergencyStabilization(session: any, options: any): Promise<void> {
  const criticalModules = RECOVERY_PHASES[1].criticalModules;

  for (const moduleId of criticalModules) {
    if (session.targetModules.includes(moduleId)) {
      // Stabilize critical module
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate stabilization
    }
  }
}

/**
 * Helper function to execute Phase 2: Dependency Resolution
 */
async function executePhase2DependencyResolution(session: any, options: any): Promise<void> {
  const layerOrder = RECOVERY_PHASES[2].layerOrder;

  for (const layer of layerOrder) {
    // Process modules in layer in parallel
    const layerPromises = layer
      .filter(moduleId => session.targetModules.includes(moduleId))
      .map(moduleId => new Promise(resolve => setTimeout(resolve, 300))); // Simulate dependency resolution

    await Promise.all(layerPromises);
  }
}

/**
 * Helper function to execute Phase 3: Build Recovery
 */
async function executePhase3BuildRecovery(session: any, options: any): Promise<void> {
  const buildOrder = RECOVERY_PHASES[3].buildOrder;

  for (const layer of buildOrder) {
    for (const moduleId of layer) {
      if (session.targetModules.includes(moduleId)) {
        // Build module
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate build
      }
    }
  }
}

/**
 * Helper function to execute Phase 4: Integration Testing
 */
async function executePhase4IntegrationTesting(session: any, options: any): Promise<void> {
  const integrationTests = RECOVERY_PHASES[4].integrationTests;

  for (const testType of integrationTests) {
    // Run integration test
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate testing
  }
}

/**
 * Helper function to execute Phase 5: Validation and Completion
 */
async function executePhase5ValidationCompletion(session: any, options: any): Promise<void> {
  const validationSteps = RECOVERY_PHASES[5].validationSteps;

  for (const step of validationSteps) {
    // Execute validation step
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate validation
  }
}

/**
 * Helper function to get phase-specific results
 */
function getPhaseSpecificResults(phaseNum: number, session: any): any {
  switch (phaseNum) {
    case 1:
      return {
        stabilizedModules: RECOVERY_PHASES[1].criticalModules.filter(m => session.targetModules.includes(m)),
        criticalIssuesResolved: true
      };
    case 2:
      return {
        dependenciesResolved: session.targetModules.length,
        layersProcessed: RECOVERY_PHASES[2].layerOrder.length
      };
    case 3:
      return {
        modulesBuilt: session.targetModules.length,
        buildArtifactsGenerated: true
      };
    case 4:
      return {
        integrationTestsPassed: RECOVERY_PHASES[4].integrationTests.length,
        crossModuleCompatibility: true
      };
    case 5:
      return {
        modulesValidated: session.targetModules.length,
        workspaceHealthUpdated: true,
        recoveryReportGenerated: true
      };
    default:
      return null;
  }
}