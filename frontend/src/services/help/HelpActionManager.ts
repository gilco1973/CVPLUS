/**
 * Help Action Manager
 * Extracted from HelpContext.tsx for better modularity
 * Handles help actions and business logic
 */

import type { HelpUserPreferences, HelpAnalytics, HelpContent, HelpTour } from '../../types/help';
import { HelpContentService } from '../helpContentService';
import { HelpStateUtils } from './HelpStateManager';

export interface HelpContextActions {
  setContext: (context: string) => void;
  showHelp: (helpId: string) => void;
  hideHelp: () => void;
  dismissHelp: (helpId: string) => void;
  updatePreferences: (preferences: Partial<HelpUserPreferences>) => void;
  startTour: (tourId: string) => void;
  completeTour: (tourId: string) => void;
  skipTour: (tourId: string) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  trackAnalytics: (analytics: Omit<HelpAnalytics, 'timestamp' | 'sessionId'>) => void;
  resetOnboarding: () => void;
}

export class HelpActionManager {
  private dispatch: (action: any) => void;
  private sessionId: string;
  private helpService: HelpContentService;

  constructor(dispatch: (action: any) => void, sessionId: string) {
    this.dispatch = dispatch;
    this.sessionId = sessionId;
    this.helpService = HelpContentService.getInstance();
  }

  createActions(state: any): HelpContextActions {
    return {
      setContext: (context: string) => {
        this.dispatch({ type: 'SET_CONTEXT', payload: context });
        this.trackAnalytics({
          action: 'context_changed',
          context,
          helpId: null
        });
      },

      showHelp: (helpId: string) => {
        this.dispatch({ type: 'SHOW_HELP', payload: helpId });
        this.trackAnalytics({
          action: 'help_shown',
          context: state.currentContext,
          helpId
        });
      },

      hideHelp: () => {
        const currentHelpId = state.activeHelp;
        this.dispatch({ type: 'HIDE_HELP' });
        
        if (currentHelpId) {
          this.trackAnalytics({
            action: 'help_hidden',
            context: state.currentContext,
            helpId: currentHelpId
          });
        }
      },

      dismissHelp: (helpId: string) => {
        this.dispatch({ type: 'DISMISS_HELP', payload: helpId });
        this.trackAnalytics({
          action: 'help_dismissed',
          context: state.currentContext,
          helpId
        });
      },

      updatePreferences: (preferences: Partial<HelpUserPreferences>) => {
        const updatedPrefs = { ...state.userPreferences, ...preferences };
        this.dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
        HelpStateUtils.savePreferences(updatedPrefs);
        
        this.trackAnalytics({
          action: 'preferences_updated',
          context: state.currentContext,
          helpId: null,
          metadata: { updatedFields: Object.keys(preferences) }
        });
      },

      startTour: (tourId: string) => {
        this.trackAnalytics({
          action: 'tour_started',
          context: state.currentContext,
          helpId: tourId
        });
      },

      completeTour: (tourId: string) => {
        this.dispatch({ type: 'COMPLETE_TOUR', payload: tourId });
        this.trackAnalytics({
          action: 'tour_completed',
          context: state.currentContext,
          helpId: tourId
        });
      },

      skipTour: (tourId: string) => {
        this.trackAnalytics({
          action: 'tour_skipped',
          context: state.currentContext,
          helpId: tourId
        });
      },

      setSearchQuery: (query: string) => {
        this.dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
        
        if (query.length > 2) {
          this.trackAnalytics({
            action: 'help_searched',
            context: state.currentContext,
            helpId: null,
            metadata: { query: query.substring(0, 50) } // Truncate for privacy
          });
        }
      },

      toggleSearch: () => {
        this.dispatch({ type: 'TOGGLE_SEARCH' });
        this.trackAnalytics({
          action: state.isSearchOpen ? 'search_closed' : 'search_opened',
          context: state.currentContext,
          helpId: null
        });
      },

      trackAnalytics: (analytics: Omit<HelpAnalytics, 'timestamp' | 'sessionId'>) => {
        const fullAnalytics: HelpAnalytics = {
          ...analytics,
          timestamp: new Date(),
          sessionId: this.sessionId
        };

        this.dispatch({ type: 'TRACK_ANALYTICS', payload: fullAnalytics });
        
        // Periodically save analytics to localStorage
        const allAnalytics = [...state.analytics, fullAnalytics];
        if (allAnalytics.length % 10 === 0) {
          HelpStateUtils.saveAnalytics(allAnalytics);
        }
      },

      resetOnboarding: () => {
        this.dispatch({ type: 'RESET_ONBOARDING' });
        this.trackAnalytics({
          action: 'onboarding_reset',
          context: state.currentContext,
          helpId: null
        });
      }
    };
  }

  /**
   * Get contextual help content
   */
  getContextualHelp(context: string): HelpContent[] {
    try {
      return this.helpService.getContentByContext(context);
    } catch (error) {
      console.error('Error getting contextual help:', error);
      return [];
    }
  }

  /**
   * Get available tours for context
   */
  getAvailableTours(context: string): HelpTour[] {
    try {
      return this.helpService.getToursByContext(context);
    } catch (error) {
      console.error('Error getting tours:', error);
      return [];
    }
  }

  /**
   * Search help content
   */
  searchHelp(query: string): HelpContent[] {
    try {
      return this.helpService.searchContent(query);
    } catch (error) {
      console.error('Error searching help:', error);
      return [];
    }
  }

  /**
   * Check if help should be shown
   */
  shouldShowHelp(helpId: string, userPreferences: HelpUserPreferences): boolean {
    if (!userPreferences.showTooltips) {
      return false;
    }

    if (userPreferences.dismissedHelp.includes(helpId)) {
      return false;
    }

    const content = this.helpService.getContentById(helpId);
    if (!content) {
      return false;
    }

    // Check frequency preferences
    if (userPreferences.helpFrequency === 'minimal' && content.priority === 'low') {
      return false;
    }

    return true;
  }
}