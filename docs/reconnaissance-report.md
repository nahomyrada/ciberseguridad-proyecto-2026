# Reporte de Reconocimiento y Escaneo de Seguridad

## 1. Escaneo de Puertos e Infraestructura (Nmap)

### 1.1. Detalles del Escaneo
* **Herramienta utilizada:** Nmap (Network Mapper) Versión 7.98
* **Objetivo:** `192.168.5.20` (Servidor Ubuntu)
* **Comando ejecutado:** `nmap -sV -sC -p- 192.168.5.20`
* **Estado general:** El host se encuentra activo (latencia muy baja de 0.00052s). Se omitieron 65,532 puertos cerrados de tipo TCP (reset).

---

### 1.2. Puertos Abiertos y Servicios Detectados

Basado en el análisis profundo de firmas, huellas de servicio y cabeceras del sistema (`fingerprint-strings`), estos son los puertos e infraestructura en ejecución dentro del entorno:

| Puerto / Protocolo | Estado | Servicio Oficial / Detectado | Versión / Información Técnica de la Infraestructura |
| :--- | :--- | :--- | :--- |
| `22/tcp` | Abierto | **SSH** | OpenSSH 8.9p1 Ubuntu 3ubuntu0.15 (Ubuntu Linux; protocolo 2.0). |
| `3000/tcp` | Abierto | **HTTP** | Servidor Node.js con Framework **Next.js** (Frontend). <br><br>*Evidencia:* Las respuestas devuelven las cabeceras `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch` y `X-Powered-By: Next.js`. |
| `3001/tcp` | Abierto | **HTTP** | Servidor Node.js con Framework **Express** (API/Backend). <br><br>*Evidencia:* Responde de forma nativa con cabeceras de seguridad Helmet avanzadas (`Content-Security-Policy`, `Strict-Transport-Security: max-age=15552000`, `X-Content-Type-Options: nosniff`). |

---

### 1.3. Análisis de Hallazgos y Correlación

* **Superficie de Exposición Limpia:** El escáner exhaustivo sobre los 65,535 puertos (`-p-`) confirma que la superficie de ataque de la máquina víctima está perfectamente delimitada a tres únicos canales. No existen servicios huérfanos, bases de datos expuestas directamente al exterior (como el puerto por defecto de PostgreSQL 5432, lo cual significa que está bien configurado para escuchar solo en localhost) o puertos maliciosos no deseados.
* **Confirmación de Arquitectura Desacoplada:** Nmap corroboró técnicamente que la aplicación web se compone de dos capas independientes ejecutándose en Node.js. El puerto `3000` actúa como el servidor de renderizado de la interfaz visual (Next.js) y el puerto `3001` procesa la lógica del negocio mediante un servicio API REST que interactúa con la base de datos local del servidor.
* **Evidencias de Endurecimiento (Hardening) Parcial:** Aunque el puerto 3000 adolece de varias cabeceras omitidas según el reporte de OWASP ZAP, las respuestas crudas del puerto 3001 demuestran que el programador de la API implementó soluciones de seguridad (probablemente mediante el middleware `helmet`), protegiendo el backend activamente contra inyecciones de MIME o de Clickjacking.

## 2. Información General del Escaneo
* **Herramienta utilizada:** OWASP ZAP Versión 2.17.0
* **Proveedor:** Checkmarx
* **Fecha de generación:** Domingo, 12 de julio de 2026 (10:48:52)
* **Objetivo principal evaluado:** `http://192.168.5.20:3000`
* **Otros endpoints evaluados:** `http://192.168.5.20:3001`

---

## 3. Resumen de Alertas Encontradas

A continuación se detalla la cantidad de vulnerabilidades y observaciones clasificadas por su nivel de riesgo:

| Nivel de Riesgo | Cantidad de Alertas | Estado / Impacto |
| :--- | :---: | :--- |
| 🔴 **Alto (High)** | 0 | Sin alertas críticas detectadas. |
| 🟡 **Medio (Medium)** | 2 | Requiere atención prioritaria. |
| 🔵 **Bajo (Low)** | 2 | Configuraciones mejorables. |
| ⚪ **Informativo (Informational)** | 2 | Detalles de arquitectura y divulgación menor. |

---

## 4. Detalles de las Alertas Encontradas

### 🟡 Riesgo Medio (Medium)
* **Content Security Policy (CSP) Header Not Set**
  * **Tipo:** Sistémico (afecta a toda la aplicación).
  * **Descripción:** La ausencia de una política de seguridad de contenido expone el sitio a ataques de inyección de datos y Cross-Site Scripting (XSS).
* **Missing Anti-clickjacking Header**
  * **Instancias:** 3 instancias detectadas.
  * **Descripción:** La falta de cabeceras como `X-Frame-Options` o directivas de CSP configuradas expone las páginas a ser embebidas en marcos externos maliciosos.

### 🔵 Riesgo Bajo (Low)
* **Server Leaks Information via "X-Powered-By" HTTP Response Header Field(s)**
  * **Tipo:** Sistémico.
  * **Evidencia:** La cabecera expone explícitamente el uso de `X-Powered-By: Next.js` en las respuestas HTTP.
* **X-Content-Type-Options Header Missing**
  * **Tipo:** Sistémico.
  * **Descripción:** Al no incluir esta cabecera, los navegadores antiguos o vulnerables podrían intentar realizar "MIME sniffing" sobre los archivos multimedia o scripts cargados.

### ⚪ Informativo (Informational)
* **Information Disclosure - Suspicious Comments:** Se encontraron **19 instancias** con comentarios sospechosos o expuestos en el código fuente.
* **Modern Web Application:** Identificado como un comportamiento sistémico debido a la estructura dinámica de la aplicación.

---

## 5. Reconocimiento de Tecnologías y Estadísticas del Sitio

El escaneo pasivo sobre el host `http://192.168.5.20:3000` arrojó las siguientes métricas clave de la infraestructura:

### Métricas de Respuestas HTTP (Puerto 3000)
* **200 OK:** 466 respuestas exitosas.
* **404 Not Found:** 24 respuestas.
* **101 Switching Protocols:** 6 respuestas (indica uso potencial de WebSockets).
* **Total de Endpoints mapeados:** 27 endpoints únicos.
* **Porcentaje de respuestas lentas:** 22%.

### Tecnologías Detectadas en la Superficie
* **Framework:** Next.js (identificado en los headers de respuesta y la estructura de los scripts `_next/static/chunks/`).
* **Aplicación Identificada:** AutoApply Bot v1.0.0 (Herramienta automatizada de freelancing con IA).
* **Seguridad declarada en frontend:** Menciona uso interno de cifrado a través de JWT y bcrypt.
* **Formatos/Tipos de contenido dominantes:** 40% Application/JavaScript, 33% Text/HTML, y 7% Text/x-component.

---

## 6. Pruebas que Pasaron Exitosamente (Passing Rules)
El sistema demostró ser resiliente en los escaneos activos frente a los siguientes vectores comunes de ataque:
* Inyecciones SQL (SQL Injection).
* Inyección de Comandos de Sistema Operativo (Remote OS Command Injection).
* Inclusión de Archivos Remotos y Locales (Path Traversal / Remote File Inclusion).
* Ataques de Entidades Externas XML (XXE) e Inyecciones XPath/XSLT.
* Cross Site Scripting Reflejado (Reflected XSS).
