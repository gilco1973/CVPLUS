# generateCVPreview Firebase Function Implementation

## Overview
Created a new Firebase Function `generateCVPreview` that provides real-time CV preview functionality for the frontend. This function is optimized for speed and lightweight operation, designed specifically for preview use cases.

## Implementation Details

### File Location
- **Function**: `/functions/src/functions/generateCVPreview.ts`
- **Tests**: `/functions/src/tests/generateCVPreview.integration.test.ts`
- **Export**: Added to `/functions/src/index.ts`

### Function Characteristics
- **Type**: Firebase Functions v2 `onCall` (httpsCallable)
- **Timeout**: 60 seconds (optimized for quick preview)
- **Memory**: 1GiB (lower than full generation's 2GiB)
- **CORS**: Uses existing corsOptions for frontend compatibility

### Parameters
```typescript
{
  jobId: string,        // Required - Job identifier
  templateId?: string,  // Optional - Template type (defaults to 'modern')
  features?: string[]   // Optional - Features to include in preview
}
```

### Response Format
```typescript
{
  success: boolean,
  html: string,         // Generated HTML preview
  template: string,     // Template used (with fallback)
  features: string[],   // Features applied (with fallback)
  timestamp: string     // ISO timestamp of generation
}
```

### Key Features

#### 1. Authentication & Authorization
- Validates Firebase Auth token
- Verifies user ownership of the job
- Throws appropriate errors for unauthorized access

#### 2. Data Validation
- Validates required `jobId` parameter
- Checks for existence of parsed CV data
- Handles missing or invalid job documents

#### 3. Privacy Mode Support
- Automatically selects privacy version when `privacy-mode` feature is enabled
- Falls back to regular parsed data when privacy version unavailable

#### 4. Template & Feature Handling
- Uses existing CVGenerator service and template system
- Supports all existing templates (modern, classic, creative)
- Processes features through FeatureRegistry
- Provides sensible defaults (template: 'modern', features: [])

#### 5. Preview-Specific Enhancements
- Adds visual preview indicator to generated HTML
- Indicator is hidden during print for clean output
- Lightweight operation (no file generation/saving)

#### 6. Error Handling
- Comprehensive error logging with stack traces
- Meaningful error messages for different failure scenarios
- Graceful handling of missing data or permissions

### Differences from `generateCV`

| Aspect | generateCV | generateCVPreview |
|--------|-----------|------------------|
| **Purpose** | Full CV generation with file saving | Real-time preview only |
| **Timeout** | 600 seconds (10 minutes) | 60 seconds (1 minute) |
| **Memory** | 2GiB | 1GiB |
| **File Operations** | Saves HTML, PDF, DOCX to storage | No file operations |
| **Feature Processing** | Full async feature processing | Uses existing template system |
| **Job Updates** | Updates job status and progress | No job document updates |
| **Output** | File URLs and metadata | HTML content only |

### Technical Implementation

#### Core Logic Flow
1. **Authentication Check** - Validate Firebase Auth token
2. **Parameter Validation** - Ensure required jobId is present
3. **Job Data Retrieval** - Fetch and validate job document
4. **Authorization** - Verify user ownership of job
5. **Data Selection** - Choose regular or privacy version based on features
6. **HTML Generation** - Use CVGenerator with template and features
7. **Preview Enhancement** - Add preview-specific styling
8. **Response** - Return formatted response with HTML and metadata

#### Privacy Mode Logic
```typescript
const cvData = features?.includes('privacy-mode') && jobData?.privacyVersion 
  ? jobData.privacyVersion 
  : parsedCV;
```

#### Preview Styling Addition
- Adds fixed-position preview indicator
- Uses responsive design principles
- Hidden during print media queries
- Non-intrusive blue badge in top-right corner

### Testing
Comprehensive integration tests cover:
- Parameter validation (jobId requirement)
- User ownership validation
- CV data presence validation
- Privacy mode data selection
- Preview styling application
- Template fallback handling
- Features array processing
- Response formatting

All tests pass successfully, ensuring robust functionality.

### Usage from Frontend
```typescript
const generatePreview = httpsCallable(functions, 'generateCVPreview');

const result = await generatePreview({
  jobId: 'user-job-id',
  templateId: 'modern',
  features: ['skills-visualization', 'privacy-mode']
});

const previewHTML = result.data.html;
```

### Performance Optimizations
1. **No File I/O** - Skips storage operations for speed
2. **Reduced Memory** - 1GiB vs 2GiB for full generation
3. **Short Timeout** - 60 seconds vs 10 minutes
4. **Minimal Job Updates** - No status tracking overhead
5. **Lightweight Response** - Only essential data returned

### Security Considerations
- All existing security measures maintained
- User authentication required
- Job ownership verification
- CORS protection enabled
- Input validation and sanitization

## Summary
The `generateCVPreview` function successfully provides the missing real-time preview functionality requested by the frontend. It reuses existing infrastructure (CVGenerator, templates, features) while optimizing for speed and simplicity. The implementation follows Firebase Functions v2 best practices and maintains compatibility with the existing codebase architecture.