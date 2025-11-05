/**
 * Manages the render loop and handles responsive resizing
 */
export class RenderManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.renderRequested = false;

        this.setupResizeHandler();
        this.render();
    }

    /**
     * Main render function
     */
    render = () => {
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
    requestRenderIfNotRequested = () => {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(this.render);
        }
    }

    /**
     * Resize the renderer to match the display size
     */
    resizeRendererToDisplaySize() {
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
    setupResizeHandler() {
        window.addEventListener('resize', this.requestRenderIfNotRequested);
    }
}
