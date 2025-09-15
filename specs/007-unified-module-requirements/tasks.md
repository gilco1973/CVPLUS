# Tasks: Unified Module Requirements

**Input**: Design documents from `/specs/007-unified-module-requirements/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: tech stack (TypeScript/Node.js), libraries (validation-lib, template-lib, reporting-lib)
2. Load optional design documents:
   → ✅ data-model.md: Extract entities → ModuleStructure, ComplianceRule, ValidationReport, ModuleTemplate
   → ✅ contracts/: module-validation-api.yaml → API endpoints
   → ✅ research.md: Multi-tier validation, graduated enforcement
   → ✅ quickstart.md: 6 scenarios for integration tests
3. Generate tasks by category:
   → Setup: project init, TypeScript config, linting
   → Tests: API contract tests, integration tests from scenarios
   → Core: models, validation services, CLI commands
   → Integration: file system access, template generation, reporting
   → Polish: unit tests, performance optimization, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T038)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ✅ All requirements covered
9. Return: SUCCESS (38 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Libraries: `src/lib/validation/`, `src/lib/template/`, `src/lib/reporting/`
- CLI tools: `src/cli/validator.ts`, `src/cli/generator.ts`, `src/cli/reporter.ts`

## Phase 3.1: Setup
- [ ] T001 Create project structure with src/, tests/, docs/, dist/ directories
- [ ] T002 Initialize TypeScript project with Node.js 18+ dependencies (fs, path, yaml, commander)
- [ ] T003 [P] Configure ESLint, Prettier, and Jest testing framework
- [ ] T004 [P] Set up package.json with build, test, lint, dev scripts per constitutional requirements

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [P]
- [ ] T005 [P] Contract test POST /modules/validate in tests/contract/test_validate_module.ts
- [ ] T006 [P] Contract test POST /modules/validate-batch in tests/contract/test_validate_batch.ts
- [ ] T007 [P] Contract test GET /templates in tests/contract/test_list_templates.ts
- [ ] T008 [P] Contract test POST /templates/{templateId}/generate in tests/contract/test_generate_module.ts
- [ ] T009 [P] Contract test GET /compliance/rules in tests/contract/test_compliance_rules.ts
- [ ] T010 [P] Contract test GET /compliance/reports in tests/contract/test_validation_reports.ts
- [ ] T011 [P] Contract test GET /compliance/ecosystem in tests/contract/test_ecosystem_compliance.ts

### Integration Tests [P]
- [ ] T012 [P] Integration test Scenario 1: Validate existing module in tests/integration/test_validate_existing_module.ts
- [ ] T013 [P] Integration test Scenario 2: Create new compliant module in tests/integration/test_create_compliant_module.ts
- [ ] T014 [P] Integration test Scenario 3: Batch validate all modules in tests/integration/test_batch_validate_all.ts
- [ ] T015 [P] Integration test Scenario 4: Fix common violations in tests/integration/test_fix_violations.ts
- [ ] T016 [P] Integration test Scenario 5: Monitor compliance trends in tests/integration/test_monitor_compliance.ts
- [ ] T017 [P] Integration test Scenario 6: Migrate legacy module in tests/integration/test_migrate_legacy.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models [P]
- [ ] T018 [P] ModuleStructure type and validation schema in src/models/ModuleStructure.ts
- [ ] T019 [P] ComplianceRule type and validation schema in src/models/ComplianceRule.ts
- [ ] T020 [P] ValidationReport type and aggregation logic in src/models/ValidationReport.ts
- [ ] T021 [P] ModuleTemplate type and customization logic in src/models/ModuleTemplate.ts
- [ ] T022 [P] Supporting types (ModuleType, RuleCategory, RuleSeverity, ValidationStatus) in src/models/types.ts

### Core Libraries [P]
- [ ] T023 [P] ValidationService core logic in src/lib/validation/ValidationService.ts
- [ ] T024 [P] TemplateService core logic in src/lib/template/TemplateService.ts
- [ ] T025 [P] ReportingService core logic in src/lib/reporting/ReportingService.ts
- [ ] T026 [P] FileSystemValidator for module structure checks in src/lib/validation/FileSystemValidator.ts
- [ ] T027 [P] ComplianceRuleEngine for rule execution in src/lib/validation/ComplianceRuleEngine.ts
- [ ] T028 [P] TemplateGenerator for module scaffolding in src/lib/template/TemplateGenerator.ts

### CLI Implementation
- [ ] T029 cvplus-validator CLI with validate, validate-all, fix, ecosystem commands in src/cli/validator.ts
- [ ] T030 cvplus-generator CLI with list-templates, create commands in src/cli/generator.ts
- [ ] T031 cvplus-reporter CLI with generate, monitor, trends commands in src/cli/reporter.ts
- [ ] T032 cvplus-migrator CLI with analyze, plan, migrate commands in src/cli/migrator.ts

## Phase 3.4: Integration
- [ ] T033 Integrate ValidationService with file system access and error handling
- [ ] T034 Implement graduated enforcement mechanism (warning → error → critical → auto-fix)
- [ ] T035 Add structured logging for validation results and compliance scores
- [ ] T036 Implement multi-tier validation schedule (pre-commit, CI/CD, daily, on-demand)

## Phase 3.5: Polish
- [ ] T037 [P] Unit tests for validation logic in tests/unit/test_validation_service.ts
- [ ] T038 [P] Performance optimization to meet <30 second validation requirement
- [ ] T039 [P] Generate llms.txt documentation for all libraries in docs/llms.txt
- [ ] T040 [P] Create module templates for backend, frontend, utility, API, and core types
- [ ] T041 [P] Add comprehensive error messages and remediation guidance
- [ ] T042 [P] Implement caching system for validation results with hash-based invalidation

## Dependencies
- Setup (T001-T004) before all other phases
- Contract tests (T005-T011) before any implementation
- Integration tests (T012-T017) before implementation
- Models (T018-T022) before services (T023-T028)
- Services before CLI (T029-T032)
- Core implementation before integration (T033-T036)
- Implementation before polish (T037-T042)

## Parallel Example
```bash
# Phase 3.2: Launch contract tests together (T005-T011):
Task: "Contract test POST /modules/validate in tests/contract/test_validate_module.ts"
Task: "Contract test POST /modules/validate-batch in tests/contract/test_validate_batch.ts"
Task: "Contract test GET /templates in tests/contract/test_list_templates.ts"
Task: "Contract test POST /templates/{templateId}/generate in tests/contract/test_generate_module.ts"
Task: "Contract test GET /compliance/rules in tests/contract/test_compliance_rules.ts"
Task: "Contract test GET /compliance/reports in tests/contract/test_validation_reports.ts"
Task: "Contract test GET /compliance/ecosystem in tests/contract/test_ecosystem_compliance.ts"

# Phase 3.2: Launch integration tests together (T012-T017):
Task: "Integration test Scenario 1: Validate existing module in tests/integration/test_validate_existing_module.ts"
Task: "Integration test Scenario 2: Create new compliant module in tests/integration/test_create_compliant_module.ts"
Task: "Integration test Scenario 3: Batch validate all modules in tests/integration/test_batch_validate_all.ts"
Task: "Integration test Scenario 4: Fix common violations in tests/integration/test_fix_violations.ts"
Task: "Integration test Scenario 5: Monitor compliance trends in tests/integration/test_monitor_compliance.ts"
Task: "Integration test Scenario 6: Migrate legacy module in tests/integration/test_migrate_legacy.ts"

# Phase 3.3: Launch model creation together (T018-T022):
Task: "ModuleStructure type and validation schema in src/models/ModuleStructure.ts"
Task: "ComplianceRule type and validation schema in src/models/ComplianceRule.ts"
Task: "ValidationReport type and aggregation logic in src/models/ValidationReport.ts"
Task: "ModuleTemplate type and customization logic in src/models/ModuleTemplate.ts"
Task: "Supporting types (ModuleType, RuleCategory, RuleSeverity, ValidationStatus) in src/models/types.ts"

# Phase 3.3: Launch core library development together (T023-T028):
Task: "ValidationService core logic in src/lib/validation/ValidationService.ts"
Task: "TemplateService core logic in src/lib/template/TemplateService.ts"
Task: "ReportingService core logic in src/lib/reporting/ReportingService.ts"
Task: "FileSystemValidator for module structure checks in src/lib/validation/FileSystemValidator.ts"
Task: "ComplianceRuleEngine for rule execution in src/lib/validation/ComplianceRuleEngine.ts"
Task: "TemplateGenerator for module scaffolding in src/lib/template/TemplateGenerator.ts"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify ALL tests fail before implementing (RED phase of TDD)
- Commit after each task completion
- Follow constitutional principles: library-first, CLI per library, TDD enforcement

## Task Generation Rules Applied

1. **From Contracts (module-validation-api.yaml)**:
   - 7 endpoints → 7 contract test tasks [P] (T005-T011)
   - API implementation integrated into library services

2. **From Data Model**:
   - 4 entities → 4 model creation tasks [P] (T018-T021)
   - 1 supporting types file [P] (T022)
   - Entity relationships → service layer integration (T033-T036)

3. **From Quickstart Scenarios**:
   - 6 scenarios → 6 integration test tasks [P] (T012-T017)
   - CLI usage examples → 4 CLI implementation tasks (T029-T032)

4. **From Implementation Plan**:
   - 3 libraries → 6 service tasks [P] (T023-T028)
   - Constitutional requirements → setup and polish tasks

## Validation Checklist ✅
- [x] All API endpoints have corresponding contract tests (T005-T011)
- [x] All entities have model creation tasks (T018-T022)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD order enforced: Contract→Integration→Models→Services→CLI→Polish
- [x] Constitutional compliance: library-first architecture, CLI per library
- [x] Performance requirements addressed: <30 second validation (T038)
- [x] All quickstart scenarios have corresponding integration tests
- [x] Multi-tier validation and graduated enforcement implemented (T034, T036)