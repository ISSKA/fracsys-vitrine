import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Create and configure the camera
 */
export function createCamera() {
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
 * Create the scene with lighting
 * @param {boolean} includeDirectionalLight - Whether to include directional light
 * @param {number} brightness - Light brightness intensity (default: 2)
 */
export function createScene(includeDirectionalLight = true, brightness = 2) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x625d5a);

    if (includeDirectionalLight) {
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, brightness);
        directionalLight.position.set(-1, 2, 4);
        scene.add(directionalLight);
    }

    // Add ambient light for overall illumination
    scene.add(new THREE.AmbientLight(0xFFFFFF, brightness));

    return scene;
}

/**
 * Load and display the glTF fracture model
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} modelPath - Path to the glTF file
 * @returns {Promise<Object>} Model data including the loaded object and bounding box
 */
export function loadGLTFModel(scene, modelPath) {
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
