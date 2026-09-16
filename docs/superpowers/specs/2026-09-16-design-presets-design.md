# Design Presets — Design Spec

Date: 2026-09-16

## Problem

The theme's inclusive-design goal is that someone who can't see their own
site — not just someone who doesn't know design — should still be able to
put together something coherent and trustworthy. Today the only stylistic
knobs are `navbar_light`, `navbar_custom_bg`, and the logo. That's not
enough surface for a curated default to feel meaningfully different from
another, and a written style guide doesn't help someone who can't visually
verify the result of following it.

Design presets solve this: a small number of named, scenario-based bundles
("Portfolio", "Professional Business Site", ...) that set a coordinated
group of style tokens at once, each pre-verified for WCAG contrast in both
light and dark mode. A sighted owner can pick one and keep customizing on
top of it; someone who can't see the result can pick one by scenario name
and trust it was already checked to work.

## Non-goals

- No external web fonts. Every font pairing stays within the system font
  stack the theme already ships (no new network requests, no privacy/GDPR
  surface, no added load time).
- No attempt to make every Bootstrap 4 spacing value preset-aware. Density
  and card-style tokens are scoped to the theme's own custom-built surfaces
  (comment widget, code blocks) — not a full Bootstrap retheme.
- No build-time/CI contrast checker. Verification is done once per preset
  during implementation (the same manual method used for the dark-mode
  work) and the resulting ratios are recorded in this doc and the README.
- Presets are a `THEME_CONFIG` bundle, not a new plugin or Python
  dependency. Everything lives inside the theme's own template files.

## 1. Design tokens

A fixed set of CSS custom properties the theme's own CSS routes through.
Defaults match the theme's *current* look exactly, so a site that sets no
`PRESET` renders identically to today.

| Token | Default (light) | Default (dark) | Controls |
|---|---|---|---|
| `--site-accent` | `#0056b3` | `#6ea8fe` | Links, focus rings, comment-widget accent (aliases `--lk-border-focus`) |
| `--site-accent-solid` | `#0056b3` | `#0056b3` | Filled buttons with white text. Deliberately its **own** independent token, not `var(--site-accent)` — that variable itself changes value inside the dark-mode media query, and a `var()` reference re-resolves live against whatever `--site-accent` currently is. Aliasing them would silently regress the exact white-text-on-too-light-a-fill bug found and fixed during the dark-mode work. Each preset sets this explicitly, to the same hex as its light-mode `--site-accent` (already verified safe for both text-on-page and white-text-on-fill below). |
| `--site-font-heading` | system sans stack | (same) | Heading font family |
| `--site-font-body` | system sans stack | (same) | Body font family |
| `--site-radius` | `0.25rem` | (same) | Corner rounding across badges, cards, code blocks, buttons |
| `--site-density` | `comfortable` | (same) | `data-density` attribute on `<body>`; `[data-density="compact"]` reduces `.lk-comment-card` padding from `1.25rem` to `0.85rem` and `pre`/`.codetable` padding from `0.75rem` to `0.5rem` |
| `--site-card-style` | `bordered` | (same) | `data-card-style` attribute on `<body>`; `[data-card-style="flat"]` removes the `.lk-comment-card` border entirely (keeps the existing subtle `--lk-bg-card` tint as the only surface cue); `[data-card-style="shadowed"]` removes the border and adds `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` (light) / `0 4px 12px rgba(0,0,0,0.4)` (dark) |

`--site-accent` becomes the single source of truth the comment widget's
`--lk-border-focus` reads from (`--lk-border-focus: var(--site-accent, #4f46e5);`),
so a preset's accent automatically carries into the comment form instead of
needing to be set twice.

## 2. Selecting a preset

One new `THEME_CONFIG` key:

```python
THEME_CONFIG = {
    DEFAULT_LANG: {
        "PRESET": "portfolio",
        # ... existing keys (LOGO_URL, navbar_light, etc.) still work
        # and still override anything the preset sets, individually.
    }
}
```

Preset data lives in a new `templates/presets_helper.tmpl`, as a
module-level Mako block (`<%! PRESETS = {...} %>`) — a plain Python dict,
no new file format, no plugin. `base.tmpl` looks up
`PRESETS.get(theme_config.get('PRESET'))` and, if found, emits a small
`<style>` block right after the theme's own stylesheet link, setting the
`:root` custom properties and the two `data-*` attributes on `<body>`. If
no preset is set, nothing changes — the defaults in `theme.css` stand as
they do today.

Explicit `THEME_CONFIG` values (e.g. a site owner setting `navbar_light`
directly) are unaffected by this — presets only ever set the *new* tokens
above, never the existing keys, so there's no override-ordering question
to get wrong.

## 3. The presets

Five to start, each with a scenario name, a description (written for both
audiences — reasoning, not just appearance), and verified contrast ratios.

### Portfolio
*For individual creatives and professionals showcasing their own work.*

> A confident violet accent and slightly rounded corners feel personal and
> current without tipping into playful — the kind of restrained
> individuality that reads as "someone made deliberate choices here."
> Comfortable spacing lets each project breathe.

- `--site-accent`: `#5540d6` (light) / `#b4a5fb` (dark)
- `--site-accent-solid`: `#5540d6`
- `--site-radius`: `0.5rem`
- font/density/card-style: theme defaults (comfortable, bordered, sans)
- Contrast: 6.79:1 on white · 6.79:1 as white-on-fill · 8.67:1 on `#121212`

### Professional Business Site
*For companies, consultancies, and formal organizational sites.*

> A restrained blue is the safest, most broadly-trusted accent color in
> business contexts for a reason. Sharp corners and compact spacing read
> as efficient and buttoned-up rather than decorative — the visual
> equivalent of a well-formatted business letter.

- `--site-accent`: `#1d4ed8` (light) / `#93b7f9` (dark)
- `--site-accent-solid`: `#1d4ed8`
- `--site-radius`: `0.125rem`
- `--site-density`: `compact`
- `--site-card-style`: `flat`
- font: theme defaults (sans)
- Contrast: 6.70:1 on white · 6.70:1 as white-on-fill · 9.26:1 on `#121212`

### Personal Blog
*For a writing-first, editorial, personality-forward site.*

> A warm terracotta accent alongside a serif heading font (paired with the
> theme's normal sans body text) is a classic editorial pairing — it
> signals "written word matters here" the way a magazine masthead does,
> without requiring any font to be downloaded.

- `--site-accent`: `#b8460e` (light) / `#fb923c` (dark)
- `--site-accent-solid`: `#b8460e`
- `--site-radius`: `0.375rem`
- `--site-font-heading`: `Georgia, 'Times New Roman', Times, serif` (the same system serif stack `theme.css` already uses for `.post-micro`)
- density/card-style: theme defaults (comfortable, bordered)
- Contrast: 5.36:1 on white · 5.36:1 as white-on-fill · 8.28:1 on `#121212`

### Documentation / Technical
*For docs sites, project pages, and technical reference material.*

> A cool teal is common in developer-tool contexts because it reads as
> calm and precise rather than urgent. Sharp corners and compact spacing
> prioritize fitting more reference material on screen over decorative
> breathing room — appropriate when people are scanning for an answer,
> not settling in to read.

- `--site-accent`: `#0f766e` (light) / `#5eead4` (dark)
- `--site-accent-solid`: `#0f766e`
- `--site-radius`: `0.125rem`
- `--site-density`: `compact`
- `--site-card-style`: `flat`
- font: theme defaults (sans)
- Contrast: 5.47:1 on white · 5.47:1 as white-on-fill · 12.66:1 on `#121212`

### Community / Nonprofit
*For community groups, nonprofits, and volunteer-run organizations.*

> Green carries a strong, near-universal association with growth and
> community. Heavily rounded corners and a soft shadow on cards feel
> approachable and warm rather than corporate — an invitation rather than
> a wall.

- `--site-accent`: `#15803d` (light) / `#4ade80` (dark)
- `--site-accent-solid`: `#15803d`
- `--site-radius`: `0.75rem`
- `--site-card-style`: `shadowed`
- font/density: theme defaults (comfortable, sans)
- Contrast: 5.02:1 on white · 5.02:1 as white-on-fill · 10.75:1 on `#121212`

All five clear the 4.5:1 AA minimum with margin, in both light and dark
mode, and as white text on a solid fill.

## 4. Where the description text lives

The description (the "for both audiences, explains the reasoning" part)
is stored once, in the `PRESETS` dict itself, and surfaces in two places:
the main README (a table listing every preset, scenario, and description
— readable by anyone deciding which to pick without touching code), and a
code comment beside each entry in `presets_helper.tmpl` (so the reasoning
survives for future maintainers, not just end users).

## 5. Implementation surface

- `templates/presets_helper.tmpl` (new) — the `PRESETS` dict.
- `templates/base.tmpl` — lookup + emit the `:root`/`data-*` override block.
- `assets/css/theme.css` — define the token defaults at `:root` (and the
  existing dark-mode block), refactor the hardcoded link/accent colors
  from the WCAG pass to reference `var(--site-accent)` instead; add the
  `[data-density="compact"]` and `[data-card-style="flat"/"shadowed"]`
  scoped rules for the comment widget and code blocks.
- `templates/comments_helper.tmpl` — `--lk-border-focus` becomes an alias
  of `--site-accent` instead of its own hardcoded value.
- `README.md` — new "Design Presets" section: the table above, and the
  `THEME_CONFIG["PRESET"]` usage example.

## 6. Testing plan

Same method used throughout this session: build the demo site with each
preset set in turn, screenshot it, and re-run the axe-core contrast audit
in both light and simulated-dark mode to confirm no regressions. Also
verify: no `PRESET` set still renders byte-identical to the current
theme (defaults match exactly), and an explicit `THEME_CONFIG` override
(e.g. a custom `navbar_custom_bg`) still wins over whatever a preset would
otherwise imply.
