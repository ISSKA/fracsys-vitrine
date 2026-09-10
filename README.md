# FracSYS Vitrine

FracSYS Vitrine is one Vite multi-page application for exploring FracSYS models and flow results. The mesh and flow viewers share one toolchain, build, and deployment while running on separate pages so their WebGL renderers remain isolated.

| Page | URL | Description |
| --- | --- | --- |
| [Mesh Viewer](docs/mesh-viewer.md) | `/` | Fracture- and damage-zone meshes rendered with VTK.js |
| [Flow Viewer](docs/flow-viewer.md) | `/flow/` | Particle-flow simulation rendered with Three.js |

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

Open the Mesh Viewer at <http://localhost:3000/> or the Flow Viewer at <http://localhost:3000/flow/>.

## Production build

```bash
npm run build
npm run preview
```

Both pages are written to the root `dist/` directory. The build emits separate VTK.js and Three.js entry bundles.

## Docker

Build and serve the complete application with nginx:

```bash
docker compose up --build
```

Both pages are then available on port 8080.

## Flow-grid data

Place local CSV grids in `public/data/`. Set `VITE_DEFAULT_GRID_FILENAME` in the root `.env.local` file to choose the startup grid. If the file is unavailable, the Flow Viewer uses its generated sample grid.

## Repository structure

```text
fracsys-vitrine/
├── index.html             # Mesh Viewer page at /
├── flow/index.html        # Flow Viewer page at /flow/
├── src/mesh/              # VTK.js viewer
├── src/flow/              # Three.js simulation
├── src/config.ts          # Shared runtime configuration
├── public/data/           # Local flow-grid data
├── vite.config.ts         # Multi-page Vite configuration
├── Dockerfile             # Unified production image
├── nginx.conf             # Unified static-server configuration
├── package.json           # Dependencies, toolchain, and commands
└── docs/                  # Viewer documentation
```

Useful checks:

```bash
npm run type-check
npm run build
```

---

# FracSYS Vitrine — Français

FracSYS Vitrine est une seule application Vite multipage permettant d'explorer les modèles et les résultats d'écoulement FracSYS. Les visionneuses de maillages et d'écoulement partagent la même chaîne d'outils, la même construction et le même déploiement, tout en restant sur des pages séparées afin d'isoler leurs moteurs WebGL.

| Page | URL | Description |
| --- | --- | --- |
| Visionneuse de maillages | `/` | Maillages des zones de fracture et d'endommagement rendus avec VTK.js |
| Visionneuse d'écoulement | `/flow/` | Simulation de particules rendue avec Three.js |


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

La visionneuse de maillages est accessible à l'adresse <http://localhost:3000/> et la visionneuse d'écoulement à l'adresse <http://localhost:3000/flow/>.

## Construction de production

```bash
npm run build
npm run preview
```

Les deux pages sont générées dans le répertoire racine `dist/`, avec des bundles distincts pour VTK.js et Three.js.

## Docker

Construisez et servez l'application complète avec nginx :

```bash
docker compose up --build
```

Les deux pages sont alors accessibles sur le port 8080.

## Données de grille

Placez les grilles CSV locales dans `public/data/`. Définissez `VITE_DEFAULT_GRID_FILENAME` dans le fichier `.env.local` à la racine pour sélectionner la grille chargée au démarrage. Si elle est absente, la visionneuse utilise une grille d'exemple générée.
