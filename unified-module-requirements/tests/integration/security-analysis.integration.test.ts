import { SecurityAnalysisService } from '../../src/services/SecurityAnalysisService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jest } from '@jest/globals';

describe('SecurityAnalysisService Integration Tests', () => {
  let securityService: SecurityAnalysisService;
  let tempDir: string;

  beforeAll(async () => {
    securityService = new SecurityAnalysisService();
    tempDir = '/tmp/security-test-' + Date.now();

    // Create temporary test directory structure
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('end-to-end security scanning', () => {
    it('should perform comprehensive scan on vulnerable project', async () => {
      // Create test project structure
      await createVulnerableProject(tempDir);

      const result = await securityService.performSecurityScan(tempDir);

      // Verify scan results
      expect(result).toBeDefined();
      expect(result.scanId).toBeDefined();
      expect(result.modulePath).toBe(tempDir);
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Verify different vulnerability types are detected
      const types = new Set(result.vulnerabilities.map(v => v.type));
      expect(types.has('dependency')).toBe(true);
      expect(types.has('secrets')).toBe(true);
      expect(types.has('code')).toBe(true);

      // Verify severity distribution
      const severities = new Set(result.vulnerabilities.map(v => v.severity));
      expect(severities.size).toBeGreaterThan(1); // Multiple severity levels
    });

    it('should handle clean project without vulnerabilities', async () => {
      // Create clean project
      const cleanDir = path.join(tempDir, 'clean-project');
      await createCleanProject(cleanDir);

      const result = await securityService.performSecurityScan(cleanDir);

      expect(result.vulnerabilities.length).toBe(0);
      expect(result.summary.total).toBe(0);
      expect(result.riskScore).toBe(0);
    });

    it('should respect scan options and filters', async () => {
      await createVulnerableProject(tempDir);

      // Test dependency-only scan
      const depResult = await securityService.performSecurityScan(tempDir, {
        scanDependencies: true,
        scanCode: false,
        scanConfiguration: false,
        scanSecrets: false
      });

      const depTypes = new Set(depResult.vulnerabilities.map(v => v.type));
      expect(depTypes.has('dependency')).toBe(true);
      expect(depTypes.has('code')).toBe(false);
      expect(depTypes.has('secrets')).toBe(false);

      // Test severity filtering
      const highSevResult = await securityService.performSecurityScan(tempDir, {
        minSeverity: 'high'
      });

      const lowSevVulns = highSevResult.vulnerabilities.filter(v =>
        v.severity === 'low' || v.severity === 'info'
      );
      expect(lowSevVulns.length).toBe(0);
    });

    it('should generate consistent fingerprints for same vulnerabilities', async () => {
      await createVulnerableProject(tempDir);

      const result1 = await securityService.performSecurityScan(tempDir);
      const result2 = await securityService.performSecurityScan(tempDir);

      // Fingerprints should be identical for same vulnerabilities
      const fingerprints1 = result1.vulnerabilities.map(v => v.fingerprint).sort();
      const fingerprints2 = result2.vulnerabilities.map(v => v.fingerprint).sort();

      expect(fingerprints1).toEqual(fingerprints2);
    });

    it('should generate valid ValidationResult objects', async () => {
      await createVulnerableProject(tempDir);

      const scanResult = await securityService.performSecurityScan(tempDir);
      const validationResults = securityService.generateValidationResults(scanResult.vulnerabilities);

      expect(validationResults.length).toBe(scanResult.vulnerabilities.length);

      validationResults.forEach(result => {
        expect(result.ruleId).toMatch(/^security-/);
        expect(result.status).toBe('FAIL');
        expect(['critical', 'high', 'medium', 'low', 'info']).toContain(result.severity);
        expect(result.message).toBeDefined();
        expect(result.details).toBeDefined();
      });
    });
  });

  describe('performance and scalability', () => {
    it('should complete scan within reasonable time', async () => {
      await createLargeProject(tempDir);

      const startTime = Date.now();
      const result = await securityService.performSecurityScan(tempDir);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.performanceMetrics.duration).toBeLessThan(30000);
    });

    it('should handle projects with many files efficiently', async () => {
      const largeDir = path.join(tempDir, 'large-project');
      await createProjectWithManyFiles(largeDir);

      const result = await securityService.performSecurityScan(largeDir);

      expect(result).toBeDefined();
      expect(result.performanceMetrics.duration).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle non-existent directories', async () => {
      await expect(
        securityService.performSecurityScan('/non/existent/path')
      ).rejects.toThrow();
    });

    it('should handle permission denied errors gracefully', async () => {
      // This test would require creating files with restricted permissions
      // which might not work in all test environments
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.mkdir(restrictedDir, { recursive: true });

      // In a real environment, you would restrict permissions here
      // For testing, we'll just verify the service handles missing files
      const result = await securityService.performSecurityScan(restrictedDir);
      expect(result).toBeDefined();
    });

    it('should handle corrupted or binary files', async () => {
      const binaryDir = path.join(tempDir, 'binary-project');
      await fs.mkdir(binaryDir, { recursive: true });

      // Create a binary file
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
      await fs.writeFile(path.join(binaryDir, 'image.png'), binaryData);

      const result = await securityService.performSecurityScan(binaryDir);
      expect(result).toBeDefined();
      // Should not find vulnerabilities in binary files
      expect(result.vulnerabilities.filter(v => v.filePath?.includes('image.png'))).toHaveLength(0);
    });
  });
});

// Helper functions to create test projects

async function createVulnerableProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // Create vulnerable package.json
  const packageJson = {
    name: 'vulnerable-project',
    version: '1.0.0',
    dependencies: {
      'lodash': '^4.17.10', // Known vulnerability
      'axios': '^0.21.1',   // Known vulnerability
      'express': '^4.17.0'  // Known vulnerability
    },
    devDependencies: {
      'jest': '^26.0.0'
    }
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create vulnerable code files
  const vulnerableJs = `
// Vulnerable JavaScript code
const userInput = req.body.code;
eval(userInput); // Dangerous!

const query = "SELECT * FROM users WHERE id = " + userId; // SQL injection
db.query(query);

element.innerHTML = '<div>' + userInput + '</div>'; // XSS

const command = 'ls -la ' + userPath;
execSync(command); // Command injection
`;
  await fs.writeFile(path.join(dir, 'app.js'), vulnerableJs);

  // Create file with exposed secrets
  const secretsFile = `
// FAKE VALUES FOR TESTING - These are obviously fake to prevent GitHub secret scanning alerts
        // File with exposed secrets
const config = {
  apiKey: "fake-sk-test-1234567890abcdef12345678",
  githubToken: "ghp_1234567890abcdef1234567890abcdef123456",
  databaseUrl: "postgresql://user:password@localhost:5432/db",
  stripeSecret: "fake-sk-test-1234567890abcdef1234567890abcdef",
  awsAccessKey: "AKIA1234567890ABCDEF",
  awsSecretKey: "abcdef1234567890abcdef1234567890abcdef12"
};
`;
  await fs.writeFile(path.join(dir, 'secrets.js'), secretsFile);

  // Create insecure configuration
  const configJson = {
    ssl: false,
    debug: true,
    cors: "*",
    allowAll: true,
    security: false
  };
  await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify(configJson, null, 2));

  // Create .env file with default credentials
  const envFile = `
DB_USER=admin
DB_PASSWORD=password
API_SECRET=secret
ADMIN_KEY=admin
`;
  await fs.writeFile(path.join(dir, '.env'), envFile);

  // Create TypeScript file with vulnerabilities
  const vulnerableTs = `
interface User {
  id: string;
  name: string;
}

class UserService {
  getUser(id: string): User {
    // Dangerous function usage
    const result = eval('getUserById(' + id + ')');
    return result;
  }

  updateUser(data: any): void {
    // SQL injection vulnerability
    const query = \`UPDATE users SET name = '\${data.name}' WHERE id = \${data.id}\`;
    this.db.query(query);
  }
}
`;
  await fs.writeFile(path.join(dir, 'user.service.ts'), vulnerableTs);
}

async function createCleanProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // Clean package.json with secure dependencies
  const packageJson = {
    name: 'clean-project',
    version: '1.0.0',
    dependencies: {
      'lodash': '^4.17.21', // Latest secure version
      'axios': '^1.6.0',    // Latest secure version
      'express': '^4.18.2'  // Latest secure version
    }
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Clean code file
  const cleanJs = `
// Clean JavaScript code
const express = require('express');
const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  // Proper parameterized query
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results);
  });
});

module.exports = app;
`;
  await fs.writeFile(path.join(dir, 'app.js'), cleanJs);

  // Secure configuration
  const configJson = {
    ssl: true,
    debug: false,
    cors: {
      origin: ["https://example.com"],
      credentials: true
    },
    security: {
      helmet: true,
      rateLimit: true
    }
  };
  await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify(configJson, null, 2));
}

async function createLargeProject(dir: string): Promise<void> {
  await createVulnerableProject(dir);

  // Create additional directories and files
  const srcDir = path.join(dir, 'src');
  await fs.mkdir(srcDir, { recursive: true });

  const testDir = path.join(dir, 'test');
  await fs.mkdir(testDir, { recursive: true });

  // Create multiple source files
  for (let i = 0; i < 10; i++) {
    const content = `
// Source file ${i}
export class Service${i} {
  process(data: any): any {
    return data;
  }
}
`;
    await fs.writeFile(path.join(srcDir, `service${i}.ts`), content);
  }

  // Create test files
  for (let i = 0; i < 5; i++) {
    const content = `
// Test file ${i}
describe('Service${i}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`;
    await fs.writeFile(path.join(testDir, `service${i}.test.ts`), content);
  }
}

async function createProjectWithManyFiles(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // Create many small files
  for (let i = 0; i < 50; i++) {
    const content = `// File ${i}\nconsole.log('Hello ${i}');\n`;
    await fs.writeFile(path.join(dir, `file${i}.js`), content);
  }

  // Create some with potential issues
  for (let i = 0; i < 5; i++) {
    const content = `
// File with eval ${i}
const result = eval('1 + 1');
console.log(result);
`;
    await fs.writeFile(path.join(dir, `eval${i}.js`), content);
  }
}