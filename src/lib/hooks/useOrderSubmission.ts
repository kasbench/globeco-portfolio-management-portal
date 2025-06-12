// Comprehensive hook for Order Submission management
// Handles submission state, multi-select functionality, and deletion operations

'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission 
} from '@/types/rebalance'
import { SubmissionState, OrderSubmissionResult } from '@/types/order'
import { orderServiceApi } from '@/lib/api/orderService'
import { dataTransformationService } from '@/lib/services/dataTransformationService'
import { responseProcessingService } from '@/lib/services/responseProcessingService'
import { 
  getGlobalSubmissionQueue, 
  QueuePriority, 
  QueueSubmissionItem 
} from '@/lib/services/orderSubmissionQueue'
import { 
  globalRequestThrottler, 
  ActionBatcher,
  AdvancedDebouncer 
} from '@/lib/utils/performance'

/**
 * Order submission hook state
 */
export interface OrderSubmissionState {
  // Selection state
  selectedRebalanceIds: Set<string>
  selectedPortfolioIds: Set<string>
  
  // Submission state
  isSubmitting: boolean
  isDeleting: boolean
  submissionProgress: {
    currentBatch: number
    totalBatches: number
    currentRebalance?: string
    currentPortfolio?: string
  } | null
  
  // Background processing state
  queuedItems: QueueSubmissionItem[]
  processingItems: QueueSubmissionItem[]
  backgroundProcessingEnabled: boolean
  
  // Results
  submissionResults: OrderSubmissionResult[]
  lastSubmissionError: Error | null
}

/**
 * Order submission hook return type
 */
export interface UseOrderSubmissionReturn {
  // State
  state: OrderSubmissionState
  
  // Selection handlers
  selectRebalance: (rebalanceId: string, selected: boolean) => void
  selectPortfolio: (portfolioId: string, selected: boolean) => void
  selectAllRebalances: (rebalances: RebalanceWithSubmission[], selected: boolean) => void
  clearSelections: () => void
  
  // Submission handlers
  submitAll: (rebalances: RebalanceWithSubmission[]) => Promise<void>
  submitSelectedRebalances: (rebalances: RebalanceWithSubmission[]) => Promise<void>
  submitSelectedPortfolios: (rebalances: RebalanceWithSubmission[]) => Promise<void>
  submitSingleRebalance: (rebalance: RebalanceWithSubmission) => Promise<void>
  submitSinglePortfolio: (portfolio: RebalancePortfolioWithSubmission, rebalanceId: string) => Promise<void>
  
  // Deletion handlers
  deleteSelectedRebalances: (rebalanceIds: string[]) => Promise<void>
  deleteSelectedPortfolios: (portfolioIds: string[]) => Promise<void>
  deleteSingleRebalance: (rebalanceId: string) => Promise<void>
  deleteSinglePortfolio: (portfolioId: string) => Promise<void>
  
  // Utility functions
  getSelectionStats: (rebalances: RebalanceWithSubmission[]) => {
    selectedRebalances: number
    selectedPortfolios: number
    eligibleOrders: number
    totalRebalances: number
    totalPortfolios: number
  }
  
  // Background processing
  enableBackgroundProcessing: (enabled: boolean) => void
  getQueueStatus: () => {
    pending: QueueSubmissionItem[]
    processing: QueueSubmissionItem[]
    completed: QueueSubmissionItem[]
  }
  
  // Progress tracking
  resetSubmissionState: () => void
}

/**
 * Custom hook for order submission management
 */
export function useOrderSubmission(): UseOrderSubmissionReturn {
  const queryClient = useQueryClient()
  
  // State management
  const [state, setState] = useState<OrderSubmissionState>({
    selectedRebalanceIds: new Set(),
    selectedPortfolioIds: new Set(),
    isSubmitting: false,
    isDeleting: false,
    submissionProgress: null,
    queuedItems: [],
    processingItems: [],
    backgroundProcessingEnabled: true,
    submissionResults: [],
    lastSubmissionError: null
  })

  // Performance utilities
  const submissionQueue = useMemo(() => getGlobalSubmissionQueue(), [])
  const selectionBatcher = useMemo(() => 
    new ActionBatcher<{ type: 'select'; id: string; selected: boolean }>(
      (actions) => {
        // Process batched selection changes
        setState(prev => {
          const newRebalanceIds = new Set(prev.selectedRebalanceIds)
          const newPortfolioIds = new Set(prev.selectedPortfolioIds)
          
          actions.forEach(action => {
            if (action.type === 'select') {
              // Determine if it's a rebalance or portfolio ID based on pattern
              if (action.id.startsWith('rebal_')) {
                if (action.selected) {
                  newRebalanceIds.add(action.id)
                } else {
                  newRebalanceIds.delete(action.id)
                }
              } else {
                if (action.selected) {
                  newPortfolioIds.add(action.id)
                } else {
                  newPortfolioIds.delete(action.id)
                }
              }
            }
          })
          
          return {
            ...prev,
            selectedRebalanceIds: newRebalanceIds,
            selectedPortfolioIds: newPortfolioIds
          }
        })
      },
      5, // Batch size
      100 // Timeout ms
    ), []
  )

  const debouncedStateUpdate = useMemo(() =>
    new AdvancedDebouncer(
      (updates: Partial<OrderSubmissionState>) => {
        setState(prev => ({ ...prev, ...updates }))
      },
      50, // 50ms debounce
      { trailing: true }
    ), []
  )

  // Update state helper
  const updateState = useCallback((updates: Partial<OrderSubmissionState>) => {
    debouncedStateUpdate.call(updates)
  }, [debouncedStateUpdate])

  // Selection handlers (optimized with batching)
  const selectRebalance = useCallback((rebalanceId: string, selected: boolean) => {
    selectionBatcher.add({ type: 'select', id: rebalanceId, selected })
  }, [selectionBatcher])

  const selectPortfolio = useCallback((portfolioId: string, selected: boolean) => {
    selectionBatcher.add({ type: 'select', id: portfolioId, selected })
  }, [selectionBatcher])

  const selectAllRebalances = useCallback((rebalances: RebalanceWithSubmission[], selected: boolean) => {
    if (selected) {
      const allRebalanceIds = new Set(rebalances.map(r => r.rebalance_id))
      const allPortfolioIds = new Set(
        rebalances.flatMap(r => r.portfolios.map(p => p.portfolio_id))
      )
      setState(prev => ({
        ...prev,
        selectedRebalanceIds: allRebalanceIds,
        selectedPortfolioIds: allPortfolioIds
      }))
    } else {
      setState(prev => ({
        ...prev,
        selectedRebalanceIds: new Set(),
        selectedPortfolioIds: new Set()
      }))
    }
  }, [])

  const clearSelections = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedRebalanceIds: new Set(),
      selectedPortfolioIds: new Set()
    }))
  }, [])

  // Core submission logic with background processing support
  const performSubmission = useCallback(async (
    rebalances: RebalanceWithSubmission[],
    submissionType: 'all' | 'selected_rebalances' | 'selected_portfolios' | 'single_rebalance' | 'single_portfolio',
    useBackgroundProcessing: boolean = state.backgroundProcessingEnabled
  ): Promise<void> => {
    try {
      updateState({ 
        isSubmitting: true, 
        lastSubmissionError: null,
        submissionResults: []
      })

      // Filter rebalances based on submission type
      let targetRebalances: RebalanceWithSubmission[]
      
      switch (submissionType) {
        case 'all':
          targetRebalances = rebalances
          break
        case 'selected_rebalances':
          targetRebalances = rebalances.filter(r => state.selectedRebalanceIds.has(r.rebalance_id))
          break
        case 'selected_portfolios':
          // For portfolio-only submissions, filter to only selected portfolios
          targetRebalances = rebalances.map(rebalance => ({
            ...rebalance,
            portfolios: rebalance.portfolios.filter(p => state.selectedPortfolioIds.has(p.portfolio_id))
          })).filter(r => r.portfolios.length > 0)
          break
        default:
          targetRebalances = rebalances
      }

      if (targetRebalances.length === 0) {
        throw new Error('No valid rebalances or portfolios selected for submission')
      }

      // Transform rebalances to submission format
      const submissionRebalances = await dataTransformationService.transformRebalancesForSubmission(
        targetRebalances,
        { includeMetadata: true }
      )

      if (useBackgroundProcessing && submissionRebalances.length > 1) {
        // Use background processing for multiple items
        const queuedItemIds: string[] = []
        
        for (const rebalance of submissionRebalances) {
          const queueId = submissionQueue.enqueue(rebalance, {
            type: 'rebalance',
            priority: QueuePriority.Normal,
            estimatedDuration: rebalance.totalEligibleOrders * 100 // Rough estimate
          })
          queuedItemIds.push(queueId)
        }

        // Monitor queue progress
        const handleQueueProgress = () => {
          const queueStatus = submissionQueue.getQueueStatus()
          updateState({
            queuedItems: queueStatus.pending,
            processingItems: queueStatus.processing
          })
        }

        submissionQueue.on('item-started', handleQueueProgress)
        submissionQueue.on('item-completed', handleQueueProgress)
        submissionQueue.on('item-failed', handleQueueProgress)

        // Clean up listeners and update state
        const cleanup = () => {
          submissionQueue.off('item-started', handleQueueProgress)
          submissionQueue.off('item-completed', handleQueueProgress)
          submissionQueue.off('item-failed', handleQueueProgress)
          updateState({ isSubmitting: false })
        }

        // Set up completion handling
        let completedCount = 0
        const handleCompletion = () => {
          completedCount++
          if (completedCount >= queuedItemIds.length) {
            cleanup()
            queryClient.invalidateQueries({ queryKey: ['rebalances'] })
            queryClient.invalidateQueries({ queryKey: ['portfolios'] })
            clearSelections()
          }
        }

        submissionQueue.on('item-completed', handleCompletion)
        submissionQueue.on('item-failed', handleCompletion)

      } else {
        // Use direct processing for single items or when background processing is disabled
        const results: OrderSubmissionResult[] = []
        let batchIndex = 0

        for (const rebalance of submissionRebalances) {
          // Update progress
          updateState({
            submissionProgress: {
              currentBatch: batchIndex + 1,
              totalBatches: submissionRebalances.length,
              currentRebalance: rebalance.rebalance_id,
              currentPortfolio: undefined
            }
          })

          try {
            // Submit each portfolio in the rebalance separately to maintain portfolio context
            let rebalanceResult: OrderSubmissionResult = {
              totalOrders: 0,
              successfulOrders: 0,
              failedOrders: 0,
              errors: [],
              submittedOrderIds: [],
              failedPositions: []
            }

            for (const portfolio of rebalance.portfolios) {
              const portfolioResult = await globalRequestThrottler.throttle(
                () => orderServiceApi.submitRebalancePositions(
                  portfolio.positions,
                  portfolio.portfolio_id,
                  (progress) => {
                    updateState({
                      submissionProgress: {
                        currentBatch: batchIndex + 1,
                        totalBatches: submissionRebalances.length,
                        currentRebalance: rebalance.rebalance_id,
                        currentPortfolio: portfolio.portfolio_id
                      }
                    })
                  }
                ),
                1 // Normal priority
              )

              // Aggregate results
              rebalanceResult.totalOrders += portfolioResult.totalOrders
              rebalanceResult.successfulOrders += portfolioResult.successfulOrders
              rebalanceResult.failedOrders += portfolioResult.failedOrders
              rebalanceResult.errors.push(...portfolioResult.errors)
              rebalanceResult.submittedOrderIds.push(...portfolioResult.submittedOrderIds)
              rebalanceResult.failedPositions.push(...portfolioResult.failedPositions)
            }

            const submissionResult = rebalanceResult

            results.push(submissionResult)
            
          } catch (error) {
            console.error(`Failed to submit rebalance ${rebalance.rebalance_id}:`, error)
            // Continue with other rebalances even if one fails
            results.push({
              submissionRequestId: `failed-${rebalance.rebalance_id}`,
              rebalanceId: rebalance.rebalance_id,
              totalOrders: 0,
              successfulOrders: 0,
              failedOrders: 0,
              state: SubmissionState.Failed,
              error: error instanceof Error ? error.message : 'Unknown error',
              submittedAt: new Date(),
              processingTimeMs: 0
            })
          }

          batchIndex++
        }

        // Update final state
        updateState({
          submissionResults: results,
          submissionProgress: null
        })

        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['rebalances'] })
        queryClient.invalidateQueries({ queryKey: ['portfolios'] })

        // Clear selections after successful submission
        if (results.some(r => r.state === SubmissionState.Submitted)) {
          clearSelections()
        }
      }

    } catch (error) {
      console.error('Submission failed:', error)
      updateState({
        lastSubmissionError: error instanceof Error ? error : new Error('Unknown submission error'),
        submissionProgress: null
      })
      throw error
    } finally {
      if (!useBackgroundProcessing) {
        updateState({ isSubmitting: false })
      }
    }
  }, [state.selectedRebalanceIds, state.selectedPortfolioIds, state.backgroundProcessingEnabled, updateState, queryClient, clearSelections, submissionQueue])

  // Submission handlers
  const submitAll = useCallback(async (rebalances: RebalanceWithSubmission[]) => {
    await performSubmission(rebalances, 'all')
  }, [performSubmission])

  const submitSelectedRebalances = useCallback(async (rebalances: RebalanceWithSubmission[]) => {
    await performSubmission(rebalances, 'selected_rebalances')
  }, [performSubmission])

  const submitSelectedPortfolios = useCallback(async (rebalances: RebalanceWithSubmission[]) => {
    await performSubmission(rebalances, 'selected_portfolios')
  }, [performSubmission])

  const submitSingleRebalance = useCallback(async (rebalance: RebalanceWithSubmission) => {
    await performSubmission([rebalance], 'single_rebalance')
  }, [performSubmission])

  const submitSinglePortfolio = useCallback(async (
    portfolio: RebalancePortfolioWithSubmission, 
    rebalanceId: string
  ) => {
    // Create a temporary rebalance with just the target portfolio
    const singlePortfolioRebalance: RebalanceWithSubmission = {
      rebalance_id: rebalanceId,
      model_id: '',
      model_name: '',
      rebalance_date: '',
      version: 1,
      portfolios: [portfolio]
    }
    
    await performSubmission([singlePortfolioRebalance], 'single_portfolio')
  }, [performSubmission])

  // Deletion handlers
  const deleteSelectedRebalances = useCallback(async (rebalanceIds: string[]) => {
    try {
      updateState({ isDeleting: true, lastSubmissionError: null })
      
      // In a real implementation, this would call a deletion API
      // For now, we'll simulate the deletion and update local state
      console.log('Deleting rebalances:', rebalanceIds)
      
      // Remove from selections
      setState(prev => {
        const newRebalanceIds = new Set(prev.selectedRebalanceIds)
        rebalanceIds.forEach(id => newRebalanceIds.delete(id))
        return {
          ...prev,
          selectedRebalanceIds: newRebalanceIds
        }
      })
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['rebalances'] })
      
    } catch (error) {
      console.error('Deletion failed:', error)
      updateState({
        lastSubmissionError: error instanceof Error ? error : new Error('Unknown deletion error')
      })
      throw error
    } finally {
      updateState({ isDeleting: false })
    }
  }, [updateState, queryClient])

  const deleteSelectedPortfolios = useCallback(async (portfolioIds: string[]) => {
    try {
      updateState({ isDeleting: true, lastSubmissionError: null })
      
      console.log('Deleting portfolios:', portfolioIds)
      
      // Remove from selections
      setState(prev => {
        const newPortfolioIds = new Set(prev.selectedPortfolioIds)
        portfolioIds.forEach(id => newPortfolioIds.delete(id))
        return {
          ...prev,
          selectedPortfolioIds: newPortfolioIds
        }
      })
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      
    } catch (error) {
      console.error('Portfolio deletion failed:', error)
      updateState({
        lastSubmissionError: error instanceof Error ? error : new Error('Unknown deletion error')
      })
      throw error
    } finally {
      updateState({ isDeleting: false })
    }
  }, [updateState, queryClient])

  const deleteSingleRebalance = useCallback(async (rebalanceId: string) => {
    await deleteSelectedRebalances([rebalanceId])
  }, [deleteSelectedRebalances])

  const deleteSinglePortfolio = useCallback(async (portfolioId: string) => {
    await deleteSelectedPortfolios([portfolioId])
  }, [deleteSelectedPortfolios])

  // Utility functions
  const getSelectionStats = useCallback((rebalances: RebalanceWithSubmission[]) => {
    const totalRebalances = rebalances.length
    const totalPortfolios = rebalances.reduce((sum, r) => sum + r.portfolios.length, 0)
    const selectedRebalances = state.selectedRebalanceIds.size
    const selectedPortfolios = state.selectedPortfolioIds.size
    
    const eligibleOrders = rebalances
      .filter(r => state.selectedRebalanceIds.has(r.rebalance_id))
      .reduce((sum, r) => {
        return sum + r.portfolios
          .filter(p => state.selectedPortfolioIds.has(p.portfolio_id))
          .reduce((portfolioSum, p) => {
            return portfolioSum + p.positions.filter(pos => 
              (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') &&
              pos.trade_quantity !== 0
            ).length
          }, 0)
      }, 0)

    return {
      selectedRebalances,
      selectedPortfolios,
      eligibleOrders,
      totalRebalances,
      totalPortfolios
    }
  }, [state.selectedRebalanceIds, state.selectedPortfolioIds])

  // Background processing controls
  const enableBackgroundProcessing = useCallback((enabled: boolean) => {
    updateState({ backgroundProcessingEnabled: enabled })
  }, [updateState])

  const getQueueStatus = useCallback(() => {
    return submissionQueue.getQueueStatus()
  }, [submissionQueue])

  const resetSubmissionState = useCallback(() => {
    // Flush any pending batched operations
    selectionBatcher.flush()
    debouncedStateUpdate.flush()
    
    setState({
      selectedRebalanceIds: new Set(),
      selectedPortfolioIds: new Set(),
      isSubmitting: false,
      isDeleting: false,
      submissionProgress: null,
      queuedItems: [],
      processingItems: [],
      backgroundProcessingEnabled: true,
      submissionResults: [],
      lastSubmissionError: null
    })
  }, [selectionBatcher, debouncedStateUpdate])

  return {
    state,
    selectRebalance,
    selectPortfolio,
    selectAllRebalances,
    clearSelections,
    submitAll,
    submitSelectedRebalances,
    submitSelectedPortfolios,
    submitSingleRebalance,
    submitSinglePortfolio,
    deleteSelectedRebalances,
    deleteSelectedPortfolios,
    deleteSingleRebalance,
    deleteSinglePortfolio,
    getSelectionStats,
    enableBackgroundProcessing,
    getQueueStatus,
    resetSubmissionState
  }
} 