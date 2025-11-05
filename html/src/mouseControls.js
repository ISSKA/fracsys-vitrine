/**
 * Setup mouse controls for rotating, panning, and zooming
 */
export function setupMouseControls(canvas, object, camera, onInteraction) {
    setupRotationControls(canvas, object, onInteraction);
    setupPanControls(canvas, camera, onInteraction);
    setupZoomControls(canvas, camera, onInteraction);
}

/**
 * Setup mouse drag controls for rotating with left mouse button
 * Left button: Rotate X/Y axes
 * Shift + Left button: Rotate Z-axis
 */
function setupRotationControls(canvas, object, onInteraction) {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let isShiftPressed = false;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            isDragging = true;
            isShiftPressed = e.shiftKey;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
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

    canvas.addEventListener('mouseup', (e) => {
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
function setupPanControls(canvas, camera, onInteraction) {
    let isPanning = false;
    let previousMousePosition = { x: 0, y: 0 };
    const PANSPEED = 10;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // Right mouse button
            isPanning = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
            e.preventDefault(); // Prevent context menu
        }
    });

    canvas.addEventListener('mousemove', (e) => {
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

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            isPanning = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isPanning = false;
    });

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

/**
 * Setup mouse wheel controls for zooming the camera
 */
function setupZoomControls(canvas, camera, onInteraction) {
    const ZOOM_SPEED = 10;
    const MIN_ZOOM = 100;
    const MAX_ZOOM = 50000;

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * ZOOM_SPEED;
        console.log('Camera z:', camera.position.z, 'Delta:', delta);
        camera.position.z += delta;

        // Clamp camera position to prevent going too close or too far
        camera.position.z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.position.z));

        onInteraction();
    }, { passive: false });
}
