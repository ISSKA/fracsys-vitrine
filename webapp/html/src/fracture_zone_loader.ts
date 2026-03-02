import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { createScalarBar, DEFAULT_SCALAR_BAR_CONFIG, SECONDARY_SCALAR_BAR_CONFIG, type ScalarBarManager } from './scalar_bar.js';
import { LAYERS, type LayerConfig } from './layers.config.js';

// ============================================================================
// Types
// ============================================================================

export type { LayerConfig };

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
  setScalarBarsVisible: (visible: boolean) => void;
}

// ============================================================================
// File Loading
// ============================================================================

const API_ENDPOINT = 'https://xhx5lqfvq1.execute-api.eu-central-1.amazonaws.com/prod/download-url';

export function setupFileLoader(dependencies: FileLoaderDependencies): FileLoaderAPI {
  const { renderer, picker, renderWindow } = dependencies;

  // Store layer data: { id -> { actor, mapper, source, visible } }
  const layers: Layers = {};
  let isInitialized = false;
  let scalarBarManagerH: ScalarBarManager | null = null;
  let scalarBarManagerQ: ScalarBarManager | null = null;

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

  function updateScalarBar(lut: any, name: string, secondary: boolean = false): void {
    if (secondary) {
      scalarBarManagerQ?.remove(renderer);
      scalarBarManagerQ = createScalarBar(renderer, lut, { name, ...SECONDARY_SCALAR_BAR_CONFIG });
    } else {
      scalarBarManagerH?.remove(renderer);
      scalarBarManagerH = createScalarBar(renderer, lut, { name, ...DEFAULT_SCALAR_BAR_CONFIG });
    }
  }

  function applyDisplayColorFromFieldData(layer: Layer): void {
    const { actor, mapper, source } = layer;
    if (!source) return;

    // 1. FieldData — single flat color stored at the dataset level
    const fieldColor = source.getFieldData().getArrayByName('display_color_rgb');
    if (fieldColor) {
      const data = fieldColor.getData();
      if (data.length >= 3) {
        actor.getProperty().setColor(data[0] / 255, data[1] / 255, data[2] / 255);
        mapper.setScalarVisibility(false);
        return;
      }
    }

    // 2. CellData — per-cell RGB (line datasets)
    const cellColor = source.getCellData().getArrayByName('display_color_rgb');
    if (cellColor) {
      mapper.setColorModeToDirectScalars();
      mapper.setScalarModeToUseCellFieldData();
      mapper.setColorByArrayName('display_color_rgb');
      mapper.setScalarVisibility(true);
      return;
    }

    // 3. PointData — per-point RGB (glyph / point datasets)
    const pointColor = source.getPointData().getArrayByName('display_color_rgb');
    if (pointColor) {
      mapper.setColorModeToDirectScalars();
      mapper.setScalarModeToUsePointFieldData();
      mapper.setColorByArrayName('display_color_rgb');
      mapper.setScalarVisibility(true);
      return;
    }

    // No color array found — suppress VTK's auto scalar mapping
    mapper.setScalarVisibility(false);
  }

  function applyColorMapping(layer: Layer, arrayName: string = 'H', logarithmic: boolean = false): void {
    const { mapper, source } = layer;
    if (!source) return;

    // Try PointData first, fall back to CellData
    let dataArray = source.getPointData().getArrayByName(arrayName);
    let useCellData = false;
    if (!dataArray) {
      dataArray = source.getCellData().getArrayByName(arrayName);
      useCellData = true;
    }

    if (!dataArray) {
      console.warn(`Array '${arrayName}' not found in PointData or CellData`);
      return;
    }

    const range = dataArray.getRange();
    let [min, max] = range;

    // Check for NaN values and handle them
    if (isNaN(min) || isNaN(max)) {
      console.warn(`Invalid range for '${arrayName}': [${min}, ${max}]. Skipping color mapping.`);
      return;
    }

    // If min and max are the same, slightly adjust to avoid division by zero
    if (min === max) {
      max = min + 1;
    }

    // Create color transfer function (blue -> cyan -> green -> yellow -> red)
    const logMin = logarithmic ? Math.log10(min) : 0;
    const logMax = logarithmic ? Math.log10(max) : 0;
    const interp = (t: number) => logarithmic
      ? Math.pow(10, logMin + t * (logMax - logMin))
      : min + t * (max - min);

    const lookupTable = vtkColorTransferFunction.newInstance();
    lookupTable.addRGBPoint(interp(0.0),  0.0, 0.0, 1.0);  // Blue for minimum
    lookupTable.addRGBPoint(interp(0.25), 0.0, 1.0, 1.0);  // Cyan
    lookupTable.addRGBPoint(interp(0.5),  0.0, 1.0, 0.0);  // Green for middle
    lookupTable.addRGBPoint(interp(0.75), 1.0, 1.0, 0.0);  // Yellow
    lookupTable.addRGBPoint(interp(1.0),  1.0, 0.0, 0.0);  // Red for maximum

    // Apply color mapping to mapper
    mapper.setLookupTable(lookupTable);
    mapper.setScalarRange(min, max);
    mapper.setScalarVisibility(true);
    if (useCellData) {
      mapper.setScalarModeToUseCellFieldData();
    } else {
      mapper.setScalarModeToUsePointFieldData();
    }
    mapper.setColorByArrayName(arrayName);

    // Create/update scalar bar
    const isSecondary = useCellData;
    const label = arrayName === 'H' ? 'Hydraulic Head (m)' : `${arrayName} (m³/s)`;
    updateScalarBar(lookupTable, label, isSecondary);

    console.log(`Applied color mapping for '${arrayName}' (${useCellData ? 'CellData' : 'PointData'}) with range [${min.toFixed(2)}, ${max.toFixed(2)}]`);
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

    // Apply color mapping based on scalar data
    if (layerId === 'sat_glyphs' || layerId === 'unsat_glyphs') {
      applyColorMapping(layer, 'H');
    } else if (layerId === 'G_sat_flow') {
      applyColorMapping(layer, 'Q', true);
    }

    // Apply flat colour from FieldData for the source glyph sphere
    if (layerId === 'source_glyph') {
      applyDisplayColorFromFieldData(layer);
    }

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

  // Initialize picker
  picker.initializePickList();

  function setScalarBarsVisible(visible: boolean): void {
    scalarBarManagerH?.setVisibility(visible);
    scalarBarManagerQ?.setVisibility(visible);
  }

  return {
    layers,
    LAYERS,
    handleFileSelect,
    downloadAllLayersFromCloud,
    setLayerVisibility,
    getLayerVisibility,
    getAllSources,
    isInitialized: () => isInitialized,
    setScalarBarsVisible
  };
}
