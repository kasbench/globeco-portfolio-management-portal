import { useEffect, useCallback } from 'react';
import { withFetchTelemetry } from './telemetry-axios';
import { telemetryUtils } from './metrics';

// Client-side telemetry hook for user interactions
export function useTelemetry() {
  // Record page view on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // Send page view to server-side telemetry via API
      withFetchTelemetry(
        async () => fetch('/api/telemetry/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: pathname, timestamp: Date.now() }),
        }),
        'trackPageView',
        'telemetry-client'
      )().catch(() => {
        // Silently fail - telemetry shouldn't break the app
      });
    }
  }, []);

  // Function to track user interactions
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      withFetchTelemetry(
        async () => fetch('/api/telemetry/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            event: eventName, 
            properties, 
            timestamp: Date.now(),
            page: window.location.pathname 
          }),
        }),
        'trackEvent',
        'telemetry-client'
      )().catch(() => {
        // Silently fail - telemetry shouldn't break the app
      });
    }
  }, []);

  // Function to track errors
  const trackError = useCallback((error: Error, context?: string) => {
    if (typeof window !== 'undefined') {
      withFetchTelemetry(
        async () => fetch('/api/telemetry/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            context,
            timestamp: Date.now(),
            page: window.location.pathname 
          }),
        }),
        'trackError',
        'telemetry-client'
      )().catch(() => {
        // Silently fail - telemetry shouldn't break the app
      });
    }
  }, []);

  return {
    trackEvent,
    trackError,
  };
}

// Server-side telemetry utilities for React Server Components
export const serverTelemetry = {
  // Track server component render
  trackComponentRender: (componentName: string, props?: Record<string, any>) => {
    if (typeof window === 'undefined') {
      telemetryUtils.recordPageView(`component:${componentName}`);
    }
  },

  // Track server action
  trackServerAction: async <T>(
    actionName: string,
    action: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    if (typeof window === 'undefined') {
      const start = Date.now();
      try {
        const result = await action();
        const duration = Date.now() - start;
        telemetryUtils.recordApiRequest('SERVER_ACTION', actionName, 200, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        telemetryUtils.recordApiRequest('SERVER_ACTION', actionName, 500, duration);
        telemetryUtils.recordError(
          'server_action_error',
          error instanceof Error ? error.message : 'Unknown server action error',
          actionName
        );
        throw error;
      }
    }
    return action();
  },
};