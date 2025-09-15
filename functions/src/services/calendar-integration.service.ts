/**
 * Stub Calendar Integration Service
 * Temporary stub for deployment
 */

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  attendees?: string[];
}

export class CalendarIntegrationService {
  static async createEvent(event: CalendarEvent): Promise<{ success: boolean; eventId?: string }> {
    console.warn('⚠️ Using stub calendar service');
    return {
      success: true,
      eventId: `event_${Date.now()}`
    };
  }

  static async getAvailability(date: Date): Promise<{ available: boolean; slots: Date[] }> {
    console.warn('⚠️ Using stub calendar availability');
    return {
      available: true,
      slots: [new Date()]
    };
  }
}

export default CalendarIntegrationService;