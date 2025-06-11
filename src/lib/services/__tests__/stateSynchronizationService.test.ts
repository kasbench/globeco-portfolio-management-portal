import { QueryClient } from '@tanstack/react-query'
import { 
  StateSynchronizationService,
  createStateSynchronizationService,
  StateSyncConfig,
  OptimisticUpdate,
  PersistedState,
  StateUpdateEvent,
  InvalidationStrategy,
  DEFAULT_STATE_SYNC_CONFIG
} from '../stateSynchronizationService'
import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission
} from '@/types/rebalance'
import { SubmissionState } from '@/types/order'
import { CleanupResult } from '../dataCleanupService'
import { OrderSubmissionResult } from '@/lib/api/orderService'

// Mock EventEmitter
jest.mock('events', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn()
  }))
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock document and window
Object.defineProperty(global, 'document', {
  value: {
    addEventListener: jest.fn(),
    visibilityState: 'visible'
  }
})

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn()
  }
})

// Mock data helpers
const createMockRebalance = (
  rebalanceId: string = 'rebal_001',
  submission: SubmissionState = SubmissionState.Idle
): RebalanceWithSubmission => ({
  rebalance_id: rebalanceId,
  model_id: 'model_001',
  model_name: 'Test Model',
  rebalance_date: '2024-12-28T00:00:00Z',
  version: 1,
  submission,
  portfolios: [
    {
      portfolio_id: `${rebalanceId}_port1`,
      portfolio_name: 'Test Portfolio 1',
      submission,
      positions: [
        {
          security_id: 'SEC001',
          price: 100,
          original_quantity: 1000,
          trade_quantity: 100,
          transaction_type: 'BUY',
          submission,
          isEligibleForSubmission: true
        },
        {
          security_id: 'SEC002',
          price: 50,
          original_quantity: 500,
          trade_quantity: -50,
          transaction_type: 'SELL',
          submission,
          isEligibleForSubmission: true
        }
      ]
    },
    {
      portfolio_id: `${rebalanceId}_port2`,
      portfolio_name: 'Test Portfolio 2',
      submission,
      positions: [
        {
          security_id: 'SEC003',
          price: 75,
          original_quantity: 200,
          trade_quantity: 25,
          transaction_type: 'BUY',
          submission,
          isEligibleForSubmission: true
        }
      ]
    }
  ]
})

const createMockSubmissionResult = (
  rebalanceId: string = 'rebal_001',
  successfulOrders: number = 3,
  failedOrders: number = 0
): OrderSubmissionResult => ({
  submissionRequestId: `sub_${rebalanceId}_${Date.now()}`,
  rebalanceId,
  totalOrders: successfulOrders + failedOrders,
  successfulOrders,
  failedOrders,
  submittedOrderIds: Array.from({ length: successfulOrders }, (_, i) => `order_${i + 1}`),
  failedOrderIds: Array.from({ length: failedOrders }, (_, i) => `failed_order_${i + 1}`),
  errors: failedOrders > 0 ? ['Test error'] : [],
  state: successfulOrders > 0 ? SubmissionState.Submitted : SubmissionState.Failed,
  submittedAt: new Date(),
  processingTimeMs: 1500
})

const createMockCleanupResult = (
  rebalanceId: string = 'rebal_001'
): CleanupResult => ({
  processedRebalances: 1,
  processedPortfolios: 2,
  processedPositions: 3,
  deletedRebalances: 0,
  deletedPortfolios: 0,
  deletedPositions: 3,
  preservedRebalances: [],
  preservedPortfolios: [],
  updatedRebalance: createMockRebalance(rebalanceId, SubmissionState.Submitted),
  transactionId: 'txn_001',
  isCommitted: true,
  processingTimeMs: 500,
  errors: []
})

describe('StateSynchronizationService', () => {
  let queryClient: QueryClient
  let service: StateSynchronizationService
  let mockConfig: Partial<StateSyncConfig>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    mockConfig = {
      enableOptimisticUpdates: true,
      enableStatePersistence: true,
      enableRealTimeUpdates: true,
      enableAutoRefetch: true,
      debounceMs: 0, // Disable debouncing for tests
      staleTimeMs: 60000,
      localStorageQuota: 1024 * 1024
    }

    service = new StateSynchronizationService(queryClient, mockConfig)
  })

  afterEach(() => {
    if (service) {
      service.destroy()
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      const defaultService = new StateSynchronizationService(queryClient)
      
      await expect(defaultService.initialize()).resolves.not.toThrow()
      
      const config = defaultService.getConfig()
      expect(config).toMatchObject(DEFAULT_STATE_SYNC_CONFIG)
      
      defaultService.destroy()
    })

    it('should initialize with custom config', async () => {
      const customConfig = {
        enableOptimisticUpdates: false,
        persistenceKey: 'custom_key',
        debounceMs: 500
      }
      
      const customService = new StateSynchronizationService(queryClient, customConfig)
      await customService.initialize()
      
      const config = customService.getConfig()
      expect(config.enableOptimisticUpdates).toBe(false)
      expect(config.persistenceKey).toBe('custom_key')
      expect(config.debounceMs).toBe(500)
      
      customService.destroy()
    })

    it('should restore persisted state on initialization', async () => {
      const mockPersistedState: PersistedState = {
        submissionStates: { 'rebal_001': SubmissionState.Submitted },
        expandedRebalances: ['rebal_001'],
        expandedPortfolios: ['port_001'],
        selectionState: {
          selectedRebalanceIds: ['rebal_001'],
          selectedPortfolioIds: ['port_001']
        },
        lastSubmissionResults: [],
        lastCleanupResults: [],
        timestamp: new Date(),
        version: '1.0'
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPersistedState))

      await service.initialize()

      const restoredState = await service.getPersistedState()
      expect(restoredState.submissionStates).toEqual(mockPersistedState.submissionStates)
      expect(restoredState.expandedRebalances).toEqual(mockPersistedState.expandedRebalances)
    })

    it('should not initialize twice', async () => {
      await service.initialize()
      
      // Second initialization should not throw or create issues
      await expect(service.initialize()).resolves.not.toThrow()
    })

    it('should handle corrupted persisted state gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      await expect(service.initialize()).resolves.not.toThrow()
      
      const state = await service.getPersistedState()
      expect(state.version).toBe('1.0')
      expect(state.submissionStates).toEqual({})
    })
  })

  describe('Optimistic Updates', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should create optimistic update for submission start', () => {
      const rebalances = [createMockRebalance('rebal_001', SubmissionState.Idle)]
      
      const update = service.createOptimisticSubmissionUpdate(rebalances, 'all')
      
      expect(update).toMatchObject({
        type: 'SUBMISSION_START',
        entityType: 'rebalance',
        entityIds: ['rebal_001'],
        isRolledBack: false,
        isCommitted: false
      })
      expect(update.id).toMatch(/^submission_\d+_\w{9}$/)
      expect(update.originalState).toBeDefined()
      expect(update.newState).toBeDefined()
    })

    it('should store original state for rollback', () => {
      const rebalances = [createMockRebalance('rebal_001', SubmissionState.Idle)]
      
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      expect(update.originalState).toHaveProperty('rebal_001')
      const originalRebalanceState = update.originalState['rebal_001']
      expect(originalRebalanceState.submission).toBe(SubmissionState.Idle)
      expect(originalRebalanceState.portfolios).toHaveLength(2)
    })

    it('should create optimistic states with submitting status', () => {
      const rebalances = [createMockRebalance('rebal_001', SubmissionState.Idle)]
      
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      expect(Array.isArray(update.newState)).toBe(true)
      const optimisticRebalance = update.newState[0]
      expect(optimisticRebalance.submission).toBe(SubmissionState.Submitting)
      expect(optimisticRebalance.portfolios[0].submission).toBe(SubmissionState.Submitting)
      expect(optimisticRebalance.portfolios[0].positions[0].submission).toBe(SubmissionState.Submitting)
    })

    it('should apply optimistic updates to query cache', () => {
      const setQueriesDataSpy = jest.spyOn(queryClient, 'setQueriesData')
      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData')
      
      const rebalances = [createMockRebalance('rebal_001')]
      service.createOptimisticSubmissionUpdate(rebalances)
      
      expect(setQueriesDataSpy).toHaveBeenCalledWith(
        { queryKey: ['rebalances'] },
        expect.any(Function)
      )
      expect(setQueryDataSpy).toHaveBeenCalledWith(
        ['rebalance', 'rebal_001'],
        expect.any(Function)
      )
    })

    it('should rollback optimistic update', async () => {
      const rebalances = [createMockRebalance('rebal_001', SubmissionState.Idle)]
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      await service.rollbackOptimisticUpdate(update.id)
      
      const retrievedUpdate = service.getOptimisticUpdates().find(u => u.id === update.id)
      expect(retrievedUpdate?.isRolledBack).toBe(true)
    })

    it('should commit optimistic update', async () => {
      const rebalances = [createMockRebalance('rebal_001')]
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      await service.commitOptimisticUpdate(update.id)
      
      const retrievedUpdate = service.getOptimisticUpdates().find(u => u.id === update.id)
      expect(retrievedUpdate?.isCommitted).toBe(true)
    })

    it('should not rollback already rolled back update', async () => {
      const rebalances = [createMockRebalance('rebal_001')]
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      await service.rollbackOptimisticUpdate(update.id)
      await service.rollbackOptimisticUpdate(update.id) // Second rollback
      
      // Should not throw or create issues
      expect(update.isRolledBack).toBe(true)
    })

    it('should not commit already committed update', async () => {
      const rebalances = [createMockRebalance('rebal_001')]
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      await service.commitOptimisticUpdate(update.id)
      await service.commitOptimisticUpdate(update.id) // Second commit
      
      // Should not throw or create issues
      expect(update.isCommitted).toBe(true)
    })

    it('should clean up stale optimistic updates', () => {
      // Create update with old timestamp
      const rebalances = [createMockRebalance('rebal_001')]
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      // Manually set old timestamp to simulate stale update
      update.timestamp = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      
      // Trigger cleanup (normally done automatically)
      service['cleanupStaleOptimisticUpdates']()
      
      // Update should be cleaned up
      const updates = service.getOptimisticUpdates()
      expect(updates.find(u => u.id === update.id)).toBeUndefined()
    })
  })

  describe('State Persistence', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should persist state to localStorage', async () => {
      const stateUpdate: Partial<PersistedState> = {
        submissionStates: { 'rebal_001': SubmissionState.Submitted },
        expandedRebalances: ['rebal_001']
      }

      await service.persistState(stateUpdate)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        mockConfig.persistenceKey || DEFAULT_STATE_SYNC_CONFIG.persistenceKey,
        expect.stringContaining('rebal_001')
      )
    })

    it('should load persisted state from localStorage', async () => {
      const mockState: PersistedState = {
        submissionStates: { 'rebal_001': SubmissionState.Submitted },
        expandedRebalances: ['rebal_001'],
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

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockState))

      const loadedState = await service.getPersistedState()

      expect(loadedState.submissionStates).toEqual(mockState.submissionStates)
      expect(loadedState.expandedRebalances).toEqual(mockState.expandedRebalances)
    })

    it('should clear persisted state', () => {
      service.clearPersistedState()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        mockConfig.persistenceKey || DEFAULT_STATE_SYNC_CONFIG.persistenceKey
      )
    })

    it('should handle localStorage quota exceeded', async () => {
      // Create large state that exceeds quota
      const largeState: Partial<PersistedState> = {
        lastSubmissionResults: Array.from({ length: 1000 }, (_, i) => 
          createMockSubmissionResult(`rebal_${i}`)
        )
      }

      // Should not throw despite large size
      await expect(service.persistState(largeState)).resolves.not.toThrow()
    })

    it('should reject stale persisted state', async () => {
      const staleState: PersistedState = {
        submissionStates: { 'rebal_001': SubmissionState.Submitted },
        expandedRebalances: ['rebal_001'],
        expandedPortfolios: [],
        selectionState: {
          selectedRebalanceIds: [],
          selectedPortfolioIds: []
        },
        lastSubmissionResults: [],
        lastCleanupResults: [],
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        version: '1.0'
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(staleState))

      const loadedState = await service.getPersistedState()

      // Should return default state instead of stale state
      expect(loadedState.submissionStates).toEqual({})
      expect(loadedState.expandedRebalances).toEqual([])
    })

    it('should reject incompatible version', async () => {
      const incompatibleState = {
        submissionStates: { 'rebal_001': SubmissionState.Submitted },
        version: '0.9' // Incompatible version
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(incompatibleState))

      const loadedState = await service.getPersistedState()

      // Should return default state
      expect(loadedState.submissionStates).toEqual({})
      expect(loadedState.version).toBe('1.0')
    })
  })

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should emit state update events', async () => {
      const emitSpy = jest.spyOn(service, 'emit')
      
      const submissionResult = createMockSubmissionResult('rebal_001')
      const cleanupResult = createMockCleanupResult('rebal_001')

      await service.handleSuccessfulSubmission(submissionResult, cleanupResult)

      expect(emitSpy).toHaveBeenCalledWith(
        'stateUpdate',
        expect.objectContaining({
          type: 'SUBMISSION_STATE_CHANGE',
          entityType: 'global',
          timestamp: expect.any(Date)
        })
      )
    })

    it('should emit optimistic update events', () => {
      const emitSpy = jest.spyOn(service, 'emit')
      
      const rebalances = [createMockRebalance('rebal_001')]
      service.createOptimisticSubmissionUpdate(rebalances)

      expect(emitSpy).toHaveBeenCalledWith(
        'stateUpdate',
        expect.objectContaining({
          type: 'OPTIMISTIC_UPDATE',
          entityType: 'rebalance'
        })
      )
    })

    it('should emit rollback events', async () => {
      const emitSpy = jest.spyOn(service, 'emit')
      
      const rebalances = [createMockRebalance('rebal_001')]
      const update = service.createOptimisticSubmissionUpdate(rebalances)
      
      await service.rollbackOptimisticUpdate(update.id)

      expect(emitSpy).toHaveBeenCalledWith(
        'stateUpdate',
        expect.objectContaining({
          type: 'ROLLBACK',
          entityType: 'rebalance'
        })
      )
    })

    it('should emit cleanup complete events', async () => {
      const emitSpy = jest.spyOn(service, 'emit')
      
      const submissionResult = createMockSubmissionResult('rebal_001')
      const cleanupResult = createMockCleanupResult('rebal_001')

      await service.handleSuccessfulSubmission(submissionResult, cleanupResult)

      expect(emitSpy).toHaveBeenCalledWith(
        'stateUpdate',
        expect.objectContaining({
          type: 'DATA_CLEANUP_COMPLETE',
          entityType: 'global'
        })
      )
    })
  })

  describe('Query Invalidation and Refetching', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should invalidate queries after successful submission', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
      
      const submissionResult = createMockSubmissionResult('rebal_001', 3, 0)
      await service.handleSuccessfulSubmission(submissionResult)

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['rebalances'] })
    })

    it('should generate appropriate invalidation strategy', () => {
      const submissionResult = createMockSubmissionResult('rebal_001', 3, 0)
      const cleanupResult = createMockCleanupResult('rebal_001')

      const strategy = service['generateInvalidationStrategy'](submissionResult, cleanupResult)

      expect(strategy.immediate).toContain('rebalances')
      expect(strategy.backgroundRefetch).toContain('models')
      expect(strategy.delayed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            queryKey: 'rebalance-portfolio-positions',
            delayMs: 1000
          })
        ])
      )
    })

    it('should refetch queries in background', async () => {
      const refetchQueriesSpy = jest.spyOn(queryClient, 'refetchQueries')
      
      const submissionResult = createMockSubmissionResult('rebal_001', 3, 0)
      await service.handleSuccessfulSubmission(submissionResult)

      expect(refetchQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['models'],
        type: 'active'
      })
    })

    it('should handle delayed invalidations', async () => {
      jest.useFakeTimers()
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
      
      const submissionResult = createMockSubmissionResult('rebal_001', 3, 0)
      await service.handleSuccessfulSubmission(submissionResult)

      // Fast-forward time to trigger delayed invalidations
      jest.advanceTimersByTime(1500)

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: ['rebalance-portfolio-positions'] 
      })

      jest.useRealTimers()
    })
  })

  describe('Cache Updates', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should update cache with cleanup results', async () => {
      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData')
      const setQueriesDataSpy = jest.spyOn(queryClient, 'setQueriesData')
      
      const submissionResult = createMockSubmissionResult('rebal_001')
      const cleanupResult = createMockCleanupResult('rebal_001')

      await service.handleSuccessfulSubmission(submissionResult, cleanupResult)

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        ['rebalance', 'rebal_001'],
        cleanupResult.updatedRebalance
      )
      expect(setQueriesDataSpy).toHaveBeenCalledWith(
        { queryKey: ['rebalances'] },
        expect.any(Function)
      )
    })

    it('should filter deleted rebalances from cache', async () => {
      const setQueriesDataSpy = jest.spyOn(queryClient, 'setQueriesData')
      
      const submissionResult = createMockSubmissionResult('rebal_001')
      const cleanupResult: CleanupResult = {
        ...createMockCleanupResult('rebal_001'),
        deletedRebalances: 1,
        preservedPortfolios: []
      }

      await service.handleSuccessfulSubmission(submissionResult, cleanupResult)

      expect(setQueriesDataSpy).toHaveBeenCalledWith(
        { queryKey: ['rebalances'] },
        expect.any(Function)
      )
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<StateSyncConfig> = {
        enableOptimisticUpdates: false,
        debounceMs: 1000
      }

      service.updateConfig(newConfig)

      const config = service.getConfig()
      expect(config.enableOptimisticUpdates).toBe(false)
      expect(config.debounceMs).toBe(1000)
    })

    it('should return current configuration', () => {
      const config = service.getConfig()

      expect(config).toEqual(expect.objectContaining(mockConfig))
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      await expect(service.persistState({ 
        submissionStates: { 'test': SubmissionState.Submitted } 
      })).resolves.not.toThrow()
    })

    it('should handle query invalidation errors gracefully', async () => {
      jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('Network error'))

      const submissionResult = createMockSubmissionResult('rebal_001')
      
      await expect(service.handleSuccessfulSubmission(submissionResult)).resolves.not.toThrow()
    })

    it('should handle optimistic update errors gracefully', async () => {
      jest.spyOn(queryClient, 'setQueriesData').mockImplementation(() => {
        throw new Error('Cache error')
      })

      const rebalances = [createMockRebalance('rebal_001')]
      
      expect(() => service.createOptimisticSubmissionUpdate(rebalances)).not.toThrow()
    })
  })

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      const removeAllListenersSpy = jest.spyOn(service, 'removeAllListeners')

      service.destroy()

      expect(removeAllListenersSpy).toHaveBeenCalled()
      // Note: clearTimeout might be called multiple times depending on active timers
    })

    it('should handle multiple destroy calls gracefully', () => {
      service.destroy()
      service.destroy() // Second destroy

      // Should not throw
      expect(service['isInitialized']).toBe(false)
    })
  })

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should handle complete submission workflow', async () => {
      // 1. Create optimistic update
      const rebalances = [createMockRebalance('rebal_001', SubmissionState.Idle)]
      const optimisticUpdate = service.createOptimisticSubmissionUpdate(rebalances)

      expect(optimisticUpdate.isCommitted).toBe(false)
      expect(optimisticUpdate.isRolledBack).toBe(false)

      // 2. Handle successful submission
      const submissionResult = createMockSubmissionResult('rebal_001', 3, 0)
      const cleanupResult = createMockCleanupResult('rebal_001')

      await service.handleSuccessfulSubmission(submissionResult, cleanupResult)

      // 3. Verify optimistic update was committed
      expect(optimisticUpdate.isCommitted).toBe(true)
    })

    it('should handle failed submission with rollback', async () => {
      // 1. Create optimistic update
      const rebalances = [createMockRebalance('rebal_001')]
      const optimisticUpdate = service.createOptimisticSubmissionUpdate(rebalances)

      // 2. Handle failed submission (no submitted orders)
      const submissionResult = createMockSubmissionResult('rebal_001', 0, 3)
      await service.handleSuccessfulSubmission(submissionResult)

      // 3. Verify optimistic update was rolled back
      expect(optimisticUpdate.isRolledBack).toBe(true)
    })

    it('should persist state across initialization cycles', async () => {
      // 1. Persist some state
      const stateUpdate: Partial<PersistedState> = {
        submissionStates: { 'rebal_001': SubmissionState.Submitted },
        expandedRebalances: ['rebal_001']
      }
      await service.persistState(stateUpdate)

      // 2. Destroy and recreate service
      service.destroy()
      
      // Mock localStorage to return the persisted state
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        ...stateUpdate,
        timestamp: new Date(),
        version: '1.0',
        expandedPortfolios: [],
        selectionState: { selectedRebalanceIds: [], selectedPortfolioIds: [] },
        lastSubmissionResults: [],
        lastCleanupResults: []
      }))

      const newService = new StateSynchronizationService(queryClient, mockConfig)
      await newService.initialize()

      // 3. Verify state was restored
      const restoredState = await newService.getPersistedState()
      expect(restoredState.submissionStates).toEqual(stateUpdate.submissionStates)
      expect(restoredState.expandedRebalances).toEqual(stateUpdate.expandedRebalances)

      newService.destroy()
    })
  })
})

describe('StateSynchronizationService Factory Functions', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
  })

  describe('createStateSynchronizationService', () => {
    it('should create service instance with default config', () => {
      const service = createStateSynchronizationService(queryClient)

      expect(service).toBeInstanceOf(StateSynchronizationService)
      expect(service.getConfig()).toEqual(DEFAULT_STATE_SYNC_CONFIG)

      service.destroy()
    })

    it('should create service instance with custom config', () => {
      const customConfig: Partial<StateSyncConfig> = {
        enableOptimisticUpdates: false,
        persistenceKey: 'custom_key'
      }

      const service = createStateSynchronizationService(queryClient, customConfig)

      const config = service.getConfig()
      expect(config.enableOptimisticUpdates).toBe(false)
      expect(config.persistenceKey).toBe('custom_key')

      service.destroy()
    })
  })

  describe('useStateSynchronization', () => {
    it('should return service utilities', () => {
      const mockHook = require('../stateSynchronizationService').useStateSynchronization
      const result = mockHook(queryClient)

      expect(result).toHaveProperty('service')
      expect(result).toHaveProperty('initialize')
      expect(result).toHaveProperty('handleSuccessfulSubmission')
      expect(result).toHaveProperty('createOptimisticUpdate')
      expect(result).toHaveProperty('persistState')
      expect(result).toHaveProperty('getPersistedState')
      expect(result).toHaveProperty('clearPersistedState')

      expect(typeof result.initialize).toBe('function')
      expect(typeof result.handleSuccessfulSubmission).toBe('function')
      expect(typeof result.createOptimisticUpdate).toBe('function')

      result.service.destroy()
    })
  })
}) 