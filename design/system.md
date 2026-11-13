# YourMusic — Sistema de diseño (sync 2026-11-13)

Sincronizado desde las fuentes del proyecto. Solo se registran valores encontrados en las fuentes; cada entrada nombra su `path`.

## Color

Tokens definidos en `frontend/src/index.css` (bloque `@theme`):

| Token | Valor | Uso |
|---|---|---|
| `--color-bg-deep` | `#020617` | Fondo base de toda la app (`body` en `frontend/src/index.css`) |
| `--color-bg-card` | `rgba(15, 23, 42, 0.72)` | Paneles glass (`.glass`, `frontend/src/index.css`) |
| `--color-bg-card-hover` | `rgba(30, 41, 59, 0.8)` | Variante fuerte de panel (`.glass-strong`) |
| `--color-border-glass` | `rgba(148, 163, 184, 0.12)` | Borde por defecto de paneles y tarjetas |
| `--color-border-glass-hover` | `rgba(148, 163, 184, 0.22)` | Borde en hover y en superficies activas (player, toolbar) |
| `--color-accent-indigo` | `#4f46e5` | Acento principal: botón de play, acción primaria |
| `--color-accent-glow` | `#6366f1` | Acento de brillo: foco visible, links de acción, ondas del waveform |
| `--color-accent-muted` | `rgba(79, 70, 229, 0.15)` | Fondo de iconos/botones secundarios (`.skip-button` en `frontend/src/styles/cinematic.css`) |
| `--color-text-main` | `#f1f5f9` | Texto principal |
| `--color-text-muted` | `#94a3b8` | Texto secundario, etiquetas, placeholders |

Composiciones derivadas observadas en las fuentes: `color-mix(in srgb, var(--color-bg-deep) 88%, var(--color-accent-indigo) 12%)` para el `.glass-player`, y `90%/10%` para `.explore-toolbar` (`frontend/src/styles/cinematic.css`).

## Tipografía

- Familia: `--font-sans` = `"Geist Variable", "Inter Variable", system-ui, sans-serif` (`frontend/src/index.css`).
- Escala observada (fuente: `frontend/src/styles/cinematic.css` salvo nota):
  - Eyebrow: 11px / 700 / mayúsculas / letter-spacing 0.18em, con filete de 26px adelante (`cinematic.css:161`).
  - Etiquetas de campo (`.explore-field label`): 9px / 700 / mayúsculas / 0.13em.
  - Botones (`.action-button`): 13px / 700.
  - Texto base / campos: 13px (`cinematic.css:1183`).
  - Notas y switch de login: 12px (`cinematic.css:1483`).
  - Tiempos del player / duración: 10px tabular-nums (`cinematic.css:455`, `cinematic.css:477`).

## Espaciado, radio y sombra

- Padding de panel toolbar: 20px; campo: padding 0 14px, min-height 46px; bot primario: min-height 48px (`cinematic.css:1149-1205`).
- Radios: 20px en `.glass-player` (`cinematic.css:399`); 3px en barras de waveform (`cinematic.css:469`); 50% en botones circulares (`cinematic.css:351`).
- Sombras: `.glass` → `0 4px 24px rgba(2, 6, 23, 0.4)` (`frontend/src/index.css`); `.glass-player` → `0 18px 60px var(--color-bg-deep)` (`cinematic.css:401`); barra de seek: 4px de alto, thumb 12px (`cinematic.css`, bloque `.seek-bar`).
- Transición base: `all 0.18s cubic-bezier(0.16, 1, 0.3, 1)` en `.glass`; `transform/background/border-color 180ms ease` en `.action-button`.

## Reglas de componente

- **Foco**: global `:focus-visible` → `outline: 2px solid var(--color-accent-glow); outline-offset: 4px` (`frontend/src/index.css`). Campos: mismo color con offset 1px (`cinematic.css:1193`).
- **Movimiento reducido**: global, `animation-duration/transition-duration: 0.01ms` bajo `prefers-reduced-motion` (`frontend/src/index.css`).
- **`.glass`**: panel translúcido con borde y sombra; ojo: declarado con `backdrop-filter: blur(24px) saturate(180%)` en `index.css`, pero la pasada de performance (commit 914aaa5) eliminó el blur de las superficies repetidas y animadas de la app: usar `.glass` solo en paneles únicos, no en listas.
- **`.action-button` / `.action-primary`**: botón de 48px, primario en indigo sólido con texto `--color-text-main`, hover levanta 2px (`cinematic.css:208`).
- **`.eyebrow`**: etiqueta de sección con filete (`cinematic.css:161`).
- **`.explore-field`**: patrón label+input en grid, gap 8px; input oscuro con borde glass-hover (`cinematic.css:1161`).
- **`.explore-toolbar`**: contenedor de filtros/acciones sobre fondo mezclado 90/10 (`cinematic.css:1149`).
- **Login actual (mínimo, a rediseñar)**: `.login-form` (columna, máx 420px), `.login-error` (panel de error con borde accent-glow), `.login-switch` (texto 12px + botón link en accent-glow) — `cinematic.css:1466-1495`.
