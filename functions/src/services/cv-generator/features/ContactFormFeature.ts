import { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

/**
 * Contact Form Feature - Generates interactive contact form for CV
 */
export class ContactFormFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const formId = `contact-form-${jobId}`;
    const profileUrl = `${process.env.FUNCTIONS_EMULATOR ? 'http://localhost:5000' : 'https://us-central1-getmycv-ai.cloudfunctions.net'}/submitContactForm`;
    
    // Extract contact person name from CV
    const contactName = cv.personalInfo?.name || 'the CV owner';
    
    return `
      <div class="contact-form-container" id="${formId}">
        <div class="contact-form-header">
          <h3>Get in Touch</h3>
          <p>Interested in connecting with ${contactName}? Send a message!</p>
        </div>
        
        <form class="contact-form" data-job-id="${jobId}">
          <div class="form-row">
            <div class="form-group">
              <label for="sender-name">Your Name *</label>
              <input 
                type="text" 
                id="sender-name" 
                name="senderName" 
                required 
                placeholder="Enter your full name"
              />
            </div>
            <div class="form-group">
              <label for="sender-email">Your Email *</label>
              <input 
                type="email" 
                id="sender-email" 
                name="senderEmail" 
                required 
                placeholder="your.email@company.com"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="sender-company">Company</label>
              <input 
                type="text" 
                id="sender-company" 
                name="senderCompany" 
                placeholder="Your company name"
              />
            </div>
            <div class="form-group">
              <label for="sender-phone">Phone</label>
              <input 
                type="tel" 
                id="sender-phone" 
                name="senderPhone" 
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="message-subject">Subject *</label>
            <select id="message-subject" name="subject" required>
              <option value="">Select a subject</option>
              <option value="job-opportunity">Job Opportunity</option>
              <option value="freelance-project">Freelance Project</option>
              <option value="collaboration">Collaboration</option>
              <option value="networking">Networking</option>
              <option value="consultation">Consultation</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="message-content">Message *</label>
            <textarea 
              id="message-content" 
              name="message" 
              required 
              placeholder="Tell ${contactName} about your opportunity, project, or how you'd like to connect..."
              maxlength="1000"
            ></textarea>
            <div class="character-count">
              <span class="current">0</span>/<span class="max">1000</span> characters
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="submit-btn">
              <span class="btn-text">Send Message</span>
              <span class="btn-loading" style="display: none;">
                <svg class="spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32">
                    <animate attributeName="stroke-dashoffset" dur="1s" repeatCount="indefinite" values="32;0;32"/>
                  </circle>
                </svg>
                Sending...
              </span>
            </button>
          </div>
          
          <div class="form-status" style="display: none;">
            <div class="status-success" style="display: none;">
              <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>Message sent successfully! ${contactName} will get back to you soon.</span>
            </div>
            <div class="status-error" style="display: none;">
              <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span class="error-message">Failed to send message. Please try again.</span>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  getStyles(): string {
    return `
      .contact-form-container {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        margin: 2rem 0;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .contact-form-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .contact-form-header h3 {
        color: #1e293b;
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .contact-form-header p {
        color: #64748b;
        font-size: 1rem;
        margin: 0;
      }
      
      .contact-form {
        max-width: 600px;
        margin: 0 auto;
      }
      
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
      }
      
      .form-group label {
        color: #374151;
        font-weight: 600;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.75rem;
        font-size: 1rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #06b6d4;
        box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
      }
      
      .form-group textarea {
        resize: vertical;
        min-height: 120px;
        font-family: inherit;
      }
      
      .character-count {
        text-align: right;
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.25rem;
      }
      
      .form-actions {
        text-align: center;
        margin-top: 2rem;
      }
      
      .submit-btn {
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.875rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
        min-width: 160px;
      }
      
      .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px -4px rgba(6, 182, 212, 0.4);
      }
      
      .submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }
      
      .btn-loading {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .spinner {
        width: 16px;
        height: 16px;
      }
      
      .form-status {
        margin-top: 1rem;
        text-align: center;
      }
      
      .status-success,
      .status-error {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        border-radius: 8px;
        font-weight: 500;
      }
      
      .status-success {
        background: #dcfdf7;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      
      .status-error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      
      .status-icon {
        width: 20px;
        height: 20px;
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .contact-form-container {
          padding: 1.5rem;
          margin: 1rem 0;
        }
        
        .form-row {
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        
        .contact-form-header h3 {
          font-size: 1.5rem;
        }
        
        .submit-btn {
          width: 100%;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .contact-form-container {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .contact-form-header h3 {
          color: #f1f5f9;
        }
        
        .contact-form-header p {
          color: #cbd5e1;
        }
        
        .form-group label {
          color: #e2e8f0;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #9ca3af;
        }
        
        .character-count {
          color: #6b7280;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize contact form functionality
        function initContactForm() {
          const forms = document.querySelectorAll('.contact-form');
          
          forms.forEach(form => {
            const submitBtn = form.querySelector('.submit-btn');
            const btnText = form.querySelector('.btn-text');
            const btnLoading = form.querySelector('.btn-loading');
            const statusEl = form.querySelector('.form-status');
            const successEl = form.querySelector('.status-success');
            const errorEl = form.querySelector('.status-error');
            const errorMsg = form.querySelector('.error-message');
            const textarea = form.querySelector('textarea[name="message"]');
            const charCount = form.querySelector('.character-count .current');
            
            // Character counter
            if (textarea && charCount) {
              textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
              });
            }
            
            // Form validation
            function validateForm(formData) {
              const errors = [];
              
              if (!formData.get('senderName')?.trim()) {
                errors.push('Name is required');
              }
              
              const email = formData.get('senderEmail')?.trim();
              if (!email) {
                errors.push('Email is required');
              } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push('Please enter a valid email address');
              }
              
              if (!formData.get('subject')) {
                errors.push('Please select a subject');
              }
              
              const message = formData.get('message')?.trim();
              if (!message) {
                errors.push('Message is required');
              } else if (message.length < 10) {
                errors.push('Message must be at least 10 characters long');
              }
              
              return errors;
            }
            
            // Form submission
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const formData = new FormData(form);
              const jobId = form.dataset.jobId;
              
              // Validate form
              const errors = validateForm(formData);
              if (errors.length > 0) {
                showError(errors.join('. '));
                return;
              }
              
              // Show loading state
              submitBtn.disabled = true;
              btnText.style.display = 'none';
              btnLoading.style.display = 'flex';
              statusEl.style.display = 'none';
              
              try {
                // Submit to Firebase Function
                const response = await fetch('/submitContactForm', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    profileId: jobId,
                    senderName: formData.get('senderName'),
                    senderEmail: formData.get('senderEmail'),
                    senderPhone: formData.get('senderPhone') || undefined,
                    company: formData.get('senderCompany') || undefined,
                    subject: formData.get('subject'),
                    message: formData.get('message')
                  })
                });
                
                if (response.ok) {
                  showSuccess();
                  form.reset();
                  if (charCount) charCount.textContent = '0';
                } else {
                  const error = await response.json();
                  showError(error.message || 'Failed to send message. Please try again.');
                }
              } catch (error) {
                console.error('Contact form error:', error);
                showError('Network error. Please check your connection and try again.');
              } finally {
                // Reset button state
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
              }
            });
            
            function showSuccess() {
              statusEl.style.display = 'block';
              successEl.style.display = 'flex';
              errorEl.style.display = 'none';
            }
            
            function showError(message) {
              statusEl.style.display = 'block';
              successEl.style.display = 'none';
              errorEl.style.display = 'flex';
              errorMsg.textContent = message;
            }
          });
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initContactForm);
        } else {
          initContactForm();
        }
      })();
    `;
  }
}