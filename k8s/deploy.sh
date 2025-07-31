#!/bin/bash
set -e

echo "🚀 Deploying Globeco Portfolio Management Portal (Fresh Installation)..."

# Check if NGINX Ingress Controller exists
if ! kubectl get deployment ingress-nginx-controller -n ingress-nginx >/dev/null 2>&1; then
    echo "📦 NGINX Ingress Controller not found. Installing complete NGINX Ingress Controller..."
    kubectl apply -f nginx-ingress-controller.yaml
    
    echo "⏳ Waiting for NGINX Ingress Controller to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/ingress-nginx-controller -n ingress-nginx
    
    echo "✅ NGINX Ingress Controller installed with metrics enabled!"
else
    echo "📦 NGINX Ingress Controller already exists. Applying configuration..."
    # Apply ConfigMap for existing installation
    kubectl apply -f nginx-ingress-controller-config.yaml
    
    # Patch existing deployment to enable metrics (if not already done)
    echo "🔧 Patching existing NGINX Ingress Controller to enable metrics..."
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
    ]' 2>/dev/null || echo "   Metrics port already exists"

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
    ]' 2>/dev/null || echo "   Metrics arguments already exist"
fi

# Create application namespace if it doesn't exist
echo "📦 Creating namespace 'globeco' if it does not exist..."
kubectl get namespace globeco >/dev/null 2>&1 || kubectl create namespace globeco

# Apply application manifests
echo "📦 Deploying application..."
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml

echo "✅ Application deployed!"

# Wait for application deployment to be ready
echo "⏳ Waiting for application deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/globeco-portfolio-management-portal -n globeco

# Show status
echo "📊 Deployment Status:"
echo "NGINX Ingress Controller:"
kubectl get pods -n ingress-nginx
echo ""
echo "Application:"
kubectl get pods -n globeco
kubectl get services -n globeco
kubectl get ingress -n globeco

echo ""
echo "🎉 Deployment complete!"
echo "💡 Access the application at: http://globeco.local"
echo "🔍 Check app logs: kubectl logs -n globeco deployment/globeco-portfolio-management-portal"
echo "🔍 Check NGINX logs: kubectl logs -n ingress-nginx deployment/ingress-nginx-controller"
echo "📊 Check NGINX metrics: kubectl port-forward -n ingress-nginx deployment/ingress-nginx-controller 10254:10254" 