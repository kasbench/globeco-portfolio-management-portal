import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  RebalanceWithSubmission, 
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission 
} from '@/types/rebalance'
import { 
  OrderSubmissionResult,
  SubmissionState,
  BatchSubmissionResult,
  OrderPostDTO 
} from '@/types/order'
import { orderServiceApi } from '@/lib/api/orderService'
import { orderGenerationApi } from '@/lib/api/orderGenerationService'
import { validateOrderEligibility } from '@/lib/utils/orderMapping'
import { logOrderSubmission } from '@/lib/utils/orderLogging'

export interface BatchProgress {
  currentBatch: number
  totalBatches: number
  currentItem?: string
  currentItemType: 'rebalance' | 'portfolio' | 'position'
  processedItems: number
  totalItems: number
  startTime: Date
  estimatedCompletionTime?: Date
  successCount: number
  failureCount: number
  currentPhase: 'preparing' | 'submitting' | 'processing' | 'cleanup' | 'complete'
  statusMessage: string
}

export interface FilterCriteria {
  includeSubmitted?: boolean
  includeFailed?: boolean
  includePending?: boolean
  minOrderCount?: number
  maxOrderCount?: number
  portfolioIds?: string[]
  securityTypes?: string[]
  transactionTypes?: ('BUY' | 'SELL' | 'HOLD')[]
  submissionStatus?: SubmissionState[]
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface SmartFilter {
  id: string
  name: string
  description: string
  criteria: FilterCriteria
  isActive: boolean
  count?: number
}

export interface RetryStrategy {
  retryFailedOnly: boolean
  retryPartialOnly: boolean
  maxRetryAttempts: number
  retryDelay: number
  backoffMultiplier: number
  skipPermanentFailures: boolean
  filterCriteria?: FilterCriteria
}

export interface BatchSelectionState {
  selectedRebalances: Set<string>
  selectedPortfolios: Set<string>
  selectedPositions: Set<string>
  filters: SmartFilter[]
  activeFilterId?: string
  selectionMode: 'rebalance' | 'portfolio' | 'position'
  smartSelectionEnabled: boolean
}

export interface BatchOperationOptions {
  enableProgressTracking: boolean
  enableSmartFiltering: boolean
  enableAutoRetry: boolean
  retryStrategy: RetryStrategy
  batchSize: number
  concurrentBatches: number
  pauseOnError: boolean
  skipValidation: boolean
}

interface UseBatchOperationsReturn {
  // Selection state
  selectionState: BatchSelectionState
  updateSelectionState: (updates: Partial<BatchSelectionState>) => void
  
  // Smart filtering
  availableFilters: SmartFilter[]
  createFilter: (name: string, criteria: FilterCriteria) => SmartFilter
  applyFilter: (filterId: string) => void
  clearFilter: () => void
  getFilteredItems: () => {
    rebalances: RebalanceWithSubmission[]
    portfolios: RebalancePortfolioWithSubmission[]
    positions: RebalancePositionWithSubmission[]
  }
  
  // Selection management
  selectAll: (itemType?: 'rebalance' | 'portfolio' | 'position', filtered?: boolean) => void
  selectNone: (itemType?: 'rebalance' | 'portfolio' | 'position') => void
  selectEligibleOnly: () => void
  selectByValue: (minValue?: number, maxValue?: number) => void
  invertSelection: (itemType?: 'rebalance' | 'portfolio' | 'position') => void
  
  // Batch operations
  batchSubmit: (options?: Partial<BatchOperationOptions>) => Promise<BatchSubmissionResult>
  batchDelete: (options?: Partial<BatchOperationOptions>) => Promise<BatchSubmissionResult>
  batchRetry: (previousResults: OrderSubmissionResult[], strategy?: RetryStrategy) => Promise<BatchSubmissionResult>
  
  // Progress tracking
  progress: BatchProgress | null
  isProcessing: boolean
  canCancel: boolean
  cancelOperation: () => void
  
  // Advanced features
  estimateProcessingTime: () => number
  validateSelection: () => { valid: boolean; errors: string[]; warnings: string[] }
  exportSelection: () => { rebalanceIds: string[]; portfolioIds: string[]; positionIds: string[] }
  importSelection: (exported: { rebalanceIds: string[]; portfolioIds: string[]; positionIds: string[] }) => void
}

const DEFAULT_BATCH_OPTIONS: BatchOperationOptions = {
  enableProgressTracking: true,
  enableSmartFiltering: true,
  enableAutoRetry: true,
  retryStrategy: {
    retryFailedOnly: true,
    retryPartialOnly: false,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    skipPermanentFailures: true
  },
  batchSize: 1000,
  concurrentBatches: 1,
  pauseOnError: false,
  skipValidation: false
}

export function useBatchOperations(
  rebalances: RebalanceWithSubmission[] = [],
  options: Partial<BatchOperationOptions> = {}
): UseBatchOperationsReturn {
  const queryClient = useQueryClient()
  const [selectionState, setSelectionState] = useState<BatchSelectionState>({
    selectedRebalances: new Set(),
    selectedPortfolios: new Set(),
    selectedPositions: new Set(),
    filters: [],
    selectionMode: 'rebalance',
    smartSelectionEnabled: true
  })
  
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)

  const mergedOptions = useMemo(() => ({ ...DEFAULT_BATCH_OPTIONS, ...options }), [options])

  // Create predefined smart filters
  const availableFilters = useMemo((): SmartFilter[] => [
    {
      id: 'eligible-orders',
      name: 'Eligible Orders Only',
      description: 'Show only positions that can be submitted as orders (BUY/SELL with non-zero quantities)',
      criteria: {
        transactionTypes: ['BUY', 'SELL'],
        submissionStatus: [SubmissionState.NotSubmitted, SubmissionState.Failed]
      },
      isActive: false
    },
    {
      id: 'failed-submissions',
      name: 'Failed Submissions',
      description: 'Show positions that failed to submit previously',
      criteria: {
        submissionStatus: [SubmissionState.Failed]
      },
      isActive: false
    },
    {
      id: 'large-positions',
      name: 'Large Positions',
      description: 'Show positions with trade value > $10,000',
      criteria: {
        minOrderCount: 10000
      },
      isActive: false
    },
    {
      id: 'recent-failures',
      name: 'Recent Failures',
      description: 'Show positions that failed in the last 24 hours',
      criteria: {
        submissionStatus: [SubmissionState.Failed],
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      },
      isActive: false
    },
    {
      id: 'pending-retries',
      name: 'Pending Retries',
      description: 'Show positions that are retryable after previous failures',
      criteria: {
        submissionStatus: [SubmissionState.Failed],
        includeFailed: true
      },
      isActive: false
    }
  ], [])

  // Filtered data based on active filter
  const getFilteredItems = useCallback(() => {
    const activeFilter = selectionState.filters.find(f => f.id === selectionState.activeFilterId)
    if (!activeFilter || !selectionState.smartSelectionEnabled) {
      return {
        rebalances,
        portfolios: rebalances.flatMap(r => r.portfolios || []),
        positions: rebalances.flatMap(r => 
          (r.portfolios || []).flatMap(p => p.positions || [])
        )
      }
    }

    const criteria = activeFilter.criteria
    let filteredRebalances = rebalances

    // Apply filters
    if (criteria.submissionStatus) {
      filteredRebalances = filteredRebalances.filter(rebalance =>
        rebalance.portfolios?.some(portfolio =>
          portfolio.positions?.some(position =>
            position.submission && criteria.submissionStatus!.includes(position.submission)
          )
        )
      )
    }

    if (criteria.transactionTypes) {
      filteredRebalances = filteredRebalances.filter(rebalance =>
        rebalance.portfolios?.some(portfolio =>
          portfolio.positions?.some(position =>
            criteria.transactionTypes!.includes(position.transaction_type as any)
          )
        )
      )
    }

    if (criteria.dateRange) {
      filteredRebalances = filteredRebalances.filter(rebalance =>
        rebalance.portfolios?.some(portfolio =>
          portfolio.positions?.some(position =>
            // Note: submitted_at not available on position level
            true // Placeholder for date range filtering
          )
        )
      )
    }

    return {
      rebalances: filteredRebalances,
      portfolios: filteredRebalances.flatMap(r => r.portfolios || []),
      positions: filteredRebalances.flatMap(r => 
        (r.portfolios || []).flatMap(p => p.positions || [])
      )
    }
  }, [rebalances, selectionState.filters, selectionState.activeFilterId, selectionState.smartSelectionEnabled])

  const updateSelectionState = useCallback((updates: Partial<BatchSelectionState>) => {
    setSelectionState(prev => ({ ...prev, ...updates }))
  }, [])

  const createFilter = useCallback((name: string, criteria: FilterCriteria): SmartFilter => {
    const filter: SmartFilter = {
      id: `custom-${Date.now()}`,
      name,
      description: `Custom filter: ${name}`,
      criteria,
      isActive: false
    }
    
    setSelectionState(prev => ({
      ...prev,
      filters: [...prev.filters, filter]
    }))
    
    return filter
  }, [])

  const applyFilter = useCallback((filterId: string) => {
    const filter = [...availableFilters, ...selectionState.filters].find(f => f.id === filterId)
    if (!filter) return

    setSelectionState(prev => ({
      ...prev,
      activeFilterId: filterId,
      smartSelectionEnabled: true
    }))
  }, [availableFilters, selectionState.filters])

  const clearFilter = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      activeFilterId: undefined
    }))
  }, [])

  // Advanced selection functions
  const selectAll = useCallback((itemType?: 'rebalance' | 'portfolio' | 'position', filtered = true) => {
    const items = filtered ? getFilteredItems() : {
      rebalances,
      portfolios: rebalances.flatMap(r => r.portfolios || []),
      positions: rebalances.flatMap(r => (r.portfolios || []).flatMap(p => p.positions || []))
    }

    const updates: Partial<BatchSelectionState> = {}

    if (!itemType || itemType === 'rebalance') {
      updates.selectedRebalances = new Set(items.rebalances.map(r => r.rebalance_id))
    }
    if (!itemType || itemType === 'portfolio') {
      updates.selectedPortfolios = new Set(items.portfolios.map(p => p.portfolio_id))
    }
    if (!itemType || itemType === 'position') {
      updates.selectedPositions = new Set(items.positions.map((p: any, i) => `${p.portfolio_id || 'unknown'}-${p.security_id}-${i}`))
    }

    updateSelectionState(updates)
  }, [getFilteredItems, rebalances, updateSelectionState])

  const selectNone = useCallback((itemType?: 'rebalance' | 'portfolio' | 'position') => {
    const updates: Partial<BatchSelectionState> = {}

    if (!itemType || itemType === 'rebalance') {
      updates.selectedRebalances = new Set()
    }
    if (!itemType || itemType === 'portfolio') {
      updates.selectedPortfolios = new Set()
    }
    if (!itemType || itemType === 'position') {
      updates.selectedPositions = new Set()
    }

    updateSelectionState(updates)
  }, [updateSelectionState])

  const selectEligibleOnly = useCallback(() => {
    const { positions } = getFilteredItems()
    const eligiblePositions = positions.filter(pos => {
      const validation = validateOrderEligibility(pos)
      return validation.isEligible
    })

    updateSelectionState({
      selectedPositions: new Set(eligiblePositions.map((p: any, i) => `${p.portfolio_id || 'unknown'}-${p.security_id}-${i}`))
    })
  }, [getFilteredItems, updateSelectionState])

  const selectByValue = useCallback((minValue = 0, maxValue = Infinity) => {
    const { positions } = getFilteredItems()
    const valueFilteredPositions = positions.filter(pos => {
      const value = Math.abs((pos.trade_quantity || 0) * (pos.price || 0))
      return value >= minValue && value <= maxValue
    })

    updateSelectionState({
      selectedPositions: new Set(valueFilteredPositions.map((p: any, i) => `${p.portfolio_id || 'unknown'}-${p.security_id}-${i}`))
    })
  }, [getFilteredItems, updateSelectionState])

  const invertSelection = useCallback((itemType?: 'rebalance' | 'portfolio' | 'position') => {
    const items = getFilteredItems()
    const updates: Partial<BatchSelectionState> = {}

    if (!itemType || itemType === 'rebalance') {
      const allIds = new Set(items.rebalances.map(r => r.rebalance_id))
      const currentSelection = selectionState.selectedRebalances
      updates.selectedRebalances = new Set(
        [...allIds].filter(id => !currentSelection.has(id))
      )
    }

    if (!itemType || itemType === 'portfolio') {
      const allIds = new Set(items.portfolios.map(p => p.portfolio_id))
      const currentSelection = selectionState.selectedPortfolios
      updates.selectedPortfolios = new Set(
        [...allIds].filter(id => !currentSelection.has(id))
      )
    }

    if (!itemType || itemType === 'position') {
      const allIds = new Set(items.positions.map((p: any, i) => `${p.portfolio_id || 'unknown'}-${p.security_id}-${i}`))
      const currentSelection = selectionState.selectedPositions
      updates.selectedPositions = new Set(
        [...allIds].filter(id => !currentSelection.has(id))
      )
    }

    updateSelectionState(updates)
  }, [getFilteredItems, selectionState, updateSelectionState])

  // Progress tracking utilities
  const updateProgress = useCallback((updates: Partial<BatchProgress>) => {
    if (!mergedOptions.enableProgressTracking) return
    
    setProgress(prev => prev ? { ...prev, ...updates } : null)
  }, [mergedOptions.enableProgressTracking])

  const estimateProcessingTime = useCallback(() => {
    const selectedCount = selectionState.selectedRebalances.size + 
                          selectionState.selectedPortfolios.size + 
                          selectionState.selectedPositions.size
    
    // Estimate based on batch size and processing speed
    const estimatedOrdersPerItem = 50 // Average orders per item
    const totalOrders = selectedCount * estimatedOrdersPerItem
    const batchCount = Math.ceil(totalOrders / mergedOptions.batchSize)
    const processingTimePerBatch = 2000 // 2 seconds per batch
    
    return batchCount * processingTimePerBatch
  }, [selectionState, mergedOptions.batchSize])

  const validateSelection = useCallback(() => {
    const errors: string[] = []
    const warnings: string[] = []
    
    const selectedCount = selectionState.selectedRebalances.size + 
                          selectionState.selectedPortfolios.size + 
                          selectionState.selectedPositions.size
    
    if (selectedCount === 0) {
      errors.push('No items selected for processing')
    }
    
    if (selectedCount > 10000) {
      warnings.push('Large selection may take significant time to process')
    }
    
    // Check for invalid positions
    const { positions } = getFilteredItems()
    const selectedPositions = positions.filter((p: any, i) => 
      selectionState.selectedPositions.has(`${p.portfolio_id || 'unknown'}-${p.security_id}-${i}`)
    )
    
    const ineligibleCount = selectedPositions.filter(pos => {
      const validation = validateOrderEligibility(pos)
      return !validation.isEligible
    }).length
    
    if (ineligibleCount > 0) {
      warnings.push(`${ineligibleCount} selected positions are not eligible for submission`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }, [selectionState, getFilteredItems])

  // Batch operations
  const batchSubmit = useCallback(async (
    operationOptions?: Partial<BatchOperationOptions>
  ): Promise<BatchSubmissionResult> => {
    const opts = { ...mergedOptions, ...operationOptions }
    setIsProcessing(true)
    setCanCancel(true)
    setCancelRequested(false)

    const startTime = new Date()
    const requestId = `batch-submit-${Date.now()}`
    
    try {
      // Initialize progress tracking
      if (opts.enableProgressTracking) {
        setProgress({
          currentBatch: 0,
          totalBatches: 0,
          currentItemType: 'rebalance',
          processedItems: 0,
          totalItems: selectionState.selectedRebalances.size,
          startTime,
          successCount: 0,
          failureCount: 0,
          currentPhase: 'preparing',
          statusMessage: 'Preparing submission...'
        })
      }

      // Get selected rebalances
      const selectedRebalances = rebalances.filter(r => 
        selectionState.selectedRebalances.has(r.rebalance_id)
      )

      if (selectedRebalances.length === 0) {
        throw new Error('No rebalances selected for submission')
      }

      logOrderSubmission.start(
        'batch_submit',
        [],
        requestId,
        undefined,
        `batch-${selectedRebalances.length}-rebalances`
      )

      const results: OrderSubmissionResult[] = []
      let totalSuccessful = 0
      let totalFailed = 0

      // Process each rebalance
      for (let i = 0; i < selectedRebalances.length; i++) {
        if (cancelRequested) {
          break
        }

        const rebalance = selectedRebalances[i]
        
        updateProgress({
          currentBatch: i + 1,
          totalBatches: selectedRebalances.length,
          currentItem: rebalance.rebalance_id,
          processedItems: i,
          currentPhase: 'submitting',
          statusMessage: `Submitting rebalance ${i + 1} of ${selectedRebalances.length}...`
        })

        try {
          // Process each portfolio separately to maintain portfolio context
          // eslint-disable-next-line prefer-const
          let rebalanceResult: OrderSubmissionResult = {
            totalOrders: 0,
            successfulOrders: 0,
            failedOrders: 0,
            errors: [],
            submittedOrderIds: [],
            failedPositions: []
          }

          for (const portfolio of rebalance.portfolios) {
            const portfolioResult = await orderServiceApi.submitRebalancePositions(
              portfolio.positions,
              portfolio.portfolio_id,
              (progress) => {
                updateProgress({
                  statusMessage: `Processing portfolio ${portfolio.portfolio_id}: ${progress.submitted}/${progress.total} orders...`
                })
              }
            )

            // Aggregate results
            rebalanceResult.totalOrders += portfolioResult.totalOrders
            rebalanceResult.successfulOrders += portfolioResult.successfulOrders
            rebalanceResult.failedOrders += portfolioResult.failedOrders
            rebalanceResult.errors.push(...portfolioResult.errors)
            rebalanceResult.submittedOrderIds.push(...portfolioResult.submittedOrderIds)
            rebalanceResult.failedPositions.push(...portfolioResult.failedPositions)
          }

          results.push(rebalanceResult)
          totalSuccessful += rebalanceResult.successfulOrders
          totalFailed += rebalanceResult.failedOrders

          updateProgress({
            successCount: totalSuccessful,
            failureCount: totalFailed
          })

        } catch (error) {
          console.error(`Failed to submit rebalance ${rebalance.rebalance_id}:`, error)
          totalFailed++
          
          updateProgress({
            failureCount: totalFailed
          })
        }
      }

      updateProgress({
        currentPhase: 'cleanup',
        statusMessage: 'Cleaning up...'
      })

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['rebalances'] })

      updateProgress({
        currentPhase: 'complete',
        statusMessage: 'Submission complete'
      })

      return {
        request: {
          requestId,
          type: 'batch_submit',
          rebalanceIds: selectedRebalances.map(r => r.rebalance_id),
          submittedAt: startTime
        },
        overallStatus: totalFailed === 0 ? 'success' : (totalSuccessful > 0 ? 'partial' : 'failed'),
        results: results.map(r => ({
          rebalanceId: '',
          status: r.successfulOrders > 0 ? 'success' : 'failed',
          message: r.errors.join(', '),
          orderResults: []
        })),
        totalProcessed: results.length,
        totalSuccessful,
        totalFailed
      }

    } catch (error) {
      console.error('Batch submission failed:', error)
      throw error
    } finally {
      setIsProcessing(false)
      setCanCancel(false)
      setCancelRequested(false)
      setProgress(null)
    }
  }, [rebalances, selectionState, mergedOptions, queryClient, updateProgress])

  const batchDelete = useCallback(async (
    operationOptions?: Partial<BatchOperationOptions>
  ): Promise<BatchSubmissionResult> => {
    const opts = { ...mergedOptions, ...operationOptions }
    setIsProcessing(true)
    setCanCancel(true)
    setCancelRequested(false)
    
    const startTime = new Date()
    const requestId = `batch-delete-${Date.now()}`
    
    try {
      // Initialize progress tracking
      if (opts.enableProgressTracking) {
        setProgress({
          currentBatch: 0,
          totalBatches: 0,
          currentItemType: 'rebalance',
          processedItems: 0,
          totalItems: selectionState.selectedRebalances.size,
          startTime,
          successCount: 0,
          failureCount: 0,
          currentPhase: 'preparing',
          statusMessage: 'Preparing deletion...'
        })
      }

      // Get selected rebalances with their versions
      const selectedRebalances = rebalances.filter(r => 
        selectionState.selectedRebalances.has(r.rebalance_id)
      )

      if (selectedRebalances.length === 0) {
        throw new Error('No rebalances selected for deletion')
      }

      // Create deletion requests with version for optimistic locking
      const deletionRequests = selectedRebalances.map(rebalance => ({
        rebalanceId: rebalance.rebalance_id,
        version: rebalance.version
      }))

      updateProgress({
        currentPhase: 'processing',
        statusMessage: 'Deleting rebalances...'
      })

      // Use the batch deletion API
      const deletionResult = await orderGenerationApi.deleteRebalances(deletionRequests)

      updateProgress({
        currentPhase: 'cleanup',
        statusMessage: 'Cleaning up...',
        successCount: deletionResult.totalDeleted,
        failureCount: deletionResult.totalFailed
      })

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['rebalances'] })

      updateProgress({
        currentPhase: 'complete',
        statusMessage: 'Deletion complete'
      })

      return {
        request: {
          requestId,
          type: 'batch_delete',
          rebalanceIds: deletionRequests.map(r => r.rebalanceId),
          submittedAt: startTime
        },
        overallStatus: deletionResult.totalFailed === 0 ? 'success' : 
                      deletionResult.totalDeleted > 0 ? 'partial' : 'failed',
        results: [
          ...deletionResult.successful.map(rebalanceId => ({
            rebalanceId,
            status: 'success' as const,
            message: 'Rebalance deleted successfully'
          })),
          ...deletionResult.failed.map(failure => ({
            rebalanceId: failure.rebalanceId,
            status: 'failed' as const,
            message: failure.error
          }))
        ],
        totalProcessed: deletionRequests.length,
        totalSuccessful: deletionResult.totalDeleted,
        totalFailed: deletionResult.totalFailed
      }

    } catch (error) {
      console.error('Batch deletion failed:', error)
      throw error
    } finally {
      setIsProcessing(false)
      setCanCancel(false)
      setCancelRequested(false)
      setProgress(null)
    }
  }, [rebalances, selectionState, mergedOptions, queryClient, updateProgress])

  const batchRetry = useCallback(async (
    previousResults: OrderSubmissionResult[],
    strategy?: RetryStrategy
  ): Promise<BatchSubmissionResult> => {
    const retryStrategy = strategy || mergedOptions.retryStrategy
    setIsProcessing(true)
    const startTime = new Date()
    const requestId = `batch-retry-${Date.now()}`

    try {
      // Filter results based on retry strategy
      const retryableResults = previousResults.filter(result => {
        if (retryStrategy.retryFailedOnly && result.failedOrders === 0) {
          return false
        }
        if (retryStrategy.retryPartialOnly && !(result.successfulOrders > 0 && result.failedOrders > 0)) {
          return false
        }
        return true
      })

      // TODO: Implement retry logic
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        request: {
          requestId,
          type: 'batch_retry',
          rebalanceIds: [],
          submittedAt: startTime
        },
        overallStatus: 'success',
        results: [],
        totalProcessed: retryableResults.length,
        totalSuccessful: retryableResults.length,
        totalFailed: 0
      }
    } finally {
      setIsProcessing(false)
    }
  }, [mergedOptions.retryStrategy])

  const cancelOperation = useCallback(() => {
    setCancelRequested(true)
    setCanCancel(false)
  }, [])

  const exportSelection = useCallback(() => ({
    rebalanceIds: Array.from(selectionState.selectedRebalances),
    portfolioIds: Array.from(selectionState.selectedPortfolios),
    positionIds: Array.from(selectionState.selectedPositions)
  }), [selectionState])

  const importSelection = useCallback((exported: {
    rebalanceIds: string[]
    portfolioIds: string[]
    positionIds: string[]
  }) => {
    updateSelectionState({
      selectedRebalances: new Set(exported.rebalanceIds),
      selectedPortfolios: new Set(exported.portfolioIds),
      selectedPositions: new Set(exported.positionIds)
    })
  }, [updateSelectionState])

  return {
    // Selection state
    selectionState,
    updateSelectionState,
    
    // Smart filtering
    availableFilters,
    createFilter,
    applyFilter,
    clearFilter,
    getFilteredItems,
    
    // Selection management
    selectAll,
    selectNone,
    selectEligibleOnly,
    selectByValue,
    invertSelection,
    
    // Batch operations
    batchSubmit,
    batchDelete,
    batchRetry,
    
    // Progress tracking
    progress,
    isProcessing,
    canCancel,
    cancelOperation,
    
    // Advanced features
    estimateProcessingTime,
    validateSelection,
    exportSelection,
    importSelection
  }
} 