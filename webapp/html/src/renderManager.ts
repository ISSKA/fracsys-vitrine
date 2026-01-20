import * as THREE from 'three';

/**
 * Manages the render loop and handles responsive resizing
 */
export class RenderManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderRequested: boolean = false;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.setupResizeHandler();
        this.render();
    }

    /**
     * Main render function
     */
    render = (): void => {
        this.renderRequested = false;

        if (this.resizeRendererToDisplaySize()) {
            const canvas = this.renderer.domElement;
            this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
            this.camera.updateProjectionMatrix();
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Request a render if one is not already requested
     */
    requestRenderIfNotRequested = (): void => {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(this.render);
        }
    }

    /**
     * Update the scene reference
     * @param scene - The new scene to render
     */
    updateScene(scene: THREE.Scene): void {
        this.scene = scene;
    }

    /**
     * Resize the renderer to match the display size
     */
    private resizeRendererToDisplaySize(): boolean {
        const canvas = this.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;

        if (needResize) {
            this.renderer.setSize(width, height, false);
        }

        return needResize;
    }

    /**
     * Setup window resize handler
     */
    private setupResizeHandler(): void {
        window.addEventListener('resize', this.requestRenderIfNotRequested);
    }
}
