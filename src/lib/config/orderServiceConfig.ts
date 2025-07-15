// This module is for server-side/API route use only. Do NOT import in client-side code.
if (typeof window !== 'undefined') {
  throw new Error('orderServiceConfig.ts must not be imported on the client side.');
}

import { OrderMappingConfig, RetryConfig } from '@/types/order';

// Order Service configuration (server-side only)
const ORDER_SERVICE_HOST = process.env.ORDER_SERVICE_HOST || 'globeco-order-service';
const ORDER_SERVICE_PORT = process.env.ORDER_SERVICE_PORT || '8081';
export const BASE_URL = `http://${ORDER_SERVICE_HOST}:${ORDER_SERVICE_PORT}`;

// Configuration with environment variable overrides (server-side only)
export const getOrderServiceConfig = (): OrderMappingConfig & {
  timeout: number;
  retryConfig: RetryConfig;
} => ({
  defaultBlotterId: parseInt(process.env.ORDER_DEFAULT_BLOTTER_ID || '1', 10),
  defaultStatusId: parseInt(process.env.ORDER_DEFAULT_STATUS_ID || '1', 10),
  defaultVersion: 1,
  batchSize: parseInt(process.env.ORDER_BATCH_SIZE || '1000', 10),
  orderTypeMapping: {
    BUY: parseInt(process.env.ORDER_BUY_TYPE_ID || '1', 10),
    SELL: parseInt(process.env.ORDER_SELL_TYPE_ID || '2', 10),
  },
  timeout: parseInt(process.env.ORDER_SUBMISSION_TIMEOUT || '30000', 10),
  retryConfig: {
    maxRetries: parseInt(process.env.ORDER_RETRY_MAX_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.ORDER_RETRY_DELAY || '1000', 10),
    backoffMultiplier: parseInt(process.env.ORDER_RETRY_BACKOFF_MULTIPLIER || '2', 10),
    retryableErrorCodes: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
  },
});
