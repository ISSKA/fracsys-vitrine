export interface LayerConfig {
  id: string;
  filename: string;
  label: string;
  defaultVisible: boolean;
}

export const LAYERS: readonly LayerConfig[] = [
  { id: 'sat_glyphs',        filename: 'sat_glyphs.vtp',          label: 'Nodes in saturated zone',            defaultVisible: true },
  { id: 'unsat_glyphs',      filename: 'unsat_glyphs.vtp',        label: 'Nodes in unsaturated zone',          defaultVisible: true },
  { id: 'G_sat_flow',        filename: 'G_sat_flow.vtp',          label: 'Groundwater flow',                   defaultVisible: true },
  { id: 'isoline_segments',  filename: 'isoline_segments.vtp',    label: 'Hydraulic gradient in the fracture', defaultVisible: true },
  { id: 'all_paths',         filename: 'all_paths.vtp',           label: 'Test particle trail',                defaultVisible: false },
  { id: 'source_glyph',      filename: 'target_node_sphere.vtp',  label: 'Outlet',                             defaultVisible: true },
  { id: 'recharge_nodes',    filename: 'recharge_nodes.vtp',      label: 'Recharge Points',                    defaultVisible: true },
] as const;
