// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('allocationService.ts must not be imported on the client side.');
}

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { wrapAxiosWithTelemetry, withHttpTelemetry } from '../telemetry-axios';
import { logger } from '../logger';

export interface AllocationExecutionResponse {
  processedCount: number;
  fileName: string;
  status: string;
  message: string;
  jobName: string;
  jobStatus: string;
  executionMode: string;
}

export interface AllocationServiceErrorResponse {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

/**
 * Allocation Service API Client
 * Provides access to the GlobeCo Allocation Service API
 *
 * NOTE: This module is for server-side/API route use only.
 */
class AllocationService {
  private api: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    const ALLOCATION_SERVICE_HOST = process.env.ALLOCATION_SERVICE_HOST || 'globeco-allocation-service';
    const ALLOCATION_SERVICE_PORT = process.env.ALLOCATION_SERVICE_PORT || '8089';
    this.baseURL = `http://${ALLOCATION_SERVICE_HOST}:${ALLOCATION_SERVICE_PORT}`;

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Wrap the axios instance with telemetry
    wrapAxiosWithTelemetry(this.api, 'allocation-service');

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        logger.debug('Allocation Service Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          service: 'allocation-service'
        }, 'allocationService:request:0');
        return config;
      },
      (error) => {
        logger.error('Allocation Service Request Error', {
          service: 'allocation-service',
          error: {
            message: error instanceof Error ? error.message : String(error)
          }
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('Allocation Service Response', {
          status: response.status,
          url: response.config.url,
          service: 'allocation-service'
        }, 'allocationService:response:0');
        return response;
      },
      (error: AxiosError<AllocationServiceErrorResponse>) => {
        logger.error('Allocation Service Error', {
          status: error.response?.status,
          url: error.config?.url,
          service: 'allocation-service',
          error_detail: error.response?.data?.detail?.[0]?.msg || error.message,
          error: {
            message: error.message,
            name: error.name
          }
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(error: AxiosError<AllocationServiceErrorResponse>): Error {
    if (error.response) {
      const { status, data } = error.response;
      let message = data?.detail?.[0]?.msg || 'An error occurred';

      switch (status) {
        case 400:
          message = `Validation Error: ${data?.detail?.[0]?.msg || 'Invalid request parameters'}`;
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 422:
          message = `Validation Error: ${data?.detail?.[0]?.msg || 'Invalid data provided'}`;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'Allocation Service temporarily unavailable. Please try again later.';
          break;
        default:
          message = `Server error: ${data?.detail?.[0]?.msg || 'Unknown error'}`;
      }

      const enhancedError = new Error(message);
      (enhancedError as any).status = status;
      return enhancedError;
    }

    if (error.request) {
      return new Error('Network error: Unable to connect to Allocation Service');
    }

    return new Error(`Request configuration error: ${error.message}`);
  }

  /**
   * Send executions to the allocation service
   * POSTs empty JSON payload to trigger allocation processing
   */
  async sendExecutions(): Promise<AllocationExecutionResponse> {
    return withHttpTelemetry(
      async () => {
        try {
          const response = await this.api.post('/api/v1/executions/send', {});
          return response.data;
        } catch (error) {
          // Pass through the original error without modification
          throw error;
        }
      },
      'sendExecutions',
      'allocation-service'
    )();
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
export const allocationService = new AllocationService();
export { AllocationService };