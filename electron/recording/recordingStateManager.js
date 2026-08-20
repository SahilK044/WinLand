import { EventEmitter } from 'events';
import { ipcMain } from 'electron';
import {
  destroyRecordingControlsPillWindow,
} from '../windows/recordingControlsPillWindow.js';

class RecordingStateManager extends EventEmitter {
  constructor() {
    super();
    this.state = {
      status: 'idle', // 'idle' | 'starting' | 'recording' | 'paused' | 'stopping' | 'error'
      elapsedMs: 0,
      micEnabled: true,
      webcamEnabled: false,
      smartFocusEnabled: false,
      options: {
        resolutionId: '1080p',
        fps: 60,
        mode: 'normal',
      },
      outputTargetPath: null,
      detachedOffset: null,
    };

    this.tickInterval = null;
    this.startTime = null;
    this.pausedElapsedMs = 0;
    this.pauseStartTime = null;
    this.subscribedWebContents = new Set();
    this.mainWindow = null;

    this.initIpc();
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  getState() {
    return { ...this.state };
  }

  formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  broadcast(channel, data) {
    this.emit(channel, data);
    for (const wc of this.subscribedWebContents) {
      if (!wc.isDestroyed()) {
        try {
          wc.send(channel, data);
        } catch {}
      } else {
        this.subscribedWebContents.delete(wc);
      }
    }
  }

  broadcastState() {
    this.broadcast('recording:state-changed', this.getState());
  }

  startTick() {
    this.stopTick();
    this.startTime = Date.now();
    this.pauseStartTime = null;
    this.pausedElapsedMs = 0;
    this.state.elapsedMs = 0;
    let lastSeconds = -1;

    this.tickInterval = setInterval(() => {
      if (this.state.status === 'recording') {
        const now = Date.now();
        const currentElapsed = now - this.startTime - this.pausedElapsedMs;
        this.state.elapsedMs = Math.max(0, currentElapsed);
        const totalSeconds = Math.floor(this.state.elapsedMs / 1000);
        if (totalSeconds !== lastSeconds) {
          lastSeconds = totalSeconds;
          this.broadcast('recording:tick', {
            elapsedMs: this.state.elapsedMs,
            seconds: totalSeconds,
            formatted: this.formatTime(totalSeconds),
          });
        }
      }
    }, 100);
  }

  pauseTick() {
    if (this.pauseStartTime === null) {
      this.pauseStartTime = Date.now();
    }
  }

  resumeTick() {
    if (this.pauseStartTime !== null) {
      this.pausedElapsedMs += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }
  }

  stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.pauseStartTime = null;
  }

  // Action methods
  startRecording(options = {}) {
    if (this.state.status !== 'idle' && this.state.status !== 'error') {
      return { ok: false, error: 'Recording is already running or busy.' };
    }

    this.state.status = 'starting';
    this.state.options = { ...this.state.options, ...options };
    if (options.mode === 'smart') {
      this.state.smartFocusEnabled = true;
    } else if (options.mode === 'normal') {
      this.state.smartFocusEnabled = false;
    }
    this.broadcastState();

    // Send command to main window renderer's background RecordingEngineHost
    this.sendCommand({
      action: 'start',
      options: this.state.options,
      smartFocusEnabled: this.state.smartFocusEnabled,
      micEnabled: this.state.micEnabled,
      webcamEnabled: this.state.webcamEnabled,
    });

    return { ok: true };
  }

  onRecordingStarted() {
    this.state.status = 'recording';
    this.startTick();
    this.broadcastState();
  }

  pauseRecording() {
    if (this.state.status !== 'recording') return { ok: false };
    this.state.status = 'paused';
    this.pauseTick();
    this.broadcastState();

    this.sendCommand({ action: 'pause' });
    return { ok: true };
  }

  resumeRecording() {
    if (this.state.status !== 'paused') return { ok: false };
    this.state.status = 'recording';
    this.resumeTick();
    this.broadcastState();

    this.sendCommand({ action: 'resume' });
    return { ok: true };
  }

  stopRecording() {
    if (this.state.status !== 'recording' && this.state.status !== 'paused') {
      return { ok: false };
    }
    this.state.status = 'stopping';
    this.stopTick();
    this.broadcastState();

    this.sendCommand({ action: 'stop' });
    return { ok: true };
  }

  discardRecording() {
    if (this.state.status !== 'recording' && this.state.status !== 'paused') {
      return { ok: false };
    }
    this.state.status = 'idle';
    this.state.elapsedMs = 0;
    this.stopTick();
    this.broadcastState();
    destroyRecordingControlsPillWindow();

    this.sendCommand({ action: 'discard' });
    return { ok: true };
  }

  toggleMic() {
    this.state.micEnabled = !this.state.micEnabled;
    this.broadcastState();

    this.sendCommand({
      action: 'toggle-mic',
      micEnabled: this.state.micEnabled,
    });
    return { ok: true, micEnabled: this.state.micEnabled };
  }

  toggleWebcam() {
    this.state.webcamEnabled = !this.state.webcamEnabled;
    this.broadcastState();

    this.sendCommand({
      action: 'toggle-webcam',
      webcamEnabled: this.state.webcamEnabled,
    });
    return { ok: true, webcamEnabled: this.state.webcamEnabled };
  }

  toggleSmartFocus() {
    this.state.smartFocusEnabled = !this.state.smartFocusEnabled;
    this.broadcastState();

    this.sendCommand({
      action: 'toggle-smart-focus',
      smartFocusEnabled: this.state.smartFocusEnabled,
    });
    return { ok: true, smartFocusEnabled: this.state.smartFocusEnabled };
  }

  onRecordingCompleted(_result = {}) {
    this.state.status = 'idle';
    this.state.elapsedMs = 0;
    this.stopTick();
    this.broadcastState();
    destroyRecordingControlsPillWindow();
  }

  onRecordingError(_errorMsg) {
    this.state.status = 'error';
    this.stopTick();
    this.broadcastState();
    if (this._errorResetTimeout) clearTimeout(this._errorResetTimeout);
    this._errorResetTimeout = setTimeout(() => {
      this._errorResetTimeout = null;
      if (this.state.status === 'error') {
        this.state.status = 'idle';
        this.broadcastState();
        destroyRecordingControlsPillWindow();
      }
    }, 3000);
  }

  initIpc() {
    const registerSender = (sender) => {
      if (!sender || sender.isDestroyed()) return;
      if (this.subscribedWebContents.has(sender)) return;
      this.subscribedWebContents.add(sender);
      sender.once('destroyed', () => {
        this.subscribedWebContents.delete(sender);
      });
    };

    ipcMain.handle('recording:get-state', (event) => {
      registerSender(event.sender);
      return this.getState();
    });

    ipcMain.handle('recording:start', (_event, options) => {
      return this.startRecording(options);
    });

    ipcMain.handle('recording:pause', () => {
      return this.pauseRecording();
    });

    ipcMain.handle('recording:resume', () => {
      return this.resumeRecording();
    });

    ipcMain.handle('recording:stop', () => {
      return this.stopRecording();
    });

    ipcMain.handle('recording:discard', () => {
      return this.discardRecording();
    });

    ipcMain.handle('recording:toggle-mic', () => {
      return this.toggleMic();
    });

    ipcMain.handle('recording:toggle-webcam', () => {
      return this.toggleWebcam();
    });

    ipcMain.handle('recording:toggle-smart-focus', () => {
      return this.toggleSmartFocus();
    });

    // Renderer reporting back pipeline events
    ipcMain.on('recording:status-update', (_event, payload = {}) => {
      const cur = this.state.status;
      if (payload.status === 'recording' && (cur === 'starting' || cur === 'paused')) {
        this.onRecordingStarted();
      } else if ((payload.status === 'completed' || payload.status === 'idle') && cur !== 'idle') {
        this.onRecordingCompleted(payload);
      } else if (payload.status === 'error') {
        this.onRecordingError(payload.error || 'Recording error');
      } else if (payload.status === 'paused' && cur === 'recording') {
        this.state.status = 'paused';
        this.pauseTick();
        this.broadcastState();
      }
    });

    ipcMain.on('recording:subscribe', (event) => {
      registerSender(event.sender);
      event.sender.send('recording:state-changed', this.getState());
    });
  }
}

export const recordingStateManager = new RecordingStateManager();
export default recordingStateManager;
