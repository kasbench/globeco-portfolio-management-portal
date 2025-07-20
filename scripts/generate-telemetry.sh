#!/bin/bash

# Script to generate telemetry data for testing
# Usage: ./scripts/generate-telemetry.sh [base_url]

BASE_URL=${1:-"http://localhost:3000"}
ITERATIONS=${2:-20}

echo "🚀 Generating telemetry data for OpenTelemetry testing"
echo "📍 Base URL: $BASE_URL"
echo "🔄 Iterations: $ITERATIONS"
echo ""

# Function to make a request and show status
make_request() {
    local url=$1
    local description=$2
    echo -n "📡 $description... "
    
    response=$(curl -s -w "%{http_code}" -o /dev/null "$url")
    
    if [ "$response" = "200" ]; then
        echo "✅ ($response)"
    else
        echo "❌ ($response)"
    fi
}

echo "🧪 Testing telemetry endpoints..."
make_request "$BASE_URL/api/telemetry/test" "Telemetry test endpoint"
echo ""

echo "📊 Generating API traffic..."
for i in $(seq 1 $ITERATIONS); do
    echo "🔄 Iteration $i/$ITERATIONS"
    
    # Test instrumented API endpoints
    make_request "$BASE_URL/api/portfolios" "Portfolios API"
    make_request "$BASE_URL/api/orders" "Orders API"
    make_request "$BASE_URL/api/telemetry/test" "Telemetry test"
    
    # Test page views
    make_request "$BASE_URL/" "Home page"
    make_request "$BASE_URL/dashboard" "Dashboard page"
    make_request "$BASE_URL/model-management" "Model management page"
    
    # Test other API endpoints
    make_request "$BASE_URL/api/executions" "Executions API"
    make_request "$BASE_URL/api/trades" "Trades API"
    make_request "$BASE_URL/api/rebalances" "Rebalances API"
    
    # Generate some errors for error metrics
    if [ $((i % 5)) -eq 0 ]; then
        echo "🚨 Generating error for testing..."
        curl -s -o /dev/null "$BASE_URL/api/nonexistent" || true
    fi
    
    # Small delay between iterations
    sleep 1
done

echo ""
echo "✅ Telemetry generation completed!"
echo ""
echo "📊 Check Prometheus for these metrics:"
echo "   - api_requests_total"
echo "   - api_response_duration_ms"
echo "   - page_views_total"
echo "   - errors_total"
echo "   - http_server_duration"
echo ""
echo "🔍 Check Jaeger for traces from:"
echo "   - API endpoints (/api/portfolios, /api/orders, etc.)"
echo "   - Telemetry test endpoint"
echo "   - HTTP requests"
echo ""
echo "🔧 If you don't see data, check the application logs:"
echo "   kubectl logs -f deployment/globeco-portfolio-management-portal -n globeco"