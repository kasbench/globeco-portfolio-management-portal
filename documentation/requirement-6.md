# Requirement 6: Enhanced Trade Order Submission

## Overview

This requirement addresses a critical flaw in the current trade order submission logic on the Trade Management page. The current implementation sends only trade order IDs to the batch submission API, but the API actually requires quantity and destination information for each submission.

## Problem Statement

### Current (Incorrect) Implementation
The system currently sends this payload to the batch submit API:
```json
{
  "tradeOrderIds": [155, 156, 157]
}
```

### Required (Correct) Implementation
The API expects this payload structure:
```json
{
  "submissions": [
    {
      "tradeOrderId": 155,
      "quantity": 100,
      "destinationId": 1
    },
    {
      "tradeOrderId": 156,
      "quantity": 50,
      "destinationId": 2
    }
  ]
}
```

## Functional Requirements

### 1. Quantity Validation
For each trade order being submitted:
- **Quantity to Submit**: Must be collected from the user for each trade order
- **Validation Rules**:
  - Must be greater than 0
  - Must be less than or equal to the remaining quantity
  - **Remaining Quantity Formula**: `quantity - quantitySent`
  - Must be a positive number (no decimals for whole shares)

### 2. Destination Selection
For each trade order being submitted:
- **Data Source**: `GET /api/v1/destinations`
- **Display**: Show destination abbreviation to users
- **API Requirement**: Send destination ID to the batch submit API
- **Destination Object Structure**:
  ```json
  {
    "id": 1,
    "abbreviation": "NYSE",
    "description": "New York Stock Exchange",
    "version": 1
  }
  ```

### 3. User Experience Requirements
- **Individual Configuration**: Users must be able to specify quantity and destination for each selected trade order
- **Bulk Actions**: Provide an easy way to submit all remaining quantity for all selected orders
- **Default Values**: 
  - Default quantity should be the remaining quantity (`quantity - quantitySent`)
  - Default destination should be the first available destination or user's preferred destination
- **Validation Feedback**: Clear error messages for invalid quantities
- **Progress Indication**: Show submission progress for batch operations

## API Specifications

### Destinations API
- **Endpoint**: `GET /api/v1/destinations`
- **Response**: Array of destination objects
- **Usage**: Load destinations for dropdown selection

### Batch Submit API
- **Endpoint**: `POST /api/v1/tradeOrders/batch/submit`
- **Request Body**: 
  ```json
  {
    "submissions": [
      {
        "tradeOrderId": 156,
        "quantity": 100,
        "destinationId": 1
      }
    ]
  }
  ```
- **Response**: Standard batch operation response with success/failure details

## User Interface Requirements

### Submission Modal/Dialog
When user clicks "Submit Selected" or individual "Submit" action:

1. **Trade Order Summary Table**:
   - Order ID
   - Security (ticker)
   - Order Type (BUY/SELL/SHORT)
   - Total Quantity
   - Quantity Sent
   - **Remaining Quantity** (calculated: quantity - quantitySent)
   - **Quantity to Submit** (editable input, default: remaining quantity)
   - **Destination** (dropdown selection)

2. **Bulk Actions Section**:
   - "Submit All Remaining" button
   - "Set All Destinations" dropdown
   - Validation summary

3. **Action Buttons**:
   - "Submit" (primary action)
   - "Cancel" (secondary action)

### Validation Display
- Real-time validation of quantity inputs
- Error highlighting for invalid entries
- Summary of validation errors at the top of the modal

## Technical Implementation Details

### Data Management
1. **State Management**:
   - Track submission quantities for each selected order
   - Track destination selections for each selected order
   - Maintain validation state for all inputs

2. **API Integration**:
   - Fetch destinations on component mount
   - Cache destinations data
   - Transform submission data to match API requirements

3. **Validation Logic**:
   - Client-side validation for immediate feedback
   - Server-side validation handling for API responses

### Error Handling
- Handle API errors gracefully
- Provide retry mechanisms for failed submissions
- Show detailed error messages for individual order failures

## Execution Plan

### Phase 1: Backend API Integration ✅ COMPLETED
- [x] **1.1** Create destinations service integration
  - [x] Add `DestinationResponseDTO` type definitions
  - [x] Implement `getDestinations()` method in tradeService
  - [x] Add error handling for destinations API
  - [x] Add unit tests for destinations service

- [x] **1.2** Update batch submit service
  - [x] Modify `BatchSubmitRequestDTO` to use new submission format
  - [x] Update `submitTradeOrders()` method signature
  - [x] Transform request data to match API requirements
  - [x] Add validation for submission data
  - [x] Update unit tests for batch submit

### Phase 2: Data Layer Updates
- [ ] **2.1** Update TypeScript types
  - [ ] Add `TradeOrderSubmission` interface
  - [ ] Add `DestinationResponseDTO` interface
  - [ ] Update `BatchSubmitRequestDTO` interface
  - [ ] Add validation helper types

- [ ] **2.2** Create utility functions
  - [ ] `calculateRemainingQuantity(order)` helper
  - [ ] `validateSubmissionQuantity(quantity, remaining)` helper
  - [ ] `formatDestinationOptions()` for UI consumption

### Phase 3: UI Components Development
- [ ] **3.1** Create TradeSubmissionModal component
  - [ ] Modal layout and structure
  - [ ] Trade order summary table
  - [ ] Editable quantity inputs with validation
  - [ ] Destination dropdown selection
  - [ ] Bulk action controls

- [ ] **3.2** Implement validation logic
  - [ ] Real-time quantity validation
  - [ ] Error message display
  - [ ] Form submission validation
  - [ ] Validation state management

- [ ] **3.3** Add bulk operation features
  - [ ] "Submit All Remaining" functionality
  - [ ] "Set All Destinations" bulk selection
  - [ ] Validation summary display

### Phase 4: Integration and Testing
- [ ] **4.1** Update Trade Management page
  - [ ] Replace current submit logic with new modal
  - [ ] Update submit button handlers
  - [ ] Add loading states and error handling
  - [ ] Update success/failure feedback

- [ ] **4.2** End-to-end testing
  - [ ] Test single order submission
  - [ ] Test multiple order submission
  - [ ] Test validation error scenarios
  - [ ] Test API error handling
  - [ ] Test bulk operations

- [ ] **4.3** User experience testing
  - [ ] Test modal usability
  - [ ] Test validation feedback clarity
  - [ ] Test bulk operation efficiency
  - [ ] Test error message comprehension

### Phase 5: Documentation and Cleanup
- [ ] **5.1** Update documentation
  - [ ] Update API usage guide
  - [ ] Update component documentation
  - [ ] Add user guide for new submission flow

- [ ] **5.2** Code cleanup
  - [ ] Remove old submission logic
  - [ ] Update comments and JSDoc
  - [ ] Optimize performance
  - [ ] Final code review

## Acceptance Criteria

### Functional Criteria
- [ ] Users can submit individual trade orders with custom quantity and destination
- [ ] Users can submit multiple trade orders in batch with different quantities/destinations
- [ ] System validates quantity is within acceptable range (0 < quantity ≤ remaining)
- [ ] System prevents submission of invalid data
- [ ] API receives correctly formatted submission data

### User Experience Criteria
- [ ] Submission process is intuitive and efficient
- [ ] Validation errors are clear and actionable
- [ ] Bulk operations work smoothly for multiple orders
- [ ] Loading states provide appropriate feedback
- [ ] Error handling doesn't disrupt workflow

### Technical Criteria
- [ ] Code follows existing patterns and conventions
- [ ] TypeScript types are comprehensive and accurate
- [ ] Error handling is robust and user-friendly
- [ ] Performance is acceptable for batch operations
- [ ] Unit tests provide adequate coverage

## Dependencies

- **Trade Service API**: `/api/v1/destinations` and `/api/v1/tradeOrders/batch/submit`
- **UI Components**: Modal, Table, Form components from existing UI library
- **State Management**: React hooks or existing state management solution
- **Validation Library**: Form validation utilities

## Notes

- This requirement fixes a fundamental mismatch between UI and API expectations
- The new submission flow will be more complex but provides necessary control
- Consider caching destinations data to improve performance
- Ensure backward compatibility during implementation phase
- Plan for gradual rollout to minimize user disruption
