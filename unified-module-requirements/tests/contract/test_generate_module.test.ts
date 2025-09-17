import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { GenerateModuleRequest, GenerateModuleResponse } from '../../src/models/enums';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('POST /templates/{templateId}/generate - Contract Test', () => {
  let app: Express;
  const testOutputDir = '/tmp/test-module-generation';

  beforeAll(async () => {
    app = await createApp();
    await fs.ensureDir(testOutputDir);
  });

  afterAll(async () => {
    await fs.remove(testOutputDir);
  });

  it('should generate module from backend template', async () => {
    const request_payload: GenerateModuleRequest = {
      moduleName: 'test-backend-module',
      outputPath: testOutputDir,
      options: {
        database: 'postgresql',
        auth: 'jwt',
        testing: 'jest'
      },
      author: 'Test Author',
      description: 'Test backend module generated from template'
    };

    const response = await request(app)
      .post('/api/v1/templates/backend-api/generate')
      .send(request_payload)
      .expect(201)
      .expect('Content-Type', /json/);

    const result: GenerateModuleResponse = response.body;

    // Validate response structure
    expect(result).toHaveProperty('modulePath');
    expect(result).toHaveProperty('filesCreated');
    expect(result).toHaveProperty('validationReport');

    expect(typeof result.modulePath).toBe('string');
    expect(Array.isArray(result.filesCreated)).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // Validate generated files exist
    const moduleDir = path.join(testOutputDir, 'test-backend-module');
    expect(await fs.pathExists(moduleDir)).toBe(true);

    // Essential files should be created
    const essentialFiles = [
      'package.json',
      'tsconfig.json',
      'README.md',
      'src/index.ts',
      'tests/unit/example.test.ts'
    ];

    for (const file of essentialFiles) {
      const filePath = path.join(moduleDir, file);
      expect(await fs.pathExists(filePath)).toBe(true);
    }

    // Validation report should show high compliance
    expect(result.validationReport.overallScore).toBeGreaterThanOrEqual(95);
  });

  it('should return 404 for non-existent template', async () => {
    const request_payload: GenerateModuleRequest = {
      moduleName: 'test-module',
      outputPath: testOutputDir
    };

    const response = await request(app)
      .post('/api/v1/templates/non-existent-template/generate')
      .send(request_payload)
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('TemplateNotFound');
  });

  it('should return 400 for invalid generation parameters', async () => {
    const invalidRequest = {
      // Missing required moduleName
      outputPath: testOutputDir
    };

    const response = await request(app)
      .post('/api/v1/templates/backend-api/generate')
      .send(invalidRequest)
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('ValidationError');
  });
});