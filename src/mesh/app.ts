import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import Presets from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator/Presets';
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';
import { setupFileLoader, type FileLoaderAPI } from './fracture_zone_loader.js';
import { VIEWER_LAYERS, TAB_LAYER_DEFAULTS, type ViewerLayerConfig } from '../layers.config.js';
import { setupBackgroundToggle } from '../background-toggle';
import type { ViewerTabDefinition } from '../viewer-tabs';

// ============================================================================
// Constants
// ============================================================================

const TOOLTIP_OFFSET = 5;
const PICKER_TOLERANCE = 0.1;

// ============================================================================
// VTK.js Setup
// ============================================================================

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  container: document.getElementById('container'),
  background: [1, 1, 1]
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const interactor = renderWindow.getInteractor();

setupBackgroundToggle((background) => {
  const channel = background === 'black' ? 0 : 1;
  renderer.setBackground(channel, channel, channel);
  renderWindow.render();
});

// Configure interaction style
const interactorStyle = vtkInteractorStyleManipulator.newInstance();
interactor.setInteractorStyle(interactorStyle);

const interactorStyleDefinitions = [
  { type: 'rotate', options: { button: 1 } },
  { type: 'roll', options: { button: 1, shift: true } },
  { type: 'pan', options: { button: 3 } },
  { type: 'zoom', options: { dragEnabled: false, scrollEnabled: true } }
];

Presets.applyDefinitions(interactorStyleDefinitions, interactorStyle);

// The rotate and roll manipulators pivot around the style's centerOfRotation,
// which defaults to the world origin. The .vtp models are written in real-world
// coordinates that can sit thousands of units away from it, so dragging swung
// them straight out of the viewport. Track the camera's focal point instead:
// resetCamera() places it at the centre of the visible bounds and panning carries
// it along, so the pivot follows the model wherever the next upload puts it.
const camera = renderer.getActiveCamera();

interface ViewerCameraChange {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov: number;
  origin: { x: number; y: number; z: number };
  voxelSize: number;
}

function flowToVtk(point: { x: number; y: number; z: number }, origin: ViewerCameraChange['origin']): [number, number, number] {
  return [
    origin.x + point.z,
    origin.y + point.x,
    origin.z + point.y,
  ];
}

document.addEventListener('viewer-camera-change', (event) => {
  const state = (event as CustomEvent<ViewerCameraChange>).detail;
  const position = flowToVtk(state.position, state.origin);
  const focalPoint = flowToVtk(state.target, state.origin);
  const viewUp = flowToVtk(state.up, { x: 0, y: 0, z: 0 });
  camera.setPosition(...position);
  camera.setFocalPoint(...focalPoint);
  camera.setViewUp(...viewUp);
  camera.setViewAngle(state.fov);
  renderer.resetCameraClippingRange();
  renderWindow.render();
});

function syncCenterOfRotation(): void {
  interactorStyle.setCenterOfRotation(camera.getFocalPoint());
}

camera.onModified(syncCenterOfRotation);
syncCenterOfRotation();

// Setup cell picker
const picker = vtkCellPicker.newInstance();
picker.setPickFromList(1);
picker.setTolerance(PICKER_TOLERANCE);

// ============================================================================
// Helper Functions
// ============================================================================

function hideMetadata(): void {
  const metadataDiv = document.getElementById('metadata');
  if (metadataDiv) {
    metadataDiv.style.display = 'none';
  }
}

function getCellValue(array: any | null, cellId: number): number | null {
  return array ? array.getData()[cellId] : null;
}

function positionTooltip(element: HTMLElement, clientX: number, clientY: number): void {
  let left = clientX + TOOLTIP_OFFSET;
  let top = clientY + TOOLTIP_OFFSET;

  // Keep tooltip within viewport
  const rect = element.getBoundingClientRect();

  if (left + rect.width > window.innerWidth) {
    left = clientX - rect.width - TOOLTIP_OFFSET;
  }

  if (top + rect.height > window.innerHeight) {
    top = clientY - rect.height - TOOLTIP_OFFSET;
  }

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function buildMetadataText(cellId: number, cellData: any): string|null {
  const hArray = cellData.getArrayByName('H');
  const qArray = cellData.getArrayByName('Q');
  const typeArray = cellData.getArrayByName('sim_type');

  let text = '<strong>Metadata:</strong>';
  let hasData = false;

  const hValue = getCellValue(hArray, cellId);
  if (hValue !== null && !isNaN(hValue)) {
    text += `<br>H: ${hValue.toPrecision(3)} m`;
    hasData = true;
  }

  const qValue = getCellValue(qArray, cellId);
  if (qValue !== null && !isNaN(qValue)) {
    text += `<br>Discharge: ${qValue.toPrecision(3)} m<sup>3</sup>/s`;
    hasData = true;
  }

  const tValue = getCellValue(typeArray, cellId);
  if (tValue !== null && !isNaN(tValue)) {
    text += `<br>Type: ${tValue}`;
    hasData = true;
  }

  return hasData ? text : null;
}

// ============================================================================
// File Loading Setup
// ============================================================================

const fileLoader: FileLoaderAPI = setupFileLoader({
  renderer,
  picker,
  renderWindow
});

// ============================================================================
// Layer Controls
// ============================================================================

function createLayerCheckboxes(tabId: keyof typeof TAB_LAYER_DEFAULTS): void {
  const container = document.getElementById('layerCheckboxes');
  if (!container) return;

  container.innerHTML = '';

  const defaults = TAB_LAYER_DEFAULTS[tabId];

  VIEWER_LAYERS.forEach((layerDef: ViewerLayerConfig) => {
    const div = document.createElement('div');
    div.style.marginBottom = '5px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer-${layerDef.id}`;
    checkbox.checked = defaults.includes(layerDef.id);

    checkbox.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;

      document.dispatchEvent(new CustomEvent('viewer-layer-change', {
        detail: {
          id: layerDef.id,
          visible: target.checked,
        },
      }));
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = layerDef.label;
    label.style.marginLeft = '5px';

    div.appendChild(checkbox);
    div.appendChild(label);
    container.appendChild(div);
  });
}

function applyMeshLayerDefaults(tabId: keyof typeof TAB_LAYER_DEFAULTS): void {
  const visibleLayers = TAB_LAYER_DEFAULTS[tabId];
  VIEWER_LAYERS
    .filter((layer) => layer.kind === 'mesh')
    .forEach((layer) => fileLoader.setLayerVisibility(layer.id, visibleLayers.includes(layer.id)));
}

// Initialize layer checkboxes
const initialTab = (document.body.dataset.activeTab ?? 'fracture-network') as keyof typeof TAB_LAYER_DEFAULTS;
createLayerCheckboxes(initialTab);

// Expose downloadFromCloud to window for HTML button onclick
window.downloadFromCloud = fileLoader.downloadAllLayersFromCloud;

// ============================================================================
// Interaction Handlers
// ============================================================================

function handlePick(clientX: number, clientY: number): void {
  if (!fileLoader.isInitialized()) return;

  const canvas = document.querySelector<HTMLCanvasElement>('#container canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const point = [
    (clientX - rect.left) * dpr,
    (rect.bottom - clientY) * dpr,
    0.0,
  ];

  picker.pick(point, renderer);

  if (picker.getActors().length > 0) {
    const cellId = picker.getCellId();
    const pickedActor = picker.getActors()[0];

    // Find which layer this actor belongs to
    let pickedSource: any = null;
    for (const layerId in fileLoader.layers) {
      const layer = fileLoader.layers[layerId];
      if (layer.actor === pickedActor && layer.visible) {
        pickedSource = layer.source;
        break;
      }
    }

    if (pickedSource && cellId !== -1) {
      displayMetadata(pickedSource, cellId, clientX, clientY);
    } else {
      hideMetadata();
    }
  } else {
    hideMetadata();
  }
}

function displayMetadata(source: any, cellId: number, clientX: number, clientY: number): void {
  const cellData = source.getCellData();
  const metadataDiv = document.getElementById('metadata');
  if (!metadataDiv) return;

  const message = buildMetadataText(cellId, cellData);
  if (message !== null) {
    metadataDiv.innerHTML = `<button class="metadata-close" type="button" aria-label="Close metadata">×</button>${message}`;
    metadataDiv.style.display = 'block';
  } else {
    console.log("no metadata for cell", cellId);
    return;
  }
  positionTooltip(metadataDiv, clientX, clientY);
}

document.addEventListener('viewer-pick', (event) => {
  const { clientX, clientY } = (event as CustomEvent<{ clientX: number; clientY: number }>).detail;
  handlePick(clientX, clientY);
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('.metadata-close')) {
    hideMetadata();
  } else if (!target.closest('#metadata') && !target.closest('#canvas')) {
    hideMetadata();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideMetadata();
});

document.getElementById('btn-select-all-layers')?.addEventListener('click', () => {
  VIEWER_LAYERS.forEach((layerDef) => {
    const checkbox = document.getElementById(
      `layer-${layerDef.id}`
    ) as HTMLInputElement | null;

    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    }
  });
});

document.getElementById('btn-deselect-all-layers')?.addEventListener('click', () => {
  VIEWER_LAYERS.forEach((layerDef) => {
    const checkbox = document.getElementById(
      `layer-${layerDef.id}`
    ) as HTMLInputElement | null;

    if (checkbox && checkbox.checked) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
    }
  });
});


// ============================================================================
// UI Controls
// ============================================================================

window.resetCamera = function(): void {
  if (fileLoader.isInitialized()) {
    renderer.resetCamera();
    renderWindow.render();
  }
};

// ============================================================================
// Initialization
// ============================================================================

type Dataset = 'fracture' | 'damage';
let displayedDataset: Dataset | null = null;

async function displayDataset(dataset: Dataset): Promise<void> {
  if (dataset === displayedDataset) return;

  let loaded = false;
  try {
    loaded = dataset === 'fracture'
      ? await fileLoader.downloadAllLayersFromCloud()
      : false;
  } catch (error) {
    console.error(`Failed to display ${dataset}:`, error);
  }

  if (loaded) {
    displayedDataset = dataset;
    applyMeshLayerDefaults((document.body.dataset.activeTab ?? 'fracture-network') as keyof typeof TAB_LAYER_DEFAULTS);
    fileLoader.setScalarBarsVisible(document.body.dataset.activeTab === 'flow-network');
  }
}

document.addEventListener('viewer-tab-change', (event) => {
  const tab = (event as CustomEvent<ViewerTabDefinition>).detail;
  createLayerCheckboxes(tab.id);
  applyMeshLayerDefaults(tab.id);
  if (tab.engine !== 'mesh') {
    fileLoader.setScalarBarsVisible(tab.id === 'flow-network');
    return;
  }
  void displayDataset(tab.id === 'damage-zone' ? 'damage' : 'fracture');
});

document.addEventListener('viewer-layer-change', (event) => {
  const { id, visible } = (event as CustomEvent<{ id: string; visible: boolean }>).detail;
  if (VIEWER_LAYERS.find((layer) => layer.id === id)?.kind === 'mesh') {
    fileLoader.setLayerVisibility(id, visible);
  }
});

document.getElementById('btn-reset-camera')?.addEventListener('click', () => window.resetCamera?.());

// Load the default dataset immediately so the viewer is populated on startup.
void displayDataset('fracture');
fileLoader.setScalarBarsVisible(document.body.dataset.activeTab === 'flow-network');

// File input listener is set up in fracture_zone_loader.ts
