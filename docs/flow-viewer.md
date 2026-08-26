# Flow Viewer

A browser-based 3D simulation of water particle flow through a porous voxel grid. Built with TypeScript and Three.js.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.19 or later)

### Install and Run

Run these commands from the repository root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/flow/`. The Mesh Viewer is served by the same Vite process at `http://localhost:3000/`.

### Build for Production

```bash
npm run build
npm run preview
```

### Run with Docker

```bash
docker compose up --build
```

Open `http://localhost:8080/flow/`. The image is a two-stage build: Node compiles
both viewer pages, and nginx serves the static output (no Node in the runtime image).

For a hot-reloading dev server in a container on `http://localhost:3000/flow/`:

```bash
docker compose up dev
```

Without compose:

```bash
docker build -t fracsys-vitrine .
docker run --rm -p 8080:80 fracsys-vitrine
```

#### Build arguments

Vite inlines configuration at build time, so these are `--build-arg` values, not
runtime environment variables — changing one requires rebuilding the image.

| Arg | Default in image | Purpose |
| --- | --- | --- |
| `DEPLOY_BASE` | `/` | Public base path for both pages. Set it when hosting the application under a sub-path. |
| `VITE_DEFAULT_GRID_FILENAME` | `flow_network_voxels.csv` | Grid CSV loaded on startup, resolved relative to `public/data/`. |
| `VITE_MESH_DOWNLOAD_API_ENDPOINT` | Current FracSYS API | Signed-download API used by the Mesh Viewer. |

```bash
docker build --build-arg DEPLOY_BASE=/preview/ -t fracsys-vitrine .
```

#### Grid data

`public/data/*.csv` files are git-ignored, so a CSV is copied from your working tree
into the image at build time — a fresh clone has no grid file and the container
falls back to the generated sample grid. To swap grids without rebuilding,
uncomment the `volumes` block on the `web` service in `docker-compose.yml` to
bind-mount `./public/data` over the served `data/` directory.

## Usage

### Controls

- **Left-click + drag** — rotate the view
- **Scroll wheel** — zoom in/out
- **Right-click + drag** — pan
- **Pause / Run** — toggle the simulation
- **Reset view** — restore the initial camera view and restart particles at the top of the grid
- **Speed slider** — adjust simulation speed from 0.25× to 4×

### Custom grid format

Place the CSV in `public/data/` and select it with `VITE_DEFAULT_GRID_FILENAME`. The expected format is one voxel per row with center coordinates and permeability:

```
x,y,z,permeability
5460.0,-1230.0,-1710.0,0.8
5490.0,-1230.0,-1710.0,0.0
```

- **x, y, z** — center point of the voxel (world coordinates)
- **permeability** — value from 0.0 (impenetrable) to 1.0 (fully porous)
- Header row is optional (auto-detected)
- Comma, semicolon, and tab delimiters are supported
- The grid does not need to be a full rectangular block — sparse/irregular shapes are supported

The configured grid from `public/data/` is loaded automatically on startup; if it is missing, a procedurally generated sample grid is used as a fallback.

### How the Simulation Works

- Particles spawn continuously at the topmost layer of the grid
- Each tick, a particle tries to move **down** first (gravity); if blocked or the permeability roll fails, it tries to move **laterally** (±X, ±Y), with the lateral target chosen by permeability-weighted random pick
- Permeability determines the probability of entering a voxel: 0.0 = blocked, 1.0 = always enters
- Particles that fail to move for 50 consecutive ticks are marked as **pooling** (rendered in magenta); flowing particles are blue
- A small number of voxels in the bottom layer are marked as **exit voxels** (rendered in orange); particles that enter an exit voxel leave the mesh and are removed
- Wireframe colors indicate permeability: dark gray = low, near-white = high (see the colourbar below the legend on the left)
