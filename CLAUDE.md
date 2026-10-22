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
- Campus es un catálogo global (22 países) cargado desde admin; Campus y EdFin solo se muestran desde cierto año (`modules.min_level/min_grade`).
- Reporte de programa y perfil holístico con IA: se generan por detrás, no se configuran en el admin.
- Reseller: entre admin y colegio/profesional. Solo ve estadísticas agregadas de sus organizaciones (`org_stats`, `reseller_overview`); nunca datos personales ni puede modificar nada. El admin ve las de todos los resellers.
- Idiomas en la tabla `languages` (es-ES, es-419, es-AR voseo, en, pt): se suman sin cambiar el esquema.
- Campus y EdFin: 5º y 6º de secundaria.
- Encuesta: "¿Te ha gustado My Path?" (1-5 estrellas) a mitad y al final del programa (`rate_program`); con 3 o menos se pide "¿Qué mejorarías?". Al completar el 100% se registra en `program_completions` y se envía por mail un formulario extenso.
- Documento: `doc_hash` (HMAC-SHA256) y `doc_cipher` (AES-256) con claves generadas en Supabase Vault; las funciones `private.doc_*` no las puede llamar nadie desde la API.
- Alta de personas: `admin_import_people` (validar y después guardar todo o nada). La cuenta de acceso se crea al enviar el mail de bienvenida. Si el documento ya existe con otro mail, se avisa y se mantiene el registrado.
- El panel de admin es solo para My Path: por ahora en español.
- Acciones del admin = funciones `admin_*` en la base (validan admin y dejan `audit_log`). Lo que toca cuentas de acceso (contraseñas, bloquear, cambiar mail) lo hace el servidor con `SUPABASE_SECRET_KEY`.
- Mails de bienvenida: `welcome_campaigns` + cron diario de Vercel (`/api/cron/welcome`, 10:00 UTC) o "Enviar ahora". La contraseña se genera en el envío y no se guarda.
- Programas con preguntas (Mento.IA y otros): Excel de 55 columnas → admin/Programas (`admin_import_program`). Cada carga crea una versión nueva (no se borra nada). Preguntas `simple` (una opción, con ponderaciones por dimensión en `option_weights`, que el alumno nunca ve) o `abierta` (texto). Respuestas en `responses` (solo la persona y el admin). Puntaje T teórico por dimensión: `admin_program_scores`.
- Videos: entorno "MY PATH" de Mux, reproducción `signed` (permiso firmado en el servidor por 6 h, `src/lib/mux.ts`). Admin → Programas → programa: "Buscar videos en Mux" une por nombre de archivo `<año>-<programa>_<IDIOMA>_cap<n>`. Claves: `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` (solo lectura).
- Códigos de idioma del Excel: AR=es-AR, ES=es-ES, LAT=es-419, EN=en, PT=pt.
- Multi-región: LATAM en São Paulo; Europa (España) tendrá su propia base en la UE.

## Entorno
- Supabase: `mypath-dev` (zbqtalpksfvqwmtqgboa) y `mypath-prod` (rlvmyhqejdxgexndxbsg), ambos en São Paulo.
- Vercel: proyecto `mypath-app`, funciones en `gru1` (São Paulo, junto a la base). Versión de prueba (rama de trabajo): `mypath-dev.vercel.app`. Claves del servidor (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) cargadas como tipo Secret en Production y Preview; se leen al publicar: para la versión de prueba, redeploy del último deployment de la rama (no el de producción).
- Migraciones en `supabase/migrations/`; datos ficticios solo para dev en `supabase/seed_dev.sql`.
- La herramienta MCP de Supabase pide confirmación humana para `DROP`/`DELETE`: preferir `ALTER`/`REVOKE` o avisar al usuario.
- Next.js 16: leer `node_modules/next/dist/docs/` antes de usar APIs nuevas. El middleware se llama `src/proxy.ts`.
- Este contenedor no tiene salida a supabase.co ni vercel.com: probar permisos con SQL simulando el rol y la app en el despliegue de Vercel.

## Skills
- Las skills del proyecto están en `.claude/skills/` (ver `.claude/skills/LEEME.md`).
- Antes de cada tarea, buscar si hay una skill que aplique (del proyecto o de las disponibles en la sesión) y usarla.

## Reglas
- Datos de menores y de salud: permisos por fila (RLS) en todas las tablas, sin datos personales en logs, nada de claves en el código.
- La lógica va en la API compartida, para que la use tanto la web como la app móvil.
- Idioma de la interfaz: español e inglés.
