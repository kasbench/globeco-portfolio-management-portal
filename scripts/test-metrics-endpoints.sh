#!/bin/bash

echo "🧪 Testing metrics generation via API endpoints..."

# Base URL - adjust if your app runs on a different port
BASE_URL="http://localhost:3000"

echo "📊 Testing telemetry test endpoint..."
curl -s "$BASE_URL/api/telemetry/test" | jq '.' || echo "Response: $(curl -s $BASE_URL/api/telemetry/test)"

echo -e "\n👁️ Testing page view endpoint..."
curl -s -X POST "$BASE_URL/api/telemetry/pageview" \
  -H "Content-Type: application/json" \
  -d '{"page": "/test-page"}' | jq '.' || echo "Response: $(curl -s -X POST $BASE_URL/api/telemetry/pageview -H 'Content-Type: application/json' -d '{\"page\": \"/test-page\"}')"

echo -e "\n🚨 Testing error endpoint..."
curl -s -X POST "$BASE_URL/api/telemetry/error" \
  -H "Content-Type: application/json" \
  -d '{"error": {"message": "Test error", "type": "test_error", "context": "test"}}' | jq '.' || echo "Response: $(curl -s -X POST $BASE_URL/api/telemetry/error -H 'Content-Type: application/json' -d '{\"error\": {\"message\": \"Test error\", \"type\": \"test_error\", \"context\": \"test\"}}')"

echo -e "\n🏥 Testing health endpoint..."
curl -s "$BASE_URL/api/health" | jq '.' || echo "Response: $(curl -s $BASE_URL/api/health)"

echo -e "\n⏰ Waiting 10 seconds for metrics to be exported..."
sleep 10

echo -e "\n✅ Test completed! Check your Prometheus metrics for:"
echo "   - api_requests_total"
echo "   - api_response_duration_ms"
echo "   - page_views_total"
echo "   - errors_total"
echo "   - db_operations_total"
echo "   - db_operation_duration_ms"