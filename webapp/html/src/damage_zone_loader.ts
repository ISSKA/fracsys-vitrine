/**
 * Damage Zone Loader
 * Handles loading and switching between fracture zone and damage zone visualizations
 */

import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import type { FileLoaderAPI } from './fracture_zone_loader.js';

// ============================================================================
// Constants
// ============================================================================

const API_ENDPOINT = 'https://xhx5lqfvq1.execute-api.eu-central-1.amazonaws.com/prod/download-url';
const DAMAGE_ZONE_FILENAME = 'damage_zone.vtp';

// ============================================================================
// Types
// ============================================================================

interface DamageZoneLoaderDeps {
  renderer: any;
  renderWindow: any;
  fileLoader: FileLoaderAPI;
}

// ============================================================================
// State
// ============================================================================

let deps: DamageZoneLoaderDeps | null = null;
let damageZoneActor: any = null;
let damageZoneLoaded = false;

// ============================================================================
// Zone Management
// ============================================================================

/**
 * Shows the fracture zone and displays layer controls
 */
export function showFractureZone(): void {
  const layerControls = document.getElementById('layerControls');
  if (layerControls) {
    layerControls.style.display = 'block';
  }

  if (!deps) return;

  // Hide damage zone actor
  if (damageZoneActor) {
    damageZoneActor.setVisibility(false);
  }

  if (deps.fileLoader.isInitialized()) {
    // Restore fracture zone layer visibility
    for (const layerId in deps.fileLoader.layers) {
      const layer = deps.fileLoader.layers[layerId];
      layer.actor.setVisibility(layer.visible);
    }
    deps.renderer.resetCamera();
    deps.renderWindow.render();
  } else {
    deps.fileLoader.downloadAllLayersFromCloud();
  }
}

/**
 * Shows the damage zone and hides layer controls
 */
export async function showDamageZone(): Promise<void> {
  if (!deps) return;

  const layerControls = document.getElementById('layerControls');
  if (layerControls) {
    layerControls.style.display = 'none';
  }

  // Hide all fracture zone actors
  for (const layerId in deps.fileLoader.layers) {
    deps.fileLoader.layers[layerId].actor.setVisibility(false);
  }

  if (!damageZoneLoaded) {
    try {
      await loadDamageZoneFromCloud();
      damageZoneLoaded = true;
    } catch (error) {
      console.error('Error loading damage zone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load damage zone: ${errorMessage}`);
      return;
    }
  } else if (damageZoneActor) {
    damageZoneActor.setVisibility(true);
  }

  deps.renderer.resetCamera();
  deps.renderWindow.render();
}

async function loadDamageZoneFromCloud(): Promise<void> {
  if (!deps) return;

  // Step 1: Get signed URL from API
  const response = await fetch(`${API_ENDPOINT}?key=${DAMAGE_ZONE_FILENAME}`);
  if (!response.ok) {
    throw new Error(`Failed to get signed URL: ${response.statusText}`);
  }

  const data = await response.json() as { signedUrl: string };

  // Step 2: Download the file from S3
  const fileResponse = await fetch(data.signedUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to download ${DAMAGE_ZONE_FILENAME}: ${fileResponse.statusText}`);
  }

  const fileContents = await fileResponse.arrayBuffer();

  // Step 3: Parse and create actor
  const reader = vtkXMLPolyDataReader.newInstance();
  reader.parseAsArrayBuffer(fileContents);
  const source = reader.getOutputData(0);

  const mapper = vtkMapper.newInstance();
  mapper.setInputData(source);

  damageZoneActor = vtkActor.newInstance();
  damageZoneActor.setMapper(mapper);

  deps.renderer.addActor(damageZoneActor);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initializes the damage zone loader with required VTK dependencies.
 * Exposes zone-switching functions to the window object for HTML onclick handlers.
 */
export function initializeDamageZoneLoader(dependencies: DamageZoneLoaderDeps): void {
  deps = dependencies;
  window.showFractureZone = showFractureZone;
  window.showDamageZone = showDamageZone;
}
