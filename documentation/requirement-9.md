# Requirement 9 — Add POST /api/transactions (Proxy)

## Goal
Add a server-only API endpoint to post transactions. The UI will be added later. This work creates a proxy endpoint in this application that forwards requests to the GlobeCo Portfolio Accounting Service and returns its response unchanged.

## Summary
- Endpoint: `POST /api/transactions`
- Behavior: Transparent proxy/pass-through to the Portfolio Accounting Service `POST /api/v1/transactions`
- Upstream host: `globeco-portfolio-accounting-service:8087` (no `localhost`)
- Payload: Forwarded as-is (JSON)
- Response: Body and status code returned exactly as received from upstream

See the upstream OpenAPI: [globeco-portfolio-accounting-service-openapi.yaml](globeco-portfolio-accounting-service-openapi.yaml)

## Upstream Mapping
- Incoming: `POST /api/transactions`
- Forward to: `http://globeco-portfolio-accounting-service:8087/api/v1/transactions`
- Headers:
  - Forward `Content-Type: application/json` and `Accept: application/json`
  - If present on the request, forward `X-API-Key` to upstream (the upstream spec defines `ApiKeyAuth` header). If absent, do not add one.
- Timeouts and retries should match conventions used by other API routes in this service.

## Request Schema (passthrough)
Send an array of `TransactionPostDTO` objects as defined by the upstream service. Key fields (see OpenAPI for full details):
- `portfolioId` (string, required)
- `price` (number, required)
- `quantity` (number, required)
- `securityId` (string, optional)
- `sourceId` (string, required, max 50 chars)
- `transactionDate` (string, required, format: YYYYMMDD)
- `transactionType` (string, required, enum: BUY, SELL, SHORT, COVER, DEP, WD, IN, OUT)

Sample request:
```json
[
  {
    "portfolioId": "6875996f6ba8d303aac5f22b",
    "price": 1,
    "quantity": 2949185,
    "sourceId": "6f69880c-cb8a-42d9-9fca-6644865bb0ae",
    "transactionDate": "20250808",
    "transactionType": "DEP"
  }
]
```

## Response Schema (passthrough)
Return exactly what upstream returns. Per upstream spec, a `TransactionBatchResponse`:
- `successful`: array of `TransactionResponseDTO`
- `failed`: array of `TransactionErrorDTO` (or null)
- `summary`: `BatchSummaryDTO`

Sample success (200/207):
```json
{
  "successful": [
    {
      "id": 16567,
      "portfolioId": "6875996f6ba8d303aac5f22b",
      "sourceId": "6f69880c-cb8a-42d9-9fca-6644865bb0ae",
      "status": "PROC",
      "transactionType": "DEP",
      "quantity": 2949185,
      "price": 1,
      "transactionDate": "20250808",
      "reprocessingAttempts": 0,
      "version": 2
    }
  ],
  "failed": null,
  "summary": {
    "totalRequested": 1,
    "successful": 1,
    "failed": 0,
    "successRate": 100
  }
}
```

## HTTP Status Codes
Return the upstream status code without alteration. The upstream spec indicates:
- 200 — Batch processing completed (may include partial failures)
- 207 — Multi-status: some succeeded, others failed
- 400 — Invalid request body or validation errors
- 413 — Request too large (batch size exceeded)
- 500 — Internal server error

## Error Handling & Resiliency
- Do not transform upstream error bodies; return as-is (including `error` shapes defined by upstream).
- Follow existing patterns in this service for:
  - Request timeout configuration
  - Limited retries for transient network errors (no duplicate submissions if upstream processed the request)
  - Structured logging, correlation IDs, and telemetry spans around the handler

## Observability
- Use the existing API route logging/telemetry wrappers to record:
  - Operation name (e.g., "post_transactions")
  - Request start/end, status code, and response size (when available)
  - Errors with stack traces and correlation IDs

## Implementation Notes
- Location: `src/app/api/transactions/route.ts`
- Server-only handler. Do not import server modules into client code.
- Forward the raw JSON body without modification. Do not perform domain validation here.
- Do not call `localhost`. Use `globeco-portfolio-accounting-service:8087` or env overrides if already standardized in this codebase.

## Acceptance Criteria
- [ ] `POST /api/transactions` forwards the request body to `http://globeco-portfolio-accounting-service:8087/api/v1/transactions` and returns the exact upstream response body and status code.
- [ ] `X-API-Key` header (if provided) is forwarded to upstream.
- [ ] Content type and accept headers are `application/json`.
- [ ] 200 and 207 responses include the upstream `successful`, `failed`, and `summary` objects unchanged.
- [ ] 400, 413, and 500 errors are returned with the same body and status as upstream.
- [ ] Structured logs and telemetry spans are emitted around the handler consistent with other API routes.
- [ ] Unit/integration tests use mocks for the upstream service and verify pass-through semantics and headers.
