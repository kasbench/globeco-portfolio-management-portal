// Types for Rebalance Results from Order Generation Service

import { SubmissionState, SubmissionStateInfo } from './order'

export interface RebalancePosition {
  security_id: string // 24-character alphanumeric security identifier
  price: number // Security price at rebalance time
  original_quantity: number // Quantity before rebalance
  adjusted_quantity: number // Quantity after rebalance
  original_position_market_value: number // Market value before rebalance
  adjusted_position_market_value: number // Market value after rebalance
  target: number // Target allocation percentage (0-1)
  high_drift: number // Maximum allowable drift above target (0-1)
  low_drift: number // Maximum allowable drift below target (0-1)
  actual: number // Actual allocation percentage (0-1)
  actual_drift: number // Actual drift from target
}

// Enhanced position with order submission fields
export interface RebalancePositionWithSubmission extends RebalancePosition {
  transaction_type: 'BUY' | 'SELL' | 'HOLD' // Transaction type for order generation
  trade_quantity: number // Quantity to trade (can be negative for SELL)
  submission?: SubmissionState // Order submission status
  isEligibleForSubmission: boolean // Whether position can be submitted as order
  submissionRequestId?: string // Request ID for tracking submission
}

export interface RebalancePortfolio {
  portfolio_id: string // 24-character alphanumeric portfolio identifier
  market_value: number // Total portfolio market value
  cash_before_rebalance: number // Cash position before rebalance
  cash_after_rebalance: number // Cash position after rebalance
  positions: RebalancePosition[] // Array of position details
}

// Enhanced portfolio with order submission fields
export interface RebalancePortfolioWithSubmission extends Omit<RebalancePortfolio, 'positions'> {
  positions: RebalancePositionWithSubmission[] // Enhanced positions with submission data
  submission?: SubmissionState // Portfolio-level submission status
  eligibleOrderCount: number // Count of positions eligible for submission
  submissionRequestId?: string // Request ID for tracking submission
}

export interface Rebalance {
  rebalance_id: string // 24-character alphanumeric rebalance identifier
  model_id: string // 24-character alphanumeric model identifier
  rebalance_date: string // ISO 8601 timestamp when rebalance was executed
  model_name: string // Human-readable model name
  number_of_portfolios: number // Count of portfolios in this rebalance
  portfolios: RebalancePortfolio[] // Array of portfolio details
  version: number // Version number for optimistic locking
  created_at: string // ISO 8601 timestamp when record was created
}

// Enhanced rebalance with order submission fields
export interface RebalanceWithSubmission extends Omit<Rebalance, 'portfolios'> {
  portfolios: RebalancePortfolioWithSubmission[] // Enhanced portfolios with submission data
  submission?: SubmissionState // Rebalance-level submission status
  totalEligibleOrders: number // Total eligible orders across all portfolios
  submissionRequestId?: string // Request ID for tracking submission
}

// API Query Parameters
export interface RebalancesQueryParams {
  offset?: number // Number of records to skip (default: 0)
  limit?: number // Maximum number of records to return (default: 20)
  sort_by?: string // Sort field with optional direction prefix (-, +)
}

// Sort configuration
export type RebalanceSortField = 'rebalance_id' | 'model_name' | 'rebalance_date' | 'number_of_portfolios'

export interface RebalanceSortConfig {
  field: RebalanceSortField
  direction: 'asc' | 'desc'
}

// API Response wrapper (if pagination info is returned)
export interface RebalancesResponse {
  rebalances: Rebalance[]
  total_count?: number
  has_more?: boolean
  next_offset?: number
}

// Expanded state tracking for UI
export interface RebalanceUIState {
  isExpanded: boolean
  isLoadingPortfolios: boolean
  portfoliosLoaded: boolean
  expandedPortfolios: Set<string> // Set of expanded portfolio IDs
  loadingPositions: Set<string> // Set of portfolio IDs currently loading positions
}

// Combined type for UI with state tracking
export interface RebalanceWithUIState extends Rebalance {
  uiState: RebalanceUIState
}

// Enhanced combined type for UI with submission tracking
export interface RebalanceWithSubmissionAndUIState extends RebalanceWithSubmission {
  uiState: RebalanceUIState
}

// Portfolio with UI state for expansion tracking
export interface PortfolioUIState {
  isExpanded: boolean
  isLoadingPositions: boolean
  positionsLoaded: boolean
}

export interface RebalancePortfolioWithUIState extends RebalancePortfolio {
  uiState: PortfolioUIState
}

// Enhanced portfolio with UI state and submission tracking
export interface RebalancePortfolioWithSubmissionAndUIState extends RebalancePortfolioWithSubmission {
  uiState: PortfolioUIState
} 