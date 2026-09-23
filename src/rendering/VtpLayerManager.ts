import * as THREE from "three";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import {
  createScalarBar,
  DEFAULT_SCALAR_BAR_CONFIG,
  SECONDARY_SCALAR_BAR_CONFIG,
  TERTIARY_SCALAR_BAR_CONFIG,
} from "./scalar_bar.js";
import { COLOR_MAPS, colorMapToCss, type ColorMap } from "./color_maps.js";
import { LAYERS } from "../layers.config.js";

interface VtpLayer {
  group: THREE.Group;
  source: any;
  visible: boolean;
}

interface CellRecord {
  indices: number[];
  cellId: number;
}

function readCells(data: any): CellRecord[] {
  const values = data?.getData?.() as ArrayLike<number> | undefined;
  if (!values) return [];
  const cells: CellRecord[] = [];
  let cursor = 0;
  let cellId = 0;
  while (cursor < values.length) {
    const count = Number(values[cursor++]);
    if (!Number.isFinite(count) || count < 1) break;
    const indices = Array.from({ length: count }, () =>
      Number(values[cursor++]),
    );
    cells.push({ indices, cellId });
    cellId++;
  }
  return cells;
}

function arrayValues(data: any, name: string): any | null {
  return data?.getArrayByName?.(name) ?? null;
}

function tupleValue(array: any, index: number): number[] | null {
  if (!array) return null;
  const values = (
    typeof array.getData === "function" ? array.getData() : array
  ) as ArrayLike<number>;
  if (!values || typeof values.length !== "number") return null;
  const components = array.getNumberOfComponents?.() ?? 1;
  const start = index * components;
  if (start >= values.length) return null;
  return Array.from({ length: components }, (_, offset) =>
    Number(values[start + offset]),
  );
}

function rgbColor(values: number[] | null): THREE.Color | null {
  if (!values || values.length < 3) return null;
  return new THREE.Color(values[0] / 255, values[1] / 255, values[2] / 255);
}

function sampleColorMap(colorMap: ColorMap, t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const upper = colorMap.findIndex(([position]) => position >= clamped);
  if (upper <= 0)
    return new THREE.Color(colorMap[0][1], colorMap[0][2], colorMap[0][3]);
  if (upper === -1) {
    const last = colorMap[colorMap.length - 1];
    return new THREE.Color(last[1], last[2], last[3]);
  }
  const lower = colorMap[upper - 1];
  const next = colorMap[upper];
  const fraction = (clamped - lower[0]) / (next[0] - lower[0]);
  return new THREE.Color(
    lower[1] + fraction * (next[1] - lower[1]),
    lower[2] + fraction * (next[2] - lower[2]),
    lower[3] + fraction * (next[3] - lower[3]),
  );
}

function rangeOf(array: any): [number, number] | null {
  if (!array?.getRange) return null;
  const range = array.getRange();
  if (!Number.isFinite(range[0]) || !Number.isFinite(range[1])) return null;
  return [range[0], range[1] === range[0] ? range[0] + 1 : range[1]];
}

export class VtpLayerManager {
  private readonly scene: THREE.Scene;
  private readonly layers = new Map<string, VtpLayer>();
  private readonly scalarBars = new Map<
    number,
    ReturnType<typeof createScalarBar>
  >();
  private initialized = false;
  private origin: { x: number; y: number; z: number } | null = null;

  setOrigin(origin: { x: number; y: number; z: number }): void {
    this.origin = origin;
  }

  private remapPoint(
    x: number,
    y: number,
    z: number,
  ): [number, number, number] {
    if (!this.origin) return [x, y, z];
    return [
      y - this.origin.y,
      z - this.origin.z,
      x - this.origin.x,
    ];
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async loadAll(): Promise<void> {
    await Promise.all(
      LAYERS.map(async (layer) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/${layer.filename}`,
        );
        if (!response.ok)
          throw new Error(
            `Failed to load ${layer.filename}: ${response.statusText}`,
          );
        await this.loadLayer(layer.id, await response.arrayBuffer());
      }),
    );
    this.initialized = true;
  }

  private async loadLayer(layerId: string, buffer: ArrayBuffer): Promise<void> {
    const reader = vtkXMLPolyDataReader.newInstance();
    reader.parseAsArrayBuffer(buffer);
    const source = reader.getOutputData(0);
    const group = this.convertPolyData(layerId, source);
    this.scene.add(group);
    this.layers.set(layerId, { group, source, visible: true });
  }

  private convertPolyData(layerId: string, source: any): THREE.Group {
    const group = new THREE.Group();
    const points = source.getPoints().getData() as ArrayLike<number>;
    const pointData = source.getPointData();
    const cellData = source.getCellData();
    const pointDisplayColors = arrayValues(pointData, "display_color_rgb");
    const cellDisplayColors = arrayValues(cellData, "display_color_rgb");

    const scalarName =
      layerId === "sat_glyphs" || layerId === "unsat_glyphs"
        ? "H"
        : layerId === "G_sat_flow"
          ? "Q"
          : layerId === "isoline_segments"
            ? "Z0"
            : null;
    const scalarArray = scalarName
      ? (arrayValues(pointData, scalarName) ??
        arrayValues(cellData, scalarName))
      : null;
    const scalarRange = rangeOf(scalarArray);
    const useCellsForScalar = Boolean(
      scalarArray && !arrayValues(pointData, scalarName ?? ""),
    );
    const colorMap =
      layerId === "isoline_segments"
        ? COLOR_MAPS.roseWhite
        : COLOR_MAPS.rainbow;
    const logarithmic = layerId === "G_sat_flow";

    if (scalarArray && scalarRange && scalarName) {
      const lut = { getRange: () => scalarRange };
      const names = {
        H: "Hydraulic head (m)",
        Q: "Discharge (m³/s)",
        Z0: "Height (m)",
      };
      const configs = [
        DEFAULT_SCALAR_BAR_CONFIG,
        SECONDARY_SCALAR_BAR_CONFIG,
        TERTIARY_SCALAR_BAR_CONFIG,
      ];
      const slot =
        layerId === "G_sat_flow" ? 1 : layerId === "isoline_segments" ? 2 : 0;
      this.scalarBars.get(slot)?.remove(null);
      this.scalarBars.set(
        slot,
        createScalarBar(null, lut, {
          name: names[scalarName as keyof typeof names],
          gradientCss: colorMapToCss(colorMap),
          ...configs[slot],
          logarithmic,
          scientificNotation: logarithmic,
        }),
      );
    }

    const colorFor = (pointIndex: number, cellId: number): THREE.Color => {
      const direct =
        rgbColor(tupleValue(cellDisplayColors, cellId)) ??
        rgbColor(tupleValue(pointDisplayColors, pointIndex));
      if (direct) return direct;
      if (scalarArray && scalarRange) {
        const index = useCellsForScalar ? cellId : pointIndex;
        const value = tupleValue(scalarArray, index)?.[0] ?? scalarRange[0];
        const t = logarithmic
          ? (Math.log10(value) - Math.log10(scalarRange[0])) /
            (Math.log10(scalarRange[1]) - Math.log10(scalarRange[0]))
          : (value - scalarRange[0]) / (scalarRange[1] - scalarRange[0]);
        return sampleColorMap(colorMap, t);
      }
      const field = rgbColor(
        tupleValue(arrayValues(source.getFieldData(), "display_color_rgb"), 0),
      );
      if (layerId === "source_glyph") {
        return new THREE.Color(0.9, 0.0, 0.0);
      }
      return field ?? new THREE.Color(0.8, 0.8, 0.8);
    };

    const addGeometry = (
      cells: CellRecord[],
      mode: "mesh" | "lines" | "points",
    ): void => {
      if (cells.length === 0) return;
      const positions: number[] = [];
      const colors: number[] = [];
      const metadataCellIds: number[] = [];

      for (const cell of cells) {
        let segments: number[][];
        if (mode === "mesh") {
          segments = Array.from(
            { length: Math.max(0, cell.indices.length - 2) },
            (_, i) => [
              cell.indices[0],
              cell.indices[i + 1],
              cell.indices[i + 2],
            ],
          );
        } else if (mode === "lines") {
          segments = Array.from(
            { length: Math.max(0, cell.indices.length - 1) },
            (_, i) => [cell.indices[i], cell.indices[i + 1]],
          );
        } else {
          segments = cell.indices.map((idx) => [idx]);
        }

        for (const segment of segments) {
          for (const index of segment) {
            const [rx, ry, rz] = this.remapPoint(
              points[index * 3],
              points[index * 3 + 1],
              points[index * 3 + 2],
            );
            positions.push(rx, ry, rz);
            const color = colorFor(index, cell.cellId);
            colors.push(color.r, color.g, color.b);
          }
          metadataCellIds.push(cell.cellId);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );

      let object: THREE.Object3D;
      if (mode === "mesh") {
        object = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 0.8,
          }),
        );
      } else if (mode === "lines") {
        object = new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
          }),
        );
      } else {
        object = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({ vertexColors: true, size: 2 }),
        );
      }
      object.userData.source = source;
      object.userData.cellIds = metadataCellIds;
      group.add(object);
    };

    addGeometry(readCells(source.getPolys()), "mesh");
    addGeometry(readCells(source.getLines()), "lines");
    addGeometry(readCells(source.getVerts()), "points");
    return group;
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    layer.visible = visible;
    layer.group.visible = visible;
  }

  applyPreset(layerIds: readonly string[]): void {
    for (const layerId of this.layers.keys())
      this.setLayerVisibility(layerId, layerIds.includes(layerId));
  }

  setScalarBarsVisible(visible: boolean): void {
    for (const bar of this.scalarBars.values()) bar.setVisibility(visible);
  }

  pick(raycaster: THREE.Raycaster): { source: any; cellId: number } | null {
    const objects = [...this.layers.values()]
      .filter((layer) => layer.visible)
      .flatMap((layer) => layer.group.children);
    const hits = raycaster.intersectObjects(objects, true);
    const hit = hits[0];
    if (!hit) return null;
    const cellIds = hit.object.userData.cellIds as number[] | undefined;
    const faceIndex = hit.faceIndex;
    const hitIndex = hit.index;
    const cellId =
      cellIds && faceIndex !== undefined && faceIndex !== null
        ? (cellIds[Math.floor(faceIndex / 2)] ?? cellIds[faceIndex] ?? -1)
        : cellIds && hitIndex !== undefined && hitIndex !== null
          ? (cellIds[hitIndex] ?? -1)
          : -1;
    const source = hit.object.userData.source;
    return source && cellId >= 0 ? { source, cellId } : null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
