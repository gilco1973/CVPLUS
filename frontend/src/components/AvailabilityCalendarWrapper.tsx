import React from 'react';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { useCalendarData } from '../hooks/useCalendarData';
import { Loader2, AlertCircle } from 'lucide-react';

interface AvailabilityCalendarWrapperProps {
  professionalName: string;
  professionalEmail: string;
  jobId?: string;
  className?: string;
}

export const AvailabilityCalendarWrapper: React.FC<AvailabilityCalendarWrapperProps> = ({
  professionalName,
  professionalEmail,
  jobId,
  className = ''
}) => {
  const { data: calendarData, loading, error } = useCalendarData(jobId || '');

  // Loading state
  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white ${className}`}>
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p className="text-blue-100">Loading availability calendar...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white ${className}`}>
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-300" />
          <p className="text-blue-100 mb-2">Unable to load calendar data</p>
          <p className="text-blue-200 text-sm">Using default settings</p>
        </div>
      </div>
    );
  }

  // Use fetched data if available, otherwise use passed props
  const finalProfessionalName = calendarData?.professionalName || professionalName;
  const finalProfessionalEmail = calendarData?.professionalEmail || professionalEmail;

  return (
    <AvailabilityCalendar
      professionalName={finalProfessionalName}
      professionalEmail={finalProfessionalEmail}
      className={className}
    />
  );
};
