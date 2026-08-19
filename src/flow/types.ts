export interface GridData {
  dimensions: { nx: number; ny: number; nz: number };
  voxelSize: number;
  velocity: number[];
  exists: boolean[];  // true for voxels that are part of the mesh
  exits: boolean[];   // true for voxels where particles leave the grid
  saturated: boolean[];
  inlets: boolean[];  // true for voxels where particles enter the grid (Recharge=Inlet)
  downstream: number[];  // linear index of next downstream voxel, or -1
}

export interface VoxelCoord {
  x: number;
  y: number;
  z: number;
}

export interface Neighbor {
  coord: VoxelCoord;
  velocity: number;
  direction: 'down' | 'lateral' | 'up';
}
