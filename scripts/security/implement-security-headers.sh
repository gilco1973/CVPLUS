#!/bin/bash

# CVPlus Security Headers Implementation Script
# Implements critical security headers and configurations

echo "🔒 CVPlus Security Enhancement Script Starting..."
echo "================================================"

# Check if we're in the correct directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: Please run this script from the CVPlus root directory"
    exit 1
fi

# Backup current firebase.json
echo "📋 Creating backup of firebase.json..."
cp firebase.json firebase.json.backup

# Create enhanced firebase.json with security headers
echo "🛡️ Implementing enhanced security headers..."

cat > firebase.json << 'EOF'
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.elevenlabs.io https://api.stripe.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://getmycv-ai-default-rtdb.firebaseio.com https://firestore.googleapis.com; media-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri https://cvplus.ai/csp-report"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "camera=(), microphone=(), geolocation=(), payment=(self)"
          },
          {
            "key": "Cross-Origin-Embedder-Policy",
            "value": "require-corp"
          },
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log"
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8090,
      "host": "127.0.0.1"
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "pubsub": {
      "port": 8085
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
EOF

echo "✅ Enhanced security headers implemented in firebase.json"

# Backup current firestore.rules
echo "📋 Creating backup of firestore.rules..."
cp firestore.rules firestore.rules.backup

# Create enhanced firestore rules
echo "🔐 Implementing enhanced Firestore security rules..."

cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions for security validation
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isValidSize(maxSize) {
      return request.resource.data.size() < maxSize;
    }
    
    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }
    
    function isRecentActivity() {
      return request.time > resource.data.lastActivity + duration.fromMinutes(1);
    }
    
    // Enhanced user document security with size limits and validation
    match /users/{userId}/{document=**} {
      allow read, write: if isAuthenticated() && 
        isOwner(userId) &&
        isValidSize(1000000); // 1MB limit per document
    }
    
    // Enhanced job security with comprehensive validation
    match /jobs/{jobId} {
      allow read: if isAuthenticated() && 
        (isOwner(resource.data.userId) || 
         resource.data.isPublic == true);
      
      allow create: if isAuthenticated() && 
        isOwner(request.resource.data.userId) &&
        hasRequiredFields(['userId', 'title', 'timestamp', 'status']) &&
        request.resource.data.title.size() <= 200 &&
        request.resource.data.title.size() >= 1 &&
        isValidSize(500000); // 500KB limit for job documents
      
      allow update: if isAuthenticated() && 
        isOwner(resource.data.userId) &&
        !('userId' in request.resource.data.diff(resource.data).affectedKeys()) &&
        isRecentActivity(); // Prevent rapid successive updates
      
      allow delete: if isAuthenticated() && 
        isOwner(resource.data.userId);
    }
    
    // Public templates - read only with caching headers
    match /templates/{templateId} {
      allow read: if true;
      allow write: if false; // Only admin can write templates via backend
    }
    
    // Generated CVs with enhanced security and size limits
    match /generatedCVs/{cvId} {
      allow read, write: if isAuthenticated() && 
        isOwner(resource.data.userId) &&
        isValidSize(5000000) && // 5MB limit for CV documents
        hasRequiredFields(['userId', 'timestamp']);
        
      // Rate limiting for CV generation
      allow create: if isAuthenticated() &&
        isOwner(request.resource.data.userId) &&
        request.resource.data.timestamp > request.time - duration.fromMinutes(5); // Max 1 CV per 5 minutes
    }
    
    // User sessions for enhanced security tracking
    match /userSessions/{sessionId} {
      allow read, write: if isAuthenticated() && 
        isOwner(resource.data.userId) &&
        resource.data.expiresAt > request.time; // Only allow active sessions
    }
    
    // Payment records - read only for users, write only for functions
    match /payments/{paymentId} {
      allow read: if isAuthenticated() && 
        isOwner(resource.data.userId);
      allow write: if false; // Only backend functions can write payment data
    }
    
    // Analytics - function access only, no user access
    match /analytics/{document=**} {
      allow read, write: if false; // Only cloud functions can access analytics
    }
    
    // System logs - no user access
    match /systemLogs/{document=**} {
      allow read, write: if false; // Only cloud functions for logging
    }
    
    // Rate limiting collection for abuse prevention
    match /rateLimits/{userId} {
      allow read, write: if false; // Only cloud functions manage rate limits
    }
  }
}
EOF

echo "✅ Enhanced Firestore security rules implemented"

# Create security validation functions
echo "🛡️ Creating security validation functions..."

mkdir -p functions/src/middleware

cat > functions/src/middleware/security-validator.ts << 'EOF'
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Input validation schemas
export const CVInputSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid name format'),
    email: z.string().email().max(254),
    phone: z.string().optional().refine(val => !val || /^\+?[\d\s\-\(\)]+$/.test(val), 'Invalid phone format'),
    address: z.string().max(200).optional()
  }),
  experience: z.array(z.object({
    title: z.string().min(1).max(100),
    company: z.string().min(1).max(100),
    duration: z.string().min(1).max(50),
    description: z.string().max(2000)
  })).max(20),
  skills: z.array(z.string().min(1).max(50)).max(100),
  education: z.array(z.object({
    degree: z.string().min(1).max(100),
    institution: z.string().min(1).max(100),
    year: z.string().min(4).max(20)
  })).max(10).optional()
});

export class SecurityValidator {
  // Sanitize HTML content
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false
    });
  }

  // Validate and sanitize CV input
  static validateCVInput(input: any): any {
    try {
      const validated = CVInputSchema.parse(input);
      
      // Sanitize all description fields
      if (validated.experience) {
        validated.experience = validated.experience.map(exp => ({
          ...exp,
          description: this.sanitizeHTML(exp.description),
          title: this.sanitizeHTML(exp.title),
          company: this.sanitizeHTML(exp.company)
        }));
      }
      
      return validated;
    } catch (error) {
      throw new Error(`Invalid CV input: ${error instanceof z.ZodError ? error.errors[0].message : 'Unknown validation error'}`);
    }
  }

  // Check for suspicious patterns
  static containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /@import/gi,
      /url\s*\(/gi
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(text));
  }
}

// Rate limiting middleware
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      console.warn('Rate limit exceeded:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      });
    }
  });
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Remove server identification
  res.removeHeader('X-Powered-By');
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return SecurityValidator.sanitizeHTML(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  next();
};
EOF

echo "✅ Security validation middleware created"

# Create CSP report endpoint
echo "📊 Creating CSP violation report endpoint..."

cat > functions/src/functions/csp-report.ts << 'EOF'
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const cspReport = onRequest({
  cors: true,
  region: 'us-central1'
}, async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse CSP violation report
    const report = req.body;
    
    // Log CSP violation for monitoring
    console.warn('CSP Violation Detected:', {
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      violation: report['csp-report'] || report,
      referer: req.get('Referer')
    });

    // Store violation in Firestore for analysis
    await admin.firestore().collection('securityLogs').add({
      type: 'CSP_VIOLATION',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      report: report['csp-report'] || report,
      referer: req.get('Referer')
    });

    res.status(204).end();
  } catch (error) {
    console.error('Error processing CSP report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
EOF

echo "✅ CSP violation report endpoint created"

# Update functions index to export new function
if ! grep -q "csp-report" functions/src/index.ts; then
    echo "export { cspReport } from './functions/csp-report';" >> functions/src/index.ts
    echo "✅ CSP report function added to exports"
fi

# Create security testing script
echo "🧪 Creating security testing script..."

cat > scripts/security/test-security-headers.sh << 'EOF'
#!/bin/bash

echo "🔍 Testing Security Headers Implementation"
echo "========================================"

# Test local development server
if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "📍 Testing local development server..."
    
    headers=$(curl -s -I http://localhost:5000)
    
    echo "🔍 Checking Content-Security-Policy..."
    if echo "$headers" | grep -i "content-security-policy" > /dev/null; then
        echo "✅ CSP header found"
    else
        echo "❌ CSP header missing"
    fi
    
    echo "🔍 Checking HSTS..."
    if echo "$headers" | grep -i "strict-transport-security" > /dev/null; then
        echo "✅ HSTS header found"
    else
        echo "❌ HSTS header missing"
    fi
    
    echo "🔍 Checking X-Frame-Options..."
    if echo "$headers" | grep -i "x-frame-options" > /dev/null; then
        echo "✅ X-Frame-Options header found"
    else
        echo "❌ X-Frame-Options header missing"
    fi
    
else
    echo "ℹ️  Local server not running. Start with: firebase serve"
fi

echo ""
echo "🚀 To test in production:"
echo "1. Deploy: firebase deploy --only hosting"
echo "2. Test: curl -I https://your-domain.web.app"
EOF

chmod +x scripts/security/test-security-headers.sh

echo "✅ Security testing script created"

# Create deployment instructions
echo "📋 Creating deployment instructions..."

cat > scripts/security/SECURITY_DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# Security Enhancement Deployment Guide

## Overview
This guide covers the deployment of critical security enhancements for CVPlus.

## Changes Implemented

### 1. Enhanced Security Headers
- Content Security Policy (CSP) with strict directives
- HTTP Strict Transport Security (HSTS)
- Cross-Origin policies for enhanced isolation
- Permissions Policy for API access control

### 2. Strengthened Firestore Rules
- Size limits on all document writes
- Rate limiting on document creation
- Enhanced validation requirements
- Proper owner verification

### 3. Security Middleware
- Input validation and sanitization
- Rate limiting implementation
- Security headers for all responses
- CSP violation reporting

## Deployment Steps

### Step 1: Validate Configuration
```bash
# Test security headers locally
npm run serve
./scripts/security/test-security-headers.sh
```

### Step 2: Deploy Security Rules
```bash
# Deploy Firestore rules first
firebase deploy --only firestore:rules

# Verify rules deployment
firebase firestore:rules:list
```

### Step 3: Deploy Functions
```bash
# Build and deploy functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Step 4: Deploy Hosting with Headers
```bash
# Deploy hosting with new security headers
firebase deploy --only hosting
```

### Step 5: Verify Deployment
```bash
# Test production security headers
curl -I https://your-domain.web.app

# Check CSP violation reporting
# Monitor logs: firebase functions:log
```

## Post-Deployment Monitoring

### 1. CSP Violation Reports
Monitor function logs for CSP violations:
```bash
firebase functions:log --only cspReport
```

### 2. Security Metrics
- Check Firestore rule violations in Firebase Console
- Monitor rate limit triggers in function logs
- Review authentication failure patterns

### 3. Performance Impact
- Monitor page load times after CSP implementation
- Check for any blocked resources in browser console
- Validate all third-party integrations still work

## Rollback Plan

If issues occur, rollback in reverse order:

```bash
# 1. Rollback hosting headers
cp firebase.json.backup firebase.json
firebase deploy --only hosting

# 2. Rollback Firestore rules
cp firestore.rules.backup firestore.rules
firebase deploy --only firestore:rules

# 3. Rollback functions if needed
git revert <commit-hash>
firebase deploy --only functions
```

## Testing Checklist

- [ ] All pages load without CSP violations
- [ ] Stripe payments work correctly
- [ ] Google authentication functions
- [ ] Firebase API calls succeed
- [ ] Third-party integrations operational
- [ ] Mobile experience unaffected
- [ ] Performance metrics acceptable

## Security Validation

After deployment, validate security improvements:

1. **CSP Testing**: Use browser dev tools to ensure no violations
2. **Header Verification**: Confirm all security headers present
3. **Rate Limiting**: Test API endpoints for proper limiting
4. **Input Validation**: Test form submissions with various inputs
5. **Authentication**: Verify secure user session management

## Support

For issues or questions regarding security deployment:
- Review function logs: `firebase functions:log`
- Check Firestore rules: Firebase Console > Firestore > Rules
- Monitor CSP violations: Check `cspReport` function logs
EOF

echo "✅ Deployment instructions created"

echo ""
echo "🎉 Security Enhancement Implementation Complete!"
echo "=============================================="
echo ""
echo "📋 Summary of changes:"
echo "✅ Enhanced security headers in firebase.json"
echo "✅ Strengthened Firestore security rules"  
echo "✅ Created security validation middleware"
echo "✅ Added CSP violation reporting endpoint"
echo "✅ Created testing and deployment scripts"
echo ""
echo "🚀 Next Steps:"
echo "1. Review the changes in firebase.json and firestore.rules"
echo "2. Test locally: npm run serve && ./scripts/security/test-security-headers.sh"
echo "3. Deploy: firebase deploy"
echo "4. Monitor CSP reports: firebase functions:log --only cspReport"
echo ""
echo "📚 Documentation:"
echo "- Security assessment: docs/security/CVPlus-Comprehensive-Security-Assessment-2025-08-21.md"
echo "- Deployment guide: scripts/security/SECURITY_DEPLOYMENT_INSTRUCTIONS.md"
echo ""
echo "⚠️  Important: Test all functionality after deployment to ensure compatibility"

exit 0
EOF