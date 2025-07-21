#!/bin/bash

echo "🔍 Checking Prometheus metrics..."
echo "================================="

# Default Prometheus URL - adjust as needed
PROMETHEUS_URL="${PROMETHEUS_URL:-http://node-2:31565}"

echo "📊 Prometheus URL: $PROMETHEUS_URL"
echo ""

# Function to query Prometheus
query_prometheus() {
    local query="$1"
    local name="$2"
    
    echo "🔍 Querying: $name"
    echo "   Query: $query"
    
    response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$query" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Check if we got results
        result_count=$(echo "$response" | jq -r '.data.result | length' 2>/dev/null)
        
        if [ "$result_count" = "null" ] || [ "$result_count" = "0" ]; then
            echo "   ❌ No data found"
        else
            echo "   ✅ Found $result_count metric series"
            echo "$response" | jq -r '.data.result[] | "      " + .metric.__name__ + " " + (.metric | to_entries | map(select(.key != "__name__") | .key + "=" + .value) | join(" ")) + " = " + .value[1]' 2>/dev/null || echo "   📊 Data found but couldn't parse details"
        fi
    else
        echo "   ❌ Failed to query Prometheus"
    fi
    echo ""
}

# Check for your custom metrics
echo "🧪 Checking for custom application metrics:"
echo "-------------------------------------------"

query_prometheus "api_requests_total" "API Requests Total"
query_prometheus "api_response_duration_ms" "API Response Duration"
query_prometheus "page_views_total" "Page Views Total"
query_prometheus "errors_total" "Errors Total"
query_prometheus "db_operations_total" "Database Operations Total"
query_prometheus "db_operation_duration_ms" "Database Operation Duration"
query_prometheus "active_users" "Active Users"

echo "🔍 Checking for test metrics:"
echo "-----------------------------"

query_prometheus "initialization_test_counter" "Initialization Test Counter"
query_prometheus "diagnostic_test_counter" "Diagnostic Test Counter"
query_prometheus "debug_test_counter" "Debug Test Counter"

echo "🔍 Checking for any metrics with your service name:"
echo "--------------------------------------------------"

query_prometheus "{service_name=\"globeco-portfolio-management-portal\"}" "Service-specific metrics"
query_prometheus "{__name__=~\".*globeco.*\"}" "Metrics containing 'globeco'"

echo "📋 Summary:"
echo "==========="
echo "If you see ❌ 'No data found' for your custom metrics, the issue is likely:"
echo "1. Metrics are not being exported from your application"
echo "2. OpenTelemetry Collector is not receiving the metrics"
echo "3. Collector is not forwarding metrics to Prometheus"
echo "4. Prometheus is not scraping the collector"
echo ""
echo "If you see ✅ 'initialization_test_counter' but not others:"
echo "- The collector connection works"
echo "- Your custom metrics are not being exported properly"
echo "- Check the OpenTelemetry SDK configuration"
echo ""
echo "🔧 Next steps:"
echo "- Run the diagnostic script: node scripts/diagnose-metrics.js"
echo "- Check collector logs for incoming metrics"
echo "- Verify your application is actually calling the metric functions"