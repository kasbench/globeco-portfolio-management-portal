# Requirement 5: Trade Management Page

## Overview
The purpose of this requirement is to implement a comprehensive Trade Management Page that allows users to view, filter, sort, and manage trade orders through the GlobeCo Trade Service API. This page will provide similar functionality to the Order Management page but focused on trade order lifecycle management.

## Page Location and Navigation
- The trade management page is accessed from the **Trading** menu item on the main navigation bar
- **Trading** menu has a submenu with two options:
  - **Trade Management** (this page) - Route: `/trading/trade-management`
  - **Execution Management** (to be added in the next requirement) - Route: `/trading/execution-management`
- Currently shows a placeholder "Coming Soon" page that needs to be replaced

## Data Source and API Integration
- All data comes from the **Trade Service** (see Integrations section below)
- Base URL: `http://globeco-trade-service:8082/api/v2`
- Uses the comprehensive Trade Service API v2.0.0 with enhanced filtering and batch processing capabilities

## Core Functionality Requirements

### 1. Trade Order List Display
- **Layout**: Responsive data table with infinite scrolling or pagination (consistent with Order Management)
- **Default View**: Show trade orders with `submitted=false` by default
- **Data Fields**: Display the following columns:
  - `id` - Trade Order ID
  - `orderId` - Business Order ID (read-only, not editable)
  - `securityTicker` - Security ticker symbol (from enhanced API)
  - `portfolioName` - Portfolio name (from enhanced API)
  - `blotterAbbreviation` - Blotter abbreviation
  - `orderType` - Order type (BUY/SELL/SHORT)
  - `quantity` - Total order quantity
  - `quantitySent` - Quantity already sent for execution
  - `limitPrice` - Limit price (if applicable)
  - `tradeTimestamp` - Trade order timestamp
  - `submitted` - Submission status
  - Actions column (for non-submitted orders only)

### 2. Filtering and Search
- **Filter Implementation**: Use modern filter pills UI (consistent with Order Management)
- **Available Filters** (based on API v2 specification):
  - `securityTicker` - Security ticker (supports multiple comma-separated values)
  - `portfolioName` - Portfolio name (supports multiple comma-separated values)
  - `blotterAbbreviation` - Blotter abbreviation (supports multiple comma-separated values)
  - `orderType` - Order type (supports multiple comma-separated values)
  - `submitted` - Submission status (boolean)
  - `tradeTimestamp` - Trade timestamp range
- **Filter Logic**: 
  - Multiple values within the same filter use OR logic
  - Different filters use AND logic
  - Default filter: `submitted=false`

### 3. Sorting Capabilities
- **Sortable Columns** (based on API v2 specification):
  - `id` - Trade Order ID
  - `orderId` - Business Order ID
  - `securityTicker` - Security ticker
  - `portfolioName` - Portfolio name
  - `blotterAbbreviation` - Blotter abbreviation
  - `orderType` - Order type
  - `quantity` - Order quantity
  - `quantitySent` - Quantity sent
  - `tradeTimestamp` - Trade timestamp
- **Implementation**: Clickable column headers with sort direction indicators
- **Default Sort**: `id` ascending
- **Multi-column Sort**: Support comma-separated sort fields with `-` prefix for descending

### 4. Trade Order Actions (Non-Submitted Orders Only)
Each trade order with `submitted=false` must have the following actions available:

#### Individual Actions:
- **Delete Trade Order**: 
  - Endpoint: `DELETE /api/v2/tradeOrders/{id}?version={version}`
  - Requires version number for optimistic locking
  - Show confirmation dialog before deletion
- **View/Modify Trade Order**: 
  - Endpoint: `GET /api/v2/tradeOrders/{id}` (for viewing)
  - Endpoint: `PUT /api/v2/tradeOrders/{id}` (for updating)
  - Open modal or navigate to edit form
  - **Note**: `orderId` field is read-only and cannot be modified
- **Submit Trade Order**: 
  - Endpoint: `POST /api/v2/tradeOrders/{id}/submit`
  - Submits individual trade order for execution
  - Updates `submitted` status to `true` on success

#### Batch Actions:
- **Selection Checkboxes**: Add checkboxes to the left of each non-submitted trade order
- **Batch Submit**: 
  - Enabled only when one or more non-submitted orders are selected
  - Endpoint: `POST /api/v2/tradeOrders/batch/submit`
  - Request body: `{"tradeOrderIds": [1, 2, 3, ...]}`
  - Handle partial success responses appropriately
- **Batch Move to Blotter**: 
  - Enabled only when one or more orders are selected
  - Endpoint: `PUT /api/v2/tradeOrders/batch/move`
  - Allow selection by `blotterAbbreviation` (not `blotterId`)
  - Request body: `{"tradeOrderIds": [1, 2, 3, ...], "blotterAbbreviation": "EQ"}`

### 5. Data Refresh and State Management
- **Auto-refresh**: Refresh data after successful trade order operations (individual or batch)
- **Status Updates**: Orders change `submitted` status after successful submission
- **Version Management**: Handle version conflicts (HTTP 409) gracefully
- **Loading States**: Show appropriate loading indicators during API calls

### 6. Error Handling and User Feedback
- **API Error Handling**: 
  - Display user-friendly error messages for all API failures
  - Handle specific HTTP status codes (400, 404, 409, 413, 500)
  - Show detailed error information for batch operations
- **Validation Errors**: Display field-level validation errors
- **Success Notifications**: Confirm successful operations with toast notifications
- **Partial Success**: For batch operations, show summary of successful vs failed operations

### 7. User Experience Requirements
- **Responsive Design**: Work on desktop, tablet, and mobile devices
- **Performance**: Efficient pagination/infinite scroll for large datasets
- **Accessibility**: WCAG 2.1 AA compliance
- **Professional Appearance**: Modern, clean interface matching GlobeCo branding
- **Loading States**: Skeleton loaders and progress indicators
- **Empty States**: Appropriate messaging when no trade orders match filters
- **Consistency**: UI/UX patterns consistent with Order Management page

## Role-Based Access Control
- **Admin**: Full access to all functionality
- **Internal**: Full access to all functionality  
- **Partner**: Access to partner-enabled features only
- **Customer**: No access to Trade Management (management-level functionality)

## Technical Implementation Notes

### API Pagination
- Use `limit` and `offset` parameters for pagination
- Default page size: 50 trade orders
- Maximum page size: 1000 trade orders
- Response includes pagination metadata

### Batch Processing Limits
- Trade order submission: Follow API-defined limits
- Trade order movement: Follow API-defined limits
- Handle non-atomic processing (individual failures don't affect others)

### Data Structures
- Trade orders include enhanced data from external services (Security, Portfolio)
- Version numbers required for updates and deletions
- External service integration provides enriched display data

## Business Rules
- `orderId` field is read-only and cannot be modified through the UI
- Only non-submitted trade orders (`submitted=false`) can be modified or deleted
- Batch operations are only available for non-submitted orders
- Blotter selection in batch move operations uses `blotterAbbreviation`, not `blotterId`

## Integrations

| Service | Host | Port | OpenAPI Spec |
| --- | --- | --- | --- |
| Trade Service | globeco-trade-service | 8082 | [globeco-trade-service-openapi.yaml](globeco-trade-service-openapi.yaml) and [trade-service-claude-api-guide.md](trade-service-claude-api-guide.md) |

---

## Execution Plan

### Phase 1: Foundation and Setup
- [x] **1.1** Create TypeScript interfaces for Trade Service DTOs
  - [x] TradeOrderResponseDTO
  - [x] TradeOrderEnhancedResponseDTO (v2 API)
  - [x] TradeOrderPageResponseDTO
  - [x] BatchSubmitRequestDTO
  - [x] BatchMoveRequestDTO
  - [x] Execution DTOs
- [x] **1.2** Set up Trade Service API client
  - [x] Create tradeService.ts with all required v2 endpoints
  - [x] Implement proper error handling and response typing
  - [x] Add request/response interceptors for logging
- [x] **1.3** Create or adapt reusable UI components
  - [x] Reuse FilterPills component from Order Management
  - [x] Reuse SortableTable component with column sorting
  - [x] Reuse BatchActionBar component for selected items
  - [x] Create TradeOrderActionMenu component for individual actions

### Phase 2: Core Trade Order List Implementation ✅
- [x] **2.1** Update Trading menu navigation
  - [x] Modify navigation to include Trading submenu
  - [x] Add routes for Trade Management and Execution Management
  - [x] Update route structure: `/trading/trade-management`
- [x] **2.2** Replace placeholder trade management page
  - [x] Remove "Coming Soon" content from trading page
  - [x] Implement main TradeManagementPage component
- [x] **2.3** Implement trade order data fetching
  - [x] Create useTradeOrders hook with pagination, filtering, and sorting
  - [x] Implement infinite scroll or pagination controls
  - [x] Add loading states and error handling
- [x] **2.4** Build trade order list table
  - [x] Create responsive table layout with all required columns
  - [x] Implement row selection checkboxes for non-submitted orders
  - [x] Add action buttons/menu for each non-submitted order
  - [x] Handle empty states and loading skeletons

### Phase 3: Filtering and Sorting
- [ ] **3.1** Implement advanced filtering
  - [ ] Create filter state management (URL params + local state)
  - [ ] Build FilterPills UI with add/remove functionality
  - [ ] Implement multi-value filters with OR logic
  - [ ] Set default filter: `submitted=false`
- [ ] **3.2** Implement column sorting
  - [ ] Add clickable column headers with sort indicators
  - [ ] Support multi-column sorting with priority
  - [ ] Persist sort state in URL parameters
  - [ ] Handle API v2 sort parameter formatting

### Phase 4: Individual Trade Order Actions
- [ ] **4.1** Implement View/Modify Trade Order functionality
  - [ ] Create TradeOrderDetailsModal or TradeOrderEditForm component
  - [ ] Fetch individual trade order details via GET /api/v2/tradeOrders/{id}
  - [ ] Implement trade order editing with PUT /api/v2/tradeOrders/{id}
  - [ ] Ensure `orderId` field is read-only in edit form
  - [ ] Handle version conflicts and validation errors
- [ ] **4.2** Implement Delete Trade Order functionality
  - [ ] Add confirmation dialog for trade order deletion
  - [ ] Implement DELETE /api/v2/tradeOrders/{id}?version={version}
  - [ ] Handle optimistic locking and error cases
  - [ ] Refresh list after successful deletion
- [ ] **4.3** Implement Submit Individual Trade Order
  - [ ] Add submit button/action for non-submitted orders
  - [ ] Implement POST /api/v2/tradeOrders/{id}/submit
  - [ ] Update UI state after successful submission
  - [ ] Show success/error notifications

### Phase 5: Batch Operations
- [ ] **5.1** Implement Batch Submit functionality
  - [ ] Add batch selection state management
  - [ ] Create batch submit button in action bar
  - [ ] Implement POST /api/v2/tradeOrders/batch/submit
  - [ ] Handle partial success responses (some orders succeed, others fail)
  - [ ] Show detailed results summary
- [ ] **5.2** Implement Batch Move to Blotter functionality
  - [ ] Add blotter selection dropdown in batch action bar
  - [ ] Populate dropdown with available blotter abbreviations
  - [ ] Implement PUT /api/v2/tradeOrders/batch/move
  - [ ] Use `blotterAbbreviation` instead of `blotterId` for selection
  - [ ] Handle batch operation results and errors

### Phase 6: Testing and Polish
- [ ] **6.1** Unit Testing
  - [ ] Write tests for TradeManagementPage component
  - [ ] Write tests for tradeService API client
  - [ ] Write tests for useTradeOrders hook
  - [ ] Write tests for trade order action components
- [ ] **6.2** Integration Testing
  - [ ] Test API integration with mock Trade Service
  - [ ] Test error handling scenarios
  - [ ] Test batch operations with various scenarios
- [ ] **6.3** User Experience Polish
  - [ ] Implement loading states and skeletons
  - [ ] Add proper error boundaries
  - [ ] Optimize performance for large datasets
  - [ ] Ensure responsive design works on all screen sizes
- [ ] **6.4** Accessibility and Documentation
  - [ ] Verify WCAG 2.1 AA compliance
  - [ ] Add proper ARIA labels and keyboard navigation
  - [ ] Update component documentation
  - [ ] Add inline code comments for complex logic

### Phase 7: Deployment and Validation
- [ ] **7.1** Code Review and Quality Assurance
  - [ ] Conduct thorough code review
  - [ ] Run all tests and ensure they pass
  - [ ] Validate against TypeScript strict mode
  - [ ] Check for console errors and warnings
- [ ] **7.2** User Acceptance Testing
  - [ ] Test all functionality with realistic data
  - [ ] Validate consistency with Order Management page
  - [ ] Verify role-based access control
  - [ ] Test edge cases and error scenarios
- [ ] **7.3** Performance and Security Review
  - [ ] Validate API call efficiency
  - [ ] Check for potential security vulnerabilities
  - [ ] Ensure proper error handling doesn't expose sensitive data
  - [ ] Validate data validation on both client and server side
