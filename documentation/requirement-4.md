# Requirement 4: Order Management Page

## Overview
The purpose of this requirement is to implement a comprehensive Order Management Page that allows users to view, filter, sort, and manage trade orders through the GlobeCo Order Service API.

## Page Location and Navigation
- The order management page is displayed from the **Order Management** menu item on the main navigation bar
- Route: `/order-management`
- Currently shows a placeholder "Coming Soon" page that needs to be replaced

## Data Source and API Integration
- All data comes from the **Order Service** (see Integrations section below)
- Base URL: `http://globeco-order-service:8081/api/v1`
- Uses the comprehensive Order Service API v2.0.0 with batch processing capabilities

## Core Functionality Requirements

### 1. Order List Display
- **Layout**: Responsive data table with infinite scrolling or pagination
- **Default View**: Show orders with `status.abbreviation == "NEW"` by default
- **Data Fields**: Display the following columns:
  - `id` - Order ID
  - `security.ticker` - Security ticker symbol
  - `portfolio.name` - Portfolio name
  - `blotter.name` - Blotter name  
  - `status.abbreviation` - Order status
  - `orderType.abbreviation` - Order type (BUY/SELL)
  - `quantity` - Order quantity
  - `limitPrice` - Limit price (if applicable)
  - `orderTimestamp` - Order timestamp
  - Actions column (for NEW orders only)

### 2. Filtering and Search
- **Filter Implementation**: Use modern filter pills UI (reference: https://dribbble.com/shots/23673501-Filter-UI-UX-Revamp)
- **Available Filters** (based on API specification):
  - `security.ticker` - Security ticker (supports multiple comma-separated values)
  - `portfolio.name` - Portfolio name (supports multiple comma-separated values)
  - `blotter.name` - Blotter name (supports multiple comma-separated values)
  - `status.abbreviation` - Order status (supports multiple comma-separated values)
  - `orderType.abbreviation` - Order type (supports multiple comma-separated values)
  - `orderTimestamp` - Order timestamp (supports multiple comma-separated values)
- **Filter Logic**: 
  - Multiple values within the same filter use OR logic
  - Different filters use AND logic
  - Default filter: `status.abbreviation=NEW`

### 3. Sorting Capabilities
- **Sortable Columns** (based on API specification):
  - `id` - Order ID
  - `security.ticker` - Security ticker
  - `portfolio.name` - Portfolio name
  - `blotter.name` - Blotter name
  - `status.abbreviation` - Order status
  - `orderType.abbreviation` - Order type
  - `quantity` - Order quantity
  - `orderTimestamp` - Order timestamp
- **Implementation**: Clickable column headers with sort direction indicators
- **Default Sort**: `id` ascending
- **Multi-column Sort**: Support comma-separated sort fields with `-` prefix for descending

### 4. Order Actions (NEW Status Only)
Each order with `status.abbreviation == "NEW"` must have the following actions available:

#### Individual Actions:
- **Delete Order**: 
  - Endpoint: `DELETE /api/v1/order/{id}?version={version}`
  - Requires version number for optimistic locking
  - Show confirmation dialog before deletion
- **View/Modify Order**: 
  - Endpoint: `GET /api/v1/order/{id}` (for viewing)
  - Endpoint: `PUT /api/v1/order/{id}` (for updating)
  - Open modal or navigate to edit form
- **Submit Order**: 
  - Endpoint: `POST /api/v1/orders/{id}/submit`
  - Submits individual order to trade service
  - Updates status from "NEW" to "SENT" on success

#### Batch Actions:
- **Selection Checkboxes**: Add checkboxes to the left of each NEW order
- **Submit Selected Button**: 
  - Enabled only when one or more NEW orders are selected
  - Endpoint: `POST /api/v1/orders/batch/submit`
  - Request body: `{"orderIds": [1, 2, 3, ...]}`
  - Maximum batch size: 100 orders
  - Handle partial success responses (HTTP 207)

### 5. Data Refresh and State Management
- **Auto-refresh**: Refresh data after successful order submissions (individual or batch)
- **Status Updates**: Orders change from "NEW" to "SENT" after successful submission
- **Version Management**: Handle version conflicts (HTTP 409) gracefully
- **Loading States**: Show appropriate loading indicators during API calls

### 6. Error Handling and User Feedback
- **API Error Handling**: 
  - Display user-friendly error messages for all API failures
  - Handle specific HTTP status codes (400, 404, 409, 413, 500)
  - Show detailed error information for batch operations
- **Validation Errors**: Display field-level validation errors
- **Success Notifications**: Confirm successful operations with toast notifications
- **Partial Success**: For batch operations, show summary of successful vs failed submissions

### 7. User Experience Requirements
- **Responsive Design**: Work on desktop, tablet, and mobile devices
- **Performance**: Efficient pagination/infinite scroll for large datasets
- **Accessibility**: WCAG 2.1 AA compliance
- **Professional Appearance**: Modern, clean interface matching GlobeCo branding
- **Loading States**: Skeleton loaders and progress indicators
- **Empty States**: Appropriate messaging when no orders match filters

## Role-Based Access Control
- **Admin**: Full access to all functionality
- **Internal**: Full access to all functionality  
- **Partner**: Access to partner-enabled features only
- **Customer**: No access to Order Management (management-level functionality)

## Technical Implementation Notes

### API Pagination
- Use `limit` and `offset` parameters for pagination
- Default page size: 50 orders
- Maximum page size: 1000 orders
- Response includes pagination metadata

### Batch Processing Limits
- Order creation: Maximum 1000 orders per batch
- Order submission: Maximum 100 orders per batch
- Handle non-atomic processing (individual failures don't affect others)

### Data Structures
- Orders include nested objects for blotter, status, security, portfolio, and orderType
- External service integration for security and portfolio data (cached for performance)
- Version numbers required for updates and deletions

## Integrations

| Service | Host | Port | OpenAPI Spec |
| --- | --- | --- | --- |
| Order Service | globeco-order-service | 8081 | [globeco-order-service-openapi.yaml](globeco-order-service-openapi.yaml) and [API Usage Guide](API_USAGE_GUIDE-Order-Service.md) |

---

## Execution Plan

### Phase 1: Foundation and Setup
- [x] **1.1** Create TypeScript interfaces for Order Service DTOs
  - [x] OrderWithDetailsDTO
  - [x] OrderPageResponseDTO  
  - [x] BatchSubmitRequestDTO
  - [x] BatchSubmitResponseDTO
  - [x] StatusDTO, OrderTypeDTO, BlotterDTO
  - [x] SecurityDTO, PortfolioDTO
- [x] **1.2** Set up Order Service API client
  - [x] Create orderService.ts with all required endpoints
  - [x] Implement proper error handling and response typing
  - [x] Add request/response interceptors for logging
- [x] **1.3** Create reusable UI components
  - [x] FilterPills component for advanced filtering
  - [x] SortableTable component with column sorting
  - [x] BatchActionBar component for selected items
  - [x] OrderActionMenu component for individual actions

### Phase 2: Core Order List Implementation  
- [x] **2.1** Replace placeholder order management page
  - [x] Remove "Coming Soon" content from `/src/app/order-management/page.tsx`
  - [x] Implement main OrderManagementPage component
- [x] **2.2** Implement order data fetching
  - [x] Create useOrders hook with pagination, filtering, and sorting
  - [x] Implement infinite scroll or pagination controls
  - [x] Add loading states and error handling
- [x] **2.3** Build order list table
  - [x] Create responsive table layout with all required columns
  - [x] Implement row selection checkboxes for NEW orders
  - [x] Add action buttons/menu for each NEW order
  - [x] Handle empty states and loading skeletons

### Phase 3: Filtering and Sorting
- [x] **3.1** Implement advanced filtering
  - [x] Create filter state management (URL params + local state)
  - [x] Build FilterPills UI with add/remove functionality
  - [x] Implement multi-value filters with OR logic
  - [x] Set default filter: status.abbreviation=NEW
- [x] **3.2** Implement column sorting
  - [x] Add clickable column headers with sort indicators
  - [x] Support multi-column sorting with priority
  - [x] Persist sort state in URL parameters
  - [x] Handle API sort parameter formatting

### Phase 4: Individual Order Actions
- [x] **4.1** Implement View/Modify Order functionality
  - [x] Create OrderDetailsModal or OrderEditForm component
  - [x] Fetch individual order details via GET /api/v1/order/{id}
  - [x] Implement order editing with PUT /api/v1/order/{id}
  - [x] Handle version conflicts and validation errors
- [x] **4.2** Implement Delete Order functionality
  - [x] Add confirmation dialog for order deletion
  - [x] Implement DELETE /api/v1/order/{id}?version={version}
  - [x] Handle optimistic locking and error cases
  - [x] Refresh list after successful deletion
- [x] **4.3** Implement Submit Individual Order
  - [x] Add submit button/action for NEW orders
  - [x] Implement POST /api/v1/orders/{id}/submit
  - [x] Handle success/failure responses
  - [x] Update order status in UI after successful submission

### Phase 5: Batch Operations
- [x] **5.1** Implement batch selection
  - [x] Add "Select All" checkbox functionality
  - [x] Track selected order IDs in component state
  - [x] Show/hide batch action bar based on selection
  - [x] Limit selection to NEW orders only
- [x] **5.2** Implement batch submission
  - [x] Create batch submit confirmation dialog
  - [x] Implement POST /api/v1/orders/batch/submit
  - [x] Handle partial success responses (HTTP 207)
  - [x] Show detailed results for each order in batch
  - [x] Respect 100-order batch limit

### Phase 6: Error Handling and UX Polish
- [x] **6.1** Comprehensive error handling
  - [x] Create error boundary for order management page
  - [x] Implement user-friendly error messages for all API failures
  - [x] Handle network errors and timeouts gracefully
  - [x] Add retry mechanisms for transient failures
- [x] **6.2** User feedback and notifications
  - [x] Implement toast notifications for success/error states
  - [x] Add loading indicators for all async operations
  - [x] Create progress indicators for batch operations
  - [x] Implement optimistic UI updates where appropriate
- [x] **6.3** Performance optimization
  - [x] Implement proper data caching strategies
  - [x] Add debouncing for filter/search inputs
  - [x] Optimize re-renders with React.memo and useMemo
  - [x] Implement virtual scrolling for large datasets (if needed)

### Phase 7: Role-Based Access Control
- [x] **7.1** Implement role-based feature access
  - [x] Integrate with existing role management system
  - [x] Hide Order Management from Customer role navigation
  - [x] Restrict access to management-level features
  - [x] Add role-based action permissions

### Phase 8: Testing and Documentation
- [x] **8.1** Unit testing
  - [x] Test all Order Service API client functions
  - [x] Test React components with React Testing Library
  - [x] Test custom hooks and utility functions
  - [ ] Achieve >80% code coverage
- [x] **8.2** Integration testing
  - [x] Test complete user workflows (filter, sort, submit)
  - [x] Test error scenarios and edge cases
  - [x] Test batch operations with various response types
  - [x] Test role-based access restrictions
- [ ] **8.3** Documentation
  - [ ] Update README.md with Order Management features
  - [ ] Document API integration patterns
  - [ ] Create user guide for Order Management functionality
  - [ ] Document troubleshooting common issues

### Phase 9: Final Polish and Deployment
- [x] **9.1** UI/UX refinement
  - [x] Ensure responsive design works on all screen sizes
  - [x] Verify accessibility compliance (WCAG 2.1 AA)
  - [x] Polish animations and transitions
  - [ ] Conduct user acceptance testing
- [x] **9.2** Performance validation
  - [x] Load test with large datasets (1000+ orders)
  - [x] Verify batch operations perform within acceptable limits
  - [x] Test concurrent user scenarios
  - [x] Optimize bundle size and loading performance
- [ ] **9.3** Production readiness
  - [ ] Configure environment-specific API endpoints
  - [ ] Set up monitoring and error tracking
  - [ ] Prepare deployment documentation
  - [ ] Create rollback procedures

---

**Estimated Timeline**: 3-4 weeks for full implementation
**Priority**: High - Core trading functionality
**Dependencies**: Order Service API must be running and accessible
---