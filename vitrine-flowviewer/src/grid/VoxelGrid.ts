import * as THREE from 'three';
import { GridData, Neighbor } from '../types';

export class VoxelGrid {
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly voxelSize: number;
  private velocity: Float32Array;
  private existsMask: Uint8Array;
  private exitMask: Uint8Array;
  private saturatedMask: Uint8Array;
  private inletMask: Uint8Array;
  private downstreamArr: Int32Array;

  constructor(data: GridData) {
    this.nx = data.dimensions.nx;
    this.ny = data.dimensions.ny;
    this.nz = data.dimensions.nz;
    this.voxelSize = data.voxelSize;

    const expected = this.nx * this.ny * this.nz;
    if (data.velocity.length !== expected) {
      throw new Error(`velocity array length ${data.velocity.length} does not match dimensions ${expected}`);
    }
    this.velocity = new Float32Array(data.velocity);
    this.existsMask = new Uint8Array(expected);
    this.exitMask = new Uint8Array(expected);
    this.saturatedMask = new Uint8Array(expected);
    this.inletMask = new Uint8Array(expected);
    this.downstreamArr = new Int32Array(expected);
    for (let i = 0; i < expected; i++) {
      this.existsMask[i] = data.exists[i] ? 1 : 0;
      this.exitMask[i] = data.exits[i] ? 1 : 0;
      this.saturatedMask[i] = data.saturated[i] ? 1 : 0;
      this.inletMask[i] = data.inlets[i] ? 1 : 0;
      this.downstreamArr[i] = data.downstream[i];
    }
  }

  private index(x: number, y: number, z: number): number {
    return x + y * this.nx + z * this.nx * this.ny;
  }

  /** Inverse of index(): convert linear index back to (x, y, z). */
  coordFromIndex(idx: number): { x: number; y: number; z: number } {
    const z = Math.floor(idx / (this.nx * this.ny));
    const rem = idx - z * this.nx * this.ny;
    const y = Math.floor(rem / this.nx);
    const x = rem - y * this.nx;
    return { x, y, z };
  }

  isInBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.nx && y >= 0 && y < this.ny && z >= 0 && z < this.nz;
  }

  /** Returns true if the voxel is within bounds AND part of the mesh. */
  exists(x: number, y: number, z: number): boolean {
    if (!this.isInBounds(x, y, z)) return false;
    return this.existsMask[this.index(x, y, z)] === 1;
  }

  isExit(x: number, y: number, z: number): boolean {
    if (!this.isInBounds(x, y, z)) return false;
    return this.exitMask[this.index(x, y, z)] === 1;
  }

  isSaturated(x: number, y: number, z: number): boolean {
    if (!this.isInBounds(x, y, z)) return false;
    return this.saturatedMask[this.index(x, y, z)] === 1;
  }

  isInlet(x: number, y: number, z: number): boolean {
    if (!this.isInBounds(x, y, z)) return false;
    return this.inletMask[this.index(x, y, z)] === 1;
  }

  getVelocity(x: number, y: number, z: number): number {
    return this.velocity[this.index(x, y, z)];
  }

  /**
   * Velocity at a linear index. Unlike getVelocity() this bounds-checks, because
   * callers divide by the result: an out-of-range read on a Float32Array yields
   * `undefined`, which would silently propagate as NaN. Returning 0 funnels the
   * bad case into the same guard as a genuine zero-velocity cell.
   */
  getVelocityFromIndex(idx: number): number {
    if (idx < 0 || idx >= this.velocity.length) return 0;
    return this.velocity[idx];
  }

  getDownstream(x: number, y: number, z: number): number {
    if (!this.isInBounds(x, y, z)) return -1;
    return this.downstreamArr[this.index(x, y, z)];
  }

  getDownstreamFromIndex(idx: number): number {
    return this.downstreamArr[idx];
  }

  isExitIndex(idx: number): boolean {
    return this.exitMask[idx] === 1;
  }

  /** Map grid coords to Three.js world position. Grid Z (gravity axis) → Three.js Y. Grid X and Y are swapped. */
  toWorldPosition(x: number, y: number, z: number): THREE.Vector3 {
    const s = this.voxelSize;
    return new THREE.Vector3(y * s, z * s, x * s);
  }

  /** Center of the grid in world coordinates. */
  getCenter(): THREE.Vector3 {
    const s = this.voxelSize;
    return new THREE.Vector3(
      (this.ny - 1) * s * 0.5,
      (this.nz - 1) * s * 0.5,
      (this.nx - 1) * s * 0.5,
    );
  }

  /** Approximate radius for camera positioning. */
  getRadius(): number {
    const s = this.voxelSize;
    return Math.max(this.nx * s, this.ny * s, this.nz * s) * 0.5;
  }

  getNeighbors(x: number, y: number, z: number): Neighbor[] {
    const neighbors: Neighbor[] = [];
    const offsets: { dx: number; dy: number; dz: number; dir: Neighbor['direction'] }[] = [
      { dx: 0, dy: 0, dz: -1, dir: 'down' },
      { dx: 1, dy: 0, dz: 0, dir: 'lateral' },
      { dx: -1, dy: 0, dz: 0, dir: 'lateral' },
      { dx: 0, dy: 1, dz: 0, dir: 'lateral' },
      { dx: 0, dy: -1, dz: 0, dir: 'lateral' },
      { dx: 0, dy: 0, dz: 1, dir: 'up' },
    ];
    for (const { dx, dy, dz, dir } of offsets) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (this.exists(nx, ny, nz)) {
        neighbors.push({ coord: { x: nx, y: ny, z: nz }, velocity: this.getVelocity(nx, ny, nz), direction: dir });
      }
    }
    return neighbors;
  }
}
