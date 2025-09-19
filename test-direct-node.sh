#!/bin/bash

echo "🎯 Testing Direct Node Access..."
echo "================================"

# Pod is on node-3 (192.168.0.105)
NODE_IP="192.168.0.105"

echo "Pod is running on node-3: $NODE_IP"
echo "Testing direct access to the node with the pod..."
echo ""

# Test 1: Direct node access
echo "🚀 Test 1: Direct Node IP Access"
curl -X POST http://$NODE_IP:32080/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Direct Node Test","version":1}]' \
  -w "Time: %{time_total}s\n" \
  --connect-timeout 10 --max-time 30

echo ""

# Test 2: Compare with current globeco.local
echo "🐌 Test 2: Current globeco.local (for comparison)"
curl -X POST http://globeco.local:32080/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Globeco Local Test","version":1}]' \
  -w "Time: %{time_total}s\n" \
  --connect-timeout 10 --max-time 30

echo ""

# Test 3: Check what globeco.local resolves to
echo "🔍 Test 3: DNS Resolution Check"
echo "globeco.local resolves to:"
nslookup globeco.local | grep Address | tail -1

echo ""
echo "📊 Analysis:"
echo "- If direct node IP is fast: Multi-node routing is the issue"
echo "- If both are slow: Issue is elsewhere"
echo "- Check which node globeco.local points to vs where pod runs"