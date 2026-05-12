#!/usr/bin/env bash
# smoke-test.sh — Turismo Capivara API smoke test
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Example: ./scripts/smoke-test.sh https://your-api.railway.app
#
# Exit code 0 = all checks passed. Non-zero = at least one failure.

set -euo pipefail

BASE_URL="${1:-http://localhost:3333}"
PASS=0
FAIL=0

# ─── helpers ────────────────────────────────────────────────────────────────

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    echo "  ✓  $label (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗  $label — expected HTTP $expected, got HTTP $actual"
    FAIL=$((FAIL + 1))
  fi
}

http_status() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Turismo Capivara — API Smoke Test"
echo "  Target: $BASE_URL"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── 1. Health check ────────────────────────────────────────────────────────
echo "[ 1 ] Health"

status=$(http_status "$BASE_URL/health")
check "GET /health → 200 (API alive)" "200" "$status"

# ─── 2. Auth guard — GET /tenants requires ADMIN ───────────────────────────
echo ""
echo "[ 2 ] Auth guard — [S1] GET /tenants"

status=$(http_status "$BASE_URL/tenants")
check "GET /tenants with no token → 401" "401" "$status"

status=$(http_status -H "Authorization: Bearer invalid.jwt.here" "$BASE_URL/tenants")
check "GET /tenants with invalid token → 401" "401" "$status"

# ─── 3. Public endpoints work without auth ──────────────────────────────────
echo ""
echo "[ 3 ] Public endpoints"

# GET /tenants/:slug — public (no auth)
# Replace SLUG with a real tenant slug if testing against a seeded environment.
SLUG="${SMOKE_SLUG:-capivara}"
status=$(http_status "$BASE_URL/tenants/$SLUG")
# 200 = found, 404 = no seed data — both are acceptable (API is alive, auth not required)
if [ "$status" = "200" ] || [ "$status" = "404" ]; then
  echo "  ✓  GET /tenants/$SLUG (public, no auth) → $status (expected 200 or 404)"
  PASS=$((PASS + 1))
else
  echo "  ✗  GET /tenants/$SLUG → unexpected HTTP $status"
  FAIL=$((FAIL + 1))
fi

# ─── 4. Cross-tenant security headers ───────────────────────────────────────
echo ""
echo "[ 4 ] Security headers"

headers=$(curl -s -I "$BASE_URL/health")
if echo "$headers" | grep -qi "x-content-type-options"; then
  echo "  ✓  Helmet: X-Content-Type-Options present"
  PASS=$((PASS + 1))
else
  echo "  ✗  Helmet: X-Content-Type-Options missing"
  FAIL=$((FAIL + 1))
fi

if echo "$headers" | grep -qi "x-frame-options"; then
  echo "  ✓  Helmet: X-Frame-Options present"
  PASS=$((PASS + 1))
else
  echo "  ✗  Helmet: X-Frame-Options missing"
  FAIL=$((FAIL + 1))
fi

# ─── 5. Admin guide route auth ──────────────────────────────────────────────
echo ""
echo "[ 5 ] Admin endpoints — [A1]"

status=$(http_status "$BASE_URL/tenants/$SLUG/admin/guides")
check "GET /admin/guides with no token → 401" "401" "$status"

# ─── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
