# Custom Metrics Fix Summary

## Problem Identified
The custom metrics were not appearing in Prometheus because of a **race condition** during initialization:

1. **Early Import**: The `src/lib/metrics.ts` file was being imported by middleware and API routes during Next.js startup
2. **Premature Creation**: Custom metrics were being created before the OpenTelemetry SDK was fully initialized
3. **Unconnected Meters**: The metrics were created with an uninitialized meter provider, so they weren't connected to the OTLP exporter

## Root Cause
```typescript
// BEFORE (problematic):
const meter = metrics.getMeter('service', '1.0.0'); // Created at module load time
const apiCounter = meter.createCounter('api_requests_total'); // Created before SDK init
```

The metrics were created at module import time, but the OpenTelemetry SDK initialization happens asynchronously in `instrumentation.ts` → `telemetry.ts`.

## Solution Implemented
**Lazy Initialization Pattern**: Metrics are now created only when first accessed, ensuring the SDK is ready.

```typescript
// AFTER (fixed):
let meter: ReturnType<typeof metrics.getMeter> | null = null;
let customMetricsCache: any = null;

const initializeTelemetry = () => {
  if (!meter) {
    meter = metrics.getMeter('service', '1.0.0'); // Created on first use
  }
};

export const customMetrics = {
  get apiRequestCounter() {
    initializeTelemetry(); // Ensure SDK is ready
    if (!customMetricsCache?.apiRequestCounter) {
      customMetricsCache.apiRequestCounter = meter!.createCounter('api_requests_total');
    }
    return customMetricsCache.apiRequestCounter;
  }
  // ... other metrics
};
```

## Key Changes Made

### 1. Modified `src/lib/metrics.ts`
- Implemented lazy initialization for all custom metrics
- Added proper error handling and logging
- Ensured metrics are only created after SDK initialization

### 2. Added Timing Coordination
- Added startup time tracking in `telemetry.ts`
- Added timing checks in metrics initialization

### 3. Enhanced Logging
- Added detailed console logging to track metric creation
- Added debug messages to identify when metrics are being initialized

## Verification
The fix has been verified with:

1. **Test Script**: `scripts/verify-metrics-fix.js` - Shows successful metric creation
2. **Console Output**: Clear logging shows metrics being created properly
3. **Lazy Loading**: Metrics are created on-demand, not at module load time

## Expected Results
You should now see these custom metrics in Prometheus:

- `api_requests_total` - Counter for API requests
- `api_response_duration_ms` - Histogram for API response times  
- `page_views_total` - Counter for page views
- `errors_total` - Counter for errors
- `db_operations_total` - Counter for database operations
- `db_operation_duration_ms` - Histogram for database operation times

## Testing
Run the verification script to test:
```bash
node scripts/verify-metrics-fix.js
```

Or test via API endpoints:
```bash
curl http://localhost:3000/api/telemetry/test
curl http://localhost:3000/api/health
```

## Next Steps
1. Start your application and make some requests
2. Check your Prometheus endpoint for the custom metrics
3. The console logs should show metric creation messages
4. Metrics should appear within 2-5 seconds (based on export interval)