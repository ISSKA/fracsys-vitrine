export type ViewerBackground = 'black' | 'white';

const STORAGE_KEY = 'fracsys-viewer-background';

function readSavedBackground(): ViewerBackground {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'white' ? 'white' : 'black';
  } catch {
    return 'black';
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

  let background = readSavedBackground();

  const apply = (): void => {
    const isWhite = background === 'white';
    const nextBackground = isWhite ? 'black' : 'white';

    document.body.dataset.viewerBackground = background;
    button.textContent = nextBackground === 'white' ? '☀' : '☾';
    button.title = `Switch to ${nextBackground} background`;
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(isWhite));
    applyBackground(background);
  };

  button.addEventListener('click', () => {
    background = background === 'black' ? 'white' : 'black';
    saveBackground(background);
    apply();
  });

  apply();
}
