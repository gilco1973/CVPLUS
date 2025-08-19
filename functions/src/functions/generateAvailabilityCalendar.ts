import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { simpleCorsOptions } from '../config/cors';

export const generateAvailabilityCalendar = onCall(
  {
    timeoutSeconds: 60,
    ...simpleCorsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;

    try {
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.status': 'processing',
          'enhancedFeatures.availability-calendar.progress': 25,
          'enhancedFeatures.availability-calendar.currentStep': 'Setting up availability calendar...',
          'enhancedFeatures.availability-calendar.startedAt': FieldValue.serverTimestamp()
        });

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.progress': 50,
          'enhancedFeatures.availability-calendar.currentStep': 'Generating calendar interface...'
        });

      // Generate availability calendar HTML
      const availabilityCalendarHtml = generateAvailabilityCalendarHtml(jobData.parsedData);

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.progress': 75,
          'enhancedFeatures.availability-calendar.currentStep': 'Integrating calendar widget...'
        });

      // Store the HTML fragment
      const fragmentRef = admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .collection('htmlFragments')
        .doc('availability-calendar');

      await fragmentRef.set({
        featureId: 'availability-calendar',
        html: availabilityCalendarHtml,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update final status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.status': 'completed',
          'enhancedFeatures.availability-calendar.progress': 100,
          'enhancedFeatures.availability-calendar.currentStep': 'availability-calendar enhancement complete',
          'enhancedFeatures.availability-calendar.completedAt': FieldValue.serverTimestamp(),
          'enhancedFeatures.availability-calendar.result': {
            success: true,
            htmlFragmentId: 'availability-calendar',
            message: 'Availability calendar integration completed successfully'
          }
        });

      return {
        success: true,
        htmlFragment: availabilityCalendarHtml,
        message: 'Availability calendar generated successfully'
      };

    } catch (error) {
      console.error('Error generating availability calendar:', error);
      
      // Update error status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.status': 'failed',
          'enhancedFeatures.availability-calendar.currentStep': 'Failed to generate availability calendar',
          'enhancedFeatures.availability-calendar.error': error instanceof Error ? error.message : 'Unknown error',
          'enhancedFeatures.availability-calendar.failedAt': FieldValue.serverTimestamp()
        });

      throw new Error(`Failed to generate availability calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

function generateAvailabilityCalendarHtml(cvData: any): string {
  const contactInfo = cvData.contactInformation || {};
  const name = cvData.personalInformation?.name || 'Professional';
  
  return `
    <div class="availability-calendar-section" id="availability-calendar">
      <div class="section-header">
        <h2 class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Schedule a Meeting
        </h2>
        <p class="section-subtitle">Book time with ${name} for collaboration opportunities</p>
      </div>
      
      <div class="calendar-widget">
        <div class="calendar-integration">
          <div class="booking-options">
            <div class="booking-option">
              <h3>Quick Chat</h3>
              <p>15-minute informal discussion</p>
              <button class="book-btn" data-duration="15">Book 15 min</button>
            </div>
            <div class="booking-option">
              <h3>Project Discussion</h3>
              <p>30-minute focused meeting</p>
              <button class="book-btn" data-duration="30">Book 30 min</button>
            </div>
            <div class="booking-option">
              <h3>Consultation</h3>
              <p>60-minute comprehensive session</p>
              <button class="book-btn" data-duration="60">Book 1 hour</button>
            </div>
          </div>
          
          <div class="availability-notice">
            <p><strong>Available:</strong> Monday-Friday, 9 AM - 6 PM (Local Time)</p>
            <p><strong>Response Time:</strong> Within 24 hours</p>
          </div>
        </div>
      </div>
    </div>

    <style>
      .availability-calendar-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 2rem;
        margin: 2rem 0;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      
      .section-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .section-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .section-icon {
        width: 28px;
        height: 28px;
      }
      
      .section-subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        margin: 0;
      }
      
      .booking-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .booking-option {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .booking-option:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      
      .booking-option h3 {
        font-size: 1.3rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
      }
      
      .booking-option p {
        opacity: 0.8;
        margin: 0 0 1rem 0;
        font-size: 0.95rem;
      }
      
      .book-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.95rem;
      }
      
      .book-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .availability-notice {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
        font-size: 0.9rem;
      }
      
      .availability-notice p {
        margin: 0.25rem 0;
      }
      
      @media (max-width: 768px) {
        .availability-calendar-section {
          padding: 1.5rem;
          margin: 1.5rem 0;
        }
        
        .booking-options {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        .section-title {
          font-size: 1.5rem;
        }
      }
    </style>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const bookButtons = document.querySelectorAll('.book-btn');
        
        bookButtons.forEach(button => {
          button.addEventListener('click', function() {
            const duration = this.getAttribute('data-duration');
            const contactEmail = '${contactInfo.email || 'contact@example.com'}';
            const subject = \`Meeting Request - \${duration} minutes\`;
            const body = \`Hello ${name},

I would like to schedule a \${duration}-minute meeting with you.

Please let me know your availability.

Best regards\`;
            
            const mailtoLink = \`mailto:\${contactEmail}?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
            window.open(mailtoLink);
          });
        });
      });
    </script>
  `;
}