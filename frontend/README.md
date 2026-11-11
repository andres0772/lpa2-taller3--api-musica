# Frontend de YourMusic

SPA de la landing page de **YourMusic**, construida con React, TypeScript y Vite.

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- Motion
- Lucide React
- Sonner
- Vitest + React Testing Library + jsdom
- Playwright para el smoke test en Chromium

## Requisitos

- Node.js `^20.19.0 || >=22.12.0`
- npm 10 o superior

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
├── components/  # Navbar, video, marquee y tarjeta glass
├── pages/       # Landing page
├── test/        # Configuración global de Testing Library
├── App.tsx
├── index.css
└── main.tsx
```

## Estado actual

La interfaz utiliza datos locales de demostración y todavía no está conectada a la API FastAPI. La integración, el manejo de estados asíncronos y la autenticación se implementarán en unidades posteriores.
