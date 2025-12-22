#!/bin/bash

echo "Testing Audit Log APIs..."
echo "========================="
echo ""

# Step 1: Login and get token
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi

echo "✅ Login successful! Token obtained."
echo ""

# Step 2: Get audit logs
echo "2. Fetching audit logs..."
AUDIT_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/audit-logs?limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo $AUDIT_RESPONSE | jq .
echo ""

# Step 3: Get audit stats
echo "3. Fetching audit statistics..."
STATS_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/audit-logs/stats" \
  -H "Authorization: Bearer $TOKEN")

echo $STATS_RESPONSE | jq .
echo ""

# Step 4: Test creating a new user (this will generate audit log)
echo "4. Creating test user to generate audit log..."
CREATE_USER=$(curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "auditTestUser",
    "password": "Test123456",
    "role": "hr",
    "two_factor_enabled": false,
    "office_ids": [1]
  }')

echo $CREATE_USER | jq .
echo ""

# Step 5: Fetch audit logs again to see the new entry
echo "5. Fetching updated audit logs..."
AUDIT_RESPONSE2=$(curl -s -X GET "http://localhost:3000/api/audit-logs?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo $AUDIT_RESPONSE2 | jq .
echo ""

echo "========================="
echo "Audit Log API Testing Complete!"
