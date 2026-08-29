# Design Document

## Overview

This design adds three GET passthrough API routes to the GlobeCo Portfolio Management Portal that proxy requests to the Portfolio Accounting Service. The routes follow the existing `withTelemetry` + `tracedFetch` pattern established in the codebase, providing transparent request forwarding with built-in observability.

## Architecture

The passthrough routes follow the BFF (Backend-for-Frontend) gateway pattern already used throughout the portal. Each route:

1. Receives a client request via Next.js App Router
2. Constructs the upstream URL using the configured accounting service base URL
3. Forwards the request (including query parameters) using `tracedFetch` with a 30-second timeout
4. Returns the upstream response body and status code unchanged

```
Client → Next.js API Route (withTelemetry) → tracedFetch → Accounting Service
                                                    ↓
Client ← NextResponse (passthrough body/status) ← Response
```

## Components

### 1. GET /api/transactions Handler

**File:** `src/app/api/transactions/route.ts` (add GET export alongside existing POST)

This handler lists transactions from the accounting service. It coexists with the existing POST handler in the same file.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { tracedFetch } from '@/lib/telemetry-axios';

const ACCOUNTING_SERVICE_HOST = process.env.ACCOUNTING_SERVICE_HOST || 'globeco-portfolio-accounting-service';
const ACCOUNTING_SERVICE_PORT = process.env.ACCOUNTING_SERVICE_PORT || '8087';
const ACCOUNTING_BASE_URL = `http://${ACCOUNTING_SERVICE_HOST}:${ACCOUNTING_SERVICE_PORT}`;

export const GET = withTelemetry(async (req: NextRequest) => {
  const url = new URL(req.url);
  const queryString = url.search; // includes leading '?'

  const upstreamUrl = `${ACCOUNTING_BASE_URL}/api/v1/transactions${queryString}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const upstreamResponse = await tracedFetch(
      upstreamUrl,
      { method: 'GET', signal: controller.signal },
      'get_transactions_upstream'
    );
    clearTimeout(timeout);

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error: any) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}, 'get_transactions');
```

### 2. GET /api/transactions/[id] Handler

**File:** `src/app/api/transactions/[id]/route.ts` (new file)

This handler retrieves a single transaction by ID. The `id` is extracted from the route context params.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { tracedFetch } from '@/lib/telemetry-axios';

const ACCOUNTING_SERVICE_HOST = process.env.ACCOUNTING_SERVICE_HOST || 'globeco-portfolio-accounting-service';
const ACCOUNTING_SERVICE_PORT = process.env.ACCOUNTING_SERVICE_PORT || '8087';
const ACCOUNTING_BASE_URL = `http://${ACCOUNTING_SERVICE_HOST}:${ACCOUNTING_SERVICE_PORT}`;

export const GET = withTelemetry(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const upstreamUrl = `${ACCOUNTING_BASE_URL}/api/v1/transaction/${id}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const upstreamResponse = await tracedFetch(
      upstreamUrl,
      { method: 'GET', signal: controller.signal },
      'get_transaction_by_id_upstream'
    );
    clearTimeout(timeout);

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error: any) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}, 'get_transaction_by_id');
```

### 3. GET /api/balances Handler

**File:** `src/app/api/balances/route.ts` (new file)

This handler lists balances from the accounting service with query parameter forwarding.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTelemetry } from '@/lib/withTelemetry';
import { tracedFetch } from '@/lib/telemetry-axios';

const ACCOUNTING_SERVICE_HOST = process.env.ACCOUNTING_SERVICE_HOST || 'globeco-portfolio-accounting-service';
const ACCOUNTING_SERVICE_PORT = process.env.ACCOUNTING_SERVICE_PORT || '8087';
const ACCOUNTING_BASE_URL = `http://${ACCOUNTING_SERVICE_HOST}:${ACCOUNTING_SERVICE_PORT}`;

export const GET = withTelemetry(async (req: NextRequest) => {
  const url = new URL(req.url);
  const queryString = url.search;

  const upstreamUrl = `${ACCOUNTING_BASE_URL}/api/v1/balances${queryString}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const upstreamResponse = await tracedFetch(
      upstreamUrl,
      { method: 'GET', signal: controller.signal },
      'get_balances_upstream'
    );
    clearTimeout(timeout);

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error: any) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}, 'get_balances');
```

## Interfaces

### Upstream URL Mapping

| Portal Endpoint | Upstream Endpoint | Query Params Forwarded |
|----------------|-------------------|----------------------|
| `GET /api/transactions` | `GET /api/v1/transactions` | Yes |
| `GET /api/transactions/[id]` | `GET /api/v1/transaction/{id}` | No |
| `GET /api/balances` | `GET /api/v1/balances` | Yes |

### Response Contract

All three endpoints return:
- **Success:** The upstream response body (text) with the upstream status code and content-type header.
- **Error (network/timeout):** `{ "error": "<message>" }` with status `500`.

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ACCOUNTING_SERVICE_HOST` | `globeco-portfolio-accounting-service` | Upstream service hostname |
| `ACCOUNTING_SERVICE_PORT` | `8087` | Upstream service port |

## Data Models

No new data models are introduced. These routes are pure passthroughs — they do not parse, validate, or transform request or response bodies. The portal treats both the request query parameters and upstream response body as opaque text.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Upstream returns non-2xx | Status code and body are passed through as-is to the client |
| Network error (ECONNREFUSED, DNS failure) | Return `500` with `{ "error": "Failed to fetch <resource>" }` |
| Timeout (30 seconds exceeded) | AbortController aborts the request; caught as error, returns `500` |
| Upstream returns unexpected content-type | Content-type header is forwarded; body is returned as text |

The `withTelemetry` wrapper provides additional error handling:
- Structured logging of the request lifecycle (start, completion, errors)
- Metrics recording (method, endpoint, status code, duration)
- Distributed tracing spans with request correlation IDs

## Observability

Each handler is wrapped with `withTelemetry` which automatically provides:
- Request/response structured logging with correlation IDs
- API request duration metrics
- Distributed trace spans

Additionally, `tracedFetch` injects OpenTelemetry trace context headers into outbound requests, enabling end-to-end distributed tracing across the portal and accounting service.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Query parameter forwarding preserves all parameters

*For any* incoming GET request to `/api/transactions` or `/api/balances` containing an arbitrary set of query parameters, the upstream request URL constructed by the handler SHALL contain those exact query parameters unchanged (same keys, same values, same encoding).

**Validates: Requirements 1.2, 3.2**

### Property 2: Response passthrough preserves body and status code

*For any* successful upstream response with any HTTP status code and any response body text, the portal handler SHALL return a response with the identical status code and identical body content to the client.

**Validates: Requirements 1.3, 2.2, 3.3**

### Property 3: Path parameter extraction constructs correct upstream URL

*For any* transaction ID string provided in the route path `/api/transactions/{id}`, the handler SHALL construct an upstream URL of the form `{ACCOUNTING_BASE_URL}/api/v1/transaction/{id}` where `{id}` is the exact path parameter value from the incoming request.

**Validates: Requirements 2.1**

### Property 4: Network errors produce consistent error responses

*For any* network failure or timeout when calling the Accounting_Service, all three passthrough handlers SHALL return HTTP status 500 with a JSON body containing an `error` field with a string message.

**Validates: Requirements 1.7, 2.6, 3.7**
