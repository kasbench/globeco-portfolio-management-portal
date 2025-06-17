import { PageInfo, SortInfo } from './order';

// Core Trade Order DTO (v1 API response)
export interface TradeOrderResponseDTO {
  id: number;
  orderId: number;
  orderType: 'BUY' | 'SELL' | 'SHORT';
  quantity: number;
  quantitySent: number;
  portfolioId: string;
  securityId: string;
  blotterId: number;
  blotterAbbreviation: string;
  limitPrice?: number;
  tradeTimestamp: string;
  submitted: boolean;
  version: number;
}

// Enhanced Trade Order DTO (v2 API response with external service data)
export interface TradeOrderEnhancedResponseDTO extends TradeOrderResponseDTO {
  portfolioName?: string;    // From Portfolio Service (optional - fallback to portfolioId)
  securityTicker?: string;   // From Security Service (optional - fallback to securityId)
  portfolio?: {              // Portfolio object from external service
    name: string;
    portfolioId: string;
  };
  security?: {               // Security object from external service
    ticker: string;
    securityId: string;
  };
  blotter?: {                // Blotter object from Trade Service (optional - fallback to blotterAbbreviation)
    id: number;
    abbreviation: string;
    name: string;
    version: number;
  };
}

// Paginated response for v2 API
export interface TradeOrderPageResponseDTO {
  content: TradeOrderEnhancedResponseDTO[];
  pageable: {
    sort: SortInfo;
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Request DTOs for creating/updating trade orders
export interface CreateTradeOrderRequestDTO {
  orderId: number;
  orderType: 'BUY' | 'SELL' | 'SHORT';
  quantity: number;
  quantitySent?: number;
  portfolioId: string;
  securityId: string;
  blotterId: number;
  limitPrice?: number;
  tradeTimestamp: string;
}

export interface UpdateTradeOrderRequestDTO extends CreateTradeOrderRequestDTO {
  id: number;
  version: number;
}

// Destination DTOs
export interface DestinationResponseDTO {
  id: number;
  abbreviation: string;
  description: string;
  version: number;
}

// Trade Order Submission DTOs
export interface TradeOrderSubmission {
  tradeOrderId: number;
  quantity: number;
  destinationId: number;
}

// Batch operation DTOs
export interface BatchSubmitRequestDTO {
  submissions: TradeOrderSubmission[];
}

// Legacy batch submit (deprecated - for backward compatibility)
export interface LegacyBatchSubmitRequestDTO {
  tradeOrderIds: number[];
}

export interface BatchMoveRequestDTO {
  tradeOrderIds: number[];
  blotterAbbreviation: string;
}

export interface BatchOperationResultDTO {
  orderId: number;
  success: boolean;
  id?: number;
  message: string;
  errorCode?: string;
}

export interface BatchSubmitResponseDTO {
  successCount: number;
  failureCount: number;
  results: BatchOperationResultDTO[];
}

export interface BatchMoveResponseDTO extends BatchSubmitResponseDTO {}

// Execution DTOs
export interface ExecutionResponseDTO {
  id: number;
  orderId: number;
  quantity: number;
  price: number;
  timestamp: string;
  version: number;
}

export interface CreateExecutionRequestDTO {
  orderId: number;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface UpdateExecutionRequestDTO extends CreateExecutionRequestDTO {
  version: number;
}

// Enhanced execution with trade order details (for v2 API)
export interface ExecutionEnhancedResponseDTO extends ExecutionResponseDTO {
  tradeOrder?: TradeOrderEnhancedResponseDTO;
}

export interface ExecutionPageResponseDTO {
  content: ExecutionEnhancedResponseDTO[];
  pageable: {
    sort: SortInfo;
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Filter parameters for v2 API
export interface TradeOrderFilters {
  id?: number;
  orderId?: number;
  orderType?: string[];  // Multiple values (BUY,SELL,SHORT)
  portfolioId?: string[];
  portfolioNames?: string[];
  securityId?: string[];
  securityTickers?: string[];
  blotterAbbreviation?: string[];
  submitted?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  minQuantitySent?: number;
  maxQuantitySent?: number;
  tradeTimestampFrom?: string;
  tradeTimestampTo?: string;
}

export interface ExecutionFilters {
  id?: number;
  orderId?: number;
  minQuantity?: number;
  maxQuantity?: number;
  minPrice?: number;
  maxPrice?: number;
  timestampFrom?: string;
  timestampTo?: string;
}

// Sort parameters for v2 API
export type TradeOrderSortField = 'id' | 'orderId' | 'orderType' | 'quantity' | 'quantitySent' 
       | 'portfolioId' | 'securityId' | 'submitted' | 'tradeTimestamp'
       | 'security.ticker' | 'portfolio.name' | 'blotter.abbreviation';

export type SortDirection = 'ASC' | 'DESC';

export interface TradeOrderSortFields {
  field: TradeOrderSortField;
  direction: SortDirection;
}

export interface ExecutionSortFields {
  field: 'id' | 'orderId' | 'quantity' | 'price' | 'timestamp';
  direction: 'asc' | 'desc';
}

// Pagination parameters - using correct API field names
export interface PaginationParams {
  limit?: number;   // Maximum number of results to return (was 'size')
  offset?: number;  // Number of results to skip (was 'page')
  sort?: string;    // Comma-separated sort fields with optional '-' prefix for descending
}

// Query parameters combining filters, sorting, and pagination
export interface TradeOrderQueryParams extends TradeOrderFilters, PaginationParams {}
export interface ExecutionQueryParams extends ExecutionFilters, PaginationParams {}

// API Error response structure
export interface TradeServiceErrorResponse {
  error: string;
  message: string;
  details?: Record<string, string>;
  timestamp?: string;
  path?: string;
}

// Individual order submission response
export interface SubmitOrderResponseDTO {
  success: boolean;
  message: string;
  submittedAt?: string;
  errorCode?: string;
}

// Types for UI components
export type TradeOrderStatus = 'submitted' | 'pending' | 'draft';
export type TradeOrderAction = 'view' | 'edit' | 'delete' | 'submit';

// Selection state for batch operations
export interface TradeOrderSelection {
  selectedIds: Set<number>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

// Form validation types
export interface TradeOrderValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

// UI state types
export interface TradeOrderListState {
  orders: TradeOrderEnhancedResponseDTO[];
  loading: boolean;
  error: string | null;
  filters: TradeOrderFilters;
  sorting: TradeOrderSortFields[];
  pagination: PageInfo;
  selection: TradeOrderSelection;
}

// Action result types for UI feedback
export interface TradeOrderActionResult {
  success: boolean;
  message: string;
  affectedOrders: number[];
  errors?: Record<number, string>;
}

// Blotter types from Trade Service API
export interface BlotterResponseDTO {
  id: number;
  abbreviation: string;
  name: string;
  version: number;
}

export interface BatchActionResult {
  successCount: number;
  failureCount: number;
  totalCount: number;
  results: BatchOperationResultDTO[];
  message: string;
}

// Utility types for submission validation
export interface SubmissionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TradeOrderSubmissionData {
  tradeOrder: TradeOrderEnhancedResponseDTO;
  quantity: number;
  destinationId: number;
  remainingQuantity: number;
  validationResult: SubmissionValidationResult;
}

// UI State types for submission management
export interface SubmissionUIState {
  isModalOpen: boolean;
  selectedOrderIds: number[];
  currentStep: 'configure' | 'review' | 'submitting' | 'complete';
  defaultDestinationId: number | null;
}

// Submission progress tracking
export interface SubmissionProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  currentOrderId?: number;
}

// Form validation state for UI
export interface SubmissionFormValidation {
  [tradeOrderId: number]: {
    quantityError?: string;
    destinationError?: string;
    isValid: boolean;
  };
}

// Destination option for UI dropdowns
export interface DestinationOption {
  value: number;
  label: string;
  description: string;
  disabled?: boolean;
}

// Submission summary for review step
export interface SubmissionSummary {
  totalOrders: number;
  totalQuantity: number;
  destinations: Array<{
    destinationId: number;
    destinationName: string;
    orderCount: number;
    totalQuantity: number;
  }>;
  validationSummary: {
    validCount: number;
    invalidCount: number;
    warnings: string[];
    errors: string[];
  };
} 