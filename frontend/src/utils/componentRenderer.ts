/**
 * Component Renderer Utility
 * Handles rendering React components from CV generation system placeholders
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContactForm } from '../components/features/ContactForm';
import { SocialMediaLinks } from '../components/features/SocialMediaLinks';
import { DynamicQRCode } from '../components/features/Interactive/DynamicQRCode';
import { SkillsVisualization } from '../components/features/Visual/SkillsVisualization';
import { CalendarIntegration } from '../components/features/CalendarIntegration';
import { InteractiveTimeline } from '../components/features/InteractiveTimeline';
import { AchievementCards } from '../components/features/Visual/AchievementCards';
import { CVFeatureProps, ComponentRegistry } from '../types/cv-features';

// Component registry for available components - properly typed
const COMPONENT_REGISTRY: ComponentRegistry = {
  ContactForm: ContactForm,
  SocialMediaLinks: SocialMediaLinks,
  DynamicQRCode: DynamicQRCode,
  SkillsVisualization: SkillsVisualization,
  CalendarIntegration: CalendarIntegration,
  InteractiveTimeline: InteractiveTimeline,
  AchievementCards: AchievementCards
} as const;

type ComponentName = keyof typeof COMPONENT_REGISTRY;

/**
 * Render a React component into a DOM element
 * @param componentName - Name of the component to render
 * @param props - Props to pass to the component
 * @param container - DOM element to render into
 */
export function renderReactComponent(
  componentName: ComponentName,
  props: any,
  container: Element
): void {
  const Component = COMPONENT_REGISTRY[componentName];
  
  if (!Component) {
    console.error(`Component "${componentName}" not found in registry`);
    return;
  }
  
  try {
    // Clear the placeholder content
    container.innerHTML = '';
    
    // Create React element and render using React 18+ createRoot
    const element = React.createElement(Component, props);
    const root = createRoot(container);
    root.render(element);
    
    console.log(`✅ Successfully rendered ${componentName} component`);
  } catch (error) {
    console.error(`❌ Failed to render ${componentName} component:`, error);
    
    // Show error message in container
    container.innerHTML = `
      <div class="component-error">
        <p>Failed to load ${componentName} component</p>
        <p class="error-details">${error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    `;
  }
}

/**
 * Initialize all React component placeholders on the page
 */
export function initializeReactComponents(): void {
  const placeholders = document.querySelectorAll('.react-component-placeholder');
  
  console.log(`🔄 Found ${placeholders.length} React component placeholders`);
  
  if (placeholders.length === 0) {
    console.log('🔍 No React component placeholders found, looking for other patterns...');
    // Check for contact form patterns specifically
    const contactFormElements = document.querySelectorAll('[data-contact-form], .contact-form-container');
    console.log(`📞 Found ${contactFormElements.length} contact form elements`);
  }
  
  placeholders.forEach((placeholder, index) => {
    const componentName = placeholder.getAttribute('data-component') as ComponentName;
    const propsJson = placeholder.getAttribute('data-props');
    
    if (!componentName) {
      console.warn(`Placeholder ${index + 1} missing data-component attribute`);
      return;
    }
    
    let props = {};
    if (propsJson) {
      try {
        props = JSON.parse(propsJson);
      } catch (error) {
        console.error(`Failed to parse props for ${componentName}:`, error);
        return;
      }
    }
    
    // Add debug logging for ContactForm specifically
    if (componentName === 'ContactForm') {
      console.log('📞 Initializing ContactForm component with props:', props);
      
      // Ensure the component doesn't start in an infinite loading state
      props = {
        ...props,
        isEnabled: props.isEnabled !== false, // Default to true
      };
    }
    
    // Add debug logging for CalendarIntegration specifically
    if (componentName === 'CalendarIntegration') {
      console.log('🗓️ Initializing CalendarIntegration component with props:', props);
      
      // Ensure the calendar component has proper event handlers
      props = {
        ...props,
        isEnabled: props.isEnabled !== false, // Default to true
      };
    }
    
    // Add debug logging for InteractiveTimeline specifically
    if (componentName === 'InteractiveTimeline') {
      console.log('📊 Initializing InteractiveTimeline component with props:', props);
      
      // Ensure the timeline component has proper configuration
      props = {
        ...props,
        isEnabled: props.isEnabled !== false, // Default to true
      };
    }
    
    // Add debug logging for AchievementCards specifically
    if (componentName === 'AchievementCards') {
      console.log('🏆 Initializing AchievementCards component with props:', props);
      
      // Ensure the achievements component has proper configuration
      props = {
        ...props,
        isEnabled: props.isEnabled !== false, // Default to true
      };
    }
    
    renderReactComponent(componentName, props, placeholder);
  });
}

/**
 * Make component renderer available globally for CV generation system
 */
if (typeof window !== 'undefined') {
  (window as any).renderReactComponent = renderReactComponent;
  (window as any).initializeReactComponents = initializeReactComponents;
  
  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReactComponents);
  } else {
    // If document is already loaded, initialize immediately
    setTimeout(initializeReactComponents, 0);
  }
}

export default {
  renderReactComponent,
  initializeReactComponents,
  COMPONENT_REGISTRY
};