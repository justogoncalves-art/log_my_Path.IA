# MY PATH.IA — Ecosistema (prototipo interactivo)

Prototipo navegable del ecosistema **MY PATH.IA**: acceso, home del ecosistema, **Mento.IA** y **My Campus.IA**, con dos perfiles de entrada — **Usuario** (alumno) y **Organización** (docente).

Sitio 100 % estático (HTML + CSS + JS del lado del cliente). No necesita build ni servidor de aplicaciones.

## Cómo verlo

Abre `index.html` en un servidor estático (necesario porque la app carga archivos y un `<iframe>` con rutas relativas — abrirlo como `file://` puede fallar):

```bash
# Opción 1 — Python
python3 -m http.server 8000
# luego abre http://localhost:8000

# Opción 2 — Node
npx serve .
```

### Publicar en GitHub Pages
1. Sube el contenido de esta carpeta a la raíz del repositorio.
2. En **Settings → Pages**, elige la rama y la carpeta raíz (`/`).
3. La app queda disponible en la URL de Pages. `index.html` es el punto de entrada.

## Estructura

```
index.html          Aplicación principal (acceso, home, Mento.IA, panels de organización)
support.js          Runtime del componente de la página (requerido por index.html)
_ds/                Design System MY PATH.IA — tokens (color, tipografía, etc.) y bundle
campus/             My Campus.IA (buscador de universidades y programas) — se embebe vía iframe
  ├─ index.html
  └─ assets/        Imágenes propias de My Campus.IA
assets/             Imágenes y logos usados por la aplicación principal
README.md
```

## Recorridos principales

**Usuario (alumno):** accede como *Usuario* → home con Mento.IA, My Campus.IA y Linno → capítulos, test y "Tu reporte" (Evaluaciones · Resultados · Tips).

**Organización (docente):** accede como *Organización* → Mento.IA con Seguimiento de alumnos, Gestión de capítulos, Estadísticas, Resumen IA, Guía didáctica y Actividades → My Campus.IA docente con Seguimiento de clase, buscadores de universidad/programas y "Estudios posibles".

La barra superior (logo, cambio Mento.IA / My Campus.IA, idioma ES/EN, modo claro/oscuro, usuario y salir) se mantiene en todas las vistas.

## Notas

- Idiomas: Español / Inglés (conmutador en la barra superior).
- Tema claro / oscuro incluido.
- Los enlaces "abrir buscador" del docente entran a la vista embebida de My Campus.IA; el botón **Inicio** de esas vistas devuelve al panel del docente.
- Contenido de demostración (alumnos, universidades, métricas) es ilustrativo.

---
MY PATH.IA · *Build your tomorrow.*
