// Navigation State Manager - Main orchestrator for navigation intelligence
import {
  NavigationState,
  NavigationContext,
  NavigationPath,
  Breadcrumb,
  CVStep,
  EnhancedSessionState
} from '../../types/session';
import { EnhancedSessionManager } from '../enhancedSessionManager';
import { RouteManager } from './routeManager';
import { ResumeIntelligence } from './resumeIntelligence';

export class NavigationStateManager {
  private static instance: NavigationStateManager;
  private enhancedSessionManager: EnhancedSessionManager;
  private routeManager: RouteManager;
  private resumeIntelligence: ResumeIntelligence;
  private navigationHistory = new Map<string, NavigationState[]>();
  
  private constructor() {
    this.enhancedSessionManager = EnhancedSessionManager.getInstance();
    this.routeManager = new RouteManager();
    this.resumeIntelligence = new ResumeIntelligence();
    this.setupBrowserHistoryListener();
  }

  public static getInstance(): NavigationStateManager {
    if (!NavigationStateManager.instance) {
      NavigationStateManager.instance = new NavigationStateManager();
    }
    return NavigationStateManager.instance;
  }

  // Delegate URL management to RouteManager
  public generateStateUrl = this.routeManager.generateStateUrl.bind(this.routeManager);
  public parseStateFromUrl = this.routeManager.parseStateFromUrl.bind(this.routeManager);

  // Delegate resume intelligence
  public suggestOptimalResumePoint = this.resumeIntelligence.suggestOptimalResumePoint.bind(this.resumeIntelligence);
  public getNextRecommendedActions = this.resumeIntelligence.getNextRecommendedActions.bind(this.resumeIntelligence);
  public identifySkippableSteps = this.resumeIntelligence.identifySkippableSteps.bind(this.resumeIntelligence);

  public pushStateToHistory(state: NavigationState): void {
    const history = this.navigationHistory.get(state.sessionId) || [];
    history.push(state);
    this.navigationHistory.set(state.sessionId, history);

    const url = this.generateStateUrl(state.sessionId, state.step, state.substep, state.parameters);
    
    try {
      window.history.pushState(
        {
          sessionId: state.sessionId,
          step: state.step,
          substep: state.substep,
          timestamp: state.timestamp.toISOString()
        },
        this.getPageTitle(state.step),
        url
      );
    } catch (error) {
      console.warn('Error pushing state to browser history:', error);
    }
  }

  public handleBackNavigation(): NavigationState | null {
    const currentState = this.getCurrentNavigationState();
    if (!currentState) return null;

    const history = this.navigationHistory.get(currentState.sessionId) || [];
    if (history.length < 2) return null;

    const previousState = history[history.length - 2];
    
    const backState: NavigationState = {
      ...previousState,
      timestamp: new Date(),
      transition: 'back'
    };

    history.pop();
    this.navigationHistory.set(currentState.sessionId, history);

    return backState;
  }

  public async getNavigationContext(sessionId: string): Promise<NavigationContext> {
    const session = await this.enhancedSessionManager.getEnhancedSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentPath = window.location.pathname;
    const availablePaths = this.getAvailablePaths(session);
    const blockedPaths = this.getBlockedPaths(session);
    const recommendedNextSteps = this.getRecommendedNextSteps(session);
    const completionPercentage = this.calculateCompletionPercentage(session);
    const criticalIssues = this.identifyCriticalIssues(session);

    return {
      sessionId,
      currentPath,
      availablePaths,
      blockedPaths,
      recommendedNextSteps,
      completionPercentage,
      criticalIssues
    };
  }

  public generateBreadcrumbs(currentState: EnhancedSessionState): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    const completedSteps = [...currentState.completedSteps, currentState.currentStep];

    for (const step of completedSteps) {
      const routeDef = this.routeManager.getRouteDefinition(step);
      if (!routeDef) continue;

      const url = this.generateStateUrl(currentState.sessionId, step);
      
      breadcrumbs.push({
        id: `breadcrumb_${step}`,
        label: routeDef.title,
        url,
        step,
        completed: currentState.completedSteps.includes(step),
        accessible: this.isStepAccessible(step, currentState),
        metadata: {
          icon: routeDef.icon,
          description: routeDef.description
        }
      });
    }

    return breadcrumbs;
  }

  private setupBrowserHistoryListener(): void {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.sessionId) {
        const navigationState = this.parseStateFromUrl(window.location.href);
        if (navigationState) {
          this.handleNavigationStateChange(navigationState);
        }
      }
    });
  }

  private handleNavigationStateChange(state: NavigationState): void {
    const history = this.navigationHistory.get(state.sessionId) || [];
    history.push(state);
    this.navigationHistory.set(state.sessionId, history);

    window.dispatchEvent(new CustomEvent('navigationStateChange', {
      detail: state
    }));
  }

  private getCurrentNavigationState(): NavigationState | null {
    const currentUrl = window.location.href;
    return this.parseStateFromUrl(currentUrl);
  }

  private getPageTitle(step: CVStep): string {
    const routeDef = this.routeManager.getRouteDefinition(step);
    return routeDef ? `CVPlus - ${routeDef.title}` : 'CVPlus';
  }

  private getAvailablePaths(session: EnhancedSessionState): NavigationPath[] {
    const paths: NavigationPath[] = [];
    const routes = this.routeManager.getAllRoutes();

    for (const routeDef of routes) {
      const accessible = this.isStepAccessible(routeDef.step, session);
      const completed = session.completedSteps.includes(routeDef.step);
      const required = this.isStepRequired(routeDef.step);
      
      paths.push({
        step: routeDef.step,
        url: this.generateStateUrl(session.sessionId, routeDef.step),
        label: routeDef.title,
        accessible,
        completed,
        required,
        estimatedTime: routeDef.estimatedTime,
        prerequisites: this.getStepPrerequisites(routeDef.step),
        warnings: accessible ? [] : [`${routeDef.title} requires completion of previous steps`]
      });
    }

    return paths;
  }

  private getBlockedPaths(session: EnhancedSessionState): NavigationPath[] {
    const allPaths = this.getAvailablePaths(session);
    return allPaths.filter(path => !path.accessible);
  }

  private getRecommendedNextSteps(session: EnhancedSessionState): CVStep[] {
    const steps: CVStep[] = ['upload', 'processing', 'analysis', 'features', 'templates', 'preview', 'results'];
    
    for (const step of steps) {
      if (!session.completedSteps.includes(step)) {
        return [step];
      }
    }

    if (!session.completedSteps.includes('keywords')) {
      return ['keywords'];
    }

    return ['completed'];
  }

  private calculateCompletionPercentage(session: EnhancedSessionState): number {
    const mainSteps: CVStep[] = ['upload', 'processing', 'analysis', 'features', 'templates', 'preview', 'results'];
    const completedMainSteps = mainSteps.filter(step => session.completedSteps.includes(step));
    
    let baseCompletion = (completedMainSteps.length / mainSteps.length) * 80;
    
    const currentStepProgress = session.stepProgress[session.currentStep];
    if (currentStepProgress) {
      baseCompletion += (currentStepProgress.completion / 100) * (80 / mainSteps.length);
    }

    if (session.completedSteps.includes('keywords')) baseCompletion += 10;
    
    const enabledFeatures = Object.values(session.featureStates).filter(f => f.enabled);
    baseCompletion += Math.min(enabledFeatures.length * 2, 10);

    return Math.min(baseCompletion, 100);
  }

  private identifyCriticalIssues(session: EnhancedSessionState): string[] {
    const issues: string[] = [];

    const validationIssues = session.validationResults.globalValidations.filter(v => !v.valid);
    if (validationIssues.length > 0) {
      issues.push(`${validationIssues.length} validation errors need fixing`);
    }

    const failedCheckpoints = session.processingCheckpoints.filter(cp => cp.state === 'failed');
    if (failedCheckpoints.length > 0) {
      issues.push(`${failedCheckpoints.length} processing operations failed`);
    }

    return issues;
  }

  private isStepAccessible(step: CVStep, session: EnhancedSessionState): boolean {
    const prerequisites = this.getStepPrerequisites(step);
    return prerequisites.every(prereq => session.completedSteps.includes(prereq));
  }

  private isStepRequired(step: CVStep): boolean {
    const requiredSteps: CVStep[] = ['upload', 'processing', 'analysis'];
    return requiredSteps.includes(step);
  }

  private getStepPrerequisites(step: CVStep): CVStep[] {
    const prerequisites: Record<CVStep, CVStep[]> = {
      upload: [],
      processing: ['upload'],
      analysis: ['upload', 'processing'],
      features: ['analysis'],
      templates: ['analysis'],
      preview: ['analysis', 'features', 'templates'],
      results: ['preview'],
      keywords: ['analysis'],
      completed: ['results']
    };

    return prerequisites[step] || [];
  }
}

export default NavigationStateManager;