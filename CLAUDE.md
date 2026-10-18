# MY PATH.IA

Plataforma de módulos psicopedagógicos para colegios, profesionales privados y particulares.
Los módulos (Mento.IA, My Campus.IA, My Mind.IA, My Cognition.IA, Linno) se activan por organización.

## Stack previsto
Next.js en Vercel · Supabase (Postgres + Auth + RLS) · Stripe · IA (Claude) · app móvil con Expo / React Native.

## Dominio
- Plataforma: `app.mypathia.app` · Mails (Resend): `send.mypathia.app` · DNS en Namecheap.

## Skills
- Las skills del proyecto están en `.claude/skills/` (ver `.claude/skills/LEEME.md`).
- Antes de cada tarea, buscar si hay una skill que aplique (del proyecto o de las disponibles en la sesión) y usarla.

## Reglas
- Datos de menores y de salud: permisos por fila (RLS) en todas las tablas, sin datos personales en logs, nada de claves en el código.
- La lógica va en la API compartida, para que la use tanto la web como la app móvil.
- Idioma de la interfaz: español e inglés.
