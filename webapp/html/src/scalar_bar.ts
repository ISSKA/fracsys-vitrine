import vtkScalarBarActor from '@kitware/vtk.js/Rendering/Core/ScalarBarActor';

// ============================================================================
// Types
// ============================================================================

export interface ScalarBarConfig {
  name: string;           // Label for the axis (e.g., "H (m)", "Q", "Type")
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
// Scalar Bar Creation
// ============================================================================

/**
 * Creates a scalar bar actor with the specified configuration
 */
export function createScalarBar(
  renderer: any,
  lut: any,
  config: ScalarBarConfig
): ScalarBarManager {
  // Create scalar bar actor
  const scalarBarActor = vtkScalarBarActor.newInstance();
  scalarBarActor.setScalarsToColors(lut);
  scalarBarActor.setAxisLabel(config.name);

  // Apply text styling
  const axisTextStyle = {
    fontColor: config.textStyle?.fontColor || 'black',
    fontStyle: 'normal',
    fontSize: config.textStyle?.axisLabelFontSize || 14,
    fontFamily: config.textStyle?.fontFamily || 'Arial'
  };

  const tickTextStyle = {
    fontColor: config.textStyle?.fontColor || 'black',
    fontStyle: 'normal',
    fontSize: config.textStyle?.tickLabelFontSize || 12,
    fontFamily: config.textStyle?.fontFamily || 'Arial'
  };

  scalarBarActor.setAxisTextStyle(axisTextStyle);
  scalarBarActor.setTickTextStyle(tickTextStyle);

  // Set position and size
  const width = config.size?.width || 0.08;
  const height = config.size?.height || 0.7;

  scalarBarActor.setBoxPosition([config.position.x, config.position.y]);
  scalarBarActor.setBoxSize([width, height]);

  // Add to renderer
  renderer.addActor(scalarBarActor);

  // Return manager interface
  return {
    actor: scalarBarActor,

    update: (newLut: any, newConfig?: Partial<ScalarBarConfig>) => {
      if (newLut) {
        scalarBarActor.setScalarsToColors(newLut);
      }

      if (newConfig?.name) {
        scalarBarActor.setAxisLabel(newConfig.name);
      }

      if (newConfig?.position) {
        scalarBarActor.setBoxPosition([newConfig.position.x, newConfig.position.y]);
      }

      if (newConfig?.size) {
        scalarBarActor.setBoxSize([newConfig.size.width, newConfig.size.height]);
      }

      if (newConfig?.textStyle?.axisLabelFontSize || newConfig?.textStyle?.fontColor) {
        const updatedAxisStyle = {
          ...axisTextStyle,
          fontSize: newConfig.textStyle?.axisLabelFontSize || axisTextStyle.fontSize,
          fontColor: newConfig.textStyle?.fontColor || axisTextStyle.fontColor
        };
        scalarBarActor.setAxisTextStyle(updatedAxisStyle);
      }

      if (newConfig?.textStyle?.tickLabelFontSize || newConfig?.textStyle?.fontColor) {
        const updatedTickStyle = {
          ...tickTextStyle,
          fontSize: newConfig.textStyle?.tickLabelFontSize || tickTextStyle.fontSize,
          fontColor: newConfig.textStyle?.fontColor || tickTextStyle.fontColor
        };
        scalarBarActor.setTickTextStyle(updatedTickStyle);
      }
    },

    remove: (rendererToRemoveFrom: any) => {
      rendererToRemoveFrom.removeActor(scalarBarActor);
    },

    setVisibility: (visible: boolean) => {
      scalarBarActor.setVisibility(visible);
    }
  };
}

/**
 * Default configuration for scalar bars
 */
export const DEFAULT_SCALAR_BAR_CONFIG: Omit<ScalarBarConfig, 'name'> = {
  position: { x: 0.88, y: 0.15 },  // Right side, lower position
  size: { width: 0.08, height: 0.7 },
  textStyle: {
    axisLabelFontSize: 14,
    tickLabelFontSize: 12,
    fontColor: 'black',
    fontFamily: 'Arial'
  }
};
