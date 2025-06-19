import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  ExecutionDTO,
  ExecutionPageDTO,
  ExecutionPostDTO,
  ExecutionPutDTO,
  ExecutionCancelDTO,
  BatchExecutionRequestDTO,
  BatchExecutionResponseDTO,
  ExecutionQueryParams,
  ExecutionServiceErrorResponse,
  ExecutionFilters,
  PaginationDTO
} from '@/types/execution';

/**
 * Execution Service API Client
 * Provides comprehensive access to the GlobeCo Execution Service v1.3.0 API
 */
class ExecutionService {
  private api: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'http://globeco-execution-service:8084'
      : 'http://localhost:8084';

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
        console.log(`[${timestamp}] Execution Service Request:`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          data: config.data ? JSON.stringify(config.data) : undefined,
        });
        return config;
      },
      (error) => {
        console.error('Execution Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Execution Service Response:`, {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError<ExecutionServiceErrorResponse>) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Execution Service Error:`, {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(error: AxiosError<ExecutionServiceErrorResponse>): Error {
    if (error.response) {
      const { status, data } = error.response;
      let message = data?.message || 'An error occurred';

      switch (status) {
        case 400:
          message = `Validation Error: ${data?.message || 'Invalid request parameters'}`;
          break;
        case 404:
          message = 'Execution not found';
          break;
        case 409:
          message = 'Conflict: Execution has been modified by another user. Please refresh and try again.';
          break;
        case 413:
          message = 'Request too large: Batch size exceeds maximum limit (100 executions)';
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
      return enhancedError;
    }

    if (error.request) {
      return new Error('Network error: Unable to connect to Execution Service');
    }

    return new Error(`Request configuration error: ${error.message}`);
  }

  /**
   * Convert query parameters to URL search params
   */
  private buildQueryParams(params: ExecutionQueryParams): Record<string, string> {
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

  /**
   * Determine if an execution can be cancelled based on its status
   */
  private canCancelExecution(executionStatus: string): boolean {
    const nonCancellableStatuses = ['FILLED', 'FULL', 'CANCELLED', 'CANCEL'];
    return !nonCancellableStatuses.includes(executionStatus);
  }

  // ==================== EXECUTION API v1.3.0 ====================

  /**
   * Get executions with filtering, sorting, and pagination
   */
  async getExecutions(params: ExecutionQueryParams = {}): Promise<ExecutionPageDTO> {
    const queryParams = this.buildQueryParams(params);
    const response = await this.api.get('/api/v1/executions', {
      params: queryParams,
    });
    
    return response.data;
  }

  /**
   * Get a specific execution by ID
   */
  async getExecution(id: number): Promise<ExecutionDTO> {
    const response = await this.api.get(`/api/v1/execution/${id}`);
    return response.data;
  }

  /**
   * Create a new execution
   */
  async createExecution(execution: ExecutionPostDTO): Promise<ExecutionDTO> {
    const response = await this.api.post('/api/v1/executions', execution);
    return response.data;
  }

  /**
   * Create multiple executions in batch
   */
  async createExecutionsBatch(request: BatchExecutionRequestDTO): Promise<BatchExecutionResponseDTO> {
    if (request.executions.length > 100) {
      throw new Error('Batch size cannot exceed 100 executions');
    }

    const response = await this.api.post('/api/v1/executions/batch', request);
    return response.data;
  }

  /**
   * Update an execution (fill quantities and average price)
   */
  async updateExecution(id: number, execution: ExecutionPutDTO): Promise<ExecutionDTO> {
    const response = await this.api.put(`/api/v1/execution/${id}`, execution);
    return response.data;
  }

  /**
   * Cancel an execution by updating its status to CANCEL
   */
  async cancelExecution(id: number, version: number): Promise<ExecutionDTO> {
    const executionToCancel: ExecutionCancelDTO = {
      executionStatus: 'CANCEL',
      version: version
    };

    const response = await this.api.put(`/api/v1/execution/${id}`, executionToCancel);
    return response.data;
  }

  /**
   * Cancel multiple executions in batch
   * Note: This performs individual PUT calls for each execution since the API doesn't have a batch cancel endpoint
   */
  async cancelExecutionsBatch(executions: Array<{ id: number; version: number }>): Promise<{
    successful: number;
    failed: number;
    totalCount: number;
    results: Array<{
      executionId: number;
      success: boolean;
      message: string;
      errorCode?: string;
    }>;
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const execution of executions) {
      try {
        await this.cancelExecution(execution.id, execution.version);
        results.push({
          executionId: execution.id,
          success: true,
          message: 'Execution cancelled successfully'
        });
        successful++;
      } catch (error) {
        results.push({
          executionId: execution.id,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          errorCode: (error as any)?.status?.toString()
        });
        failed++;
      }
    }

    return {
      successful,
      failed,
      totalCount: executions.length,
      results
    };
  }

  /**
   * Check if an execution can be cancelled
   */
  async canCancel(executionId: number): Promise<boolean> {
    try {
      const execution = await this.getExecution(executionId);
      return this.canCancelExecution(execution.executionStatus);
    } catch (error) {
      console.error(`Error checking cancellation status for execution ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Get cancellable executions from a list of execution IDs
   */
  async getCancellableExecutions(executionIds: number[]): Promise<number[]> {
    const cancellableIds: number[] = [];
    
    for (const id of executionIds) {
      if (await this.canCancel(id)) {
        cancellableIds.push(id);
      }
    }
    
    return cancellableIds;
  }

  /**
   * Get execution status breakdown for dashboard/summary
   */
  async getExecutionSummary(filters?: ExecutionFilters): Promise<{
    totalExecutions: number;
    statusBreakdown: Record<string, number>;
    tradeTypeBreakdown: Record<string, number>;
    destinationBreakdown: Record<string, number>;
  }> {
    const params: ExecutionQueryParams = {
      ...filters,
      limit: 1000, // Get a large sample for summary
      offset: 0
    };

    const response = await this.getExecutions(params);
    const executions = response.content;

    const statusBreakdown: Record<string, number> = {};
    const tradeTypeBreakdown: Record<string, number> = {};
    const destinationBreakdown: Record<string, number> = {};

    executions.forEach(execution => {
      // Status breakdown
      statusBreakdown[execution.executionStatus] = 
        (statusBreakdown[execution.executionStatus] || 0) + 1;

      // Trade type breakdown
      tradeTypeBreakdown[execution.tradeType] = 
        (tradeTypeBreakdown[execution.tradeType] || 0) + 1;

      // Destination breakdown
      destinationBreakdown[execution.destination] = 
        (destinationBreakdown[execution.destination] || 0) + 1;
    });

    return {
      totalExecutions: response.pagination.totalElements,
      statusBreakdown,
      tradeTypeBreakdown,
      destinationBreakdown
    };
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      // Since the API doesn't have a specific health check endpoint,
      // we'll use a simple GET request with minimal data
      const response = await this.api.get('/api/v1/executions', {
        params: { limit: 1, offset: 0 }
      });
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Execution Service health check failed');
    }
  }

  /**
   * Get available filter options for UI dropdowns
   */
  async getFilterOptions(): Promise<{
    executionStatuses: string[];
    tradeTypes: string[];
    destinations: string[];
  }> {
    // Get a sample of executions to determine available filter options
    const response = await this.getExecutions({ limit: 100, offset: 0 });
    
    const executionStatuses = new Set<string>();
    const tradeTypes = new Set<string>();
    const destinations = new Set<string>();

    response.content.forEach(execution => {
      executionStatuses.add(execution.executionStatus);
      tradeTypes.add(execution.tradeType);
      destinations.add(execution.destination);
    });

    return {
      executionStatuses: Array.from(executionStatuses).sort(),
      tradeTypes: Array.from(tradeTypes).sort(),
      destinations: Array.from(destinations).sort()
    };
  }
}

// Export singleton instance
export const executionService = new ExecutionService();
export default executionService; 