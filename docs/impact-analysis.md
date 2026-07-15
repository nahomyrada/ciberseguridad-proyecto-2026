# Análisis de Impacto Técnico — AutoApply Bot

**Proyecto:** Simulación de Ataque Informático y Remediación (Ciberseguridad, UCAB 2025-2026)
**Responsable:** Anthonny Baladi (Líder Ofensivo / coordinación Red Team)

> Borrador generado a partir de la explotación documentada en
> `docs/exploitation-report.md`. Anthonny debe revisarlo como líder ofensivo antes
> de la entrega final.

Este documento explica, para cada vulnerabilidad explotada, qué ocurrió
técnicamente a nivel de **red**, **base de datos**, **servidor** y **memoria/proceso**.

## 1. IDOR — Broken Access Control (A01:2025 / CWE-639)

- **Red:** las peticiones del atacante son indistinguibles a nivel de red de las de
  un usuario legítimo — mismo puerto (3001), mismo protocolo HTTPS/HTTP, mismo
  formato JSON. No hay anomalía detectable por un firewall o IDS de red tradicional.
- **Base de datos:** antes del parche, la tabla `proposals` no tenía columna
  `user_id`; las consultas SQL (`SELECT * FROM proposals WHERE id = $1`) no
  incluían ninguna cláusula de filtrado por propietario, así que **cualquier fila
  era alcanzable** desde cualquier sesión autenticada.
- **Servidor:** el proceso de Node.js ejecuta la consulta y serializa la fila
  completa a JSON sin ninguna capa de autorización intermedia — el control de
  acceso a nivel de aplicación simplemente no existía en el controlador.
- **Memoria/proceso:** no hay corrupción de memoria ni ejecución de código; el
  impacto es puramente de **lógica de autorización** — los datos de otros
  usuarios circulan por la memoria del proceso Node.js y se devuelven en la
  respuesta HTTP como si pertenecieran al solicitante.

## 2. Mishandling de errores (A10:2025 / CWE-209)

- **Red:** la respuesta HTTP 500 incluye, en el propio cuerpo, la traza de
  llamadas del proceso Node.js — un observador de tráfico (o el propio atacante)
  obtiene esta información sin necesitar acceso privilegiado a la red interna.
- **Base de datos:** aunque el error concreto capturado en las pruebas fue de
  parseo de JSON (no llegó a tocar la base de datos), el mismo mecanismo
  expondría igual de fácil errores de PostgreSQL (violaciones de constraint,
  nombres de tablas/columnas) si el error se originara en una consulta.
- **Servidor:** el stack trace revela la ruta absoluta de instalación
  (`/home/ubuntu/ciberseguridad-proyecto-2026/backend/`), las librerías internas
  usadas (`body-parser`, `raw-body`) y por extensión la versión de Node.js y el
  gestor de paquetes — información que reduce drásticamente el esfuerzo de
  reconocimiento para ataques posteriores más dirigidos.
- **Memoria/proceso:** el `stack` de la excepción es, literalmente, una
  representación del estado de la pila de llamadas del proceso en el momento del
  fallo — se está exponiendo un artefacto interno de la memoria de ejecución del
  proceso Node.js directamente al cliente HTTP.

## 3. Prompt Injection (LLM01:2025 / CWE-1427)

- **Red:** la petición maliciosa viaja como una oferta de trabajo aparentemente
  legítima (`jobData.description`); no hay firma ni patrón de red distinguible de
  tráfico normal de la aplicación.
- **Base de datos:** la oferta con el payload de inyección se persiste tal cual en
  `job_offers.description` — la base de datos almacena el ataque como si fuera
  un dato de negocio válido, sin ningún tipo de sanitización en la escritura.
- **Servidor:** el backend concatena ese campo directamente en el prompt enviado
  a la API de Gemini. El "servidor" en este caso no ejecuta código malicioso, pero
  actúa como un canal de transporte confiado que entrega instrucciones no
  confiables al modelo de lenguaje sin ningún control intermedio.
- **Memoria/proceso:** no hay impacto de memoria en el proceso Node.js — el
  "procesamiento" indebido ocurre fuera del proceso, dentro del modelo de Gemini,
  que interpreta datos como si fueran instrucciones. El riesgo residual es que la
  salida del modelo (potencialmente manipulada) se reenvía tal cual al cliente y,
  finalmente, a un tercero real en la plataforma freelance.

## 4. Vulnerabilidades adicionales

### 4.1 Information Leak en reset de contraseña (CWE-200)

- **Red:** el token de reset viaja en texto plano en la respuesta HTTP —
  cualquiera con visibilidad del tráfico (o simplemente el propio solicitante,
  como en este ataque) lo obtiene directamente.
- **Base de datos:** en la versión vulnerable no existe una tabla de tokens de
  reset; el token se genera al vuelo y no se persiste, lo que además impide
  invalidarlo o hacerle seguimiento.
- **Servidor:** el endpoint genera el token con `crypto.randomBytes`, pero anula
  esa seguridad criptográfica al incluir el valor en la respuesta — el mecanismo
  de generación es fuerte, el manejo posterior no.
- **Memoria/proceso:** el token vive brevemente en memoria del proceso antes de
  serializarse en la respuesta; no hay explotación de memoria, es un error de
  diseño del flujo de datos.

### 4.2 RCE vía `eval()` (CWE-94)

- **Red:** una única petición HTTP POST desencadena ejecución de comandos en el
  servidor — no se requiere ninguna conexión adicional ni canal de C2; la propia
  respuesta HTTP puede usarse para exfiltrar el resultado del comando ejecutado.
- **Base de datos:** no directamente comprometida por este vector, pero un
  atacante con RCE podría usar las credenciales de conexión del proceso
  (visibles en variables de entorno) para acceder después a PostgreSQL.
- **Servidor:** impacto máximo — `eval()` ejecuta el string recibido como código
  JavaScript arbitrario dentro del mismo proceso Node.js que corre el backend.
  La prueba confirmó ejecución real de `whoami`, revelando el usuario del sistema
  operativo (`ubuntu`), la versión de Node (`v20.20.2`) y el hostname (`victima`).
  Con `child_process.exec`, el atacante tiene efectivamente **control total del
  servidor** bajo los privilegios del proceso Node.js.
- **Memoria/proceso:** `eval()` compila y ejecuta el payload dentro del mismo
  espacio de memoria y proceso del servidor de producción — no hay aislamiento
  (sandbox, contenedor separado, usuario con privilegios reducidos) entre el
  código de la aplicación y el código inyectado por el atacante.

## 5. Alcance del daño en un escenario real

Si `AutoApply Bot` estuviera en producción con datos de usuarios reales, esta
combinación de vulnerabilidades permitiría: robo de propuestas comerciales
confidenciales entre freelancers (IDOR), reconocimiento detallado de la
infraestructura (A10:2025), secuestro de cuentas de usuarios reales (token leak),
manipulación de comunicaciones enviadas a clientes reales (Prompt Injection), y
compromiso completo del servidor con capacidad de pivotar a otros sistemas de la
red (RCE). El encadenamiento de reconocimiento → acceso → RCE representa el
peor escenario: de una aplicación web pública a control total del host que la aloja.
