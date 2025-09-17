import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { ModuleTemplate, ModuleType } from '../../src/models/enums';

describe('GET /templates - Contract Test', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should return all available templates', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;

    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);

    templates.forEach(template => {
      // Validate template structure
      expect(template).toHaveProperty('templateId');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('moduleType');
      expect(template).toHaveProperty('configurableOptions');
      expect(template).toHaveProperty('version');
      expect(template).toHaveProperty('maintainer');

      // Validate data types
      expect(typeof template.templateId).toBe('string');
      expect(typeof template.name).toBe('string');
      expect(typeof template.description).toBe('string');
      expect(Object.values(ModuleType)).toContain(template.moduleType);
      expect(Array.isArray(template.configurableOptions)).toBe(true);
      expect(typeof template.version).toBe('string');
      expect(typeof template.maintainer).toBe('string');

      // Validate configurable options structure
      template.configurableOptions.forEach(option => {
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('type');
        expect(option).toHaveProperty('default');
        expect(option).toHaveProperty('description');
        expect(typeof option.name).toBe('string');
        expect(typeof option.type).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });
  });

  it('should filter templates by module type', async () => {
    const response = await request(app)
      .get('/api/v1/templates?type=BACKEND')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;

    expect(Array.isArray(templates)).toBe(true);
    templates.forEach(template => {
      expect(template.moduleType).toBe(ModuleType.BACKEND);
    });
  });

  it('should filter templates by frontend type', async () => {
    const response = await request(app)
      .get('/api/v1/templates?type=FRONTEND')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;

    expect(Array.isArray(templates)).toBe(true);
    templates.forEach(template => {
      expect(template.moduleType).toBe(ModuleType.FRONTEND);
    });
  });

  it('should filter templates by utility type', async () => {
    const response = await request(app)
      .get('/api/v1/templates?type=UTILITY')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;

    expect(Array.isArray(templates)).toBe(true);
    templates.forEach(template => {
      expect(template.moduleType).toBe(ModuleType.UTILITY);
    });
  });

  it('should filter templates by API type', async () => {
    const response = await request(app)
      .get('/api/v1/templates?type=API')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;

    expect(Array.isArray(templates)).toBe(true);
    templates.forEach(template => {
      expect(template.moduleType).toBe(ModuleType.API);
    });
  });

  it('should filter templates by CORE type', async () => {
    const response = await request(app)
      .get('/api/v1/templates?type=CORE')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;

    expect(Array.isArray(templates)).toBe(true);
    templates.forEach(template => {
      expect(template.moduleType).toBe(ModuleType.CORE);
    });
  });

  it('should return empty array for unsupported module type', async () => {
    const response = await request(app)
      .get('/api/v1/templates?type=INVALID_TYPE')
      .expect(200)
      .expect('Content-Type', /json/);

    const templates: ModuleTemplate[] = response.body;
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBe(0);
  });

  it('should include all required module types', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200);

    const templates: ModuleTemplate[] = response.body;
    const moduleTypes = templates.map(t => t.moduleType);

    // Should include templates for all module types
    expect(moduleTypes).toContain(ModuleType.BACKEND);
    expect(moduleTypes).toContain(ModuleType.FRONTEND);
    expect(moduleTypes).toContain(ModuleType.UTILITY);
    expect(moduleTypes).toContain(ModuleType.API);
    expect(moduleTypes).toContain(ModuleType.CORE);
  });

  it('should have valid version format for all templates', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200);

    const templates: ModuleTemplate[] = response.body;

    templates.forEach(template => {
      // Version should follow semver format (x.y.z)
      const versionRegex = /^\d+\.\d+\.\d+$/;
      expect(template.version).toMatch(versionRegex);
    });
  });

  it('should have non-empty descriptions for all templates', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200);

    const templates: ModuleTemplate[] = response.body;

    templates.forEach(template => {
      expect(template.description.length).toBeGreaterThan(10);
      expect(template.description).not.toContain('TODO');
      expect(template.description).not.toContain('placeholder');
    });
  });

  it('should have unique template IDs', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200);

    const templates: ModuleTemplate[] = response.body;
    const templateIds = templates.map(t => t.templateId);
    const uniqueIds = new Set(templateIds);

    expect(uniqueIds.size).toBe(templateIds.length);
  });

  it('should include configurable options for each template', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200);

    const templates: ModuleTemplate[] = response.body;

    templates.forEach(template => {
      expect(template.configurableOptions.length).toBeGreaterThan(0);

      template.configurableOptions.forEach(option => {
        expect(option.name.length).toBeGreaterThan(0);
        expect(option.type.length).toBeGreaterThan(0);
        expect(option.description.length).toBeGreaterThan(0);
        expect(option.default).toBeDefined();
      });
    });
  });

  it('should return templates with valid maintainer information', async () => {
    const response = await request(app)
      .get('/api/v1/templates')
      .expect(200);

    const templates: ModuleTemplate[] = response.body;

    templates.forEach(template => {
      expect(template.maintainer.length).toBeGreaterThan(0);
      expect(template.maintainer).not.toBe('TODO');
      expect(template.maintainer).not.toBe('placeholder');
    });
  });
});