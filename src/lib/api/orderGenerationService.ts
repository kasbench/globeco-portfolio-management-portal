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

// Order Generation Service configuration
// Use localhost for development since Docker service names are not accessible from browser
const ORDER_GENERATION_SERVICE_HOST = process.env.NEXT_PUBLIC_ORDER_GENERATION_SERVICE_HOST || 'localhost'
const ORDER_GENERATION_SERVICE_PORT = process.env.NEXT_PUBLIC_ORDER_GENERATION_SERVICE_PORT || '8088'
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
      console.error('API Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      })
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Network Error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
    } else {
      // Something else happened
      console.error('API Configuration Error:', error.message)
    }
    return Promise.reject(error)
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
}

export default orderGenerationApi 