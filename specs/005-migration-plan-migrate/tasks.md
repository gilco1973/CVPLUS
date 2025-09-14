# Tasks: CVPlus Code Migration to Submodules

**Input**: Design documents from `/specs/005-migration-plan-migrate/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow Summary
Migration approach: TDD with validation tests first, followed by incremental domain-based migration batches with atomic rollback capability. All 166+ Firebase Function exports must be preserved with zero breaking changes.

**Tech Stack**: TypeScript 5.x, Node.js 20+, Firebase Functions, Git Submodules
**Structure**: Web app (Firebase backend + React frontend with 18+ submodule architecture)
**Target**: Migrate remaining service/model files and new API functions to appropriate submodules

## Phase 3.1: Setup & Prerequisites
- [ ] **T001** Initialize migration validation environment and prerequisites check
- [ ] **T002** [P] Create migration scripts directory at `/scripts/migration/`
- [ ] **T003** [P] Set up migration logging and progress tracking utilities

## Phase 3.2: Migration Validation Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY migration execution**

### API Contract Preservation Tests [P]
- [ ] **T004** [P] Contract test: Validate all 166+ function exports preserved in `tests/migration/test_api_contract_preservation.ts`
- [ ] **T005** [P] Contract test: Validate @cvplus/* import resolution in `tests/migration/test_import_chain_validation.ts`
- [ ] **T006** [P] Contract test: Validate external API endpoints unchanged in `tests/migration/test_external_api_preservation.ts`

### Build Validation Tests [P]
- [ ] **T007** [P] Build validation test: TypeScript compilation success in `tests/migration/test_typescript_validation.ts`
- [ ] **T008** [P] Build validation test: Firebase Functions deployment in `tests/migration/test_firebase_deployment.ts`
- [ ] **T009** [P] Build validation test: Frontend build success in `tests/migration/test_frontend_build.ts`

### Migration Unit Tests [P]
- [ ] **T010** [P] Migration unit test: Service file classification in `tests/migration/test_service_migration.ts`
- [ ] **T011** [P] Migration unit test: Model file classification in `tests/migration/test_model_migration.ts`
- [ ] **T012** [P] Migration unit test: New API function migration in `tests/migration/test_api_function_migration.ts`

### Submodule Integration Tests [P]
- [ ] **T013** [P] Integration test: CV processing submodule boundary in `tests/integration/test_cv_processing_integration.ts`
- [ ] **T014** [P] Integration test: Multimedia submodule boundary in `tests/integration/test_multimedia_integration.ts`
- [ ] **T015** [P] Integration test: Analytics submodule boundary in `tests/integration/test_analytics_integration.ts`
- [ ] **T016** [P] Integration test: Public profiles submodule boundary in `tests/integration/test_public_profiles_integration.ts`

## Phase 3.3: Migration Batch 1 - Service Files (ONLY after tests are failing)
**Dependencies**: Service files → CV Processing, Multimedia, Analytics, Public Profiles submodules

- [ ] **T017** [P] Migrate `ai-analysis.service.ts` to `packages/cv-processing/src/services/`
- [ ] **T018** [P] Migrate `cv-processor.service.ts` to `packages/cv-processing/src/services/`
- [ ] **T019** [P] Migrate `multimedia.service.ts` to `packages/multimedia/src/services/`
- [ ] **T020** [P] Migrate `profile-manager.service.ts` to `packages/public-profiles/src/services/`
- [ ] **T021** Update imports in root `functions/src/index.ts` for migrated services
- [ ] **T022** Run validation: TypeScript compilation and build success
- [ ] **T023** Update submodule git pointers for service migrations

## Phase 3.4: Migration Batch 2 - Model Files
**Dependencies**: Model files → Analytics, Public Profiles, Multimedia submodules

- [ ] **T024** [P] Migrate `analytics.service.ts` to `packages/analytics/src/models/`
- [ ] **T025** [P] Migrate `generated-content.service.ts` to `packages/multimedia/src/models/`
- [ ] **T026** [P] Migrate `public-profile.service.ts` to `packages/public-profiles/src/models/`
- [ ] **T027** Update imports in root `functions/src/index.ts` for migrated models
- [ ] **T028** Run validation: TypeScript compilation and export count verification
- [ ] **T029** Update submodule git pointers for model migrations

## Phase 3.5: Migration Batch 3 - New API Functions
**Dependencies**: API functions → CV Processing, Multimedia, Public Profiles, Analytics submodules

### CV Processing API Functions [P]
- [ ] **T030** [P] Migrate `functions/cv/upload.ts` to `packages/cv-processing/src/backend/functions/`
- [ ] **T031** [P] Migrate `functions/cv/url.ts` to `packages/cv-processing/src/backend/functions/`
- [ ] **T032** [P] Migrate `functions/cv/status.ts` to `packages/cv-processing/src/backend/functions/`
- [ ] **T033** [P] Migrate `functions/cv/download.ts` to `packages/cv-processing/src/backend/functions/`

### Multimedia API Functions [P]
- [ ] **T034** [P] Migrate `functions/multimedia/podcast.ts` to `packages/multimedia/src/backend/functions/`
- [ ] **T035** [P] Migrate `functions/multimedia/video.ts` to `packages/multimedia/src/backend/functions/`

### Public Profile API Functions [P]
- [ ] **T036** [P] Migrate `functions/profile/create.ts` to `packages/public-profiles/src/backend/functions/`
- [ ] **T037** [P] Migrate `functions/profile/view.ts` to `packages/public-profiles/src/backend/functions/`
- [ ] **T038** [P] Migrate `functions/profile/update.ts` to `packages/public-profiles/src/backend/functions/`
- [ ] **T039** [P] Migrate `functions/profile/contact.ts` to `packages/public-profiles/src/backend/functions/`

### Analytics API Functions [P]
- [ ] **T040** [P] Migrate `functions/analytics/get.ts` to `packages/analytics/src/backend/functions/`

### Import Chain Updates
- [ ] **T041** Update imports in root `functions/src/index.ts` for migrated API functions
- [ ] **T042** Update submodule backend export files to include migrated functions
- [ ] **T043** Run validation: All 166+ function exports still available
- [ ] **T044** Update submodule git pointers for API function migrations

## Phase 3.6: Frontend Component Alignment
**Dependencies**: Frontend components → Submodule alignment with domain boundaries

- [ ] **T045** [P] Audit frontend components for submodule boundary alignment in `scripts/migration/audit_frontend_components.ts`
- [ ] **T046** [P] Migrate CV-related components to align with cv-processing submodule patterns
- [ ] **T047** [P] Migrate multimedia components to align with multimedia submodule patterns
- [ ] **T048** [P] Migrate profile components to align with public-profiles submodule patterns
- [ ] **T049** Update frontend import paths to reference appropriate submodule types/utilities
- [ ] **T050** Run validation: Frontend build success with updated imports

## Phase 3.7: Test Organization & Migration
**Dependencies**: Test files → Co-location with migrated business logic

- [ ] **T051** [P] Migrate CV processing tests to `packages/cv-processing/src/tests/`
- [ ] **T052** [P] Migrate multimedia tests to `packages/multimedia/src/tests/`
- [ ] **T053** [P] Migrate analytics tests to `packages/analytics/src/tests/`
- [ ] **T054** [P] Migrate public profile tests to `packages/public-profiles/src/tests/`
- [ ] **T055** Update test imports to use local submodule references
- [ ] **T056** Run validation: All migrated tests pass in new locations

## Phase 3.8: Final Validation & Cleanup
**Dependencies**: All previous phases complete

- [ ] **T057** Run comprehensive build validation across all submodules
- [ ] **T058** Run comprehensive test suite across all migrated code
- [ ] **T059** Validate API response preservation with integration tests
- [ ] **T060** Performance validation: Build times <5 minutes, API responses <500ms p95
- [ ] **T061** Clean up empty directories and unused imports in root repository
- [ ] **T062** Update project documentation with new submodule architecture
- [ ] **T063** Create rollback procedures documentation

## Dependencies

### Critical Path Dependencies
- **Setup** (T001-T003) → **All Tests** (T004-T016) → **All Implementation** (T017+)
- **Migration Tests** (T004-T016) **MUST FAIL** before any implementation
- **Service Migration** (T017-T023) → **Model Migration** (T024-T029) → **API Migration** (T030-T044)
- **Backend Migration** (T017-T044) → **Frontend Alignment** (T045-T050)
- **Code Migration** (T017-T050) → **Test Migration** (T051-T056) → **Final Validation** (T057-T063)

### Parallel Execution Opportunities
- **T002-T003**: Migration scripts setup
- **T004-T016**: All validation tests (different files, independent)
- **T017-T020**: Service file migrations (different submodules)
- **T024-T026**: Model file migrations (different submodules)
- **T030-T040**: API function migrations (different submodules, same phase)
- **T045-T048**: Frontend component alignment (different domains)
- **T051-T054**: Test migrations (different submodules)

### Batch Dependencies
- **Batch 1** (Services): T017-T023 must complete before **Batch 2** (Models)
- **Batch 2** (Models): T024-T029 must complete before **Batch 3** (APIs)
- **Batch 3** (APIs): T030-T044 must complete before **Frontend Alignment**

## Parallel Execution Examples

### Phase 3.2: Launch All Validation Tests Together
```typescript
// Launch T004-T016 in parallel - all independent test files
Task("Contract test: API preservation", "api_contract_preservation_test")
Task("Contract test: Import resolution", "import_chain_validation_test")
Task("Build test: TypeScript compilation", "typescript_validation_test")
Task("Build test: Firebase deployment", "firebase_deployment_test")
Task("Integration test: CV processing", "cv_processing_integration_test")
// ... all validation tests
```

### Phase 3.3: Launch Service Migrations in Parallel
```typescript
// Launch T017-T020 in parallel - different target submodules
Task("Migrate ai-analysis.service.ts", "cv-processing_service_migration")
Task("Migrate cv-processor.service.ts", "cv-processing_service_migration")
Task("Migrate multimedia.service.ts", "multimedia_service_migration")
Task("Migrate profile-manager.service.ts", "public-profiles_service_migration")
```

### Phase 3.5: Launch API Function Migrations in Parallel
```typescript
// Launch T030-T040 in parallel - different target submodules
Task("Migrate CV upload API", "cv_processing_api_migration")
Task("Migrate multimedia podcast API", "multimedia_api_migration")
Task("Migrate profile create API", "public_profiles_api_migration")
Task("Migrate analytics get API", "analytics_api_migration")
```

## Success Criteria

### Migration Validation Gates
1. **All validation tests pass** (T004-T016) ✅
2. **TypeScript compilation succeeds** after each batch ✅
3. **All 166+ function exports preserved** ✅
4. **Zero breaking changes to external APIs** ✅
5. **Build times remain <5 minutes** ✅
6. **API response times <500ms p95** ✅

### Architectural Compliance
1. **No business logic remains in root repository** ✅
2. **All code properly organized by domain** ✅
3. **Git submodule pointers updated** ✅
4. **Import chains use @cvplus/* pattern** ✅

## Risk Mitigation

### Rollback Strategy
- Each migration batch (T017-T023, T024-T029, T030-T044) is atomic
- Git submodule pointers can be reverted independently
- Validation tests run after each batch to detect issues early
- Failed migrations trigger automatic rollback to previous state

### Error Recovery
- Migration failures in any task trigger batch rollback
- Build validation failures halt migration until resolved
- API contract violations abort migration with detailed error reporting
- Performance degradation triggers investigation and potential rollback

## Notes
- **[P] tasks**: Different files/submodules, can run in parallel
- **Validation critical**: All tests must fail before implementation starts
- **Atomic batches**: Each migration batch must complete fully or rollback completely
- **Zero breaking changes**: External API contracts absolutely must be preserved
- **Git history**: All submodule git history must be preserved during migration