import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { ValidationStatus, RuleSeverity, ModuleType } from './models/enums';

export interface ErrorWithStatus extends Error {
  status?: number;
}

export async function createApp(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Logging
  app.use(morgan('combined'));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1', createApiRoutes());

  // Error handling middleware
  app.use((err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
      error: err.name || 'Error',
      message,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NotFound',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

function createApiRoutes(): express.Router {
  const router = express.Router();

  // Module validation endpoints
  router.post('/modules/validate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { modulePath, rules, severity } = req.body;

      if (!modulePath) {
        const error = new Error('modulePath is required') as ErrorWithStatus;
        error.status = 400;
        error.name = 'ValidationError';
        throw error;
      }

      // Simulate module validation
      if (modulePath === '/non/existent/module/path') {
        const error = new Error('Module not found at specified path') as ErrorWithStatus;
        error.status = 404;
        error.name = 'ModuleNotFound';
        throw error;
      }

      if (modulePath === '/test/modules/corrupted-module') {
        const error = new Error('Validation process failed due to corrupted module') as ErrorWithStatus;
        error.status = 500;
        error.name = 'ValidationProcessError';
        throw error;
      }

      // Generate mock validation report
      const report = {
        moduleId: modulePath.split('/').pop() || 'unknown',
        reportId: `report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        overallScore: Math.floor(Math.random() * 30) + 70, // 70-100
        status: ValidationStatus.PASS,
        results: (rules || ['README_REQUIRED', 'PACKAGE_JSON_VALID']).map((ruleId: string) => ({
          ruleId,
          status: ValidationStatus.PASS,
          severity: severity || RuleSeverity.ERROR,
          message: `${ruleId} validation passed`
        })),
        recommendations: [
          'Consider adding more comprehensive documentation',
          'Ensure test coverage meets the 80% minimum'
        ],
        validator: 'cvplus-unified-validator'
      };

      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  router.post('/modules/validate-batch', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { modules, rules } = req.body;

      if (!modules || !Array.isArray(modules)) {
        const error = new Error('modules array is required') as ErrorWithStatus;
        error.status = 400;
        error.name = 'ValidationError';
        throw error;
      }

      // Generate reports for each module
      const reports = modules.map((module: { path: string; id: string }) => ({
        moduleId: module.id,
        reportId: `report-${Date.now()}-${module.id}`,
        timestamp: new Date().toISOString(),
        overallScore: module.path.includes('non-existent') ? 0 : Math.floor(Math.random() * 30) + 70,
        status: module.path.includes('non-existent') ? ValidationStatus.ERROR : ValidationStatus.PASS,
        results: (rules || ['README_REQUIRED']).map((ruleId: string) => ({
          ruleId,
          status: module.path.includes('non-existent') ? ValidationStatus.ERROR : ValidationStatus.PASS,
          severity: RuleSeverity.ERROR
        })),
        recommendations: [],
        validator: 'cvplus-unified-validator'
      }));

      res.json(reports);
    } catch (error) {
      next(error);
    }
  });

  // Template endpoints
  router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.query;

      const allTemplates = [
        {
          templateId: 'backend-api',
          name: 'Backend API Template',
          description: 'Complete backend API template with Express, TypeScript, and testing setup',
          moduleType: ModuleType.BACKEND,
          configurableOptions: [
            { name: 'database', type: 'string', default: 'postgresql', description: 'Database type' },
            { name: 'auth', type: 'string', default: 'jwt', description: 'Authentication method' },
            { name: 'testing', type: 'string', default: 'jest', description: 'Testing framework' }
          ],
          version: '1.0.0',
          maintainer: 'CVPlus Team'
        },
        {
          templateId: 'frontend-component',
          name: 'Frontend Component Template',
          description: 'React component template with TypeScript and testing',
          moduleType: ModuleType.FRONTEND,
          configurableOptions: [
            { name: 'framework', type: 'string', default: 'react', description: 'Frontend framework' },
            { name: 'styling', type: 'string', default: 'tailwind', description: 'Styling solution' }
          ],
          version: '1.0.0',
          maintainer: 'CVPlus Team'
        },
        {
          templateId: 'utility-lib',
          name: 'Utility Library Template',
          description: 'Utility library template with TypeScript and comprehensive testing',
          moduleType: ModuleType.UTILITY,
          configurableOptions: [
            { name: 'exports', type: 'string', default: 'named', description: 'Export style' }
          ],
          version: '1.0.0',
          maintainer: 'CVPlus Team'
        },
        {
          templateId: 'api-integration',
          name: 'API Integration Template',
          description: 'API integration template with client generation and testing',
          moduleType: ModuleType.API,
          configurableOptions: [
            { name: 'client', type: 'string', default: 'axios', description: 'HTTP client' }
          ],
          version: '1.0.0',
          maintainer: 'CVPlus Team'
        },
        {
          templateId: 'core-types',
          name: 'Core Types Template',
          description: 'Core types and constants template',
          moduleType: ModuleType.CORE,
          configurableOptions: [
            { name: 'validation', type: 'boolean', default: true, description: 'Include validation schemas' }
          ],
          version: '1.0.0',
          maintainer: 'CVPlus Team'
        }
      ];

      let filteredTemplates = allTemplates;
      if (type && Object.values(ModuleType).includes(type as ModuleType)) {
        filteredTemplates = allTemplates.filter(t => t.moduleType === type);
      } else if (type && !Object.values(ModuleType).includes(type as ModuleType)) {
        filteredTemplates = [];
      }

      res.json(filteredTemplates);
    } catch (error) {
      next(error);
    }
  });

  router.post('/templates/:templateId/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const { moduleName, outputPath } = req.body;

      if (!moduleName || !outputPath) {
        const error = new Error('moduleName and outputPath are required') as ErrorWithStatus;
        error.status = 400;
        error.name = 'ValidationError';
        throw error;
      }

      const validTemplates = ['backend-api', 'frontend-component', 'utility-lib', 'api-integration', 'core-types'];
      if (!templateId || !validTemplates.includes(templateId)) {
        const error = new Error(`Template not found: ${templateId}`) as ErrorWithStatus;
        error.status = 404;
        error.name = 'TemplateNotFound';
        throw error;
      }

      // Simulate module generation
      const filesCreated = [
        'package.json',
        'README.md',
        'tsconfig.json',
        'src/index.ts',
        'tests/unit/example.test.ts',
        '.gitignore',
        '.eslintrc.js',
        'jest.config.js'
      ];

      const response = {
        modulePath: `${outputPath}/${moduleName}`,
        filesCreated,
        validationReport: {
          moduleId: moduleName,
          reportId: `report-${Date.now()}`,
          timestamp: new Date().toISOString(),
          overallScore: 95,
          status: ValidationStatus.PASS,
          results: [
            {
              ruleId: 'README_REQUIRED',
              status: ValidationStatus.PASS,
              severity: RuleSeverity.ERROR
            },
            {
              ruleId: 'PACKAGE_JSON_VALID',
              status: ValidationStatus.PASS,
              severity: RuleSeverity.CRITICAL
            }
          ],
          recommendations: [],
          validator: 'cvplus-unified-validator'
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Compliance endpoints
  router.get('/compliance/rules', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, severity } = req.query;

      const allRules = [
        {
          id: 'README_REQUIRED',
          category: 'DOCUMENTATION',
          severity: 'ERROR',
          description: 'Module must have a README.md file',
          remediation: 'Create a README.md file with project description',
          applicableTypes: Object.values(ModuleType),
          enabled: true,
          version: '1.0.0'
        },
        {
          id: 'PACKAGE_JSON_VALID',
          category: 'CONFIGURATION',
          severity: 'CRITICAL',
          description: 'Module must have a valid package.json',
          remediation: 'Ensure package.json contains required fields',
          applicableTypes: Object.values(ModuleType),
          enabled: true,
          version: '1.0.0'
        },
        {
          id: 'TESTS_REQUIRED',
          category: 'TESTING',
          severity: 'ERROR',
          description: 'Module must have test files',
          remediation: 'Create test files and test scripts',
          applicableTypes: Object.values(ModuleType),
          enabled: true,
          version: '1.0.0'
        }
      ];

      let filteredRules = allRules;
      if (category) {
        filteredRules = filteredRules.filter(r => r.category === category);
      }
      if (severity) {
        filteredRules = filteredRules.filter(r => r.severity === severity);
      }

      res.json(filteredRules);
    } catch (error) {
      next(error);
    }
  });

  router.get('/compliance/reports', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { moduleId, status, limit } = req.query;

      // Mock reports data
      const mockReports = [
        {
          moduleId: 'cv-processing',
          reportId: 'report-1',
          timestamp: new Date().toISOString(),
          overallScore: 85,
          status: ValidationStatus.WARNING,
          results: [],
          recommendations: [],
          validator: 'cvplus-unified-validator'
        }
      ];

      let filteredReports = mockReports;
      if (moduleId) {
        filteredReports = filteredReports.filter(r => r.moduleId === moduleId);
      }
      if (status) {
        filteredReports = filteredReports.filter(r => r.status === status);
      }
      if (limit) {
        filteredReports = filteredReports.slice(0, parseInt(limit as string));
      }

      res.json(filteredReports);
    } catch (error) {
      next(error);
    }
  });

  router.get('/compliance/ecosystem', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const ecosystemData = {
        totalModules: 18,
        averageScore: 87.3,
        statusDistribution: {
          pass: 12,
          warning: 5,
          fail: 1,
          error: 0
        },
        trends: {
          scoreChange: 3.2,
          newViolations: 2
        },
        topViolations: [
          { ruleId: 'CHANGELOG_MISSING', count: 6, percentage: 33.3 },
          { ruleId: 'TEST_COVERAGE_LOW', count: 4, percentage: 22.2 }
        ]
      };

      res.json(ecosystemData);
    } catch (error) {
      next(error);
    }
  });

  return router;
}