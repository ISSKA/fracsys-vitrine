// Re-export shared functions for backwards compatibility
export { loadGLTFModel } from './sceneSetupShared.js';

export interface SceneConfig {
    includeDirectionalLight: boolean;
    lightBrightness: number;
    cameraPosition: { x: number; y: number; z: number };
}

/**
 * Get scene-specific configuration for damage zone models
 * @returns Configuration object with scene settings
 */
export function getSceneConfig(): SceneConfig {
    return {
        includeDirectionalLight: true,
        lightBrightness: 2,
        cameraPosition: { x: 0, y: 0, z: 10000 }
    };
}
