/**
 * Shared device-model engine.
 *
 * Owns everything about turning a device id into a ready-to-animate Three.js
 * scene: the GLB registry, per-model pose/scale calibration, the session cache,
 * the fixes for quirks baked into the source scans, and the rig (lid hinge, bud
 * travel) the earbud animation drives.
 *
 * Both the Settings picker cards and the Dynamic Island connection notification
 * render the same devices, so this lives in one place rather than being
 * duplicated and drifting between the two.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// â”€â”€â”€ Real 3D GLB Asset Imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import s24ultraGlb       from '../assets/models/s24ultra.glb?url';
import s25ultraGlb       from '../assets/models/s25ultra.glb?url';
import s26ultraGlb       from '../assets/models/s26ultra.glb?url';
import zfold6Glb         from '../assets/models/zfold6.glb?url';
import zflip6Glb         from '../assets/models/zflip6.glb?url';
import iphone16proGlb    from '../assets/models/iphone16pro.glb?url';
import iphone15proGlb    from '../assets/models/iphone15pro.glb?url';
import iphone16Glb       from '../assets/models/iphone16.glb?url';
import iphone15Glb       from '../assets/models/iphone15.glb?url';
import iphone12Glb       from '../assets/models/iphone12.glb?url';
import iphone17proGlb    from '../assets/models/iphone17pro.glb?url';
import iphone17airGlb    from '../assets/models/iphone17air.glb?url';
import razerbarracudaGlb from '../assets/models/razerbarracuda.glb?url';
import sonywh1000Glb     from '../assets/models/sonywh1000.glb?url';
import airpodsproGlb     from '../assets/models/airpodspro.glb?url';
import airpodsmaxGlb     from '../assets/models/airpodsmax.glb?url';
import galaxybudsGlb     from '../assets/models/galaxybuds.glb?url';
import galaxyCaseBaseGlb from '../assets/models/galaxy_case_base.glb?url';
import galaxyCaseLidGlb  from '../assets/models/galaxy_case_lid.glb?url';
import galaxyBudLeftGlb  from '../assets/models/galaxy_bud_left.glb?url';
import galaxyBudRightGlb from '../assets/models/galaxy_bud_right.glb?url';
import soundbarGlb       from '../assets/models/soundbar.glb?url';
import sonosSoundbarGlb  from '../assets/models/sonos_soundbar.glb?url';
import ps5ControllerGlb  from '../assets/models/ps5_controller.glb?url';
import xboxBlackGlb      from '../assets/models/xbox_black.glb?url';
import xboxWhiteGlb      from '../assets/models/xbox_white.glb?url';
import pixel6proGlb      from '../assets/models/pixel6pro.glb?url';
import pixel7proGlb      from '../assets/models/pixel7pro.glb?url';
import pixel8proGlb      from '../assets/models/pixel8pro.glb?url';
import s21ultraGlb       from '../assets/models/s21ultra.glb?url';
import s22ultraGlb       from '../assets/models/s22ultra.glb?url';
import note20ultraGlb    from '../assets/models/note20ultra.glb?url';
import zflip3Glb         from '../assets/models/zflip3.glb?url';
import zfold2Glb         from '../assets/models/zfold2.glb?url';

export const GLB_MODEL_MAP = {
  s24ultra: s24ultraGlb,
  s25ultra: s25ultraGlb,
  s26ultra: s26ultraGlb,
  zfold6: zfold6Glb,
  zfold5: zfold6Glb,
  zflip6: zflip6Glb,
  zflip5: zflip6Glb,
  iphone17pro: iphone17proGlb,
  iphone17air: iphone17airGlb,
  iphone16pro: iphone16proGlb,
  iphone15pro: iphone15proGlb,
  iphone16: iphone16Glb,
  iphone15: iphone15Glb,
  iphone12: iphone12Glb,
  razerbarracuda: razerbarracudaGlb,
  sonywh1000: sonywh1000Glb,
  airpodspro: airpodsproGlb,
  airpodsmax: airpodsmaxGlb,
  galaxybuds: galaxybudsGlb,
  soundbar: soundbarGlb,
  sonos_soundbar: sonosSoundbarGlb,
  ps5_controller: ps5ControllerGlb,
  xbox_black: xboxBlackGlb,
  xbox_white: xboxWhiteGlb,
  pixel6pro: pixel6proGlb,
  pixel7pro: pixel7proGlb,
  pixel8pro: pixel8proGlb,
  s21ultra: s21ultraGlb,
  s22ultra: s22ultraGlb,
  note20ultra: note20ultraGlb,
  zflip3: zflip3Glb,
  zflip2: zflip3Glb,
  zfold2: zfold2Glb,
  zfold3: zfold2Glb,
};

// ——— Per-model Base Pose & Scale Configs (calibrated against the real GLBs) —
export const MODEL_CONFIGS = {
  // baseRot* are the FINAL on-screen rotations. (They were once applied twice —
  // on the model and again on its parent group — so several values here are
  // half what they look like historically; the doubling is fixed.)
  s24ultra:       { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  // The s25 GLB is authored facing sideways (its thinnest axis is X, not Z like
  // s24/s26), so it needs a quarter turn to present its back to the camera.
  s25ultra:       { baseRotY: Math.PI / 2,    baseRotX: 0, scaleFactor: 1.65 },
  s26ultra:       { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  zfold6:         { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.65 },
  zflip6:         { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone17pro:    { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone17air:    { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone16pro:    { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone15pro:    { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone16:       { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone15:       { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  iphone12:       { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  pixel6pro:      { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.65 },
  pixel7pro:      { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.65 },
  pixel8pro:      { baseRotY: Math.PI / 2,    baseRotX: 0, scaleFactor: 1.65 },
  s21ultra:       { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.65 },
  s22ultra:       { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  note20ultra:    { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  zflip3:         { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.35 },
  zfold2:         { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.40 },
  zfold5:         { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.65 },
  zflip5:         { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.65 },
  zflip2:         { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.35 },
  zfold3:         { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.40 },
  // The Razer GLB is authored front-on (thinnest axis Z), so it needs no turn
  // to face the viewer; the Sony GLB is authored side-on (thinnest axis X) and
  // needs a turn to match. Both end up presenting the same front view.
  razerbarracuda: { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.45 },
  sonywh1000:     { baseRotY: Math.PI / 1.75, baseRotX: 0, scaleFactor: 1.45 },
  airpodsmax:     { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.45 },
  // Earbuds. The AirPods scan is authored Y-up (matches Three's axes, baseRotX
  // 0) so its buds rise along local Y. The Galaxy GLB is authored Z-up, and
  // baseRotX ≈ -90° rotates that local Z onto world-up — which is also why its
  // buds must travel along local Z and nudge along local Y instead.
  //
  // budsAuthoredOut: the AirPods scan poses its earbuds ALREADY lifted clear of
  // the case, so their authored spot is the END of the animation and they must
  // be sunk into the case first. The Galaxy buds are modelled seated inside.
  // lidAuthoredOpen: this scan poses the CASE open too — its lid node sits
  // behind the body with no rotation of its own, so leaving the hinge at zero
  // (the resting state) showed a permanently open case. Like the buds, the
  // authored pose is the END of the animation, not the start.
  airpodspro:     { baseRotY: 0, baseRotX: 0, scaleFactor: 1.60, riseAxis: 'y', secondaryAxis: 'z', secondarySign: 1, riseMult: 0.55, budsAuthoredOut: true, lidAuthoredOpen: true, hingeZUseMax: true, fixedLidClosedAngle: 1.55, openNudgeY: 0.10 },
  galaxybuds:     { baseRotY: 0, baseRotX: -Math.PI / 2 - 0.15, scaleFactor: 1.60, riseAxis: 'z', secondaryAxis: 'y', secondarySign: -1, riseMult: 0.85, lidOpenAngle: Math.PI / 2, openNudgeY: 0.38, preRiggedLid: true, splitBuds: true },
  soundbar:       { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.35 },
  sonos_soundbar: { baseRotY: 0,              baseRotX: 0.12, scaleFactor: 1.45 },
  // The DualSense GLB is authored back-on, so it needs a half turn to show its
  // face; the Xbox GLBs are already authored face-on.
  ps5_controller: { baseRotY: Math.PI,        baseRotX: 0, scaleFactor: 1.28 },
  xbox_white:     { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.28 },
  xbox_black:     { baseRotY: 0,              baseRotX: 0, scaleFactor: 1.28 },
};

export const SPIN_MODELS = new Set([
  's24ultra', 's25ultra', 's26ultra', 'zfold6', 'zflip6',
  'iphone17pro', 'iphone17air', 'iphone16pro', 'iphone15pro', 'iphone16', 'iphone15', 'iphone12',
  'pixel6pro', 'pixel7pro', 'pixel8pro', 's21ultra', 's22ultra', 'note20ultra', 'zflip3', 'zfold2',
  'zfold5', 'zflip5', 'zflip2', 'zfold3',
]);

// Tilt applied to the whole group while an earbud case is open. Shared so the
// drop measurement below sees the same pose the renderers actually draw.
export const OPEN_TILT_X = -0.20;

const EARBUD_NODES = {
  airpodspro: { lid: 'uzpdkgqkIIWTYxJ', left: 'RTZiZFLcZlxaClC', right: 'DprZyuuKYVGeqRc' },
  galaxybuds: { lid: 'Case_Lid_Pivot', left: 'Earbud_Left', right: 'Earbud_Right' },
};

const GALAXY_HINGE = new THREE.Vector3(0, 25.0, 14.06840991973877);
const GALAXY_LEFT_REST = new THREE.Vector3(-7.5, 1.5, 7.5);
const GALAXY_RIGHT_REST = new THREE.Vector3(7.5, 1.5, 7.5);

function boxVolume(box) {
  const s = box.getSize(new THREE.Vector3());
  return Math.max(s.x, 0) * Math.max(s.y, 0) * Math.max(s.z, 0);
}

// â”€â”€ Ghost-Mesh Deduplication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Some source scans ship true duplicate "overlay" meshes: siblings sharing a
// parent that nearly â€” not exactly â€” occupy the same bounding box.
//
// A ghost is a near-DUPLICATE, so all three tests below must pass. A plain
// containment test is not enough and actively broke both earbud models: it
// deleted 29 of the AirPods scan's 48 meshes (stripping the detailed white
// shells, leaving dark low-poly ones â€” the "black earbuds") and deleted the
// Galaxy case's entire Case_Base, because the buds nested inside it counted as
// containing it (the ratio was taken against the smaller box, so any small part
// swallowed its own parent shell).
export function dedupeOverlappingMeshes(root) {
  root.updateWorldMatrix(true, true);
  const groups = new Map();
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const box = new THREE.Box3().setFromObject(child);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;
    const parentKey = child.parent ? child.parent.uuid : 'root';
    if (!groups.has(parentKey)) groups.set(parentKey, []);
    groups.get(parentKey).push({
      mesh: child, box,
      volume: boxVolume(box),
      verts: child.geometry.attributes?.position?.count || 0,
    });
  });

  const MIN_VOLUME_RATIO = 0.8;    // how alike in size two boxes must be
  const MIN_MUTUAL_OVERLAP = 0.9;  // fraction of EACH box that must overlap
  let removed = 0;

  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => b.verts - a.verts); // most detailed mesh wins
    const kept = [];
    for (const candidate of arr) {
      let isGhost = false;
      for (const keptEntry of kept) {
        if (candidate.volume <= 0 || keptEntry.volume <= 0) continue;
        const sizeRatio =
          Math.min(candidate.volume, keptEntry.volume) /
          Math.max(candidate.volume, keptEntry.volume);
        if (sizeRatio < MIN_VOLUME_RATIO) continue;
        const inter = boxVolume(keptEntry.box.clone().intersect(candidate.box));
        if (inter / candidate.volume >= MIN_MUTUAL_OVERLAP &&
            inter / keptEntry.volume >= MIN_MUTUAL_OVERLAP) { isGhost = true; break; }
      }
      if (isGhost) { candidate.mesh.parent?.remove(candidate.mesh); removed++; }
      else kept.push(candidate);
    }
  }
  return removed;
}

// â”€â”€ Ghost-Bud Removal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The AirPods scan also ships a single low-poly stand-in covering BOTH earbuds.
// It lives under a different parent than the two real bud nodes, so the
// sibling-scoped dedupe cannot see it and the per-node animation never touches
// it â€” it just sat there as a dark pair of buds poking out of the closed case.
// Identified structurally, never by name: a mesh outside both buds that sits
// almost entirely inside the space they occupy while carrying a fraction of
// their detail. Models without one are untouched.
export function removeGhostBudMeshes(root, leftBud, rightBud) {
  if (!leftBud || !rightBud) return 0;
  root.updateWorldMatrix(true, true);
  const isDescendantOf = (obj, ancestor) => {
    for (let p = obj; p; p = p.parent) if (p === ancestor) return true;
    return false;
  };
  const budUnion = new THREE.Box3().setFromObject(leftBud)
    .union(new THREE.Box3().setFromObject(rightBud));
  let budVerts = 0;
  for (const bud of [leftBud, rightBud]) {
    bud.traverse((c) => { if (c.isMesh) budVerts += c.geometry?.attributes?.position?.count || 0; });
  }

  const CONTAINMENT = 0.9;
  const DETAIL_RATIO = 0.2;
  const doomed = [];
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (isDescendantOf(child, leftBud) || isDescendantOf(child, rightBud)) return;
    const box = new THREE.Box3().setFromObject(child);
    const volume = boxVolume(box);
    if (volume <= 0) return;
    if (boxVolume(box.clone().intersect(budUnion)) / volume < CONTAINMENT) return;
    const verts = child.geometry.attributes?.position?.count || 0;
    if (budVerts > 0 && verts > budVerts * DETAIL_RATIO) return;
    doomed.push(child);
  });
  doomed.forEach((mesh) => mesh.parent?.remove(mesh));
  return doomed.length;
}

// ——— Shared model cache ———————————————————————————————————————————————————————
// Each asset is fetched and parsed at most once per session; callers take a
// lightweight clone. Clones share geometry and materials with the cached
// master, so consumers must NOT dispose those on teardown — doing so would
// leave the cache pointing at freed GPU buffers.
const MODEL_CACHE = new Map();

export function loadSharedModel(modelId) {
  const url = GLB_MODEL_MAP[modelId];
  if (!url) return Promise.reject(new Error(`unknown model: ${modelId}`));
  if (!MODEL_CACHE.has(modelId)) {
    const loadPromise = Promise.resolve(MeshoptDecoder.ready).then(() => {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      return modelId === 'galaxybuds'
        ? Promise.all([
            loader.loadAsync(galaxyCaseBaseGlb),
            loader.loadAsync(galaxyCaseLidGlb),
            loader.loadAsync(galaxyBudLeftGlb),
            loader.loadAsync(galaxyBudRightGlb),
          ]).then(([base, lid, leftBud, rightBud]) => {
            const scene = new THREE.Group();
            scene.name = 'GalaxyBudsSplitRig';

            const baseGroup = new THREE.Group();
            baseGroup.name = 'Case_Base';
            baseGroup.add(base.scene);

            const lidPivot = new THREE.Group();
            lidPivot.name = 'Case_Lid_Pivot';
            lidPivot.position.copy(GALAXY_HINGE);
            lid.scene.name = 'Case_Lid';
            lid.scene.position.copy(GALAXY_HINGE).multiplyScalar(-1);
            lidPivot.add(lid.scene);

            const leftGroup = new THREE.Group();
            leftGroup.name = 'Earbud_Left';
            leftGroup.position.copy(GALAXY_LEFT_REST);
            leftGroup.add(leftBud.scene);

            const rightGroup = new THREE.Group();
            rightGroup.name = 'Earbud_Right';
            rightGroup.position.copy(GALAXY_RIGHT_REST);
            rightGroup.add(rightBud.scene);

            scene.add(baseGroup, lidPivot, leftGroup, rightGroup);
            return { scene };
          })
        : loader.loadAsync(url);
    });

    MODEL_CACHE.set(modelId, loadPromise.catch((err) => {
      MODEL_CACHE.delete(modelId);
      throw err;
    }));
  }
  return MODEL_CACHE.get(modelId);
}

/**
 * Clone a cached GLTF and get it camera-ready: quirks fixed, finish applied,
 * auto-fitted, posed, and (for earbuds) rigged with a lid hinge and bud travel.
 *
 * Returns the rig the animation loop needs; `budRise` is already expressed in
 * the bud nodes' own local units.
 */
export function prepareDeviceModel(gltf, { modelId, category, tintHex }) {
  const config = MODEL_CONFIGS[modelId] || { baseRotY: 0, baseRotX: 0, scaleFactor: 1.6 };
  const root = cloneSkeleton ? cloneSkeleton(gltf.scene) : gltf.scene.clone(true);

  if (category === 'earbud') dedupeOverlappingMeshes(root);

  // AirPods Max ships flat/broken scan materials â€” give it a clean finish.
  // Everything else keeps its authored PBR for realism.
  if (modelId === 'airpodsmax') {
    const whiteAppleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5f5f7, roughness: 0.15, metalness: 0.2, clearcoat: 1.0, side: THREE.DoubleSide,
    });
    whiteAppleMat.__isCloned = true;
    root.traverse((child) => { if (child.isMesh) child.material = whiteAppleMat; });
  } else {
    root.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.side = THREE.DoubleSide;
        if (child.material.roughness !== undefined) {
          child.material.roughness = Math.min(child.material.roughness, 0.35);
        }
      }
    });
  }

  // AirPods Pro Material Enhancement & Duplicate Ghost Proxy Mesh Removal
  if (modelId === 'airpodspro') {
    // Remove black duplicate proxy meshes from scan (including stationary aperture proxy and duplicate shells)
    ['OQUywkShUFTTvZv', 'eURoUelNkeWEPWy', 'ovvBCJtLtXvnMKD', 'rfmqyaJLfjAyTkY', 'WPywCKzwFYPbAIO'].forEach((name) => {
      const node = root.getObjectByName(name);
      if (node) node.parent?.remove(node);
    });

    // Apply glossy white Apple plastic to the ENTIRE model as the default material.
    // The scan ships with dark/flat materials; rather than whitelisting individual
    // mesh names (which is fragile and leaves un-named parts dark), paint everything
    // white first, then selectively override the few parts that need a different finish.
    const appleGlossyWhite = new THREE.MeshPhysicalMaterial({
      color: 0xfafafa,
      roughness: 0.12,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    });
    appleGlossyWhite.__isCloned = true;

    root.traverse((child) => {
      if (child.isMesh) child.material = appleGlossyWhite;
    });

    // Selectively override silicone ear tips (matte, softer look)
    const siliconeTipMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.55,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    siliconeTipMat.__isCloned = true;
    ['KPqSOEgJkfoJWgS', 'bPjepBAPhlWUSRe'].forEach((name) => {
      root.getObjectByName(name)?.traverse((c) => { if (c.isMesh) c.material = siliconeTipMat; });
    });

    // Selectively override chrome stem contacts (metallic finish)
    const chromeStemMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.15,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    chromeStemMat.__isCloned = true;
    ['gxCqFEWJNRsnkPj', 'zQWewWOGCZBobQa'].forEach((name) => {
      root.getObjectByName(name)?.traverse((c) => { if (c.isMesh) c.material = chromeStemMat; });
    });
  }

  // The Galaxy GLB is authored graphite; WinLand shows the silver finish.
  //
  // A flat white repaint left it reading as a featureless blob â€” with almost no
  // texture detail in this asset, a diffuse-only material gives the eye nothing
  // to catch. A polished metal is what makes the form legible instead: metalness
  // carries the environment, low roughness gives it a sharp highlight along the
  // lid seam, and the clearcoat adds the lacquered sheen the real case has. The
  // lid is kept a touch brighter than the base so the two halves read apart.
  if (modelId === 'galaxybuds') {
    const silver = (tone) => {
      const mat = new THREE.MeshPhysicalMaterial({
        color: tone,
        metalness: 0.92,
        roughness: 0.19,
        clearcoat: 0.7,
        clearcoatRoughness: 0.14,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide,
      });
      mat.__isCloned = true;
      return mat;
    };
    root.getObjectByName('Case_Base')?.traverse((c) => { if (c.isMesh) c.material = silver(0xc9ccd2); });
    root.getObjectByName('Case_Lid')?.traverse((c) => { if (c.isMesh) c.material = silver(0xdfe2e7); });
  }

  // Hardware finish. The picker used to be inert because nothing consumed the
  // colour â€” the models simply kept their authored materials. Tint the body
  // panels toward the chosen finish while leaving the dark parts (screens,
  // grilles, rubber) alone, otherwise a phone turns into a solid slab of
  // colour with no screen. Materials are cloned first: they are shared with
  if (tintHex) {
    const tint = new THREE.Color(tintHex);
    const seen = new Map();
    root.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const updated = mats.map((src) => {
        if (!src || !src.color) return src;
        // Skip near-black surfaces — those read as screen/trim, not bodywork.
        const luma = 0.2126 * src.color.r + 0.7152 * src.color.g + 0.0722 * src.color.b;
        if (luma < 0.08) return src;
        let cloned = seen.get(src.uuid);
        if (!cloned) {
          cloned = src.clone();
          cloned.color = src.color.clone().lerp(tint, 0.75);
          if (cloned.roughness !== undefined) cloned.roughness = Math.min(cloned.roughness, 0.28);
          cloned.__isCloned = true;
          seen.set(src.uuid, cloned);
        }
        return cloned;
      });
      child.material = Array.isArray(child.material) ? updated : updated[0];
    });
  }

  let lidNode = null, budLeftNode = null, budRightNode = null;
  let budLeftInitialX = 0, budLeftInitialY = 0, budLeftInitialZ = 0;
  let budRightInitialX = 0, budRightInitialY = 0, budRightInitialZ = 0;

  if (category === 'earbud') {
    const names = EARBUD_NODES[modelId];
    if (names) {
      lidNode = root.getObjectByName(names.lid);
      budLeftNode = root.getObjectByName(names.left);
      budRightNode = root.getObjectByName(names.right);
      removeGhostBudMeshes(root, budLeftNode, budRightNode);
      if (budLeftNode) {
        budLeftInitialX = budLeftNode.position.x;
        budLeftInitialY = budLeftNode.position.y;
        budLeftInitialZ = budLeftNode.position.z;
        budLeftNode.visible = false;
      }
      if (budRightNode) {
        budRightInitialX = budRightNode.position.x;
        budRightInitialY = budRightNode.position.y;
        budRightInitialZ = budRightNode.position.z;
        budRightNode.visible = false;
      }
    }
  }

  // Auto-fit & centre strictly inside the canvas.
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = (Number.isFinite(maxDim) && maxDim > 0) ? (config.scaleFactor || 1.6) / maxDim : 1;

  root.scale.set(s, s, s);
  if (Number.isFinite(center.x)) {
    root.position.sub(center.multiplyScalar(s));
  }
  root.rotation.y = config.baseRotY;
  root.rotation.x = config.baseRotX;

  // Re-centre on POST-rotation bounds for ALL models so rotated phones and devices land perfectly centered.
  root.updateWorldMatrix(true, true);
  const postBox = new THREE.Box3().setFromObject(root);
  const postCenter = postBox.getCenter(new THREE.Vector3());
  if (Number.isFinite(postCenter.x)) {
    root.position.sub(postCenter);
  }

  let budRise = 1;
  let lidClosedAngle = 0; // hinge angle that shuts a case authored open
  let targetWorldRise = 0; // same travel, in world units, for framing the shot
  if (category === 'earbud') {
    if (lidNode && !config.preRiggedLid) {
      root.updateWorldMatrix(true, true);
      const lidBox = new THREE.Box3().setFromObject(lidNode);
      const hingeZ = config.hingeZUseMax ? lidBox.max.z : lidBox.min.z;
      const hingeWorld = new THREE.Vector3(
        (lidBox.min.x + lidBox.max.x) * 0.5, lidBox.min.y, hingeZ
      );
      if (budLeftNode) {
        const leftBox = new THREE.Box3().setFromObject(budLeftNode);
        const leftCenter = leftBox.getCenter(new THREE.Vector3());
        root.worldToLocal(leftCenter);
        const leftPivot = new THREE.Group();
        leftPivot.position.copy(leftCenter);
        root.add(leftPivot);
        budLeftNode.visible = true;
        leftPivot.attach(budLeftNode);
        budLeftNode = leftPivot;
        budLeftInitialX = leftPivot.position.x;
        budLeftInitialY = leftPivot.position.y;
        budLeftInitialZ = leftPivot.position.z;
        budLeftNode.visible = false;
      }
      if (budRightNode) {
        const rightBox = new THREE.Box3().setFromObject(budRightNode);
        const rightCenter = rightBox.getCenter(new THREE.Vector3());
        root.worldToLocal(rightCenter);
        const rightPivot = new THREE.Group();
        rightPivot.position.copy(rightCenter);
        root.add(rightPivot);
        budRightNode.visible = true;
        rightPivot.attach(budRightNode);
        budRightNode = rightPivot;
        budRightInitialX = rightPivot.position.x;
        budRightInitialY = rightPivot.position.y;
        budRightInitialZ = rightPivot.position.z;
        budRightNode.visible = false;
      }
      const lidParent = lidNode.parent;
      if (lidParent) {
        lidParent.worldToLocal(hingeWorld);
        const lidPivot = new THREE.Group();
        lidPivot.position.copy(hingeWorld);
        lidParent.add(lidPivot);
        lidPivot.attach(lidNode);
        lidNode = lidPivot;
        lidClosedAngle = Math.PI / 2;
        lidPivot.rotation.x = lidClosedAngle;
      }
    }

    const riseAxisKey = config.riseAxis || 'y';
    const budParentScale = new THREE.Vector3(1, 1, 1);
    (budLeftNode?.parent || root).getWorldScale(budParentScale);

    if (modelId === 'airpodspro') {
      budRise = 0.028;
    } else {
      root.updateWorldMatrix(true, true);
      const rawCaseH = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y;
      const caseWorldHeight = (Number.isFinite(rawCaseH) && rawCaseH > 0) ? rawCaseH : 1;
      targetWorldRise = caseWorldHeight * (config.riseMult ?? 0.45);
      budRise = targetWorldRise / (Math.abs(budParentScale[riseAxisKey]) || 1);
    }
  }

  return {
    root, config, initialYPos: 0, budRise, targetWorldRise,
    lidNode, budLeftNode, budRightNode,
    budLeftInitialX, budLeftInitialY, budLeftInitialZ,
    budRightInitialX, budRightInitialY, budRightInitialZ,
    lidOpenSign: config.lidOpenSign ?? -1,
    lidOpenAngle: config.lidOpenAngle ?? 1.22,
    lidAuthoredOpen: !!config.lidAuthoredOpen,
    lidClosedAngle,
    // How far to sink the case once open, so the taller open silhouette stays
    // centred instead of riding high. Measured from the rendered bounds per
    // model rather than derived: the model sits inside a rotated, scaled parent
    // whose tilt changes as it opens, so the needed offset is not something the
    // rig dimensions predict.
    openNudgeY: config.openNudgeY ?? 0,
  };
}

/**
 * Standard studio lighting rig shared by every device renderer.
 *
 * Pass the renderer to also install an environment map. Metals reflect their
 * surroundings rather than responding to lights, so a metallic material in a
 * scene with no environment renders almost black no matter how many lights are
 * added â€” the polished cases and chrome trim need this to read as metal at all.
 */
let sharedEnvTexture = null;

export function addStudioLights(scene, renderer) {
  scene.add(new THREE.AmbientLight(0xffffff, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(-5, -4, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 1.6);
  fill.position.set(-3, 4, 3);
  scene.add(fill);

  if (renderer) {
    if (!sharedEnvTexture) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const env = pmrem.fromScene(roomEnv, 0.04);
      sharedEnvTexture = env.texture;
      pmrem.dispose();
      roomEnv.dispose();
    }
    scene.environment = sharedEnvTexture;
  }
  return () => {};
}


