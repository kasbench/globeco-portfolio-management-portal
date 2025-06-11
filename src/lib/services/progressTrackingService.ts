// Comprehensive Progress Tracking Service for Order Submission
// Manages real-time feedback, batch tracking, and performance metrics

import { EventEmitter } from 'events'

/**
 * Progress update interface
 */
export interface ProgressUpdate {
  id: string
  stage: 'preparing' | 'validating' | 'submitting' | 'processing' | 'completing' | 'finished'
  progress: number // 0-100
  currentItem?: string
  currentBatch?: number
  totalBatches?: number
  itemsProcessed?: number
  totalItems?: number
  message?: string
  error?: string
  metadata?: Record<string, any>
}

/**
 * Batch tracking information
 */
export interface BatchTrackingInfo {
  batchIndex: number
  batchSize: number
  totalBatches: number
  currentItem?: string
  itemsInBatch: number
  itemsProcessed: number
  batchStartTime: number
  estimatedBatchTime?: number
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  startTime: number
  currentTime: number
  elapsedTime: number
  itemsProcessed: number
  totalItems: number
  throughput: number // items per second
  estimatedTimeRemaining: number // seconds
  averageItemTime: number // milliseconds per item
}

/**
 * Progress session configuration
 */
export interface ProgressSessionConfig {
  id: string
  totalItems: number
  batchSize?: number
  estimateEnabled?: boolean
  throughputWindow?: number // number of recent items to consider for throughput
}

/**
 * Progress tracking session
 */
export class ProgressSession extends EventEmitter {
  private readonly id: string
  private readonly config: ProgressSessionConfig
  private readonly startTime: number
  private readonly recentTimes: number[] = []
  
  private currentStage: ProgressUpdate['stage'] = 'preparing'
  private itemsProcessed = 0
  private currentBatch = 0
  private batchStartTime = 0
  private lastUpdateTime = 0
  
  private batchTrackingInfo: BatchTrackingInfo | null = null
  private isCompleted = false
  private error: string | null = null

  constructor(config: ProgressSessionConfig) {
    super()
    this.id = config.id
    this.config = config
    this.startTime = Date.now()
    this.lastUpdateTime = this.startTime
    
    // Initialize batch tracking if batch size is specified
    if (config.batchSize) {
      this.initializeBatchTracking()
    }
  }

  /**
   * Initialize batch tracking
   */
  private initializeBatchTracking() {
    if (!this.config.batchSize) return
    
    const totalBatches = Math.ceil(this.config.totalItems / this.config.batchSize)
    this.batchTrackingInfo = {
      batchIndex: 0,
      batchSize: this.config.batchSize,
      totalBatches,
      itemsInBatch: Math.min(this.config.batchSize, this.config.totalItems),
      itemsProcessed: 0,
      batchStartTime: this.startTime
    }
  }

  /**
   * Update progress for current item
   */
  public updateProgress(
    stage: ProgressUpdate['stage'],
    currentItem?: string,
    message?: string,
    metadata?: Record<string, any>
  ) {
    if (this.isCompleted) return

    const now = Date.now()
    this.currentStage = stage
    this.lastUpdateTime = now

    // Calculate progress percentage
    const progress = this.config.totalItems > 0 
      ? Math.round((this.itemsProcessed / this.config.totalItems) * 100)
      : 0

    // Update batch tracking if enabled
    if (this.batchTrackingInfo) {
      this.updateBatchTracking(currentItem)
    }

    // Create progress update
    const update: ProgressUpdate = {
      id: this.id,
      stage,
      progress,
      currentItem,
      message,
      metadata,
      itemsProcessed: this.itemsProcessed,
      totalItems: this.config.totalItems
    }

    // Add batch information if available
    if (this.batchTrackingInfo) {
      update.currentBatch = this.batchTrackingInfo.batchIndex
      update.totalBatches = this.batchTrackingInfo.totalBatches
    }

    // Emit update event
    this.emit('progress', update)
  }

  /**
   * Mark item as processed
   */
  public itemProcessed(itemId?: string) {
    if (this.isCompleted) return

    const now = Date.now()
    this.itemsProcessed++
    
    // Track timing for throughput calculation
    if (this.config.estimateEnabled) {
      const itemTime = now - this.lastUpdateTime
      this.recentTimes.push(itemTime)
      
      // Keep only recent times for throughput calculation
      const windowSize = this.config.throughputWindow || 10
      if (this.recentTimes.length > windowSize) {
        this.recentTimes.shift()
      }
    }

    // Update batch tracking
    if (this.batchTrackingInfo) {
      this.batchTrackingInfo.itemsProcessed++
      
      // Check if batch is complete
      if (this.batchTrackingInfo.itemsProcessed >= this.batchTrackingInfo.itemsInBatch) {
        this.completeBatch()
      }
    }

    // Check if session is complete
    if (this.itemsProcessed >= this.config.totalItems) {
      this.complete()
    }

    this.lastUpdateTime = now
  }

  /**
   * Complete current batch and start next
   */
  private completeBatch() {
    if (!this.batchTrackingInfo) return

    this.batchTrackingInfo.batchIndex++
    
    // Calculate remaining items for next batch
    const remainingItems = this.config.totalItems - this.itemsProcessed
    const nextBatchSize = Math.min(this.config.batchSize || 0, remainingItems)
    
    if (nextBatchSize > 0) {
      // Start next batch
      this.batchTrackingInfo = {
        ...this.batchTrackingInfo,
        itemsInBatch: nextBatchSize,
        itemsProcessed: 0,
        batchStartTime: Date.now()
      }
    }
  }

  /**
   * Set error state
   */
  public setError(error: string) {
    this.error = error
    this.emit('error', { id: this.id, error })
  }

  /**
   * Complete the session
   */
  public complete() {
    if (this.isCompleted) return

    this.isCompleted = true
    this.currentStage = 'finished'
    
    const update: ProgressUpdate = {
      id: this.id,
      stage: 'finished',
      progress: 100,
      itemsProcessed: this.itemsProcessed,
      totalItems: this.config.totalItems,
      message: 'Processing completed'
    }

    this.emit('progress', update)
    this.emit('complete', { id: this.id, metrics: this.getMetrics() })
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    const now = Date.now()
    const elapsedTime = now - this.startTime

    // Calculate throughput
    let throughput = 0
    if (elapsedTime > 0 && this.itemsProcessed > 0) {
      throughput = (this.itemsProcessed / elapsedTime) * 1000 // items per second
    }

    // Calculate average item time
    let averageItemTime = 0
    if (this.recentTimes.length > 0) {
      averageItemTime = this.recentTimes.reduce((sum, time) => sum + time, 0) / this.recentTimes.length
    }

    // Estimate remaining time
    let estimatedTimeRemaining = 0
    if (throughput > 0) {
      const remainingItems = this.config.totalItems - this.itemsProcessed
      estimatedTimeRemaining = remainingItems / throughput
    }

    return {
      startTime: this.startTime,
      currentTime: now,
      elapsedTime,
      itemsProcessed: this.itemsProcessed,
      totalItems: this.config.totalItems,
      throughput,
      estimatedTimeRemaining,
      averageItemTime
    }
  }

  /**
   * Get current batch tracking info
   */
  public getBatchTrackingInfo(): BatchTrackingInfo | null {
    return this.batchTrackingInfo
  }

  /**
   * Check if session is completed
   */
  public isSessionCompleted(): boolean {
    return this.isCompleted
  }

  /**
   * Get current stage
   */
  public getCurrentStage(): ProgressUpdate['stage'] {
    return this.currentStage
  }

  /**
   * Get session ID
   */
  public getId(): string {
    return this.id
  }

  /**
   * Update batch tracking information
   */
  private updateBatchTracking(currentItem?: string) {
    if (!this.batchTrackingInfo) return
    
    this.batchTrackingInfo.currentItem = currentItem
  }
}

/**
 * Progress tracking service
 */
export class ProgressTrackingService {
  private readonly sessions = new Map<string, ProgressSession>()

  /**
   * Create a new progress session
   */
  public createSession(config: ProgressSessionConfig): ProgressSession {
    const session = new ProgressSession(config)
    this.sessions.set(config.id, session)

    // Clean up session when completed
    session.once('complete', () => {
      setTimeout(() => {
        this.sessions.delete(config.id)
      }, 5000) // Keep session for 5 seconds after completion
    })

    return session
  }

  /**
   * Get existing session
   */
  public getSession(id: string): ProgressSession | undefined {
    return this.sessions.get(id)
  }

  /**
   * Remove session
   */
  public removeSession(id: string): boolean {
    const session = this.sessions.get(id)
    if (session) {
      session.removeAllListeners()
      return this.sessions.delete(id)
    }
    return false
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): ProgressSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Clear all sessions
   */
  public clearAllSessions() {
    for (const session of this.sessions.values()) {
      session.removeAllListeners()
    }
    this.sessions.clear()
  }

  /**
   * Create a convenience method for simple progress tracking
   */
  public trackProgress<T>(
    id: string,
    items: T[],
    processor: (item: T, session: ProgressSession) => Promise<void>,
    options?: {
      batchSize?: number
      onProgress?: (update: ProgressUpdate) => void
      onError?: (error: string) => void
      onComplete?: (metrics: PerformanceMetrics) => void
    }
  ): Promise<PerformanceMetrics> {
    return new Promise((resolve, reject) => {
      const session = this.createSession({
        id,
        totalItems: items.length,
        batchSize: options?.batchSize,
        estimateEnabled: true
      })

      // Set up event listeners
      if (options?.onProgress) {
        session.on('progress', options.onProgress)
      }

      if (options?.onError) {
        session.on('error', (error) => options.onError!(error.error))
      }

      session.once('complete', (result) => {
        if (options?.onComplete) {
          options.onComplete(result.metrics)
        }
        resolve(result.metrics)
      })

      // Process items
      this.processItems(session, items, processor)
        .catch((error) => {
          session.setError(error.message)
          reject(error)
        })
    })
  }

  /**
   * Process items with progress tracking
   */
  private async processItems<T>(
    session: ProgressSession,
    items: T[],
    processor: (item: T, session: ProgressSession) => Promise<void>
  ) {
    session.updateProgress('preparing', undefined, 'Initializing processing...')

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      try {
        session.updateProgress(
          'processing',
          `Item ${i + 1}`,
          `Processing item ${i + 1} of ${items.length}`
        )

        await processor(item, session)
        session.itemProcessed(`item-${i}`)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        session.setError(`Failed to process item ${i + 1}: ${errorMessage}`)
        throw error
      }
    }

    session.updateProgress('completing', undefined, 'Finalizing...')
    session.complete()
  }
}

/**
 * Global progress tracking service instance
 */
export const progressTrackingService = new ProgressTrackingService() 