#!/usr/bin/env bash
# ============================================================================
# [BLUE] Tests de regresion de seguridad — Security Gate (DevSecOps)
# ----------------------------------------------------------------------------
# Valida que las vulnerabilidades YA parchadas no reaparezcan. Falla (exit != 0)
# si el codigo vuelve a ser vulnerable, de modo que el pipeline bloquee el merge.
#
# Cubre:
#   - A01:2025  IDOR / Broken Access Control  (proposalController)
#   - A10:2025  Mishandling of Exceptional Conditions (errorHandler)
#
# Uso:  bash scripts/security-regression.sh [API_BASE]
#       API_BASE por defecto: http://localhost:3001
#
# Requiere: backend corriendo con BD sembrada (npm run seed) y curl.
# ============================================================================
set -u
API="${1:-http://localhost:3001}"
FAILS=0
SFX="$$_${RANDOM}"

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; FAILS=$((FAILS + 1)); }

code() { # imprime el codigo HTTP de una peticion
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

register() { # $1=usuario -> imprime token (o vacio)
  curl -s -X POST "$API/api/auth/register" -H "Content-Type: application/json" \
    -d "{\"username\":\"$1\",\"email\":\"$1@test.local\",\"password\":\"Passw0rd!$SFX\"}" \
    | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

echo "==================================================================="
echo " Security Gate — regresion contra $API"
echo "==================================================================="

# ---------------------------------------------------------------------------
# TEST 1 — IDOR (A01:2025): un usuario NO debe acceder a recursos de otro
# ---------------------------------------------------------------------------
echo ""
echo "[TEST 1] IDOR / Broken Access Control"

TOKEN_VICTIMA="$(register "victima_$SFX")"
TOKEN_ATACANTE="$(register "atacante_$SFX")"

if [ -z "$TOKEN_VICTIMA" ] || [ -z "$TOKEN_ATACANTE" ]; then
  fail "No se pudieron registrar los usuarios de prueba (auth roto?)"
else
  # La victima crea una propuesta (prueba con las ofertas sembradas 1..3).
  PID=""
  for JOB in 1 2 3; do
    CREATE="$(curl -s -X POST "$API/api/proposals" -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_VICTIMA" \
      -d "{\"job_offer_id\":$JOB,\"content\":\"Propuesta CONFIDENCIAL $SFX\"}")"
    PID="$(echo "$CREATE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)"
    [ -n "$PID" ] && break
  done

  if [ -z "$PID" ]; then
    fail "La victima no pudo crear una propuesta (revisa seed/ofertas)"
  else
    echo "  (propuesta $PID creada por la victima)"

    C1=$(code "$API/api/proposals/$PID" -H "Authorization: Bearer $TOKEN_ATACANTE")
    [ "$C1" = "404" ] && pass "GET recurso ajeno -> 404" || fail "GET recurso ajeno -> $C1 (esperado 404) [IDOR!]"

    C2=$(code -X PATCH "$API/api/proposals/$PID/status" -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_ATACANTE" -d '{"status":"approved"}')
    [ "$C2" = "404" ] && pass "PATCH recurso ajeno -> 404" || fail "PATCH recurso ajeno -> $C2 (esperado 404) [IDOR!]"

    LIST="$(curl -s "$API/api/proposals" -H "Authorization: Bearer $TOKEN_ATACANTE")"
    if echo "$LIST" | grep -q "\"id\":$PID"; then
      fail "El atacante ve la propuesta ajena en GET /api/proposals [IDOR!]"
    else
      pass "LIST no expone recursos ajenos"
    fi

    C3=$(code -X DELETE "$API/api/proposals/$PID" -H "Authorization: Bearer $TOKEN_ATACANTE")
    [ "$C3" = "404" ] && pass "DELETE recurso ajeno -> 404" || fail "DELETE recurso ajeno -> $C3 (esperado 404) [IDOR!]"

    C4=$(code "$API/api/proposals/$PID" -H "Authorization: Bearer $TOKEN_VICTIMA")
    [ "$C4" = "200" ] && pass "CONTROL: la duena accede a lo suyo -> 200" \
      || fail "CONTROL roto: la duena recibio $C4 (esperado 200)"
  fi
fi

# ---------------------------------------------------------------------------
# TEST 2 — A10:2025: el error handler NO debe filtrar stack trace / internos
# ---------------------------------------------------------------------------
echo ""
echo "[TEST 2] Error handler / Information Disclosure"

# JSON malformado -> express.json() lanza -> errorHandler global.
RESP="$(curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" --data '{"email": ')"
echo "  respuesta: $(echo "$RESP" | head -c 160)"

LEAK=0
for needle in '"error"' '"stack"' 'SyntaxError' 'node_modules' ' at ' '/src/'; do
  if echo "$RESP" | grep -qF "$needle"; then
    fail "El errorHandler filtra internos (contiene: $needle) [A10!]"
    LEAK=1
  fi
done
[ "$LEAK" = "0" ] && pass "El errorHandler no filtra stack trace ni detalles internos"

# ---------------------------------------------------------------------------
# TEST 3 — Vulnerabilidades adicionales (fuera del alcance obligatorio):
# leak de token de reset (CWE-200) y RCE via eval() (CWE-94)
# ---------------------------------------------------------------------------
echo ""
echo "[TEST 3] Vulnerabilidades adicionales (CWE-200 / CWE-94)"

FP_RESP="$(curl -s -X POST "$API/api/auth/forgot-password" -H "Content-Type: application/json" \
  -d "{\"email\":\"nadie_$SFX@test.local\"}")"
if echo "$FP_RESP" | grep -q '"resetToken"'; then
  fail "forgot-password expone resetToken en la respuesta [CWE-200!]"
else
  pass "forgot-password no expone el token de reset"
fi

RCE_PAYLOAD='{"inputs":{"mcpServerConfig":"{\"cmd\": (function(){ const { exec } = require(\"child_process\"); exec(\"id\"); })()}"}}'
RCE_RESP="$(curl -s -X POST "$API/api/auth/node-load-method/customMCP" -H "Content-Type: application/json" \
  --data "$RCE_PAYLOAD")"
if echo "$RCE_RESP" | grep -qE '"success":true|uid='; then
  fail "customMCP ejecutó el payload (eval activo) [CWE-94!]"
else
  pass "customMCP rechaza el payload no-JSON (eval eliminado)"
fi

# ---------------------------------------------------------------------------
echo ""
echo "==================================================================="
if [ "$FAILS" -eq 0 ]; then
  echo " RESULTADO: ✅ Todas las pruebas de seguridad pasaron."
  exit 0
else
  echo " RESULTADO: ❌ $FAILS prueba(s) fallaron — hay vulnerabilidad(es)."
  exit 1
fi
