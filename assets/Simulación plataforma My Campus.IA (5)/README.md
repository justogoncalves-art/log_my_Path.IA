# My Campus.IA — Plataforma web (simulación)

> **Focused on your future.** — Buscador y guía universitaria con IA.
> Parte del ecosistema **MY PATH.IA**.

Aplicación web **autónoma de un solo archivo** (`index.html`). Funciona 100 % en estático:
ábrela con doble clic o súbela tal cual a **Vercel**, GitHub Pages o cualquier hosting.
No necesita build, servidor ni dependencias (solo las tipografías de Google Fonts, que
cargan por CDN).

---

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project → Import** el repo.
3. **Framework Preset:** *Other*. Sin build command. **Output / root:** la raíz (donde está `index.html`).
4. Deploy. Listo: la app sirve `index.html` y carga `assets/` automáticamente.

> No hay paso de compilación: Vercel publica los archivos estáticos directamente.

---

## Estructura

```
index.html          La aplicación completa (HTML + CSS + JS en un archivo)
assets/campus/      Fotos de campus, globo y recurso visual
README.md           Este archivo
```

---

## Qué incluye (todo funcional)

**Banner superior** (en todas las pantallas): logo My Campus.IA, accesos *Ver resultados de
Mento.IA*, *Estadísticas del mundo* y *Hacer test vocacional*; a la derecha selector de
idioma **ES/EN**, usuario y ajustes.

- **Landing** — saludo personalizado, 4 accesos y bloque de frase filosófica.
- **Tu Afinidad RIASEC** — perfil Holland del alumno + **10 carreras por % de afinidad**;
  cada una lleva al listado de universidades filtrado por su área.
- **Universidades** — vistas **Listado / Mosaico / Mapa**, filtros (país, tipo, idioma,
  área, ranking QS, matrícula, becas), tarjetas con foto/ranking/**favorito**, y **ficha
  de universidad** con rankings, programas, coste de vida (Airbnb/Booking/Numbeo) y botón
  **Contactar con la universidad**.
- **Carreras** — buscador + 10 programas; cada uno abre **¿Qué es? · ¿Qué hace un alumno? ·
  Salidas profesionales · Competencias** y salta a las universidades que lo imparten.
- **Estudios Posibles (estudiar en el extranjero)** — bloque en la landing y botón en el banner
  superior; abre un formulario (nombre, país de origen, colegio, país de destino, año proyectado)
  con el **20 % de descuento** de usuario My Path. También accesible desde cada universidad con
  el botón *Quiero estudiar aquí*.
- **Comparador** — hasta 4 **universidades o carreras** dato a dato, resaltando el mejor valor.
- **Test vocacional Mento.IA** — popup de bienvenida, detalle (7 capítulos · 50 min · 15 u$s)
  y flujo *Pagar y continuar* → confirmación.
- **Asistente IA (Mento)** — chat flotante con respuestas orientativas.

---

## Notas

- **Favoritos** se guardan en el navegador (localStorage).
- El **idioma** ES/EN cambia textos principales y navegación.
- Datos **simulados** con fines de demostración (rankings, costes y salarios aproximados,
  no oficiales). El **chatbot** usa respuestas por palabra clave, listo para conectar a un
  modelo real más adelante.

*My Campus.IA · MY PATH.IA — @mypath.ia*
