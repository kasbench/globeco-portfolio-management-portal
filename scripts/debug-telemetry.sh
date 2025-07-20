#!/bin/bash

# Comprehensive OpenTelemetry debugging script
# Usage: ./scripts/debug-telemetry.sh

echo "🔍 OpenTelemetry Debugging Script"
echo "=================================="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not available. Please install kubectl first."
    exit 1
fi

# Check if the deployment exists
echo "📋 Checking deployment status..."
kubectl get deployment globeco-portfolio-management-portal -n globeco

if [ $? -ne 0 ]; then
    echo "❌ Deployment not found. Please deploy the application first."
    exit 1
fi

echo ""
echo "🔍 Checking pod status..."
kubectl get pods -n globeco -l app=globeco-portfolio-management-portal

echo ""
echo "📊 Checking environment variables in the pod..."
POD_NAME=$(kubectl get pods -n globeco -l app=globeco-portfolio-management-portal -o jsonpath='{.items[0].metadata.name}')
echo "Pod name: $POD_NAME"

echo ""
echo "🌍 OpenTelemetry environment variables:"
kubectl exec $POD_NAME -n globeco -- env | grep OTEL | sort

echo ""
echo "📝 Checking application logs (last 50 lines)..."
kubectl logs $POD_NAME -n globeco --tail=50

echo ""
echo "🔗 Testing collector connectivity..."
echo "Port forwarding to test connectivity..."

# Start port forwarding in background
kubectl port-forward deployment/globeco-portfolio-management-portal 3000:3000 -n globeco &
PORT_FORWARD_PID=$!

# Wait for port forward to be ready
sleep 5

echo ""
echo "🧪 Testing debug endpoints..."

# Test the collector debug endpoint
echo "Testing collector connectivity debug endpoint..."
curl -s http://localhost:3000/api/debug/collector | jq '.' || curl -s http://localhost:3000/api/debug/collector

echo ""
echo "🏥 Testing health endpoint..."
curl -s http://localhost:3000/api/health | jq '.' || curl -s http://localhost:3000/api/health

echo ""
echo "🧪 Testing telemetry test endpoint..."
curl -s http://localhost:3000/api/telemetry/test | jq '.' || curl -s http://localhost:3000/api/telemetry/test

echo ""
echo "📊 Testing instrumented API endpoints..."
curl -s http://localhost:3000/api/portfolios | head -c 200
echo ""
curl -s http://localhost:3000/api/orders | head -c 200
echo ""

# Clean up port forwarding
kill $PORT_FORWARD_PID 2>/dev/null

echo ""
echo "🔍 Checking OpenTelemetry Collector status..."
kubectl get pods -n monitoring -l app.kubernetes.io/name=opentelemetry-collector

echo ""
echo "📝 Checking collector logs (last 20 lines)..."
COLLECTOR_POD=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=opentelemetry-collector -o jsonpath='{.items[0].metadata.name}')
if [ ! -z "$COLLECTOR_POD" ]; then
    echo "Collector pod: $COLLECTOR_POD"
    kubectl logs $COLLECTOR_POD -n monitoring --tail=20
else
    echo "❌ Collector pod not found"
fi

echo ""
echo "🔍 Checking Prometheus status..."
kubectl get pods -n monitor -l app=prometheus

echo ""
echo "🔍 Checking Jaeger status..."
kubectl get pods -n observability -l app=jaeger

echo ""
echo "📊 Summary and Next Steps:"
echo "========================="
echo ""
echo "1. Check the application logs above for OpenTelemetry initialization messages"
echo "2. Look for these key messages:"
echo "   - '🚀 Starting OpenTelemetry initialization...'"
echo "   - '✅ OpenTelemetry SDK started successfully!'"
echo "   - '🧪 Test span created and ended'"
echo "   - '✅ Test metric recorded'"
echo ""
echo "3. Check the collector connectivity test results"
echo "4. Verify that the collector, Prometheus, and Jaeger pods are running"
echo ""
echo "🔧 If issues persist:"
echo "   - Check collector configuration for OTLP receivers"
echo "   - Verify network policies allow communication"
echo "   - Check if the collector is exporting to Prometheus/Jaeger correctly"
echo ""
echo "📞 For manual testing:"
echo "   kubectl port-forward deployment/globeco-portfolio-management-portal 3000:3000 -n globeco"
echo "   curl http://localhost:3000/api/debug/collector"
echo "   curl http://localhost:3000/api/telemetry/test"