// ============================================================================
// Color map types
// ============================================================================

/** A single color stop: [normalised position (0–1), R, G, B] where RGB are in [0, 1]. */
export type ColorMapStop = [number, number, number, number];

/** An ordered array of color stops that define a color map. */
export type ColorMap = ColorMapStop[];

// ============================================================================
// Color map presets
// ============================================================================

export const COLOR_MAPS = {
  /** Blue → Cyan → Green → Yellow → Red (default rainbow). */
  rainbow: [
    [0.0,  0.0, 0.0, 1.0],
    [0.25, 0.0, 1.0, 1.0],
    [0.5,  0.0, 1.0, 0.0],
    [0.75, 1.0, 1.0, 0.0],
    [1.0,  1.0, 0.0, 0.0],
  ] as ColorMap,

  /** Black → White. */
  grayscale: [
    [0.0, 0.0, 0.0, 0.0],
    [1.0, 1.0, 1.0, 1.0],
  ] as ColorMap,

  /** Blue → White → Red (useful for diverging data). */
  coolWarm: [
    [0.0,  0.23, 0.30, 0.75],
    [0.5,  0.86, 0.86, 0.86],
    [1.0,  0.71, 0.02, 0.15],
  ] as ColorMap,

  /** Dark blue → Teal → Yellow (perceptually uniform viridis-like). */
  viridis: [
    [0.0,  0.267, 0.004, 0.329],
    [0.25, 0.229, 0.322, 0.545],
    [0.5,  0.128, 0.566, 0.551],
    [0.75, 0.369, 0.788, 0.384],
    [1.0,  0.993, 0.906, 0.144],
  ] as ColorMap,
} as const;
