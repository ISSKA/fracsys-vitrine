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
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
    this.camera.position.set(20, 25, 20);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
