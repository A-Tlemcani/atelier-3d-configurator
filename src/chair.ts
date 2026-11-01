import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { createStage } from './lib/stage';
import { option, type Config } from './config';

export type View = 'three-quarter' | 'front' | 'side' | 'detail';
const views: Record<View, { pos: [number, number, number]; target: [number, number, number] }> = {
  'three-quarter': { pos: [2.1, 1.35, 2.4], target: [0, 0.45, 0] },
  front: { pos: [0, 0.9, 3], target: [0, 0.45, 0] },
  side: { pos: [3, 0.8, 0], target: [0, 0.45, 0] },
  detail: { pos: [0.9, 0.55, 0.95], target: [0.4, 0.3, 0.3] },
};

/** Grayscale procedural textures, tinted by material.color at runtime. */
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const woodGrain = () => canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * s, amp = 2 + Math.random() * 6, shade = 200 + Math.random() * 55;
    ctx.strokeStyle = `rgba(${shade * 0.8},${shade * 0.8},${shade * 0.8},${0.25 + Math.random() * 0.35})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    for (let x = 0; x <= s; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * amp);
    ctx.stroke();
  }
});
const weave = () => canvasTexture(256, (ctx, s) => {
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = 200 + ((x % 4 < 2) !== (y % 4 < 2) ? 30 : 0) + Math.random() * 25;
    const i = (y * s + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}, 6);

export function initChair(canvas: HTMLCanvasElement, initial: Config) {
  const stage = createStage(canvas, { fov: 35 });
  if (!stage) return null;
  const { scene, camera, renderer, reducedMotion } = stage;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();
  // Upgrade to a real photo-studio capture (Poly Haven, CC0) once it arrives; the synthetic room covers the wait.
  new HDRLoader().load('./studio_small_09_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
    scene.environmentIntensity = 0.9;
  });

  camera.position.set(...views['three-quarter'].pos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...views['three-quarter'].target);
  controls.enableDamping = true;
  controls.minDistance = 1; controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.8;

  const key = new THREE.DirectionalLight('#fff4e6', 2.4);
  key.position.set(2.5, 4, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 8;
  key.shadow.blurSamples = 16;
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 1, far: 10 });
  scene.add(key, new THREE.HemisphereLight('#ffffff', '#d8cfc2', 0.6));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grain = woodGrain();
  const cloth = weave();
  const frameMat = new THREE.MeshPhysicalMaterial({ map: grain, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const legMat = new THREE.MeshPhysicalMaterial({ roughness: 0.4 });
  const fabricMat = new THREE.MeshPhysicalMaterial({ map: cloth, roughness: 0.95, sheen: 1, sheenRoughness: 0.6 });

  const chair = new THREE.Group();
  scene.add(chair);
  const part = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z); mesh.rotation.x = rx;
    mesh.castShadow = mesh.receiveShadow = true;
    chair.add(mesh);
    return mesh;
  };

  // Frame: side panels, armrests, rear stretcher
  for (const sx of [-1, 1]) {
    part(new RoundedBoxGeometry(0.07, 0.36, 0.86, 4, 0.025), frameMat, sx * 0.44, 0.39, 0);
    part(new RoundedBoxGeometry(0.12, 0.045, 0.92, 4, 0.02), frameMat, sx * 0.44, 0.6, 0.01);
  }
  part(new RoundedBoxGeometry(0.84, 0.06, 0.06, 4, 0.02), frameMat, 0, 0.25, -0.4);
  // Cushions
  part(new RoundedBoxGeometry(0.82, 0.17, 0.82, 6, 0.07), fabricMat, 0, 0.36, 0.03);
  part(new RoundedBoxGeometry(0.82, 0.6, 0.17, 6, 0.07), fabricMat, 0, 0.7, -0.33, -0.22);
  const pillow = part(new RoundedBoxGeometry(0.56, 0.16, 0.13, 6, 0.06), fabricMat, 0, 1.04, -0.38, -0.22);
  // Tapered legs
  const legGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.21, 20);
  const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(legGeo, legMat, sx * 0.44, 0.105, sz * 0.36)));

  // --- Animated transitions between configurations
  const target = { frame: new THREE.Color(), fabric: new THREE.Color(), legs: new THREE.Color() };
  let pillowTarget = 0;
  function apply(c: Config, instant = false) {
    const frame = option('frame', c.frame), fabric = option('fabric', c.fabric), legOpt = option('legs', c.legs);
    target.frame.set(frame.color);
    target.fabric.set(fabric.color);
    target.legs.set(legOpt.id === 'wood' ? frame.color : legOpt.color);
    const leather = fabric.kind === 'leather';
    fabricMat.map = leather ? null : cloth;
    fabricMat.roughness = leather ? 0.5 : 0.95;
    fabricMat.sheen = leather ? 0 : 1;
    fabricMat.clearcoat = leather ? 0.15 : 0;
    fabricMat.needsUpdate = true;
    const metal = legOpt.kind === 'metal';
    legMat.map = metal ? null : grain;
    legMat.metalness = legOpt.id === 'brass' ? 1 : 0;
    legMat.roughness = legOpt.id === 'brass' ? 0.32 : legOpt.id === 'steel' ? 0.6 : 0.55;
    legMat.needsUpdate = true;
    pillowTarget = c.pillow === 'yes' ? 1 : 0;
    if (instant || reducedMotion) {
      frameMat.color.copy(target.frame); fabricMat.color.copy(target.fabric); legMat.color.copy(target.legs);
      pillow.scale.setScalar(pillowTarget || 0.0001);
    }
  }
  apply(initial, true);

  let tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; k: number } | null = null;
  controls.addEventListener('start', () => { tween = null; controls.autoRotate = false; });

  stage.onFrame((_t, dt) => {
    const k = 1 - Math.exp(-8 * dt);
    frameMat.color.lerp(target.frame, k);
    fabricMat.color.lerp(target.fabric, k);
    legMat.color.lerp(target.legs, k);
    const ps = THREE.MathUtils.lerp(pillow.scale.x, pillowTarget, k);
    pillow.scale.setScalar(Math.max(ps, 0.0001));
    pillow.visible = ps > 0.01;
    if (tween) {
      tween.k = Math.min(tween.k + dt / 0.9, 1);
      const e = 1 - (1 - tween.k) ** 3;
      camera.position.lerpVectors(tween.from, tween.to, e);
      controls.target.lerpVectors(tween.tFrom, tween.tTo, e);
      if (tween.k >= 1) tween = null;
    }
    controls.update(dt);
  });

  return {
    apply,
    setView(v: View) {
      controls.autoRotate = false;
      const { pos, target: tg } = views[v];
      const to = new THREE.Vector3(...pos), tTo = new THREE.Vector3(...tg);
      if (reducedMotion) { camera.position.copy(to); controls.target.copy(tTo); return; }
      tween = { from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo, k: 0 };
    },
    setAutoRotate(on: boolean) { controls.autoRotate = on; },
    legs,
  };
}
