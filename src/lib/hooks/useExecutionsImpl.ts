import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { withFetchTelemetry } from '@/lib/telemetry-axios'
import { 
  EnhancedExecutionDTO,
  ExecutionFilters, 
  ExecutionSortField,
  SortDirection,
  PaginationDTO,
  ExecutionQueryParams
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
  data: { content: EnhancedExecutionDTO[]; pagination: PaginationDTO } | undefined
  executions: EnhancedExecutionDTO[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<any>
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
  }[]
  updateFilters: (newFilters: ExecutionFilters) => void
  updatePagination: (update: { page?: number; size?: number }) => void
  updateSorting: (sort: Array<{ field: ExecutionSortField; direction: SortDirection }>) => void
  clearFilters: () => void
  isRefetching: boolean
}

const DEFAULT_PAGE_SIZE = 50
const DEFAULT_POLLING_INTERVAL = 30000 // 30 seconds

/**
 * Convert filter object to query parameters
 */
const convertFiltersToQueryParams = (filters: ExecutionFilters): Record<string, string> => {
  const params: Record<string, string> = {}
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        params[key] = value.join(',')
      } else {
        params[key] = value.toString()
      }
    }
  })
  
  return params
}

/**
 * Format sort parameters for API
 */
const formatSortParams = (sorting: Array<{ field: ExecutionSortField; direction: SortDirection }>): string => {
  return sorting
    .map(sort => sort.direction === 'DESC' ? `-${sort.field}` : sort.field)
    .join(',')
}

export const useExecutions = (options: UseExecutionsOptions = {}): UseExecutionsResult => {
  const {
    initialFilters = {},
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialPage = 0,
    initialSort = { field: 'receivedTimestamp', direction: 'DESC' },
    enablePolling = true,
    pollingInterval = DEFAULT_POLLING_INTERVAL
  } = options

  // State management
  const [filters, setFilters] = useState<ExecutionFilters>(initialFilters)
  const [pagination, setPagination] = useState({
    offset: initialPage * initialPageSize,
    limit: initialPageSize
  })
  const [sorting, setSorting] = useState([initialSort])

  // React Query for data fetching
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['executions', filters, pagination, sorting],
    queryFn: async () => {
      const params: ExecutionQueryParams = {
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy: formatSortParams(sorting),
        ...convertFiltersToQueryParams(filters)
      }

      // console.log('Fetching executions with params:', params)
      // Build query string
      const queryString = new URLSearchParams(params as any).toString()
      const res = await withFetchTelemetry(
        async () => fetch(`/api/executions?${queryString}`),
        'fetchExecutions',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to fetch executions')
      return res.json()
    },
    staleTime: enablePolling ? 30000 : 5 * 60 * 1000, // 30s if polling, 5min otherwise
    refetchInterval: enablePolling ? pollingInterval : false,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for 4xx errors
      if (failureCount >= 3) return false
      const status = (error as any)?.status
      return !status || status >= 500
    }
  })

  // Update functions
  const updateFilters = useCallback((newFilters: ExecutionFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }, [])

  const updatePagination = useCallback((update: { page?: number; size?: number }) => {
    setPagination(prev => {
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

  const updateSorting = useCallback((newSorting: Array<{ field: ExecutionSortField; direction: SortDirection }>) => {
    setSorting(newSorting)
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setPagination(prev => ({ ...prev, offset: 0 }))
  }, [])

  // Computed pagination info
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
    error: error as Error | null,
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