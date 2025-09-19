#!/bin/bash

echo "🔍 Testing Response Sizes and Timing..."
echo "======================================"

BASE_URL="http://globeco.local:32080"

echo "📊 Testing different endpoints with response size analysis:"
echo ""

# Test 1: Fast endpoint
echo "🚀 Fast Endpoint: /api/test-minimal (GET)"
curl -X GET $BASE_URL/api/test-minimal \
  -w "Size: %{size_download} bytes, Time: %{time_total}s\n" \
  -o /tmp/response1.json -s
echo "Response preview:"
head -c 200 /tmp/response1.json
echo -e "\n"

# Test 2: Fast endpoint with POST
echo "🚀 Fast Endpoint: /api/test-minimal (POST)"
curl -X POST $BASE_URL/api/test-minimal \
  -H "Content-Type: application/json" \
  -d '[{"name":"Size Test","version":1}]' \
  -w "Size: %{size_download} bytes, Time: %{time_total}s\n" \
  -o /tmp/response2.json -s
echo "Response preview:"
head -c 200 /tmp/response2.json
echo -e "\n"

# Test 3: Raw response test
echo "🧪 Raw Response Test:"
curl -X POST $BASE_URL/api/test-raw-response \
  -H "Content-Type: application/json" \
  -d '[{"name":"Raw Test","version":1}]' \
  -w "Size: %{size_download} bytes, Time: %{time_total}s\n" \
  -o /tmp/response3.json -s
echo "Response preview:"
head -c 200 /tmp/response3.json
echo -e "\n"

# Test 4: Slow endpoint
echo "🐌 Slow Endpoint: /api/portfolios/bulk"
curl -X POST $BASE_URL/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Size Test Portfolio","version":1}]' \
  -w "Size: %{size_download} bytes, Time: %{time_total}s\n" \
  -o /tmp/response4.json -s
echo "Response preview:"
head -c 200 /tmp/response4.json
echo -e "\n"

# Test 5: Compare with different payload sizes
echo "📏 Testing different payload sizes on bulk portfolio:"

echo "Small payload (1 item):"
curl -X POST $BASE_URL/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Small Test","version":1}]' \
  -w "Size: %{size_download} bytes, Time: %{time_total}s\n" \
  -o /tmp/response5a.json -s

echo "Medium payload (5 items):"
curl -X POST $BASE_URL/api/portfolios/bulk \
  -H "Content-Type: application/json" \
  -d '[{"name":"Test1","version":1},{"name":"Test2","version":1},{"name":"Test3","version":1},{"name":"Test4","version":1},{"name":"Test5","version":1}]' \
  -w "Size: %{size_download} bytes, Time: %{time_total}s\n" \
  -o /tmp/response5b.json -s

echo ""
echo "📋 Response Size Summary:"
echo "test-minimal GET: $(wc -c < /tmp/response1.json) bytes"
echo "test-minimal POST: $(wc -c < /tmp/response2.json) bytes"
echo "test-raw-response: $(wc -c < /tmp/response3.json) bytes"
echo "portfolios/bulk (1): $(wc -c < /tmp/response4.json) bytes"
echo "portfolios/bulk (1): $(wc -c < /tmp/response5a.json) bytes"
echo "portfolios/bulk (5): $(wc -c < /tmp/response5b.json) bytes"

echo ""
echo "🔍 Analysis:"
echo "- If raw response is fast: NextResponse.json() is the issue"
echo "- If response sizes are similar: Size is not the issue"
echo "- If larger payloads are slower: Response size correlation"

# Cleanup
rm -f /tmp/response*.json