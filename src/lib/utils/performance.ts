import React from 'react'

// Performance monitoring utilities for the rebalance results page

export interface PerformanceMetrics {
  componentRenderTime: number
  apiResponseTime: number
  totalDataSize: number
  renderCount: number
  timestamp: number
}

// Performance monitoring hook
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map()

  // Track component render performance
  trackRender(componentName: string, startTime: number) {
    const renderTime = performance.now() - startTime
    
    const existing = this.metrics.get(componentName) || []
    existing.push({
      componentRenderTime: renderTime,
      apiResponseTime: 0,
      totalDataSize: 0,
      renderCount: existing.length + 1,
      timestamp: Date.now()
    })
    
    this.metrics.set(componentName, existing.slice(-10)) // Keep last 10 renders
    
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 100) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
  }

  // Track API response performance
  trackAPICall(endpoint: string, responseTime: number, dataSize: number) {
    const existing = this.metrics.get(endpoint) || []
    existing.push({
      componentRenderTime: 0,
      apiResponseTime: responseTime,
      totalDataSize: dataSize,
      renderCount: 0,
      timestamp: Date.now()
    })
    
    this.metrics.set(endpoint, existing.slice(-10))
    
    // Log slow API calls in development
    if (process.env.NODE_ENV === 'development' && responseTime > 1000) {
      console.warn(`Slow API call detected for ${endpoint}: ${responseTime.toFixed(2)}ms`)
    }
  }

  // Get average performance for a component/endpoint
  getAveragePerformance(key: string): PerformanceMetrics | null {
    const metrics = this.metrics.get(key)
    if (!metrics || metrics.length === 0) return null

    const avg = metrics.reduce(
      (acc, metric) => ({
        componentRenderTime: acc.componentRenderTime + metric.componentRenderTime,
        apiResponseTime: acc.apiResponseTime + metric.apiResponseTime,
        totalDataSize: acc.totalDataSize + metric.totalDataSize,
        renderCount: acc.renderCount + metric.renderCount,
        timestamp: Math.max(acc.timestamp, metric.timestamp)
      }),
      { componentRenderTime: 0, apiResponseTime: 0, totalDataSize: 0, renderCount: 0, timestamp: 0 }
    )

    return {
      componentRenderTime: avg.componentRenderTime / metrics.length,
      apiResponseTime: avg.apiResponseTime / metrics.length,
      totalDataSize: avg.totalDataSize / metrics.length,
      renderCount: avg.renderCount / metrics.length,
      timestamp: avg.timestamp
    }
  }

  // Get all performance data (for debugging)
  getAllMetrics() {
    return Object.fromEntries(this.metrics.entries())
  }

  // Clear metrics
  clear() {
    this.metrics.clear()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for tracking component performance
export const usePerformanceTracking = (componentName: string) => {
  const startTime = performance.now()

  React.useEffect(() => {
    performanceMonitor.trackRender(componentName, startTime)
  })

  return {
    trackAPICall: (endpoint: string, responseTime: number, dataSize: number) =>
      performanceMonitor.trackAPICall(endpoint, responseTime, dataSize),
    getMetrics: () => performanceMonitor.getAveragePerformance(componentName)
  }
}

// Utility to measure data size
export const getDataSize = (data: any): number => {
  return JSON.stringify(data).length
}

// Debounce utility for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle utility for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * Advanced debouncing with cancellation and immediate execution support
 */
export class AdvancedDebouncer<T extends (...args: any[]) => any> {
  private timeoutId?: NodeJS.Timeout
  private lastArgs?: Parameters<T>
  private lastResult?: ReturnType<T>
  
  constructor(
    private func: T,
    private delay: number,
    private options: {
      leading?: boolean // Execute immediately on first call
      trailing?: boolean // Execute on timeout (default true)
      maxWait?: number // Maximum time to wait before execution
    } = {}
  ) {
    this.options = {
      leading: false,
      trailing: true,
      ...options
    }
  }

  public call(...args: Parameters<T>): void {
    this.lastArgs = args
    
    const callNow = this.options.leading && !this.timeoutId
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    
    this.timeoutId = setTimeout(() => {
      this.timeoutId = undefined
      if (this.options.trailing && this.lastArgs) {
        this.lastResult = this.func(...this.lastArgs)
      }
    }, this.delay)
    
    if (callNow) {
      this.lastResult = this.func(...args)
    }
  }

  public cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
  }

  public flush(): ReturnType<T> | undefined {
    if (this.timeoutId && this.lastArgs) {
      this.cancel()
      this.lastResult = this.func(...this.lastArgs)
    }
    return this.lastResult
  }

  public pending(): boolean {
    return !!this.timeoutId
  }
}

/**
 * Request throttling with queue and priority support
 */
export class RequestThrottler {
  private queue: Array<{
    request: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: any) => void
    priority: number
    timestamp: number
  }> = []
  private processing = false
  private activeRequests = 0
  
  constructor(
    private maxConcurrent: number = 3,
    private requestDelay: number = 100
  ) {}

  public async throttle<T>(
    request: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      })
      
      // Sort by priority (higher first) then by timestamp (older first)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.timestamp - b.timestamp
      })
      
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.processing = true
    
    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const item = this.queue.shift()!
      this.activeRequests++
      
      this.executeRequest(item)
      
      // Add delay between request starts
      if (this.requestDelay > 0 && this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay))
      }
    }
    
    this.processing = false
  }

  private async executeRequest(item: {
    request: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: any) => void
  }): Promise<void> {
    try {
      const result = await item.request()
      item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      this.activeRequests--
      // Continue processing queue
      setTimeout(() => this.processQueue(), 0)
    }
  }

  public getQueueStatus(): {
    queueLength: number
    activeRequests: number
    capacity: number
  } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      capacity: this.maxConcurrent
    }
  }

  public clear(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Request cancelled - queue cleared'))
    })
    this.queue = []
  }
}

/**
 * Action batching utility for grouping rapid user actions
 */
export class ActionBatcher<T> {
  private batch: T[] = []
  private timeoutId?: NodeJS.Timeout
  
  constructor(
    private processor: (batch: T[]) => Promise<void> | void,
    private batchSize: number = 10,
    private batchTimeout: number = 1000
  ) {}

  public add(action: T): void {
    this.batch.push(action)
    
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    
    // Process immediately if batch is full
    if (this.batch.length >= this.batchSize) {
      this.processBatch()
      return
    }
    
    // Set timeout for partial batch
    this.timeoutId = setTimeout(() => {
      this.processBatch()
    }, this.batchTimeout)
  }

  public flush(): void {
    if (this.batch.length > 0) {
      this.processBatch()
    }
  }

  private async processBatch(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
    
    if (this.batch.length === 0) {
      return
    }
    
    const currentBatch = [...this.batch]
    this.batch = []
    
    try {
      await this.processor(currentBatch)
    } catch (error) {
      console.error('Batch processing failed:', error)
    }
  }

  public getPendingCount(): number {
    return this.batch.length
  }
}

/**
 * Smart debouncing for form inputs with immediate feedback
 */
export function createSmartDebouncer<T>(
  onImmediate: (value: T) => void, // Called immediately for UI updates
  onDebounced: (value: T) => void, // Called after debounce for expensive operations
  delay: number = 300
) {
  const debouncedCallback = debounce(onDebounced, delay)
  
  return (value: T) => {
    onImmediate(value) // Immediate UI feedback
    debouncedCallback(value) // Debounced expensive operation
  }
}

/**
 * Memory-efficient data processing for large datasets
 */
export class ChunkedProcessor<T, R> {
  constructor(
    private processor: (chunk: T[]) => Promise<R[]> | R[],
    private chunkSize: number = 1000,
    private concurrency: number = 2
  ) {}

  public async process(
    data: T[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const chunks = this.createChunks(data)
    const results: R[] = []
    let processed = 0

    // Process chunks in batches of `concurrency`
    for (let i = 0; i < chunks.length; i += this.concurrency) {
      const batchChunks = chunks.slice(i, i + this.concurrency)
      
      const batchPromises = batchChunks.map(async (chunk) => {
        const chunkResults = await this.processor(chunk)
        processed += chunk.length
        onProgress?.(processed, data.length)
        return chunkResults
      })
      
      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(chunkResults => {
        results.push(...chunkResults)
      })
    }

    return results
  }

  private createChunks(data: T[]): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < data.length; i += this.chunkSize) {
      chunks.push(data.slice(i, i + this.chunkSize))
    }
    return chunks
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private measurements: Map<string, {
    count: number
    totalTime: number
    minTime: number
    maxTime: number
    lastTime: number
  }> = new Map()

  public time<T>(label: string, fn: () => T): T
  public time<T>(label: string, fn: () => Promise<T>): Promise<T>
  public time<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = performance.now()
    
    const finish = (result: T) => {
      const duration = performance.now() - start
      this.recordMeasurement(label, duration)
      return result
    }

    try {
      const result = fn()
      
      if (result instanceof Promise) {
        return result.then(finish).catch(error => {
          const duration = performance.now() - start
          this.recordMeasurement(label, duration)
          throw error
        })
      } else {
        return finish(result)
      }
    } catch (error) {
      const duration = performance.now() - start
      this.recordMeasurement(label, duration)
      throw error
    }
  }

  private recordMeasurement(label: string, duration: number): void {
    const existing = this.measurements.get(label)
    
    if (existing) {
      existing.count++
      existing.totalTime += duration
      existing.minTime = Math.min(existing.minTime, duration)
      existing.maxTime = Math.max(existing.maxTime, duration)
      existing.lastTime = duration
    } else {
      this.measurements.set(label, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        lastTime: duration
      })
    }
  }

  public getStats(label?: string): any {
    if (label) {
      const measurement = this.measurements.get(label)
      if (!measurement) return null
      
      return {
        label,
        count: measurement.count,
        averageTime: measurement.totalTime / measurement.count,
        minTime: measurement.minTime,
        maxTime: measurement.maxTime,
        lastTime: measurement.lastTime,
        totalTime: measurement.totalTime
      }
    }

    // Return all stats
    const allStats: any = {}
    for (const [label, measurement] of this.measurements) {
      allStats[label] = {
        count: measurement.count,
        averageTime: measurement.totalTime / measurement.count,
        minTime: measurement.minTime,
        maxTime: measurement.maxTime,
        lastTime: measurement.lastTime,
        totalTime: measurement.totalTime
      }
    }
    return allStats
  }

  public clear(label?: string): void {
    if (label) {
      this.measurements.delete(label)
    } else {
      this.measurements.clear()
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Global request throttler instance
 */
export const globalRequestThrottler = new RequestThrottler(3, 100)

// Virtual scrolling utilities
export interface VirtualScrollConfig {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export const calculateVirtualScrollRange = (
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig
) => {
  const { itemHeight, containerHeight, overscan = 5 } = config
  
  const visibleItems = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2)
  
  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight
  }
} 