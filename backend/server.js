const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Models directory path (mounted in Docker container, falls back to relative path for local dev)
const MODELS_DIR = fs.existsSync('/app/models')
    ? '/app/models'
    : path.join(__dirname, '../html/models');

/**
 * Get file size in megabytes
 * @param {string} filePath - Path to the file
 * @returns {number} File size in MB
 */
function getFileSizeMB(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return Math.round(stats.size / (1024 * 1024)); // Convert bytes to MB
    } catch (error) {
        console.error(`Error getting file size for ${filePath}:`, error);
        return null;
    }
}

/**
 * GET /api/model-sizes
 * Returns the sizes of all available 3D models
 */
app.get('/api/model-sizes', (req, res) => {
    const models = {
        'voxels.gltf': getFileSizeMB(path.join(MODELS_DIR, 'voxels.gltf')),
        'fracture_scene.gltf': getFileSizeMB(path.join(MODELS_DIR, 'fracture_scene.gltf'))
    };

    // Filter out models that couldn't be read
    const validModels = Object.fromEntries(
        Object.entries(models).filter(([_, size]) => size !== null)
    );

    res.json(validModels);
});

/**
 * GET /api/model-sizes/:filename
 * Returns the size of a specific model
 */
app.get('/api/model-sizes/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(MODELS_DIR, filename);

    const sizeMB = getFileSizeMB(filePath);

    if (sizeMB === null) {
        return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ filename, sizeMB });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`FracSYS backend server running on port ${PORT}`);
    console.log(`Models directory: ${MODELS_DIR}`);
});
