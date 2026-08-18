import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  GLB_MODEL_MAP, loadSharedModel, prepareDeviceModel, addStudioLights,
} from '../../three/deviceModelEngine';
import Phone3D from './Phone3D';
import Speaker3D from './Speaker3D';

/**
 * Renders the user's chosen real 3D device inside the Dynamic Island's
 * connect / disconnect notification.
 *
 * The motion is driven by the animation style picked in Settings, so those
 * options actually change what is shown rather than only being stored. Each
 * style defines an entry path (or exit, when disconnecting) plus an idle
 * behaviour; `MOTION` below is the whole vocabulary in one place.
 */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/**
 * Each style gets (state, t, elapsed) and mutates `state` â€” a plain pose the
 * caller applies to the model. `t` is 0..1 entry progress, `elapsed` is seconds
 * since mount, so styles can settle into a continuous idle once t hits 1.
 */
const MOTION = {
  // â”€â”€ Phones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  amoled: (s, t, e, loop) => {
    if (loop) {
      const cyc = e % 3.0;
      const k = easeOutCubic(clamp01(cyc / 0.8));
      s.y = -1.15 + 1.15 * k + Math.sin(e * 2.2) * 0.08;
      s.scale = 0.55 + 0.45 * k;
      s.rotY = Math.sin(e * 1.5) * 0.45;
      s.rotX = Math.sin(e * 1.8) * 0.22;
    } else {
      const k = easeOutCubic(t);
      s.y = -1.15 + 1.15 * k;
      s.scale = 0.55 + 0.45 * k;
      s.rotY = Math.sin(e * 1.15) * 0.42 * t;
      s.rotX = 0.22 * (1 - k) + Math.sin(e * 0.85) * 0.09 * t;
    }
  },

  magsafe: (s, t, e, loop) => {
    if (loop) {
      const cyc = e % 2.5;
      const snap = easeOutBack(clamp01(cyc / 0.7));
      s.z = -2.2 + 2.0 * snap + Math.sin(e * 3.0) * 0.1;
      s.scale = 0.38 + 0.56 * snap;
      s.rotZ = (1 - snap) * -0.45 + Math.sin(e * 28) * 0.02;
      s.rotY = (1 - snap) * 0.6 + Math.sin(e * 1.5) * 0.15;
    } else {
      const snap = easeOutBack(clamp01(t * 1.15));
      s.z = -2.0 + 1.8 * snap;
      s.scale = 0.38 + 0.56 * snap;
      s.rotZ = (1 - snap) * -0.45 + (t >= 1 ? Math.sin(e * 30) * 0.014 : 0);
      s.rotY = (1 - snap) * 0.6;
    }
  },

  showcase: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    s.scale = 0.5 + 0.5 * k;
    s.rotY = e * 2.2;
    s.y = Math.sin(e * 1.5) * 0.12;
    s.rotX = Math.sin(e * 1.0) * 0.10;
  },

  depth: (s, t, e, loop) => {
    if (loop) {
      s.z = -1.2 + Math.sin(e * 1.8) * 1.2;
      s.scale = 0.65 + Math.sin(e * 1.8) * 0.25;
      s.y = Math.sin(e * 1.4) * 0.18;
      s.rotY = Math.sin(e * 1.2) * 0.55;
    } else {
      const k = easeOutCubic(t);
      s.z = -3.4 + 3.4 * k + Math.sin(e * 0.75) * 0.5 * t;
      s.scale = 0.32 + 0.68 * k;
      s.y = Math.sin(e * 0.95) * 0.10 * t;
      s.rotY = Math.sin(e * 0.6) * 0.5 * t;
    }
  },

  hinge: (s, t, e, loop) => {
    if (loop) {
      const open = 0.5 + 0.5 * Math.sin(e * 1.8);
      s.rotY = -Math.PI * (1 - open) * 0.5 + Math.sin(e * 1.2) * 0.35;
      s.scale = 0.75 + 0.25 * open;
      s.y = Math.sin(e * 1.5) * 0.12;
      s.rotX = Math.sin(e * 1.0) * 0.15;
    } else {
      const open = easeOutCubic(t);
      s.rotY = -Math.PI * (1 - open) + Math.sin(e * 1.05) * 0.38 * t;
      s.scale = 0.55 + 0.45 * open;
      s.y = Math.sin(e * 0.9) * 0.06 * t;
    }
  },

  // â”€â”€ Controllers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  levitate: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    s.y = (loop ? 0 : -0.95 + 0.95 * k) + Math.sin(e * 1.8) * 0.15;
    s.scale = 0.5 + 0.5 * k;
    s.rotY = Math.sin(e * 1.2) * 0.55;
    s.rotZ = Math.sin(e * 24) * 0.015;
  },

  'flip-trigger': (s, t, e, loop) => {
    if (loop) {
      s.scale = 0.85;
      s.rotX = e * 3.0;
      s.y = Math.sin(e * 1.8) * 0.12;
      s.rotY = Math.sin(e * 1.2) * 0.4;
    } else {
      const k = easeOutCubic(clamp01(t * 1.05));
      s.scale = 0.45 + 0.55 * easeOutCubic(t);
      s.rotX = Math.PI * 2 * k;
      s.y = Math.sin(e * 1.4) * 0.09 * t;
      s.rotY = Math.sin(e * 0.85) * 0.35 * t;
    }
  },

  // â”€â”€ Speakers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  wave: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    s.scale = 0.5 + 0.5 * k;
    s.x = Math.sin(e * 2.2) * 0.35;
    s.rotY = Math.sin(e * 2.2) * 0.45;
    s.y = (loop ? 0 : -0.7 + 0.7 * k) + Math.sin(e * 1.5) * 0.08;
  },

  panoramic: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    s.scale = 0.5 + 0.5 * k;
    s.rotY = e * 2.2;
    s.y = (loop ? 0 : -0.7 + 0.7 * k) + Math.sin(e * 1.2) * 0.06;
  },

  bass: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    const thump = Math.pow(Math.abs(Math.sin(e * 3.2)), 4);
    s.scale = (0.5 + 0.5 * k) * (1 + thump * 0.25);
    s.y = (loop ? 0 : -0.7 + 0.7 * k) - thump * 0.08;
    s.rotY = Math.sin(e * 0.8) * 0.35;
  },

  // â”€â”€ Headphones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  spin: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    s.y = (loop ? 0 : -0.95 + 0.95 * k) + Math.sin(e * 1.6) * 0.10;
    s.scale = 0.45 + 0.55 * k;
    s.rotY = e * 2.4;
  },

  expand: (s, t, e, loop) => {
    const k = loop ? 1 : easeOutCubic(t);
    const breathe = 1 + Math.sin(e * 2.2) * 0.16;
    s.scale = (0.45 + 0.55 * k) * breathe;
    s.rotY = Math.sin(e * 1.2) * 0.65;
    s.y = (loop ? 0 : -0.8 + 0.8 * k) + Math.sin(e * 1.5) * 0.08;
  },

  // â”€â”€ Earbuds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  'case-dock': (s, t, e, loop) => {
    if (loop) {
      s.scale = 0.85;
      s.rotY = Math.sin(e * 0.8) * 0.12;
      s.y = Math.sin(e * 1.0) * 0.04;
      s.rotX = 0.05;
    } else {
      const k = easeOutCubic(t);
      s.y = -0.85 + 0.85 * k;
      s.scale = 0.55 + 0.45 * k;
      s.rotY = Math.sin(e * 0.75) * 0.30 * t;
    }
  },

  float: (s, t, e, loop) => {
    if (loop) {
      s.scale = 0.85;
      s.y = Math.sin(e * 0.9) * 0.03; // calm, subtle breathing hover for case
      s.rotY = Math.sin(e * 0.3) * 0.02; // almost still (no case spinning)
      s.rotX = 0.06; // subtle forward tilt to display interior
    } else {
      const k = easeOutCubic(t);
      s.y = -0.85 + 0.85 * k + Math.sin(e * 0.9) * 0.03 * t;
      s.scale = 0.55 + 0.45 * k;
      s.rotY = Math.sin(e * 0.3) * 0.02 * t;
      s.rotX = 0.06 * k;
    }
  },
};

const DEFAULT_STYLE_BY_CATEGORY = {
  phone: 'amoled',
  controller: 'levitate',
  speaker: 'wave',
  headphones: 'spin',
  earbuds: 'case-dock',
};

export default function DeviceModel3D({
  modelId,
  category = 'phone',          // engine category: phone | earbud | headphone | controller | speaker
  styleCategory = 'phone',     // key into ANIMATION_STYLES / DEFAULT_STYLE_BY_CATEGORY
  animStyle,
  size = 44,
  isDisconnected = false,
  // Preview use: replay the entry on a cycle instead of settling into idle
  // forever, and pull the model in so wide motions stay inside the frame.
  loop = false,
  fit = 1,
  tintHex,
}) {
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !GLB_MODEL_MAP[modelId]) { setFailed(true); return; }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.1);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(size, size, true);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const disposeEnv = addStudioLights(scene, renderer);
    const master = new THREE.Group();
    scene.add(master);

    let disposed = false;
    let rig = null;
    let animId;
    const clock = new THREE.Clock();
    let elapsed = 0;
    let openProgress = isDisconnected ? 1 : 0;

    const styleKey =
      (animStyle && MOTION[animStyle] && animStyle) ||
      DEFAULT_STYLE_BY_CATEGORY[styleCategory] ||
      'amoled';
    const motion = MOTION[styleKey] || MOTION.amoled;

    loadSharedModel(modelId).then(
      (gltf) => {
        if (disposed) return;
        rig = prepareDeviceModel(gltf, { modelId, category, tintHex });
        if (isDisconnected && category === 'earbud' && rig.lidNode) {
          rig.lidNode.rotation.x = rig.lidAuthoredOpen ? 0 : rig.lidOpenSign * rig.lidOpenAngle;
        }
        master.add(rig.root);
        clock.start();
        elapsed = 0;
        openProgress = isDisconnected ? 1 : 0;
      },
      (err) => { if (disposed) return; console.warn('island model failed:', modelId, err); setFailed(true); }
    );

    const ENTRY_SECONDS = 0.85;
    const HOLD_SECONDS = 2.6;   // time to admire the settled pose before replay
    const CYCLE = ENTRY_SECONDS + HOLD_SECONDS;
    const earbudLoopCycle = styleKey === 'float' ? 5.8 : 4.2;
    const totalLoopCycle = category === 'earbud' ? earbudLoopCycle : CYCLE;

    const animateLoop = () => {
      const dt = Math.min(clock.getDelta(), 0.05); // ignore frame-hitch spikes
      elapsed += dt;
      // Only loop previews if explicit loop prop is passed (e.g. settings card hover)
      if (loop && !isDisconnected && elapsed > totalLoopCycle) {
        elapsed = 0;
        openProgress = 0;
      }

      if (rig) {
        if (isDisconnected) {
          const pose = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1 };

          if (category === 'earbud') {
            // Earbud Disconnection Sequence with lid close phase
            if (elapsed >= 2.2) {
              const dropT = easeOutCubic(clamp01((elapsed - 2.2) / 1.5));
              pose.y = -1.8 * dropT;
              pose.rotX = -0.32 * dropT;
              pose.rotY = 0.45 * dropT;
              pose.scale = 1 - 0.5 * dropT;
            } else {
              pose.y = 0;
              pose.scale = 1;
            }
          } else {
            // 3D Spin & Depth Withdrawal for Phones, Headphones, Controllers, & Speakers
            const dropT = easeOutCubic(clamp01(elapsed / 2.2));
            pose.z = -2.8 * dropT;
            pose.y = -0.35 * dropT;
            pose.rotY = dropT * Math.PI * 1.5;
            pose.rotX = -0.30 * dropT;
            pose.scale = 1 - 0.7 * dropT;
          }

          master.position.set(pose.x, rig.initialYPos + pose.y, pose.z);
          master.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
          master.scale.setScalar(Math.max(0.01, pose.scale) * fit);
          master.visible = elapsed < 3.8;

          if (category === 'earbud' && rig.lidNode) {
            let targetProgress = 1;
            if (elapsed < 1.2) {
              // Phase 1: Earbuds dock down (1 -> 0.5 openProgress)
              const budT = easeOutCubic(clamp01(elapsed / 1.2));
              targetProgress = 1 - 0.5 * budT;
            } else if (elapsed < 2.2) {
              // Phase 2: Lid closes smoothly (0.5 -> 0.0 openProgress)
              const lidT = easeOutCubic(clamp01((elapsed - 1.2) / 1.0));
              targetProgress = 0.5 * (1 - lidT);
            } else {
              targetProgress = 0;
            }

            openProgress = targetProgress;

            rig.lidNode.rotation.x = rig.lidAuthoredOpen
              ? THREE.MathUtils.lerp(rig.lidClosedAngle, 0, openProgress)
              : rig.lidOpenSign * rig.lidOpenAngle * openProgress;

            const cfg = rig.config;
            const riseKey = cfg.riseAxis || 'y';
            const secKey = cfg.secondaryAxis || 'z';
            const secSign = cfg.secondarySign ?? 1;
            const bt = clamp01((openProgress - 0.22) / 0.78);
            const budEase = bt < 0.5 ? 4 * bt * bt * bt : 1 - Math.pow(-2 * bt + 2, 3) / 2;
            const budPop = cfg.budsAuthoredOut ? budEase - 1 : budEase;

            for (const [node, ix, iy, iz, tilt, spread] of [
              [rig.budLeftNode, rig.budLeftInitialX, rig.budLeftInitialY, rig.budLeftInitialZ, -0.10, -1],
              [rig.budRightNode, rig.budRightInitialX, rig.budRightInitialY, rig.budRightInitialZ, 0.10, 1],
            ]) {
              if (!node) continue;
              node.visible = openProgress > 0.08;
              node.position.x = ix;
              node.position[riseKey] = (riseKey === 'y' ? iy : iz) + budPop * rig.budRise;
              node.position[secKey] =
                (secKey === 'y' ? iy : iz) + budPop * rig.budRise * 0.25 * secSign;
              node.rotation.set(0, 0, tilt * openProgress);
              if (cfg.splitBuds) {
                node.position.x = ix + spread * openProgress * 3;
                node.position.y = iy + openProgress * 4;
                node.position.z = iz + openProgress * 18;
                node.rotation.set(openProgress * THREE.MathUtils.degToRad(25), spread * openProgress * THREE.MathUtils.degToRad(15), 0);
              }
            }
          }
        } else {
          // Standard Connection Motion
          const raw = clamp01(elapsed / ENTRY_SECONDS);
          const t = raw;

          const pose = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1 };
          motion(pose, t, elapsed, loop);

          const openDrop = category === 'earbud' ? openProgress * rig.openNudgeY : 0;
          master.position.set(pose.x, rig.initialYPos + pose.y - openDrop, pose.z);
          master.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
          master.scale.setScalar(Math.max(0.01, pose.scale) * fit);
          master.visible = true;

          // Earbud cases additionally open their lid and lift the buds.
          if (category === 'earbud' && rig.lidNode) {
            let targetOpen = 1;
            let budWaveY = 0;
            let budWaveZ = 0;

            let leftSpin = 0;
            let rightSpin = 0;
            let floatProgress = 0;
            let spreadProgress = 0;
            let budRiseProgress = 0;

            if (styleKey === 'case-dock') {
              if (loop && !isDisconnected) {
                // Lid Flip & Earbud Docking (4.2s cycle)
                // 0.0–0.7s : Lid smoothly flips open (buds remain seated inside)
                // 0.7–1.5s : Earbuds smoothly emerge and rise out of the case
                // 1.5–2.0s : Apex peek with subtle organic bob
                // 2.0–2.8s : Earbuds smoothly descend back into docking slots
                // 2.8–3.5s : Lid smoothly flips shut over docked earbuds
                // 3.5–4.2s : Closed case rests before next cycle
                const cycleTime = elapsed % 4.2;
                if (cycleTime < 0.7) {
                  targetOpen = easeInOutCubic(cycleTime / 0.7);
                  budRiseProgress = 0;
                } else if (cycleTime < 1.5) {
                  targetOpen = 1.0;
                  budRiseProgress = easeInOutCubic((cycleTime - 0.7) / 0.8);
                } else if (cycleTime < 2.0) {
                  targetOpen = 1.0;
                  budRiseProgress = 1.0;
                  budWaveY = Math.sin((cycleTime - 1.5) * 4.5) * 0.012;
                } else if (cycleTime < 2.8) {
                  targetOpen = 1.0;
                  budRiseProgress = 1.0 - easeInOutCubic((cycleTime - 2.0) / 0.8);
                } else if (cycleTime < 3.5) {
                  targetOpen = 1.0 - easeInOutCubic((cycleTime - 2.8) / 0.7);
                  budRiseProgress = 0;
                } else {
                  targetOpen = 0.0;
                  budRiseProgress = 0;
                }
              } else {
                targetOpen = clamp01(t * 1.25);
                budRiseProgress = easeInOutCubic(clamp01((t - 0.2) * 1.5));
              }
            } else if (styleKey === 'float') {
              if (loop && !isDisconnected) {
                // Dual Earbud Float (5.8s cycle)
                // 0.0–0.7s : Lid smoothly flips open
                // 0.7–1.4s : Earbuds float up from their own bays and spread laterally
                // 1.4–4.0s : Earbuds hover in mid-air in front-facing showcase pose
                // 4.0–4.8s : Earbuds glide back to center and sink into slots
                // 4.8–5.4s : Lid smoothly flips shut
                // 5.4–5.8s : Closed case rests before next cycle
                const cycleTime = elapsed % 5.8;
                if (cycleTime < 0.7) {
                  targetOpen = easeInOutCubic(cycleTime / 0.7);
                  floatProgress = 0;
                  spreadProgress = 0;
                  leftSpin = 0;
                  rightSpin = 0;
                } else if (cycleTime < 1.4) {
                  targetOpen = 1.0;
                  const p = easeInOutCubic((cycleTime - 0.7) / 0.7);
                  floatProgress = p;
                  spreadProgress = p;
                  leftSpin = -0.15 * p;
                  rightSpin = 0.15 * p;
                } else if (cycleTime < 4.0) {
                  targetOpen = 1.0;
                  floatProgress = 1.0;
                  spreadProgress = 1.0;
                  const hoverT = cycleTime - 1.4;
                  budWaveY = Math.sin(hoverT * 2.0) * 0.002;
                  leftSpin = -0.15 + Math.sin(hoverT * 1.5) * 0.02;
                  rightSpin = 0.15 - Math.sin(hoverT * 1.5) * 0.02;
                } else if (cycleTime < 4.8) {
                  targetOpen = 1.0;
                  const returnT = (cycleTime - 4.0) / 0.8;
                  const dockP = 1.0 - easeInOutCubic(returnT);
                  floatProgress = dockP;
                  spreadProgress = dockP;
                  leftSpin = -0.15 * dockP;
                  rightSpin = 0.15 * dockP;
                } else if (cycleTime < 5.4) {
                  targetOpen = 1.0 - easeInOutCubic((cycleTime - 4.8) / 0.6);
                  floatProgress = 0.0;
                  spreadProgress = 0.0;
                  leftSpin = 0.0;
                  rightSpin = 0.0;
                } else {
                  targetOpen = 0.0;
                  floatProgress = 0.0;
                  spreadProgress = 0.0;
                  leftSpin = 0.0;
                  rightSpin = 0.0;
                }
              } else {
                targetOpen = clamp01(t * 1.25);
                const p = clamp01((t - 0.15) * 1.2);
                floatProgress = p;
                spreadProgress = p;
                leftSpin = -0.15 * p;
                rightSpin = 0.15 * p;
                if (t >= 1) {
                  budWaveY = Math.sin(elapsed * 2.0) * 0.002;
                  leftSpin = -0.15 + Math.sin(elapsed * 1.5) * 0.02;
                  rightSpin = 0.15 - Math.sin(elapsed * 1.5) * 0.02;
                }
              }
            }

            openProgress = targetOpen;

            rig.lidNode.rotation.x = rig.lidAuthoredOpen
              ? THREE.MathUtils.lerp(rig.lidClosedAngle, 0, openProgress)
              : rig.lidOpenSign * rig.lidOpenAngle * openProgress;

            const cfg = rig.config;
            const riseKey = cfg.riseAxis || 'y';
            const secKey = cfg.secondaryAxis || 'z';
            const secSign = cfg.secondarySign ?? 1;

            for (const [node, ix, iy, iz, tilt, spinAngle, spreadSign] of [
              [rig.budLeftNode, rig.budLeftInitialX, rig.budLeftInitialY, rig.budLeftInitialZ, -0.06, leftSpin, -1],
              [rig.budRightNode, rig.budRightInitialX, rig.budRightInitialY, rig.budRightInitialZ, 0.06, rightSpin, 1],
            ]) {
              if (!node) continue;
              node.visible = openProgress > 0.15;

              if (styleKey === 'float') {
                if (cfg.budsAuthoredOut) {
                  // AirPods Pro: docked sinks deep into body; floats directly above slot
                  const dockedY = iy - rig.budRise;
                  const floatingY = iy + 0.018;
                  node.position.x = ix + spreadSign * 0.005 * spreadProgress;
                  node.position[riseKey] = dockedY + (floatingY - dockedY) * floatProgress + budWaveY;
                  node.position[secKey] = iz;
                } else if (cfg.splitBuds) {
                  // Galaxy Buds
                  node.position.x = ix + spreadSign * openProgress * 0.1;
                  node.position.y = iy + openProgress * rig.budRise * 0.4 + budWaveY;
                  node.position.z = iz + floatProgress * rig.budRise * 1.5 + budWaveZ;
                } else {
                  node.position.x = ix + spreadSign * 0.05 * spreadProgress;
                  node.position[riseKey] = (riseKey === 'y' ? iy : iz) + floatProgress * rig.budRise * 1.5 + budWaveY;
                  node.position[secKey] = (secKey === 'y' ? iy : iz) + (floatProgress * rig.budRise * 0.25 * secSign) + budWaveZ;
                }

                node.rotation.set(
                  0.04 * floatProgress,
                  spinAngle,
                  tilt * floatProgress
                );
              } else {
                // 'case-dock' style: buds rise out and dock back in
                const baseRise = riseKey === 'y' ? iy : iz;
                const baseSec = secKey === 'y' ? iy : iz;
                if (cfg.budsAuthoredOut) {
                  // AirPods: authored position; docked sinks fully inside body slots
                  const dockedY = iy - rig.budRise;
                  const peakY = iy + 0.012;
                  node.position.x = ix;
                  node.position[riseKey] = dockedY + (peakY - dockedY) * budRiseProgress + budWaveY;
                  node.position[secKey] = iz;
                } else if (cfg.splitBuds) {
                  // Galaxy Buds
                  node.position.x = ix + spreadSign * budRiseProgress * 1.5;
                  node.position.y = iy + budRiseProgress * 2;
                  node.position.z = iz + budRiseProgress * 8;
                } else {
                  node.position[riseKey] = baseRise + rig.budRise * 0.5 * budRiseProgress + budWaveY;
                  node.position[secKey] = baseSec + budRiseProgress * rig.budRise * 0.1 * secSign;
                }
                if (!cfg.splitBuds && !cfg.budsAuthoredOut) node.position.x = ix;
                node.rotation.set(budRiseProgress * 0.05, 0, tilt * budRiseProgress * 0.3);
              }
            }
          }
        }
      }
      renderer.render(scene, camera);

      // Stop loop once disconnection animation is done; otherwise keep running.
      if (!(isDisconnected && elapsed >= 3.8)) {
        animId = requestAnimationFrame(animateLoop);
      }
    };
    animId = requestAnimationFrame(animateLoop);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      scene.traverse((child) => {
        if (child.isMesh && child.material && child.material.__isCloned) {
          child.material.dispose();
        }
      });
      disposeEnv();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, [modelId, category, styleCategory, animStyle, size, isDisconnected, loop, fit, tintHex]);

  if (failed) {
    if (category === 'phone') {
      return <Phone3D size={size} isAnimated={true} isDisconnected={isDisconnected} />;
    }
    if (category === 'speaker') {
      return <Speaker3D size={size} isAnimated={true} isDisconnected={isDisconnected} />;
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: size, height: size, display: 'flex',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}
    />
  );
}

