/**
 * Premium Features Types
 *
 * Defines premium features and their access requirements
 *
 * @author Gil Klainert
 * @version 1.0.0
 */
export declare enum PremiumTier {
    FREE = "free",
    BASIC = "basic",
    PRO = "pro",
    ENTERPRISE = "enterprise"
}
export declare enum PremiumFeature {
    ADVANCED_CV_GENERATION = "advanced_cv_generation",
    PORTFOLIO_GALLERY = "portfolio_gallery",
    VIDEO_INTRODUCTION = "video_introduction",
    PODCAST_GENERATION = "podcast_generation",
    ANALYTICS_DASHBOARD = "analytics_dashboard",
    CUSTOM_BRANDING = "custom_branding",
    API_ACCESS = "api_access",
    PRIORITY_SUPPORT = "priority_support",
    UNLIMITED_CVS = "unlimited_cvs",
    TEAM_COLLABORATION = "team_collaboration"
}
export interface FeatureAccess {
    feature: PremiumFeature;
    requiredTier: PremiumTier;
    requiresSubscription: boolean;
    description: string;
    limits?: {
        maxUsage?: number;
        resetPeriod?: 'daily' | 'weekly' | 'monthly';
    };
}
export declare function isValidPremiumFeature(feature: string): feature is PremiumFeature;
export declare function requiresSubscription(feature: PremiumFeature): boolean;
export declare function getMinimumTier(feature: PremiumFeature): PremiumTier;
export declare function getFeatureDefinition(feature: PremiumFeature): FeatureAccess | undefined;
//# sourceMappingURL=premium-features.d.ts.map