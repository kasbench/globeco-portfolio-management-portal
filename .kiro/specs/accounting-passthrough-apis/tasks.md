# Implementation Plan: Accounting Passthrough APIs

## Overview

Add three GET passthrough API routes to the portal that proxy requests to the Portfolio Accounting Service. Each route follows the existing `withTelemetry` + `tracedFetch` pattern with a 30-second timeout via AbortController. The implementation adds a GET handler alongside the existing POST in `transactions/route.ts`, creates two new route files, and documents the endpoints in the README.

## Tasks

- [x] 1. Add GET handler to the transactions route
  - [x] 1.1 Add GET export to `src/app/api/transactions/route.ts`
    - Import `withTelemetry` from `@/lib/withTelemetry` (add to existing imports)
    - Export a `GET` handler wrapped with `withTelemetry` using operation name `'get_transactions'`
    - Extract query string from `req.url` and append it to the upstream URL `${ACCOUNTING_BASE_URL}/api/v1/transactions`
    - Use `tracedFetch` with `'get_transactions_upstream'` span name, `AbortController` with 30s timeout
    - Return upstream response text with original status code and content-type header
    - On error, return `{ error: 'Failed to fetch transactions' }` with status 500
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 1.2 Write unit tests for GET /api/transactions handler
    - Test query parameter forwarding (single and multiple params)
    - Test successful upstream response passthrough (body and status code)
    - Test 500 error response on network failure/timeout
    - _Requirements: 1.2, 1.3, 1.7_

- [x] 2. Create the get-transaction-by-ID route
  - [x] 2.1 Create `src/app/api/transactions/[id]/route.ts`
    - Create new file with GET handler wrapped with `withTelemetry` using operation name `'get_transaction_by_id'`
    - Accept `context: { params: Promise<{ id: string }> }` and await `context.params` to extract `id`
    - Construct upstream URL as `${ACCOUNTING_BASE_URL}/api/v1/transaction/${id}` (note: singular "transaction")
    - Use `tracedFetch` with `'get_transaction_by_id_upstream'` span name, `AbortController` with 30s timeout
    - Return upstream response text with original status code and content-type header
    - On error, return `{ error: 'Failed to fetch transaction' }` with status 500
    - Define `ACCOUNTING_SERVICE_HOST`, `ACCOUNTING_SERVICE_PORT`, `ACCOUNTING_BASE_URL` constants matching existing pattern
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Write unit tests for GET /api/transactions/[id] handler
    - Test path parameter extraction and correct upstream URL construction
    - Test successful upstream response passthrough
    - Test 500 error response on network failure/timeout
    - _Requirements: 2.1, 2.2, 2.6_

- [x] 3. Create the balances route
  - [x] 3.1 Create `src/app/api/balances/route.ts`
    - Create new file with GET handler wrapped with `withTelemetry` using operation name `'get_balances'`
    - Extract query string from `req.url` and append it to the upstream URL `${ACCOUNTING_BASE_URL}/api/v1/balances`
    - Use `tracedFetch` with `'get_balances_upstream'` span name, `AbortController` with 30s timeout
    - Return upstream response text with original status code and content-type header
    - On error, return `{ error: 'Failed to fetch balances' }` with status 500
    - Define `ACCOUNTING_SERVICE_HOST`, `ACCOUNTING_SERVICE_PORT`, `ACCOUNTING_BASE_URL` constants matching existing pattern
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 3.2 Write unit tests for GET /api/balances handler
    - Test query parameter forwarding
    - Test successful upstream response passthrough (body and status code)
    - Test 500 error response on network failure/timeout
    - _Requirements: 3.2, 3.3, 3.7_

- [x] 4. Checkpoint - Verify route implementations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update README documentation
  - [x] 5.1 Update `README.md` API Reference section
    - Add GET endpoints to the existing Transactions table: `GET /api/transactions` (list transactions, supports query params for pagination/filtering) and `GET /api/transactions/[id]` (get transaction by ID)
    - Add a new Balances section with a table containing `GET /api/balances` (list balances, supports query params for pagination/filtering)
    - Follow the existing table format (Method | Endpoint | Description)
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All three route handlers use the identical pattern: `withTelemetry` wrapper, `tracedFetch`, `AbortController` with 30s timeout, response text passthrough with original status code
- The existing `src/app/api/transactions/route.ts` already defines `ACCOUNTING_BASE_URL` constants — the GET handler reuses them
- The upstream path for get-by-ID is singular (`/api/v1/transaction/{id}`), not plural

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2", "5.1"] }
  ]
}
```
