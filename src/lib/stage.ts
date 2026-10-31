import * as THREE from 'three';

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  reducedMotion: boolean;
  /** Register a per-frame callback; receives elapsed seconds and delta. */
  onFrame(cb: (t: number, dt: number) => void): void;
  /** Render once (useful when the loop is paused, e.g. reduced motion). */
  renderOnce(): void;
  dispose(): void;
}

/**
 * Creates a renderer bound to a canvas that:
 *  - caps devicePixelRatio at 2,
 *  - resizes with its container (ResizeObserver),
 *  - stops rendering when off-screen or the tab is hidden,
 *  - falls back gracefully when WebGL is unavailable.
 */
export function createStage(canvas: HTMLCanvasElement, opts: { fov?: number; alpha?: boolean } = {}): Stage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.alpha ?? true, powerPreference: 'high-performance' });
  } catch {
    canvas.closest('[data-webgl]')?.classList.add('no-webgl');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, 0.1, 200);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const callbacks: Array<(t: number, dt: number) => void> = [];
  const timer = new THREE.Timer();
  let visible = true;
  let running = false;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement ?? canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);

  const frame = (now: number) => {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    for (const cb of callbacks) cb(t, dt);
    renderer.render(scene, camera);
  };
  const sync = () => {
    const shouldRun = visible && !document.hidden;
    if (shouldRun && !running) { timer.reset(); renderer.setAnimationLoop(frame); }
    if (!shouldRun && running) renderer.setAnimationLoop(null);
    running = shouldRun;
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  resize();

  return {
    renderer, scene, camera, reducedMotion,
    onFrame: (cb) => callbacks.push(cb),
    renderOnce: () => renderer.render(scene, camera),
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      renderer.dispose();
    },
  };
}

/** Smoothly tracks the pointer in normalised [-1, 1] coordinates. */
export function pointerTracker(target: HTMLElement | Window = window) {
  const p = { x: 0, y: 0, tx: 0, ty: 0 };
  target.addEventListener('pointermove', (e) => {
    const ev = e as PointerEvent;
    p.tx = (ev.clientX / window.innerWidth) * 2 - 1;
    p.ty = -((ev.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
  return {
    update(dt: number, ease = 4) { const k = 1 - Math.exp(-ease * dt); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; return p; },
    get value() { return p; },
  };
}
