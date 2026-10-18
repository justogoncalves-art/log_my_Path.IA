# MY PATH.IA — Landing & Home

Landing interactiva del ecosistema psicopedagógico **MY PATH.IA**, construida en HTML como Design Component. Incluye dos pantallas:

1. **Login** — carrusel de citas a pantalla completa (rota cada 10 s) + acceso con selector Alumno / Docente, login con Google, usuario MY PATH.IA o correo, y registro.
2. **Home** — cabecera con nombre, idioma (ES/EN), modo claro/oscuro y salida; saludo personalizado y mosaico de productos del ecosistema (Mento.IA, My Campus.IA, My Mind.IA, My Cognition.IA, Linno) con estados activo/inactivo, pop-ups informativos y chatbot "Path".

## Estructura

```
My Path Landing.dc.html   → página principal (abre directo en el navegador)
support.js                → runtime del Design Component (no editar)
_ds/                      → design system MY PATH.IA (tokens, estilos, bundle)
uploads/                  → imágenes y logos usados por la landing
README.md
```

## Uso

Abre `My Path Landing.dc.html` en un navegador moderno, o sírvelo desde cualquier hosting estático:

```bash
npx serve .
```

No requiere build ni dependencias: todo es HTML, CSS inline y JavaScript vanilla.

## Diseño

- **Paleta:** Celeste `#399AB8` (acento único), Opulent `#133039`, Oat Milk `#F6F0EC`, Fresh Linen `#F8F8F8`, Deep Chocolate `#151111`.
- **Tipografías:** Syncopate (marca), Space Grotesk (títulos/UI), Quicksand (texto), DM Mono (metadatos).
- Sin gradientes de marca; superficies sólidas y bordes suaves, según el design system v3.

---

*MY PATH.IA · Build your tomorrow.*
