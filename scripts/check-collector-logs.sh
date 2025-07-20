#!/bin/bash

echo "🔍 Checking OpenTelemetry Collector Logs"
echo "========================================"

COLLECTOR_POD="otel-collector-collector-7f95b7dfc6-ckvjn"
COLLECTOR_NS="monitoring"

echo ""
echo "📋 Collector Pod Status:"
kubectl get pod $COLLECTOR_POD -n $COLLECTOR_NS

echo ""
echo "📝 Collector Logs (last 50 lines):"
echo "Looking for incoming OTLP requests and export attempts..."
kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS --tail=50

echo ""
echo "🔍 Searching for specific telemetry activity..."
echo ""
echo "📊 Looking for OTLP receiver activity:"
kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS --tail=200 | grep -i -E "(otlp|receive|export|trace|metric)" | tail -20

echo ""
echo "🚨 Looking for any errors:"
kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS --tail=200 | grep -i -E "(error|fail|warn)" | tail -10

echo ""
echo "📈 Looking for Prometheus export activity:"
kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS --tail=200 | grep -i prometheus | tail -10

echo ""
echo "🔍 Looking for Jaeger export activity:"
kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS --tail=200 | grep -i jaeger | tail -10

echo ""
echo "🧪 Now generating some test telemetry data..."
echo "Port forwarding to application..."
kubectl port-forward deployment/globeco-portfolio-management-portal 3000:3000 -n globeco &
PORT_FORWARD_PID=$!
sleep 3

echo ""
echo "📊 Generating telemetry data and watching collector logs..."
echo "Making requests to generate telemetry..."

# Generate telemetry in background
(
    for i in {1..5}; do
        echo "  📡 Request $i/5"
        curl -s http://localhost:3000/api/telemetry/test > /dev/null
        curl -s http://localhost:3000/api/health > /dev/null
        sleep 2
    done
) &

# Watch collector logs for new activity
echo ""
echo "📝 Watching collector logs for new activity (next 15 seconds)..."
timeout 15s kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS -f | grep -E "(otlp|receive|export|globeco)" || echo "No new activity detected"

# Cleanup
kill $PORT_FORWARD_PID 2>/dev/null
wait

echo ""
echo "📊 Final check - Recent collector activity:"
kubectl logs $COLLECTOR_POD -n $COLLECTOR_NS --tail=20

echo ""
echo "🔧 Collector Configuration Check:"
echo "Checking if collector has the right configuration..."
kubectl describe pod $COLLECTOR_POD -n $COLLECTOR_NS | grep -A 10 -B 5 -i config