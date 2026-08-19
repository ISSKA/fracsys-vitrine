# Mesh Viewer WebApp

A 3D mesh visualization web application built with TypeScript and VTK.js.

## Project Structure

```text
index.html                       # Root Mesh Viewer HTML entry
vite.config.ts                   # Shared multi-page Vite configuration
vitrine-meshviewer/webapp/html/
├── src/
│   ├── app.ts                   # Main application entry point
│   ├── fracture_zone_loader.ts  # Fracture zone file loading and layer management
│   ├── damage_zone_loader.ts    # Zone switching
│   └── scalar_bar.ts            # DOM-based colour bar overlay
├── types/vtk.d.ts               # Minimal VTK.js declarations
├── styles.css
├── package.json                 # Mesh-specific dependencies
└── tsconfig.json
```

## Setup

### Prerequisites

- Node.js (v20.19 or higher)
- npm

### Installation

```bash
# From the repository root
npm install
```

## Development

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Type Checking

```bash
npm run type-check:mesh
```

## Production Build

```bash
npm run build
```

Both viewer pages are written to the root `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Docker Deployment

```bash
# Build the TypeScript app
npm install
npm run build

# Start Docker container (from project root)
docker compose -f vitrine-meshviewer/docker-compose.yaml up -d
```

The application will be available at `http://localhost:8080`.

The Docker container serves the unified root `dist/` directory on port 80.

## Features

- 3D mesh visualization using VTK.js
- Multi-layer support with per-layer visibility toggles
- Interactive controls: rotate (left mouse), pan (right mouse), roll (Shift + left mouse), zoom (scroll wheel)
- Cell picking with metadata tooltip (H, Q, Type values)
- Cloud download from AWS S3
- Local file upload (.vtp files)
- Wireframe / surface rendering toggle
- Colour bar overlay with hydraulic head scale

## Technology Stack

- **TypeScript 6** — shared type-checking toolchain
- **VTK.js 30+** — 3D visualization library
- **Vite 8** — shared build tool and dev server
- **Docker / Apache httpd** — containerized deployment

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the unified development server |
| `npm run build` | Build both viewer pages for production |
| `npm run preview` | Preview the unified production build |
| `npm run type-check:mesh` | Check mesh types without emitting |
