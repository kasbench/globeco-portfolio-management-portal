// Portfolio Service API Types
// Based on globeco-portfolio-service-openapi.yaml

export interface PortfolioResponseDTO {
  portfolioId: string
  name: string
  dateCreated?: string | null // ISO 8601 datetime format
  version: number
}

export interface PortfolioPostDTO {
  name: string
  dateCreated?: string | null // ISO 8601 datetime format
  version?: number | null
}

export interface PortfolioPutDTO {
  portfolioId: string
  name: string
  dateCreated?: string | null
  version: number
}

// Utility types for frontend use
export interface Portfolio {
  id: string
  name: string
  dateCreated?: Date | null
  version: number
}

export interface PortfolioOption {
  value: string
  label: string
}

// Portfolio mapping for caching
export interface PortfolioMap {
  [portfolioId: string]: string // portfolioId -> name
} 