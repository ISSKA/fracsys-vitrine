import * as THREE from 'three';
import { VoxelGrid } from '../grid/VoxelGrid';
import { ParticleState } from '../types';

export class ParticleRenderer {
  private grid: VoxelGrid;
  private group: THREE.Group;
  private meshes: Map<number, THREE.Mesh> = new Map();
  private sphereGeo: THREE.SphereGeometry;
  private activeMat: THREE.MeshStandardMaterial;
  private settledMat: THREE.MeshStandardMaterial;

  constructor(grid: VoxelGrid) {
    this.grid = grid;
    this.group = new THREE.Group();
    this.sphereGeo = new THREE.SphereGeometry(grid.voxelSize * 0.3, 8, 8);
    this.activeMat = new THREE.MeshStandardMaterial({ color: 0x4488ff });
//    this.settledMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, opacity: 0.7, transparent: true });
    this.settledMat = new THREE.MeshStandardMaterial({ color: 0xee00ee, opacity: 0.7, transparent: true });
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.group);
  }

  /** Sync meshes with current particle state. */
  update(particles: ReadonlyArray<ParticleState>): void {
    const activeIds = new Set<number>();

    for (const p of particles) {
      activeIds.add(p.id);
      let mesh = this.meshes.get(p.id);

      const target = this.grid.toWorldPosition(p.position.x, p.position.y, p.position.z);

      if (!mesh) {
        mesh = new THREE.Mesh(this.sphereGeo, this.activeMat);
        mesh.position.copy(target); // snap to correct position immediately
        this.meshes.set(p.id, mesh);
        this.group.add(mesh);
      } else {
        // Lerp for smooth movement on existing particles
        mesh.position.lerp(target, 0.3);
      }

      mesh.material = p.settled ? this.settledMat : this.activeMat;
    }

    // Remove meshes for particles that no longer exist (after reset)
    for (const [id, mesh] of this.meshes) {
      if (!activeIds.has(id)) {
        this.group.remove(mesh);
        this.meshes.delete(id);
      }
    }
  }

  /** Hard-set all positions (no lerp) — used on reset. */
  resetPositions(particles: ReadonlyArray<ParticleState>): void {
    // Clear all existing meshes
    for (const [, mesh] of this.meshes) {
      this.group.remove(mesh);
    }
    this.meshes.clear();

    for (const p of particles) {
      const mesh = new THREE.Mesh(this.sphereGeo, this.activeMat);
      const pos = this.grid.toWorldPosition(p.position.x, p.position.y, p.position.z);
      mesh.position.copy(pos);
      this.meshes.set(p.id, mesh);
      this.group.add(mesh);
    }
  }
}
