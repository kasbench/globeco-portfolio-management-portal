// Submission History and Audit Trail Service
// Tracks all order submission activities with detailed logging and reporting

'use client'

import { useState, useEffect } from 'react'

export interface SubmissionEvent {
  id: string
  timestamp: Date
  type: 'submission' | 'deletion' | 'retry' | 'batch_operation' | 'user_action'
  operation: string
  userId?: string
  userName?: string
  source: 'manual' | 'batch' | 'background' | 'system'
  status: 'pending' | 'success' | 'partial' | 'failed' | 'cancelled'
  details: {
    rebalanceId?: string
    portfolioId?: string
    orderIds?: string[]
    itemCount?: number
    batchSize?: number
    errorCount?: number
    successCount?: number
    duration?: number
    errorMessage?: string
    metadata?: Record<string, any>
  }
  context: {
    page?: string
    feature?: string
    userAgent?: string
    sessionId?: string
    ip?: string
  }
}

export interface SubmissionSummary {
  totalSubmissions: number
  successfulSubmissions: number
  failedSubmissions: number
  totalOrders: number
  successfulOrders: number
  failedOrders: number
  averageProcessingTime: number
  peakSubmissionTime: Date | null
  recentActivity: SubmissionEvent[]
}

export interface HistoryFilter {
  type?: SubmissionEvent['type'][]
  status?: SubmissionEvent['status'][]
  source?: SubmissionEvent['source'][]
  dateFrom?: Date
  dateTo?: Date
  userId?: string
  search?: string
  rebalanceId?: string
  portfolioId?: string
}

export interface HistoryExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  fields?: string[]
  filter?: HistoryFilter
  groupBy?: 'date' | 'user' | 'type' | 'status'
  includeDetails?: boolean
  includeContext?: boolean
}

class SubmissionHistoryService {
  private events: SubmissionEvent[] = []
  private maxEvents: number = 10000
  private storageKey: string = 'globeco_submission_history'
  private listeners: Set<(event: SubmissionEvent) => void> = new Set()

  constructor() {
    this.loadFromStorage()
    this.setupStorageSync()
  }

  // Event logging
  logEvent(eventData: Partial<SubmissionEvent>): SubmissionEvent {
    const event: SubmissionEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'user_action',
      operation: 'unknown',
      source: 'manual',
      status: 'pending',
      details: {},
      context: this.getContext(),
      ...eventData
    }

    this.events.unshift(event)
    
    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents)
    }

    this.saveToStorage()
    this.notifyListeners(event)

    return event
  }

  // Specialized logging methods
  logSubmission(data: {
    rebalanceId?: string
    portfolioId?: string
    orderIds: string[]
    source: SubmissionEvent['source']
    batchSize?: number
  }): SubmissionEvent {
    return this.logEvent({
      type: 'submission',
      operation: 'submit_orders',
      source: data.source,
      status: 'pending',
      details: {
        rebalanceId: data.rebalanceId,
        portfolioId: data.portfolioId,
        orderIds: data.orderIds,
        itemCount: data.orderIds.length,
        batchSize: data.batchSize
      }
    })
  }

  logSubmissionResult(eventId: string, result: {
    status: 'success' | 'partial' | 'failed'
    successCount: number
    errorCount: number
    duration: number
    errorMessage?: string
  }): void {
    const eventIndex = this.events.findIndex(e => e.id === eventId)
    if (eventIndex >= 0) {
      this.events[eventIndex] = {
        ...this.events[eventIndex],
        status: result.status,
        details: {
          ...this.events[eventIndex].details,
          successCount: result.successCount,
          errorCount: result.errorCount,
          duration: result.duration,
          errorMessage: result.errorMessage
        }
      }
      this.saveToStorage()
    }
  }

  logDeletion(data: {
    rebalanceId?: string
    portfolioId?: string
    itemCount: number
    cascading?: boolean
  }): SubmissionEvent {
    return this.logEvent({
      type: 'deletion',
      operation: data.cascading ? 'cascade_delete' : 'delete_item',
      source: 'manual',
      status: 'success',
      details: {
        rebalanceId: data.rebalanceId,
        portfolioId: data.portfolioId,
        itemCount: data.itemCount,
        metadata: { cascading: data.cascading }
      }
    })
  }

  logRetry(data: {
    originalEventId: string
    orderIds: string[]
    reason: string
  }): SubmissionEvent {
    return this.logEvent({
      type: 'retry',
      operation: 'retry_submission',
      source: 'manual',
      status: 'pending',
      details: {
        orderIds: data.orderIds,
        itemCount: data.orderIds.length,
        metadata: {
          originalEventId: data.originalEventId,
          reason: data.reason
        }
      }
    })
  }

  logBatchOperation(data: {
    operation: string
    itemCount: number
    batchSize: number
    source: SubmissionEvent['source']
  }): SubmissionEvent {
    return this.logEvent({
      type: 'batch_operation',
      operation: data.operation,
      source: data.source,
      status: 'pending',
      details: {
        itemCount: data.itemCount,
        batchSize: data.batchSize
      }
    })
  }

  // Querying and filtering
  getEvents(filter?: HistoryFilter, limit?: number): SubmissionEvent[] {
    let filteredEvents = [...this.events]

    if (filter) {
      if (filter.type?.length) {
        filteredEvents = filteredEvents.filter(e => filter.type!.includes(e.type))
      }
      
      if (filter.status?.length) {
        filteredEvents = filteredEvents.filter(e => filter.status!.includes(e.status))
      }
      
      if (filter.source?.length) {
        filteredEvents = filteredEvents.filter(e => filter.source!.includes(e.source))
      }
      
      if (filter.dateFrom) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.dateFrom!)
      }
      
      if (filter.dateTo) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filter.dateTo!)
      }
      
      if (filter.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filter.userId)
      }
      
      if (filter.rebalanceId) {
        filteredEvents = filteredEvents.filter(e => e.details.rebalanceId === filter.rebalanceId)
      }
      
      if (filter.portfolioId) {
        filteredEvents = filteredEvents.filter(e => e.details.portfolioId === filter.portfolioId)
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filteredEvents = filteredEvents.filter(e => 
          e.operation.toLowerCase().includes(searchLower) ||
          e.details.errorMessage?.toLowerCase().includes(searchLower) ||
          e.id.toLowerCase().includes(searchLower)
        )
      }
    }

    return limit ? filteredEvents.slice(0, limit) : filteredEvents
  }

  getSummary(dateFrom?: Date, dateTo?: Date): SubmissionSummary {
    const events = this.getEvents({
      dateFrom,
      dateTo,
      type: ['submission', 'batch_operation']
    })

    const submissions = events.filter(e => e.type === 'submission' || e.type === 'batch_operation')
    const successful = submissions.filter(e => e.status === 'success')
    const failed = submissions.filter(e => e.status === 'failed')
    
    const totalOrders = submissions.reduce((sum, e) => sum + (e.details.itemCount || 0), 0)
    const successfulOrders = submissions.reduce((sum, e) => sum + (e.details.successCount || 0), 0)
    const failedOrders = submissions.reduce((sum, e) => sum + (e.details.errorCount || 0), 0)
    
    const durations = submissions
      .filter(e => e.details.duration)
      .map(e => e.details.duration!)
    
    const averageProcessingTime = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0

    // Find peak submission time (hour with most submissions)
    const hourCounts = submissions.reduce((acc, e) => {
      const hour = new Date(e.timestamp).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    const peakHour = Object.entries(hourCounts)
      .reduce((max, [hour, count]) => count > max.count ? { hour: parseInt(hour), count } : max, { hour: 0, count: 0 })
    
    const peakSubmissionTime = peakHour.count > 0
      ? new Date(new Date().setHours(peakHour.hour, 0, 0, 0))
      : null

    return {
      totalSubmissions: submissions.length,
      successfulSubmissions: successful.length,
      failedSubmissions: failed.length,
      totalOrders,
      successfulOrders,
      failedOrders,
      averageProcessingTime,
      peakSubmissionTime,
      recentActivity: this.getEvents(undefined, 10)
    }
  }

  // Export functionality
  exportHistory(options: HistoryExportOptions): string | Blob {
    const events = this.getEvents(options.filter)
    
    switch (options.format) {
      case 'json':
        return this.exportAsJSON(events, options)
      case 'csv':
        return this.exportAsCSV(events, options)
      case 'xlsx':
        return this.exportAsXLSX(events, options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  private exportAsJSON(events: SubmissionEvent[], options: HistoryExportOptions): string {
    const data = events.map(event => {
      const exported: any = {
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        operation: event.operation,
        status: event.status,
        source: event.source
      }
      
      if (options.includeDetails) {
        exported.details = event.details
      }
      
      if (options.includeContext) {
        exported.context = event.context
      }
      
      if (options.fields) {
        const filtered: any = {}
        options.fields.forEach(field => {
          if (exported[field] !== undefined) {
            filtered[field] = exported[field]
          }
        })
        return filtered
      }
      
      return exported
    })

    return JSON.stringify(data, null, 2)
  }

  private exportAsCSV(events: SubmissionEvent[], options: HistoryExportOptions): string {
    const headers = options.fields || [
      'id', 'timestamp', 'type', 'operation', 'status', 'source',
      'itemCount', 'duration', 'errorMessage'
    ]
    
    const rows = events.map(event => {
      const row: any = {
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        operation: event.operation,
        status: event.status,
        source: event.source,
        itemCount: event.details.itemCount || '',
        duration: event.details.duration || '',
        errorMessage: event.details.errorMessage || ''
      }
      
      return headers.map(header => {
        const value = row[header] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }

  private exportAsXLSX(events: SubmissionEvent[], options: HistoryExportOptions): Blob {
    // For XLSX export, we'll create a simple CSV-like format
    // In a real implementation, you'd use a library like xlsx or exceljs
    const csvData = this.exportAsCSV(events, options)
    return new Blob([csvData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  // Event listeners
  addEventListener(listener: (event: SubmissionEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(event: SubmissionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error notifying history listener:', error)
      }
    })
  }

  // Storage management
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.events = data.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load submission history from storage:', error)
      this.events = []
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.events))
    } catch (error) {
      console.error('Failed to save submission history to storage:', error)
    }
  }

  private setupStorageSync(): void {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const data = JSON.parse(event.newValue)
          this.events = data.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp)
          }))
        } catch (error) {
          console.error('Failed to sync submission history from storage:', error)
        }
      }
    })
  }

  // Utility methods
  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getContext(): SubmissionEvent['context'] {
    return {
      page: window.location.pathname,
      feature: 'order-submission',
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      ip: 'unknown' // Would be set by server in real implementation
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('globeco_session_id')
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('globeco_session_id', sessionId)
    }
    return sessionId
  }

  // Cleanup and maintenance
  clearHistory(): void {
    this.events = []
    this.saveToStorage()
  }

  archiveOldEvents(daysOld: number = 30): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    const initialCount = this.events.length
    this.events = this.events.filter(e => e.timestamp > cutoffDate)
    
    const removedCount = initialCount - this.events.length
    if (removedCount > 0) {
      this.saveToStorage()
    }
    
    return removedCount
  }

  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? new Blob([stored]).size : 0
    } catch {
      return 0
    }
  }
}

// Create singleton instance
export const submissionHistory = new SubmissionHistoryService()

// React hook for using submission history
export function useSubmissionHistory() {
  const [events, setEvents] = useState<SubmissionEvent[]>([])
  const [summary, setSummary] = useState<SubmissionSummary | null>(null)

  useEffect(() => {
    // Initial load
    setEvents(submissionHistory.getEvents(undefined, 50))
    setSummary(submissionHistory.getSummary())

    // Listen for new events
    const unsubscribe = submissionHistory.addEventListener((event) => {
      setEvents(prev => [event, ...prev.slice(0, 49)])
      setSummary(submissionHistory.getSummary())
    })

    return unsubscribe
  }, [])

  return {
    events,
    summary,
    logEvent: submissionHistory.logEvent.bind(submissionHistory),
    logSubmission: submissionHistory.logSubmission.bind(submissionHistory),
    logSubmissionResult: submissionHistory.logSubmissionResult.bind(submissionHistory),
    logDeletion: submissionHistory.logDeletion.bind(submissionHistory),
    logRetry: submissionHistory.logRetry.bind(submissionHistory),
    logBatchOperation: submissionHistory.logBatchOperation.bind(submissionHistory),
    getEvents: submissionHistory.getEvents.bind(submissionHistory),
    getSummary: submissionHistory.getSummary.bind(submissionHistory),
    exportHistory: submissionHistory.exportHistory.bind(submissionHistory),
    clearHistory: submissionHistory.clearHistory.bind(submissionHistory),
    archiveOldEvents: submissionHistory.archiveOldEvents.bind(submissionHistory)
  }
} 