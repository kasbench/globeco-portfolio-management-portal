#!/bin/bash

echo "🔍 Investigating Kubernetes Connection Delay..."
echo "=============================================="

# Check kube-proxy configuration
echo "📋 Kube-proxy mode and configuration:"
kubectl get configmap kube-proxy -n kube-system -o yaml | grep -A 10 -B 5 "mode\|conntrack"

echo ""
echo "🔧 Check iptables rules for NodePort 32080:"
# This might not work depending on cluster access
kubectl get nodes -o jsonpath='{.items[0].metadata.name}' | xargs -I {} \
  kubectl debug node/{} -it --image=nicolaka/netshoot -- \
  iptables -t nat -L KUBE-NODEPORTS | grep 32080 2>/dev/null || echo "❌ Cannot access iptables"

echo ""
echo "🌐 Check service configuration:"
kubectl get svc globeco-portfolio-management-portal-nodeport -n globeco -o yaml

echo ""
echo "📊 Check endpoints:"
kubectl get endpoints globeco-portfolio-management-portal-nodeport -n globeco

echo ""
echo "🔍 Potential fixes to try:"
echo "1. Change kube-proxy mode from iptables to ipvs"
echo "2. Adjust conntrack settings"
echo "3. Use ClusterIP + Ingress instead of NodePort"
echo "4. Enable connection pooling in applications"