// Types for Order Generation Service - Model Management

export interface ModelPosition {
  security_id: string // 24-character alphanumeric security identifier
  target: string // Target allocation percentage (0-0.95)
  high_drift: string // Maximum allowable drift above target (0-1)
  low_drift: string // Maximum allowable drift below target (0-1)
}

export interface ModelPositionInput {
  security_id: string
  target: number | string
  high_drift: number | string
  low_drift: number | string
}

export interface Model {
  model_id: string // Unique model identifier (24-character hex string)
  name: string // Model name
  positions?: ModelPosition[] // Security positions in the model
  portfolios: string[] // Associated portfolio IDs
  last_rebalance_date?: string | null // Last rebalancing timestamp (UTC)
  version: number // Optimistic locking version
}

export interface ModelCreateRequest {
  name: string
  positions?: ModelPositionInput[]
  portfolios: string[]
}

export interface ModelUpdateRequest {
  name: string
  positions?: ModelPositionInput[]
  portfolios: string[]
  last_rebalance_date?: string | null
  version: number
}

export interface ModelPortfolioRequest {
  portfolios: string[]
}

// Rebalance related types
export interface TransactionDTO {
  transaction_type: 'BUY' | 'SELL'
  security_id: string
  quantity: number
  trade_date: string
}

export interface DriftDTO {
  security_id: string
  original_quantity: string
  adjusted_quantity: string
  target: string
  high_drift: string
  low_drift: string
  actual: string
}

// RebalanceDTO - returned by /api/v1/model/{model_id}/rebalance (old format for backward compatibility)
export interface RebalanceResult {
  portfolio_id: string
  rebalance_id: string // Required field from updated API spec
  transactions?: TransactionDTO[]
  drifts?: DriftDTO[]
}

// RebalanceResultDTO - returned by new rebalance APIs /api/v1/rebalances (new format)
export interface RebalanceResultDTO {
  rebalance_id: string
  model_id: string
  rebalance_date: string
  model_name: string
  number_of_portfolios: number
  portfolios?: RebalancePortfolioDTO[]
  version: number
  created_at: string
}

export interface RebalancePortfolioDTO {
  portfolio_id: string
  market_value: string
  cash_before_rebalance: string
  cash_after_rebalance: string
  positions?: RebalancePositionDTO[]
}

export interface RebalancePositionDTO {
  security_id: string
  price: string
  original_quantity: string
  adjusted_quantity: string
  original_position_market_value: string
  adjusted_position_market_value: string
  target: string
  high_drift: string
  low_drift: string
  actual: string
  actual_drift: string
  transaction_type?: string | null
  trade_quantity?: number | null
  trade_date?: string | null
}

// API Response types
export interface ModelsResponse {
  models: Model[]
  total: number
  hasMore: boolean
}

// Query parameters for API calls
export interface ModelsQueryParams {
  offset?: number
  limit?: number
  sort_by?: string // Comma-separated list of fields (model_id, name, last_rebalance_date)
}

// Sorting configuration
export type ModelSortField = 'model_id' | 'name' | 'last_rebalance_date'

export interface SortConfig {
  field: ModelSortField
  direction: 'asc' | 'desc'
} 