export const appConfig = {
  flow: {
    defaultGridFilename:
      import.meta.env.VITE_DEFAULT_GRID_FILENAME ?? 'flow_network_voxels.csv',
  },
} as const;
