#!/bin/bash

echo "🔧 Telemetry Configuration Check"
echo "================================"

echo ""
echo "📋 Environment Variables:"
echo "------------------------"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "OTEL_SERVICE_NAME: ${OTEL_SERVICE_NAME:-not set}"
echo "OTEL_SERVICE_VERSION: ${OTEL_SERVICE_VERSION:-not set}"
echo "OTEL_EXPORTER_OTLP_ENDPOINT: ${OTEL_EXPORTER_OTLP_ENDPOINT:-not set}"
echo "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: ${OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:-not set}"
echo "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: ${OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:-not set}"
echo "OTEL_DEBUG: ${OTEL_DEBUG:-not set}"
echo "OTEL_LOG_LEVEL: ${OTEL_LOG_LEVEL:-not set}"
echo "OTEL_METRIC_EXPORT_INTERVAL: ${OTEL_METRIC_EXPORT_INTERVAL:-not set}"

echo ""
echo "🌐 Testing Collector Connectivity:"
echo "----------------------------------"

# Default collector URLs to test
COLLECTOR_URLS=(
    "http://otel-collector-collector.monitoring.svc.cluster.local:4318"
    "http://localhost:4318"
    "http://127.0.0.1:4318"
)

for url in "${COLLECTOR_URLS[@]}"; do
    echo "Testing: $url"
    
    # Test root endpoint
    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo "  ✅ Root endpoint accessible"
    else
        echo "  ❌ Root endpoint not accessible"
    fi
    
    # Test metrics endpoint
    if curl -s --connect-timeout 5 "$url/v1/metrics" > /dev/null 2>&1; then
        echo "  ✅ Metrics endpoint accessible"
    else
        echo "  ❌ Metrics endpoint not accessible"
    fi
    
    # Test traces endpoint
    if curl -s --connect-timeout 5 "$url/v1/traces" > /dev/null 2>&1; then
        echo "  ✅ Traces endpoint accessible"
    else
        echo "  ❌ Traces endpoint not accessible"
    fi
    
    echo ""
done

echo "🔍 Recommendations:"
echo "==================="

if [ -z "$OTEL_EXPORTER_OTLP_ENDPOINT" ]; then
    echo "⚠️  OTEL_EXPORTER_OTLP_ENDPOINT is not set"
    echo "   Set it to your collector URL, e.g.:"
    echo "   export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-collector.monitoring.svc.cluster.local:4318"
fi

if [ -z "$OTEL_SERVICE_NAME" ]; then
    echo "⚠️  OTEL_SERVICE_NAME is not set"
    echo "   Set it to identify your service, e.g.:"
    echo "   export OTEL_SERVICE_NAME=globeco-portfolio-management-portal"
fi

if [ "$OTEL_DEBUG" != "true" ]; then
    echo "💡 Enable debug mode for more detailed logging:"
    echo "   export OTEL_DEBUG=true"
fi

if [ -z "$OTEL_METRIC_EXPORT_INTERVAL" ]; then
    echo "💡 Set a shorter metric export interval for testing:"
    echo "   export OTEL_METRIC_EXPORT_INTERVAL=2000"
fi

echo ""
echo "🚀 To test with proper configuration, run:"
echo "export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-collector.monitoring.svc.cluster.local:4318"
echo "export OTEL_SERVICE_NAME=globeco-portfolio-management-portal"
echo "export OTEL_DEBUG=true"
echo "export OTEL_METRIC_EXPORT_INTERVAL=2000"
echo "npm run dev"