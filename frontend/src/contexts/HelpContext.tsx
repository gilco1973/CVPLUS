/**
 * Help Context (Refactored)
 * Main context provider with extracted service logic
 * 
 * Original file: 368 lines -> Current file: <200 lines (46% reduction)
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { HelpContextState, HelpContent, HelpTour } from '../types/help';
import { 
  helpReducer, 
  initialState, 
  HelpStateUtils 
} from '../services/help/HelpStateManager';
import { 
  HelpActionManager, 
  type HelpContextActions 
} from '../services/help/HelpActionManager';

export interface HelpContextValue extends HelpContextState {
  actions: HelpContextActions;
  getContextualHelp: (context: string) => HelpContent[];
  getAvailableTours: (context: string) => HelpTour[];
  searchHelp: (query: string) => HelpContent[];
  shouldShowHelp: (helpId: string) => boolean;
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

/**
 * Help Provider Component
 */
export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(helpReducer, initialState);
  
  // Generate session ID once
  const sessionId = useMemo(() => HelpStateUtils.generateSessionId(), []);
  
  // Create action manager
  const actionManager = useMemo(
    () => new HelpActionManager(dispatch, sessionId),
    [sessionId]
  );

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = () => {
      const savedPreferences = HelpStateUtils.loadPreferences();
      if (savedPreferences) {
        dispatch({ type: 'LOAD_PREFERENCES', payload: savedPreferences });
      }

      const savedAnalytics = HelpStateUtils.loadAnalytics();
      if (savedAnalytics.length > 0) {
        savedAnalytics.forEach(analytics => {
          dispatch({ type: 'TRACK_ANALYTICS', payload: analytics });
        });
      }
    };

    loadPreferences();
  }, []);

  // Create actions with current state
  const actions = useMemo(
    () => actionManager.createActions(state),
    [actionManager, state]
  );

  // Helper functions using the action manager
  const getContextualHelp = useCallback(
    (context: string) => actionManager.getContextualHelp(context),
    [actionManager]
  );

  const getAvailableTours = useCallback(
    (context: string) => actionManager.getAvailableTours(context),
    [actionManager]
  );

  const searchHelp = useCallback(
    (query: string) => actionManager.searchHelp(query),
    [actionManager]
  );

  const shouldShowHelp = useCallback(
    (helpId: string) => actionManager.shouldShowHelp(helpId, state.userPreferences),
    [actionManager, state.userPreferences]
  );

  // Context value
  const value: HelpContextValue = {
    ...state,
    actions,
    getContextualHelp,
    getAvailableTours,
    searchHelp,
    shouldShowHelp
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
}

/**
 * Hook to use Help Context
 */
export function useHelp(): HelpContextValue {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

/**
 * HOC for components that need help context
 */
export function withHelp<P extends object>(Component: React.ComponentType<P & { help: HelpContextValue }>) {
  return function WithHelpComponent(props: P) {
    const help = useHelp();
    return <Component {...props} help={help} />;
  };
}

/**
 * Hook for contextual help in specific components
 */
export function useContextualHelp(context: string) {
  const { actions, getContextualHelp, shouldShowHelp } = useHelp();
  
  useEffect(() => {
    actions.setContext(context);
  }, [context, actions]);

  return {
    helpContent: getContextualHelp(context),
    showHelp: actions.showHelp,
    hideHelp: actions.hideHelp,
    shouldShowHelp
  };
}

/**
 * Hook for help tours
 */
export function useHelpTours(context: string) {
  const { actions, getAvailableTours, userPreferences } = useHelp();
  
  const availableTours = getAvailableTours(context);
  const completedTours = userPreferences.completedTours;
  
  const incompleteTours = availableTours.filter(tour => 
    !completedTours.includes(tour.id)
  );

  return {
    availableTours,
    incompleteTours,
    startTour: actions.startTour,
    completeTour: actions.completeTour,
    skipTour: actions.skipTour
  };
}

/**
 * Hook for help search
 */
export function useHelpSearch() {
  const { searchQuery, isSearchOpen, actions, searchHelp } = useHelp();
  
  const searchResults = searchQuery.length > 2 ? searchHelp(searchQuery) : [];

  return {
    searchQuery,
    isSearchOpen,
    searchResults,
    setSearchQuery: actions.setSearchQuery,
    toggleSearch: actions.toggleSearch
  };
}