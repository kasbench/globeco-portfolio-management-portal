// Security DTO (nested in ExecutionDTO when enhanced with external service data)
export interface SecurityDTO {
  securityId: string;
  ticker: string;
}

// Core Execution DTO (v1.3.0 API response - actual format)
export interface ExecutionDTO {
  id: number;
  executionStatus: 'NEW' | 'SENT' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'CANCEL';
  tradeType: 'BUY' | 'SELL';
  destination: string;
  securityId: string; // API only returns securityId, not security object
  quantity: number;
  limitPrice: number;
  receivedTimestamp: string;
  sentTimestamp: string | null;
  tradeServiceExecutionId: number | null;
  quantityFilled: number;
  averagePrice: number | null;
  version: number;
}

// Enhanced Execution DTO (with security data from Security Service)
export interface EnhancedExecutionDTO extends Omit<ExecutionDTO, 'securityId'> {
  security: SecurityDTO; // Enhanced with ticker information
  securityId?: string; // Keep for backward compatibility
}

// Pagination DTO (from API documentation)
export interface PaginationDTO {
  offset: number;
  limit: number;
  totalElements: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Paginated response for executions
export interface ExecutionPageDTO {
  content: ExecutionDTO[];
  pagination: PaginationDTO;
}

// Request DTOs for creating executions (if needed)
export interface ExecutionPostDTO {
  tradeType: 'BUY' | 'SELL';
  destination: string;
  securityId: string;
  quantity: number;
  limitPrice: number;
}

// Request DTOs for updating executions
export interface ExecutionPutDTO {
  quantityFilled: number;
  averagePrice: number;
  version: number;
}

// Request DTO for cancelling executions (status update)
export interface ExecutionCancelDTO {
  executionStatus: 'CANCEL';
  version: number;
}

// Batch execution request for creation (if needed)
export interface BatchExecutionRequestDTO {
  executions: ExecutionPostDTO[];
}

// Individual execution result for batch operations
export interface ExecutionResultDTO {
  requestIndex: number;
  status: 'SUCCESS' | 'FAILED';
  message: string;
  execution: ExecutionDTO | null;
}

// Batch execution response
export interface BatchExecutionResponseDTO {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  message: string;
  totalRequested: number;
  successful: number;
  failed: number;
  results: ExecutionResultDTO[];
}

// Filter parameters for execution queries
export interface ExecutionFilters {
  executionStatus?: ('NEW' | 'SENT' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'CANCEL')[];
  tradeType?: ('BUY' | 'SELL')[];
  destination?: string[];
  ticker?: string[];
}

// Sort fields for executions
export type ExecutionSortField = 
  | 'id' 
  | 'receivedTimestamp' 
  | 'sentTimestamp' 
  | 'executionStatus' 
  | 'tradeType' 
  | 'destination' 
  | 'quantity' 
  | 'limitPrice'
  | 'ticker';

export type SortDirection = 'ASC' | 'DESC';

export interface ExecutionSortFields {
  field: ExecutionSortField;
  direction: SortDirection;
}

// Pagination parameters (compatible with API)
export interface ExecutionPaginationParams {
  limit?: number;   // Maximum number of results to return (default: 50, max: 100)
  offset?: number;  // Number of results to skip (default: 0)
  sortBy?: string;  // Comma-separated sort fields with optional '-' prefix for descending
}

// Combined query parameters for execution API calls
export interface ExecutionQueryParams extends ExecutionFilters, ExecutionPaginationParams {}

// Error response from Execution Service
export interface ExecutionServiceErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

// Execution actions available in UI
export type ExecutionAction = 'view' | 'cancel';

// Selection state for batch operations
export interface ExecutionSelection {
  selectedIds: Set<number>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

// Validation result for execution operations
export interface ExecutionValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

// Execution list state for UI management
export interface ExecutionListState {
  executions: ExecutionDTO[];
  loading: boolean;
  error: string | null;
  filters: ExecutionFilters;
  sorting: ExecutionSortFields[];
  pagination: PaginationDTO;
  selection: ExecutionSelection;
}

// Result of execution actions (cancel, etc.)
export interface ExecutionActionResult {
  success: boolean;
  message: string;
  affectedExecutions: number[];
  errors?: Record<number, string>;
}

// Batch cancellation result
export interface BatchCancelResult {
  successCount: number;
  failureCount: number;
  totalCount: number;
  results: Array<{
    executionId: number;
    success: boolean;
    message: string;
    errorCode?: string;
  }>;
  message: string;
}

// UI state for execution management
export interface ExecutionUIState {
  isDetailsModalOpen: boolean;
  selectedExecutionId: number | null;
  isCancelConfirmOpen: boolean;
  executionsToCancel: number[];
  autoRefreshEnabled: boolean;
  lastRefreshTime: string | null;
}

// Cancellation status for UI display
export interface ExecutionCancellationStatus {
  canCancel: boolean;
  reason?: string;
}

// Enhanced execution with UI-specific properties
export interface ExecutionWithUIState extends ExecutionDTO {
  cancellationStatus: ExecutionCancellationStatus;
  isSelected: boolean;
}

// Filter option for UI dropdowns
export interface ExecutionFilterOption {
  value: string;
  label: string;
  count?: number;
}

// Summary statistics for execution dashboard
export interface ExecutionSummary {
  totalExecutions: number;
  statusBreakdown: Record<string, number>;
  tradeTypeBreakdown: Record<string, number>;
  destinationBreakdown: Record<string, number>;
  totalQuantity: number;
  totalFilled: number;
  averageFillRate: number;
} 