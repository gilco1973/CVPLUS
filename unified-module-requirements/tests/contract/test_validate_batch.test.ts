import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { BatchValidateRequest, ValidationReport, ValidationStatus, RuleSeverity } from '../../src/models/enums';

describe('POST /modules/validate-batch - Contract Test', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should validate multiple modules and return array of validation reports', async () => {
    const request_payload: BatchValidateRequest = {
      modules: [
        { path: '/test/modules/cv-processing', id: 'cv-processing' },
        { path: '/test/modules/multimedia', id: 'multimedia' },
        { path: '/test/modules/auth', id: 'auth' }
      ],
      rules: ['README_REQUIRED', 'PACKAGE_JSON_VALID']
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate response is array of ValidationReports
    const reports: ValidationReport[] = response.body;

    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBe(3);

    reports.forEach((report, index) => {
      // Validate each report structure
      expect(report).toHaveProperty('moduleId');
      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('validator');

      // Validate module ID matches the request
      expect(report.moduleId).toBe(request_payload.modules[index]?.id);

      // Validate data types and constraints
      expect(typeof report.reportId).toBe('string');
      expect(typeof report.timestamp).toBe('string');
      expect(typeof report.overallScore).toBe('number');
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(Object.values(ValidationStatus)).toContain(report.status);
      expect(Array.isArray(report.results)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  it('should return 400 for invalid batch request', async () => {
    const invalidRequest = {
      // Missing required modules array
      rules: ['README_REQUIRED']
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(invalidRequest)
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.error).toBe('ValidationError');
    expect(response.body.message).toContain('modules');
  });

  it('should handle empty modules array', async () => {
    const request_payload: BatchValidateRequest = {
      modules: []
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200)
      .expect('Content-Type', /json/);

    const reports: ValidationReport[] = response.body;
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBe(0);
  });

  it('should handle mixed valid and invalid module paths', async () => {
    const request_payload: BatchValidateRequest = {
      modules: [
        { path: '/test/modules/cv-processing', id: 'cv-processing' },
        { path: '/non/existent/module', id: 'non-existent' },
        { path: '/test/modules/auth', id: 'auth' }
      ]
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200)
      .expect('Content-Type', /json/);

    const reports: ValidationReport[] = response.body;
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBe(3);

    // First and third should succeed, second should have error status
    expect(reports[0]?.status).not.toBe(ValidationStatus.ERROR);
    expect(reports[1]?.status).toBe(ValidationStatus.ERROR);
    expect(reports[2]?.status).not.toBe(ValidationStatus.ERROR);
  });

  it('should process batch validation in parallel', async () => {
    const request_payload: BatchValidateRequest = {
      modules: [
        { path: '/test/modules/large-module-1', id: 'large-1' },
        { path: '/test/modules/large-module-2', id: 'large-2' },
        { path: '/test/modules/large-module-3', id: 'large-3' },
        { path: '/test/modules/large-module-4', id: 'large-4' },
        { path: '/test/modules/large-module-5', id: 'large-5' }
      ]
    };

    const startTime = Date.now();

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Batch processing should be faster than sequential (assumes each module takes ~1s)
    expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds for 5 modules

    const reports: ValidationReport[] = response.body;
    expect(reports.length).toBe(5);
  });

  it('should apply global rules to all modules', async () => {
    const request_payload: BatchValidateRequest = {
      modules: [
        { path: '/test/modules/cv-processing', id: 'cv-processing' },
        { path: '/test/modules/multimedia', id: 'multimedia' }
      ],
      rules: ['README_REQUIRED']
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200);

    const reports: ValidationReport[] = response.body;

    reports.forEach(report => {
      // Each report should only contain results for the specified rule
      expect(report.results.length).toBeGreaterThan(0);
      expect(report.results.every(r => r.ruleId === 'README_REQUIRED')).toBe(true);
    });
  });

  it('should maintain individual module context in batch results', async () => {
    const request_payload: BatchValidateRequest = {
      modules: [
        { path: '/test/modules/frontend-module', id: 'frontend' },
        { path: '/test/modules/backend-module', id: 'backend' }
      ]
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200);

    const reports: ValidationReport[] = response.body;

    expect(reports[0]?.moduleId).toBe('frontend');
    expect(reports[1]?.moduleId).toBe('backend');

    // Each report should have unique reportId
    expect(reports[0]?.reportId).not.toBe(reports[1]?.reportId);

    // Timestamps should be close but could be different
    const timestamp1 = new Date(reports[0]?.timestamp || '').getTime();
    const timestamp2 = new Date(reports[1]?.timestamp || '').getTime();
    expect(Math.abs(timestamp1 - timestamp2)).toBeLessThan(5000); // Within 5 seconds
  });

  it('should handle large batch requests efficiently', async () => {
    const modules = Array.from({ length: 20 }, (_, i) => ({
      path: `/test/modules/module-${i}`,
      id: `module-${i}`
    }));

    const request_payload: BatchValidateRequest = {
      modules
    };

    const response = await request(app)
      .post('/api/v1/modules/validate-batch')
      .send(request_payload)
      .expect(200);

    const reports: ValidationReport[] = response.body;
    expect(reports.length).toBe(20);

    // Verify all modules were processed
    const moduleIds = reports.map(r => r.moduleId).sort();
    const expectedIds = modules.map(m => m.id).sort();
    expect(moduleIds).toEqual(expectedIds);
  });
});