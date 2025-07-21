import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { withFetchTelemetry } from '@/lib/telemetry-axios'
import { 
  Model, 
  ModelCreateRequest, 
  ModelUpdateRequest, 
  ModelsQueryParams,
  ModelSortField,
  SortConfig 
} from '@/types/model'

const MODELS_PER_PAGE = 10

// Custom hook for model management
export function useModels() {
  const queryClient = useQueryClient()
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    direction: 'asc'
  })

  // Generate sort string for API
  const sortString = useMemo(() => {
    const prefix = sortConfig.direction === 'desc' ? '-' : ''
    return `${prefix}${sortConfig.field}`
  }, [sortConfig])

  // Infinite query for models with pagination and sorting
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
    queryKey: ['models', sortString],
    queryFn: async ({ pageParam = 0 }) => {
      const params: ModelsQueryParams = {
        offset: pageParam,
        limit: MODELS_PER_PAGE,
        sort_by: sortString
      }
      const query = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.set(key, String(value))
        }
      })
      const res = await withFetchTelemetry(
        async () => fetch(`/api/models?${query.toString()}`),
        'fetchModels',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to fetch models')
      return res.json()
    },
    getNextPageParam: (lastPage, pages) => {
      // If the last page has fewer items than the limit, we've reached the end
      if (lastPage.length < MODELS_PER_PAGE) {
        return undefined
      }
      return pages.length * MODELS_PER_PAGE
    },
    initialPageParam: 0,
  })

  // Flatten all pages into a single array
  const models = useMemo(() => {
    return data?.pages.flat() || []
  }, [data])

  // Create model mutation
  const createModelMutation = useMutation({
    mutationFn: async (model: ModelCreateRequest) => {
      const res = await withFetchTelemetry(
        async () => fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(model),
        }),
        'createModel',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to create model')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: async ({ modelId, model }: { modelId: string, model: ModelUpdateRequest }) => {
      const res = await withFetchTelemetry(
        async () => fetch(`/api/models/${modelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(model),
        }),
        'updateModel',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to update model')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Rebalance model mutation (now uses /api/models/[id]/rebalance API route)
  const rebalanceModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const res = await withFetchTelemetry(
        async () => fetch(`/api/models/${modelId}/rebalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
        'rebalanceModel',
        'frontend-api'
      )();
      if (!res.ok) throw new Error('Failed to rebalance model');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Sort functionality
  const handleSort = (field: ModelSortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Load more functionality for infinite scroll
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return {
    // Data
    models,
    isLoading,
    isError,
    error,
    
    // Pagination
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    
    // Sorting
    sortConfig,
    handleSort,
    
    // Mutations
    createModel: createModelMutation.mutate,
    updateModel: updateModelMutation.mutate,
    rebalanceModel: rebalanceModelMutation.mutate,
    
    // Mutation states
    isCreating: createModelMutation.isPending,
    isUpdating: updateModelMutation.isPending,
    isRebalancing: rebalanceModelMutation.isPending,
    
    // Mutation errors
    createError: createModelMutation.error,
    updateError: updateModelMutation.error,
    rebalanceError: rebalanceModelMutation.error,
    
    // Refetch
    refetch,
  }
}

// Custom hook for single model operations
export function useModel(modelId: string) {
  const queryClient = useQueryClient()

  // Get single model
  const { data: model, isLoading, isError, error } = useQuery({
    queryKey: ['model', modelId],
    queryFn: async () => {
      const res = await withFetchTelemetry(
        async () => fetch(`/api/models/${modelId}`),
        'fetchModel',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to fetch model')
      return res.json()
    },
    enabled: !!modelId,
  })

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: async (modelData: ModelUpdateRequest) => {
      const res = await withFetchTelemetry(
        async () => fetch(`/api/models/${modelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelData),
        }),
        'updateModelById',
        'frontend-api'
      )()
      if (!res.ok) throw new Error('Failed to update model')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['model', modelId] })
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Rebalance model mutation (now uses /api/models/[id]/rebalance API route)
  const rebalanceModelMutation = useMutation({
    mutationFn: async () => {
      const res = await withFetchTelemetry(
        async () => fetch(`/api/models/${modelId}/rebalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
        'rebalanceModelById',
        'frontend-api'
      )();
      if (!res.ok) throw new Error('Failed to rebalance model');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['model', modelId] })
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  return {
    model,
    isLoading,
    isError,
    error,
    updateModel: updateModelMutation.mutate,
    rebalanceModel: rebalanceModelMutation.mutate,
    isUpdating: updateModelMutation.isPending,
    isRebalancing: rebalanceModelMutation.isPending,
    updateError: updateModelMutation.error,
    rebalanceError: rebalanceModelMutation.error,
  }
} 