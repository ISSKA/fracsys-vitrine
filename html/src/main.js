import { setupScenePoints } from './sceneSetupPoints.js';
import { setupMouseControls } from './mouseControls.js';
import { RenderManager } from './renderManager.js';

/**
 * Initialize the Three.js application
 */
async function init() {
    // Setup scene, camera, renderer, and objects
    const { renderer, camera, scene, points, canvas } = await setupScenePoints();

    // Setup render manager
    const renderManager = new RenderManager(renderer, scene, camera);

    // Setup mouse controls with render callback
    setupMouseControls(
        canvas,
        points,
        camera,
        renderManager.requestRenderIfNotRequested
    );
}

// Start the application
init();

