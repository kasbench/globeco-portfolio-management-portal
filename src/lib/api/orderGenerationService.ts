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
      await apiClient.delete(`/api/v1/rebalance/${rebalanceId}`, { params: { version } });
    } catch (error) {
      console.error(`Error deleting rebalance ${rebalanceId}:`, error);
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
};

export default orderGenerationServiceApi;