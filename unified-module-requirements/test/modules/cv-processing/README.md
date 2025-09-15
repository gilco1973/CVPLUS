# CV Processing Module

This module handles CV analysis and processing for the CVPlus platform.

## Features

- CV parsing and analysis
- ATS optimization
- Skills extraction
- Format conversion

## Usage

```typescript
import { CVProcessor } from '@cvplus/cv-processing';

const processor = new CVProcessor();
const result = await processor.analyze(cvData);
```