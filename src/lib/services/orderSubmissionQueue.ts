// Order Submission Queue Service for Background Processing
// Handles queuing, prioritization, and background processing of order submissions

'use client'

import { EventEmitter } from 'events'
import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission 
} from '@/types/rebalance'
import { 
  OrderSubmissionResult,
  SubmissionState 
} from '@/types/order'
import { orderServiceApi } from '@/lib/api/orderService'

/**
 * Queue item priority levels
 */
export enum QueuePriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Critical = 4
}

/**
 * Queue item status
 */
export enum QueueItemStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Retrying = 'retrying'
}

/**
 * Queue submission item
 */
export interface QueueSubmissionItem {
  id: string
  type: 'rebalance' | 'portfolio' | 'batch'
  priority: QueuePriority
  status: QueueItemStatus
  data: RebalanceWithSubmission | RebalancePortfolioWithSubmission
  metadata: {
    createdAt: Date
    startedAt?: Date
    completedAt?: Date
    estimatedDuration?: number
    actualDuration?: number
    retryCount: number
    maxRetries: number
    userId?: string
    batchId?: string
  }
  progress: {
    current: number
    total: number
    phase: string
  }
  result?: OrderSubmissionResult
  error?: string
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxConcurrentItems: number
  maxQueueSize: number
  defaultPriority: QueuePriority
  defaultMaxRetries: number
  retryDelay: number
  backgroundProcessingEnabled: boolean
  priorityBoostThreshold: number // ms to boost priority for waiting items
  estimatedDurationEnabled: boolean
  persistQueue: boolean
}

/**
 * Queue statistics
 */
export interface QueueStats {
  totalItems: number
  pendingItems: number
  processingItems: number
  completedItems: number
  failedItems: number
  averageProcessingTime: number
  throughput: number // items per minute
  queueHealthScore: number // 0-100
}

/**
 * Queue events
 */
export interface QueueEvents {
  'item-added': (item: QueueSubmissionItem) => void
  'item-started': (item: QueueSubmissionItem) => void
  'item-progress': (item: QueueSubmissionItem, progress: { current: number; total: number; phase: string }) => void
  'item-completed': (item: QueueSubmissionItem, result: OrderSubmissionResult) => void
  'item-failed': (item: QueueSubmissionItem, error: string) => void
  'item-cancelled': (item: QueueSubmissionItem) => void
  'queue-empty': () => void
  'queue-full': () => void
  'stats-updated': (stats: QueueStats) => void
}

/**
 * Default queue configuration
 */
const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrentItems: 3,
  maxQueueSize: 100,
  defaultPriority: QueuePriority.Normal,
  defaultMaxRetries: 3,
  retryDelay: 5000, // 5 seconds
  backgroundProcessingEnabled: true,
  priorityBoostThreshold: 300000, // 5 minutes
  estimatedDurationEnabled: true,
  persistQueue: false
}

/**
 * Order Submission Queue Service
 */
export class OrderSubmissionQueue extends EventEmitter {
  private config: QueueConfig
  private queue: QueueSubmissionItem[] = []
  private processingItems: Map<string, QueueSubmissionItem> = new Map()
  private completedItems: QueueSubmissionItem[] = []
  private isProcessing = false
  private processingIntervalId?: NodeJS.Timeout
  private statsUpdateIntervalId?: NodeJS.Timeout
  private readonly STORAGE_KEY = 'globeco_submission_queue'

  constructor(config: Partial<QueueConfig> = {}) {
    super()
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config }
    
    if (this.config.persistQueue) {
      this.loadPersistedQueue()
    }
    
    this.startProcessing()
    this.startStatsUpdate()
  }

  /**
   * Add item to queue
   */
  public enqueue(
    data: RebalanceWithSubmission | RebalancePortfolioWithSubmission,
    options: {
      type: 'rebalance' | 'portfolio' | 'batch'
      priority?: QueuePriority
      maxRetries?: number
      estimatedDuration?: number
      batchId?: string
      userId?: string
    }
  ): string {
    if (this.queue.length >= this.config.maxQueueSize) {
      this.emit('queue-full')
      throw new Error('Queue is full')
    }

    const item: QueueSubmissionItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: options.type,
      priority: options.priority || this.config.defaultPriority,
      status: QueueItemStatus.Pending,
      data,
      metadata: {
        createdAt: new Date(),
        estimatedDuration: options.estimatedDuration,
        retryCount: 0,
        maxRetries: options.maxRetries || this.config.defaultMaxRetries,
        userId: options.userId,
        batchId: options.batchId
      },
      progress: {
        current: 0,
        total: this.calculateTotalItems(data),
        phase: 'queued'
      }
    }

    // Insert item in priority order
    this.insertByPriority(item)
    
    this.emit('item-added', item)
    this.persistQueueIfNeeded()
    
    return item.id
  }

  /**
   * Remove item from queue
   */
  public dequeue(itemId: string): boolean {
    const queueIndex = this.queue.findIndex(item => item.id === itemId)
    if (queueIndex !== -1) {
      const item = this.queue[queueIndex]
      this.queue.splice(queueIndex, 1)
      item.status = QueueItemStatus.Cancelled
      this.emit('item-cancelled', item)
      this.persistQueueIfNeeded()
      return true
    }

    // Check if item is being processed
    const processingItem = this.processingItems.get(itemId)
    if (processingItem) {
      processingItem.status = QueueItemStatus.Cancelled
      this.processingItems.delete(itemId)
      this.emit('item-cancelled', processingItem)
      return true
    }

    return false
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): {
    pending: QueueSubmissionItem[]
    processing: QueueSubmissionItem[]
    completed: QueueSubmissionItem[]
    stats: QueueStats
  } {
    return {
      pending: [...this.queue],
      processing: Array.from(this.processingItems.values()),
      completed: [...this.completedItems],
      stats: this.calculateStats()
    }
  }

  /**
   * Update item priority
   */
  public updatePriority(itemId: string, newPriority: QueuePriority): boolean {
    const queueIndex = this.queue.findIndex(item => item.id === itemId)
    if (queueIndex !== -1) {
      const item = this.queue.splice(queueIndex, 1)[0]
      item.priority = newPriority
      this.insertByPriority(item)
      this.persistQueueIfNeeded()
      return true
    }
    return false
  }

  /**
   * Clear completed items
   */
  public clearCompleted(): void {
    this.completedItems = []
    this.persistQueueIfNeeded()
  }

  /**
   * Pause queue processing
   */
  public pause(): void {
    this.isProcessing = false
  }

  /**
   * Resume queue processing
   */
  public resume(): void {
    if (!this.isProcessing) {
      this.isProcessing = true
      this.processQueue()
    }
  }

  /**
   * Shutdown queue and cleanup
   */
  public shutdown(): void {
    this.isProcessing = false
    
    if (this.processingIntervalId) {
      clearInterval(this.processingIntervalId)
    }
    
    if (this.statsUpdateIntervalId) {
      clearInterval(this.statsUpdateIntervalId)
    }
    
    this.removeAllListeners()
  }

  // Private methods

  private startProcessing(): void {
    this.isProcessing = true
    this.processingIntervalId = setInterval(() => {
      if (this.isProcessing) {
        this.processQueue()
      }
    }, 1000) // Check every second
  }

  private startStatsUpdate(): void {
    this.statsUpdateIntervalId = setInterval(() => {
      const stats = this.calculateStats()
      this.emit('stats-updated', stats)
    }, 10000) // Update stats every 10 seconds
  }

  private async processQueue(): Promise<void> {
    // Check if we can process more items
    if (this.processingItems.size >= this.config.maxConcurrentItems) {
      return
    }

    // Boost priority for waiting items
    this.boostPriorityForWaitingItems()

    // Get next item to process
    const nextItem = this.queue.shift()
    if (!nextItem) {
      if (this.processingItems.size === 0) {
        this.emit('queue-empty')
      }
      return
    }

    // Start processing
    this.startItemProcessing(nextItem)
  }

  private async startItemProcessing(item: QueueSubmissionItem): Promise<void> {
    item.status = QueueItemStatus.Processing
    item.metadata.startedAt = new Date()
    item.progress.phase = 'processing'
    
    this.processingItems.set(item.id, item)
    this.emit('item-started', item)

    try {
      const result = await this.processSubmissionItem(item)
      this.completeItemProcessing(item, result)
    } catch (error) {
      this.failItemProcessing(item, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async processSubmissionItem(item: QueueSubmissionItem): Promise<OrderSubmissionResult> {
    const progressCallback = (progress: { current: number; total: number; phase: string }) => {
      item.progress = progress
      this.emit('item-progress', item, progress)
    }

    if (item.type === 'rebalance') {
      const rebalance = item.data as RebalanceWithSubmission
      const { result } = await orderServiceApi.submitRebalanceOrders(rebalance, (progress) => {
        progressCallback({
          current: progress.submitted,
          total: progress.total,
          phase: `Portfolio ${progress.currentPortfolio}/${progress.totalPortfolios}`
        })
      })
      return result
    } else if (item.type === 'portfolio') {
      const portfolio = item.data as RebalancePortfolioWithSubmission
      const { result } = await orderServiceApi.submitPortfolioOrders(portfolio, (progress) => {
        progressCallback({
          current: progress.submitted,
          total: progress.total,
          phase: 'submitting'
        })
      })
      return result
    } else {
      throw new Error(`Unsupported item type: ${item.type}`)
    }
  }

  private completeItemProcessing(item: QueueSubmissionItem, result: OrderSubmissionResult): void {
    item.status = QueueItemStatus.Completed
    item.metadata.completedAt = new Date()
    item.metadata.actualDuration = item.metadata.completedAt.getTime() - item.metadata.startedAt!.getTime()
    item.result = result
    item.progress.phase = 'completed'
    item.progress.current = item.progress.total

    this.processingItems.delete(item.id)
    this.completedItems.push(item)
    
    // Keep only recent completed items
    if (this.completedItems.length > 50) {
      this.completedItems = this.completedItems.slice(-50)
    }

    this.emit('item-completed', item, result)
    this.persistQueueIfNeeded()
  }

  private async failItemProcessing(item: QueueSubmissionItem, error: string): Promise<void> {
    item.error = error

    // Check if we should retry
    if (item.metadata.retryCount < item.metadata.maxRetries) {
      item.metadata.retryCount++
      item.status = QueueItemStatus.Retrying
      item.progress.phase = 'retrying'
      
      // Add back to queue with higher priority for retry
      item.priority = Math.min(item.priority + 1, QueuePriority.Critical) as QueuePriority
      
      setTimeout(() => {
        this.insertByPriority(item)
        this.processingItems.delete(item.id)
      }, this.config.retryDelay)
      
    } else {
      // Max retries exceeded
      item.status = QueueItemStatus.Failed
      item.metadata.completedAt = new Date()
      item.progress.phase = 'failed'
      
      this.processingItems.delete(item.id)
      this.completedItems.push(item)
      
      this.emit('item-failed', item, error)
    }

    this.persistQueueIfNeeded()
  }

  private insertByPriority(item: QueueSubmissionItem): void {
    let insertIndex = this.queue.length
    
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < item.priority) {
        insertIndex = i
        break
      }
    }
    
    this.queue.splice(insertIndex, 0, item)
  }

  private boostPriorityForWaitingItems(): void {
    const now = Date.now()
    const threshold = this.config.priorityBoostThreshold
    
    for (const item of this.queue) {
      const waitTime = now - item.metadata.createdAt.getTime()
      if (waitTime > threshold && item.priority < QueuePriority.High) {
        item.priority = QueuePriority.High
      }
    }
  }

  private calculateTotalItems(data: RebalanceWithSubmission | RebalancePortfolioWithSubmission): number {
    if ('portfolios' in data) {
      // Rebalance
      return data.portfolios.reduce((sum, portfolio) => 
        sum + portfolio.positions.filter(pos => 
          (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') && 
          pos.trade_quantity !== 0
        ).length, 0
      )
    } else {
      // Portfolio
      return data.positions.filter(pos => 
        (pos.transaction_type === 'BUY' || pos.transaction_type === 'SELL') && 
        pos.trade_quantity !== 0
      ).length
    }
  }

  private calculateStats(): QueueStats {
    const totalItems = this.queue.length + this.processingItems.size + this.completedItems.length
    const completedItems = this.completedItems.filter(item => item.status === QueueItemStatus.Completed)
    const failedItems = this.completedItems.filter(item => item.status === QueueItemStatus.Failed)
    
    // Calculate average processing time
    const processingTimes = completedItems
      .map(item => item.metadata.actualDuration || 0)
      .filter(time => time > 0)
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0

    // Calculate throughput (items per minute)
    const recentCompletedItems = completedItems.filter(item => 
      item.metadata.completedAt && 
      Date.now() - item.metadata.completedAt.getTime() < 60000 // Last minute
    )
    const throughput = recentCompletedItems.length

    // Calculate health score
    const successRate = totalItems > 0 ? (completedItems.length / totalItems) * 100 : 100
    const processingCapacity = this.config.maxConcurrentItems > 0 
      ? ((this.config.maxConcurrentItems - this.processingItems.size) / this.config.maxConcurrentItems) * 100 
      : 100
    const queueHealthScore = Math.min((successRate + processingCapacity) / 2, 100)

    return {
      totalItems,
      pendingItems: this.queue.length,
      processingItems: this.processingItems.size,
      completedItems: completedItems.length,
      failedItems: failedItems.length,
      averageProcessingTime,
      throughput,
      queueHealthScore
    }
  }

  private persistQueueIfNeeded(): void {
    if (this.config.persistQueue && typeof window !== 'undefined' && window.localStorage) {
      try {
        const queueData = {
          queue: this.queue,
          completedItems: this.completedItems.slice(-10), // Keep only last 10 completed
          timestamp: new Date().toISOString()
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queueData))
      } catch (error) {
        console.warn('Failed to persist queue to localStorage:', error)
      }
    }
  }

  private loadPersistedQueue(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          const queueData = JSON.parse(stored)
          
          // Restore pending items (mark processing items as failed)
          this.queue = queueData.queue || []
          this.completedItems = queueData.completedItems || []
          
          // Reset any processing items to pending
          this.queue.forEach(item => {
            if (item.status === QueueItemStatus.Processing) {
              item.status = QueueItemStatus.Pending
              item.progress.phase = 'restored'
            }
          })
        }
      } catch (error) {
        console.warn('Failed to load persisted queue from localStorage:', error)
      }
    }
  }
}

/**
 * Singleton instance for global use
 */
let globalQueue: OrderSubmissionQueue | null = null

export function getGlobalSubmissionQueue(): OrderSubmissionQueue {
  if (!globalQueue) {
    globalQueue = new OrderSubmissionQueue({
      backgroundProcessingEnabled: true,
      persistQueue: true,
      maxConcurrentItems: 2
    })
  }
  return globalQueue
}

export function shutdownGlobalSubmissionQueue(): void {
  if (globalQueue) {
    globalQueue.shutdown()
    globalQueue = null
  }
} 