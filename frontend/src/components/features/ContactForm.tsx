import React, { useState, useRef } from 'react';
import { Mail, Send, CheckCircle, XCircle, User, Building, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContactFormProps {
  profileId: string;
  isEnabled?: boolean;
  contactName?: string;
  customization?: {
    title?: string;
    buttonText?: string;
    theme?: 'light' | 'dark' | 'auto';
    showCompanyField?: boolean;
    showPhoneField?: boolean;
  };
  onSubmissionSuccess?: (data: ContactSubmission) => void;
  onSubmissionError?: (error: Error) => void;
}

interface ContactSubmission {
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  company?: string;
  subject: string;
  message: string;
}

interface FormErrors {
  [key: string]: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  profileId,
  isEnabled = true,
  contactName = 'the CV owner',
  customization = {},
  onSubmissionSuccess,
  onSubmissionError
}) => {
  const {
    title = 'Get in Touch',
    buttonText = 'Send Message',
    showCompanyField = true,
    showPhoneField = true
  } = customization;

  const [formData, setFormData] = useState<ContactSubmission>({
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    company: '',
    subject: '',
    message: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const subjectOptions = [
    { value: 'job-opportunity', label: 'Job Opportunity' },
    { value: 'freelance-project', label: 'Freelance Project' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'networking', label: 'Networking' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'other', label: 'Other' }
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.senderName.trim()) {
      newErrors.senderName = 'Name is required';
    }

    if (!formData.senderEmail.trim()) {
      newErrors.senderEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      newErrors.senderEmail = 'Please enter a valid email address';
    }

    if (!formData.subject) {
      newErrors.subject = 'Please select a subject';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ContactSubmission, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Reset submission status when form is modified
    if (submissionStatus !== 'idle') {
      setSubmissionStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      const response = await fetch('/submitContactForm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          ...formData
        })
      });

      if (response.ok) {
        setSubmissionStatus('success');
        setFormData({
          senderName: '',
          senderEmail: '',
          senderPhone: '',
          company: '',
          subject: '',
          message: ''
        });
        toast.success('Message sent successfully!');
        onSubmissionSuccess?.(formData);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error. Please try again.';
      setErrorMessage(errorMsg);
      setSubmissionStatus('error');
      toast.error(errorMsg);
      onSubmissionError?.(error instanceof Error ? error : new Error(errorMsg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="contact-form-container bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="contact-form-header text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500 rounded-full">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Interested in connecting with {contactName}? Send a message!
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Name and Email Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="senderName" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              <User className="w-4 h-4" />
              Your Name *
            </label>
            <input
              type="text"
              id="senderName"
              value={formData.senderName}
              onChange={(e) => handleInputChange('senderName', e.target.value)}
              placeholder="Enter your full name"
              className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all ${
                errors.senderName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {errors.senderName && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.senderName}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="senderEmail" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              <Mail className="w-4 h-4" />
              Your Email *
            </label>
            <input
              type="email"
              id="senderEmail"
              value={formData.senderEmail}
              onChange={(e) => handleInputChange('senderEmail', e.target.value)}
              placeholder="your.email@company.com"
              className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all ${
                errors.senderEmail ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {errors.senderEmail && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.senderEmail}</p>
            )}
          </div>
        </div>

        {/* Company and Phone Row */}
        {(showCompanyField || showPhoneField) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showCompanyField && (
              <div className="form-group">
                <label htmlFor="company" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <Building className="w-4 h-4" />
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Your company name"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {showPhoneField && (
              <div className="form-group">
                <label htmlFor="senderPhone" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  id="senderPhone"
                  value={formData.senderPhone}
                  onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>
            )}
          </div>
        )}

        {/* Subject */}
        <div className="form-group">
          <label htmlFor="subject" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            <MessageSquare className="w-4 h-4" />
            Subject *
          </label>
          <select
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all ${
              errors.subject ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            <option value="">Select a subject</option>
            {subjectOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.subject && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>
          )}
        </div>

        {/* Message */}
        <div className="form-group">
          <label htmlFor="message" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            <MessageSquare className="w-4 h-4" />
            Message *
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder={`Tell ${contactName} about your opportunity, project, or how you'd like to connect...`}
            maxLength={1000}
            rows={5}
            className={`w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-y ${
              errors.message ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
            }`}
          />
          <div className="flex justify-between items-center mt-2">
            {errors.message && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.message}</p>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
              {formData.message.length}/1000 characters
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions text-center pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transform hover:-translate-y-1 disabled:translate-y-0 transition-all duration-200 min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {buttonText}
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {submissionStatus === 'success' && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Message sent successfully! {contactName} will get back to you soon.</span>
            </div>
          </div>
        )}

        {submissionStatus === 'error' && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};