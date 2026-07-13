# Reporte de Remediación — A10:2025 Mishandling of Exceptional Conditions

**Proyecto:** AutoApply Bot — Simulación de Ataque Informático y Remediación
**Vulnerabilidad remediada:** Gestión Deficiente de Condiciones de Excepción
**Responsable:** José Ojeda — Blue Team (Hardening / DevSecOps)
**Rama:** `version-sanitizada`
**Archivo afectado:** `src/middleware/errorHandler.ts`

---

## 1. Resumen Ejecutivo

El middleware global de manejo de errores de AutoApply Bot exponía el mensaje crudo de cualquier excepción no controlada (`err.message`) en la respuesta HTTP al cliente, condicionado a que la variable `NODE_ENV` estuviera configurada como `development`. Esta dependencia es frágil: en cualquier entorno donde dicha variable no esté correctamente establecida en `production` —situación común en despliegues académicos, de prueba o mal configurados— el detalle interno del error se filtra igualmente.

La remediación elimina por completo la condición basada en entorno: el cliente nunca recibe el mensaje ni el stack trace de la excepción, en ningún escenario. El detalle completo del error se redirige exclusivamente a un sistema de logging interno (Winston), preservando la trazabilidad para los administradores sin comprometer la seguridad frente al exterior.

---

## 2. Vulnerabilidad Original

### 2.1 Clasificación

| Campo | Valor |
|---|---|
| Clasificación OWASP | A10:2025 — Mishandling of Exceptional Conditions |
| CWE asociado | CWE-209 — Generation of Error Message Containing Sensitive Information |
| Punto de explotación | Cualquier endpoint del backend, forzando una excepción no controlada |

### 2.2 Código vulnerable (antes)

```typescript
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error('💥 Error no manejado:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    });
};
```

### 2.3 Análisis técnico de la causa raíz

El riesgo no era una fuga incondicional, sino una fuga **condicionada a una variable de entorno**. Esto constituye una debilidad estructural porque:

- La seguridad del endpoint depende de un valor de configuración externo al código, fácil de omitir o de dejar mal definido en un despliegue.
- En el entorno de laboratorio (y en cualquier entorno de pruebas real), `NODE_ENV` frecuentemente no se setea explícitamente a `production`, dejando la condición activa por defecto.
- Además, el `console.error` original registraba el stack trace en la consola del proceso, sin estructura, sin persistencia garantizada y sin separación entre lo que se loguea y lo que se responde.

Un atacante podía forzar esta condición enviando deliberadamente tipos de datos incorrectos, JSON malformado, o violaciones de restricciones a la base de datos, obteniendo en la respuesta nombres de tablas, rutas internas, versión del motor PostgreSQL y fragmentos del stack tecnológico.

---

## 3. Contramedida Implementada

### 3.1 Estrategia

La remediación aplica el principio de **separación entre lo que se expone externamente y lo que se registra internamente**:

1. La respuesta HTTP al cliente es **siempre genérica**, sin excepciones por entorno.
2. El detalle completo del error (mensaje, stack, método, ruta, IP de origen) se envía a un logger estructurado (Winston) que persiste en archivo.

### 3.2 Código sanitizado (después)

**`src/utils/logger.ts`** (nuevo)

```typescript
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'autoapply-bot-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        })
    );
}

export default logger;
```

**`src/middleware/errorHandler.ts`** (parcheado)

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    logger.error('Error no manejado', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
    });

    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
    });
};
```

### 3.3 Diferencias clave respecto a la versión vulnerable

| Aspecto | Antes | Después |
|---|---|---|
| Condición de exposición | `NODE_ENV === 'development'` | Ninguna — siempre oculto |
| Campo `error` en la respuesta | Presente en desarrollo | Eliminado por completo |
| Registro del error | `console.error` (no persistente, no estructurado) | Winston → `logs/error.log` y `logs/combined.log` (persistente, estructurado, con contexto de la petición) |
| Información disponible para el atacante | Mensaje crudo de la excepción | Ninguna |

---

## 4. Validación de Cierre (Evidencia)

Se reprodujeron en la rama `version-sanitizada` los mismos escenarios documentados por Red Team para forzar excepciones no controladas.

### 4.1 Caso 1 — Tipo de dato inválido (`job_offer_id` no numérico)

```bash
curl.exe -X POST http://localhost:3001/api/proposals `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer TU_TOKEN_REAL" `
  -d "{\"job_offer_id\": \"esto_no_es_numero\"}"
```

**Respuesta obtenida:**

```json
{"success":false,"message":"Error interno del servidor"}
```

Sin campos adicionales, sin mensaje de PostgreSQL, sin stack trace.

### 4.2 Caso 2 — JSON malformado

Petición con estructura JSON incompleta (error de escapado común en PowerShell):

**Respuesta obtenida:** HTTP 500

```json
{
  "success": false,
  "message": "Error interno del servidor"
}
```

### 4.3 Matriz de condiciones probadas

| Condición | Status HTTP | Respuesta al cliente | ¿Expone detalle interno? |
|---|---|---|---|
| Token placeholder no sustituido (`[TOKEN]`) | 403 | `Token inválido o expirado` | No |
| Sin token de autorización | 401 | `Token de acceso requerido` | No |
| Token válido + `job_offer_id` de tipo inválido | 500 | `Error interno del servidor` | No |
| JSON malformado | 500 | `Error interno del servidor` | No |

En los cuatro casos, independientemente de la causa raíz del fallo (autenticación, validación de tipos o sintaxis JSON), la respuesta nunca contiene información de la infraestructura interna.

### 4.4 Evidencia de logging interno (`logs/error.log`)

Pese a la respuesta genérica al cliente, el detalle completo del error queda capturado del lado del servidor:

```json
{"ip":"::1","level":"error","message":"Error no manejado Expected property name or '}' in JSON at position 1 (line 1 column 2)","method":"POST","path":"/api/proposals","service":"autoapply-bot-backend","stack":"SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)\n    at JSON.parse (<anonymous>)\n    at parse (...node_modules/body-parser/lib/types/json.js:92:19)","timestamp":"2026-06-20T17:23:34.774Z"}
```

Esto confirma el cumplimiento de las dos mitades de la contramedida: **opacidad hacia el cliente** y **trazabilidad completa para el equipo interno**, vía un canal separado e inaccesible desde la API pública.

---

## 5. Conclusión

La vulnerabilidad A10:2025 — Mishandling of Exceptional Conditions (CWE-209) fue remediada eliminando la dependencia de `NODE_ENV` como mecanismo de control de exposición de errores, y sustituyéndola por una política incondicional de respuesta genérica combinada con logging estructurado vía Winston. Las pruebas de validación de cierre confirman que, sin importar el vector utilizado para forzar la excepción (tipo de dato inválido, JSON malformado, fallos de autenticación), el sistema no revela información técnica interna al cliente, mientras que el detalle completo permanece disponible para auditoría en `logs/error.log`.

---

## 6. Nota adicional (fuera de alcance de este parche)

Durante las pruebas se observó que un `job_offer_id` con tipo de dato inválido no es rechazado con una validación temprana (p. ej. HTTP 400), sino que el valor llega hasta la capa de base de datos y falla allí, generando el HTTP 500. Esto sugiere una ausencia de validación de entrada en la capa de controlador (relacionado con CWE-20 — Improper Input Validation), independiente de la vulnerabilidad A10:2025 aquí tratada. Se documenta como observación para una posible mejora futura, fuera del alcance de esta remediación específica.

---

**Commits relacionados:**
```
[BLUE] Fix A10:2025: restrict error details in errorHandler
[BLUE] Add Winston logging middleware for internal error tracking
[BLUE] Add remediation report with before/after comparison
```
