import * as THREE from 'three';

let _mesh: THREE.Mesh | null = null;
let _topoImageData: ImageData | null = null;
let _visible = true;

interface WorldFile {
  pixelWidth: number;
  pixelHeight: number;
  originX: number;
  originY: number;
}

interface Origin { x: number; y: number; z: number; }

function applyOriginOffset(geometry: THREE.BufferGeometry, origin: Origin): void {
  const positions = geometry.attributes.position.array as Float32Array;
  const n = positions.length / 3;
  for (let i = 0; i < n; i++) {
    const lv95X = positions[i * 3];     // Easting
    const lv95Y = positions[i * 3 + 1]; // Northing
    const lv95Z = positions[i * 3 + 2]; // Elevation

    positions[i * 3]     = lv95Y - origin.y; // Three.js X
    positions[i * 3 + 1] = lv95Z - origin.z; // Three.js Y
    positions[i * 3 + 2] = lv95X - origin.x; // Three.js Z
  }
  geometry.attributes.position.needsUpdate = true;
}

function parsePgw(text: string): WorldFile {
  const lines = text.trim().split(/\r?\n/).map(l => parseFloat(l.trim()));
  return { pixelWidth: lines[0], pixelHeight: lines[3], originX: lines[4], originY: lines[5] };
}

/**
 * Minimal reader for your specific VTP format:
 * - Float64 points, UInt32 polys (triangles)
 * - zlib compressed, LittleEndian
 * - Uses fflate for decompression (already likely in your bundle via VTK.js)
 */
async function readVtp(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  // Re-use VTK.js's own reader which you already have, then extract the arrays
  const { default: vtkXMLPolyDataReader } = await import('@kitware/vtk.js/IO/XML/XMLPolyDataReader');
  
  const reader = vtkXMLPolyDataReader.newInstance();
  reader.parseAsArrayBuffer(buffer);
  const output = reader.getOutputData(0);

  // Extract points
  const vtkPoints = output.getPoints();
  const numPoints = vtkPoints.getNumberOfPoints();
  const positions = new Float32Array(numPoints * 3);
  for (let i = 0; i < numPoints; i++) {
    const pt = vtkPoints.getPoint(i);
    positions[i * 3]     = pt[0];
    positions[i * 3 + 1] = pt[1];
    positions[i * 3 + 2] = pt[2];
  }

  // Extract triangle indices from polys
  const polys = output.getPolys();
  const polyData = polys.getData(); // flat array: [3, i0, i1, i2, 3, i0, i1, i2, ...]
  const numPolys = output.getNumberOfPolys();
  const indices = new Uint32Array(numPolys * 3);
  let src = 0;
  let dst = 0;
  while (src < polyData.length) {
    const count = polyData[src++];
    if (count === 3) {
      indices[dst++] = polyData[src++];
      indices[dst++] = polyData[src++];
      indices[dst++] = polyData[src++];
    } else {
      src += count; // skip non-triangles
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

function computeUVs(geometry: THREE.BufferGeometry, wf: WorldFile, imgWidth: number, imgHeight: number): void {
  const positions = geometry.attributes.position.array as Float32Array;
  const n = positions.length / 3;
  const uvs = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const lv95X = positions[i * 3];     // Easting
    const lv95Y = positions[i * 3 + 1]; // Northing
    uvs[i * 2]     = (lv95X - wf.originX) / (imgWidth  * wf.pixelWidth);
    uvs[i * 2 + 1] = (lv95Y - wf.originY) / (imgHeight * wf.pixelHeight);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

export async function loadTopographyIntoScene(
  scene: THREE.Scene,
  vtpUrl: string,
  pgwUrl: string,
  pngUrl: string,
  origin: { x: number; y: number; z: number }
): Promise<void> {
  const [vtpBuffer, pgwText, img] = await Promise.all([
    fetch(vtpUrl).then(r => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); }),
    fetch(pgwUrl).then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); }),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load topography PNG'));
      el.src = pngUrl;
    }),
  ]);

  const wf = parsePgw(pgwText);
  const geometry = await readVtp(vtpBuffer);
  computeUVs(geometry, wf, img.naturalWidth, img.naturalHeight);
  
  applyOriginOffset(geometry, origin);
  
  geometry.computeVertexNormals();

  // Keep ImageData alive
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  _topoImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const texture = new THREE.DataTexture(
    _topoImageData.data,
    img.naturalWidth,
    img.naturalHeight,
    THREE.RGBAFormat,
  );
  texture.needsUpdate = true;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  _mesh = new THREE.Mesh(geometry, material);
  _mesh.visible = _visible;
  scene.add(_mesh);
}

export function setTopographyVisible(visible: boolean): void {
  _visible = visible;
  if (_mesh) _mesh.visible = visible;
}