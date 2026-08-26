import * as THREE from 'three';
import { VoxelGrid } from '../grid/VoxelGrid';

/**
 * Baseline animation seconds a hop takes at the *reference* velocity (the median
 * over the inlet-reachable voxels), before the uniform slowdown is applied.
 */
const REFERENCE_STEP_DURATION = 1.0;

/**
 * Fallback duration for invalid or zero-velocity links. Valid flow velocities
 * are never capped or clamped.
 */
const INVALID_STEP_DURATION = 5.0;

/** Seconds between spawns at each inlet, independent of local velocity. */
const SPAWN_INTERVAL = 0.25;

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
  /** Seconds for the current fromIdx → toIdx hop. Recomputed on every cell change, never per-frame. */
  stepDuration: number;
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
 * Each inlet voxel spawns a new ball every SPAWN_INTERVAL seconds; balls walk
 * one cell at a time along `getDownstreamFromIndex`, each hop taking a time
 * derived from the two cells' velocities (see `stepDurationFor`), and are
 * removed when they reach an outlet voxel or a dead-end (downstream == -1).
 *
 * Spawn rate is deliberately uniform across inlets while travel speed varies,
 * so particle density reads as inversely proportional to speed (the continuity
 * relation) rather than inlet flux varying with local velocity.
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
  /**
   * Divides physical crossing times to get watchable animation times. Derived
   * from the data at construction, then reduced by one global slowdown factor so
   * every velocity retains the same relative speed. Stays 1 when there are no
   * inlets (the constructor returns early and update() bails on `!mesh`).
   *
   * Keep particle timing linear rather than applying a logarithmic velocity
   * transform. A log scale would make a wide velocity range easier to watch, but
   * it would destroy the physical ratios in the CSV (a 10x velocity difference
   * would no longer produce a 10x particle-speed difference). A large timeScale
   * is expected and numerically safe: it uniformly compresses physical time into
   * animation time without changing those ratios. Log scaling remains suitable
   * for colour visualization, but not for motion in this simulation.
   *
   * Example from the shipped CSV: voxelSize = 80 and the median velocity on
   * inlet-reachable paths is about 6.515e-9. At the 1.0-second reference duration,
   * the baseline scale is (80 / 6.515e-9) / 1.0 = 1.228e10. The data-relative
   * uniform slowdown factor is about 0.0919, giving a final timeScale of 1.128e9.
   * Thus one animation second represents roughly 1.128e9 physical seconds, or
   * 35.8 years, while every ratio between valid particle velocities is preserved.
   */
  private timeScale = 1;
  /** Seconds accumulated since each inlet last spawned; parallel to inletIndices. */
  private spawnAccum: Float32Array;
  private inletIndices: number[] = [];
  private outletCounters = new Map<number, OutletCounter>();
  private tmpMatrix = new THREE.Matrix4();
  private tmpPos = new THREE.Vector3();

  constructor(grid: VoxelGrid) {
    this.grid = grid;
    this.group = new THREE.Group();

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

    // Assigned before the early return so the field is initialized on every path.
    this.spawnAccum = new Float32Array(this.inletIndices.length);

    if (this.inletIndices.length === 0) return;

    this.timeScale = this.computeTimeScale();
    this.timeScale *= this.computeUniformSlowdownFactor();
    console.log('Flow particle timeScale:', this.timeScale);

    // Spawn ceiling. Not `existingCount`: flow paths merge and the data contains
    // cycles (balls in a cycle never reach a dead-end, so they are never removed
    // and accumulate), so the live-ball count can far exceed the voxel count.
    // Match the grid volume so the stream stays continuous; draw/upload cost is
    // kept proportional to live balls via `mesh.count` + `addUpdateRange`.
    this.capacity = grid.nx * grid.ny * grid.nz;

    const sphereGeo = new THREE.SphereGeometry(grid.voxelSize * 0.25, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    this.mesh = new THREE.InstancedMesh(sphereGeo, sphereMat, this.capacity);
    // Instance transforms move every frame, while Three.js does not keep the
    // InstancedMesh bounds in sync automatically. Stale aggregate bounds can
    // therefore cull the whole stream when the camera is zoomed in, even when
    // individual balls are visible. The stream spans the grid and must always
    // be submitted; normal depth clipping still applies per ball.
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.group.add(this.mesh);

    // Seed a full interval so the stream starts immediately.
    this.spawnAccum.fill(SPAWN_INTERVAL);
    this.spawnAtInlets(0);
    this.writeMatrices();
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  /** Show or hide the moving balls without pausing their simulation. */
  setParticlesVisible(visible: boolean): void {
    if (this.mesh) this.mesh.visible = visible;
  }

  /** Show or hide the outlet particle-count labels without resetting their totals. */
  setParticleCounterVisible(visible: boolean): void {
    for (const counter of this.outletCounters.values()) {
      counter.sprite.visible = visible;
    }
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

  /** Advance ball animations by `dt` seconds, then spawn at any due inlets. */
  update(dt: number): void {
    if (!this.mesh) return;

    // Iterate in reverse so swap-and-pop removals don't skip elements.
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.t += dt / ball.stepDuration;
      while (ball.t >= 1) {
        // Arrive at toIdx.
        ball.fromIdx = ball.toIdx;
        ball.fromPos.copy(ball.toPos);

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
          this.removeBallAt(i);
          break;
        }
        ball.toIdx = next;
        ball.toPos.copy(this.worldPosForIndex(next));

        // Recompute inside the loop: one frame can cross several cells, each at
        // its own rate. Then rescale the carried-over progress, which is still
        // expressed in the previous cell's time units — carrying it unscaled
        // would pop the ball by up to half a voxel at a velocity boundary. Both
        // durations are guaranteed positive and finite, so the ratio is finite. The `while` condition
        // is re-tested afterwards and correctly so: entering a much faster cell
        // can legitimately push the rescaled remainder back over 1.
        const prevStepDuration = ball.stepDuration;
        ball.stepDuration = this.stepDurationFor(
          ball.fromIdx, next, ball.fromPos, ball.toPos,
        );
        ball.t = ((ball.t - 1) * prevStepDuration) / ball.stepDuration;
      }
    }

    this.spawnAtInlets(dt);
    this.writeMatrices();
  }

  /**
   * Seconds to cross the from→to segment: the ball spends half the gap inside
   * each cell at that cell's own velocity, so the physical time is
   * d/2/vFrom + d/2/vTo, converted to animation time by timeScale. There is no
   * per-particle speed cap: the same timeScale applies to every valid hop.
   *
   * Distance comes from the actual world positions rather than voxelSize:
   * `downstream` links are CSV-supplied and not guaranteed axis-adjacent (the
   * shipped file has 254 links spanning 2–10 cells, though none on the paths
   * reachable from its inlets).
   *
   * A cell with velocity <= 0 stalls at INVALID_STEP_DURATION rather than retiring
   * the ball: that makes a data glitch visible as a clot instead of silently
   * deleting water, and it is self-limiting because the finite fallback still lets
   * the ball advance and be retired by the usual dead-end / MAX_BALL_STEPS path.
   */
  private stepDurationFor(
    fromIdx: number,
    toIdx: number,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
  ): number {
    const vFrom = this.grid.getVelocityFromIndex(fromIdx);
    const vTo = this.grid.getVelocityFromIndex(toIdx);
    // Negated positive test rejects 0, negatives and NaN at once.
    if (!(vFrom > 0) || !(vTo > 0)) return INVALID_STEP_DURATION;
    const d = fromPos.distanceTo(toPos);
    const seconds = 0.5 * d * (1 / vFrom + 1 / vTo) / this.timeScale;
    // A NaN reaching instanceMatrix gives the mesh a NaN bounding sphere, which
    // frustum-culls the entire InstancedMesh — every ball vanishes at once.
    if (!(seconds > 0) || !Number.isFinite(seconds)) return INVALID_STEP_DURATION;
    return seconds;
  }

  /**
   * Linear indices of every voxel a ball can occupy: seeded at the inlets and
   * following `downstream`, stopping at outlet voxels (update() removes a ball on
   * arrival, so it never departs one) and tracking visited cells because the
   * data contains cyclic downstream pointers.
   */
  private collectReachable(): number[] {
    const total = this.grid.nx * this.grid.ny * this.grid.nz;
    const visited = new Uint8Array(total);
    const reachable: number[] = [];
    const stack: number[] = [];
    for (const idx of this.inletIndices) {
      if (visited[idx]) continue;
      visited[idx] = 1;
      reachable.push(idx);
      stack.push(idx);
    }
    while (stack.length > 0) {
      const idx = stack.pop()!;
      if (this.grid.isExitIndex(idx)) continue;
      const next = this.grid.getDownstreamFromIndex(idx);
      if (next < 0 || next >= total || visited[next]) continue;
      visited[next] = 1;
      reachable.push(next);
      stack.push(next);
    }
    return reachable;
  }

  /**
   * Physical transit through this data is ~19 years per voxel, so derive the
   * divisor from the data rather than a magic constant: the median velocity over
   * the reachable set crosses one voxel in REFERENCE_STEP_DURATION seconds.
   *
   * Calibrating over the reachable set rather than all saturated voxels matters:
   * the latter also contains zero-velocity cells and velocities orders of
   * magnitude lower that no ball ever visits, and the whole-grid median lands on
   * the 0.01 placeholder carried by unsaturated cells.
   */
  private computeTimeScale(): number {
    const samples: number[] = [];
    for (const idx of this.collectReachable()) {
      const v = this.grid.getVelocityFromIndex(idx);
      if (v > 0) samples.push(v);
    }
    // No usable velocities (e.g. the generated sample grid): degrade to a scale
    // where a v == 1 cell takes exactly REFERENCE_STEP_DURATION.
    if (samples.length === 0) return this.grid.voxelSize / REFERENCE_STEP_DURATION;
    samples.sort((a, b) => a - b);
    const mid = samples.length >> 1;
    const vRef = samples.length % 2 === 1
      ? samples[mid]
      : (samples[mid - 1] + samples[mid]) * 0.5;
    return (this.grid.voxelSize / vRef) / REFERENCE_STEP_DURATION;
  }

  /**
   * One global factor that makes the previously fastest reachable hop move at
   * the previous arithmetic-mean speed. Because it scales timeScale once rather
   * than altering individual hops, every relative velocity remains unchanged.
   */
  private computeUniformSlowdownFactor(): number {
    let speedSum = 0;
    let maxSpeed = 0;
    let sampleCount = 0;
    const total = this.grid.nx * this.grid.ny * this.grid.nz;

    for (const fromIdx of this.collectReachable()) {
      if (this.grid.isExitIndex(fromIdx)) continue;
      const toIdx = this.grid.getDownstreamFromIndex(fromIdx);
      if (toIdx < 0 || toIdx >= total) continue;

      const vFrom = this.grid.getVelocityFromIndex(fromIdx);
      const vTo = this.grid.getVelocityFromIndex(toIdx);
      if (!(vFrom > 0) || !(vTo > 0)) continue;

      const fromPos = this.worldPosForIndex(fromIdx);
      const toPos = this.worldPosForIndex(toIdx);
      const d = fromPos.distanceTo(toPos);
      if (!(d > 0)) continue;

      const duration = this.stepDurationFor(fromIdx, toIdx, fromPos, toPos);
      const speed = d / duration;
      if (!Number.isFinite(speed)) continue;
      speedSum += speed;
      maxSpeed = Math.max(maxSpeed, speed);
      sampleCount++;
    }

    if (sampleCount === 0 || !(maxSpeed > 0)) return 1;
    return (speedSum / sampleCount) / maxSpeed;
  }

  /** Restart the flow animation and reset all outlet pass counters. */
  reset(): void {
    this.balls = [];
    // timeScale is a grid-invariant calibration and is deliberately not recomputed.
    // Seed a full interval so the first ball appears immediately rather than
    // after a SPAWN_INTERVAL gap.
    this.spawnAccum.fill(SPAWN_INTERVAL);

    for (const counter of this.outletCounters.values()) {
      counter.count = 0;
      this.drawOutletCounter(counter);
    }

    this.spawnAtInlets(0);
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

  /**
   * Spawn on a fixed per-inlet clock, independent of local velocity. Uniform
   * spawn timing combined with velocity-driven travel means balls bunch up in
   * slow stretches and stretch apart in fast ones: spacing along a segment is
   * `stepDuration / SPAWN_INTERVAL` balls, evenly distributed, so they never
   * overlap and local density ends up inversely proportional to speed.
   */
  private spawnAtInlets(dt: number): void {
    for (let k = 0; k < this.inletIndices.length; k++) {
      this.spawnAccum[k] += dt;
      while (this.spawnAccum[k] >= SPAWN_INTERVAL) {
        this.spawnAccum[k] -= SPAWN_INTERVAL;
        if (this.balls.length >= this.capacity) return;
        const idx = this.inletIndices[k];
        const next = this.grid.getDownstreamFromIndex(idx);
        if (next < 0) break;  // inlet with no downstream: nothing to flow into
        const fromPos = this.worldPosForIndex(idx);
        const toPos = this.worldPosForIndex(next);
        this.balls.push({
          fromIdx: idx,
          toIdx: next,
          t: 0,
          steps: 0,
          stepDuration: this.stepDurationFor(idx, next, fromPos, toPos),
          fromPos,
          toPos,
        });
      }
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
