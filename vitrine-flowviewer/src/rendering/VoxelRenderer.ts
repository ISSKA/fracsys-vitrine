import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { VoxelGrid } from '../grid/VoxelGrid';

const VOXEL_COLOR = new THREE.Color(0xcccccc);  // neutral light gray
const EXIT_COLOR = 0xff0000;                    // outflow node — bright red
const EXIT_LINEWIDTH = 4;                        // outflow line thickness, in pixels
//const INLET_COLOR = new THREE.Color(0xff2222);  // red
const INLET_COLOR = new THREE.Color(0xffffff);  // white

/** Opacity tiers. Each becomes one merged LineSegments (one draw call). */
const TIER_OPACITY = [0.8, 0.6, 0.1] as const;

/** Map t in [0,1] to a rainbow ramp: blue → green → red via HSL hue. */
function velocityColor(t: number): THREE.Color {
  const clamped = Math.min(1, Math.max(0, t));
  const hue = THREE.MathUtils.lerp(240, 0, clamped) / 360;
  return new THREE.Color().setHSL(hue, 1.0, 0.5);
}

export class VoxelRenderer {
  private group: THREE.Group;
  private exitMaterial?: LineMaterial;
  private onResize?: () => void;

  constructor(grid: VoxelGrid) {
    this.group = new THREE.Group();

    const size = grid.voxelSize;
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    // Base edge vertices of a unit voxel, centered at origin (12 edges → 24 verts).
    const basePositions = (edgesGeo.attributes.position.array as Float32Array);
    const vertsPerVoxel = basePositions.length / 3;
    const floatsPerVoxel = basePositions.length;
    boxGeo.dispose();
    edgesGeo.dispose();

    // Outflow nodes are drawn separately as a bold red fat line (below), so pull
    // them out of the merged tiers. Inlet still takes precedence over exit.
    const isExitMarker = (x: number, y: number, z: number) =>
      grid.isExit(x, y, z) && !grid.isInlet(x, y, z);

    // Compute log-velocity range over saturated, non-exit voxels with v > 0.
    let logMin = Infinity;
    let logMax = -Infinity;
    for (let z = 0; z < grid.nz; z++) {
      for (let y = 0; y < grid.ny; y++) {
        for (let x = 0; x < grid.nx; x++) {
          if (!grid.exists(x, y, z)) continue;
          if (grid.isExit(x, y, z)) continue;
          if (!grid.isSaturated(x, y, z)) continue;
          const v = grid.getVelocity(x, y, z);
          if (v <= 0) continue;
          const lv = Math.log(v);
          if (lv < logMin) logMin = lv;
          if (lv > logMax) logMax = lv;
        }
      }
    }
    const logRange = logMax - logMin;
    const hasRange = isFinite(logMin) && isFinite(logMax) && logRange > 0;

    // Classify a non-exit voxel into an opacity tier + color. Precedence order
    // (inlet → saturated → default) must match the original renderer: voxels may
    // carry multiple flags and the first match wins. (Exits are handled above.)
    const classify = (x: number, y: number, z: number): { tier: number; color: THREE.Color } => {
      if (grid.isInlet(x, y, z)) {
        return { tier: 0, color: INLET_COLOR };
      } else if (grid.isSaturated(x, y, z)) {
        const v = grid.getVelocity(x, y, z);
        const t = hasRange && v > 0 ? (Math.log(v) - logMin) / logRange : 0;
        return { tier: 1, color: velocityColor(t) };
      } else {
        return { tier: 2, color: VOXEL_COLOR };
      }
    };

    // --- Count pass: how many voxels land in each tier (exits counted apart). ---
    const counts = [0, 0, 0];
    let exitCount = 0;
    for (let z = 0; z < grid.nz; z++) {
      for (let y = 0; y < grid.ny; y++) {
        for (let x = 0; x < grid.nx; x++) {
          if (!grid.exists(x, y, z)) continue;
          if (isExitMarker(x, y, z)) { exitCount++; continue; }
          counts[classify(x, y, z).tier]++;
        }
      }
    }

    // Preallocate per-tier position/color buffers and write cursors.
    const positions = counts.map(c => new Float32Array(c * floatsPerVoxel));
    const colors = counts.map(c => new Float32Array(c * floatsPerVoxel));
    const cursors = [0, 0, 0];
    const exitPositions = new Float32Array(exitCount * floatsPerVoxel);
    let exitCursor = 0;

    // --- Fill pass: copy base edges + world offset, and per-vertex color. ---
    for (let z = 0; z < grid.nz; z++) {
      for (let y = 0; y < grid.ny; y++) {
        for (let x = 0; x < grid.nx; x++) {
          if (!grid.exists(x, y, z)) continue;
          const pos = grid.toWorldPosition(x, y, z);
          if (isExitMarker(x, y, z)) {
            for (let v = 0; v < vertsPerVoxel; v++) {
              const b = v * 3;
              exitPositions[exitCursor++] = basePositions[b] + pos.x;
              exitPositions[exitCursor++] = basePositions[b + 1] + pos.y;
              exitPositions[exitCursor++] = basePositions[b + 2] + pos.z;
            }
            continue;
          }
          const { tier, color } = classify(x, y, z);
          const pArr = positions[tier];
          const cArr = colors[tier];
          let w = cursors[tier];
          for (let v = 0; v < vertsPerVoxel; v++) {
            const b = v * 3;
            pArr[w] = basePositions[b] + pos.x;
            pArr[w + 1] = basePositions[b + 1] + pos.y;
            pArr[w + 2] = basePositions[b + 2] + pos.z;
            cArr[w] = color.r;
            cArr[w + 1] = color.g;
            cArr[w + 2] = color.b;
            w += 3;
          }
          cursors[tier] = w;
        }
      }
    }

    // One merged LineSegments per non-empty tier.
    for (let tier = 0; tier < TIER_OPACITY.length; tier++) {
      if (counts[tier] === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions[tier], 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors[tier], 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        opacity: TIER_OPACITY[tier],
        transparent: true,
      });
      this.group.add(new THREE.LineSegments(geo, mat));
    }

    // Outflow node(s): a bold red fat line so they stand out against the grid.
    if (exitCount > 0) {
      const exitGeo = new LineSegmentsGeometry();
      exitGeo.setPositions(exitPositions);
      this.exitMaterial = new LineMaterial({ color: EXIT_COLOR, linewidth: EXIT_LINEWIDTH });
      this.exitMaterial.resolution.set(window.innerWidth, window.innerHeight);
      this.group.add(new LineSegments2(exitGeo, this.exitMaterial));

      // LineMaterial.linewidth is in pixels, so resolution must track the viewport.
      this.onResize = () => this.exitMaterial?.resolution.set(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', this.onResize);
    }
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.dispose();
  }

  /** Free GPU buffers for all wireframe meshes. Called on grid reload. */
  dispose(): void {
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      this.onResize = undefined;
    }
    this.group.traverse(obj => {
      if (obj instanceof THREE.LineSegments || obj instanceof LineSegments2) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.exitMaterial = undefined;
    this.group.clear();
  }
}
