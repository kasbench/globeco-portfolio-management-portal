#!/bin/bash

echo "🔍 Checking NGINX Ingress Controller setup..."

# Check if ingress controller exists
echo "📋 Looking for NGINX Ingress Controller pods..."
kubectl get pods -A -l app.kubernetes.io/name=ingress-nginx

echo ""
echo "📋 Looking for NGINX Ingress Controller services..."
kubectl get services -A -l app.kubernetes.io/name=ingress-nginx

echo ""
echo "🔍 Checking ingress controller metrics endpoint..."
CONTROLLER_SERVICE=$(kubectl get services -A -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
CONTROLLER_NAMESPACE=$(kubectl get services -A -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.namespace}' 2>/dev/null)

if [ -n "$CONTROLLER_SERVICE" ] && [ -n "$CONTROLLER_NAMESPACE" ]; then
    echo "✅ Found controller service: $CONTROLLER_SERVICE in namespace: $CONTROLLER_NAMESPACE"
    
    echo "🧪 Testing metrics endpoint..."
    kubectl port-forward -n $CONTROLLER_NAMESPACE service/$CONTROLLER_SERVICE 10254:10254 &
    PF_PID=$!
    sleep 3
    
    if curl -s http://localhost:10254/metrics | head -5; then
        echo "✅ Metrics endpoint is working!"
    else
        echo "❌ Metrics endpoint is not accessible"
    fi
    
    kill $PF_PID 2>/dev/null
else
    echo "❌ No NGINX Ingress Controller found"
    echo "💡 You may need to install NGINX Ingress Controller first"
fi

echo ""
echo "📋 Current ingress configuration:"
kubectl describe ingress -n globeco globeco-portfolio-management-portal | grep -A 10 -B 5 "Annotations"