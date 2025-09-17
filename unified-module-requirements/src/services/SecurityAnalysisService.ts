import { ValidationResult } from '../models/ValidationReport.js';
import { PerformanceMetrics } from '../models/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface SecurityVulnerability {
  id: string;
  type: 'dependency' | 'code' | 'configuration' | 'secrets' | 'permissions' | 'injection';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  filePath?: string;
  lineNumber?: number;
  cwe?: string; // Common Weakness Enumeration
  cvss?: number; // Common Vulnerability Scoring System
  affectedPackage?: string;
  affectedVersion?: string;
  fixedVersion?: string;
  recommendation: string;
  references: string[];
  detectedAt: Date;
  fingerprint: string;
}

export interface SecurityScanOptions {
  scanDependencies?: boolean;
  scanCode?: boolean;
  scanConfiguration?: boolean;
  scanSecrets?: boolean;
  includeTypes?: SecurityVulnerability['type'][];
  excludeTypes?: SecurityVulnerability['type'][];
  minSeverity?: SecurityVulnerability['severity'];
  maxVulnerabilities?: number;
  timeout?: number;
}

export interface SecurityScanResult {
  scanId: string;
  modulePath: string;
  timestamp: Date;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  riskScore: number; // 0-100 where 100 is highest risk
  performanceMetrics: PerformanceMetrics;
  recommendations: string[];
}

export interface DependencyVulnerability {
  package: string;
  version: string;
  vulnerability: {
    id: string;
    title: string;
    description: string;
    severity: string;
    cvss: number;
    cwe: string;
    references: string[];
    fixedIn?: string;
  };
}

export class SecurityAnalysisService {
  private vulnerabilityDatabase: Map<string, any> = new Map();
  private secretPatterns: RegExp[] = [];
  private dangerousFunctions: Set<string> = new Set();

  constructor() {
    this.initializeSecurityRules();
  }

  /**
   * Initialize security rules and patterns
   */
  private initializeSecurityRules(): void {
    // Secret detection patterns
    this.secretPatterns = [
      /api[_-]?key[_-]?[:=]\s*['"]+([a-zA-Z0-9]{20,})['"]+/i, // API keys
      /secret[_-]?key[_-]?[:=]\s*['"]+([a-zA-Z0-9]{20,})['"]+/i, // Secret keys
      /password[_-]?[:=]\s*['"]+([a-zA-Z0-9!@#$%^&*]{8,})['"]+/i, // Passwords
      /token[_-]?[:=]\s*['"]+([a-zA-Z0-9._-]{20,})['"]+/i, // Tokens
      /private[_-]?key[_-]?[:=]\s*['"]+([a-zA-Z0-9+/=]{50,})['"]+/i, // Private keys
      /access[_-]?key[_-]?[:=]\s*['"]+([A-Z0-9]{20,})['"]+/i, // AWS access keys
      /secret[_-]?access[_-]?key[_-]?[:=]\s*['"]+([a-zA-Z0-9/+=]{40,})['"]+/i, // AWS secret keys
      /database[_-]?url[_-]?[:=]\s*['"]+([a-zA-Z0-9:/._@-]{20,})['"]+/i, // Database URLs
      /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access tokens
      /gho_[a-zA-Z0-9]{36}/, // GitHub OAuth tokens
      /sk-[a-zA-Z0-9]{48}/, // OpenAI API keys
      /xoxb-[a-zA-Z0-9-]{50,}/, // Slack bot tokens
      /AIza[a-zA-Z0-9_-]{35}/, // Google API keys
      /sk_live_[a-zA-Z0-9]{24,}/, // Stripe live keys
      /sk_test_[a-zA-Z0-9]{24,}/, // Stripe test keys
    ];

    // Dangerous functions that could lead to security issues
    this.dangerousFunctions = new Set([
      'eval',
      'Function',
      'execSync',
      'exec',
      'spawn',
      'innerHTML',
      'outerHTML',
      'document.write',
      'setTimeout',
      'setInterval',
      'setImmediate',
      'process.env',
      'require',
      'import',
      '__dirname',
      '__filename'
    ]);

    // Load vulnerability database (simplified - in production would use real CVE database)
    this.loadVulnerabilityDatabase();
  }

  /**
   * Load known vulnerability database
   */
  private loadVulnerabilityDatabase(): void {
    // Simplified vulnerability database - in production this would be loaded from external sources
    const knownVulnerabilities = [
      {
        package: 'lodash',
        versions: ['<4.17.11'],
        vulnerability: {
          id: 'CVE-2018-16487',
          title: 'Prototype Pollution',
          description: 'Lodash versions prior to 4.17.11 are vulnerable to prototype pollution',
          severity: 'high',
          cvss: 7.5,
          cwe: 'CWE-1321',
          references: ['https://nvd.nist.gov/vuln/detail/CVE-2018-16487'],
          fixedIn: '4.17.11'
        }
      },
      {
        package: 'axios',
        versions: ['<0.21.2'],
        vulnerability: {
          id: 'CVE-2021-3749',
          title: 'Regular Expression Denial of Service',
          description: 'Axios prior to 0.21.2 is vulnerable to ReDoS',
          severity: 'medium',
          cvss: 5.3,
          cwe: 'CWE-1333',
          references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-3749'],
          fixedIn: '0.21.2'
        }
      },
      {
        package: 'express',
        versions: ['<4.18.0'],
        vulnerability: {
          id: 'CVE-2022-24999',
          title: 'Path Traversal',
          description: 'Express.js is vulnerable to path traversal attacks',
          severity: 'high',
          cvss: 8.1,
          cwe: 'CWE-22',
          references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-24999'],
          fixedIn: '4.18.0'
        }
      }
    ];

    knownVulnerabilities.forEach(vuln => {
      this.vulnerabilityDatabase.set(vuln.package, vuln);
    });
  }

  /**
   * Perform comprehensive security scan
   */
  async performSecurityScan(
    modulePath: string,
    options: SecurityScanOptions = {}
  ): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const vulnerabilities: SecurityVulnerability[] = [];

      // Dependency vulnerability scanning
      if (options.scanDependencies !== false) {
        const depVulns = await this.scanDependencies(modulePath);
        vulnerabilities.push(...depVulns);
      }

      // Code vulnerability scanning
      if (options.scanCode !== false) {
        const codeVulns = await this.scanCode(modulePath);
        vulnerabilities.push(...codeVulns);
      }

      // Configuration vulnerability scanning
      if (options.scanConfiguration !== false) {
        const configVulns = await this.scanConfiguration(modulePath);
        vulnerabilities.push(...configVulns);
      }

      // Secret scanning
      if (options.scanSecrets !== false) {
        const secretVulns = await this.scanSecrets(modulePath);
        vulnerabilities.push(...secretVulns);
      }

      // Filter vulnerabilities based on options
      const filteredVulnerabilities = this.filterVulnerabilities(vulnerabilities, options);

      // Calculate summary
      const summary = this.calculateSummary(filteredVulnerabilities);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(filteredVulnerabilities);

      // Generate recommendations
      const recommendations = this.generateRecommendations(filteredVulnerabilities);

      return {
        scanId,
        modulePath,
        timestamp: new Date(),
        vulnerabilities: filteredVulnerabilities,
        summary,
        riskScore,
        performanceMetrics: this.createPerformanceMetrics('security_scan', startTime),
        recommendations
      };

    } catch (error) {
      throw new Error(`Security scan failed: ${error}`);
    }
  }

  /**
   * Scan dependencies for known vulnerabilities
   */
  private async scanDependencies(modulePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      const packageJsonPath = path.join(modulePath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      for (const [packageName, version] of Object.entries(dependencies)) {
        const vulnerability = this.checkPackageVulnerability(packageName, version as string);
        if (vulnerability) {
          const vulnData: SecurityVulnerability = {
            id: `dep-${vulnerability.vulnerability.id}`,
            type: 'dependency',
            severity: vulnerability.vulnerability.severity as SecurityVulnerability['severity'],
            title: `${packageName}: ${vulnerability.vulnerability.title}`,
            description: vulnerability.vulnerability.description,
            filePath: 'package.json',
            cwe: vulnerability.vulnerability.cwe,
            cvss: vulnerability.vulnerability.cvss,
            affectedPackage: packageName,
            affectedVersion: version as string,
            remediation: `Update ${packageName} to version ${vulnerability.vulnerability.fixedIn || 'latest'} or higher`,
            references: vulnerability.vulnerability.references,
            fingerprint: this.generateFingerprint('dependency', packageName, vulnerability.vulnerability.id)
          };

          // Only add fixedVersion if it exists
          if (vulnerability.vulnerability.fixedIn) {
            vulnData.fixedVersion = vulnerability.vulnerability.fixedIn;
          }

          vulnerabilities.push(vulnData);
        }
      }

    } catch (error) {
      // package.json not found or invalid - skip dependency scanning
    }

    return vulnerabilities;
  }

  /**
   * Scan code for security vulnerabilities
   */
  private async scanCode(modulePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      const files = await this.findCodeFiles(modulePath);

      for (const filePath of files) {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');

        // Scan for dangerous function usage
        lines.forEach((line, index) => {
          this.dangerousFunctions.forEach(dangerousFunc => {
            if (line.includes(dangerousFunc) && !this.isInComment(line)) {
              vulnerabilities.push({
                id: `code-${Date.now()}-${index}`,
                type: 'code',
                severity: this.getDangerousFunctionSeverity(dangerousFunc),
                title: `Potentially dangerous function: ${dangerousFunc}`,
                description: `Usage of ${dangerousFunc} may lead to security vulnerabilities`,
                filePath: path.relative(modulePath, filePath),
                lineNumber: index + 1,
                cwe: this.getDangerousFunctionCWE(dangerousFunc),
                recommendation: `Review usage of ${dangerousFunc} and consider safer alternatives`,
                references: [
                  'https://owasp.org/www-project-top-ten/',
                  'https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html'
                ],
                detectedAt: new Date(),
                fingerprint: this.generateFingerprint('code', filePath, `${dangerousFunc}-${index}`)
              });
            }
          });

          // Check for SQL injection patterns
          if (this.containsSQLInjectionPattern(line)) {
            vulnerabilities.push({
              id: `sqli-${Date.now()}-${index}`,
              type: 'injection',
              severity: 'high',
              title: 'Potential SQL Injection',
              description: 'Code may be vulnerable to SQL injection attacks',
              filePath: path.relative(modulePath, filePath),
              lineNumber: index + 1,
              cwe: 'CWE-89',
              cvss: 8.5,
              recommendation: 'Use parameterized queries or prepared statements',
              references: [
                'https://owasp.org/www-community/attacks/SQL_Injection',
                'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
              ],
              detectedAt: new Date(),
              fingerprint: this.generateFingerprint('injection', filePath, `sqli-${index}`)
            });
          }

          // Check for XSS patterns
          if (this.containsXSSPattern(line)) {
            vulnerabilities.push({
              id: `xss-${Date.now()}-${index}`,
              type: 'injection',
              severity: 'high',
              title: 'Potential Cross-Site Scripting (XSS)',
              description: 'Code may be vulnerable to XSS attacks',
              filePath: path.relative(modulePath, filePath),
              lineNumber: index + 1,
              cwe: 'CWE-79',
              cvss: 7.5,
              recommendation: 'Properly sanitize and escape user input before rendering',
              references: [
                'https://owasp.org/www-community/attacks/xss/',
                'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
              ],
              detectedAt: new Date(),
              fingerprint: this.generateFingerprint('injection', filePath, `xss-${index}`)
            });
          }
        });
      }

    } catch (error) {
      // Error scanning code files
    }

    return vulnerabilities;
  }

  /**
   * Scan configuration files for security issues
   */
  private async scanConfiguration(modulePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      const configFiles = await this.findConfigurationFiles(modulePath);

      for (const filePath of configFiles) {
        const content = await fs.readFile(filePath, 'utf8');
        const relativePath = path.relative(modulePath, filePath);

        // Check for insecure configurations
        if (this.hasInsecureConfiguration(content, relativePath)) {
          vulnerabilities.push({
            id: `config-${Date.now()}`,
            type: 'configuration',
            severity: 'medium',
            title: 'Insecure Configuration',
            description: 'Configuration file contains potentially insecure settings',
            filePath: relativePath,
            cwe: 'CWE-16',
            recommendation: 'Review and harden configuration settings',
            references: [
              'https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration',
              'https://cheatsheetseries.owasp.org/cheatsheets/Configuration_Cheat_Sheet.html'
            ],
            detectedAt: new Date(),
            fingerprint: this.generateFingerprint('configuration', filePath, 'insecure-config')
          });
        }

        // Check for default credentials
        if (this.hasDefaultCredentials(content)) {
          vulnerabilities.push({
            id: `creds-${Date.now()}`,
            type: 'configuration',
            severity: 'high',
            title: 'Default Credentials',
            description: 'Configuration contains default or weak credentials',
            filePath: relativePath,
            cwe: 'CWE-1391',
            cvss: 8.0,
            recommendation: 'Change default credentials and use strong, unique passwords',
            references: [
              'https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication'
            ],
            detectedAt: new Date(),
            fingerprint: this.generateFingerprint('configuration', filePath, 'default-creds')
          });
        }
      }

    } catch (error) {
      // Error scanning configuration files
    }

    return vulnerabilities;
  }

  /**
   * Scan for exposed secrets and credentials
   */
  private async scanSecrets(modulePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      const files = await this.findAllFiles(modulePath);

      for (const filePath of files) {
        // Skip binary files and large files
        if (this.shouldSkipFile(filePath)) {
          continue;
        }

        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(modulePath, filePath);

        lines.forEach((line, index) => {
          this.secretPatterns.forEach((pattern, patternIndex) => {
            const match = pattern.exec(line);
            if (match && !this.isInComment(line)) {
              vulnerabilities.push({
                id: `secret-${Date.now()}-${patternIndex}-${index}`,
                type: 'secrets',
                severity: this.getSecretSeverity(pattern),
                title: 'Exposed Secret',
                description: `Potential secret or credential detected in ${relativePath}`,
                filePath: relativePath,
                lineNumber: index + 1,
                cwe: 'CWE-798',
                cvss: 7.5,
                recommendation: 'Remove hardcoded secrets and use environment variables or secure vaults',
                references: [
                  'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure',
                  'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html'
                ],
                detectedAt: new Date(),
                fingerprint: this.generateFingerprint('secrets', filePath, `pattern-${patternIndex}-${index}`)
              });
            }
          });
        });
      }

    } catch (error) {
      // Error scanning for secrets
    }

    return vulnerabilities;
  }

  /**
   * Check if a package has known vulnerabilities
   */
  private checkPackageVulnerability(packageName: string, version: string): DependencyVulnerability | null {
    const vulnData = this.vulnerabilityDatabase.get(packageName);
    if (!vulnData) {
      return null;
    }

    // Simple version check - in production would use semver
    const isVulnerable = vulnData.versions.some((vulnVersion: string) => {
      return this.versionMatches(version, vulnVersion);
    });

    if (isVulnerable) {
      return {
        package: packageName,
        version,
        vulnerability: vulnData.vulnerability
      };
    }

    return null;
  }

  /**
   * Simple version matching (in production would use semver library)
   */
  private versionMatches(version: string, pattern: string): boolean {
    // Remove ^ and ~ prefixes
    const cleanVersion = version.replace(/^[\^~]/, '');

    if (pattern.startsWith('<')) {
      const targetVersion = pattern.substring(1);
      return this.compareVersions(cleanVersion, targetVersion) < 0;
    }

    return cleanVersion === pattern;
  }

  /**
   * Simple version comparison (in production would use semver library)
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }

    return 0;
  }

  /**
   * Find code files in module
   */
  private async findCodeFiles(modulePath: string): Promise<string[]> {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go'];
    return this.findFilesByExtensions(modulePath, codeExtensions);
  }

  /**
   * Find configuration files in module
   */
  private async findConfigurationFiles(modulePath: string): Promise<string[]> {
    const configFiles = ['package.json', '.env', '.env.local', '.env.production', 'config.json', 'config.yaml', 'config.yml'];
    const files: string[] = [];

    for (const fileName of configFiles) {
      const filePath = path.join(modulePath, fileName);
      try {
        await fs.access(filePath);
        files.push(filePath);
      } catch {
        // File doesn't exist
      }
    }

    return files;
  }

  /**
   * Find all files in module (for secret scanning)
   */
  private async findAllFiles(modulePath: string): Promise<string[]> {
    const allFiles: string[] = [];

    const scan = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip node_modules, .git, and other ignored directories
          if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            allFiles.push(fullPath);
          }
        }
      } catch {
        // Permission denied or other error
      }
    };

    await scan(modulePath);
    return allFiles;
  }

  /**
   * Find files by extensions
   */
  private async findFilesByExtensions(modulePath: string, extensions: string[]): Promise<string[]> {
    const files = await this.findAllFiles(modulePath);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return extensions.includes(ext);
    });
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage', '.nyc_output'];
    return skipDirs.includes(dirName);
  }

  /**
   * Check if file should be skipped for secret scanning
   */
  private shouldSkipFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Skip binary files
    const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.jar', '.zip', '.tar', '.gz', '.rar', '.7z', '.img', '.iso'];
    if (binaryExtensions.includes(ext)) {
      return true;
    }

    // Skip large files (>1MB)
    try {
      const stats = require('fs').statSync(filePath);
      if (stats.size > 1024 * 1024) {
        return true;
      }
    } catch {
      return true;
    }

    // Skip certain file patterns
    const skipPatterns = ['.min.js', '.min.css', 'package-lock.json', 'yarn.lock'];
    return skipPatterns.some(pattern => fileName.includes(pattern));
  }

  /**
   * Check if line is in a comment
   */
  private isInComment(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  }

  /**
   * Check for SQL injection patterns
   */
  private containsSQLInjectionPattern(line: string): boolean {
    const sqlPatterns = [
      /query\s*\+\s*[\w\s]*[\'"]/i, // String concatenation in queries
      /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)/i, // Template literals with SQL
      /['"].*\+.*['"].*(?:SELECT|INSERT|UPDATE|DELETE)/i, // String concatenation with SQL keywords
      /exec\s*\(\s*['"].*\+/i, // Dynamic query execution
    ];

    return sqlPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check for XSS patterns
   */
  private containsXSSPattern(line: string): boolean {
    const xssPatterns = [
      /innerHTML\s*=\s*.*[\+\$\{]/i, // Dynamic innerHTML assignment
      /outerHTML\s*=\s*.*[\+\$\{]/i, // Dynamic outerHTML assignment
      /document\.write\s*\(\s*.*[\+\$\{]/i, // Dynamic document.write
      /eval\s*\(\s*.*[\+\$\{]/i, // Dynamic eval usage
      /setTimeout\s*\(\s*.*[\+\$\{]/i, // Dynamic setTimeout
      /setInterval\s*\(\s*.*[\+\$\{]/i, // Dynamic setInterval
    ];

    return xssPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check for insecure configuration
   */
  private hasInsecureConfiguration(content: string, filePath: string): boolean {
    const insecurePatterns = [
      /ssl\s*[:=]\s*false/i, // SSL disabled
      /secure\s*[:=]\s*false/i, // Security disabled
      /debug\s*[:=]\s*true/i, // Debug enabled in production
      /cors\s*[:=]\s*\*/i, // CORS allow all
      /origin\s*[:=]\s*\*/i, // Origin allow all
    ];

    // Skip certain files where these might be acceptable
    if (filePath.includes('test') || filePath.includes('development')) {
      return false;
    }

    return insecurePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check for default credentials
   */
  private hasDefaultCredentials(content: string): boolean {
    const defaultCredPatterns = [
      /password\s*[:=]\s*['"](?:password|admin|root|123456|qwerty)['"]/i,
      /user\s*[:=]\s*['"](?:admin|root|user)['"]/i,
      /username\s*[:=]\s*['"](?:admin|root|user)['"]/i,
      /secret\s*[:=]\s*['"](?:secret|password|admin)['"]/i,
    ];

    return defaultCredPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get severity for dangerous functions
   */
  private getDangerousFunctionSeverity(functionName: string): SecurityVulnerability['severity'] {
    const highRiskFunctions = ['eval', 'Function', 'execSync', 'exec'];
    const mediumRiskFunctions = ['innerHTML', 'outerHTML', 'document.write'];

    if (highRiskFunctions.includes(functionName)) {
      return 'high';
    } else if (mediumRiskFunctions.includes(functionName)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get CWE for dangerous functions
   */
  private getDangerousFunctionCWE(functionName: string): string {
    const cweMap: Record<string, string> = {
      'eval': 'CWE-95',
      'Function': 'CWE-95',
      'execSync': 'CWE-78',
      'exec': 'CWE-78',
      'innerHTML': 'CWE-79',
      'outerHTML': 'CWE-79',
      'document.write': 'CWE-79'
    };

    return cweMap[functionName] || 'CWE-1321';
  }

  /**
   * Get severity for secret patterns
   */
  private getSecretSeverity(pattern: RegExp): SecurityVulnerability['severity'] {
    const patternString = pattern.toString();

    if (patternString.includes('private') || patternString.includes('secret')) {
      return 'critical';
    } else if (patternString.includes('api') || patternString.includes('token')) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Filter vulnerabilities based on options
   */
  private filterVulnerabilities(
    vulnerabilities: SecurityVulnerability[],
    options: SecurityScanOptions
  ): SecurityVulnerability[] {
    let filtered = vulnerabilities;

    // Filter by type
    if (options.includeTypes && options.includeTypes.length > 0) {
      filtered = filtered.filter(v => options.includeTypes!.includes(v.type));
    }

    if (options.excludeTypes && options.excludeTypes.length > 0) {
      filtered = filtered.filter(v => !options.excludeTypes!.includes(v.type));
    }

    // Filter by severity
    if (options.minSeverity) {
      const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(options.minSeverity);
      filtered = filtered.filter(v => {
        const vIndex = severityOrder.indexOf(v.severity);
        return vIndex >= minIndex;
      });
    }

    // Limit number of vulnerabilities
    if (options.maxVulnerabilities && filtered.length > options.maxVulnerabilities) {
      filtered = filtered
        .sort((a, b) => {
          const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
          return severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity);
        })
        .slice(0, options.maxVulnerabilities);
    }

    return filtered;
  }

  /**
   * Calculate vulnerability summary
   */
  private calculateSummary(vulnerabilities: SecurityVulnerability[]): SecurityScanResult['summary'] {
    const summary = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    vulnerabilities.forEach(vuln => {
      summary[vuln.severity]++;
    });

    return summary;
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) {
      return 0;
    }

    const weights = {
      critical: 50,
      high: 20,
      medium: 10,
      low: 5,
      info: 1
    };

    const totalScore = vulnerabilities.reduce((score, vuln) => {
      return score + weights[vuln.severity];
    }, 0);

    // Normalize to 0-100 scale
    const maxPossibleScore = vulnerabilities.length * weights.critical;
    return Math.min(100, Math.round((totalScore / maxPossibleScore) * 100));
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations = new Set<string>();

    // General recommendations based on vulnerability types
    const types = new Set(vulnerabilities.map(v => v.type));

    if (types.has('dependency')) {
      recommendations.add('Regularly update dependencies to latest secure versions');
      recommendations.add('Use dependency scanning tools in your CI/CD pipeline');
      recommendations.add('Consider using automated dependency update tools like Dependabot');
    }

    if (types.has('secrets')) {
      recommendations.add('Move all secrets to environment variables or secure vaults');
      recommendations.add('Add secret scanning to your pre-commit hooks');
      recommendations.add('Rotate any exposed credentials immediately');
    }

    if (types.has('injection')) {
      recommendations.add('Use parameterized queries and prepared statements');
      recommendations.add('Implement input validation and sanitization');
      recommendations.add('Follow OWASP guidelines for injection prevention');
    }

    if (types.has('code')) {
      recommendations.add('Avoid using dangerous functions like eval() and exec()');
      recommendations.add('Implement code review processes focusing on security');
      recommendations.add('Use static analysis security testing (SAST) tools');
    }

    if (types.has('configuration')) {
      recommendations.add('Harden configuration files and remove default credentials');
      recommendations.add('Enable security features like SSL/TLS and secure headers');
      recommendations.add('Follow security configuration guidelines for your platform');
    }

    // Severity-based recommendations
    const severities = vulnerabilities.map(v => v.severity);
    if (severities.includes('critical') || severities.includes('high')) {
      recommendations.add('Address critical and high-severity vulnerabilities immediately');
      recommendations.add('Consider implementing a security incident response plan');
    }

    if (vulnerabilities.length > 10) {
      recommendations.add('Implement a systematic approach to vulnerability management');
      recommendations.add('Prioritize fixes based on risk and exploitability');
    }

    return Array.from(recommendations);
  }

  /**
   * Generate fingerprint for vulnerability deduplication
   */
  private generateFingerprint(type: string, filePath: string, identifier: string): string {
    const data = `${type}:${filePath}:${identifier}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Create performance metrics
   */
  private createPerformanceMetrics(operation: string, startTime: number): PerformanceMetrics {
    const endTime = Date.now();
    return {
      operation,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: endTime - startTime,
      customMetrics: {}
    };
  }

  /**
   * Generate ValidationResult for integration with validation system
   */
  generateValidationResults(vulnerabilities: SecurityVulnerability[]): ValidationResult[] {
    return vulnerabilities.map((vuln, index) => ({
      resultId: `sec-result-${Date.now()}-${index}`,
      ruleId: `security-${vuln.type}`,
      ruleName: `Security: ${vuln.type}`,
      status: 'FAIL' as const,
      severity: vuln.severity,
      message: vuln.title,
      details: {
        description: vuln.description,
        filePath: vuln.filePath,
        lineNumber: vuln.lineNumber,
        cwe: vuln.cwe,
        cvss: vuln.cvss,
        references: vuln.references,
        fingerprint: vuln.fingerprint
      },
      remediation: vuln.remediation,
      canAutoFix: false,
      executionTime: 0
    }));
  }
}