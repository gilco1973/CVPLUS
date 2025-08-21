/**
 * Professional CV Template Components
 * Export barrel for all template-specific React components
 */

export { ExecutiveTemplate } from './ExecutiveTemplate';
export { TechTemplate } from './TechTemplate';
export { CreativeTemplate } from './CreativeTemplate';
export { HealthcareTemplate } from './HealthcareTemplate';

// Template component mapping for dynamic rendering
import { ExecutiveTemplate } from './ExecutiveTemplate';
import { TechTemplate } from './TechTemplate';
import { CreativeTemplate } from './CreativeTemplate';
import { HealthcareTemplate } from './HealthcareTemplate';
import type { TemplateId } from '../../types/cv-templates';

// Template component interface
export interface TemplateComponentProps {
  cvData: any;
  template: any;
  isEditing: boolean;
  selectedFeatures: any;
  onSectionEdit: (section: string, value: unknown) => void;
  showFeaturePreviews: boolean;
  className?: string;
}

export type TemplateComponent = React.FC<TemplateComponentProps>;

// Template component mapping for dynamic selection
export const TemplateComponents: Record<string, TemplateComponent> = {
  'executive-authority': ExecutiveTemplate,
  'tech-innovation': TechTemplate, 
  'creative-showcase': CreativeTemplate,
  'healthcare-professional': HealthcareTemplate
} as const;

// Template selection utility
export const getTemplateComponent = (templateId: string): TemplateComponent | null => {
  return TemplateComponents[templateId] || null;
};

// Available template IDs
export const CORE_TEMPLATE_IDS = [
  'executive-authority',
  'tech-innovation', 
  'creative-showcase',
  'healthcare-professional'
] as const;

export type CoreTemplateId = typeof CORE_TEMPLATE_IDS[number];