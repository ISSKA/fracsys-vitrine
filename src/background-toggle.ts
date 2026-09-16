export type ViewerBackground = 'black' | 'white';

const STORAGE_KEY = 'fracsys-viewer-background';
let currentBackground = readSavedBackground();
let isInitialized = false;
const backgroundListeners: Array<(background: ViewerBackground) => void> = [];

function readSavedBackground(): ViewerBackground {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'black' ? 'black' : 'white';
  } catch {
    return 'white';
  }
}

function saveBackground(background: ViewerBackground): void {
  try {
    localStorage.setItem(STORAGE_KEY, background);
  } catch {
    // The toggle still works when storage is unavailable.
  }
}

export function setupBackgroundToggle(
  applyBackground: (background: ViewerBackground) => void,
): void {
  const button = document.getElementById('background-toggle') as HTMLButtonElement | null;
  if (!button) return;

  backgroundListeners.push(applyBackground);

  const apply = (): void => {
    const isWhite = currentBackground === 'white';
    const nextBackground = isWhite ? 'black' : 'white';

    document.body.dataset.viewerBackground = currentBackground;
    button.textContent = nextBackground === 'white' ? '☀' : '☾';
    button.title = `Switch to ${nextBackground} background`;
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(isWhite));
    backgroundListeners.forEach((listener) => listener(currentBackground));
  };

  if (!isInitialized) {
    isInitialized = true;
    button.addEventListener('click', () => {
      currentBackground = currentBackground === 'black' ? 'white' : 'black';
      saveBackground(currentBackground);
      apply();
    });
  }

  apply();
}
