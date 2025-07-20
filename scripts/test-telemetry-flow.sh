#!/bin/bash

echo "🔍 Testing Direct Telemetry Flow to Collector"
echo "============================================="

echo ""
echo "1. 🧪 Testing if our application data reaches the collector..."

# Port forward to the application
kubectl port-forward deployment/globeco-portfolio-management-portal 3000:3000 -n globeco &
APP_PID=$!
sleep 3

echo ""
echo "2. 📊 Generating telemetry data and monitoring collector logs..."

# Start monitoring collector logs in background
kubectl logs -f otel-collector-collector-7f95b7dfc6-ckvjn -n monitoring | grep -E "(globeco|portfolio)" &
COLLECTOR_LOG_PID=$!

echo "Watching collector logs for 'globeco' or 'portfolio' entries..."
echo "Making telemetry requests..."

# Generate telemetry data
for i in {1..10}; do
    echo "  📡 Request $i/10"
    curl -s http://localhost:3000/api/telemetry/test > /dev/null
    curl -s http://localhost:3000/api/health > /dev/null
    sleep 2
done

echo ""
echo "3. 🔍 Checking if collector received our data..."
sleep 5

# Stop monitoring
kill $COLLECTOR_LOG_PID 2>/dev/null
kill $APP_PID 2>/dev/null

echo ""
echo "4. 📝 Checking recent collector logs for our service..."
kubectl logs otel-collector-collector-7f95b7dfc6-ckvjn -n monitoring --tail=50 | grep -i -E "(globeco|portfolio|service\.name)" || echo "❌ No logs found with our service name"

echo ""
echo "5. 🧪 Testing raw OTLP export from within cluster..."

# Test sending data directly to collector from within cluster
kubectl run test-otlp-export --rm -i --tty --image=curlimages/curl -- /bin/sh -c "
echo '🧪 Testing direct OTLP export to collector...'

# Test traces endpoint
echo 'Testing traces endpoint:'
curl -v -X POST http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/traces \
  -H 'Content-Type: application/json' \
  -d '{
    \"resourceSpans\": [{
      \"resource\": {
        \"attributes\": [{
          \"key\": \"service.name\",
          \"value\": {\"stringValue\": \"test-globeco-service\"}
        }]
      },
      \"scopeSpans\": [{
        \"scope\": {\"name\": \"test-scope\"},
        \"spans\": [{
          \"traceId\": \"12345678901234567890123456789012\",
          \"spanId\": \"1234567890123456\",
          \"name\": \"test-span\",
          \"kind\": 1,
          \"startTimeUnixNano\": \"$(date +%s)000000000\",
          \"endTimeUnixNano\": \"$(date +%s)000000000\"
        }]
      }]
    }]
  }'

echo ''
echo 'Testing metrics endpoint:'
curl -v -X POST http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/metrics \
  -H 'Content-Type: application/json' \
  -d '{
    \"resourceMetrics\": [{
      \"resource\": {
        \"attributes\": [{
          \"key\": \"service.name\",
          \"value\": {\"stringValue\": \"test-globeco-service\"}
        }]
      },
      \"scopeMetrics\": [{
        \"scope\": {\"name\": \"test-scope\"},
        \"metrics\": [{
          \"name\": \"test_counter\",
          \"sum\": {
            \"dataPoints\": [{
              \"attributes\": [],
              \"startTimeUnixNano\": \"$(date +%s)000000000\",
              \"timeUnixNano\": \"$(date +%s)000000000\",
              \"asInt\": \"1\"
            }],
            \"aggregationTemporality\": 2,
            \"isMonotonic\": true
          }
        }]
      }]
    }]
  }'
"

echo ""
echo "6. 📊 Final check - looking for our test data in collector logs..."
sleep 3
kubectl logs otel-collector-collector-7f95b7dfc6-ckvjn -n monitoring --tail=20 | grep -i "test-globeco" || echo "❌ Test data not found in collector logs"

echo ""
echo "🔍 Summary:"
echo "=========="
echo "If you don't see 'globeco' or 'portfolio' in the collector logs above,"
echo "it means your application's telemetry data is not reaching the collector."
echo ""
echo "This could be due to:"
echo "1. OTLP data format issues"
echo "2. Network connectivity problems"
echo "3. OpenTelemetry SDK configuration issues"
echo "4. Exporter not actually sending data"