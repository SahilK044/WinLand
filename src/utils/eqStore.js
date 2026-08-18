// Lightweight equalizer store. Bar heights are consumed by the visualizer
// (EqBars) and the beat-pulse liquid aura, but NOT by the DynamicIsland root.
// Updating the root's state at 15fps forced the entire island tree to
// re-render on every tick while music played. Components subscribe here
// directly so only the tiny visualizer re-renders.
import { useSyncExternalStore } from 'react';

const EQ_FREQS   = [1.0000, 1.6180, 2.4142, 3.3166, 4.2361];
const EQ_PHASES  = [0.00,   1.10,   2.30,   0.70,   3.50 ];
const EQ_AMPS    = [42,     55,     38,     60,     46   ];
const EQ_OFFSETS = [30,     28,     32,     25,     34   ];

const FLAT_BARS = [3, 3, 3, 3, 3];

function computeBarHeightsWithGain(t, gain) {
  return EQ_FREQS.map((f, i) => {
    const animatedVal = EQ_OFFSETS[i]
      + EQ_AMPS[i] * (
          0.55 * Math.sin(t * f              + EQ_PHASES[i]         ) +
          0.30 * Math.cos(t * f * 1.7321     + EQ_PHASES[i] * 0.618 ) +
          0.15 * Math.sin(t * f * 2.2360     + EQ_PHASES[i] * 1.414 )
        );
    const val = 3 + (animatedVal - 3) * gain;
    return Math.max(3, Math.min(100, Math.round(val)));
  });
}

let snapshot = FLAT_BARS;
let gain = 0;
let settled = true;
let t = 0;
let rafId = null;
let frameCount = 0;
let playing = false;
const listeners = new Set();

function publish(next) {
  snapshot = next;
  listeners.forEach((listener) => { try { listener(); } catch {} });
}

function loop() {
  rafId = null;
  const targetGain = playing ? 1 : 0;
  gain += (targetGain - gain) * 0.12;

  if (gain < 0.01 && !playing) {
    if (!settled) {
      settled = true;
      publish(FLAT_BARS);
    }
    return; // fully decayed — stop instead of rescheduling forever
  }

  settled = false;
  t += 0.04;
  frameCount++;
  if (frameCount % 4 === 0) {
    publish(computeBarHeightsWithGain(t, gain));
  }
  if (listeners.size > 0) {
    rafId = requestAnimationFrame(loop);
  }
}

function kick() {
  if (rafId === null && (playing || gain >= 0.01) && listeners.size > 0) {
    rafId = requestAnimationFrame(loop);
  }
}

export function subscribeEq(listener) {
  listeners.add(listener);
  kick();
  return () => listeners.delete(listener);
}

export function getEqSnapshot() {
  return snapshot;
}

/** React hook: re-renders only the subscribing component on bar updates. */
export function useEqBars() {
  return useSyncExternalStore(subscribeEq, getEqSnapshot, getEqSnapshot);
}

/**
 * Drive the visualizer. Called from the island whenever the play state
 * changes; the loop runs itself only while music is playing or while the
 * gain is still decaying back to flat.
 */
export function driveEq(isPlaying) {
  playing = !!isPlaying;
  if (playing) settled = false;
  kick();
}
