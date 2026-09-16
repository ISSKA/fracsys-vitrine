export type ViewerTabId =
  | 'fracture-network'
  | 'damage-zone'
  | 'flow-network'
  | 'productive-zone'
  | 'dynamic-flow';

export interface ViewerTabDefinition {
  id: ViewerTabId;
  label: string;
  subtitle: string;
  engine: 'mesh' | 'flow';
}

export const VIEWER_TABS: readonly ViewerTabDefinition[] = [
  { id: 'fracture-network', label: 'Fracture network', subtitle: 'Explore the fracture geometry and connected flow paths.', engine: 'mesh' },
  { id: 'damage-zone', label: 'Damage zone', subtitle: 'View the flow-network voxels as a solid damage-zone volume.', engine: 'flow' },
  { id: 'flow-network', label: 'Flow network', subtitle: 'Inspect the simulated groundwater flow through the voxel grid.', engine: 'flow' },
  { id: 'productive-zone', label: 'Productive zone', subtitle: 'View the productive part of the model.', engine: 'flow' },
  { id: 'dynamic-flow', label: 'Dynamic flow', subtitle: 'Follow particles through the changing flow network.', engine: 'flow' },
];

function setActiveTab(tab: ViewerTabDefinition): void {
  document.body.dataset.activeTab = tab.id;
  document.querySelectorAll<HTMLButtonElement>('[data-viewer-tab]').forEach((button) => {
    const isActive = button.dataset.viewerTab === tab.id;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll<HTMLElement>('[data-engine-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.enginePanel !== tab.engine;
  });
  document.querySelectorAll<HTMLElement>('[data-parameter-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.parameterPanel !== tab.id;
  });
  document.querySelectorAll<HTMLElement>('[data-legend-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.legendPanel !== tab.id;
  });
  document.dispatchEvent(new CustomEvent<ViewerTabDefinition>('viewer-tab-change', { detail: tab }));
}

export function setupViewerTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-viewer-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = VIEWER_TABS.find(({ id }) => id === button.dataset.viewerTab);
      if (tab) setActiveTab(tab);
    });
  });
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const initialTab = VIEWER_TABS.find(({ id }) => id === requestedTab) ?? VIEWER_TABS[0];
  setActiveTab(initialTab);
}

setupViewerTabs();