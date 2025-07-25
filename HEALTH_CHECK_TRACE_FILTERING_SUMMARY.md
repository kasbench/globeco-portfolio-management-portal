# Health Check Trace Filtering - Implementation Summary

## Problem
Health check traces were appearing in Jaeger despite attempts to filter them out, creating noise and unnecessary data volume.

## Root Cause
The OpenTelemetry SDK was automatically creating traces due to the `OTEL_TRACES_EXPORTER=otlp` environment variable, regardless of our custom filtering logic in the `withTelemetry` wrapper.

## Solution
Instead of trying to filter traces after they're created, we prevent trace creation entirely for health check and debug endpoints by **not using the `withTelemetry` wrapper** for these endpoints.

## Changes Made

### 1. Health Check Endpoint (`src/app/api/health/route.ts`)
- **Before**: Used `withTelemetry` wrapper which created traces
- **After**: Plain Next.js API handler - no traces created
- **Result**: No health check traces sent to Jaeger

### 2. Debug/Test Endpoints
- `src/app/api/telemetry/test/route.ts` - Removed `withTelemetry` wrapper
- `src/app/api/test-metrics/route.ts` - Removed `withTelemetry` wrapper  
- `src/app/api/debug/telemetry-status/route.ts` - Already didn't use wrapper

### 3. Simplified `withTelemetry` Function (`src/lib/withTelemetry.ts`)
- Removed complex filtering logic
- Now only handles business logic endpoints that should generate traces
- Cleaner, more maintainable code

### 4. Updated Documentation (`docs/telemetry-filtering.md`)
- Clear instructions on how filtering works
- Examples of how to add new filtered endpoints
- Testing guidance

## Benefits

1. **Effective Filtering**: Health check traces no longer appear in Jaeger
2. **Simpler Implementation**: No complex filtering logic or version compatibility issues
3. **Better Performance**: No overhead of creating and then filtering traces
4. **Maintainable**: Easy to understand which endpoints generate traces
5. **Metrics Preserved**: Health check endpoints still record metrics for monitoring

## How It Works

### Filtered Endpoints (No Traces)
```typescript
// Plain handler - no traces generated
export async function GET(req: NextRequest) {
  // Handler logic
  // Metrics are still recorded via telemetryUtils calls
}
```

### Business Logic Endpoints (With Traces)
```typescript
// Wrapped handler - traces generated and sent to Jaeger
export const GET = withTelemetry(async (req: NextRequest) => {
  // Handler logic
}, 'operation_name');
```

## Testing
- Deploy the changes to Kubernetes
- Call health check endpoint: `curl http://your-app/api/health`
- Verify no health check traces appear in Jaeger
- Verify other endpoints still generate traces
- Confirm metrics are still recorded for all endpoints

## Future Maintenance
To add new endpoints to the filter list:
1. Don't use the `withTelemetry` wrapper
2. Use a plain Next.js API handler
3. Manually record metrics if needed using `telemetryUtils`