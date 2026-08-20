const { contextBridge, ipcRenderer, webUtils } = require('electron');

const on = (channel) => (callback) => {
  if (typeof callback !== 'function') return () => {};
  const handler = (_event, data) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('electronAPI', {
  getPathForFile: (file) => {
    if (!file) return '';
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file) || file.path || '';
      }
    } catch {}
    return file?.path || '';
  },
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),

  // USB Connect / Eject Hub
  onUsbConnected: on('usb-connected'),
  onUsbEjected: on('usb-ejected'),
  ejectUsb: (deviceId) => ipcRenderer.send('eject-usb', deviceId),

  // Discord Voice Call Integration
  onDiscordVoiceUpdate: on('discord-voice-update'),

  // Spotify now-playing updates
  onSystemMediaUpdate: on('system-media-update'),

  // Fullscreen app state updates (macOS Tahoe auto-hide)
  onFullscreenState: on('fullscreen-state'),

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
  onBatteryUpdate: on('battery-update'),

  // System volume OSD & control
  onVolumeUpdate: on('volume-update'),
  setSystemVolume: (vol) => ipcRenderer.send('set-system-volume', vol),
  getSystemVolume: () => ipcRenderer.invoke('get-system-volume'),

  // Bluetooth connect/disconnect updates & test triggers
  getBluetoothState: () => ipcRenderer.invoke('get-bluetooth-state'),
  requestBluetoothStatus: () => ipcRenderer.send('request-bluetooth-status'),
  triggerPhoneNotification: () => ipcRenderer.send('trigger-phone-notification'),
  onBluetoothUpdate: on('bluetooth-update'),

  // Windows/Phone Link call state updates
  onCallUpdate: on('call-update'),
  requestCallStatus: () => ipcRenderer.send('request-call-status'),
  sendCallAction: (action) => ipcRenderer.send('send-call-action', action),
  triggerDemoCall: () => ipcRenderer.send('trigger-demo-call'),

  // Settings persistence
  readSettings: () => ipcRenderer.invoke('read-settings'),
  writeSettings: (data) => ipcRenderer.send('write-settings', data),

  // Chosen devices / animation styles, relayed from Settings to the island
  sendDevicePrefs: (prefs) => ipcRenderer.send('device-prefs-changed', prefs),
  onDevicePrefsUpdate: on('device-prefs-update'),

  // WinDock config sync (theme, weather, island preferences)
  getInitialConfig: () => ipcRenderer.invoke('get-initial-config'),
  getLiveWeather: () => ipcRenderer.invoke('get-live-weather'),
  onConfigUpdate: on('config-update'),
  onThemeUpdate: on('theme-update'),

  // App launching & file opening
  launchApp: (cmd) => ipcRenderer.send('launch-app', cmd),
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),

  // Appearance & Telemetry IPC
  getSystemTelemetry: () => ipcRenderer.invoke('get-system-telemetry'),
  sendAppearancePrefs: (prefs) => ipcRenderer.send('appearance-prefs-changed', prefs),
  setThemeMode: (mode) => ipcRenderer.send('appearance-prefs-changed', { mode }),
  onAppearancePrefsUpdate: on('appearance-prefs-update'),

  // Multi-Monitor Pinning & Focus Mode / DND Sync
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setTargetDisplay: (displayId) => ipcRenderer.send('set-target-display', displayId),
  getDndState: () => ipcRenderer.invoke('get-dnd-state'),
  onDndStateUpdate: on('dnd-state-update'),
  toggleDnd: () => ipcRenderer.send('toggle-dnd'),

  onEscapePressed: on('escape-pressed'),

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
  onScreenRecHotkey: on('screenrec-hotkey'),
  onScreenRecMouseUpdate: on('screenrec-mouse-update'),
  onScreenshotCaptured: on('screenshot-captured'),
  onScreenRecUpdate: on('screenrec-update'),
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
  onRecordingStateChanged: on('recording:state-changed'),
  onRecordingTick: on('recording:tick'),
  onRecordingCommand: on('recording:command'),
  resizeControlsPillWindow: (width, height) => ipcRenderer.send('resize-controls-pill-window', { width, height }),

  // macOS Privacy Indicators (Camera & Microphone Status)
  getPrivacySensors: () => ipcRenderer.invoke('get-privacy-sensors'),
  onPrivacySensorsUpdate: on('privacy-sensors-update'),
  simulatePrivacySensors: (state) => ipcRenderer.send('simulate-privacy-sensors', state),
});
