/**
 * External Data Services - Staging for Migration
 *
 * This staging area contains external data processing and enrichment services
 * that will be moved to the @cvplus/external-data submodule.
 *
 * Domain: Data Enrichment, External APIs, Web Scraping, Third-party Integration
 * Target Submodule: @cvplus/external-data
 * Migration Phase: 4B
 */

// Core external data services - only export what actually exists
export { ExternalDataOrchestrator } from './orchestrator.service';
export { ValidationService as ExternalDataValidationService } from './validation.service';
export { CacheService as ExternalDataCacheService } from './cache.service';

// Adapters - export if they exist
export * from './adapters/website.adapter';
export * from './adapters/web-search.adapter';
export * from './adapters/linkedin.adapter';
export * from './adapters/github.adapter';

// Enrichment services - export if they exist
export * from './enrichment/enrichment.service';
export * from './enrichment/skills.enrichment';
export * from './enrichment/hobbies.enrichment';
export * from './enrichment/portfolio.enrichment';
export * from './enrichment/certification.enrichment';

// Type exports
export * from './types';

// Note: Utility functions will be added as the external data module is fully implemented