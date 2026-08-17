import * as THREE from 'three';
import { VoxelGrid } from '../grid/VoxelGrid';

/** Seconds it takes for a ball to travel from one cell to the next downstream cell. */
const STEP_DURATION = 0.25;
const OUTLET_LABEL_COLOR = '#ff0000';

/**
 * Max cells a ball may travel before it is retired. The data contains cyclic
 * downstream pointers, so without this a ball entering a loop would never reach
 * a dead-end and would live (and accumulate) forever. Set comfortably above the
 * longest acyclic path (~210 cells) so legitimate paths still complete naturally.
 */
const MAX_BALL_STEPS = 256;

interface Ball {
  /** Linear index of the cell the ball is currently leaving (also the cell it occupies). */
  fromIdx: number;
  /** Linear index of the cell the ball is heading to. */
  toIdx: number;
  /** Animation progress in [0,1] from fromIdx to toIdx. */
  t: number;
  /** Cells travelled so far; the ball is retired once this reaches MAX_BALL_STEPS. */
  steps: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
}

interface OutletCounter {
  count: number;
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

/**
 * Renders a continuous stream of water balls flowing through the network.
 * Each inlet voxel spawns a new ball whenever its cell is unoccupied; balls
 * walk one cell per STEP_DURATION seconds along `getDownstreamFromIndex` and
 * are removed when they reach an outlet voxel or a dead-end (downstream == -1).
 *
 * `balls` is a compact list of currently-active balls — its length is the
 * InstancedMesh's draw count. Deactivation uses swap-and-pop to keep it dense,
 * so per-frame work scales with the number of live balls, not the grid volume.
 */
export class InletFlowRenderer {
  private grid: VoxelGrid;
  private group: THREE.Group;
  private mesh: THREE.InstancedMesh | undefined;
  private balls: Ball[] = [];
  private capacity = 0;
  private occupancy: Uint8Array;
  private inletIndices: number[] = [];
  private outletCounters = new Map<number, OutletCounter>();
  private tmpMatrix = new THREE.Matrix4();
  private tmpPos = new THREE.Vector3();

  constructor(grid: VoxelGrid) {
    this.grid = grid;
    this.group = new THREE.Group();
    this.occupancy = new Uint8Array(grid.nx * grid.ny * grid.nz);

    for (let z = 0; z < grid.nz; z++) {
      for (let y = 0; y < grid.ny; y++) {
        for (let x = 0; x < grid.nx; x++) {
          if (grid.isInlet(x, y, z)) {
            this.inletIndices.push(x + y * grid.nx + z * grid.nx * grid.ny);
          }
          if (grid.isExit(x, y, z)) {
            const idx = x + y * grid.nx + z * grid.nx * grid.ny;
            this.addOutletCounter(idx, grid.toWorldPosition(x, y, z));
          }
        }
      }
    }

    if (this.inletIndices.length === 0) return;

    // Spawn ceiling. Not `existingCount`: flow paths merge and the data contains
    // cycles (balls in a cycle never reach a dead-end, so they are never removed
    // and accumulate), so the live-ball count can far exceed the voxel count.
    // Match the grid volume so the stream stays continuous; draw/upload cost is
    // kept proportional to live balls via `mesh.count` + `addUpdateRange`.
    this.capacity = grid.nx * grid.ny * grid.nz;

    const sphereGeo = new THREE.SphereGeometry(grid.voxelSize * 0.25, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    this.mesh = new THREE.InstancedMesh(sphereGeo, sphereMat, this.capacity);
    this.mesh.count = 0;
    this.group.add(this.mesh);

    this.spawnAtEmptyInlets();
    this.writeMatrices();
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.dispose();
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = undefined;
    }
    for (const counter of this.outletCounters.values()) {
      counter.texture.dispose();
      counter.sprite.material.dispose();
    }
    this.outletCounters.clear();
    this.group.clear();
  }

  /** Advance ball animations by `dt` seconds, then spawn at any empty inlets. */
  update(dt: number): void {
    if (!this.mesh) return;

    // Iterate in reverse so swap-and-pop removals don't skip elements.
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.t += dt / STEP_DURATION;
      while (ball.t >= 1) {
        // Arrive at toIdx. Clear occupancy at old fromIdx.
        this.occupancy[ball.fromIdx] = 0;
        ball.fromIdx = ball.toIdx;
        ball.fromPos.copy(ball.toPos);
        ball.t -= 1;

        ball.steps++;
        this.countOutletPass(ball.fromIdx);
        if (this.grid.isExitIndex(ball.fromIdx)) {
          // Outlet voxels remove balls immediately, even if the CSV has a
          // downstream pointer beyond the outlet.
          this.removeBallAt(i);
          break;
        }

        const next = this.grid.getDownstreamFromIndex(ball.fromIdx);
        if (next < 0 || ball.steps >= MAX_BALL_STEPS) {
          // Dead-end, or lifetime cap reached (cyclic paths never hit a dead-end).
          // Remove the ball; its current cell is left unoccupied.
          this.removeBallAt(i);
          break;
        }
        this.occupancy[ball.fromIdx] = 1;
        ball.toIdx = next;
        ball.toPos.copy(this.worldPosForIndex(next));
      }
    }

    this.spawnAtEmptyInlets();
    this.writeMatrices();
  }

  /** Restart the flow animation and reset all outlet pass counters. */
  reset(): void {
    this.balls = [];
    this.occupancy.fill(0);

    for (const counter of this.outletCounters.values()) {
      counter.count = 0;
      this.drawOutletCounter(counter);
    }

    this.spawnAtEmptyInlets();
    this.writeMatrices();
  }

  private removeBallAt(i: number): void {
    const last = this.balls.length - 1;
    if (i !== last) {
      this.balls[i] = this.balls[last];
    }
    this.balls.pop();
  }

  private addOutletCounter(idx: number, pos: THREE.Vector3): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos).add(new THREE.Vector3(0, this.grid.voxelSize * 1.2, 0));
    sprite.scale.set(this.grid.voxelSize * 3, this.grid.voxelSize * 1.5, 1);
    sprite.renderOrder = 10;

    const counter = { count: 0, sprite, texture, canvas, context };
    this.outletCounters.set(idx, counter);
    this.group.add(sprite);
    this.drawOutletCounter(counter);
  }

  private countOutletPass(idx: number): void {
    if (!this.grid.isExitIndex(idx)) return;
    const counter = this.outletCounters.get(idx);
    if (!counter) return;
    counter.count++;
    this.drawOutletCounter(counter);
  }

  private drawOutletCounter(counter: OutletCounter): void {
    const { canvas, context } = counter;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 56px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 8;
    context.strokeStyle = '#ffffff';
    context.fillStyle = OUTLET_LABEL_COLOR;
    const text = String(counter.count);
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    counter.texture.needsUpdate = true;
  }

  private spawnAtEmptyInlets(): void {
    for (const idx of this.inletIndices) {
      if (this.occupancy[idx] !== 0) continue;
      if (this.balls.length >= this.capacity) return;
      const fromPos = this.worldPosForIndex(idx);
      const next = this.grid.getDownstreamFromIndex(idx);
      const ball: Ball = {
        fromIdx: idx,
        toIdx: next >= 0 ? next : idx,
        t: 0,
        steps: 0,
        fromPos,
        toPos: next >= 0 ? this.worldPosForIndex(next) : fromPos.clone(),
      };
      this.balls.push(ball);
      this.occupancy[idx] = 1;
    }
  }

  private worldPosForIndex(idx: number): THREE.Vector3 {
    const { x, y, z } = this.grid.coordFromIndex(idx);
    return this.grid.toWorldPosition(x, y, z);
  }

  private writeMatrices(): void {
    if (!this.mesh) return;
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      this.tmpPos.lerpVectors(b.fromPos, b.toPos, b.t);
      this.tmpMatrix.makeTranslation(this.tmpPos.x, this.tmpPos.y, this.tmpPos.z);
      this.mesh.setMatrixAt(i, this.tmpMatrix);
    }
    // Draw and upload only the live balls, not the full grid-volume buffer.
    this.mesh.count = this.balls.length;
    const attr = this.mesh.instanceMatrix;
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, this.balls.length * 16);
    attr.needsUpdate = true;
  }
}
