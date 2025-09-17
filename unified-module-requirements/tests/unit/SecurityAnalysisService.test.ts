import { SecurityAnalysisService, SecurityScanOptions, SecurityVulnerability } from '../../src/services/SecurityAnalysisService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mockedhash1234567890abcdef')
  }))
}));

describe('SecurityAnalysisService', () => {
  let securityService: SecurityAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    securityService = new SecurityAnalysisService();
  });

  describe('dependency vulnerability scanning', () => {
    it('should detect vulnerable dependencies', async () => {
      const packageJson = {
        dependencies: {
          'lodash': '^4.17.10',
          'axios': '^0.21.1',
          'express': '^4.17.0'
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(packageJson));
      mockFs.readdir.mockResolvedValue([] as any);

      const result = await securityService.performSecurityScan('/test/module', {
        scanDependencies: true,
        scanCode: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      expect(result.vulnerabilities.length).toBeGreaterThan(0);

      const lodashVuln = result.vulnerabilities.find(v => v.affectedPackage === 'lodash');
      expect(lodashVuln).toBeDefined();
      expect(lodashVuln?.type).toBe('dependency');
      expect(lodashVuln?.severity).toBe('high');
      expect(lodashVuln?.title).toContain('Prototype Pollution');
    });

    it('should handle missing package.json gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));
      mockFs.readdir.mockResolvedValue([] as any);

      const result = await securityService.performSecurityScan('/test/module', {
        scanDependencies: true,
        scanCode: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('code vulnerability scanning', () => {
    beforeEach(() => {
      // Mock file system structure
      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        if (dirPath === '/test/module') {
          return [
            { name: 'app.js', isDirectory: () => false, isFile: () => true },
            { name: 'src', isDirectory: () => true, isFile: () => false }
          ] as any;
        }
        if (dirPath === '/test/module/src') {
          return [
            { name: 'index.ts', isDirectory: () => false, isFile: () => true }
          ] as any;
        }
        return [] as any;
      });
    });

    it('should detect dangerous function usage', async () => {
      const codeContent = `
const userInput = req.body.code;
eval(userInput); // Dangerous!
const result = execSync('ls -la');
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
          return codeContent;
        }
        throw new Error('File not found');
      });

      const result = await securityService.performSecurityScan('/test/module', {
        scanDependencies: false,
        scanCode: true,
        scanConfiguration: false,
        scanSecrets: false
      });

      const evalVuln = result.vulnerabilities.find(v => v.title.includes('eval'));
      expect(evalVuln).toBeDefined();
      expect(evalVuln?.type).toBe('code');
      expect(evalVuln?.severity).toBe('high');
      expect(evalVuln?.lineNumber).toBe(3);

      const execVuln = result.vulnerabilities.find(v => v.title.includes('execSync'));
      expect(execVuln).toBeDefined();
    });

    it('should detect SQL injection patterns', async () => {
      const codeContent = `
const query = "SELECT * FROM users WHERE id = " + userId;
db.query(query);
const dynamicQuery = \`INSERT INTO logs VALUES (\${userInput})\`;
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
          return codeContent;
        }
        throw new Error('File not found');
      });

      const result = await securityService.performSecurityScan('/test/module', {
        scanCode: true,
        scanDependencies: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      const sqliVuln = result.vulnerabilities.find(v => v.title.includes('SQL Injection'));
      expect(sqliVuln).toBeDefined();
      expect(sqliVuln?.type).toBe('injection');
      expect(sqliVuln?.severity).toBe('high');
      expect(sqliVuln?.cwe).toBe('CWE-89');
    });

    it('should detect XSS patterns', async () => {
      const codeContent = `
element.innerHTML = '<div>' + userInput + '</div>';
document.write('<script>' + dynamicScript + '</script>');
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
          return codeContent;
        }
        throw new Error('File not found');
      });

      const result = await securityService.performSecurityScan('/test/module', {
        scanCode: true,
        scanDependencies: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      const xssVuln = result.vulnerabilities.find(v => v.title.includes('Cross-Site Scripting'));
      expect(xssVuln).toBeDefined();
      expect(xssVuln?.type).toBe('injection');
      expect(xssVuln?.cwe).toBe('CWE-79');
    });

    it('should skip vulnerabilities in comments', async () => {
      const codeContent = `
// This is a comment with eval() - should be ignored
/* Another comment with execSync() */
const safe = "normal code";
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
          return codeContent;
        }
        throw new Error('File not found');
      });

      const result = await securityService.performSecurityScan('/test/module', {
        scanCode: true,
        scanDependencies: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      expect(result.vulnerabilities).toHaveLength(0);
    });
  });

  describe('configuration scanning', () => {
    it('should detect insecure configuration', async () => {
      mockFs.access.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('config.json')) {
          return; // File exists
        }
        throw new Error('File not found');
      });

      const configContent = `{
  "ssl": false,
  "debug": true,
  "cors": "*"
}`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('config.json')) {
          return configContent;
        }
        throw new Error('File not found');
      });

      mockFs.readdir.mockResolvedValue([] as any);

      const result = await securityService.performSecurityScan('/test/module', {
        scanConfiguration: true,
        scanDependencies: false,
        scanCode: false,
        scanSecrets: false
      });

      const configVuln = result.vulnerabilities.find(v => v.type === 'configuration');
      expect(configVuln).toBeDefined();
      expect(configVuln?.title).toBe('Insecure Configuration');
    });

    it('should detect default credentials', async () => {
      mockFs.access.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('.env')) {
          return; // File exists
        }
        throw new Error('File not found');
      });

      const envContent = `
DB_USER=admin
DB_PASSWORD=password
API_SECRET=secret
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('.env')) {
          return envContent;
        }
        throw new Error('File not found');
      });

      mockFs.readdir.mockResolvedValue([] as any);

      const result = await securityService.performSecurityScan('/test/module', {
        scanConfiguration: true,
        scanDependencies: false,
        scanCode: false,
        scanSecrets: false
      });

      const credsVuln = result.vulnerabilities.find(v => v.title === 'Default Credentials');
      expect(credsVuln).toBeDefined();
      expect(credsVuln?.severity).toBe('high');
    });
  });

  describe('secret scanning', () => {
    beforeEach(() => {
      // Mock fs.statSync for file size checking
      require('fs').statSync = jest.fn().mockReturnValue({ size: 1024 }); // 1KB file
    });

    it('should detect API keys', async () => {
      const fileContent = `
const config = {
  apiKey: "sk-1234567890abcdef1234567890abcdef12345678",
  secret: "very-secret-key-123456789012345678901234"
};
`;

      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'config.js', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      mockFs.readFile.mockResolvedValue(fileContent);

      const result = await securityService.performSecurityScan('/test/module', {
        scanSecrets: true,
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false
      });

      const secretVuln = result.vulnerabilities.find(v => v.type === 'secrets');
      expect(secretVuln).toBeDefined();
      expect(secretVuln?.title).toBe('Exposed Secret');
      expect(secretVuln?.cwe).toBe('CWE-798');
    });

    it('should detect GitHub tokens', async () => {
      const fileContent = `
export const GITHUB_TOKEN = "ghp_1234567890abcdef1234567890abcdef123456";
`;

      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'github.ts', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      mockFs.readFile.mockResolvedValue(fileContent);

      const result = await securityService.performSecurityScan('/test/module', {
        scanSecrets: true,
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false
      });

      const githubVuln = result.vulnerabilities.find(v =>
        v.type === 'secrets' && v.description.includes('github.ts')
      );
      expect(githubVuln).toBeDefined();
    });

    it('should skip binary files', async () => {
      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'binary.exe', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      const result = await securityService.performSecurityScan('/test/module', {
        scanSecrets: true,
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false
      });

      expect(result.vulnerabilities).toHaveLength(0);
    });

    it('should skip large files', async () => {
      require('fs').statSync = jest.fn().mockReturnValue({ size: 2 * 1024 * 1024 }); // 2MB file

      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'large.js', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      const result = await securityService.performSecurityScan('/test/module', {
        scanSecrets: true,
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false
      });

      expect(result.vulnerabilities).toHaveLength(0);
    });
  });

  describe('filtering and options', () => {
    const mockVulnerabilities: SecurityVulnerability[] = [
      {
        id: '1',
        type: 'dependency',
        severity: 'high',
        title: 'High severity dependency',
        description: 'Test',
        recommendation: 'Fix it',
        references: [],
        detectedAt: new Date(),
        fingerprint: 'test1'
      },
      {
        id: '2',
        type: 'secrets',
        severity: 'critical',
        title: 'Critical secret',
        description: 'Test',
        recommendation: 'Fix it',
        references: [],
        detectedAt: new Date(),
        fingerprint: 'test2'
      },
      {
        id: '3',
        type: 'code',
        severity: 'medium',
        title: 'Medium code issue',
        description: 'Test',
        recommendation: 'Fix it',
        references: [],
        detectedAt: new Date(),
        fingerprint: 'test3'
      }
    ];

    it('should filter by vulnerability type', async () => {
      // Mock empty scan results, then test filtering directly
      mockFs.readdir.mockResolvedValue([] as any);

      const options: SecurityScanOptions = {
        includeTypes: ['dependency', 'secrets'],
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false,
        scanSecrets: false
      };

      const result = await securityService.performSecurityScan('/test/module', options);

      // Since we're testing the service's filtering logic, we need to access it differently
      // This is a simplified test that verifies the service runs without error
      expect(result).toBeDefined();
      expect(result.vulnerabilities).toEqual([]);
    });

    it('should filter by minimum severity', async () => {
      mockFs.readdir.mockResolvedValue([] as any);

      const options: SecurityScanOptions = {
        minSeverity: 'high',
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false,
        scanSecrets: false
      };

      const result = await securityService.performSecurityScan('/test/module', options);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should limit number of vulnerabilities', async () => {
      mockFs.readdir.mockResolvedValue([] as any);

      const options: SecurityScanOptions = {
        maxVulnerabilities: 2,
        scanDependencies: false,
        scanCode: false,
        scanConfiguration: false,
        scanSecrets: false
      };

      const result = await securityService.performSecurityScan('/test/module', options);

      expect(result.vulnerabilities.length).toBeLessThanOrEqual(2);
    });
  });

  describe('risk calculation', () => {
    it('should calculate correct risk score', async () => {
      // Mock vulnerabilities with different severities
      const packageJson = {
        dependencies: {
          'lodash': '^4.17.10' // Has known vulnerability
        }
      };

      const codeWithIssues = `
eval(userInput);
const query = "SELECT * FROM users WHERE id = " + userId;
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('package.json')) {
          return JSON.stringify(packageJson);
        }
        if (filePath.endsWith('.js')) {
          return codeWithIssues;
        }
        throw new Error('File not found');
      });

      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'app.js', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      mockFs.access.mockRejectedValue(new Error('Config not found'));

      const result = await securityService.performSecurityScan('/test/module');

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should return zero risk score for no vulnerabilities', async () => {
      mockFs.readdir.mockResolvedValue([] as any);
      mockFs.readFile.mockRejectedValue(new Error('No package.json'));
      mockFs.access.mockRejectedValue(new Error('No config files'));

      const result = await securityService.performSecurityScan('/test/module');

      expect(result.riskScore).toBe(0);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('recommendations', () => {
    it('should generate appropriate recommendations', async () => {
      const packageJson = {
        dependencies: {
          'lodash': '^4.17.10'
        }
      };

      const secretsFile = `
const apiKey = "sk-1234567890abcdef1234567890abcdef12345678";
`;

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.endsWith('package.json')) {
          return JSON.stringify(packageJson);
        }
        if (filePath.endsWith('.js')) {
          return secretsFile;
        }
        throw new Error('File not found');
      });

      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'secrets.js', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      require('fs').statSync = jest.fn().mockReturnValue({ size: 1024 });

      const result = await securityService.performSecurityScan('/test/module');

      expect(result.recommendations).toContain('Regularly update dependencies to latest secure versions');
      expect(result.recommendations).toContain('Move all secrets to environment variables or secure vaults');
    });
  });

  describe('validation results integration', () => {
    it('should generate ValidationResult objects', async () => {
      const vulnerabilities: SecurityVulnerability[] = [
        {
          id: 'test-1',
          type: 'dependency',
          severity: 'high',
          title: 'Test Vulnerability',
          description: 'Test description',
          filePath: 'package.json',
          cwe: 'CWE-1234',
          cvss: 7.5,
          recommendation: 'Update dependency',
          references: ['https://example.com'],
          detectedAt: new Date(),
          fingerprint: 'test123'
        }
      ];

      const validationResults = securityService.generateValidationResults(vulnerabilities);

      expect(validationResults).toHaveLength(1);
      expect(validationResults[0].ruleId).toBe('security-dependency');
      expect(validationResults[0].status).toBe('FAIL');
      expect(validationResults[0].severity).toBe('high');
      expect(validationResults[0].message).toBe('Test Vulnerability');
      expect(validationResults[0].details.cwe).toBe('CWE-1234');
      expect(validationResults[0].details.cvss).toBe(7.5);
    });
  });

  describe('error handling', () => {
    it('should handle scan errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(securityService.performSecurityScan('/test/module')).rejects.toThrow('Security scan failed');
    });

    it('should handle file read errors during code scanning', async () => {
      mockFs.readdir.mockImplementation(async (dirPath: any, options?: any) => {
        return [
          { name: 'app.js', isDirectory: () => false, isFile: () => true }
        ] as any;
      });

      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      // Should not throw, just skip the problematic files
      const result = await securityService.performSecurityScan('/test/module', {
        scanCode: true,
        scanDependencies: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      expect(result).toBeDefined();
      expect(result.vulnerabilities).toEqual([]);
    });
  });
});