#!/bin/bash
set -e

# echo "Creating namespace 'globeco' if it does not exist..."
# kubectl get namespace globeco >/dev/null 2>&1 || kubectl create namespace globeco

echo "Applying Kubernetes manifests in ./k8s..."
kubectl apply -n globeco -f ./k8s/deployment.yaml
kubectl apply -n globeco -f ./k8s/service.yaml
kubectl apply -n globeco -f ./k8s/service-nodeport.yaml
kubectl apply -n globeco -f ./k8s/ingress.yaml

echo "Deployment complete." 