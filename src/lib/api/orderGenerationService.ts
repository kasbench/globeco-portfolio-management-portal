// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('orderGenerationService.ts must not be imported on the client side.');
}

import axios, { AxiosResponse, AxiosError } from 'axios';
import { Agent } from 'http';
import { Rebalance, RebalancesQueryParams } from '@/types/rebalance';
import { wrapAxiosWithTelemetry, withHttpTelemetry } from '../telemetry-axios';

const ORDER_GENERATION_SERVICE_HOST = process.env.ORDER_GENERATION_SERVICE_HOST || 'globeco-order-generation-service';
const ORDER_GENERATION_SERVICE_PORT = process.env.ORDER_GENERATION_SERVICE_PORT || '8088';
const BASE_URL = `http://${ORDER_GENERATION_SERVICE_HOST}:${ORDER_GENERATION_SERVICE_PORT}`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds timeout for faster failure detection
  headers: {
    'Content-Type': 'application/json',
  },
});

// Wrap the axios instance with telemetry
wrapAxiosWithTelemetry(apiClient, 'order-generation-service');

// Smart retry utility with exponential backoff
const withSmartRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx client errors
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay: 500ms, 1s, 2s
      const delay = initialDelay * Math.pow(2, attempt);
      
      // Only log once per operation, not per retry
      if (attempt === 0) {
        console.warn(`[orderGenerationService] Request failed, retrying with backoff (${maxRetries} attempts)`, {
          error: error.message,
          code: error.code,
        });
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Add Axios interceptors for improved logging
apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = config.baseURL
      ? config.baseURL.replace(/\/$/, '') + (config.url || '')
      : config.url;
    // console.log(`[${new Date().toISOString()}] API Request:`, {
    //   method: config.method?.toUpperCase(),
    //   url: fullUrl,
    //   params: config.params,
    //   data: config.data ? JSON.stringify(config.data) : undefined,
    // });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    const fullUrl = response.config.baseURL
      ? response.config.baseURL.replace(/\/$/, '') + (response.config.url || '')
      : response.config.url;
    // console.log(`[${new Date().toISOString()}] API Response:`, {
    //   status: response.status,
    //   url: fullUrl,
    //   data: response.data,
    // });
    return response;
  },
  (error) => {
    if (error.config) {
      const fullUrl = error.config.baseURL
        ? error.config.baseURL.replace(/\/$/, '') + (error.config.url || '')
        : error.config.url;
      console.error(`[${new Date().toISOString()}] API Error:`, {
        status: error.response?.status,
        url: fullUrl,
        message: error.message,
        data: error.response?.data,
      });
    } else {
      console.error(`[${new Date().toISOString()}] API Error:`, error);
    }
    return Promise.reject(error);
  }
);

export const orderGenerationServiceApi = {
  /**
   * List rebalances with pagination and sorting
   */
  listRebalances: async (params: RebalancesQueryParams): Promise<Rebalance[]> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<Rebalance[]> = await apiClient.get('/api/v1/rebalances', { params });
      return response.data;
    });
  },

  /**
   * Get a specific rebalance by ID
   */
  getRebalanceById: async (rebalanceId: string): Promise<Rebalance> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<Rebalance> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`);
      return response.data;
    });
  },

  /**
   * Delete a rebalance by ID with optimistic locking
   */
  deleteRebalance: async (rebalanceId: string, version: number): Promise<void> => {
    return withSmartRetry(async () => {
      await apiClient.delete(`/api/v1/rebalance/${rebalanceId}`, { params: { version } });
    });
  },

  /**
   * Rebalance a model's portfolios
   */
  rebalanceModel: async (modelId: string): Promise<Rebalance[]> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<Rebalance[]> = await apiClient.post(`/api/v1/model/${modelId}/rebalance`);
      return response.data;
    });
  },

  /**
   * Get a specific model by ID
   */
  getModelById: async (modelId: string): Promise<any> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<any> = await apiClient.get(`/api/v1/model/${modelId}`);
      return response.data;
    });
  },

  /**
   * Update an existing model
   */
  updateModel: async (modelId: string, model: any): Promise<any> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<any> = await apiClient.put(`/api/v1/model/${modelId}`, model);
      return response.data;
    });
  },

  /**
   * Get all models with optional pagination and sorting
   */
  listModels: async (params: any): Promise<any[]> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<any[]> = await apiClient.get('/api/v1/models', { params });
      return response.data;
    });
  },

  /**
   * Create a new model
   */
  createModel: async (model: any): Promise<any> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<any> = await apiClient.post('/api/v1/models', model);
      return response.data;
    });
  },

  /**
   * Delete a model by ID with optimistic locking
   */
  deleteModel: async (modelId: string, version: number): Promise<void> => {
    return withSmartRetry(async () => {
      await apiClient.delete(`/api/v1/model/${modelId}`, { params: { version } });
    });
  },

  /**
   * Get portfolios for a specific rebalance
   */
  getRebalancePortfolios: async (rebalanceId: string): Promise<any[]> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<any> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`);
      return response.data.portfolios || [];
    });
  },

  /**
   * Get positions for a specific portfolio in a rebalance
   */
  getRebalancePortfolioPositions: async (rebalanceId: string, portfolioId: string): Promise<any[]> => {
    return withSmartRetry(async () => {
      const response: AxiosResponse<any> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`);
      const portfolios = response.data.portfolios || [];
      const portfolio = portfolios.find((p: any) => p.portfolio_id === portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} not found in rebalance ${rebalanceId}`);
      }
      return portfolio.positions || [];
    });
  },
};

export default orderGenerationServiceApi;