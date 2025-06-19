'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { executionService } from '@/lib/api/executionService'
import { 
  ExecutionPageDTO, 
  ExecutionFilters, 
  ExecutionSortField,
  SortDirection,
  ExecutionDTO 
} from '@/types/execution'

export interface UseExecutionsOptions {
  initialFilters?: ExecutionFilters
  initialPageSize?: number
  initialPage?: number
  initialSort?: {
    field: ExecutionSortField
    direction: SortDirection
  }
  enablePolling?: boolean
  pollingInterval?: number
}

export interface UseExecutionsResult {
  data: ExecutionPageDTO | null
  executions: ExecutionDTO[]
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
  filters: ExecutionFilters
  sorting: {
    field: ExecutionSortField
    direction: SortDirection
  }
  updateFilters: (newFilters: ExecutionFilters) => void
  updatePagination: (update: { page?: number; size?: number }) => void
  updateSorting: (field: ExecutionSortField, direction?: SortDirection) => void
  clearFilters: () => void
  isRefetching: boolean
}

const DEFAULT_PAGE_SIZE = 50
const DEFAULT_POLLING_INTERVAL = 30000 // 30 seconds

export const useExecutions = (options: UseExecutionsOptions = {}): UseExecutionsResult => {
  const {
    initialFilters = {}, // No default filters - show all executions
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialPage = 0,
    initialSort = { field: 'receivedTimestamp', direction: 'DESC' }, // Most recent first
    enablePolling = true, // Enable by default for real-time updates
    pollingInterval = DEFAULT_POLLING_INTERVAL
  } = options

  // State management
  const [data, setData] = useState<ExecutionPageDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<ExecutionFilters>(initialFilters)
  const [pagination, setPagination] = useState({
    offset: initialPage * initialPageSize,
    limit: initialPageSize
  })
  const [sorting, setSorting] = useState(initialSort)

  // Fetch function
  const fetchExecutions = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true)
      } else {
        setIsRefetching(true)
      }
      setError(null)

      // Build sort parameter with correct format (descending fields prefixed with '-')
      const sortField = sorting.direction === 'DESC' ? `-${sorting.field}` : sorting.field
      
      const response = await executionService.getExecutions({
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy: sortField,
        ...filters
      })

      setData(response)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch executions')
      setError(error)
      console.error('Error fetching executions:', error)
    } finally {
      setIsLoading(false)
      setIsRefetching(false)
    }
  }, [pagination, sorting, filters])

  // Initial data fetch
  useEffect(() => {
    fetchExecutions(true)
  }, [fetchExecutions])

  // Auto-refresh polling effect
  useEffect(() => {
    if (!enablePolling) return

    const interval = setInterval(() => {
      fetchExecutions(false) // Background refresh without loader
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [enablePolling, pollingInterval, fetchExecutions])

  // Update functions
  const updateFilters = useCallback((newFilters: ExecutionFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }, [])

  const updatePagination = useCallback((update: { page?: number; size?: number }) => {
    setPagination(prev => {
      // Convert page-based updates to offset-based
      let newPagination = { ...prev }
      
      if (update.size !== undefined) {
        newPagination.limit = update.size
      }
      
      if (update.page !== undefined) {
        newPagination.offset = update.page * (newPagination.limit || DEFAULT_PAGE_SIZE)
      }
      
      return newPagination
    })
  }, [])

  const updateSorting = useCallback((field: ExecutionSortField, direction?: SortDirection) => {
    setSorting(prev => ({
      field,
      direction: direction || (prev.field === field && prev.direction === 'ASC' ? 'DESC' : 'ASC')
    }))
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({}) // Clear all filters
    setPagination(prev => ({ ...prev, offset: 0 }))
  }, [])

  const refetch = useCallback(async () => {
    await fetchExecutions(false)
  }, [fetchExecutions])

  // Computed pagination info - convert offset/limit back to page-based for UI compatibility
  const paginationInfo = useMemo(() => {
    if (!data) {
      return {
        page: Math.floor(pagination.offset / pagination.limit),
        size: pagination.limit,
        totalPages: 0,
        totalElements: 0,
        hasNext: false,
        hasPrevious: false
      }
    }

    return {
      page: data.pagination.currentPage,
      size: data.pagination.limit,
      totalPages: data.pagination.totalPages,
      totalElements: data.pagination.totalElements,
      hasNext: data.pagination.hasNext,
      hasPrevious: data.pagination.hasPrevious
    }
  }, [data, pagination])

  // Extract executions array for easy access
  const executions = useMemo(() => {
    return data?.content || []
  }, [data])

  return {
    data,
    executions,
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