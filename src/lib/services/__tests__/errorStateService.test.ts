/**
 * Error State Service Tests
 * 
 * Comprehensive test suite for error state management functionality
 * 
 * Part of KASBench GlobeCo Portfolio Management Portal
 * Stage 4.3: Error State Management
 */

import { 
  ErrorStateService, 
  getErrorStateService, 
  resetErrorStateService,
  SubmissionError,
  PartialSuccessResult,
  ErrorAnnotation,
  ErrorRecoveryOptions,
  ErrorCleanupConfig,
  ErrorStateMetrics
} from '../errorStateService'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

// Mock timers
jest.useFakeTimers()

// Set up mocks
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('ErrorStateService', () => {
  let errorService: ErrorStateService
  let mockConfig: Partial<ErrorCleanupConfig>

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear()
    jest.clearAllMocks()
    
    // Reset singleton
    resetErrorStateService()

    // Mock configuration for testing
    mockConfig = {
      maxErrorAge: 60000, // 1 minute for testing
      maxRetryAge: 30000, // 30 seconds for testing
      cleanupInterval: 10000, // 10 seconds for testing
      maxErrorsPerEntity: 5,
      enableAutoCleanup: false // Disable for controlled testing
    }

    errorService = new ErrorStateService(mockConfig)
  })

  afterEach(() => {
    errorService.destroy()
    jest.clearAllTimers()
  })

  // ============================================================================
  // Error Registration Tests
  // ============================================================================

  describe('Error Registration', () => {
    test('should add error with generated ID and timestamp', () => {
      const errorData = {
        level: 'portfolio' as const,
        entityId: 'portfolio_123',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid portfolio data',
        technicalDetails: 'Missing required field: cash_balance',
        retryable: true,
        retryCount: 0
      }

      const errorId = errorService.addError(errorData)

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/)
      
      const retrievedError = errorService.getError(errorId)
      expect(retrievedError).toBeDefined()
      expect(retrievedError!.level).toBe('portfolio')
      expect(retrievedError!.entityId).toBe('portfolio_123')
      expect(retrievedError!.errorCode).toBe('VALIDATION_ERROR')
      expect(retrievedError!.userMessage).toContain('Some order data is invalid')
      expect(retrievedError!.suggestedAction).toContain('Review the position details')
      expect(retrievedError!.timestamp).toBeInstanceOf(Date)
    })

    test('should create entity annotation when adding error', () => {
      const errorData = {
        level: 'position' as const,
        entityId: 'position_456',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        retryCount: 0
      }

      errorService.addError(errorData)
      
      const annotation = errorService.getEntityAnnotation('position_456')
      expect(annotation).toBeDefined()
      expect(annotation!.entityId).toBe('position_456')
      expect(annotation!.entityType).toBe('position')
      expect(annotation!.errors).toHaveLength(1)
      expect(annotation!.isRetryable).toBe(true)
      expect(annotation!.errorCount).toBe(1)
    })

    test('should handle unknown error codes with default messages', () => {
      const errorData = {
        level: 'rebalance' as const,
        entityId: 'rebalance_789',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Something went wrong',
        retryable: false,
        retryCount: 0
      }

      const errorId = errorService.addError(errorData)
      const error = errorService.getError(errorId)
      
      expect(error!.userMessage).toBe('An unexpected error occurred during submission.')
      expect(error!.suggestedAction).toContain('Please try again or contact support')
    })

    test('should emit errorAdded event', () => {
      const eventSpy = jest.fn()
      errorService.on('errorAdded', eventSpy)

      const errorData = {
        level: 'global' as const,
        entityId: 'global_operation',
        errorCode: 'SERVICE_UNAVAILABLE',
        errorMessage: 'Service down',
        retryable: true,
        retryCount: 0
      }

      errorService.addError(errorData)
      
      expect(eventSpy).toHaveBeenCalledTimes(1)
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        level: 'global',
        entityId: 'global_operation',
        errorCode: 'SERVICE_UNAVAILABLE'
      }))
    })
  })

  // ============================================================================
  // Partial Success Tests
  // ============================================================================

  describe('Partial Success Handling', () => {
    test('should record partial success with calculated success rate', () => {
      const errors: SubmissionError[] = [
        {
          id: 'error_1',
          timestamp: new Date(),
          level: 'position',
          entityId: 'pos_1',
          errorCode: 'TIMEOUT_ERROR',
          errorMessage: 'Request timed out',
          retryable: true,
          retryCount: 0,
          userMessage: 'Request timed out',
          suggestedAction: 'Try again'
        },
        {
          id: 'error_2',
          timestamp: new Date(),
          level: 'position',
          entityId: 'pos_2',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid data',
          retryable: false,
          retryCount: 0,
          userMessage: 'Invalid data',
          suggestedAction: 'Review data'
        }
      ]

      const partialResultData = {
        level: 'portfolio' as const,
        entityId: 'portfolio_123',
        successCount: 8,
        failureCount: 2,
        totalCount: 10,
        errors,
        completedIds: ['pos_3', 'pos_4', 'pos_5', 'pos_6', 'pos_7', 'pos_8', 'pos_9', 'pos_10'],
        failedIds: ['pos_1', 'pos_2']
      }

      const resultId = errorService.recordPartialSuccess(partialResultData)
      
      expect(resultId).toMatch(/^result_\d+_[a-z0-9]+$/)
      
      const results = errorService.getPartialResults()
      expect(results).toHaveLength(1)
      
      const result = results[0]
      expect(result.successRate).toBe(0.8) // 8/10
      expect(result.successCount).toBe(8)
      expect(result.failureCount).toBe(2)
      expect(result.errors).toHaveLength(2)
    })

    test('should handle zero total count gracefully', () => {
      const partialResultData = {
        level: 'rebalance' as const,
        entityId: 'rebalance_456',
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
        errors: [],
        completedIds: [],
        failedIds: []
      }

      const resultId = errorService.recordPartialSuccess(partialResultData)
      const results = errorService.getPartialResults()
      
      expect(results[0].successRate).toBe(0)
    })

    test('should emit partialSuccess event', () => {
      const eventSpy = jest.fn()
      errorService.on('partialSuccess', eventSpy)

      const partialResultData = {
        level: 'portfolio' as const,
        entityId: 'portfolio_789',
        successCount: 5,
        failureCount: 1,
        totalCount: 6,
        errors: [],
        completedIds: ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5'],
        failedIds: ['pos_6']
      }

      errorService.recordPartialSuccess(partialResultData)
      
      expect(eventSpy).toHaveBeenCalledTimes(1)
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        level: 'portfolio',
        entityId: 'portfolio_789',
        successRate: 5/6
      }))
    })
  })

  // ============================================================================
  // Error Retrieval Tests
  // ============================================================================

  describe('Error Retrieval', () => {
    beforeEach(() => {
      // Add test errors
      errorService.addError({
        level: 'position',
        entityId: 'pos_1',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        retryCount: 0
      })

      errorService.addError({
        level: 'position',
        entityId: 'pos_1',
        errorCode: 'TIMEOUT_ERROR',
        errorMessage: 'Request timed out',
        retryable: true,
        retryCount: 1
      })

      errorService.addError({
        level: 'portfolio',
        entityId: 'portfolio_1',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid data',
        retryable: false,
        retryCount: 0
      })

      errorService.addError({
        level: 'rebalance',
        entityId: 'rebalance_1',
        errorCode: 'SERVICE_UNAVAILABLE',
        errorMessage: 'Service down',
        retryable: true,
        retryCount: 2
      })
    })

    test('should retrieve errors for specific entity', () => {
      const entityErrors = errorService.getErrorsForEntity('pos_1')
      
      expect(entityErrors).toHaveLength(2)
      expect(entityErrors.every(e => e.entityId === 'pos_1')).toBe(true)
    })

    test('should retrieve retryable errors only', () => {
      const retryableErrors = errorService.getRetryableErrors()
      
      expect(retryableErrors).toHaveLength(3)
      expect(retryableErrors.every(e => e.retryable)).toBe(true)
    })

    test('should retrieve errors by level', () => {
      const positionErrors = errorService.getErrorsByLevel('position')
      const portfolioErrors = errorService.getErrorsByLevel('portfolio')
      const rebalanceErrors = errorService.getErrorsByLevel('rebalance')
      
      expect(positionErrors).toHaveLength(2)
      expect(portfolioErrors).toHaveLength(1)
      expect(rebalanceErrors).toHaveLength(1)
    })

    test('should retrieve entity annotations', () => {
      const annotation = errorService.getEntityAnnotation('pos_1')
      
      expect(annotation).toBeDefined()
      expect(annotation!.entityId).toBe('pos_1')
      expect(annotation!.entityType).toBe('position')
      expect(annotation!.errors).toHaveLength(2)
      expect(annotation!.isRetryable).toBe(true)
      expect(annotation!.errorCount).toBe(2)
    })

    test('should retrieve all annotations', () => {
      const annotations = errorService.getAllAnnotations()
      
      expect(annotations).toHaveLength(3) // pos_1, portfolio_1, rebalance_1
      expect(annotations.map(a => a.entityId).sort()).toEqual(['pos_1', 'portfolio_1', 'rebalance_1'])
    })
  })

  // ============================================================================
  // Error Metrics Tests
  // ============================================================================

  describe('Error Metrics', () => {
    beforeEach(() => {
      // Add test errors with different characteristics
      errorService.addError({
        level: 'position',
        entityId: 'pos_1',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        retryCount: 2
      })

      errorService.addError({
        level: 'portfolio',
        entityId: 'portfolio_1',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid data',
        retryable: false,
        retryCount: 0
      })

      errorService.addError({
        level: 'rebalance',
        entityId: 'rebalance_1',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        retryCount: 1
      })

      // Add an old error
      const oldError = {
        level: 'global' as const,
        entityId: 'global_1',
        errorCode: 'TIMEOUT_ERROR',
        errorMessage: 'Old timeout',
        retryable: true,
        retryCount: 0
      }
      const errorId = errorService.addError(oldError)
      const error = errorService.getError(errorId)!
      error.timestamp = new Date(Date.now() - 70000) // 70 seconds ago (stale)
    })

    test('should calculate comprehensive error metrics', () => {
      const metrics = errorService.getErrorMetrics()
      
      expect(metrics.totalErrors).toBe(4)
      expect(metrics.retryableErrors).toBe(3)
      expect(metrics.nonRetryableErrors).toBe(1)
      expect(metrics.staleErrors).toBe(1) // The old error
      
      expect(metrics.errorsByLevel).toEqual({
        position: 1,
        portfolio: 1,
        rebalance: 1,
        global: 1
      })
      
      expect(metrics.errorsByCode).toEqual({
        NETWORK_ERROR: 2,
        VALIDATION_ERROR: 1,
        TIMEOUT_ERROR: 1
      })
      
      expect(metrics.averageRetryCount).toBe(0.75) // (2+0+1+0)/4
      expect(metrics.oldestError).toBeInstanceOf(Date)
      expect(metrics.newestError).toBeInstanceOf(Date)
    })

    test('should handle empty metrics gracefully', () => {
      const emptyService = new ErrorStateService()
      const metrics = emptyService.getErrorMetrics()
      
      expect(metrics.totalErrors).toBe(0)
      expect(metrics.retryableErrors).toBe(0)
      expect(metrics.nonRetryableErrors).toBe(0)
      expect(metrics.staleErrors).toBe(0)
      expect(metrics.errorsByLevel).toEqual({})
      expect(metrics.errorsByCode).toEqual({})
      expect(metrics.averageRetryCount).toBe(0)
      expect(metrics.oldestError).toBeUndefined()
      expect(metrics.newestError).toBeUndefined()
      
      emptyService.destroy()
    })
  })

  // ============================================================================
  // Retry and Recovery Tests
  // ============================================================================

  describe('Error Recovery', () => {
    let errorIds: string[]

    beforeEach(() => {
      errorIds = []
      
      // Add retryable errors
      errorIds.push(errorService.addError({
        level: 'position',
        entityId: 'pos_1',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Connection failed',
        retryable: true,
        retryCount: 0
      }))

      errorIds.push(errorService.addError({
        level: 'position',
        entityId: 'pos_2',
        errorCode: 'TIMEOUT_ERROR',
        errorMessage: 'Request timed out',
        retryable: true,
        retryCount: 2 // High retry count
      }))

      // Add non-retryable error
      errorIds.push(errorService.addError({
        level: 'portfolio',
        entityId: 'portfolio_1',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid data',
        retryable: false,
        retryCount: 0
      }))
    })

    test('should increment retry count', () => {
      const errorId = errorIds[0]
      const originalError = errorService.getError(errorId)!
      
      const success = errorService.incrementRetryCount(errorId)
      
      expect(success).toBe(true)
      
      const updatedError = errorService.getError(errorId)!
      expect(updatedError.retryCount).toBe(originalError.retryCount + 1)
      expect(updatedError.lastRetryAt).toBeInstanceOf(Date)
    })

    test('should handle retry attempts with various options', async () => {
      const retryOptions: ErrorRecoveryOptions = {
        retryFailedOnly: true,
        excludeNonRetryable: true,
        maxRetryAttempts: 2,
        retryDelay: 100,
        batchSize: 10
      }

      const result = await errorService.retryErrors(errorIds, retryOptions)
      
      expect(result.attempted).toHaveLength(1) // Only pos_1 (retryCount=0 < maxRetryAttempts=2)
      expect(result.skipped).toHaveLength(2) // pos_2 (too many retries) and portfolio_1 (non-retryable)
      expect(result.errors).toHaveLength(0)
    })

    test('should emit retry events', () => {
      const retrySpy = jest.fn()
      errorService.on('errorRetried', retrySpy)

      errorService.incrementRetryCount(errorIds[0])
      
      expect(retrySpy).toHaveBeenCalledTimes(1)
      expect(retrySpy).toHaveBeenCalledWith(expect.objectContaining({
        errorId: errorIds[0]
      }))
    })

    test('should resolve individual errors', () => {
      const errorId = errorIds[0]
      const resolveSpy = jest.fn()
      errorService.on('errorResolved', resolveSpy)
      
      const success = errorService.resolveError(errorId)
      
      expect(success).toBe(true)
      expect(errorService.getError(errorId)).toBeUndefined()
      expect(resolveSpy).toHaveBeenCalledTimes(1)
    })

    test('should resolve all errors for entity', () => {
      // Add another error for pos_1
      errorService.addError({
        level: 'position',
        entityId: 'pos_1',
        errorCode: 'TIMEOUT_ERROR',
        errorMessage: 'Another timeout',
        retryable: true,
        retryCount: 0
      })

      const resolvedCount = errorService.resolveErrorsForEntity('pos_1')
      
      expect(resolvedCount).toBe(2) // Both errors for pos_1
      expect(errorService.getErrorsForEntity('pos_1')).toHaveLength(0)
    })
  })

  // ============================================================================
  // Cleanup Operations Tests
  // ============================================================================

  describe('Cleanup Operations', () => {
    beforeEach(() => {
      // Add errors with different ages
      const recentErrorId = errorService.addError({
        level: 'position',
        entityId: 'pos_recent',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Recent error',
        retryable: true,
        retryCount: 0
      })

      const oldErrorId = errorService.addError({
        level: 'position',
        entityId: 'pos_old',
        errorCode: 'TIMEOUT_ERROR',
        errorMessage: 'Old error',
        retryable: true,
        retryCount: 1
      })

      // Make one error old
      const oldError = errorService.getError(oldErrorId)!
      oldError.timestamp = new Date(Date.now() - 70000) // 70 seconds ago (stale)
      oldError.lastRetryAt = new Date(Date.now() - 40000) // 40 seconds ago (also stale)

      // Add partial result
      errorService.recordPartialSuccess({
        level: 'portfolio',
        entityId: 'portfolio_old',
        successCount: 5,
        failureCount: 1,
        totalCount: 6,
        errors: [],
        completedIds: ['1', '2', '3', '4', '5'],
        failedIds: ['6']
      })
    })

    test('should perform stale cleanup', () => {
      const cleanupSpy = jest.fn()
      errorService.on('cleanupCompleted', cleanupSpy)
      
      const result = errorService.performStaleCleanup()
      
      expect(result.removedErrors).toBe(1) // The old error
      expect(result.removedResults).toBe(0) // Partial result is not old enough
      expect(result.cleanedAnnotations).toBe(1) // Annotation for pos_old should be cleaned
      
      expect(cleanupSpy).toHaveBeenCalledWith(result)
    })

    test('should clear all errors', () => {
      const clearSpy = jest.fn()
      errorService.on('allErrorsCleared', clearSpy)
      
      errorService.clearAllErrors()
      
      expect(errorService.getErrorMetrics().totalErrors).toBe(0)
      expect(errorService.getPartialResults()).toHaveLength(0)
      expect(errorService.getAllAnnotations()).toHaveLength(0)
      
      expect(clearSpy).toHaveBeenCalledWith(expect.objectContaining({
        errorCount: expect.any(Number),
        resultCount: expect.any(Number),
        annotationCount: expect.any(Number)
      }))
    })

    test('should limit errors per entity during cleanup', () => {
      // Add many errors for the same entity
      for (let i = 0; i < 10; i++) {
        errorService.addError({
          level: 'position',
          entityId: 'pos_many_errors',
          errorCode: 'NETWORK_ERROR',
          errorMessage: `Error ${i}`,
          retryable: true,
          retryCount: 0
        })
      }

      const annotation = errorService.getEntityAnnotation('pos_many_errors')
      expect(annotation!.errors.length).toBeLessThanOrEqual(5) // maxErrorsPerEntity = 5
    })
  })

  // ============================================================================
  // Persistence Tests
  // ============================================================================

  describe('Persistence', () => {
    test('should persist errors to localStorage', () => {
      const errorData = {
        level: 'portfolio' as const,
        entityId: 'portfolio_persist',
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Persist test',
        retryable: true,
        retryCount: 1
      }

      errorService.addError(errorData)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'globeco_error_states',
        expect.stringContaining('portfolio_persist')
      )
    })

    test('should load persisted errors on initialization', () => {
      // Prepare persisted data
      const persistedData = {
        errors: {
          'error_123': {
            id: 'error_123',
            timestamp: new Date().toISOString(),
            level: 'position',
            entityId: 'pos_persisted',
            errorCode: 'NETWORK_ERROR',
            errorMessage: 'Persisted error',
            retryable: true,
            retryCount: 2,
            userMessage: 'Network failed',
            suggestedAction: 'Retry'
          }
        },
        partialResults: {},
        annotations: {}
      }

      localStorageMock.setItem('globeco_error_states', JSON.stringify(persistedData))
      
      // Create new service instance to trigger loading
      const newService = new ErrorStateService(mockConfig)
      
      // Allow async initialization
      jest.runAllTimers()
      
      const loadedError = newService.getError('error_123')
      expect(loadedError).toBeDefined()
      expect(loadedError!.entityId).toBe('pos_persisted')
      expect(loadedError!.retryCount).toBe(2)
      
      newService.destroy()
    })

    test('should handle persistence errors gracefully', () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // This should not throw
      errorService.addError({
        level: 'position',
        entityId: 'pos_fail_persist',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Failed to persist',
        retryable: true,
        retryCount: 0
      })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist error:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Singleton Factory Tests
  // ============================================================================

  describe('Singleton Factory', () => {
    test('should return same instance from getErrorStateService', () => {
      resetErrorStateService()
      
      const instance1 = getErrorStateService()
      const instance2 = getErrorStateService()
      
      expect(instance1).toBe(instance2)
      
      instance1.destroy()
    })

    test('should create new instance after reset', () => {
      resetErrorStateService()
      
      const instance1 = getErrorStateService()
      instance1.destroy()
      resetErrorStateService()
      
      const instance2 = getErrorStateService()
      
      expect(instance1).not.toBe(instance2)
      
      instance2.destroy()
    })

    test('should pass config to singleton instance', () => {
      resetErrorStateService()
      
      const customConfig = { maxErrorAge: 120000 }
      const instance = getErrorStateService(customConfig)
      
      // Test that config is applied (indirectly through behavior)
      expect(instance).toBeDefined()
      
      instance.destroy()
    })
  })

  // ============================================================================
  // Auto Cleanup Timer Tests  
  // ============================================================================

  describe('Auto Cleanup Timer', () => {
    test('should start cleanup timer when auto cleanup enabled', () => {
      const autoCleanupService = new ErrorStateService({
        ...mockConfig,
        enableAutoCleanup: true,
        cleanupInterval: 5000
      })

      const cleanupSpy = jest.spyOn(autoCleanupService, 'performStaleCleanup')
      
      // Fast forward time
      jest.advanceTimersByTime(5000)
      
      expect(cleanupSpy).toHaveBeenCalledTimes(1)
      
      autoCleanupService.destroy()
    })

    test('should not start timer when auto cleanup disabled', () => {
      const manualCleanupService = new ErrorStateService({
        ...mockConfig,
        enableAutoCleanup: false
      })

      const cleanupSpy = jest.spyOn(manualCleanupService, 'performStaleCleanup')
      
      // Fast forward time
      jest.advanceTimersByTime(10000)
      
      expect(cleanupSpy).not.toHaveBeenCalled()
      
      manualCleanupService.destroy()
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Scenarios', () => {
    test('should handle complete error lifecycle', () => {
      // 1. Add error
      const errorId = errorService.addError({
        level: 'position',
        entityId: 'pos_lifecycle',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Network failed',
        retryable: true,
        retryCount: 0
      })

      // 2. Verify error exists
      expect(errorService.getError(errorId)).toBeDefined()
      expect(errorService.getEntityAnnotation('pos_lifecycle')).toBeDefined()

      // 3. Retry error
      errorService.incrementRetryCount(errorId)
      expect(errorService.getError(errorId)!.retryCount).toBe(1)

      // 4. Resolve error
      errorService.resolveError(errorId)
      expect(errorService.getError(errorId)).toBeUndefined()
      expect(errorService.getEntityAnnotation('pos_lifecycle')).toBeUndefined()
    })

    test('should handle complex partial success scenarios', () => {
      // Record partial success with mixed error types
      const errors: SubmissionError[] = [
        {
          id: 'error_1',
          timestamp: new Date(),
          level: 'position',
          entityId: 'pos_1',
          errorCode: 'TIMEOUT_ERROR',
          errorMessage: 'Timeout',
          retryable: true,
          retryCount: 0,
          userMessage: 'Request timed out',
          suggestedAction: 'Try again'
        },
        {
          id: 'error_2',
          timestamp: new Date(),
          level: 'position',
          entityId: 'pos_2',
          errorCode: 'VALIDATION_ERROR',
          errorMessage: 'Invalid',
          retryable: false,
          retryCount: 0,
          userMessage: 'Invalid data',
          suggestedAction: 'Fix data'
        }
      ]

      errorService.recordPartialSuccess({
        level: 'portfolio',
        entityId: 'portfolio_complex',
        successCount: 18,
        failureCount: 2,
        totalCount: 20,
        errors,
        completedIds: Array.from({length: 18}, (_, i) => `pos_${i+3}`),
        failedIds: ['pos_1', 'pos_2']
      })

      // Verify all data is properly stored
      const partialResults = errorService.getPartialResults()
      expect(partialResults).toHaveLength(1)
      expect(partialResults[0].successRate).toBe(0.9)

      const pos1Errors = errorService.getErrorsForEntity('pos_1')
      const pos2Errors = errorService.getErrorsForEntity('pos_2')
      expect(pos1Errors).toHaveLength(1)
      expect(pos2Errors).toHaveLength(1)

      const retryableErrors = errorService.getRetryableErrors()
      expect(retryableErrors).toHaveLength(1) // Only pos_1 error is retryable
    })

    test('should maintain data consistency during cleanup', () => {
      // Add errors and partial results
      const recentErrorId = errorService.addError({
        level: 'position',
        entityId: 'pos_consistent',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Recent error',
        retryable: true,
        retryCount: 0
      })

      const oldErrorId = errorService.addError({
        level: 'position',
        entityId: 'pos_stale',
        errorCode: 'TIMEOUT_ERROR',
        errorMessage: 'Old error',
        retryable: true,
        retryCount: 1
      })

      // Make one error stale
      const oldError = errorService.getError(oldErrorId)!
      oldError.timestamp = new Date(Date.now() - 70000)

      const initialMetrics = errorService.getErrorMetrics()
      
      // Perform cleanup
      errorService.performStaleCleanup()
      
      const finalMetrics = errorService.getErrorMetrics()
      
      // Verify consistency
      expect(finalMetrics.totalErrors).toBe(initialMetrics.totalErrors - 1)
      expect(errorService.getError(recentErrorId)).toBeDefined() // Recent error preserved
      expect(errorService.getError(oldErrorId)).toBeUndefined() // Stale error removed
    })
  })
}) 