import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Initialize and configure the Three.js scene for displaying the fracture glTF model
 */
export async function setupSceneFracture() {
    const modelPath = "models/fracture_scene.gltf";
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    document.body.appendChild(renderer.domElement);

    const camera = createCamera();
    const scene = createScene();
    const model = await loadGLTFModel(scene, modelPath);

    // Position camera to frame the model properly
    positionCameraToFitModel(camera, model);

    return { renderer, camera, scene, model, canvas };
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
    // Initial position will be set after model loads
    camera.position.set(0, 0, 10000);
    return camera;
}

/**
 * Position camera to frame the model properly
 * @param {THREE.PerspectiveCamera} camera - The camera to position
 * @param {Object} modelData - Object containing model info (center, size, boundingBox)
 */
function positionCameraToFitModel(camera, modelData) {
    const { center, size } = modelData;

    // Get the maximum dimension of the bounding box
    const maxDim = Math.max(size.x, size.y, size.z);

    // Calculate camera distance to fit the entire model in view
    // Using FOV to calculate the distance needed
    const fov = camera.fov * (Math.PI / 180); // Convert to radians
    const cameraDistance = Math.abs(maxDim / Math.tan(fov / 2)) * 1.2; // 1.5 adds padding

    // Position camera at a good viewing angle
    // Using a 45-degree angle for better perspective
    const angle = Math.PI / 4; // 45 degrees
    camera.position.set(
        center.x + cameraDistance * Math.sin(angle),
        center.y + cameraDistance * 0.5, // Slightly elevated
        center.z + cameraDistance * Math.cos(angle)
    );

    // Make camera look at the center of the model
    camera.lookAt(center);

    console.log('Camera positioned at:', camera.position);
    console.log('Looking at model center:', center);
    console.log('Model size:', size);
    console.log('Camera distance:', cameraDistance);
}

/**
 * Create the scene with lighting
 */
function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x625d5a);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    directionalLight.position.set(-1, 2, 4);
    scene.add(directionalLight);

    // Add ambient light for overall illumination
    scene.add(new THREE.AmbientLight(0xFFFFFF, 4));

    return scene;
}

/**
 * Load and display the glTF fracture model
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} modelPath - Path to the glTF file
 * @returns {Promise<Object>} Model data including the loaded object and bounding box
 */
export async function loadGLTFModel(scene, modelPath) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        console.log(`Loading glTF model from: ${modelPath}`);

        loader.load(
            modelPath,
            // onLoad callback
            (gltf) => {
                console.log('glTF model loaded successfully');

                // Hide loading overlay
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                }

                const model = gltf.scene;
                scene.add(model);

                // Calculate bounding box for camera positioning
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                console.log('Model center:', center);
                console.log('Model size:', size);

                resolve({
                    model,
                    center,
                    boundingBox: box,
                    size,
                    animations: gltf.animations
                });
            },
            // onProgress callback
            (xhr) => {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                console.log(`Loading model: ${percentComplete.toFixed(2)}%`);

                // Update progress bar
                const progressBar = document.getElementById('progress-bar');
                const progressPercentage = document.getElementById('progress-percentage');
                if (progressBar && progressPercentage) {
                    progressBar.style.width = `${percentComplete}%`;
                    progressPercentage.textContent = `${percentComplete.toFixed(0)}%`;
                }
            },
            // onError callback
            (error) => {
                console.error('Error loading glTF model:', error);
                reject(error);
            }
        );
    });
}
