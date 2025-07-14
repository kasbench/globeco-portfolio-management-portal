// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('orderGenerationService.ts must not be imported on the client side.');
}

import axios, { AxiosResponse } from 'axios'
import { 
  Model, 
  ModelCreateRequest, 
  ModelUpdateRequest, 
  ModelPortfolioRequest,
  ModelsQueryParams,
  RebalanceResult,
  ModelPositionInput
} from '@/types/model'
import {
  Rebalance,
  RebalancePortfolio,
  RebalancePosition,
  RebalancesQueryParams
} from '@/types/rebalance'

// Order Generation Service configuration (server-side only)
const ORDER_GENERATION_SERVICE_HOST = process.env.ORDER_GENERATION_SERVICE_HOST || 'globeco-order-generation-service.globeco'
const ORDER_GENERATION_SERVICE_PORT = process.env.ORDER_GENERATION_SERVICE_PORT || '8088'
const BASE_URL = `http://${ORDER_GENERATION_SERVICE_HOST}:${ORDER_GENERATION_SERVICE_PORT}`

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to log requests in development
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const errorDetails = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
      }
      console.error('API Response Error:', errorDetails)
      
      // Enhance error message for better debugging
      const errorMessage = error.response.data?.detail || 
                          error.response.data?.message || 
                          `HTTP ${error.response.status}: ${error.response.statusText}`
      throw new Error(`API Error: ${errorMessage}`)
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Network Error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
      throw new Error(`Network Error: Unable to connect to ${error.config?.baseURL}`)
    } else {
      // Something else happened
      console.error('API Configuration Error:', error.message)
      throw new Error(`Configuration Error: ${error.message}`)
    }
  }
)

// Model Management API Functions
export const orderGenerationApi = {
  // Get all models with pagination and sorting
  getModels: async (params: ModelsQueryParams = {}): Promise<Model[]> => {
    const response: AxiosResponse<Model[]> = await apiClient.get('/api/v1/models', {
      params: {
        offset: params.offset,
        limit: params.limit,
        sort_by: params.sort_by,
      },
    })
    return response.data
  },

  // Get model by ID
  getModel: async (modelId: string): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.get(`/api/v1/model/${modelId}`)
    return response.data
  },

  // Create new model
  createModel: async (model: ModelCreateRequest): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.post('/api/v1/models', model)
    return response.data
  },

  // Update existing model
  updateModel: async (modelId: string, model: ModelUpdateRequest): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.put(`/api/v1/model/${modelId}`, model)
    return response.data
  },

  // Add position to model
  addPosition: async (modelId: string, position: ModelPositionInput): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.post(
      `/api/v1/model/${modelId}/position`, 
      position
    )
    return response.data
  },

  // Update position in model
  updatePosition: async (modelId: string, position: ModelPositionInput): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.put(
      `/api/v1/model/${modelId}/position`, 
      position
    )
    return response.data
  },

  // Remove position from model
  removePosition: async (modelId: string, position: ModelPositionInput): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.delete(
      `/api/v1/model/${modelId}/position`,
      { data: position }
    )
    return response.data
  },

  // Add portfolios to model
  addPortfolios: async (modelId: string, portfolios: ModelPortfolioRequest): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.post(
      `/api/v1/model/${modelId}/portfolio`, 
      portfolios
    )
    return response.data
  },

  // Remove portfolios from model
  removePortfolios: async (modelId: string, portfolios: ModelPortfolioRequest): Promise<Model> => {
    const response: AxiosResponse<Model> = await apiClient.delete(
      `/api/v1/model/${modelId}/portfolio`,
      { data: portfolios }
    )
    return response.data
  },

  // Rebalance model portfolios
  rebalanceModel: async (modelId: string): Promise<RebalanceResult[]> => {
    const response: AxiosResponse<RebalanceResult[]> = await apiClient.post(
      `/api/v1/model/${modelId}/rebalance`
    )
    return response.data
  },

  // Rebalance single portfolio
  rebalancePortfolio: async (portfolioId: string): Promise<RebalanceResult> => {
    const response: AxiosResponse<RebalanceResult> = await apiClient.post(
      `/api/v1/portfolio/${portfolioId}/rebalance`
    )
    return response.data
  },

  // Health check endpoints
  healthCheck: async (): Promise<any> => {
    const response = await apiClient.get('/health/health')
    return response.data
  },

  livenessCheck: async (): Promise<any> => {
    const response = await apiClient.get('/health/live')
    return response.data
  },

  readinessCheck: async (): Promise<any> => {
    const response = await apiClient.get('/health/ready')
    return response.data
  },

  // Rebalance Results API Functions
  // Get all rebalances with pagination and sorting
  getRebalances: async (params: RebalancesQueryParams = {}): Promise<Rebalance[]> => {
    // Use mock data in development when service is not available
    if (process.env.NODE_ENV === 'development') {
      try {
        const response: AxiosResponse<Rebalance[]> = await apiClient.get('/api/v1/rebalances', {
          params: {
            offset: params.offset,
            limit: params.limit,
            sort_by: params.sort_by,
          },
        })
        return response.data
      } catch (error) {
        console.warn('Order Generation Service not available, using mock data:', error)
        const { getMockRebalancesPage } = await import('./mockRebalanceData')
        return getMockRebalancesPage(params.offset, params.limit)
      }
    } else {
      const response: AxiosResponse<Rebalance[]> = await apiClient.get('/api/v1/rebalances', {
        params: {
          offset: params.offset,
          limit: params.limit,
          sort_by: params.sort_by,
        },
      })
      return response.data
    }
  },

  // Get rebalance by ID with full nested data
  getRebalance: async (rebalanceId: string): Promise<Rebalance> => {
    if (process.env.NODE_ENV === 'development') {
      try {
        const response: AxiosResponse<Rebalance> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`)
        return response.data
      } catch (error) {
        console.warn('Order Generation Service not available, using mock data:', error)
        const { getMockRebalance } = await import('./mockRebalanceData')
        return getMockRebalance(rebalanceId)
      }
    } else {
      const response: AxiosResponse<Rebalance> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`)
      return response.data
    }
  },

  // Verify if rebalance exists (silent - no error logging for 404)
  verifyRebalanceExists: async (rebalanceId: string): Promise<boolean> => {
    try {
      // Create a custom axios instance without error interceptors for silent verification
      const silentClient = axios.create({
        baseURL: apiClient.defaults.baseURL,
        timeout: apiClient.defaults.timeout,
        headers: apiClient.defaults.headers,
      })
      
      // Add only the request interceptor (for logging), not the response interceptor
      silentClient.interceptors.request.use(
        (config) => {
          console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.params)
          return config
        }
      )
      
      await silentClient.get(`/api/v1/rebalance/${rebalanceId}`)
      return true // Rebalance exists
    } catch (error) {
      // 404 means rebalance doesn't exist (successfully deleted)
      // Any other error also means we can't verify it exists
      return false
    }
  },

  // Get portfolios for a specific rebalance (for lazy loading)
  getRebalancePortfolios: async (rebalanceId: string): Promise<RebalancePortfolio[]> => {
    if (process.env.NODE_ENV === 'development') {
      try {
        const response: AxiosResponse<RebalancePortfolio[]> = await apiClient.get(
          `/api/v1/rebalance/${rebalanceId}/portfolios`
        )
        return response.data
      } catch (error) {
        console.warn('Order Generation Service not available, using mock data:', error)
        const { getMockRebalancePortfolios } = await import('./mockRebalanceData')
        return getMockRebalancePortfolios(rebalanceId)
      }
    } else {
      const response: AxiosResponse<RebalancePortfolio[]> = await apiClient.get(
        `/api/v1/rebalance/${rebalanceId}/portfolios`
      )
      return response.data
    }
  },

  // Get positions for a specific portfolio in a rebalance (for lazy loading)
  getRebalancePortfolioPositions: async (
    rebalanceId: string, 
    portfolioId: string
  ): Promise<RebalancePosition[]> => {
    if (process.env.NODE_ENV === 'development') {
      try {
        const response: AxiosResponse<RebalancePosition[]> = await apiClient.get(
          `/api/v1/rebalance/${rebalanceId}/portfolio/${portfolioId}/positions`
        )
        return response.data
      } catch (error) {
        console.warn('Order Generation Service not available, using mock data:', error)
        const { getMockRebalancePortfolioPositions } = await import('./mockRebalanceData')
        return getMockRebalancePortfolioPositions(rebalanceId, portfolioId)
      }
    } else {
      const response: AxiosResponse<RebalancePosition[]> = await apiClient.get(
        `/api/v1/rebalance/${rebalanceId}/portfolio/${portfolioId}/positions`
      )
      return response.data
    }
  },

  // Delete rebalance by ID with version for optimistic locking
  deleteRebalance: async (rebalanceId: string, version: number): Promise<{ success: boolean; message: string }> => {
    try {
      const response: AxiosResponse<any> = await apiClient.delete(
        `/api/v1/rebalance/${rebalanceId}`,
        {
          params: {
            version: version
          }
        }
      )
      
      // The API returns 200 status for successful deletion
      // The response body format may vary, so we check the status code
      if (response.status === 200) {
        return {
          success: true,
          message: response.data?.message || `Rebalance ${rebalanceId} deleted successfully`
        }
      } else {
        return {
          success: false,
          message: response.data?.message || `Failed to delete rebalance ${rebalanceId}`
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // Simulate successful deletion in development
        console.warn('Order Generation Service not available, simulating deletion:', error)
        return {
          success: true,
          message: `Rebalance ${rebalanceId} deleted successfully (simulated)`
        }
      } else {
        // If we get here, it's likely a network error or 4xx/5xx response
        return {
          success: false,
          message: error instanceof Error ? error.message : `Failed to delete rebalance ${rebalanceId}`
        }
      }
    }
  },

  // Delete multiple rebalances in batch
  deleteRebalances: async (deletions: { rebalanceId: string; version: number }[]): Promise<{
    successful: string[]
    failed: { rebalanceId: string; error: string }[]
    totalDeleted: number
    totalFailed: number
  }> => {
    const successful: string[] = []
    const failed: { rebalanceId: string; error: string }[] = []

    // Process deletions sequentially to avoid overwhelming the service
    for (const deletion of deletions) {
      try {
        await orderGenerationApi.deleteRebalance(deletion.rebalanceId, deletion.version)
        successful.push(deletion.rebalanceId)
      } catch (error) {
        failed.push({
          rebalanceId: deletion.rebalanceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return {
      successful,
      failed,
      totalDeleted: successful.length,
      totalFailed: failed.length
    }
  },
}

export default orderGenerationApi 