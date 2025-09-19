#!/bin/bash

echo "🔍 Debugging NGINX Location-Specific Issues..."
echo "=============================================="

# Get NGINX controller pod
NGINX_POD=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.name}')
echo "NGINX Controller Pod: $NGINX_POD"
echo ""

# Check NGINX configuration for location-specific rules
echo "📋 NGINX Configuration Analysis:"
echo "Checking for location-specific rules that might affect /api/portfolios/bulk..."
echo ""

# Extract NGINX config and look for location blocks
kubectl exec -n ingress-nginx $NGINX_POD -- nginx -T 2>/dev/null | grep -A 10 -B 5 "location.*api" | head -50

echo ""
echo "🔍 Looking for proxy settings in NGINX config:"
kubectl exec -n ingress-nginx $NGINX_POD -- nginx -T 2>/dev/null | grep -E "(proxy_buffer|proxy_timeout|location.*portfolios)" | head -20

echo ""
echo "📊 Checking for rate limiting or special handling:"
kubectl exec -n ingress-nginx $NGINX_POD -- nginx -T 2>/dev/null | grep -E "(limit_req|limit_conn|portfolios|bulk)" | head -10

echo ""
echo "🧪 Testing different URL patterns through ingress:"

BASE_URL="http://globeco.local"

echo "Fast API (for comparison):"
curl -X GET $BASE_URL/api/test-minimal -w "Time: %{time_total}s\n" -o /dev/null -s

echo "Slow API:"
curl -X POST $BASE_URL/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Ingress Test","version":1}]' \
  -w "Time: %{time_total}s\n" -o /dev/null -s

echo "Test similar path pattern:"
curl -X POST $BASE_URL/api/test-portfolio-pattern \
  -H "Content-Type: application/json" \
  -d '[{"name":"Pattern Test","version":1}]' \
  -w "Time: %{time_total}s\n" -o /dev/null -s

echo ""
echo "🔍 Checking NGINX access logs for patterns:"
kubectl logs -n ingress-nginx $NGINX_POD --tail=20 | grep -E "(portfolios|bulk|test-minimal)" | tail -10

echo ""
echo "✅ Debug complete. Look for differences in how NGINX handles these paths."