# Design Document

## Overview

This design implements two new passthrough APIs that act as simple proxies to downstream services. The implementation follows existing patterns in the codebase, extending the current `securityService.ts` for securities data and creating a new allocation service for execution processing. Both APIs maintain minimal error handling complexity while providing reliable access to downstream services.

## Architecture

### High-Level Flow
```
Client Request → Portal API Route → Service Layer → Downstream Service → Response Passthrough
```

### Service Integration Points
- **Securities API**: Extends existing `securityService.ts` with new `getAllSecurities()` method
- **Allocations API**: Creates new `allocationService.ts` following established service patterns
- **API Routes**: Creates two new Next.js API routes following existing route patterns

## Components and Interfaces

### 1. Securities API Extension

**File**: `src/lib/api/securityService.ts`
- Add new method `getAllSecurities()` that calls `GET /api/v1/securities` on port 8000
- Follows existing patterns for HTTP client setup, telemetry wrapping, and error handling
- Returns raw response from downstream service without modification

**File**: `src/app/api/securities/route.ts`
- New Next.js API route handler
- Uses `withTelemetry` wrapper following existing patterns
- Calls `securityService.getAllSecurities()` and returns response

### 2. Allocations API Implementation

**File**: `src/lib/api/allocationService.ts`
- New service class following `SecurityService` patterns
- HTTP client configured for `globeco-allocation-service` on port 8089
- Single method `sendExecutions()` that POSTs empty JSON payload
- Includes telemetry wrapping and basic error handling

**File**: `src/app/api/allocations/executions/send/route.ts`
- New Next.js API route handler
- Uses `withTelemetry` wrapper
- Calls `allocationService.sendExecutions()` and returns response

### 3. Service Configuration

Both services use environment variables for host/port configuration:
- `SECURITY_SERVICE_HOST` / `SECURITY_SERVICE_PORT` (existing)
- `ALLOCATION_SERVICE_HOST` / `ALLOCATION_SERVICE_PORT` (new)

## Data Models

### Securities Response Type
```typescript
interface SecurityOut {
  ticker: string;
  description: string;
  securityTypeId: string;
  version: number;
  securityId: string;
  securityType: {
    securityTypeId: string;
    abbreviation: string;
    description: string;
  };
}
```

### Allocations Response Type
```typescript
interface AllocationExecutionResponse {
  processedCount: number;
  fileName: string;
  status: string;
  message: string;
  jobName: string;
  jobStatus: string;
  executionMode: string;
}
```

## Error Handling

### Passthrough Strategy
- Both APIs implement minimal error handling as specified
- HTTP errors from downstream services are passed through with original status codes
- Network errors result in 500-level responses
- No retry logic implemented
- Existing telemetry and logging patterns maintained

### Error Flow
1. Service call fails → Original error preserved
2. Network timeout → 500 Internal Server Error
3. Service unavailable → 500 Internal Server Error
4. Invalid response → Pass through original status/response

## Testing Strategy

### Unit Tests
- Test service layer methods in isolation
- Mock HTTP responses for both success and error scenarios
- Verify proper error passthrough behavior
- Test environment variable configuration

### Integration Tests
- Test complete API route → service → downstream service flow
- Verify response format matches expected structure
- Test error scenarios with actual HTTP failures
- Validate telemetry integration

### API Route Tests
- Test HTTP method handling (GET for securities, POST for allocations)
- Verify request/response format
- Test error response formats
- Validate telemetry wrapper integration

## Implementation Considerations

### Service Layer Patterns
- Follow existing `SecurityService` class structure
- Use same HTTP client configuration patterns
- Implement consistent logging and telemetry
- Maintain singleton export pattern

### API Route Patterns
- Use `withTelemetry` wrapper for all routes
- Follow existing error handling patterns
- Maintain consistent response format
- Use proper TypeScript typing

### Configuration Management
- Use environment variables for service endpoints
- Provide sensible defaults for development
- Follow existing naming conventions
- Document required environment variables

### Performance Considerations
- No caching implemented (as per passthrough requirement)
- Use existing timeout configurations
- Leverage existing telemetry for monitoring
- Maintain minimal processing overhead