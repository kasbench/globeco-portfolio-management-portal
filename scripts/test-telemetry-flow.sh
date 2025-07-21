#!/bin/bash

echo "🧪 Testing Complete Telemetry Flow"
echo "=================================="

# Check if Next.js is running
echo "🔍 Checking if Next.js application is running..."
if curl -s http://globeco.local:31510/api/health > /dev/null 2>&1; then
    echo "✅ Next.js application is running"
else
    echo "❌ Next.js application is not running on port 31510"
    echo "Please start your application with: npm run dev"
    exit 1
fi

echo ""
echo "📊 Generating test metrics via API endpoints..."
echo "----------------------------------------------"

# Test the telemetry test endpoint
echo "🧪 Testing telemetry test endpoint..."
response=$(curl -s http://globeco.local:31510/api/telemetry/test)
echo "Response: $response"

# Test multiple API requests to generate metrics
echo ""
echo "🌐 Generating API request metrics..."
for i in {1..5}; do
    echo "   Making request $i/5..."
    curl -s http://globeco.local:31510/api/health > /dev/null
    sleep 0.5
done

# Test page view metrics
echo ""
echo "👁️ Generating page view metrics..."
curl -s -X POST http://globeco.local:31510/api/telemetry/pageview \
  -H "Content-Type: application/json" \
  -d '{"page": "/test-page-1"}' > /dev/null

curl -s -X POST http://globeco.local:31510/api/telemetry/pageview \
  -H "Content-Type: application/json" \
  -d '{"page": "/test-page-2"}' > /dev/null

# Test error metrics
echo ""
echo "🚨 Generating error metrics..."
curl -s -X POST http://globeco.local:31510/api/telemetry/error \
  -H "Content-Type: application/json" \
  -d '{"error": {"message": "Test error 1", "type": "test_error", "context": "test"}}' > /dev/null

curl -s -X POST http://globeco.local:31510/api/telemetry/error \
  -H "Content-Type: application/json" \
  -d '{"error": {"message": "Test error 2", "type": "validation_error", "context": "form"}}' > /dev/null

echo ""
echo "⏰ Waiting 10 seconds for metrics to be exported..."
echo "(Check your application logs and collector logs during this time)"

# Countdown
for i in {10..1}; do
    echo "   $i seconds remaining..."
    sleep 1
done

echo ""
echo "✅ Test completed!"
echo ""
echo "🔍 Next steps to verify metrics:"
echo "================================"
echo "1. Check your Next.js application logs for metric export messages"
echo "2. Check your OpenTelemetry Collector logs:"
echo "   kubectl logs -n monitoring deployment/otel-collector-collector"
echo ""
echo "3. Check Prometheus for these metrics:"
echo "   - api_requests_total"
echo "   - api_response_duration_ms"
echo "   - page_views_total"
echo "   - errors_total"
echo "   - db_operations_total"
echo ""
echo "4. Run the Prometheus check script:"
echo "   ./scripts/check-prometheus-metrics.sh"