import * as THREE from 'three';
import { appConfig } from './config';
import { setupBackgroundToggle } from './background-toggle';
import { setupViewerTabs, type ViewerTabDefinition } from './viewer-tabs';
import { TAB_LAYER_DEFAULTS, VIEWER_LAYERS } from './layers.config';
import { SceneManager } from './rendering/SceneManager';
import { VoxelGrid } from './grid/VoxelGrid';
import { generateSampleGrid, parseGridCSV } from './grid/gridLoader';
import { VoxelRenderer } from './rendering/VoxelRenderer';
import { InletFlowRenderer } from './rendering/InletFlowRenderer';
import { VtpLayerManager } from './rendering/VtpLayerManager';
import { loadTopographyIntoScene, setTopographyVisible } from './rendering/TopographyLayer';

const FLOW_SPEED_FACTOR = 16;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const scene = new SceneManager(canvas);
const vtpLayers = new VtpLayerManager(scene.scene);
let grid: VoxelGrid | undefined;
let voxels: VoxelRenderer | undefined;
let particles: InletFlowRenderer | undefined;
let activeTab: ViewerTabDefinition['id'] = 'fracture-network';
let pointerDown: { x: number; y: number } | null = null;
let lastTime = performance.now();
let isPaused = false;

setupBackgroundToggle((background) => {
  scene.setBackground(background === 'black' ? 0x000000 : 0xffffff);
});

document.getElementById('btn-reset-camera')?.addEventListener('click', () => scene.resetView());

function getLayerCheckbox(id: string): HTMLInputElement | null {
  return document.getElementById(`layer-${id}`) as HTMLInputElement | null;
}

function setLayerVisibility(id: string, visible: boolean): void {
  const layer = VIEWER_LAYERS.find((item) => item.id === id);
  if (!layer) return;
  if (layer.kind === 'mesh') vtpLayers.setLayerVisibility(id, visible);
  if (layer.kind === 'voxels') voxels?.setVisible(visible);
  if (layer.kind === 'damage-zone') voxels?.setDamageZoneVisible(visible);
  if (layer.kind === 'particles') particles?.setParticlesVisible(visible);
  if (layer.kind === 'topography') setTopographyVisible(visible);
}

function createLayerControls(tabId: ViewerTabDefinition['id']): void {
  const container = document.getElementById('layerCheckboxes');
  if (!container) return;
  container.replaceChildren();
  const defaults = TAB_LAYER_DEFAULTS[tabId];
  for (const layer of VIEWER_LAYERS) {
    const row = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer-${layer.id}`;
    checkbox.checked = defaults.includes(layer.id);
    checkbox.addEventListener('change', () => setLayerVisibility(layer.id, checkbox.checked));
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = layer.label;
    row.append(checkbox, label);
    container.appendChild(row);
  }
}

function applyPreset(tabId: ViewerTabDefinition['id']): void {
  activeTab = tabId;
  const defaults = TAB_LAYER_DEFAULTS[tabId];
  createLayerControls(tabId);
  vtpLayers.applyPreset(defaults);
  voxels?.setVisible(defaults.includes('voxels'));
  voxels?.setDamageZoneVisible(defaults.includes('damage-zone'));
  particles?.setParticlesVisible(defaults.includes('particles'));
  particles?.setParticleCounterVisible(tabId === 'dynamic-flow' && (document.getElementById('layer-particle-counter') as HTMLInputElement).checked);
  setTopographyVisible(defaults.includes('topography'));
  vtpLayers.setScalarBarsVisible(tabId === 'flow-network');
}

function metadataText(source: any, cellId: number): string | null {
  const cellData = source.getCellData();
  const values: string[] = [];
  const h = cellData.getArrayByName('H')?.getData()?.[cellId];
  const q = cellData.getArrayByName('Q')?.getData()?.[cellId];
  const type = cellData.getArrayByName('sim_type')?.getData()?.[cellId];
  if (typeof h === 'number' && Number.isFinite(h)) values.push(`Hydraulic head: ${h.toPrecision(3)} m`);
  if (typeof q === 'number' && Number.isFinite(q)) values.push(`Discharge: ${q.toPrecision(3)} m³/s`);
  if (typeof type === 'number' && Number.isFinite(type)) values.push(`Type: ${type}`);
  return values.length ? values.join('<br>') : null;
}

function hideMetadata(): void {
  const metadata = document.getElementById('metadata');
  if (metadata) metadata.style.display = 'none';
}

function pickMetadata(clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect();
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  ), scene.camera);
  const picked = vtpLayers.pick(raycaster);
  const metadata = document.getElementById('metadata');
  if (!metadata || !picked) {
    hideMetadata();
    return;
  }
  const text = metadataText(picked.source, picked.cellId);
  if (!text) {
    hideMetadata();
    return;
  }
  metadata.innerHTML = `<button class="metadata-close" type="button" aria-label="Close metadata">×</button><strong>Metadata:</strong><br>${text}`;
  metadata.style.left = `${Math.min(clientX + 8, window.innerWidth - 320)}px`;
  metadata.style.top = `${Math.min(clientY + 8, window.innerHeight - 120)}px`;
  metadata.style.display = 'block';
}

const btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
const btnResetSim = document.getElementById('btn-reset-sim') as HTMLButtonElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
const inletEmissionSlider = document.getElementById('inlet-emission-slider') as HTMLInputElement;
const emissionRates = [0, 1, 2, 4] as const;
const emissionRateLabels = ['Off', 'Low', 'Medium', 'High'] as const;

function selectedEmissionRate(): number {
  return emissionRates[Number(inletEmissionSlider.value)] ?? emissionRates[3];
}

function updateEmissionRate(): void {
  const setting = Number(inletEmissionSlider.value);
  inletEmissionSlider.setAttribute(
    'aria-valuetext',
    emissionRateLabels[setting] ?? emissionRateLabels[3],
  );
  particles?.setEmissionRate(selectedEmissionRate());
}

inletEmissionSlider.addEventListener('input', updateEmissionRate);
let speedMultiplier = parseFloat(speedSlider.value) || 1;

function updateSpeedLabel(): void {
  speedValue.textContent = `${speedMultiplier.toFixed(2)}×`;
}
updateSpeedLabel();

// `input`, not `change`: `change` only fires on release, which feels broken.
speedSlider.addEventListener('input', () => {
  speedMultiplier = parseFloat(speedSlider.value) || 1;
  updateSpeedLabel();
});

function updatePlayPauseButton(): void {
  btnPlayPause.textContent = isPaused ? 'Resume' : 'Pause';
}

btnPlayPause.addEventListener('click', () => {
  isPaused = !isPaused;
  updatePlayPauseButton();
});

btnResetSim.addEventListener('click', () => {
  particles?.reset();
});

canvas.addEventListener('pointerdown', (event) => { pointerDown = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (distance <= 5) pickMetadata(event.clientX, event.clientY);
});
canvas.addEventListener('pointercancel', () => { pointerDown = null; });
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('.metadata-close')) hideMetadata();
  else if (!target.closest('#metadata') && !target.closest('#canvas')) hideMetadata();
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hideMetadata(); });

document.getElementById('btn-select-all-layers')?.addEventListener('click', () => {
  for (const layer of VIEWER_LAYERS) {
    const checkbox = getLayerCheckbox(layer.id);
    if (checkbox) { checkbox.checked = true; setLayerVisibility(layer.id, true); }
  }
});
document.getElementById('btn-deselect-all-layers')?.addEventListener('click', () => {
  for (const layer of VIEWER_LAYERS) {
    const checkbox = getLayerCheckbox(layer.id);
    if (checkbox) { checkbox.checked = false; setLayerVisibility(layer.id, false); }
  }
});

document.addEventListener('viewer-tab-change', (event) => {
  const tab = (event as CustomEvent<ViewerTabDefinition>).detail;
  applyPreset(tab.id);
});

const particleCounter = document.getElementById('layer-particle-counter') as HTMLInputElement;
particleCounter?.addEventListener('change', () => {
  particles?.setParticleCounterVisible(activeTab === 'dynamic-flow' && particleCounter.checked);
});

async function loadGrid(data: ReturnType<typeof parseGridCSV>): Promise<void> {
  grid = new VoxelGrid(data);
  vtpLayers.setOrigin(grid.origin);
  voxels = new VoxelRenderer(grid);
  voxels.addToScene(scene.scene);
  particles = new InletFlowRenderer(grid);
  particles.addToScene(scene.scene);

  const center = grid.getCenter();
  const radius = grid.getRadius();
  scene.setInitialView(center, new THREE.Vector3(center.x + radius * 1.5, center.y + radius * 1.2, center.z + radius * 1.5));
  scene.addAxes(new THREE.Vector3(0, 0, 0), radius * 0.4);
  applyPreset(activeTab);

  loadTopographyIntoScene(scene.scene, `${import.meta.env.BASE_URL}data/topography.vtp`, `${import.meta.env.BASE_URL}data/topography.pgw`, `${import.meta.env.BASE_URL}data/topography.png`, grid.origin)
    .catch((error) => console.warn('Topography unavailable:', error));
}

async function start(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${appConfig.flow.defaultGridFilename}`);
    if (!response.ok) throw new Error(response.statusText);
    const gridData = parseGridCSV(await response.text());
    grid = new VoxelGrid(gridData);
    vtpLayers.setOrigin(grid.origin);
    await vtpLayers.loadAll();
    await loadGrid(gridData);
  } catch (error) {
    console.warn('Using generated sample grid:', error);
    await loadGrid(generateSampleGrid(6, 30, 60) as ReturnType<typeof parseGridCSV>);
  }
}

setupViewerTabs();
void start();

function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (particles && !isPaused) particles.update(dt * speedMultiplier / FLOW_SPEED_FACTOR, dt)
  scene.render();
}
animate();