#!/bin/bash
echo "Testing login API..."
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"Aamir","password":"Fasahaty@#786"}' \
  --silent --show-error

echo ""
echo ""
echo "Testing with admin account..."
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  --silent --show-error

echo ""
