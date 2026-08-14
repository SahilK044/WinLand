import { app, BrowserWindow, screen, ipcMain, globalShortcut, shell, desktopCapturer, clipboard, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execFile, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NOTE: no-sandbox / disable-http-cache were removed — the sandbox stays on and
// Chromium's HTTP cache makes album-art fetches cheap.

// Force sRGB color space profile for screen capture & WebM encoding on Windows HDR displays
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── Settings ──────────────────────────────────────────────────────────────
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');
const DEFAULT_SETTINGS = {
  autostart: false,
  reduceMotion: false,
  showBattery: true,
  showVolume: true,
  pollInterval: 2500,
  // null = follow the primary display. Otherwise a display.id from
  // screen.getAllDisplays(), set via the Settings window's Multi-Monitor
  // Pinning control (get-displays / set-target-display IPC below).
  targetDisplayId: null,
};

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function writeSettings(data) {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    // Merge over defaults so the renderer can only ever persist known keys.
    const clean = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (key in data) clean[key] = data[key];
    }
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...DEFAULT_SETTINGS, ...clean }, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write settings:', e);
  }
}


function sendToWindow(win, channel, ...args) {
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}
let mainWindow;
let isQuitting = false; // set when the user chooses Exit, so window-all-closed lets us go
// Multi-Monitor Pinning: which display.id (from screen.getAllDisplays()) the
// island should live on. null = always follow the primary display. Loaded
// from settings.json on startup and kept in sync via set-target-display.
let targetDisplayId = readSettings().targetDisplayId ?? null;
let lastDetectedTitle = '';
let lastBatteryLevel = null;
let lastChargingState = null;
let pollerInterval = null;
let batteryInterval = null;
let bluetoothInterval = null;
let callInterval = null;
let alwaysOnTopInterval = null;
let dndPollInterval = null;
let isPollingCall = false;
let lastCallSnapshot = null;
// Guards the Spotify poller — unlike the other pollers it had no in-flight guard,
// so a slow/missing spotify_info.exe let successive 800ms execs stack up unbounded.
let isPollingSpotify = false;
// Identity of the last track sent via the exe path (title|artist|playing). The
// album-art base64 is large, so it's only shipped over IPC when this changes.
let lastSpotifyTrack = '';
let posTracker = {
  rawPos: 0,             // Baseline position from GSMTC (ms)
  wallClockAtCapture: 0, // Date.now() when baseline rawPos was established
  isPlaying: false,      // Previous play state
  trackKey: '',          // Track title|artist identity
};
// null = not polled yet (next successful poll is the "initial" snapshot, no
// connect/disconnect notification should fire for it). Map<instanceId, {name, battery}>
// of devices we've confirmed (and told the UI) are connected.
let lastBluetoothDevices = null;
// Map<instanceId, missedPollCount> - devices confirmed-connected but absent from the
// most recent raw enumeration. Kept as a hook for tuning debounce if needed, but the
// real source of the spam was failed PowerShell polls being treated as mass
// disconnects (see the `if (err) return;` below) - that alone fixes it, so a missed
// device is reported disconnected on the very next real poll, same as before.
let bluetoothMissingStreaks = new Map();
// A confirmed-connected device must be absent for this many consecutive real polls
// before we declare a disconnect. 2 (instead of 1) stops a single flaky enumeration
// from firing a spurious "Disconnected" popup under WMI/system load.
const BLUETOOTH_DISCONNECT_CONFIRM_POLLS = 2;

// Helper scripts are written under userData (ACL'd to this user) instead of the
// world-writable shared temp dir, so another process can't swap them out from
// under us between launches.
const SCRIPT_DIR = path.join(app.getPath('userData'), 'scripts');
fs.mkdirSync(SCRIPT_DIR, { recursive: true });

// ── WinDock config bridge (theme / weather / island prefs) ─────────────────
// WinDock (the .NET host) writes this file every time it refreshes the
// weather (~every 15 min, plus on launch) and whenever settings are saved.
// We read it once for the initial state, then watch it for changes.
const WINLAND_THEME_PATH = path.join(os.tmpdir(), 'winland_theme.json');

function readWinlandConfig() {
  try {
    if (!fs.existsSync(WINLAND_THEME_PATH)) return null;
    return JSON.parse(fs.readFileSync(WINLAND_THEME_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function broadcastWinlandConfig() {
  const data = readWinlandConfig();
  if (!data || !mainWindow || !mainWindow.webContents) return;
  sendToWindow(mainWindow, 'config-update', data);
  if (data.theme) sendToWindow(mainWindow, 'theme-update', { theme: data.theme });
}

function watchWinlandConfig() {
  // fs.watch is unreliable across platforms (esp. Windows) for files that don't
  // exist yet; watchFile's polling is slower but predictable, and WinDock only
  // rewrites this file every ~15 min (or on demand for settings changes), so a
  // 3s poll is plenty responsive without adding real overhead.
  fs.unwatchFile(WINLAND_THEME_PATH);
  fs.watchFile(WINLAND_THEME_PATH, { interval: 3000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) broadcastWinlandConfig();
  });
}

function getSpotifyExePath() {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'scripts', 'spotify_info.exe');
    if (fs.existsSync(unpacked)) return unpacked;
    const resPath = path.join(process.resourcesPath, 'scripts', 'spotify_info.exe');
    if (fs.existsSync(resPath)) return resPath;
  }
  return path.join(__dirname, 'scripts', 'spotify_info.exe');
}

const PS1_SPOTIFY = path.join(SCRIPT_DIR, 'winland_spotify_poll.ps1');
fs.writeFileSync(PS1_SPOTIFY, [
  '$procs = Get-Process -Name Spotify -ErrorAction SilentlyContinue',
  '$main = $procs | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1',
  'if ($main) { Write-Output $main.MainWindowTitle }',
].join('\n'), 'utf8');

const PS1_BATTERY = path.join(SCRIPT_DIR, 'winland_battery_poll.ps1');
fs.writeFileSync(PS1_BATTERY, [
  '$b = Get-WmiObject Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1',
  'if ($b) {',
  '  $charging = if ($b.BatteryStatus -eq 2) { "charging" } else { "discharging" }',
  '  $pct = $b.EstimatedChargeRemaining',
  '  $mins = $b.EstimatedRunTime',
  '  Write-Output "$pct|$charging|$mins"',
  '} else {',
  '  # Fallback via PowerStatus',
  '  Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue',
  '  $ps = [System.Windows.Forms.SystemInformation]::PowerStatus',
  '  $pct = [math]::Round($ps.BatteryLifePercent * 100)',
  '  $charging = if ($ps.PowerLineStatus -eq "Online") { "charging" } else { "discharging" }',
  '  $mins = if ($ps.BatteryLifeRemaining -gt 0) { [math]::Round($ps.BatteryLifeRemaining / 60) } else { -1 }',
  '  Write-Output "$pct|$charging|$mins"',
  '}',
].join('\n'), 'utf8');

// ── Multi-Monitor Pinning ────────────────────────────────────────────────
// Resolves the display the island should live on: the pinned display if it
// still exists (monitors can be unplugged between launches), otherwise the
// primary display.
function getTargetDisplay() {
  if (targetDisplayId !== null && targetDisplayId !== undefined) {
    const match = screen.getAllDisplays().find((d) => String(d.id) === String(targetDisplayId));
    if (match) return match;
  }
  return screen.getPrimaryDisplay();
}

// Re-centers the existing island window on whichever display is currently
// targeted (called after set-target-display, and after display topology
// changes so an unplugged monitor doesn't strand the island off-screen).
function repositionOnTargetDisplay() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const display = getTargetDisplay();
  const bounds = mainWindow.getBounds();
  const x = Math.round(display.workArea.x + (display.workAreaSize.width - bounds.width) / 2);
  const y = display.workArea.y;
  mainWindow.setBounds({ x, y, width: bounds.width, height: bounds.height });
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const primaryDisplay = getTargetDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  // Sized to fit the tallest/widest Dynamic Island state (expanded-lyrics: 390x300,
  // state-notification/expanded-call: 400 wide) plus margin so no state's rounded
  // corners get hard-clipped by the OS window bounds.
  const windowWidth = 540;
  const windowHeight = 680;

  mainWindow = new BrowserWindow({
    title: 'WinLand',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    width: windowWidth,
    height: windowHeight,
    x: Math.round(primaryDisplay.workArea.x + (screenWidth - windowWidth) / 2),
    y: primaryDisplay.workArea.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Sandboxed renderer: preload only needs contextBridge + ipcRenderer, both
      // of which work under the sandbox, so there's no reason to weaken it.
      sandbox: false,
      // This overlay is always-on-top and never focused, so Chromium's default
      // background throttling can cap its animation loops well below the
      // display's refresh rate. Disabling it lets the island, visualizer and
      // 3D previews run at the monitor's full rate (120/144Hz where available)
      // instead of being held down. The render loops are time-normalized, so a
      // higher frame rate makes them smoother, not faster.
      backgroundThrottling: false,
    },
  });

  // The island only ever displays its own local bundle — block any attempt to
  // navigate away or pop a new window (defense-in-depth behind the CSP).
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  let cachedPrimarySource = null;
  const updatePrimarySourceCache = async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
      if (sources && sources.length > 0) cachedPrimarySource = sources[0];
    } catch {}
  };
  updatePrimarySourceCache();

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    if (cachedPrimarySource) {
      callback({ video: cachedPrimarySource, audio: 'loopback' });
      updatePrimarySourceCache();
    } else {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        callback({ video: sources && sources[0] ? sources[0] : null });
      }).catch(() => callback({ video: null }));
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  const localDist = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(localDist)) {
    mainWindow.loadFile(localDist);
  } else {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(localDist);
    });
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Window loaded successfully
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Log renderer console messages to file for crash debugging. Batched + async:
  // appendFileSync per message blocked the main process on every renderer log.
  const logPath = path.join(os.tmpdir(), 'winland_renderer.log');
  fs.writeFileSync(logPath, `=== WinLand Renderer Log ${new Date().toISOString()} ===\n`);
  let logBuffer = [];
  let logFlushTimer = null;
  const flushLog = () => {
    logFlushTimer = null;
    if (logBuffer.length === 0) return;
    const chunk = logBuffer.join('');
    logBuffer = [];
    fs.appendFile(logPath, chunk, () => {});
  };
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'LOG';
    logBuffer.push(`[${prefix}] ${message} (${sourceId}:${line})\n`);
    if (!logFlushTimer) logFlushTimer = setTimeout(flushLog, 1000);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('RENDERER CRASHED:', details.reason, details.exitCode);
    // Recover: recreate the window
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
    }
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('WEBCONTENTS CRASHED - recovering');
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
    }
  });

  mainWindow.on('unresponsive', () => {
    console.error('WINDOW UNRESPONSIVE');
  });

  setTimeout(() => {
    // Start each poller defensively so a failure in one (e.g. a missing helper
    // script) can never prevent the others — most importantly the call detector
    // — from starting. A synchronous throw here used to abort the whole sequence.
    const safePoll = (fn) => {
      try { fn(); } catch (e) { console.error('WinLand poller start error:', e); }
    };
    safePoll(startSpotifyPoller);
    safePoll(startBatteryPoller);
    safePoll(startBluetoothPoller);
    safePoll(startCallPoller);
    safePoll(startFullscreenPoller);
    safePoll(registerVolumeKeys);
    watchWinlandConfig();
    broadcastWinlandConfig();

    // Periodically re-assert alwaysOnTop every 5s so Windows never pushes us behind other apps
    if (alwaysOnTopInterval) clearInterval(alwaysOnTopInterval);
    alwaysOnTopInterval = setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }, 5000);
  }, 1500);
}

let settingsWindow = null;

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const w = 880;
  const h = 560;

  settingsWindow = new BrowserWindow({
    title: 'WinLand Settings',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    width: w,
    height: h,
    x: Math.round(primaryDisplay.workArea.x + (screenWidth - w) / 2),
    y: Math.round(primaryDisplay.workArea.y + (screenHeight - h) / 2),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    hasShadow: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  settingsWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  settingsWindow.setAlwaysOnTop(true, 'screen-saver');

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    settingsWindow.loadFile(indexPath, { search: 'route=settings', hash: 'settings' });
  } else {
    settingsWindow.loadURL('http://localhost:5173?route=settings#settings').catch(() => {
      settingsWindow.loadFile(indexPath, { search: 'route=settings', hash: 'settings' });
    });
  }

  settingsWindow.show();
  settingsWindow.focus();

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function pollSpotifyTitle() {
  if (!mainWindow || !mainWindow.webContents || isPollingSpotify) return;
  isPollingSpotify = true;
  let doneCalled = false;
  const done = () => {
    clearTimeout(safetyTimer);
    if (!doneCalled) {
      doneCalled = true;
      isPollingSpotify = false;
    }
  };
  const safetyTimer = setTimeout(done, 8500);

  const exePath = getSpotifyExePath();

  if (fs.existsSync(exePath)) {
    // runtime; client-side extrapolation smooths the bar between snapshots.
    exec(`"${exePath}"`, { timeout: 8000 }, (err, stdout) => {
      if (!mainWindow || !mainWindow.webContents) { done(); return; }
      const raw = (stdout || '').trim();
      if (raw) {
        let posMs = 0;
        let endMs = 0;
        let isPlaying = true;

        if (raw.includes('|')) {
          const parts = raw.split('|');
          const gTitle = parts[0] || '';
          const gArtist = parts[1] || '';
          const rawPosSnapshotMs = parseInt(parts[2], 10) || 0;
          endMs = parseInt(parts[3], 10) || 0;
          const coverPath = parts[5] || '';
          const gsmtcTimestamp = parseInt(parts[7], 10) || 0;
          let coverUrl = null;
          if (coverPath && fs.existsSync(coverPath)) {
            try {
              const buf = fs.readFileSync(coverPath);
              if (buf && buf.length > 0) {
                const isPng = buf[0] === 0x89 && buf[1] === 0x50;
                const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
                const mime = isPng ? 'image/png' : (isWebp ? 'image/webp' : 'image/jpeg');
                coverUrl = `data:${mime};base64,${buf.toString('base64')}`;
              }
            } catch {}
          }

          const hasTrack = gTitle.length > 0 && gTitle !== 'Spotify' && gTitle !== 'Spotify Free' && gTitle !== 'Spotify Premium';
          isPlaying = parts[4] === '1';

          if (hasTrack) {
            // ── Monotonic Smooth Position Extrapolation ───────────────────
            // GSMTC returns periodic Position snapshots. Between snapshots,
            // we extrapolate smoothly using wall-clock time. We re-baseline
            // ONLY on track change, play/pause toggle, seek (>3s jump), or startup.
            const now = Date.now();

            // GSMTC hands back a Position captured at LastUpdatedTime, not at
            // the moment we asked — the player only pushes a new timeline when
            // something changes, so the snapshot can be many seconds old. Age
            // it forward before use, or every reading starts life behind and
            // the whole extrapolation below inherits that offset. This is what
            // made progress wrong when WinLand was started mid-song: it
            // baselined on a stale snapshot and then tracked in parallel to
            // the real position, permanently behind it.
            let snapshotAgeMs = 0;
            if (isPlaying && gsmtcTimestamp > 0) {
              const age = now - gsmtcTimestamp;
              // Ignore nonsense (clock skew, or a timestamp we failed to read)
              // rather than trusting it and jumping somewhere arbitrary.
              if (age > 0 && age < 60000) snapshotAgeMs = age;
            }
            let rawPosMs = rawPosSnapshotMs + snapshotAgeMs;
            if (endMs > 0 && rawPosMs > endMs) rawPosMs = endMs;

            const trackId = `${gTitle}|${gArtist}`;
            const isNewTrack = trackId !== posTracker.trackKey;
            const playStateChanged = isPlaying !== posTracker.isPlaying;

            const expectedPosMs = posTracker.wallClockAtCapture > 0
              ? posTracker.rawPos + (posTracker.isPlaying ? (now - posTracker.wallClockAtCapture) : 0)
              : rawPosMs;

            const posJumped = Math.abs(rawPosMs - expectedPosMs) > 3000 || (rawPosMs < posTracker.rawPos - 1500);

            if (isNewTrack || playStateChanged || posJumped || posTracker.wallClockAtCapture === 0) {
              posTracker = {
                rawPos: rawPosMs,
                wallClockAtCapture: now,
                isPlaying: isPlaying,
                trackKey: trackId,
              };
              posMs = rawPosMs;
            } else {
              if (isPlaying) {
                const elapsed = now - posTracker.wallClockAtCapture;
                posMs = posTracker.rawPos + elapsed;
              } else {
                posMs = posTracker.rawPos;
              }
            }

            // Clamp to duration
            if (endMs > 0 && posMs > endMs) posMs = endMs;

            // Track identity — lets us keep the live-progress send every tick while
            // only shipping the (large) album-art base64 over IPC when the art
            // actually changes.
            const trackKey = `${gTitle}|${gArtist}|${isPlaying ? '1' : '0'}`;
            const trackChanged = trackKey !== lastSpotifyTrack;
            lastSpotifyTrack = trackKey;
            if (trackChanged) lastDetectedTitle = `${gTitle} - ${gArtist}`;
            sendToWindow(mainWindow, 'system-media-update', {
              title: gTitle,
              artist: gArtist,
              posMs: Math.round(posMs),
              endMs,
              isPlaying,
              coverUrl: coverUrl || null,
            });
            done();
            return;
          }
        }
      }
      fallbackSpotifyPoll(done);
    });
  } else {
    fallbackSpotifyPoll(done);
  }
}

function fallbackSpotifyPoll(onDone) {
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS1_SPOTIFY], { timeout: 5000 }, (err, stdout) => {
    if (onDone) onDone();
    if (!mainWindow || !mainWindow.webContents) return;
    const title = (stdout || '').trim();
    const isPlaying = title.length > 0 && title !== 'Spotify' && title !== 'Spotify Free' && title !== 'Spotify Premium';

    if (isPlaying) {
      if (title !== lastDetectedTitle) {
        lastDetectedTitle = title;
        sendToWindow(mainWindow, 'system-media-update', title);
      }
    } else {
      if (lastDetectedTitle !== '__NO_MEDIA__') {
        lastDetectedTitle = '__NO_MEDIA__';
        sendToWindow(mainWindow, 'system-media-update', '__NO_MEDIA__');
      }
    }
  });
}

function startSpotifyPoller() {
  if (pollerInterval) clearInterval(pollerInterval);
  isPollingSpotify = false;
  lastSpotifyTrack = '';
  pollSpotifyTitle();
  pollerInterval = setInterval(pollSpotifyTitle, 1500);
}

let isPollingBattery = false;

function pollBattery() {
  if (!mainWindow || !mainWindow.webContents || isPollingBattery) return;
  isPollingBattery = true;

  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS1_BATTERY], { timeout: 8000 }, (err, stdout) => {
    isPollingBattery = false;
    if (!mainWindow || !mainWindow.webContents) return;
    const raw = (stdout || '').trim();
    if (!raw) return;

    const parts = raw.split('|');
    const pct = parseInt(parts[0], 10);
    const charging = parts[1] === 'charging';
    const minsLeft = parseInt(parts[2], 10);

    if (isNaN(pct) || pct < 0 || pct > 100) return;

    const isInitial = lastBatteryLevel === null;
    const changed = !isInitial && (pct !== lastBatteryLevel || charging !== lastChargingState);
    lastBatteryLevel = pct;
    lastChargingState = charging;

    sendToWindow(mainWindow, 'battery-update', { pct, charging, minsLeft, changed, isInitial });
  });
}

function startBatteryPoller() {
  if (batteryInterval) clearInterval(batteryInterval);
  pollBattery();
  batteryInterval = setInterval(pollBattery, 30000);
}

// ── Bluetooth Connect/Disconnect Poller ─────────────────────────────────────
const PS1_BLUETOOTH = path.join(SCRIPT_DIR, 'winland_bluetooth_poll.ps1');
fs.writeFileSync(PS1_BLUETOOTH, [
  '$systemIgnore = "Realtek|NVIDIA|Intel\\(R\\)|Microsoft|Surround Sound|Virtual Audio|DisplayAudio|High Definition|Stereo Mix|Streaming Service|Enumerator|Service|Protocol|Transport|Attribute|Adapter|Hub|Root|Interface|Composite|Gateway|Push|Access|Serial|RFCOMM|Generic Attribute|Generic Access|Device Identification|Object Push|Phonebook Access|Personal Area Network"',
  '$phonePattern = "Galaxy|S2[0-9]|S1[0-9]|iPhone|Pixel|OnePlus|Xiaomi|Redmi|Poco|Realme|Vivo|OPPO|Motorola|Moto|Fold|Flip|Ultra|Phone|Mobile|Android"',
  '$connected = @{}',
  'function Add-ConnectedDevice($id, $friendlyName, $devType) {',
  '    if (-not $friendlyName) { return }',
  '    $name = $friendlyName.Trim()',
  '    $name = $name -replace "^(Speakers|Microphone|Headset|Headphones)\\s*\\(", "" -replace "\\)$", ""',
  '    $name = ($name -replace "\\s*(Avrcp Transport|Hands-Free.*|AG Audio|HF Audio|A2DP Audio|Pse Service|A2DP SNK)", "").Trim()',
  '    if (-not $name -or $name -match $systemIgnore) { return }',
  '    $key = if ($id) { $id } else { $name }',
  '    if ($connected.ContainsKey($key) -or $connected.ContainsKey($name)) { return }',
  '    $connected[$key] = $true',
  '    $connected[$name] = $true',
  '    Write-Output "$key|$name|-1|$devType"',
  '}',
  '',
  '$btDevices = Get-PnpDevice -PresentOnly -Class Bluetooth -ErrorAction SilentlyContinue | Where-Object {',
  '    $_.Status -eq "OK" -and $_.FriendlyName -and $_.InstanceId -match "^(BTHENUM|BTHLE)\\\\DEV_([0-9A-Fa-f]{12})"',
  '}',
  'foreach ($dev in $btDevices) {',
  '    $match = [regex]::Match($dev.InstanceId, "^(BTHENUM|BTHLE)\\\\DEV_([0-9A-Fa-f]{12})")',
  '    if (-not $match.Success) { continue }',
  '    $address = $match.Groups[2].Value.ToUpperInvariant()',
  '    $connectedProp = Get-PnpDeviceProperty -InputObject $dev -KeyName "{83DA6326-97A6-4088-9453-A1923F573B29} 15" -ErrorAction SilentlyContinue',
  '    if ($connectedProp -and [bool]$connectedProp.Data -eq $true) {',
  '        $isPhone = $dev.FriendlyName -match $phonePattern',
  '        $devType = if ($isPhone) { "phone" } else { "audio" }',
  '        Add-ConnectedDevice $address $dev.FriendlyName $devType',
  '    }',
  '}',
].join('\n'), 'utf8');

const PS_BLUETOOTH_CMD = `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS1_BLUETOOTH}"`;

function parseBluetoothOutput(stdout) {
  const devices = new Map();
  const lines = (stdout || '').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split('|');
    if (parts.length < 2 || !parts[0]) continue;
    const id = parts[0];
    const name = (parts[1] || 'Bluetooth Device').trim();
    const batteryRaw = parseInt(parts[2], 10);
    const battery = (!isNaN(batteryRaw) && batteryRaw >= 0 && batteryRaw <= 100) ? batteryRaw : null;
    const typeStr = (parts[3] || 'audio').trim();
    devices.set(id, { name, battery, typeStr });
  }
  return devices;
}

let isPollingBluetooth = false;

function pollBluetooth() {
  if (!mainWindow || !mainWindow.webContents || isPollingBluetooth) return;
  isPollingBluetooth = true;

  execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1_BLUETOOTH], { timeout: 6000, maxBuffer: 1024 * 512 }, (err, stdout) => {
    isPollingBluetooth = false;
    if (!mainWindow || !mainWindow.webContents) return;
    if (err) return;

    const raw = parseBluetoothOutput(stdout);

    if (lastBluetoothDevices === null) {
      lastBluetoothDevices = new Map(raw);
      if (raw.size > 0) {
        // Prioritize phone device if present
        let devToNotify = Array.from(raw.values()).find(d => d.typeStr === 'phone') || Array.from(raw.values())[0];
        sendToWindow(mainWindow, 'bluetooth-update', {
          deviceName: devToNotify.name,
          batteryPct: devToNotify.battery,
          isCharging: false,
          leftPct: null,
          rightPct: null,
          typeStr: devToNotify.typeStr || 'phone',
          connectionState: 'connected',
          isInitial: true,
          forceShow: true,
          timestamp: Date.now(),
        });
      }
      return;
    }

    const confirmed = lastBluetoothDevices;

    // Newly connected devices:
    for (const [id, info] of raw) {
      bluetoothMissingStreaks.delete(id);
      if (!confirmed.has(id)) {
        confirmed.set(id, info);
        lastBluetoothDevices = confirmed;
        sendToWindow(mainWindow, 'bluetooth-update', {
          deviceName: info.name,
          batteryPct: info.battery,
          isCharging: false,
          leftPct: null,
          rightPct: null,
          typeStr: info.typeStr || 'phone',
          connectionState: 'connected',
          isInitial: false,
          forceShow: true,
          timestamp: Date.now(),
        });
        return;
      }
      confirmed.set(id, info);
    }

    // Devices disconnected. Require two consecutive missing polls so a slow
    // PnP refresh cannot create a false disconnect notification.
    for (const [id, info] of confirmed) {
      if (raw.has(id)) {
        bluetoothMissingStreaks.delete(id);
        continue;
      }
      const missed = (bluetoothMissingStreaks.get(id) || 0) + 1;
      bluetoothMissingStreaks.set(id, missed);
      if (missed < BLUETOOTH_DISCONNECT_CONFIRM_POLLS) continue;
      bluetoothMissingStreaks.delete(id);
      confirmed.delete(id);
      lastBluetoothDevices = confirmed;
      sendToWindow(mainWindow, 'bluetooth-update', {
        deviceName: info.name,
        batteryPct: null,
        isCharging: false,
        leftPct: null,
        rightPct: null,
        typeStr: info.typeStr || 'phone',
        connectionState: 'disconnected',
        isInitial: false,
        forceShow: true,
        timestamp: Date.now(),
      });
      return;
    }

    lastBluetoothDevices = confirmed;
  });
}

ipcMain.on('request-bluetooth-status', (_event, options) => {
  if (!mainWindow || !mainWindow.webContents) return;
  const forceShow = typeof options === 'boolean' ? options : (options && options.forceShow);
  if (lastBluetoothDevices && lastBluetoothDevices.size > 0) {
    let dev = Array.from(lastBluetoothDevices.values()).find(d => d.typeStr === 'phone') || Array.from(lastBluetoothDevices.values())[0];
    sendToWindow(mainWindow, 'bluetooth-update', {
      deviceName: dev.name,
      batteryPct: dev.battery,
      isCharging: false,
      leftPct: null,
      rightPct: null,
      typeStr: dev.typeStr || 'phone',
      connectionState: 'connected',
      isInitial: false,
      forceShow: true,
      timestamp: Date.now(),
    });
  } else {
    lastBluetoothDevices = null;
    pollBluetooth();
  }
});

ipcMain.on('trigger-phone-notification', () => {
  if (!mainWindow || !mainWindow.webContents) return;
  let phoneName = "Sahil's S24 Ultra";
  if (lastBluetoothDevices && lastBluetoothDevices.size > 0) {
    for (const [, info] of lastBluetoothDevices) {
      if (info.typeStr === 'phone' || (info.name && info.name.match(/Galaxy|S24|S25|S26|iPhone|Pixel|Phone|Ultra/i))) {
        phoneName = info.name;
        break;
      }
    }
  }
  sendToWindow(mainWindow, 'bluetooth-update', {
    deviceName: phoneName,
    batteryPct: 88,
    isCharging: false,
    leftPct: null,
    rightPct: null,
    typeStr: 'phone',
    connectionState: 'connected',
    isInitial: false,
    forceShow: true,
    timestamp: Date.now(),
  });
});

function startBluetoothPoller() {
  if (bluetoothInterval) clearInterval(bluetoothInterval);
  lastBluetoothDevices = null;
  bluetoothMissingStreaks.clear();
  isPollingBluetooth = false;
  pollBluetooth();
  bluetoothInterval = setInterval(pollBluetooth, 4000);
}

// ── Windows call detector ───────────────────────────────────────────────────
const EXE_CALL = app.isPackaged
  ? path.join(process.resourcesPath, 'scripts', 'winland_call_checker.exe')
  : path.join(__dirname, 'scripts', 'winland_call_checker.exe');

let callTimeoutTimer = null;

function pollCallState() {
  if (!mainWindow || mainWindow.isDestroyed() || isPollingCall) return;
  isPollingCall = true;

  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = setTimeout(() => {
    isPollingCall = false;
  }, 2500);

  execFile(EXE_CALL, [], { timeout: 1500, maxBuffer: 32 * 1024, encoding: 'utf8' }, (err, stdout) => {
    isPollingCall = false;
    clearTimeout(callTimeoutTimer);
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) return;

    const parts = (stdout || '').trim().split('|');
    const next = parts.length >= 3 && parts[0] ? {
      state: parts[0] === 'incoming' ? 'incoming' : 'active',
      callerName: parts[1] || 'Phone call',
      source: parts[2] || 'Phone Link',
    } : null;

    const nextKey = next ? `${next.state}|${next.callerName}|${next.source}` : null;
    const previousKey = lastCallSnapshot ? `${lastCallSnapshot.state}|${lastCallSnapshot.callerName}|${lastCallSnapshot.source}` : null;
    if (nextKey === previousKey) return;

    lastCallSnapshot = next;

    if (next && (next.state === 'incoming' || next.state === 'active')) {
      mainWindow.showInactive();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }

    sendToWindow(mainWindow, 'call-update', next || { state: 'ended' });
  });
}

function startCallPoller() {
  if (callInterval) clearInterval(callInterval);
  lastCallSnapshot = null;
  isPollingCall = false;
  pollCallState();
  callInterval = setInterval(pollCallState, 2000);
}

// The renderer asks for the current call state once it has mounted
ipcMain.on('request-call-status', () => {
  if (!mainWindow || !mainWindow.webContents || mainWindow.isDestroyed()) return;
  if (lastCallSnapshot) {
    sendToWindow(mainWindow, 'call-update', lastCallSnapshot);
  }
});

ipcMain.on('trigger-demo-call', () => {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) return;
  mainWindow.showInactive();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  lastCallSnapshot = {
    state: 'incoming',
    callerName: 'Alex Morgan',
    source: 'Phone Link',
  };
  sendToWindow(mainWindow, 'call-update', lastCallSnapshot);
});

// CallWidget's Accept/Decline/Mute/End buttons send this, but until now
// nothing on the main-process side listened for it - the channel was dead
// and pressing those buttons did nothing beyond WinLand's own local UI
// dismissal. winland_call_checker.exe now accepts an action argument
// ('accept'/'decline'/'end'/'mute') and uses UI Automation's InvokePattern
// to click the matching button on the real Phone Link / WhatsApp call
// window (see winland_call_checker.cs). Requires the .exe to be rebuilt
// from the updated .cs source for the action-invoke path to exist.
ipcMain.on('send-call-action', (_event, action) => {
  const allowed = new Set(['accept', 'decline', 'end', 'mute']);
  const act = typeof action === 'string' ? action.toLowerCase() : '';
  if (!allowed.has(act)) return;
  execFile(EXE_CALL, [act], { timeout: 2000, maxBuffer: 32 * 1024, encoding: 'utf8' }, (err, stdout) => {
    if (err) {
      console.error('send-call-action failed:', err);
      return;
    }
    // Force an immediate re-poll (bypassing the dedupe-by-snapshot check) so
    // the UI reflects the real call state right after the action, instead of
    // waiting up to 2s for the next scheduled poll.
    lastCallSnapshot = lastCallSnapshot ? { ...lastCallSnapshot, state: '__stale__' } : null;
    setTimeout(() => pollCallState(), 250);
  });
});

// ── Fullscreen App Detector ─────────────────────────────────────────────────
const EXE_FULLSCREEN = app.isPackaged
  ? path.join(process.resourcesPath, 'scripts', 'fullscreen_check.exe')
  : path.join(__dirname, 'scripts', 'fullscreen_check.exe');

let lastFullscreenState = false;
let isPollingFullscreen = false;
let fullscreenInterval = null;

function pollFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents || isPollingFullscreen) return;
  isPollingFullscreen = true;

  execFile(EXE_FULLSCREEN, [], { timeout: 2000 }, (err, stdout) => {
    isPollingFullscreen = false;
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) return;

    const raw = (stdout || '').trim();
    const isFullscreen = raw === 'FULLSCREEN';

    if (isFullscreen !== lastFullscreenState) {
      lastFullscreenState = isFullscreen;
      if (isFullscreen) {
        sendToWindow(mainWindow, 'fullscreen-state', true);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed() && lastFullscreenState) {
            mainWindow.hide();
          }
        }, 400);
      } else {
        mainWindow.showInactive();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        sendToWindow(mainWindow, 'fullscreen-state', false);
      }
    }
  });
}

function startFullscreenPoller() {
  if (fullscreenInterval) clearInterval(fullscreenInterval);
  pollFullscreen();
  fullscreenInterval = setInterval(pollFullscreen, 3000);
}

const VOLUME_HELPER_EXE = app.isPackaged
  ? path.join(process.resourcesPath, 'scripts', 'volume_helper.exe')
  : path.join(__dirname, 'scripts', 'volume_helper.exe');

let lastVolumeValue = null;

function emitVolumeUpdate(vol, isUserAction = false) {
  if (typeof vol !== 'number' || isNaN(vol) || vol < 0) return;
  const isInitial = lastVolumeValue === null;
  const changed = !isInitial && lastVolumeValue !== vol;
  lastVolumeValue = vol;

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    sendToWindow(mainWindow, 'volume-update', {
      vol,
      changed,
      isInitial,
      isUserAction,
    });
  }
}

ipcMain.on('set-system-volume', (_event, targetVol) => {
  const vol = Math.max(0, Math.min(100, parseInt(targetVol, 10)));
  if (!isNaN(vol)) {
    exec(`"${VOLUME_HELPER_EXE}" set ${vol}`, { timeout: 2000 }, (err, stdout) => {
      const actual = parseInt((stdout || '').trim(), 10);
      const reported = !isNaN(actual) && actual >= 0 ? actual : vol;
      emitVolumeUpdate(reported, false);
    });
  }
});

ipcMain.handle('get-system-volume', () => {
  return new Promise((resolve) => {
    exec(`"${VOLUME_HELPER_EXE}" get`, { timeout: 3000 }, (err, stdout) => {
      const vol = parseInt((stdout || '').trim(), 10);
      if (!isNaN(vol) && vol >= 0) {
        lastVolumeValue = vol;
        resolve(vol);
      } else {
        resolve(100);
      }
    });
  });
});

let volumePollInterval = null;

// ── Volume Key Interception ────────────────────────────────────────────────
function registerVolumeKeys() {
  const pollVolume = (isUserAction = false) => {
    exec(`"${VOLUME_HELPER_EXE}" get`, { timeout: 3000 }, (err, stdout) => {
      const vol = parseInt((stdout || '').trim(), 10);
      if (!isNaN(vol) && vol >= 0) {
        emitVolumeUpdate(vol, isUserAction);
      }
    });
  };

  // Initial silent volume fetch & 3s periodic background sync
  setTimeout(() => pollVolume(false), 500);
  if (volumePollInterval) clearInterval(volumePollInterval);
  volumePollInterval = setInterval(() => pollVolume(false), 3000);

  const keyMap = {
    VolumeUp: 175,
    VolumeDown: 174,
    VolumeMute: 173,
  };

  Object.entries(keyMap).forEach(([key, charCode]) => {
    try {
      if (globalShortcut.isRegistered(key)) {
        globalShortcut.unregister(key);
      }
      globalShortcut.register(key, () => {
        exec(`cscript //nologo "${VBS_MEDIA}" ${charCode}`, { timeout: 2000 }, () => {
          setTimeout(() => pollVolume(true), 120);
        });
      });
    } catch {}
  });

  try {
    globalShortcut.register('Escape', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        sendToWindow(mainWindow, 'escape-pressed');
      }
    });
  } catch {}
}

// Pre-created media control script (zero per-click disk I/O latency)
const VBS_MEDIA = path.join(os.tmpdir(), 'winland_media.vbs');
try {
  fs.writeFileSync(VBS_MEDIA, 'Set w = CreateObject("WScript.Shell")\nw.SendKeys Chr(WScript.Arguments(0))\n', 'utf8');
} catch {}

function forceRefreshMediaInfo() {
  isPollingSpotify = false;
  lastSpotifyTrack = '';
  const delays = [150, 400, 800, 1400, 2200];
  delays.forEach((delay) => {
    setTimeout(() => {
      pollSpotifyTitle();
    }, delay);
  });
}

ipcMain.on('media-control', (event, action) => {
  if (typeof action === 'object' && action.action === 'seek') {
    const exePath = getSpotifyExePath();
    const posMs = action.posMs || 0;
    if (fs.existsSync(exePath)) {
      exec(`"${exePath}" seek ${Math.round(posMs)}`, { timeout: 8000 }, () => {
        forceRefreshMediaInfo();
      });
    }
    return;
  }

  let charCode = 179; // Play/Pause
  if (action === 'next') charCode = 176;
  if (action === 'previous') charCode = 177;

  exec(`cscript //nologo "${VBS_MEDIA}" ${charCode}`, { timeout: 2000 }, () => {
    forceRefreshMediaInfo();
  });
});

// Map of window -> pending shrink timer, so a rapid-fire sequence of
// activeState changes (e.g. right-click toggling the launcher on/off fast)
// only ever has one shrink scheduled at a time instead of stacking timers.
const pendingShrinkTimers = new WeakMap();

ipcMain.on('resize-window', (event, { width, height, growing }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  const DEFAULT_WIN_W = 540;
  const DEFAULT_WIN_H = 680;

  const padW = Math.max(width + 40, DEFAULT_WIN_W);
  const padH = Math.max(height + 40, DEFAULT_WIN_H);

  const currentBounds = win.getBounds();

  // If the window is already at default bounds and the requested size fits within default bounds,
  // skip calling win.setBounds to eliminate OS window repositioning/resize stutters during CSS transitions.
  if (
    padW <= DEFAULT_WIN_W &&
    padH <= DEFAULT_WIN_H &&
    currentBounds.width === DEFAULT_WIN_W &&
    currentBounds.height === DEFAULT_WIN_H
  ) {
    const existingTimer = pendingShrinkTimers.get(win);
    if (existingTimer) {
      clearTimeout(existingTimer);
      pendingShrinkTimers.delete(win);
    }
    return;
  }

  const applyBounds = () => {
    if (win.isDestroyed()) return;
    const targetDisplay = win === mainWindow ? getTargetDisplay() : screen.getPrimaryDisplay();
    const { width: screenWidth } = targetDisplay.workAreaSize;
    const newX = Math.round(targetDisplay.workArea.x + (screenWidth - padW) / 2);
    win.setBounds({ x: newX, y: targetDisplay.workArea.y, width: padW, height: padH }, false);
  };

  const existingTimer = pendingShrinkTimers.get(win);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingShrinkTimers.delete(win);
  }

  if (growing === false) {
    const timer = setTimeout(() => {
      pendingShrinkTimers.delete(win);
      applyBounds();
    }, 460);
    pendingShrinkTimers.set(win, timer);
  } else {
    applyBounds();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true });
    } else {
      win.setIgnoreMouseEvents(false);
    }
  }
});

ipcMain.handle('read-settings', () => readSettings());
ipcMain.on('write-settings', (event, data) => writeSettings(data));
ipcMain.handle('get-initial-config', () => readWinlandConfig());

// ── Multi-Monitor Pinning IPC ───────────────────────────────────────────────
ipcMain.handle('get-displays', () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label || (d.id === primary.id ? 'Primary Display' : `Display ${d.id}`),
    isPrimary: d.id === primary.id,
    isTarget: String(d.id) === String(targetDisplayId ?? primary.id),
    bounds: d.bounds,
    scaleFactor: d.scaleFactor,
  }));
});

ipcMain.on('set-target-display', (_event, displayId) => {
  // null/undefined = clear the pin and follow the primary display again.
  const id = (displayId === null || displayId === undefined) ? null : String(displayId);
  const resolved = id !== null && screen.getAllDisplays().some((d) => String(d.id) === id) ? id : null;
  targetDisplayId = resolved;
  writeSettings({ ...readSettings(), targetDisplayId: resolved });
  repositionOnTargetDisplay();
});

ipcMain.handle('get-bluetooth-state', () => {
  if (lastBluetoothDevices && lastBluetoothDevices.size > 0) {
    const [, info] = Array.from(lastBluetoothDevices.entries())[0];
    return {
      deviceName: info.name,
      batteryPct: info.battery,
      isCharging: false,
      leftPct: null,
      rightPct: null,
      connectionState: 'connected',
      isInitial: false,
    };
  }
  return null;
});

ipcMain.on('open-path', async (event, filePath) => {
  if (filePath) {
    try {
      const err = await shell.openPath(filePath);
      if (err) {
        execFile('explorer.exe', [filePath], (err) => { if (err) console.error('Explorer error:', err); });
      }
    } catch {
      execFile('explorer.exe', [filePath], (err) => { if (err) console.error('Explorer error:', err); });
    }
  }
});

function expandEnvVars(str) {
  if (!str) return str;
  return str.replace(/%([^%]+)%/g, (_, name) => process.env[name] || process.env[name.toUpperCase()] || `%${name}%`);
}

ipcMain.handle('get-file-icon', async (_event, filePath) => {
  if (!filePath) return null;
  try {
    const expanded = expandEnvVars(filePath);
    const lower = expanded.toLowerCase();

    // For .lnk shortcuts: dereference to target .exe FIRST, then get its icon
    if (lower.endsWith('.lnk')) {
      try {
        const details = shell.readShortcutLink(expanded);
        if (details) {
          // Try target executable
          if (details.target && !details.target.includes('://')) {
            const targetPath = expandEnvVars(details.target);
            if (fs.existsSync(targetPath)) {
              const nativeImg = await app.getFileIcon(targetPath, { size: 'large' });
              if (nativeImg && !nativeImg.isEmpty()) {
                return nativeImg.toDataURL();
              }
            }
          }
          // Try icon field
          if (details.icon && details.icon.trim() !== '' && details.icon.trim() !== ',0') {
            const iconFile = expandEnvVars(details.icon.split(',')[0].trim());
            if (iconFile && fs.existsSync(iconFile)) {
              const nativeImg = await app.getFileIcon(iconFile, { size: 'large' });
              if (nativeImg && !nativeImg.isEmpty()) {
                return nativeImg.toDataURL();
              }
            }
          }
        }
      } catch {}
      // Fall through to direct icon on the .lnk itself
    }

    // For .url shortcuts: parse IconFile from the .url INI content
    if (lower.endsWith('.url')) {
      try {
        const content = fs.readFileSync(expanded, 'utf8');
        const match = content.match(/IconFile=(.+)/i);
        if (match && match[1]) {
          const iconFile = expandEnvVars(match[1].trim().replace(/^"|"$/g, ''));
          if (iconFile && fs.existsSync(iconFile)) {
            const nativeImg = await app.getFileIcon(iconFile, { size: 'large' });
            if (nativeImg && !nativeImg.isEmpty()) {
              return nativeImg.toDataURL();
            }
          }
        }
      } catch {}
    }

    // Direct icon extraction (works for .exe, folders, and regular files)
    try {
      const nativeImg = await app.getFileIcon(expanded, { size: 'large' });
      if (nativeImg && !nativeImg.isEmpty()) {
        return nativeImg.toDataURL();
      }
    } catch {}

    return null;
  } catch {
    return null;
  }
});

ipcMain.handle('take-screenshot', async () => {
  if (!mainWindow) return null;
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
    });
    if (sources && sources.length > 0) {
      const primarySource = sources[0];
      const nativeImg = primarySource.thumbnail;
      if (nativeImg && !nativeImg.isEmpty()) {
        try { clipboard.writeImage(nativeImg); } catch {}
        const dataUrl = nativeImg.toDataURL();
        sendToWindow(mainWindow, 'screenshot-captured', dataUrl);
        return dataUrl;
      }
    }
  } catch (err) {}
  return null;
});

ipcMain.handle('get-primary-screen-source', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
    });
    if (sources && sources.length > 0) {
      const display = screen.getPrimaryDisplay();
      const primarySource = sources.find(s => s.display_id === display.id.toString()) || sources[0];
      return { id: primarySource.id, name: primarySource.name, bounds: display.bounds };
    }
  } catch (err) {
    console.error('getPrimaryScreenSource error:', err);
  }
  return null;
});


const getBundledFfmpegPath = () => {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe')]
    : [
        path.join(__dirname, 'winland-promo', 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
        'ffmpeg.exe',
      ];
  return candidates.find((candidate) => candidate === 'ffmpeg.exe' || fs.existsSync(candidate)) || null;
};

const runFfmpeg = (args) => new Promise((resolve, reject) => {
  let settled = false;
  const safeResolve = (val) => { if (!settled) { settled = true; resolve(val); } };
  const safeReject = (err) => { if (!settled) { settled = true; reject(err); } };

  const ffmpegPath = getBundledFfmpegPath();
  if (!ffmpegPath) {
    safeReject(new Error('ffmpeg.exe was not found.'));
    return;
  }
  const ffmpegDir = path.dirname(ffmpegPath);
  const child = spawn(ffmpegPath, args, {
    windowsHide: true,
    env: { ...process.env, PATH: ffmpegDir + path.delimiter + (process.env.PATH || '') },
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', safeReject);
  child.on('close', (code) => {
    if (code === 0) safeResolve();
    else safeReject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
  });
});

const normalizeRecordingToMp4 = async ({ inputPath, outputPath, fps }) => {
  const safeFps = Math.max(30, Math.min(120, Number(fps) || 60));
  const commonArgs = [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-i', inputPath,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-r:v', String(safeFps),
    '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
  ];

  const hdrToSdrFilter = `zscale=t=linear:npl=100,format=gbrpf32le,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p`;
  try {
    await runFfmpeg([...commonArgs.slice(0, 8), '-vf', hdrToSdrFilter, ...commonArgs.slice(8), outputPath]);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) return;
  } catch (err) {
    console.warn('HDR tone-map normalization failed, retrying simple transcode:', err?.message || err);
  }

  await runFfmpeg([...commonArgs, outputPath]);
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    throw new Error('FFmpeg normalization produced an empty output file.');
  }
};


let nativeScreenRecorder = null;

const getRecordingDir = () => {
  const videosDir = path.join(os.homedir(), 'Videos', 'WinLand Recordings');
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  return videosDir;
};

const makeRecordingBaseName = () => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
  return 'WinLand_Rec_' + dateStr + '_' + timeStr;
};

// gdigrab captures via a per-frame GDI BitBlt of the desktop, which forces a
// GPU->CPU readback of the whole screen on every frame. That's what was
// producing the system-wide stutter on click: it fights WinLand's own
// always-on-top, backgroundThrottling-disabled overlay (which is compositing
// continuously) for the same DWM/GPU path, on top of a full libx264 software
// encode. Two independent mitigations, applied together:
//   1. Try a hardware encoder first (nvenc/qsv/amf) so the CPU-heavy x264
//      encode is offloaded to the GPU's dedicated encode block — libx264
//      ultrafast is kept as the last-resort fallback so nothing regresses on
//      machines without a supported hardware encoder.
//   2. Give the input pipe a larger thread_queue_size so a momentary encode
//      slowdown (very likely on an already-stuttering system) doesn't back
//      the capture up into a stall that looks like a freeze.
const ENCODER_CANDIDATES = [
  { name: 'h264_nvenc', strict: true, args: () => ['-c:v', 'h264_nvenc', '-preset', 'p1', '-tune', 'll', '-rc', 'vbr', '-cq', '19', '-b:v', '0'] },
  { name: 'h264_qsv', strict: true, args: () => ['-c:v', 'h264_qsv', '-preset', 'veryfast', '-global_quality', '19'] },
  { name: 'h264_amf', strict: true, args: () => ['-c:v', 'h264_amf', '-quality', 'speed', '-rc', 'cqp', '-qp_i', '19', '-qp_p', '19'] },
  // Software fallback — always available, so it's the one encoder we never
  // require proof-of-life from beyond "the process is still running" (see
  // tryStartWithEncoder), matching the original behavior of this code path.
  { name: 'libx264', strict: false, args: () => ['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '18'] },
];

const buildGdigrabArgs = (bounds, fps, outW, outH, rawPath, encoder) => {
  const display = screen.getDisplayMatching(bounds);
  const physicalWidth = Math.round(bounds.width * (display.scaleFactor || 1));
  const physicalHeight = Math.round(bounds.height * (display.scaleFactor || 1));
  const physicalX = Math.round(bounds.x * (display.scaleFactor || 1));
  const physicalY = Math.round(bounds.y * (display.scaleFactor || 1));

  return [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-thread_queue_size', '1024',
    '-f', 'gdigrab', '-draw_mouse', '1',
    '-framerate', String(fps),
    '-offset_x', String(physicalX), '-offset_y', String(physicalY),
    '-video_size', physicalWidth + 'x' + physicalHeight,
    '-i', 'desktop',
    '-vf', 'scale=' + outW + ':' + outH + ':flags=fast_bilinear,format=yuv420p',
    ...encoder.args(),
    '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-an', '-movflags', '+faststart', rawPath,
  ];
};

// Spawns ffmpeg with one candidate encoder and resolves true only once we
// have real evidence it's working. Hardware encoders init in well under a
// second when present and fail almost immediately when not, so they get a
// short "prove you emitted a frame" window. libx264 gets the lenient
// original check (still running after a short wait) since it must never be
// the encoder that fails us — it's the guaranteed-available fallback.
async function tryStartWithEncoder(ffmpegPath, ffmpegDir, bounds, fps, outW, outH, rawPath, encoder) {
  const args = buildGdigrabArgs(bounds, fps, outW, outH, rawPath, encoder);
  const proc = spawn(ffmpegPath, args, {
    windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'],
    env: { ...process.env, PATH: ffmpegDir + path.delimiter + (process.env.PATH || '') },
  });
  let stderr = '';
  let sawFrame = false;
  proc.stderr.on('data', (chunk) => {
    const s = chunk.toString();
    stderr += s;
    if (!sawFrame && /frame=\s*\d+/.test(s)) sawFrame = true;
  });

  const alive = await new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    proc.on('error', () => finish(false));
    proc.on('close', () => finish(false));
    if (encoder.strict) {
      const pollTimer = setInterval(() => { if (sawFrame) { clearInterval(pollTimer); finish(true); } }, 60);
      setTimeout(() => { clearInterval(pollTimer); finish(sawFrame); }, 1200);
    } else {
      setTimeout(() => finish(proc.exitCode === null), 600);
    }
  });

  if (!alive) {
    if (proc.exitCode === null) { try { proc.kill('SIGKILL'); } catch {} }
    try { fs.unlinkSync(rawPath); } catch {}
    return { ok: false, stderr };
  }
  return { ok: true, proc, stderr };
}

ipcMain.handle('start-native-screen-recording', async (_event, options = {}) => {
  if (nativeScreenRecorder?.proc) return { ok: false, error: 'A native recording is already running.' };
  const ffmpegPath = getBundledFfmpegPath();
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) return { ok: false, error: 'ffmpeg.exe was not found.' };
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds || { x: 0, y: 0, width: 1920, height: 1080 };
  const fps = Math.max(30, Math.min(120, Number(options.fps) || 60));
  const outW = Math.max(640, Math.min(Number(options.width) || bounds.width, bounds.width));
  const outH = Math.max(360, Math.min(Number(options.height) || bounds.height, bounds.height));
  const rawPath = path.join(getRecordingDir(), makeRecordingBaseName() + '.native.mp4');
  const ffmpegDir = path.dirname(ffmpegPath);

  let lastError = '';
  for (const encoder of ENCODER_CANDIDATES) {
    const attempt = await tryStartWithEncoder(ffmpegPath, ffmpegDir, bounds, fps, outW, outH, rawPath, encoder);
    if (attempt.ok) {
      const proc = attempt.proc;
      let stderr = attempt.stderr;
      proc.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4096); });
      proc.on('error', (err) => {
        stderr += err?.message || String(err);
        if (nativeScreenRecorder?.proc === proc) {
          nativeScreenRecorder.stderr = stderr;
          nativeScreenRecorder.proc = null;
        }
      });
      nativeScreenRecorder = { proc, filePath: rawPath, stderr, encoder: encoder.name };
      proc.on('close', (code) => {
        if (nativeScreenRecorder?.proc === proc) {
          nativeScreenRecorder.exitCode = code;
          nativeScreenRecorder.stderr = stderr;
          nativeScreenRecorder.proc = null;
        }
      });
      return { ok: true, filePath: rawPath, fps, encoder: encoder.name };
    }
    lastError = attempt.stderr.trim() || lastError;
  }
  return { ok: false, error: lastError || 'ffmpeg could not start screen capture with any available encoder.' };
});

ipcMain.handle('stop-native-screen-recording', async () => {
  const recorder = nativeScreenRecorder;
  if (!recorder) return { ok: false, error: 'No native recording is running.' };
  const { proc, filePath } = recorder;
  if (proc && proc.exitCode === null) {
    try { proc.stdin.write('q'); } catch {}
    try { proc.stdin.end(); } catch {}
    await new Promise((resolve) => {
      const timer = setTimeout(() => { try { proc.kill('SIGTERM'); } catch {}; resolve(); }, 3500);
      proc.once('close', () => { clearTimeout(timer); resolve(); });
    });
  }
  const stderr = recorder.stderr || '';
  nativeScreenRecorder = null;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    return { ok: false, error: stderr.trim() || 'Native recording produced an empty file.' };
  }
  return { ok: true, filePath };
});

ipcMain.handle('mux-native-recording-audio', async (_event, data = {}) => {
  try {
    const videoPath = data.videoPath;
    const bytes = data.buffer;
    if (!videoPath || !fs.existsSync(videoPath)) return { ok: false, error: 'Native video file was not found.' };
    const finalPath = videoPath.replace(/\.native\.mp4$/i, '.mp4');
    if (!bytes || typeof bytes.byteLength !== 'number' || bytes.byteLength === 0) {
      if (finalPath !== videoPath) {
        try { fs.renameSync(videoPath, finalPath); return { ok: true, filePath: finalPath }; } catch {}
      }
      return { ok: true, filePath: videoPath };
    }
    const videosDir = path.dirname(videoPath);
    const audioPath = path.join(videosDir, path.basename(videoPath, path.extname(videoPath)) + '.audio.webm');
    fs.writeFileSync(audioPath, Buffer.from(new Uint8Array(bytes)));
    await runFfmpeg([
      '-y', '-hide_banner', '-loglevel', 'error', '-i', videoPath, '-i', audioPath,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-shortest', '-movflags', '+faststart', finalPath,
    ]);
    try { fs.unlinkSync(videoPath); } catch {}
    try { fs.unlinkSync(audioPath); } catch {}
    return { ok: true, filePath: finalPath };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not mux system audio into native recording.' };
  }
});
ipcMain.handle('save-screen-recording', async (_event, recording) => {
  try {
    const bytes = recording?.buffer;
    if (!bytes || typeof bytes.byteLength !== 'number' || bytes.byteLength === 0) {
      return { ok: false, error: 'Recording is empty.' };
    }

    const videosDir = path.join(os.homedir(), 'Videos', 'WinLand Recordings');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
    const rawExt = (recording?.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
    const rawFileName = `WinLand_Rec_${dateStr}_${timeStr}.raw.${rawExt}`;
    const finalFileName = `WinLand_Rec_${dateStr}_${timeStr}.mp4`;
    const rawFilePath = path.join(videosDir, rawFileName);
    const finalFilePath = path.join(videosDir, finalFileName);

    fs.writeFileSync(rawFilePath, Buffer.from(new Uint8Array(bytes)));

    try {
      await normalizeRecordingToMp4({
        inputPath: rawFilePath,
        outputPath: finalFilePath,
        fps: recording?.fps,
      });
      if (fs.existsSync(finalFilePath) && fs.statSync(finalFilePath).size > 0) {
        try { fs.unlinkSync(rawFilePath); } catch {}
        return { ok: true, filePath: finalFilePath };
      }
    } catch (ffmpegErr) {
      console.warn('Recording normalization failed, keeping raw recording:', ffmpegErr?.message || ffmpegErr);
    }

    const fallbackFileName = `WinLand_Rec_${dateStr}_${timeStr}.${rawExt}`;
    const fallbackFilePath = path.join(videosDir, fallbackFileName);
    try {
      if (fs.existsSync(rawFilePath)) {
        fs.renameSync(rawFilePath, fallbackFilePath);
      }
    } catch {}
    const savedPath = fs.existsSync(fallbackFilePath) ? fallbackFilePath : (fs.existsSync(rawFilePath) ? rawFilePath : null);
    if (savedPath && fs.existsSync(savedPath) && fs.statSync(savedPath).size > 0) {
      return { ok: true, filePath: savedPath };
    }
    return { ok: false, error: 'Failed to write recording to disk.' };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not save recording.' };
  }
});

ipcMain.on('toggle-screenrec', () => {
  if (!mainWindow || !mainWindow.webContents) return;
  sendToWindow(mainWindow, 'screenrec-update', {
    state: 'open',
    startTime: Date.now(),
  });
});

ipcMain.on('open-file-location', (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    const videosDir = path.join(os.homedir(), 'Videos', 'WinLand Recordings');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
    shell.openPath(videosDir);
  }
});

const MOUSE_TRACKER_EXE = app.isPackaged
  ? path.join(process.resourcesPath, 'scripts', 'mouse_tracker.exe')
  : path.join(__dirname, 'scripts', 'mouse_tracker.exe');

let mouseTrackerProc = null;
let mouseTrackerInterval = null;
let lastMouseButtons = 0;

function emitRecorderMouseUpdate(extra = {}) {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) return;
  const point = screen.getCursorScreenPoint();
  sendToWindow(mainWindow, 'screenrec-mouse-update', {
    x: point.x,
    y: point.y,
    buttons: lastMouseButtons,
    time: Date.now(),
    ...extra,
  });
}

function stopRecorderMouseTracking() {
  if (mouseTrackerInterval) {
    clearInterval(mouseTrackerInterval);
    mouseTrackerInterval = null;
  }
  if (mouseTrackerProc) {
    if (mouseTrackerProc.stdout) mouseTrackerProc.stdout.removeAllListeners();
    try { mouseTrackerProc.kill(); } catch {}
    mouseTrackerProc = null;
  }
  lastMouseButtons = 0;
}

ipcMain.on('start-screenrec-mouse-tracking', () => {
  stopRecorderMouseTracking();
  emitRecorderMouseUpdate();
  // Sampled at ~120Hz (was 33ms/30Hz). Smart Focus derives velocity and
  // look-ahead from consecutive samples, so coarse polling here directly
  // shows up as choppy/segmented camera panning no matter how good the
  // easing math is downstream. This runs on the main process (cheap IPC
  // send), not the renderer doing the recording work, so it doesn't
  // compete with capture/encode for CPU.
  mouseTrackerInterval = setInterval(() => emitRecorderMouseUpdate(), 8);

  if (!fs.existsSync(MOUSE_TRACKER_EXE)) return;
  try {
    mouseTrackerProc = spawn(MOUSE_TRACKER_EXE, [], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    mouseTrackerProc.stdout.setEncoding('utf8');
    let buffer = '';
    mouseTrackerProc.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const parts = line.trim().split('|');
        if (parts.length < 2) continue;
        const buttons = parseInt(parts[0], 10) || 0;
        const eventType = parts[1] || 'move';
        lastMouseButtons = buttons;
        emitRecorderMouseUpdate({
          eventType,
          button: parts[2] || null,
        });
      }
    });
    mouseTrackerProc.on('exit', () => {
      mouseTrackerProc = null;
    });
  } catch {}
});

ipcMain.on('stop-screenrec-mouse-tracking', () => {
  stopRecorderMouseTracking();
});

ipcMain.on('start-screenrec-hotkeys', () => {
  try {
    globalShortcut.unregister('Alt+P');
    globalShortcut.unregister('Alt+Z');
  } catch {}
  try {
    globalShortcut.register('Alt+P', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        sendToWindow(mainWindow, 'screenrec-hotkey', 'P');
      }
    });
    globalShortcut.register('Alt+Z', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        sendToWindow(mainWindow, 'screenrec-hotkey', 'Z');
      }
    });
  } catch (err) {
    console.error('Failed to register screenrec hotkeys Alt+P/Alt+Z:', err);
  }
});

ipcMain.on('stop-screenrec-hotkeys', () => {
  try {
    globalShortcut.unregister('Alt+P');
    globalShortcut.unregister('Alt+Z');
  } catch {}
});

// Device / animation preferences live in the Settings window but are consumed
// by the island, which is a separate renderer. Relay changes so the island
// updates live instead of only picking them up on next launch.
ipcMain.on('device-prefs-changed', (event, prefs) => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents !== event.sender && !win.isDestroyed()) {
      sendToWindow(win, 'device-prefs-update', prefs);
    }
  }
});

// ── System-Wide Windows 11 Do Not Disturb (Focus Assist) Manager ─────────────
let isSystemDnd = false;

function querySystemDndState(callback) {
  exec(
    'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v "NOC_GLOBAL_SETTING_TOASTS_ENABLED"',
    (err, stdout) => {
      let isDnd = false;
      if (!err && stdout) {
        // 0x0 = Notifications disabled (DND ON), 0x1 = Notifications enabled (DND OFF)
        if (stdout.includes('0x0')) {
          isDnd = true;
        }
      }
      if (isSystemDnd !== isDnd) {
        isSystemDnd = isDnd;
        broadcastDndState(isDnd);
      }
      callback?.(isDnd);
    }
  );
}

function broadcastDndState(isDnd) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win && !win.isDestroyed()) {
      sendToWindow(win, 'dnd-state-update', { isDnd });
    }
  }
}

function toggleSystemDnd() {
  const nextVal = isSystemDnd ? 1 : 0;
  exec(
    `reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v "NOC_GLOBAL_SETTING_TOASTS_ENABLED" /t REG_DWORD /d ${nextVal} /f`,
    (err) => {
      if (!err) {
        isSystemDnd = !isSystemDnd;
        broadcastDndState(isSystemDnd);
      }
    }
  );
}

// Initial DND query on startup & poll every 3s to stay in sync with Windows OS changes
querySystemDndState();
dndPollInterval = setInterval(() => {
  querySystemDndState();
}, 3000);

ipcMain.on('toggle-dnd', () => {
  toggleSystemDnd();
});

ipcMain.handle('get-dnd-state', () => {
  return isSystemDnd;
});

ipcMain.on('appearance-prefs-changed', (event, prefs) => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents !== event.sender && !win.isDestroyed()) {
      sendToWindow(win, 'appearance-prefs-update', prefs);
    }
  }
});

ipcMain.handle('get-system-telemetry', () => {
  const sessionName = process.env.SESSIONNAME || '';
  const isRemoteDesktop = sessionName.toUpperCase().includes('RDP') || sessionName.toUpperCase().includes('ICA');
  return {
    isBatterySaver: false,
    isRemoteDesktop,
    isLowGpu: false,
    isTransparencyDisabled: false,
  };
});

ipcMain.on('open-settings-window', () => {
  createSettingsWindow();
});

ipcMain.on('close-settings-window', () => {
  if (settingsWindow) {
    settingsWindow.close();
    settingsWindow = null;
  }
});

ipcMain.on('launch-app', (event, cmd) => {
  switch (cmd) {
    case 'browser':
      shell.openExternal('https://www.google.com');
      break;
    case 'spotify':
      shell.openExternal('spotify:');
      break;
    case 'explorer':
      execFile('explorer.exe', [], (err) => {
        if (err) console.error('Failed to launch explorer.exe:', err);
      });
      break;
    case 'terminal':
      execFile('cmd.exe', ['/c', 'start', 'cmd.exe'], (err) => {
        if (err) console.error('Failed to launch terminal:', err);
      });
      break;
    case 'settings':
      createSettingsWindow();
      break;
    case 'exit':
      // User asked to shut WinLand down from the launcher, so they no longer
      // have to kill it from Task Manager. app.quit() runs the normal quit
      // path (will-quit cleanup below). This app keeps itself alive on
      // window-all-closed to stay resident as an overlay, so as a guarantee we
      // force-exit shortly after in case that keeps the quit from completing.
      isQuitting = true;
      app.quit();
      setTimeout(() => app.exit(0), 600);
      break;
    default:
      // Unrecognized command — do not shell-exec arbitrary renderer input.
      console.warn('Ignored unrecognized launch-app command:', cmd);
  }
});

// ── App Lifecycle & Safety ──────────────────────────────────────────────────
const mainCrashLog = path.join(os.tmpdir(), 'winland_main_crash.log');

process.on('uncaughtException', (err) => {
  console.error('WinLand Uncaught Exception:', err);
  try {
    fs.appendFileSync(mainCrashLog, `[${new Date().toISOString()}] Uncaught Exception: ${err?.stack || err}\n`);
  } catch {}
});

process.on('unhandledRejection', (reason) => {
  console.error('WinLand Unhandled Rejection:', reason);
  try {
    fs.appendFileSync(mainCrashLog, `[${new Date().toISOString()}] Unhandled Rejection: ${reason?.stack || reason}\n`);
  } catch {}
});

app.whenReady().then(() => {
  createWindow();
  // screen module APIs are only safe to use after app is ready. If the pinned
  // monitor gets unplugged (or a display is added back), make sure the island
  // doesn't end up stranded off-screen.
  screen.on('display-removed', () => repositionOnTargetDisplay());
  screen.on('display-added', () => repositionOnTargetDisplay());
});

app.on('window-all-closed', (e) => {
  // Stay resident as an overlay when the window is merely closed — but not when
  // the user explicitly chose Exit, or we'd block our own shutdown.
  if (!isQuitting) e.preventDefault();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (mouseTrackerProc) { try { mouseTrackerProc.kill(); } catch (e) {} mouseTrackerProc = null; }
  if (nativeScreenRecorder && nativeScreenRecorder.proc) { try { nativeScreenRecorder.proc.kill(); } catch (e) {} }
  if (mouseTrackerProc) { try { mouseTrackerProc.kill(); } catch (e) {} mouseTrackerProc = null; }
  if (nativeScreenRecorder && nativeScreenRecorder.proc) { try { nativeScreenRecorder.proc.kill(); } catch (e) {} }
  if (pollerInterval) clearInterval(pollerInterval);
  if (batteryInterval) clearInterval(batteryInterval);
  if (fullscreenInterval) clearInterval(fullscreenInterval);
  if (bluetoothInterval) clearInterval(bluetoothInterval);
  if (callInterval) clearInterval(callInterval);
  if (alwaysOnTopInterval) clearInterval(alwaysOnTopInterval);
  if (dndPollInterval) clearInterval(dndPollInterval);
  if (volumePollInterval) clearInterval(volumePollInterval);
  stopRecorderMouseTracking();
  fs.unwatchFile(WINLAND_THEME_PATH);
});


