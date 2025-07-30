# Structured Logging Implementation

This document describes the structured JSON logging implementation for the Globeco Portfolio Management Portal.

## Overview

The application now implements comprehensive structured logging in JSON format to enable log aggregation and analysis. All API calls are logged at INFO level or higher, with consistent field structure across all log entries.

## Log Format

All logs follow this JSON structure:

```json
{
  "timestamp": "2025-07-30T15:17:24.979809+00:00",
  "level": "info",
  "msg": "Incoming GET request to /api/v1/portfolio/687599d96ba8d303aac5ff2c",
  "application": "globeco-portfolio-management-portal",
  "server": "globeco-portfolio-management-portal-58c66bc476-4t5bq",
  "location": "app:None:0",
  "request_id": "708bdf36-cb71-414f-89b8-b1054e99aebd",
  "correlation_id": "708bdf36-cb71-414f-89b8-b1054e99aebd",
  "method": "GET",
  "path": "/api/v1/portfolio/687599d96ba8d303aac5ff2c",
  "query_params": "",
  "ip_address": "10.1.5.176",
  "remote_addr": "10.1.5.176",
  "user_agent": "axios/1.10.0",
  "status": 200,
  "bytes": 121,
  "duration": 2.46
}
```

## Core Fields

### Required Fields
- `timestamp`: ISO 8601 timestamp with timezone
- `level`: Log level (fatal, error, warn, info, debug, trace)
- `msg`: Human-readable message
- `application`: Service name (from OTEL_SERVICE_NAME)
- `server`: Server/pod identifier
- `location`: Code location (file:line:column format)

### Request Tracking Fields
- `request_id`: Unique identifier for each request
- `correlation_id`: Correlation ID for tracing across services
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `path`: Request path
- `query_params`: Query string parameters

### Network Fields
- `ip_address`: Client IP address
- `remote_addr`: Remote address (same as ip_address)
- `user_agent`: Client user agent string

### Response Fields
- `status`: HTTP status code
- `bytes`: Response size in bytes
- `duration`: Request duration in seconds (with decimals)

### Entity-Specific Fields
- `portfolio_id`: Portfolio identifier
- `model_id`: Model identifier
- `order_id`: Order identifier
- `trade_id`: Trade identifier
- `execution_id`: Execution identifier
- `rebalance_id`: Rebalance identifier

## Implementation Components

### 1. Core Logger (`src/lib/logger.ts`)

The main logging infrastructure providing:
- Structured JSON output
- Request context management
- Log level filtering
- Automatic field population

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('Operation completed', { custom_field: 'value' });

// HTTP request logging
const context = logger.createRequestContext(req);
logger.logIncomingRequest(context, queryParams);
logger.logCompletedRequest(context, statusCode, responseBytes);
```

### 2. API Logger Helpers (`src/lib/apiLogger.ts`)

Convenience functions for common API logging patterns:

```typescript
import { withStructuredLogging, logApiOperation, logServiceOperation } from '@/lib/apiLogger';

// Wrap API handlers
export const GET = withStructuredLogging(async (req, context) => {
  logApiOperation('Get portfolio requested', context, { portfolio_id: id });
  logServiceOperation('Fetching portfolio', context, 'get_portfolio', { portfolio_id: id });
  // ... handler logic
}, 'get_portfolio');
```

### 3. Enhanced Telemetry Wrapper (`src/lib/withTelemetry.ts`)

Updated to use structured logging while maintaining OpenTelemetry integration.

### 4. Middleware Enhancement (`src/middleware.ts`)

Adds correlation ID headers and basic request logging for non-API routes.

## Usage Patterns

### API Route Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withStructuredLogging, logApiOperation, logServiceOperation, createErrorResponse } from '@/lib/apiLogger';

export const GET = withStructuredLogging(async (req: NextRequest, context) => {
  const { id } = await params;
  
  logApiOperation('Get resource requested', context, { resource_id: id });
  
  try {
    logServiceOperation('Fetching resource', context, 'get_resource', { resource_id: id });
    
    const resource = await service.getResource(id);
    
    logServiceOperation('Successfully fetched resource', context, 'get_resource', {
      resource_id: id,
      resource_name: resource.name
    });
    
    logApiOperation('Successfully returned resource', context, { resource_id: id });
    
    return NextResponse.json(resource);
    
  } catch (error) {
    return createErrorResponse('Resource not found', 404, context, { resource_id: id });
  }
}, 'get_resource');
```

### Service Layer Logging

```typescript
import { logger } from '@/lib/logger';

class MyService {
  async performOperation(id: string, context?: RequestContext) {
    logger.logServiceOperation('Starting operation', context, 'perform_operation', { entity_id: id });
    
    try {
      const result = await this.doWork(id);
      
      logger.logServiceOperation('Operation completed', context, 'perform_operation', {
        entity_id: id,
        result_count: result.length
      });
      
      return result;
    } catch (error) {
      logger.logError('Operation failed', error, context, {
        entity_id: id,
        operation: 'perform_operation'
      });
      throw error;
    }
  }
}
```

## Log Levels

- **FATAL**: System is unusable
- **ERROR**: Error conditions that need attention
- **WARN**: Warning conditions
- **INFO**: General information (default for API requests)
- **DEBUG**: Debug information
- **TRACE**: Very detailed tracing information

## Request Flow Logging

Each API request generates these log entries:

1. **Incoming Request**: When request is received
2. **API Operation**: When API handler starts processing
3. **Service Operations**: For each service call made
4. **Completed Request**: When response is sent

Example flow for `GET /api/portfolios/123`:

```json
{"timestamp":"2025-07-30T15:17:24.979809+00:00","level":"info","msg":"Incoming GET request to /api/portfolios/123","application":"globeco-portfolio-management-portal","server":"globeco-portfolio-management-portal-58c66bc476-4t5bq","location":"app:None:0","request_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","correlation_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","method":"GET","path":"/api/portfolios/123","query_params":"","ip_address":"10.1.5.176","remote_addr":"10.1.5.176","user_agent":"axios/1.10.0"}

{"timestamp":"2025-07-30T15:17:24.980109+00:00","level":"info","msg":"Get portfolio requested","application":"globeco-portfolio-management-portal","server":"globeco-portfolio-management-portal-58c66bc476-4t5bq","location":"app.api_v1:None:0","request_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","correlation_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","endpoint":"/api/portfolios/123","portfolio_id":"123"}

{"timestamp":"2025-07-30T15:17:24.980187+00:00","level":"info","msg":"Fetching portfolio","application":"globeco-portfolio-management-portal","server":"globeco-portfolio-management-portal-58c66bc476-4t5bq","location":"app.services:None:0","request_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","correlation_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","operation":"get_portfolio","portfolio_id":"123"}

{"timestamp":"2025-07-30T15:17:24.981990+00:00","level":"info","msg":"Successfully found portfolio","application":"globeco-portfolio-management-portal","server":"globeco-portfolio-management-portal-58c66bc476-4t5bq","location":"app.services:None:0","request_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","correlation_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","operation":"get_portfolio","portfolio_id":"123","portfolio_name":"My Portfolio"}

{"timestamp":"2025-07-30T15:17:24.982246+00:00","level":"info","msg":"Completed GET /api/portfolios/123 - 200","application":"globeco-portfolio-management-portal","server":"globeco-portfolio-management-portal-58c66bc476-4t5bq","location":"app:None:0","request_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","correlation_id":"708bdf36-cb71-414f-89b8-b1054e99aebd","method":"GET","path":"/api/portfolios/123","status":200,"ip_address":"10.1.5.176","remote_addr":"10.1.5.176","user_agent":"axios/1.10.0","bytes":121,"duration":2.46}
```

## Configuration

The logger is configured through environment variables:

- `OTEL_SERVICE_NAME`: Application name (default: globeco-portfolio-management-portal)
- `HOSTNAME`: Server identifier
- `NODE_ENV`: Environment (affects error stack trace inclusion)

## Migration from Console Logging

The implementation replaces previous console.log/console.error statements with structured logging:

### Before
```typescript
console.log('Processing request for portfolio:', portfolioId);
console.error('Failed to fetch portfolio:', error);
```

### After
```typescript
logger.logApiOperation('Processing portfolio request', context, { portfolio_id: portfolioId });
logger.logError('Failed to fetch portfolio', error, context, { portfolio_id: portfolioId });
```

## Benefits

1. **Consistent Format**: All logs follow the same JSON structure
2. **Request Tracing**: Every request has unique IDs for tracking
3. **Correlation**: Related operations can be correlated across services
4. **Aggregation Ready**: JSON format enables easy parsing by log aggregators
5. **Performance Monitoring**: Duration and status tracking for all requests
6. **Error Context**: Rich error information with request context
7. **Debugging**: Detailed operation tracking with entity IDs

## Log Aggregation

The structured format enables easy integration with log aggregation systems like:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Datadog
- New Relic
- CloudWatch Logs

Example Elasticsearch query to find all errors for a specific portfolio:
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "error" } },
        { "term": { "portfolio_id": "123" } }
      ]
    }
  }
}
```

## Performance Considerations

- Minimal overhead: JSON serialization only when logging
- Request context cleanup: Automatic memory management
- Log level filtering: Debug/trace logs can be disabled in production
- Async logging: Non-blocking log output

## Future Enhancements

1. **Log Sampling**: Implement sampling for high-volume endpoints
2. **Sensitive Data Filtering**: Automatic PII redaction
3. **Custom Formatters**: Support for different output formats
4. **Log Rotation**: File-based logging with rotation
5. **Metrics Integration**: Automatic metric generation from logs