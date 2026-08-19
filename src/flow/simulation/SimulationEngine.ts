import { VoxelGrid } from '../grid/VoxelGrid';
import { ParticleState } from '../types';
import { createParticle, resetParticleIds } from './Particle';

const SETTLE_THRESHOLD = 50;

export class SimulationEngine {
  private grid: VoxelGrid;
  private particles: ParticleState[] = [];
  private occupancy: Uint8Array;
  private spawnCells: { x: number; y: number; z: number }[] = [];
  tickCount = 0;

  constructor(grid: VoxelGrid) {
    this.grid = grid;
    this.occupancy = new Uint8Array(grid.nx * grid.ny * grid.nz);
    this.findSpawnCells();
  }

  /** Identify existing voxels in the topmost Z layer — used for continuous spawning. */
  private findSpawnCells(): void {
    this.spawnCells = [];
    for (let z = this.grid.nz - 1; z >= 0; z--) {
      for (let y = 0; y < this.grid.ny; y++) {
        for (let x = 0; x < this.grid.nx; x++) {
          if (this.grid.exists(x, y, z)) {
            this.spawnCells.push({ x, y, z });
          }
        }
      }
      if (this.spawnCells.length > 0) break;
    }
  }

  private occIndex(x: number, y: number, z: number): number {
    return x + y * this.grid.nx + z * this.grid.nx * this.grid.ny;
  }

  private isOccupied(x: number, y: number, z: number): boolean {
    return this.occupancy[this.occIndex(x, y, z)] === 1;
  }

  private setOccupied(x: number, y: number, z: number, val: boolean): void {
    this.occupancy[this.occIndex(x, y, z)] = val ? 1 : 0;
  }

  /** Returns true if the voxel exists, is not occupied, and the velocity roll passes. */
  private canEnter(x: number, y: number, z: number): boolean {
    if (!this.grid.exists(x, y, z)) return false;
    if (this.isOccupied(x, y, z)) return false;
    const velocity = this.grid.getVelocity(x, y, z);
    return Math.random() < velocity;
  }

  /** Place one particle in each existing voxel at the topmost Z layer that has existing voxels. */
  initialize(): void {
    resetParticleIds();
    this.particles = [];
    this.occupancy.fill(0);
    this.tickCount = 0;

    for (let z = this.grid.nz - 1; z >= 0; z--) {
      let found = false;
      for (let y = 0; y < this.grid.ny; y++) {
        for (let x = 0; x < this.grid.nx; x++) {
          if (this.grid.exists(x, y, z)) {
            const p = createParticle({ x, y, z });
            this.particles.push(p);
            this.setOccupied(x, y, z, true);
            found = true;
          }
        }
      }
      if (found) break;
    }
  }

  getParticles(): ReadonlyArray<ParticleState> {
    return this.particles;
  }

  tick(): void {
    // Process bottom-up so lower particles move first
    const sorted = [...this.particles].sort((a, b) => a.position.z - b.position.z);
    const toRemove = new Set<number>();

    for (const p of sorted) {
      if (p.settled) continue;

      const { x, y, z } = p.position;
      let moved = false;

      // 1. Try down — gravity pulls particles downward
      if (this.canEnter(x, y, z - 1)) {
        this.moveTo(p, x, y, z - 1);
        moved = true;
      }

      // 2. If blocked below, try lateral (±X, ±Y)
      if (!moved) {
        const laterals = this.getAvailableLaterals(x, y, z);
        if (laterals.length > 0) {
          const target = this.weightedRandomPick(laterals);
          if (target) {
            this.moveTo(p, target.x, target.y, target.z);
            moved = true;
          }
        }
      }

      // Check if particle entered an exit voxel — mark for removal
      if (moved && this.grid.isExit(p.position.x, p.position.y, p.position.z)) {
        this.setOccupied(p.position.x, p.position.y, p.position.z, false);
        toRemove.add(p.id);
        continue;
      }

      if (moved) {
        p.stationaryTicks = 0;
      } else {
        p.stationaryTicks++;
        if (p.stationaryTicks >= SETTLE_THRESHOLD) {
          p.settled = true;
        }
      }
    }

    // Remove exited particles
    if (toRemove.size > 0) {
      this.particles = this.particles.filter(p => !toRemove.has(p.id));
    }
    // Spawn new particles at unoccupied top-layer cells
    for (const cell of this.spawnCells) {
      if (!this.isOccupied(cell.x, cell.y, cell.z)) {
        const p = createParticle({ x: cell.x, y: cell.y, z: cell.z });
        this.particles.push(p);
        this.setOccupied(cell.x, cell.y, cell.z, true);
      }
    }

    this.tickCount++;
  }

  private moveTo(p: ParticleState, nx: number, ny: number, nz: number): void {
    this.setOccupied(p.position.x, p.position.y, p.position.z, false);
    p.position.x = nx;
    p.position.y = ny;
    p.position.z = nz;
    this.setOccupied(nx, ny, nz, true);
  }

  /** Collect lateral neighbors that exist, are unoccupied, and pass the velocity roll. */
  private getAvailableLaterals(x: number, y: number, z: number): { x: number; y: number; z: number; velocity: number }[] {
    const results: { x: number; y: number; z: number; velocity: number }[] = [];
    const offsets = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    for (const { dx, dy } of offsets) {
      const lx = x + dx, ly = y + dy;
      if (this.grid.exists(lx, ly, z) && !this.isOccupied(lx, ly, z)) {
        results.push({ x: lx, y: ly, z, velocity: this.grid.getVelocity(lx, ly, z) });
      }
    }
    return results;
  }

  private weightedRandomPick(options: { x: number; y: number; z: number; velocity: number }[]): { x: number; y: number; z: number } | null {
    const totalWeight = options.reduce((sum, o) => sum + o.velocity, 0);
    if (totalWeight === 0) return null;
    let r = Math.random() * totalWeight;
    for (const o of options) {
      r -= o.velocity;
      if (r <= 0) return o;
    }
    return options[options.length - 1];
  }
}
