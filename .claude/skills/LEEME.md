# Skills seleccionadas para MY PATH.IA

40 de las 311 skills del paquete original, elegidas para este stack:
**Next.js + Supabase (Postgres) + Vercel + Stripe + IA (Claude) + app móvil con Expo / React Native.**

Instalación: copiar la carpeta `skills/` dentro de `.claude/skills/` en el repo.

## Web (Next.js / React)
| Skill | Para qué en My Path |
|---|---|
| nextjs-turbopack | Base del proyecto en Next.js 16 |
| react-patterns | Componentes servidor/cliente, formularios, carga de datos |
| frontend-patterns | Estructura de pantallas, estado, rendimiento |
| react-performance | Buenas prácticas de Vercel para que cargue rápido con 500+ alumnos |
| react-testing | Tests de componentes |
| design-system | Llevar el design system de My Path (tokens, tipografías) al código |
| make-interfaces-feel-better | Pulido visual de la interfaz |
| motion-foundations / motion-patterns | Las animaciones del prototipo (carrusel, tiles, modales) |
| i18n-sync | Español / Inglés |
| frontend-a11y / accessibility | Accesibilidad (WCAG 2.2) en web, iOS y Android |

## App móvil (App Store / Google Play)
| Skill | Para qué |
|---|---|
| react-native-patterns | App con Expo + React Native, reutilizando TypeScript, Supabase y la lógica de la web |

## Backend y base de datos
| Skill | Para qué |
|---|---|
| backend-patterns | Rutas de API y lógica de servidor en Next.js |
| api-design | API para la web y la app móvil (paginación, errores, límites) |
| postgres-patterns | Esquema, índices y Row Level Security en Supabase |
| database-migrations | Cambios de base de datos seguros y reversibles |
| error-handling | Manejo de errores, reintentos |
| redis-patterns | Límite de pedidos (rate limiting) contra ataques y bots, colas |

## Seguridad y datos de menores
| Skill | Para qué |
|---|---|
| security-review | Checklist de seguridad: auth, secretos, inputs, pagos (incluye guía de nube) |
| healthcare-phi-compliance | Clasificación de datos sensibles, RLS, auditoría. Clave para My Cognition.IA (datos de salud) y datos de menores |
| agent-security-hardening | Proteger la IA que lee datos cargados por colegios (inyección de instrucciones) |

## IA (reportes y perfil holístico)
| Skill | Para qué |
|---|---|
| cost-aware-llm-pipeline | Elegir modelo por tarea, controlar presupuesto y reintentos |
| prompt-caching-strategy | Bajar costos al generar muchos reportes |

## Pagos
| Skill | Para qué |
|---|---|
| customer-billing-ops | Operar Stripe: suscripciones, reembolsos, packs, portal de cliente |

## Calidad, pruebas y despliegue
| Skill | Para qué |
|---|---|
| tdd-workflow | Escribir el test antes del código |
| e2e-testing | Pruebas end-to-end con Playwright (login, alta masiva, compra) |
| verification-loop | Verificación completa antes de cada entrega |
| browser-qa | Revisión visual y de errores después de cada deploy |
| click-path-audit | Revisar que cada botón del panel de admin haga lo que dice |
| benchmark | Medir velocidad y latencia de la API |
| production-audit | Checklist antes de salir a producción |
| canary-watch | Monitorear la app después de cada lanzamiento |
| deployment-patterns | CI/CD, healthchecks, rollback |
| git-workflow | Ramas, commits, PRs |
| coding-standards | Convenciones de código |

## Planificación
| Skill | Para qué |
|---|---|
| architecture-decision-records | Dejar por escrito cada decisión técnica (docs/adr/) |
| intent-driven-development | Convertir cada módulo en criterios de aceptación verificables |
| search-first | Buscar librerías existentes antes de programar algo desde cero |
| seo | Landing pública para particulares y profesionales |

## Qué quedó afuera y por qué
- Otros lenguajes y frameworks (Java, Kotlin, Django, Laravel, Rust, Go, Vue, Angular, Flutter, Swift nativo, etc.).
- Skills internas del ecosistema "ECC" (configuración, costos, memoria, orquestación de agentes).
- Temas ajenos al proyecto: logística, trading, homelab/redes, video, marketing en redes, investigación científica.
- `mailtrap-email-integration`: vamos a proponer otro proveedor de mail; se puede sumar si eligen Mailtrap.
- `github-ops`: depende del CLI `gh` y de herramientas ECC.
- `eval-harness` / `ai-regression-testing`: apuntan a evaluar agentes de código, no la IA de la plataforma.
