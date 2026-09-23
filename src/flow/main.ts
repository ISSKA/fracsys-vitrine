import * as THREE from 'three';
import { generateSampleGrid, parseGridCSV } from './grid/gridLoader';
import { VoxelGrid } from './grid/VoxelGrid';
import { SceneManager } from './rendering/SceneManager';
import { VoxelRenderer } from './rendering/VoxelRenderer';
import { InletFlowRenderer } from './rendering/InletFlowRenderer';
import { GridData } from './types';
import { appConfig } from '../config';
import { setupBackgroundToggle } from '../background-toggle';
import type { ViewerTabDefinition } from '../viewer-tabs';
import { TAB_LAYER_DEFAULTS } from '../layers.config';
import { loadTopographyIntoScene, setTopographyVisible } from '../mesh/topography';

// --- Mobile warning ---
// Touch-primary input on a small screen → likely a phone, unsuited for the
// mouse-driven 3D view. Show a dismissible warning rather than hard-blocking.
function isMobileDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
    && window.matchMedia('(max-width: 900px)').matches;
}
if (isMobileDevice()) {
  const warning = document.getElementById('mobile-warning') as HTMLDivElement | null;
  const dismiss = document.getElementById('mobile-warning-dismiss') as HTMLButtonElement | null;
  if (warning && dismiss) {
  warning.hidden = false;
  dismiss.addEventListener('click', () => { warning.hidden = true; });
  }
}

// --- DOM ---
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
const btnResetCamera = document.getElementById('btn-reset-camera') as HTMLButtonElement;
const btnResetSim = document.getElementById('btn-reset-sim') as HTMLButtonElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
const particleCounterParameter = document.getElementById('layer-particle-counter') as HTMLInputElement;

let pointerDown: { x: number; y: number } | null = null;

btnPlayPause.disabled = true;
btnResetSim.disabled = true;
speedSlider.disabled = true;

let isPaused = false;

/**
 * Global time multiplier from the speed slider. It controls particle travel
 * without changing the independently selected inlet emission rate.
 */
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

btnResetCamera.addEventListener('click', () => {
  scene.resetView();
});

btnResetSim.addEventListener('click', () => {
  inletFlow?.reset();
});

particleCounterParameter.addEventListener('change', () => {
  inletFlow?.setParticleCounterVisible(particleCounterParameter.checked);
});

// --- Scene (persistent across grid loads) ---
const scene = new SceneManager(canvas);

canvas.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (distance > 5) return;
  document.dispatchEvent(new CustomEvent('viewer-pick', {
    detail: { clientX: event.clientX, clientY: event.clientY },
  }));
});

canvas.addEventListener('pointercancel', () => {
  pointerDown = null;
});
setupBackgroundToggle((background) => {
  scene.setBackground(background === 'black' ? 0x000000 : 0xffffff);
});
const defaultGridFilename = appConfig.flow.defaultGridFilename;
const defaultGridUrl = `${import.meta.env.BASE_URL}data/${defaultGridFilename}`;
// --- State ---
let grid: VoxelGrid | undefined;
let voxelRenderer: VoxelRenderer | undefined;
let inletFlow: InletFlowRenderer | undefined;

function applyTabPresentation(tabId: ViewerTabDefinition['id']): void {
  const defaults = TAB_LAYER_DEFAULTS[tabId];
  voxelRenderer?.setVisible(defaults.includes('voxels'));
  voxelRenderer?.setDamageZoneVisible(defaults.includes('damage-zone'));
  inletFlow?.setParticlesVisible(defaults.includes('particles'));
  inletFlow?.setParticleCounterVisible(
    tabId === 'dynamic-flow' && particleCounterParameter.checked,
  );
}

function publishCameraState(): void {
  if (!grid) return;
  document.dispatchEvent(new CustomEvent('viewer-camera-change', {
    detail: {
      ...scene.getCameraState(),
      origin: grid.origin,
      voxelSize: grid.voxelSize,
    },
  }));
}

document.addEventListener('viewer-tab-change', (event) => {
  const tab = (event as CustomEvent<ViewerTabDefinition>).detail;
  applyTabPresentation(tab.id);
});

document.addEventListener('viewer-layer-change', (event) => {
  const { id, visible } = (event as CustomEvent<{ id: string; visible: boolean }>).detail;
  if (id === 'voxels') voxelRenderer?.setVisible(visible);
  if (id === 'damage-zone') voxelRenderer?.setDamageZoneVisible(visible);
  if (id === 'flow') inletFlow?.setParticlesVisible(visible);
  if (id === 'topography') setTopographyVisible(visible);
});

function loadGrid(data: GridData): void {
  grid = new VoxelGrid(data);

  if (voxelRenderer) voxelRenderer.removeFromScene(scene.scene);
  if (inletFlow) inletFlow.removeFromScene(scene.scene);

  voxelRenderer = new VoxelRenderer(grid);
  voxelRenderer.addToScene(scene.scene);

  inletFlow = new InletFlowRenderer(grid);
  inletFlow.setParticleCounterVisible(particleCounterParameter.checked);
  inletFlow.addToScene(scene.scene);
  isPaused = false;
  btnPlayPause.disabled = false;
  updatePlayPauseButton();
  btnResetCamera.disabled = false;
  btnResetSim.disabled = false;
  speedSlider.disabled = false;
  applyTabPresentation((document.body.dataset.activeTab as ViewerTabDefinition['id']) ?? 'flow-network');

  const center = grid.getCenter();
  const radius = grid.getRadius();
  scene.setInitialView(center, new THREE.Vector3(
    center.x + radius * 1.5,
    center.y + radius * 1.2,
    center.z + radius * 1.5,
  ));

  const axisLength = radius * 0.4;
  scene.addAxes(new THREE.Vector3(0, 0, 0), axisLength);
  publishCameraState();


  loadTopographyIntoScene(
    scene.scene,
    'data/topography.vtp',
    'data/topography.pgw',
    'data/topography.png',
    grid ? grid.origin : { x: 0, y: 0, z: 0 },
  ).catch(err => console.error('Failed to load topography:', err));
}

fetch(defaultGridUrl)
  .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
  .then(text => { loadGrid(parseGridCSV(text)); })
  .catch(err => {
    console.warn(`Failed to load grid "${defaultGridUrl}", falling back to sample grid:`, err);
    loadGrid(generateSampleGrid(6, 30, 60));
  });

// --- Animation loop ---
let lastTime = performance.now();
function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastTime) / 1000);  // cap dt at 100ms to avoid huge jumps after tab-switch
  lastTime = now;
  if (inletFlow && !isPaused) inletFlow.update(dt * speedMultiplier, dt);
  publishCameraState();
  scene.render();
}

animate();