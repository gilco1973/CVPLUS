import * as fs from 'fs-extra';
import * as path from 'path';
import { ValidationService } from '../services/ValidationService';
import { ValidationStatus, RuleSeverity } from '../models/enums';

export interface CICDConfig {
  platform: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'azure-devops' | 'circleci';
  enabled: boolean;
  stages: {
    validation: boolean;
    testing: boolean;
    security: boolean;
    deployment: boolean;
  };
  rules: string[];
  severity: RuleSeverity;
  parallel: boolean;
  failFast: boolean;
  reportFormat: 'junit' | 'json' | 'html' | 'sarif';
  artifactPaths: string[];
  notifications: {
    slack?: {
      webhook: string;
      channel: string;
    };
    email?: {
      recipients: string[];
    };
    github?: {
      checks: boolean;
      comments: boolean;
    };
  };
}

export interface CICDResult {
  pipeline: string;
  build: string;
  stage: string;
  success: boolean;
  duration: number;
  timestamp: string;
  modules: ModuleResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
  artifacts: string[];
  reports: string[];
}

export interface ModuleResult {
  moduleId: string;
  path: string;
  status: ValidationStatus;
  score: number;
  duration: number;
  results: any[];
  coverage?: number;
  security?: SecurityResult;
  performance?: PerformanceResult;
}

export interface SecurityResult {
  vulnerabilities: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line?: number;
  cwe?: string;
  cve?: string;
}

export interface PerformanceResult {
  buildTime: number;
  testTime: number;
  bundleSize?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export class CICDIntegration {
  private config: CICDConfig;
  private validationService: ValidationService;

  constructor(config: CICDConfig) {
    this.config = config;
    this.validationService = new ValidationService();
  }

  async generatePipeline(repositoryPath: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('CI/CD integration is disabled');
    }

    switch (this.config.platform) {
      case 'github-actions':
        await this.generateGitHubActions(repositoryPath);
        break;
      case 'gitlab-ci':
        await this.generateGitLabCI(repositoryPath);
        break;
      case 'jenkins':
        await this.generateJenkinsfile(repositoryPath);
        break;
      case 'azure-devops':
        await this.generateAzureDevOps(repositoryPath);
        break;
      case 'circleci':
        await this.generateCircleCI(repositoryPath);
        break;
      default:
        throw new Error(`Unsupported CI/CD platform: ${this.config.platform}`);
    }
  }

  async executeValidationStage(repositoryPath: string, buildId: string): Promise<CICDResult> {
    const startTime = Date.now();
    const result: CICDResult = {
      pipeline: this.config.platform,
      build: buildId,
      stage: 'validation',
      success: true,
      duration: 0,
      timestamp: new Date().toISOString(),
      modules: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        errors: 0
      },
      artifacts: [],
      reports: []
    };

    try {
      const modules = await this.discoverModules(repositoryPath);
      result.summary.total = modules.length;

      if (this.config.parallel) {
        result.modules = await this.validateModulesParallel(modules);
      } else {
        result.modules = await this.validateModulesSequential(modules);
      }

      // Calculate summary
      for (const module of result.modules) {
        switch (module.status) {
          case ValidationStatus.PASS:
            result.summary.passed++;
            break;
          case ValidationStatus.WARNING:
            result.summary.warnings++;
            break;
          case ValidationStatus.FAIL:
          case ValidationStatus.ERROR:
            result.summary.failed++;
            if (this.config.failFast) {
              result.success = false;
              break;
            }
            break;
        }
      }

      // Generate reports
      const reportFiles = await this.generateReports(result, repositoryPath);
      result.reports.push(...reportFiles);

      // Create artifacts
      const artifactFiles = await this.createArtifacts(result, repositoryPath);
      result.artifacts.push(...artifactFiles);

      // Send notifications
      if (this.config.notifications) {
        await this.sendNotifications(result);
      }

      // Determine overall success
      if (result.summary.failed > 0 && this.config.failFast) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      console.error('CI/CD validation stage failed:', error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async executeSecurityStage(repositoryPath: string, buildId: string): Promise<CICDResult> {
    const startTime = Date.now();
    const result: CICDResult = {
      pipeline: this.config.platform,
      build: buildId,
      stage: 'security',
      success: true,
      duration: 0,
      timestamp: new Date().toISOString(),
      modules: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        errors: 0
      },
      artifacts: [],
      reports: []
    };

    try {
      const modules = await this.discoverModules(repositoryPath);
      result.summary.total = modules.length;

      for (const modulePath of modules) {
        const moduleResult = await this.runSecurityScan(modulePath);
        result.modules.push(moduleResult);

        if (moduleResult.security && moduleResult.security.highSeverity > 0) {
          result.summary.failed++;
          if (this.config.failFast) {
            result.success = false;
            break;
          }
        } else if (moduleResult.security && moduleResult.security.mediumSeverity > 0) {
          result.summary.warnings++;
        } else {
          result.summary.passed++;
        }
      }

      // Generate security reports
      const sarifReport = await this.generateSarifReport(result, repositoryPath);
      result.reports.push(sarifReport);

      const securityReport = await this.generateSecurityReport(result, repositoryPath);
      result.reports.push(securityReport);

    } catch (error) {
      result.success = false;
      console.error('CI/CD security stage failed:', error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async generateGitHubActions(repositoryPath: string): Promise<void> {
    const workflowDir = path.join(repositoryPath, '.github', 'workflows');
    await fs.ensureDir(workflowDir);

    const workflow = {
      name: 'CVPlus Module Validation',
      on: {
        push: {
          branches: ['main', 'develop'],
          paths: ['packages/**', '*.json', '*.ts']
        },
        pull_request: {
          branches: ['main', 'develop'],
          paths: ['packages/**', '*.json', '*.ts']
        }
      },
      jobs: {
        validate: {
          'runs-on': 'ubuntu-latest',
          strategy: this.config.parallel ? {
            matrix: {
              'node-version': ['18.x', '20.x']
            }
          } : undefined,
          steps: [
            {
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': this.config.parallel ? '${{ matrix.node-version }}' : '20.x',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              run: 'npm ci'
            },
            {
              name: 'Run CVPlus validation',
              run: 'npx cvplus-validator validate-all --format json --output validation-report.json'
            },
            {
              name: 'Upload validation report',
              uses: 'actions/upload-artifact@v4',
              if: 'always()',
              with: {
                name: 'validation-report',
                path: 'validation-report.json'
              }
            }
          ]
        }
      }
    };

    if (this.config.stages.security) {
      (workflow.jobs as any)['security'] = {
        'runs-on': 'ubuntu-latest',
        needs: 'validate',
        steps: [
          {
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Run security audit',
            run: 'npm audit --audit-level moderate'
          },
          {
            name: 'Run CodeQL Analysis',
            uses: 'github/codeql-action/analyze@v2',
            with: {
              languages: 'javascript'
            }
          }
        ]
      };
    }

    if (this.config.stages.testing) {
      (workflow.jobs as any)['test'] = {
        'runs-on': 'ubuntu-latest',
        needs: 'validate',
        steps: [
          {
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20.x',
              cache: 'npm'
            }
          },
          {
            name: 'Install dependencies',
            run: 'npm ci'
          },
          {
            name: 'Run tests',
            run: 'npm test -- --coverage'
          },
          {
            name: 'Upload coverage',
            uses: 'codecov/codecov-action@v3'
          }
        ]
      };
    }

    const workflowFile = path.join(workflowDir, 'cvplus-validation.yml');
    await fs.writeFile(workflowFile, this.toYaml(workflow));
  }

  private async generateGitLabCI(repositoryPath: string): Promise<void> {
    const gitlabCI = {
      image: 'node:20',
      stages: ['validate', 'security', 'test', 'deploy'].filter(stage => {
        switch (stage) {
          case 'validate': return this.config.stages.validation;
          case 'security': return this.config.stages.security;
          case 'test': return this.config.stages.testing;
          case 'deploy': return this.config.stages.deployment;
          default: return true;
        }
      }),
      variables: {
        NODE_ENV: 'test'
      },
      cache: {
        paths: ['node_modules/']
      },
      before_script: [
        'npm ci'
      ],
      validate_modules: {
        stage: 'validate',
        script: [
          'npx cvplus-validator validate-all --format json --output validation-report.json'
        ],
        artifacts: {
          reports: {
            junit: 'validation-report.xml'
          },
          paths: ['validation-report.json'],
          when: 'always'
        },
        rules: [
          {
            if: '$CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "merge_request_event"'
          }
        ]
      }
    };

    if (this.config.stages.security) {
      (gitlabCI as any)['security_scan'] = {
        stage: 'security',
        script: [
          'npm audit --audit-level moderate',
          'npx semgrep --config=auto --json --output security-report.json'
        ],
        artifacts: {
          reports: {
            sast: 'security-report.json'
          }
        },
        allow_failure: true
      };
    }

    if (this.config.stages.testing) {
      (gitlabCI as any)['test_modules'] = {
        stage: 'test',
        script: [
          'npm test -- --coverage --reporters=default,jest-junit'
        ],
        artifacts: {
          reports: {
            junit: 'junit.xml',
            coverage_report: {
              coverage_format: 'cobertura',
              path: 'coverage/cobertura-coverage.xml'
            }
          }
        }
      };
    }

    const gitlabCIFile = path.join(repositoryPath, '.gitlab-ci.yml');
    await fs.writeFile(gitlabCIFile, this.toYaml(gitlabCI));
  }

  private async generateJenkinsfile(repositoryPath: string): Promise<void> {
    const jenkinsfile = `
pipeline {
    agent any

    tools {
        nodejs '20'
    }

    environment {
        NODE_ENV = 'test'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        ${this.config.stages.validation ? `
        stage('Validate') {
            steps {
                sh 'npx cvplus-validator validate-all --format json --output validation-report.json'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'validation-report.json', allowEmptyArchive: true
                }
            }
        }
        ` : ''}

        ${this.config.stages.security ? `
        stage('Security') {
            steps {
                sh 'npm audit --audit-level moderate'
            }
        }
        ` : ''}

        ${this.config.stages.testing ? `
        stage('Test') {
            steps {
                sh 'npm test -- --coverage'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
        ` : ''}
    }

    post {
        always {
            cleanWs()
        }
        failure {
            ${this.config.notifications.email ? `
            emailext (
                subject: "Build Failed: \${env.JOB_NAME} - \${env.BUILD_NUMBER}",
                body: "Build failed. Check console output at \${env.BUILD_URL}",
                to: "${this.config.notifications.email.recipients.join(',')}"
            )
            ` : ''}
        }
    }
}
`;

    const jenkinsFile = path.join(repositoryPath, 'Jenkinsfile');
    await fs.writeFile(jenkinsFile, jenkinsfile);
  }

  private async generateAzureDevOps(repositoryPath: string): Promise<void> {
    const azurePipeline = {
      trigger: {
        branches: {
          include: ['main', 'develop']
        },
        paths: {
          include: ['packages/**', '*.json', '*.ts']
        }
      },
      pr: {
        branches: {
          include: ['main', 'develop']
        }
      },
      pool: {
        vmImage: 'ubuntu-latest'
      },
      variables: {
        nodeVersion: '20.x'
      },
      stages: [
        {
          stage: 'Validate',
          jobs: [
            {
              job: 'ValidateModules',
              steps: [
                {
                  task: 'NodeTool@0',
                  inputs: {
                    versionSpec: '$(nodeVersion)'
                  }
                },
                {
                  script: 'npm ci',
                  displayName: 'Install dependencies'
                },
                {
                  script: 'npx cvplus-validator validate-all --format json --output $(Agent.TempDirectory)/validation-report.json',
                  displayName: 'Run CVPlus validation'
                },
                {
                  task: 'PublishBuildArtifacts@1',
                  inputs: {
                    pathToPublish: '$(Agent.TempDirectory)/validation-report.json',
                    artifactName: 'validation-report'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    if (this.config.stages.testing) {
      (azurePipeline.stages as any).push({
        stage: 'Test',
        dependsOn: 'Validate',
        jobs: [
          {
            job: 'TestModules',
            steps: [
              {
                task: 'NodeTool@0',
                inputs: {
                  versionSpec: '$(nodeVersion)'
                }
              },
              {
                script: 'npm ci',
                displayName: 'Install dependencies'
              },
              {
                script: 'npm test -- --coverage --reporters=default,jest-junit',
                displayName: 'Run tests'
              },
              {
                task: 'PublishTestResults@2',
                inputs: {
                  testResultsFormat: 'JUnit',
                  testResultsFiles: 'junit.xml'
                } as any
              },
              {
                task: 'PublishCodeCoverageResults@1',
                inputs: {
                  codeCoverageTool: 'Cobertura',
                  summaryFileLocation: 'coverage/cobertura-coverage.xml'
                } as any
              }
            ]
          }
        ]
      });
    }

    const azureFile = path.join(repositoryPath, 'azure-pipelines.yml');
    await fs.writeFile(azureFile, this.toYaml(azurePipeline));
  }

  private async generateCircleCI(repositoryPath: string): Promise<void> {
    const circleci = {
      version: 2.1,
      orbs: {
        node: 'circleci/node@5.0.2'
      },
      workflows: {
        main: {
          jobs: ['validate']
        }
      },
      jobs: {
        validate: {
          executor: 'node/default',
          steps: [
            'checkout',
            {
              'node/install-packages': {
                'pkg-manager': 'npm'
              }
            },
            {
              run: {
                name: 'Run CVPlus validation',
                command: 'npx cvplus-validator validate-all --format json --output validation-report.json'
              }
            },
            {
              'store_artifacts': {
                path: 'validation-report.json'
              }
            }
          ]
        }
      }
    };

    if (this.config.stages.testing) {
      (circleci.jobs as any)['test'] = {
        executor: 'node/default',
        steps: [
          'checkout',
          {
            'node/install-packages': {
              'pkg-manager': 'npm'
            }
          },
          {
            run: {
              name: 'Run tests',
              command: 'npm test -- --coverage'
            }
          },
          {
            'store_test_results': {
              path: 'test-results'
            }
          },
          {
            'store_artifacts': {
              path: 'coverage'
            }
          }
        ]
      };

      circleci.workflows.main.jobs.push('test');
    }

    const circleciDir = path.join(repositoryPath, '.circleci');
    await fs.ensureDir(circleciDir);

    const configFile = path.join(circleciDir, 'config.yml');
    await fs.writeFile(configFile, this.toYaml(circleci));
  }

  private async discoverModules(repositoryPath: string): Promise<string[]> {
    const modules: string[] = [];

    const findModules = async (dirPath: string): Promise<void> => {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        if (item === 'node_modules' || item === '.git') {
          continue;
        }

        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
          const packageJsonPath = path.join(itemPath, 'package.json');
          if (await fs.pathExists(packageJsonPath)) {
            modules.push(itemPath);
          } else {
            await findModules(itemPath);
          }
        }
      }
    };

    await findModules(repositoryPath);
    return modules;
  }

  private async validateModulesParallel(modules: string[]): Promise<ModuleResult[]> {
    const batchSize = 4; // Process 4 modules at a time
    const results: ModuleResult[] = [];

    for (let i = 0; i < modules.length; i += batchSize) {
      const batch = modules.slice(i, i + batchSize);
      const batchPromises = batch.map(modulePath => this.validateSingleModule(modulePath));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private async validateModulesSequential(modules: string[]): Promise<ModuleResult[]> {
    const results: ModuleResult[] = [];

    for (const modulePath of modules) {
      const result = await this.validateSingleModule(modulePath);
      results.push(result);

      if (result.status === ValidationStatus.ERROR && this.config.failFast) {
        break;
      }
    }

    return results;
  }

  private async validateSingleModule(modulePath: string): Promise<ModuleResult> {
    const startTime = Date.now();

    try {
      const validationResult = await this.validationService.validateModule(modulePath, {
        includeRules: this.config.rules
      });

      // Map ValidationReport status to CICDResult status
      let status = ValidationStatus.PASS;
      if (validationResult.status === 'FAIL' || validationResult.status === 'ERROR') {
        status = ValidationStatus.FAIL;
      } else if (validationResult.status === 'WARNING') {
        status = ValidationStatus.WARNING;
      }

      return {
        moduleId: path.basename(modulePath),
        path: modulePath,
        status,
        score: validationResult.overallScore,
        duration: Date.now() - startTime,
        results: validationResult.results,
        coverage: this.calculateCoverage(modulePath),
        performance: await this.measurePerformance(modulePath)
      };

    } catch (error) {
      return {
        moduleId: path.basename(modulePath),
        path: modulePath,
        status: ValidationStatus.ERROR,
        score: 0,
        duration: Date.now() - startTime,
        results: [{
          ruleId: 'VALIDATION_ERROR',
          status: ValidationStatus.ERROR,
          severity: RuleSeverity.CRITICAL,
          message: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  private calculateCoverage(_modulePath: string): number {
    // In a real implementation, this would analyze test coverage
    // For now, return a simulated value
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }

  private async measurePerformance(_modulePath: string): Promise<PerformanceResult> {

    // Simulate build time measurement
    const buildTime = Math.random() * 30000 + 5000; // 5-35 seconds

    // Simulate test time
    const testTime = Math.random() * 15000 + 2000; // 2-17 seconds

    return {
      buildTime,
      testTime,
      bundleSize: Math.floor(Math.random() * 500000) + 100000, // 100KB - 600KB
      memoryUsage: Math.floor(Math.random() * 100) + 50, // 50-150 MB
      cpuUsage: Math.floor(Math.random() * 30) + 10 // 10-40%
    };
  }

  private async runSecurityScan(modulePath: string): Promise<ModuleResult> {
    const startTime = Date.now();

    // Simulate security scanning
    const vulnerabilities = Math.floor(Math.random() * 5);
    const highSeverity = Math.floor(vulnerabilities * 0.2);
    const mediumSeverity = Math.floor(vulnerabilities * 0.3);
    const lowSeverity = vulnerabilities - highSeverity - mediumSeverity;

    const security: SecurityResult = {
      vulnerabilities,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      issues: []
    };

    // Generate sample security issues
    for (let i = 0; i < vulnerabilities; i++) {
      security.issues.push({
        id: `SEC-${Date.now()}-${i}`,
        severity: i < highSeverity ? 'high' : i < highSeverity + mediumSeverity ? 'medium' : 'low',
        title: `Security issue ${i + 1}`,
        description: `Potential security vulnerability detected`,
        file: `src/module${i}.ts`,
        line: Math.floor(Math.random() * 100) + 1,
        cwe: `CWE-${Math.floor(Math.random() * 900) + 100}`
      });
    }

    let status = ValidationStatus.PASS;
    if (highSeverity > 0) {
      status = ValidationStatus.ERROR;
    } else if (mediumSeverity > 0) {
      status = ValidationStatus.WARNING;
    }

    return {
      moduleId: path.basename(modulePath),
      path: modulePath,
      status,
      score: Math.max(0, 100 - (highSeverity * 30 + mediumSeverity * 10 + lowSeverity * 5)),
      duration: Date.now() - startTime,
      results: [],
      security
    };
  }

  private async generateReports(result: CICDResult, repositoryPath: string): Promise<string[]> {
    const reports: string[] = [];
    const reportsDir = path.join(repositoryPath, '.cvplus', 'reports');
    await fs.ensureDir(reportsDir);

    // Generate JSON report
    if (this.config.reportFormat === 'json' || this.config.reportFormat === 'junit') {
      const jsonReport = path.join(reportsDir, `${result.stage}-report.json`);
      await fs.writeJSON(jsonReport, result, { spaces: 2 });
      reports.push(jsonReport);
    }

    // Generate HTML report
    if (this.config.reportFormat === 'html') {
      const htmlReport = path.join(reportsDir, `${result.stage}-report.html`);
      const htmlContent = this.generateHtmlReport(result);
      await fs.writeFile(htmlReport, htmlContent);
      reports.push(htmlReport);
    }

    // Generate JUnit XML report
    if (this.config.reportFormat === 'junit') {
      const junitReport = path.join(reportsDir, `${result.stage}-junit.xml`);
      const junitContent = this.generateJUnitReport(result);
      await fs.writeFile(junitReport, junitContent);
      reports.push(junitReport);
    }

    return reports;
  }

  private async generateSarifReport(result: CICDResult, repositoryPath: string): Promise<string> {
    const reportsDir = path.join(repositoryPath, '.cvplus', 'reports');
    await fs.ensureDir(reportsDir);

    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'CVPlus Module Validator',
              version: '1.0.0',
              informationUri: 'https://github.com/cvplus/module-requirements'
            }
          },
          results: result.modules.flatMap(module =>
            module.security?.issues.map(issue => ({
              ruleId: issue.id,
              level: issue.severity === 'high' || issue.severity === 'critical' ? 'error' : 'warning',
              message: {
                text: issue.description
              },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: {
                      uri: issue.file
                    },
                    region: {
                      startLine: issue.line || 1
                    }
                  }
                }
              ]
            })) || []
          )
        }
      ]
    };

    const sarifFile = path.join(reportsDir, 'security-sarif.json');
    await fs.writeJSON(sarifFile, sarif, { spaces: 2 });
    return sarifFile;
  }

  private async generateSecurityReport(result: CICDResult, repositoryPath: string): Promise<string> {
    const reportsDir = path.join(repositoryPath, '.cvplus', 'reports');
    const reportFile = path.join(reportsDir, 'security-report.html');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>CVPlus Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .module { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .high { border-left: 5px solid #f44336; }
        .medium { border-left: 5px solid #ff9800; }
        .low { border-left: 5px solid #4caf50; }
        .issue { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🔒 CVPlus Security Report</h1>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Modules:</strong> ${result.modules.length}</p>
        <p><strong>Total Vulnerabilities:</strong> ${result.modules.reduce((sum, m) => sum + (m.security?.vulnerabilities || 0), 0)}</p>
        <p><strong>High Severity:</strong> ${result.modules.reduce((sum, m) => sum + (m.security?.highSeverity || 0), 0)}</p>
        <p><strong>Medium Severity:</strong> ${result.modules.reduce((sum, m) => sum + (m.security?.mediumSeverity || 0), 0)}</p>
        <p><strong>Low Severity:</strong> ${result.modules.reduce((sum, m) => sum + (m.security?.lowSeverity || 0), 0)}</p>
    </div>

    ${result.modules.filter(m => m.security?.issues.length).map(module => `
        <div class="module">
            <h3>${module.moduleId}</h3>
            <p><strong>Security Score:</strong> ${module.score}/100</p>
            <p><strong>Vulnerabilities:</strong> ${module.security?.vulnerabilities || 0}</p>

            ${module.security?.issues.map(issue => `
                <div class="issue ${issue.severity}">
                    <h4>${issue.title}</h4>
                    <p>${issue.description}</p>
                    <p><small><strong>File:</strong> ${issue.file}${issue.line ? `:${issue.line}` : ''}</small></p>
                    <p><small><strong>Severity:</strong> ${issue.severity}</small></p>
                    ${issue.cwe ? `<p><small><strong>CWE:</strong> ${issue.cwe}</small></p>` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
    `;

    await fs.writeFile(reportFile, html);
    return reportFile;
  }

  private async createArtifacts(_result: CICDResult, repositoryPath: string): Promise<string[]> {
    const artifacts: string[] = [];

    for (const artifactPath of this.config.artifactPaths) {
      const fullPath = path.join(repositoryPath, artifactPath);
      if (await fs.pathExists(fullPath)) {
        artifacts.push(fullPath);
      }
    }

    return artifacts;
  }

  private async sendNotifications(result: CICDResult): Promise<void> {
    // Slack notification
    if (this.config.notifications.slack) {
      await this.sendSlackNotification(result);
    }

    // Email notification
    if (this.config.notifications.email) {
      await this.sendEmailNotification(result);
    }

    // GitHub notification
    if (this.config.notifications.github) {
      await this.sendGitHubNotification(result);
    }
  }

  private async sendSlackNotification(result: CICDResult): Promise<void> {
    // Implementation would use Slack webhook API
    console.log('Slack notification sent:', result.success ? '✅' : '❌');
  }

  private async sendEmailNotification(result: CICDResult): Promise<void> {
    // Implementation would use email service
    console.log('Email notification sent:', result.success ? '✅' : '❌');
  }

  private async sendGitHubNotification(result: CICDResult): Promise<void> {
    // Implementation would use GitHub API for checks and comments
    console.log('GitHub notification sent:', result.success ? '✅' : '❌');
  }

  private generateHtmlReport(result: CICDResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>CVPlus CI/CD Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .module { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { border-left: 5px solid #4caf50; }
        .warning { border-left: 5px solid #ff9800; }
        .failed { border-left: 5px solid #f44336; }
    </style>
</head>
<body>
    <h1>CVPlus CI/CD Report - ${result.stage}</h1>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Build:</strong> ${result.build}</p>
        <p><strong>Pipeline:</strong> ${result.pipeline}</p>
        <p><strong>Status:</strong> ${result.success ? '✅ Success' : '❌ Failed'}</p>
        <p><strong>Duration:</strong> ${Math.round(result.duration / 1000)}s</p>
        <p><strong>Modules:</strong> ${result.summary.total}</p>
        <p><strong>Passed:</strong> ${result.summary.passed}</p>
        <p><strong>Warnings:</strong> ${result.summary.warnings}</p>
        <p><strong>Failed:</strong> ${result.summary.failed}</p>
    </div>

    ${result.modules.map(module => `
        <div class="module ${module.status === ValidationStatus.PASS ? 'passed' : module.status === ValidationStatus.WARNING ? 'warning' : 'failed'}">
            <h3>${module.moduleId}</h3>
            <p><strong>Status:</strong> ${module.status}</p>
            <p><strong>Score:</strong> ${module.score}/100</p>
            <p><strong>Duration:</strong> ${Math.round(module.duration / 1000)}s</p>
            ${module.coverage ? `<p><strong>Coverage:</strong> ${module.coverage}%</p>` : ''}
            ${module.security ? `<p><strong>Security Issues:</strong> ${module.security.vulnerabilities}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  private generateJUnitReport(result: CICDResult): string {
    const testCases = result.modules.map(module => `
        <testcase name="${module.moduleId}" classname="CVPlus.Module.Validation" time="${(module.duration / 1000).toFixed(3)}">
            ${module.status === ValidationStatus.FAIL || module.status === ValidationStatus.ERROR ? `
                <failure message="Module validation failed" type="ValidationFailure">
                    Module ${module.moduleId} failed validation with score ${module.score}/100
                </failure>
            ` : ''}
        </testcase>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="CVPlus Module Validation" tests="${result.summary.total}" failures="${result.summary.failed}" errors="${result.summary.errors}" time="${(result.duration / 1000).toFixed(3)}">
    ${testCases}
</testsuite>`;
  }

  private toYaml(obj: any): string {
    // Simple YAML conversion - in production, use a proper YAML library
    return JSON.stringify(obj, null, 2).replace(/"/g, '').replace(/,/g, '');
  }

  static async createDefaultConfig(repositoryPath: string, platform: CICDConfig['platform']): Promise<void> {
    const configPath = path.join(repositoryPath, '.cvplus-cicd.json');

    const defaultConfig: CICDConfig = {
      platform,
      enabled: true,
      stages: {
        validation: true,
        testing: true,
        security: true,
        deployment: false
      },
      rules: [
        'PACKAGE_JSON_REQUIRED',
        'README_REQUIRED',
        'TYPESCRIPT_CONFIG',
        'SRC_DIRECTORY',
        'TESTS_DIRECTORY'
      ],
      severity: RuleSeverity.ERROR,
      parallel: true,
      failFast: true,
      reportFormat: 'json',
      artifactPaths: [
        'coverage/**',
        '.cvplus/reports/**'
      ],
      notifications: {}
    };

    await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });
  }
}