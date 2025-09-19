#!/bin/bash

echo "🔍 Debugging Kubernetes Networking for 5-second delay..."
echo "====================================================="

# Get pod and node information
POD_NAME=$(kubectl get pods -n globeco -l app=globeco-portfolio-management-portal -o jsonpath='{.items[0].metadata.name}')
POD_IP=$(kubectl get pod -n globeco $POD_NAME -o jsonpath='{.status.podIP}')
NODE_NAME=$(kubectl get pod -n globeco $POD_NAME -o jsonpath='{.spec.nodeName}')
NODE_IP=$(kubectl get node $NODE_NAME -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')

echo "📋 Cluster Information:"
echo "Pod Name: $POD_NAME"
echo "Pod IP: $POD_IP"
echo "Node Name: $NODE_NAME"
echo "Node IP: $NODE_IP"
echo ""

# Check service endpoints
echo "🔗 Service Endpoints:"
kubectl get endpoints -n globeco globeco-portfolio-management-portal-nodeport
echo ""

# Check kube-proxy mode
echo "🔧 Kube-proxy Configuration:"
kubectl get configmap -n kube-system kube-proxy -o yaml | grep -A 5 -B 5 "mode\|bindAddress"
echo ""

# Check if there are multiple nodes
echo "🌐 Cluster Nodes:"
kubectl get nodes -o wide
echo ""

# Test direct pod IP from within cluster
echo "🧪 Testing Direct Pod IP from within cluster:"
kubectl run debug-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -X GET http://$POD_IP:3000/api/test-minimal -w "Time: %{time_total}s\n" \
  --connect-timeout 5 --max-time 10 2>/dev/null || echo "❌ Direct pod test failed"
echo ""

# Check iptables rules (if accessible)
echo "🔥 Checking iptables rules for NodePort:"
kubectl get nodes -o jsonpath='{.items[0].metadata.name}' | xargs -I {} kubectl debug node/{} -it --image=nicolaka/netshoot -- iptables -t nat -L | grep 32080 || echo "❌ Cannot access iptables"
echo ""

# Check for network policies
echo "🛡️  Network Policies:"
kubectl get networkpolicies -n globeco || echo "No network policies found"
echo ""

# Check service details
echo "📊 Service Details:"
kubectl describe svc globeco-portfolio-management-portal-nodeport -n globeco
echo ""

echo "🔍 Potential Issues to Check:"
echo "1. Multiple nodes with uneven pod distribution"
echo "2. Kube-proxy mode (iptables vs ipvs)"
echo "3. CNI plugin causing routing delays"
echo "4. Network policies blocking traffic"
echo "5. Node-to-node communication issues"
echo ""
echo "✅ Debug complete."