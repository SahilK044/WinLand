export interface TimerInstance {
  id: string;
  label: string;            // editable, default "Timer"
  durationMs: number;       // original set duration in milliseconds
  remainingMs: number;      // live countdown value in milliseconds
  status: 'running' | 'paused' | 'completed';
  createdAt: number;
}
