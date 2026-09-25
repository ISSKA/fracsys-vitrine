# FracSYS Vitrine

FracSYS Vitrine is a Vite single-page application for exploring FracSYS models and flow results.

## Prerequisites

- Node.js 20.19 or a supported newer release
- npm
- Docker or Podman (optional)
- Python 3.12+

## Development

Install dependencies and start the unified development server from the repository root:

```bash
npm install
npm run dev
```

Open the app at <http://localhost:3000/>

## Production build

```bash
npm run build
npm run preview
```

The app is written to the root `dist/` directory.

## Docker

Build and serve the complete application with nginx:

```bash
docker compose up --build
```

The app is then available on port 8080.

## Flow-grid data

Place local CSV grids in `public/data/`. Set `VITE_DEFAULT_GRID_FILENAME` in the root `.env.local` file to choose the startup grid. If the file is unavailable, the Flow Viewer uses its generated sample grid.

## Repository structure

```text
fracsys-vitrine/
├── index.html             # Viewer page at /
├── src/grid/              # Loading and construction of the voxel grid
├── src/rendering/         # Rendering of the 3d scene
├── src/config.ts          # Runtime configuration
├── public/data/           # Local flow-grid data and vtp files
├── vite.config.ts         # Vite configuration
├── Dockerfile             # Unified production image
├── nginx.conf             # Unified static-server configuration
└── package.json           # Dependencies, toolchain, and commands
```

Useful checks:

```bash
npm run type-check
npm run build
```

---

# FracSYS Vitrine — Français

FracSYS Vitrine est une application Vite permettant d'explorer les modèles et les résultats d'écoulement FracSYS.

## Prérequis

- Node.js 20.19 ou une version ultérieure prise en charge
- npm
- Docker ou Podman (facultatif)
- Python 3.12+

## Développement

Installez les dépendances et démarrez le serveur unifié depuis la racine du dépôt :

```bash
npm install
npm run dev
```

L'application est disponible à l'adresse <http://localhost:3000/>

## Construction de production

```bash
npm run build
npm run preview
```

L'application est générée dans le répertoire racine `dist/`.

## Docker

Construisez et servez l'application complète avec nginx :

```bash
docker compose up --build
```

L'application est alors accessible sur le port 8080.

## Données de grille

Placez les grilles CSV locales dans `public/data/`. Définissez `VITE_DEFAULT_GRID_FILENAME` dans le fichier `.env.local` à la racine pour sélectionner la grille chargée au démarrage. Si elle est absente, la visionneuse utilise une grille d'exemple générée.
