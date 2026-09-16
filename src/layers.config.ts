import type { ViewerTabId } from './viewer-tabs';

export interface LayerConfig {
  id: string;
  filename: string;
  label: string;
  defaultVisible: boolean;
}

export type ViewerLayerKind = 'mesh' | 'voxels' | 'damage-zone' | 'particles' | 'particle-counter';

export interface ViewerLayerConfig {
  id: string;
  label: string;
  kind: ViewerLayerKind;
}

export const LAYERS: readonly LayerConfig[] = [
  { id: 'sat_glyphs', filename: 'sat_glyphs.vtp', label: 'Nodes in saturated zone', defaultVisible: true },
  { id: 'unsat_glyphs', filename: 'unsat_glyphs.vtp', label: 'Nodes in unsaturated zone', defaultVisible: true },
  { id: 'G_sat_flow', filename: 'G_sat_flow.vtp', label: 'Groundwater flow', defaultVisible: true },
  { id: 'isoline_segments', filename: 'isoline_segments.vtp', label: 'Hydraulic gradient in the fracture', defaultVisible: true },
  { id: 'all_paths', filename: 'all_paths.vtp', label: 'Test particle trail', defaultVisible: false },
  { id: 'source_glyph', filename: 'target_node_sphere.vtp', label: 'Outlet', defaultVisible: true },
  { id: 'recharge_nodes', filename: 'recharge_nodes.vtp', label: 'Recharge points', defaultVisible: true },
] as const;

export const VIEWER_LAYERS: readonly ViewerLayerConfig[] = [
  { id: 'sat_glyphs', label: 'Saturated part', kind: 'mesh' },
  { id: 'unsat_glyphs', label: 'Unsaturated part', kind: 'mesh' },
  { id: 'G_sat_flow', label: 'Flow network', kind: 'mesh' },
  { id: 'isoline_segments', label: 'Hydraulic gradient in fracture', kind: 'mesh' },
  { id: 'all_paths', label: 'Random path', kind: 'mesh' },
  { id: 'source_glyph', label: 'Outflow points', kind: 'mesh' },
  { id: 'recharge_nodes', label: 'Recharge points', kind: 'mesh' },
  { id: 'voxels', label: 'Productive zone', kind: 'voxels' },
  { id: 'damage-zone', label: 'Damage zone', kind: 'damage-zone' },
  { id: 'particles', label: 'Flow', kind: 'particles' },
] as const;


export const TAB_LAYER_DEFAULTS: Record<ViewerTabId, readonly string[]> = {
  'fracture-network': ['source_glyph'],
  'damage-zone': ['source_glyph', 'damage-zone'],
  'flow-network': ['sat_glyphs', 'unsat_glyphs', 'G_sat_flow', 'isoline_segments', 'source_glyph', 'recharge_nodes'],
  'productive-zone': ['source_glyph', 'voxels'],
  'dynamic-flow': ['voxels', 'isoline_segments', 'all_paths', 'source_glyph', 'particles'],
};
