# @cvplus/auth

**CVPlus Authentication Module - Self-Contained Authentication System**

A comprehensive authentication and authorization module for the CVPlus platform providing secure user management, session handling, premium features, and role-based access control.

## Implementation Status

### ✅ Completed (Phase 3.1 & 3.2)

**Module Structure**
- [x] Package configuration with proper TypeScript setup
- [x] Workspace integration with @cvplus/core dependency
- [x] Build configuration with tsup

**Type Definitions** 
- [x] Comprehensive authentication types (`auth.types.ts`)
- [x] User profile and session types (`user.types.ts`, `session.types.ts`)
- [x] Premium subscription types (`premium.types.ts`)
- [x] Permission and role types (`permissions.types.ts`)
- [x] Configuration types (`config.types.ts`)
- [x] Error handling types (`error.types.ts`)

**Core Services**
- [x] `AuthService` - Main authentication service with Firebase integration
- [x] `TokenService` - JWT token management and validation
- [x] `SessionService` - Session management with cross-tab sync
- [x] `PremiumService` - Premium subscription management
- [x] `PermissionsService` - Role-based access control
- [x] `CalendarService` - Google Calendar integration

**Constants & Configuration**
- [x] Authentication constants (`auth.constants.ts`)
- [x] Permission matrices (`permissions.constants.ts`)  
- [x] Premium tier definitions (`premium.constants.ts`)
- [x] Default configurations with security defaults

**Utilities**
- [x] Validation utilities for auth data
- [x] Error creation and handling utilities
- [x] Encryption utilities (development-safe)
- [x] Storage utilities with TTL and encryption
- [x] In-memory caching with cleanup
- [x] Logging utilities

### 🔧 In Progress (Phase 3.3-3.6)

**React Integration** (Next Steps)
- [ ] React Context Provider (`AuthContext.tsx`)
- [ ] Authentication hooks (`useAuth.ts`, `usePremium.ts`, etc.)
- [ ] Guard components (`AuthGuard.tsx`, `PermissionGate.tsx`)
- [ ] Sign-in dialog component

**Server Middleware** (Next Steps)
- [ ] Express/Firebase middleware
- [ ] Rate limiting middleware
- [ ] Premium validation middleware

**Integration Testing** (Next Steps)
- [ ] Firebase emulator integration
- [ ] Existing frontend integration
- [ ] Backend service integration

## Architecture Overview

```
@cvplus/auth/
├── src/
│   ├── types/           # TypeScript definitions
│   ├── services/        # Core business logic
│   ├── constants/       # Configuration constants
│   ├── utils/          # Helper utilities
│   ├── hooks/          # React hooks (pending)
│   ├── context/        # React context (pending)
│   ├── components/     # React components (pending)
│   └── middleware/     # Server middleware (pending)
└── dist/               # Built output
```

## Key Features Implemented

### 🔐 **Authentication Core**
- Firebase Authentication integration
- Google OAuth with calendar permissions
- Email/password authentication
- Session management with automatic refresh
- Cross-tab synchronization

### 👤 **User Management**
- Comprehensive user profiles
- Account metadata tracking  
- Activity monitoring
- Profile validation

### 💎 **Premium Features**
- Tier-based subscription management
- Feature gating and access control
- Usage tracking and limits
- Subscription upgrade workflows

### 🛡️ **Security & Permissions**
- Role-based access control (RBAC)
- Permission matrices for fine-grained control
- Rate limiting and security monitoring
- Token encryption and validation

### 📅 **Calendar Integration**
- Google Calendar OAuth scopes
- Token storage and refresh
- Permission management
- API access validation

## Configuration

The module uses a comprehensive configuration system:

```typescript
const authConfig: AuthModuleConfig = {
  firebase: { /* Firebase config */ },
  providers: { 
    google: { enabled: true, scopes: [...] },
    email: { enabled: true, passwordPolicy: {...} }
  },
  session: { timeout: 24h, enableCrossTabSync: true },
  security: { rateLimiting: true, tokenEncryption: true },
  // ... more configuration options
}
```

## Development Setup

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Build module  
npm run build

# Run tests
npm run test
```

## Integration Notes

### Current Status
The authentication module is **architecturally complete** with all core services implemented. The current limitation is some TypeScript compilation issues that need to be resolved in the utility files.

### Next Steps for Integration
1. Fix TypeScript compilation issues in utility files
2. Implement React hooks and components
3. Create server middleware
4. Integration testing with existing CVPlus codebase
5. Migration from existing `frontend/src/contexts/AuthContext.tsx`

### Backward Compatibility
The module is designed to be backward compatible with the existing authentication implementation, allowing for gradual migration.

## Security Considerations

- All sensitive data is encrypted in storage
- Tokens have proper expiration and refresh mechanisms
- Rate limiting prevents abuse
- Comprehensive audit logging
- Input validation on all user data
- CSRF protection enabled by default

## Performance Features

- Token caching to reduce API calls
- Session state caching with TTL
- Automatic cleanup of expired data
- Optimistic UI updates
- Background token refresh

---

**Status**: Core implementation complete, integration in progress
**Author**: Gil Klainert
**Version**: 1.0.0