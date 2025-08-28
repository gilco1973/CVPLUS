/**
 * Shared Services Index - Enhanced Service Layer Architecture
 * 
 * Centralized exports for all shared service components, including
 * enhanced base services, mixins, and utilities.
 * 
 * @author Gil Klainert
 * @version 2.0.0
 * @updated 2025-08-28
 */

// Core service architecture
export { BaseService, ServiceConfig, ServiceHealth } from './base-service';
export { EnhancedBaseService, EnhancedServiceConfig } from './enhanced-base-service';
export { Logger, LogLevel, LogContext } from './logger';
export { ServiceRegistry } from './service-registry';

// Mixins for common functionality
export {
  CacheableMixin,
  CacheOptions,
  CacheResult,
  CacheMetricsData,
  createCacheableMixin
} from './cache-mixin';

export {
  DatabaseMixin,
  DatabaseOptions,
  QueryResult,
  QueryFilter,
  DatabaseOperation,
  DatabaseError,
  createDatabaseMixin
} from './database-mixin';

export {
  ApiClientMixin,
  ApiClientOptions,
  ApiRequestOptions,
  ApiResponse,
  ApiError,
  RateLimitState,
  createApiClientMixin
} from './api-client-mixin';

// Service factory functions
export function createServiceRegistry(): ServiceRegistry {
  return ServiceRegistry.getInstance({
    autoInitialize: true,
    healthCheckInterval: 60000
  });
}

/**
 * Initialize enhanced services with common patterns
 */
export async function initializeEnhancedServices(): Promise<void> {
  const registry = createServiceRegistry();
  
  // Services will be registered by their respective modules
  // This function provides a common initialization pattern
  
  await registry.initializeAll();
  console.log('Enhanced services initialized successfully');
}

/**
 * Perform health check on all registered services
 */
export async function performServicesHealthCheck(): Promise<Record<string, ServiceHealth>> {
  const registry = ServiceRegistry.getInstance();
  return await registry.getHealthStatus();
}

/**
 * Cleanup all services (for graceful shutdown)
 */
export async function cleanupAllServices(): Promise<void> {
  const registry = ServiceRegistry.getInstance();
  await registry.cleanupAll();
  console.log('All services cleaned up successfully');
}