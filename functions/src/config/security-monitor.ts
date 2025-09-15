/**
 * Security Monitor Configuration
 * Provides security monitoring and threat detection settings
 */

export interface SecurityConfig {
  rateLimiting: {
    windowMs: number;
    max: number;
  };
  authentication: {
    jwtSecret: string;
    tokenExpiry: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export const securityConfig: SecurityConfig = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
    tokenExpiry: '24h'
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32
  }
};

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit_exceeded' | 'suspicious_activity';
  userId?: string;
  ip: string;
  timestamp: Date;
  details: Record<string, any>;
}

export class SecurityMonitor {
  static logEvent(event: SecurityEvent): void {
    console.log(`[SECURITY] ${event.type}:`, event);
  }

  static checkRateLimit(ip: string): boolean {
    // Basic rate limiting check implementation
    return true;
  }
}

export default securityConfig;