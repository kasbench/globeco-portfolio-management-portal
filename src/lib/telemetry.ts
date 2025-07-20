console.log('🔧 TELEMETRY FILE: Starting to load telemetry.ts');
console.log('🔧 TELEMETRY FILE: typeof window =', typeof window);

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { telemetryConfig, logTelemetryConfig } from './telemetry-config';

console.log('🔧 TELEMETRY FILE: Imports completed successfully');

// Custom HTTP client to log collector communication
const logHttpRequest = async (url: string, method: string, body?: any) => {
  console.log(`🌐 OTLP HTTP Request: ${method} ${url}`);
  console.log(`📦 Request body size: ${body ? JSON.stringify(body).length : 0} bytes`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`📤 OTLP HTTP Response: ${response.status} ${response.statusText}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OTLP HTTP Error Response: ${errorText}`);
    } else {
      console.log(`✅ OTLP HTTP Request successful`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ OTLP HTTP Request failed:`, error);
    throw error;
  }
};

// Test collector connectivity
const testCollectorConnectivity = async (baseUrl: string) => {
  console.log('🔍 Testing collector connectivity...');
  
  const endpoints = [
    { path: '/v1/traces', name: 'Traces' },
    { path: '/v1/metrics', name: 'Metrics' },
    { path: '/', name: 'Root' },
  ];
  
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint.path}`;
    console.log(`🧪 Testing ${endpoint.name} endpoint: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`✅ ${endpoint.name} endpoint: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`❌ ${endpoint.name} endpoint failed:`, error);
    }
  }
};

// Only initialize on server side
if (typeof window === 'undefined') {
  console.log('🔧 TELEMETRY FILE: Server-side detected, initializing immediately...');
  
  const init = async () => {
    try {
      console.log('🚀 Starting OpenTelemetry initialization...');
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🏗️ Next.js Runtime: ${process.env.NEXT_RUNTIME}`);
      console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
      
      // Log configuration
      logTelemetryConfig();

      // Test both ports to see which one works
      const baseUrls = [
        'http://otel-collector-collector.monitoring.svc.cluster.local:4318',
        'http://otel-collector-collector.monitoring.svc.cluster.local:4317',
      ];
      
      console.log('🔍 Testing collector endpoints on both ports...');
      for (const baseUrl of baseUrls) {
        console.log(`\n📡 Testing collector at: ${baseUrl}`);
        await testCollectorConnectivity(baseUrl);
      }
      
      // Use the configured collector URL
      const collectorBaseUrl = telemetryConfig.collectorBaseUrl;
      console.log(`\n🎯 Using collector URL: ${collectorBaseUrl}`);

      // Set environment variables for OTLP configuration with detailed logging
      const envVars = {
        OTEL_EXPORTER_OTLP_ENDPOINT: collectorBaseUrl,
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: `${collectorBaseUrl}/v1/traces`,
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: `${collectorBaseUrl}/v1/metrics`,
        OTEL_SERVICE_NAME: telemetryConfig.serviceName,
        OTEL_SERVICE_VERSION: telemetryConfig.serviceVersion,
        OTEL_RESOURCE_ATTRIBUTES: [
          `service.name=${telemetryConfig.serviceName}`,
          `service.version=${telemetryConfig.serviceVersion}`,
          `deployment.environment=${process.env.NODE_ENV || 'development'}`,
          `service.namespace=globeco`,
          `service.instance.id=${process.env.HOSTNAME || 'local'}`,
        ].join(','),
        // Enable verbose logging
        OTEL_LOG_LEVEL: 'debug',
        OTEL_EXPORTER_OTLP_INSECURE: 'true',
      };

      // Set environment variables
      Object.entries(envVars).forEach(([key, value]) => {
        process.env[key] = value;
      });

      console.log('📦 OpenTelemetry environment variables configured:');
      Object.entries(envVars).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Test the specific endpoints we'll be using
      console.log('\n🧪 Testing specific OTLP endpoints...');
      try {
        const testTracePayload = {
          resourceSpans: [{
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: telemetryConfig.serviceName } },
                { key: 'service.version', value: { stringValue: telemetryConfig.serviceVersion } }
              ]
            },
            scopeSpans: [{
              scope: { name: 'test-initialization-scope', version: '1.0.0' },
              spans: [{
                traceId: '12345678901234567890123456789012',
                spanId: '1234567890123456',
                name: 'telemetry-initialization-test',
                kind: 1,
                startTimeUnixNano: (Date.now() * 1000000).toString(),
                endTimeUnixNano: ((Date.now() + 100) * 1000000).toString(),
                attributes: [
                  { key: 'test.initialization', value: { boolValue: true } },
                  { key: 'service.name', value: { stringValue: telemetryConfig.serviceName } }
                ]
              }]
            }]
          }]
        };
        
        await logHttpRequest(`${collectorBaseUrl}/v1/traces`, 'POST', testTracePayload);
      } catch (error) {
        console.error('❌ Test trace export failed:', error);
      }

      try {
        const testMetricPayload = {
          resourceMetrics: [{
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: telemetryConfig.serviceName } },
                { key: 'service.version', value: { stringValue: telemetryConfig.serviceVersion } }
              ]
            },
            scopeMetrics: [{
              scope: { name: 'test-initialization-scope', version: '1.0.0' },
              metrics: [{
                name: 'initialization_test_counter',
                description: 'Test counter for telemetry initialization',
                sum: {
                  dataPoints: [{
                    attributes: [
                      { key: 'test.type', value: { stringValue: 'initialization' } }
                    ],
                    startTimeUnixNano: (Date.now() * 1000000).toString(),
                    timeUnixNano: (Date.now() * 1000000).toString(),
                    asInt: '1',
                  }],
                  aggregationTemporality: 2,
                  isMonotonic: true,
                }
              }]
            }]
          }]
        };
        
        await logHttpRequest(`${collectorBaseUrl}/v1/metrics`, 'POST', testMetricPayload);
      } catch (error) {
        console.error('❌ Test metric export failed:', error);
      }

      // Configure instrumentations
      console.log('\n🔧 Configuring auto-instrumentations...');
      const instrumentations = telemetryConfig.enableAutoInstrumentation ? [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation to reduce noise
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              if (telemetryConfig.debugMode) {
                console.log(`🌐 HTTP Request intercepted by instrumentation`);
              }
            },
            responseHook: (span, response) => {
              if (telemetryConfig.debugMode) {
                console.log(`📤 HTTP Response intercepted by instrumentation`);
              }
            },
          },
        }),
      ] : [];

      console.log(`✅ Auto-instrumentations configured (${instrumentations.length} instrumentations)`);

      // Configure explicit exporters using environment variables
      // This ensures the SDK actually uses the OTLP exporters
      console.log('🔧 Configuring explicit OTLP exporters...');
      
      // Force the SDK to use OTLP exporters
      process.env.OTEL_TRACES_EXPORTER = 'otlp';
      process.env.OTEL_METRICS_EXPORTER = 'otlp';
      process.env.OTEL_LOGS_EXPORTER = 'otlp';
      
      console.log('📊 Forced exporter configuration:');
      console.log(`   OTEL_TRACES_EXPORTER: ${process.env.OTEL_TRACES_EXPORTER}`);
      console.log(`   OTEL_METRICS_EXPORTER: ${process.env.OTEL_METRICS_EXPORTER}`);
      console.log(`   OTEL_LOGS_EXPORTER: ${process.env.OTEL_LOGS_EXPORTER}`);

      // Initialize the SDK with environment variable configuration
      console.log('🏗️ Initializing NodeSDK with forced OTLP exporters...');
      const sdk = new NodeSDK({
        instrumentations,
      });

      console.log('🔧 NodeSDK configured, starting...');

      // Start the SDK
      await sdk.start();
      console.log('✅ OpenTelemetry SDK started successfully!');

      // Test that telemetry is working by creating a test span
      if (telemetryConfig.enableCustomTracing) {
        console.log('\n🧪 Creating test span...');
        const { trace } = await import('@opentelemetry/api');
        const tracer = trace.getTracer('initialization-test', '1.0.0');
        const span = tracer.startSpan('telemetry-initialization-test');
        span.setAttributes({
          'test.initialization': true,
          'service.name': telemetryConfig.serviceName,
          'test.timestamp': Date.now(),
          'test.collector.url': collectorBaseUrl,
        });
        
        console.log('⏱️ Test span created, waiting 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        span.end();
        console.log('✅ Test span created and ended');
      }

      // Test metrics
      if (telemetryConfig.enableCustomMetrics) {
        console.log('\n🧪 Creating test metrics...');
        const { metrics } = await import('@opentelemetry/api');
        const meter = metrics.getMeter('initialization-test', '1.0.0');
        const counter = meter.createCounter('initialization_counter', {
          description: 'Counter for telemetry initialization tests',
        });
        counter.add(1, { 
          service: telemetryConfig.serviceName,
          test: 'initialization',
          timestamp: Date.now().toString(),
          collector_url: collectorBaseUrl,
        });
        console.log('✅ Test metric recorded');
      }

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('🛑 Received SIGTERM, shutting down OpenTelemetry...');
        sdk.shutdown()
          .then(() => console.log('✅ OpenTelemetry terminated successfully'))
          .catch((error) => console.error('❌ Error terminating OpenTelemetry:', error))
          .finally(() => process.exit(0));
      });

      // Create additional test spans and metrics for debugging
      if (telemetryConfig.debugMode) {
        console.log('\n⏰ Scheduling debug telemetry generation...');
        setTimeout(async () => {
          try {
            console.log('🔄 Creating additional test telemetry for debugging...');
            
            // Create multiple test spans
            const { trace } = await import('@opentelemetry/api');
            const tracer = trace.getTracer('debug-test', '1.0.0');
            
            for (let i = 0; i < 3; i++) {
              console.log(`🔍 Creating debug test span ${i}...`);
              const span = tracer.startSpan(`debug-test-span-${i}`);
              span.setAttributes({
                'debug.test': true,
                'debug.iteration': i,
                'timestamp': Date.now(),
                'collector.url': collectorBaseUrl,
              });
              await new Promise(resolve => setTimeout(resolve, 50));
              span.end();
              console.log(`✅ Debug test span ${i} completed`);
            }
            
            // Create test metrics
            console.log('📊 Creating debug test metrics...');
            const { metrics } = await import('@opentelemetry/api');
            const meter = metrics.getMeter('debug-test', '1.0.0');
            const debugCounter = meter.createCounter('debug_test_counter');
            const debugHistogram = meter.createHistogram('debug_test_histogram');
            
            for (let i = 0; i < 5; i++) {
              debugCounter.add(1, { 
                iteration: i.toString(),
                collector_url: collectorBaseUrl,
              });
              debugHistogram.record(Math.random() * 1000, { 
                iteration: i.toString(),
                collector_url: collectorBaseUrl,
              });
            }
            
            console.log('✅ Debug test metrics recorded');
            
          } catch (error) {
            console.error('❌ Error creating debug telemetry:', error);
          }
        }, 3000);

        // Repeat debug telemetry every 30 seconds
        setInterval(async () => {
          try {
            console.log('🔄 Periodic debug telemetry generation...');
            const { trace, metrics } = await import('@opentelemetry/api');
            
            // Create a periodic span
            const tracer = trace.getTracer('periodic-test', '1.0.0');
            const span = tracer.startSpan('periodic-test-span');
            span.setAttributes({
              'periodic.test': true,
              'timestamp': Date.now(),
              'collector.url': collectorBaseUrl,
            });
            span.end();
            
            // Create a periodic metric
            const meter = metrics.getMeter('periodic-test', '1.0.0');
            const periodicCounter = meter.createCounter('periodic_test_counter');
            periodicCounter.add(1, {
              timestamp: Date.now().toString(),
              collector_url: collectorBaseUrl,
            });
            
            console.log('✅ Periodic debug telemetry completed');
          } catch (error) {
            console.error('❌ Error in periodic debug telemetry:', error);
          }
        }, 30000);
      }

      console.log('\n🎉 OpenTelemetry initialization completed successfully!');
      console.log(`🔗 Collector URL: ${collectorBaseUrl}`);
      console.log(`📊 Service: ${telemetryConfig.serviceName}`);
      console.log(`🏷️ Version: ${telemetryConfig.serviceVersion}`);

    } catch (error) {
      console.error('❌ Error initializing OpenTelemetry:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      
      // Don't fail the application if telemetry fails
      console.log('⚠️ Application will continue without telemetry');
    }
  };

  init();
}