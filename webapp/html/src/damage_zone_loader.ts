/**
 * Damage Zone Loader
 * Handles loading and switching between fracture zone and damage zone visualizations
 */

import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { createScalarBar, DEFAULT_SCALAR_BAR_CONFIG, type ScalarBarManager } from './scalar_bar.js';
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
let sizeScalarBarManager: ScalarBarManager | null = null;

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

  // Hide damage zone actor and its scalar bar
  if (damageZoneActor) {
    damageZoneActor.setVisibility(false);
  }
  sizeScalarBarManager?.setVisibility(false);

  if (deps.fileLoader.isInitialized()) {
    // Restore fracture zone layer visibility and scalar bars
    for (const layerId in deps.fileLoader.layers) {
      const layer = deps.fileLoader.layers[layerId];
      layer.actor.setVisibility(layer.visible);
    }
    deps.fileLoader.setScalarBarsVisible(true);
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

  // Hide all fracture zone actors and their scalar bars
  for (const layerId in deps.fileLoader.layers) {
    deps.fileLoader.layers[layerId].actor.setVisibility(false);
  }
  deps.fileLoader.setScalarBarsVisible(false);

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
    setProgressLabel('Rendering\u2026');
  } else if (damageZoneActor) {
    damageZoneActor.setVisibility(true);
    sizeScalarBarManager?.setVisibility(true);
  }

  deps.renderer.resetCamera();
  deps.renderWindow.render();
  hideProgress();
}

// ============================================================================
// Progress Bar
// ============================================================================

function showProgress(): void {
  const el = document.getElementById('download-progress');
  if (el) el.style.display = 'block';
  setProgressLabel('Loading Damage Zone\u2026');
  setProgress(0);
}

function setProgressLabel(text: string): void {
  const el = document.getElementById('download-progress-label');
  if (el) el.textContent = text;
}

function setProgress(fraction: number): void {
  const fill = document.getElementById('download-progress-bar-fill');
  const pct = document.getElementById('download-progress-pct');
  const pctValue = Math.round(fraction * 100);
  if (fill) fill.style.width = `${pctValue}%`;
  if (pct) pct.textContent = `${pctValue}%`;
}

function hideProgress(): void {
  const el = document.getElementById('download-progress');
  if (el) el.style.display = 'none';
  const spinner = document.getElementById('download-progress-spinner');
  if (spinner) spinner.classList.remove('active');
}

function showSpinner(): void {
  const spinner = document.getElementById('download-progress-spinner');
  if (spinner) spinner.classList.add('active');
}

// ============================================================================
// Color Mapping
// ============================================================================

/** A color stop in 0-255 RGB. t=0 maps to the data minimum, t=1 to the maximum. */
interface ColorStop { t: number; r: number; g: number; b: number; }

/**
 * Populates a VTK color transfer function and returns a matching CSS gradient
 * string, both derived from the same 0-255 color stop definitions.
 */
function buildColorRamp(
  lut: any,
  min: number,
  max: number,
  stops: ColorStop[]
): string {
  for (const s of stops) {
    const value = min + s.t * (max - min);
    lut.addRGBPoint(value, s.r / 255, s.g / 255, s.b / 255);
  }
  // CSS gradient: top = last stop (max), bottom = first stop (min)
  const cssStops = [...stops].reverse().map(s => `rgb(${s.r},${s.g},${s.b})`).join(', ');
  return `linear-gradient(to bottom, ${cssStops})`;
}

// Edit the stops here to change the color ramp for the damage zone:
const SIZE_COLOR_STOPS: ColorStop[] = [
  { t: 0.0, r:   0, g:   0, b: 100 },  // Dark blue  — minimum size
  { t: 1.0, r: 255, g: 255, b: 255 },  // White      — maximum size
];

function applyColorMappingBySize(source: any, mapper: any): void {
  const dataArray = source.getPointData().getArrayByName('size');
  if (!dataArray) {
    console.warn("Array 'size' not found in PointData");
    return;
  }

  const [min, max] = dataArray.getRange();
  const effectiveMax = min === max ? min + 1 : max;

  const lut = vtkColorTransferFunction.newInstance();
  const gradientCss = buildColorRamp(lut, min, effectiveMax, SIZE_COLOR_STOPS);

  mapper.setLookupTable(lut);
  mapper.setScalarRange(min, effectiveMax);
  mapper.setScalarVisibility(true);
  mapper.setScalarModeToUsePointFieldData();
  mapper.setColorByArrayName('size');

  sizeScalarBarManager?.remove(null);
  sizeScalarBarManager = createScalarBar(null, lut, {
    name: 'Size [m]',
    ...DEFAULT_SCALAR_BAR_CONFIG,
    gradientCss
  });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ============================================================================
// File Loading
// ============================================================================

async function loadDamageZoneFromCloud(): Promise<void> {
  if (!deps) return;

  showProgress();
  try {
    // Step 1: Get signed URL from API
    const response = await fetch(`${API_ENDPOINT}?key=${DAMAGE_ZONE_FILENAME}`);
    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json() as { signedUrl: string };

    // Step 2: Download the file from S3, streaming to track progress
    const fileResponse = await fetch(data.signedUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download ${DAMAGE_ZONE_FILENAME}: ${fileResponse.statusText}`);
    }

    const contentLength = Number(fileResponse.headers.get('Content-Length')) || 0;
    const reader = fileResponse.body!.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength > 0) {
        setProgress(received / contentLength);
      }
    }

    setProgress(1);

    // Reassemble chunks into a single ArrayBuffer
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Step 3: Parse and create actor
    // Show spinner and yield one frame so the browser paints before the
    // synchronous parse blocks the main thread.
    setProgressLabel('Parsing (will take some time)\u2026');
    showSpinner();
    
    // Wait a bit before proceeding. This allows for the user to
    // read the message.
    await sleep(500);
    await new Promise(resolve => requestAnimationFrame(resolve));
    const vtkreader = vtkXMLPolyDataReader.newInstance();
    vtkreader.parseAsArrayBuffer(buffer.buffer);
    const source = vtkreader.getOutputData(0);

    const mapper = vtkMapper.newInstance();
    mapper.setInputData(source);

    applyColorMappingBySize(source, mapper);

    damageZoneActor = vtkActor.newInstance();
    damageZoneActor.setMapper(mapper);

    deps.renderer.addActor(damageZoneActor);
  } catch (error) {
    hideProgress();
    throw error;
  }
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
