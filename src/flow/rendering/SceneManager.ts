import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  private axesGroup?: THREE.Group;

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
    // The VTK layer owns the shared viewer background. Keep this canvas transparent
    // so mesh and Three.js layers can be composed in the same scene.
    void color;
    this.scene.background = null;
  }

  /** Add labeled coordinate axes at the given origin, scaled to the grid. */
  addAxes(origin: THREE.Vector3, length: number): void {
    if (this.axesGroup) {
      this.scene.remove(this.axesGroup);
      this.disposeGroup(this.axesGroup);
    }

    // Axis lines: red=X, green=Z(gravity), blue=Y
    const axes = new THREE.Group();

    const makeArrow = (dir: THREE.Vector3, color: number, label: string) => {
      const arrow = new THREE.ArrowHelper(dir, origin, length, color, length * 0.08, length * 0.04);
      axes.add(arrow);

      const spriteScale = length * 0.15;
      const sprite = this.makeTextSprite(label, color);
      sprite.position.copy(origin).addScaledVector(dir, length * 1.12);
      sprite.scale.set(spriteScale, spriteScale, 1);
      axes.add(sprite);
    };

    makeArrow(new THREE.Vector3(1, 0, 0), 0xff4444, 'Y');  // grid Y → Three.js X
    makeArrow(new THREE.Vector3(0, 1, 0), 0x44ff44, 'Z');  // grid Z → Three.js Y
    makeArrow(new THREE.Vector3(0, 0, 1), 0x4488ff, 'X');  // grid X → Three.js Z

    this.scene.add(axes);
    this.axesGroup = axes;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse(obj => {
      if (obj instanceof THREE.Sprite) {
        const mat = obj.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      } else if (obj instanceof THREE.ArrowHelper) {
        obj.line.geometry.dispose();
        (obj.line.material as THREE.Material).dispose();
        obj.cone.geometry.dispose();
        (obj.cone.material as THREE.Material).dispose();
      }
    });
  }

  private makeTextSprite(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
    ctx.fillText(text, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1, 1, 1); // will be rescaled in addAxes caller
    return sprite;
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
