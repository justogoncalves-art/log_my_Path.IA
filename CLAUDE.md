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
- Multi-región: LATAM en São Paulo; Europa (España) tendrá su propia base en la UE.

## Entorno
- Supabase: `mypath-dev` (zbqtalpksfvqwmtqgboa) y `mypath-prod` (rlvmyhqejdxgexndxbsg), ambos en São Paulo.
- Vercel: proyecto `mypath-app`, funciones en `gru1` (São Paulo, junto a la base).
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
