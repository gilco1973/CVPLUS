/**
 * CVPlus CV Processing Module
 *
 * Main exports for CV analysis, processing, and enhancement functionality.
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

// Enhanced models from migrated recommendations
export * from './types/enhanced-models';
export * from './types/job';

// ============================================================================
// VALIDATION SERVICES
// ============================================================================

// CV validation from migrated recommendations
export { CVValidator } from './services/validation/CVValidator';

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = '1.0.0';
export const PACKAGE_NAME = '@cvplus/cv-processing';