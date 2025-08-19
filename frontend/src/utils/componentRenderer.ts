/**
 * Component Renderer Utility
 * Handles rendering React components from CV generation system placeholders
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContactForm } from '../components/features/ContactForm';
import { SocialMediaLinks } from '../components/features/Interactive/SocialMediaLinks';
import { DynamicQRCode } from '../components/features/Interactive/DynamicQRCode';

// Component registry for available components
const COMPONENT_REGISTRY = {
  ContactForm: ContactForm,
  SocialMediaLinks: SocialMediaLinks,
  DynamicQRCode: DynamicQRCode
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