// State Synchronization Service for Order Submission Integration
// Handles real-time UI updates, state persistence, optimistic updates, and data refetching

import { QueryClient } from '@tanstack/react-query'
import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission
} from '@/types/rebalance'
import { SubmissionState } from '@/types/order'
import { CleanupResult } from './dataCleanupService'
import { OrderSubmissionResult } from '@/lib/api/orderService'
import { EventEmitter } from 'events'

/**
 * State synchronization configuration
 */
export interface StateSyncConfig {
  enableOptimisticUpdates: boolean
  enableStatePersistence: boolean
  enableRealTimeUpdates: boolean
  enableAutoRefetch: boolean
  persistenceKey: string
  debounceMs: number
  retryAttempts: number
  staleTimeMs: number
  localStorageQuota: number // Max bytes for localStorage
}

/**
 * Optimistic update operation
 */
export interface OptimisticUpdate {
  id: string
  type: 'SUBMISSION_START' | 'SUBMISSION_SUCCESS' | 'SUBMISSION_FAILURE' | 'CLEANUP_COMPLETE'
  entityType: 'rebalance' | 'portfolio' | 'position'
  entityIds: string[]
  timestamp: Date
  originalState?: any
  newState?: any
  rollbackFunction?: () => void
  commitFunction?: () => void
  isRolledBack: boolean
  isCommitted: boolean
}

/**
 * Persistent state data
 */
export interface PersistedState {
  submissionStates: Record<string, SubmissionState>
  expandedRebalances: string[]
  expandedPortfolios: string[]
  selectionState: {
    selectedRebalanceIds: string[]
    selectedPortfolioIds: string[]
  }
  lastSubmissionResults: OrderSubmissionResult[]
  lastCleanupResults: CleanupResult[]
  timestamp: Date
  version: string
}

/**
 * Real-time update event
 */
export interface StateUpdateEvent {
  type: 'SUBMISSION_STATE_CHANGE' | 'DATA_CLEANUP_COMPLETE' | 'OPTIMISTIC_UPDATE' | 'ROLLBACK' | 'REFETCH_COMPLETE'
  entityType: 'rebalance' | 'portfolio' | 'position' | 'global'
  entityId?: string
  newState?: any
  previousState?: any
  metadata?: Record<string, any>
  timestamp: Date
}

/**
 * Query invalidation strategy
 */
export interface InvalidationStrategy {
  immediate: string[] // Query keys to invalidate immediately
  delayed: { queryKey: string; delayMs: number }[] // Query keys to invalidate after delay
  selective: { 
    condition: (data: any) => boolean
    queryKeys: string[]
  }[] // Conditional invalidation
  backgroundRefetch: string[] // Queries to refetch in background
}

/**
 * Default state synchronization configuration
 */
const DEFAULT_STATE_SYNC_CONFIG: StateSyncConfig = {
  enableOptimisticUpdates: true,
  enableStatePersistence: true,
  enableRealTimeUpdates: true,
  enableAutoRefetch: true,
  persistenceKey: 'globeco_order_submission_state',
  debounceMs: 300,
  retryAttempts: 3,
  staleTimeMs: 5 * 60 * 1000, // 5 minutes
  localStorageQuota: 5 * 1024 * 1024 // 5MB
}

/**
 * State synchronization service
 */
export class StateSynchronizationService extends EventEmitter {
  private config: StateSyncConfig
  private queryClient: QueryClient
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private persistenceBuffer: PersistedState | null = null
  private isInitialized = false

  constructor(queryClient: QueryClient, config: Partial<StateSyncConfig> = {}) {
    super()
    this.config = { ...DEFAULT_STATE_SYNC_CONFIG, ...config }
    this.queryClient = queryClient
    this.setupEventListeners()
  }

  /**
   * Initialize the service and restore persisted state
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      if (this.config.enableStatePersistence) {
        await this.restorePersistedState()
      }

      // Clean up stale optimistic updates
      this.cleanupStaleOptimisticUpdates()

      this.isInitialized = true
      this.emit('initialized')

    } catch (error) {
      console.error('Failed to initialize state synchronization service:', error)
      throw error
    }
  }

  /**
   * Handle successful order submission with state synchronization
   */
  public async handleSuccessfulSubmission(
    submissionResult: OrderSubmissionResult,
    cleanupResult?: CleanupResult
  ): Promise<void> {
    try {
      // Emit real-time update event
      if (this.config.enableRealTimeUpdates) {
        this.emit('stateUpdate', {
          type: 'SUBMISSION_STATE_CHANGE',
          entityType: 'global',
          newState: { submissionResult, cleanupResult },
          timestamp: new Date()
        } as StateUpdateEvent)
      }

      // Process optimistic updates
      if (this.config.enableOptimisticUpdates) {
        await this.commitOptimisticUpdates(submissionResult)
      }

      // Handle data cleanup results
      if (cleanupResult) {
        await this.processCleanupResults(cleanupResult)
      }

      // Update persistent state
      if (this.config.enableStatePersistence) {
        await this.updatePersistedState({
          lastSubmissionResults: [submissionResult],
          lastCleanupResults: cleanupResult ? [cleanupResult] : []
        })
      }

      // Trigger query invalidation and refetch
      if (this.config.enableAutoRefetch) {
        await this.invalidateAndRefetchQueries(submissionResult, cleanupResult)
      }

    } catch (error) {
      console.error('Failed to handle successful submission:', error)
      throw error
    }
  }

  /**
   * Create optimistic update for submission start
   */
  public createOptimisticSubmissionUpdate(
    rebalances: RebalanceWithSubmission[],
    type: 'all' | 'selected' | 'single' = 'all'
  ): OptimisticUpdate {
    const updateId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store original states for rollback
    const originalStates = new Map()
    rebalances.forEach(rebalance => {
      originalStates.set(rebalance.rebalance_id, {
        submission: rebalance.submission,
        portfolios: rebalance.portfolios.map(p => ({
          portfolio_id: p.portfolio_id,
          submission: p.submission,
          positions: p.positions.map(pos => ({
            security_id: pos.security_id,
            submission: pos.submission
          }))
        }))
      })
    })

    // Create new optimistic states (set to submitting)
    const optimisticRebalances = rebalances.map(rebalance => ({
      ...rebalance,
      submission: SubmissionState.Submitting,
      portfolios: rebalance.portfolios.map(portfolio => ({
        ...portfolio,
        submission: SubmissionState.Submitting,
        positions: portfolio.positions.map(position => ({
          ...position,
          submission: position.isEligibleForSubmission ? SubmissionState.Submitting : position.submission
        }))
      }))
    }))

    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: 'SUBMISSION_START',
      entityType: 'rebalance',
      entityIds: rebalances.map(r => r.rebalance_id),
      timestamp: new Date(),
      originalState: Object.fromEntries(originalStates),
      newState: optimisticRebalances,
      isRolledBack: false,
      isCommitted: false,
      rollbackFunction: () => this.rollbackOptimisticUpdate(updateId),
      commitFunction: () => this.commitOptimisticUpdate(updateId)
    }

    this.optimisticUpdates.set(updateId, optimisticUpdate)

    // Apply optimistic updates to query cache
    if (this.config.enableOptimisticUpdates) {
      this.applyOptimisticUpdatesToCache(optimisticUpdate)
    }

    return optimisticUpdate
  }

  /**
   * Apply optimistic updates to React Query cache
   */
  private applyOptimisticUpdatesToCache(update: OptimisticUpdate): void {
    try {
      // Update rebalances list cache
      this.queryClient.setQueriesData(
        { queryKey: ['rebalances'] },
        (oldData: any) => {
          if (!Array.isArray(oldData?.pages)) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => {
              if (!Array.isArray(page)) return page
              
              return page.map((rebalance: any) => {
                const updatedRebalance = Array.isArray(update.newState) 
                  ? update.newState.find((r: any) => r.rebalance_id === rebalance.rebalance_id)
                  : null

                return updatedRebalance || rebalance
              })
            })
          }
        }
      )

      // Update individual rebalance caches
      update.entityIds.forEach(rebalanceId => {
        this.queryClient.setQueryData(
          ['rebalance', rebalanceId],
          (oldData: any) => {
            if (!oldData) return oldData
            
            const updatedRebalance = Array.isArray(update.newState)
              ? update.newState.find((r: any) => r.rebalance_id === rebalanceId)
              : null

            return updatedRebalance || oldData
          }
        )
      })

      // Emit real-time update event
      this.emit('stateUpdate', {
        type: 'OPTIMISTIC_UPDATE',
        entityType: update.entityType,
        entityId: update.entityIds.join(','),
        newState: update.newState,
        previousState: update.originalState,
        metadata: { updateId: update.id },
        timestamp: new Date()
      } as StateUpdateEvent)

    } catch (error) {
      console.error('Failed to apply optimistic updates to cache:', error)
    }
  }

  /**
   * Rollback optimistic update
   */
  public async rollbackOptimisticUpdate(updateId: string): Promise<void> {
    const update = this.optimisticUpdates.get(updateId)
    if (!update || update.isRolledBack) {
      return
    }

    try {
      // Restore original states to query cache
      this.queryClient.setQueriesData(
        { queryKey: ['rebalances'] },
        (oldData: any) => {
          if (!Array.isArray(oldData?.pages)) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => {
              if (!Array.isArray(page)) return page
              
              return page.map((rebalance: any) => {
                const originalState = update.originalState?.[rebalance.rebalance_id]
                if (originalState) {
                  return {
                    ...rebalance,
                    submission: originalState.submission,
                    portfolios: rebalance.portfolios?.map((portfolio: any) => {
                      const originalPortfolio = originalState.portfolios?.find(
                        (p: any) => p.portfolio_id === portfolio.portfolio_id
                      )
                      if (originalPortfolio) {
                        return {
                          ...portfolio,
                          submission: originalPortfolio.submission,
                          positions: portfolio.positions?.map((position: any) => {
                            const originalPosition = originalPortfolio.positions?.find(
                              (pos: any) => pos.security_id === position.security_id
                            )
                            return originalPosition 
                              ? { ...position, submission: originalPosition.submission }
                              : position
                          })
                        }
                      }
                      return portfolio
                    })
                  }
                }
                return rebalance
              })
            })
          }
        }
      )

      // Update individual rebalance caches
      update.entityIds.forEach(rebalanceId => {
        const originalState = update.originalState?.[rebalanceId]
        if (originalState) {
          this.queryClient.setQueryData(['rebalance', rebalanceId], originalState)
        }
      })

      // Mark as rolled back
      update.isRolledBack = true
      
      // Emit rollback event
      this.emit('stateUpdate', {
        type: 'ROLLBACK',
        entityType: update.entityType,
        entityId: update.entityIds.join(','),
        previousState: update.newState,
        newState: update.originalState,
        metadata: { updateId },
        timestamp: new Date()
      } as StateUpdateEvent)

    } catch (error) {
      console.error('Failed to rollback optimistic update:', error)
      throw error
    }
  }

  /**
   * Commit optimistic update
   */
  public async commitOptimisticUpdate(updateId: string): Promise<void> {
    const update = this.optimisticUpdates.get(updateId)
    if (!update || update.isCommitted) {
      return
    }

    try {
      // Mark as committed (optimistic state becomes reality)
      update.isCommitted = true
      
      // Clean up update from memory
      setTimeout(() => {
        this.optimisticUpdates.delete(updateId)
      }, 1000) // Keep for 1 second for any pending operations

    } catch (error) {
      console.error('Failed to commit optimistic update:', error)
      throw error
    }
  }

  /**
   * Commit optimistic updates based on submission results
   */
  private async commitOptimisticUpdates(submissionResult: OrderSubmissionResult): Promise<void> {
    const relevantUpdates = Array.from(this.optimisticUpdates.values()).filter(
      update => !update.isCommitted && !update.isRolledBack
    )

    for (const update of relevantUpdates) {
      if (submissionResult.submittedOrderIds.length > 0) {
        await this.commitOptimisticUpdate(update.id)
      } else {
        await this.rollbackOptimisticUpdate(update.id)
      }
    }
  }

  /**
   * Process cleanup results and update cache
   */
  private async processCleanupResults(cleanupResult: CleanupResult): Promise<void> {
    try {
      // Update rebalances cache with cleanup results
      if (cleanupResult.updatedRebalance) {
        // Update specific rebalance
        this.queryClient.setQueryData(
          ['rebalance', cleanupResult.updatedRebalance.rebalance_id],
          cleanupResult.updatedRebalance
        )

        // Update rebalances list
        this.queryClient.setQueriesData(
          { queryKey: ['rebalances'] },
          (oldData: any) => {
            if (!Array.isArray(oldData?.pages)) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => {
                if (!Array.isArray(page)) return page
                
                return page.map((rebalance: any) => {
                  if (rebalance.rebalance_id === cleanupResult.updatedRebalance?.rebalance_id) {
                    return cleanupResult.updatedRebalance
                  }
                  return rebalance
                })
              })
            }
          }
        )
      }

      // Remove deleted rebalances from cache
      if (cleanupResult.deletedRebalances > 0) {
        this.queryClient.setQueriesData(
          { queryKey: ['rebalances'] },
          (oldData: any) => {
            if (!Array.isArray(oldData?.pages)) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => {
                if (!Array.isArray(page)) return page
                
                // Filter out deleted rebalances (those not in preserved portfolios)
                return page.filter((rebalance: any) => 
                  cleanupResult.preservedPortfolios.some(p => 
                    p.portfolio_id && rebalance.portfolios?.some((rp: any) => rp.portfolio_id === p.portfolio_id)
                  ) || cleanupResult.updatedRebalance?.rebalance_id === rebalance.rebalance_id
                )
              })
            }
          }
        )
      }

      // Emit cleanup complete event
      this.emit('stateUpdate', {
        type: 'DATA_CLEANUP_COMPLETE',
        entityType: 'global',
        newState: cleanupResult,
        timestamp: new Date()
      } as StateUpdateEvent)

    } catch (error) {
      console.error('Failed to process cleanup results:', error)
      throw error
    }
  }

  /**
   * Invalidate and refetch queries based on submission results
   */
  private async invalidateAndRefetchQueries(
    submissionResult: OrderSubmissionResult,
    cleanupResult?: CleanupResult
  ): Promise<void> {
    try {
      const strategy = this.generateInvalidationStrategy(submissionResult, cleanupResult)

      // Immediate invalidations
      for (const queryKey of strategy.immediate) {
        await this.queryClient.invalidateQueries({ queryKey: [queryKey] })
      }

      // Delayed invalidations
      strategy.delayed.forEach(({ queryKey, delayMs }) => {
        setTimeout(() => {
          this.queryClient.invalidateQueries({ queryKey: [queryKey] })
        }, delayMs)
      })

      // Selective invalidations
      strategy.selective.forEach(({ condition, queryKeys }) => {
        queryKeys.forEach(queryKey => {
          this.queryClient.setQueriesData({ queryKey: [queryKey] }, (oldData: any) => {
            if (condition(oldData)) {
              this.queryClient.invalidateQueries({ queryKey: [queryKey] })
            }
            return oldData
          })
        })
      })

      // Background refetch
      strategy.backgroundRefetch.forEach(queryKey => {
        this.queryClient.refetchQueries({ 
          queryKey: [queryKey],
          type: 'active'
        })
      })

      // Emit refetch complete event
      this.emit('stateUpdate', {
        type: 'REFETCH_COMPLETE',
        entityType: 'global',
        metadata: { strategy },
        timestamp: new Date()
      } as StateUpdateEvent)

    } catch (error) {
      console.error('Failed to invalidate and refetch queries:', error)
    }
  }

  /**
   * Generate invalidation strategy based on submission results
   */
  private generateInvalidationStrategy(
    submissionResult: OrderSubmissionResult,
    cleanupResult?: CleanupResult
  ): InvalidationStrategy {
    const strategy: InvalidationStrategy = {
      immediate: [],
      delayed: [],
      selective: [],
      backgroundRefetch: []
    }

    // Always invalidate rebalances list
    strategy.immediate.push('rebalances')

    // If there were successful submissions, refetch portfolios and positions
    if (submissionResult.successfulOrders > 0) {
      strategy.immediate.push('rebalance-portfolios')
      strategy.delayed.push({
        queryKey: 'rebalance-portfolio-positions',
        delayMs: 1000 // Slight delay for position updates
      })
    }

    // If cleanup occurred, refetch affected entities
    if (cleanupResult) {
      if (cleanupResult.deletedRebalances > 0) {
        strategy.immediate.push('rebalances')
      }
      
      if (cleanupResult.deletedPortfolios > 0) {
        strategy.immediate.push('rebalance-portfolios')
      }
      
      if (cleanupResult.deletedPositions > 0) {
        strategy.immediate.push('rebalance-portfolio-positions')
      }
    }

    // Background refetch for related data
    strategy.backgroundRefetch.push('models') // Model data might need updating

    return strategy
  }

  /**
   * Persist state to localStorage
   */
  public async persistState(state: Partial<PersistedState>): Promise<void> {
    if (!this.config.enableStatePersistence) {
      return
    }

    try {
      const currentState = this.persistenceBuffer || await this.loadPersistedState()
      const updatedState: PersistedState = {
        ...currentState,
        ...state,
        timestamp: new Date(),
        version: '1.0'
      }

      // Check storage quota
      const stateString = JSON.stringify(updatedState)
      if (stateString.length > this.config.localStorageQuota) {
        console.warn('State too large for localStorage, truncating...')
        // Truncate large arrays
        updatedState.lastSubmissionResults = updatedState.lastSubmissionResults?.slice(-10) || []
        updatedState.lastCleanupResults = updatedState.lastCleanupResults?.slice(-5) || []
      }

      // Debounced persistence
      this.debouncedPersist(updatedState)

    } catch (error) {
      console.error('Failed to persist state:', error)
    }
  }

  /**
   * Debounced persistence to avoid excessive localStorage writes
   */
  private debouncedPersist(state: PersistedState): void {
    const key = 'persist'
    
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!)
    }

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(this.config.persistenceKey, JSON.stringify(state))
        this.persistenceBuffer = state
        this.debounceTimers.delete(key)
      } catch (error) {
        console.error('Failed to write to localStorage:', error)
      }
    }, this.config.debounceMs)

    this.debounceTimers.set(key, timer)
  }

  /**
   * Load persisted state from localStorage
   */
  private async loadPersistedState(): Promise<PersistedState> {
    const defaultState: PersistedState = {
      submissionStates: {},
      expandedRebalances: [],
      expandedPortfolios: [],
      selectionState: {
        selectedRebalanceIds: [],
        selectedPortfolioIds: []
      },
      lastSubmissionResults: [],
      lastCleanupResults: [],
      timestamp: new Date(),
      version: '1.0'
    }

    try {
      const stored = localStorage.getItem(this.config.persistenceKey)
      if (!stored) {
        return defaultState
      }

      const parsed = JSON.parse(stored) as PersistedState
      
      // Validate version compatibility
      if (parsed.version !== '1.0') {
        console.warn('Persisted state version mismatch, using defaults')
        return defaultState
      }

      // Check if state is too old
      const stateAge = Date.now() - new Date(parsed.timestamp).getTime()
      if (stateAge > this.config.staleTimeMs) {
        console.warn('Persisted state is stale, using defaults')
        return defaultState
      }

      return { ...defaultState, ...parsed }

    } catch (error) {
      console.error('Failed to load persisted state:', error)
      return defaultState
    }
  }

  /**
   * Restore persisted state to application
   */
  private async restorePersistedState(): Promise<void> {
    try {
      const persistedState = await this.loadPersistedState()
      this.persistenceBuffer = persistedState

      // Restore state would typically involve updating React state
      // This would be handled by components subscribing to this service
      this.emit('stateRestored', persistedState)

    } catch (error) {
      console.error('Failed to restore persisted state:', error)
    }
  }

  /**
   * Update persisted state
   */
  private async updatePersistedState(updates: Partial<PersistedState>): Promise<void> {
    await this.persistState(updates)
  }

  /**
   * Clean up stale optimistic updates
   */
  private cleanupStaleOptimisticUpdates(): void {
    const cutoffTime = Date.now() - (60 * 1000) // 1 minute ago
    
    for (const [id, update] of this.optimisticUpdates.entries()) {
      if (update.timestamp.getTime() < cutoffTime) {
        if (!update.isCommitted && !update.isRolledBack) {
          // Auto-rollback stale updates
          this.rollbackOptimisticUpdate(id).catch(error => {
            console.error('Failed to rollback stale optimistic update:', error)
          })
        }
        this.optimisticUpdates.delete(id)
      }
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Clean up stale updates periodically
    setInterval(() => {
      this.cleanupStaleOptimisticUpdates()
    }, 30000) // Every 30 seconds

    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Page became visible, refresh stale data
          this.queryClient.invalidateQueries({ stale: true })
        }
      })
    }

    // Handle storage events (state changes in other tabs)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.config.persistenceKey && event.newValue) {
          try {
            const newState = JSON.parse(event.newValue) as PersistedState
            this.emit('externalStateChange', newState)
          } catch (error) {
            console.error('Failed to parse external state change:', error)
          }
        }
      })
    }
  }

  /**
   * Get current optimistic updates
   */
  public getOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values())
  }

  /**
   * Get persisted state
   */
  public async getPersistedState(): Promise<PersistedState> {
    return this.persistenceBuffer || await this.loadPersistedState()
  }

  /**
   * Clear all persisted state
   */
  public clearPersistedState(): void {
    try {
      localStorage.removeItem(this.config.persistenceKey)
      this.persistenceBuffer = null
      this.emit('stateCleared')
    } catch (error) {
      console.error('Failed to clear persisted state:', error)
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<StateSyncConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  public getConfig(): StateSyncConfig {
    return { ...this.config }
  }

  /**
   * Destroy service and clean up resources
   */
  public destroy(): void {
    // Clear debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()

    // Clear optimistic updates
    this.optimisticUpdates.clear()

    // Remove event listeners
    this.removeAllListeners()

    this.isInitialized = false
  }
}

/**
 * Create a state synchronization service instance
 */
export function createStateSynchronizationService(
  queryClient: QueryClient,
  config?: Partial<StateSyncConfig>
): StateSynchronizationService {
  return new StateSynchronizationService(queryClient, config)
}

/**
 * React hook for using state synchronization service
 */
export function useStateSynchronization(queryClient: QueryClient) {
  // This would typically be implemented as a React hook
  // returning the service instance and relevant state
  const service = createStateSynchronizationService(queryClient)
  
  return {
    service,
    initialize: () => service.initialize(),
    handleSuccessfulSubmission: (result: OrderSubmissionResult, cleanup?: CleanupResult) =>
      service.handleSuccessfulSubmission(result, cleanup),
    createOptimisticUpdate: (rebalances: RebalanceWithSubmission[]) =>
      service.createOptimisticSubmissionUpdate(rebalances),
    persistState: (state: Partial<PersistedState>) => service.persistState(state),
    getPersistedState: () => service.getPersistedState(),
    clearPersistedState: () => service.clearPersistedState()
  }
}

// Export for testing and advanced usage
export { DEFAULT_STATE_SYNC_CONFIG } 