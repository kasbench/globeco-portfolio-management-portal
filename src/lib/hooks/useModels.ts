import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { orderGenerationApi } from '@/lib/api/orderGenerationService'
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
      return orderGenerationApi.getModels(params)
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
    mutationFn: (model: ModelCreateRequest) => orderGenerationApi.createModel(model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: ({ modelId, model }: { modelId: string, model: ModelUpdateRequest }) => 
      orderGenerationApi.updateModel(modelId, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Rebalance model mutation
  const rebalanceModelMutation = useMutation({
    mutationFn: (modelId: string) => orderGenerationApi.rebalanceModel(modelId),
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
    queryFn: () => orderGenerationApi.getModel(modelId),
    enabled: !!modelId,
  })

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: (modelData: ModelUpdateRequest) => 
      orderGenerationApi.updateModel(modelId, modelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['model', modelId] })
      queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })

  // Rebalance model mutation
  const rebalanceModelMutation = useMutation({
    mutationFn: () => orderGenerationApi.rebalanceModel(modelId),
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