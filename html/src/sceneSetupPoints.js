import * as THREE from 'three';

/**
 * Initialize and configure the Three.js scene, camera, renderer, and objects
 */
export async function setupScenePoints() {
    const pointFileName = "models/unique_centers.txt"
    // const pointFileName = "models/intersections.txt"
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    document.body.appendChild(renderer.domElement);

    const camera = createCamera();
    const scene = createScene();
    const pointsData = await loadPoints(scene, pointFileName);

    return { renderer, camera, scene, points: pointsData.points, canvas };
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
    camera.position.z = 10000;
    return camera;
}

/**
 * Create the scene with lighting
 */
function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x625d5a); 

    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.DirectionalLight( color, intensity );
    light.position.set( - 1, 2, 4 );
    scene.add( light );

    scene.add(new THREE.AmbientLight("#fff", 4));

    return scene;
}

/**
 * Load and display 3D points from a file
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {string} filePath - Path to the coordinates file
 */
export async function loadPoints(scene, filePath) {
    try {
        const response = await fetch(filePath);
        const text = await response.text();
        // Parse the coordinates
        const lines = text.trim().split('\n');
        const vertices = [];

        lines.forEach(line => {
            const coords = line.split(',').map(Number);
            if (coords.length === 3 && !coords.some(isNaN)) {
                vertices.push(coords[0], coords[1], coords[2]);
            
            }
        });

        // Create geometry from vertices
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Create points material with depth shading
        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointSize: { value: 1.0 },
                nearColor: { value: new THREE.Color(0xffffff) },
                farColor: { value: new THREE.Color(0x0a0a0a) },
                nearDistance: { value: 100.0 },
                farDistance: { value: 50000.0 }
            },
            vertexShader: `
                uniform float pointSize;
                uniform vec3 nearColor;
                uniform vec3 farColor;
                uniform float nearDistance;
                uniform float farDistance;
                varying vec3 vColor;

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = pointSize;

                    // Calculate depth-based color
                    float depth = -mvPosition.z;
                    float mixFactor = clamp((depth - nearDistance) / (farDistance - nearDistance), 0.0, 1.0);
                    vColor = mix(nearColor, farColor, mixFactor);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `
        });

        // Create points object
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // Calculate bounding box to center camera
        geometry.computeBoundingBox();
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());

        return { points, center, boundingBox: geometry.boundingBox };
    } catch (error) {
        console.error('Error loading points:', error);
        throw error;
        }
}