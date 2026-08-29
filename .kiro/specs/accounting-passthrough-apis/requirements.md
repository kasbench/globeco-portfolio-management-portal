# Requirements Document

## Introduction

This feature adds passthrough GET API routes to the GlobeCo Portfolio Management Portal that proxy requests to the Portfolio Accounting Service. The portal acts as a transparent gateway, forwarding client requests to the upstream accounting service and returning responses as-is. Three endpoints are introduced: list transactions, get transaction by ID, and list balances.

## Glossary

- **Portal**: The GlobeCo Portfolio Management Portal, a Next.js application serving as the BFF (Backend-for-Frontend) layer.
- **Accounting_Service**: The GlobeCo Portfolio Accounting Service running on the host and port configured by ACCOUNTING_SERVICE_HOST and ACCOUNTING_SERVICE_PORT environment variables.
- **Passthrough_Route**: A Next.js API route handler that proxies a request to the Accounting_Service and returns the upstream response without transformation.
- **withTelemetry**: A higher-order function wrapper that provides structured logging, metrics recording, and error handling around a route handler.
- **tracedFetch**: A fetch wrapper that adds distributed tracing context to outbound HTTP requests.
- **Query_Parameters**: The URL search parameters from the incoming client request that are forwarded to the Accounting_Service unchanged.

## Requirements

### Requirement 1: List Transactions Endpoint

**User Story:** As a portal client, I want to retrieve a paginated and filtered list of transactions via the portal, so that I can view transaction data without directly accessing the accounting service.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/transactions, THE Portal SHALL forward the request to GET /api/v1/transactions on the Accounting_Service.
2. WHEN the incoming request contains Query_Parameters, THE Portal SHALL pass all Query_Parameters to the Accounting_Service request URL unchanged.
3. WHEN the Accounting_Service responds successfully, THE Portal SHALL return the response body and HTTP status code from the Accounting_Service to the client without modification.
4. THE Portal SHALL apply the withTelemetry wrapper to the GET /api/transactions handler with an appropriate operation name.
5. THE Portal SHALL use tracedFetch for the outbound HTTP request to the Accounting_Service.
6. THE Portal SHALL enforce a 30-second timeout on the outbound request to the Accounting_Service using an AbortController.
7. IF the outbound request to the Accounting_Service fails due to a network error or timeout, THEN THE Portal SHALL return a JSON response with status 500 and a body containing an error message.

### Requirement 2: Get Transaction by ID Endpoint

**User Story:** As a portal client, I want to retrieve a single transaction by its ID via the portal, so that I can view detailed transaction information without directly accessing the accounting service.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/transactions/{id}, THE Portal SHALL forward the request to GET /api/v1/transaction/{id} on the Accounting_Service, where {id} is the path parameter from the incoming request.
2. WHEN the Accounting_Service responds successfully, THE Portal SHALL return the response body and HTTP status code from the Accounting_Service to the client without modification.
3. THE Portal SHALL apply the withTelemetry wrapper to the GET /api/transactions/[id] handler with an appropriate operation name.
4. THE Portal SHALL use tracedFetch for the outbound HTTP request to the Accounting_Service.
5. THE Portal SHALL enforce a 30-second timeout on the outbound request to the Accounting_Service using an AbortController.
6. IF the outbound request to the Accounting_Service fails due to a network error or timeout, THEN THE Portal SHALL return a JSON response with status 500 and a body containing an error message.

### Requirement 3: List Balances Endpoint

**User Story:** As a portal client, I want to retrieve a paginated and filtered list of portfolio balances via the portal, so that I can view balance data without directly accessing the accounting service.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/balances, THE Portal SHALL forward the request to GET /api/v1/balances on the Accounting_Service.
2. WHEN the incoming request contains Query_Parameters, THE Portal SHALL pass all Query_Parameters to the Accounting_Service request URL unchanged.
3. WHEN the Accounting_Service responds successfully, THE Portal SHALL return the response body and HTTP status code from the Accounting_Service to the client without modification.
4. THE Portal SHALL apply the withTelemetry wrapper to the GET /api/balances handler with an appropriate operation name.
5. THE Portal SHALL use tracedFetch for the outbound HTTP request to the Accounting_Service.
6. THE Portal SHALL enforce a 30-second timeout on the outbound request to the Accounting_Service using an AbortController.
7. IF the outbound request to the Accounting_Service fails due to a network error or timeout, THEN THE Portal SHALL return a JSON response with status 500 and a body containing an error message.

### Requirement 4: Service Configuration

**User Story:** As a DevOps engineer, I want the accounting service connection to be configurable via environment variables, so that the portal can connect to different environments without code changes.

#### Acceptance Criteria

1. THE Portal SHALL read the Accounting_Service host from the ACCOUNTING_SERVICE_HOST environment variable.
2. WHEN the ACCOUNTING_SERVICE_HOST environment variable is not set, THE Portal SHALL use "globeco-portfolio-accounting-service" as the default host.
3. THE Portal SHALL read the Accounting_Service port from the ACCOUNTING_SERVICE_PORT environment variable.
4. WHEN the ACCOUNTING_SERVICE_PORT environment variable is not set, THE Portal SHALL use "8087" as the default port.

### Requirement 5: Documentation

**User Story:** As a developer, I want the new API endpoints documented in the project README, so that I can understand how to use the passthrough endpoints.

#### Acceptance Criteria

1. WHEN the feature is implemented, THE Portal README.md SHALL include documentation for the GET /api/transactions endpoint with its supported query parameters.
2. WHEN the feature is implemented, THE Portal README.md SHALL include documentation for the GET /api/transactions/[id] endpoint with its path parameter.
3. WHEN the feature is implemented, THE Portal README.md SHALL include documentation for the GET /api/balances endpoint with its supported query parameters.
