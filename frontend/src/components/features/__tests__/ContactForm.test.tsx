import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactForm } from '../ContactForm';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

// Mock Firebase lib
vi.mock('../../../lib/firebase', () => ({
  functions: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockHttpsCallable = httpsCallable as any;
const mockToast = toast as any;

describe('ContactForm', () => {
  const defaultProps = {
    profileId: 'test-profile-id',
    jobId: 'test-job-id',
    contactName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful Firebase function call
    const mockCallableFunction = vi.fn().mockResolvedValue({
      data: { success: true }
    });
    mockHttpsCallable.mockReturnValue(mockCallableFunction);
  });

  it('renders contact form with all required fields', () => {
    render(<ContactForm {...defaultProps} />);

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('shows optional fields when customization allows', () => {
    const propsWithFields = {
      ...defaultProps,
      customization: {
        showCompanyField: true,
        showPhoneField: true,
      },
    };
    
    render(<ContactForm {...propsWithFields} />);

    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('hides optional fields when customization disables them', () => {
    const propsWithoutFields = {
      ...defaultProps,
      customization: {
        showCompanyField: false,
        showPhoneField: false,
      },
    };
    
    render(<ContactForm {...propsWithoutFields} />);

    expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    render(<ContactForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a subject/i)).toBeInTheDocument();
      expect(screen.getByText(/message is required/i)).toBeInTheDocument();
    });

    // Should not call Firebase function if validation fails
    expect(mockHttpsCallable).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    render(<ContactForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/your email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates minimum message length', async () => {
    render(<ContactForm {...defaultProps} />);

    const messageInput = screen.getByLabelText(/message/i);
    fireEvent.change(messageInput, { target: { value: 'short' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/message must be at least 10 characters long/i)).toBeInTheDocument();
    });
  });

  it('updates character count for message field', () => {
    render(<ContactForm {...defaultProps} />);

    const messageInput = screen.getByLabelText(/message/i);
    const testMessage = 'This is a test message';
    
    fireEvent.change(messageInput, { target: { value: testMessage } });

    expect(screen.getByText(`${testMessage.length}/1000 characters`)).toBeInTheDocument();
  });

  it('submits form successfully with valid data', async () => {
    const mockCallableFunction = vi.fn().mockResolvedValue({
      data: { success: true }
    });
    mockHttpsCallable.mockReturnValue(mockCallableFunction);

    const onSubmissionSuccess = vi.fn();
    
    render(
      <ContactForm 
        {...defaultProps} 
        onSubmissionSuccess={onSubmissionSuccess}
      />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'job-opportunity' }
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'This is a test message for the contact form.' }
    });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    // Should call Firebase function with correct data
    await waitFor(() => {
      expect(mockCallableFunction).toHaveBeenCalledWith({
        profileId: 'test-profile-id',
        jobId: 'test-job-id',
        senderName: 'Test User',
        senderEmail: 'test@example.com',
        senderPhone: '',
        company: '',
        subject: 'job-opportunity',
        message: 'This is a test message for the contact form.',
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
      expect(mockToast.success).toHaveBeenCalledWith('Message sent successfully!');
      expect(onSubmissionSuccess).toHaveBeenCalled();
    });

    // Form should be reset
    expect(screen.getByLabelText(/your name/i)).toHaveValue('');
    expect(screen.getByLabelText(/your email/i)).toHaveValue('');
  });

  it('handles Firebase function errors gracefully', async () => {
    const mockError = {
      code: 'functions/permission-denied',
      message: 'Permission denied'
    };
    
    const mockCallableFunction = vi.fn().mockRejectedValue(mockError);
    mockHttpsCallable.mockReturnValue(mockCallableFunction);

    const onSubmissionError = vi.fn();
    
    render(
      <ContactForm 
        {...defaultProps} 
        onSubmissionError={onSubmissionError}
      />
    );

    // Fill in valid form data
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'job-opportunity' }
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'This is a test message for the contact form.' }
    });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalled();
      expect(onSubmissionError).toHaveBeenCalled();
    });

    // Should show retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows retry button for failed submissions (up to 3 attempts)', async () => {
    const mockError = new Error('Network error');
    const mockCallableFunction = vi.fn().mockRejectedValue(mockError);
    mockHttpsCallable.mockReturnValue(mockCallableFunction);
    
    render(<ContactForm {...defaultProps} />);

    // Fill in valid form data
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'job-opportunity' }
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'This is a test message for the contact form.' }
    });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    // First attempt
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
    
    // Retry attempts
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('does not render when isEnabled is false', () => {
    render(<ContactForm {...defaultProps} isEnabled={false} />);
    
    expect(screen.queryByText(/get in touch/i)).not.toBeInTheDocument();
  });

  it('applies custom className prop', () => {
    const { container } = render(
      <ContactForm {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('uses custom title and button text from customization', () => {
    const customization = {
      title: 'Contact Me',
      buttonText: 'Send Now',
    };
    
    render(
      <ContactForm {...defaultProps} customization={customization} />
    );
    
    expect(screen.getByText('Contact Me')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send now/i })).toBeInTheDocument();
  });
});