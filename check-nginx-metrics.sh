#!/bin/bash

echo "🔍 Checking NGINX Ingress Metrics..."

# Generate some test traffic first
echo "📊 Generating test traffic..."
INGRESS_IP=$(kubectl get ingress -n globeco globeco-portfolio-management-portal -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
if [ -z "$INGRESS_IP" ]; then
    echo "⚠️  No external IP found, trying with globeco.local..."
    curl -s http://globeco.local/ > /dev/null 2>&1
    curl -s http://globeco.local/api/health > /dev/null 2>&1
    curl -s http://globeco.local/nonexistent > /dev/null 2>&1
else
    echo "✅ Found ingress IP: $INGRESS_IP"
    curl -s http://$INGRESS_IP/ > /dev/null 2>&1
    curl -s http://$INGRESS_IP/api/health > /dev/null 2>&1
    curl -s http://$INGRESS_IP/nonexistent > /dev/null 2>&1
fi

echo "🔍 Checking available metrics..."

# Check if port-forward is still running
if ! curl -s --max-time 2 http://localhost:10254/metrics > /dev/null; then
    echo "❌ Port forward not active. Please run:"
    echo "kubectl port-forward -n NAMESPACE pod/POD_NAME 10254:10254"
    exit 1
fi

# Count total metrics
TOTAL_METRICS=$(curl -s http://localhost:10254/metrics | grep -v "^#" | wc -l)
echo "📈 Total metrics available: $TOTAL_METRICS"

# Look for NGINX-specific metrics
NGINX_METRICS=$(curl -s http://localhost:10254/metrics | grep nginx_ingress | wc -l)
echo "🌐 NGINX ingress metrics: $NGINX_METRICS"

if [ "$NGINX_METRICS" -gt 0 ]; then
    echo "✅ NGINX metrics found! Sample metrics:"
    curl -s http://localhost:10254/metrics | grep nginx_ingress | head -5
else
    echo "❌ No NGINX ingress metrics found"
    echo "🔍 Available metric prefixes:"
    curl -s http://localhost:10254/metrics | grep -v "^#" | cut -d'{' -f1 | cut -d' ' -f1 | sort | uniq -c | sort -nr | head -10
    
    echo ""
    echo "💡 This might mean:"
    echo "   1. No traffic has been processed yet"
    echo "   2. NGINX metrics are not enabled in the controller"
    echo "   3. This is not the NGINX ingress controller metrics endpoint"
fi

echo ""
echo "🔧 Controller configuration check:"
kubectl get configmap -n ingress-nginx 2>/dev/null | grep -E "(nginx|ingress)" || echo "No nginx configmaps found"