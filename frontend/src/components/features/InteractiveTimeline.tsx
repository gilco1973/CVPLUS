import { useState, useRef, useEffect } from 'react';
import { Calendar, Briefcase, GraduationCap, ChevronLeft, ChevronRight, Maximize2, X, Award, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CVFeatureProps } from '../../types/cv-features';
import { FeatureWrapper } from './Common/FeatureWrapper';
import { LoadingSpinner } from './Common/LoadingSpinner';
import { ErrorBoundary } from './Common/ErrorBoundary';
import { useFeatureData } from '../../hooks/useFeatureData';

// Enhanced timeline data structure
interface EnhancedTimelineData {
  events: TimelineEvent[];
  categories: Array<{
    name: string;
    color: string;
    eventCount: number;
  }>;
  summary?: {
    totalEvents: number;
    yearsSpanned: number;
    mostActiveYear: string;
  };
}

interface TimelineEvent {
  id: string;
  type: 'work' | 'education' | 'achievement' | 'certification';
  title: string;
  organization: string;
  startDate: Date;
  endDate?: Date;
  current?: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
  location?: string;
  logo?: string;
}

interface InteractiveTimelineProps extends CVFeatureProps {
  events?: TimelineEvent[];
  enhancedData?: EnhancedTimelineData | null;
  customization?: {
    title?: string;
    theme?: string;
    viewMode?: 'timeline' | 'calendar' | 'chart';
    showFilters?: boolean;
    showMetrics?: boolean;
    animationType?: string;
  };
  onEventClick?: ((event: TimelineEvent) => void) | string;
}

export const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({
  jobId,
  profileId,
  isEnabled = true,
  data,
  events = [],
  enhancedData,
  customization = {},
  onUpdate,
  onError,
  className = '',
  mode = 'public',
  onEventClick
}) => {
  // Enhanced data fetching
  const {
    data: fetchedTimelineData,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData
  } = useFeatureData<EnhancedTimelineData>({
    jobId,
    featureName: 'career-timeline',
    initialData: enhancedData,
    params: { profileId }
  });

  // Use enhanced data if available
  const timelineData = enhancedData || fetchedTimelineData;
  const timelineEvents = timelineData?.events || events;

  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'chart'>(customization?.viewMode || 'timeline');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'work' | 'education' | 'achievement'>('all');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // Initialize view mode from customization
  useEffect(() => {
    if (customization?.viewMode && customization.viewMode !== viewMode) {
      setViewMode(customization.viewMode);
    }
  }, [customization?.viewMode, viewMode]);

  // Update data when timeline data changes
  useEffect(() => {
    if (timelineData && onUpdate) {
      onUpdate(timelineData);
    }
  }, [timelineData, onUpdate]);

  // Create default handler for CV mode when functions are passed as strings
  const createDefaultHandler = (handlerName: string | ((event: TimelineEvent) => void) | undefined) => {
    if (typeof handlerName === 'string') {
      return (event: TimelineEvent) => {
        console.log(`📊 Timeline event handler "${handlerName}" called with event:`, event.title);
        // In CV mode, we can just set the selected event for display
        setSelectedEvent(event);
      };
    }
    return handlerName;
  };

  const actualEventHandler = createDefaultHandler(onEventClick);

  // Component disabled state
  if (!isEnabled) {
    return null;
  }

  // Sort events by start date, handling null dates
  const sortedEvents = [...timelineEvents].sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.getTime() - b.startDate.getTime();
  });
  
  // Filter events based on selected type
  const filteredEvents = filterType === 'all' 
    ? sortedEvents 
    : sortedEvents.filter(event => event.type === filterType);

  // Calculate timeline range, handling null dates
  const validEvents = timelineEvents.filter(e => e.startDate);
  const startYear = validEvents.length > 0 ? Math.min(...validEvents.map(e => e.startDate.getFullYear())) : new Date().getFullYear();
  const endYear = validEvents.length > 0 ? Math.max(...validEvents.map(e => (e.endDate || new Date()).getFullYear())) : new Date().getFullYear();
  const yearRange = endYear - startYear + 1;

  // Get icon for event type
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'work':
        return <Briefcase className="w-5 h-5" />;
      case 'education':
        return <GraduationCap className="w-5 h-5" />;
      case 'achievement':
      case 'certification':
        return <Award className="w-5 h-5" />;
    }
  };

  // Get color for event type
  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'work':
        return 'from-blue-500 to-cyan-500';
      case 'education':
        return 'from-purple-500 to-pink-500';
      case 'achievement':
        return 'from-green-500 to-emerald-500';
      case 'certification':
        return 'from-yellow-500 to-orange-500';
    }
  };

  // Calculate event position on timeline
  const getEventPosition = (event: TimelineEvent) => {
    const startOffset = (event.startDate.getFullYear() - startYear) / yearRange;
    const duration = event.endDate 
      ? (event.endDate.getFullYear() - event.startDate.getFullYear()) / yearRange
      : event.current 
        ? ((new Date().getFullYear() - event.startDate.getFullYear()) / yearRange)
        : 0.05; // Default width for point events
    
    return {
      left: `${startOffset * 100}%`,
      width: `${Math.max(duration * 100, 5)}%` // Minimum 5% width for visibility
    };
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Calculate duration
  const calculateDuration = (start: Date, end?: Date) => {
    const endDate = end || new Date();
    const months = (endDate.getFullYear() - start.getFullYear()) * 12 + 
                   (endDate.getMonth() - start.getMonth());
    
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 
        ? `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
        : `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  // Component disabled state
  if (!isEnabled) {
    return null;
  }

  // Loading state
  if (dataLoading && !timelineData) {
    return (
      <ErrorBoundary onError={onError}>
        <FeatureWrapper
          className={className}
          mode={mode}
          title="Interactive Timeline"
          description="Loading timeline data..."
          isLoading={true}
        >
          <LoadingSpinner size="large" message="Loading timeline data..." />
        </FeatureWrapper>
      </ErrorBoundary>
    );
  }

  // Error state
  if (dataError && !timelineData) {
    return (
      <ErrorBoundary onError={onError}>
        <FeatureWrapper
          className={className}
          mode={mode}
          title="Interactive Timeline"
          error={dataError}
          onRetry={refreshData}
        >
          <div />
        </FeatureWrapper>
      </ErrorBoundary>
    );
  }

  // No events state
  if (timelineEvents.length === 0) {
    return (
      <ErrorBoundary onError={onError}>
        <FeatureWrapper
          className={className}
          mode={mode}
          title="Interactive Timeline"
          description="No timeline events available"
        >
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Timeline Events
            </h3>
            <p className="text-gray-600 mb-4">
              Add your career events to see them visualized here.
            </p>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh
            </button>
          </div>
        </FeatureWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={onError}>
      <FeatureWrapper
        className={className}
        mode={mode}
        title={customization?.title || "Interactive Timeline"}
        description={`Explore ${timelineEvents.length} career events across ${yearRange} years`}
        isLoading={dataLoading}
        onRetry={refreshData}
      >
        <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'timeline'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Timeline View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'calendar'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'chart'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Chart View
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'all'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('work')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'work'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Work
          </button>
          <button
            onClick={() => setFilterType('education')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'education'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Education
          </button>
          <button
            onClick={() => setFilterType('achievement')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'achievement'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Achievements
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors ml-2"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-gray-800 rounded-xl p-6 overflow-hidden">
          <div 
            ref={timelineRef}
            className="relative"
            style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: 'left' }}
          >
            {/* Year markers */}
            <div className="relative h-20 mb-8">
              <div className="absolute inset-x-0 top-10 h-1 bg-gray-700"></div>
              {Array.from({ length: yearRange }, (_, i) => {
                const year = startYear + i;
                return (
                  <div
                    key={year}
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{ left: `${(i / (yearRange - 1)) * 100}%` }}
                  >
                    <div className="w-0.5 h-12 bg-gray-600"></div>
                    <div className="mt-2 text-xs text-gray-400 whitespace-nowrap">
                      {year}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Events */}
            <div className="relative min-h-[300px]">
              {filteredEvents.map((event, index) => {
                const position = getEventPosition(event);
                const isHovered = hoveredEvent === event.id;
                const row = index % 3; // Distribute events across 3 rows to avoid overlap
                
                return (
                  <motion.div
                    key={event.id}
                    className="absolute cursor-pointer"
                    style={{
                      ...position,
                      top: `${row * 100}px`,
                      minHeight: '80px'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onMouseEnter={() => setHoveredEvent(event.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => {
                      setSelectedEvent(event);
                      actualEventHandler?.(event);
                    }}
                  >
                    <div
                      className={`h-full bg-gradient-to-r ${getEventColor(event.type)} 
                        rounded-lg p-3 transform transition-all duration-300
                        ${isHovered ? 'scale-105 shadow-lg' : ''}
                        ${event.current ? 'border-2 border-white animate-pulse' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-white">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-sm truncate">
                            {event.title}
                          </h4>
                          <p className="text-xs text-white/80 truncate">
                            {event.organization}
                          </p>
                          {event.current && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setSelectedEvent(event);
                  actualEventHandler?.(event);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 bg-gradient-to-r ${getEventColor(event.type)} rounded-lg text-white`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-100">{event.title}</h4>
                    <p className="text-sm text-gray-400">{event.organization}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {formatDate(event.startDate)} - {event.endDate ? formatDate(event.endDate) : 'Present'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {calculateDuration(event.startDate, event.endDate)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Chart View (Gantt-style) */}
      {viewMode === 'chart' && (
        <div className="bg-gray-800 rounded-xl p-6 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Chart Header */}
            <div className="grid grid-cols-12 gap-2 mb-4 text-xs text-gray-400">
              {Array.from({ length: yearRange }, (_, i) => (
                <div key={i} className="text-center">
                  {startYear + i}
                </div>
              ))}
            </div>

            {/* Chart Rows */}
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const startOffset = (event.startDate.getFullYear() - startYear) * 12 + event.startDate.getMonth();
                const endOffset = event.endDate 
                  ? (event.endDate.getFullYear() - startYear) * 12 + event.endDate.getMonth()
                  : event.current
                    ? (new Date().getFullYear() - startYear) * 12 + new Date().getMonth()
                    : startOffset + 1;
                
                const totalMonths = yearRange * 12;
                const widthPercentage = ((endOffset - startOffset) / totalMonths) * 100;
                const leftPercentage = (startOffset / totalMonths) * 100;

                return (
                  <div key={event.id} className="relative h-12">
                    <div className="absolute inset-y-0 left-0 w-40 pr-4 flex items-center justify-end">
                      <span className="text-sm text-gray-300 truncate">{event.title}</span>
                    </div>
                    <div className="ml-40 relative h-full">
                      <div
                        className={`absolute h-8 top-2 bg-gradient-to-r ${getEventColor(event.type)} 
                          rounded cursor-pointer hover:shadow-lg transition-all`}
                        style={{
                          left: `${leftPercentage}%`,
                          width: `${widthPercentage}%`,
                          minWidth: '20px'
                        }}
                        onClick={() => {
                          setSelectedEvent(event);
                          actualEventHandler?.(event);
                        }}
                      >
                        <div className="flex items-center h-full px-2">
                          <span className="text-xs text-white truncate">
                            {event.organization}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 bg-gradient-to-r ${getEventColor(selectedEvent.type)} rounded-lg text-white`}>
                    {getEventIcon(selectedEvent.type)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-100">{selectedEvent.title}</h3>
                    <p className="text-gray-400">{selectedEvent.organization}</p>
                    {selectedEvent.location && (
                      <p className="text-sm text-gray-500">{selectedEvent.location}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(selectedEvent.startDate)} - {
                        selectedEvent.current ? 'Present' : 
                        selectedEvent.endDate ? formatDate(selectedEvent.endDate) : 
                        formatDate(selectedEvent.startDate)
                      }
                    </span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <span>{calculateDuration(selectedEvent.startDate, selectedEvent.endDate)}</span>
                </div>

                {selectedEvent.description && (
                  <div>
                    <h4 className="font-medium text-gray-200 mb-2">Description</h4>
                    <p className="text-gray-400">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.achievements && selectedEvent.achievements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-200 mb-2">Key Achievements</h4>
                    <ul className="space-y-1">
                      {selectedEvent.achievements.map((achievement, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-400">
                          <span className="text-cyan-500 mt-1">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedEvent.skills && selectedEvent.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-200 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.skills.map((skill, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

          {/* Timeline Summary */}
          {timelineData?.summary && (
            <div className="bg-gray-800 rounded-xl p-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-100 mb-4">Timeline Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{timelineData.summary.totalEvents}</div>
                  <div className="text-sm text-gray-400">Total Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{timelineData.summary.yearsSpanned}</div>
                  <div className="text-sm text-gray-400">Years Spanned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{timelineData.summary.mostActiveYear}</div>
                  <div className="text-sm text-gray-400">Most Active Year</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </FeatureWrapper>
    </ErrorBoundary>
  );
};