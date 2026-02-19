import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';

// ============================================================================
// Types
// ============================================================================

export interface LayerConfig {
  id: string;
  filename: string;
  label: string;
  defaultVisible: boolean;
}

export interface Layer {
  actor: any;
  mapper: any;
  source: any | null;
  visible: boolean;
}

export interface Layers {
  [layerId: string]: Layer;
}

export interface FileLoaderDependencies {
  renderer: any;
  picker: any;
  renderWindow: any;
}

export interface FileLoaderAPI {
  layers: Layers;
  LAYERS: readonly LayerConfig[];
  handleFileSelect: (event: Event) => void;
  downloadAllLayersFromCloud: () => Promise<void>;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  getLayerVisibility: (layerId: string) => boolean;
  getAllSources: () => any[];
  isInitialized: () => boolean;
}

// ============================================================================
// Layer Configuration
// ============================================================================

const LAYERS: readonly LayerConfig[] = [
  { id: 'mesh', filename: 'mesh.vtp', label: 'Mesh', defaultVisible: true },
  { id: 'markers', filename: 'markers.vtp', label: 'Path marker', defaultVisible: true }
] as const;

// ============================================================================
// File Loading
// ============================================================================

const API_ENDPOINT = 'https://xhx5lqfvq1.execute-api.eu-central-1.amazonaws.com/prod/download-url';

export function setupFileLoader(dependencies: FileLoaderDependencies): FileLoaderAPI {
  const { renderer, picker, renderWindow } = dependencies;

  // Store layer data: { id -> { actor, mapper, source, visible } }
  const layers: Layers = {};
  let isInitialized = false;

  function createLayer(layerId: string): Layer {
    const mapper = vtkMapper.newInstance();
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    layers[layerId] = {
      actor,
      mapper,
      source: null,
      visible: true
    };

    return layers[layerId];
  }

  function loadLayerData(layerId: string, fileContents: ArrayBuffer): Layer {
    const vtkreader = vtkXMLPolyDataReader.newInstance();
    vtkreader.parseAsArrayBuffer(fileContents);

    const source = vtkreader.getOutputData(0);

    // Create layer if it doesn't exist
    if (!layers[layerId]) {
      createLayer(layerId);
    }

    const layer = layers[layerId];
    layer.source = source;
    layer.mapper.setInputData(source);
    layer.mapper.modified();

    // Add actor to renderer if not already added
    if (!renderer.getActors().includes(layer.actor)) {
      renderer.addActor(layer.actor);
    }

    // Add to pick list
    picker.addPickList(layer.actor);

    return layer;
  }

  function setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = layers[layerId];
    if (!layer) return;

    layer.visible = visible;
    layer.actor.setVisibility(visible);
    renderWindow.render();
  }

  function getLayerVisibility(layerId: string): boolean {
    return layers[layerId]?.visible ?? false;
  }

  function getAllSources(): any[] {
    // Return all sources for click detection
    return Object.values(layers)
      .filter(layer => layer.source && layer.visible)
      .map(layer => layer.source);
  }

  async function downloadLayerFromCloud(layerId: string, filename: string): Promise<void> {
    try {
      // Step 1: Get signed URL from API
      const response = await fetch(`${API_ENDPOINT}?key=${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to get signed URL for ${filename}: ${response.statusText}`);
      }

      const data = await response.json() as { signedUrl: string };
      const signedUrl = data.signedUrl;

      // Step 2: Download the file from S3 using signed URL
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download ${filename}: ${fileResponse.statusText}`);
      }

      const fileContents = await fileResponse.arrayBuffer();

      // Step 3: Load the layer
      loadLayerData(layerId, fileContents);

    } catch (error) {
      console.error(`Error downloading layer ${layerId}:`, error);
      throw error;
    }
  }

  async function downloadAllLayersFromCloud(): Promise<void> {
    try {
      // Download all layers in parallel
      await Promise.all(
        LAYERS.map(layer => downloadLayerFromCloud(layer.id, layer.filename))
      );

      isInitialized = true;

      // Reset camera to show all layers
      renderer.resetCamera();
      renderWindow.render();

      console.log('All layers loaded successfully');
    } catch (error) {
      console.error('Error downloading layers from cloud:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to download model from cloud: ${errorMessage}`);
    }
  }

  function handleFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    // Load all selected files
    const loadPromises = Array.from(files).map(file => {
      return new Promise<void>((resolve, reject) => {
        // Extract layer ID from filename (e.g., 'mesh.vtp' -> 'mesh')
        const layerId = file.name.replace('.vtp', '');

        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
          try {
            if (e.target?.result instanceof ArrayBuffer) {
              loadLayerData(layerId, e.target.result);
              resolve();
            } else {
              reject(new Error('Failed to read file as ArrayBuffer'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsArrayBuffer(file);
      });
    });

    Promise.all(loadPromises)
      .then(() => {
        isInitialized = true;
        // Reset file input so the same files can be selected again
        target.value = '';

        // Reset camera to show all layers
        renderer.resetCamera();
        renderWindow.render();

        console.log('All files loaded successfully');
      })
      .catch(error => {
        console.error('Error loading files:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to load files: ${errorMessage}`);
      });
  }

  // Setup file input listener (allow multiple files)
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  fileInput.setAttribute('multiple', 'multiple');
  fileInput.addEventListener('change', handleFileSelect);

  // Initialize picker
  picker.initializePickList();

  return {
    layers,
    LAYERS,
    handleFileSelect,
    downloadAllLayersFromCloud,
    setLayerVisibility,
    getLayerVisibility,
    getAllSources,
    isInitialized: () => isInitialized
  };
}
