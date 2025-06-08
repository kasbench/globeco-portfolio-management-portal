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

export interface RebalanceResult {
  portfolio_id: string
  transactions?: TransactionDTO[]
  drifts?: DriftDTO[]
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