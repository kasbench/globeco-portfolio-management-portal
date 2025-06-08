import axios, { AxiosResponse } from 'axios'
import { 
  PortfolioResponseDTO, 
  PortfolioPostDTO, 
  PortfolioPutDTO,
  Portfolio 
} from '@/types/portfolio'

// Portfolio Service configuration
// Use localhost for development since Docker service names are not accessible from browser
const PORTFOLIO_SERVICE_HOST = process.env.NEXT_PUBLIC_PORTFOLIO_SERVICE_HOST || 'localhost'
const PORTFOLIO_SERVICE_PORT = process.env.NEXT_PUBLIC_PORTFOLIO_SERVICE_PORT || '8001'
const BASE_URL = `http://${PORTFOLIO_SERVICE_HOST}:${PORTFOLIO_SERVICE_PORT}`

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
      console.log(`Portfolio API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    return config
  },
  (error) => {
    console.error('Portfolio API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('Portfolio API Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      })
    } else if (error.request) {
      // Request was made but no response received
      console.error('Portfolio API Network Error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
    } else {
      // Something else happened
      console.error('Portfolio API Configuration Error:', error.message)
    }
    return Promise.reject(error)
  }
)

// Transform DTO to frontend model
function transformPortfolioDTO(dto: PortfolioResponseDTO): Portfolio {
  return {
    id: dto.portfolioId,
    name: dto.name,
    dateCreated: dto.dateCreated ? new Date(dto.dateCreated) : null,
    version: dto.version,
  }
}

// Portfolio Service API Functions
export const portfolioApi = {
  // Get all portfolios
  getPortfolios: async (): Promise<Portfolio[]> => {
    const response: AxiosResponse<PortfolioResponseDTO[]> = await apiClient.get('/api/v1/portfolios')
    return response.data.map(transformPortfolioDTO)
  },

  // Get portfolio by ID
  getPortfolio: async (portfolioId: string): Promise<Portfolio> => {
    const response: AxiosResponse<PortfolioResponseDTO> = await apiClient.get(`/api/v1/portfolio/${portfolioId}`)
    return transformPortfolioDTO(response.data)
  },

  // Create new portfolio
  createPortfolio: async (portfolio: PortfolioPostDTO): Promise<Portfolio> => {
    const response: AxiosResponse<PortfolioResponseDTO> = await apiClient.post('/api/v1/portfolios', portfolio)
    return transformPortfolioDTO(response.data)
  },

  // Update existing portfolio
  updatePortfolio: async (portfolioId: string, portfolio: PortfolioPutDTO): Promise<Portfolio> => {
    const response: AxiosResponse<PortfolioResponseDTO> = await apiClient.put(`/api/v1/portfolio/${portfolioId}`, portfolio)
    return transformPortfolioDTO(response.data)
  },

  // Delete portfolio
  deletePortfolio: async (portfolioId: string, version: number): Promise<void> => {
    await apiClient.delete(`/api/v1/portfolio/${portfolioId}`, {
      params: { version }
    })
  },
}

export default portfolioApi 