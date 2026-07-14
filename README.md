# 🤖 AutoApply Bot — Laboratorio de Ciberseguridad
**Universidad Católica Andrés Bello | Ciberseguridad 2025-2026**

Plataforma web que automatiza postulaciones freelance con IA, utilizada como objetivo en una simulación controlada de ataque y remediación bajo el framework MITRE ATT&CK®.

> ⚠️ **Repositorio académico con fines exclusivamente educativos.**  
> Todo ataque se ejecuta dentro de un entorno virtualizado aislado.
> - `version-vulnerable` → vulnerabilidades intencionalmente implementadas
> - `version-sanitizada` → parches y contramedidas aplicadas

---

## 🗂️ Estructura del proyecto

```
ciberseguridad-proyecto-2026/
├── backend/
│   └── src/
│       ├── config/       # Configuración de BD
│       ├── controllers/  # Lógica de negocio (vectores de ataque IDOR)
│       ├── middleware/   # Auth JWT + errorHandler vulnerable
│       ├── models/       # Acceso a datos
│       ├── routes/       # Endpoints de la API
│       └── utils/        # Seed y utilidades
├── frontend/             # Next.js 14 + TailwindCSS + Recharts
├── database/
│   └── schema.sql        # Esquema PostgreSQL
└── scripts/
    └── payloads.sh       # Scripts de ataque documentados (Red Team)
```

---

## 🔬 Topología del laboratorio

| VM | SO | RAM | IP Estática | Rol |
|---|---|---|---|---|
| Kali Linux 2026.1 | Kali Linux | 4 GB | `192.168.5.10` | VM Atacante — Red Team |
| Ubuntu-Victima | Ubuntu Server 22.04 LTS | 2 GB | `192.168.5.20` | VM Víctima — Blue Team |

### Configuración de red (VirtualBox)
- **Adaptador 1**: NAT → acceso a internet
- **Adaptador 2**: Red Interna `vboxnet-proyecto` → comunicación entre VMs

### Verificar conectividad
```bash
# Desde Kali hacia Ubuntu
ping 192.168.5.20

# Conexión SSH al servidor víctima
ssh ubuntu@localhost -p 2222
```

---

## 🚀 Despliegue en VM Víctima (Ubuntu Server 22.04)

### 1. Instalar dependencias del sistema
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nodejs postgresql postgresql-contrib
```

Verificar versiones:
```bash
node --version   # Debe ser v20.x.x
psql --version   # Debe ser 14.x o superior
```

### 2. Clonar el repositorio
```bash
git clone https://github.com/nahomyrada/ciberseguridad-proyecto-2026.git
cd ciberseguridad-proyecto-2026
git checkout version-vulnerable
```

### 3. Configurar la base de datos
```bash
# Crear la base de datos
sudo -u postgres createdb autoapply

# Inyectar el schema (usar pipe para evitar errores de permisos)
cat database/schema.sql | sudo -u postgres psql -d autoapply
```

### 4. Configurar el backend
```bash
cd backend
npm install

# Crear archivo de variables de entorno
cat > .env << 'EOF'
DB_URL=postgresql://postgres@localhost/autoapply
JWT_SECRET=ciberseguridad-ucab-2026
PORT=3001
NODE_ENV=development
EOF

# Cargar datos de prueba
npm run seed

# Iniciar el servidor
npm run dev
```

El backend quedará corriendo en `http://192.168.5.20:3001`

### 5. Configurar el frontend

> ⚠️ **Fix requerido**: Next.js 14 falla al compilar en Linux porque no encuentra el binario SWC. Se soluciona con un fallback a Babel:

```bash
cd frontend

# Crear archivo de configuración Babel (fix para Linux/Ubuntu)
cat > .babelrc << 'EOF'
{
  "presets": ["next/babel"]
}
EOF

npm install

# Crear variables de entorno del frontend
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://192.168.5.20:3001
EOF

npm run dev
```

El frontend quedará corriendo en `http://192.168.5.20:3000`

### 6. Verificar despliegue
```bash
# Desde Kali, verificar que el backend responde
curl http://192.168.5.20:3001/api/auth/login

# Verificar frontend
curl http://192.168.5.20:3000
```

---

## 🔑 Credenciales de demo
Tras ejecutar el seed:
- **Email**: `demo@autoapply.com`
- **Password**: `Demo1234!`

---

## 📡 Endpoints vulnerables

| Método | Endpoint | Vulnerabilidad |
|---|---|---|
| POST | /api/auth/register | Enumeración de usuarios |
| POST | /api/auth/login | Sin rate limiting |
| GET | /api/proposals | ⚠️ IDOR — expone propuestas de todos los usuarios |
| GET | /api/proposals/:id | ⚠️ IDOR — sin validación de propiedad |
| PATCH | /api/proposals/:id/status | ⚠️ IDOR — modifica recursos ajenos |
| DELETE | /api/proposals/:id | ⚠️ IDOR — elimina recursos ajenos |
| ANY | Cualquier endpoint | ⚠️ A10:2025 — expone stack trace en errores |

---

## 🛡️ Vulnerabilidades implementadas

### Vulnerabilidad 1 — IDOR / Broken Access Control (A01:2025)
- **CWE**: CWE-639, CWE-284
- **Archivo**: `backend/src/controllers/proposalController.ts`
- **Descripción**: Los controladores no verifican que el recurso solicitado pertenezca al usuario autenticado. Cualquier usuario con token válido puede leer, modificar o eliminar recursos de otros usuarios alterando el parámetro `:id` en la URL.

### Vulnerabilidad 2 — Mishandling of Exceptional Conditions (A10:2025)
- **CWE**: CWE-209
- **Archivo**: `backend/src/middleware/errorHandler.ts`
- **Descripción**: El middleware expone `err.message`, `err.stack`, nombre de tablas y detalles del stack tecnológico directamente en la respuesta HTTP ante cualquier error interno.

---

## 🛠️ Stack tecnológico
- **Backend**: Node.js 20 · TypeScript · Express · PostgreSQL · JWT · bcryptjs
- **Frontend**: Next.js 14 · TypeScript · TailwindCSS · Recharts · Axios
- **Red Team**: Kali Linux · Burp Suite · curl · Nmap
- **Blue Team**: OWASP ZAP · Winston · GitHub Actions

---

## 👥 Equipo

| Integrante | Team | Rol |
|---|---|---|
| Baladi, Anthonny | 🔴 Red | Líder Ofensivo — MITRE ATT&CK® |
| Gómez, Ronald | 🔴 Red | Reconocimiento y auditoría |
| Rada, Nahomy | 🔴 Red | Explotación y payloads |
| Castellano, Gabriel | 🔵 Blue | Líder Defensivo y arquitectura |
| Cova, César | 🔵 Blue | Infraestructura y red |
| Ojeda, José | 🔵 Blue | Hardening y DevSecOps |