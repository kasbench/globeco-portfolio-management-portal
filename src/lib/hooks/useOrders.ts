'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import orderServiceApi from '@/lib/api/orderService'
import {
  OrderWithDetailsDTO,
  OrderPageResponseDTO,
  PaginationMetadataDTO,
  OrderQueryParams,
  OrderFilter,
  OrderSortConfig,
  OrderManagementState
} from '@/types/order'

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
  pagination: PaginationMetadataDTO | null
  loading: boolean
  error: string | null
  
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
  
  // Pagination
  goToPage: (page: number) => void
  changePageSize: (size: number) => void
  nextPage: () => void
  previousPage: () => void
  
  // Data operations
  refresh: () => Promise<void>
  refetch: () => Promise<void>
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const {
    defaultPageSize = 50,
    defaultFilters = [{ field: 'status.abbreviation', values: ['NEW'], label: 'Status' }],
    defaultSort = [{ field: 'id', direction: 'asc' }],
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // State
  const [orders, setOrders] = useState<OrderWithDetailsDTO[]>([])
  const [pagination, setPagination] = useState<PaginationMetadataDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([])

  // Parse URL parameters for filters and sort
  const filtersFromUrl = useMemo(() => {
    const filtersParam = searchParams.get('filters')
    if (filtersParam) {
      try {
        return JSON.parse(decodeURIComponent(filtersParam)) as OrderFilter[]
      } catch {
        return defaultFilters
      }
    }
    return defaultFilters
  }, [searchParams, defaultFilters])

  const sortFromUrl = useMemo(() => {
    const sortParam = searchParams.get('sort')
    if (sortParam) {
      try {
        return JSON.parse(decodeURIComponent(sortParam)) as OrderSortConfig[]
      } catch {
        return defaultSort
      }
    }
    return defaultSort
  }, [searchParams, defaultSort])

  const pageFromUrl = useMemo(() => {
    const pageParam = searchParams.get('page')
    return pageParam ? parseInt(pageParam, 10) : 1
  }, [searchParams])

  const pageSizeFromUrl = useMemo(() => {
    const sizeParam = searchParams.get('pageSize')
    return sizeParam ? parseInt(sizeParam, 10) : defaultPageSize
  }, [searchParams, defaultPageSize])

  const [filters, setFiltersState] = useState<OrderFilter[]>(filtersFromUrl)
  const [sort, setSortState] = useState<OrderSortConfig[]>(sortFromUrl)

  // Update URL when state changes
  const updateUrl = useCallback((newFilters: OrderFilter[], newSort: OrderSortConfig[], page: number, pageSize: number) => {
    const params = new URLSearchParams()
    
    if (newFilters.length > 0) {
      params.set('filters', encodeURIComponent(JSON.stringify(newFilters)))
    }
    
    if (newSort.length > 0) {
      params.set('sort', encodeURIComponent(JSON.stringify(newSort)))
    }
    
    if (page > 1) {
      params.set('page', page.toString())
    }
    
    if (pageSize !== defaultPageSize) {
      params.set('pageSize', pageSize.toString())
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [router, pathname, defaultPageSize])

  // Convert filters and sort to API query parameters
  const buildQueryParams = useCallback((
    currentFilters: OrderFilter[], 
    currentSort: OrderSortConfig[], 
    page: number, 
    pageSize: number
  ): OrderQueryParams => {
    const params: OrderQueryParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize
    }

    // Add sort parameter
    if (currentSort.length > 0) {
      params.sort = currentSort
        .map(s => `${s.direction === 'desc' ? '-' : ''}${s.field}`)
        .join(',')
    }

    // Add filter parameters
    currentFilters.forEach(filter => {
      if (filter.values.length > 0) {
        const paramKey = filter.field as keyof OrderQueryParams
        (params as any)[paramKey] = filter.values.join(',')
      }
    })

    return params
  }, [])

  // Fetch orders from API
  const fetchOrders = useCallback(async (
    currentFilters: OrderFilter[] = filters,
    currentSort: OrderSortConfig[] = sort,
    page: number = pageFromUrl,
    pageSize: number = pageSizeFromUrl
  ) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = buildQueryParams(currentFilters, currentSort, page, pageSize)
      const response: OrderPageResponseDTO = await orderServiceApi.listOrders(queryParams)
      
      setOrders(response.content)
      setPagination(response.pagination)
      
      // Clear selection when data changes
      setSelectedOrderIds([])
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders'
      setError(errorMessage)
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, sort, pageFromUrl, pageSizeFromUrl, buildQueryParams])

  // Public API functions
  const setFilters = useCallback((newFilters: OrderFilter[]) => {
    setFiltersState(newFilters)
    updateUrl(newFilters, sort, 1, pageSizeFromUrl) // Reset to page 1 when filters change
    fetchOrders(newFilters, sort, 1, pageSizeFromUrl)
  }, [sort, pageSizeFromUrl, updateUrl, fetchOrders])

  const setSort = useCallback((newSort: OrderSortConfig[]) => {
    setSortState(newSort)
    updateUrl(filters, newSort, pageFromUrl, pageSizeFromUrl)
    fetchOrders(filters, newSort, pageFromUrl, pageSizeFromUrl)
  }, [filters, pageFromUrl, pageSizeFromUrl, updateUrl, fetchOrders])

  const goToPage = useCallback((page: number) => {
    updateUrl(filters, sort, page, pageSizeFromUrl)
    fetchOrders(filters, sort, page, pageSizeFromUrl)
  }, [filters, sort, pageSizeFromUrl, updateUrl, fetchOrders])

  const changePageSize = useCallback((size: number) => {
    updateUrl(filters, sort, 1, size) // Reset to page 1 when page size changes
    fetchOrders(filters, sort, 1, size)
  }, [filters, sort, updateUrl, fetchOrders])

  const nextPage = useCallback(() => {
    if (pagination?.hasNext) {
      const nextPageNum = Math.floor(pagination.offset / pagination.pageSize) + 2
      goToPage(nextPageNum)
    }
  }, [pagination, goToPage])

  const previousPage = useCallback(() => {
    if (pagination?.hasPrevious) {
      const prevPageNum = Math.floor(pagination.offset / pagination.pageSize)
      goToPage(Math.max(1, prevPageNum))
    }
  }, [pagination, goToPage])

  const refresh = useCallback(async () => {
    await fetchOrders()
  }, [fetchOrders])

  const refetch = refresh // Alias for consistency

  // Selection management
  const toggleOrderSelection = useCallback((orderId: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
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

  // Initial load and URL sync
  useEffect(() => {
    fetchOrders()
  }, []) // Only run on mount

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (!loading) {
        fetchOrders()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loading, fetchOrders])

  // Sync state with URL changes
  useEffect(() => {
    setFiltersState(filtersFromUrl)
    setSortState(sortFromUrl)
  }, [filtersFromUrl, sortFromUrl])

  return {
    // Data
    orders,
    pagination,
    loading,
    error,
    
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
    
    // Pagination
    goToPage,
    changePageSize,
    nextPage,
    previousPage,
    
    // Data operations
    refresh,
    refetch
  }
} 