# Mesh Viewer WebApp (TypeScript)

A 3D mesh visualization web application built with TypeScript and VTK.js.

## Project Structure

```
webapp/
├── src/
│   ├── app.ts                    # Main application entry point
│   ├── fracture_zone_loader.ts  # Fracture zone file loading and layer management
│   └── damage_zone_loader.ts    # Damage zone switching and loading
├── types/
│   └── vtk.d.ts           # TypeScript definitions for VTK.js
├── dist/                   # Build output (generated)
├── index.html             # HTML entry point
├── styles.css             # Application styles
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite build configuration
```

## Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
cd webapp
npm install
```

## Development

### Development Server

Run the development server with hot module replacement:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Type Checking

Run TypeScript type checking without emitting files:

```bash
npm run type-check
```

## Production Build

Build the application for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Docker Deployment

The application is configured to run in a Docker container using Apache httpd.

### Build and Run

```bash
# Build the TypeScript app
cd webapp
npm install
npm run build

# Start Docker container (from project root)
cd ..
docker-compose up -d
```

The application will be available at `http://localhost:8080`

### Docker Configuration

- The Docker container serves files from `webapp/dist/`
- Port mapping: `8080:80`
- Container name: `meshing-viewer`

## Features

- 3D mesh visualization using VTK.js
- Multi-layer support (mesh and markers)
- Interactive controls (rotate, pan, zoom)
- Cell picking and metadata display
- Cloud download from AWS S3
- Local file upload (.vtp files)
- Wireframe/Surface rendering modes

## Technology Stack

- **TypeScript 5.3+** - Type-safe JavaScript
- **VTK.js 30+** - 3D visualization library
- **Vite 5** - Fast build tool and dev server
- **Docker** - Containerized deployment

## Migration from JavaScript

This project was migrated from JavaScript to TypeScript with:
- Strict type checking enabled
- Proper type definitions for VTK.js modules
- Modern ES modules with Vite bundling
- Type-safe interfaces for all data structures

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Check types without emitting |
