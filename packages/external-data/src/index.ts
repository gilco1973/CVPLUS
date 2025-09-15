/**
 * @fileoverview External Data Integration Module - Main exports
 * @author Gil Klainert
 *
 * Main entry point for the CVPlus External Data Integration module.
 * Provides APIs, adapters, and orchestration for external data sources.
 */

// Re-export all public APIs
export * from './backend';
export * from './frontend';
export * from './shared';
export * from './types';

// No default export to avoid mixing with named exports
// Migrated staging services
export { ExternalDataOrchestrator } from './services/orchestrator.service';
export { ValidationService as ExternalDataValidationService } from './services/validation.service';
export { CacheService as ExternalDataCacheService } from './services/cache.service';
export * from './services/adapters/website.adapter';
export * from './services/adapters/web-search.adapter';
export * from './services/adapters/linkedin.adapter';
export * from './services/adapters/github.adapter';
export * from './services/enrichment/enrichment.service';
export * from './services/enrichment/skills.enrichment';
export * from './services/enrichment/hobbies.enrichment';
export * from './services/enrichment/portfolio.enrichment';
export * from './services/enrichment/certification.enrichment';
export * from './services/types';
