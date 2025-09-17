import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { ValidateModuleRequest, ValidationReport, ValidationStatus, RuleSeverity } from '../../src/models/enums';

describe('POST /modules/validate - Contract Test', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should validate a module and return validation report', async () => {
    const request_payload: ValidateModuleRequest = {
      modulePath: '/test/modules/cv-processing',
      rules: ['README_REQUIRED', 'PACKAGE_JSON_VALID'],
      severity: RuleSeverity.ERROR
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(request_payload)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate response structure matches ValidationReport schema
    const report: ValidationReport = response.body;

    expect(report).toHaveProperty('moduleId');
    expect(report).toHaveProperty('reportId');
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('overallScore');
    expect(report).toHaveProperty('status');
    expect(report).toHaveProperty('results');
    expect(report).toHaveProperty('recommendations');
    expect(report).toHaveProperty('validator');

    // Validate data types and constraints
    expect(typeof report.moduleId).toBe('string');
    expect(typeof report.reportId).toBe('string');
    expect(typeof report.timestamp).toBe('string');
    expect(typeof report.overallScore).toBe('number');
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(Object.values(ValidationStatus)).toContain(report.status);
    expect(Array.isArray(report.results)).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
    expect(typeof report.validator).toBe('string');

    // Validate results structure
    report.results.forEach(result => {
      expect(result).toHaveProperty('ruleId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('severity');
      expect(typeof result.ruleId).toBe('string');
      expect(Object.values(ValidationStatus)).toContain(result.status);
      expect(Object.values(RuleSeverity)).toContain(result.severity);
    });
  });

  it('should return 400 for invalid request body', async () => {
    const invalidRequest = {
      // Missing required modulePath
      rules: ['README_REQUIRED']
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(invalidRequest)
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.error).toBe('ValidationError');
    expect(response.body.message).toContain('modulePath');
  });

  it('should return 404 for non-existent module path', async () => {
    const request_payload: ValidateModuleRequest = {
      modulePath: '/non/existent/module/path'
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(request_payload)
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.error).toBe('ModuleNotFound');
    expect(response.body.message).toContain('Module not found');
  });

  it('should handle validation process failures', async () => {
    const request_payload: ValidateModuleRequest = {
      modulePath: '/test/modules/corrupted-module'
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(request_payload)
      .expect(500)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.error).toBe('ValidationProcessError');
  });

  it('should validate with specific rules filter', async () => {
    const request_payload: ValidateModuleRequest = {
      modulePath: '/test/modules/cv-processing',
      rules: ['README_REQUIRED'],
      severity: RuleSeverity.WARNING
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(request_payload)
      .expect(200);

    const report: ValidationReport = response.body;
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.results.every(r => r.ruleId === 'README_REQUIRED')).toBe(true);
  });

  it('should include proper timestamp format', async () => {
    const request_payload: ValidateModuleRequest = {
      modulePath: '/test/modules/cv-processing'
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(request_payload)
      .expect(200);

    const report: ValidationReport = response.body;
    const timestamp = new Date(report.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should provide actionable recommendations', async () => {
    const request_payload: ValidateModuleRequest = {
      modulePath: '/test/modules/incomplete-module'
    };

    const response = await request(app)
      .post('/api/v1/modules/validate')
      .send(request_payload)
      .expect(200);

    const report: ValidationReport = response.body;
    expect(Array.isArray(report.recommendations)).toBe(true);
    report.recommendations.forEach(recommendation => {
      expect(typeof recommendation).toBe('string');
      expect(recommendation.length).toBeGreaterThan(0);
    });
  });
});