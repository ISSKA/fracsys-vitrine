import * as THREE from 'three';

interface MousePosition {
    x: number;
    y: number;
}

/**
 * Setup mouse controls for rotating, panning, and zooming
 */
export function setupMouseControls(
    canvas: HTMLCanvasElement,
    object: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    onInteraction: () => void
): void {
    setupRotationControls(canvas, object, onInteraction);
    setupPanControls(canvas, camera, onInteraction);
    setupZoomControls(canvas, camera, onInteraction);
}

/**
 * Setup mouse drag controls for rotating with left mouse button
 * Left button: Rotate X/Y axes
 * Shift + Left button: Rotate Z-axis
 */
function setupRotationControls(
    canvas: HTMLCanvasElement,
    object: THREE.Object3D,
    onInteraction: () => void
): void {
    let isDragging = false;
    let previousMousePosition: MousePosition = { x: 0, y: 0 };
    let isShiftPressed = false;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 0) { // Left mouse button
            isDragging = true;
            isShiftPressed = e.shiftKey;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            if (isShiftPressed) {
                // Rotate around Z-axis when Shift is pressed
                object.rotation.z += deltaX * 0.01;
            } else {
                // Rotate around X/Y axes normally
                object.rotation.y += deltaX * 0.01;
                object.rotation.x += deltaY * 0.01;
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
            onInteraction();
        }
    });

    canvas.addEventListener('mouseup', (e: MouseEvent) => {
        if (e.button === 0) {
            isDragging = false;
            isShiftPressed = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        isShiftPressed = false;
    });
}

/**
 * Setup mouse drag controls for panning with right mouse button
 */
function setupPanControls(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    onInteraction: () => void
): void {
    let isPanning = false;
    let previousMousePosition: MousePosition = { x: 0, y: 0 };
    const PANSPEED = 10;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 2) { // Right mouse button
            isPanning = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
            e.preventDefault(); // Prevent context menu
        }
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (isPanning) {
            const deltaX = PANSPEED * (e.clientX - previousMousePosition.x);
            const deltaY = PANSPEED * (e.clientY - previousMousePosition.y);

            // Pan camera based on mouse movement
            const panSpeed = 0.5;
            camera.position.x -= deltaX * panSpeed;
            camera.position.y += deltaY * panSpeed;

            previousMousePosition = { x: e.clientX, y: e.clientY };
            onInteraction();
        }
    });

    canvas.addEventListener('mouseup', (e: MouseEvent) => {
        if (e.button === 2) {
            isPanning = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isPanning = false;
    });

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e: Event) => {
        e.preventDefault();
    });
}

/**
 * Setup mouse wheel controls for zooming the camera
 */
function setupZoomControls(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    onInteraction: () => void
): void {
    const ZOOM_SPEED = 10;
    const MIN_ZOOM = 100;
    const MAX_ZOOM = 50000;

    canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * ZOOM_SPEED;
        camera.position.z += delta;

        // Clamp camera position to prevent going too close or too far
        camera.position.z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.position.z));

        onInteraction();
    }, { passive: false });
}
