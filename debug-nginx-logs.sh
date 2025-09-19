#!/bin/bash

echo "🔍 Debugging NGINX Ingress Controller..."

# Get NGINX controller pod
NGINX_POD=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.name}')
echo "NGINX Controller Pod: $NGINX_POD"

# Check current configuration
echo ""
echo "📋 Current NGINX ConfigMap:"
kubectl get configmap ingress-nginx-controller -n ingress-nginx -o yaml | grep -A 20 "data:"

# Check NGINX controller logs for errors
echo ""
echo "📝 Recent NGINX Controller Logs:"
kubectl logs -n ingress-nginx $NGINX_POD --tail=50 | grep -E "(error|warn|timeout|buffer|delay)"

# Check if NGINX is actually applying our config
echo ""
echo "🔧 NGINX Configuration Test:"
kubectl exec -n ingress-nginx $NGINX_POD -- nginx -T 2>/dev/null | grep -E "(proxy_buffer|proxy_timeout|keepalive)" | head -10

# Test direct connection to NGINX controller
echo ""
echo "🌐 Testing direct connection to NGINX controller:"
kubectl port-forward -n ingress-nginx $NGINX_POD 8080:80 &
PF_PID=$!
sleep 2

echo "Testing direct NGINX connection..."
curl -X GET http://localhost:8080/api/test-minimal \
  -H "Host: globeco.local" \
  -w "Time: %{time_total}s\n" \
  --connect-timeout 10 \
  --max-time 30

# Clean up port-forward
kill $PF_PID 2>/dev/null

echo ""
echo "✅ Debug complete. Check the output above for clues."