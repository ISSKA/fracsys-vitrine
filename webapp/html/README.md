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

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
cd webapp/html
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
npm run type-check
```

## Production Build

```bash
npm run build
```

Built files are written to `webapp/html/dist/`.

### Preview Production Build

```bash
npm run preview
```

## Docker Deployment

```bash
# Build the TypeScript app
cd webapp/html
npm install
npm run build

# Start Docker container (from project root)
cd ../..
docker-compose up -d
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

- **TypeScript 5.3+** — type-safe JavaScript
- **VTK.js 30+** — 3D visualization library
- **Vite 5** — build tool and dev server
- **Docker / Apache httpd** — containerized deployment

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Check types without emitting |
