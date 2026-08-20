import { TimerInstance } from './timer.types';
import { soundEngine } from '../../utils/soundEngine';

type Listener = (timers: TimerInstance[]) => void;

class TimerStore {
  private timers: TimerInstance[] = [
    {
      id: '1',
      label: 'Timer',
      durationMs: 300000,
      remainingMs: 300000,
      status: 'paused',
      createdAt: Date.now(),
    },
  ];
  private listeners: Set<Listener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startEngine();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.timers);
    return () => this.listeners.delete(listener);
  }

  public getTimers(): TimerInstance[] {
    return [...this.timers];
  }

  public setTimers(timers: TimerInstance[]) {
    this.timers = timers;
    this.notify();
  }

  public addTimer(durationMs: number = 300000, label?: string): TimerInstance {
    soundEngine.playClick();
    const newTimer: TimerInstance = {
      id: String(Date.now() + Math.random()),
      label: label || `Timer ${this.timers.length + 1}`,
      durationMs,
      remainingMs: durationMs,
      status: 'paused',
      createdAt: Date.now(),
    };
    this.timers = [...this.timers, newTimer];
    this.notify();
    return newTimer;
  }

  public toggleTimer(id: string) {
    soundEngine.playClick();
    this.timers = this.timers.map((t) => {
      if (t.id === id) {
        const nextStatus = t.status === 'running' ? 'paused' : 'running';
        const nextRemaining = (nextStatus === 'running' && t.remainingMs <= 0) ? t.durationMs : t.remainingMs;
        return { ...t, remainingMs: nextRemaining, status: nextStatus };
      }
      return t;
    });
    this.notify();
  }

  public resetTimer(id: string) {
    soundEngine.playClick();
    this.timers = this.timers.map((t) => {
      if (t.id === id) {
        return { ...t, remainingMs: t.durationMs, status: 'paused' };
      }
      return t;
    });
    this.notify();
  }

  public removeTimer(id: string) {
    soundEngine.playClick();
    this.timers = this.timers.filter((t) => t.id !== id);
    this.notify();
  }

  public updateLabel(id: string, label: string) {
    this.timers = this.timers.map((t) => (t.id === id ? { ...t, label } : t));
    this.notify();
  }

  public syncNativeTimer(label: string, secondsLeft: number, totalSeconds: number, isRunning: boolean) {
    const durationMs = (totalSeconds || secondsLeft) * 1000;
    const remainingMs = secondsLeft * 1000;
    const status = isRunning ? 'running' : 'paused';

    const nativeTimerIndex = this.timers.findIndex((t) => t.id === 'native');
    if (nativeTimerIndex >= 0) {
      this.timers = this.timers.map((t, i) => (
        i === nativeTimerIndex
          ? { ...t, label: label || t.label, durationMs, remainingMs, status }
          : t
      ));
    } else {
      this.timers = [
        {
          id: 'native',
          label: label || 'Timer',
          durationMs,
          remainingMs,
          status,
          createdAt: Date.now(),
        },
        ...this.timers.filter((t) => t.id !== '1' || t.remainingMs < t.durationMs),
      ];
    }
    this.notify();
  }

  public clearNativeTimer() {
    if (this.timers.some((t) => t.id === 'native')) {
      this.timers = this.timers.filter((t) => t.id !== 'native');
      this.notify();
    }
  }

  private lastTickTime: number = Date.now();

  private startEngine() {
    if (this.intervalId) return;
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0, now - this.lastTickTime);
      this.lastTickTime = now;

      let changed = false;
      this.timers = this.timers.map((t) => {
        if (t.status === 'running' && t.remainingMs > 0) {
          changed = true;
          const nextMs = Math.max(0, t.remainingMs - dt);
          if (nextMs === 0) {
            soundEngine.playAlarm();
            return { ...t, remainingMs: 0, status: 'completed' };
          }
          return { ...t, remainingMs: nextMs };
        }
        return t;
      });
      if (changed) {
        this.notify();
      }
    }, 1000);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.timers));
  }
}

export const timerStore = new TimerStore();
