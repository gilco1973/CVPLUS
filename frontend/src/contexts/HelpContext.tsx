import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { HelpContextState, HelpUserPreferences, HelpAnalytics, HelpContent, HelpTour } from '../types/help';
import { HelpContentService } from '../services/helpContentService';

interface HelpContextActions {
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

interface HelpContextValue extends HelpContextState {
  actions: HelpContextActions;
  getContextualHelp: (context: string) => HelpContent[];
  getAvailableTours: (context: string) => HelpTour[];
  searchHelp: (query: string) => HelpContent[];
  shouldShowHelp: (helpId: string) => boolean;
}

const defaultPreferences: HelpUserPreferences = {
  showTooltips: true,
  showOnboarding: true,
  completedTours: [],
  dismissedHelp: [],
  helpFrequency: 'normal',
  enableAnimations: true,
  compactMode: false
};

const initialState: HelpContextState = {
  isHelpEnabled: true,
  currentContext: 'home',
  activeHelp: null,
  userPreferences: defaultPreferences,
  tours: {},
  content: {},
  analytics: [],
  searchQuery: '',
  isSearchOpen: false
};

type HelpAction =
  | { type: 'SET_CONTEXT'; payload: string }
  | { type: 'SHOW_HELP'; payload: string }
  | { type: 'HIDE_HELP' }
  | { type: 'DISMISS_HELP'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<HelpUserPreferences> }
  | { type: 'COMPLETE_TOUR'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_SEARCH' }
  | { type: 'TRACK_ANALYTICS'; payload: HelpAnalytics }
  | { type: 'RESET_ONBOARDING' }
  | { type: 'LOAD_PREFERENCES'; payload: HelpUserPreferences };

function helpReducer(state: HelpContextState, action: HelpAction): HelpContextState {
  switch (action.type) {
    case 'SET_CONTEXT':
      return {
        ...state,
        currentContext: action.payload,
        activeHelp: null // Clear active help when context changes
      };
    
    case 'SHOW_HELP':
      return {
        ...state,
        activeHelp: action.payload
      };
    
    case 'HIDE_HELP':
      return {
        ...state,
        activeHelp: null
      };
    
    case 'DISMISS_HELP':
      return {
        ...state,
        activeHelp: null,
        userPreferences: {
          ...state.userPreferences,
          dismissedHelp: [...state.userPreferences.dismissedHelp, action.payload]
        }
      };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          ...action.payload
        }
      };
    
    case 'COMPLETE_TOUR':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          completedTours: [...state.userPreferences.completedTours, action.payload]
        }
      };
    
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload
      };
    
    case 'TOGGLE_SEARCH':
      return {
        ...state,
        isSearchOpen: !state.isSearchOpen,
        searchQuery: state.isSearchOpen ? '' : state.searchQuery
      };
    
    case 'TRACK_ANALYTICS':
      return {
        ...state,
        analytics: [...state.analytics, action.payload]
      };
    
    case 'RESET_ONBOARDING':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          completedTours: [],
          dismissedHelp: [],
          showOnboarding: true
        }
      };
    
    case 'LOAD_PREFERENCES':
      return {
        ...state,
        userPreferences: action.payload
      };
    
    default:
      return state;
  }
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

const STORAGE_KEY = 'cvplus-help-preferences';
const ANALYTICS_STORAGE_KEY = 'cvplus-help-analytics';

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(helpReducer, initialState);
  const helpService = HelpContentService.getInstance();

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(STORAGE_KEY);
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'LOAD_PREFERENCES', payload: { ...defaultPreferences, ...preferences } });
      }
    } catch (error) {
      console.error('Failed to load help preferences:', error);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.userPreferences));
    } catch (error) {
      console.error('Failed to save help preferences:', error);
    }
  }, [state.userPreferences]);

  // Generate session ID for analytics
  const sessionId = React.useMemo(() => {
    return `help-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const actions: HelpContextActions = {
    setContext: useCallback((context: string) => {
      dispatch({ type: 'SET_CONTEXT', payload: context });
    }, []),

    showHelp: useCallback((helpId: string) => {
      dispatch({ type: 'SHOW_HELP', payload: helpId });
      dispatch({
        type: 'TRACK_ANALYTICS',
        payload: {
          helpId,
          event: 'shown',
          context: state.currentContext,
          timestamp: new Date(),
          sessionId
        }
      });
    }, [state.currentContext, sessionId]),

    hideHelp: useCallback(() => {
      if (state.activeHelp) {
        dispatch({
          type: 'TRACK_ANALYTICS',
          payload: {
            helpId: state.activeHelp,
            event: 'dismissed',
            context: state.currentContext,
            timestamp: new Date(),
            sessionId
          }
        });
      }
      dispatch({ type: 'HIDE_HELP' });
    }, [state.activeHelp, state.currentContext, sessionId]),

    dismissHelp: useCallback((helpId: string) => {
      dispatch({ type: 'DISMISS_HELP', payload: helpId });
      dispatch({
        type: 'TRACK_ANALYTICS',
        payload: {
          helpId,
          event: 'dismissed',
          context: state.currentContext,
          timestamp: new Date(),
          sessionId
        }
      });
    }, [state.currentContext, sessionId]),

    updatePreferences: useCallback((preferences: Partial<HelpUserPreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    }, []),

    startTour: useCallback((tourId: string) => {
      dispatch({
        type: 'TRACK_ANALYTICS',
        payload: {
          helpId: tourId,
          event: 'shown',
          context: state.currentContext,
          timestamp: new Date(),
          sessionId
        }
      });
    }, [state.currentContext, sessionId]),

    completeTour: useCallback((tourId: string) => {
      dispatch({ type: 'COMPLETE_TOUR', payload: tourId });
      dispatch({
        type: 'TRACK_ANALYTICS',
        payload: {
          helpId: tourId,
          event: 'completed',
          context: state.currentContext,
          timestamp: new Date(),
          sessionId
        }
      });
    }, [state.currentContext, sessionId]),

    skipTour: useCallback((tourId: string) => {
      dispatch({ type: 'COMPLETE_TOUR', payload: tourId });
      dispatch({
        type: 'TRACK_ANALYTICS',
        payload: {
          helpId: tourId,
          event: 'skipped',
          context: state.currentContext,
          timestamp: new Date(),
          sessionId
        }
      });
    }, [state.currentContext, sessionId]),

    setSearchQuery: useCallback((query: string) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    }, []),

    toggleSearch: useCallback(() => {
      dispatch({ type: 'TOGGLE_SEARCH' });
    }, []),

    trackAnalytics: useCallback((analytics: Omit<HelpAnalytics, 'timestamp' | 'sessionId'>) => {
      dispatch({
        type: 'TRACK_ANALYTICS',
        payload: {
          ...analytics,
          timestamp: new Date(),
          sessionId
        }
      });
    }, [sessionId]),

    resetOnboarding: useCallback(() => {
      dispatch({ type: 'RESET_ONBOARDING' });
    }, [])
  };

  const getContextualHelp = useCallback((context: string): HelpContent[] => {
    return helpService.getContentByContext(context).filter(content => {
      // Filter based on user preferences and dismissal status
      if (state.userPreferences.dismissedHelp.includes(content.id)) {
        return false;
      }
      
      if (content.showOnce && state.userPreferences.completedTours.includes(content.id)) {
        return false;
      }

      return true;
    });
  }, [helpService, state.userPreferences]);

  const getAvailableTours = useCallback((context: string): HelpTour[] => {
    return helpService.getTourByContext(context).filter(tour => {
      return !state.userPreferences.completedTours.includes(tour.id);
    });
  }, [helpService, state.userPreferences]);

  const searchHelp = useCallback((query: string): HelpContent[] => {
    return helpService.searchContent(query);
  }, [helpService]);

  const shouldShowHelp = useCallback((helpId: string): boolean => {
    if (!state.isHelpEnabled || !state.userPreferences.showTooltips) {
      return false;
    }

    if (state.userPreferences.dismissedHelp.includes(helpId)) {
      return false;
    }

    const content = helpService.getContentById(helpId);
    if (!content) return false;

    if (content.showOnce && state.userPreferences.completedTours.includes(helpId)) {
      return false;
    }

    return true;
  }, [state.isHelpEnabled, state.userPreferences, helpService]);

  const value: HelpContextValue = {
    ...state,
    actions,
    getContextualHelp,
    getAvailableTours,
    searchHelp,
    shouldShowHelp
  };

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}