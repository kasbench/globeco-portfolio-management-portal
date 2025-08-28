# Requirements Document

## Introduction

This feature implements two new passthrough APIs for the portfolio management portal. These APIs will execute on the portal server and act as simple proxies to downstream services without modifying the portal client behavior. The APIs provide direct access to security data and allocation execution functionality through the portal's API layer.

## Requirements

### Requirement 1

**User Story:** As a client application, I want to retrieve securities data through the portal API, so that I can access security information without directly connecting to the security service.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/securities THEN the portal SHALL forward the request to GET /api/v1/securities on globeco-security-service port 8000
2. WHEN the security service responds successfully THEN the portal SHALL return the exact response with the same status code and response object
3. WHEN the security service call fails THEN the portal SHALL return a 500-level error to the client
4. WHEN the security service is unavailable THEN the portal SHALL NOT retry the call and return an error immediately

### Requirement 2

**User Story:** As a client application, I want to trigger allocation execution processing through the portal API, so that I can initiate batch processing without directly connecting to the allocation service.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/allocations/executions/send THEN the portal SHALL forward the request to POST /api/v1/executions/send on globeco-allocation-service port 8089
2. WHEN making the downstream request THEN the portal SHALL send an empty JSON payload "{}"
3. WHEN the allocation service responds successfully THEN the portal SHALL return the exact response with the same status code and response object
4. WHEN the allocation service call fails THEN the portal SHALL return a 500-level error to the client
5. WHEN the allocation service is unavailable THEN the portal SHALL NOT retry the call and return an error immediately

### Requirement 3

**User Story:** As a developer, I want the passthrough APIs to extend existing service implementations, so that the code follows established patterns and is maintainable.

#### Acceptance Criteria

1. WHEN implementing the securities API THEN the portal SHALL extend the existing securityService.ts implementation
2. WHEN implementing the allocations API THEN the portal SHALL create appropriate service layer abstractions following existing patterns
3. WHEN either API is called THEN the portal SHALL use consistent error handling patterns with other portal APIs
4. WHEN logging is implemented THEN the portal SHALL follow existing logging patterns for API calls

### Requirement 4

**User Story:** As a system administrator, I want the passthrough APIs to have minimal error handling complexity, so that they are simple to maintain and troubleshoot.

#### Acceptance Criteria

1. WHEN either passthrough API encounters an error THEN the portal SHALL NOT implement custom retry logic
2. WHEN downstream services return error responses THEN the portal SHALL pass through the response object without modification
3. WHEN network errors occur THEN the portal SHALL return appropriate 500-level HTTP status codes
4. WHEN implementing error handling THEN the portal SHALL NOT add additional error processing beyond basic passthrough functionality