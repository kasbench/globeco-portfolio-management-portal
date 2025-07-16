// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('orderGenerationService.ts must not be imported on the client side.');
}

import axios, { AxiosResponse, AxiosError } from 'axios';
import { Rebalance, RebalancesQueryParams } from '@/types/rebalance';

const ORDER_GENERATION_SERVICE_HOST = process.env.ORDER_GENERATION_SERVICE_HOST || 'globeco-order-generation-service';
const ORDER_GENERATION_SERVICE_PORT = process.env.ORDER_GENERATION_SERVICE_PORT || '8088';
const BASE_URL = `http://${ORDER_GENERATION_SERVICE_HOST}:${ORDER_GENERATION_SERVICE_PORT}`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Axios interceptors for improved logging
apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = config.baseURL
      ? config.baseURL.replace(/\/$/, '') + (config.url || '')
      : config.url;
    console.log(`[${new Date().toISOString()}] API Request:`, {
      method: config.method?.toUpperCase(),
      url: fullUrl,
      params: config.params,
      data: config.data ? JSON.stringify(config.data) : undefined,
    });
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
    console.log(`[${new Date().toISOString()}] API Response:`, {
      status: response.status,
      url: fullUrl,
      data: response.data,
    });
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
    try {
      const response: AxiosResponse<Rebalance[]> = await apiClient.get('/api/v1/rebalances', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching rebalances:', error);
      throw error;
    }
  },

  /**
   * Get a specific rebalance by ID
   */
  getRebalanceById: async (rebalanceId: string): Promise<Rebalance> => {
    try {
      const response: AxiosResponse<Rebalance> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching rebalance ${rebalanceId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a rebalance by ID with optimistic locking
   */
  deleteRebalance: async (rebalanceId: string, version: number): Promise<void> => {
    try {
      console.log('[orderGenerationServiceApi] Calling DELETE /api/v1/rebalance', { rebalanceId, version });
      await apiClient.delete(`/api/v1/rebalance/${rebalanceId}`, { params: { version } });
      console.log('[orderGenerationServiceApi] Successfully deleted rebalance', { rebalanceId, version });
    } catch (error) {
      console.error('[orderGenerationServiceApi] Error deleting rebalance', { rebalanceId, version, error });
      throw error;
    }
  },

  /**
   * Rebalance a model's portfolios
   */
  rebalanceModel: async (modelId: string): Promise<Rebalance[]> => {
    try {
      const response: AxiosResponse<Rebalance[]> = await apiClient.post(`/api/v1/model/${modelId}/rebalance`);
      return response.data;
    } catch (error) {
      console.error(`Error rebalancing model ${modelId}:`, error);
      throw error;
    }
  },

  /**
   * Get a specific model by ID
   */
  getModelById: async (modelId: string): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await apiClient.get(`/api/v1/model/${modelId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching model ${modelId}:`, error);
      throw error;
    }
  },

  /**
   * Update an existing model
   */
  updateModel: async (modelId: string, model: any): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await apiClient.put(`/api/v1/model/${modelId}`, model);
      return response.data;
    } catch (error) {
      console.error(`Error updating model ${modelId}:`, error);
      throw error;
    }
  },

  /**
   * Get all models with optional pagination and sorting
   */
  listModels: async (params: any): Promise<any[]> => {
    try {
      const response: AxiosResponse<any[]> = await apiClient.get('/api/v1/models', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  },

  /**
   * Create a new model
   */
  createModel: async (model: any): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await apiClient.post('/api/v1/models', model);
      return response.data;
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  },

  /**
   * Get portfolios for a specific rebalance
   */
  getRebalancePortfolios: async (rebalanceId: string): Promise<any[]> => {
    try {
      // Call the correct endpoint
      const response: AxiosResponse<any> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`);
      // Return the portfolios array from the response
      return response.data.portfolios || [];
    } catch (error) {
      console.error(`Error fetching portfolios for rebalance ${rebalanceId}:`, error);
      throw error;
    }
  },

  /**
   * Get positions for a specific portfolio in a rebalance
   */
  getRebalancePortfolioPositions: async (rebalanceId: string, portfolioId: string): Promise<any[]> => {
    try {
      const response: AxiosResponse<any> = await apiClient.get(`/api/v1/rebalance/${rebalanceId}`);
      const portfolios = response.data.portfolios || [];
      const portfolio = portfolios.find((p: any) => p.portfolio_id === portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} not found in rebalance ${rebalanceId}`);
      }
      return portfolio.positions || [];
    } catch (error) {
      console.error(`Error fetching positions for rebalance ${rebalanceId}, portfolio ${portfolioId}:`, error);
      throw error;
    }
  },
};

export default orderGenerationServiceApi;