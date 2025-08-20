/**
 * Component Renderer Fix
 * Final comprehensive solution for React component rendering in generated CVs
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

// Import all available components
import { ContactForm } from '../components/features/ContactForm';
import { SocialMediaLinks } from '../components/features/SocialMediaLinks';
import { DynamicQRCode } from '../components/features/Interactive/DynamicQRCode';
import { SkillsVisualization } from '../components/features/Visual/SkillsVisualization';

// Component registry with proper types
const COMPONENT_REGISTRY = {
  ContactForm,
  SocialMediaLinks,
  DynamicQRCode,
  SkillsVisualization
} as const;

type ComponentName = keyof typeof COMPONENT_REGISTRY;

/**
 * Enhanced component renderer with comprehensive error handling and debugging
 */
class ComponentRenderer {
  private rendered: Set<string> = new Set();
  private retryCount: Map<string, number> = new Map();
  private maxRetries = 3;

  /**
   * Render a React component into a DOM element
   */
  renderComponent(
    componentName: ComponentName,
    props: any,
    container: Element,
    elementId?: string
  ): boolean {
    const Component = COMPONENT_REGISTRY[componentName];
    
    if (!Component) {
      console.error(`❌ Component "${componentName}" not found in registry`);
      this.showError(container, `Component "${componentName}" not available`);
      return false;
    }

    try {
      // Clear existing content
      container.innerHTML = '';
      
      // Mark container as being rendered
      const containerId = elementId || container.id || `render-${Date.now()}`;
      
      // Create React element
      const element = React.createElement(Component, props);
      
      // Create root and render
      const root = createRoot(container);
      root.render(element);
      
      // Mark as successfully rendered
      this.rendered.add(containerId);
      
      console.log(`✅ Successfully rendered ${componentName} component (ID: ${containerId})`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to render ${componentName}:`, error);
      
      const containerId = elementId || container.id || 'unknown';
      const currentRetries = this.retryCount.get(containerId) || 0;
      
      if (currentRetries < this.maxRetries) {
        // Retry rendering
        this.retryCount.set(containerId, currentRetries + 1);
        console.log(`🔄 Retrying ${componentName} render (attempt ${currentRetries + 1}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.renderComponent(componentName, props, container, elementId);
        }, 1000 * (currentRetries + 1)); // Increasing delay
        
      } else {
        // Show error after max retries
        this.showError(container, `Failed to load ${componentName} after ${this.maxRetries} attempts`, error);
      }
      
      return false;
    }
  }

  /**
   * Initialize all React components on the page or within a container
   */
  initializeComponents(container?: Element): number {
    const searchScope = container || document;
    const placeholders = searchScope.querySelectorAll('.react-component-placeholder');
    
    console.log(`🔍 Found ${placeholders.length} React component placeholders${container ? ' in container' : ''}`);
    
    let successCount = 0;
    
    placeholders.forEach((placeholder, index) => {
      const componentName = placeholder.getAttribute('data-component') as ComponentName;
      const propsJson = placeholder.getAttribute('data-props');
      const elementId = placeholder.id || `placeholder-${index}`;
      
      if (!componentName) {
        console.warn(`⚠️ Placeholder ${index + 1} missing data-component attribute`);
        return;
      }
      
      if (!COMPONENT_REGISTRY[componentName]) {
        console.error(`❌ Unknown component: ${componentName}`);
        this.showError(placeholder, `Unknown component: ${componentName}`);
        return;
      }
      
      // Parse props
      let props = {};
      if (propsJson) {
        try {
          props = JSON.parse(propsJson);
        } catch (error) {
          console.error(`❌ Failed to parse props for ${componentName}:`, error);
          this.showError(placeholder, `Invalid props for ${componentName}`);
          return;
        }
      }
      
      console.log(`🎯 Rendering ${componentName} (${index + 1}/${placeholders.length})`);
      
      const success = this.renderComponent(componentName, props, placeholder, elementId);
      if (success) successCount++;
    });
    
    console.log(`✅ Successfully initialized ${successCount}/${placeholders.length} components`);
    return successCount;
  }

  /**
   * Show error message in container
   */
  private showError(container: Element, message: string, error?: any): void {
    container.innerHTML = `
      <div style="
        padding: 1rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <p style="margin: 0 0 0.5rem 0; font-weight: 600;">⚠️ ${message}</p>
        ${error ? `<details style="margin-top: 0.5rem; font-size: 0.8em;">
          <summary style="cursor: pointer;">Error details</summary>
          <p style="margin: 0.5rem 0 0 0; font-family: monospace; background: #f9fafb; padding: 0.5rem; border-radius: 4px;">
            ${error.message || error.toString()}
          </p>
        </details>` : ''}
      </div>
    `;
  }

  /**
   * Get rendering statistics
   */
  getStats(): { rendered: number; retries: number } {
    return {
      rendered: this.rendered.size,
      retries: Array.from(this.retryCount.values()).reduce((sum, count) => sum + count, 0)
    };
  }
}

// Create global renderer instance
const globalRenderer = new ComponentRenderer();

// Enhanced initialization with comprehensive debugging
export function initializeReactComponents(container?: Element, maxRetries = 3): Promise<number> {
  return new Promise((resolve) => {
    console.log('🚀 Initializing React components with enhanced renderer...');
    
    let attempt = 0;
    
    const tryInitialize = (): void => {
      attempt++;
      console.log(`📋 Initialization attempt ${attempt}/${maxRetries + 1}`);
      
      const successCount = globalRenderer.initializeComponents(container);
      const stats = globalRenderer.getStats();
      
      console.log('📊 Rendering stats:', stats);
      
      // Check if there are still loading placeholders
      const searchScope = container || document;
      const stillLoading = searchScope.querySelectorAll('.react-component-placeholder .component-loading').length;
      
      if (stillLoading > 0 && attempt <= maxRetries) {
        console.log(`⏳ ${stillLoading} components still loading, retrying in ${attempt * 500}ms...`);
        setTimeout(tryInitialize, attempt * 500);
      } else {
        console.log(`✅ Component initialization complete: ${successCount} components rendered`);
        resolve(successCount);
      }
    };
    
    // Start initialization
    setTimeout(tryInitialize, 100);
  });
}

// Legacy function for backward compatibility
export function renderReactComponent(
  componentName: ComponentName,
  props: any,
  container: Element
): boolean {
  return globalRenderer.renderComponent(componentName, props, container);
}

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).initializeReactComponents = initializeReactComponents;
  (window as any).renderReactComponent = renderReactComponent;
  (window as any).componentRenderer = globalRenderer;
  
  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeReactComponents();
    });
  } else {
    // If document is already loaded, initialize immediately
    setTimeout(() => {
      initializeReactComponents();
    }, 0);
  }
}

export default {
  initializeReactComponents,
  renderReactComponent,
  ComponentRenderer,
  COMPONENT_REGISTRY
};