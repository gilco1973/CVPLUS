/**
 * Backend Pricing Configuration System for CVPlus Firebase Functions
 *
 * This module provides backend pricing configuration that mirrors the frontend
 * pricing system, ensuring consistency across client and server-side pricing.
 *
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-20
 */
/**
 * Supported subscription tiers
 */
export type SubscriptionTier = 'FREE' | 'PREMIUM';
/**
 * Supported currencies
 */
export type Currency = 'USD' | 'EUR' | 'GBP';
/**
 * Environment types for different pricing configurations
 */
export type Environment = 'development' | 'staging' | 'production';
/**
 * Stripe price configuration for different environments
 */
export interface StripePriceConfig {
    /** Development environment price ID */
    development: string;
    /** Staging environment price ID */
    staging: string;
    /** Production environment price ID */
    production: string;
}
/**
 * Price configuration with multiple currency support
 */
export interface PriceConfig {
    /** Price in cents (to avoid floating point issues) */
    cents: number;
    /** Price in dollars (for display) */
    dollars: number;
    /** Currency code */
    currency: Currency;
    /** Stripe price IDs for different environments */
    stripeConfig: StripePriceConfig;
}
/**
 * Complete tier configuration
 */
export interface TierConfig {
    /** Tier identifier */
    tier: SubscriptionTier;
    /** Display name */
    name: string;
    /** Description */
    description: string;
    /** Price configuration */
    price: PriceConfig;
    /** Whether this tier is currently available */
    isActive: boolean;
}
/**
 * Complete pricing configuration
 */
export interface PricingConfig {
    /** All available tiers */
    tiers: Record<SubscriptionTier, TierConfig>;
    /** Default currency */
    defaultCurrency: Currency;
    /** Current environment */
    environment: Environment;
    /** Configuration metadata */
    metadata: {
        version: string;
        lastUpdated: string;
        author: string;
    };
}
/**
 * Main pricing configuration - Single source of truth for backend
 */
export declare const BACKEND_PRICING_CONFIG: PricingConfig;
/**
 * Get tier configuration by tier type
 */
export declare const getTierConfig: (tier: SubscriptionTier) => TierConfig;
/**
 * Get Stripe Price ID for current environment
 */
export declare const getStripePriceId: (tier: SubscriptionTier) => string;
/**
 * Get price in cents for a specific tier
 */
export declare const getPriceInCents: (tier: SubscriptionTier) => number;
/**
 * Get price in dollars for a specific tier
 */
export declare const getPriceInDollars: (tier: SubscriptionTier) => number;
/**
 * Format price for display
 */
export declare const formatPrice: (tier: SubscriptionTier, showCurrency?: boolean) => string;
/**
 * Validate pricing configuration
 */
export declare const validatePricingConfig: () => {
    isValid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Get pricing summary for logging/debugging
 */
export declare const getPricingSummary: () => {
    environment: Environment;
    defaultCurrency: Currency;
    tiers: string[];
    validation: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    metadata: {
        version: string;
        lastUpdated: string;
        author: string;
    };
    stripeConfig: {
        premiumPriceId: string;
        premiumPriceCents: number;
        premiumPriceDollars: number;
    };
};
/**
 * Type guard to check if a tier is premium
 */
export declare const isPremiumTier: (tier: SubscriptionTier) => boolean;
/**
 * Check if pricing is properly configured for current environment
 */
export declare const isPricingConfigured: () => boolean;
/**
 * Log pricing configuration status
 */
export declare const logPricingStatus: () => void;
export default BACKEND_PRICING_CONFIG;
export declare const LEGACY_PREMIUM_PRICE_CENTS: number;
export declare const LEGACY_PREMIUM_PRICE_DOLLARS: number;
//# sourceMappingURL=pricing.d.ts.map