# MY PATH.IA — Design System

**Version 2.0 · 2026 · Confidential**
The quiet, institutional visual language of the MY PATH.IA psychopedagogical & technology ecosystem.

---

## OVERVIEW

MY PATH.IA is a **psychopedagogical and technology ecosystem** — a trusted guide, not a startup and not a clinic. The visual language communicates **authority, precision, and warmth** at once. The aesthetic is quiet, institutional, and considered.

**Design philosophy:** Restraint over decoration. Whitespace is structure, not emptiness. The gradient is a tool, not a feature. Typography does the heavy lifting. Color signals, never shouts.

The ecosystem contains a parent brand (MY PATH.IA) and five sub-brands — **Mento.IA, My.Campus IA, My.Well, LINNO, Cognition** — that share the neutral palette and type system but each carry their own accent gradient. Syncopate is reserved for the parent brand only.

### Sources provided
- Brand guidelines document (Design System v2.0, pasted in brief) — the source of truth for all tokens, rules, and components here.
- `uploads/Logo_My Path.ia.png` → `assets/logo/mypathia-logo-full.png` (full logotype, gradient on light).
- `uploads/M (23).png` → `assets/logo/mypathia-mark.png` (gradient "M" icon mark).
- `uploads/SpaceGrotesk-VariableFont_wght.ttf`, `uploads/Quicksand-VariableFont_wght.ttf` → `assets/fonts/` (shipped locally).
- No codebase or Figma file was provided. Components are authored directly from the guidelines' enumerated component list.

### Font substitutions ⚠
Two of the four brand typefaces were **not provided as files** and are loaded from Google Fonts:
- **Syncopate** (display / logo) — Google Fonts.
- **DM Mono** (labels / metadata) — Google Fonts.
If you have licensed copies of these, add the `.ttf`/`.woff2` files to `assets/fonts/` and replace the `@import` in `tokens/fonts.css` with local `@font-face` rules.

---

## CONTENT FUNDAMENTALS

**Voice:** calm, precise, warm. We are a guide, not a vendor.

- **Offer, never sell.** "We offer clarity," never "we sell assessments." Service language over commercial language.
- **Technology is the ally; the person is the hero.** Mention AI as a tool that supports professionals — never as the protagonist. "Advanced AI works alongside professionals."
- **Professionals are partners.** We *enhance, support, empower* — never *replace*.
- **Specific over clever.** Real numbers, real outcomes, real language. "94% report clarity," not "best-in-class insights."
- **One idea per sentence.** No compound claims. A period where a semicolon would do.

**Reserved vocabulary — use:** clarity · accompaniment · purpose · self-awareness · precise · real · advanced AI · data.
**Avoid:** test · assessment · psychometrics · evaluation · sell · replace · best-in-class · revolutionary · disrupt.

**Casing & person:** Sentence case for headings and UI labels (only DM Mono metadata is uppercase, tracked). "We" for the brand, "you/your" for the person. No emoji anywhere. "MY PATH.IA" is always full caps, one line. "Build your tomorrow." (capital B, trailing period) always accompanies the logo — never one without the other.

**Attribution:** external pieces always carry the handle **@mypath.ia** (Instagram, Threads) · **/mypath-ia** (LinkedIn) · **mypath.ia** (web).

---

## VISUAL FOUNDATIONS

**Color.** Base is white `#fdfdfd` and ice blue `#f0f6ff` (~40%). Navy `#060754` is the structural anchor (~30%) — dark heroes, footers, table headers, sidebars. Accents (~30%) are the signature 90° gradient `#f95bf6 → #532cf9 → #03f7eb` plus gray tones. **On navy, text is always white** — never gray, never blue. The gradient appears **once per section maximum**, never as a large background fill, never as body text. Secondary grays are context-locked: Mid Gray `#737373` on light only; Light Gray `#d9d9d9` on navy only.

**Type.** Four families, each with a job. **Syncopate** (display/logo, parent only) — heavy, tracked, gradient or white. **Space Grotesk** (H1–H4, UI, buttons, nav) — geometric, slightly playful, weights 400–700. **Quicksand** (body, long-form, all sub-brands) — warm, rounded, generous 1.75–1.8 line-height. **DM Mono** (labels, metadata, hex, versions) — uppercase, 4px+ tracking. Max two typefaces visible per component. Never set body in Syncopate.

**Spacing & layout.** 4px base unit; every value is a multiple of 4. Section padding is 64–80px desktop. Content maxes at 1200px (hero) / 1000px (content) / 680px (long-form text). 12-column grid, 24px gutters.

**Backgrounds.** Solid only — navy for dark sections, white/ice for light. **No gradient background fills.** Hero decoration is at most one subtle radial gradient blob (≤12% opacity, `pointer-events: none`). No textures, no patterns, no imagery baked into surfaces.

**Cards.** Defined by **borders, not shadows** — `1px solid #e8edf5`, 12px radius (16px for feature cards). Optional 2–3px gradient top accent. Shadows are essentially absent from the system; the only box-shadows are focus rings.

**Corner radii.** sm 4 (badges) · md 8 (buttons, inputs) · lg 12 (cards) · xl 16 (large cards) · 2xl 24 (feature/hero) · full 9999 (pills, avatars).

**Borders & dividers.** Lines are structural, not decorative: `#e8edf5` on light, `rgba(255,255,255,0.07)` on dark. The gradient accent line (2–3px, 48–64px wide short / 100% full) is the signature separator — below headlines, above footers.

**Transparency & blur.** Used sparingly: sticky nav gains `backdrop-filter: blur(8px)` and a translucent navy on scroll; dark cards are `rgba(255,255,255,0.04)` surfaces with `rgba(255,255,255,0.10)` borders.

**Motion.** Serves content, never decorates. Default ease `cubic-bezier(0.16, 1, 0.3, 1)` (fast out, slow in — spring-like). Durations 80–800ms; nothing over 500ms for UI. Prefer translate + opacity over scale/rotate.
- **Hover:** buttons lift `translateY(-1px)` + opacity 0.90; cards lift `translateY(-2px)` + border darkens to `rgba(6,7,84,0.15)`.
- **Press:** buttons return to `translateY(0)` + opacity 0.85 (80ms).
- **Focus:** violet ring `0 0 0 3px rgba(83,44,249,0.08)` on light, cyan on dark.
All motion has a `prefers-reduced-motion` fallback.

**Imagery.** Clean, optimistic, real people, desaturated 5–10%. Illustration is minimal and geometric — **no gradients in illustration fills** (gradient is reserved for UI/type). On dark sections, subtle vignette + navy overlay at 0.2.

---

## ICONOGRAPHY

- **Style:** outline, **1.5px stroke**, rounded line caps and joins.
- **Sizes:** 16px (inline), 20px (UI default), 24px (feature), 32px (hero accent).
- **Color:** inherits context — `#060754` or `#737373` on light; `#fdfdfd` or `rgba(255,255,255,0.65)` on dark. **Never gradient-filled** — the gradient is for typography and surfaces only.
- **Library:** the guidelines recommend **Lucide, Phosphor, or Heroicons (outline)**. No codebase icon set was provided, so **Lucide** is the reference set — load it from CDN (`https://unpkg.com/lucide@latest`) or paste individual SVGs at 1.5px stroke. This is a substitution ⚠ — swap in the brand's chosen set if one exists.
- **Emoji:** never used. **Unicode as icons:** avoided. Icons are always real SVGs.
- Inline SVGs used in components (select chevron, checkbox tick) follow the 1.5px outline rule.

---

## INDEX / MANIFEST

**Root**
- `styles.css` — global entry point (consumers link this one file). `@import` lines only.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skill wrapper for use in Claude Code.

**`tokens/`** — `fonts.css` (@font-face + Google import), `colors.css`, `typography.css`, `spacing.css` (spacing + radius + layout), `motion.css`, `interactions.css` (hover/focus/press states).

**`assets/`** — `logo/mypathia-logo-full.png`, `logo/mypathia-mark.png`, `fonts/` (Space Grotesk, Quicksand `.ttf`).

**`components/`** (namespace `window.MYPATHIADesignSystem_2f1489`)
- `brand/` — **Logo**, **Divider**
- `buttons/` — **Button** (primary · secondary · ghost · text · pill)
- `cards/` — **Card** (standard · ice · dark · feature), **StatCard**
- `feedback/` — **Badge** (brand · ice · outline · status), **ProgressBar**, **EcosystemTag**
- `forms/` — **Input**, **Select**, **Checkbox**, **Radio**
- `data/` — **Table**

Each directory has a `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and a `*.card.html` thumbnail.

**`guidelines/`** — foundation specimen cards (Colors, Type, Spacing, Brand groups).

**`ui_kits/`**
- `marketing/` — MY PATH.IA homepage (dark hero, feature grid, stats band, ecosystem map, testimonial, footer). Interactive, composed from DS components.
- `dashboard/` — MY PATH.IA practitioner dashboard (navy sidebar, stat cards, people table, path-progress panel). Interactive, composed from DS components.

**Intentional additions:** none beyond the guidelines' enumerated inventory. Navigation patterns (top nav, sidebar) live inside the UI kits rather than as standalone primitives, since they are product-specific compositions.

---

*MY PATH.IA Design System · v2.0 · 2026 · Confidential · Build your tomorrow. · mypath.ia · @mypath.ia*
