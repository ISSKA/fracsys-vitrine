import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import Presets from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator/Presets';
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';
import { setupFileLoader, type FileLoaderAPI, type LayerConfig } from './fracture_zone_loader.js';
import { initializeDamageZoneLoader } from './damage_zone_loader.js';
import { setupBackgroundToggle } from '../background-toggle';

// ============================================================================
// Constants
// ============================================================================

const REPRESENTATION_MODES = {
  WIREFRAME: 1,
  SURFACE: 2
} as const;

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
// State
// ============================================================================

let wireframeMode = false;

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

function positionTooltip(element: HTMLElement, mousePos: { x: number; y: number }): void {
  // Convert VTK.js device pixels to CSS pixels
  const dpr = window.devicePixelRatio || 1;
  const cssX = mousePos.x / dpr;
  const cssY = mousePos.y / dpr;

  // VTK.js uses bottom-left origin, CSS uses top-left, so invert Y
  let left = cssX + TOOLTIP_OFFSET;
  let top = window.innerHeight - cssY + TOOLTIP_OFFSET;

  // Keep tooltip within viewport
  const rect = element.getBoundingClientRect();

  if (left + rect.width > window.innerWidth) {
    left = cssX - rect.width - TOOLTIP_OFFSET;
  }

  if (top + rect.height > window.innerHeight) {
    top = window.innerHeight - cssY - rect.height - TOOLTIP_OFFSET;
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
    text += `<br>Q: ${qValue.toPrecision(3)} m<sup>3</sup>/s`;
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

function createLayerCheckboxes(): void {
  const container = document.getElementById('layerCheckboxes');
  if (!container) return;

  container.innerHTML = '';

  fileLoader.LAYERS.forEach((layerDef: LayerConfig) => {
    const div = document.createElement('div');
    div.style.marginBottom = '5px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer-${layerDef.id}`;
    checkbox.checked = layerDef.defaultVisible;
    checkbox.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      fileLoader.setLayerVisibility(layerDef.id, target.checked);
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = layerDef.label;
    label.style.marginLeft = '5px';

    div.appendChild(checkbox);
    div.appendChild(label);
    container.appendChild(div);
  });

  const buttonRow = document.createElement('div');
  buttonRow.style.marginTop = '6px';

  const selectBtn = document.createElement('button');
  selectBtn.textContent = 'Select all';
  selectBtn.addEventListener('click', () => {
    fileLoader.LAYERS.forEach((layerDef: LayerConfig) => {
      fileLoader.setLayerVisibility(layerDef.id, true);
      const cb = document.getElementById(`layer-${layerDef.id}`) as HTMLInputElement | null;
      if (cb) cb.checked = true;
    });
  });

  const deselectBtn = document.createElement('button');
  deselectBtn.textContent = 'Deselect all';
  deselectBtn.addEventListener('click', () => {
    fileLoader.LAYERS.forEach((layerDef: LayerConfig) => {
      fileLoader.setLayerVisibility(layerDef.id, false);
      const cb = document.getElementById(`layer-${layerDef.id}`) as HTMLInputElement | null;
      if (cb) cb.checked = false;
    });
  });

  buttonRow.appendChild(selectBtn);
  buttonRow.appendChild(deselectBtn);
  container.appendChild(buttonRow);
}

// Initialize layer checkboxes
createLayerCheckboxes();

const layerControlsToggle = document.getElementById('layerControlsToggle');
const layerCheckboxes = document.getElementById('layerCheckboxes');
layerControlsToggle?.addEventListener('click', () => {
  layerControlsToggle.classList.toggle('collapsed');
  layerCheckboxes?.classList.toggle('collapsed');
});

// Expose downloadFromCloud to window for HTML button onclick
window.downloadFromCloud = fileLoader.downloadAllLayersFromCloud;

// ============================================================================
// Interaction Handlers
// ============================================================================

function handleClick(callData: any): void {
  if (!fileLoader.isInitialized()) return;

  const pos = callData.position;
  const point = [pos.x, pos.y, 0.0];

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
      displayMetadata(pickedSource, cellId, pos);
    } else {
      hideMetadata();
    }
  } else {
    hideMetadata();
  }
}

function displayMetadata(source: any, cellId: number, mousePos: { x: number; y: number }): void {
  const cellData = source.getCellData();
  const metadataDiv = document.getElementById('metadata');
  if (!metadataDiv) return;

  let message = buildMetadataText(cellId, cellData)
  if (message !== null) {
      metadataDiv.innerHTML = message;
    metadataDiv.style.display = 'block';
  } else {
    return;
  }
  positionTooltip(metadataDiv, mousePos);
}

// Register click handler
interactor.onLeftButtonPress((callData: any) => {
  const isDragging = callData.controlKey || callData.shiftKey;
  if (!isDragging) {
    handleClick(callData);
  }
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

window.toggleWireframe = function(): void {
  if (fileLoader.isInitialized()) {
    wireframeMode = !wireframeMode;
    const mode = wireframeMode ? REPRESENTATION_MODES.WIREFRAME : REPRESENTATION_MODES.SURFACE;

    // Apply wireframe mode to all actors
    for (const layerId in fileLoader.layers) {
      const layer = fileLoader.layers[layerId];
      layer.actor.getProperty().setRepresentation(mode);
    }

    renderWindow.render();
  }
};

// ============================================================================
// Initialization
// ============================================================================

// Initialize damage zone loader
initializeDamageZoneLoader({ renderer, renderWindow, fileLoader });

// Wire up the control buttons. These used to be inline onclick attributes, which
// a Content-Security-Policy without 'unsafe-inline' blocks. The window.* functions
// are resolved at click time, exactly as the attributes did.
type Dataset = 'fracture' | 'damage';

const fractureZoneButton = document.getElementById('btn-fracture-zone') as HTMLButtonElement | null;
const damageZoneButton = document.getElementById('btn-damage-zone') as HTMLButtonElement | null;
const datasetSelector = document.getElementById('dataset-selector');
const datasetStatus = document.getElementById('dataset-status');
let displayedDataset: Dataset | null = null;

function datasetLabel(dataset: Dataset): string {
  return dataset === 'fracture' ? 'Fracture Zone' : 'Damage Zone';
}

function setDisplayedDataset(dataset: Dataset | null): void {
  displayedDataset = dataset;
  fractureZoneButton?.setAttribute('aria-pressed', String(dataset === 'fracture'));
  damageZoneButton?.setAttribute('aria-pressed', String(dataset === 'damage'));
}

function setDatasetControlsLoading(isLoading: boolean): void {
  if (fractureZoneButton) fractureZoneButton.disabled = isLoading;
  if (damageZoneButton) damageZoneButton.disabled = isLoading;
  datasetSelector?.setAttribute('aria-busy', String(isLoading));
  datasetStatus?.classList.toggle('is-loading', isLoading);
}

async function displayDataset(dataset: Dataset): Promise<void> {
  if (dataset === displayedDataset) return;

  setDisplayedDataset(null);
  setDatasetControlsLoading(true);
  if (datasetStatus) datasetStatus.textContent = `Loading ${datasetLabel(dataset)}…`;

  let loaded = false;
  try {
    loaded = await (dataset === 'fracture'
      ? window.showFractureZone?.()
      : window.showDamageZone?.()) ?? false;
  } catch (error) {
    console.error(`Failed to display ${datasetLabel(dataset)}:`, error);
  }

  setDatasetControlsLoading(false);
  if (loaded) {
    setDisplayedDataset(dataset);
    if (datasetStatus) datasetStatus.textContent = `Showing: ${datasetLabel(dataset)}`;
  } else if (datasetStatus) {
    datasetStatus.textContent = `Could not load ${datasetLabel(dataset)}. Select a dataset to retry.`;
  }
}

fractureZoneButton?.addEventListener('click', () => void displayDataset('fracture'));
damageZoneButton?.addEventListener('click', () => void displayDataset('damage'));
document.getElementById('btn-reset-camera')?.addEventListener('click', () => window.resetCamera?.());
document.getElementById('btn-toggle-wireframe')?.addEventListener('click', () => window.toggleWireframe?.());

// Load the default dataset immediately so the viewer is populated on startup.
void displayDataset('fracture');

// File input listener is set up in fracture_zone_loader.ts
