// Minimal type definitions for @kitware/vtk.js modules used in this project

declare module '@kitware/vtk.js/Rendering/Profiles/Geometry';

declare module '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow' {
  interface vtkFullScreenRenderWindow {
    getRenderer(): any;
    getRenderWindow(): any;
  }

  const vtkFullScreenRenderWindowModule: {
    newInstance(config?: { container: HTMLElement | null }): vtkFullScreenRenderWindow;
  };

  export default vtkFullScreenRenderWindowModule;
}

declare module '@kitware/vtk.js/Rendering/Core/Actor' {
  interface vtkProperty {
    setRepresentation(mode: number): void;
  }

  interface vtkActor {
    setMapper(mapper: any): void;
    getProperty(): vtkProperty;
    setVisibility(visible: boolean): void;
  }

  const vtkActorModule: {
    newInstance(): vtkActor;
  };

  export default vtkActorModule;
}

declare module '@kitware/vtk.js/Rendering/Core/Mapper' {
  interface vtkMapper {
    setInputData(data: any): void;
    modified(): void;
    setLookupTable(lut: any): void;
    setScalarRange(min: number, max: number): void;
    setScalarVisibility(visible: boolean): void;
    setScalarModeToUsePointFieldData(): void;
    setColorByArrayName(name: string): void;
  }

  const vtkMapperModule: {
    newInstance(): vtkMapper;
  };

  export default vtkMapperModule;
}

declare module '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator' {
  interface vtkInteractorStyleManipulator {}

  const vtkInteractorStyleManipulatorModule: {
    newInstance(): vtkInteractorStyleManipulator;
  };

  export default vtkInteractorStyleManipulatorModule;
}

declare module '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator/Presets' {
  export interface InteractorStyleDefinition {
    type: string;
    options: Record<string, any>;
  }

  const PresetsModule: {
    applyDefinitions(
      definitions: InteractorStyleDefinition[],
      style: any
    ): void;
  };

  export default PresetsModule;
}

declare module '@kitware/vtk.js/Rendering/Core/CellPicker' {
  interface vtkCellPicker {
    setPickFromList(flag: number): void;
    setTolerance(tolerance: number): void;
    initializePickList(): void;
    addPickList(actor: any): void;
    pick(point: number[], renderer: any): void;
    getActors(): any[];
    getCellId(): number;
  }

  const vtkCellPickerModule: {
    newInstance(): vtkCellPicker;
  };

  export default vtkCellPickerModule;
}

declare module '@kitware/vtk.js/IO/XML/XMLPolyDataReader' {
  interface vtkXMLPolyDataReader {
    parseAsArrayBuffer(buffer: ArrayBuffer): void;
    getOutputData(index: number): any;
  }

  const vtkXMLPolyDataReaderModule: {
    newInstance(): vtkXMLPolyDataReader;
  };

  export default vtkXMLPolyDataReaderModule;
}

declare module '@kitware/vtk.js/Rendering/Core/ColorTransferFunction' {
  interface vtkColorTransferFunction {
    addRGBPoint(value: number, r: number, g: number, b: number): void;
    removeAllPoints(): void;
  }

  const vtkColorTransferFunctionModule: {
    newInstance(): vtkColorTransferFunction;
  };

  export default vtkColorTransferFunctionModule;
}

declare module '@kitware/vtk.js/Rendering/Core/ScalarBarActor' {
  interface TextStyle {
    fontColor?: string;
    fontStyle?: string;
    fontSize?: number;
    fontFamily?: string;
  }

  interface vtkScalarBarActor {
    setScalarsToColors(lut: any): void;
    setAxisLabel(label: string): void;
    setAxisTextStyle(style: TextStyle): void;
    setTickTextStyle(style: TextStyle): void;
    setBoxPosition(position: [number, number]): void;
    setBoxSize(size: [number, number]): void;
    setVisibility(visible: boolean): void;
  }

  const vtkScalarBarActorModule: {
    newInstance(): vtkScalarBarActor;
  };

  export default vtkScalarBarActorModule;
}

// Extend Window interface for global functions
interface Window {
  resetCamera?: () => void;
  toggleWireframe?: () => void;
  downloadFromCloud?: () => Promise<void>;
  showFractureZone?: () => void;
  showDamageZone?: () => void;
}
