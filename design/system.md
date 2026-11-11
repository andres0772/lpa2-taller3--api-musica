# YourMusic design system

Synchronized from the current project source. Values below are recorded only when they exist in the discovered source.

## Source

- `frontend/src/index.css` — Tailwind CSS v4 `@theme` tokens, global styles, glass treatment, shadows, transitions, and reduced-motion rule.

## Colors

| Token | Value | Usage found in source |
|---|---|---|
| `--color-bg-deep` | `#020617` | Global page background (`body`). |
| `--color-bg-card` | `rgba(15, 23, 42, 0.72)` | `.glass` surface. |
| `--color-bg-card-hover` | `rgba(30, 41, 59, 0.8)` | `.glass-strong` surface. |
| `--color-border-glass` | `rgba(148, 163, 184, 0.12)` | Default glass border and global border color. |
| `--color-border-glass-hover` | `rgba(148, 163, 184, 0.22)` | `.glass:hover` border. |
| `--color-accent-indigo` | `#4f46e5` | Primary indigo accent. |
| `--color-accent-glow` | `#6366f1` | Lighter indigo accent. |
| `--color-accent-muted` | `rgba(79, 70, 229, 0.15)` | Muted indigo accent surface. |
| `--color-text-main` | `#f1f5f9` | Primary page text. |
| `--color-text-muted` | `#94a3b8` | Secondary page text. |

## Typography

| Token | Value | Usage found in source |
|---|---|---|
| `--font-sans` | `"Geist Variable", "Inter Variable", system-ui, sans-serif` | Global `body` font family. |

Type sizes, weights, line heights, and letter spacing are **not tokenized in the discovered source**. Artboards may establish a visual type scale, but those values are proposal-level art direction rather than existing project tokens.

## Spacing

No spacing scale is declared in `frontend/src/index.css`. Spacing in the current UI comes from Tailwind utility classes. A reusable spacing token scale must therefore be proposed before it can be treated as a project token.

## Radius

No radius tokens are declared in `frontend/src/index.css`. Radius values currently come from Tailwind utility classes and must not be represented as source-backed system tokens.

## Shadows

| Usage | Value | Source |
|---|---|---|
| Glass resting shadow | `0 4px 24px rgba(2, 6, 23, 0.4)` | `frontend/src/index.css` |
| Glass hover shadow | `0 12px 40px rgba(2, 6, 23, 0.5)` | `frontend/src/index.css` |

## Effects and motion

| Rule | Value | Usage |
|---|---|---|
| Glass backdrop | `blur(24px) saturate(180%)` | `.glass` surface treatment. |
| Glass transition | `180ms cubic-bezier(0.16, 1, 0.3, 1)` | `.glass` interaction transition. |
| Smooth scrolling | `scroll-behavior: smooth` | Global `html` behavior. |
| Reduced motion | Animation and transition duration forced to `0.01ms`; iteration count forced to `1` | Global `prefers-reduced-motion: reduce` rule. |

## Component rules

### Glass surface

- Background: `--color-bg-card`.
- Border: `--color-border-glass`.
- Backdrop: `blur(24px) saturate(180%)`.
- Resting shadow: `0 4px 24px rgba(2, 6, 23, 0.4)`.
- Hover border: `--color-border-glass-hover`.
- Hover shadow: `0 12px 40px rgba(2, 6, 23, 0.5)`.
- Transition: `all 180ms cubic-bezier(0.16, 1, 0.3, 1)`.

### Strong glass surface

- Background: `--color-bg-card-hover`.
- Inherits the glass border, backdrop, shadow, and interaction behavior unless locally overridden.

### Global surface rule

- Every element uses `--color-border-glass` as its default border color.
- Primary page canvas and text use `--color-bg-deep` and `--color-text-main`.
- Secondary text uses `--color-text-muted`.
