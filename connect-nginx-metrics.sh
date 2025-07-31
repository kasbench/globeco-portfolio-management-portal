#!/bin/bash

echo "🔍 Finding NGINX Ingress Controller..."

# Find the ingress controller pod
CONTROLLER_POD=$(kubectl get pods -A -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
CONTROLLER_NAMESPACE=$(kubectl get pods -A -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.namespace}' 2>/dev/null)

if [ -z "$CONTROLLER_POD" ] || [ -z "$CONTROLLER_NAMESPACE" ]; then
    echo "❌ No NGINX Ingress Controller found with standard labels"
    echo "🔍 Searching for nginx pods..."
    kubectl get pods -A | grep nginx
    echo ""
    echo "💡 Try one of these commands manually:"
    echo "kubectl port-forward -n <namespace> pod/<pod-name> 10254:10254"
    exit 1
fi

echo "✅ Found controller: $CONTROLLER_POD in namespace: $CONTROLLER_NAMESPACE"

# Test if metrics port is available
echo "🧪 Testing metrics endpoint..."
kubectl port-forward -n $CONTROLLER_NAMESPACE pod/$CONTROLLER_POD 10254:10254 &
PF_PID=$!

# Wait a moment for port-forward to establish
sleep 3

# Test the connection
if curl -s --max-time 5 http://localhost:10254/metrics > /dev/null; then
    echo "✅ Metrics endpoint is working!"
    echo "🌐 Access metrics at: http://localhost:10254/metrics"
    echo "📊 Sample metrics:"
    curl -s http://localhost:10254/metrics | grep nginx_ingress | head -5
    echo ""
    echo "Press Ctrl+C to stop port forwarding..."
    wait $PF_PID
else
    echo "❌ Metrics endpoint is not responding"
    kill $PF_PID 2>/dev/null
    
    echo "🔍 Checking pod details..."
    kubectl describe pod -n $CONTROLLER_NAMESPACE $CONTROLLER_POD | grep -A 5 -B 5 "10254"
fi