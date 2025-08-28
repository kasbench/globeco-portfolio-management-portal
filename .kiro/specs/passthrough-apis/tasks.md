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

- [ ] 5. Create allocations API route handler
  - Create new file `src/app/api/allocations/executions/send/route.ts`
  - Implement POST handler using `withTelemetry` wrapper
  - Call `allocationService.sendExecutions()` and return response
  - Handle errors by passing through original status codes and response objects
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3_

- [ ] 6. Add TypeScript interfaces for response types
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

- [ ] 10. Update environment configuration documentation
  - Document new `ALLOCATION_SERVICE_HOST` and `ALLOCATION_SERVICE_PORT` variables
  - Add configuration examples to existing environment setup
  - Ensure proper defaults are documented for development
  - Update any relevant configuration files or examples
  - _Requirements: 3.2, 3.4_