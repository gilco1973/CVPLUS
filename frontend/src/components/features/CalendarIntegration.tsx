import { useState } from 'react';
import { Calendar, Download, Check, Loader2, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  type: 'work' | 'education' | 'achievement' | 'certification' | 'reminder';
  recurring?: {
    frequency: 'yearly' | 'monthly';
    interval?: number;
  };
}

interface CalendarIntegrationProps {
  events?: CalendarEvent[];
  profileId?: string;
  jobId?: string;
  data?: {
    contactName?: string;
    totalEvents?: number;
  };
  isEnabled?: boolean;
  customization?: {
    title?: string;
    theme?: string;
    showWorkAnniversaries?: boolean;
    showCertificationReminders?: boolean;
    showEducationMilestones?: boolean;
    providers?: string[];
  };
  className?: string;
  mode?: string;
  onGenerateEvents?: (() => Promise<{
    events: CalendarEvent[];
    summary: {
      totalEvents: number;
      workAnniversaries: number;
      educationMilestones: number;
      certifications: number;
      reminders: number;
    };
  }>) | string;
  onSyncGoogle?: (() => Promise<{ syncUrl: string; instructions: string[] }>) | string;
  onSyncOutlook?: (() => Promise<{ syncUrl: string; instructions: string[] }>) | string;
  onDownloadICal?: (() => Promise<{ downloadUrl: string; instructions: string[] }>) | string;
}

export const CalendarIntegration = ({
  events = [],
  profileId,
  jobId,
  data,
  isEnabled = true,
  customization,
  className,
  mode = 'public',
  onGenerateEvents,
  onSyncGoogle,
  onSyncOutlook,
  onDownloadICal
}: CalendarIntegrationProps) => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<{ 
    totalEvents: number; 
    workAnniversaries: number;
    educationMilestones: number;
    certifications: number;
    reminders: number;
    eventsByType?: Record<string, number>;
  } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook' | 'ical' | null>(null);
  const [syncInstructions, setSyncInstructions] = useState<string[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Create default handlers for CV mode when functions are passed as strings
  const createDefaultHandler = (handlerName: string | (() => Promise<any>) | undefined) => {
    if (typeof handlerName === 'string') {
      return async () => {
        console.log(`📅 Calendar handler "${handlerName}" not yet implemented in CV mode`);
        return {
          events: events,
          summary: {
            totalEvents: events.length,
            workAnniversaries: events.filter(e => e.type === 'work').length,
            educationMilestones: events.filter(e => e.type === 'education').length,
            certifications: events.filter(e => e.type === 'certification').length,
            reminders: events.filter(e => e.type === 'reminder').length
          },
          syncUrl: '#',
          downloadUrl: '#',
          instructions: [
            'Calendar integration is being prepared for your CV',
            'This feature will be fully functional in the live version',
            'Contact the CV owner for more details about their calendar availability'
          ]
        };
      };
    }
    return handlerName;
  };

  const actualGenerateHandler = createDefaultHandler(onGenerateEvents);
  const actualGoogleHandler = createDefaultHandler(onSyncGoogle);
  const actualOutlookHandler = createDefaultHandler(onSyncOutlook);
  const actualICalHandler = createDefaultHandler(onDownloadICal);

  const providers = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.99 4C20 4 20 4 19.99 4H19V2H17V4H7V2H5V4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V6C22 4.9 21.1 4 20 4H19.99ZM20 20H4V9H20V20ZM20 7H4V6H20V7ZM12 11H17V16H12V11Z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      description: 'Sync with your Google account'
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
      ),
      color: 'from-blue-600 to-cyan-600',
      description: 'Sync with Microsoft Outlook'
    },
    {
      id: 'ical',
      name: 'Download .ics File',
      icon: <Download className="w-6 h-6" />,
      color: 'from-gray-600 to-gray-700',
      description: 'Compatible with all calendar apps'
    }
  ];

  const eventTypeConfig = {
    work: { icon: '💼', color: 'text-blue-400' },
    education: { icon: '🎓', color: 'text-purple-400' },
    achievement: { icon: '🏆', color: 'text-yellow-400' },
    certification: { icon: '📜', color: 'text-green-400' },
    reminder: { icon: '🔔', color: 'text-red-400' }
  };

  const handleGenerateEvents = async () => {
    if (!actualGenerateHandler) return;
    
    setLoading({ ...loading, generate: true });
    try {
      const result = await actualGenerateHandler();
      setSummary(result.summary);
      toast.success(`Generated ${result.summary.totalEvents} calendar events!`);
    } catch {
      toast.error('Failed to generate calendar events');
    } finally {
      setLoading({ ...loading, generate: false });
    }
  };

  const handleSync = async (provider: 'google' | 'outlook' | 'ical') => {
    setLoading({ ...loading, [provider]: true });
    setSelectedProvider(provider);
    
    try {
      let result;
      switch (provider) {
        case 'google':
          if (!actualGoogleHandler) throw new Error('Google sync not available');
          result = await actualGoogleHandler();
          break;
        case 'outlook':
          if (!actualOutlookHandler) throw new Error('Outlook sync not available');
          result = await actualOutlookHandler();
          break;
        case 'ical':
          if (!actualICalHandler) throw new Error('iCal download not available');
          result = await actualICalHandler();
          break;
      }
      
      setSyncInstructions(result.instructions);
      
      if ('syncUrl' in result && result.syncUrl && result.syncUrl !== '#') {
        window.open(result.syncUrl, '_blank');
      } else if ('downloadUrl' in result && result.downloadUrl && result.downloadUrl !== '#') {
        window.open(result.downloadUrl, '_blank');
      }
      
      toast.success(`${provider === 'ical' ? 'Calendar file ready for download' : `Syncing with ${provider}`}`);
    } catch (error) {
      toast.error(`Failed to sync with ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading({ ...loading, [provider]: false });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRecurrence = (recurring?: CalendarEvent['recurring']) => {
    if (!recurring) return null;
    const interval = recurring.interval || 1;
    return `Repeats ${recurring.frequency}${interval > 1 ? ` every ${interval} ${recurring.frequency === 'monthly' ? 'months' : 'years'}` : ''}`;
  };

  if (events.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-100 mb-2">
          {customization?.title || 'Sync Your Career Milestones'}
        </h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Transform {data?.contactName ? `${data.contactName}'s` : 'your'} CV into calendar events. Never miss an anniversary, certification renewal, or career milestone.
        </p>
        <div className="space-y-4 max-w-sm mx-auto">
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-blue-400">📅</span>
              <span>Work anniversaries and milestones</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-purple-400">🎓</span>
              <span>Education completion dates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-green-400">📜</span>
              <span>Certification renewal reminders</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-red-400">🔔</span>
              <span>Career review reminders</span>
            </div>
          </div>
          <button
            onClick={handleGenerateEvents}
            disabled={loading.generate}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {loading.generate ? (
              <>
                <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                Generating Events...
              </>
            ) : (
              'Generate Calendar Events'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <motion.div 
          className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-xl p-6 border border-cyan-700/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Calendar Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{summary.totalEvents}</div>
              <div className="text-sm text-gray-400">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{summary.workAnniversaries}</div>
              <div className="text-sm text-gray-400">Work Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{summary.educationMilestones}</div>
              <div className="text-sm text-gray-400">Education</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{summary.certifications}</div>
              <div className="text-sm text-gray-400">Certifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{summary.reminders}</div>
              <div className="text-sm text-gray-400">Reminders</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sync Options */}
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Sync Your Calendar</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <motion.button
              key={provider.id}
              onClick={() => handleSync(provider.id as 'google' | 'outlook' | 'ical')}
              disabled={loading[provider.id]}
              className={`relative p-6 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50 group`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${provider.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`} />
              <div className="relative">
                <div className="flex items-center justify-center mb-3">
                  <div className={`p-3 bg-gradient-to-r ${provider.color} rounded-lg text-white`}>
                    {provider.icon}
                  </div>
                </div>
                <h4 className="font-semibold text-gray-100 mb-1">{provider.name}</h4>
                <p className="text-sm text-gray-400">{provider.description}</p>
                {loading[provider.id] && (
                  <div className="absolute inset-0 bg-gray-800/80 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sync Instructions */}
      {syncInstructions.length > 0 && selectedProvider && (
        <motion.div 
          className="bg-gray-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            {selectedProvider === 'ical' ? 'Download Ready' : 'Sync Instructions'}
          </h4>
          <ul className="space-y-2">
            {syncInstructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-400">
                <span className="text-cyan-400 mt-0.5">{index + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Events Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Upcoming Events</h3>
        <div className="space-y-3">
          {events.slice(0, 10).map((event) => {
            const config = eventTypeConfig[event.type];
            const isExpanded = expandedEvent === event.id;
            
            return (
              <motion.div
                key={event.id}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl mt-0.5">{config.icon}</span>
                    <div className="flex-1">
                      <h4 className={`font-medium ${config.color}`}>{event.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {formatDate(event.startDate)}
                        {event.endDate && ` - ${formatDate(event.endDate)}`}
                      </p>
                      {event.recurring && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRecurrence(event.recurring)}
                        </p>
                      )}
                      {isExpanded && event.description && (
                        <motion.p 
                          className="text-sm text-gray-400 mt-3"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          {event.description}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {events.length > 10 && (
          <p className="text-center text-gray-500 mt-4 text-sm">
            And {events.length - 10} more events...
          </p>
        )}
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg p-6 border border-cyan-700/30">
        <h4 className="font-semibold text-gray-100 mb-3">Pro Tips</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Set up recurring reminders for certification renewals to stay compliant</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Use work anniversaries as opportunities to negotiate salary increases</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Schedule quarterly career reviews to track your professional growth</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Share your calendar with mentors for accountability and guidance</span>
          </li>
        </ul>
      </div>
    </div>
  );
};