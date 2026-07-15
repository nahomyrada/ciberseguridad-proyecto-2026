# Inventario de Endpoints — AutoApply Bot

**Proyecto:** Simulación de Ataque Informático y Remediación (Ciberseguridad, UCAB 2025-2026)

Listado completo de las rutas de la API REST del backend (`http://192.168.5.20:3001`).
Todas las rutas bajo `/api/*` reciben y devuelven JSON. La columna **Auth** indica si el
endpoint exige un JWT válido (`Authorization: Bearer <token>`).

La columna **Vector** marca los endpoints que constituyen superficie de ataque en este
proyecto: 🔴 vulnerabilidad obligatoria/innovación, 🟠 vulnerabilidad adicional.

> Base URL: `/api` · Puerto: `3001` · Todos los endpoints protegidos comparten el mismo
> middleware `verifyToken`, que extrae `req.userId` del JWT.

---

## Autenticación — `/api/auth`

| Método | Ruta | Auth | Descripción | Vector |
|---|---|:---:|---|:---:|
| POST | `/api/auth/register` | No | Registra un usuario y devuelve un JWT | 🟠 permite enumeración de usuarios |
| POST | `/api/auth/login` | No | Autentica y devuelve un JWT | — (sin rate limiting) |
| GET | `/api/auth/me` | Sí | Devuelve el perfil del usuario autenticado | — |

### Endpoints adicionales solo en `version-vulnerable`

| Método | Ruta | Auth | Descripción | Vector |
|---|---|:---:|---|:---:|
| POST | `/api/auth/forgot-password-vulnerable` | No | Genera un token de reset y **lo devuelve en la respuesta HTTP** | 🟠 Information Leak (CWE-200) |
| POST | `/api/auth/reset-password` | No | Restablece la contraseña con el token; en la versión vulnerable acepta cualquier token | 🟠 Account Takeover |
| POST | `/api/auth/node-load-method/customMCP` | No | Procesa una configuración con **`eval()`** | 🔴🟠 RCE (CWE-94) |

> En `version-sanitizada` estas rutas se reemplazan por `/api/auth/forgot-password`
> (token hasheado, nunca expuesto), `/api/auth/reset-password` (valida hash + expiración)
> y `/api/auth/node-load-method/customMCP` (usa `JSON.parse()` con validación de esquema).

---

## Propuestas — `/api/proposals`  *(núcleo del ataque)*

| Método | Ruta | Auth | Descripción | Vector |
|---|---|:---:|---|:---:|
| GET | `/api/proposals` | Sí | Lista propuestas | 🔴 IDOR — sin filtro por propietario expone las de todos |
| GET | `/api/proposals/:id` | Sí | Obtiene una propuesta por ID | 🔴 IDOR — sin validación de propiedad |
| POST | `/api/proposals` | Sí | Crea una propuesta | 🔴 A10:2025 — un `job_offer_id` inválido filtra stack trace |
| POST | `/api/proposals/generate` | Sí | Genera una propuesta con IA (Gemini) | 🔴 Prompt Injection (LLM01:2025) vía `jobData.description` |
| PATCH | `/api/proposals/:id/status` | Sí | Cambia el estado de una propuesta | 🔴 IDOR — modifica recursos ajenos |
| PATCH | `/api/proposals/:id` | Sí | Actualiza una propuesta | 🔴 IDOR — modifica recursos ajenos |
| DELETE | `/api/proposals/:id` | Sí | Elimina una propuesta | 🔴 IDOR — elimina recursos ajenos |

---

## Ofertas de trabajo — `/api/jobs`

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| GET | `/api/jobs` | Sí | Lista todas las ofertas |
| GET | `/api/jobs/pending` | Sí | Ofertas pendientes de clasificar |
| GET | `/api/jobs/:id` | Sí | Obtiene una oferta por ID |
| POST | `/api/jobs` | Sí | Crea una oferta |
| PATCH | `/api/jobs/:id/relevance` | Sí | Marca la relevancia de una oferta |
| DELETE | `/api/jobs/:id` | Sí | Elimina una oferta |

---

## Aplicaciones — `/api/applications`

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| GET | `/api/applications` | Sí | Lista aplicaciones |
| GET | `/api/applications/:id` | Sí | Obtiene una aplicación por ID |
| POST | `/api/applications` | Sí | Crea una aplicación |
| PATCH | `/api/applications/:id/status` | Sí | Cambia el estado de una aplicación |
| DELETE | `/api/applications/:id` | Sí | Elimina una aplicación |

---

## Ganancias — `/api/earnings`

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| GET | `/api/earnings` | Sí | Lista las ganancias |
| GET | `/api/earnings/summary` | Sí | Resumen mensual (vista `monthly_summary`) |
| POST | `/api/earnings` | Sí | Registra una ganancia |

---

## Plataformas — `/api/platforms`

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| GET | `/api/platforms` | Sí | Lista plataformas freelance |
| GET | `/api/platforms/:id` | Sí | Obtiene una plataforma por ID |
| POST | `/api/platforms` | Sí | Crea una plataforma |
| PATCH | `/api/platforms/:id` | Sí | Actualiza una plataforma |
| DELETE | `/api/platforms/:id` | Sí | Elimina una plataforma |

---

## Habilidades — `/api/skills`

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| GET | `/api/skills` | Sí | Catálogo de habilidades |
| GET | `/api/skills/me` | Sí | Habilidades del usuario autenticado |
| POST | `/api/skills/me` | Sí | Asigna/actualiza una habilidad propia |
| DELETE | `/api/skills/me/:skillId` | Sí | Elimina una habilidad propia |

---

## Automatización — `/api/automation`

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| POST | `/api/automation/scrape/freelancer` | Sí | Dispara el scraper de Freelancer |
| POST | `/api/automation/scrape/single` | Sí | Scrapea una URL individual |

---

## Sistema

| Método | Ruta | Auth | Descripción |
|---|---|:---:|---|
| GET | `/health` | No | Health check del servidor |

---

## Resumen de superficie de ataque

| Endpoint | Vulnerabilidad | Clasificación | CWE |
|---|---|---|---|
| `GET/PATCH/DELETE /api/proposals/:id`, `GET /api/proposals` | IDOR / Broken Access Control | A01:2025 | CWE-639 |
| Cualquier endpoint ante un error interno | Mishandling de errores | A10:2025 | CWE-209 |
| `POST /api/proposals/generate` | Prompt Injection | LLM01:2025 | CWE-1427 |
| `POST /api/auth/forgot-password-vulnerable` | Information Leak | — | CWE-200 |
| `POST /api/auth/node-load-method/customMCP` | RCE vía `eval()` | — | CWE-94 |

Ver `docs/exploitation-report.md` para la explotación de cada vector y
`scripts/payloads.sh` para los comandos reproducibles.
