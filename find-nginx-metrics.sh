#!/bin/bash

echo "🔍 Comprehensive NGINX Metrics Discovery..."

# Get controller info
CONTROLLER_IMAGE=$(kubectl get deployment -n ingress-nginx -o jsonpath='{.items[0].spec.template.spec.containers[0].image}' 2>/dev/null)
echo "📦 Controller Image: $CONTROLLER_IMAGE"

# Check all exposed ports
echo "🔌 Checking all exposed ports..."
kubectl get pod -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].spec.containers[0].ports[*]}' 2>/dev/null | jq -r '.[] | "\(.name): \(.containerPort)"' 2>/dev/null || kubectl describe pod -n ingress-nginx -l app.kubernetes.io/component=controller | grep -A 5 "Ports:"

# Test common metrics ports
PORTS=(8080 9113 10254 18080 15090)
for port in "${PORTS[@]}"; do
    echo "🧪 Testing port $port..."
    kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller $port:$port >/dev/null 2>&1 &
    PF_PID=$!
    sleep 2
    
    # Test metrics endpoint
    if curl -s --max-time 3 http://localhost:$port/metrics >/dev/null 2>&1; then
        METRICS_COUNT=$(curl -s http://localhost:$port/metrics | grep -v "^#" | wc -l)
        NGINX_METRICS=$(curl -s http://localhost:$port/metrics | grep nginx | wc -l)
        echo "✅ Port $port/metrics: $METRICS_COUNT total metrics, $NGINX_METRICS nginx metrics"
        if [ "$NGINX_METRICS" -gt 0 ]; then
            echo "🎯 Found NGINX metrics on port $port!"
            curl -s http://localhost:$port/metrics | grep nginx | head -3
        fi
    else
        echo "❌ Port $port/metrics: Not accessible"
    fi
    
    # Test status endpoints
    for endpoint in "nginx_status" "status" "stats"; do
        if curl -s --max-time 3 http://localhost:$port/$endpoint >/dev/null 2>&1; then
            echo "✅ Port $port/$endpoint: Available"
        fi
    done
    
    kill $PF_PID >/dev/null 2>&1
    sleep 1
done

echo ""
echo "🔍 Checking controller logs for metrics-related messages..."
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=50 | grep -E -i "(metric|prometheus|vts|status)" || echo "No metrics-related log messages found"

echo ""
echo "📋 Current ConfigMap data:"
kubectl get configmap ingress-nginx-controller -n ingress-nginx -o jsonpath='{.data}' | jq . 2>/dev/null || kubectl get configmap ingress-nginx-controller -n ingress-nginx -o yaml | grep -A 20 "data:"