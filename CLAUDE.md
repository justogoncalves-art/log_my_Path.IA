# MY PATH.IA

Plataforma de módulos psicopedagógicos para colegios, profesionales privados y particulares.
Los módulos (Mento.IA, My Campus.IA, My Mind.IA, My Cognition.IA, Linno) se activan por organización.

## Stack previsto
Next.js en Vercel · Supabase (Postgres + Auth + RLS) · Stripe · IA (Claude) · app móvil con Expo / React Native.

## Dominio
- Plataforma: `app.mypathia.app` · Mails (Resend): `send.mypathia.app` · DNS en Namecheap.

## Decisiones tomadas
- Identidad: una persona = un ID por documento (país + tipo + número). El mail queda atado a la persona; solo el admin lo cambia.
- Contraseña inicial: al azar, ~10 caracteres sin ambiguos, se genera al enviar el mail de bienvenida (programado por colegio desde el admin, plantilla HTML provista por My Path). Cambio obligatorio en el primer ingreso. El DNI no forma parte de la contraseña.
- Compras siempre en la web (Stripe); la app móvil solo para usar lo comprado.
- Datos separados en capas educativa / clínica / sanitaria con permisos propios.
- Programas: un programa = módulo + nivel/año + idioma (+ track). Cada idioma es un programa propio porque tiene sus videos (Mux). Se asignan masivamente por clase o individualmente.
- Campus: catálogo global (`campus_universities`, `campus_programs`; notas internas aparte en `campus_university_notes`, solo admin). Se carga en admin → Campus con el Excel de 43 columnas (completo o por país): actualiza lo existente, agrega lo nuevo, nunca borra (`admin_import_campus`, en tandas). Clave: país ISO + nombre oficial; carrera: universidad + nombre + tipo + modalidad. Los links de relleno (`xx-000.`) se guardan vacíos. Campus y EdFin solo se muestran desde cierto año (`modules.min_level/min_grade`).
- Reporte de programa y perfil holístico con IA: se generan por detrás, no se configuran en el admin.
- Reseller: entre admin y colegio/profesional. Solo ve estadísticas agregadas de sus organizaciones (`org_stats`, `reseller_overview`); nunca datos personales ni puede modificar nada. El admin ve las de todos los resellers.
- Idiomas en la tabla `languages` (es-ES, es-419, es-AR voseo, en, pt): se suman sin cambiar el esquema.
- Campus y EdFin: 5º y 6º de secundaria.
- Encuesta: "¿Te ha gustado My Path?" (1-5 estrellas) a mitad y al final del programa (`rate_program`); con 3 o menos se pide "¿Qué mejorarías?". Al completar el 100% se registra en `program_completions` y se envía por mail un formulario extenso.
- Documento: `doc_hash` (HMAC-SHA256) y `doc_cipher` (AES-256) con claves generadas en Supabase Vault; las funciones `private.doc_*` no las puede llamar nadie desde la API.
- Alta de organización = asistente paso a paso en admin → Organizaciones → "Nueva organización" (`/admin/organizaciones/nueva?org=…&paso=…`): organización (país de lista) → personas (Excel) → clases (nivel y año obligatorios) → módulos y licencias → programas por clase (idioma sugerido por país) → mail de bienvenida → revisión. Cada paso guarda en la base; se puede retomar. Programas en el admin: "Título + código" (Tu Manifiesto AR / ES / LAT / EN, `src/lib/program-names.ts`).
- Alta de personas: `admin_import_people` (validar y después guardar todo o nada). La cuenta de acceso se crea al enviar el mail de bienvenida. Si el documento ya existe con otro mail, se avisa y se mantiene el registrado.
- El panel de admin es solo para My Path: por ahora en español.
- Acciones del admin = funciones `admin_*` en la base (validan admin y dejan `audit_log`). Lo que toca cuentas de acceso (contraseñas, bloquear, cambiar mail) lo hace el servidor con `SUPABASE_SECRET_KEY`.
- Recuperar contraseña: "¿Olvidaste tu contraseña?" en el login → `/recuperar`. El servidor genera el link de recuperación de Supabase (`generateLink`) y lo manda por Resend apuntando a `/auth/recuperar` (nuestro dominio, no el mail de Supabase); ahí se valida y se elige la nueva en `/nueva-contrasena`. Misma respuesta exista o no el mail; máximo 3 pedidos por mail y 10 por IP por hora (`password_reset_requests`, solo huellas HMAC).
- Mails de bienvenida: `welcome_campaigns` + cron diario de Vercel (`/api/cron/welcome`, 10:00 UTC) o "Enviar ahora". La contraseña se genera en el envío y no se guarda.
- Programas con preguntas (Mento.IA y otros): Excel de 55 columnas → admin/Programas (`admin_import_program`). Cada carga crea una versión nueva (no se borra nada). Preguntas `simple` (una opción, con ponderaciones por dimensión en `option_weights`, que el alumno nunca ve) o `abierta` (texto). Respuestas en `responses` (solo la persona y el admin). Puntaje T teórico por dimensión: `admin_program_scores`.
- Videos: entorno "MY PATH" de Mux, reproducción `signed` (permiso firmado en el servidor por 6 h, `src/lib/mux.ts`). Admin → Programas → programa: "Buscar videos en Mux" une por nombre de archivo `<año>-<programa>_<IDIOMA>_cap<n>`. Claves: `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` (solo lectura).
- Campus del alumno (`src/app/m/campus/`, ruta propia para no chocar con `/m/[id]/[programId]`): inicio, afinidad RIASEC, buscador de carreras, universidades, ficha y comparador (hasta 4, la selección vive en el navegador). El perfil RIASEC sale de las respuestas del último programa de Mento completado (`my_riasec`), no del reporte de IA. Afinidad = 65 % tipo principal + 35 % secundario de la carrera, escala 0-100. Buscadores con filtros al costado y resultados en tarjetas: sin filtro de país, primero el país del colegio y después el extranjero (`campus_find_programs`, `campus_find_universities`). Home de Campus en mosaico con fotos (`public/img/campus/`).
- Capítulo terminado = cerrado: sus respuestas se ven pero no se cambian (`submit_answer` lo rechaza con "capítulo cerrado").
- Códigos de idioma del Excel: AR=es-AR, ES=es-ES, LAT=es-419, EN=en, PT=pt.
- Reporte de programa con IA (Claude, `src/lib/report.ts`): al completar un programa de Mento el reporte entra solo en cola (`program_reports`, disparador sobre `program_completions`) y se genera por detrás (`after()` al terminar el capítulo, al abrir `/m/mento/<programa>/reporte` y cron diario `/api/cron/reports`). Nunca se descarta: si falla, reintenta con espera creciente (5 min → 12 h); sin clave o sin saldo espera y avisa. El alumno nunca ve un error. A la IA van programa, país, puntajes T y respuestas: nunca nombre, mail ni documento. Solo comenta las evaluaciones que el programa incluye.
- Gasto de IA: `ai_settings` (tope mensual en USD, por defecto 32 ≈ 30 €; máximo de llamadas en 24 h; interruptor; mail de avisos) y `ai_usage` (cada llamada con tokens y costo, sin datos personales). Ningún reporte empieza si el gasto del mes + 1 USD pasa el tope; aviso al 80 %. Se configura en admin → Resumen. El tope real contra una clave filtrada es el límite de gasto de la consola de Anthropic.
- Multi-región: LATAM en São Paulo; Europa (España) tendrá su propia base en la UE.

## Entorno
- Supabase: `mypath-dev` (zbqtalpksfvqwmtqgboa) y `mypath-prod` (rlvmyhqejdxgexndxbsg), ambos en São Paulo.
- Vercel: proyecto `mypath-app`, funciones en `gru1` (São Paulo, junto a la base). Versión de prueba (rama de trabajo): `mypath-dev.vercel.app`. Claves del servidor (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) cargadas como tipo Secret en Production y Preview; se leen al publicar: para la versión de prueba, redeploy del último deployment de la rama (no el de producción).
- Migraciones en `supabase/migrations/`; datos ficticios solo para dev en `supabase/seed_dev.sql`.
- La herramienta MCP de Supabase pide confirmación humana para `DROP`/`DELETE`: preferir `ALTER`/`REVOKE` o avisar al usuario.
- Next.js 16: leer `node_modules/next/dist/docs/` antes de usar APIs nuevas. El middleware se llama `src/proxy.ts`.
- Este contenedor no tiene salida a supabase.co ni vercel.com: probar permisos con SQL simulando el rol y la app en el despliegue de Vercel.

## Pendientes para producción
- IA en modo pago: activarla junto con los planes pagos de Vercel (Pro) y Supabase (Pro). Hoy es una versión interna: workspace propio en la consola de Anthropic con límite de gasto mensual, clave solo de ese workspace y recarga automática acotada.
- Con Vercel Pro, pasar el cron de reportes de diario a cada 15 minutos.

## Skills
- Las skills del proyecto están en `.claude/skills/` (ver `.claude/skills/LEEME.md`).
- Antes de cada tarea, buscar si hay una skill que aplique (del proyecto o de las disponibles en la sesión) y usarla.

## Reglas
- Diseño: usar el ancho de la pantalla (contenedor `max-w-[1600px]` con `px-5 md:px-10`), no todo apretado y centrado. Desde cualquier pantalla se vuelve al inicio con el botón "Inicio" del encabezado.
- Datos de menores y de salud: permisos por fila (RLS) en todas las tablas, sin datos personales en logs, nada de claves en el código.
- La lógica va en la API compartida, para que la use tanto la web como la app móvil.
- Idioma de la interfaz: español e inglés.
