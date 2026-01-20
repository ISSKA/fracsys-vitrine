// Re-export shared functions for backwards compatibility
export { loadGLTFModel } from './sceneSetupShared.js';
import type { SceneConfig } from './sceneSetupDamageZone.js';

/**
 * Get scene-specific configuration for fracture models
 * @returns Configuration object with scene settings
 */
export function getSceneConfig(): SceneConfig {
    return {
        includeDirectionalLight: false,
        lightBrightness: 1,
        cameraPosition: { x: 0, y: 0, z: 10000 }
    };
}
