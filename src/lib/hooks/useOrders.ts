'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

// Stable default values to prevent re-renders
const STABLE_DEFAULT_FILTERS: OrderFilter[] = [{ field: 'status.abbreviation', values: ['NEW'], label: 'Status' }]
const STABLE_DEFAULT_SORT: OrderSortConfig[] = [{ field: 'id', direction: 'asc' }]

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const {
    defaultPageSize = 50,
    defaultFilters = STABLE_DEFAULT_FILTERS,
    defaultSort = STABLE_DEFAULT_SORT,
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

  // Use refs to track current values without causing re-renders
  const currentFiltersRef = useRef<OrderFilter[]>(defaultFilters)
  const currentSortRef = useRef<OrderSortConfig[]>(defaultSort)
  const currentPageRef = useRef<number>(1)
  const currentPageSizeRef = useRef<number>(defaultPageSize)

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

  // Update refs when state changes
  useEffect(() => {
    currentFiltersRef.current = filters
  }, [filters])

  useEffect(() => {
    currentSortRef.current = sort
  }, [sort])

  useEffect(() => {
    currentPageRef.current = pageFromUrl
  }, [pageFromUrl])

  useEffect(() => {
    currentPageSizeRef.current = pageSizeFromUrl
  }, [pageSizeFromUrl])

  // Update URL when state changes - stable function without dependencies on changing values
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



  // Fetch orders from API - completely stable function
  const fetchOrders = useCallback(async (
    currentFilters?: OrderFilter[],
    currentSort?: OrderSortConfig[],
    page?: number,
    pageSize?: number
  ) => {
    // Use provided values or current ref values
    const filtersToUse = currentFilters || currentFiltersRef.current
    const sortToUse = currentSort || currentSortRef.current
    const pageToUse = page || currentPageRef.current
    const pageSizeToUse = pageSize || currentPageSizeRef.current

    setLoading(true)
    setError(null)

    try {
      // Build query params inline to avoid dependency issues
      const params: OrderQueryParams = {
        limit: pageSizeToUse,
        offset: (pageToUse - 1) * pageSizeToUse
      }

      // Add sort parameter
      if (sortToUse.length > 0) {
        params.sort = sortToUse
          .map(s => `${s.direction === 'desc' ? '-' : ''}${s.field}`)
          .join(',')
      }

      // Add filter parameters
      filtersToUse.forEach(filter => {
        if (filter.values.length > 0) {
          const paramKey = filter.field as keyof OrderQueryParams
          (params as any)[paramKey] = filter.values.join(',')
        }
      })

      const response: OrderPageResponseDTO = await orderServiceApi.listOrders(params)
      
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
  }, []) // No dependencies - completely stable

  // Public API functions
  const setFilters = useCallback((newFilters: OrderFilter[]) => {
    setFiltersState(newFilters)
    updateUrl(newFilters, currentSortRef.current, 1, currentPageSizeRef.current) // Reset to page 1 when filters change
    fetchOrders(newFilters, currentSortRef.current, 1, currentPageSizeRef.current)
  }, [updateUrl]) // Removed fetchOrders dependency since it's stable

  const setSort = useCallback((newSort: OrderSortConfig[]) => {
    setSortState(newSort)
    updateUrl(currentFiltersRef.current, newSort, currentPageRef.current, currentPageSizeRef.current)
    fetchOrders(currentFiltersRef.current, newSort, currentPageRef.current, currentPageSizeRef.current)
  }, [updateUrl]) // Removed fetchOrders dependency since it's stable

  const goToPage = useCallback((page: number) => {
    updateUrl(currentFiltersRef.current, currentSortRef.current, page, currentPageSizeRef.current)
    fetchOrders(currentFiltersRef.current, currentSortRef.current, page, currentPageSizeRef.current)
  }, [updateUrl]) // Removed fetchOrders dependency since it's stable

  const changePageSize = useCallback((size: number) => {
    updateUrl(currentFiltersRef.current, currentSortRef.current, 1, size) // Reset to page 1 when page size changes
    fetchOrders(currentFiltersRef.current, currentSortRef.current, 1, size)
  }, [updateUrl]) // Removed fetchOrders dependency since it's stable

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
  }, []) // Removed fetchOrders dependency since it's stable

  const refetch = refresh // Alias for consistency

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

  // Track if initial load has happened
  const initialLoadRef = useRef(false)

  // Initial load - only run once on mount
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      fetchOrders()
    }
  }, []) // Empty dependency array - only run on mount

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (!loading) {
        fetchOrders()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loading]) // Removed fetchOrders dependency since it's stable

  // Sync state with URL changes - but don't trigger fetches here
  useEffect(() => {
    setFiltersState(filtersFromUrl)
  }, [filtersFromUrl])

  useEffect(() => {
    setSortState(sortFromUrl)
  }, [sortFromUrl])

  // Only fetch when URL parameters change significantly (not on every render)
  const prevUrlParamsRef = useRef<string>('')
  const urlChangeTimeoutRef = useRef<NodeJS.Timeout>()
  
  useEffect(() => {
    const currentUrlParams = `${JSON.stringify(filtersFromUrl)}-${JSON.stringify(sortFromUrl)}-${pageFromUrl}-${pageSizeFromUrl}`
    
    // Only fetch if this is not the initial load and URL actually changed
    if (initialLoadRef.current && prevUrlParamsRef.current !== '' && prevUrlParamsRef.current !== currentUrlParams) {
      // Clear any existing timeout
      if (urlChangeTimeoutRef.current) {
        clearTimeout(urlChangeTimeoutRef.current)
      }
      
      // URL changed, fetch with new parameters
      // Use a timeout to debounce rapid URL changes
      urlChangeTimeoutRef.current = setTimeout(() => {
        fetchOrders(filtersFromUrl, sortFromUrl, pageFromUrl, pageSizeFromUrl)
      }, 10)
    }
    
    prevUrlParamsRef.current = currentUrlParams
    
    // Cleanup timeout on unmount
    return () => {
      if (urlChangeTimeoutRef.current) {
        clearTimeout(urlChangeTimeoutRef.current)
      }
    }
  }, [filtersFromUrl, sortFromUrl, pageFromUrl, pageSizeFromUrl]) // Removed fetchOrders dependency

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