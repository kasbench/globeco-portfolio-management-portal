#!/bin/bash

echo "🔍 Checking OpenTelemetry Collector Configuration"
echo "==============================================="

COLLECTOR_POD="otel-collector-collector-7f95b7dfc6-ckvjn"
COLLECTOR_NS="monitoring"

echo ""
echo "📋 Collector Pod Details:"
kubectl describe pod $COLLECTOR_POD -n $COLLECTOR_NS

echo ""
echo "🔧 Collector ConfigMap (if exists):"
kubectl get configmaps -n $COLLECTOR_NS | grep -i collector

# Try to find the collector configuration
echo ""
echo "📝 Looking for collector configuration..."
COLLECTOR_CONFIGMAP=$(kubectl get configmaps -n $COLLECTOR_NS -o name | grep -i collector | head -1)

if [ ! -z "$COLLECTOR_CONFIGMAP" ]; then
    echo "Found collector ConfigMap: $COLLECTOR_CONFIGMAP"
    kubectl get $COLLECTOR_CONFIGMAP -n $COLLECTOR_NS -o yaml
else
    echo "No collector ConfigMap found, checking pod environment and volumes..."
    kubectl describe pod $COLLECTOR_POD -n $COLLECTOR_NS | grep -A 20 -B 5 -E "(Environment|Volumes|Mounts)"
fi

echo ""
echo "🌐 Collector Service Details:"
kubectl get svc -n $COLLECTOR_NS | grep -i collector
kubectl describe svc otel-collector-collector -n $COLLECTOR_NS 2>/dev/null || echo "Service not found with that exact name"

echo ""
echo "🔍 All services in monitoring namespace:"
kubectl get svc -n $COLLECTOR_NS

echo ""
echo "📊 Checking if collector is exposing metrics endpoint:"
echo "Trying to access collector's own metrics..."
kubectl port-forward pod/$COLLECTOR_POD 8888:8888 -n $COLLECTOR_NS &
METRICS_PID=$!
sleep 3

echo "Checking collector's internal metrics..."
curl -s http://localhost:8888/metrics | head -20 || echo "Could not access collector metrics"

kill $METRICS_PID 2>/dev/null

echo ""
echo "🧪 Testing collector endpoints from within cluster:"
kubectl run test-collector-endpoints --rm -i --tty --image=curlimages/curl -- /bin/sh -c "
echo 'Testing collector OTLP endpoints...'
echo 'Testing HTTP endpoint (port 4318):'
curl -v -X POST http://otel-collector-collector.monitoring.svc.cluster.local:4318/v1/traces -H 'Content-Type: application/json' -d '{\"resourceSpans\":[]}'
echo ''
echo 'Testing gRPC endpoint (port 4317) - should fail for HTTP:'
curl -v http://otel-collector-collector.monitoring.svc.cluster.local:4317/
"