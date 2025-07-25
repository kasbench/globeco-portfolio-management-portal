# Telemetry Filtering Configuration

## Overview

This document describes how telemetry traces are filtered to reduce noise in Jaeger and improve observability.

## Filtered Endpoints

The following endpoints are excluded from trace generation but still record basic metrics:

### Health Check Endpoints
- `/api/health` - Main application health check

### Debug and Test Endpoints
- `/api/debug/telemetry-status` - Telemetry status check
- `/api/telemetry/test` - Telemetry test endpoint  
- `/api/test-metrics` - Metrics testing endpoint

## Implementation

The filtering is implemented by **not using the `withTelemetry` wrapper** for these specific endpoints. Instead, they use plain Next.js API handlers:

```typescript
// Instead of using withTelemetry wrapper:
// export const GET = withTelemetry(handler, 'health_check');

// Use plain handler to avoid trace generation:
export async function GET(req: NextRequest) {
  // Handler logic here - no traces will be created
}
```

### Regular API Endpoints
Regular business logic endpoints continue to use the `withTelemetry` wrapper and will generate traces:

```typescript
export const GET = withTelemetry(async (req: NextRequest) => {
  // This will create traces and send them to Jaeger
}, 'business_operation');
```

## What's Still Recorded

Even for filtered endpoints, the following metrics are still recorded:
- API request counts
- Response times
- Error counts
- Basic performance metrics

## What's Filtered Out

For filtered endpoints, the following are NOT sent to the OpenTelemetry collector:
- Distributed traces/spans
- Detailed trace attributes
- Span relationships and timing
- Custom span creation

## Benefits

1. **Reduced Noise**: Health checks and debug endpoints don't clutter Jaeger traces
2. **Better Performance**: Less overhead for frequently called endpoints
3. **Cost Savings**: Reduced data volume sent to observability backend
4. **Focused Observability**: Traces focus on actual business operations

## Adding New Filtered Endpoints

To add new endpoints to the filter list, simply **don't use the `withTelemetry` wrapper** for that endpoint:

```typescript
// Instead of:
export const GET = withTelemetry(handler, 'operation_name');

// Use:
export async function GET(req: NextRequest) {
  // Your handler logic here
  // This endpoint will not generate traces
}
```

## Testing

You can verify the filtering works by:

1. Calling a health check endpoint: `curl http://localhost:3000/api/health`
2. Checking the logs for "Skipping telemetry traces" message
3. Verifying no traces appear in Jaeger for these endpoints
4. Confirming metrics are still recorded in your metrics backend