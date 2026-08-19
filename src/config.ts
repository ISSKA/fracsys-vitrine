const DEFAULT_MESH_DOWNLOAD_API_ENDPOINT =
  'https://xhx5lqfvq1.execute-api.eu-central-1.amazonaws.com/prod/download-url';

export const appConfig = {
  mesh: {
    downloadApiEndpoint:
      import.meta.env.VITE_MESH_DOWNLOAD_API_ENDPOINT ?? DEFAULT_MESH_DOWNLOAD_API_ENDPOINT,
  },
  flow: {
    defaultGridFilename:
      import.meta.env.VITE_DEFAULT_GRID_FILENAME ?? 'flow_network_voxels.csv',
  },
} as const;
