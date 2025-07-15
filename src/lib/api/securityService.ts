// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('securityService.ts must not be imported on the client side.');
}

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

export interface SecurityOut {
  securityId: string;
  ticker: string;
  description: string;
  securityTypeId: string;
  version: number;
  securityType: {
    securityTypeId: string;
    abbreviation: string;
    description: string;
  };
}

export interface SecurityServiceErrorResponse {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

/**
 * Security Service API Client
 * Provides access to the GlobeCo Security Service v1.0.0 API
 *
 * NOTE: This module is for server-side/API route use only.
 */
class SecurityService {
  private api: AxiosInstance;
  private readonly baseURL: string;
  private cache: Map<string, SecurityOut> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    const SECURITY_SERVICE_HOST = process.env.SECURITY_SERVICE_HOST || 'globeco-security-service';
    const SECURITY_SERVICE_PORT = process.env.SECURITY_SERVICE_PORT || '8000';
    this.baseURL = `http://${SECURITY_SERVICE_HOST}:${SECURITY_SERVICE_PORT}`;

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Security Service Request:`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => {
        console.error('Security Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Security Service Response:`, {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError<SecurityServiceErrorResponse>) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Security Service Error:`, {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.detail?.[0]?.msg || error.message,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(error: AxiosError<SecurityServiceErrorResponse>): Error {
    if (error.response) {
      const { status, data } = error.response;
      let message = data?.detail?.[0]?.msg || 'An error occurred';

      switch (status) {
        case 400:
          message = `Validation Error: ${data?.detail?.[0]?.msg || 'Invalid request parameters'}`;
          break;
        case 404:
          message = 'Security not found';
          break;
        case 422:
          message = `Validation Error: ${data?.detail?.[0]?.msg || 'Invalid data provided'}`;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'Security Service temporarily unavailable. Please try again later.';
          break;
        default:
          message = `Server error: ${data?.detail?.[0]?.msg || 'Unknown error'}`;
      }

      const enhancedError = new Error(message);
      (enhancedError as any).status = status;
      return enhancedError;
    }

    if (error.request) {
      return new Error('Network error: Unable to connect to Security Service');
    }

    return new Error(`Request configuration error: ${error.message}`);
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(securityId: string): boolean {
    const timestamp = this.cacheTimestamps.get(securityId);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Get a specific security by ID with caching
   */
  async getSecurity(securityId: string): Promise<SecurityOut> {
    // Check cache first
    if (this.cache.has(securityId) && this.isCacheValid(securityId)) {
      return this.cache.get(securityId)!;
    }

    try {
      const response = await this.api.get(`/api/v1/security/${securityId}`);
      const security: SecurityOut = response.data;
      
      // Update cache
      this.cache.set(securityId, security);
      this.cacheTimestamps.set(securityId, Date.now());
      
      return security;
    } catch (error) {
      // If security not found or service unavailable, throw error
      throw error;
    }
  }

  /**
   * Get multiple securities by IDs with batch optimization
   */
  async getSecurities(securityIds: string[]): Promise<Map<string, SecurityOut>> {
    const result = new Map<string, SecurityOut>();
    const uncachedIds: string[] = [];

    // Check cache for each security
    for (const securityId of securityIds) {
      if (this.cache.has(securityId) && this.isCacheValid(securityId)) {
        result.set(securityId, this.cache.get(securityId)!);
      } else {
        uncachedIds.push(securityId);
      }
    }

    // Fetch uncached securities individually
    // Note: This could be optimized with a batch endpoint if available
    const fetchPromises = uncachedIds.map(async (securityId) => {
      try {
        const security = await this.getSecurity(securityId);
        result.set(securityId, security);
        return { securityId, security };
      } catch (error) {
        console.warn(`Failed to fetch security ${securityId}:`, error);
        return { securityId, security: null };
      }
    });

    await Promise.all(fetchPromises);
    return result;
  }

  /**
   * Get ticker for a security ID (convenience method)
   */
  async getTicker(securityId: string): Promise<string | null> {
    try {
      const security = await this.getSecurity(securityId);
      return security.ticker;
    } catch (error) {
      console.warn(`Failed to fetch ticker for security ${securityId}:`, error);
      return null;
    }
  }

  /**
   * Get tickers for multiple security IDs
   */
  async getTickers(securityIds: string[]): Promise<Map<string, string>> {
    const securities = await this.getSecurities(securityIds);
    const tickers = new Map<string, string>();
    
    for (const [securityId, security] of securities) {
      if (security) {
        tickers.set(securityId, security.ticker);
      }
    }
    
    return tickers;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get('/health/liveness');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const securityService = new SecurityService();
export { SecurityService }; 