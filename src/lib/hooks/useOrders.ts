'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import orderServiceApi from '@/lib/api/orderService'
import {
  OrderWithDetailsDTO,
  OrderPageResponseDTO,
  OrderQueryParams,
  OrderFilter,
  OrderSortConfig
} from '@/types/order'

const ORDERS_PER_PAGE = 50
const ORDERS_ADDITIONAL_PAGE_SIZE = 25

interface UseOrdersOptions {
  defaultPageSize?: number
  defaultFilters?: OrderFilter[]
  defaultSort?: OrderSortConfig[]
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseOrdersReturn {
  // Data
  orders: OrderWithDetailsDTO[]
  loading: boolean
  error: string | null
  
  // Infinite scroll
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadMore: () => void
  
  // State management
  filters: OrderFilter[]
  sort: OrderSortConfig[]
  selectedOrderIds: number[]
  
  // Actions
  setFilters: (filters: OrderFilter[]) => void
  setSort: (sort: OrderSortConfig[]) => void
  setSelectedOrderIds: (ids: number[]) => void
  toggleOrderSelection: (orderId: number) => void
  selectAllOrders: () => void
  clearSelection: () => void
  
  // Data operations
  refresh: () => Promise<void>
  refetch: () => Promise<void>
}

// Stable default values to prevent re-renders
const STABLE_DEFAULT_FILTERS: OrderFilter[] = []
const STABLE_DEFAULT_SORT: OrderSortConfig[] = [{ field: 'id', direction: 'asc' }]

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const {
    defaultFilters = STABLE_DEFAULT_FILTERS,
    defaultSort = STABLE_DEFAULT_SORT,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options

  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Use refs for stable default values
  const defaultFiltersRef = useRef(defaultFilters)
  const defaultSortRef = useRef(defaultSort)

  // Update refs when defaults change
  useEffect(() => {
    defaultFiltersRef.current = defaultFilters
  }, [defaultFilters])

  useEffect(() => {
    defaultSortRef.current = defaultSort
  }, [defaultSort])

  // State
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([])

  // Parse URL parameters for filters and sort
  const filtersFromUrl = useMemo(() => {
    const filtersParam = searchParams.get('filters')
    if (filtersParam) {
      try {
        return JSON.parse(decodeURIComponent(filtersParam)) as OrderFilter[]
      } catch {
        return defaultFiltersRef.current
      }
    }
    return defaultFiltersRef.current
  }, [searchParams])

  const sortFromUrl = useMemo(() => {
    const sortParam = searchParams.get('sort')
    if (sortParam) {
      try {
        return JSON.parse(decodeURIComponent(sortParam)) as OrderSortConfig[]
      } catch {
        return defaultSortRef.current
      }
    }
    return defaultSortRef.current
  }, [searchParams])

  const [filters, setFiltersState] = useState<OrderFilter[]>(filtersFromUrl)
  const [sort, setSortState] = useState<OrderSortConfig[]>(sortFromUrl)

  // Use refs to track current values without causing re-renders
  const filtersRef = useRef<OrderFilter[]>(filters)
  const sortRef = useRef<OrderSortConfig[]>(sort)

  // Update refs when state changes
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    sortRef.current = sort
  }, [sort])

  // Generate sort string for API
  const sortString = useMemo(() => {
    if (sort.length === 0) return ''
    return sort
      .map(s => `${s.direction === 'desc' ? '-' : ''}${s.field}`)
      .join(',')
  }, [sort])

  // Generate filters string for query key
  const filtersString = useMemo(() => {
    return JSON.stringify(filters)
  }, [filters])

  // Update URL when state changes
  const updateUrl = useCallback((newFilters: OrderFilter[], newSort: OrderSortConfig[]) => {
    const params = new URLSearchParams()
    
    if (newFilters.length > 0) {
      params.set('filters', encodeURIComponent(JSON.stringify(newFilters)))
    }
    
    if (newSort.length > 0) {
      params.set('sort', encodeURIComponent(JSON.stringify(newSort)))
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [router, pathname])

  // Infinite query for orders with pagination and sorting
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['orders', sortString, filtersString],
    queryFn: async ({ pageParam = 0 }) => {
      const params: OrderQueryParams = {
        offset: pageParam,
        limit: pageParam === 0 ? ORDERS_PER_PAGE : ORDERS_ADDITIONAL_PAGE_SIZE
      }

      // Add sort parameter
      if (sortString) {
        params.sort = sortString
      }

      // Add filter parameters
      filters.forEach(filter => {
        if (filter.values.length > 0) {
          const paramKey = filter.field as keyof OrderQueryParams
          (params as any)[paramKey] = filter.values.join(',')
        }
      })

      const response: OrderPageResponseDTO = await orderServiceApi.listOrders(params)
      return response.content
    },
    getNextPageParam: (lastPage, pages) => {
      // If the last page has fewer items than expected, we've reached the end
      const expectedSize = pages.length === 1 ? ORDERS_PER_PAGE : ORDERS_ADDITIONAL_PAGE_SIZE
      if (lastPage.length < expectedSize) {
        return undefined
      }
      // Calculate next offset
      const totalLoaded = ORDERS_PER_PAGE + ((pages.length - 1) * ORDERS_ADDITIONAL_PAGE_SIZE)
      return totalLoaded
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Flatten all pages into a single array
  const orders = useMemo(() => {
    return data?.pages.flat() || []
  }, [data])

  // Public API functions
  const setFilters = useCallback((newFilters: OrderFilter[]) => {
    setFiltersState(newFilters)
    updateUrl(newFilters, sortRef.current)
    // Clear selection when filters change
    setSelectedOrderIds([])
  }, [updateUrl])

  const setSort = useCallback((newSort: OrderSortConfig[]) => {
    setSortState(newSort)
    updateUrl(filtersRef.current, newSort)
    // Clear selection when sort changes
    setSelectedOrderIds([])
  }, [updateUrl])

  // Load more functionality for infinite scroll
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Selection management
  const toggleOrderSelection = useCallback((orderId: number) => {
    setSelectedOrderIds(prev => {
      return prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    })
  }, [])

  const selectAllOrders = useCallback(() => {
    // Only select NEW orders (eligible for batch operations)
    const newOrderIds = orders
      .filter(order => order.status.abbreviation === 'NEW')
      .map(order => order.id)
    setSelectedOrderIds(newOrderIds)
  }, [orders])

  const clearSelection = useCallback(() => {
    setSelectedOrderIds([])
  }, [])

  // Sync state with URL changes
  useEffect(() => {
    setFiltersState(filtersFromUrl)
  }, [filtersFromUrl])

  useEffect(() => {
    setSortState(sortFromUrl)
  }, [sortFromUrl])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (!isLoading && !isFetchingNextPage) {
        refetch()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, isLoading, isFetchingNextPage, refetch])

  // Convert error to string
  const errorMessage = useMemo(() => {
    if (!isError || !error) return null
    return error instanceof Error ? error.message : 'Failed to fetch orders'
  }, [isError, error])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    // Data
    orders,
    loading: isLoading,
    error: errorMessage,
    
    // Infinite scroll
    hasNextPage: hasNextPage || false,
    isFetchingNextPage,
    loadMore,
    
    // State
    filters,
    sort,
    selectedOrderIds,
    
    // Actions
    setFilters,
    setSort,
    setSelectedOrderIds,
    toggleOrderSelection,
    selectAllOrders,
    clearSelection,
    
    // Data operations
    refresh,
    refetch: refresh
  }
} 