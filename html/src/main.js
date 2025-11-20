import * as THREE from 'three';
import { loadGLTFModel } from './sceneSetupDamageZone.js';
import { setupMouseControls } from './mouseControls.js';
import { RenderManager } from './renderManager.js';

// Global variables to track the current state
let renderer, camera, scene, canvas, renderManager, currentModel;

// Cache for model sizes
let modelSizes = {};

/**
 * Fetch file size using HTTP HEAD request
 */
async function fetchFileSize(url) {
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
async function fetchModelSizes() {
    const models = [
        { filename: 'damage_zone.gltf', path: 'models/damage_zone.gltf' },
        { filename: 'fracture_scene.gltf', path: 'models/fracture_scene.gltf' }
    ];

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
function getModelSize(filename) {
    return modelSizes[filename] || 0;
}

/**
 * Create and configure the camera
 */
function createCamera() {
    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 1000000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 10000);
    return camera;
}

/**
 * Create the scene with lighting
 */
function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x625d5a);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
    directionalLight.position.set(-1, 2, 4);
    scene.add(directionalLight);

    // Add ambient light for overall illumination
    scene.add(new THREE.AmbientLight(0xFFFFFF, 2));

    return scene;
}

/**
 * Load a new model and replace the current one
 */
async function loadNewModel(modelPath) {
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

    // Load the new model
    const model = await loadGLTFModel(scene, modelPath);
    currentModel = model;

    // Setup mouse controls with the new model
    setupMouseControls(
        canvas,
        model.model,
        camera,
        renderManager.requestRenderIfNotRequested,
        model.center
    );

    // Reset camera position
    camera.position.set(0, 0, 10000);

    // Request a render
    renderManager.requestRenderIfNotRequested();
}

/**
 * Show confirmation dialog and handle model loading
 */
function showConfirmationDialog(modelPath, fileSizeMB) {
    const dialog = document.getElementById('confirmation-dialog');
    const confirmButton = document.getElementById('confirm-button');
    const cancelButton = document.getElementById('cancel-button');
    const dialogMessage = document.getElementById('dialog-message');

    // Update message with file size
    dialogMessage.textContent = `Ce modèle 3D est volumineux (${fileSizeMB} MB) et peut prendre du temps à charger. Souhaitez-vous continuer?`;

    // Show the dialog
    dialog.classList.add('show');

    // Handle confirm
    const confirmHandler = async () => {
        dialog.classList.remove('show');
        await loadNewModel(modelPath);
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
 * Initialize the Three.js application
 */
async function init() {
    // Setup canvas and renderer
    canvas = document.querySelector('#c');
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    document.body.appendChild(renderer.domElement);

    // Create camera and scene
    camera = createCamera();
    scene = createScene();

    // Setup render manager
    renderManager = new RenderManager(renderer, scene, camera);

    // Fetch model sizes from backend
    await fetchModelSizes();

    // Hide the loading overlay since we start with no model
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }

    // Do initial render to show the empty scene
    renderManager.requestRenderIfNotRequested();

    // Setup button event listeners
    const damageZoneButton = document.getElementById('damage-zone-button');
    const fractureZoneButton = document.getElementById('fracture-zone-button');

    damageZoneButton.addEventListener('click', () => {
        const fileSizeMB = getModelSize('damage_zone.gltf');
        if (fileSizeMB > 100) {
            showConfirmationDialog('models/damage_zone.gltf', fileSizeMB);
        } else {
            loadNewModel('models/damage_zone.gltf');
        }
    });

    fractureZoneButton.addEventListener('click', () => {
        const fileSizeMB = getModelSize('fracture_scene.gltf');
        if (fileSizeMB > 100) {
            showConfirmationDialog('models/fracture_scene.gltf', fileSizeMB);
        } else {
            loadNewModel('models/fracture_scene.gltf');
        }
    });
}

// Start the application
init();

