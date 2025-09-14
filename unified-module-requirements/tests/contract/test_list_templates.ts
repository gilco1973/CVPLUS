// Contract test for GET /templates endpoint
// This test MUST FAIL until implementation is complete (TDD RED phase)

import { describe, it, expect } from '@jest/globals';

// Types from OpenAPI specification
type ModuleType = 'BACKEND' | 'FRONTEND' | 'UTILITY' | 'API' | 'CORE';

type TemplateOption = {
  name: string;
  type: string;
  default: string;
  description: string;
};

type ModuleTemplate = {
  templateId: string;
  name: string;
  description?: string;
  moduleType: ModuleType;
  configurableOptions?: TemplateOption[];
  version?: string;
  maintainer?: string;
};

// Mock TemplateService that will be implemented in Phase 3.3
interface TemplateService {
  listTemplates(type?: ModuleType): Promise<ModuleTemplate[]>;
}

describe('Contract: GET /templates', () => {
  let templateService: TemplateService | null = null;

  beforeEach(() => {
    // This will fail until TemplateService is implemented
    throw new Error('TemplateService not yet implemented - TDD RED phase');
  });

  describe('List All Templates', () => {
    it('should return all available templates', async () => {
      const templates = await templateService!.listTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      // Each template should have required fields
      templates.forEach(template => {
        expect(template).toHaveProperty('templateId');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('moduleType');
        expect(typeof template.templateId).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(['BACKEND', 'FRONTEND', 'UTILITY', 'API', 'CORE']).toContain(template.moduleType);
      });
    });

    it('should return templates with all expected template types', async () => {
      const templates = await templateService!.listTemplates();

      const moduleTypes = templates.map(t => t.moduleType);
      const uniqueTypes = new Set(moduleTypes);

      // Should have templates for major module types
      expect(uniqueTypes.has('BACKEND')).toBe(true);
      expect(uniqueTypes.has('FRONTEND')).toBe(true);
      expect(uniqueTypes.has('UTILITY')).toBe(true);
    });

    it('should include template metadata', async () => {
      const templates = await templateService!.listTemplates();

      // At least some templates should have optional metadata
      const templatesWithDescription = templates.filter(t => t.description);
      const templatesWithVersion = templates.filter(t => t.version);
      const templatesWithMaintainer = templates.filter(t => t.maintainer);

      expect(templatesWithDescription.length).toBeGreaterThan(0);
      expect(templatesWithVersion.length).toBeGreaterThan(0);
      expect(templatesWithMaintainer.length).toBeGreaterThan(0);

      // Validate metadata format
      templatesWithVersion.forEach(template => {
        expect(template.version).toMatch(/^\d+\.\d+\.\d+/); // Semantic versioning
      });
    });
  });

  describe('Filter by Module Type', () => {
    it('should filter templates by BACKEND type', async () => {
      const templates = await templateService!.listTemplates('BACKEND');

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);

      templates.forEach(template => {
        expect(template.moduleType).toBe('BACKEND');
      });
    });

    it('should filter templates by FRONTEND type', async () => {
      const templates = await templateService!.listTemplates('FRONTEND');

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);

      templates.forEach(template => {
        expect(template.moduleType).toBe('FRONTEND');
      });
    });

    it('should filter templates by UTILITY type', async () => {
      const templates = await templateService!.listTemplates('UTILITY');

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);

      templates.forEach(template => {
        expect(template.moduleType).toBe('UTILITY');
      });
    });

    it('should filter templates by API type', async () => {
      const templates = await templateService!.listTemplates('API');

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);

      templates.forEach(template => {
        expect(template.moduleType).toBe('API');
      });
    });

    it('should filter templates by CORE type', async () => {
      const templates = await templateService!.listTemplates('CORE');

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);

      templates.forEach(template => {
        expect(template.moduleType).toBe('CORE');
      });
    });

    it('should return empty array for type with no templates', async () => {
      // Assuming we don't have templates for every type initially
      const allTemplates = await templateService!.listTemplates();
      const moduleTypes = new Set(allTemplates.map(t => t.moduleType));

      // Find a type that doesn't exist in the templates
      const allTypes: ModuleType[] = ['BACKEND', 'FRONTEND', 'UTILITY', 'API', 'CORE'];
      const missingType = allTypes.find(type => !moduleTypes.has(type));

      if (missingType) {
        const templates = await templateService!.listTemplates(missingType);
        expect(templates).toEqual([]);
      } else {
        // If all types are present, this test passes by default
        expect(true).toBe(true);
      }
    });
  });

  describe('Template Structure Validation', () => {
    it('should include configurable options for customizable templates', async () => {
      const templates = await templateService!.listTemplates();

      // Find templates that have configurable options
      const configurableTemplates = templates.filter(t => t.configurableOptions && t.configurableOptions.length > 0);

      expect(configurableTemplates.length).toBeGreaterThan(0);

      configurableTemplates.forEach(template => {
        expect(template.configurableOptions).toBeDefined();
        expect(Array.isArray(template.configurableOptions)).toBe(true);

        template.configurableOptions!.forEach(option => {
          expect(option).toHaveProperty('name');
          expect(option).toHaveProperty('type');
          expect(option).toHaveProperty('default');
          expect(typeof option.name).toBe('string');
          expect(typeof option.type).toBe('string');
          expect(typeof option.default).toBe('string');
        });
      });
    });

    it('should have unique template IDs', async () => {
      const templates = await templateService!.listTemplates();

      const templateIds = templates.map(t => t.templateId);
      const uniqueIds = new Set(templateIds);

      expect(templateIds.length).toBe(uniqueIds.size);
    });

    it('should have meaningful template names', async () => {
      const templates = await templateService!.listTemplates();

      templates.forEach(template => {
        expect(template.name.length).toBeGreaterThan(3);
        expect(template.name).not.toBe(template.templateId);
      });
    });
  });

  describe('Expected CVPlus Templates', () => {
    it('should include backend-api template', async () => {
      const templates = await templateService!.listTemplates();

      const backendApiTemplate = templates.find(t =>
        t.templateId === 'backend-api' || t.name.toLowerCase().includes('backend') && t.name.toLowerCase().includes('api')
      );

      expect(backendApiTemplate).toBeDefined();
      expect(backendApiTemplate?.moduleType).toBe('BACKEND');
    });

    it('should include utility-lib template', async () => {
      const templates = await templateService!.listTemplates();

      const utilityTemplate = templates.find(t =>
        t.templateId === 'utility-lib' || t.name.toLowerCase().includes('utility')
      );

      expect(utilityTemplate).toBeDefined();
      expect(utilityTemplate?.moduleType).toBe('UTILITY');
    });

    it('should include frontend-component template', async () => {
      const templates = await templateService!.listTemplates();

      const frontendTemplate = templates.find(t =>
        t.templateId === 'frontend-component' || t.name.toLowerCase().includes('frontend')
      );

      expect(frontendTemplate).toBeDefined();
      expect(frontendTemplate?.moduleType).toBe('FRONTEND');
    });
  });

  describe('Response Format', () => {
    it('should return templates sorted by name', async () => {
      const templates = await templateService!.listTemplates();

      const templateNames = templates.map(t => t.name);
      const sortedNames = [...templateNames].sort();

      expect(templateNames).toEqual(sortedNames);
    });

    it('should return templates in consistent format across calls', async () => {
      const templates1 = await templateService!.listTemplates();
      const templates2 = await templateService!.listTemplates();

      expect(templates1).toEqual(templates2);

      // Should have the same number of templates
      expect(templates1.length).toBe(templates2.length);

      // Each template should have the same properties
      templates1.forEach((template, index) => {
        const template2 = templates2[index];
        expect(template.templateId).toBe(template2.templateId);
        expect(template.name).toBe(template2.name);
        expect(template.moduleType).toBe(template2.moduleType);
      });
    });
  });
});