/**
 * External Data Enrichment Module Exports
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

export { EnrichmentService, EnrichmentResult, DataAttribution, ConflictResolution } from './enrichment.service';
export { PortfolioEnrichmentService, PortfolioEnrichmentResult } from './portfolio.enrichment';
export { CertificationEnrichmentService, CertificationEnrichmentResult } from './certification.enrichment';
export { HobbiesEnrichmentService, HobbiesEnrichmentResult } from './hobbies.enrichment';
export { SkillsEnrichmentService, SkillEnrichmentResult, SkillWithMetadata, ProficiencyLevel } from './skills.enrichment';