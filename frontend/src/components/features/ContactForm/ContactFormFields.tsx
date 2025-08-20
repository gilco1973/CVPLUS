/**
 * Contact Form Fields Component
 * All form input fields for the contact form
 */
import React from 'react';
import { User, Mail, Building, Phone, MessageSquare } from 'lucide-react';
import { ContactFormFieldsProps, SUBJECT_OPTIONS } from './types';

export const ContactFormFields: React.FC<ContactFormFieldsProps> = ({
  formData,
  errors,
  onInputChange,
  showCompanyField,
  showPhoneField,
  contactName
}) => {
  const getInputClassName = (hasError: boolean) => {
    return `w-full px-4 py-3 bg-white dark:bg-slate-700 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all ${
      hasError ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600'
    }`;
  };

  return (
    <>
      {/* Name and Email Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-group">
          <label 
            htmlFor="senderName" 
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
          >
            <User className="w-4 h-4" aria-hidden="true" />
            Your Name *
          </label>
          <input
            type="text"
            id="senderName"
            name="senderName"
            value={formData.senderName}
            onChange={(e) => onInputChange('senderName', e.target.value)}
            placeholder="Enter your full name"
            className={getInputClassName(!!errors.senderName)}
            aria-invalid={!!errors.senderName}
            aria-describedby={errors.senderName ? 'senderName-error' : undefined}
            required
            autoComplete="name"
          />
          {errors.senderName && (
            <p 
              id="senderName-error" 
              className="mt-2 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.senderName}
            </p>
          )}
        </div>

        <div className="form-group">
          <label 
            htmlFor="senderEmail" 
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Your Email *
          </label>
          <input
            type="email"
            id="senderEmail"
            name="senderEmail"
            value={formData.senderEmail}
            onChange={(e) => onInputChange('senderEmail', e.target.value)}
            placeholder="your.email@company.com"
            className={getInputClassName(!!errors.senderEmail)}
            aria-invalid={!!errors.senderEmail}
            aria-describedby={errors.senderEmail ? 'senderEmail-error' : undefined}
            required
            autoComplete="email"
          />
          {errors.senderEmail && (
            <p 
              id="senderEmail-error" 
              className="mt-2 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.senderEmail}
            </p>
          )}
        </div>
      </div>

      {/* Company and Phone Row */}
      {(showCompanyField || showPhoneField) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showCompanyField && (
            <div className="form-group">
              <label 
                htmlFor="company" 
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
              >
                <Building className="w-4 h-4" aria-hidden="true" />
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={(e) => onInputChange('company', e.target.value)}
                placeholder="Your company name"
                className={getInputClassName(!!errors.company)}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? 'company-error' : undefined}
                autoComplete="organization"
              />
              {errors.company && (
                <p 
                  id="company-error" 
                  className="mt-2 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {errors.company}
                </p>
              )}
            </div>
          )}

          {showPhoneField && (
            <div className="form-group">
              <label 
                htmlFor="senderPhone" 
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                Phone
              </label>
              <input
                type="tel"
                id="senderPhone"
                name="senderPhone"
                value={formData.senderPhone || ''}
                onChange={(e) => onInputChange('senderPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={getInputClassName(!!errors.senderPhone)}
                aria-invalid={!!errors.senderPhone}
                aria-describedby={errors.senderPhone ? 'senderPhone-error' : undefined}
                autoComplete="tel"
              />
              {errors.senderPhone && (
                <p 
                  id="senderPhone-error" 
                  className="mt-2 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {errors.senderPhone}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subject */}
      <div className="form-group">
        <label 
          htmlFor="subject" 
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Subject *
        </label>
        <select
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={(e) => onInputChange('subject', e.target.value)}
          className={getInputClassName(!!errors.subject)}
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
          required
        >
          <option value="">Select a subject</option>
          {SUBJECT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.subject && (
          <p 
            id="subject-error" 
            className="mt-2 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {errors.subject}
          </p>
        )}
      </div>

      {/* Message */}
      <div className="form-group">
        <label 
          htmlFor="message" 
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={(e) => onInputChange('message', e.target.value)}
          placeholder={`Tell ${contactName} about your opportunity, project, or how you'd like to connect...`}
          maxLength={1000}
          rows={5}
          className={`resize-y ${getInputClassName(!!errors.message)}`}
          aria-invalid={!!errors.message}
          aria-describedby={`message-help ${errors.message ? 'message-error' : ''}`}
          required
        />
        <div className="flex justify-between items-center mt-2">
          {errors.message ? (
            <p 
              id="message-error" 
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.message}
            </p>
          ) : (
            <div></div>
          )}
          <div 
            id="message-help" 
            className="text-xs text-slate-500 dark:text-slate-400"
            aria-live="polite"
          >
            {formData.message.length}/1000 characters
          </div>
        </div>
      </div>
    </>
  );
};