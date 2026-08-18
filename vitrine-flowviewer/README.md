# FracSYS Water Simulator

A browser-based 3D simulation of water particle flow through a porous voxel grid. Built with TypeScript and Three.js.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

### Install and Run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173/`).

### Build for Production

```bash
npm run build
npm run preview
```

### Run with Docker

```bash
docker compose up --build
```

Open `http://localhost:8080/`. The image is a two-stage build: Node compiles the
bundle, nginx serves the static output (no Node in the runtime image).

For a hot-reloading dev server in a container on `http://localhost:5173/`:

```bash
docker compose up dev
```

Without compose:

```bash
docker build -t fracsys-flowviewer .
docker run --rm -p 8080:80 fracsys-flowviewer
```

#### Build arguments

Vite inlines configuration at build time, so these are `--build-arg` values, not
runtime environment variables — changing one requires rebuilding the image.

| Arg | Default in image | Purpose |
| --- | --- | --- |
| `DEPLOY_BASE` | `/` | Public base path. The repo default is `/preview/`; the container serves at the web root instead. Set it to match your path when hosting under a sub-path. |
| `VITE_DEFAULT_GRID_FILENAME` | `flow_network_voxels.csv` | Grid CSV loaded on startup, resolved relative to `public/data/`. |

```bash
docker build --build-arg DEPLOY_BASE=/preview/ -t fracsys-flowviewer .
```

#### Grid data

`public/data/*.csv` is git-ignored, so the CSV is copied from your working tree
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
- **Reset** — restart particles at the top of the grid
- **Speed slider** — adjust simulation speed (0.1 to 5 ticks per frame, in 0.5 steps)
- **Load CSV** — load a custom voxel grid from a CSV file

### Loading a Custom Grid

Click **Load CSV** and select a `.csv` file. The expected format is one voxel per row with center coordinates and permeability:

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

A default grid (`public/data/damage_zone.csv`) is loaded automatically on startup; if it is missing, a procedurally generated sample grid is used as a fallback.

### How the Simulation Works

- Particles spawn continuously at the topmost layer of the grid
- Each tick, a particle tries to move **down** first (gravity); if blocked or the permeability roll fails, it tries to move **laterally** (±X, ±Y), with the lateral target chosen by permeability-weighted random pick
- Permeability determines the probability of entering a voxel: 0.0 = blocked, 1.0 = always enters
- Particles that fail to move for 50 consecutive ticks are marked as **pooling** (rendered in magenta); flowing particles are blue
- A small number of voxels in the bottom layer are marked as **exit voxels** (rendered in orange); particles that enter an exit voxel leave the mesh and are removed
- Wireframe colors indicate permeability: dark gray = low, near-white = high (see the colourbar below the legend on the left)
