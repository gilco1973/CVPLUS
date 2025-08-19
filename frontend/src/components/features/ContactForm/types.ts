/**
 * ContactForm Types
 * Type definitions for the Contact Form feature
 */

export interface ContactFormData {
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  company?: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  [key: string]: string;
}

export interface SubjectOption {
  value: string;
  label: string;
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { value: 'job-opportunity', label: 'Job Opportunity' },
  { value: 'freelance-project', label: 'Freelance Project' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'networking', label: 'Networking' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' }
];

export type SubmissionStatus = 'idle' | 'success' | 'error';

export interface ContactFormFieldsProps {
  formData: ContactFormData;
  errors: ContactFormErrors;
  onInputChange: (field: keyof ContactFormData, value: string) => void;
  showCompanyField: boolean;
  showPhoneField: boolean;
  contactName: string;
}

export interface ContactFormHeaderProps {
  title: string;
  contactName: string;
  mode: 'public' | 'private' | 'preview';
}

export interface ContactFormStatusProps {
  status: SubmissionStatus;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  contactName: string;
  onRetry: () => void;
}