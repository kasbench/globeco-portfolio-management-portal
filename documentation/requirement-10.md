# Requirement 10 — Add GET /api/rebalances/{rebalanceId} (Proxy)

## Goal
Add a server-only API endpoint to fetch a single rebalance by ID. The UI will be added later. This work creates a transparent proxy in this application that forwards the request to the GlobeCo Order Generation Service and returns its response unchanged.

## Summary
- **Endpoint**: `GET /api/rebalances/{rebalanceId}`
- **Behavior**: Transparent proxy/pass-through to the Order Generation Service `GET /api/v1/rebalance/{rebalance_id}`
- **Upstream host**: `globeco-order-generation-service:8088` (no `localhost`)
- **Response**: Body and status code returned exactly as received from upstream

See the upstream OpenAPI: [globeco-order-generation-service.yaml](globeco-order-generation-service.yaml)

## Upstream Mapping
- **Incoming**: `GET /api/rebalances/{rebalanceId}`
- **Forward to**: `http://globeco-order-generation-service:8088/api/v1/rebalance/{rebalanceId}`
- **Headers**:
  - Forward `Accept: application/json`
  - Forward correlation/trace headers as already handled by our telemetry wrappers
- **Timeouts/retries**: Follow conventions used by other API routes in this service (no special overrides here)

## Path Parameter
- **rebalanceId**: string (as defined by upstream; typically a 24-character ID)

### Sample Upstream Request
```
GET http://globeco-order-generation-service:8088/api/v1/rebalance/68989d590736e528af66d6a3
```

### Sample Response (truncated)
```json
{
  "rebalance_id": "68989d590736e528af66d6a3",
  "model_id": "68989d480c54ce6407ea514b",
  "rebalance_date": "2025-08-10T13:23:37.879000",
  "model_name": "Model 290ac416-0f19-4ea1-885e-a4229759a61b",
  "number_of_portfolios": 10,
  "portfolios": [
    { "portfolio_id": "68989d07a711681c7aed8cb7", "positions": [/* ... */] }
  ],
  "version": 1,
  "created_at": "2025-08-10T13:23:37.879000"
}
```

## HTTP Status Codes
Return the upstream status code without alteration. Per upstream spec:
- `200` — Successful response with `RebalanceResultDTO`
- `422` — Validation error (propagate upstream body)
- Other statuses produced by upstream (e.g., `404`) must be propagated unchanged

## Error Handling & Resiliency
- Do not transform upstream error bodies; return as-is
- Use existing patterns in this service for:
  - Request timeout configuration
  - Limited retries for transient network errors (only where already standardized)
  - Structured logging, correlation IDs, and telemetry spans around the handler

## Observability
- Wrap the handler with the existing `withTelemetry` utility to record:
  - Operation name (e.g., `get_rebalance_by_id`)
  - Request start/end, status code, duration, and response size (when available)
  - Errors with stack traces and correlation IDs
- Outbound HTTP calls should use our axios telemetry wrapper (trace context propagation)

## Implementation Notes
- **Location**: `src/app/api/rebalances/[rebalanceId]/route.ts`
- **Handler**: Add `GET` to call `orderGenerationServiceApi.getRebalanceById(rebalanceId)` and return upstream body/status unchanged
- **Server-only**: Do not import server modules into client code
- **Networking**: Do not call `localhost`; use `globeco-order-generation-service:8088` (env overrides may already exist)

## Acceptance Criteria
- [ ] `GET /api/rebalances/{rebalanceId}` forwards to `http://globeco-order-generation-service:8088/api/v1/rebalance/{rebalanceId}`
- [ ] Returns the exact upstream response body and HTTP status code
- [ ] Uses existing telemetry/logging wrappers for request/response and errors
- [ ] Implements timeouts/retries consistent with other API routes in this service
- [ ] Unit/integration tests use mocks for the upstream service and verify pass-through semantics and headers
