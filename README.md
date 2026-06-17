# 🤖 AutoApply Bot

Automatiza tus postulaciones freelance con IA. Detecta ofertas de trabajo, genera propuestas personalizadas y lleva el control de tus ganancias.

## 🗂️ Estructura del proyecto

```
autoApplyApp/
├── backend/          # API Node.js + Express + PostgreSQL
│   └── src/
│       ├── config/       # Configuración de BD
│       ├── controllers/  # Lógica de negocio
│       ├── middleware/   # Auth JWT, error handling
│       ├── models/       # Acceso a datos
│       ├── routes/       # Definición de rutas
│       └── utils/        # Seed y utilidades
├── frontend/         # Next.js 14 + TailwindCSS + Recharts
│   └── src/
│       ├── app/          # Páginas (App Router)
│       ├── components/   # Header, Footer
│       ├── hooks/        # useAuth
│       ├── styles/       # globals.css
│       └── utils/        # Configuración de Axios
└── database/
    └── schema.sql    # Esquema completo de PostgreSQL
```

## 🚀 Configuración inicial

### 1. Base de datos

```bash
# Crear la base de datos
createdb autoapply_db

# Aplicar el schema
psql -U postgres -d autoapply_db -f database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install

# Editar las variables de entorno
nano .env   # Actualiza DB_URL, JWT_SECRET

npm run dev  # Levanta en http://localhost:3001
```

En otro terminal, cargar datos de prueba:
```bash
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev  # Levanta en http://localhost:3000
```

## 🔑 Credenciales de demo

Tras ejecutar el seed:
- **Email:** `demo@autoapply.com`
- **Password:** `Demo1234!`

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Login (devuelve JWT) |
| GET | `/api/auth/me` | Perfil del usuario autenticado |
| GET | `/api/jobs` | Listar ofertas (paginado) |
| GET | `/api/jobs/pending` | Ofertas sin clasificar |
| POST | `/api/jobs` | Crear oferta |
| PATCH | `/api/jobs/:id/relevance` | Marcar relevancia |
| GET | `/api/proposals` | Listar propuestas |
| POST | `/api/proposals` | Crear propuesta |
| PATCH | `/api/proposals/:id/status` | Cambiar estado |
| GET | `/api/earnings` | Listar ganancias |
| GET | `/api/earnings/summary` | Resumen mensual (VIEW) |
| POST | `/api/earnings` | Registrar ganancia |

## 🛠️ Stack tecnológico

**Backend:** Node.js · TypeScript · Express · PostgreSQL · JWT · bcryptjs · node-cron

**Frontend:** Next.js 14 · TypeScript · TailwindCSS · Recharts · Axios · Lucide
