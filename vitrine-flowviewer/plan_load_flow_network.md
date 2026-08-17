# Plan — Load and Display `flow_network_voxels.csv`

## Context

The project currently loads `public/data/damage_zone.csv`, a 4-column file (`x,y,z,permeability`). A new source file `public/data/flow_network_voxels.csv` (~42 k rows) supersedes it with an 8-column schema:

```
voxel ID, X, Y, Z, Saturated or Unsaturated, Outflow or NotOutflow, ID of the next downstream voxel, Velocity
1, 5480.0, -840.0, -1880.0, Unsaturated, NotOutflow, -1, 0.01
```

**Goal: just load this file and display the mesh statically. No flow simulation runs.** Per user decisions:
- `permeability` is renamed to `velocity` throughout the type system and its consumers (mechanical rename — no logic changes).
- Exits come from the `Outflow or NotOutflow` column (no more random exit assignment for loaded grids).
- Saturation state is preserved per voxel via a new `GridData.saturated` array and a `VoxelGrid.isSaturated(...)` accessor so the renderer can color voxels later. **The renderer itself is not changed in this task** — only the data path that feeds it.
- The downstream-voxel graph is captured into `GridData.downstream` but not consumed.
- Old 4-column `damage_zone.csv` format is dropped — `parseGridCSV` only handles the new schema.
- `main.ts` skips `SimulationEngine` and `ParticleRenderer` initialization, removes the tick block from the animation loop, and disables the Play/Pause/Reset controls. The animation loop just renders the scene.

Coordinates use 80-unit spacing; the existing axis-detection in `parseGridCSV` infers `voxelSize` from sorted-unique values, which carries over cleanly.

## Changes

### 1. [src/types.ts](src/types.ts) — rename + new fields

```ts
export interface GridData {
  dimensions: { nx: number; ny: number; nz: number };
  voxelSize: number;
  velocity: number[];        // was: permeability
  exists: boolean[];
  exits: boolean[];
  saturated: boolean[];      // NEW — true if 'Saturated', false if 'Unsaturated' or absent
  downstream: number[];      // NEW — linear index of next downstream voxel, or -1
}

export interface Neighbor {
  coord: VoxelCoord;
  velocity: number;          // was: permeability
  direction: 'down' | 'lateral' | 'up';
}
```

### 2. [src/grid/gridLoader.ts](src/grid/gridLoader.ts) — rewrite `parseGridCSV`

Replace the body of [parseGridCSV](src/grid/gridLoader.ts#L62) with a two-pass parser.

**Pass 1 — read rows.** The existing `isNaN(parts[0])` guard already skips the header row (`voxel ID,…`). For each data row:
```ts
interface Row {
  id: number;          // col 0
  x: number;           // col 1
  y: number;           // col 2
  z: number;           // col 3
  saturated: boolean;  // col 4 === 'Saturated'
  outflow: boolean;    // col 5 === 'Outflow'
  nextId: number;      // col 6  (-1 if none or missing)
  velocity: number;    // col 7  (clamp to >= 0)
}
```

**Pass 2 — build the grid.** Reuse the existing axis-detection (unique-sorted X/Y/Z → `nx,ny,nz,voxelSize`), then:
- Build a `voxelId → linearIndex` map from pass 1.
- Allocate `velocity`, `exists`, `exits`, `saturated`, `downstream` arrays sized `nx*ny*nz`.
- For each row: set `exists[idx]=true`, `velocity[idx]=row.velocity`, `exits[idx]=row.outflow`, `saturated[idx]=row.saturated`, and `downstream[idx] = idMap.get(row.nextId) ?? -1`.
- **Do NOT call `assignExits`** — exits come from the column.

Return `{ dimensions, voxelSize, velocity, exists, exits, saturated, downstream }`.

**Update `generateSampleGrid`** (the fallback path) to:
- Rename its `permeability` local → `velocity`.
- Add `saturated: new Array(total).fill(false)` and `downstream: new Array(total).fill(-1)` to its return value so the new type checks.

`assignExits` itself stays untouched (still used by `generateSampleGrid`).

### 3. [src/grid/VoxelGrid.ts](src/grid/VoxelGrid.ts) — rename + new saturation/downstream accessors

- Rename private field `permeability` → `velocity` (still `Float32Array`).
- Rename `getPermeability(x,y,z)` → `getVelocity(x,y,z)`.
- In `getNeighbors`, replace the `permeability:` neighbor field with `velocity:`.
- Update the constructor length-check from `data.permeability.length` to `data.velocity.length`.
- Add a `saturatedMask: Uint8Array` populated from `data.saturated` (same pattern as `existsMask`/`exitMask`) and a public `isSaturated(x,y,z): boolean` accessor.
- Store `downstream` as `Int32Array` (linear indices fit) and add `getDownstream(x,y,z): number` returning `-1` when out of bounds or no downstream.

No simulation behavior changes here — these are storage/accessor additions only.

### 4. [src/simulation/SimulationEngine.ts](src/simulation/SimulationEngine.ts) and [src/rendering/VoxelRenderer.ts](src/rendering/VoxelRenderer.ts) — mechanical rename only

Mechanically replace `getPermeability` → `getVelocity` and any `permeability:` neighbor property reads → `velocity:` so the project type-checks. **No logic changes.** `SimulationEngine` is no longer exercised at runtime (per `main.ts` changes below); the renames just keep it compiling.

### 5. [src/main.ts](src/main.ts) — switch URL, disable simulation startup

- Change the default URL:
  ```ts
  const defaultGridUrl = `${import.meta.env.BASE_URL}data/flow_network_voxels.csv`;
  ```
- In `loadGrid`, **skip** creating `SimulationEngine` and `ParticleRenderer` and skip `resetPositions`. Keep `VoxelGrid` construction, `VoxelRenderer` construction, scene/camera/axes setup, and the tick counter reset (display "Tick: 0").
- Disable the controls so the UI is honest:
  ```ts
  btnPlayPause.disabled = true;
  btnReset.disabled = true;
  speedSlider.disabled = true;
  ```
- In `animate()`, remove the `if (!paused && engine && particleRenderer) { … }` block — only `scene.render()` runs each frame.
- Remove the `damage_zone.csv` URL. The `.catch(...)` fallback can still call `generateSampleGrid(...)` for the no-network case; it will render statically just like the loaded grid.

## Critical files

- [src/types.ts](src/types.ts) — field rename + new `saturated`/`downstream` fields
- [src/grid/gridLoader.ts](src/grid/gridLoader.ts) — main change site
- [src/grid/VoxelGrid.ts](src/grid/VoxelGrid.ts) — rename + new accessors
- [src/simulation/SimulationEngine.ts](src/simulation/SimulationEngine.ts) — mechanical rename only
- [src/rendering/VoxelRenderer.ts](src/rendering/VoxelRenderer.ts) — mechanical rename only
- [src/main.ts](src/main.ts) — switch URL, skip simulation, disable controls

## Verification

1. **Type check**: `npx tsc --noEmit` passes — confirms every `permeability` site was renamed.
2. **Truncated file**: temporarily point `defaultGridUrl` at `flow_network_voxels_truncated.csv` (4 rows). The app renders exactly 4 voxels at the expected world positions; no particles appear.
3. **Full file**: point at `flow_network_voxels.csv` (~42 k rows). The mesh renders; orbit/zoom works; **nothing animates**; Play/Pause/Reset are visibly disabled.
4. **Outflow honored**: spot-check that voxels with `Outflow` in the CSV are flagged as exits via `grid.isExit(...)` (e.g. add a quick `console.log` of exit count and compare to `grep -c ',Outflow,' flow_network_voxels.csv`).
5. **Saturation populated**: spot-check `grid.isSaturated(x,y,z)` matches the CSV for a few rows.
6. **Downstream populated**: spot-check `grid.getDownstream(x,y,z)` returns valid linear indices, with `-1` where the CSV had `-1`.
7. **Visual sanity**: grid extent matches the source ranges (X ≈ -7720…8360, Y ≈ -8840…7960, Z ≈ -1880…2920 at 80-unit spacing).
