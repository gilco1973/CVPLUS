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
import { AIPodcastPlayer } from '../components/features/AI-Powered/AIPodcastPlayer';
import { VideoIntroduction } from '../components/features/VideoIntroduction';
import { PortfolioGallery } from '../components/features/PortfolioGallery';
import { TestimonialsCarousel } from '../components/features/TestimonialsCarousel';
import { CertificationBadges } from '../components/features/CertificationBadges';
import { PersonalityInsights } from '../components/features/PersonalityInsights';
import { CVFeatureProps, ComponentRegistry } from '../types/cv-features';

// Component registry for available components - properly typed
const COMPONENT_REGISTRY: ComponentRegistry = {
  ContactForm: ContactForm,
  SocialMediaLinks: SocialMediaLinks,
  DynamicQRCode: DynamicQRCode,
  SkillsVisualization: SkillsVisualization,
  CalendarIntegration: CalendarIntegration,
  InteractiveTimeline: InteractiveTimeline,
  AchievementCards: AchievementCards,
  AIPodcastPlayer: AIPodcastPlayer,
  VideoIntroduction: VideoIntroduction,
  PortfolioGallery: PortfolioGallery,
  TestimonialsCarousel: TestimonialsCarousel,
  CertificationBadges: CertificationBadges,
  PersonalityInsights: PersonalityInsights
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
  console.log(`🔄 Attempting to render component: ${componentName}`);
  console.log('🔍 Available components in registry:', Object.keys(COMPONENT_REGISTRY));
  console.log('🎯 Props for component:', props);
  
  const Component = COMPONENT_REGISTRY[componentName];
  
  if (!Component) {
    console.error(`❌ Component "${componentName}" not found in registry`);
    console.error('🔍 Registry contains:', Object.keys(COMPONENT_REGISTRY));
    return;
  }
  
  console.log(`✅ Found component in registry:`, Component);
  
  try {
    // Clear the placeholder content
    container.innerHTML = '';
    console.log(`🧹 Cleared container content for ${componentName}`);
    
    // Create React element and render using React 18+ createRoot
    const element = React.createElement(Component, props);
    console.log(`⚛️ Created React element for ${componentName}:`, element);
    
    const root = createRoot(container);
    console.log(`🌱 Created root for ${componentName}`);
    
    root.render(element);
    console.log(`🎉 Successfully rendered ${componentName} component`);
  } catch (error) {
    console.error(`❌ Failed to render ${componentName} component:`, error);
    console.error('📍 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Show error message in container
    container.innerHTML = `
      <div class="component-error">
        <p>Failed to load ${componentName} component</p>
        <p class="error-details">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <details>
          <summary>Error Details</summary>
          <pre>${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
        </details>
      </div>
    `;
  }
}

/**
 * Initialize all React component placeholders on the page
 */
export function initializeReactComponents(): void {
  console.log('🚀 Starting React component initialization...');
  const placeholders = document.querySelectorAll('.react-component-placeholder');
  
  console.log(`🔄 Found ${placeholders.length} React component placeholders`);
  
  if (placeholders.length === 0) {
    console.log('🔍 No React component placeholders found, looking for other patterns...');
    // Check for contact form patterns specifically
    const contactFormElements = document.querySelectorAll('[data-contact-form], .contact-form-container');
    console.log(`📞 Found ${contactFormElements.length} contact form elements`);
    // Also check for any QR code specific elements
    const qrElements = document.querySelectorAll('[data-component="DynamicQRCode"], .qr-code-feature');
    console.log(`📱 Found ${qrElements.length} QR code elements`);
    return;
  }
  
  placeholders.forEach((placeholder, index) => {
    console.log(`\n🔎 Processing placeholder ${index + 1}/${placeholders.length}`);
    console.log('🗺 Placeholder element:', placeholder);
    
    const componentName = placeholder.getAttribute('data-component') as ComponentName;
    const propsJson = placeholder.getAttribute('data-props');
    
    console.log(`🏷️ Component name from data-component: "${componentName}"`);
    console.log(`📝 Props JSON: ${propsJson ? propsJson.substring(0, 100) + '...' : 'null'}`);
    
    if (!componentName) {
      console.warn(`⚠️ Placeholder ${index + 1} missing data-component attribute`);
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
    
    // Add debug logging for AIPodcastPlayer specifically
    if (componentName === 'AIPodcastPlayer') {
      console.log('🎙️ Initializing AIPodcastPlayer component with props:', props);
      
      // Ensure the podcast component has proper configuration
      props = {
        ...props,
        isEnabled: props.isEnabled !== false, // Default to true
      };
    }
    
    // Add debug logging for DynamicQRCode specifically
    if (componentName === 'DynamicQRCode') {
      console.log('📱 Initializing DynamicQRCode component with props:', props);
      console.log('📱 QRCode Component from registry:', COMPONENT_REGISTRY[componentName]);
      
      // Ensure the QR code component has proper configuration
      props = {
        ...props,
        isEnabled: props.isEnabled !== false, // Default to true
      };
    }
    
    // Add debug logging for other key components
    if (['VideoIntroduction', 'PortfolioGallery', 'TestimonialsCarousel', 'CertificationBadges', 'PersonalityInsights'].includes(componentName)) {
      console.log(`🎯 Initializing ${componentName} component with props:`, props);
      
      // Ensure all components have proper configuration
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