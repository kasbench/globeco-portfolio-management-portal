# Implementation Plan

- [x] 1. Extend SecurityService with getAllSecurities method
  - Add `getAllSecurities()` method to existing `SecurityService` class
  - Configure method to call `GET /api/v1/securities` endpoint on port 8000
  - Implement proper TypeScript return type for securities array
  - Add telemetry wrapping using existing `withHttpTelemetry` pattern
  - _Requirements: 1.1, 1.2, 3.1, 3.3_

- [x] 2. Create securities API route handler
  - Create new file `src/app/api/securities/route.ts`
  - Implement GET handler using `withTelemetry` wrapper following existing patterns
  - Call `securityService.getAllSecurities()` and return response
  - Handle errors by passing through original status codes and response objects
  - _Requirements: 1.1, 1.2, 1.3, 3.3_

- [x] 3. Create AllocationService class
  - Create new file `src/lib/api/allocationService.ts` following SecurityService patterns
  - Set up HTTP client with base URL using environment variables for host/port
  - Configure axios instance with telemetry wrapping using `wrapAxiosWithTelemetry`
  - Implement request/response interceptors for logging following existing patterns
  - _Requirements: 2.1, 3.2, 3.3_

- [x] 4. Implement sendExecutions method in AllocationService
  - Add `sendExecutions()` method that POSTs to `/api/v1/executions/send`
  - Configure method to send empty JSON payload "{}"
  - Wrap method with `withHttpTelemetry` for telemetry tracking
  - Implement proper TypeScript return type for allocation response
  - _Requirements: 2.1, 2.2, 2.3, 3.3_

- [x] 5. Create allocations API route handler
  - Create new file `src/app/api/allocations/executions/send/route.ts`
  - Implement POST handler using `withTelemetry` wrapper
  - Call `allocationService.sendExecutions()` and return response
  - Handle errors by passing through original status codes and response objects
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3_

- [x] 6. Add TypeScript interfaces for response types
  - Add `SecurityOut[]` array type for securities response
  - Add `AllocationExecutionResponse` interface for allocation response
  - Export interfaces from appropriate service files
  - Ensure proper typing throughout the implementation
  - _Requirements: 3.1, 3.2_

- [ ] 7. Write unit tests for SecurityService extension
  - Create test for `getAllSecurities()` method success scenario
  - Test error handling and passthrough behavior
  - Mock HTTP responses and verify proper telemetry integration
  - Test environment variable configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3_

- [ ] 8. Write unit tests for AllocationService
  - Create test for `sendExecutions()` method success scenario
  - Test error handling and passthrough behavior with empty payload
  - Mock HTTP responses and verify telemetry integration
  - Test service initialization and configuration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3_

- [ ] 9. Write API route integration tests
  - Test `/api/securities` GET endpoint with success and error scenarios
  - Test `/api/allocations/executions/send` POST endpoint with success and error scenarios
  - Verify proper HTTP status code passthrough
  - Test telemetry wrapper integration in route handlers
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

- [x] 10. Extend PortfolioService with createBulkPortfolios method
  - Add `createBulkPortfolios()` method to existing `PortfolioService` class
  - Configure method to call `POST /api/v2/portfolios` endpoint on portfolio service
  - Accept array of `PortfolioPostDTO` objects and pass through request body
  - Implement proper TypeScript return type for `PortfolioResponseDTO[]` array
  - Add telemetry wrapping using existing patterns
  - _Requirements: 3.1, 3.2, 3.3, 4.3, 4.5_

- [x] 11. Create bulk portfolios API route handler
  - Create new file `src/app/api/portfolios/bulk/route.ts`
  - Implement POST handler using `withTelemetry` wrapper following existing patterns
  - Call `portfolioService.createBulkPortfolios()` and return response
  - Handle errors by passing through original status codes (400, 500) and response objects
  - Ensure proper handling of validation errors from downstream service
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 4.5_

- [x] 12. Add TypeScript interfaces for bulk portfolio types
  - Add `PortfolioPostDTO` interface for request objects
  - Add `PortfolioResponseDTO` interface for response objects
  - Export interfaces from portfolioService.ts
  - Ensure proper typing throughout the bulk portfolio implementation
  - _Requirements: 4.3, 4.5_

- [ ] 13. Write unit tests for PortfolioService extension
  - Create test for `createBulkPortfolios()` method success scenario
  - Test error handling and passthrough behavior for 400 validation errors
  - Test error handling for 500 server errors
  - Mock HTTP responses and verify proper telemetry integration
  - Test request body passthrough without modification
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3_

- [ ] 14. Write bulk portfolio API route integration tests
  - Test `/api/portfolios/bulk` POST endpoint with success scenario (201)
  - Test validation error scenarios (400) with proper passthrough
  - Test server error scenarios (500) with proper passthrough
  - Verify proper HTTP status code and response body passthrough
  - Test telemetry wrapper integration in route handler
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3_

- [ ] 15. Update environment configuration documentation
  - Document new `ALLOCATION_SERVICE_HOST` and `ALLOCATION_SERVICE_PORT` variables
  - Add configuration examples to existing environment setup
  - Ensure proper defaults are documented for development
  - Update any relevant configuration files or examples
  - _Requirements: 4.2, 4.5_