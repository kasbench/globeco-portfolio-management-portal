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