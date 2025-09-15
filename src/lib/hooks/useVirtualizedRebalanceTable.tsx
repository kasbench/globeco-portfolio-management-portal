// Hook for virtualized rebalance table with performance optimizations
// Integrates virtual scrolling with rebalance data and submission management

'use client'

import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { VirtualTableColumn } from '@/components/ui/VirtualScrollTable'
import { 
  RebalanceWithSubmission,
  RebalancePortfolioWithSubmission,
  RebalancePositionWithSubmission
} from '@/types/rebalance'
import { SubmissionState } from '@/types/order'
import { ChunkedProcessor, performanceMonitor } from '@/lib/utils/performance'

export interface VirtualizedTableConfig {
  itemsPerPage: number
  enableLazyLoading: boolean
  enableVirtualization: boolean
  estimatedRowHeight: number
  overscanCount: number
  chunkSize: number
  memoryThreshold: number // MB
}

export interface VirtualizedTableData<T> {
  items: T[]
  totalCount: number
  loadedChunks: Set<number>
  isLoading: boolean
  error: string | null
}

export interface VirtualizedRebalanceTableHook {
  // Data state
  rebalanceData: VirtualizedTableData<RebalanceWithSubmission>
  portfolioData: VirtualizedTableData<RebalancePortfolioWithSubmission>
  positionData: VirtualizedTableData<RebalancePositionWithSubmission>
  
  // Table configuration
  config: VirtualizedTableConfig
  updateConfig: (updates: Partial<VirtualizedTableConfig>) => void
  
  // Column definitions
  rebalanceColumns: VirtualTableColumn<RebalanceWithSubmission>[]
  portfolioColumns: VirtualTableColumn<RebalancePortfolioWithSubmission>[]
  positionColumns: VirtualTableColumn<RebalancePositionWithSubmission>[]
  
  // Data loading
  loadRebalanceChunk: (chunkIndex: number) => Promise<void>
  loadPortfolioChunk: (rebalanceId: string, chunkIndex: number) => Promise<void>
  loadPositionChunk: (portfolioId: string, chunkIndex: number) => Promise<void>
  
  // Performance metrics
  getPerformanceMetrics: () => any
  clearPerformanceMetrics: () => void
  
  // Memory management
  getMemoryUsage: () => {
    estimatedMB: number
    itemCount: number
    chunksLoaded: number
  }
  unloadUnusedChunks: () => void
}

const DEFAULT_CONFIG: VirtualizedTableConfig = {
  itemsPerPage: 100,
  enableLazyLoading: true,
  enableVirtualization: true,
  estimatedRowHeight: 48,
  overscanCount: 10,
  chunkSize: 1000,
  memoryThreshold: 50 // 50MB
}

export function useVirtualizedRebalanceTable(
  initialRebalances: RebalanceWithSubmission[] = [],
  options: Partial<VirtualizedTableConfig> = {}
): VirtualizedRebalanceTableHook {
  
  // Configuration state
  const [config, setConfig] = useState<VirtualizedTableConfig>({
    ...DEFAULT_CONFIG,
    ...options
  })

  // Data state
  const [rebalanceData, setRebalanceData] = useState<VirtualizedTableData<RebalanceWithSubmission>>({
    items: initialRebalances,
    totalCount: initialRebalances.length,
    loadedChunks: new Set([0]),
    isLoading: false,
    error: null
  })

  const [portfolioData, setPortfolioData] = useState<VirtualizedTableData<RebalancePortfolioWithSubmission>>({
    items: [],
    totalCount: 0,
    loadedChunks: new Set(),
    isLoading: false,
    error: null
  })

  const [positionData, setPositionData] = useState<VirtualizedTableData<RebalancePositionWithSubmission>>({
    items: [],
    totalCount: 0,
    loadedChunks: new Set(),
    isLoading: false,
    error: null
  })

  // Chunked data processor
  const dataProcessor = useMemo(() => 
    new ChunkedProcessor<any, any>(
      async (chunk) => chunk, // Pass-through processor
      config.chunkSize,
      2 // Process 2 chunks concurrently
    ), [config.chunkSize]
  )

  // Update configuration
  const updateConfig = useCallback((updates: Partial<VirtualizedTableConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Rebalance columns definition
  const rebalanceColumns = useMemo((): VirtualTableColumn<RebalanceWithSubmission>[] => [
    {
      key: 'rebalance_id',
      header: 'Rebalance ID',
      width: 150,
      sortable: true,
      render: (rebalance) => (
        <span className="font-mono text-sm">{rebalance.rebalance_id}</span>
      )
    },
    {
      key: 'model_name',
      header: 'Model',
      width: 200,
      sortable: true,
      render: (rebalance) => (
        <span className="font-medium">{rebalance.model_name}</span>
      )
    },
    {
      key: 'portfolios_count',
      header: 'Portfolios',
      width: 100,
      sortable: true,
      render: (rebalance) => (
        <span className="text-center">{rebalance.portfolios.length}</span>
      )
    },
    {
      key: 'eligible_orders',
      header: 'Eligible Orders',
      width: 120,
      sortable: true,
      render: (rebalance) => (
        <span className="text-center font-semibold text-blue-600">
          {rebalance.totalEligibleOrders}
        </span>
      )
    },
    {
      key: 'submission_status',
      header: 'Status',
      width: 120,
      render: (rebalance) => {
        const status = rebalance.submission || SubmissionState.NotSubmitted
        const statusColors = {
          [SubmissionState.NotSubmitted]: 'bg-gray-100 text-gray-800',
          [SubmissionState.Pending]: 'bg-blue-100 text-blue-800',
          [SubmissionState.Submitting]: 'bg-yellow-100 text-yellow-800',
          [SubmissionState.Submitted]: 'bg-green-100 text-green-800',
          [SubmissionState.PartiallySubmitted]: 'bg-orange-100 text-orange-800',
          [SubmissionState.Failed]: 'bg-red-100 text-red-800'
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status}
          </span>
        )
      }
    },
    {
      key: 'rebalance_date',
      header: 'Date',
      width: 120,
      sortable: true,
      render: (rebalance) => (
        <span className="text-sm">{rebalance.rebalance_date}</span>
      )
    }
  ], [])

  // Portfolio columns definition
  const portfolioColumns = useMemo((): VirtualTableColumn<RebalancePortfolioWithSubmission>[] => [
    {
      key: 'portfolio_id',
      header: 'Portfolio ID',
      width: 150,
      render: (portfolio) => (
        <span className="font-mono text-sm">{portfolio.portfolio_id}</span>
      )
    },
    {
      key: 'positions_count',
      header: 'Positions',
      width: 100,
      render: (portfolio) => (
        <span className="text-center">{portfolio.positions.length}</span>
      )
    },
    {
      key: 'eligible_orders',
      header: 'Eligible Orders',
      width: 120,
      render: (portfolio) => (
        <span className="text-center font-semibold text-blue-600">
          {portfolio.eligibleOrderCount}
        </span>
      )
    },
    {
      key: 'submission_status',
      header: 'Status',
      width: 120,
      render: (portfolio) => {
        const status = portfolio.submission || SubmissionState.NotSubmitted
        const statusColors = {
          [SubmissionState.NotSubmitted]: 'bg-gray-100 text-gray-800',
          [SubmissionState.Pending]: 'bg-blue-100 text-blue-800',
          [SubmissionState.Submitting]: 'bg-yellow-100 text-yellow-800',
          [SubmissionState.Submitted]: 'bg-green-100 text-green-800',
          [SubmissionState.PartiallySubmitted]: 'bg-orange-100 text-orange-800',
          [SubmissionState.Failed]: 'bg-red-100 text-red-800'
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status}
          </span>
        )
      }
    }
  ], [])

  // Position columns definition
  const positionColumns = useMemo((): VirtualTableColumn<RebalancePositionWithSubmission>[] => [
    {
      key: 'security_id',
      header: 'Security ID',
      width: 120,
      render: (position) => (
        <span className="font-mono text-xs">{position.security_id}</span>
      )
    },
    {
      key: 'transaction_type',
      header: 'Type',
      width: 80,
      render: (position) => {
        const typeColors = {
          BUY: 'text-green-600 bg-green-50',
          SELL: 'text-red-600 bg-red-50',
          HOLD: 'text-gray-600 bg-gray-50'
        }
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[position.transaction_type]}`}>
            {position.transaction_type}
          </span>
        )
      }
    },
    {
      key: 'trade_quantity',
      header: 'Quantity',
      width: 100,
      render: (position) => (
        <span className={`text-right font-mono text-sm ${
          position.trade_quantity > 0 ? 'text-green-600' : 
          position.trade_quantity < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {position.trade_quantity.toLocaleString()}
        </span>
      )
    },
    {
      key: 'price',
      header: 'Price',
      width: 100,
      render: (position) => (
        <span className="text-right font-mono text-sm">
          ${position.price.toFixed(2)}
        </span>
      )
    },
    {
      key: 'eligible',
      header: 'Eligible',
      width: 80,
      render: (position) => (
        <span className={`text-center ${position.isEligibleForSubmission ? 'text-green-600' : 'text-gray-400'}`}>
          {position.isEligibleForSubmission ? '✓' : '—'}
        </span>
      )
    }
  ], [])

  // Data loading functions
  const loadRebalanceChunk = useCallback(async (chunkIndex: number): Promise<void> => {
    if (rebalanceData.loadedChunks.has(chunkIndex)) {
      return // Already loaded
    }

    setRebalanceData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await performanceMonitor.time('loadRebalanceChunk', async () => {
        // Simulate loading delay for demo
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const startIndex = chunkIndex * config.chunkSize
        const endIndex = Math.min(startIndex + config.chunkSize, rebalanceData.totalCount)
        
        // In a real implementation, this would fetch from an API
        // For now, we'll just mark the chunk as loaded
        setRebalanceData(prev => ({
          ...prev,
          loadedChunks: new Set([...prev.loadedChunks, chunkIndex]),
          isLoading: false
        }))
      })
    } catch (error) {
      setRebalanceData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [rebalanceData.loadedChunks, rebalanceData.totalCount, config.chunkSize])

  const loadPortfolioChunk = useCallback(async (rebalanceId: string, chunkIndex: number): Promise<void> => {
    // Similar implementation for portfolio data
    // console.log(`Loading portfolio chunk ${chunkIndex} for rebalance ${rebalanceId}`)
  }, [])

  const loadPositionChunk = useCallback(async (portfolioId: string, chunkIndex: number): Promise<void> => {
    // Similar implementation for position data
    // console.log(`Loading position chunk ${chunkIndex} for portfolio ${portfolioId}`)
  }, [])

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    return performanceMonitor.getStats()
  }, [])

  const clearPerformanceMetrics = useCallback(() => {
    performanceMonitor.clear()
  }, [])

  // Memory management
  const getMemoryUsage = useCallback(() => {
    const rebalanceSize = rebalanceData.items.length * 1024 // Rough estimate in bytes
    const portfolioSize = portfolioData.items.length * 512
    const positionSize = positionData.items.length * 256
    
    const totalBytes = rebalanceSize + portfolioSize + positionSize
    const totalMB = totalBytes / (1024 * 1024)
    
    return {
      estimatedMB: totalMB,
      itemCount: rebalanceData.items.length + portfolioData.items.length + positionData.items.length,
      chunksLoaded: rebalanceData.loadedChunks.size + portfolioData.loadedChunks.size + positionData.loadedChunks.size
    }
  }, [rebalanceData, portfolioData, positionData])

  const unloadUnusedChunks = useCallback(() => {
    const memoryUsage = getMemoryUsage()
    
    if (memoryUsage.estimatedMB > config.memoryThreshold) {
      // Implement LRU cache logic to unload oldest chunks
      // console.log('Memory threshold exceeded, unloading unused chunks')
      
      // For now, just clear some data
      setPortfolioData(prev => ({
        ...prev,
        items: prev.items.slice(-Math.floor(prev.items.length / 2)),
        loadedChunks: new Set()
      }))
      
      setPositionData(prev => ({
        ...prev,
        items: prev.items.slice(-Math.floor(prev.items.length / 2)),
        loadedChunks: new Set()
      }))
    }
  }, [getMemoryUsage, config.memoryThreshold])

  // Auto cleanup on memory threshold
  useEffect(() => {
    const interval = setInterval(() => {
      const memoryUsage = getMemoryUsage()
      if (memoryUsage.estimatedMB > config.memoryThreshold) {
        unloadUnusedChunks()
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [getMemoryUsage, config.memoryThreshold, unloadUnusedChunks])

  return {
    rebalanceData,
    portfolioData,
    positionData,
    config,
    updateConfig,
    rebalanceColumns,
    portfolioColumns,
    positionColumns,
    loadRebalanceChunk,
    loadPortfolioChunk,
    loadPositionChunk,
    getPerformanceMetrics,
    clearPerformanceMetrics,
    getMemoryUsage,
    unloadUnusedChunks
  }
} 