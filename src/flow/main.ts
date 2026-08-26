import * as THREE from 'three';
import { generateSampleGrid, parseGridCSV } from './grid/gridLoader';
import { VoxelGrid } from './grid/VoxelGrid';
import { SceneManager } from './rendering/SceneManager';
import { VoxelRenderer } from './rendering/VoxelRenderer';
import { InletFlowRenderer } from './rendering/InletFlowRenderer';
import { GridData } from './types';
import { appConfig } from '../config';
import { setupBackgroundToggle } from '../background-toggle';

// --- Mobile warning ---
// Touch-primary input on a small screen → likely a phone, unsuited for the
// mouse-driven 3D view. Show a dismissible warning rather than hard-blocking.
function isMobileDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
    && window.matchMedia('(max-width: 900px)').matches;
}
if (isMobileDevice()) {
  const warning = document.getElementById('mobile-warning') as HTMLDivElement;
  const dismiss = document.getElementById('mobile-warning-dismiss') as HTMLButtonElement;
  warning.hidden = false;
  dismiss.addEventListener('click', () => { warning.hidden = true; });
}

// --- DOM ---
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
const voxelsToggle = document.getElementById('voxels-toggle') as HTMLInputElement;
const particlesToggle = document.getElementById('particles-toggle') as HTMLInputElement;
const particleCounterToggle = document.getElementById('particle-counter-toggle') as HTMLInputElement;
const tickCounter = document.getElementById('tick-counter') as HTMLSpanElement;
const layerControlsToggle = document.getElementById('layerControlsToggle') as HTMLHeadingElement;
const layerCheckboxes = document.getElementById('layerCheckboxes') as HTMLDivElement;

btnPlayPause.disabled = true;
btnReset.disabled = true;
speedSlider.disabled = true;

let isPaused = false;

/**
 * Global time multiplier from the speed slider. Scales the dt handed to the flow
 * renderer, so travel speed and inlet spawn rate stay in step and the per-voxel
 * velocity differences are preserved.
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

particleCounterToggle.addEventListener('change', () => {
  inletFlow?.setParticleCounterVisible(particleCounterToggle.checked);
});

voxelsToggle.addEventListener('change', () => {
  voxelRenderer?.setVisible(voxelsToggle.checked);
});

particlesToggle.addEventListener('change', () => {
  inletFlow?.setParticlesVisible(particlesToggle.checked);
});

layerControlsToggle.addEventListener('click', () => {
  layerControlsToggle.classList.toggle('collapsed');
  layerCheckboxes.classList.toggle('collapsed');
});

function updatePlayPauseButton(): void {
  btnPlayPause.textContent = isPaused ? 'Resume' : 'Pause';
}

btnPlayPause.addEventListener('click', () => {
  isPaused = !isPaused;
  updatePlayPauseButton();
});

btnReset.addEventListener('click', () => {
  scene.resetView();
});

// --- Scene (persistent across grid loads) ---
const scene = new SceneManager(canvas);
setupBackgroundToggle((background) => {
  scene.setBackground(background === 'black' ? 0x000000 : 0xffffff);
});
const defaultGridFilename = appConfig.flow.defaultGridFilename;
const defaultGridUrl = `${import.meta.env.BASE_URL}data/${defaultGridFilename}`;
// --- State ---
let grid: VoxelGrid | undefined;
let voxelRenderer: VoxelRenderer | undefined;
let inletFlow: InletFlowRenderer | undefined;

function loadGrid(data: GridData): void {
  grid = new VoxelGrid(data);

  if (voxelRenderer) voxelRenderer.removeFromScene(scene.scene);
  if (inletFlow) inletFlow.removeFromScene(scene.scene);

  voxelRenderer = new VoxelRenderer(grid);
  voxelRenderer.setVisible(voxelsToggle.checked);
  voxelRenderer.addToScene(scene.scene);

  inletFlow = new InletFlowRenderer(grid);
  inletFlow.setParticlesVisible(particlesToggle.checked);
  inletFlow.setParticleCounterVisible(particleCounterToggle.checked);
  inletFlow.addToScene(scene.scene);
  isPaused = false;
  btnPlayPause.disabled = false;
  updatePlayPauseButton();
  btnReset.disabled = false;
  speedSlider.disabled = false;

  const center = grid.getCenter();
  const radius = grid.getRadius();
  scene.setInitialView(center, new THREE.Vector3(
    center.x + radius * 1.5,
    center.y + radius * 1.2,
    center.z + radius * 1.5,
  ));

  const axisLength = radius * 0.4;
  scene.addAxes(new THREE.Vector3(0, 0, 0), axisLength);
  tickCounter.textContent = 'Tick: 0';
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
  if (inletFlow && !isPaused) inletFlow.update(dt * speedMultiplier);
  scene.render();
}

animate();
