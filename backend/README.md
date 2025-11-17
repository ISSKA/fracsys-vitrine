# FracSYS Backend API

A simple Node.js/Express backend that provides file size information for 3D models.

## Endpoints

### GET /api/model-sizes
Returns the sizes of all available 3D models in megabytes.

**Response:**
```json
{
  "voxels.gltf": 486,
  "fracture_scene.gltf": 31
}
```

### GET /api/model-sizes/:filename
Returns the size of a specific model.

**Example:** `/api/model-sizes/voxels.gltf`

**Response:**
```json
{
  "filename": "voxels.gltf",
  "sizeMB": 486
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Running Locally

### Prerequisites
- Node.js 18 or higher

### Installation
```bash
cd backend
npm install
```

### Start the server
```bash
npm start
```

The server will run on `http://localhost:3000`.

## Running with Docker

The backend is included in the docker-compose setup:

```bash
docker-compose up -d
```

This will:
- Build the backend container
- Mount the models directory as read-only
- Expose the API on port 3000

## Configuration

The models directory path is automatically detected:
- In Docker: `/app/models` (mounted from `./html/models`)
- Locally: `../html/models` (relative path)
