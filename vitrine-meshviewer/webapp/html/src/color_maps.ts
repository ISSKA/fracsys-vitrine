// ============================================================================
// Color map types
// ============================================================================

/** A single color stop: [normalised position (0–1), R, G, B] where RGB are in [0, 1]. */
export type ColorMapStop = [number, number, number, number];

/** An ordered array of color stops that define a color map. */
export type ColorMap = ColorMapStop[];

// ============================================================================
// Utilities
// ============================================================================

/**
 * Converts a ColorMap to an eight-band CSS linear-gradient string
 * (bottom = min, top = max), suitable for use as a scalar bar background.
 */
export function colorMapToCss(colorMap: ColorMap): string {
  const numberOfBands = 8;
  const sampleColor = (t: number): [number, number, number] => {
    const upperIndex = colorMap.findIndex(([position]) => position >= t);

    if (upperIndex <= 0) {
      return colorMap[0].slice(1) as [number, number, number];
    }
    if (upperIndex === -1) {
      return colorMap[colorMap.length - 1].slice(1) as [number, number, number];
    }

    const [lowerT, lowerR, lowerG, lowerB] = colorMap[upperIndex - 1];
    const [upperT, upperR, upperG, upperB] = colorMap[upperIndex];
    const fraction = (t - lowerT) / (upperT - lowerT);
    return [
      lowerR + fraction * (upperR - lowerR),
      lowerG + fraction * (upperG - lowerG),
      lowerB + fraction * (upperB - lowerB),
    ];
  };

  const stops = Array.from({ length: numberOfBands }, (_, index) => {
    const t = index / (numberOfBands - 1);
    const [r, g, b] = sampleColor(t);
    const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    const start = (index / numberOfBands) * 100;
    const end = ((index + 1) / numberOfBands) * 100;
    return `${color} ${start}%, ${color} ${end}%`;
  }).join(', ');

  return `linear-gradient(to top, ${stops})`;
}

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

  /** Deep pink → Rose → Light pink → White. */
  roseWhite: [
    [0.0,  0.596, 0.000, 0.075],
    [0.33, 0.929, 0.329, 0.518],
    [0.66, 0.988, 0.682, 0.773],
    [1.0,  1.000, 1.000, 1.000],
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
