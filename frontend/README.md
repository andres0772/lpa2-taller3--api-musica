# Frontend de YourMusic

SPA de **YourMusic** con una portada cinematográfica y un archivo luminoso de favoritos, construida con React, TypeScript y Vite.

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- Motion
- Lucide React
- Sonner
- Vitest + React Testing Library + jsdom
- Playwright para los smoke tests en Chromium

## Instalación

```bash
cd frontend
npm ci
```

## Desarrollo

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

- Portada: `http://localhost:5173/`
- Exploración del catálogo: `http://localhost:5173/canciones`
- Favoritos: `http://localhost:5173/favoritos`

La interfaz consume por defecto la API en `http://127.0.0.1:8000`. Para usar otra dirección:

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

La portada conserva un catálogo demo local si la API no está disponible. La vista de favoritos muestra un estado de error explícito y permite reintentar.

## Verificación

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

El smoke test real usa Chromium. Instalalo una vez por entorno y ejecutá el test:

```bash
npx playwright install chromium
npm run test:e2e
```

`npm run build` genera la aplicación de producción en `frontend/dist/`. Para probarla localmente:

```bash
npm run preview
```

## Estructura principal

```text
src/
├── api/          # Cliente de usuarios, canciones y favoritos
├── components/   # Navegación compartida
├── data/         # Catálogo demo local
├── pages/        # Portada, exploración y favoritos
├── styles/       # Composición cinematográfica y luminosa
├── test/         # Configuración global de Testing Library
├── App.tsx
├── index.css
└── main.tsx
```

## Comportamiento actual

- La portada consume `GET /api/canciones` y usa el catálogo demo como fallback.
- La vista de exploración consume `GET /api/canciones` paginado y `GET /api/canciones/buscar` con los filtros de título/artista y género; permite guardar o quitar favoritos por canción.
- Las tarjetas editoriales de la portada seleccionan la canción destacada del reproductor en lugar de usar anclas inexistentes.
- Los discos giran y los waveform se animan solo mientras hay audio en reproducción; toda la animación usa `transform`/`opacity` y respeta `prefers-reduced-motion`.
- La vista de favoritos consume `GET /api/usuarios/1` y `GET /api/usuarios/1/favoritos`.
- Las canciones guardadas se resuelven mediante `GET /api/canciones/{id}` cuando el endpoint de favoritos no incluye la relación completa.
- El reproductor usa `archivo_audio` cuando la API loprovee. Las canciones seed actuales no tienen archivo de audio, por lo que la interfaz informa esa ausencia en lugar de simular sonido.
- La autenticación todavía no está implementada; el frontend usa el usuario demo `id=1`.
