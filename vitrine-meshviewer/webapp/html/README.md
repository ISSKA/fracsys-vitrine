# Mesh Viewer WebApp

A 3D mesh visualization web application built with TypeScript and VTK.js.

## Project Structure

```
webapp/html/
├── src/
│   ├── app.ts                   # Main application entry point
│   ├── fracture_zone_loader.ts  # Fracture zone file loading and layer management
│   ├── damage_zone_loader.ts    # Zone switching (fracture / damage)
│   └── scalar_bar.ts            # DOM-based colour bar overlay
├── types/
│   └── vtk.d.ts                 # TypeScript definitions for VTK.js
├── dist/                        # Build output (generated)
├── index.html                   # HTML entry point
├── styles.css                   # Application styles
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── vite.config.ts               # Vite build configuration
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
npm run dev:mesh
```

The app will be available at `http://localhost:3000`.

### Type Checking

```bash
npm run type-check:mesh
```

## Production Build

```bash
npm run build:mesh
```

Built files are written to `webapp/html/dist/`.

### Preview Production Build

```bash
npm run preview:mesh
```

## Docker Deployment

```bash
# Build the TypeScript app
npm install
npm run build:mesh

# Start Docker container (from project root)
docker compose -f vitrine-meshviewer/docker-compose.yaml up -d
```

The application will be available at `http://localhost:8080`.

The Docker container serves files from `webapp/html/dist/` on port 80.

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
| `npm run dev:mesh` | Start the mesh development server |
| `npm run build:mesh` | Build the mesh viewer for production |
| `npm run preview:mesh` | Preview the mesh production build |
| `npm run type-check:mesh` | Check mesh types without emitting |
