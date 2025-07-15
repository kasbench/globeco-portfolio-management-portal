// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('tradeService.ts must not be imported on the client side.');
}

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  TradeOrderResponseDTO,
  TradeOrderEnhancedResponseDTO,
  TradeOrderPageResponseDTO,
  CreateTradeOrderRequestDTO,
  UpdateTradeOrderRequestDTO,
  BatchSubmitRequestDTO,
  BatchMoveRequestDTO,
  BatchSubmitResponseDTO,
  BatchMoveResponseDTO,
  ExecutionResponseDTO,
  ExecutionEnhancedResponseDTO,
  ExecutionPageResponseDTO,
  CreateExecutionRequestDTO,
  UpdateExecutionRequestDTO,
  TradeOrderQueryParams,
  ExecutionQueryParams,
  TradeServiceErrorResponse,
  SubmitOrderResponseDTO,
  BlotterResponseDTO,
  DestinationResponseDTO,
  LegacyBatchSubmitRequestDTO,
  TradeOrderSubmission,
  SubmissionValidationResult
} from '@/types/trade';

/**
 * Trade Service API Client
 * Provides comprehensive access to the GlobeCo Trade Service v2 API
 *
 * NOTE: This module is for server-side/API route use only.
 */
class TradeService {
  private api: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    const TRADE_SERVICE_HOST = process.env.TRADE_SERVICE_HOST || 'globeco-trade-service';
    const TRADE_SERVICE_PORT = process.env.TRADE_SERVICE_PORT || '8082';
    this.baseURL = `http://${TRADE_SERVICE_HOST}:${TRADE_SERVICE_PORT}`;

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
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
        console.log(`[${timestamp}] Trade Service Request:`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          data: config.data ? JSON.stringify(config.data) : undefined,
        });
        return config;
      },
      (error) => {
        console.error('Trade Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Trade Service Response:`, {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError<TradeServiceErrorResponse>) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Trade Service Error:`, {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message,
          details: error.response?.data?.details,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(error: AxiosError<TradeServiceErrorResponse>): Error {
    if (error.response) {
      const { status, data } = error.response;
      let message = data?.message || 'An error occurred';

      switch (status) {
        case 400:
          message = `Validation Error: ${data?.message || 'Invalid request parameters'}`;
          break;
        case 404:
          message = 'Trade order not found';
          break;
        case 409:
          message = 'Conflict: Trade order has been modified by another user. Please refresh and try again.';
          break;
        case 413:
          message = 'Request too large: Batch size exceeds maximum limit';
          break;
        case 429:
          message = 'Rate limit exceeded: Please try again later';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          message = `Server error: ${data?.message || 'Unknown error'}`;
      }

      const enhancedError = new Error(message);
      (enhancedError as any).status = status;
      (enhancedError as any).details = data?.details;
      return enhancedError;
    }

    if (error.request) {
      return new Error('Network error: Unable to connect to Trade Service');
    }

    return new Error(`Request configuration error: ${error.message}`);
  }

  /**
   * Convert query parameters to URL search params
   */
  private buildQueryParams(params: TradeOrderQueryParams | ExecutionQueryParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams[key] = value.join(',');
        } else {
          queryParams[key] = value.toString();
        }
      }
    });

    return queryParams;
  }

  // ==================== TRADE ORDERS v2 API ====================

  /**
   * Get trade orders with advanced filtering, sorting, and pagination (v2)
   */
  async getTradeOrders(params: TradeOrderQueryParams = {}): Promise<TradeOrderPageResponseDTO> {
    const queryParams = this.buildQueryParams(params);
    const response = await this.api.get('/api/v2/tradeOrders', {
      params: queryParams,
    });
    
    // Transform the actual API response to match our expected interface
    const apiData = response.data;
    const transformedData: TradeOrderPageResponseDTO = {
      content: apiData.tradeOrders || [],
      pageable: {
        sort: {
          sorted: false,
          orders: []
        },
        pageNumber: apiData.pagination?.currentPage || 0,
        pageSize: apiData.pagination?.pageSize || 0
      },
      totalElements: apiData.pagination?.totalElements || 0,
      totalPages: apiData.pagination?.totalPages || 0,
      size: apiData.pagination?.pageSize || 0,
      number: apiData.pagination?.currentPage || 0,
      numberOfElements: apiData.tradeOrders?.length || 0,
      first: !apiData.pagination?.hasPrevious,
      last: !apiData.pagination?.hasNext,
      empty: !apiData.tradeOrders || apiData.tradeOrders.length === 0
    };
    
    return transformedData;
  }

  /**
   * Get single trade order by ID (v2)
   */
  async getTradeOrder(id: number): Promise<TradeOrderEnhancedResponseDTO> {
    const response = await this.api.get<TradeOrderEnhancedResponseDTO>(`/api/v2/tradeOrders/${id}`);
    return response.data;
  }

  /**
   * Create new trade order (v2)
   */
  async createTradeOrder(tradeOrder: CreateTradeOrderRequestDTO): Promise<TradeOrderEnhancedResponseDTO> {
    const response = await this.api.post<TradeOrderEnhancedResponseDTO>('/api/v2/tradeOrders', tradeOrder);
    return response.data;
  }

  /**
   * Update existing trade order (v1)
   */
  async updateTradeOrder(id: number, tradeOrder: UpdateTradeOrderRequestDTO): Promise<TradeOrderResponseDTO> {
    // Debug: Log the parameters being passed to the API
    console.log('🔍 DEBUG - TradeService.updateTradeOrder called with:', {
      id,
      tradeOrder,
      url: `/api/v1/tradeOrders/${id}`,
      portfolioId: tradeOrder.portfolioId,
      portfolioIdType: typeof tradeOrder.portfolioId,
      portfolioIdLength: tradeOrder.portfolioId?.length
    })
    
    const response = await this.api.put<TradeOrderResponseDTO>(`/api/v1/tradeOrders/${id}`, tradeOrder);
    return response.data;
  }

  /**
   * Delete trade order (v1)
   */
  async deleteTradeOrder(id: number, version: number): Promise<void> {
    await this.api.delete(`/api/v1/tradeOrders/${id}`, {
      params: { version },
    });
  }

  /**
   * Submit individual trade order (v2)
   */
  async submitTradeOrder(id: number): Promise<SubmitOrderResponseDTO> {
    const response = await this.api.post<SubmitOrderResponseDTO>(`/api/v2/tradeOrders/${id}/submit`);
    return response.data;
  }

  // ==================== BATCH OPERATIONS v2 API ====================

  /**
   * Submit multiple trade orders in batch (v1) - Updated for new submission format
   * Can be used for single orders or batches (max 100 orders)
   */
  async submitTradeOrdersBatch(request: BatchSubmitRequestDTO): Promise<BatchSubmitResponseDTO> {
    // Validate submissions before sending
    this.validateBatchSubmission(request);
    
    const response = await this.api.post<BatchSubmitResponseDTO>('/api/v1/tradeOrders/batch/submit', request);
    return response.data;
  }

  /**
   * Legacy batch submit method for backward compatibility
   * @deprecated Use submitTradeOrdersBatch with new submission format
   */
  async submitTradeOrdersBatchLegacy(request: LegacyBatchSubmitRequestDTO): Promise<BatchSubmitResponseDTO> {
    console.warn('Warning: Using deprecated legacy batch submit. Please migrate to new submission format.');
    const response = await this.api.post<BatchSubmitResponseDTO>('/api/v1/tradeOrders/batch/submit', request);
    return response.data;
  }

  /**
   * Move multiple trade orders to new blotter in batch (v2)
   */
  async moveTradeOrdersBatch(request: BatchMoveRequestDTO): Promise<BatchMoveResponseDTO> {
    const response = await this.api.put<BatchMoveResponseDTO>('/api/v2/tradeOrders/batch/move', request);
    return response.data;
  }

  /**
   * Create multiple trade orders in batch (v2)
   */
  async createTradeOrdersBatch(tradeOrders: CreateTradeOrderRequestDTO[]): Promise<BatchSubmitResponseDTO> {
    const request = { tradeOrders };
    const response = await this.api.post<BatchSubmitResponseDTO>('/api/v2/tradeOrders/batch/create', request);
    return response.data;
  }

  // ==================== EXECUTIONS v2 API ====================

  /**
   * Get executions with filtering, sorting, and pagination (v2)
   */
  async getExecutions(params: ExecutionQueryParams = {}): Promise<ExecutionPageResponseDTO> {
    const queryParams = this.buildQueryParams(params);
    const response = await this.api.get<ExecutionPageResponseDTO>('/api/v2/executions', {
      params: queryParams,
    });
    return response.data;
  }

  /**
   * Get single execution by ID (v2)
   */
  async getExecution(id: number): Promise<ExecutionEnhancedResponseDTO> {
    const response = await this.api.get<ExecutionEnhancedResponseDTO>(`/api/v2/executions/${id}`);
    return response.data;
  }

  /**
   * Create new execution (v2)
   */
  async createExecution(execution: CreateExecutionRequestDTO): Promise<ExecutionEnhancedResponseDTO> {
    const response = await this.api.post<ExecutionEnhancedResponseDTO>('/api/v2/executions', execution);
    return response.data;
  }

  /**
   * Update existing execution (v2)
   */
  async updateExecution(id: number, execution: UpdateExecutionRequestDTO): Promise<ExecutionEnhancedResponseDTO> {
    const response = await this.api.put<ExecutionEnhancedResponseDTO>(`/api/v2/executions/${id}`, execution);
    return response.data;
  }

  /**
   * Delete execution (v2)
   */
  async deleteExecution(id: number, version: number): Promise<void> {
    await this.api.delete(`/api/v2/executions/${id}`, {
      params: { version },
    });
  }

  // ==================== LEGACY v1 API SUPPORT ====================

  /**
   * Get trade orders (v1) - for backward compatibility
   */
  async getTradeOrdersV1(limit?: number, offset?: number): Promise<TradeOrderResponseDTO[]> {
    const params: Record<string, string> = {};
    if (limit !== undefined) params.limit = limit.toString();
    if (offset !== undefined) params.offset = offset.toString();

    const response = await this.api.get<TradeOrderResponseDTO[]>('/api/v1/tradeOrders', { params });
    return response.data;
  }

  /**
   * Get single trade order by ID (v1)
   */
  async getTradeOrderV1(id: number): Promise<TradeOrderResponseDTO> {
    const response = await this.api.get<TradeOrderResponseDTO>(`/api/v1/tradeOrders/${id}`);
    return response.data;
  }

  // ==================== DESTINATIONS MANAGEMENT ====================

  /**
   * Get all destinations (v1)
   */
  async getDestinations(): Promise<DestinationResponseDTO[]> {
    try {
      const response = await this.api.get<DestinationResponseDTO[]>('/api/v1/destinations');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
      throw new Error('Unable to load destinations. Please try again.');
    }
  }

  /**
   * Get destination by ID (v1)
   */
  async getDestinationById(id: number): Promise<DestinationResponseDTO> {
    try {
      const response = await this.api.get<DestinationResponseDTO>(`/api/v1/destinations/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch destination ${id}:`, error);
      throw new Error(`Unable to load destination. Please try again.`);
    }
  }

  // ==================== BLOTTER MANAGEMENT ====================

  /**
   * Get all blotters (v1)
   */
  async getBlotters(): Promise<BlotterResponseDTO[]> {
    const response = await this.api.get<BlotterResponseDTO[]>('/api/v1/blotters');
    return response.data;
  }

  /**
   * Get blotter by ID (v1)
   */
  async getBlotterById(id: number): Promise<BlotterResponseDTO> {
    const response = await this.api.get<BlotterResponseDTO>(`/api/v1/blotters/${id}`);
    return response.data;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate batch submission data
   */
  private validateBatchSubmission(request: BatchSubmitRequestDTO): void {
    if (!request.submissions || !Array.isArray(request.submissions)) {
      throw new Error('Submissions array is required');
    }

    if (request.submissions.length === 0) {
      throw new Error('At least one submission is required');
    }

    if (request.submissions.length > 100) {
      throw new Error('Maximum 100 submissions allowed per batch');
    }

    for (const submission of request.submissions) {
      this.validateSubmission(submission);
    }
  }

  /**
   * Validate individual submission
   */
  private validateSubmission(submission: TradeOrderSubmission): void {
    if (!submission.tradeOrderId || submission.tradeOrderId <= 0) {
      throw new Error('Valid trade order ID is required');
    }

    if (!submission.quantity || submission.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (!submission.destinationId || submission.destinationId <= 0) {
      throw new Error('Valid destination ID is required');
    }
  }



  /**
   * Get available blotter abbreviations for batch move operations
   */
  async getBlotterAbbreviations(): Promise<string[]> {
    try {
      const blotters = await this.getBlotters();
      return blotters.map(blotter => blotter.abbreviation);
    } catch (error) {
      console.warn('Could not fetch blotter abbreviations:', error);
      return ['EQ', 'FI', 'FX'];
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get('/actuator/health');
    return {
      status: response.data.status || 'UNKNOWN',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    try {
      const response = await this.api.get('/actuator/metrics');
      return response.data;
    } catch (error) {
      console.warn('Could not fetch metrics:', error);
      return {};
    }
  }
}

// Export both the class and singleton instance
export { TradeService };
export const tradeService = new TradeService();
export default tradeService; 