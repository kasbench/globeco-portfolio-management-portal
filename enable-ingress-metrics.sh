#!/bin/bash

echo "🔧 Enabling NGINX Ingress Controller Metrics..."

# Check current controller configuration
echo "📋 Current controller ports:"
kubectl get deployment ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.template.spec.containers[0].ports[*].containerPort}' | tr ' ' '\n'

echo ""
echo "📋 Current controller args:"
kubectl get deployment ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.template.spec.containers[0].args[*]}' | tr ' ' '\n' | grep -E "(metric|enable)"

echo ""
echo "🔧 Adding metrics port (10254)..."
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/ports/-",
    "value": {
      "containerPort": 10254,
      "name": "prometheus",
      "protocol": "TCP"
    }
  }
]'

echo "🔧 Adding metrics arguments..."
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--enable-metrics=true"
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--metrics-per-host=false"
  }
]'

echo "⏳ Waiting for deployment to rollout..."
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=60s

echo "✅ Deployment updated! Checking new configuration..."
echo "📋 New controller ports:"
kubectl get deployment ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.template.spec.containers[0].ports[*].containerPort}' | tr ' ' '\n'

echo ""
echo "📋 New controller args (metrics-related):"
kubectl get deployment ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.template.spec.containers[0].args[*]}' | tr ' ' '\n' | grep -E "(metric|enable)"

echo ""
echo "🧪 Testing metrics endpoint..."
sleep 5
kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller 10254:10254 >/dev/null 2>&1 &
PF_PID=$!
sleep 3

if curl -s --max-time 5 http://localhost:10254/metrics >/dev/null 2>&1; then
    NGINX_METRICS=$(curl -s http://localhost:10254/metrics | grep nginx_ingress | wc -l)
    TOTAL_METRICS=$(curl -s http://localhost:10254/metrics | grep -v "^#" | wc -l)
    echo "✅ Metrics endpoint working! Total: $TOTAL_METRICS, NGINX: $NGINX_METRICS"
    
    if [ "$NGINX_METRICS" -gt 0 ]; then
        echo "🎉 NGINX metrics found! Sample:"
        curl -s http://localhost:10254/metrics | grep nginx_ingress | head -3
    else
        echo "⚠️  No NGINX metrics yet - try generating some traffic first"
    fi
else
    echo "❌ Metrics endpoint not responding"
fi

kill $PF_PID >/dev/null 2>&1
echo ""
echo "🎯 Next steps:"
echo "1. Generate traffic: curl http://globeco.local/"
echo "2. Check metrics: kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller 10254:10254"
echo "3. View metrics: curl http://localhost:10254/metrics | grep nginx_ingress"