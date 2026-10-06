#!/bin/bash
BASE=http://localhost:3000/api/v1
PHONE=9164464170
PASS='Saeema124'
JSON='Content-Type: application/json'

pretty() { python3 -m json.tool; }

# Reads a value from JSON on stdin. Usage: ... | field data accessToken
field() {
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    for k in sys.argv[1:]:
        d = d[int(k)] if k.isdigit() else d[k]
    print(d)
except Exception:
    print('')
" "$@"
}

HTTP=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health)
if [ "$HTTP" != "200" ]; then
  echo "Server is not running or not healthy (health returned: $HTTP)."
  echo "Start it with: npm run start:dev"
  exit 1
fi

echo "--- 0. Register a test user (201 first time, 409 after)"
curl -s -X POST $BASE/auth/register -H "$JSON" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\",\"firstName\":\"Script\",\"lastName\":\"Tester\"}" | pretty

TOKEN=$(curl -s -X POST $BASE/auth/login -H "$JSON" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}" | field data accessToken)
if [ -z "$TOKEN" ]; then
  echo "Login failed. Check PHONE and PASS at the top of this script."
  exit 1
fi
echo; echo "Token: ${TOKEN:0:20}..."

PROJECT_ID=$(curl -s -X POST $BASE/projects -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d '{"name":"Script Test"}' | field data id)
echo "Project: $PROJECT_ID"

echo; echo "--- 1. Create resource 'tasks' (201)"
curl -s -X POST $BASE/projects/$PROJECT_ID/resources \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" -d '{"name":"tasks"}' | pretty

echo; echo "--- 1b. Same name again (409 expected)"
curl -s -X POST $BASE/projects/$PROJECT_ID/resources \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" -d '{"name":"tasks"}' | pretty

echo; echo "--- 2. Create two records as the owner (201)"
curl -s -X POST $BASE/projects/$PROJECT_ID/resources/tasks/records \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d '{"data":{"title":"First Task","completed":false}}' | pretty
curl -s -X POST $BASE/projects/$PROJECT_ID/resources/tasks/records \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d '{"data":{"title":"Second Task","completed":true}}' | pretty

echo; echo "--- 3. List records (200)"
curl -s "$BASE/projects/$PROJECT_ID/resources/tasks/records" \
  -H "Authorization: Bearer $TOKEN" | pretty

echo; echo "--- 4. Filter completed=false (200, one record)"
curl -s "$BASE/projects/$PROJECT_ID/resources/tasks/records?completed=false" \
  -H "Authorization: Bearer $TOKEN" | pretty

echo; echo "--- 5. Create a PUBLIC api key (201)"
PUB_JSON=$(curl -s -X POST $BASE/projects/$PROJECT_ID/api-keys \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d '{"name":"script public key","keyType":"public"}')
PUB_KEY=$(echo "$PUB_JSON" | field data key)
PUB_ID=$(echo "$PUB_JSON" | field data id)
echo "Public key: ${PUB_KEY:0:11}..."

echo; echo "--- 6. Read with the public key (200)"
curl -s "$BASE/projects/$PROJECT_ID/resources/tasks/records" \
  -H "x-api-key: $PUB_KEY" | pretty

echo; echo "--- 7. Write with the public key (403 expected)"
curl -s -X POST $BASE/projects/$PROJECT_ID/resources/tasks/records \
  -H "x-api-key: $PUB_KEY" -H "$JSON" \
  -d '{"data":{"title":"Should be blocked"}}' | pretty

echo; echo "--- 8. Wrong key (401 expected)"
curl -s "$BASE/projects/$PROJECT_ID/resources/tasks/records" \
  -H "x-api-key: pk_wrongkey" | pretty

echo; echo "--- 9. Write with a SECRET key (201 expected)"
SEC_KEY=$(curl -s -X POST $BASE/projects/$PROJECT_ID/api-keys \
  -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d '{"name":"script secret key","keyType":"secret"}' | field data key)
curl -s -X POST $BASE/projects/$PROJECT_ID/resources/tasks/records \
  -H "x-api-key: $SEC_KEY" -H "$JSON" \
  -d '{"data":{"title":"Created by an external app","completed":true}}' | pretty

echo; echo "--- 10. Same key on ANOTHER project (401 expected, tenant isolation)"
OTHER_ID=$(curl -s -X POST $BASE/projects -H "Authorization: Bearer $TOKEN" -H "$JSON" \
  -d '{"name":"Isolation Test"}' | field data id)
curl -s "$BASE/projects/$OTHER_ID/resources/tasks/records" \
  -H "x-api-key: $PUB_KEY" | pretty

echo; echo "--- 11. Revoke the public key, then use it (401 expected)"
curl -s -X POST $BASE/projects/$PROJECT_ID/api-keys/$PUB_ID/revoke \
  -H "Authorization: Bearer $TOKEN" | pretty
curl -s "$BASE/projects/$PROJECT_ID/resources/tasks/records" \
  -H "x-api-key: $PUB_KEY" | pretty

echo; echo "Done."