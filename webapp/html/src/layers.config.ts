export interface LayerConfig {
  id: string;
  filename: string;
  label: string;
  defaultVisible: boolean;
}

export const LAYERS: readonly LayerConfig[] = [
  { id: 'sat_glyphs',        filename: 'sat_glyphs.vtp',          label: 'Saturated Glyphs',   defaultVisible: true },
  { id: 'unsat_glyphs',      filename: 'unsat_glyphs.vtp',        label: 'Unsaturated Glyphs', defaultVisible: true },
  { id: 'G_sat_flow',        filename: 'G_sat_flow.vtp',          label: 'Water flow',         defaultVisible: true },
  { id: 'isoline_segments',  filename: 'isoline_segments.vtp',    label: 'Surface water level',defaultVisible: true },
  { id: 'all_paths',         filename: 'all_paths.vtp',           label: 'Hydraulic head',     defaultVisible: true },
  { id: 'source_glyph',      filename: 'target_node_sphere.vtp',  label: 'Outlet (Spring)',    defaultVisible: true },
] as const;
