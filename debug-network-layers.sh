#!/bin/bash

echo "🔍 Debugging Network Layers for 5-second delay..."
echo "================================================"

# Get cluster and pod information
echo "📋 Cluster Information:"
kubectl get nodes -o wide
echo ""

# Get pod IP directly
POD_NAME=$(kubectl get pods -n globeco -l app=globeco-portfolio-management-portal -o jsonpath='{.items[0].metadata.name}')
POD_IP=$(kubectl get pod -n globeco $POD_NAME -o jsonpath='{.status.podIP}')
NODE_NAME=$(kubectl get pod -n globeco $POD_NAME -o jsonpath='{.spec.nodeName}')
NODE_IP=$(kubectl get node $NODE_NAME -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')

echo "Pod Name: $POD_NAME"
echo "Pod IP: $POD_IP"
echo "Node Name: $NODE_NAME"
echo "Node IP: $NODE_IP"
echo ""

# Test 1: Direct pod IP (if accessible)
echo "🧪 Test 1: Direct Pod IP (if accessible)"
echo "Testing: http://$POD_IP:3000/api/test-minimal"
timeout 10s curl -X GET http://$POD_IP:3000/api/test-minimal \
  -w "Time: %{time_total}s\n" \
  --connect-timeout 5 \
  --max-time 10 2>/dev/null || echo "❌ Pod IP not accessible (expected in most clusters)"
echo ""

# Test 2: Node IP with NodePort
echo "🧪 Test 2: Node IP with NodePort"
echo "Testing: http://$NODE_IP:32080/api/test-minimal"
timeout 10s curl -X GET http://$NODE_IP:32080/api/test-minimal \
  -w "Time: %{time_total}s\n" \
  --connect-timeout 5 \
  --max-time 10 2>/dev/null || echo "❌ Node IP not accessible"
echo ""

# Test 3: Cluster IP (from within cluster)
CLUSTER_IP=$(kubectl get svc -n globeco globeco-portfolio-management-portal-nodeport -o jsonpath='{.spec.clusterIP}')
echo "🧪 Test 3: Cluster IP (from within cluster)"
echo "Cluster IP: $CLUSTER_IP"
kubectl run debug-pod --image=curlimages/curl --rm -it --restart=Never -- \
  curl -X GET http://$CLUSTER_IP:3000/api/test-minimal -w "Time: %{time_total}s\n" \
  --connect-timeout 5 --max-time 10 2>/dev/null || echo "❌ Cluster test failed"
echo ""

# Test 4: DNS resolution timing
echo "🧪 Test 4: DNS Resolution Timing"
echo "Resolving globeco.local..."
time nslookup globeco.local 2>/dev/null || echo "❌ DNS resolution failed"
echo ""

# Test 5: TCP connection timing
echo "🧪 Test 5: TCP Connection Timing"
echo "Testing TCP connection to globeco.local:32080..."
timeout 10s bash -c "time echo > /dev/tcp/globeco.local/32080" 2>&1 || echo "❌ TCP connection failed"
echo ""

# Test 6: Different HTTP methods
echo "🧪 Test 6: Different HTTP Methods"
echo "Testing HEAD request (no body):"
timeout 10s curl -I http://globeco.local:32080/api/test-minimal \
  -w "Time: %{time_total}s\n" \
  --connect-timeout 5 --max-time 10 2>/dev/null || echo "❌ HEAD request failed"
echo ""

# Test 7: Check if it's specific to your machine
echo "🧪 Test 7: Network Interface Information"
echo "Local network interfaces:"
ip addr show 2>/dev/null | grep -E "(inet |UP)" || ifconfig 2>/dev/null | grep -E "(inet |UP)"
echo ""

echo "🔍 Analysis:"
echo "- If pod IP works fast: Issue is in NodePort/Service layer"
echo "- If node IP works fast: Issue is in DNS/routing to globeco.local"
echo "- If cluster IP works fast: Issue is in external network access"
echo "- If DNS is slow: Issue is in name resolution"
echo "- If TCP connection is slow: Issue is in network routing"
echo ""
echo "✅ Debug complete. Compare the timing results above."