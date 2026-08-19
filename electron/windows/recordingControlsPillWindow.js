import { BrowserWindow, screen, ipcMain, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let controlsPillWindow = null;
let isCreating = false;
let detachedPosition = null; // { x, y } if moved by user during session

// Default dimensions of the controls pill window canvas
const CONTROLS_WIN_WIDTH = 420;
const CONTROLS_WIN_HEIGHT = 120;

function computeAnchorPosition(targetDisplay) {
  let display = targetDisplay;
  if (!display) {
    try { display = screen.getPrimaryDisplay(); } catch {}
  }
  const workArea = display?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const { x: workX, y: workY, width: workW, height: workH } = workArea;

  // Center horizontally, dock just underneath the Dynamic Island top capsule (~48px down)
  const defaultX = Math.round(workX + (workW - CONTROLS_WIN_WIDTH) / 2);
  const defaultY = Math.round(workY + 48);

  if (detachedPosition && Number.isFinite(detachedPosition.x) && Number.isFinite(detachedPosition.y)) {
    // Keep user's custom dragged location within display bounds
    return {
      x: Math.max(workX, Math.min(detachedPosition.x, workX + workW - CONTROLS_WIN_WIDTH)),
      y: Math.max(workY, Math.min(detachedPosition.y, workY + workH - CONTROLS_WIN_HEIGHT)),
    };
  }

  return { x: defaultX, y: defaultY };
}

export function createRecordingControlsPillWindow(targetDisplayId = null) {
  if (controlsPillWindow && !controlsPillWindow.isDestroyed()) {
    try {
      controlsPillWindow.show();
      return controlsPillWindow;
    } catch {}
  }

  if (isCreating) return null;
  isCreating = true;

  try {
    let targetDisplay = null;
    if (targetDisplayId !== null) {
      targetDisplay = screen.getAllDisplays().find((d) => d.id === targetDisplayId);
    }
    if (!targetDisplay) {
      targetDisplay = screen.getPrimaryDisplay();
    }

    const { x, y } = computeAnchorPosition(targetDisplay);

    controlsPillWindow = new BrowserWindow({
      width: CONTROLS_WIN_WIDTH,
      height: CONTROLS_WIN_HEIGHT,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      show: false,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, '../../preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false,
      },
    });

    controlsPillWindow.setAlwaysOnTop(true, 'screen-saver');
    controlsPillWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // Default to passing through mouse events until mouse enters the pill
    controlsPillWindow.setIgnoreMouseEvents(true, { forward: true });

    // Track user drag / moved position
    controlsPillWindow.on('moved', () => {
      if (controlsPillWindow && !controlsPillWindow.isDestroyed()) {
        const bounds = controlsPillWindow.getBounds();
        detachedPosition = { x: bounds.x, y: bounds.y };
      }
    });

    controlsPillWindow.webContents.on('will-navigate', (e) => e.preventDefault());
    controlsPillWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    const indexPath = path.join(__dirname, '../../dist/index.html');
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
      controlsPillWindow.loadURL('http://localhost:5173?route=recording-controls#recording-controls').catch(() => {
        if (controlsPillWindow && !controlsPillWindow.isDestroyed()) {
          controlsPillWindow.loadFile(indexPath, { search: 'route=recording-controls', hash: 'recording-controls' }).catch(() => {});
        }
      });
    } else {
      controlsPillWindow.loadFile(indexPath, { search: 'route=recording-controls', hash: 'recording-controls' }).catch(() => {});
    }

    controlsPillWindow.once('ready-to-show', () => {
      if (controlsPillWindow && !controlsPillWindow.isDestroyed()) {
        controlsPillWindow.show();
      }
    });

    controlsPillWindow.on('closed', () => {
      controlsPillWindow = null;
    });

    return controlsPillWindow;
  } finally {
    isCreating = false;
  }
}

export function destroyRecordingControlsPillWindow() {
  if (controlsPillWindow) {
    if (!controlsPillWindow.isDestroyed()) {
      try {
        controlsPillWindow.close();
      } catch {}
    }
    controlsPillWindow = null;
  }
  // Reset detached position on recording completion so next session re-anchors nicely
  detachedPosition = null;
}

export function getRecordingControlsPillWindow() {
  return (controlsPillWindow && !controlsPillWindow.isDestroyed()) ? controlsPillWindow : null;
}

export function repositionControlsPill(targetDisplay) {
  if (controlsPillWindow && !controlsPillWindow.isDestroyed()) {
    try {
      const { x, y } = computeAnchorPosition(targetDisplay);
      controlsPillWindow.setPosition(x, y, false);
    } catch {}
  }
}

// Window resize helper from renderer
ipcMain.on('resize-controls-pill-window', (event, payload = {}) => {
  const { width, height } = payload || {};
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win === controlsPillWindow && !win.isDestroyed()) {
    const bounds = win.getBounds();
    const newW = Math.max(width || CONTROLS_WIN_WIDTH, CONTROLS_WIN_WIDTH);
    const newH = Math.max(height || CONTROLS_WIN_HEIGHT, CONTROLS_WIN_HEIGHT);
    if (bounds.width !== newW || bounds.height !== newH) {
      try {
        win.setSize(newW, newH, false);
      } catch {}
    }
  }
});
