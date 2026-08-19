import Papa from 'papaparse';
import { GridData } from '../types';

/** Mark 10% of existing voxels in the lowest Z layer as exits. */
function assignExits(nx: number, ny: number, nz: number, exists: boolean[]): boolean[] {
  const exits = new Array<boolean>(nx * ny * nz).fill(false);

  // Find the lowest Z layer that has existing voxels
  for (let z = 0; z < nz; z++) {
    const bottomCells: number[] = [];
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = x + y * nx + z * nx * ny;
        if (exists[idx]) bottomCells.push(idx);
      }
    }
    if (bottomCells.length > 0) {
      // Shuffle the bottom cells
      for (let i = bottomCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bottomCells[i], bottomCells[j]] = [bottomCells[j], bottomCells[i]];
      }
      // pick 10% of the cells to be output
      // const count = Math.max(1, Math.round(bottomCells.length * 0.1));
      // choose 5 cells
      const count = 5;
      for (let i = 0; i < count; i++) {
        exits[bottomCells[i]] = true;
      }
      break;
    }
  }
  return exits;
}

export function generateSampleGrid(nx: number, ny: number, nz: number): GridData {
  const total = nx * ny * nz;
  const velocity: number[] = new Array(total);
  const exists: boolean[] = new Array(total).fill(true);
  for (let z = 0; z < nz; z++) {
    const t = z / (nz - 1);
    const base = 0.1 + t * 0.9;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = x + y * nx + z * nx * ny;
        const noise = (Math.random() - 0.5) * 0.1;
        velocity[idx] = Math.min(1.0, Math.max(0.1, Math.round((base + noise) * 100) / 100));
      }
    }
  }
  const exits = assignExits(nx, ny, nz, exists);
  const saturated = new Array<boolean>(total).fill(false);
  const inlets = new Array<boolean>(total).fill(false);
  const downstream = new Array<number>(total).fill(-1);
  return { dimensions: { nx, ny, nz }, voxelSize: 1.0, velocity, exists, exits, saturated, inlets, downstream };
}

interface CsvRow {
  id: number;
  x: number;
  y: number;
  z: number;
  saturated: boolean;
  inlet: boolean;
  outflow: boolean;
  nextId: number;
  velocity: number;
}

interface RawRow {
  'voxel ID': number;
  'X': number;
  'Y': number;
  'Z': number;
  'Saturated or Unsaturated': string;
  'Recharge'?: string;
  'Outflow or NotOutflow': string;
  'ID of the next downstream voxel': number;
  'Velocity': number;
}

/**
 * Parse the flow-network CSV:
 *   voxel ID, X, Y, Z, Saturated or Unsaturated, Outflow or NotOutflow, ID of the next downstream voxel, Velocity
 */
export function parseGridCSV(csvText: string): GridData {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  const rows: CsvRow[] = parsed.data.map(r => ({
    id: r['voxel ID'],
    x: r['X'],
    y: r['Y'],
    z: r['Z'],
    saturated: r['Saturated or Unsaturated'] === 'Saturated',
    inlet: (r['Recharge'] ?? '').toString().trim() === 'Inlet',
    outflow: r['Outflow or NotOutflow'] === 'Outflow',
    nextId: r['ID of the next downstream voxel'] ?? -1,
    velocity: Math.max(0, r['Velocity'] ?? 0),
  }));

  if (rows.length === 0) {
    throw new Error('CSV contains no valid data rows');
  }

  const uniqueAxis = (vals: number[]) => [...new Set(vals)].sort((a, b) => a - b);
  const xs = uniqueAxis(rows.map(r => r.x));
  const ys = uniqueAxis(rows.map(r => r.y));
  const zs = uniqueAxis(rows.map(r => r.z));

  const nx = xs.length;
  const ny = ys.length;
  const nz = zs.length;

  let voxelSize = 1.0;
  for (const sorted of [xs, ys, zs]) {
    if (sorted.length > 1) {
      voxelSize = sorted[1] - sorted[0];
      break;
    }
  }

  const xIndex = new Map(xs.map((v, i) => [v, i]));
  const yIndex = new Map(ys.map((v, i) => [v, i]));
  const zIndex = new Map(zs.map((v, i) => [v, i]));

  const total = nx * ny * nz;
  const velocity = new Array<number>(total).fill(0);
  const exists = new Array<boolean>(total).fill(false);
  const exits = new Array<boolean>(total).fill(false);
  const saturated = new Array<boolean>(total).fill(false);
  const inlets = new Array<boolean>(total).fill(false);
  const downstream = new Array<number>(total).fill(-1);

  const idToLinear = new Map<number, number>();
  for (const r of rows) {
    const ix = xIndex.get(r.x)!;
    const iy = yIndex.get(r.y)!;
    const iz = zIndex.get(r.z)!;
    const idx = ix + iy * nx + iz * nx * ny;
    idToLinear.set(r.id, idx);
    exists[idx] = true;
    velocity[idx] = r.velocity;
    exits[idx] = r.outflow;
    saturated[idx] = r.saturated;
    inlets[idx] = r.inlet;
  }

  for (const r of rows) {
    if (r.nextId === -1) continue;
    const fromIdx = idToLinear.get(r.id)!;
    const toIdx = idToLinear.get(r.nextId);
    downstream[fromIdx] = toIdx ?? -1;
  }

  return { dimensions: { nx, ny, nz }, voxelSize, velocity, exists, exits, saturated, inlets, downstream };
}
