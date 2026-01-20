import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export interface ModelData {
    model: THREE.Group;
    center: THREE.Vector3;
    boundingBox: THREE.Box3;
    size: THREE.Vector3;
    animations: THREE.AnimationClip[];
}

export interface SignedUrlResponse {
    signedUrl: string;
}

/**
 * Create and configure the camera
 */
export function createCamera(): THREE.PerspectiveCamera {
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
 * @param includeDirectionalLight - Whether to include directional light
 * @param brightness - Light brightness intensity (default: 2)
 */
export function createScene(includeDirectionalLight: boolean = true, brightness: number = 2): THREE.Scene {
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
 * Get the signed url from AWS to download the file.
 * @param objectKey - The file name to get from AWS bucket
 * @returns The signed url that must be used to download the file.
 */
export async function getSignedUrl(objectKey: string): Promise<string> {
    const apiEndpoint = "https://xhx5lqfvq1.execute-api.eu-central-1.amazonaws.com/prod/download-url";

    const url = `${apiEndpoint}?key=${encodeURIComponent(objectKey)}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.status}`);
    }
    const data: SignedUrlResponse = await response.json();
    return data.signedUrl;
}

/**
 * Load and display the glTF fracture model
 * @param scene - The Three.js scene
 * @param modelPath - Path to the glTF file
 * @returns Model data including the loaded object and bounding box
 */
export async function loadGLTFModel(scene: THREE.Scene, modelPath: string): Promise<ModelData> {
    const signedUrl = await getSignedUrl(modelPath);
    return new Promise<ModelData>((resolve, reject) => {
        const loader = new GLTFLoader();
        console.log(`signed urL: ${signedUrl}`);
        console.log(`Loading glTF model from: ${modelPath}`);

        loader.load(
            signedUrl,
            // onLoad callback
            (gltf: GLTF) => {
                console.log('glTF model loaded successfully');

                // Hide loading overlay
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                }

                const model = gltf.scene;
                scene.add(model);

                // Apply flat shading to ignore imported normals
                model.traverse((child: any) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        const material = mesh.material as THREE.Material & { userData?: { isShared?: boolean } };

                        // Clone material if it's shared to avoid affecting other meshes
                        if (material.userData?.isShared) {
                            mesh.material = material.clone();
                        }

                        const meshMaterial = mesh.material as THREE.MeshStandardMaterial;
                        meshMaterial.flatShading = true;
                        meshMaterial.side = THREE.DoubleSide; // Render both sides
                        meshMaterial.needsUpdate = true;
                    }
                });

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
            (xhr: ProgressEvent) => {
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
            (error: unknown) => {
                console.error('Error loading glTF model:', error);
                reject(error);
            }
        );
    });
}
