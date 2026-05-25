#!/usr/bin/env bash
# Smoke test: dispara N reservas simultâneas no mesmo slot.
# Espera: exatamente 1 resposta 201, o resto deve ser 400 (SLOT_UNAVAILABLE) ou 409.
#
# Uso:
#   ./scripts/smoke-concurrency.sh <API_URL> <TENANT_SLUG> <SLOT_ID>
#
# Exemplo:
#   ./scripts/smoke-concurrency.sh https://api-prod.railway.app capi-demo slot-uuid-aqui

set -euo pipefail

API_URL="${1:-http://localhost:3333}"
SLUG="${2:-demo}"
SLOT_ID="${3:?Informe o SLOT_ID como 3º argumento}"
N="${4:-10}"  # número de requisições simultâneas

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "==> Disparando $N reservas simultâneas para slot: $SLOT_ID"
echo "    API: $API_URL/tenants/$SLUG/bookings"
echo ""

for i in $(seq 1 "$N"); do
  curl -s -o "$TMPDIR/res_$i.json" \
       -w "%{http_code}" \
       -X POST "$API_URL/tenants/$SLUG/bookings" \
       -H "Content-Type: application/json" \
       -d "{
         \"slotId\": \"$SLOT_ID\",
         \"customerName\": \"Teste Concorrencia $i\",
         \"customerEmail\": \"smoke$i@teste.com\",
         \"customerPhone\": \"11999990000\",
         \"customerCpf\": \"111.444.777-35\",
         \"pax\": 1
       }" > "$TMPDIR/status_$i.txt" &
done

wait  # aguarda todos os processos em background terminarem

echo "--- Resultados ---"
OK=0
FAIL=0
for i in $(seq 1 "$N"); do
  STATUS=$(cat "$TMPDIR/status_$i.txt")
  BODY=$(cat "$TMPDIR/res_$i.json" | tr -d '\n' | cut -c1-120)
  if [ "$STATUS" = "201" ]; then
    OK=$((OK + 1))
    echo "  [req $i] ✓ 201 CRIADO"
  else
    FAIL=$((FAIL + 1))
    echo "  [req $i] ✗ $STATUS — $BODY"
  fi
done

echo ""
echo "==> Resumo: $OK sucesso(s), $FAIL falha(s) de $N requisições"
echo ""

if [ "$OK" -eq 1 ]; then
  echo "PASS — SELECT FOR UPDATE funcionando: exatamente 1 reserva criada."
  exit 0
elif [ "$OK" -eq 0 ]; then
  echo "FAIL — Nenhuma reserva criada. Verifique se o slot existe e está OPEN."
  exit 1
else
  echo "FAIL — $OK reservas criadas! Overbooking detectado — trava de concorrência quebrada."
  exit 1
fi
