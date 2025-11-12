// import { setupSceneFracture } from './sceneSetupFracture.js';
import { setupSceneFracture } from './sceneSetupDamageZone.js';
import { setupScenePoints } from './sceneSetupPoints.js';
import { setupMouseControls } from './mouseControls.js';
import { RenderManager } from './renderManager.js';

/**
 * Initialize the Three.js application
 */
async function init() {
    // Setup scene, camera, renderer, and objects
    //const { renderer, camera, scene, , canvas } = await setupScenePoints();
    const { renderer, camera, scene, model, canvas } = await setupSceneFracture();

    // Setup render manager
    const renderManager = new RenderManager(renderer, scene, camera);

    // Setup mouse controls with render callback
    setupMouseControls(
        canvas,
        model.model,
        camera,
        renderManager.requestRenderIfNotRequested,
        model.center
    );
}

// Start the application
init();

