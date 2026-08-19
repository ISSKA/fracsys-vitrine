# Quick Start Guide

The Mesh Viewer is the root page of the unified FracSYS Vite application. Run all commands from the repository root.

## First-time setup

```bash
npm install
npm run dev
```

Open the Mesh Viewer at <http://localhost:3000/> or the Flow Viewer at <http://localhost:3000/flow/>.

## Production build

```bash
npm run type-check
npm run build
npm run preview
```

The complete multi-page build is written to the root `dist/` directory.

## Apache container

```bash
npm run build
docker compose -f vitrine-meshviewer/docker-compose.yaml up -d
```

Both pages are then available on port 8080.

## Verification

- The Mesh Viewer loads at `/` and can download or upload VTP files.
- The Flow Viewer loads at `/flow/` and falls back to its generated grid when no CSV is present.
- Navigation between the two pages works in both directions.
- `npm run type-check` and `npm run build` succeed from the repository root.
