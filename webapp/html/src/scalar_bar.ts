// ============================================================================
// Types
// ============================================================================

export interface ScalarBarConfig {
  name: string;           // Label for the axis (e.g., "H (m)", "Q", "Type")
  leftPx?: number;        // Distance from the left edge of the viewport in pixels
  topPx?: number;         // Distance from the top edge of the viewport in pixels
  scientificNotation?: boolean; // Use scientific notation for tick labels (e.g. for very small values)
  logarithmic?: boolean;        // Space ticks and gradient on a log10 scale
  gradientCss?: string;         // Override the CSS background of the gradient strip
  position: {
    x: number;            // X position (0-1, normalized viewport coordinates)
    y: number;            // Y position (0-1, normalized viewport coordinates)
  };
  size?: {
    width: number;        // Width (0-1, normalized)
    height: number;       // Height (0-1, normalized)
  };
  textStyle?: {
    axisLabelFontSize?: number;
    tickLabelFontSize?: number;
    fontColor?: string;
    fontFamily?: string;
  };
}

export interface ScalarBarManager {
  actor: any;
  update: (lut: any, config?: Partial<ScalarBarConfig>) => void;
  remove: (renderer: any) => void;
  setVisibility: (visible: boolean) => void;
}

// ============================================================================
// Scalar Bar Creation (DOM-based for full styling control)
// ============================================================================

const NUM_TICKS = 5;

/**
 * Creates a DOM-based scalar bar overlay with the specified configuration.
 * The `renderer` parameter is accepted for interface compatibility but unused.
 */
export function createScalarBar(
  _renderer: any,
  lut: any,
  config: ScalarBarConfig
): ScalarBarManager {
  const panel = document.createElement('div');
  panel.className = 'scalar-bar-panel';
  if (config.leftPx !== undefined) {
    panel.style.left = `${config.leftPx}px`;
  }
  if (config.topPx !== undefined) {
    panel.style.top = `${config.topPx}px`;
  }
  document.body.appendChild(panel);

  function render(currentLut: any, currentConfig: ScalarBarConfig): void {
    const range: [number, number] = currentLut.getRange ? currentLut.getRange() : [0, 1];
    const [min, max] = range;

    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'scalar-bar-title';
    title.textContent = currentConfig.name;
    panel.appendChild(title);

    const barContainer = document.createElement('div');
    barContainer.className = 'scalar-bar-container';

    const gradient = document.createElement('div');
    gradient.className = 'scalar-bar-gradient';
    if (currentConfig.gradientCss) {
      gradient.style.background = currentConfig.gradientCss;
    }
    barContainer.appendChild(gradient);

    const ticksDiv = document.createElement('div');
    ticksDiv.className = 'scalar-bar-ticks';
    const logMin = currentConfig.logarithmic ? Math.log10(min) : 0;
    const logMax = currentConfig.logarithmic ? Math.log10(max) : 0;
    for (let i = 0; i <= NUM_TICKS; i++) {
      const t = i / NUM_TICKS;
      const value = currentConfig.logarithmic
        ? Math.pow(10, logMax - t * (logMax - logMin)) // top = max, bottom = min
        : max - t * (max - min);
      const label = document.createElement('div');
      label.className = 'scalar-bar-tick-label';
      label.style.top = `${t * 100}%`;
      label.textContent = currentConfig.scientificNotation
        ? value.toExponential(2)
        : value.toFixed(2);
      ticksDiv.appendChild(label);
    }
    barContainer.appendChild(ticksDiv);

    panel.appendChild(barContainer);
  }

  render(lut, config);

  return {
    actor: null,

    update: (newLut: any, newConfig?: Partial<ScalarBarConfig>) => {
      render(newLut ?? lut, { ...config, ...newConfig });
    },

    remove: (_rendererArg: any) => {
      panel.parentNode?.removeChild(panel);
    },

    setVisibility: (visible: boolean) => {
      panel.style.display = visible ? 'flex' : 'none';
    }
  };
}

/**
 * Default configuration for the primary scalar bar (slot 0).
 * leftPx and topPx are set dynamically at runtime.
 */
export const DEFAULT_SCALAR_BAR_CONFIG: Omit<ScalarBarConfig, 'name'> = {
  leftPx: 10,
  position: { x: 0.88, y: 0.15 },
  size: { width: 0.08, height: 0.7 },
  textStyle: {
    axisLabelFontSize: 7,
    tickLabelFontSize: 6,
    fontColor: 'black',
    fontFamily: 'Arial'
  }
};

/**
 * Configuration for a secondary scalar bar (slot 1).
 * Offset = leftPx (10) + panel width (80) + gap (5) = 95px.
 */
export const SECONDARY_SCALAR_BAR_CONFIG: Omit<ScalarBarConfig, 'name'> = {
  leftPx: 95,
  scientificNotation: true,
  logarithmic: true,
  position: { x: 0.77, y: 0.15 },
  size: { width: 0.08, height: 0.7 },
  textStyle: {
    axisLabelFontSize: 7,
    tickLabelFontSize: 6,
    fontColor: 'black',
    fontFamily: 'Arial'
  }
};

/**
 * Configuration for a tertiary scalar bar (slot 2).
 * Offset = secondary leftPx (95) + panel width (80) + gap (5) = 180px.
 */
export const TERTIARY_SCALAR_BAR_CONFIG: Omit<ScalarBarConfig, 'name'> = {
  leftPx: 180,
  position: { x: 0.66, y: 0.15 },
  size: { width: 0.08, height: 0.7 },
  textStyle: {
    axisLabelFontSize: 7,
    tickLabelFontSize: 6,
    fontColor: 'black',
    fontFamily: 'Arial'
  }
};
