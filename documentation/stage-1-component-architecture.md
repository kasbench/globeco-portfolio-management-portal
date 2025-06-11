# Component Hierarchy Design for Order Submission

## Overview
This document outlines the component architecture for implementing order submission functionality in the Rebalance Results page.

## Component Hierarchy

### 1. Enhanced RebalanceResultsPage
**Path:** `src/app/model-management/rebalance-results/page.tsx`
**Responsibility:** Main page container with submission state management
**Changes:**
- Add submission state context
- Integrate order submission hooks
- Add global submission controls
- Handle success/error notifications

### 2. Enhanced RebalanceTable  
**Path:** `src/components/tables/RebalanceTable.tsx`
**Responsibility:** Main table with rebalance-level submission controls
**Changes:**
- Add submission action column
- Integrate submission status indicators
- Add batch selection checkboxes
- Handle rebalance-level submissions

### 3. Enhanced PortfolioTable
**Path:** `src/components/tables/PortfolioTable.tsx` (existing)
**Responsibility:** Portfolio display with portfolio-level submission controls
**Changes:**
- Add submission action buttons
- Show eligible order counts
- Display submission status
- Handle portfolio-level submissions

### 4. New: OrderSubmissionControls
**Path:** `src/components/forms/OrderSubmissionControls.tsx`
**Responsibility:** Centralized submission control component
**Features:**
- Submit button with loading states
- Batch selection management
- Confirmation dialogs
- Progress indicators

### 5. New: SubmissionStatusIndicator
**Path:** `src/components/ui/SubmissionStatusIndicator.tsx`
**Responsibility:** Visual status indicators for submission states
**Features:**
- Status badges (idle, pending, success, failed, partial)
- Progress bars for batch operations
- Error/success icons
- Tooltip with detailed information

### 6. New: SubmissionConfirmationDialog
**Path:** `src/components/forms/SubmissionConfirmationDialog.tsx`
**Responsibility:** Pre-submission confirmation and preview
**Features:**
- Order count preview
- Affected portfolios list
- Confirmation actions
- Cancel/proceed options

### 7. New: SubmissionResultsDialog
**Path:** `src/components/forms/SubmissionResultsDialog.tsx`
**Responsibility:** Post-submission results display
**Features:**
- Success/failure summary
- Individual order results
- Retry options for failures
- Error details

## Component State Architecture

### State Management Strategy
```typescript
// Global submission state (React Query + Zustand)
interface SubmissionStoreState {
  activeSubmissions: Map<string, SubmissionState>
  submissionHistory: SubmissionState[]
  batchConfig: OrderMappingConfig
  retryQueue: RetryState[]
}

// Component-level state (useState)
interface ComponentState {
  selectedRebalances: Set<string>
  selectedPortfolios: Set<string>
  showConfirmation: boolean
  showResults: boolean
}
```

### Data Flow
1. **User Action** → Component → Submission Hook
2. **Submission Hook** → Order Service API
3. **API Response** → State Update → UI Refresh
4. **Success/Failure** → Data Cleanup + Notification

## Integration Points

### 1. Enhanced useRebalances Hook
**Path:** `src/lib/hooks/useRebalances.ts`
**New Features:**
- Submission state tracking
- Data transformation with submission metadata
- Optimistic updates for submissions

### 2. New: useOrderSubmission Hook
**Path:** `src/lib/hooks/useOrderSubmission.ts`
**Responsibilities:**
- Order mapping and validation
- Batch processing management
- API communication
- Error handling and retry logic

### 3. Enhanced Order Generation Service
**Path:** `src/lib/api/orderGenerationService.ts`
**New Functions:**
- Order Service client integration
- Batch submission handling
- Response processing

## File Structure Changes

```
src/
├── components/
│   ├── forms/
│   │   ├── OrderSubmissionControls.tsx       [NEW]
│   │   ├── SubmissionConfirmationDialog.tsx  [NEW]
│   │   └── SubmissionResultsDialog.tsx       [NEW]
│   ├── tables/
│   │   ├── RebalanceTable.tsx                [ENHANCED]
│   │   └── PortfolioTable.tsx                [ENHANCED]
│   └── ui/
│       └── SubmissionStatusIndicator.tsx     [NEW]
├── lib/
│   ├── hooks/
│   │   ├── useRebalances.ts                  [ENHANCED]
│   │   └── useOrderSubmission.ts             [NEW]
│   ├── api/
│   │   ├── orderGenerationService.ts         [ENHANCED]
│   │   └── orderService.ts                   [NEW]
│   └── utils/
│       ├── orderMapping.ts                   [NEW]
│       └── orderValidation.ts                [NEW]
├── types/
│   └── order.ts                              [NEW]
└── store/
    └── submissionStore.ts                    [NEW]
```

## Key Design Principles

### 1. Progressive Enhancement
- Existing functionality remains untouched
- New features are additive
- Graceful degradation when services unavailable

### 2. Separation of Concerns
- **Presentation:** Components handle UI and user interactions
- **Business Logic:** Hooks handle state management and API calls
- **Data:** Services handle API communication and transformation

### 3. Error Boundaries
- Component-level error boundaries
- API-level error handling
- User-friendly error messages

### 4. Performance Optimization
- Lazy loading for heavy operations
- Optimistic updates for better UX
- Background processing for large batches

### 5. Accessibility
- Keyboard navigation support
- Screen reader compatibility
- Focus management during dialogs

## Next Steps
1. Implement TypeScript interfaces ✅
2. Create utility functions for order mapping
3. Implement core hooks for submission logic
4. Build UI components with proper error handling
5. Integrate with existing table components
6. Add comprehensive testing 