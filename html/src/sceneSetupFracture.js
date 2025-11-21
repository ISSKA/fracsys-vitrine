// Re-export shared functions for backwards compatibility
export { loadGLTFModel } from './sceneSetupShared.js';

/**
 * Get scene-specific configuration for fracture models
 * @returns {Object} Configuration object with scene settings
 */
export function getSceneConfig() {
    return {
        includeDirectionalLight: false,
        lightBrightness: 5,
        cameraPosition: { x: 0, y: 0, z: 10000 }
    };
}
