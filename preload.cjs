const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPathForFile: (file) => (webUtils ? webUtils.getPathForFile(file) : (file?.path || '')),
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),

  // USB Connect / Eject Hub
  onUsbConnected: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('usb-connected', handler);
    return () => ipcRenderer.removeListener('usb-connected', handler);
  },
  onUsbEjected: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('usb-ejected', handler);
    return () => ipcRenderer.removeListener('usb-ejected', handler);
  },
  ejectUsb: (deviceId) => ipcRenderer.send('eject-usb', deviceId),

  // Discord Voice Call Integration
  onDiscordVoiceUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('discord-voice-update', handler);
    return () => ipcRenderer.removeListener('discord-voice-update', handler);
  },

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

  // Dynamic window resizing & mouse passthrough. `growing` tells main whether
  // this transition is getting bigger — grow the real OS window immediately so
  // the CSS elastic overshoot has room to render, but let main delay a shrink
  // until the CSS transition finishes so the window doesn't clip the bounce.
  resizeWindow: (width, height, growing) => {
    ipcRenderer.send('resize-window', { width, height, growing });
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
  getLiveWeather: () => ipcRenderer.invoke('get-live-weather'),
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

  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  toggleScreenRec: () => ipcRenderer.send('toggle-screenrec'),
  getPrimaryScreenSource: () => ipcRenderer.invoke('get-primary-screen-source'),
  saveScreenRecording: (recording) => ipcRenderer.invoke('save-screen-recording', recording),
  startNativeScreenRecording: (options) => ipcRenderer.invoke('start-native-screen-recording', options),
  stopNativeScreenRecording: () => ipcRenderer.invoke('stop-native-screen-recording'),
  muxNativeRecordingAudio: (data) => ipcRenderer.invoke('mux-native-recording-audio', data),
  startScreenRecMouseTracking: () => ipcRenderer.send('start-screenrec-mouse-tracking'),
  stopScreenRecMouseTracking: () => ipcRenderer.send('stop-screenrec-mouse-tracking'),
  startScreenRecHotkeys: () => ipcRenderer.send('start-screenrec-hotkeys'),
  stopScreenRecHotkeys: () => ipcRenderer.send('stop-screenrec-hotkeys'),
  onScreenRecHotkey: (callback) => {
    const handler = (_event, key) => callback(key);
    ipcRenderer.on('screenrec-hotkey', handler);
    return () => ipcRenderer.removeListener('screenrec-hotkey', handler);
  },
  onScreenRecMouseUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('screenrec-mouse-update', handler);
    return () => ipcRenderer.removeListener('screenrec-mouse-update', handler);
  },
  onScreenshotCaptured: (callback) => {
    const handler = (_event, dataUrl) => callback(dataUrl);
    ipcRenderer.on('screenshot-captured', handler);
    return () => ipcRenderer.removeListener('screenshot-captured', handler);
  },
  onScreenRecUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('screenrec-update', handler);
    return () => ipcRenderer.removeListener('screenrec-update', handler);
  },
  openFileLocation: (filePath) => ipcRenderer.send('open-file-location', filePath),

  // Recording State Manager & Companion Controls Pill IPC
  startRecording: (options) => ipcRenderer.invoke('recording:start', options),
  pauseRecording: () => ipcRenderer.invoke('recording:pause'),
  resumeRecording: () => ipcRenderer.invoke('recording:resume'),
  stopRecording: () => ipcRenderer.invoke('recording:stop'),
  discardRecording: () => ipcRenderer.invoke('recording:discard'),
  toggleRecordingMic: () => ipcRenderer.invoke('recording:toggle-mic'),
  toggleRecordingWebcam: () => ipcRenderer.invoke('recording:toggle-webcam'),
  toggleRecordingSmartFocus: () => ipcRenderer.invoke('recording:toggle-smart-focus'),
  getRecordingState: () => ipcRenderer.invoke('recording:get-state'),
  subscribeRecordingState: () => ipcRenderer.send('recording:subscribe'),
  reportRecordingStatus: (payload) => ipcRenderer.send('recording:status-update', payload),
  onRecordingStateChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('recording:state-changed', handler);
    return () => ipcRenderer.removeListener('recording:state-changed', handler);
  },
  onRecordingTick: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('recording:tick', handler);
    return () => ipcRenderer.removeListener('recording:tick', handler);
  },
  onRecordingCommand: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('recording:command', handler);
    return () => ipcRenderer.removeListener('recording:command', handler);
  },
  resizeControlsPillWindow: (width, height) => ipcRenderer.send('resize-controls-pill-window', { width, height }),

  // macOS Privacy Indicators (Camera & Microphone Status)
  getPrivacySensors: () => ipcRenderer.invoke('get-privacy-sensors'),
  onPrivacySensorsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('privacy-sensors-update', handler);
    return () => ipcRenderer.removeListener('privacy-sensors-update', handler);
  },
  simulatePrivacySensors: (state) => ipcRenderer.send('simulate-privacy-sensors', state),
});
