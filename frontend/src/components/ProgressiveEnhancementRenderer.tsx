import React, { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AvailabilityCalendarWrapper } from './AvailabilityCalendarWrapper';

interface ProgressiveEnhancementRendererProps {
  htmlContent: string;
  jobId?: string;
  className?: string;
}

export const ProgressiveEnhancementRenderer: React.FC<ProgressiveEnhancementRendererProps> = ({
  htmlContent,
  jobId,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Map<Element, Root>>(new Map());

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return;

    // Clean up any existing roots before setting new content
    rootsRef.current.forEach((root) => {
      root.unmount();
    });
    rootsRef.current.clear();

    // Set the HTML content first
    containerRef.current.innerHTML = htmlContent;

    // Find all availability calendar placeholders and replace them with React components
    // Look for both data-feature attribute and ID-based placeholders
    const placeholders = containerRef.current.querySelectorAll('[data-feature="availability-calendar"], #availability-calendar-placeholder');
    
    placeholders.forEach((placeholder) => {
      const professionalName = placeholder.getAttribute('data-professional-name') || 'Professional';
      const professionalEmail = placeholder.getAttribute('data-professional-email') || 'contact@example.com';
      
      // Create a new container for the React component
      const reactContainer = document.createElement('div');
      placeholder.parentNode?.replaceChild(reactContainer, placeholder);
      
      // Create root and render the AvailabilityCalendar React component
      const root = createRoot(reactContainer);
      rootsRef.current.set(reactContainer, root);
      
      root.render(
        <AvailabilityCalendarWrapper
          professionalName={professionalName}
          professionalEmail={professionalEmail}
          jobId={jobId}
          className="my-8"
        />
      );
    });

    // Cleanup function to unmount React components when content changes
    return () => {
      rootsRef.current.forEach((root) => {
        root.unmount();
      });
      rootsRef.current.clear();
    };
  }, [htmlContent]);

  return (
    <div ref={containerRef} className={className} />
  );
};