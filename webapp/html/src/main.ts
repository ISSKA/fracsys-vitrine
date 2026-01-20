import * as THREE from 'three';
import { loadGLTFModel, createCamera, createScene, getSignedUrl, ModelData } from './sceneSetupShared.js';
import { getSceneConfig as getDamageZoneConfig, SceneConfig } from './sceneSetupDamageZone.js';
import { getSceneConfig as getFractureConfig } from './sceneSetupFracture.js';
import { setupMouseControls } from './mouseControls.js';
import { RenderManager } from './renderManager.js';

// Global variables to track the current state
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let canvas: HTMLCanvasElement;
let renderManager: RenderManager;
let currentModel: ModelData | null = null;

// Cache for model sizes
let modelSizes: Record<string, number> = {};

// Constants
const FILE_SIZE_THRESHOLD_MB = 100;

// Model configuration
interface ModelInfo {
    filename: string;
    path: string;
    sceneType: 'damageZone' | 'fracture';
}

type ModelConfigKey = 'damage-zone-button' | 'damage-zone-optimized-button' | 'fracture-zone-button';

const MODEL_CONFIG: Record<ModelConfigKey, ModelInfo> = {
    'damage-zone-button': {
        filename: 'damagIs e_zone.gltf',
        path: 'damage_zone.gltf',
        sceneType: 'damageZone'
    },
    'damage-zone-optimized-button': {
        filename: 'damage_zone_optimized.gltf',
        path: 'damage_zone_optimized.gltf',
        sceneType: 'damageZone'
    },
    'fracture-zone-button': {
        filename: 'fracture_scene.gltf',
        path: 'fracture_scene.gltf',
        sceneType: 'fracture'
    }
};

// Scene configuration getters
const SCENE_CONFIGS: Record<'damageZone' | 'fracture', () => SceneConfig> = {
    'damageZone': getDamageZoneConfig,
    'fracture': getFractureConfig
};

/**
 * Fetch file size using HTTP HEAD request
 */
async function fetchFileSize(url: string): Promise<number | null> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
            // Convert bytes to megabytes
            return Math.round(parseInt(contentLength) / (1024 * 1024));
        }
        return null;
    } catch (error) {
        console.error(`Error fetching file size for ${url}:`, error);
        return null;
    }
}

/**
 * Fetch model sizes using HEAD requests
 */
async function fetchModelSizes(): Promise<void> {
    const models = Object.values(MODEL_CONFIG);

    const sizePromises = models.map(async (model) => {
        const sizeMB = await fetchFileSize(model.path);
        return { filename: model.filename, sizeMB };
    });

    const results = await Promise.all(sizePromises);

    results.forEach(({ filename, sizeMB }) => {
        if (sizeMB !== null) {
            modelSizes[filename] = sizeMB;
        }
    });

    console.log('Model sizes loaded:', modelSizes);
}

/**
 * Get file size for a model
 */
function getModelSize(filename: string): number {
    return modelSizes[filename] || 0;
}

/**
 * Load colorbar images from S3 bucket
 */
async function loadColorbars(): Promise<void> {
    const colorbars = [
        { id: 'colorbar-flow', filename: 'colorbar_flow.png' },
        { id: 'colorbar-head', filename: 'colorbar_head.png' }
    ];

    try {
        for (const colorbar of colorbars) {
            const signedUrl = await getSignedUrl(colorbar.filename);
            const imgElement = document.getElementById(colorbar.id) as HTMLImageElement | null;
            if (imgElement) {
                imgElement.src = signedUrl;
                console.log(`Loaded colorbar: ${colorbar.filename}`);
            }
        }
    } catch (error) {
        console.error('Error loading colorbars:', error);
    }
}

/**
 * Show or hide the colorbar overlay based on scene type
 * @param sceneType - The type of scene being displayed
 */
function updateColorbarVisibility(sceneType: 'damageZone' | 'fracture'): void {
    const colorbarOverlay = document.getElementById('colorbar-overlay');
    if (colorbarOverlay) {
        if (sceneType === 'fracture') {
            colorbarOverlay.classList.remove('hidden');
        } else {
            colorbarOverlay.classList.add('hidden');
        }
    }
}

/**
 * Load a new model and replace the current one
 * @param modelPath - Path to the model file
 * @param sceneConfig - Scene configuration object
 * @param sceneType - The type of scene being displayed
 */
async function loadNewModel(modelPath: string, sceneConfig: SceneConfig, sceneType: 'damageZone' | 'fracture'): Promise<void> {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }

    // Reset progress bar
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    if (progressBar && progressPercentage) {
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
    }

    // Remove the current model from the scene if it exists
    if (currentModel && currentModel.model) {
        scene.remove(currentModel.model);
    }

    // Recreate the scene with the new configuration
    scene = createScene(sceneConfig.includeDirectionalLight, sceneConfig.lightBrightness);
    renderManager.updateScene(scene);

    // Load the new model
    const model = await loadGLTFModel(scene, modelPath);
    currentModel = model;

    // Setup mouse controls with the new model
    setupMouseControls(
        canvas,
        model.model,
        camera,
        renderManager.requestRenderIfNotRequested
    );

    // Reset camera position using scene config
    camera.position.set(
        sceneConfig.cameraPosition.x,
        sceneConfig.cameraPosition.y,
        sceneConfig.cameraPosition.z
    );

    // Update colorbar visibility based on scene type
    updateColorbarVisibility(sceneType);

    // Request a render
    renderManager.requestRenderIfNotRequested();
}

/**
 * Handle model loading with file size check
 * @param modelPath - Path to the model file
 * @param filename - Filename for size lookup
 * @param sceneType - Type of scene configuration to use
 */
function handleModelLoad(modelPath: string, filename: string, sceneType: 'damageZone' | 'fracture'): void {
    const sceneConfig = SCENE_CONFIGS[sceneType]();
    const fileSizeMB = getModelSize(filename);
    if (fileSizeMB > FILE_SIZE_THRESHOLD_MB) {
        showConfirmationDialog(modelPath, fileSizeMB, sceneConfig, sceneType);
    } else {
        loadNewModel(modelPath, sceneConfig, sceneType);
    }
}

/**
 * Show confirmation dialog and handle model loading
 * @param modelPath - Path to the model file
 * @param fileSizeMB - File size in MB
 * @param sceneConfig - Scene configuration object
 * @param sceneType - The type of scene being displayed
 */
function showConfirmationDialog(modelPath: string, fileSizeMB: number, sceneConfig: SceneConfig, sceneType: 'damageZone' | 'fracture'): void {
    const dialog = document.getElementById('confirmation-dialog');
    const confirmButton = document.getElementById('confirm-button');
    const cancelButton = document.getElementById('cancel-button');
    const dialogMessage = document.getElementById('dialog-message');

    if (!dialog || !confirmButton || !cancelButton || !dialogMessage) {
        return;
    }

    // Update message with file size
    dialogMessage.textContent = `Ce modèle 3D est volumineux (${fileSizeMB} MB) et peut prendre du temps à charger. Souhaitez-vous continuer?`;

    // Show the dialog
    dialog.classList.add('show');

    // Handle confirm
    const confirmHandler = async () => {
        dialog.classList.remove('show');
        await loadNewModel(modelPath, sceneConfig, sceneType);
        cleanup();
    };

    // Handle cancel
    const cancelHandler = () => {
        dialog.classList.remove('show');
        cleanup();
    };

    // Cleanup function to remove event listeners
    const cleanup = () => {
        confirmButton.removeEventListener('click', confirmHandler);
        cancelButton.removeEventListener('click', cancelHandler);
    };

    // Add event listeners
    confirmButton.addEventListener('click', confirmHandler);
    cancelButton.addEventListener('click', cancelHandler);
}

/**
 * Show WIP dialog and handle model loading
 * @param modelPath - Path to the model file
 * @param sceneConfig - Scene configuration object
 * @param sceneType - The type of scene being displayed
 */
function showWIPDialog(modelPath: string, sceneConfig: SceneConfig, sceneType: 'damageZone' | 'fracture'): void {
    const dialog = document.getElementById('wip-dialog');
    const okButton = document.getElementById('wip-ok-button');

    if (!dialog || !okButton) {
        return;
    }

    // Show the dialog
    dialog.classList.add('show');

    // Handle OK click
    const okHandler = async () => {
        dialog.classList.remove('show');
        await loadNewModel(modelPath, sceneConfig, sceneType);
        okButton.removeEventListener('click', okHandler);
    };

    // Add event listener
    okButton.addEventListener('click', okHandler);
}

/**
 * Initialize the Three.js application
 */
async function init(): Promise<void> {
    // Setup canvas and renderer
    const canvasElement = document.querySelector('#c') as HTMLCanvasElement | null;
    if (!canvasElement) {
        throw new Error('Canvas element not found');
    }
    canvas = canvasElement;
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    document.body.appendChild(renderer.domElement);

    // Create camera and scene with default damage zone config
    const defaultConfig = getDamageZoneConfig();
    camera = createCamera();
    camera.position.set(
        defaultConfig.cameraPosition.x,
        defaultConfig.cameraPosition.y,
        defaultConfig.cameraPosition.z
    );
    scene = createScene(defaultConfig.includeDirectionalLight, defaultConfig.lightBrightness);

    // Setup render manager
    renderManager = new RenderManager(renderer, scene, camera);

    // Fetch model sizes from backend
    //await fetchModelSizes();

    // Load colorbars from S3
    await loadColorbars();

    // Hide the loading overlay since we start with no model
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }

    // Do initial render to show the empty scene
    renderManager.requestRenderIfNotRequested();

    // Setup button event listeners using MODEL_CONFIG
    (Object.keys(MODEL_CONFIG) as ModelConfigKey[]).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        const modelInfo = MODEL_CONFIG[buttonId];

        if (button) {
            button.addEventListener('click', () => {
                const sceneConfig = SCENE_CONFIGS[modelInfo.sceneType]();
                const fileSizeMB = getModelSize(modelInfo.filename);

                // Check if this is the optimized model (WIP)
                if (buttonId === 'damage-zone-optimized-button') {
                    showWIPDialog(modelInfo.path, sceneConfig, modelInfo.sceneType);
                } else if (buttonId === 'damage-zone-button') {
                    // Always show confirmation dialog for damage zone model
                    showConfirmationDialog(modelInfo.path, fileSizeMB, sceneConfig, modelInfo.sceneType);
                } else if (fileSizeMB > FILE_SIZE_THRESHOLD_MB) {
                    showConfirmationDialog(modelInfo.path, fileSizeMB, sceneConfig, modelInfo.sceneType);
                } else {
                    loadNewModel(modelInfo.path, sceneConfig, modelInfo.sceneType);
                }
            });
        }
    });

}

// Start the application
init();
