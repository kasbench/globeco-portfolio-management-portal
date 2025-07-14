'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TradeService } from '@/lib/api/tradeService'
import { 
  TradeOrderPageResponseDTO, 
  TradeOrderFilters, 
  TradeOrderSortField,
  SortDirection 
} from '@/types/trade'

export interface UseTradeOrdersOptions {
  initialFilters?: TradeOrderFilters
  initialPageSize?: number
  initialPage?: number
  initialSort?: {
    field: TradeOrderSortField
    direction: SortDirection
  }
  enablePolling?: boolean
  pollingInterval?: number
}

export interface UseTradeOrdersResult {
  data: TradeOrderPageResponseDTO | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  pagination: {
    page: number
    size: number
    totalPages: number
    totalElements: number
    hasNext: boolean
    hasPrevious: boolean
  }
  filters: TradeOrderFilters
  sorting: {
    field: TradeOrderSortField
    direction: SortDirection
  }
  updateFilters: (newFilters: TradeOrderFilters) => void
  updatePagination: (update: { page?: number; size?: number }) => void
  updateSorting: (field: TradeOrderSortField, direction?: SortDirection) => void
  clearFilters: () => void
  isRefetching: boolean
}

const DEFAULT_PAGE_SIZE = 25
const DEFAULT_POLLING_INTERVAL = 30000 // 30 seconds

export const useTradeOrders = (options: UseTradeOrdersOptions = {}): UseTradeOrdersResult => {
  const {
    initialFilters = {},  // Don't force a default filter - let users see all orders
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialPage = 0,
    initialSort = { field: 'tradeTimestamp', direction: 'DESC' },
    enablePolling = false,
    pollingInterval = DEFAULT_POLLING_INTERVAL
  } = options

  // State management
  const [data, setData] = useState<TradeOrderPageResponseDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<TradeOrderFilters>(initialFilters)
  const [pagination, setPagination] = useState({
    offset: initialPage * initialPageSize,  // Convert page to offset
    limit: initialPageSize
  })
  const [sorting, setSorting] = useState(initialSort)

  // Trade service instance
  const tradeService = useMemo(() => new TradeService(), [])

  // Fetch function
  const fetchTradeOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true)
      } else {
        setIsRefetching(true)
      }
      setError(null)

      // Build sort parameter with correct format (descending fields prefixed with '-')
      const sortField = sorting.direction === 'DESC' ? `-${sorting.field}` : sorting.field
      
      const response = await tradeService.getTradeOrders({
        limit: pagination.limit,
        offset: pagination.offset,
        sort: sortField,
        ...filters
      })

      setData(response)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch trade orders')
      setError(error)
      console.error('Error fetching trade orders:', error)
    } finally {
      setIsLoading(false)
      setIsRefetching(false)
    }
  }, [tradeService, pagination, sorting, filters])

  // Initial data fetch
  useEffect(() => {
    fetchTradeOrders(true)
  }, [fetchTradeOrders])

  // Polling effect
  useEffect(() => {
    if (!enablePolling) return

    const interval = setInterval(() => {
      fetchTradeOrders(false)
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [enablePolling, pollingInterval, fetchTradeOrders])

  // Update functions
  const updateFilters = useCallback((newFilters: TradeOrderFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }, [])

  const updatePagination = useCallback((update: { page?: number; size?: number }) => {
    setPagination(prev => {
      // Convert page-based updates to offset-based
      const newPagination = { ...prev }
      
      if (update.size !== undefined) {
        newPagination.limit = update.size
      }
      
      if (update.page !== undefined) {
        newPagination.offset = update.page * (newPagination.limit || DEFAULT_PAGE_SIZE)
      }
      
      return newPagination
    })
  }, [])

  const updateSorting = useCallback((field: TradeOrderSortField, direction?: SortDirection) => {
    setSorting(prev => ({
      field,
      direction: direction || (prev.field === field && prev.direction === 'ASC' ? 'DESC' : 'ASC')
    }))
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({}) // Clear all filters - no forced defaults
    setPagination(prev => ({ ...prev, offset: 0 }))
  }, [])

  const refetch = useCallback(async () => {
    await fetchTradeOrders(false)
  }, [fetchTradeOrders])

  // Computed pagination info - convert offset/limit back to page-based for UI compatibility
  const paginationInfo = useMemo(() => {
    const currentPage = Math.floor(pagination.offset / pagination.limit)
    
    if (!data) {
      return {
        page: currentPage,
        size: pagination.limit,
        totalPages: 0,
        totalElements: 0,
        hasNext: false,
        hasPrevious: false
      }
    }

    return {
      page: data.number,
      size: data.size,
      totalPages: data.totalPages,
      totalElements: data.totalElements,
      hasNext: !data.last,
      hasPrevious: !data.first
    }
  }, [data, pagination])

  return {
    data,
    isLoading,
    error,
    refetch,
    pagination: paginationInfo,
    filters,
    sorting,
    updateFilters,
    updatePagination,
    updateSorting,
    clearFilters,
    isRefetching
  }
} 