# OpenTelemetry Implementation Guide

This document describes the OpenTelemetry instrumentation implemented for the `globeco-portfolio-management-portal` application.

## Overview

The application is instrumented to send both metrics and traces to the OpenTelemetry Collector running in the Kubernetes cluster. The implementation includes:

- **Automatic instrumentation** for HTTP requests, Next.js operations, and Node.js operations
- **Custom metrics** for business-specific operations
- **Custom tracing** for detailed operation tracking
- **Client-side telemetry** for user interactions
- **API route instrumentation** for server-side operations

## Architecture

```
Next.js App → OpenTelemetry SDK → OTLP Exporter → OTel Collector → Jaeger/Prometheus
```

## Files Added/Modified

### Core Telemetry Files
- `src/lib/telemetry.ts` - Main OpenTelemetry SDK configuration
- `src/lib/metrics.ts` - Custom metrics and tracing utilities
- `src/lib/withTelemetry.ts` - Higher-order functions for API instrumentation
- `src/lib/useTelemetry.ts` - React hooks and server utilities
- `instrumentation.ts` - Next.js instrumentation entry point
- `src/middleware.ts` - Request/response middleware for automatic tracking

### API Endpoints
- `src/app/api/telemetry/pageview/route.ts` - Client-side page view tracking
- `src/app/api/telemetry/event/route.ts` - Client-side event tracking
- `src/app/api/telemetry/error/route.ts` - Client-side error tracking

### Configuration
- `package.json` - Added OpenTelemetry dependencies
- `next.config.js` - Enabled instrumentation hook

## Usage Examples

### 1. API Route Instrumentation

```typescript
import { withTelemetry } from '@/lib/withTelemetry';

export const GET = withTelemetry(async (req: NextRequest) => {
  // Your API logic here
  return NextResponse.json(data);
}, 'operation_name');
```

### 2. Database Operation Tracking

```typescript
import { withDbTelemetry } from '@/lib/withTelemetry';

const result = await withDbTelemetry(
  () => database.query('SELECT * FROM users'),
  'select',
  'users'
);
```

### 3. Client-Side Event Tracking

```typescript
import { useTelemetry } from '@/lib/useTelemetry';

function MyComponent() {
  const { trackEvent, trackError } = useTelemetry();
  
  const handleClick = () => {
    trackEvent('button_click', { button_id: 'submit' });
  };
  
  // Component automatically tracks page views on mount
}
```

### 4. Server Component Tracking

```typescript
import { serverTelemetry } from '@/lib/useTelemetry';

export default function ServerComponent() {
  serverTelemetry.trackComponentRender('ServerComponent');
  return <div>Content</div>;
}
```

### 5. Server Action Tracking

```typescript
import { serverTelemetry } from '@/lib/useTelemetry';

async function myServerAction() {
  return await serverTelemetry.trackServerAction(
    'user_update',
    async () => {
      // Your server action logic
      return updateUser(data);
    }
  );
}
```

## Metrics Collected

### Automatic Metrics
- HTTP request counts and durations
- Next.js page loads and API calls
- Node.js runtime metrics
- Error counts and types

### Custom Metrics
- `api_requests_total` - Total API requests with method, endpoint, status
- `api_response_duration_ms` - API response times
- `page_views_total` - Page view counts
- `active_users` - Active user count
- `errors_total` - Error counts by type and context
- `db_operations_total` - Database operation counts
- `db_operation_duration_ms` - Database operation durations

## Traces Collected

### Automatic Traces
- HTTP requests (incoming and outgoing)
- Next.js page renders and API routes
- Database queries (if using instrumented libraries)

### Custom Traces
- API operations with detailed attributes
- Database operations with table and operation type
- Server actions and component renders
- Custom business operations

## Configuration

### Environment Variables
The telemetry system uses these environment variables:

- `NODE_ENV` - Sets the deployment environment attribute
- `OTEL_SERVICE_NAME` - Overrides the default service name (optional)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Overrides the collector endpoint (optional)

### Collector Endpoint
The application is configured to send telemetry to:
- **gRPC**: `otel-collector-collector.monitoring.svc.cluster.local:4317`

This endpoint is only accessible from within the Kubernetes cluster.

## Installation

1. Install dependencies:
```bash
npm install
```

2. The instrumentation will automatically start when the application runs.

## Deployment Considerations

### Kubernetes
- The application must run within the same Kubernetes cluster as the OpenTelemetry Collector
- No additional configuration needed for the collector endpoint
- Telemetry data will automatically flow to Jaeger and Prometheus

### Development
- In development mode, telemetry will still be sent to the collector
- If the collector is not available, the application will continue to work normally
- Telemetry errors are logged but don't affect application functionality

## Monitoring

### Jaeger (Traces)
- Access Jaeger UI to view distributed traces
- Search for traces by service name: `globeco-portfolio-management-portal`
- View detailed request flows and performance bottlenecks

### Prometheus (Metrics)
- Query custom metrics using PromQL
- Set up alerts based on error rates, response times, etc.
- Create dashboards for business metrics

## Best Practices

1. **Don't over-instrument** - Focus on critical paths and business operations
2. **Use attributes wisely** - Add meaningful context without creating high cardinality
3. **Handle errors gracefully** - Telemetry should never break the application
4. **Monitor performance impact** - Telemetry adds minimal overhead but should be monitored
5. **Use sampling** - For high-traffic applications, consider trace sampling

## Troubleshooting

### Common Issues

1. **Telemetry not appearing**
   - Check that the collector endpoint is reachable
   - Verify the application is running in the correct Kubernetes namespace
   - Check application logs for telemetry initialization errors

2. **High memory usage**
   - Reduce metric cardinality by limiting attribute values
   - Implement trace sampling for high-traffic endpoints

3. **Missing traces**
   - Ensure API routes are wrapped with `withTelemetry`
   - Check that the instrumentation hook is enabled in Next.js config

### Debug Mode
To enable debug logging, set the environment variable:
```bash
OTEL_LOG_LEVEL=debug
```

## Future Enhancements

- Add custom dashboards for business metrics
- Implement alerting rules for critical errors
- Add user session tracking
- Implement distributed tracing across microservices
- Add performance budgets and SLA monitoring