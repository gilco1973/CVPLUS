# Job Subscription Migration Guide

This guide explains how to migrate from the old job subscription pattern to the new centralized JobSubscriptionManager system to prevent excessive Firestore calls.

## Problem

The previous implementation had multiple issues:
- Multiple components independently called `subscribeToJob` for the same jobId
- Each call created a separate Firestore `onSnapshot` listener
- No rate limiting or centralized management
- Potential memory leaks from improper cleanup
- Thousands of unnecessary Firestore calls

## Solution

The new `JobSubscriptionManager` provides:
- **Single Firestore listener per jobId** - eliminates duplicate subscriptions
- **Centralized callback management** - multiple components can subscribe to the same data
- **Rate limiting** - prevents excessive subscription attempts
- **Automatic cleanup** - properly manages memory and subscriptions
- **Debugging tools** - monitoring and statistics for development

## Migration Steps

### 1. Update Import Statements

**Old:**
```typescript
import { subscribeToJob } from '../services/cvService';
```

**New:**
```typescript
import { jobSubscriptionManager } from '../services/JobSubscriptionManager';
// or use the enhanced hook
import { useJobEnhanced } from '../hooks/useJobEnhanced';
```

### 2. Update Direct Subscription Calls

**Old:**
```typescript
const unsubscribe = subscribeToJob(jobId, (job) => {
  setJob(job);
});
```

**New:**
```typescript
const unsubscribe = jobSubscriptionManager.subscribeToJob(jobId, (job) => {
  setJob(job);
}, {
  enableLogging: process.env.NODE_ENV === 'development',
  debounceMs: 100,
  maxRetries: 3
});
```

### 3. Update useJob Hook Usage

**Old:**
```typescript
import { useJob } from '../hooks/useJob';

const { job, loading, error } = useJob(jobId);
```

**New (Enhanced):**
```typescript
import { useJobEnhanced } from '../hooks/useJobEnhanced';

const { 
  job, 
  loading, 
  error, 
  lastUpdate,
  subscriptionActive,
  retryCount,
  refresh,
  forceRefresh 
} = useJobEnhanced(jobId, {
  enableRetry: true,
  maxRetries: 3,
  enableLogging: true,
  pollWhenInactive: false
});
```

**Old (Basic - still works):**
The original `useJob` hook continues to work unchanged as it now uses the centralized manager internally.

### 4. Component Updates

**Old Component Pattern:**
```typescript
export const ProcessingPage = () => {
  const [job, setJob] = useState<Job | null>(null);
  
  useEffect(() => {
    const unsubscribe = subscribeToJob(jobId, (updatedJob) => {
      setJob(updatedJob);
    });
    
    return () => unsubscribe();
  }, [jobId]);
  
  // Component logic...
};
```

**New Component Pattern (Option 1 - Using Enhanced Hook):**
```typescript
export const ProcessingPage = () => {
  const { job, loading, error, refresh } = useJobEnhanced(jobId, {
    enableRetry: true,
    enableLogging: true
  });
  
  // Component logic...
};
```

**New Component Pattern (Option 2 - Direct Manager Usage):**
```typescript
export const ProcessingPage = () => {
  const [job, setJob] = useState<Job | null>(null);
  
  useEffect(() => {
    const unsubscribe = jobSubscriptionManager.subscribeToJob(
      jobId, 
      setJob,
      {
        enableLogging: process.env.NODE_ENV === 'development',
        debounceMs: 50 // Faster updates for processing pages
      }
    );
    
    return () => unsubscribe();
  }, [jobId]);
  
  // Component logic...
};
```

## New Features Available

### 1. Subscription Monitoring (Development Only)

Add the subscription monitor to your app to track subscription usage:

```typescript
import { SubscriptionMonitor } from '../components/dev/SubscriptionMonitor';

// In your App component
function App() {
  return (
    <div>
      {/* Your app content */}
      <SubscriptionMonitor />
    </div>
  );
}
```

### 2. Manual Refresh Capabilities

```typescript
// Force refresh a specific job
jobSubscriptionManager.forceRefresh(jobId);

// Get cached job data (synchronous)
const cachedJob = jobSubscriptionManager.getCurrentJob(jobId);

// Check if job has active subscribers
const hasSubscribers = jobSubscriptionManager.hasActiveSubscribers(jobId);

// Get subscription statistics
const stats = jobSubscriptionManager.getStats();
```

### 3. Enhanced Error Handling

The enhanced hook provides additional error handling:

```typescript
const { 
  job, 
  error, 
  subscriptionActive,
  retryCount,
  refresh 
} = useJobEnhanced(jobId);

// Handle subscription failures
if (error && retryCount > 0) {
  console.log(`Subscription failed, retried ${retryCount} times`);
}

// Manual refresh on errors
if (error) {
  await refresh();
}
```

## Configuration Options

### JobSubscriptionManager Options

```typescript
interface SubscriptionOptions {
  debounceMs?: number;     // Debounce callback calls (default: 100ms)
  maxRetries?: number;     // Max retry attempts on error (default: 3)
  enableLogging?: boolean; // Enable debug logging (default: development only)
}
```

### Enhanced Hook Options

```typescript
interface UseJobEnhancedOptions {
  enableRetry?: boolean;      // Enable automatic retry (default: true)
  maxRetries?: number;        // Max retry attempts (default: 3)
  retryDelay?: number;        // Delay between retries (default: 2000ms)
  enableLogging?: boolean;    // Enable debug logging (default: development)
  pollWhenInactive?: boolean; // Fallback to polling (default: false)
  pollInterval?: number;      // Polling interval (default: 30000ms)
}
```

## Rate Limiting

The system includes built-in rate limiting:

- **10 subscription attempts per minute per jobId**
- **Automatic backoff on rate limit exceeded**
- **Development logging for rate limit violations**

## Debugging and Monitoring

### Development Tools

1. **Subscription Monitor**: Visual component showing real-time subscription stats
2. **Console Logging**: Detailed logs in development mode
3. **Statistics API**: Programmatic access to subscription metrics

### Debug Commands

```typescript
// Get detailed statistics
const stats = jobSubscriptionManager.getStats();
console.log('Subscription Stats:', stats);

// Check rate limiting
const remaining = subscriptionRateLimiter.getRemainingRequests(jobId);
console.log(`Remaining requests for ${jobId}:`, remaining);

// Force cleanup inactive subscriptions
jobSubscriptionManager.cleanup();
```

## Performance Improvements

The new system provides significant performance improvements:

- **Reduced Firestore calls**: Single listener per jobId instead of multiple
- **Memory efficiency**: Automatic cleanup of unused subscriptions
- **Rate limiting**: Prevents excessive API calls
- **Debouncing**: Reduces redundant callback executions
- **Caching**: Immediate delivery of cached data to new subscribers

## Backward Compatibility

The migration is designed to be backward compatible:

- Existing `useJob` hook continues to work
- Original service exports still available
- No breaking changes to component interfaces
- Gradual migration possible

## Testing

New test utilities are available:

```typescript
import { JobSubscriptionManager } from '../services/JobSubscriptionManager';

// In your tests
const manager = JobSubscriptionManager.getInstance();
const stats = manager.getStats();

expect(stats.totalSubscriptions).toBe(expectedCount);
```

## Troubleshooting

### Common Issues

1. **Multiple subscriptions still showing**: Check that all components are using the updated imports
2. **Rate limiting errors**: Reduce subscription frequency or implement proper cleanup
3. **Memory leaks**: Ensure all components properly cleanup subscriptions in useEffect cleanup

### Debug Steps

1. Enable logging: Set `enableLogging: true` in subscription options
2. Use subscription monitor: Add `<SubscriptionMonitor />` to your app
3. Check console for rate limiting warnings
4. Verify proper cleanup with `manager.getStats()`

## Support

For questions or issues with the migration:

1. Check the test files for usage examples
2. Use the SubscriptionMonitor for real-time debugging
3. Enable development logging for detailed information
4. Review the JobSubscriptionManager source for implementation details