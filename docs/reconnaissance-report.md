# Reporte de Reconocimiento y Escaneo de Seguridad

## Escaneo de Puertos e Infraestructura (Nmap)

### Detalles del Escaneo
* **Herramienta utilizada:** Nmap (Network Mapper) Versión 7.98
* **Objetivo:** `192.168.5.20` (Servidor Ubuntu)
* **Comando ejecutado:** `nmap -sV -sC -p- 192.168.5.20`
* **Estado general:** El host se encuentra activo (latencia muy baja de 0.00052s). Se omitieron 65,532 puertos cerrados de tipo TCP (reset).

---

### Puertos Abiertos y Servicios Detectados

Basado en el análisis profundo de firmas, huellas de servicio y cabeceras del sistema (`fingerprint-strings`), estos son los puertos e infraestructura en ejecución dentro del entorno:

| Puerto / Protocolo | Estado | Servicio Oficial / Detectado | Versión / Información Técnica de la Infraestructura |
| :--- | :--- | :--- | :--- |
| `22/tcp` | Abierto | **SSH** | OpenSSH 8.9p1 Ubuntu 3ubuntu0.15 (Ubuntu Linux; protocolo 2.0). |
| `3000/tcp` | Abierto | **HTTP** | Servidor Node.js con Framework **Next.js** (Frontend). <br><br>*Evidencia:* Las respuestas devuelven las cabeceras `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch` y `X-Powered-By: Next.js`. |
| `3001/tcp` | Abierto | **HTTP** | Servidor Node.js con Framework **Express** (API/Backend). <br><br>*Evidencia:* Responde de forma nativa con cabeceras de seguridad Helmet avanzadas (`Content-Security-Policy`, `Strict-Transport-Security: max-age=15552000`, `X-Content-Type-Options: nosniff`). |

---

### Análisis de Hallazgos y Correlación

* **Superficie de Exposición Limpia:** El escáner exhaustivo sobre los 65,535 puertos (`-p-`) confirma que la superficie de ataque de la máquina víctima está perfectamente delimitada a tres únicos canales. No existen servicios huérfanos, bases de datos expuestas directamente al exterior (como el puerto por defecto de PostgreSQL 5432, lo cual significa que está bien configurado para escuchar solo en localhost) o puertos maliciosos no deseados.
* **Confirmación de Arquitectura Desacoplada:** Nmap corroboró técnicamente que la aplicación web se compone de dos capas independientes ejecutándose en Node.js. El puerto `3000` actúa como el servidor de renderizado de la interfaz visual (Next.js) y el puerto `3001` procesa la lógica del negocio mediante un servicio API REST que interactúa con la base de datos local del servidor.
* **Evidencias de Endurecimiento (Hardening) Parcial:** Aunque el puerto 3000 adolece de varias cabeceras omitidas según el reporte de OWASP ZAP, las respuestas crudas del puerto 3001 demuestran que el programador de la API implementó soluciones de seguridad (probablemente mediante el middleware `helmet`), protegiendo el backend activamente contra inyecciones de MIME o de Clickjacking.

# Reporte de Seguridad ZAP (OWASP) - Checkmarx
**Fecha del Escaneo:** 12 de julio de 2026
**Objetivos Analizados:** Aplicaciones locales (`192.168.5.20:3000`, `3001`) y servicios externos integrados.

---

## 📊 Resumen Ejecutivo de Alertas

El escaneo de vulnerabilidades identificó un total de **13 alertas** clasificadas según su nivel de riesgo:

| Nivel de Riesgo | Cantidad | Estado / Acción Requerida |
| :--- | :---: | :--- |
| 🔴 **Alto (High)** | **0** | No se detectaron amenazas críticas inmediatas. |
| 🟠 **Medio (Medium)** | **3** | **Prioridad Alta.** Requieren remediación en la configuración del servidor/app |
| 🟡 **Bajo (Low)** | **6** | Buenas prácticas de seguridad y mitigación de fuga de información. |
| 🔵 **Informativo** | **4** | Hallazgos contextuales sobre el comportamiento de la aplicación. |

---

## 🟠 Alertas de Riesgo Medio (Acción Inmediata)

### 1. Política de Seguridad de Contenido (CSP) No Configurada
*   **Descripción:** La aplicación no envía la cabecera `Content-Security-Policy`. Esto permite que el navegador cargue scripts, estilos o recursos de cualquier origen, aumentando drásticamente el riesgo de ataques **Cross-Site Scripting (XSS)** e inyección de datos.
*   **Alcance:** Detectado de forma sistémica en la aplicación principal (`http://192.168.5.20:3000`).
*   **Remediación:** Configurar el servidor o los middlewares de la aplicación para incluir una cabecera CSP restrictiva que defina explícitamente los orígenes permitidos para scripts, imágenes y estilos.

### 2. Ausencia de Cabecera Anti-Clickjacking
*   **Descripción:** Falta la configuración que impide que la aplicación sea embebida dentro de un `<iframe>` en un sitio web de terceros. Un atacante podría superponer una capa invisible para engañar al usuario y robar sus interacciones (clics).
*   **Alcance:** 3 instancias detectadas, afectando directamente a la raíz y a la ruta `/login` en el puerto 3000.
*   **Remediación:** Inyectar la cabecera HTTP `X-Frame-Options: SAMEORIGIN` o utilizar la directiva `frame-ancestors` en la política CSP.

### 3. Configuración Incorrecta de CORS (Cross-Domain Misconfiguration)
*   **Descripción:** Se identificó el uso de la cabecera `Access-Control-Allow-Origin: *`. Aunque se encuentra en endpoints que no requieren autenticación (lo que reduce el impacto), permite que cualquier dominio lea los datos de respuesta.
*   **Alcance:** Asociado a peticiones de servicios externos integrados (`mozilla.net`, `googleapis.com`).
*   **Remediación:** Restringir el acceso CORS definiendo explícitamente los dominios de confianza en lugar de utilizar el comodín `*`.

---

## 🟡 Alertas de Riesgo Bajo (Buenas Prácticas)

*   **Fuga de Información del Servidor (`X-Powered-By`):** El encabezado expone explícitamente el uso de **Next.js**. Se recomienda desactivarlo para no dar pistas tecnológicas a posibles atacantes.
*   **Ausencia de HTTP Strict Transport Security (HSTS):** No se obliga al navegador a comunicarse exclusivamente mediante HTTPS seguro.
*   **Exposición de IP Privada:** Se detectó la inclusión de una dirección IP interna (`10.1.1.2`) en el cuerpo de la respuesta de un servicio analizado.
*   **Falta de Cabecera `X-Content-Type-Options`:** Permite que los navegadores realicen *MIME-sniffing*, lo que podría llevar a la ejecución de archivos de texto o imágenes como código ejecutable si se logran vulnerar las subidas de archivos.
