const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Spotify now-playing updates
  onSystemMediaUpdate: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('system-media-update', handler);
    return () => ipcRenderer.removeListener('system-media-update', handler);
  },

  // Fullscreen app state updates (macOS Tahoe auto-hide)
  onFullscreenState: (callback) => {
    const handler = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('fullscreen-state', handler);
    return () => ipcRenderer.removeListener('fullscreen-state', handler);
  },

  // Media transport controls
  sendMediaControl: (action) => {
    ipcRenderer.send('media-control', action);
  },

  // Dynamic window resizing & mouse passthrough
  resizeWindow: (width, height) => {
    ipcRenderer.send('resize-window', { width, height });
  },
  setIgnoreMouseEvents: (ignore) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore);
  },

  // Real-time battery status
  onBatteryUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('battery-update', handler);
    return () => ipcRenderer.removeListener('battery-update', handler);
  },

  // System volume OSD & control
  onVolumeUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('volume-update', handler);
    return () => ipcRenderer.removeListener('volume-update', handler);
  },
  setSystemVolume: (vol) => ipcRenderer.send('set-system-volume', vol),
  getSystemVolume: () => ipcRenderer.invoke('get-system-volume'),

  // Bluetooth connect/disconnect updates & test triggers
  getBluetoothState: () => ipcRenderer.invoke('get-bluetooth-state'),
  requestBluetoothStatus: () => ipcRenderer.send('request-bluetooth-status'),
  triggerPhoneNotification: () => ipcRenderer.send('trigger-phone-notification'),
  onBluetoothUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('bluetooth-update', handler);
    return () => ipcRenderer.removeListener('bluetooth-update', handler);
  },

  // Windows/Phone Link call state updates
  onCallUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('call-update', handler);
    return () => ipcRenderer.removeListener('call-update', handler);
  },
  requestCallStatus: () => ipcRenderer.send('request-call-status'),
  sendCallAction: (action) => ipcRenderer.send('send-call-action', action),
  triggerDemoCall: () => ipcRenderer.send('trigger-demo-call'),

  // Settings persistence
  readSettings: () => ipcRenderer.invoke('read-settings'),
  writeSettings: (data) => ipcRenderer.send('write-settings', data),

  // Chosen devices / animation styles, relayed from Settings to the island
  sendDevicePrefs: (prefs) => ipcRenderer.send('device-prefs-changed', prefs),
  onDevicePrefsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('device-prefs-update', handler);
    return () => ipcRenderer.removeListener('device-prefs-update', handler);
  },

  // WinDock config sync (theme, weather, island preferences)
  getInitialConfig: () => ipcRenderer.invoke('get-initial-config'),
  onConfigUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('config-update', handler);
    return () => ipcRenderer.removeListener('config-update', handler);
  },
  onThemeUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('theme-update', handler);
    return () => ipcRenderer.removeListener('theme-update', handler);
  },

  // App launching & file opening
  launchApp: (cmd) => ipcRenderer.send('launch-app', cmd),
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),

  // Appearance & Telemetry IPC
  getSystemTelemetry: () => ipcRenderer.invoke('get-system-telemetry'),
  sendAppearancePrefs: (prefs) => ipcRenderer.send('appearance-prefs-changed', prefs),
  onAppearancePrefsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('appearance-prefs-update', handler);
    return () => ipcRenderer.removeListener('appearance-prefs-update', handler);
  },

  // Multi-Monitor Pinning & Focus Mode / DND Sync
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setTargetDisplay: (displayId) => ipcRenderer.send('set-target-display', displayId),
  getDndState: () => ipcRenderer.invoke('get-dnd-state'),
  onDndStateUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('dnd-state-update', handler);
    return () => ipcRenderer.removeListener('dnd-state-update', handler);
  },
  toggleDnd: () => ipcRenderer.send('toggle-dnd'),

  onEscapePressed: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('escape-pressed', handler);
    return () => ipcRenderer.removeListener('escape-pressed', handler);
  },

  requestTimerStatus: () => ipcRenderer.send('request-timer-status'),
  onTimerUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('timer-update', handler);
    return () => ipcRenderer.removeListener('timer-update', handler);
  },
});
