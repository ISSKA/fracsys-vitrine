import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BACKGROUND_GRID_SPACING = 1000;

export class SceneManager {

  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
    this.camera.position.set(20, 25, 20);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.onResize();
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(20, 40, 20);
    this.scene.add(directional);

    window.addEventListener('resize', () => this.onResize());
  }

  setBackground(color: number): void {
    this.scene.background = new THREE.Color(color);
  }

  addBackgroundGrid(
    nx: number,
    ny: number,
    nz: number,
    voxelSize: number,
  ): void {
    const spacing = BACKGROUND_GRID_SPACING;

    const widthX = (ny - 1) * voxelSize;
    const widthZ = (nx - 1) * voxelSize;
    const heightY = (nz - 1) * voxelSize;

    const x0 = -spacing;
    const x1 = Math.ceil(widthX / spacing) * spacing + spacing;

    const z0 = -spacing;
    const z1 = Math.ceil(widthZ / spacing) * spacing + spacing;

    const y0 = -spacing;
    const y1 = Math.ceil(heightY / spacing) * spacing + spacing;

    const material = new THREE.LineBasicMaterial({
      color: 0xBBBBBB,
    });

    const makeGrid = (vertices: number[]): THREE.LineSegments => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      return new THREE.LineSegments(geometry, material);
    };

    const xz: number[] = [];

    for (let x = x0; x <= x1; x += spacing) {
      xz.push(x, y0, z0, x, y0, z1);
    }

    for (let z = z0; z <= z1; z += spacing) {
      xz.push(x0, y0, z, x1, y0, z);
    }

    const xy: number[] = [];

    for (let x = x0; x <= x1; x += spacing) {
      xy.push(x, y0, z0, x, y1, z0);
    }

    for (let y = y0; y <= y1; y += spacing) {
      xy.push(x0, y, z0, x1, y, z0);
    }

    const yz: number[] = [];

    for (let z = z0; z <= z1; z += spacing) {
      yz.push(x0, y0, z, x0, y1, z);
    }

    for (let y = y0; y <= y1; y += spacing) {
      yz.push(x0, y, z0, x0, y, z1);
    }

    this.scene.add(
      makeGrid(xz),
      makeGrid(xy),
      makeGrid(yz),
    );
  }


  lookAt(target: THREE.Vector3): void {
    this.controls.target.copy(target);
    this.camera.lookAt(target);
  }

  /** Set and remember the view that can later be restored with resetView(). */
  setInitialView(target: THREE.Vector3, position: THREE.Vector3): void {
    this.controls.target.copy(target);
    this.camera.position.copy(position);
    this.controls.update();
    this.controls.saveState();
  }

  /** Restore the camera position and orbit target saved by setInitialView(). */
  resetView(): void {
    this.controls.reset();
  }

  getCameraState(): { position: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3; fov: number } {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      up: this.camera.up.clone(),
      fov: this.camera.fov,
    };
  }

  private onResize(): void {
    const width = this.canvasWidth();
    const height = this.canvasHeight();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private canvasWidth(): number {
    return this.renderer.domElement.clientWidth || window.innerWidth;
  }

  private canvasHeight(): number {
    return this.renderer.domElement.clientHeight || window.innerHeight;
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
