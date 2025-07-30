import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Log levels enum
export enum LogLevel {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

// Base log entry interface
export interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  application: string;
  server: string;
  location: string;
  request_id?: string;
  correlation_id?: string;
}

// HTTP request log entry interface
export interface HttpLogEntry extends BaseLogEntry {
  method?: string;
  path?: string;
  query_params?: string;
  ip_address?: string;
  remote_addr?: string;
  user_agent?: string;
  status?: number;
  bytes?: number;
  duration?: number;
}

// Complete log entry interface with optional fields
export interface LogEntry extends HttpLogEntry {
  endpoint?: string;
  operation?: string;
  portfolio_id?: string;
  model_id?: string;
  order_id?: string;
  trade_id?: string;
  execution_id?: string;
  rebalance_id?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
  [key: string]: any; // Allow additional custom fields
}

// Logger configuration
interface LoggerConfig {
  application: string;
  server: string;
  minLevel: LogLevel;
  enableConsole: boolean;
}

// Request context for tracking across operations
export interface RequestContext {
  requestId: string;
  correlationId: string;
  method?: string;
  path?: string;
  ipAddress?: string;
  userAgent?: string;
  startTime: number;
}

class StructuredLogger {
  private config: LoggerConfig;
  private requestContexts = new Map<string, RequestContext>();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      application: process.env.OTEL_SERVICE_NAME || 'globeco-portfolio-management-portal',
      server: process.env.HOSTNAME || process.env.OTEL_SERVICE_NAME || 'globeco-portfolio-management-portal',
      minLevel: LogLevel.INFO,
      enableConsole: true,
      ...config
    };
  }

  // Create request context from NextRequest
  createRequestContext(req: NextRequest): RequestContext {
    const requestId = uuidv4();
    const correlationId = req.headers.get('x-correlation-id') || requestId;
    const url = new URL(req.url);
    
    const context: RequestContext = {
      requestId,
      correlationId,
      method: req.method,
      path: url.pathname,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers.get('user-agent') || undefined,
      startTime: Date.now()
    };

    this.requestContexts.set(requestId, context);
    return context;
  }

  // Get request context by ID
  getRequestContext(requestId: string): RequestContext | undefined {
    return this.requestContexts.get(requestId);
  }

  // Clean up request context
  cleanupRequestContext(requestId: string): void {
    this.requestContexts.delete(requestId);
  }

  // Extract client IP from request
  private getClientIp(req: NextRequest): string {
    const xForwardedFor = req.headers.get('x-forwarded-for');
    const xRealIp = req.headers.get('x-real-ip');
    const remoteAddr = req.headers.get('remote-addr');
    
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    
    return xRealIp || remoteAddr || 'unknown';
  }

  // Core logging method
  private log(level: LogLevel, msg: string, data: Partial<LogEntry> = {}, location?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      msg,
      application: this.config.application,
      server: this.config.server,
      location: location || this.getCallerLocation(),
      ...data
    };

    // Output the log entry
    if (this.config.enableConsole) {
      console.log(JSON.stringify(logEntry));
    }
  }

  // Check if we should log at this level
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.FATAL, LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex <= currentLevelIndex;
  }

  // Get caller location (simplified)
  private getCallerLocation(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown:unknown:0';
    
    const lines = stack.split('\n');
    // Skip the first few lines (Error, getCallerLocation, log method)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('/src/')) {
        const match = line.match(/\/src\/(.+):(\d+):(\d+)/);
        if (match) {
          return `${match[1]}:${match[2]}:${match[3]}`;
        }
      }
    }
    return 'unknown:unknown:0';
  }

  // Public logging methods
  fatal(msg: string, data?: Partial<LogEntry>, location?: string): void {
    this.log(LogLevel.FATAL, msg, data, location);
  }

  error(msg: string, data?: Partial<LogEntry>, location?: string): void {
    this.log(LogLevel.ERROR, msg, data, location);
  }

  warn(msg: string, data?: Partial<LogEntry>, location?: string): void {
    this.log(LogLevel.WARN, msg, data, location);
  }

  info(msg: string, data?: Partial<LogEntry>, location?: string): void {
    this.log(LogLevel.INFO, msg, data, location);
  }

  debug(msg: string, data?: Partial<LogEntry>, location?: string): void {
    this.log(LogLevel.DEBUG, msg, data, location);
  }

  trace(msg: string, data?: Partial<LogEntry>, location?: string): void {
    this.log(LogLevel.TRACE, msg, data, location);
  }

  // HTTP-specific logging methods
  logIncomingRequest(context: RequestContext, queryParams?: string): void {
    this.info(`Incoming ${context.method} request to ${context.path}`, {
      request_id: context.requestId,
      correlation_id: context.correlationId,
      method: context.method,
      path: context.path,
      query_params: queryParams || '',
      ip_address: context.ipAddress,
      remote_addr: context.ipAddress,
      user_agent: context.userAgent
    }, 'app:None:0');
  }

  logCompletedRequest(context: RequestContext, status: number, bytes?: number): void {
    const duration = (Date.now() - context.startTime) / 1000; // Convert to seconds with decimals
    
    this.info(`Completed ${context.method} ${context.path} - ${status}`, {
      request_id: context.requestId,
      correlation_id: context.correlationId,
      method: context.method,
      path: context.path,
      status,
      ip_address: context.ipAddress,
      remote_addr: context.ipAddress,
      user_agent: context.userAgent,
      bytes,
      duration: Math.round(duration * 100) / 100 // Round to 2 decimal places
    }, 'app:None:0');
  }

  logApiOperation(msg: string, context: RequestContext, data?: Partial<LogEntry>): void {
    this.info(msg, {
      request_id: context.requestId,
      correlation_id: context.correlationId,
      endpoint: context.path,
      ...data
    }, 'app.api_v1:None:0');
  }

  logServiceOperation(msg: string, context: RequestContext, operation: string, data?: Partial<LogEntry>): void {
    this.info(msg, {
      request_id: context.requestId,
      correlation_id: context.correlationId,
      operation,
      ...data
    }, 'app.services:None:0');
  }

  logError(msg: string, error: Error, context?: RequestContext, data?: Partial<LogEntry>): void {
    this.error(msg, {
      request_id: context?.requestId,
      correlation_id: context?.correlationId,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      ...data
    });
  }
}

// Create singleton logger instance
export const logger = new StructuredLogger();

// Types are already exported as interfaces above