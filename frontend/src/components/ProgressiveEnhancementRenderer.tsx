import React, { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AvailabilityCalendar } from './AvailabilityCalendar';

interface ProgressiveEnhancementRendererProps {
  htmlContent: string;
  className?: string;
}

export const ProgressiveEnhancementRenderer: React.FC<ProgressiveEnhancementRendererProps> = ({
  htmlContent,
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
    const placeholders = containerRef.current.querySelectorAll('[data-feature="availability-calendar"]');
    
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
        <AvailabilityCalendar
          professionalName={professionalName}
          professionalEmail={professionalEmail}
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